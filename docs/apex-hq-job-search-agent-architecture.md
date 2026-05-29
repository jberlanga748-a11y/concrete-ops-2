# Apex HQ Job Search Agent Architecture

Status: staged implementation

Purpose: design a safe Opportunity Scout extension that helps contractors find, ingest, score, and organize job opportunities without bypassing access controls or taking customer-facing actions without approval.

Implemented foundation:

- Opportunity Scout derives a Daily Lead Resource Plan that separates public sources, authorized private sources, inbound/owned sources, warm relationship sources, future integrations, and blocked sources.
- Apex Agent OS includes a review-only `opportunity_search_prep` internal action for a saved search profile.
- The server can queue daily `opportunity_search_prep` tasks for due search profiles and dedupe same-day runs by idempotency key.
- The action can prepare public/private source checklists and search phrases, but it cannot browse, scrape, log in, create leads, contact anyone, submit bids, store credentials, or mutate source data.
- Server queueing is gated by Lead / Job Finder package access plus lead-management role permissions.
- Search profiles now persist private-source authorization metadata (`not_required`, `needs_authorization`, `authorized_for_human_session`, `oauth_or_api_required`, `blocked`) while rejecting credentials, tokens, cookies, and portal secrets.
- Office users can mark source-check outcomes as reviewed/no-fit/found-work/needs-human/duplicate/missing-docs; found-work outcomes prefill an unsaved Found Opportunity draft and never auto-create leads.
- AI Office now shows a daily Agent Leads ledger that summarizes queued prep tasks, reviewed source checks, open found opportunities, and blocked/human-gated source work.
- Agent Leads Daily Scout Execution v1 now turns due profiles/sources into public-source runner cards, private-source handoff cards, and unsaved Found Opportunity draft cards with Agent OS audit counts and a cron-safe daily scheduler hook.
- Agent Leads Source Review to Saved Draft v1 now lets public/found-work execution cards prefill the existing Found Opportunity form, shows duplicate warnings before save, preserves review-card evidence in the human-saved draft, and audits Agent-prepared saves as human actions rather than Agent-created leads.
- Private Social + Portal Source Connectors v1 classifies Facebook public pages/Marketplace, Craigslist/local boards, community boards, Facebook private groups, Nextdoor/private communities, GC portals, private plan rooms, forwarded bid invites, and evidence uploads. Public/local sources can produce review cards; private social and portal sources are handoff-only until an authorized human reviews them.
- Agent Leads Connector Workflow v1 adds product setup for source connectors, saves matching Lead Source/Search Profile records, shows public/private/intake daily run controls, lets office users record source-review outcomes directly from daily execution cards, and opens evidence intake for private/social/portal handoffs without creating leads or external contact.
- Public Lead Discovery Runner v6 turns safe public-source runner cards into activation-ready-but-locked provider plans plus dry-run/test provider-shaped Agent Found Leads review cards with source URL, title/snippet, fit score, fit reason, duplicate risk, blocked actions, prior review-outcome learning, daily run records, provider contract metadata, owner/admin connector controls, safe provider health checks, deterministic sandbox provider tests, owner/admin approval packets, live-adapter execution contracts that remain disabled, audit/rollback views, credential-reference-only boundaries, simulator attempts, redacted provider errors, latency buckets, rejected unsafe URLs, normalized review/import decision records, and one-click save-to-Found-Opportunity draft. Private/social-login/portal sources still create handoff cards only; live provider search remains locked until a named provider adapter, company opt-in, rate limits, audit, and review-only import gate are explicitly configured.
- Provider Activation v7 adds the server-only adapter runner, autonomous daily Agent Leads scheduler packet, credential-reference handoff route, and provider result draft previews. These produce review cards and audit rows only; direct live execution requests, raw passwords, private-source login automation, lead creation, source/customer contact, bid submission, and payment collection remain blocked.
- Provider Activation v8 adds the approved live-public-provider execution boundary for public/no-login deterministic adapter stubs, per-company daily attempt/idempotency ledger, provider adapter stub registry, and Agent Found Leads review queue promotion. The v8 gate requires Elite package access, owner/admin server role, boundary approval, live-locked provider settings, readiness, selected no-login connectors, remaining daily budget, and a fresh idempotency key. It still does not perform private/login access, raw web scraping, source/customer contact, auto-save, bid submission, payment collection, or raw credential storage.
- Provider Activation v9 adds the first real public-source adapter runner behind a separate server route. It can make bounded GET requests only to safe no-login public source URLs from saved review cards, parse HTML/RSS/Atom/JSON evidence into normalized provider results, write an attempt/idempotency audit, and place results in the Agent Found Leads review queue. It blocks search-engine SERP scraping, social/private platform access, login/account/paywall/CAPTCHA/MFA signals, non-GET methods, credential connectors, direct client forcing, duplicate same-day source requests, exhausted budgets, source/customer contact, auto-save, bid submission, payment collection, and raw credential storage. Robots/source terms remain a visible manual-review warning unless an approved provider/API boundary makes them explicit.
- Provider Activation v11 adds owner/admin platform/API provider boundary records, compliance packets, and provider monitoring snapshots. A boundary can record reviewed terms, robots/API status, selected connector ids, rate/budget limits, and server-side credential references only. It blocks raw passwords/tokens/API keys/cookies/MFA/session values and still cannot enable live API execution, private browsing, scraping, source/customer contact, auto-save, bid submission, payment collection, or integration writes.
- Provider Activation v12 adds the official provider API adapter harness. It registers named official API adapters, checks package/role/owner-admin approval, provider boundary approval, platform/API terms and connector coverage, credential-reference requirements, rate budget, and idempotency, then turns sandbox/mock official provider responses into the Agent Found Leads review queue. The v12 harness is still sandbox-only: no live provider network calls, no scraping, no private login, no raw secrets, no customer/source contact, no lead auto-save, no bid submission, no payment collection, and no integration writes.
- Provider Activation v13 adds the first concrete official-provider category: a procurement feed adapter contract, endpoint metadata config, and fixture-backed feed runner. It validates the same package, owner/admin, approval, platform/API boundary, connector, budget, and idempotency gates, normalizes procurement fields such as agency, project number, due date, source URL, and fit score, and pushes only review-queue rows. Endpoint URLs remain metadata in v13; no live procurement feed calls, scraping, private login, raw secrets, contact, auto-save, bid submission, payment collection, or integration writes are enabled.
- Provider Activation v14 adds live-provider readiness records without unlocking live execution: safe provider connection metadata, per-source consent, a daily review-only schedule shape, and a readiness matrix with `ready`, `missing_consent`, `missing_credential`, `needs_manual_review`, and `locked` states. These records are company-scoped audit evidence only; raw credentials, live provider calls, private login, scraping, cold calls/contact, auto-save, bid submission, payment collection, scheduling mutation, and integration writes remain blocked.
- Provider Activation v15 adds the first real server-only live public provider adapter: a no-login public procurement GET boundary. It requires Elite package access, owner/admin, live-locked provider mode, provider boundary approval, procurement platform/API boundary, v14 consent/connection/schedule readiness, matching safe public endpoint metadata, budget, idempotency, and server fetch availability. It may fetch an approved public procurement URL and normalize public evidence into review queue rows only; no private login, raw credentials, source/customer contact, auto-save, bid submission, payment collection, scheduling mutation, or integration writes are enabled.
- Provider Activation v16 adds the scheduler-ready daily live procurement execution wrapper. It selects only recorded public procurement configs that have matching connection metadata, a v14 daily schedule, ready public procurement readiness, approved boundaries, remaining budget, and server-owned fetch gates, then runs the same v15 public/no-login adapter into review queue rows. It records a distinct daily audit execution and attempt ledger entry for cron/operator visibility while still blocking private login, raw credentials, source/customer contact, auto-save, bid submission, payment collection, scheduling mutation, and integration writes.
- Provider Activation v17 completes the safe all-source adapter coverage map. Public web, procurement, and classifieds/community boards use no-login review-only public fetch adapters where source URLs are approved; official search, procurement, plan-room, social, marketplace, and classifieds providers use sandbox/domain adapter harnesses with credential references only where required; private Facebook/Nextdoor/community groups, customer inbox evidence, contractor portals, private plan rooms, and referral networks remain authorization + human handoff + redacted evidence intake only. This is the product boundary for "all sources": Apex Agent can find and prepare review cards across the safe adapter map, but it still cannot crawl blindly, log in unattended, store raw credentials, cold call/contact, auto-save, submit bids, collect payment, mutate schedules, or write integrations.
- Provider Activation v18 adds daily job finder orchestration over the safe adapter map. The orchestration run selects only no-login public connectors for live public fetches, prepares private/login-required sources as checklist/handoff rows, aggregates review queue results and blocked/no-result status into one daily audit-backed run record, and exposes a safe owner/admin UI action. It is scheduler-ready and review-only; it still cannot log in, contact sources/customers, auto-save leads, submit bids, collect payment, mutate schedules, or write integrations.
- Provider Activation v19 adds Daily Job Finder autopilot settings and a server-owned scheduler endpoint. Each company can enable a daily review-only run time, markets/trades/radius, public connector preferences, and private handoff aggregation; the server queues an Agent OS run, executes the safe v18 orchestration, writes run history, and surfaces a daily review inbox. External/customer-contact actions, unattended private login, cold calls/messages, bid submission, payment, scheduling, integrations, and lead auto-save remain locked.
- Provider Activation v20 adds company-scoped Autopilot Review Learning. Draft-worthy, duplicate, no-fit/dismissed, and private-handoff-completed review decisions now write redacted learning signals, source quality snapshots, bounded fit-score adjustments, and "why Apex found this" explanations for future daily review inbox rows. Learning affects ranking and explanations only; it never auto-saves leads, contacts anyone, submits bids, collects payment, schedules work, logs in unattended, or writes integrations.
- Provider Activation v21 completes the daily lead review workflow surface. The review inbox now exposes explicit no-fit and private-handoff-completed actions, daily decision counts, source trend cards, and a tomorrow-adjustments preview showing which sources Apex will rank higher, rank lower, dedupe earlier, or keep under terms review. These are still review-only learning controls; they do not create leads, send messages, log in, bid, collect payment, schedule work, or write integrations.
- Provider Activation v22 adds Source Expansion Controls. Search profiles and connector setup now carry an explicit source posture: public no-login, official API only, private human handoff, or blocked terms review. Daily Agent Leads plans classify saved sources into those postures, produce learning-backed suggestions such as add more like this, pause noisy source, tighten duplicate terms, or review terms, and reject unsafe source-control payloads with secrets, login URLs, scraping, unattended login, outreach, auto-save, bid, payment, scheduling, or integration flags.
- Provider Activation v23 adds the Source Coverage Planner. Daily Agent Leads plans now score whether the contractor has public procurement, public classifieds/local boards, public web/source pages, private social handoff, GC portal/private plan-room handoff, official API/feed, and forwarded/referral evidence coverage. Missing lanes produce editable source/search-profile setup drafts only; they cannot auto-save, scrape, log in unattended, contact anyone, submit bids, collect payments, mutate schedules, or write integrations.
- Provider Activation v24 adds Live Source Setup Readiness. Daily Agent Leads now shows per-source readiness for public URL/profile terms, source posture, terms/access status, private human authorization, official/API provider boundary needs, review inbox capacity, idempotency, and audit/run readiness. It is a checklist only: no live source execution, scraping, unattended login, credential storage, customer/source contact, auto-save, bid submission, payment, scheduling, or integration writes unlock from readiness.
- Provider Activation v25 adds Pilot Run Readiness and the Daily Operator Checklist. The daily plan now produces a ready/ready-with-warnings/not-ready verdict, tomorrow morning owner/admin checklist, grouped blockers, and a pilot evidence packet explaining what Apex will do and will not do. This remains a read-only operator packet and does not unlock live execution, scraping, unattended login, credential storage, customer/source contact, auto-save, bid submission, payment, scheduling, or integration writes.
- Provider Activation v26 adds the Provider Connection Setup Plan. Agent Leads now separates public no-login fetch, official API/OAuth setup, private human handoff, and forwarded evidence lanes; records required owner/admin approvals; shows credential-reference-only boundaries; and prepares hosted pilot smoke checks that are read-only and explicitly approved. It still does not exchange OAuth tokens, store raw credentials, perform live provider calls, log in unattended, scrape, contact customers/sources, auto-save leads, submit bids, collect payment, mutate schedules, write integrations, deploy, or touch production data.
- Provider Activation v27 adds the Pilot Activation Layer. Daily Agent Leads plans now include provider setup status history, a real-source readiness board, a read-only hosted pilot smoke packet, and a tomorrow-run operator view that says what Apex will check and what remains blocked. This is still an activation packet only: it cannot run hosted smoke automatically, deploy, touch production data, exchange OAuth tokens, store raw credentials, perform live provider calls, log in unattended, scrape, contact customers/sources, auto-save leads, submit bids, collect payment, mutate schedules, or write integrations.
- Provider Activation v28 adds Real Public Source Config Activation. Daily Agent Leads now builds per-source public config packets with source URL, connector, terms status, readiness, idempotency key, exact blocked actions, operator metadata-only activation drafts, and pilot evidence checklists. Search engine result pages, private/social/login sources, unsafe URLs, blocked terms, and sources without approved public no-login URLs are blocked from tomorrow's public run eligibility. This still does not run live fetches, contact anyone, auto-save leads, submit bids, collect payment, mutate schedules, deploy, touch production data, store credentials, or write integrations.
- Provider Activation v29 adds the Controlled Hosted/Demo Smoke Packet. Agent Leads now selects the best eligible public no-login source config for a human-approved demo/pilot smoke, produces a step-by-step read-only checklist, defines a smoke result evidence model, and triages blockers by source URL, terms, auth, review queue, idempotency, role/package, or safety boundary. It is a human-run packet only and cannot open a browser automatically, deploy, touch production data, fetch providers, log in, contact anyone, auto-save leads, submit bids, collect payment, mutate schedules, store credentials, or write integrations.
- Provider Activation v10 adds the private-source authorization boundary for Facebook private groups, Nextdoor/private communities, customer inbox evidence, private plan rooms, contractor portals, and referral networks. Owner/admin users can record source authorization, optional credential references, expiry/review dates, a human-operated login handoff packet, redacted evidence intake, and private-source daily checklist rows. V10 still forbids raw passwords, cookies, tokens, MFA/session values, unattended login, private-source browsing/scraping, DM/comment/post/reply actions, customer/source contact, auto-save, bid submission, payment collection, and integration writes. Private-source evidence only becomes Agent Found Leads review queue rows after a human supplies safe copied/uploaded evidence.

## North Star

The Job Search Agent extends Apex HQ's existing Opportunity Scout and Daily Job Finder model. It should not become a scraping bot or bidding bot.

Core pipeline:

```text
Source Adapter
-> Raw Ingest Record
-> Extract + Normalize
-> Missing Info + Risk Check
-> Fit Score
-> Human Review Queue
-> Found Opportunity
-> Lead or Estimate Draft
-> Human-approved follow-up only
```

The agent may help find and organize work. It must not submit bids, contact customers, send messages, approve estimates, or make commitments without explicit user approval.

## Source Types

1. Public web sources
   - Public bid pages, public PDFs, RSS feeds, public procurement pages, and public agency notices.
   - Must respect robots.txt, source terms, rate limits, and access-control signals.

2. Official APIs
   - Preferred for recurring ingestion when available.
   - Use documented API keys or OAuth scopes only.

3. OAuth or user-connected accounts
   - Gmail, Outlook, Drive, Dropbox, or approved portal integrations.
   - Scope narrowly and store tokens only through a secrets-safe design.

4. Email ingestion
   - Forwarded bid invites, plan-room notices, GC invite emails, and attachment parsing.
   - Good early source because user intent is explicit.

5. File, PDF, or screenshot upload
   - User uploads bid invite PDFs, screenshots, specs, or plan-room notices.
   - Good MVP path because it avoids scraping and auth risk.

6. Manual human-in-the-loop tasks
   - Login required, MFA required, CAPTCHA, plan access, unclear terms, or missing details become task cards.

7. Approved browser session
   - User opens an authorized session.
   - Agent may assist only inside the approved session and must stop at MFA, CAPTCHA, paywall, or blocked access.

## Source Adapter Contract

Every adapter should use the same model:

```text
adapterId
sourceType
authMode
allowedActions
fetchOrIngest()
extract()
normalize()
dedupeKey()
scoreInputs()
failureReason()
humanTaskRequired()
```

Adapter outputs should be normalized into a found opportunity draft before anything reaches Leads or Estimates.

## Auth And Security Rules

Hard rules:

- Do not bypass login, CAPTCHA, MFA, paywalls, robots.txt, rate limits, or access controls.
- Do not scrape private portals without authorization.
- Do not store source passwords.
- Do not ask users to share passwords with the agent.
- Do not store OAuth tokens in normal app records, notes, logs, or frontend state.
- Do not download restricted documents unless the user/session/API is authorized.
- Do not submit bids.
- Do not contact customers, agencies, GCs, or owners without explicit user approval.
- Do not expose source setup, job-search controls, or opportunity conversion to field users.

Role boundaries:

- Owner/Admin: configure sources, connect accounts, approve conversions.
- Estimator/Ops Manager: review opportunities and create drafts when package and permissions allow.
- Foreman/Employee: no access.
- Support: no source credentials, no impersonation, no customer/source account access.

## Data Model Direction

Use existing `opportunitySearchProfiles` and `foundOpportunities` first. Add fields only when needed.

Likely additive `foundOpportunities` fields:

```text
sourceType
sourceAdapterId
sourceRecordId
sourceRetrievedAt
sourceTermsStatus
sourceAccessStatus
extractionConfidence
missingInfoItems
attachmentRefs
duplicateOfOpportunityId
humanReviewStatus
humanReviewRequiredReason
leadDraftId
estimateDraftId
```

Future tables if the system grows:

```text
job_source_connections
job_source_runs
job_source_raw_records
job_source_attachments
job_source_human_tasks
job_source_audit_events
```

OAuth token storage and browser-session handling require a separate secrets and production-safety review.

## Extracted Opportunity Fields

Target fields:

```text
projectName
agencyOrCustomer
location
trade
projectType
bidDueAt
jobWalkAt
contactName
contactEmail
contactPhone
scopeSummary
attachments
sourceUrl
planUrl
estimatedValue
requirements
addenda
missingInfoItems
riskFlags
fitScore
```

All source URLs must be sanitized before storage so tokens, signatures, sessions, codes, and secrets are not saved in notes.

## Fit Scoring

Scoring should be explainable.

Inputs:

- trade match
- service area or distance
- due date urgency
- project size/value fit
- scope match
- source quality
- relationship quality
- required forms or prequalification risk
- missing info count
- attachment completeness
- duplicate risk

Outputs:

```text
fitScore: 0-100
fitLabel: Strong / Good / Maybe / Poor
reasonToBid
reasonToSkip
riskFlags
missingInfoQuestions
recommendedNextStep
```

## UI Flow

Place the workflow inside AI Office / Daily Job Finder, then route qualified work into Leads or Estimate Studio.

Screens:

- Source Setup: profiles, source type, auth mode, cadence, allowed actions.
- Ingestion Queue: new, needs review, missing info, blocked, duplicate, converted.
- Opportunity Detail: extracted fields, evidence, attachments, fit score, risk, missing info.
- Human Task Drawer: login/MFA/CAPTCHA/access/terms/missing-info tasks.
- Conversion Preview: create lead draft or estimate draft after human approval.

## Agent Workflow

```text
1. Select source profile.
2. Check source policy and auth mode.
3. Ingest only allowed data.
4. Extract normalized opportunity fields.
5. Redact secrets from URLs and notes.
6. Dedupe against existing leads and opportunities.
7. Score fit.
8. Flag missing info and risk.
9. Save as found opportunity.
10. Ask human before conversion.
11. Create lead or estimate draft only after approval.
12. Preserve source evidence and audit history.
```

## Failure Handling

Stop and create a human task when:

- login is required
- MFA is required
- CAPTCHA appears
- robots.txt disallows access
- a paywall or subscription wall appears
- site blocks automation
- terms are unclear
- attachment download requires authorization
- source data conflicts
- due date, contact, scope, or location is missing
- possible duplicate exists
- source looks like spam or irrelevant work

Failure object:

```text
status: needs_human
reason
safeNextStep
sourceUrl
lastCheckedAt
```

## Human-In-The-Loop Gates

Human approval is required for:

- connecting an account
- using an authenticated browser session
- downloading restricted docs
- converting opportunity to lead
- creating estimate draft
- contacting customer, agency, owner, or GC
- submitting any bid
- marking an opportunity as actively bidding
- using data from uncertain access context

## MVP Phases

Phase 1: Manual and file ingestion

- Add/extend found opportunity intake.
- Accept pasted text, PDFs, screenshots, and forwarded bid content.
- Extract fields, missing info, risks, and fit score.
- Save found opportunity.
- Convert to lead only after approval.
- No web scraping.

Phase 2: Public and official source profiles

- Save public URLs and official API sources.
- Generate safe search plans.
- Support manual source checks.
- Respect robots and source terms.
- No headless browser automation yet.

Phase 3: Email ingestion

- Start with forwarded bid invites.
- Later support Gmail/Outlook OAuth with narrow scopes.
- Parse attachments and source links.
- Human review before conversion.

Phase 4: Approved browser session

- User starts authorized session.
- Agent assists only in the approved session.
- Stop at MFA, CAPTCHA, paywall, or blocked access.
- Save extracted draft only.

## Verification Requirements

Tests should prove:

- field users cannot access job search controls
- no auto-contact or bid-submission endpoint exists
- sensitive URL tokens are stripped
- duplicates are detected
- missing info is flagged
- conversion requires authorized approval
- blocked sources create human tasks
- public/manual/file ingestion works without credentials

## First Implementation Slice

Build `Opportunity Scout Phase 2: Source Adapter + Human Review Ingestion`.

Smallest safe slice:

- planning/data helpers only
- manual/file/pasted-text ingestion
- normalized found opportunity draft
- missing-info and fit-score helpers
- owner/admin/estimator review gate
- tests for permissions, redaction, dedupe, and no auto-contact

Do not build browser automation, OAuth token storage, portal login flows, bid submission, or automatic outreach in the MVP.

## Agent Leads Provider Activation Status

v30 adds the Human-Approved Smoke Evidence Recorder. Apex Agent now prepares a safe evidence draft and validator for a manually run hosted/demo smoke: result status, environment label, reviewed target URL, selected safe public source, review queue count, operator, timestamp, notes, and an explicit acknowledgement that no external action occurred.

The recorder rejects secret-like text, signed/session URLs, mismatched source config/URL values, missing acknowledgements, and claims that Apex contacted someone, submitted a bid, collected payment, scheduled work, deployed, wrote integrations, saved leads, or changed production data. It does not auto-run smoke, open browsers, store credentials, call providers, write server records, touch production data, or persist audit rows automatically.

v31 adds Smoke Evidence Review Intake. Owner/admin users with the Agent Leads package can submit the human-approved v30 smoke evidence payload to `POST /api/agent/os/provider/smoke-evidence`. The server rebuilds the current company-scoped daily Agent Leads plan, validates the payload against the selected safe public smoke source, and persists only a redacted Agent OS audit event after the acknowledgement is true.

This intake route still cannot run a browser, fetch a provider, log in, save or convert leads, contact customers/sources, submit bids, collect payment, schedule work, deploy, touch production data, store credentials, or write integrations.

v32 adds the Controlled Daily Public-Source Run Evidence Packet. Owner/admin users can review `GET /api/agent/os/provider/daily-public-run-evidence` to see the next run date, selected public no-login source URLs, connector and budget limits, idempotency keys, expected review-only output, blocked source rows, and the exact external actions that remain locked.

The packet is not executable and is not cron-safe by itself. It cannot run the daily job finder, open browsers, fetch providers, log in, scrape, contact customers or sources, auto-save or convert leads, create estimates, submit bids, collect payment, schedule work, deploy, touch production data, store credentials, or write integrations.

v33-v37 complete the controlled-run review chain in one batch:

- `POST /api/agent/os/provider/daily-public-run-approval` records owner/admin approval for the exact v32 packet boundary.
- `GET /api/agent/os/provider/daily-public-run-preflight` checks approval, idempotency keys, budget, source rows, role/package gates, and external locks.
- `POST /api/agent/os/provider/daily-public-run-evidence` persists review-only evidence rows after acknowledgement; it rejects provider fetch, auto-save, contact, bid, payment, scheduling, and integration flags.
- `POST /api/agent/os/provider/daily-public-run-outcomes` records accepted/rejected/duplicate/no-fit review outcomes as redacted learning signals.
- The Agent Leads UI now shows packet, approval/preflight, evidence prep, and outcome-loop status together.

These endpoints still do not run browser automation, fetch providers, log in, scrape, contact anyone, save or convert leads, create estimates, submit bids, collect payment, schedule work, deploy, touch production data, store credentials, or write integrations.

v38 completes the first review-to-opportunity bridge for Agent Leads:

- Adds no-login public permit/notice and public agency calendar connector families.
- Adds review-only adapter contracts for those sources with bounded public GET shape only.
- Adds `POST /api/agent/os/provider/review-queue-draft-opportunity` so an owner/admin can save a reviewed provider row as a normal Found Opportunity draft.
- The draft enters the existing Opportunity Scout review workflow with `needs_review`; it does not create or convert a lead.
- The existing Approve For Lead and Create Lead gates remain separate human actions.

The v38 bridge still cannot auto-save leads, contact customers or sources, submit bids, collect payment, schedule work, log in, store credentials, deploy, touch production data, or write integrations.

v39 adds Agent Leads Local Completion Readiness:

- Adds `GET /api/agent/os/provider/local-completion-readiness` for owner/admin package-gated review.
- Reports local implementation percent and `complete_review_first_local` when the review-first code paths are present.
- Covers source setup, daily runner/run record, controlled public-source approval/evidence/outcome loop, review-row to Found Opportunity draft handoff, learning loop, and external action locks.
- Separates local code completion from workspace/pilot readiness with warnings for source setup, smoke evidence, and exact run approval.
- Keeps production autonomy off and lists remaining real-pilot and external-gate work.

The v39 readiness packet does not run providers, browse, log in, scrape, auto-create leads, contact customers or sources, submit bids, collect payment, schedule work, deploy, touch production data, store credentials, or write integrations.

v40 adds the Agent Leads Production Readiness Gate:

- Adds `GET /api/agent/os/provider/production-readiness` to show whether Agent Leads is ready for founder-supported production review.
- Adds `POST /api/agent/os/provider/production-readiness-evidence` for owner/admin users to record redacted evidence that the required release checks passed.
- Required evidence includes Agent Leads/learning/roles/auth/server/estimates verification, build, diff check, backup, restore, production-auth smoke readiness, monitoring, claims, pilot rehearsal, support intake, rollback/incident readiness, and legal/business review.
- The gate can become `ready_for_founder_supported_production_review` only when local review-first completion is green, every production evidence check is recorded, and all external/customer/production mutation locks remain intact.
- Wider public launch and production autonomy remain off even when founder-supported production review is ready.

The v40 gate is fail-closed. It does not deploy, alter production data, enable production autonomy, browse, log in, scrape, auto-create leads, contact customers or sources, submit bids, collect payment, schedule work, store credentials, or write integrations.
