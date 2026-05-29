# Apex HQ Roadmap Hardening Status

Status: local Build 0A / 2A / 1A / 3A-3B completion evidence
Updated: 2026-05-29

This status file records the current local completion proof for the production-readiness batch. It is not a production deploy approval, customer-contact approval, payment approval, secret/config change, or public launch approval.

## Completed Batch

| Roadmap Slice | Status | Local Evidence |
| --- | --- | --- |
| Build 0A: Production blocker hardening | Complete locally | `npm.cmd run verify:roadmap-hardening` checks required launch scripts, rollback/restore docs, production release gate behavior, dangerous command detection, uploaded-file backup reminders, and secret hygiene warnings. |
| Build 2A: QA evidence hardening | Complete locally | `scripts/qa-evidence-hardening.mjs` verifies route-specific audit expectations and false-pass rejection for empty roots, splash/loading pages, missing main landmarks, missing route content, missing desktop shells, small touch targets, low contrast text, and field-role restricted routes. |
| Build 1A: Paid pilot close kit | Complete locally | `npm.cmd run verify:paid-pilot-close` requires the close packet, onboarding packet, terms/support policy, kickoff/check-in templates, customer data draft, and agreement outline. It also checks manual payment, support owner, Day 0/3/10 loop, approval records, quote/logo boundary, and no automatic billing/sending overclaims. |
| Build 3A-3B: Rate Book / Cost Library slice 1 | Complete locally | `npm.cmd run verify:rate-book` plus `src/rate-book-utils.test.js` cover owner/admin-only company-scoped rate book management, customer-safe estimate line creation, internal job-cost review lines, and required labor/material/equipment/subcontractor cost-library coverage. |

## Boundaries Still Locked

- No production deploy was performed.
- No production data, secrets, Fly config, Supabase config, or billing/payment settings were changed.
- No automatic email/SMS sending, bid submission, payment collection, package change, or customer portal action is enabled by this batch.
- Wider paid launch still requires production auth smoke evidence, hosted smoke evidence, backup artifact names, uploaded-file backup evidence, monitoring evidence, support owner, rollback owner, incident destination, and explicit operator execution through the production release gate.

## Verification Commands

```powershell
npm.cmd run verify:roadmap-hardening
npm.cmd run verify:paid-pilot-close
npm.cmd run verify:rate-book
npm.cmd run verify:monitoring
npm.cmd run verify:claims
npm.cmd run build
git diff --check
```
