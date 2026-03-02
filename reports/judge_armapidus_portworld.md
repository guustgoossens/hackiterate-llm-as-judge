# Judge Report: PortWorld

**Track:** Track 1 — Anything Goes / AWS
**Repository:** https://github.com/armapidus/PortWorld

## Summary

PortWorld is an open-source platform that connects AI services to smart glasses (Meta Ray-Ban Gen 2) via a dual-component architecture: a native iOS Swift client and a Python FastAPI backend. The system creates a hands-free, voice-and-vision AI assistant pipeline that captures audio and video from smart glasses, processes them through Voxtral (STT), NVIDIA Nemotron (video understanding), and Mistral LLMs, then streams TTS audio responses back to the glasses via ElevenLabs. The project is notably complete and production-minded, targeting practical use cases like field technicians and plumbers.

## Scores

| Criterion | Score (/25) | Justification |
|-----------|-------------|---------------|
| Technicity | 20 | The project demonstrates genuine technical depth across two codebases: a full SwiftUI MVVM iOS client with AVAudioEngine playback, SFSpeechRecognizer wake-word detection, rolling H.264 video buffers, WebSocket session management with reconnect loops, and a Python FastAPI backend implementing real-time LLM token streaming piped to ElevenLabs via WebSocket relay. The `AssistantPlaybackEngine.swift` alone (676 lines) handles stuck-playback detection, backpressure management, route-change recovery, and audio graph reconnection with a level of care rarely seen in hackathon code. The `mistral.py` provider implements both streaming and non-streaming paths with an ambitious `strands` driver abstraction with multi-variant fallback. Tests exist for both Swift components (WSMessageCodecTests, QueryEndpointDetectorTests, EventLoggerTests, ManualWakeWordEngineTests). |
| Creativity | 17 | The core idea — connecting commodity smart glasses to a composable multi-modal AI backend via an open-source framework that anyone can plug into — is a genuinely interesting product angle. The "Port:World" framing as a universal adapter between real-world wearables and AI services is creative. The live LLM-token-to-TTS relay pipeline (`/v1/pipeline/tts-stream`) streaming tokens directly into the ElevenLabs WebSocket for near-zero-latency audio is a clever streaming architecture. However, the individual components (STT, vision analysis, LLM response, TTS) are relatively standard integrations; the creativity lies in the end-to-end assembly for a specific hardware platform rather than a novel AI technique. |
| Usefulness | 21 | This is a highly practical project. The plumber/field technician use case is concrete and well-motivated: hands-free AI assistance when you cannot look at a phone is a real problem. The backend is designed as an open framework that third parties can fork and customize with their own agent presets (`porto.field-tech`, `porto.tour-guide`, `porto.accessibility`, `porto.sales-agent`), own tools/skills, and own MCP servers. The quickstart is real (5-minute setup is credible given the clean `.env.example` and documented curl smoke tests). The framework's plugin system for custom agents and tools means it solves for a class of use cases, not just the demo. |
| Track Alignment | 16 | The project clearly targets Track 1 ("Anything Goes"), which is the most permissive track. It does make substantial use of Mistral APIs: Voxtral for STT (`voxtral-mini-latest` as default in `settings.py`), Mistral LLMs as the main text generation endpoint (defaulting to `mistral-large-latest`), and the framework is Mistral-first by default. However, it also prominently integrates NVIDIA Nemotron for video understanding, ElevenLabs for TTS, and the Meta Wearables DAT SDK — making Mistral one of several key providers rather than the central focus. There is no fine-tuning (Track 2) or on-device NVIDIA deployment (Track 3). The NVIDIA BREV deployment support (`EDGE_API_KEY`) hints at awareness of Track 3 but it is not the primary architecture. |

**Total: 74/100**

## Strengths

- The end-to-end pipeline is genuinely complete: from audio capture via Bluetooth HFP through STT, video summarization, LLM response, and TTS audio streaming back to the glasses speaker — all implemented, not just described.
- The `AssistantPlaybackEngine.swift` is exceptionally well-engineered for a hackathon. It handles stuck-playback detection with a consecutive-check counter, graceful reconnection after route changes, backpressure signaling, and correct buffer accounting across async callbacks — work that typically only emerges from production experience with AVAudio.
- The streaming architecture in `elevenlabs.py` uses a concurrent `send_loop`/`receive_loop` task pair over a WebSocket, with a bounded asyncio queue (maxsize=48) and proper generator-based async streaming — this is non-trivial and correct.
- The plugin and agent preset system (`catalog.py`, `tools/registry.py`) is thoughtfully designed: agents can be added via external Python modules, tools can be registered at runtime, and the priority chain for system prompts and API keys is clean and documented.
- The project includes four XCTest suites covering WebSocket codec round-trips, VAD query endpoint lifecycle, event logger behavior, and wake-word engine semantics — a level of test coverage that is rare in hackathon submissions and demonstrates professional intent.
- Documentation is thorough: a detailed PRD with functional requirements (`FR-01` through `FR-13`) and non-functional requirements (`NFR-01` through `NFR-09`), an implementation status checklist, and architecture diagrams.
- The vision frame uploader sends continuous 1 FPS JPEG frames to the backend as base64 JSON, enabling the backend to maintain rolling scene understanding independent of explicit query events.
- The `SessionOrchestrator.swift` (664 lines) is a clean state machine coordinating wake detection, VAD, rolling video/audio buffers, WebSocket transport, and health telemetry within a single `@MainActor`-isolated class.

## Areas for Improvement

- The backend `/vision/frame` endpoint in `pipeline.py` currently just acknowledges receipt and logs debug output — the frames are not actually processed or correlated with query bundles on the backend side. This is a visible gap between the iOS implementation and the backend capability.
- The Mistral integration is correct but not deep: the main LLM is called via a generic OpenAI-compatible HTTP client (`_call_chat_non_stream` in `mistral.py`), which means any OpenAI-compatible provider works equally well. There is no use of Mistral-specific features like function calling, tool use, or the Mistral agents API.
- The `strands` driver integration (`_iter_main_llm_tokens_with_strands_driver`) attempts compatibility through an exhaustive list of method-name guesses across multiple constructor variants — this is a fragile pattern that signals uncertainty about the target library's API surface.
- The rolling video buffer memory boundedness noted as an open item in `PRD.md` (`NFR-09`): the `RollingVideoBuffer` maxes out at `max(preWakeVideoMs * 6, 30_000)` ms, but the proof under repeated wake/query soak (`T11`, `T13`) is explicitly listed as not yet done.
- The tracing integration with W&B Weave (`weave_backend.py`) is minimal — it attempts to call `weave.attributes()` or `weave.log()` in a fire-and-forget try/except with no structured span hierarchy, making it a thin logger rather than true experiment tracing.
- The builtin tools (`echo_context`, `detect_intent` in `builtin.py`) are very lightweight stubs — `detect_intent` is a regex keyword matcher. Real tool use (e.g., web search, calendar, device-specific APIs) is scaffolded but not implemented.
- No authentication on the vision frame or query endpoints beyond an optional `EDGE_API_KEY` header check, which means the backend is effectively open if exposed to a network.

## Detailed Reasoning

**Architecture and Completeness**

PortWorld is one of the most architecturally complete projects likely to be seen in this hackathon. The repository contains a native iOS application and a Python backend that implement a real, working end-to-end pipeline — not a prototype stub. The iOS client, housed in `IOS/PortWorld/`, implements the full capture stack: the `AudioCollectionManager.swift` handles Bluetooth HFP audio routing and WAV chunk persistence; `RollingVideoBuffer.swift` maintains an H.264 ring buffer; `VisionFrameUploader.swift` handles continuous 1 FPS JPEG upload; `QueryBundleBuilder.swift` packages audio+video into multipart/form-data for upload; and `SessionWebSocketClient.swift` manages the control-plane connection with exponential backoff reconnect. The backend (`framework/`) implements the matching API surface with `FastAPI`, structured around a `RuntimeProfile` that resolves provider credentials, model selections, agent presets, and tool lists from a layered override system (runtime config > HTTP headers > environment variables).

**Mistral Integration**

The Mistral integration is genuine. Voxtral (`voxtral-mini-latest`) is the default STT provider, configured in `settings.py` and called in `voxtral.py` via Mistral's audio transcriptions endpoint. The main LLM defaults to `mistral-large-latest` and is called via the OpenAI-compatible chat completions API in `mistral.py`. The streaming path (`iter_main_llm_tokens`) correctly implements SSE parsing — reading `data:` lines, skipping `[DONE]` sentinels, and extracting `choices[0].delta.content` tokens. The live TTS relay (`/v1/pipeline/tts-stream`) then pipes these tokens through a pair of concurrent asyncio tasks into the ElevenLabs WebSocket streaming API, with a `_chunk_tts_buffer` helper that word-wraps at 80 characters to avoid sending partial words. This live relay with the `X-TTS-Relay-Mode: llm-token-live` response header is a clean and correct streaming design. The limitation is that Mistral is treated as one of several interchangeable providers behind an OpenAI-compatible interface, and no Mistral-specific API capabilities are leveraged.

**iOS Engineering Quality**

The `AssistantPlaybackEngine.swift` deserves specific mention as exceptional work. It manages an `AVAudioPlayerNode` on a shared `AVAudioEngine` (shared with `AudioCollectionManager` for Bluetooth HFP compatibility), with explicit handling for: engine not running at chunk arrival time (delayed start), player node disconnected from output graph after route changes (reconnection with `outputConnectionPoints` check), stuck playback detection (buffers scheduled but drain callback never firing, with a three-consecutive-check threshold before recovery), backpressure (high-water mark at 1500ms, maximum at 3000ms, deliberately not dropping chunks to avoid Bluetooth HFP truncation), and interruption recovery. The comment explaining why `stop()` is avoided in `startResponse()` — to prevent a route-change notification cycle that would discard the first scheduled buffer and inflate `pendingBufferCount` — reflects deep operational experience with AVAudio's lifecycle. This is not AI-generated boilerplate.

**Testing**

The test suite in `IOS/PortWorldTests/` covers four components: `WSMessageCodecTests.swift` tests 15+ encode/decode round-trips of every WebSocket message type; `QueryEndpointDetectorTests.swift` tests the VAD lifecycle including speech-activity-delayed timeout, double-begin-query idempotency, and force-end semantics; `EventLoggerTests.swift` and `ManualWakeWordEngineTests.swift` cover the remaining runtime components. This is significantly above the hackathon baseline and indicates the team treated the iOS code as production-quality software.

**Remaining Gaps**

The backend vision frame processing is a notable gap: `pipeline.py`'s `/vision/frame` handler (`vision_frame`) simply logs receipt and returns `{"status": "ok"}`. While the iOS side correctly sends frames at 1 FPS with base64 JPEG payloads, the backend does not accumulate, analyze, or correlate them with query bundles. The NVIDIA Nemotron video analysis path in `nvidia.py` operates on uploaded video files from query bundles, not on the streaming frames — so the "continuous visual context" claim is partially aspirational. The agent preset system is well-designed but the tools are stubs; a production deployment would require real tool implementations to make the field-tech use case genuinely useful.

## Special Challenge Eligibility

None identified. The project uses Mistral models (Voxtral, mistral-large-latest) as primary providers but does not specifically target fine-tuning (Track 2) or NVIDIA on-device deployment (Track 3). The NVIDIA BREV endpoint support is present but framed as an optional cloud deployment option rather than the core architecture.
