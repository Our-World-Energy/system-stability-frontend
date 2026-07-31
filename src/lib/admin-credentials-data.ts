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
  /** Stored secret — admin-visible in the management table (masked by default). */
  secret: string
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
    secret: 'pg_live_7f3a2b9c4d1e8f60',
  },
  {
    id: 'legacy-gateway-auth',
    name: 'legacy-gateway-auth',
    tags: ['ARCHIVED-V1'],
    status: 'archived',
    owner: 'sys_root',
    elevation: '0h',
    lastRotated: '452 days ago',
    secret: 'gw_auth_0a1b2c3d4e5f6a7b',
  },
  {
    id: 'aws-iam-root-sentinel',
    name: 'aws-iam-root-sentinel',
    tags: ['IAM', 'GLOBAL'],
    status: 'active',
    owner: 'admin_central',
    elevation: '15m',
    lastRotated: '2 days ago',
    secret: 'AKIA9F3A2B7C4D1E8F60',
  },
  {
    id: 'k8s-secret-manager-v2',
    name: 'k8s-secret-manager-v2',
    tags: ['CLUSTER'],
    status: 'active',
    owner: 'k8s_operator',
    elevation: '24h',
    lastRotated: null,
    secret: 'k8s_sm_9c8b7a6d5e4f3a2b',
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
