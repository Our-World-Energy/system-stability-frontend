import { describe, expect, it } from 'vitest'
import {
  buildReviewRotationRequestPayload,
  buildSubmitRequestPayload,
  emptyAccessRequestDraft,
  hasRequestErrors,
  validateAccessRequest,
} from './requests'
import type { AccessRequestDraft } from './requests'

function validDraft(overrides: Partial<AccessRequestDraft> = {}): AccessRequestDraft {
  return {
    ...emptyAccessRequestDraft('cred-uuid'),
    justification: 'Need access to deploy hotfix to production',
    ...overrides,
  }
}

describe('validateAccessRequest', () => {
  it('accepts a complete draft', () => {
    expect(validateAccessRequest(validDraft())).toEqual({})
  })

  it('requires a credential and a substantive justification', () => {
    const errors = validateAccessRequest(validDraft({ credentialId: '', justification: '' }))
    expect(errors.credentialId).toBeDefined()
    expect(errors.justification).toBeDefined()
    expect(hasRequestErrors(errors)).toBe(true)
  })

  it('rejects a justification too short to be a reason', () => {
    expect(
      validateAccessRequest(validDraft({ justification: 'need it' })).justification,
    ).toBeDefined()
  })

  it('requires the beneficiary email when acting on behalf of someone', () => {
    const errors = validateAccessRequest(
      validDraft({ reasonCategory: 'on_behalf', beneficiaryEmail: '' }),
    )
    expect(errors.beneficiaryEmail).toBeDefined()
  })

  it('leaves the beneficiary optional for every other reason', () => {
    expect(
      validateAccessRequest(validDraft({ reasonCategory: 'deployment', beneficiaryEmail: '' }))
        .beneficiaryEmail,
    ).toBeUndefined()
  })

  it('still validates a beneficiary that was given voluntarily', () => {
    expect(
      validateAccessRequest(validDraft({ beneficiaryEmail: 'Jordan Smith' })).beneficiaryEmail,
    ).toBeDefined()
  })
})

describe('buildSubmitRequestPayload', () => {
  it('maps the draft onto the documented contract', () => {
    const payload = buildSubmitRequestPayload(
      validDraft({ reasonCategory: 'deployment', beneficiaryEmail: 'contractor@external.com' }),
    )
    expect(payload).toEqual({
      credential_id: 'cred-uuid',
      reason_category: 'deployment',
      justification: 'Need access to deploy hotfix to production',
      beneficiary_email: 'contractor@external.com',
    })
  })

  it('omits the beneficiary entirely rather than sending an empty string', () => {
    const payload = buildSubmitRequestPayload(validDraft({ beneficiaryEmail: '   ' }))
    expect(payload).not.toHaveProperty('beneficiary_email')
  })
})

describe('buildReviewRotationRequestPayload', () => {
  it('keeps the approval payload unchanged', () => {
    expect(buildReviewRotationRequestPayload('rotation-1', 'approve')).toEqual({
      request_id: 'rotation-1',
      action: 'approve',
    })
  })

  it('includes a trimmed denial_reason when denying', () => {
    expect(
      buildReviewRotationRequestPayload('rotation-1', 'deny', '  Secret does not meet policy.  '),
    ).toEqual({
      request_id: 'rotation-1',
      action: 'deny',
      denial_reason: 'Secret does not meet policy.',
    })
  })

  it('rejects a denial without a reason before calling the API', () => {
    expect(() => buildReviewRotationRequestPayload('rotation-1', 'deny', '   ')).toThrow(/reason/i)
  })
})
