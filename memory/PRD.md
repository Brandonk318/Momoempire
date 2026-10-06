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
- Stripe meter + usage-based billing for ai_minutes overage.
- OpenAI Realtime WebRTC for live speech-to-speech.
- Email delivery (Resend) for invites + review requests + reminders.
- Google Team Invites (accept with Google instead of password).
