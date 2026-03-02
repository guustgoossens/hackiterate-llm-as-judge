# Judge Report: aicoding (HireAI)

**Track:** Track 1 — Anything Goes / AWS
**Repository:** https://github.com/Ayoubkassi/aicoding

## Summary

HireAI is a fully autonomous AI-powered coding interview platform that uses Mistral Large as the conversational interviewer, ElevenLabs for natural TTS voice output, face-api.js for in-browser webcam proctoring, and Monaco Editor for live code editing and execution. The platform enforces a structured six-phase interview flow (Intro → Warmup → Problem → Coding → Review → Decision) with a multi-layer anti-cheating system covering tab detection, paste blocking, gaze tracking, and prompt-injection defense. The end result is a polished, functionally complete product with a genuinely compelling real-world use case.

## Scores

| Criterion | Score (/25) | Justification |
|-----------|-------------|---------------|
| Technicity | 20 | The codebase integrates five distinct technologies (Mistral Large, ElevenLabs TTS, Web Speech API, face-api.js, Monaco Editor) into a coherent single-page application with ~3,800 lines of clean, well-structured code. The backend (`app.py`) implements server-side code execution in temp files with 10s timeout across Python, JavaScript, C, C++, Java, Go, and Rust. The manipulation detection system is layered at client-side regex (30+ patterns in `app.js` lines 1003-1033), server-side injection into Mistral context (`app.py` lines 83-93), and AI self-detection via the system prompt — a genuinely sophisticated security architecture. The Codestral "Code Intelligence" panel referenced in the UI (`index.html` line 204) has no backing implementation in `app.js`, which is a notable gap between claimed and delivered functionality. |
| Creativity | 18 | Combining a structured LLM interview flow with voice, live code execution, webcam proctoring, sentiment tracking, response-timing analysis, and full session playback in a single hackathon project is ambitious and creative. The "multiple voice detection" heuristic (analyzing speech recognition alternative transcripts for divergent high-confidence alternatives, `app.js` lines 548-570) and "AI-assisted response timing" detection via standard deviation of response latency (`app.js` lines 1277-1286) are genuinely novel anti-cheating techniques not commonly seen in interview tools. The session playback engine with a color-coded timeline scrubber is an unexpected and thoughtful addition. |
| Usefulness | 21 | The problem addressed — inconsistent, time-consuming, and bias-prone technical interviews — is real and significant. The platform delivers a usable end-to-end hiring workflow: setup, structured AI interview, webcam-proctored code challenge, human interviewer feedback, scored decision report, and downloadable transcript. The product is self-contained and could be deployed immediately for small teams. The configurable difficulty levels (Easy/Medium/Hard), job-description-aware warmup questions, and language lock make it practical for real hiring contexts. |
| Track Alignment | 14 | The project uses Mistral Large (`mistral-large-2512`) as the core LLM for interview conversation, phase management, sentiment inference, and decision generation — all via `client.chat.complete()` in `app.py`. Mistral is genuinely central to the product, not a superficial add-on. However, the integration is a straightforward API call with a rich system prompt; there is no fine-tuning, no agentic tool use, no RAG, no on-device inference, and no AWS infrastructure. The Codestral model is mentioned in the UI but not implemented. The track alignment score reflects strong Mistral usage but limited technical depth in how the model is integrated beyond prompt engineering. |

**Total: 73/100**

## Strengths

- Genuinely end-to-end product: from setup through interview, proctoring, feedback, decision, and downloadable report
- Sophisticated multi-layer anti-cheating architecture (client regex + server safety gate + AI self-detection) with coherent scoring logic in `computeIntegrityScore()` (`app.js` lines 1291-1311)
- Voice interaction is well-engineered: echo protection by muting mic during TTS, 1.5s silence detection for auto-send, barge-in interruption support, and mic cooldown after AI finishes speaking (`app.js` lines 648-721)
- Phase enforcement is implemented both in the system prompt and in JavaScript (`updatePhase()` at `app.js` lines 482-509), preventing backward jumps or skipping more than one phase
- Server-side code execution for 7 languages with proper temp file isolation, compilation for C/C++/Java, and 10s timeout (`app.py` lines 196-299)
- Full interview session playback with a scrubber, speed controls (0.5x/1x/2x/4x), and color-coded event timeline (`app.js` lines 1566-1802)
- Structured JSON response format enforced on every Mistral call (using `response_format: json_object`), making parsing reliable and phase transitions machine-readable
- Sentiment tracking (confidence, stress, engagement) derived from Mistral's output and visualized in real time
- Webcam proctoring uses actual landmark geometry (nose-tip vs. eye-midpoint offset) to detect gaze direction, not just bounding-box heuristics

## Areas for Improvement

- The "Codestral Code Intelligence" panel (`index.html` lines 200-210) is present in the UI as a prominent feature but has zero implementation in `app.js` — there is no call to any Codestral endpoint. This is a significant gap between claimed and delivered functionality that impacts the score
- No persistent storage: session data, evidence images, and interview logs are all in-memory or written to ephemeral server directories; restarting the server loses everything
- The `save-evidence` endpoint (`app.py` lines 109-148) references `datetime` and `base64` modules that are never imported, meaning it would crash at runtime — the proctoring screenshot save feature is broken
- Code execution has no sandboxing beyond a 10s timeout; arbitrary code runs directly on the server host with the server's privileges, which is a significant security risk for any real deployment
- The system prompt is constructed client-side in `buildSystemPrompt()` (`app.js` lines 237-379) and sent with every request; there is no server-side validation that the system prompt has not been tampered with by the client
- No database or authentication layer; the platform has no concept of accounts, sessions that persist across page reloads, or access control
- Conversation history grows unbounded in `state.messages` and is sent in full with every API call; long interviews will hit token limits or incur high costs
- TypeScript and Rust are listed as editor language options but the `/api/run` endpoint has no execution path for either (they fall through to the "not supported" error case)

## Detailed Reasoning

**Architecture and Code Quality:** The project is a clean, well-organized Flask + Vanilla JS SPA. The `app.js` file (~2,041 lines) is divided into clearly labeled sections (STATE, PAGES, TIMER, TIMELINE RECORDING, MONACO EDITOR, CODE EXECUTION, SYSTEM PROMPT, MISTRAL API, VOICE, CORE INTERVIEW LOGIC, CHEATING DETECTION, PLAYBACK ENGINE, PROCTOR ENGINE, EVENT LISTENERS). The Python backend (`app.py`, 304 lines) is lean and focused. The separation of concerns is reasonable for a hackathon project. Global state management via a single `state` object is simple but workable. The git history shows active, incremental development across 15 commits with meaningful commit messages.

**Mistral Integration:** Mistral Large (`mistral-large-2512`) is used with `response_format: {"type": "json_object"}` and `temperature: 0.7`, `max_tokens: 2048`. The system prompt (`buildSystemPrompt()`) is extensive and well-crafted — it defines the AI persona, enforces the evaluator (not tutor) mindset, specifies the six-phase interview structure with rules for each phase, defines hint levels, encodes anti-manipulation behavior, and mandates a structured JSON response schema. This is a thoughtful application of prompt engineering as the primary mechanism for AI behavior control. The server injects a `[SECURITY ALERT]` system message when manipulation is detected (`app.py` lines 83-93), adding a second layer on top of the client-side regex filtering.

**Honesty Gap — Codestral:** The landing page prominently states "Data-driven hiring with Codestral real-time code analysis" (`index.html` line 86), and the interview UI has a dedicated "Codestral Code Intelligence" panel with an "Idle" badge and placeholder text ("Codestral watches your code in real-time and provides analysis..."). A search of `app.js` finds zero references to any Codestral API call, endpoint, or model. The feature is entirely absent from the implementation. This is the most significant credibility issue in the submission.

**Anti-Cheating Depth:** The integrity system is the most technically interesting aspect of the project. Beyond common approaches like tab detection and paste blocking, the project implements: (1) "tab-then-paste" detection that correlates a tab switch with a paste within 8 seconds and classifies it as "copy from external source"; (2) keystroke velocity analysis that flags >200 chars appearing in <1 second as a typing burst; (3) response latency statistical analysis (standard deviation over a rolling window of 5 responses) to detect suspiciously consistent timing suggestive of AI-assisted answers; and (4) Web Speech API alternative transcript analysis to detect when a second, clearly different voice pattern repeatedly appears — a proxy for "someone else speaking the answers." These are creative and technically sound approaches, even if some heuristics could generate false positives.

**Security Concerns:** The code execution endpoint runs user-provided code directly as a subprocess on the server (`subprocess.run(cmd, ...)`) with only a timeout as a guard. This is fundamentally unsafe for any multi-user or public deployment — a candidate could execute malicious code with the server process's permissions. Similarly, the system prompt is built client-side and included verbatim in the API request body; a determined user could modify it in the browser before sending. These are understandable shortcuts for a hackathon but worth calling out explicitly.

**Runtime Bug:** The `save_evidence` route in `app.py` uses `datetime.now()` (line 116) and `base64.b64decode()` (line 132) without importing either `datetime` or `base64`. Any proctoring event that triggers an evidence save would crash with a `NameError`. The webcam proctoring UI is functional (face detection runs in-browser), but the server-side evidence persistence is broken.

## Special Challenge Eligibility

None identified. The project uses Track 1 (general) with Mistral Large. No fine-tuning (Track 2) or on-device inference (Track 3) is present. No AWS infrastructure is referenced or described.
