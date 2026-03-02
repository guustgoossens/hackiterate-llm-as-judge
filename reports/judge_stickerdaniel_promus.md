# Judge Report: Promus

**Track:** Track 1 "Anything Goes" (AWS)
**Repository:** https://github.com/stickerdaniel/promus

## Summary

Promus is an AI-powered professional task manager built as a Kanban board where an LLM agent autonomously executes tasks involving email, LinkedIn, and messaging — searching contacts, drafting messages, and sending communications on behalf of the user. The core innovation is a sandboxed code-execution architecture where the agent dynamically writes and runs Unipile SDK TypeScript code at runtime rather than relying on pre-built API wrappers. The project is exceptionally well-engineered for a 24-hour hackathon, shipping a full SaaS platform with auth, billing, admin panel, i18n, real-time DB, eval harness, and a polished frontend.

## Scores

| Criterion | Score (/25) | Justification |
|-----------|-------------|---------------|
| Technicity | 22 | The sandboxed Node VM execution engine (`src/lib/server/sandbox/script-executor.ts`) with esbuild TypeScript transpilation, blocklisted dangerous methods, and Convex Agent SDK integration is genuinely sophisticated. The eval pipeline (W&B Weave, LLM-as-judge via `mistral-large-latest`, three versioned prompt iterations in `evals/RESULTS.md`) demonstrates engineering discipline rare at hackathons. The codebase is production-grade: typed Convex schema with 12 indexed tables, Svelte 5 runes, rate limiting, streaming deltas, Playwright E2E, and a 30+ test Vitest suite for the executor. |
| Creativity | 20 | The idea of an agent that writes SDK code on-the-fly rather than calling fixed tool-wrappers is an elegant and non-obvious design choice — the "no hardcoded wrappers" principle gives it generality. Pairing a Kanban board (familiar UX) with an invisible background agent that autonomously handles professional networking tasks is a compelling product concept. The self-improvement eval loop (Claude Code queries W&B MCP, diagnoses failing traces, edits prompts, re-runs) is creative meta-engineering. The concept is grounded rather than wild, which limits the novelty ceiling slightly. |
| Usefulness | 22 | The problem is real and well-articulated: professional follow-up tasks are high-friction and perpetually delayed. Automating LinkedIn outreach, email drafting, and contact research with human-in-the-loop approval before execution directly addresses this. The target audience (networkers, salespeople, founders) is concrete. Four-column Kanban with "Prepared" as a human-approval gate is a thoughtful UX decision that mitigates AI trust concerns. The multi-account Unipile integration (Gmail, LinkedIn, WhatsApp) makes it immediately applicable to real workflows. |
| Track Alignment | 18 | The project uses AWS Bedrock (`@ai-sdk/amazon-bedrock`, `us.anthropic.claude-opus-4-6-v1` for the task agent, `us.anthropic.claude-sonnet-4-6` for support) and is hosted on Vercel with Convex Cloud, satisfying the AWS infrastructure requirement. However, the primary AI workhorse is Claude Opus (Anthropic) rather than Mistral models. Mistral appears in the eval harness (Devstral for orchestrator/executor simulation, `mistral-large-latest` as judge in `evals/scripts/run_eval.py`) and is referenced for the "Executor" role in the README, but the production agent running on the live app is Claude-backed. Devstral/Mistral plays a meaningful supporting role but is not the core production inference model. |

**Total: 82/100**

## Strengths

- The sandboxed VM executor (`script-executor.ts`) is production-quality: esbuild TS transpilation, method blocklist for destructive SDK operations, 15-second timeout, captured console output, and 30+ unit tests covering sandbox isolation, error propagation, timeout, and SDK facade exposure.
- Three full iterations of a W&B Weave eval pipeline (plan quality, code quality, step overlap, SDK call accuracy) with documented improvements from 0% to ~85-92% on key metrics — rare discipline at a hackathon.
- Convex schema (`schema.ts`) is carefully designed with 12 distinct tables and thoughtful indexing for support threads, audit logs, billing notifications, and Unipile OAuth flows — not throwaway demo data.
- The `saveBoard` mutation in `todos.ts` implements atomic task change detection that automatically triggers agent threads on new tasks or user-initiated moves/edits, creating a seamless reactive loop.
- Full SaaS platform shipped: email/password + Google OAuth + passkeys auth (Better Auth), Stripe billing via Autumn, Resend email with webhook tracking, PostHog analytics with Cloudflare proxy fallback, Tolgee i18n (EN/DE/ES/FR), admin panel with audit logs and impersonation, Playwright E2E tests.
- Svelte 5 runes syntax used correctly throughout (`$state`, `$derived`, `$effect`, `$props`), demonstrating familiarity with cutting-edge tooling.
- The "no emoji in agent output" styling constraint and concise note format (2-4 bullets) in `agent.ts` shows attention to UX quality in AI-generated content.
- Security-conscious: destructive Unipile methods (`delete`, `reconnect*`, `update`) are blocklisted in `ACCOUNT_BLOCKLIST`/`EMAIL_BLOCKLIST` before the VM facade is injected.

## Areas for Improvement

- The primary production agent uses Claude Opus via AWS Bedrock rather than a Mistral model, which weakens alignment with the Mistral hackathon's spirit. Devstral is used only in the offline eval, not in the live agent.
- The `llmProvider.ts` file uses `any` type casts (`getTaskLanguageModel() as any`) to bridge the Convex Agent SDK with the Bedrock adapter, suggesting incomplete type integration.
- The Daytona sandbox integration described in the README and `plan.md` (Mistral Vibe CLI running inside a cloud sandbox) appears to be the originally planned architecture but is not present in the shipped code — the actual executor is a Node VM on the SvelteKit server. The README's reference to "Daytona sandbox + Mistral Vibe CLI (Devstral)" as the Executor does not match the code.
- The eval harness simulates the orchestrator/executor as two separate Devstral calls, but the production agent is a single Claude Opus agent with tools — the eval does not actually test the production code path.
- `supportAgent` in `src/lib/convex/support/agent.ts` has outdated instructions referencing "single agent architecture: Claude Opus" and "Claude Opus generates and executes Unipile SDK code directly in a sandboxed Node VM" — partially reflecting a prior architecture rather than the current two-agent design.
- No rate limiting is applied to the `triggerAgentForNewTask` action, meaning creating many tasks quickly could generate unbounded Bedrock API costs.
- The community chat feature is functional but lightly integrated with the core value proposition — it reads more as a template feature than a deliberate product decision.

## Detailed Reasoning

**Architecture and Core Agent Design**

The central technical contribution of Promus is its approach to tool execution. Rather than pre-building a set of fixed API-calling functions, the task agent (`src/lib/convex/todo/agent.ts`) is given the full Unipile SDK reference as part of its system prompt and instructed to write TypeScript code on-demand. This code is then sent to the `executeUnipileCode` tool, which POSTs it to `/api/sandbox/execute`. That endpoint (`src/routes/api/sandbox/execute/+server.ts`) invokes `executeScript()` from `src/lib/server/sandbox/script-executor.ts`, which transpiles the TypeScript with esbuild, creates a `vm.createContext()` with only the whitelisted globals and the Unipile SDK facade, wraps the code in an async IIFE, and runs it with a 15-second timeout using `Promise.race()`.

The facade construction in `createUnipileFacade()` is thoughtful: it uses `Object.getOwnPropertyNames(Object.getPrototypeOf(resource))` to enumerate SDK methods, filters out blocklisted destructive operations, and binds each function to its resource. This means the agent cannot call `unipile.account.delete`, `unipile.email.update`, or `unipile.account.reconnect*` even if it tries to. The blocklists are tested explicitly in the Vitest suite. This is a security-forward design for a hackathon project.

**Convex Agent Integration and Reactive Board**

The Convex Agent SDK (`@convex-dev/agent`) is used well. Thread creation, streaming deltas with `saveStreamDeltas: { chunking: 'line', throttleMs: 100 }`, and the `listMessages` query that merges paginated history with live `syncStreams()` are all correctly implemented. The `saveBoard` mutation in `todos.ts` is the reactive heart of the system: on every board save, it compares old and new task states, detects column changes and notes changes, and schedules `triggerAgentForNewTask` or `triggerAgentForTaskUpdate` atomically via `ctx.scheduler.runAfter(0, ...)`. Because this is inside a Convex mutation, the scheduler call is transactional — if the mutation rolls back, the scheduled action does not fire.

The board model itself is well-designed: tasks are stored as a flat array in a single `todoBoards` document per user, with `columnId` and `order` fields providing the Kanban view. The `toBoard()` and `sanitizeAndFlattenBoard()` functions handle serialization and validation, including duplicate ID detection.

**Eval Pipeline and Self-Improvement Loop**

The `evals/` directory contains a complete Python eval harness using W&B Weave (`weave.op()` decorators on all scorer functions). `run_eval.py` uses `devstral-small-latest` for both the orchestrator (plan decomposition) and executor (code generation) steps, and `mistral-large-latest` as the LLM judge in `plan.py` and `code.py`. The three versioned iterations in `RESULTS.md` show real debugging work: discovering that Devstral wraps JSON in markdown fences (causing silent parse failures), adding `strip_markdown_fences()`, iterating on prompt constraints (requiring `[emails.list]` SDK method prefixes), and shifting from first-step-only to full-task code generation. The v3 results — 89.4% code quality, 91.7% SDK correctness, 96.7% code completeness — are strong.

The self-improvement loop described (`Claude Code queries W&B MCP → finds lowest-scoring tasks → diagnoses trace → edits prompts → re-run`) is a meta-engineering pattern that adds genuine hackathon interest, even if it lives outside the core app code.

**Mistral Integration Assessment**

This is where alignment becomes nuanced. The production task agent running at `src/lib/convex/support/llmProvider.ts` uses `bedrock('us.anthropic.claude-opus-4-6-v1')` for task execution and `bedrock('us.anthropic.claude-sonnet-4-6')` for support. Mistral's Devstral model is used in the eval harness (`devstral-small-latest`) and referenced in the README as the "Executor" — but this refers to an originally-planned architecture (Daytona cloud sandbox + Mistral Vibe CLI) that does not appear to be implemented in the shipped code. The `.claude/plan.md` file confirms this was the planned Daytona/Vibe integration, and the UI references "Devstral 2" in `tech-slide.svelte`, but the actual `script-executor.ts` runs a local Node VM, not a Daytona sandbox. This gap between stated and actual Mistral integration slightly reduces track alignment, but the eval use of Mistral models and the genuine exploration of Devstral as an orchestrator/executor are meaningful contributions.

**Code Quality and Production Readiness**

The codebase demonstrates consistently high quality. The Svelte 5 runes syntax is used correctly; individual icon imports prevent barrel import bloat; `data-testid` conventions are applied systematically for E2E tests; Tolgee localization covers all four languages with structured key naming; the admin panel includes audit logs with typed metadata per action (not `v.any()`); and the `adminNotificationPreferences` table with debounced pending notifications via `_scheduled_functions` cancellation shows real platform understanding. For a 24-hour project, the polish and completeness are exceptional.

## Special Challenge Eligibility

The project uses W&B Weave for eval tracing and scoring (Track 2 / W&B challenge), though it does not fine-tune any Mistral models — the eval is an inference-based LLM-as-judge loop, not fine-tuning. It uses AWS Bedrock as its primary LLM inference backend (Track 1 / AWS challenge). No on-device or edge deployment is present (Track 3 / NVIDIA not applicable).

**W&B Track 2 partial eligibility**: The project uses W&B Weave for agent evaluation and has a documented self-improvement loop, but does not perform fine-tuning. This likely does not qualify for the Fine-Tuning track prize but may be relevant for any W&B observability or eval-focused side challenges.
