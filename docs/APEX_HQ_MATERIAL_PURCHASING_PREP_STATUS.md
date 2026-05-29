# Apex HQ Material Purchasing Prep Status

Status: Build 4A complete locally
Updated: 2026-05-29

Build 4A converts approved estimate/job scope into internal material prep, vendor notes, manual prep checklist items, and field delivery needs. It is review-only.

## Complete Locally

- Approved estimate scope can produce material, equipment, subcontractor, and review prep rows.
- Prep packets require an approved estimate and linked job before they are marked ready.
- Copy and print packets exclude price, cost, markup, margin, line totals, private URLs, and office-only backup text.
- Manual prep checklist keeps supplier contact, purchase orders, material orders, billing, and payment outside Apex HQ.
- Field users remain blocked from Material Prep through existing role/package permissions.

## Still Locked

- No vendor order.
- No supplier message.
- No purchase order.
- No payment collection or payment authorization.
- No billing action.
- No supplier integration.
- No production deploy, data mutation, secrets change, Fly config change, or Supabase config change.

## Verification

```powershell
npm.cmd run verify:material-purchasing-prep
npm.cmd run verify:material-prep
npm.cmd run verify:rate-book
npm.cmd run verify:roles
npm.cmd run build
git diff --check
```
