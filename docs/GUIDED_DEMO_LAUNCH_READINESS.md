# Apex HQ Guided Demo Launch Readiness

Status: refreshed after live v496 and demo app v71; warm-demo ready with notes
Owner: Apex HQ Master Coordinator
Use with: `docs/SALES_DEMO_PLAYBOOK.md`, `docs/DEMO_LAUNCH_PACKET.md`, `docs/FOUNDER_PILOT_ONBOARDING_PACKET.md`, `docs/PILOT_KICKOFF_AND_CHECKIN_TEMPLATES.md`, and `docs/DEMO_READY_CHECKLIST.md`

## Current Verdict

Apex HQ is ready for guided warm demos and founder-led pilot conversations.

It is not yet positioned as public self-serve SaaS, enterprise-ready procurement software, or an autonomous AI platform.

## Live Rehearsal Result

Date: 2026-05-17
Environment: `https://app.apexhq.online`
Release: Fly `v496`
Evidence:

- Desktop audit manifest: `C:\Users\jberl\AppData\Local\Temp\apex-guided-demo-v496-live-desktop\2026-05-17T22-46-05-531Z\manifest.json`
- Focused route/mobile results: `C:\Users\jberl\AppData\Local\Temp\apex-guided-demo-v496-live-focused\2026-05-17T22-47-30-393Z\focused-results.json`

Result:

- No P0/P1 blockers found.
- No console errors found.
- No failed API/network requests found.
- No horizontal overflow found across checked desktop/mobile pages.
- Field users remained blocked from office/admin/pricing/estimate surfaces through direct route checks.
- `npm.cmd run verify:demo`, `npm.cmd run verify:roles`, and `git diff --check` passed.

Note:

- The separate demo app at `https://concrete-ops-demo.fly.dev/` was refreshed to Fly `v71` after rehearsal found the documented demo password was rejected there.
- Demo app release `v71` restored documented demo authentication for `demo.ops@apexhq.app`, `demo.admin@apexhq.app`, `demo.foreman@apexhq.app`, and `demo.employee@apexhq.app`.
- Check `https://concrete-ops-demo.fly.dev/api/ready` before using the separate demo app for a guided walkthrough.

The first demo goal is simple:

```text
Show a contractor how Apex HQ keeps leads, estimates, jobs, crews, photos, reports, tickets, safety items, reminders, and follow-ups from getting scattered.
```

## Demo Position

Say:

```text
Apex HQ is a contractor operations platform entering a controlled founder-led demo and pilot phase.
```

Do not say:

- fully launched public SaaS
- guaranteed jobs
- replaces QuickBooks
- replaces payroll
- AI runs your business for you
- automatic email/SMS sending
- enterprise-compliance ready

## Clean Demo Path

Use this order for the first guided walkthroughs.

| Step | Page / workflow | What to show | Why it matters |
| --- | --- | --- | --- |
| 1 | Login | Owner/admin login works and lands in the app cleanly. | Establishes trust immediately. |
| 2 | Command Center | Operations strip, today's work, reminders, proof/review areas. | Shows the owner what needs attention. |
| 3 | Schedule / Today's Work | Today/tomorrow jobs, crew assignment, missing activity. | Answers "who is going where?" |
| 4 | Leads / Customers | Lead/customer context without scattered notes. | Shows front-office organization. |
| 5 | Estimates | Rough Notes, company branding, options, attachments, packet direction. | Shows win-more-work value. |
| 6 | Jobs | Job status, crew/job context, field handoff direction. | Shows estimate-to-execution continuity. |
| 7 | Field mobile path | Today's job, clock, upload photos, daily report, ticket/checklist. | Shows field practicality. |
| 8 | Uploads / Reports / Tickets | Proof of work is visible and tied to the job/day. | Shows billing/dispute protection. |
| 9 | Notifications / Watchtower | Missing work and follow-ups are surfaced. | Shows less owner chasing. |
| 10 | Support / Trust | Support handoff, owner health, trust readiness. | Shows this is maintained and founder-led. |

## 15-Minute Talk Track

Minute 0-2:

```text
I will keep this practical. Apex HQ is built to keep a contractor's leads, estimates, jobs, crews, photos, reports, tickets, safety items, and follow-ups organized in one place.
```

Minute 2-5:

- Open Command Center.
- Point to today's work, crews, reminders, proof, review, and billing readiness.
- Say: "The owner should not have to carry the whole company in their head."

Minute 5-8:

- Open Schedule / Today's Work.
- Show crew/job assignment and missing activity.
- Say: "This answers who is going where today and what still needs attention."

Minute 8-11:

- Open one lead/customer/estimate path.
- Show estimate/proposal direction, AI Rough Notes as review-only help, options, branding, and packet direction.
- Say: "The goal is cleaner paperwork that turns into a cleaner job handoff."

Minute 11-14:

- Show job and field proof path.
- Show where a foreman/employee sees today's job and submits proof.
- Say: "The field side should stay simple. They should not see pricing, leads, admin tools, or office-only data."

Minute 14-15:

```text
If we tested this with one real workflow for 14 days, which workflow would save you the most chasing: estimates, job handoff, photos, reports, or follow-ups?
```

## 30-Minute Talk Track

| Time | Focus | Goal |
| --- | --- | --- |
| 0-5 | Discovery | Learn what is scattered today. |
| 5-10 | Command Center | Show owner/admin operating visibility. |
| 10-15 | Estimate/proposal | Show rough notes, packets, options, branding, and manual-send control. |
| 15-20 | Job and schedule | Show who is assigned, what is active, and what needs attention. |
| 20-25 | Field proof | Show photos, reports, tickets, checklists, safety, and owner review. |
| 25-30 | Pilot close | Pick one workflow and set day-3/day-10 follow-ups. |

## Owner/Admin Demo Checklist

Pass only if the owner/admin can understand these without a long explanation:

- what jobs are active
- who is assigned
- what reports/photos/tickets are missing
- what estimates or follow-ups need action
- where job proof lives
- where support/help lives
- what Apex Assistant can and cannot do today

## Field Demo Checklist

Pass only if a field user can understand these quickly:

- what job they are on today
- where to upload photos
- where to complete the daily report
- where tickets/checklists/safety items live
- how to avoid office-only pages
- bottom navigation does not cover key actions

## Rehearsal QA

Before warm demos, rehearse:

- owner/admin desktop path
- owner/admin mobile sanity path
- foreman/mobile field path
- employee role safety
- estimate/proposal packet path
- no visible junk/test data
- no console/API failures
- no horizontal overflow

Suggested focused commands:

```text
npm.cmd run verify:demo
npm.cmd run verify:roles
git diff --check
```

Browser evidence to capture:

- Command Center desktop screenshot
- Command Center mobile screenshot
- field mobile screenshot
- estimate/proposal screenshot
- console/network notes

## Pilot Handoff

After the demo, do not try to sell every feature.

Pick one workflow:

```text
estimate/job setup -> field handoff -> photo/report proof -> owner review -> follow-up
```

Capture:

- contractor name
- trade
- crew count
- current tools
- chosen workflow
- owner/admin user
- field user if needed
- day-3 check-in date
- day-10 value review date
- success criteria in plain language

Use `docs/PILOT_KICKOFF_AND_CHECKIN_TEMPLATES.md` once a good-fit contractor agrees to the 14-day pilot.

## Demo Go / No-Go

Go for warm demos if:

- owner/admin path is clean
- one field path is clean
- known junk data is not visible
- role safety is verified
- the pitch stays founder-led and honest

No-go if:

- junk/test data appears in the main path
- field users can access office/admin/pricing
- estimate/proposal path looks broken
- AI appears to promise actions it cannot safely complete
- the walkthrough depends on unsupported billing, payroll, customer portal, or autonomous sending

## Next Product Gate

After the refreshed guided demo, the next gate is business execution, not another app build:

```text
Founder-led demo execution and controlled pilot feedback
```

Use:

- `docs/FIRST_10_DEMO_TARGETS.md`
- `docs/OUTREACH_TRACKER.md`
- `docs/PILOT_TERMS_AND_SUPPORT_POLICY.md`
- `docs/CUSTOMER_DATA_POLICY_DRAFT.md`

Only start another app phase when a guided demo or pilot exposes:

- a blocker in the first workflow
- a role/permission issue
- visible demo data problem
- mobile field workflow problem
- narrow missing workflow needed to convert a real pilot
