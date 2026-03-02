# Judge Report: lesphinx (Le Sphinx)

**Track:** Track 1 — "Anything Goes" (AWS)
**Repository:** https://github.com/edouardfoussier/lesphinx

## Summary

Le Sphinx is a voice-powered 20 Questions guessing game where players interrogate an ancient AI Sphinx about a secret famous person from a curated database of 161 characters. The game uses Mistral Large as a single "Full LLM" handler that simultaneously interprets questions, resolves yes/no answers against the secret character's profile, and generates theatrical in-character responses. It features solo, human-vs-human duel, and human-vs-AI duel modes (the latter using Amazon Bedrock AI opponents with distinct personalities), ElevenLabs TTS for voice, a global leaderboard, and an MCP server that lets AI agents play programmatically via Claude Desktop or Cursor.

## Scores

| Criterion | Score (/25) | Justification |
|-----------|-------------|---------------|
| Technicity | 22 | The engineering quality is unusually high for a hackathon. `full_llm_handler.py` implements a multi-layer safety pipeline: surrender detection via 8 compiled regex patterns before the LLM call, name-leak sanitization via `_sanitize_response()` after the response, Unicode encoding corruption repair (`_repair_unicode()` for French accents), and JSON response validation with intent/answer enum checking. `game/engine.py` implements a rigorous state machine (`GameState` with `can_transition()` guards). The test suite covers 220 tests across 10 test files: character selection, fact store, answer resolution, guess matching, rule-based patterns, game engine state transitions, LLM integration, voice templates, and leaderboard. The MCP server uses FastMCP with both stdio and SSE transports. The codebase is deployed to production at thesphinx.ai. |
| Creativity | 21 | The "reverse 20 Questions" framing (player interrogates an AI oracle rather than guessing a random word) is a natural fit for LLMs and more engaging than a simple chatbot. The multi-modal approach — voice questions via Web Speech API, theatrical TTS responses via ElevenLabs, Egyptian/Sphinx atmosphere with sound effects (`ambient.wav`, `sphinx_growl.wav`, `gong.wav`, `fanfare.wav`) — creates genuine game-feel. Exposing an MCP server so that AI agents can compete on the same leaderboard as humans ("Mortals vs. Machines") is a particularly creative and novel feature. AI opponents powered by Amazon Bedrock (Claude, Nova, AI21, Cohere) with distinct personalities and voices add further depth. |
| Usefulness | 20 | The game is actually deployed and playable at thesphinx.ai, demonstrating real-world applicability beyond a prototype. The multi-language support (French and English detected from the question language), multiple difficulty levels (Neophyte/Initiate/Master with curated character sets), nine theme categories, and three game modes create genuine replayability. The global leaderboard adds competitive social value. The MCP integration opens an entirely new use case: LLM agents can now be tested/benchmarked through an interactive game interface, which is useful for AI researchers. |
| Track Alignment | 19 | Strong Track 1 fit: it uses Mistral Large and Mistral Small (via the Mistral API, not AWS) as the primary AI components, with ElevenLabs TTS and Amazon Bedrock for AI opponents. The AWS usage is primarily for the AI opponents (Bedrock), not the core Mistral integration, which somewhat reduces "AWS" track alignment. The project is ambitious, creative, and clearly impactful — it is a complete, deployed product rather than a prototype. The use of Mistral API directly (rather than on AWS) is a minor misalignment with the "hosted on AWS" track requirement. |

**Total: 82/100**

## Strengths

- Production-deployed at thesphinx.ai with a real user-facing product — not just a demo
- 220 tests across 10 test files, covering the full stack from character selection to LLM integration — exceptional for a 24-hour hackathon
- The `full_llm_handler.py` safety pipeline is layered and thoughtful: pre-call surrender detection, post-call name-leak sanitization, Unicode corruption repair for French accented characters, and JSON enum validation
- MCP server (`FastMCP` with stdio + SSE) allows AI agents to play the game programmatically, creating a unique "Mortals vs. Machines" leaderboard feature
- Character database of 161 curated entries with 12-15 facts each, enriched via Mistral, covering 9 thematic domains and 3 difficulty tiers — this is significant content work
- Deployed with Google Cloud VM + Caddy + systemd, including a production deployment script and Caddyfile

## Areas for Improvement

- Core Mistral integration uses the Mistral API directly (not AWS Bedrock), which partially misaligns with the Track 1 "AWS" sponsor requirement — the AI opponents use Bedrock but not the main game brain
- The single-LLM architecture is elegant but means every question requires a full Mistral Large call (high latency and cost at scale); a hybrid approach with rule-based filtering for common question patterns would be more efficient
- The `_repair_unicode()` function is a creative workaround for JSON encoding corruption, but the root cause (Mistral encoding accented characters as digit substitutes in JSON responses) suggests an encoding issue that could be fixed at the API call level with `ensure_ascii=False` or `response_format` adjustments
- The Vanilla HTML/JS frontend (`lesphinx/static/index.html`) means no component architecture or type safety — a React or Vue frontend would be more maintainable
- The AI opponent duel mode requires AWS Bedrock credentials, making it inaccessible without specific setup

## Detailed Reasoning

Le Sphinx stands out in this batch as a genuinely polished, deployed product rather than a hackathon prototype. The architecture is clean and well-considered. The central design decision — a single Mistral Large call that simultaneously performs question understanding, fact-based answer resolution, and theatrical response generation in one `json_object` structured call — is elegant. Rather than building a RAG pipeline to look up facts against a database, the character profile (name, attributes, 12-15 facts) is embedded directly in the system prompt, and Mistral Large's general knowledge acts as a live resolver for questions not covered by explicit facts. This is a reasonable tradeoff for the character set (161 famous people) and dramatically simplifies the architecture.

The safety engineering in `full_llm_handler.py` is notably careful. Eight compiled regex patterns detect surrender phrases in both French and English before the LLM call, avoiding unnecessary API latency. Post-call, `_contains_name()` checks whether the response accidentally revealed the secret character's name or any part of it (including aliases), and `_sanitize_response()` redacts matches with "???". The `_repair_unicode()` function addresses a specific bug where Mistral would encode French accented characters as digit substitutes in JSON responses (é→9, è→8, à→0) — the fix scans for words containing digits surrounded by letters and applies a character mapping heuristic. This level of production hardening is rare in hackathon projects.

The game engine in `game/engine.py` implements a proper state machine with `can_transition()` guards that enforce valid state progressions. The `calculate_score()` function produces meaningful scores: 1000 base minus 40 per question, 100 per wrong guess, 50 per hint used, plus a difficulty bonus (0/200/500 for easy/medium/hard). The `get_sphinx_confidence()` method produces a 0-100 confidence metric that drops as the player gets more "yes" answers — this feeds into the mood system that influences the Sphinx's response tone (confident/intrigued/nervous/condescending), giving the game a dynamic tension arc.

The MCP server is an inspired addition. Using `FastMCP` with stdio and SSE transports, it exposes game tools that allow AI agents to play the game programmatically via Claude Desktop, Cursor, or Mistral Vibe. Agents compete on the same leaderboard as human players, creating a "Mortals vs. Machines" dynamic. This is a clever demonstration of LLM capabilities and a genuinely novel hackathon feature.

The test suite (220 tests across `tests/test_engine.py`, `test_full_llm_handler.py`, `test_achievements.py`, `test_characters.py`, `test_judge.py`, `test_leaderboard.py`, `test_voice.py`, `test_interpreter.py`) is exceptional by hackathon standards. Coverage includes unit tests for surrender detection, guess matching with accent normalization, name-leak detection, and full game engine state transition validation. This suggests the developer approached the project with production quality in mind from the start.

## Special Challenge Eligibility

**Best Voice Use Case (ElevenLabs):** Strong candidate. ElevenLabs TTS is central to the experience — the Sphinx speaks all answers in a deep theatrical voice via `eleven_flash_v2_5`, and AI opponent personas each have distinct voices. Voice I/O (Web Speech API STT + ElevenLabs TTS) is the primary interaction modality. This is one of the most developed voice-use-case implementations in this batch.

**Best use of Mistral Vibe:** The MCP server enables Mistral Vibe (and Claude, Cursor) agents to play the game. The `MCP_SERVER.md` documentation explicitly mentions Mistral Vibe as a supported client. This could qualify.

**The Hackathon's Next Unicorn (Raise):** The combination of a live deployed product, a curated 161-character database, multi-mode gameplay, global leaderboard, and an MCP integration for AI agent benchmarking suggests real startup potential in the educational games / AI evaluation space.
