import { NavLink } from 'react-router-dom'
import { Zap, LayoutGrid, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/store/sidebar'

// Only Overview is exposed for now; the other routes still exist but are hidden.
const navItems = [{ to: '/', icon: LayoutGrid, label: 'Overview' }]

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn('flex h-16 items-center gap-3 px-4', collapsed && 'justify-center px-0')}>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-[0.25rem] bg-primary">
        <Zap className="size-5 fill-[#003915] text-[#003915]" />
      </div>
      {!collapsed && (
        <div className="overflow-hidden">
          <p className="truncate text-sm font-bold leading-tight text-fg">OWE</p>
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted">
            Our World Energy
          </p>
        </div>
      )}
    </div>
  )
}

function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
      <ul className="space-y-0.5 px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              onClick={onNavigate}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary-bright'
                    : 'text-fg-muted hover:bg-surface hover:text-fg',
                  collapsed && 'justify-center px-0',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary-bright" />
                  )}
                  <Icon className="size-5 shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function UserChip({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn('border-t border-line p-3', collapsed && 'flex justify-center')}>
      <div className={cn('flex items-center gap-3', collapsed && 'gap-0')}>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-bold text-primary-bright">
          AC
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight text-fg">Alex Chan</p>
            <p className="truncate text-xs leading-tight text-fg-muted">Grid Operations</p>
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
          'relative hidden shrink-0 flex-col border-r border-line bg-sidebar transition-[width] duration-300 ease-in-out lg:flex',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <Brand collapsed={collapsed} />
        <NavList collapsed={collapsed} />
        <button
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex h-10 items-center border-t border-line text-fg-muted transition-colors hover:bg-surface hover:text-fg',
            collapsed ? 'justify-center' : 'justify-end px-4 gap-2',
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
            'absolute inset-y-0 left-0 flex w-64 flex-col border-r border-line bg-sidebar shadow-2xl transition-transform duration-300 ease-in-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex items-center justify-between pr-2">
            <Brand collapsed={false} />
            <button
              onClick={closeMobile}
              aria-label="Close menu"
              className="grid size-9 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-surface hover:text-fg"
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
