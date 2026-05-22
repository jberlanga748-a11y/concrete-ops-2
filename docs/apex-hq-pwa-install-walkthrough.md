# Apex HQ Phone And Tablet Install Walkthrough

Status: Sunday pilot install guide  
Audience: founder-led pilot owner/admin, foreman, and field user  
Use with: `docs/apex-hq-one-page-pilot-onboarding-checklist.md`

## Purpose

Use this during the first guided pilot setup so Apex HQ opens like an app on the user's phone or tablet.

This is install guidance only. Apex HQ still needs an internet connection for current pilot workflows. Do not promise offline editing, background sync, automatic sending, payments, or production-only system-of-record behavior.

## Before You Start

- Confirm the correct environment:
  - Demo walkthrough: `https://concrete-ops-demo.fly.dev`
  - Customer pilot: use only the approved customer pilot URL after setup approval.
- Confirm the user can log in before adding the app to the home screen.
- Confirm the user's role:
  - Owner/admin: office workflows such as Command Center, Leads, Estimates, Jobs, Schedule, Reports, Uploads, Support.
  - Foreman/employee: field-safe workflows such as Jobs, Reports, Uploads, Time, and assigned checklists.
- Keep the contractor's current tools as backup during the pilot.

## iPhone Or iPad

1. Open Safari.
2. Go to the approved Apex HQ URL.
3. Log in once and confirm the correct role opens.
4. Tap the Share button.
5. Tap Add to Home Screen.
6. Keep the name as Apex HQ.
7. Tap Add.
8. Open Apex HQ from the new home screen icon.

Quick check:

- Owner/admin should land in the office app and see Command Center or the selected pilot workflow.
- Field user should see the field-safe mobile flow and should not see estimates, pricing, settings, billing, or package controls.

## Android Phone Or Tablet

1. Open Chrome.
2. Go to the approved Apex HQ URL.
3. Log in once and confirm the correct role opens.
4. Tap the browser menu.
5. Tap Install app or Add to Home screen.
6. Keep the name as Apex HQ.
7. Tap Install or Add.
8. Open Apex HQ from the new home screen icon.

Quick check:

- App chrome should feel like the dark Apex shell, not a random browser tab.
- Field shortcuts should stay field-safe: Jobs, Reports, Uploads, and Time.
- If Chrome only offers Add to Home screen instead of Install app, use that for the pilot and continue.

## Desktop Or Laptop

1. Open Chrome or Edge.
2. Go to the approved Apex HQ URL.
3. Log in and confirm the user sees the correct workflow.
4. Use the browser install button if shown in the address bar, or use the browser menu and choose Install Apex HQ.
5. Pin the installed app to the taskbar or dock if useful.

Desktop install is optional. For the first Sunday pilot, prioritize the owner/admin laptop and one field phone.

## First Launch Test

Run this before leaving setup:

| Role | Open | Confirm |
| --- | --- | --- |
| Owner/admin | `/command-center` | Today, jobs, proof, and next actions are visible. |
| Owner/admin | `/estimates` | Pricing and proposal tools are visible only to office users. |
| Owner/admin | `/support` | Support or pilot feedback can be captured manually. |
| Field user | `/jobs` | Assigned job or field-safe empty state appears. |
| Field user | `/reports` | Daily report workflow is reachable. |
| Field user | `/uploads` | Photo/proof upload workflow is reachable. |
| Field user | `/time` | Time tracking workflow is reachable. |

Field-user safety check:

- Field user cannot access owner/admin settings.
- Field user cannot access package controls.
- Field user cannot access pricing or internal estimate tools.
- Field user cannot access billing surfaces.

## What To Say

```text
This makes Apex HQ easier to open from your phone or tablet, like an app. For the pilot, keep your current tools as backup. Apex HQ still needs internet, and we are only testing the selected workflow.
```

## If Install Does Not Show

- Confirm the page is using `https://`.
- Refresh the page.
- Log in once, then try the browser menu again.
- On iPhone/iPad, use Safari. Chrome on iOS may not show the same install flow.
- On Android, use Chrome if possible.
- If install still does not show, bookmark the approved URL and continue the pilot. Do not block the walkthrough on install.

## Support Notes To Capture

- Device type and browser.
- Role: owner, admin, foreman, or employee.
- URL used.
- Whether the install prompt appeared.
- Whether the home screen icon launched successfully.
- Any role mismatch or blocked route issue.
- Screenshot if available.

Production deploy remains locked unless approved through the backup-first release checklist.
