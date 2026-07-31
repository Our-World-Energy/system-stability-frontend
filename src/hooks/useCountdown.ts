import { useEffect, useState } from 'react'


export function useCountdown(expiresAt: number): number {
  const [remaining, setRemaining] = useState(() => secondsUntil(expiresAt))

  useEffect(() => {
    setRemaining(secondsUntil(expiresAt))
    const id = setInterval(() => {
      const next = secondsUntil(expiresAt)
      setRemaining(next)
      if (next <= 0) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  return remaining
}

function secondsUntil(expiresAt: number) {
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
}

/** Seconds as `mm:ss`, matching the mono countdown in the OTP screen. */
export function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
