# Apex Agent Merge Readiness Review

Date: 2026-05-27
Status: local merge-readiness aid only

This review separates the current dirty worktree into review lanes so Agent OS work can be finished without staging, committing, deploying, changing secrets, changing Fly/Supabase config, or touching production data.

## Executive Recommendation

Conditional go for an Agent-only review branch after the Agent OS endpoint is released to the target host and the hosted auth Agent smoke is rerun. The local Agent OS implementation, docs, and focused tests are ready for review, but the repository is still a broad dirty tree with route decomposition and Estimate/Proposal Professional Packet work mixed in. Do not use `git add .`.

## Findings

### P1: Production auth Agent smoke reaches auth but the Agent OS endpoint is not deployed

- Affected workflow: hosted `/ai-office` and Agent OS API access smoke.
- Evidence: `https://concrete-ops-demo.fly.dev` rejected the Ace smoke account with HTTP 401 because the account is not on demo. The approved production smoke run against `https://app.apexhq.online` progressed to the Agent flow and failed at `GET /api/agent/os` with HTTP 404.
- Impact: the credential is no longer the active blocker for the Ace production smoke account; the target host does not appear to include the new Agent OS endpoint yet.
- Required command after the Agent OS endpoint is deployed to the target host:

```powershell
npm.cmd run smoke:hosted-agent -- --base-url=https://app.apexhq.online --allow-auth --allow-production-auth --json --roles=admin --admin-email=<approved-smoke-admin-email>
```

Production targets still require explicit approval and `--allow-production-auth`. Do not print or commit the password.

### P2: Dirty tree contains three separate review lanes

- Affected workflow: review, staging, commit, and PR creation.
- Evidence: `git status --short` shows Agent OS files, route decomposition files, and Estimate/Proposal Professional Packet files dirty at the same time.
- Impact: a broad stage or review can accidentally mix customer-facing packet design work with Agent OS infrastructure.
- Required control: stage only explicit path groups listed below.

## Review Lanes

### Agent OS / Apex Agent Lane

Include only Agent-owned files and Agent-adjacent script/package changes:

- `docs/APEX_AGENT_*`
- `docs/APEX_HQ_PHASE_4_AGENT_100_STATUS.md`
- `shared/agent*`
- `shared/apexAgentAutomationPolicy.js`
- `shared/contractorAdvisorAi.js`
- Agent routes inside `server/index.js`
- `server/agent-*.test.js`
- `src/apex-assistant-*`
- `src/ai-office-utils.*`
- `src/agent-action-proposal-utils.*`
- `src/agent-os-ui-utils.*`
- `src/apex-agent-customer-conversation-utils.*`
- `src/copilot-page-components.*`
- Agent-related `src/api.js` changes
- AI Office / Agent package access changes in `src/navigation-utils.*`
- `scripts/hosted-smoke.mjs`
- `scripts/hosted-smoke-summary.test.mjs`
- The `smoke:hosted-agent` script line in `package.json`

Agent diff review result:

- External actions remain locked. No email/SMS send, payment collection, customer portal action, scheduling, bid submission, integration write, or production data mutation was enabled.
- `POST /api/agent/os/advisor-tasks` is role/package gated, supports only mapped internal draft/prep recommendation ids, requires a visible company-scoped target, and queues existing Agent OS task/run records.
- The hosted `agent` smoke flow is GET-only and checks admin access plus employee denial.
- Successful internal execution still creates review-first proposal packets; normal domain records are not mutated by Agent OS execution.
- `server/index.js` is large because it contains multiple Agent slices in the dirty tree. Review the Agent route sections rather than treating the full file as one small patch.

### Route Decomposition Lane

Keep route extraction work in a separate branch/PR. This includes:

- `src/App.jsx`
- extracted route modules such as `src/*-route-components.jsx`, `src/*-page-components.jsx`, and `src/workspace-*`
- route import guard tests and shell tests that are not Agent-specific
- `src/index.css` if the change is route/layout support rather than Agent UI

These files may be needed for the current local app shape, but they should not be staged into the Agent OS review unless a line-level diff is explicitly Agent-owned.

### Estimate/Proposal Professional Packet Lane

Keep packet design work out of the Agent branch unless explicitly approved:

- `server/estimate-pdf.js`
- `server/estimate-pdf.test.js`
- `shared/estimatePrint.js`
- `shared/estimatePrint.test.js`
- `shared/estimatePacketPresets.js`
- `src/print-packets.js`
- `src/print-packets.test.js`
- `src/estimates-route-components.jsx`
- `src/estimates-page-components-import.test.js`
- `docs/apex-hq-estimate-branding-polish-plan.md`

Agent work may read estimates as context, but should not refactor packet rendering, PDF generation, estimate print contracts, or professional packet design.

## Safe Commit / PR Strategy

1. Create an Agent OS branch and stage only explicit Agent pathspecs. Avoid `git add .`.
2. Before committing, run:

```powershell
git status --short
git diff --stat
node --test --test-concurrency=1 shared/agentOperatingSystem.test.js server/agent-os.test.js scripts/hosted-smoke-summary.test.mjs
npm.cmd run verify:agent-learning
npm.cmd run verify:estimates
npm.cmd run verify:leads
npm.cmd run verify:roles
npm.cmd run verify:auth
npm.cmd run verify:server
npm.cmd run build
git diff --check
```

3. Run hosted auth smoke only after the Agent OS endpoint is deployed to the target host and the approved smoke password is supplied through the hidden prompt or `APEX_SMOKE_PASSWORD`:

```powershell
npm.cmd run smoke:hosted-agent -- --base-url=https://app.apexhq.online --allow-auth --allow-production-auth --json --roles=admin --admin-email=<approved-smoke-admin-email>
```

4. Open one Agent OS PR that calls out the hosted-auth-smoke result or the exact endpoint-deployment blocker.
5. Keep route decomposition and packet design as separate PRs with their own focused tests.

## What Not To Touch

- Do not commit, push, deploy, stage, or alter production data from this review pass.
- Do not alter secrets, Fly config, Supabase config, package gates, or role gates outside the already-reviewed Agent boundary.
- Do not unlock external/customer-contact actions without an explicit approval packet and exact approved boundary.
- Do not mix Estimate/Proposal Professional Packet files into Agent OS staging.

## Remaining Risk

The only Agent-specific release-readiness gap from this pass is that production currently returns HTTP 404 for `GET /api/agent/os`, which indicates the target host has not yet received the Agent OS endpoint. The larger operational risk is review hygiene: the dirty worktree still contains unrelated route and packet-design work, so staging must be explicit and lane-based.
