# Apex HQ Pilot Readiness Checklist

Status: Phase 1 controlled-pilot checklist

Purpose: move Apex HQ from polished demo app to controlled pilot-ready SaaS by proving one real contractor workflow with safe roles, isolated data, and clear support.

## Pilot Rule

Pilot one real workflow before expanding users, modules, automation, packages, or custom builds.

Good first workflow:

```text
lead or estimate -> job -> schedule/handoff -> field photo/report/upload -> owner review -> ready-to-bill follow-up
```

Do not promise:

- custom builds
- guaranteed leads
- payroll or accounting replacement
- automatic pricing
- automatic customer messages
- AI autopilot
- enterprise readiness
- formal SLA coverage

## Day 0: Before Kickoff

Confirm fit:

- contractor trade and crew count
- owner/admin contact
- field lead or foreman
- current tools
- current pain in their words
- selected pilot workflow
- 2 to 3 plain-language success criteria

Confirm environment:

- pilot app is unique if using customer-specific Fly app
- pilot volume is unique
- `DEMO_MODE` is off
- `SEED_DEMO_DATA=false`
- `/api/setup/status` is clean before first admin on a new workspace
- no demo data is mixed with customer data
- no production app or production volume is reused for a customer pilot

Confirm users:

- owner/admin exists
- foreman exists only if needed
- employee exists only if needed
- roles match the real pilot workflow
- field users do not need office/admin surfaces

Confirm workflow:

- first real lead, estimate, or job selected
- customer/project name known
- location or jobsite context known
- field proof expectation defined
- owner/admin review path defined
- day-3 check-in booked
- day-10 value review booked

Run the non-destructive manual pilot smoke test in `MANUAL_PILOT_SMOKE_TEST.md`.

## Day 0 Pass Criteria

Day 0 passes when:

- owner/admin can log in
- at least one field user can log in if field workflow is in scope
- one real job/estimate/proof workflow is selected
- field role cannot see restricted office/admin/money/package surfaces
- support channel and severity process are clear
- success criteria are written
- no custom feature promises were made

## Day 1 And Day 2 Internal Check

Track:

- owner/admin logged in
- first record reviewed
- field user logged in
- field action attempted
- photo/report/upload/ticket/checklist submitted if expected
- what still went through text
- setup or training issue
- blocker yes/no

If the field user cannot complete the agreed action by Day 2, treat that as a pilot risk and follow up before Day 3.

## Day 3 Check-In

Ask:

- Did the owner/admin log in?
- Did the field user understand the one action?
- Did one photo, report, job update, ticket, checklist, or follow-up happen?
- What still went through text?
- Where was Apex HQ slower than the old way?
- What confused the owner?
- What confused the field user?
- Is this still the right workflow to test?
- What is the next real job, estimate, or field action?

Classify the result:

- Working: keep pilot narrow and continue.
- Confusing but fixable: reset training and simplify.
- Product blocker: capture exact support ticket and decide whether to build.
- Poor fit: stop or return to discovery.

## Day 10 Value Review

Score each signal 0 to 2:

| Signal | Score |
| --- | --- |
| Real workflow was used |  |
| Owner/admin saw value |  |
| Field action happened if needed |  |
| Chasing was reduced |  |
| Proof was easier to find |  |
| Follow-up was clearer |  |
| Support load was manageable |  |
| Contractor would pay to continue |  |

Decision:

- 13 to 16: continue and discuss package direction.
- 9 to 12: adjust workflow and retest narrowly.
- 5 to 8: stop selling, capture feedback, and revisit later.
- 0 to 4: not a fit now.

## Continue / Adjust / Stop

Continue:

- confirm package direction
- confirm next workflow
- confirm users to keep
- confirm support expectations
- ask permission before using quote, screenshot, logo, or customer story

Adjust:

- narrow to one record or one field action
- remove extra users
- reset training
- schedule one short retest

Stop:

- document why
- avoid pricing pressure
- preserve agreed records if needed
- do not ask for testimonial unless value was real

## Stale Docs Cleanup Plan

Use `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md` as the master build tracker.

Cleanup targets:

- reconcile `docs/LAUNCH_READINESS.md` against the current tracker
- keep `APEX_HQ_MASTER_CHECKLIST.md` as historical/pilot-reference, not the source of truth
- update stale recommended prompts in the build tracker after Phase 1 ops docs land
- keep `CUSTOMER_PILOT_SETUP.md` infrastructure-focused and pair it with this Day 0/3/10 checklist
- reference `MANUAL_PILOT_SMOKE_TEST.md` as the non-destructive readiness gate

## Product Build Trigger

Start a product task only when a pilot exposes a real blocker.

Capture:

- company
- pilot workflow
- exact pain
- role affected
- current workaround
- why current Apex HQ cannot handle it
- how many demos/pilots showed it
- pilot impact
- smallest safe product change
- permission/package/role risks
- verification needed

Do not build from casual feature ideas.
