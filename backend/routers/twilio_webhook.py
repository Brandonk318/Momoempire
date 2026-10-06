"""Twilio webhook router — real inbound call & SMS → runs through the AI receptionist pipeline."""
import os
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import Response
from db import get_db
from models import _uuid, _now_iso
from models_phase2 import Conversation, ConvMessage
from ai_receptionist import receptionist_reply
from services.twilio import twiml_voice_response, twiml_say_and_gather
from routers.usage import record_usage, usage_capped

router = APIRouter(prefix="/twilio", tags=["twilio-webhook"])


async def _resolve_tenant(to_number: str) -> dict | None:
    """Match the dialed number to a tenant via its phone_numbers or integrations.config."""
    db = get_db()
    t = await db.tenants.find_one({"human_fallback_number": to_number}, {"_id": 0})
    if t:
        return t
    row = await db.integrations.find_one({"key": "twilio", "config.from_number": to_number}, {"_id": 0, "tenant_id": 1})
    if row:
        return await db.tenants.find_one({"id": row["tenant_id"]}, {"_id": 0})
    return None


def _public_base_url() -> str:
    return (os.environ.get("PUBLIC_BACKEND_URL") or "").rstrip("/")


@router.post("/voice", include_in_schema=False)
async def voice_incoming(request: Request):
    """Twilio hits this when an inbound call connects. Returns TwiML <Gather>."""
    form = await request.form()
    to = form.get("To") or ""
    from_number = form.get("From") or ""
    call_sid = form.get("CallSid") or ""
    tenant = await _resolve_tenant(to)
    if not tenant:
        return Response(twiml_say_and_gather(text="This line is not configured. Please try again later.", gather_url="", end=True),
                        media_type="application/xml")
    db = get_db()
    # Create a conversation to attach messages
    conv = Conversation(tenant_id=tenant["id"], channel="call", caller_phone=from_number, is_simulation=False)
    doc = conv.model_dump()
    doc["twilio_call_sid"] = call_sid
    await db.conversations.insert_one(doc)
    greeting = (tenant.get("ai_employee") or {}).get("greeting") or f"Hi, thanks for calling {tenant.get('name')}. How can I help?"
    await db.conv_messages.insert_one(ConvMessage(conversation_id=doc["id"], tenant_id=tenant["id"], role="ai", content=greeting).model_dump())
    await record_usage(tenant["id"], "calls", 1, {"conversation_id": doc["id"], "twilio_call_sid": call_sid})
    base = _public_base_url()
    gather_url = f"{base}/api/twilio/voice-turn?conv_id={doc['id']}"
    return Response(twiml_voice_response(tenant_name=tenant.get("name", ""), gather_url=gather_url, greeting=greeting),
                    media_type="application/xml")


@router.post("/voice-turn", include_in_schema=False)
async def voice_turn(request: Request, conv_id: str):
    form = await request.form()
    speech = (form.get("SpeechResult") or "").strip()
    db = get_db()
    conv = await db.conversations.find_one({"id": conv_id}, {"_id": 0})
    if not conv:
        raise HTTPException(404, "conversation missing")

    if speech:
        await db.conv_messages.insert_one(ConvMessage(conversation_id=conv_id, tenant_id=conv["tenant_id"],
                                                     role="caller", content=speech).model_dump())

    tenant = await db.tenants.find_one({"id": conv["tenant_id"]}, {"_id": 0})
    industry = await db.industries.find_one({"slug": tenant.get("industry_slug")}, {"_id": 0}) if tenant and tenant.get("industry_slug") else None
    services = await db.services.find({"tenant_id": conv["tenant_id"]}, {"_id": 0}).to_list(200)
    knowledge = await db.knowledge.find({"tenant_id": conv["tenant_id"]}, {"_id": 0}).to_list(200)
    upsells = await db.upsells.find({"tenant_id": conv["tenant_id"]}, {"_id": 0}).to_list(100)
    policy = await db.discount_policies.find_one({"tenant_id": conv["tenant_id"]}, {"_id": 0})
    history = await db.conv_messages.find({"conversation_id": conv_id}, {"_id": 0}).sort("created_at", 1).to_list(50)
    capped = await usage_capped(conv["tenant_id"], "ai_interactions")

    ai = await receptionist_reply(tenant or {}, industry, services, knowledge, history, speech or "",
                                  usage_capped=capped, upsells=upsells, discount_policy=policy)
    reply = ai.get("reply", "Sorry, I didn't catch that.")
    await db.conv_messages.insert_one(ConvMessage(conversation_id=conv_id, tenant_id=conv["tenant_id"],
                                                 role="ai", content=reply, action=ai.get("action")).model_dump())
    await record_usage(conv["tenant_id"], "ai_interactions", 1, {"conversation_id": conv_id})

    base = _public_base_url()
    end = bool(ai.get("end")) or (ai.get("action") or {}).get("type") in {"end_call"}
    if end:
        await db.conversations.update_one({"id": conv_id}, {"$set": {"status": "completed", "ended_at": _now_iso()}})
    gather_url = f"{base}/api/twilio/voice-turn?conv_id={conv_id}"
    return Response(twiml_say_and_gather(text=reply, gather_url=gather_url, end=end), media_type="application/xml")


@router.post("/sms", include_in_schema=False)
async def sms_incoming(request: Request):
    form = await request.form()
    from_num = form.get("From") or ""
    to_num = form.get("To") or ""
    body = (form.get("Body") or "").strip()
    tenant = await _resolve_tenant(to_num)
    if not tenant:
        return Response('<?xml version="1.0" encoding="UTF-8"?><Response/>', media_type="application/xml")
    db = get_db()
    thread = await db.conversations.find_one({"tenant_id": tenant["id"], "channel": "sms", "caller_phone": from_num})
    if not thread:
        c = Conversation(tenant_id=tenant["id"], channel="sms", caller_phone=from_num, is_simulation=False)
        thread = c.model_dump()
        await db.conversations.insert_one(thread)
    await db.conv_messages.insert_one(ConvMessage(conversation_id=thread["id"], tenant_id=tenant["id"],
                                                 role="caller", content=body).model_dump())
    industry = await db.industries.find_one({"slug": tenant.get("industry_slug")}, {"_id": 0}) if tenant.get("industry_slug") else None
    services = await db.services.find({"tenant_id": tenant["id"]}, {"_id": 0}).to_list(200)
    knowledge = await db.knowledge.find({"tenant_id": tenant["id"]}, {"_id": 0}).to_list(200)
    upsells = await db.upsells.find({"tenant_id": tenant["id"]}, {"_id": 0}).to_list(100)
    policy = await db.discount_policies.find_one({"tenant_id": tenant["id"]}, {"_id": 0})
    history = await db.conv_messages.find({"conversation_id": thread["id"]}, {"_id": 0}).sort("created_at", 1).to_list(50)
    ai = await receptionist_reply(tenant, industry, services, knowledge, history, body, upsells=upsells, discount_policy=policy)
    reply = (ai.get("reply") or "").replace("<", " ")[:1500]
    await db.conv_messages.insert_one(ConvMessage(conversation_id=thread["id"], tenant_id=tenant["id"],
                                                 role="ai", content=reply, action=ai.get("action")).model_dump())
    await record_usage(tenant["id"], "sms", 2, {"from": from_num})
    await record_usage(tenant["id"], "ai_interactions", 1)
    twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{reply}</Message></Response>'
    return Response(twiml, media_type="application/xml")


@router.post("/missed-call", include_in_schema=False)
async def missed_call(request: Request):
    """Status-callback webhook — if a call ended as no-answer/failed, send the automation textback."""
    form = await request.form()
    status = form.get("CallStatus") or ""
    from_num = form.get("From") or ""
    to_num = form.get("To") or ""
    if status not in {"no-answer", "busy", "failed", "canceled"}:
        return {"ignored": True}
    tenant = await _resolve_tenant(to_num)
    if not tenant or not from_num:
        return {"ignored": True}
    db = get_db()
    autom = await db.automation_settings.find_one({"tenant_id": tenant["id"]}, {"_id": 0}) or {}
    if not autom.get("missed_call_textback", True):
        return {"ignored": True}
    msg = autom.get("missed_call_textback_message") or "Sorry we missed you! Reply here and we'll get right back to you."
    from services.twilio import send_sms
    res = await send_sms(tenant_id=tenant["id"], to=from_num, body=msg)
    await record_usage(tenant["id"], "sms", 1, {"missed_call": True, "to": from_num})
    return {"status": status, "textback": res}
