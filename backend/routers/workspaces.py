"""Workspace switcher + session audit (Phase 4)."""
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from datetime import datetime, timezone
from db import get_db
from security import get_current_user, create_access_token, create_refresh_token, set_auth_cookies

router = APIRouter(prefix="/auth", tags=["workspaces"])


@router.get("/workspaces")
async def list_workspaces(user: dict = Depends(get_current_user)):
    """All tenants this user can access (by email, since team invites create users scoped to a tenant)."""
    db = get_db()
    # Users table is scoped to tenant_id, but a single email could have multiple user rows (accepted multiple invites).
    rows = await db.users.find({"email": user["email"]}, {"_id": 0, "password_hash": 0}).to_list(50)
    out = []
    for r in rows:
        if not r.get("tenant_id"):
            continue
        t = await db.tenants.find_one({"id": r["tenant_id"]}, {"_id": 0, "name": 1, "slug": 1, "branding": 1})
        if not t:
            continue
        out.append({
            "tenant_id": r["tenant_id"], "tenant_name": t.get("name"), "slug": t.get("slug"),
            "role": r.get("role"), "branding": t.get("branding", {}),
            "is_current": r["id"] == user["id"],
        })
    return out


@router.post("/switch")
async def switch_workspace(tenant_id: str, response: Response, user: dict = Depends(get_current_user)):
    db = get_db()
    target = await db.users.find_one({"email": user["email"], "tenant_id": tenant_id}, {"_id": 0, "password_hash": 0})
    if not target:
        raise HTTPException(403, "You don't have access to that workspace")
    access = create_access_token(target["id"], target["email"], target["role"], tenant_id)
    refresh = create_refresh_token(target["id"])
    set_auth_cookies(response, access, refresh)
    return target


# ---------- Session audit ----------
@router.get("/sessions")
async def list_sessions(request: Request, user: dict = Depends(get_current_user)):
    db = get_db()
    cur = request.cookies.get("session_token")
    rows = await db.user_sessions.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    for r in rows:
        if isinstance(r.get("expires_at"), datetime):
            r["expires_at"] = r["expires_at"].isoformat()
        r["is_current"] = (r.get("session_token") == cur)
        # Scrub the raw token value from the response
        r["session_token_tail"] = (r.get("session_token") or "")[-8:]
        r.pop("session_token", None)
    return rows


@router.delete("/sessions/{session_id}")
async def revoke_session(session_id: str, request: Request, user: dict = Depends(get_current_user)):
    db = get_db()
    rec = await db.user_sessions.find_one({"id": session_id, "user_id": user["id"]})
    if not rec:
        raise HTTPException(404, "Session not found")
    await db.user_sessions.delete_one({"id": session_id})
    return {"status": "ok"}
