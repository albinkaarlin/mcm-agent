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

export interface CampaignRequest {
  prompt: string;
  force_proceed?: boolean;
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
    body: JSON.stringify({ prompt: request.prompt, force_proceed: request.force_proceed ?? false }),
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

export async function editEmail(
  emailId: string,
  currentHtml: string,
  subject: string,
  instructions: string
): Promise<GeneratedEmail> {
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
  return mapEmail(data.email);
}

export async function sendEmails(
  emailAssignments: { emailId: string; recipients: string[] }[]
): Promise<{ success: boolean; message: string }> {
  // Sending is out of scope for Mark — stub kept for the Send page UI
  await new Promise((resolve) => setTimeout(resolve, 800));
  const total = emailAssignments.reduce((acc, a) => acc + a.recipients.length, 0);
  return { success: true, message: `Queued ${total} emails for delivery.` };
}
