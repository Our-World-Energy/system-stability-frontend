/*
  Access-request hooks: submitting one, reviewing one, and the two lists.

  The lists poll, because both are queues someone is watching in real time — the
  admin approval queue especially, where a stale row means two admins actioning
  the same request.
*/

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DEFAULT_PAGE_SIZE,
  getPendingRequests,
  getRequestLogs,
  requestErrorMessage,
  reviewRequest,
  submitAccessRequest,
} from '@/lib/api/requests'
import type { AccessRequestDraft, RequestLogFilters, ReviewAction } from '@/lib/api/requests'
import { requestKeys, statsKeys } from '@/lib/api/query-keys'
import { notify } from '@/lib/notify'
import type { RequestOutcome } from '@/lib/api/types'

/** How often the live queues re-fetch while their page is open. */
const QUEUE_POLL_MS = 30_000

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

/** Request history — everyone's for an admin, the caller's own otherwise. */
export function useRequestLogs(filters: RequestLogFilters = {}) {
  return useQuery({
    queryKey: requestKeys.logs(filters),
    queryFn: () => getRequestLogs(filters),
    refetchInterval: QUEUE_POLL_MS,
    placeholderData: (previous) => previous,
  })
}
