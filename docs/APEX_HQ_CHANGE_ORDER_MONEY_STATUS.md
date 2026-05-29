# Apex HQ Change Order Money Status

Status: Build 5A complete locally
Updated: 2026-05-29

Build 5A adds review-first change-order money prep. Owner/admin users can record a manual change amount, customer/GC manual review status, and manual billing handoff status after office review. Field users still see the field-safe change request status without price, office notes, customer review detail, or billing handoff state.

## Complete Locally

- Change-order requests can persist manual price amount, customer review status, GC review status, and billing handoff status.
- Billing handoff remains locked unless the change is approved for pricing, has a price amount, and has manual customer or GC acceptance.
- Customer-safe copy excludes cost, markup, margin, private office notes, and internal backup text.
- Field users remain blocked from money fields through server sanitization.
- Readiness verifier proves one accepted priced change can move to manual billing handoff while unpriced/unaccepted changes stay locked.

## Still Locked

- No automatic customer send.
- No GC submission.
- No invoice creation.
- No payment collection, charge, refund, or mark-paid behavior.
- No job status change.
- No production deploy, production data mutation, secrets change, Fly config change, or Supabase config change.

## Verification

```powershell
npm.cmd run verify:change-order-money
npm.cmd run verify:change-orders
npm.cmd run verify:roles
npm.cmd run build
git diff --check
```
