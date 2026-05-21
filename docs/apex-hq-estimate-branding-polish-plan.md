# Apex HQ Estimate Branding Polish Plan

Status: first focused Estimate Studio branding pass completed; PDF/print polish remains available for future targeted passes
Owner: Apex HQ build workflow
Reference: `C:\Users\jberl\Downloads\Generateimage 1.png`

## Goal

Make Apex HQ estimates feel like a premium contractor proposal system, not just a saved estimate table.

The next pass should polish both:

1. The in-app `/estimates` Estimate Studio experience.
2. The customer-facing estimate/proposal PDF and print packet output.

This should support the current fencing-focused demo while staying trade-aware enough for concrete, hardscape, excavation, remodel, and small GC workflows.

## Product Standard

Estimates should help contractors:

- look professional to customers and GCs
- explain scope clearly
- show company branding
- present options cleanly
- keep inclusions, exclusions, assumptions, and terms organized
- connect estimate approval into job handoff
- avoid exposing internal notes, margin, package gates, or office-only backup to field users

Do not add payment collection, invoices, Stripe, checkout, or self-serve billing.

## Current Anchors

Use existing systems first:

- `/estimates` Estimate Studio UI in `src/App.jsx`
- Estimate Studio styling in `src/index.css`
- customer-facing print model in `shared/estimatePrint.js`
- PDF renderer in `server/estimate-pdf.js`
- packet settings in `shared/estimatePacketPresets.js`
- estimate template starters in `src/estimate-template-utils.js`
- estimate tests in `server/estimates.test.js`, `server/estimate-pdf.test.js`, `shared/estimatePrint.test.js`, `src/estimate-template-utils.test.js`, and related estimate utilities

## Scope

### 1. Branded Proposal Header

The PDF/print packet should have a stronger proposal header:

- Apex/client company name
- logo initials or logo placeholder
- contractor contact details
- service area
- license/insurance text if present
- estimate/proposal status
- project/customer block
- proposal date and valid-through language if present

Visual target:

- dark navy header band or strong branded top block
- Apex orange accent
- cleaner contractor proposal title
- less generic blue PDF look

### 2. Company Branding Panel In Estimate Studio

The right sidebar in `/estimates` should clearly show company/customer/project context:

- Company Branding
- Customer
- Project
- Estimate Total
- validity or status
- print/send/manual-send actions where already supported

Keep this dense and tablet-friendly like the reference image.

### 3. Branded Proposal Workbench

The central `/estimates` first viewport should make the selected estimate feel like a proposal surface:

- selected option/detail view
- project photos/takeoff preview
- scope of work
- inclusions and exclusions columns
- assumptions/clarifications
- total summary
- packet preview tiles
- assistant dock/rail

Do not turn it back into a generic table-first dashboard.

### 4. Proposal Options And Good/Better/Best Language

Use existing estimate option/alternate/add-on structure.

Improve UI and PDF presentation for:

- Standard / Premium / High End or Good / Better / Best option labels
- included versus optional versus excluded status
- selected option total
- base estimate total staying separate from selected option total
- plain-language option descriptions

Do not invent prices or change estimate math.

### 5. Fencing Demo Proposal Quality

The current demo now leads with fencing. Estimates should show contractor-real language:

- cedar fence replacement
- gate repair/rebuild
- privacy screen
- perimeter fence repair
- post layout
- utility locate
- gates/hardware
- material delivery evidence
- cleanup and access restoration

This can be demo seed/template copy only. Do not hard-code the whole app as fencing-only.

### 6. Print/PDF Layout Polish

Improve customer-facing PDF/print packet:

- branded header
- better section hierarchy
- clean line item table
- professional total card
- clear scope/inclusions/exclusions/assumptions
- optional alternates/add-ons block
- customer notes/terms
- footer with Apex/company packet language
- no internal notes unless internal review packet is explicitly enabled

Keep PDF output ASCII-safe where the renderer requires it.

### 7. Branding Settings Source

Use existing company settings/profile fields only:

- company name
- business phone
- business email
- website
- business address
- service area
- license text
- logo initials
- packet footer

If a needed field does not exist, use a safe fallback. Do not add database schema for this pass unless separately approved.

### 8. Permission Safety

No permission changes are intended.

Must preserve:

- owner/admin/estimator can view/manage estimates according to existing rules
- foreman/employee remain blocked from estimates and pricing
- internal review sections remain office-only
- field handoff must not expose customer pricing, margin, profit, or internal backup
- package gates remain intact

### 9. Mobile And Tablet Behavior

Tablet is the primary visual target for Estimate Studio.

Required:

- left option rail remains usable
- center proposal workbench remains readable
- right branding/customer rail collapses or stacks cleanly
- packet preview remains visible early
- no horizontal overflow
- no tiny controls
- admin phone can stack intentionally
- field users still redirect/block correctly

## File-Level Build Plan

### Likely App/UI Files

- `src/App.jsx`
  - refine Estimate Studio first viewport
  - strengthen company branding/right rail
  - improve option/detail surface and packet preview language

- `src/index.css`
  - polish Estimate Studio density, responsive behavior, branded sidebar, option rail, packet tiles, and total cards

- `src/estimate-template-utils.js`
  - only if starter/template copy needs more trade-aware proposal polish

### Likely Print/PDF Files

- `shared/estimatePrint.js`
  - improve print model if branded sections/options need clearer normalized output

- `server/estimate-pdf.js`
  - restyle PDF header, section titles, total block, and footer

- `shared/estimatePacketPresets.js`
  - only if packet section labels/descriptions need clearer branding

### Likely Tests

- `server/estimate-pdf.test.js`
- `server/estimates.test.js`
- `shared/estimatePrint.test.js`
- `src/estimate-template-utils.test.js`
- `src/estimate-gc-packet-utils.test.js`
- `src/estimate-backup-utils.test.js`

## Non-Goals

Do not:

- add Stripe
- add checkout
- add invoice/payment collection
- add self-serve plan changes
- add new database schema without approval
- change Supabase/RLS
- weaken role/package gates
- expose estimates to field users
- redesign every page
- replace existing estimate math
- auto-send estimates
- auto-approve estimates
- auto-contact customers
- invent pricing
- add marketing-page visuals

## Verification Plan

Run local checks:

- `npm.cmd run verify:estimates`
- `npm.cmd run verify:roles`
- `npm.cmd run build`
- `git diff --check`

If UI changes:

- admin desktop screenshot for `/estimates`
- admin tablet screenshot for `/estimates`
- admin phone screenshot for `/estimates`
- employee/field restricted-route check for `/estimates`
- console/network check
- text overflow check

If PDF changes:

- PDF tests must confirm customer-facing output includes branding and proposal sections
- PDF tests must confirm internal notes do not leak
- filename behavior remains safe
- estimate email send test remains passing

If demo deploy is approved/expected:

- backup Fly demo first
- deploy only `concrete-ops-demo` with `fly.demo.toml`
- run hosted smoke
- confirm `/estimates` loads
- confirm admin bootstrap shows fencing proposal records
- confirm employee estimate access remains blocked

Production remains locked unless separately approved with backup-first release.

## Recommended First Implementation Pass

Build the smallest high-impact pass:

1. Polish `server/estimate-pdf.js` branded header/footer and total block.
2. Add/adjust tests proving branding appears and internal notes remain hidden.
3. Polish `/estimates` right branding rail and packet preview language.
4. Capture desktop/tablet/phone screenshots.
5. Commit, push, and deploy demo only if checks pass.

This gives demos a visible upgrade quickly without touching permissions, pricing logic, or database schema.

## Completed First-Viewport UI Pass

Completed on 2026-05-21:

- added a proposal identity strip to the selected Estimate Studio workbench
- reused existing company profile fields only: company name, logo initials, phone, email, website, service area, address, license text, and packet footer
- preserved estimate math, proposal actions, print/PDF behavior, package gates, and field-user estimate denial
- passed `npm.cmd run verify:estimates`, `npm.cmd run verify:roles`, `npm.cmd run build`, and desktop/tablet/phone `/estimates` visual audits

Evidence:

- admin desktop `/estimates`: `ui-audit/estimate-branding-polish/2026-05-21T09-30-58-165Z/manifest.json`
- admin tablet `/estimates`: `ui-audit/estimate-branding-polish/2026-05-21T09-30-58-188Z/manifest.json`
- admin phone `/estimates`: `ui-audit/estimate-branding-polish/2026-05-21T09-30-58-206Z/manifest.json`
- employee phone `/estimates`: `ui-audit/estimate-branding-polish/2026-05-21T09-30-58-142Z/manifest.json`

Demo deployment evidence:

- Fly demo app: `concrete-ops-demo`
- Fly demo version: `129`
- Fly demo image: `registry.fly.io/concrete-ops-demo:deployment-01KS4Y457SK3S3ZG5EX29YTVM0`
- backup before deploy: `/app/data/backups/app-data-20260521-093325Z.sqlite` and `/app/data/backups/app-data-20260521-093325Z.json`
- hosted skip-auth smoke passed against `https://concrete-ops-demo.fly.dev`
- deployed admin desktop `/estimates`: `ui-audit/estimate-branding-demo-smoke/2026-05-21T09-35-06-952Z/manifest.json`
- deployed admin tablet `/estimates`: `ui-audit/estimate-branding-demo-smoke/2026-05-21T09-35-06-920Z/manifest.json`
- deployed employee phone `/estimates`: `ui-audit/estimate-branding-demo-smoke/2026-05-21T09-35-06-923Z/manifest.json`
