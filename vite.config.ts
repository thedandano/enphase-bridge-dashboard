import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: env.BRIDGE_API_URL
        ? {
            '/api': {
              target: env.BRIDGE_API_URL,
              changeOrigin: true,
            },
          }
        : undefined,
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      globals: true,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/test/**', 'src/main.tsx'],
        thresholds: {
          lines: 65,
          functions: 55,
          statements: 63,
          branches: 44,
        },
      },
    },
  }
})
