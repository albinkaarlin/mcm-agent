# Mark – AI Campaign Generator

FastAPI backend that generates full email marketing campaigns via Google Gemini.
Six-phase pipeline: **Clarify → Research → Strategy → Execution → Production → Critique**.

---

## Quickstart

**1. Install dependencies**
```bash
uv sync --all-extras
```

**2. Add your Gemini API key**
```bash
cp .env.example .env
# then edit .env and set GEMINI_API_KEY=your_key_here
```

**3. Start the server**
```bash
make dev
# → http://localhost:8000
```

**4. Open the interactive docs**
```
http://localhost:8000/docs
```

---

## Generate a campaign

```bash
curl -X POST http://localhost:8000/v1/campaigns/generate \
  -H 'Content-Type: application/json' \
  -d @examples/christmas_campaign.json | jq .
```

## Validate a request (no LLM call)

```bash
curl -X POST http://localhost:8000/v1/campaigns/validate \
  -H 'Content-Type: application/json' \
  -d @examples/christmas_campaign.json | jq .
```

---

## Tests

```bash
# Unit + integration (mocked – no API key needed)
make test

# Live end-to-end against real Gemini (requires .env GEMINI_API_KEY)
make test-live
# Output saved to outputs/integration_result.json
```

---

## Config

All settings are in `.env` (copy from `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | *(required)* | Your Google Gemini API key |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Model to use |
| `GEMINI_TEMPERATURE` | `0.4` | Generation temperature |
| `GEMINI_MAX_OUTPUT_TOKENS` | `8192` | Max tokens per call |
