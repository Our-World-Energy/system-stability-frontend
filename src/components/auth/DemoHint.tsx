import { FlaskConical } from 'lucide-react'
import { DEMO_MODE, DEMO_OTP } from '@/lib/auth-demo'

/**
 * Shows the code the stubbed OTP screen accepts, since nothing actually mails one.
 * Renders nothing once DEMO_MODE is off — deleting lib/auth-demo.ts at integration
 * time removes this automatically.
 */
export function DemoHint() {
  if (!DEMO_MODE) return null

  return (
    <div className="border-line-bright/60 bg-input/50 mt-6 rounded-lg border border-dashed px-3 py-2.5">
      <p className="text-fg-subtle flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-[0.12em] uppercase">
        <FlaskConical className="size-3.5" />
        Demo only — no backend yet
      </p>
      <p className="mt-2 font-mono text-xs">
        <span className="text-fg-muted">Any email works. Code: </span>
        <span className="text-primary-bright tracking-[0.2em]">{DEMO_OTP}</span>
      </p>
    </div>
  )
}
