# Apex HQ Command Binder

Last updated: 2026-05-26

Purpose: this is the first file future Codex, Builder, QA, release, product, and business chats should read before making claims or changes. It keeps Apex HQ from drifting, looping, rebuilding completed systems, or overpromising before the product is ready.

Current launch sequence, release blockers, pilot gates, and do-not-build-yet boundaries are captured in `docs/context/launch-memory.md`. Read it before choosing new launch work.

## 1. Current Product Status

Apex HQ is a contractor growth and operations platform. It helps contractors get work, win work, run work, prove work, reduce risk, and get paid faster by keeping leads, estimates, jobs, crews, reports, photos, tickets, safety items, reminders, and follow-ups in one operating system.

Current app stage:

- Strong guided-pilot contractor operations platform.
- Founder-led demo and controlled pilot ready.
- Not yet positioned as wide public self-serve SaaS.
- Not yet enterprise procurement ready.
- Not an accounting, payroll, or guaranteed lead-generation replacement.

Current launch stage:

- Production app exists at `https://app.apexhq.online/`.
- Fly production app is configured by `fly.toml` as `concrete-ops-2`.
- Latest runtime release, latest pushed commit, demo release, and verification evidence are tracked in `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md`.
- Do not treat hard-coded release numbers in older docs as current. Confirm current production and demo state from the tracker, `git log`, Fly status, and the relevant smoke runbook.
- Separate demo app: `https://concrete-ops-demo.fly.dev/`. Check `https://concrete-ops-demo.fly.dev/api/ready` and run the current hosted smoke before relying on it for a live walkthrough.

Usable now:

- Login/session and setup/bootstrap admin.
- Public signup/company creation foundation.
- Company/workspace foundations.
- Basic/Premium/Elite package entitlement foundation.
- Owner/admin Operations Command.
- Compact Apex Assistant launcher polish for Toolbox/PPE right-rail actions so the collapsed assistant does not cover safety action buttons.
- Operations Command header metric helper polish for unclipped owner/admin KPI helper copy on phone-width layouts.
- Dashboard cockpit status badge clipping polish for dense owner/admin command rows with field-role redirects preserved.
- Dashboard Today Work Coordination row fit polish for unclipped desktop job/proof/action rows.
- Premium Finished SaaS Polish Phase 1 Operations Command visual system: dark premium app top bar, Operations Command label, reference-style metric strip, tighter cockpit/cards, and field-role denial preserved.
- Premium Finished SaaS Polish Phase 2 Field Mode mobile visual system: dark Field Mode header, dark/orange operator hero, compact required-item rows, tighter action tiles, and field-role denial preserved.
- Premium Finished SaaS Polish Phase 3 Estimate Studio visual system: Estimate Studio label, dark premium header, selected-total spotlight, tighter estimate rail, darker tools drawer, denser mobile estimate cards, and field-role denial preserved.
- Premium Finished SaaS Polish Phase 4 Apex Assistant visual system: Apex Assistant label, darker review-only assistant shell, denser prompt/action cards, sticky mobile input above bottom nav, and assistant entry copy tightened around manual approval and field-role blocking.
- Customers, leads, estimates, jobs, crews/employees.
- Leads command table follow-up header polish for unclipped desktop `Follow-Up` headers with mobile cards and field-role redirects preserved.
- Shared command KPI card height polish for unclipped helper/action text on Leads, Jobs, Customers, Estimate Studio, and Settings.
- Employees Priority Moves action rail polish for readable owner/admin access tasks with unclipped helper copy and field-role redirects preserved.
- Jobs command table text wrapping polish for long job IDs, job names, and assigned/needed crew counts.
- Jobs command table progress header polish for unclipped desktop `Progress` headers with mobile cards and field-role Field Mode behavior preserved.
- Customers command table text wrapping polish for long emails and service areas.
- Estimates, AI Rough Notes, proposal/GC packet foundations.
- Estimate Studio command table text wrapping polish for long estimate, customer, lead, and job labels.
- Company branding/proposal identity.
- Estimate options, reference attachments, and takeoff input foundation.
- Foreman/employee mobile field workflows.
- Time tracking, daily reports, uploads/photo evidence.
- Time Entries command table text wrapping polish for long job/work labels.
- Time Tracking Support Handoff Phase 1 role-scoped copy-only support context.
- Daily Reports Support Handoff Phase 1 role-scoped copy-only support context.
- Daily Reports command table text wrapping polish for long field notes, weather, proof summaries, concrete summaries, and report IDs.
- Photo Evidence Support Handoff Phase 1 owner/admin copy-only support context with field-safe upload scope preserved.
- Photo Evidence command table text wrapping polish for long evidence labels, job/customer labels, and upload notes.
- Delivery Tickets Support Handoff Phase 1 copy-only support context with field-safe ticket scope preserved.
- Delivery Tickets command table text wrapping polish for long ticket, job, and customer labels.
- Delivery Tickets assistant clearance polish for owner/admin selected-ticket right-rail actions with field-safe delivery scope preserved.
- Pre-Pour Support Handoff Phase 1 copy-only support context with field-safe checklist scope preserved.
- Post-Pour Support Handoff Phase 1 copy-only support context with field-safe checklist scope preserved.
- Pre/Post-Pour shared checklist table action header polish for unclipped desktop `Actions` headers with mobile card layouts preserved.
- Safety / Incidents Support Handoff Phase 1 role-scoped copy-only support context with field-safe incident scope preserved.
- Safety / Incidents command table text wrapping polish for long incident and job labels.
- Delivery tickets, change orders, pre-pour, post-pour.
- Safety, incidents, PPE, toolbox, tool checklist.
- Toolbox / PPE command table text wrapping polish for long safety guidance and PPE descriptions.
- Tool Checklist command table text wrapping polish for long checklist titles, notes, and job/foreman context.
- Notifications/reminders.
- Communication Center.
- Communications mobile bottom-nav label polish for unclipped owner/admin phone navigation with full accessible label preserved.
- Communication Center compact follow-up filter polish for unclipped owner/admin filter controls with field-role redirects preserved.
- Tablet/mobile bottom-nav label polish for unclipped long owner/admin module labels with full accessible labels preserved.
- Settings/App Health account panel text wrapping polish for long signed-in emails.
- App Health / Owner Health / audit activity foundations.
- Watchtower / Missing Work Agent Phase 1.
- Apex Assistant Shell Phase 1.
- Assistant missing proof summary.
- Field Ops Agent Phase 1 read-only summary.
- Billing / Manual Upgrade Prep Phase 1 support-led upgrade review handoff.
- Managed Setup Support Handoff Phase 1 owner/admin copy-only setup review context.
- Premium demo workspace package config.
- Pilot Feedback Capture Phase 1 owner/admin copy-only feedback packet.
- Customer Portal Phase 1 Manual Approval Preview owner/admin internal preview.
- Invite / Activation UX Polish.
- Public founder-pilot website route `/founder-pilot` live with manual guided walkthrough interest capture as owner/admin review leads plus office queue cues.
- Support/help handoff and guided setup foundations.
- Demo mode and demo reset protections.
- Backup/export tooling.
- Health/readiness endpoints.
- Route-wide visual polish audit tooling for local desktop, tablet, mobile, console/network, overflow, assistant overlap, and field-role exposure checks.
- Bounded Chromium visual polish shortcut that runs admin desktop, admin phone, and employee phone as separate slices for reliable local QA.
- Visual polish audit handling for benign field-role client redirect navigation aborts while real failed requests remain failures.
- Demo desktop audit tooling for live demo walkthrough screenshots plus a local 1440px shortcut for fast app evidence.

Not ready yet:

- Broad public self-serve SaaS claims.
- Stripe billing or automatic plan upgrades.
- Full customer portal.
- Offline mode.
- Payroll or accounting replacement.
- Enterprise SSO/MFA/SCIM/SLA commitments.
- Automatic AI sending, bidding, pricing, crew assignment, material ordering, or approvals.
- Hidden GPS tracking or GPS distance flags.
- Automated outbound email/SMS/ads.
- Fully automated PDF/blueprint takeoff.
- Public Apex HQ demo-interest review is still manual; owner/admin office queue cues are review reminders only, and no automatic email/SMS/calendar outreach is connected.

## 2. Current Business Status

Target customer:

- Small to mid-size contractors, especially concrete first.
- Good early fits: concrete, excavation, hardscape, small GCs with self-performed trade work, remodelers with crews, owner-led contractors with roughly 2 to 25 field workers.
- Best pain: scattered leads, estimates, job handoff, photos, reports, tickets, change orders, and follow-ups.

Go-to-market posture:

- Founder-led demos and controlled pilots.
- Warm demos and practical workflow pilots before public scale.
- First demo should show one workflow: `lead/estimate -> job setup -> field handoff -> photo/report proof -> owner review -> follow-up`.
- Do not try to sell every feature in the first demo.

Pricing/package assumptions from docs:

- `Basic`: core operations for small teams, likely `$99-$199/month` public range, lower founding pilot options.
- `Premium`: proposal tools, app health, Watchtower, Field Ops Agent, reporting, integrations direction, AI assistant foundations, likely `$249-$499/month`.
- `Elite`: growth partner services, website/ads/lead finder direction, advanced automation/analytics as they become real, likely `$799-$1,500/month` plus services.
- Security, company isolation, permissions, and safe data handling are never premium-only features.

Business claims to avoid:

- Guaranteed leads, jobs, revenue, or payment speed.
- Public self-serve SaaS unless the launch gate is truly ready.
- Enterprise-ready, fully compliant, SOC 2 ready, or bank-level security unless verified and documented.
- Replaces QuickBooks, accounting, payroll, Procore, ServiceTitan, Buildertrend, or any competitor.
- AI runs the business, sends messages, prices jobs, approves work, or bids automatically.
- Customer logos, testimonials, revenue, partnerships, or case studies unless real and permissioned.

## 3. Locked Decisions

- Product name: Apex HQ.
- Production domain: `https://app.apexhq.online/`.
- Production Fly app: `concrete-ops-2`.
- Product category: contractor operations and growth platform / contractor command center.
- Target market: small and mid-size contractors first, concrete first.
- Launch mode: founder-led demos and controlled pilots.
- AI mode: review-first assistant; human approval required for risky actions.
- Field roles: field-safe only; no office/admin/pricing/margin/payroll data.
- Security is included for every package.
- Demo and real customer data must stay separated.
- No guaranteed lead claims.
- No public self-serve claim until public signup, onboarding, support, package gates, safety, and launch operations are ready.
- No accounting/payroll replacement positioning.
- No hidden GPS tracking.
- No auto-send email/SMS or ad publishing without explicit approval and compliance prep.

## 4. Source-Of-Truth Docs

Read in this order for Apex HQ build work:

1. `docs/apex-hq-command-binder.md` - this first-read binder.
2. `docs/context/launch-memory.md` - current launch order, release blockers, pilot gates, and do-not-build-yet boundaries.
3. `AGENTS.md` - repo-level agent rules, source-of-truth order, phase report rules, and field role protection.
4. `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md` - current done/next/do-not-rebuild tracker.
5. `docs/APEX_HQ_ROADMAP.md` - organized master coordinator roadmap.
6. `APEX_HQ_MASTER_ROADMAP.md` - long-term historical/product roadmap.
7. `APEX_HQ_MASTER_CHECKLIST.md` - historical/pilot checklist.
8. `README.md` - runtime, deployment, env, health, storage, backup/export, CI overview.
9. `DEPLOYMENT.md` - Fly production notes and release safety reminders.
10. `CUSTOMER_PILOT_SETUP.md` - isolated customer pilot app/volume setup rules.
11. `DEMO.md` - demo credentials, demo paths, demo safety.
12. `docs/GUIDED_DEMO_LAUNCH_READINESS.md` - guided demo position and talk track.
13. `docs/PUBLIC_CLAIMS_GUARDRAILS.md` - public claim limits.
14. `docs/PRICING_PACKAGE_STRATEGY.md` - package/pricing assumptions.
15. `docs/MARKETING_GROWTH_PLAN.md` - positioning, ICP, first customer approach.
16. `docs/BUSINESS_PLAN_INDEX.md` - index for business planning docs.
17. `docs/TRUST_COMPLIANCE_CHECKLIST.md` - trust, outreach, testimonial, data, SMS, AI, and launch gates.
18. `docs/DO_NOT_BUILD_YET_LIST.md` - scope guardrails.
19. `docs/ASSISTANT_COMMAND_EXPANSION_SCOPE.md` - assistant boundaries and command expansion scope.
20. `docs/FIELD_OPS_AGENT_PLANNING_CHECKPOINT.md` - Field Ops Agent consent, GPS, role, and package boundaries.
21. `.agents/APEX_WORKSTREAMS.md` and `.agents/APEX_STATUS.md` - older workstream/handoff material; verify against the build-status file before trusting.

Important business docs:

- `docs/SALES_DEMO_PLAYBOOK.md`
- `docs/DEMO_LAUNCH_PACKET.md`
- `docs/DEMO_READY_CHECKLIST.md`
- `docs/FOUNDER_PILOT_ONBOARDING_PACKET.md`
- `docs/FIRST_10_CUSTOMERS_PLAN.md`
- `docs/OUTREACH_TRACKER.md`
- `docs/FOUNDER_LED_DEMO_EXECUTION_RUNBOOK.md`
- `docs/DEMO_RECAP_AND_PILOT_FIT_TEMPLATES.md`
- `docs/PILOT_KICKOFF_AND_CHECKIN_TEMPLATES.md`
- `docs/PUBLIC_WEBSITE_SALES_FUNNEL_PLANNING.md`
- `docs/OUTREACH_SEND_QUEUE.md`
- `docs/CUSTOMER_SUCCESS_PLAYBOOK.md`
- `docs/RISK_REWARD_MATRIX.md`
- `docs/COMPETITOR_ANALYSIS.md`

Missing docs to create later:

- `docs/SECURITY_RELEASE_GATE.md` - explicit per-release security gate checklist.
- `docs/ROLLBACK_RUNBOOK.md` - concrete rollback commands and release decision tree.
- `docs/SUPABASE_MIGRATION_PLAN.md` - only if/when moving from SQLite/Fly volume to Supabase/Postgres.
- `docs/RLS_MATRIX.md` - only if/when Supabase RLS exists.
- `docs/AI_ASSISTANT_ACTIVITY_LOG_PLAN.md` - before expanding assistant actions.

Trust docs now drafted:

- `docs/CUSTOMER_DATA_POLICY_DRAFT.md` - draft customer data handling summary for controlled pilots; not legal advice.
- `docs/PILOT_TERMS_AND_SUPPORT_POLICY.md` - draft pilot terms/support policy for founder-led pilots; not legal advice.

## 5. Skill Routing

Use these skills by default:

- Build/general engineering: `$apex-build-router` + `$codex-mastery-system`.
- Apex product/workflows: `$apex-hq-operating-standards`.
- QA/release/go-no-go: `$apex-qa-engineer`.
- Permissions, roles, authz, RLS, tenant isolation: `$apex-permission-safety`.
- UI/mobile polish: `$codex-mobile-optimization` + `$codex-ui-polish-saas-quality`.
- Database/Supabase/Postgres/RLS: `$codex-database-supabase-systems`.
- Deployment/production safety: `$codex-production-safety` + `$codex-flyio-mastery` for current Fly deploys. Use `$codex-vercel-mastery` only if/when a Vercel surface is introduced.
- Business/growth/marketing/sales/customer success: `$business-marketing-mastery-system` + `$apex-hq-growth-system`.
- Claims/pricing/legal-adjacent copy: add `$business-risk-claims-system`.
- Browser QA: add `$codex-browser-automation` or `playwright` only for focused app paths.

Startup behavior:

- Announce selected skills before work.
- Inspect this binder and relevant source docs before claims.
- Do not implement during audit/review unless the user approves a fix pass.
- Use the smallest specialist set that owns the risk.

## 6. Do-Not-Break Workflows

Do not rebuild these from scratch. Extend or fix only with clear scope and verification.

- Login/session:
  - `server/index.js`
  - `/api/setup/status`
  - `/api/setup/bootstrap-admin`
  - `/api/auth/login`
  - `/api/auth/me`
  - `/api/auth/logout`
  - `/api/bootstrap`

- Workspace/company selection:
  - `companies` / `company_id` foundations
  - `/api/companies/select`
  - `shared/companyScope.js`
  - `server/company-scope.test.js`

- Owner dashboard / Command Center:
  - `/command-center`
  - `src/command-center-utils.js`
  - owner/admin operational overview

- Admin workflows:
  - employees/users
  - company settings
  - support/help
  - owner health/app health
  - exports/backup

- Foreman mobile field workflow:
  - assigned jobs
  - clock/time
  - reports
  - uploads
  - delivery tickets
  - pre/post-pour
  - safety/tool workflows
  - field-only navigation

- Employee assigned work:
  - assigned job visibility only
  - clock/time
  - upload photo
  - allowed safety/checklist tools
  - no office data

- Lead pipeline:
  - leads
  - lead sources
  - website lead intake
  - public estimate request
  - contact history
  - lead scoring/missing info/AI lead assistant

- Estimate/proposal flow:
  - estimates
  - AI Rough Notes
  - company branding
  - options
  - attachments/takeoff inputs
  - GC packet
  - print/manual-send
  - convert estimate to job

- Job setup and field handoff:
  - jobs
  - crew assignments
  - startup checklist
  - foreman handoff packet
  - schedule/today's work

- Photo/report proof:
  - uploads/photo evidence
  - daily reports
  - delivery tickets
  - pre/post-pour
  - tool checklist
  - safety/incidents

- Role/permission safety:
  - `shared/permissions.js`
  - `src/navigation-utils.js`
  - `server/role-permissions.test.js`
  - field users must not see leads, estimates, pricing, margins, payroll, admin settings, company setup, billing, AI Office, or unrelated jobs.

- Tenant isolation:
  - company-scoped queries and writes must derive company from trusted session/server context.
  - Do not trust client-provided `company_id` unless validated.
  - Current repo uses SQLite and company-scope helpers; no `supabase/` directory was found during this binder inspection.

## 7. Current Risks

Confirmed facts:

- Current source-of-truth docs say Apex HQ is guided-pilot ready, not public self-serve SaaS ready.
- Current repo uses SQLite persistence under `data/app-data.sqlite` by default and Fly volume storage in production.
- No `supabase/` directory was found in this repo during inspection.
- `fly.toml` is production and sets `SEED_DEMO_DATA=false`.
- `fly.demo.toml` is demo-only and sets `SEED_DEMO_DATA=true`.
- CI exists at `.github/workflows/ci.yml` and runs auth/signup, tenant/role/package, public/demo, server/backup, and build checks.
- Existing docs warn not to stage unrelated docs during app releases.
- Current working tree after runtime release `v534` was clean before the post-release source-of-truth sync.
- Build status tracker now identifies the Delivery assistant clearance polish as built, released, and health-checked, and keeps the next buildable work pointed toward targeted north-star visual/workflow polish only when there is a confirmed visible route or demo blocker.

Assumptions / needs confirmation:

- Production `v534` is tracked from release output in this chat; re-run `fly releases -a concrete-ops-2 --json` and both `/api/ready` checks before future release claims.
- Supabase/RLS is not implemented in this repo now; if the product moves to Supabase, a full migration/RLS plan is needed.
- Public signup exists and is tested, but business docs still prefer controlled founder-led pilots before broad self-serve positioning.
- Package/billing UI foundations exist, but Stripe/payment processing is not implemented.
- Email provider config exists in `.env.example`, but automatic sending should not be promised or enabled without a scoped compliance/release phase.

## 8. Verification Commands

Install:

```powershell
npm.cmd ci
```

Dev/local:

```powershell
npm.cmd run dev
npm.cmd run dev:server
npm.cmd run dev:client
npm.cmd run serve
npm.cmd run preview
```

Build:

```powershell
npm.cmd run build
```

No dedicated `lint` or `typecheck` script was found in `package.json` during this inspection.

Core safety:

```powershell
npm.cmd run verify:server
npm.cmd run verify:auth
npm.cmd run verify:signup
npm.cmd run verify:users
npm.cmd run verify:roles
npm.cmd run verify:packages
npm.cmd run verify:entitlements
npm.cmd run verify:public-request
npm.cmd run verify:demo
git diff --check
```

Core workflows:

```powershell
npm.cmd run verify:customers
npm.cmd run verify:leads
npm.cmd run verify:estimates
npm.cmd run verify:print-packets
npm.cmd run verify:jobs
npm.cmd run verify:crew
npm.cmd run verify:field-workspaces
npm.cmd run verify:time
npm.cmd run verify:daily-reports
npm.cmd run verify:uploads
npm.cmd run verify:delivery-tickets
npm.cmd run verify:pre-pour
npm.cmd run verify:post-pour
npm.cmd run verify:safety
npm.cmd run verify:tool-checklist
npm.cmd run verify:change-orders
npm.cmd run verify:calculator
npm.cmd run verify:job-draft-imports
```

Backup/export:

```powershell
npm.cmd run backup:data
npm.cmd run verify:backup
npm.cmd run verify:exports
```

Browser/Playwright:

```powershell
npm.cmd run audit:demo-desktop
npm.cmd run audit:demo-desktop:local
npm.cmd run audit:visual-polish
npm.cmd run audit:visual-polish:chromium
npm.cmd run audit:visual-polish:chromium:desktop
npm.cmd run audit:visual-polish:chromium:admin-phone
npm.cmd run audit:visual-polish:chromium:employee-phone
npm.cmd run audit:visual-polish:tablet
npm.cmd run audit:public-site
npm.cmd run brief:founder-demo
npm.cmd run verify:founder-demo
```

For tablet-specific final polish checks:

```powershell
npm.cmd run audit:visual-polish:tablet
```

For focused browser QA, use Playwright or the Codex in-app browser against the exact route/role under test. Capture:

- desktop screenshot
- tablet screenshot when estimate, schedule, or workbench behavior is relevant
- mobile screenshot
- demo screenshot manifest evidence with `npm.cmd run audit:demo-desktop` when live demo walkthrough surfaces are touched
- local demo screenshot manifest evidence with `npm.cmd run audit:demo-desktop:local` when validating local UI changes before release
- field-role direct-route redirect evidence; benign document navigation aborts from client redirects are ignored by `npm.cmd run audit:visual-polish:*`, but failed API/asset requests still fail the sweep
- console errors
- failed network requests
- horizontal overflow
- direct-route role denial where relevant
- public `/founder-pilot` desktop/tablet/mobile evidence with `npm.cmd run audit:public-site` when public claims or funnel UI are touched

Supabase checks:

- No Supabase project files were found in this repo.
- If Supabase is introduced later, use `$codex-database-supabase-systems` and add explicit Supabase CLI/RLS checks to this binder.

## 9. Production / Release Notes

Current deploy setup:

- Provider: Fly.io.
- Production config: `fly.toml`.
- Production app: `concrete-ops-2`.
- Production URL: `https://app.apexhq.online/`.
- Fly URL: `https://concrete-ops-2.fly.dev/`.
- Region: `sjc`.
- Runtime data path: `/app/data`.
- SQLite file: `/app/data/app-data.sqlite`.
- Health/readiness endpoint: `GET /api/ready`.
- Liveness endpoint: `GET /api/health`.
- Dockerfile builds Vite frontend, copies `dist`, `server`, and `shared`, and runs `npm run serve`.

Release gates:

- Confirm `git status --short`.
- Do not stage unrelated dirty files.
- Run focused verification for the changed surface plus role/package checks when relevant.
- Always run `npm.cmd run build` and `git diff --check` before release.
- For permission, auth, company, package, demo, public intake, or field role changes, include the matching negative tests.
- Commit with a focused message.
- Push to `main`.
- Deploy with `fly deploy`.
- Health-check:
  - `https://app.apexhq.online/api/ready`
  - `https://concrete-ops-2.fly.dev/api/ready`
- Report commit hash, Fly release version/image, live URLs, health check results, and warnings.

Rollback requirements:

- Know the previous Fly release before deploy.
- Use `fly releases -a concrete-ops-2 --json` to inspect releases.
- If a deployment breaks, roll back to the last known good Fly release and report the rollback result.
- Do not touch production data, secrets, volumes, or database files during normal feature work.

Demo/customer separation:

- `fly.toml` is production only and must keep demo seeding disabled.
- `fly.demo.toml` is demo only and must never be used for real contractor data.
- Customer pilots need separate Fly apps and separate Fly volumes per `CUSTOMER_PILOT_SETUP.md`.

## 10. Current Operating Priorities

1. Keep source-of-truth docs current:
   - Before every new phase, read this binder, check `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md`, confirm `git status`, and make sure the latest release/next phase state is not stale.

2. Controlled demo and pilot readiness:
   - Use `docs/MANUAL_PILOT_SMOKE_TEST.md` before relying on demo auth, route safety, or field-role checks.
   - Use `docs/apex-hq-pilot-readiness-checklist.md` for Day 0 / Day 3 / Day 10 pilot gates.
   - Keep token expiry, single-use activation, company scoping, password rules, package gates, and field-role restrictions intact.
   - Keep automatic email/SMS sending, self-serve checkout, new roles, public package changes, and permission broadening out of scope unless explicitly approved.

3. Guided demo rehearsal:
   - Use `docs/GUIDED_DEMO_LAUNCH_READINESS.md` and `docs/DEMO_LAUNCH_PACKET.md` for the talk track.
   - Use the separate demo app only after checking readiness and smoke evidence.

4. Business execution:
   - Use `docs/FIRST_10_DEMO_TARGETS.md` and `docs/OUTREACH_TRACKER.md`.
   - Use `docs/FOUNDER_LED_DEMO_EXECUTION_RUNBOOK.md` to run demos and log objections.
   - Use `docs/DEMO_RECAP_AND_PILOT_FIT_TEMPLATES.md` before sending any post-demo follow-up.
   - Use `docs/PILOT_KICKOFF_AND_CHECKIN_TEMPLATES.md` when a strong-fit demo becomes a controlled pilot.
   - Run the current demo/pilot smoke from `docs/MANUAL_PILOT_SMOKE_TEST.md` before a scheduled walkthrough.
   - Run `npm.cmd run brief:founder-demo` for a day-of manual action queue; it does not send outreach, mutate tracker rows, create accounts, or change production data.
   - Review `/founder-pilot` demo-interest as manual Leads with owner/admin office queue cues only; do not auto-send follow-up, create workspaces, create accounts, or change packages from public requests.
   - Book warm founder-led demos.
   - Do not publish/send without approval.

5. Trust docs:
   - Drafted `docs/PILOT_TERMS_AND_SUPPORT_POLICY.md` and `docs/CUSTOMER_DATA_POLICY_DRAFT.md`.
   - Have counsel review before wider paid launch, public self-serve launch, enterprise procurement, or regulated-data claims.

6. Keep phase control:
   - Do not start billing, customer portal, offline mode, payroll, integrations, or AI autopilot until the relevant planning checkpoint is approved.

## 11. Next 30 Days

Product priorities:

1. Hold app builds unless a guided demo or pilot exposes a blocker, permission issue, demo data problem, or narrow workflow gap.
2. Keep `/founder-pilot` manual and claims-safe; do not add self-serve signup, checkout, package controls, or automatic outreach.

Business priorities:

1. Run founder-led demos with real contractors.
2. Convert 1-3 controlled pilots around one workflow each.
3. Capture objections and update `docs/REAL_OBJECTION_BANK.md`.
4. Use `docs/PILOT_KICKOFF_AND_CHECKIN_TEMPLATES.md` to run kickoff, day-3 check-in, and day-10 value review.
5. Capture proof and testimonials only with permission.
6. Keep claims conservative and contractor-practical.
7. Refine Basic/Premium/Elite pricing after real demo/pilot feedback.
8. Build the public website/sales funnel only after demo positioning is stable.

Operational priorities:

1. Keep role/permission safety green.
2. Keep demo/real separation green.
3. Keep health checks green.
4. Keep roadmap/status docs current after every release.
5. Keep one current phase at a time.

## 12. Standard Builder Startup Prompt

Copy/paste this at the start of future Builder chats:

```text
Use $apex-build-router as the operating system for this Apex HQ task.

Repo:
C:\Users\jberl\Documents\Codex\concrete-ops-2-clean

Do NOT use:
C:\Users\jberl\Documents\Codex\concrete-ops-rebuild\concrete-ops-ai-starter

First read:
1. docs/apex-hq-command-binder.md
2. AGENTS.md
3. docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md
4. docs/APEX_HQ_ROADMAP.md

Route skills automatically:
- build/general engineering -> $apex-build-router + $codex-mastery-system
- Apex product/workflows -> $apex-hq-operating-standards
- QA/release -> $apex-qa-engineer
- permissions/RLS/tenant isolation -> $apex-permission-safety
- UI/mobile -> $codex-mobile-optimization + $codex-ui-polish-saas-quality
- database/Supabase -> $codex-database-supabase-systems
- deployment -> $codex-production-safety + $codex-flyio-mastery
- business/growth -> $business-marketing-mastery-system + $apex-hq-growth-system

Before doing work:
- Tell me which skills you selected and why.
- Inspect the repo and relevant docs before making claims.
- Confirm the current phase from docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md.
- Do not rebuild completed systems.
- Do not touch unrelated files.
- Do not loosen field role permissions.
- Do not make production, database, secret, billing, SMS/email, GPS/location, destructive, or customer-data changes without calling out the risk first.
- If I ask for an audit or review, do not implement fixes until I approve the plan.

For implementation:
- Keep changes small and phase-scoped.
- Preserve existing routes, handlers, permissions, package gates, and field workflows.
- Verify with relevant package scripts, build, git diff --check, and focused browser checks when UI is touched.
- If release is requested, commit, push, deploy with fly deploy, health-check both live ready endpoints, and report commit hash, release version, live URLs, warnings, and rollback notes.
```
