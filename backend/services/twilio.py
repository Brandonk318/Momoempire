"""Twilio adapter: outbound SMS send + inbound call/SMS webhook handlers.

Credentials are read per-tenant from `integrations` collection (demo-safe) and
fall back to environment variables. Graceful degradation: when no SID/token is
set we log and return a stub id so the demo flow still works.
"""
import os
import logging
from typing import Optional
from db import get_db

logger = logging.getLogger("twilio")


async def _tenant_twilio_cfg(tenant_id: str) -> dict:
    db = get_db()
    row = await db.integrations.find_one(
        {"tenant_id": tenant_id, "key": "twilio"}, {"_id": 0, "config": 1},
    )
    cfg = (row or {}).get("config", {}) or {}
    return {
        "account_sid": cfg.get("account_sid") or os.environ.get("TWILIO_ACCOUNT_SID") or "",
        "auth_token": cfg.get("auth_token") or os.environ.get("TWILIO_AUTH_TOKEN") or "",
        "messaging_sid": cfg.get("messaging_sid") or os.environ.get("TWILIO_MESSAGING_SID") or "",
        "from_number": cfg.get("from_number") or os.environ.get("TWILIO_FROM_NUMBER") or "",
    }


async def send_sms(*, tenant_id: str, to: str, body: str) -> dict:
    """Send an SMS. Returns {sid, status, demo}. Degrades to log when creds missing."""
    cfg = await _tenant_twilio_cfg(tenant_id)
    if not (cfg["account_sid"] and cfg["auth_token"] and (cfg["from_number"] or cfg["messaging_sid"])):
        logger.info("[TWILIO demo-send tenant=%s to=%s] %s", tenant_id, to, body)
        return {"sid": f"SM_demo_{tenant_id[:6]}", "status": "demo", "demo": True}
    try:
        from twilio.rest import Client  # noqa: F401
    except Exception:
        logger.info("[TWILIO sdk-missing tenant=%s to=%s] %s", tenant_id, to, body)
        return {"sid": f"SM_demo_{tenant_id[:6]}", "status": "sdk-missing", "demo": True}
    try:
        from twilio.rest import Client
        client = Client(cfg["account_sid"], cfg["auth_token"])
        kwargs = {"to": to, "body": body}
        if cfg["messaging_sid"]:
            kwargs["messaging_service_sid"] = cfg["messaging_sid"]
        else:
            kwargs["from_"] = cfg["from_number"]
        msg = client.messages.create(**kwargs)
        return {"sid": msg.sid, "status": msg.status or "queued", "demo": False}
    except Exception as e:
        logger.exception("Twilio send failed: %s", e)
        return {"sid": None, "status": "error", "error": str(e), "demo": False}


def twiml_voice_response(*, tenant_name: str, gather_url: str, greeting: str) -> str:
    """Returns the raw TwiML the AI uses to answer an inbound call and gather speech."""
    g = (greeting or f"Hi, thanks for calling {tenant_name}. How can I help?").replace("<", " ")
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<Response>'
        f'<Gather input="speech" action="{gather_url}" method="POST" speechTimeout="auto">'
        f'<Say voice="Polly.Joanna">{g}</Say>'
        '</Gather>'
        f'<Say voice="Polly.Joanna">I didn\'t catch that. Please call back and we\'ll help right away.</Say>'
        '</Response>'
    )


def twiml_say_and_gather(*, text: str, gather_url: str, end: bool = False) -> str:
    safe = (text or "").replace("<", " ").replace("&", " and ")[:1000]
    if end:
        return f'<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">{safe}</Say><Hangup/></Response>'
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<Response>'
        f'<Say voice="Polly.Joanna">{safe}</Say>'
        f'<Gather input="speech" action="{gather_url}" method="POST" speechTimeout="auto"/>'
        '<Say voice="Polly.Joanna">Still with us? Thanks — goodbye.</Say>'
        '<Hangup/>'
        '</Response>'
    )
