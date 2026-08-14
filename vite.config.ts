/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Decryption no longer happens in the browser — the RSA private key lives in the
  // Cloudflare Worker (see workers/decrypt), reached via VITE_DECRYPT_WORKER_URL —
  // so there is no private key to keep out of the bundle here.

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
  // One prefix covers the whole service: `/stability/*` is proxied to
  // `<origin>/api/owe-stability-service/*`, which serves both credential-manager/*
  // and user-management/*. Only one rewrite is needed because both halves are on
  // this origin — if user management ever moves to a host of its own again, give it
  // its own prefix here and point VITE_USER_MANAGEMENT_URL at it.
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
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom'))
              return 'vendor'
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
    // Vitest: the per-file `@vitest-environment` pragmas still pick jsdom vs node;
    // this only loads the shared setup (see src/test-setup.ts).
    test: {
      setupFiles: ['./src/test-setup.ts'],
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
