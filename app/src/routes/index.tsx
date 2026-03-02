import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import projects from '../data/projects.json'
import type { Project } from '../data/types'
import { ProjectTable } from '../components/ProjectTable'

export const Route = createFileRoute('/')({ component: App })

const data = projects as Project[]

function App() {
  const [search, setSearch] = useState('')
  const [trackFilter, setTrackFilter] = useState<number | null>(null)

  const stats = useMemo(() => {
    const scores = data.map((p) => p.scores.total)
    const sorted = [...scores].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return {
      total: data.length,
      mean: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1),
      median: sorted.length % 2 ? sorted[mid] : ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(0),
      highest: sorted[sorted.length - 1],
      lowest: sorted[0],
      t1: data.filter((p) => p.trackNumber === 1).length,
      t2: data.filter((p) => p.trackNumber === 2).length,
      t3: data.filter((p) => p.trackNumber === 3).length,
    }
  }, [])

  const tracks = [
    { num: null, label: 'All', count: stats.total },
    { num: 1, label: 'T1 — Anything Goes', count: stats.t1 },
    { num: 2, label: 'T2 — Fine-Tuning', count: stats.t2 },
    { num: 3, label: 'T3 — On Device', count: stats.t3 },
  ]

  return (
    <main className="page-wrap px-4 pb-8 pt-10">
      {/* Hero */}
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-8 sm:px-10 sm:py-10">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
        <p className="island-kicker mb-2">Mistral AI Worldwide Hackathon 2026</p>
        <h1 className="display-title mb-3 max-w-3xl text-3xl leading-tight font-bold tracking-tight text-[var(--sea-ink)] sm:text-5xl">
          LLM-as-Judge Rankings
        </h1>
        <p className="mb-0 max-w-2xl text-sm text-[var(--sea-ink-soft)] sm:text-base">
          {stats.total} projects evaluated across {stats.t1 + stats.t2 + stats.t3 > 0 ? '3 tracks' : 'multiple tracks'} by
          Claude. Each scored on Technicity, Creativity, Usefulness, and Track Alignment (25 pts each).
        </p>
      </section>

      {/* Stats */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ['Projects', stats.total],
          ['Mean', stats.mean],
          ['Median', stats.median],
          ['Highest', stats.highest],
          ['Lowest', stats.lowest],
        ].map(([label, value]) => (
          <div
            key={label as string}
            className="island-shell rounded-xl p-3 text-center"
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
              {label}
            </div>
            <div className="mt-1 text-xl font-bold tabular-nums text-[var(--sea-ink)]">
              {value}
              {label !== 'Projects' && (
                <span className="text-sm font-normal text-[var(--sea-ink-soft)]">/100</span>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Filters */}
      <section className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {tracks.map((t) => (
            <button
              key={t.label}
              onClick={() => setTrackFilter(t.num)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                trackFilter === t.num
                  ? 'border-[var(--lagoon)] bg-[rgba(79,184,178,0.18)] text-[var(--lagoon-deep)]'
                  : 'border-[var(--line)] bg-[var(--surface)] text-[var(--sea-ink-soft)] hover:border-[var(--lagoon-deep)] hover:text-[var(--sea-ink)]'
              }`}
            >
              {t.label}
              <span className="ml-1 opacity-60">{t.count}</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sea-ink-soft)]"
          />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] py-2 pl-9 pr-4 text-sm text-[var(--sea-ink)] placeholder-[var(--sea-ink-soft)] outline-none transition focus:border-[var(--lagoon)] focus:ring-1 focus:ring-[var(--lagoon)] sm:w-64"
          />
        </div>
      </section>

      {/* Table */}
      <section className="mt-4">
        <ProjectTable
          data={data}
          globalFilter={search}
          trackFilter={trackFilter}
        />
      </section>
    </main>
  )
}
