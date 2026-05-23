# Apex HQ Roadmap

This roadmap organizes the existing Apex HQ direction into controlled execution lanes.

Current phase source of truth: `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md`.

Current completion roadmap: `docs/APEX_HQ_100_PERCENT_ROADMAP.md`.

Note: this file is the legacy product-direction roadmap. The 100 percent roadmap is now the execution source for what is complete, what is partial, what is missing, and what should wait until after core SaaS launch.

## Product Vision

Apex HQ is a contractor growth and operations platform.

It should help contractors:

- get more work
- win more work
- organize operations
- manage crews
- track field work
- reduce risk
- get paid faster
- look more professional
- grow into larger companies

## Current App State

Existing app foundations:

- React + Vite frontend
- Express API
- SQLite persistence
- auth/setup routes
- company/workspace foundations
- public signup/company creation
- first owner onboarding foundation
- user/role permissions
- customers, leads, estimates, jobs, crews
- time tracking
- daily reports
- uploads/photos
- delivery tickets
- pre-pour/post-pour
- safety, PPE, incidents, toolbox talks, tool checklist
- concrete calculator
- change orders
- notifications/reminders foundations
- communication center foundation
- demo mode
- backup/export
- health/readiness checks
- owner health utilities
- app health audit activity review
- support/help handoff
- website lead intake foundation
- package entitlement foundation for Basic/Premium/Elite
- AI rough notes and lead assistant foundations
- Opportunity Scout foundations

## Main Product Pillars

| Pillar | Purpose | Timing |
| --- | --- | --- |
| Core Operations | leads, estimates, jobs, crews, reports, photos, tickets, safety, checklists, closeout | Mostly built; finish handoffs, closeout, billing review, and trade depth |
| App Health Monitoring | crashes, failed API calls, uptime, health checks, troubleshooting guidance | Built for demo/pilot; production auth smoke and alert ownership remain |
| Watchtower / Autopilot Agent | missing reports/photos/follow-ups, startup blockers, recommendations | Phase 1 built; central agent action inbox remains |
| Field Ops Agent | clock issues, missing field proof, weather/GPS risk with consent | Phase 1 built; GPS/weather/risk behavior remains later and consent-gated |
| Growth Agent | stale estimates, lead targeting, close-rate recommendations | Partial; after core agent workflow |
| Lead / Job Finder Agent | finds opportunities, scores fit, drafts outreach with approval | Partial via Opportunity Scout; source adapters and opportunity-to-lead flow remain |
| Marketing Agent | manual-first campaigns, emails, texts, scripts, review asks | Not built; post-core expansion |
| Ad Assistant Agent | ad copy/budget/audience drafts with approval before spend | Not built; post-core expansion |
| Website Builder Agent | contractor websites, service pages, forms, SEO pages | Not built; post-core expansion |
| Customer Portal | proposal approvals, photos, change orders, payments later | Partial manual preview; tokenized portal remains |
| Communication System | notes, mentions, updates, summaries | Foundation built; customer message review/send boundaries remain |
| Integrations | QuickBooks, Gmail, Calendar, Drive, Stripe, Twilio, Maps, Weather, DocuSign, CompanyCam, Sentry | Mostly not built; post-core expansion |
| Reporting / Intelligence | job costing, labor, close rates, lead sources, production KPIs | Partial; advanced reporting and profit/loss remain |
| Customer Success | onboarding, demo/training mode, support, walkthroughs, help docs | Mostly built for pilot; public-scale support remains |
| Billing / Packages | Basic, Premium, Elite, usage limits, billing later | Package foundation built; payment collection not built |

## Package Direction

Security is never a paid feature. All packages get safe auth, company separation, permissions, session safety, and protected data.

| Package | Intended Customer | Included Direction |
| --- | --- | --- |
| Basic | Small contractors needing one operational system | operations, leads, jobs, crews, reports, uploads, time, safety/checklists, simple estimates |
| Premium | Contractors wanting growth and advanced operating support | proposal tools, app health, Watchtower, Field Ops Agent, Growth Agent, Marketing Agent, integrations, advanced reporting |
| Elite | Contractors buying growth partner power | Website Builder Agent, Ad Assistant Agent, Lead/Job Finder, customer portal, advanced automation, advanced analytics, growth partner services |

## Now / Next / Later / Never

### Now

- Keep pilot workflows stable.
- Preserve field permissions.
- Use `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md` before starting any build phase.
- Watchtower / Missing Work Agent and Apex Assistant Shell boundaries.
- Keep released branding, estimate options, packet split, and Operations Command work stable.
- Keep released Communication Center, App Health / Audit Activity, Watchtower, and Assistant Shell work stable.
- Keep guided setup and plan readiness stable; do not add Stripe until billing is explicitly approved.
- Keep public signup UX stable; do not rebuild signup/auth unless a proven security bug is found.
- Keep package locked states stable; do not add billing or expose package CTAs to field roles.
- Keep Advanced Reporting Prep stable; do not turn it into job costing, payroll, billing, or broad analytics without a planned reporting phase.
- Enterprise Trust Prep is built and released; do not expand it into SOC 2, SSO, MFA, SCIM, or compliance claims without a scoped trust phase.
- Field Ops Agent Phase 1 is read-only and role-safe; do not build GPS/location risk behavior without explicit consent, settings, and approval boundaries.

### Next

- Finish one real guided pilot path using the existing intake, setup approval, smoke, support, and check-in gates.
- Make estimates/proposals fully customer-ready with branded packet output, option comparison, photos/takeoff summary, and estimate-to-job handoff.
- Make Apex Agent useful inside the real workflow through a central review queue, lead-to-estimate draft assistance, estimate proposal assistance, job handoff assistance, and closeout review.
- Add trade setup/profile support so Apex HQ works for more construction contractor types without becoming generic.
- Harden self-serve signup and onboarding on an approved hosted target before public launch.

### Later

- Field Ops Agent advanced GPS/weather/time risk behavior.
- Growth Agent.
- Lead/Job Finder Agent.
- Marketing Agent.
- Ad Assistant Agent.
- Website Builder Agent.
- Customer portal.
- Offline/PWA advanced workflows.
- Payroll.
- Billing/payments.
- Integrations.
- Enterprise SSO/MFA/SCIM.

## Legacy Completion Checklist

This checklist reconciles this older roadmap with the current 100 percent roadmap.

| Item | Status | Notes |
| --- | --- | --- |
| React/Vite, Express, SQLite foundation | Done | Current app stack is built and repeatedly verified. |
| Auth/setup routes | Done / maintain | Production auth smoke remains a launch gate. |
| Company/workspace foundation | Done | Public signup and company scope are heavily tested. |
| Public signup/company creation | Built locally | Hosted self-serve launch smoke and production approval remain. |
| First owner onboarding | Done for current scope | Recent regression guard keeps setup visible after signup. |
| User/role permissions | Done for current scope | Must remain a blocker for future changes. |
| Customers/leads/estimates/jobs/crews | Mostly done | Needs final end-to-end pilot and trade-template polish. |
| Time/reports/uploads/tickets/pre/post-pour/safety/checklists | Mostly done | Field mobile and role safety are strong; trade-specific prompts remain. |
| Communication Center | Foundation done | Customer-facing send/review boundaries remain. |
| App Health / readiness / backup / restore | Mostly done | Production monitoring/auth-smoke gates remain. |
| Package entitlements | Done | Billing/payment is not built. |
| Opportunity Scout | Built review-first MVP | Source adapters and expanded ingestion remain. |
| Estimate Studio branding/PDF header | Partial-to-strong | Customer-ready proposal packet polish remains. |
| Satellite Fence Takeoff Lite | MVP built | Browser QA with Mapbox token and quantity confidence polish remain. |
| Apex Assistant / Agent | Partial | Review-first context, audit, and draft paths exist; full workflow agent remains. |
| Customer Portal | Partial | Manual preview exists; tokenized customer portal remains. |
| Growth/Marketing/Ad/Website agents | Not built | Post-core expansion, not first launch blockers. |
| Integrations | Mostly not built | Post-core expansion. |
| Offline/PWA advanced workflows | Partial | Installability exists; offline edit/sync remains. |
| Payroll | Not built | Not a core launch requirement and should not be claimed. |
| Billing/payments/Stripe | Not built | Requires separate approval. |
| Enterprise SSO/MFA/SCIM | Not built | Later trust phase only. |

### Never

- Hidden GPS tracking.
- Auto-send email/SMS without approval.
- Auto-publish ads or spend money.
- Field access to pricing/margins/admin/office data.
- Big rewrites of working systems without proven risk.
- Fake workflows that look real but do nothing.

## Recommended Build Order

1. Real guided pilot gate and smoke.
2. Estimate/proposal packet completion.
3. Satellite Fence Takeoff QA and handoff completion.
4. Agent action inbox and workflow draft assistance.
5. Trade setup/profile and template packs.
6. Self-serve hosted smoke and onboarding completion.
7. Production auth smoke and monitoring gates.
8. Customer portal and communication review/send gates.
9. Billing/payment planning only after explicit approval.
10. Post-core agents, integrations, offline sync, and enterprise features.

Completed foundational phases that should not be restarted:

- Public SaaS safety audit refresh.
- Public signup/workspace creation foundation.
- Public SaaS Signup UX Phase 2.
- Company isolation hardening foundation.
- Package entitlement foundation.
- Package Upgrade / Locked State Polish.
- Advanced Reporting Prep.
- First owner onboarding/support handoff.
- Customer Success / Guided Setup Phase 2.
- Billing / Plans Readiness Prep.
- User invite/password reset foundation.
- Company branding / proposal identity.
- Estimate options / reference attachments / takeoff input foundation.
- GC packet / foreman handoff packet split.
- Operations Command UX Upgrade Phase 1 and mobile KPI polish.
- Communication Center Phase 1.
- App Health / Audit Activity Phase 1.
- Watchtower / Missing Work Agent Phase 1.
- Apex Assistant Shell Phase 1.
- Assistant Missing Proof Summary.
- Mobile Field Trust Polish.
- Field Ops Agent Planning Checkpoint.
- Field Ops Agent Phase 1 read-only summary.

## Freeze Policy

When a workflow is complete:

- freeze it
- fix only bugs, permission issues, mobile blockers, or planned versioned upgrades
- do not keep polishing the same page forever
