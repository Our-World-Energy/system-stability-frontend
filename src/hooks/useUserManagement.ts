/*
  React Query hooks for the User Registry.

  Filtering, searching and pagination all happen server-side — get-users applies
  them to the whole table and returns a `total` for the filtered set — so the page
  holds only the query parameters, never a client-side copy of the registry to
  filter itself.

  Every mutation invalidates both the list and the metadata: role counts move when
  a user is created, re-roled or deleted, and the Role Allocation card reads them
  from get-metadata.
*/

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toApiError } from '@/lib/api/caller'
import { userKeys } from '@/lib/api/query-keys'
import {
  createUser,
  deleteUser,
  getActiveUserStats,
  getMetadata,
  getUsers,
  updateUser,
} from '@/lib/api/user-management'
import type {
  ActiveUserStatsRequest,
  CreateUserRequest,
  GetUsersRequest,
  UpdateUserRequest,
  UserRecord,
} from '@/lib/api/user-management.types'
import { notify } from '@/lib/notify'

/** get-users' own default when `page_size` is omitted. */
export const DEFAULT_PAGE_SIZE = 25

/**
 * Roles, departments (sub-departments nested) and the platform catalog.
 *
 * Cached for a while: these are catalog tables that change on a migration, not
 * per interaction. `enabled` lets the page skip the call for a non-org_admin,
 * which would only ever get a 403.
 */
export function useUserMetadata(enabled = true) {
  return useQuery({
    queryKey: userKeys.metadata(),
    queryFn: getMetadata,
    enabled,
    staleTime: 5 * 60_000,
    // A 403 is an answer, not a failure to retry — see the access probe in
    // UserManagement, which reads exactly that to decide what to render.
    retry: false,
  })
}

/**
 * One page of the registry.
 *
 * `placeholderData` keeps the current rows on screen while the next page loads,
 * so paging and typing in the search box do not blank the table between renders.
 */
export function useUsers(params: GetUsersRequest, enabled = true) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => getUsers(params),
    enabled,
    placeholderData: (previous) => previous,
    retry: false,
  })
}

/**
 * GA4 active users for one inclusive date range.
 *
 * org_admin only, so it takes the same `enabled` gate the registry does — asking
 * as anyone else buys a 403. React Query's `signal` is handed to axios, which is
 * what makes a quick run through the range pills abort the requests it passed.
 *
 * `placeholderData` keeps the previous curve on screen while the next range
 * loads, so switching pills fades between two charts rather than flashing empty.
 */
export function useActiveUserStats(range: ActiveUserStatsRequest | null, enabled = true) {
  return useQuery({
    queryKey: userKeys.activeStats(range?.start_date ?? '', range?.end_date ?? ''),
    queryFn: ({ signal }) => getActiveUserStats(range!, signal),
    enabled: enabled && range !== null,
    placeholderData: (previous) => previous,
    // Counts are synced hourly by the backend; re-asking on every remount would
    // spend a request on data that cannot have moved.
    staleTime: 5 * 60_000,
    retry: false,
  })
}

/** Invalidate the registry and the role counts together. */
function useRefreshRegistry() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: userKeys.all })
  }
}

interface MutationOptions {
  onSuccess?: () => void
}

/**
 * Create a user — or reactivate a soft-deleted one with the same email.
 *
 * Both are successes and the toast says which happened, because from the admin's
 * side "reactivated" means the account kept its original id and audit history
 * rather than starting fresh.
 */
export function useCreateUser({ onSuccess }: MutationOptions = {}) {
  const refresh = useRefreshRegistry()

  return useMutation({
    mutationFn: (payload: CreateUserRequest) => createUser(payload),
    retry: false,
    onSuccess: (outcome) => {
      const name = outcome.user.full_name || outcome.user.email
      notify.success(
        outcome.reactivated
          ? `${name} was previously removed and has been reactivated.`
          : `${name} was created.`,
      )
      // The new account starts on a generated password, and in prod the welcome
      // email is what delivers it — so whether it actually sent is worth saying.
      if (!outcome.email_sent) {
        notify.info('No welcome email was sent — share the temporary password directly.')
      }
      refresh()
      onSuccess?.()
    },
    onError: (err) => notify.error(toApiError(err).message),
  })
}

interface UpdateOptions {
  /** Receives the saved record, so the caller can react to what actually changed. */
  onSuccess?: (user: UserRecord) => void
}

/** Full replace of a user's profile, role and scope. */
export function useUpdateUser({ onSuccess }: UpdateOptions = {}) {
  const refresh = useRefreshRegistry()

  return useMutation({
    mutationFn: (payload: UpdateUserRequest) => updateUser(payload),
    retry: false,
    onSuccess: (user: UserRecord) => {
      notify.success(`${user.full_name || user.email} was updated.`)
      refresh()
      onSuccess?.(user)
    },
    onError: (err) => notify.error(toApiError(err).message),
  })
}

/**
 * Soft-delete a user.
 *
 * The row survives in the database so past credential actions stay attributed;
 * it just drops out of get-users and can no longer sign in. Re-adding the same
 * email later reactivates this record rather than creating a second one.
 */
export function useDeleteUser({ onSuccess }: MutationOptions = {}) {
  const refresh = useRefreshRegistry()

  return useMutation({
    mutationFn: (user: UserRecord) => deleteUser(user.id),
    retry: false,
    onSuccess: (_void, user) => {
      notify.success(`${user.full_name || user.email} was removed.`)
      refresh()
      onSuccess?.()
    },
    onError: (err) => notify.error(toApiError(err).message),
  })
}
