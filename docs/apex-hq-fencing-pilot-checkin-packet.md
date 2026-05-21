# Apex HQ Fencing Pilot Check-In Packet

Status: template for the first friendly fencing pilot

Use this after the guided walkthrough and intake gate pass. It keeps the pilot from turning into vague feedback by forcing Day 3 and Day 10 decisions.

## Command

```powershell
npm.cmd run pilot:fencing-checkins -- --company="Friendly Fence Co" --owner="Riley Owner" --field-lead="Sam Foreman" --workflow="lead / opportunity -> estimate -> job -> schedule -> field proof" --first-record="Cedar fence replacement estimate" --field-action="Upload one fence jobsite photo" --success="Owner can find proof without text search" --success="Field user uploads one photo from phone" --json
```

Do not commit real customer emails, phone numbers, credentials, or private job details to docs.

## Day 3 Questions

- Did the owner/admin log in and find the selected workflow?
- Did the field user complete the agreed phone action if field workflow is in scope?
- What still went through text, memory, notebook, or another tool?
- Where did Apex HQ feel slower than the current process?
- Is the issue training, setup, bug, blocker, or future idea?
- Should the pilot continue as-is, narrow, adjust, or stop?

## Day 10 Scorecard

Score each item 0-2:

- 0 = did not happen
- 1 = partially happened
- 2 = happened clearly

Items:

- owner can find the lead/estimate/job/proof without searching texts
- field user can complete the agreed action without office help
- reports/uploads/proof are easier to review than before
- follow-up or ready-to-bill status is clearer
- support load is manageable for founder-led pilot stage
- contractor would keep using the workflow or pay for a founder pilot

## Continue / Adjust / Narrow / Stop

- continue: pilot workflow is useful and support load is manageable
- adjust: workflow is useful but setup/training must be tightened
- narrow: one part works, but the pilot is too broad
- stop: value is unclear, support load is too high, or fit is poor

## Support Severity

- P0: data leak, auth failure, wrong-role visibility, or app unavailable
- P1: pilot-blocking workflow failure with no workaround
- P2: friction with a workaround or training need
- P3: polish, wording, or future idea

## Boundaries

- no custom build promise
- no guaranteed leads, jobs, revenue, or growth
- no AI autopilot, automatic bidding, pricing, sending, or customer contact
- no accounting/payroll replacement
- no public testimonial, screenshot, or logo without permission
- no production deploy or customer app handoff without approved setup
