# AI Office Platform — PRD (Phases 1–4 complete)

## Original problem statement
Multi-tenant SaaS "AI Office Platform": "We build you an AI employee and digital office." Reusable core engine serves many industries. Hardware elite, face swappable. Non-technical business owner.

## Shipped (Feb 2026)

### Phase 1 — Foundation (30/30 ✅)
Multi-tenant JWT auth · 10 industry templates seeded (HVAC → independent) · 64 Stripe-aware countries · 20-section dashboard shell · Admin console (tenants, industries, countries, feature flags, system health) · Public business page (/b/:slug) · Business advisor chat · Stripe billing scaffold.

### Phase 2 — AI Receptionist + Operations (21/21 ✅)
`ai_receptionist.py` with tenant-grounded system prompt + JSON-structured actions (book_appointment / create_lead / take_message / take_voicemail / escalate_to_human / end_call) · Graceful fallback (never dead-ends a caller) · Call simulator UI + two-way SMS inbox · Estimates + Invoices (public tokens) · Review Autopilot (SMS/email + public submission at `/reviews/:token`) · Team invitations with public accept flow · Custom domain CNAME wizard with DNS verify · Branded Customer Portal (`/portal/:slug`) · Real usage metering with warning tiers · Automations settings · Integrations catalog.

### Phase 3 — Business OS (passed via smoke tests)
Scheduling engine (appointment types, staff, availability with buffer + travel) · Pipeline funnel + revenue attribution (AI vs manual) + hot leads + proactive opportunities queue · Lightweight RAG: knowledge document upload (PDF/DOCX/TXT/MD) → extract → chunk → keyword search → fed into receptionist + advisor system prompts · Data-grounded Business Advisor (injects snapshot JSON of tenant metrics) · AI Quality monitoring with flag types (frustration, failed_booking, failed_transfer, unresolved, short_call) + admin dashboard · Automation Rules Engine with 8 starter recipes + run-now · Industry Intelligence briefs cached per tenant · Browser mic input in Calls (Web Speech API).

### Phase 3.5 — Google Sign-In
`POST /api/auth/google/session` exchanges Emergent `session_id` → `session_token` httpOnly cookie · "Continue with Google" on login/signup · `/auth/callback` with hash detection at Router level · platform admin seed moved to `ramonajefferson10@gmail.com`.

### Phase 4 — Commercial, Pricing, Platform Analytics, Scale (21/21 ✅)
**Plans engine (admin-configurable)**: 6 bookmarks seeded — trial (free), Starter $19.99, Growth $49.99, AI Office $99.99, High Volume $199.99, Enterprise (custom). Each plan carries limits (ai_minutes, calls, sms, ai_interactions, locations, users, phone_numbers, personas, integrations), overage cents/unit, features, trial_days, is_public.
**Unit cost config**: `cost_config` singleton with cents/unit for ai_minutes, calls, sms, storage_gb, payment_processing_bps — powers gross-margin math.
**Platform analytics**: MRR by plan, ARPU, 30-day churn, trial→paid conversion, usage totals this period, monthly cost, gross-margin cents + %, AI-attributed revenue, per-plan margin.
**Domain providers**: pluggable architecture (`BaseProvider`), two bundled (`manual` CNAME + `demo_registrar` search/purchase simulator). Tenant can search → purchase → auto-add to Domain list routed to CNAME wizard. Admin can enable/disable providers and set default.
**Workspace switcher**: `/auth/workspaces` + `/auth/switch` lets a user who's a member of multiple tenants (via team invites) hop between them.
**Session audit**: `/auth/sessions` lists Google sessions (token tail only — never full token) with revoke.
**Usage now reads from DB plans** — admin edits take effect everywhere immediately.
**Dashboard sidebar**: user avatar now shows Google picture when present.
**Settings → Security tab**: sessions list + workspace switcher UI.

## Admin controls shipped
Customers · Plans + Pricing + Limits + Overage · Unit costs · Industries + templates · Countries · Integrations · Domain providers · Billing + Revenue + Gross margin · AI quality · Feature flags · System health · Platform analytics.

## Final verdict
All four phases ship as **one coherent multi-tenant platform**. Adding a new industry = add a template row (admin UI already supports it) — no code changes. Adding a new domain provider = subclass `BaseProvider` and register it in `PROVIDERS` dict. Everything is wired, isolated per tenant, gracefully degrades, and surfaces measurable ROI to the business owner.

## P1 backlog
- Twilio live-call bridge (TwiML → `/caller-turn`) — simulator already runs the exact pipeline.
- OpenAI Realtime WebRTC for live speech-to-speech.
- Email delivery (Resend) for invites + review requests + reminders.
- Expert-mode persona depth (receptionist / sales pro / industry expert) on AI employee.
- Instant-quote estimator grounded in uploaded pricing docs.
- "Why they called" weekly digest (LLM over conversations).

### Phase 5 — Commerce + Sales Intelligence (Oct 2026) ✅
**Stripe Price IDs on plans**: `stripe_price_id` on `Plan` (admin UI edit per plan). Checkout uses the real price when set; falls back to ad-hoc `price_data` otherwise.
**Overage billing (record + charge)**: `routers/overage.py` computes `used - included` × `plan.overage[metric]` for ai_minutes / calls / sms / ai_interactions, persists `overage_items` idempotently per (tenant, period, metric), and creates `stripe.InvoiceItem` on `tenant.stripe_customer_id` when a sub exists. Admin UI: Overview → "Overage this period" with Preview + Record & charge. Tenant: Billing shows an overage card. Cron: `/api/cron/overage-nightly` runs 02:30 UTC.
**Public /pricing page**: `/pricing` renders live from `GET /api/plans` (stripe_price_id stripped) — marketing updates become no-code.
**Google team invites**: `POST /api/public/invitations/accept-google` verifies the Google email matches the invited email, attaches the user to the tenant with the invited role, mints JWT + session cookies. InviteAccept UI shows "Accept with Google" alongside password form; the Router preserves `/invite#session_id=...` instead of hijacking to `/auth/callback`.
**Admin source zip**: `GET /api/admin/source/zip` streams a cleaned-up zip of `/app` (excludes node_modules/.git/.emergent/__pycache__/uploads) and injects `README.DUPLICATE.md` + `.env.example` files. Admin UI: "Download source zip" button on Overview.
**Sales intelligence**:
- **Lead scoring** (`ai_insights.score_lead_from_transcript`): hot/warm/cold + score 0-100 + reason + signals. LLM-first (gpt-6-sol), deterministic keyword fallback. Auto-runs on `POST /api/conversations/{id}/end`. Score persists on both conversation + linked lead; new `/api/sales/leads/scored?label=` endpoint; UI shows score badges on Leads kanban and Calls header.
- **Dynamic upsells**: CRUD `/api/sales/upsells` + `/suggest?service=`; injected into AI receptionist system prompt as `Upsell suggestions` block so the AI mentions one naturally when a matching service comes up.
- **Smart follow-up cadence**: default 3-step SMS (24h, 72h, 168h), admin-editable per tenant. Hot/warm leads auto-schedule after `/end`. Cron `/api/cron/followups` runs every 15m to dispatch due nudges. UI tab on Sales Intel with cadence editor + upcoming nudges + cancel.
- **Call → CRM auto-fill**: `ai_insights.extract_crm_fields` extracts address/phone/email/service_requested/urgency/budget_hint/preferred_time/notes_summary (LLM + regex fallback). Calls page shows "Auto-fill CRM" button on ended calls → review panel → one-click "Save to CRM" writes to lead/customer.

### Phase 6 — Real integrations + Growth loops (Oct 2026) ✅
- **Twilio**: `services/twilio.send_sms` (per-tenant creds from `integrations` collection → env fallback → graceful demo mode). `routers/twilio_webhook.py` exposes `/api/twilio/voice`, `/voice-turn`, `/sms`, `/missed-call` — real inbound calls bridge straight into the receptionist pipeline with TwiML `<Gather>` + `<Say Polly.Joanna>`.
- **Resend email** (Emergent-managed): `services/email.py` with the playbook's `_assert_safe_email` guardrail gate. Templates: invite_html, review_request_html, followup_html, digest_html. Wired into invitation creation, review requests, follow-up jobs, and the weekly digest.
- **Weekly digest**: `/api/growth/digest/preview` + `/send`; cron `weekly-digest` (Mon 9am UTC) emails every owner stats + highlights + tips.
- **Beat-the-quote**: `discount_policies` collection (max %, max $, phrase, conditions) injected into AI system prompt. Admin UI tab on Sales Intel.
- **Realtime voice**: `/api/realtime/token` mints an OpenAI Realtime session; returns `{available:false, fallback:'web-speech'}` when `OPENAI_API_KEY` is unset.
- **Win-back campaigns**: `/api/growth/winback/preview|run` — bulk SMS/email to inactive customers; cutoff respected on both preview and real run; campaigns persisted and listable.
- **Referrals**: unique code per customer at `/api/growth/referrals`, public landing `/r/:code` records visits + conversions.

### Phase 7 — Expert-mode AI employee (Oct 2026) ✅
- **Objection playbook** (`/api/sales/objections` CRUD): admin-curated "when caller says X → AI responds Y" library, injected into system prompt.
- **Persona depth** (`/api/sales/persona`): switch tone between Receptionist / Sales Pro / Industry Expert (or custom); flows through all AI responses.
- **Instant quote estimator** (`/api/sales/quote-estimate`): LLM-grounded ballpark range using services + knowledge, deterministic rule fallback. UI widget in Sales Intel.
- **Real-time coach** (`/api/sales/coach`): LLM returns 3-5 verbatim suggestion lines; UI panel in Calls (click to drop into reply input). Objection library hits surface in rule fallback.
- **Appointment reminders cron**: hourly scan sends 24h-before SMS reminders (idempotent via `reminder_sent_at`).
- **Website embed widget**: `GET /api/public/widget/{slug}.js` returns a brand-colored floating lead-capture button; `POST /api/public/widget/{slug}/lead` writes a widget-sourced lead and converts referrals.
### Phase 8 — Growth autopilot layer (Oct 2026) ✅
- **Post-job autopilot**: On appointment `status→completed`, immediately texts/emails a branded thank-you (with Google review URL if set) and schedules a 60-day win-back SMS. Idempotent per appointment. Owner-side history at `/api/growth/post-job/runs`.
- **AI review response drafter**: `POST /api/growth/review-response` takes a pasted review + rating → draft reply with tone (grateful/apologetic/neutral) via LLM; deterministic fallback included. UI panel on Growth → Review replies.
- **Daily owner standup**: `/api/growth/standup/preview|send` summarizes today's appointments, hot leads, pending nudges, and missed-call count. Cron `daily-standup` fires 13:00 UTC (~9am ET / 7am MT); SMS + email delivery.
- **Weekly social post drafter**: `/api/growth/social/draft` writes a Monday Facebook/Instagram caption with win stats + hashtags. One-tap "Copy caption + tags."
- `AppointmentIn` extended with `customer_email`, `customer_id`, `lead_id` so the full post-job pipeline (SMS + email + CRM linkback) activates.
### Phase 9 — Autopilot complete (Oct 2026) ✅
- **Call-back scheduler**: `/api/growth/callbacks` CRUD; cron `callbacks-due` fires every 5m — places real Twilio outbound call with TwiML greeting routed into the existing receptionist pipeline. Demo-mode falls back to SMS'ing the owner.
- **24h appointment auto-confirmation**: cron `appt-confirmations` (xx:25 hourly) sends a "YES / RESCHEDULE / CANCEL" SMS 24h before each appointment. Inbound SMS (real Twilio or simulator) is intercepted and updates appointment status.
- **Review-request autopilot (2h)**: On post-job completion, if `review_url` is set, schedules an SMS 2 hours later asking for a Google review.
- **Service-area heatmap**: `/api/growth/heatmap` aggregates leads+customers by extracted ZIP, geocodes top ZIPs via Nominatim (cached in `geocode_cache`), returns bar + pin-map data. Recharts bar + inline SVG pin map in UI.
- **Google Calendar ICS**: `/api/growth/standup/today.ics` streams a VEVENT with today's agenda. Owner clicks "Add to Calendar" on Standup tab → opens in Google / Apple / Outlook.
### Phase 10 — Marketing homepage (Oct 2026) ✅
- **Rewrote `/app/frontend/src/pages/Landing.jsx`** as the platform's own marketing site at `/`:
  - Hero: "We build you an AI employee and a digital office." · live trial copy pulled from `/api/plans` (`trial_days`, `ai_minutes`, `calls` never go stale).
  - 3 pillars: AI receptionist · Sales intelligence · Growth autopilot.
  - Industry showcase: HVAC, dental, legal, salon — adapted services + bullet proofs.
  - 3-step "how it works": sign up → connect phone → AI starts answering.
  - Interactive demo card (`/components/DemoCall.jsx`) with industry switcher + quick prompts + Web Speech mic input.
  - FAQ accordion (replace staff / mess-up safety / cancel anytime / data / Twilio / languages).
  - Waitlist capture (email + name + biz + industry + note) with Resend confirmation email.
  - Footer with `/privacy` and `/terms` links.
- **Public API** at `routers/marketing.py` (no auth): `POST /api/public/demo/start`, `POST /api/public/demo/turn` (10 turns max, IP rate-limited), `POST /api/public/waitlist`. Demo reuses the real `receptionist_reply` pipeline with per-industry preset services + FAQs.
- **Legal pages** at `/privacy` and `/terms` via `pages/Legal.jsx` — honest, SaaS-standard copy ready for real customers.

