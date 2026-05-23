# Apex HQ Phase 9 Customer Portal And Communication 100 Status

Date: 2026-05-23
Status: complete for internal customer-facing preview and communication safety gates
External portal/send status: locked unless separate customer portal and send workflow phases are explicitly approved

## Scope

Phase 9 is complete when Apex HQ can safely prepare internal owner/admin previews of customer-facing proposal, proof, progress, and change-order content while proving that external sharing, customer login, customer messages, bid submission, and portal tokens remain approval-gated.

This phase does not create customer logins, public links, tokenized access, customer approvals, email/SMS sending, bid submission, portal notifications, payment behavior, invoices, package changes, secrets, deploys, or production data changes.

## Completed Scope

Built and verified:

- Elite owner/admin internal Customer Portal manual preview exists in App Health.
- Basic/Premium workspaces see a locked manual-review explanation rather than a broken portal.
- Manual preview derives from approved customer-facing estimate/proposal content.
- Manual preview includes job progress, proof photo count, submitted report context, and reviewed change-order count when related records exist.
- Manual preview fails closed when no approved estimate is available.
- Manual preview packet excludes internal notes, margin, AI reasoning, secrets, support data, billing data, and settings data.
- Copy-only preview language makes clear that Apex HQ does not send, publish, approve, notify, or create a customer portal.
- Customer portal preview remains Elite package-gated.
- Owner/admin roles can preview manual customer portal packets.
- Operations manager, estimator, foreman, and employee roles remain blocked.
- Field users remain blocked from pricing, proposals, internal notes, settings, and portal controls.
- Agent action policy blocks customer messages, proposal sends, and bid submissions by default.
- Customer-facing estimate/print packet tests verify internal notes stay hidden from customer output.
- Customer portal and communication readiness gate now separates:
  - internal customer preview ready
  - external customer portal ready

## Verification Evidence

Commands/checks run:

- `npm.cmd run verify:customer-portal-readiness`
- `npm.cmd run verify:print-packets`
- `npm.cmd run verify:estimates`
- `npm.cmd run verify:roles`
- `npm.cmd run verify:entitlements`
- `npm.cmd run verify:claims`
- `npm.cmd run launch:customer-portal-readiness -- --portal-preview-verified --print-packets-verified --estimate-output-verified --roles-verified --entitlements-verified --agent-policy-verified --claims-verified --build-verified --tokenized-portal-plan-documented --message-review-plan-documented --approval-audit-plan-documented --json`
- `npm.cmd run build`
- `git diff --check`

## Readiness Decisions

- Internal customer preview: GO
- Internal customer preview readiness script result: `internalCustomerPreviewReady=true`
- External customer portal readiness script result: `externalCustomerPortalReady=false`
- External customer portal: NO-GO until `TOKENIZED_CUSTOMER_PORTAL_SEPARATELY_APPROVED`
- Customer send workflow: NO-GO until `CUSTOMER_SEND_WORKFLOW_SEPARATELY_APPROVED`
- Customer message sending: BLOCKED by default
- Bid submission: BLOCKED by default
- Proposal/customer send: BLOCKED by default
- Owner/admin portal preview visibility: PASS
- Field-user portal preview visibility: BLOCKED
- Customer portal package gate: Elite only

## What 100 Percent Means Here

Phase 9 is 100% for internal customer-facing preview readiness and communication safety.

It means Apex HQ can prepare a safe internal owner/admin packet showing what could become customer-facing, while preventing customer access, link sharing, self-serve approvals, automatic sends, bid submissions, and portal notifications.

It does not mean a public or tokenized customer portal is live.

## Remaining Before External Customer Portal

These are future gates, not Phase 9 blockers:

1. Design tokenized portal links with expiration, revocation, and company scope.
2. Add server-side portal access endpoints that do not expose internal data.
3. Add approval audit trail for each externally shared packet.
4. Add customer-facing route/UI only after security review.
5. Add human-reviewed customer message/send flow with audit events.
6. Add email/SMS provider only after compliance, consent, unsubscribe, and support review.
7. Add negative tests for expired tokens, wrong-company tokens, revoked links, field-role denial, and internal note leakage.

## Decision

Phase 9 is 100% for safe internal customer portal preview and communication review gates.

External customer portal access and customer sends remain locked unless separate implementation phases are approved.
