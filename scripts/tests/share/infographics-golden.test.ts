// Golden-image regression for the infographic renderers — renders each card
// type via @napi-rs/canvas and compares against committed fixture PNGs.
// This is the only automated guard that catches BLANK TEXT: a PNG with no
// glyphs is a valid PNG of the right dimensions, so the pixel compare (plus the
// harness's explicit ink assertions, which name the font problem) is what
// fails. It also pins the fork reconciliation — nikke-sim and bakery-bot must
// render the same pixels.
//
// TWO GATES, two strengths:
//   1. EVERYWHERE: decoded-pixel compare at a small tolerance (see
//      comparePixels). Dimensions must match exactly, ≥99.9% of pixels must
//      agree within a max channel delta of 2. Text antialiasing differs
//      across Skia builds, flat fills do not — so cross-platform runs land
//      well inside the tolerance, while real renderer drift (missing glyphs,
//      moved bars, wrong colors) blows through it. This is what keeps an
//      off-Mac session from shipping renderer drift green.
//   2. darwin-arm64 only: byte-exact sha256 compare (the fixtures were
//      generated on macOS arm64; Skia/zlib byte output is NOT guaranteed
//      across platforms). A stronger gate on the fixture platform.
// Both gates run AFTER the harness's assertFontsLive + per-card ink
// assertions, which are the deploy-box blank-text protection (the deploy box
// cannot regenerate fixtures).
//
// Regenerate fixtures after an intentional renderer change, ON darwin-arm64
// (the byte-exact gate's platform):
//   npm run fixtures:infographics
//
// EVERY fixture here is hermetic. The two unit-card goldens used to be the
// exception — they rendered through the live rank boards (web/public/*.json),
// gitignored build outputs, so they carried a skip for checkouts that hadn't run
// `npm run dpschart && npm run ranks:all`. That cost them both ways: the skip
// fired everywhere automated (CI runs `verify.sh full`, the deploy box runs
// `verify.sh artifacts`, neither builds the boards before vitest), and where
// they did run, any kit commit that reordered a board failed them for reasons
// that had nothing to do with the renderer. They now build from a committed
// source snapshot (see loadFrozenUnitCardSources in the harness), so they run
// everywhere and only move when the RENDERER moves. The live data join is
// covered by unit-card-data.test.ts, which is where a board-shape regression
// belongs.
import { beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
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
  RESOURCES_TITLE_ICON,
  RESOURCES_TITLE_INK_REGION,
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

// Decoded-pixel compare tolerances (gate 1, runs on EVERY platform). Text
// antialiasing varies between Skia builds, so edge pixels can wiggle by a
// couple of channel steps; flat fills and glyph coverage are identical. A
// max channel delta of 2 absorbs AA wiggle but not a missing glyph, a moved
// bar, or a theme-color change (all deltas ≫ 2). 99.9% means a 1000×600 card
// tolerates ~600 wiggling pixels — real drift moves thousands.
const PIXEL_CHANNEL_TOLERANCE = 2;
const PIXEL_MATCH_FRACTION = 0.999;

// Decode both PNGs to raw RGBA via sharp (libvips decodes identically on
// every platform, unlike the Skia encode that produced the bytes) and count
// the pixels whose worst per-channel delta stays within the tolerance.
async function comparePixels(
  name: string,
  candidate: Buffer,
  fixture: Buffer
): Promise<void> {
  const [cand, fix] = await Promise.all([
    sharp(candidate).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(fixture).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  expect(
    [cand.info.width, cand.info.height],
    `${name}: dimensions ${cand.info.width}×${cand.info.height} != fixture ` +
      `${fix.info.width}×${fix.info.height} — ${REGEN_HINT}`
  ).toEqual([fix.info.width, fix.info.height]);
  const pixels = cand.info.width * cand.info.height;
  let within = 0;
  let maxDelta = 0;
  for (let i = 0; i < pixels * 4; i += 4) {
    const d = Math.max(
      Math.abs(cand.data[i] - fix.data[i]),
      Math.abs(cand.data[i + 1] - fix.data[i + 1]),
      Math.abs(cand.data[i + 2] - fix.data[i + 2]),
      Math.abs(cand.data[i + 3] - fix.data[i + 3])
    );
    if (d <= PIXEL_CHANNEL_TOLERANCE) {
      within++;
    }
    if (d > maxDelta) {
      maxDelta = d;
    }
  }
  const fraction = within / pixels;
  expect(
    fraction,
    `${name}: ${(fraction * 100).toFixed(3)}% of pixels within channel ` +
      `delta ${PIXEL_CHANNEL_TOLERANCE} (need ${PIXEL_MATCH_FRACTION * 100}%, ` +
      `max delta ${maxDelta}) — ${REGEN_HINT}`
  ).toBeGreaterThanOrEqual(PIXEL_MATCH_FRACTION);
}

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
    'resources-card.png',
    'unit-card.discord.png',
    'unit-card.twitter.png',
  ]) {
    it(name, async () => {
      const render = renders.find((r) => r.name === name);
      expect(render, `${name}: harness produced no render`).toBeDefined();
      // Every platform: the card rendered at a sane size (the ink assertions
      // already ran in renderAll — THAT is the deploy-box blank-text gate).
      expect(render!.png.length).toBeGreaterThan(1_000);
      const path = new URL(name, FIXTURE_DIR);
      if (!existsSync(path)) {
        throw new Error(
          `${name}: no committed fixture at scripts/tests/fixtures/` +
            `infographics/${name} — ${REGEN_HINT}`
        );
      }
      const fixture = readFileSync(path);
      // Gate 1 — EVERY platform: decoded-pixel compare at a small tolerance.
      await comparePixels(name, render!.png, fixture);
      // Gate 2 — fixture platform only: byte-exact.
      if (!FIXTURE_PLATFORM) {
        return; // byte-exact goldens are pinned to the fixture platform
      }
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
    ['resourcesCard', RESOURCES_TITLE_ICON, RESOURCES_TITLE_INK_REGION],
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
