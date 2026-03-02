# Judge Report: ecole

**Track:** Track 2 — Fine-Tuning / W&B
**Repository:** https://github.com/batuergun/ecole

## Summary

Ecole is an end-to-end automated fine-tuning platform that takes user-uploaded documents (PDFs, text files), generates Q&A training datasets via LLM, fine-tunes Mistral models using LoRA/SFTTrainer, and evaluates the result with an LLM-as-judge benchmark — all through a polished web UI. The project demonstrates substantial full-stack depth across a Go API backend, a Python ML worker, and a React frontend, with support for both local GPU and HuggingFace Jobs cloud compute. Mistral models are the primary fine-tuning target throughout, and the Mistral API is used as an optional LLM provider for dataset generation and judging.

## Scores

| Criterion | Score (/25) | Justification |
|-----------|-------------|---------------|
| Technicity | 21 | The system spans three fully distinct services (Go API with PostgreSQL-backed job queue, Python ML worker with TRL/PEFT/transformers, React frontend) with real implementations at every layer. The training pipeline handles LoRA fine-tuning via `SFTTrainer`, multi-modal PDF extraction with PyMuPDF + vision (page images passed to VLMs), parallel chunk processing with `ThreadPoolExecutor`, AES-GCM encryption of API keys at rest, token streaming over SSE for the chat feature, and log-polling to HF Jobs. The per-epoch checkpoint evaluation and the combination of LLM judge scoring + deterministic metrics (ROUGE-L, semantic similarity via sentence-transformers) shows real ML engineering care. Minor deduction: the Mistral integration for dataset generation defaults to Anthropic in `llm.py`, and the LLM judge also defaults to Anthropic — Mistral is secondary rather than central. |
| Creativity | 18 | The "upload docs, get a fine-tuned expert model" concept is not entirely novel, but the end-to-end automation pipeline is well-executed and the combination of vision-capable PDF extraction (page images sent to the VLM alongside extracted text) with Q&A harness generation is a genuinely clever design. The live streaming chat feature that hot-loads the fine-tuned adapter into a local GPU session with a 5-minute idle timeout is a nice product touch. The integration of Trackio for live training metrics and per-epoch checkpoint benchmarking adds depth beyond a basic AutoTrain clone. |
| Usefulness | 21 | The problem is very real: domain experts who want a fine-tuned model from their private documents today need significant ML expertise. Ecole provides a clear, opinionated workflow (upload → dataset → train → evaluate → chat) that a non-ML-engineer could realistically follow. The Docker Compose one-command setup, the local GPU and cloud HF Jobs dual-mode, a Render deployment config, and a working chat interface to actually test the fine-tuned model all point to a product-minded build. The 10% eval split, dataset item editing, batch delete, and job retry logic show attention to real-world usage friction. |
| Track Alignment | 17 | The project explicitly targets fine-tuning as its core value proposition and uses the Mistral API as one of the two supported LLM providers. The default base models for training are `mistralai/Ministral-3-3B-Reasoning-2512` and `mistralai/Ministral-3-8B-Reasoning-2512` — both Mistral models, hardcoded as the only options in the UI. However, the dataset generation and judging layer defaults to Anthropic (Claude Sonnet 4.6 in `worker/worker/llm.py`), which weakens the Mistral-centricity. There is no W&B integration (the track sponsor); Trackio is used instead. This is a solid fine-tuning entry, but the partial reliance on a competing provider for core LLM tasks and absence of the track's W&B sponsor integration reduce alignment. |

**Total: 77/100**

## Strengths

- Genuinely complete end-to-end pipeline: document ingestion, dataset generation, LoRA fine-tuning, automated evaluation, model publishing to HF Hub, and interactive chat with the resulting model.
- Strong polyglot architecture: Go for the API server (with pgx, Gin, go-migrate, AES-GCM key encryption), Python for ML worker (TRL, PEFT, transformers, PyMuPDF, sentence-transformers, rouge-score), TypeScript/React for the frontend with TanStack Query and SSE streaming.
- Real job queue implementation using PostgreSQL's `FOR UPDATE SKIP LOCKED` with stale-claim reset, retry logic, and per-job progress reporting — a proper distributed task queue without introducing Redis or a message broker.
- Dual compute modes: local NVIDIA GPU (`docker-compose.gpu.yml`) and HuggingFace Jobs cloud dispatch (`run_uv_job`), with the HF Jobs path supporting Trackio metric dashboards.
- Multi-modal PDF handling: pages rendered at 150 DPI and passed as base64 images to the VLM alongside extracted text, enabling Q&A generation from image-heavy documents.
- LLM-as-judge evaluation with both subjective scoring (1–5 scale) and deterministic metrics (semantic similarity via `all-MiniLM-L6-v2`, ROUGE-L), stored per benchmark run with per-question granularity.
- API key encryption at rest using AES-256-GCM (`crypto/crypto.go`).
- Token streaming chat interface that hot-loads the trained adapter into GPU memory, supports full conversation history, and auto-closes after a 5-minute idle timeout to free VRAM.
- Production deployment configuration via `render.yaml` covering the full stack.
- Clean step-wizard UI with auto-advance logic, progress bars, and contextual lock states.

## Areas for Improvement

- The default and recommended LLM provider for both dataset generation and benchmark judging is Anthropic (Claude Sonnet 4.6), not Mistral. For a hackathon centered on Mistral AI, this is a significant gap. Swapping the default to `mistral-large-latest` / `pixtral-large-latest` would be trivial given the existing abstraction in `llm.py`.
- No W&B integration despite this being a stated Track 2 requirement. Trackio is used instead, which appears to be a HuggingFace-native alternative, but is not the track's designated partner.
- The worker API endpoint group (`/api/worker/...`) has no authentication beyond an internal convention — any process that knows the API URL can claim jobs, report training progress, or read project API keys. Adding a shared secret or worker token would be a minimal security improvement.
- The default encryption key (`dev-encryption-key-change-in-prod`) and JWT secret are committed in `config.go` as fallbacks; the `render.yaml` does auto-generate them for cloud deploys but local Docker Compose uses the insecure defaults.
- The HF Jobs benchmark entry script (`hf_benchmark_entry.py`) is referenced in `benchmark.py` but is not present in the repository at the path constructed by `os.path.dirname` chains — only `hf_job_entry.py` exists. This means the cloud benchmark path is likely broken.
- No automated tests at any layer (API, worker, or frontend).
- The training UI only exposes Ministral 3B and 8B reasoning variants; users cannot enter an arbitrary HuggingFace model ID, which limits applicability.
- Chat streaming uses SSE polling of a DB-backed message field rather than true streaming from the model directly to the client; this adds latency and complexity compared to a WebSocket or direct SSE from the inference thread.

## Detailed Reasoning

**Architecture and Code Quality**

Ecole is organized into three clearly separated services: a Go REST API (`api/`), a Python ML worker (`worker/`), and a React SPA (`web/`). The Go API uses Gin for routing with a clean separation of concerns across `handler/`, `store/`, `queue/`, `storage/`, `middleware/`, and `model/` packages. The PostgreSQL schema (`migrations/001_initial.up.sql`) is carefully designed with proper foreign keys, cascade deletes, check constraints on status enums, and strategic indexes. The job queue implementation in `api/internal/queue/queue.go` uses `FOR UPDATE SKIP LOCKED` — a correct, production-grade pattern for a polling queue without an external message broker. The background goroutine in `cmd/server/main.go` that resets stale claimed jobs every 5 minutes shows operational thinking.

**ML Worker Pipeline**

The Python worker (`worker/worker/main.py`) is a simple poll loop that dispatches to typed job handlers. The harness pipeline (`jobs/harness.py`) parallelizes LLM calls across document chunks using `ThreadPoolExecutor`, correctly separates PDF text extraction from image rendering, and tracks positions to associate page images with text chunks for multimodal prompting. The training job (`jobs/training.py`) handles both local GPU and HF Jobs cloud paths, parses training metrics from HF Jobs log output via regex, and feeds step/epoch/loss updates back to the API in real time. The benchmark pipeline (`jobs/benchmark.py`) implements per-epoch checkpoint evaluation for local runs — a detail that goes beyond what most hackathon projects bother with. The deterministic metrics module (`jobs/metrics.py`) adds cosine similarity and ROUGE-L scores as objective complements to the LLM judge's subjective scores.

**Mistral Integration**

The project's relationship with Mistral is genuine but secondary. The default fine-tuning targets are Mistral's own `Ministral-3-3B-Reasoning-2512` and `Ministral-3-8B-Reasoning-2512` models, and `worker/worker/llm.py` implements a proper `LLMClient` abstraction with both an Anthropic and a Mistral backend using `mistral-large-latest` and `pixtral-large-latest`. The training entry scripts explicitly handle `mistral3` model type via `Mistral3ForConditionalGeneration` to support the Ministral architecture quirks. However, the default provider across the codebase is Anthropic, which is a significant missed opportunity for a Mistral-focused hackathon. A user who runs the app out of the box with only a Mistral key will need to explicitly switch the provider.

**Frontend**

The React frontend is well-structured with TanStack Query for server state, the shadcn/ui component library, and a four-step wizard that correctly gates steps behind completion of prior ones. The `ProjectDetail.tsx` page auto-expands the most relevant step on load. The training tab supports both compute modes with hardware flavor selection. The chat page uses SSE for streaming token updates. The UI polish suggests this was built with user experience in mind, not just as a proof-of-concept.

**Completeness**

Screenshots in `assets/screenshots/` dated 2026-03-01 (the day of submission) confirm the UI was running. The `render.yaml` confirms a cloud deployment was configured. The project includes 4 database migrations showing iteration during development. The one notable gap is the missing `hf_benchmark_entry.py` script — the benchmark path for HF Jobs cloud mode references this file but it is absent from the repository, meaning cloud benchmark runs would fail.

## Special Challenge Eligibility

None identified. The project does not appear to target any specific special challenges beyond the core Track 2 (Fine-Tuning) category.
