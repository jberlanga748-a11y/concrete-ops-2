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

Current percent: 100% for the controlled-pilot useful assistant definition, with Agent OS v1 foundation now local. AI Office now has an Agent Action Inbox with review-first action packets, status counts, audit-history rows, and safety copy. The backend verifies durable generated/approved/draft-created audit events, lead-to-estimate draft creation after human approval, estimate send-review preparation without email send, and approved estimate-to-draft-job conversion without customer contact, scheduling, crew assignment, billing, invoice, or permission/package changes. Agent OS v1 adds a shared action registry, per-workflow autonomy settings, audit-backed task/run queue records, run statuses, retry/dead-letter/cancel/kill-switch/log shape, safe internal draft/prep actions, internal execution into review-first proposal packets, learning signal coverage, and locked external gates for sends, payments, portal actions, scheduling, bid submission, and integrations. Agent learning can suggest company-scoped contractor memory from reviewed estimates and closeouts while rejecting credentials, emails, portal instructions, and unsafe data. This is not a production-safe autonomous operator; it remains a human-approved pilot assistant.

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

## Founder, Autonomy, And Business Operating Backlog

These are now explicit post-core priorities. They should be planned after the desktop command shell and role-specific mobile work are stable, unless a specific item is needed sooner for selling, support, or safety.

1. Agent Policy Engine.
   - Formalize agent action outcomes: auto-approve, human review, or block.
   - Add a review-agent layer before risky agent actions.
   - Auto-approval should be limited to low-risk internal actions such as reminders, draft notes, missing-info flags, owner review tasks, and non-customer-facing summaries.
   - Human review remains required for customer sends, bid submission, pricing changes, estimate-to-job conversion, billing/payment, role/package changes, deletes, production deploys, public posts, legal/tax claims, and angry or ambiguous customer messages.
   - Every action needs an audit trail with source agent, target record, proposed change, risk level, policy result, reviewer decision, and final status.

2. Founder Finance Command.
   - Track Apex HQ revenue, setup fees, MRR, expenses, tax reserve, owner pay, bills due, tools to buy, and CPA/bookkeeper export packets.
   - This is for John running Apex HQ as a business, not customer contractor job accounting.
   - It should calculate and organize money buckets, but not file taxes, run payroll, move money, or replace a CPA/bookkeeper.

3. Founder Growth Command.
   - Move the proven workbook workflow into Apex after it has been used manually.
   - Track prospects, outreach drafts, approvals, demos, pilot offers, setup fees, MRR, social content, follow-ups, and do-not-contact.
   - Keep founder prospects separate from customer contractor workspaces and customer data.
   - No auto-send email/SMS/social posts without explicit approval.

4. Customer Success And Support Command.
   - Add onboarding status, customer health, support tickets, churn risk, training tasks, weekly success summaries, and pilot activation checks.
   - This should help John know which contractor customers need help before they churn or stall.

5. Billing And Subscription Operations.
   - Add Stripe/subscription planning only after pilot pricing and support load are proven.
   - Track packages, trials, setup fees, failed payments, cancellations, pauses, manual overrides, and billing support.
   - Billing automation remains locked until separately approved.

6. Customer Portal.
   - Future customer-facing portal for proposal approval, change-order review, secure proof packet sharing, comments, and later payments.
   - External customer access requires separate security review, token/session controls, audit logging, and privacy checks.

7. Legal, Compliance, And Trust Pack.
   - Terms of service, privacy policy, acceptable use, AI disclosure, SMS/email consent language, cancellation/refund policy, data retention, and support boundaries.
   - No public legal/security/compliance claims without review.

8. Observability, Backup, And Restore Console.
   - Make app health owner-visible: login latency, API errors, failed uploads, failed sends, failed agent actions, database bloat, smoke checks, backup status, and restore drill confidence.
   - Backups should show last backup time, size, export status, and restore readiness.

9. Data Import And Better Role Admin.
   - Add safe CSV/import flows for customers, jobs, leads, estimates, and contacts after schema and duplicate rules are approved.
   - Improve user invites, deactivation, role templates, password reset, crew permissions, and audit visibility.

10. Integrations.
    - Gmail, Google Calendar, Google Drive, OpenPhone/Twilio, Meta/LinkedIn scheduling, QuickBooks export, Stripe, supplier/vendor systems, and monitoring providers remain future phases.
    - Integrations must use official APIs or approved tools, avoid platform-rule bypasses, and fail closed when credentials are missing.

## 100 Percent SaaS Build Execution Board

This section turns the roadmap into buildable work. Builder should pull from this board one build or one narrow slice at a time. Do not jump ahead just because a later build sounds exciting.

Build rules:

- Each build must name exact scope, files likely touched, tests, browser QA, role impact, mobile impact, and rollback notes.
- Each build must preserve field-user blocking, company scoping, package gates, and review-first boundaries.
- Each build must ship in slices small enough to commit, push, deploy to demo if approved, and verify.
- Production deploy, billing/payment, secrets, database migration, auto-send, public customer portal, and external integrations still need separate approval.

| Build | Name | Goal | Depends On | Done Gate |
| --- | --- | --- | --- | --- |
| 0 | Production Blocker Build | Fix hard production gaps before calling the app real SaaS: dependency audit, Docker secret hygiene, container hardening, CSP/session plan, upload backup coverage, stronger rate limits, and monitoring plan. | Current demo stability | Security checks, backup/restore including uploads, auth/session review, demo smoke, rollback notes |
| 1 | Paid Pilot Close Build | Make one contractor able to say yes: pilot close kit, order form outline, manual payment path, support terms, onboarding checklist, Day 0/3/10 success loop. | Build 0 where production-facing | Signed/approved pilot packet, support owner, success criteria, no legal/tax overclaim |
| 2 | QA Evidence Hardening Build | Make audits fail on splash/loading false-passes, missing shell selectors, empty bodies, bad touch targets, contrast, and route-specific content absence. | Current mobile/tablet work | Reliable route matrix, screenshots, no false green proof |
| 3 | Rate Book And Cost Library Build | Add company-standard labor, material, equipment, subcontractor, and markup defaults for estimates and job costing. | Estimate system stable | Owner/admin only, no field exposure, estimate math tests, package/role tests |
| 4 | Material List And Purchasing Prep Build | Convert approved estimate/job scope into material lists, vendor notes, purchase prep, and field delivery needs without ordering or payment. | Build 3 | No vendor purchase, no payment, job/estimate linkage tests |
| 5 | Change Order Money Build | Add priced change orders, customer/GC review status, approval packet, revenue tracking, and billing handoff. | Builds 3-4 | Customer-safe output, no auto-send, field request remains safe |
| 6 | Job Costing Build | Track estimate vs actual labor, time, materials, equipment, subs, change orders, and closeout profit/loss prep. | Builds 3-5 | Owner/admin only, field redaction, cost math tests, closeout review |
| 7 | Customer Portal Build | Add secure tokenized external portal for proposal approval, proof packet review, change-order approval, comments, and revocation. | Builds 3-6 plus security review | Expiring links, audit logs, no internal notes/margins/private URLs |
| 8 | Communication Provider Build | Add approved email/SMS provider flows with consent, opt-out, do-not-contact, templates, delivery history, and outbound approval queue. | Build 7 for customer portal sends or manual mode first | No auto-send, opt-out tests, audit trail, provider failure handling |
| 9 | Agent Operating System Build | Add durable agent task queue, policy engine, autonomy levels, second-check agent, approval tokens, run logs, retries, dead-letter state, and kill switches. | Builds 0 and 2 | Server-enforced policy, idempotency, audit export, field/package denial tests |
| 10 | Integration Registry Build | Add per-company connector registry, OAuth/scopes/secrets storage, webhook signatures, sync logs, provider health, and disable switches. | Build 9 | No frontend secrets, fail-closed connectors, scoped integration tests |
| 11 | Field Offline And PWA Build | Add offline field drafts, upload retry queue, conflict handling, push/in-app notifications, GPS consent settings, and required-proof capture. | Current mobile/tablet plus Build 2 | Offline QA, retry tests, field role safety, no hidden tracking |
| 12 | SaaS Billing Build | Add Stripe/subscriptions, trials, seats, invoices/receipts, dunning, cancellation, pauses, plan changes, and billing audit. | Paid pilot proof, legal/tax/accounting review | Payment tests, entitlement tests, rollback plan, no field exposure |
| 13 | SaaS Admin And Customer Success Build | Add support ticketing, customer health, usage analytics, onboarding status, churn risk, referral/testimonial tracking, help center, and admin audit exports. | Builds 1, 7, 9, 12 as applicable | CS dashboard, support SLA, audit export, role tests |
| 14 | Scale Architecture Build | Move storage/DB/queues toward real SaaS scale: managed database plan, object storage, background jobs, cache/tenant limits, load tests, restore drills. | Real customer usage signals | Load evidence, restore proof, queue/idempotency tests, migration rollback |
| 15 | Public Launch Build | Enable broader public launch only after production, legal, support, billing, portal, monitoring, and onboarding gates are green. | Builds 0-14 or explicit phased waiver | Launch gate GO, production auth smoke, backup-first release, support owner |

Near-term builder order:

1. Build 0A: production blocker audit and tiny fixes that do not change app behavior.
2. Build 2A: audit evidence hardening so screenshots cannot false-pass.
3. Build 1A: paid pilot close kit and onboarding packet.
4. Build 3A: Rate Book / Cost Library audit.
5. Build 3B: Rate Book / Cost Library implementation slice 1.

Build 4A local completion evidence is tracked in `docs/APEX_HQ_MATERIAL_PURCHASING_PREP_STATUS.md` and verified by `npm.cmd run verify:material-purchasing-prep`. It adds review-only material prep, vendor notes, manual checklist, and field delivery needs. It does not unlock supplier messaging, purchase orders, material ordering, payment, billing, integrations, production deploy, secrets/config changes, or production data work.

Build 5A local completion evidence is tracked in `docs/APEX_HQ_CHANGE_ORDER_MONEY_STATUS.md` and verified by `npm.cmd run verify:change-order-money`. It adds manual change amount, customer/GC manual review status, manual billing handoff prep, server redaction for field users, and safe copy boundaries. It does not unlock automatic customer sends, GC submission, invoices, payment collection, job status changes, production deploy, secrets/config changes, or production data work.

Current local completion evidence for these five near-term slices is tracked in `docs/APEX_HQ_ROADMAP_HARDENING_STATUS.md` and verified by `npm.cmd run verify:roadmap-hardening`, `npm.cmd run verify:paid-pilot-close`, and `npm.cmd run verify:rate-book`. This does not unlock production deploy, public launch, billing/payment, external sends, customer portal actions, secrets/config changes, or production data work.

Do not start Builds 7, 8, 10, 12, 14, or 15 without a separate approval because they touch external customers, providers, secrets, payments, data architecture, or public launch.

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
