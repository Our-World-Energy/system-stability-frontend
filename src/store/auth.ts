import { create } from 'zustand'
import type { AuthUser } from '@/lib/auth-api'
import { TOKEN_KEY, USER_KEY, clearStoredSession } from '@/lib/auth-storage'

interface AuthState {
  token: string | null
  user: AuthUser | null
  signIn: (token: string, user?: AuthUser | null) => void
  signOut: () => void
}

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null // Corrupt entry — treat as "no cached profile".
  }
}

/*
  Deliberately not using zustand's `persist`: the axios request interceptor reads
  localStorage's `token` key directly, so localStorage stays the single source of
  truth and the store writes through to it. Two persisted copies would drift.
*/
export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: readStoredUser(),

  signIn: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token)
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
    set({ token, user: user ?? null })
  },

  signOut: () => {
    clearStoredSession()
    set({ token: null, user: null })
  },
}))
