"""Growth features: weekly owner digest, win-back campaigns, referral tracking."""
import os
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from db import get_db
from models import _uuid, _now_iso
from security import require_tenant_user, require_tenant_owner_or_admin
from services.email import send_email, digest_html, followup_html
from services.twilio import send_sms

router = APIRouter(prefix="/growth", tags=["growth"])


# ---------- Weekly digest ----------
async def _digest_for_tenant(tenant_id: str) -> dict:
    db = get_db()
    now = datetime.now(timezone.utc)
    since = (now - timedelta(days=7)).isoformat()
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        return {}
    convs = await db.conversations.find({"tenant_id": tenant_id, "created_at": {"$gte": since}}, {"_id": 0}).to_list(1000)
    appts = await db.appointments.find({"tenant_id": tenant_id, "created_at": {"$gte": since}}, {"_id": 0}).to_list(1000)
    leads = await db.leads.find({"tenant_id": tenant_id, "created_at": {"$gte": since}}, {"_id": 0}).to_list(1000)
    hot = [l for l in leads if (l.get("lead_score") or {}).get("label") == "hot"]
    missed = [c for c in convs if c.get("status") in {"missed", "voicemail"}]
    reasons = {}
    for c in convs:
        summ = (c.get("summary") or "")[:140]
        if summ:
            reasons[summ] = reasons.get(summ, 0) + 1
    top_reasons = sorted(reasons.items(), key=lambda x: -x[1])[:5]
    stats = {
        "Calls answered": len([c for c in convs if c.get("status") not in {"missed", "failed"}]),
        "Appointments booked": len(appts),
        "New leads": len(leads),
        "Hot leads": len(hot),
        "Missed / voicemail": len(missed),
    }
    highlights = []
    if top_reasons:
        highlights.append("Top call reasons: " + " · ".join(f"{r} ({n})" for r, n in top_reasons[:3]))
    if hot:
        highlights.append(f"{len(hot)} hot lead(s) worth personal follow-up this week.")
    if missed:
        highlights.append(f"{len(missed)} caller(s) left voicemail — consider enabling missed-call textback.")
    if not highlights:
        highlights.append("Quiet week — the AI is on standby.")
    tips = []
    autom = await db.automation_settings.find_one({"tenant_id": tenant_id}, {"_id": 0}) or {}
    if not autom.get("missed_call_textback", True):
        tips.append("Turn on missed-call text-back to recover voicemail leads automatically.")
    if not await db.upsells.count_documents({"tenant_id": tenant_id}):
        tips.append("Add one upsell (Settings → Sales intel) so the AI can offer a complementary service.")
    if not tenant.get("review_url"):
        tips.append("Set your Google Business review URL so review requests actually boost ratings.")
    return {
        "tenant_id": tenant_id,
        "tenant": tenant,
        "stats": stats,
        "highlights": highlights,
        "tips": tips,
        "period": f"{(now - timedelta(days=7)).date()} → {now.date()}",
    }


class DigestSendIn(BaseModel):
    to: Optional[str] = None  # override; defaults to tenant.contact_email


@router.get("/digest/preview")
async def preview_digest(user: dict = Depends(require_tenant_user)):
    d = await _digest_for_tenant(user["tenant_id"])
    return {k: v for k, v in d.items() if k != "tenant"} | {"tenant_name": (d.get("tenant") or {}).get("name")}


@router.post("/digest/send")
async def send_digest(data: DigestSendIn, user: dict = Depends(require_tenant_owner_or_admin)):
    d = await _digest_for_tenant(user["tenant_id"])
    tenant = d.get("tenant") or {}
    to = (data.to or tenant.get("contact_email") or user.get("email") or "").strip()
    if not to:
        raise HTTPException(400, "No recipient — set workspace contact email first.")
    html = digest_html(business=tenant.get("name", "Your business"), period=d["period"],
                      stats=d["stats"], highlights=d["highlights"], tips=d["tips"])
    eid = await send_email(to=to, subject=f"{tenant.get('name','Your business')} · weekly digest",
                          html=html, from_name=tenant.get("name") or None)
    return {"status": "sent" if eid else "logged", "email_id": eid, "to": to}


# Internal (cron) — sends digest to all owners
async def _send_digest_to_all():
    db = get_db()
    tenants = await db.tenants.find({"status": "active"}, {"_id": 0}).to_list(5000)
    sent = 0
    for t in tenants:
        to = (t.get("contact_email") or "").strip()
        if not to:
            # fallback — owner user
            u = await db.users.find_one({"tenant_id": t["id"], "role": "owner"}, {"_id": 0, "email": 1})
            to = (u or {}).get("email") or ""
        if not to:
            continue
        d = await _digest_for_tenant(t["id"])
        html = digest_html(business=t.get("name", "Your business"), period=d["period"],
                          stats=d["stats"], highlights=d["highlights"], tips=d["tips"])
        try:
            await send_email(to=to, subject=f"{t.get('name','Your business')} · weekly digest",
                            html=html, from_name=t.get("name") or None)
            sent += 1
        except Exception as e:
            print(f"[digest] failed for {t['id']}: {e}")
    return sent


# ---------- Win-back campaigns ----------
class WinBackIn(BaseModel):
    days_inactive: int = 90
    channel: str = "sms"      # sms | email
    message: str
    dry_run: bool = True


@router.post("/winback/preview")
async def winback_preview(data: WinBackIn, user: dict = Depends(require_tenant_owner_or_admin)):
    """List customers eligible for a win-back campaign."""
    db = get_db()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=data.days_inactive)).isoformat()
    custs = await db.customers.find(
        {"tenant_id": user["tenant_id"], "$or": [
            {"last_contacted_at": {"$lte": cutoff}},
            {"last_contacted_at": {"$exists": False}, "created_at": {"$lte": cutoff}},
        ]}, {"_id": 0}
    ).to_list(500)
    channel_ok = []
    for c in custs:
        if data.channel == "sms" and c.get("phone"):
            channel_ok.append(c)
        elif data.channel == "email" and c.get("email"):
            channel_ok.append(c)
    return {"eligible": len(channel_ok), "sample": channel_ok[:20]}


@router.post("/winback/run")
async def winback_run(data: WinBackIn, user: dict = Depends(require_tenant_owner_or_admin)):
    """Launch the campaign (or dry-run)."""
    db = get_db()
    tenant = await db.tenants.find_one({"id": user["tenant_id"]}, {"_id": 0}) or {}
    preview = await winback_preview(data, user)
    results = {"attempted": 0, "sent": 0, "dry_run": data.dry_run, "channel": data.channel}
    campaign_id = _uuid()
    for c in preview["sample"] if data.dry_run else (await db.customers.find({
        "tenant_id": user["tenant_id"],
        **({"phone": {"$exists": True, "$ne": ""}} if data.channel == "sms" else {"email": {"$exists": True, "$ne": ""}}),
    }, {"_id": 0}).to_list(2000)):
        results["attempted"] += 1
        body = data.message.format(name=c.get("name") or "there", business=tenant.get("name", "us"))
        if data.dry_run:
            continue
        try:
            if data.channel == "sms":
                res = await send_sms(tenant_id=user["tenant_id"], to=c["phone"], body=body)
                sent_ok = res.get("status") not in {"error"}
            else:
                html = followup_html(business=tenant.get("name", "Your business"), message=body)
                eid = await send_email(to=c["email"], subject=f"We miss you at {tenant.get('name','our shop')}",
                                       html=html, from_name=tenant.get("name") or None)
                sent_ok = bool(eid)
            if sent_ok:
                results["sent"] += 1
                await db.customers.update_one({"id": c["id"], "tenant_id": user["tenant_id"]},
                                              {"$set": {"last_contacted_at": _now_iso()}})
        except Exception as e:
            print(f"[winback] send failed: {e}")
    await db.campaigns.insert_one({
        "id": campaign_id, "tenant_id": user["tenant_id"], "type": "winback",
        "config": data.model_dump(), "result": results, "created_at": _now_iso(),
    })
    return {"campaign_id": campaign_id, **results}


@router.get("/campaigns")
async def list_campaigns(user: dict = Depends(require_tenant_owner_or_admin), limit: int = 50):
    db = get_db()
    rows = await db.campaigns.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return rows


# ---------- Referral tracking ----------
class ReferralIssueIn(BaseModel):
    customer_id: Optional[str] = None
    customer_name: str = ""


@router.post("/referrals/issue")
async def issue_referral(data: ReferralIssueIn, user: dict = Depends(require_tenant_user)):
    """Mint a referral code for a customer. Landing URL: /r/{code}."""
    db = get_db()
    code = _uuid()[:8].upper()
    doc = {
        "id": _uuid(), "tenant_id": user["tenant_id"], "code": code,
        "customer_id": data.customer_id, "customer_name": data.customer_name,
        "visits": 0, "conversions": 0, "created_at": _now_iso(),
    }
    await db.referrals.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@router.get("/referrals")
async def list_referrals(user: dict = Depends(require_tenant_user)):
    db = get_db()
    rows = await db.referrals.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return rows


# Public (no auth) referral landing — bumps visits counter and returns business info
public_referrals = APIRouter(prefix="/public/r", tags=["referrals-public"])


@public_referrals.post("/{code}/visit")
async def referral_visit(code: str):
    db = get_db()
    row = await db.referrals.find_one({"code": code.upper()}, {"_id": 0})
    if not row:
        raise HTTPException(404, "Unknown referral code")
    await db.referrals.update_one({"id": row["id"]}, {"$inc": {"visits": 1}})
    tenant = await db.tenants.find_one({"id": row["tenant_id"]}, {"_id": 0, "name": 1, "slug": 1, "branding": 1})
    return {"referrer": row.get("customer_name") or "a happy customer",
            "business": {"name": (tenant or {}).get("name"), "slug": (tenant or {}).get("slug"),
                         "branding": (tenant or {}).get("branding", {})}}


@public_referrals.post("/{code}/convert")
async def referral_convert(code: str):
    db = get_db()
    row = await db.referrals.find_one({"code": code.upper()}, {"_id": 0})
    if not row:
        raise HTTPException(404, "Unknown referral code")
    await db.referrals.update_one({"id": row["id"]}, {"$inc": {"conversions": 1}})
    return {"ok": True}
