import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useStatusSocket } from '@/hooks/useStatusSocket'
import { useStatusPoller } from '@/hooks/useStatusPoller'
import { resolveWsUrl } from '@/lib/ws-status'
import { AppLayout } from '@/components/layout/AppLayout'
import { Dashboard } from '@/pages/Dashboard'
import { Monitoring } from '@/pages/Monitoring'
import { Incidents } from '@/pages/Incidents'
import { Analytics } from '@/pages/Analytics'
import { Stability } from '@/pages/Stability'
import { Performance } from '@/pages/Performance'
import { Settings } from '@/pages/Settings'
import { NotFound } from '@/pages/NotFound'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 2 },
  },
})

const WS_URL = resolveWsUrl()
// 'rest' = poll the REST endpoints (fallback when the WebSocket isn't reachable).
const REST_MODE = import.meta.env.VITE_STATUS_TRANSPORT === 'rest'

export default function App() {
  useStatusSocket(WS_URL, !REST_MODE)
  useStatusPoller(REST_MODE)
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="alerts" element={<Incidents />} />
            <Route path="reviewer-inbox" element={<Monitoring />} />
            <Route path="slos" element={<Stability />} />
            <Route path="audit-log" element={<Analytics />} />
            <Route path="baselines" element={<Performance />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
