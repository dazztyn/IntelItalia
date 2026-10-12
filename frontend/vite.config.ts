import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // En desarrollo, /api va a la API local; en Docker lo hace Nginx (nginx.conf).
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
