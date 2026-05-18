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
      // Substitui o módulo problemático por um stub vazio
      '@tanstack/start-storage-context': '/dev/null'
    }
  },
  build: {
    rollupOptions: {
      external: ['node:async_hooks'],  // Exclui do bundle
    }
  }
})
