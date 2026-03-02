# Judge Report: mathisdev7/mistral-hackathon-paris

**Track:** Track 1 — "Anything Goes" (AWS)
**Repository:** https://github.com/mathisdev7/mistral-hackathon-paris

## Summary

SpokeAI is a voice-first AI language tutoring application that lets users practice speaking a foreign language through immersive roleplay scenarios. It integrates Mistral's `mistral-large-latest` model for conversational AI and Voxtral (`voxtral-mini-latest`) for speech-to-text transcription, and combines these with ElevenLabs TTS and a Supermemory-backed long-term learner profile. The application is a complete, multi-page Next.js web app with authentication, a PostgreSQL database, and a well-thought-out session lifecycle.

## Scores

| Criterion | Score (/25) | Justification |
|-----------|-------------|---------------|
| Technicity | 20 | The project integrates multiple APIs and services (Mistral Large for chat, Voxtral STT, ElevenLabs TTS, Supermemory, Drizzle ORM + PostgreSQL, Better Auth with GitHub OAuth) into a coherent full-stack application. The chat API route (`app/api/chat/route.ts`) implements multi-step agentic tool-calling with Vercel AI SDK's `streamText`, three typed Zod-validated tools (`get_sessions`, `start_session`, `end_session`), session-state derivation from message parts, and a detailed system prompt engineering approach with expression tags designed specifically for TTS compatibility. The voice input has two distinct modes (toggle and auto with WebAudio-based silence detection), both with proper lifecycle and cleanup management in `chat-bottom-bar.tsx`. Four sequential database migrations are present, showing iterative development during the hackathon. |
| Creativity | 19 | The core concept of a voice-first conversational language tutor with long-term learner memory is a coherent and well-executed original idea for a hackathon. The expression tag system (`[excited]`, `[laughs]`, `[pauses]`, etc.) injected into LLM output as TTS-aware formatting is a subtle but creative touch. The use of Supermemory to persist a structured learner profile (level, strengths, weaknesses) and session history across conversations — and feeding this back into the opening greeting — creates a genuinely personalized UX loop that goes beyond a simple chatbot. The "immersive" vs "native" tutor language mode is a thoughtful pedagogical design choice. The idea is not entirely novel (language tutoring apps exist), but the specific combination and execution is well thought-out. |
| Usefulness | 21 | The app solves a real and widely felt problem: lack of opportunity for spoken language practice. It supports 13 languages, offers real-world roleplay scenarios (ordering food, job interviews, etc.), tracks user progress over time, and adapts suggestions based on observed weaknesses. The onboarding flow captures motivation which further tailors the experience. The session recap cards showing level assessment, strengths, and areas for improvement provide concrete value beyond the practice session itself. The product is polished enough that a real user could find it genuinely useful as a daily language learning companion. |
| Track Alignment | 20 | The project squarely fits Track 1 ("Anything Goes") by building an ambitious, creative, and impactful application using the Mistral API. It uses two distinct Mistral products: `mistral-large-latest` as the conversational LLM with tool-calling (`app/api/chat/route.ts`) and `mistral-small-latest` for title generation, plus Voxtral (`voxtral-mini-latest`) via the `@mistralai/mistralai` SDK for transcription (`app/api/transcribe/route.ts`). The use of `generateObject` with a Zod schema for structured AI topic generation (`lib/session-cards-actions.ts`) further demonstrates deliberate Mistral API integration. The project is ambitious in scope and demonstrates meaningful real-world impact. |

**Total: 80/100**

## Strengths

- Genuine end-to-end voice interaction loop: browser mic capture → Voxtral STT → Mistral Large → ElevenLabs TTS → playback, all wired together correctly
- Auto voice mode with WebAudio `AnalyserNode`-based silence detection (2s threshold, RMS measurement) is technically non-trivial and enhances UX significantly
- System prompt engineering is exceptionally detailed and purpose-built for TTS: no markdown, no stage directions, only plain spoken text, with a controlled whitelist of expression tags
- Dual-layer memory architecture (short-term PostgreSQL conversations/messages, long-term Supermemory profile) is well-designed and implemented cleanly in `lib/memory.ts`
- Multi-step agentic tool-calling with proper session-state derivation from message parts, including handling for the `__INIT__` synthetic message pattern to trigger the greeting without persisting a dummy user message
- Topic card generation uses `generateObject` with Zod schema validation and has a robust fallback chain (AI → text parse → JSON repair → static pool) in `lib/session-cards-actions.ts`
- Four database migrations (`drizzle/`) demonstrate iterative, real development during the hackathon rather than a single upfront schema
- Code quality is consistently high: proper TypeScript types throughout, well-structured server actions, correct use of Next.js App Router conventions (server components for data fetching, client components for interactivity)
- Duplicate TTS suppression logic using canonical text signatures and a 20-second deduplication window prevents re-speaking on re-renders
- Settings page allows users to change target language, native language, motivation, tutor language mode, and voice gender after onboarding

## Areas for Improvement

- The `@supermemory/tools` package is listed as a dependency but its `tools` feature does not appear to be used — only the basic `supermemory` SDK is used. The memory layer uses plain string serialization (`Level: X\nStrengths: A | B`) rather than structured vector search, which limits semantic recall capability
- Voice auto-mode only detects silence after speech is detected; there is no visual waveform or amplitude indicator, making it harder for users to know if their mic is picking up audio correctly
- The session state derivation (scanning all message parts for `start_session` / `end_session` tool outputs) is done on both the client (`chat-interface.tsx`) and the server (`app/api/chat/route.ts`) independently using similar but separately maintained logic — a shared utility would reduce the risk of divergence
- The `canStartSession` detection in `app/api/chat/route.ts` uses a hardcoded regex (`/\b(yes|yeah|yep|ok|okay|sure...)\b/`) which may miss non-English confirmations in multi-language contexts, or trigger on unintended utterances
- No rate limiting or abuse protection on the `/api/chat`, `/api/speech`, or `/api/transcribe` endpoints
- Only two voices are hardcoded by ElevenLabs voice ID (`93nuHbke4dTER9x2pDwE` for male, `21m00Tcm4TlvDq8ikWAM` for female); no language-matched voice selection, which may produce accented or mismatched TTS for non-English target languages
- The `proxy.ts` file exports a `proxy` function but is not used as the Next.js middleware (`middleware.ts` is the expected filename); it is unclear whether route protection is actually active in the deployed build
- The README mentions "Next.js 16" but Next.js 16 is not yet a released major version (the current stable is 15); this appears to be a documentation error reflecting a pre-release or experimental version

## Detailed Reasoning

**Technical Architecture and Code Quality**

SpokeAI demonstrates a genuinely high level of technical sophistication for a 48-hour hackathon. The central `app/api/chat/route.ts` file (547 lines) is the most complex piece and it holds together well. The `buildSystemPrompt` function constructs a context-aware prompt that accounts for three Boolean session states (`sessionActive`, `canStartSession`, `shouldEndSession`), the user's profile, and strict TTS-compatibility rules. The `buildTools` factory creates properly scoped tool definitions using Zod schemas, with `end_session` calling both Supermemory writes (`saveSessionRecap`, `saveUserProfile`) and a PostgreSQL update in its execute handler. The `stopWhen: stepCountIs(5)` guard prevents runaway multi-step loops.

The voice interface in `chat-bottom-bar.tsx` is the second major technical achievement. The auto mode creates a persistent `MediaRecorder` with a 250ms timeslice for cross-browser reliability, connects a `AnalyserNode` in an `AudioContext` to measure RMS amplitude via `getFloatTimeDomainData`, and uses a `requestAnimationFrame` loop to detect 2 seconds of continuous silence after speech is first detected. After transcription, a new recorder starts immediately and the loop resumes. Cleanup on unmount properly stops all tracks and closes the audio context. This is careful, production-grade browser API usage.

The TTS playback in `chat-interface.tsx` includes a thorough deduplication system: per-message signature tracking (`lastSpokenSignatureRef`), in-flight guard (`inFlightSignatureRef`), canonical text normalization (NFKD + strip diacritics + lowercase + strip punctuation), and a 20-second recency window to prevent the same text being spoken twice in quick succession. The special case for `end_session` — where TTS is allowed to start even while the tool is still saving — shows attention to UX latency concerns.

**Memory System**

The `lib/memory.ts` module implements a two-document-per-user scheme in Supermemory: a profile document and a sessions document, each identified by a fixed `customId` (`profile-{userId}` and `sessions-{userId}`). This allows deterministic upserts without needing to query first, and sidesteps the need for semantic search. The profile serialization format (`Level: X\nStrengths: A | B\nWeaknesses: C | D`) is simple and brittle — a single pipe character in a strength or weakness description could corrupt parsing — but it works for the expected content. The merge logic in `saveUserProfile` correctly deduplicates and prevents items from appearing in both strengths and weaknesses simultaneously. A 4-second timeout on memory reads prevents slow external API calls from blocking the main request.

**Creativity and Product Cohesion**

The expression tag system deserves specific mention. The system prompt defines a whitelist of tags (`[excited]`, `[laughs]`, `[pauses]`, `[hesitates]`, etc.) that the LLM is instructed to embed in its plain-text output. The client then strips them before displaying (`stripExpressionTags` in `chat-messages.tsx`) and also strips them before TTS synthesis (`extractAssistantText` in `chat-interface.tsx`). The intent is that ElevenLabs would interpret these as emotional cues — though the current ElevenLabs `eleven_flash_v2_5` model may not actually process these tags in the way the developer intended. Even if the TTS does not respond to them, they do not degrade the experience since they are stripped before display and synthesis.

The AI-generated topic cards (using `generateObject` with a `topicSchema` in `lib/session-cards-actions.ts`) are personalized using the user's weaknesses from their Supermemory profile and a list of previously done scenarios to avoid repetition. There is a three-tier fallback: structured `generateObject`, raw `generateText` with JSON parsing, and a repair pass on the raw output. If all AI attempts fail, a static language-appropriate pool is used. This kind of defensive robustness in AI output handling is uncommon in hackathon code and shows engineering maturity.

**Gaps and Risks**

The most notable structural risk is the `proxy.ts` file, which implements middleware-style route protection logic but is not named `middleware.ts` at the root level. Next.js App Router only recognizes `middleware.ts` (or `.js`) at the project root for request-level interceptors. If this file is not exported from a `middleware.ts`, protected routes may be accessible without authentication in production. The database schema and auth setup are otherwise sound.

The regex-based session start/end detection is a pragmatic shortcut that works well for English but could misfire in multilingual contexts (e.g., the French confirmation words like "oui" and "d'accord" are included, but Arabic, Japanese, or Korean equivalents are absent). A more robust approach would have the LLM itself signal readiness to start a session rather than relying on keyword detection.

## Special Challenge Eligibility

None identified. The project does not use fine-tuning (Track 2) or on-device deployment (Track 3). It is a Track 1 submission using the Mistral cloud API.
