# Apex HQ Public Self-Serve Current Readiness

Date: 2026-05-31
Status: launch-readiness mismatch found; do not treat Apex HQ as broad public self-serve complete

## Current Verdict

Apex HQ is still strongest as a guided demo and controlled pilot platform. The app has tested self-serve foundations, but the live production target currently reports public signup enabled while the self-serve and public-launch gates are still NO-GO without fresh evidence and human approvals.

Live read-only evidence from `npm.cmd run launch:self-serve-readiness -- --check-live --base-url=https://app.apexhq.online --json`:

- `/api/ready`: PASS, database ready.
- `/api/setup/status`: PASS.
- `publicSignupEnabled`: `true`.
- `demoMode`: `false`.
- `needsSetup`: `false`.
- self-serve readiness: NO-GO.
- public self-serve launch: NO-GO.

Treat this as a launch-readiness mismatch until one of these happens:

1. Public signup is disabled through the backup-first production release checklist.
2. Public signup remains enabled only after the full self-serve/public-launch evidence bundle, legal/privacy/public-claims review, support owner, monitoring path, backup/restore evidence, production safety approval, and explicit signup enablement approval are recorded.

## Hard Boundaries

This status note does not approve public launch, billing, production config changes, customer/company creation, provider setup, automated sends, customer portal access, payment collection, or production data mutation.

Do not create real production signup test companies unless that exact smoke scope is separately approved. Use local disposable smoke or an approved non-production target first.

## Immediate Step 0

Pick one containment direction before more public traffic is invited.

Recommended if Apex HQ is not intentionally opening broad self-serve today:

- Disable production `PUBLIC_SIGNUP_ENABLED` through the backup-first release checklist.
- Rerun `/api/setup/status` and the self-serve readiness gate to confirm the live target is locked.
- Keep guided demos and controlled pilots active.

Recommended if Apex HQ is intentionally opening self-serve now:

- Keep signup enabled only after completing the full evidence bundle below.
- Name the first-response support owner and alert destination.
- Record legal/privacy/public-claims review.
- Record explicit public signup enablement approval.
- Keep billing/payment/manual package boundaries visible.

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

Then run the read-only live check:

```powershell
npm.cmd run launch:self-serve-readiness -- --check-live --base-url=https://app.apexhq.online --json
```

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

Run the evidence bundle and decide whether the current production signup switch should be disabled or formally approved as the start of controlled public self-serve.
