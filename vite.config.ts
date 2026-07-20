import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// The backend the dev server proxies API calls to (the same default as
// web/src/auth.ts BACKEND_ORIGIN). Override with VITE_API_BASE if needed.
const BACKEND =
  process.env.VITE_API_BASE ?? 'https://appweb-production-a479.up.railway.app';

export default defineConfig({
  root: 'web',
  publicDir: 'public', // static assets served at root (images, robots.txt, sitemap.xml)
  plugins: [react()],
  // Dev-only: forward /api (and /auth) to the backend server-side so localhost
  // dev isn't blocked by CORS (the backend only allowlists the deployed sim
  // origins). Production builds hit the backend origin directly. See auth.ts.
  server: {
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true, secure: true },
      '/auth': { target: BACKEND, changeOrigin: true, secure: true },
    },
  },
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // React lives in its own chunk, shared by the entry and every lazy
        // route chunk — one framework instance app-wide (also lets browsers
        // keep caching the framework across app-code deploys).
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client'],
        },
      },
    },
  },
});
