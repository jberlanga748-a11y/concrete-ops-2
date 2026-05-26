# Apex HQ Tool Integration Plan

Status: active operating plan
Owner: John Berlanga
Last updated: May 23, 2026

## Current Goal

Build the Apex HQ business machine so agents can prepare, schedule, draft, triage, and eventually send/respond across the main growth channels.

The target workflow:

```text
Prospect research -> outreach draft -> email/text send -> reply triage -> demo booking -> follow-up -> close -> onboarding -> testimonial/referral
```

## Connected In Codex Now

### Gmail

Status: connected

Can do:

- create drafts
- list drafts
- send drafts
- send emails
- search inbox
- read emails
- read threads
- label emails
- archive emails
- create labels
- daily email triage automation

Current setting:

- `john@apexhq.online` is now the default Gmail sender according to John.

Use for:

- outbound email outreach
- reply triage
- demo scheduling follow-up
- customer support inbox workflow
- sales follow-up

Guardrails:

- no fake claims
- honor opt-outs
- avoid legal/payment dispute replies without review
- keep sender as `john@apexhq.online`

### Google Calendar

Status: connected

Can do:

- create daily work blocks
- schedule demo blocks
- search calendar
- check availability

Use for:

- 45-day sales schedule
- demo booking
- follow-up reminders
- daily operator blocks

### Google Drive

Status: installed May 23, 2026

Permission note:

- Google Drive connector installed successfully.
- Creating a new Google Sheet failed because the app connection needs reauthentication with broader Drive scopes.
- Next action: reconnect Google Drive in Codex and approve Drive file create/edit permissions.

Can do:

- create Google Docs
- create Google Sheets
- create Google Slides
- search/read Drive files
- import/export docs and sheets

Use for:

- shared prospect tracker
- outreach pipeline sheet
- daily GTM brief archive
- investor/business docs later
- customer onboarding docs

Next setup:

- create `Apex HQ Sales Pipeline` Google Sheet
- create `Apex HQ Business Operating Hub` Google Doc

### Canva / Adobe Express

Status: available

Can do:

- create social media graphics
- create Instagram post graphics
- create simple visual assets
- create/edit designs

Use for:

- Instagram post images
- one-page sales sheets
- simple promo graphics
- customer handouts

Limit:

- can create/design assets, but does not publish to Instagram.

## Not Connected In Codex Right Now

### Instagram Posting / DMs

Status: not available as a direct Codex connector right now

Best options:

1. Manual posting from prepared drafts.
2. Meta Business Suite for scheduling posts.
3. Buffer, Later, Metricool, or Hootsuite for scheduling.
4. Meta Instagram Graph API later if Apex HQ needs custom automation.

Requirements for API route:

- Instagram professional account
- connected Facebook Page
- Meta developer app
- permissions review depending on actions
- content publishing permissions
- messaging permissions if DMs are needed

Current Codex role:

- draft captions
- draft reels
- draft stories
- create visual assets
- prepare posting calendar
- triage comments/DMs only if messages are pasted or exported into chat/docs

### SMS / Texting

Status: not available as a direct Codex connector right now

Best options:

1. Manual texting through Phone Link using prepared text sheets.
2. OpenPhone / Quo for business texting and calling.
3. Twilio for deeper SMS automation later.
4. Zapier/Make/n8n to connect forms, sheets, CRM, and SMS.

Recommended path:

- short term: Phone Link manual send
- first paid revenue: buy OpenPhone/Quo business number
- later: Twilio for API automation if needed

Guardrails:

- use one-to-one texts first
- identify John/Apex HQ
- include opt-out language for cold texts
- honor stop/no responses
- avoid bulk spam

### Phone Link

Status: not available as a callable Codex tool right now

Can do manually:

- send texts from PC
- receive texts on PC
- use prepared messages from `docs/PHONE_LINK_TEXTS_READY_TO_SEND.md`

Cannot currently do from Codex:

- directly click Phone Link
- send texts through Phone Link
- answer calls through Phone Link
- run Phone Link as a true automation channel

Best use:

- John sends texts manually from Phone Link while Codex prepares exact scripts.

### Calls / AI Call Answering

Status: not connected

Best future tools:

- OpenPhone / Quo for business phone
- Twilio Voice for programmable calls
- Vapi, Retell AI, or Bland AI for AI call answering later
- Google Calendar for booking callbacks/demos

Do not do yet:

- AI answering customer calls before offer, pricing, support rules, legal language, and escalation path are clear.

## Recommended Stack By Stage

### Stage 1 - Right Now / No Extra Money

Use:

- Gmail
- Google Calendar
- Google Drive
- Canva / Adobe Express
- Phone Link manually
- Instagram manually

Agent role:

- research prospects
- create email drafts
- create text drafts
- create Instagram drafts
- triage inbox
- update pipeline docs
- prepare daily schedule

### Stage 2 - First Revenue

Buy:

- OpenPhone / Quo business phone number

Use for:

- business texts
- business calls
- call logs
- cleaner customer/prospect communication

Why:

- separates Apex HQ from John's personal phone
- better than Phone Link for business operations
- easier to automate later than personal SMS

### Stage 3 - Growth Automation

Add:

- Zapier, Make, or n8n
- Google Sheets pipeline
- OpenPhone/Quo or Twilio
- Meta Business Suite or Buffer/Later/Metricool

Use for:

- new lead -> pipeline row
- follow-up reminder -> calendar task
- approved prospect -> text/email sequence
- Instagram scheduled content
- demo booked -> onboarding checklist

### Stage 4 - Custom Agent System

Add:

- Twilio SMS/Voice
- Meta Instagram Graph API
- Apex HQ CRM/pipeline integration
- OpenAI agent workflow

Use for:

- agent-assisted replies
- lead triage
- support triage
- approved follow-up sequences
- call summaries
- customer success workflow

## What To Do Next

1. Confirm Gmail drafts now send from `john@apexhq.online`.
2. Create an Apex HQ Google Sheet pipeline.
3. Move first 30 prospects into the Sheet.
4. Use Phone Link manually for texts from the prepared text sheet.
5. Use Instagram manually from the daily Instagram brief.
6. After first payment, buy OpenPhone/Quo or Twilio.
7. After that, connect automation hub.

## Current Practical Rule

Codex runs the business prep.

John still manually controls:

- Phone Link texting
- Instagram posting
- any channel that does not have a real connector yet

Codex can fully operate:

- Gmail drafting/sending once sender is confirmed
- Gmail triage
- Google Calendar
- Google Drive docs/sheets
- daily business planning
