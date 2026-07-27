// THE ONLY Node entry point for server-side infographic rendering (the
// build-time pre-generation script, the render API, and the golden-test harness
// all import from here — nothing outside node/ may import a core/ draw function
// on the server path).
//
// FONTS FIRST: this import MUST stay the first statement. fonts.ts registers
// the bundled Roboto faces with @napi-rs/canvas and throws if any face fails —
// importing it before ANY canvas work is the load-bearing ordering guarantee
// (an unregistered family renders blank text SILENTLY: valid PNG, correct
// layout, zero glyphs). core/* never imports fonts.ts, which is both what keeps
// @napi-rs/canvas out of the web bundle and why the guarantee has to live here.
import './fonts.js';
import { createCanvas, type Canvas } from '@napi-rs/canvas';

// The full core render surface.
export * from '../core/canvas2d.js';
export * from '../core/theme.js';
export * from '../core/teamCard.js';
export * from '../core/dpsChart.js';
export * from '../core/tableCard.js';
export * from '../core/window.js';

// The Node host surface: canvas factory + image decode (sharp → putImageData;
// skia's Image silently no-ops on the owner's Mac — see portraits.ts).
export { createCanvas, type Canvas } from '@napi-rs/canvas';
export { decodeToCanvas, loadPortrait } from './portraits.js';

// Loud blank-text guard: after registration Roboto MUST measure and ink. An
// unregistered family fails silently (valid PNG, zero glyphs), so check both
// the metric and real pixels and name the font problem in the failure. Call
// once before a render batch (the golden harness and the Phase 2 build script
// both do) so a fontless host fails fast instead of emitting textless cards.
export function assertFontsLive(): void {
  const ctx = createCanvas(64, 64).getContext('2d');
  ctx.font = '40px Roboto';
  if (!(ctx.measureText('X').width > 0)) {
    throw new Error(
      'infographics fonts: Roboto registered but measureText("X") is 0 — ' +
        'text would render blank. Check src/infographics/node/fonts.ts registration.'
    );
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillText('X', 4, 44);
  const px = ctx.getImageData(0, 0, 64, 64).data;
  for (let i = 3; i < px.length; i += 4) {
    if (px[i] > 0) {
      return; // some glyph ink landed
    }
  }
  throw new Error(
    'infographics fonts: Roboto drew zero pixels — text renders blank. ' +
      'Check src/infographics/node/fonts.ts registration and the bundled TTFs.'
  );
}

// Ink coverage in a region of a finished render — the per-card blank-text
// guard. Fails loudly (naming fonts) instead of surfacing as an opaque fixture
// diff.
export function assertTitleInk(
  pngCtx: ReturnType<Canvas['getContext']>,
  cardName: string,
  region: { x: number; y: number; w: number; h: number }
): void {
  const { x, y, w, h } = region;
  const px = pngCtx.getImageData(x, y, w, h).data;
  // background is #101216 (16,18,22); count pixels clearly off-background
  let ink = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (
      Math.abs(px[i] - 16) > 12 ||
      Math.abs(px[i + 1] - 18) > 12 ||
      Math.abs(px[i + 2] - 22) > 12
    ) {
      ink++;
    }
  }
  if (ink === 0) {
    throw new Error(
      `${cardName}: title region has ZERO non-background pixels — text ` +
        'rendered blank (font registration problem). ' +
        'Check src/infographics/node/fonts.ts and the bundled Roboto TTFs.'
    );
  }
}
