const TRACK_STYLES: Record<number, string> = {
  1: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
  2: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800',
  3: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
}

const TRACK_LABELS: Record<number, string> = {
  1: 'T1 — Anything Goes',
  2: 'T2 — Fine-Tuning',
  3: 'T3 — On Device',
}

export function TrackBadge({ trackNumber }: { trackNumber: number }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${TRACK_STYLES[trackNumber] ?? ''}`}
    >
      {TRACK_LABELS[trackNumber] ?? `T${trackNumber}`}
    </span>
  )
}
