# Apex HQ Fencing Pilot Artifact Index

Status: source map for the first friendly fencing pilot

Purpose: keep the builder, QA flow, and business chat pointed at the same pilot gates without creating outside access, Fly resources, customer data, outreach, or production changes.

## Current Decision

- Guided walkthrough: GO
- 3-5 day friendly validation: GO with supervision after real setup details and auth smoke are confirmed
- 14-day founder pilot: CONDITIONAL GO after Day 3/Day 10 value review
- Public self-serve launch: NO-GO
- Production deploy: NO-GO unless approved through the backup-first release checklist

Latest launch gate snapshot, 2026-05-21T10:10:57Z:

- Guided demo readiness: GO
- Customer pilot handoff readiness: NO-GO until a real company, owner/admin contact, exact workflow, first record, first field/proof action, and 2-3 success criteria are provided
- Production auth smoke readiness: NO-GO until production smoke users, secret, and production-safety approval are explicitly approved
- Production monitoring upgrade readiness: NO-GO until a provider/destination/access owner/redaction plan is selected and tested demo-first
- Wider paid launch readiness: NO-GO pending legal/privacy/public-claims review, production monitoring, production auth smoke, and customer-specific pilot setup approval
- Next highest leverage: pick one real pilot candidate/workflow and run `npm.cmd run pilot:rehearsal` with 2-3 success criteria

## Core Pilot Docs

| Artifact | Purpose |
| --- | --- |
| `docs/apex-hq-first-fencing-pilot-packet.md` | Founder-review packet for the first fencing walkthrough. |
| `docs/apex-hq-fencing-first-walkthrough-readiness-report.md` | Latest Fly demo route, tablet, phone, role, and smoke evidence. |
| `docs/apex-hq-fencing-pilot-intake-gate.md` | Pre-login setup gate before outside access is considered. |
| `docs/apex-hq-fencing-pilot-checkin-packet.md` | Day 3 and Day 10 check-in questions and scorecard. |
| `docs/apex-hq-fencing-pilot-setup-approval-packet.md` | Manual approval packet before outside login or customer pilot setup. |
| `docs/apex-hq-fencing-pilot-config-approval-dry-run.md` | Approval-only customer pilot config dry-run. |
| `docs/apex-hq-first-pilot-support-severity-quick-card.md` | P0-P3 support triage for the friendly pilot. |
| `docs/apex-hq-demo-auth-smoke-preflight.md` | Auth smoke decision matrix for local, GitHub, Vercel preview, Fly demo, and production. |
| `docs/apex-hq-fly-demo-auth-smoke-readiness-report.md` | Latest local Fly demo auth-smoke readiness evidence. |
| `docs/apex-hq-github-demo-smoke-evidence.md` | Latest scheduled GitHub demo smoke evidence pointer. |
| `docs/apex-hq-pilot-route-audit-p3-backlog.md` | Scoped P3 backlog from the screenshot-only route audit. |

## Repeatable Commands

Walkthrough preflight:

```powershell
npm.cmd run pilot:fencing-preflight -- --run --json
```

Pre-login intake gate:

```powershell
npm.cmd run pilot:fencing-intake -- --json
```

Day 3 / Day 10 check-ins:

```powershell
npm.cmd run pilot:fencing-checkins -- --json
```

Setup approval packet:

```powershell
npm.cmd run pilot:fencing-setup-approval -- --json
```

Customer pilot config dry-run:

```powershell
npm.cmd run pilot:fencing-config-dry-run -- --json
```

Pilot readiness verification:

```powershell
npm.cmd run verify:pilot-readiness
```

Launch gate snapshot:

```powershell
npm.cmd run launch:gate-status -- --json
```

## Latest Evidence

- Fly demo target: `https://concrete-ops-demo.fly.dev`
- Latest walkthrough evidence refresh: `2026-05-21T09:59:17Z`
- Latest Fly demo deploy evidence: v130, image `registry.fly.io/concrete-ops-demo:deployment-01KS4Z90RCA1G8RCBKSQQDEE2F`, pushed commit `2a59644`
- Admin desktop manifest: `ui-audit/fencing-first-walkthrough/2026-05-21T09-23-09-399Z/manifest.json`
- Admin tablet manifest: `ui-audit/fencing-first-walkthrough/2026-05-21T09-23-21-902Z/manifest.json`
- Employee phone manifest: `ui-audit/fencing-first-walkthrough/2026-05-21T09-23-28-771Z/manifest.json`
- Local Fly demo auth smoke readiness: skip-auth smoke PASS after v130 deploy, local auth smoke NO-GO because `APEX_SMOKE_PASSWORD` is missing in the current shell
- GitHub scheduled demo smoke: latest observed run `26207043659` passed on 2026-05-21T05:19:24Z and ran auth/bootstrap smoke
- Known P3 visual backlog: desktop `/leads` long fencing text wrap polish resolved; no open visual backlog from the latest walkthrough route audit
- Latest local pilot readiness gate: `npm.cmd run verify:pilot-readiness` passed on 2026-05-21T09:59Z with docs, pilot config, rehearsal, fencing gates, roles, backup export, restore drill, and build. Backup verification produced `app-data-20260521-095905Z.sqlite` / `.json`; restore drill used `app-data-20260521-095906Z.sqlite` / `.json`.
- Latest launch gate snapshot: `npm.cmd run launch:gate-status -- --json` ran on 2026-05-21T10:10Z. Guided demo readiness was `GO`; customer pilot handoff, production auth smoke, production monitoring upgrade, and wider paid launch remained `NO-GO` for explicit setup/approval reasons.

## Hard Stops

Stop before:

- creating outside login
- creating a Fly customer pilot app or volume
- writing a real `fly.customer-*.toml` for a real customer
- setting or reading secret values
- entering real customer data
- sending email, text, or outreach
- changing package gates, roles, auth, tenant isolation, billing, or production config
- deploying production

## What Is Still Needed From The User

- actual company name
- owner/admin name and private email
- field lead or employee name and private email if field workflow is in scope
- first real lead, estimate, job, or proof record
- support channel and expectations
- confirmation that current tools remain backup
- written pilot expectations and data boundary acknowledgement
- approval before outside login or customer-specific setup

Production deploy remains locked unless approved through the backup-first release checklist.
