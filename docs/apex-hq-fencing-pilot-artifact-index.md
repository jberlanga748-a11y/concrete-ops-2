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
- Production monitoring upgrade readiness: GO for the current demo/pilot GitHub Actions baseline only; production log drains, paid providers, and production auth smoke remain blocked without explicit production-safety approval
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
- Latest walkthrough evidence refresh: `2026-05-21T11:03:46Z`
- Latest Fly demo deploy evidence: v130, image `registry.fly.io/concrete-ops-demo:deployment-01KS4Z90RCA1G8RCBKSQQDEE2F`, pushed commit `2a59644`
- Admin desktop manifest: `ui-audit/fencing-first-walkthrough/2026-05-21T11-03-15-095Z/manifest.json`
- Admin tablet manifest: `ui-audit/fencing-first-walkthrough/2026-05-21T11-03-27-566Z/manifest.json`
- Employee phone manifest: `ui-audit/fencing-first-walkthrough/2026-05-21T11-03-34-729Z/manifest.json`
- Local Fly demo auth smoke readiness: skip-auth smoke PASS after v130 deploy, local auth smoke NO-GO because `APEX_SMOKE_PASSWORD` is missing in the current shell
- GitHub scheduled demo smoke: latest observed run `26207043659` passed on 2026-05-21T05:19:24Z and ran auth/bootstrap smoke
- Latest GitHub CI: run `26222254607` passed on 2026-05-21 for commit `028abc3`. The CI job covered whitespace, auth/signup safety, tenant/role/package safety, public intake/demo safety, server behavior and backup/export tooling, and frontend build.
- Known P3 visual backlog: desktop `/leads` long fencing text wrap polish resolved; no open visual backlog from the latest walkthrough route audit
- Latest local pilot readiness gate: `npm.cmd run verify:pilot-readiness` passed on 2026-05-21T11:00Z with docs, pilot config, rehearsal, fencing gates, roles, backup export, restore drill, and build. Backup verification produced `app-data-20260521-110033Z.sqlite` / `.json`; restore drill used `app-data-20260521-110034Z.sqlite` / `.json`.
- Latest launch gate snapshot: `npm.cmd run launch:gate-status -- --provider=github-actions --environment=demo --alert-destination=github-issues --retention-days=30 --access-owner=John --redaction-confirmed --request-id-search --error-alerts --demo-first --json` ran on 2026-05-21T11:02Z. Guided demo readiness and the demo/pilot monitoring baseline were `GO`; customer pilot handoff, production auth smoke, and wider paid launch remained `NO-GO` for explicit setup/approval reasons.
- Latest monitoring baseline validation: `npm.cmd run monitor:upgrade-readiness -- --provider=github-actions --environment=demo --alert-destination=github-issues --retention-days=30 --access-owner=John --redaction-confirmed --request-id-search --error-alerts --demo-first --json` returned `GO` on 2026-05-21T10:22Z for demo/pilot monitoring only.
- Latest local full visual route sweep: `npm.cmd run build`, `npm.cmd run verify:roles`, and `npm.cmd run audit:visual-polish:full` passed on 2026-05-21T10:28Z with zero final failures. Evidence manifests:
  - `ui-audit/visual-polish/2026-05-21T10-25-01-655Z/manifest.json`
  - `ui-audit/visual-polish/2026-05-21T10-25-48-223Z/manifest.json`
  - `ui-audit/visual-polish/2026-05-21T10-26-14-764Z/manifest.json`
  - `ui-audit/visual-polish/2026-05-21T10-26-41-202Z/manifest.json`
  - `ui-audit/visual-polish/2026-05-21T10-27-07-729Z/manifest.json`
  - note: admin desktop `/estimates` had one retryable timeout and then passed on retry; no route remained failed.
- Latest founder demo readiness check: `npm.cmd run verify:founder-demo` and `npm.cmd run brief:founder-demo` passed on 2026-05-21. Production and demo readiness endpoints returned HTTP 200 with database `ok`, founder-demo brief tests passed, and the generated brief remained manual-only with no outreach, tracker mutation, account creation, production change, or release action.
- Latest demo smoke refresh: `npm.cmd run verify:demo`, Fly demo `/api/ready`, `fly status -a concrete-ops-demo`, `fly checks list -a concrete-ops-demo`, and `npm.cmd run smoke:hosted -- --base-url=https://concrete-ops-demo.fly.dev --skip-auth --json` passed on 2026-05-21. Fly demo stayed on v130 with image `registry.fly.io/concrete-ops-demo:deployment-01KS4Z90RCA1G8RCBKSQQDEE2F`, service check passing, hosted `/api/ready` at 30ms, and all checked app routes returned HTTP 200.
- Latest Opportunity Scout safety verification: `npm.cmd run verify:opportunity-scout` passed on 2026-05-21 with 69 tests. Coverage included owner/admin access, Basic/package locking, field-user blocking, company scoping, redaction, missing-info extraction, dedupe, review-only AI planning, human approval before lead conversion, blocked source terms, source access human-review stops, and rejection of auto-contact, bid submission, credential, and token payloads.
- Latest core workflow verification: `npm.cmd run verify:leads`, `npm.cmd run verify:jobs`, `npm.cmd run verify:daily-reports`, `npm.cmd run verify:uploads`, and `npm.cmd run verify:estimates` passed on 2026-05-21. This refreshed the lead/opportunity, job, daily report, upload/proof, and estimate/proposal workflow tests. A parallel `verify:leads` attempt had one AI lead assistant test-server readiness timeout, then the same command passed fully when rerun alone.
- Latest field/support verification: `npm.cmd run verify:time`, `npm.cmd run verify:safety`, `npm.cmd run verify:tool-checklist`, `npm.cmd run verify:delivery-tickets`, `npm.cmd run verify:pre-pour`, `npm.cmd run verify:post-pour`, `npm.cmd run verify:change-orders`, `npm.cmd run verify:customers`, and `npm.cmd run verify:users` passed on 2026-05-21. A first Tool Checklist attempt had a test-server readiness timeout, then passed fully when rerun alone before the remaining checks continued.
- Latest SaaS safety verification: `npm.cmd run verify:packages`, `npm.cmd run verify:entitlements`, `npm.cmd run verify:auth`, `npm.cmd run verify:exports`, `npm.cmd run verify:backup`, `npm.cmd run verify:restore`, `npm.cmd run verify:server`, and `npm.cmd run build` passed on 2026-05-21. Backup verification produced `app-data-20260521-105842Z.sqlite` / `.json`; the restore drill used the same backup pair and returned database `ok`. Local server smoke also logged login at 26ms and bootstrap at 6ms or less during the checked path.
- Latest fencing walkthrough preflight: `npm.cmd run pilot:fencing-preflight -- --run --json` passed against `https://concrete-ops-demo.fly.dev` on 2026-05-21T11:03Z. Fly demo `/api/ready`, first-user packet validation, hosted skip-auth route smoke, admin desktop audit, admin tablet audit, employee phone field/restricted-route audit, and role tests all passed. The preflight decision remained guided walkthrough `GO`, friendly validation `GO with supervision`, public launch `NO-GO`, and production deploy `NO-GO unless explicitly approved through backup-first release`.
- Latest app shell architecture extraction: `npm.cmd run build`, `npm.cmd run verify:roles`, and `npm.cmd run verify:estimates` passed on 2026-05-21 after moving shared shell primitives out of `src/App.jsx` into `src/app-shell-components.jsx`. Local browser audits also passed for admin desktop `/command-center`, `/estimates`, `/jobs` and employee phone `/jobs`, `/reports`, `/uploads`, `/time`. Evidence manifests: `ui-audit/app-architecture-shell-extract/2026-05-21T11-55-16-826Z/manifest.json` and `ui-audit/app-architecture-shell-extract/2026-05-21T11-55-16-823Z/manifest.json`.
- Latest shared UI primitive extraction: `npm.cmd run build`, `npm.cmd run verify:roles`, and `node --test --test-concurrency=1 src/app-routing.test.js src/navigation-utils.test.js src/design-tokens.test.js` passed on 2026-05-21 after moving common UI primitives into `src/app-shell-components.jsx`. Local browser audits passed for admin desktop `/command-center`, `/estimates`, `/jobs`, `/support` and employee phone `/jobs`, `/reports`, `/uploads`, `/time`. Evidence manifests: `ui-audit/app-architecture-ui-primitives/2026-05-21T12-02-38-045Z/manifest.json` and `ui-audit/app-architecture-ui-primitives/2026-05-21T12-02-38-035Z/manifest.json`.
- Latest estimate route component extraction: `npm.cmd run build`, `npm.cmd run verify:estimates`, `npm.cmd run verify:roles`, and `node --test --test-concurrency=1 src/app-routing.test.js src/navigation-utils.test.js src/design-tokens.test.js` passed on 2026-05-21 after moving estimate display helpers, the polished estimate table, and the estimate-to-job handoff readiness card into `src/estimates-route-components.jsx`. Local browser audits passed for admin desktop/tablet/phone `/estimates` and employee phone `/jobs`, `/reports`, `/uploads`, `/time`. Evidence manifests: `ui-audit/app-architecture-estimates-extract/2026-05-21T12-15-22-815Z/manifest.json` and `ui-audit/app-architecture-estimates-extract-field/2026-05-21T12-15-22-852Z/manifest.json`.
- Latest estimate command rail extraction: `npm.cmd run build`, `npm.cmd run verify:estimates`, `npm.cmd run verify:roles`, and `node --test --test-concurrency=1 src/app-routing.test.js src/navigation-utils.test.js src/design-tokens.test.js` passed on 2026-05-21 after moving the branded proposal/action/tools rail into `src/estimates-route-components.jsx`. Local browser audits passed for admin desktop/tablet/phone `/estimates` and employee phone `/jobs`, `/reports`, `/uploads`, `/time`. Evidence manifests: `ui-audit/app-architecture-estimate-rail-extract/2026-05-21T12-22-37-260Z/manifest.json` and `ui-audit/app-architecture-estimate-rail-extract-field/2026-05-21T12-22-37-258Z/manifest.json`.
- Latest shared brand utility extraction: `npm.cmd run build`, `npm.cmd run verify:estimates`, `npm.cmd run verify:roles`, and `node --test --test-concurrency=1 src/brand-utils.test.js src/app-routing.test.js src/navigation-utils.test.js src/design-tokens.test.js` passed on 2026-05-21 after moving Apex brand constants, visible-name normalization, and logo-initial helpers into `src/brand-utils.js`. Local browser audits passed for admin desktop/tablet/phone `/estimates` and `/settings`, plus employee phone `/jobs`, `/reports`, `/uploads`, `/time`. Evidence manifests: `ui-audit/app-architecture-brand-utils-desktop/2026-05-21T12-29-17-446Z/manifest.json`, `ui-audit/app-architecture-brand-utils-tablet/2026-05-21T12-29-04-013Z/manifest.json`, `ui-audit/app-architecture-brand-utils-phone/2026-05-21T12-29-04-012Z/manifest.json`, and `ui-audit/app-architecture-brand-utils-field/2026-05-21T12-28-46-837Z/manifest.json`.

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
