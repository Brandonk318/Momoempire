"""Team invitations (token-based)."""
from fastapi import APIRouter, HTTPException, Depends, Response
from datetime import datetime, timezone
from db import get_db
from models import _uuid, _now_iso
from models_phase2 import InvitationIn, Invitation, InvitationAccept
from security import (
    hash_password, require_tenant_owner_or_admin,
    create_access_token, create_refresh_token, set_auth_cookies,
)

router = APIRouter(prefix="/tenants/invitations", tags=["invitations"])


@router.get("")
async def list_invites(user: dict = Depends(require_tenant_owner_or_admin)):
    db = get_db()
    return await db.invitations.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


@router.post("")
async def create_invite(data: InvitationIn, user: dict = Depends(require_tenant_owner_or_admin)):
    db = get_db()
    email = data.email.lower()
    inv = Invitation(
        tenant_id=user["tenant_id"], email=email,
        role=data.role, invited_by=user["id"],
    )
    doc = inv.model_dump()
    await db.invitations.insert_one(doc)
    doc.pop("_id", None)
    print(f"[INVITE] {email} invited to tenant {user['tenant_id']} role={data.role} token={doc['token']}")
    return doc


@router.post("/{inv_id}/revoke")
async def revoke_invite(inv_id: str, user: dict = Depends(require_tenant_owner_or_admin)):
    db = get_db()
    res = await db.invitations.update_one(
        {"id": inv_id, "tenant_id": user["tenant_id"]},
        {"$set": {"status": "revoked"}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"status": "ok"}


# ---------- Staff listing + role management ----------
@router.get("/staff")
async def list_staff(user: dict = Depends(require_tenant_owner_or_admin)):
    db = get_db()
    return await db.users.find(
        {"tenant_id": user["tenant_id"]},
        {"_id": 0, "password_hash": 0},
    ).sort("created_at", 1).to_list(200)


@router.put("/staff/{user_id}/role")
async def set_staff_role(user_id: str, role: str, user: dict = Depends(require_tenant_owner_or_admin)):
    if role not in {"owner", "admin", "staff"}:
        raise HTTPException(400, "Invalid role")
    db = get_db()
    res = await db.users.update_one(
        {"id": user_id, "tenant_id": user["tenant_id"]},
        {"$set": {"role": role}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "User not found")
    return {"status": "ok"}


# ---------- Public (anyone with the token) accept endpoint ----------
public_router = APIRouter(prefix="/public/invitations", tags=["invitations-public"])


@public_router.get("/{token}")
async def peek(token: str):
    db = get_db()
    inv = await db.invitations.find_one({"token": token}, {"_id": 0})
    if not inv or inv.get("status") != "pending":
        raise HTTPException(404, "Invite not available")
    tenant = await db.tenants.find_one({"id": inv["tenant_id"]}, {"_id": 0})
    return {"invitation": inv, "tenant_name": tenant.get("name"), "tenant_slug": tenant.get("slug")}


@public_router.post("/accept")
async def accept(data: InvitationAccept, response: Response):
    db = get_db()
    inv = await db.invitations.find_one({"token": data.token})
    if not inv or inv.get("status") != "pending":
        raise HTTPException(400, "Invite invalid or already used")
    email = inv["email"].lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered — log in instead")
    user_id = _uuid()
    await db.users.insert_one({
        "id": user_id,
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "role": inv["role"],
        "tenant_id": inv["tenant_id"],
        "email_verified": True,
        "mfa_enabled": False,
        "created_at": _now_iso(),
    })
    await db.invitations.update_one({"token": data.token}, {"$set": {"status": "accepted", "accepted_at": _now_iso()}})
    access = create_access_token(user_id, email, inv["role"], inv["tenant_id"])
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return {"id": user_id, "email": email, "role": inv["role"], "tenant_id": inv["tenant_id"], "name": data.name}
