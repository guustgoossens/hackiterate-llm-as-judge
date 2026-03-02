# Judge Report: hackathon-mistral-2 (Coexist)

**Track:** Track 1 — "Anything Goes" (AWS)
**Repository:** https://github.com/yonsy7/hackathon-mistral-2

## Summary

Coexist is a voice-controlled app builder that captures the user's spoken idea, transcribes it in real time using Mistral's Voxtral realtime API, routes it through an orchestrator agent that converts it into a spec, and then invokes the Mistral Vibe CLI to generate and run the actual app — responding back to the user via ElevenLabs TTS. The system spans five concurrent services (Swift audio capture, Python voice server, Node.js orchestrator, SSE bridge, and React dashboard) stitched together by a single `start.sh` script. It is an impressively ambitious multi-layer pipeline for a 24-hour hackathon, though the tight coupling to macOS-specific tooling (ScreenCaptureKit, BlackHole) limits its portability.

## Scores

| Criterion | Score (/25) | Justification |
|-----------|-------------|---------------|
| Technicity | 20 | Five integrated components across three languages (Swift, Python, TypeScript) with a custom binary framing protocol, real-time WebSocket transcription, async reconnect logic, audio resampling (48kHz stereo Float32 → 16kHz mono s16le via soxr), and a non-blocking fire-and-forget orchestrator pattern. The fuzzy wake-word matching using `SequenceMatcher` and the ScreenCaptureKit-based audio tap are both non-trivial. The main weak point is that the orchestrator file is named `index-working.ts` (implying an iterative, slightly unpolished state) and conversation state is a mutable global `messages` array. |
| Creativity | 19 | The combination of voice-triggered app generation — speak an idea, watch it build itself — is a genuinely novel demo experience. Routing the TTS response through BlackHole back into what is framed as "Ray-Ban Glasses View" adds a quirky AR-adjacent narrative. Using Mistral's Voxtral realtime stream both for transcription and a separate cleanup pass (filler-word removal via `open-mistral-nemo`) on top of wake-word detection is an elegant layered design. The concept of hands-free vibe-coding is memorable, though the browser call audio capture angle (Instagram/Messenger) feels tacked on and disconnected from the main demo flow. |
| Usefulness | 16 | The rapid voice-to-prototype pipeline has genuine appeal for developers or designers who want to ideate quickly without touching a keyboard. However, the setup requirements are heavy (BlackHole virtual mic, PortAudio, Swift toolchain, Mistral Vibe CLI, Python 3.13 venv) and the system is strictly macOS-only. The generated apps are minimal Vite+React statics with no persistence, which limits the depth of what can actually be produced. For a hackathon demo context the usefulness is clear; for real-world daily use the friction is high. |
| Track Alignment | 17 | The project is squarely Track 1 ("Anything Goes") — it uses the Mistral API (Voxtral realtime transcription, chat completion for cleanup, and Mistral Small via the AI SDK for orchestration) and, according to the README, supports an AWS Bedrock path via `BEDROCK_API_KEY` with the `mistral.devstral-2-123b` model configured in the orchestrator. The Bedrock integration is real and code-complete. However, neither AWS-specific services (S3, Lambda, EC2) nor the Mistral open-source model stack is used beyond the Bedrock API adapter, so the "AWS track" angle is thin. |

**Total: 72/100**

## Strengths

- **Multi-language, multi-process architecture executed coherently**: Swift (ScreenCaptureKit), Python (FastAPI + asyncio), and TypeScript (Express + AI SDK) components communicate cleanly over HTTP and stdout pipes.
- **Custom binary framing protocol** (`Protocol.swift`): Type + 4-byte LE length + payload is well-designed and precisely mirrored in `client.py`'s `read_exactly` and frame-dispatch loop.
- **Robust audio resampling**: `AudioResampler` uses `soxr.ResampleStream` for streaming high-quality conversion from 48kHz stereo Float32 to 16kHz mono s16le, exactly what the Mistral Voxtral API expects.
- **Async reconnect with exponential backoff** (`TranscriptionBridge._transcribe_with_reconnect`): graceful handling of WebSocket disconnections is production-quality thinking for a hackathon.
- **Wake-word detection with fuzzy matching**: both exact substring and `SequenceMatcher`-based sliding-window fuzzy matching, making the wake phrase tolerant of transcription noise.
- **Fire-and-forget orchestration**: the Vibe CLI is launched non-blocking, the HTTP response returns immediately, and intermediate TTS updates ("Writing some code", "Running some commands") are streamed back to the user while the build runs.
- **AWS Bedrock dual-provider support**: clean fallback logic between Mistral direct API and Bedrock, with `mistral.devstral-2-123b` mapped via `@ai-sdk/amazon-bedrock`.
- **Single `start.sh` entrypoint**: builds the Swift binary, creates the Python venv, installs dashboard deps, and starts all five services with proper PID tracking and `trap cleanup EXIT INT TERM`.

## Areas for Improvement

- **macOS-only with heavy external dependencies**: BlackHole, PortAudio, ScreenCaptureKit, and the Swift toolchain make this unrunnable on Linux or Windows without significant work. A Docker path or fallback microphone input would broaden accessibility.
- **Global mutable state in orchestrator**: `let messages: any[]` at module scope means concurrent requests to `/generate` will corrupt each other's conversation history. A session-per-request or at minimum a mutex is needed.
- **`index-working.ts` filename**: suggests this is a working draft rather than a finished artifact; a cleaner production entry point would improve confidence.
- **No error handling on SSE client disconnect in `index-working.ts`**: the `/updates` endpoint adds `vibeEvents` listeners but never removes them on client disconnect, which will accumulate listeners over time.
- **ElevenLabs for TTS rather than a Mistral-native voice**: introducing a third-party TTS API means an additional paid key and dependency; a Mistral-only solution would be more aligned with the hackathon spirit.
- **Dashboard "Ray-Ban Glasses View" label**: the label in `AppPreview.tsx` references glasses hardware that isn't actually used; the label is misleading for evaluators.
- **No tests**: not a blocker for a hackathon, but even a smoke test for the wake-word state machine would increase confidence.
- **`start.sh` hardcodes `python3.13`**: users with Python 3.12 (the stated minimum) will fail on step 2; this should use `python3` or the configured minimum.

## Detailed Reasoning

**Architecture and Inter-Service Communication**

The system design is one of the more sophisticated in the hackathon cohort. The pipeline is: macOS ScreenCaptureKit (Swift) → binary-framed stdout → Python `client.py` → `AudioResampler` + `WakeWordDetector` + `TranscriptionBridge` → Mistral Voxtral WebSocket → command extracted → HTTP POST to orchestrator → Mistral agent generates spec → Mistral Vibe CLI builds the app → TTS via ElevenLabs → BlackHole virtual mic AND base64 MP3 via HTTP POST to SSE server → browser dashboard plays audio.

The binary framing protocol defined in `Protocol.swift` and consumed in `client.py` is well-implemented: `[1 byte type][4 bytes LE length][N bytes payload]` maps cleanly to `struct.unpack("<I", header[1:5])` on the Python side. This is the kind of detail that shows the team understood the boundary between the Swift process and Python process and designed it deliberately.

**Mistral Integration Depth**

Three distinct Mistral capabilities are used:
1. `voxtral-mini-transcribe-realtime-2602` via `client.audio.realtime.transcribe_stream()` in `transcription.py` — streaming WebSocket transcription with `TranscriptionStreamTextDelta` / `TranscriptionStreamDone` event handling.
2. `open-mistral-nemo` via `client.chat.complete()` in `wake_word.py` `_clean_command()` — a fast LLM pass to strip filler words from the captured command before sending to the orchestrator.
3. `mistral-small-latest` (or `mistral.devstral-2-123b` on Bedrock) via the Vercel AI SDK's `ToolLoopAgent` in `index-working.ts` — the orchestrator agent that converts a raw voice command into a full Vibe spec and calls the `coding_agent` tool.

This is a genuine multi-model, multi-modal Mistral integration rather than a thin wrapper around a single chat endpoint.

**Wake Word and Command Capture**

`WakeWordDetector` in `wake_word.py` implements a clean state machine: `listening` → `capturing` → (command dispatched) → `listening`. The fuzzy-match fallback using `difflib.SequenceMatcher` with a configurable `FUZZY_THRESHOLD = 0.75` sliding over word windows is an elegant solution to the problem of transcription errors mangling the wake phrase. The `_start_capturing` logic that strips partial words left over from the wake phrase boundary (`last_wake_word.endswith(first_word)`) shows attention to real-world transcription edge cases.

**Orchestrator and Vibe Integration**

`vibe.ts` spawns the Mistral Vibe CLI as a child process with `--output streaming` and parses the JSON lines using regex (rather than a full JSON parser) to handle partial lines in the buffer. The `postProcess()` function replicates the behavior of `jq 'select(.role != "system" and .role != "user")'` inline, which is functional but brittle if the output format changes. The fire-and-forget pattern in `callCodingAgentTool` is smart: the HTTP response to the voice client is not blocked on the potentially multi-minute Vibe build, and intermediate state messages ("Writing some code", "Running some commands") are TTS'd back to the user progressively. The prompt injection (`CRITICAL INSTRUCTIONS — FOLLOW EXACTLY`) is heavy-handed but pragmatically effective for hackathon conditions.

**Dashboard**

The React dashboard (`App.tsx`, `useAudioWebSocket.ts`, `AppPreview.tsx`) is minimal but functional. It connects to the SSE server at `:5175/events`, receives base64-encoded MP3 data, decodes it via `atob`, and plays it through the Web Audio API with proper AudioContext unlock-on-click handling. The `AppPreview` component polls `localhost:5173` and iframes the generated app once it becomes available — a neat self-referential touch where the system shows the app it just built.

**Rough Edges**

The naming `index-working.ts` is a tell that this was iterated under pressure. The global `messages` array is a concurrency hazard. The `start.sh` step numbering repeats "[4/5]" and "[5/5]" for four different services (a minor cosmetic issue but indicative of rapid hacking). The "Ray-Ban Glasses View" label in the dashboard suggests an original concept involving wearable hardware display that was either cut or not implemented, leaving a dangling narrative thread.

## Special Challenge Eligibility

The project integrates AWS Bedrock via `@ai-sdk/amazon-bedrock` with the `mistral.devstral-2-123b` model as a first-class alternative provider. This makes it potentially eligible for Track 1 AWS special challenges if the hackathon has AWS-specific prizes. No fine-tuning (Track 2) or on-device deployment (Track 3) work is present. The use of Mistral Voxtral realtime transcription could qualify for any Mistral-specific API usage prizes if offered.
