"""Platform analytics — MRR, ARPU, churn, usage, gross margin."""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from db import get_db
from security import require_platform_admin

router = APIRouter(prefix="/admin/analytics", tags=["admin-analytics"], dependencies=[Depends(require_platform_admin)])


def _period_key(dt=None):
    return (dt or datetime.now(timezone.utc)).strftime("%Y-%m")


@router.get("/overview")
async def overview():
    db = get_db()
    now = datetime.now(timezone.utc)
    plans = {p["key"]: p async for p in db.plans.find({}, {"_id": 0})}

    total_tenants = await db.tenants.count_documents({})
    active = await db.tenants.count_documents({"status": "active", "subscription_status": "active"})
    trial = await db.tenants.count_documents({"subscription_status": "trial"})
    canceled_30d = await db.tenants.count_documents({
        "subscription_status": "canceled",
        "updated_at": {"$gte": (now - timedelta(days=30)).isoformat()},
    })

    # MRR by plan
    plan_counts = defaultdict(int)
    async for t in db.tenants.find({"subscription_status": "active"}, {"_id": 0, "plan_id": 1}):
        plan_counts[t.get("plan_id") or "starter"] += 1
    mrr_cents = 0
    mrr_by_plan = {}
    for key, count in plan_counts.items():
        p = plans.get(key, plans.get("starter", {"price_cents": 0}))
        rev = (p.get("price_cents") or 0) * count
        mrr_by_plan[key] = {"count": count, "mrr_cents": rev}
        mrr_cents += rev

    arpu_cents = mrr_cents / active if active else 0
    churn_pct = (canceled_30d / active * 100) if active else 0

    # Trial conversion (last 60d)
    trial_cutoff = (now - timedelta(days=60)).isoformat()
    recent_trials = await db.tenants.count_documents({"created_at": {"$gte": trial_cutoff}})
    converted = await db.tenants.count_documents({
        "created_at": {"$gte": trial_cutoff},
        "subscription_status": "active",
    })
    conversion_pct = (converted / recent_trials * 100) if recent_trials else 0

    # Usage totals this period across all tenants
    pk = _period_key()
    totals_pipeline = [
        {"$match": {"period_key": pk}},
        {"$group": {"_id": "$metric", "total": {"$sum": "$value"}}},
    ]
    usage_totals = {r["_id"]: r["total"] for r in await db.usage_events.aggregate(totals_pipeline).to_list(50)}

    # Gross margin: revenue - sum(usage_metric * cost_per_unit_cents) / 100 (back to cents comparison)
    cost_doc = await db.cost_config.find_one({"id": "singleton"}, {"_id": 0}) or {"costs": {}}
    costs = cost_doc.get("costs", {})
    monthly_cost_cents = sum((usage_totals.get(k, 0) * v) for k, v in costs.items() if k in usage_totals)
    gross_margin_cents = mrr_cents - monthly_cost_cents
    gross_margin_pct = (gross_margin_cents / mrr_cents * 100) if mrr_cents else 0

    # Revenue attributed to AI = sum of paid invoices where customer came from leads with source=call
    call_phones = set()
    async for lead in db.leads.find({"source": "call"}, {"_id": 0, "phone": 1}):
        call_phones.add(lead.get("phone", ""))
    ai_revenue_cents = 0
    async for inv in db.invoices.find({"status": "paid"}, {"_id": 0, "customer_phone": 1, "total": 1}):
        if inv.get("customer_phone") in call_phones:
            ai_revenue_cents += int(float(inv.get("total") or 0) * 100)

    # Counts
    calls_total = await db.conversations.count_documents({"channel": "call"})
    sms_total = await db.conversations.count_documents({"channel": "sms"})
    leads_total = await db.leads.count_documents({})
    appts_total = await db.appointments.count_documents({})
    upgrades_30d = 0  # placeholder — would require subscription event log
    downgrades_30d = 0

    return {
        "customers": {"total": total_tenants, "active": active, "trial": trial, "canceled_30d": canceled_30d},
        "conversion_pct": round(conversion_pct, 1),
        "mrr": {"cents": mrr_cents, "dollars": round(mrr_cents / 100, 2), "by_plan": mrr_by_plan},
        "arpu_cents": round(arpu_cents, 1),
        "churn_30d_pct": round(churn_pct, 1),
        "usage_period": pk,
        "usage_totals": usage_totals,
        "costs_per_unit_cents": costs,
        "monthly_cost_cents": round(monthly_cost_cents, 1),
        "gross_margin_cents": round(gross_margin_cents, 1),
        "gross_margin_pct": round(gross_margin_pct, 1),
        "ai_attributed_revenue_cents": ai_revenue_cents,
        "totals": {
            "calls": calls_total, "sms_threads": sms_total,
            "leads": leads_total, "appointments": appts_total,
            "upgrades_30d": upgrades_30d, "downgrades_30d": downgrades_30d,
        },
    }


@router.get("/margin-by-plan")
async def margin_by_plan():
    """Per-plan revenue, cost (from active-tenant usage this period), and margin."""
    db = get_db()
    plans = {p["key"]: p async for p in db.plans.find({}, {"_id": 0})}
    cost_doc = await db.cost_config.find_one({"id": "singleton"}, {"_id": 0}) or {"costs": {}}
    costs = cost_doc.get("costs", {})
    pk = _period_key()

    out = []
    for key, p in plans.items():
        # Count tenants on this plan
        tenants = [t async for t in db.tenants.find({"subscription_status": "active", "plan_id": key}, {"_id": 0, "id": 1})]
        n = len(tenants)
        rev_cents = (p.get("price_cents") or 0) * n
        # Sum usage across those tenants
        tenant_ids = [t["id"] for t in tenants]
        metrics_pipeline = [
            {"$match": {"tenant_id": {"$in": tenant_ids}, "period_key": pk}},
            {"$group": {"_id": "$metric", "total": {"$sum": "$value"}}},
        ]
        usage = {r["_id"]: r["total"] for r in await db.usage_events.aggregate(metrics_pipeline).to_list(50)}
        cost_cents = sum((usage.get(k, 0) * v) for k, v in costs.items() if k in usage)
        margin_cents = rev_cents - cost_cents
        margin_pct = (margin_cents / rev_cents * 100) if rev_cents else 0
        out.append({
            "plan_key": key, "plan_name": p.get("name"), "tenants": n,
            "revenue_cents": rev_cents, "cost_cents": round(cost_cents, 1),
            "margin_cents": round(margin_cents, 1), "margin_pct": round(margin_pct, 1),
            "usage": usage,
        })
    out.sort(key=lambda x: -x["revenue_cents"])
    return out
