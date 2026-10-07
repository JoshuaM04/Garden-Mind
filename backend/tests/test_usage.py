import importlib
import json
from types import SimpleNamespace

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app.services import rate_limit, usage

SALT = "test-salt-value-1234567890"
UPSTASH_TOKEN = "fake-token"


class FakeUpstash:
    """In-memory Upstash REST stand-in for rate-limit and token-budget commands."""

    def __init__(self):
        self.values: dict[str, int] = {}
        self.ttls: dict[str, int] = {}

    def handler(self, request: httpx.Request) -> httpx.Response:
        command = json.loads(request.content)
        if command[0] == "GET":
            value = self.values.get(command[1])
            return httpx.Response(200, json={"result": None if value is None else str(value)})

        script, key = command[1], command[3]
        if "INCRBY" in script:
            self.values[key] = self.values.get(key, 0) + int(command[4])
            self.ttls.setdefault(key, int(command[5]))
            return httpx.Response(200, json={"result": self.values[key]})

        self.values[key] = self.values.get(key, 0) + 1
        return httpx.Response(200, json={"result": [self.values[key], 60]})

    def token_keys(self) -> dict[str, int]:
        return {k: v for k, v in self.values.items() if ":tokens:" in k}


@pytest.fixture
def upstash(monkeypatch):
    fake = FakeUpstash()
    client = httpx.Client(transport=httpx.MockTransport(fake.handler))
    monkeypatch.setattr(rate_limit, "get_http_client", lambda: client)
    monkeypatch.setenv("UPSTASH_REDIS_REST_URL", "https://fake-db.upstash.io")
    monkeypatch.setenv("UPSTASH_REDIS_REST_TOKEN", UPSTASH_TOKEN)
    monkeypatch.setenv("RATE_LIMIT_IP_SALT", SALT)
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "true")
    monkeypatch.setenv("RATE_LIMIT_CHAT_LIMIT", "1000")
    monkeypatch.setenv("TOKEN_BUDGET_ANONYMOUS_DAILY", "1000")
    monkeypatch.setenv("TOKEN_BUDGET_USER_DAILY", "5000")
    monkeypatch.delenv("RATE_LIMIT_FAIL_OPEN", raising=False)
    monkeypatch.delenv("VERCEL", raising=False)
    return fake


@pytest.fixture
def signing_key():
    return ec.generate_private_key(ec.SECP256R1())


@pytest.fixture
def app_client(upstash, signing_key, monkeypatch):
    monkeypatch.setenv("HF_TOKEN", "test-token")
    chat = importlib.import_module("backend.app.services.chat")

    class FakeCompletions:
        tokens = 400

        def create(self, **_kwargs):
            message = SimpleNamespace(content="Water deeply.", tool_calls=None)
            return SimpleNamespace(
                choices=[SimpleNamespace(message=message)],
                usage=SimpleNamespace(total_tokens=self.tokens),
            )

    fake_client = SimpleNamespace(chat=SimpleNamespace(completions=FakeCompletions()))
    monkeypatch.setattr(chat, "client", fake_client)
    monkeypatch.setattr(chat, "search_enabled", lambda: False)

    public_key = signing_key.public_key()
    monkeypatch.setattr(
        usage,
        "get_jwk_client",
        lambda _url: SimpleNamespace(
            get_signing_key_from_jwt=lambda _token: SimpleNamespace(key=public_key)
        ),
    )
    monkeypatch.setenv("SUPABASE_JWKS_URL", "https://example.supabase.co/jwks")

    app = FastAPI()
    app.include_router(chat.router, prefix="/api")
    return TestClient(app)


def make_token(signing_key, **overrides):
    claims = {"sub": "user-123", "aud": "authenticated", "exp": 4_000_000_000}
    claims.update(overrides)
    return jwt.encode(claims, signing_key, algorithm="ES256")


def ask(client, token=None):
    headers = {"authorization": f"Bearer {token}"} if token else {}
    return client.post(
        "/api/chat", json={"message": "How do I water basil?", "history": []}, headers=headers
    )


def test_tokens_are_recorded_for_anonymous_clients(app_client, upstash):
    assert ask(app_client).status_code == 200

    keys = upstash.token_keys()
    assert len(keys) == 1
    key = next(iter(keys))
    assert ":anonymous:" in key
    assert "testclient" not in key
    assert keys[key] == 400


def test_anonymous_budget_blocks_with_sign_in_hint(app_client):
    assert ask(app_client).status_code == 200
    assert ask(app_client).status_code == 200
    # 800 used is still under the 1000 budget, so this one runs and overshoots.
    assert ask(app_client).status_code == 200
    blocked = ask(app_client)

    assert blocked.status_code == 429
    assert "allowance" in blocked.json()["detail"]
    assert "Sign in" in blocked.json()["detail"]
    assert int(blocked.headers["Retry-After"]) > 0


def test_signed_in_users_get_their_own_larger_budget(app_client, upstash, signing_key):
    token = make_token(signing_key)
    for _ in range(4):
        assert ask(app_client, token).status_code == 200

    key = next(iter(upstash.token_keys()))
    assert ":user:" in key
    assert "user-123" not in key
    # The anonymous budget (1000) is exhausted but the user's 5000 is not.
    assert upstash.token_keys()[key] == 1600
    assert ask(app_client, token).status_code == 200


def test_invalid_token_falls_back_to_anonymous(app_client, upstash):
    assert ask(app_client, "not-a-token").status_code == 200

    assert ":anonymous:" in next(iter(upstash.token_keys()))


def test_expired_token_is_anonymous(app_client, upstash, signing_key):
    assert ask(app_client, make_token(signing_key, exp=1)).status_code == 200

    assert ":anonymous:" in next(iter(upstash.token_keys()))


def test_token_for_wrong_audience_is_anonymous(app_client, upstash, signing_key):
    assert ask(app_client, make_token(signing_key, aud="other")).status_code == 200

    assert ":anonymous:" in next(iter(upstash.token_keys()))


def test_token_signed_by_another_key_is_anonymous(app_client, upstash):
    stranger = ec.generate_private_key(ec.SECP256R1())

    assert ask(app_client, make_token(stranger)).status_code == 200
    assert ":anonymous:" in next(iter(upstash.token_keys()))


def test_oversized_message_is_rejected(app_client):
    response = app_client.post(
        "/api/chat", json={"message": "x" * 2001, "history": []}
    )

    assert response.status_code == 422


def test_missing_usage_block_is_estimated(app_client, upstash, monkeypatch):
    chat = importlib.import_module("backend.app.services.chat")
    message = SimpleNamespace(content="ok", tool_calls=None)
    monkeypatch.setattr(
        chat.client.chat.completions,
        "create",
        lambda **_kwargs: SimpleNamespace(choices=[SimpleNamespace(message=message)]),
    )

    assert ask(app_client).status_code == 200
    assert next(iter(upstash.token_keys().values())) >= 500


def test_budget_can_be_disabled(app_client, upstash, monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "false")

    assert ask(app_client).status_code == 200
    assert upstash.token_keys() == {}


def test_redis_outage_fails_closed(app_client, monkeypatch):
    monkeypatch.delenv("UPSTASH_REDIS_REST_TOKEN")
    monkeypatch.setenv("RATE_LIMIT_CHAT_LIMIT", "1000")

    assert ask(app_client).status_code == 503
