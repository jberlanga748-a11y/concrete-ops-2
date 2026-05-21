# Apex HQ Demo Auth Smoke Preflight

Status: operator checklist for demo-only auth smoke

Purpose: make it clear when Apex HQ can run hosted smoke with auth versus when it should run route/readiness smoke only. This document does not store, reveal, rotate, or configure secrets.

## Quick Decision

| Environment | Command | Auth Mode | Notes |
| --- | --- | --- | --- |
| Local shell without demo smoke password | `npm.cmd run smoke:hosted -- --base-url=https://concrete-ops-demo.fly.dev --skip-auth --json` | skip auth | Safe route/readiness proof only. |
| Local shell with demo smoke password available | `npm.cmd run smoke:hosted -- --base-url=https://concrete-ops-demo.fly.dev --allow-auth --json` | demo auth | Uses `APEX_SMOKE_PASSWORD` from the current shell. Do not print it. |
| GitHub Actions scheduled demo smoke | `.github/workflows/demo-hosted-smoke.yml` | demo auth when secret exists | Uses repository secret `APEX_SMOKE_PASSWORD`; skips auth when missing. |
| Vercel preview | preview/direct-route smoke only | normally skip auth | Vercel is not the production backend; protected previews may block automated smoke. |
| Fly demo | `https://concrete-ops-demo.fly.dev` | demo auth allowed | Approved non-production target for full-stack demo smoke. |
| Fly production | `https://app.apexhq.online` | skip auth by default | Production auth smoke is separate and approval-gated. |

## Before A Fencing Pilot Walkthrough

Run the safe preflight plan first:

```powershell
npm.cmd run pilot:fencing-preflight -- --json
```

If you want the preflight to run checks and auth is not required:

```powershell
npm.cmd run pilot:fencing-preflight -- --run --json
```

If demo auth smoke is approved and `APEX_SMOKE_PASSWORD` is available in the local shell:

```powershell
npm.cmd run pilot:fencing-preflight -- --run --allow-auth --json
```

When the password is not available, the preflight intentionally falls back to `--skip-auth` and warns that auth smoke was skipped. Do not treat skip-auth smoke as proof that login/bootstrap works.

## Secret Handling Rules

- Do not commit demo smoke passwords to docs.
- Do not paste demo smoke passwords into chat, issues, PRs, or logs.
- Do not reuse the demo smoke secret for production auth smoke.
- Do not read or print secret values when checking whether auth smoke is possible.
- Use `docs/apex-hq-github-actions-smoke-secrets.md` for GitHub secret setup and rotation.

## GO / NO-GO

Demo route/readiness smoke is GO when:

- `/api/health` and `/api/ready` pass
- direct app routes return app responses or expected redirects
- no auth side effects are needed

Demo auth smoke is GO when:

- the target is Fly demo, not production
- `APEX_SMOKE_PASSWORD` is available through the approved local shell or GitHub secret path
- login/bootstrap latency stays inside the hosted smoke budgets
- employee restricted-route checks pass

Demo auth smoke is NO-GO when:

- the target is production
- the password is unavailable or stale
- login/bootstrap is slow enough to fail budgets
- employee restricted-route checks fail
- the task requires real customer credentials or customer data

Production auth smoke remains NO-GO unless the separate production auth smoke approval checklist is completed in `docs/apex-hq-production-auth-smoke-design.md`.

## Evidence To Record

- command run
- base URL
- whether auth was skipped or allowed
- `/api/ready` result
- login/bootstrap timing if auth ran
- employee restricted-route result if auth ran
- screenshot or manifest path when browser route smoke is part of the walkthrough

Production deploy remains locked unless approved through the backup-first release checklist.
