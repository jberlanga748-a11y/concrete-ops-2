# Apex HQ Fencing Pilot Config Approval Dry-Run

Status: local approval-only dry-run for a future customer pilot config

Use this after the setup approval packet passes. It checks the planned customer pilot app name, volume name, config path, local preflight commands, setup approval gate, rollback notes, and stop conditions before anyone creates a Fly app or volume.

## Command

```powershell
npm.cmd run pilot:fencing-config-dry-run -- --company="Friendly Fence Co" --owner-name="Riley Owner" --owner-email="owner@example.com" --field-name="Sam Foreman" --field-email="sam@example.com" --first-record="Cedar fence replacement estimate" --current-tools="texts, notebook, phone photos, and calendar" --lost-info="photos and follow-up details" --support-channel="text John for same-day best-effort support during agreed hours" --support-owner="John" --rollback-owner="John" --pilot-slug="friendly-fence" --backup-confirmed --terms-acknowledged --data-boundary-acknowledged --day0-accepted --day3-day10-accepted --preflight-passed --success="Owner can find proof without text search" --success="Field user uploads one photo from phone" --json
```

Do not commit real customer emails, phone numbers, credentials, private job details, or private support notes to docs.

## What This Does

- builds the planned customer pilot config in memory
- verifies the app and volume names are not production or demo names
- verifies demo seeding is disabled
- verifies `/api/ready` is the health check
- builds the setup plan and rollback notes
- keeps config file creation and Fly resource creation behind separate approval

## What This Does Not Do

- does not write `fly.customer-*.toml`
- does not create Fly apps or volumes
- does not set secrets
- does not create users or outside login
- does not deploy
- does not run auth smoke
- does not touch production
- does not enter or mutate customer data

## GO Means

- the dry-run is ready for manual config approval
- the planned app, volume, and config path pass local checks
- the setup approval packet is complete
- resource creation is still blocked until separately approved

## NO-GO Means

- do not create config files
- do not create Fly resources
- collect missing setup, support, rollback, or preflight evidence
- keep the pilot in guided demo/planning mode

Production deploy remains locked unless approved through the backup-first release checklist.
