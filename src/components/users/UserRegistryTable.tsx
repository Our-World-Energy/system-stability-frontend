import { useEffect, useRef, useState } from 'react'
import {
  LoaderCircle,
  Pencil,
  Search,
  SearchX,
  SlidersHorizontal,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { byRankDescending } from '@/lib/role-display'
import { needsPlatforms } from '@/lib/api/user-payload'
import type { Role, RoleKey, UserRecord } from '@/lib/api/user-management.types'
import { RolePill } from './RolePill'

export type UserAction = 'delete' | 'edit'

interface UserRegistryTableProps {
  users: UserRecord[]
  onAction: (action: UserAction, user: UserRecord) => void
  /** Opens the Add User modal — the registry header owns the create entry point. */
  onAddUser: () => void
  /**
   * get-users' `total`: the count *after* search and role filters are applied, so
   * it drives the pagination controls directly.
   */
  total: number
  /** Roles offered by the filter dropdown, from get-metadata. */
  roles: Role[]
  query: string
  onQueryChange: (query: string) => void
  /** Role keys the filter is narrowed to; empty means every role. */
  roleFilter: RoleKey[]
  onToggleRole: (role: RoleKey) => void
  onClearRoleFilter: () => void
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  /** True while get-users is in flight, so the table can say so. */
  loading?: boolean
  /**
   * The signed-in admin's email. The delete control is hidden on that row: the
   * backend refuses a self-delete with a 400, and offering a button that cannot
   * work is worse than not offering it. Email rather than id because the login JWT
   * carries no user id.
   */
  currentUserEmail?: string
}

const columns = ['User', 'Emails', 'Role', 'Scope', 'Actions']

/** The user registry: one row per account, with edit/delete per row. */
export function UserRegistryTable({
  users,
  onAction,
  onAddUser,
  total,
  roles,
  query,
  onQueryChange,
  roleFilter,
  onToggleRole,
  onClearRoleFilter,
  page,
  pageSize,
  onPageChange,
  loading = false,
  currentUserEmail,
}: UserRegistryTableProps) {
  const pageCount = Math.max(Math.ceil(total / pageSize), 1)
  const filtering = Boolean(query.trim()) || roleFilter.length > 0

  // No `overflow-hidden` on the section below, deliberately. It used to be there
  // for rounded corners, but it also clipped the role filter's dropdown: with a
  // full page of rows the section was tall enough to contain the panel, and with
  // the empty state it was not — so "Clear filter", the last item in it, was cut
  // off exactly when it was needed most. Nothing actually needs clipping, because
  // the table sits between the header and the footer and never reaches the corners.
  return (
    <section className="border-line bg-surface rounded-lg border">
      <header className="border-line flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
        <h2 className="text-fg text-sm font-semibold">User Registry</h2>
        {/* Wraps on a phone — the three controls are wider than the card there, and
            were spilling past its right edge. The search box takes a row of its
            own, and the filter and Add User share the next one. */}
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <SearchBox query={query} onQueryChange={onQueryChange} />
          <RoleFilter
            roles={roles}
            roleFilter={roleFilter}
            onToggleRole={onToggleRole}
            onClearRoleFilter={onClearRoleFilter}
          />
          {/* `font-medium` overrides the cta variant's bold, via twMerge in `cn`;
              `h-9` matches the search box and filter button beside it. */}
          <Button variant="cta" onClick={onAddUser} className="h-9 shrink-0 font-medium">
            <UserPlus className="size-4" />
            Add User
          </Button>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table aria-label="User Registry" className="w-full min-w-[860px] border-collapse text-sm">
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
                <td colSpan={columns.length} className="px-5 py-14">
                  <EmptyState
                    loading={loading}
                    filtering={filtering}
                    onClearFilters={() => {
                      onQueryChange('')
                      onClearRoleFilter()
                    }}
                    onAddUser={onAddUser}
                  />
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isSelf =
                  Boolean(currentUserEmail) &&
                  user.email.toLowerCase() === currentUserEmail!.toLowerCase()

                return (
                  <tr
                    key={user.id}
                    className="border-line hover:bg-surface-2 border-b transition-colors last:border-0"
                  >
                    <td className="text-fg px-5 py-4 font-medium">
                      {user.full_name}
                      {isSelf && <span className="text-fg-subtle ml-2 text-xs">(you)</span>}
                    </td>
                    <td className="text-primary-bright px-5 py-4 font-mono text-[13px]">
                      {user.email}
                    </td>
                    <td className="px-5 py-4">
                      <RolePill role={user.role} />
                    </td>
                    <td className="px-5 py-4">
                      <ScopeCell user={user} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {/* Hidden rather than disabled on the admin's own row —
                            the backend rejects a self-delete outright. */}
                        {!isSelf && (
                          <IconButton
                            label={`Delete ${user.full_name}`}
                            destructive
                            onClick={() => onAction('delete', user)}
                          >
                            <Trash2 className="size-4" />
                          </IconButton>
                        )}
                        <IconButton
                          label={`Edit ${user.full_name}`}
                          onClick={() => onAction('edit', user)}
                        >
                          <Pencil className="size-4" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <footer className="border-line flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
        <p className="text-fg-muted text-[13px]">
          Showing {users.length} of {total.toLocaleString()} users
          {filtering && <span className="text-fg-subtle"> (filtered)</span>}
        </p>
        <Pagination page={page} pageCount={pageCount} onPageChange={onPageChange} />
      </footer>
    </section>
  )
}

/**
 * What fills the table when it has no rows: still loading, filtered down to
 * nothing, or a genuinely empty registry.
 *
 * The filtered case carries its own "Clear filters" button. That is the way back
 * for someone who has searched themselves into a corner, and it used to live only
 * at the bottom of the role-filter dropdown — the one place that is awkward to
 * reach, and the place a short table used to clip off entirely.
 */
function EmptyState({
  loading,
  filtering,
  onClearFilters,
  onAddUser,
}: {
  loading: boolean
  filtering: boolean
  onClearFilters: () => void
  onAddUser: () => void
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <LoaderCircle className="text-fg-subtle size-8 animate-spin" aria-hidden />
        <p className="text-fg-muted font-mono text-sm">Loading users…</p>
      </div>
    )
  }

  const Icon = filtering ? SearchX : UsersRound

  return (
    <div className="animate-fade-in flex flex-col items-center gap-3 text-center">
      {/* A tinted disc behind the glyph, so the state reads as a deliberate piece
          of the design rather than a stray icon in an empty box. Animation is CSS
          on an inline SVG — no image to download, and it honours the reduced-motion
          rule the other animations in index.css already respect. */}
      <span
        aria-hidden
        className={cn(
          'grid size-14 place-items-center rounded-full',
          filtering ? 'bg-degraded/10 text-degraded' : 'bg-primary/10 text-primary-bright',
        )}
      >
        <Icon className="size-7" />
      </span>

      <div>
        <p className="text-fg text-sm font-semibold">
          {filtering
            ? 'No users match this search or filter'
            : 'No users have been provisioned yet'}
        </p>
        <p className="text-fg-muted mx-auto mt-1 max-w-[46ch] text-[13px] leading-relaxed">
          {filtering
            ? 'Nothing in the registry matches every active filter. Clear them to see everyone again.'
            : 'Add the first account and it will appear here, newest first.'}
        </p>
      </div>

      {filtering ? (
        <Button variant="ghost" onClick={onClearFilters} className="mt-1">
          <X className="size-4" />
          Clear filters
        </Button>
      ) : (
        <Button variant="cta" onClick={onAddUser} className="mt-1 font-medium">
          <UserPlus className="size-4" />
          Add User
        </Button>
      )}
    </div>
  )
}

/**
 * What the account's access is scoped to, which depends on its role: a department
 * (with any sub-departments beneath it), named platforms, or nothing at all for the
 * org-wide roles.
 */
function ScopeCell({ user }: { user: UserRecord }) {
  if (needsPlatforms(user.role.key)) {
    const platforms = user.platforms ?? []
    return platforms.length ? (
      <p className="text-fg-muted font-mono text-xs">{platforms.join(', ')}</p>
    ) : (
      <span className="text-fg-subtle">—</span>
    )
  }

  if (user.department) {
    const subs = user.sub_departments ?? []
    return (
      <>
        <p className="text-fg-muted">{user.department.name}</p>
        {subs.length > 0 && (
          <p className="text-fg-subtle mt-0.5 font-mono text-xs">
            {subs.map((s) => s.name).join(', ')}
          </p>
        )}
      </>
    )
  }

  // Org-wide and development-wide roles sit outside both scoping trees.
  return <span className="text-fg-subtle">—</span>
}

/** Free-text search over the registry — matched server-side on name or email. */
function SearchBox({
  query,
  onQueryChange,
}: {
  query: string
  onQueryChange: (query: string) => void
}) {
  return (
    <div className="relative w-full sm:w-auto">
      <Search className="text-fg-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <input
        type="search"
        value={query}
        aria-label="Search registry"
        placeholder="Search name or email…"
        onChange={(e) => onQueryChange(e.target.value)}
        className="border-line bg-input text-fg placeholder:text-fg-subtle focus:border-primary focus:ring-primary/20 h-9 w-full rounded-lg border pr-3 pl-9 text-sm transition-colors outline-none focus:ring-2 sm:w-64"
      />
    </div>
  )
}

/**
 * Role filter behind the header's filter icon — a checkbox dropdown, since the
 * registry mixes six clearance levels and narrowing to more than one at a time is
 * the normal case (e.g. "show me every admin tier"). Sent to get-users as `roles`.
 */
function RoleFilter({
  roles,
  roleFilter,
  onToggleRole,
  onClearRoleFilter,
}: {
  roles: Role[]
  roleFilter: RoleKey[]
  onToggleRole: (role: RoleKey) => void
  onClearRoleFilter: () => void
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  // Click-outside and Escape close it, as the dropdown isn't a native control.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const active = roleFilter.length > 0

  return (
    <div ref={root} className="relative">
      {/* Labeled pill matching the navbar's Tier / Phase filter, down to the
          inline count badge — same control, so it should read the same. */}
      <button
        type="button"
        aria-label="Filter registry by role"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-9 shrink-0 items-center gap-2 rounded-lg border bg-transparent px-3 text-sm font-medium transition-colors',
          active || open
            ? 'border-line-bright text-fg'
            : 'border-line text-fg-muted hover:border-line-bright hover:text-fg',
        )}
      >
        <SlidersHorizontal className="size-4" />
        Filter
        {active && (
          <span className="bg-primary/20 text-primary-bright grid size-4 place-items-center rounded-full font-mono text-[10px] font-bold">
            {roleFilter.length}
          </span>
        )}
      </button>

      {open && (
        <div className="border-line bg-surface absolute right-0 z-20 mt-1 w-60 rounded-lg border p-1 shadow-lg">
          <p className="text-fg-subtle px-2.5 pt-2 pb-1.5 font-mono text-[10px] font-semibold tracking-[0.08em] uppercase">
            Filter by role
          </p>
          {byRankDescending(roles).map((role) => (
            <label
              key={role.key}
              className="hover:bg-surface-3 flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2"
            >
              <input
                type="checkbox"
                checked={roleFilter.includes(role.key)}
                onChange={() => onToggleRole(role.key)}
                className="accent-primary-bright size-4"
              />
              <span className="text-fg text-[13px]">{role.name}</span>
            </label>
          ))}
          {active && (
            <button
              type="button"
              onClick={onClearRoleFilter}
              className="border-line text-fg-muted hover:text-fg mt-1 flex w-full items-center gap-1.5 border-t px-2.5 py-2 text-[13px]"
            >
              <X className="size-3.5" />
              Clear filter
            </button>
          )}
        </div>
      )}
    </div>
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
      <PageButton disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
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
