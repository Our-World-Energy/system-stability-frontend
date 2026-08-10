import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, Loader2, RotateCw, XCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { cn } from '@/lib/utils'
import { usePendingRotationRequests, useReviewRotationRequest } from '@/hooks/useRequests'
import { DEFAULT_PAGE_SIZE, requestErrorMessage } from '@/lib/api/requests'
import type { ReviewAction } from '@/lib/api/requests'
import {
  formatTimestamp,
  formatUserRef,
  formatWait,
  initialsFrom,
  waitSeverity,
  type WaitSeverity,
} from '@/lib/format'
import type { PendingRotationRequestItem } from '@/lib/api/types'

const columns = ['Request ID', 'Requested', 'Requested By', 'Credential', 'Wait Time', 'Actions']

const severityColor: Record<WaitSeverity, string> = {
  healthy: 'text-healthy',
  warning: 'text-degraded',
  critical: 'text-critical-bright',
}

type Decision = { request: PendingRotationRequestItem; action: ReviewAction }

/**
 * The rotation-request approval queue — org admin only. Each row is a proposed
 * rotation (a requester's new secret, encrypted, awaiting an admin to apply);
 * approving or denying goes through `review-rotation-request`.
 */
export function RotationQueue() {
  const [page, setPage] = useState(1)
  const [decision, setDecision] = useState<Decision | null>(null)

  const queue = usePendingRotationRequests(page, DEFAULT_PAGE_SIZE)
  const items = queue.data?.items ?? []
  const total = queue.data?.total ?? 0
  const from = total === 0 ? 0 : (page - 1) * DEFAULT_PAGE_SIZE + 1
  const to = Math.min(page * DEFAULT_PAGE_SIZE, total)

  return (
    <section className="border-line bg-surface rounded-lg border">
      <div className="border-line flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-fg font-mono text-xs font-semibold tracking-[0.08em] uppercase">
            Rotation Queue
          </h2>
          <span className="border-primary/25 bg-primary/10 text-primary-bright inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.05em] uppercase">
            <RotateCw className="size-3" />
            Rotation Requests
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
              <RotationRow
                key={req.id}
                request={req}
                onDecide={(action) => setDecision({ request: req, action })}
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
                      ? requestErrorMessage(queue.error, 'The rotation queue could not be loaded.')
                      : queue.isLoading
                        ? 'Loading rotation queue…'
                        : 'No rotation requests pending'}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-line flex items-center justify-end border-t px-5 py-4">
        <Pagination
          page={page}
          pageSize={queue.data?.page_size ?? DEFAULT_PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          className="font-mono text-xs"
        />
      </div>

      {decision && (
        <ReviewRotationDialog
          request={decision.request}
          action={decision.action}
          onClose={() => setDecision(null)}
        />
      )}
    </section>
  )
}

function RotationRow({
  request,
  onDecide,
}: {
  request: PendingRotationRequestItem
  onDecide: (action: ReviewAction) => void
}) {
  const requester = formatUserRef(request.requested_by)
  const severity = request.is_sla_breach ? 'critical' : waitSeverity(request.wait_minutes)

  return (
    <tr className="border-line hover:bg-surface-2 border-b transition-colors last:border-0">
      <td className="text-primary-bright px-4 py-3.5 font-mono font-medium">
        <span title={request.id}>{shortId(request.id)}</span>
      </td>
      <td className="text-fg-muted px-4 py-3.5 font-mono">{formatTimestamp(request.requested_at)}</td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="bg-primary/15 text-primary-bright grid size-7 shrink-0 place-items-center rounded-full font-mono text-[10px] font-bold">
            {initialsFrom(requester)}
          </span>
          <p className="text-fg truncate font-medium">{requester}</p>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <p className="text-fg font-mono text-xs font-semibold">{request.credential_name}</p>
        <p className="text-fg-subtle mt-0.5 max-w-xs truncate text-[11px]" title={request.justification}>
          {request.justification}
        </p>
      </td>
      <td className="px-4 py-3.5">
        <span className={cn('inline-flex items-center gap-1.5 font-mono text-xs', severityColor[severity])}>
          {request.is_sla_breach ? (
            <AlertTriangle className="size-3.5" />
          ) : (
            <Clock className="size-3.5" />
          )}
          {formatWait(request.wait_minutes)}
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

/**
 * Confirm approving or denying a rotation request. The contract carries no denial
 * reason, so a deny is a plain confirmation rather than a reason form.
 */
function ReviewRotationDialog({
  request,
  action,
  onClose,
}: {
  request: PendingRotationRequestItem
  action: ReviewAction
  onClose: () => void
}) {
  const mutation = useReviewRotationRequest({ onSuccess: onClose })
  const busy = mutation.isPending
  const denying = action === 'deny'

  return (
    <Modal
      open
      onClose={busy ? () => {} : onClose}
      title={denying ? 'Deny rotation request?' : 'Approve rotation request?'}
      icon={
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-full',
            denying ? 'bg-critical/15 text-critical-bright' : 'bg-primary/15 text-primary-bright',
          )}
        >
          {denying ? <XCircle className="size-5" /> : <CheckCircle2 className="size-5" />}
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => !busy && mutation.mutate({ requestId: request.id, action })}
            disabled={busy}
            className={cn(denying && 'bg-critical/80 text-fg hover:bg-critical active:bg-critical')}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {busy ? 'Recording…' : denying ? 'Deny' : 'Approve'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-fg-muted text-sm leading-relaxed">
          You&rsquo;re about to {action} a rotation of{' '}
          <span className="text-fg font-mono">{request.credential_name}</span>, requested by{' '}
          <span className="text-fg font-mono">{formatUserRef(request.requested_by)}</span>.
          {!denying && ' Approving applies the requester’s new secret.'}
        </p>
        <div className="border-line bg-surface-2 rounded-lg border p-3">
          <p className="text-fg-subtle font-mono text-[10px] tracking-[0.08em] uppercase">
            Justification
          </p>
          <p className="text-fg mt-1 text-sm leading-relaxed">{request.justification}</p>
        </div>
      </div>
    </Modal>
  )
}

/** Requests are identified by uuid; the first block is enough to tell rows apart. */
function shortId(id: string): string {
  return id.split('-')[0]?.toUpperCase() ?? id
}
