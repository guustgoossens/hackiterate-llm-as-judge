function scoreColor(score: number, max: number): string {
  const pct = score / max
  if (pct >= 0.84) return 'bg-emerald-500'
  if (pct >= 0.72) return 'bg-lime-500'
  if (pct >= 0.6) return 'bg-yellow-500'
  if (pct >= 0.48) return 'bg-orange-500'
  return 'bg-red-500'
}

export function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = (score / max) * 100
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 text-right text-sm font-semibold tabular-nums">{score}</span>
      <div className="h-2 w-16 overflow-hidden rounded-full bg-[var(--line)]">
        <div
          className={`h-full rounded-full transition-all ${scoreColor(score, max)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function TotalScore({ score }: { score: number }) {
  const pct = score / 100
  let color = 'text-red-500'
  if (pct >= 0.84) color = 'text-emerald-500'
  else if (pct >= 0.72) color = 'text-lime-600'
  else if (pct >= 0.6) color = 'text-yellow-600'
  else if (pct >= 0.48) color = 'text-orange-500'

  return (
    <span className={`text-lg font-bold tabular-nums ${color}`}>
      {score}
    </span>
  )
}
