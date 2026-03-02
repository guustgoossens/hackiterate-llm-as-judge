# Judge Report: 21_DnD

**Track:** Track 1 "Anything Goes" (AWS)
**Repository:** https://github.com/Matthieu-Andre/21_DnD

## Summary

21_DnD is an adaptive real-time music soundtrack engine for tabletop RPG (D&D) sessions. It listens to the table via a browser microphone, transcribes speech using Mistral's Voxtral model, classifies the narrative mood using a Strands-based Mistral agent, generates live music via Google's Lyria Realtime API, and streams that music back to the browser over WebSocket — all in one continuous pipeline. The project is ambitious, technically complete, and clearly demonstrates the result of sustained architectural thinking across the hackathon period.

## Scores

| Criterion | Score (/25) | Justification |
|-----------|-------------|---------------|
| Technicity | 22 | The system integrates Mistral Voxtral (speech-to-text), a Strands agent with structured output for mood classification, a Mistral-driven music prompt planner, Google Lyria Realtime for AI music generation, ElevenLabs for "musical DNA" palette enrichment, and a WebSocket-based audio streaming pipeline. The async architecture in `api_server.py` is well-designed: version-guarded classification loops, crossfade interpolation in `lyria_service.py`, and a fan-out audio broadcast to multiple WebSocket listeners. Code quality is high throughout — proper use of dataclasses, Pydantic models, thread-safe locks, and typed Python. Minor deduction for the absence of tests and the unused-dev folder indicating some features were explored but not fully integrated. |
| Creativity | 21 | The core concept — AI that listens to a D&D table and adaptively scores the scene in real time without any manual input from players — is genuinely novel and charming. The three-stage pipeline (speech → mood → music prompt → live music generation) and the use of ElevenLabs metadata (composition plan and genre tags) as a weighted prompt palette for Lyria, rather than using ElevenLabs audio itself, is an unexpectedly clever hack. The developer mode with curated weighted prompt palettes per scene type ("peaceful_village", "combat", "puzzle", etc.) shows creative domain thinking. The waveform visualizer that reacts to mic audio and changes color by mood adds a strong visual layer. |
| Usefulness | 20 | This solves a real and recognizable problem for tabletop gamers: ambient music that matches the scene is valuable, but manually curating playlists or prompting music mid-session is disruptive. The system handles the automation end-to-end. The configurable mood taxonomy, language hint, chunk seconds, and music mode settings make it adaptable to different groups and campaigns. The main limitation is the dependency chain (Mistral API key, Google API key, optionally ElevenLabs key), which raises the barrier to use. There is also no README, which would be needed for real-world adoption. |
| Track Alignment | 20 | The project is solidly Track 1 "Anything Goes": it is ambitious, it is creative, and Mistral is central at multiple stages — Voxtral for transcription (`voxtral-mini-latest`), `mistral-small-latest` for mood classification via the Strands agent, `mistral-small-latest` for music prompt planning, and `open-mistral-7b` for scene mapping in the developer palette mode. The project is not fine-tuning (Track 2) and not on-device (Track 3). Mistral is not merely a thin wrapper; the mood classification uses Strands tool-calling with structured output, which is a real integration. |

**Total: 83/100**

## Strengths

- End-to-end working pipeline: browser mic capture → Voxtral transcription → Strands mood agent → Mistral music prompt planner → Lyria Realtime music generation → WebSocket audio stream back to browser.
- Multiple Mistral models used meaningfully at different stages of the pipeline, not just as a single chatbot call.
- The `lyria_service.py` crossfade implementation (`interpolate_palettes` + `_crossfade_to_palette`) is genuinely sophisticated — it interpolates weighted prompt dictionaries over configurable steps to create smooth musical transitions.
- The Strands mood classifier (`mood_agent.py`) is carefully designed: it tries tool-calling first and falls back to an inline agent if structured output fails, with specific exception handling for `MaxTokensReachedException`.
- The `music_prompt_agent.py` planner makes a well-reasoned decision about when to update the music — only on mood changes, after a minimum number of new utterances, or after a cooldown — avoiding thrashing.
- The ElevenLabs "DNA" mode is a creative hack: using ElevenLabs `compose_detailed()` exclusively for its JSON metadata (composition plan, genres, styles) rather than its audio output, then feeding that structured data as weighted prompts into Lyria.
- The frontend `app.js` implements a full PCM audio player from scratch using `ScriptProcessorNode` with underrun protection, buffer management, and WebSocket-based chunk streaming — no audio library dependency.
- The `unused-dev/` folder and the two planning documents (`lyria-integration-plan.md`, `strands_integration_plan.md`) reveal a disciplined phased development process: they wrote the architecture plan and then executed it.
- The SVG waveform visualizer in `app.js` uses a custom quadratic Bézier closed-path renderer with per-sample displacement history and mood-scaled displacement amplitude — a polished detail.
- Mood-driven CSS theming: each mood label (default, tense, action, boss, mystery, victory) has its own CSS custom property overrides that change the ring color and background gradient.

## Areas for Improvement

- There is no README in the repository root. A first-time user has no idea how to install dependencies, configure API keys, or run the server.
- No tests of any kind are present. Given the async complexity of the session manager and music loop, even basic smoke tests would increase confidence.
- The Google Lyria API is still experimental (`models/lyria-realtime-exp`, `api_version: "v1alpha"`), making the project dependent on a very early-access service that may not be reproducible by judges without special access.
- The `lyria_eleven_child.py` file (the original CLI prototype) is still committed alongside the refactored `lyria_service.py`. The `unused-dev/` folder contains several files (`live_asr_sse.py`, `original_stt.py`, `other_stt.py`, etc.) indicating significant exploration that was not cleaned up.
- Session management only allows one active session at a time, which is by design but should be noted as a limitation for multi-table deployments.
- The frontend uses `ScriptProcessorNode`, which is deprecated in favor of `AudioWorkletNode`. The code comments acknowledge this but do not address it.
- Mood classification fires on every new utterance with no minimum word count threshold — a very short transcript fragment ("Uh") could trigger an unnecessary LLM call.
- There is no reconnection logic for the Lyria WebSocket if it drops during a session; the error is logged and the music silently stops.
- The `circle-lab.html` file in `web/` appears to be an unused experiment that was committed but not linked from the main UI.

## Detailed Reasoning

**Architecture and Technical Execution**

The project demonstrates an unusually coherent full-stack architecture for a hackathon entry. The core loop is well-modeled: `BrowserConversationSession` in `api_server.py` manages the state machine for a live session, with version-gated async tasks for mood classification (`_run_classification_loop`) and music steering (`_run_music_loop`). The version guard pattern — comparing `_applied_version` against `_requested_version` before running a classification — prevents stale results from overwriting newer state, a non-trivial correctness concern in an async pipeline. The `asyncio.to_thread` calls are used correctly to keep CPU-bound LLM API calls off the event loop.

**Mistral Integration Depth**

Mistral is used at three distinct pipeline stages. First, Voxtral (`voxtral-mini-latest`) handles speech-to-text transcription of uploaded browser audio chunks via `client.audio.transcriptions.complete`. Second, `mistral-small-latest` drives the Strands mood classifier in `mood_agent.py`, where the agent is given two tools (`get_current_scene`, `get_allowed_moods`) and asked to return structured output of type `MoodClassification`. Third, `mistral-small-latest` again drives the `MusicPromptPlanner` in `music_prompt_agent.py`, which synthesizes recent utterances and the current mood into a short vivid music steering description returned as strict JSON. A fourth lightweight use of `open-mistral-7b` appears in `lyria_service.py`'s `dev_to_palette()` function, which maps free-form descriptions to one of six preset Lyria prompt palettes. This is not superficial API usage — the Strands integration in particular shows understanding of tool-calling and structured output patterns.

**The ElevenLabs Palette Trick**

One of the most creative technical decisions in the project is the "eleven" music mode in `lyria_service.py`. Instead of generating music with ElevenLabs and playing it, the code calls `client.music.compose_detailed()` only to extract its `composition_plan` JSON metadata — `positive_global_styles`, `positive_local_styles`, `genres`, and a short description — and discards the audio entirely. These style strings are then assembled into a weighted prompt dictionary (global styles at weight 1.2, local section styles at 0.9, genres at 1.0, description fragments at 0.6) and sent to Google Lyria as `WeightedPrompt` objects. This exploits ElevenLabs' music intelligence as a free enrichment layer while using Lyria for the actual audio generation. The original prototype in `lyria_eleven_child.py` documents that this approach was developed early and specifically chosen for speed (the multipart response sends JSON before audio, so the connection can be closed immediately after the metadata arrives).

**Frontend Engineering**

The `app.js` file is 1095 lines of vanilla JavaScript with no framework dependencies. It implements a complete PCM audio playback pipeline using `ScriptProcessorNode`, with buffer management that drops oldest chunks when the buffer exceeds 10 seconds of audio. The mic capture path uses `onaudioprocess` to accumulate Float32 samples, merges them, and WAV-encodes them in-browser (a manual RIFF header implementation starting at line 616) before uploading to the API. The SVG waveform visualizer uses a 720-point circular displacement history with decay, Gaussian smoothing over 5 neighboring samples, and quadratic Bézier closed-path construction — all implemented from scratch. This is not boilerplate code.

**Code Quality and Planning**

The two planning documents in `docs/` and `unused-dev/` are evidence of structured thinking before coding. The `lyria-integration-plan.md` lays out a four-phase delivery sequence and explicitly lists risks (Railway long-lived connections, browser autoplay restrictions, prompt stability). The final code follows this plan closely: `LiveMusicSession` in `lyria_service.py` maps almost exactly to the proposed `LiveMusicSession` interface in the plan. This suggests the team understood the problem well before writing production code, which is reflected in the overall coherence of the architecture.

## Special Challenge Eligibility

The project makes meaningful and non-trivial use of the Mistral API at multiple pipeline stages (Voxtral STT, Strands mood classification with structured output, music prompt generation, and scene mapping). It uses `voxtral-mini-latest`, `mistral-small-latest`, and `open-mistral-7b`. This may qualify for any Mistral-specific challenge rewards related to creative multi-model API usage. No specific fine-tuning or on-device deployment is present, so Track 2 and Track 3 special awards do not apply.
