"""Phase 11 — Market expansion and tenant country switching."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://office-engine.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def owner_client():
    s = _client()
    email = f"TEST_market_{uuid.uuid4().hex[:8]}@example.com"
    password = "MarketPass123!"
    r = s.post(f"{API}/auth/register", json={
        "email": email,
        "password": password,
        "name": "Market Tester",
        "business_name": f"TEST Market Biz {uuid.uuid4().hex[:6]}",
    }, timeout=20)
    assert r.status_code == 200, r.text
    return s


class TestEnabledMarketRegistry:
    def test_enabled_only_returns_only_enabled_markets(self):
        r = requests.get(f"{API}/countries?enabled_only=true", timeout=15)
        assert r.status_code == 200, r.text
        rows = r.json()
        assert isinstance(rows, list)
        assert all(row.get("enabled") is True for row in rows)

    def test_enabled_market_codes_are_unique(self):
        rows = requests.get(f"{API}/countries?enabled_only=true", timeout=15).json()
        codes = [(row.get("code") or "").upper() for row in rows]
        assert len(codes) == len(set(codes))


class TestTenantMarketSwitching:
    def test_switch_to_an_enabled_market_and_persist(self, owner_client):
        countries = requests.get(f"{API}/countries?enabled_only=true", timeout=15).json()
        if not countries:
            pytest.skip("No enabled countries configured")
        target = next(
            (c for c in countries if (c.get("code") or "").upper() != "US"),
            countries[0],
        )
        code = target["code"].upper()

        r = owner_client.put(f"{API}/tenants/me/country", json={"country": code}, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["country"] == code

        me = owner_client.get(f"{API}/tenants/me", timeout=15)
        assert me.status_code == 200, me.text
        assert me.json()["country"] == code

    def test_country_code_is_normalized(self, owner_client):
        countries = requests.get(f"{API}/countries?enabled_only=true", timeout=15).json()
        if not countries:
            pytest.skip("No enabled countries configured")
        code = countries[0]["code"].upper()

        r = owner_client.put(
            f"{API}/tenants/me/country",
            json={"country": f"  {code.lower()}  "},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json()["country"] == code

    def test_unknown_or_disabled_market_is_rejected(self, owner_client):
        r = owner_client.put(
            f"{API}/tenants/me/country",
            json={"country": "ZZ"},
            timeout=15,
        )
        assert r.status_code == 400

    def test_unauthenticated_market_switch_is_rejected(self):
        r = requests.put(
            f"{API}/tenants/me/country",
            json={"country": "US"},
            timeout=15,
        )
        assert r.status_code in (401, 403)
