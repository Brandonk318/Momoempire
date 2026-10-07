"""Portable LLM wrapper for Cloudflare / Oracle / Fly / Render deployments.

Why: existing callsites use `emergentintegrations.llm.chat.LlmChat` which is
Emergent-platform-locked. This shim provides the SAME interface backed by the
native OpenAI/Anthropic/Google SDKs when `EMERGENT_LLM_KEY` is absent, so no
callsite needs to change.

Usage (unchanged across the codebase):
    from llm_portable import LlmChat, UserMessage
    chat = LlmChat(api_key=key, session_id="x", system_message="...") \
                .with_model("openai", "gpt-6-sol")
    reply = await chat.send_message(UserMessage(text="hello"))

Resolution order:
    1. If `EMERGENT_LLM_KEY` is set AND `emergentintegrations` imports, use it.
    2. Else if `OPENAI_API_KEY` is set, use the openai async SDK directly.
    3. Else raise so the deterministic fallback in each callsite kicks in.
"""
from __future__ import annotations
import os
from dataclasses import dataclass
from typing import Optional

# Try to resolve the Emergent SDK once at import time.
_EI_AVAILABLE = False
try:
    if os.environ.get("EMERGENT_LLM_KEY"):
        from emergentintegrations.llm.chat import LlmChat as _EILlmChat  # noqa: F401
        from emergentintegrations.llm.chat import UserMessage as _EIUserMessage  # noqa: F401
        _EI_AVAILABLE = True
except Exception:
    _EI_AVAILABLE = False


@dataclass
class UserMessage:
    text: str


# --- Native-SDK fallback path (OpenAI only — Claude/Gemini can be added later). ---
_MODEL_ALIAS = {
    # Emergent-advertised names → closest native OpenAI model id.
    "gpt-6-sol": "gpt-4o-mini",
    "gpt-6": "gpt-4o",
    "gpt-5.5": "gpt-4o-mini",
    "gpt-5.6-terra": "gpt-4o",
}


class _NativeOpenAIChat:
    def __init__(self, system_message: str, session_id: str):
        self._system = system_message or ""
        self._session_id = session_id
        self._provider = "openai"
        self._model = "gpt-4o-mini"

    def with_model(self, provider: str, model: str) -> "_NativeOpenAIChat":
        self._provider = provider
        self._model = _MODEL_ALIAS.get(model, model)
        return self

    async def send_message(self, msg: UserMessage) -> str:
        key = os.environ.get("OPENAI_API_KEY")
        if not key:
            raise RuntimeError("OPENAI_API_KEY missing and EMERGENT_LLM_KEY absent")
        # Lazy import so Workers/Cloudflare builds without the pkg still boot.
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=key)
        resp = await client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": self._system},
                {"role": "user", "content": msg.text},
            ],
        )
        return resp.choices[0].message.content or ""


class LlmChat:
    """Drop-in replacement. Picks Emergent SDK or native OpenAI at construction."""

    def __init__(self, api_key: str, session_id: str, system_message: str):
        self._api_key = api_key
        self._session_id = session_id
        self._system_message = system_message
        self._impl: Optional[object] = None
        # Re-resolve Emergent at construction (import-time env may have been empty).
        emergent_ok = _EI_AVAILABLE
        if not emergent_ok and os.environ.get("EMERGENT_LLM_KEY"):
            try:
                from emergentintegrations.llm.chat import LlmChat as _E, UserMessage as _U  # noqa: F401
                emergent_ok = True
            except Exception:
                emergent_ok = False
        if emergent_ok and api_key and api_key.startswith("sk-emergent"):
            from emergentintegrations.llm.chat import LlmChat as _EILlmChat2
            self._impl = _EILlmChat2(
                api_key=api_key, session_id=session_id, system_message=system_message
            )
            self._uses_emergent = True
        else:
            self._impl = _NativeOpenAIChat(
                system_message=system_message, session_id=session_id
            )
            self._uses_emergent = False

    def with_model(self, provider: str, model: str) -> "LlmChat":
        self._impl.with_model(provider, model)
        return self

    async def send_message(self, msg) -> str:
        if self._uses_emergent and isinstance(msg, UserMessage):
            from emergentintegrations.llm.chat import UserMessage as _EIUM
            return await self._impl.send_message(_EIUM(text=msg.text))  # type: ignore
        return await self._impl.send_message(msg)


def using_emergent() -> bool:
    """Health-probe helper."""
    if _EI_AVAILABLE:
        return True
    if os.environ.get("EMERGENT_LLM_KEY"):
        try:
            import emergentintegrations.llm.chat  # noqa: F401
            return True
        except Exception:
            return False
    return False
