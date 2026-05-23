# Apex HQ Phase 11B Lead / Job Finder 100 Status

Date: 2026-05-23
Status: complete for review-first Lead / Job Finder expansion
Production status: locked unless a separate backup-first production release is approved

## Purpose

Phase 11B expands Opportunity Scout into a safer Lead / Job Finder intelligence lane without adding live scraping, portal automation, bid submission, source contact, customer contact, OAuth, or external data sync.

The Lead / Job Finder should help the office review:

- source and search-profile readiness
- found opportunity quality
- safe opportunity-to-lead handoff gates
- user-provided pasted text
- forwarded-email style intake packets
- file metadata and attachment notes
- duplicate risk, missing information, and access/terms stops

## Completed Scope

- Opportunity Scout keeps source adapters explicit: manual, pasted text, file metadata, public web, official API, email ingestion, and approved browser session.
- Future/live adapters remain marked for review instead of enabled automatically.
- Source access classification stops at login, MFA, CAPTCHA, paywall, private portal, robots/terms, external contact, bid submission, and credential payloads.
- Ingestion readiness now reviews queued user-provided intake packets without saving leads or opportunities.
- Ingestion readiness extracts safe fields from pasted text, redacts credentials/sensitive URLs, reads file metadata only, flags duplicates, and identifies missing info.
- Opportunity Scout state exposes ingestion readiness counts and rows for future UI surfaces.
- Company scoping is preserved for queued intake packet state.

## Safety Boundaries

Phase 11B does not:

- connect Gmail, Outlook, Drive, Calendar, QuickBooks, CompanyCam, DocuSign, Twilio, or any live provider
- set OAuth, API keys, secrets, cookies, sessions, or environment variables
- scrape private portals or bypass login, MFA, CAPTCHA, paywalls, robots.txt, or source terms
- download private attachments
- contact customers, GCs, agencies, or sources
- submit bids
- create leads or opportunities automatically
- mutate production data or production configuration
- weaken role, package, tenant, source-access, or field-user gates

## Role And Tenant Result

- Office users can review Scout readiness when they already have Opportunity Scout / lead workflow access.
- Field-only users remain blocked from Opportunity Scout, leads, estimates, pricing, AI Office, billing, settings, package controls, and office-only data.
- Queued intake packets are filtered by company before readiness is derived.
- Existing found-opportunity-to-lead conversion remains behind human approval and source access/terms gates.

## Verification

Latest local checks:

- `node --test --test-concurrency=1 shared/opportunityScout.test.js`
- `node --test --test-concurrency=1 src/opportunity-scout-utils.test.js`

Required release-adjacent checks before any deploy:

- `npm.cmd run verify:opportunity-scout`
- `npm.cmd run verify:roles`
- `npm.cmd run build`
- `git diff --check`

## Remaining After Phase 11B

These are not Phase 11B blockers and require later phases or separate approval:

- Live Gmail/Drive/Calendar/OAuth ingestion: Phase 11F, approval required.
- Live public-source adapters or provider APIs: Phase 11F, approval required.
- Browser session assistance inside authorized portals: separate approval with source terms review.
- Bid submission: locked and requires separate approval.
- Customer/source messaging: Phase 11E, approval required.
- Advanced owner reporting from Scout results: Phase 11C.

## Decision

Phase 11B is complete for the approved review-first Lead / Job Finder definition.

Next recommended phase: Phase 11C Advanced Reporting / BI, unless the immediate priority is committing and broader-verifying the current Phase 11 work.
