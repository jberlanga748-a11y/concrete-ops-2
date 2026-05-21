# Apex HQ Fencing Pilot Setup Approval Packet

Status: template for approving a first friendly fencing pilot setup

Use this after the intake gate, walkthrough packet, and Day 3 / Day 10 check-in packet are ready. It is the last review point before outside login or any customer-specific pilot setup is considered.

## Command

```powershell
npm.cmd run pilot:fencing-setup-approval -- --company="Friendly Fence Co" --owner-name="Riley Owner" --owner-email="owner@example.com" --field-name="Sam Foreman" --field-email="sam@example.com" --first-record="Cedar fence replacement estimate" --current-tools="texts, notebook, phone photos, and calendar" --lost-info="photos and follow-up details" --support-channel="text John for same-day best-effort support during agreed hours" --support-owner="John" --rollback-owner="John" --pilot-slug="friendly-fence" --backup-confirmed --terms-acknowledged --data-boundary-acknowledged --day0-accepted --day3-day10-accepted --preflight-passed --success="Owner can find proof without text search" --success="Field user uploads one photo from phone" --json
```

Do not commit real customer emails, phone numbers, credentials, or private job details to docs. Use the command locally when the actual details are known.

## GO Means

- intake gate passed
- pilot readiness preflight passed
- support owner is named
- backup/rollback owner is named
- current system remains backup
- Day 0, Day 3, and Day 10 plan is accepted
- written pilot expectations and data boundary are acknowledged
- outside login can be considered only after explicit manual approval

## NO-GO Means

- do not create outside access
- do not create Fly apps or volumes
- do not enter customer data
- collect missing support, rollback, intake, or preflight evidence
- keep the conversation as guided demo or planning only

## Hard Boundaries

- no production deploy
- no demo app or demo volume reuse for customer data
- no Fly resource creation without separate explicit approval
- no secrets, passwords, API keys, or tokens in approval notes
- no real customer contact information committed to docs
- no public launch or pricing/legal/security promise
