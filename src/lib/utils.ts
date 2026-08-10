import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Strip leading whitespace from a value as it is typed, so a text field can never
 * begin with a blank. Internal and trailing spaces are left alone (they can be
 * meaningful and are trimmed at submit time). Not for secret/password inputs,
 * where a leading space may be part of the value.
 */
export function stripLeadingWhitespace(value: string): string {
  return value.replace(/^\s+/, '')
}
