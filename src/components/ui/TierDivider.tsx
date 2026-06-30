interface TierDividerProps {
  label: string
}

export function TierDivider({ label }: TierDividerProps) {
  return (
    <div className="flex items-center gap-4 py-1">
      <span className="h-px flex-1 bg-line" />
      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-fg-muted whitespace-nowrap">
        {label}
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}
