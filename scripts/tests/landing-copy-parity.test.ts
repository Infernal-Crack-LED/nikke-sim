/**
 * The landing page has two renderings — React (web/src/LandingPage.tsx) and the
 * server's no-JS body (src/server/static.ts) — and they used to hold
 * independent hand-copied literals of the same words. Nothing linked them and
 * nothing compared them, so a reworded blurb would change the visible page and
 * silently leave the indexed one stale.
 *
 * Both now build from src/share/site-identity.ts. This test is what keeps that
 * true: it asserts the server body actually contains every string the shared
 * module defines, so re-introducing a literal (or dropping a section) fails
 * here instead of rotting in Google's index unnoticed.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  GAME_NAME,
  HOME_CTAS,
  HOME_FEATURES,
  HOME_HERO_AFTER,
  HOME_HERO_BEFORE,
  HOME_SECTION_TITLE,
  SITE_NAME,
  dev,
  type HomeFeature,
} from '../../src/share/site-identity.js';

const STATIC_TS = readFileSync(path.resolve('src/server/static.ts'), 'utf8');
const LANDING_TSX = readFileSync(
  path.resolve('web/src/LandingPage.tsx'),
  'utf8'
);

/**
 * The landing page's PROSE — the sentences that get reworded, and therefore
 * the only things that can meaningfully drift. Neither renderer may inline
 * these, and the server body must contain all of them.
 */
const PROSE: [string, string][] = [
  ['hero (before)', HOME_HERO_BEFORE],
  ['hero (after)', HOME_HERO_AFTER],
  ['section title', HOME_SECTION_TITLE],
  ...HOME_FEATURES.flatMap((f: HomeFeature): [string, string][] => [
    [`feature ${f.href} title`, f.title],
    [`feature ${f.href} blurb`, f.blurb],
    [`feature ${f.href} cta`, f.cta],
  ]),
  ...HOME_CTAS.map((c: (typeof HOME_CTAS)[number]): [string, string] => [
    `hero cta ${c.href}`,
    c.label,
  ]),
  ['maiden blurb', dev.maiden.blurb],
  ['refittingroom blurb', dev.refittingroom.blurb],
];

/**
 * Proper nouns. These must reach the rendered body, but they legitimately
 * recur elsewhere in static.ts (route meta descriptions name the game too), so
 * they are exempt from the no-inlining rule — asserting on them would flag
 * unrelated copy as drift.
 */
const NAMES: [string, string][] = [
  ['site name', SITE_NAME],
  ['game name', GAME_NAME],
  ['refittingroom name', dev.refittingroom.name],
];

describe('landing page copy', () => {
  it('is not duplicated as literals in either renderer', () => {
    // The whole point: neither file may carry its own copy of the prose. If
    // one does, the two can diverge again and this suite would still pass on
    // the shared module alone.
    for (const [label, text] of PROSE) {
      if (text.length < 25) {
        continue; // short labels like "Build a Team" are unambiguous anyway
      }
      expect(STATIC_TS, `static.ts inlines ${label}`).not.toContain(text);
      expect(LANDING_TSX, `LandingPage.tsx inlines ${label}`).not.toContain(
        text
      );
    }
  });

  it('reaches the server body through the shared module', async () => {
    // Import the real module and render the real body, rather than trusting
    // that the import exists — a stale build or a dropped section shows up
    // here as missing text.
    const mod = (await import('../../src/server/static.js')) as Record<
      string,
      unknown
    >;
    const render = mod.homeStaticHtml as (() => string) | undefined;
    expect(
      typeof render,
      'static.ts must export homeStaticHtml for this test'
    ).toBe('function');

    const body = render!();
    for (const [label, text] of [...PROSE, ...NAMES]) {
      expect(body, `server body is missing ${label}`).toContain(
        text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      );
    }
  });

  it('keeps the refittingroom.app cross-link crawlable and followed', () => {
    // refittingroom.app server-renders its link back here, so this half has to
    // be server-rendered too or the pair is one-directional to a crawler.
    expect(STATIC_TS).toContain('dev.refittingroom.url');
    expect(STATIC_TS).not.toContain('nofollow');
  });
});
