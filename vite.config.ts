/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Refuse to ship the RSA private key — unless a demo build explicitly opts in.
  //
  // Every VITE_-prefixed variable is compiled into the JavaScript bundle in
  // plaintext, and .env is loaded underneath .env.production — so a developer's
  // local private key would ride into a production build unless it is blanked.
  // That leak is silent and unrecoverable once published, so by default it stops
  // the build.
  //
  // The one sanctioned exception is a throwaway DEMO build that sets
  // VITE_ALLOW_PRIVATE_KEY_IN_BUILD=true, to show client-side decryption before
  // the Cloudflare Worker decryption path exists. The flag keeps the leak
  // deliberate and visible instead of accidental: anything shipped this way is
  // readable by anyone and MUST be rotated before real use.
  const shippingPrivateKey = Boolean(env.VITE_CREDENTIAL_PRIVATE_KEY?.trim())
  const allowPrivateKeyInBuild = env.VITE_ALLOW_PRIVATE_KEY_IN_BUILD === 'true'
  if (command === 'build' && mode === 'production' && shippingPrivateKey) {
    if (!allowPrivateKeyInBuild) {
      throw new Error(
        'VITE_CREDENTIAL_PRIVATE_KEY is set for this production build. It would be readable by ' +
          'anyone who opens the bundle. Blank it in .env.production (or unset it in the host ' +
          'environment) — or, for a throwaway demo only, set VITE_ALLOW_PRIVATE_KEY_IN_BUILD=true ' +
          'to opt in deliberately. Decryption belongs behind an authenticated service.',
      )
    }
    console.warn(
      '\n⚠  Shipping VITE_CREDENTIAL_PRIVATE_KEY in this production bundle ' +
        '(VITE_ALLOW_PRIVATE_KEY_IN_BUILD=true).\n' +
        '   The key is readable by anyone who opens the site. Demo use only — ' +
        'rotate the key and remove the flag before real use.\n',
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
