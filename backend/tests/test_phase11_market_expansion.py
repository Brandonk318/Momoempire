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
        assert (me.json().get("address") or {}).get("country") == code

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
        before = owner_client.get(f"{API}/tenants/me", timeout=15)
        assert before.status_code == 200, before.text
        before_tenant = before.json()
        before_country = before_tenant.get("country")
        before_address_country = (before_tenant.get("address") or {}).get("country")

        r = owner_client.put(
            f"{API}/tenants/me/country",
            json={"country": "ZZ"},
            timeout=15,
        )
        assert r.status_code == 400

        after = owner_client.get(f"{API}/tenants/me", timeout=15)
        assert after.status_code == 200, after.text
        after_tenant = after.json()
        assert after_tenant.get("country") == before_country
        assert (after_tenant.get("address") or {}).get("country") == before_address_country

    def test_normalized_country_persists_to_both_country_fields(self, owner_client):
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

        me = owner_client.get(f"{API}/tenants/me", timeout=15)
        assert me.status_code == 200, me.text
        assert me.json().get("country") == code
        assert (me.json().get("address") or {}).get("country") == code

    def test_unauthenticated_market_switch_is_rejected(self):
        r = requests.put(
            f"{API}/tenants/me/country",
            json={"country": "US"},
            timeout=15,
        )
        assert r.status_code in (401, 403)


class TestMarketAwareOnboarding:
    def test_onboarding_persists_selected_enabled_market(self):
        countries = requests.get(f"{API}/countries?enabled_only=true", timeout=15).json()
        if not countries:
            pytest.skip("No enabled countries configured")
        target = next(
            (c for c in countries if (c.get("code") or "").upper() in {"CA", "AU", "NZ"}),
            countries[0],
        )
        code = target["code"].upper()

        s = _client()
        email = f"TEST_onboard_market_{uuid.uuid4().hex[:8]}@example.com"
        reg = s.post(f"{API}/auth/register", json={
            "email": email,
            "password": "MarketPass123!",
            "name": "Onboard Market Tester",
            "business_name": f"TEST Market Onboard {uuid.uuid4().hex[:6]}",
        }, timeout=20)
        assert reg.status_code == 200, reg.text

        onboard = s.post(f"{API}/tenants/onboard", json={
            "name": "Onboard Market Tester",
            "industry_slug": "hvac",
            "contact_email": email,
            "address": {"country": code},
        }, timeout=20)
        assert onboard.status_code == 200, onboard.text
        assert onboard.json()["tenant"]["country"] == code
        assert onboard.json()["tenant"]["address"]["country"] == code

    def test_onboarding_rejects_unknown_market(self):
        s = _client()
        email = f"TEST_onboard_bad_market_{uuid.uuid4().hex[:8]}@example.com"
        reg = s.post(f"{API}/auth/register", json={
            "email": email,
            "password": "MarketPass123!",
            "name": "Bad Market Tester",
            "business_name": f"TEST Bad Market {uuid.uuid4().hex[:6]}",
        }, timeout=20)
        assert reg.status_code == 200, reg.text

        onboard = s.post(f"{API}/tenants/onboard", json={
            "name": "Bad Market Tester",
            "industry_slug": "plumbing",
            "contact_email": email,
            "address": {"country": "ZZ"},
        }, timeout=20)
        assert onboard.status_code == 400


class TestLaunchNicheProfiles:
    @pytest.mark.parametrize("slug,office_name", [
        ("hvac", "The HVAC Office"),
        ("plumbing", "The Plumbing Office"),
        ("pest-control", "The Pest Control Office"),
    ])
    def test_first_three_niches_have_launch_profiles(self, slug, office_name):
        r = requests.get(f"{API}/industries/{slug}", timeout=15)
        assert r.status_code == 200, r.text
        profile = r.json().get("office_profile") or {}
        assert profile.get("office_name") == office_name
        assert profile.get("hero")
        assert profile.get("cta")
        assert len(profile.get("value_props") or []) >= 4


    def test_industry_list_exposes_profiles_for_all_launch_niches(self):
        r = requests.get(f"{API}/industries?active_only=true", timeout=15)
        assert r.status_code == 200, r.text
        rows = {row.get("slug"): row for row in r.json()}
        expected = {
            "hvac": "The HVAC Office",
            "plumbing": "The Plumbing Office",
            "pest-control": "The Pest Control Office",
        }
        for slug, office_name in expected.items():
            assert slug in rows, f"{slug} missing from active industries"
            profile = rows[slug].get("office_profile") or {}
            assert profile.get("office_name") == office_name
            assert len(profile.get("value_props") or []) >= 4

    def test_launch_profiles_have_distinct_customer_facing_copy(self):
        profiles = []
        for slug in ("hvac", "plumbing", "pest-control"):
            r = requests.get(f"{API}/industries/{slug}", timeout=15)
            assert r.status_code == 200, r.text
            profiles.append(r.json()["office_profile"])
        assert len({p["office_name"] for p in profiles}) == 3
        assert len({p["tagline"] for p in profiles}) == 3
        assert len({p["cta"] for p in profiles}) == 3
        assert len({p["hero"] for p in profiles}) == 3
