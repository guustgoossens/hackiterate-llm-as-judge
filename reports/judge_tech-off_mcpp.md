# Judge Report: MCPP — Model Context Protocol Plugin

**Track:** Track 1 "Anything Goes" (AWS)
**Repository:** https://github.com/Tech-Off/mcpp

---

## Summary

MCPP is an open-source framework that bridges the Model Context Protocol (MCP) with any website by using a Chrome extension as a transparent execution layer. The user's authenticated browser session replaces OAuth and API integrations entirely, so any AI agent (Mistral, Claude, or any MCP-compatible LLM) can interact with websites through the user's live session cookies. The reference implementation ships with 10 LinkedIn-specific tools covering profiles, posts, messaging, job search, and social actions.

---

## Scores

| Criterion | Score (/25) | Justification |
|-----------|-------------|---------------|
| Technicity | 20 | The architecture is well-layered and non-trivial: NestJS backend with a proper module separation (Auth, Device, Command, MCP), a real-time WebSocket gateway with database-backed leader election using optimistic concurrency (`tryAcquireLease` query in `user-runtime.repository.ts`), a dual MCP transport (Streamable HTTP + SSE legacy), a command-awaiter pattern with timeout, and a Manifest V3 Chrome extension built with Rollup + Vite. Code quality is high with typed interfaces throughout. Minor deductions for the in-memory command store (no persistence) and some `@ts-ignore` annotations in `mcp.service.ts`. |
| Creativity | 21 | The core insight — using the browser session as the authentication and execution layer to make any website MCP-compatible without OAuth or scraping — is genuinely novel and elegant. The leader election pattern applied to browser tabs is an unusual and clever adaptation of distributed systems concepts to a client-side context. The combination of MCP + Chrome Extension + WebSocket relay is an unexpected and inventive stack choice that solves a real friction point in AI agent integration. |
| Usefulness | 18 | The template addresses a genuine and widespread pain point: connecting AI agents to websites that have no public API or rate-limited official APIs. The LinkedIn reference implementation with 10 tools (profile fetch, people/content/job search, send message, like, comment) is practically usable for sales automation, recruiting, and outreach workflows. The framework's "clone and fill two files" promise makes it accessible. However, the approach inherently requires a running browser and extension, which limits headless/server-side deployment scenarios, and the LinkedIn tools operate in a legal grey area regarding ToS. |
| Track Alignment | 14 | The project is submitted to Track 1 ("Anything Goes") and correctly uses MCP as the interface for any MCP-compatible LLM including Mistral. However, Mistral integration is indirect — the project is an MCP server that any model can call, rather than one that specifically integrates or showcases Mistral's own APIs, models, or distinctive features. The README references Mistral as a consumer of the MCP interface but there is no Mistral SDK call, no `mistral-large` or any model invocation, no use of Mistral's function calling or agents API in any source file. This weakens track alignment somewhat. |

**Total: 73/100**

---

## Strengths

- The architectural pattern (browser-as-API-gateway via MCP) is a genuinely original idea with broad applicability beyond the LinkedIn demo
- Leader election is implemented rigorously with database-level optimistic locking (`createQueryBuilder().update(...).andWhere('leader_lease_until < NOW() OR leader_device_id = :deviceId')`) and heartbeat renewal, a level of correctness rarely seen in hackathon projects
- The project cleanly separates concerns: MCP protocol handling (`mcp.service.ts`), command lifecycle (`command.service.ts` + `command-awaiter.service.ts`), device management (`device.gateway.ts`), and tool definition/execution (server `tools.ts` + browser `tools.js`)
- The `CommandAwaiterService` pattern — creating a Promise that is resolved when the WebSocket `command:done` event arrives, with a 60-second timeout — is a clean async bridge between HTTP and WebSocket layers
- Database schema migrations are managed with Liquibase changesets (`001-create-users-table.xml`, `002-create-devices-tables.xml`) with proper rollback definitions, showing production-ready discipline
- The dual MCP transport support (Streamable HTTP for modern clients, SSE for legacy ones) in `mcp.controller.ts` shows protocol awareness
- The extension popup (React 18 + Tailwind + Radix UI) is polished, with a full `ApiTestPage.tsx` that allows interactive testing of all 10 LinkedIn tools directly from the popup
- The README is exceptionally well-written with ASCII architecture diagrams, a 7-step data flow explanation, and a clear "build your own MCPP in two files" guide

---

## Areas for Improvement

- **Mistral integration is absent from the codebase.** There are no calls to Mistral's API, SDK, agents, or models anywhere in the repository. For a hackathon explicitly judging Mistral use, this is the most significant gap. Adding even a simple `mistral-large` call for summarisation or a Mistral Agents integration would strengthen the submission considerably.
- The command store in `command.service.ts` is an in-memory `Map`, meaning commands are lost on server restart and the system cannot scale horizontally without the Redis adapter mentioned only as a comment in `device-connection.store.ts`
- The `tools.js` file (the actual browser-side LinkedIn tool implementations) is referenced extensively in the README and in `command-executor.js` but is not present in the repository on the `main` branch — only `tools_example.js` exists. The README acknowledges the full implementation is on a `linkedin` branch, which is not publicly accessible from the repository listing
- `linkedin-api-messenger.js` imports from `./linkedin-api.js` but that file does not exist in the repository, meaning the content script would fail to load as-is
- No unit or integration tests beyond the default NestJS e2e stub (`test/app.e2e-spec.ts`)
- The API key is stored as a plain UUID in the database with no hashing, reducing security if the database is compromised
- Comments and some UI labels are in French (`[Election] 👑 Ce device est LEADER`), reducing accessibility for an international audience

---

## Detailed Reasoning

**Architecture and Technical Depth**

The system is built across three well-defined layers. The NestJS server (`server/src/`) handles MCP protocol exposure, authentication, device registration, and command dispatching. The Chrome extension (`plugin/`) acts as the execution engine, routing tool calls into the user's browser context. PostgreSQL persists users, devices, and leader state.

The most technically impressive component is the leader election system in `device.gateway.ts` and `device.service.ts`. When multiple browser tabs connect via WebSocket, only one is designated the leader and receives `work:available` events. Leadership is tracked with a database lease (`user_runtime` table, `leader_device_id`, `leader_lease_until` columns). The `tryAcquireLease` method in `user-runtime.repository.ts` uses a conditional SQL UPDATE that is effectively a compare-and-swap: it only sets the leader if the current lease is null, expired, or already owned by the requesting device. This prevents race conditions between concurrent tab connections in a way that a naive in-memory approach would not. The heartbeat renews the 30-second lease every 20 seconds, ensuring continuity while providing an automatic failover when a tab closes.

The MCP layer in `mcp.service.ts` creates a new `Server` instance per HTTP request for Streamable HTTP transport (stateless, correct) and maintains persistent sessions for SSE transport (map of `sseSessions`). Tool registration happens at module init time in `mcp.module.ts`, where each raw tool definition from `tools.ts` is wrapped in a `LlmMcpProxyTool` adapter that translates between the flat parameter schema and MCP's JSON Schema `inputSchema` format.

**The Browser Execution Bridge**

The `command-awaiter.service.ts` is a concise and elegant pattern: `waitForCommand()` returns a Promise stored in a Map, and `resolveCommand()` is called by `CommandEventHandlerImpl.onCommandDone()` when the WebSocket delivers the result. The 60-second timeout is handled with a `setTimeout` that auto-resolves the Promise with a failure. This allows the MCP HTTP request to `await` a result that is fulfilled asynchronously over a WebSocket — bridging two fundamentally different transport paradigms.

On the extension side, `server-connection.js` manages the Socket.IO connection, heartbeats, and the `_handleWork` method that delegates to `CommandExecutor.execute()`. The `CommandExecutor` simply looks up the tool by name in `getRealToolByName()` and calls `tool.execute(payload)`. The CORS policy in `device.gateway.ts` explicitly allowlists `linkedin.com` and `localhost`, which is appropriate for the reference implementation.

**What Is Missing**

The most glaring gap relative to the hackathon judging criteria is the complete absence of any Mistral model integration. The project positions itself as "Powered by Mistral AI" in the README badge, but no Mistral API call, SDK import, or model invocation exists anywhere in the codebase. The MCP server is model-agnostic by design, which is architecturally sound, but the hackathon specifically rewards Mistral integration. A Mistral Agents or function-calling integration — for example, an agent that is pre-configured with the MCPP tools and accessible from the popup — would have significantly improved the submission.

Additionally, the `main` branch is missing the actual LinkedIn tool implementations that give the project its most compelling demonstration. `linkedin-api-messenger.js` imports `./linkedin-api.js` which does not exist in the repository, and `tools.js` (the browser-side tool registry used by `CommandExecutor`) is also absent. The README explicitly states the LinkedIn implementation lives on a separate `linkedin` branch. Judging is based on what is in the repository, so this is a material gap: the reference implementation described at length in the README cannot actually run from the main branch.

**Code Quality**

The TypeScript is well-typed overall. Services are injectable and follow NestJS dependency injection patterns. Exception classes are domain-specific (`DeviceNotFoundException`, `LeaseAcquisitionFailedException`, `UserAlreadyExistsException`). The `DeviceConnectionStore` uses three coordinated Maps for O(1) lookup by deviceId, socketId, and userId. The `truncateData` utility in `tool-executor.service.ts` caps result payloads at 8,000 characters before returning to the LLM, which is a practical consideration. The `// @ts-ignore` annotations on MCP SDK imports are minor but suggest the SDK lacks type declarations for this usage pattern.

---

## Special Challenge Eligibility

None identified. The project does not explicitly target fine-tuning, on-device deployment, or any named sponsor challenge. The AWS track would require evidence of AWS deployment or use of AWS services, which is not present in the repository.
