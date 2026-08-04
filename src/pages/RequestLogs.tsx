import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Hourglass, History, ShieldCheck, ShieldX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Pagination } from '@/components/ui/Pagination'
import { RequestStatusPill } from '@/components/credentials/RequestStatusPill'
import { RequestStatTile } from '@/components/credentials/RequestStatTile'
import { RequestDetailsModal } from '@/components/credentials/RequestDetailsModal'
import { TemporalDistribution } from '@/components/credentials/TemporalDistribution'
import { useRequestLogs } from '@/hooks/useRequests'
import { useRequestStats } from '@/hooks/useStats'
import { DEFAULT_PAGE_SIZE, requestErrorMessage } from '@/lib/api/requests'
import { requestLogToDetail } from '@/lib/request-detail'
import { densifyHourly, formatDuration, formatHourLabel, formatTimestamp } from '@/lib/format'
import type { RequestLogItem } from '@/lib/api/types'

const columns = ['Credential', 'Requested At', 'Status', 'Duration', 'Actions']

export function RequestLogs() {
  const [selected, setSelected] = useState<RequestLogItem | null>(null)
  const [page, setPage] = useState(1)

  // The service scopes this route by role on its own: a non-admin only ever
  // receives their own requests, so no user filter is sent from here.
  const logs = useRequestLogs({ page, pageSize: DEFAULT_PAGE_SIZE })
  const stats = useRequestStats()

  const items = logs.data?.items ?? []
  const total = logs.data?.total ?? 0

  const counts = stats.data
  const resolved =
    (counts?.granted_count ?? 0) + (counts?.denied_count ?? 0) + (counts?.expired_count ?? 0)
  const successRate = resolved > 0 ? Math.round(((counts?.granted_count ?? 0) / resolved) * 100) : 0

  const volume = useMemo(
    () => densifyHourly(counts?.volume_by_hour ?? []),
    [counts?.volume_by_hour],
  )

  return (
    <div className="space-y-6 pb-4">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/credentials"
            className="text-fg-muted hover:text-fg mb-2 inline-flex items-center gap-1.5 font-mono text-xs transition-colors"
          >
            <ChevronLeft className="size-4" />
            Credential Catalog
          </Link>
          <h1 className="text-fg text-2xl font-semibold tracking-tight">Request Log&rsquo;s</h1>
          <p className="text-fg-muted mt-1 text-sm">
            Track and manage your temporary elevation history.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RequestStatTile
          label="Pending Requests"
          value={counts?.pending_count ?? 0}
          hint="awaiting a decision"
          icon={Hourglass}
          accent="pending"
        />
        <RequestStatTile
          label="Granted"
          value={counts?.granted_count ?? 0}
          hint={resolved > 0 ? `${successRate}% success rate` : 'No resolved requests yet'}
          icon={ShieldCheck}
          accent="granted"
        />
        <RequestStatTile
          label="Denied"
          value={counts?.denied_count ?? 0}
          hint="Policy enforcement"
          icon={ShieldX}
          accent="denied"
        />
        <RequestStatTile
          label="Expired"
          value={counts?.expired_count ?? 0}
          hint="Auto-revoked"
          icon={History}
        />
      </div>

      <section className="border-line bg-surface rounded-lg border">
        <div className="border-line flex flex-wrap items-center border-b px-5 py-4">
          <h2 className="text-fg text-sm font-semibold">Recent Activity</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-line border-b">
                {columns.map((col) => (
                  <th
                    key={col}
                    className={cn(
                      'text-fg-subtle px-5 py-3 font-mono text-[11px] font-semibold tracking-[0.08em] uppercase',
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
                <tr
                  key={req.id}
                  className="border-line hover:bg-surface-2 border-b transition-colors last:border-0"
                >
                  <td className="px-5 py-3.5">
                    <p className="text-fg font-medium">{req.credential_name}</p>
                    {req.credential_tags?.length ? (
                      <p className="text-fg-subtle mt-0.5 font-mono text-[10px] tracking-[0.06em] uppercase">
                        {req.credential_tags.join(' • ')}
                      </p>
                    ) : null}
                  </td>
                  <td className="text-fg-muted px-5 py-3.5 font-mono">
                    {formatTimestamp(req.requested_at)}
                  </td>
                  <td className="px-5 py-3.5">
                    <RequestStatusPill status={req.status} />
                  </td>
                  <td className="text-fg-muted px-5 py-3.5 font-mono">
                    {formatDuration(req.elevation_duration_seconds)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setSelected(req)}
                      className="text-primary-bright hover:text-primary font-medium transition-colors"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-5 py-16 text-center">
                    <p
                      className={cn(
                        'font-mono text-sm',
                        logs.isError ? 'text-critical-bright' : 'text-fg-muted',
                      )}
                    >
                      {logs.isError
                        ? requestErrorMessage(
                            logs.error,
                            'Your request history could not be loaded.',
                          )
                        : logs.isLoading
                          ? 'Loading your requests…'
                          : 'You have not requested any credentials yet'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-line flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
          <p className="text-fg-muted font-mono text-xs">
            Showing {items.length} of {total} requests
          </p>
          <Pagination
            page={page}
            pageSize={logs.data?.page_size ?? DEFAULT_PAGE_SIZE}
            total={total}
            onPageChange={setPage}
          />
        </div>
      </section>

      <TemporalDistribution
        buckets={volume.map((bucket) => bucket.count)}
        titles={volume.map((b) => `${formatHourLabel(b.hour)} — ${b.count} requests`)}
      />

      <RequestDetailsModal
        detail={selected ? requestLogToDetail(selected) : null}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
