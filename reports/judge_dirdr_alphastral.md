# Judge Report: alphaStral

**Track:** Track 2 — Fine-Tuning (W&B)
**Repository:** https://github.com/dirdr/alphaStral

## Summary

alphaStral fine-tunes Mistral's Ministral-3B model on Pokemon Showdown battle replays scraped from high-ELO (1500+) matches, then pits the fine-tuned model ("AlphaStral") against both the base model and larger Mistral API models in live, automated Pokemon battles. The project uses the poke-env library to interface with a locally-hosted Pokemon Showdown server, enabling structured LLM agent battles with full benchmarking and interactive HTML visualization output. The core thesis — can a domain-fine-tuned 3B model outperform a much larger foundation model on a specialized game task? — is validated by benchmark results showing 80% win rate vs. base Ministral-3B and competitive 50% parity against the 24B mistral-small.

## Scores

| Criterion | Score (/25) | Justification |
|-----------|-------------|---------------|
| Technicity | 21 | The codebase is architecturally clean: a layered design separates the `BattleAgent` ABC, `StateExtractor`, `ActionParser`, `AgentPlayer`, and `BattleRunner`. The `_shared.py` LLM base class handles per-battle conversation history, rate-limit throttling, type-effectiveness calculation via poke-env's type chart, and robust JSON parsing with regex fallback for markdown-wrapped responses. The scraper (`finetune/scraper.py`) uses thread-local HTTP sessions, per-key locking to prevent duplicate PokeAPI requests, and concurrent `ThreadPoolExecutor` pipelines with 20 parallel replay workers. Three distinct inference backends are implemented: Mistral API, HuggingFace Inference API, and Apple Silicon MLX local inference. |
| Creativity | 20 | Framing LLM fine-tuning as an AI-vs-AI Pokemon battle tournament is a genuinely novel and entertaining concept — the "David vs. Goliath" framing (3B fine-tuned vs. 123B foundation) is compelling. The prompt engineering for the fine-tuning dataset is thoughtful: prompts encode turn number, weather, HP fractions, status conditions, stat blocks, type information, Tera typing, and recent opponent moves — extracted by parsing raw Showdown replay logs and enriched with PokeAPI data. Using win rate against increasingly capable opponents as an adversarial benchmark (rather than just perplexity) is creative and game-appropriate. |
| Usefulness | 15 | The project is primarily a research and demonstration vehicle rather than a deployable product. The benchmark framework itself (pluggable agent registry, JSON run reports, interactive HTML dashboards with Plotly charts for win rate, decision latency violin plots, type-effectiveness breakdown, and decision reasoning logs) is genuinely reusable for LLM evaluation in adversarial game settings. The fine-tuned model artifact is publicly available on HuggingFace Hub. However, there is no clear path to broader user adoption beyond running it locally, and the primary "useful" artifact is the research finding rather than a product. |
| Track Alignment | 22 | Strong fit for Track 2: two fine-tuning experiments are documented (QLoRA on T4, then full BF16 LoRA on A100/H100) with explicit hyperparameter tables, dataset curation rationale (95/5 train/val split, 100k samples, 1500+ ELO replays), and the merged model is pushed to HuggingFace Hub at `mistral-hackaton-2026/ministral-3b-pokemon-showdown`. The evaluation methodology directly compares the fine-tuned model against base and larger variants across 30 battles. The main gap: W&B integration is absent from the code — training logs are only visible in Colab notebook stdout — which reduces alignment with the track sponsor's tooling. |

**Total: 78/100**

## Strengths

- Clean, well-documented modular architecture: `BattleAgent` ABC, `StateExtractor`, `ActionParser`, `AgentPlayer`, and `BattleRunner` are each single-responsibility and clearly separated, making the system easy to extend with new agent types via a simple registry in `main.py`
- Three distinct inference backends (Mistral API with retry/throttle logic, HuggingFace Inference API, Apple Silicon MLX local inference) demonstrate real engineering breadth and hardware-agnostic design
- The data pipeline (`finetune/scraper.py`) is production-quality: concurrent fetching with `ThreadPoolExecutor`, thread-local HTTP sessions, per-key locking to prevent duplicate PokeAPI requests, automatic dataset construction from raw replay logs enriched with type/stat data
- The benchmark visualization pipeline generates polished, self-contained HTML reports with multiple Plotly charts: cumulative win rate, outcome grid, decision latency violin/percentile plots, type effectiveness breakdown, and a scrollable decision reasoning log showing the model's chain-of-thought per turn
- Both fine-tuning experiments documented with explicit hyperparameter tables and rationale for configuration choices (why rank was increased from 16 to 32 when moving to A100)
- Benchmark results are concrete and comparative: 80% win rate vs. base Ministral-3B, 50% vs. mistral-small (24B), 40% vs. mistral-large (123B)

## Areas for Improvement

- The fine-tuned model's prompt format used during training (`finetune/scraper.py`) differs meaningfully from the richer multi-turn chat prompt used in `_shared.py`'s `_build_prompt()` for live battles. The `HFAgent` compensates with `_build_finetuned_prompt()`, but the richer state representation (boosts, side conditions, bench status, terrain) was never seen during fine-tuning, leaving potential performance gains on the table
- No Weights & Biases integration is present despite this being the W&B track — training metrics visible only in Colab notebook output, making experiment tracking non-reproducible
- The fine-tuned model cannot produce switch actions: training data only captures winner's move choices, so `HFAgent._call_api()` always returns `{"action_type": "move", ...}`. A more complete dataset would include switch decisions requiring parsing `|switch|` log lines in a turn-aware way
- The 10-battle sample size per matchup is small for statistical confidence; results would benefit from confidence intervals or a larger sample
- `pyproject.toml` description field remains the default placeholder "Add your description here."

## Detailed Reasoning

alphaStral is one of the more technically complete fine-tuning submissions possible within a hackathon timeframe. The team made an inspired choice to use Pokemon Showdown as both the data source and the evaluation arena, producing a self-contained and measurable task: given a structured battle state description, choose the best move. The dataset is built by scraping high-ELO replays from `replay.pokemonshowdown.com`, parsing the raw `|move|`, `|switch|`, `|-damage|`, and `|turn|` log lines, and enriching each move decision with PokeAPI data. The resulting `(prompt, completion)` pairs encode the battle state in a compact natural-language format that a language model can learn from.

The fine-tuning pipeline progressed through two experiments. The first (QLoRA on T4, rank=16, 100 steps) was a proof-of-concept that fit in 16GB VRAM using 4-bit NF4 quantization. The second (full BF16 LoRA on A100/H100, rank=32, 1000 steps, 100k samples) produced the final merged model pushed to HuggingFace Hub. Merging LoRA weights into the base model eliminates adapter overhead at inference and simplifies deployment. Both `finetune/finetune_colab_qlora.ipynb` and `finetune/finetune_colab.ipynb` are included, providing full reproducibility context.

The live-battle infrastructure is the project's most technically impressive component. `bot/agents/_shared.py` implements a `LLMBattleAgent` base class that maintains per-battle conversation history (carrying the last prompt/response exchange as context for the current turn), configurable rate-limit throttling, and comprehensive per-turn statistics collection (decision latency in milliseconds, fallback rate, type effectiveness per move). The `_build_prompt()` function produces structured natural-language state descriptions covering active Pokémon HP/status/boosts/ability/item, bench state, weather, terrain, hazards, available moves and switches, with explicit Terastallization support. The `_parse_action()` function handles both strict JSON and free-text responses with embedded JSON objects via regex extraction, which proves essential for models that wrap their JSON in markdown code fences.

The benchmarking and visualization layer (`benchmark/`, `viz/`) rounds out the system. Each run produces a JSON report with per-game results and per-turn statistics, then a self-contained HTML dashboard with multiple Plotly charts. The type-effectiveness chart is particularly insightful: it shows what fraction of each agent's moves hit super-effectively, neutrally, or not at all — a genuine proxy for strategic quality beyond win rate alone. The decision reasoning log renders the model's `reasoning` field from each JSON response in a scrollable table alongside move ID and effectiveness, making model behavior interpretable at the turn level.

The primary limitation for Track 2 scoring is the absence of Weights & Biases integration. Training runs entirely in Colab with no W&B callbacks, so there are no logged training loss curves, evaluation metrics over time, or experiment comparison dashboards. This is the main gap relative to full track alignment. A secondary limitation is that the fine-tuned model cannot produce switch decisions — the `HFAgent` always outputs a move action — because training data only captures winner move choices, not switch decisions. Addressing this would require a more sophisticated replay parser that identifies switch turns and includes them as labeled decisions. That said, within 24 hours this is an impressive research artifact with genuine experimental results and polished infrastructure.

## Special Challenge Eligibility

**Best Video Game Project (Supercell):** Strong candidate. alphaStral directly implements an AI agent that plays Pokemon Showdown — an established competitive video game platform — using a fine-tuned Mistral model. The system runs real battles with move selection, switching, weather/terrain tracking, and Terastallization mechanics, and battles can be spectated live via the Showdown web interface. The "fine-tuned 3B model as competitive game-playing AI" framing is both technically interesting and game-native.

No other special challenges appear directly applicable.
