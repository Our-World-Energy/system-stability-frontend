import { describe, expect, it } from 'vitest'
import {
  buildCredentialAuditLogPayload,
  buildCreateCredentialPayload,
  buildRotatePayload,
  emptyCredentialDraft,
  emptyRotateDraft,
  extractSecretEnvelope,
  hasErrors,
  normalizeTag,
  validateCredentialDraft,
  validateRotateDraft,
} from './credentials'
import type { CredentialDraft, RotateCredentialDraft } from './credentials'

describe('buildCredentialAuditLogPayload', () => {
  it('uses the API pagination defaults and omits an unset action', () => {
    expect(buildCredentialAuditLogPayload()).toEqual({ page: 1, page_size: 50 })
  })

  it('maps page size and action to the documented wire keys', () => {
    expect(buildCredentialAuditLogPayload({ page: 2, pageSize: 25, action: 'viewed' })).toEqual({
      page: 2,
      page_size: 25,
      action: 'viewed',
    })
  })
})

/** A draft that passes validation, so each test can break exactly one thing. */
function validDraft(overrides: Partial<CredentialDraft> = {}): CredentialDraft {
  return {
    ...emptyCredentialDraft(),
    name: 'aws-root-console',
    username: 'admin@ourworldenergy.com',
    secret: 'correct-horse-battery',
    url: 'https://console.aws.amazon.com',
    platformId: 2,
    platformOther: '',
    departmentId: 3,
    isDev: false,
    tags: ['aws', 'production'],
    twoFactorType: 'totp',
    twoFactorApprover: 'raj@ourworldenergy.com',
    elevationDurationSeconds: 3600,
    autoGrant: false,
    notes: 'Root console credential, requires approval',
    ...overrides,
  }
}

describe('validateCredentialDraft', () => {
  it('accepts a complete draft', () => {
    expect(validateCredentialDraft(validDraft())).toEqual({})
  })

  it('requires a name and a secret', () => {
    const errors = validateCredentialDraft(validDraft({ name: '   ', secret: '' }))
    expect(errors.name).toBeDefined()
    expect(errors.secret).toBeDefined()
    expect(hasErrors(errors)).toBe(true)
  })

  it('accepts a short secret — a vault holds PINs and API keys too', () => {
    expect(validateCredentialDraft(validDraft({ secret: '1234' }))).toEqual({})
  })

  it('only accepts http(s) URLs, and treats a blank one as omitted', () => {
    expect(validateCredentialDraft(validDraft({ url: '' })).url).toBeUndefined()
    expect(validateCredentialDraft(validDraft({ url: 'console.aws.amazon.com' })).url).toBeDefined()
    expect(validateCredentialDraft(validDraft({ url: 'javascript:alert(1)' })).url).toBeDefined()
  })

  it('requires an approver email once a second factor is chosen', () => {
    expect(
      validateCredentialDraft(validDraft({ twoFactorApprover: '' })).twoFactorApprover,
    ).toBeDefined()
    expect(
      validateCredentialDraft(validDraft({ twoFactorApprover: 'Sarah Jenkins' })).twoFactorApprover,
    ).toBeDefined()
  })

  it('ignores the approver when there is no second factor', () => {
    const errors = validateCredentialDraft(
      validDraft({ twoFactorType: 'none', twoFactorApprover: '' }),
    )
    expect(errors.twoFactorApprover).toBeUndefined()
  })

  it('rejects a non-positive elevation window', () => {
    expect(
      validateCredentialDraft(validDraft({ elevationDurationSeconds: 0 })).elevationDurationSeconds,
    ).toBeDefined()
  })
})

describe('buildCreateCredentialPayload', () => {
  it('maps a draft onto the documented wire contract', () => {
    const payload = buildCreateCredentialPayload(validDraft(), 'owe.v1.k.i.c')

    expect(payload).toEqual({
      name: 'aws-root-console',
      username: 'admin@ourworldenergy.com',
      encrypted_secret: 'owe.v1.k.i.c',
      url: 'https://console.aws.amazon.com',
      platform_id: 2,
      platform_other: '',
      department_id: 3,
      is_dev: false,
      tags: ['aws', 'production'],
      two_factor_type: 'totp',
      two_factor_approver: 'raj@ourworldenergy.com',
      elevation_duration_seconds: 3600,
      auto_grant: false,
      notes: 'Root console credential, requires approval',
    })
  })

  it('never carries the plaintext secret', () => {
    const payload = buildCreateCredentialPayload(validDraft(), 'owe.v1.k.i.c')
    expect(JSON.stringify(payload)).not.toContain('correct-horse-battery')
    expect(payload).not.toHaveProperty('secret')
  })

  it('sends the off-form fields at their defaults', () => {
    // tags / elevation / auto-grant have no control on the modal, so an untouched
    // draft must still produce the keys the Go handler binds.
    const payload = buildCreateCredentialPayload(emptyCredentialDraft(), 'owe.v1.k.i.c')
    expect(payload.tags).toEqual([])
    expect(payload.elevation_duration_seconds).toBe(3600)
    expect(payload.auto_grant).toBe(false)
    // The new optional fields ride along at their empty defaults, so an untouched
    // form reproduces the original create exactly.
    expect(payload.platform_id).toBeNull()
    expect(payload.platform_other).toBe('')
    expect(payload.department_id).toBeNull()
    expect(payload.is_dev).toBe(false)
  })

  it('sends platform_id and blanks platform_other for a catalog pick', () => {
    const payload = buildCreateCredentialPayload(
      // A stale free-text value must not leak once a catalog id is chosen.
      validDraft({ platformId: 5, platformOther: 'ignored' }),
      'owe.v1.k.i.c',
    )
    expect(payload.platform_id).toBe(5)
    expect(payload.platform_other).toBe('')
  })

  it('sends a trimmed platform_other with a null platform_id for "Other"', () => {
    const payload = buildCreateCredentialPayload(
      validDraft({ platformId: null, platformOther: '  Internal DevOps  ', isDev: true }),
      'owe.v1.k.i.c',
    )
    expect(payload.platform_id).toBeNull()
    expect(payload.platform_other).toBe('Internal DevOps')
    expect(payload.is_dev).toBe(true)
  })

  it('trims free text and normalises tags', () => {
    const payload = buildCreateCredentialPayload(
      validDraft({
        name: '  aws-root-console  ',
        notes: '  spaced  ',
        tags: ['AWS', ' aws ', 'Production', ''],
      }),
      'owe.v1.k.i.c',
    )
    expect(payload.name).toBe('aws-root-console')
    expect(payload.notes).toBe('spaced')
    expect(payload.tags).toEqual(['aws', 'production'])
  })

  it('drops a stale approver when the second factor is turned off', () => {
    const payload = buildCreateCredentialPayload(
      validDraft({ twoFactorType: 'none', twoFactorApprover: 'raj@ourworldenergy.com' }),
      'owe.v1.k.i.c',
    )
    expect(payload.two_factor_type).toBe('none')
    expect(payload.two_factor_approver).toBe('')
  })
})

describe('rotate', () => {
  const rotateDraft = (overrides: Partial<RotateCredentialDraft> = {}): RotateCredentialDraft => ({
    ...emptyRotateDraft('cred-uuid'),
    secret: 'new-secret-value',
    confirmSecret: 'new-secret-value',
    ...overrides,
  })

  it('accepts a secret-only rotation', () => {
    expect(validateRotateDraft(rotateDraft())).toEqual({})
  })

  it('requires the new secret to be typed twice', () => {
    expect(validateRotateDraft(rotateDraft({ confirmSecret: 'typo' })).confirmSecret).toBeDefined()
    expect(validateRotateDraft(rotateDraft({ secret: '', confirmSecret: '' })).secret).toBeDefined()
  })

  it('sends only the secret when no metadata was amended', () => {
    // Blank means "leave alone" on this endpoint — sending an empty string would
    // wipe the stored value instead.
    expect(buildRotatePayload(rotateDraft(), 'owe.v1.k.i.c')).toEqual({
      id: 'cred-uuid',
      encrypted_secret: 'owe.v1.k.i.c',
    })
  })

  it('includes only the amendments that were actually filled in', () => {
    const payload = buildRotatePayload(
      rotateDraft({ url: ' https://new-url.com ', notes: '  Rotated after incident  ' }),
      'owe.v1.k.i.c',
    )
    expect(payload).toEqual({
      id: 'cred-uuid',
      encrypted_secret: 'owe.v1.k.i.c',
      url: 'https://new-url.com',
      notes: 'Rotated after incident',
    })
  })

  it('sends the second factor as a pair once it is changed', () => {
    const payload = buildRotatePayload(
      rotateDraft({ twoFactorType: 'sms', twoFactorApprover: 'jane@company.com' }),
      'owe.v1.k.i.c',
    )
    expect(payload.two_factor_type).toBe('sms')
    expect(payload.two_factor_approver).toBe('jane@company.com')
  })

  it('clears the approver when the second factor is turned off', () => {
    const payload = buildRotatePayload(
      rotateDraft({ twoFactorType: 'none', twoFactorApprover: 'jane@company.com' }),
      'owe.v1.k.i.c',
    )
    expect(payload.two_factor_type).toBe('none')
    expect(payload.two_factor_approver).toBe('')
  })

  it('demands an approver email when switching to a real second factor', () => {
    expect(
      validateRotateDraft(rotateDraft({ twoFactorType: 'totp', twoFactorApprover: '' }))
        .twoFactorApprover,
    ).toBeDefined()
  })
})

describe('extractSecretEnvelope', () => {
  const envelope = 'owe.v1.wrapped.iv.ciphertext'

  it('accepts every shape the unbuilt reveal route might answer with', () => {
    // The endpoint does not exist yet, so this deliberately does not bet on one
    // response shape.
    expect(extractSecretEnvelope(envelope)).toBe(envelope)
    expect(extractSecretEnvelope({ encrypted_secret: envelope })).toBe(envelope)
    expect(extractSecretEnvelope({ secret: envelope })).toBe(envelope)
    expect(extractSecretEnvelope({ id: 'x', name: 'y', encrypted_secret: envelope })).toBe(envelope)
  })

  it('trims incidental whitespace', () => {
    expect(extractSecretEnvelope(`  ${envelope}  `)).toBe(envelope)
  })

  it('returns null when there is no secret to open', () => {
    for (const empty of [null, undefined, '', '   ', {}, { encrypted_secret: '' }, 42]) {
      expect(extractSecretEnvelope(empty)).toBeNull()
    }
  })
})

describe('normalizeTag', () => {
  it('trims, lowercases and caps length', () => {
    expect(normalizeTag('  Production  ')).toBe('production')
    expect(normalizeTag('   ')).toBe('')
    expect(normalizeTag('x'.repeat(50))).toHaveLength(32)
  })
})
