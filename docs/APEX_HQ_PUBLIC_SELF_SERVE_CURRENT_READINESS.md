# Apex HQ Public Self-Serve Current Readiness

Date: 2026-05-31
Status: production signup contained; public launch remains approval-gated

## Current Verdict

Apex HQ is still strongest as a guided demo and controlled pilot platform. The app has tested self-serve foundations, and production public signup has now been turned back off for containment while the self-serve and public-launch gates remain approval-gated.

Containment evidence:

- Production release: Fly `v619`.
- Image: `registry.fly.io/concrete-ops-2:deployment-01KSY4B9G5CA2MEQAB6S5SXQXQ`.
- Pre-change backup: `/app/data/backups/postgres-app-data-20260531-055430Z.json`.
- Upload backup manifest: `/app/data/backups/uploads-20260531-055430Z.manifest.json`.
- `/api/ready`: PASS, database ready.
- `/api/setup/status`: PASS.
- `publicSignupEnabled`: `false`.
- `demoMode`: `false`.
- `needsSetup`: `false`.
- Direct `POST /api/signup/company`: `404 Not Found`, no company created.
- hosted skip-auth smoke: PASS.
- self-serve readiness: controlled self-serve pilot GO, public self-serve launch NO-GO.

Treat broad public launch as blocked until public signup is explicitly re-enabled through the full self-serve/public-launch evidence bundle, legal/privacy/public-claims review, support owner, monitoring path, backup/restore evidence, production safety approval, and explicit signup enablement approval.

## Hard Boundaries

This status note does not approve public launch, billing, production config changes, customer/company creation, provider setup, automated sends, customer portal access, payment collection, or production data mutation.

Do not create real production signup test companies unless that exact smoke scope is separately approved. Use local disposable smoke or an approved non-production target first.

## Completed Step 0

Production `PUBLIC_SIGNUP_ENABLED` was set to `false` through the Fly production app. This changed runtime configuration only; it did not deploy new code, change schema, send messages, create companies, create billing, or mutate customer records.

Keep guided demos and controlled pilots active while public-launch work continues.

## Evidence Bundle Before Broad Self-Serve

Run locally or in the approved launch target as appropriate:

```powershell
npm.cmd run verify:signup
npm.cmd run verify:users
npm.cmd run verify:roles
npm.cmd run verify:entitlements
npm.cmd run verify:backup
npm.cmd run verify:restore
npm.cmd run verify:claims
npm.cmd run verify:billing-readiness
npm.cmd run verify:self-serve-readiness
npm.cmd run verify:self-serve-local-smoke
npm.cmd run verify:public-launch-readiness
npm.cmd run verify:monitoring
npm.cmd run build
git diff --check
```

Latest read-only live check:

```powershell
npm.cmd run launch:self-serve-readiness -- --check-live --base-url=https://app.apexhq.online --signup-verified --users-verified --roles-verified --backup-verified --restore-verified --build-verified --claims-verified --local-self-serve-smoke-verified --support-owner="Apex HQ founder" --monitoring-destination="GitHub Issues readiness monitor" --manual-billing-boundary-acknowledged --json
```

Latest result:

- controlled self-serve pilot: GO.
- public self-serve launch: NO-GO.
- next highest leverage: legal/privacy/public-claims review.

Only after the evidence is green and the human approvals are real should the approval-recording gate be run with `--production-safety-approved`, `--public-signup-enable-approved`, `--legal-review-acknowledged`, a support owner, a monitoring destination, and the manual billing boundary acknowledgement.

## Public Launch Gate

The broader launch gate remains the final control:

```powershell
npm.cmd run launch:public-readiness -- --json
```

It should not be treated as public-launch GO until the exact required evidence flags and approval phrases are supplied from real completed work.

## Field And Company Safety

Field users must remain blocked from leads, estimates, pricing, margin, payroll costs, billing, office notes, admin setup, provider setup, AI Office controls, customer portal controls, and unrelated company data.

Self-serve launch does not change that baseline. Any signup/onboarding change must keep `npm.cmd run verify:roles`, company-scope tests, field restricted-route QA, and mobile direct-route checks green.

## Rollback / Containment

If public signup should not be live:

1. Take backup and release evidence first.
2. Disable the production signup flag through the approved production release path.
3. Confirm `/api/ready` and `/api/setup/status`.
4. Run hosted smoke and production auth smoke as approved.
5. Record the action in the living finish plan and release evidence.

If public signup stays live:

1. Keep monitoring active.
2. Watch signup, login, bootstrap, and setup-status logs.
3. Keep a named support owner on first-response duty.
4. Be ready to disable signup quickly if spam, role leakage, company-scope issues, or support overload appears.

## Next Recommended Work

Prepare the public-launch approval packet:

1. Legal/privacy/terms/public-claims review.
2. Guided pilot completion or explicit launch waiver.
3. Public launch approval phrase.
4. Approval to re-enable `PUBLIC_SIGNUP_ENABLED`.
5. Hosted self-serve smoke on an approved non-production or launch target before production signup is opened again.
