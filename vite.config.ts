import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react()
  ],
  base: '/rhof/',  // ← importante para o GitHub Pages
  define: {
    'import.meta.env.SSR': false,  // Força ambiente browser
  },
  optimizeDeps: {
    exclude: ['@tanstack/start-storage-context']  // ← Ignora este pacote
  },
  ssr: {
    noExternal: [],  // Garante que nada seja tratado como SSR
  }
})
