// Golden-image regression for the infographic renderers — renders each card
// type via @napi-rs/canvas and byte-compares against committed fixture PNGs.
// This is the only automated guard that catches BLANK TEXT: a PNG with no
// glyphs is a valid PNG of the right dimensions, so the byte compare (plus the
// harness's explicit ink assertions, which name the font problem) is what
// fails. It also pins the fork reconciliation — nikke-sim and bakery-bot must
// render the same pixels.
//
// PLATFORM GATE: the fixtures were generated on macOS arm64, and byte-exact
// Skia/zlib output is NOT guaranteed across platforms — the native canvas
// binary differs on linux-x64 (Railway). The byte compare therefore runs ONLY
// on the fixture platform; everywhere else the render still runs (including
// the harness's assertFontsLive + per-card ink assertions — the actual
// blank-text protection on the deploy box, which cannot regenerate fixtures).
//
// Regenerate fixtures after an intentional renderer change:
//   npm run fixtures:infographics
import { beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import {
  assertTitleInk,
  createCanvas,
  decodeToCanvas,
  TEAM_TITLE_ICON,
  TEAM_TITLE_INK_REGION,
  DPS_TITLE_ICON,
  DPS_TITLE_INK_REGION,
  TABLE_TITLE_ICON,
  TABLE_TITLE_INK_REGION,
} from '../../../src/infographics/node/render.js';
import { renderAll, type FixtureRender } from './infographics-harness.js';

const FIXTURE_DIR = new URL('../fixtures/infographics/', import.meta.url);
const REGEN_HINT =
  'fixture mismatch — regenerate with `npm run fixtures:infographics` ' +
  '(and eyeball the diff before committing it)';
// The platform the committed fixtures were generated on (see the header).
const FIXTURE_PLATFORM =
  process.platform === 'darwin' && process.arch === 'arm64';

const sha = (buf: Buffer) => createHash('sha256').update(buf).digest('hex');

describe('infographic golden images', () => {
  let renders: FixtureRender[];
  beforeAll(async () => {
    renders = await renderAll(); // also runs the font/ink assertions
  });

  for (const name of [
    'team-card.png',
    'roster-card.png',
    'dps-chart.png',
    'dps-chart-window.png',
    'table-card.png',
    'table-card-window.png',
    'unit-card.png',
  ]) {
    it(name, () => {
      const render = renders.find((r) => r.name === name);
      expect(render, `${name}: harness produced no render`).toBeDefined();
      // Every platform: the card rendered at a sane size (the ink assertions
      // already ran in renderAll — THAT is the deploy-box blank-text gate).
      expect(render!.png.length).toBeGreaterThan(1_000);
      if (!FIXTURE_PLATFORM) {
        return; // byte-exact goldens are pinned to the fixture platform
      }
      const path = new URL(name, FIXTURE_DIR);
      if (!existsSync(path)) {
        throw new Error(
          `${name}: no committed fixture at scripts/tests/fixtures/` +
            `infographics/${name} — ${REGEN_HINT}`
        );
      }
      const fixture = readFileSync(path);
      expect(
        sha(render!.png),
        `${name} sha256 ${sha(render!.png).slice(0, 12)}… != fixture ` +
          `${sha(fixture).slice(0, 12)}… — ${REGEN_HINT}`
      ).toBe(sha(fixture));
      expect(render!.png.equals(fixture), `${name}: ${REGEN_HINT}`).toBe(true);
    });
  }
});

// Regression for the vacuous-guard bug the ink regions fixed: a region that
// starts at padX passes on ICON PIXELS alone with zero glyphs. Each ink region
// used by the harness/build script must THROW on an icon-only canvas (icon
// drawn at its exact card position, no text).
//
// Both sides — the icon draw rect and the ink region — come from the card
// modules' *_TITLE_ICON / *_TITLE_INK_REGION exports, so a layout change moves
// the guard AND this test together (the hand-copied constants this replaced
// could drift from the core cards and silently re-vacate the guard).
describe('assertTitleInk regions are not satisfiable by the site icon alone', () => {
  const SITE_ICON = new URL(
    '../../../src/infographics/assets/nikkesim-icon.png',
    import.meta.url
  );
  // [card, icon draw rect, ink region] — derived from the core card modules
  const cases: [
    string,
    { x: number; y: number; size: number },
    { x: number; y: number; w: number; h: number },
  ][] = [
    ['teamCard', TEAM_TITLE_ICON, TEAM_TITLE_INK_REGION],
    ['dpsChart', DPS_TITLE_ICON, DPS_TITLE_INK_REGION],
    ['tableCard', TABLE_TITLE_ICON, TABLE_TITLE_INK_REGION],
  ];
  for (const [card, iconRect, region] of cases) {
    it(`${card}: icon-only canvas fails the ink guard`, async () => {
      const icon = await decodeToCanvas(SITE_ICON);
      expect(icon, 'site icon must decode for this test').not.toBeNull();
      const canvas = createCanvas(600, 120);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#101216';
      ctx.fillRect(0, 0, 600, 120);
      ctx.drawImage(
        icon!,
        iconRect.x,
        iconRect.y,
        iconRect.size,
        iconRect.size
      ); // icon, ZERO text
      expect(() => assertTitleInk(ctx, card, region)).toThrow(/ZERO/);
    });
  }
});
