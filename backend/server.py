"""AI Office Platform — Phase 1 backend."""
from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
from fastapi import FastAPI, APIRouter, Request
from starlette.middleware.cors import CORSMiddleware

from db import get_db, close_db
from seed_data import run_all_seeds
from routers.auth import router as auth_router
from routers.industries import router as industries_router
from routers.countries import router as countries_router
from routers.tenants import router as tenants_router
from routers.admin import router as admin_router
from routers.advisor import router as advisor_router
from routers.public import router as public_router
from routers.payments import router as payments_router, stripe_webhook as _stripe_wh

app = FastAPI(title="AI Office Platform API")
api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {
        "service": "ai-office-platform",
        "version": "0.1.0",
        "status": "ok",
    }


@api.get("/health")
async def health():
    db = get_db()
    try:
        await db.command("ping")
        return {"status": "ok", "db": "ok"}
    except Exception as e:
        return {"status": "degraded", "detail": str(e)}


# Register feature routers
api.include_router(auth_router)
api.include_router(industries_router)
api.include_router(countries_router)
api.include_router(tenants_router)
api.include_router(admin_router)
api.include_router(advisor_router)
api.include_router(public_router)
api.include_router(payments_router)
# Stripe is registered to deliver webhooks to /api/stripe/webhook (top-level).
api.add_api_route("/stripe/webhook", _stripe_wh, methods=["POST"], include_in_schema=False)

app.include_router(api)


# Permissive CORS so preview + custom domains work; cookies use SameSite=None.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("aio")


@app.on_event("startup")
async def startup():
    try:
        await run_all_seeds()
        log.info("Seed complete")
    except Exception as e:
        log.exception("Seed failed: %s", e)


@app.on_event("shutdown")
async def shutdown():
    await close_db()
