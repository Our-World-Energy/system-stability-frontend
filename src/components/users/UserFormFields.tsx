import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Field, controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/utils'
import {
  departments,
  platforms,
  roleNeedsDepartment,
  roleNeedsPlatforms,
  roleNeedsSubDepartment,
  subDepartmentsFor,
  userRoles,
} from '@/lib/users-data'
import type { UserDraft } from '@/lib/user-draft'

/** Caption styling shared with `Field`, for the control it can't label directly. */
const captionClass =
  'mb-2 block font-mono text-[11px] font-semibold tracking-[0.08em] uppercase text-fg-muted'

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
 * Role is chosen before anything organisational, because it decides which scope
 * the account is granted against: a department (management staff), a department
 * and sub-department (standard staff), named platforms (Platform Admin), or
 * nothing at all for the roles whose access is org-wide or environment-wide.
 * Department and sub-department then cascade: sub-department options come from
 * the chosen department, and changing the department clears the sub-department
 * so an invalid pair can't be submitted.
 */
export function UserFormFields({ draft, onChange, variant }: UserFormFieldsProps) {
  const creating = variant === 'create'
  const label = (snake: string, spaced: string) => (creating ? snake : spaced)
  const showDepartment = roleNeedsDepartment(draft.role)
  const showSubDepartment = roleNeedsSubDepartment(draft.role)
  const showPlatforms = roleNeedsPlatforms(draft.role)
  const subDepartments = subDepartmentsFor(draft.department)

  // Each role is scoped by at most one thing, so switching role strands whatever
  // the previous one collected — drop the fields the new role doesn't use.
  const changeRole = (role: string) => {
    onChange({
      role,
      department: roleNeedsDepartment(role) ? draft.department : '',
      subDepartment: roleNeedsSubDepartment(role) ? draft.subDepartment : '',
      platforms: roleNeedsPlatforms(role) ? draft.platforms : [],
    })
  }

  const togglePlatform = (platform: string) =>
    onChange({
      platforms: draft.platforms.includes(platform)
        ? draft.platforms.filter((p) => p !== platform)
        : [...draft.platforms, platform],
    })

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

      {showDepartment && (
        <div className={cn('grid gap-5', showSubDepartment && 'sm:grid-cols-2')}>
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

          {/* Management access covers the whole department, so only standard
              staff are narrowed to a sub-department. */}
          {showSubDepartment && (
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
          )}
        </div>
      )}

      {showPlatforms && (
        <div>
          {/* Captioned by hand rather than with `Field`: a <label for> would
              override the trigger's accessible name, hiding the selection. */}
          <span id="user-platforms-label" className={captionClass}>
            {label('platform_access', 'platform access')}
            {creating && (
              <span aria-hidden className="text-critical ml-1.5">
                *
              </span>
            )}
          </span>
          <PlatformSelect
            id="user-platforms"
            labelId="user-platforms-label"
            selected={draft.platforms}
            onToggle={togglePlatform}
          />
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

/**
 * Multi-select for a Platform Admin's grant: a dropdown of checkboxes, since a
 * native multiple-select is unusable (ctrl-click, no visible check state) and
 * the grant is routinely more than one platform.
 */
function PlatformSelect({
  id,
  labelId,
  selected,
  onToggle,
}: {
  id: string
  /** Caption element, read before the current selection. */
  labelId: string
  selected: string[]
  onToggle: (platform: string) => void
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  // Click-outside and Escape close it, as the dropdown isn't a native control.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={root} className="relative">
      <button
        id={id}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby={`${labelId} ${id}-value`}
        onClick={() => setOpen((o) => !o)}
        className={cn(controlClass, 'flex h-11 items-center justify-between gap-2 text-left')}
      >
        <span
          id={`${id}-value`}
          className={cn(
            'truncate',
            selected.length ? 'text-primary-bright font-mono' : 'text-fg-subtle',
          )}
        >
          {selected.length ? selected.join(', ') : 'Select platforms…'}
        </span>
        <ChevronDown
          className={cn(
            'text-fg-subtle size-4 shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable
          aria-labelledby={labelId}
          className="border-line bg-surface absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border p-1 shadow-lg"
        >
          {platforms.map((platform) => (
            <label
              key={platform}
              className="hover:bg-surface-3 flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2"
            >
              <input
                type="checkbox"
                checked={selected.includes(platform)}
                onChange={() => onToggle(platform)}
                className="accent-primary-bright size-4"
              />
              <span className="text-fg text-sm">{platform}</span>
            </label>
          ))}
        </div>
      )}
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
