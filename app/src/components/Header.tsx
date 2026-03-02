import { Link } from '@tanstack/react-router'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-[var(--bg-surface)]">
      <nav className="page-wrap flex flex-wrap items-center gap-x-4 gap-y-2 py-3 sm:py-4">
        <h2 className="m-0 flex-shrink-0 text-base font-bold tracking-tight">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 no-underline"
          >
            {/* Pixel flame icon */}
            <span className="pixel-art flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-elevated)] text-lg leading-none">
              <svg width="20" height="20" viewBox="0 0 8 8" className="pixel-art">
                <rect x="3" y="0" width="2" height="1" fill="#FFD036"/>
                <rect x="2" y="1" width="1" height="1" fill="#F5A623"/>
                <rect x="3" y="1" width="2" height="1" fill="#FFD036"/>
                <rect x="5" y="1" width="1" height="1" fill="#F5A623"/>
                <rect x="1" y="2" width="1" height="1" fill="#E85C0F"/>
                <rect x="2" y="2" width="4" height="1" fill="#F57A1F"/>
                <rect x="6" y="2" width="1" height="1" fill="#E85C0F"/>
                <rect x="1" y="3" width="1" height="1" fill="#E83A0F"/>
                <rect x="2" y="3" width="4" height="1" fill="#E85C0F"/>
                <rect x="6" y="3" width="1" height="1" fill="#E83A0F"/>
                <rect x="2" y="4" width="4" height="1" fill="#D4603A"/>
                <rect x="2" y="5" width="4" height="1" fill="#8B2A1A"/>
                <rect x="3" y="6" width="2" height="1" fill="#6B3A2A"/>
                <rect x="3" y="7" width="2" height="1" fill="#4A2A1A"/>
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

        <a
          href="https://github.com/guustgoossens/hackiterate-llm-as-judge"
          target="_blank"
          rel="noreferrer"
          className="ml-auto rounded-lg p-2 text-[var(--text-tertiary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-secondary)]"
        >
          <span className="sr-only">View on GitHub</span>
          <svg viewBox="0 0 16 16" aria-hidden="true" width="20" height="20">
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"
            />
          </svg>
        </a>
      </nav>
      <div className="gradient-bar" />
    </header>
  )
}
