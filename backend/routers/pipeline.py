"""Pipeline + revenue attribution + proactive opportunities."""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from db import get_db
from security import require_tenant_user

router = APIRouter(prefix="/tenants/pipeline", tags=["pipeline"])


def _iso_days_ago(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


@router.get("/funnel")
async def funnel(user: dict = Depends(require_tenant_user), days: int = 30):
    """Call → Lead → Appointment → Estimate → Job (completed appt) → Payment (paid invoice) → Review."""
    db = get_db()
    tid = user["tenant_id"]
    since = _iso_days_ago(days)
    calls = await db.conversations.count_documents({"tenant_id": tid, "channel": "call", "created_at": {"$gte": since}})
    leads = await db.leads.count_documents({"tenant_id": tid, "created_at": {"$gte": since}})
    qualified = await db.leads.count_documents({"tenant_id": tid, "created_at": {"$gte": since}, "status": {"$in": ["qualified", "won"]}})
    appts = await db.appointments.count_documents({"tenant_id": tid, "created_at": {"$gte": since}})
    estimates = await db.estimates.count_documents({"tenant_id": tid, "created_at": {"$gte": since}})
    jobs = await db.appointments.count_documents({"tenant_id": tid, "created_at": {"$gte": since}, "status": "completed"})
    paid_invoices = await db.invoices.count_documents({"tenant_id": tid, "status": "paid", "paid_at": {"$gte": since}})
    reviews = await db.review_requests.count_documents({"tenant_id": tid, "status": "responded", "created_at": {"$gte": since}})
    stages = [
        {"key": "calls", "label": "Calls", "value": calls},
        {"key": "leads", "label": "Leads", "value": leads},
        {"key": "qualified", "label": "Qualified", "value": qualified},
        {"key": "appointments", "label": "Appointments", "value": appts},
        {"key": "estimates", "label": "Estimates", "value": estimates},
        {"key": "jobs", "label": "Jobs completed", "value": jobs},
        {"key": "payments", "label": "Paid invoices", "value": paid_invoices},
        {"key": "reviews", "label": "Reviews", "value": reviews},
    ]
    # Conversion rates between stages
    for i in range(1, len(stages)):
        prev = stages[i - 1]["value"]
        stages[i]["conversion"] = round((stages[i]["value"] / prev) * 100, 1) if prev else 0
    return {"days": days, "stages": stages}


@router.get("/attribution")
async def attribution(user: dict = Depends(require_tenant_user), days: int = 30):
    """Revenue attributed to AI-sourced customers vs manual."""
    db = get_db()
    tid = user["tenant_id"]
    since = _iso_days_ago(days)

    paid = await db.invoices.find(
        {"tenant_id": tid, "status": "paid", "paid_at": {"$gte": since}},
        {"_id": 0, "customer_phone": 1, "total": 1, "paid_at": 1, "title": 1},
    ).to_list(1000)

    # Build map: customer_phone → first_touch source (call|portal|manual)
    call_phones = set()
    portal_phones = set()
    async for lead in db.leads.find({"tenant_id": tid}, {"_id": 0, "phone": 1, "source": 1}):
        if lead.get("source") == "call":
            call_phones.add(lead.get("phone", ""))
        elif lead.get("source") == "portal":
            portal_phones.add(lead.get("phone", ""))

    totals = {"ai_call": 0.0, "portal": 0.0, "manual": 0.0}
    counts = {"ai_call": 0, "portal": 0, "manual": 0}
    for inv in paid:
        phone = inv.get("customer_phone", "")
        amt = float(inv.get("total", 0) or 0)
        if phone and phone in call_phones:
            totals["ai_call"] += amt; counts["ai_call"] += 1
        elif phone and phone in portal_phones:
            totals["portal"] += amt; counts["portal"] += 1
        else:
            totals["manual"] += amt; counts["manual"] += 1

    # Missed opportunity: missed calls * average deal size
    missed_calls = await db.conversations.count_documents({"tenant_id": tid, "channel": "call", "status": "missed", "created_at": {"$gte": since}})
    all_totals = [float(p.get("total", 0) or 0) for p in paid]
    avg_deal = (sum(all_totals) / len(all_totals)) if all_totals else 0

    # Best services by booked appointments
    service_counts = defaultdict(int)
    service_revenue = defaultdict(float)
    appts = await db.appointments.find({"tenant_id": tid, "created_at": {"$gte": since}}, {"_id": 0, "service_name": 1, "customer_phone": 1}).to_list(500)
    for a in appts:
        sn = a.get("service_name") or "Unspecified"
        service_counts[sn] += 1
    # Revenue by service (match invoice titles that contain service name)
    for inv in paid:
        title = (inv.get("title") or "").lower()
        for sn in service_counts.keys():
            if sn and sn.lower() in title:
                service_revenue[sn] += float(inv.get("total", 0) or 0)
                break

    best_services = sorted(
        [{"name": k, "count": v, "revenue": service_revenue.get(k, 0)} for k, v in service_counts.items()],
        key=lambda x: (-x["revenue"], -x["count"]),
    )[:10]

    # Best sources (lead.source distribution)
    source_counts = defaultdict(int)
    async for lead in db.leads.find({"tenant_id": tid, "created_at": {"$gte": since}}, {"_id": 0, "source": 1}):
        source_counts[lead.get("source") or "unknown"] += 1
    best_sources = sorted(
        [{"source": k, "count": v} for k, v in source_counts.items()], key=lambda x: -x["count"],
    )

    return {
        "days": days,
        "revenue": {"total": round(sum(totals.values()), 2), **{k: round(v, 2) for k, v in totals.items()}},
        "deals": counts,
        "missed_calls": missed_calls,
        "estimated_missed_revenue": round(missed_calls * avg_deal, 2),
        "average_deal_value": round(avg_deal, 2),
        "best_services": best_services,
        "best_sources": best_sources,
    }


@router.get("/opportunities")
async def opportunities(user: dict = Depends(require_tenant_user)):
    """Proactive queue of things the owner should act on today."""
    db = get_db()
    tid = user["tenant_id"]
    now = datetime.now(timezone.utc)
    items = []

    # Unanswered leads > 24h, status still 'new'
    cutoff = (now - timedelta(hours=24)).isoformat()
    unanswered = await db.leads.find(
        {"tenant_id": tid, "status": "new", "created_at": {"$lte": cutoff}},
        {"_id": 0},
    ).sort("created_at", 1).to_list(50)
    for lead in unanswered[:20]:
        items.append({
            "kind": "unanswered_lead", "severity": "high",
            "title": f"Follow up with {lead['name']}",
            "detail": f"Lead has been 'new' for over 24h · source: {lead.get('source','')}",
            "entity_id": lead["id"], "entity_type": "lead",
            "created_at": lead["created_at"],
        })

    # Missed calls not texted back
    missed = await db.conversations.find(
        {"tenant_id": tid, "status": "missed"}, {"_id": 0},
    ).sort("created_at", -1).to_list(20)
    for c in missed:
        items.append({
            "kind": "missed_call", "severity": "high",
            "title": f"Missed call from {c.get('caller_name') or c.get('caller_phone')}",
            "detail": "Send a text-back to recover this lead",
            "entity_id": c["id"], "entity_type": "conversation",
            "created_at": c["created_at"],
        })

    # Overdue invoices (sent but not paid in >30 days)
    overdue_cutoff = (now - timedelta(days=30)).isoformat()
    overdue = await db.invoices.find(
        {"tenant_id": tid, "status": {"$in": ["sent", "overdue"]}, "created_at": {"$lte": overdue_cutoff}}, {"_id": 0},
    ).sort("created_at", 1).to_list(20)
    for inv in overdue:
        items.append({
            "kind": "overdue_invoice", "severity": "high",
            "title": f"Chase ${inv.get('total',0):.0f} from {inv.get('customer_name','')}",
            "detail": f"Invoice '{inv.get('title','')}' is 30+ days unpaid",
            "entity_id": inv["id"], "entity_type": "invoice",
            "created_at": inv["created_at"],
        })

    # Completed jobs that haven't gotten a review request
    completed = await db.appointments.find({"tenant_id": tid, "status": "completed"}, {"_id": 0, "customer_phone": 1, "customer_name": 1, "id": 1, "created_at": 1}).to_list(50)
    reviewed_phones = set()
    async for rr in db.review_requests.find({"tenant_id": tid}, {"_id": 0, "customer_phone": 1}):
        reviewed_phones.add(rr.get("customer_phone", ""))
    for a in completed:
        if a.get("customer_phone") and a["customer_phone"] not in reviewed_phones:
            items.append({
                "kind": "review_opportunity", "severity": "medium",
                "title": f"Ask {a.get('customer_name','your customer')} for a review",
                "detail": "Completed job — no review request sent yet",
                "entity_id": a["id"], "entity_type": "appointment",
                "created_at": a.get("created_at"),
            })

    # Inactive customers (no appointment in 180 days)
    inactive_cutoff = (now - timedelta(days=180)).isoformat()
    customers = await db.customers.find({"tenant_id": tid}, {"_id": 0, "id": 1, "name": 1, "phone": 1, "created_at": 1}).to_list(500)
    for c in customers[:30]:
        recent_appt = await db.appointments.find_one({"tenant_id": tid, "customer_phone": c.get("phone", "__none__"), "created_at": {"$gte": inactive_cutoff}})
        if not recent_appt:
            items.append({
                "kind": "inactive_customer", "severity": "low",
                "title": f"Reach back out to {c['name']}",
                "detail": "No activity in 6 months — maintenance reminder?",
                "entity_id": c["id"], "entity_type": "customer",
                "created_at": c.get("created_at"),
            })

    # Sort by severity then time
    order = {"high": 0, "medium": 1, "low": 2}
    items.sort(key=lambda x: (order.get(x.get("severity"), 3), x.get("created_at", "")))
    return {"count": len(items), "items": items[:50]}


@router.get("/hot-leads")
async def hot_leads(user: dict = Depends(require_tenant_user)):
    """Leads scored by freshness + source + status."""
    db = get_db()
    tid = user["tenant_id"]
    leads = await db.leads.find({"tenant_id": tid, "status": {"$in": ["new", "contacted"]}}, {"_id": 0}).to_list(200)
    scored = []
    for l in leads:
        score = 40
        try:
            age_h = (datetime.now(timezone.utc) - datetime.fromisoformat(l["created_at"].replace("Z", "+00:00"))).total_seconds() / 3600
            if age_h < 1: score += 40
            elif age_h < 6: score += 25
            elif age_h < 24: score += 10
        except Exception:
            pass
        if l.get("source") == "call": score += 15
        if l.get("source") == "portal": score += 10
        if l.get("status") == "contacted": score -= 5
        if l.get("email"): score += 3
        if l.get("phone"): score += 7
        scored.append({**l, "score": min(100, max(0, score))})
    scored.sort(key=lambda x: -x["score"])
    return scored[:25]
