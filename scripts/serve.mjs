// Minimal zero-dependency static file server for the built site (dist/).
// Used as the Railway start command. Binds to $PORT (Railway provides it) on
// 0.0.0.0. Serves dist/, falling back to index.html so the SPA always loads.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const PORT = Number(process.env.PORT) || 4173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

async function send(res, file, status = 200) {
  const body = await readFile(file);
  const type = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
  // hashed assets are immutable; index.html must always revalidate
  const cache = file.endsWith('index.html')
    ? 'no-cache'
    : 'public, max-age=31536000, immutable';
  res.writeHead(status, { 'content-type': type, 'cache-control': cache });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    // block path traversal, then resolve within dist/
    const rel = normalize(url).replace(/^(\.\.[/\\])+/, '');
    let file = join(DIST, rel);
    if (!file.startsWith(DIST)) file = join(DIST, 'index.html');

    try {
      const s = await stat(file);
      if (s.isDirectory()) file = join(file, 'index.html');
    } catch {
      file = join(DIST, 'index.html'); // SPA fallback
    }
    await send(res, file);
  } catch {
    // last-resort fallback
    try {
      await send(res, join(DIST, 'index.html'));
    } catch {
      res.writeHead(500).end('server error');
    }
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`nikke-sim serving ${DIST} on 0.0.0.0:${PORT}`);
});
