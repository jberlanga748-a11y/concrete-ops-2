# Apex HQ Decision Log

Use this file for durable product and operating decisions. Keep entries short.

## Decision Format

```text
Date:
Decision:
Why:
Scope:
Risk:
Rollback / revisit condition:
```

## Decisions

### 2026-05-16 - Master Coordinator Documentation Layer

Decision:
Create repo-level agent and planning docs instead of starting feature work.

Why:
Apex HQ already has working app systems, skills, prompt libraries, roadmap files, and pilot docs. The next need is coordination, not another random feature.

Scope:
Documentation only: agent model, roadmap organization, business planning, launch planning, risk matrix, competitor analysis, and 90-day plan.

Risk:
Low.

Rollback / revisit condition:
Revert the docs if they conflict with actual build direction or if a simpler structure replaces them.

### 2026-05-16 - Contractor-First Product Rule

Decision:
Every Apex HQ feature must help contractors get work, win work, run work, reduce risk, get paid faster, or look more professional.

Why:
This prevents generic SaaS bloat and keeps the product useful in the field.

Scope:
All future planning and build phases.

Risk:
Low.

Rollback / revisit condition:
Only revisit if Apex HQ changes markets.

### 2026-05-16 - Human Approval For Risky AI

Decision:
AI/agent systems must draft, recommend, and organize by default. Risky actions require human approval.

Why:
Contractor trust, customer communication, pricing, scheduling, ad spend, and company data require human control.

Scope:
Apex Assistant, Watchtower, Field Ops Agent, Growth Agent, Marketing Agent, Ad Assistant, Website Builder Agent, and Lead/Job Finder Agent.

Risk:
Low.

Rollback / revisit condition:
Only automate specific low-risk internal actions after audit logs, disable switch, and approval controls exist.

### 2026-05-17 - Build Status File Prevents Rebuild Loops

Decision:
Create `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md` as the master done/next/do-not-rebuild tracker.

Why:
Public signup, first owner onboarding, package entitlements, invite/password reset, support handoff, demo separation, and field workflow tightening are already built or verified. Future sessions need one file that prevents repeating those phases.

Scope:
Documentation only. The file records completed systems, latest release, verified checks, next phases, do-not-build-yet items, package direction, and the next builder prompt.

Risk:
Low.

Rollback / revisit condition:
Update the file after every release or major phase. If it becomes stale, treat `git log`, release reports, and passing tests as the source for correction.

### 2026-05-17 - Next Product Phase Is Branding And Proposal Identity

Decision:
Move next build work to Company Branding / Proposal Identity Phase 1 instead of rebuilding public signup.

Why:
Public signup and company creation already exist and passed focused verification. Contractor demo and paid-pilot value now needs cleaner company identity, logo handling, proposal/estimate/GC packet professionalism, and brand trust.

Scope:
Company settings branding, estimate/proposal/GC packet identity, print packet polish, manual-send clarity, and role-safe access. No billing, customer portal, payroll, offline mode, AI autopilot, or estimate rebuild.

Risk:
Medium.

Rollback / revisit condition:
If estimate/packet tests fail or branding changes create role leaks, revert the narrow branding changes and preserve the current estimate workflow.

### 2026-05-17 - Proposal And Command Center Phases Are Complete

Decision:
Mark Company Branding / Proposal Identity, Estimate Options / Attachments / Takeoff Inputs, GC Packet / Foreman Packet Split, Operations Command UX Upgrade, and Command Center Mobile KPI Polish as completed/released.

Why:
Those phases were built, verified, committed, pushed, deployed, and health-checked through Fly releases `v471` through `v475`. Keeping them listed as future work was causing loop risk.

Scope:
Documentation only. Update phase trackers and roadmap docs so future sessions extend or fix those systems instead of rebuilding them.

Risk:
Low.

Rollback / revisit condition:
If a released phase has a bug, open a narrow bug-fix phase. Do not restart the whole phase unless a verified architecture or security problem requires it.

### 2026-05-17 - Next Product Phase Is Communication Center

Decision:
Move the next build phase to Communication Center Phase 1.

Why:
Apex HQ now has stronger proposal identity, estimate options, packet split, and Operations Command polish. The next real contractor gap is communication context across customers, leads, estimates, and jobs without adding automatic SMS/email or customer portal complexity.

Scope:
Manual-first communication notes/log visibility, existing contact history extension, role-safe customer/lead/estimate/job context, and owner/admin review.

Risk:
Medium.

Rollback / revisit condition:
If the implementation risks field data leaks, broad schema churn, or fake messaging behavior, pause and narrow the phase to existing contact-history surfaces only.

### 2026-05-17 - Communication And App Health Phases Are Complete

Decision:
Mark Communication Center Phase 1 and App Health / Audit Activity Phase 1 as completed/released, and move the next phase to Watchtower / Missing Work Agent Phase 1.

Why:
Communication Center shipped in Fly release `v476` and App Health / Audit Activity shipped in Fly release `v477`. Leaving those as future phases created rebuild-loop risk.

Scope:
Documentation only. Update the build status tracker, roadmap, and agent handoff file so future sessions extend or fix these systems instead of rebuilding them.

Risk:
Low.

Rollback / revisit condition:
If either released phase has a bug, open a narrow bug-fix phase. Do not restart the phase unless a verified security, data, or workflow issue requires it.

### 2026-05-17 - Watchtower Phase Is Read-Only And Released

Decision:
Implement and release Watchtower / Missing Work Agent Phase 1 as a read-only Command Center layer, not an autonomous agent.

Why:
Owners need exact missing-work visibility before the larger Apex Assistant exists. The safe first step is to summarize existing reports, uploads, delivery tickets, safety incidents, tool checklists, startup blockers, and review queues without changing jobs or contacting anyone.

Scope:
Frontend derivation and Command Center display only. No backend writes, no AI, no automatic sending, no route rebuild, no permission loosening. Released as Fly `v478`.

Risk:
Medium before verification; low after focused checks.

Rollback / revisit condition:
Revert the Watchtower utility/UI changes if the Command Center shows incorrect operational counts or role tests fail. Future Assistant work must reuse Watchtower as read-only context unless a later approved phase adds reviewed command actions.

### 2026-05-17 - Demo Cleanup Is Complete Enough For Guided Demos

Decision:
Treat the v485/v486 demo cleanup as complete and stop looping on demo-data cleanup unless browser QA finds a new visible issue.

Why:
The live v486 app was checked across Command Center, Leads, Jobs, and Schedule as a demo operations user. Known rough/test records were not visible, health checks passed, and no console/API failures were observed.

Scope:
Demo-visible filtering and live confirmation only. Real company data behavior, auth, permissions, packages, and field workflows were not redesigned.

Risk:
Low after focused demo and role verification.

Rollback / revisit condition:
If a guided demo exposes new junk data, open a narrow cleanup bug phase. Do not restart broad demo hardening or rebuild demo mode.

### 2026-05-17 - Next Phase Is Guided Demo Launch Readiness

Decision:
Move the immediate next phase to Guided Demo Launch Readiness, with Assistant Command Expansion Phase 2 parked until command scope is approved.

Why:
Apex HQ has a clean enough guided demo path after v486. The next value is proving the product with contractors and avoiding another app-cleanup loop. Assistant commands are the next product-heavy direction, but reviewed command actions need explicit scope because they can affect estimates, jobs, crews, and customer communication.

Scope:
Demo script, owner/admin walkthrough, field walkthrough, pilot handoff, and narrow issue capture. No billing, customer portal, autonomous AI actions, or broad redesign.

Risk:
Low for demo readiness documentation; high for later assistant command execution if it is not scoped carefully.

Rollback / revisit condition:
If demo rehearsal finds blockers, fix only those blockers. If the user approves Assistant Command Expansion, create a separate scoped build phase with QA and rollback plan.

### 2026-05-17 - Guided Demo Launch Readiness Packet Created

Decision:
Create `docs/GUIDED_DEMO_LAUNCH_READINESS.md` as the current demo/pilot handoff source, and move the next product build gate to Assistant Command Expansion Phase 2 Scope Lock.

Why:
The app is clean enough for guided warm demos after v486, but future sessions need a single path for owner/admin walkthroughs, field walkthroughs, pilot handoff, go/no-go rules, and assistant command boundaries.

Scope:
Documentation only. No app behavior, routes, permissions, package gates, demo data, or production systems changed.

Risk:
Low.

Rollback / revisit condition:
Revert or update the demo readiness packet if the live rehearsal finds a better demo path or if new product capabilities change the talk track.

### 2026-05-17 - Assistant Command Expansion Scope Locked

Decision:
Scope Assistant Command Expansion Phase 2 around review-first command actions, with Phase 2A limited to lead/customer/rough-notes to clean estimate draft handoff.

Why:
The current assistant shell is intentionally review-only and already routes to existing workflows. The highest-value next assistant behavior is helping an owner or estimator start a professional estimate from a lead and rough notes without stale estimate context, while preserving package gates, field restrictions, manual send mode, and user review.

Scope:
Documentation and implementation prompt only. Phase 2A may later touch `src/apex-assistant-shell-utils.js`, `src/App.jsx`, estimate/lead utilities, and existing estimate rough-notes flows, but this decision does not change app behavior.

Risk:
Medium for the future build because assistant commands touch leads, estimates, packages, and role safety. Low for this scope-lock document.

Rollback / revisit condition:
If Phase 2A starts to require autonomous sending, pricing approval, automatic job conversion, crew assignment, or material ordering, stop and split the work into a later reviewed-command phase.

### 2026-05-17 - Assistant Command Expansion Phase 2A Built Review-First

Decision:
Build Phase 2A as a reviewed assistant handoff only: lead/customer/rough-notes commands can open a clean estimate draft context, but the assistant still does not save, send, approve, price, assign crews, order materials, or contact customers automatically.

Why:
This is the safest first step toward the finished Apex Assistant product promise. It helps an owner or estimator start estimate/proposal work faster while preserving existing Estimates, AI Rough Notes, role restrictions, package gates, and manual send behavior.

Scope:
Frontend assistant command parsing, visible lead/customer matching, reviewed match choices, clean Estimates new-draft handoff, tests, and documentation. No backend route, schema change, customer communication, job conversion, material ordering, billing, or field-role access was added.

Risk:
Medium before release because assistant commands touch leads, customers, estimates, and package gates. Focused tests passed, and local browser QA confirmed the Basic demo workspace blocks Premium AI Rough Notes assistant commands safely.

Rollback / revisit condition:
If released behavior shows stale estimate context, package-gate leakage, field-role access, or confusing draft creation, revert the Phase 2A changes in `src/apex-assistant-shell-utils.js`, `src/apex-assistant-shell-utils.test.js`, and `src/App.jsx`, then reopen a narrow bug-fix phase.
