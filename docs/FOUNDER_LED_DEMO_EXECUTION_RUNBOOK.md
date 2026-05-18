# Apex HQ Founder-Led Demo Execution Runbook

Status: active runbook
Use for: running the first guided demos and turning real conversations into product decisions

## Purpose

This runbook keeps founder-led demos practical, controlled, and honest. It should help John run the next conversations without drifting into broad feature promises, unsupported claims, or random app builds.

The goal is not to show every feature. The goal is to learn which contractor workflow is painful enough to become a paid pilot.

## Current Position

Use this framing:

```text
Apex HQ is a contractor operations platform entering founder-led demos and controlled pilots.
```

Plain version:

```text
It helps contractors keep leads, estimates, jobs, crews, photos, reports, tickets, safety items, and follow-ups organized in one place.
```

Avoid:

- guaranteed leads, jobs, revenue, or payment speed
- public self-serve SaaS claims
- enterprise-ready, SOC 2, bank-level, or fully compliant claims
- accounting, payroll, or QuickBooks replacement claims
- AI autopilot, automatic sending, automatic pricing, automatic crew assignment, or hidden GPS tracking
- custom feature promises during first demos

## Before Every Demo

### 1. Confirm Fit

The best first demos are with contractors who have:

- active leads, estimates, or jobs
- owner/admin willing to talk through workflow pain
- photos, reports, tickets, follow-ups, or job notes scattered across tools
- one workflow they are willing to test for 14 days

Pause if the contractor mainly wants:

- guaranteed leads
- payroll/accounting replacement
- enterprise procurement
- full migration before testing one workflow
- custom software before seeing the core workflow

### 2. Check Live Readiness

Before a scheduled walkthrough, check:

```powershell
npm.cmd run verify:founder-demo
npm.cmd run brief:founder-demo
Invoke-WebRequest -UseBasicParsing -Uri https://app.apexhq.online/api/ready
Invoke-WebRequest -UseBasicParsing -Uri https://concrete-ops-demo.fly.dev/api/ready
```

Use `npm.cmd run verify:founder-demo` as the first local readiness gate. It checks the founder-led demo packet, tracker consistency, manual-only boundaries, the live production/demo readiness endpoints, and the read-only demo brief generator. Use `npm.cmd run brief:founder-demo` when you want the day-of manual action queue without rerunning every readiness check. The brief does not send outreach, mutate tracker rows, create accounts, or change production data.

### 3. Pick The First Workflow

Default demo workflow:

```text
lead/estimate -> job setup -> field handoff -> photo/report proof -> owner review -> follow-up
```

If the contractor is solo, emphasize:

- leads/customers
- estimates/proposals
- job notes
- photos/proof
- follow-up

If the contractor has crews, emphasize:

- job handoff
- foreman/employee mobile view
- uploads/reports
- delivery tickets/checklists/safety
- owner review

## 15-Minute Demo Flow

| Time | Action | Goal |
| --- | --- | --- |
| 0-2 | Ask what gets scattered today. | Make the demo about their pain, not features. |
| 2-4 | Open owner/admin view. | Show the owner does not have to carry everything in their head. |
| 4-7 | Show lead/customer/estimate context. | Show how work starts and follow-up stays visible. |
| 7-10 | Show job and field handoff. | Show how the field gets the right job context. |
| 10-12 | Show photo/report/proof review. | Show why billing/review can move cleaner. |
| 12-15 | Ask which workflow is worth testing. | Convert interest into one controlled pilot decision. |

Close with:

```text
If we tested one real workflow for 14 days, which one would save you the most chasing: estimates, job handoff, photos, reports, or follow-ups?
```

## 30-Minute Demo Flow

| Time | Action | Goal |
| --- | --- | --- |
| 0-5 | Discovery | Learn lead sources, estimate process, field handoff, proof, and follow-up pain. |
| 5-10 | Owner/admin view | Show command center, leads/customers, estimates/jobs, and support/trust handoff. |
| 10-15 | Estimate/proposal path | Show rough notes, options, packet direction, and review-first AI boundaries if relevant. |
| 15-20 | Job/field path | Show job details, assigned work, upload, report, ticket/checklist/safety where relevant. |
| 20-25 | Owner review | Show missing proof, follow-ups, and support-led package/trust path. |
| 25-30 | Pilot close | Pick one workflow, user roles, day-3 check-in, and day-10 value review. |

## What To Log Immediately After

Update `docs/OUTREACH_TRACKER.md` only after the conversation actually happened.

Use `docs/DEMO_RECAP_AND_PILOT_FIT_TEMPLATES.md` to turn the conversation into a pilot fit decision before drafting any follow-up.

Log:

- company
- person
- trade
- crew count
- current tools
- biggest pain in their words
- best workflow to pilot
- what they liked
- what confused them
- exact objections
- pricing reaction
- demo booked/completed status
- pilot fit
- next step and date

If they say something useful, copy the exact words into `docs/REAL_OBJECTION_BANK.md`.

## Objection Capture Rules

Expected objections are helpful, but real wording matters more.

Capture:

```text
Date:
Company:
Person:
Exact objection:
What they meant:
Response used:
Did it work?
Better response next time:
```

Do not sanitize the wording too much. The buyer's language is the product and messaging signal.

## Pilot Offer Criteria

Offer a pilot only if:

- they named a real workflow pain
- they are willing to test one workflow
- owner/admin will participate
- one field user is available if field workflow matters
- they accept that the pilot is not a custom build
- they understand no automatic sending, payroll, accounting, or guaranteed leads are included

Use:

```text
Based on what you told me, I would not try to switch everything at once. I would set up one workflow for 14 days, check in after day 3, and decide after day 10 if it is worth continuing.
```

After a strong-fit prospect accepts a pilot, use `docs/PILOT_KICKOFF_AND_CHECKIN_TEMPLATES.md` for kickoff intake, first workflow setup, day-3 check-in, day-10 value review, support capture, and continue/adjust/stop criteria.

## After-Demo Follow-Up

Send only after John approves/sends manually.

Use `docs/DEMO_RECAP_AND_PILOT_FIT_TEMPLATES.md` for strong-fit, medium-fit, not-fit, feature-not-ready, and price-question follow-ups.

Template:

```text
Thanks for taking a look at Apex HQ today. The workflow that sounded most useful was [workflow].

I would keep the pilot narrow: set up [workflow], use it on real work for 14 days, check in on day 3, and decide around day 10 if it saves enough chasing to keep going.

No custom build, no long contract, and no automatic messages. Just a clean test around the workflow you said matters.

Next step would be [kickoff time or decision].
```

## Daily Execution Loop

At the end of each day, update:

- `docs/OUTREACH_TRACKER.md`
- `docs/REAL_OBJECTION_BANK.md`
- `docs/FIRST_10_DEMO_TARGETS.md` if target priority changes

Daily summary:

```text
Date:
Conversations:
Demos booked:
Demos completed:
Pilots offered:
Pilots accepted:
Best pain heard:
Best objection heard:
Script change:
Product blocker:
Tomorrow top 5:
```

## Build Trigger Rules

Do not start a new app build because of curiosity.

Start a build only when a demo or pilot exposes:

- P0/P1 role or permission issue
- visible demo data problem
- broken guided-demo path
- mobile field workflow blocker
- repeated confusion that blocks pilot conversion
- narrow missing workflow needed for a good-fit pilot

Before building, write:

```text
Who said it:
Exact pain:
Workflow affected:
Why existing app cannot handle it:
Smallest safe fix:
Verification needed:
```

## Safe To Say

- "Founder-led demos are open."
- "Controlled pilots are available for good-fit contractors."
- "The first pilot tests one workflow."
- "AI help is review-first where available."
- "Apex HQ is meant to reduce scattered job information and owner chasing."

## Do Not Say

- "This guarantees more jobs."
- "This replaces QuickBooks or payroll."
- "AI will run the business."
- "We are enterprise-ready."
- "No setup is required."
- "Your crew will definitely use it."
- "We can build whatever you need before the pilot."
