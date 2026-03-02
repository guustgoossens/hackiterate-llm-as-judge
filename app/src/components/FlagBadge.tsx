const FLAG_STYLES: Record<string, string> = {
  COI: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800',
  'No Mistral': 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800',
  Partial: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700',
}

export function FlagBadge({ flag }: { flag: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${FLAG_STYLES[flag] ?? FLAG_STYLES.Partial}`}
    >
      <span>&#9888;</span>
      {flag}
    </span>
  )
}
