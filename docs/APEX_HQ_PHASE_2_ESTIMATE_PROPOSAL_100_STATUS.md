# Apex HQ Phase 2 Estimate Proposal 100 Status

Date: 2026-05-23
Status: complete for controlled pilot
Production status: locked unless a separate backup-first production release is approved

## Goal

Move the estimate and proposal system from polished demo quality to customer-ready contractor packet quality.

Phase 2 is complete only when owner/admin/estimator users can create a branded, customer-safe proposal with options, scope, terms, evidence, takeoff quantities, and field handoff context, while field users remain blocked from pricing and internal estimate tools.

## Current Percent

100% for the controlled-pilot estimate/proposal definition.

## Completed

- Branded estimate PDF header/footer and proposal intro exist.
- Company branding, contact details, service area, and license text can appear in PDF packet output.
- Scope, inclusions, exclusions, assumptions, GC Lite sections, alternates, add-ons, totals, customer notes, and terms print in customer-facing packets.
- Internal notes, GC review notes, packet assembly notes, sent proposal history, backup notes, raw file URLs, and estimator-only notes are hidden from customer-facing PDF output.
- Customer-safe project evidence and takeoff summaries now print from existing estimate backup rows when included by packet preset.
- Internal Review Packet can still include office-only SOV, takeoff, references, and internal notes only when explicitly allowed.
- Estimate, PDF, and role verification pass for the customer-safe evidence pass.
- Email sending now requires explicit human review confirmation at the API boundary before delivery.
- A pre-send audit event records that recipient, scope, total, attachments, exclusions, and terms were reviewed before the provider call.
- Failed provider delivery does not mark the estimate sent.
- Construction-wide templates cover concrete, fencing, roofing, landscaping/hardscape, remodeling, painting, excavation, plumbing, electrical, and HVAC starters without pricing guesses.
- Estimate-to-job handoff readiness and foreman handoff print packets keep field output free of customer pricing, margin, and office-only notes.
- Desktop/tablet Estimate Studio route QA passed.
- Employee phone `/estimates` restriction QA passed.
- Sample proposal PDF was generated and leak-checked.

## Remaining To Reach 100 Percent

No Phase 2 blockers remain for controlled pilot use.

Production/customer-send readiness still requires a separate release decision:

- Confirm production email provider and approved test-recipient strategy.
- Run backup-first production release flow if production email is enabled.
- Do not send real customer proposals without human review and approved release context.

## Current GO / NO-GO

- Customer-facing PDF evidence/takeoff summary: GO.
- Proposal send review boundary: GO for controlled pilot.
- Trade templates: GO for controlled pilot.
- Estimate-to-job handoff safety: GO for controlled pilot.
- Field-user estimate/pricing block: GO.
- Phase 2 overall: GO for controlled pilot.
- Production deploy: NO-GO without separate backup-first release approval.

## Verification Evidence

- `node --test --test-concurrency=1 server/estimates.test.js server/estimate-pdf.test.js shared/estimatePrint.test.js`
- `npm.cmd run verify:estimates`
- `npm.cmd run verify:roles`
- `npm.cmd run build`
- `git diff --check`
- Admin desktop/tablet `/estimates` visual audit: `ui-audit/phase-2-estimate-proposal/2026-05-23T05-31-21-527Z/manifest.json`
- Employee phone `/estimates` restriction audit: `ui-audit/phase-2-estimate-proposal/2026-05-23T05-31-29-383Z/manifest.json`
- Sample PDF: `ui-audit/phase-2-estimate-proposal/sample-pdf/phase-2-sample-proposal.pdf`
