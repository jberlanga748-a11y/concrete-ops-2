# Apex HQ Phase 1 Pilot 100 Percent Status

Date: 2026-05-23
Roadmap source: `docs/APEX_HQ_100_PERCENT_ROADMAP.md`
Active phase: Phase 1 - First Real Pilot To 100 Percent
Production status: locked unless a separate backup-first production release is approved

## Verdict

Phase 1 is not 100 percent complete yet.

The app-side and demo-preflight side are green. The remaining blocker is real-contractor intake and approval. Apex HQ must not move to Phase 2 until that real pilot gate is complete or the Phase 1 definition is intentionally changed.

Current Phase 1 status: 90 percent.

## Phase 1 Exit Criteria

| Exit criterion | Status | Evidence / blocker |
| --- | --- | --- |
| Pilot intake gate passes | Blocked | Missing actual company, owner/admin, field user, first record, current tools, lost-info pain, support channel, success criteria, and acknowledgements. |
| Approved workspace path exists | Partial | Demo path is healthy. Customer-specific pilot path still needs real intake and separate approval before Fly resource creation. |
| Backup/rollback owner is named | Blocked | Requires actual pilot support owner and rollback owner. |
| Guided smoke passes | Passed | Hosted fencing preflight passed against Fly demo on 2026-05-23. |
| Field user is blocked from office routes | Passed | `verify:roles` passed locally and in hosted preflight; employee phone restricted routes passed visual audit. |
| Owner/admin can complete lead -> estimate -> job -> field proof path | Passed for fake/demo rehearsal | Local Sunday readiness app rehearsal passed; real-company walkthrough remains blocked until intake is complete. |

## Completed Phase 1 Work

- Local app rehearsal verification passed.
- Fake-company sandbox verification passed.
- Signup and tenant-safety verification passed.
- Role-safety verification passed.
- Lead workflow verification passed.
- Job workflow verification passed.
- Daily report workflow verification passed.
- Upload workflow verification passed.
- Estimate workflow verification passed.
- Production build passed.
- Whitespace diff check passed.
- Fly demo `/api/ready` passed.
- Hosted skip-auth route smoke passed.
- Admin desktop walkthrough visual audit passed.
- Admin tablet walkthrough visual audit passed.
- Employee phone field/restricted visual audit passed.
- Role permission tests passed during hosted preflight.

## Verification Evidence

Local Phase 1 readiness command:

```powershell
node scripts/sunday-pilot-readiness.mjs --run-local --json
```

Result:

- `localVerification.status`: `GO`
- `decisions.appRehearsal`: `GO`
- `decisions.realCompanyGuidedWalkthrough`: `NO-GO`
- `decisions.outsideLoginCreation`: `NO-GO`
- `decisions.productionDeploy`: `NO-GO unless explicitly approved through backup-first production release`

Hosted demo preflight command:

```powershell
npm.cmd run pilot:fencing-preflight -- --run --base-url=https://concrete-ops-demo.fly.dev --json
```

Result:

- `ok`: `true`
- `decisions.guidedWalkthrough`: `GO`
- `decisions.friendlyValidation`: `GO with supervision`
- `decisions.publicLaunch`: `NO-GO`
- `decisions.productionDeploy`: `NO-GO unless explicitly approved through backup-first release`

Screenshot / audit manifests:

- `ui-audit/fencing-first-walkthrough/2026-05-23T05-09-33-724Z/manifest.json`
- `ui-audit/fencing-first-walkthrough/2026-05-23T05-09-46-828Z/manifest.json`
- `ui-audit/fencing-first-walkthrough/2026-05-23T05-09-54-891Z/manifest.json`

## Remaining Blockers Before Phase 1 Can Be 100 Percent

These must be collected from the real pilot contractor before outside login, customer-specific pilot setup, or moving to Phase 2:

1. Company name.
2. Owner/admin name.
3. Owner/admin email.
4. Field lead or employee name.
5. Field lead or employee email.
6. One real first lead, estimate, job, or proof record.
7. Current estimate, schedule, photo, and follow-up tools.
8. What gets lost most often today.
9. Support channel and same-day best-effort expectations.
10. Two or three plain-language success criteria.
11. Confirmation that the contractor keeps the current system as backup during the pilot.
12. Confirmation that written pilot expectations are acknowledged before outside login.
13. Confirmation that no sensitive data beyond the pilot workflow should be uploaded.
14. Named pilot support owner.
15. Named backup/rollback owner.
16. Day 0 setup and guided walkthrough plan accepted.
17. Day 3 and Day 10 check-in plan accepted.

## Exact Intake Command Template

Use this only with non-secret, approved pilot details. Do not commit real private emails or sensitive job details.

```powershell
npm.cmd run pilot:fencing-intake -- --company="[company]" --owner-name="[owner/admin name]" --owner-email="[owner email]" --field-name="[field user name]" --field-email="[field user email]" --first-record="[first real lead/estimate/job/proof]" --current-tools="[current tools]" --lost-info="[what gets lost]" --support-channel="[support channel]" --success="[success criterion 1]" --success="[success criterion 2]" --backup-confirmed --terms-acknowledged --data-boundary-acknowledged --json
```

Then run setup approval:

```powershell
npm.cmd run pilot:fencing-setup-approval -- --company="[company]" --owner-name="[owner/admin name]" --owner-email="[owner email]" --field-name="[field user name]" --field-email="[field user email]" --first-record="[first real lead/estimate/job/proof]" --current-tools="[current tools]" --lost-info="[what gets lost]" --support-channel="[support channel]" --support-owner="[support owner]" --rollback-owner="[rollback owner]" --pilot-slug="[safe slug]" --backup-confirmed --terms-acknowledged --data-boundary-acknowledged --day0-accepted --day3-day10-accepted --preflight-passed --success="[success criterion 1]" --success="[success criterion 2]" --json
```

## Phase Lock

Do not move to Phase 2 until one of these is true:

1. The real pilot intake and setup approval gates pass, and a guided walkthrough can be run safely.
2. The roadmap owner explicitly changes Phase 1's definition from "first real pilot" to "demo-only pilot rehearsal."

Current recommendation: keep Phase 1 locked and collect real pilot intake details next.
