# Apex Local Operator Runtime Plan

Last updated: 2026-06-07

Status: saved plan only. Do not implement from this document while another Builder thread is actively working unless John explicitly starts this phase. This plan exists so Apex work does not drift, duplicate completed Qwen/Self-Fix work, or forget the path to making Apex usable locally.

## Latest Handoff

2026-06-07: Self-Fix v2 is complete. Apex now auto-dispatches safe local repair requests from `/apex` into the existing controlled Builder tooling, keeps Talk-To-Apex minimal, and reports short outcomes first. Evidence was saved under `outputs/apex-self-fix-v2/2026-06-07T07-19-57-445Z`.

2026-06-07: Apex Local Operator Runtime v0 is complete and `npm.cmd run apex:local` is the Windows-friendly local start command. Apex Personal OS Core v0 is the next split: Apex is the top-level private operator, Apex HQ is one domain underneath it, `/apex` remains the temporary clean cockpit, and routing/skills/agents/local-voice readiness must stay conversational and non-cluttered. Local voice must be honest: browser playback/captions are fallback only, OpenAI audio/cloud STT/TTS is not part of the Personal OS local voice path, and full hear/speak readiness waits for local STT/TTS provider wiring.

2026-06-07: Apex Lightweight Voice Core v0 is active. Apex normal speech is locked to one lightweight Kokoro/OfflineTTS-style voice target anchored by John's local `C:\Users\jberl\Downloads\offlinetts-output.wav` sample. The original sample stays local only and must not be committed, uploaded, moved, or deleted. Voicebox is no longer the daily/default voice path; it is optional heavy premium/test mode only. Fallback order is locked Kokoro first, Piper second, Windows SAPI emergency third. Voicebox can be used only by explicit premium/test request when the resource guard says it is acceptable.

2026-06-07: Locked Apex TTS Activation v3 is implemented in code. Apex now accepts Kokoro/OfflineTTS-compatible lightweight providers, safely probes configured/local command names, records locked/fallback/generation-timing speech receipts, and keeps `/apex` voice status focused on STT, TTS, and cloud-off truth. Local discovery found the anchor WAV but did not find a Kokoro/OfflineTTS/Piper command or recoverable voice profile on this PC, and the WAV has no embedded voice-name metadata. Until John installs/configures the local provider with `APEX_LIGHTWEIGHT_VOICE_NAME` and `APEX_LIGHTWEIGHT_VOICE_COMMAND`, Windows SAPI remains emergency TTS fallback only.

2026-06-07: Apex Kokoro ONNX TTS v4 is implemented locally. The normal Apex lightweight TTS path now uses `kokoro-js` with model `onnx-community/Kokoro-82M-v1.0-ONNX`, dtype `q8`, processor `cpu/onnx`, output `24 kHz mono WAV`, and default locked male voice `am_michael`. The safe audition list is `am_adam`, `am_michael`, `am_echo`, `am_eric`, `am_fenrir`, `am_liam`, `am_onyx`, `bm_daniel`, `bm_george`, and `bm_lewis`. The package path runs on CPU by default to preserve RTX 5080 VRAM for Ollama and faster-whisper. Apex can cycle/lock the current Kokoro voice through the operator-only local voice route, persisting only provider, model id, voice id, dtype, and processor in the ignored local data path. Windows SAPI remains emergency fallback only; Voicebox remains premium optional only; OpenAI/cloud audio remains off. Auditions are generated with `npm.cmd run apex:voice:audition` into ignored `outputs/apex-kokoro-onnx-tts-v4-*/` folders. John's original `C:\Users\jberl\Downloads\offlinetts-output.wav` remains a local reference only and must not be moved, overwritten, uploaded, committed, or exposed.

2026-06-07: Apex Always-Open Mic Runtime v0 is implemented on the existing `/apex` browser microphone path. The browser ingress path remains the fallback/continuous mic lane, while Native Voice Runtime v1 now adds a separate explicit Windows WAV capture lane for manual Wake turns. The deterministic gate in `shared/apexAlwaysOpenMicRuntime.js` models `standby`, `capturing`, `processing`, `speaking`, `recovering`, `quiet`, and `error`; uses a local CPU amplitude/silence gate with an 800ms sustained silence window before faster-whisper CUDA STT; and drops audio immediately when Apex is speaking, recovering, quiet, TTS-active, or playback is expected. `/api/apex-os/local-voice/transcribe` accepts a compact always-open mic packet, refuses muted/gated packets before parsing audio or running STT, and returns safe local receipts with ingress provider, VAD provider, state, capture duration, silence window, STT processor, feedback suppression, dropped-frame count, and cloud/audio-storage false. `/apex` stays minimal with tiny local voice status only. Voice commands now include "go quiet", "stop listening", "wake up", "start listening", "can you hear me", "what voice are you using", and "clear the screen". This is not wake-word work, not OpenAI/cloud audio, not Voicebox, and not a new runtime.

2026-06-07: Apex Background Runtime v0 is implemented as a local supervisor/launcher layer, not a Windows service, tray app, boot registration, or hidden daemon. `npm.cmd run apex:local` now reports single-instance supervisor status, reuses healthy local API/client ports instead of spawning duplicate runtime processes, supports `--status`, `--json`, `--no-open`, `--stop`, default bounded `--keep-warm`, and explicit `--no-keep-warm`, and keeps safe process ownership receipts without exposing command lines or secrets. `/api/apex-os/background/status` is operator-only and reports API/client, llama.cpp/Ollama/model readiness, RTX 5080 compute/GPU status, local voice STT/TTS readiness, always-open mic mode, heartbeat state, warm-runtime state, and latency profile state. Ollama keep-warm remains bounded legacy fallback behavior while Apex local runtime is open; v1.2 defaults that bounded keep-alive to `30m`, never `-1`, and never warms `qwen3-coder:30b`.

2026-06-07: Apex Workstation Brain Mode v2 is implemented as an extension of the existing local runtime, not a new runtime, Windows service, or cloud provider. Profiles are `speed` (`qwen3:14b`, `num_ctx=2048`, `keep_alive=60m`, lower-temperature capped quick answers for normal/local/status/voice turns), `balanced` (`qwen3:14b`, `num_ctx=8192`, `keep_alive=15m`), `workstation` (`qwen3:14b`, `num_ctx=12288`, `keep_alive=60m`), `deep` (`qwen3:14b`, task-scoped larger context when telemetry is stable), `coding` (`qwen3:14b`, `num_ctx=4096`, conservative context for Builder/Self-Fix/coding routes), and `dedicated` prepared but disabled by default. Normal chat is compact by default, while explicit detailed, full-answer, breakdown, or step-by-step requests escape to deeper reasoning so long answers do not silently use the fast cap. Ollama `/api/chat` calls are serialized so local model turns do not compete for GPU/RAM, and `/api/apex-os/background/status` now reports brain mode, model, context, keep-alive, processor, VRAM threshold status, queue state, promotion/rollback decision, and compaction-needed state. Direct operator persona is scoped only to Apex Personal OS/local operator routes; customer-facing Apex HQ product routes do not receive it. No OpenAI/cloud, production/deploy/schema/auth/session, sends/spend/orders/bookings, arbitrary desktop control, unrelated process killing, or permanent VRAM lock is added.

2026-06-07: Apex Local Agent Speed v1.1 corrects the normal coding lane so Apex no longer auto-loads `qwen3-coder:30b` for everyday Builder/Self-Fix/debug/fix work. Fast lane remains `qwen3:14b` at `num_ctx=2048`; normal coding lane is now `qwen3:14b` at `num_ctx=4096`; optional fast coder is `qwen2.5-coder:7b` only if installed and measured; deep coding is `qwen3-coder:30b` at `num_ctx=4096-8192` only when John explicitly asks. Benchmark receipts now record route mode, model, context, prompt/generation timing, total duration, residency/VRAM metadata when available, and adaptive notes that suggest manual deep mode without auto-promoting. No OpenAI/cloud fallback, 30B auto-warm, process killing, schema/auth/session, production, or deploy behavior was added.

2026-06-07: Apex Local Agent Speed v1.2 is private Apex operator work, not Apex HQ product/customer functionality. `npm.cmd run apex:local` now defaults to bounded 14B keep-warm while Apex is open, with `--no-keep-warm` as the explicit off switch. Warm residency targets only `qwen3:14b`, defaults to `num_ctx=2048`, allows `num_ctx=4096` only when the normal coding lane is active, blocks `32768`, never uses `keep_alive=-1`, never warms `qwen3-coder:30b`, and stays off when the local runtime is disabled. Ollama chat requests now ask for local streaming so Apex can receipt first-token latency when the provider supplies it, while preserving non-stream fallback parsing and storing no raw prompts/responses. Benchmark history is read passively from local `outputs/apex-local-agent-speed-v1-2/` receipts and summarized compactly; Apex does not run benchmarks unless John explicitly asks.

2026-06-08: Apex Stable Residency v1.3 is implemented for John's private local Apex operator, not Apex HQ product/customer functionality. Apex now prefers one stable resident `qwen3:14b` context while Apex is open: stable `num_ctx=4096` when VRAM/benchmark evidence is healthy, fallback stable `2048` when VRAM is tight. Fast answers use shorter prompts/output caps and lower temperature instead of flipping contexts; normal coding uses the same resident context unless an explicit larger/deep request is made. The bounded benchmark compares stable 2048, stable 4096, and alternating 2048/4096 receipts under `outputs/apex-local-agent-speed-v1-3/`; the latest run chose stable 4096 after stable 4096 averaged 572 ms total / 160 ms first token with healthy VRAM, while alternating averaged 3228 ms / 2808 ms and showed context-switch overhead. `qwen3-coder:30b` remains manual-only, never auto-warmed, no `32768`, no `keep_alive=-1`, and no OpenAI/Groq/cloud fallback.

2026-06-08: Apex llama.cpp Resident Brain v1 is the current local-first runtime direction. `npm.cmd run apex:local` prepares the primary llama.cpp sidecar by default with `gpt-oss:20b`, keeps that model resident by keeping the local `llama-server.exe` process alive, and unloads legacy Ollama qwen residency during prepare so normal Apex does not compete with itself for VRAM. `--status` remains read-only, `--no-prepare-brain` is the troubleshooting escape hatch, and `--keep-warm` is legacy Ollama fallback behavior only. Background health now treats llama.cpp/GPT-OSS readiness as the primary brain signal; Ollama/qwen installed models remain status/manual fallback evidence, not the normal warm path.

2026-06-07: Apex Latency Profiler + Warm Runtime v0 is implemented as receipt/status metadata on the existing local runtime. It combines mic capture, VAD close, WAV conversion, upload, server parse, STT, model queue, model response, TTS generation, playback start, recovery, and warm-runtime readiness into an `apex-latency-profiler` receipt. `/apex` shows a tiny Latency chip only; no dashboard panel, service, schema/auth/session change, production touch, OpenAI/cloud call, or desktop control is added.

2026-06-07: Apex Desktop Shell v0 Job 001 is implemented on top of the existing local runtime, then adjusted for voice debugging. `npm.cmd run apex:local` now creates/refreshes the Windows Desktop and Start Menu `Apex.lnk` shortcuts, reuses healthy localhost API/client ports, and opens `/apex` in the normal browser by default so John can see and control Chrome microphone permissions directly. Chromium app mode remains available with `--desktop-shell` for later, and its local-only focus guard still uses `127.0.0.1:2739` only when that shell is explicitly requested. This is not a Windows service, boot registration, tray app, LAN binding, browser/desktop automation bridge, or production/deploy phase. Shortcut icons use a system placeholder unless a local `apex.ico` override is dropped into the repo path and the launcher refreshes the shortcuts.

2026-06-07: Apex Real Voice Loop v2 is implemented as a tuning layer on the existing browser mic + faster-whisper CUDA + local TTS path. It keeps AudioWorklet-first mic capture, lowers the sustained silence close target to 520ms, lowers the minimum turn to 500ms, reduces MediaRecorder fallback slices to 250ms, records actual silence/close timing in local voice receipts, and shows compact `/apex` chips for Close, Turn, and Slow timing. It does not add native mic capture, wake-word, LAN/public exposure, OpenAI/cloud audio, desktop/browser control, schema/auth/session changes, production/deploy behavior, or field/customer/demo Apex OS access.

2026-06-07: Apex Memory Retrieval + Compaction v0 is implemented as a local deterministic layer on the existing Apex OS memory store. Ask Apex now ranks approved operator-only memory rows lexically for the current turn, keeps suggested memory out of durable context, compacts recent `/apex` turn envelopes before provider use, returns a compact `memoryRetrievalSummary` receipt, and keeps vector storage/embeddings/schema/cloud memory off. This is not a new dashboard, not a schema change, not a file crawler, not a web research system, and not field/customer/demo visible.

2026-06-07: Apex Native Voice Runtime v1 is implemented as an explicit local Windows mic input lane for `/apex`. It adds `server/apexNativeVoiceRuntime.js` and the operator-only `POST /api/apex-os/local-voice/native-listen` route, using Windows MCI/WAV capture plus the existing local STT handoff so manual Wake turns can go native Windows mic -> faster-whisper CUDA/GPU without browser audio blob/WAV conversion. The older Windows SAPI direct dictation path remains configurable fallback only. `/apex` now prefers the native input lane when ready, keeps browser AudioWorklet/WAV mic as fallback, and reports a tiny `Input Native/Browser` chip. It is not a wake-word engine, not continuous background capture, not LAN/mobile exposure, not OpenAI/cloud audio, not audio storage, not desktop/browser control, and not a Windows service.

Self-Fix v3, better screen evidence/context collection before choosing a controlled fix profile, is useful later. It is not the next priority for tonight because John's immediate blocker is that Apex still needs to be easy to start, open, talk to, and test locally.

## North Star

Apex is John's private local operator. John should be able to open Apex, talk to it, hear it answer, and tell it to work on Apex HQ without needing Codex as the daily interface.

The target is not another dashboard. The target is:

- one Apex home surface
- local-first intelligence
- local voice that sounds good
- one-click local startup
- Apex acts for private, local, reversible work
- Apex reports compactly after it does the work
- Apex interrupts only for consequential actions

## Confirmed Already Built

Do not rebuild these:

- Apex Home / Talk-To-Apex surface exists.
- Ask Apex local text chat uses llama.cpp GPT-OSS through `server/apexLlamaCppProvider.js` when the sidecar/model is available and safety gates pass.
- Ollama remains legacy fallback/status only through `server/apexOllamaProvider.js`.
- `npm.cmd run apex:local` prepares the llama.cpp GPT-OSS sidecar by default; `--no-prepare-brain` skips it and `--keep-warm` is legacy Ollama fallback only.
- Normal Apex talking and normal coding/build routes use the primary llama.cpp GPT-OSS lane by default.
- Knowledge Intelligence uses the same primary llama.cpp path by default.
- `OPENAI_API_KEY` alone does not authorize Apex OS text cloud calls.
- Self-Fix v0 repair prep exists.
- Self-Fix v1 patch handoff exists.
- Self-Fix v2 auto-dispatch is complete and can consume valid handoffs through controlled Builder tooling.
- Builder Mode can run fixed local validation commands.
- Builder Mode can apply exact allowlisted local patches and undo Apex-owned patches.
- Home Assistant v1 has a config-gated one-time local device connector path.

## Current Blockers To Using Apex Tonight

These are the real gaps:

1. No one-click local launcher/runtime exists yet.
2. Apex is still started like a dev app instead of a resident desktop operator.
3. Apex does not reliably open itself to `/apex` or `/apex-control-room`.
4. Local readiness is not visible enough: server, database, llama.cpp GPT-OSS, Ollama legacy fallback, installed model inventory, and voice provider status should be obvious.
5. Voice STT/TTS is not fully local. The text brain is local, but microphone transcription and high-quality spoken output still need a local provider path.
6. Desktop/browser control is still planning-only.
7. Overnight/background operator work is not yet implemented.

## Build Order

### Phase 1: Local Operator Runtime v0

Goal: John can start Apex locally with one command and immediately test it.

Build:

- Add a Windows-friendly local launcher command/script.
- Start the Apex server on the expected port.
- Detect if the port is already in use and reuse/open the existing server if healthy.
- Check `/api/ready`.
- Check llama.cpp local provider status.
- Check Ollama legacy fallback/status.
- Verify GPT-OSS sidecar readiness and installed local model inventory.
- Open the Apex home route automatically.
- Add a compact local readiness receipt/status that Apex can summarize conversationally.
- Keep OpenAI disabled for everyday Apex OS mode.

Do not:

- rebuild Apex Home
- rebuild local provider routing
- add desktop control
- add browser control
- add production/deploy/schema/auth/session changes
- expose Apex to field/customer/demo users

Validation:

- focused local launcher test
- `/api/ready` pass
- local provider status test
- Apex Home opens locally
- Ask Apex typed test with local llama.cpp/GPT-OSS when the sidecar/model is ready
- coding route status proves normal coding stays on the primary local llama.cpp/GPT-OSS path when ready and `qwen3-coder:30b` remains manual-only fallback/deep work
- `npm.cmd run build`
- `git diff --check`

### Phase 2: Local Voice Runtime v0

Goal: John can talk to Apex and hear Apex respond without OpenAI.

Status update: Local Voice Runtime v4 is implemented for GPU STT plus Kokoro ONNX local TTS. Apex has local-only voice status/speech/transcription endpoints, tries local Kokoro ONNX TTS before Piper/Windows fallback, refuses to count browser speech synthesis as real local TTS, keeps OpenAI audio out of `/apex`, can save compact safe private learning memories through the existing Apex OS memory store after persistence succeeds, and auto-discovers the local Python faster-whisper/CTranslate2 CUDA stack through the Apex wrapper script before falling back to Windows SAPI for STT. Current local STT target is `faster-whisper CUDA` with model `small.en`, processor `gpu`. Current local TTS target is `kokoro-js` with Kokoro ONNX model `onnx-community/Kokoro-82M-v1.0-ONNX`, dtype `q8`, processor `cpu/onnx`, and default locked voice `am_michael`. Windows SAPI is emergency TTS fallback only.

2026-06-07 voice update: Voicebox Provider v0 exists but is no longer the preferred daily spoken-output lane. Apex Lightweight Voice Core v4 is the normal voice lane: `Kokoro ONNX` is the locked identity target, Piper is the practical fallback if Kokoro cannot generate, and Windows SAPI is the emergency fallback. Voicebox is premium optional, never default. John can audition male Kokoro voices and lock one by safe local config without writing `.env`; optional env overrides are available for provider, model id, voice id, dtype, and processor.

Personal OS Core v0 should happen before full provider wiring so Apex can answer: "Am I Apex HQ or your personal Apex?", "What skills do you have?", "What agents work under you?", "Can you hear me?", and "Why can't you talk?" without pretending planned control paths are live.

Voice architecture:

- Keep local llama.cpp/GPT-OSS as the primary conversation brain when the sidecar/model is ready.
- Add a local STT adapter for microphone audio.
- Add a local TTS adapter for spoken answers.
- Add provider health/status so Apex can say whether local voice is ready.
- Keep manual transcript fallback if local STT is offline.
- Keep browser speech fallback only as a fallback, not the target.

Recommended local STT path:

- Primary: `whisper.cpp` local server/CLI adapter.
- Model target for tonight: small/base or medium depending latency.
- Later quality target: larger Whisper model if latency is acceptable.

Recommended local TTS path:

- Preferred daily target: lightweight Kokoro ONNX local TTS using the single locked Apex male voice John selects.
- Default voice: `am_michael`, with safe male auditions for `am_adam`, `am_michael`, `am_echo`, `am_eric`, `am_fenrir`, `am_liam`, `am_onyx`, `bm_daniel`, `bm_george`, and `bm_lewis`.
- Optional config override: `APEX_LIGHTWEIGHT_VOICE_PROVIDER=kokoro-onnx`, `APEX_LIGHTWEIGHT_VOICE_NAME=<voice-id>`, `APEX_LIGHTWEIGHT_VOICE_MODEL_ID=onnx-community/Kokoro-82M-v1.0-ONNX`, `APEX_LIGHTWEIGHT_VOICE_DTYPE=q8`, and `APEX_LIGHTWEIGHT_VOICE_PROCESSOR=cpu/onnx`.
- Practical fallback: Piper local TTS if Kokoro setup blocks the night.
- Emergency fallback: Windows SAPI, clearly labeled as temporary fallback so John knows it is not the locked Apex lightweight voice.
- Optional premium/test mode: Voicebox Apex profile only when John explicitly requests premium voice and resource guard says it is acceptable.
- Apex should support provider abstraction so Kokoro/Piper/Windows SAPI/Voicebox premium can be swapped without changing Apex Home.

Voice quality requirements:

- warm, steady Apex voice
- low latency for short answers
- no robotic wall-of-text reading
- sentence chunking for faster first audio
- stop/cancel speech control
- no audio stored by default
- no OpenAI audio calls in everyday local mode

Validation:

- local STT health test
- local TTS health test
- transcribe a short test phrase
- speak a short Apex answer
- stop/cancel speech
- fallback behavior when local STT/TTS is offline
- desktop/mobile visual voice QA

### Phase 3: Desktop Control Bridge v0

Goal: Apex can begin operating John's computer through an explicit visible local session.

Build only after Phase 1 and Phase 2 are usable.

First capabilities:

- visible desktop session status
- read current active window title/app label
- take an explicit operator-started screenshot only when John asks
- summarize what Apex sees
- no hidden capture
- no background surveillance
- no click/type in v0 unless John starts a separate control phase

Later:

- click/type/open apps through exact local action previews
- browser page control
- second screen placement
- app-specific controls

### Phase 4: Apex Builder Autonomy v0

Goal: John can say "Apex, work on the app" and Apex can use existing Builder/Self-Fix paths without reporting before low-risk local fixes.

Build:

- route local app bugs to Self-Fix v2/Builder
- allow exact controlled local fixes when classified low-risk and reversible
- run focused validation automatically after Apex-owned local fixes
- report "Fixed" first when validation passes
- save a compact learning receipt

Do not:

- allow broad arbitrary patches yet
- run git push/commit by default
- deploy
- touch schema/auth/session/production/customer-visible behavior

### Phase 5: Daily / Overnight Operator v0

Goal: Apex can do private local preparation while John is away.

Build after local launch, voice, and builder autonomy are stable.

Allowed first overnight work:

- summarize local Apex state
- prepare tomorrow plan
- check local health
- check active builder tasks
- organize private tasks/reminders
- draft internal plans

Blocked first:

- sending messages
- spending/ordering/booking
- deploying
- production mutation
- customer-visible changes
- hidden screen capture

## Tonight Recommendation

Do Phase 1 first. Without the launcher/runtime, John cannot reliably test anything.

If Phase 1 lands quickly, start Phase 2 with local voice provider plumbing and choose the TTS provider by fastest working lightweight proof:

1. Kokoro ONNX local voice using John's locked Apex lightweight voice id.
2. Piper if Kokoro setup blocks the night.
3. Windows SAPI as emergency local fallback, clearly labeled.
4. Voicebox Apex profile only for explicit premium/test mode, never default.
5. Browser/manual fallback only when server-side local voice cannot run.

Do not start Desktop Control Bridge until Apex can be opened and tested locally.

## Exact Next Builder Prompt

Implement Apex Local Operator Runtime v0.

Goal:
Make Apex usable locally tonight. John should be able to start Apex from one Windows-friendly command, have the local server come up, have Apex open to the clean Talk-To-Apex home, and see/hear whether local intelligence is ready.

Current state:
Do not rebuild local provider routing. llama.cpp GPT-OSS is already the primary local talking and normal coding path, while Ollama remains legacy fallback/status and manual model inventory support. Do not rebuild Self-Fix v0/v1/v2. Do not turn `/apex` back into a dashboard.

Build:
- one Windows local launcher command/script
- healthy existing-server reuse if port is already running
- `/api/ready` check
- local llama.cpp provider check
- legacy Ollama provider/status check
- explicit status for GPT-OSS sidecar/model readiness and installed local model inventory
- auto-open `/apex` or `/apex-control-room`
- compact Apex local readiness receipt/status
- Apex conversational command: "Apex, are you ready locally?"
- Apex conversational command: "Apex, what do you need to work tonight?"
- no OpenAI requirement for normal Apex OS use

Do not:
- edit production/deploy/schema/auth/session
- add browser/desktop control
- add external sends/spend/orders/bookings
- add customer-visible behavior
- expose Apex OS to field/customer/demo users
- rebuild Apex Home, local provider routing, or Self-Fix

Validation:
- focused tests for launcher/readiness helpers
- existing Apex Home/Self-Fix/Builder tests
- local provider tests
- role/permission tests
- `npm.cmd run build`
- `git diff --check`
- local browser evidence showing Apex opened and local readiness is visible/conversational

Report:
- files changed
- exact start command John should run
- what Apex can now test locally
- local model status behavior
- what remains for Local Voice Runtime v0
- validation results
- rollback path

## Exact Voice Builder Prompt After Runtime v0

Implement Apex Local Voice Runtime v0.

Goal:
Make Apex hear John and speak back locally without OpenAI audio.

Current state:
Local llama.cpp/GPT-OSS is already the primary local conversation brain when the sidecar/model is ready. The missing part in this older prompt was local microphone transcription and local spoken output. Keep Apex Home clean and conversational.

Build:
- local STT provider adapter
- local TTS provider adapter
- provider status endpoint or existing local-provider status extension
- no audio stored by default
- no OpenAI audio calls in everyday local mode
- short-answer sentence chunking for faster voice response
- stop/cancel speech behavior
- manual transcript fallback when STT is offline
- conversational status: "Apex, is local voice ready?"

Provider direction:
- Try Kokoro local TTS first if it can run cleanly and sound good.
- Use Piper as the practical fallback if Kokoro setup blocks the night.
- Use whisper.cpp or another local Whisper adapter for STT.

Validation:
- local STT health check
- local TTS health check
- short transcript test
- short speech test
- fallback/offline test
- no OpenAI audio call test
- desktop/mobile Apex voice QA
- `npm.cmd run build`
- `git diff --check`

Report:
- voice provider chosen
- how to start the voice provider
- what John can say to test it
- what Apex says when STT/TTS is offline
- validation results
- rollback path
