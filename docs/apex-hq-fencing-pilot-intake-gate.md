# Apex HQ Fencing Pilot Intake Gate

Status: pre-login setup gate for the first friendly fencing pilot

Use this before creating any outside login or entering real customer workflow data.

## Purpose

The intake gate confirms the first fencing pilot has enough setup context to start safely. It is not outreach, onboarding automation, user creation, production deployment, or a customer-data import.

## Command

```powershell
npm.cmd run pilot:fencing-intake -- --company="Friendly Fence Co" --owner-name="Riley Owner" --owner-email="owner@example.com" --field-name="Sam Foreman" --field-email="sam@example.com" --first-record="Cedar fence replacement estimate" --current-tools="texts, notebook, phone photos, and calendar" --lost-info="photos and follow-up details" --support-channel="text John for same-day best-effort support during agreed hours" --backup-confirmed --terms-acknowledged --data-boundary-acknowledged --success="Owner can find proof without searching text messages" --success="Field user uploads one photo from phone" --json
```

Do not commit real owner/admin or field user emails to docs. Use the command locally when the actual details are known.

## Required Inputs

- company name
- owner/admin name and email
- field lead or employee name and email if field workflow is in scope
- one exact pilot workflow
- one real first lead, estimate, job, or proof record
- one field phone/proof action
- current estimate, schedule, photo, and follow-up tools
- what gets lost most often today
- support channel and same-day best-effort expectations
- 2 or 3 success criteria
- current system remains backup
- written pilot expectations acknowledged
- no sensitive data beyond the pilot workflow

## GO Means

- outside login can be considered after demo preflight and support owner confirmation
- friendly validation can start with supervision
- current system remains backup
- Day 3 and Day 10 check-ins are scheduled

## NO-GO Means

- do not create outside access
- collect missing setup information
- remove risky promises or secret-like text
- keep the conversation as a guided walkthrough only

## Hard Boundaries

- no guaranteed leads, jobs, revenue, or growth
- no AI autopilot, automatic bidding, automatic pricing, or automatic customer contact
- no accounting/payroll replacement
- no enterprise, SOC 2, bank-level, or formal compliance claim
- no custom fencing feature promise
- no production deploy or customer app handoff without the approved setup checklist
- no passwords, tokens, API keys, or secrets in intake notes
