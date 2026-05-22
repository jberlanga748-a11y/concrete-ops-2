# Apex HQ Sunday Pilot Readiness Gate

Status: controlled guided-pilot gate

Use this before letting a real company use Apex HQ on Sunday. The target is a founder-led walkthrough for one company and one workflow, not public launch and not production release.

## Gate Command

Plan only:

```powershell
npm.cmd run pilot:sunday-readiness -- --json
```

Run local verification:

```powershell
npm.cmd run pilot:sunday-readiness -- --run-local --json
```

Run with real-company intake details in the terminal only. Do not commit real emails or private company details to docs:

```powershell
npm.cmd run pilot:sunday-readiness -- --run-local --company="Friendly Fence Co" --owner-name="Riley Owner" --owner-email="owner@example.com" --field-name="Sam Foreman" --field-email="sam@example.com" --first-record="Cedar fence replacement estimate" --current-tools="texts, notebook, photos, calendar" --lost-info="photos and follow-up details" --support-channel="text John for same-day best-effort support" --backup-confirmed --terms-acknowledged --data-boundary-acknowledged --success="Owner can find proof without text search" --success="Field user uploads one photo from phone" --json
```

## GO Meaning

GO means:

- local verification passed
- real-company intake is complete
- owner/admin and field workflow expectations are acknowledged
- no risky promises are present
- no passwords, tokens, API keys, or secrets are embedded in intake text
- the app is ready for a guided walkthrough in an approved demo/pilot environment

GO does not mean:

- production is approved
- public launch is approved
- billing/payment is enabled
- outbound email/text/bid submission is approved
- AI can mutate production data without review

## Sunday Workflow

Keep the live walkthrough narrow:

```text
lead/opportunity -> estimate -> job -> schedule -> field proof -> report/upload -> owner review
```

Do not expand into payroll, accounting, billing, automatic outreach, public signup, customer portal promises, or guaranteed lead generation.

## Required Evidence

The Sunday gate runs or plans:

- fake-company sandbox regression
- signup and tenant isolation checks
- role checks
- lead workflow checks
- job workflow checks
- daily report checks
- upload checks
- estimate checks
- production build
- whitespace check

If hosted proof is needed, use the demo preflight:

```powershell
npm.cmd run pilot:fencing-preflight -- --run --base-url=https://concrete-ops-demo.fly.dev --json
```

Use `--allow-auth` only when `APEX_SMOKE_PASSWORD` is available.

## Hard Stops

Stop before:

- Fly production deploy
- production data changes
- secrets/env var changes
- package/billing/payment changes
- real customer data creation outside an approved pilot path
- sending emails, texts, bids, or outreach
- weakening role, package, tenant, or field-user restrictions

## Current Production Note

Production remains locked. A previous production backup check completed, but the backup command reported demo-mode behavior. Inspect and resolve that before any production release.

## Handoff Files

- `docs/apex-hq-one-page-pilot-onboarding-checklist.md`
- `docs/apex-hq-pilot-feedback-intake-form.md`
- `docs/apex-hq-first-pilot-support-severity-quick-card.md`
- `docs/apex-hq-fencing-pilot-intake-gate.md`
- `docs/apex-hq-fencing-pilot-artifact-index.md`

Production deploy remains locked unless approved through the backup-first release checklist.
