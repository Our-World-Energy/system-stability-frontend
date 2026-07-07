// Dev-only mock of the health-status WebSocket server.
// No dependencies — implements just enough of the WS protocol to push
// initial_snapshot + periodic status_update frames to the dashboard.
//
//   npm run mock:ws      # then run the app with default VITE_WS_URL (localhost:3001)
//
// Not for production. Point the app at the real server via VITE_WS_URL /
// VITE_API_BASE_URL when it's available.
import http from 'node:http'
import crypto from 'node:crypto'

const PORT = process.env.PORT || 3001
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
const clients = new Set()

function encode(str) {
  const data = Buffer.from(str)
  const len = data.length
  let header
  if (len < 126) {
    header = Buffer.from([0x81, len])
  } else if (len < 65536) {
    header = Buffer.alloc(4)
    header[0] = 0x81
    header[1] = 126
    header.writeUInt16BE(len, 2)
  } else {
    header = Buffer.alloc(10)
    header[0] = 0x81
    header[1] = 127
    header.writeBigUInt64BE(BigInt(len), 2)
  }
  return Buffer.concat([header, data])
}
const send = (sock, obj) => {
  try {
    sock.write(encode(JSON.stringify(obj)))
  } catch {
    /* client gone */
  }
}
const now = () => new Date().toISOString()
const rt = () => 10 + Math.floor(Math.random() * 60)

const snapshot = () => ({
  type: 'initial_snapshot',
  systems: {
    aurora: { status: 'none', updated_at: now(), payload: { response_time_ms: rt(), description: 'All Systems Operational' } },
    solo: { status: 'none', updated_at: now(), payload: { response_time_ms: rt(), page_status: 'UP', active_incidents: 0 } },
    twentyi: { status: 'none', updated_at: now(), payload: { response_time_ms: rt(), description: 'All Systems Operational' } },
    one_portal: { status: 'none', updated_at: now(), payload: { status: 'none', http_status: 200, response_time_ms: rt(), health_status: 'ok' } },
    twilio: { status: 'none', updated_at: now(), payload: { indicator: 'none', description: 'All Systems Operational', response_time_ms: rt() } },
    cloudflare: { status: 'none', updated_at: now(), payload: { response_time_ms: rt(), platform_status: 'none', cert_days_left: 62, domain_days_left: 210 } },
  },
  sent_at: now(),
})

const server = http.createServer()
server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key']
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64')
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  )
  clients.add(socket)
  socket.on('close', () => clients.delete(socket))
  socket.on('error', () => clients.delete(socket))
  send(socket, snapshot())
})

// Mostly healthy, occasionally a blip, so you can watch a card change live.
const cycle = ['none', 'none', 'minor', 'none', 'major', 'none', 'critical', 'none', 'vendor_silent', 'none']
const rotation = ['aurora', 'solo', 'twentyi', 'one_portal', 'twilio', 'cloudflare']
let i = 0
setInterval(() => {
  const system = rotation[i % rotation.length]
  const status = cycle[Math.floor(i / rotation.length) % cycle.length]
  i++
  const payload =
    system === 'solo'
      ? { response_time_ms: rt(), page_status: status === 'none' ? 'UP' : 'DEGRADED', active_incidents: status === 'none' ? 0 : 1 }
      : system === 'cloudflare'
        ? {
            response_time_ms: rt(),
            // platform stays separate from the cert/domain countdowns (spec).
            platform_status: status === 'vendor_silent' ? 'none' : status,
            cert_days_left: status === 'minor' ? 18 : 62,
            domain_days_left: status === 'major' ? 5 : 210,
          }
        : { response_time_ms: rt(), description: status === 'none' ? 'All Systems Operational' : `Status: ${status}` }
  for (const c of clients) send(c, { type: 'status_update', system, status, updated_at: now(), payload })
}, 5000)

server.listen(PORT, () => console.log(`mock status WS on ws://localhost:${PORT}/ws/status`))
