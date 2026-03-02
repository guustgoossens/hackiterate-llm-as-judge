import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Star } from 'lucide-react'

export default function Header() {
  const [stars, setStars] = useState<number | null>(null)

  useEffect(() => {
    fetch('https://api.github.com/repos/guustgoossens/hackiterate-llm-as-judge')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.stargazers_count != null) setStars(d.stargazers_count) })
      .catch(() => {})
  }, [])

  return (
    <header className="sticky top-0 z-50 bg-[var(--bg-surface)]">
      <nav className="page-wrap flex flex-wrap items-center gap-x-4 gap-y-2 py-3 sm:py-4">
        <h2 className="m-0 flex-shrink-0 text-base font-bold tracking-tight">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 no-underline"
          >
            {/* Pixel gavel icon */}
            <span className="pixel-art flex h-8 w-8 items-center justify-center bg-[var(--bg-elevated)] text-lg leading-none">
              <svg width="20" height="20" viewBox="0 0 8 8" className="pixel-art">
                <rect x="1" y="0" width="1" height="1" fill="#FFD036"/>
                <rect x="6" y="0" width="1" height="1" fill="#FFD036"/>
                <rect x="0" y="1" width="8" height="1" fill="#F5A623"/>
                <rect x="0" y="2" width="8" height="1" fill="#E85C0F"/>
                <rect x="3" y="3" width="2" height="1" fill="#D4603A"/>
                <rect x="3" y="4" width="2" height="1" fill="#8B2A1A"/>
                <rect x="3" y="5" width="2" height="1" fill="#6B3A2A"/>
                <rect x="1" y="6" width="6" height="1" fill="#D4603A"/>
                <rect x="1" y="7" width="6" height="1" fill="#8B2A1A"/>
              </svg>
            </span>
            <span className="gradient-text text-sm font-extrabold tracking-tight sm:text-base">
              LLM Judge
            </span>
          </Link>
        </h2>

        <div className="flex items-center gap-4 text-sm font-semibold sm:ml-4">
          <Link
            to="/"
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] [&.active]:text-[var(--orange-primary)]"
            activeProps={{ className: 'active' }}
          >
            Rankings
          </Link>
          <Link
            to="/about"
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] [&.active]:text-[var(--orange-primary)]"
            activeProps={{ className: 'active' }}
          >
            Methodology
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Speech bubble */}
          <span className="relative whitespace-nowrap border-2 border-[var(--yellow-highlight)]/40 bg-[var(--bg-surface)] px-4 py-2 font-[var(--font-pixel)] text-xs text-[var(--yellow-highlight)] shadow-[0_0_20px_rgba(255,208,54,0.1)]">
            Add a star!
            {/* Triangle nub pointing right */}
            <span className="absolute -right-[9px] top-1/2 h-0 w-0 -translate-y-1/2 border-y-[8px] border-l-[8px] border-y-transparent border-l-[var(--yellow-highlight)]/40" />
            <span className="absolute -right-[7px] top-1/2 h-0 w-0 -translate-y-1/2 border-y-[8px] border-l-[8px] border-y-transparent border-l-[var(--bg-surface)]" />
          </span>

          <a
            href="https://github.com/guustgoossens/hackiterate-llm-as-judge"
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-2 border border-[var(--border-medium)] px-3 py-1.5 text-[var(--text-tertiary)] transition hover:border-[var(--yellow-highlight)]/40 hover:bg-[var(--bg-elevated)] hover:text-[var(--text-secondary)]"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" width="16" height="16">
              <path
                fill="currentColor"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"
              />
            </svg>
            <Star size={14} className="text-[var(--yellow-highlight)] group-hover:fill-[var(--yellow-highlight)]" />
            <span className="text-xs font-bold tabular-nums text-[var(--text-secondary)]">
              {stars ?? '–'}
            </span>
          </a>
        </div>
      </nav>
      <div className="gradient-bar" />
    </header>
  )
}
