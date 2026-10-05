"""AI Business Advisor + knowledge base Q&A powered by GPT 6 Sol."""
import os
from fastapi import APIRouter, Depends, HTTPException
from db import get_db
from models import AdvisorMessageIn, _uuid, _now_iso
from security import require_tenant_user

router = APIRouter(prefix="/advisor", tags=["advisor"])


def _build_system_prompt(tenant: dict, industry: dict | None) -> str:
    parts = [
        "You are the AI Business Advisor inside an AI Office SaaS platform.",
        "Give concise, plainly-worded advice to small-business owners who are NOT technical.",
        "Prefer action steps. Use 2-4 short bullet points when listing. Avoid jargon.",
    ]
    if tenant:
        parts.append(f"The business is '{tenant.get('name','')}' in the {industry.get('name','') if industry else tenant.get('industry_slug','')} industry.")
        if tenant.get("description"):
            parts.append(f"About them: {tenant['description']}")
        if tenant.get("service_areas"):
            parts.append(f"Service area: {', '.join(tenant['service_areas'])}.")
    if industry:
        if industry.get("terminology"):
            parts.append(f"Use this terminology: {industry['terminology']}.")
        if industry.get("ai_personality"):
            parts.append(f"Tone: {industry['ai_personality']}")
    return " ".join(parts)


@router.post("/chat")
async def advisor_chat(data: AdvisorMessageIn, user: dict = Depends(require_tenant_user)):
    db = get_db()
    tenant = await db.tenants.find_one({"id": user["tenant_id"]}, {"_id": 0})
    industry = None
    if tenant and tenant.get("industry_slug"):
        industry = await db.industries.find_one({"slug": tenant["industry_slug"]}, {"_id": 0})

    session_id = data.session_id or _uuid()
    system = _build_system_prompt(tenant, industry)

    # Persist user message
    await db.advisor_messages.insert_one({
        "tenant_id": user["tenant_id"], "session_id": session_id,
        "role": "user", "content": data.message, "created_at": _now_iso(),
    })

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        key = os.environ.get("EMERGENT_LLM_KEY")
        if not key:
            raise RuntimeError("EMERGENT_LLM_KEY missing")
        chat = LlmChat(api_key=key, session_id=session_id, system_message=system).with_model("openai", "gpt-6-sol")
        reply = await chat.send_message(UserMessage(text=data.message))
        reply_text = reply if isinstance(reply, str) else getattr(reply, "content", str(reply))
    except Exception as e:
        reply_text = (
            "I couldn't reach the AI model just now, but here's a quick take based on your setup: "
            "focus on your top 3 revenue services, make sure every lead gets a response within 10 minutes, "
            "and send a review request within 24 hours of a completed job. (Debug: "
            f"{type(e).__name__})"
        )

    await db.advisor_messages.insert_one({
        "tenant_id": user["tenant_id"], "session_id": session_id,
        "role": "assistant", "content": reply_text, "created_at": _now_iso(),
    })

    return {"session_id": session_id, "reply": reply_text}


@router.get("/sessions")
async def list_sessions(user: dict = Depends(require_tenant_user)):
    db = get_db()
    pipeline = [
        {"$match": {"tenant_id": user["tenant_id"]}},
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$session_id", "last": {"$first": "$content"}, "updated_at": {"$first": "$created_at"}}},
        {"$sort": {"updated_at": -1}},
        {"$limit": 20},
    ]
    rows = await db.advisor_messages.aggregate(pipeline).to_list(50)
    return [{"session_id": r["_id"], "last": r["last"], "updated_at": r["updated_at"]} for r in rows]


@router.get("/sessions/{session_id}")
async def get_session(session_id: str, user: dict = Depends(require_tenant_user)):
    db = get_db()
    msgs = await db.advisor_messages.find(
        {"tenant_id": user["tenant_id"], "session_id": session_id},
        {"_id": 0},
    ).sort("created_at", 1).to_list(500)
    return msgs
