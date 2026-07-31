/*
  Mock data for the admin-facing Credential Management console (records, rotation,
  archival). Distinct from the requester `credentials-data.ts` catalog. Shapes
  mirror the expected vault-admin API so this swaps to live data cleanly later.
*/

export type CredentialRecordStatus = 'active' | 'archived'

export interface CredentialRecord {
  id: string
  /** Vault record name, e.g. "production-db-cluster-01". */
  name: string
  /** Classification labels, e.g. ["POSTGRESQL", "CRITICAL"]. */
  tags: string[]
  status: CredentialRecordStatus
  /** Service account that owns the record. */
  owner: string
  /** Max elevation window, e.g. "1h", "15m", "0h". */
  elevation: string
  /** Relative rotation age, e.g. "12 days ago". Null when never rotated. */
  lastRotated: string | null
}

export const credentialRecords: CredentialRecord[] = [
  {
    id: 'production-db-cluster-01',
    name: 'production-db-cluster-01',
    tags: ['POSTGRESQL', 'CRITICAL'],
    status: 'active',
    owner: 'srv_cluster_admin',
    elevation: '1h',
    lastRotated: '12 days ago',
  },
  {
    id: 'legacy-gateway-auth',
    name: 'legacy-gateway-auth',
    tags: ['ARCHIVED-V1'],
    status: 'archived',
    owner: 'sys_root',
    elevation: '0h',
    lastRotated: '452 days ago',
  },
  {
    id: 'aws-iam-root-sentinel',
    name: 'aws-iam-root-sentinel',
    tags: ['IAM', 'GLOBAL'],
    status: 'active',
    owner: 'admin_central',
    elevation: '15m',
    lastRotated: '2 days ago',
  },
  {
    id: 'k8s-secret-manager-v2',
    name: 'k8s-secret-manager-v2',
    tags: ['CLUSTER'],
    status: 'active',
    owner: 'k8s_operator',
    elevation: '24h',
    lastRotated: null,
  },
]

/** Two-factor authentication methods offered when creating a credential. */
export const twoFactorTypes = [
  'Authenticator App (TOTP)',
  'SMS / Text Message',
  'Email OTP',
  'Hardware Security Key (FIDO2/U2F)',
  'Push Notification',
  'Biometric',
] as const
export type TwoFactorType = (typeof twoFactorTypes)[number]

/** Encryption scheme surfaced on the purge dialog. */
export const ENCRYPTION_SCHEME = 'AES-256-GCM'
