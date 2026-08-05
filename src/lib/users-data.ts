/*
  Dummy data for the User Management module — frontend only, no API yet.

  Shapes mirror what a user-directory endpoint would plausibly return, so this
  swaps to live data cleanly later. The page keeps its own copy in state, so
  add/edit/delete mutate the visible list without persisting anywhere.
*/

/** System role. Drives the role pill and the allocation card. */
export type UserRole =
  | 'Organizational Admin'
  | 'Platform Admin'
  | 'Dev Admin'
  | 'Executive User'
  | 'Management User'
  | 'Standard User'

/** Offered by the role dropdown, most privileged first. */
export const userRoles: UserRole[] = [
  'Organizational Admin',
  'Platform Admin',
  'Dev Admin',
  'Executive User',
  'Management User',
  'Standard User',
]

/** Which slice of the credential vault a role can see. */
export type CredentialScope = 'all' | 'assigned_platforms' | 'development' | 'department'

/** What a role may do about a password / key change. */
export type RotationRight = 'rotate' | 'request' | 'none'

/**
 * The extra scoping a role's provisioning form has to collect, if any.
 * `department` stops at the department; `sub_department` narrows further, since
 * standard staff are granted access at sub-department granularity.
 */
export type ScopeRequirement = 'nothing' | 'platforms' | 'department' | 'sub_department'

export interface RoleCapability {
  scope: CredentialScope
  rotation: RotationRight
  requires: ScopeRequirement
  /** Short caption for the access scope, e.g. "All credentials". */
  accessLabel: string
  /** Short caption for the rotation right, e.g. "Rotate / update". */
  rotationLabel: string
  /** One-line statement of the role's process, shown in the form and the matrix. */
  process: string
}

/**
 * The access process per role — the single source of truth for what a role can
 * reach, what it may do about rotation, and therefore which scoping fields the
 * add/edit form must collect. Everything downstream (form, registry, detail
 * view, matrix card) reads this rather than re-testing role names.
 */
export const roleCapabilities: Record<UserRole, RoleCapability> = {
  'Organizational Admin': {
    scope: 'all',
    rotation: 'rotate',
    requires: 'nothing',
    accessLabel: 'All credentials',
    rotationLabel: 'Rotate / update',
    process: 'Access to all credentials, and can rotate or update any password directly.',
  },
  'Platform Admin': {
    scope: 'assigned_platforms',
    rotation: 'rotate',
    requires: 'platforms',
    accessLabel: 'Assigned platforms',
    rotationLabel: 'Update on assigned platforms',
    process:
      'Access to credentials on the assigned platform(s), and can update passwords for those platforms only.',
  },
  'Dev Admin': {
    scope: 'development',
    rotation: 'rotate',
    requires: 'nothing',
    accessLabel: 'Development credentials',
    rotationLabel: 'Rotate keys',
    process: 'Access to development credentials, and can rotate development keys.',
  },
  'Executive User': {
    scope: 'all',
    rotation: 'request',
    requires: 'nothing',
    accessLabel: 'All credentials',
    rotationLabel: 'Request only',
    process:
      'Access to all credentials, but cannot rotate or update — can only request an update / rotation.',
  },
  'Management User': {
    scope: 'department',
    rotation: 'request',
    requires: 'department',
    accessLabel: 'Department credentials',
    rotationLabel: 'Request only',
    process: 'Access to credentials by department, and can request an update / rotation for them.',
  },
  'Standard User': {
    scope: 'department',
    rotation: 'none',
    requires: 'sub_department',
    accessLabel: 'Department credentials',
    rotationLabel: 'No rotation rights',
    process: 'Access granted by department; cannot rotate, update, or request a rotation.',
  },
}

/** Capability for `role`, or null while the form's role dropdown is still blank. */
export function capabilityFor(role: string): RoleCapability | null {
  return roleCapabilities[role as UserRole] ?? null
}

/**
 * Department-scoped roles (management and standard staff) are placed in the org
 * tree, because their credential access is derived from it. The admin tiers and
 * executives are org-wide, so the form hides the department pickers for them.
 */
export function roleNeedsDepartment(role: string): boolean {
  const requires = capabilityFor(role)?.requires
  return requires === 'department' || requires === 'sub_department'
}

/**
 * Only standard staff are scoped down to a sub-department — a Management User's
 * access covers the whole department, so the form offers them no sub-department.
 */
export function roleNeedsSubDepartment(role: string): boolean {
  return capabilityFor(role)?.requires === 'sub_department'
}

/** Platform Admins are scoped to named platforms instead of a department. */
export function roleNeedsPlatforms(role: string): boolean {
  return capabilityFor(role)?.requires === 'platforms'
}

/** Platforms offered by the frontend-only user-management fixture. */
export const platforms = ['AWS', 'Datadog', 'GitHub', 'Slack', 'Snowflake', 'Veracode'] as const

/**
 * The department → sub-department tree. A sub-department name can repeat across
 * departments (e.g. "Administrative", "Procurement"), so the two dropdowns
 * cascade: picking a department narrows the sub-department options.
 */
export const subDepartmentsByDepartment: Record<string, readonly string[]> = {
  Executive: ['Administrative'],
  'Field Operations': [
    'Administrative',
    'Assets-Fleet',
    'Electrical',
    'Final Inspection',
    'Installation',
    'Service-NonPV',
    'Site Survey',
  ],
  'Finance Operations': ['Administrative', 'Finance', 'Project Management', 'Service-NonPV'],
  'Finance-Legal': ['Administrative', 'Finance', 'Licensing', 'Procurement', 'Warehouse'],
  'Internal Operations': [
    'Administrative',
    'CAD',
    'Customer Support',
    'Electrical',
    'Interconnections',
    'Permitting',
    'Procurement',
    'Project Management',
    'Sales Operations',
    'Submission and Compliance',
    'Warehouse',
  ],
  'People Empowerment': ['Administrative', 'People Empowerment', 'Talent Acquisition'],
  'Project Management': ['Project Management'],
  Sales: ['Business Development', 'Partner Success', 'Sales Operations'],
  Technology: ['Technology'],
}

/** Department names, in the order the dropdown lists them. */
export const departments: readonly string[] = Object.keys(subDepartmentsByDepartment)

/** Sub-departments valid for `department`; empty when none is chosen yet. */
export function subDepartmentsFor(department: string): readonly string[] {
  return subDepartmentsByDepartment[department] ?? []
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  /** Empty for org-wide roles — see roleNeedsDepartment. */
  department: string
  /** Empty for org-wide roles, else one of the department's sub-departments. */
  subDepartment: string
  /** Platforms this user administers; only Platform Admins carry any. */
  platforms: string[]
  phone: string
  /** Free-text reason the account was provisioned. */
  justification: string
  status: 'Active' | 'Pending Review' | 'Offline'
}

export const users: User[] = [
  {
    id: 'OWE-8821-K',
    name: 'Johnathan Doe',
    email: 'john.doe@ourworldenergy.com',
    role: 'Organizational Admin',
    department: '',
    subDepartment: '',
    platforms: [],
    phone: '+1 (555) 012-3456',
    justification: 'Owns the core node fleet and holds break-glass access for Tier 1 incidents.',
    status: 'Active',
  },
  {
    id: 'OWE-9902-Z',
    name: 'Alice Schmidt',
    email: 'alice.schmidt@ourworldenergy.com',
    role: 'Platform Admin',
    department: '',
    subDepartment: '',
    platforms: ['AWS', 'Datadog'],
    phone: '+1 (555) 087-2201',
    justification: 'Administers the AWS and Datadog credential sets for the stability platform.',
    status: 'Active',
  },
  {
    id: 'OWE-4471-Q',
    name: 'Marcus Kane',
    email: 'marcus.kane@ourworldenergy.com',
    role: 'Dev Admin',
    department: '',
    subDepartment: '',
    platforms: [],
    phone: '+1 (555) 334-9087',
    justification: 'Ships the stability service and needs staging deploy rights.',
    status: 'Active',
  },
  {
    id: 'OWE-4412-M',
    name: 'Sarah Lopez',
    email: 'sarah.lopez@ourworldenergy.com',
    role: 'Standard User',
    department: 'Finance-Legal',
    subDepartment: 'Licensing',
    platforms: [],
    phone: '+1 (555) 771-4420',
    justification: 'Awaiting clearance sign-off before audit-log access is granted.',
    status: 'Pending Review',
  },
  {
    id: 'OWE-2214-B',
    name: 'Ben Thompson',
    email: 'ben.thompson@ourworldenergy.com',
    role: 'Standard User',
    department: 'Field Operations',
    subDepartment: 'Site Survey',
    platforms: [],
    phone: '+1 (555) 118-6633',
    justification: 'Runs pre-installation site surveys for the northern corridor.',
    status: 'Offline',
  },
  // Rows 6+ exist so the registry actually paginates (3 pages at 5 per page)
  // rather than showing page buttons that lead nowhere.
  {
    id: 'OWE-3390-T',
    name: 'Priya Raman',
    email: 'priya.raman@ourworldenergy.com',
    role: 'Management User',
    department: 'Technology',
    // Management access covers the whole department — no sub-department grant.
    subDepartment: '',
    platforms: [],
    phone: '+1 (555) 240-1187',
    justification: 'Leads the telemetry pipeline rewrite; requests rotations for her department.',
    status: 'Active',
  },
  {
    id: 'OWE-5127-H',
    name: 'Daniel Okafor',
    email: 'daniel.okafor@ourworldenergy.com',
    role: 'Standard User',
    department: 'Internal Operations',
    subDepartment: 'Interconnections',
    platforms: [],
    phone: '+1 (555) 903-7742',
    justification: 'Files interconnection applications with the regional utility.',
    status: 'Active',
  },
  {
    id: 'OWE-6641-R',
    name: 'Mei Tanaka',
    email: 'mei.tanaka@ourworldenergy.com',
    role: 'Standard User',
    department: 'Technology',
    subDepartment: 'Technology',
    platforms: [],
    phone: '+1 (555) 556-2093',
    justification: 'Maintains the node provisioning automation.',
    status: 'Active',
  },
  {
    id: 'OWE-7008-L',
    name: 'Carlos Mendes',
    email: 'carlos.mendes@ourworldenergy.com',
    role: 'Standard User',
    department: 'Finance Operations',
    subDepartment: 'Project Management',
    platforms: [],
    phone: '+1 (555) 611-8890',
    justification: 'Tracks capital spend across active installation projects.',
    status: 'Offline',
  },
  {
    id: 'OWE-7754-V',
    name: 'Hannah Berg',
    email: 'hannah.berg@ourworldenergy.com',
    role: 'Executive User',
    department: '',
    subDepartment: '',
    platforms: [],
    phone: '+1 (555) 428-3316',
    justification: 'Executive oversight of grid reliability reporting.',
    status: 'Active',
  },
  {
    id: 'OWE-8123-C',
    name: 'Tomas Nowak',
    email: 'tomas.nowak@ourworldenergy.com',
    role: 'Standard User',
    department: 'People Empowerment',
    subDepartment: 'Talent Acquisition',
    platforms: [],
    phone: '+1 (555) 379-4408',
    justification: 'New hire; clearance paperwork pending with compliance.',
    status: 'Pending Review',
  },
  {
    id: 'OWE-8890-F',
    name: 'Grace Ellery',
    email: 'grace.ellery@ourworldenergy.com',
    role: 'Standard User',
    department: 'Sales',
    subDepartment: 'Partner Success',
    platforms: [],
    phone: '+1 (555) 702-5561',
    justification: 'Manages installer partner onboarding and escalations.',
    status: 'Active',
  },
  {
    id: 'OWE-9315-W',
    name: 'Ibrahim Saleh',
    email: 'ibrahim.saleh@ourworldenergy.com',
    role: 'Standard User',
    department: 'Project Management',
    subDepartment: 'Project Management',
    platforms: [],
    phone: '+1 (555) 844-1029',
    justification: 'Coordinates the Q4 certification programme.',
    status: 'Offline',
  },
  {
    id: 'OWE-9744-D',
    name: 'Lena Fischer',
    email: 'lena.fischer@ourworldenergy.com',
    role: 'Standard User',
    department: 'Internal Operations',
    subDepartment: 'Customer Support',
    platforms: [],
    phone: '+1 (555) 265-7738',
    justification: 'Handles tier-2 customer escalations for monitored sites.',
    status: 'Active',
  },
]

export interface RoleAllocation {
  label: string
  count: number
  /** Bar tint. `pending` also colours the count itself amber. */
  tone: 'primary' | 'accent' | 'pending'
}

/** "User distribution per clearance level" — the bars on the right-hand card. */
export const roleAllocation: RoleAllocation[] = [
  { label: 'Standard User', count: 1042, tone: 'primary' },
  { label: 'Management User', count: 148, tone: 'accent' },
  { label: 'Executive User', count: 46, tone: 'accent' },
  { label: 'Dev Admin', count: 28, tone: 'primary' },
  { label: 'Platform Admin', count: 14, tone: 'accent' },
  { label: 'Organizational Admin', count: 6, tone: 'pending' },
]

/** Zero-pad small counts, as the design does for "08". */
export function formatCount(n: number): string {
  return n < 10 ? String(n).padStart(2, '0') : n.toLocaleString()
}
