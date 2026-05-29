# Time Tracking Location Evidence

## Scope

The first time-clock GPS slice is explicit evidence capture only:

- A worker may tap `Capture location` before clock-in or clock-out.
- The app stores the captured coordinates, accuracy, and captured timestamp on that time entry action.
- If the browser denies, times out, or cannot provide location, the app stores a short unavailable reason instead of blocking time tracking.
- Company admins must enable the Time GPS Evidence policy in Settings before any clock-in/out location payload is accepted.
- The policy includes a worker-facing notice, is scoped to the company, and writes an audit event when enabled, disabled, or changed.
- Company admins may also enable a review-only presence check. It compares captured clock-out GPS to the captured clock-in GPS anchor for the same job-linked time entry using the company radius.

## Boundaries

- No hidden GPS tracking.
- No background location collection.
- No continuous employee tracking.
- No live geofence monitoring or jobsite-leave alerts yet.
- Presence review labels are not automatic conclusions. `Presence needs review` means a manager should review context before using the entry for payroll, discipline, or job status decisions.
- No automatic payroll, discipline, HR, job-status, SMS, email, or push action.
- Location evidence is company-scoped and role-scoped with the existing time-entry visibility rules.

## Next Gate

Jobsite departure alerts require a separate approval gate with live-location consent, worker-facing language, notification controls, and review-first alert language. Until then, Apex HQ may show only captured/unavailable GPS evidence and review-only presence labels after the company policy is enabled.
