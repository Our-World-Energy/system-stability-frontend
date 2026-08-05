import { useMemo, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { ActiveUsersChart } from '@/components/users/ActiveUsersChart'
import { RoleAllocation } from '@/components/users/RoleAllocation'
import { RoleCapabilityMatrix } from '@/components/users/RoleCapabilityMatrix'
import { UserRegistryTable, type UserAction } from '@/components/users/UserRegistryTable'
import { AddUserModal } from '@/components/users/AddUserModal'
import { EditUserModal } from '@/components/users/EditUserModal'
import { DeleteUserModal } from '@/components/users/DeleteUserModal'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import {
  useCreateUser,
  useDeleteUser,
  useUpdateUser,
  useUserMetadata,
  useUsers,
} from '@/hooks/useUserManagement'
import { toApiError } from '@/lib/api/caller'
import type {
  GetUsersRequest,
  MetadataData,
  RoleKey,
  UserRecord,
} from '@/lib/api/user-management.types'
import { useAuthStore } from '@/store/auth'

type ActiveModal = { kind: 'add' } | { kind: UserAction; user: UserRecord } | null

/** Rows per page. get-users defaults to 25; the design's table shows five. */
const PAGE_SIZE = 5

/** Typing in the search box hits the API, so wait for a pause first. */
const SEARCH_DEBOUNCE_MS = 350

/** Empty catalogs, so the form renders (with empty dropdowns) before metadata lands. */
const NO_METADATA: MetadataData = { roles: [], departments: [], platforms: [] }

export function UserManagement() {
  const currentUser = useAuthStore((s) => s.user)
  // get-metadata, get-users and all three mutations are org_admin only. Calling
  // them as anyone else just earns a 403, so the registry is not rendered at all.
  const isOrgAdmin = currentUser?.role === 'org_admin'

  const [modal, setModal] = useState<ActiveModal>(null)
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  // Empty means "every role"; the filter narrows to whatever is checked.
  const [roleFilter, setRoleFilter] = useState<RoleKey[]>([])

  const search = useDebouncedValue(query, SEARCH_DEBOUNCE_MS)

  // The API does the filtering, searching and paging — this is the whole of the
  // page's query state, and there is no local copy of the registry to keep in sync.
  const params = useMemo<GetUsersRequest>(
    () => ({
      page,
      page_size: PAGE_SIZE,
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(roleFilter.length ? { roles: roleFilter } : {}),
    }),
    [page, search, roleFilter],
  )

  const metadataQuery = useUserMetadata(isOrgAdmin)
  const usersQuery = useUsers(params, isOrgAdmin)

  const metadata = metadataQuery.data ?? NO_METADATA
  const users = usersQuery.data?.users ?? []
  const total = usersQuery.data?.total ?? 0

  const closeModal = () => setModal(null)

  const createUser = useCreateUser({ onSuccess: closeModal })
  const updateUser = useUpdateUser({ onSuccess: closeModal })
  const deleteUser = useDeleteUser({ onSuccess: closeModal })

  // Narrowing the list invalidates whatever page you were on — go back to the first,
  // or the next request asks for a page beyond the filtered result.
  const changeQuery = (next: string) => {
    setQuery(next)
    setPage(1)
  }

  const toggleRole = (role: RoleKey) => {
    setRoleFilter((roles) =>
      roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role],
    )
    setPage(1)
  }

  const clearRoleFilter = () => {
    setRoleFilter([])
    setPage(1)
  }

  if (!isOrgAdmin) {
    return (
      <div className="border-line bg-surface flex flex-col items-center gap-3 rounded-lg border px-6 py-16 text-center">
        <ShieldAlert className="text-degraded size-8" />
        <h2 className="text-fg text-base font-semibold">Organizational Admin access required</h2>
        <p className="text-fg-muted max-w-[52ch] text-[13px] leading-relaxed">
          The user registry is restricted to the Organizational Admin role.
          {currentUser
            ? ` You are signed in as ${currentUser.roleLabel}.`
            : ' No signed-in account was found.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-4">
      {/* No page heading here — the navbar already renders "User Management", and
          Add User lives in the registry table's own header. */}
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <ActiveUsersChart />
        <RoleAllocation roles={metadata.roles} />
      </div>

      {/* A failure here breaks every dropdown in the create/edit form, so it is
          stated rather than left as silently empty selects. */}
      {metadataQuery.isError && (
        <p
          role="alert"
          className="border-critical/40 bg-critical/10 text-critical-bright rounded-lg border px-4 py-3 text-sm"
        >
          {toApiError(metadataQuery.error).message}
        </p>
      )}
      {usersQuery.isError && (
        <p
          role="alert"
          className="border-critical/40 bg-critical/10 text-critical-bright rounded-lg border px-4 py-3 text-sm"
        >
          {toApiError(usersQuery.error).message}
        </p>
      )}

      <UserRegistryTable
        users={users}
        onAction={(action, user) => setModal({ kind: action, user })}
        onAddUser={() => setModal({ kind: 'add' })}
        total={total}
        roles={metadata.roles}
        query={query}
        onQueryChange={changeQuery}
        roleFilter={roleFilter}
        onToggleRole={toggleRole}
        onClearRoleFilter={clearRoleFilter}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={usersQuery.isFetching}
        currentUserEmail={currentUser?.email}
      />

      <RoleCapabilityMatrix roles={metadata.roles} />

      <AddUserModal
        open={modal?.kind === 'add'}
        onClose={closeModal}
        onCreate={(payload) => createUser.mutate(payload)}
        metadata={metadata}
        pending={createUser.isPending}
      />

      {modal?.kind === 'edit' && (
        <EditUserModal
          user={modal.user}
          onClose={closeModal}
          onSave={(payload) => updateUser.mutate(payload)}
          metadata={metadata}
          pending={updateUser.isPending}
        />
      )}
      {modal?.kind === 'delete' && (
        <DeleteUserModal
          user={modal.user}
          onClose={closeModal}
          onConfirm={() => deleteUser.mutate(modal.user)}
          pending={deleteUser.isPending}
        />
      )}
    </div>
  )
}
