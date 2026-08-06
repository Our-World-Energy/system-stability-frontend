import logoUrl from '@/assets/Logo.svg'
import { AuthBackdrop } from './AuthBackdrop'

interface AuthShellProps {
  /** Card heading, e.g. "User Login". */
  title: string
  /** Optional supporting copy directly under the heading. */
  subtitle?: React.ReactNode
  /** The form. */
  children: React.ReactNode
}

/**
 * Full-page frame shared by every auth screen: ambient backdrop, the Backplate mark
 * pinned top-left, and a centred card with the emerald hairline along its top edge.
 */
export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="text-fg relative flex min-h-screen flex-1 flex-col overflow-hidden bg-[#0b1326]">
      <AuthBackdrop />

      <div className="absolute top-5 left-5 z-10 grid size-12 place-items-center rounded-xl border border-white/5 bg-white/[0.04] backdrop-blur-sm sm:top-6 sm:left-6">
        <img src={logoUrl} alt="Backplate by Our World Energy" className="size-8" />
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 py-24 sm:px-6">
        <main className="border-line bg-surface/95 relative w-full max-w-[520px] overflow-hidden rounded-xl border p-7 shadow-2xl backdrop-blur-sm sm:p-10">
          {/* Top-edge glow from the design. */}
          <span
            aria-hidden
            className="via-primary-bright/70 absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
          />

          <h1 className="text-3xl font-bold tracking-tight sm:text-[2rem]">{title}</h1>
          {subtitle && <p className="text-fg-muted mt-2 text-[15px] leading-relaxed">{subtitle}</p>}

          <div className="mt-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
