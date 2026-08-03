// Unit tests for the portrait-thumbnail helpers (scripts/lib/portrait-thumbs.ts):
// the coverage predicate the `--check` report and the build-time fill both use,
// the crop framing, and the sharp fill pipeline itself.
//
// NOT asserted here: roster coverage ("every unit has a committed thumb"). That
// is a real condition — it is the bug that shipped placeholder cards for four
// units — but as a test it would redden the whole gate the moment a data sync
// adds a unit, in worktrees that may have neither network nor a browser to fix
// it. It is reported by `npm run thumbs -- --check` (advisory in verify.sh) and
// self-healed by build-infographics' portrait gate instead.
import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { PORTRAIT_CROP_TOP } from '../../../src/infographics/core/canvas2d.js';
import {
  PORTRAIT_TIERS,
  hasAllTiers,
  missingThumbs,
  portraitUnits,
  renderThumbTiers,
  squarePortraitCrop,
  thumbPath,
} from '../../lib/portrait-thumbs.js';

/** A stand-in for the CDN's 256×512 character art. */
const sourceArt = (w = 256, h = 512): Promise<Buffer> =>
  sharp({
    create: { width: w, height: h, channels: 4, background: '#123456' },
  })
    .png()
    .toBuffer();

describe('squarePortraitCrop', () => {
  it('takes the largest square, centred horizontally, anchored down the overflow', () => {
    // 256×512 art: the square is the full width, and its top sits
    // PORTRAIT_CROP_TOP of the way down the 256px of vertical overflow — the
    // framing web/src/portraitThumb.ts and gen-portrait-thumbs.ts also use.
    expect(squarePortraitCrop(256, 512)).toEqual({
      left: 0,
      top: Math.round(256 * PORTRAIT_CROP_TOP),
      side: 256,
    });
  });

  it('never crops outside a source that is already square or wide', () => {
    expect(squarePortraitCrop(300, 300)).toEqual({
      left: 0,
      top: 0,
      side: 300,
    });
    expect(squarePortraitCrop(400, 200)).toEqual({
      left: 100,
      top: 0,
      side: 200,
    });
  });
});

describe('coverage predicates', () => {
  it('counts a unit as missing until EVERY tier is on disk', () => {
    const dir = mkdtempSync(join(tmpdir(), 'portraits-'));
    try {
      const units = [{ slug: 'liter', url: 'https://example.invalid/a.png' }];
      expect(missingThumbs(units, dir)).toEqual(units);

      // half-generated (one tier) is still a gap, not coverage
      writeFileSync(thumbPath(dir, 'liter', PORTRAIT_TIERS[0]), 'x');
      expect(hasAllTiers(dir, 'liter')).toBe(false);
      expect(missingThumbs(units, dir)).toEqual(units);

      for (const tier of PORTRAIT_TIERS) {
        writeFileSync(thumbPath(dir, 'liter', tier), 'x');
      }
      expect(hasAllTiers(dir, 'liter')).toBe(true);
      expect(missingThumbs(units, dir)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('only considers units that HAVE source art (no imageUrl ⇒ no gap)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'portraits-'));
    const chars = join(dir, 'characters.json');
    writeFileSync(
      chars,
      JSON.stringify({
        characters: {
          withArt: { imageUrl: 'https://example.invalid/a.png' },
          noArt: {},
        },
      })
    );
    try {
      expect(portraitUnits(chars).map((u) => u.slug)).toEqual(['withArt']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('renderThumbTiers (the build-time sharp fill)', () => {
  it('emits one square webp per tier at the expected size', async () => {
    const tiers = await renderThumbTiers(await sourceArt());
    expect([...tiers.keys()].sort((a, b) => a - b)).toEqual(
      [...PORTRAIT_TIERS].sort((a, b) => a - b)
    );
    for (const [tier, bytes] of tiers) {
      const meta = await sharp(bytes).metadata();
      expect(meta.format).toBe('webp');
      expect(meta.width).toBe(tier);
      expect(meta.height).toBe(tier);
    }
  });

  it('produces the 128px tier loadPortrait reads', () => {
    // portraits.ts hardcodes `<slug>-128.webp`; if that tier ever left the list
    // the fill would "succeed" and every card would still be a placeholder.
    expect(PORTRAIT_TIERS).toContain(128);
  });

  it('rejects a source with no decodable dimensions', async () => {
    await expect(
      renderThumbTiers(Buffer.from('not an image'))
    ).rejects.toThrow();
  });
});
