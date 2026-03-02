# Judge Report: SynthCare

**Track:** Track 2 — Fine-Tuning (W&B)
**Repository:** https://github.com/guigzair/SynthCare

## Summary

SynthCare is a GAN (Generative Adversarial Network) framework for generating GDPR-compliant synthetic emergency health admission records, using Ministral-3B as both the generator and discriminator in a novel LLM-based GAN architecture. The project trains on MIMIC-III emergency admission data, generates synthetic patient records that preserve statistical distributions without exposing real patient information, and provides a Streamlit UI for interaction. It also includes W&B integration for training metrics and a verification pipeline for assessing synthetic data quality.

## Scores

| Criterion | Score (/25) | Justification |
|-----------|-------------|---------------|
| Technicity | 12 | The `Mistral_GAN_example.py` implements a genuine GAN training loop: a generator (Ministral-3B + LoRA, `TaskType.CAUSAL_LM`) that produces synthetic clinical records, and a discriminator (Ministral-3B + LoRA, `TaskType.SEQ_CLS`) that learns to distinguish real from synthetic. The training loop alternates discriminator and generator training steps with appropriate loss computation and W&B logging. However, the architecture has significant technical issues: using a generative LLM as a `SEQ_CLS` discriminator without a classification head is architecturally incorrect (the discriminator loss computation in `train_step()` expands labels to match sequence length rather than producing a single classification score per sample), and the generator's loss function is primarily a language modeling objective with a weak discriminator feedback term. The `GAN_fine_tuning.py` does not implement a true GAN — it's a standard LoRA fine-tuning script that also instantiates a separate discriminator model but doesn't use it in the training loop shown. |
| Creativity | 18 | Applying a GAN architecture to LLM fine-tuning for synthetic medical data generation is a genuinely novel idea. The problem framing — using Ministral-3B as both generator (to produce synthetic clinical records) and discriminator (to distinguish real from synthetic) — is creative even if the implementation is technically imperfect. The GDPR compliance angle (models trained locally to ensure data privacy, no real patient data exposed in outputs) is a meaningful and timely application. Using an LLM-based GAN rather than a traditional tabular GAN (like CTGAN) for healthcare data is an unconventional and interesting research direction. |
| Usefulness | 16 | The healthcare synthetic data problem is real and important: GDPR and HIPAA severely restrict sharing real patient data, but researchers and AI developers need realistic datasets. MIMIC-III access requires data use agreements, making accessible alternatives valuable. A working GDPR-compliant synthetic health data generator with a Streamlit UI would have direct utility for hospitals, research institutions, and AI developers in the medical space. The domain framing is strong; the execution would need refinement to be production-ready. |
| Track Alignment | 14 | Partial Track 2 alignment: the project uses Ministral-3B with LoRA fine-tuning (both for the generator and discriminator), uses W&B (`wandb.init()` in `Mistral_GAN_example.py` with `project="GAN-FineTuning"` and batch-level metric logging), and targets a specific task (synthetic health data generation). However, the GAN-style training loop has architectural issues that undermine the fine-tuning claims, there are no evaluation metrics showing the quality of generated synthetic data vs. real data distributions, and no trained model artifact or fine-tuning results are included in the repository. The W&B integration is present but training results are not shown. |

**Total: 60/100**

## Strengths

- Novel and creative application of GAN paradigm to LLM fine-tuning for medical data generation — an unconventional approach that is worth exploring
- W&B integration is genuinely implemented (`wandb.init()` with project/config tracking, per-batch `wandb.log()` for discriminator loss, generator loss, LM loss, and fool loss)
- The GDPR/healthcare framing is compelling and addresses a real, significant problem — synthetic health data is an active research area with real-world impact
- `create_dataset.py` shows how to transform MIMIC-III CSV data (ADMISSIONS, PATIENTS, D_ICD_DIAGNOSES, D_ICD_PROCEDURES) into structured clinical story prompts
- The project includes a `synthetic_data.jsonl` and `clinical_stories.jsonl` file, demonstrating that at least some data generation pipeline has been run
- `inference_verification.py` suggests an evaluation pipeline exists to assess synthetic data quality
- Streamlit UI (`streamlit_app.py`) provides a usable interface for the generated data

## Areas for Improvement

- The discriminator architecture is technically flawed: `Mistral3ForConditionalGeneration` with `TaskType.SEQ_CLS` LoRA cannot produce per-sample classification scores without a classification head — the label expansion hack (`unsqueeze(1).expand(-1, seq_len)`) creates sequence-level token labels rather than binary real/fake labels
- `GAN_fine_tuning.py` is labeled as GAN fine-tuning but is actually a standard LoRA fine-tuning script with a separate (unused in the loop) discriminator model — the two models are initialized but only the generator is trained via the `Trainer`
- No trained model artifact, HuggingFace Hub push, or evaluation results showing synthetic data quality metrics (e.g., fidelity to MIMIC-III distributions, privacy guarantees)
- The MIMIC-III dataset requires a data use agreement and is not included; `create_dataset.py` expects CSV files at `Data/ADMISSIONS.csv` etc. — making reproducibility impossible without institutional access
- The `prompt.txt` file referenced in `Mistral_GAN_example.py` is included but contains a generic instruction without clinical specificity; more domain-specific prompting would improve generation quality
- The Streamlit app (`streamlit_app.py`) is not shown in detail — unclear what it actually displays

## Detailed Reasoning

SynthCare tackles a genuinely important problem at the intersection of AI, healthcare, and privacy regulation. The GDPR-compliant synthetic health data generation challenge is one that healthcare AI companies actively invest in, and using Ministral-3B as the generative backbone is a reasonable choice for producing structured clinical text. The `create_dataset.py` pipeline shows a clear understanding of the MIMIC-III schema: it joins ADMISSIONS, PATIENTS, D_ICD_DIAGNOSES, and D_ICD_PROCEDURES tables, constructs clinical story narratives from the structured fields, and formats them as instruction/context/output triples for fine-tuning. This data engineering work, while straightforward, demonstrates domain understanding.

The `Mistral_GAN_example.py` is the most ambitious file in the repository. It attempts to implement a novel LLM-GAN architecture where both the generator and discriminator are LoRA-adapted instances of Ministral-3B. The training loop alternates between discriminator training (real data labeled 1, synthetic labeled 0) and generator training (LM loss + discriminator fool loss with 0.5 weight). W&B logging tracks all four loss components per batch. The conceptual ambition is real: if an LLM can learn to distinguish real clinical records from synthetic ones, then training the generator to fool this discriminator should improve the realism of generated data in a GAN adversarial dynamic.

The core technical problem is that `Mistral3ForConditionalGeneration` is not designed for sequence classification. When used with `TaskType.SEQ_CLS` LoRA, it lacks a classification head that would pool the sequence representation into a real/fake probability. The code works around this by expanding binary labels to match sequence length (treating it as per-token classification), which is mathematically different from binary GAN discriminator training and would produce noisy, unstable training signals. A correct implementation would use `AutoModelForSequenceClassification` or add a classification head on top of the last hidden state. This architectural issue means the GAN training is unlikely to converge as intended, though the LM fine-tuning component of the generator would still learn something from the clinical data.

The `GAN_fine_tuning.py` file compounds this issue: despite the name, it's a standard HuggingFace `Trainer`-based LoRA fine-tuning script that initializes a discriminator model but never uses it in the training loop shown. This is either incomplete implementation or a cleaner version of the standard fine-tuning path, leaving the GAN dynamics only partially realized.

Despite these technical gaps, the project scores well on creativity and usefulness because the problem is real, the approach is novel, and the implementation shows genuine effort. The hackathon context of 24 hours partially explains the architectural shortcuts. With more time, fixing the discriminator architecture and adding evaluation metrics showing distribution fidelity would significantly strengthen the submission.

## Special Challenge Eligibility

**Best AI for Safety Project (White Circle):** Plausible candidate. The project's central goal is generating synthetic health data to protect patient privacy and comply with GDPR — this is directly in the AI safety and responsible AI space. Preventing leakage of real patient data while enabling medical AI research is a meaningful safety application.
