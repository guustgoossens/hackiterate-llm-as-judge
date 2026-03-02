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
    <main className="page-wrap px-4 pb-8 pt-8">
      {/* Hero banner with gradient */}
      <section className="rise-in relative overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        {/* Gradient accent bar at top */}
        <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #E83A0F, #E85C0F, #F5A623, #FFD036)' }} />

        <div className="relative px-6 py-8 sm:px-10 sm:py-10">
          {/* Subtle pixel grid background — behind text */}
          <div
            className="pulse-glow pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(var(--orange-primary) 1px, transparent 1px), linear-gradient(90deg, var(--orange-primary) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          <p className="relative z-10 mb-2 font-[var(--font-pixel)] text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[var(--orange-bright)]">
            Mistral AI Worldwide Hackathon 2026
          </p>
          <h1 className="gradient-text relative z-10 mb-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
            LLM-as-Judge Rankings
          </h1>
          <p className="relative z-10 mb-0 max-w-2xl text-sm text-[var(--text-secondary)] sm:text-base">
            {stats.total} projects evaluated across 3 tracks by Claude.
            Each scored on Technicity, Creativity, Usefulness, and Track Alignment (25 pts each).
          </p>
        </div>
      </section>

      {/* Stats row — gradient progression across cards */}
      <section className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
        {[
          { label: 'Projects', value: stats.total, suffix: '', color: '#E83A0F' },
          { label: 'Mean', value: stats.mean, suffix: '/100', color: '#E85C0F' },
          { label: 'Median', value: stats.median, suffix: '/100', color: '#F57A1F' },
          { label: 'Highest', value: stats.highest, suffix: '/100', color: '#F5A623' },
          { label: 'Lowest', value: stats.lowest, suffix: '/100', color: '#FFD036' },
        ].map(({ label, value, suffix, color }) => (
          <div
            key={label}
            className="overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
          >
            <div
              className="px-3 py-1 text-center text-[0.6rem] font-bold uppercase tracking-[0.2em]"
              style={{ backgroundColor: `${color}15`, color }}
            >
              {label}
            </div>
            <div className="px-3 py-2.5 text-center">
              <span className="text-xl font-extrabold tabular-nums text-[var(--text-primary)]">
                {value}
              </span>
              {suffix && (
                <span className="text-xs font-normal text-[var(--text-tertiary)]">{suffix}</span>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Filters */}
      <section className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {tracks.map((t) => (
            <button
              key={t.label}
              onClick={() => setTrackFilter(t.num)}
              className={`border px-3 py-1.5 text-xs font-semibold transition ${
                trackFilter === t.num
                  ? 'border-[var(--orange-primary)]/40 bg-[var(--orange-primary)]/15 text-[var(--orange-bright)]'
                  : 'border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--orange-primary)]/30 hover:text-[var(--text-primary)]'
              }`}
            >
              {t.label}
              <span className="ml-1 opacity-50">{t.count}</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
          />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-[var(--border-medium)] bg-[var(--bg-surface)] py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition focus:border-[var(--orange-primary)] sm:w-64"
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
