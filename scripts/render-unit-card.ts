// Dev preview for the unit-card infographic — renders one or more slugs in both
// variants so a human (or a screenshot read) can look at the real thing.
//
//   npx tsx scripts/render-unit-card.ts [slug ...] [--out <dir>] [--variant discord|twitter]
//
// Not part of any gate; the pre-render pipeline is scripts/build-infographics.ts.
// This exists because layout work needs eyes, and a golden-image test tells you
// that pixels CHANGED, never that they look right.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createCanvas,
  assertFontsLive,
  drawUnitCardVariant,
  unitCardSize,
  type Canvas2DLike,
  type UnitCardVariant,
} from '../src/infographics/node/render.js';
import { loadUnitCardSources, buildUnitCardRender } from './lib/unit-card-sources.js';

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const OUT = resolve(flag('--out') ?? fileURLToPath(new URL('../.preview/', import.meta.url)));
const only = flag('--variant') as UnitCardVariant | undefined;
const slugs = args.filter((a, i) => !a.startsWith('--') && args[i - 1]?.startsWith('--') !== true);

async function main(): Promise<void> {
  assertFontsLive();
  const sources = loadUnitCardSources();
  const picked = slugs.length ? slugs : ['red-hood', 'liter', 'crown'];
  mkdirSync(OUT, { recursive: true });

  for (const slug of picked) {
    if (!sources.characters[slug]) {
      console.error(`no such slug: ${slug}`);
      continue;
    }
    for (const variant of (only ? [only] : ['discord', 'twitter']) as UnitCardVariant[]) {
      const data = await buildUnitCardRender(sources, slug, variant);
      const { w, h, dpr } = unitCardSize(variant);
      const canvas = createCanvas(w * dpr, h * dpr);
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      drawUnitCardVariant(ctx as unknown as Canvas2DLike, data, variant);
      const file = join(OUT, `${slug}.${variant}.png`);
      writeFileSync(file, canvas.toBuffer('image/png'));
      console.log(`${file}  ${w * dpr}x${h * dpr}`);
    }
  }
}

await main();
