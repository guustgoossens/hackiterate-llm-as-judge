# Judge Report: Hackathon-Mistral-2026 (CERNO — AI Engineer Screener)

**Track:** Track 1 — "Anything Goes" (AWS)
**Repository:** https://github.com/GitHamza0206/Hackathon-Mistral-2026

## Summary

CERNO is a full-stack AI-powered technical screening platform where admins create reusable role templates from job descriptions (parsed via Mistral OCR), candidates submit their materials and enter a live voice interview conducted by an ElevenLabs conversational agent, and Mistral then generates a structured scorecard with dimensional scores, strengths, concerns, and follow-up questions. The system includes admin-vs-candidate workflows, PDF parsing, GitHub profile enrichment, bulk candidate management, SVG-based score distribution charts, a Remotion demo video generator, and AWS Bedrock as an optional inference pathway for Mistral.

## Scores

| Criterion | Score (/25) | Justification |
|-----------|-------------|---------------|
| Technicity | 22 | The engineering scope is impressive for a 24-hour build. The system spans Next.js App Router API routes, ElevenLabs WebSocket conversational AI with custom LLM integration via Mistral, Mistral OCR for PDF job description parsing (`mistral-ocr-latest`), real-time mic level metering via `AudioContext` + `AnalyserNode`, Vercel KV for persistence with a local JSON fallback, GitHub API enrichment for candidate profiles, a pre-interview mic test via `getUserMedia`, SVG score distribution histograms (zero chart library dependency), bulk session operations with `Promise.allSettled`, and a complete Remotion video project for generating a 90-second product demo. The `lib/mistral.ts`, `lib/preprocess.ts`, `lib/prompt.ts`, `lib/elevenlabs.ts`, and `lib/bedrock.ts` are all well-structured domain services. |
| Creativity | 17 | AI-powered technical interviewing is a crowded space, but CERNO executes it with several creative touches: the pre-interview checklist with automated mic testing (getUserMedia + AudioContext), real-time connection quality derived from WebSocket message gaps (>20s = poor), interview prep tips generated per focus area, and the candidate comparison dialog (side-by-side scorecard comparison for 2-3 candidates). The Remotion demo video with 15 animated scenes is an unusual and polished addition for a hackathon. The scorecard's use of transcript-only scoring (uploaded materials tailor questions but don't influence scores) is a thoughtful fairness design decision. |
| Usefulness | 20 | Technical interviewing at scale is a genuine enterprise pain point — companies spend enormous resources screening candidates before they reach human interviews. CERNO addresses this directly with a full workflow: role creation from JD → candidate intake → live voice interview → AI scorecard → bulk admin review. The admin features (kanban/table toggle, bulk actions, notification badges, download buttons, session timeline, score distribution histogram, candidate comparison) suggest product thinking beyond the MVP. The AWS Bedrock integration (`USE_BEDROCK=true`) is practical for enterprise deployment contexts where data residency matters. |
| Track Alignment | 20 | Strong Track 1 fit: the project is ambitious (full hiring pipeline), uses Mistral API extensively (OCR, preprocessing, scorecard generation, role extraction), includes AWS Bedrock as a production-ready alternative inference path, and ElevenLabs for the live voice interview layer. The AWS component (Bedrock with `mistral.magistral-small-2409-v1:0`) is genuinely integrated rather than optional decoration — it's configurable via `USE_BEDROCK=true` and routes all LLM calls through `lib/bedrock.ts`. The system targets a real enterprise use case with measurable impact. |

**Total: 79/100**

## Strengths

- Complete end-to-end hiring workflow: JD PDF → role template → candidate intake → live voice interview → AI scorecard → admin review — each step is implemented, not just sketched
- Dual inference: Mistral API (direct) and AWS Bedrock (`callBedrockMistralChat()` via AWS SDK Converse API) are both fully implemented with a `USE_BEDROCK` flag — PDF OCR always uses Mistral API even in Bedrock mode, which is a thoughtful exception
- Pre-interview checklist with automated mic testing (`getUserMedia`), browser API compatibility checks, and manual environment confirmation shows serious UX attention
- SVG score distribution histogram with no charting library — pure mathematics generating `<path>` elements — is a clean, zero-dependency solution
- Remotion video project (`video/`) with 15 animated scenes, TypeScript components, and render-to-MP4 workflow — an exceptional addition that demonstrates commitment to the full product vision
- `Promise.allSettled` for bulk operations (up to 50 sessions) with partial-failure resilience is the correct pattern for distributed operations

## Areas for Improvement

- No visible tests in the repository — the `lib/` services have no unit tests and the components have no integration tests
- GitHub enrichment is disabled by default (`ENABLE_GITHUB_ENRICHMENT=false`) and requires a separate token — this feature appears incomplete given the setup friction
- The `lib/preprocess.ts` preprocessing pipeline (candidate context → interview strategy generation) is referenced but not shown in detail in the public API routes — it's unclear how much actual prompting sophistication exists for the interview agent customization
- The role template system supports up to a fixed number of focus areas but there's no visible validation preventing over-specified templates that could make interviews too rigid
- The ElevenLabs agent flow (`POST /api/sessions/[sessionId]/start`) creates a per-session agent dynamically — at scale this could hit ElevenLabs agent creation rate limits, but no mitigation is visible

## Detailed Reasoning

CERNO's codebase reveals a team with strong product instincts and engineering depth. The architecture follows Next.js App Router conventions cleanly: each API route is in its own `route.ts` file with explicit type narrowing, admin auth checks via `isAdminRequest()` on every protected endpoint, and consistent error response patterns. The `lib/` directory is the real heart of the project: `mistral.ts` handles transcript scoring via Mistral (or Bedrock), `preprocess.ts` builds interview strategy from candidate materials, `prompt.ts` constructs the session bootstrap and system prompt, `elevenlabs.ts` manages agent creation and transcript retrieval, and `bedrock.ts` wraps AWS Bedrock's Converse API.

The `lib/bedrock.ts` implementation is notably clean: it uses the AWS SDK `BedrockRuntimeClient` with `ConverseCommand`, handles both bearer token authentication (via `AWS_BEARER_TOKEN_BEDROCK`) and IAM credentials, and logs token usage and latency. The `USE_BEDROCK=true` environment variable routes all `callBedrockMistralChat()` calls to AWS Bedrock while keeping Mistral OCR on the direct Mistral API — a pragmatic choice since Bedrock's Mistral model doesn't support OCR.

The admin console is the most feature-dense component. The `components/admin-console.tsx` implements tabbed views (Interviews, Candidates, Create Role), bulk selection with floating action bar, notification badges (localStorage-tracked last-visit timestamps), table/kanban toggle, and candidate comparison dialog. The `components/score-distribution-chart.tsx` generates pure SVG histograms with reject/review/advance zone coloring — a genuinely clever solution. The `components/session-timeline.tsx` renders a horizontal timeline of interview timestamps. The `components/pre-interview-checklist.tsx` auto-tests the microphone via `getUserMedia`, checks `MediaDevices`, `AudioContext`, and `WebSocket` API availability, and provides manual quiet-environment confirmation before allowing the interview to start.

The Remotion project in `video/` is an unexpected addition: 15 animated TypeScript scene components (`BrokenRecruitment.tsx`, `LiveInterview.tsx`, `AdminDashboard.tsx`, `Analytics.tsx`, etc.) that compose into a 90-second 1920x1080 product demo video at 30fps. This suggests the team planned a launch video alongside the hackathon demo — a level of product ambition that goes beyond typical hackathon submissions.

The main weaknesses are the absence of tests and the somewhat unclear depth of the AI personalization pipeline. The `lib/preprocess.ts` and `lib/prompt.ts` files are referenced but the sophistication of the interview strategy generation isn't fully visible from the API route code. If the system prompt for the ElevenLabs agent is a simple template rather than a deeply tailored interview plan, the core AI value proposition would be weaker than the feature surface suggests. However, given the overall engineering quality, this is likely a matter of implementation detail rather than a fundamental gap.

## Special Challenge Eligibility

**Best Voice Use Case (ElevenLabs):** Strong candidate. ElevenLabs Conversational AI is the core interview interaction layer — candidates conduct live voice interviews with an AI agent, the transcript is synced in real time, and the full conversational flow is ElevenLabs-powered. This is one of the most substantive ElevenLabs integrations in this batch.

**The Hackathon's Next Unicorn (Raise):** Plausible. AI technical screening is a real enterprise market with clear willingness to pay. The full-workflow implementation, AWS Bedrock integration for enterprise deployment, and polished admin dashboard suggest a team thinking about a real product. The demo video further signals startup ambition.
