# AI Office Platform — Product Requirements Document (PRD)

## Original problem statement
Build Phase 1 of a production-ready, multi-tenant SaaS "AI Office Platform". NOT one-industry. Reusable core engine that generates specialized AI Offices for HVAC, plumbing, electrical, roofing, landscaping, pest control, dental, physical therapy, contractors, independent professionals. Philosophy: "We build you an AI employee and digital office." Business owners are non-technical.

## User personas
- **Business owner (tenant owner)** — small-business operator (HVAC tech, dentist, PT clinic). Non-technical. Needs calm, done-for-you workspace.
- **Staff / admin inside a tenant** — invited to collaborate (role scaffolding ready, invite flow Phase 2).
- **Platform admin** — operates the SaaS: manages tenants, industry templates, country availability, feature flags.
- **Public visitor** — browses a tenant's public business page or marketing landing.

## Core requirements (static)
1. Multi-tenant architecture with strict data isolation.
2. Business onboarding wizard capturing all required fields (plain English).
3. Industry Office Engine — reusable templates, admin-editable without redeploy.
4. Dynamic Stripe country selector — DB-backed with status tiers (supported / preview / extended / unsupported / unavailable), admin-overridable.
5. Authentication: email/password + JWT cookies, password reset, role-based (owner/admin/staff/platform_admin), brute-force lockout, MFA-ready.
6. Business-owner dashboard with 20 nav sections, grouped (Workspace, Communications, Business, Intelligence, Setup).
7. Platform admin console (tenants, industries, countries, feature flags, system health).
8. API-first, modular, scalable, swappable branding (CSS variables).

## Phase 1 — Shipped (Feb 2026)
**Backend (FastAPI + Mongo)**
- JWT cookie auth: register (bootstraps tenant), login, logout, /me, /refresh, forgot-password, reset-password + brute-force lockout.
- 10 industry templates seeded (HVAC, plumbing, electrical, roofing, dental, PT, landscaping, pest control, contractor, independent).
- 64 countries seeded with Stripe-aware status tiers; admin CRUD + enable/disable.
- Tenant onboarding endpoint seeds services + knowledge from the chosen industry template.
- Tenant-scoped CRUD for services, customers, leads, appointments, knowledge; `/tenants/summary`.
- Platform admin endpoints (overview, tenants list + suspend, users, feature flags toggle, health).
- Business advisor chat (GPT-6 Sol via emergentintegrations) with graceful fallback.
- Public tenant page `/public/business/{slug}`.
- Stripe payments (Flow A claimable sandbox): plans, checkout, status polling, webhook at `/api/stripe/webhook`.
- Audit log collection + brute-force collection + password-reset TTL.

**Frontend (React 19 + Tailwind + Shadcn)**
- Premium dark marketing landing (bento + glass) with industries + pricing.
- Login / Signup / Forgot / Reset flows (split-screen premium).
- 5-step onboarding wizard with industry picker, hours table, AI tone picker.
- Business-owner dashboard shell with grouped 20-section sidebar, tenant branding (CSS vars), tenant switcher.
- Functional modules: Home, AI Employee tuning, Services CRUD, Customers CRUD, Leads kanban, Appointments CRUD, Knowledge Base, Business Advisor chat, Analytics KPI, Usage, Billing (Stripe), Settings (branding + public link).
- Stub modules with "Phase 2" badges + hooks reserved: Calls, Messages, Payments, Website, Customer Portal, Reviews, Automations, Integrations, Phone Numbers.
- Admin console: Overview KPIs, Tenants (suspend/reactivate), Industry Templates CRUD, Countries CRUD + filter + toggle, Feature Flags, System Health.
- Public tenant business page `/b/:slug`.
- Payment success / cancel pages.

**Verified**: 30/30 backend tests passing (health, auth, industries, countries, onboarding, scoped CRUD, tenant isolation, admin RBAC, feature flags, country override, public page, Stripe plans/checkout/status, advisor chat).

## P0 backlog (next up)
- Email verification + MFA (TOTP) flows (scaffold is in place).
- Audit log viewer in admin.
- Team invites + staff management inside a tenant.

## P1 backlog
- Twilio-powered Calls + telephony configuration.
- Omnichannel Messages inbox.
- Website builder with per-tenant subdomains.
- Reviews aggregation + auto-replies.
- Workflow automations engine.

## P2 backlog
- SOC2 scaffolding (SSO/SAML, SCIM, secret rotation).
- Multi-location per tenant (schema supports it; UI to come).
- Marketplace of community industry templates.
