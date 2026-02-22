// api.ts – real API client for the Mark FastAPI backend

export interface GeneratedEmail {
  id: string;
  subject: string;
  htmlContent: string;
  summary: {
    targetGroup: string;
    regionalAdaptation: string;
    toneDecision: string;
    legalConsiderations: string;
  };
}

export interface ClarificationQuestion {
  field: string;
  question: string;
}

export interface BrandContextPayload {
  brandName: string;
  voiceGuidelines: string;
  bannedPhrases: string[];
  requiredPhrases: string[];
  legalFooter: string;
  designTokens: {
    autoDesign: boolean;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamilyHeading: string;
    fontFamilyBody: string;
    borderRadius: string;
    logoUrl: string;
  };
}

export interface CampaignRequest {
  prompt: string;
  force_proceed?: boolean;
  brand_context?: BrandContextPayload;
}

export interface CampaignResponse {
  id: string;
  status: "completed" | "needs_clarification";
  questions?: ClarificationQuestion[];
  emails: GeneratedEmail[];
}

// Map snake_case backend response → camelCase frontend shape
function mapEmail(raw: {
  id: string;
  subject: string;
  html_content: string;
  summary: {
    target_group: string;
    regional_adaptation: string;
    tone_decision: string;
    legal_considerations: string;
  };
}): GeneratedEmail {
  return {
    id: raw.id,
    subject: raw.subject,
    htmlContent: raw.html_content,
    summary: {
      targetGroup: raw.summary.target_group,
      regionalAdaptation: raw.summary.regional_adaptation,
      toneDecision: raw.summary.tone_decision,
      legalConsiderations: raw.summary.legal_considerations,
    },
  };
}

export async function generateCampaign(request: CampaignRequest): Promise<CampaignResponse> {
  const res = await fetch("/v1/campaigns/generate-from-prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: request.prompt,
      force_proceed: request.force_proceed ?? false,
      brand_context: request.brand_context ?? null,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    status: data.status,
    questions: data.questions ?? [],
    emails: (data.emails ?? []).map(mapEmail),
  };
}

/**
 * Ask the AI to regenerate a single email's HTML based on user instructions.
 * Returns only the updated HTML string; every other field (subject, summary)
 * is preserved by the caller.
 */
export async function editEmail(
  emailId: string,
  currentHtml: string,
  subject: string,
  instructions: string
): Promise<string> {
  const res = await fetch("/v1/campaigns/edit-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email_id: emailId,
      current_html: currentHtml,
      subject,
      instructions,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  // Backend returns { email: { html_content, ... } }; we only need the HTML.
  const html: string =
    data?.email?.html_content ?? data?.email?.htmlContent ?? "";
  if (!html) throw new Error("Edit returned empty HTML");
  return html;
}

// ── Email send helpers ───────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 2000);
}

async function withConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  const queue = [...tasks];
  async function runNext(): Promise<void> {
    if (queue.length === 0) return;
    const task = queue.shift()!;
    results.push(await task());
    await runNext();
  }
  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    () => runNext()
  );
  await Promise.all(workers);
  return results;
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmailOne(payload: SendEmailPayload): Promise<void> {
  const res = await fetch("/v1/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(
      (errBody as { detail?: string }).detail ?? `HTTP ${res.status}`
    );
  }
}

export interface CampaignSendTask {
  email: GeneratedEmail;
  recipient: string;
  subject: string;
}

export async function sendCampaign(
  tasks: CampaignSendTask[]
): Promise<{ sent: number; failed: { recipient: string; error: string }[] }> {
  const failed: { recipient: string; error: string }[] = [];
  let sent = 0;

  const jobs = tasks.map(
    (task) => async () => {
      try {
        await sendEmailOne({
          to: task.recipient,
          subject: task.subject,
          html: task.email.htmlContent,
          text: stripHtml(task.email.htmlContent),
        });
        sent++;
      } catch (err) {
        failed.push({
          recipient: task.recipient,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  );

  await withConcurrency(jobs, 5);
  return { sent, failed };
}
