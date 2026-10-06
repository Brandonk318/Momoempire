# AI Office Platform — Product Requirements Document (PRD)

## Original problem statement
Build a multi-tenant AI Office SaaS: "We build you an AI employee and digital office." Reusable core engine serves many industries (HVAC, plumbing, dental, PT, contractor, etc.). Non-technical business owner. Hardware elite, face swappable.

## User personas
- **Business owner (tenant owner)** — small-business operator. Primary user of the dashboard.
- **Staff / admin** — invited teammates with role-scoped access.
- **Platform admin** — operates the SaaS. Manages tenants, templates, countries, flags.
- **Customer of a tenant** — uses the white-label portal / public page.

## Core requirements (static)
1. Multi-tenant isolation; scale to thousands of businesses.
2. Plain-English onboarding wizard.
3. Reusable Industry Office Engine (admin-editable, no redeploy).
4. Dynamic Stripe country selector (admin-overridable, status tiers).
5. Auth: JWT cookies, roles (owner/admin/staff/platform_admin), lockout, MFA-ready.
6. 20-section dashboard, grouped. White-label branding via CSS vars.
7. AI employee that behaves like a trained employee of the specific business.
8. Human fallback: AI never dead-ends a caller (voicemail/message/escalate/callback).
9. Usage metering with 70/85/90/95/100% warning tiers; graceful fallback at cap.
10. White-label customer portal + business page; custom domain via CNAME.

## Phase 1 — Shipped (Feb 2026)
- Multi-tenant auth, 10 seeded industry templates, 64 countries.
- Business-owner dashboard shell, admin console, Stripe billing.
- Public business page, business advisor chat (GPT-6 Sol), seed-on-onboarding.
- **30/30 backend tests PASS.**

## Phase 2 — Shipped (Feb 2026)
**AI Receptionist (`ai_receptionist.py`)**
- Builds tenant-specific system prompt from industry template + knowledge + services + hours.
- Returns JSON-structured actions: `book_appointment`, `create_lead`, `take_message`, `take_voicemail`, `escalate_to_human`, `end_call`, or plain answer.
- Deterministic fallback branch — never leaves caller at a dead end (voicemail / escalation / graceful message when LLM fails or usage is capped).

**Communications**
- `conversations` collection + per-message log. Call simulator UI drives the exact server pipeline Twilio will later feed.
- Outbound SMS + inbound-SMS simulator; AI auto-replies using the same playbook.
- Missed-call text-back automation setting.

**CRM depth**
- Estimates + Invoices with line items + public token for customer approval/view.
- Review Autopilot: send request via SMS/email (logged in demo), customer submits via public link with star rating + comment.

**Team & white-label**
- Team invitations (owner/admin/staff) with token-based accept flow.
- Staff listing + inline role change.
- Custom domain CNAME wizard with DNS verify step.
- White-label customer portal (`/portal/:slug`) — branded, service request form, booking form, FAQ, hours, services, magic-link return path.

**Metering & operational**
- Usage events for `calls`, `sms`, `ai_interactions`, `voice_seconds`, `ai_minutes` with monthly rollup.
- `GET /api/usage/me` returns per-metric usage + 70/85/90/95/100% warning tier + exhaustion flag.
- Automations settings: appointment reminders, review autopilot, missed-call text-back, lead follow-up timer, SMS template.
- Tenant integrations catalog (Twilio, Gmail, Stripe, Google My Business) with per-tenant config + status derivation.

**Verified**: 21/21 Phase 2 backend tests PASS.

## P0 backlog (next)
- Real Twilio inbound call bridge (TwiML → `/caller-turn` under the hood).
- Email delivery (Resend or Gmail OAuth) for invites + review requests.
- Appointment reminder scheduler (nightly job).

## P1 backlog
- OpenAI Realtime API for live speech-to-speech.
- Portal magic-link login UI (`/portal/:slug/login`).
- Google My Business review aggregation.
- Stripe-powered invoice payment links.

## P2 backlog
- SOC2 scaffolding (SSO/SAML, SCIM).
- Multi-location per tenant (schema supports it).
- Industry template marketplace.
