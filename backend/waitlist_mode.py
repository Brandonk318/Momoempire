"""Waitlist-only deploy mode (EMP-WL-002).

WAITLIST_ONLY=true makes `server:app` a minimal app that serves ONLY:
    GET  /api/health          -> {"status": "ok" | "degraded"}  (no details)
    POST /api/public/waitlist -> the existing waitlist handler (routers/marketing.py)
Everything else (/docs, /redoc, /openapi.json, /api/auth/*, /api/admin/*, other /api/public/*,
/api/cron/*, webhooks, ...) is 404. The full app's startup hook (admin/industry/plan seeding,
index creation) is NOT run: it is attached to the full app object, which uvicorn never serves in
this mode. Crons are HTTP-triggered (/api/cron/*), so they 404 here; there is no in-process scheduler.

Default (unset/false): server.py behaves exactly as before.
"""
import logging
import os

from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware

log = logging.getLogger("waitlist-mode")


def waitlist_only_enabled() -> bool:
    return (os.environ.get("WAITLIST_ONLY") or "").strip().lower() in ("1", "true", "yes", "on")


def _cors_kwargs_from(full_app: FastAPI) -> dict | None:
    """Reuse whatever CORS config server.py built (inline today, deploy_security after PR #10)."""
    for m in getattr(full_app, "user_middleware", []):
        if m.cls is CORSMiddleware:
            kw = getattr(m, "kwargs", None)
            if kw is None:
                kw = getattr(m, "options", None)
            return dict(kw or {})
    return None


def build_waitlist_app(full_app: FastAPI) -> FastAPI:
    from db import get_db, close_db
    from routers import marketing

    app = FastAPI(title="Waitlist", docs_url=None, redoc_url=None, openapi_url=None)
    api = APIRouter(prefix="/api")

    @api.get("/health")
    async def health():
        try:
            await get_db().command("ping")
            return {"status": "ok"}
        except Exception:
            log.exception("health: database ping failed")
            return {"status": "degraded"}

    api.add_api_route("/public/waitlist", marketing.waitlist, methods=["POST"])
    app.include_router(api)

    cors = _cors_kwargs_from(full_app)
    if cors is not None:
        app.add_middleware(CORSMiddleware, **cors)
    else:
        log.error("WAITLIST_ONLY: no CORS middleware found on the full app; cross-origin calls will fail")

    @app.on_event("shutdown")
    async def _shutdown():
        await close_db()

    log.warning("WAITLIST_ONLY is on: serving only /api/health and POST /api/public/waitlist")
    return app
