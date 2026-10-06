"""Phase 4 models: plans, cost config, domain providers."""
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Literal
from models import _uuid, _now_iso


class PlanIn(BaseModel):
    key: str  # trial | starter | growth | ai_office | high_volume | enterprise | custom
    name: str
    price_cents: int = 0  # 0 = custom / contact sales
    interval: Literal["month", "year", "custom"] = "month"
    limits: Dict[str, float] = {}  # ai_minutes, calls, sms, ai_interactions, locations, users, phone_numbers, personas, integrations
    overage: Dict[str, float] = {}  # cents per unit per metric
    features: List[str] = []
    trial_days: int = 0
    is_public: bool = True
    sort_order: int = 100
    description: str = ""


class Plan(PlanIn):
    id: str = Field(default_factory=_uuid)
    created_at: str = Field(default_factory=_now_iso)
    updated_at: str = Field(default_factory=_now_iso)


class CostConfigIn(BaseModel):
    """Admin-set unit costs for gross-margin math (cents per unit)."""
    costs: Dict[str, float] = {}  # ai_minutes:8, calls:2, sms:0.5, storage_gb:1, payment_processing_bps:290


class CostConfig(CostConfigIn):
    id: str = Field(default="singleton")
    updated_at: str = Field(default_factory=_now_iso)


class DomainSearchIn(BaseModel):
    query: str


class DomainPurchaseIn(BaseModel):
    domain: str
    years: int = 1
    provider: Optional[str] = None  # default from admin config
