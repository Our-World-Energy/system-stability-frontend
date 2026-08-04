import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Pagination } from '@/components/ui/Pagination'
import { RequestStatusPill } from '@/components/credentials/RequestStatusPill'
import { RequestDetailsModal } from '@/components/credentials/RequestDetailsModal'
import { useRequestLogs } from '@/hooks/useRequests'
import { useActivityStats } from '@/hooks/useStats'
import { DEFAULT_PAGE_SIZE, requestErrorMessage } from '@/lib/api/requests'
import { requestLogToDetail, shortRequestId } from '@/lib/request-detail'
import {
  densifyHourly,
  formatHourLabel,
  formatPercent,
  formatTimestamp,
  formatUserRef,
  initialsFrom,
} from '@/lib/format'
import type { HourBucket, RequestLogItem, RequestStatus, StatusSlice } from '@/lib/api/types'

const columns = ['Requester', 'Credential', 'Timestamp', 'Status', 'Approver', 'Actions']

/** Status filter presets for the ledger. */
const statusFilters: { value: RequestStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'granted', label: 'Granted' },
  { value: 'denied', label: 'Denied' },
  { value: 'expired', label: 'Expired' },
]

/** Bar colour per status in the distribution panel. */
const statusColor: Record<RequestStatus, string> = {
  granted: 'bg-healthy',
  denied: 'bg-critical-bright',
  pending: 'bg-degraded',
  expired: 'bg-fg-subtle',
}

export function ActivityLedger() {
  const [selected, setSelected] = useState<RequestLogItem | null>(null)
  const [status, setStatus] = useState<RequestStatus | 'all'>('all')
  const [page, setPage] = useState(1)

  const stats = useActivityStats()
  const logs = useRequestLogs({
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    status: status === 'all' ? undefined : status,
  })

  const items = logs.data?.items ?? []
  const total = logs.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE))

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
          <h1 className="text-fg text-2xl font-semibold tracking-tight">Activity Ledger</h1>
          <p className="text-fg-muted mt-1 text-sm">
            Organisation-wide elevation audit trail across every requester.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Requests (24h)"
          value={stats.data?.total_requests_24h ?? 0}
          tone="default"
          loading={stats.isLoading}
        />
        <StatCard
          label="Pending Approval"
          value={stats.data?.pending_count ?? 0}
          hint="requires attention"
          tone="pending"
          loading={stats.isLoading}
        />
        <StatCard
          label="Denial Rate"
          value={formatPercent(stats.data?.denial_rate_percent ?? 0)}
          hint="of the last 24h"
          tone="default"
          loading={stats.isLoading}
        />
        <StatCard
          label="Peak Frequency"
          value={`${stats.data?.peak_frequency_per_min ?? 0}/min`}
          hint="busiest minute"
          tone="granted"
          loading={stats.isLoading}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Status"
          value={status}
          onChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <section className="border-line bg-surface rounded-lg border">
          <div className="border-line flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-fg text-sm font-semibold">Activity Ledger</h2>
            <span className="text-fg-subtle font-mono text-[10px] tracking-[0.08em] uppercase">
              Displaying {items.length} of {total} entries
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
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
                {items.map((entry) => (
                  <LedgerRow key={entry.id} entry={entry} onView={() => setSelected(entry)} />
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-16 text-center">
                      <p
                        className={cn(
                          'font-mono text-sm',
                          logs.isError ? 'text-critical-bright' : 'text-fg-muted',
                        )}
                      >
                        {logs.isError
                          ? requestErrorMessage(logs.error, 'The ledger could not be loaded.')
                          : logs.isLoading
                            ? 'Loading ledger…'
                            : 'No activity recorded'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-line flex items-center justify-between border-t px-5 py-4">
            <p className="text-fg-muted font-mono text-xs">
              Page {page} of {pageCount}
            </p>
            <Pagination
              page={page}
              pageSize={logs.data?.page_size ?? DEFAULT_PAGE_SIZE}
              total={total}
              onPageChange={setPage}
            />
          </div>
        </section>

        <aside className="space-y-6">
          <RequestVolumePanel
            buckets={stats.data?.volume_by_hour ?? []}
            peakPerMinute={stats.data?.peak_frequency_per_min ?? 0}
          />
          <StatusDistributionPanel slices={stats.data?.status_distribution ?? []} />
        </aside>
      </div>

      <RequestDetailsModal
        detail={selected ? requestLogToDetail(selected) : null}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}

// ── Side panels ──────────────────────────────────────────────────────────────

function RequestVolumePanel({
  buckets,
  peakPerMinute,
}: {
  buckets: HourBucket[]
  peakPerMinute: number
}) {
  // The API omits hours with no activity, so the sparse buckets are expanded to
  // a full 24 before charting — otherwise a quiet night reads as a busy one.
  const series = useMemo(() => densifyHourly(buckets), [buckets])
  const peak = Math.max(...series.map((s) => s.count), 1)

  return (
    <section className="border-line bg-surface rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-fg text-sm font-semibold">Request Volume</h3>
        <span className="text-primary-bright flex items-center gap-1.5 font-mono text-[10px] tracking-[0.08em] uppercase">
          <span className="bg-primary-bright size-1.5 rounded-full" />
          Live
        </span>
      </div>
      <div className="flex h-24 items-end gap-1">
        {series.map((bucket) => (
          <div
            key={bucket.hour.toISOString()}
            title={`${formatHourLabel(bucket.hour)} — ${bucket.count} requests`}
            // A 2% floor keeps an empty hour visible as a baseline tick rather
            // than a gap the eye reads as missing data.
            style={{ height: `${Math.max((bucket.count / peak) * 100, 2)}%` }}
            className="bg-primary/30 hover:bg-primary/50 flex-1 rounded-t transition-colors"
          />
        ))}
      </div>
      <div className="text-fg-subtle mt-2 flex justify-between font-mono text-[10px]">
        <span>24h ago</span>
        <span>Now</span>
      </div>
      <p className="border-line mt-3 flex items-center justify-between border-t pt-3 font-mono text-xs">
        <span className="text-fg-muted">Peak Frequency</span>
        <span className="text-primary-bright">{peakPerMinute} req/min</span>
      </p>
    </section>
  )
}

function StatusDistributionPanel({ slices }: { slices: StatusSlice[] }) {
  return (
    <section className="border-line bg-surface rounded-lg border p-4">
      <h3 className="text-fg mb-3 text-sm font-semibold">Status Distribution</h3>
      {slices.length === 0 ? (
        <p className="text-fg-muted font-mono text-xs">No requests in the last 24 hours.</p>
      ) : (
        <div className="space-y-3">
          {slices.map((slice) => (
            <div key={slice.status}>
              <div className="mb-1 flex items-center justify-between font-mono text-[10px] tracking-[0.06em] uppercase">
                <span className="text-fg-muted">
                  {slice.status} ({slice.count})
                </span>
                <span className="text-fg">{formatPercent(slice.percent, 0)}</span>
              </div>
              <div className="bg-surface-3 h-1.5 overflow-hidden rounded-full">
                <div
                  className={cn('h-full rounded-full', statusColor[slice.status])}
                  style={{ width: `${Math.min(slice.percent, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function LedgerRow({ entry, onView }: { entry: RequestLogItem; onView: () => void }) {
  const requester = formatUserRef(entry.requested_by)
  return (
    <tr className="border-line hover:bg-surface-2 border-b transition-colors last:border-0">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="bg-primary/15 text-primary-bright grid size-8 shrink-0 place-items-center rounded-full font-mono text-[10px] font-bold">
            {initialsFrom(requester)}
          </span>
          <div className="min-w-0">
            <p className="text-fg truncate font-medium">{requester}</p>
            <p className="text-fg-subtle truncate font-mono text-[10px]">
              {shortRequestId(entry.id)}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <p className="text-fg-muted font-mono">{entry.credential_name}</p>
        {entry.credential_tags?.length ? (
          <p className="text-fg-subtle mt-0.5 font-mono text-[10px] tracking-[0.06em] uppercase">
            {entry.credential_tags.join(' • ')}
          </p>
        ) : null}
      </td>
      <td className="text-fg-muted px-4 py-3.5 font-mono">{formatTimestamp(entry.requested_at)}</td>
      <td className="px-4 py-3.5">
        <RequestStatusPill status={entry.status} />
      </td>
      <td className="text-fg-muted px-4 py-3.5 font-mono">
        {entry.reviewed_by ? formatUserRef(entry.reviewed_by) : '—'}
      </td>
      <td className="px-4 py-3.5 text-right">
        <button
          onClick={onView}
          className="text-primary-bright hover:text-primary font-mono text-[11px] font-semibold tracking-[0.06em] uppercase transition-colors"
        >
          View Details
        </button>
      </td>
    </tr>
  )
}

const toneClass = {
  default: 'text-fg',
  granted: 'text-healthy',
  pending: 'text-degraded',
} as const

function StatCard({
  label,
  value,
  hint,
  tone,
  loading,
}: {
  label: string
  value: number | string
  hint?: string
  tone: keyof typeof toneClass
  loading?: boolean
}) {
  return (
    <div className="border-line bg-surface rounded-lg border p-4">
      <p className="text-fg-subtle font-mono text-[10px] font-semibold tracking-[0.08em] uppercase">
        {label}
      </p>
      <p className={cn('mt-3 font-mono text-3xl font-semibold', toneClass[tone])}>
        {loading ? '—' : value}
      </p>
      {hint && <p className="text-fg-muted mt-1 text-xs">{hint}</p>}
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: RequestStatus | 'all'
  onChange: (value: RequestStatus | 'all') => void
}) {
  return (
    <div className="border-line bg-surface relative rounded-lg border px-3 py-1.5">
      <p className="text-fg-subtle font-mono text-[9px] tracking-[0.08em] uppercase">{label}</p>
      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as RequestStatus | 'all')}
          className="text-fg cursor-pointer appearance-none bg-transparent pr-5 text-xs outline-none"
        >
          {statusFilters.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
        <ChevronDown className="text-fg-subtle pointer-events-none absolute right-3 bottom-2 size-3" />
      </div>
    </div>
  )
}
