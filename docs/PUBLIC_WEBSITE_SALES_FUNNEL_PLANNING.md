# Public Website / Sales Funnel Planning

Status: Phase 2 built, verified, released, and health-checked

## Decision

Do not build or launch a public self-serve SaaS website yet.

The safe public surface is the claims-safe `/founder-pilot` page and founder-led demo funnel. Its job is to explain Apex HQ, qualify good-fit contractors, capture demo interest, and route prospects into a manual founder-led sales process. It must not create production workspaces, sell packages, collect payments, expose package controls, promise unsupported automation, or imply a fully public launch.

The website should point prospects toward a guided walkthrough and controlled founder pilot, not toward checkout or unsupervised product access.

## Phase 1 Implementation Status

Built and released:

- public founder-pilot route: `/founder-pilot`
- claims-safe homepage/founder-pilot/workflow public sections in one page
- manual walkthrough request form
- live manual review submission plus prepared request summary for copy/email/manual follow-up
- login link back to the product workspace

Phase 1 intentionally does not:

- create accounts
- create workspaces
- collect payments
- expose package selection
- send email or SMS automatically
- add customer portal access
- change product auth, package gates, or field permissions

## Phase 2 Implementation Status

Built and released:

- backend `POST /api/public/demo-interest`
- `/founder-pilot` form now saves guided walkthrough interest as a manual review lead
- explicit manual founder follow-up consent is required
- honeypot and per-connection rate limiting are in place
- exact duplicate retries return the existing manual review lead instead of creating another lead
- first-time captures create one owner/admin office queue item for manual review; duplicate retries do not add another queue item
- request notes preserve the manual-only boundary
- client-supplied company/workspace targets are ignored; requests route only to the Apex HQ default company
- owner/admin office users can review the lead through existing lead permissions and the office queue
- field users remain blocked from leads, office queue items, and demo-interest review data

Phase 2 intentionally does not:

- create customer records
- create jobs or estimates
- create users, accounts, workspaces, or field invites
- change public signup
- collect payment details
- expose package selection or package controls
- send email, SMS, calendar invites, surveys, or outreach automatically
- add customer portal access
- change product auth, package gates, or field permissions

## Funnel Shape

Recommended funnel:

```text
Public website -> demo interest form -> founder/manual qualification -> guided demo -> controlled pilot -> value review -> manual package decision
```

Allowed first website goals:

- explain who Apex HQ is for
- explain the lead/estimate/job/field-proof workflow
- make John's 15 years of concrete experience credible without overdoing it
- invite contractors to request a guided walkthrough
- invite good-fit contractors to ask about the founder pilot
- collect basic demo interest
- route follow-up into the existing manual outreach/demo process

Not allowed:

- public checkout
- Stripe/payment collection
- self-serve package selection
- automatic workspace creation from the marketing site
- public customer portal
- automatic email/SMS outreach
- paid ads or campaign launch without approval
- broad public launch language

## Site Scope

Initial planning scope:

- Home
- Founder Pilot
- Product / Workflow
- About
- FAQ
- Demo request / contact form

Do not include:

- pricing checkout
- account signup CTA
- customer portal CTA
- integrations marketplace
- enterprise compliance pages
- customer logos, testimonials, or case studies unless real and approved
- comparison pages without refreshed source-backed competitor research

## Safe Positioning

Use:

```text
Apex HQ is a contractor operations platform entering founder-led demos and controlled pilots.
```

Plain version:

```text
Apex HQ helps contractors keep leads, estimates, jobs, crews, photos, reports, tickets, safety items, and follow-ups organized in one place.
```

Primary CTA:

```text
Book a guided walkthrough
```

Secondary CTA:

```text
Ask about the founder pilot
```

Core workflow:

```text
lead/estimate -> job setup -> field handoff -> photo/report proof -> owner review -> follow-up
```

## Claims Guardrails

Safe claims:

- helps organize contractor work
- helps keep leads, estimates, jobs, photos, reports, tickets, and follow-ups in one place
- built from 15 years of concrete field and business experience
- founder-led demos are opening
- controlled pilots are available for good-fit contractors
- AI help is review-first where available
- the first pilot focuses on one workflow
- the goal is to reduce chasing and scattered information

Use carefully:

- "win more work" should become "follow up faster and win more of the work already coming in"
- "get paid faster" should become "organize proof, reports, and job details so billing/review can move cleaner"
- "AI helps run the business" should become "AI can help organize rough notes where verified, with human review"

Do not say:

- guaranteed leads, jobs, revenue, or growth
- AI bids, prices, sends, approves, or runs the business automatically
- public self-serve SaaS
- no setup required
- enterprise-ready
- SOC 2 ready, HIPAA, SSO, SCIM, or compliance claims
- replaces QuickBooks, payroll, accounting, Procore, or ServiceTitan
- customer portal is live
- Stripe billing, checkout, invoices, or package management are live
- customers, testimonials, revenue, logos, or partnerships unless real and approved

## Lead Capture Boundary

Allowed:

- name
- company
- email
- phone
- trade/type of work
- location/service area
- best workflow to clean up
- requested demo/pilot interest
- consent checkbox for founder follow-up
- server-side manual review lead creation

Not allowed:

- account password
- package selection
- payment details
- card information
- private portal credentials
- customer data uploads
- production workspace creation
- field-user invite flows

The lead capture record should be treated as a sales/demo inquiry, not as product signup.

## Product/Auth Boundary

The public website must stay separate from product auth.

Preserve:

- existing production app login
- existing `PUBLIC_SIGNUP_ENABLED` gate
- existing package entitlement helpers
- existing role and field protections
- existing manual upgrade/support handoff
- existing demo/real workspace separation

Do not add:

- new auth paths
- unauthenticated package controls
- public workspace creation
- public admin/field user creation
- customer portal auth
- billing auth or checkout sessions

## Follow-Up And Support Boundary

First follow-up should be manual and founder-led.

Allowed:

- route demo requests into existing Leads as manual review records
- use approved outreach copy after manual review
- track demo status and objections

Not allowed:

- automatic outbound email/SMS
- drip campaigns
- paid ads
- calendar auto-booking without an approved scheduling tool and process
- support impersonation
- adding prospects to production workspaces automatically

## Measurement

Measure practical funnel health:

- qualified demo requests
- guided demos booked
- demos completed
- good-fit pilot conversations
- pilots started
- day-3 check-ins completed
- day-10 value reviews completed
- pilot-to-paid decisions
- objections and disqualifiers

Avoid optimizing for vanity traffic before the founder-led demo process is converting.

## Future Implementation Prompt

Phase 2 is live. Use this only for a future manual operations polish phase after real demo-interest requests are reviewed:

```text
APEX HQ - PUBLIC WEBSITE / SALES FUNNEL PHASE 3 REVIEW OPS POLISH

Goal:
Tighten the internal owner/admin review workflow for captured founder-pilot demo interest after the public capture path is released and used.

Do not add public signup changes, Stripe, checkout, payment collection, package management, customer portal, automatic email/SMS, paid ads, account creation, or production workspace creation.

Focus:
- make captured demo-interest leads easier to identify and process
- improve manual review next steps beyond the existing office queue cue if real requests show confusion
- keep follow-up manual
- keep owner/admin-only visibility
- keep field users blocked from leads and demo-interest review
- keep claims-safe copy
- no unsupported AI, billing, compliance, portal, integration, or automation claims
- no changes to product auth, package gates, or field permissions
```

## Verification For This Checkpoint

Phase 2 verification:

```powershell
node --test --test-concurrency=1 src\public-website-utils.test.js
npm.cmd run verify:public-request
npm.cmd run verify:packages
npm.cmd run verify:entitlements
npm.cmd run verify:roles
npm.cmd run build
npm.cmd run audit:public-site
git diff --check
```

Additional focused checks:

```powershell
node --test --test-concurrency=1 server\public-demo-interest.test.js src\public-website-utils.test.js
git diff --check
```

Release evidence:

- Commit: `8bc8f6e Release founder pilot funnel and demo readiness`
- Fly release: `v497`
- Image: `registry.fly.io/concrete-ops-2:deployment-01KRW6WJK7WGPX14QPXG0EPNF5`
- Health checks: `https://app.apexhq.online/api/ready` and `https://concrete-ops-2.fly.dev/api/ready` returned ready/database ok.
- Local browser audit: `ui-audit/public-site/2026-05-18T00-12-24-146Z/public-site-audit.json`
- Live browser sanity checked `/founder-pilot` desktop/mobile without submitting production demo interest.
