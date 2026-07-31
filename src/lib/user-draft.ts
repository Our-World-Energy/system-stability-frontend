/*
  The editable shape behind the add/edit user dialogs. Kept out of the form
  component so that file exports only a component (fast refresh requirement).
*/

import { roleNeedsDepartment } from './users-data'

export interface UserDraft {
  name: string
  phone: string
  email: string
  /** System role — chosen first, and it decides whether the org fields apply. */
  role: string
  /** Only collected for department-scoped roles; empty otherwise. */
  department: string
  /** Must be one of the chosen department's sub-departments. */
  subDepartment: string
  justification: string
}

export const emptyUserDraft: UserDraft = {
  name: '',
  phone: '',
  email: '',
  role: '',
  department: '',
  subDepartment: '',
  justification: '',
}

/**
 * Name, email and role are always mandatory. Department and sub-department are
 * mandatory only for roles placed in the org tree — for org-wide roles the form
 * hides them, so requiring them would make the dialog impossible to submit.
 */
export function isUserDraftComplete(draft: UserDraft): boolean {
  if (!draft.name.trim() || !draft.email.trim() || !draft.role) return false
  if (roleNeedsDepartment(draft.role)) {
    return Boolean(draft.department && draft.subDepartment)
  }
  return true
}
