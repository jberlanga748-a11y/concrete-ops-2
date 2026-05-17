# Apex HQ Autonomous GTM Workflow

Status: active workflow
Automation: `apex-hq-daily-gtm-prep`

## Purpose

This workflow lets agents prepare Apex HQ business, marketing, sales, launch, and outreach work while John is doing other things.

The agents can prepare the work.

John approves and sends anything public.

## Schedule

Runs daily at 6:00 AM.

## Workspace

```text
C:\Users\jberl\Documents\Codex\concrete-ops-2-clean
```

## What The Agent Does

Each run should:

1. Review the business plan index.
2. Review public claims guardrails.
3. Review first-10 demo targets.
4. Review outreach tracker and launch packet.
5. Research up to 3 contractor prospects using current public sources.
6. Separate verified facts from inference.
7. Update target priorities.
8. Draft outreach and follow-up messages.
9. Flag risky or unsupported claims.
10. Write a daily action brief.

Daily output:

```text
docs/AGENT_DAILY_GTM_BRIEF.md
```

## What The Agent Can Do

Allowed:

- research contractor prospects
- update business docs
- draft emails
- draft texts
- draft call notes
- draft social posts
- score ICP fit
- suggest next calls
- prepare demo follow-up
- prepare pilot close language
- flag risk
- update daily business priorities

## What The Agent Cannot Do

Not allowed:

- send emails
- send texts
- publish posts
- create ads
- spend money
- contact prospects
- claim customers, revenue, partnerships, testimonials, or legal status
- say Apex HQ is fully public self-serve SaaS
- promise guaranteed jobs or leads
- promise AI autopilot
- edit app code
- touch server, src, shared, package, deployment, env, database, schema, Fly, Vercel, or production files
- commit, push, deploy, or run release commands

## Required Positioning

Use:

```text
Apex HQ is a contractor operations platform entering founder-led demos and controlled pilots.
```

Core workflow:

```text
lead/estimate -> job setup -> field handoff -> photo/report proof -> owner review -> follow-up
```

## Daily Brief Format

The daily brief should include:

```markdown
# Apex HQ Daily GTM Brief

Date:

## What Changed

## Top 3 Targets Today

## Drafts Ready For John To Approve

## Claims/Risks To Watch

## Manual Actions John Should Take

## What The Builder/App Chat Must Handle
```

## John’s Daily Use

Every morning:

1. Open `AGENT_DAILY_GTM_BRIEF.md`.
2. Pick the top 1 to 3 manual actions.
3. Approve or edit any messages before sending.
4. Make calls from the call sheet.
5. Add notes back into the tracker.

## Best Current Workflow

Until the demo is clean:

1. Research and rank targets.
2. Prepare messages.
3. Wait for clean demo confirmation.
4. Send M2 Mini follow-up first.
5. Book one guided walkthrough.
6. Log objections and questions.

After demo is clean:

1. Send M2 Mini follow-up.
2. Send 4 warm texts.
3. Call 3 warm/local prospects.
4. Book 1 guided walkthrough.
5. Use demo feedback questions.
6. Offer a 14-day pilot only if fit is real.
