"""Launch niche presentation profiles for the first Office verticals."""

NICHE_OFFICE_PROFILES = {
    "hvac": {
        "office_name": "The HVAC Office",
        "tagline": "Never miss another heating or cooling call.",
        "hero": "Your 24/7 AI front office for HVAC.",
        "value_props": [
            "Answer emergency and after-hours calls",
            "Qualify repair, maintenance, and replacement leads",
            "Book diagnostics and tune-ups automatically",
            "Follow up on estimates and seasonal maintenance",
        ],
        "cta": "Book HVAC service",
        "accent": "#0EA5E9",
    },
    "plumbing": {
        "office_name": "The Plumbing Office",
        "tagline": "Turn urgent plumbing calls into booked jobs.",
        "hero": "Your 24/7 AI front office for plumbing.",
        "value_props": [
            "Triage leaks, clogs, and no-water emergencies",
            "Capture job details before dispatch",
            "Book service windows automatically",
            "Follow up on estimates and replacement opportunities",
        ],
        "cta": "Book plumbing service",
        "accent": "#2563EB",
    },
    "pest-control": {
        "office_name": "The Pest Control Office",
        "tagline": "Keep leads moving while technicians are in the field.",
        "hero": "Your 24/7 AI front office for pest control.",
        "value_props": [
            "Identify pest type and urgency before dispatch",
            "Book inspections and treatments automatically",
            "Run recurring-service reminders",
            "Follow up after treatments and renew prevention plans",
        ],
        "cta": "Schedule pest service",
        "accent": "#16A34A",
    },
}


def get_niche_office_profile(slug: str) -> dict:
    return NICHE_OFFICE_PROFILES.get((slug or "").lower(), {})
