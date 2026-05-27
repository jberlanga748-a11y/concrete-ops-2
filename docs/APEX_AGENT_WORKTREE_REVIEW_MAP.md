# Apex Agent Worktree Review Map

Status: local review aid for the current dirty working tree.

Purpose: keep Agent OS review separate from route decomposition and Estimate/Proposal Professional Packet work. This is not a commit plan and does not authorize deploys, production data access, config changes, or external Agent gates.

Latest merge-readiness review: `docs/APEX_AGENT_MERGE_READINESS_REVIEW.md`.

## Agent OS / Apex Agent Review Lane

Files that belong in the Agent lane:

- `shared/agent*`
- `shared/apexAgentAutomationPolicy.js`
- `shared/contractorAdvisorAi.js`
- Agent routes and route helpers inside `server/index.js`
- `server/agent-*.test.js`
- `src/apex-assistant-*`
- `src/ai-office-utils.js`
- `src/agent-action-proposal-utils.js`
- `src/agent-os-ui-utils.js`
- `src/copilot-page-components.jsx`
- `src/navigation-utils.js` when the change is AI Office / Agent OS package access
- Agent docs under `docs/APEX_AGENT_*`
- Hosted Agent smoke scripts/tests under `scripts/hosted-smoke*` when the change is Agent OS route/API verification only

Current Agent OS story:

- Agent OS v1 has an action registry, policy model, audit-backed queue/run records, status transitions, retries, dead-letter/cancel shape, learning signals, and locked external gates.
- AI Office now exposes owner/admin internal-only queue and run controls for safe draft/prep work.
- Run detail visibility shows target, output, blocked actions, attempts, and recent logs.
- Apex Agent recommendations can be queued as safe internal Agent OS tasks when the recommendation maps to a visible target.
- Selected contractor advisor recommendations can now be queued server-side into safe internal Agent OS tasks through `POST /api/agent/os/advisor-tasks`; the endpoint requires AI Office, role/package authorization, a supported recommendation id, and a visible company-scoped target.
- Premium AI Office access is no longer tied to Elite Opportunity Scout access.
- Hosted Agent smoke coverage now includes `/ai-office` route checks and an optional GET-only `agent` flow for admin Agent OS access plus employee denial. Auth smoke requires explicit `--allow-auth`; production auth still requires `--allow-production-auth`.

## Route Decomposition Lane

Files such as `src/App.jsx`, route wrappers, route modules, workspace handlers, and route import guard tests include broad prior decomposition work. Do not review those changes as Agent OS-only unless the diff line directly wires Agent handlers or AI Office props.

## Estimate/Proposal Packet Lane

These files may be owned by a separate Estimate/Proposal Professional Packet chat and should not be refactored by Agent work:

- `server/estimate-pdf.js`
- `shared/estimatePrint.js`
- `shared/estimatePacketPresets.js`
- `src/print-packets.js`
- `src/estimates-page-components.jsx`
- `src/estimates-route-components.jsx`
- estimate/proposal tests

Agent work may read estimates as context, but should not change packet rendering, PDF generation, estimate print contracts, or professional packet design unless explicitly approved.

## External Gate Decision

Current decision: all external gates stay locked.

The only prepared boundary packet is `docs/APEX_AGENT_EMAIL_SEND_GATE_DECISION_PACKET.md`, and it is a proposal for future approval only. It does not unlock email sending or any customer-contact, payment, scheduling, bid, portal, integration, production config, secret, or production data action.

## Current Review Grouping

Review Agent OS v1 as these local groups:

1. Agent foundation and server routes: `shared/agentOperatingSystem.js`, `server/index.js`, `server/agent-os.test.js`, `shared/agentOperatingSystem.test.js`.
2. Agent UI and access: `src/copilot-page-components.jsx`, `src/agent-os-ui-utils.js`, `src/navigation-utils.js`, and their focused tests.
3. Contractor advisor: `shared/contractorAdvisorAi.js`, `server/agent-conversations.test.js`, and the new advisor-to-Agent OS queue endpoint.
4. Smoke/docs: `scripts/hosted-smoke.mjs`, `scripts/hosted-smoke-summary.test.mjs`, and `docs/APEX_AGENT_*`.

Do not include Estimate/Proposal Professional Packet files in this Agent review group unless the user explicitly approves cross-lane work.
