import axios from 'axios'
import { TOKEN_KEY, clearStoredSession } from './auth-storage'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // A 401 from /auth/* is the normal answer to bad credentials or a wrong OTP —
    // the form renders it inline. Only an expired session on a regular call should
    // wipe the token and bounce to the login page.
    const url: string = err.config?.url ?? ''
    if (err.response?.status === 401 && !url.startsWith('/auth/')) {
      clearStoredSession()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)
