import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Bind 0.0.0.0 so a phone on the same Wi-Fi can reach the dev server.
    // Only this port is exposed — /api is proxied server-side to 127.0.0.1:5190,
    // so the API and the SQLite file are never reachable from the network.
    host: true,
    proxy: {
      // `npm run dev` hands the same environment to the API and to Vite. A launcher
      // that sets PORT (the desktop app's preview does, to 3000) moves the API off
      // 5190, and a proxy still pointing at 5190 then answered every call with 500.
      '/api': { target: `http://127.0.0.1:${process.env.PORT || 5190}`, changeOrigin: true },
    },
  },
})
