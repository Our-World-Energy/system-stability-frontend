import { describe, expect, it } from 'vitest'
import { tiers, wiredSystemIds } from './dashboard-data'

const wiredIds = wiredSystemIds()

describe('wired systems (dashboard-data)', () => {
  it('wires exactly the 14 live SSE systems, including docusign, one_verify, tape & owedb', () => {
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
        'one_verify',
        'tape',
        'owedb',
      ]),
    )
  })

  it('exposes an Atlassian card wired to systemId "atlassian"', () => {
    const atlassian = tiers.flatMap((t) => t.services).find((s) => s.name === 'Atlassian')
    expect(atlassian?.systemId).toBe('atlassian')
  })

  it('exposes an "OWE DB" card wired to systemId "owedb" in tier 3', () => {
    const tier3 = tiers.find((t) => t.id === 'tier-3')
    const owedb = tier3?.services.find((s) => s.name === 'OWE DB')
    expect(owedb?.systemId).toBe('owedb')
  })
})
