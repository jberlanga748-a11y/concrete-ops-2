# Apex HQ Fly Demo Auth Smoke Readiness Report

Date: 2026-05-21

Target: `https://concrete-ops-demo.fly.dev`

Status: Fly demo health and skip-auth hosted smoke PASS. Local auth smoke is blocked because `APEX_SMOKE_PASSWORD` is not available in the current shell.

## Safety Boundary

This check did not print, read, rotate, or set any secret value. It did not deploy, create users, create sessions, change packages, touch production, create Fly resources, or mutate customer data.

## Secret Presence

Local shell:

- `APEX_SMOKE_PASSWORD`: missing

Result:

- auth smoke from this local shell: NO-GO
- skip-auth hosted smoke: GO
- GitHub scheduled demo auth smoke may still run if the repository secret is configured

## Fly Demo Health

`GET https://concrete-ops-demo.fly.dev/api/ready` returned:

```json
{
  "ok": true,
  "status": "ready",
  "checks": {
    "database": "ok"
  }
}
```

## Hosted Smoke

Command:

```powershell
npm.cmd run smoke:hosted -- --base-url=https://concrete-ops-demo.fly.dev --skip-auth --json
```

Result: PASS.

Checks:

- `/api/health`: 200
- `/api/ready`: 200, database ok
- app routes: 200 for owner/admin and field route set
- auth side effects: disabled

## Next Step

For a guided walkthrough, skip-auth smoke proves routes/readiness only. To prove login/bootstrap locally, run auth smoke only when the approved demo smoke password is available in the shell:

```powershell
npm.cmd run smoke:hosted -- --base-url=https://concrete-ops-demo.fly.dev --allow-auth --json
```

Do not paste the password into docs, chat, issues, PRs, or terminal output.

Production auth smoke remains separate and approval-gated through `docs/apex-hq-production-auth-smoke-design.md`.

Production deploy remains locked unless approved through the backup-first release checklist.
