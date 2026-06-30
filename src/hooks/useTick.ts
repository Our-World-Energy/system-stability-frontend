import { useEffect, useState } from 'react'

/** Forces a re-render every `ms` so relative timestamps stay fresh. */
export function useTick(ms: number) {
  const [, setN] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setN((n) => n + 1), ms)
    return () => clearInterval(id)
  }, [ms])
}
