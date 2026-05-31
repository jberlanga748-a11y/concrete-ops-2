# Apex HQ Takeoff Studio Phase Plan

Date: 2026-05-31
Status: Phase 1-20 takeoff plan implemented locally; provider-backed OCR/vision, telemetry, and deeper trade libraries remain deferred approved upgrades

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

Phase 1 foundation is validated and frozen enough to proceed into Phase 2:

1. Audit current Estimate Studio, PDF/print packet, uploads, calculator, and estimate backup files. Complete.
2. Create a small takeoff utility with measurement normalization and quantity calculations. Complete.
3. Add focused tests for area, length, count, volume, review state, and field blocking assumptions. Complete.
4. Add an owner/admin Takeoff Studio panel inside the existing Estimate Studio. Complete for manual sheet/items, calibration inputs, point text, reviewed quantity rows, and office backup sync.
5. Validate with estimates, roles, build, and browser QA. Complete for this checkpoint.

Phase 2 first checkpoint:

1. Add reviewed takeoff-to-estimate draft line helpers with blank pricing. Complete.
2. Add safe assembly options for direct quantity, concrete flatwork, base rock, demo/haul-off, and forming/sawcut. Complete.
3. Add owner/admin UI controls to choose an assembly and apply reviewed measurements into editable estimate line items. Complete.
4. Keep generated lines review-first and replace prior generated takeoff lines instead of duplicating them. Complete.
5. Add customer-safe proposal proof selection from reviewed takeoff rows. Complete.
6. Add GC/internal packet summary helpers for plan-sheet quantity assumptions. Complete.
7. Validate focused tests, estimates, roles, build, diff, and browser QA before freezing this checkpoint.

Phase 3 first checkpoint:

1. Add a review-first Takeoff Assistant queue over current takeoff sheets/items. Complete.
2. Flag missing calibration, missing depth, unreviewed quantities, proposal-proof decisions, direct-area assembly review, and packet/line-prep opportunities. Complete.
3. Allow safe local apply/dismiss for review-state and proof-state suggestions while keeping global line/GC actions review-first. Complete.
4. Keep assistant output deterministic/local for this checkpoint; no external AI calls, sends, pricing approvals, bid submissions, provider writes, or customer actions. Complete.
5. Validate focused tests, estimates, roles, build, diff, and browser QA before freezing this checkpoint. Complete.

Phase 4 first checkpoint:

1. Add active/superseded sheet revision state inside the existing structured takeoff backup. Complete.
2. Add item revision state and explicit field-safe handoff approval separate from customer proposal proof. Complete.
3. Build revision register, proof snapshot, and field handoff helpers that exclude pricing, margins, payroll, billing, office notes, and office-only takeoff backup. Complete.
4. Extend the foreman handoff packet to prefer explicitly approved Takeoff Studio field rows and filter office-only Takeoff Studio rows. Complete.
5. Validate focused tests, estimates, roles, build, diff, and browser QA before freezing this checkpoint. Complete.

Phase 5 first checkpoint:

1. Add reviewed tool sets for concrete flatwork, sitework/demo, fence/linear, and general takeoff. Complete.
2. Add measurement legend and revision comparison summaries over reviewed takeoff rows. Complete.
3. Add CSV import/export for quantity rows without pricing or provider writes. Complete.
4. Add reviewed markup comments with office/proposal/field visibility boundaries. Complete.
5. Add a takeoff package export for proposal backup and office review that excludes pricing, margin, payroll, billing, provider writes, bid submission, customer approval, and automatic sends. Complete.
6. Validate focused tests, estimates, roles, build, diff, and browser QA before freezing this checkpoint. Complete.

Phase 6/7 first checkpoint:

1. Add a plan sheet workspace with selected-sheet state, thumbnails, source metadata, safe preview URL handling, and a visual measurement overlay fallback. Complete.
2. Add per-sheet page metadata for page number, canvas size, rotation, source file, source preview URL, active/superseded state, and preview kind. Complete.
3. Add per-sheet scale calibration and a review-first helper to apply sheet calibration to drawing-based measurements without finalizing quantities or pricing. Complete.
4. Add owner/admin Estimate Studio controls for sheet selection, preview, calibration review, and applying sheet scale to measurements. Complete.
5. Keep this checkpoint local and estimate-backup based; no schema, file storage, provider OCR/PDF parsing, automatic measurement, bid submission, customer send, field access, or pricing automation. Complete.
6. Validate focused tests, estimates, roles, build, diff, and browser QA before freezing this checkpoint.

Phase 8 first checkpoint:

1. Add click-to-draw measurement tools over the plan workspace for area, length, count, and volume. Complete.
2. Add draft drawing point state, undo point, clear, and finish measurement controls. Complete.
3. Save finished drawing output as normal Takeoff Studio measurement rows with selected sheet, revision, points, unit, sheet scale when available, and needs-review status. Complete.
4. Keep drawn measurements office-only by default and exclude pricing, customer proof, field handoff, bids, sends, and provider writes until explicit review. Complete.
5. Validate focused tests, estimates, roles, build, diff, and browser QA before freezing this checkpoint. Complete.

Phase 9 first checkpoint:

1. Add deterministic snap targets from existing selected-sheet geometry: endpoints, segment midpoints, projected segments, and intersections. Complete.
2. Add drawing-time snapping with configurable enabled state, tolerance, and angle snap. Complete.
3. Add visual snap target indicators and snap status in the drawing workspace. Complete.
4. Keep snapping as a drafting aid only; it must not finalize quantities, pricing, bids, sends, provider writes, customer proof, or field handoff. Complete.
5. Validate focused tests, estimates, roles, build, diff, and browser QA before freezing this checkpoint. Complete.

Phase 10 first checkpoint:

1. Extend markup comments into pinned plan review markers with sheet, point, type, status, and visibility metadata. Complete.
2. Add draw/markup workspace mode so owner/admin users can pin notes, RFIs, scope comments, and risks directly on the selected plan. Complete.
3. Add a plan review layer summary with open/resolved state and office/proposal/field visibility counts. Complete.
4. Render pinned markup markers on the plan overlay while keeping visibility metadata review-only until explicit packet/handoff actions. Complete.
5. Validate focused tests, estimates, roles, build, diff, and browser QA before freezing this checkpoint.

Phase 11 first checkpoint:

1. Add a local review-first Plan Assist layer over reviewed plan text/OCR notes, sheets, markups, and measurement state. Complete.
2. Flag missing plan text, uncalibrated sheets, revision/addendum language, scope-category hints, repeated count terms, open RFIs, and draft-versus-reviewed quantity gaps. Complete.
3. Add owner/admin UI for reviewed plan text/OCR notes and Plan Assist suggestion cards. Complete.
4. Keep this checkpoint deterministic/local: no external AI calls, no file reads, no automatic measurement, no pricing approval, no bid/customer send, and no provider writes. Complete.
5. Validate focused tests, estimates, roles, build, diff, and browser QA before freezing this checkpoint.

Phase 12 first checkpoint:

1. Add Auto-Measure Beta suggestions from reviewed plan text dimension/count terms. Complete.
2. Suggest draft area, length, and count rows with confidence, rationale, source, sheet context, and quantity/unit. Complete.
3. Let owner/admin add a suggestion as a normal needs-review Takeoff Studio measurement row. Complete.
4. Keep beta suggestions draft-only: no file/image inspection, no certified quantities, no pricing approval, no bid/customer send, no provider writes, and no field exposure. Complete.
5. Validate focused tests, estimates, roles, build, diff, and browser QA before freezing this checkpoint.

Phase 13 first checkpoint:

1. Add Takeoff Studio production-hardening readiness checks for source gaps, calibration gaps, draft rows, unsafe customer/field review gates, and large geometry risk. Complete.
2. Surface hardening status, item/point/markup counts, warnings, and safety boundary in the owner/admin plan workspace. Complete.
3. Keep checks local and read-only: no permission changes, estimate approvals, customer sends, provider writes, production data mutations, or schema changes. Complete.
4. Validate focused tests, estimates, roles, build, diff, and browser QA before freezing this checkpoint. Complete.

Phase 14 first checkpoint:

1. Add a safe plan-file register over existing upload records, reviewed reference attachments, and sheet source metadata. Complete.
2. Support PDF/image plan file metadata, source status, size/page hints, safe preview/content URLs, and linked sheet IDs in the existing Takeoff Studio backup structure. Complete.
3. Let owner/admin or estimator attach a reviewed plan file candidate to the selected sheet without approving quantities, running OCR, sending customer data, or changing provider/storage/schema behavior. Complete.
4. Keep field users blocked from Estimate Studio, Takeoff Studio, plan file candidates, pricing, margins, billing, payroll, office notes, and AI Office controls. Complete.
5. Validate focused tests, estimates, roles, build, diff, and browser QA before freezing this checkpoint. Complete.

Phase 15 first checkpoint:

1. Add native browser PDF page-render URLs for registered PDF plan files. Complete.
2. Add PDF page render readiness over the selected sheet, recorded page number, page count, and source file. Complete.
3. Let owner/admin add page-specific sheet records from a reviewed PDF plan file without parsing, OCR, provider writes, or schema changes. Complete.
4. Render the selected PDF page URL inside the existing plan viewer iframe while preserving the measurement overlay and review-first workflow. Complete.
5. Validate focused tests, estimates, roles, build, diff, and browser QA before freezing this checkpoint. Complete.

Phase 16 first checkpoint:

1. Add manual/review-first plan text extraction source rows over registered PDF/image plan files. Complete.
2. Track source file, method, pasted extracted text, and estimator review status in the existing Takeoff Studio backup structure. Complete.
3. Surface extraction readiness, reviewed source counts, warnings, and safety boundaries beside AI Plan Assist. Complete.
4. Let reviewed source text feed local Plan Assist and Auto-Measure Beta without reading/OCRing files, calling external AI, approving quantities, sending customer data, exposing field users, writing providers, or changing schema. Complete.
5. Validate focused tests, estimates, roles, build, diff, and browser QA before freezing this checkpoint. Complete.

Phase 17 first checkpoint:

1. Add source-aware Vision Auto-Measure Beta readiness over registered plan files, reviewed extracted text, and calibrated sheet context. Complete.
2. De-dupe plan source rows so sheet metadata does not over-count the same PDF/image file. Complete.
3. Prepare draft-only source-aware suggestions from reviewed text dimensions/counts with file context and estimator review controls. Complete.
4. Keep the beta local and review-first: no pixel inspection, OCR, external AI, certified quantities, pricing approval, bids, sends, field exposure, provider writes, or schema changes. Complete.
5. Validate focused tests, estimates, roles, build, diff, and browser QA before freezing this checkpoint. Complete.

Phase 18 first checkpoint:

1. Add trade-specific auto-takeoff packs for concrete flatwork, sitework/demo, fence/linear, and general takeoff. Complete.
2. Map reviewed source-aware beta suggestions into draft-only pack suggestions with safe measurement types and assembly IDs. Complete.
3. Let owner/admin add pack suggestions as normal needs-review takeoff rows with blank pricing and office-only visibility. Complete.
4. Keep packs as local mapping helpers: no pricing, assembly approval, certified quantities, bids, sends, field exposure, pixel inspection, external AI, provider writes, or schema changes. Complete.
5. Validate focused tests, estimates, roles, build, diff, and browser QA before freezing this checkpoint. Complete.

Phase 19 first checkpoint:

1. Add a production pilot hardening gate over sources, reviewed text, calibration, draft isolation, beta safety, private-data scan, and browser performance risk. Complete.
2. Surface pass/review gate rows in the owner/admin takeoff workspace without changing permissions, production data, or providers. Complete.
3. Keep the gate local/read-only and approval-safe: no deploy, production mutation, estimate approval, certified quantities, field exposure, customer sends, auth changes, provider writes, or payment actions. Complete.
4. Validate focused tests, estimates, roles, build, diff, and browser QA before freezing this checkpoint. Complete.

Phase 20 final freeze:

1. Confirm Phases 14-19 are committed and pushed to `main`. Complete.
2. Rerun focused Takeoff Studio tests, estimate verification, role verification, production build, diff check, and browser/field route QA. Complete.
3. Record final status and defer provider-backed OCR/vision, real telemetry, durable audit trails, and deeper trade libraries. Complete.
4. Keep the release local/code-only: no schema, auth/session, production config, deployment, production data, provider write, customer send, payment, or field permission change. Complete.

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

## Phase 2 Checkpoint: Reviewed Quantity To Estimate Lines

Completed on 2026-05-31:

- Reviewed Takeoff Studio items can now generate editable estimate line item drafts.
- Assembly choices stay quantity-only and leave `unitPrice` blank for office review.
- Concrete flatwork can suggest prep SF, concrete CY, and finish/sawcut SF from a reviewed area.
- Base rock, demo/haul-off, forming/sawcut, and direct quantity rows are supported as safe starter assemblies.
- Applying reviewed quantities also refreshes Apex Takeoff Studio backup rows and replaces previous generated takeoff lines to avoid duplicate estimate rows.
- Field users remain blocked from Estimate Studio and Takeoff Studio.

Remaining Phase 2 work:

- Decide whether assembly templates need trade/package-specific defaults before Phase 2 freeze.

## Phase 2 Checkpoint: Proposal Proof And GC Review Summary

Completed on 2026-05-31:

- Reviewed Takeoff Studio measurements can be marked `Office only` or `Customer safe` before proposal proof use.
- Customer-safe proof rows are generated only from reviewed measurements explicitly selected for proposal proof.
- Reviewed measurements not selected for proposal proof are marked `Apex Takeoff Studio office-only` in backup rows so customer proposal evidence filters them out while internal packets can still show the backup.
- GC packet proof summary helpers prepare reviewed takeoff summary, field-verification qualification language, sheet references, and internal office-only review notes without changing pricing or sending anything.
- Estimate Studio now shows proposal proof preview and can prepare a local GC proof summary for review/save.

Remaining Phase 2 work before freeze:

- Validate the proof/packet checkpoint with full estimates, roles, build, diff, and browser QA.
- Decide whether assembly templates need trade/package-specific defaults before Phase 2 freeze.

## Phase 3 Checkpoint: Review-First Takeoff Assistant Queue

Completed on 2026-05-31:

- Takeoff Studio now has a local review-first assistant queue that inspects existing sheet/item data.
- Suggestions can flag plan organization, scale calibration, missing volume depth, unreviewed quantities, proposal-proof decisions, direct-area assembly review, estimate-line prep, and GC proof summary prep.
- Suggestions have explicit review/apply/dismiss state stored in the existing takeoff backup structure; no schema change was introduced.
- Safe suggestions can apply local review-state or customer-safe proof-state changes only after the estimator clicks them.
- Assistant line/GC prep still routes through the existing reviewed quantity and GC proof-summary handlers.
- This checkpoint does not use external AI, auto-measure plans, approve pricing, submit bids, send proposals, write providers, or expose field data.

Deferred Phase 3 enhancements:

- Add optional provider-backed AI drafting later only behind existing AI/provider readiness and role/package gates.
- Add richer plan-note/RFI/assumption drafting once there is a safe source for plan text or uploaded plan metadata.

## Phase 4 Checkpoint: Revisions, Proof, And Field Handoff

Completed on 2026-05-31:

- Takeoff Studio sheets now carry active/superseded state without a schema change.
- Takeoff measurements now carry active/revised/superseded revision state and explicit `Field safe` handoff approval.
- Revision helpers identify superseded sheets, changed reviewed quantities, and change-order watchouts.
- Proof snapshot helpers separate customer-safe proposal proof, internal review rows, and field-safe handoff rows.
- Foreman handoff packets now use explicitly approved structured Takeoff Studio field rows and filter office-only Takeoff Studio backup rows.
- Field handoff output remains quantity/reference context only; no pricing, margin, payroll, billing, office notes, customer send, provider write, or approval automation was added.
- Validation passed for focused utility/print tests, estimates, roles, build, diff, and browser QA.

Deferred Phase 4 enhancements:

- Decide whether job detail/Field Mode should show the same approved field-safe takeoff context directly after estimate conversion, or whether the current foreman handoff packet is enough for this checkpoint.

## Phase 5 Checkpoint: Advanced Takeoff Power

Completed on 2026-05-31:

- Takeoff Studio now has tool-set selection for concrete flatwork, sitework/demo, fence/linear, and general takeoff.
- Measurement legends summarize takeoff quantities by type, unit, review state, and revision state.
- Revision comparison rows identify changed reviewed quantities across revisions.
- CSV import/export lets owner/admin or estimator exchange quantity rows without pricing, provider writes, or schema changes.
- Markup comments support office/proposal/field visibility and open/resolved review state.
- Takeoff package export combines legend rows, revision comparisons, proposal proof, field handoff rows, non-office markup comments, and CSV output for reviewed proposal/office backup.
- This checkpoint does not add automatic plan detection, guaranteed blueprint takeoff, public customer plan approval, e-sign, provider writes, live purchasing, accounting, payroll automation, bid submission, or customer sends.
- Validation passed for focused takeoff tests, estimates, roles, build, diff, and browser QA.

Deferred Phase 5 enhancements:

- Real PDF page thumbnails, OCR/plan text extraction, plan overlay rendering, provider-backed AI plan assistance, and richer multi-user collaboration are versioned later work that need provider/file parsing and product approval before expansion.

## Phase 6/7 Checkpoint: Plan Viewer And Calibration

Completed locally on 2026-05-31:

- Takeoff Studio now has a selected plan-sheet workspace with sheet thumbnails, source metadata, safe preview URLs, and visual measurement overlays.
- Sheet records now carry page number, canvas size, rotation, active/superseded state, source file, preview URL, preview kind, and sheet-level scale calibration in the existing estimate backup.
- Owner/admin users can record a reviewed sheet scale and apply it to drawing-based measurements on that sheet, which recalculates quantities and returns affected measurements to needs-review.
- The viewer supports image/PDF/embedded preview URLs when a reviewed source URL exists and uses a non-claiming vector fallback when only metadata/points exist.
- Calibration remains a human review tool. It does not auto-measure, approve estimate pricing, send proposals, submit bids, write providers, expose field users, or create customer-facing commitments.

Deferred Phase 6/7 enhancements:

- Real file upload/storage, rendered PDF page extraction, OCR, snapping, automatic symbol/edge detection, and provider-backed plan parsing remain later phases.

## Phase 8 Checkpoint: Manual Drawing Tools

Completed locally on 2026-05-31:

- Takeoff Studio now supports click-to-draw area, length, count, and volume measurements on the selected plan workspace.
- Owner/admin users can name a drawing, choose the tool, click points, undo the last point, clear the draft, and finish the measurement.
- Finished drawings become standard Takeoff Studio measurement rows tied to the selected sheet/revision and remain `needs_review` until the estimator approves them.
- Sheet scale is applied only when the selected sheet has a reviewed scale; otherwise the row stays draft and asks for calibration before trust.
- Drawing tools do not auto-finalize quantities, pricing, proposal proof, field handoff, bids, sends, or provider actions.

Deferred Phase 8 enhancements:

- Keyboard shortcuts, grip editing, drag handles, touch-specialized drawing gestures, and snapping are handled in later phases.

## Phase 9 Checkpoint: Snapping System

Completed locally on 2026-05-31:

- Takeoff Studio now builds snap targets from existing geometry on the selected sheet, including endpoints, segment midpoints, segment projections, and intersections.
- Drawing clicks snap to nearby geometry based on configurable tolerance, with a toggle for snapping and 45/90-degree angle snap.
- The plan overlay shows snap target dots and a snap status readout while drafting.
- Snapping only improves draft geometry. Measurements still save as needs-review and do not affect pricing, proposal proof, field handoff, bids, sends, provider writes, or customer-facing claims without explicit estimator action.

Deferred Phase 9 enhancements:

- Drag-to-edit handles, keyboard modifier keys, snap layers, and high-volume geometry performance tuning remain later polish/hardening work.

## Phase 10 Checkpoint: Markups And Review Layer

Completed locally on 2026-05-31:

- Takeoff Studio markup comments now support pinned plan points while preserving sheet, type, text, status, and visibility metadata.
- Owner/admin users can switch the plan workspace between drawing mode and markup mode, then click the plan to pin notes, RFIs, scope comments, or risk markers.
- The plan review layer summarizes open markup comments and office/proposal/field visibility counts for the selected sheet.
- Pinned markups render on the plan overlay and remain review metadata only. They do not send, publish, approve, expose field data, or change customer-facing packets without explicit review actions.

Deferred Phase 10 enhancements:

- Cloud/highlight/box drawing shapes, threaded comments, assigned reviewers, and drag-to-edit markup handles remain later collaboration polish.

## Phase 11 Checkpoint: AI Plan Assist

Completed locally on 2026-05-31:

- Takeoff Studio now includes a local review-first Plan Assist panel.
- Owner/admin users can paste reviewed plan text/OCR notes for scope review without the app reading files automatically.
- Plan Assist flags revision/addendum language, concrete/sitework scope terms, repeated count hints, open RFIs, missing calibration, and draft-versus-reviewed quantity gaps.
- Suggestions are review prompts only. They do not call external AI, auto-measure final quantities, approve pricing, submit bids, send messages, write providers, or expose field users.

Deferred Phase 11 enhancements:

- Provider-backed AI plan reading, real OCR extraction, structured RFI drafting, and image-based symbol detection remain provider/file-parsing phases.

## Phase 12 Checkpoint: Auto-Measure Beta

Completed locally on 2026-05-31:

- Takeoff Studio now has an Auto-Measure Beta panel that reads reviewed plan text/OCR notes and prepares draft area, length, and count suggestions.
- The beta can detect simple dimensions such as `20 x 30`, length text such as `120 LF`, and count language such as `4 drains`.
- Owner/admin users can add a beta suggestion as a normal `needs_review` measurement row with office-only defaults.
- Beta output includes confidence, source, rationale, quantity, and unit, but remains an estimator-review aid only.
- It does not inspect plan files automatically, certify quantities, finalize measurements, approve pricing, submit bids, send messages, write providers, or expose field users.

Deferred Phase 12 enhancements:

- Real image/PDF edge detection, symbol detection, OCR extraction, and provider-backed plan vision remain later provider/file-parsing upgrades.

## Phase 13 Checkpoint: Production Hardening

Completed locally on 2026-05-31:

- Takeoff Studio now has local production-hardening readiness checks for pilot/demo use.
- The hardening layer flags missing sheet sources, uncalibrated measured rows, draft quantity rows, unreviewed customer/field visibility rows, and large geometry sets.
- The owner/admin plan workspace shows hardening status, row/point/markup counts, warnings, and safety boundary.
- Hardening checks are read-only evidence. They do not change permissions, approve estimates, send customer data, write providers, mutate production data, or require schema changes.

Deferred Phase 13 enhancements:

- Real file storage/load testing, large PDF rendering performance, tablet stylus tuning, provider-backed OCR/vision, and production telemetry remain versioned upgrades.

## Phase 14 Checkpoint: Real Plan File Handling

Completed locally on 2026-05-31:

- Takeoff Studio now has a Plan file register in the owner/admin takeoff workspace.
- Plan candidates can come from existing permission-scoped upload records, reviewed estimate reference rows, and current sheet source metadata.
- Registered plan files normalize source type, upload/reference ID, file name, MIME/type hints, file size, page count, safe preview/content URL, preview kind, review status, warnings, and linked sheet IDs.
- Owner/admin users can attach a ready PDF/image plan source to the selected sheet, which updates the sheet source file and preview URL inside the existing estimate backup block.
- Attaching a plan file does not approve quantities, change estimate pricing, run OCR, auto-measure, send customer data, expose field users, write providers, mutate production data, or require schema changes.
- Validation passed for focused Takeoff Studio tests, estimates, roles, build, diff, and browser QA.

Deferred Phase 14 enhancements:

- Direct office PDF upload to Takeoff Studio, durable PDF page rasterization, OCR extraction, and image/vision auto-measure remain later phases.

## Phase 15 Checkpoint: PDF Page Rendering

Completed locally on 2026-05-31:

- Takeoff Studio now builds page-specific PDF viewer URLs for registered PDF plan files.
- The owner/admin workspace shows a PDF Page Rendering card for the selected sheet.
- PDF rendering state tracks selected page, recorded page count, matched plan file, page preview URL, existing sheets for that PDF, and the next page sheet number.
- Owner/admin users can add a page-specific sheet from a reviewed PDF plan file, keeping the source file and page URL in the existing estimate backup structure.
- The plan viewer iframe uses the page-specific PDF URL while keeping the drawing/markup overlay review-first.
- This checkpoint uses the browser's native PDF viewer only; it does not parse files, OCR plans, rasterize pages, auto-measure, approve quantities, send customer data, expose field users, write providers, mutate production data, or require schema changes.
- Validation passed for focused Takeoff Studio tests, estimates, roles, build, diff, and browser QA.

Deferred Phase 15 enhancements:

- Durable PDF raster tiles, thumbnail extraction, OCR, vision assistance, and large-PDF performance telemetry remain later phases.

## Phase 16 Checkpoint: OCR / Plan Text Extraction Readiness

Completed locally on 2026-05-31:

- Takeoff Studio now stores reviewed plan text source rows tied to registered plan files and selected sheets.
- Owner/admin users can add manual paste/reviewed OCR/reviewed notes source rows, paste extracted plan text, and mark each source draft, needs-review, or reviewed.
- Extraction readiness tracks registered plan file coverage, draft source rows, reviewed source counts, and whether Plan Assist / Auto-Measure Beta has reviewed text available.
- Reviewed source text is folded into the normalized Takeoff Studio plan text context so existing local assistant and beta measurement suggestions can use it after estimator review.
- This checkpoint remains manual-safe: it does not OCR files, read uploads automatically, call external AI, certify quantities, approve pricing, send customer data, expose field users, write providers, mutate production data, or require schema changes.

Deferred Phase 16 enhancements:

- Real OCR workers, server-side PDF text extraction, page-linked OCR overlays, and vision-based measurement confidence remain later approved phases.

## Phase 17 Checkpoint: Vision Auto-Measure Beta

Completed locally on 2026-05-31:

- Takeoff Studio now has a source-aware Vision Auto-Measure Beta layer over registered plan files, reviewed extracted text, and sheet calibration.
- The beta summarizes each source file's readiness, linked sheet count, reviewed text coverage, and calibration state.
- Draft suggestions inherit reviewed source-file context and remain normal needs-review takeoff draft rows when added.
- Duplicate sheet-source metadata is collapsed by file name so readiness counts do not overstate plan coverage.
- This checkpoint does not inspect pixels, OCR files, call external AI, certify quantities, approve pricing, submit bids, send messages, expose field users, write providers, mutate production data, or require schema changes.

Deferred Phase 17 enhancements:

- Real computer-vision measurement detection, image/raster analysis, provider-backed AI, confidence heatmaps, and automatic geometry extraction remain later approved phases.

## Phase 18 Checkpoint: Trade-Specific Auto-Takeoff Packs

Completed locally on 2026-05-31:

- Takeoff Studio now has draft-only trade packs for concrete flatwork, sitework/demo, fence/linear, and general takeoff.
- The active pack follows the selected Takeoff Studio tool set and summarizes reviewed plan-text keyword hits.
- Source-aware beta suggestions can be mapped into safe trade-pack draft rows with assembly IDs such as concrete flatwork, forming/sawcut, base rock, demo/haul-off, or direct quantity.
- Added pack suggestions still become normal `needs_review` office-only takeoff rows with blank pricing until the estimator reviews them.
- This checkpoint does not create pricing, approve assemblies, certify quantities, submit bids, send messages, expose field users, inspect pixels, call external AI, write providers, mutate production data, or require schema changes.

Deferred Phase 18 enhancements:

- Deeper trade libraries, contractor-configurable assemblies, package-specific defaults, and provider-backed quantity detection remain later approved phases.

## Phase 19 Checkpoint: Production Pilot Hardening Gate

Completed locally on 2026-05-31:

- Takeoff Studio now has a local pilot hardening gate for controlled demo/pilot readiness.
- The gate checks plan source registration, reviewed extracted text, scale calibration, draft/customer/field isolation, beta safety boundaries, private-data terms, and browser geometry/source volume.
- Owner/admin users can see clear/review gate rows inside the takeoff workspace.
- The gate composes existing hardening, text extraction, vision beta, and trade-pack readiness without changing storage schema or permissions.
- This checkpoint does not deploy, mutate production data, approve estimates, certify quantities, expose field users, send customer data, change auth, write providers, or create payment actions.

Deferred Phase 19 enhancements:

- Real production telemetry, persistent audit trails, pilot usage analytics, and automated PDF/image load testing remain later approved phases.

## Phase 20 Checkpoint: Final Freeze And Audit

Completed locally on 2026-05-31:

- Takeoff Studio Phases 14-19 are implemented, validated, committed, and pushed to `main`.
- Final validation covers focused Takeoff Studio tests, estimate verification, role verification, production build, diff check, admin `/estimates` desktop/mobile QA, field-role mobile restricted `/estimates` QA, and focused owner/admin panel checks.
- No schema, auth/session, billing/payment, provider, production config, deployment, production data, customer-send, or field-permission changes were introduced.
- Field users remain blocked from Estimate Studio, Takeoff Studio, pricing, private money data, payroll/workforce cost data, office notes, and AI Office controls.
- The next safe product step is controlled owner/admin demo with real sample plans, then separately approved provider-backed OCR/vision or durable telemetry work only after pilot evidence.
