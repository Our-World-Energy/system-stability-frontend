import { create } from 'zustand'
import type { ServiceStatus } from '@/lib/dashboard-data'
import { mapStatus, normalizePayload } from '@/lib/ws-status'

export type ConnectionState = 'connecting' | 'open' | 'reconnecting' | 'failed'

export interface LiveSystem {
  status: ServiceStatus
  updatedAt: string | null
  payload: Record<string, unknown>
}

interface StatusState {
  connection: ConnectionState
  hasEverConnected: boolean
  /** Live system state keyed by lowercased system id (e.g. "aurora"). */
  systems: Record<string, LiveSystem>
  setConnecting: () => void
  markOpen: () => void
  markClosed: () => void
  applySnapshot: (systems: unknown) => void
  applyUpdate: (system: string, msg: { status?: unknown; updated_at?: string | null; payload?: unknown }) => void
}

export const useStatusStore = create<StatusState>((set) => ({
  connection: 'connecting',
  hasEverConnected: false,
  systems: {},

  setConnecting: () => set((s) => ({ connection: s.hasEverConnected ? 'reconnecting' : 'connecting' })),
  markOpen: () => set({ connection: 'open', hasEverConnected: true }),
  // First-ever failure → "failed" (spec #8: render systems as vendor_silent).
  // A drop after a successful connection → "reconnecting".
  markClosed: () => set((s) => ({ connection: s.hasEverConnected ? 'reconnecting' : 'failed' })),

  applySnapshot: (systems) => {
    const next: Record<string, LiveSystem> = {}
    if (systems && typeof systems === 'object') {
      for (const [key, val] of Object.entries(systems as Record<string, unknown>)) {
        if (!val || typeof val !== 'object') continue // null/invalid system → skip safely
        const v = val as { status?: unknown; updated_at?: string | null; payload?: unknown }
        next[key.toLowerCase()] = {
          status: mapStatus(v.status),
          updatedAt: v.updated_at ?? null,
          payload: normalizePayload(v.payload),
        }
      }
    }
    set({ systems: next })
  },

  applyUpdate: (system, msg) => {
    const key = String(system ?? '').toLowerCase()
    if (!key) return
    set((s) => ({
      systems: {
        ...s.systems,
        [key]: {
          status: mapStatus(msg?.status),
          updatedAt: msg?.updated_at ?? null,
          payload: normalizePayload(msg?.payload),
        },
      },
    }))
  },
}))
