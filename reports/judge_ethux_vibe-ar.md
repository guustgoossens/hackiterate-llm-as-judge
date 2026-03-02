# Judge Report: Vibe-AR

**Track:** Track 1 — "Anything Goes" (AWS)
**Repository:** https://github.com/ethux/Vibe-AR

## Summary

Vibe AR is an augmented reality coding assistant for the Meta Quest 3 that lets developers talk to their AI coding agent and see code changes appear as floating windows in mixed reality. The system combines Mistral's Voxtral for speech-to-text, Mistral Large/Devstral for LLM responses, ElevenLabs TTS for spoken feedback, Three.js/WebXR for AR rendering, and hand gesture tracking for interaction. Additional components include a 3D file explorer (pixel-art bubbles), a floating terminal (xterm.js via Docker), git tree visualization in 3D space, and an MCP server for AI agent tools.

## Scores

| Criterion | Score (/25) | Justification |
|-----------|-------------|---------------|
| Technicity | 18 | The technical scope is ambitious: WebXR passthrough rendering on Quest 3, hand gesture tracking (pinch/grab/point/fist/palm detection), Three.js 3D scene management, Voxtral STT via `server/routes/transcribe.js` posting to Mistral's audio transcription API, real-time streaming TTS via ElevenLabs with sentence-chunking and WebSocket push in `server/routes/mistral-proxy.js`, xterm.js terminal over ttyd via Docker, and a Python/FastMCP MCP server with git tools and scene control. The `mistral-proxy.js` is particularly sophisticated — it intercepts streaming responses, extracts text within `<speak>` tags for TTS, and pushes sentence chunks to clients via WebSocket for real-time audio playback. However, the README explicitly notes "not all features are fully polished" and the Code City visualization is broken. |
| Creativity | 22 | "Vibecoding in AR" is a genuinely fresh and inspiring concept — the idea of wearing a headset and speaking code changes into existence, watching them appear as floating windows, is a compelling vision for the future of human-computer interaction. The combination of voice-driven AI coding (Vibe CLI), hand gesture interaction, 3D file exploration as pixel-art bubbles, and git history as a navigable 3D tree is unprecedented in this form. The `<speak>` tag convention for selectively routing LLM responses to TTS (so that code blocks and technical metadata don't get read aloud) is a clever engineering choice. |
| Usefulness | 15 | The core vision addresses a real and growing pain point: developers increasingly spend hours staring at screens waiting for AI to generate code. Moving this interaction to AR with voice could genuinely improve ergonomics and engagement. However, the prototype is explicitly early-stage ("the core loop works but not all features are fully polished"), requires a Meta Quest 3 headset (a significant hardware barrier), and the Code City visualization is broken. For most developers today, this is a compelling demo but not a daily-use tool. |
| Track Alignment | 17 | Strong Track 1 fit: the project is genuinely ambitious and creative, uses Mistral APIs (Voxtral STT + Mistral Large/Devstral for LLM), supports AWS as an optional inference path (a vLLM server at `VLLM_URL` for local models, with Mistral cloud as default). However, the "AWS" component is a vLLM server rather than AWS Bedrock, and the repo's primary focus is the AR/XR innovation rather than AWS-specific integration. The Mistral Vibe CLI integration is central to the concept (workspace config at `workspace/.vibe/config.toml` explicitly configures Mistral models and MCP connections). |

**Total: 72/100**

## Strengths

- The `server/routes/mistral-proxy.js` is a sophisticated piece of engineering: it transparently intercepts all Vibe→Mistral API calls, identifies `<speak>` tagged content in streaming responses, sentence-chunks it, and pushes chunks to TTS clients via WebSocket for real-time playback — all without modifying the upstream Vibe CLI
- MCP server (`mcp-server/server.py`, `vibe_ar/tools/`) exposes git tools (log, diff, blame, branches), scene control (highlight commits, show windows, navigate), and file visualization tools via FastMCP
- Genuine WebXR implementation with hand gesture tracking on Meta Quest 3 — pinch, grab, point, fist, palm interactions for AR window management
- Voxtral STT integration via `server/routes/transcribe.js` using Mistral's audio transcriptions API with `voxtral-mini-latest`
- Multi-service Docker Compose architecture: web server, Vibe CLI in Docker via ttyd, Python companion API, Code City server — shows systems thinking beyond a single-service demo
- Includes a test suite with Playwright e2e tests and unit tests for proxy, scene control, and voice flow

## Areas for Improvement

- Code City visualization is explicitly broken and described as "Work in Progress" — a core differentiating feature not functional at submission time
- Hardware barrier: requires a Meta Quest 3 headset, making it inaccessible for most evaluators and users
- The Vibe CLI config at `workspace/.vibe/config.toml` and the `workspace/.vibe/prompts/vibe-ar.md` suggest the project may itself have been built using AI-assisted "vibe coding" — this is meta and interesting but raises questions about how much of the architecture is deeply understood vs. generated
- The local vLLM server for "Devstral-Small" (via `VLLM_URL` and `LOCAL_MODELS` env vars in `mistral-proxy.js`) is a nice feature but the vLLM endpoint is pointed at an external server (`vllm.aptget.nl`) rather than a true local instance
- No README instructions for Mac or Linux desktop testing without a Quest headset

## Detailed Reasoning

Vibe AR tackles one of the most ambitious technical visions in this batch: putting an AI coding assistant into augmented reality. The project's architecture reflects careful system decomposition. The Node.js web server (`server/index.js`) orchestrates multiple route modules: `mistral-proxy.js` for Mistral API proxying with TTS extraction, `transcribe.js` for Voxtral STT, `scene-control.js` for WebSocket-based AR scene commands, `tts.js` for ElevenLabs audio, `terminal.js` for xterm.js streaming, and `git.js` for repository operations. The Python `companion` service handles filesystem operations and provides a REST API the frontend can call to read/write files. The `code-city-server` provides a 3D code visualization backend (currently broken).

The `mistral-proxy.js` is the most technically interesting file in the repository. It implements a transparent MITM proxy for all Vibe CLI → Mistral API calls, intercepting streaming SSE responses and parsing them character-by-character for `<speak>...</speak>` tags. When text inside `<speak>` tags accumulates into complete sentences (using a regex sentence extractor), it is pushed to connected WebSocket TTS clients for immediate ElevenLabs playback. This design allows the AI coding assistant to selectively speak certain parts of its responses (narration, summaries) while silently executing code changes — a sophisticated UX decision that solves a real problem with voice-driven AI (you don't want the assistant to read every line of generated code aloud).

The MCP server (`mcp-server/`) is a FastMCP implementation with git tools (`git_log`, `git_diff`, `git_blame`, `git_branches`, `git_status`) and scene control tools (`scene_highlight_commit`, `scene_show_window`, `scene_browse_folder`, `scene_highlight_file`). The scene control tools communicate with the AR frontend via WebSocket, allowing an AI agent in the Vibe CLI to programmatically manipulate the 3D visualization — highlighting relevant commits, opening file windows, navigating the code structure. This bidirectional AI-to-AR control channel is architecturally elegant.

The WebXR implementation handles passthrough AR on Meta Quest 3 via the browser's XR API, with hand tracking that detects pinch (grab windows), point (select), fist (rotate), and palm (context menu) gestures. The frontend (`public/modules/`) is organized into input (hand tracking, voice, 3D keyboard), visualizations (bubbles for files, CodeCity, git tree, live preview), windowing (window manager, file viewer), and core (state, logging) modules. The 3D file explorer renders each file as a floating pixel-art bubble that can be grabbed and opened.

The prototype is honest about its limitations: the Code City visualization is broken, not all features are polished, and the demo loop "voice → code → preview" works but the full vision is only partially realized. For a 24-hour hackathon, building a working WebXR AR interface with voice coding, hand gestures, a git 3D tree, a floating terminal, AND an MCP server is extraordinary. The incompleteness is understandable given the scope.

## Special Challenge Eligibility

**Best use of Mistral Vibe:** This project is fundamentally about enhancing the Mistral Vibe CLI experience by putting it in AR. The workspace config (`workspace/.vibe/config.toml`) directly configures Mistral models and MCP server connections for Vibe CLI. The proxy intercepts all Vibe CLI Mistral calls. This is one of the clearest "Best use of Mistral Vibe" candidates.

**Best Voice Use Case (ElevenLabs):** Voice is the primary interaction modality: Voxtral STT for input, ElevenLabs TTS for spatial audio feedback in AR. The `<speak>` tag convention for selective vocalization is a sophisticated voice UX design.
