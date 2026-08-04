/*
  Every owe-stability-service route the app calls, in one place.

  Paths are relative to the service base (`…/api/owe-stability-service`), so a
  call reads as `stabilityCaller(endpoints.credentialManager.create, payload)`
  and a backend rename is a one-line edit here.

  Every route is a POST, including the read-only ones — the payload carries the
  query rather than the URL. The one exception is `pendingStats`, which the
  backend serves as a GET `text/event-stream`; it is consumed by
  `pending-stats-stream`, not `stabilityCaller`.
*/

export const endpoints = {
  credentialManager: {
    /** Register a new credential record. Secret must arrive encrypted. */
    create: 'credential-manager/create-credential',
    /** Case-insensitive partial match on name. Requires a non-empty `q`. */
    search: 'credential-manager/search-credentials',
    /** Replace the encrypted secret, and optionally amend metadata. */
    rotate: 'credential-manager/rotate-credential',
    /** Hard delete — not recoverable. */
    delete: 'credential-manager/delete-credential',
    /**
     * Return a credential's stored `encrypted_secret` so an admin can open it
     * locally. POST `{ id }` → `{ data: { credential_id, encrypted_secret } }`.
     */
    secret: 'credential-manager/get-credential-secret',

    /** Ask for access to a credential. Auto-grants come back already granted. */
    submitRequest: 'credential-manager/submit-request',
    /** Admin: approve or deny a pending request. */
    reviewRequest: 'credential-manager/review-request',
    /** Admin: the approval queue, oldest first. */
    pendingRequests: 'credential-manager/get-pending-requests',
    /** Request history — all users for an admin, own requests otherwise. */
    requestLogs: 'credential-manager/get-request-logs',

    /** Header metrics for the approval queue. GET SSE stream, not a POST. */
    pendingStats: 'credential-manager/get-pending-stats',
    /** Org-wide last-24h metrics for the activity ledger. */
    activityStats: 'credential-manager/get-activity-stats',
    /** The signed-in user's own request counts and volume. */
    requestStats: 'credential-manager/get-request-stats',

    /** Admin: end an active grant before its timer expires. */
    revokeGrant: 'credential-manager/revoke-grant',
  },
} as const

type Leaf<T> = T extends string ? T : T extends object ? Leaf<T[keyof T]> : never

/** Union of every path above — the vocabulary `stabilityCaller` accepts. */
export type StabilityEndpoint = Leaf<typeof endpoints>
