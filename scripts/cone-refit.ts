// Parameter-freeze refit for the δ-offset cone (implementation-plan §2). Fits
// {δ0_AR, δ0_SMG, δ0_SG, H, s, S_FLOOR}; K_SIGMA=2.53, CIRCLE_PX_K=0.648, scale + BAND_CORE_PX held.
// Binomial likelihood on the FINAL cell set (findings + test-plan docs), method-tagged.
// Per-frame NEAR/high cells entered as INTERVALS (spawn lower ↔ per-frame upper, no penalty inside);
// spawn/ammo + low-n cells face-value binomial. Holdouts predicted, never fit.
import { offsetCoreProb, rayleighWithin, pelletLandFrac, BAND_SG_HIT_FRAC } from '../src/engine/sg-geometry.js';

const K_SIGMA = 2.53, CIRCLE_PX_K = 0.648;
const SCALE: Record<string, number> = { AR: 75, SMG: 110, SG: 250 };
const COREPX: Record<string, number> = { near: 31, mid: 28, midfar: 21, far: 17 };

type Cell = { w: string; band: string; hr: number; k: number; n: number; method: 'spawn' | 'perframe'; interval?: [number, number]; note?: string };
// n = n_eff (pulls for multi-hit); interval = [lo,hi] soft band for method-biased cells.
const CELLS: Cell[] = [
  // ── AR (scarlet HR0 SPAWN re-count COUNT-1; blanc HR39 near/mid per-frame + far SPAWN COUNT-2; Label HR23 spawn) ──
  { w: 'AR', band: 'near',   hr: 0,    k: 5,  n: 20,  method: 'spawn', note: 'scarlet COUNT-1 spawn 0.25 ⚠fade-stack' },
  { w: 'AR', band: 'mid',    hr: 0,    k: 4,  n: 12,  method: 'spawn', note: 'scarlet COUNT-1 spawn 0.33 ⚠ (non-monotone noise)' },
  { w: 'AR', band: 'midfar', hr: 0,    k: 3,  n: 16,  method: 'spawn', note: 'scarlet COUNT-1 spawn 0.19 ⚠' },
  { w: 'AR', band: 'far',    hr: 0,    k: 3,  n: 36,  method: 'spawn', note: 'scarlet COUNT-1 spawn 0.08 ✅ clean' },
  { w: 'AR', band: 'near',   hr: 23,   k: 18, n: 48,  method: 'spawn' },   // Label spawn 0.37
  { w: 'AR', band: 'mid',    hr: 23,   k: 14, n: 50,  method: 'spawn', note: '0.28' },
  { w: 'AR', band: 'midfar', hr: 23,   k: 10, n: 50,  method: 'spawn', note: '0.20' },
  { w: 'AR', band: 'far',    hr: 23,   k: 6,  n: 46,  method: 'spawn', note: '0.13' },
  { w: 'AR', band: 'near',   hr: 39.24,k: 35, n: 40,  method: 'perframe', interval: [0.70, 0.875] },
  { w: 'AR', band: 'mid',    hr: 39.24,k: 24, n: 54,  method: 'perframe' },
  { w: 'AR', band: 'midfar', hr: 39.24,k: 7,  n: 24,  method: 'perframe' },
  { w: 'AR', band: 'far',    hr: 39.24,k: 20, n: 180, method: 'spawn', note: 'blanc far spawn 0.111 n=180' },
  { w: 'AR', band: 'near',   hr: 80.78,k: 1,  n: 30,  method: 'perframe', interval: [0.9, 1.0], note: 'jill near saturation (far excluded) — owner-weighted' },
  // ── SMG (chisato HR0/HR22 near; quency HR61 all bands n_eff=pulls; LM HR15) ──
  { w: 'SMG', band: 'near',  hr: 0,    k: 32, n: 109, method: 'spawn', note: 'chisato-off, cleanest HR0 SMG near' },
  { w: 'SMG', band: 'near',  hr: 22.37,k: 57, n: 156, method: 'spawn', note: 'chisato-on 0.365' },
  { w: 'SMG', band: 'near',  hr: 61,   k: 7,  n: 12,  method: 'perframe', interval: [0.35, 0.583], note: 'quency near biased-high, n_eff=pulls' },
  { w: 'SMG', band: 'mid',   hr: 61,   k: 4,  n: 9,   method: 'perframe', note: 'quency mid 0.412 n_eff~9' },
  { w: 'SMG', band: 'midfar',hr: 61,   k: 2,  n: 8,   method: 'perframe', note: 'quency midfar 0.267 n_eff~8' },
  { w: 'SMG', band: 'far',   hr: 61,   k: 3,  n: 18,  method: 'perframe', note: 'quency far 0.143 n_eff~18' },
  { w: 'SMG', band: 'near',  hr: 15,   k: 29, n: 122, method: 'spawn', note: 'LM 0.238 (whites undercounted → high)' },
  { w: 'SMG', band: 'mid',   hr: 15,   k: 11, n: 120, method: 'spawn', note: 'LM 0.092' },
  { w: 'SMG', band: 'midfar',hr: 15,   k: 5,  n: 119, method: 'spawn', note: 'LM 0.042' },
  { w: 'SMG', band: 'far',   hr: 15,   k: 2,  n: 143, method: 'spawn', note: 'LM 0.014' },
  // ── SG (dorothy HR0 all bands; noir ▲60 all bands; noir ▲98 near ~1) ──
  { w: 'SG', band: 'near',   hr: 0,    k: 4,  n: 48,  method: 'spawn', note: 'dorothy 0.083 (~7 shots pellets)' },
  { w: 'SG', band: 'mid',    hr: 0,    k: 3,  n: 51,  method: 'spawn' },
  { w: 'SG', band: 'midfar', hr: 0,    k: 1,  n: 36,  method: 'spawn' },
  { w: 'SG', band: 'far',    hr: 0,    k: 0,  n: 33,  method: 'spawn' },
  { w: 'SG', band: 'near',   hr: 60,   k: 3,  n: 12,  method: 'spawn', interval: [0.09, 0.54], note: 'noir ▲60 0.25' },
  { w: 'SG', band: 'mid',    hr: 60,   k: 2,  n: 14,  method: 'spawn', note: 'noir ▲60 0.14' },
  { w: 'SG', band: 'midfar', hr: 60,   k: 1,  n: 18,  method: 'spawn', note: 'noir ▲60 0.056' },
  { w: 'SG', band: 'far',    hr: 60,   k: 0,  n: 15,  method: 'spawn', note: 'noir ▲60 0.00' },
  { w: 'SG', band: 'near',   hr: 98,   k: 1,  n: 30,  method: 'perframe', interval: [0.9, 1.0], note: 'noir ▲98 in-burst ~1 (owner-attested, weighted)' },
];

// SG-landing anchor: only the ▲60 "near-complete landing" is a clean signal for the σ-shrink
// (the HR0 area fractions are the INPUT hitFrac, not a Gaussian-landing target — dropped to avoid
// circularity). σ_SG(60) must land ~all pellets even at far. Secondary weight.
const LANDING = [
  { hr: 60, band: 'far', target: 0.93, tol: 0.1 },  // near-complete at ▲60
];

const sigma = (w: string, hr: number, s: number, floor: number) =>
  ((CIRCLE_PX_K * SCALE[w]) / 2 / K_SIGMA) * Math.max(floor, 1 - s * Math.max(0, hr));
const delta = (d0: number, hr: number, H: number) => d0 * Math.max(0, 1 - Math.max(0, hr) / H);
const predCore = (w: string, band: string, hr: number, p: P) =>
  Math.min(1, offsetCoreProb(COREPX[band] / 2, sigma(w, hr, p.s, p.floor), delta(p.d0[w], hr, p.H)));

type P = { d0: Record<string, number>; H: number; s: number; floor: number };

function nll(p: P): number {
  let L = 0;
  for (const c of CELLS) {
    const pr = Math.min(0.9999, Math.max(1e-4, predCore(c.w, c.band, c.hr, p)));
    if (c.interval) {
      // soft interval: no penalty inside [lo,hi]; quadratic (in logit-ish px) outside
      const [lo, hi] = c.interval;
      if (pr < lo) L += c.n * (lo - pr) ** 2 * 8;
      else if (pr > hi) L += c.n * (pr - hi) ** 2 * 8;
    } else {
      L -= c.k * Math.log(pr) + (c.n - c.k) * Math.log(1 - pr); // binomial NLL on n_eff
    }
  }
  // landing anchors (SG σ): squared error scaled
  for (const a of LANDING) {
    const lf = pelletLandFrac(BAND_SG_HIT_FRAC[a.band], sigma('SG', a.hr, p.s, p.floor));
    L += ((lf - a.target) / a.tol) ** 2 * 6;
  }
  return L;
}

// coordinate-descent grid search
let best: P = { d0: { AR: 16, SMG: 20, SG: 25 }, H: 195, s: 0.007, floor: 0.35 };
let bestL = nll(best);
const grids = {
  AR: [8, 10, 12, 14, 16, 18, 20, 22, 24, 26],
  SMG: [12, 16, 20, 24, 28, 32, 36, 40],
  SG: [15, 20, 25, 30, 35, 40, 45, 50],
  H: [80, 100, 120, 140, 160, 180, 200, 240, 300, 400],
  s: [0, 0.002, 0.004, 0.006, 0.008, 0.01, 0.012, 0.014, 0.016, 0.02],
  floor: [0.1, 0.13, 0.16, 0.2, 0.25, 0.3, 0.4, 0.5, 0.7, 1.0],
};
for (let iter = 0; iter < 8; iter++) {
  for (const w of ['AR', 'SMG', 'SG'] as const)
    for (const v of grids[w]) { const t = { ...best, d0: { ...best.d0, [w]: v } }; const l = nll(t); if (l < bestL) { bestL = l; best = t; } }
  for (const v of grids.H) { const t = { ...best, H: v }; const l = nll(t); if (l < bestL) { bestL = l; best = t; } }
  for (const v of grids.s) { const t = { ...best, s: v }; const l = nll(t); if (l < bestL) { bestL = l; best = t; } }
  for (const v of grids.floor) { const t = { ...best, floor: v }; const l = nll(t); if (l < bestL) { bestL = l; best = t; } }
}

console.log('=== FROZEN PARAMETERS (refit) ===');
console.log(`  δ0:  AR ${best.d0.AR}  SMG ${best.d0.SMG}  SG ${best.d0.SG}  (px @2622)`);
console.log(`  H:   ${best.H}   s: ${best.s}   S_FLOOR: ${best.floor}   (K_SIGMA 2.53 held)`);
console.log(`  NLL: ${bestL.toFixed(2)}`);
console.log('\n=== PER-CELL FIT (measured vs predicted) ===');
console.log('  w    band    hr     meas    n    pred    method     ok');
for (const c of CELLS) {
  const meas = c.k / c.n;
  const pr = predCore(c.w, c.band, c.hr, best);
  const ok = c.interval ? (pr >= c.interval[0] - 0.03 && pr <= c.interval[1] + 0.03) : Math.abs(pr - meas) < 0.12;
  console.log(`  ${c.w.padEnd(4)} ${c.band.padEnd(7)} ${String(c.hr).padStart(5)}  ${meas.toFixed(3)}  ${String(c.n).padStart(4)}  ${pr.toFixed(3)}  ${c.method.padEnd(9)} ${ok ? '✓' : '✗'} ${c.interval ? `[${c.interval[0]},${c.interval[1]}]` : ''}`);
}
console.log('\n=== SG LANDING anchors ===');
for (const a of LANDING) console.log(`  hr ${a.hr} ${a.band}: pred ${pelletLandFrac(BAND_SG_HIT_FRAC[a.band], sigma('SG', a.hr, best.s, best.floor)).toFixed(3)} vs target ${a.target}`);

console.log('\n=== HOLDOUT PREDICTIONS (not fit) ===');
// soda-twinkling-bunny SG ▲38.91 windows; chisato SMG midfar HR22; dorothy consolidation (single bullet, keeps coreRate — not cone)
console.log(`  soda-tb SG ▲38.91  near ${predCore('SG','near',38.91,best).toFixed(3)}  mid ${predCore('SG','mid',38.91,best).toFixed(3)}  midfar ${predCore('SG','midfar',38.91,best).toFixed(3)}  far ${predCore('SG','far',38.91,best).toFixed(3)}`);
console.log(`  chisato SMG midfar HR22.37: ${predCore('SMG','midfar',22.37,best).toFixed(3)}`);
console.log(`  AR near curve: HR0 ${predCore('AR','near',0,best).toFixed(3)} → HR23 ${predCore('AR','near',23,best).toFixed(3)} → HR39 ${predCore('AR','near',39,best).toFixed(3)} → HR80 ${predCore('AR','near',80,best).toFixed(3)}`);

// ── s / S_FLOOR ridge profile (Fable req #3: report as interval, not point) ──
console.log('\n=== σ-shrink ridge profile (NLL re-optimizing δ0/H at each s,floor) ===');
function nllAt(s: number, floor: number): number {
  let b = { ...best, s, floor }; let bl = nll(b);
  for (let it = 0; it < 4; it++)
    for (const w of ['AR','SMG','SG'] as const) for (const v of grids[w]) { const t = { ...b, d0: { ...b.d0, [w]: v } }; const l = nll(t); if (l < bl) { bl = l; b = t; } }
  for (const v of grids.H) { const t = { ...b, H: v }; const l = nll(t); if (l < bl) { bl = l; b = t; } }
  return bl;
}
const base0 = nllAt(best.s, best.floor);
for (const s of [0.004, 0.006, 0.008, 0.01, 0.012]) {
  const row = [0.1, 0.15, 0.2, 0.3].map((f) => (nllAt(s, f) - base0).toFixed(1).padStart(7));
  console.log(`  s=${s.toFixed(3)}  ΔNLL@floor[.10 .15 .20 .30]: ${row.join(' ')}`);
}
