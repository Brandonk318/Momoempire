"""Usage metering + plan limits + graceful fallback hook."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from db import get_db
from security import require_tenant_user
from models_phase2 import PLAN_LIMITS, WARNING_THRESHOLDS

router = APIRouter(prefix="/usage", tags=["usage"])


def period_key(dt: datetime | None = None) -> str:
    dt = dt or datetime.now(timezone.utc)
    return dt.strftime("%Y-%m")


async def record_usage(tenant_id: str, metric: str, value: float = 1, meta: dict | None = None):
    db = get_db()
    doc = {
        "tenant_id": tenant_id,
        "metric": metric,
        "value": float(value),
        "period_key": period_key(),
        "meta": meta or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    from models import _uuid
    doc["id"] = _uuid()
    await db.usage_events.insert_one(doc)


async def _usage_totals(tenant_id: str) -> dict:
    db = get_db()
    pk = period_key()
    pipeline = [
        {"$match": {"tenant_id": tenant_id, "period_key": pk}},
        {"$group": {"_id": "$metric", "total": {"$sum": "$value"}}},
    ]
    rows = await db.usage_events.aggregate(pipeline).to_list(100)
    return {r["_id"]: r["total"] for r in rows}


async def get_plan(tenant_id: str) -> str:
    db = get_db()
    t = await db.tenants.find_one({"id": tenant_id}, {"subscription_status": 1, "plan_id": 1})
    if not t:
        return "trial"
    if t.get("subscription_status") != "active":
        return "trial"
    return t.get("plan_id") or "starter"


async def usage_capped(tenant_id: str, metric: str = "ai_interactions") -> bool:
    plan = await get_plan(tenant_id)
    limit = PLAN_LIMITS[plan].get(metric)
    if not limit:
        return False
    totals = await _usage_totals(tenant_id)
    used = totals.get(metric, 0)
    return used >= limit


def _current_warning_tier(used: float, limit: float) -> float | None:
    if not limit:
        return None
    ratio = used / limit
    tier = None
    for t in WARNING_THRESHOLDS:
        if ratio >= t:
            tier = t
    return tier


@router.get("/me")
async def my_usage(user: dict = Depends(require_tenant_user)):
    plan = await get_plan(user["tenant_id"])
    limits = PLAN_LIMITS[plan]
    totals = await _usage_totals(user["tenant_id"])
    out = []
    for metric, limit in limits.items():
        used = float(totals.get(metric, 0))
        tier = _current_warning_tier(used, limit)
        out.append({
            "metric": metric,
            "used": used,
            "limit": limit,
            "pct": round((used / limit) * 100, 1) if limit else 0,
            "warning_tier": tier,
            "exhausted": used >= limit,
        })
    return {"plan": plan, "period": period_key(), "metrics": out, "thresholds": WARNING_THRESHOLDS}


@router.get("/events")
async def recent_events(user: dict = Depends(require_tenant_user), limit: int = 100):
    db = get_db()
    rows = await db.usage_events.find(
        {"tenant_id": user["tenant_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    return rows
