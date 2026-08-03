import { useMemo, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { UserGrowthChart } from '@/components/users/UserGrowthChart'
import { RoleAllocation } from '@/components/users/RoleAllocation'
import { RoleCapabilityMatrix } from '@/components/users/RoleCapabilityMatrix'
import { UserRegistryTable, type UserAction } from '@/components/users/UserRegistryTable'
import { AddUserModal } from '@/components/users/AddUserModal'
import { EditUserModal } from '@/components/users/EditUserModal'
import { DeleteUserModal } from '@/components/users/DeleteUserModal'
import { ViewUserModal } from '@/components/users/ViewUserModal'
import type { UserDraft } from '@/lib/user-draft'
import { users as seedUsers, type User } from '@/lib/users-data'

type ActiveModal = { kind: 'add' } | { kind: UserAction; user: User } | null

const PAGE_SIZE = 5

export function UserManagement() {
  const [registry, setRegistry] = useState<User[]>(seedUsers)
  const [modal, setModal] = useState<ActiveModal>(null)
  const [page, setPage] = useState(1)

  const pageCount = Math.max(Math.ceil(registry.length / PAGE_SIZE), 1)
  const currentPage = Math.min(page, pageCount)

  const visible = useMemo(
    () => registry.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [registry, currentPage],
  )

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
      {/* No page heading here — the navbar already renders "User Management". */}
      <header className="flex justify-end">
        <Button variant="cta" onClick={() => setModal({ kind: 'add' })}>
          <UserPlus className="size-4" />
          Add User
        </Button>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <UserGrowthChart />
        <RoleAllocation />
      </div>

      <UserRegistryTable
        users={visible}
        onAction={(action, user) => setModal({ kind: action, user })}
        totalCount={registry.length}
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

      {modal?.kind === 'view' && (
        <ViewUserModal
          user={modal.user}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ kind: 'edit', user: modal.user })}
        />
      )}
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
