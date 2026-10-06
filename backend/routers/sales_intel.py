"""Sales intelligence router: lead scoring, upsells, follow-ups, CRM auto-fill."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from db import get_db
from models import _uuid, _now_iso
from security import require_tenant_user
from ai_insights import score_lead_from_transcript, extract_crm_fields, match_upsells

router = APIRouter(prefix="/sales", tags=["sales-intel"])


# ---------- Lead scoring ----------
@router.post("/conversations/{conv_id}/score")
async def score_conversation(conv_id: str, user: dict = Depends(require_tenant_user)):
    """Compute (or recompute) a hot/warm/cold score for the conversation + its linked lead."""
    db = get_db()
    conv = await db.conversations.find_one({"id": conv_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not conv:
        raise HTTPException(404, "Conversation not found")
    msgs = await db.conv_messages.find({"conversation_id": conv_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    transcript = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in msgs)
    tenant = await db.tenants.find_one({"id": user["tenant_id"]}, {"_id": 0, "industry_slug": 1})

    score = await score_lead_from_transcript(transcript, conv.get("caller_name") or "", (tenant or {}).get("industry_slug", ""))
    scored_at = _now_iso()
    await db.conversations.update_one(
        {"id": conv_id, "tenant_id": user["tenant_id"]},
        {"$set": {"lead_score": score, "lead_scored_at": scored_at}},
    )
    if conv.get("lead_id"):
        await db.leads.update_one(
            {"id": conv["lead_id"], "tenant_id": user["tenant_id"]},
            {"$set": {"lead_score": score, "lead_scored_at": scored_at}},
        )
    return {"conversation_id": conv_id, "lead_id": conv.get("lead_id"), "score": score}


@router.get("/leads/scored")
async def scored_leads(user: dict = Depends(require_tenant_user), label: Optional[str] = None, limit: int = 100):
    db = get_db()
    q: dict = {"tenant_id": user["tenant_id"], "lead_score": {"$exists": True}}
    if label in {"hot", "warm", "cold"}:
        q["lead_score.label"] = label
    rows = await db.leads.find(q, {"_id": 0}).sort("lead_scored_at", -1).to_list(limit)
    return rows


# ---------- CRM auto-fill ----------
@router.post("/conversations/{conv_id}/extract")
async def extract_fields(conv_id: str, user: dict = Depends(require_tenant_user)):
    db = get_db()
    conv = await db.conversations.find_one({"id": conv_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not conv:
        raise HTTPException(404, "Conversation not found")
    msgs = await db.conv_messages.find({"conversation_id": conv_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    transcript = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in msgs)
    tenant = await db.tenants.find_one({"id": user["tenant_id"]}, {"_id": 0, "industry_slug": 1})
    fields = await extract_crm_fields(transcript, (tenant or {}).get("industry_slug", ""))
    await db.conversations.update_one(
        {"id": conv_id, "tenant_id": user["tenant_id"]},
        {"$set": {"extracted_fields": fields, "extracted_at": _now_iso()}},
    )
    return {"conversation_id": conv_id, "fields": fields}


class ApplyFieldsIn(BaseModel):
    name: str = ""
    phone: str = ""
    email: str = ""
    address: str = ""
    service_requested: str = ""
    urgency: str = ""
    notes: str = ""


@router.post("/conversations/{conv_id}/apply-fields")
async def apply_fields(conv_id: str, data: ApplyFieldsIn, user: dict = Depends(require_tenant_user)):
    """Owner reviewed extracted fields → push them onto the linked lead/customer."""
    db = get_db()
    conv = await db.conversations.find_one({"id": conv_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not conv:
        raise HTTPException(404, "Conversation not found")
    patch = {k: v for k, v in data.model_dump().items() if v}
    if not patch:
        return {"status": "noop"}
    tenant_id = user["tenant_id"]
    lead_id = conv.get("lead_id")
    customer_id = conv.get("customer_id")
    if customer_id:
        p = {}
        for k in ["name", "phone", "email", "address", "notes"]:
            if patch.get(k):
                p[k] = patch[k]
        if p:
            await db.customers.update_one({"id": customer_id, "tenant_id": tenant_id}, {"$set": p})
    elif lead_id:
        p = {}
        for k in ["name", "phone", "email", "notes"]:
            if patch.get(k):
                p[k] = patch[k]
        if patch.get("service_requested"):
            p["notes"] = (p.get("notes") or "") + f"\nService requested: {patch['service_requested']}"
        if patch.get("urgency") and patch["urgency"] != "normal":
            p["notes"] = (p.get("notes") or "") + f"\nUrgency: {patch['urgency']}"
        if p:
            await db.leads.update_one({"id": lead_id, "tenant_id": tenant_id}, {"$set": p})
    else:
        # No link yet → create a lead
        new_lead = {
            "id": _uuid(), "tenant_id": tenant_id,
            "name": patch.get("name") or conv.get("caller_name") or "New caller",
            "phone": patch.get("phone") or conv.get("caller_phone") or "",
            "email": patch.get("email") or None,
            "source": "call",
            "notes": (patch.get("notes") or "") + (f"\nService: {patch.get('service_requested','')}" if patch.get("service_requested") else ""),
            "status": "new",
            "created_at": _now_iso(),
        }
        await db.leads.insert_one(new_lead)
        await db.conversations.update_one({"id": conv_id}, {"$set": {"lead_id": new_lead["id"]}})
        lead_id = new_lead["id"]
    return {"status": "ok", "lead_id": lead_id, "customer_id": customer_id}


# ---------- Upsells ----------
class UpsellIn(BaseModel):
    name: str
    description: str = ""
    triggers: List[str] = Field(default_factory=list)   # service keywords that activate the suggestion
    pitch: str = ""                                     # 1-liner the AI will use
    estimated_price: Optional[float] = None
    global_: bool = Field(False, alias="global")


class Upsell(UpsellIn):
    id: str = Field(default_factory=_uuid)
    tenant_id: str
    created_at: str = Field(default_factory=_now_iso)


@router.get("/upsells")
async def list_upsells(user: dict = Depends(require_tenant_user)):
    db = get_db()
    rows = await db.upsells.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return rows


@router.post("/upsells")
async def create_upsell(data: UpsellIn, user: dict = Depends(require_tenant_user)):
    db = get_db()
    doc = {
        "id": _uuid(), "tenant_id": user["tenant_id"],
        "name": data.name, "description": data.description,
        "triggers": [t.strip() for t in data.triggers if t.strip()],
        "pitch": data.pitch, "estimated_price": data.estimated_price,
        "global": data.global_, "created_at": _now_iso(),
    }
    await db.upsells.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@router.put("/upsells/{uid}")
async def update_upsell(uid: str, data: UpsellIn, user: dict = Depends(require_tenant_user)):
    db = get_db()
    patch = {
        "name": data.name, "description": data.description,
        "triggers": [t.strip() for t in data.triggers if t.strip()],
        "pitch": data.pitch, "estimated_price": data.estimated_price,
        "global": data.global_,
    }
    res = await db.upsells.update_one({"id": uid, "tenant_id": user["tenant_id"]}, {"$set": patch})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return await db.upsells.find_one({"id": uid}, {"_id": 0})


@router.delete("/upsells/{uid}")
async def delete_upsell(uid: str, user: dict = Depends(require_tenant_user)):
    db = get_db()
    res = await db.upsells.delete_one({"id": uid, "tenant_id": user["tenant_id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"status": "ok"}


@router.get("/upsells/suggest")
async def suggest_upsells(service: str, user: dict = Depends(require_tenant_user)):
    db = get_db()
    rows = await db.upsells.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).to_list(200)
    return match_upsells(service, rows)


# ---------- Smart follow-up cadence ----------
# Default cadence: SMS day 1, day 3, day 7. Admin can override per tenant.
DEFAULT_CADENCE = [
    {"offset_hours": 24,  "channel": "sms", "template": "Hi {name} — this is {business}. Just following up on your call. Want me to go ahead and book a time?"},
    {"offset_hours": 72,  "channel": "sms", "template": "Hey {name}, {business} here again. We've still got openings this week — want me to pencil you in?"},
    {"offset_hours": 168, "channel": "sms", "template": "Hi {name}, last check-in from {business}. Reply YES and I'll get you scheduled — otherwise no worries."},
]


class CadenceIn(BaseModel):
    steps: List[Dict[str, Any]]  # [{offset_hours, channel, template}]
    enabled: bool = True


@router.get("/followups/cadence")
async def get_cadence(user: dict = Depends(require_tenant_user)):
    db = get_db()
    doc = await db.followup_cadences.find_one({"tenant_id": user["tenant_id"]}, {"_id": 0})
    return doc or {"tenant_id": user["tenant_id"], "steps": DEFAULT_CADENCE, "enabled": True}


@router.put("/followups/cadence")
async def set_cadence(data: CadenceIn, user: dict = Depends(require_tenant_user)):
    db = get_db()
    await db.followup_cadences.update_one(
        {"tenant_id": user["tenant_id"]},
        {"$set": {"tenant_id": user["tenant_id"], "steps": data.steps, "enabled": data.enabled, "updated_at": _now_iso()}},
        upsert=True,
    )
    return await db.followup_cadences.find_one({"tenant_id": user["tenant_id"]}, {"_id": 0})


async def _schedule_followups_for_lead(tenant_id: str, lead: dict, trigger_label: str = "warm"):
    """Internal: given a scored lead, enqueue follow-up jobs per the cadence."""
    db = get_db()
    cad = await db.followup_cadences.find_one({"tenant_id": tenant_id}, {"_id": 0}) or {"steps": DEFAULT_CADENCE, "enabled": True}
    if not cad.get("enabled"):
        return 0
    steps = cad.get("steps") or DEFAULT_CADENCE
    # Only auto-cadence hot & warm; cold gets no auto nudges
    if trigger_label == "cold":
        return 0
    now = datetime.now(timezone.utc)
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0, "name": 1})
    biz = (tenant or {}).get("name", "us")
    name = lead.get("name") or "there"
    count = 0
    for i, step in enumerate(steps):
        send_at = now + timedelta(hours=int(step.get("offset_hours", 24)))
        body = (step.get("template") or "").format(name=name, business=biz)
        await db.followup_jobs.update_one(
            {"tenant_id": tenant_id, "lead_id": lead["id"], "step_index": i},
            {"$set": {
                "id": _uuid(),
                "tenant_id": tenant_id, "lead_id": lead["id"], "step_index": i,
                "channel": step.get("channel", "sms"),
                "to": lead.get("phone", ""),
                "body": body,
                "send_at": send_at.isoformat(),
                "status": "scheduled",
                "trigger_label": trigger_label,
                "created_at": _now_iso(),
            }},
            upsert=True,
        )
        count += 1
    return count


@router.post("/leads/{lead_id}/schedule-followups")
async def schedule_followups(lead_id: str, user: dict = Depends(require_tenant_user)):
    db = get_db()
    lead = await db.leads.find_one({"id": lead_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Lead not found")
    label = (lead.get("lead_score") or {}).get("label", "warm")
    n = await _schedule_followups_for_lead(user["tenant_id"], lead, label)
    return {"scheduled": n, "label": label}


@router.get("/followups")
async def list_followups(user: dict = Depends(require_tenant_user), status: Optional[str] = None, limit: int = 200):
    db = get_db()
    q = {"tenant_id": user["tenant_id"]}
    if status:
        q["status"] = status
    rows = await db.followup_jobs.find(q, {"_id": 0}).sort("send_at", 1).to_list(limit)
    return rows


@router.post("/followups/{job_id}/cancel")
async def cancel_followup(job_id: str, user: dict = Depends(require_tenant_user)):
    db = get_db()
    res = await db.followup_jobs.update_one(
        {"id": job_id, "tenant_id": user["tenant_id"], "status": "scheduled"},
        {"$set": {"status": "cancelled", "updated_at": _now_iso()}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Not scheduled")
    return {"status": "ok"}


@router.post("/followups/run-due")
async def run_due_followups(user: dict = Depends(require_tenant_user)):
    """Process scheduled follow-ups whose send_at <= now. Demo-mode logs the send."""
    db = get_db()
    now_iso = _now_iso()
    due = await db.followup_jobs.find(
        {"tenant_id": user["tenant_id"], "status": "scheduled", "send_at": {"$lte": now_iso}},
        {"_id": 0},
    ).to_list(200)
    sent = 0
    for j in due:
        # Record outbound SMS as a usage event (actual carrier send is Twilio TODO)
        from routers.usage import record_usage
        if j.get("channel") == "sms" and j.get("to"):
            await record_usage(user["tenant_id"], "sms", 1, {"followup_job_id": j["id"], "simulated": True})
            print(f"[FOLLOWUP->{j['to']}] {j['body']}")
        await db.followup_jobs.update_one(
            {"id": j["id"]},
            {"$set": {"status": "sent", "sent_at": _now_iso()}},
        )
        sent += 1
    return {"sent": sent}
