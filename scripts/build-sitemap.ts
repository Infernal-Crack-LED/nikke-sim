// Generate web/public/sitemap.xml from the canonical route list + per-unit pages.
// Run before `vite build` so the sitemap is copied into dist/.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import charactersJson from '../data/characters.json' with { type: 'json' };

const SITE = 'https://nikkesim.app';
const OUT = join(
  fileURLToPath(new URL('..', import.meta.url)),
  'web/public/sitemap.xml'
);

const PRIORITY = {
  home: 1.0,
  rankings: 0.9,
  overload: 0.9,
  tools: 0.8,
  generators: 0.8,
  unit: 0.7,
  reference: 0.6,
  info: 0.5,
  meta: 0.3,
} as const;

const ROUTES: Array<{ path: string; priority: number }> = [
  { path: '/', priority: PRIORITY.home },
  { path: '/ranks', priority: PRIORITY.rankings },
  { path: '/ranks/support', priority: PRIORITY.rankings },
  { path: '/ranks/compare', priority: PRIORITY.rankings },
  { path: '/overload', priority: PRIORITY.overload },
  { path: '/olsim', priority: PRIORITY.overload },
  { path: '/charge', priority: PRIORITY.overload },
  { path: '/team', priority: PRIORITY.generators },
  { path: '/roster', priority: PRIORITY.generators },
  { path: '/rostersim', priority: PRIORITY.generators },
  { path: '/characters', priority: PRIORITY.rankings },
  { path: '/teambuilder', priority: PRIORITY.tools },
  { path: '/builder', priority: PRIORITY.tools },
  { path: '/doll', priority: PRIORITY.tools },
  { path: '/resources', priority: PRIORITY.tools },
  { path: '/roster-sync', priority: PRIORITY.reference },
  { path: '/mechanics', priority: PRIORITY.reference },
  { path: '/howto', priority: PRIORITY.reference },
  { path: '/testing-requests', priority: PRIORITY.info },
  { path: '/patch-notes', priority: PRIORITY.info },
  { path: '/dev', priority: PRIORITY.meta },
  { path: '/credits', priority: PRIORITY.meta },
];

export function generateSitemap(): string {
  const data = charactersJson as { characters: Record<string, unknown> };

  // Every character gets a /unit/:slug page. The route exists for all of them,
  // the DPS chart links them, and the sitemap should be consistent with that.
  // Thin pages (no optimal overload-line data yet) are a content problem, not a
  // discovery problem; omitting them here while linking them elsewhere would be
  // an inconsistent crawl policy.
  const slugs = Object.keys(data.characters).sort();
  const routes = [
    ...ROUTES,
    ...slugs.map((slug) => ({ path: `/unit/${slug}`, priority: PRIORITY.unit })),
  ];

  const urlset = routes
    .map(
      (r) =>
        `  <url>\n    <loc>${SITE}${r.path}</loc>\n    <priority>${r.priority.toFixed(1)}</priority>\n  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlset}\n</urlset>\n`;
}

function main() {
  const xml = generateSitemap();
  writeFileSync(OUT, xml, 'utf8');
  const routeCount = (xml.match(/<url>/g) ?? []).length;
  console.log(`sitemap: wrote ${routeCount} URLs to ${OUT}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
