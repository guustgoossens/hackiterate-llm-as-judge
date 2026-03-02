import type { Project } from '../data/types'
import { TrackBadge } from './TrackBadge'

export function ProjectDetail({ project }: { project: Project }) {
  return (
    <div className="space-y-5 px-3 py-5 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <TrackBadge trackNumber={project.trackNumber} />
        <a
          href={project.repoUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--orange-primary)] hover:text-[var(--orange-bright)]"
          onClick={(e) => e.stopPropagation()}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" className="opacity-70">
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"
            />
          </svg>
          {project.repoOwner}/{project.repoName}
        </a>
      </div>

      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
        {project.summary}
      </p>

      {/* Score breakdown cards with gradient progression */}
      <div className="grid gap-3 sm:grid-cols-4">
        {([
          { key: 'technicity' as const, label: 'Technicity', color: '#E83A0F' },
          { key: 'creativity' as const, label: 'Creativity', color: '#E85C0F' },
          { key: 'usefulness' as const, label: 'Usefulness', color: '#F5A623' },
          { key: 'alignment' as const, label: 'Track Align.', color: '#FFD036' },
        ]).map(({ key, label, color }) => (
          <div
            key={key}
            className="overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
          >
            <div
              className="px-3 py-1.5 text-center text-[0.65rem] font-bold uppercase tracking-[0.15em]"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {label}
            </div>
            <div className="px-3 py-3 text-center">
              <span className="text-2xl font-extrabold tabular-nums text-[var(--text-primary)]">
                {project.scores[key]}
              </span>
              <span className="text-sm font-normal text-[var(--text-tertiary)]">/25</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {project.strengths.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-[var(--orange-primary)]">
              Strengths
            </h4>
            <ul className="m-0 list-none space-y-1.5 pl-0 text-xs leading-relaxed text-[var(--text-secondary)]">
              {project.strengths.slice(0, 4).map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-0.5 text-[var(--orange-muted)]">&#9656;</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {project.improvements.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-[var(--amber-warm)]">
              Areas for Improvement
            </h4>
            <ul className="m-0 list-none space-y-1.5 pl-0 text-xs leading-relaxed text-[var(--text-secondary)]">
              {project.improvements.slice(0, 4).map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-0.5 text-[var(--text-tertiary)]">&#9656;</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {project.specialChallenges.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-[var(--yellow-highlight)]">
            Special Challenge Eligibility
          </h4>
          <ul className="m-0 list-none space-y-1.5 pl-0 text-xs leading-relaxed text-[var(--text-secondary)]">
            {project.specialChallenges.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-0.5 text-[var(--yellow-highlight)]">&#9734;</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
