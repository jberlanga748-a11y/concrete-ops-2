# Apex HQ Field Ops Agent Planning Checkpoint

Status: planning complete / implementation requires approval
Owner: Apex HQ Master Coordinator
Last updated: 2026-05-17
Use with: `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md`

## Purpose

Define the safe product, privacy, permission, and build boundaries for the Field Ops Agent before any code is written.

The Field Ops Agent should help contractors notice field execution risk without turning Apex HQ into hidden surveillance, HR automation, or punitive monitoring.

## Current Evidence From Repo

| Area | Evidence | Current behavior |
| --- | --- | --- |
| Roadmap | `docs/APEX_HQ_ROADMAP.md` | Field Ops Agent is a later/premium assistant lane; hidden GPS tracking is marked as never. |
| Phase tracker | `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md` | Current next phase is Field Ops Agent Planning Checkpoint because GPS/location and employee monitoring need approval boundaries first. |
| Agent rules | `AGENTS.md` | Hidden GPS tracking is prohibited; GPS/location changes require approval. |
| Assistant scope | `docs/ASSISTANT_COMMAND_EXPANSION_SCOPE.md` | Assistant actions are review-first; no hidden GPS/location behavior. |
| Package map | `shared/packages.js` | `FEATURE_KEYS.FIELD_OPS_AGENT` exists and is included in Premium. |
| Upload evidence | `src/App.jsx`, `src/upload-utils.js`, `server/index.js`, `server/uploads.test.js` | Upload/photo metadata already supports GPS status fields when supplied by the user/browser. |
| Core field systems | `server/index.js`, `src/App.jsx`, existing tests | Jobs, time entries, daily reports, uploads, delivery tickets, safety, pre/post-pour, and tool checklist workflows exist. |

## Product Promise

Field Ops Agent should answer:

- Which field jobs need attention today?
- Who may be missing a report, photo, ticket, checklist, or clock-out?
- Which jobs look active but undocumented?
- What should the owner/admin or foreman review next?

It should not answer those questions by secretly tracking workers.

## Non-Negotiable Rules

- No hidden GPS tracking.
- No background location collection.
- No continuous employee tracking.
- No automatic discipline, payroll adjustment, HR action, legal conclusion, or punitive warning.
- No automatic SMS, email, push notification, or customer communication.
- No automatic crew assignment, material ordering, job conversion, or pricing action.
- No field access to office/admin/pricing/margin/package controls.
- No GPS distance flags until explicit consent, company settings, and user-facing language exist.
- All risky suggestions must be review-first and human-approved.
- Security, role safety, and company isolation are never package-gated premium features.

## Existing Systems To Extend

Use existing workflows first:

- Jobs and crew assignments.
- Time entries and active clock state.
- Daily reports.
- Uploads/photo evidence and existing GPS metadata labels.
- Delivery tickets.
- Pre-pour/post-pour checklists.
- Safety incidents.
- PPE, toolbox, and tool checklist workflows.
- Notifications/reminders.
- Watchtower and Apex Assistant shell.
- Package entitlement helpers in `shared/packages.js` and related package/feature helpers.

Do not create a new parallel field system.

## Phase 1 Allowed Scope

Field Ops Agent Phase 1 should be read-only and operational.

Allowed insights:

| Insight | Allowed wording | Not allowed |
| --- | --- | --- |
| Missed clock-out | "Active clock-in may need review." | "Employee abandoned site." |
| Long shift | "Long active shift. Confirm status before closeout." | Automatic payroll correction. |
| Missing daily report | "Daily report missing for assigned/active job." | Automatic employee warning. |
| Missing photo proof | "Photo proof missing for today." | Claiming work was not done. |
| Missing delivery ticket | "Delivery ticket not recorded yet." | Material cost assumptions. |
| Incomplete pre/post-pour | "Checklist items remain open." | Marking pour blocked without review unless existing workflow already says blocked. |
| Unresolved incident | "Incident needs review." | Legal/safety conclusion. |
| Tool/PPE/toolbox incomplete | "Accountability task still open." | Disciplinary language. |
| Scheduled job has no activity | "Scheduled job has no report/photo/time activity yet." | Assuming crew no-show. |
| Upload GPS missing | "Photo location not captured or unavailable." | "Worker is in wrong place." |

Phase 1 actions:

- Open existing workflow pages.
- Filter to relevant job/user/status where existing routing supports it.
- Show read-only risk summaries.
- Show human-review labels.
- Use package/role gates.

Phase 1 must not:

- Send messages.
- Write new records automatically.
- Change job status automatically.
- Assign or remove crews.
- Trigger payroll/time corrections.
- Start GPS distance checking.

## Role Visibility

| Role | Field Ops Agent visibility | Boundaries |
| --- | --- | --- |
| Owner | Company-level field risk summary, review queue, links to workflows | No hidden tracking; no automatic employee/customer actions. |
| Administrator | Similar to owner, except owner-only controls stay protected | No owner-only export/security controls unless already allowed. |
| Operations Manager | Field execution review for assigned operations scope | No pricing/margin/admin package controls unless role allows. |
| Foreman | Assigned-job reminders and crew closeout tasks | No company-wide pricing, estimates, leads, package, or admin data. |
| Employee | Personal assigned-job tasks only | No other employee monitoring, office data, or pricing. |

## Package Policy

- Basic: normal core reminders and field workflows remain available where already included.
- Premium: Field Ops Agent summary/assistant insights can be enabled when role permissions also allow it.
- Elite: future automation/analytics may build on the same safety rules.

Package gates should control advanced assistant features, not safety protections.

## Consent And Settings Requirements

Before GPS distance flags or location-risk logic are built, Apex HQ needs:

- Company setting for location capture policy.
- User-facing consent language.
- Field-user explanation of what is captured and why.
- Clear disabled state when consent/settings are off.
- Audit/activity trail for enabling/disabling location-related settings.
- Browser permission handling that treats denied/unavailable location as acceptable evidence status, not misconduct.

Until those exist, GPS/location may only be used as existing upload evidence metadata labels plus the approved time-clock slices: explicit user-tapped clock-in/clock-out location evidence after the company enables the Time GPS Evidence policy in Settings, an optional review-only presence label that compares captured clock-out GPS to the captured clock-in GPS anchor for the same job-linked entry, and an office-only reviewed-with-note closure for `Presence needs review` items. That time-clock slice must stay optional, visible to the worker, denial-safe, company-scoped, audit-backed for policy changes and review closure, and separate from background tracking, live geofence alerts, payroll correction, or discipline.

## Later Phases

Later, after approval:

1. Field Ops Agent Phase 1 - Read-only Risk Summary
   - Owner/admin risk cards.
   - Foreman assigned-job task summary.
   - Employee personal task reminders.
   - No GPS distance logic.

2. Field Ops Agent Phase 2 - Review Queue Integration
   - Optional owner/admin review items from existing missing-work signals.
   - Still no automatic messages or employee warnings.

3. Field Ops Agent Phase 3 - Weather Risk Planning
   - Only after a weather provider/integration is approved.
   - Show weather context, not automatic schedule changes.

4. Field Ops Agent Phase 4 - Consent-Based Location Quality
   - Only after settings, consent, and audit trail exist.
   - Distance flags must be "review needed", not punitive conclusions.

5. Field Ops Agent Phase 5 - Agent Activity History
   - Track assistant suggestions, dismissed items, and reviewed actions.
   - Keep owner/admin review-only.

## Never Build

- Hidden GPS/background tracking.
- Automatic employee discipline.
- Automatic payroll corrections.
- Automatic crew/customer texts.
- Automatic safety/legal conclusions.
- Location tracking without consent/settings.
- Field-user access to office-only estimates, pricing, margins, billing, package controls, or admin settings.

## QA Plan For First Build Slice

When implementation is approved, run focused verification:

- `npm.cmd run build`
- `npm.cmd run verify:roles`
- `npm.cmd run verify:time`
- `npm.cmd run verify:jobs`
- `npm.cmd run verify:daily-reports`
- `npm.cmd run verify:uploads`
- `npm.cmd run verify:delivery-tickets`
- `npm.cmd run verify:safety`
- `npm.cmd run verify:tool-checklist`
- `git diff --check`

Browser QA:

- Owner/admin desktop and mobile Field Ops summary.
- Foreman mobile assigned-job reminders.
- Employee mobile personal tasks only.
- Direct-route checks for field users against office/admin/pricing.
- No horizontal overflow.
- No console errors.
- No failed API requests.

## Approval Decisions Needed

Recommended answers:

| Decision | Recommendation |
| --- | --- |
| Build Field Ops Agent Phase 1 as read-only only? | Yes. |
| Include GPS distance flags in Phase 1? | No. |
| Show upload GPS status if already captured? | Yes, as evidence metadata only. |
| Show foremen assigned-job reminders? | Yes. |
| Show employees only their own task reminders? | Yes. |
| Send automatic texts/emails/push alerts? | No. |
| Allow automatic payroll/time corrections? | No. |
| Gate advanced Field Ops Agent behind Premium? | Yes, while keeping normal reminders/security in Basic. |

## Next Builder Prompt

Use this only after approving the above boundaries:

```text
You are entering:

APEX HQ - FIELD OPS AGENT PHASE 1 READ-ONLY RISK SUMMARY

Use skills:
- apex-build-router
- apex-product-system
- apex-saas-hardening
- apex-qa-engineer

Repo:
C:\Users\jberl\Documents\New project

Do NOT redesign.
Do NOT refactor architecture.
Do NOT add GPS distance tracking.
Do NOT add hidden tracking.
Do NOT add automatic employee warnings.
Do NOT add SMS/email/push automation.
Do NOT add payroll, billing, customer portal, or offline mode.
Do NOT commit, push, or deploy.

Goal:
Add the first read-only Field Ops Agent summary using existing jobs, time, reports, uploads, delivery tickets, safety, and checklist data.

Requirements:
- Owner/admin sees company-level field execution risks.
- Foreman sees assigned-job field tasks only.
- Employee sees personal assigned-job tasks only.
- Field users must not see office/admin/pricing/package data.
- Use existing package/role helpers.
- Use existing workflow links.
- GPS/location may only show existing upload evidence status; no distance flags.
- Every item must be framed as review-needed, not misconduct.

Verify:
- npm.cmd run build
- npm.cmd run verify:roles
- npm.cmd run verify:time
- npm.cmd run verify:jobs
- npm.cmd run verify:daily-reports
- npm.cmd run verify:uploads
- npm.cmd run verify:delivery-tickets
- npm.cmd run verify:safety
- npm.cmd run verify:tool-checklist
- git diff --check

Report:
- files changed
- exact behavior added
- role/package safety proof
- verification results
- safe to release yes/no
```
