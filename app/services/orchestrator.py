"""
app/services/orchestrator.py – multi-phase campaign generation workflow.

Phases
──────
1. Clarify   – detect missing inputs; return questions or proceed.
2. Research  – LLM-only knowledge research.
3. Strategy  – campaign blueprint.
4. Execution – per-email copy assets.
5. Production – HTML generation (if requested).
6. Critique  – LLM + rule-based self-review.
"""
from __future__ import annotations

import logging
import time
from typing import Any, Optional

from app.models import (
    Blueprint,
    CampaignRequest,
    CampaignResponse,
    CampaignStatus,
    ClarificationQuestion,
    CritiqueResult,
    EmailAsset,
    PhaseTimings,
    ResponseMetadata,
)
from app.services.gemini_client import GeminiClient
from app.services import prompting
from app.services.validators import run_email_rules

logger = logging.getLogger(__name__)


def _ms(start: float) -> float:
    return round((time.perf_counter() - start) * 1000, 1)


# ── External Research Stub Interface ─────────────────────────────────────────-
# This interface is cleanly designed for future implementation with real web
# browsing / search tools. Currently returns an empty result.


class ExternalResearchProvider:
    """
    Abstract interface for external research providers.
    Implement this class to add real web search, news, or competitive intelligence.
    """

    def search(self, query: str) -> list[dict[str, Any]]:
        """Perform a web search and return a list of result dicts."""
        raise NotImplementedError

    def fetch_url(self, url: str) -> str:
        """Fetch and return the text content of a URL."""
        raise NotImplementedError


class NoOpExternalResearch(ExternalResearchProvider):
    """No-op stub used when external browsing is not available."""

    def search(self, query: str) -> list[dict[str, Any]]:
        logger.debug("ExternalResearch.search called (no-op stub)", extra={"query": query})
        return []

    def fetch_url(self, url: str) -> str:
        logger.debug("ExternalResearch.fetch_url called (no-op stub)", extra={"url": url})
        return ""


# ── Phase implementations ──────────────────────────────────────────────────────


def _phase_clarify(
    req: CampaignRequest,
    client: GeminiClient,
) -> tuple[bool, list[ClarificationQuestion]]:
    """
    Phase 1 – Clarification.

    Returns (needs_clarification: bool, questions: list[ClarificationQuestion]).
    """
    prompt = prompting.build_clarify_prompt(req)
    result = client.generate_text(
        prompt=prompt,
        system_instruction=prompting.SHARED_SYSTEM_INSTRUCTION,
        json_schema=prompting.CLARIFY_SCHEMA,
        temperature=0.1,  # deterministic for clarification
    )
    parsed = result.get("parsed") or {}

    needs = bool(parsed.get("needs_clarification", False))
    raw_questions = parsed.get("questions", [])
    questions = [
        ClarificationQuestion(
            field=q.get("field", "unknown"),
            question=q.get("question", ""),
            why_needed=q.get("why_needed", ""),
        )
        for q in raw_questions
        if isinstance(q, dict)
    ]
    return needs, questions


def _phase_research(
    req: CampaignRequest,
    client: GeminiClient,
    external: Optional[ExternalResearchProvider] = None,
) -> dict[str, Any]:
    """
    Phase 2 – Research.

    Combines LLM knowledge research with optional external research stub.
    """
    if external is None:
        external = NoOpExternalResearch()

    # External research stub (no-op by default)
    external_results = external.search(
        f"{req.brand.brand_name} {req.objective.offer} marketing trends"
    )
    if external_results:
        logger.info("External research returned %d results", len(external_results))

    # LLM knowledge research
    prompt = prompting.build_research_prompt(req)
    result = client.generate_text(
        prompt=prompt,
        system_instruction=prompting.SHARED_SYSTEM_INSTRUCTION,
        json_schema=prompting.RESEARCH_SCHEMA,
        temperature=0.3,
    )
    research_data: dict[str, Any] = result.get("parsed") or {
        "audience_insights": [],
        "channel_insights": [],
        "seasonal_context": "",
        "competitive_considerations": [],
        "assumptions": [],
    }

    # Merge external results into research (stubbed – just log for now)
    if external_results:
        research_data["external_results_count"] = len(external_results)

    return research_data


def _phase_strategy(
    req: CampaignRequest,
    research: dict[str, Any],
    client: GeminiClient,
) -> tuple[Blueprint, dict[str, Any]]:
    """
    Phase 3 – Strategy.

    Returns (Blueprint Pydantic model, raw blueprint dict).
    """
    prompt = prompting.build_strategy_prompt(req, research)
    result = client.generate_text(
        prompt=prompt,
        system_instruction=prompting.SHARED_SYSTEM_INSTRUCTION,
        json_schema=prompting.STRATEGY_SCHEMA,
        temperature=0.5,
    )
    raw: dict[str, Any] = result.get("parsed") or {}

    blueprint = Blueprint(
        campaign_angle=raw.get("campaign_angle", ""),
        core_narrative=raw.get("core_narrative", ""),
        offer_logic=raw.get("offer_logic", ""),
        narrative_arc=raw.get("narrative_arc", []),
        kpi_mapping=raw.get("kpi_mapping", {}),
        channel_strategy=raw.get("channel_strategy", {}),
        risks=raw.get("risks", []),
        assumptions=raw.get("assumptions", []),
    )
    return blueprint, raw


def _phase_execution(
    req: CampaignRequest,
    blueprint_raw: dict[str, Any],
    client: GeminiClient,
) -> tuple[list[EmailAsset], list[dict[str, Any]]]:
    """
    Phase 4 – Execution.

    Generates copy for each email sequentially.
    Returns (list of EmailAsset models, list of raw dicts).
    """
    num_emails = req.deliverables.number_of_emails
    narrative_arc: list[str] = blueprint_raw.get("narrative_arc", [])

    # Pad/trim arc beats to match number of emails
    beats = (narrative_arc + [f"Email {i+1}" for i in range(num_emails)])[:num_emails]

    assets: list[EmailAsset] = []
    raw_emails: list[dict[str, Any]] = []

    for idx in range(num_emails):
        beat = beats[idx] if beats else f"Email {idx + 1}"
        prompt = prompting.build_execution_prompt(req, blueprint_raw, idx, beat)
        result = client.generate_text(
            prompt=prompt,
            system_instruction=prompting.SHARED_SYSTEM_INSTRUCTION,
            json_schema=prompting.EXECUTION_SCHEMA["properties"]["emails"]["items"],
            temperature=0.7,  # More creative for copy
        )
        raw_email: dict[str, Any] = result.get("parsed") or {}

        # Ensure email_number is correct
        raw_email["email_number"] = idx + 1
        raw_emails.append(raw_email)

        asset = EmailAsset(
            email_number=idx + 1,
            email_name=raw_email.get("email_name", f"Email {idx + 1}"),
            subject_lines=raw_email.get("subject_lines", [f"Subject for email {idx + 1}"]),
            preview_text_options=raw_email.get("preview_text_options", ["Preview text"]),
            body_text=raw_email.get("body_text", ""),
            ctas=raw_email.get("ctas", ["Shop Now"]),
            send_timing=raw_email.get("send_timing", ""),
            html=None,  # Populated in production phase if requested
            accessibility_notes=[],
        )
        assets.append(asset)
        logger.debug("Generated email %d/%d", idx + 1, num_emails)

    return assets, raw_emails


def _phase_production(
    req: CampaignRequest,
    assets: list[EmailAsset],
    raw_emails: list[dict[str, Any]],
    client: GeminiClient,
) -> list[EmailAsset]:
    """
    Phase 5 – HTML Production.

    Generates responsive HTML for each email asset.
    """
    updated_assets: list[EmailAsset] = []
    for asset, raw_email in zip(assets, raw_emails):
        prompt = prompting.build_production_prompt(req, raw_email)
        result = client.generate_text(
            prompt=prompt,
            system_instruction=prompting.SHARED_SYSTEM_INSTRUCTION,
            json_schema=prompting.PRODUCTION_SCHEMA,
            temperature=0.2,  # Low temperature – deterministic HTML
            max_output_tokens=8192,
        )
        raw_prod: dict[str, Any] = result.get("parsed") or {}

        updated = asset.model_copy(
            update={
                "html": raw_prod.get("html", ""),
                "accessibility_notes": raw_prod.get("accessibility_notes", []),
            }
        )
        updated_assets.append(updated)
        logger.debug("Generated HTML for email %d", asset.email_number)

    return updated_assets


def _phase_critique(
    req: CampaignRequest,
    blueprint_raw: dict[str, Any],
    assets: list[EmailAsset],
    raw_emails: list[dict[str, Any]],
    client: GeminiClient,
) -> CritiqueResult:
    """
    Phase 6 – Critique.

    Merges LLM critique + deterministic rule-based checks.
    """
    # ── LLM critique ──────────────────────────────────────────────────────────
    prompt = prompting.build_critique_prompt(req, blueprint_raw, raw_emails)
    result = client.generate_text(
        prompt=prompt,
        system_instruction=prompting.SHARED_SYSTEM_INSTRUCTION,
        json_schema=prompting.CRITIQUE_SCHEMA,
        temperature=0.2,
    )
    llm_raw: dict[str, Any] = result.get("parsed") or {}

    llm_issues: list[str] = llm_raw.get("issues", [])
    llm_fixes: list[str] = llm_raw.get("fixes", [])
    llm_flags: list[str] = llm_raw.get("risk_flags", [])
    llm_commentary: str = llm_raw.get("llm_commentary", "")
    llm_score: int = int(llm_raw.get("score", 70))

    # ── Rule-based checks ─────────────────────────────────────────────────────
    rule_issues: list[str] = []
    rule_flags: list[str] = []
    rule_fixes: list[str] = []

    for email_raw in raw_emails:
        rule_result = run_email_rules(req, email_raw)
        rule_issues.extend(rule_result.issues)
        rule_flags.extend(rule_result.risk_flags)
        rule_fixes.extend(rule_result.fixes)

    # Adjust score downward for rule violations
    penalty_per_issue = 3
    adjusted_score = max(0, llm_score - (len(rule_issues) * penalty_per_issue))

    return CritiqueResult(
        issues=llm_issues + rule_issues,
        fixes=llm_fixes + rule_fixes,
        risk_flags=llm_flags + rule_flags,
        llm_commentary=llm_commentary,
        score=adjusted_score,
    )


# ── Main orchestration entry point ────────────────────────────────────────────


def orchestrate_campaign(
    req: CampaignRequest,
    request_id: str,
    client: GeminiClient,
    external_research: Optional[ExternalResearchProvider] = None,
) -> CampaignResponse:
    """
    Run the full multi-phase campaign generation workflow.

    Returns a CampaignResponse with status = 'completed' or 'needs_clarification'.
    """
    timings = PhaseTimings()
    total_start = time.perf_counter()
    total_tokens = 0

    logger.info(
        "Campaign orchestration started",
        extra={"request_id": request_id, "campaign": req.campaign_name},
    )

    # ── Phase 1: Clarification ────────────────────────────────────────────────
    t = time.perf_counter()
    needs_clarification, questions = _phase_clarify(req, client)
    timings.clarify_ms = _ms(t)

    if needs_clarification:
        logger.info(
            "Needs clarification",
            extra={"request_id": request_id, "questions": len(questions)},
        )
        timings.total_ms = _ms(total_start)
        return CampaignResponse(
            status=CampaignStatus.NEEDS_CLARIFICATION,
            clarification_questions=questions,
            metadata=ResponseMetadata(
                request_id=request_id,
                model_used=client._model,
                tokens_estimate=0,
                timings=timings,
            ),
        )

    # ── Phase 2: Research ─────────────────────────────────────────────────────
    t = time.perf_counter()
    research = _phase_research(req, client, external_research)
    timings.research_ms = _ms(t)

    # ── Phase 3: Strategy ──────────────────────────────────────────────────────
    t = time.perf_counter()
    blueprint, blueprint_raw = _phase_strategy(req, research, client)
    timings.strategy_ms = _ms(t)

    # ── Phase 4: Execution ─────────────────────────────────────────────────────
    t = time.perf_counter()
    assets, raw_emails = _phase_execution(req, blueprint_raw, client)
    timings.execution_ms = _ms(t)

    # ── Phase 5: HTML Production ──────────────────────────────────────────────
    if req.deliverables.include_html:
        t = time.perf_counter()
        assets = _phase_production(req, assets, raw_emails, client)
        timings.production_ms = _ms(t)

    # ── Phase 6: Critique ──────────────────────────────────────────────────────
    t = time.perf_counter()
    critique = _phase_critique(req, blueprint_raw, assets, raw_emails, client)
    timings.critique_ms = _ms(t)

    timings.total_ms = _ms(total_start)

    logger.info(
        "Campaign orchestration complete",
        extra={
            "request_id": request_id,
            "total_ms": timings.total_ms,
            "critique_score": critique.score,
        },
    )

    return CampaignResponse(
        status=CampaignStatus.COMPLETED,
        blueprint=blueprint,
        assets=assets,
        critique=critique,
        metadata=ResponseMetadata(
            request_id=request_id,
            model_used=client._model,
            tokens_estimate=total_tokens,
            timings=timings,
        ),
    )
