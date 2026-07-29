import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RequestStatusPill } from '@/components/credentials/RequestStatusPill'
import { RequestDetailsModal } from '@/components/credentials/RequestDetailsModal'
import {
  ledgerEntries,
  ledgerEntryToDetail,
  ledgerFilters,
  ledgerStats,
  ledgerTotals,
  peakFrequency,
  requestVolume,
  statusDistribution,
  type LedgerEntry,
} from '@/lib/activity-ledger-data'

const columns = ['Requester', 'Credential ID', 'Timestamp', 'Status', 'Approver', 'Actions']

export function ActivityLedger() {
  const [selected, setSelected] = useState<LedgerEntry | null>(null)

  return (
    <div className="space-y-6 pb-4">
      <header>
        <Link
          to="/credentials/admin"
          className="text-fg-muted hover:text-fg mb-2 inline-flex items-center gap-1.5 font-mono text-xs transition-colors"
        >
          <ChevronLeft className="size-4" />
          Credential Management
        </Link>
        <h1 className="text-fg text-2xl font-semibold tracking-tight">Global Activity Ledger</h1>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Requests (24h)" value={ledgerStats.totalRequests} tone="default" />
        <StatCard
          label="Pending Approval"
          value={ledgerStats.pendingApproval}
          hint="requires attention"
          tone="pending"
        />
        <StatCard
          label="Denial Rate"
          value={ledgerStats.denialRate}
          hint="within threshold"
          tone="default"
        />
        <StatCard
          label="System Uptime"
          value={ledgerStats.systemUptime}
          hint="Live monitor"
          tone="granted"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {ledgerFilters.map((f) => (
          <FilterSelect key={f.label} label={f.label} value={f.value} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        {/* Ledger table */}
        <section className="border-line bg-surface rounded-lg border">
          <div className="border-line flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-fg text-sm font-semibold">Global Activity Ledger</h2>
            <span className="text-fg-subtle font-mono text-[10px] tracking-[0.08em] uppercase">
              Displaying {ledgerTotals.displayed} of {ledgerTotals.total} entries
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
                {ledgerEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-line hover:bg-surface-2 border-b transition-colors last:border-0"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="bg-primary/15 text-primary-bright grid size-8 shrink-0 place-items-center rounded-full font-mono text-[10px] font-bold">
                          {entry.initials}
                        </span>
                        <div className="min-w-0">
                          <p className="text-fg truncate font-medium">{entry.requesterName}</p>
                          <p className="text-fg-subtle truncate font-mono text-[10px]">
                            {entry.requesterId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="text-fg-muted px-4 py-3.5 font-mono">{entry.credentialId}</td>
                    <td className="text-fg-muted px-4 py-3.5 font-mono">{entry.timestamp}</td>
                    <td className="px-4 py-3.5">
                      <RequestStatusPill status={entry.status} />
                    </td>
                    <td className="text-fg-muted px-4 py-3.5 font-mono">{entry.approver}</td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setSelected(entry)}
                        className="text-primary-bright hover:text-primary font-mono text-[11px] font-semibold tracking-[0.06em] uppercase transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-line flex items-center justify-between border-t px-5 py-4">
            <p className="text-fg-muted font-mono text-xs">
              Page {ledgerTotals.page} of {ledgerTotals.pages}
            </p>
            <Pagination />
          </div>
        </section>

        {/* Side panels */}
        <aside className="space-y-6">
          <RequestVolumePanel />
          <StatusDistributionPanel />
        </aside>
      </div>

      <RequestDetailsModal
        detail={selected ? ledgerEntryToDetail(selected) : null}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}

// ── Stat card ────────────────────────────────────────────────────────────────

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
}: {
  label: string
  value: number | string
  hint?: string
  tone: keyof typeof toneClass
}) {
  return (
    <div className="border-line bg-surface rounded-lg border p-4">
      <p className="text-fg-subtle font-mono text-[10px] font-semibold tracking-[0.08em] uppercase">
        {label}
      </p>
      <p className={cn('mt-3 font-mono text-3xl font-semibold', toneClass[tone])}>{value}</p>
      {hint && <p className="text-fg-muted mt-1 text-xs">{hint}</p>}
    </div>
  )
}

// ── Filters ──────────────────────────────────────────────────────────────────

function FilterSelect({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-line bg-surface rounded-lg border px-3 py-1.5">
      <p className="text-fg-subtle font-mono text-[9px] tracking-[0.08em] uppercase">{label}</p>
      <div className="flex items-center gap-2">
        <span className="text-fg text-xs">{value}</span>
        <ChevronDown className="text-fg-subtle size-3" />
      </div>
    </div>
  )
}

// ── Side panels ────────────────────────────────────────────────────────────

function RequestVolumePanel() {
  const peak = Math.max(...requestVolume, 1)
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
        {requestVolume.map((v, i) => (
          <div
            key={i}
            style={{ height: `${(v / peak) * 100}%` }}
            className="bg-primary/30 flex-1 rounded-t"
          />
        ))}
      </div>
      <div className="text-fg-subtle mt-2 flex justify-between font-mono text-[10px]">
        <span>24h ago</span>
        <span>Now</span>
      </div>
      <p className="border-line mt-3 flex items-center justify-between border-t pt-3 font-mono text-xs">
        <span className="text-fg-muted">Peak Frequency</span>
        <span className="text-primary-bright">{peakFrequency}</span>
      </p>
    </section>
  )
}

function StatusDistributionPanel() {
  return (
    <section className="border-line bg-surface rounded-lg border p-4">
      <h3 className="text-fg mb-3 text-sm font-semibold">Status Distribution</h3>
      <div className="space-y-3">
        {statusDistribution.map((s) => (
          <div key={s.label}>
            <div className="mb-1 flex items-center justify-between font-mono text-[10px] tracking-[0.06em] uppercase">
              <span className="text-fg-muted">{s.label}</span>
              <span className="text-fg">{s.pct}%</span>
            </div>
            <div className="bg-surface-3 h-1.5 overflow-hidden rounded-full">
              <div className={cn('h-full rounded-full', s.color)} style={{ width: `${s.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Shared bits ──────────────────────────────────────────────────────────────

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
