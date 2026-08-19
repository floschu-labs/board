import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  // Load .env, .env.[mode] and process.env (prefix '' => include all).
  // Deploy targets are selected by build mode:
  //   default            -> base '/board/', local (browser) storage   [GitHub Pages]
  //   --mode cloudflare  -> base '/',        api storage              [.env.cloudflare]
  // The Docker build still works too: it sets VITE_BASE_URL/VITE_STORAGE_MODE as
  // real env vars, which loadEnv picks up here and Vite exposes to the client.
  const env = loadEnv(mode, process.cwd(), '')

  // Get version from environment variable (set by CI from release tag) or fallback to 'dev'
  const appVersion = (env.VITE_APP_VERSION || 'dev').replace(/^v/, '')

  // Base URL: '/board/' for GitHub Pages (default), '/' for self-hosted/Docker/Cloudflare
  const baseUrl = env.VITE_BASE_URL || '/board/'

  return {
    base: baseUrl,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/icon.svg'],
        manifest: {
          name: 'Board',
          short_name: 'Board',
          description: 'Privacy-focused, local-only Kanban board',
          theme_color: '#0f0f0f',
          background_color: '#0f0f0f',
          display: 'standalone',
          start_url: baseUrl,
          scope: baseUrl,
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Separate vendor chunks for better caching
            'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
            'vendor-ui': ['@headlessui/react', '@heroicons/react'],
            'vendor-zustand': ['zustand'],
          },
        },
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
  }
})
