import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Bind 0.0.0.0 so a phone on the same Wi-Fi can reach the dev server.
    // Only this port is exposed — /api is proxied server-side to 127.0.0.1:5174,
    // so the API and the SQLite file are never reachable from the network.
    host: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:5190', changeOrigin: true },
    },
  },
})
