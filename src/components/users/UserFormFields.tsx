import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Field, controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/utils'
import { byRankDescending } from '@/lib/role-display'
import {
  isGlobalRole,
  needsDepartment,
  needsPlatforms,
  validateUserForm,
} from '@/lib/api/user-payload'
import type { UserFormField, UserFormValues } from '@/lib/api/user-payload'
import type { MetadataData, RoleKey } from '@/lib/api/user-management.types'

/** Caption styling shared with `Field`, for the controls it can't label directly. */
const captionClass =
  'mb-2 block font-mono text-[11px] font-semibold tracking-[0.08em] uppercase text-fg-muted'

/** Order the summary line picks a problem to name, matching the field order. */
const SUMMARY_ORDER = [
  'fullName',
  'email',
  'phoneNumber',
  'role',
  'department',
  'platforms',
] as const satisfies readonly UserFormField[]

interface Option {
  /** What goes on the wire — a role/platform key, or an exact department name. */
  value: string
  /** What the admin reads. */
  label: string
}

interface UserFormFieldsProps {
  form: UserFormValues
  onChange: (patch: Partial<UserFormValues>) => void
  /**
   * Live roles, departments and platforms from get-metadata. Every dropdown below
   * is populated from this — nothing about the catalog is hardcoded, because the
   * backend validates the values it is sent against these same tables.
   */
  metadata: MetadataData
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
 * the account is granted against, and the backend rejects a payload carrying scope
 * the role does not use:
 *
 *   org_admin / dev_admin / executive_user → no scope controls at all
 *   platform_admin                         → platforms, at least one
 *   management_user / standard_user        → a department, sub-departments optional
 *
 * Switching role therefore clears the scope the previous one collected, so a
 * hidden control can never smuggle a stale value into the payload. Department and
 * sub-departments cascade too: sub-department names are only unique within a
 * department, so changing the department drops the selection.
 */
export function UserFormFields({ form, onChange, metadata, variant }: UserFormFieldsProps) {
  const creating = variant === 'create'
  const label = (snake: string, spaced: string) => (creating ? snake : spaced)

  const showDepartment = needsDepartment(form.role)
  const showPlatforms = needsPlatforms(form.role)

  /*
    Validation messages appear once a control has been left, not on the first
    keystroke — "Email must contain an @" while someone is still typing the local
    part is noise. The submit button is disabled throughout either way, and the
    dialog shows the first outstanding problem underneath it, so nothing is hidden.
  */
  const [touched, setTouched] = useState<Partial<Record<UserFormField, boolean>>>({})
  const errors = validateUserForm(form)
  const errorFor = (field: UserFormField) => (touched[field] ? errors[field] : undefined)
  const markTouched = (field: UserFormField) => setTouched((t) => ({ ...t, [field]: true }))

  /*
    One line under the form for the first problem that has NO inline message yet —
    an untouched text field, or one of the dropdowns, which have nowhere of their
    own to put a message. Skipping fields that already show their error inline
    keeps the same sentence from appearing twice on screen.
  */
  const summary = SUMMARY_ORDER.map((field) =>
    touched[field] ? undefined : errors[field],
  ).find(Boolean)

  /** `aria-invalid` plus a pointer at the message `Field` renders. */
  const errorProps = (id: string, field: UserFormField) =>
    errorFor(field)
      ? ({ 'aria-invalid': true, 'aria-describedby': `${id}-error` } as const)
      : {}

  const roleOptions = useMemo<Option[]>(
    () => byRankDescending(metadata.roles).map((r) => ({ value: r.key, label: r.name })),
    [metadata.roles],
  )

  const departmentOptions = useMemo<Option[]>(
    // Exact, case-sensitive names — the backend matches on the string, not an id.
    () => metadata.departments.map((d) => ({ value: d.name, label: d.name })),
    [metadata.departments],
  )

  const subDepartmentOptions = useMemo<Option[]>(() => {
    const department = metadata.departments.find((d) => d.name === form.department)
    return (department?.sub_departments ?? []).map((s) => ({ value: s.name, label: s.name }))
  }, [metadata.departments, form.department])

  const platformOptions = useMemo<Option[]>(
    // Keys on the wire, display names on screen — sending a display name is a 400.
    () => metadata.platforms.map((p) => ({ value: p.key, label: p.name })),
    [metadata.platforms],
  )

  const changeRole = (next: string) => {
    const role = next as RoleKey
    onChange({
      role,
      // Each role is scoped by at most one thing, so anything the previous role
      // collected is dropped rather than left in state where the payload builder
      // would have to guess whether it still applies.
      department: needsDepartment(role) ? form.department : '',
      subDepartments: needsDepartment(role) ? form.subDepartments : [],
      platforms: needsPlatforms(role) ? form.platforms : [],
    })
  }

  const toggle = (key: 'subDepartments' | 'platforms', value: string) => {
    const current = form[key] ?? []
    onChange({
      [key]: current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    })
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={label('full_name', 'full name')}
          htmlFor="user-name"
          required={creating}
          error={errorFor('fullName')}
        >
          <input
            id="user-name"
            value={form.fullName}
            onChange={(e) => onChange({ fullName: e.target.value })}
            onBlur={() => markTouched('fullName')}
            placeholder="e.g. Elias Thorne"
            className={cn(controlClass, 'h-11')}
            {...errorProps('user-name', 'fullName')}
          />
        </Field>

        <Field
          label={label('phone_number', 'phone number')}
          htmlFor="user-phone"
          error={errorFor('phoneNumber')}
        >
          <input
            id="user-phone"
            // Digits only, so the numeric keypad is the right one on mobile.
            // `inputMode` rather than type="number", which would add spinners and
            // let "1e5" through.
            inputMode="numeric"
            value={form.phoneNumber ?? ''}
            onChange={(e) => onChange({ phoneNumber: e.target.value })}
            onBlur={() => markTouched('phoneNumber')}
            placeholder="5550000000"
            className={cn(controlClass, 'h-11 font-mono')}
            {...errorProps('user-phone', 'phoneNumber')}
          />
        </Field>
      </div>

      <Field
        label={label('email_address', 'email address')}
        htmlFor="user-email"
        required={creating}
        error={errorFor('email')}
      >
        <input
          id="user-email"
          // Deliberately not type="email": the browser's own bubble would compete
          // with the message below, and its rules differ from the backend's.
          type="text"
          value={form.email}
          onChange={(e) => onChange({ email: e.target.value })}
          onBlur={() => markTouched('email')}
          placeholder="user.identity@ourworldenergy.com"
          className={cn(controlClass, 'h-11 font-mono')}
          {...errorProps('user-email', 'email')}
        />
      </Field>

      <Field label="role" htmlFor="user-role" required={creating}>
        <Select
          id="user-role"
          value={form.role}
          onChange={changeRole}
          placeholder="Select role…"
          options={roleOptions}
          accent
        />
      </Field>

      {showDepartment && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="department" htmlFor="user-department" required={creating}>
            <Select
              id="user-department"
              value={form.department ?? ''}
              // Sub-department names repeat across departments, so the old pick
              // cannot stand — sending a mismatched pair is a 400.
              onChange={(department) => onChange({ department, subDepartments: [] })}
              placeholder="Select department…"
              options={departmentOptions}
            />
          </Field>

          {/* Optional for both department roles: no selection grants the whole
              department, and narrowing is the exception rather than the rule. */}
          <div>
            <span id="user-sub-departments-label" className={captionClass}>
              {label('sub_departments', 'sub-departments')}
            </span>
            <MultiSelect
              id="user-sub-departments"
              labelId="user-sub-departments-label"
              selected={form.subDepartments ?? []}
              options={subDepartmentOptions}
              onToggle={(value) => toggle('subDepartments', value)}
              disabled={!form.department}
              placeholder={
                form.department ? 'Entire department' : 'Select a department first'
              }
            />
          </div>
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
          <MultiSelect
            id="user-platforms"
            labelId="user-platforms-label"
            selected={form.platforms ?? []}
            options={platformOptions}
            onToggle={(value) => toggle('platforms', value)}
            placeholder="Select platforms…"
          />
        </div>
      )}

      {isGlobalRole(form.role) && (
        <p className="border-line-bright/70 text-fg-muted rounded-lg border border-dashed p-3 text-[13px] leading-relaxed">
          This role's access is organization-wide, so it takes no department or
          platform scoping.
        </p>
      )}

      <Field
        label={label('description_justification', 'description / justification')}
        htmlFor="user-justification"
      >
        <textarea
          id="user-justification"
          rows={4}
          value={form.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Provide reason for system access provisioning…"
          className={cn(controlClass, 'resize-none py-2.5')}
        />
      </Field>

      {/* Says what is still outstanding, so the disabled submit button is never
          unexplained. Fields already showing their own message are skipped. */}
      {summary && <p className="text-fg-subtle text-[13px]">{summary}</p>}
    </div>
  )
}

/**
 * Checkbox dropdown for the two multi-valued grants (platforms, sub-departments).
 *
 * A native `<select multiple>` is unusable for this — ctrl-click, no visible check
 * state — and both grants are routinely more than one value.
 */
function MultiSelect({
  id,
  labelId,
  selected,
  options,
  onToggle,
  placeholder,
  disabled,
}: {
  id: string
  /** Caption element, read before the current selection. */
  labelId: string
  selected: string[]
  options: Option[]
  onToggle: (value: string) => void
  placeholder: string
  disabled?: boolean
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

  // A disabled control must not keep a panel open behind it.
  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  // Selections are stored as wire values; the trigger shows their display names.
  const summary = selected
    .map((value) => options.find((o) => o.value === value)?.label ?? value)
    .join(', ')

  return (
    <div ref={root} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby={`${labelId} ${id}-value`}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          controlClass,
          'flex h-11 items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <span
          id={`${id}-value`}
          className={cn('truncate', summary ? 'text-primary-bright font-mono' : 'text-fg-subtle')}
        >
          {summary || placeholder}
        </span>
        <ChevronDown
          className={cn('text-fg-subtle size-4 shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable
          aria-labelledby={labelId}
          className="border-line bg-surface absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border p-1 shadow-lg"
        >
          {options.length === 0 ? (
            <p className="text-fg-subtle px-2.5 py-2 text-[13px]">Nothing to choose from</p>
          ) : (
            options.map((option) => (
              <label
                key={option.value}
                className="hover:bg-surface-3 flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  onChange={() => onToggle(option.value)}
                  className="accent-primary-bright size-4"
                />
                <span className="text-fg text-sm">{option.label}</span>
              </label>
            ))
          )}
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
  options: Option[]
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
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="text-fg-subtle pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
    </div>
  )
}
