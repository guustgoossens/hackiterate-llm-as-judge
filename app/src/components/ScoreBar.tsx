function scoreGradient(score: number, max: number): string {
  const pct = score / max
  if (pct >= 0.84) return 'from-[#E85C0F] to-[#FFD036]'
  if (pct >= 0.72) return 'from-[#E85C0F] to-[#F5A623]'
  if (pct >= 0.6) return 'from-[#D4603A] to-[#E85C0F]'
  if (pct >= 0.48) return 'from-[#8B2A1A] to-[#D4603A]'
  return 'from-[#4A2A1A] to-[#8B2A1A]'
}

export function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = (score / max) * 100
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 text-right text-sm font-bold tabular-nums text-[var(--text-primary)]">
        {score}
      </span>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--bg-input)]">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${scoreGradient(score, max)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function TotalScore({ score }: { score: number }) {
  return (
    <span className="gradient-text text-lg font-extrabold tabular-nums">
      {score}
    </span>
  )
}
