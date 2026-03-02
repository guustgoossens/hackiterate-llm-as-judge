# Judge Report: mistral-hackathon-hospi-guide (Triastral)

**Track:** Track 1 — Anything Goes / AWS
**Repository:** https://github.com/AdrienLebret/mistral-hackathon-hospi-guide

## Summary

Triastral is a voice-first AI kiosk for emergency department intake that uses Amazon Nova Sonic 2 for real-time bidirectional speech, Mistral Large (via Amazon Bedrock) for structured clinical pre-assessment and public health data enrichment, and a Next.js patient-facing UI with WebSocket streaming. The system implements the French CCMU triage classification framework, enforces a strict information boundary so patients never see clinical risk assessments, and delivers a nurse-facing triage document at session end. It is a thoughtfully designed, practically motivated product with substantial working code across the full stack.

## Scores

| Criterion | Score (/25) | Justification |
|-----------|-------------|---------------|
| Technicity | 20 | The project demonstrates real technical depth: a multi-agent "Agents as Tools" pattern using the Strands SDK's experimental `BidiAgent`, a FastAPI + WebSocket bridge (`api/websocket.py`) that handles async audio streaming, PCM encoding/chunking in the browser (`AudioCaptureService.ts` with a `RollingBuffer` accumulating 3200-sample chunks), MCP integration against the live data.gouv.fr endpoint, and a well-structured React state machine (`useKioskStateMachine.ts`). Code quality is high with proper error handling, fallback paths, and docstrings. The main gap is that the nurse dashboard and persistence layer are absent, and some features are documented as planned rather than shipped. |
| Creativity | 17 | Combining real-time bidirectional speech (Nova Sonic 2) with sub-agent delegation to a specialized clinical OPQRST agent and a live MCP-connected open-government-data agent is a genuinely creative orchestration. The strict information boundary enforced at both prompt level and in TypeScript code (`informationBoundary.ts`) is an unusual and thoughtful safety design choice. The pixel art animated avatar as a kiosk UI element is a distinctive creative touch. The core concept of AI-assisted ER triage is not novel, but the specific technical combination is original. |
| Usefulness | 22 | Emergency department overcrowding is a documented, acute problem in French hospitals. The system targets a clearly defined workflow (patient intake bottleneck), a specific audience (French ED patients and coordinating nurses), and a real standard (CCMU classification used across French hospitals). The OPQRST framework is the correct medical methodology for structured symptom intake. The information boundary design addresses a genuine clinical safety concern. If shipped, this could meaningfully reduce time-to-triage. |
| Track Alignment | 19 | The project is built entirely on AWS infrastructure: Amazon Bedrock for both Nova Sonic 2 and Mistral Large, with boto3 as the SDK and explicit region/model configuration via environment variables. The architecture document details planned DynamoDB tables with KMS encryption for clinical data separation — a cloud-native design. Mistral Large is the backbone model for all clinical reasoning and data enrichment. The MCP integration with data.gouv.fr is an extra technical dimension. Track 1 "Anything Goes / AWS" is the right fit; the AWS integration is real and central, not cosmetic. |

**Total: 78/100**

## Strengths

- Full-stack implementation: a working voice backend (BidiAgent + Nova Sonic 2), two Mistral Large sub-agents, a FastAPI/WebSocket bridge, and a polished Next.js kiosk UI all exist in the repository with working code
- Medically rigorous prompting: the orchestrator and clinical agent prompts implement OPQRST, a recognized emergency triage assessment framework, with explicit red-flag identifiers tied to deterministic CCMU classification logic in `triage.py`
- Information boundary enforced in code at two levels: the LLM prompt (`orchestrator.md` explicitly lists what must never be said to the patient) and in TypeScript (`informationBoundary.ts` `extractPatientSummary` function that strips `recommended_ccmu`, `ccmu_reasoning`, `red_flags`, and `opqrst` from any patient-facing display)
- MCP integration against the live data.gouv.fr endpoint for epidemiological context, BDPM medication safety data, and FINESS facility lookup — a genuinely useful and non-trivial integration
- Error handling throughout: `clinical_agent.py` returns a safe fallback JSON with `suggested_ccmu: "3"` on any failure; the WebSocket layer handles binary/text frame disambiguation and has a 30-second session timeout; the `AudioCaptureService` handles double-start and resource cleanup
- Well-structured audio pipeline: PCM 16kHz capture via `ScriptProcessorNode`, a `RollingBuffer` emitting 200 ms chunks, binary WebSocket frames, and a scheduled playback service with barge-in support
- The `summarize_transcript` agent (Mistral Large) is called at session end as a fallback to extract patient-declared data from the raw conversation even if tool results were not captured — a thoughtful resilience path
- Detailed documentation: `ARCHITECTURE.md`, `CCMU_REFERENCE.md`, `DATA_MODEL.md`, and `.kiro/specs` with formal requirements in acceptance-criteria style, showing disciplined product thinking

## Areas for Improvement

- The nurse dashboard is entirely absent from the codebase — it is the primary consumer of the triage document and its absence means the end-to-end loop is incomplete for demo purposes
- DynamoDB persistence layer is planned but not implemented; triage documents are currently written to local JSON files (`backend/output/`)
- The FastAPI CORS configuration in `routes.py` uses `allow_origins=["*"]` which is a security concern for a healthcare application handling clinical data
- The `AudioPlaybackService` is referenced throughout but was not found in the explored file listing — it needs verification that the implementation is complete
- The `stop_conversation` trigger for triage document compilation relies on the orchestrator calling the tool correctly; if the BidiAgent's `bidi_connection_close` event reason is anything other than `"user_request"`, the triage document is never sent to the frontend — a fragile edge case
- The DataGouv agent prompt is written in English while the orchestrator and clinical prompts are in French, creating inconsistency in a French-language product
- No authentication or session isolation on the WebSocket endpoint — in a real hospital kiosk deployment this is a gap
- Property-based tests using `fast-check` are listed as a devDependency and referenced in comments in `AudioCaptureService.ts`, but no test files were found in the repository

## Detailed Reasoning

**Architecture and Technical Execution**

Triastral implements a clean "Agents as Tools" pattern from the Strands Agents SDK. The orchestrator is a `BidiAgent` using `BidiNovaSonicModel` (`amazon.nova-2-sonic-v1:0`) for real-time speech-to-speech. When the agent determines sufficient clinical information has been gathered, it calls two `@tool`-decorated sub-agents: `clinical_assessment` in `backend/agents/clinical_agent.py` and `query_health_data` in `backend/agents/datagouv_tool.py`. Each sub-agent wraps a Strands `Agent` using `BedrockModel` with `mistral.mistral-large-3-675b-instruct` at temperature 0.2 — a sensible low-temperature setting for structured clinical output.

The WebSocket bridge in `backend/api/websocket.py` is the most complex piece of engineering in the project. The `ConnectionManager` class handles the full session lifecycle: accepting the WebSocket, initializing the BidiAgent, spawning a background asyncio task to process agent events (`_process_agent_events`), and translating BidiAgent event types (`bidi_audio_stream`, `bidi_transcript_stream`, `tool_use_stream`, `bidi_connection_close`) into the typed JSON protocol consumed by the frontend. Audio forwarding is handled in both directions: incoming browser PCM is base64-encoded and sent as `BidiAudioInputEvent`; outgoing agent PCM is decoded from base64 and sent as raw binary frames. Tool results are captured from the event stream and stored in `_clinical_data` and `_datagouv_data` for final triage document compilation.

**Prompt Engineering and Medical Validity**

The system prompts are exceptionally detailed. `orchestrator.md` specifies a 7-step conversation flow in French, explicit rules for the information boundary (listing every forbidden disclosure), a fast-path for CCMU 5 emergencies that bypasses the normal flow, echo/barge-in handling rules, and a full CCMU decision tree with clinical examples at each level. The clinical agent prompt (`clinical.md`) defines all 8 red-flag identifiers with their string identifiers (e.g. `"chest_pain_with_dyspnea_and_diaphoresis"`, `"thunderclap_headache"`), OPQRST extraction rules with a fallback to `"Non renseigné"`, and a deterministic JSON output schema with field-level constraints. The `classify_ccmu` function in `triage.py` then re-implements the same decision logic deterministically in Python using a `frozenset` of `IMMEDIATE_DEATH_RISK_FLAGS`, ensuring that even if the LLM's `suggested_ccmu` is miscalibrated, the final classification has a code-level safety check.

**Frontend Quality**

The Next.js frontend is more complete than the README suggests. The kiosk state machine (`useKioskStateMachine.ts`) implements all four phases (welcome, conversation, validation, ticket) with a proper `useReducer`-based state machine. The `useWebSocket` hook correctly handles binary vs text frame disambiguation, implements a 30-second timeout for `sessionStart`, and prevents stale closure issues by storing callbacks in refs. The `AudioCaptureService` implements PCM 16-bit mono capture at 16 kHz with a `RollingBuffer` that emits fixed 3200-sample chunks — exactly matching the Nova Sonic 2 input requirements. The pixel art avatar system (`PixelArtAvatar.tsx`, `avatarSprites.ts`, `useAvatarAnimation.ts`) renders state-animated sprites on a Canvas element with `framer-motion` for idle bob animation. The `ValidationView` correctly displays only patient-declared data, and the `TicketView` generates a real QR code via `qrcode.react`.

**Completeness and Gaps**

The project self-honestly documents what is and is not implemented. The core voice conversation pipeline, clinical assessment, DataGouv enrichment, and patient kiosk UI are all present. The nurse dashboard (the other half of the value proposition), DynamoDB persistence, and QR-based queue tracking are not. The `.kiro/specs/nurse-dashboard/requirements.md` file exists but contains only an empty configuration. For a hackathon project the implemented scope is substantial, but the missing nurse-facing layer means judges cannot see the full end-to-end product experience.

**Track and Ecosystem Fit**

The project is squarely in Track 1 (Anything Goes / AWS). Mistral Large is used via Amazon Bedrock as the brain for both the clinical reasoning sub-agent and the DataGouv enrichment agent. Nova Sonic 2 on Bedrock handles voice orchestration. The planned persistence layer explicitly targets DynamoDB with KMS encryption. The MCP integration with the French government data platform (`mcp.data.gouv.fr`) adds a domain-specific data layer that few hackathon projects would think to include, and demonstrates awareness of real healthcare data sources beyond the LLM itself.

## Special Challenge Eligibility

The project uses Amazon Nova Sonic 2 via Bedrock alongside Mistral Large, and integrates the MCP protocol against a live external data source (data.gouv.fr). If there is a special challenge for AWS Bedrock or MCP integration, this project is a strong candidate. No fine-tuning is used (Track 2 not applicable). No on-device inference is used (Track 3 not applicable).
