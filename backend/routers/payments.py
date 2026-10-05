"""Stripe-powered subscription checkout. Phase 1: minimal plan picker."""
import os
import stripe
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
from typing import Optional
from db import get_db
from security import require_tenant_user

router = APIRouter(prefix="/payments", tags=["payments"])

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY") or "sk_test_emergent"
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")


# Server-defined plans (never trust client-provided amounts)
PLANS = {
    "starter": {"amount": 4900, "name": "Starter", "lookup_key": "aio_starter_monthly"},
    "growth":  {"amount": 14900, "name": "Growth",  "lookup_key": "aio_growth_monthly"},
    "scale":   {"amount": 39900, "name": "Scale",   "lookup_key": "aio_scale_monthly"},
}


class CheckoutRequest(BaseModel):
    plan_id: str
    origin_url: str
    quantity: int = Field(1, ge=1, le=5)


@router.get("/plans")
async def list_plans():
    return [{"id": pid, **p} for pid, p in PLANS.items()]


@router.post("/checkout")
async def create_checkout(req: CheckoutRequest, user: dict = Depends(require_tenant_user)):
    db = get_db()
    plan = PLANS.get(req.plan_id)
    if not plan:
        raise HTTPException(400, "Unknown plan")
    try:
        session = stripe.checkout.Session.create(
            line_items=[{"price_data": {
                "currency": "usd",
                "product_data": {"name": f"AI Office — {plan['name']} Plan"},
                "unit_amount": plan["amount"],
                "recurring": {"interval": "month"},
            }, "quantity": req.quantity}],
            mode="subscription",
            success_url=f"{req.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{req.origin_url}/payment/cancel",
            metadata={"tenant_id": user["tenant_id"], "plan_id": req.plan_id, "user_id": user["id"]},
        )
    except Exception as e:
        raise HTTPException(500, f"Stripe error: {e}")

    await db.payment_transactions.insert_one({
        "session_id": session.id,
        "tenant_id": user["tenant_id"],
        "user_id": user["id"],
        "plan_id": req.plan_id,
        "amount": plan["amount"] * req.quantity,
        "currency": "usd",
        "status": "initiated",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"checkout_url": session.url, "session_id": session.id}


@router.get("/status/{session_id}")
async def payment_status(session_id: str):
    db = get_db()
    record = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not record:
        raise HTTPException(404, "Transaction not found")
    if record.get("payment_status") != "paid":
        try:
            s = stripe.checkout.Session.retrieve(session_id)
            if s.payment_status == "paid" or s.status == "complete":
                await db.payment_transactions.update_one(
                    {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                    {"$set": {
                        "status": "completed", "payment_status": "paid",
                        "stripe_subscription_id": s.subscription,
                        "stripe_payment_intent_id": s.payment_intent,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }},
                )
                record = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
                # mark tenant subscription active
                if record and record.get("tenant_id"):
                    await db.tenants.update_one(
                        {"id": record["tenant_id"]},
                        {"$set": {"subscription_status": "active", "updated_at": datetime.now(timezone.utc).isoformat()}},
                    )
        except stripe.error.StripeError:
            pass
    return {"session_id": record["session_id"], "status": record["status"], "payment_status": record["payment_status"]}


@router.post("/stripe/webhook", include_in_schema=False)
async def stripe_webhook(request: Request):
    # mounted under /api so full path is /api/payments/stripe/webhook
    db = get_db()
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(400, "Invalid signature")
    obj, t = event["data"]["object"], event["type"]
    now = datetime.now(timezone.utc).isoformat()
    if t == "checkout.session.completed":
        await db.payment_transactions.update_one(
            {"session_id": obj["id"], "payment_status": {"$ne": "paid"}},
            {"$set": {
                "status": "completed",
                "payment_status": obj.get("payment_status", "paid"),
                "stripe_subscription_id": obj.get("subscription"),
                "stripe_payment_intent_id": obj.get("payment_intent"),
                "updated_at": now,
            }},
        )
        meta = obj.get("metadata") or {}
        if meta.get("tenant_id"):
            await db.tenants.update_one({"id": meta["tenant_id"]},
                                        {"$set": {"subscription_status": "active", "updated_at": now}})
    return {"status": "ok"}
