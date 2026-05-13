# APEX_HQ_MASTER_CHECKLIST

## Current Priority
Apex HQ is in first-pilot mode. The current priority is helping Last Yard complete the first real workflow, fixing only blockers, and preparing a demo video after demo pages show meaningful content.

## 1. Apps / Environments
- [x] Internal/testing app: [app.apexhq.online](https://app.apexhq.online/)
- [x] Demo app: [apex-hq-demo.fly.dev](https://app.apexhq.online/)
- [x] Last Yard pilot app: Apex HQ Last Yard pilot
- [x] Demo app uses separate Fly app and separate volume.
- [x] Last Yard pilot uses a separate Fly app and volume.
- [x] Last Yard deploy config is local-only: `fly.lastyard.toml`.
- [x] Last Yard pilot must keep `SEED_DEMO_DATA=false`.
- [x] Demo mode must stay on for demo only.
- [x] Demo mode must stay off for internal/testing and Last Yard pilot apps.
- [x] Customer pilot setup guide exists in `CUSTOMER_PILOT_SETUP.md`.

## 2. Pilot Status
- [x] First pilot customer identified: Last Yard Concrete LLC.
- [x] Jacob Brown is the admin / owner contact.
- [x] Last Yard pilot app is deployed and isolated from demo/internal data.
- [~] Pilot is ready for first real workflow validation.
- [ ] Jacob logs in and confirms admin access on the pilot app.
- [ ] Jacob adds at least one employee or foreman.
- [ ] One real job is created in the pilot app.
- [ ] A field user logs in successfully.
- [ ] A field user clocks in successfully.
- [ ] A field user uploads one real photo successfully.
- [ ] A foreman or admin submits one real daily report.
- [ ] An admin prints one daily report or job packet from real pilot data.

## 3. Built Modules
- [x] Customers
- [x] Leads
- [x] Public Estimate Request form
- [x] Estimates
- [x] Convert approved estimate to job
- [x] Jobs
- [x] Crew assignments
- [x] Users / employees
- [x] Role permissions
- [x] Foreman workspace
- [x] Employee workspace
- [x] Time tracking
- [x] Weekly hours
- [x] Daily Reports
- [x] Uploads / photo evidence
- [x] Timestamp + optional GPS on uploads
- [x] Safety & PPE
- [x] Incidents / safety concerns
- [x] Toolbox Talks nav using safety policies / toolbox guidance
- [x] Tool Checklist
- [x] Concrete Calculator
- [x] Multi-section takeoffs
- [x] Pre-Pour Checklist
- [x] Post-Pour Checklist
- [x] Change Order Requests
- [x] Delivery Tickets
- [x] Print Daily Report
- [x] Print Job Packet
- [x] Settings branding
- [x] Company profile
- [x] Print packet footer / disclaimer
- [x] Demo mode / demo data
- [x] Separate demo Fly app and volume
- [x] Separate Last Yard pilot app and volume

## 4. Permissions / Safety Rules
- [x] Do not change deployment config unless explicitly asked.
- [x] Do not change Fly config unless explicitly asked.
- [x] Do not change env vars during normal product work.
- [x] Do not reset customer data.
- [x] Do not touch Last Yard data unless explicitly asked.
- [x] Do not touch demo data unless the task is specifically about demo data.
- [x] Do not weaken permissions.
- [x] Field roles must not see Settings.
- [x] Field roles must not see Leads.
- [x] Field roles must not see full Customers.
- [x] Field roles must not see Estimates or pricing.
- [x] Field roles must not see payroll.
- [x] Field roles must not see profit or margin.
- [x] Field roles must not see office-only notes.
- [x] Real/internal app must not show demo login credentials.
- [x] Demo app should still show demo login credentials.
- [x] Demo mode must never run against real/internal or Last Yard pilot data.
- [x] Keep changes small and focused.
- [x] One task = one branch = one PR.

## 5. Current Known Issues
- [~] Safety nav body ordering still needs final safe verification:
  - Incidents should start with incident form/list.
  - Toolbox Talks should start with toolbox guidance and acknowledgment.
  - PPE should start with PPE checklist and acknowledgment.
- [~] Demo pages need meaningful content confirmation before a polished demo video can be recorded.
- [~] Pilot success still depends on the first real Last Yard workflow being completed cleanly.

## 6. Immediate Next Steps
- [~] Verify the final safe section ordering on Safety routes without reintroducing the larger refactor risk.
- [ ] Support Jacob through the first pilot login and first real job setup.
- [ ] Confirm employee / foreman creation works cleanly in the Last Yard pilot app.
- [ ] Confirm one field user can clock in and upload one photo on the pilot app.
- [ ] Confirm one daily report can be submitted from the pilot app.
- [ ] Confirm one print packet can be generated from real pilot data.
- [ ] Record a contractor-facing demo video after demo pages show meaningful content end to end.

## 7. What Not to Build Right Now
- [x] Big `App.jsx` refactor
- [x] Code splitting
- [x] SQLite rewrite
- [x] Mutation response rewrite
- [x] Bootstrap payload rewrite
- [x] Multi-company signup
- [x] Billing / subscriptions
- [x] QuickBooks
- [x] SMS
- [x] Customer portal
- [x] Full logo upload
- [x] Payroll / pay rates
- [x] Global theme rewrite
- [x] Huge new modules before pilot feedback

## 8. Future Roadmap
- [ ] Warranty / callback tracking
- [ ] Punch list
- [ ] Inspection tracking
- [ ] Permit tracking
- [ ] Subcontractor / vendor tracking
- [ ] Supplier management
- [ ] Material / provider map
- [ ] Job route / map planning
- [ ] Customer approvals / signatures
- [ ] Internal vs customer-visible notes
- [ ] Production metrics
- [ ] CSV import / export
- [ ] Terms / contract templates
- [ ] Pre-existing damage log
- [ ] Job closeout packet
- [ ] AI job / office assistant
- [ ] Voice-to-text field notes
- [ ] Daily report auto-summary
- [ ] AI photo tagging
- [ ] Text message integration
- [ ] QuickBooks export
- [ ] Prevailing wage / certified payroll
- [ ] Multi-company / franchise support
- [ ] Data retention / legal hold
- [ ] Activity / security log
- [ ] User device / session management
- [ ] Required photo rules by job stage
- [ ] Required checklist rules before job close
- [ ] Material over / under tracking
- [ ] Crew productivity reports
- [ ] Employee certifications / license tracking
- [ ] Weekly Monday safety reminders
- [ ] Basic / Concrete Pro plan flags
- [ ] PWA / app store packaging

## 9. Last Yard Day-One Checklist
- [x] Pilot app exists.
- [x] Demo mode must be off.
- [x] `SEED_DEMO_DATA=false`.
- [x] Separate Fly app and separate volume are in place.
- [x] Jacob Brown is the admin / owner contact.
- [ ] Jacob logs in.
- [ ] Jacob creates or confirms at least one employee / foreman.
- [ ] Jacob creates the first real job.
- [ ] Field user logs in.
- [ ] Field user clocks in.
- [ ] Field user uploads one photo.
- [ ] Foreman or admin submits one daily report.
- [ ] Admin prints one daily report or job packet.

## 10. Demo Video Readiness Checklist
- [x] Demo app is isolated from internal and pilot data.
- [x] Demo logins exist:
  - Admin: `demo.admin@apexhq.app`
  - Foreman: `demo.foreman@apexhq.app`
  - Employee: `demo.employee@apexhq.app`
  - Password: `apexdemo123`
- [~] Dashboard shows meaningful demo content.
- [~] Leads show meaningful demo content.
- [~] Jobs show meaningful demo content.
- [~] Daily Reports show meaningful demo content.
- [~] Uploads / photo evidence show meaningful demo content.
- [~] Safety / Incidents show meaningful demo content.
- [~] Toolbox Talks show meaningful demo content.
- [~] PPE shows meaningful demo content.
- [~] Delivery Tickets show meaningful demo content.
- [~] Print Packets show meaningful demo content.
- [~] Settings branding / company profile show meaningful demo content.
- [ ] Record and send a polished demo video after the full demo flow is visually ready.
