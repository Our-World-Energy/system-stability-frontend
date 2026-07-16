import { describe, expect, it } from 'vitest'
import { tiers } from './dashboard-data'

const wiredIds = tiers
  .flatMap((t) => t.services)
  .map((s) => s.systemId)
  .filter((id): id is string => !!id)

describe('wired systems (dashboard-data)', () => {
  it('wires exactly the 11 live SSE systems, including sendgrid, autodesk & docusign', () => {
    expect(new Set(wiredIds)).toEqual(
      new Set([
        'aurora',
        'solo',
        'one_portal',
        'twentyi',
        'twilio',
        'cloudflare',
        'ringcentral',
        'atlassian',
        'sendgrid',
        'autodesk',
        'docusign',
      ]),
    )
  })

  it('exposes an Atlassian card wired to systemId "atlassian"', () => {
    const atlassian = tiers.flatMap((t) => t.services).find((s) => s.name === 'Atlassian')
    expect(atlassian?.systemId).toBe('atlassian')
  })
})
