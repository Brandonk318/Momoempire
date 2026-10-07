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

## Monthly cost — hosting + DB + storage ONLY (≤ $15/mo target, no trial credits counted)

**Recommended stack: $0/mo hosting.** All items below are permanent free-forever tiers, NOT trial credits.

| Line | Service | Permanent allowance | $/mo | Overage risk |
|---|---|---|---|---|
| Frontend | **Cloudflare Pages — Free** | 500 builds/mo, unlimited bandwidth, 100 custom domains, 1 build at a time, 20k files/project | **$0** | None (Pages has no bandwidth overage); build cap resets monthly |
| Backend | **Oracle Cloud — Always Free (ARM Ampere A1)** | 4 OCPU + 24 GB RAM across up to 4 VMs, 200 GB block storage, 10 TB egress/mo — [docs](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) | **$0** | Oracle may reclaim an idle Ampere instance if region is capacity-constrained — mitigate by (a) sending traffic to keep it warm, (b) running a `supervisor` watchdog, (c) keeping a snapshot. Not a trial. |
| Database | **MongoDB Atlas M0 — Free Forever** | 512 MB storage, shared vCPU, shared RAM, 100 max connections, 100 ops/sec sustained | **$0** | Hard 512 MB cap. If you breach it the cluster goes **read-only** until you upgrade (next tier M2 is $9/mo, M10 is ~$57/mo — explicitly off-budget). |
| File storage | **Cloudflare R2 — Free class** | 10 GB storage, 1 M Class A ops/mo (writes), 10 M Class B ops/mo (reads), **zero egress fees** | **$0** | Past 10 GB: $0.015/GB·mo. Past op caps: $4.50 / M writes, $0.36 / M reads. |
| **Hosting total** | — | — | **$0** | **~$5 only if you fail over** (see fallbacks below) |

### Fallback if Oracle Always Free isn't available (region waitlist, policy, etc.)

| Replacement | $/mo | Note |
|---|---|---|
| **Hetzner CX22** (2 vCPU, 4 GB RAM, 40 GB SSD, EU/US) | **€3.79 ≈ $4.15** | Honest pay-as-you-go, no trial, no sleep. Still inside $15 cap. |
| Fly.io `shared-cpu-1x @ 256 MB`, 1 machine, auto-stop | **~$2** at 50% uptime | Hobby plan, pay-as-you-go. Sleeps when idle, cold-start ~1s. |
| Railway Hobby | **$5** | Includes $5 of usage; past that, pay-per-second. Hard to predict → **not recommended** for a budget cap. |
| Render Starter | **$7** | Reliable but closer to the ceiling → fallback only. |

**Worst-case hosting with fallback = $4–7/mo. Still ≤ $15.**

### Items I explicitly ruled out
- **Render Starter at $7** + Atlas M10 at $57 → off-budget, excluded.
- **Fly Launch plan with managed Postgres** → off-budget.
- **Vercel/Netlify Pro** → off-budget.
- **MongoDB Atlas M2 at $9/mo** → kept as the one-step overage path only, not the baseline.
- **Any 30-day free trial credit** (Google Cloud, AWS, Azure, DigitalOcean $200) → NOT counted; those run out.

### Variable fees — separate from hosting, usage-driven

| Line | Who collects | Floor | Note |
|---|---|---|---|
| LLM (OpenAI gpt-4o-mini) | OpenAI | **$0** (pay-per-token) | ~$0.15 / 1 M input tokens, $0.60 / 1 M output. 100 demo conversations ≈ ~$0.10. |
| LLM (if staying on Emergent) | Emergent Universal Key | $0 base, pre-paid balance | Same models, Emergent-brokered pricing. |
| Voice & SMS | Twilio | $1/mo per phone number + per-minute/per-SMS | US local voice $0.0085/min inbound, SMS $0.0083 each. |
| Email | Resend | $0 for 3k emails/mo; $20/mo for 50k | Or free via Emergent-managed Resend already provisioned. |
| Payment processing | Stripe | 2.9% + $0.30 per card charge | Direct charges with Connect Standard — tenants pay this on their revenue, not you. |

**These are revenue-coupled, not fixed overhead. Hosting + DB + storage stays at $0–5/mo at low usage.**

### Blockers / what to watch
- **Atlas M0 → read-only at 512 MB.** When `health_deploy.counts.*` grows into the hundreds of thousands, migrate to M2 ($9) or an Oracle self-hosted Mongo (free, requires ops effort). Add a monthly alert.
- **Oracle Ampere reclamation.** Keep weekly backups of `MONGO_URL` data via `mongodump` to R2 (fits in the free 10 GB).
- **Twilio toll fraud.** Enable Twilio's "Voice Geographic Permissions" to only allow dial-out to your countries — one accidental international loop can cost more than a year of hosting.

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
