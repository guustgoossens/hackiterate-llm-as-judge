export default function Footer() {
  return (
    <footer className="mt-20 border-t border-[var(--line)] px-4 pb-14 pt-10 text-[var(--sea-ink-soft)]">
      <div className="page-wrap flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="m-0 text-sm">
          Mistral AI Worldwide Hackathon 2026 &middot; Paris Edition &middot; Feb 28–Mar 1
        </p>
        <p className="island-kicker m-0">LLM-as-Judge</p>
      </div>
    </footer>
  )
}
