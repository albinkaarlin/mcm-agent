"""
app/routes/campaigns.py – campaign generation and validation endpoints.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.models import (
    CampaignRequest,
    CampaignResponse,
    ValidationResponse,
    ValidationIssue,
)
from app.services.gemini_client import GeminiClient, get_gemini_client
from app.services.orchestrator import orchestrate_campaign
from app.services.validators import validate_campaign_request

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/campaigns", tags=["Campaigns"])


def _get_request_id(request: Request) -> str:
    return request.state.request_id if hasattr(request.state, "request_id") else "unknown"


@router.post(
    "/generate",
    response_model=CampaignResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate a full marketing campaign",
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
