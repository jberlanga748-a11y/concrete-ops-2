# Apex HQ Customer Portal Tokenized Readiness Status

Status: complete for Build 7A local readiness-contract scope.

## What Is Now Complete

- Customer portal preview now has a tokenized-access readiness contract.
- The contract records company scope, customer scope, approved proposal scope, allowed customer-facing sections, expiration, revocation, and audit requirements.
- Expiration fails closed unless it is valid, future-dated, and no more than 14 days.
- Owner/admin actor checks are part of the contract.
- The approval packet explicitly shows that no customer login, public share link, raw token, customer approval, message send, invoice, payment, deployment, secret, config change, or production data change was created.
- The customer portal readiness gate now verifies the tokenized-access contract, not only documentation flags.

## Safety Boundary

This is a local readiness contract only.

It does not:

- create customer logins
- create public share links
- generate, store, or print raw portal tokens
- expose customer-facing routes
- accept customer approvals, signatures, comments, or portal actions
- send email, SMS, bids, proposals, invoices, or notifications
- collect payment
- mutate production data
- change secrets, provider config, Fly config, Supabase config, or deployment state

## Verification

Run locally from the repo root:

```powershell
npm.cmd run verify:customer-portal-readiness
npm.cmd run verify:roles
npm.cmd run verify:entitlements
npm.cmd run verify:claims
npm.cmd run build
git diff --check
```
