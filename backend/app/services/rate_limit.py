import hashlib
import hmac
import ipaddress
import logging
import os
from dataclasses import dataclass
from functools import lru_cache

import httpx
from fastapi import HTTPException, Request, status

logger = logging.getLogger(__name__)

# Atomically count a request and start the window on the first hit.
# Returns {count, seconds until the window resets}.
FIXED_WINDOW_SCRIPT = """
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
if ttl < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {count, ttl}
"""

KEY_PREFIX = "garden-mind:rl"
MIN_SALT_LENGTH = 16


class RateLimitConfigError(RuntimeError):
    pass


class RateLimitBackendError(RuntimeError):
    pass


@dataclass(frozen=True)
class RateLimitRule:
    scope: str
    limit: int
    window_seconds: int


def env_flag(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None or not value.strip():
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int) -> int:
    value = os.environ.get(name)
    if value is None or not value.strip():
        return default
    try:
        parsed = int(value)
    except ValueError as error:
        raise RateLimitConfigError(f"{name} must be an integer.") from error
    if parsed < 1:
        raise RateLimitConfigError(f"{name} must be at least 1.")
    return parsed


def rate_limiting_enabled() -> bool:
    return env_flag("RATE_LIMIT_ENABLED", True)


def fail_open() -> bool:
    return env_flag("RATE_LIMIT_FAIL_OPEN", False)


@lru_cache(maxsize=1)
def get_http_client() -> httpx.Client:
    return httpx.Client(timeout=3.0)


def run_redis_command(url: str, token: str, command: list) -> object:
    """Run one command through the Upstash Redis REST API."""
    response = get_http_client().post(
        url,
        json=command,
        headers={"Authorization": f"Bearer {token}"},
    )
    response.raise_for_status()
    data = response.json()
    if "error" in data:
        raise RateLimitBackendError(f"Upstash returned an error: {data['error']}")
    return data["result"]


def get_salt() -> bytes:
    salt = os.environ.get("RATE_LIMIT_IP_SALT", "")
    if len(salt) < MIN_SALT_LENGTH:
        raise RateLimitConfigError(
            f"RATE_LIMIT_IP_SALT must be set to at least {MIN_SALT_LENGTH} characters."
        )
    return salt.encode("utf-8")


def trust_proxy_headers() -> bool:
    # Vercel overwrites forwarded headers, so they are safe to trust there.
    return env_flag("RATE_LIMIT_TRUST_PROXY_HEADERS", bool(os.environ.get("VERCEL")))


def normalize_ip(value: str | None) -> str | None:
    if not value:
        return None
    try:
        address = ipaddress.ip_address(value.strip())
    except ValueError:
        return None
    if isinstance(address, ipaddress.IPv6Address):
        if address.ipv4_mapped:
            return str(address.ipv4_mapped)
        # Collapse to the /64 so one client cannot rotate through its IPv6 range.
        return str(ipaddress.ip_network(f"{address}/64", strict=False).network_address)
    return str(address)


def get_client_ip(request: Request) -> str:
    if trust_proxy_headers():
        forwarded_for = request.headers.get("x-forwarded-for", "")
        candidates = (
            request.headers.get("x-real-ip"),
            forwarded_for.split(",")[0],
        )
        for candidate in candidates:
            ip = normalize_ip(candidate)
            if ip:
                return ip

    host = request.client.host if request.client else None
    return normalize_ip(host) or "unknown"


def hash_ip(ip: str) -> str:
    # Keyed hash: raw IPs never reach Redis and hashes cannot be reversed
    # by brute-forcing the small IPv4 space without the secret salt.
    return hmac.new(get_salt(), ip.encode("utf-8"), hashlib.sha256).hexdigest()


def consume(rule: RateLimitRule, ip: str) -> tuple[int, int]:
    url = os.environ.get("UPSTASH_REDIS_REST_URL", "").strip().rstrip("/")
    token = os.environ.get("UPSTASH_REDIS_REST_TOKEN", "").strip()
    if not url or not token:
        raise RateLimitConfigError(
            "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set."
        )

    key = f"{KEY_PREFIX}:{rule.scope}:{hash_ip(ip)}"
    count, ttl = run_redis_command(
        url,
        token,
        ["EVAL", FIXED_WINDOW_SCRIPT, "1", key, str(rule.window_seconds)],
    )
    return int(count), max(int(ttl), 1)


def rate_limit(scope: str, default_limit: int, default_window_seconds: int):
    """Build a FastAPI dependency limiting requests per hashed client IP."""
    upper = scope.upper()

    def dependency(request: Request) -> None:
        if not rate_limiting_enabled():
            return

        try:
            rule = RateLimitRule(
                scope=scope,
                limit=env_int(f"RATE_LIMIT_{upper}_LIMIT", default_limit),
                window_seconds=env_int(
                    f"RATE_LIMIT_{upper}_WINDOW_SECONDS", default_window_seconds
                ),
            )
            count, retry_after = consume(rule, get_client_ip(request))
        except (RateLimitConfigError, RateLimitBackendError, httpx.HTTPError, ValueError) as error:
            logger.error("Rate limiter unavailable: %s", error)
            if fail_open():
                return
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Garden Mind is temporarily unavailable. Please try again soon.",
            ) from error

        if count > rule.limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    "You've reached the request limit for now. "
                    f"Please try again in {format_wait(retry_after)}."
                ),
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(rule.limit),
                    "X-RateLimit-Remaining": "0",
                },
            )

    return dependency


def format_wait(seconds: int) -> str:
    if seconds < 60:
        return "less than a minute"
    minutes = -(-seconds // 60)
    if minutes < 60:
        return f"{minutes} minute{'s' if minutes != 1 else ''}"
    hours = -(-minutes // 60)
    return f"{hours} hour{'s' if hours != 1 else ''}"


chat_rate_limit = rate_limit("chat", default_limit=20, default_window_seconds=3600)
documents_rate_limit = rate_limit(
    "documents", default_limit=10, default_window_seconds=3600
)
