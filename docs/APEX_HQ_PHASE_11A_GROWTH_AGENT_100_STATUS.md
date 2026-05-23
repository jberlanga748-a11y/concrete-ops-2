# Apex HQ Phase 11A Growth Agent 100 Status

Date: 2026-05-23
Status: complete for review-first Growth Agent intelligence
Production status: locked unless a separate backup-first production release is approved

## Purpose

Phase 11A makes the Growth Agent useful as a review-first office intelligence lane without turning Apex HQ into an outreach bot, ad buyer, billing system, or autonomous customer-contact tool.

The Growth Agent should help an owner/admin decide what to review next:

- stale estimates
- overdue or high-priority lead follow-ups
- lead-source quality
- close-rate and conversion health
- completed jobs that may be ready for a manual feedback/review request

## Completed Scope

- Stale estimate follow-up drafts are generated as copy-only packets.
- Overdue or high-priority lead follow-up drafts are generated as copy-only packets.
- Lead-source intelligence summarizes source conversion, overdue lead follow-ups, stale estimates, and open estimate value.
- Close-rate and lead-conversion scorecards are included in Growth Agent state.
- Review request drafts are generated from completed/closed jobs as copy-only packets.
- AI Office surfaces Growth Agent follow-up drafts, source insights, and review request drafts as review-first focus rows.
- Field-only users remain blocked from Growth Agent intelligence and office command surfaces.

## Safety Boundaries

Phase 11A does not:

- send email, SMS, surveys, review requests, or customer notifications
- publish testimonials, public reviews, case studies, logos, photos, or customer proof
- submit bids
- launch ads or spend money
- change lead, estimate, job, customer, package, invoice, payment, or outreach tracker records
- alter production configuration
- weaken role, package, tenant, or field-user gates

## Role And Package Result

- Owner/admin office roles can see review-first Growth Agent intelligence when they already have visible lead/estimate/job context.
- Field-only roles remain blocked from Growth Agent state, follow-up drafts, source insights, review request drafts, pricing, leads, estimates, AI Office, billing, settings, and package controls.
- The implementation remains derived from visible records and does not introduce new server mutations.

## Verification

Latest local checks:

- `node --test --test-concurrency=1 src/growth-agent-utils.test.js`
- `node --test --test-concurrency=1 src/ai-office-utils.test.js`

Required release-adjacent checks before any deploy:

- `npm.cmd run verify:roles`
- `npm.cmd run build`
- `git diff --check`

## Remaining After Phase 11A

These are not Phase 11A blockers and should be handled by later phases:

- Live customer messaging or auto-send workflows: Phase 11E, approval required.
- Marketing Agent website/service/ad copy drafts: Phase 11E/marketing expansion, draft-only unless separately approved.
- Opportunity Scout source adapters and ingestion: Phase 11B.
- Advanced owner reporting and profit/loss intelligence: Phase 11C.
- Billing/payment automation: Phase 11G, approval required.
- External customer portal review/approval flows: Phase 11D, approval required.

## Decision

Phase 11A is complete for the approved review-first Growth Agent definition.

Next recommended phase: Phase 11B Lead / Job Finder expansion, unless the immediate priority is committing and broader-verifying the current Phase 11.0/11A work.
