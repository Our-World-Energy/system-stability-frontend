import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoaderCircle, ShieldAlert } from 'lucide-react'
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
import { notify } from '@/lib/notify'
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
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()

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

  /*
    Whether this caller is an org_admin is decided by the backend, not by the
    `role` claim in the JWT.

    That claim is a snapshot taken at login and good for eight hours, so an admin
    who promotes or demotes someone does not change what that person's open session
    believes about itself — and neither does reloading the page, because the stale
    role is baked into the token. Reading it locally made the UI confidently wrong.

    get-metadata is org_admin-only, so attempting it *is* the access check: 200
    means the backend will honour admin calls from this session, and 403 means it
    will not, whatever the token says.
  */
  const metadataQuery = useUserMetadata()
  const metadataError = metadataQuery.error ? toApiError(metadataQuery.error) : null
  const accessDenied = metadataError?.status === 403
  const checkingAccess = metadataQuery.isLoading

  // Only a definitive 403 stops the registry loading; a timeout or a 500 is a
  // transient failure, and hiding the whole page behind it would be wrong.
  const usersQuery = useUsers(params, !accessDenied && !checkingAccess)

  const metadata = metadataQuery.data ?? NO_METADATA
  const users = usersQuery.data?.users ?? []
  const total = usersQuery.data?.total ?? 0

  const closeModal = () => setModal(null)

  /*
    What the row looked like before the edit, captured at save time.

    Needed after the response lands, by which point the dialog holding the original
    record has already closed — and a role change is the one edit whose consequences
    reach beyond this page.
  */
  const editedFrom = useRef<{ role: RoleKey; email: string } | null>(null)

  const createUser = useCreateUser({ onSuccess: closeModal })
  const deleteUser = useDeleteUser({ onSuccess: closeModal })

  const updateUser = useUpdateUser({
    onSuccess: (updated) => {
      const before = editedFrom.current
      editedFrom.current = null
      closeModal()
      if (!before || before.role === updated.role.key) return

      // A role lives in the JWT, which is only reissued at login. Whoever now holds
      // the changed role is still running on a token that describes the old one.
      const isSelf = currentUser?.email.toLowerCase() === updated.email.toLowerCase()
      if (isSelf) {
        // Carrying on with a token that misdescribes our own access means a UI that
        // disagrees with the backend about what it may do. Start a fresh session.
        signOut()
        navigate('/login', {
          replace: true,
          state: { notice: 'Your role changed. Sign in again to pick up the new access level.' },
        })
        return
      }
      notify.info(
        `${updated.full_name || updated.email} keeps the old role until they sign out and back in.`,
      )
    },
  })

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

  if (checkingAccess) {
    return (
      <div className="border-line bg-surface flex flex-col items-center gap-3 rounded-lg border px-6 py-16 text-center">
        <LoaderCircle className="text-fg-subtle size-8 animate-spin" aria-hidden />
        <p className="text-fg-muted font-mono text-sm">Checking access…</p>
      </div>
    )
  }

  if (accessDenied) {
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
        {/* The label above comes from the token, which a recent role change would
            not have updated — so say what actually fixes it. */}
        <p className="text-fg-subtle max-w-[52ch] text-[13px] leading-relaxed">
          If your role was changed recently, sign out and back in to refresh it.
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

      {/* Mounted only while open, like the other two. That is what resets the form
          between uses — keeping it mounted meant it had to clear itself on submit,
          which wiped the admin's input whenever create-user came back an error. */}
      {modal?.kind === 'add' && (
        <AddUserModal
          onClose={closeModal}
          onCreate={(payload) => createUser.mutate(payload)}
          metadata={metadata}
          pending={createUser.isPending}
        />
      )}

      {modal?.kind === 'edit' && (
        <EditUserModal
          user={modal.user}
          onClose={closeModal}
          onSave={(payload) => {
            // Captured before the dialog closes, so the response can be compared
            // against what the row was.
            editedFrom.current = { role: modal.user.role.key, email: modal.user.email }
            updateUser.mutate(payload)
          }}
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
