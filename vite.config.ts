import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Anthropic SDK uses Node globals — polyfill for browser
  define: {
    'process.env': {},
  },
  optimizeDeps: {
    exclude: [],
  },
})
