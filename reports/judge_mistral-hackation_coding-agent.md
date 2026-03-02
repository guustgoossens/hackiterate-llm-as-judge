# Judge Report: coding-agent (CAD Studios — build123d CAD Code Generator)

**Track:** Track 1 "Anything Goes" (AWS) — Build anything with Mistral API/models
**Repository:** https://github.com/Mistral-Hackation/coding-agent

---

## Summary

This project implements a multi-agent orchestrator in Rust that autonomously generates parametric CAD code (Python `build123d` scripts) from natural language objectives. A "Conch Shell" supervisor-worker state machine routes tasks through 7 specialized agents — Researcher, Coder, and four quality-gate Reviewers — before auto-executing the output script via `uv` and launching an interactive Three.js 3D viewer in the browser. The system is technically impressive and well-architected, but it uses Anthropic Claude (via Azure MaaS) as its AI backbone, with **no Mistral API or Mistral model integration anywhere in the codebase**, which is a fundamental disqualifying issue for a Mistral Hackathon submission.

---

## Scores

| Criterion | Score (/25) | Justification |
|-----------|-------------|---------------|
| Technicity | 19 | The Rust codebase is genuinely sophisticated: a clean trait-based agent protocol (`Specialist`, `TurnResult`), `ReviewConsensus` bitmap with 4-gate quality pipeline, programmatic Python syntax linting, code sanitization, Git journaling, OpenTelemetry/OTLP tracing instrumented throughout all layers, and a self-contained Three.js STL viewer generated inline as base64-encoded HTML. Architecture is clean and production-oriented. Penalized for using Anthropic Claude exclusively and for some rough edges (e.g., coder prompt hardcodes `export_svg` which the knowledge base documents doesn't exist, creating a self-contradicting loop). |
| Creativity | 17 | The "VibeCAD" concept — generating parametric engineering CAD from natural language through an agentic loop — is genuinely creative and differentiated. The 4-reviewer quality gate (code, physics, intent, EU compliance) is an original and thoughtful design choice. The integrated 3D viewer auto-opening in the browser after code execution is a satisfying end-to-end demo moment. However, multi-agent coding assistants are a well-explored category and the specific domain (CAD code generation) was already the team's prior work (not born at the hackathon). |
| Usefulness | 18 | Parametric CAD generation via natural language solves a real pain point for engineers and makers who know what they want to build but not the build123d API. The multi-stage review pipeline (including EU regulatory checks) targets industrial use cases meaningfully. Output artifacts (STEP, STL, SVG, viewer) are practically usable. Penalized because the system requires an Azure API key (not a freely accessible Mistral endpoint), the coder prompt instructs SVG exports that don't exist in build123d (as the knowledge base itself documents), and there is no evidence of working demos or example outputs in the repository. |
| Track Alignment | 3 | This is the critical failure of the submission. The Mistral Hackathon requires use of the Mistral API or Mistral models. The entire system is hardwired to Anthropic Claude via Azure MaaS (`rig::providers::anthropic`, `AZURE_API_KEY`, `AZURE_MODEL` defaulting to `"claude-opus-4-5"`). A search for "mistral" across all source files, configs, and documentation returns zero matches. The README explicitly states "This repository intentionally uses Anthropic models via Azure MaaS only." The CHANGELOG notes fine-tuning on Mistral was attempted but abandoned. There is no Mistral integration whatsoever. |

**Total: 57/100**

---

## Strengths

- **Rust implementation quality**: Idiomatic use of `async_trait`, typestate pattern for CAD artifacts (`Blueprint` → `Draft` → `Product` → `Broken`), sealed trait for lifecycle state enforcement, and `thiserror`/`anyhow` error hierarchy. Edition 2024 features (like `is_multiple_of`) are used.
- **Layered observability**: Full OpenTelemetry integration with span taxonomy covering request root, orchestration, agent turns, and individual tool calls — instrumented via `tracing-opentelemetry` with OTLP gRPC/HTTP export to SigNoz or any compatible collector.
- **Knowledge persistence system**: Agents can save domain insights to per-agent `_learned.md` files at runtime via `LearnKnowledge`, which genuinely accumulates across runs (the `coder_learned.md` file shows dozens of entries from actual hackathon usage).
- **4-gate review pipeline**: Code quality, geometry/physics, user intent, and EU regulatory compliance reviewed sequentially with `ReviewConsensus` tracking — a thoughtful approach for industrial CAD.
- **Production-oriented tooling**: Docker multi-stage build, `Justfile` for common tasks, a changelog with semver, and automated output folder Git journaling provide a solid project hygiene.
- **Integrated 3D viewer**: Self-contained HTML with base64-encoded STL, Three.js OrbitControls, metallic rendering, and dimensions overlay is an excellent UX feature requiring no server.
- **Example search corpus**: The `ExampleSearcher` tool enables agents to look up patterns from an actual build123d example library, improving code generation accuracy.

---

## Areas for Improvement

- **Mistral integration is absent**: The project must use Mistral models or API to be eligible. The README even explicitly disclaims this: "This repository intentionally uses Anthropic models via Azure MaaS only."
- **Coder prompt and knowledge base conflict**: `CODER_PREAMBLE` (in `prompts.rs`) mandates `export_svg(part.part, "output.svg", ...)` as "REQUIRED", but `coder_knowledge.md` documents that `export_svg` does NOT exist for 3D Part objects — a direct contradiction that will cause runtime failures and confusion in the feedback loop.
- **No demo outputs included**: Despite an elaborate output pipeline, the repository contains no sample `.py`, `.step`, `.stl`, or `viewer.html` files showing the system working end-to-end. The `tmp/` directory is empty.
- **macOS-only viewer**: `src/viewer.rs` opens the HTML with the `open` command (macOS-specific) with no cross-platform fallback.
- **`agentic_workflow.rs` example still references removed agents**: The `examples/agentic_workflow.rs` file imports and registers `OilGasReviewer` and `SupplyReviewer`, which the CHANGELOG says were removed in v1.3.0, creating a compilation inconsistency.
- **Supervisor prompt is minimal**: `SUPERVISOR_PREAMBLE` is a single sentence ("You are a Supervisor..."), while all other agents have detailed, structured system prompts — the most important routing agent gets the least guidance.
- **`L` file at root**: An empty file named `L` exists at the repository root — likely an accidental artifact.
- **Track eligibility**: Submitting to a Mistral hackathon with exclusively Anthropic Claude integration is a fundamental track alignment failure.

---

## Detailed Reasoning

### Technicity

The technical foundation of this project is genuinely strong, making it one of the more ambitious Rust agentic systems seen at a hackathon. The core state machine is built around the `Specialist` trait (`src/agentic/mod.rs`) — each agent implements `run_turn(&self, ctx: GlobalContext) -> Result<TurnResult, AgentError>` — with `TurnResult` encoding three transitions: `KeepWorking`, `Delegate`, and `FinalResult`. This is a clean, testable protocol that prevents agent coupling and supports the orchestrator's step-by-step control flow.

The `ReviewConsensus` struct (`src/agentic/mod.rs`) is an elegant solution for multi-gate approval: it tracks four boolean flags (reviewer, physics_reviewer, intent_reviewer, compliance_reviewer) and exposes `approve`, `has_consensus`, `approval_count`, `approved_list`, and `pending_list` — all with inline doctests. The orchestrator in `src/agentic/orchestrator.rs` runs a `while context.step_count < max_steps` loop, applies each agent's `TurnResult`, takes periodic JSON snapshots every 5 steps, and on `FinalResult` sanitizes Python output, saves to disk, runs `uv run --with build123d python3`, and generates the 3D viewer.

The `PythonLinter` in `src/infra.rs` does programmatic pre-flight validation by spawning `python3 -c "import sys; compile(sys.stdin.read(), '<string>', 'exec')"` with the code piped to stdin — a correct, side-effect-free approach. The `GitJournal` provides an audit trail with `--allow-empty` commits. The `apply_search_and_replace` function enables atomic, exact-match edits to generated code.

The OpenTelemetry instrumentation is production-grade: `src/telemetry.rs` resolves OTLP endpoint/protocol/headers/compression from multiple environment variable fallbacks, supports gRPC/HTTP transports, and instruments with structured `gen_ai_provider_name`, `gen_ai_system`, `gen_ai_operation_name`, and `gen_ai_request_model` span attributes aligned with OpenTelemetry semantic conventions for GenAI.

The typestate model in `src/types.rs` uses sealed traits to enforce compile-time artifact lifecycle: `Artifact<Blueprint>`, `Artifact<Draft>`, `Artifact<Product>`, and `Artifact<Broken>` — a Rust-idiomatic approach that prevents illegal state transitions at compile time.

The main deduction is the coder/knowledge base contradiction (the coder prompt demands `export_svg` while the knowledge base explicitly says it does not exist) and the absence of Mistral integration.

### Creativity

The concept is creative: natural language in, parametric engineering CAD out, with an agentic loop that can look up documentation, fix syntax errors, pass code through domain-specific reviewers, auto-execute, and open a 3D viewer. The addition of an EU regulatory compliance gate (ComplianceReviewer checking CE, ATEX, PED) as a quality step for industrial parts is a genuinely novel design choice that goes beyond generic code generation.

The "Conch Shell" control protocol — a metaphor for explicit turn-taking — is described thoughtfully in `ARCHITECTURE.md`. The three-way exit from the Coder (lint failure → KeepWorking, missing exports → KeepWorking, code ready → Delegate to reviewer) shows care in designing the feedback loop.

However, the concept of an AI-powered coding agent for CAD is not entirely new, and the changelog reveals the project originated as `hghalebi/blender-rs-lib` in January 2026 — well before the hackathon. The hackathon activity was mostly the addition of the 4-gate review pipeline (v1.3.0) and OpenTelemetry (v1.4.0).

### Usefulness

The target user — an engineer or maker who can describe what they want to fabricate but doesn't know the build123d Python API — would genuinely benefit from this tool if it worked reliably. The output artifacts (STEP for CAD software, STL for 3D printing, SVG for visual verification, interactive HTML viewer) cover the full chain from design to fabrication.

The `docs/knowledge/learned/coder_learned.md` file is compelling evidence that the system was actually run and accumulated real learnings during development: entries dated 2026-01-24 through 2026-03-01 include thread specifications, BSP standard values, PolarLocations patterns, SVG export corrections, and flange geometry — all from real agent executions.

The usefulness is limited by: the requirement for an Azure account with Anthropic access (not freely accessible), the coder/knowledge-base contradiction that would produce runtime Python errors on SVG exports, and the absence of any example outputs or demo videos to demonstrate the system working.

### Track Alignment

This is the most significant problem with the submission. The Mistral AI Worldwide Hackathon requires participants to use Mistral API or models. The coding-agent repository does not contain a single reference to "mistral" in any file. All model providers are Anthropic Claude via Azure MaaS, configured through `AZURE_API_KEY`, `AZURE_EXISTING_AIPROJECT_ENDPOINT`, and `AZURE_MODEL` (defaulting to `"claude-opus-4-5"`). The `rig` crate's `providers::anthropic` module is used throughout `src/main.rs`, all agent constructors, and all example files.

The README states explicitly: "This repository intentionally uses **Anthropic models via Azure MaaS** only, with a stable and auditable runtime profile." The CHANGELOG notes: "We explored a fine-tuning approach for speed/consistency, but it did not produce enough measurable value for the time and compute budget available during the hackathon. We dropped it in favor of stronger orchestration prompts." This suggests a brief consideration of Mistral fine-tuning that was fully abandoned. The score for Track Alignment reflects this fundamental disqualification, awarding minimal points for the fact that the project was clearly built and demonstrated at the Mistral Paris hackathon even if it never used Mistral's own technology.

---

## Special Challenge Eligibility

**None identified.** The project uses Anthropic Claude (not Mistral) and has no fine-tuning, on-device deployment, or Mistral API integration. It is not eligible for Track 2 (Fine-Tuning with W&B) or Track 3 (On-Device with NVIDIA). Eligibility for Track 1 (Anything Goes with Mistral API) is voided by the absence of any Mistral model usage.
