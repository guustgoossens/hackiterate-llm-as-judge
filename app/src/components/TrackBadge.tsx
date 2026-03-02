const TRACK_STYLES: Record<number, string> = {
  1: 'bg-[#E85C0F]/15 text-[#F57A1F] border-[#E85C0F]/30',
  2: 'bg-[#F5A623]/15 text-[#F5A623] border-[#F5A623]/30',
  3: 'bg-[#FFD036]/15 text-[#FFD036] border-[#FFD036]/30',
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
