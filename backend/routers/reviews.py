"""Review Autopilot — tenant sends requests, customers respond via public link."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from pydantic import BaseModel
from db import get_db
from models_phase2 import ReviewRequest, ReviewRequestIn
from security import require_tenant_user
from routers.usage import record_usage

router = APIRouter(prefix="/tenants/reviews", tags=["reviews"])


@router.get("")
async def list_reviews(user: dict = Depends(require_tenant_user)):
    db = get_db()
    return await db.review_requests.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.post("")
async def create_review_request(data: ReviewRequestIn, user: dict = Depends(require_tenant_user)):
    db = get_db()
    rr = ReviewRequest(tenant_id=user["tenant_id"], **data.model_dump())
    doc = rr.model_dump()
    await db.review_requests.insert_one(doc)
    doc.pop("_id", None)
    # In demo mode we log the message that would be sent via SMS/email
    channel = data.channel
    msg = data.message or f"Hi {data.customer_name}, thanks for choosing us! Could you share a quick review? Link below."
    print(f"[REVIEW-REQ {channel}->{data.customer_phone or data.customer_email}] {msg} (token={doc['public_token']})")
    if channel == "sms":
        await record_usage(user["tenant_id"], "sms", 1, {"review_request_id": doc["id"]})
    return doc


# ---------- Public (customer-facing) submission ----------
public_router = APIRouter(prefix="/public/reviews", tags=["reviews-public"])


class ReviewSubmit(BaseModel):
    rating: int
    comment: str = ""


@public_router.get("/{token}")
async def get_review_request(token: str):
    db = get_db()
    r = await db.review_requests.find_one({"public_token": token}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Request not found")
    tenant = await db.tenants.find_one({"id": r["tenant_id"]}, {"_id": 0, "ai_employee": 0})
    return {"request": r, "tenant": {"name": tenant.get("name"), "slug": tenant.get("slug"), "branding": tenant.get("branding")}}


@public_router.post("/{token}")
async def submit_review(token: str, data: ReviewSubmit):
    db = get_db()
    r = await db.review_requests.find_one({"public_token": token})
    if not r:
        raise HTTPException(404, "Request not found")
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(400, "Rating 1-5")
    await db.review_requests.update_one(
        {"public_token": token},
        {"$set": {
            "rating": data.rating, "comment": data.comment, "status": "responded",
            "responded_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return {"status": "ok"}
