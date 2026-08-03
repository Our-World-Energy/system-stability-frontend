import { Eye, ListFilter, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { accessScopeOf, roleCapabilities, type RotationRight, type User } from '@/lib/users-data'
import { RolePill } from './RolePill'

export type UserAction = 'view' | 'delete' | 'edit'

interface UserRegistryTableProps {
  users: User[]
  onAction: (action: UserAction, user: User) => void
  /** Total across every page, for the "Showing x of y" caption. */
  totalCount: number
  page: number
  pageCount: number
  onPageChange: (page: number) => void
}

const columns = ['User', 'Emails', 'Role', 'Credential Access', 'Rotation', 'Actions']

/** Column-width-friendly wording for the rotation right; the dialogs spell it out. */
const rotationText: Record<RotationRight, string> = {
  rotate: 'Rotate / update',
  request: 'Request only',
  none: 'View only',
}

/** The user registry: one row per account, with view/delete/edit per row. */
export function UserRegistryTable({
  users,
  onAction,
  totalCount,
  page,
  pageCount,
  onPageChange,
}: UserRegistryTableProps) {
  return (
    <section className="border-line bg-surface overflow-hidden rounded-lg border">
      <header className="border-line flex items-center justify-between border-b px-5 py-4">
        <h2 className="text-fg text-sm font-semibold">User Registry</h2>
        <button
          type="button"
          aria-label="Filter registry"
          title="Filter registry"
          className="text-fg-muted hover:bg-surface-3 hover:text-fg grid size-8 place-items-center rounded-lg transition-colors"
        >
          <ListFilter className="size-4" />
        </button>
      </header>

      <div className="overflow-x-auto">
        <table aria-label="User Registry" className="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr className="border-line border-b">
              {columns.map((col) => (
                <th
                  key={col}
                  className={cn(
                    'text-fg-subtle px-5 py-3 font-mono text-[11px] font-semibold tracking-[0.08em] uppercase',
                    col === 'Actions' ? 'text-right' : 'text-left',
                  )}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-16 text-center">
                  <p className="text-fg-muted font-mono text-sm">No users match this filter</p>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-line hover:bg-surface-2 border-b transition-colors last:border-0"
                >
                  <td className="text-fg px-5 py-4 font-medium">{user.name}</td>
                  <td className="text-primary-bright px-5 py-4 font-mono text-[13px]">
                    {user.email}
                  </td>
                  <td className="px-5 py-4">
                    <RolePill role={user.role} />
                  </td>
                  {/* What the role reaches, resolved against this user's own grant —
                      a department, named platforms, or an org/environment-wide scope. */}
                  <td className="px-5 py-4">
                    <p className="text-fg-muted">{accessScopeOf(user)}</p>
                    {user.subDepartment && (
                      <p className="text-fg-subtle mt-0.5 font-mono text-xs">
                        {user.subDepartment}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <RotationCell rotation={roleCapabilities[user.role].rotation} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <IconButton
                        label={`View ${user.name}`}
                        onClick={() => onAction('view', user)}
                      >
                        <Eye className="size-4" />
                      </IconButton>
                      <IconButton
                        label={`Delete ${user.name}`}
                        destructive
                        onClick={() => onAction('delete', user)}
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                      <IconButton
                        label={`Edit ${user.name}`}
                        onClick={() => onAction('edit', user)}
                      >
                        <Pencil className="size-4" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="border-line flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
        <p className="text-fg-muted text-[13px]">
          Showing {users.length} of {totalCount.toLocaleString()} users
        </p>
        <Pagination page={page} pageCount={pageCount} onPageChange={onPageChange} />
      </footer>
    </section>
  )
}

/** Rotation rights, tinted so "can change a secret" stands out while auditing. */
function RotationCell({ rotation }: { rotation: RotationRight }) {
  return (
    <span
      className={cn(
        'font-mono text-[11px] font-bold tracking-[0.08em] whitespace-nowrap uppercase',
        rotation === 'rotate' && 'text-primary-bright',
        rotation === 'request' && 'text-degraded',
        rotation === 'none' && 'text-fg-subtle',
      )}
    >
      {rotationText[rotation]}
    </span>
  )
}

/** Page numbers to render — a sliding window, so a long directory can't spray
 *  hundreds of buttons across the footer. */
function pageWindow(page: number, pageCount: number, size = 3): number[] {
  const span = Math.min(size, pageCount)
  const start = Math.min(Math.max(1, page - Math.floor(span / 2)), pageCount - span + 1)
  return Array.from({ length: span }, (_, i) => start + i)
}

function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
}) {
  return (
    <nav className="flex items-center gap-2" aria-label="Registry pages">
      <PageButton disabled={page === 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </PageButton>
      {pageWindow(page, pageCount).map((n) => (
        <button
          key={n}
          onClick={() => onPageChange(n)}
          aria-current={n === page ? 'page' : undefined}
          className={cn(
            'grid size-9 place-items-center rounded-lg border font-mono text-[13px] transition-colors',
            n === page
              ? 'border-primary text-primary-bright'
              : 'text-fg-muted hover:bg-surface-3 hover:text-fg border-transparent',
          )}
        >
          {n}
        </button>
      ))}
      <PageButton disabled={page === pageCount} onClick={() => onPageChange(page + 1)}>
        Next
      </PageButton>
    </nav>
  )
}

function PageButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="border-line-bright text-fg-muted hover:bg-surface-3 hover:text-fg rounded-lg border px-3 py-2 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function IconButton({
  label,
  onClick,
  destructive,
  children,
}: {
  label: string
  onClick: () => void
  destructive?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'grid size-8 place-items-center rounded-lg transition-colors',
        destructive
          ? 'text-critical hover:bg-critical/10 hover:text-critical-bright'
          : 'text-fg-muted hover:bg-surface-3 hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}
