# M2 Mini Pilot Rehearsal Plan

Status: review packet, not customer handoff
Prepared: May 20, 2026
Use with: `docs/apex-hq-pilot-readiness-checklist.md` and `docs/PILOT_KICKOFF_AND_CHECKIN_TEMPLATES.md`

## Purpose

Use this packet to rehearse a narrow founder-led pilot for M2 Mini before any customer-specific app setup, production change, outreach promise, or live customer handoff.

This plan is intentionally small: prove one real owner workflow before expanding users, packages, automations, or custom build scope.

## Pilot Candidate

| Field | Value |
| --- | --- |
| Company | M2 Mini LLC |
| Owner/admin | Joseph Madesh |
| Package direction | Basic founder pilot candidate |
| Field lead | Not needed for first solo Basic workflow |
| Start date | May 20, 2026 |
| Day 3 check-in | May 23, 2026 |
| Day 10 value review | May 30, 2026 |

## Selected Workflow

```text
lead or estimate -> job setup -> photo/proof -> owner follow-up
```

The first workflow should stay focused on one real concrete or excavation lead, estimate, job setup, or proof follow-up.

## First Real Record

Use the first real concrete or excavation lead/estimate from one of these sources:

- website inquiry
- phone call
- text message
- owner-entered estimate note

Do not start with fake demo records during the customer rehearsal. If the first real record is too vague, capture it as a lead with missing-info notes rather than inventing details.

## First Field Or Proof Action

Capture one job photo or proof note tied to the right job.

For a solo-owner Basic workflow, the owner can act as both office reviewer and field submitter for the first pass. Add a separate employee or foreman only if the first workflow clearly needs it.

## Success Criteria

The pilot is useful enough to continue if these are true by the Day 10 review:

1. Owner can see lead, estimate, job info, proof, and next follow-up in one place.
2. One real job photo or proof note is tied to the right job.
3. Owner can decide by Day 10 whether Basic founder pilot is useful.

## Day 0 Rehearsal Checklist

- Confirm owner/admin contact and preferred support channel.
- Confirm the one workflow in plain English.
- Confirm the first real lead, estimate, or job to use.
- Confirm whether there is any field user beyond the owner.
- Confirm the one proof action.
- Confirm the Day 3 and Day 10 dates.
- Confirm no custom feature promises are being made.
- Confirm no production app, production volume, or demo seed data will be reused for a live customer pilot.
- Run the manual pilot smoke path from `docs/MANUAL_PILOT_SMOKE_TEST.md` before any customer handoff.

## Day 3 Check-In Script

Ask:

- Did you log in?
- Did the first lead, estimate, or job make sense in Apex HQ?
- Did one proof photo or note get attached to the right job?
- What still went through text?
- Where did Apex HQ feel slower than your current way?
- What confused you?
- Is this still the right workflow to test through Day 10?

Close:

```text
For the rest of the pilot, I would keep Apex HQ focused on lead or estimate to job setup to proof and owner follow-up. No custom build promise here. I want to see whether this current workflow is useful enough on real work first.
```

## Day 10 Value Review

Score 0 to 2.

| Signal | Score |
| --- | --- |
| Real workflow was used |  |
| Owner saw value |  |
| Proof was tied to the right job |  |
| Follow-up was clearer |  |
| Less owner chasing happened |  |
| Support load was manageable |  |
| Basic package direction still feels honest |  |
| Owner would pay to keep the workflow |  |

Decision:

- 13 to 16: continue and discuss Basic package direction.
- 9 to 12: adjust the workflow and retest narrowly.
- 5 to 8: stop selling and capture feedback.
- 0 to 4: not a fit now.

## Support Intake Notes

Capture every issue with:

```text
Company:
User:
Role:
Workflow/page:
Device/browser:
Issue:
Steps:
Expected:
Actual:
Screenshot or recording:
Blocking? yes/no
Severity: P0 / P1 / P2 / P3
Workaround:
Promised follow-up time:
```

Severity:

- P0: security, company data, role leakage, login down.
- P1: pilot-blocking workflow failure.
- P2: important friction with a workaround.
- P3: minor polish, copy, or training issue.

## Boundaries

Do not promise:

- custom builds
- guaranteed leads, jobs, revenue, or growth
- accounting, payroll, or QuickBooks replacement
- automatic estimate pricing
- automatic customer messages
- automatic bid submission
- AI autopilot
- enterprise readiness
- SOC 2, bank-level security, or formal compliance
- production deploy or customer-specific app handoff without approved setup

Safe language:

```text
We are testing one real workflow first. If Apex HQ helps keep lead or estimate details, job proof, and follow-up in one place, we can decide whether a Basic pilot is worth continuing. If it does not help, we adjust or stop.
```

## Product Build Trigger

Only start a product task if this pilot exposes a real blocker.

Use:

```text
Company: M2 Mini LLC
Pilot workflow:
Exact pain:
Who experienced it:
Role:
Current workaround:
Why current Apex HQ cannot handle it:
How many pilots/demos have shown it:
Pilot impact:
Smallest safe product change:
Permission/package/role risks:
Verification needed:
```

Do not build from casual feature ideas.
