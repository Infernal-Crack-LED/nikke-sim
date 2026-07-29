// One-off diagnostic: renders a 4:5 (1200×1500) marker image whose purpose is to
// settle §6a of docs/handoffs/2026-07-28-unit-card-infographic-plan.md — HOW DOES
// X CROP A PORTRAIT SINGLE IMAGE IN THE TIMELINE? Public sources contradict each
// other (uncropped vs centre-cropped to ~16:9) and the answer decides the whole
// portrait card layout, so we measure it instead of guessing.
//
//   npx tsx scripts/x-crop-test.ts [--out <path>]
//
// HOW TO READ THE RESULT: the image is banded into three colour zones, chosen so
// that a single timeline screenshot discriminates all three candidate behaviours.
// A 4:5 frame is 1.25× as tall as it is wide, so a full-width crop to ratio R
// leaves a centred band of (1/R)/1.25 of the height:
//
//   uncropped          → 100% visible → RED zones show (extreme top + bottom)
//   crop to 1:1        →  80% visible → AMBER shows, RED gone
//   crop to 16:9       →  45% visible → GREEN only
//
// So: "which colours survived?" is the entire measurement. The % ruler down both
// edges reads off the exact surviving range for anything in between.
import { createCanvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../src/infographics/node/fonts.js';

const W = 1200;
const H = 1500; // 4:5

// Candidate crop bands, as fractions of height, centred. See header for the math.
const SQUARE_VISIBLE = (1 / 1) / 1.25; // 0.80
const WIDE_VISIBLE = (9 / 16) / 1.25; // 0.45
const band = (visible: number): [number, number] => [
  (1 - visible) / 2,
  1 - (1 - visible) / 2,
];
const [SQ_TOP, SQ_BOT] = band(SQUARE_VISIBLE); // 0.10 .. 0.90
const [W16_TOP, W16_BOT] = band(WIDE_VISIBLE); // 0.275 .. 0.725

const RED = '#c0392b';
const AMBER = '#b8860b';
const GREEN = '#1e7a4c';

// Defaults into .preview/ (gitignored) like render-unit-card.ts — a diagnostic
// that drops an untracked PNG in the repo root shows up as noise in every
// subsequent `git status`.
const outArg = process.argv.indexOf('--out');
const OUT =
  outArg >= 0
    ? process.argv[outArg + 1]!
    : fileURLToPath(new URL('../.preview/x-crop-test-1200x1500.png', import.meta.url));

const cv = createCanvas(W, H);
const ctx = cv.getContext('2d');
const y = (f: number): number => Math.round(f * H);

// ---- zone fills -------------------------------------------------------------
ctx.fillStyle = RED;
ctx.fillRect(0, 0, W, y(SQ_TOP));
ctx.fillRect(0, y(SQ_BOT), W, H - y(SQ_BOT));
ctx.fillStyle = AMBER;
ctx.fillRect(0, y(SQ_TOP), W, y(W16_TOP) - y(SQ_TOP));
ctx.fillRect(0, y(W16_BOT), W, y(SQ_BOT) - y(W16_BOT));
ctx.fillStyle = GREEN;
ctx.fillRect(0, y(W16_TOP), W, y(W16_BOT) - y(W16_TOP));

// ---- zone captions ----------------------------------------------------------
// Sized to stay legible at X's ~550px timeline width (≈46% scale).
ctx.textAlign = 'center';
ctx.fillStyle = '#ffffff';

const caption = (
  centreFrac: number,
  big: string,
  small: string,
  bigPx = 52
): void => {
  const cy = y(centreFrac);
  ctx.font = `700 ${bigPx}px Roboto`;
  ctx.fillText(big, W / 2, cy);
  ctx.font = `400 30px Roboto`;
  ctx.fillText(small, W / 2, cy + 42);
};

caption(0.05, 'RED = UNCROPPED', 'visible only if X crops nothing');
caption(0.95, 'RED = UNCROPPED', 'visible only if X crops nothing');
caption(SQ_TOP + 0.044, 'AMBER = SQUARE CROP', 'visible if cropped to 1:1 (80%)');
caption(SQ_BOT - 0.044, 'AMBER = SQUARE CROP', 'visible if cropped to 1:1 (80%)');

// centre block — always visible, so it carries the instructions
ctx.font = `700 64px Roboto`;
ctx.fillText('GREEN = 16:9 CROP', W / 2, y(0.46));
ctx.font = `400 34px Roboto`;
ctx.fillText('the middle 45% — visible in EVERY case', W / 2, y(0.5));
ctx.font = `400 30px Roboto`;
ctx.fillText('1200 × 1500  (4:5 portrait)', W / 2, y(0.545));
ctx.fillText(
  'Report: which colour bands survived in the timeline?',
  W / 2,
  y(0.58)
);

// ---- crop boundary lines ----------------------------------------------------
const boundary = (f: number, label: string): void => {
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.setLineDash([18, 12]);
  ctx.beginPath();
  ctx.moveTo(0, y(f));
  ctx.lineTo(W, y(f));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = `700 24px Roboto`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  // x=180 clears the edge ruler's own "NN%" labels (which end near x=110);
  // -18 lifts it clear of a ruler tick sitting on the same line (10/70/90%).
  ctx.fillText(label, 180, y(f) - 18);
  ctx.textAlign = 'center';
};
boundary(SQ_TOP, '1:1 crop edge — 10%');
boundary(SQ_BOT, '1:1 crop edge — 90%');
boundary(W16_TOP, '16:9 crop edge — 27.5%');
boundary(W16_BOT, '16:9 crop edge — 72.5%');

// ---- percentage ruler down both edges ---------------------------------------
// Lets a screenshot be read off exactly even if the real crop is none of the
// three candidates.
ctx.font = `700 22px Roboto`;
for (let p = 0; p <= 100; p += 5) {
  const yy = y(p / 100);
  const major = p % 10 === 0;
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = major ? 1 : 0.55;
  ctx.fillRect(0, yy - 1, major ? 56 : 32, major ? 3 : 2);
  ctx.fillRect(W - (major ? 56 : 32), yy - 1, major ? 56 : 32, major ? 3 : 2);
  if (major && p > 0 && p < 100) {
    ctx.textAlign = 'left';
    ctx.fillText(`${p}%`, 64, yy + 8);
    ctx.textAlign = 'right';
    ctx.fillText(`${p}%`, W - 64, yy + 8);
  }
  ctx.globalAlpha = 1;
}

// hard frame so any edge trimming is obvious
ctx.strokeStyle = '#ffffff';
ctx.lineWidth = 8;
ctx.strokeRect(4, 4, W - 8, H - 8);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, cv.toBuffer('image/png'));
console.log(
  `x-crop-test: ${W}×${H} (4:5) → ${OUT}\n` +
    `  uncropped → RED visible | 1:1 crop → AMBER top band | 16:9 crop → GREEN only`
);
