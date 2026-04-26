# Concrete Ops Demo

Demo URL placeholder:
- [https://concrete-ops-demo.fly.dev/](https://concrete-ops-demo.fly.dev/)

Demo logins:
- Admin: `demo.admin@concreteops.app`
- Foreman: `demo.foreman@concreteops.app`
- Employee: `demo.employee@concreteops.app`
- Password: shared privately for the demo deployment. If the deployment explicitly uses the shared demo password, it is `demo12345` and is demo-only.

Public estimate request:
- Public form placeholder: [https://concrete-ops-demo.fly.dev/request-estimate](https://concrete-ops-demo.fly.dev/request-estimate)

Main sales message:
- Office sees the business.
- Foreman sees field execution.
- Employee sees assigned work only.
- Public form captures leads.

5-minute admin walkthrough:
1. Log in as Demo Admin.
2. Show Leads and point out the public request lead source.
3. Show Customers.
4. Show Jobs.
5. Show Employees.
6. Show crew assignments on active jobs.
7. Show Time and weekly hours.
8. Show Daily Reports.
9. Show Uploads / Photo Evidence.
10. Show Safety & PPE.
11. Show Tool Checklist.
12. Show Concrete Calculator and saved takeoffs.
13. Show Pre-Pour and Post-Pour checklists.
14. Show Change Order Requests.
15. Show Delivery Tickets.
16. Show Estimates and the approved estimate linked to a live job.
17. Log out.

Foreman walkthrough:
1. Log in as Demo Foreman.
2. Show assigned and field-visible jobs.
3. Show Clock In / My Time.
4. Show Daily Reports.
5. Show Upload Photo.
6. Show Safety & PPE.
7. Show Tool Checklist.
8. Show Calculator.
9. Show Pre-Pour and Post-Pour.
10. Show Change Order Requests and Delivery Tickets.
11. Log out.

Employee walkthrough:
1. Log in as Demo Employee.
2. Show assigned job visibility only.
3. Show Clock In / My Time.
4. Show Upload Photo.
5. Show Safety & PPE.
6. Show Tool Checklist.
7. Show Calculator.
8. Log out.

Public estimate request walkthrough:
1. Open the public estimate request page.
2. Submit a fake driveway, patio, sidewalk, or ADA ramp request.
3. Log in as Demo Admin.
4. Show the new lead with source `public_request_form`.
5. Explain how that request can move into an estimate and then a job without exposing office pricing to field users.

What not to show:
- Do not show real production data.
- Do not share source code during demos.
- Do not share owner credentials or any real private passwords.

Demo mode safety:
- Demo reset should only be used when `DEMO_MODE=true`.
- Public estimate requests can be disabled with `PUBLIC_ESTIMATE_REQUEST_ENABLED=false`.
- Demo data is fake and intentionally separated from real contractor records.
- Do not enable `DEMO_MODE` on the real production app with real customer data. Use a separate demo deployment and separate SQLite volume whenever possible.
- On an existing database, demo backfill should be additive only: demo users and demo-prefixed records may be added, but real users and real contractor records must not be overwritten.
