"""Shared pydantic models used across routers."""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime, timezone
import uuid


def _uuid() -> str:
    return str(uuid.uuid4())


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Auth ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str
    business_name: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


# ---------- Industry Template ----------
class IndustryTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uuid)
    slug: str
    name: str
    description: str = ""
    icon: str = "briefcase"  # lucide icon name
    ai_personality: str = ""
    knowledge_base: List[Dict[str, str]] = []  # {question,answer}
    services: List[Dict[str, Any]] = []  # {name, description, duration_minutes, price}
    workflows: List[Dict[str, Any]] = []  # {name, steps[]}
    faqs: List[Dict[str, str]] = []
    terminology: Dict[str, str] = {}
    appointment_types: List[str] = []
    intake_questions: List[str] = []
    escalation_rules: List[str] = []
    emergency_rules: List[str] = []
    recommended_integrations: List[str] = []
    recommended_website_content: List[str] = []
    industry_automations: List[str] = []
    active: bool = True
    created_at: str = Field(default_factory=_now_iso)
    updated_at: str = Field(default_factory=_now_iso)


class IndustryTemplateIn(BaseModel):
    slug: str
    name: str
    description: str = ""
    icon: str = "briefcase"
    ai_personality: str = ""
    knowledge_base: List[Dict[str, str]] = []
    services: List[Dict[str, Any]] = []
    workflows: List[Dict[str, Any]] = []
    faqs: List[Dict[str, str]] = []
    terminology: Dict[str, str] = {}
    appointment_types: List[str] = []
    intake_questions: List[str] = []
    escalation_rules: List[str] = []
    emergency_rules: List[str] = []
    recommended_integrations: List[str] = []
    recommended_website_content: List[str] = []
    industry_automations: List[str] = []
    active: bool = True


# ---------- Tenant / Business ----------
class BusinessHours(BaseModel):
    mon: str = "09:00-17:00"
    tue: str = "09:00-17:00"
    wed: str = "09:00-17:00"
    thu: str = "09:00-17:00"
    fri: str = "09:00-17:00"
    sat: str = "closed"
    sun: str = "closed"


class Address(BaseModel):
    line1: str = ""
    line2: str = ""
    city: str = ""
    state: str = ""
    postal_code: str = ""
    country: str = "US"


class Branding(BaseModel):
    display_name: str = ""
    primary_color: str = "#0A0A0A"
    accent_color: str = "#2563EB"
    logo_url: str = ""


class AIEmployee(BaseModel):
    name: str = "Alex"
    personality: str = "Warm, professional, concise."
    voice: str = "neutral"
    greeting: str = "Hi! Thanks for calling. How can I help you today?"
    enabled: bool = True


class TenantOnboardingIn(BaseModel):
    name: str
    industry_slug: str
    description: str = ""
    contact_name: str = ""
    contact_email: EmailStr | None = None
    contact_phone: str = ""
    website: str = ""
    social_links: Dict[str, str] = {}
    address: Address = Address()
    service_areas: List[str] = []
    hours: BusinessHours = BusinessHours()
    emergency_hours: str = ""
    emergency_procedures: str = ""
    human_fallback_number: str = ""
    voicemail_prefs: str = "transcribe"
    communication_prefs: List[str] = []  # ["sms","email","voice"]
    services: List[Dict[str, Any]] = []
    staff: List[Dict[str, str]] = []
    faqs: List[Dict[str, str]] = []
    pricing_info: str = ""
    policies: str = ""
    appointment_availability: str = ""


class Tenant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uuid)
    slug: str
    name: str
    industry_slug: str = ""
    description: str = ""
    contact_name: str = ""
    contact_email: str = ""
    contact_phone: str = ""
    website: str = ""
    social_links: Dict[str, str] = {}
    address: Dict[str, Any] = {}
    service_areas: List[str] = []
    hours: Dict[str, Any] = {}
    emergency_hours: str = ""
    emergency_procedures: str = ""
    human_fallback_number: str = ""
    voicemail_prefs: str = "transcribe"
    communication_prefs: List[str] = []
    staff: List[Dict[str, str]] = []
    faqs: List[Dict[str, str]] = []
    pricing_info: str = ""
    policies: str = ""
    appointment_availability: str = ""
    branding: Dict[str, Any] = {}
    ai_employee: Dict[str, Any] = {}
    onboarding_complete: bool = False
    subscription_status: Literal["trial", "active", "past_due", "canceled"] = "trial"
    status: Literal["active", "suspended"] = "active"
    country: str = "US"
    created_at: str = Field(default_factory=_now_iso)
    updated_at: str = Field(default_factory=_now_iso)


# ---------- Operational resources ----------
class ServiceIn(BaseModel):
    name: str
    description: str = ""
    duration_minutes: int = 60
    price: float = 0.0
    active: bool = True


class Service(ServiceIn):
    id: str = Field(default_factory=_uuid)
    tenant_id: str
    created_at: str = Field(default_factory=_now_iso)


class CustomerIn(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: str = ""
    notes: str = ""
    tags: List[str] = []


class Customer(CustomerIn):
    id: str = Field(default_factory=_uuid)
    tenant_id: str
    created_at: str = Field(default_factory=_now_iso)


class LeadIn(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: str = ""
    source: str = "manual"
    notes: str = ""
    status: Literal["new", "contacted", "qualified", "won", "lost"] = "new"


class Lead(LeadIn):
    id: str = Field(default_factory=_uuid)
    tenant_id: str
    created_at: str = Field(default_factory=_now_iso)


class AppointmentIn(BaseModel):
    customer_name: str
    customer_phone: str = ""
    customer_email: Optional[EmailStr] = None
    customer_id: Optional[str] = None
    lead_id: Optional[str] = None
    service_id: Optional[str] = None
    service_name: str = ""
    staff: str = ""
    start_at: str  # ISO
    end_at: str
    status: Literal["scheduled", "confirmed", "completed", "canceled", "no_show"] = "scheduled"
    notes: str = ""


class Appointment(AppointmentIn):
    id: str = Field(default_factory=_uuid)
    tenant_id: str
    created_at: str = Field(default_factory=_now_iso)


class KnowledgeIn(BaseModel):
    question: str
    answer: str
    tags: List[str] = []


class Knowledge(KnowledgeIn):
    id: str = Field(default_factory=_uuid)
    tenant_id: str
    created_at: str = Field(default_factory=_now_iso)


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    social_links: Optional[Dict[str, str]] = None
    address: Optional[Address] = None
    service_areas: Optional[List[str]] = None
    hours: Optional[BusinessHours] = None
    emergency_hours: Optional[str] = None
    emergency_procedures: Optional[str] = None
    human_fallback_number: Optional[str] = None
    voicemail_prefs: Optional[str] = None
    communication_prefs: Optional[List[str]] = None
    staff: Optional[List[Dict[str, str]]] = None
    faqs: Optional[List[Dict[str, str]]] = None
    pricing_info: Optional[str] = None
    policies: Optional[str] = None
    appointment_availability: Optional[str] = None
    branding: Optional[Branding] = None
    ai_employee: Optional[AIEmployee] = None
    review_url: Optional[str] = None  # Google Business review URL used by review-request flow
    country: Optional[str] = None


# ---------- Country ----------
CountryStatus = Literal["supported", "preview", "extended", "unsupported", "unavailable"]


class CountryIn(BaseModel):
    code: str
    name: str
    status: CountryStatus = "supported"
    enabled: bool = True
    notes: str = ""


class Country(CountryIn):
    id: str = Field(default_factory=_uuid)
    updated_at: str = Field(default_factory=_now_iso)


# ---------- Feature flag ----------
class FeatureFlagIn(BaseModel):
    key: str
    enabled: bool = False
    description: str = ""


class FeatureFlag(FeatureFlagIn):
    id: str = Field(default_factory=_uuid)
    updated_at: str = Field(default_factory=_now_iso)


# ---------- AI chat ----------
class AdvisorMessageIn(BaseModel):
    message: str
    session_id: Optional[str] = None
