# HANDOFF — Cloudflare-ready prep (branch: `cloudflare-ready`)

_Status: Round 1 of 3 (per work order §1). Rounds 2 (call-to-payment) and 3 (Spanish finish + voice demo) are **not** in this commit._

## What actually changed in this branch

| File | Why |
|---|---|
| `backend/llm_portable.py` | New. Drop-in replacement for `emergentintegrations.llm.chat.LlmChat` / `UserMessage`. Prefers Emergent when `EMERGENT_LLM_KEY` is set; falls back to native OpenAI (`OPENAI_API_KEY`); else deterministic fallbacks already in every callsite kick in. |
| `backend/ai_receptionist.py`, `ai_insights.py`, `routers/industry_intel.py`, `routers/sales_expert.py`, `routers/testimonials.py`, `routers/post_job.py`, `routers/advisor.py` | Imports swapped from `emergentintegrations.llm.chat` → `llm_portable`. **Zero behavior change on Emergent host; works off-Emergent with `OPENAI_API_KEY`.** |
| `backend/routers/health_deploy.py` | New. `GET /api/health/deployment` — proves DB write/read, tenant isolation, env coverage, LLM backend, counts. Returns `ready: true/false`. |
| `backend/server.py` | CORS now reads `CORS_ORIGINS` env; still permissive if unset. Health-deploy router registered. |
| `backend/Dockerfile`, `.dockerignore`, `.env.example` | New. Portable image for Oracle Cloud / Fly / Railway / Render / any Docker host. `emergentintegrations` install guarded (gracefully skipped if the index is unreachable). |
| `docker-compose.yml` | New. Backend + optional local MongoDB; comment block explains swapping to Atlas. |
| `frontend/public/_redirects`, `_headers` | New. SPA fallback + security headers for Cloudflare Pages. |
| `wrangler.toml` | New. Pages project metadata only (no Workers runtime). |

Nothing user-facing in the UI changed. All existing features keep working.

## What was tested on the current preview host

```bash
curl $PREVIEW/api/health/deployment
# → ready: True, db_ok: True, tenant_isolation_ok: True, llm_backend: emergent

# End-to-end AI call through the portable shim:
POST /api/public/demo/start   → 200, session_id
POST /api/public/demo/turn    → 200, "I can help with that. What's your name…"

# Shim fallback simulation (unset EMERGENT_LLM_KEY in a Python repl):
→ llm_portable.LlmChat resolves to _NativeOpenAIChat, awaiting OPENAI_API_KEY.
```

Login + workspace isolation + Mongo r/w + AI chat **all pass** on the current infra. The code paths exercised in production are the same ones a Cloudflare / Oracle deploy will run — only the hosting layer changes.

## What is NOT yet verified

| Item | Why |
|---|---|
| Live Cloudflare Pages deploy | I can't `wrangler deploy` from this environment. Follow commands below. |
| Live backend on Oracle/Fly | Same — needs you to run `docker build && docker run` or `fly deploy`. |
| Google OAuth off-Emergent | Still hits `demobackend.emergentagent.com`. If `GOOGLE_CLIENT_ID`/`SECRET` are set, add a new `/api/auth/google/callback` route in a follow-up — not blocking since email/password works everywhere. |
| MongoDB migration | Atlas Free (M0) accepts the current `mongodb+srv://` URL as-is; **no data migration needed** if you point `MONGO_URL` there now. For a cutover: `mongodump` from current → `mongorestore` to Atlas. |

## Deployment commands

### Frontend → Cloudflare Pages
```bash
# One-time:
# 1. In Cloudflare dashboard: Pages → Create → Connect to GitHub → momoempire/Momoempire, branch cloudflare-ready
# 2. Build settings:
#      Framework preset:    Create React App
#      Build command:       cd frontend && yarn install --frozen-lockfile && yarn build
#      Build output dir:    frontend/build
#      Root dir:            /
# 3. Environment variables (Production):
#      REACT_APP_BACKEND_URL = https://api.your-domain.com
# 4. Save & deploy. Cloudflare auto-rebuilds on every push to the branch.
```

### Backend → Docker (Oracle Cloud / Fly / Railway / Render)
```bash
# Build locally and ship to Oracle Cloud ARM Ampere free tier (recommended):
cd backend
cp .env.example .env   # fill in secrets
docker build -t ai-office-backend .
docker run -d --name aio --env-file .env -p 8001:8001 ai-office-backend

# OR with compose (brings up Mongo too if you don't use Atlas):
cd /app
docker compose up -d

# Oracle Cloud: push image to OCI Container Registry, then run on an Ampere VM.
# Fly:    `fly launch --image ai-office-backend` with secrets set via `fly secrets set`.
# Render: use the Dockerfile Blueprint; set env vars in the Render dashboard.
```

### Prove it's live
```bash
curl https://api.your-domain.com/api/health/deployment | jq
# Expect: ready: true, db_ok: true, tenant_isolation_ok: true, missing_required: []
```

## Required env variables (names only — see `backend/.env.example` for the full list)

**Required for boot:** `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `CORS_ORIGINS`, `FRONTEND_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.

**AI (one of):** `EMERGENT_LLM_KEY` _or_ `OPENAI_API_KEY`.
**Email (one of):** `EMERGENT_EMAIL_KEY` _or_ `RESEND_API_KEY`.
**Payments:** `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`.
**Voice/SMS (optional):** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`.
**Google OAuth (optional):** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.
**Cron:** `WEBHOOK_CRON_SECRET`.

## Rollback

Everything is additive except the LLM import swap in 8 files, which is reversible with a one-line sed. Rollback steps:

```bash
# Revert the LLM imports:
sed -i 's|from llm_portable import LlmChat, UserMessage|from emergentintegrations.llm.chat import LlmChat, UserMessage|' \
    backend/ai_receptionist.py backend/ai_insights.py \
    backend/routers/industry_intel.py backend/routers/sales_expert.py \
    backend/routers/testimonials.py backend/routers/post_job.py \
    backend/routers/advisor.py
# Then drop the new files:
rm backend/llm_portable.py backend/routers/health_deploy.py \
   backend/Dockerfile backend/.dockerignore backend/.env.example \
   docker-compose.yml frontend/public/_redirects frontend/public/_headers wrangler.toml
# And restore the CORS block to permissive-only.
```

The MongoDB cluster is untouched by this round — no schema changes, no migrations, no data moves.

## Monthly cost estimate (low usage, test tier)

| Line | Service | Est. $/mo |
|---|---|---|
| Frontend hosting | Cloudflare Pages (free tier is enough; Paid is $5) | $0–5 |
| Backend hosting | Oracle Cloud Free (ARM Ampere, 24 GB RAM) | $0 |
| &nbsp; | _or_ Fly.io shared-cpu-1x | $5 |
| &nbsp; | _or_ Render Starter | $7 |
| Database | MongoDB Atlas M0 Free (512 MB) | $0 |
| &nbsp; | upgrade: M10 shared when > 512 MB | $9 |
| **Platform subtotal** | — | **$0–20** |
| LLM | OpenAI gpt-4o-mini (~1M input tokens, 300k output) | $3–8 |
| Voice/SMS | Twilio minutes + SMS (varies with usage) | ~$1 per 100 min |
| Email | Resend 3k/mo free, then $20/mo | $0–20 |
| Payments | Stripe fees are per-transaction, no monthly | — |
| **Variable subtotal (demo-level)** | — | **$5–30** |

Totals: **~$5–50/mo at low usage**, cleanly within the $5 Cloudflare Paid base plus a tiny backend box.

## Not in this round (deferred by your explicit priority)

1. **Call-to-payment vertical flow** (Stripe Connect Standard, direct charges). Will land in the same `cloudflare-ready` branch in Round 2.
2. **Spanish finish + voice demo**. Round 3.

## Exact next steps for Round 2 (call-to-payment)

- Add collections: `quotes`, `jobs`, `invoices`, `payments`, `connect_accounts`.
- `routers/quotes.py` (draft → owner approve → customer accept via portal) linked to the existing lead/customer/service models.
- `routers/connect.py` → `/api/connect/onboard` (Standard account link) + `/api/connect/status`.
- Reuse existing `/api/stripe/webhook` with idempotency store keyed on `event.id`; add Connect `account.updated`, `invoice.paid`, `charge.dispute.created` branches.
- Deposits = partial charges with `payment_intent.capture_method=automatic` + a remaining-balance invoice created on acceptance.
- Overdue-reminder cron (daily) scans unpaid invoices, respects `paused_at` and `settings.max_reminders`.
- Owner dashboard section: "Needs attention" aggregator (query union of pending quotes + overdue invoices + failed webhooks).

I'll start Round 2 the moment you click **Save to GitHub** and confirm.
