# Apex HQ GitHub Demo Smoke Evidence

Date: 2026-05-21

Workflow: `Apex HQ Demo Hosted Smoke`

Target: `https://concrete-ops-demo.fly.dev`

Status: scheduled GitHub demo smoke is passing.

## Latest Runs

Read-only command:

```powershell
gh run list --repo jberlanga748-a11y/concrete-ops-2 --workflow "Apex HQ Demo Hosted Smoke" --limit 5
```

Latest observed runs:

| Run ID | Trigger | Status | Duration | Started |
| --- | --- | --- | --- | --- |
| `26207043659` | schedule | success | 21s | 2026-05-21T05:19:24Z |
| `26197656974` | schedule | success | 23s | 2026-05-21T00:17:49Z |
| `26194263047` | schedule | success | 22s | 2026-05-20T22:43:44Z |
| `26190304594` | schedule | success | 23s | 2026-05-20T21:12:53Z |
| `26182122208` | schedule | success | 29s | 2026-05-20T18:31:13Z |

## Latest Run Notes

Run `26207043659` showed:

- non-auth hosted smoke ran with `--skip-auth`
- auth hosted smoke ran with `--allow-auth`
- auth checks were enabled in the workflow run
- bootstrap returned HTTP 200 for checked demo users
- observed bootstrap timings in the filtered log included `253ms` and `81ms`

No secret value was read, printed, copied, rotated, or changed during this evidence refresh.

## Local Versus GitHub

Local shell on this machine:

- `APEX_SMOKE_PASSWORD`: missing
- local auth smoke: NO-GO
- local skip-auth smoke: PASS

GitHub Actions:

- scheduled demo smoke: PASS
- auth smoke: running in the latest observed scheduled workflow

## Boundaries

This evidence refresh did not dispatch workflows, set secrets, deploy, create sessions locally, create users, change packages, touch Fly resources, touch production, or mutate customer data.

Production auth smoke remains separate and approval-gated through `docs/apex-hq-production-auth-smoke-design.md`.
