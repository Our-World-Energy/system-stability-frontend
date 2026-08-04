/*
  React Query cache keys for the credential manager.

  Kept in their own module so a mutation can invalidate a list it does not
  otherwise import, and so the key shapes stay consistent — every key starts with
  its feature name, which makes a broad `invalidateQueries({ queryKey: X.all })`
  do the obvious thing.
*/

import type { RequestLogFilters } from './requests'

export const credentialKeys = {
  all: ['credentials'] as const,
  search: (q: string) => [...credentialKeys.all, 'search', q] as const,
}

export const requestKeys = {
  all: ['requests'] as const,
  pending: (page: number, pageSize: number) =>
    [...requestKeys.all, 'pending', page, pageSize] as const,
  logs: (filters: RequestLogFilters) => [...requestKeys.all, 'logs', filters] as const,
}

export const statsKeys = {
  all: ['stats'] as const,
  pending: () => [...statsKeys.all, 'pending'] as const,
  activity: () => [...statsKeys.all, 'activity'] as const,
  request: () => [...statsKeys.all, 'request'] as const,
}
