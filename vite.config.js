import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window',
  },
  server: {
    proxy: {
      '/api': {
        // target: 'http://localhost:8082',
        target: 'https://sep490g37sum26java-production-0ff1.up.railway.app',
        changeOrigin: true,
      },
      '/ws': {
        // target: 'http://localhost:8081/api',
        target: 'https://sep490g37sum26java-production-0ff1.up.railway.app/api',
        ws: true,
        changeOrigin: true,
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  }
})

