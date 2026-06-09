# Apex HQ Owner Daily Executive Brief

Date: 2026-06-06
Prepared for: John Berlanga
Reporting window: since last owner brief / current automation run
Boundary: brief-only update. No app code, deploy, push, messages, spend, production data mutation, schema/auth/billing/provider setting change, or permission loosening was performed by this run.

## 1. What Codex Agents Did Today

- Read the Apex HQ operating docs, canonical source of truth, living finish plan, recent briefs, git state, recent commits, and available QA/operator artifacts.
- Confirmed current branch head: `6fc6f7f` (`Make Apex live voice and body feel alive`) on `codex/apex-os-command-center`.
- Confirmed a large dirty worktree remains active: Apex OS control room, Ask/memory/approval helpers, permissions/navigation, avatar lab/assets, docs, and QA outputs are changed or untracked.
- Updated GTM/email/Instagram/customer-success/assistant-model planning artifacts are draft-only. No outreach, posts, DMs, emails, customer actions, or provider actions were sent.

## 2. What Changed In The App / Business

- Production remains at the latest recorded Apex live operator release series (`v706` recorded in the prior owner brief), with public signup still off.
- Local-only work advanced the private Apex OS operator experience: live voice/body behavior, speaker health, reopened listening after answers, avatar/model lab, memory suggestions, Ask/memory/approval planning, and broader control-room/navigation work.
- A candidate `apex-assistant.glb` and related avatar assets now exist locally with visual QA evidence, but they are not released.
- Business posture is unchanged: Apex HQ is founder-led demo / controlled-pilot only, not public self-serve SaaS.
- Prospect prep remains draft-only. Priority order from current GTM/customer-success docs is M2 Mini, RPB Fence, Mid Valley Fence, OnPoint, then LME Concrete, pending John approval.

## 3. What Was Validated

- This run verified production health directly at `2026-06-06T18:31:43Z`: `https://app.apexhq.online/api/ready` and `https://concrete-ops-2.fly.dev/api/ready` returned ready with database OK; `https://app.apexhq.online/api/health` returned healthy.
- Setup status checked live: `needsSetup=false`, `demoMode=false`, `demoUserExists=false`, `publicSignupEnabled=false`, `publicEstimateRequestEnabled=true`.
- Existing local QA evidence shows live voice/body passed desktop/mobile: spoken Sound Check, transcript capture, talkback, reopened listening, GLB body state changes, no horizontal overflow, no console errors, and no failed requests.
- Existing avatar lab QA shows `apex-assistant.glb` returned 200, desktop/mobile canvas rendered, speaking/blocked modes were visible, and no console/failed-request issues were recorded.
- Email triage found no Apex HQ prospect/customer/pilot replies requiring a founder response in the checked window.

## 4. Deploy / Health Status

- Nothing deployed in this executive-brief run.
- Current production health is OK from direct checks above.
- Current local head `6fc6f7f` and later dirty-worktree changes should be treated as not fully released unless a clean release pass is prepared.
- Production auth/login smoke is still an evidence gap because the recorded checks remain health/route/API-denial oriented, not authenticated owner workflow smoke.

## 5. Current Blockers

- Public self-serve launch remains blocked pending legal/privacy/terms/public-claims review, guided pilot completion or waiver, explicit public launch approval, and explicit approval to re-enable production signup.
- Dirty worktree needs a release decision and cleanup before shipping more Apex OS/avatar work.
- Production auth/login smoke needs a deliberate decision because it creates session/audit side effects.
- Real outreach remains blocked until John approves exact copy, sender/footer/compliance handling, and manual send order.
- Gmail storage pressure remains an operational risk for missing real Apex HQ replies.

## 6. Exact Approvals Needed From John

1. Approve or reject preparing a clean release for current Apex live voice/body and related Apex OS local work.
2. Decide whether the avatar/model lab should move toward production or stay prototype-only.
3. Approve whether to run a dedicated production owner/auth smoke.
4. Approve or edit the M2 Mini warm text.
5. Approve or edit the fence cold text/email/call opener and confirm sender/footer/compliance handling.
6. Approve or reject any public self-serve launch work and production signup re-enable work.

## 7. Tomorrow's Top 3 Priorities

1. Make the release call: ship a clean Apex OS/live body package or hold production while avatar/control-room work continues locally.
2. Run founder-demo readiness smoke before booking walkthroughs: owner login, Command Center, estimate/proposal, job setup, field proof, owner review, and field-safe mobile.
3. Clear outreach approvals, then manually work the first prospect wave in the approved order.

## 8. Safety / Claims / Field-User Risk

- This run made only documentation and automation-memory changes.
- Apex OS remains private, operator-only, review-first, and non-executing unless explicitly approved through gated work.
- No live sends, ad spend, billing/payment, provider writes, production mutations, deploys, hidden GPS, customer publishing, or irreversible action path was approved or executed.
- Field users must still never see Apex OS, leads, estimates, pricing, profit/margins, payroll, billing, office notes, admin/company setup, provider setup, AI office tools, or other company data.
- Claims must stay conservative: no guaranteed leads/jobs/revenue, no AI autopilot promise, no accounting/payroll replacement, no fake proof, and no public self-serve launch claim.
