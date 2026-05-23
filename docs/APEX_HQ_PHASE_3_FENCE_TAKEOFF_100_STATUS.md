# Apex HQ Phase 3 Fence Takeoff 100 Status

Date: 2026-05-23
Status: complete for controlled pilot
Production status: locked unless a separate backup-first production release is approved

## Scope

Phase 3 is complete only when owner/admin/estimator users can open Estimate Studio, use Satellite Fence Takeoff Lite to create estimate-grade linear-foot quantities, and carry those quantities into proposal and field handoff context while field users remain blocked from estimate/pricing/internal takeoff tools.

## Current Result

100% for the controlled-pilot Satellite Fence Takeoff Lite definition.

Verified capabilities:

- Mapbox satellite canvas loads in local/demo with the configured public client token.
- Estimator can draw and save a map-measured fence segment.
- Turf linear feet generate from drawn GeoJSON line segments.
- Estimator can label segment type, height, material, gates, and notes.
- Quantity confidence shows whether takeoff data is missing, needs review, or ready for estimate.
- Estimate-grade disclaimer is visible and makes no survey-grade claim.
- Manual adjustment notes are captured for estimator review.
- Apply Quantities adds draft estimate line items and takeoff backup rows.
- Proposal-safe takeoff summary includes total LF, gate count, segment count, assemblies, estimate-grade disclaimer, and adjustment notes.
- Field handoff includes fence verification tasks, material/gate review, and proof photo requirements.
- No-token fallback keeps manual segment entry usable and explains required setup.
- Employee/field phone route remains blocked from Estimate Studio.

## Verification Evidence

Commands/checks run:

- `node.exe --test --test-concurrency=1 src/fence-takeoff-utils.test.js src/estimate-backup-utils.test.js`
- `npm.cmd run verify:estimates`
- `npm.cmd run verify:roles`
- `npm.cmd run build`
- `git diff --check`
- Admin desktop/tablet visual audit for `/estimates`
- Employee phone visual audit for `/estimates`
- Custom browser interaction smoke for `/estimates` with Mapbox canvas and drawn segment

Screenshot/manifests:

- `ui-audit/phase-3-fence-takeoff/2026-05-23T05-40-25-763Z/manifest.json`
- `ui-audit/phase-3-fence-takeoff/2026-05-23T05-40-33-597Z/manifest.json`
- `ui-audit/phase-3-fence-takeoff/interaction-smoke/admin-desktop-estimates-fence-map-draw-smoke.png`

## Remaining Risks

- Production and hosted demo use require the normal backup-first release path and approved environment configuration.
- The Mapbox token must remain a public client token pattern and must not be committed.
- Measurements are estimate-grade only. Property lines, utilities, slope, gates, and final material quantities still require field verification.
- Parcel overlays, easements, utility locates, image generation, and survey-grade workflows are intentionally not part of Lite.

## Decision

Phase 3 is GO for controlled pilot use.

Do not production deploy without a separate backup-first approval.
