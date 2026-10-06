"""AI Receptionist engine — turns tenant config into a trained employee."""
import os
import json
import re
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List


def is_within_hours(hours: Dict[str, str], when: Optional[datetime] = None) -> bool:
    """hours is {mon:'09:00-17:00', tue:...}. Values 'closed' or empty mean closed."""
    if not hours:
        return True  # unknown schedule → assume open
    when = when or datetime.now(timezone.utc)
    day = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"][when.weekday()]
    hrs = (hours.get(day) or "").strip().lower()
    if not hrs or hrs == "closed":
        return False
    try:
        start, end = hrs.split("-")
        sh, sm = [int(x) for x in start.strip().split(":")]
        eh, em = [int(x) for x in end.strip().split(":")]
        cur = when.hour * 60 + when.minute
        return (sh * 60 + sm) <= cur <= (eh * 60 + em)
    except Exception:
        return True


def _bullet_list(items: List[Any], max_items: int = 20) -> str:
    out = []
    for it in (items or [])[:max_items]:
        if isinstance(it, dict):
            if "question" in it and "answer" in it:
                out.append(f"- Q: {it['question']}\n  A: {it['answer']}")
            elif "name" in it:
                extras = []
                if it.get("price"): extras.append(f"${it['price']}")
                if it.get("duration_minutes"): extras.append(f"{it['duration_minutes']}min")
                out.append(f"- {it['name']}" + (f" ({', '.join(extras)})" if extras else ""))
            else:
                out.append("- " + ", ".join(f"{k}: {v}" for k, v in it.items()))
        else:
            out.append(f"- {it}")
    return "\n".join(out) or "(none)"


def build_system_prompt(tenant: dict, industry: dict | None, services: list, knowledge: list,
                        in_hours: bool, usage_capped: bool, upsells: list | None = None) -> str:
    ai = tenant.get("ai_employee") or {}
    name = ai.get("name") or "Alex"
    personality = ai.get("personality") or "Warm, professional, concise."
    greeting = ai.get("greeting") or f"Hi, thanks for calling {tenant.get('name')}. How can I help?"
    emergency = (tenant.get("emergency_procedures") or "").strip()
    policies = (tenant.get("policies") or "").strip()
    fallback = tenant.get("human_fallback_number") or ""
    service_areas = ", ".join(tenant.get("service_areas") or []) or "Not specified"
    emergency_hours = tenant.get("emergency_hours") or ""

    ind_bits = []
    if industry:
        if industry.get("ai_personality"):
            ind_bits.append(f"Industry tone: {industry['ai_personality']}")
        if industry.get("escalation_rules"):
            ind_bits.append("Escalation rules:\n" + _bullet_list(industry["escalation_rules"]))
        if industry.get("emergency_rules"):
            ind_bits.append("Emergency rules:\n" + _bullet_list(industry["emergency_rules"]))
        if industry.get("intake_questions"):
            ind_bits.append("Intake questions to collect:\n" + _bullet_list(industry["intake_questions"]))
        if industry.get("appointment_types"):
            ind_bits.append("Appointment types: " + ", ".join(industry["appointment_types"]))

    svc_block = _bullet_list(services, max_items=30)
    kb_block = _bullet_list([{"question": k.get("question"), "answer": k.get("answer")} for k in (knowledge or [])], max_items=25)

    upsell_block = ""
    if upsells:
        lines = []
        for u in upsells[:20]:
            triggers = ", ".join(u.get("triggers") or []) or "(always)"
            pitch = u.get("pitch") or u.get("description") or u.get("name") or ""
            lines.append(f"- {u.get('name')} — triggers on: {triggers} — say: \"{pitch}\"")
        upsell_block = "\n".join(lines)

    hours_block = ""
    if tenant.get("hours"):
        hours_block = "\n".join([f"- {d}: {h}" for d, h in tenant["hours"].items()])

    status_lines = [f"Current status: {'OPEN for business' if in_hours else 'AFTER HOURS'}."]
    if emergency_hours:
        status_lines.append(f"Emergency hours: {emergency_hours}")
    if usage_capped:
        status_lines.append("USAGE LIMIT REACHED — do NOT disconnect. Offer to take a message or voicemail politely.")

    tools_doc = """
You MUST respond with a single JSON object (no code fences, no prose outside the JSON):

{
  "reply": "<what you say to the caller — concise, speakable>",
  "action": null | {
    "type": "answer" | "book_appointment" | "create_lead" | "take_message" | "take_voicemail" | "escalate_to_human" | "end_call",
    "payload": {
      // for book_appointment: {"customer_name","customer_phone","service_name","start_at" (ISO), "notes"}
      // for create_lead:      {"name","phone","email","notes","source":"call"}
      // for take_message:     {"from_name","from_phone","body"}
      // for take_voicemail:   {"from_name","from_phone","summary"}
      // for escalate_to_human:{"reason","callback_number"}
      // for answer / end_call: {}
    }
  },
  "end": false | true
}

Rules:
- Always ground answers in the business's knowledge, services, policies, and hours.
- If the caller requests booking, collect their name, phone, service, and preferred time, THEN set action.type = "book_appointment".
- If after-hours and the issue isn't an emergency, offer to take a message or voicemail.
- If after-hours and it IS an emergency per the business's emergency rules, follow the emergency procedure and escalate to the human fallback.
- Never leave the caller at a dead end — always offer message, voicemail, callback, or escalation.
- Keep replies short and natural, like a trained employee of this business.
"""

    return f"""You are {name}, the AI receptionist for {tenant.get('name')} — a {industry.get('name') if industry else tenant.get('industry_slug','small')} business.
You speak as a trained employee of THIS business. You are NOT a generic chatbot.
Personality: {personality}
Opening greeting: "{greeting}"

{chr(10).join(status_lines)}

Business services:
{svc_block}

Service area: {service_areas}

Hours:
{hours_block or '(not configured)'}

Business policies:
{policies or '(none specified)'}

Emergency procedures:
{emergency or '(none specified)'}

Human fallback number: {fallback or '(none set — never promise a transfer you cannot make)'}

Knowledge base:
{kb_block}

Upsell suggestions (offer naturally when the caller books or asks about a matching service — do NOT be pushy, mention at most one):
{upsell_block or '(none configured)'}

{chr(10).join(ind_bits)}

{tools_doc}
""".strip()


def parse_ai_response(text: str) -> Dict[str, Any]:
    """Robustly extract the JSON block the model should emit."""
    if not text:
        return {"reply": "I'm sorry, I didn't catch that.", "action": None, "end": False}
    # Strip code fences
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    # Try direct JSON first
    try:
        return json.loads(cleaned)
    except Exception:
        pass
    # Try to find first {...} block
    match = re.search(r"\{[\s\S]*\}", cleaned)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass
    # Fallback: wrap raw text
    return {"reply": cleaned, "action": None, "end": False}


async def receptionist_reply(tenant: dict, industry: dict | None, services: list,
                             knowledge: list, history: list, caller_utterance: str,
                             usage_capped: bool = False, upsells: list | None = None) -> Dict[str, Any]:
    """Core receptionist loop — returns {reply, action, end}."""
    in_hours = is_within_hours(tenant.get("hours") or {})
    system = build_system_prompt(tenant, industry, services, knowledge, in_hours, usage_capped, upsells=upsells)

    key = os.environ.get("EMERGENT_LLM_KEY")
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        if not key:
            raise RuntimeError("EMERGENT_LLM_KEY missing")

        # Build a single turn that includes the compressed transcript so the model has context.
        transcript = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in history[-10:]])
        user_text = f"Transcript so far:\n{transcript or '(this is the first turn — open with your greeting if appropriate)'}\n\nCaller just said: \"{caller_utterance}\"\n\nRespond with the JSON object as instructed."

        chat = LlmChat(api_key=key, session_id=f"recept-{tenant.get('id','?')}", system_message=system).with_model("openai", "gpt-6-sol")
        raw = await chat.send_message(UserMessage(text=user_text))
        text = raw if isinstance(raw, str) else getattr(raw, "content", str(raw))
        return parse_ai_response(text)
    except Exception as e:
        # Deterministic fallback — never leave the caller at a dead end.
        lower = caller_utterance.lower()
        if any(k in lower for k in ["book", "appointment", "schedule"]):
            return {
                "reply": "Happy to book that for you. Can I grab your name, phone, and the service you need?",
                "action": None, "end": False,
            }
        if any(k in lower for k in ["emergency", "urgent", "leak", "flood", "gas", "no heat"]):
            return {
                "reply": "That sounds urgent. I'm connecting you to a technician right now — please stay on the line.",
                "action": {"type": "escalate_to_human", "payload": {"reason": "possible emergency",
                                                                  "callback_number": tenant.get("human_fallback_number", "")}},
                "end": False,
            }
        if usage_capped or not in_hours:
            return {
                "reply": "We're assisting another customer right now. If you'd like, I can take a quick message and we'll call you back shortly.",
                "action": {"type": "take_voicemail", "payload": {"from_name": "", "from_phone": "", "summary": caller_utterance}},
                "end": False,
            }
        return {
            "reply": f"Thanks for calling {tenant.get('name','us')}. I can help with booking, questions about our services, or taking a message. What would you like to do?",
            "action": None, "end": False,
        }
