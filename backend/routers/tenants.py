"""Tenant (business) management: onboarding, settings, scoped resources."""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from db import get_db
from models import (
    Tenant, TenantOnboardingIn, TenantUpdate,
    ServiceIn, Service, CustomerIn, Customer,
    LeadIn, Lead, AppointmentIn, Appointment,
    KnowledgeIn, Knowledge, _now_iso,
)
from security import (
    get_current_user, require_tenant_user, require_tenant_owner_or_admin,
    require_platform_admin,
)

router = APIRouter(prefix="/tenants", tags=["tenants"])


def _slugify(name: str) -> str:
    out = "".join(c.lower() if c.isalnum() else "-" for c in name).strip("-")
    return out[:40] or "biz"


async def _get_my_tenant(user: dict):
    db = get_db()
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(404, "No tenant")
    t = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Tenant not found")
    return t


@router.get("/me")
async def get_my_tenant(user: dict = Depends(require_tenant_user)):
    return await _get_my_tenant(user)


@router.post("/onboard")
async def onboard_tenant(data: TenantOnboardingIn, user: dict = Depends(require_tenant_user)):
    db = get_db()
    tenant_id = user["tenant_id"]
    industry = await db.industries.find_one({"slug": data.industry_slug}, {"_id": 0})
    if not industry:
        raise HTTPException(400, "Unknown industry")
    # Build tenant document from wizard input + industry defaults
    patch = data.model_dump()
    patch["address"] = data.address.model_dump() if hasattr(data.address, "model_dump") else dict(data.address)
    patch["hours"] = data.hours.model_dump() if hasattr(data.hours, "model_dump") else dict(data.hours)
    patch["onboarding_complete"] = True
    patch["updated_at"] = _now_iso()
    # Seed ai_employee from industry if not set
    existing = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if existing and not existing.get("ai_employee"):
        patch["ai_employee"] = {
            "name": "Alex",
            "personality": industry.get("ai_personality") or "Warm, professional, concise.",
            "voice": "neutral",
            "greeting": f"Hi! Thanks for calling {data.name}. How can I help you today?",
            "enabled": True,
        }
    # Normalize contact_email to string
    if patch.get("contact_email"):
        patch["contact_email"] = str(patch["contact_email"])

    await db.tenants.update_one({"id": tenant_id}, {"$set": patch})

    # Seed services from industry template + any extras provided
    seeded_services = []
    for s in (industry.get("services") or []) + list(data.services or []):
        if not s.get("name"):
            continue
        svc = Service(
            tenant_id=tenant_id,
            name=s["name"],
            description=s.get("description", ""),
            duration_minutes=int(s.get("duration_minutes", 60)),
            price=float(s.get("price", 0) or 0),
            active=True,
        )
        await db.services.insert_one(svc.model_dump())
        seeded_services.append(svc.model_dump())

    # Seed knowledge from industry FAQs
    for faq in (industry.get("faqs") or []) + list(data.faqs or []):
        q, a = faq.get("question"), faq.get("answer")
        if q and a:
            k = Knowledge(tenant_id=tenant_id, question=q, answer=a, tags=["faq"])
            await db.knowledge.insert_one(k.model_dump())

    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    return {"tenant": tenant, "services_seeded": len(seeded_services)}


@router.put("/me")
async def update_my_tenant(data: TenantUpdate, user: dict = Depends(require_tenant_owner_or_admin)):
    db = get_db()
    patch = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    for key in ["address", "hours", "branding", "ai_employee"]:
        if key in patch and hasattr(patch[key], "model_dump"):
            patch[key] = patch[key].model_dump()
    if "contact_email" in patch and patch["contact_email"] is not None:
        patch["contact_email"] = str(patch["contact_email"])
    patch["updated_at"] = _now_iso()
    await db.tenants.update_one({"id": user["tenant_id"]}, {"$set": patch})
    return await db.tenants.find_one({"id": user["tenant_id"]}, {"_id": 0})


# ---------- Services ----------
@router.get("/services")
async def list_services(user: dict = Depends(require_tenant_user)):
    db = get_db()
    return await db.services.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).sort("name", 1).to_list(500)


@router.post("/services")
async def create_service(data: ServiceIn, user: dict = Depends(require_tenant_owner_or_admin)):
    db = get_db()
    svc = Service(tenant_id=user["tenant_id"], **data.model_dump())
    await db.services.insert_one(svc.model_dump())
    return svc.model_dump()


@router.put("/services/{service_id}")
async def update_service(service_id: str, data: ServiceIn, user: dict = Depends(require_tenant_owner_or_admin)):
    db = get_db()
    res = await db.services.update_one(
        {"id": service_id, "tenant_id": user["tenant_id"]},
        {"$set": data.model_dump()},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Service not found")
    return await db.services.find_one({"id": service_id}, {"_id": 0})


@router.delete("/services/{service_id}")
async def delete_service(service_id: str, user: dict = Depends(require_tenant_owner_or_admin)):
    db = get_db()
    res = await db.services.delete_one({"id": service_id, "tenant_id": user["tenant_id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Service not found")
    return {"status": "ok"}


# ---------- Customers ----------
@router.get("/customers")
async def list_customers(user: dict = Depends(require_tenant_user)):
    db = get_db()
    return await db.customers.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@router.post("/customers")
async def create_customer(data: CustomerIn, user: dict = Depends(require_tenant_user)):
    db = get_db()
    payload = data.model_dump()
    if payload.get("email"):
        payload["email"] = str(payload["email"])
    cust = Customer(tenant_id=user["tenant_id"], **payload)
    await db.customers.insert_one(cust.model_dump())
    return cust.model_dump()


@router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, user: dict = Depends(require_tenant_user)):
    db = get_db()
    res = await db.customers.delete_one({"id": customer_id, "tenant_id": user["tenant_id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Customer not found")
    return {"status": "ok"}


# ---------- Leads ----------
@router.get("/leads")
async def list_leads(user: dict = Depends(require_tenant_user)):
    db = get_db()
    return await db.leads.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@router.post("/leads")
async def create_lead(data: LeadIn, user: dict = Depends(require_tenant_user)):
    db = get_db()
    payload = data.model_dump()
    if payload.get("email"):
        payload["email"] = str(payload["email"])
    lead = Lead(tenant_id=user["tenant_id"], **payload)
    await db.leads.insert_one(lead.model_dump())
    return lead.model_dump()


@router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, data: LeadIn, user: dict = Depends(require_tenant_user)):
    db = get_db()
    payload = data.model_dump()
    if payload.get("email"):
        payload["email"] = str(payload["email"])
    res = await db.leads.update_one(
        {"id": lead_id, "tenant_id": user["tenant_id"]},
        {"$set": payload},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Lead not found")
    return await db.leads.find_one({"id": lead_id}, {"_id": 0})


# ---------- Appointments ----------
@router.get("/appointments")
async def list_appointments(user: dict = Depends(require_tenant_user)):
    db = get_db()
    return await db.appointments.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).sort("start_at", 1).to_list(1000)


@router.post("/appointments")
async def create_appointment(data: AppointmentIn, user: dict = Depends(require_tenant_user)):
    db = get_db()
    appt = Appointment(tenant_id=user["tenant_id"], **data.model_dump())
    await db.appointments.insert_one(appt.model_dump())
    return appt.model_dump()


@router.put("/appointments/{appt_id}")
async def update_appointment(appt_id: str, data: AppointmentIn, user: dict = Depends(require_tenant_user)):
    db = get_db()
    res = await db.appointments.update_one(
        {"id": appt_id, "tenant_id": user["tenant_id"]},
        {"$set": data.model_dump()},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Appointment not found")
    return await db.appointments.find_one({"id": appt_id}, {"_id": 0})


@router.delete("/appointments/{appt_id}")
async def delete_appointment(appt_id: str, user: dict = Depends(require_tenant_user)):
    db = get_db()
    res = await db.appointments.delete_one({"id": appt_id, "tenant_id": user["tenant_id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Appointment not found")
    return {"status": "ok"}


# ---------- Knowledge ----------
@router.get("/knowledge")
async def list_knowledge(user: dict = Depends(require_tenant_user)):
    db = get_db()
    return await db.knowledge.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.post("/knowledge")
async def create_knowledge(data: KnowledgeIn, user: dict = Depends(require_tenant_user)):
    db = get_db()
    k = Knowledge(tenant_id=user["tenant_id"], **data.model_dump())
    await db.knowledge.insert_one(k.model_dump())
    return k.model_dump()


@router.put("/knowledge/{k_id}")
async def update_knowledge(k_id: str, data: KnowledgeIn, user: dict = Depends(require_tenant_user)):
    db = get_db()
    res = await db.knowledge.update_one(
        {"id": k_id, "tenant_id": user["tenant_id"]},
        {"$set": data.model_dump()},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Entry not found")
    return await db.knowledge.find_one({"id": k_id}, {"_id": 0})


@router.delete("/knowledge/{k_id}")
async def delete_knowledge(k_id: str, user: dict = Depends(require_tenant_user)):
    db = get_db()
    res = await db.knowledge.delete_one({"id": k_id, "tenant_id": user["tenant_id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Entry not found")
    return {"status": "ok"}


# ---------- Dashboard summary ----------
@router.get("/summary")
async def tenant_summary(user: dict = Depends(require_tenant_user)):
    db = get_db()
    tid = user["tenant_id"]
    return {
        "customers": await db.customers.count_documents({"tenant_id": tid}),
        "leads": await db.leads.count_documents({"tenant_id": tid}),
        "leads_new": await db.leads.count_documents({"tenant_id": tid, "status": "new"}),
        "appointments": await db.appointments.count_documents({"tenant_id": tid}),
        "upcoming_appointments": await db.appointments.count_documents({"tenant_id": tid, "status": {"$in": ["scheduled", "confirmed"]}}),
        "services": await db.services.count_documents({"tenant_id": tid}),
        "knowledge_entries": await db.knowledge.count_documents({"tenant_id": tid}),
    }
