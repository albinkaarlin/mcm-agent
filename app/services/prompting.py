"""
app/services/prompting.py – prompt templates for every workflow phase.

Design principles
─────────────────
• Every prompt explicitly requests strict JSON output.
• All prompts embed the JSON schema directly so the model understands the shape.
• System instructions emphasize: no hallucination, label assumptions, brand safety.
• Templates use simple string formatting (no heavy templating engine dependency).
"""
from __future__ import annotations

from typing import Any

from app.models import CampaignRequest

# ── Shared system instruction ─────────────────────────────────────────────────

SHARED_SYSTEM_INSTRUCTION = """\
You are Mark, a senior marketing strategist and award-winning copywriter with deep \
expertise in email marketing, brand strategy, and conversion optimisation.

HARD RULES – you must follow these without exception:
1. Do NOT hallucinate facts, statistics, or claims. If you are unsure, label it as an assumption.
2. Follow brand voice guidelines strictly. Never use banned phrases.
3. Keep all claims conservative and verifiable.
4. Output ONLY valid JSON matching the supplied schema — no markdown, no commentary outside JSON.
5. Label every assumption you make inside the "assumptions" array.
6. If you identify a compliance risk, flag it explicitly.
7. Use the provided language for all copy.
"""

# ── Phase 1 – Clarification ───────────────────────────────────────────────────

CLARIFY_SCHEMA: dict = {
    "type": "object",
    "required": ["needs_clarification", "questions"],
    "properties": {
        "needs_clarification": {"type": "boolean"},
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["field", "question", "why_needed"],
                "properties": {
                    "field": {"type": "string"},
                    "question": {"type": "string"},
                    "why_needed": {"type": "string"},
                },
            },
        },
    },
}


def build_clarify_prompt(req: CampaignRequest) -> str:
    missing: list[str] = []

    if not req.objective.offer or len(req.objective.offer) < 10:
        missing.append("objective.offer")
    if not req.objective.target_audience or len(req.objective.target_audience) < 10:
        missing.append("objective.target_audience")
    if not req.objective.geo_scope:
        missing.append("objective.geo_scope")
    if not req.objective.language:
        missing.append("objective.language")
    if req.deliverables.number_of_emails < 1:
        missing.append("deliverables.number_of_emails")

    missing_str = ", ".join(missing) if missing else "none"

    return f"""\
Analyse the following campaign request and determine if any CRITICAL information is \
missing or ambiguous. Critical fields are: primary_kpi, target_audience, offer, \
language, geo_scope, number_of_emails.

Potentially missing fields detected: {missing_str}

CAMPAIGN REQUEST (JSON):
{req.model_dump_json(indent=2)}

Your task:
- If critical information is genuinely missing or too vague to proceed safely, \
set "needs_clarification" to true and provide 3–7 targeted, specific questions.
- Each question must reference the exact field path (e.g. "objective.offer").
- If the request is complete enough to proceed, set "needs_clarification" to false \
and return an empty questions array.

Return ONLY this JSON structure:
{{
  "needs_clarification": <true|false>,
  "questions": [
    {{"field": "...", "question": "...", "why_needed": "..."}}
  ]
}}
"""


# ── Phase 2 – Research ────────────────────────────────────────────────────────

RESEARCH_SCHEMA: dict = {
    "type": "object",
    "required": ["audience_insights", "channel_insights", "seasonal_context", "assumptions"],
    "properties": {
        "audience_insights": {
            "type": "array",
            "items": {"type": "string"},
        },
        "channel_insights": {
            "type": "array",
            "items": {"type": "string"},
        },
        "seasonal_context": {"type": "string"},
        "competitive_considerations": {
            "type": "array",
            "items": {"type": "string"},
        },
        "assumptions": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
}


def build_research_prompt(req: CampaignRequest) -> str:
    return f"""\
You are conducting knowledge-based research (no external browsing) for the following \
marketing campaign. Use your training knowledge to synthesise relevant insights.

CAMPAIGN BRIEF:
- Brand: {req.brand.brand_name}
- Offer: {req.objective.offer}
- Audience: {req.objective.target_audience}
- Geo: {req.objective.geo_scope}
- Language: {req.objective.language}
- Channels: {[c.value for c in req.channels]}
- Primary KPI: {req.objective.primary_kpi.value}

Research tasks:
1. Provide 3–5 audience behaviour insights relevant to this campaign.
2. Provide 3–5 email/channel best-practice insights relevant to the geo and offer type.
3. Summarise relevant seasonal or contextual factors.
4. Note 2–3 competitive considerations (general, not specific competitor claims).
5. Label all assumptions clearly.

Return ONLY valid JSON matching this structure:
{{
  "audience_insights": ["..."],
  "channel_insights": ["..."],
  "seasonal_context": "...",
  "competitive_considerations": ["..."],
  "assumptions": ["ASSUMPTION: ..."]
}}
"""


# ── Phase 3 – Strategy ────────────────────────────────────────────────────────

STRATEGY_SCHEMA: dict = {
    "type": "object",
    "required": [
        "campaign_angle",
        "core_narrative",
        "offer_logic",
        "narrative_arc",
        "kpi_mapping",
        "channel_strategy",
        "risks",
        "assumptions",
    ],
    "properties": {
        "campaign_angle": {"type": "string"},
        "core_narrative": {"type": "string"},
        "offer_logic": {"type": "string"},
        "narrative_arc": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 2,
        },
        "kpi_mapping": {
            "type": "object",
            "additionalProperties": {"type": "string"},
        },
        "channel_strategy": {
            "type": "object",
            "additionalProperties": {"type": "string"},
        },
        "risks": {"type": "array", "items": {"type": "string"}},
        "assumptions": {"type": "array", "items": {"type": "string"}},
    },
}


def build_strategy_prompt(req: CampaignRequest, research: dict[str, Any]) -> str:
    return f"""\
Create a comprehensive campaign strategy (blueprint) for the following brief. \
Ground your strategy in the research insights provided.

CAMPAIGN BRIEF:
- Campaign Name: {req.campaign_name}
- Brand: {req.brand.brand_name}
- Brand Voice: {req.brand.voice_guidelines}
- Offer: {req.objective.offer}
- Primary KPI: {req.objective.primary_kpi.value}
- Secondary KPIs: {[k.value for k in req.objective.secondary_kpis]}
- Target Audience: {req.objective.target_audience}
- Geo: {req.objective.geo_scope} | Language: {req.objective.language}
- Channels: {[c.value for c in req.channels]}
- Number of Emails: {req.deliverables.number_of_emails}
- Discount Ceiling: {req.constraints.discount_ceiling}%
- Compliance Notes: {req.constraints.compliance_notes}
- Send Window: {req.constraints.send_window}
- Banned Phrases: {req.brand.banned_phrases}
- Required Phrases: {req.brand.required_phrases}

RESEARCH INSIGHTS:
{_format_research(research)}

Strategy tasks:
1. Define the single, compelling campaign angle (1–2 sentences).
2. Write the core narrative arc that unifies all {req.deliverables.number_of_emails} \
emails.
3. Explain the offer logic (why this offer, why now, why for this audience).
4. List the narrative arc as ordered beats (e.g., Tease → Announce → Urgency → Final Push).
5. Map each KPI to the primary tactic that drives it.
6. Provide channel-specific execution notes.
7. Identify 2–4 risks and mitigation notes.
8. Label all assumptions.

Return ONLY valid JSON:
{{
  "campaign_angle": "...",
  "core_narrative": "...",
  "offer_logic": "...",
  "narrative_arc": ["Beat 1: ...", "Beat 2: ...", ...],
  "kpi_mapping": {{"revenue": "...", "open_rate": "..."}},
  "channel_strategy": {{"email": "..."}},
  "risks": ["Risk: ... | Mitigation: ..."],
  "assumptions": ["ASSUMPTION: ..."]
}}
"""


# ── Phase 4 – Execution (copy assets) ────────────────────────────────────────

EXECUTION_SCHEMA: dict = {
    "type": "object",
    "required": ["emails"],
    "properties": {
        "emails": {
            "type": "array",
            "items": {
                "type": "object",
                "required": [
                    "email_number",
                    "email_name",
                    "subject_lines",
                    "preview_text_options",
                    "body_text",
                    "ctas",
                    "send_timing",
                ],
                "properties": {
                    "email_number": {"type": "integer"},
                    "email_name": {"type": "string"},
                    "subject_lines": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 3,
                    },
                    "preview_text_options": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 2,
                    },
                    "body_text": {"type": "string"},
                    "ctas": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 1,
                    },
                    "send_timing": {"type": "string"},
                },
            },
        }
    },
}


def build_execution_prompt(
    req: CampaignRequest,
    blueprint: dict[str, Any],
    email_index: int,
    narrative_beat: str,
) -> str:
    email_num = email_index + 1
    total = req.deliverables.number_of_emails

    return f"""\
Write email #{email_num} of {total} for the following campaign.

CAMPAIGN CONTEXT:
- Campaign: {req.campaign_name}
- Brand: {req.brand.brand_name}
- Brand Voice: {req.brand.voice_guidelines}
- Banned Phrases: {req.brand.banned_phrases}
- Required Phrases: {req.brand.required_phrases}
- Legal Footer: {req.brand.legal_footer}
- Offer: {req.objective.offer}
- Audience: {req.objective.target_audience}
- Geo/Language: {req.objective.geo_scope} / {req.objective.language}
- Compliance: {req.constraints.compliance_notes}
- Send Window: {req.constraints.send_window}

CAMPAIGN STRATEGY:
- Angle: {blueprint.get('campaign_angle', '')}
- Core Narrative: {blueprint.get('core_narrative', '')}

THIS EMAIL'S NARRATIVE BEAT: {narrative_beat}

COPY REQUIREMENTS:
- Write 3+ distinct subject lines (A/B testable). Keep under 50 characters where possible.
- Write 2 preview text options (under 90 characters each).
- Write the full email body. Use brand voice. Include the legal footer at the end.
- Write 1–3 CTA options (button label text).
- Recommend the ideal send day/time within the send window: {req.constraints.send_window}. \
Give a reason.
- Do NOT use any banned phrases: {req.brand.banned_phrases}
- Naturally include required phrases where appropriate: {req.brand.required_phrases}

Return ONLY valid JSON:
{{
  "email_number": {email_num},
  "email_name": "...",
  "subject_lines": ["...", "...", "..."],
  "preview_text_options": ["...", "..."],
  "body_text": "... (full email body with legal footer at end) ...",
  "ctas": ["...", "..."],
  "send_timing": "..."
}}
"""


# ── Phase 5 – HTML Production ─────────────────────────────────────────────────

PRODUCTION_SCHEMA: dict = {
    "type": "object",
    "required": ["html", "accessibility_notes"],
    "properties": {
        "html": {"type": "string"},
        "accessibility_notes": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
}


def build_production_prompt(
    req: CampaignRequest,
    email_asset: dict[str, Any],
) -> str:
    dt = req.brand.design_tokens
    return f"""\
Generate a production-ready, responsive HTML email for the copy below.

DESIGN TOKENS:
- Primary colour: {dt.primary_color}
- Secondary colour: {dt.secondary_color}
- Accent colour: {dt.accent_color or 'none'}
- Heading font: {dt.font_family_heading}
- Body font: {dt.font_family_body}
- Base font size: {dt.font_size_base}
- Line height: {dt.line_height}
- Spacing unit: {dt.spacing_unit}
- Border radius: {dt.border_radius}
{f"- Logo URL: {dt.logo_url}" if dt.logo_url else ""}
{"- Reference HTML style (match this look): [REFERENCE PROVIDED]" if req.brand.example_email_html else ""}

EMAIL COPY:
- Subject (use first option): {email_asset.get('subject_lines', [''])[0]}
- Preview text: {email_asset.get('preview_text_options', [''])[0]}
- Body text: {email_asset.get('body_text', '')}
- Primary CTA label: {email_asset.get('ctas', ['Shop Now'])[0]}

HTML REQUIREMENTS:
1. Use table-based layout for maximum email client compatibility.
2. Inline all CSS.
3. Include a responsive meta viewport tag.
4. Add alt text to all images (use descriptive placeholders if no images).
5. CTA button must be bulletproof (VML fallback for Outlook).
6. Include web-safe font fallbacks.
7. Honour the design tokens above strictly.
8. Include the legal footer.
9. After the HTML, list all accessibility checks you performed.

Return ONLY valid JSON:
{{
  "html": "<!DOCTYPE html>...",
  "accessibility_notes": ["...", "..."]
}}
"""


# ── Phase 6 – Critique ────────────────────────────────────────────────────────

CRITIQUE_SCHEMA: dict = {
    "type": "object",
    "required": ["issues", "fixes", "risk_flags", "llm_commentary", "score"],
    "properties": {
        "issues": {"type": "array", "items": {"type": "string"}},
        "fixes": {"type": "array", "items": {"type": "string"}},
        "risk_flags": {"type": "array", "items": {"type": "string"}},
        "llm_commentary": {"type": "string"},
        "score": {"type": "integer", "minimum": 0, "maximum": 100},
    },
}


def build_critique_prompt(
    req: CampaignRequest,
    blueprint: dict[str, Any],
    emails: list[dict[str, Any]],
) -> str:
    email_summaries = "\n".join(
        f"Email {e.get('email_number')}: SL={e.get('subject_lines', [])[:1]}, "
        f"CTA={e.get('ctas', [])[:1]}, Body=({len(e.get('body_text',''))} chars)"
        for e in emails
    )
    return f"""\
You are a senior marketing quality-assurance reviewer and compliance expert. \
Conduct a rigorous critique of the following campaign.

BRAND CONSTRAINTS:
- Brand Voice: {req.brand.voice_guidelines}
- Banned Phrases: {req.brand.banned_phrases}
- Required Phrases: {req.brand.required_phrases}
- Legal Footer required: {"Yes" if req.brand.legal_footer else "No"}
- Compliance Notes: {req.constraints.compliance_notes}

CAMPAIGN OBJECTIVE:
- Primary KPI: {req.objective.primary_kpi.value}
- Offer: {req.objective.offer}
- Audience: {req.objective.target_audience}

STRATEGY BLUEPRINT:
- Angle: {blueprint.get('campaign_angle', '')}

GENERATED EMAILS SUMMARY:
{email_summaries}

FULL EMAIL BODIES:
{_format_email_bodies(emails)}

Critique checklist (check all of these):
1. Brand voice alignment – does copy match the voice guidelines?
2. Banned phrases – are any banned phrases present in any email?
3. Required phrases – are all required phrases included where appropriate?
4. Legal footer – is it present and complete in every email?
5. Spam risk – excessive exclamation marks, ALL CAPS, spammy trigger words?
6. Compliance – any misleading claims, unverified statistics, false urgency?
7. Clarity – are the subject lines clear and under 50 chars?
8. CTA effectiveness – are the CTAs action-oriented and clear?
9. KPI alignment – does the copy drive the stated primary KPI?
10. Overall quality – flow, tone, readability.

For each issue found:
- State the issue clearly (which email / field).
- Provide a concrete suggested fix.
- Flag as risk_flag if it is a compliance, spam, or brand-safety issue.

Score the campaign 0–100 overall (100 = flawless).

Return ONLY valid JSON:
{{
  "issues": ["Email 1: ..."],
  "fixes": ["Fix for Email 1: ..."],
  "risk_flags": ["RISK: ..."],
  "llm_commentary": "Overall assessment...",
  "score": 85
}}
"""


# ── Utilities ─────────────────────────────────────────────────────────────────


def _format_research(research: dict[str, Any]) -> str:
    lines: list[str] = []
    for key, val in research.items():
        if isinstance(val, list):
            lines.append(f"{key}:")
            for item in val:
                lines.append(f"  - {item}")
        else:
            lines.append(f"{key}: {val}")
    return "\n".join(lines)


def _format_email_bodies(emails: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    for e in emails:
        num = e.get("email_number", "?")
        body = e.get("body_text", "(no body)")
        parts.append(f"--- EMAIL {num} BODY ---\n{body}")
    return "\n\n".join(parts)
