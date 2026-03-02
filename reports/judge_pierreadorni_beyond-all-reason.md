# Judge Report: Beyond-All-Reason (AI Co-Commander)

**Track:** Track 1 — "Anything Goes" (AWS)
**Repository:** https://github.com/pierreadorni/Beyond-All-Reason

## Summary

This project integrates a Mistral-powered AI co-commander into Beyond All Reason (BAR), an open-source real-time strategy game built on the Spring/Recoil engine. The participant forked the game repository and built a full-stack LLM-agent pipeline: a Lua widget exposing an in-game HTTP server, a Python agent using Strands + Mistral that reads game state and issues unit commands, and voice I/O using Mistral's Voxtral real-time speech-to-text and ElevenLabs TTS. Players can direct the AI ally by typing `@agent` or `!` in game chat, or by speaking via a push-to-talk hotkey, and the AI responds in character and executes multi-step RTS commands.

## Scores

| Criterion | Score (/25) | Justification |
|-----------|-------------|---------------|
| Technicity | 22 | The project demonstrates genuine technical depth across multiple layers: a self-contained HTTP server implemented entirely in Lua using Spring's TCP sockets (`agent_bridge.lua`, 897 lines), a synced/unsynced gadget bridge for issuing authoritative game commands (`agent_bridge_relay.lua`, 527 lines), an async Python agent with a priority-work-queue, event-driven task continuations, unit reservation logic, and real-time audio streaming via Voxtral WebSockets. The TTS pipeline (ElevenLabs streaming PCM, looping SFX overlay, amplitude-driven portrait shake, sounddevice fallback for WSL) shows professional-grade engineering. Over 4,000 lines of net-new code were written across Lua and Python in under 24 hours. |
| Creativity | 21 | Turning a cooperative RTS AI companion into an LLM agent that listens to voice commands and responds in character as a military co-commander is an original and playful application. The "Mistral Commander" portrait with audio-amplitude-driven shake effect and radio crackle SFX creates a polished in-game persona that goes well beyond a plain chatbot. The IPC layer (flag files between Lua and Python for push-to-talk) and the event-driven `watch_unit` / `reserve_and_build` agentic loop for multi-step tasks show creative problem-solving in a constrained game environment. |
| Usefulness | 19 | The project solves a real and well-scoped problem: BAR's native AI cannot understand natural language intent or coordinate with human players conversationally. A voice-activated co-commander that can queue build orders, direct attacks, place map pings, and gift finished units to the player provides genuine gameplay value. The tool set is comprehensive (move, attack, fight, build, reclaim, repair, guard, rally, batch commands) and the system prompt is carefully tuned for RTS co-play. The score is slightly reduced because the project requires a full BAR installation and specific Spring engine config (`TCPAllowListen=1`), limiting accessibility for casual evaluation. |
| Track Alignment | 22 | This fits Track 1 squarely: it is an ambitious, creative, and impactful use of the Mistral API. Mistral is used in two distinct ways — `mistral-large-latest` via the Strands agents framework for the agentic reasoning loop, and `voxtral-mini-transcribe-realtime-2602` for real-time speech-to-text via the Mistral audio WebSocket API. Both integrations are substantive and central to the experience, not cosmetic. The ambition and polish of the overall system are well above the typical hackathon entry. |

**Total: 84/100**

## Strengths

- The Lua HTTP server (`agent_bridge.lua`) is entirely self-contained, implementing its own JSON encoder/decoder to work around Spring widget sandbox restrictions — a non-trivial engineering decision made correctly.
- The `agent_bridge_relay.lua` gadget uses the Spring engine's synced/unsynced message-passing architecture correctly, ensuring unit commands issued by the LLM are processed in the authoritative simulation tick.
- The `reserve_and_build` composite tool atomically reserves a unit, places a build order, and registers an idle-event watcher in one call, preventing the native AI from overriding in-flight LLM orders — a subtle and well-executed design.
- The TTS pipeline (`_speak` in `bar_agent.py`) streams PCM from ElevenLabs at 16 kHz, mixes a looping radio-crackle SFX in real time, and feeds per-chunk RMS amplitude back to the in-game portrait shader — a production-quality audio engine written from scratch for a hackathon.
- Voxtral real-time transcription (`voxtral-mini-transcribe-realtime-2602`) is integrated via a persistent WebSocket, kept warm between key presses to minimize latency — shows awareness of the Mistral API's real-time capabilities.
- The system prompt is thoughtfully designed for an RTS co-commander persona (military tone, map-ping usage, `owner='bot'` guardrails, multi-step task continuation instructions).
- The commit history shows steady, iterative development over the full 24-hour hackathon window, starting with `basic command using game chat` and ending with polished voice I/O and Mistral branding.

## Areas for Improvement

- The `SpeechToTextDaemon.py` file contains a hardcoded API key (`API_KEY = "ybeqehOv7gWxBX5mycJqUycR0U7Wfgdv"`), which is a security concern even though the merged `bar_agent.py` correctly reads from the environment variable.
- There is no README, demo video, or setup guide for the hackathon-specific components; evaluation requires significant domain knowledge of the BAR/Spring engine ecosystem.
- The `agent_bridge.lua` widget currently exposes its HTTP server on `0.0.0.0` (all interfaces) rather than `127.0.0.1`, which is a minor security risk on networks where other players could reach the host.
- The dependency on ElevenLabs for TTS introduces an external paid service; a fallback TTS using Mistral or an open-source model would make the project more self-contained.
- The project does not include integration tests or CI; the `tools/headless_testing/` infrastructure already present in the upstream BAR repo could have been leveraged.
- The `gui_tts_display.lua` source contains a deliberate filename typo (`aly_commander_2.png` instead of `ally_commander_2.png`) that is noted as intentional, which may cause the calm-pose portrait to fail silently on case-sensitive filesystems.

## Detailed Reasoning

**Architecture and Technical Depth.** The project is structured as a four-layer stack. At the bottom, the Spring/Recoil engine runs the game simulation. Above it, two Lua components sit in the game's widget/gadget system: `agent_bridge.lua` is a LuaUI widget that implements a raw HTTP/1.1 server using Spring's TCP socket API, exporting REST-style endpoints (`/state`, `/defs`, `/chat`, `/command`, `/events`, `/ping`, `/reserve`, `/watch`, `/gift`, `/buildsite`, `/buildqueue`). `agent_bridge_relay.lua` is a LuaRules gadget that bridges the unsynced widget to the synced game simulation via `Spring.SendLuaRulesMsg`/`SendToUnsynced`. Above those, the Python layer runs `bar_agent.py`, which uses the Strands agents framework with `MistralModel` to drive a 17-tool agentic loop. A separate asyncio-based STT coroutine connects to the Voxtral real-time WebSocket and feeds voice transcriptions directly into the agent's priority queue. The four layers communicate cleanly through well-defined interfaces (HTTP for Python-to-Lua, LuaRules messages for widget-to-gadget, IPC flag files for push-to-talk key events).

**Mistral Integration.** Mistral is used in two meaningful ways. The primary agent uses `mistral-large-latest` through the Strands framework (`from strands.models.mistral import MistralModel`), with a rich 17-tool interface covering the full RTS command space. The secondary integration uses `voxtral-mini-transcribe-realtime-2602` for real-time speech-to-text via `mistralai.extra.realtime` — a streaming WebSocket connection that keeps a warm session and yields `TranscriptionStreamTextDelta` events as the player speaks. Routing voice directly into the agent queue (bypassing in-game chat entirely) is a good architectural decision that reduces latency and avoids polluting the chat log.

**Code Quality.** The code is well-structured and extensively commented. The Lua components handle edge cases carefully: the JSON encoder/decoder in `agent_bridge.lua` is self-contained specifically because Spring's VFS sandbox prevents importing shared modules in the user-widget directory. The gadget correctly distinguishes synced and unsynced code paths. The Python agent includes robust error handling, retry logic for Strands streaming glitches, thread-safe priority queuing, and graceful fallbacks for missing optional dependencies (sounddevice, pydub, ElevenLabs). The `reserve_and_build` tool validates the `build_type` against the unit's actual `buildOptions` before sending the order and snaps to the nearest valid build site — both are production-quality defensive programming measures that prevent silent failures common in game-automation code.

**Creativity and Presentation.** The "Mistral Commander" persona is well-executed. The `gui_tts_display.lua` widget renders a commander portrait with two poses (`attack` / `calm`) corresponding to the agent's tone, driven in real time by the audio amplitude feed from the Python side. The nametag widget (`gui_com_nametags.lua`) displays a Mistral logo next to AI-controlled commanders on the battlefield. Radio-crackle and transmission-prefix sound effects are mixed into the TTS output to create a military radio aesthetic. These presentation details are well above the typical hackathon standard and demonstrate genuine attention to the player experience.

**Scope and Completeness.** The project is functionally complete within its defined scope: a player can start a BAR game, enable the widgets, run `python tools/bar_agent.py`, and interact with the AI co-commander via text or voice. The commit history — from `basic command using game chat` on the afternoon of February 28 to TTS, STT, event-driven continuations, Mistral branding, and bug fixes by March 1 — shows a well-executed iterative development arc with no apparent dead ends or abandoned branches. The hardcoded API key in the standalone `SpeechToTextDaemon.py` is the most notable defect but does not affect the primary execution path in `bar_agent.py`.

## Special Challenge Eligibility

None identified. The project does not involve fine-tuning (Track 2) or on-device deployment (Track 3). It may be worth highlighting for a "best audio/voice integration" recognition given the sophistication of the Voxtral + ElevenLabs pipeline.
