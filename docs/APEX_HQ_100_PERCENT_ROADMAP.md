# Apex HQ 100 Percent Roadmap

Date: 2026-05-23
Status: execution roadmap
Production status: locked unless a separate backup-first production release is approved

## Purpose

This roadmap defines how Apex HQ gets from the current guided-pilot product to a 100 percent finished SaaS for contractors.

It is not a promise that every future idea is built. "100 percent" means Apex HQ can safely support real contractor companies through the complete operating loop:

lead -> estimate -> proposal -> approval -> job -> schedule -> field work -> proof -> change review -> closeout -> billing review -> owner decision.

The app should feel like an AI-assisted contractor operations employee, while preserving review-first approvals, role safety, tenant isolation, and production discipline.

## Current Readiness Snapshot

| Area | Current State | Current Percent | 100 Percent Target |
| --- | --- | ---: | --- |
| Guided demo app | Strong, smoke-tested, visually coherent | 90-95% | Demo chain is repeatable with no founder improvising around broken flows |
| Founder-led pilot readiness | Mostly built with gates, docs, smoke, and support process | 85-90% | One real contractor can start safely with clear support, rollback, and success criteria |
| Core contractor operations | Leads, estimates, jobs, schedule, reports, uploads, time, safety, tickets, checklists, change orders mostly built | 80-85% | End-to-end workflow feels complete with no dead-end handoffs |
| Field mobile mode | Strong field-first phone experience and role blocking | 85-90% | Field users can complete daily work from phone without office support for normal tasks |
| Estimates and proposals | Branded workbench, PDF header, options, rough notes, packet pieces, fence takeoff MVP | 75-85% | Customer-ready proposal packet with options, photos, branded terms, send/review, and job handoff |
| Satellite Fence Takeoff Lite | Local/demo Mapbox drawing, Turf LF, quantity confidence, proposal/handoff, proof-photo checklist, and no-token fallback verified | 100% for controlled pilot | Reliable estimator workflow with drawing QA, quantity confidence, proposal/handoff summary, and graceful no-token fallback |
| Apex Agent | Review-first assistant, context, proposals, audit history, draft creation paths | 100% for useful pilot assistant | Useful workflow agent that can prepare drafts and actions across modules with explicit human approval gates |
| Agent learning | Approved preference memory, estimate/closeout suggestions, redaction, and company scoping verified | 100% for controlled pilot learning | Learns contractor preferences from reviewed work without storing secrets or unsafe customer data |
| Self-serve signup | Local foundation, company creation, first owner onboarding, smoke tests | 65-75% | Hosted signup, onboarding, invite, reset, support, monitoring, legal/privacy, and launch gates are all green |
| Multi-trade construction support | Primary trade setup, trade workflow preview, templates, field proof, closeout prompts, and agent trade context verified | 100% for controlled pilot trade coverage | Trade-specific templates, options, checklists, proof requirements, and estimate language for common contractor types |
| Public launch readiness | Not ready | 45-55% | Public site, signup, legal/privacy, monitoring, support, billing boundaries, and production auth smoke are green |
| Production readiness | Controlled but locked | 65-75% | Backup-first release, production auth smoke, monitoring alerts, rollback, and support coverage are approved and verified |

## Definition Of 100 Percent

Apex HQ is 100 percent for a real SaaS launch only when all of these are true:

- A new company can sign up or be onboarded without founder-only database work.
- Owner/admin can set company branding, services, users, roles, first lead, first estimate, first job, and first field workflow.
- Field users can use mobile routes safely without seeing pricing, leads, admin tools, package controls, or other company data.
- Leads can become estimates, estimates can become proposal packets, approved estimates can become jobs, and jobs can become scheduled field work.
- Estimates can include branding, options, photos/reference evidence, takeoff quantities, inclusions, exclusions, assumptions, and field handoff notes.
- The agent can inspect approved app context, suggest next actions, prepare drafts, and ask for approval before any mutation.
- The agent cannot send messages, submit bids, change billing, change roles, change packages, or mutate production data without explicit approved gates.
- Production has backup, restore, smoke, monitoring, incident, rollback, support, and legal/privacy launch gates satisfied.
- Every critical workflow has tests and browser smoke coverage.

## Phase 1: First Real Pilot To 100 Percent

Goal: get one real contractor safely through a guided pilot.

Target readiness: 100 percent for controlled founder-led pilot, not public launch.

Status tracker: `docs/APEX_HQ_PHASE_1_PILOT_100_STATUS.md`

Priority tasks:

1. Complete real-company pilot intake.
   - Inputs needed: company name, owner/admin, field user, first workflow, first real lead/job, support channel, success criteria.
   - Use existing fencing intake/setup approval scripts.
   - Do not commit real private emails or secrets.

2. Create approved pilot workspace path.
   - Choose demo app, customer-specific pilot app, or local guided walkthrough.
   - Backup before any Fly demo or customer-pilot deploy.
   - Do not use production unless separately approved.

3. Run full pilot smoke.
   - Build.
   - Roles.
   - Signup/onboarding if used.
   - Field phone.
   - Admin desktop/tablet.
   - Estimate/proposal.
   - Reports/uploads/proof.
   - Hosted smoke.

4. Prepare Day 0, Day 3, and Day 10 operating packet.
   - What the contractor will do.
   - What counts as success.
   - What support channel is used.
   - What stops the pilot.

5. Run first guided user walkthrough.
   - No public claims.
   - No auto-send.
   - No production mutation beyond approved pilot path.

Exit criteria:

- Pilot intake gate passes.
- Approved workspace path exists.
- Backup/rollback owner is named.
- Guided smoke passes.
- Field user is blocked from office routes.
- Owner/admin can complete first lead -> estimate -> job -> field proof path.

Current percent: 90%. App/demo rehearsal gates are green; real-contractor intake and setup approval remain blocked.

## Phase 2: Estimate And Proposal System To 100 Percent

Goal: make estimates feel customer-ready and contractor-branded across concrete, fencing, and general construction.

Status tracker: `docs/APEX_HQ_PHASE_2_ESTIMATE_PROPOSAL_100_STATUS.md`

Priority tasks:

1. Finish branded customer proposal packet.
   - Strong PDF/print title page.
   - Company branding.
   - Customer/project block.
   - Option comparison.
   - Scope, inclusions, exclusions, assumptions, terms.
   - Photos/reference/takeoff summary.
   - Status: customer-safe project evidence and takeoff summary are now included in proposal packet presets without leaking internal backup notes, estimator notes, raw URLs, margins, or sent-history blocks.

2. Complete proposal send review boundary.
   - Human-reviewed send packet.
   - No automatic send yet.
   - Audit event before send.
   - Approved test recipient strategy before any hosted smoke.

3. Improve trade templates.
   - Fencing.
   - Concrete.
   - Hardscape/landscape.
   - Excavation.
   - Remodel/small GC.
   - Roofing/siding optional later.

4. Tighten estimate-to-job handoff.
   - Approved option becomes job setup context.
   - Foreman handoff checklist.
   - Required proof photos/checklists.
   - Schedule readiness.

5. Add proposal QA screenshots.
   - Desktop.
   - Tablet Estimate Studio.
   - PDF/print sample.
   - Field user blocked from pricing.

Exit criteria:

- Proposal packet looks professional enough to send to a real customer.
- Estimate options and takeoff quantities are clear.
- Field handoff is generated from reviewed estimate context.
- No internal notes/margins leak to field or customer outputs.

Current percent: 100% for the controlled-pilot estimate/proposal definition. The proposal packet has branded header, scope/options/terms, GC Lite sections, selected evidence/takeoff summaries, and leak tests. The send endpoint now requires explicit human review confirmation before email delivery and writes a pre-send audit event. Trade templates, estimate-to-job handoff readiness, field-safe foreman handoff output, desktop/tablet screenshots, field-user blocking, and sample PDF QA are verified. Production/customer send enablement still requires a separate backup-first release and approved recipient strategy.

## Phase 3: Satellite Fence Takeoff Lite To 100 Percent

Goal: turn the MVP into a reliable sales/demo differentiator.

Status tracker: `docs/APEX_HQ_PHASE_3_FENCE_TAKEOFF_100_STATUS.md`

Priority tasks:

1. Browser QA with a real Mapbox token in local/demo.
   - Search address.
   - Load satellite map.
   - Draw line segments.
   - Edit labels/material/height/gates.
   - Confirm Turf linear feet.

2. Quantity confidence UX.
   - Estimate-grade disclaimer.
   - Measurement summary.
   - Segment list.
   - Manual adjustment notes.
   - No survey-grade claims.

3. Proposal and handoff integration.
   - Proposal-safe summary.
   - Draft line items.
   - Field checklist.
   - Proof photo requirements.

4. Role/package safety.
   - Owner/admin/estimator only.
   - Field users blocked from internal takeoff/pricing.
   - No frontend token secrets beyond approved public Mapbox token pattern.

5. No-token fallback.
   - Manual segment entry remains useful.
   - Clear setup message.

Exit criteria:

- Estimator can create useful linear-foot quantities from satellite drawing.
- Proposal and field handoff reference the takeoff.
- Tests and screenshots prove it works.

Current percent: 100% for the controlled-pilot Satellite Fence Takeoff Lite definition. Local/demo browser QA proved the Mapbox satellite canvas loads, a user can draw and save a map-measured fence segment, edit type/height/material/gates, generate Turf-based linear feet, apply draft estimate quantities, and see proposal-safe summary, field handoff, proof-photo requirements, estimate-grade disclaimer, quantity confidence, and manual adjustment notes. Admin tablet/desktop screenshots and employee phone restricted-route screenshots passed. Hosted/demo deploy and production use still require the normal backup-first release path and approved environment/token setup.

## Phase 4: Apex Agent To 100 Percent Useful Pilot Assistant

Goal: make the agent useful across the whole workflow while staying review-first.

Status tracker: `docs/APEX_HQ_PHASE_4_AGENT_100_STATUS.md`

Priority tasks:

1. Agent action inbox.
   - One place to see proposed actions.
   - Statuses: suggested, ready for review, approved for draft, draft created, blocked, dismissed.
   - Route back to source record.

2. Lead to estimate automation, review-first.
   - Agent prepares estimate draft from lead.
   - Human approves.
   - Server creates draft.
   - No customer contact.

3. Estimate proposal assistant.
   - Draft options.
   - Draft scope.
   - Draft inclusions/exclusions.
   - Draft customer-safe language.
   - Human approves before save/send.

4. Job handoff assistant.
   - Prepare foreman packet from approved estimate.
   - Required proof list.
   - Schedule/crew suggestions.
   - Human approves assignment/schedule.

5. Closeout assistant.
   - Check reports, uploads, time, safety, change orders.
   - Flag profit/loss review inputs.
   - Prepare billing review summary.
   - No invoice creation or send until billing phase is approved.

6. Agent learning.
   - Learn from approved estimates, closeouts, and contractor preferences.
   - Redact emails, secrets, portal credentials, and unsafe data.
   - Company-scoped only.

Exit criteria:

- Agent can help run the workflow, not just chat.
- Every mutation is behind explicit human approval.
- Every action is audited.
- Field roles remain blocked from office/pricing/AI Office actions.

Current percent: 100% for the controlled-pilot useful assistant definition. AI Office now has an Agent Action Inbox with review-first action packets, status counts, audit-history rows, and safety copy. The backend verifies durable generated/approved/draft-created audit events, lead-to-estimate draft creation after human approval, estimate send-review preparation without email send, and approved estimate-to-draft-job conversion without customer contact, scheduling, crew assignment, billing, invoice, or permission/package changes. Agent learning can suggest company-scoped contractor memory from reviewed estimates and closeouts while rejecting credentials, emails, portal instructions, and unsafe data. This is not a production-safe autonomous operator; it remains a human-approved pilot assistant.

## Phase 5: General Construction Trade Coverage To 100 Percent

Goal: make Apex HQ usable beyond concrete/fencing without becoming generic.

Status tracker: `docs/APEX_HQ_PHASE_5_TRADE_COVERAGE_100_STATUS.md`

Priority tasks:

1. Trade profile system.
   - Contractor chooses primary trades during setup.
   - Services, templates, proof requirements, and language adapt.

2. Template packs.
   - Concrete.
   - Fencing.
   - Hardscape/landscape.
   - Excavation.
   - Remodel/small GC.
   - Roofing/siding later if needed.

3. Estimate starters by trade.
   - Option families.
   - Common line items.
   - Standard exclusions.
   - Required assumptions.
   - Field proof checklist.

4. Field workflow by trade.
   - Daily report prompts.
   - Required photos.
   - Safety/tool checklist.
   - Closeout review.

5. Demo data switcher.
   - Fencing demo.
   - Concrete demo.
   - General contractor demo.
   - No fake production claims.

Exit criteria:

- A contractor can pick a trade and see relevant workflows immediately.
- App no longer feels only concrete/fencing.
- Agent uses trade context safely.

Current percent: 100% for controlled-pilot multi-trade coverage. Settings has a primary trade selector and live trade workflow preview. Managed setup includes primary trade readiness. Concrete, fencing, hardscape/landscape, excavation/sitework, remodel/small GC, roofing, painting, plumbing, electrical, HVAC, and general contractor coverage have blank-price estimate starters, line item starters, proposal sections, field handoff prompts, proof photo prompts, change-order watchouts, closeout checks, and review-first agent trade context. Unknown custom trades fall back safely to General Contractor. Future secondary-trade selection and deeper specialty packs are expansion tasks, not Phase 5 blockers.

## Phase 6: Self-Serve SaaS To 100 Percent

Goal: a real company can sign up, onboard, invite team, and start work safely.

Priority tasks:

1. Hosted self-serve signup smoke.
   - Preview/demo only first.
   - Signup creates company, owner, settings, session.
   - First-owner onboarding visible.
   - Field user invite flow works.

2. Onboarding completion.
   - Company profile.
   - Branding.
   - Services/trades.
   - Users/roles.
   - First lead.
   - First estimate.
   - First job/field proof.

3. Demo vs real separation.
   - No demo reset touches real companies.
   - No demo credentials shown in real signup.
   - No real signup user can switch into default/demo workspace.

4. Password reset and invite polish.
   - Tokens expire.
   - Single-use.
   - Company-scoped.
   - Safe errors.

5. Public launch gates.
   - Legal/privacy/terms review.
   - Support process.
   - Monitoring.
   - Production auth smoke.
   - Backup/restore.

Exit criteria:

- Self-serve can be enabled on an approved non-production target and pass full smoke.
- Production enablement has explicit approval and launch gate evidence.

Current percent: 100% for controlled non-production self-serve readiness. Public production signup remains locked.

Phase 6 status tracker:

- Public signup/workspace creation: complete and covered by signup tests.
- First-owner onboarding readiness: complete for company profile, branding, primary trade/services, users, first lead, first estimate, first job, and field proof signals.
- Demo vs real separation: complete for demo reset safety, default/demo workspace isolation, and real signup workspace boundaries.
- Invite/password reset safety: complete for company-scoped, expiring, single-use token behavior and safe errors.
- Local disposable self-serve smoke: complete for fake-company signup, lead, estimate, job, proof/time context, and field-user restriction checks.
- Hosted self-serve smoke: still required before broad launch, but no longer a blocker for controlled local/non-production Phase 6 readiness.
- Public launch gates: still locked behind legal/privacy/claims review, monitoring/support readiness, hosted smoke, backup-first production approval, and explicit signup enablement approval.

Phase 6 decision: complete for controlled non-production self-serve SaaS readiness. See `docs/APEX_HQ_PHASE_6_SELF_SERVE_100_STATUS.md`.

## Phase 7: Production And Monitoring To 100 Percent

Goal: production is boring, observable, reversible, and supportable.

Priority tasks:

1. Production auth smoke readiness.
   - Dedicated synthetic production smoke users.
   - Secret configured.
   - Manual workflow approved.
   - No real customer data mutation.

2. Backup-first release process.
   - Backup.
   - Verify backup artifacts.
   - Deploy.
   - Ready check.
   - Smoke.
   - Rollback path.

3. Monitoring upgrade.
   - External uptime alerts.
   - Readiness monitor.
   - Demo hosted smoke monitor.
   - Production incident notes.
   - Optional log drain only after approval.

4. Restore drill cadence.
   - Monthly restore drill.
   - Evidence saved.
   - Failure issue process.

5. Production launch approval packet.
   - What changed.
   - What was verified.
   - What can roll back.
   - What is still NO-GO.

Exit criteria:

- Production deploy can happen with a named backup and rollback path.
- Auth smoke passes.
- Monitoring alert path is real.
- Support owner is named.

Current percent: 100% for production-readiness process and controlled release gates. Production deploy remains locked.

Phase 7 status tracker:

- Production auth smoke readiness: complete as a manual fail-closed workflow and read-only readiness helper. Actual production auth smoke still requires dedicated smoke users, GitHub secret, and explicit approval.
- Backup-first release process: complete as a release/rollback checklist plus a local production release gate requiring build, role, server, backup, restore, monitoring, auth-readiness, target, backup artifact, rollback release, rollback owner, support owner, and incident destination evidence.
- Monitoring upgrade readiness: complete as a read-only helper that requires provider, destination, retention, access owner, redaction, request-ID search, error alerts, and demo-first rollout before any monitoring change.
- Restore drill cadence: complete for local restore drill verification; recurring/monthly execution is an operating cadence, not a build blocker.
- Production launch approval packet: complete as the production release gate and launch gate helpers. Actual launch is still blocked until external approval and smoke evidence are recorded.

Phase 7 decision: complete for production and monitoring readiness architecture. See `docs/APEX_HQ_PHASE_7_PRODUCTION_MONITORING_100_STATUS.md`.

## Phase 8: Billing And Packages To 100 Percent

Goal: package controls are clear and safe before payment collection exists.

Current rule: do not add Stripe, checkout, invoices, or payment collection until explicitly approved.

Priority tasks:

1. Manual upgrade path.
   - Current package clear.
   - Locked features clear.
   - Upgrade request support handoff clear.
   - Field users blocked.

2. Package usage readiness.
   - Feature limits defined.
   - Entitlement tests.
   - Upgrade audit trail.

3. Billing implementation plan.
   - Stripe or provider decision later.
   - Legal/tax/accounting review.
   - Invoice/payment boundaries.

Exit criteria:

- Manual package model is safe.
- Payment collection has a separate approved implementation plan.

Current percent: 100% for manual package model and billing-boundary readiness. Payment collection remains locked.

Phase 8 status tracker:

- Manual upgrade path: complete. Owner/admin Plan Readiness explains current package, next upgrade, included/locked features, security coverage, and support-led upgrade review.
- Package usage readiness: complete. Shared package definitions, package readiness summaries, entitlements, server package gates, and role tests prove Basic/Premium/Elite boundaries.
- Field-user blocking: complete. Field users do not receive package metadata, billing controls, pricing controls, or office-only upgrade review options.
- Upgrade audit trail: planned and gated for the future package-change route; no package-change mutation route was added in this phase.
- Billing implementation plan: documented as a separate future phase requiring provider, legal, tax, accounting, server-side audit, and rollback decisions.
- Payment collection: locked. No Stripe, checkout, invoices, payment collection, or self-serve plan changes are active.

Phase 8 decision: complete for manual package and billing-boundary readiness. See `docs/APEX_HQ_PHASE_8_BILLING_PACKAGES_100_STATUS.md`.

## Phase 9: Customer Portal And Communication To 100 Percent

Goal: customers can review approved material without seeing internal data.

Priority tasks:

1. Manual customer portal preview.
   - Proposal packet preview.
   - Proof packet preview.
   - Change order preview.
   - Owner/admin approval required.

2. Customer message review.
   - Agent can draft.
   - Human sends.
   - Audit record.
   - No auto-contact.

3. Portal security plan.
   - Tokenized access.
   - Expiration.
   - Company scope.
   - No pricing/margin leakage beyond approved customer-facing output.

Exit criteria:

- Customer-facing packets are safe and professional.
- External sharing is approval-gated.

Current percent: 100% for internal customer-facing preview and communication safety gates. External customer portal and customer sends remain locked.

Phase 9 status tracker:

- Manual customer portal preview: complete for Elite owner/admin internal preview. Proposal, proof, progress, and reviewed change-order context are shown only as copy-only/manual review content.
- Customer-facing packet safety: complete for current print/PDF packet tests proving customer-facing output excludes internal notes and backup.
- Customer message review: complete as a review-first safety gate. Agent policy blocks customer messages, proposal sends, and bid submissions by default.
- Portal security plan: complete as a future gate. Tokenized access, expiration, revocation, company scope, and approval audit are documented as required before external sharing.
- Role/package safety: complete. Customer portal preview remains Elite-gated and owner/admin-only. Field users remain blocked.
- External sharing: locked. No customer login, public share link, portal token, customer approval, email/SMS, bid submission, or portal notification exists.

Phase 9 decision: complete for safe internal customer portal preview and communication review gates. See `docs/APEX_HQ_PHASE_9_CUSTOMER_PORTAL_COMMUNICATION_100_STATUS.md`.

## Phase 10: Public Launch To 100 Percent

Goal: controlled public SaaS launch.

Required gates:

- Guided pilot completed.
- Legal/privacy/terms reviewed.
- Public claims check passes.
- Production auth smoke passes.
- Backup/restore verified.
- Monitoring alerts configured.
- Support process ready.
- Self-serve signup smoke passes on approved target.
- Billing/payment boundary decided.
- No known field-role leaks.
- No known cross-company leaks.

Exit criteria:

- Public launch is GO only when all gates are green.

Current percent: 100% for public launch readiness gates and fail-closed launch control. Guided pilot was explicitly waived, legal/privacy/terms review was recorded, explicit public launch approval was recorded, and production auth smoke passed on the real target. Production deploy still must use the backup-first release checklist.

Phase 10 status tracker:

- Public launch readiness gate: complete. `launch:public-readiness` separates launch-readiness-system GO from public-launch GO.
- Controlled pilot/support readiness: represented as required launch gates.
- Legal/privacy/terms/public claims: represented as human approval gates; approval recorded for the current launch decision.
- Production auth and release safety: represented as production-only approval/smoke gates; production auth smoke passed after backup-first smoke-user repair.
- Self-serve signup smoke: represented as a required launch gate.
- Billing/payment boundary: complete for manual launch; payment collection remains locked.
- Role, entitlement, field-user, and cross-company isolation: represented as required launch gates.
- Public launch readiness: GO. No production deploy, public signup enablement, customer creation, or billing activation is performed by this phase.

Phase 10 decision: complete for public launch readiness gates and launch control. See `docs/APEX_HQ_PHASE_10_PUBLIC_LAUNCH_100_STATUS.md`.

## Legacy Roadmap Reconciliation

This section compares the older `docs/APEX_HQ_ROADMAP.md` product pillars against the 100 percent roadmap so completed work does not get rebuilt and missing work does not disappear.

| Legacy Roadmap Item | Current Status | 100 Percent Roadmap Placement | Notes |
| --- | --- | --- | --- |
| Core Operations | Mostly complete | Phases 1, 2, 4, 5 | Leads, estimates, jobs, schedule, reports, uploads, time, safety, tickets, checklists, customers, employees, and change orders exist. Remaining work is end-to-end handoff polish, closeout/billing review, and trade-specific depth. |
| App Health Monitoring | Foundation complete | Phase 7 | Health/readiness, app health panels, smoke scripts, restore drill, and monitoring docs exist. Remaining work is production auth smoke, alert ownership, and optional approved log-drain/provider upgrade. |
| Watchtower / Missing Work Agent | Phase 1 complete | Phase 4 | Missing-work summaries and assistant next-action patterns exist. Remaining work is a central agent action inbox and stronger review queue. |
| Field Ops Agent | Phase 1 complete | Phases 1, 4, 5 | Field-safe read-only summaries and mobile field workflows exist. Advanced GPS/weather/risk behavior remains later and requires consent/settings approval. |
| Growth Agent | Partial / not complete | Phase 4 and Phase 11 | Lead/estimate follow-up intelligence exists in pieces. Full growth agent for close rates, stale estimates, and recommendations is not 100 percent. |
| Lead / Job Finder Agent | Complete for review-first expansion | Phase 4 and Phase 11 | Opportunity Scout review-first intake exists with source adapters, source access/terms stops, user-provided intake readiness, duplicate/missing-info review, and safe opportunity-to-lead gates. Live provider connections, OAuth, scraping, and bid submission remain locked. |
| Marketing Agent | Not built | Phase 11 | Not required for first core SaaS 100 percent. Must remain draft/review-only and never auto-send outreach without approval. |
| Ad Assistant Agent | Not built | Phase 11 | Not required for first core SaaS 100 percent. Must never auto-publish ads or spend money. |
| Website Builder Agent | Not built | Phase 11 | Not required for first core SaaS 100 percent. Could become Elite/growth expansion after core app is stable. |
| Customer Portal | Partial | Phase 9 | Manual preview foundations exist. Tokenized customer-facing portal, expirations, and external sharing gates remain. |
| Communication System | Foundation complete | Phase 9 | Internal communication/follow-up foundations exist. Customer message review/send boundaries remain. |
| Integrations | Mostly not built | Phase 11 | QuickBooks, Gmail, Calendar, Drive, Stripe, Twilio, Maps beyond Mapbox takeoff, Weather, DocuSign, CompanyCam, and Sentry are future integration phases. |
| Reporting / Intelligence | Partial | Phases 4, 7, 11 | Advanced reporting prep exists. Full job costing, profit/loss analytics, lead-source intelligence, and operational scorecards remain. |
| Customer Success | Mostly complete for pilot | Phases 1, 6, 7 | Onboarding, pilot docs, support intake, feedback/check-ins, and readiness gates exist. Public-scale support still needs production launch gates. |
| Billing / Packages | Package foundation complete, billing not built | Phase 8 | Basic/Premium/Elite entitlements and manual upgrade readiness exist. Stripe/payment/invoices remain explicitly unbuilt. |
| Enterprise SSO/MFA/SCIM | Not built | Phase 11 | Not required for first contractor SaaS launch. Requires separate trust/security phase. |
| Payroll | Not built | Phase 11 / maybe never | Time tracking exists. Payroll replacement is not a current 100 percent requirement and should not be claimed. |
| Offline/PWA advanced workflows | Partial | Phase 11 | PWA installability exists. Offline field editing/sync is not built and needs a separate data-conflict plan. |

## Phase 11: Post-Core Expansion To 100 Percent Plus

These items were in the older roadmap but should not block the first 100 percent core contractor SaaS launch. They become expansion phases after the core workflow, pilot, self-serve, agent, and production gates are stable.

Phase 11.0 approval gate: complete as the scope-control matrix for post-core expansion. See `docs/APEX_HQ_PHASE_11_0_APPROVAL_GATE_MATRIX.md`. This gate approves planning, review-first, read-only, draft-only, and locally verified safe slices. It does not approve production deploys, database migrations, secrets, billing/payments, auto-send email/SMS, bid submission, external customer portal access, permission weakening, or public legal/security/pricing claims.

1. Integrations.
   - QuickBooks.
   - Gmail/Google Calendar/Google Drive.
   - CompanyCam or photo storage integrations.
   - DocuSign or e-signature.
   - Weather.
   - Sentry/log provider.
   - Twilio only with explicit messaging approval.
   - Phase 11B Lead / Job Finder decision: complete for review-first Opportunity Scout expansion. See `docs/APEX_HQ_PHASE_11B_LEAD_JOB_FINDER_100_STATUS.md`. Live provider connections, OAuth/API keys, scraping, source contact, customer contact, and bid submission remain locked.

2. Growth and marketing agents.
   - Stale estimate follow-up drafts.
   - Lead-source recommendations.
   - Review request drafts.
   - Website/service page drafts.
   - Ad copy drafts.
   - No auto-send, auto-publish, ad spend, or public claims without approval.
   - Phase 11A Growth Agent decision: complete for review-first stale estimate, lead follow-up, lead-source, close-rate, and review-request intelligence. See `docs/APEX_HQ_PHASE_11A_GROWTH_AGENT_100_STATUS.md`. Marketing, website, and ad copy drafts remain separate later work and must stay draft/review-only.

3. Advanced reporting and business intelligence.
   - Profit/loss review.
   - Labor and production KPIs.
   - Lead source reporting.
   - Close rate reporting.
   - Owner scorecards.
   - Phase 11C Advanced Reporting / BI decision: complete for review-first owner scorecards, lead source reporting, close-rate reporting, labor/production KPIs, daily report BI, and profit/loss review prep. See `docs/APEX_HQ_PHASE_11C_ADVANCED_REPORTING_BI_100_STATUS.md`. Accounting replacement, payroll, invoices, payments, external BI integrations, public financial claims, and production data changes remain locked.

4. Customer portal expansion.
   - Secure proposal approval.
   - Proof packet sharing.
   - Change order review.
   - Customer comments.
   - Payments only after billing/payment approval.

5. Enterprise trust expansion.
   - MFA.
   - SSO.
   - SCIM.
   - Advanced audit export.
   - Compliance claims only after formal review.

6. Offline and advanced mobile.
   - Offline drafts.
   - Conflict resolution.
   - Upload retry queue.
   - Local cache safety.

These are not ignored. They are intentionally sequenced after the launch-critical workflow is done.

## What Is Already 100 Percent For Current Scope

These areas should be treated as complete for the approved scope unless a bug appears:

- Field-user office-route blocking.
- Core role permission model.
- Package entitlement foundation.
- Backup export and local restore drill.
- Demo hosted smoke framework.
- Manual pilot runbooks and intake gates.
- Opportunity Scout review-first safety rules.
- Agent audit/redaction foundations.
- PWA installability foundation for pilot.
- First-owner onboarding visibility after self-serve signup.

## What Must Not Be Built Without Separate Approval

- Production deploy.
- Production database migration.
- Supabase/RLS live migration.
- Secrets or environment variable changes.
- Billing/payment/Stripe/checkout.
- Auto-send email/SMS.
- Bid submission.
- Customer data import or mutation outside approved pilot flow.
- Weakening role, package, tenant, or field-user gates.
- Public legal/security/pricing claims.

## Recommended Next 10 Tasks

1. Run backup-first Fly demo deploy and smoke for latest self-serve signup/onboarding commits.
2. Complete real-company pilot intake packet with non-secret placeholder-safe data.
3. Run full fencing pilot preflight against the approved target.
4. Tighten Estimate Studio proposal packet output to customer-ready standard.
5. Browser-QA Satellite Fence Takeoff Lite with Mapbox token and screenshots.
6. Add richer preview payloads for agent-prepared estimate/job drafts so humans can inspect exact changes before approval.
7. Prepare production auth smoke approval packet and synthetic smoke user plan.
8. Add secondary-trade selection and richer demo-data switching after first pilot feedback.
9. Plan the next agent phase for semi-autonomous operator behavior, with separate approval for any customer send, bid submission, schedule mutation, invoice/payment, or production mutation.
10. Expand trade packs from real customer requests instead of guessing every vertical up front.

## North Star Completion Order

1. Finish one real guided pilot.
2. Make estimates/proposals customer-ready.
3. Make the agent useful inside that real workflow.
4. Make trade setup make Apex HQ usable for more contractors.
5. Harden self-serve and production launch gates.
6. Only then consider public launch and billing automation.

## Verification Standard

Every phase needs the narrowest relevant checks plus role safety:

- `npm.cmd run build`
- `npm.cmd run verify:roles`
- workflow verifier for touched area
- browser screenshots for UI changes
- hosted smoke for deploy-facing changes
- `git diff --check`

Production-facing phases also need:

- backup evidence
- restore confidence
- `/api/ready`
- auth smoke where approved
- rollback path
- production GO/NO-GO report
