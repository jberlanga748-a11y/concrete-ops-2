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
