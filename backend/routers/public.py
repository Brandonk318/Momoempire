"""Public (unauthenticated) tenant profile pages + health."""
from fastapi import APIRouter, HTTPException
from db import get_db
from niche_profiles import get_niche_office_profile

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/business/{slug}")
async def public_business(slug: str):
    db = get_db()
    t = await db.tenants.find_one(
        {"slug": slug, "status": "active"},
        {"_id": 0, "password_hash": 0},
    )
    if not t:
        raise HTTPException(404, "Business not found")
    # Only return public-safe fields
    return {
        "slug": t.get("slug"),
        "name": t.get("name"),
        "description": t.get("description"),
        "industry_slug": t.get("industry_slug"),
        "office_profile": get_niche_office_profile(t.get("industry_slug")),
        "address": {k: v for k, v in (t.get("address") or {}).items() if k in {"city", "state", "country"}},
        "service_areas": t.get("service_areas", []),
        "hours": t.get("hours", {}),
        "website": t.get("website"),
        "social_links": t.get("social_links", {}),
        "contact_phone": t.get("contact_phone"),
        "contact_email": t.get("contact_email"),
        "faqs": t.get("faqs", []),
        "branding": t.get("branding", {}),
        "ai_employee": {
            "name": (t.get("ai_employee") or {}).get("name", "AI Receptionist"),
            "greeting": (t.get("ai_employee") or {}).get("greeting", ""),
        },
    }
