# Way of Working: LLM-as-Judge for Hackathon Evaluation

## Overview

This project uses **Claude Code** as an automated hackathon judge to evaluate submissions from the **Mistral AI Worldwide Hackathon 2026** (Paris Edition, Feb 28–Mar 1, 2026). Instead of manually reviewing 32+ repositories, we constructed a structured judging system prompt and had Claude evaluate each project by reading its GitHub repository directly.

## Workflow

### 1. Collect Submissions

We scraped the hackathon submission page ([hackiterate.com](https://hackiterate.com/mistral-worldwide-hackathons?tab=hackerspace)) and compiled all GitHub repository URLs into `mistral_hackathon_repos.md` — a simple table of 41 repos (some were inaccessible / "Page not found").

### 2. Design the Judge System Prompt

The core of the approach is `judge_system_prompt.md`; a detailed system prompt that instructs the LLM how to behave as a hackathon judge. Key design decisions:

- **4 equally weighted criteria** (25 points each, 100 total): Technicity, Creativity, Usefulness, Track Alignment
- **Score guides** with explicit ranges (0–6, 7–12, 13–19, 20–25) anchored to descriptions, preventing score inflation
- **Evidence-based scoring** — every score must cite specific files, code patterns, or documentation from the repo
- **Structured output format** — each report follows a consistent Markdown template with Summary, Scores table, Strengths, Areas for Improvement, Detailed Reasoning, and Special Challenge Eligibility
- **Conflict of interest flagging** — the prompt instructs the judge to flag repos owned by the person running the tool
- **Hackathon context awareness** — projects were built in ~24 hours, and the prompt acknowledges this constraint

### 3. Evaluate Each Repository

For each repository in the list, Claude Code was given the system prompt and asked to evaluate the repo. The process for each:

1. Claude fetches/reads the GitHub repository (README, source code, documentation)
2. It analyzes the codebase against the 4 scoring criteria
3. It generates a structured Markdown report saved as `reports/judge_<owner>_<repo>.md`

Each evaluation involved Claude:
- Reading the README and key documentation
- Exploring the directory structure and source code
- Identifying how Mistral models were integrated
- Assessing code quality, architecture, and completeness
- Checking track alignment and special challenge eligibility

### 4. Generate the Overview

After all individual reports were created, Claude compiled `reports/overview.md` — a master ranking with:
- Scores-at-a-glance table (sorted by total score descending)
- ASCII score distribution chart
- Breakdown by track
- Special challenge candidates
- Notable flags (COI, missing Mistral integration, partial submissions)
- Links to all individual report files

## Project Structure

```
hackiterate_llm_as_judge/
├── judge_system_prompt.md          # The LLM judge system prompt
├── mistral_hackathon_paris_repos.md      # List of all hackathon repos to evaluate
├── methodology.md               # This document
└── reports/
    ├── overview.md                 # Master ranking & summary
    ├── judge_<owner>_<repo>.md     # Individual judge reports (32 files)
    └── ...
```

## Key Design Principles

### Why LLM-as-Judge?

- **Scale**: 32 repositories with complex codebases — manual deep review of each would take days
- **Consistency**: The same criteria and scoring rubric applied uniformly to every project
- **Transparency**: Every score has written justification citing specific evidence from the code
- **Speed**: All evaluations completed in a single session

### Prompt Engineering Choices

1. **Explicit score anchoring**: Instead of vague "rate 1-10", each score range (0-6, 7-12, 13-19, 20-25) maps to a description. This prevents the common LLM bias of clustering scores around 7-8/10.
2. **Evidence requirement**: "Every score must be backed by specific observations from the code" — forces the model to ground its evaluation in actual repository contents.
3. **No assumptions rule**: "If a feature is claimed but not visible in the code, do not give credit for it" — prevents the model from being swayed by marketing language in READMEs.
4. **Structured output**: The Markdown template ensures every report is comparable and machine-parseable.
5. **COI awareness**: Built-in instruction to flag when the repo owner matches the tool operator.

### Limitations & Caveats

- The LLM can only evaluate what's visible in the repository (code, docs, README). It cannot run the projects, test live demos, or evaluate UX quality.
- Scores reflect a single LLM's assessment — for high-stakes decisions, human review of the reports is recommended.
- One project (Summa) was flagged as COI since the repo owner is the same person running the judge tool.
- Two projects were flagged for not using Mistral models at all (using OpenAI/Claude instead).
- The model may have biases toward well-documented projects with clear READMEs.

## Tools Used

- **Claude Code** — the LLM agent that performed all evaluations
- **Claude Sonnet 4.5** — the underlying model powering the evaluations
- **GitHub CLI (`gh`)** — for authenticated access to repositories

## Results

- **32 projects evaluated** across 3 tracks
- **Score range**: 57–88 out of 100
- **Mean**: 76.8 / **Median**: 79
- All reports available in the `reports/` directory
