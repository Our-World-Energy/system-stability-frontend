import { create } from 'zustand'
import type { ServiceStatus } from '@/lib/dashboard-data'
import { mapStatus, normalizePayload } from '@/lib/ws-status'

export type ConnectionState = 'connecting' | 'open' | 'reconnecting' | 'failed'

export interface LiveSystem {
  status: ServiceStatus
  updatedAt: string | null
  payload: Record<string, unknown>
  /** True until the system's first health check completes (snapshot value was null). */
  pending?: boolean
}

/** Raw per-system frame shape shared by initial_snapshot values and status_update events. */
interface SystemFrame {
  status?: unknown
  updated_at?: string | null
  payload?: unknown
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
  applyUpdate: (system: string, msg: SystemFrame) => void
}

const WEBHOOK_META_KEYS = ['event_type', 'last_webhook_event_at']

/**
 * A "webhook-only" payload carries event metadata (e.g. Solo's webhook pushes)
 * but none of the probe/status fields a full health check produces. These must
 * be *merged* into existing card state, never replace the richer probe data.
 */
function isWebhookOnly(payload: Record<string, unknown>): boolean {
  const hasMeta = WEBHOOK_META_KEYS.some((k) => k in payload)
  if (!hasMeta) return false
  return payload.status === undefined && payload.page_status === undefined && payload.http_status === undefined
}

/** Build the LiveSystem for one incoming frame, merging webhook-only payloads into prior state. */
function foldFrame(prev: LiveSystem | undefined, frame: SystemFrame): LiveSystem {
  const incoming = normalizePayload(frame.payload)
  if (prev && isWebhookOnly(incoming)) {
    // Keep prior status/probe data; layer the webhook metadata on top.
    return {
      status: prev.status,
      updatedAt: frame.updated_at ?? prev.updatedAt,
      payload: { ...prev.payload, ...incoming },
      pending: false,
    }
  }
  return {
    status: mapStatus(frame.status),
    updatedAt: frame.updated_at ?? null,
    payload: incoming,
    pending: false,
  }
}

export const useStatusStore = create<StatusState>((set) => ({
  connection: 'connecting',
  hasEverConnected: false,
  systems: {},

  setConnecting: () => set((s) => ({ connection: s.hasEverConnected ? 'reconnecting' : 'connecting' })),
  markOpen: () => set({ connection: 'open', hasEverConnected: true }),
  // First-ever failure → "failed"; a drop after a successful connect → "reconnecting".
  markClosed: () => set((s) => ({ connection: s.hasEverConnected ? 'reconnecting' : 'failed' })),

  // initial_snapshot replaces the whole map. A system value of `null` means the
  // backend hasn't run its first check yet → render as pending ("waiting"), not
  // an error. Richer existing state is preserved when the snapshot value is a
  // thin webhook-only payload (e.g. Solo mid-stream reconnect).
  applySnapshot: (systems) =>
    set((s) => {
      const next: Record<string, LiveSystem> = {}
      if (systems && typeof systems === 'object') {
        for (const [rawKey, val] of Object.entries(systems as Record<string, unknown>)) {
          const key = rawKey.toLowerCase()
          if (val == null) {
            next[key] = { status: 'vendor_silent', updatedAt: null, payload: {}, pending: true }
            continue
          }
          if (typeof val !== 'object') continue // malformed → skip safely
          next[key] = foldFrame(s.systems[key], val as SystemFrame)
        }
      }
      return { systems: next }
    }),

  applyUpdate: (system, msg) => {
    const key = String(system ?? '').toLowerCase()
    if (!key) return
    set((s) => ({
      systems: { ...s.systems, [key]: foldFrame(s.systems[key], msg ?? {}) },
    }))
  },
}))
