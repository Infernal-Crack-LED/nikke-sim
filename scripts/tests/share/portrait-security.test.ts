// loadPortrait security + regression tests. The slug is ATTACKER-CONTROLLED
// on the render-API path (decoded build codes), so the traversal cases assert
// the slug never reaches join(PORTRAIT_DIR, …) — including a case that WOULD
// have succeeded pre-fix (a real decodable webp placed outside the portrait
// dir). The regex is also pinned against data/characters.json: an over-tight
// pattern would silently degrade real units to placeholder boxes on every
// card, and nothing else tests that.
//
// NIKKESIM_PORTRAIT_DIR is set in beforeAll and read LAZILY by portraits.ts
// (per call, not at import) — the dynamic import below is belt-and-braces.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Canvas } from '@napi-rs/canvas';
import { PORTRAIT_SLUG_RE } from '../../../src/infographics/node/portraits.js';

let dir: string;
let outsideFile: string;
let loadPortrait: (slug: string) => Promise<Canvas | null>;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'portrait-sec-'));
  process.env.NIKKESIM_PORTRAIT_DIR = dir;
  const sharp = (await import('sharp')).default;
  const webp = await sharp({
    create: { width: 8, height: 8, channels: 4, background: '#aabbcc' },
  })
    .webp()
    .toBuffer();
  writeFileSync(join(dir, 'crown-128.webp'), webp); // a "real" portrait
  // decodable webp OUTSIDE the dir — pre-fix, the traversal slug below
  // resolves to exactly this file and loadPortrait returns a canvas
  outsideFile = join(dir, '..', `evil-outside-${process.pid}-128.webp`);
  writeFileSync(outsideFile, webp);
  ({ loadPortrait } =
    await import('../../../src/infographics/node/portraits.js'));
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
  rmSync(outsideFile, { force: true });
  delete process.env.NIKKESIM_PORTRAIT_DIR;
});

describe('loadPortrait slug validation', () => {
  it('a real slug still loads its portrait', async () => {
    expect(await loadPortrait('crown')).not.toBeNull();
  });

  it('a traversal slug that resolves to a REAL file outside the dir returns null', async () => {
    // pre-fix: join(dir, '../evil-outside-<pid>-128.webp') exists and decodes
    expect(await loadPortrait(`../evil-outside-${process.pid}`)).toBeNull();
  });

  it('deep traversal and other non-slug shapes return null', async () => {
    expect(await loadPortrait('../../../../etc/hosts')).toBeNull();
    expect(await loadPortrait('..')).toBeNull();
    expect(await loadPortrait('Crown')).toBeNull(); // case-sensitive fs escape
    expect(await loadPortrait('a b')).toBeNull();
    expect(await loadPortrait('')).toBeNull();
  });

  it('a NIKKESIM_PORTRAIT_DIR change is not served the old dir’s cached entries', async () => {
    // The LRU is keyed on dir+slug: caching a MISS under dir A must not shadow
    // the same slug existing under dir B after the env var moves.
    const dirB = mkdtempSync(join(tmpdir(), 'portrait-sec-b-'));
    try {
      const sharp = (await import('sharp')).default;
      const webp = await sharp({
        create: { width: 8, height: 8, channels: 4, background: '#aabbcc' },
      })
        .webp()
        .toBuffer();
      writeFileSync(join(dirB, 'moved-128.webp'), webp);

      process.env.NIKKESIM_PORTRAIT_DIR = dir;
      expect(await loadPortrait('moved')).toBeNull(); // cached miss under dir A
      process.env.NIKKESIM_PORTRAIT_DIR = dirB;
      expect(await loadPortrait('moved')).not.toBeNull(); // found under dir B
      // …and the reverse: dir B's entries don't leak into dir A lookups
      process.env.NIKKESIM_PORTRAIT_DIR = dir;
      expect(await loadPortrait('moved')).toBeNull();
    } finally {
      process.env.NIKKESIM_PORTRAIT_DIR = dir;
      rmSync(dirB, { recursive: true, force: true });
    }
  });

  it('every characters.json slug passes the portrait regex', () => {
    const chars = JSON.parse(
      readFileSync(
        fileURLToPath(
          new URL('../../../data/characters.json', import.meta.url)
        ),
        'utf8'
      )
    ) as { characters: Record<string, unknown> };
    const bad = Object.keys(chars.characters).filter(
      (s) => !PORTRAIT_SLUG_RE.test(s)
    );
    expect(bad, `slugs degraded to placeholder boxes: ${bad}`).toEqual([]);
  });
});
