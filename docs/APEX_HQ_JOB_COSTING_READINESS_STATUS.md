# Apex HQ Job Costing Readiness Status

Status: complete for Build 6A local review-only scope.

## What Is Now Complete

- Closeout billing review rows now include a review-only `jobCostingReview` section.
- Owner/admin review can compare approved estimate revenue plus recognized change-order revenue against reviewed actual cost inputs.
- Actual cost inputs are grouped into labor, material, equipment, subcontractor, and other categories.
- Completed time can contribute aggregate labor-cost basis without exposing pay rates.
- Delivery tickets and explicit job-cost entries can contribute reviewed material/equipment/subcontractor costs.
- Job-costing readiness flags missing or unreviewed cost inputs before profit/loss can be trusted.
- Owner BI surfaces job-costing review metrics without creating accounting, payroll, billing, or customer-facing actions.

## Safety Boundary

This is internal owner/admin review only.

It does not:

- finalize job costing, margin, accounting, tax, payroll, or profit/loss
- calculate payroll rates, paychecks, taxes, or burden
- create invoices, collect payment, submit bills, or post accounting entries
- send email, SMS, calls, notifications, customer portal messages, or vendor messages
- order materials, approve supplier tickets, or create purchase orders
- change job, estimate, report, upload, time, safety, delivery-ticket, or change-order status
- deploy production, run migrations, change secrets/config, or touch production data

## Verification

Run locally from the repo root:

```powershell
npm.cmd run verify:job-costing
npm.cmd run verify:jobs
npm.cmd run verify:roles
npm.cmd run build
git diff --check
```
