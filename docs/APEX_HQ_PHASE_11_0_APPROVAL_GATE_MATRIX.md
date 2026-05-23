# Apex HQ Phase 11.0 Approval Gate Matrix

Date: 2026-05-23
Status: approved scope-control gate
Production status: locked unless a separate backup-first production release is approved

## Purpose

Phase 11.0 turns the "do not build without approval" list into an operating gate for all Phase 11 expansion work.

This approval means Apex HQ is approved to enforce the gate and plan future phases. It does not approve production deploys, database migrations, secret changes, billing, customer messaging, bid submission, external customer portal access, or permission weakening.

## Phase 11.0 Decision

Approved direction:

- Build safe planning, review-first, read-only, draft-only, and local/demo verification work.
- Keep every locked action behind a separate explicit approval.
- Continue Phase 11 in small slices that can be tested without customer contact, production mutation, payment collection, or tenant/role risk.

Not approved by this phase:

- Production deploy.
- Production database migration.
- Supabase/RLS live migration.
- Secrets or environment variable changes.
- Billing/payment/Stripe/checkout.
- Auto-send email/SMS.
- Bid submission.
- Customer data import or mutation outside an approved pilot flow.
- Weakening role, package, tenant, or field-user gates.
- Public legal/security/pricing claims.

## Gate Categories

| Gate | Allowed Now | Requires Separate Approval | Required Evidence Before Approval |
| --- | --- | --- | --- |
| Production deploy | Local build, local tests, demo/preview planning | Fly production release, production config change, production smoke that logs in or mutates | Backup artifact, rollback target, support owner, incident path, build, roles, ready check, auth smoke plan |
| Database and migrations | Local schema planning, tests against disposable data, read-only inspection | Production migration, Supabase/RLS change, backfill, restore, destructive SQL | Backup, rollback, migration diff, tenant tests, role tests, restore confidence |
| Secrets and integrations | Integration planning, config docs, fake-token tests, local adapters with disabled live mode | OAuth setup, API keys, Fly/Vercel/Supabase secrets, Gmail/Twilio/Stripe/QuickBooks credentials | Owner approval, secret storage path, least-privilege scope, redaction checks, rollback/disable plan |
| Billing and payments | Manual package readiness, usage display, upgrade review drafts | Stripe, checkout, invoices, payment links, payment collection, self-serve package changes | Legal/tax/accounting decision, provider plan, server audit, failed-payment plan, rollback |
| Customer communication | Copy-only drafts, internal review queues, manual send packets | Auto-send email/SMS, Twilio messaging, customer notifications, external customer contact | Sender approval, opt-out/compliance plan, recipient test strategy, audit trail, manual kill switch |
| Bid submission and external portals | Bid-fit summaries, RFI/missing-info checks, copy-only bid notes | Bid submission, portal login automation, source contact, CAPTCHA/MFA/paywall bypass | Legal/source terms review, human submit workflow, audit, no-credential storage plan |
| Customer portal external access | Internal owner/admin preview, token design docs, package gate tests | Customer login, tokenized public links, proposal approval, comments, proof sharing | Expiration/revocation design, company scope tests, field-role denial, customer-safe leak tests |
| AI mutations | Suggestions, draft previews, approval packets, audit rows | Autonomous record mutation, schedule assignment, crew changes, customer send, invoice/payment, package changes | Human approval flow, idempotency, server authorization, audit events, negative tests |
| Public claims and legal content | Internal drafts, claim checks, founder review packets | Published legal/privacy/security/pricing claims, compliance claims, launch announcements | Legal review, public claims scan, source-backed proof, rollback/edit path |
| Role/package/tenant safety | More negative tests, read-only surfaces, blocked-state clarity | Any role widening, package gate changes, tenant data movement, support impersonation | Permission audit, role matrix, direct-route/API negative tests, audit logging |

## Phase 11 Build Lanes

Safe default lane:

- Review-first Growth Agent intelligence.
- Lead-source and close-rate analysis from visible records.
- Copy-only customer or review request drafts.
- Internal owner/admin preview screens.
- Local/demo-only smoke and tests.
- Planning docs and approval packets.
- Read-only reporting and scorecards.

Approval-required lane:

- Production release.
- Live integration setup.
- Payment collection.
- External customer portal access.
- Automated communication.
- Bid submission.
- Live customer data import.
- Database/RLS changes.
- Role/package/tenant gate changes.

## Phase 11A-11J Gate Mapping

| Phase | Workstream | Default Allowed Work | Locked Until Separate Approval |
| --- | --- | --- | --- |
| 11A | Growth Agent | Stale estimate insights, lead-source intelligence, close-rate recommendations, copy-only review drafts | Auto-send, ad spend, status mutation, customer contact |
| 11B | Lead / Job Finder | More review-first Opportunity Scout intelligence, source check workflows, import planning | Portal login automation, source scraping that violates terms, bid submission, customer/source contact |
| 11C | Reporting / BI | Owner scorecards, lead-source reports, labor/production KPI summaries, closeout review prep | Payroll replacement, accounting claims, live financial integrations |
| 11D | Customer Portal | Internal previews, customer-safe packet tests, token design, role/package denial tests | Customer login, external links, proposal approval, comments, payments |
| 11E | Communication Drafts | Manual follow-up drafts, review request drafts, recap drafts, support reply drafts | Auto-send email/SMS, Twilio, customer notifications |
| 11F | Integrations | Provider plans, adapter contracts, fake-token local tests, disable/rollback design | OAuth/API keys, live sync, secret changes, customer data import/export |
| 11G | Billing / Payments | Manual upgrade audit trail, usage readiness, Stripe implementation packet | Checkout, invoices, payment links, payment collection, self-serve package changes |
| 11H | Offline / Mobile | Offline draft design, local cache tests, retry queue planning | Silent conflict resolution, live sync changes without conflict plan |
| 11I | Enterprise Trust | MFA/SSO/SCIM plans, audit export design, access review docs | Live SSO/MFA enforcement, SCIM provisioning, compliance claims |
| 11J | Trade Depth / Pilot Learning | Secondary trades, demo switching, trade templates from real feedback | Claims that all trades are complete without proof, customer-specific setup without approval |

## Required Start Checklist For Every Phase 11 Slice

Before implementation:

- Identify the exact Phase 11 slice.
- State whether it is safe default lane or approval-required lane.
- List likely touched files/modules.
- Confirm no production deploy, migration, secrets, billing, auto-send, bid submission, or permission weakening is included.
- Confirm field users stay blocked from leads, estimates, pricing, AI Office, billing, settings, package controls, and office-only data.

Before final report:

- List changed files.
- List verification commands.
- State role/permission result when relevant.
- State whether any locked gate was touched.
- State GO/NO-GO for the next slice.

## Stop Conditions

Stop and produce a Phase 1 safety report before implementation if the slice requires:

- Production deploy or production auth login.
- Database migration, backfill, restore, or destructive data work.
- Secrets, OAuth, API keys, env vars, or provider setup.
- Billing/payment behavior.
- Customer email/SMS, customer notifications, bid submission, or external portal action.
- Customer portal external access.
- Role/package/tenant permission changes.
- Public legal/security/pricing/compliance claims.

## Phase 11.0 Exit Criteria

Phase 11.0 is complete when:

- The gate matrix exists in source.
- Every Phase 11A-11J workstream has allowed and locked lanes.
- The approval text is explicit that locked actions are not approved.
- Future Phase 11 work can start with a safe-slice checklist.

Decision: Phase 11.0 is approved as a scope-control gate. Locked actions remain locked.
