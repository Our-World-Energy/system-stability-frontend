/*
  How a role is presented, given a role record from get-metadata.

  This is presentation only. Everything factual about a role — its display name,
  description, scope type and rotation rights — comes from the API, because
  get-metadata reads it live from the catalog tables and is the documented source
  of truth. What lives here is the tint each role gets and the wording for the
  derived columns, neither of which the API has an opinion about.

  Replaces the old frontend-only fixture, whose platform list (AWS, Datadog,
  GitHub, Slack…) never matched the 14 platforms this system actually tracks.
*/

import type { Role, RoleKey } from '@/lib/api/user-management.types'

/**
 * Outline tint per role — the three admin tiers read warmest, staff read neutral.
 * Keyed by role key rather than display name, so renaming a role in the DB does
 * not silently drop its colour.
 */
const ROLE_STYLES: Record<RoleKey, string> = {
  org_admin: 'border-primary/60 text-primary-bright',
  platform_admin: 'border-indigo-400/60 text-indigo-300',
  dev_admin: 'border-sky-400/60 text-sky-300',
  executive_user: 'border-degraded/70 text-degraded',
  management_user: 'border-line-bright text-fg',
  standard_user: 'border-line-bright text-fg-muted',
}

/** Pill classes for a role key, with a neutral fallback for an unknown one. */
export function roleStyle(key: string): string {
  return ROLE_STYLES[key as RoleKey] ?? 'border-line-bright text-fg-muted'
}

/** What decides a role's reach — reads `scope_type` from get-metadata. */
const SCOPE_LABELS: Record<string, string> = {
  all: 'Organization-wide',
  development: 'Development environment',
  platform: 'Assigned platform(s)',
  department: 'Department',
}

export function scopeLabel(scopeType: string): string {
  return SCOPE_LABELS[scopeType] ?? scopeType.replace(/_/g, ' ')
}

/**
 * The role's rotation right in words, derived from the two booleans the API
 * sends rather than from a second hardcoded table.
 */
export function rotationLabel(role: Role): string {
  if (role.can_rotate_credentials) return 'Rotate / update'
  if (role.can_request_rotation) return 'Request only'
  return 'No rotation rights'
}

/** Tint matching `rotationLabel`: able, able-to-ask, or neither. */
export function rotationTone(role: Role): string {
  if (role.can_rotate_credentials) return 'text-primary-bright'
  if (role.can_request_rotation) return 'text-degraded'
  return 'text-fg-subtle'
}

/**
 * Bar tint for the Role Allocation card, cycling by rank so the ordering reads as
 * a hierarchy rather than assigning a colour per role name.
 */
export function allocationTone(role: Role): string {
  if (role.key === 'org_admin') return 'bg-degraded'
  return role.can_rotate_credentials ? 'bg-primary-bright' : 'bg-indigo-400'
}

/** Zero-pad small counts, as the design does for "08". */
export function formatCount(n: number): string {
  return n < 10 ? String(n).padStart(2, '0') : n.toLocaleString()
}

/** Roles most privileged first — get-metadata returns highest `rank` first. */
export function byRankDescending(roles: Role[]): Role[] {
  return [...roles].sort((a, b) => b.rank - a.rank)
}
