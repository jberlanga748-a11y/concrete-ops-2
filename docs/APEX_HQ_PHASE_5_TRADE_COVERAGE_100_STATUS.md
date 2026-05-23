# Apex HQ Phase 5 Trade Coverage 100 Status

Date: 2026-05-23
Status: complete for controlled pilot multi-trade coverage
Production status: locked unless a separate backup-first production release is approved

## Scope

Phase 5 is complete when a contractor can select a primary trade and immediately see Apex HQ adapt the first usable workflow:

- estimate starters
- line item starters with blank prices
- proposal section guidance
- field handoff checklist
- proof photo checklist
- change-order watchouts
- closeout checks
- agent trade context

This phase does not create pricing, margins, production automation, billing, customer sends, bid submission, or role/package changes.

## Completed Scope

Built and verified:

- Primary trade selection already exists in Settings company profile.
- Managed setup now treats primary trade as a setup readiness item.
- Settings now shows a live trade workflow preview for the selected primary trade.
- Trade setup utility derives a pilot-safe workflow packet from existing trade profiles.
- Supported controlled-pilot trade coverage includes:
  - Concrete
  - Fencing
  - Hardscape/landscape through the Landscaping profile
  - Excavation/sitework
  - Remodel/small GC through Remodeling and General Contractor profiles
  - Roofing
  - Painting
  - Plumbing
  - Electrical
  - HVAC
- Estimate starters stay blank-price and editable.
- Field handoff/proof/change-order/closeout prompts come from trade context.
- Agent guidance remains review-first and explicitly blocks pricing invention, schedule promises, bid submission, sends, and job/billing mutations.
- Unknown/custom trades fall back to General Contractor instead of breaking the app.

## Verification Evidence

Commands/checks run:

- `npm.cmd run verify:trade-setup`
- `node.exe --test --test-concurrency=1 shared/constructionTrades.test.js shared/managedCompanySetup.test.js src/estimate-template-utils.test.js src/trade-setup-utils.test.js src/field-workspace-utils.test.js src/agent-workflow-context-utils.test.js`
- `npm.cmd run verify:roles`
- `npm.cmd run verify:estimates`
- `npm.cmd run build`
- `git diff --check`
- `npm.cmd run verify:users`
- `npm.cmd run verify:signup`
- Browser QA for admin desktop `/settings`
- Browser QA for admin phone `/settings`
- Browser QA for employee phone `/settings`

Screenshot/manifests:

- `ui-audit/phase-5-trade-setup/2026-05-23T06-11-54-828Z/manifest.json`
- `ui-audit/phase-5-trade-setup/2026-05-23T06-11-54-817Z/manifest.json`
- `ui-audit/phase-5-trade-setup/2026-05-23T06-11-54-887Z/manifest.json`

## What 100 Percent Means Here

Phase 5 is 100% for the controlled-pilot target, not for every possible construction vertical.

It means Apex HQ no longer behaves like a concrete-only or fencing-only app. A real contractor can choose a supported primary trade and see starter estimates, proposal language, field proof, closeout review, and agent guidance adjust immediately.

## Remaining After Controlled Pilot 100

These are future expansion tasks, not blockers for Phase 5:

1. Add secondary trades instead of only one primary trade.
2. Add deeper template packs for specialty trades after a real contractor asks for them.
3. Add trade-specific public estimate request copy.
4. Add richer trade-specific demo data switching.
5. Add hosted smoke after the next approved demo deploy.

## Decision

Phase 5 is 100% for controlled-pilot multi-trade coverage.

Next recommended phase: Phase 6 self-serve SaaS hardening, unless the immediate priority is committing and preview/demo-smoking the accumulated Phase 2-5 work.
