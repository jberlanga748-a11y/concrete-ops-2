# Apex HQ Demo

Demo URL:
- Use the separate demo Fly app URL, not the production URL.

Demo logins:
- Admin: `demo.admin@apexhq.app`
- Foreman: `demo.foreman@apexhq.app`
- Employee: `demo.employee@apexhq.app`
- Password: shared privately for the demo deployment through the approved secret channel or `APEX_SMOKE_PASSWORD`; do not store demo passwords in docs or commits.

Public estimate request:
- Public estimate request form: [https://app.apexhq.online/request-estimate](https://app.apexhq.online/request-estimate)

## Demo package profile

The primary sales demo should run as a controlled Premium workspace:

- `DEMO_MODE=true`
- `SEED_DEMO_DATA=true`
- `DEMO_PACKAGE_ID=premium`

This keeps the separate demo Fly app on Premium so owner/admin users can show AI Rough Notes, GC packets, App Health, Watchtower/Field Ops foundations, and advanced reporting without enabling Elite-only lead-finder or customer-portal surfaces.

To show Basic package locks, use `DEMO_PACKAGE_ID=basic` on a throwaway demo volume or a separate Basic demo environment. Do not switch a real production app or real pilot workspace into demo mode.

## Main sales message

Apex HQ helps contractors manage the full workflow from lead to job completion.

- Office sees the business.
- Foreman sees field execution.
- Employee sees assigned work only.
- Public estimate request form captures leads.

## 5-minute admin walkthrough

1. Log in as Demo Admin.
2. Show the Dashboard.
3. Show Leads and point out the public request lead source.
4. Show Customers.
5. Show Estimates and the approved estimate linked to a live job.
6. Show Jobs.
7. Show Employees.
8. Show crew assignments on active jobs.
9. Show Time and weekly hours.
10. Show Daily Reports.
11. Show Uploads / Photo Evidence.
12. Show Safety & PPE.
13. Show Tool Checklist.
14. Show Concrete Calculator and saved takeoffs.
15. Show Pre-Pour and Post-Pour checklists.
16. Show Change Order Requests.
17. Show Delivery Tickets.
18. Log out.

## Foreman walkthrough

1. Log in as Demo Foreman.
2. Show assigned and field-visible jobs.
3. Show My Crew / field workspace.
4. Show Clock In / My Time.
5. Show Daily Reports.
6. Show Upload Photo.
7. Show Safety & PPE.
8. Show Tool Checklist.
9. Show Concrete Calculator.
10. Show Pre-Pour and Post-Pour.
11. Show Change Order Requests.
12. Show Delivery Tickets.
13. Log out.

## Employee walkthrough

1. Log in as Demo Employee.
2. Show assigned job visibility only.
3. Show Clock In / My Time.
4. Show Upload Photo.
5. Show Safety & PPE.
6. Show Tool Checklist.
7. Show Concrete Calculator.
8. Show read-only field items where allowed.
9. Log out.

## Public estimate request walkthrough

1. Open the public estimate request page.
2. Submit a fake driveway, patio, sidewalk, ADA ramp, or slab request.
3. Log in as Demo Admin.
4. Show the new lead with source `public_request_form`.
5. Explain how that request can move into an estimate.
6. Show how an approved estimate can become a job.
7. Explain that office pricing is never exposed to field users.

## Demo story

Use this simple story when showing contractors:

1. A customer submits an estimate request.
2. Office receives it as a lead.
3. Office creates an estimate.
4. The estimate is approved and converted into a job.
5. Office assigns a foreman and crew.
6. Field users clock in, upload photos, complete reports, and use checklists.
7. Office can review reports, photos, safety, tools, change orders, delivery tickets, and job progress.

## What to show

Show how Apex HQ replaces scattered texts, paper notes, missing photos, and multiple apps with one contractor operations system.

Best modules to show in order:

1. Public Estimate Request
2. Leads
3. Estimates
4. Jobs
5. Crew Assignments
6. Time Tracking
7. Daily Reports
8. Uploads / Photo Evidence
9. Safety & PPE
10. Tool Checklist
11. Concrete Calculator
12. Pre-Pour Checklist
13. Post-Pour Checklist
14. Change Order Requests
15. Delivery Tickets

## What not to show

- Do not show real production data.
- Do not share source code during demos.
- Do not share owner credentials.
- Do not share private passwords publicly.
- Do not enable demo mode on the real production app with real customer data.

## Demo mode safety

- Demo data is fake and intentionally separated from real contractor records.
- The demo deployment should use a separate Fly app and separate SQLite volume.
- Recommended demo app: `apex-hq-demo`
- Recommended real app: Apex HQ production
- Do not point demo mode at a real customer pilot workspace.
- Demo reset should only be used when `DEMO_MODE=true`.
- `DEMO_PACKAGE_ID` accepts `basic`, `premium`, or `elite`; use `premium` for the main sales demo and `basic` only when intentionally demonstrating locked-package states.
- Public estimate requests can be disabled with `PUBLIC_ESTIMATE_REQUEST_ENABLED=false`.
- On an existing database, demo backfill should be additive only: demo users and demo-prefixed records may be added, but real users and real contractor records must not be overwritten.

## Real pilot reminder

If you are setting up a real contractor workspace, follow [CUSTOMER_PILOT_SETUP.md](CUSTOMER_PILOT_SETUP.md) instead of the demo instructions.

## Recommended contractor pitch

Apex HQ is built for contractors who need one place to manage leads, customers, estimates, jobs, crews, time, daily reports, job photos, safety, tools, checklists, change orders, and delivery tickets.

The office gets the full business view.
Foremen get job and crew execution.
Employees only get assigned work and field tools.

The goal is simple: less paperwork, fewer lost photos, better job records, and cleaner communication between the office and the field.
