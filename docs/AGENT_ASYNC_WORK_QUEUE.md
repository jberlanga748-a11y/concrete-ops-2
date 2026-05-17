# Apex HQ Agent Async Work Queue

Status: business/marketing coordination system
Purpose: let Codex keep useful business work organized while the founder is making calls, setting up email, or handling other work.

## What This Queue Is For

Use this file to park business tasks that an agent can draft, organize, research, or prepare without touching app code.

Good async agent tasks:

- clean outreach copy
- build call notes into follow-up drafts
- summarize objections
- update customer tracker docs
- draft demo recap emails
- draft pilot setup plans
- organize referral lists
- turn notes into testimonial requests
- build local contractor target lists
- prepare weekly sales summary
- improve pricing/offer docs

Bad async agent tasks for this chat:

- app code changes
- deployment
- package installs
- database/schema work
- production config
- billing implementation
- automatic email/SMS sending
- ad publishing or spend

## Working Rule

Founder does calls and live conversations.

Agent prepares:

- drafts
- trackers
- summaries
- follow-ups
- next-step lists
- decision support

Agent does not send messages or make claims that a human has not reviewed.

## Daily Async Workflow

### Before Calls

Founder asks:

```text
Prep today’s call list from OUTREACH_SEND_QUEUE.md and give me the top 5 call openers, likely objections, and best pilot angle for each.
```

Agent returns:

- call list
- opener
- pilot angle
- objection prep
- next action

### After Calls

Founder drops rough notes:

```text
Call notes:
- Company:
- Person:
- What they said:
- Pain:
- Objections:
- Next step:
Turn this into tracker updates and follow-up drafts.
```

Agent returns:

- cleaned call summary
- recommended status
- follow-up email/text
- demo or pilot next step
- risk/fit note

### End Of Day

Founder asks:

```text
Summarize today’s outreach, update what should happen tomorrow, and tell me the best next 5 touches.
```

Agent returns:

- completed touches
- replies
- demos booked
- stuck leads
- tomorrow queue
- script improvements

## Standing Agent Tasks

Use these when you want Codex to keep moving while you are busy.

### Task 1: Prep Tomorrow Outreach

Prompt:

```text
Business docs only. Do not touch app code. Prep tomorrow’s Apex HQ outreach from OUTREACH_SEND_QUEUE.md. Create a short call sheet with company, best channel, opener, likely pain, likely objection, and next action.
```

Output doc:

- `docs/DAILY_OUTREACH_CALL_SHEET.md`

### Task 2: Turn Notes Into Follow-Ups

Prompt:

```text
Business docs only. Do not touch app code. Use these rough call/demo notes and draft follow-up email, follow-up text, tracker status, and next recommended action.
```

Output:

- chat response or `docs/FOLLOW_UP_DRAFTS.md`

### Task 3: Build Weekly Sales Report

Prompt:

```text
Business docs only. Do not touch app code. Summarize this week’s Apex HQ outreach progress, objections, demos booked, pilot opportunities, and recommended changes to scripts.
```

Output doc:

- `docs/WEEKLY_SALES_REPORT.md`

### Task 4: Create Referral Follow-Up List

Prompt:

```text
Business docs only. Do not touch app code. From the outreach notes, create a referral follow-up list with who to ask, what to say, and when to ask.
```

Output doc:

- `docs/REFERRAL_FOLLOW_UP_LIST.md`

## Automation Option

Once the founder chooses a schedule, Codex can set a recurring reminder/check-in for business work.

Useful options:

- every weekday morning: prep call sheet
- every weekday afternoon: ask for call notes and draft follow-ups
- every Friday: produce weekly sales report

Recommended first automation:

```text
Every weekday at 8:00 AM, prep the Apex HQ daily outreach call sheet from the current send queue and remind me what to do first.
```

This should be created only when the founder confirms the time and cadence.

## Current Open Queue

| Priority | Task | Status | Output |
| --- | --- | --- | --- |
| High | Set up business email/domain | Waiting on founder | `BUSINESS_EMAIL_SETUP_CHECKLIST.md` |
| High | Review demo readiness sheet | Ready | `DEMO_READINESS_SHEET.md` |
| High | Prepare Day 1 call sheet | Ready to run | `DAILY_OUTREACH_CALL_SHEET.md` |
| Medium | Track first call results | Waiting on calls | follow-up drafts |
| Medium | Build first weekly sales report | Waiting on activity | `WEEKLY_SALES_REPORT.md` |
