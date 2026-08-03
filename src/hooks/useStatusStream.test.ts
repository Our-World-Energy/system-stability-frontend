import { beforeEach, describe, expect, it } from 'vitest'
import { attachStatusStream, type EventSourceLike } from './useStatusStream'
import { useStatusStore } from '@/store/status'

class MockEventSource implements EventSourceLike {
  static CLOSED = 2
  readyState = 0 // CONNECTING
  closed = false
  onopen: ((ev: Event) => void) | null = null
  onerror: ((ev: Event) => void) | null = null
  private listeners: Record<string, ((ev: MessageEvent) => void)[]> = {}

  addEventListener(type: string, listener: (ev: MessageEvent) => void) {
    ;(this.listeners[type] ??= []).push(listener)
  }
  close() {
    this.closed = true
    this.readyState = MockEventSource.CLOSED
  }
  // Test helpers
  open() {
    this.readyState = 1
    this.onopen?.(new Event('open'))
  }
  emit(type: string, data: unknown) {
    const ev = { data: JSON.stringify(data) } as MessageEvent
    for (const l of this.listeners[type] ?? []) l(ev)
  }
  error(readyState: number) {
    this.readyState = readyState
    this.onerror?.(new Event('error'))
  }
}

const reset = () =>
  useStatusStore.setState({ connection: 'connecting', hasEverConnected: false, systems: {} })
const store = () => useStatusStore.getState()

beforeEach(reset)

describe('attachStatusStream', () => {
  it('applies initial_snapshot and status_update from named events', () => {
    const es = new MockEventSource()
    attachStatusStream(es, store())
    es.open()

    es.emit('initial_snapshot', {
      type: 'initial_snapshot',
      systems: {
        aurora: { status: 'none', updated_at: 't', payload: { response_time_ms: 9 } },
        cloudflare: null,
      },
    })
    expect(store().systems.aurora.status).toBe('healthy')
    expect(store().systems.cloudflare.pending).toBe(true) // null → waiting

    es.emit('status_update', {
      type: 'status_update',
      system: 'ringcentral',
      status: 'major',
      updated_at: 't',
      payload: { services_total: 78, services_good: 77 },
    })
    expect(store().systems.ringcentral.status).toBe('degraded') // major → amber
    expect(store().systems.ringcentral.payload.services_good).toBe(77)
  })

  it('re-applies initial_snapshot on reconnect (state self-heals)', () => {
    const es = new MockEventSource()
    attachStatusStream(es, store())
    es.open()
    es.emit('initial_snapshot', { systems: { aurora: { status: 'critical', payload: {} } } })
    expect(store().systems.aurora.status).toBe('critical')
    // Server resends snapshot on reconnect with fresh state.
    es.emit('initial_snapshot', { systems: { aurora: { status: 'none', payload: {} } } })
    expect(store().systems.aurora.status).toBe('healthy')
  })

  it('mirrors connection state and reconnects vs. fails correctly', () => {
    const es = new MockEventSource()
    attachStatusStream(es, store())
    expect(store().connection).toBe('connecting')
    es.open()
    expect(store().connection).toBe('open')
    es.error(0) // transient drop, EventSource still CONNECTING
    expect(store().connection).toBe('reconnecting')
  })

  it('ignores malformed frames without throwing', () => {
    const es = new MockEventSource()
    attachStatusStream(es, store())
    const bad = { data: '{not json' } as MessageEvent
    expect(() =>
      (es as unknown as { listeners: Record<string, ((e: MessageEvent) => void)[]> }).listeners[
        'status_update'
      ][0](bad),
    ).not.toThrow()
    expect(Object.keys(store().systems)).toHaveLength(0)
  })

  it('closes the EventSource on teardown', () => {
    const es = new MockEventSource()
    const teardown = attachStatusStream(es, store())
    teardown()
    expect(es.closed).toBe(true)
  })
})
