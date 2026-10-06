"""Phase 2 models: conversations, estimates, invoices, review requests, invitations, domains, usage, portal."""
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any, Literal
from models import _uuid, _now_iso


# ---------- Conversations (calls + SMS) ----------
Channel = Literal["call", "sms", "web_chat"]
ConvStatus = Literal["active", "completed", "escalated", "voicemail", "missed", "failed"]


class ConversationIn(BaseModel):
    channel: Channel = "call"
    caller_name: str = ""
    caller_phone: str = ""
    caller_email: str = ""
    is_simulation: bool = True


class Conversation(ConversationIn):
    id: str = Field(default_factory=_uuid)
    tenant_id: str
    customer_id: Optional[str] = None
    lead_id: Optional[str] = None
    appointment_id: Optional[str] = None
    status: ConvStatus = "active"
    summary: str = ""
    duration_seconds: int = 0
    sentiment: str = ""
    intent: str = ""
    recording_url: str = ""
    created_at: str = Field(default_factory=_now_iso)
    ended_at: Optional[str] = None


class ConvMessageIn(BaseModel):
    text: str


class ConvMessage(BaseModel):
    id: str = Field(default_factory=_uuid)
    conversation_id: str
    tenant_id: str
    role: Literal["caller", "ai", "system", "note"]
    content: str
    action: Optional[Dict[str, Any]] = None  # structured tool call
    created_at: str = Field(default_factory=_now_iso)


# ---------- Estimates ----------
EstimateStatus = Literal["draft", "sent", "approved", "declined", "expired"]


class EstimateLine(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float = 0


class EstimateIn(BaseModel):
    customer_id: Optional[str] = None
    customer_name: str
    customer_phone: str = ""
    title: str
    lines: List[EstimateLine] = []
    notes: str = ""
    expires_at: Optional[str] = None


class Estimate(EstimateIn):
    id: str = Field(default_factory=_uuid)
    tenant_id: str
    total: float = 0
    status: EstimateStatus = "draft"
    public_token: str = Field(default_factory=_uuid)
    created_at: str = Field(default_factory=_now_iso)
    updated_at: str = Field(default_factory=_now_iso)


# ---------- Invoices ----------
InvoiceStatus = Literal["draft", "sent", "paid", "void", "overdue"]


class InvoiceIn(BaseModel):
    customer_id: Optional[str] = None
    customer_name: str
    customer_phone: str = ""
    title: str
    lines: List[EstimateLine] = []
    notes: str = ""
    due_at: Optional[str] = None


class Invoice(InvoiceIn):
    id: str = Field(default_factory=_uuid)
    tenant_id: str
    total: float = 0
    status: InvoiceStatus = "draft"
    public_token: str = Field(default_factory=_uuid)
    created_at: str = Field(default_factory=_now_iso)
    paid_at: Optional[str] = None


# ---------- Review Requests ----------
class ReviewRequestIn(BaseModel):
    customer_id: Optional[str] = None
    customer_name: str
    customer_phone: str = ""
    customer_email: str = ""
    channel: Literal["sms", "email"] = "sms"
    message: str = ""


class ReviewRequest(ReviewRequestIn):
    id: str = Field(default_factory=_uuid)
    tenant_id: str
    public_token: str = Field(default_factory=_uuid)
    status: Literal["sent", "clicked", "responded", "declined"] = "sent"
    rating: Optional[int] = None  # 1-5
    comment: str = ""
    responded_at: Optional[str] = None
    created_at: str = Field(default_factory=_now_iso)


# ---------- Team Invitations ----------
class InvitationIn(BaseModel):
    email: EmailStr
    role: Literal["owner", "admin", "staff"] = "staff"


class Invitation(BaseModel):
    id: str = Field(default_factory=_uuid)
    tenant_id: str
    email: str
    role: str
    token: str = Field(default_factory=_uuid)
    invited_by: str
    status: Literal["pending", "accepted", "revoked"] = "pending"
    created_at: str = Field(default_factory=_now_iso)
    accepted_at: Optional[str] = None


class InvitationAccept(BaseModel):
    token: str
    password: str = Field(min_length=8)
    name: str


# ---------- Domains ----------
class DomainIn(BaseModel):
    domain: str  # e.g. www.hearthhvac.com


class Domain(BaseModel):
    id: str = Field(default_factory=_uuid)
    tenant_id: str
    domain: str
    status: Literal["pending", "verified", "failed"] = "pending"
    verify_token: str = Field(default_factory=lambda: _uuid()[:12])
    cname_target: str = ""
    last_checked_at: Optional[str] = None
    created_at: str = Field(default_factory=_now_iso)


# ---------- Usage metering ----------
class UsageEvent(BaseModel):
    id: str = Field(default_factory=_uuid)
    tenant_id: str
    metric: str  # "ai_minutes" | "calls" | "sms" | "voice_seconds" | "ai_interactions"
    value: float
    period_key: str  # YYYY-MM
    meta: Dict[str, Any] = {}
    created_at: str = Field(default_factory=_now_iso)


# Default limits per plan
PLAN_LIMITS: Dict[str, Dict[str, float]] = {
    "trial":   {"ai_minutes": 60,    "calls": 50,    "sms": 100,   "ai_interactions": 500},
    "starter": {"ai_minutes": 500,   "calls": 500,   "sms": 1000,  "ai_interactions": 5000},
    "growth":  {"ai_minutes": 2500,  "calls": 2500,  "sms": 5000,  "ai_interactions": 25000},
    "scale":   {"ai_minutes": 10000, "calls": 10000, "sms": 20000, "ai_interactions": 100000},
}

WARNING_THRESHOLDS = [0.70, 0.85, 0.90, 0.95, 1.00]


# ---------- Portal (customer-facing) ----------
class PortalMagicLinkIn(BaseModel):
    phone: str = ""
    email: str = ""


class ServiceRequestIn(BaseModel):
    name: str
    phone: str
    email: str = ""
    service: str = ""
    preferred_time: str = ""
    notes: str = ""


# ---------- Automation settings ----------
class AutomationSettings(BaseModel):
    appointment_reminders: bool = True
    reminder_hours_before: int = 24
    review_request_after_job: bool = True
    missed_call_textback: bool = True
    missed_call_textback_message: str = "Sorry we missed you! Reply here and we'll get right back to you."
    follow_up_leads_hours: int = 24
    reminder_sms_template: str = "Hi {name}, this is a reminder for your {service} appointment on {time}. Reply C to confirm."


# ---------- Integrations ----------
class IntegrationConfigIn(BaseModel):
    key: str  # "twilio" | "gmail" | "google_my_business"
    enabled: bool = False
    config: Dict[str, Any] = {}


class IntegrationConfig(IntegrationConfigIn):
    id: str = Field(default_factory=_uuid)
    tenant_id: str
    status: Literal["disconnected", "connected", "error"] = "disconnected"
    last_checked_at: Optional[str] = None
    updated_at: str = Field(default_factory=_now_iso)


# ---------- Receptionist simulate ----------
class SimulateCallerIn(BaseModel):
    caller_name: str = "Jamie Caller"
    caller_phone: str = "+1 555 010 0199"
    scenario: str = ""  # optional seed intent
