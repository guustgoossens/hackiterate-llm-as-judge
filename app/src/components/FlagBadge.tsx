const FLAG_STYLES: Record<string, string> = {
  COI: 'bg-[#E83A0F]/15 text-[#E83A0F] border-[#E83A0F]/30',
  'No Mistral': 'bg-[#D4603A]/15 text-[#D4603A] border-[#D4603A]/30',
  Partial: 'bg-[var(--bg-elevated)] text-[var(--text-tertiary)] border-[var(--border-medium)]',
}

export function FlagBadge({ flag }: { flag: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${FLAG_STYLES[flag] ?? FLAG_STYLES.Partial}`}
    >
      <span className="text-[0.6rem]">&#9888;</span>
      {flag}
    </span>
  )
}
