# Apex HQ Master Roadmap

Status note, 2026-05-17:
This file is historical/reference strategy. Current workspace truth, completed phases, latest release, do-not-rebuild list, and next build phase now start in `docs/APEX_HQ_CANONICAL_SOURCE_OF_TRUTH.md`, then `docs/APEX_HQ_LIVING_FINISH_PLAN.md`, then `docs/APEX_HQ_TOOL_COMPLETION_BLUEPRINT.md`. Use those files before acting on any "current priority" text below.

This roadmap describes the long-term direction for building Apex HQ into a premium contractor growth and operations platform.

Product promise:

Find the work. Bid the work. Win the work. Run the work. Track labor. Prove the work. Get paid.

## Current Priority

Start with the foundation that lets Apex HQ safely find work for multiple contractors every day:

1. Company separation hardening
2. Operator company management
3. AI Opportunity Scout foundation
4. Source setup and daily job-finding workflow
5. Bid board and bid/no-bid workflow

Reason: daily AI job finding becomes powerful only after records, companies, permissions, and source ownership are safe.

## Non-Negotiable Rules

- User-facing product name is Apex HQ.
- Do not expose secrets or add frontend secrets.
- Do not rely on UI hiding for permissions; backend must enforce access.
- Field users must not see leads, estimates, pricing, margins, payroll costs, internal notes, settings, AI office tools, billing, or other company data.
- AI can recommend and draft, but risky actions require human approval.
- Do not auto-send customer email/text, auto-bid, auto-price, or auto-route leads without approval.

## Phase 1: Trust And Company Safety

- Permission matrix by role
- Backend permission audit
- Company-scope audit for every record type
- Company separation hardening
- Operator-only company switching
- Managed company list
- Per-company setup status
- Audit log for sensitive actions
- Data export
- Archive/delete policy
- Backup restore drill
- Staging/demo environment
- Release rollback checklist
- Owner health and monitoring

## Phase 2: AI Opportunity Scout

- Daily AI job finder
- Saved search profiles by company
- Trade filters: concrete, fencing, decking, siding, excavation, remodel, GC, landscaping, sitework, exterior repair
- Service area radius
- Public bid source tracking
- City/county/state/school bid source tracking
- Plan room source tracking
- GC invite source tracking
- Website/private lead source tracking
- Email inbox bid invite parsing later
- Import support for outside bid platforms later
- Duplicate detection
- Fit score
- Urgency score
- Distance score
- Trade match score
- Bad-fit detection
- Missing info/RFI checker
- Bid due date extraction
- Job walk date extraction
- Bond/insurance/prevailing wage flags
- Scope summary
- Plan/spec link capture
- Contact extraction
- AI reason to bid
- AI reason to skip
- Watchlist
- Assign estimator
- Create lead from found job
- Create estimate from found job
- Daily owner digest
- Human bid/no-bid approval

## Phase 3: Lead And Sales Engine

- Lead inbox
- Lead sources
- Daily source checks
- Lead scoring
- Missing info checker
- AI Lead Assistant
- Follow-up queue
- Manual email/text/call drafts
- Contact history
- Mark sent/manual follow-up tracking
- Won/lost reasons
- Source performance
- Referral tracking
- Private customer request form
- Contractor lead routing
- Lead-sharing consent
- Sales pipeline board

## Phase 4: Bid Management

- Bid board
- Bid calendar
- Bid due reminders
- Job walk reminders
- Addenda tracking
- RFI tracking
- Plan/spec links
- Bid/no-bid decisions
- Estimator assignment
- GC/customer contact list
- Submitted bid archive
- Win/loss tracking
- Competitor/market notes
- Bid hit-rate analytics

## Phase 5: Estimating And Proposals

- Estimate templates
- Trade-specific templates
- Smart estimate paste
- Bluebeam CSV import
- AI takeoff notes parser
- Screenshot/plan backup attachments
- Takeoff backup
- Line items
- Alternates and add-ons
- Exclusions and assumptions
- RFIs
- Proposal sections
- GC bid packet
- Internal review packet
- PDF/print
- Estimate email sending
- Customer-facing proposal links
- Approval/signature later
- Estimate version history
- Follow-up history

## Phase 6: Jobs And Operations

- Jobs board
- Job details
- Startup checklist
- Crew assignment
- Schedule/calendar
- Field visibility controls
- Daily reports
- Uploads/photo evidence
- Delivery tickets
- Pre-pour
- Post-pour
- Change orders
- Closeout checklist
- Punch list
- Warranty/callbacks
- Job timeline

## Phase 7: Field Mobile App

- Big clock-in/out
- Break tracking
- My jobs
- One-tap daily report
- One-tap photo upload
- Delivery ticket upload
- Tool checklist
- PPE acknowledgment
- Toolbox talks
- Incidents
- Pre/post pour checklists
- Offline drafts
- PWA install
- Splash screen and app icon
- Push notifications later
- Field-only safe views

## Phase 8: Payroll And Labor Costing

- Employee time entries
- Job-coded hours
- Foreman review
- Office approval
- Time corrections
- Overtime calculation
- Paid/unpaid break rules
- Payroll period summaries
- Employee timecards
- Payroll export report
- Labor cost by job
- Labor budget vs actual
- Crew production rates
- Prevailing wage flags
- Certified payroll later
- Payroll notes/audit trail
- QuickBooks Payroll export later
- Gusto/ADP integration later
- Payroll admin permission separate from normal office permission
- Pay rates hidden from field roles unless explicitly allowed
- Payroll costs, profit, and margin hidden from employees and foremen

## Phase 9: Safety And Quality

- Incidents
- Safety policies
- Toolbox talks
- PPE
- Job hazard notes
- Required safety acknowledgments
- Required photo rules
- QA/QC checklists
- Concrete-specific quality checks
- Closeout proof
- AI incident summaries

## Phase 10: Money And Business Controls

- Estimate vs actual
- Labor hours
- Material tracking
- Delivery ticket totals
- Change order totals
- Production rates
- Job costing
- Profit/margin office-only controls
- Invoice/payment status later
- QuickBooks integration later
- Owner financial dashboard

## Phase 11: Customer Experience

- Public request page
- Customer portal
- Proposal review
- Approval/signature
- Project status
- Photo updates
- Appointment reminders
- Change order approval
- Invoice/payment links later
- Warranty/callback requests

## Phase 12: Notifications And Automation

- In-app notification center
- Due follow-ups
- New job opportunities
- Bid due soon
- Estimate follow-up due
- Job startup blockers
- Missing reports
- Missing photos
- Safety acknowledgments
- Email notifications
- SMS notifications
- Push notifications
- User notification preferences

## Phase 13: AI Office

- Daily owner briefing
- Daily job finder summary
- Lead assistant
- Proposal draft helper
- Missing info/RFI checker
- Job startup assistant
- Report/photo summaries
- Closeout summary
- Incident summary
- Production insights
- AI pending action approval queue
- AI rules/settings
- Limited safe auto-tasks only

## Phase 14: Platform, SaaS, And Admin

- Company setup
- Company switcher
- Managed setup
- Onboarding checklist
- Users/roles
- Module access
- Plan/modules later
- Billing later
- Industry modes
- Company templates
- Support/bug tracker
- Usage analytics
- Help center
- Public marketing site later

## Phase 15: Million-Dollar UI Standard

- Premium login and splash
- Dark sidebar
- Orange accents
- Clean command boards
- Compact KPI rows
- Right-side action rails
- Dense readable tables
- No wasted empty space
- No messy long forms
- Clean mobile field flows
- Clear next action on every page
- Executive dashboard
- Owner command center
- Polished proposal and customer screens
- Consistent buttons, badges, cards, tabs, drawers, and empty states

## Execution Order From Here

### 1A: Company Separation Hardening Audit

Inspect every record type and endpoint for company scope and role safety. Produce a fix list and patch any low-risk leaks immediately.

### 1B: Company Separation Fix Pass

Patch backend filters, bootstrap payloads, tests, and UI access where needed. Run role and company-scope verifies.

### 2A: Opportunity Scout Data Model

Define found opportunities, search profiles, source ownership, scoring fields, status states, and audit history.

### 2B: Opportunity Scout Command Board

Add the office-only UI for found jobs, watchlist, fit score, due date, bid/no-bid, assign estimator, and create lead/estimate actions.

### 2C: Daily Job Finder Runner

Add a safe server-side daily/manual runner. Start with configured sources and human review. No auto-bidding.

### 3A: Website And Source Setup UI

Make company source setup easy for John/operator, including website intake status and source check readiness.

### 4A: Bid Board

Turn found opportunities and lead opportunities into a bid calendar/board.

### 5A: Payroll Foundation

Extend time tracking into office-approved payroll periods, summaries, corrections, exports, and labor-cost-safe permissions.

## First Build Target

Begin with 1A: Company Separation Hardening Audit, then 1B fixes. After that, build 2A Opportunity Scout Foundation.
