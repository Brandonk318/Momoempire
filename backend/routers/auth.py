"""Auth router: register, login, logout, me, refresh, password reset."""
import os
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from db import get_db
from models import RegisterIn, LoginIn, ForgotIn, ResetIn, _uuid, _now_iso
from security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    set_auth_cookies, clear_auth_cookies, get_current_user,
    _secret, JWT_ALGORITHM,
)
import jwt

router = APIRouter(prefix="/auth", tags=["auth"])

LOCKOUT_LIMIT = 5
LOCKOUT_MINUTES = 15


async def _check_lockout(db, identifier: str):
    doc = await db.login_attempts.find_one({"identifier": identifier})
    if not doc:
        return
    if doc.get("count", 0) >= LOCKOUT_LIMIT:
        until = doc.get("locked_until")
        if until and datetime.fromisoformat(until) > datetime.now(timezone.utc):
            raise HTTPException(429, "Too many failed attempts. Try again later.")


async def _record_failure(db, identifier: str):
    now = datetime.now(timezone.utc)
    doc = await db.login_attempts.find_one({"identifier": identifier})
    count = (doc.get("count", 0) if doc else 0) + 1
    locked_until = (now + timedelta(minutes=LOCKOUT_MINUTES)).isoformat() if count >= LOCKOUT_LIMIT else None
    await db.login_attempts.update_one(
        {"identifier": identifier},
        {"$set": {"identifier": identifier, "count": count, "locked_until": locked_until, "updated_at": now.isoformat()}},
        upsert=True,
    )


async def _clear_failures(db, identifier: str):
    await db.login_attempts.delete_one({"identifier": identifier})


@router.post("/register")
async def register(data: RegisterIn, response: Response):
    db = get_db()
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")

    user_id = _uuid()
    tenant_id = None
    # Each new signup becomes an owner of a fresh tenant (business workspace).
    # Full onboarding happens in the wizard afterwards.
    if data.business_name:
        from models import Tenant
        slug_base = "".join(c.lower() if c.isalnum() else "-" for c in data.business_name).strip("-")[:40] or f"biz-{user_id[:6]}"
        slug = slug_base
        n = 1
        while await db.tenants.find_one({"slug": slug}):
            n += 1
            slug = f"{slug_base}-{n}"
        tenant = Tenant(
            name=data.business_name,
            slug=slug,
            branding={"display_name": data.business_name, "primary_color": "#0A0A0A", "accent_color": "#2563EB", "logo_url": ""},
            ai_employee={"name": "Alex", "personality": "Warm, professional, concise.", "voice": "neutral",
                         "greeting": "Hi! Thanks for calling. How can I help you today?", "enabled": True},
        )
        tenant_id = tenant.id
        await db.tenants.insert_one(tenant.model_dump())

    user_doc = {
        "id": user_id,
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "role": "owner" if tenant_id else "staff",
        "tenant_id": tenant_id,
        "email_verified": False,
        "mfa_enabled": False,
        "created_at": _now_iso(),
    }
    await db.users.insert_one(user_doc)

    access = create_access_token(user_id, email, user_doc["role"], tenant_id)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    return user_doc


@router.post("/login")
async def login(data: LoginIn, request: Request, response: Response):
    db = get_db()
    email = data.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    await _check_lockout(db, identifier)

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        await _record_failure(db, identifier)
        raise HTTPException(401, "Invalid email or password")

    await _clear_failures(db, identifier)
    access = create_access_token(user["id"], email, user["role"], user.get("tenant_id"))
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    user.pop("password_hash", None)
    user.pop("_id", None)
    return user


@router.post("/logout")
async def logout(response: Response, _: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"status": "ok"}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    db = get_db()
    tok = request.cookies.get("refresh_token")
    if not tok:
        raise HTTPException(401, "No refresh token")
    try:
        payload = jwt.decode(tok, _secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid token type")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid refresh token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    access = create_access_token(user["id"], user["email"], user["role"], user.get("tenant_id"))
    new_refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, new_refresh)
    return {"status": "ok"}


@router.post("/forgot-password")
async def forgot_password(data: ForgotIn):
    db = get_db()
    user = await db.users.find_one({"email": data.email.lower()})
    # Always respond ok (prevents account enumeration)
    if user:
        token = secrets.token_urlsafe(32)
        expires = datetime.now(timezone.utc) + timedelta(hours=1)
        await db.password_reset_tokens.insert_one({
            "token": token,
            "user_id": user["id"],
            "expires_at": expires,
            "used": False,
            "created_at": _now_iso(),
        })
        frontend = os.environ.get("FRONTEND_URL", "http://localhost:3000")
        print(f"[AUTH] Password reset link for {data.email}: {frontend}/reset-password?token={token}")
    return {"status": "ok", "message": "If an account exists we've sent reset instructions."}


@router.post("/reset-password")
async def reset_password(data: ResetIn):
    db = get_db()
    rec = await db.password_reset_tokens.find_one({"token": data.token})
    if not rec or rec.get("used"):
        raise HTTPException(400, "Invalid or used token")
    exp = rec["expires_at"]
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(400, "Token expired")
    await db.users.update_one({"id": rec["user_id"]},
                              {"$set": {"password_hash": hash_password(data.new_password)}})
    await db.password_reset_tokens.update_one({"token": data.token}, {"$set": {"used": True}})
    return {"status": "ok"}
