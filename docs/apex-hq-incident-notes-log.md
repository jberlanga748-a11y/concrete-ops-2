# Apex HQ Incident Notes Log

Status: Phase 1 operating log

Purpose: keep production, demo, pilot, and security incident notes in one plain-text place until Apex HQ has a dedicated incident tracker.

## When To Add A Note

Add a note when any of these happen:

- production `/api/ready` fails twice in a row
- Fly reports failed service checks after grace period
- login or bootstrap slows past the hosted smoke budgets
- a pilot workflow is blocked
- a role, package, tenant, or field-user restriction looks wrong
- a backup, restore, deploy, or rollback does not complete cleanly
- data loss, security exposure, or customer-impacting behavior is suspected

Do not store secrets, passwords, tokens, private keys, customer payment data, or raw sensitive payloads here. Redact anything that could grant access.

## Open Incidents

No open incidents at the time this log was created.

## Note Template

```text
Incident ID:
Date/time:
Environment: production | demo | preview | local
Severity: P0 | P1 | P2 | P3
Status: investigating | mitigated | resolved | monitoring
Owner:

Summary:

Customer or pilot impact:

Detection source:
- GitHub readiness monitor
- Fly checks
- hosted smoke
- user report
- logs
- manual QA

Evidence:
- ready endpoint:
- health endpoint:
- Fly release/version:
- commit:
- request ID(s):
- screenshots or manifest:

Immediate mitigation:

Root cause:

Fix applied:

Verification:

Rollback or recovery notes:

Follow-up tasks:
```

## Closed Incident Notes

Add closed notes below this line. Keep newest at the top.
