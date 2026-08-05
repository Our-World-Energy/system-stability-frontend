import { useMemo, useState } from 'react'
import { ActiveUsersChart } from '@/components/users/ActiveUsersChart'
import { RoleAllocation } from '@/components/users/RoleAllocation'
import { RoleCapabilityMatrix } from '@/components/users/RoleCapabilityMatrix'
import { UserRegistryTable, type UserAction } from '@/components/users/UserRegistryTable'
import { AddUserModal } from '@/components/users/AddUserModal'
import { EditUserModal } from '@/components/users/EditUserModal'
import { DeleteUserModal } from '@/components/users/DeleteUserModal'
import type { UserDraft } from '@/lib/user-draft'
import { users as seedUsers, type User, type UserRole } from '@/lib/users-data'

type ActiveModal = { kind: 'add' } | { kind: UserAction; user: User } | null

const PAGE_SIZE = 5

export function UserManagement() {
  const [registry, setRegistry] = useState<User[]>(seedUsers)
  const [modal, setModal] = useState<ActiveModal>(null)
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  // Empty means "every role"; the filter narrows to whatever is checked.
  const [roleFilter, setRoleFilter] = useState<UserRole[]>([])

  // Search covers identity plus the whole grant — including the platforms the
  // row doesn't show — so "datadog" still finds the admin who holds it.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return registry.filter((user) => {
      if (roleFilter.length && !roleFilter.includes(user.role)) return false
      if (!q) return true
      return [
        user.name,
        user.email,
        user.id,
        user.role,
        user.department,
        user.subDepartment,
        ...user.platforms,
      ].some((field) => field.toLowerCase().includes(q))
    })
  }, [registry, query, roleFilter])

  const pageCount = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1)
  const currentPage = Math.min(page, pageCount)

  const visible = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  )

  // Narrowing the list invalidates whatever page you were on — go back to the first.
  const changeQuery = (next: string) => {
    setQuery(next)
    setPage(1)
  }

  const toggleRole = (role: UserRole) => {
    setRoleFilter((roles) =>
      roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role],
    )
    setPage(1)
  }

  const clearRoleFilter = () => {
    setRoleFilter([])
    setPage(1)
  }

  const createUser = (draft: UserDraft) => {
    const user: User = {
      // Deterministic-enough stand-in for a server-assigned identity.
      id: `OWE-${String(1000 + registry.length * 37).slice(0, 4)}-N`,
      name: draft.name.trim(),
      email: draft.email.trim(),
      role: draft.role as User['role'],
      department: draft.department,
      subDepartment: draft.subDepartment,
      platforms: draft.platforms,
      phone: draft.phone.trim(),
      justification: draft.justification.trim(),
      status: 'Pending Review',
    }
    setRegistry((list) => [user, ...list])
    setPage(1) // Surface the new row.
    setModal(null)
  }

  const saveUser = (id: string, draft: UserDraft) => {
    setRegistry((list) =>
      list.map((u) =>
        u.id === id
          ? {
              ...u,
              name: draft.name.trim(),
              email: draft.email.trim(),
              phone: draft.phone.trim(),
              role: draft.role as User['role'],
              department: draft.department,
              subDepartment: draft.subDepartment,
              platforms: draft.platforms,
              justification: draft.justification.trim(),
            }
          : u,
      ),
    )
    setModal(null)
  }

  const deleteUser = (id: string) => {
    setRegistry((list) => list.filter((u) => u.id !== id))
    setModal(null)
  }

  return (
    <div className="space-y-6 pb-4">
      {/* No page heading here — the navbar already renders "User Management", and
          Add User lives in the registry table's own header. */}
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <ActiveUsersChart />
        <RoleAllocation />
      </div>

      <UserRegistryTable
        users={visible}
        onAction={(action, user) => setModal({ kind: action, user })}
        onAddUser={() => setModal({ kind: 'add' })}
        totalCount={filtered.length}
        unfilteredCount={registry.length}
        query={query}
        onQueryChange={changeQuery}
        roleFilter={roleFilter}
        onToggleRole={toggleRole}
        onClearRoleFilter={clearRoleFilter}
        page={currentPage}
        pageCount={pageCount}
        onPageChange={setPage}
      />

      <RoleCapabilityMatrix />

      <AddUserModal
        open={modal?.kind === 'add'}
        onClose={() => setModal(null)}
        onCreate={createUser}
      />

      {modal?.kind === 'edit' && (
        <EditUserModal
          user={modal.user}
          onClose={() => setModal(null)}
          onSave={(draft) => saveUser(modal.user.id, draft)}
        />
      )}
      {modal?.kind === 'delete' && (
        <DeleteUserModal
          user={modal.user}
          onClose={() => setModal(null)}
          onConfirm={() => deleteUser(modal.user.id)}
        />
      )}
    </div>
  )
}
