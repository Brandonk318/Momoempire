"""Stripe country selector registry — DB-backed; admin-overridable."""
from fastapi import APIRouter, HTTPException, Depends
from db import get_db
from models import Country, CountryIn, _now_iso
from security import require_platform_admin

router = APIRouter(prefix="/countries", tags=["countries"])


@router.get("")
async def list_countries(status: str | None = None, enabled_only: bool = False):
    db = get_db()
    q = {}
    if status:
        q["status"] = status
    if enabled_only:
        q["enabled"] = True
    items = await db.countries.find(q, {"_id": 0}).sort("name", 1).to_list(500)
    return items


@router.get("/summary")
async def country_summary():
    db = get_db()
    counts = {}
    for s in ["supported", "preview", "extended", "unsupported", "unavailable"]:
        counts[s] = await db.countries.count_documents({"status": s})
    counts["enabled"] = await db.countries.count_documents({"enabled": True})
    counts["total"] = await db.countries.count_documents({})
    return counts


@router.post("", dependencies=[Depends(require_platform_admin)])
async def create_country(data: CountryIn):
    db = get_db()
    data.code = data.code.upper()
    if await db.countries.find_one({"code": data.code}):
        raise HTTPException(400, "Country code already exists")
    c = Country(**data.model_dump())
    await db.countries.insert_one(c.model_dump())
    return c.model_dump()


@router.put("/{code}", dependencies=[Depends(require_platform_admin)])
async def update_country(code: str, data: CountryIn):
    db = get_db()
    code = code.upper()
    existing = await db.countries.find_one({"code": code})
    if not existing:
        raise HTTPException(404, "Country not found")
    patch = data.model_dump()
    patch["code"] = code
    patch["updated_at"] = _now_iso()
    await db.countries.update_one({"code": code}, {"$set": patch})
    doc = await db.countries.find_one({"code": code}, {"_id": 0})
    return doc


@router.delete("/{code}", dependencies=[Depends(require_platform_admin)])
async def delete_country(code: str):
    db = get_db()
    code = code.upper()
    res = await db.countries.delete_one({"code": code})
    if res.deleted_count == 0:
        raise HTTPException(404, "Country not found")
    return {"status": "ok"}
