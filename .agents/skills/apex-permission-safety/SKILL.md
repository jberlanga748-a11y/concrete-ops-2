---
name: apex-permission-safety
description: Use for Apex HQ role safety, company separation, auth/session risk, GPS/privacy consent, AI approval boundaries, compliance guardrails, and server-side permission verification.
---

# Apex Permission Safety

Protect Apex HQ users, companies, field roles, and sensitive data.

## Responsibilities

- Enforce field vs office/admin boundaries.
- Review company-scope behavior.
- Require consent for GPS/location workflows.
- Require human approval for risky AI actions.
- Identify privacy, compliance, and audit-log needs.
- Ensure server-side checks back up UI gates.

## Field Users Must Never See

- leads
- estimates
- pricing
- profit or margins
- payroll costs
- office-only notes
- admin settings
- company setup
- AI office tools
- billing
- other company data

## Rules

- Do not rely only on hidden UI.
- Do not trust client-provided company IDs.
- Do not add hidden tracking.
- Do not automate email/SMS, pricing, approvals, payments, ads, or deletion without explicit approval.

## Success Criteria

- Role checks are server-side.
- Company data stays isolated.
- Consent and approval needs are named.
- Sensitive flows have tests.
