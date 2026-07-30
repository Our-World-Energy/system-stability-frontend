import { create } from 'zustand'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'theme'

/** Resolve the startup theme: stored choice → OS preference → dark. */
function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

/** Reflect the theme onto <html data-theme> so the CSS token overrides take effect. */
function apply(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

/**
 * Apply the initial theme immediately (called from main.tsx before render) so
 * there's no flash of the wrong palette on first paint.
 */
export function initTheme() {
  apply(getInitialTheme())
}

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    apply(theme)
    localStorage.setItem(STORAGE_KEY, theme)
    set({ theme })
  },
  toggle: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
}))
