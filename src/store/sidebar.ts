import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarState {
  /** Desktop: collapsed to icon-only rail. Persisted. */
  collapsed: boolean
  toggle: () => void
  /** Mobile: off-canvas drawer open. Not persisted. */
  mobileOpen: boolean
  openMobile: () => void
  closeMobile: () => void
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
      mobileOpen: false,
      openMobile: () => set({ mobileOpen: true }),
      closeMobile: () => set({ mobileOpen: false }),
    }),
    { name: 'sidebar-state', partialize: (s) => ({ collapsed: s.collapsed }) },
  ),
)
