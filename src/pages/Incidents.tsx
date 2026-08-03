export function Incidents() {
  const incidents = [
    {
      id: 'INC-001',
      severity: 'High',
      title: 'Memory leak in node-07',
      status: 'Open',
      time: '14m ago',
    },
    {
      id: 'INC-002',
      severity: 'Medium',
      title: 'Elevated error rate on API v2',
      status: 'Investigating',
      time: '1h ago',
    },
    {
      id: 'INC-003',
      severity: 'Low',
      title: 'SSL certificate expiring in 7 days',
      status: 'Open',
      time: '3h ago',
    },
    {
      id: 'INC-004',
      severity: 'High',
      title: 'Database connection pool exhausted',
      status: 'Resolved',
      time: '1d ago',
    },
  ]

  const severityColor: Record<string, string> = {
    High: 'bg-red-100 text-red-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    Low: 'bg-blue-100 text-blue-700',
  }
  const statusColor: Record<string, string> = {
    Open: 'text-red-600',
    Investigating: 'text-yellow-600',
    Resolved: 'text-green-600',
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Incidents</h1>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-5 py-3 text-left font-medium text-slate-500">ID</th>
              <th className="px-5 py-3 text-left font-medium text-slate-500">Severity</th>
              <th className="px-5 py-3 text-left font-medium text-slate-500">Title</th>
              <th className="px-5 py-3 text-left font-medium text-slate-500">Status</th>
              <th className="px-5 py-3 text-left font-medium text-slate-500">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {incidents.map((inc) => (
              <tr key={inc.id} className="transition-colors hover:bg-slate-50">
                <td className="px-5 py-3 font-mono text-slate-600">{inc.id}</td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${severityColor[inc.severity]}`}
                  >
                    {inc.severity}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-700">{inc.title}</td>
                <td className={`px-5 py-3 font-medium ${statusColor[inc.status]}`}>{inc.status}</td>
                <td className="px-5 py-3 text-slate-400">{inc.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
