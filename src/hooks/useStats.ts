/*
  The dashboard-metric queries.

  Activity and request stats sit on the logs pages, which are reviewed rather than
  watched live, so they refresh on a gentle 3-minute cadence — enough to keep the
  cards and the table beneath them in step without hammering the service.
  Pending-approval stats are different: the backend pushes them over SSE (see
  `pending-stats-stream`), so those cards update the instant a request is
  submitted, approved or denied — no polling, and every open tab moves together.
*/

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getActivityStats, getRequestStats } from '@/lib/api/stats'
import { subscribePendingStats } from '@/lib/api/pending-stats-stream'
import { statsKeys } from '@/lib/api/query-keys'
import type { PendingStats } from '@/lib/api/types'

/** Logs-page stats refresh every 3 minutes, matching the request-logs list. */
const STATS_POLL_MS = 180_000

/**
 * Header cards on the admin Pending Approvals page, fed by the live SSE stream.
 * Returns the same `{ data, isLoading }` surface the query version did, so the
 * cards read `data?.total_pending` and `isLoading` unchanged — `isLoading` stays
 * true only until the first frame lands.
 */
export function usePendingStats(): { data: PendingStats | undefined; isLoading: boolean } {
  const [data, setData] = useState<PendingStats>()
  useEffect(() => subscribePendingStats(setData), [])
  return { data, isLoading: data === undefined }
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
