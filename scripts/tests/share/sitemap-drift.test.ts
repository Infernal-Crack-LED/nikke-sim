// The committed sitemap must be in sync with characters.json. The integration
// tests assert every advertised URL is a known route, but they are blind to
// newly added units. Regenerating the XML in-memory and comparing bytes catches
// additions (and any formatting drift) because the generator is deterministic.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generateSitemap } from '../../build-sitemap.js';
import { ROUTES, hrefFor } from '../../../web/src/router.js';

const SITEMAP = new URL('../../../web/public/sitemap.xml', import.meta.url);

describe('sitemap.xml is up to date with scripts/build-sitemap.ts', () => {
  it('committed sitemap matches the generator output byte-for-byte', () => {
    const committed = readFileSync(SITEMAP, 'utf8');
    const generated = generateSitemap();
    expect(generated).toBe(committed);
  });

  it('advertises every client-side route from web/src/router.ts', () => {
    const generated = generateSitemap();
    const locs = new Set(
      Array.from(generated.matchAll(/<loc>([^<]+)<\/loc>/g)).map(
        (m) => new URL(m[1]).pathname
      )
    );
    for (const route of ROUTES) {
      expect(locs).toContain(hrefFor(route));
    }
  });
});
