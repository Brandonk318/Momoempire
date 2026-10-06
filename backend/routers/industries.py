"""Industry template registry. Public read; admin write."""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from db import get_db
from models import IndustryTemplate, IndustryTemplateIn, _now_iso
from security import require_platform_admin
from niche_profiles import get_niche_office_profile

router = APIRouter(prefix="/industries", tags=["industries"])


def _clean(doc):
    doc.pop("_id", None)
    return doc


@router.get("")
async def list_industries(active_only: bool = False):
    db = get_db()
    q = {"active": True} if active_only else {}
    items = await db.industries.find(q, {"_id": 0}).sort("name", 1).to_list(200)
    for item in items:
        profile = get_niche_office_profile(item.get("slug"))
        if profile:
            item["office_profile"] = profile
    return items


@router.get("/{slug}")
async def get_industry(slug: str):
    db = get_db()
    doc = await db.industries.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Industry not found")
    profile = get_niche_office_profile(doc.get("slug"))
    if profile:
        doc["office_profile"] = profile
    return doc


@router.post("", dependencies=[Depends(require_platform_admin)])
async def create_industry(data: IndustryTemplateIn):
    db = get_db()
    if await db.industries.find_one({"slug": data.slug}):
        raise HTTPException(400, "Industry slug already exists")
    tpl = IndustryTemplate(**data.model_dump())
    await db.industries.insert_one(tpl.model_dump())
    return tpl.model_dump()


@router.put("/{slug}", dependencies=[Depends(require_platform_admin)])
async def update_industry(slug: str, data: IndustryTemplateIn):
    db = get_db()
    existing = await db.industries.find_one({"slug": slug})
    if not existing:
        raise HTTPException(404, "Industry not found")
    update = data.model_dump()
    update["updated_at"] = _now_iso()
    await db.industries.update_one({"slug": slug}, {"$set": update})
    doc = await db.industries.find_one({"slug": slug}, {"_id": 0})
    return doc


@router.delete("/{slug}", dependencies=[Depends(require_platform_admin)])
async def delete_industry(slug: str):
    db = get_db()
    res = await db.industries.delete_one({"slug": slug})
    if res.deleted_count == 0:
        raise HTTPException(404, "Industry not found")
    return {"status": "ok"}
