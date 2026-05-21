# Apex HQ Agent Context API Plan

Date: 2026-05-21
Status: Phase 1 plan only
Production status: locked

## Objective

Design the future server-side, read-only Agent Context API for Apex HQ so the assistant can understand live workflow state without trusting client state, weakening permissions, or creating an unsafe mutation path.

This plan does not implement a new endpoint yet.

## Current Repo Findings

- `server/index.js` already protects authenticated routes with `requireAuth`, session lookup, inactive-account denial, session touch throttling, request IDs, and structured request logging.
- `GET /api/bootstrap` already builds the role-scoped app payload through `sanitizeBootstrap(state, req.auth.user)`.
- `sanitizeBootstrap` already derives current company, package entitlements, visible records, and permission blocks for leads, estimates, jobs, reports, uploads, customers, employees, safety, time, change orders, delivery tickets, pre/post-pour, tool checklists, imported drafts, audit, AI Office, Opportunity Scout, and App Health.
- Tenant/company scoping exists through `currentCompanyIdForRequestUser`, `companyScopedRecordsForUser`, `filterVisibleRecordsForUser`, and per-entity visible helpers.
- Agent UI utilities already produce read-only context from a scoped payload:
  - `src/agent-workflow-context-utils.js`
  - `src/apex-assistant-shell-utils.js`
  - `src/agent-action-proposal-utils.js`
- Existing audit write path is `POST /api/agent-action-proposals/audit`; it redacts secret-like content and denies field-only users through server-side gates.
- Existing real mutation path is intentionally narrow: estimate draft creation requires server-side estimate permissions, proposal audit context, lead scoping, and human approval.

## Proposed Endpoint

`GET /api/agent/context`

Purpose: return a compact, role-scoped, company-scoped, read-only workflow context for the authenticated user.

The endpoint should not accept a client-provided company ID, role, package ID, permission object, record list, or prompt-derived filter as an authority source.

## Required Server Contract

Response shape:

```json
{
  "mode": "read_only_agent_context",
  "generatedAt": "ISO timestamp",
  "currentCompanyId": "COMPANY-...",
  "user": {
    "id": "USR-...",
    "role": "Administrator"
  },
  "permissions": {
    "aiOffice": { "canView": true },
    "audit": { "canView": true }
  },
  "summary": {
    "visibleModuleCount": 0,
    "attentionCount": 0
  },
  "modules": [],
  "topActions": [],
  "safetyBoundary": "Read-only context. No customer contact, send, approve, convert, schedule, invoice, payment, role, package, or field update is performed.",
  "requestId": "..."
}
```

The exact `modules` and `topActions` should be produced by the same logic already tested in `src/agent-workflow-context-utils.js`, moved to a shared module only if implementation needs server import safety.

## Permission And Package Rules

Minimum access:

- Authenticated user required.
- `aiOffice.canView` or another explicit assistant-capable office permission must be true.
- Field-only users must receive `403` for office agent context.
- If a future field-safe agent context is needed, it must be a separate mode with assigned-job-only records and no leads, estimates, pricing, customers, company-wide schedule, audit, package, settings, or billing context.

Package rules:

- Use `resolvePackageEntitlements` plus `companyHasFeature`.
- Do not let the client select package behavior.
- Premium AI Office can return general operational assistant context.
- Opportunity Scout context only appears when `opportunityScout.canView` is true.
- App Health, package, release, or audit context only appears when their existing permissions are true.

Tenant/company rules:

- Use `currentCompanyIdForRequestUser(state, req.auth.user)`.
- Use existing visible-record helpers or `sanitizeBootstrap`.
- Return `404` or `403` without exposing whether another company's record exists.
- Never accept `companyId` in the request body or query as the scoping authority.

## Data Minimization

The Agent Context API should not return the full bootstrap payload.

Allowed:

- Counts
- Status labels
- Top 3 supporting record labels per module
- Record IDs only when the user could already open the route
- Module route/action labels
- Missing-info/review counts
- Package-safe feature availability booleans

Avoid:

- Full notes
- Full customer contact details
- Internal estimate pricing/margins unless the user already has estimate money access and the context explicitly needs totals
- Secrets, tokens, raw request bodies, uploaded file contents, email body text, or external portal credentials
- Full audit event detail; use audit summaries only when `audit.canView` is true

## No-Mutation Boundary

`GET /api/agent/context` must not:

- Write audit events
- Create leads, estimates, jobs, reports, uploads, tickets, support items, or change orders
- Update statuses
- Send email/text/calls
- Submit bids
- Approve proposals, estimates, change orders, reports, tickets, checklists, safety items, or invoices
- Convert leads/opportunities/estimates
- Schedule crews
- Change packages, roles, permissions, billing, or settings

Any future mutation must remain behind a separate explicit POST endpoint with human approval, idempotency, server-side authorization, and audit logging.

## Implementation Shape

Smallest safe path:

1. Move pure context derivation from `src/agent-workflow-context-utils.js` into a shared module if server import from `src` is not appropriate.
2. Add `server/agent-context.test.js` before adding the endpoint.
3. Add `GET /api/agent/context` after `GET /api/bootstrap` and before agent proposal mutation endpoints.
4. In the handler:
   - call `readDb()`
   - call `sanitizeBootstrap(state, req.auth.user)` or construct a smaller payload using the same visible helpers
   - assert office/AI Office visibility server-side
   - derive compact context
   - return payload with `requestId`
5. Keep endpoint cache-free for now; add timing logs only if latency becomes visible.

## Test Plan

Required targeted tests:

- Owner/admin/estimator with AI Office receives context.
- Employee/field user receives `403`.
- Foreman receives `403` for office context unless a field-safe mode is explicitly designed.
- Premium package without Opportunity Scout excludes Opportunity Scout records.
- Elite package with Opportunity Scout includes Opportunity Scout counts only for office roles.
- Forged `companyId` query/body does not change scope.
- Cross-company records are not returned.
- Response excludes secret-like text and raw notes.
- Endpoint does not append audit events.
- Endpoint does not mutate leads, estimates, jobs, reports, uploads, contact history, packages, roles, or settings.

Verification commands:

```powershell
node --test --test-concurrency=1 server/agent-context.test.js src/agent-workflow-context-utils.test.js
npm.cmd run verify:roles
npm.cmd run verify:leads
npm.cmd run build
git diff --check
```

If deployed to Fly demo:

```powershell
npm.cmd run verify:backup
fly machine exec 784192dc275318 -a concrete-ops-demo --timeout 120 "sh -lc 'cd /app && node server/backup-export.js'"
fly deploy --config fly.demo.toml --app concrete-ops-demo
Invoke-RestMethod https://concrete-ops-demo.fly.dev/api/ready
npm.cmd run smoke:hosted -- --base-url=https://concrete-ops-demo.fly.dev --skip-auth --json
```

## Phase 1 Safety Report

Risk level: medium-high before implementation because this endpoint would centralize agent-visible workflow context server-side.

Why it is risky:

- It touches authenticated backend reads.
- It depends on tenant/company scoping.
- It depends on package and role gates.
- It could accidentally expose office data to field users if it bypasses `sanitizeBootstrap` or existing visible helpers.

Blast radius if implemented incorrectly:

- Field users could see leads, estimates, customers, pricing, package, audit, or company-wide operations.
- Cross-company data could leak.
- Agent prompts could receive more information than the UI should expose.

Required controls before implementation:

- Server-side gates only.
- Reuse existing visible-record helpers.
- Negative tests before or with endpoint.
- Payload minimization.
- No write path.
- No production deploy without separate backup-first approval.

GO/NO-GO:

- GO for a local implementation pass after this plan.
- NO-GO for production deploy.
- NO-GO for any endpoint that accepts client-provided role/company/package state as trusted.
- NO-GO for any mutation, send, approval, conversion, scheduling, billing, package, role, or customer-contact behavior in this endpoint.

## Next Implementation Task

Implement `GET /api/agent/context` as a read-only, compact context endpoint with negative permission tests and no persistence side effects.
