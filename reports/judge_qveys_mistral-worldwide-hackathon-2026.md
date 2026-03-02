# Judge Report: qveys/Mistral-Worldwide-Hackathon-2026

**Track:** Track 1 — "Anything Goes" (AWS)
**Repository:** https://github.com/qveys/Mistral-Worldwide-Hackathon-2026

## Summary

EchoMaps is a voice-first project planning application that transforms spoken or typed "brain dumps" into structured, AI-generated roadmaps in real time. The system uses Voxtral (Mistral's real-time speech-to-text WebSocket API) for transcription and Mistral Large 3 via AWS Bedrock for roadmap structuring, with a polished Next.js 16 frontend and a typed Express/TypeScript backend. The project is technically well-executed for a 48-hour hackathon, featuring dependency graph visualization, topological cycle detection, multi-view project pages, and a shared monorepo schema package.

## Scores

| Criterion | Score (/25) | Justification |
|-----------|-------------|---------------|
| Technicity | 21 | The project demonstrates genuine technical depth: real-time PCM audio streaming over WebSocket to Voxtral (`useVoxtralSTT.ts`, `transcribe.controller.ts`), Zod-validated LLM output with an automatic retry loop (`structure.controller.ts`), cycle detection with DFS (`dependencyGraph.ts`), a dual S3/local storage backend, JWT auth middleware, and shared Zod schemas across frontend and backend via a monorepo workspace (`@echomaps/shared`). TypeScript strict mode is used throughout. The main deduction is the absence of tests and some unpolished areas such as passwords stored in plaintext in `users.json`. |
| Creativity | 19 | The combination of Voxtral real-time STT piped directly into a structural planning LLM with three distinct graph visualization modes (dependency graph, knowledge graph with clickable resource nodes, and planning timeline) is genuinely creative. The "brain dump" metaphor is well-executed and the knowledge graph that connects objectives, tasks, and AI-generated resource links is a novel touch. The concept is not entirely original (voice-to-task tools exist), but the specific integration pipeline and the richness of the output views set it apart within the hackathon context. |
| Usefulness | 20 | EchoMaps addresses a real pain point: rapidly converting unstructured thoughts into actionable project plans. The user flow (speak → transcribe → structure → review → revise) is coherent and practical. The export to Markdown, interactive task status updates, dependency tracking, and AI-powered conversational revision (`POST /revise`) all add genuine utility. The app supports both English and French through `next-intl`, broadening its audience. The main limitation is that the activity feed and some dashboard metrics appear to be mock/static data, which reduces real-world completeness. |
| Track Alignment | 21 | Track 1 (Anything Goes / AWS) is a strong fit: the application is built on AWS Bedrock for Mistral Large 3 inference with optional S3 storage and is deployable via the included Dockerfile and Amplify mention. The project is ambitious (full-stack monorepo, voice pipeline, multiple visualization modes) and creatively uses Mistral's own Voxtral STT model alongside Mistral Large 3 for structuring. The project would benefit from a live demo link or deployment evidence, but the infrastructure scaffolding (S3, Bedrock, Amplify) is present in code. |

**Total: 81/100**

## Strengths

- Real-time PCM audio capture, downsampling, and WebSocket streaming to Voxtral is a technically challenging pipeline implemented cleanly in both frontend (`useVoxtralSTT.ts`) and backend (`VoxtralService`, `TranscribeController`).
- Zod schema validation of all LLM outputs with an automatic retry prompt (`buildRetryPrompt`) when parsing fails is a mature LLM integration pattern that demonstrates reliability awareness.
- Dependency cycle detection via DFS (`hasCycle` in `dependencyGraph.ts`) prevents the AI from generating invalid task graphs — a thoughtful safety check.
- Monorepo architecture with a shared `@echomaps/shared` package ensures type safety across frontend and backend using a single source of truth for schemas.
- Four visualization modes on the project page (grid, dependency graph, knowledge graph, planning timeline) with ReactFlow + dagre auto-layout show real frontend craftsmanship.
- The knowledge graph uniquely includes AI-generated resource nodes (docs, tutorials) attached to tasks, creating a richer learning artifact from a plain brain dump.
- Bilingual support (English/French) via `next-intl` with complete message catalogs.
- Docker support and AWS infrastructure configuration (S3, Bedrock, Amplify) are production-oriented additions for a hackathon.
- The `revisionHistory` field in the schema and `POST /revise` endpoint show a design orientation toward iterative refinement rather than one-shot generation.

## Areas for Improvement

- Passwords in `auth.controller.ts` are stored and compared in plaintext in `data/users.json` — a significant security oversight. Even in a hackathon, bcrypt hashing should be applied.
- The `handleRevision` callback in the project page (`app/[locale]/project/[id]/page.tsx`) is a no-op (`useCallback<(revision: string) => void>(() => {}, [])`), meaning the revision input UI is rendered but does not actually call `POST /revise`. This is an incomplete feature.
- The activity feed, dashboard statistics, and timeline page use hardcoded mock data from the i18n translation files and `activity.constants.ts` rather than real data from the backend.
- No automated tests are present (`"test": "echo \"Error: no test specified\" && exit 1"`), which limits confidence in correctness especially for the graph algorithms and LLM parsing logic.
- The `topologicalSort` function is implemented but never called at runtime — only `hasCycle` is invoked. The sort could be used to present tasks in execution order.
- There is no rate limiting or cost-control mechanism on the Bedrock endpoints, which would be important in any real deployment.
- A live demo URL is not provided, making it impossible to verify the running state of the application.
- Audio processing uses the deprecated `ScriptProcessorNode` API (noted in a comment in the code itself) instead of the recommended `AudioWorkletNode`, which may cause issues in future browsers.

## Detailed Reasoning

**Technicity (21/25):** The backend is architecturally clean: a structured Express app with controller/service/route separation, proper CORS configuration, JWT authentication middleware with UUID-regex payload validation, and a structured JSON logger. The Bedrock service (`bedrock.service.ts`) demonstrates good LLM integration hygiene: it wraps `InvokeModelCommand`, logs latency, parses the chat response format correctly for Mistral Large 3 (`mistral.mistral-large-2407-v1:0`), and includes a utility to strip markdown fences from LLM output before JSON parsing. The retry loop in `structure.controller.ts` is particularly notable: if the first Zod parse fails, the controller extracts the ZodError message and sends it back to the model with the original output and the schema definition, giving the model a precise error to fix. This is a production-ready pattern. The cycle detection in `dependencyGraph.ts` correctly implements three-colour DFS (WHITE/GRAY/BLACK). The topological sort using Kahn's algorithm (BFS with in-degree tracking) is also correctly implemented. The `StorageService` supports both local filesystem and AWS S3 with a shared index file and a write-lock queue to prevent concurrent write races. These details show careful engineering. The main deductions are the plaintext password storage, the complete absence of tests, and the unimplemented revision endpoint hook in the frontend.

**Creativity (19/25):** The EchoMaps concept is well-differentiated within the hackathon. Most voice-to-task tools stop at transcription; this project layers Mistral Large for structured extraction, adds dependency modeling with cycle prevention, and then renders three distinct graph types. The knowledge graph (`KnowledgeGraph.tsx`) is the most creative element: it renders objectives as indigo nodes, tasks as status-colored nodes, and AI-generated reference resources as clickable teal leaf nodes, with separate edge types for objective-to-task connections, task dependency edges (dashed), and task-to-resource edges. The dagre auto-layout with a post-processing overlap removal pass (`getLayoutedElements`) shows attention to visual quality. The planning feature — which asks the model to distribute tasks across AM/PM calendar slots respecting dependencies — is another creative application of the LLM beyond simple generation. The naming ("Brain Dump Engine", "Neural Refinement", "EchoMaps") and overall design language give the project a distinct identity.

**Usefulness (20/25):** The core value proposition is solid and the user journey is well-designed. A user can speak for 30 seconds, stop the microphone, and receive a structured plan with objectives, prioritized tasks, size estimates (S/M/L), dependency links, and optionally a day-by-day schedule — all in under a minute. The ability to export the resulting roadmap to Markdown (with a locale-aware table of tasks, linked resources, and a planning section) is a concrete deliverable. The conversational revision feature (`POST /revise`) is architecturally sound and the prompt engineering (`revise.prompt.ts`) correctly instructs the model to preserve `projectId`, `createdAt`, and `brainDump` while appending to `revisionHistory`. The main limitation on usefulness is that this revision feature is not wired up in the deployed frontend code (the callback is empty). Additionally, the dashboard activity, statistics, and secondary timeline page show static mock data, which means the full application experience is only available on the project detail page.

**Track Alignment (21/25):** The submission fits Track 1 well. It is ambitious — a full-stack, production-oriented monorepo with voice input, dual AI models (Voxtral STT + Mistral Large structuring), interactive visualizations, and AWS infrastructure. The AWS integration is genuine: Bedrock is the primary LLM inference path, and the storage service is designed to use S3 in production (`S3_BUCKET_NAME` env var). The Dockerfile targets production deployment, and the README mentions AWS Amplify for hosting. The hackathon theme of using Mistral APIs/models is fully satisfied: both `@mistralai/mistralai` (for Voxtral real-time transcription) and AWS Bedrock (for Mistral Large) are present as runtime dependencies, and the integration code is not trivial scaffolding. The slight deduction is due to the lack of a live deployment link and the incomplete revision feature, which diminish the "impactful" criterion of the track.

## Special Challenge Eligibility

None identified. The project uses both AWS Bedrock (Mistral Large) and Voxtral, placing it squarely in Track 1. No fine-tuning or on-device deployment patterns are present.
