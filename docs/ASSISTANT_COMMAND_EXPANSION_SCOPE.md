# Apex HQ Assistant Command Expansion Phase 2 Scope Lock

Status: Phase 2A built and released
Owner: Apex HQ Master Coordinator
Use with: `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md`

## Purpose

Define the first safe Apex Assistant command actions before coding.

This phase exists to prevent Apex Assistant from becoming an unsafe autopilot. The assistant should help contractors move faster, but every meaningful write action must remain review-first.

## Current Evidence From Repo

| Area | Evidence | Current behavior |
| --- | --- | --- |
| Assistant shell | `src/apex-assistant-shell-utils.js` | Routes users to existing modules and says it will not create, send, approve, or edit records automatically. |
| Assistant UI | `src/App.jsx` `ApexAssistantShell` | Floating shell accepts typed prompts, shows Watchtower context, and opens modules through existing navigation. |
| Assistant tests | `src/apex-assistant-shell-utils.test.js` | Confirms hidden state, review-only label, routing behavior, and no write-action fallback. |
| Estimate AI route | `server/index.js` `/api/ai/estimates/rough-notes` | Requires auth, estimate management permission, and Premium proposal-tools package feature. |
| Lead AI route | `server/index.js` `/api/ai/leads/:id/assist` | Requires auth, lead management permission, and Premium growth-agent package feature. |
| Role protection | `shared/permissions.js` | Field users cannot view leads, customers, estimates, app health, settings, AI Office, or office/pricing workflows. |
| Package gates | `shared/packages.js`, `shared/packageEntitlements.js` | Basic/Premium/Elite features are separated; AI Office and proposal tools are Premium+ surfaces. |
| AI route tests | `server/ai-estimate-rough-notes.test.js`, `server/ai-lead-assistant.test.js` | Basic package blocks premium AI, field roles are blocked, and frontend has no OpenAI keys/direct calls. |
| Navigation gates | `src/navigation-utils.js`, `src/navigation-utils.test.js` | AI Office is hidden behind role and package checks; field roles are redirected away from office modules. |

## Non-Negotiable Rules

- No automatic customer emails.
- No automatic SMS.
- No automatic estimate send.
- No automatic proposal/GC packet send.
- No automatic pricing approval.
- No automatic job conversion without review.
- No automatic crew assignment without review.
- No material ordering.
- No hidden GPS/location behavior.
- No field access to leads, estimates, pricing, proposal packets, customer pipeline, admin settings, package controls, or AI Office.
- Every command that writes data must land on a review screen before saving.
- Every saved draft must show a success message and make the new record visible.
- Commands must reuse existing routes, handlers, permissions, packages, and data structures.

## Role / Package Policy

| Role | Assistant shell | Allowed now | Not allowed |
| --- | --- | --- | --- |
| Owner | Yes, if package allows or office shell context allows | Review queues, open workflows, draft estimate/proposal helpers, draft job handoff helpers | Hidden field tracking, auto-send, auto-approve, billing/payment actions |
| Administrator | Same as Owner except exports/owner-only controls where applicable | Same as owner where permissions allow | Owner-only data export, unsafe automation |
| Operations Manager | Office workflow routing and reviewed draft actions | Jobs, schedule, reports, uploads, proof, reviewed job handoff | Owner-only settings/export/security actions |
| Estimator | Lead/customer/estimate assistant where packages allow | Rough notes, proposal drafts, GC packet prep, lead follow-up drafts | Jobs/crew assignment unless role allows, field-only actions |
| Foreman | No AI Office command shell for office data | Field-safe future assistant only after separate Field Ops scope | Leads, estimates, pricing, packets, admin controls |
| Employee | No AI Office command shell for office data | Field-safe future assistant only after separate Field Ops scope | Leads, estimates, pricing, packets, admin controls |

Package rule:

- Basic: route-only help and normal core workflows. No AI rough notes, lead assistant, or premium command actions.
- Premium: proposal tools, GC packet prep, Watchtower, Growth Agent, and reviewed assistant command foundations.
- Elite: future growth/lead-finder/website/ad/customer-portal commands, still review-first.

Security is not a paid feature. Auth, company isolation, role permissions, demo separation, and safe sessions remain included in every package.

## Command Scope Table

| Command | Status | Role/package | Action type | Save behavior | Notes |
| --- | --- | --- | --- | --- | --- |
| "What needs attention?" | Allowed now | Office users with Command Center/Watchtower context | Read-only | No save | Already supported through Watchtower context and routing. |
| "Open reports needing review" | Allowed now | Role must view reports | Route-only | No save | Opens existing Daily Reports workflow. |
| "Open uploads/photos for this job" | Allowed now | Role must view uploads/job | Route-only | No save | Should never expose unrelated company/job records. |
| "Open this lead" | Build first slice | Owner/Admin/Ops/Estimator with leads access | Search + route | No save | Match lead by visible company-scoped data only. If ambiguous, show choices. |
| "Start estimate from this lead" | Build first slice | Premium+ and `estimates.canManage`; Estimator allowed | Draft preview | Save only after user clicks Create Draft | Should prefill from selected/confirmed lead and keep old estimate context cleared. |
| "Use these rough notes for a proposal" | Build first slice | Premium+ and `estimates.canUseAiRoughNotes` | AI draft helper | Save only after review | Reuse existing rough-notes endpoint and draft creation behavior. |
| "Prepare GC packet for this estimate" | Build first slice or next | Premium+ and `estimates.canUseGcPackets` | Route + packet checklist | No auto-send | Opens packet/preview tools for selected estimate. |
| "Summarize missing proof for this job" | Build first slice or next | Office user with job/proof permissions | Read-only summary | No save | Reuse Watchtower / notification / proof gap logic. |
| "Create job from accepted estimate" | Later | Owner/Admin/Ops with job creation and estimate manage | Draft job preview | Save only after review | Must not auto-assign crew or materials. |
| "Prepare foreman handoff" | Later | Owner/Admin/Ops; field packet safe output | Draft handoff checklist | Save only after review | No customer pricing/margin/profit. |
| "Calculate material quantities" | Later | Office roles first; field-safe calculators later | Calculation preview | Save optional calculation record | Must show assumptions and require review. No ordering. |
| "Send this estimate/proposal" | Never for automation | Office only | Manual-send handoff only | No auto-send | Assistant may open manual-send/print flow, not send. |
| "Assign crew automatically" | Never for automation | Office only | Recommendation only | No auto-assign | Crew assignment requires human confirmation. |
| "Order materials" | Never for now | None | Not allowed | No action | Material purchasing is out of scope. |
| "Publish ads/send campaign" | Never for now | None | Not allowed | No action | Requires separate marketing/ad approval system later. |

## Safest First Implementation Slice

Build:

```text
Assistant Command Expansion Phase 2A - Lead To Estimate Draft Command
```

Why this first:

- It matches the product promise: "open this lead and start an estimate/proposal from rough notes."
- It reuses existing Leads, Estimates, AI Rough Notes, role checks, and package gates.
- It is high-value for demos and paid pilots.
- It can remain review-first and draft-only.
- It avoids customer communication, crew assignment, billing, payroll, GPS, and ordering risk.

First slice behavior:

1. Owner/Admin/Ops/Estimator opens Apex Assistant.
2. User types a command like:

```text
Open ABC Builders and start an estimate with these notes: demo old slab, pour 500 SF 4-inch broom finish, exclude permits.
```

3. Assistant parses the command locally enough to identify intent and candidate lead/customer text.
4. If one visible lead/customer matches, show a review card.
5. If multiple visible records match, show choices.
6. If no lead/customer matches, offer "Start new draft from rough notes" with a clear fallback customer name.
7. User clicks a review action.
8. Existing Estimates workflow opens in clean new-draft mode.
9. Existing AI Rough Notes helper generates suggestions only if allowed by package/role.
10. User reviews and clicks Create Draft.
11. Saved Draft is selected, visible in Drafts, and success message confirms the title/customer.

Do not save anything directly from the assistant prompt.

## Phase 2A Implementation Status

Status: built, verified, committed, pushed, deployed, and health-checked.

Implemented behavior:

- Apex Assistant recognizes reviewed estimate/proposal/quote/bid/GC packet draft commands.
- The assistant blocks unsafe automation language before matching records, including send/email/text/SMS, approve/accept/sign, crew assignment, material ordering, and ad/website publishing language.
- The assistant searches only visible lead/customer context passed from the current app state.
- One match shows a review action; multiple matches show choices; no match offers a clean new-draft fallback.
- Field users and non-estimate roles are blocked from estimate draft commands.
- Basic/non-Premium packages are blocked from AI Rough Notes command actions.
- Selecting a reviewed action opens Estimates in clean new-draft mode, clears stale selected estimate context, pre-fills rough notes, sets Draft filters, opens the rough-notes tool when allowed, and shows a clear review-first message.

Verification completed:

- `npm.cmd run build`
- `npm.cmd run verify:estimates`
- `npm.cmd run verify:leads`
- `npm.cmd run verify:jobs`
- `npm.cmd run verify:roles`
- `npm.cmd run verify:packages`
- `git diff --check`
- Local browser package-gate check confirmed the demo Basic workspace blocks AI Rough Notes assistant draft commands without console/API failures.

Release status:

- Commit: `cc6e59af95b62fcf779cbfc697dbd442d5d33c59`
- Fly release: `v487`
- Image: `registry.fly.io/concrete-ops-2:deployment-01KRV59YX0GWJ7FCJ2GJXY3J1T`
- Health checks passed for `https://app.apexhq.online/api/ready` and `https://concrete-ops-2.fly.dev/api/ready`.
- Next action should be guided demo rehearsal, not another Phase 2A build loop.

## First Slice Files Likely Involved

Likely frontend:

- `src/apex-assistant-shell-utils.js`
- `src/apex-assistant-shell-utils.test.js`
- `src/App.jsx`
- `src/estimate-utils.js`
- `src/estimate-utils.test.js`
- `src/lead-utils.js`
- `src/lead-utils.test.js`
- `src/navigation-utils.js`
- `src/navigation-utils.test.js`

Likely server:

- No new backend route required for the first slice if it reuses `/api/ai/estimates/rough-notes` and existing estimate save handlers.
- If a backend route becomes necessary, it must be role/package/company-scoped and tested before release.

Likely shared:

- `shared/permissions.js`
- `shared/packageEntitlements.js`
- `shared/packages.js`
- `shared/estimateRoughNotesAi.js`

## Required Tests For First Slice

Unit tests:

- Assistant command classifies lead-to-estimate intent.
- Assistant command refuses send/approve/assign/order language.
- Assistant command returns choices when lead/customer match is ambiguous.
- Assistant command returns "new draft fallback" when no match exists.
- Field-role permissions never expose estimate/lead command actions.
- Basic package cannot use AI Rough Notes command action.
- Premium package can reach reviewed draft flow.

Server tests:

- Existing `server/ai-estimate-rough-notes.test.js` remains passing.
- Existing `server/ai-lead-assistant.test.js` remains passing.
- Existing role tests remain passing.

Browser QA:

- Owner/admin can type lead-to-estimate command.
- Existing lead context does not show stale old estimate context.
- Created draft is selected/opened and visible in Drafts.
- Field user cannot access the command or resulting estimate surfaces.
- No console/API failures.
- No horizontal overflow on the assistant shell or estimate review flow.

Suggested verification:

```text
npm.cmd run build
npm.cmd run verify:estimates
npm.cmd run verify:leads
npm.cmd run verify:roles
npm.cmd run verify:packages
git diff --check
```

## Builder Prompt For First Slice

```text
You are entering:

APEX HQ - ASSISTANT COMMAND EXPANSION PHASE 2A

Use skills:
- apex-build-router
- apex-product-system
- apex-estimate-proposal-system
- apex-qa-engineer

Repo:
C:\Users\jberl\Documents\New project

Do NOT redesign the app.
Do NOT rebuild Apex Assistant, Leads, Estimates, AI Rough Notes, Jobs, permissions, packages, or navigation.
Do NOT add automatic email/SMS sending.
Do NOT add autonomous job creation, autonomous pricing approval, automatic crew assignment, material ordering, billing, customer portal, payroll, offline mode, or AI autopilot.
Do NOT commit, push, or deploy.

Goal:
Build the first reviewed assistant command: lead/customer/rough-notes to clean estimate draft handoff.

Requirements:
- Assistant can understand commands like "open ABC Builders and start an estimate with these rough notes..."
- Assistant must search only visible company-scoped lead/customer context already available to the user.
- If one match exists, show a review action before opening Estimates.
- If multiple matches exist, show choices.
- If no match exists, offer a clean "new draft from rough notes" fallback.
- Opening Estimates must clear old selected estimate context.
- AI Rough Notes must remain Premium+/role-gated and server-side.
- Create Draft must remain review-first and user-clicked.
- Created Draft must save as Draft, open selected, appear in Drafts, and show a clear success message.
- Existing estimate editing and apply-to-existing behavior must still work.
- Field users must remain blocked from leads, estimates, pricing, AI Office, and office-only data.

Preserve:
- existing Assistant Shell Phase 1
- existing estimate save/manual-send/print/packet behavior
- existing permissions and package gates
- existing field restrictions

Verify:
- npm.cmd run build
- npm.cmd run verify:estimates
- npm.cmd run verify:leads
- npm.cmd run verify:roles
- npm.cmd run verify:packages
- git diff --check
- focused browser QA for owner assistant-to-estimate flow and field restriction

Report:
- root cause/gap addressed
- files changed
- exact behavior added
- role/package safety
- browser proof
- verification results
- safe to release yes/no
```

## What Remains Later

Later assistant phases should be separate:

- Phase 2B: missing proof summary for a job.
- Phase 2C: GC packet prep from selected estimate.
- Phase 2D: reviewed estimate-to-job draft handoff.
- Phase 2E: reviewed foreman packet/job startup checklist.
- Phase 2F: material calculation preview with assumptions.

Do not combine those into Phase 2A.
