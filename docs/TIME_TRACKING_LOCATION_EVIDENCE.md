# Time Tracking Location Evidence

## Scope

The first time-clock GPS slice is explicit evidence capture only:

- A worker may tap `Capture location` before clock-in or clock-out.
- The app stores the captured coordinates, accuracy, and captured timestamp on that time entry action.
- If the browser denies, times out, or cannot provide location, the app stores a short unavailable reason instead of blocking time tracking.

## Boundaries

- No hidden GPS tracking.
- No background location collection.
- No continuous employee tracking.
- No geofence distance checks or jobsite-leave alerts yet.
- No automatic payroll, discipline, HR, job-status, SMS, email, or push action.
- Location evidence is company-scoped and role-scoped with the existing time-entry visibility rules.

## Next Gate

Jobsite departure alerts require a separate approval gate with company settings, worker-facing consent language, audit history for enabling/disabling location policy, and review-first alert language. Until then, Apex HQ may show only captured or unavailable GPS evidence on the time entry.
