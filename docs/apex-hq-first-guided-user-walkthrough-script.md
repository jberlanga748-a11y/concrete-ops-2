# Apex HQ First Guided User Walkthrough Script

Status: first friendly-user walkthrough script  
Audience: founder-led fencing contractor pilot  
Use with: `docs/apex-hq-one-page-pilot-onboarding-checklist.md` and `docs/apex-hq-pilot-feedback-intake-form.md`

## Purpose

Use this script for the first live walkthrough with a friendly contractor. Keep the session narrow, practical, and honest: Apex HQ is ready for a guided pilot workflow, not public self-serve launch.

## Positioning

Say:

```text
I want to show you one practical workflow, not sell you the whole app at once.

The goal is to see whether Apex HQ helps keep a fencing lead, estimate, job, schedule, field proof, and owner review from getting scattered across texts, notes, and memory.
```

Do not say:

- Apex HQ is fully launched.
- Apex HQ guarantees more jobs.
- The AI will bid, message, or price work automatically.
- This replaces accounting, payroll, or payments.
- This is ready to be the only system of record.

## Before The Call

- Open the Fly demo: `https://concrete-ops-demo.fly.dev`
- Confirm the demo is healthy through `/api/ready`.
- Keep production out of the conversation unless specifically asked.
- Have one fencing workflow ready:
  - lead or opportunity
  - estimate/proposal
  - job and schedule
  - field photos/report/upload
  - support/feedback capture
- Keep current customer systems as backup during any pilot.

## 20-Minute Walkthrough

### 1. Set The Frame

```text
I am going to keep this to one workflow. If it does not feel useful, we stop there. If it does, we can test it for a few days with your real work while you keep your current system as backup.
```

Confirm:

- trade focus
- crew size
- current estimate/schedule/photo workflow
- what gets lost most often

### 2. Command Center

Route: `/command-center`

Show:

- today’s work
- jobs needing proof
- reports/uploads needing review
- next actions

Ask:

```text
Would this help you see what needs attention without digging through texts?
```

### 3. Leads / Opportunity

Route: `/leads`

Show:

- a fencing lead or opportunity
- follow-up status
- missing info
- next action

Say:

```text
This is where the work starts before it becomes an estimate or job.
```

### 4. Estimate Studio

Route: `/estimates`

Show:

- branded proposal surface
- selected option/detail
- jobsite photo/takeoff preview
- scope of work
- inclusions and exclusions
- company/customer/project rail
- manual send mode

Say:

```text
The estimate should look professional, but the bigger point is that the estimate can carry into job handoff instead of becoming a dead PDF.
```

Make clear:

- no payment collection
- no automatic send
- no automatic approval
- field users cannot see pricing

### 5. Jobs And Schedule

Routes: `/jobs`, `/schedule`

Show:

- active job board
- crew/status/proof/safety context
- scheduled work
- next action

Say:

```text
This is the bridge between the office estimate and what the crew actually needs to know.
```

### 6. Field Phone Flow

Routes: `/jobs`, `/reports`, `/uploads` as field user

Show:

- Field Mode
- today’s required items
- upload photos
- daily report
- checklist or proof item

Say:

```text
The field side is intentionally smaller. The crew should see the work they need, not the whole office.
```

Confirm:

- field user does not see estimates
- field user does not see pricing
- field user does not see owner/admin settings

### 7. Reports / Uploads Proof Engine

Routes: `/reports`, `/uploads`

Show:

- proof intake
- missing/ready/review states
- report and photo context
- owner review path

Ask:

```text
Would having job proof organized this way save you from chasing photos or updates later?
```

### 8. Support And Feedback

Route: `/support`

Show:

- support categories
- issue severity
- safe handoff language

Say:

```text
During the pilot, every issue gets logged as training, setup, bug, blocker, or future idea. We only build from real pilot blockers.
```

## Close The Call

Ask:

```text
If we tested one workflow for 3-5 days, which workflow would be most useful?
```

Choose one:

- lead -> estimate -> follow-up
- estimate -> job -> schedule
- job -> field photo/report/upload
- field proof -> owner review

Then confirm:

- owner/admin user
- field user if needed
- first real record
- Day 3 check-in
- Day 10 review

## Red Flags

Pause the pilot if the contractor needs:

- guaranteed uptime
- production-only system of record
- accounting/payroll/payment replacement
- automatic customer outreach
- automatic bidding
- custom build promises before pilot value is proven

## Success Signal

The walkthrough is successful if the contractor says one of these:

- “That would save me chasing.”
- “That would help my crew know what to do.”
- “That would make estimates look cleaner.”
- “I would try that on one job.”
- “Can we test it with my real workflow?”

## After The Call

Immediately fill out:

- pilot workflow selected
- first real record
- user roles needed
- Day 3 check-in date
- Day 10 review date
- issues or objections
- whether this is demo-only, 3-5 day validation, or paid founder pilot

Production deploy remains locked unless approved through the backup-first release checklist.
