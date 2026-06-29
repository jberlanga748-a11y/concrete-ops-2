# Apex OS Local-First Intelligence Mode Plan

Last updated: 2026-06-07

Purpose: define and track the architecture for making Apex OS use John's local RTX 5080 PC as the default Jarvis intelligence provider, while preserving OpenAI as a manual cloud override only. This document does not install tools, remove OpenAI, open `.env`, change schema/auth/session behavior, deploy, or expose secrets.

## Status

Local-First Provider Policy v0 is implemented locally.
llama.cpp Provider v1 is implemented as the primary local Ask Apex and Knowledge Intelligence brain path.
Ollama Provider v0/v1 remains implemented as legacy local fallback/status support.

Implemented:

- Shared deterministic policy helper: `shared/apexOsLocalFirstProviderPolicy.js`.
- Focused policy tests: `shared/apexOsLocalFirstProviderPolicy.test.js`.
- Ask Apex and Knowledge Intelligence now consult the policy before OpenAI text-provider calls.
- A server integration test proves `OPENAI_API_KEY` alone does not allow Apex OS cloud calls.
- Server-only llama.cpp helper/runtime: `server/apexLlamaCppProvider.js` and `server/apexLlamaCppRuntime.js`.
- Focused llama.cpp provider/runtime tests: `server/apexLlamaCppProvider.test.js` and `server/apexLlamaCppRuntime.test.js`.
- Server-only read-only/legacy Ollama helper: `server/apexOllamaProvider.js`.
- Focused legacy Ollama provider tests: `server/apexOllamaProvider.test.js`.
- Operator-only local provider status endpoint: `GET /api/apex-os/local-providers/status`.
- Ollama v0 checks only local `/api/tags`, parses model names/tags, blocks non-local URLs by default, and never sends prompt bodies.
- Ollama v1 can still serve operator-only local `/api/chat` fallback after the Local-First Provider Policy, Privacy Firewall, Untrusted Content Firewall, Action Permission Matrix, and Model Router context pass.
- Normal chat, planning, memory/tasks/device-style Ask Apex routes use local llama.cpp `/completion` with `gpt-oss:20b` by default when the sidecar/model is available and safety gates pass.
- Normal coding-analysis Ask Apex routes also use the primary llama.cpp GPT-OSS lane by default; deeper/coder model paths remain manual-only.
- Ask Apex falls back to deterministic local/source-backed answers if llama.cpp is offline, the selected local model is missing, local output is malformed, privacy blocks the payload, or untrusted context requires review. Ollama is not the default brain path.
- Knowledge Intelligence now uses local llama.cpp `/completion` by default for source-aware summaries when the selected model is available and policy/privacy/untrusted-content gates pass.
- Knowledge source summaries / notes / research synthesis use the same primary llama.cpp GPT-OSS lane by default; deeper synthesis remains manual-only.
- Knowledge Intelligence falls back to deterministic local source ranking/summaries if llama.cpp is offline, the selected model is missing, local output is malformed, privacy blocks the payload, or untrusted source content requires review.
- Apex llama.cpp Resident Brain v1 is implemented for John's private local Apex operator. Active `apex:local` sessions now prepare the primary llama.cpp sidecar by default with `gpt-oss:20b`, keep that model resident by keeping the local `llama-server.exe` process alive, and unload legacy Ollama qwen residency during prepare so normal Apex does not compete with itself for VRAM. Ollama `qwen3:14b` stable-residency benchmark evidence remains useful legacy fallback/manual model evidence, but it is not the normal warm path anymore. `--status` stays read-only, `--no-prepare-brain` skips sidecar prepare for troubleshooting, `--keep-warm` is legacy Ollama fallback only, no `32768`, no `keep_alive=-1`, no `qwen3-coder:30b` warm residency or auto-promotion, no OpenAI/Groq/cloud fallback, and no automatic benchmark runs.

Still not implemented:

- Ollama `/api/generate` calls.
- LM Studio calls.
- OpenAI removal.
- Cloud override execution route.
- Local STT/TTS provider.
- Contractor AI helper migration.
- Local Research/Search Provider.
- Schema/auth/session changes, production behavior, provider installs, desktop control, or external actions.

## John's Local Machine Target

Detected planning target:

- Intel Core Ultra 9 285K
- NVIDIA RTX 5080 with about 16 GB VRAM
- 32 GB RAM
- Windows 11
- 2 TB NVMe with plenty of free space
- WSL/Docker not required for the first setup
- llama.cpp has been installed/tested by John with official `gpt-oss:20b` GGUF and is the primary Ask Apex brain path.
- Ollama remains installed/tested with `qwen3:14b` and `qwen3-coder:30b` as legacy fallback/status only for Apex private operator intelligence.
- LM Studio is optional and not required for the current local-first slice

This hardware is strong enough for local everyday Apex OS chat, routing, summaries, memory suggestion drafts, task/reminder planning, local knowledge summaries, and many planning/coding reviews. Very large local models may spill into system RAM or run slower, so Apex OS should route most work to smaller local tiers and reserve bigger local or cloud models for explicit hard requests.

## Current OpenAI Dependency Map

Current audit result:

| Surface | Current OpenAI dependency | Current behavior | Local-first target |
| --- | --- | --- | --- |
| Ask Apex | `server/index.js` still retains the cloud override OpenAI path; `shared/apexOsAsk.js` builds strict JSON provider packets | Uses local llama.cpp `/completion` with `gpt-oss:20b` by default when the sidecar/model is available and safety gates pass. Ollama is legacy fallback/status only. Uses deterministic local fallback when llama.cpp is offline/missing/blocked. Uses OpenAI only when explicit cloud override policy allows it. | Keep normal Jarvis chat llama.cpp-first and local-only by default. |
| Knowledge Intelligence | `server/index.js` retains the cloud override OpenAI path; `shared/apexOsKnowledgeIntelligence.js` builds strict source-aware provider packets | Uses local llama.cpp `/completion` with `gpt-oss:20b` by default for source summaries when the sidecar/model is available and safety gates pass. Ollama is legacy fallback/status only. Uses deterministic local ranking/summary fallback when llama.cpp is offline/missing/blocked/malformed. Uses OpenAI only when explicit cloud override policy allows it. | Keep source-aware summaries llama.cpp-first and local-only by default. |
| Apex OS voice speech | `shared/apexOsVoice.js` targets OpenAI audio speech with `gpt-4o-mini-tts` | Server-side OpenAI TTS when key exists; browser speech fallback when not configured or provider fails. | Browser speech or future local TTS by default. Cloud TTS disabled unless manually overridden. |
| Apex OS voice transcription | `shared/apexOsVoice.js` targets OpenAI audio transcriptions with `gpt-4o-mini-transcribe` | Server-side OpenAI STT when key exists; otherwise manual transcript/browser fallback paths. | Future local STT path first; no paid STT by default. Browser/manual transcript remains fallback until local STT is implemented. |
| Model Router | `shared/apexOsModelRouter.js` still carries OpenAI aliases as route metadata | Central route/tier/budget metadata. Ask Apex and Knowledge Intelligence now map normal/coding/source-summary requests to the primary local llama.cpp `gpt-oss:20b` path. | Continue separating route/tier metadata from concrete provider models. |
| Contractor AI lead assistant | `server/index.js` passes `OPENAI_API_KEY` into `shared/leadAiAssistant.js` | Server-side OpenAI if configured; review-only drafts; tests assert no frontend OpenAI key. | Leave unchanged until a separate contractor-helper local-provider migration is requested. |
| Estimate rough notes AI | `server/index.js` passes `OPENAI_API_KEY` into `shared/estimateRoughNotesAi.js` | Server-side OpenAI if configured; review-only drafts; no frontend key. | Leave unchanged until separate migration. |
| Opportunity Scout AI | `server/index.js` passes `OPENAI_API_KEY` into `shared/opportunityScoutAi.js` | Server-side OpenAI if configured; deterministic fallback exists in search-plan helper. | Leave unchanged until separate migration. |
| Contractor Advisor | `server/index.js` passes `OPENAI_API_KEY` into `shared/contractorAdvisorAi.js` | Server-side OpenAI if configured; local answer fallback exists when no key is configured. | Leave unchanged until separate migration. |

Important distinction: this local-first plan is for Apex OS private Jarvis intelligence first. Contractor-facing or contractor-workspace AI helper migration should be a separate phase so Apex OS privacy and customer/field boundaries do not get mixed.

## Local Provider Architecture

Provider priority:

1. **llama.cpp local sidecar** with GPT-OSS 20B as the primary local provider.
2. **Ollama native Windows** as legacy fallback/status and manual model inventory support.
3. **LM Studio OpenAI-compatible local server** as a future optional local provider.
4. **Deterministic local fallback** when no local model is online.
5. **OpenAI cloud override** only when John explicitly requests it and the server-side guard allows it.

Future provider abstraction should be server-side and private:

```text
Apex OS request
  -> privacy firewall
  -> untrusted content firewall
  -> action permission matrix
  -> model route/cost governor
  -> local-first provider guard
  -> provider adapter
       - llama-cpp
       - ollama-legacy
       - lm-studio-openai-compatible
       - deterministic-fallback
       - openai-cloud-override
  -> sanitized answer/receipt
```

Suggested future modules:

- `shared/apexOsLocalFirstProviderPolicy.js`
- `shared/apexOsLocalFirstProviderPolicy.test.js`
- `server/apexOsLocalModelProvider.js`
- `server/apexOsLocalModelProvider.test.js`

Suggested future config names only:

- `APEX_OS_AI_MODE`
- `APEX_OS_DEFAULT_AI_PROVIDER`
- `APEX_OS_OPENAI_ENABLED`
- `APEX_OS_CLOUD_OVERRIDE_ENABLED`
- `APEX_OS_CLOUD_OVERRIDE_PHRASE`
- `APEX_OS_LOCAL_OLLAMA_BASE_URL`
- `APEX_OS_LOCAL_LM_STUDIO_BASE_URL`
- `APEX_OS_LOCAL_MODEL_NANO`
- `APEX_OS_LOCAL_MODEL_MINI`
- `APEX_OS_LOCAL_MODEL_STANDARD`
- `APEX_OS_LOCAL_MODEL_FLAGSHIP`
- `APEX_OS_LOCAL_AI_REQUEST_TIMEOUT_MS`
- `APEX_OS_LOCAL_AI_MAX_RETRIES`
- `APEX_OS_CLOUD_DAILY_CALL_LIMIT`
- `APEX_OS_CLOUD_KILL_SWITCH`

Config values must stay server-side. Frontend responses may show only redacted status labels such as `local-first`, `local-provider-online`, `local-provider-offline`, `cloud-disabled`, `manual-cloud-override-required`, or `cloud-kill-switch-on`.

## Local-First Route Coverage

Normal Apex OS Jarvis work should not require paid OpenAI calls:

| Route/capability | Default provider target | Notes |
| --- | --- | --- |
| Chat / Ask Apex | Local llama.cpp | Everyday private conversation and Apex OS source-backed answers. Implemented with `gpt-oss:20b` through llama.cpp when available, with deterministic fallback and Ollama legacy fallback/status only. |
| Memory suggestions | Local tiny/mini model or deterministic helper | Never auto-approve durable memory. |
| Tasks/reminders | Deterministic Level 2 engine first, local LLM only for wording/summary | Internal writes remain operator-only with receipts. |
| Device command planning | Deterministic planner plus local model for explanation | Real execution remains gated by device connector rules. |
| Planning and daily summaries | Local mini/standard model | Good fit for local-first use. |
| Tool routing | Deterministic helper first, local tiny/mini model only if needed | Must not bypass action permission matrix. |
| Affective state | Deterministic helper first | No diagnosis or durable psych profile. |
| Background loops | Local tiny/mini/standard only when loops are enabled later | Budgeted, observable, cancellable, and no endless token burn. |
| Knowledge summaries | Local llama.cpp | Implemented with `gpt-oss:20b` through llama.cpp for source-aware summaries when available, with deterministic local ranking/summary fallback. No live web unless later enabled through a separate research/search provider phase. |
| Hard coding/reasoning/research | Local flagship first, optional cloud override | Cloud only when John explicitly asks. |
| Voice STT/TTS | Browser/manual fallback first, future local audio provider | OpenAI audio disabled by default for everyday Jarvis mode once implemented. |

## Recommended Local Model Tiers

These are planning targets for a 16 GB VRAM GPU. Exact model choice should be verified with local benchmarking after llama.cpp/Ollama/LM Studio options are installed.

| Apex OS tier | Target use | Suggested local model class | Notes |
| --- | --- | --- | --- |
| `nano` | intent, permission labels, affective state, memory/task extraction, short summaries | 3B-4B instruct model | Fastest route. Good for always-on helpers and low-latency UI. |
| `mini` | everyday Jarvis conversation, task planning, simple business help | 7B-9B instruct model | Default for most private chat. Should fit comfortably on 16 GB VRAM when quantized. |
| `standard` | knowledge synthesis, richer planning, tool routing explanation, Apex HQ planning | 12B-20B instruct/reasoning model | Best default for serious local work when latency can be a little higher. |
| `flagship-local` | hard coding, architecture, complex reasoning, deep strategy | 30B-32B quantized model when practical | May use more RAM or run slower. Use only when John asks for deeper work or local mini/standard is not enough. |
| `cloud-override` | hardest coding/reasoning/research/current-fact work | OpenAI or another approved cloud provider | Disabled by default. Requires explicit manual override, receipt, budget, and privacy/firewall pass. |

Good first model families to evaluate through llama.cpp/Ollama/LM Studio:

- Qwen, Gemma, Llama, DeepSeek-R1 distilled variants, and gpt-oss/open-weight models available through the chosen local provider.
- Start with one small model and one stronger model instead of downloading too many models at once.

First practical install target:

1. `standard` / everyday: llama.cpp `gpt-oss:20b` for normal Apex OS private chat and source-backed work.
2. `standard` / normal coding: llama.cpp `gpt-oss:20b` for everyday Builder/Self-Fix/code analysis when safety gates pass.
3. `flagship-local` / manual deep coding: larger local coder/MoE models only when John explicitly asks for deep local coding or a benchmark shows it is worth trying.
4. Add/test a `nano` helper such as `qwen3:4b-instruct` only if GPT-OSS sidecar latency becomes a measured bottleneck for narrow intent routing or short summaries. Do not split normal Apex into multiple brains by default.
5. Keep `flagship-local` manual-only until benchmarks show a specific deep request is worth the cost.

## No-Paid-Call Guard

Future implementation must make paid calls impossible by accident:

1. Apex OS defaults to `local-first`.
2. Existing `OPENAI_API_KEY` must not be enough for Apex OS to call OpenAI.
3. OpenAI for Apex OS requires an explicit server-side enable flag plus a per-request manual cloud override from John.
4. Cloud override phrase should be clear, such as: `Apex, use cloud for this request`.
5. The request must pass Privacy Firewall and Untrusted Content Firewall before any cloud payload is prepared.
6. Action Permission Matrix must block cloud use for secrets, credentials, sensitive personal data, field/customer/demo content, production secrets, and untrusted prompt-injection content.
7. Cloud calls must emit a compact activity receipt that includes provider family, model alias, route, reason, budget level, timestamp, and privacy/firewall outcome, but no raw prompt, raw response, secrets, tokens, credentials, cookies, headers, or private content.
8. Cloud fallback must never happen automatically when the local model is offline. Apex OS should say the local model is offline and offer deterministic fallback or ask John whether to use the cloud override.
9. Background loops must never use cloud by default. Any background cloud use would require a separate explicit budgeted policy phase.
10. Tests must prove `OPENAI_API_KEY` present plus local-first mode still does not call OpenAI without the override.

## Fallback Behavior

If llama.cpp is not installed or offline:

- Ask Apex uses deterministic local/source-backed fallback and may report Ollama legacy status, but Ollama is not the default Ask Apex brain.
- Knowledge Intelligence uses local ranking and deterministic summaries and may report Ollama legacy status, but Ollama is not the default Knowledge Intelligence brain.
- Internal tasks/reminders/memory suggestions still use deterministic Level 2 helpers where possible.
- Voice uses browser speech/manual transcript fallback.
- Background loops skip provider synthesis and log a safe receipt/status only if that loop phase is active.
- Apex OS must not silently switch to OpenAI.

If local model output is malformed:

- Do not retry endlessly.
- Fall back to deterministic local answer.
- Include a safe status such as `local-provider-response-invalid`.
- Keep raw provider output out of traces, receipts, and UI.

## Activity Receipt For Cloud Use

Future cloud-use receipts should include:

- receipt type: `cloud-model-call`
- Apex OS route
- selected provider family
- model alias
- manual override confirmation present: true/false
- budget level and token cap
- reason cloud was used
- privacy firewall result
- untrusted content firewall result
- action permission summary
- timestamp
- raw content stored: false
- secrets exposed: false

Receipts must not include raw prompts, raw model responses, private message bodies, documents, headers, cookies, tokens, API keys, database URLs, payment data, or credentials.

## First Implementation Slice

Completed first build slice:

1. Deterministic local-first provider policy helpers and tests are added.
2. Apex OS chooses local/deterministic fallback first and blocks OpenAI unless cloud override is explicitly enabled.
3. Safe server-side llama.cpp and Ollama config parsing/model parsing are added without printing values.
4. Operator-only read-only local provider status endpoint is added.
5. Ask Apex and Knowledge Intelligence consult the local-first provider guard before any OpenAI text-provider call.
6. Ollama v0 calls only local `/api/tags`; the status route does not call `/api/chat`, `/api/generate`, or send prompt bodies.
7. llama.cpp wires Ask Apex to local `/completion` only after policy, privacy, untrusted-content, and model availability checks pass.
8. Knowledge Intelligence wires source-aware summaries to llama.cpp local `/completion` only after policy, privacy, untrusted-content, and model availability checks pass.
9. `OPENAI_API_KEY` alone still does not authorize Apex OS paid cloud text calls.
10. Contractor AI helpers are not migrated yet.

This implementation did not change schema, auth/session behavior, production, deployments, external actions, device control, browser/desktop/music control, ordering, booking, messages, billing, or field/customer/demo access.

Recommended next slice:

1. Plan a Local Research/Search Provider.
2. Keep it operator-only, source-aware, and local-first.
3. Do not add paid search APIs, uncontrolled web browsing, external connectors, schema/auth/session changes, provider installs, model downloads, production behavior, or field/customer/demo access in that planning slice.
4. Keep OpenAI blocked unless explicit cloud override remains enabled and approved.
5. Leave voice, LM Studio, and contractor AI helper migration as separate phases.

## Sources Checked

- Ollama Windows docs: native Windows app, GPU support, command line, and local API served on `http://localhost:11434`.
- Ollama model library: available local model families include gpt-oss, Gemma, DeepSeek-R1, Qwen, and others.
- LM Studio local server docs: can run a local server on localhost, supports REST API and OpenAI-compatible endpoints.
- LM Studio offline docs: downloaded LLMs and local server operation can work locally/offline after models are available.
