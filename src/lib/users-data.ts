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

/**
 * Only standard users are placed in the org tree; the admin and leadership roles
 * are org-wide, so the add/edit form hides the department pickers for them.
 */
const DEPARTMENT_SCOPED_ROLES: readonly UserRole[] = ['Standard User']

export function roleNeedsDepartment(role: string): boolean {
  return DEPARTMENT_SCOPED_ROLES.includes(role as UserRole)
}

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
    phone: '+1 (555) 087-2201',
    justification: 'Administers the stability platform and its credential vault.',
    status: 'Active',
  },
  {
    id: 'OWE-4471-Q',
    name: 'Marcus Kane',
    email: 'marcus.kane@ourworldenergy.com',
    role: 'Dev Admin',
    department: '',
    subDepartment: '',
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
    department: '',
    subDepartment: '',
    phone: '+1 (555) 240-1187',
    justification: 'Leads the telemetry pipeline rewrite; needs staging cluster access.',
    status: 'Active',
  },
  {
    id: 'OWE-5127-H',
    name: 'Daniel Okafor',
    email: 'daniel.okafor@ourworldenergy.com',
    role: 'Standard User',
    department: 'Internal Operations',
    subDepartment: 'Interconnections',
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
    phone: '+1 (555) 265-7738',
    justification: 'Handles tier-2 customer escalations for monitored sites.',
    status: 'Active',
  },
]

/** Header counters on the growth card. */
export const userGrowth = {
  total: 1284,
  changePercent: 12,
  /** Daily active-node counts across the trailing 30 days, earliest first. */
  series: [
    412, 428, 441, 470, 508, 556, 612, 668, 726, 784, 836, 878, 908, 926, 934, 930, 918, 902, 890,
    886, 894, 918, 958, 1012, 1076, 1142, 1198, 1240, 1266, 1284,
  ],
  /** Same window, one period earlier — the muted comparison line. */
  previousSeries: [
    380, 388, 396, 410, 430, 456, 486, 518, 552, 584, 612, 634, 650, 660, 664, 662, 656, 648, 642,
    640, 646, 660, 682, 712, 748, 786, 820, 846, 862, 872,
  ],
}

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

export const roleAllocationUpdatedAt = '14:22:01 UTC'

/** Zero-pad small counts, as the design does for "08". */
export function formatCount(n: number): string {
  return n < 10 ? String(n).padStart(2, '0') : n.toLocaleString()
}
