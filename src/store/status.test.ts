import { beforeEach, describe, expect, it } from 'vitest'
import { useStatusStore } from './status'

const reset = () => useStatusStore.setState({ connection: 'connecting', hasEverConnected: false, systems: {} })
const sys = () => useStatusStore.getState().systems

beforeEach(reset)

describe('applySnapshot', () => {
  it('maps canonical statuses and marks null systems as pending', () => {
    useStatusStore.getState().applySnapshot({
      aurora: { status: 'none', updated_at: '2026-07-07T14:53:11Z', payload: { response_time_ms: 12 } },
      twilio: { status: 'minor', updated_at: '2026-07-07T14:53:11Z', payload: {} },
      ringcentral: { status: 'critical', updated_at: '2026-07-07T14:53:11Z', payload: {} },
      one_portal: null, // no first check yet
    })
    expect(sys().aurora.status).toBe('healthy')
    expect(sys().twilio.status).toBe('degraded') // minor → degraded (amber)
    expect(sys().ringcentral.status).toBe('critical')
    // null → pending "waiting", never an error/red
    expect(sys().one_portal).toEqual({ status: 'vendor_silent', updatedAt: null, payload: {}, pending: true, samples: [] })
  })

  it('preserves richer existing solo state over a webhook-only snapshot value', () => {
    useStatusStore.getState().applyUpdate('solo', {
      status: 'none',
      updated_at: 't1',
      payload: { status: 'none', page_status: 'UP', http_status: 200, response_time_ms: 30 },
    })
    // Reconnect snapshot where solo is only a thin webhook payload.
    useStatusStore.getState().applySnapshot({
      solo: { updated_at: 't2', payload: { event_type: 'incident.update', last_webhook_event_at: 't2' } },
    })
    expect(sys().solo.status).toBe('healthy') // kept from richer prior state
    expect(sys().solo.payload.page_status).toBe('UP') // probe data retained
    expect(sys().solo.payload.event_type).toBe('incident.update') // webhook merged in
  })

  it('lowercases keys and skips malformed values', () => {
    useStatusStore.getState().applySnapshot({ Aurora: { status: 'none', payload: {} }, bad: 42 })
    expect(sys().aurora).toBeDefined()
    expect(sys().bad).toBeUndefined()
  })
})

describe('applyUpdate', () => {
  it('upserts a single system without touching others', () => {
    useStatusStore.getState().applySnapshot({ aurora: { status: 'none', payload: {} } })
    useStatusStore.getState().applyUpdate('cloudflare', {
      status: 'minor',
      updated_at: 't',
      payload: { platform_status: 'minor', cert_days_left: 83, domain_days_left: 389 },
    })
    expect(sys().aurora.status).toBe('healthy')
    expect(sys().cloudflare.status).toBe('degraded')
    expect(sys().cloudflare.payload.cert_days_left).toBe(83)
  })

  it('merges a solo webhook-only update into existing state, keeping prior status', () => {
    useStatusStore.getState().applyUpdate('solo', {
      status: 'none',
      updated_at: 't1',
      payload: { status: 'none', page_status: 'UP', http_status: 200 },
    })
    useStatusStore.getState().applyUpdate('solo', {
      updated_at: 't2',
      payload: { event_type: 'component.updated', last_webhook_event_at: 't2' },
    })
    const solo = sys().solo
    expect(solo.status).toBe('healthy') // preserved
    expect(solo.payload.page_status).toBe('UP') // preserved
    expect(solo.payload.event_type).toBe('component.updated') // merged
    expect(solo.updatedAt).toBe('t2') // advanced
  })

  it('maps unknown/missing status to vendor_silent (never red)', () => {
    useStatusStore.getState().applyUpdate('mystery', { status: 'wat', payload: {} })
    expect(sys().mystery.status).toBe('vendor_silent')
  })

  it('ignores updates with an empty system key', () => {
    useStatusStore.getState().applyUpdate('', { status: 'none', payload: {} })
    expect(Object.keys(sys())).toHaveLength(0)
  })
})

describe('sparkline history (samples)', () => {
  it('accumulates response_time_ms samples with timestamps, capped and ordered', () => {
    const s = useStatusStore.getState()
    s.applyUpdate('aurora', { status: 'none', updated_at: 't1', payload: { response_time_ms: 10 } })
    s.applyUpdate('aurora', { status: 'none', updated_at: 't2', payload: { response_time_ms: 20 } })
    expect(sys().aurora.samples).toEqual([
      { v: 10, t: 't1' },
      { v: 20, t: 't2' },
    ])
  })

  it('tracks services_good for RingCentral (no response_time_ms)', () => {
    useStatusStore.getState().applyUpdate('ringcentral', {
      status: 'major',
      updated_at: 't',
      payload: { services_total: 78, services_good: 77 },
    })
    expect(sys().ringcentral.samples).toEqual([{ v: 77, t: 't' }])
  })

  it('does not add a point for a webhook-only update but keeps prior history', () => {
    const s = useStatusStore.getState()
    s.applyUpdate('solo', { status: 'none', updated_at: 't1', payload: { status: 'none', http_status: 200, response_time_ms: 30 } })
    s.applyUpdate('solo', { updated_at: 't2', payload: { event_type: 'x', last_webhook_event_at: 't2' } })
    expect(sys().solo.samples).toEqual([{ v: 30, t: 't1' }])
  })
})

describe('connection state', () => {
  it('transitions connecting → open → reconnecting on drop', () => {
    const s = () => useStatusStore.getState()
    expect(s().connection).toBe('connecting')
    s().markOpen()
    expect(s().connection).toBe('open')
    s().markClosed()
    expect(s().connection).toBe('reconnecting') // drop after a good connect
  })

  it('first-ever failure is "failed", not "reconnecting"', () => {
    useStatusStore.getState().markClosed()
    expect(useStatusStore.getState().connection).toBe('failed')
  })
})
