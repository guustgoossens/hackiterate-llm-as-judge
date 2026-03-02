import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({ component: About })

function About() {
  return (
    <main className="page-wrap px-4 pb-8 pt-8">
      <section className="rise-in overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #E83A0F, #E85C0F, #F5A623, #FFD036)' }} />
        <div className="px-6 py-8 sm:px-10 sm:py-10">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange-muted)]">
            How It Works
          </p>
          <h1 className="gradient-text mb-6 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Methodology
          </h1>
          <div className="prose prose-invert max-w-none">
            <h2>Overview</h2>
            <p>
              This project uses <strong>Claude Code</strong> as an automated hackathon judge to evaluate
              submissions from the Mistral AI Worldwide Hackathon 2026 (Paris Edition, Feb 28–Mar 1, 2026).
              Instead of manually reviewing 32+ repositories, we constructed a structured judging system prompt
              and had Claude evaluate each project by reading its GitHub repository directly.
            </p>

            <h2>Workflow</h2>
            <ol>
              <li>
                <strong>Collect Submissions</strong> — Scraped the hackiterate.com submission page and compiled
                all GitHub repository URLs.
              </li>
              <li>
                <strong>Design the Judge Prompt</strong> — Created a detailed system prompt with 4 equally
                weighted criteria (25 points each): Technicity, Creativity, Usefulness, and Track Alignment.
              </li>
              <li>
                <strong>Evaluate Each Repository</strong> — Claude Code fetched and analyzed each repo's README,
                source code, and documentation against the scoring rubric.
              </li>
              <li>
                <strong>Generate Reports</strong> — Each project received a structured Markdown report with
                scores, justifications, strengths, and areas for improvement.
              </li>
            </ol>

            <h2>Scoring Criteria</h2>
            <table>
              <thead>
                <tr>
                  <th>Criterion</th>
                  <th>Weight</th>
                  <th>What It Measures</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Technicity</strong></td>
                  <td>25 pts</td>
                  <td>Code quality, technical complexity, Mistral integration, architecture, completeness</td>
                </tr>
                <tr>
                  <td><strong>Creativity</strong></td>
                  <td>25 pts</td>
                  <td>Novelty of concept, unexpected combinations, boundary-pushing ideas</td>
                </tr>
                <tr>
                  <td><strong>Usefulness</strong></td>
                  <td>25 pts</td>
                  <td>Real-world problem solving, target audience, value over existing solutions</td>
                </tr>
                <tr>
                  <td><strong>Track Alignment</strong></td>
                  <td>25 pts</td>
                  <td>Fit with chosen track (Anything Goes, Fine-Tuning, or On Device)</td>
                </tr>
              </tbody>
            </table>

            <h2>Score Anchoring</h2>
            <p>Each score range maps to a description to prevent inflation:</p>
            <ul>
              <li><strong>0–6:</strong> Minimal effort / no clear value</li>
              <li><strong>7–12:</strong> Basic / limited complexity</li>
              <li><strong>13–19:</strong> Solid / meaningful implementation</li>
              <li><strong>20–25:</strong> Outstanding / production-quality</li>
            </ul>

            <h2>Limitations</h2>
            <ul>
              <li>The LLM can only evaluate what's visible in the repository — it cannot run projects or test live demos.</li>
              <li>One project (Summa) is flagged as COI since the repo owner is the same person running the judge tool.</li>
              <li>Two projects were flagged for not using Mistral models at all.</li>
              <li>The model may have biases toward well-documented projects with clear READMEs.</li>
            </ul>

            <h2>Tools Used</h2>
            <ul>
              <li><strong>Claude Code</strong> — the LLM agent performing evaluations</li>
              <li><strong>Claude Sonnet 4.5</strong> — the underlying model</li>
              <li><strong>GitHub CLI</strong> — for authenticated repository access</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  )
}
