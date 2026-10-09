"""Public demo + waitlist: no-auth endpoints used by the marketing homepage.

- POST /api/public/demo/start → opens a 10-turn demo session with a mock tenant
  shaped by a chosen industry preset. No DB tenant touched.
- POST /api/public/demo/turn → caller utterance → AI reply. Rate-limited by IP.
- POST /api/public/waitlist → capture email/name/business/interest for early access.
"""
import os
import time
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from typing import Literal, Optional
from db import get_db
from models import _uuid, _now_iso
from ai_receptionist import receptionist_reply

router = APIRouter(prefix="/public", tags=["marketing"])

# In-memory demo sessions: {session_id: {industry, history:[{role,content}], created_at, turns}}
_SESSIONS: dict[str, dict] = {}
_IP_RATE: dict[str, list[float]] = {}
_MAX_TURNS = 10
_RATE_WINDOW = 60.0
_RATE_LIMIT = 20


def _ip_ok(request: Request) -> bool:
    ip = (request.client.host if request.client else "unknown") or "unknown"
    now = time.time()
    hits = [t for t in _IP_RATE.get(ip, []) if now - t < _RATE_WINDOW]
    if len(hits) >= _RATE_LIMIT:
        return False
    hits.append(now)
    _IP_RATE[ip] = hits
    return True


INDUSTRY_PRESETS = {
    "hvac": {
        "name": "Comfort Pros HVAC",
        "industry_slug": "hvac",
        "ai_employee": {"name": "Alex", "greeting": "Hi, Comfort Pros HVAC — how can I help?"},
        "greeting_es": "Hola, Comfort Pros HVAC — ¿cómo le puedo ayudar?",
        "services": [
            {"name": "AC repair", "price": 189, "duration_minutes": 90},
            {"name": "Furnace tune-up", "price": 129, "duration_minutes": 60},
            {"name": "AC install estimate", "price": 0, "duration_minutes": 45},
        ],
        "knowledge": [
            {"question": "Hours", "answer": "Mon-Sat 7am-7pm. Emergency 24/7."},
            {"question": "Service area", "answer": "Austin and surrounding 30 miles."},
        ],
    },
    "dental": {
        "name": "Bright Smiles Dental",
        "industry_slug": "dental",
        "ai_employee": {"name": "Mia", "greeting": "Thanks for calling Bright Smiles Dental, how can I help?"},
        "greeting_es": "Gracias por llamar a Bright Smiles Dental, ¿cómo le puedo ayudar?",
        "services": [
            {"name": "Cleaning", "price": 120, "duration_minutes": 45},
            {"name": "New patient exam", "price": 95, "duration_minutes": 60},
            {"name": "Teeth whitening", "price": 299, "duration_minutes": 60},
        ],
        "knowledge": [
            {"question": "Insurance", "answer": "We accept Delta Dental, Cigna, Aetna, and most PPOs."},
            {"question": "New patient?", "answer": "Welcome! First visit includes exam, x-rays, and cleaning."},
        ],
    },
    "legal": {
        "name": "Harbor Law Offices",
        "industry_slug": "legal",
        "ai_employee": {"name": "Jordan", "greeting": "Harbor Law Offices — this is Jordan, how can I help?"},
        "greeting_es": "Harbor Law Offices — habla Jordan, ¿en qué le puedo ayudar?",
        "services": [
            {"name": "Initial consult", "price": 0, "duration_minutes": 30},
            {"name": "Estate planning package", "price": 1500, "duration_minutes": 90},
        ],
        "knowledge": [
            {"question": "Practice areas", "answer": "Estate planning, small business formation, real estate."},
            {"question": "Free consult?", "answer": "First 30 minutes are complimentary."},
        ],
    },
    "salon": {
        "name": "Lumen Hair Studio",
        "industry_slug": "salon",
        "ai_employee": {"name": "Sam", "greeting": "Lumen Hair Studio — how can I help you glow today?"},
        "greeting_es": "Lumen Hair Studio — ¿cómo le ayudamos a brillar hoy?",
        "services": [
            {"name": "Women's cut & style", "price": 85, "duration_minutes": 60},
            {"name": "Balayage", "price": 220, "duration_minutes": 180},
            {"name": "Deep conditioning", "price": 45, "duration_minutes": 30},
        ],
        "knowledge": [
            {"question": "First-timer?", "answer": "Welcome! Mention it when booking and we'll give you 10% off."},
            {"question": "Walk-ins?", "answer": "Yes, when stylists have openings — booking recommended."},
        ],
    },
}


class DemoStartIn(BaseModel):
    industry: str = "hvac"
    lang: str = "en"


class DemoTurnIn(BaseModel):
    session_id: str
    text: str


@router.post("/demo/start")
async def demo_start(data: DemoStartIn, request: Request):
    if not _ip_ok(request):
        raise HTTPException(429, "Too many demo sessions — slow down a bit.")
    preset = INDUSTRY_PRESETS.get((data.industry or "hvac").lower()) or INDUSTRY_PRESETS["hvac"]
    sid = _uuid()
    lang = (data.lang or "en").lower()
    greeting = preset.get("greeting_es") if lang.startswith("es") else preset["ai_employee"]["greeting"]
    _SESSIONS[sid] = {
        "preset": preset,
        "lang": lang,
        "history": [{"role": "ai", "content": greeting}],
        "turns": 0,
        "created_at": time.time(),
    }
    # garbage collect old sessions (>30min)
    now = time.time()
    for k in list(_SESSIONS.keys()):
        if now - _SESSIONS[k]["created_at"] > 1800:
            _SESSIONS.pop(k, None)
    return {"session_id": sid, "greeting": greeting, "business": preset["name"],
            "ai_name": preset["ai_employee"]["name"], "max_turns": _MAX_TURNS, "lang": lang}


@router.post("/demo/turn")
async def demo_turn(data: DemoTurnIn, request: Request):
    if not _ip_ok(request):
        raise HTTPException(429, "Slow down a bit.")
    sess = _SESSIONS.get(data.session_id)
    if not sess:
        raise HTTPException(404, "Demo session expired — start a new one.")
    is_es = (sess.get("lang") or "en").startswith("es")
    if sess["turns"] >= _MAX_TURNS:
        return {"reply": "Fin de la demo. Comience la prueba gratis para seguir conversando — su oficina AI real le espera." if is_es else
                         "That's a wrap on the demo. Start a free trial to keep chatting — your real AI office waits.", "ended": True}
    text = (data.text or "").strip()
    if not text:
        raise HTTPException(400, "text required")
    sess["history"].append({"role": "caller", "content": text})
    try:
        ai = await receptionist_reply(
            tenant={"name": sess["preset"]["name"], "industry_slug": sess["preset"]["industry_slug"],
                    "ai_employee": sess["preset"]["ai_employee"]},
            industry=None,
            services=sess["preset"]["services"],
            knowledge=sess["preset"]["knowledge"],
            history=sess["history"][-20:],
            caller_utterance=text,
            upsells=[],
            lang=sess.get("lang", "en"),
        )
    except Exception as e:
        return {"reply": f"Hmm, I had a glitch there — try again. ({e})", "ended": False}
    reply = ai.get("reply") or ("Perdón, ¿podría repetir?" if is_es else "Sorry, could you repeat that?")
    sess["history"].append({"role": "ai", "content": reply})
    sess["turns"] += 1
    return {"reply": reply, "turns_used": sess["turns"], "turns_left": _MAX_TURNS - sess["turns"], "ended": False}


# ---------- Waitlist ----------
class WaitlistIn(BaseModel):
    email: EmailStr
    name: Optional[str] = ""
    business_name: Optional[str] = ""
    industry: Optional[str] = ""
    note: Optional[str] = ""
    # Instant-quote estimator capture. One lead source per lead (Brann's rule): estimator leads
    # are source "website form" with source_detail "estimator"; other landing signups unchanged.
    source_detail: Optional[Literal["estimator"]] = None
    estimated_tier: Optional[str] = Field(default=None, max_length=40, pattern=r"^[a-z0-9_]+$")


@router.post("/waitlist")
async def waitlist(data: WaitlistIn, request: Request):
    if not _ip_ok(request):
        raise HTTPException(429, "slow down")
    db = get_db()
    existing = await db.waitlist.find_one({"email": data.email.lower()})
    if existing:
        return {"ok": True, "status": "already-on-list"}
    doc = {
        "id": _uuid(), "email": data.email.lower(), "name": data.name or "",
        "business_name": data.business_name or "", "industry": data.industry or "",
        "note": data.note or "",
        "source": "website form" if data.source_detail == "estimator" else "landing",
        "source_detail": data.source_detail or "",
        "estimated_tier": data.estimated_tier or "",
        "ip": request.client.host if request.client else "",
        "created_at": _now_iso(),
    }
    await db.waitlist.insert_one(doc)
    # Fire-and-forget confirmation email
    try:
        from services.email import send_email, _frame
        html = _frame(
            "<p style='font-size:20px;margin:4px 0 10px'>You're on the list ✨</p>"
            "<p style='color:#555'>Thanks for raising your hand. We'll reach out as soon as your industry seat opens up. "
            "In the meantime, you can also try the free trial anytime at <a href='https://www.aioffice.io/pricing'>our pricing page</a>.</p>",
            app_name="AI Office",
        )
        await send_email(to=data.email, subject="You're on the AI Office waitlist", html=html)
    except Exception as e:
        print(f"[waitlist email] {e}")
    return {"ok": True, "status": "added"}
