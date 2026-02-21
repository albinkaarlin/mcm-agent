"""
app/models.py – Pydantic v2 request / response schemas for Mark API.
"""
from __future__ import annotations

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


# ── Enumerations ──────────────────────────────────────────────────────────────


class PrimaryKPI(str, Enum):
    REVENUE = "revenue"
    CONVERSION_RATE = "conversion_rate"
    OPEN_RATE = "open_rate"
    CLICK_THROUGH_RATE = "click_through_rate"
    LEADS_GENERATED = "leads_generated"
    BRAND_AWARENESS = "brand_awareness"
    CUSTOMER_RETENTION = "customer_retention"
    AOV = "average_order_value"
    ROAS = "roas"


class Channel(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    SOCIAL = "social"
    PAID_SEARCH = "paid_search"
    DISPLAY = "display"


class CampaignStatus(str, Enum):
    NEEDS_CLARIFICATION = "needs_clarification"
    COMPLETED = "completed"


# ── Sub-models: Request ───────────────────────────────────────────────────────


class DesignTokens(BaseModel):
    primary_color: str = Field(default="#000000", examples=["#0055FF"])
    secondary_color: str = Field(default="#FFFFFF", examples=["#FF3300"])
    accent_color: Optional[str] = Field(default=None, examples=["#FFD700"])
    font_family_heading: str = Field(default="Georgia, serif")
    font_family_body: str = Field(default="Arial, sans-serif")
    font_size_base: str = Field(default="16px")
    line_height: str = Field(default="1.6")
    spacing_unit: str = Field(default="8px")
    border_radius: str = Field(default="4px")
    logo_url: Optional[str] = Field(default=None)


class BrandContext(BaseModel):
    brand_name: str = Field(..., min_length=1, examples=["AcmeCorp"])
    voice_guidelines: str = Field(
        ...,
        min_length=10,
        examples=["Friendly, professional, action-oriented. Never use jargon."],
    )
    banned_phrases: list[str] = Field(
        default_factory=list,
        examples=[["the best", "world-class", "revolutionary"]],
    )
    required_phrases: list[str] = Field(
        default_factory=list,
        examples=[["Shop now", "Limited time"]],
    )
    legal_footer: str = Field(
        default="",
        examples=["© 2025 AcmeCorp. Unsubscribe | Privacy Policy"],
    )
    design_tokens: DesignTokens = Field(default_factory=DesignTokens)
    example_email_html: Optional[str] = Field(
        default=None,
        description="Optional reference HTML email for style matching.",
    )


class CampaignObjective(BaseModel):
    primary_kpi: PrimaryKPI = Field(..., examples=[PrimaryKPI.REVENUE])
    secondary_kpis: list[PrimaryKPI] = Field(default_factory=list)
    target_audience: str = Field(
        ...,
        min_length=5,
        examples=["Existing customers aged 25-45 who purchased in the last 6 months"],
    )
    offer: str = Field(
        ...,
        examples=["25% discount on all products for Christmas"],
    )
    geo_scope: str = Field(..., examples=["United States"])
    language: str = Field(..., examples=["English"])


class CampaignConstraints(BaseModel):
    discount_ceiling: Optional[float] = Field(
        default=None,
        ge=0,
        le=100,
        description="Maximum discount percentage allowed.",
    )
    compliance_notes: str = Field(
        default="",
        examples=["CAN-SPAM compliant. No false urgency claims."],
    )
    send_window: str = Field(
        default="",
        examples=["December 20-26, 2025"],
    )
    exclude_segments: list[str] = Field(
        default_factory=list,
        examples=[["VIP customers", "unsubscribed"]],
    )
    required_segments: list[str] = Field(
        default_factory=list,
        examples=[["loyal customers"]],
    )


class Deliverables(BaseModel):
    number_of_emails: int = Field(..., ge=1, le=10, examples=[3])
    include_html: bool = Field(default=True)
    include_variants: bool = Field(
        default=False,
        description="Generate A/B variant subject lines and preview text.",
    )


# ── Main Request ──────────────────────────────────────────────────────────────


class CampaignRequest(BaseModel):
    campaign_name: str = Field(..., min_length=1, examples=["Christmas Sale 2025"])
    brand: BrandContext
    objective: CampaignObjective
    constraints: CampaignConstraints = Field(default_factory=CampaignConstraints)
    channels: list[Channel] = Field(
        default=[Channel.EMAIL],
        min_length=1,
        examples=[[Channel.EMAIL]],
    )
    deliverables: Deliverables

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "campaign_name": "Christmas Discount 2025",
                    "brand": {
                        "brand_name": "AcmeCorp",
                        "voice_guidelines": "Warm, festive, friendly. Use inclusive language. Avoid buzzwords.",
                        "banned_phrases": ["world-class", "revolutionary", "synergy"],
                        "required_phrases": ["Shop now", "Limited time offer"],
                        "legal_footer": "© 2025 AcmeCorp Inc. | Unsubscribe | Privacy Policy",
                        "design_tokens": {
                            "primary_color": "#B22222",
                            "secondary_color": "#FFFFFF",
                            "accent_color": "#FFD700",
                            "font_family_heading": "Georgia, serif",
                            "font_family_body": "Arial, sans-serif",
                        },
                    },
                    "objective": {
                        "primary_kpi": "revenue",
                        "secondary_kpis": ["open_rate", "click_through_rate"],
                        "target_audience": "Existing customers who purchased in the last 12 months",
                        "offer": "25% off storewide for Christmas",
                        "geo_scope": "United States",
                        "language": "English",
                    },
                    "constraints": {
                        "discount_ceiling": 25.0,
                        "compliance_notes": "CAN-SPAM compliant. No misleading subject lines.",
                        "send_window": "December 18-24, 2025",
                        "exclude_segments": ["unsubscribed", "bounced"],
                        "required_segments": ["active customers"],
                    },
                    "channels": ["email"],
                    "deliverables": {
                        "number_of_emails": 3,
                        "include_html": True,
                        "include_variants": True,
                    },
                }
            ]
        }
    }


# ── Sub-models: Response ──────────────────────────────────────────────────────


class ClarificationQuestion(BaseModel):
    field: str = Field(..., examples=["objective.offer"])
    question: str = Field(..., examples=["What specific discount or value are you offering?"])
    why_needed: str = Field(..., examples=["Required to generate accurate copy."])


class Blueprint(BaseModel):
    campaign_angle: str
    core_narrative: str
    offer_logic: str
    narrative_arc: list[str] = Field(
        description="Ordered list of narrative beats (e.g., tease → offer → urgency → close)."
    )
    kpi_mapping: dict[str, str] = Field(
        description="Maps each KPI to the tactic that drives it."
    )
    channel_strategy: dict[str, str] = Field(
        description="Per-channel execution notes."
    )
    risks: list[str] = Field(description="Identified risks and mitigations.")
    assumptions: list[str] = Field(description="Labelled assumptions made.")


class EmailAsset(BaseModel):
    email_number: int
    email_name: str = Field(description="Descriptive name, e.g. 'Teaser – Day 1'")
    subject_lines: list[str] = Field(
        min_length=2, description="At least 2 subject line options."
    )
    preview_text_options: list[str] = Field(
        min_length=2, description="At least 2 preview text options."
    )
    body_text: str = Field(description="Full email body copy (plain text).")
    ctas: list[str] = Field(min_length=1, description="Call-to-action button labels.")
    send_timing: str = Field(description="Recommended send day/time with rationale.")
    html: Optional[str] = Field(default=None, description="Production-ready HTML email.")
    accessibility_notes: list[str] = Field(
        default_factory=list,
        description="Accessibility checks and recommendations.",
    )


class CritiqueResult(BaseModel):
    issues: list[str] = Field(description="Identified issues in copy or strategy.")
    fixes: list[str] = Field(description="Suggested corrections for each issue.")
    risk_flags: list[str] = Field(
        description="High-severity flags (compliance, spam, brand safety)."
    )
    llm_commentary: str = Field(description="Overall critique commentary from LLM.")
    score: int = Field(ge=0, le=100, description="Overall quality score 0–100.")


class PhaseTimings(BaseModel):
    clarify_ms: Optional[float] = None
    research_ms: Optional[float] = None
    strategy_ms: Optional[float] = None
    execution_ms: Optional[float] = None
    production_ms: Optional[float] = None
    critique_ms: Optional[float] = None
    total_ms: Optional[float] = None


class ResponseMetadata(BaseModel):
    request_id: str
    model_used: str
    tokens_estimate: int = Field(default=0)
    timings: PhaseTimings = Field(default_factory=PhaseTimings)


class CampaignResponse(BaseModel):
    status: CampaignStatus
    clarification_questions: list[ClarificationQuestion] = Field(default_factory=list)
    blueprint: Optional[Blueprint] = None
    assets: list[EmailAsset] = Field(default_factory=list)
    critique: Optional[CritiqueResult] = None
    metadata: Optional[ResponseMetadata] = None


# ── Validation endpoint ───────────────────────────────────────────────────────


class ValidationIssue(BaseModel):
    field: str
    severity: str = Field(examples=["error", "warning", "info"])
    message: str
    suggestion: Optional[str] = None


class ValidationResponse(BaseModel):
    valid: bool
    issues: list[ValidationIssue] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)


# ── Health ────────────────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str
    version: str
    model: str
    gemini_key_configured: bool


class ReadinessResponse(BaseModel):
    ready: bool
    checks: dict[str, Any]
