import { useState } from 'react'
import { AlertTriangle, ChevronLeft, Clock, KeyRound, RotateCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Pagination } from '@/components/ui/Pagination'
import { ReviewRequestDialog } from '@/components/credentials/admin/ReviewRequestDialog'
import { RotationQueue } from '@/components/credentials/admin/RotationQueue'
import { usePendingRequests, useRefreshPendingRequestsOnStats } from '@/hooks/useRequests'
import { usePendingStats } from '@/hooks/useStats'
import { useAuthStore } from '@/store/auth'
import { DEFAULT_PAGE_SIZE, requestErrorMessage } from '@/lib/api/requests'
import type { ReviewAction } from '@/lib/api/requests'
import {
  formatMinutes,
  formatPercent,
  formatTimestamp,
  formatUserRef,
  formatWait,
  initialsFrom,
  waitSeverity,
  type WaitSeverity,
} from '@/lib/format'
import type { PendingRequestItem } from '@/lib/api/types'

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

/** SLA target the compliance card is measured against. A policy value, not an API one. */
const SLA_TARGET_PERCENT = 95

/** A request awaiting the admin's confirmation of an approve/deny. */
type PendingDecision = { request: PendingRequestItem; action: ReviewAction }

export function PendingApprovals() {
  const [page, setPage] = useState(1)
  const [decision, setDecision] = useState<PendingDecision | null>(null)

  // Rotation-request review is org-admin only; the platform admin reaches this
  // page for access approvals and never sees the rotation queue.
  const role = useAuthStore((s) => s.user?.role ?? null)
  const isOrgAdmin = role === 'org_admin'
  const [view, setView] = useState<'access' | 'rotation'>('access')

  const stats = usePendingStats()
  const queue = usePendingRequests(page, DEFAULT_PAGE_SIZE)
  // A live pending-stats push means a request was just submitted/approved/denied,
  // so pull the queue fresh rather than waiting for the next poll.
  useRefreshPendingRequestsOnStats()

  const items = queue.data?.items ?? []
  const total = queue.data?.total ?? 0
  const from = total === 0 ? 0 : (page - 1) * DEFAULT_PAGE_SIZE + 1
  const to = Math.min(page * DEFAULT_PAGE_SIZE, total)

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
            {view === 'rotation'
              ? 'Review and action credential rotation requests.'
              : 'Review and action outstanding authorization requests.'}
          </p>
        </div>
        {/* Only the org admin reviews rotations, so only they get the switch. */}
        {isOrgAdmin && <ViewToggle view={view} onChange={setView} />}
      </header>

      {view === 'rotation' ? (
        <RotationQueue />
      ) : (
        <AccessApprovals
          stats={stats}
          queue={queue}
          items={items}
          total={total}
          from={from}
          to={to}
          page={page}
          onPageChange={setPage}
          onDecide={(request, action) => setDecision({ request, action })}
        />
      )}

      {decision && (
        <ReviewRequestDialog
          request={decision.request}
          action={decision.action}
          onClose={() => setDecision(null)}
        />
      )}
    </div>
  )
}

/** Toggle between the access-request and rotation-request queues (org admin). */
function ViewToggle({
  view,
  onChange,
}: {
  view: 'access' | 'rotation'
  onChange: (v: 'access' | 'rotation') => void
}) {
  const tabs = [
    { id: 'access' as const, label: 'Access Requests', icon: KeyRound },
    { id: 'rotation' as const, label: 'Rotation Requests', icon: RotateCw },
  ]
  return (
    <div className="border-line bg-surface inline-flex shrink-0 rounded-lg border p-1">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          aria-pressed={view === id}
          className={cn(
            'inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors',
            view === id ? 'bg-primary text-canvas' : 'text-fg-muted hover:text-fg',
          )}
        >
          <Icon className="size-3.5" />
          {label}
        </button>
      ))}
    </div>
  )
}

/** The original access-request approval queue: stat cards + live queue table. */
function AccessApprovals({
  stats,
  queue,
  items,
  total,
  from,
  to,
  page,
  onPageChange,
  onDecide,
}: {
  stats: ReturnType<typeof usePendingStats>
  queue: ReturnType<typeof usePendingRequests>
  items: PendingRequestItem[]
  total: number
  from: number
  to: number
  page: number
  onPageChange: (page: number) => void
  onDecide: (request: PendingRequestItem, action: ReviewAction) => void
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Pending"
          value={stats.data?.total_pending ?? 0}
          hint="awaiting review"
          tone="pending"
          hintTone="pending"
          loading={stats.isLoading}
        />
        <StatCard
          label="Avg. Wait Time"
          value={formatMinutes(stats.data?.avg_wait_minutes ?? 0)}
          hint="across the queue"
          tone="default"
          hintTone="muted"
          loading={stats.isLoading}
        />
        <StatCard
          label="SLA Compliance"
          value={formatPercent(stats.data?.sla_compliance_percent ?? 0)}
          hint={`Target: ${SLA_TARGET_PERCENT}%`}
          tone={
            (stats.data?.sla_compliance_percent ?? 0) >= SLA_TARGET_PERCENT ? 'granted' : 'pending'
          }
          hintTone="muted"
          loading={stats.isLoading}
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
            Showing: {from}-{to} of {total}
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
              {items.map((req) => (
                <QueueRow
                  key={req.id}
                  request={req}
                  onDecide={(action) => onDecide(req, action)}
                />
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-16 text-center">
                    <p
                      className={cn(
                        'font-mono text-sm',
                        queue.isError ? 'text-critical-bright' : 'text-fg-muted',
                      )}
                    >
                      {queue.isError
                        ? requestErrorMessage(
                            queue.error,
                            'The approval queue could not be loaded.',
                          )
                        : queue.isLoading
                          ? 'Loading approval queue…'
                          : 'Approval queue is clear'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-line flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
          <Legend />
          <Pagination
            page={page}
            pageSize={queue.data?.page_size ?? DEFAULT_PAGE_SIZE}
            total={total}
            onPageChange={onPageChange}
            className="font-mono text-xs"
          />
        </div>
      </section>
    </>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

/**
 * One queue row.
 *
 * The service identifies people by numeric id only — there is no user lookup on
 * this API — so the requester is shown in the directory style (`USR_1`) rather
 * than a name invented on the frontend. A beneficiary email, when present, says
 * far more, so it rides underneath.
 */
function QueueRow({
  request,
  onDecide,
}: {
  request: PendingRequestItem
  onDecide: (action: ReviewAction) => void
}) {
  const requester = formatUserRef(request.requested_by)
  const severity = request.is_sla_breach ? 'critical' : waitSeverity(request.wait_minutes)

  return (
    <tr className="border-line hover:bg-surface-2 border-b transition-colors last:border-0">
      <td className="text-primary-bright px-4 py-3.5 font-mono font-medium">
        <span title={request.id}>{shortId(request.id)}</span>
      </td>
      <td className="text-fg-muted px-4 py-3.5 font-mono">
        {formatTimestamp(request.requested_at)}
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'grid size-7 shrink-0 place-items-center rounded-full font-mono text-[10px] font-bold',
              request.is_sla_breach
                ? 'bg-critical/20 text-critical-bright'
                : 'bg-primary/15 text-primary-bright',
            )}
          >
            {initialsFrom(requester)}
          </span>
          <div className="min-w-0">
            <p
              className={cn(
                'truncate font-medium',
                request.is_sla_breach ? 'text-critical-bright' : 'text-fg',
              )}
            >
              {requester}
            </p>
            {request.beneficiary_email && (
              <p className="text-fg-subtle truncate font-mono text-[10px]">
                for {request.beneficiary_email}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <p className="text-fg font-mono text-xs font-semibold">{request.credential_name}</p>
        <p className="text-fg-subtle mt-0.5 font-mono text-[10px] tracking-[0.06em] uppercase">
          {request.reason_category.replace(/_/g, ' ')}
        </p>
      </td>
      <td className="px-4 py-3.5">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 font-mono text-xs',
            severityColor[severity],
          )}
        >
          {request.is_sla_breach ? (
            <AlertTriangle className="size-3.5" />
          ) : (
            <Clock className="size-3.5" />
          )}
          {formatWait(request.wait_minutes)}
          {request.is_sla_breach && <span className="text-[10px]">(SLA Breach)</span>}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onDecide('approve')}
            className="bg-primary text-canvas hover:bg-primary-bright rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
          >
            Approve
          </button>
          <button
            onClick={() => onDecide('deny')}
            className="border-critical/40 text-critical-bright hover:bg-critical/10 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
          >
            Deny
          </button>
        </div>
      </td>
    </tr>
  )
}

/** Requests are identified by uuid; the first block is enough to tell rows apart. */
function shortId(id: string): string {
  return id.split('-')[0]?.toUpperCase() ?? id
}

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
  loading,
}: {
  label: string
  value: number | string
  hint: string
  tone: keyof typeof valueTone
  hintTone: keyof typeof hintTones
  loading?: boolean
}) {
  return (
    <div className="border-line bg-surface rounded-lg border p-4">
      <p className="text-fg-subtle font-mono text-[10px] font-semibold tracking-[0.08em] uppercase">
        {label}
      </p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className={cn('font-mono text-3xl font-semibold', valueTone[tone])}>
          {loading ? '—' : value}
        </span>
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
