# Apex HQ Pilot Feedback Intake Form

Status: controlled pilot feedback template

Use this for every pilot note, bug, workflow complaint, feature idea, or support issue. The goal is to protect the pilot and avoid random build drift.

## Intake

```text
Company:
Contact:
Role:
Date/time:
Environment:
Device/browser:
Workflow:
Page/route:
Issue or feedback:
Exact steps:
Expected:
Actual:
Screenshot/recording link:
Blocking? yes/no
Workaround:
Severity: P0 / P1 / P2 / P3
Owner:
Promised follow-up:
```

## Severity

P0: security, role leakage, company data issue, login down, app health down.

P1: selected pilot workflow is blocked with no practical workaround.

P2: important friction with a workaround.

P3: polish, training issue, future idea, or preference.

## Classification

Choose one:

- Training issue
- Data/setup issue
- Product bug
- Missing workflow
- UX confusion
- Performance issue
- Role/permission concern
- Pilot scope change request
- Future idea

## Build Decision

Only create a build task when all are true:

- The issue affects the selected pilot workflow.
- The current workaround is too painful or unsafe.
- The smallest fix is clear.
- Role, package, data, and production risks are understood.
- The user approved moving from feedback to implementation.

Do not create a build task for broad ideas, custom promises, payroll/accounting replacement, automatic customer contact, payment collection, or public-launch requests.

## Follow-Up Closeout

```text
Resolution:
User notified:
Pilot impact:
Follow-up needed:
Add to Day 3 review? yes/no
Add to Day 10 review? yes/no
Build task created? yes/no
```

## Safety Reminder

Field users must remain blocked from estimates, pricing, package controls, owner/admin settings, and office-only internal notes. Production changes require a backup-first release approval.
