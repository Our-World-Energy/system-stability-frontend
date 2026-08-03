/*
  The editable shape behind the add/edit user dialogs. Kept out of the form
  component so that file exports only a component (fast refresh requirement).
*/

import { roleNeedsDepartment, roleNeedsPlatforms, roleNeedsSubDepartment } from './users-data'

export interface UserDraft {
  name: string
  phone: string
  email: string
  /** System role — chosen first, and it decides which scoping fields apply. */
  role: string
  /** Only collected for department-scoped roles; empty otherwise. */
  department: string
  /** Must be one of the chosen department's sub-departments. */
  subDepartment: string
  /** Only collected for platform-scoped roles (Platform Admin); empty otherwise. */
  platforms: string[]
  justification: string
}

export const emptyUserDraft: UserDraft = {
  name: '',
  phone: '',
  email: '',
  role: '',
  department: '',
  subDepartment: '',
  platforms: [],
  justification: '',
}

/**
 * Name, email and role are always mandatory. The scoping fields are mandatory
 * only for the roles whose access is derived from them — a department for the
 * department-scoped roles (plus a sub-department for standard staff), at least
 * one platform for a Platform Admin. Roles with org-wide or environment-wide
 * access need none of them, and the form hides them, so requiring them would
 * make the dialog impossible to submit.
 */
export function isUserDraftComplete(draft: UserDraft): boolean {
  if (!draft.name.trim() || !draft.email.trim() || !draft.role) return false
  if (roleNeedsDepartment(draft.role)) {
    if (!draft.department) return false
    return roleNeedsSubDepartment(draft.role) ? Boolean(draft.subDepartment) : true
  }
  if (roleNeedsPlatforms(draft.role)) {
    // An admin scoped to nothing would silently hold no access at all.
    return draft.platforms.length > 0
  }
  return true
}
