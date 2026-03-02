# Judge Report: mh-front (Les Mystères de Paris — Frontend)

**Track:** Track 2 — Fine-Tuning (W&B)
**Repository:** https://github.com/divait/mh-front

## Summary

"Les Mystères de Paris: AI Chronicles" is a mystery-RPG set in Belle Époque Paris (1889–1911), where players explore a 2D Phaser 3 map of Paris, interrogate AI-powered NPCs, collect clues, and solve a murder mystery. The frontend (this repo) is built with React 18, TypeScript, Vite, and Phaser 3, with voice I/O via the Web Speech API. It connects to a FastAPI backend (`mh-back`) and a separate fine-tuning repo (`mh-fine-tuning`), meaning the overall project spans three repositories; this evaluation is based solely on the frontend repo, which is the only one provided.

## Scores

| Criterion | Score (/25) | Justification |
|-----------|-------------|---------------|
| Technicity | 15 | The frontend is technically solid: `ParisScene.ts` is a full Phaser 3 scene with animated sprite movement (multi-directional walk cycles with frame data in `constants.ts`), collision walls (`buildWalls()`), clickable NPC zones with proximity detection (`TALK_RADIUS`), animated indicator tweens, building interior/exterior transitions, and a day/night overlay. `DialoguePanel.tsx` implements voice input with `SpeechRecognition` auto-send and TTS (`window.speechSynthesis`). The React/Phaser integration bridges via DOM events and `gameState.ts` shared state. The codebase is well-structured and TypeScript-typed throughout. However, this is a frontend-only evaluation; the AI logic lives in the backend repo. |
| Creativity | 18 | Setting a mystery RPG in Belle Époque Paris (1889–1911) with fine-tuned period-appropriate NPC agents is a creative and charming idea. The "colour-coded NPC category" system (blue = re-skinned 1789-era, gold = original Belle Époque, grey = non-agentic) adds game design depth. Voice input/output for interrogating historical NPCs is an inspired UI choice. The quest generation selecting a Mistral model variant from the title screen adds a meta layer for hackathon judges. |
| Usefulness | 14 | A playable, voice-driven mystery RPG with AI NPCs is genuinely engaging as a demo product and showcases interactive storytelling potential for LLMs. The target audience (gamers, interactive fiction fans) is clear. However, without the backend repo in scope, the actual AI experience cannot be fully assessed — the frontend is beautifully built but is a shell without the server. |
| Track Alignment | 16 | The project has a dedicated fine-tuning repo (`mh-fine-tuning`) and the README clearly states fine-tuned Mistral NPCs are the core mechanic. However, this submission is the frontend only — there is no fine-tuning code or evaluation results visible here. Track 2 alignment depends entirely on the other repos, which are not part of this submission. The frontend itself connects to an API but contains no fine-tuning evidence; partial credit is warranted given the clear project intent and companion repository references. |

**Total: 63/100**

## Strengths

- Well-engineered Phaser 3 scene: multi-directional player animation (separate walk/walk-up/walk-down sprite sheets), building interior/exterior transitions with custom wall collision rects, proximity-based NPC interaction zones, animated indicators, and a day/night atmosphere overlay
- Clean component architecture: `TitleScreen` → `IntroDialogue` → `ParisScene` → `DialoguePanel` → `GameOverScreen` follows a clear game state machine progression via React routing in `App.tsx`
- Voice I/O is genuinely implemented: Web Speech API for STT (microphone toggle with auto-send), `window.speechSynthesis` for TTS, background ambient music during gameplay
- TypeScript throughout with explicit interfaces in `types.ts` and constants centralized in `constants.ts`
- The gameState module (`game/gameState.ts`) provides clean shared state for clue tracking, active NPC, and quest objectives that bridges Phaser and React

## Areas for Improvement

- This is a frontend-only repo; AI fine-tuning and NPC logic are in `mh-back` and `mh-fine-tuning`, making it impossible to evaluate Track 2 claims from this repo alone
- No tests are present for the frontend components
- Backend URL is hardcoded to `localhost:8000` in `constants.ts` with no environment variable configuration for deployment
- The Cursor rules file (`.cursor/rules/frontend.mdc`) and `pnpm-lock.yaml` suggest Vibe-coded development, which is fine but means some scaffolding may not be deeply understood
- No error handling is visible in the DialoguePanel for backend connectivity failures

## Detailed Reasoning

The frontend repository for "Les Mystères de Paris: AI Chronicles" demonstrates competent React/TypeScript/Phaser 3 engineering within the constraints of a 24-hour hackathon. The `ParisScene.ts` file is the architectural heart of the submission: it implements a full 2D game scene with a custom wall collision system (`buildWalls()` generates axis-aligned rectangles from `BUILDING_BOUNDS` constants), proximity detection for NPC interaction (`TALK_RADIUS` radius check), animated player sprites using multi-directional walk frame data, clickable building zones that dispatch `ZoneClickedEvent` to the React layer, and building interior/exterior transition animations. This is non-trivial Phaser 3 work for a hackathon.

The React/Phaser integration pattern — Phaser scene initialized inside a React `useEffect`, events dispatched via a custom DOM event bus, `gameState.ts` as a shared singleton — is a reasonable solution to the inherent challenge of bridging an imperative game engine with a declarative UI framework. The `DialoguePanel.tsx` component implements real voice I/O: it uses the `SpeechRecognition` API for continuous speech recognition with auto-send on silence detection, and `window.speechSynthesis` for TTS responses. Period-appropriate vocal tone is configured via pitch/rate parameters, which is a thoughtful design touch.

The game design itself is creative: NPCs are colour-coded by category (blue for re-skinned 1789-era characters, gold for original Belle Époque characters, grey for non-interactive background characters), and the title screen lets players select which Mistral model variant to use for quest generation — an unusual mechanic that turns model selection into a gameplay choice. The HUD tracks collected clues and current quest objectives, and the `GameOverScreen` implements an accusation mechanic for finale resolution.

The limitation of this submission is scope: the fine-tuning that makes it a Track 2 submission lives entirely in `mh-fine-tuning` (not provided), and the AI NPC intelligence lives in `mh-back` (also not provided). This repo is a polished frontend shell, but evaluating Track 2 alignment or the actual quality of Mistral integration is not possible from this codebase alone. The backend URL hardcoded to `localhost:8000` means the project cannot be deployed without code changes. For a full team project spanning three repositories, the hackathon submission would ideally point to a monorepo or at minimum link the specific commits of all three components.

## Special Challenge Eligibility

**Best Voice Use Case (ElevenLabs):** Partial eligibility — voice I/O is a central mechanic (Web Speech API for STT, browser TTS for NPC responses), but ElevenLabs specifically is not used in this frontend repo. If the backend uses ElevenLabs TTS for NPC voices, this could qualify — but that is not visible here.

**Best Video Game Project (Supercell):** Plausible — it is a playable mystery RPG game with AI-powered NPCs. The Belle Époque Paris setting and NPC interrogation mechanic are game-native. Whether it qualifies depends on the backend's AI quality, which cannot be assessed from this repo.
