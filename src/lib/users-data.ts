/*
  Dummy data for the User Management module — frontend only, no API yet.

  Shapes mirror what a user-directory endpoint would plausibly return, so this
  swaps to live data cleanly later. The page keeps its own copy in state, so
  add/edit/delete mutate the visible list without persisting anywhere.
*/

/** System-wide clearance level. Drives the role pill and the allocation card. */
export type UserRole = 'System Admin' | 'Security Op' | 'Developer' | 'Pending Auth' | 'Observer'

export const userRoles: UserRole[] = [
  'System Admin',
  'Security Op',
  'Developer',
  'Pending Auth',
  'Observer',
]

/** Selectable in the add/edit dialogs. */
export const departments = [
  'Core Infrastructure',
  'Cloud Infrastructure',
  'Threat Intelligence',
  'Platform Eng',
  'Legal & Compliance',
  'External Audit',
] as const

/** Authorization level within a department, distinct from the system role. */
export const departmentRoles = [
  'Senior Ops',
  'Team Lead',
  'Engineer',
  'Analyst',
  'Auditor',
  'Contractor',
] as const

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  department: string
  departmentRole: string
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
    role: 'System Admin',
    department: 'Core Infrastructure',
    departmentRole: 'Senior Ops',
    phone: '+1 (555) 012-3456',
    justification: 'Owns the core node fleet and holds break-glass access for Tier 1 incidents.',
    status: 'Active',
  },
  {
    id: 'OWE-9902-Z',
    name: 'Alice Schmidt',
    email: 'alice.schmidt@ourworldenergy.com',
    role: 'Security Op',
    department: 'Threat Intelligence',
    departmentRole: 'Analyst',
    phone: '+1 (555) 087-2201',
    justification: 'Monitors intrusion telemetry and triages credential-abuse alerts.',
    status: 'Active',
  },
  {
    id: 'OWE-4471-Q',
    name: 'Marcus Kane',
    email: 'marcus.kane@ourworldenergy.com',
    role: 'Developer',
    department: 'Platform Eng',
    departmentRole: 'Engineer',
    phone: '+1 (555) 334-9087',
    justification: 'Ships the stability service and needs staging deploy rights.',
    status: 'Active',
  },
  {
    id: 'OWE-4412-M',
    name: 'Sarah Lopez',
    email: 'sarah.lopez@ourworldenergy.com',
    role: 'Pending Auth',
    department: 'Legal & Compliance',
    departmentRole: 'Auditor',
    phone: '+1 (555) 771-4420',
    justification: 'Awaiting clearance sign-off before audit-log access is granted.',
    status: 'Pending Review',
  },
  {
    id: 'OWE-2214-B',
    name: 'Ben Thompson',
    email: 'ben.thompson@ourworldenergy.com',
    role: 'Observer',
    department: 'External Audit',
    departmentRole: 'Contractor',
    phone: '+1 (555) 118-6633',
    justification: 'Third-party auditor with read-only visibility for the Q4 review.',
    status: 'Offline',
  },
  // Rows 6+ exist so the registry actually paginates (3 pages at 5 per page)
  // rather than showing page buttons that lead nowhere.
  {
    id: 'OWE-3390-T',
    name: 'Priya Raman',
    email: 'priya.raman@ourworldenergy.com',
    role: 'Developer',
    department: 'Platform Eng',
    departmentRole: 'Team Lead',
    phone: '+1 (555) 240-1187',
    justification: 'Leads the telemetry pipeline rewrite; needs staging cluster access.',
    status: 'Active',
  },
  {
    id: 'OWE-5127-H',
    name: 'Daniel Okafor',
    email: 'daniel.okafor@ourworldenergy.com',
    role: 'Security Op',
    department: 'Threat Intelligence',
    departmentRole: 'Senior Ops',
    phone: '+1 (555) 903-7742',
    justification: 'On-call for credential-abuse escalations across all tiers.',
    status: 'Active',
  },
  {
    id: 'OWE-6641-R',
    name: 'Mei Tanaka',
    email: 'mei.tanaka@ourworldenergy.com',
    role: 'Developer',
    department: 'Cloud Infrastructure',
    departmentRole: 'Engineer',
    phone: '+1 (555) 556-2093',
    justification: 'Maintains the node provisioning automation.',
    status: 'Active',
  },
  {
    id: 'OWE-7008-L',
    name: 'Carlos Mendes',
    email: 'carlos.mendes@ourworldenergy.com',
    role: 'Observer',
    department: 'Legal & Compliance',
    departmentRole: 'Analyst',
    phone: '+1 (555) 611-8890',
    justification: 'Reviews retention compliance against the audit ledger.',
    status: 'Offline',
  },
  {
    id: 'OWE-7754-V',
    name: 'Hannah Berg',
    email: 'hannah.berg@ourworldenergy.com',
    role: 'System Admin',
    department: 'Core Infrastructure',
    departmentRole: 'Senior Ops',
    phone: '+1 (555) 428-3316',
    justification: 'Secondary break-glass holder for the primary grid cluster.',
    status: 'Active',
  },
  {
    id: 'OWE-8123-C',
    name: 'Tomas Nowak',
    email: 'tomas.nowak@ourworldenergy.com',
    role: 'Pending Auth',
    department: 'Platform Eng',
    departmentRole: 'Engineer',
    phone: '+1 (555) 379-4408',
    justification: 'New hire; clearance paperwork pending with compliance.',
    status: 'Pending Review',
  },
  {
    id: 'OWE-8890-F',
    name: 'Grace Ellery',
    email: 'grace.ellery@ourworldenergy.com',
    role: 'Developer',
    department: 'Cloud Infrastructure',
    departmentRole: 'Engineer',
    phone: '+1 (555) 702-5561',
    justification: 'Owns the SSE status stream and its reconnect logic.',
    status: 'Active',
  },
  {
    id: 'OWE-9315-W',
    name: 'Ibrahim Saleh',
    email: 'ibrahim.saleh@ourworldenergy.com',
    role: 'Observer',
    department: 'External Audit',
    departmentRole: 'Auditor',
    phone: '+1 (555) 844-1029',
    justification: 'Regulator liaison with read-only access during certification.',
    status: 'Offline',
  },
  {
    id: 'OWE-9744-D',
    name: 'Lena Fischer',
    email: 'lena.fischer@ourworldenergy.com',
    role: 'Security Op',
    department: 'Threat Intelligence',
    departmentRole: 'Analyst',
    phone: '+1 (555) 265-7738',
    justification: 'Runs weekly access reviews and revocation sweeps.',
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
  { label: 'Developer', count: 846, tone: 'primary' },
  { label: 'Observer', count: 324, tone: 'accent' },
  { label: 'Security Op', count: 82, tone: 'accent' },
  { label: 'Sys Admin', count: 24, tone: 'primary' },
  { label: 'Pending', count: 8, tone: 'pending' },
]

export const roleAllocationUpdatedAt = '14:22:01 UTC'

/** Zero-pad small counts, as the design does for "08". */
export function formatCount(n: number): string {
  return n < 10 ? String(n).padStart(2, '0') : n.toLocaleString()
}
