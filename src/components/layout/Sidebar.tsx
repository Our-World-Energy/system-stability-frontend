import { NavLink, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navItems, activeNavItem } from '@/lib/navigation'
import { useSidebarStore } from '@/store/sidebar'
import logoUrl from '@/assets/Logo.svg'

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

function UserChip({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn('border-line border-t p-3', collapsed && 'flex justify-center')}>
      <div className={cn('flex items-center gap-3', collapsed && 'gap-0')}>
        <div className="bg-primary/15 text-primary-bright flex size-9 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold">
          AC
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-fg truncate text-sm leading-tight font-medium">Alex Chan</p>
            <p className="text-fg-muted truncate text-xs leading-tight">Grid Operations</p>
          </div>
        )}
      </div>
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
