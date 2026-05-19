# Apex HQ Job Search Agent Architecture

Status: planning only

Purpose: design a safe Opportunity Scout extension that helps contractors find, ingest, score, and organize job opportunities without bypassing access controls or taking customer-facing actions without approval.

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
