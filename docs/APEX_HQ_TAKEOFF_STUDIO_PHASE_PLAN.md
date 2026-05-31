# Apex HQ Takeoff Studio Phase Plan

Date: 2026-05-31
Status: Phase 1 foundation in progress; manual editor checkpoint complete

## Goal

Build Apex Takeoff Studio as a Bluebeam-like takeoff and estimate helper inside Apex HQ, without cloning Bluebeam feature-for-feature or rebuilding Estimate Studio.

The product goal is a contractor workflow where plans, measurements, quantity backup, estimate lines, proposal proof, job handoff, change orders, and closeout evidence stay connected.

## Product Position

Apex Takeoff Studio should be:

- a plan/PDF takeoff workspace for contractors
- tightly connected to existing estimates and proposal packets
- review-first when AI helps
- office-only for estimating, pricing, assemblies, margins, and proposal backup
- field-safe only after approved job handoff, with quantities/sheets/scope but no pricing or private office data

It should not be:

- a full Bluebeam replacement claim
- an automatic bid/pricing engine
- an automated plan-reading promise
- a customer-send or approval tool
- a field-user pricing surface
- a reason to rebuild Estimates, Proposals, Jobs, Uploads, or AI Office from scratch

## Phase 1: Manual Takeoff Foundation

Goal: let an owner/admin or estimator open an estimate, attach or reference plan sheets, calibrate scale, and manually measure basic quantities.

Scope:

- Add a Takeoff Studio entry point from the existing Estimate Studio.
- Show a plan/sheet workspace with sheet list, selected sheet, and takeoff summary.
- Support scale calibration as a reviewed setting.
- Support manual measurement records for area (SF), length (LF), count (EA), and volume (CY using reviewed depth).
- Save measurement geometry/data inside the estimate workflow if no schema is approved yet.
- Add clear reviewed quantity state before a measurement can be used in estimate totals.
- Keep field users blocked from the route/surface.

Non-goals:

- no automatic PDF quantity detection
- no AI measurement application
- no provider writes
- no public/customer sharing
- no schema change unless separately approved
- no live pricing automation

Done when:

- owner/admin can create and review manual takeoff items tied to an estimate
- quantity summary is stable and test-covered
- field users cannot access takeoff/estimate data
- no pricing, margin, profit, or payroll data is exposed outside existing office boundaries

Likely validation:

- focused takeoff utility tests
- Estimate Studio tests
- `npm.cmd run verify:estimates`
- `npm.cmd run verify:roles`
- `npm.cmd run build`
- `git diff --check`
- browser QA owner/admin desktop and mobile `/estimates`
- browser QA field-role mobile direct `/estimates` restriction

## Phase 2: Estimate Integration And Assemblies

Goal: convert reviewed takeoff quantities into estimate line backup without taking over estimate pricing.

Scope:

- Map takeoff items to estimate line items.
- Add assembly templates such as driveway concrete, sidewalk, curb, slab, excavation, base rock, forms, sawcut, demo, and cleanup.
- Let assemblies calculate suggested quantities, not final pricing.
- Let owner/admin review before applying quantities to estimate lines.
- Preserve Estimate Studio as the source of truth for customer-facing price.
- Add internal takeoff backup for proposal and GC packet review.

Non-goals:

- no automatic final bid approval
- no customer sends
- no live provider integration
- no field-user estimate access

Done when:

- reviewed takeoff quantities can create or update estimate line quantity fields
- proposal packets can include selected customer-safe takeoff proof
- internal backup can show quantity assumptions without exposing margin to field users

## Phase 3: AI Takeoff Assistant

Goal: add AI as a review-first assistant over takeoff notes, plan text, sheets, and estimating context.

AI may:

- suggest sheet names and plan organization
- summarize plan notes and scope hints
- draft RFIs, assumptions, exclusions, and scope notes
- suggest likely takeoff categories
- flag missing calibration, missing depth, suspicious units, or unreviewed measurements
- explain how reviewed quantities roll into estimate backup
- prepare a review packet for owner/admin

AI must not:

- auto-measure plans as final truth
- approve estimate pricing
- send proposals
- submit bids
- change customer-facing scope or price without review
- overwrite reviewed measurements silently
- expose estimates, pricing, margins, or office notes to field users

Done when:

- AI suggestions appear in a queue
- every AI suggestion has review/apply/reject state
- no risky external action is executed by AI
- role/package tests prove field users remain blocked

## Phase 4: Proof, Revisions, And Field Handoff

Goal: make takeoff proof useful after the estimate is won.

Scope:

- Version takeoff records by plan revision.
- Mark superseded sheets and revised quantities.
- Add takeoff snapshots or references to proposal proof, internal review, and field handoff.
- Create a field-safe handoff view with scope, quantities, sheet references, access notes, and change-order warnings.
- Keep pricing, margin, profit, payroll, billing, and office-only notes hidden from field users.

Done when:

- estimate-to-job handoff can carry approved quantity context
- foremen can see only approved field-safe quantity/sheet context
- office can identify changed quantities when plan revisions arrive

## Phase 5: Advanced Takeoff Power

Goal: add heavier Bluebeam-like workflow only after the foundation is proven.

Potential scope:

- PDF page thumbnails and sheet set tools
- custom tool sets
- measurement legends
- CSV import/export
- plan overlay or revision comparison
- keyboard shortcuts
- markup comments
- multi-user review status
- takeoff package export for proposal backup

Non-goals until separately approved:

- automated full blueprint takeoff
- guaranteed quantity detection
- public customer plan approval
- e-sign
- provider writes
- live purchasing
- accounting or payroll automation

## Data Model Direction

Prefer structured takeoff records:

```json
{
  "id": "takeoff-item-id",
  "estimateId": "estimate-id",
  "sheetId": "sheet-id",
  "sheetName": "A1.1 Site Plan",
  "revision": "Rev 1",
  "measurementType": "area",
  "unit": "SF",
  "points": [],
  "scale": {
    "calibrated": true,
    "pixels": 100,
    "realWorldLength": 10,
    "realWorldUnit": "FT"
  },
  "quantity": 1250,
  "depth": null,
  "reviewStatus": "needs_review",
  "linkedEstimateItemId": null,
  "customerVisible": false,
  "createdBy": "user-id",
  "reviewedBy": null,
  "createdAt": "2026-05-31T00:00:00.000Z",
  "updatedAt": "2026-05-31T00:00:00.000Z"
}
```

If persistent takeoff records require schema changes, stop and request explicit schema approval before implementation.

## Permission Rules

Owner/admin/estimator:

- can create and review takeoffs
- can connect takeoffs to estimate lines
- can see estimate pricing according to existing Estimate Studio permissions
- can select customer-safe takeoff proof for proposal packets

Foreman/employee:

- cannot access Estimate Studio or Takeoff Studio
- cannot see pricing, margin, profit, payroll, billing, office notes, or AI Office controls
- may later see only approved job handoff quantities and sheet references

AI:

- review-first only
- no auto-send
- no auto-approve
- no automatic customer-facing commitments
- no hidden data exposure

## Current Implementation Order

Start with Phase 1 only:

1. Audit current Estimate Studio, PDF/print packet, uploads, calculator, and estimate backup files. Complete.
2. Create a small takeoff utility with measurement normalization and quantity calculations. Complete.
3. Add focused tests for area, length, count, volume, review state, and field blocking assumptions. Complete.
4. Add an owner/admin Takeoff Studio panel inside the existing Estimate Studio. Complete for manual sheet/items, calibration inputs, point text, reviewed quantity rows, and office backup sync.
5. Validate with estimates, roles, build, and browser QA. Complete for this checkpoint.

Do not begin Phase 2 until Phase 1 is validated and frozen.

## Phase 1 Checkpoint: Manual Editor

Completed on 2026-05-31:

- Generic Takeoff Studio utility calculates area, length, count, and volume quantities from manual point geometry and reviewed scale inputs.
- Estimate backup now stores structured `takeoffStudio` data through the existing internal notes backup block, avoiding schema changes.
- Estimate Studio Takeoff mode now includes a manual Apex Takeoff Studio editor alongside the existing fence-specific takeoff tool.
- The manual editor supports plan sheets, revisions, source files, measurement rows, point text, scale calibration, depth for CY, review state, estimator notes, and syncing reviewed rows into office-only takeoff backup.
- Field users remain blocked from Estimate Studio and Takeoff Studio.

Remaining Phase 1 work before freeze:

- Visual polish pass after real use if the manual editor feels too dense on owner mobile.
- Decide whether Phase 1 needs a simple PDF/page preview placeholder or whether that belongs in Phase 5 advanced PDF tooling.
- Add proposal/print proof selection only in Phase 2, after estimate-line integration is designed.
