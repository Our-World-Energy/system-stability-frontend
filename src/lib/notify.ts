/*
  App-wide toast notifications.

  Every transient success/failure message goes through here rather than calling
  `toast` directly, so wording style, duration and placement stay consistent and
  there is a single place to swap the underlying library.

  The container is mounted once in App.tsx; its look is driven by the design
  tokens in index.css, so toasts follow the active light/dark theme.

  Not for validation: a field that is wrong belongs next to the field. Toasts are
  for things that happened elsewhere — a request the server rejected, a record
  that was saved.
*/

import { toast } from 'react-toastify'
import type { ToastOptions } from 'react-toastify'

const base: ToastOptions = {
  position: 'top-right',
  autoClose: 4000,
  pauseOnHover: true,
  closeOnClick: true,
}

export const notify = {
  /** Something completed. Keep it short — "Credential created." */
  success: (message: string, options?: ToastOptions) =>
    toast.success(message, { ...base, ...options }),

  /**
   * Something failed. Pass a sentence the user can act on; `ApiError` and
   * `SecretCryptoError` messages are already written that way.
   */
  error: (message: string, options?: ToastOptions) =>
    // Failures stay put longer than successes — there is usually something to
    // read and decide about.
    toast.error(message, { ...base, autoClose: 6000, ...options }),

  info: (message: string, options?: ToastOptions) => toast.info(message, { ...base, ...options }),
}
