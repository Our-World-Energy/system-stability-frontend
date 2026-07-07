import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useStatusStream } from '@/hooks/useStatusStream'
import { useStatusPoller } from '@/hooks/useStatusPoller'
import { resolveSseUrl } from '@/lib/ws-status'
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

const SSE_URL = resolveSseUrl()
// Live UI is SSE. VITE_STATUS_TRANSPORT=rest forces the REST poller instead —
// a debugging escape hatch (e.g. hosts that can't hold a long-lived SSE stream).
const REST_DEBUG = import.meta.env.VITE_STATUS_TRANSPORT === 'rest'

export default function App() {
  useStatusStream(SSE_URL, !REST_DEBUG)
  useStatusPoller(REST_DEBUG)
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
