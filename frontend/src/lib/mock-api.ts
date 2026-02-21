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

export interface CampaignRequest {
  prompt: string;
  companyProfile?: string;
  files?: File[];
}

export interface CampaignResponse {
  id: string;
  emails: GeneratedEmail[];
}

const mockEmails: GeneratedEmail[] = [
  {
    id: "email-1",
    subject: "Exclusive Spring Sale — 30% Off Everything",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:linear-gradient(135deg,#e53e3e,#c53030);padding:40px 32px;text-align:center">
<h1 style="color:#fff;margin:0;font-size:28px">🌸 Spring Sale is Here!</h1>
<p style="color:#fed7d7;margin:8px 0 0;font-size:16px">Exclusive offer just for you</p>
</td></tr>
<tr><td style="padding:32px">
<h2 style="color:#1a1a1a;font-size:22px;margin:0 0 16px">Get 30% off everything</h2>
<p style="color:#4a4a4a;font-size:15px;line-height:1.6">Dear valued customer, as a thank you for your loyalty, we're offering an exclusive 30% discount on our entire collection. This is your chance to refresh your wardrobe with the latest spring styles.</p>
<div style="text-align:center;margin:32px 0">
<a href="#" style="background:linear-gradient(135deg,#e53e3e,#c53030);color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block">Shop Now →</a>
</div>
<p style="color:#888;font-size:13px;text-align:center">Use code <strong>SPRING30</strong> at checkout. Valid until March 31st.</p>
</td></tr>
<tr><td style="background:#f7f7f7;padding:20px 32px;text-align:center">
<p style="color:#999;font-size:12px;margin:0">© 2026 Your Company. All rights reserved.<br>You received this email because you subscribed to our newsletter.</p>
</td></tr>
</table>
</body></html>`,
    summary: {
      targetGroup: "Loyal existing customers with purchase history in the last 6 months",
      regionalAdaptation: "EU-compliant with unsubscribe link and company address footer",
      toneDecision: "Warm and appreciative — emphasizes customer loyalty and exclusivity",
      legalConsiderations: "GDPR-compliant, includes unsubscribe option and data processing notice",
    },
  },
  {
    id: "email-2",
    subject: "New Arrivals: Fresh Styles for the Season",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:linear-gradient(135deg,#2d3748,#1a202c);padding:40px 32px;text-align:center">
<h1 style="color:#fff;margin:0;font-size:28px">✨ New Collection Drop</h1>
<p style="color:#a0aec0;margin:8px 0 0;font-size:16px">Be the first to explore</p>
</td></tr>
<tr><td style="padding:32px">
<h2 style="color:#1a1a1a;font-size:22px;margin:0 0 16px">Fresh styles just landed</h2>
<p style="color:#4a4a4a;font-size:15px;line-height:1.6">Discover our curated selection of new arrivals designed for the modern professional. From boardroom to brunch, find pieces that move with your lifestyle.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0">
<tr>
<td style="width:50%;padding:8px;text-align:center;background:#f7fafc;border-radius:8px"><p style="margin:0;font-size:14px;color:#2d3748"><strong>50+</strong><br><span style="color:#718096">New Styles</span></p></td>
<td style="width:8px"></td>
<td style="width:50%;padding:8px;text-align:center;background:#f7fafc;border-radius:8px"><p style="margin:0;font-size:14px;color:#2d3748"><strong>Free</strong><br><span style="color:#718096">Express Shipping</span></p></td>
</tr>
</table>
<div style="text-align:center;margin:32px 0">
<a href="#" style="background:#2d3748;color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block">Explore Collection →</a>
</div>
</td></tr>
<tr><td style="background:#f7f7f7;padding:20px 32px;text-align:center">
<p style="color:#999;font-size:12px;margin:0">© 2026 Your Company. All rights reserved.</p>
</td></tr>
</table>
</body></html>`,
    summary: {
      targetGroup: "Fashion-forward professionals aged 25-40, new subscribers",
      regionalAdaptation: "North American market focus with USD pricing and US shipping info",
      toneDecision: "Modern and aspirational — focuses on lifestyle positioning",
      legalConsiderations: "CAN-SPAM compliant with physical address and opt-out mechanism",
    },
  },
  {
    id: "email-3",
    subject: "Your Weekly Style Guide 📬",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:linear-gradient(135deg,#e53e3e,#dd6b20);padding:40px 32px;text-align:center">
<h1 style="color:#fff;margin:0;font-size:28px">📬 Weekly Style Guide</h1>
<p style="color:#fed7d7;margin:8px 0 0;font-size:16px">Issue #42 — March 2026</p>
</td></tr>
<tr><td style="padding:32px">
<h2 style="color:#1a1a1a;font-size:20px;margin:0 0 12px">This Week's Top Picks</h2>
<p style="color:#4a4a4a;font-size:15px;line-height:1.6">Our editors have handpicked the best trends, tips, and pieces for you this week. Here's what's hot:</p>
<div style="border-left:4px solid #e53e3e;padding:16px;margin:20px 0;background:#fff5f5;border-radius:0 8px 8px 0">
<p style="margin:0;font-size:14px;color:#2d3748"><strong>🔥 Trend Alert:</strong> Bold reds and coral tones are dominating this season's palette.</p>
</div>
<div style="border-left:4px solid #dd6b20;padding:16px;margin:20px 0;background:#fffaf0;border-radius:0 8px 8px 0">
<p style="margin:0;font-size:14px;color:#2d3748"><strong>💡 Style Tip:</strong> Layer lightweight knits over structured shirts for an effortlessly polished look.</p>
</div>
<div style="text-align:center;margin:32px 0">
<a href="#" style="background:linear-gradient(135deg,#e53e3e,#dd6b20);color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block">Read Full Guide →</a>
</div>
</td></tr>
<tr><td style="background:#f7f7f7;padding:20px 32px;text-align:center">
<p style="color:#999;font-size:12px;margin:0">© 2026 Your Company. Sent weekly to style enthusiasts.<br><a href="#" style="color:#e53e3e">Unsubscribe</a> | <a href="#" style="color:#e53e3e">Preferences</a></p>
</td></tr>
</table>
</body></html>`,
    summary: {
      targetGroup: "Newsletter subscribers — engaged readers who open regularly",
      regionalAdaptation: "Global audience, culturally neutral content with multi-region appeal",
      toneDecision: "Friendly, editorial — positioned as a trusted style advisor",
      legalConsiderations: "Full GDPR and CAN-SPAM compliance with preference management links",
    },
  },
];

export async function generateCampaign(request: CampaignRequest): Promise<CampaignResponse> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 2500));

  return {
    id: `campaign-${Date.now()}`,
    emails: mockEmails,
  };
}

export async function sendEmails(
  emailAssignments: { emailId: string; recipients: string[] }[]
): Promise<{ success: boolean; message: string }> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  
  const totalRecipients = emailAssignments.reduce((acc, a) => acc + a.recipients.length, 0);
  return {
    success: true,
    message: `Successfully queued ${totalRecipients} emails for delivery.`,
  };
}
