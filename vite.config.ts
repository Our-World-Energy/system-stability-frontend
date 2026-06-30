import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Dev proxy target: the REST backend origin (derived from VITE_API_BASE_URL).
  // Lets the browser call /api/* same-origin, dodging CORS during local dev.
  let apiOrigin = 'http://149.28.112.32:18964'
  try {
    if (env.VITE_API_BASE_URL) apiOrigin = new URL(env.VITE_API_BASE_URL).origin
  } catch {
    /* keep default */
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
      },
    },
    preview: {
      port: 4000,
      proxy: {
        '/api': { target: apiOrigin, changeOrigin: true },
      },
    },
  }
})
