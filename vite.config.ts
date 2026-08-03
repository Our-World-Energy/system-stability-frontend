import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Refuse to ship the RSA private key.
  //
  // Every VITE_-prefixed variable is compiled into the JavaScript bundle in
  // plaintext, and .env is loaded underneath .env.production — so a developer's
  // local private key rides into a production build unless it is explicitly
  // blanked. That failure is silent and unrecoverable once published, which is
  // why it stops the build rather than warning.
  if (command === 'build' && mode === 'production' && env.VITE_CREDENTIAL_PRIVATE_KEY?.trim()) {
    throw new Error(
      'VITE_CREDENTIAL_PRIVATE_KEY is set for this production build. It would be readable by ' +
        'anyone who opens the bundle. Set it empty in .env.production (or unset it in the host ' +
        "environment) — production has no legitimate use for the private half, and decryption " +
        'belongs behind an authenticated service.',
    )
  }

  // Dev proxy target: the Go stability service origin (derived from
  // VITE_API_BASE_URL). Serves both /api/* (REST) and /sse/status (stream), so
  // the browser can hit them same-origin, dodging CORS during local dev.
  // Default to a locally-run Go service; override via VITE_API_BASE_URL.
  let apiOrigin = 'http://localhost:8080'
  try {
    if (env.VITE_API_BASE_URL) apiOrigin = new URL(env.VITE_API_BASE_URL).origin
  } catch {
    /* keep default */
  }

  // The credential manager (owe-stability-service) is a different service on a
  // different port, and it sends no CORS headers — so the browser must reach it
  // same-origin. `/stability/*` is proxied to `<origin>/api/owe-stability-service/*`,
  // which is the prefix lib/api/client.ts posts to.
  const stabilityOrigin = env.VITE_STABILITY_SERVICE_ORIGIN || 'http://149.28.112.32:28753'
  const stabilityProxy = {
    '/stability': {
      target: stabilityOrigin,
      changeOrigin: true,
      rewrite: (p: string) => p.replace(/^\/stability/, '/api/owe-stability-service'),
    },
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor'
            if (id.includes('node_modules/react-router-dom')) return 'router'
            if (id.includes('node_modules/@tanstack')) return 'query'
          },
        },
      },
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api': { target: apiOrigin, changeOrigin: true },
        // Plain HTTP streaming (SSE), not a WebSocket upgrade → ws: false.
        '/sse': { target: apiOrigin, changeOrigin: true, ws: false },
        ...stabilityProxy,
      },
    },
    preview: {
      port: 4000,
      proxy: {
        '/api': { target: apiOrigin, changeOrigin: true },
        '/sse': { target: apiOrigin, changeOrigin: true, ws: false },
        ...stabilityProxy,
      },
    },
  }
})
