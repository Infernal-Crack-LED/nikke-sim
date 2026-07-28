// Process entry for the nikke-sim web+API server — the TypeScript successor to
// scripts/serve.mjs (Phase 3, plan §6.4). Compiled by `npm run build:server`
// (esbuild → dist-server/index.js, @napi-rs/canvas + sharp external) and
// started with `node dist-server/index.js` (npm run start:server).
//
//   PORT                     bind port (Railway provides it; default 4173)
//   SERVE_DIST               static root (default <repo>/dist)
//   NIKKESIM_RENDER_CACHE_DIR      dynamic-render cache (default <repo>/.cache/infographics)
//   NIKKESIM_RENDER_CACHE_MAX_BYTES LRU cap (default 200 MB)
//   NIKKESIM_RENDER_SECRET   optional shared secret for bakery-bot (x-render-secret)
//   NIKKESIM_CONFIG_API      bakery-bot origin serving `?id=` shared configs
//   NIKKESIM_SITE_ORIGIN     public site origin used in the returned pageUrl
//   UMAMI_URL / UMAMI_WEBSITE_ID   analytics injection (omit to disable)
//
// env-defaults MUST stay the first import: it points the render host at the
// bundled font/portrait assets before fonts.ts evaluates (an unregistered
// family renders blank text SILENTLY — the ordering is load-bearing).
import './env-defaults.js';
import { createNikkesimServer } from './app.js';

// Railway provides $PORT. '0' (ephemeral) is honored — the startup log prints
// the actual bound port (used by the header tests).
const PORT = process.env.PORT ? Number(process.env.PORT) : 4173;

const server = await createNikkesimServer();
server.listen(PORT, '0.0.0.0', () => {
  const bound = server.address();
  console.log(
    `nikke-sim serving on 0.0.0.0:${bound && typeof bound === 'object' ? bound.port : PORT}`
  );
});
