# Judge Report: mistral-hack — AuxilAI

**Track:** Track 2 "Fine-Tuning" (W&B) — with heavy Track 1 backend elements
**Repository:** https://github.com/TristanLecourtois/mistral-hack

---

## Summary

AuxilAI is an AI-powered emergency dispatch assistant designed to handle high call volumes during catastrophic events. The project combines a fine-tuned Mistral-7B model (LoRA + QLoRA with a custom Weave scorer regularization term) with a real-time backend that integrates Mistral's Voxtral ASR, ElevenLabs TTS, Twilio telephony, voice emotion analysis, geocoding, and live routing — all surfaced through an impressive dispatch dashboard. This is one of the most complete and technically ambitious projects a hackathon team could realistically produce in 24-36 hours.

---

## Scores

| Criterion | Score (/25) | Justification |
|-----------|-------------|---------------|
| Technicity | 22 | The codebase demonstrates exceptional breadth: a custom `WeaveRegularizedTrainer` subclassing HuggingFace's `Trainer` to inject W&B Weave scorer terms into the training loss, QLoRA fine-tuning of Mistral-7B on 2,844 synthetic examples, a fully async FastAPI backend with WebSocket real-time streaming, VAD-based barge-in detection over raw Twilio mulaw audio, SpeechBrain wav2vec2 voice emotion inference, OSRM/Valhalla routing fallback chains, and Overpass API for live OSM service lookups. Minor deductions: `geocoding.py` is missing its import statement (`GOOGLE_API_KEY` is referenced but never imported/defined); `requirements.txt` is minimal (`unicorn`, `fastapi`, `speechbrain`) and does not reflect the full dependency surface; the in-memory `calls_db` dict has no persistence; and the W&B runs show mostly short runtimes with no logged loss metrics surviving in `wandb-summary.json`, suggesting training was not completed to convergence. |
| Creativity | 21 | The combination of ideas is genuinely novel: using W&B Weave scorers (coherence, fluency, toxicity, bias, hallucination) as a regularization term in the fine-tuning loss function — essentially a quality-aware training objective — is an unusual and creative technique. Layering voice emotion recognition (SpeechBrain IEMOCAP) on top of live Twilio audio to give dispatchers real-time affect cues, automatically geocoding call locations and displaying Google Street View thumbnails on a live map with routing polylines, and using Mistral for structured extraction of call metadata (scores, severity, emotions) simultaneously with conversation are all clever ideas. The reinterpretation of IEMOCAP emotion classes (neu/hap/sad/ang) into emergency-context labels (Composed/Agitated/Distressed/Panicked) is a thoughtful domain adaptation. |
| Usefulness | 22 | The problem — emergency call centers being overwhelmed during mass-casualty or disaster events — is a concrete, high-stakes real-world challenge. The solution addresses it on multiple levels: AI handles initial triage conversations, dispatchers see structured call data in real time, the nearest appropriate emergency service is identified automatically, routing is displayed on a live map, and an SMS summary is sent after each call via Twilio. The use of Voxtral for multilingual speech transcription is particularly relevant for diverse populations. The dashboard's severity sorting, FLIP animation, radar/bar score charts, and call state management make it immediately usable as a dispatcher tool. The primary limitation for real-world deployment is the use of an in-memory database and the lack of authentication, but these are acceptable for a hackathon prototype. |
| Track Alignment | 19 | The project clearly targets Track 2 (Fine-Tuning with W&B). A 2,844-example synthetic dataset was generated using `mistral-large-latest` via `data_gen.py`, formatted for instruction fine-tuning, and used to train Mistral-7B with LoRA via `fine_tuning.py`. W&B is integrated for experiment tracking, and 19+ training runs are committed with metadata confirming actual GPU runs (RTX 3060 and RTX 3090 were used). The custom `WeaveRegularizedTrainer` directly uses W&B Weave scorers inside the loss computation, which is a direct and creative use of the W&B track sponsor's tooling. However, the wandb-summary files for all runs contain no loss metrics, indicating training likely crashed or was cut short before meaningful steps were logged — reducing confidence that a fine-tuned model was actually deployed in the backend. The backend uses `ministral-8b-latest` via API rather than the fine-tuned model. |

**Total: 84/100**

---

## Strengths

- The `WeaveRegularizedTrainer` class in `fine_tuning/fine_tuning.py` is a genuinely novel contribution: it subclasses HuggingFace `Trainer` and computes a weighted combination of coherence, fluency, toxicity, bias, and hallucination scores from W&B Weave at every training step, adding `(1 - avg_score) * regularization_lambda` to the cross-entropy loss. Token-level score weighting (anxiety=8, severity=9, coherence=7, seriousness=10) further focuses the model on the most important prediction targets.
- The telephony integration in `backend/twilio_voice.py` is production-grade: raw mulaw audio is decoded from Twilio WebSocket frames, VAD (RMS thresholding with configurable speech/silence chunk counts) isolates utterances, Voxtral and SpeechBrain inference run in parallel via `asyncio.gather`, barge-in cancellation stops TTS mid-playback, and an SMS summary is sent on call close.
- `backend/emergency_services.py` has a robust multi-endpoint Overpass fallback chain, Haversine nearest-neighbor search, and dual OSRM/Valhalla routing with polyline decoding — all of which are non-trivial to implement correctly.
- The synthetic dataset pipeline is thorough: `data_gen/prompt_config.json` contains a rich prompt template engineering diverse score distributions, varying conversation lengths, and scenario-specific instructions for 7 emergency types. 2,844 examples with 80/20 train/test split were produced.
- The frontend `app.js` implements a FLIP animation algorithm for sidebar card reordering, custom SVG radar chart with requestAnimationFrame-based easing, animated counters, OpenStreetMap integration with custom severity markers, and routing polylines — well above typical hackathon front-end quality.
- Actual GPU training runs are evidenced by committed W&B run artifacts with metadata showing RTX 3060 and RTX 3090 hardware, CUDA 12.6/12.8, and proper LoRA config (r=16, alpha=32, all attention/MLP projection layers targeted, QLoRA NF4 quantization).

---

## Areas for Improvement

- The W&B `wandb-summary.json` files for all 19 training runs contain only `_runtime` metadata with no `train/loss`, `eval/loss`, or step counts — strongly suggesting no run reached the first logging step. The backend uses `ministral-8b-latest` (base API model), not a fine-tuned checkpoint. A successful fine-tuning run with a deployed adapter would have significantly strengthened the project.
- `backend/geocoding.py` is missing its `GOOGLE_API_KEY` import/initialization — the file references `GOOGLE_API_KEY` without ever importing it from `os.getenv` or dotenv, which would cause a `NameError` at runtime. This appears to be a truncated or accidentally committed file.
- `requirements.txt` lists only three packages (`unicorn`, `fastapi`, `speechbrain`), omitting `mistralai`, `python-dotenv`, `inflect`, `googlemaps`, `twilio`, `peft`, `transformers`, `torch`, `numpy`, `audioop`, `requests`, and many others. This makes the project difficult to reproduce.
- The `test_depoly/` folder contains a toy `MyModel` (a 10-input linear classifier) with no connection to the Mistral fine-tuning work, suggesting it was scaffolding for an AWS SageMaker deployment path that was abandoned.
- There is no authentication, rate limiting, or persistent storage — `calls_db` is an in-memory Python dict that resets on every restart, which is fine for a demo but worth noting.
- The `notebooks/` directory contains only a `.gitkeep` placeholder; exploratory analysis of training data quality or model evaluation notebooks would have been valuable.
- The system prompt in `prompts.py` hard-codes English-only responses (`ALWAYS reply in English`), which conflicts with the multilingual capability of Voxtral and the claim in the README about handling diverse populations.

---

## Detailed Reasoning

### Architecture Overview

AuxilAI is a two-component system: a real-time emergency dispatch backend (FastAPI + WebSocket) and a fine-tuning pipeline targeting Mistral-7B for emergency call scoring. The backend has two entry points for calls: a browser-based WebSocket path (`/voxtral`) where the frontend sends pre-transcribed text segments (implying Voxtral is used client-side or in a separate process), and a Twilio Media Streams path (`/twilio/stream`) that receives raw mulaw audio and handles the full STT-LLM-TTS pipeline server-side.

### Backend Quality

`backend/agent.py` is the most technically complete file. The `Agent` class manages streaming Mistral inference in a thread pool executor to bridge the synchronous `mistralai` SDK with asyncio (a common and correctly handled pattern). The `get_responses` async generator yields JSON-encoded chunks to the WebSocket in real time. The system prompt in `prompts.py` is carefully crafted with priority ordering for information gathering, scenario-specific follow-up templates, and an explicit prohibition on markdown formatting (which would corrupt TTS output). The secondary `extract_call_info` method makes a parallel non-streaming call to `ministral-8b-latest` to extract structured JSON (title, summary, severity, type, location, scores, emotions, instructions) from the running transcript — and the `_clean_json_string` function correctly handles control characters inside JSON strings that the model might emit.

`backend/twilio_voice.py` demonstrates the most production-oriented engineering. The barge-in mechanism attaches a `_barge_flag` list to each asyncio Task so that the chunk-sending coroutine can check for interruption at each 18ms audio chunk. The VAD uses RMS thresholding at 400 with configurable speech/silence counts (15 frames minimum speech, 40 frames silence to close), which are reasonable values for 8kHz 20ms mulaw chunks. Running `transcribe_pcm` and `analyze_voice_emotion` concurrently with `asyncio.gather` is an effective optimization.

`backend/emergency_services.py` has a well-structured registry built at startup via `lifespan`: police stations are loaded from a static `data/police.json` (Paris commissariats), fire stations and hospitals are fetched from Overpass with three-endpoint fallback. The route computation tries OSRM with two servers before falling back to Valhalla, and decodes the Valhalla polyline6 encoding manually (a custom `_decode_polyline6` function). All routing calls have a 25-second timeout wrapped in `asyncio.wait_for`.

### Fine-Tuning Pipeline

The fine-tuning work is the most ambitious part and the most ambiguous in terms of completion. `fine_tuning/fine_tuning.py` implements `WeaveRegularizedTrainer`, which overrides `compute_loss` to combine a token-level weighted cross-entropy loss (score tokens — `anxiety`, `coherence`, `severity`, `seriousness` — are up-weighted by 7-10x relative to non-score tokens) with a Weave-scored regularization term. The Weave scorers (coherence, fluency, toxicity, bias, hallucination) are evaluated on decoded model outputs every training step, and the regularization loss is `(1 - weighted_avg_score) * lambda`. This is a creative use of the W&B Weave API as a training signal, though it has a practical concern: calling the Weave scorers synchronously on every step would be extremely slow, and the commit `if self.state.global_step % 1 == 0` (which the comment says "Every 10 steps" but the code evaluates to every step) confirms the regularization was likely a contributing factor to training crashes.

The dataset is high quality: `data_gen/prompt_config.json` contains a detailed system prompt for `mistral-large-latest` that enforces diverse score distributions, natural language variation, and scenario-specific realism. The 2,844 examples in `dataset/2000_sample_dataset.json` plus the train/test split files cover fire, police, medical, accident, mental health, natural disaster, and prank scenarios with varying anxiety, coherence, severity, and seriousness scores — appropriate for training a call analysis model.

The W&B metadata confirms real hardware was used (RTX 3060 in one environment, RTX 3090 in another), and the `config.yaml` from one successful run shows the complete LoRA configuration (r=16, alpha=32, all 7 projection modules targeted, QLoRA NF4 bfloat16). However, the absence of any loss values in any `wandb-summary.json` means we cannot confirm the training actually ran to completion or that the model weights exist. The backend does not reference any local checkpoint directory, using `ministral-8b-latest` API calls throughout — suggesting the fine-tuned model was either not completed or not integrated.

### Frontend

The dispatch dashboard in `frontend/app.js` is 649 lines of carefully crafted JavaScript. It implements a FLIP animation for call card reordering (measuring DOM positions before and after rerender, then inverting the delta and playing it forward), two chart modes (bar with CSS transitions and animated counters, SVG radar with requestAnimationFrame cubic easing), WebSocket-driven real-time updates, Leaflet map integration with custom severity-colored pins and route polylines, a dispatch panel for manually triggering police/fire/medical services, and Google Street View image embedding in map popups. This is significantly above typical hackathon frontend quality.

---

## Special Challenge Eligibility

The project is a strong candidate for the Track 2 (Fine-Tuning / W&B) track given the custom `WeaveRegularizedTrainer` that creatively uses W&B Weave scorers as a regularization term during training — directly leveraging the W&B sponsor's tooling in a novel way. The presence of W&B run artifacts with actual GPU metadata further supports eligibility. However, the lack of confirmed training completion and deployed fine-tuned model weights is a material gap for the track judging criteria.
