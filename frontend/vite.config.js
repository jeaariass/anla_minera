import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/TU_MINA/',  // 👈 porque el frontend vive en /TU_MINA
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // en dev local
        changeOrigin: true,
      },
    },
  },
})
