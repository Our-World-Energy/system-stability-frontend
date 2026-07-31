import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutGrid,
  KeyRound,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Users,
  X,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navItems, activeNavItem } from '@/lib/navigation'
import { useSidebarStore } from '@/store/sidebar'
import { useAuthStore } from '@/store/auth'
import logoUrl from '@/assets/Logo.svg'

// Only Overview, Users and Credentials are exposed for now; other routes still exist but are hidden.
// The two Credential entries are the Requester catalog and the Admin console — later
// only one will show, chosen by the signed-in user's role.
//
// Each item owns its active-state test because the paths overlap: `/credentials`
// is a prefix of `/credentials/admin`, so a plain prefix match would light both.
// Requester stays active on its sub-routes (e.g. /credentials/logs) but yields the
// whole /credentials/admin subtree to the Admin entry.
const navItems: {
  to: string
  icon: typeof LayoutGrid
  label: string
  isActive: (path: string) => boolean
}[] = [
  { to: '/', icon: LayoutGrid, label: 'Overview', isActive: (p) => p === '/' },
  { to: '/users', icon: Users, label: 'Users', isActive: (p) => p.startsWith('/users') },
  {
    to: '/credentials',
    icon: KeyRound,
    label: 'Credentials',
    isActive: (p) =>
      p === '/credentials' ||
      (p.startsWith('/credentials/') && !p.startsWith('/credentials/admin')),
  },
  {
    to: '/credentials/admin',
    icon: ShieldCheck,
    label: 'Credential Admin',
    isActive: (p) => p === '/credentials/admin' || p.startsWith('/credentials/admin/'),
  },
]

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn('flex h-16 items-center gap-3 px-4', collapsed && 'justify-center px-0')}>
      <img src={logoUrl} alt="Our World Energy" className="size-10 shrink-0" />
      {!collapsed && (
        <div className="overflow-hidden">
          <p className="text-fg truncate text-sm leading-tight font-bold">OWE</p>
          <p className="text-fg-muted truncate font-mono text-[10px] tracking-[0.12em] uppercase">
            Our World Energy
          </p>
        </div>
      )}
    </div>
  )
}

function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { pathname } = useLocation()
  const active = activeNavItem(pathname)

  return (
    <nav className="flex-1 overflow-x-hidden overflow-y-auto py-3">
      <ul className="space-y-0.5 px-2">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = active?.to === to
          return (
            <li key={to}>
              <NavLink
                to={to}
                onClick={onNavigate}
                title={collapsed ? label : undefined}
                className={cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary-bright'
                    : 'text-fg-muted hover:bg-surface hover:text-fg',
                  collapsed && 'justify-center px-0',
                )}
              >
                {isActive && (
                  <span className="bg-primary-bright absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-r" />
                )}
                <Icon className="size-5 shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Initials for the avatar: first letters of the first two words, or an email's stem. */
function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function UserChip({ collapsed }: { collapsed: boolean }) {
  const navigate = useNavigate()
  const { token, user, signOut } = useAuthStore()

  // Placeholder identity until a session exists — the auth backend isn't wired yet.
  const name = user?.name ?? user?.email ?? 'Alex Chan'
  const role = user?.role ?? 'Grid Operations'

  const handleSignOut = () => {
    signOut()
    navigate('/login', { replace: true })
  }

  const signOutButton = (
    <button
      onClick={handleSignOut}
      title="Sign out"
      aria-label="Sign out"
      className="text-fg-muted hover:bg-surface hover:text-fg grid size-8 shrink-0 place-items-center rounded-lg transition-colors"
    >
      <LogOut className="size-4" />
    </button>
  )

  return (
    <div
      className={cn('border-line border-t p-3', collapsed && 'flex flex-col items-center gap-2')}
    >
      <div className={cn('flex items-center gap-3', collapsed && 'gap-0')}>
        <div className="bg-primary/15 text-primary-bright flex size-9 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold">
          {initialsOf(name)}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-fg truncate text-sm leading-tight font-medium">{name}</p>
            <p className="text-fg-muted truncate text-xs leading-tight">{role}</p>
          </div>
        )}
        {!collapsed && token && signOutButton}
      </div>
      {collapsed && token && signOutButton}
    </div>
  )
}

export function Sidebar() {
  const { collapsed, toggle, mobileOpen, closeMobile } = useSidebarStore()

  return (
    <>
      {/* Desktop rail — in-flow, collapsible */}
      <aside
        className={cn(
          'border-line bg-sidebar relative hidden shrink-0 flex-col border-r transition-[width] duration-300 ease-in-out lg:flex',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <Brand collapsed={collapsed} />
        <NavList collapsed={collapsed} />
        <button
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'border-line text-fg-muted hover:bg-surface hover:text-fg flex h-10 items-center border-t transition-colors',
            collapsed ? 'justify-center' : 'justify-end gap-2 px-4',
          )}
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <>
              <span className="text-xs font-medium">Collapse</span>
              <ChevronLeft className="size-4" />
            </>
          )}
        </button>
        <UserChip collapsed={collapsed} />
      </aside>

      {/* Mobile drawer — off-canvas overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 lg:hidden',
          mobileOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          onClick={closeMobile}
          className={cn(
            'absolute inset-0 bg-black/60 transition-opacity duration-300',
            mobileOpen ? 'opacity-100' : 'opacity-0',
          )}
        />
        <aside
          className={cn(
            'border-line bg-sidebar absolute inset-y-0 left-0 flex w-64 flex-col border-r shadow-2xl transition-transform duration-300 ease-in-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex items-center justify-between pr-2">
            <Brand collapsed={false} />
            <button
              onClick={closeMobile}
              aria-label="Close menu"
              className="text-fg-muted hover:bg-surface hover:text-fg grid size-9 place-items-center rounded-lg transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>
          <NavList collapsed={false} onNavigate={closeMobile} />
          <UserChip collapsed={false} />
        </aside>
      </div>
    </>
  )
}
