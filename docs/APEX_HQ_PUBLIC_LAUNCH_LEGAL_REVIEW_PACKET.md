# Apex HQ Public Launch Legal Review Packet

Date: 2026-05-31
Status: prepared for qualified legal review; not approved; not legal advice

## Current Decision

Apex HQ is not approved for broad public launch yet.

Production public signup is currently contained:

- Fly production release: `v619`.
- `PUBLIC_SIGNUP_ENABLED`: `false`.
- `/api/setup/status` reports `publicSignupEnabled:false`.
- Direct production `POST /api/signup/company` returns `404 Not Found`.

Keep Apex HQ in guided demo and controlled founder-led pilot posture until the legal, privacy, public claims, support, billing-boundary, and production signup gates are approved from real evidence.

This packet organizes review work. It does not create terms, approve a privacy policy, authorize public signup, authorize billing, authorize automated sends, or replace review by a qualified professional.

## Review Inputs

Local Apex HQ source documents:

- `docs/PILOT_TERMS_AND_SUPPORT_POLICY.md`
- `docs/CUSTOMER_DATA_POLICY_DRAFT.md`
- `docs/PUBLIC_CLAIMS_GUARDRAILS.md`
- `docs/apex-hq-legal-review-prep-checklist.md`
- `docs/apex-hq-support-intake-process.md`
- `docs/APEX_HQ_PUBLIC_SELF_SERVE_CURRENT_READINESS.md`
- `docs/BILLING_MANUAL_UPGRADE_PREP.md`
- `docs/FOUNDER_LED_DEMO_EXECUTION_RUNBOOK.md`
- `docs/WEBSITE_COPY_PACK.md`
- `docs/OUTREACH_LAUNCH_PACKET.md`

Official review references to give counsel and the founder:

- FTC business privacy and security guidance: `https://www.ftc.gov/business-guidance/privacy-security/data-security`
- FTC small business guidance: `https://www.ftc.gov/business-guidance/small-businesses`
- FTC endorsements, influencers, and reviews guidance: `https://www.ftc.gov/business-guidance/advertising-marketing/endorsements-influencers-reviews`
- FTC CAN-SPAM compliance guide: `https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business`
- FTC artificial intelligence topic page: `https://www.ftc.gov/industry/technology/artificial-intelligence`
- FTC AI privacy/confidentiality guidance: `https://www.ftc.gov/policy/advocacy-research/tech-at-ftc/2024/01/ai-companies-uphold-your-privacy-confidentiality-commitments`
- FCC TCPA consent revocation order: `https://docs.fcc.gov/public/attachments/FCC-24-24A1_Rcd.pdf`

## Legal Review Gates

| Gate | Needed before | Current status | Approval evidence needed |
| --- | --- | --- | --- |
| Terms / pilot agreement | paid pilot, broader signup, public launch | not approved | final customer-facing terms reviewed and dated |
| Privacy / customer data policy | any broader customer onboarding | not approved | final privacy/data policy reviewed and dated |
| Public claims | website, sales sheet, demo script, outreach, social profiles | not approved | approved copy set or documented safe copy rules |
| AI claims and AI data use | promoting AI Office or assistant features | not approved | reviewed AI wording and data-use disclosure |
| Testimonial / portfolio proof | using customer names, quotes, logos, photos, screenshots, case studies | not approved | written permission process and asset-level approvals |
| Email outreach | outbound commercial email at launch scale | not approved | sender identity, address, unsubscribe, opt-out process, suppression process |
| SMS / call outreach | any automated or scaled texting/calling | not approved | consent, revocation, do-not-contact, and manual approval process |
| Billing terms | paid packages, upgrades, cancellation, refunds, invoice language | not approved | reviewed pricing, cancellation, refund, tax, and manual billing language |
| Support / incident process | paid pilot or public launch | prepared, not approved | named support owner and reviewed response language |
| Entity and brand claims | public website, contracts, invoices, signatures | not approved | exact legal entity, address, contact, and brand usage confirmed |

## Counsel Review Questions

Ask counsel to review and mark each item as approve, revise, or remove:

- Are the pilot terms sufficient for founder-led pilots?
- Are cancellation, non-renewal, data export, and offboarding expectations clear enough?
- Does the privacy/data policy match how Apex HQ currently collects, stores, supports, and exports customer workspace data?
- Does the privacy/data policy describe field-user, admin-user, and support-access boundaries without overpromising automation?
- Does any public copy imply unsupported guarantees around leads, jobs, revenue, growth, uptime, compliance, payroll, accounting, tax, legal, or safety outcomes?
- Does any AI wording imply that Apex HQ approves, sends, prices, schedules, orders, publishes, disciplines, or mutates risky records without human review?
- Does any portfolio, proof, reputation, or proposal workflow need a stricter written permission record before public use?
- Does any customer screenshot, photo, logo, project story, quote, or review ask require additional consent before demo, website, deck, or social use?
- Are email and SMS consent, opt-out, sender identity, suppression, and recordkeeping boundaries sufficient before outreach expands?
- Does billing copy make clear that early launch uses manual billing prep, not automated payment collection, checkout, accounting sync, or tax handling?
- Are support severity definitions and incident/contact expectations realistic without creating an unapproved SLA?
- Are the legal entity name, address, support contact, and public business identity ready for customer-facing use?

## Safe Public Copy Pending Review

The current safest external posture is:

```text
Apex HQ helps contractors keep leads, estimates, jobs, crews, photos, reports, tickets, safety items, change orders, time, closeout, and follow-ups organized in one role-based workspace.
```

```text
Apex HQ is in founder-led demos and controlled pilots. AI-assisted workflows stay review-first and do not send messages, approve bids, create invoices, collect payments, or make customer commitments automatically.
```

Do not call the app public self-serve, compliance approved, enterprise ready, fully automated, no-setup, guaranteed-results, or billing-live until each claim is true, reviewed, and approved.

## What To Avoid

Do not approve copy that says or implies:

- guaranteed leads, jobs, revenue, sales, growth, or margins
- AI runs the company, approves estimates, sends messages, schedules crews, orders materials, creates invoices, or closes jobs automatically
- Apex HQ replaces payroll, accounting, tax, legal, safety, or compliance professionals
- Stripe, checkout, payment collection, self-serve billing, or invoice automation is live before implementation and review
- public self-serve signup is open while production signup remains disabled
- no setup is required for customers
- customer proof, case studies, testimonials, quotes, names, logos, screenshots, or photos exist without real permission
- SOC 2, HIPAA, PCI, bank-level, enterprise-grade, or other formal compliance posture before actual evidence and approval
- uptime, incident response, or support SLA commitments beyond approved pilot support language

## Founder Signoff Needed After Review

After qualified review is complete, the founder still needs to record explicit launch decisions:

- terms/privacy/public-claims review accepted
- current public website and demo language accepted
- support owner and response posture accepted
- manual billing boundary accepted
- production monitoring destination accepted
- backup/restore evidence accepted
- `PUBLIC_SIGNUP_ENABLED` re-enable approval, if broad signup should open
- final public launch approval phrase recorded in the launch gate

Do not re-enable production signup merely because this packet exists.

## Launch Gate Mapping

Only use launch approval flags after the evidence exists:

- `--legal-review-acknowledged`: use only after legal/privacy/public-claims review is complete and recorded.
- `--manual-billing-boundary-acknowledged`: use only after the founder accepts manual billing prep language.
- `--public-signup-enable-approved`: use only after the founder approves production signup enablement.
- `--production-safety-approved`: use only after production safety evidence and rollback path are current.

Until then, the correct status remains:

- guided demos: allowed
- controlled founder-led pilots: allowed with reviewed or conservative draft language
- broad public launch: blocked
- automated billing/payment collection: blocked
- automated email/SMS/customer sends: blocked

## Immediate Next Steps

1. Send this packet plus the listed source documents to counsel or a qualified reviewer.
2. Update the pilot terms and customer data policy from review comments.
3. Update the public website, demo deck, outreach copy, and social copy to the approved claims set.
4. Record approval evidence in the launch readiness docs.
5. Re-run claims, public launch readiness, signup, roles, backup, restore, monitoring, and build checks before any production signup change.
