interface TierDividerProps {
  label: string
}

export function TierDivider({ label }: TierDividerProps) {
  return (
    <div className="flex items-center gap-4 py-1">
      <span className="bg-line h-px flex-1" />
      <span className="text-fg-muted font-mono text-[11px] font-bold tracking-[0.15em] whitespace-nowrap uppercase">
        {label}
      </span>
      <span className="bg-line h-px flex-1" />
    </div>
  )
}
