"""
app/services/hubspot.py — load and parse company data from hubspot_data.json.

Provides a single public function:
    load_company_profile(company_identifier=None) -> dict | None

The returned compact dict is safe to embed in a Gemini prompt because it contains
only the most relevant fields (no raw CSV, no secrets, no large free-text).
"""
from __future__ import annotations

import csv
import json
import logging
import time
from io import StringIO
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# hubspot_data.json lives next to the mcm-agent package root (two dirs up from here).
_DATA_FILE = Path(__file__).parent.parent.parent / "hubspot_data.json"

# Map canonical profile keys to possible CSV column names (case-insensitive).
_FIELD_MAP: dict[str, list[str]] = {
    "company_name": ["name", "company_name", "company", "organisation", "organization"],
    "website":      ["domain", "website", "url", "homepage"],
    "industry":     ["industry", "sector", "vertical"],
    "location":     ["city", "location", "country", "region", "hq_city", "hq_country"],
    "description":  ["description", "short_description", "about", "summary", "business_type"],
    "key_offer":    ["key_offer", "offer", "product", "service", "value_proposition"],
}


def _first(row: dict, candidates: list[str]) -> str:
    """Return the first non-empty value whose key appears in *candidates*."""
    for key in candidates:
        val = row.get(key, "").strip()
        if val:
            return val
    return ""


def _normalise_row(row: dict) -> dict:
    """Strip and lower-case all keys in a CSV row."""
    return {k.strip().lower(): v.strip() for k, v in row.items()}


def load_company_profile(company_identifier: Optional[str] = None) -> Optional[dict]:
    """
    Read hubspot_data.json, parse companiesCsv, and return a compact company_profile.

    Args:
        company_identifier: optional domain or company name fragment used to select a
                            specific company row (case-insensitive substring match).
                            If None — or no row matches — returns the first row or the
                            row with the highest "score" value if that column exists.

    Returns:
        dict with keys: company_name, website, industry, location, description, key_offer.
        Returns None on any failure so the caller can fall back to brand-only data.
    """
    t0 = time.perf_counter()

    # ── 1. Load JSON ──────────────────────────────────────────────────────────
    if not _DATA_FILE.exists():
        logger.warning(
            "hubspot_data.json not found at %s — skipping company enrichment", _DATA_FILE
        )
        return None

    try:
        raw = _DATA_FILE.read_text(encoding="utf-8")
        data = json.loads(raw)
    except Exception as exc:
        logger.warning("Failed to read/parse hubspot_data.json: %s", exc)
        return None

    csv_text: str = data.get("companiesCsv", "")
    if not csv_text.strip():
        logger.warning("companiesCsv is absent or empty in hubspot_data.json")
        return None

    # ── 2. Parse CSV ──────────────────────────────────────────────────────────
    try:
        reader = csv.DictReader(StringIO(csv_text))
        rows: list[dict] = [_normalise_row(row) for row in reader]
    except Exception as exc:
        logger.warning("Failed to parse companiesCsv: %s", exc)
        return None

    if not rows:
        logger.warning("companiesCsv parsed to 0 rows")
        return None

    parse_ms = round((time.perf_counter() - t0) * 1000, 1)
    logger.info(
        "HUBSPOT CSV parsed in %.1f ms — %d company row(s) found", parse_ms, len(rows)
    )

    # ── 3. Select company row ─────────────────────────────────────────────────
    selected: Optional[dict] = None

    if company_identifier:
        ident = company_identifier.lower().strip()
        for row in rows:
            name = _first(row, _FIELD_MAP["company_name"]).lower()
            site = _first(row, _FIELD_MAP["website"]).lower()
            if ident in name or ident in site or name in ident or site in ident:
                selected = row
                break
        if selected is None:
            logger.info(
                "No company row matched identifier=%r — using first/best row", company_identifier
            )

    if selected is None:
        # Sort by score column if present; otherwise take first row.
        if rows and "score" in rows[0]:
            try:
                rows.sort(key=lambda r: float(r.get("score") or 0), reverse=True)
            except ValueError:
                pass
        selected = rows[0]

    # ── 4. Build compact profile ──────────────────────────────────────────────
    profile: dict = {
        "company_name": _first(selected, _FIELD_MAP["company_name"]),
        "website":      _first(selected, _FIELD_MAP["website"]),
        "industry":     _first(selected, _FIELD_MAP["industry"]),
        "location":     _first(selected, _FIELD_MAP["location"]),
        "description":  _first(selected, _FIELD_MAP["description"]),
        "key_offer":    _first(selected, _FIELD_MAP["key_offer"]),
    }

    # Ensure website has a proper scheme for use as CTA <a href>.
    website = profile["website"]
    if website and not website.startswith(("http://", "https://")):
        profile["website"] = "https://" + website

    # If company_name is a URL (bad CRM data), derive a readable name from the
    # domain instead so it doesn't look weird in email copy.
    cname = profile["company_name"]
    if cname.startswith(("http://", "https://", "www.")):
        from urllib.parse import urlparse
        try:
            host = urlparse(cname).hostname or cname
            # "nordicwellness.se" → "NordicWellness"
            base = host.split(".")[0].replace("-", " ").title()
            profile["company_name"] = base
        except Exception:
            pass  # keep original

    logger.info(
        "Company profile: name=%r website=%r industry=%r",
        profile["company_name"],
        profile["website"],
        profile["industry"],
    )
    return profile
