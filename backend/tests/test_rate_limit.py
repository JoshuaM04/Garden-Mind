import json

import httpx
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from backend.app.services import rate_limit

SALT = "test-salt-value-1234567890"
UPSTASH_URL = "https://fake-db.upstash.io"
UPSTASH_TOKEN = "fake-token"


class FakeUpstash:
    """Minimal in-memory stand-in for the Upstash REST EVAL endpoint."""

    def __init__(self):
        self.counts: dict[str, int] = {}
        self.ttls: dict[str, int] = {}
        self.requests: list[httpx.Request] = []
        self.fail_with: int | None = None

    def handler(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        if self.fail_with:
            return httpx.Response(self.fail_with, json={"error": "boom"})
        if request.headers.get("authorization") != f"Bearer {UPSTASH_TOKEN}":
            return httpx.Response(401, json={"error": "Unauthorized"})

        command, _script, _numkeys, key, window = json.loads(request.content)
        assert command == "EVAL"
        self.counts[key] = self.counts.get(key, 0) + 1
        self.ttls.setdefault(key, int(window))
        return httpx.Response(200, json={"result": [self.counts[key], self.ttls[key]]})

    @property
    def keys(self) -> list[str]:
        return list(self.counts)


@pytest.fixture
def upstash(monkeypatch):
    fake = FakeUpstash()
    client = httpx.Client(transport=httpx.MockTransport(fake.handler))
    monkeypatch.setattr(rate_limit, "get_http_client", lambda: client)
    monkeypatch.setenv("UPSTASH_REDIS_REST_URL", UPSTASH_URL)
    monkeypatch.setenv("UPSTASH_REDIS_REST_TOKEN", UPSTASH_TOKEN)
    monkeypatch.setenv("RATE_LIMIT_IP_SALT", SALT)
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "true")
    monkeypatch.setenv("RATE_LIMIT_TEST_LIMIT", "2")
    monkeypatch.delenv("RATE_LIMIT_FAIL_OPEN", raising=False)
    monkeypatch.delenv("RATE_LIMIT_TRUST_PROXY_HEADERS", raising=False)
    monkeypatch.delenv("VERCEL", raising=False)
    return fake


@pytest.fixture
def app_client(upstash):
    app = FastAPI()
    limiter = rate_limit.rate_limit("test", default_limit=5, default_window_seconds=60)

    @app.post("/ping", dependencies=[Depends(limiter)])
    def ping():
        return {"ok": True}

    return TestClient(app)


def test_blocks_after_limit_with_retry_headers(app_client):
    assert app_client.post("/ping").status_code == 200
    assert app_client.post("/ping").status_code == 200

    blocked = app_client.post("/ping")

    assert blocked.status_code == 429
    assert 1 <= int(blocked.headers["Retry-After"]) <= 60
    assert blocked.headers["X-RateLimit-Limit"] == "2"
    assert "try again" in blocked.json()["detail"]


def test_only_hashed_ip_is_stored(app_client, upstash):
    app_client.post("/ping")

    keys = upstash.keys

    assert len(keys) == 1
    assert "testclient" not in keys[0]
    assert keys[0].startswith("garden-mind:rl:test:")
    assert upstash.ttls[keys[0]] == 60
    assert upstash.requests[0].headers["authorization"] == f"Bearer {UPSTASH_TOKEN}"


def test_hash_depends_on_salt(monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_IP_SALT", SALT)
    first = rate_limit.hash_ip("203.0.113.9")
    monkeypatch.setenv("RATE_LIMIT_IP_SALT", "another-salt-value-123456")

    assert first != rate_limit.hash_ip("203.0.113.9")


def test_proxy_headers_ignored_unless_trusted(app_client, upstash):
    for index in range(3):
        response = app_client.post("/ping", headers={"x-forwarded-for": f"198.51.100.{index}"})

    assert response.status_code == 429
    assert len(upstash.keys) == 1


def test_proxy_headers_used_when_trusted(app_client, upstash, monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_TRUST_PROXY_HEADERS", "true")

    for index in range(3):
        response = app_client.post(
            "/ping", headers={"x-forwarded-for": f"198.51.100.{index}, 10.0.0.1"}
        )

    assert response.status_code == 200
    assert len(upstash.keys) == 3


def test_ipv6_clients_share_a_64_bucket():
    assert rate_limit.normalize_ip("2001:db8::1") == rate_limit.normalize_ip("2001:db8::ffff")
    assert rate_limit.normalize_ip("::ffff:192.0.2.1") == "192.0.2.1"
    assert rate_limit.normalize_ip("not-an-ip") is None


def test_missing_config_fails_closed(app_client, monkeypatch):
    monkeypatch.delenv("UPSTASH_REDIS_REST_TOKEN")

    assert app_client.post("/ping").status_code == 503


def test_short_salt_fails_closed(app_client, monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_IP_SALT", "short")

    assert app_client.post("/ping").status_code == 503


def test_upstash_outage_fails_closed_or_open(app_client, upstash, monkeypatch):
    upstash.fail_with = 500

    assert app_client.post("/ping").status_code == 503

    monkeypatch.setenv("RATE_LIMIT_FAIL_OPEN", "true")
    assert app_client.post("/ping").status_code == 200


def test_bad_token_fails_closed(app_client, monkeypatch):
    monkeypatch.setenv("UPSTASH_REDIS_REST_TOKEN", "wrong")

    assert app_client.post("/ping").status_code == 503


def test_can_be_disabled(app_client, monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "false")
    monkeypatch.delenv("UPSTASH_REDIS_REST_TOKEN")

    assert app_client.post("/ping").status_code == 200
