import { ChevronDown } from 'lucide-react'
import { Field, controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/utils'
import { departmentRoles, departments } from '@/lib/users-data'
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

/** The shared six-field grid behind both the add and edit dialogs. */
export function UserFormFields({ draft, onChange, variant }: UserFormFieldsProps) {
  const creating = variant === 'create'
  const label = (snake: string, spaced: string) => (creating ? snake : spaced)

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

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="department" htmlFor="user-department" required={creating}>
          <Select
            id="user-department"
            value={draft.department}
            onChange={(value) => onChange({ department: value })}
            placeholder="Select department…"
            options={departments}
          />
        </Field>

        <Field label="department role" htmlFor="user-department-role" required={creating}>
          <Select
            id="user-department-role"
            value={draft.departmentRole}
            onChange={(value) => onChange({ departmentRole: value })}
            placeholder="Select authorization level…"
            options={departmentRoles}
            accent
          />
        </Field>
      </div>

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
}: {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  options: readonly string[]
  /** Renders the chosen value in emerald mono, as the Edit design shows for the role. */
  accent?: boolean
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          controlClass,
          'h-11 appearance-none pr-10',
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
