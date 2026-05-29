# Apex Agent OS v1 Post-Deploy Monitoring

Date: 2026-05-29
Production app: https://app.apexhq.online
Fly app: concrete-ops-2
Release: v587
Image: registry.fly.io/concrete-ops-2:deployment-01KSRRZXXDJ6JMETX05WVHKC51
Release commit: 453c13e feat: complete Agent OS v1 release boundary
Branch: codex/agent-daily-lead-scout

## Deployment Result

Agent OS v1 was deployed to production on Fly as release v587. The app reported one running machine in sjc, version 587, state started, with one total and one passing check. The `/api/ready` Fly check reported database readiness as ok.

Rollback target remains the prior Fly release v586. No Fly config, Supabase config, application secrets, or production data repair commands were changed as part of this monitoring pass.

## Smoke Evidence

- Pre-deploy production auth smoke: GitHub Actions run 26614325258 passed.
- First post-deploy production auth smoke: GitHub Actions run 26614411391 failed during hosted health smoke with `fetch failed`.
- Immediate local production health and route smoke passed after that transient hosted check failure.
- Retried post-deploy production auth smoke: GitHub Actions run 26614450325 passed.
- Hosted smoke command passed with auth skipped: `npm.cmd run smoke:hosted -- --base-url=https://app.apexhq.online --skip-auth --json`.
- Readiness timing passed against production: `node scripts/readiness-timing.mjs --base-url=https://app.apexhq.online --json`.

## Performance Snapshot

The readiness timing sample completed successfully after release v587:

- `/api/health` average response was about 108 ms.
- `/api/ready` average response was about 50 ms.

Both values were within the release smoke expectations for this deployment window.

## Agent OS Boundaries Confirmed

- Apex remains one product-facing Agent.
- Internal draft/prep Agent OS actions are enabled through queue/run controls.
- Email, SMS, payment, portal, scheduling, bid submission, integration writes, provider credential handling, cold calls, and autonomous customer contact remain gated behind explicit normal-domain workflows.
- External gate decision packets do not execute by themselves.
- Production auth smoke evidence did not require secrets to be printed or stored in docs.

## Follow-Up Watch Items

- Track whether the transient hosted health fetch failure recurs in later GitHub Actions runs.
- Keep rollback to v586 available until the next clean production release.
- Continue using the Agent OS console production evidence panel for release evidence instead of ad hoc notes.
