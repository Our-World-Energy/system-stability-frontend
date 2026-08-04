import { describe, expect, it } from 'vitest'
import { extractPendingStats, frameData, splitSseFrames } from './pending-stats-stream'

describe('splitSseFrames', () => {
  it('separates complete frames and keeps the trailing partial back', () => {
    const { frames, rest } = splitSseFrames('data: a\n\ndata: b\n\ndata: c')
    expect(frames).toEqual(['data: a', 'data: b'])
    expect(rest).toBe('data: c')
  })

  it('handles CRLF frame delimiters', () => {
    const { frames, rest } = splitSseFrames('data: a\r\n\r\ndata: b')
    expect(frames).toEqual(['data: a'])
    expect(rest).toBe('data: b')
  })

  it('returns no complete frames when nothing is terminated yet', () => {
    const { frames, rest } = splitSseFrames('data: partial')
    expect(frames).toEqual([])
    expect(rest).toBe('data: partial')
  })
})

describe('frameData', () => {
  it('strips the single optional space after the colon', () => {
    expect(frameData('data: {"total_pending":3}')).toBe('{"total_pending":3}')
    expect(frameData('data:{"total_pending":3}')).toBe('{"total_pending":3}')
  })

  it('joins multiple data lines with a newline', () => {
    expect(frameData('data: line1\ndata: line2')).toBe('line1\nline2')
  })

  it('ignores comment/heartbeat frames and event names', () => {
    expect(frameData(': keep-alive')).toBeNull()
    expect(frameData('event: stats')).toBeNull()
  })
})

describe('extractPendingStats', () => {
  const full = { total_pending: 7, avg_wait_minutes: 12.5, sla_compliance_percent: 98 }

  it('reads a bare stats frame', () => {
    expect(extractPendingStats(JSON.stringify(full))).toEqual(full)
  })

  it('reads the enveloped shape the REST routes use', () => {
    expect(extractPendingStats(JSON.stringify({ status: 200, message: 'ok', data: full }))).toEqual(
      full,
    )
  })

  it('fills zeros for omitted fields', () => {
    expect(extractPendingStats(JSON.stringify({ total_pending: 4 }))).toEqual({
      total_pending: 4,
      avg_wait_minutes: 0,
      sla_compliance_percent: 0,
    })
  })

  it('returns null on malformed JSON rather than throwing', () => {
    expect(extractPendingStats('not json')).toBeNull()
    expect(extractPendingStats('42')).toBeNull()
  })
})
