/*
  React Query cache keys for the credential manager.

  Kept in their own module so a mutation can invalidate a list it does not
  otherwise import, and so the key shapes stay consistent — every key starts with
  its feature name, which makes a broad `invalidateQueries({ queryKey: X.all })`
  do the obvious thing.
*/

import type { RequestLogFilters } from './requests'
import type { GetUsersRequest } from './user-management.types'

export const credentialKeys = {
  all: ['credentials'] as const,
  search: (q: string) => [...credentialKeys.all, 'search', q] as const,
}

export const requestKeys = {
  all: ['requests'] as const,
  pending: (page: number, pageSize: number) =>
    [...requestKeys.all, 'pending', page, pageSize] as const,
  rotationPending: (page: number, pageSize: number) =>
    [...requestKeys.all, 'rotation-pending', page, pageSize] as const,
  logs: (filters: RequestLogFilters) => [...requestKeys.all, 'logs', filters] as const,
}

export const userKeys = {
  all: ['users'] as const,
  /** The registry slice for one set of filters — the server does the filtering. */
  list: (params: GetUsersRequest) => [...userKeys.all, 'list', params] as const,
  /**
   * Roles, departments and platforms. Separate from `all` so a create/update can
   * invalidate both the list and the role counts without refetching one twice.
   */
  metadata: () => [...userKeys.all, 'metadata'] as const,
  /** GA4 active-user counts for one inclusive date range. */
  activeStats: (start: string, end: string) =>
    [...userKeys.all, 'active-stats', start, end] as const,
}

export const statsKeys = {
  all: ['stats'] as const,
  pending: () => [...statsKeys.all, 'pending'] as const,
  activity: () => [...statsKeys.all, 'activity'] as const,
  request: () => [...statsKeys.all, 'request'] as const,
}
