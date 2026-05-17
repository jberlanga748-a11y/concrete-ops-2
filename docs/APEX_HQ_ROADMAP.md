# Apex HQ Roadmap

This roadmap organizes the existing Apex HQ direction into a master coordinator plan. It does not replace `APEX_HQ_MASTER_ROADMAP.md`; it turns the existing roadmap into controlled execution lanes.

Current phase source of truth: `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md`.

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
| Core Operations | leads, estimates, jobs, crews, reports, photos, tickets, safety, checklists, closeout | Now |
| App Health Monitoring | crashes, failed API calls, uptime, health checks, troubleshooting guidance | Built / expand later |
| Watchtower / Autopilot Agent | missing reports/photos/follow-ups, startup blockers, recommendations | Built / expand later |
| Field Ops Agent | clock issues, missing field proof, weather/GPS risk with consent | Later |
| Growth Agent | stale estimates, lead targeting, close-rate recommendations | Later |
| Lead / Job Finder Agent | finds opportunities, scores fit, drafts outreach with approval | Later |
| Marketing Agent | manual-first campaigns, emails, texts, scripts, review asks | Later |
| Ad Assistant Agent | ad copy/budget/audience drafts with approval before spend | Later |
| Website Builder Agent | contractor websites, service pages, forms, SEO pages | Later |
| Customer Portal | proposal approvals, photos, change orders, payments later | Later |
| Communication System | notes, mentions, updates, summaries | Built / expand later |
| Integrations | QuickBooks, Gmail, Calendar, Drive, Stripe, Twilio, Maps, Weather, DocuSign, CompanyCam, Sentry | Later |
| Reporting / Intelligence | job costing, labor, close rates, lead sources, production KPIs | Later |
| Customer Success | onboarding, demo/training mode, support, walkthroughs, help docs | Built / expand later |
| Billing / Packages | Basic, Premium, Elite, usage limits, billing later | Foundation built / Stripe later |

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
- Enterprise Trust Prep first slice is built and pending release; do not expand it into SOC 2, SSO, MFA, SCIM, or compliance claims yet.

### Next

- Release Enterprise Trust Prep.
- Pilot browser QA checkpoint.

### Later

- Field Ops Agent.
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

### Never

- Hidden GPS tracking.
- Auto-send email/SMS without approval.
- Auto-publish ads or spend money.
- Field access to pricing/margins/admin/office data.
- Big rewrites of working systems without proven risk.
- Fake workflows that look real but do nothing.

## Recommended Build Order

1. Release Enterprise Trust Prep.
2. Pilot browser QA checkpoint.
3. Mobile field trust polish.
4. Assistant Command Expansion Phase 2.
5. Field Ops Agent planning checkpoint.
6. Advanced Reporting Prep Phase 2.
7. Billing / manual upgrade prep.
8. Customer Portal Planning Checkpoint.

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

## Freeze Policy

When a workflow is complete:

- freeze it
- fix only bugs, permission issues, mobile blockers, or planned versioned upgrades
- do not keep polishing the same page forever
