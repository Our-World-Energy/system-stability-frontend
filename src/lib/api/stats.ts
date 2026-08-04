/*
  Dashboard metrics. Three read-only routes, each taking an empty payload and
  answering with a flat object.

  Each getter fills in zeros for anything the service omits, so a card renders
  "0" rather than "undefined" on a quiet day or a partial response.
*/

import { stabilityCaller } from './caller'
import { endpoints } from './endpoints'
import type { ActivityStats, PendingStats, RequestStats } from './types'

/** Header cards on the admin Pending Approvals page. */
export async function getPendingStats(): Promise<PendingStats> {
  const { data } = await stabilityCaller<PendingStats | null>(
    endpoints.credentialManager.pendingStats,
    {},
  )
  return {
    total_pending: data?.total_pending ?? 0,
    avg_wait_minutes: data?.avg_wait_minutes ?? 0,
    sla_compliance_percent: data?.sla_compliance_percent ?? 0,
  }
}

/** Org-wide last-24h metrics for the admin Activity Ledger. */
export async function getActivityStats(): Promise<ActivityStats> {
  const { data } = await stabilityCaller<ActivityStats | null>(
    endpoints.credentialManager.activityStats,
    {},
  )
  return {
    total_requests_24h: data?.total_requests_24h ?? 0,
    pending_count: data?.pending_count ?? 0,
    denial_rate_percent: data?.denial_rate_percent ?? 0,
    peak_frequency_per_min: data?.peak_frequency_per_min ?? 0,
    status_distribution: data?.status_distribution ?? [],
    volume_by_hour: data?.volume_by_hour ?? [],
  }
}

/** The signed-in user's own counts and last-24h volume. */
export async function getRequestStats(): Promise<RequestStats> {
  const { data } = await stabilityCaller<RequestStats | null>(
    endpoints.credentialManager.requestStats,
    {},
  )
  return {
    pending_count: data?.pending_count ?? 0,
    granted_count: data?.granted_count ?? 0,
    denied_count: data?.denied_count ?? 0,
    expired_count: data?.expired_count ?? 0,
    volume_by_hour: data?.volume_by_hour ?? [],
  }
}
