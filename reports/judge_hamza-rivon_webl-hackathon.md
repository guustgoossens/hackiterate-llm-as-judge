# Judge Report: webl-hackathon (WEBL — AI Video Editing Platform)

**Track:** Track 1 — "Anything Goes" (AWS)
**Repository:** https://github.com/Hamza-Rivon/webl-hackathon

## Summary

WEBL is an AI-powered video editing platform that automates the entire post-production pipeline: upload a voiceover and B-roll clips, and the system uses Mistral Large 3 (via AWS Bedrock) and Voxtral (via AWS Bedrock) to transcribe, correct, semantically segment, and creatively plan how to cut B-roll to match the voiceover — replacing hours of manual editing with an automated, narrative-aware AI workflow. The system is a monorepo with an Expo React Native mobile app, an Express API with Socket.IO, BullMQ background workers (18+ job types), PostgreSQL + pgvector for embeddings, FFmpeg for rendering, and Mux for video delivery.

## Scores

| Criterion | Score (/25) | Justification |
|-----------|-------------|---------------|
| Technicity | 22 | The technical architecture is genuinely production-grade: a monorepo with 4 apps (`api`, `workers`, `mobile`, `admin`) and 2 packages (`shared`, `prisma`), BullMQ + Redis for background job orchestration with 18+ job types, FFmpeg-based video rendering pipeline, PostgreSQL + pgvector for B-roll chunk embeddings (OpenAI `text-embedding-3-large`), Mux for video CDN delivery, Clerk for auth, Vercel KV for caching. The AI pipeline has multiple Mistral stages: Voxtral transcription via Bedrock, Mistral Large 3 transcript correction, semantic segmentation, creative edit plan generation, B-roll chunk enrichment, and script alignment. The `apps/workers/src/jobs/` directory with specialized job types for each pipeline phase shows serious backend engineering. The `lib/bedrock.ts` uses the AWS SDK `ConverseCommand` with both bearer token and IAM credential support. |
| Creativity | 18 | Using Mistral as an "AI creative director" that decides how to cut B-roll to a voiceover — understanding emotional tone, narrative flow, and semantic alignment between voiceover segments and visual clips — is a genuinely creative application of LLMs. Most video AI tools focus on transcription or simple cutting; WEBL's ambition is to handle the creative editorial judgment that traditionally requires a human editor. The multi-phase pipeline (transcription → correction → segmentation → chunk enrichment → embedding → similarity search → creative plan → cut plan) mirrors a real professional video editing workflow, reinterpreted through AI. Voxtral for word-level timestamps enabling frame-accurate cuts is a smart technical pairing. |
| Usefulness | 19 | Video post-production is genuinely time-consuming and expensive — hours per minute of output for professional content. Automating the B-roll selection and cut planning stages would save real time for content creators, marketing teams, and agencies. The target audience (content creators, social media teams, marketing agencies) has strong willingness to pay for automation. The multi-AI pipeline (transcription, correction, semantic matching, creative planning) addresses the full workflow rather than one isolated task. The Expo mobile app suggests thinking about accessibility beyond desktop. |
| Track Alignment | 22 | Excellent Track 1 alignment: the project is ambitious (full video production pipeline), uses AWS Bedrock as the primary inference provider for both Mistral Large 3 and Voxtral, is impactful (video editing automation), and demonstrates creative use of Mistral for a non-chatbot application. The AWS integration is genuine — Bedrock is the primary path (`AI_PROVIDER=mistral` routes to `callBedrockMistralChat()` via the Converse API), not a fallback. The multi-provider architecture (`llmProvider.ts` with mistral/gemini/openai/runpod options) shows mature thinking about production reliability. |

**Total: 81/100**

## Strengths

- Full production-grade monorepo architecture with 4 apps, 2 packages, BullMQ background job orchestration, and 18+ specialized job types — this goes well beyond typical hackathon scaffolding
- AWS Bedrock is the primary inference provider for both LLM and transcription (Voxtral + Mistral Large 3 via Converse API), with genuine dual-credential support (bearer token or IAM)
- The multi-phase AI pipeline mirrors a real professional video editing workflow: Voxtral for word-level timestamps → Mistral for correction → segmentation → B-roll chunk enrichment → pgvector similarity search → creative edit planning → cut plan generation → FFmpeg render
- Expo React Native mobile app (`apps/mobile/`) for cross-platform access
- The `lib/bedrock.ts` service is clean, well-logged (token usage, latency, response length), and handles authentication edge cases correctly
- Multi-provider fallback architecture (`AI_PROVIDER` env var with mistral/gemini/openai/runpod options) shows production engineering maturity

## Areas for Improvement

- No tests visible in the repository — the `apps/workers/src/jobs/` pipeline has no unit or integration tests, making it difficult to verify correctness of the AI stages
- The README's architecture diagrams reference `mistral.magistral-small-2509` in the default Bedrock model env var, but calls it "Mistral Large 3 (675B)" — this is inconsistent (magistral-small is not 675B), suggesting the model configuration may have changed during development
- The mobile app (`apps/mobile/`) shows significant Vibe agent skill files (`.agents/skills/vercel-react-native-skills/rules/*.md` — 20+ rule files) and Cursor rules (`.cursor/rules`), indicating heavy AI-assisted development; the skill files are external dependencies rather than project code
- The `video_analysis` component using Qwen3-VL via Runpod is an additional dependency that complicates the setup without being a core Mistral use case
- Database setup requires Neon (PostgreSQL) with pgvector extension, Upstash Redis, Mux account, and Clerk — significant infrastructure requirements that make local setup complex
- No deployed demo URL is provided, making it impossible to test the actual video editing output

## Detailed Reasoning

WEBL's architecture reflects a team that thought seriously about production requirements. The monorepo structure with `apps/api`, `apps/workers`, `apps/mobile`, and `apps/admin` mirrors a real SaaS product layout. The separation of the Express API (request handling, Socket.IO realtime, auth) from the BullMQ workers (long-running AI/FFmpeg jobs) is the correct architectural pattern for a media processing pipeline — video transcoding and AI inference can take minutes, and blocking HTTP connections for that duration is untenable. The 18+ job types in `apps/workers/src/jobs/` each handle a specific pipeline stage, enabling independent scaling, retry logic, and failure isolation.

The AI pipeline design is sophisticated. Voxtral (via AWS Bedrock) provides word-level transcription timestamps, which are critical for frame-accurate video cuts. Mistral Large 3 then corrects transcription errors with context awareness — a useful step because Voxtral, like all STT systems, makes errors on proper nouns, technical terms, and fast speech. The semantic segmentation step uses Mistral to identify emotional tone and keyword density in voiceover segments, which drives the creative edit planning: Mistral acts as an AI creative director, deciding when to cut between B-roll clips based on narrative structure rather than simple timing heuristics. The pgvector similarity search between enriched voiceover segments and embedded B-roll chunks provides semantic alignment (a clip of "running code" matches a segment about "building fast") before the final cut plan is generated.

The `apps/workers/src/lib/bedrock.ts` service is the cleanest Bedrock integration in this batch. It uses the AWS SDK `BedrockRuntimeClient` with `ConverseCommand`, handles both `AWS_BEARER_TOKEN_BEDROCK` (hackathon-friendly) and standard IAM credential patterns, and logs token usage (inputTokens, outputTokens), latency, and response length for every call. The `AI_PROVIDER` environment variable with `mistral` (default, routes to Bedrock), `gemini`, `openai`, and `runpod` options is a mature multi-provider design that the README is explicit about.

The `.agents/skills/` directory contains a large collection of Vercel React Native skill files (20+ rule files covering animations, navigation, performance, styling, accessibility, etc.) — these are external AI agent rules that guided the mobile app development via Cursor/Vibe. While this reflects modern AI-assisted development practices, it means a significant portion of the mobile app code may be AI-generated scaffolding rather than deeply authored logic. This doesn't invalidate the work, but it's worth noting as context for the technical depth assessment.

The main open question is whether the AI pipeline actually works end-to-end to produce high-quality edited videos — the complexity of the pipeline (8+ AI calls, FFmpeg rendering, multiple external services) means any integration issue could prevent the full loop from functioning. Without a demo URL or output video artifacts, this cannot be verified. The architecture and design suggest it would work, but the inability to test is a limitation for evaluation.

## Special Challenge Eligibility

**Best Voice Use Case (ElevenLabs):** Not applicable — voice is not a user interaction modality here; Voxtral is used for transcription of uploaded audio content, not conversational interaction.

**The Hackathon's Next Unicorn (Raise):** Strong candidate. AI video editing automation addresses a large, paid market (content creation, marketing agencies, social media). The full pipeline automation from voiceover to edited video is a genuinely valuable product. The production-grade architecture suggests the team is thinking beyond a hackathon demo.
