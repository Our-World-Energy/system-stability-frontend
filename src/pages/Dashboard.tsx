import { Activity, AlertTriangle, CheckCircle, Zap } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'

const stats = [
  { label: 'System Uptime', value: '99.97%', icon: CheckCircle, trend: '0.02% vs last week', trendUp: true, accent: 'green' as const },
  { label: 'Active Alerts', value: '3', icon: AlertTriangle, trend: '2 resolved today', trendUp: false, accent: 'yellow' as const },
  { label: 'Avg Response Time', value: '142ms', icon: Activity, trend: '18ms faster', trendUp: true, accent: 'blue' as const },
  { label: 'Throughput', value: '2.4k/s', icon: Zap, trend: '12% increase', trendUp: true, accent: 'green' as const },
]

const recentEvents = [
  { id: 1, type: 'resolved', message: 'High CPU usage on node-03 resolved', time: '2m ago' },
  { id: 2, type: 'alert', message: 'Memory threshold exceeded on node-07', time: '14m ago' },
  { id: 3, type: 'info', message: 'Scheduled maintenance completed', time: '1h ago' },
  { id: 4, type: 'resolved', message: 'Network latency spike resolved', time: '2h ago' },
]

const eventColor: Record<string, string> = {
  alert: 'bg-yellow-500',
  resolved: 'bg-green-500',
  info: 'bg-blue-500',
}

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Owe System Stability Platform — real-time overview</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* System Health */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-4">System Health</h2>
          <div className="space-y-3">
            {[
              { label: 'API Gateway', value: 98, status: 'healthy' },
              { label: 'Database Cluster', value: 95, status: 'healthy' },
              { label: 'Message Queue', value: 72, status: 'warning' },
              { label: 'Cache Layer', value: 99, status: 'healthy' },
              { label: 'Load Balancer', value: 88, status: 'healthy' },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{item.label}</span>
                  <span className={item.status === 'warning' ? 'text-yellow-600' : 'text-green-600'}>
                    {item.value}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${item.status === 'warning' ? 'bg-yellow-400' : 'bg-green-500'}`}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Events */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Recent Events</h2>
          <ul className="space-y-3">
            {recentEvents.map((ev) => (
              <li key={ev.id} className="flex items-start gap-3">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${eventColor[ev.type]}`} />
                <div className="min-w-0">
                  <p className="text-sm text-slate-700 leading-snug">{ev.message}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{ev.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
