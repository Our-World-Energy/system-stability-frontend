// @vitest-environment jsdom
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { OtpInput } from './OtpInput'

afterEach(cleanup)

function Harness({ onComplete }: { onComplete?: (v: string) => void }) {
  const [code, setCode] = useState('')
  return (
    <>
      <OtpInput value={code} onChange={setCode} onComplete={onComplete} />
      <output data-testid="code">{code}</output>
    </>
  )
}

const box = (n: number) => screen.getByLabelText(`Digit ${n} of 6`) as HTMLInputElement
const code = () => screen.getByTestId('code').textContent

describe('OtpInput', () => {
  it('accepts a digit per box and advances focus', () => {
    render(<Harness />)
    fireEvent.change(box(1), { target: { value: '4' } })
    expect(code()).toBe('4')
    expect(document.activeElement).toBe(box(2))

    fireEvent.change(box(2), { target: { value: '2' } })
    expect(code()).toBe('42')
  })

  it('ignores non-numeric input', () => {
    render(<Harness />)
    fireEvent.change(box(1), { target: { value: 'a' } })
    expect(code()).toBe('')
  })

  it('spreads a pasted code across every box and reports completion', () => {
    const onComplete = vi.fn()
    render(<Harness onComplete={onComplete} />)

    fireEvent.change(box(1), { target: { value: '481902' } })

    expect(code()).toBe('481902')
    expect(box(6).value).toBe('2')
    expect(onComplete).toHaveBeenCalledWith('481902')
  })

  it('backspace clears the current box, then steps back', () => {
    render(<Harness />)
    fireEvent.change(box(1), { target: { value: '12' } })
    expect(code()).toBe('12')

    // Box 3 is focused and empty — Backspace retreats and clears box 2.
    fireEvent.keyDown(box(3), { key: 'Backspace' })
    expect(code()).toBe('1')
    expect(document.activeElement).toBe(box(2))

    // Box 1 still holds a digit, so Backspace clears it in place.
    fireEvent.keyDown(box(1), { key: 'Backspace' })
    expect(code()).toBe('')
  })
})
