

# Mark — Multi-Channel Marketing Campaign Agent

## Overview
Mark is a marketing campaign generation tool that lets marketing teams prompt an AI to create multi-email campaigns, review and edit the generated HTML emails, and send them to target audiences via Gmail.

---

## Design System
- **White base** with **red primary color** and subtle gradient accents
- Modern, trendy startup feel with clean typography
- Smooth transitions and card-based layouts
- AI-themed decorative elements (subtle sparkles, gradient glows)

---

## Pages & Flow

### 1. Homepage / Campaign Creator
- Hero section with Mark branding and tagline
- **Campaign prompt box** — large textarea where the user describes their campaign (target market, regions, number of emails, tone, etc.)
- **File upload area** — drag-and-drop zone for:
  - Company graphical profile (logos, brand colors, fonts)
  - Company policies, values, legal docs (PDF/text)
- **Saved company profiles** — dropdown to select previously uploaded company assets (persisted in backend)
- **"Generate Campaign" button** — sends prompt + uploaded assets to the backend API (mocked initially with realistic sample responses)

### 2. Review Page
- **Grid of generated email previews** — each email rendered as a small iframe/card showing the HTML output
- Clicking a card opens a **full-screen editor modal** where the user can:
  - View the rendered HTML email
  - Edit the HTML code directly (code editor panel)
  - See live preview of changes
- **AI Summary sidebar** for each email — explains what the AI adapted:
  - Customer group targeting rationale
  - Regional/legal adaptations (GDPR, etc.)
  - Tone and content decisions
- **"Continue to Send"** button to proceed

### 3. Send Page
- **Recipient management:**
  - Manual email input (comma-separated or one per line)
  - Saved contact groups (create/edit/delete groups)
  - Assign different emails to different groups
- **Send summary** — overview of which email goes to which group
- **"Send Campaign" button** — triggers the Gmail API to dispatch emails
- Success/error feedback with delivery status

### 4. Shared Layout
- Top navigation bar with Mark logo, page indicators (Create → Review → Send stepper), and settings
- Responsive design for desktop use (primary use case for marketing teams)

---

## Backend & Data (Lovable Cloud)
- **Database tables:**
  - `company_profiles` — saved company names, logos, policies
  - `contact_groups` — saved email groups with names and email lists
  - `campaigns` — campaign history with prompt, generated emails, status
- **Storage bucket** — for uploaded company assets (logos, PDFs)
- **API service layer** — abstracted service with mock data that returns sample HTML emails and summaries, ready to swap for a real AI backend

---

## Mock Data Strategy
- When "Generate Campaign" is clicked, the app will return 2-3 realistic sample HTML marketing emails with AI summaries
- This lets you test the full flow end-to-end before connecting the real API
- The API layer will be a single service file, easy to replace with real endpoints

---

## Gmail Integration (Placeholder)
- The Send page will have the UI and flow ready
- Gmail API integration will be stubbed — the button and logic structure will be in place, ready to connect to a real Google Gmail API when you're ready

