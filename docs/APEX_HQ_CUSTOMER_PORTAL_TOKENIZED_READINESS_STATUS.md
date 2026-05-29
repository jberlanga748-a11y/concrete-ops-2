# Apex HQ Customer Portal Tokenized Readiness Status

Status: complete for Build 7A local readiness-contract scope, Build 7B locked access-record scope, Build 7C locked lifecycle scope, Build 7D locked public-route contract scope, Build 7E internal access-record packet scope, Build 7F locked share approval queue scope, Build 7G locked share approval review scope, Build 7H locked external-gate preflight scope, and Build 7I locked external execution contract scope.

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
- Owner/admin users can now record a locked internal review decision for a queued share approval.
- Review decisions can mark the packet ready for a future separately approved external gate, request changes, or reject the share review, while keeping external sharing, public routes, token redemption, customer actions, sends, invoices, and payments disabled.
- Share approval review tests cover duplicate-review denial, unsafe payload denial, field-role denial, wrong-company denial, redacted review notes, and no token/public-link leakage.
- Owner/admin users can run a read-only external-gate preflight against a share approval to see whether internal prerequisites and the exact separate approval phrase are present.
- The preflight always keeps external implementation locked in this build and reports that no customer login, public link, raw token, customer session, customer action, message, invoice, or payment action exists.
- External-gate preflight tests cover ready review, missing review, expired access records, unsafe payload denial, field-role denial, wrong-company denial, no audit mutation, and no token/public-link leakage.
- Owner/admin users can prepare a locked external execution contract from a ready share approval and active access record after supplying the exact separate approval phrase.
- Execution contracts record Agent OS `customer_portal_action` mapping, per-company opt-in evidence, future adapter blockers, customer-visible field scope, idempotency behavior, audit event, and rollback behavior while keeping execution disabled.
- A hard-deny execution endpoint now returns locked status for attempted customer portal execution so prepare/review/preflight/contract evidence cannot be mistaken for live customer access.
- External execution contract tests cover idempotent replay, redaction, Agent OS gate mapping, no token/public-link leakage, missing preflight denial, locked execution denial, unsafe payload denial, field-role denial, and wrong-company denial.

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

Build 7G also does not publish approval decisions to customers, create external access, generate tokens, create public routes, accept customer actions, send messages, create invoices, collect payment, or satisfy the separate external customer portal approval gate by itself.

Build 7H also does not create external portal implementation, publish links, generate tokens, create public routes, accept customer actions, send messages, create invoices, collect payment, mutate production data, or satisfy the separate external customer portal approval gate by itself.

Build 7I also does not create external portal implementation, publish links, generate tokens, create customer sessions, accept customer approvals/comments/signatures, send messages, create invoices, collect payment, mutate production data, or execute any customer portal write. It only records the locked execution contract, idempotency, audit, rollback, Agent OS mapping, and hard-deny execution boundary.

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
