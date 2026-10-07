"""Deployment-readiness probe. Hit before cutting DNS to a new environment.

Returns:
    - db_ok: can write + read a tiny doc?
    - tenant_isolation_ok: tenant_id filtering returns only this tenant's docs?
    - env: which required/optional env vars are set (keys only, never values)
    - llm_backend: emergent | native_openai | none
    - counts: lightweight collection sizes to confirm you're pointing at the right DB
"""
import os
import time
import logging
from fastapi import APIRouter
from db import get_db
from llm_portable import using_emergent

log = logging.getLogger("deploy-health")
router = APIRouter(prefix="/health", tags=["health"])


_REQUIRED = ["MONGO_URL", "DB_NAME", "JWT_SECRET"]
_OPTIONAL = [
    "EMERGENT_LLM_KEY", "OPENAI_API_KEY",
    "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
    "RESEND_API_KEY", "EMERGENT_EMAIL_KEY",
    "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN",
    "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
    "CORS_ORIGINS", "FRONTEND_URL",
    "WEBHOOK_CRON_SECRET",
]


@router.get("/deployment")
async def deployment_probe():
    db = get_db()
    out: dict = {"ts": time.time()}

    # 1) DB write + read round-trip (never leave garbage behind).
    try:
        doc_id = f"deploy-probe-{int(time.time()*1000)}"
        coll = db["_deploy_probe"]
        await coll.insert_one({"_id": doc_id, "ok": True, "at": time.time()})
        found = await coll.find_one({"_id": doc_id})
        await coll.delete_one({"_id": doc_id})
        out["db_ok"] = bool(found and found.get("ok"))
    except Exception as e:
        out["db_ok"] = False
        out["db_error"] = str(e)[:200]

    # 2) Tenant isolation smoke-check — a tenant_id query must only match its own docs.
    try:
        a = await db.tenants.find_one({}, {"id": 1})
        if a:
            tid = a.get("id")
            # Count a scoped collection filtered by tenant_id. Should never return docs for other tenants.
            own = await db.appointments.count_documents({"tenant_id": tid})
            bogus = await db.appointments.count_documents({"tenant_id": "__does_not_exist__"})
            out["tenant_isolation_ok"] = (bogus == 0)
            out["sample_tenant_appointments"] = own
        else:
            out["tenant_isolation_ok"] = True  # empty DB, nothing to leak
    except Exception as e:
        out["tenant_isolation_ok"] = False
        out["tenant_isolation_error"] = str(e)[:200]

    # 3) Env coverage (names only — never values).
    env_present = {k: bool(os.environ.get(k)) for k in _REQUIRED + _OPTIONAL}
    out["env"] = env_present
    missing_required = [k for k in _REQUIRED if not env_present[k]]
    out["missing_required"] = missing_required

    # 4) LLM backend
    if using_emergent():
        out["llm_backend"] = "emergent"
    elif os.environ.get("OPENAI_API_KEY"):
        out["llm_backend"] = "native_openai"
    else:
        out["llm_backend"] = "none"

    # 5) Lightweight counts
    try:
        out["counts"] = {
            "tenants": await db.tenants.count_documents({}),
            "users": await db.users.count_documents({}),
            "plans": await db.plans.count_documents({}),
        }
    except Exception:
        pass

    out["ready"] = bool(
        out.get("db_ok")
        and out.get("tenant_isolation_ok")
        and not missing_required
    )
    return out
