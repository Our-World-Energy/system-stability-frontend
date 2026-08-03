import {
  AlertCircle,
  BarChart3,
  Bot,
  CheckCircle2,
  CircleDot,
  Database,
  History,
  Plus,
  Target,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { RequestDetail } from '@/lib/request-detail'

interface RequestDetailsModalProps {
  detail: RequestDetail | null
  onClose: () => void
}

interface TimelineStep {
  label: string
  time?: string
  detail: React.ReactNode
  icon: LucideIcon
  /** Icon badge color. */
  tone: 'requested' | 'policy' | 'pending' | 'approved' | 'denied' | 'expired'
}

/** Icon-badge color (border + text) per step tone. */
const badgeToneClass: Record<TimelineStep['tone'], string> = {
  requested: 'border-healthy/40 text-healthy',
  policy: 'border-primary/40 text-primary-bright',
  pending: 'border-degraded/40 text-degraded',
  approved: 'border-healthy/40 text-healthy',
  denied: 'border-critical/40 text-critical-bright',
  expired: 'border-fg-subtle/40 text-fg-subtle',
}

/** Label text color per step tone. */
const labelToneClass: Record<TimelineStep['tone'], string> = {
  requested: 'text-healthy',
  policy: 'text-primary-bright',
  pending: 'text-degraded',
  approved: 'text-healthy',
  denied: 'text-critical-bright',
  expired: 'text-fg-subtle',
}

/** Final-action step keyed by the request's resolved status. */
const finalStep: Record<
  'granted' | 'denied' | 'expired',
  { label: string; icon: LucideIcon; tone: TimelineStep['tone'] }
> = {
  granted: { label: 'FINAL ACTION: APPROVED', icon: CheckCircle2, tone: 'approved' },
  denied: { label: 'FINAL ACTION: DENIED', icon: XCircle, tone: 'denied' },
  expired: { label: 'FINAL ACTION: EXPIRED', icon: History, tone: 'expired' },
}

/**
 * Build the audit trail from what the service actually records.
 *
 * The policy-check and routing steps only appear when the data carries them —
 * the current credential-manager routes do not, so on live data the timeline is
 * "requested → outcome" rather than a four-step story with two invented halves.
 */
function buildTimeline(detail: RequestDetail): TimelineStep[] {
  const steps: TimelineStep[] = [
    {
      label: 'REQUESTED',
      time: detail.timestamp,
      detail: (
        <>
          by <span className="font-mono">{detail.requesterName}</span>
        </>
      ),
      icon: Plus,
      tone: 'requested',
    },
  ]

  if (detail.policyCheckTime) {
    steps.push({
      label: 'POLICY CHECK',
      time: detail.policyCheckTime,
      detail: <span className="italic">Automated validation passed.</span>,
      icon: Target,
      tone: 'policy',
    })
  }

  if (detail.status === 'pending') {
    steps.push({
      label: 'PENDING APPROVAL',
      detail: detail.routedTo ? (
        <>
          Routed to <span className="text-fg font-mono">{detail.routedTo}</span>
        </>
      ) : (
        <span className="italic">Waiting on an administrator.</span>
      ),
      icon: CircleDot,
      tone: 'pending',
    })
  } else {
    const f = finalStep[detail.status]
    steps.push({
      label: f.label,
      time: detail.finalTime,
      detail: (
        <>
          by <span className="font-mono">{detail.approver}</span>
        </>
      ),
      icon: f.icon,
      tone: f.tone,
    })
  }

  return steps
}

/** Read-only audit detail for a single request, opened from a "View Details" action. */
export function RequestDetailsModal({ detail, onClose }: RequestDetailsModalProps) {
  if (!detail) return null
  const timeline = buildTimeline(detail)

  return (
    <Modal
      open
      onClose={onClose}
      ariaLabel={`Request details ${detail.id}`}
      className="max-w-3xl"
      icon={
        <span className="bg-primary/15 text-primary-bright grid size-9 shrink-0 place-items-center rounded-lg">
          <BarChart3 className="size-5" />
        </span>
      }
      title={
        <>
          Request Details: <span className="text-primary-bright">{detail.id}</span>
        </>
      }
      footer={
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Audit timeline */}
        <div>
          <SectionLabel>
            <History className="size-4" />
            Audit Timeline
          </SectionLabel>
          <ol className="mt-4">
            {timeline.map((step, i) => {
              const Icon = step.icon
              const isLast = i === timeline.length - 1
              return (
                <li key={step.label} className="relative flex gap-3 pb-6 last:pb-0">
                  {!isLast && (
                    <span className="bg-line absolute top-7 left-[13px] h-[calc(100%-1rem)] w-px" />
                  )}
                  <span
                    className={cn(
                      'bg-surface z-10 grid size-7 shrink-0 place-items-center rounded-full border',
                      badgeToneClass[step.tone],
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p
                      className={cn(
                        'font-mono text-[11px] font-bold tracking-[0.06em] uppercase',
                        labelToneClass[step.tone],
                      )}
                    >
                      {step.label}
                    </p>
                    {step.time && <p className="text-fg mt-0.5 font-mono text-sm">{step.time}</p>}
                    <p className="text-fg-muted mt-0.5 text-sm">{step.detail}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        {/* Context */}
        <div className="space-y-5">
          <div>
            <SectionLabel>Target Resource</SectionLabel>
            <div className="border-line bg-input mt-3 flex items-center gap-3 rounded-lg border p-3">
              <Database className="text-fg-muted size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-fg font-mono text-sm font-semibold">{detail.resource}</p>
                <p className="text-primary-bright font-mono text-[11px] tracking-[0.06em] uppercase">
                  {detail.scope}
                </p>
              </div>
              {detail.duration && (
                <div className="shrink-0 text-right">
                  <p className="text-fg-subtle font-mono text-[10px] tracking-[0.08em] uppercase">
                    Window
                  </p>
                  <p className="text-fg font-mono text-sm">{detail.duration}</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <SectionLabel>Justification</SectionLabel>
            <div className="border-line bg-input mt-3 rounded-lg border p-3">
              <p className="text-fg text-sm leading-relaxed italic">“{detail.justification}”</p>
            </div>
          </div>

          {detail.denialReason && (
            <div>
              <SectionLabel>Denial Reason</SectionLabel>
              <div className="border-critical/30 bg-critical/5 mt-3 flex items-start gap-2.5 rounded-lg border p-3">
                <AlertCircle className="text-critical-bright mt-0.5 size-4 shrink-0" />
                <p className="text-fg text-sm leading-relaxed">{detail.denialReason}</p>
              </div>
            </div>
          )}

          <div>
            <SectionLabel>Beneficiary</SectionLabel>
            <div className="mt-3 flex items-center gap-3">
              <span className="bg-primary/15 text-primary-bright grid size-10 shrink-0 place-items-center rounded-lg">
                <Bot className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-fg truncate text-sm font-semibold">{detail.beneficiaryName}</p>
                {detail.beneficiaryId && (
                  <p className="text-fg-muted font-mono text-xs">{detail.beneficiaryId}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-fg-muted flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-[0.08em] uppercase">
      {children}
    </p>
  )
}
