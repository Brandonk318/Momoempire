"""Discount policy (beat-the-quote) + Realtime voice token endpoint."""
import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import httpx
from db import get_db
from security import require_tenant_owner_or_admin, require_tenant_user
from models import _now_iso

router = APIRouter(prefix="/sales", tags=["sales-extra"])


# ---------- Beat-the-quote guardrail ----------
class DiscountPolicyIn(BaseModel):
    enabled: bool = False
    max_percent_off: float = 10.0    # cap discount AI can offer
    max_absolute_cents: int = 5000   # cap dollar discount
    phrase: str = "I can offer a one-time ${amount} off if we book today."
    conditions: str = "Only when customer explicitly mentions a competing quote."


@router.get("/discount-policy")
async def get_policy(user: dict = Depends(require_tenant_user)):
    db = get_db()
    doc = await db.discount_policies.find_one({"tenant_id": user["tenant_id"]}, {"_id": 0})
    return doc or {
        "tenant_id": user["tenant_id"], "enabled": False, "max_percent_off": 10.0,
        "max_absolute_cents": 5000, "phrase": "I can offer a one-time ${amount} off if we book today.",
        "conditions": "Only when customer explicitly mentions a competing quote.",
    }


@router.put("/discount-policy")
async def set_policy(data: DiscountPolicyIn, user: dict = Depends(require_tenant_owner_or_admin)):
    db = get_db()
    patch = data.model_dump()
    await db.discount_policies.update_one(
        {"tenant_id": user["tenant_id"]},
        {"$set": {**patch, "tenant_id": user["tenant_id"], "updated_at": _now_iso()}},
        upsert=True,
    )
    return await db.discount_policies.find_one({"tenant_id": user["tenant_id"]}, {"_id": 0})


# ---------- Realtime voice: ephemeral token ----------
# Uses OpenAI Realtime API directly (requires OPENAI_API_KEY). If not set we return a
# graceful "demo" response so the frontend can fall back to text / Web-Speech mode.
realtime = APIRouter(prefix="/realtime", tags=["realtime"])


@realtime.post("/token")
async def realtime_token(user: dict = Depends(require_tenant_user)):
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return {"available": False, "reason": "OPENAI_API_KEY not configured",
                "fallback": "web-speech"}
    model = os.environ.get("OPENAI_REALTIME_MODEL", "gpt-4o-realtime-preview-2024-12-17")
    voice = os.environ.get("OPENAI_REALTIME_VOICE", "alloy")
    try:
        async with httpx.AsyncClient(timeout=15) as hc:
            r = await hc.post(
                "https://api.openai.com/v1/realtime/sessions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": model, "voice": voice},
            )
        if r.status_code >= 400:
            return {"available": False, "reason": r.text[:200], "fallback": "web-speech"}
        data = r.json() or {}
        return {
            "available": True,
            "client_secret": (data.get("client_secret") or {}).get("value"),
            "model": model,
            "voice": voice,
            "expires_at": (data.get("client_secret") or {}).get("expires_at"),
        }
    except Exception as e:
        return {"available": False, "reason": str(e), "fallback": "web-speech"}
