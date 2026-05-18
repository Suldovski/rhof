import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react()
  ],
  base: '/rhof/'  // ← LINHA CRUCIAL - use o nome EXATO do seu repositório
})
