/*
  Access-request hooks: submitting one, reviewing one, and the two lists.

  The lists poll, because both are queues someone is watching in real time — the
  admin approval queue especially, where a stale row means two admins actioning
  the same request.
*/

import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DEFAULT_PAGE_SIZE,
  getPendingRequests,
  getPendingRotationRequests,
  getRequestLogs,
  requestErrorMessage,
  reviewRequest,
  reviewRotationRequest,
  submitAccessRequest,
} from '@/lib/api/requests'
import type { AccessRequestDraft, RequestLogFilters, ReviewAction } from '@/lib/api/requests'
import { subscribePendingStats } from '@/lib/api/pending-stats-stream'
import { requestKeys, statsKeys } from '@/lib/api/query-keys'
import { notify } from '@/lib/notify'
import type { RequestOutcome } from '@/lib/api/types'

/** How often the live approval queue re-fetches while its page is open. */
const QUEUE_POLL_MS = 30_000

/** The audit logs move far more slowly, so they refresh on a gentler cadence. */
const LOGS_POLL_MS = 180_000

interface SubmitOptions {
  onSuccess?: (outcome: RequestOutcome) => void
}

/**
 * Submit an access request.
 *
 * An auto-granting credential comes back already granted, so the caller is told
 * which of the two happened rather than being left to assume it was queued.
 */
export function useSubmitRequest({ onSuccess }: SubmitOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (draft: AccessRequestDraft) => submitAccessRequest(draft),
    retry: false,
    onSuccess: (result) => {
      const outcome = result.data
      notify.success(
        outcome?.grant
          ? 'Access granted — your window is open.'
          : 'Request submitted for approval.',
      )
      void queryClient.invalidateQueries({ queryKey: requestKeys.all })
      void queryClient.invalidateQueries({ queryKey: statsKeys.all })
      onSuccess?.(outcome)
    },
    onError: (err) => notify.error(requestErrorMessage(err)),
  })
}

interface ReviewOptions {
  onSuccess?: (outcome: RequestOutcome, action: ReviewAction) => void
}

/** Approve or deny a pending request. Approval issues the grant atomically. */
export function useReviewRequest({ onSuccess }: ReviewOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (vars: { requestId: string; action: ReviewAction; denialReason?: string }) =>
      reviewRequest(vars.requestId, vars.action, vars.denialReason),
    retry: false,
    onSuccess: (result, vars) => {
      notify.success(
        result.message?.trim() ||
          (vars.action === 'approve' ? 'Request approved.' : 'Request denied.'),
      )
      void queryClient.invalidateQueries({ queryKey: requestKeys.all })
      void queryClient.invalidateQueries({ queryKey: statsKeys.all })
      onSuccess?.(result.data, vars.action)
    },
    onError: (err) => notify.error(requestErrorMessage(err, 'The review could not be recorded.')),
  })
}

/** The admin approval queue, oldest first. */
export function usePendingRequests(page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  return useQuery({
    queryKey: requestKeys.pending(page, pageSize),
    queryFn: () => getPendingRequests(page, pageSize),
    refetchInterval: QUEUE_POLL_MS,
    // Keep the previous page on screen while the next one loads, so paging does
    // not blank the table.
    placeholderData: (previous) => previous,
  })
}

/** The rotation-request approval queue (org admin only). */
export function usePendingRotationRequests(page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  return useQuery({
    queryKey: requestKeys.rotationPending(page, pageSize),
    queryFn: () => getPendingRotationRequests(page, pageSize),
    refetchInterval: QUEUE_POLL_MS,
    placeholderData: (previous) => previous,
  })
}

interface ReviewRotationOptions {
  onSuccess?: () => void
}

/** Approve or deny a rotation request; refreshes the queues on success. */
export function useReviewRotationRequest({ onSuccess }: ReviewRotationOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (vars: { requestId: string; action: ReviewAction; denialReason?: string }) =>
      reviewRotationRequest(vars.requestId, vars.action, vars.denialReason),
    retry: false,
    onSuccess: (result, vars) => {
      notify.success(
        result.message?.trim() ||
          (vars.action === 'approve' ? 'Rotation request approved.' : 'Rotation request denied.'),
      )
      void queryClient.invalidateQueries({ queryKey: requestKeys.all })
      onSuccess?.()
    },
    onError: (err) =>
      notify.error(requestErrorMessage(err, 'The rotation review could not be recorded.')),
  })
}

/**
 * Refetch the approval queue whenever the pending-stats SSE pushes an update.
 *
 * The stream fires on every submit / approve / deny across the org, so a live
 * push means the queue on screen may be stale — this pulls the fresh list at
 * once, on top of the slower poll. Only active while the page that calls it (the
 * admin Pending Approvals page) is mounted, so nothing runs off-screen.
 */
export function useRefreshPendingRequestsOnStats() {
  const queryClient = useQueryClient()
  useEffect(
    () =>
      // The `requests` prefix matches every pending page in the cache; only the
      // one currently on screen is active and actually refetches.
      subscribePendingStats(() => {
        void queryClient.invalidateQueries({ queryKey: requestKeys.all })
      }),
    [queryClient],
  )
}

/** Request history — everyone's for an admin, the caller's own otherwise. */
export function useRequestLogs(filters: RequestLogFilters = {}) {
  return useQuery({
    queryKey: requestKeys.logs(filters),
    queryFn: () => getRequestLogs(filters),
    // Refreshed every 3 minutes so the page shows fresh data without hammering
    // the service — the ledger is reviewed, not watched live like the queue.
    refetchInterval: LOGS_POLL_MS,
    placeholderData: (previous) => previous,
  })
}
