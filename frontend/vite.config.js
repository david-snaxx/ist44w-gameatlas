import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // During development, pass /api requests on to the backend. The browser then sees one address, so there is
    // no CORS setup and the login cookie just works.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
