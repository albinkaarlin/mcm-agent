"""
app/routes/campaigns.py – campaign generation and validation endpoints.
"""
from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.models import (
    BrandContext,
    CampaignConstraints,
    CampaignObjective,
    CampaignRequest,
    CampaignResponse,
    Deliverables,
    EmailEditRequest,
    EmailEditResponse,
    PrimaryKPI,
    PromptRequest,
    SimpleCampaignResponse,
    SimpleClarificationQuestion,
    SimpleEmail,
    SimpleSummary,
    ValidationIssue,
    ValidationResponse,
)
from app.services.gemini_client import GeminiClient, get_gemini_client
from app.services.orchestrator import orchestrate_campaign
from app.services import prompting
from app.services.validators import validate_campaign_request

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/campaigns", tags=["Campaigns"])


def _get_request_id(request: Request) -> str:
    return request.state.request_id if hasattr(request.state, "request_id") else str(uuid.uuid4())


# ── helpers ───────────────────────────────────────────────────────────────────


def _build_campaign_request(parsed: dict) -> CampaignRequest:
    """Reconstruct a CampaignRequest from the parse-phase output dict."""
    raw_kpi = parsed.get("primary_kpi", "revenue")
    try:
        kpi = PrimaryKPI(raw_kpi)
    except ValueError:
        kpi = PrimaryKPI.REVENUE

    return CampaignRequest(
        campaign_name=parsed.get("campaign_name") or "My Campaign",
        brand=BrandContext(
            brand_name=parsed.get("brand_name") or "My Brand",
            voice_guidelines=parsed.get("voice_guidelines") or "Professional and friendly.",
            banned_phrases=parsed.get("banned_phrases") or [],
            required_phrases=parsed.get("required_phrases") or [],
            legal_footer=parsed.get("legal_footer") or "",
        ),
        objective=CampaignObjective(
            primary_kpi=kpi,
            target_audience=parsed.get("target_audience") or "General audience",
            offer=parsed.get("offer") or "Special offer",
            geo_scope=parsed.get("geo_scope") or "Global",
            language=parsed.get("language") or "English",
        ),
        constraints=CampaignConstraints(
            compliance_notes=parsed.get("compliance_notes") or "",
            send_window=parsed.get("send_window") or "",
            discount_ceiling=parsed.get("discount_ceiling"),
        ),
        deliverables=Deliverables(
            number_of_emails=int(parsed.get("number_of_emails") or 3),
            include_html=bool(parsed.get("include_html", True)),
            include_variants=False,
        ),
    )


def _map_to_simple_response(
    campaign_req: CampaignRequest,
    campaign_resp: CampaignResponse,
    request_id: str,
) -> SimpleCampaignResponse:
    """Map the full CampaignResponse to the lean shape the frontend expects."""
    emails: list[SimpleEmail] = []
    for asset in campaign_resp.assets:
        compliance = " | ".join(filter(None, [
            campaign_req.constraints.compliance_notes,
            campaign_req.brand.legal_footer,
        ])) or "Standard compliance applied."

        emails.append(
            SimpleEmail(
                id=f"email-{asset.email_number}",
                subject=asset.subject_lines[0] if asset.subject_lines else asset.email_name,
                html_content=asset.html or "",
                summary=SimpleSummary(
                    target_group=campaign_req.objective.target_audience,
                    regional_adaptation=(
                        f"{campaign_req.objective.geo_scope}"
                        + (f" — {campaign_req.constraints.send_window}"
                           if campaign_req.constraints.send_window else "")
                    ),
                    tone_decision=campaign_req.brand.voice_guidelines[:150],
                    legal_considerations=compliance,
                ),
            )
        )
    return SimpleCampaignResponse(
        id=request_id,
        status="completed",
        emails=emails,
    )


# ── Routes ────────────────────────────────────────────────────────────────────


@router.post(
    "/generate-from-prompt",
    response_model=SimpleCampaignResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate a campaign from a free-form prompt",
    description=(
        "Accepts a single natural-language prompt. "
        "Phase 0 parses it into structured fields via Gemini. "
        "If more info is needed, returns needs_clarification with questions. "
        "Otherwise runs the full pipeline and returns frontend-shaped emails."
    ),
)
async def generate_from_prompt(
    payload: PromptRequest,
    request: Request,
    client: GeminiClient = Depends(get_gemini_client),
) -> SimpleCampaignResponse:
    request_id = _get_request_id(request)
    logger.info("POST /generate-from-prompt", extra={"request_id": request_id})

    # ── Phase 0: parse free-form prompt ───────────────────────────────────────
    try:
        parse_result = client.generate_text(
            prompt=prompting.build_parse_prompt(payload.prompt),
            system_instruction=prompting.SHARED_SYSTEM_INSTRUCTION,
            json_schema=prompting.PARSE_SCHEMA,
            temperature=0.1,
        )
    except Exception as exc:
        logger.exception("Parse phase failed", extra={"request_id": request_id})
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    parsed = parse_result.get("parsed") or {}

    # Needs clarification → return questions to frontend
    if parsed.get("needs_clarification"):
        questions = [
            SimpleClarificationQuestion(
                field=q.get("field", ""),
                question=q.get("question", ""),
            )
            for q in (parsed.get("questions") or [])
        ]
        return SimpleCampaignResponse(
            id=request_id,
            status="needs_clarification",
            questions=questions,
        )

    # ── Build structured request and run pipeline ─────────────────────────────
    campaign_data = parsed.get("campaign") or {}
    try:
        campaign_req = _build_campaign_request(campaign_data)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not parse campaign fields: {exc}") from exc

    try:
        campaign_resp = orchestrate_campaign(
            req=campaign_req,
            request_id=request_id,
            client=client,
        )
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Campaign generation failed", extra={"request_id": request_id})
        raise HTTPException(status_code=503, detail="Campaign generation failed. Please retry.") from exc

    # Handle LLM-requested clarification from phase 1
    if campaign_resp.status.value == "needs_clarification":
        questions = [
            SimpleClarificationQuestion(field=q.field, question=q.question)
            for q in campaign_resp.clarification_questions
        ]
        return SimpleCampaignResponse(
            id=request_id,
            status="needs_clarification",
            questions=questions,
        )

    return _map_to_simple_response(campaign_req, campaign_resp, request_id)


@router.post(
    "/edit-email",
    response_model=EmailEditResponse,
    status_code=status.HTTP_200_OK,
    summary="Edit a single email with natural-language instructions",
    description="Regenerates a single email HTML given the current HTML and user instructions.",
)
async def edit_email(
    payload: EmailEditRequest,
    request: Request,
    client: GeminiClient = Depends(get_gemini_client),
) -> EmailEditResponse:
    request_id = _get_request_id(request)
    logger.info("POST /edit-email", extra={"request_id": request_id, "email_id": payload.email_id})

    try:
        result = client.generate_text(
            prompt=prompting.build_edit_email_prompt(
                current_html=payload.current_html,
                subject=payload.subject,
                instructions=payload.instructions,
            ),
            system_instruction=prompting.SHARED_SYSTEM_INSTRUCTION,
            json_schema=None,  # raw HTML response
            temperature=0.3,
            max_output_tokens=8192,
        )
    except Exception as exc:
        logger.exception("Edit email failed", extra={"request_id": request_id})
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    # Strip any markdown fences the model may wrap around HTML
    html = result.get("text", "").strip()
    for fence in ("```html", "```"):
        if html.startswith(fence):
            html = html[len(fence):].strip()
    if html.endswith("```"):
        html = html[:-3].strip()

    updated_email = SimpleEmail(
        id=payload.email_id,
        subject=payload.subject,
        html_content=html,
        summary=SimpleSummary(),  # summary unchanged for edits
    )
    return EmailEditResponse(email=updated_email)


@router.post(
    "/generate",
    response_model=CampaignResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate a full marketing campaign (structured input)",
    description=(
        "Accepts a CampaignRequest and runs the multi-phase Mark workflow: "
        "Clarify → Research → Strategy → Execution → Production → Critique. "
        "Returns a structured CampaignResponse."
    ),
    responses={
        200: {
            "description": "Campaign generated or clarification requested.",
        },
        422: {"description": "Validation error in the request payload."},
        503: {"description": "Gemini API unavailable."},
    },
)
async def generate_campaign(
    payload: CampaignRequest,
    request: Request,
    client: GeminiClient = Depends(get_gemini_client),
) -> CampaignResponse:
    request_id = _get_request_id(request)
    logger.info(
        "POST /generate",
        extra={
            "request_id": request_id,
            "campaign_name": payload.campaign_name,
        },
    )

    # Pre-generation field validation
    pre_issues = validate_campaign_request(payload)
    errors = [i for i in pre_issues if i.severity == "error"]
    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=[
                {"field": i.field, "message": i.message, "suggestion": i.suggestion}
                for i in errors
            ],
        )

    try:
        response = orchestrate_campaign(
            req=payload,
            request_id=request_id,
            client=client,
        )
    except ValueError as exc:
        logger.error("Configuration error: %s", exc, extra={"request_id": request_id})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )
    except Exception as exc:
        logger.exception(
            "Unexpected error during campaign generation",
            extra={"request_id": request_id},
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Campaign generation failed. Please retry.",
        ) from exc

    return response


@router.post(
    "/validate",
    response_model=ValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate a campaign request",
    description=(
        "Validates a CampaignRequest (or partial payload) and returns a list of "
        "issues and recommendations WITHOUT generating a full campaign. Fast and free."
    ),
)
async def validate_campaign(
    payload: CampaignRequest,
    request: Request,
) -> ValidationResponse:
    request_id = _get_request_id(request)
    logger.info(
        "POST /validate",
        extra={"request_id": request_id, "campaign_name": payload.campaign_name},
    )

    issues: list[ValidationIssue] = validate_campaign_request(payload)

    recommendations: list[str] = []
    if not issues:
        recommendations.append("Request appears complete. Ready to generate.")
    else:
        error_count = sum(1 for i in issues if i.severity == "error")
        warn_count = sum(1 for i in issues if i.severity == "warning")
        if error_count:
            recommendations.append(
                f"Fix {error_count} error(s) before generating to avoid failures."
            )
        if warn_count:
            recommendations.append(
                f"Address {warn_count} warning(s) to improve output quality."
            )

    return ValidationResponse(
        valid=not any(i.severity == "error" for i in issues),
        issues=issues,
        recommendations=recommendations,
    )
