# Manual Pilot Smoke Test

Use this checklist before or during the first contractor pilot to confirm the day-one workflow is ready. Keep it non-destructive: do not reset data, delete customer records, change permissions, or modify Fly/deployment settings while running this smoke test.

Recommended setup:
- Use the pilot workspace and a clearly named test job if possible.
- If using a real pilot job, avoid destructive actions such as archive, delete, reset, or permission changes.
- Record issues with screenshots, role, page, and exact steps to reproduce.

## Checklist

### 1. Admin/Owner Login
- Role: Admin/Owner
- Action: Open the pilot app and sign in with the owner/admin account.
- Expected result: Admin reaches the dashboard/workspace without setup, demo login, or permission errors.
- Pass/Fail: [ ] Pass [ ] Fail
- Notes:

### 2. Confirm Field Users Exist
- Role: Admin/Owner
- Action: Open Users/Employees and confirm at least one foreman and one employee exist and are active.
- Expected result: Foreman and employee accounts are visible to admin, active, and assigned the correct roles.
- Pass/Fail: [ ] Pass [ ] Fail
- Notes:

### 3. Create Or Identify One Test Job
- Role: Admin/Owner
- Action: Open Jobs and either create a clearly named test job or identify one safe pilot job to use.
- Expected result: A job exists with customer/project name, job address or location, status, and basic scope/field notes.
- Pass/Fail: [ ] Pass [ ] Fail
- Notes:

### 4. Assign Field User Or Crew
- Role: Admin/Owner
- Action: Assign the foreman and employee/crew to the selected job.
- Expected result: Job shows the assigned foreman and crew members without exposing pricing, payroll, profit, margin, or office-only notes to field roles.
- Pass/Fail: [ ] Pass [ ] Fail
- Notes:

### 5. Field User Login
- Role: Foreman or Employee
- Action: Sign out of admin, then sign in as the assigned field user.
- Expected result: Field user lands in a field-safe workspace without seeing Settings, Leads, Estimates, full Customers, pricing, payroll, profit, margin, or office-only notes.
- Pass/Fail: [ ] Pass [ ] Fail
- Notes:

### 6. Field User Sees Only Assigned Job/Workspace
- Role: Foreman or Employee
- Action: Open the field dashboard/workspace and assigned jobs area.
- Expected result: Field user can see the assigned job and only allowed field information needed for jobsite work.
- Pass/Fail: [ ] Pass [ ] Fail
- Notes:

### 7. Field User Clocks In
- Role: Foreman or Employee
- Action: Open Time/My Time and clock in to the assigned job.
- Expected result: Clock-in succeeds and shows an active time entry for the field user.
- Pass/Fail: [ ] Pass [ ] Fail
- Notes:

### 8. Field User Uploads One Job Photo
- Role: Foreman or Employee
- Action: Open Uploads/Upload Photo and upload one job photo linked to the assigned job.
- Expected result: Upload succeeds, appears in the upload/photo list, and stays scoped to the allowed job.
- Pass/Fail: [ ] Pass [ ] Fail
- Notes:

### 9. Foreman/Admin Creates Daily Report
- Role: Foreman/Admin
- Action: Open Daily Reports and create a report for the selected job with crew summary, work performed, weather, concrete poured, and yards poured.
- Expected result: Daily report saves or submits successfully and remains linked to the selected job.
- Pass/Fail: [ ] Pass [ ] Fail
- Notes:

### 10. Admin Prints Daily Report Or Job Packet
- Role: Admin/Owner
- Action: Sign in as admin, open the submitted daily report or job detail, and print the daily report or job packet.
- Expected result: Browser print view opens without a blank popup, and the packet includes appropriate job documentation without restricted field-role data leaks.
- Pass/Fail: [ ] Pass [ ] Fail
- Notes:

### 11. Confirm Field User Cannot See Sensitive Admin Pages
- Role: Foreman or Employee
- Action: While signed in as a field user, try direct navigation or visible nav access for Settings, Leads, Estimates, full Customers, pricing, payroll, profit/margin, and office-only notes.
- Expected result: Field user cannot access restricted office or money-sensitive pages/data.
- Pass/Fail: [ ] Pass [ ] Fail
- Notes:

### 12. Confirm Safety Routes Open Correctly
- Role: Admin/Foreman/Employee
- Action: Open Incidents, Toolbox Talks, and PPE from the navigation.
- Expected result: Incidents starts with incident form/list; Toolbox Talks starts with guidance and acknowledgment; PPE starts with checklist and acknowledgment.
- Pass/Fail: [ ] Pass [ ] Fail
- Notes:

## Final Pilot Readiness Decision

- Overall result: [ ] Pass [ ] Fail
- Pilot blocker found: [ ] No [ ] Yes
- If blocked, exact blocker:
- Follow-up owner:
- Date checked:
