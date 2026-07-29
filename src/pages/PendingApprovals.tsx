import { useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import {
  approvalQueue,
  approvalStats,
  approvalTotals,
  type ApprovalRequest,
  type WaitSeverity,
} from '@/lib/pending-approvals-data'

const columns = [
  'Request ID',
  'Timestamp',
  'User Identity',
  'Resource / Scope',
  'Wait Time',
  'Actions',
]

const severityColor: Record<WaitSeverity, string> = {
  healthy: 'text-healthy',
  warning: 'text-degraded',
  critical: 'text-critical-bright',
}

export function PendingApprovals() {
  // Local queue copy so Approve/Deny visibly clears the row; the real actions
  // will POST to the authorization API once integrated.
  const [queue, setQueue] = useState<ApprovalRequest[]>(approvalQueue)
  const action = (id: string) => setQueue((q) => q.filter((r) => r.id !== id))

  return (
    <div className="space-y-6 pb-4">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/credentials/admin"
            className="text-fg-muted hover:text-fg mb-2 inline-flex items-center gap-1.5 font-mono text-xs transition-colors"
          >
            <ChevronLeft className="size-4" />
            Credential Management
          </Link>
          <h1 className="text-fg text-2xl font-semibold tracking-tight">Pending Approvals</h1>
          <p className="text-fg-muted mt-1 text-sm">
            Review and action outstanding authorization requests.
          </p>
        </div>
        <Button variant="outline" className="text-xs">
          <SlidersHorizontal className="size-3.5" />
          Advanced Filters
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Pending"
          value={approvalStats.totalPending}
          hint={approvalStats.totalDelta}
          tone="pending"
          hintTone="pending"
        />
        <StatCard
          label="Avg. Wait Time"
          value={approvalStats.avgWaitTime}
          hint={approvalStats.avgWaitTrend}
          tone="default"
          hintTone="granted"
        />
        <StatCard
          label="SLA Compliance"
          value={approvalStats.slaCompliance}
          hint={approvalStats.slaTarget}
          tone="granted"
          hintTone="muted"
        />
      </div>

      <section className="border-line bg-surface rounded-lg border">
        <div className="border-line flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-fg font-mono text-xs font-semibold tracking-[0.08em] uppercase">
              Approval Queue
            </h2>
            <span className="border-degraded/30 bg-degraded/10 text-degraded inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.05em] uppercase">
              <span className="bg-degraded size-1.5 rounded-full" />
              Live Monitor
            </span>
          </div>
          <span className="text-fg-muted font-mono text-xs">
            Showing: {approvalTotals.from}-{approvalTotals.to} of {approvalTotals.total}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-line border-b">
                {columns.map((col) => (
                  <th
                    key={col}
                    className={cn(
                      'text-fg-subtle px-4 py-3 font-mono text-[11px] font-semibold tracking-[0.08em] uppercase',
                      col === 'Actions' ? 'text-right' : 'text-left',
                    )}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queue.map((req) => (
                <tr
                  key={req.id}
                  className="border-line hover:bg-surface-2 border-b transition-colors last:border-0"
                >
                  <td className="text-primary-bright px-4 py-3.5 font-mono font-medium">
                    {req.id}
                  </td>
                  <td className="text-fg-muted px-4 py-3.5 font-mono">{req.timestamp}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          'grid size-7 shrink-0 place-items-center rounded-full font-mono text-[10px] font-bold',
                          req.emergency
                            ? 'bg-critical/20 text-critical-bright'
                            : 'bg-primary/15 text-primary-bright',
                        )}
                      >
                        {req.initials}
                      </span>
                      <span
                        className={cn(
                          'font-medium',
                          req.emergency ? 'text-critical-bright' : 'text-fg',
                        )}
                      >
                        {req.userName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-fg font-mono text-xs font-semibold">{req.resource}</p>
                    <p className="text-fg-subtle mt-0.5 font-mono text-[10px] tracking-[0.06em] uppercase">
                      {req.scope}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 font-mono text-xs',
                        severityColor[req.waitSeverity],
                      )}
                    >
                      {req.slaBreach ? (
                        <AlertTriangle className="size-3.5" />
                      ) : (
                        <Clock className="size-3.5" />
                      )}
                      {req.waitTime}
                      {req.slaBreach && <span className="text-[10px]">(SLA Breach)</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => action(req.id)}
                        className="bg-primary text-canvas hover:bg-primary-bright rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => action(req.id)}
                        className="border-critical/40 text-critical-bright hover:bg-critical/10 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
                      >
                        Deny
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {queue.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-16 text-center">
                    <p className="text-fg-muted font-mono text-sm">Approval queue is clear</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-line flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
          <Legend />
          <Pagination />
        </div>
      </section>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

const valueTone = { default: 'text-fg', pending: 'text-degraded', granted: 'text-healthy' } as const
const hintTones = {
  muted: 'text-fg-muted',
  pending: 'text-degraded',
  granted: 'text-healthy',
} as const

function StatCard({
  label,
  value,
  hint,
  tone,
  hintTone,
}: {
  label: string
  value: number | string
  hint: string
  tone: keyof typeof valueTone
  hintTone: keyof typeof hintTones
}) {
  return (
    <div className="border-line bg-surface rounded-lg border p-4">
      <p className="text-fg-subtle font-mono text-[10px] font-semibold tracking-[0.08em] uppercase">
        {label}
      </p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className={cn('font-mono text-3xl font-semibold', valueTone[tone])}>{value}</span>
        <span className={cn('font-mono text-xs', hintTones[hintTone])}>{hint}</span>
      </div>
    </div>
  )
}

function Legend() {
  const items = [
    { label: 'Healthy', dot: 'bg-healthy' },
    { label: 'Warning', dot: 'bg-degraded' },
    { label: 'Critical', dot: 'bg-critical-bright' },
  ]
  return (
    <div className="flex items-center gap-4">
      {items.map((i) => (
        <span
          key={i.label}
          className="text-fg-muted flex items-center gap-1.5 font-mono text-[11px]"
        >
          <span className={cn('size-1.5 rounded-full', i.dot)} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

function Pagination() {
  return (
    <div className="flex items-center gap-1 font-mono text-xs">
      <PageButton>First</PageButton>
      <PageButton>
        <ChevronLeft className="size-3.5" />
        Prev
      </PageButton>
      {[1, 2, 3].map((p) => (
        <button
          key={p}
          className={cn(
            'grid size-8 place-items-center rounded-lg border transition-colors',
            p === 1
              ? 'border-primary/40 bg-primary/10 text-primary-bright'
              : 'border-line text-fg-muted hover:border-line-bright hover:text-fg',
          )}
        >
          {p}
        </button>
      ))}
      <span className="text-fg-subtle px-1">…</span>
      <button className="border-line text-fg-muted hover:border-line-bright hover:text-fg grid size-8 place-items-center rounded-lg border transition-colors">
        6
      </button>
      <PageButton>
        Next
        <ChevronRight className="size-3.5" />
      </PageButton>
      <PageButton>Last</PageButton>
    </div>
  )
}

function PageButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="border-line text-fg-muted hover:border-line-bright hover:text-fg inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 transition-colors">
      {children}
    </button>
  )
}
