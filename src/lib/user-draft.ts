/*
  The editable shape behind the add/edit user dialogs. Kept out of the form
  component so that file exports only a component (fast refresh requirement).
*/

export interface UserDraft {
  name: string
  phone: string
  email: string
  department: string
  departmentRole: string
  justification: string
}

export const emptyUserDraft: UserDraft = {
  name: '',
  phone: '',
  email: '',
  department: '',
  departmentRole: '',
  justification: '',
}

/** Name, email and both dropdowns are mandatory; phone and justification are not. */
export function isUserDraftComplete(draft: UserDraft): boolean {
  return Boolean(
    draft.name.trim() && draft.email.trim() && draft.department && draft.departmentRole,
  )
}
