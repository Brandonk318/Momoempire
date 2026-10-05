"""Platform administration endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from db import get_db
from models import FeatureFlag, FeatureFlagIn, _now_iso
from security import require_platform_admin

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_platform_admin)])


@router.get("/overview")
async def overview():
    db = get_db()
    return {
        "tenants": await db.tenants.count_documents({}),
        "active_tenants": await db.tenants.count_documents({"status": "active"}),
        "onboarded": await db.tenants.count_documents({"onboarding_complete": True}),
        "users": await db.users.count_documents({}),
        "industries": await db.industries.count_documents({}),
        "countries_enabled": await db.countries.count_documents({"enabled": True}),
        "feature_flags": await db.feature_flags.count_documents({}),
        "customers_total": await db.customers.count_documents({}),
        "appointments_total": await db.appointments.count_documents({}),
    }


@router.get("/tenants")
async def list_tenants():
    db = get_db()
    rows = await db.tenants.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return rows


@router.put("/tenants/{tenant_id}/status")
async def set_tenant_status(tenant_id: str, status: str):
    db = get_db()
    if status not in {"active", "suspended"}:
        raise HTTPException(400, "Invalid status")
    res = await db.tenants.update_one({"id": tenant_id}, {"$set": {"status": status, "updated_at": _now_iso()}})
    if res.matched_count == 0:
        raise HTTPException(404, "Tenant not found")
    return {"status": "ok"}


@router.get("/users")
async def list_users():
    db = get_db()
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)


# ---------- Feature flags ----------
@router.get("/feature-flags")
async def list_flags():
    db = get_db()
    return await db.feature_flags.find({}, {"_id": 0}).sort("key", 1).to_list(200)


@router.post("/feature-flags")
async def upsert_flag(data: FeatureFlagIn):
    db = get_db()
    existing = await db.feature_flags.find_one({"key": data.key})
    if existing:
        await db.feature_flags.update_one(
            {"key": data.key},
            {"$set": {"enabled": data.enabled, "description": data.description, "updated_at": _now_iso()}},
        )
    else:
        f = FeatureFlag(**data.model_dump())
        await db.feature_flags.insert_one(f.model_dump())
    return await db.feature_flags.find_one({"key": data.key}, {"_id": 0})


@router.put("/feature-flags/{key}")
async def toggle_flag(key: str, enabled: bool):
    db = get_db()
    res = await db.feature_flags.update_one(
        {"key": key}, {"$set": {"enabled": enabled, "updated_at": _now_iso()}}
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Flag not found")
    return await db.feature_flags.find_one({"key": key}, {"_id": 0})


@router.get("/health")
async def health():
    db = get_db()
    try:
        await db.command("ping")
        return {"status": "ok", "db": "ok"}
    except Exception as e:
        return {"status": "degraded", "db": "error", "detail": str(e)}
