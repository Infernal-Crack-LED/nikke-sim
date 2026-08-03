// The committed content-pages.json must match what the generator produces from
// web/src/{mechanics,howto}-data.ts. Both servers read the COMMITTED file at
// startup, so an edit to the prose that never re-ran the generator would leave
// crawlers reading older copy than the rendered page shows — the same drift
// data/unit-pages.json exists to prevent for the unit pages. Byte-comparing a
// deterministic generator against the committed artifact catches it.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generateContentPages } from '../../build-content-pages.js';
import {
  intro as mechIntro,
  sections as mechSections,
} from '../../../web/src/mechanics-data.js';
import { sections as howtoSections } from '../../../web/src/howto-data.js';

const COMMITTED = new URL(
  '../../../web/public/content-pages.json',
  import.meta.url
);

const pages = () =>
  (JSON.parse(generateContentPages()) as { pages: Record<string, string> })
    .pages;

describe('content-pages.json is up to date with scripts/build-content-pages.ts', () => {
  it('committed artifact matches the generator output byte-for-byte', () => {
    expect(generateContentPages()).toBe(readFileSync(COMMITTED, 'utf8'));
  });

  it('carries a body for exactly the routes the servers inject', () => {
    expect(Object.keys(pages()).sort()).toEqual(['howto', 'mechanics']);
  });

  // Section titles carry ampersands ("Snipers & Rocket Launchers"), so compare
  // against the DECODED body — that checks the heading survived AND that it was
  // entity-encoded on the way in, without restating the generator's escaper.
  const decode = (s: string) =>
    s
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&');

  it('renders every section heading from the source modules', () => {
    const { mechanics, howto } = pages();
    for (const s of mechSections) {
      expect(decode(mechanics)).toContain(`<h2>${s.title}</h2>`);
    }
    for (const s of howtoSections) {
      expect(decode(howto)).toContain(`<h2>${s.title}</h2>`);
    }
  });

  it('escapes HTML rather than emitting raw prose into the body', () => {
    // The prose is authored as plain text; a stray & or < must not be able to
    // close the injected <div id="root"> early and truncate the page. Every &
    // in the output must therefore be the start of an entity.
    for (const html of Object.values(pages())) {
      expect(html).not.toMatch(/&(?!(amp|lt|gt|quot|#\d+);)/);
    }
    expect(pages().mechanics).toContain(mechIntro.replace(/&/g, '&amp;'));
  });

  it('is substantial enough to be worth indexing', () => {
    // The regression this guards is a body that silently renders to nothing —
    // /mechanics served exactly 1 character of body text to non-JS crawlers
    // while the prerender step it relied on was unreachable from the deploy.
    for (const [route, html] of Object.entries(pages())) {
      const text = html
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      expect(text.length, `${route} crawler-visible text`).toBeGreaterThan(
        2000
      );
    }
  });
});
