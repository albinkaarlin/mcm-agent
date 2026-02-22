/**
 * crm-parser.ts
 *
 * Parses the HubSpot CRM data response into a BrandConfig.
 *
 * ── Company description format ──────────────────────────────────────────────
 * Add the following key: value pairs anywhere in the HubSpot company
 * "Description" field. Unknown lines are ignored, order doesn't matter.
 *
 *   BRAND_NAME: Nordic Wellness
 *   PRIMARY_COLOR: #ff6b35
 *   SECONDARY_COLOR: #ffffff
 *   ACCENT_COLOR: #2563eb
 *   VOICE: Energetic, motivational, inclusive, Scandinavian warmth
 *   BANNED: cheap, discount, free trial, no minimum
 *   REQUIRED: member benefits, nordic quality, wellness journey
 *   LEGAL_FOOTER: © 2025 Nordic Wellness AB. Org.nr 556789-1234.
 *   FONT_HEADING: Georgia, serif
 *   FONT_BODY: Arial, sans-serif
 *   BORDER_RADIUS: 8px
 *   LOGO_URL: https://cdn.example.com/logo.png
 *
 * Any key not listed above is silently ignored.
 * Comma-separated values for BANNED and REQUIRED become tag arrays.
 * ────────────────────────────────────────────────────────────────────────────
 */

import type { BrandConfig } from "./brand-store";

export interface CrmData {
  fetchedAt: string;
  contactsCount: number;
  companiesCount: number;
  contactsCsv: string;
  companiesCsv: string;
}

export interface HubSpotSegment {
  id: string;
  name: string;
  /** Human-readable filter description shown in the UI */
  filterLabel: string;
  emails: string[];
}

// ── Audience segmentation ─────────────────────────────────────────────────

const MAX_ENUM_SEGMENTS = 8; // don't create segments for fields with too many unique values

export function parseContactSegments(data: CrmData): HubSpotSegment[] {
  const contacts = parseSimpleCsv(data.contactsCsv);
  if (contacts.length === 0) return [];

  const withEmail = contacts.filter((c) => c.email?.trim());
  if (withEmail.length === 0) return [];

  const segments: HubSpotSegment[] = [];

  // Always add an "All Contacts" segment
  segments.push({
    id: "hs_all",
    name: "All HubSpot Contacts",
    filterLabel: `${withEmail.length} contact${withEmail.length !== 1 ? "s" : ""}`,
    emails: withEmail.map((c) => c.email.trim()),
  });

  // Helper: create per-value segments for a given field
  const addEnumSegments = (
    field: string,
    labelFn: (val: string) => string,
    idPrefix: string
  ) => {
    const groups = new Map<string, string[]>();
    for (const c of withEmail) {
      const val = c[field]?.trim();
      if (!val) continue;
      const arr = groups.get(val) ?? [];
      arr.push(c.email.trim());
      groups.set(val, arr);
    }
    if (groups.size < 2 || groups.size > MAX_ENUM_SEGMENTS) return;
    for (const [val, emails] of groups) {
      segments.push({
        id: `${idPrefix}_${val.toLowerCase().replace(/\s+/g, "_")}`,
        name: labelFn(val),
        filterLabel: `${field}: ${val} · ${emails.length} contact${emails.length !== 1 ? "s" : ""}`,
        emails,
      });
    }
  };

  addEnumSegments(
    "membership_level",
    (v) => `${v} Members`,
    "hs_level"
  );
  addEnumSegments(
    "country",
    (v) => v,
    "hs_country"
  );
  addEnumSegments(
    "city",
    (v) => `${v} (city)`,
    "hs_city"
  );

  return segments;
}

/**
 * Score how well a segment matches an email's target-group description.
 * Returns a number ≥ 0; higher = better match.
 */
export function scoreSegment(segment: HubSpotSegment, targetGroup: string): number {
  const target = targetGroup.toLowerCase();
  const segText = (segment.name + " " + segment.filterLabel).toLowerCase();
  const words = segText.split(/\W+/).filter((w) => w.length > 3);
  return words.filter((w) => target.includes(w)).length;
}

// ── CSV parser (handles quoted fields) ────────────────────────────────────

function parseSimpleCsv(csv: string): Record<string, string>[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = parseCsvRow(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h.trim()] = values[i] ?? ""; });
    return obj;
  });
}

function parseCsvRow(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === "," && !inQuote) {
      out.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

// ── Description key:value parser ──────────────────────────────────────────

function parseDescription(description: string): Record<string, string> {
  const result: Record<string, string> = {};
  const knownKeys = new Set([
    "BRAND_NAME", "PRIMARY_COLOR", "SECONDARY_COLOR", "ACCENT_COLOR",
    "VOICE", "BANNED", "REQUIRED", "LEGAL_FOOTER",
    "FONT_HEADING", "FONT_BODY", "BORDER_RADIUS", "LOGO_URL",
  ]);
  for (const line of description.split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim().toUpperCase().replace(/\s+/g, "_");
    const value = line.slice(colon + 1).trim();
    if (knownKeys.has(key) && value) result[key] = value;
  }
  return result;
}

// ── Main export ────────────────────────────────────────────────────────────

export function parseCrmData(data: CrmData): Partial<BrandConfig> {
  const companies = parseSimpleCsv(data.companiesCsv);
  const first = companies[0] ?? {};

  const desc = parseDescription(first.description ?? "");

  const splitTags = (val: string) =>
    val.split(",").map((s) => s.trim()).filter(Boolean);

  // Fall back to domain-derived name if BRAND_NAME not set
  const fallbackName = first.name
    ? first.name.replace(/^https?:\/\//, "").replace(/\/$/, "").split(".")[0]
    : "";

  const partial: Partial<BrandConfig> = {};

  const brandName = desc.BRAND_NAME || fallbackName;
  if (brandName) partial.brandName = brandName;

  if (desc.VOICE) partial.voiceGuidelines = desc.VOICE;
  if (desc.BANNED) partial.bannedPhrases = splitTags(desc.BANNED);
  if (desc.REQUIRED) partial.requiredPhrases = splitTags(desc.REQUIRED);
  if (desc.LEGAL_FOOTER) partial.legalFooter = desc.LEGAL_FOOTER;

  const tokens: Partial<BrandConfig["designTokens"]> = {};
  if (desc.PRIMARY_COLOR) tokens.primaryColor = desc.PRIMARY_COLOR;
  if (desc.SECONDARY_COLOR) tokens.secondaryColor = desc.SECONDARY_COLOR;
  if (desc.ACCENT_COLOR) tokens.accentColor = desc.ACCENT_COLOR;
  if (desc.FONT_HEADING) tokens.fontFamilyHeading = desc.FONT_HEADING;
  if (desc.FONT_BODY) tokens.fontFamilyBody = desc.FONT_BODY;
  if (desc.BORDER_RADIUS) tokens.borderRadius = desc.BORDER_RADIUS;
  // hs_logo_url (native HubSpot field) takes priority over LOGO_URL in description
  const logoUrl = first.hs_logo_url || desc.LOGO_URL;
  if (logoUrl) tokens.logoUrl = logoUrl;
  if (Object.keys(tokens).length > 0) partial.designTokens = tokens as BrandConfig["designTokens"];

  return partial;
}

/** Return the suggested description template to paste into HubSpot. */
export const HUBSPOT_DESCRIPTION_TEMPLATE = `\
BRAND_NAME: Your Brand Name
PRIMARY_COLOR: #ff6b35
SECONDARY_COLOR: #ffffff
ACCENT_COLOR: #2563eb
VOICE: Describe your brand voice here, e.g. energetic, warm, professional
BANNED: words, you, never, use
REQUIRED: phrases, always, included
LEGAL_FOOTER: © 2025 Your Company. All rights reserved.
FONT_HEADING: Georgia, serif
FONT_BODY: Arial, sans-serif
BORDER_RADIUS: 6px
LOGO_URL: https://your-cdn.com/logo.png`;
