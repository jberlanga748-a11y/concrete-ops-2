# Apex HQ Agent Execution Board

Status: active business execution board
Scope: business, marketing, sales, launch planning only

## Rule

Agents can draft, organize, summarize, and prepare business work.

Agents must not:

- touch app code
- send email/text automatically
- make phone calls
- deploy
- commit/push
- change production files
- promise features or results

## Active Agent Lanes

| Lane | Output Docs | Purpose |
| --- | --- | --- |
| Customer-facing copy | `CUSTOMER_ONE_PAGE_HANDOUT.md`, `WEBSITE_PAGE_OUTLINES.md` | give John sendable/sellable public copy |
| Content engine | `CONTENT_POST_LIBRARY.md` | make 60+ ready-to-post contractor posts |
| Partner/channel | `PARTNER_OUTREACH_PLAYBOOK.md`, `PARTNER_TARGET_TRACKER.md` | build referral/partner outreach system |
| Week 1 sales ops | `WEEK_1_EXECUTION_PLAN.md`, `DAILY_CALL_NOTE_INTAKE.md`, `FOLLOW_UP_DRAFT_BANK.md` | turn plan into daily action and follow-ups |

## How John Uses This

Morning:

1. Open `WEEK_1_EXECUTION_PLAN.md`.
2. Open `DAILY_OUTREACH_CALL_SHEET.md`.
3. Make calls.
4. Paste call notes into Codex using `DAILY_CALL_NOTE_INTAKE.md`.

Midday:

1. Use `FOLLOW_UP_DRAFT_BANK.md` for replies.
2. Use `OUTREACH_TRACKER.md` to update status.
3. Use `CUSTOMER_ONE_PAGE_HANDOUT.md` if someone asks for info.

Afternoon:

1. Use `PARTNER_OUTREACH_PLAYBOOK.md` for supplier/material yard/GC outreach.
2. Use `PARTNER_TARGET_TRACKER.md` to track referral sources.

Evening:

1. Pick one post from `CONTENT_POST_LIBRARY.md`.
2. Update `CEO_DASHBOARD.md`.
3. Ask Codex to prep tomorrow's call sheet.

## Current Business Priority

The priority is not more planning.

The priority is:

```text
Calls -> demos -> pilots -> paid conversions -> referrals -> retention.
```

## Agent Follow-Up Prompts

Use after calls:

```text
Use DAILY_CALL_NOTE_INTAKE.md. Here are my notes. Update the recommended tracker status, draft follow-up email/text, and tell me the next best action.
```

Use at end of day:

```text
Summarize today's outreach from these notes. Update the CEO dashboard metrics in plain text and prep tomorrow's top 5 actions.
```

Use weekly:

```text
Use the outreach tracker and CEO dashboard to create a weekly sales report: calls, replies, demos, pilots, objections, pricing feedback, and next week's priorities.
```
