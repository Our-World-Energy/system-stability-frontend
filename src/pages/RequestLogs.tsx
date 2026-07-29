import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Hourglass, History, ShieldCheck, ShieldX } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  accessRequests,
  accessRequestToDetail,
  requestSummary,
  temporalDistribution,
  totalRequests,
  type AccessRequest,
} from '@/lib/credentials-data'
import { RequestStatusPill } from '@/components/credentials/RequestStatusPill'
import { RequestStatTile } from '@/components/credentials/RequestStatTile'
import { RequestDetailsModal } from '@/components/credentials/RequestDetailsModal'
import { TemporalDistribution } from '@/components/credentials/TemporalDistribution'

const columns = ['Credential', 'Requested At', 'Status', 'Duration', 'Actions']

export function RequestLogs() {
  const [selected, setSelected] = useState<AccessRequest | null>(null)

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
          <h1 className="text-fg text-2xl font-semibold tracking-tight">Request Log's</h1>
          <p className="text-fg-muted mt-1 text-sm">
            Track and manage your temporary elevation history.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RequestStatTile
          label="Pending Requests"
          value={requestSummary.pending}
          hint={`+${requestSummary.pendingDelta} since last sync`}
          icon={Hourglass}
          accent="pending"
        />
        <RequestStatTile
          label="Granted"
          value={requestSummary.granted}
          hint={`${requestSummary.successRate}% success rate`}
          icon={ShieldCheck}
          accent="granted"
        />
        <RequestStatTile
          label="Denied"
          value={String(requestSummary.denied).padStart(2, '0')}
          hint="Policy enforcement"
          icon={ShieldX}
          accent="denied"
        />
        <RequestStatTile
          label="Expired"
          value={requestSummary.expired}
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
              {accessRequests.map((req) => (
                <tr
                  key={req.id}
                  className="border-line hover:bg-surface-2 border-b transition-colors last:border-0"
                >
                  <td className="px-5 py-3.5">
                    <p className="text-fg font-medium">{req.credential}</p>
                    <p className="text-fg-subtle mt-0.5 font-mono text-[10px] tracking-[0.06em] uppercase">
                      {req.scope}
                    </p>
                  </td>
                  <td className="text-fg-muted px-5 py-3.5 font-mono">{req.requestedAt}</td>
                  <td className="px-5 py-3.5">
                    <RequestStatusPill status={req.status} />
                  </td>
                  <td className="text-fg-muted px-5 py-3.5 font-mono">{req.duration}</td>
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
            </tbody>
          </table>
        </div>

        <div className="border-line flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
          <p className="text-fg-muted font-mono text-xs">
            Showing {accessRequests.length} of {totalRequests} requests
          </p>
          <Pagination />
        </div>
      </section>

      <TemporalDistribution buckets={temporalDistribution} />

      <RequestDetailsModal
        detail={selected ? accessRequestToDetail(selected) : null}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}

/** Static demo pagination — page state will be driven by the API query later. */
function Pagination() {
  const pages = [1, 2, 3]
  return (
    <div className="flex items-center gap-1">
      <button
        aria-label="Previous page"
        className="border-line text-fg-muted hover:border-line-bright hover:text-fg grid size-8 place-items-center rounded-lg border transition-colors"
      >
        <ChevronLeft className="size-4" />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          className={cn(
            'grid size-8 place-items-center rounded-lg border font-mono text-xs transition-colors',
            p === 1
              ? 'border-primary/40 bg-primary/10 text-primary-bright'
              : 'border-line text-fg-muted hover:border-line-bright hover:text-fg',
          )}
        >
          {p}
        </button>
      ))}
      <button
        aria-label="Next page"
        className="border-line text-fg-muted hover:border-line-bright hover:text-fg grid size-8 place-items-center rounded-lg border transition-colors"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  )
}
