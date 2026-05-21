# Apex HQ First Pilot Support Severity Quick Card

Status: founder-led support triage card for the first friendly pilot

Use this during a guided pilot or friendly validation. It is an internal triage aid, not a public SLA, legal promise, security claim, or pricing commitment.

## Intake Fields

Capture these before diagnosing:

- company/workspace
- user name and role
- device and browser
- page or workflow
- what the user tried to do
- expected result
- actual result
- screenshot or screen recording when available
- whether the current backup process still works
- whether customer data, role visibility, or login is involved

Do not ask users to send passwords, API keys, tokens, private payment data, or unrelated customer records.

## Severity

P0 - Stop-the-line:

- wrong user can see another company's data
- field user can access owner/admin financial, settings, package, or unrelated job data
- login is down for all pilot users
- app is unavailable during a scheduled walkthrough
- suspected data loss, data leak, or secret exposure

Action: stop the walkthrough, preserve screenshots/log context, keep the contractor on their current backup process, and do not create more users or data until the issue is understood.

P1 - Pilot-blocking:

- owner/admin cannot complete the selected pilot workflow
- field user cannot complete the agreed phone action
- reports/uploads/proof cannot be reviewed for the selected workflow
- ready-to-bill or follow-up state is unclear enough to block the pilot decision
- no practical workaround exists

Action: capture steps, use the backup process, decide whether to narrow or pause the pilot workflow, and create a focused build/QA task.

P2 - Workaround available:

- user can finish the workflow with guidance or a backup step
- wording or navigation caused confusion
- mobile layout is awkward but usable
- proof/report/schedule information is present but hard to find
- support can explain the path in one short message

Action: log the friction, classify as training/setup/product polish, and review at Day 3 or Day 10.

P3 - Nice-to-have:

- visual polish
- copy preference
- future feature idea
- trade-specific enhancement outside the approved workflow
- request to expand the pilot scope

Action: record it, do not promise a custom build, and keep the pilot focused on the selected workflow.

## Triage Labels

Use one primary label:

- setup
- training
- bug
- role/permission
- mobile
- workflow blocker
- data concern
- future idea
- poor fit

## Response Boundaries

Safe language:

- "I am going to capture this and keep you on your current backup process while I check it."
- "For this pilot, let's keep the scope to the one workflow we agreed to."
- "I will treat this as a role/data safety issue until proven otherwise."
- "This is useful feedback, but I do not want to promise a custom feature from one pilot call."

Avoid:

- guaranteed fix times
- guaranteed leads, jobs, revenue, or growth
- automatic bidding, pricing, sending, or customer contact promises
- accounting/payroll replacement claims
- public security, legal, compliance, or SLA claims
- production deploy promises

## Day 3 / Day 10 Use

At Day 3, count:

- P0/P1 issues
- repeated P2 training/setup friction
- what still went through text, memory, notebook, or another tool
- whether the current backup process stayed intact

At Day 10, decide:

- continue if value is real and support load is manageable
- adjust if setup/training needs tightening
- narrow if only one part of the workflow worked
- stop if value is unclear, support load is too high, or fit is poor

Production deploy remains locked unless approved through the backup-first release checklist.
