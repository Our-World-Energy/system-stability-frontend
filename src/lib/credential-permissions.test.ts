import { describe, expect, it } from 'vitest'
import { canRequestRotation, canRotateCredentials } from './credential-permissions'
import { ROLE_KEYS } from './roles'

describe('credential-permissions', () => {
  it('lets the three admin roles rotate directly, and no one else', () => {
    const canRotate = ROLE_KEYS.filter(canRotateCredentials)
    expect(new Set(canRotate)).toEqual(new Set(['org_admin', 'platform_admin', 'dev_admin']))
  })

  it('lets executive and management users request a rotation, and no one else', () => {
    const canRequest = ROLE_KEYS.filter(canRequestRotation)
    expect(new Set(canRequest)).toEqual(new Set(['executive_user', 'management_user']))
  })

  it('the two capabilities never overlap — direct rotation and request are exclusive', () => {
    for (const role of ROLE_KEYS) {
      expect(canRotateCredentials(role) && canRequestRotation(role)).toBe(false)
    }
  })

  it('treats a missing role as no capability', () => {
    for (const role of [null, undefined]) {
      expect(canRotateCredentials(role)).toBe(false)
      expect(canRequestRotation(role)).toBe(false)
    }
  })
})
