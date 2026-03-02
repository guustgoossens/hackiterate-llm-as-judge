# Judge Report: vibers-money

**Track:** Track 1 "Anything Goes" (AWS)
**Repository:** https://github.com/William-muskus/vibers-money

## Summary

Vibers is an autonomous business creation platform that lets a user describe a business idea in plain language and immediately spawns a swarm of Mistral-powered AI agents (CEO, Security Director, CTO, Marketing Director, Product Director, Finance Director, and specialist roles like Community Manager) that work 24/7 to stand up the company. The stack is a TypeScript monorepo with four microservices: a Next.js frontend, an Express orchestrator, a custom Swarm Bus MCP server, and a Computer Use MCP server for browser automation. The project is ambitious, deeply integrated with Mistral's tooling, and delivers a cohesive real-time multi-agent product with genuine depth.

## Scores

| Criterion | Score (/25) | Justification |
|-----------|-------------|---------------|
| Technicity | 22 | Four well-structured TypeScript packages with clear separation of concerns; custom MCP server implementation for agent messaging and browser automation via CDP; SSE streaming architecture; ring-buffer activity logs; vitest test suites across all packages; Handlebars-templated workspace provisioning. The codebase is genuinely complex and well-executed for a hackathon window. Slight deductions for in-memory-only state (no persistence layer) and incomplete Stripe wallet balance aggregation noted in the README. |
| Creativity | 21 | The core idea — "describe a business, get an autonomous org" — is a novel and memorable combination of multi-agent orchestration, business process automation, and vibe coding culture. The self-configuring skill system (agents write their own `.vibe/skills/` files to improve across cycles), the hierarchy-enforced inter-agent message bus, and the live org-chart/mosaic dashboard are genuinely inventive. Points held back because agent-to-external-service integration (email, X/Twitter) relies on agents using Computer Use rather than pre-built connectors, which is creative but also fragile. |
| Usefulness | 20 | The target audience (builders who want to launch a business without doing all the ops themselves) is well-defined and plausible. Stripe Checkout and Connect integration for per-business funding is production-grade thinking. Real-time CEO chat, pause/resume controls, QR code sharing, and admin mosaic make the UX genuinely usable beyond demo purposes. The largest gap is that the agent work (posting to X, creating email) is still dependent on successful Computer Use automation in a live browser, which limits reliability in practice. |
| Track Alignment | 21 | Firmly Track 1: Mistral API is the sole LLM provider via Mistral Vibe CLI; `labs-devstral-small-2512` is used for developer roles (CTO, Security, Product) and `mistral-small` for others; AWS Bedrock gateway is an optional alternative path (`USE_AWS_BEDROCK`, `BEDROCK_GATEWAY_URL`). Integration is deep — every agent process wraps the `vibe` CLI. The AWS angle is secondary (the Bedrock path is optional and not the default), which is fine for Track 1 but prevents a higher score on this axis. |

**Total: 84/100**

## Strengths

- Exceptionally well-architected for a hackathon: four clean microservices with typed interfaces, proper ESM modules, and no shortcuts visible in the core logic.
- The Swarm Bus MCP is a custom, purpose-built Model Context Protocol server exposing 15+ tools (messaging, spawning, budget, escalation, scheduling, status) — not a wrapper around an existing library.
- Hierarchy-enforced inter-agent messaging (`router.ts`): CEO can message anyone; department managers can only message their parent (CEO) or their own children; specialists can only message their parent. This prevents agent communication chaos in a multi-agent system.
- Self-configuring agents: on first spawn, each director writes its own skills to `.vibe/skills/` and its own task list via `todo_add`, making the system extensible without centralized skill management.
- Computer Use MCP is implemented from scratch using CDP (Chrome DevTools Protocol) with annotated screenshots (numbered element overlays drawn in canvas), iframe-aware element querying, and per-agent tab management — this is significant engineering depth.
- Real test coverage: `vitest` suites for the orchestrator API, swarm bus store, registry, and budget tools. Tests use mocking correctly and cover both happy paths and error cases.
- Production-readiness thinking: Dockerfiles for orchestrator and Swarm Bus, deployment docs for Vercel + Railway/Render/AWS Amplify, domain allowlisting for browser tools, session-based ownership/access control for businesses, and pause/resume controls for agent loops.
- Thoughtful prompt engineering: the CEO mission prompt (`spawner.ts` lines 100–120) is detailed, covers edge cases (spawn order, not repeating questions, escalation policy, security guardrails), and is cleanly separated from the hackathon demo overlay via an env flag.

## Areas for Improvement

- All state (agent registry, inboxes, budgets, escalation pending, scheduled events) is in-memory only. A server restart loses all running businesses and agent state, which limits production viability.
- The Stripe "Wallet balance" UI is acknowledged in the README as not yet populated from real payment events — the finance page is wired up but incomplete.
- No authentication layer: the orchestrator API has session-based ownership for businesses but no user accounts or API keys; anyone who knows a business ID can call admin endpoints. The admin stream and stats endpoints are entirely unprotected.
- The `businesses/` directory is committed as empty placeholder; runtime-created business workspaces are not persisted across deployments in any cloud-native way.
- Computer Use browser automation (X/Twitter account creation, email setup) is inherently brittle against bot-detection, CAPTCHAs, and UI changes — the solve-captcha skill template acknowledges this but doesn't resolve it.
- The `agentsMd.hbs` template has a discrepancy: non-CEO agents get the `ask_user_question` tool described, but there is no indication this tool routes correctly through the orchestrator's SSE model to the founder chat UI; it may silently do nothing.
- No rate-limiting or cost caps at the orchestrator level — a misbehaving agent loop could exhaust the Mistral API key budget rapidly.

## Detailed Reasoning

**Architecture and Code Quality**

The monorepo is organized cleanly into four packages under `packages/`: `orchestrator`, `swarm-bus-mcp`, `computer-use-mcp`, and `frontend`. Each has its own `tsconfig.json`, `package.json`, `vitest.config.ts`, and a `src/` tree. The separation of concerns is genuine: the orchestrator manages process lifecycles and SSE streaming; the Swarm Bus handles all agent-to-agent communication and is accessed exclusively via MCP; the Computer Use MCP wraps CDP; the frontend is a pure UI layer. This is the kind of architectural discipline that is rare in hackathon projects.

The `AgentProcess` class in `packages/orchestrator/src/agent-process.ts` is the technical heart of the project. It wraps the Mistral Vibe CLI as a child process, handles NDJSON streaming output, implements a `RingBuffer<NDJSONMessage>` for SSE backfill on reconnection, manages a pending prompt queue so founder messages and Swarm Bus events wake idle agents, and implements pause/resume semaphores cleanly. The session resumption logic (`findLatestSessionId` reading from disk, then passing `--resume` on the next spawn) is a pragmatic fix for a known Vibe CLI streaming limitation (referenced as `gh#mistralai/mistral-vibe#208`), which shows the team is working at the edges of the tool and handling real integration issues.

**Swarm Bus MCP**

The Swarm Bus at `packages/swarm-bus-mcp/src/` is the most architecturally interesting component. It is a full MCP server (using `@modelcontextprotocol/sdk`) that exposes 15 tools organized into messaging, spawning, escalation, budget, scheduling, and status modules. Each tool set is a factory function returning a typed map of tool descriptors with Zod input schemas and handlers, which makes registration in `server.ts` clean and consistent. The identity system (agent ID and business ID passed via HTTP headers `X-Agent-Id` and `X-Business-Id`) is propagated using Node.js's `AsyncLocalStorage` context (`context.ts`), which is the correct pattern for per-request identity in an async environment. The debounced wake engine (`core/wake.ts`) calls back to the orchestrator's `/api/agents/:key/wake` endpoint with a 500ms debounce to avoid flooding the orchestrator with simultaneous wake calls when a broadcast message reaches multiple agents.

**Computer Use MCP**

The `packages/computer-use-mcp/src/engine/annotator.ts` implements annotated screenshots: it queries all interactive DOM elements via `getBoundingClientRect`, collects them from both the main frame and child iframes (handling CAPTCHA iframes separately), then overlays numbered blue circles on a canvas-rendered JPEG. This is a from-scratch implementation of the "set-of-marks" prompting technique commonly used in GUI agents. The tab manager (`chrome/tab-manager.ts`) gives each agent its own CDP tab, allowing multiple agents to browse concurrently without interfering. A per-agent domain allowlist (`security/allowlist.ts`) is enforced before navigation — agents can only visit domains explicitly approved when spawned.

**Agent Skill System**

The skill-templates directory contains pre-built skills in markdown (`SKILL.md` files) organized into `meta/`, `shared/`, `mcp/`, `directors/`, and `marketing/` categories. These are copied into each agent's `.vibe/skills/` workspace at spawn time. The `create-skill` meta-skill teaches the agent how to write new skills, and `update-skill` teaches it to iterate on them. The `AGENTS.md` Handlebars template instructs agents to maintain their own skill registry and update it when they add new capabilities. This creates a feedback loop where agents improve their own operating procedures over time — a genuinely interesting design decision that goes beyond simple prompt injection.

**Mistral Integration**

Mistral is used as the exclusive LLM provider through the Vibe CLI. The model selection is intelligent: `labs-devstral-small-2512` (Devstral, Mistral's code-specialized model) is assigned to `product-director`, `cto`, and `security-director` roles, while `mistral-small` handles CEO, Marketing, and Finance roles. The `config.toml.hbs` template wires the Swarm Bus and Computer Use MCPs as tool servers for every agent. The AWS Bedrock path is a genuine alternative — the `USE_AWS_BEDROCK` flag switches both the model aliases and the API gateway — though it is not the primary integration path.

**Frontend**

The Next.js frontend in `packages/frontend/` includes a home page with animated composer, a chat view with SSE-based streaming from the CEO's activity log, a business sidebar, an agent mosaic grid (showing multiple agent streams simultaneously), a Swarm Bus event feed, a finance page with Stripe Connect onboarding, and an admin mosaic page for platform-wide monitoring. The `ChatPageClient.tsx` implements resizable panels with localStorage persistence and proper React event cleanup. The frontend is polished for a hackathon product, though some pages (finance wallet balance) are wired up but not fully backed by server data.

## Special Challenge Eligibility

The project explicitly supports AWS Bedrock as an inference backend (`USE_AWS_BEDROCK`, `BEDROCK_GATEWAY_URL`), which aligns with the AWS track. The primary integration is Mistral API (Track 1 "Anything Goes"). No fine-tuning (Track 2) or on-device deployment (Track 3) components were identified.
