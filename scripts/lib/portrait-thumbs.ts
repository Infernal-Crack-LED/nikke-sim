// Portrait-thumbnail coverage + generation, shared by everything that cares
// about `web/public/img/portraits/<slug>-{128,256}.webp`:
//
//   - scripts/gen-portrait-thumbs.ts  — the canonical generator (`npm run thumbs`)
//     and its `--check` coverage report.
//   - scripts/build-infographics.ts   — fills any thumb a unit card is about to
//     need but doesn't have, so a card never ships the letter placeholder.
//
// WHY A DEPLOY-TIME FILL EXISTS: a card's portrait comes from a COMMITTED thumb
// (src/infographics/node/portraits.ts loadPortrait); a missing file degrades to
// the placeholder box silently. Nothing re-ran `npm run thumbs` as data syncs
// added units, so on 2026-08-03 four units (Laplace: Ultimate Hero, Maxwell:
// Ordinary Mechanic, Anne: Miracle Fairy, Rei Ayanami (Tentative Name)) had been
// shipping placeholder cards — through /nikke in Discord, where the card is
// content-hashed and cached by URL indefinitely. Same reasoning as the font and
// icon gates in build-infographics: an immutable image nothing will re-render
// must not be built degraded.
//
// TWO PIPELINES, ON PURPOSE:
//   - Playwright (gen-portrait-thumbs.ts) is CANONICAL for committed thumbs: it
//     crops + stepped-halves in a real browser so the bytes match what the web
//     runtime produces when it has to fall back to its own canvas path
//     (web/src/portraitThumb.ts) — no visual pop between the two.
//   - sharp (`renderThumbTiers` here) is the BUILD-TIME FILL: no browser, no
//     browser binaries to install, runs anywhere the deploy does. The framing is
//     identical (same PORTRAIT_CROP_TOP anchoring, same square); only the
//     resampling kernel and webp encoder differ, which is invisible at 128px and
//     categorically better than a placeholder. A filled thumb is NOT committed —
//     `--check` still reports the unit so the canonical thumb gets generated.
import sharp from 'sharp';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORTRAIT_CROP_TOP } from '../../src/infographics/core/canvas2d.js';

/** px squares; the web runtime picks the smallest tier ≥ cssSize×dpr, and the
 * node card renderer reads the 128 (portraits.ts). Both must exist for a unit
 * to count as covered. */
export const PORTRAIT_TIERS = [128, 256] as const;

/** webp quality — 0.85 as a browser `toBlob` quality, 85 to sharp. */
export const PORTRAIT_WEBP_QUALITY = 0.85;

/** The committed thumb directory — also loadPortrait's default source. */
export const PORTRAIT_SRC_DIR = fileURLToPath(
  new URL('../../web/public/img/portraits/', import.meta.url)
);

export const PORTRAIT_MANIFEST_PATH = fileURLToPath(
  new URL('../../web/src/portrait-manifest.json', import.meta.url)
);

const CHARACTERS_PATH = fileURLToPath(
  new URL('../../data/characters.json', import.meta.url)
);

// The art CDN 403s some datacenter requests without a User-Agent (bakery-bot hit
// this on the same host — see its lib/nikke/portrait.ts), so present one.
const UA =
  'Mozilla/5.0 (compatible; nikke-sim/1.0; +https://github.com/Infernal-Crack-LED/nikke-sim)';

export interface PortraitUnit {
  slug: string;
  /** The full-res character art on the CDN (characters.json `imageUrl`). */
  url: string;
}

/** Every unit that HAS source art, sorted by slug. A unit without an `imageUrl`
 * cannot have a thumb and is not a coverage gap. */
export function portraitUnits(
  charactersPath = CHARACTERS_PATH
): PortraitUnit[] {
  const data = JSON.parse(readFileSync(charactersPath, 'utf8')) as {
    characters: Record<string, { imageUrl?: string }>;
  };
  return Object.entries(data.characters)
    .filter(([, c]) => c.imageUrl)
    .map(([slug, c]) => ({ slug, url: c.imageUrl! }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export function thumbPath(dir: string, slug: string, tier: number): string {
  return join(dir, `${slug}-${tier}.webp`);
}

/** True when EVERY tier is on disk — a half-generated unit is still a gap. */
export function hasAllTiers(dir: string, slug: string): boolean {
  return PORTRAIT_TIERS.every((t) => existsSync(thumbPath(dir, slug, t)));
}

/** The units missing at least one tier in `dir`. */
export function missingThumbs(
  units: PortraitUnit[],
  dir = PORTRAIT_SRC_DIR
): PortraitUnit[] {
  return units.filter((u) => !hasAllTiers(dir, u.slug));
}

/**
 * The square crop taken out of the source art: the largest square, horizontally
 * centred, anchored PORTRAIT_CROP_TOP down the VERTICAL OVERFLOW (not down the
 * image) — the framing web/src/portraitThumb.ts and gen-portrait-thumbs.ts both
 * use, so all three agree on where the face sits.
 */
export function squarePortraitCrop(
  width: number,
  height: number
): { left: number; top: number; side: number } {
  const side = Math.min(width, height);
  return {
    left: Math.round((width - side) / 2),
    top: Math.round((height - side) * PORTRAIT_CROP_TOP),
    side,
  };
}

/** Fetch the full-res source art for a unit. Throws on a non-2xx. */
export async function fetchPortraitSource(
  url: string,
  fetchImpl: typeof fetch = fetch
): Promise<Buffer> {
  const res = await fetchImpl(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) {
    throw new Error(`portrait fetch ${res.status} for ${url}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Crop + downscale source art into one webp per tier (the sharp fill pipeline —
 * see the header for why this is not the canonical generator).
 */
export async function renderThumbTiers(
  source: Buffer
): Promise<Map<number, Buffer>> {
  const meta = await sharp(source).metadata();
  if (!meta.width || !meta.height) {
    throw new Error('portrait source has no dimensions');
  }
  const { left, top, side } = squarePortraitCrop(meta.width, meta.height);
  const out = new Map<number, Buffer>();
  for (const tier of PORTRAIT_TIERS) {
    out.set(
      tier,
      await sharp(source)
        .extract({ left, top, width: side, height: side })
        .resize(tier, tier, { fit: 'fill' })
        .webp({ quality: Math.round(PORTRAIT_WEBP_QUALITY * 100) })
        .toBuffer()
    );
  }
  return out;
}
