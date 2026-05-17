# Apex HQ Communication Automation Roadmap

Status: business planning only
Current state: manual outreach and human-reviewed drafts

## Plain Answer

Yes, agents can eventually help run more of the communication workflow, but it should be phased.

The safe order is:

1. Agent drafts messages.
2. Human reviews and sends.
3. Agent helps log replies and draft responses.
4. Human approves sends from connected email/text tools.
5. Limited approved automation for follow-ups.
6. Phone/call workflows only after a real telephony system, consent rules, and fallback handling exist.

## What Agents Can Help With Now

Now, without sending:

- draft cold emails
- draft texts
- draft call scripts
- draft replies
- summarize call notes
- update docs/trackers
- prep daily call sheets
- prepare demo recaps
- prepare pilot onboarding notes
- create follow-up sequences

## Email Automation Path

### Phase 1: Draft Only

Agent prepares:

- email body
- subject
- follow-up timing
- personalization
- reply draft

Human sends manually.

### Phase 2: Connected Inbox With Approval

Possible later with the right connector/tool:

- agent reads replies
- agent drafts response
- human approves send
- tracker updates automatically or semi-automatically

Rules:

- no personal Gmail
- business inbox only
- no auto-send without approval
- unsubscribe/do-not-contact honored
- no fake claims

### Phase 3: Limited Automation

Possible later:

- send approved follow-up sequences
- pause sequence on reply
- create demo booking drafts
- route interested leads to founder

Requires:

- business email deliverability setup
- contact consent/compliance rules
- clear opt-out handling
- message approval policy
- audit trail

## Text/SMS Automation Path

SMS is more sensitive than email.

Requirements before agent-sent texts:

- business phone/texting provider
- opt-in or legally safe outreach process
- opt-out handling
- message logs
- human approval for first outbound campaigns
- clear identity: "John with Apex HQ"

Safe phase:

- agent drafts texts
- founder sends manually from phone
- founder pastes replies into chat
- agent drafts next response

Later phase:

- connected business texting tool
- human-approved send
- opt-out handling
- tracker sync

Avoid:

- bulk SMS blasting
- AI auto-replying without review
- sending after someone says stop

## Phone Call / Voice Answering Path

### Can An Agent Call People?

Not by itself in this current docs workflow.

An agent could only place calls later if connected to a real telephony system or app that supports outbound calling. That would require explicit setup, legal/compliance review, call logging, caller ID, and human approval rules.

Recommended near-term:

- founder calls from phone
- agent provides call sheet
- founder logs/pastes notes
- agent drafts follow-ups

### Can An Agent Answer Calls?

Not in this current setup.

Possible later only with:

- business phone system
- AI voice/assistant integration
- call routing rules
- recording/consent policy where required
- handoff to human
- clear disclosure if AI is speaking
- fallback when caller needs a real person

Recommended path:

1. Use voicemail and missed-call text manually.
2. Add structured call notes.
3. Add human-reviewed reply drafts.
4. Only consider AI answering after business process, legal language, and support workflow are stable.

## Recommended Business Phone Setup

For now:

- founder uses phone for calls
- use a business number if possible
- keep voicemail simple
- log all call outcomes in `OUTREACH_TRACKER.md`

Voicemail:

```text
Hey, this is John with Apex HQ. Leave your name, company, and the best number to call back. I will get back to you as soon as I can.
```

Missed-call reply:

```text
Hey, this is John with Apex HQ. Sorry I missed you. Was this about the contractor workflow walkthrough?
```

## Guardrails For Future Agent Communication

- human approval before first automated send
- no hidden automation pretending to be a person
- no guaranteed leads or revenue claims
- no automatic pricing promises
- no sending after opt-out
- no sensitive customer data in unapproved tools
- clear logs of what was sent and when
- easy human takeover

## Best Next Step

Stay manual for first 10 customers.

Use the agent to prepare everything around the founder:

- who to call
- what to say
- what to send after
- what to log
- what the next move should be

After the first 10 pilots, decide what should be automated based on real reply patterns.
