# Judge Report: turbo-tax

**Track:** Track 1 — "Anything Goes" (AWS)
**Repository:** https://github.com/TALLEC-Scott/turbo-tax

## Summary

Turbo Tax is an IRS document parsing and knowledge-graph assistant that ingests US tax publications via Docling, distills them into an Obsidian markdown vault using an LLM agent, and exposes the resulting knowledge base through a FastAPI backend with a React/Cytoscape.js frontend. The chat interface allows users to ask tax questions answered by graph-traversal tool calls, while a real-time WebSocket panel animates the knowledge graph as the agent explores it. The project is impressively complete for a hackathon timeframe, with 554 Obsidian notes generated from 46 IRS publications, an evaluation harness, and a containerised deployment setup — but it uses a generic OpenAI-compatible interface rather than the Mistral API specifically.

## Scores

| Criterion | Score (/25) | Justification |
|-----------|-------------|---------------|
| Technicity | 19 | The full-stack architecture is well-engineered: a Docling-powered async PDF/HTML parser (`src/turbo_tax/parser/parser.py`), a FastAPI server implementing 10 custom tool-calling functions (backlinks, outlinks, graph exploration, index crawling), a WebSocket manager broadcasting real-time graph traversal events, and a React 19/TypeScript frontend with two graph modes (static Cytoscape + dynamic streaming). Code quality is high — strict Ruff linting with 20+ rule categories, type annotations throughout, Pydantic v2 models, and pytest tests for the data layer. Minor deductions for the absence of async tool execution (tools run synchronously inside `asyncio`), a committed `.env` containing credentials, and no formal streaming (SSE is line-by-line word-splitting rather than true LLM streaming). |
| Creativity | 17 | The pairing of an AI-generated Obsidian knowledge graph with a live graph-traversal visualization during chat is genuinely novel — users see nodes light up as the agent follows wikilinks. The "distillation" pattern (LLM agent reads 46 raw IRS PDFs and writes 554 interconnected notes) is an interesting agentic knowledge-engineering workflow. The backlink philosophy documented in `docs/AGENT_PROMPT.md` ("A note with 10 backlinks is more valuable than a note in 10 folders") shows conceptual thoughtfulness. The idea is not entirely unprecedented (RAG + knowledge graph), and the domain (US tax law) is practical but not surprising as a target. |
| Usefulness | 20 | The practical value is clear and substantial: the system ingests 46 official IRS publications and generates 401 topic notes, 47 publication notes, plus extracted CSV/Markdown tables (e.g., `eic_eligibility_rules_summary_2025.csv`, `standard_deduction_2025.csv`). An LLM evaluation harness was run against the QUOTIENTAI/IRS_FORM_INSTRUCTION_QA_PAIRS dataset (200 questions), achieving 40% fully correct and 100% at least partially correct on the 5 evaluated samples (`data/llm_eval_results.json`). The Obsidian vault integration with `obsidian://open` deep links means end users can jump directly from an AI answer into their local vault. The demo note for Earned Income Credit is detailed and accurate with 2025 income limits. |
| Track Alignment | 8 | The repository is configured to use a generic OpenAI-compatible API (`OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`) via environment variables. The committed `.env` shows `OPENAI_MODEL=glm-5-fp8` (a Zhipu AI model) and a custom `OPENAI_BASE_URL`, not Mistral's API. Neither `mistral` nor `pixtral` nor `codestral` appears anywhere in the codebase or configuration. The `AGENTS.md` mentions "you are a tax assistant" with no Mistral-specific tooling. The Containerfile installs `@qwen-code/qwen-code`, confirming the distillation pipeline is built around Qwen Code rather than any Mistral model. While the OpenAI-compatible API could in principle point to Mistral's endpoint, there is no evidence in the repository that Mistral was actually used, significantly hurting track alignment. |

**Total: 64/100**

## Strengths

- Comprehensive end-to-end pipeline: PDF/HTML parsing (Docling) → LLM distillation → Obsidian vault → chat API → visualisation frontend, all working and containerised
- Substantial generated knowledge base: 554 Markdown notes from 46 IRS publications, with rich wikilinks, YAML frontmatter, and structured tables
- Graph-traversal agent design with 10 purpose-built tool functions including recursive backlink/outlink exploration and index crawling (`server.py` lines 270–730)
- Real-time WebSocket-based knowledge graph animation that updates as the agent traverses notes during a chat session (`DynamicGraph.tsx` + `/ws/traversal` endpoint)
- High code quality: strict Ruff configuration with 20+ lint rule categories, Pydantic v2 models, async FastAPI, typed TypeScript frontend, pytest unit tests
- Evaluation harness using an external IRS Q&A dataset with LLM-as-judge scoring (`scripts/llm_judge_eval.py`, `data/llm_eval_results.json`)
- Thoughtful agent prompt engineering in `docs/AGENT_PROMPT.md` with explicit linking philosophy, citation standards, and note templates
- Docker/Podman compose setup with dedicated services for distillation, extraction, and the interactive agent

## Areas for Improvement

- **Mistral integration is absent**: The codebase uses a Qwen Code CLI for distillation and a generic `glm-5-fp8` model at a custom endpoint. Substituting Mistral's function-calling models (e.g., `mistral-large-latest` or `mistral-small-latest`) would be a minimal change that fully satisfies Track 1
- **Credentials committed to the repository**: `.env` contains `OPENAI_API_KEY=test-key` and a non-public base URL (`http://px106.prod.exalead.com:8000/v1`); `.env` should be in `.gitignore`
- **LLM evaluation is very limited**: Only 5 of 200 questions from the dataset were evaluated with the LLM judge; the keyword-based heuristic evaluation covers 200 questions but is a rough proxy
- **Synchronous tool execution inside async handlers**: `execute_tool_async` in `server.py` wraps synchronous file-system operations (rglob, read_text) without `asyncio.to_thread`, which will block the event loop under load
- **Frontend hardcodes port 8888** in `App.tsx` (`const API_URL = \`http://\${window.location.hostname}:8888\``), while the backend README says port 8000 — mismatch that may confuse users
- **`search_notes` tool is disabled** (commented out in `TOOLS` list) in favour of graph crawling, but the implementation is still present; a hybrid approach would improve recall for unfamiliar topics
- **No actual PDF upload handling**: the `/upload` endpoint in `server.py` reads the file and returns its size, but does not trigger parsing or vault insertion

## Detailed Reasoning

**Architecture and Code Quality**

The project is structured as a well-separated monorepo: `src/turbo_tax/parser/` contains the Docling-based IRSParser class, `src/turbo_tax/api/server.py` houses the FastAPI application, and `frontend/` is a fully typed React 19 + TypeScript app. The parser (`parser.py`) correctly handles async HTTP client lifecycle, extracts document type via regex patterns for IRS URL conventions (`f1040.pdf` → Form 1040, `p17.pdf` → Publication 17), and extracts sections by parsing Docling's markdown export. The `ParsedDocument`, `Section`, `Table`, and `ExtractedContent` Pydantic models in `models.py` are clean and well-documented.

**Agent Tool System**

The server defines 10 tools covering read_note, read_multiple_notes, list_directory, get_vault_stats, get_backlinks, get_outlinks, explore_note_graph, get_indices, and crawl_from_index. Each has a detailed JSON schema for function-calling APIs. The tool implementations are robust: `tool_get_backlinks` and `tool_get_outlinks` both support configurable recursion depth (max 3), visited-set cycle prevention, and result limits. `tool_explore_note_graph` builds a bidirectional subgraph (nodes + edges) from any starting note. `tool_crawl_from_index` follows wikilinks from `type: index` frontmatter notes, supporting keyword filtering via `filter_links`. The disabled `search_notes` tool has a BM25-like scoring system with filename/title/content weighting — thoughtful even if currently unused.

**Knowledge Base Quality**

The 554-note Obsidian vault is the project's most impressive artifact. The Earned Income Credit note (`03 - Topics/Earned Income Credit.md`) exemplifies the quality: 2025 income and credit tables, eligibility requirement tables, special situation subsections (military, clergy, self-employed), backlinks to 14 related topics, 4 related publication notes, 4 related asset CSVs, and 4 related forms. This was generated by a Qwen Code agent following the distillation prompt in `scripts/distill.sh`, which reads the raw parsed IRS markdown and writes to the vault via Obsidian MCP. The `data/irs_publications/` directory contains 46 parsed publications totalling ~298k lines of markdown extracted from IRS PDFs.

**Frontend and Visualisation**

The React frontend (`App.tsx`) implements a multi-conversation sidebar, SSE-based streaming that renders tool calls in collapsible `<details>` elements with pending/done status, and graph node highlighting synchronized with tool results. The `DynamicGraph.tsx` component connects to `/ws/traversal` and uses Cytoscape.js with the fCoSE layout algorithm to animate nodes appearing as the agent explores the vault. The `GraphView.tsx` static mode renders the full vault graph with degree-proportional node sizing. Both views support click-to-open in Obsidian via the `obsidian://open` protocol. This is a polished, purpose-built UI for knowledge graph exploration.

**Mistral Integration — Critical Gap**

Despite the sophisticated architecture, there is no evidence of Mistral model usage. The `.env` file specifies `OPENAI_MODEL=glm-5-fp8` (a Zhipu AI model) at a corporate proxy URL. The Containerfile installs `@qwen-code/qwen-code` for the distillation pipeline. `AGENTS.md` references "tax assistant" with no model specificity. The README's tech stack lists "OpenAI-compatible LLM API" as the AI layer. While the API design is model-agnostic (it could target `https://api.mistral.ai/v1` with `mistral-large-latest`), the actual implementation and evidence within the repository points to non-Mistral models being used throughout development. This is the primary reason for the low Track Alignment score.

**Evaluation Rigor**

The team included two evaluation mechanisms: a keyword-heuristic coverage check across 200 IRS Q&A pairs (`scripts/evaluate_qa.py`), finding 55.5% topic coverage, and a small LLM-judge evaluation of 5 questions using "Perplexity Sonar Reasoning Pro" as the judge model (`data/llm_eval_results.json`). The 5-question sample is too small to be statistically meaningful, but the framework — using the QUOTIENTAI/IRS_FORM_INSTRUCTION_QA_PAIRS dataset and structuring judgments as CORRECT/PARTIALLY_CORRECT/INCORRECT/NOT_COVERED — is sound and could be scaled up.

## Special Challenge Eligibility

None identified. The project does not use Mistral models (Track 1 requirement is not satisfied with evidence), does not fine-tune any model (Track 2), and does not deploy on edge hardware (Track 3). If the team configures the system to use the Mistral API with any Mistral model and re-submits evidence, it would qualify for Track 1.
