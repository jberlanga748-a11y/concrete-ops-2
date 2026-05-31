# Apex HQ Tool Completion Blueprint

Last updated: 2026-05-30

Purpose: this is the employee-owned completion map for Apex HQ. It lists every real tool in the app, where it is now, what "finished" means, which phase finishes it, what depends on a provider/account, and when it becomes frozen.

This file is the correction to slice-based planning. A command panel, readiness badge, or provider setup row does not mean a tool is finished. A tool is finished when a contractor can use it to complete the job it exists for.

## Completion Rule

Every tool must have:

- a real contractor job to do
- a clear owner/admin, estimator, foreman, or employee role boundary
- a start state, work state, review/approval state, and final state
- no dead-end next actions
- mobile behavior when field or mobile owner use is natural
- server-side permission enforcement
- tests, browser QA, deploy evidence, and rollback note
- a freeze rule after completion

## Status Labels

- `Finished`: complete enough to freeze except for bugs/provider hookup/versioned upgrade.
- `Usable / Needs Finish Pass`: works, but the full workflow still has gaps or dead ends.
- `Readiness Layer Only`: planning/setup exists, but real workflow is not done.
- `Provider-Dependent`: Apex HQ can prepare/review, but live execution needs account/API/secrets/provider setup.
- `Missing`: not a real workflow yet.
- `Do Not Rebuild`: extend only when the assigned finish phase requires it.

## Tool Inventory Matrix

| Tool | What It Does | Current State | Finish Definition | Finish Phase | Provider/Account Dependency | Freeze Rule |
| --- | --- | --- | --- | --- | --- | --- |
| Login / Demo Access | Lets users enter demo or real workspace. | Finished | User can sign in, reset password, and land on role-safe workspace. | Admin Foundation | None beyond production smoke credentials. | Freeze; only auth/security bugs. |
| Signup / First Owner Setup | Creates first company and owner. | Usable / Needs Finish Pass | New contractor creates company, completes profile, adds first users, sees next setup step. | Admin Foundation | None unless paid signup/billing is enabled. | Freeze after onboarding works end-to-end. |
| Invite Activation / Password Reset | Activates invited users and recovers accounts. | Finished | Invites are company-scoped, expiring, single-use, and role-safe. | Admin Foundation | Email provider later for real sends. | Freeze; only auth/security bugs or provider hookup. |
| Dashboard | Daily workspace overview. | Usable / Needs Finish Pass | Owner/admin opens it and knows today's plan, blockers, crews, proof, follow-ups, billing-ready work, and next best action. | Command Center Finish | None. | Freeze after it routes to all finished workflows without dead ends. |
| Operations Command | Owner/admin operating cockpit. | Usable / Needs Finish Pass | One cockpit routes work from lead to job to proof to billing readiness with review queues and clear next actions. | Command Center Finish | None. | Freeze after all tool links match finished workflows. |
| Today / Owner Mobile Command | Mobile owner/admin command surface. | Usable / Needs Finish Pass | Owner/admin can see daily priority actions on phone without desktop-only assumptions. | Command Center Finish | None. | Freeze after mobile QA passes. |
| Field Mode | Field crew daily workspace. | Usable / Needs Finish Pass | Foreman/employee can run today's job on phone: assignment, time, proof, reports, tickets, checklist, safety, and change request where allowed. | Field Execution Finish | Offline/push/maps/weather later. | Freeze after complete mobile field-day QA. |
| Jobs | Job record, status, scope, crew, handoff, progress, closeout. | Usable / Needs Finish Pass | Approved work becomes a scheduled job, receives field proof, handles changes, closes out, and reaches billing readiness. | Job Operations Finish | Calendar/maps/weather later. | Freeze after job lifecycle is complete. |
| Schedule | Work calendar and crew timing. | Usable / Needs Finish Pass | Approved jobs are scheduled, assigned, visible to the right field users, and route back to job/field handoff. | Job Operations Finish | Google Calendar/SMS later. | Freeze after job scheduling is reliable. |
| Time | Field and office time records. | Usable / Needs Finish Pass | Employees/foremen record time; owner/admin reviews exceptions, approves pay periods, and exports payroll-ready hours. | Payroll Prep Finish | Payroll provider later. | Freeze after payroll-prep export works. |
| Payroll Prep | Payroll-ready review/export workflow. | Missing | Owner/admin can approve payroll period and export clean hours without processing payroll. | Payroll Prep Finish | QuickBooks Payroll/Gusto/ADP/certified payroll later. | Freeze as prep/export only until provider hookup. |
| Reports / Daily Reports | Field daily work record. | Usable / Needs Finish Pass | Field creates/submits; office reviews/reopens; reports feed proof, closeout, billing readiness, and customer-safe summaries. | Field Execution Finish | None. | Freeze after report lifecycle links to closeout. |
| Photo Evidence / Uploads | Work proof and files. | Usable / Needs Finish Pass | Field uploads/tag proof; office reviews; proof feeds reports, closeout, proposals, portfolio, and customer-safe packets. | Field Execution Finish | Storage provider later if needed. | Freeze after proof reuse works. |
| Delivery Tickets | Material/job proof. | Usable / Needs Finish Pass | Field captures tickets; office reviews; tickets connect to material proof, job proof, and billing readiness. | Field Execution Finish | None. | Freeze after closeout linkage works. |
| Pre-Pour | Concrete readiness checklist. | Usable / Needs Finish Pass | Office/field can create, complete, review, reopen, and archive pre-pour readiness tied to a job. | Field Execution Finish | None. | Freeze after concrete readiness flow is complete. |
| Post-Pour | Finish/closeout checklist. | Usable / Needs Finish Pass | Field completes post-pour checklist; office reviews; results feed closeout and billing readiness. | Field Execution Finish | None. | Freeze after closeout linkage works. |
| Safety Incidents | Incident capture/review. | Usable / Needs Finish Pass | Field reports incident; office reviews, resolves, audits, and keeps sensitive data role-safe. | Safety & Compliance Finish | None. | Freeze after incident lifecycle works. |
| Toolbox Talks | Safety talk assignment/acknowledgment. | Usable / Needs Finish Pass | Office assigns talks; field acknowledges; missed acknowledgments are visible and auditable. | Safety & Compliance Finish | None. | Freeze after acknowledgment loop works. |
| PPE | PPE requirements/acknowledgment. | Usable / Needs Finish Pass | PPE items can be assigned, acknowledged, exceptioned, reviewed, and audited. | Safety & Compliance Finish | None. | Freeze after PPE loop works. |
| Tool Checklist | Job/tool readiness checklist. | Usable / Needs Finish Pass | Office creates checklist; field completes; office reviews missing tools and job readiness. | Safety & Compliance Finish | None. | Freeze after checklist loop works. |
| Leads | Sales opportunities and follow-up. | Usable / Needs Finish Pass | Lead can be captured, scored, followed up, converted to customer/estimate, won/lost, and measured by source. | Growth & Sales Finish | Email/SMS later. | Freeze after lead-to-estimate flow works. |
| Opportunity Scout / Client Finder | Finds new work. | Usable / Provider-Dependent | Owner/admin reviews daily work queue, source health, accepts/rejects/snoozes, converts to lead, assigns estimator. | Growth & Sales Finish | Paid/private sources and live provider APIs later. | Freeze after review-first daily workflow works. |
| Lead Sources | Source tracking and health. | Usable / Needs Finish Pass | Every lead/source has attribution, quality, status, setup checklist, and performance. | Growth & Sales Finish | Provider sources later. | Freeze after source quality loop works. |
| Public Estimate Request | Public lead intake. | Usable / Needs Finish Pass | Visitor submits request; spam/consent/attribution captured; owner/admin reviews and converts without auto-send. | Growth & Sales Finish | Website embed/domain later. | Freeze after request-to-lead flow works. |
| Imported Drafts | Inbound job/lead draft review. | Finished / Provider-Dependent | Imported packages enter review queue and become jobs only after owner/admin approval. | Admin Foundation | Provider/import sources later. | Freeze; only provider/versioned import upgrades. |
| Communications | Contact timeline, drafts, approvals. | Usable / Provider-Dependent | Calls/notes/manual drafts/suppression/outbound approvals work as one customer/GC timeline. | Communications Finish | Email/SMS provider later. | Freeze after manual communication loop works. |
| Customers | Customer/GC records. | Usable / Needs Finish Pass | Customer profile shows contacts, leads, estimates, jobs, communication, proof, and follow-up context. | Growth & Sales Finish | None. | Freeze after customer 360 context works. |
| Estimates | Pricing/scope workbench. | Usable / Needs Finish Pass | Lead/customer/job estimate becomes proposal, follow-up, approved work, and job handoff. | Estimate & Proposal Finish | Email/e-sign/customer portal later. | Freeze after approved estimate handoff works. |
| Proposals | Customer/GC proposal packet. | Usable / Needs Finish Pass | Proposal packet includes options, scope, assumptions, exclusions, proof, branding, PDF, and send-review state. | Estimate & Proposal Finish | Email/e-sign/customer portal later. | Freeze after customer-safe packet works. |
| Takeoff Studio | Plan/PDF measurement and quantity backup for estimates. | Finished locally through Phase 10; AI plan assist, auto-measure beta, and hardening active next | Owner/admin or estimator can measure plans, review quantities, connect quantity backup to blank-priced estimate line drafts, choose customer-safe proposal proof, prepare GC/internal takeoff summaries, use review-first assistant suggestions, carry explicitly approved field-safe quantity context into foreman handoff, export/import review-safe takeoff packages, view selected plan sheets from safe preview URLs, apply reviewed sheet calibration to measurement rows, draw area/length/count/volume draft measurements, snap draft geometry to endpoints/segments/intersections/angle increments, and pin reviewed plan markup notes/RFIs/scope/risk comments without exposing office data to field users. | Apex Takeoff Studio Phases 1-10 | Provider-backed AI plan assistance, provider/file parsing upgrades, OCR/PDF parsing, auto-measure beta, and richer collaboration later. | Freeze Phase 10 after validation; future work continues only as approved Takeoff Studio Phases 11-13, bugs, provider/PDF parsing hookups, pilot-proven workflow gaps, or approved versioned upgrades. |
| Rate Book | Labor/material/equipment/default cost library. | Usable / Needs Finish Pass | Owner/admin maintains defaults and uses them inside estimates/material prep while protecting costs from field users. | Estimate & Proposal Finish | None. | Freeze after estimate integration works. |
| Calculator | Concrete/material calculators. | Usable / Needs Finish Pass | Calculations can be saved/reused in estimates, jobs, and material prep instead of staying isolated. | Estimate & Proposal Finish | None. | Freeze after reuse links work. |
| Material Prep | Material planning for jobs. | Usable / Needs Finish Pass | Estimate/job data becomes a material prep list and field/vendor-ready checklist without automatic purchasing. | Job Operations Finish | Purchasing/provider integrations later. | Freeze after job handoff linkage works. |
| Change Orders | Extra work request, pricing, approval, billing impact. | Usable / Needs Finish Pass | Field request -> office price -> customer/GC approval/rejection -> job and billing readiness update. | Change Order Finish | Email/e-sign/customer portal later. | Freeze after full lifecycle works. |
| Employees | Users, roles, crews. | Usable / Needs Finish Pass | Owner/admin manages users, roles, statuses, crew assignment, access review, and payroll-prep boundaries. | Admin Foundation | Email invite provider later. | Freeze after user/crew/admin loop works. |
| Settings | Company/profile/admin/package/provider setup. | Usable / Needs Finish Pass | Company setup, branding, templates, packages, billing readiness, integrations, and admin controls are organized without duplicate half-panels. | Admin Foundation | Billing/integration providers later. | Freeze after setup is coherent. |
| App Health | Backup/audit/release/trust center. | Usable / Needs Finish Pass | Owner can see health, backup, release, audit, install, and support-ready diagnostics. | Admin Foundation | Monitoring/log provider later. | Freeze after launch-hardening needs are met. |
| Support | Copy-safe help/support handoff. | Finished / Needs Light Finish | User can prepare support context without secrets or field exposure. | Admin Foundation | Support desk provider later. | Freeze after support packet is coherent. |
| Billing / Payments / Packages | Package and money readiness. | Readiness Layer Only | Closeout produces billing-ready packet; provider setup can later create invoice/payment workflow. | Closeout & Billing Prep Finish | Stripe/QuickBooks/payment provider later. | Freeze as prep until live provider hookup. |
| Integrations | Provider setup board. | Readiness Layer Only | Each integration has settings, server adapter, health, disabled state, audit, disconnect, no frontend secrets. | Admin Foundation | QuickBooks/Gmail/Calendar/Drive/Twilio/CompanyCam/DocuSign/Maps/Ads. | Freeze as setup board until provider hookup. |
| Customer Portal | Customer-safe packet/share approval. | Readiness Layer Only | Customer can safely view proposal/proof/change order/comment/approve via tokenized route when provider/safety is ready. | Communications Finish | Tokenized route/email/SMS/e-sign later. | Freeze manual preview until live portal version. |
| Apex Assistant / AI Office | Safe operator assistant. | Usable / Needs Finish Pass | Assistant helps finished workflows by opening records, drafting, summarizing, and queueing review actions without risky automation. | Assistant Finish | External action providers later. | Freeze after tied to finished workflows. |
| Agent OS / Action Inbox | Review-first agent control plane. | Usable / Needs Finish Pass | Every agent action has clear boundary, review packet, approval state, and audit trail tied to real workflows. | Assistant Finish | External action providers later. | Freeze after review/apply model is coherent. |
| Design System | Internal visual reference. | Finished enough | Used only to preserve UI consistency. | Admin Foundation | None. | Freeze; not a product workflow. |

## Finish Phases By Tool Cluster

These phases are not "slices." Each phase finishes the listed tools to their freeze line.

### Phase 1: Admin Foundation Finish

Tools finished:

- Signup / First Owner Setup
- Invite Activation / Password Reset
- Employees
- Settings
- App Health
- Support
- Imported Drafts
- Integrations setup board
- Package/billing readiness setup surface

Why first:

- If admin/setup is messy, every other workflow feels unfinished.
- This phase gives the app a stable owner/admin base before finishing operating tools.

Pre-build audit:

- Audit file: `docs/APEX_HQ_PHASE_1_ADMIN_FOUNDATION_PREBUILD_AUDIT.md`
- Verdict: Phase 1 has strong foundations but is not ready to freeze.
- Blocking findings: owner/admin `/imported-drafts` crashes with `useEffect is not defined`; `npm.cmd run verify:job-draft-imports` is red because the test helper uses an undefined bearer token after cookie-first login; setup is scattered instead of one Admin Foundation Finish workflow.
- Browser finding: employee mobile direct routes to Settings, Employees, App Health, and Imported Drafts redirect to Field Mode; Support stays role-safe.

Done when:

- A contractor can create/setup a company, manage users/roles, understand package/provider status, see app health, prepare support context, and know what is configured.
- Field users remain completely blocked from admin/provider/billing/setup surfaces.

Freeze:

- Admin/setup tools become do-not-rebuild. Future work only provider hookup, bug, or launch-hardening.

### Phase 2: Command Center Finish

Tools finished:

- Dashboard
- Operations Command
- Today / Owner Mobile Command
- Notification/queue surfaces used by the command center

Done when:

- Owner/admin opens Apex HQ and immediately sees today's operating plan, blockers, crew/job status, proof gaps, sales follow-up, billing-ready work, and next actions.
- Every action routes to a real tool and no command row ends in vague readiness text.

Freeze:

- Command Center becomes the stable home screen for owner/admin.

### Phase 3: Growth & Sales Finish

Tools finished:

- Opportunity Scout / Client Finder
- Lead Sources
- Public Estimate Request
- Leads
- Customers
- Sales follow-up portions of Communications

Done when:

- Contractor can find or receive a lead, review it, score it, follow up, log contact, convert to customer/estimate, and mark won/lost with source learning.
- Provider-only work stays visible as setup, not fake functionality.

Freeze:

- Client-finding and lead intake/sales start are complete. Future live provider sources/email/SMS are versioned hookups.

### Phase 4: Estimate & Proposal Finish

Tools finished:

- Estimates
- Proposals
- Rate Book
- Calculator
- Estimate-to-job handoff

Done when:

- Contractor can turn lead/customer notes into an estimate, use defaults/calculators, create customer-safe proposal, produce PDF/GC packet, track manual send/follow-up, approve/win, and hand off to job setup.

Freeze:

- Estimate Studio and proposal workflows become do-not-rebuild. Future e-sign/customer portal send is provider/versioned work.

### Phase 5: Job Operations Finish

Tools finished:

- Jobs
- Schedule
- Material Prep
- Crew/job assignment parts of Employees
- Job startup/handoff packet

Done when:

- Approved work becomes a scheduled job with crew, scope, access, materials, tools, safety notes, proof requirements, and field visibility.
- No field user sees pricing, margins, payroll, billing, or office-only notes.

Freeze:

- Job startup/schedule/handoff flow becomes stable.

### Phase 6: Field Execution Finish

Tools finished:

- Field Mode
- Time capture portion
- Reports / Daily Reports
- Photo Evidence / Uploads
- Delivery Tickets
- Pre-Pour
- Post-Pour

Done when:

- Foreman/employee can run a full day from phone: open assignment, clock in/out, upload proof, submit reports, add tickets, complete concrete checklists, and send office review signals.

Freeze:

- Field day workflow becomes stable. Offline drafts/push/maps are later versioned upgrades.

### Phase 7: Safety & Compliance Finish

Tools finished:

- Safety Incidents
- Toolbox Talks
- PPE
- Tool Checklist

Done when:

- Safety setup, field acknowledgment, exceptions, incident review, and audit trail work end-to-end without leaking office data.

Freeze:

- Safety/tooling workflow becomes stable.

### Phase 8: Change Order Finish

Tools finished:

- Change Orders
- Field change request path
- Estimate/rate-book pricing tie-in
- Communications approval state
- Job/billing readiness linkage

Done when:

- Extra work can be requested, reviewed, priced, approved/rejected, reflected in job scope, and included in billing readiness.

Freeze:

- Change order workflow becomes stable. E-sign/customer portal approval is versioned provider work.

### Phase 9: Payroll Prep Finish

Tools finished:

- Time approval/review
- Payroll Prep
- Employee timecards
- Payroll-ready export
- Payroll audit

Done when:

- Owner/admin can select a pay period, fix exceptions, approve hours, and export payroll-ready CSV.
- Field users can see only allowed own-time context.

Out of scope:

- Paychecks, direct deposit, tax withholding, certified payroll processing, payroll provider writes.

Freeze:

- Payroll prep/export is stable. Live payroll integration is a provider hookup phase later.

### Phase 10: Closeout & Billing Prep Finish

Tools finished:

- Job closeout
- Reports/proof/tickets review linkage
- Approved change-order totals
- Billing readiness packet
- Billing / Payments / Packages prep workflow

Done when:

- Owner/admin can see exactly what can be billed, what proof is missing, what changes are approved, and what manual invoice/payment prep is needed.

Out of scope:

- Live invoices, payment links, checkout, charge collection.

Freeze:

- Billing prep is stable. Stripe/QuickBooks/payment hookup is later.

### Phase 11: Reputation & Portfolio Finish

Tools finished:

- Reputation / Portfolio
- Review/referral requests
- Before/after proof selection
- Job story builder
- Website/social/proposal proof outputs

Done when:

- Completed work becomes review asks, referral asks, project stories, portfolio proof, and proposal proof blocks without fake claims or live sends.

Freeze:

- Proof-to-growth workflow is stable. Publishing providers are later.

### Phase 12: Communications & Customer Portal Finish

Tools finished:

- Communications
- Customer Portal preview/share approval
- Customer-safe comments/approval/rejection
- Suppression/delivery attempt state

Done when:

- Owner/admin can prepare customer-safe proposal/proof/change-order packets, review what customer sees, capture comments/decisions, and queue human-reviewed sends.

Provider-dependent:

- Live email/SMS and public tokenized portal delivery.

Freeze:

- Manual/customer-safe review workflow is stable. Live portal/send is later provider work.

### Phase 13: Assistant Finish

Tools finished:

- Apex Assistant / AI Office
- Agent OS
- Action Inbox
- Assistant hooks into all frozen workflows

Done when:

- Assistant helps operate finished tools by opening records, drafting, summarizing, preparing review packets, and explaining next actions.
- It never bypasses human review for sends, spend, payment, provider writes, bids, schedule mutation, hidden GPS, or production data.

Freeze:

- Assistant becomes stable helper layer; future external action execution is versioned provider work.

### Phase 14: Launch Finish

Tools finished:

- Public signup/onboarding launch path
- Pricing/package page
- Production auth smoke
- Monitoring/backup/restore
- Legal/claims checklist
- Support and incident process

Done when:

- A new contractor can sign up, onboard, use frozen core workflows, and Apex HQ can be monitored, supported, backed up, restored, and rolled back.

Freeze:

- Launch foundation becomes stable; future work is customer-driven product upgrades.

## Immediate Employee Recommendation

Do not start coding from a guessed next phase.

Start with Phase 1, Admin Foundation Finish, only after confirming this blueprint is the active source of truth. It is the base that makes every later "finished forever" phase cleaner.

If payroll urgency overrides order, Phase 9 can move earlier, but it must still finish only payroll prep/export and not live payroll processing.
