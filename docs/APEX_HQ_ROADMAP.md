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
- demo mode
- backup/export
- health/readiness checks
- owner health utilities
- support/help handoff
- website lead intake foundation
- package entitlement foundation for Basic/Premium/Elite
- AI rough notes and lead assistant foundations
- Opportunity Scout foundations

## Main Product Pillars

| Pillar | Purpose | Timing |
| --- | --- | --- |
| Core Operations | leads, estimates, jobs, crews, reports, photos, tickets, safety, checklists, closeout | Now |
| App Health Monitoring | crashes, failed API calls, uptime, health checks, troubleshooting guidance | Next |
| Watchtower / Autopilot Agent | missing reports/photos/follow-ups, startup blockers, recommendations | Next |
| Field Ops Agent | clock issues, missing field proof, weather/GPS risk with consent | Later |
| Growth Agent | stale estimates, lead targeting, close-rate recommendations | Later |
| Lead / Job Finder Agent | finds opportunities, scores fit, drafts outreach with approval | Later |
| Marketing Agent | manual-first campaigns, emails, texts, scripts, review asks | Later |
| Ad Assistant Agent | ad copy/budget/audience drafts with approval before spend | Later |
| Website Builder Agent | contractor websites, service pages, forms, SEO pages | Later |
| Customer Portal | proposal approvals, photos, change orders, payments later | Later |
| Communication System | notes, mentions, updates, summaries | Next |
| Integrations | QuickBooks, Gmail, Calendar, Drive, Stripe, Twilio, Maps, Weather, DocuSign, CompanyCam, Sentry | Later |
| Reporting / Intelligence | job costing, labor, close rates, lead sources, production KPIs | Later |
| Customer Success | onboarding, demo/training mode, support, walkthroughs, help docs | Next |
| Billing / Packages | Basic, Premium, Elite, usage limits, billing later | Next |

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
- Communication Center Phase 1.
- App Health / Audit Activity Phase 1 planning.
- Watchtower / Missing Work Agent boundaries.
- Keep released branding, estimate options, packet split, and Operations Command work stable.

### Next

- App Health page/foundation.
- Watchtower missing-work recommendations.
- Communication Center.
- Customer Success onboarding.
- Operations Command UX.

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

1. Communication Center Phase 1.
2. App Health / Audit Activity Phase 1.
3. Watchtower / Autopilot Agent Phase 1.
4. Apex Assistant Shell Phase 1.
5. Customer Success / Guided Setup Phase 2.
6. Billing / Plans Readiness Prep.
7. Public SaaS Signup UX Phase 2.
8. Package Upgrade / Locked State Polish.
9. Advanced Reporting Prep.
10. Enterprise trust layer.

Completed foundational phases that should not be restarted:

- Public SaaS safety audit refresh.
- Public signup/workspace creation foundation.
- Company isolation hardening foundation.
- Package entitlement foundation.
- First owner onboarding/support handoff.
- User invite/password reset foundation.
- Company branding / proposal identity.
- Estimate options / reference attachments / takeoff input foundation.
- GC packet / foreman handoff packet split.
- Operations Command UX Upgrade Phase 1 and mobile KPI polish.

## Freeze Policy

When a workflow is complete:

- freeze it
- fix only bugs, permission issues, mobile blockers, or planned versioned upgrades
- do not keep polishing the same page forever
