export default function Footer() {
  return (
    <footer className="mt-20 border-t border-[var(--border-subtle)] px-4 pb-14 pt-10">
      <div className="page-wrap flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="m-0 text-sm text-[var(--text-tertiary)]">
          Mistral AI Worldwide Hackathon 2026 &middot; Paris Edition &middot; Feb 28–Mar 1
        </p>
        <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange-muted)]">
          LLM-as-Judge
        </p>
      </div>
    </footer>
  )
}
