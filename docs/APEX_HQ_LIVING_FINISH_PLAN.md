# Apex HQ Living Finish Plan

Last updated: 2026-05-30

## Current Phase

Reputation + Portfolio Engine is completed locally and ready for standing-approved production release. Next phase is Estimate Studio + Proposal Packets.

## Product North Star

Apex HQ is a finished contractor growth and operations platform. It helps contractors find work, advertise wisely, capture and follow up with leads, estimate and win work, schedule and run jobs, guide crews, prove work, handle changes, prepare billing, collect reviews/referrals, and know what to do next every day.

Core loop:

Find work -> advertise smart -> capture lead -> follow up -> estimate -> propose -> win -> schedule -> run field work -> prove work -> close out -> get paid -> create more trust and leads.

## Operating Rules

- Finish one whole phase, then stop and review it.
- Do not rebuild working systems.
- Use existing code first.
- Build provider-ready states when paid accounts or API keys are not configured yet.
- Standing production release approval is granted for completed, verified phases. Deploy after validation, push, hosted health check, and deploy-log update without asking again.
- Production readiness checks are release evidence and rollback inputs, not phase-blocking approval gates, unless the deploy command fails or the work would touch secrets, paid spend, live sends, billing/payment processing, destructive data, hidden GPS/privacy, auth/session control, or known incident risk.
- No autonomous ad spend, customer sends, payment processing, bid submission, purchasing, destructive data action, hidden GPS, or production data change.
- Field users must not see leads, estimates, pricing, profit/margins, payroll costs, office notes, admin settings, company setup, AI office tools, billing, or other company data.
- Every new request goes into this file as Now, Next, Later, or Provider-dependent.

## Built / Partial / Missing Inventory

| Area | Status | Notes |
| --- | --- | --- |
| Opportunity Scout / Client Finder | Built | Search profiles, lead sources, found opportunities, source checks, review-first conversion to leads, Agent Leads readiness layers. |
| Daily Job Finder / Agent Leads | Partial | Review-first infrastructure and source readiness are built. Live provider accounts, real source credentials, and production runs remain provider/account-dependent. |
| Source adapters and source health | Partial | Public/private source posture, provider setup, evidence packets, and source health exist. Live external connectors depend on approved providers/accounts. |
| Website/public request intake | Built / Partial | Public estimate/demo request foundations exist. Public estimate request now captures service type, project type, timing, budget, referral source, attribution, consent, thank-you state, and creates a manual office lead/review task. Website builder and SEO/service-page drafts remain later. |
| Sales follow-up | Built | Owner/admin Sales Follow-Up System now combines daily queue, stale estimate reminders, manual scripts, won/lost learning, source quality, referral/review asks, and manual won/lost logging. Provider sends stay locked until configured and reviewed. |
| Ads / Marketing Spend Advisor | Partial | Growth Command Center now exposes provider-ready spend guardrails, channel recommendations, stop-loss rules, and draft planning. Live ad publishing/spend is locked. |
| Reputation + Portfolio Engine | Built | Owner/admin Growth Command Center now turns existing jobs, reports, uploads, and estimates into project story candidates, before/after selection guidance, review/referral drafts, proposal proof blocks, social/website drafts, and proof blockers. Sends and publishing remain manual/provider-ready only. |
| Estimate Studio / proposals | Built / Partial | Estimate Studio, packets, PDF, options, GC pieces, handoff, and email gate foundations exist. Final packet polish remains. |
| Core operations loop | Partial | Leads, jobs, schedules, field proof, tickets, reports, change orders, and closeout readiness exist. Dead-end removal remains. |
| Field Mode | Built / Partial | Field-safe mobile workflows exist. Offline drafts/PWA polish remain. |
| Apex Agent Operator | Partial | Agent OS/action inbox/readiness packets exist. Unified command center and provider boundaries need continued polish. |
| Customer portal + communications | Provider-ready | Readiness contracts, access records, share approval, outbound approval, suppression, and delivery-attempt models exist. Real tokenized portal and live sends remain. |
| Billing/payments/packages | Provider-ready | Packages/entitlements/manual readiness exist. Stripe or chosen provider remains unconfigured. |
| Integrations | Provider-dependent | Integration contracts should be built one provider at a time with settings, health, disabled states, tests, and audit trail. |
| Scale/public launch | Partial | Demo/pilot gates exist. Public launch requires production auth, monitoring, backup/restore, managed data plan, support, legal/claims review, onboarding, pricing, and incident process. |

## User Request Inbox

### Now

- Keep building the finished roadmap, not only pilot slices.
- No looped rebuilds.
- Owner/admin must be able to see how Apex HQ helps find new clients.
- Add ads planning so Apex Agent helps contractors decide where to spend and what limits to use.
- Keep provider/account-dependent systems visible and buildable, but do not allow real spend/sends/payments without provider setup and explicit owner action inside that workflow.
- Finish whole phases before stopping for review.
- Deploy completed verified phases to production under standing approval; do not pause only because launch-gate scripts classify unpaid/pilot/public-launch items as NO-GO.

### Next

- Finish Estimate Studio proposal packet polish.

### Later

- Offline field drafts.
- Website builder and SEO/service page drafts.
- Public launch signup and package/pricing site polish.

### Provider-dependent

- Live ad account reporting or publishing.
- Stripe or payment provider.
- Tokenized customer portal sends.
- Twilio/SMS, email provider, Gmail/Calendar, QuickBooks, Google Drive, CompanyCam, DocuSign/e-signature, Maps/weather, Google/Meta Ads APIs.

## Completed Phase Checklist: Growth Foundation

- [x] Create living finish plan.
- [x] Inventory Client Finder / Opportunity Scout / Agent Leads.
- [x] Add provider-ready Ads / Marketing Spend Advisor logic.
- [x] Add Reputation + Portfolio Engine planning signals.
- [x] Build owner-facing Growth Command Center around new work, source review, ads, follow-up, and reviews/referrals.
- [x] Verify phase tests and build.
- [x] Browser QA owner/admin desktop and field mobile safety.
- [x] Commit and push phase.
- [x] Standing production release approval recorded; deploy after validation and hosted health-check.
- [x] Update this file with final phase report.

## Completed Phase Checklist: Website + Lead Intake Funnel

- [x] Keep existing public estimate request route and review-first lead workflow.
- [x] Add trade/service-specific intake fields.
- [x] Capture timeline, budget range, referral source, photo/document notes, and consent.
- [x] Capture source attribution from page URL, referrer, and UTM values.
- [x] Ensure public form can safely target the single active workspace without exposing field data.
- [x] Keep honeypot, rate limiting, required contact channel, explicit target company, and secret redaction.
- [x] Create only manual office lead and due-today review task; no estimate, job, message, invoice, payment, or portal access.
- [x] Add thank-you/next-step state.
- [x] Add owner/admin setup checklist notes in Settings.
- [x] Verify phase tests, build, browser QA, and field safety.
- [x] Commit and push phase.
- [x] Standing production release approval recorded; deploy after validation and hosted health-check.

## Completed Phase Checklist: Sales Follow-Up System

- [x] Keep existing lead, contact history, and follow-up queue systems.
- [x] Add owner/admin Sales Follow-Up System command layer.
- [x] Show daily follow-up work, due/overdue/not-contacted/waiting leads, and manual action prompts.
- [x] Add stale estimate reminders for sent proposals with overdue, missing, or stale follow-up.
- [x] Add call, voicemail, email, text, referral ask, and review ask scripts as manual copy only.
- [x] Add won/lost learning and source-quality summaries.
- [x] Add manual won/lost logging hooks without sending messages or changing ad spend.
- [x] Keep field users blocked from lead, estimate, source, script, and sales command surfaces.
- [x] Verify phase tests, build, browser QA, and field safety.
- [x] Commit, push, deploy, hosted health-check, and record production deploy.

## Active Phase Checklist: Reputation + Portfolio Engine

- [x] Reuse existing jobs, reports, uploads, estimates, and Growth Command Center.
- [x] Add owner/admin project story candidates from real field proof.
- [x] Add before/after photo selection guidance without exposing GPS coordinates or private details.
- [x] Add manual review request and referral ask drafts.
- [x] Add proposal proof blocks for future customer/GC packets.
- [x] Add social and website draft copy with manual publish boundaries.
- [x] Add proof blockers for completed jobs that lack uploads or reviewed reports.
- [x] Keep field users blocked from reputation, referral, review, social, website proof, lead, estimate, pricing, and AI office growth controls.
- [x] Verify phase tests, build, browser QA, and field safety.
- [ ] Commit, push, deploy, hosted health-check, and record production deploy.

## Completed / Frozen Systems

- Demo auth and role permissions.
- Opportunity Scout review-first contracts.
- Agent Leads provider readiness boundaries.
- Package/entitlement readiness model.
- Customer portal/communication readiness contracts.
- Estimate PDF and branded packet foundations.
- Field-safe mobile workflow boundaries.
- Public estimate request manual lead intake funnel.
- Sales Follow-Up System command layer and manual outreach/won-lost learning.
- Reputation + Portfolio Engine project-story, review/referral, proposal proof, and manual social/website draft command layer.

## Do-Not-Rebuild List

- Do not rebuild Opportunity Scout.
- Do not rebuild Agent Leads provider readiness layers.
- Do not rebuild existing lead/source/found opportunity models.
- Do not rebuild Estimate Studio or PDF packets.
- Do not rebuild role/permission models.
- Do not replace existing AI Office; extend it.

## Provider / Account Dependencies

| Dependency | Status | Boundary |
| --- | --- | --- |
| Google Ads / Local Services Ads | Needs account/API key | Planning, copy, budgets, and stop-loss are allowed. No spend or publishing. |
| Meta Ads | Needs account/API key | Draft creative and channel recommendations only. |
| Nextdoor/Yelp/Angi/HomeAdvisor-style marketplaces | Needs account/provider agreement | Track lead quality and marketplace fit manually until configured. |
| Email/SMS provider | Needs account/API key | Drafts and approval queues only. No autonomous sends. |
| Stripe/payment provider | Needs account/API key | Package readiness and payment prep only. No live payments. |
| Customer portal link delivery | Needs tokenized route/provider | Internal preview and approval only. |

## Deploy Log

| Date | Phase | Version/Commit | Environment | Health |
| --- | --- | --- | --- | --- |
| 2026-05-29 | Growth Foundation | `692b474` pushed to `main` | Local QA at `http://127.0.0.1:4100` | `/api/ready` OK; launch gate says guided demo GO and production/pilot/public launch NO-GO. |
| 2026-05-30 | Website + Lead Intake Funnel | `efb5d4a` and `dda3a36` pushed to `main` | Local QA at `http://127.0.0.1:4102` | `/api/ready` OK; launch gate says guided demo GO and production/pilot/public launch NO-GO. |
| 2026-05-30 | Website + Lead Intake Funnel + standing release approval | `1ac46a6` deployed from `main` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Fly machine `148e06e2b53d68` started in `sjc`; 1 check passing; `/api/ready` OK on both domains with database OK. |
| 2026-05-30 | Sales Follow-Up System | `46a5a30` pushed to `main` | Local QA at `http://127.0.0.1:4115` | Owner desktop `/leads` passed; employee mobile `/leads` stayed sales-hidden; local browser errors `[]`. |
| 2026-05-30 | Sales Follow-Up System | `46a5a30` deployed from `main` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Fly machine `148e06e2b53d68` version `594` started in `sjc`; 1 check passing; `/api/ready` OK on both domains with database OK. |
| 2026-05-30 | Reputation + Portfolio Engine | Pending commit | Local QA at `http://127.0.0.1:4127` | Owner desktop `/ai-office` passed; employee mobile `/ai-office` redirected to `/jobs`; local browser errors `[]`. |

## Roadmap Queue

1. Growth Foundation.
2. Website + Lead Intake Funnel.
3. Sales Follow-Up System.
4. Reputation + Portfolio Engine.
5. Estimate Studio + Proposal Packets.
6. Core Operations Loop.
7. Field Mode Finish.
8. Apex Agent Operator.
9. Customer Portal + Communications.
10. Billing / Payments / Packages.
11. Integrations.
12. Scale + Public Launch.

## Next Phase

Estimate Studio + Proposal Packets after Reputation + Portfolio Engine production deploy is recorded.

## Decision Log

| Date | Decision | Reason | Impact |
| --- | --- | --- | --- |
| 2026-05-29 | Use AI Office as the Growth Command Center home. | Opportunity Scout, Agent Leads, follow-up, and agent controls already live there. | Avoids rebuilding and makes the growth loop visible to owner/admin users. |
| 2026-05-29 | Ads are provider-ready planning only. | No pilot/provider/account or ad-spend approval exists. | Contractors can plan budgets, channels, copy, and guardrails without risk of live spend. |
| 2026-05-29 | Reputation/portfolio starts from existing jobs, uploads, reports, and closeout proof. | Proof assets already exist in operations workflows. | Avoids duplicating media/work history while making proof reuse part of growth. |
| 2026-05-29 | Growth Command Center is visible to owner/admin AI Office users even when the deeper Lead Finder package gate is off. | Owners still need to see how Apex HQ helps find clients. | The high-level growth plan is visible; deeper Opportunity Scout management remains behind existing package/permission gates. |
| 2026-05-30 | Public estimate requests stay manual-first. | Public website demand should become owner/admin review work, not automated sends or jobs. | The funnel creates a lead and review task only; estimates, jobs, messages, invoices, payments, and portal links remain locked. |
| 2026-05-30 | Public setup status exposes a target company id only when exactly one active company exists. | The API requires an explicit target company for external writes, and the public form needs a safe way to submit to the right workspace. | Single-company public form works; multi-company public target remains explicit and guarded. |
| 2026-05-30 | Standing production release approval is granted for completed verified phases. | The owner wants finished phases pushed to production without repeated NO-GO approval loops. | After validation and push, deploy to production and health-check; keep hard stops only for secrets, paid spend, live sends, billing/payment processing, destructive data, hidden GPS/privacy, auth/session control, or known incident risk. |
| 2026-05-30 | Sales follow-up stays manual-first but becomes a finished command system. | Contractors need to win existing leads, not only collect them. | Apex HQ now shows due work, stale estimates, source quality, scripts, won/lost learning, and review/referral asks while keeping sends and spend locked. |
| 2026-05-30 | Reputation and portfolio reuse starts from real job proof only. | Reviews, referrals, and public proof are powerful only when they are true, permissioned, and tied to completed or proof-backed work. | Apex HQ now drafts stories, review/referral asks, proposal proof blocks, and social/website copy while blocking live sends, publishing, fake proof, GPS exposure, and field access. |

## Growth Foundation Phase Report

Goal: make Apex HQ visibly help owner/admin users find new clients, plan ad spend safely, keep follow-up moving, and turn proof into reviews/referrals without rebuilding the existing Opportunity Scout/Agent Leads systems.

What was already built:

- Opportunity Scout search profiles, lead sources, found opportunities, source checks, review-first lead conversion, Agent Leads provider readiness, source coverage/health/readiness layers.
- Lead follow-up, contact history, website lead intake foundations, estimate/job/proof/closeout records, and AI Office review queues.

What was completed now:

- Added this living finish plan as the active no-loop memory file.
- Added Growth Command Center state derivation with Client Finder, Ads Spend Advisor, Follow-Up, and Reputation/Portfolio lanes.
- Added owner/admin Growth Command Center in AI Office.
- Added provider-ready ads planning: daily/monthly guardrails, owner max spend display, target CPL, channel fit, stop-loss, and no autonomous ad spend/publishing boundary.
- Added source coverage checklist for public bids, GCs, plan rooms, HOAs, builders, property managers, past customers, referrals, website, and social/manual sources.
- Kept deeper Daily Job Finder/Opportunity Scout controls behind existing package/permission gates while showing the high-level growth command layer to owner/admin AI Office users.

Provider/account-dependent remaining:

- Live ad account reporting/publishing, marketplace integrations, email/SMS sends, payment processing, and production provider runs.

Affected files:

- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `src/App.jsx`
- `src/growth-command-utils.js`
- `src/growth-command-utils.test.js`

Validation results:

- `node --test --test-concurrency=1 src/growth-command-utils.test.js` passed.
- `npm.cmd run verify:opportunity-scout` passed.
- `npm.cmd run verify:leads` passed.
- `npm.cmd run verify:roles` passed.
- `npm.cmd run build` passed with existing large chunk warnings.
- `git diff --check` passed.
- Local `/api/ready` returned OK.
- `npm.cmd run launch:gate-status -- --json` reported guided demo GO, but customer pilot handoff, production auth smoke, monitoring upgrade, and wider paid launch NO-GO.

Browser QA:

- Owner desktop `/ai-office`: Growth Command Center, Ads Spend Advisor, Best Places To Spend, and Source Coverage Board visible.
- Employee mobile `/ai-office`: redirected to `/jobs`; Growth Command Center and owner growth/ad/source text not visible.

Permissions impact:

- No permission loosening for field users.
- Owner/admin AI Office users can see the high-level growth command layer.
- Deeper Opportunity Scout management remains controlled by existing package/permission gates.

Field-user impact:

- Field users still do not see leads, estimates, pricing, ads, AI Office growth controls, billing, or company setup.

Mobile impact:

- Employee mobile restricted-route behavior verified.
- Owner/admin mobile-specific polish is still a later UI pass.

Rollback note:

- Revert `src/App.jsx`, `src/growth-command-utils.js`, `src/growth-command-utils.test.js`, and this living plan update to remove the Growth Command Center without touching existing Opportunity Scout data or schemas.

Next recommended phase:

- Website + Lead Intake Funnel, then Sales Follow-Up System.

## Website + Lead Intake Funnel Phase Report

Goal: make the public request flow capture real contractor demand and route it safely into owner/admin lead review.

What was already built:

- Public estimate request route, public demo interest route, honeypot/rate limiting, required contact channel, lead/customer creation, queue cue, audit activity, field-role denial tests, and website lead integration package contracts.

What was completed now:

- Added service type, timeline, budget range, referral source, photos/documents note, and contact consent to the public estimate request form.
- Added source attribution capture for page URL, referrer, UTM source, UTM medium, UTM campaign, source app, and source submission id.
- Added a thank-you/next-step state that explains office review, manual follow-up, and project fit confirmation.
- Updated the server route to store enriched safe notes, mark urgent timelines high priority, set follow-up due today, and create a manual "Review website request" queue task.
- Exposed a public estimate request target company id only when one active company exists so the browser form can satisfy the explicit-target API gate.
- Added owner/admin Settings setup checklist notes for public intake.
- Expanded `verify:public-request` to include the new public form tests.

Provider/account-dependent remaining:

- Website embed on an external contractor site, branded service pages, SEO/service page drafts, file/photo upload provider, and any automated email/SMS follow-up.

Affected files:

- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `package.json`
- `server/index.js`
- `server/public-request.test.js`
- `src/App.jsx`
- `src/public-estimate-request-form.js`
- `src/public-estimate-request-form.test.js`
- `src/public-estimate-request-page-components.jsx`
- `src/public-estimate-request-page-components-import.test.js`

Validation results:

- `npm.cmd run verify:public-request` passed.
- `npm.cmd run verify:leads` passed.
- `npm.cmd run verify:roles` passed.
- `npm.cmd run build` passed with existing large chunk warnings.
- `git diff --check` passed.
- `npm.cmd run launch:gate-status -- --json` reported guided demo GO, but customer pilot handoff, production auth smoke, monitoring upgrade, and wider paid launch NO-GO.

Browser QA:

- Public mobile `/request-estimate`: submitted a request and reached the thank-you state with manual follow-up and project-fit next steps.
- Owner desktop `/leads`: created website request lead visible with review task.
- Employee mobile `/leads`: redirected to `/jobs`; website lead and lead workspace text not visible.

Permissions impact:

- No field permissions were loosened.
- Public requests create owner/admin review work only.
- External write target remains explicit; browser target is exposed only for single active company public intake.

Field-user impact:

- Field users still cannot see public leads, lead pipeline, estimates, pricing, AI office, billing, or settings.

Mobile impact:

- Public mobile request flow and employee mobile restricted-route behavior were browser-tested.

Rollback note:

- Revert the listed files to return to the prior basic public estimate request form and server notes without schema changes or data migration.

Next recommended phase:

- Sales Follow-Up System.

## Sales Follow-Up System Phase Report

Goal: help contractors win more of the leads and estimates they already have before buying more leads or ads.

What was already built:

- Lead states, lead filtering, contact history, manual follow-up queue, communication center, copy-only outreach drafts, lead source checks, estimate follow-up notifications, role-gated Leads route, and field-user denial.

What was completed now:

- Added a Sales Follow-Up System command layer on the owner/admin Leads page.
- Added daily follow-up queue summary for due, overdue, not-contacted, waiting, follow-up-needed, and unscheduled work.
- Added stale estimate reminders for sent/proposal/pending estimates with overdue, missing, or stale follow-up.
- Added source-quality rows by lead source with open, due, waiting, won, lost, and win-rate signals.
- Added won/lost learning rows from lead status and contact-history outcomes.
- Added call, voicemail, email, text, referral ask, and review ask script library as manual copy only.
- Added manual Log Won and Log Lost actions to the draft/copy panel so outcomes can feed source learning.

Provider/account-dependent remaining:

- Live email/SMS/DM sending, communication provider delivery, CRM sync, ad-platform reporting, and automatic review/referral sends remain provider-dependent and locked.

Affected files:

- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `scripts/verify-leads.mjs`
- `scripts/verify-leads.test.mjs`
- `src/leads-page-components.jsx`
- `src/leads-page-components-import.test.js`
- `src/manual-outreach-drafts.js`
- `src/manual-outreach-drafts.test.js`
- `src/manual-outreach-panel-components.jsx`
- `src/sales-follow-up-system.js`
- `src/sales-follow-up-system.test.js`

Validation results:

- `node --test --test-concurrency=1 src/sales-follow-up-system.test.js src/manual-outreach-drafts.test.js src/leads-page-components-import.test.js` passed.
- `npm.cmd run verify:leads` passed.
- `npm.cmd run verify:roles` passed.
- `npm.cmd run build` passed with existing large chunk warnings.
- `git diff --check` passed.

Browser QA:

- Owner desktop `/leads`: Sales Follow-Up System, Stale Estimate Reminders, Lead Quality By Source, Scripts/Reviews/Referrals, Won/Lost Reasons, and manual boundary visible.
- Employee mobile `/leads`: Sales Follow-Up System, Lead Quality By Source, and lead workspace text hidden.
- Browser errors after ignoring expected unauthenticated bootstrap probe: none.

Permissions impact:

- No permission loosening.
- Sales follow-up command layer is under the existing Leads route and contact-history permissions.
- Field users remain blocked from leads, estimates, source quality, scripts, won/lost learning, and office sales controls.

Field-user impact:

- No field workflow changes. Employee mobile route remains sales-hidden.

Mobile impact:

- Employee mobile restricted-route behavior verified. Owner/admin desktop command layer verified; owner/admin mobile polish can be handled in a later UI pass if needed.

Rollback note:

- Revert the affected files listed above to remove the Sales Follow-Up System command layer and won/lost quick actions without schema changes or data migration.

Next recommended phase:

- Reputation + Portfolio Engine.

## Reputation + Portfolio Engine Phase Report

Goal: turn completed and proof-backed contractor work into trust assets that help win future work without inventing proof, sending messages, publishing posts, or exposing field-private data.

What was already built:

- Jobs, uploads, daily reports, closeout proof, proposal proof foundations, Growth Command Center, owner/admin AI Office, and role-gated field boundaries.

What was completed now:

- Added a review-first Reputation + Portfolio Engine state layer.
- Added owner/admin Growth Command Center panel for project story candidates, before/after guidance, review/referral drafts, proposal proof blocks, social/website drafts, and proof blockers.
- Added manual-only safety boundaries for review requests, referral asks, social posts, website gallery items, customer names/logos/quotes/photos, GPS coordinates, and fake proof.
- Added focused tests for proof-ready stories, proof blockers, field-role blocking, and anti-fake-proof boundaries.
- Added the new reputation utility test to `verify:jobs`.

Provider/account-dependent remaining:

- Live review requests, referral emails/texts/DMs, Google Business Profile prompts, social publishing, website gallery publishing, and any external customer communication remain provider/account-dependent and manual-send locked.

Affected files:

- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `package.json`
- `src/App.jsx`
- `src/reputation-portfolio-utils.js`
- `src/reputation-portfolio-utils.test.js`

Validation results:

- `node --test --test-concurrency=1 src/reputation-portfolio-utils.test.js src/growth-command-utils.test.js` passed.
- `npm.cmd run verify:jobs` passed.
- `npm.cmd run verify:roles` passed.
- `npm.cmd run build` passed with existing large chunk warnings.
- `git diff --check` passed.

Browser QA:

- Owner desktop `/ai-office`: Growth Command Center, Reputation + Portfolio Engine, Project Story Builder, Review / Referral Queue, Proposal Proof Blocks, and Manual publish only boundary visible.
- Employee mobile `/ai-office`: redirected to `/jobs`; Growth Command Center, Reputation + Portfolio Engine, and Project Story Builder hidden.
- Browser errors: none after ignoring expected unauthenticated bootstrap probe.

Permissions impact:

- No permission loosening.
- Reputation/portfolio proof is owner/admin/office review context only.
- Field users stay blocked from reputation, referral, review, social, website proof, lead, estimate, pricing, AI office growth controls, and GPS/private proof details.

Field-user impact:

- No field workflow changes. Employee mobile restricted-route behavior remains field-safe.

Mobile impact:

- Employee mobile restricted-route behavior verified. Owner/admin desktop command layer verified.

Rollback note:

- Revert the affected files listed above to remove the Reputation + Portfolio Engine panel and utility without schema changes or data migration.

Next recommended phase:

- Estimate Studio + Proposal Packets.
