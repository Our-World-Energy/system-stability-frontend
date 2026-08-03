import { useEffect, useState } from 'react'

/**
 * Trail `value` by `delay` ms.
 *
 * Used to keep a search box responsive while the query behind it fires once the
 * typing settles, rather than on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}
