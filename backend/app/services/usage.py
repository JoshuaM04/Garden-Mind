import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from functools import lru_cache

import httpx
import jwt
from fastapi import HTTPException, Request, status

from .rate_limit import (
    RateLimitBackendError,
    RateLimitConfigError,
    env_int,
    fail_open,
    format_wait,
    get_client_ip,
    get_redis_credentials,
    hash_ip,
    rate_limiting_enabled,
    run_redis_command,
)

logger = logging.getLogger(__name__)

KEY_PREFIX = "garden-mind:tokens"
DEFAULT_ANONYMOUS_BUDGET = 30_000
DEFAULT_USER_BUDGET = 150_000
RESET_SLACK_SECONDS = 3600
# Only asymmetric algorithms: accepting HS256 would let a public key act as a secret.
JWT_ALGORITHMS = ["ES256", "RS256"]

# Add used tokens to today's counter, expiring it shortly after the budget resets.
RECORD_SCRIPT = """
local used = redis.call('INCRBY', KEYS[1], ARGV[1])
if redis.call('TTL', KEYS[1]) < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[2])
end
return used
"""

USAGE_ERRORS = (
    RateLimitConfigError,
    RateLimitBackendError,
    httpx.HTTPError,
    ValueError,
)


@dataclass
class TokenUsage:
    """Tokens consumed by every model call made for one request."""

    total: int = 0

    def add_response(self, response, messages: list) -> None:
        reported = getattr(getattr(response, "usage", None), "total_tokens", None)
        if isinstance(reported, int) and reported > 0:
            self.total += reported
            return

        # The provider sent no usage block: assume the worst case for this call.
        self.total += len(json.dumps(messages, default=str)) // 3 + 500


@dataclass(frozen=True)
class Allowance:
    key: str
    budget: int
    reset_seconds: int


def jwks_url() -> str | None:
    explicit = os.environ.get("SUPABASE_JWKS_URL", "").strip()
    if explicit:
        return explicit

    base = (
        os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL") or ""
    ).strip().rstrip("/")
    return f"{base}/auth/v1/.well-known/jwks.json" if base else None


@lru_cache(maxsize=2)
def get_jwk_client(url: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(url, cache_keys=True, lifespan=3600, timeout=3)


def verified_user_id(request: Request) -> str | None:
    """Return the Supabase user id for a valid bearer token, otherwise None."""
    scheme, _, token = request.headers.get("authorization", "").partition(" ")
    token = token.strip()
    url = jwks_url()
    if scheme.lower() != "bearer" or not token or not url:
        return None

    try:
        signing_key = get_jwk_client(url).get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=JWT_ALGORITHMS,
            audience="authenticated",
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError as error:
        # An invalid or expired token just falls back to the anonymous budget.
        logger.info("Ignoring unverifiable access token: %s", error)
        return None

    if claims.get("is_anonymous"):
        return None
    return str(claims["sub"])


def seconds_until_reset(now: datetime) -> int:
    midnight = (now + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return int((midnight - now).total_seconds()) + 1


def check_token_budget(request: Request) -> Allowance | None:
    """FastAPI dependency: block clients that spent today's token budget."""
    if not rate_limiting_enabled():
        return None

    try:
        user_id = verified_user_id(request)
        if user_id:
            kind, subject = "user", user_id
            budget = env_int("TOKEN_BUDGET_USER_DAILY", DEFAULT_USER_BUDGET)
        else:
            kind, subject = "anonymous", get_client_ip(request)
            budget = env_int("TOKEN_BUDGET_ANONYMOUS_DAILY", DEFAULT_ANONYMOUS_BUDGET)

        now = datetime.now(timezone.utc)
        key = f"{KEY_PREFIX}:{kind}:{hash_ip(subject)}:{now:%Y%m%d}"
        url, token = get_redis_credentials()
        used = int(run_redis_command(url, token, ["GET", key]) or 0)
    except USAGE_ERRORS as error:
        logger.error("Token budget unavailable: %s", error)
        if fail_open():
            return None
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Garden Mind is temporarily unavailable. Please try again soon.",
        ) from error

    reset = seconds_until_reset(now)
    if used >= budget:
        detail = (
            "You've used today's Garden Mind allowance. "
            f"It resets in {format_wait(reset)}."
        )
        if kind == "anonymous":
            detail += " Sign in for a larger daily allowance."
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
            headers={"Retry-After": str(reset)},
        )

    return Allowance(key=key, budget=budget, reset_seconds=reset)


def record_usage(allowance: Allowance | None, tokens: int) -> None:
    """Add a finished request's tokens to the counter; never fails the request."""
    if allowance is None or tokens <= 0:
        return

    try:
        url, token = get_redis_credentials()
        run_redis_command(
            url,
            token,
            [
                "EVAL",
                RECORD_SCRIPT,
                "1",
                allowance.key,
                str(tokens),
                str(allowance.reset_seconds + RESET_SLACK_SECONDS),
            ],
        )
    except USAGE_ERRORS as error:
        logger.error("Could not record %s tokens: %s", tokens, error)
