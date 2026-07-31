import { ChevronDown } from 'lucide-react'
import { Field, controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/utils'
import { departments, roleNeedsDepartment, subDepartmentsFor, userRoles } from '@/lib/users-data'
import type { UserDraft } from '@/lib/user-draft'

interface UserFormFieldsProps {
  draft: UserDraft
  onChange: (patch: Partial<UserDraft>) => void
  /**
   * The Add dialog captions fields in SNAKE_CASE and marks the mandatory ones;
   * the Edit dialog uses spaced captions with no asterisks. Straight from the designs.
   */
  variant: 'create' | 'edit'
}

/**
 * The shared field set behind both the add and edit dialogs.
 *
 * Role is chosen before anything organisational, because it decides whether the
 * department pickers apply at all. Department and sub-department then cascade:
 * sub-department options come from the chosen department, and changing the
 * department clears the sub-department so an invalid pair can't be submitted.
 */
export function UserFormFields({ draft, onChange, variant }: UserFormFieldsProps) {
  const creating = variant === 'create'
  const label = (snake: string, spaced: string) => (creating ? snake : spaced)
  const showOrgFields = roleNeedsDepartment(draft.role)
  const subDepartments = subDepartmentsFor(draft.department)

  const changeRole = (role: string) =>
    // Leaving a department-scoped role strands the org fields — clear them.
    onChange(roleNeedsDepartment(role) ? { role } : { role, department: '', subDepartment: '' })

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={label('full_name', 'full name')} htmlFor="user-name" required={creating}>
          <input
            id="user-name"
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. Elias Thorne"
            className={cn(controlClass, 'h-11')}
          />
        </Field>

        <Field label={label('phone_number', 'phone number')} htmlFor="user-phone">
          <input
            id="user-phone"
            value={draft.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="+1 (555) 000-0000"
            className={cn(controlClass, 'h-11 font-mono')}
          />
        </Field>
      </div>

      <Field
        label={label('email_address', 'email address')}
        htmlFor="user-email"
        required={creating}
      >
        <input
          id="user-email"
          type="email"
          value={draft.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="user.identity@ourworldenergy.com"
          className={cn(controlClass, 'h-11 font-mono')}
        />
      </Field>

      <Field label="role" htmlFor="user-role" required={creating}>
        <Select
          id="user-role"
          value={draft.role}
          onChange={changeRole}
          placeholder="Select role…"
          options={userRoles}
          accent
        />
      </Field>

      {showOrgFields && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="department" htmlFor="user-department" required={creating}>
            <Select
              id="user-department"
              value={draft.department}
              // Sub-departments differ per department, so the old pick can't stand.
              onChange={(department) => onChange({ department, subDepartment: '' })}
              placeholder="Select department…"
              options={departments}
            />
          </Field>

          <Field label="sub-department" htmlFor="user-sub-department" required={creating}>
            <Select
              id="user-sub-department"
              value={draft.subDepartment}
              onChange={(subDepartment) => onChange({ subDepartment })}
              placeholder={
                draft.department ? 'Select sub-department…' : 'Select a department first'
              }
              options={subDepartments}
              disabled={!draft.department}
            />
          </Field>
        </div>
      )}

      <Field
        label={label('description_justification', 'description / justification')}
        htmlFor="user-justification"
      >
        <textarea
          id="user-justification"
          rows={4}
          value={draft.justification}
          onChange={(e) => onChange({ justification: e.target.value })}
          placeholder="Provide reason for system access provisioning…"
          className={cn(controlClass, 'resize-none py-2.5')}
        />
      </Field>
    </div>
  )
}

function Select({
  id,
  value,
  onChange,
  placeholder,
  options,
  accent,
  disabled,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  options: readonly string[]
  /** Renders the chosen value in emerald mono, as the Edit design shows for the role. */
  accent?: boolean
  disabled?: boolean
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          controlClass,
          'h-11 appearance-none pr-10 disabled:cursor-not-allowed disabled:opacity-50',
          !value && 'text-fg-subtle',
          accent && value && 'text-primary-bright font-mono',
        )}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="text-fg-subtle pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
    </div>
  )
}
