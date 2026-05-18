import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/rhof/',  // ← Nome do seu repositório
  define: {
    'process.env.NODE_ENV': '"production"',
  }
})
