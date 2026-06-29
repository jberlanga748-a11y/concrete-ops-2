# Apex HQ Apex OS Hard-Finish Roadmap

Last updated: 2026-06-06

Canonical owner: John Berlanga

## Purpose

This roadmap turns the Apex OS phase plan into a strict hard-finish sequence.

The operating rule is:

- Work one phase at a time.
- Do not bounce between phases.
- Do not start the next phase until the current phase has been audited, hardened, validated, documented, committed, pushed, deployed to production, production-checked, and release-documented.
- Do not rebuild working systems.
- Remove the "future pile" wherever the work is now approved and safe.

## Apex North Star

Recorded on 2026-06-07:

Apex is John's private operator. Apex is not a dashboard, review system, or safety product. Apex is one main intelligence with internal agents underneath it. John talks; Apex does. Apex reports only what matters. Apex should use what John already built instead of rebuilding. Apex should act for private, local, reversible work. Apex should not expose internal machinery unless John asks. Apex should feel alive, emotionally intelligent, capable, and personal. Apex HQ is one domain Apex can operate, not the whole identity of Apex.

Do Not Drift rule: before any Apex phase, Codex, Builder, and every Apex agent must ask, "Does this make Apex feel more like one private operator John talks to?" If not, stop and correct course before starting or continuing the phase.

This North Star outranks old phase wording that made Apex look like a dashboard, review queue, approval packet machine, or collection of separate tools John has to manage. Those historical entries remain as evidence of what was built; they are not the current experience direction.

## 2026-06-06 Private Life Operator Roadmap Addendum

Phase 3C corrected the Apex OS direction: Apex OS is John's private Jarvis-style life operator, not only an Apex HQ contractor-app assistant and not currently a customer-facing contractor AI feature. Apex HQ remains one important workspace/domain inside Apex OS. Any contractor-facing AI layer is optional, separate, and must start only when John explicitly asks for that direction.

Execution philosophy correction: Apex OS should not be framed as a review-only assistant or approval-packet machine. The target operating model is act-by-default for private, local, reversible, low-risk internal work, then report what changed and learn safely. Apex OS should interrupt John only for consequential actions such as spend, sends, orders, bookings, account/security/auth changes, billing/payment, schema/database/production/deploy, deletion, irreversible/high-impact work, public/customer-visible changes, or anything involving another person's time, money, privacy, or data.

Phase 3B checkpoint:

- Memory Suggestions Review UX is complete.
- Tests, build, and desktop/mobile visual QA passed before checkpointing.
- The operator-only boundary was preserved.
- Suggested memories remain separate from approved memories.
- Field/customer/demo users did not gain access to Apex OS memory.
- At the Phase 3B checkpoint, Phase 4 Personal Skill Registry had not been started.
- Safe stash checkpoint: `checkpoint/apex-os-memory-suggestions-phase-3b-complete`.

Phase 3D planning result:

- Active Intelligence loops are documented for morning planning, evening review, priority monitoring, memory suggestion review, research/watch queues, Apex HQ build progress tracking, opportunity/risk detection, cost/token monitoring, mood/energy-aware suggestions, and "what changed since last time?" checks.
- Each planned loop must have a trigger, input context, output/result, budget/cost limit, model tier suggestion, approval needs, safe logging metadata, cancel/pause behavior, and forbidden-action list before implementation.
- Knowledge Engine planning is documented for live web research, source-aware answers, saved research notes, personal/project knowledge bases, document/file retrieval, memory retrieval, task/reminder retrieval, tool-result summaries, compact prompt summaries, freshness checks, and trusted-vs-untrusted content handling.
- OpenJarvis lessons are architecture inspiration only: local-first/cloud-when-needed models, Intelligence / Engine / Agents / Tools & Memory / Learning separation, scheduled operators with heartbeat/health/rate limits, skill catalog, trace-based learning, model routing/cost tracking, redaction-before-cloud, and memory/search/knowledge engine. Do not add OpenJarvis as a dependency or install it.

Current Apex OS roadmap after Phase 3D:

1. Phase 3: Memory + Learning
2. Phase 3B: Memory Suggestions Review UX
3. Phase 3C: Private Life Operator Architecture
4. Phase 3D: Active Intelligence + Knowledge Engine Plan
5. Phase 4: Personal Skill Registry
6. Phase 4A: Action Permission Matrix
7. Phase 4.5: Model Router + Cost Governor
8. Phase 4.6: Trace + Learning Log
9. Phase 4.7: Redaction-Before-Cloud / Privacy Firewall
10. Phase 5: Tool Router
11. Phase 5B: External Action Approval System
12. Phase 5C: Untrusted Content / Prompt-Injection Firewall
13. Phase 6: Affective State
14. Phase 6A: Background Thinking Scheduler Plan
15. Phase 6B: Active Intelligence Loops
16. Phase 6C: Knowledge Engine / Research Memory
17. Phase 7: Desktop/Browser Agent Plan
18. Phase 7A: Desktop Sandbox / Watch Mode
19. Phase 7B: Browser Action Planning
20. Phase 8: Music + Second Screen
21. Phase 9: Life Automation Connectors
22. Phase 10: Apex HQ Builder/Operator Agent

Phase 4 is safe to start only as a private operator-only, non-executing skill registry. Do not add skill execution, external actions, browser/desktop control, music control, second-screen execution, ordering, booking, message sending, spending, production mutation, schema/auth changes, or contractor-facing AI until the relevant safety plan and approval gates are documented and approved.

## Local Network + Remote Access Jarvis Roadmap Addendum

Recorded on 2026-06-06. This addendum extends the post-Phase-10 Jarvis/device path after Home Assistant v1. It is planning/documentation only until each version is explicitly requested.

Goal: Apex OS should let John use Apex anywhere and safely inspect/control allowlisted home Wi-Fi and smart-home devices through legitimate authenticated paths. Target requests include "who is connected to my Wi-Fi?", "turn off the kid tablet's internet", "pause the tablet", "turn on my bedroom TV", "start work mode in the living room", "I'm away from home, show me what's going on", and "put yourself on the second screen."

Local Network + Remote Access sequence:

1. v0: Connected-device registry design.
2. v1: Read-only connected-device discovery from one legitimate source.
3. v2: Device naming, owner/user, room, type, and allowlist assignment.
4. v3: Router pause/unpause preview.
5. v4: One allowlisted pause/unpause action.
6. v5: Secure remote access design.
7. v6: Remote operator-only control.

Safety posture:

- Apex OS remains private and operator-only.
- Field/customer/demo users get no access.
- Router credentials, Wi-Fi passwords, VPN keys, Home Assistant tokens, OAuth tokens, cookies, sessions, provider headers, raw MAC/IP values, and private network identifiers stay server-side or redacted.
- No arbitrary scanning, port scanning, packet sniffing, password guessing, brute force, exploit behavior, MAC spoofing, deauth, or bypassing router/device security.
- No camera/mic recording, hidden surveillance, hidden GPS, hidden screen capture, hidden remote desktop, or hidden household monitoring.
- "Show me what's going on" means status, last-seen devices, Home Assistant state, and receipts, not camera/mic/screen surveillance.
- Pausing a child/household device affects another person's access, so first pause/unpause execution is Level 4 one-time confirmation, not act-by-default.
- Later act-by-default local network/device actions are possible only after John configures clear policies, allowlists, receipts, easy undo, and kill-switch behavior.

Preferred first implementation slice:

- v0/v1 only: build a private connected-device registry design and then read-only discovery from one John-owned, legitimate source such as Home Assistant/router integration.
- Do not add pause/unpause execution, router writes, remote access execution, family-device OS controls, device scanning, new schema, production deploy, or customer-facing behavior in v1.

## Local-First Intelligence Mode Roadmap Addendum

Recorded on 2026-06-06 and updated on 2026-06-07. Detailed plan: `docs/APEX_OS_LOCAL_FIRST_INTELLIGENCE_MODE.md`. Local-First Provider Policy v0 is implemented locally as the first enforcement slice. Ollama Provider v0 read-only health/model status is implemented locally. Ollama Provider v1 local Ask Apex response generation is implemented locally. Knowledge Intelligence local Ollama summary wiring is implemented locally.

Goal: Apex OS should run normal private Jarvis intelligence locally on John's Windows 11 RTX 5080 PC so everyday chat, memory, tasks/reminders, device planning, summaries, routing, affective state, background loops, and knowledge summaries do not require paid OpenAI calls.

Local-first sequence:

1. v0: local-first provider policy and no-paid-call guard design.
2. v1: deterministic provider policy helper and tests; no network/provider calls yet.
3. v2: safe server-side local provider config parsing and redacted local AI status.
4. v3: Ask Apex and Knowledge Intelligence consult the local-first guard before any provider call.
5. v4: Ollama native Windows adapter for Apex OS text chat/summaries.
6. v5: optional LM Studio/OpenAI-compatible localhost adapter.
7. v6: local voice STT/TTS plan and implementation options.
8. v7: manual cloud override receipt and budget guard.
9. v8: contractor AI helper migration review, only if John explicitly requests it.

Safety posture:

- OpenAI code remains in place until implementation is complete and audited.
- `OPENAI_API_KEY` alone must not trigger Apex OS paid calls once the guard is implemented.
- OpenAI cloud must be disabled by default for everyday Apex OS mode.
- Cloud use requires explicit per-request manual override from John, privacy firewall pass, prompt-injection firewall pass, model budget check, and a compact activity receipt.
- Local-provider outage must not silently fall back to OpenAI.
- Background loops must not use cloud by default.
- Frontend must not receive local provider URLs, OpenAI keys, tokens, headers, or raw model errors.
- Contractor AI helper migration is separate from Apex OS local-first migration.

Preferred first implementation slice:

- Completed: `shared/apexOsLocalFirstProviderPolicy.js` and focused tests for provider selection, no-paid-call behavior, cloud override requirements, offline fallback, and safe metadata.
- Completed: Ask Apex and Knowledge Intelligence consult the policy before OpenAI text-provider calls.
- Completed: server integration coverage proves `OPENAI_API_KEY` alone does not allow Apex OS cloud calls.
- Completed: Ollama v0 status reads localhost `/api/tags` only through operator-only `GET /api/apex-os/local-providers/status`, blocks non-local URLs, exposes no base URL/env/secrets, and does not call chat/generate or send prompts.
- Completed: llama.cpp Provider v1 is now the primary local Ask Apex and Knowledge Intelligence brain through local `/completion` with GPT-OSS when the sidecar/model is available and policy/privacy/untrusted-content gates pass. Ollama Provider v1 remains legacy fallback/status/manual inventory support through local `/api/chat`; `qwen3-coder:30b` remains manual-only for explicit deep coding, and OpenAI remains blocked unless explicit cloud override policy allows it.
- Completed: Knowledge Intelligence local summaries now default to local llama.cpp GPT-OSS when available; deterministic local fallback remains active when llama.cpp/Ollama/model/safety gates fail.
- Next: Local Research/Search Provider planning if it can stay local-first, source-aware, operator-only, and no-cloud/no-uncontrolled-browsing by default.
- Still do not call OpenAI automatically, install providers, download models, add paid search APIs, add uncontrolled web browsing, migrate contractor AI helpers, or expose field/customer/demo Apex OS access in the next generation slice.

Phase 4 completion checkpoint:

- Phase 4 Personal Skill Registry is complete locally as of 2026-06-06.
- The registry is centralized in `shared/apexOsSkillRegistry.js` and tested in `shared/apexOsSkillRegistry.test.js`.
- The registry covers available, planned, disabled, blocked, and deprecated capabilities across memory, planning, knowledge, Apex HQ, life, automation, communication, environment, safety, and system categories.
- All Phase 4 skill records are operator-only and non-executing; `canExecute` is forced false and planned/disabled/blocked skills are never executable.
- Read-only `GET /api/apex-os/skills` uses the existing Apex OS operator-only gate. No execute, plugin, install, tool-router, desktop/browser/music, ordering/booking, messaging, deploy, schema/auth, production, or customer-visible route was added.
- Ask Apex receives only compact capability context so it can answer honestly about available versus planned/locked skills.
- Minimal UI was skipped to keep Phase 4 small and avoid a broad Control Room refactor; a read-only Capabilities panel can be a future Phase 4B UI slice.

Phase 4A completion checkpoint:

- Phase 4A Action Permission Matrix is complete locally as of 2026-06-06.
- The matrix is centralized in `shared/apexOsActionPermissions.js` and tested in `shared/apexOsActionPermissions.test.js`.
- Risk tiers are `safe-answer`, `safe-read`, `internal-write`, `approval-required`, `external-action`, `high-risk`, and `forbidden`.
- Domains cover conversation, memory, tasks, research, planning, Apex HQ, files, desktop, browser, music, ordering, booking, messaging, email, calendar, billing, auth, schema, production, deployment, and system.
- `canExecuteNow` is forced false for every classification in Phase 4A.
- Unknown or unclear actions default to approval-required, never safe.
- Internal writes are limited to existing operator-only memory/task/reminder/planning endpoints; no execute endpoint, tool router, approval submission endpoint, API client helper, or UI surface was added.
- Ask Apex receives compact action-permission context and may explain draft/approval-required/unavailable/forbidden status without claiming execution.
- Money/order/booking/message/email/calendar/browser/desktop/music/file-write actions are approval-gated; auth/schema/production/deploy/delete actions are high-risk or approval-packet gated; hidden GPS, secret exposure, approval bypass, permission weakening, field/customer/demo Apex OS access, automatic sends/spend, production destructive action without approval, and contractor-facing Apex OS without an explicit future phase are forbidden.

Phase 4.5 completion checkpoint:

- Phase 4.5 Model Router + Cost Governor is complete locally as of 2026-06-06.
- The router is centralized in `shared/apexOsModelRouter.js` and tested in `shared/apexOsModelRouter.test.js`.
- Model tiers are `nano`, `mini`, `standard`, and `flagship`; budget levels are `tiny`, `small`, `normal`, and `deep`.
- Routes cover intent classification, memory suggestions, task summaries, safe summaries, normal chat, planning, research, knowledge synthesis, tool routing, permission classification, complex reasoning, coding analysis, risk review, affective state, and background loops.
- Ask Apex now receives compact internal model routing metadata and applies a `max_tokens` cap. Knowledge Intelligence uses the central safe-summary alias/cap while preserving the current cheap model behavior.
- Unknown routes fall back to `normal-chat` on `mini`, never `flagship`.
- Usage metadata stores no raw prompts, responses, messages, cookies, tokens, credentials, or private conversation dumps.
- No provider credential change, billing setting change, new endpoint, API client helper, model-switch UI, execution route, tool/skill execution, desktop/browser/music/ordering behavior, messages, spending, schema/auth/session change, production mutation, deploy, or field/customer/demo Apex OS access was added.

Phase 4.6 completion checkpoint:

- Phase 4.6 Trace + Learning Log is complete locally as of 2026-06-06.
- The centralized trace helper is in `shared/apexOsTraceLog.js` and tested in `shared/apexOsTraceLog.test.js`.
- Trace constants cover request, model-route, skill-registry, action-permission, memory-suggestion/review, task/reminder, knowledge-summary, background-loop-planned, approval-required, forbidden-action, and error events.
- Trace statuses cover started, completed, skipped, blocked, approval-required, forbidden, and error.
- Trace sources cover Ask Apex, Knowledge Intelligence, Model Router, Action Permission Matrix, Skill Registry, Memory, Tasks/Reminders, Approval Gate, Background Loop, and System.
- Ask Apex now emits packet-local metadata-only traces for route selection, permission classification, skill/task/memory context, approval gates, and forbidden gates. Knowledge Intelligence emits packet-local metadata-only safe-summary route/status traces.
- Trace entries force `canExecuteNow: false` and must not store raw prompts, raw responses, messages, private message bodies, document bodies, headers, cookies, tokens, credentials, API keys, database URLs, secrets, or conversation dumps.
- Persistence, `GET /api/apex-os/traces`, API client helper, trace UI, delete endpoints, execute endpoints, approval submission endpoints, provider/tool execution, external actions, browser/desktop/music/ordering behavior, messages, spending, schema/auth/session changes, production mutation, deploys, and field/customer/demo Apex OS access were intentionally not added.

Phase 4.7 completion checkpoint:

- Phase 4.7 Redaction-Before-Cloud / Privacy Firewall is complete locally as of 2026-06-06.
- The centralized privacy helper is in `shared/apexOsPrivacyFirewall.js` and tested in `shared/apexOsPrivacyFirewall.test.js`.
- Sensitivity categories cover secrets, credentials, API keys, tokens, cookies, authorization headers, database URLs, payment, SSN, phone, email, address, private personal, medical, legal, financial, customer data, company-private, field-restricted, production data, and unknown-sensitive content.
- Privacy actions are `allow`, `redact`, `summarize-only`, `approval-required`, and `block`.
- Context levels cover trusted private/internal contexts and untrusted cloud/web/browser/desktop/external connector/field/customer/demo/unknown contexts.
- Ask Apex sanitizes cloud-bound context, keeps compact privacy metadata, redacts sensitive local echo text, and falls back locally when the firewall blocks or requires approval.
- Knowledge Intelligence sanitizes provider-bound ranked rows and conflict warnings, keeps compact privacy metadata, and falls back locally when the firewall blocks or requires approval.
- Safe metadata never contains original sensitive values.
- No endpoint, API client helper, UI, persistence, schema/auth/session change, provider credential change, production mutation, deploy, tool/skill execution, desktop/browser/music/ordering behavior, messages, spending, notification, or field/customer/demo Apex OS access was added.
- Phase 5 has since been completed locally as a non-executing Tool Router that consumes the registry, permission matrix, model router, trace log, and privacy firewall. It does not add real tool execution or external actions.

Phase 5 completion checkpoint:

- Phase 5 Tool Router is complete locally as of 2026-06-06.
- The centralized router helper is in `shared/apexOsToolRouter.js` and tested in `shared/apexOsToolRouter.test.js`.
- Route constants cover answer-only, memory read/suggest/review, task/reminder read/write, planning, research, knowledge summary, Apex HQ build help, file read/write plans, browser/desktop/music plans, ordering/booking/messaging/email/calendar plans, deployment/production plans, and blocked routes.
- Route statuses are `available-non-executing`, `planned`, `approval-required`, `blocked`, `forbidden`, and `unavailable`.
- Route categories are `answer`, `memory`, `tasks-reminders`, `planning`, `research`, `knowledge`, `apex-hq`, `files`, `browser`, `desktop`, `music`, `ordering`, `booking`, `communication`, `calendar`, `deployment`, `production`, `safety`, and `system`.
- The router consumes or accepts the Personal Skill Registry, Action Permission Matrix, Model Router + Cost Governor, Trace + Learning Log, and Privacy Firewall outputs.
- Ask Apex now includes compact `toolRouteSummary` status and safe packet-local route trace metadata so it can describe capability status without claiming execution.
- Every route plan forces `canExecuteNow: false` and `executionLocked: true`.
- No endpoint, API client helper, UI, persistence, schema/auth/session change, provider credential change, production mutation, deploy, tool execution, skill execution, connector execution, desktop/browser/music/ordering behavior, messages, spending, notification, or field/customer/demo Apex OS access was added.
- Phase 5B has since been completed locally as a review-only External Action Approval System. It does not execute external actions.

Phase 5B completion checkpoint:

- Phase 5B External Action Approval System is complete locally as of 2026-06-06.
- The centralized approval bridge is in `shared/apexOsExternalActionApprovals.js` and tested in `shared/apexOsExternalActionApprovals.test.js`.
- External approval statuses are `not-required`, `draft-available`, `future-tool-planned`, `blocked`, `forbidden`, and `unavailable`.
- External approval scopes are `internal-only`, `external-action`, `high-risk`, `future-tool`, and `blocked`.
- Approval packet categories now include `email`, `messaging`, `calendar`, `ordering`, `booking`, `file-write`, `browser-desktop`, `music`, and `external-action`, while legacy approval packet categories remain supported.
- Approval packet records can carry Tool Router metadata: `sourceRouteId`, `sourceRouteStatus`, `sourceActionDomain`, `approvalSystemPhase`, and `executionGate`.
- Ask Apex now includes compact `externalActionApprovalSummary` status and safe approval-gate trace metadata.
- Ask Apex's existing "Needs approval" draft path can create route-aware approval packet drafts through the existing operator-only approval-packets endpoint.
- Every external approval summary and public approval packet forces `canExecuteNow: false`, `canExecuteAfterApproval: false`, and `executionLocked: true`.
- Forbidden or privacy-blocked routes do not produce reusable approval drafts.
- No new execute endpoint, approval-submit endpoint, connector route, external action route, API client route, schema/auth/session change, production mutation, deploy, desktop/browser/music/ordering execution, messages, spending, notification, or field/customer/demo Apex OS access was added.
- Phase 5C has since been completed locally as a non-executing Untrusted Content / Prompt-Injection Firewall.

Phase 5C completion checkpoint:

- Phase 5C Untrusted Content / Prompt-Injection Firewall is complete locally as of 2026-06-06.
- The centralized firewall helper is in `shared/apexOsUntrustedContentFirewall.js` and tested in `shared/apexOsUntrustedContentFirewall.test.js`.
- Trust levels cover trusted operator/internal/project-doc context and untrusted web/browser/email/document/file/tool-output/user-paste/unknown context.
- Source types cover web pages, search results, browser DOM, email body, document text, file content, clipboard paste, tool output, external API output, and unknown.
- Risk levels are `none`, `low`, `medium`, `high`, and `critical`.
- Detection covers ignore previous/system/developer instructions, prompt/hidden-instruction reveal attempts, secret exfiltration, send/click/download/run/install/delete/permission-change instructions, approval bypass, conceal-from-operator instructions, role impersonation, instruction overrides, and deterministic encoded/obfuscated variants.
- Ask Apex now treats John's direct question as trusted operator input, filters live/pasted context as untrusted data, includes compact `untrustedContentFirewallSummary`, and stays local when untrusted context requires operator review.
- Knowledge Intelligence sanitizes suggested/document-like source summaries before provider packets and keeps high/critical untrusted source context local.
- Tool Router blocks high/critical untrusted content before route planning.
- External Action Approval summaries/drafts can warn when a route is based on sanitized untrusted context, but approvals still do not execute or unlock actions.
- Trace metadata now includes content-free `untrusted-content-firewall` event/source values.
- No endpoint, API client helper, UI, persistence, schema/auth/session change, provider credential change, production mutation, deploy, tool/skill/plugin execution, desktop/browser/music/ordering behavior, messages, spending, notification, or field/customer/demo Apex OS access was added.
- Phase 6 has since been completed locally as a private, non-executing Affective State classification layer.

Phase 6 completion checkpoint:

- Phase 6 Affective State is complete locally as of 2026-06-06.
- The deterministic helper is in `shared/apexOsAffectiveState.js` and tested in `shared/apexOsAffectiveState.test.js`.
- Compact classifications cover mode, tone, urgency, energy, frustration, focus, response style, confidence, signal IDs, and safe response guidance.
- Signal categories cover direct/concise/step-by-step/explainer style requests, urgency, frustration, overwhelm, low/high energy, focus, stuck/confused language, exploratory mode, execution readiness, and recovery/reset language.
- Ask Apex now includes compact `affectiveStateSummary` in the existing operator-only context.
- Local fallback can adapt response style for frustrated, overloaded, stuck, or urgent turns without claiming diagnosis.
- Trace metadata now includes content-free `affective-state` event/source values.
- The layer is not diagnosis, not clinical inference, not therapy, not durable psychological profiling, not memory persistence, not background execution, and not an action system.
- Every affective summary forces `canExecuteNow: false`, `operatorOnly: true`, `storesRawText: false`, `storesPsychProfile: false`, and `safeToStoreDurably: false`.
- No endpoint, API client helper, UI, persistence, schema/auth/session change, provider credential change, production mutation, deploy, tool/skill/plugin execution, desktop/browser/music/ordering behavior, messages, spending, notification, or field/customer/demo Apex OS access was added.
- Phase 6A has since been completed locally as a documentation/planning-only Background Thinking Scheduler Plan with no background execution.

Phase 6A completion checkpoint:

- Phase 6A Background Thinking Scheduler Plan is complete locally as of 2026-06-06.
- Phase 6A is documentation/planning only. It does not create a timer, cron job, interval, recurring automation, queue, background worker, endpoint, API client helper, UI, persistence system, schema/auth/session change, production mutation, deploy, connector, browser/desktop/music control, ordering/booking flow, message send, calendar write, spending path, or field/customer/demo access.
- The future scheduler is defined as a private operator-only planning layer, not an agent runner, tool executor, external-action executor, desktop/browser/music controller, purchasing tool, deployment tool, or hidden surveillance system.
- Every future loop must have a written spec before implementation with loop id, trigger type/source, allowed inputs, privacy/untrusted-content gates, model route/tier, token/time budget, cooldown, daily cap, output type, approval needs, safe trace metadata, pause/cancel behavior, forbidden actions, `operatorOnly: true`, `canExecuteNow: false`, and `executionLocked: true`.
- All future triggers remain disabled by default. Allowed future triggers are manual operator request, app-open preview after operator-only access, active session heartbeat, explicitly enabled scheduled heartbeat, or explicitly enabled watch-queue check. Hidden always-on loops, recursive self-scheduling, field/customer/demo triggers, and untrusted-content triggers are forbidden.
- Future loop states should stay review-first: disabled, planned, manual-preview-ready, waiting-operator-review, paused, blocked-by-budget, blocked-by-privacy, blocked-by-untrusted-content, blocked-by-approval, and completed-review-only. Live running/executing states are not approved yet.
- Future scheduler previews must use the Model Router + Cost Governor, Privacy Firewall, Untrusted Content Firewall, Action Permission Matrix, Tool Router no-execution lock, External Action Approval System, and Trace + Learning Log hygiene.
- Future outputs may be private briefs, private digests, suggested task/reminder drafts, suggested memory drafts, research-note drafts, approval-packet drafts, next-safe-action recommendations, or blocked-state explanations only.
- The scheduler must never spend money, order/book, send messages/email/SMS, write calendars, publish publicly, change accounts/providers/billing, deploy, touch production, change schema/auth/session/permissions, delete data, control desktop/browser/music, run plugins/connectors/tools, execute code/shell commands, expose Apex OS to field/customer/demo users, obey untrusted content, or create hidden surveillance/emotional profiling.
- Phase 6B has since been completed locally as deterministic, private, operator-only, manual/review-first loop helpers with no background execution.

Phase 6B completion checkpoint:

- Phase 6B Active Intelligence Loops is complete locally as of 2026-06-06.
- The deterministic loop planner is in `shared/apexOsActiveIntelligenceLoops.js` and tested in `shared/apexOsActiveIntelligenceLoops.test.js`.
- Loop specs cover morning planning, evening review, priority monitoring, memory suggestion review, research/watch queue, Apex HQ build progress, opportunity/risk detection, cost/token monitoring, mood/energy-aware suggestions, and what changed since last time.
- Each loop spec is operator-only, disabled by default, review-first, privacy-filtered, untrusted-content-filtered, budgeted, cancellable by design, and forced to `canExecuteNow: false`, `executionLocked: true`, `triggersEnabled: false`, and `backgroundExecutionEnabled: false`.
- Ask Apex now includes compact `activeIntelligenceLoopSummary` in the existing operator-only context. Server Ask responses expose only that compact summary through the existing operator-only `/api/apex-os/ask` response context.
- Trace metadata uses the existing content-free `background-loop-planned` event/source and does not store raw prompts, raw responses, messages, private message bodies, secrets, cookies, tokens, credentials, API keys, database URLs, or conversation dumps.
- Allowed outputs are private briefs, private digests, suggested task/reminder drafts, suggested memory drafts, research-note drafts, approval-packet drafts, next-safe-action recommendations, and blocked-state explanations only.
- Privacy-blocked content, high-risk untrusted content, and approval-gated external requests block loop planning instead of starting work.
- No scheduler, timer, cron job, interval, recurring automation, queue, background worker, connector, endpoint, API client helper, UI, persistence system, schema/auth/session change, production mutation, deploy, browser/desktop/music control, order/booking/send/spend/calendar behavior, notification, tool/plugin/code execution, hidden surveillance, emotional profiling, or field/customer/demo Apex OS access was added.
- Phase 6C has since been completed locally as deterministic, private, source-aware, review-first Knowledge Engine / Research Memory helpers with no live web browsing or external execution.

Phase 6C completion checkpoint:

- Phase 6C Knowledge Engine / Research Memory is complete locally as of 2026-06-06.
- The deterministic knowledge/research planner is in `shared/apexOsKnowledgeIntelligence.js` and tested in `shared/apexOsKnowledgeIntelligence.test.js`.
- Phase 6C adds source modes for reviewed local context, disabled live-research-required plans, missing reviewed sources, privacy blocks, untrusted-content blocks, and approval-boundary blocks.
- It can rank reviewed Apex OS knowledge sources, detect current/latest fact freshness needs, create suggested research-memory drafts for John/operator review only, and build compact `knowledgeEngineSummary` context.
- Ask Apex now includes compact `knowledgeEngineSummary` in the existing operator-only context. Server Ask responses expose only that compact summary through the existing operator-only `/api/apex-os/ask` response context.
- Trace metadata uses the existing content-free `knowledge-summary` event/source and does not store raw prompts, raw responses, messages, private message bodies, document bodies, secrets, cookies, tokens, credentials, API keys, database URLs, or conversation dumps.
- Phase 6C forces `operatorOnly: true`, `reviewFirst: true`, `sourceAware: true`, `liveWebResearchEnabled: false`, `connectorExecutionEnabled: false`, `fileSystemCrawlingEnabled: false`, `externalResearchActionsEnabled: false`, `persistenceEnabled: false`, `canExecuteNow: false`, and `executionLocked: true`.
- Privacy-blocked content, high-risk untrusted content, and external/high-risk approval-boundary requests block research-memory planning instead of starting work.
- No live web browsing, connector/plugin/tool execution, file-system crawling, automatic document/email ingestion, endpoint, API client helper, UI, persistence system, schema/auth/session change, production mutation, deploy, browser/desktop/music control, order/booking/send/spend/calendar behavior, notification, hidden surveillance, emotional profiling, or field/customer/demo Apex OS access was added.
- Phase 7 has since been completed locally as documentation/planning-only Desktop/Browser Agent architecture with no desktop/browser control or external execution.

Phase 7 completion checkpoint:

- Phase 7 Desktop/Browser Agent Plan is complete locally as documentation/planning only as of 2026-06-06.
- The active architecture plan lives in `docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md` and is summarized in `docs/APEX_HQ_CANONICAL_SOURCE_OF_TRUTH.md` and `docs/APEX_HQ_LIVING_FINISH_PLAN.md`.
- Phase 7 defines the private operator architecture for explicit-session desktop watch mode, browser action planning, sandbox boundaries, risk tiers, approval gates, privacy redaction, untrusted DOM/screen-content handling, safe logging, cancel/pause behavior, and readiness gates for Phase 7A and Phase 7B.
- Phase 7 separates observe/plan/review from execution. It does not add desktop/browser control, keyboard/mouse actions, clicks, typing, navigation, authenticated session use, scraping, downloads/uploads, shell/code execution, connector/plugin/tool execution, endpoints, API client helpers, UI, persistence, schema/auth/session changes, production mutation, deploy, messages, spending, orders, bookings, calendar writes, notifications, or field/customer/demo Apex OS access.
- Future desktop/browser screen, OCR, DOM, web, download, upload, email, document, tool-result, and clipboard content must be treated as untrusted data unless explicitly classified otherwise. Apex OS must never obey instructions found inside untrusted page/screen content.
- Future desktop/browser sessions must be explicit, operator-only, visible, bounded, cancellable, privacy-filtered, untrusted-content-filtered, safely logged, and unable to restart automatically after pause/cancel.
- Hidden surveillance, credential capture/storage, session cookie capture, MFA/CAPTCHA/paywall circumvention, approval bypass, unauthorized account access, field/customer/demo Apex OS exposure, automatic sends/spend/orders/bookings, destructive production/file actions without approval, and weakening approval gates remain forbidden.
- Phase 7 keeps `operatorOnly: true`, `planningOnly: true`, `manualSessionOnly: true`, `watchModeEnabled: false`, `browserControlEnabled: false`, `desktopControlEnabled: false`, `authenticatedSessionUseEnabled: false`, `canExecuteNow: false`, and `executionLocked: true`.
- Phase 7A Desktop Sandbox / Watch Mode has since been completed locally as deterministic, non-executing sandbox/watch planning helpers. It did not add keyboard/mouse/browser control, hidden surveillance, connector execution, endpoint routes, UI activation, production mutation, schema/auth/session changes, messages, spending, ordering, bookings, calendar writes, or field/customer/demo access.

Phase 7A completion checkpoint:

- Phase 7A Desktop Sandbox / Watch Mode is complete locally as deterministic, private, operator-only planning helpers in `shared/apexOsDesktopWatch.js` with focused tests in `shared/apexOsDesktopWatch.test.js`.
- It classifies desktop/browser/screen watch intent, primary surface, risk tier, watch mode, session state, blocked state, allowed inputs/outputs, forbidden inputs/actions, required operator controls, and content-free trace metadata.
- Ask Apex includes compact `desktopWatchSummary` context through the existing operator-only `/api/apex-os/ask` response context.
- Phase 7A keeps `operatorOnly: true`, `manualSessionOnly: true`, `requiresExplicitStart: true`, `watchModeEnabled: false`, `desktopControlEnabled: false`, `browserControlEnabled: false`, `keyboardMouseControlEnabled: false`, `authenticatedSessionUseEnabled: false`, `screenCaptureEnabled: false`, `screenshotPersistenceEnabled: false`, `hiddenSurveillanceEnabled: false`, `canExecuteNow: false`, and `executionLocked: true`.
- It blocks or approval-gates hidden watching, credential capture, privacy-blocked content, high-risk untrusted content, click/type/navigation, external-account work, downloads/uploads, messages, ordering/booking/spending, and production/deploy work instead of starting any session or action.
- Phase 7B Browser Action Planning has since been completed locally as deterministic, non-executing action planning. It did not navigate, click, type, log in, submit forms, scrape pages, use authenticated sessions, download/upload files, execute tools/connectors/plugins, send messages, spend money, order/book, write calendars, deploy, touch production, change schema/auth/session, or expose Apex OS to field/customer/demo users.

Phase 7B completion checkpoint:

- Phase 7B Browser Action Planning is complete locally as deterministic, private, operator-only dry-run planning helpers in `shared/apexOsBrowserActionPlan.js` with focused tests in `shared/apexOsBrowserActionPlan.test.js`.
- It classifies browser/search/page/account/form/download/upload/message/money/production intent, risk tier, target type, plan state, required preconditions, generic dry-run step IDs, blocked action IDs, safe alternatives, and content-free trace metadata.
- Ask Apex includes compact `browserActionSummary` context through the existing operator-only `/api/apex-os/ask` response context.
- Phase 7B keeps `operatorOnly: true`, `planningOnly: true`, `reviewFirst: true`, `browserControlEnabled: false`, `browserNavigationEnabled: false`, `clickTypeSubmitEnabled: false`, `authenticatedSessionUseEnabled: false`, `pageScrapingEnabled: false`, `downloadUploadEnabled: false`, `extensionInstallEnabled: false`, `sessionCookieUseEnabled: false`, `canExecuteNow: false`, and `executionLocked: true`.
- It blocks or approval-gates privacy-blocked content, high-risk untrusted content, credential extraction, MFA/CAPTCHA/paywall/approval bypass, authenticated account work, downloads/uploads, messages, ordering/booking/spending, and production/deploy work instead of starting browser actions.
- Phase 8 Music + Second Screen has since been completed locally as deterministic, non-executing planning/helpers. It did not control devices, play/pause/skip music, open second-screen windows, move browser/app windows, use desktop/browser/music connectors, send messages, spend money, order/book, write calendars, deploy, touch production, change schema/auth/session, or expose Apex OS to field/customer/demo users.

Phase 8 completion checkpoint:

- Phase 8 Music + Second Screen is complete locally as deterministic, private, operator-only planning helpers in `shared/apexOsMusicSecondScreen.js` with focused tests in `shared/apexOsMusicSecondScreen.test.js`.
- It classifies focus-music, playlist suggestion, music-control, audio-device, second-screen layout, dashboard display, move-window, and combined environment intent, risk tier, surface type, plan state, required preconditions, generic plan step IDs, blocked action IDs, safe alternatives, and content-free trace metadata.
- Ask Apex includes compact `musicSecondScreenSummary` context through the existing operator-only `/api/apex-os/ask` response context.
- Phase 8 keeps `operatorOnly: true`, `planningOnly: true`, `reviewFirst: true`, `musicControlEnabled: false`, `audioDeviceControlEnabled: false`, `desktopWindowControlEnabled: false`, `secondScreenControlEnabled: false`, `browserControlEnabled: false`, `accountSessionUseEnabled: false`, `canExecuteNow: false`, and `executionLocked: true`.
- It blocks or approval-gates privacy-blocked content, high-risk untrusted content, hidden control, credential/session use, music playback, audio device/volume changes, account work, subscriptions/spending, desktop/window/screen control, messages, ordering/booking, calendar writes, and production/deploy work instead of starting actions.
- Phase 9 Life Automation Connectors has since been completed locally as deterministic, non-executing connector architecture/planning. It did not connect accounts, send messages, spend money, order/book, write calendars, run connectors/plugins/tools, deploy, touch production, change schema/auth/session, or expose Apex OS to field/customer/demo users.

Phase 9 completion checkpoint:

- Phase 9 Life Automation Connectors is complete locally as deterministic, private, operator-only planning helpers in `shared/apexOsLifeAutomationConnectors.js` with focused tests in `shared/apexOsLifeAutomationConnectors.test.js`.
- It classifies connector readiness, account connection, ordering, booking, messaging, email, calendar, payment, document, and multi-connector intent, risk tier, connector surface, connector types, plan state, required preconditions, generic plan step IDs, blocked action IDs, safe alternatives, and content-free trace metadata.
- Ask Apex includes compact `lifeAutomationConnectorSummary` context through the existing operator-only `/api/apex-os/ask` response context.
- The Personal Skill Registry includes a planned `life-automation-connectors` capability, but it remains `canExecute: false`.
- Phase 9 keeps `operatorOnly: true`, `planningOnly: true`, `reviewFirst: true`, `canConnectNow: false`, `connectorExecutionEnabled: false`, `accountConnectionEnabled: false`, `oauthFlowEnabled: false`, `credentialStorageEnabled: false`, `privateDataReadEnabled: false`, `messageSendEnabled: false`, `emailSendEnabled: false`, `calendarWriteEnabled: false`, `orderingEnabled: false`, `bookingEnabled: false`, `paymentEnabled: false`, `canExecuteNow: false`, and `executionLocked: true`.
- It blocks or approval-gates privacy-blocked content, high-risk untrusted content, hidden connector access, credential/session/token use, account connections, connector runs, private account reads, sends, spending, orders, bookings, calendar writes, plugin/webhook installs, and production/deploy work instead of starting actions.
- Phase 10 Apex HQ Builder/Operator Agent has since been completed locally as deterministic, non-executing builder/operator planning. It did not execute agents, edit code/files, run tests/builds/browser QA, perform git operations, deploy, touch production, change schema/auth/session/providers, mutate customer-visible state, control desktop/browser/music, run connectors/plugins/tools, send messages, spend money, order/book, write calendars, or expose Apex OS to field/customer/demo users.

Phase 10 completion checkpoint:

- Phase 10 Apex HQ Builder/Operator Agent is complete locally as deterministic, private, source-backed, operator-only planning helpers in `shared/apexOsBuilderOperator.js` with focused tests in `shared/apexOsBuilderOperator.test.js`.
- It classifies Apex HQ build phase planning, bug triage, code review, implementation work package, QA validation, release readiness, schema/auth safety, production/deploy, customer-visible safety, and multi-workstream intent, risk tier, surface, workstream tags, plan state, required preconditions, generic plan step IDs, blocked action IDs, safe alternatives, and content-free trace metadata.
- Ask Apex includes compact `builderOperatorSummary` context through the existing operator-only `/api/apex-os/ask` response context.
- The Personal Skill Registry includes a planned `apex-hq-builder-operator-agent` capability, but it remains `canExecute: false`.
- Phase 10 keeps `operatorOnly: true`, `planningOnly: true`, `reviewFirst: true`, `sourceBackedRequired: true`, `agentExecutionEnabled: false`, `codeEditEnabled: false`, `fileWriteEnabled: false`, `testRunEnabled: false`, `buildCommandEnabled: false`, `gitOperationEnabled: false`, `browserQaEnabled: false`, `deployEnabled: false`, `productionMutationEnabled: false`, `schemaAuthChangeEnabled: false`, `customerVisibleChangeEnabled: false`, `canExecuteNow: false`, and `executionLocked: true`.
- It blocks or approval-gates privacy-blocked content, high-risk untrusted content, hidden builder/operator control, approval-gate bypass, secret exposure, field/customer/demo exposure, agent/code/test/git/browser/desktop/deploy/production/schema/auth/customer-visible execution, sends, spending, orders, bookings, calendar writes, and connector/plugin/tool/webhook work instead of starting actions.
- The revised private Jarvis control-plane roadmap through Phase 10 is now locally complete. Any future execution phase must be explicitly approved and keep the existing operator-only safety, privacy, approval-gate, no-secret, no-production, no-field/customer/demo-access boundaries.
- Post-hardening execution-readiness design gate: `docs/APEX_OS_EXECUTION_READINESS_DESIGN_GATE.md`. This gate now documents the Jarvis-style act-by-default model and the first narrow Level 2 implementation. Apex OS can now perform private/internal task/reminder writes, memory suggestions, safe preference notes, private planning/research notes, and archive-style organization when the internal action engine classifies the action as low-risk, reversible, and operator-only. Level 3-5 consequential/external actions remain confirmation-gated and non-executing; any future external execution still requires exact-action previews, dry-run, short-lived one-action execution tokens, limits, audit metadata, kill switch, rollback controls, validation, and explicit approval.
- Level 3 external preparation design: `docs/APEX_OS_LEVEL_3_EXTERNAL_PREPARATION_PLAN.md`. Level 3 is now specified as non-executing exact-action packet preparation for order plans, booking plans, message drafts, calendar drafts, browser action plans, desktop action plans, music/second-screen plans, and deploy/production checklists. It does not add routes, UI, persistence, execution tokens, connectors, OAuth/account connections, desktop/browser/music control, sends, spending, ordering, booking, posting, calendar writes, deploys, production/schema/auth/session/provider/billing changes, deletion, or field/customer/demo Apex OS access.

All future active-intelligence/background loops must be operator-only, budgeted, observable, cancellable, safely logged, privacy-filtered before cloud/model use, and unable to spend money, send messages, change accounts/providers, deploy, touch production, publish publicly, delete data, or execute external/irreversible actions without explicit approval.

The older hard-finish sequence below is preserved as historical Apex HQ Command Center hardening context. Use this addendum and the command-center master plan for the current private life operator sequence.

## Current Approval Posture

Approved now:

- Private Apex OS schema/storage when needed.
- Private Apex OS file/document storage when needed.
- Server-side provider/API integration when credentials are configured or John explicitly provides setup approval.
- OpenAI-backed Ask Apex, summaries, embeddings, knowledge intelligence, and voice if implemented server-side without frontend secrets.
- Production deploy after full validation and release evidence.
- Agent execution when John explicitly asks for a scoped task.
- Local/private code edits, docs, tests, browser QA, monitoring reads, release packets, approval packets, and rollback plans.

Approved next design direction:

- Level 3 external preparation implementation can be requested next only as a non-executing packet-builder phase: keep hardened Level 2 receipts visible, keep undo/archive/edit/reset paths clear, use existing operator-only gates, and build preparation packets without adding send/spend/order/book/publish/calendar/desktop/browser/music/deploy/production/schema/auth execution.

Not approved right now:

- Email/SMS sends.
- Ad publishing or ad spend.
- Billing/payment actions.
- Customer-visible publishing, portal sharing, notifications, or sends.
- Autonomous unrequested agent execution or unmanaged background loops.
- Irreversible external actions without a fresh exact-action preview and explicit confirmation.
- Deleting files, records, users, uploads, or historical evidence unless John explicitly asks.

Provider note:

- Apex OS AI work should be local-first for John's private Jarvis mode.
- `OPENAI_API_KEY` alone must not trigger paid Apex OS text-provider calls; server-side OpenAI remains only as an explicit one-request cloud override path after policy, privacy, prompt-injection, and budget gates pass.
- If local Ollama is absent, offline, missing the selected model, or blocked by safety gates, keep deterministic local fallback mode instead of silently switching to cloud.
- No frontend provider secrets are allowed.

## Global Definition Of 100 Percent Done

A phase is 100 percent done only when all of this is true:

- Original master-plan requirements are satisfied.
- Safe hard-finish upgrades for that phase are complete.
- Any blocked work is blocked only because it enters the "not approved right now" list above.
- Route/API/UI permissions are verified.
- Field users and normal admins remain blocked from Apex OS.
- Mobile and desktop browser QA passed.
- Focused tests and relevant role/route/build checks passed.
- Docs record goal, affected files, validation, permissions, mobile impact, field impact, rollback, and next phase.
- A commit is pushed.
- Production is deployed and health-checked when release approval exists for that phase.
- Release evidence is committed and pushed after deploy.
- The next phase has not been started.

## Phase Sequence

### Phase 1: Private Access And Identity

Status:

- Hard-finished locally on 2026-06-03.
- Frozen access model: normal Apex HQ login, private `operator_access` / `operatorAccess` flag, office-level role, default Apex HQ operating workspace, and server bootstrap `permissions.apexOs.canView`.
- Customer/company workspaces stay blocked even for an operator after company switching; the operator must be in the default Apex HQ operating workspace for Apex OS route/nav/API access.
- Validation passed with focused access, route, navigation, bootstrap, API, and company-scope tests; `npm.cmd run verify:roles`; `npm.cmd run build`; `git diff --check`; and desktop/mobile browser QA for operator access, normal-admin blocking, employee blocking, and switched-company blocking.

Hard-finish package:

- Audit route, nav, API, bootstrap permission, operator access, and direct-route behavior.
- Add stronger operator access evidence in UI/API where useful.
- Add or tighten tests for owner/operator, normal admin, estimator, foreman, employee, demo user, and cross-company blocking.
- Add production-ready release evidence if deploy is approved after validation.
- Document exact access model and freeze it.

Blocked right now:

- Customer-visible access model changes.
- Auth/session redesign unless separately approved as the active Phase 1 task.

### Phase 2: Apex-Branded Control Room Shell

Hard-finish package:

- Polish desktop/mobile Control Room layout.
- Ensure Apex HQ branding, owner language, density, navigation, and first-viewport signal are final.
- Remove stale placeholder/read-only copy that no longer matches completed capabilities.
- Browser QA desktop/mobile for overlap, overflow, legibility, and normal-admin blocking.

Blocked right now:

- None beyond normal production deploy gate after validation.

### Phase 3: Apex OS State Aggregator

Status:

- Hard-finished and deployed on 2026-06-03. The Control Room now has a read-only Phase 3 State Packet, source/confidence/read-only metadata for derived state, branch/build/test evidence slots, phase status, blockers/approvals, agents, release desk, launch/business queues, and blocked-role empty state coverage. Production release `v635` is healthy; rollback target is `v634`.

Hard-finish package:

- Complete: expand state aggregation to cover current branch, build/test state, phase status, blockers, approvals, agents, release desk, launch/business queues, and evidence.
- Complete: add source links and confidence labels for derived state.
- Complete: add tests proving no blocked role receives Apex OS state.
- Complete: ensure state remains read-only unless a later approved execution phase owns mutation.

Blocked right now:

- Autonomous live production mutations.
- External provider monitoring writes or alerts that send notifications.

### Phase 4: Decision Memory And Operating Rules

Status:

- Hard-finished locally on 2026-06-03 with decision-only durable memory separation, source/category/status/text browsing, review history, active duplicate checks, server-side duplicate rejection, private export, manual approve/archive, source/timestamp tracking, secret rejection, and operator-only access. No schema change was needed because existing company settings storage remained sufficient for this phase.

Hard-finish package:

- Move from minimal durable memory to a complete private decision system if needed: richer source browsing, review history, category coverage, duplicate checks, export, and stronger audit display.
- Add schema-backed private decision storage if the audit shows company settings is too limited.
- Add local-first AI extraction only for private reviewed sources, using local providers by default and server-side cloud only through explicit override policy.
- Keep manual approve/archive before trusted memory.

Blocked right now:

- Hidden automatic memory for risky topics.
- Storing secrets or credentials.

### Phase 5: Knowledge Upload Vault

Status:

- Hard-finished and deployed on 2026-06-03 with text/PDF intake, source metadata, review status, summary status, search/filter, category-scoped duplicate-source guard, vault review history, private knowledge export, server-side duplicate rejection coverage, and manual trust review. Production release `v637` is healthy; rollback target is `v636`.

Optional hard-finish upgrade if Phase 5 is reopened by explicit request:

- Add private binary original-file storage.
- Add schema-backed document records.
- Add server-side parsing.
- Add embeddings/vector search.
- Add AI summaries/classification.

Blocked right now:

- Customer upload mixing.
- Public publishing.
- External sends.

### Phase 6: Ask Apex Chat

Status:

- Hard-finished and deployed on 2026-06-03 with selectable context scopes, operator-only scoped Ask Apex API responses, server-side OpenAI provider readiness, local source-backed fallback, ranked evidence drawer, source-backed answer cards, save-as-decision suggested memory drafts, create-task approval packet drafts, needs-approval packet drafts, citation/source-rank coverage, desktop/mobile browser QA, and production health/route smoke. Production release `v638` is healthy; rollback target is `v637`.

Hard-finish package:

- Replace first UI with complete Ask Apex chat using server-side OpenAI when configured.
- Add durable private chat transcripts if needed.
- Add source/evidence drawer.
- Add save-as-decision draft flow.
- Add create-task/approval-packet draft flow.
- Add citation and source-rank tests.
- Keep every write as draft/review unless John explicitly asks execution.

Blocked right now:

- Customer-visible answers.
- External actions from chat.
- Frontend API keys.

### Phase 7: Agent Control Plane

Hard-finish package:

- Build complete agent dashboard: roles, status, current task, last update, next action, reports, handoffs.
- Allow explicit John-requested scoped agent execution.
- Add pause/resume request flow with audit trail.
- Add run history and safety locks.
- Ensure no unmanaged background loops.

Blocked right now:

- Autonomous unrequested execution.
- External sends/spend/billing/customer-visible actions.

Status:

- Completed locally to 100% on 2026-06-03.
- Built the full seven-role Agent Control Plane roster with status, current task, last update, next action, report history, and handoff/request counts.
- Added durable operator-only pause, resume, and scoped-run requests through `apexOsAgentControlRequests`, including requested/ready/blocked/closed/archived states, audit/activity history, readiness-field validation, source-label requirements, secret/email rejection, and Control Room request/load/mark-ready/block/close/archive UI.
- Existing Agent Work Queue, Agent Run Ledger, Agent Safety Locks, Locked Agent Tasks, and safe execution handoff drafts remain available in the same Phase 7 surface.
- No autonomous unrequested execution, external send/spend/billing/customer-visible action, queue/run endpoint, background loop, deploy action, provider setup, production mutation, schema change, deletion, or irreversible action was added.
- Local validation passed with focused shared/API/UI tests, broader Apex OS permission/routing/bootstrap tests, production build, and desktop/mobile browser QA.
- Production release was approved and deployed on 2026-06-03 from commit `0aef694` to Fly app `concrete-ops-2` as version `639`, image `registry.fly.io/concrete-ops-2:deployment-01KT60X0SWR6QZWJKQC407W4VC`, after production backup `postgres-app-data-20260603-055635Z.json` plus upload snapshot `uploads-20260603-055635Z`.
- Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly status showed machine `148e06e2b53d68` on version `639` with 1 passing check, hosted skip-auth health/routes smoke passed, `/apex-control-room` served, unauthenticated `/api/apex-os/agent-control` returned 401, and `/api/setup/status` showed demo mode off and public signup disabled. Production auth smoke/login was not run.

### Phase 8: Approval Command Center

Hard-finish package:

- Finish approval packet workflow with templates, risk scoring, exact approval phrase, validation, rollback, affected files/data, and source evidence.
- Add approve/reject/defer states where safe.
- Add audit history and browser QA.
- Keep execution separate from approval unless the specific action is also approved.

Blocked right now:

- One-click irreversible execution without explicit approval.
- Sends, spend, billing, customer-visible actions.

Status:

- Hard-finished and deployed on 2026-06-03.
- Completed packet templates, risk scoring, exact approval phrase enforcement, approve/reject/defer decision states, operator-only endpoints, readiness/source requirements, secret/email rejection, decision actor/timestamp fields, audit/activity history, and desktop/mobile browser QA.
- Execution remains separate and locked: no deploy action, queue/run endpoint, production mutation, provider setup, send, spend, billing/payment, customer-visible action, deletion, schema/auth/session change, or irreversible action path was added.
- Production release `v640` is healthy; rollback target is `v639`.

### Phase 9: App Build And Code Awareness

Hard-finish package:

- Add real local git branch/status, changed files, last tests, build state, known blockers, frozen phase map, and source links.
- Add source-backed "start next safe task" recommendation.
- Add tests for parser/state helpers and no-field exposure.

Blocked right now:

- Live CI/GitHub writes unless John asks for that exact execution.

Status:

- Hard-finished and deployed on 2026-06-03.
- Added a read-only shared build-awareness snapshot with sanitized git status parsing, recent commit parsing, source links, deploy evidence parsing, frozen phase mapping, known blockers, and next-safe-task recommendations.
- Added an operator-only `/api/apex-os/build-awareness` endpoint and collector for local git branch/status, head SHA, recent commits, package scripts, dist artifact names, Apex OS source docs, and honest runtime fallback metadata when git/docs are unavailable.
- Added the private Control Room App Build Awareness panel with current branch/head, changed file map, build/test status, recent deploy evidence, known blockers, frozen phase map, source links, recent commits, and locked read-only/no-UI-file-edits controls.
- Field data stays excluded and execution stays locked: no UI code editing, no test running, no commit/push/deploy/rollback action, no CI/GitHub write, no provider setup, no production mutation, no customer-visible action, no send/spend/billing, and no schema/auth/session change was added.
- Validation passed with focused Phase 9 shared/API/UI tests, the 81-test Apex OS regression suite, `npm.cmd run build`, and isolated desktop/mobile browser QA with no horizontal overflow.
- Production release `v641` is healthy from commit `6368845`, image `registry.fly.io/concrete-ops-2:deployment-01KT65V9K2KK4G0V1R6QRXR9QG`; rollback target is `v640`.

### Phase 10: Business Operating Center

Hard-finish package:

- Finish private business command queues for launch, revenue, pricing, offer, marketing, sales, customer success, and founder-demo work.
- Add task drafts and approval packets.
- Add source-backed business memory from approved vault/decision rows.

Status:

- Hard-finished, pushed, deployed, and health-checked on 2026-06-03 as Fly release `v642` from commit `ee851f7`.
- Private business command queues, launch/founder-demo rows, business briefing rows, manual-send/spend/billing/claims gates, source-backed business memory rows, six private business task drafts, and five business approval draft rows are now in the Apex Control Room.
- Approved business memory feeds only from approved Apex OS memory categories; suggested, archived, unrelated product identity, and non-business rows do not become Phase 10 business context.
- Task drafts prepare private handoff work only and point to existing Agent Handoffs as `business-draft` records; no agent queue/run/execution surface was added.
- Approval draft rows are review packets only; sends, publishing, ad spend, billing/payment, customer-visible actions, and unsupported claims remain locked.
- Validation passed with focused Phase 10 Apex OS utility/import tests, the 82-test Apex OS regression suite, `npm.cmd run build`, and isolated desktop/mobile browser QA with approved business memory seed rows and no horizontal overflow.
- Production release `v642` is healthy from commit `ee851f7`, image `registry.fly.io/concrete-ops-2:deployment-01KT67FMHMMHQH69R1ZFX5Y0VR`; rollback target is `v641`, image `registry.fly.io/concrete-ops-2:deployment-01KT65V9K2KK4G0V1R6QRXR9QG`.

Blocked right now:

- Sending outreach.
- Publishing ads/content.
- Billing/payment changes.
- Customer-visible actions.

### Phase 11: Monitoring And Daily Briefings

Hard-finish package:

- Add durable daily briefing history.
- Add local/read-only monitoring summaries.
- Add stalled agent and failed build/test indicators.
- Add manual refresh and source evidence.
- Add production health reads after deploy approval.

Status:

- Hard-finished locally on 2026-06-03.
- Durable daily briefing history is saved as sanitized private snapshots in existing company settings through operator-only `POST /api/apex-os/daily-briefing/history`.
- Local/read-only Release Monitoring now refreshes production readiness, demo app readiness, GitHub Actions/smoke status, failed test/build evidence, and stalled-agent signals from safe build-awareness and control-plane sources.
- The Daily Briefing now shows changed-since-last-saved rows, briefing history rows, locks, source labels, John-action alerts, and manual refresh/save controls.
- No provider monitoring change, external alert/notification, autonomous schedule, deploy/rollback execution, production/customer mutation, email/SMS send, ad spend, billing/payment, schema/auth/session change, deletion, public publishing, or customer-visible action was added.
- Validation passed with focused Phase 11 tests, the 98-test Apex OS route/nav/permission regression suite, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, and desktop/mobile browser QA with monitoring refresh plus briefing save/history.
- Production release was approved, backed up, deployed, and health-checked on 2026-06-03 as Fly version `643` from commit `10232dd`; rollback target is Phase 10 version `642`.

Blocked right now:

- External alerts/notifications.
- Autonomous scheduled sends.

### Phase 12: Voice Interface

Hard-finish package:

- Add provider-backed speech-to-text and text-to-speech through server-side OpenAI if key is configured.
- Keep push-to-talk only.
- Add transcript confirmation before any command.
- Add voice answer playback.
- Add voice safety tests and browser QA.

Status:

- Hard-finished, pushed, deployed, and production-checked on 2026-06-03.
- The private Voice Interface now has click-to-record push-to-talk, Stop & transcribe, manual transcript fallback, transcript confirmation, command review for the original Phase 12 phrases, safe Ask Apex question handoff, and Speak answer / Stop voice playback.
- Server-only `/api/apex-os/voice/speech` and `/api/apex-os/voice/transcribe` use `OPENAI_API_KEY` only when configured. Speech falls back safely to browser playback when the key is absent, and transcription stays manual/reviewed when the provider is unavailable.
- Voice command reviews stay execution-locked: no agent pause/resume/run, decision write, approval execution, send, spend, deploy, billing/payment, customer-visible action, or production mutation can happen from voice.
- Focused voice tests, broader Apex OS regression, role verification, production build, and desktop/mobile browser QA passed.
- Production release was deployed and health-checked on 2026-06-03 as Fly version `644` from commit `301a852`; rollback target is Phase 11 version `643`.

Blocked right now:

- Always-listening mode.
- Hidden microphone capture.
- Voice-triggered external actions.

### Phase 13: Knowledge Intelligence

Hard-finish package:

- Add source-backed knowledge intelligence over approved decisions and vault items.
- Add AI summaries/classification if server-side provider is configured.
- Add embeddings/vector search if private storage/schema is implemented.
- Add evidence drawer and confidence labels.

Status:

- Completed locally on 2026-06-03.
- Source-backed local Knowledge Intelligence now ranks approved decisions and Knowledge Vault rows, builds reviewed summaries, shows trusted/suggested/archived status, filters by source/category/status/text/date, labels confidence, and flags conflicts against current Apex HQ rules plus older memory.
- Operator-only `/api/apex-os/knowledge-intelligence` returns local intelligence and now uses local llama.cpp GPT-OSS summaries by default when the sidecar/model is available and policy/privacy/untrusted-content gates pass; Ollama remains legacy fallback/status only, and server-side OpenAI summary/classification remains blocked unless explicit cloud override policy allows it.
- Embeddings/vector search remains locked because no private vector storage/schema approval was given.
- Focused source-ranking/conflict/provider-shape tests, server privacy/access tests, broader Apex OS regression, role verification, production build, diff hygiene, and desktop/mobile browser QA passed.
- Production release was deployed on 2026-06-03 from commit `f8193ad` to Fly app `concrete-ops-2` as version `645`, image `registry.fly.io/concrete-ops-2:deployment-01KT6DWEVTQ5CBC5V8TX7TX5CZ`, after production backup `postgres-app-data-20260603-094325Z.json` plus upload snapshot `uploads-20260603-094325Z`. Rollback target is version `644`, image `registry.fly.io/concrete-ops-2:deployment-01KT6BZ28V8HTPBNCWZEA27DXY`.
- Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly machine `148e06e2b53d68` was on version `645` with 1 passing check, hosted skip-auth health/routes smoke passed, `/apex-control-room` served the Phase 13 bundles, unauthenticated Apex OS knowledge-intelligence, memory, and Ask Apex endpoints returned 401, and `/api/setup/status` showed demo mode off, demo user absent, and public signup disabled. Production auth smoke/login was not run.

Blocked right now:

- Unreviewed knowledge becoming trusted automatically.
- Customer/public knowledge mixing.

### Phase 14: Action Execution Layer

Hard-finish package:

- Allow John-requested scoped execution for local/private tasks.
- Create execution contracts with objective, allowed actions, blocked actions, validation, rollback, and result report.
- Support code/doc/test/browser execution when John asks.
- Require approval packets for production, provider, schema, deploy, or irreversible operations.

Status:

- Hard-finished locally on 2026-06-03.
- Ask Apex can draft task handoffs from chat with source request IDs, selected role/work type, allowed and blocked actions, validation plan, rollback plan, and locked execution controls.
- Execution handoffs now expose locked execution contracts for agent/Codex work packages and track planned, ready-for-agent, in-progress, validating, finished, blocked, and archived status.
- Finished handoffs require validation results and a result report, and can create only suggested decision-memory updates for manual review.
- Risky scoped work requires an approval packet reference before it can be saved as allowed action scope; queue/run/execute/deploy/send/spend/bill/provider/schema/customer-visible paths remain locked.
- Local validation passed: focused task/handoff/approval enforcement tests, server memory tests, Apex OS regression tests, `npm.cmd run verify:roles`, `npm.cmd run build`, and desktop/mobile browser QA with suggested memory evidence and locked queue/run controls.
- Production release was deployed on 2026-06-03 from commit `ab1a656` to Fly app `concrete-ops-2` as version `646`, image `registry.fly.io/concrete-ops-2:deployment-01KT6G2KC3ZZ5HS4Q3GT0VHHAP`, after production backup `postgres-app-data-20260603-102138Z.json` plus upload snapshot `uploads-20260603-102138Z`. Rollback target is version `645`, image `registry.fly.io/concrete-ops-2:deployment-01KT6DWEVTQ5CBC5V8TX7TX5CZ`.
- Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly machine `148e06e2b53d68` was on version `646` with 1 passing check, hosted skip-auth health/routes smoke passed, `/apex-control-room` served the Phase 14 bundles, unauthenticated Apex OS execution-handoffs, memory, and Ask Apex endpoints returned 401, and `/api/setup/status` showed demo mode off, demo user absent, and public signup disabled. Production auth smoke/login was not run.

Blocked right now:

- Email/SMS, ads, billing/payment, customer-visible changes, and autonomous unrequested agent execution.

### Phase 15: Production Preview And Release Desk

Hard-finish package:

- Finish release desk with build/test/deploy readiness, backup/restore evidence, rollback plan, current branch, commit, and production health reads.
- Deploy only after validation and explicit release approval.
- Record release evidence in docs.

Status:

- Hard-finished locally on 2026-06-03.
- The private Release Desk now has read-only Production Preview Status, Release Readiness Packet, Deploy History, Deploy Approved Flow, and Release Safety Summary sections.
- Build awareness parses living-plan deploy-log rows so the desk can show the current production version, commit, image, health/hosted smoke evidence, backup evidence, and recent Apex OS deploy history.
- The deploy-approved path stays locked and manual: the UI shows validation gates, exact approval phrase, manual deploy handoff, and post-deploy evidence rows, but no deploy/rollback execution is available from Apex OS.
- Local validation passed: focused deploy-history/release-desk/component tests, Apex OS regression tests, `npm.cmd run verify:roles`, `npm.cmd run build`, and desktop/mobile browser QA with production `v646` evidence and disabled deploy-approved lock.
- Production release was deployed on 2026-06-03 from commit `e86b88e` to Fly app `concrete-ops-2` as version `647`, image `registry.fly.io/concrete-ops-2:deployment-01KT6H78S4DEYNQ1S72N63TTXS`, with predeploy backup `postgres-app-data-20260603-104153Z.json`, upload snapshot `uploads-20260603-104153Z`, rollback target `v646`, production ready/health checks, hosted skip-auth health/routes smoke, Control Room asset verification, setup-status verification, and protected unauthenticated Apex OS endpoint checks.

Blocked right now:

- Deploy without validation and approval.
- Production data mutation unrelated to the approved release.

### Phase 16: Personal Operating Layer

Hard-finish package:

- Add John's private preferences, working cadence, recurring priorities, decision style, and personal operating rules.
- Tie preferences to approved decision memory.
- Add review/edit/archive controls.

Blocked right now:

- Sensitive personal data capture without explicit instruction.
- Hidden tracking.

Status:

- Hard-finished, pushed, deployed, and production-checked on 2026-06-03 as Fly release `v648` from commit `c2f99d4`.
- Completed with source-backed private preference rows, work-style rows, communication rows, daily focus rows, interruption rules, background/check-in rules, preference review controls, and privacy locks inside the private Apex Control Room.
- Tied to approved decision memory by reusing existing operator-only Apex OS memory category `personal-preference`; no schema, auth/session, provider, production config, or external-action path was added.
- Review/edit/archive scope is manual only: preference drafts are suggested until approved, source labels are required, secrets are rejected by the existing memory API, and approval does not run agents or perform external work.
- Validated with focused tests, full Apex OS regression tests, role verification, build, isolated desktop/mobile browser QA, preference draft/load/approval flow, section screenshots, and privacy review.
- Production evidence: predeploy backup `postgres-app-data-20260603-111313Z.json` plus `uploads-20260603-111313Z`; image `registry.fly.io/concrete-ops-2:deployment-01KT6K0MDP5471S3TZBB3HHGHT`; rollback target `v647`; Fly machine/checks passing; both ready endpoints database OK; health OK; hosted skip-auth smoke passed; unauthenticated Apex OS endpoints returned 401; Control Room served Phase 16 assets.

### Phase 17: Full Apex OS QA And Security Hardening

Hard-finish package:

- Run full role/access/security QA.
- Validate source citations, upload privacy, approval gates, agent execution boundaries, mobile/desktop UI, no secrets, no bypass actions, and docs drift.
- Add hardening report, rollback notes, and final blocked-action proof.

Blocked right now:

- External customer/money/send actions.
- Destructive tests against production data.

Status:

- Hard-finished, pushed, deployed, and production-checked on 2026-06-03 as Fly release `v649` from commit `52a3cf4`.
- Completed with final QA / Security Hardening evidence rows for role and field restrictions, customer/company isolation, direct-route blocking, source-backed answers, upload privacy, approval gates, build/test/release safety, desktop/mobile visual QA, production-preview smoke proof path, docs/memory drift, no secrets, no risky-action bypass, and Apex OS access kill-switch proof.
- Validated with focused hardening/component tests, broad Apex OS role/security/company-scope regression coverage with transient company-scope startup rerun passing, role verification, production build, diff check, and isolated desktop/mobile/admin-blocked browser QA.
- No schema, auth/session, provider setup, production data mutation, customer-visible action, send, spend, billing/payment, deploy/rollback execution from the UI, deletion, or irreversible action path was added.
- Production evidence: predeploy backup `postgres-app-data-20260603-114137Z.json` plus `uploads-20260603-114137Z`; image `registry.fly.io/concrete-ops-2:deployment-01KT6MMM45QFCTYRQVCF7ABG07`; rollback target `v648`; Fly machine/checks passing; both ready endpoints database OK; health OK; hosted skip-auth smoke passed; unauthenticated Apex OS endpoints returned 401; setup status remained production/private; Control Room served Phase 17 assets.

### Phase 18: Finished Apex OS

Hard-finish package:

- Assemble all completed phases into one day-to-day Apex OS cockpit.
- Prove John can run Apex HQ from Apex OS: ask, decide, upload, approve, brief, monitor, plan, execute scoped tasks, prepare releases, and manage agents.
- Run final production-preview QA after approved deploy.
- Freeze Apex OS completion state.

Blocked right now:

- Anything in the not-approved list: email/SMS sends, ads/spend, billing/payment, customer-visible publishing, autonomous unrequested agents, and irreversible external actions.

Status:

- Hard-finished, pushed, deployed, and production-checked on 2026-06-03 as Fly release `v650` from commit `67aea87`.
- Completed with a Finished Apex OS cockpit, capability proof rows, day-to-day run-loop rows, completion-freeze rows, and blocked-action proof rows for the not-approved external/provider/customer-visible action classes.
- Proves John can run Apex HQ day to day from Apex OS by asking, deciding, uploading/reviewing knowledge, approving packets, briefing, monitoring, planning, preparing scoped task handoffs, preparing releases, and managing agents while execution remains review-first and locked where required.
- Validated with focused tests, broad Apex OS role/security/company-scope regression, role verification, production build, isolated desktop/mobile/admin-blocked browser QA, direct-route blocking, protected API blocking, and visual screenshots.
- No schema, auth/session, provider setup, production data mutation, customer-visible action, live send, ad spend, billing/payment, autonomous unrequested execution, deploy/rollback execution from the UI, deletion, or irreversible action path was added.
- Production evidence: predeploy backup `postgres-app-data-20260603-120459Z.json` plus `uploads-20260603-120459Z`; image `registry.fly.io/concrete-ops-2:deployment-01KT6NZDJQGVF9G4PJ2P7FW7Y9`; rollback target `v649`; Fly machine/checks passing; both ready endpoints database OK; health OK; hosted skip-auth smoke passed; unauthenticated Apex OS endpoints returned 401; setup status remained production/private; Control Room served Phase 18 assets.

## Required Work Loop For Every Phase

For each phase:

1. Read the original phase requirements.
2. Audit current implementation.
3. Write the phase-specific gap list.
4. Implement only that phase.
5. Validate with focused tests, role/access tests, build, browser desktop/mobile QA, and blocked-user checks.
6. Update master/living docs.
7. Commit and push.
8. Stop before the next phase.

## Next Step

After the Phase 1 hard-finish commit is pushed, start Phase 2: Apex-Branded Control Room Shell.

Do not begin Phase 2 until Phase 1 is committed and pushed.
