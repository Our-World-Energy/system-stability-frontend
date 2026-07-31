// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { UserManagement } from './UserManagement'
import { users as seedUsers } from '@/lib/users-data'

afterEach(cleanup)

const PAGE_SIZE = 5

function registryRows() {
  return within(screen.getByRole('table')).getAllByRole('row').slice(1)
}

describe('User Management page', () => {
  it('renders the first page of the registry with its counts', () => {
    render(<UserManagement />)

    expect(screen.getByText('User Management')).toBeTruthy()
    expect(registryRows()).toHaveLength(PAGE_SIZE)
    expect(screen.getByText(`Showing ${PAGE_SIZE} of ${seedUsers.length} users`)).toBeTruthy()
    expect(screen.getByText(seedUsers[0].name)).toBeTruthy()
  })

  it('pages through the registry without landing on an empty page', () => {
    render(<UserManagement />)
    const pageCount = Math.ceil(seedUsers.length / PAGE_SIZE)

    for (let page = 2; page <= pageCount; page++) {
      fireEvent.click(screen.getByRole('button', { name: 'Next' }))
      expect(registryRows().length).toBeGreaterThan(0)
    }
    // Never offers more page buttons than the design's three.
    expect(screen.getAllByRole('button', { name: /^[0-9]+$/ }).length).toBeLessThanOrEqual(3)
    expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', true)
  })

  it('creates a user and shows it at the top of the list', () => {
    render(<UserManagement />)

    fireEvent.click(screen.getByRole('button', { name: /Add User/i }))
    const create = screen.getByRole('button', { name: /Create User/i }) as HTMLButtonElement
    expect(create.disabled).toBe(true) // Mandatory fields still blank.

    fireEvent.change(screen.getByLabelText(/full_name/i), { target: { value: 'Nadia Rahman' } })
    fireEvent.change(screen.getByLabelText(/email_address/i), {
      target: { value: 'nadia.rahman@ourworldenergy.com' },
    })
    // Queried by role so the accessible name is used — that skips the decorative
    // asterisk, which plain textContent would include. Anchored so "department"
    // doesn't also match "department role".
    fireEvent.change(screen.getByRole('combobox', { name: /^department$/i }), {
      target: { value: 'Platform Eng' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: /^department role$/i }), {
      target: { value: 'Engineer' },
    })
    expect(create.disabled).toBe(false)

    fireEvent.click(create)

    expect(screen.getByText('Nadia Rahman')).toBeTruthy()
    expect(screen.getByText(`Showing ${PAGE_SIZE} of ${seedUsers.length + 1} users`)).toBeTruthy()
  })

  it('saves an edit back to the row', () => {
    render(<UserManagement />)
    const target = seedUsers[0]

    fireEvent.click(screen.getByRole('button', { name: `Edit ${target.name}` }))
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Jonathan Doe-Reid' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

    expect(screen.getByText('Jonathan Doe-Reid')).toBeTruthy()
    expect(screen.queryByText(target.name)).toBeNull()
  })

  it('requires typing DELETE before de-provisioning', () => {
    render(<UserManagement />)
    const target = seedUsers[1]

    fireEvent.click(screen.getByRole('button', { name: `Delete ${target.name}` }))
    const confirm = screen.getByRole('button', { name: /De-provision/i }) as HTMLButtonElement
    expect(confirm.disabled).toBe(true)

    // A near-miss must not arm the action.
    fireEvent.change(screen.getByLabelText(/confirm permanent de-provisioning/i), {
      target: { value: 'DELET' },
    })
    expect(confirm.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText(/confirm permanent de-provisioning/i), {
      target: { value: 'DELETE' },
    })
    expect(confirm.disabled).toBe(false)

    fireEvent.click(confirm)
    expect(screen.queryByText(target.name)).toBeNull()
    expect(screen.getByText(`Showing ${PAGE_SIZE} of ${seedUsers.length - 1} users`)).toBeTruthy()
  })

  it('opens the read-only view and hands off to the edit dialog', () => {
    render(<UserManagement />)
    const target = seedUsers[2]

    fireEvent.click(screen.getByRole('button', { name: `View ${target.name}` }))
    expect(screen.getByText(target.id)).toBeTruthy()
    expect(screen.getByText(target.phone)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Edit User/i }))
    expect(screen.getByText('Edit System User')).toBeTruthy()
  })
})
