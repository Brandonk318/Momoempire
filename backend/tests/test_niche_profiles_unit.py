"""Fast unit coverage for launch niche profiles."""

from niche_profiles import NICHE_OFFICE_PROFILES, get_niche_office_profile


EXPECTED = {
    "hvac": "The HVAC Office",
    "plumbing": "The Plumbing Office",
    "pest-control": "The Pest Control Office",
}


def test_launch_niches_exist_and_are_distinct():
    assert set(EXPECTED).issubset(NICHE_OFFICE_PROFILES)
    profiles = [NICHE_OFFICE_PROFILES[slug] for slug in EXPECTED]
    assert len({p["office_name"] for p in profiles}) == 3
    assert len({p["tagline"] for p in profiles}) == 3
    assert len({p["hero"] for p in profiles}) == 3
    assert len({p["cta"] for p in profiles}) == 3


def test_launch_niches_have_complete_customer_facing_profiles():
    for slug, office_name in EXPECTED.items():
        profile = get_niche_office_profile(slug)
        assert profile["office_name"] == office_name
        assert profile["tagline"]
        assert profile["hero"]
        assert profile["cta"]
        assert profile["accent"].startswith("#")
        assert len(profile["value_props"]) >= 4
        assert len(set(profile["value_props"])) == len(profile["value_props"])


def test_profile_lookup_is_case_insensitive_and_safe_for_unknown_values():
    assert get_niche_office_profile("HVAC")["office_name"] == "The HVAC Office"
    assert get_niche_office_profile("PlUmBiNg")["office_name"] == "The Plumbing Office"
    assert get_niche_office_profile("unknown") == {}
    assert get_niche_office_profile("") == {}
    assert get_niche_office_profile(None) == {}
