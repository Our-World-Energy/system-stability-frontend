/*
  PLACEHOLDER data for the Credential Audit Log.

  Hand-written sample rows so the org-admin audit ledger renders something before
  its backend route exists. When the API lands, replace `credentialAuditEvents`
  with the live feed — the view reads this shape unchanged, so nothing else moves.
*/

/** Every kind of action the credential manager records against a credential. */
export type CredentialAuditAction =
  | 'created'
  | 'viewed'
  | 'copied'
  | 'rotated'
  | 'updated'
  | 'deleted'
  | 'requested'
  | 'approved'
  | 'denied'

export interface CredentialAuditEvent {
  id: string
  /** Who performed the action (display name). */
  actor: string
  /** Their role at the time, for context. */
  actorRole: string
  action: CredentialAuditAction
  /** The credential acted on. */
  credentialName: string
  /** One-line, human description of what happened. */
  detail: string
  /** RFC3339 timestamp. */
  at: string
  /** Source address, where the event carries one. */
  ip?: string
}

/** Most-recent first, as an audit trail is read. */
export const credentialAuditEvents: CredentialAuditEvent[] = [
  {
    id: 'evt_00021',
    actor: 'Priya Nair',
    actorRole: 'Standard User',
    action: 'copied',
    credentialName: 'AWS Production Root',
    detail: 'Copied the secret to clipboard during an active elevation window.',
    at: '2026-08-08T14:41:07Z',
    ip: '10.4.19.8',
  },
  {
    id: 'evt_00020',
    actor: 'Elias Thorne',
    actorRole: 'Organizational Admin',
    action: 'rotated',
    credentialName: 'AWS Production Root',
    detail: 'Rotated the secret and notified two active grant holders.',
    at: '2026-08-08T14:38:52Z',
    ip: '10.4.2.1',
  },
  {
    id: 'evt_00019',
    actor: 'Priya Nair',
    actorRole: 'Standard User',
    action: 'viewed',
    credentialName: 'AWS Production Root',
    detail: 'Opened the reveal dialog for the credential.',
    at: '2026-08-08T14:37:15Z',
    ip: '10.4.19.8',
  },
  {
    id: 'evt_00018',
    actor: 'Elias Thorne',
    actorRole: 'Organizational Admin',
    action: 'approved',
    credentialName: 'AWS Production Root',
    detail: 'Approved access request REQ-4821 for a 60-minute window.',
    at: '2026-08-08T14:35:40Z',
    ip: '10.4.2.1',
  },
  {
    id: 'evt_00017',
    actor: 'Priya Nair',
    actorRole: 'Standard User',
    action: 'requested',
    credentialName: 'AWS Production Root',
    detail: 'Requested access — reason: incident response (INC-2291).',
    at: '2026-08-08T14:31:02Z',
    ip: '10.4.19.8',
  },
  {
    id: 'evt_00016',
    actor: 'Marcus Lee',
    actorRole: 'Platform Admin',
    action: 'copied',
    credentialName: 'Stripe Live API Key',
    detail: 'Copied the secret to clipboard.',
    at: '2026-08-08T13:58:44Z',
    ip: '10.7.3.44',
  },
  {
    id: 'evt_00015',
    actor: 'Sofia Ramos',
    actorRole: 'Executive User',
    action: 'requested',
    credentialName: 'Stripe Live API Key',
    detail: 'Requested a rotation with a proposed new secret.',
    at: '2026-08-08T13:22:10Z',
    ip: '10.9.1.12',
  },
  {
    id: 'evt_00014',
    actor: 'Marcus Lee',
    actorRole: 'Platform Admin',
    action: 'created',
    credentialName: 'Stripe Live API Key',
    detail: 'Created the credential on the Payments platform, auto-grant off.',
    at: '2026-08-08T11:47:33Z',
    ip: '10.7.3.44',
  },
  {
    id: 'evt_00013',
    actor: 'Dana Whitfield',
    actorRole: 'Dev Admin',
    action: 'rotated',
    credentialName: 'Dev Redis Cache',
    detail: 'Rotated the access key for the development cluster.',
    at: '2026-08-08T10:14:58Z',
    ip: '10.12.8.5',
  },
  {
    id: 'evt_00012',
    actor: 'Elias Thorne',
    actorRole: 'Organizational Admin',
    action: 'denied',
    credentialName: 'Internal Billing DB',
    detail: 'Denied access request REQ-4790 — insufficient justification.',
    at: '2026-08-08T09:51:20Z',
    ip: '10.4.2.1',
  },
  {
    id: 'evt_00011',
    actor: 'Sofia Ramos',
    actorRole: 'Executive User',
    action: 'viewed',
    credentialName: 'Internal Billing DB',
    detail: 'Opened the reveal dialog for the credential.',
    at: '2026-08-08T09:12:41Z',
    ip: '10.9.1.12',
  },
  {
    id: 'evt_00010',
    actor: 'Elias Thorne',
    actorRole: 'Organizational Admin',
    action: 'updated',
    credentialName: 'Internal Billing DB',
    detail: 'Updated metadata — changed the second-factor approver.',
    at: '2026-08-07T18:05:09Z',
    ip: '10.4.2.1',
  },
  {
    id: 'evt_00009',
    actor: 'Elias Thorne',
    actorRole: 'Organizational Admin',
    action: 'deleted',
    credentialName: 'Legacy FTP Account',
    detail: 'Purged the record — service decommissioned.',
    at: '2026-08-07T16:40:27Z',
    ip: '10.4.2.1',
  },
  {
    id: 'evt_00008',
    actor: 'Aiko Tanaka',
    actorRole: 'Management User',
    action: 'requested',
    credentialName: 'Grafana Admin',
    detail: 'Requested a rotation for a credential in the Observability department.',
    at: '2026-08-07T15:19:53Z',
    ip: '10.15.4.2',
  },
  {
    id: 'evt_00007',
    actor: 'Dana Whitfield',
    actorRole: 'Dev Admin',
    action: 'created',
    credentialName: 'Dev Redis Cache',
    detail: 'Created the credential on the Development platform.',
    at: '2026-08-07T13:02:16Z',
    ip: '10.12.8.5',
  },
]
