# Apex Separation Execution Audit

Last updated: 2026-06-09

This is the working map for separating **Apex** from **Apex HQ**.

## Non-Negotiable Target

- This PC is Apex.
- Apex must live in its own local repo/app at `C:\Users\jberl\Documents\Apex`.
- Apex HQ remains a separate contractor SaaS repo/app.
- Apex HQ can become a tool that Apex operates on, but Apex must not live inside Apex HQ.
- Family-care Builder work is out of scope for this extraction and must not be touched.

## Current Repo State

Active repo:

`C:\Users\jberl\Documents\New project`

Current reality:

- Private Apex is mixed into the Apex HQ repo.
- Apex HQ product AI is also present and should not be deleted blindly.
- Family-care work is dirty in the same repo from another Builder thread and is excluded from this extraction.

## Private Apex Inventory

These belong to Apex and should move to the new local Apex repo.

### Private UI

- `src/apex-control-room-components.jsx`
- `src/apex-control-room-utils.js`
- `src/apex-avatar-lab-components.jsx`
- `public/assets/apex-avatar/*`
- Apex private route/module wiring currently around `apexControlRoom` and `apexAvatarLab`.

### Private API Routes

Current private route family in `server/index.js`:

- `/api/apex-os/local-desktop-session`
- `/api/apex-os/memory`
- `/api/apex-os/skills`
- `/api/apex-os/internal-actions`
- `/api/apex-os/tasks`
- `/api/apex-os/reminders`
- `/api/apex-os/approval-packets`
- `/api/apex-os/execution-handoffs`
- `/api/apex-os/agent-control`
- `/api/apex-os/autonomy-runs`
- `/api/apex-os/build-awareness`
- `/api/apex-os/builder/*`
- `/api/apex-os/build-loop/*`
- `/api/apex-os/daily-briefing`
- `/api/apex-os/local-providers/*`
- `/api/apex-os/local-voice/*`
- `/api/apex-os/background/status`
- `/api/apex-os/home-assistant/*`
- `/api/apex-os/ask`
- `/api/apex-os/knowledge-intelligence`
- `/api/apex-os/voice/*`

### Private Runtime And Local Providers

- `desktop/apex-desktop-main.cjs`
- `scripts/apex-desktop-app.mjs`
- `scripts/apex-local-operator-runtime.mjs`
- `server/apexLlamaCppRuntime.js`
- `server/apexLlamaCppProvider.js`
- `server/apexOllamaProvider.js`
- `server/apexBackgroundRuntime.js`
- `server/apexGpuSpeedCore.js`
- `server/apexLocalAgentSpeedHistory.js`
- `shared/apexLocalAgentSpeed.js`
- `shared/apexWorkstationBrainMode.js`
- `shared/apexHomeBaseManifest.js`
- `shared/apexDesktopTrustedEntry.js`

### Private Voice

- `server/apexLocalVoiceRuntime.js`
- `server/apexNativeVoiceRuntime.js`
- `server/apexLightweightVoiceProvider.js`
- `server/apexVoiceboxProvider.js`
- `server/apexLiveTurnLatencyBenchmark.js`
- `server/apexLiveTurnLatencyHistory.js`
- `scripts/apex-faster-whisper-stt.py`
- `scripts/apex-kokoro-onnx-tts-v4-audition.mjs`
- `shared/apexAlwaysOpenMicRuntime.js`
- `shared/apexVoiceTurnDiagnostics.js`
- `shared/apexOsVoice.js`

### Private Memory, Skills, Tasks, Approvals, And Operator Logic

- `shared/apexOsMemory.js`
- `shared/apexOsMemoryRetrieval.js`
- `shared/apexOsTasks.js`
- `shared/apexOsSkillRegistry.js`
- `shared/apexOsApprovalPackets.js`
- `shared/apexOsExecutionHandoffs.js`
- `shared/apexOsAgentControl.js`
- `shared/apexOsAutonomyRuns.js`
- `shared/apexOsDailyBriefing.js`
- `shared/apexOsInternalActionEngine.js`
- `shared/apexOsExternalPreparationPackets.js`
- `shared/apexOsExternalActionApprovals.js`
- `shared/apexOsToolRouter.js`
- `shared/apexOsTraceLog.js`
- `shared/apexOsPrivacyFirewall.js`
- `shared/apexOsUntrustedContentFirewall.js`
- `shared/apexOsBuildAwareness.js`
- `shared/apexOsBuilderOperator.js`
- `server/apex-os-build-awareness.js`
- `server/apex-os-builder-mode.js`
- `server/apexAutonomousBuildLoopRuntime.js`

### Private Device / PC / Home Control

- `server/apexHomeAssistantConnector.js`
- `shared/apexOsDeviceLayer.js`
- `shared/apexOsDesktopWatch.js`
- `shared/apexOsBrowserActionPlan.js`
- `shared/apexOsLifeAutomationConnectors.js`
- `shared/apexOsMusicSecondScreen.js`

## Apex HQ Product AI To Keep

These belong to Apex HQ unless John later decides to rebuild product AI from scratch.

- `src/apex-assistant-shell-components.jsx`
- `src/apex-assistant-shell-utils.js`
- `src/ai-office-utils.js`
- `shared/leadAiAssistant.js`
- `shared/estimateRoughNotesAi.js`
- `shared/agentWorkflowContext.js`
- `shared/agentOperatingSystem.js`
- `shared/agentActionPolicy.js`
- `src/agent-action-proposal-utils.js`
- `src/agent-context-api-utils.js`
- `src/agent-os-ui-utils.js`
- `src/opportunity-scout-utils.js`
- `shared/opportunityScout.js`
- `shared/opportunityScoutAi.js`
- `src/customer-portal-preview-utils.js`
- `src/takeoff-studio-utils.js`
- `src/material-prep-utils.js`
- job/report/upload/safety/tool-checklist assistant rails that are role/company scoped.

## Shared Utility Candidates

Keep shared only if they become neutral contracts. They must not carry John-private memory, local runtime state, owner identity, or device execution.

- Redaction helpers.
- Provider request/response shapes.
- Model-router contracts.
- Prompt budget contracts.
- Permission/safety helper patterns.
- Local-only receipt sanitizers.

## Dangerous Couplings

- Apex currently depends on Apex HQ auth/session/company bootstrap.
- Apex private routes live in the same `server/index.js` as Apex HQ product routes.
- Apex private UI lives inside the Apex HQ React app and navigation shell.
- Apex desktop app still launches an Apex HQ route.
- Apex private memory/tasks/reminders currently persist through Apex HQ data structures.
- Builder/self-fix file allowlists point at Apex HQ repo paths.
- Home Assistant/device control is exposed through Apex HQ server routes.

## Execution Path

1. Freeze and checkpoint this audit.
2. Create `C:\Users\jberl\Documents\Apex` as its own repo.
3. Build Apex standalone runtime, API, desktop shell, data path, and minimal avatar/conversation UI.
4. Move private Apex modules into the Apex repo in working chunks.
5. Prove Apex launches and answers locally without Apex HQ auth/session/company data.
6. Add an Apex-side Apex HQ tool boundary for local repo/app operations.
7. Retire private Apex UI/routes/runtime from Apex HQ.
8. Validate both repos separately and commit local checkpoints.

## Explicit Non-Goals

- Do not touch production data.
- Do not deploy.
- Do not change schema/auth/billing.
- Do not remove Apex HQ product AI during the first extraction.
- Do not stage or edit family-care Builder files.
- Do not delete private Apex files from Apex HQ until the standalone Apex replacement is proven.
