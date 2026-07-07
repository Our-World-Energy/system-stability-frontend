// Dev-only mock of the health-status SSE server.
// No dependencies — serves text/event-stream at GET /sse/status so the
// dashboard shows live data without the real backend.
//
//   npm run mock:sse      # then run the app (default VITE_SSE_URL = localhost:3001)
//
// Not for production. Point the app at the real server via VITE_SSE_URL when ready.
import http from 'node:http'

const PORT = process.env.PORT || 3001
const now = () => new Date().toISOString()
const rt = () => 10 + Math.floor(Math.random() * 60)

// The 7 systems the real backend streams. `one_portal` starts null to exercise
// the "waiting for first check" (pending) UI, then fills on the first update.
const systems = {
  aurora: () => ({ status: 'none', updated_at: now(), payload: { indicator: 'none', description: 'All Systems Operational', response_time_ms: rt(), checked_at: now() } }),
  solo: () => ({ status: 'none', updated_at: now(), payload: { status: 'none', page_status: 'UP', http_status: 200, response_time_ms: rt(), active_incidents: 0, checked_at: now() } }),
  twentyi: () => ({ status: 'none', updated_at: now(), payload: { status: 'none', platform_status: 'none', http_status: 200, response_time_ms: rt(), detail: 'rss not configured', checked_at: now() } }),
  one_portal: () => ({ status: 'none', updated_at: now(), payload: { status: 'none', health_status: 'ok', http_status: 200, response_time_ms: rt(), endpoint: 'https://one.ourworldenergy.com', checked_at: now() } }),
  twilio: () => ({ status: 'minor', updated_at: now(), payload: { status: 'minor', indicator: 'minor', description: 'Partially Degraded Service', response_time_ms: rt(), checked_at: now() } }),
  cloudflare: () => ({ status: 'minor', updated_at: now(), payload: { status: 'minor', platform_status: 'minor', http_status: 200, response_time_ms: rt(), cert_days_left: 83, domain_days_left: 389, detail: 'Minor Service Outage', checked_at: now() } }),
  ringcentral: () => ({ status: 'major', updated_at: now(), payload: { status: 'major', worst_level: 'Warning', services_total: 78, services_good: 77, affected_services: ['Contact Center (Americas): Warning'], active_alerts: 1, api_probe_status: 'none', checked_at: now() } }),
}

const clients = new Set()
const write = (res, event, obj) => {
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(obj)}\n\n`)
  } catch {
    /* client gone */
  }
}

const server = http.createServer((req, res) => {
  if (!req.url || !req.url.startsWith('/sse/status')) {
    res.writeHead(404).end('not found')
    return
  }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  })
  // Snapshot on every (re)connect. one_portal null → pending card until first update.
  const snap = {}
  for (const [k, make] of Object.entries(systems)) snap[k] = k === 'one_portal' ? null : make()
  write(res, 'initial_snapshot', { type: 'initial_snapshot', systems: snap, sent_at: now() })
  clients.add(res)
  req.on('close', () => clients.delete(res))
})

// One system updates per tick; occasionally blip a card so you can watch it change.
const keys = Object.keys(systems)
const cycle = ['none', 'none', 'minor', 'none', 'major', 'none', 'critical', 'none', 'vendor_silent', 'none']
let i = 0
setInterval(() => {
  const system = keys[i % keys.length]
  const forced = cycle[Math.floor(i / keys.length) % cycle.length]
  i++
  const base = systems[system]()
  const msg = { type: 'status_update', system, status: forced, updated_at: now(), payload: { ...base.payload, status: forced, checked_at: now() } }
  for (const res of clients) write(res, 'status_update', msg)
}, 5000)

// Heartbeat comment every 25s (EventSource ignores comment lines).
setInterval(() => {
  for (const res of clients) {
    try {
      res.write(': ping\n\n')
    } catch {
      /* client gone */
    }
  }
}, 25000)

server.listen(PORT, () => console.log(`mock status SSE on http://localhost:${PORT}/sse/status`))
