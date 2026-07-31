import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useStatusStream } from '@/hooks/useStatusStream'
import { useStatusPoller } from '@/hooks/useStatusPoller'
import { resolveSseUrl } from '@/lib/ws-status'
import { AppLayout } from '@/components/layout/AppLayout'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { Login } from '@/pages/auth/Login'
import { ForgotPassword } from '@/pages/auth/ForgotPassword'
import { VerifyOtp } from '@/pages/auth/VerifyOtp'
import { ResetPassword } from '@/pages/auth/ResetPassword'
import { Dashboard } from '@/pages/Dashboard'
import { Monitoring } from '@/pages/Monitoring'
import { Incidents } from '@/pages/Incidents'
import { Analytics } from '@/pages/Analytics'
import { Stability } from '@/pages/Stability'
import { Performance } from '@/pages/Performance'
import { Settings } from '@/pages/Settings'
import { CredentialManager } from '@/pages/CredentialManager'
import { UserManagement } from '@/pages/UserManagement'
import { RequestLogs } from '@/pages/RequestLogs'
import { CredentialManagement } from '@/pages/CredentialManagement'
import { ActivityLedger } from '@/pages/ActivityLedger'
import { PendingApprovals } from '@/pages/PendingApprovals'
import { NotFound } from '@/pages/NotFound'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 2 },
  },
})

const SSE_URL = resolveSseUrl()
// Live UI is SSE. VITE_STATUS_TRANSPORT=rest forces the REST poller instead —
// a debugging escape hatch (e.g. hosts that can't hold a long-lived SSE stream).
const REST_DEBUG = import.meta.env.VITE_STATUS_TRANSPORT === 'rest'

// The dashboard sits behind the login screen. Sign-in is stubbed in lib/auth-api
// for now (any credentials pass), so this is safe to leave on — set
// VITE_REQUIRE_AUTH=false to open the dashboard directly while working on it.
const REQUIRE_AUTH = import.meta.env.VITE_REQUIRE_AUTH !== 'false'

export default function App() {
  useStatusStream(SSE_URL, !REST_DEBUG)
  useStatusPoller(REST_DEBUG)
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route element={REQUIRE_AUTH ? <RequireAuth /> : <Outlet />}>
            <Route element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="alerts" element={<Incidents />} />
              <Route path="reviewer-inbox" element={<Monitoring />} />
              <Route path="slos" element={<Stability />} />
              <Route path="audit-log" element={<Analytics />} />
              <Route path="baselines" element={<Performance />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="credentials" element={<CredentialManager />} />
              <Route path="credentials/logs" element={<RequestLogs />} />
              <Route path="credentials/admin" element={<CredentialManagement />} />
              <Route path="credentials/admin/logs" element={<ActivityLedger />} />
              <Route path="credentials/admin/pending" element={<PendingApprovals />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
