# Apex / Apex HQ Separation Boundary

Date: 2026-06-09

## Decision

Apex is John's private local PC intelligence and now lives in its own local repo:

`C:\Users\jberl\Documents\Apex`

Apex HQ remains the contractor SaaS/product workspace. Apex HQ keeps customer-facing AI features such as AI Office, lead help, estimate/proposal support, job summaries, document/review helpers, and role/company-scoped workflow intelligence.

## Apex HQ Must Not Own

- John's private Apex identity or memory
- local PC/device control
- local voice runtime
- local model residency controls
- Home Assistant/device execution
- private operator approvals, tasks, reminders, or agent orchestration
- `/api/apex-os/*` as active private runtime routes
- `/apex` or `/apex-avatar-lab` as active product routes

## Current Boundary

- `/apex`, `/apex-control-room`, and `/apex-avatar-lab` fall back to the Apex HQ dashboard route.
- `apexControlRoom` and `apexAvatarLab` are no longer granted by Apex HQ permissions.
- Apex HQ navigation no longer lists private Apex surfaces.
- `/api/apex-os/*` returns HTTP 410 with the standalone Apex repo path.
- Apex HQ product AI remains available through existing product routes and package/role gates.

## Do Not Touch Yet

The old private Apex source files remain in this repo only as inert legacy code until a later cleanup proves no imports, docs, or historical tests still depend on them. The new Apex repo already has a local archive copy under:

`C:\Users\jberl\Documents\Apex\legacy\apex-hq-private-source`

Do not delete broad legacy files while other Builder work is active.

## Next Cleanup

After Apex HQ and family-care Builder work are cleanly checkpointed, remove or quarantine the legacy private Apex source files from Apex HQ in a dedicated commit:

- `src/apex-control-room-*`
- `src/apex-avatar-lab-*`
- `server/apex*` private local runtime/provider files
- `shared/apexOs*` private operator helpers
- old Apex local launcher scripts

That cleanup must not remove Apex HQ product AI helpers or customer-facing agent workflows.
