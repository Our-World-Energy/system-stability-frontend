/*
  The three dashboard-metric queries.

  All poll on the same interval as the queues they sit above, so a header card
  and the table beneath it never disagree about how many requests are pending.
*/

import { useQuery } from '@tanstack/react-query'
import { getActivityStats, getPendingStats, getRequestStats } from '@/lib/api/stats'
import { statsKeys } from '@/lib/api/query-keys'

const STATS_POLL_MS = 30_000

/** Header cards on the admin Pending Approvals page. */
export function usePendingStats() {
  return useQuery({
    queryKey: statsKeys.pending(),
    queryFn: getPendingStats,
    refetchInterval: STATS_POLL_MS,
  })
}

/** Org-wide last-24h metrics for the admin Activity Ledger. */
export function useActivityStats() {
  return useQuery({
    queryKey: statsKeys.activity(),
    queryFn: getActivityStats,
    refetchInterval: STATS_POLL_MS,
  })
}

/** The signed-in user's own counts and volume, for the Request Log's page. */
export function useRequestStats() {
  return useQuery({
    queryKey: statsKeys.request(),
    queryFn: getRequestStats,
    refetchInterval: STATS_POLL_MS,
  })
}
