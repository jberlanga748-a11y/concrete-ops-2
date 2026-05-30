# Apex HQ Living Finish Plan

Last updated: 2026-05-30

## Current Phase

Website + Lead Intake Funnel is completed for the current manual-first phase. Next phase is Sales Follow-Up System.

## Product North Star

Apex HQ is a finished contractor growth and operations platform. It helps contractors find work, advertise wisely, capture and follow up with leads, estimate and win work, schedule and run jobs, guide crews, prove work, handle changes, prepare billing, collect reviews/referrals, and know what to do next every day.

Core loop:

Find work -> advertise smart -> capture lead -> follow up -> estimate -> propose -> win -> schedule -> run field work -> prove work -> close out -> get paid -> create more trust and leads.

## Operating Rules

- Finish one whole phase, then stop and review it.
- Do not rebuild working systems.
- Use existing code first.
- Build provider-ready states when paid accounts or API keys are not configured yet.
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
| Sales follow-up | Partial | Lead states, contact history, follow-up queues, and scripts/readiness exist. Provider sends stay locked until configured and reviewed. |
| Ads / Marketing Spend Advisor | Partial | Growth Command Center now exposes provider-ready spend guardrails, channel recommendations, stop-loss rules, and draft planning. Live ad publishing/spend is locked. |
| Reputation + Portfolio Engine | Partial | Jobs, reports, uploads, closeout proof, and proposal proof blocks exist. Dedicated review/referral/portfolio workflow remains a later phase. |
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
- Keep provider/account-dependent systems visible and buildable, but do not allow real spend/sends/payments without setup and approval.
- Finish whole phases before stopping for review.

### Next

- Build a stronger website and lead intake funnel.
- Finish follow-up workflow polish.
- Finish reputation, reviews, referrals, portfolio, and proof reuse.
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
- [ ] Deploy only after release approval and health-check if provider/runtime access is available.
- [x] Update this file with final phase report.

## Active Phase Checklist: Website + Lead Intake Funnel

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
- [ ] Deploy only after release approval and health-check if provider/runtime access is available.

## Completed / Frozen Systems

- Demo auth and role permissions.
- Opportunity Scout review-first contracts.
- Agent Leads provider readiness boundaries.
- Package/entitlement readiness model.
- Customer portal/communication readiness contracts.
- Estimate PDF and branded packet foundations.
- Field-safe mobile workflow boundaries.
- Public estimate request manual lead intake funnel.

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

Sales Follow-Up System after Website + Lead Intake Funnel passes final review.

## Decision Log

| Date | Decision | Reason | Impact |
| --- | --- | --- | --- |
| 2026-05-29 | Use AI Office as the Growth Command Center home. | Opportunity Scout, Agent Leads, follow-up, and agent controls already live there. | Avoids rebuilding and makes the growth loop visible to owner/admin users. |
| 2026-05-29 | Ads are provider-ready planning only. | No pilot/provider/account or ad-spend approval exists. | Contractors can plan budgets, channels, copy, and guardrails without risk of live spend. |
| 2026-05-29 | Reputation/portfolio starts from existing jobs, uploads, reports, and closeout proof. | Proof assets already exist in operations workflows. | Avoids duplicating media/work history while making proof reuse part of growth. |
| 2026-05-29 | Growth Command Center is visible to owner/admin AI Office users even when the deeper Lead Finder package gate is off. | Owners still need to see how Apex HQ helps find clients. | The high-level growth plan is visible; deeper Opportunity Scout management remains behind existing package/permission gates. |
| 2026-05-30 | Public estimate requests stay manual-first. | Public website demand should become owner/admin review work, not automated sends or jobs. | The funnel creates a lead and review task only; estimates, jobs, messages, invoices, payments, and portal links remain locked. |
| 2026-05-30 | Public setup status exposes a target company id only when exactly one active company exists. | The API requires an explicit target company for external writes, and the public form needs a safe way to submit to the right workspace. | Single-company public form works; multi-company public target remains explicit and guarded. |

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
