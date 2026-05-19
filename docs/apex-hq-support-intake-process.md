# Apex HQ Support Intake Process

Status: Phase 1 pilot support process

Purpose: make support operational enough for controlled pilots without adding fake ticketing, impersonation, or unsupported access behavior.

## Support Principle

Support should protect the pilot workflow, roles, and customer data first.

Every issue should answer:

- who is affected
- which workflow is affected
- whether the pilot is blocked
- whether role/data safety is involved
- what workaround exists
- who owns the follow-up

## Required Intake Fields

Capture:

- company/workspace
- user name
- user role
- page or workflow
- device/browser
- issue summary
- exact steps
- expected result
- actual result
- screenshot or recording if available
- blocking yes/no
- selected pilot workflow affected yes/no
- severity
- workaround
- owner
- promised follow-up time
- date/time reported

## Severity Matrix

P0: security, company data, role leakage, login down

- owner: founder immediately
- response: immediate triage
- escalation: pause pilot workflow if needed
- production impact: release-blocking
- examples: field user sees pricing, cross-company data visible, production login down, database readiness down

P1: pilot-blocking workflow failure

- owner: founder or support operator
- response: same business day when practical
- escalation: create a product task only with exact blocker and smallest safe fix
- examples: field user cannot access assigned job, owner cannot review proof, selected report/upload workflow cannot complete

P2: important friction with workaround

- owner: founder or support operator
- response: next check-in or next practical work block
- escalation: batch into pilot follow-up notes
- examples: confusing copy, slow manual step, awkward but usable workflow, report needs training

P3: minor polish, training, or idea

- owner: backlog/support notes
- response: acknowledge and log
- escalation: no build promise
- examples: cosmetic issue, future idea, optional workflow, non-blocking preference

## Intake Template

```text
Company/workspace:
User:
Role:
Page/workflow:
Device/browser:
Issue:
Steps:
Expected:
Actual:
Screenshot/recording:
Blocking? yes/no
Pilot workflow affected? yes/no
Severity: P0 / P1 / P2 / P3
Workaround:
Owner:
Promised follow-up:
Date/time:
```

## Triage Flow

1. Confirm whether the issue involves auth, roles, customer data, billing/package surfaces, or production readiness.
2. If yes, treat it as P0/P1 until proven otherwise.
3. Confirm the exact user role and workspace.
4. Reproduce only in the correct environment.
5. Avoid destructive actions while reproducing.
6. Capture screenshots, request ID, route, and timestamp.
7. Assign severity.
8. Give a realistic follow-up time.
9. Decide: train, workaround, document, or create a product task.
10. Close the loop at Day 3 or Day 10 review.

## Escalation Rules

Escalate immediately when:

- company data or role leakage is suspected
- owner/admin cannot log in
- `/api/ready` fails
- field users can access office/admin surfaces
- pilot workflow is blocked with no workaround
- production data appears missing, reset, or mixed

Do not escalate to product build when:

- the issue is a one-off training miss
- the request is a broad feature idea
- the customer is asking for payroll/accounting replacement
- the request expands beyond the selected pilot workflow
- the request would weaken role or package boundaries

## Manual Boundaries

Allowed during Phase 1 support:

- guidance
- screenshots
- reproducing routes
- collecting request IDs
- recording severity and workaround
- updating pilot notes
- opening a scoped product task after approval

Not allowed without approval:

- production deploy
- production restore
- database edits
- role or permission changes
- customer data migration
- support impersonation
- sending customer emails/SMS automatically
- changing billing/packages
- making legal/security/SLA promises

## Pilot Follow-Up Cadence

Day 0:

- confirm support channel
- confirm severity meanings
- confirm follow-up expectations

Day 3:

- review support items
- decide which were training vs product blockers
- keep workflow narrow

Day 10:

- review support load
- decide continue, adjust, or stop
- do not expand scope if support load is already high

## Support Success Criteria

Support is working when:

- every blocker has an owner
- every issue has a severity
- role/data risks are escalated immediately
- pilot users understand where to ask for help
- no custom build promises are made casually
- support notes feed the Day 3 and Day 10 decisions
