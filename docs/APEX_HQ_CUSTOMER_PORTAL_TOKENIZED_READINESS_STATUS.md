# Apex HQ Customer Portal Tokenized Readiness Status

Status: complete for Build 7A local readiness-contract scope, Build 7B locked access-record scope, Build 7C locked lifecycle scope, Build 7D locked public-route contract scope, Build 7E internal access-record packet scope, and Build 7F locked share approval queue scope.

## What Is Now Complete

- Customer portal preview now has a tokenized-access readiness contract.
- The contract records company scope, customer scope, approved proposal scope, allowed customer-facing sections, expiration, revocation, and audit requirements.
- Expiration fails closed unless it is valid, future-dated, and no more than 14 days.
- Owner/admin actor checks are part of the contract.
- The approval packet explicitly shows that no customer login, public share link, raw token, customer approval, message send, invoice, payment, deployment, secret, config change, or production data change was created.
- The customer portal readiness gate now verifies the tokenized-access contract, not only documentation flags.
- The server now exposes authenticated, Elite-only, owner/admin-only customer portal access-record preparation endpoints.
- Access records are company scoped, audit backed, non-redeemable, and locked as internal readiness evidence.
- Access records store only a deterministic `sha256:` token hash reference. They do not generate, store, print, or return raw token material.
- Unsafe external fields such as public URLs, share links, customer logins, sends, invoices, and payment links are rejected.
- Access records now have a locked lifecycle: revoke appends an internal audit event, expired status is derived at read time, duplicate revokes are blocked, and tenant/field-role denial is covered by tests.
- The public route shape `/portal/:accessId` now exists only as a locked contract response. It returns no customer, estimate, token hash, internal note, approval, message, invoice, or payment data.
- Public route contract tests cover missing, malformed, wrong-company, expired, and revoked denial cases without creating redeemable tokens.
- Owner/admin users can generate an internal customer-facing review packet from an active locked access record. It is authenticated, Elite-only, owner/admin-only, company scoped, and blocked for expired or revoked records.
- Access-record packet tests verify field-role denial, wrong-company denial, package denial, expired/revoked denial, and redaction of token hash references, audit internals, internal notes, and raw-token/public-url fields.
- Owner/admin users can request a locked internal share approval queue item from an active locked access record.
- Share approval queue items are authenticated, Elite-only, owner/admin-only, company scoped, audit backed, packet-ready, and blocked for unsafe external payload fields, field users, wrong-company users, expired records, and revoked records.
- Share approval queue responses keep external sharing disabled and explicitly record that no customer login, public link, raw token, customer session, message, invoice, or payment action was created.

## Safety Boundary

This is a local readiness contract only.

It does not:

- create customer logins
- create public share links
- generate, store, or print raw portal tokens
- expose customer-facing routes
- serve customer-facing data from `/portal/:accessId`
- accept customer approvals, signatures, comments, or portal actions
- send email, SMS, bids, proposals, invoices, or notifications
- collect payment
- mutate production data
- change secrets, provider config, Fly config, Supabase config, or deployment state

Builds 7B, 7C, and 7D also do not create a live public portal, redeemable token table, customer session, customer action endpoint, customer login flow, message send flow, invoice flow, or payment flow.

Build 7E also does not expose the packet to customers, publish a portal page, create a customer session, redeem a token, accept approvals/comments/signatures, send messages, create invoices, or collect payment.

Build 7F also does not expose an approval queue to customers, publish a link, create a customer session, redeem a token, send messages, create invoices, collect payment, or approve external sharing by itself.

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
