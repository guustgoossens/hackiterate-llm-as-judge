# Judge Report: inception.computer

**Track:** Track 1 — Anything Goes (AWS/General)
**Repository:** https://github.com/Coreeze/inception.computer

## Summary

Inception is an autonomous AI agent life simulation that drops characters into a real-world geographic map (Mapbox GL globe projection) and drives their daily actions via Mistral's Ministral-14B model through OpenRouter. Agents possess a layered cognitive architecture — episodic memory stored as markdown narratives in `life_md`, allostatic decay indices for health/vibe/wealth, a plausibility gate for action validation, and LLM-generated weekly action queues — all ticking in real time through a heartbeat scheduler. The project is deployed (inception.computer) with a Next.js frontend, Express/Socket.IO backend on DigitalOcean, and MongoDB persistence, and includes a bonus fine-tuning dataset builder targeting Mistral-7B persona generation.

## Scores

| Criterion | Score (/25) | Justification |
|-----------|-------------|---------------|
| Technicity | 19 | The simulation engine is genuinely multi-layered: a subscriber-based heartbeat loop (`heartbeatSubscribers.ts`), a per-action plausibility gate (`actionPlausibility.ts`) with type-specific validation rules, dual action queues (player vs. AI), real-coordinate grounding, and an automatic JSON-repair fallback in `openrouter.ts`. The DECAY_RATES are zeroed out in `constants.ts` (a known hack to keep agents alive during the demo), and NPC autonomous planning is commented out in `planner.ts`, indicating unfinished polish. Code structure and TypeScript usage are solid. |
| Creativity | 20 | The core idea — replacing synthetic fictional towns (Stanford's Smallville) with agents embedded in real-world coordinates, walking to actual named cafes, forming relationships, and accumulating an evolving markdown life-history — is a distinctive and memorable inversion. The "free will" toggle, the "What's here?" LLM-narrated map-click, the marriage/child/pet/occupation-change action taxonomy, and the portrait generation pipeline all cohere into a genuinely playful and novel experience that goes beyond a standard chatbot or agent scaffold. |
| Usefulness | 15 | The project has entertainment and exploratory research value (emergent NPC social graphs, geographic simulation, narrative logging), and it is live with real infrastructure. However, the current scope is closer to an interactive toy or demo than a product serving a clear professional audience. NPC autonomous plans are disabled (commented-out batch planner), decay rates are zeroed, and there is no multiplayer, no data export, and limited storytelling output. The fine-tuning script adds research intent but is not trained or integrated. |
| Track Alignment | 16 | Ministral-14B (self-described as running on NVIDIA Brev H100) is the exclusive LLM backbone for every inference call — NPC planning, chat replies, "whats here" narration, action suggestions, world initialization, and JSON repair. However, the model is accessed via an OpenRouter Cloudflare tunnel (`trycloudflare.com`) rather than a direct Mistral or AWS integration, and all three model tiers (`fast`, `smart`, `reasoning`) resolve to the same model ID. The fine-tuning dataset builder exists but no trained model or W&B integration is present. Track 1 "Anything Goes" is the correct self-assignment, though the NVIDIA H100 mention suggests partial Track 3 overlap without on-device deployment. |

**Total: 70/100**

## Strengths

- Real-world geographic grounding via Mapbox GL globe projection with real coordinates, not fictional maps or named placeholders. Agents walk to Le Consulat (18 Rue Norvins, Paris) and equivalent real venues globally.
- Coherent multi-layer simulation engine: heartbeat scheduler → subscriber pipeline → action queue dequeue → plausibility gate → world state mutation → Socket.IO broadcast. The architecture is well-separated and readable.
- Action taxonomy is unusually rich: `move`, `buy`, `event`, `marry`, `child_birth`, `adopt_pet`, `change_occupation` — each with domain-specific validation logic in `actionPlausibility.ts` (e.g., age check for `child_birth`, same-occupation guard for `change_occupation`).
- The `life_md` and `soul_md` markdown narrative fields function as a cheap but effective episodic memory system — timestamped entries appended on every action — fed back into planning prompts without a separate vector database.
- JSON-repair fallback in `openrouter.ts` (two-shot with a dedicated repair system prompt) is a pragmatic and real-world-hardened pattern.
- Automatic portrait generation via Fal.ai (Flux) triggered as a Mongoose post-save hook (`being.ts`, lines 274-282) is a clean passive enrichment pattern.
- The fine-tuning dataset builder (`build_finetune_dataset.py`) shows research ambition: it draws from `nvidia/Nemotron-Personas-USA`, applies 50/50 conditional/unconditional prompts, and outputs Mistral instruct format JSONL, ready for Unsloth/TRL.
- Deployed and functional at inception.computer with real infrastructure (Vercel + DigitalOcean + MongoDB Atlas implied).

## Areas for Improvement

- NPC autonomous planning is entirely commented out in `planner.ts` (lines 396-497). The `generateAllNPCPlans` function early-returns after populating the main character only, leaving NPCs static unless manually triggered. This significantly weakens the "autonomous agents" claim.
- All three model tiers (`fast`, `smart`, `reasoning`) in `openrouter.ts` (lines 8-12) point to the same model ID (`mistralai/Ministral-3-14B-Instruct-2512`), removing the intended differentiation and raising questions about whether the smarter/reasoning path was intended to use a different model.
- `DECAY_RATES` in `constants.ts` are all set to zero (health: 0, vibe: 0, life_mission: 0), meaning the allostatic decay system described in the README does not actually run. Characters cannot die from accumulated neglect in the current deployed state.
- The OpenRouter base URL is a personal Cloudflare `trycloudflare.com` tunnel rather than the canonical `https://openrouter.ai/api/v1`. This is fragile, non-reproducible for judges running locally, and suggests the Ministral model is self-hosted but the setup is undocumented.
- The `generateChoices` crossroads system and `checkSignals` logic are entirely commented out in `processHeartbeat.ts` (lines 435-452). One of the most narratively interesting features — player agency at inflection points — is disabled.
- No relationship evolution between NPCs: the `relationship_index` decays on the character's NPCs (every 7 heartbeats), but NPCs do not form independent relationships with each other. The `Edge` model exists in `buildContext.ts` but is not populated by any active code path.
- The fine-tuning dataset is only a builder script — no trained model, no inference endpoint, no W&B logging. It cannot be evaluated as a fine-tuning submission.
- Minor: direct "any" type usage in several controller functions and some catch blocks swallow errors silently (empty `catch {}` in `processHeartbeat.ts`), reducing observability.

## Detailed Reasoning

**Architecture and Engineering Quality**

The simulation engine in `server/src/simulation/` is the most technically mature part of the codebase. The heartbeat scheduler (`heartbeatScheduler.ts`) manages per-character tick loops with proper in-flight guards, configurable `day_duration_ms`, and Socket.IO event emission on each tick. The subscriber pattern (`heartbeatSubscribers.ts`) allows plugging in new simulation rules without touching the core tick loop — currently wired to `beingDecay` and `npcQueueRefill`. The `processHeartbeat.ts` function itself handles the full state transition: resolving the next action from the player or AI queue, calling the plausibility gate, executing side effects (place creation, NPC spawn on meet, object purchase, marriage/birth DB mutations), and assembling the response payload. This is genuinely well-thought-out simulation architecture for a hackathon.

The plausibility gate (`actionPlausibility.ts`) is worth calling out explicitly: rather than blindly accepting LLM-generated actions, every queued action is normalized (coordinate clamping, text trimming) and type-validated before execution. The `child_birth` validator even checks that the character's age (from `birth_year`) is at least 14 — a small but telling detail that reflects care for simulation coherence. The sanitization pipeline in `planner.ts` (`sanitizeWeeklyAction`, `parseNumeric`, `clampNumber`) is similarly defensive, guarding against malformed LLM output at multiple layers.

**Mistral Integration**

Ministral-14B is used for every inference in the system: character initialization (geocoding + financial bootstrapping), NPC spawning, weekly plan generation, action suggestion, "whats here" narration, NPC chat replies, and JSON repair. The model is accessed via OpenRouter using the OpenAI SDK's compatibility layer — a clean pattern. The custom `completeJSON<T>` wrapper in `openrouter.ts` enforces `response_format: { type: "json_object" }` and adds a self-healing repair pass on parse failure. The system prompts are compact but effective: the planner system prompt in `planner.ts` (line 62-68) fits the full action schema into a few lines using abbreviations, enabling 4096-token weekly plan generation without hitting context limits.

The model tier system (`fast`, `smart`, `reasoning`) is architecturally sound but currently collapsed — all three resolve to the same model ID. The README claims "Ministral 14B on NVIDIA Brev H100," suggesting a self-hosted endpoint behind the Cloudflare tunnel. If true, this is a legitimate Track 3 partial overlap, but it is not documented or reproducible.

**Gaps Between Claims and Code**

The README's neuroscience framing ("Episodic Memory," "Executive Function," "Allostatic Regulation," "Plausibility Gating") maps well to actual code, but several of these systems are partially or fully disabled:
- Allostatic decay: `DECAY_RATES = { health: 0, vibe: 0, life_mission: 0 }` — no decay runs.
- Executive function (NPC weekly plans): the entire batch planning loop in `generateAllNPCPlans` is commented out.
- Signals + choices: `checkSignals` and `generateChoices` calls are commented out of `processHeartbeat.ts`.
- Salience signals: `server/src/simulation/heartbeat/signals.ts` is referenced in the README terminology table but not present in the repository.

These omissions are understandable given the 48-hour hackathon window, but they matter for scoring because the README's claims should be validated against actual running code.

**Frontend and UX**

The Next.js frontend is clean and functional. The Mapbox GL globe with avatar markers for the main character and all NPCs, real-time position updates via Socket.IO, the "What's here?" LLM-narrated panel, the "Do Stuff" action suggestion flow, and the NPC chat dialog all work together coherently. The Zustand stores (`WorldStorage`, `SimulationStorage`) are well-separated. The `Globe.tsx` component is large (~900 lines) and handles a lot of UI logic inline, but it is legible. The UI aesthetic — monospace IBM Plex Mono font, warm cream/stone palette, minimal chrome — suits the simulation's serious tone.

**Fine-Tuning Ambition**

`build_finetune_dataset.py` demonstrates clear awareness of how to build a persona fine-tuning pipeline for Mistral: it pulls from the well-chosen `nvidia/Nemotron-Personas-USA` dataset, applies varied prompt templates (conditional on demographics vs. unconditional), and outputs Mistral instruct format. This is the right approach for making NPC generation more consistent and domain-specific. However, no trained model exists, no W&B run is linked, and the script is not invoked from any part of the server codebase. It is a promising specification for future work rather than a completed track contribution.

## Special Challenge Eligibility

The README states "Ministral 14B on NVIDIA Brev H100," which suggests a self-hosted model on NVIDIA hardware, potentially relevant to the Track 3 (On Device/NVIDIA) challenge. However, the actual API calls go through a Cloudflare tunnel whose backend cannot be independently verified, and no NVIDIA-specific tooling (TensorRT-LLM, NIM, etc.) is referenced in the codebase. The fine-tuning dataset builder targets Mistral-7B SFT but no trained weights or W&B integration exist for Track 2 consideration. No special challenge eligibility is confirmed based on code evidence alone.
