import { cn } from '@/lib/utils'
import type { ConnectionState } from '@/store/status'

const config: Record<
  ConnectionState,
  { label: string; dot: string; text: string; pulse: boolean }
> = {
  open: { label: 'Live', dot: 'bg-healthy', text: 'text-healthy', pulse: false },
  connecting: { label: 'Connecting…', dot: 'bg-degraded', text: 'text-degraded', pulse: true },
  reconnecting: { label: 'Reconnecting…', dot: 'bg-degraded', text: 'text-degraded', pulse: true },
  failed: {
    label: 'Reconnecting…',
    dot: 'bg-critical-bright',
    text: 'text-critical-bright',
    pulse: true,
  },
}

export function ConnectionBadge({ connection }: { connection: ConnectionState }) {
  const { label, dot, text, pulse } = config[connection]
  return (
    <span
      className="border-line flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 font-mono text-xs"
      title={`Status feed: ${connection}`}
    >
      <span className="relative flex size-2">
        {pulse && (
          <span
            className={cn(
              'absolute inline-flex size-full animate-ping rounded-full opacity-75',
              dot,
            )}
          />
        )}
        <span className={cn('relative inline-flex size-2 rounded-full', dot)} />
      </span>
      <span className={cn('hidden sm:inline', text)}>{label}</span>
    </span>
  )
}
