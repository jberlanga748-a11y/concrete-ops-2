# Apex HQ Founder Demo Runbook v618

Status: ready for founder-led contractor demos
Production app: `https://app.apexhq.online`
Release evidence: Fly `concrete-ops-2` version `618`
Use with: `docs/SALES_DEMO_PLAYBOOK.md` and `docs/PUBLIC_CLAIMS_GUARDRAILS.md`

## Demo Goal

Show one practical contractor workflow:

```text
lead / estimate -> proposal -> job setup -> field handoff -> photo/report proof -> owner review -> closeout/billing prep -> follow-up
```

The point is not to show every feature. The point is to make the contractor feel:

```text
This would help me stop chasing job info across texts, spreadsheets, phones, and memory.
```

## Pre-Demo Checklist

Run these before the call if there is time:

- Open `https://app.apexhq.online/api/ready` and confirm database `ok`.
- Confirm production is on Fly release `v618` or newer.
- Confirm smoke/admin login works.
- Confirm `/billing` opens Billing / Payments / Packages Command.
- Confirm foreman mobile `/field` shows `Valley View Sidewalk Panels`.
- Confirm employee mobile `/jobs` shows `Valley View Sidewalk Panels`.
- Keep one phone-sized browser window ready for Field Mode.

Do not paste passwords into chat, docs, screen share, or notes.

## Opener

Use this, then ask a question quickly:

```text
I’ll keep this practical. Apex HQ is built for contractors who have leads, estimates, job notes, photos, reports, and follow-ups scattered across texts, spreadsheets, phones, and memory.

I’m going to show one workflow from office to field to proof. While I walk it, tell me where your company loses the most time chasing information.
```

If personal credibility helps:

```text
I’ve spent 15 years around concrete, from field work to the business side, so this is being built around the handoff problems I’ve actually seen.
```

## Discovery First

Ask two or three before clicking too much:

- Where do your leads and estimate notes live today?
- What gets lost between estimate approval and the crew starting?
- Where do job photos, reports, or proof end up?
- What delays billing or creates customer/GC arguments?
- What does the owner have to chase every week?

If they answer strongly, shape the route order around that pain.

## Main Demo Path

### 1. Command Center

Route: `/command-center`

Say:

```text
This is the owner/admin command center. The goal is to show what needs attention today: leads, estimates, jobs, proof gaps, changes, billing prep, and problems.
```

Show:

- Daily priority queue.
- Money ready, jobs today, estimates to win, problems.
- Manual/review-first language.

Avoid:

- Do not call it fully automated operations.
- Do not imply it replaces the owner.

### 2. Leads / Growth

Route: `/leads`

Say:

```text
This keeps lead and follow-up context from disappearing. The goal is not guaranteed leads; it is making sure the work you already find does not fall through the cracks.
```

Show:

- Lead list/status.
- Follow-up context.
- Source or opportunity direction if relevant.

Avoid:

- Guaranteed jobs.
- Automated outreach claims.
- Ad spend or publishing promises.

### 3. Estimates / Proposals

Routes: `/estimates`, `/proposals`

Say:

```text
The estimate side is meant to turn rough project context into a cleaner proposal and a cleaner job handoff. Pricing stays office-side.
```

Show:

- Estimate/proposal workspace.
- Customer-safe packet direction.
- Proposal list if they care about GC/customer presentation.

Avoid:

- Do not promise accounting sync.
- Do not imply Apex HQ prices jobs automatically.
- Do not show margin/profit/payroll costs to field users.

### 4. Jobs

Route: `/jobs`

Say:

```text
Once work is won, the job needs enough detail for the office and field to stop re-asking the same questions.
```

Show:

- Job list/detail.
- Handoff/startup/readiness context.
- Proof and closeout signals.

Avoid:

- Do not over-demo every tab.
- Keep it tied to their pain: handoff, crew, proof, billing prep.

### 5. Field Mode

Routes: `/field` as foreman, `/jobs` as employee

Use phone-sized viewport.

Say:

```text
The field side is intentionally smaller. The crew sees the assigned work, clock/photos/reports/checklists, and safe next actions. They do not get office pricing, billing, admin settings, or the sales pipeline.
```

Show:

- `Valley View Sidewalk Panels`.
- `1 assigned job`.
- Clock In, Photos, Report, Pre-Pour, Change Request for foreman.
- Employee view with assigned work and field-safe actions.

Avoid:

- Do not claim offline editing is done.
- Do not claim hidden GPS. GPS is optional and user-tapped only.

### 6. Time / Payroll Prep

Route: `/time`

Say:

```text
Time rolls up for review and payroll prep. This is hours and exceptions, not paycheck processing.
```

Show:

- Pay period/review/export area.
- Exception/review-first language.

Avoid:

- Direct deposit.
- Tax withholding.
- Paycheck processing.
- Payroll provider writes.
- Pay rates or payroll costs in field views.

### 7. Change Orders

Route: `/change-orders`

Say:

```text
This gives field and office a cleaner way to track scope changes without pretending approval, pricing, or customer communication is automatic.
```

Show:

- Needs review, office review, approved, billing ready.
- Manual pricing/customer/GC review language.
- Field change request if relevant.

Avoid:

- E-sign.
- Public approval links.
- Automatic customer sends.
- Invoicing or payment collection.

### 8. Closeout / Billing Prep

Route: `/billing`

Say:

```text
This is billing prep, not live billing. Apex HQ helps organize proof, changes, time, and closeout context so the owner knows what is ready to review before normal invoicing.
```

Show:

- Billing / Payments / Packages Command.
- Billing candidates / invoice prep / proof blockers.
- Provider-ready billing boundary.

Avoid:

- Do not say Apex HQ creates invoices today.
- Do not say it collects payments.
- Do not say it replaces QuickBooks.

### 9. Communications / Portal Review

Route: `/communications`

Say:

```text
This is manual communication context and portal review prep. Nothing is emailed, texted, or sent automatically from here.
```

Show:

- Communication queue.
- Manual outreach detail.
- Customer Portal Command if useful.
- Provider-readiness and locked send language.

Avoid:

- Live customer links.
- Raw tokens.
- Customer sessions.
- Automatic SMS/email.

### 10. AI Office

Route: `/ai-office`

Say:

```text
AI Office is a helper layer. It can summarize, draft, prepare packets, and point to the next workflow, but it stays review-first and does not send, price, approve, schedule, bill, or publish for you.
```

Show:

- Apex Agent Operator commands.
- Review-first boundary.
- Action Inbox/Agent OS only if they ask about AI.

Avoid:

- AI autopilot.
- AI runs the business.
- AI bids/prices/sends automatically.

### 11. App Health

Route: `/app-health`

Say:

```text
This is the owner trust surface: app health, launch gates, audit context, backups/readiness evidence, and support diagnostics.
```

Show:

- App Health queue.
- Launch readiness evidence.
- Owner health / audit counts.

Avoid:

- Enterprise compliance claims.
- Security certifications not actually held.

## If Time Is Short

Use this 12-minute path:

1. `/command-center`
2. `/estimates`
3. `/jobs`
4. phone `/field`
5. `/billing`
6. `/communications`

Close with:

```text
Where would this save you the most chasing first: estimate follow-up, job handoff, field proof, change orders, or billing prep?
```

## Safe Answers To Common Questions

Does it replace QuickBooks?

```text
No. Apex HQ is not an accounting replacement right now. It helps organize job proof, changes, reports, and billing-prep context before your normal invoicing workflow.
```

Does AI send messages?

```text
No automatic sending. AI help is review-first: drafts, summaries, packets, and next-action guidance.
```

Will it get me jobs?

```text
It is not a guaranteed lead service. The goal is to help contractors organize opportunities, follow up cleaner, and win more of the work they already come across.
```

Is this self-serve?

```text
Not yet. Apex HQ is in founder-led demos and controlled pilots so we can set up one workflow correctly before wider rollout.
```

Can my crew see prices?

```text
No. Field users are intentionally kept in assigned field work and blocked from office pricing, billing, payroll, admin settings, and sales pipeline data.
```

What is the pilot?

```text
I would not try to switch your whole company at once. I would pick one workflow, like estimate to job to field proof, set up the right users, and test it for a short controlled pilot.
```

## Demo Rescue Lines

If the app pauses:

```text
While this loads, the important part is the workflow: office context becomes field work, field proof comes back to owner review, and nothing customer-facing fires without human review.
```

If they focus on one missing feature:

```text
That is useful feedback. For the first pilot I would still narrow to the workflow that saves the most chasing, then decide whether that missing piece matters enough to build next.
```

If they ask for automation:

```text
The direction is to automate carefully later. Right now Apex HQ is intentionally review-first around customer contact, billing, pricing, scheduling, and AI actions.
```

If they ask for pricing too early:

```text
Before pricing it, I would want to know which workflow is actually valuable for you and who would use it. The pilot should prove that first.
```

## Closing Script

Use this after the walkthrough:

```text
Based on what you saw, I would not start by moving your whole business into Apex HQ. I would pick one real workflow and test it: estimate to job to field proof to owner review.

Who on your team would need to use that for the test to be real?
```

Then ask:

- What workflow should we test first?
- What real job or estimate should be the first record?
- Who is the owner/admin user?
- Who is the field lead?
- What would make the pilot worth continuing?
- Are you comfortable setting a kickoff?

## After-Call Notes

Capture this immediately:

- Contractor name and trade.
- Current tools.
- Biggest pain in their words.
- Workflow they cared about most.
- Confusing moment in the demo.
- Feature request or objection.
- Pilot fit: yes, maybe, no.
- Next action and date.

Do not invent testimonials, results, logos, customer quotes, or case studies from demo feedback.

## Final Guardrails

Do not promise:

- guaranteed leads, jobs, or revenue
- automatic bidding, pricing, sends, approvals, scheduling, payroll, invoicing, payment collection, publishing, or ad spend
- QuickBooks/payroll replacement
- hidden GPS
- enterprise compliance or certifications
- public self-serve signup

Do promise:

- founder-led walkthrough
- controlled pilot
- one practical workflow first
- review-first AI and communications
- field users blocked from office/private money data
- contractor-focused workflow organization
