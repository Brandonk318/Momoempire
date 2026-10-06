"""Smart Repeat Scheduling — annual/semi-annual/quarterly/custom reminders.

Design notes:
- Cadences: annual (12mo), semi_annual (6mo), quarterly (3mo), custom (N months).
- Each schedule has a `next_due_at` and `reminder_days_before` (default 14).
- Cron scans every day and sends an email + SMS reminder, then marks
  `last_reminded_at`. When `next_due_at` has passed, we auto-advance it by the
  cadence so the schedule rolls forward annually/forever.
- Tenants carry a `default_cadence` and `business_type` so a maintenance biz
  defaults to annual while a service biz defaults to quarterly.
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Literal, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from db import get_db
from models import _uuid, _now_iso
from security import require_tenant_user, require_tenant_owner_or_admin
from services.email import send_email, followup_html
from services.twilio import send_sms

logger = logging.getLogger("repeat")
router = APIRouter(prefix="/repeat", tags=["repeat-scheduling"])


CADENCE_MONTHS = {"annual": 12, "semi_annual": 6, "quarterly": 3}


def _cadence_months(cadence: str, interval_months: Optional[int]) -> int:
    if cadence == "custom":
        return max(1, int(interval_months or 12))
    return CADENCE_MONTHS.get(cadence, 12)


def _add_months(dt: datetime, months: int) -> datetime:
    y = dt.year + (dt.month - 1 + months) // 12
    m = (dt.month - 1 + months) % 12 + 1
    # clamp day to valid day of target month
    import calendar
    d = min(dt.day, calendar.monthrange(y, m)[1])
    return dt.replace(year=y, month=m, day=d)


def _parse_iso(s: str) -> datetime:
    dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


# ---------- Models ----------
class RepeatScheduleIn(BaseModel):
    customer_id: Optional[str] = None
    customer_name: str
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = None
    service_name: str
    cadence: Literal["annual", "semi_annual", "quarterly", "custom"] = "annual"
    interval_months: Optional[int] = None  # required when cadence=custom
    start_date: str  # ISO date of first/last service
    reminder_days_before: int = Field(default=14, ge=1, le=90)
    notes: Optional[str] = None


class RepeatScheduleUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = None
    service_name: Optional[str] = None
    cadence: Optional[Literal["annual", "semi_annual", "quarterly", "custom"]] = None
    interval_months: Optional[int] = None
    reminder_days_before: Optional[int] = Field(default=None, ge=1, le=90)
    status: Optional[Literal["active", "paused", "cancelled"]] = None
    notes: Optional[str] = None


# ---------- Endpoints ----------
@router.get("/defaults")
async def get_defaults(user: dict = Depends(require_tenant_user)):
    """Return tenant default cadence suggestion based on business type."""
    db = get_db()
    t = await db.tenants.find_one({"id": user["tenant_id"]}, {"_id": 0, "business_type": 1, "default_cadence": 1}) or {}
    biz = (t.get("business_type") or "").lower()
    maintenance_hints = ("hvac", "plumb", "pest", "lawn", "gutter", "chimney", "septic", "pool", "solar", "maintenance")
    service_hints = ("salon", "spa", "clean", "massage", "dental", "vet", "detail", "barber", "nail")
    suggested = t.get("default_cadence") or (
        "annual" if any(h in biz for h in maintenance_hints) else
        "quarterly" if any(h in biz for h in service_hints) else "annual"
    )
    return {"default_cadence": suggested, "options": ["annual", "semi_annual", "quarterly", "custom"]}


@router.post("/schedules")
async def create_schedule(payload: RepeatScheduleIn, user: dict = Depends(require_tenant_user)):
    if payload.cadence == "custom" and not payload.interval_months:
        raise HTTPException(400, "interval_months required when cadence=custom")
    start_dt = _parse_iso(payload.start_date)
    next_due = _add_months(start_dt, _cadence_months(payload.cadence, payload.interval_months))
    doc = {
        "id": _uuid(),
        "tenant_id": user["tenant_id"],
        "customer_id": payload.customer_id,
        "customer_name": payload.customer_name,
        "customer_email": payload.customer_email,
        "customer_phone": payload.customer_phone,
        "service_name": payload.service_name,
        "cadence": payload.cadence,
        "interval_months": payload.interval_months,
        "start_date": start_dt.isoformat(),
        "next_due_at": next_due.isoformat(),
        "reminder_days_before": payload.reminder_days_before,
        "last_reminded_at": None,
        "status": "active",
        "notes": payload.notes,
        "created_at": _now_iso(),
    }
    db = get_db()
    await db.repeat_schedules.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/schedules")
async def list_schedules(user: dict = Depends(require_tenant_user), status: Optional[str] = None):
    db = get_db()
    q: dict = {"tenant_id": user["tenant_id"]}
    if status:
        q["status"] = status
    rows = await db.repeat_schedules.find(q, {"_id": 0}).sort("next_due_at", 1).to_list(500)
    return rows


@router.patch("/schedules/{sid}")
async def update_schedule(sid: str, payload: RepeatScheduleUpdate, user: dict = Depends(require_tenant_user)):
    db = get_db()
    existing = await db.repeat_schedules.find_one({"id": sid, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Schedule not found")
    patch = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    # Re-compute next_due_at only if cadence or interval changes
    if "cadence" in patch or "interval_months" in patch:
        c = patch.get("cadence", existing["cadence"])
        im = patch.get("interval_months", existing.get("interval_months"))
        if c == "custom" and not im:
            raise HTTPException(400, "interval_months required when cadence=custom")
        base = _parse_iso(existing.get("last_reminded_at") or existing["start_date"])
        patch["next_due_at"] = _add_months(base, _cadence_months(c, im)).isoformat()
    patch["updated_at"] = _now_iso()
    await db.repeat_schedules.update_one({"id": sid, "tenant_id": user["tenant_id"]}, {"$set": patch})
    return {"ok": True, **patch}


@router.delete("/schedules/{sid}")
async def delete_schedule(sid: str, user: dict = Depends(require_tenant_owner_or_admin)):
    db = get_db()
    res = await db.repeat_schedules.delete_one({"id": sid, "tenant_id": user["tenant_id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Schedule not found")
    return {"ok": True}


@router.post("/schedules/{sid}/send-reminder")
async def manual_send(sid: str, user: dict = Depends(require_tenant_user)):
    db = get_db()
    s = await db.repeat_schedules.find_one({"id": sid, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Schedule not found")
    result = await _send_reminder(s)
    return result


async def _send_reminder(s: dict) -> dict:
    """Send email + SMS reminder, mark last_reminded_at."""
    db = get_db()
    tenant = await db.tenants.find_one({"id": s["tenant_id"]}, {"_id": 0, "name": 1, "lang": 1}) or {}
    biz = tenant.get("name", "us")
    lang = (tenant.get("lang") or "en").lower()
    name = s.get("customer_name") or "there"
    service = s.get("service_name") or "service"
    due_str = (s.get("next_due_at") or "")[:10]

    if lang.startswith("es"):
        sms_body = (
            f"Hola {name}, aquí {biz}. Su {service} vence el {due_str}. "
            f"¿Programamos su próxima cita?"
        )
        subject = f"Recordatorio: hora de su {service}"
        html_message = (
            f"Hola {name},<br/><br/>Es hora de programar su próxima cita de "
            f"<b>{service}</b> con {biz}. Vence alrededor del <b>{due_str}</b>."
            f"<br/><br/>Responda a este correo o llámenos para reservar."
        )
    else:
        sms_body = (
            f"Hi {name}, it's {biz}. Your {service} is due around {due_str}. "
            f"Reply to schedule your next visit."
        )
        subject = f"Time for your next {service}"
        html_message = (
            f"Hi {name},<br/><br/>It's time to schedule your next <b>{service}</b> "
            f"with {biz}. It's due around <b>{due_str}</b>."
            f"<br/><br/>Reply to this email or call us to book."
        )

    result = {"sms": None, "email": None}
    if s.get("customer_phone"):
        try:
            r = await send_sms(tenant_id=s["tenant_id"], to=s["customer_phone"], body=sms_body)
            result["sms"] = r.get("status")
        except Exception as e:
            logger.warning("repeat sms failed: %s", e)
    if s.get("customer_email"):
        try:
            html = followup_html(business=biz, message=html_message)
            result["email"] = await send_email(to=s["customer_email"], subject=subject, html=html, from_name=biz)
        except Exception as e:
            logger.warning("repeat email failed: %s", e)

    await db.repeat_schedules.update_one(
        {"id": s["id"]},
        {"$set": {"last_reminded_at": _now_iso()}},
    )
    return result


async def run_repeat_reminders() -> dict:
    """Cron entrypoint. Idempotent: only send once per cycle."""
    db = get_db()
    now = datetime.now(timezone.utc)
    sent = 0
    advanced = 0
    schedules = await db.repeat_schedules.find({"status": "active"}, {"_id": 0}).to_list(5000)
    for s in schedules:
        try:
            due = _parse_iso(s["next_due_at"])
            lead_days = int(s.get("reminder_days_before") or 14)
            send_window_start = due - timedelta(days=lead_days)
            last_rem = s.get("last_reminded_at")
            last_rem_dt = _parse_iso(last_rem) if last_rem else None
            # Send if we're in the reminder window and haven't reminded for this cycle.
            if send_window_start <= now <= due:
                if not last_rem_dt or last_rem_dt < send_window_start:
                    await _send_reminder(s)
                    sent += 1
            # Advance when past due.
            if now > due:
                months = _cadence_months(s["cadence"], s.get("interval_months"))
                new_due = _add_months(due, months)
                while new_due < now:  # catch up if many cycles missed
                    new_due = _add_months(new_due, months)
                await db.repeat_schedules.update_one(
                    {"id": s["id"]}, {"$set": {"next_due_at": new_due.isoformat()}}
                )
                advanced += 1
        except Exception as e:
            logger.exception("repeat tick failed id=%s: %s", s.get("id"), e)
    return {"sent": sent, "advanced": advanced, "scanned": len(schedules)}
