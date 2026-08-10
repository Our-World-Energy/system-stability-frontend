import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useThemeStore } from '@/store/theme'
import { useStatusStream } from '@/hooks/useStatusStream'
import { useStatusPoller } from '@/hooks/useStatusPoller'
import { useSessionWatch } from '@/hooks/useSessionWatch'
import { resolveSseUrl } from '@/lib/ws-status'
import { AnalyticsObserver } from '@/analytics/AnalyticsObserver'
import { AppLayout } from '@/components/layout/AppLayout'
import { RequireAuth, RequireSession } from '@/components/auth/RequireAuth'
import { RequireRole } from '@/components/auth/RequireRole'
import { Login } from '@/pages/auth/Login'
import { ChangePassword } from '@/pages/auth/ChangePassword'
import { ForgotPassword } from '@/pages/auth/ForgotPassword'
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

// The dashboard sits behind the login screen. Sign-in is real now — it posts to
// the user-management service and needs a provisioned account — so
// VITE_REQUIRE_AUTH=false is the way to open the dashboard without one (note the
// user registry still needs a real org_admin token, since the API enforces that).
const REQUIRE_AUTH = import.meta.env.VITE_REQUIRE_AUTH !== 'false'

export default function App() {
  useStatusStream(SSE_URL, !REST_DEBUG)
  useStatusPoller(REST_DEBUG)
  // Notices a session invalidated in another tab (role change, disable) instead of
  // waiting for the user to happen to open a page that calls the API.
  useSessionWatch()
  // Toasts follow the app theme rather than defaulting to toastify's own light
  // palette, which would flash white over the dark shell.
  const theme = useThemeStore((s) => s.theme)
  return (
    <QueryClientProvider client={queryClient}>
      <ToastContainer
        theme={theme}
        newestOnTop
        limit={3}
        // Modals sit at z-50; toasts must clear them to be readable at all.
        style={{ zIndex: 9999 }}
      />
      <BrowserRouter>
        {/* Inside the router because it tracks route changes; one mount only. */}
        <AnalyticsObserver />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          {/* Reached from the emailed link, which carries ?token=… */}
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Signed in but still on the temporary password. Guarded by session
              only — RequireAuth redirects *to* here, so using it would loop. */}
          <Route element={REQUIRE_AUTH ? <RequireSession /> : <Outlet />}>
            <Route path="/change-password" element={<ChangePassword />} />
          </Route>

          <Route element={REQUIRE_AUTH ? <RequireAuth /> : <Outlet />}>
            <Route element={<AppLayout />}>
              {/* Role-restricted routes are declared in src/config/navigation.ts;
                  RequireRole applies them to every child at once. */}
              <Route element={<RequireRole />}>
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
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
