# Apex HQ Launch Readiness

Status note, 2026-05-19:
This document is launch/readiness reference material. Current completed build phases, latest release, and next build phase now live in `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md`. If this file conflicts with the tracker, use the tracker.

## Current Readiness

Apex HQ is guided-demo ready and controlled-pilot ready when the pilot is founder-led, narrow, and setup-safe.

Market it as a controlled contractor operations platform for guided demos and founder-led pilots, not a fully public self-serve SaaS.

Current stage:

- guided founder-led demos: ready with demo smoke and route QA evidence
- paid pilot: possible only after fit is confirmed, environment is isolated, and onboarding is guided
- public self-serve SaaS: not ready yet

## Ready To Show

- contractor demo story
- owner/admin workflow
- field role separation
- leads/customers/estimates/jobs foundation
- reports/photos/tickets/checklists foundation
- schedule / today's work
- notifications and reminder direction
- daily reports
- uploads / photo evidence
- delivery tickets
- pre-pour / post-pour
- safety / incidents
- tool checklist
- employees and roles
- AI rough notes / estimate helper foundation, with human review
- Opportunity Scout review-first intake foundation, package-gated
- demo and pilot setup documentation
- health/readiness endpoints
- backup/export and local restore drill verifier
- release/rollback checklist
- support intake process
- scheduled readiness and demo smoke monitors

## Must Be Tightened Before Wider Launch

- production auth smoke approval and setup using `docs/apex-hq-production-auth-smoke-design.md`
- production monitoring/log drain decision
- production min-machine/cold-start approval using `docs/apex-hq-production-cold-start-decision.md`
- customer-specific pilot environment setup for any real pilot
- legal review of pilot/customer data docs before wider paid launch using `docs/apex-hq-legal-review-prep-checklist.md`
- pilot onboarding rehearsal with the exact contractor workflow using `npm.cmd run pilot:rehearsal`
- real Day 0, Day 3, and Day 10 pilot operating cadence
- formal public claims/legal review before wider publishing or paid launch

## Current Marketing Position

Use:

```text
Apex HQ helps contractors keep leads, estimates, jobs, crews, photos, reports, tickets, safety items, and follow-ups organized in one operating system, so owners know what needs attention and field crews know exactly what to do.
```

Do not use:

- fully public SaaS
- guaranteed lead generation
- AI autopilot
- enterprise-ready
- accounting/payroll replacement
- automatic sending without review

## Launch Checklist

| Item | Status |
| --- | --- |
| Production app healthy | Exists |
| Demo app separated | Exists |
| Pilot setup guide | Exists |
| Manual pilot smoke test | Exists |
| Public signup foundation | Built / controlled |
| Package tiers / entitlements | Built / tested |
| User invite / activation UX | Built |
| Formal support intake process | Built for Phase 1 pilots |
| Pilot terms / data handling drafts | Drafted / legal review needed |
| Legal review prep checklist | Prepared; not legal advice |
| App health page | Built |
| Rollback checklist | Built |
| Backup/export verification | Built |
| Local restore drill verifier | Built |
| Scheduled readiness monitor | Built |
| Scheduled demo hosted smoke | Built; auth/bootstrap gate configured and passing |
| Production auth smoke | Manual fail-closed workflow added; secret/users not configured |
| Production cold-start decision | Documented with read-only timing helper; no config change |
| Production log drain / dedicated monitor | Planned; not enabled |
| Public claims scan | Built; scans curated public/source copy for unsupported positive claims |
| Pilot rehearsal helper | Built; read-only Day 0/3/10 packet generator and validator |

## Business Launch Checklist

| Item | Status |
| --- | --- |
| Positioning statement | Ready |
| Basic/Premium/Elite pricing recommendation | Drafted |
| First 10 customer plan | Ready |
| First 100 growth plan | Drafted |
| Outreach scripts | Ready |
| Sales demo playbook | Ready |
| Customer success playbook | Ready |
| Testimonial ask | Ready |
| Referral plan | Ready |
| Public claims automation | Built; `npm.cmd run verify:claims` scans curated public/source copy |
| Formal public claims/legal review | Required before wider paid launch |

## Demo Checklist

- demo company only
- `concrete-ops-demo` healthy
- no real customer data shown without approval
- lead/customer ready
- estimate/job ready
- field user path ready
- photo/report example ready
- owner/admin review path ready
- pilot offer ready
- known product limitations stated plainly
- run `npm.cmd run smoke:hosted -- --base-url=https://concrete-ops-demo.fly.dev --skip-auth --json`
- confirm scheduled demo hosted auth smoke is passing in GitHub Actions
- use `docs/apex-hq-github-actions-smoke-secrets.md` for scheduled auth smoke secret rotation

## Pilot Onboarding Checklist

- contractor fit confirmed
- owner/admin contact confirmed
- field lead confirmed
- one workflow selected
- isolated pilot app/workspace confirmed
- `DEMO_MODE` off for real pilot
- `SEED_DEMO_DATA=false` for real pilot
- users/roles planned
- kickoff booked
- day-3 check-in booked
- day-10 review booked
- success criteria written
- no custom feature promises made
- run `docs/MANUAL_PILOT_SMOKE_TEST.md`
- confirm restore drill cadence in `docs/apex-hq-restore-runbook.md`

## Customer Setup Checklist

- company name
- trade/services
- owner/admin user
- field users
- first customer or lead
- first estimate or job
- first crew/foreman
- required proof/photos
- report/checklist expectation
- support contact path

## Support Checklist

- use `docs/apex-hq-support-intake-process.md`
- issue owner assigned
- company/workspace captured
- user role captured
- workflow/page captured
- steps captured
- screenshot requested
- severity assigned
- workaround documented
- follow-up time set

## Risk Checklist

- no company data mixing
- no field access to office-only data
- demo and real data separated
- backup path known before deploys
- rollback path known before deploys
- incident notes location known
- no automatic SMS/email sending
- no AI auto-pricing or auto-promising
- no billing claims beyond current readiness
- no enterprise/security claims beyond verified state
- no production deploy without explicit approval
- no production restore without explicit production-safety review

## Demo Script Direction

1. Show public request or lead.
2. Show lead review.
3. Create/review estimate.
4. Convert approved estimate to job.
5. Assign crew.
6. Field user sees job.
7. Field uploads photo and report.
8. Owner reviews proof and job status.
9. Show what is missing/ready.

## Support Workflow

Minimum support intake lives in `docs/apex-hq-support-intake-process.md` and should capture:

- company/workspace
- user role
- page/workflow
- exact steps
- screenshot if available
- severity
- blocking yes/no
- expected behavior
- actual behavior

## First 10 Pilot Customer Plan

- keep each pilot isolated
- do not customize deeply before feedback
- test one real workflow
- ask day-3 questions
- collect before/after pain story
- turn successful pilots into testimonials
- ask every successful pilot for two referrals

## Current Source Of Truth Links

- Build tracker: `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md`
- Manual pilot smoke: `docs/MANUAL_PILOT_SMOKE_TEST.md`
- Pilot readiness: `docs/apex-hq-pilot-readiness-checklist.md`
- Release/rollback: `docs/apex-hq-release-rollback-checklist.md`
- Restore runbook: `docs/apex-hq-restore-runbook.md`
- Support intake: `docs/apex-hq-support-intake-process.md`
- Monitoring plan: `docs/apex-hq-monitoring-alerting-plan.md`
- Monitoring upgrade plan: `docs/apex-hq-monitoring-upgrade-plan.md`
- Demo smoke secret setup: `docs/apex-hq-github-actions-smoke-secrets.md`
- Legal review prep: `docs/apex-hq-legal-review-prep-checklist.md`
