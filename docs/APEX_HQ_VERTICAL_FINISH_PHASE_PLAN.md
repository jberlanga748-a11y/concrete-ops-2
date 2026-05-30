# Apex HQ Vertical Finish Phase Plan

Last updated: 2026-05-30

Purpose: replace slice-based roadmap work with complete contractor workflow phases. A phase is not finished because a readiness panel exists. A phase is finished only when a contractor can complete that whole workflow start to finish in Apex HQ, role-safe, tested, deployed, and frozen.

## New Phase Rule

One phase equals one complete business workflow.

Each phase must include:

- all screens needed to complete the workflow
- real create/edit/review/approve states where Apex HQ owns the workflow
- provider-ready state only for the part that truly needs a paid provider/API key
- owner/admin controls
- field-safe views when field users are involved
- desktop and mobile behavior
- server/API enforcement, not only hidden buttons
- tests and browser QA
- deploy and health check
- living plan update
- freeze note and do-not-rebuild entry

After a phase is done, do not touch it again except for:

- bug
- security/permission issue
- mobile blocker
- provider hookup for a previously provider-dependent edge
- clearly approved versioned upgrade

## Current Honest State

Apex HQ has a strong amount of infrastructure, command panels, role gates, and provider-ready planning. The mistake in the prior roadmap execution was treating those command/readiness layers as finished phases. They are useful, but several business workflows still need to be finished vertically.

Current product state:

- Core auth, company setup, role safety, packages, demo/runtime, and deployment foundations are strong.
- Many contractor tools exist and are usable in pieces.
- Several workflows need a start-to-finish pass so users do not bounce between partial panels.
- Payroll is not finished. Time tracking exists; payroll prep/export does not.
- Public launch is not the next practical product phase until core workflows are vertically finished.

## App Tool Inventory

| Tool / Area | Current State | Finish Standard |
| --- | --- | --- |
| Login / demo access | Built | Keep stable; only improve if auth QA finds real friction. |
| Signup / first owner setup | Built foundation | Finish onboarding as a complete first-company launch workflow before public launch. |
| Invite activation / password reset | Built | Freeze unless auth QA finds bugs. |
| Dashboard | Built / command-heavy | Must become the daily owner answer: what needs attention, who is where, what is missing, what is ready to bill, what to do next. |
| Operations Command | Built command layer | Finish as the central operating cockpit that routes every active workflow without dead ends. |
| Today / owner mobile command | Built | Keep mobile owner/admin daily command usable; align with vertical workflows. |
| Field Mode | Built | Finish field day start-to-finish with assigned job, time, photos, reports, tickets, checklists, safety, and handoff packet. |
| Jobs | Built | Finish approved job setup, schedule/crew/handoff, progress, proof, change orders, closeout, and billing readiness as one loop. |
| Schedule | Built | Finish scheduling from approved job through crew assignment and field visibility. No hidden crew notifications until provider-ready messaging is configured. |
| Time | Built for time tracking | Finish payroll prep: exceptions, approvals, pay period, export, audit. No payroll processing. |
| Reports / daily reports | Built | Finish report creation, review, correction, proof connection, customer-safe summary, and closeout use. |
| Photo Evidence / uploads | Built | Finish proof capture, tagging, review, before/after selection, proposal/portfolio/closeout reuse. |
| Delivery Tickets | Built | Finish ticket capture, review, material proof, job proof, billing/closeout linkage. |
| Pre-Pour | Built | Finish pre-pour readiness from setup to field completion to office review. |
| Post-Pour | Built | Finish post-pour closeout from field completion to office review and billing readiness. |
| Safety Incidents | Built | Finish incident capture, review, corrective action, audit, and field-safe follow-up. |
| Toolbox Talks | Built | Finish toolbox talk assignment, acknowledgment, missed acknowledgments, and audit. |
| PPE | Built | Finish PPE checklist, acknowledgment, exceptions, and audit. |
| Tool Checklist | Built | Finish tool/job checklist creation, field completion, office review, and missing-tool follow-up. |
| Leads | Built | Finish client finder plus lead intake plus follow-up as one sales-start workflow. |
| Opportunity Scout / Client Finder | Built / provider-dependent in parts | Finish daily new-work review, source health, accept/reject/snooze/convert, assign estimator, provider setup checklist. |
| Communications | Built / provider-ready | Finish contact timeline, call notes, manual drafts, approval queues, suppressions, and human-reviewed send state. Live send waits for provider. |
| Customers | Built | Finish customer/GC profile, contacts, jobs, estimates, communication history, proof, and follow-up context. |
| Public estimate request | Built / partial | Finish website lead intake funnel, spam controls, attribution, manual review, lead conversion, and embed/setup guide. |
| Proposals | Built | Finish proposal packet generation, preview, customer-safe language, options, proof, exclusions, assumptions, and manual send review. |
| Estimates | Built | Finish estimate creation from lead/job/rough notes through approval, proposal, follow-up, win/loss, and job handoff. |
| Rate Book | Built | Finish reusable labor/material/equipment/production defaults with estimate integration and owner-only cost protection. |
| Calculator | Built | Finish calculators as reusable estimate/job/material helpers, not isolated one-off tools. |
| Material Prep | Built / prep only | Finish material list prep, job handoff, delivery ticket connection, and no automatic purchasing. |
| Imported Drafts | Built | Freeze as inbound review queue unless provider/import workflows need a versioned upgrade. |
| Change Orders | Built | Finish field request -> office price -> customer/GC approval -> job update -> billing readiness. |
| Employees | Built | Finish user/role management, crew assignment readiness, field access review, and payroll-prep role boundaries. |
| Settings | Built | Finish company profile, branding, templates, package/billing readiness, integrations setup, and admin controls without becoming a cluttered catch-all. |
| App Health | Built | Keep as trust/release/backup/audit center. Expand only for launch hardening. |
| Support | Built | Keep copy-safe diagnostics and support handoff. |
| Apex Assistant / AI Office | Built command layers | Finish as workflow helper that opens records, prepares drafts, and queues review; no autonomous sends/spend/payments/provider writes. |
| Agent OS / action inbox | Built | Keep review-first. Tie into finished workflow phases only where it removes real work. |
| Billing / Payments / Packages | Built / provider-ready | Finish billing prep first; live payment processing only after provider/account/legal/tax setup. |
| Integrations | Built / provider-ready | Keep provider setup board. Actual integrations are versioned provider hookup work after each workflow is finished. |
| Customer Portal | Built / provider-ready | Finish customer-safe portal only after proposals/proof/change orders are truly finished. |
| Payroll | Missing as workflow | Time exists, but payroll prep/export/approval workflow is not finished. No payroll processing. |

## Finished Workflow Phases

### Phase 1: Time To Payroll Prep

Goal: owner/admin can review field time and produce payroll-ready hours without processing payroll inside Apex HQ.

Includes tools:

- Time
- Employees
- Jobs
- Field Mode clock/time
- App Health/audit support

Current state:

- Time tracking and field time records exist.
- Field roles have time surfaces.
- Payroll processing/export/approval is not finished.

Finish scope:

- Pay period selector.
- Timecard by employee.
- Job-coded hours.
- Breaks, corrections, missing clock-out, duplicate entries, and exception queue.
- Foreman review where appropriate.
- Office approval.
- Payroll-ready export CSV.
- Audit trail for corrections and approvals.
- Owner/admin-only payroll prep panel.
- Field-safe employee view of own time only.

Provider-dependent:

- QuickBooks Payroll, Gusto, ADP, certified payroll, direct deposit, tax withholding, paychecks.

Freeze when:

- Owner/admin can approve a pay period and export clean hours.
- Field users cannot see pay rates, payroll costs, profit, margin, billing, other employees' private time, or admin settings.

### Phase 2: Client Finder To Lead Intake

Goal: contractor can find potential work, review it, and turn accepted work into leads without guessing where leads came from.

Includes tools:

- Opportunity Scout / Client Finder
- Leads
- Lead Sources
- Public Estimate Request
- Imported Drafts
- Apex Assistant growth commands

Current state:

- Opportunity Scout and source readiness exist.
- Public request intake exists.
- Growth command layer exists.
- Need one daily workflow that feels finished.

Finish scope:

- Daily new-work queue.
- Source coverage board.
- Source health and setup checklist.
- Accept/reject/snooze/convert found opportunities.
- Assign estimator.
- Lead quality/fit scoring.
- Source attribution from website/manual/public/private/provider sources.
- Manual private-source evidence handoff.
- No auto-contact, auto-bid, or auto-save without review.

Provider-dependent:

- Paid lead platforms, private plan rooms, inbox parsing, live provider APIs.

Freeze when:

- Owner/admin can open Apex HQ, review new work, accept one, and see it become a real lead with source/next action.

### Phase 3: Sales Follow-Up To Won/Lost

Goal: contractor can work a lead from first contact through won/lost decision.

Includes tools:

- Leads
- Communications
- Customers
- Estimates starter links
- Apex Assistant follow-up drafts

Current state:

- Lead management, follow-up queue, scripts, contact history, and won/lost learning exist.
- Need to remove dead ends and make the daily sales workflow complete.

Finish scope:

- Lead inbox and daily follow-up queue.
- Customer/GC contact timeline.
- Call notes, voicemail/email/text draft logging.
- Manual "sent/contacted" tracking.
- Stale lead and stale estimate reminders.
- Won/lost reasons.
- Source performance by outcome.
- Convert customer/estimate path.

Provider-dependent:

- Live email/SMS/DM sending and inbox sync.

Freeze when:

- Owner/admin can take a new lead, log follow-up, set next step, convert to estimate, and mark won/lost without leaving the workflow.

### Phase 4: Estimate To Proposal To Approved Job

Goal: contractor can create a customer-ready estimate/proposal, follow it up, win it, and hand it to operations.

Includes tools:

- Estimates
- Proposals
- Rate Book
- Calculator
- Customers
- Communications
- Jobs handoff

Current state:

- Estimate Studio, proposal packets, PDFs, options, GC packets, backup attachments, rough notes, send review, and handoff readiness exist.
- Need one final vertical finish pass.

Finish scope:

- Lead/job/customer estimate starter.
- Rate book and calculator reuse inside estimate workflow.
- Options/alternates.
- Terms, exclusions, assumptions.
- Photos/takeoff backup.
- Customer-safe proposal packet.
- Internal review packet.
- GC packet.
- Manual send/follow-up state.
- Approved estimate -> approved job setup.

Provider-dependent:

- Live email sending, e-signature, customer portal approval.

Freeze when:

- Owner/admin can go from lead to estimate to proposal to approved job with field users seeing only field-safe handoff data.

### Phase 5: Job Setup To Scheduled Field Handoff

Goal: approved work becomes a scheduled field job with crew, scope, checklist, materials, safety, and proof requirements.

Includes tools:

- Jobs
- Schedule
- Employees/crews
- Material Prep
- Tool Checklist
- Safety/PPE/toolbox
- Field Mode handoff

Current state:

- Jobs, schedule, assignments, material prep, field handoff, safety/checklists exist.
- Need a complete job startup workflow.

Finish scope:

- Approved job startup checklist.
- Crew assignment.
- Schedule date/time.
- Foreman handoff packet.
- Scope, location, access, safety, materials, equipment, proof requirements.
- Field visibility review.
- No pricing/margins/payroll in field handoff.

Provider-dependent:

- Calendar sync, SMS crew notifications, maps/weather provider keys.

Freeze when:

- Owner/admin can take an approved job and make it ready for the crew's phone.

### Phase 6: Field Work Day

Goal: foreman/employee can run the day on mobile start to finish.

Includes tools:

- Field Mode
- Jobs
- Time
- Photo Evidence
- Daily Reports
- Delivery Tickets
- Tool Checklist
- PPE/toolbox/safety
- Pre-Pour/Post-Pour
- Change request

Current state:

- Strong field foundation exists.
- Need to verify one complete day workflow with role-specific differences.

Finish scope:

- Today's job.
- Clock/time.
- Assignment notice.
- Photos/proof.
- Daily report.
- Delivery tickets.
- Checklist/PPE/toolbox.
- Pre/post-pour where trade-relevant.
- Change request for foreman.
- PWA install guidance.
- Offline draft plan parked unless built.

Provider-dependent:

- Push notifications, offline sync, live maps/weather.

Freeze when:

- Foreman and employee can complete the day on mobile without seeing office/growth/money/admin data.

### Phase 7: Change Order Start To Approval

Goal: extra work gets captured, priced, approved/rejected, and reflected in job/billing readiness.

Includes tools:

- Change Orders
- Field Mode change request
- Estimates/rate book
- Communications
- Customer Portal later
- Jobs and billing readiness

Current state:

- Change orders exist.
- Need complete lifecycle and customer/GC approval state.

Finish scope:

- Field request with photos/notes.
- Office review.
- Price/scope/exclusions.
- Customer/GC approval/rejection state.
- Approved amount and job impact.
- Billing readiness linkage.
- Audit trail.

Provider-dependent:

- E-signature, customer portal approval, email/SMS send.

Freeze when:

- A field change can become an approved/rejected change order and show correctly in closeout/billing readiness.

### Phase 8: Closeout To Billing Prep

Goal: contractor can close a job, prove the work, confirm changes, and prepare a billing packet.

Includes tools:

- Jobs
- Reports
- Photo Evidence
- Delivery Tickets
- Change Orders
- Post-Pour/closeout
- Billing / Payments / Packages
- App Health/audit

Current state:

- Closeout and billing readiness pieces exist.
- Billing/payment command is provider-ready, not a finished closeout workflow.

Finish scope:

- Missing proof checklist.
- Daily report review.
- Photo/ticket review.
- Approved change-order totals.
- Ready-to-bill packet.
- Job costing review without pretending to be accounting.
- Manual invoice/payment prep state.

Provider-dependent:

- Stripe/payment provider, QuickBooks invoice sync, live payment links.

Freeze when:

- Owner/admin can see exactly what is ready to bill and what is blocking billing.

### Phase 9: Reputation, Reviews, Referrals, Portfolio

Goal: completed work turns into trust and more leads.

Includes tools:

- Photo Evidence
- Jobs
- Customers
- Communications
- Growth Command Center
- Public website later

Current state:

- Reputation/portfolio command layer exists.
- Need final workflow from completed job to review/referral/project story.

Finish scope:

- Before/after photo selection.
- Job story builder.
- Testimonial tracker.
- Manual review request draft.
- Referral ask draft.
- Portfolio/project gallery.
- Proposal proof block reuse.
- Website/social draft copy.

Provider-dependent:

- Google Business Profile, social posting, public website publishing, email/SMS send.

Freeze when:

- Owner/admin can select proof from a completed job and produce review/referral/portfolio outputs without fake claims or live sends.

### Phase 10: Communications And Customer Portal

Goal: customer/GC communication and customer-safe proof/proposal/change-order review are finished without exposing private office data.

Includes tools:

- Communications
- Customer Portal
- Proposals
- Change Orders
- Reports/photo proof
- Customers

Current state:

- Communication Center and portal command/readiness exist.
- Live portal serving and sends remain provider-dependent.

Finish scope:

- Customer-safe packet preview.
- Expiring/revocable access record.
- Comments/approval/rejection workflow.
- Human-reviewed outbound email/SMS queue.
- Suppression/opt-out/delivery attempt history.
- Tokenized customer portal route when ready.

Provider-dependent:

- Email/SMS provider, tokenized public route, customer portal live delivery.

Freeze when:

- Owner/admin can safely prepare and review what a customer/GC will see; live delivery waits only on provider setup.

### Phase 11: Admin, Settings, Packages, Integrations

Goal: company setup and provider setup are coherent and do not distract from daily work.

Includes tools:

- Settings
- Employees
- App Health
- Support
- Billing / Packages
- Integrations

Current state:

- Many admin/readiness surfaces are built.
- Need clean organization and exact setup status.

Finish scope:

- Company profile/branding/templates.
- Users/roles.
- Package state.
- Billing provider readiness.
- Integration provider readiness.
- App health/backup/audit.
- Support diagnostics.
- No clutter or duplicate setup panels.

Provider-dependent:

- Stripe/payment provider, QuickBooks, Gmail/Calendar/Drive, Twilio, CompanyCam, DocuSign, Maps/weather, Google/Meta Ads.

Freeze when:

- Owner/admin can configure workspace and provider readiness from Settings without hunting or seeing duplicate half-finished panels.

### Phase 12: Apex Assistant As Workflow Operator

Goal: Apex Assistant helps every finished workflow without becoming a risky autopilot.

Includes tools:

- Apex Assistant / AI Office
- Agent OS
- Agent Action Inbox
- all finished workflows above

Current state:

- Assistant command layers and Agent OS exist.
- Need assistant commands tied only to finished workflows.

Finish scope:

- Open records.
- Draft estimates/proposals/follow-ups/review asks.
- Summarize missing proof.
- Prep billing readiness.
- Suggest next action.
- Queue review/apply actions.
- No auto-send, auto-spend, auto-pay, auto-bid, auto-schedule, provider-write, hidden GPS, or production data mutation.

Provider-dependent:

- External action execution after each provider is configured and each action has human-confirmed execution controls.

Freeze when:

- Assistant reliably speeds up finished workflows and never bypasses review.

### Phase 13: Launch Hardening

Goal: make Apex HQ ready for real customers beyond guided demos.

Includes tools:

- Signup/onboarding
- App Health
- Support
- Monitoring/backup/restore
- Pricing/package pages
- Legal/claims
- Production auth smoke
- Managed DB/storage plan

Current state:

- Many pilot/demo and monitoring foundations exist.
- Public self-serve launch is still not finished.

Finish scope:

- Production auth smoke with real approved smoke credentials.
- Monitoring/alerting.
- Backup/restore plan.
- Managed database/storage decision.
- Legal/claims review.
- Public pricing/package page.
- Onboarding.
- Support process.
- Incident/rollback runbook.

Provider-dependent:

- Monitoring provider/log drain if chosen, billing provider for paid self-serve.

Freeze when:

- A new contractor can sign up, onboard, use the finished workflows, and support/ops can monitor and recover the system.

## Phase Completion Checklist

Every vertical phase must end with:

- focused unit/server tests
- role verification
- relevant workflow verification script
- `npm.cmd run build`
- `git diff --check`
- browser QA for owner/admin desktop
- browser QA for field mobile when involved
- production deploy
- Fly checks passing
- both production `/api/ready` endpoints OK
- living plan updated
- phase report recorded
- frozen/do-not-rebuild entry added

## Next Recommended Phase

Start with **Phase 1: Time To Payroll Prep**.

Reason: the user specifically asked if payroll is possible. Time exists, but payroll prep is not finished. This phase would turn an existing partial tool into a complete, frozen business workflow without touching live payroll processing.

Do not build live payroll processing. Finish payroll prep/export first.
