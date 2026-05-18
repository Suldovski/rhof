import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/rhof/',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  resolve: {
    alias: {
      // NOVO: Resolve o módulo problemático sem usar /dev/null
      '@tanstack/start-storage-context': '@tanstack/start-storage-context/browser'
    }
  },
  optimizeDeps: {
    exclude: ['@tanstack/start-storage-context', '@tanstack/start-client-core']
  },
  ssr: {
    noExternal: [],
    target: 'web'
  }
})
