# Judge Report: hackathon-paris (Veriscope)

**Track:** Track 1 — Anything Goes (AWS)
**Repository:** https://github.com/Barbapapazes/hackathon-paris

## Summary

Veriscope is a real-time political debate fact-checking pipeline that captures live microphone audio, transcribes it with Mistral's real-time STT, passes each utterance through a multi-agent analysis system (statistique, rhetorique, coherence, contexte), and broadcasts an OBS overlay with the verdict and sourced evidence — all synchronized to a configurable video stream delay. The architecture integrates Mistral across multiple modalities (real-time audio transcription, web search, structured JSON inference) and ties together Temporal for durable workflow orchestration, Laravel with Reverb WebSockets for the broadcast layer, and OBS WebSocket for live scene switching. The scope and integration depth are impressive for a hackathon, with evidence of iterative refinement visible in both the notebooks and production code.

## Scores

| Criterion | Score (/25) | Justification |
|-----------|-------------|---------------|
| Technicity | 21 | The project spans five distinct technical layers (STT, workflow orchestration, multi-agent LLM pipeline, Laravel API + WebSocket broadcasting, OBS automation) with each layer coded to a production standard. The 1,536-line `realtime_transcript_fusion.py` implements dual-provider arbitration (Mistral + ElevenLabs) with a heuristic-first then LLM-judge fallback, deduplication, VAD commit strategy, and auto-reconnect. The Temporal workflow (`debate_workflow.py`) correctly models video delay timing, self-correction detection, and idempotent POST semantics. Rate-limit backoff with exponential jitter is implemented in `activities.py`. The main gap is the absence of automated tests for the Python pipeline (only the Laravel side has Pest tests) and some hardcoded local paths left in docs. |
| Creativity | 20 | Combining real-time speech transcription, multi-agent parallel fact-checking with a "routeur" agent that dynamically routes to specialist agents, video-delay synchronization, and automated OBS scene switching into one live broadcast tool is a genuinely novel composition. The dual-provider transcription arbitration (heuristic similarity + LLM tiebreaker) is a creative engineering choice. The "self-correction detection" to suppress fact-check overlays when the speaker immediately corrects themselves is an elegant domain-specific insight rarely seen in hackathon projects. |
| Usefulness | 20 | Real-time fact-checking of political speeches for live broadcast is a high-impact, concrete use case with an obvious audience (broadcasters, journalists, civic media). The tool produces an actionable OBS overlay with verdicts and clickable sources, closing the full loop from audio to screen. The configurable video delay alignment means it can work with real broadcast setups. The constraint of requiring at least one sourced URL before displaying a bandeau prevents hallucination-only outputs from reaching air, which is a responsible design choice. |
| Track Alignment | 18 | Mistral is deeply integrated: `mistral-small-latest` and `mistral-medium-latest` for structured JSON inference, Mistral's real-time transcription API (`mistralai.extra.realtime`) for STT, and Mistral's beta web-search conversations API (`client.beta.conversations.start_async` with `tool: web_search`) for source retrieval. The entire fact-checking intelligence runs on Mistral. The project is Track 1 (Anything Goes), which fits well, but there is no AWS-specific infrastructure used — everything runs on Docker Compose locally. Track 1 with AWS would have scored higher with any cloud deployment component. |

**Total: 79/100**

## Strengths

- Genuinely end-to-end: from microphone bytes to OBS scene switch, every step is coded and wired.
- Mistral used across three distinct modalities in one project: real-time audio transcription (`mistralai.extra.realtime`), web search (`client.beta.conversations.start_async` with `web_search` tool), and structured JSON inference (`chat.complete_async` with `response_format={"type": "json_object"}`).
- Temporal workflow design correctly separates concerns: analysis runs first, delay is computed from `metadata.timestamp_start`, self-correction check runs in parallel, then the remaining delay is awaited before POST — this is proper durable execution, not just a `time.sleep`.
- The "source filter" logic in `activities.py` (social media blacklist, URL deduplication, heuristic token-overlap fallback when LLM selection fails) is production-grade defensive coding.
- Laravel backend is well-structured with a clean contract/implementation split (`ObsSceneSwitcher` interface + `ObsWebSocketSceneSwitcher`), proper FormRequest validation with exhaustive error messages, and a `VerifyFactCheckSceneTimestampJob` that auto-reverts the OBS scene after a cooldown — preventing permanent scene locks.
- Three automated PHP tests (validation, happy path with mocked OBS, OBS failure 502) show professional practice on the frontend API side.
- The `realtime_transcript_fusion.py` dual-provider arbitration with heuristic-first, LLM-judge tiebreaker, and `--disable-llm-judge` escape hatch is a well-considered reliability pattern.
- The Agents.ipynb notebook shows the iterative design process, including a working 15-example benchmark with real French politician statements.

## Areas for Improvement

- No Python unit or integration tests for the workflow and activities layer, which is the most complex part of the codebase.
- Hardcoded absolute local paths appear in documentation (e.g. `/Users/godefroy.meynard/Documents/test_datagouv_mcp/...` in `texte/README.md` and `ingestion/README.md`), indicating the docs were not cleaned before submission.
- No AWS infrastructure is used despite being entered under Track 1 (Anything Goes/AWS). The stack is purely local Docker Compose. A deployed endpoint would strengthen the submission.
- The `Agents.ipynb` notebook still references Tavily (`from tavily import TavilyClient`) as the web search backend, while the production `activities.py` has migrated to Mistral's own web search API. The notebook is not fully updated to match production.
- Source selection in `_search_relevant_sources` defaults to a heuristic token-overlap approach (`SOURCE_SELECTION_MODE=heuristic`) rather than LLM selection, which may produce lower-quality source attribution than the LLM path.
- The `DebateJsonNoopWorkflow` class name still contains "Noop" (a legacy name from a prior iteration), which is misleading in the final submission.
- No demo video or live recording is included in the repository to demonstrate the overlay working on actual broadcast footage.
- The `ingestion/` directory contains a `realtime_transcript.py` (older version) whose relationship to the more advanced `texte/realtime_transcript_fusion.py` is not clearly explained.

## Detailed Reasoning

**Architecture cohesion:** Veriscope is unusually complete for a hackathon. The data flow documented in the README mermaid diagram is fully implemented in code: the microphone feeds `realtime_transcript_fusion.py`, which emits JSONL to `debate_jsonl_to_temporal.py`, which computes a per-phrase absolute `target_post_timestamp = estimated_phrase_start + VIDEO_DELAY_SECONDS` and submits a Temporal workflow. The workflow executes `analyze_debate_line` (the multi-agent pipeline) and `check_next_phrase_self_correction` concurrently, waits out the remaining delay, then conditionally calls `post_fact_check_result`. This is the correct way to use Temporal — the delay is durable and survives worker restarts.

**Mistral integration depth:** The project uses Mistral at three levels. First, `mistralai.extra.realtime` for streaming audio transcription in `realtime_transcript_fusion.py` — this uses the `RealtimeTranscriptionTextDelta`, `TranscriptionStreamDone`, and reconnect handling. Second, `client.beta.conversations.start_async(model=..., inputs=query, tools=[{"type": "web_search"}])` in `activities.py` for source retrieval — this is the Mistral native web-search feature and avoids a third-party search API dependency (unlike the notebook's Tavily approach). Third, `client.chat.complete_async(..., response_format={"type": "json_object"})` for structured JSON outputs from each specialist agent and the router. The use of `mistral-medium-latest` for web search and `mistral-small-latest` for structured analysis is a cost-conscious model selection choice.

**Multi-agent pipeline design:** The `executer_analyse_parallele` function in `activities.py` implements a clean router-then-parallel-specialists pattern. The `agent_routeur` first classifies the utterance and produces an `affirmation_propre` (cleaned claim text), then `asyncio.gather` dispatches only the relevant specialist agents. The `agent_editeur` then synthesizes the raw reports into a TV-ready two-sentence summary with a `verdict_global`. The source enrichment in `_enrich_editor_result_with_sources` correctly maps per-agent sources back into the editor's `explications` structure. The mandatory-source gate (`if resultat_final.get("afficher_bandeau") and not resultat_final.get("sources")`) ensures no fact-check overlay fires without a real URL, which is an important editorial safeguard.

**Laravel broadcast layer:** The `StreamFactCheckController` is a single-action invokable controller that validates the payload (via `StreamFactCheckRequest` with exhaustive rules), switches the OBS scene via WebSocket (`sourecode/obs-websocket-php`), caches the switch timestamp, dispatches `FactCheckContentUpdated` (a `ShouldBroadcastNow` event on the `stream.fact-check` channel via Laravel Reverb), and queues a delayed `VerifyFactCheckSceneTimestampJob` to auto-revert the scene. The Vue.js overlay at `/overlays/fact-check` uses `@laravel/echo-vue`'s `useEchoPublic` composable to subscribe to the WebSocket channel and updates reactively with animated transitions via `motion-v`. The cooldown job's timestamp comparison logic prevents an older fact-check from reverting a scene that has already been updated by a newer one.

**Code quality observations:** The Python code is well-commented (in French, which is appropriate for the target market), uses type hints throughout, and has a clear separation between pure utility functions (`_tokenize`, `_extract_numbers`, `_is_valid_http_url`, etc.) and the async agent functions. The `_heuristic_self_correction` function is particularly well-designed: it checks for correction markers, number replacement, and short follow-up phrases before falling back to an LLM call, saving latency and API costs. The PHP code follows Laravel conventions closely and the OBS contract/implementation split (`ObsSceneSwitcher` interface) makes the code testable — as evidenced by the Mockery-based test that verifies the full controller flow without requiring a real OBS instance.

## Special Challenge Eligibility

None identified. The project does not appear to target any specific special challenge track (Fine-Tuning/W&B or On Device/NVIDIA). It is solidly Track 1.
