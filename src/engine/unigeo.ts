// UNIGEO — uniform-in-the-aim-circle accuracy geometry (ENV.UNIGEO, DEFAULT OFF).
// The H1 model of the 2026-07-22 accuracy-circle rework pre-op packet
// (docs/handoffs/2026-07-22-unigeo-preop-packet.md), behind an experiment flag:
//
//   UNIGEO=off  (default) — engine bit-identical to current behaviour (cone paths live)
//   UNIGEO=sg   — SG only: landing = eps(0.96) × coverage(band, R(hr));
//                 core-per-landed = (r_core(band)/R(hr))² / coverage, clamped [0,1]
//   UNIGEO=all  — additionally AR/SMG single-bullet core-per-hit = analytic
//                 circle-circle (lens) overlap of the uniform disc R_eff(hr),
//                 centred delta(hr) px off the core, with the core disc.
//
// Measured basis (Part 1, SG): 728-pellet owner hand count (soda-tb-sg-core-hr-windows.json)
// + the pre-registered midfar replication (soda-tb-midfar-replication.json) + the owner-traced
// aim circle / silhouette / core geometry (sg-drawn-geometry.json). Circle law R(hr) =
// R0·(1−hr/100) is owner-ruled + measured at HR 0 / 38.91 (linear, exact at both points).
// Coverage profiles: generated from the traced silhouette by scripts/unigeo/gen-coverage.py.
// MG/SR/RL have no accuracy-circle model — never routed here in any mode.
import { UNIGEO_COVERAGE, UNIGEO_COV_R_STEP } from './unigeo-coverage.js';
import { ACCURACY_CIRCLE_SCALE, CIRCLE_PX_K } from './sg-geometry.js';

// SG aim-circle radius at HR 0: 0.648 × 250 / 2 = 81 px (datamined scale × measured px/scale).
export const UNIGEO_SG_R0 = (CIRCLE_PX_K * ACCURACY_CIRCLE_SCALE.SG) / 2;
// Landing efficiency ε — real tracking-wander loss (owner-ruled REAL; bounded residual risk 4%).
export const UNIGEO_EPS = 0.96;
// ⚑ FIT-SELECTED core-DIAMETER series (px) — W1 fallback fit-selection, candidate C (1/d law,
// 31 × 20.7/d at band distances 20.7/30.7/40.7/50.7). NEAR is measured (two independent traces);
// mid/midfar/far are FIT-SELECTED against the 18 owner-counted cells (C dev 25.4 vs A 33.0 /
// B 38.4 at the fixed engine form), NOT owner-traced — an owner re-trace supersedes them.
export const UNIGEO_CORE_PX: Record<string, number> = {
  near: 31,
  mid: 20.9,
  midfar: 15.8,
  far: 12.7,
};
// Part-2 (AR/SMG, UNIGEO=all) per-class mechanistic parameters, W4 binomial MLE on the clean
// P-CELLS: δ0 = aim-centre offset px at HR 0 (same wander mechanism as ε), f_bloom = effective
// circle fraction at fire time. δ(hr) = δ0·max(0, 1−hr/120) — pre-committed law, H=120 fixed.
// ⚑ AR fit on ~6 clean cells (dev 2.13 vs incumbent cone 16.33); f_bloom_AR rides a soft
// likelihood ridge [0.51, 0.68] (+1 dev). ⚑ SMG is a SATURATED 2-cell fit = CALIBRATION only.
export const UNIGEO_DELTA0: Record<string, number> = { AR: 15.9, SMG: 17.9 };
export const UNIGEO_FBLOOM: Record<string, number> = { AR: 0.578, SMG: 0.728 };
export const UNIGEO_DELTA_H = 120; // Hit Rate at which the centring offset reaches 0 (incumbent's zero-point, retained)

// Aim-circle radius (px) at a Hit Rate, linear-to-zero law (measured at HR 0 / 38.91).
export function unigeoCircleR(r0: number, hr: number): number {
  return r0 * Math.max(0, 1 - Math.max(0, hr) / 100);
}

// coverage(band, R): fraction of the aim circle (radius R, centred on the boss core) covered by
// the range-scaled silhouette — linear interpolation on the generated per-band radial table.
export function unigeoCoverage(band: string, R: number): number {
  const tab = UNIGEO_COVERAGE[band];
  if (!tab || R <= 0) return 1;
  const pos = R / UNIGEO_COV_R_STEP - 1; // tab[i] is coverage at R = (i+1)·step
  if (pos <= 0) {
    // below the first grid point interpolate to coverage(0) = 1 (circle centred on the core)
    const f = R / UNIGEO_COV_R_STEP;
    return 1 + (tab[0] - 1) * f;
  }
  const i0 = Math.min(tab.length - 1, Math.floor(pos));
  const i1 = Math.min(tab.length - 1, i0 + 1);
  const f = pos - i0;
  return tab[i0] + (tab[i1] - tab[i0]) * f;
}

// SG landing fraction (per pellet): ε × coverage at the HR-state circle.
export function unigeoSgLanding(band: string, hr: number): number {
  const R = unigeoCircleR(UNIGEO_SG_R0, hr);
  return Math.min(1, UNIGEO_EPS * unigeoCoverage(band, R));
}

// SG core-per-LANDED-pellet: (r_core/R)² ÷ coverage, clamped [0,1] (uniform per area:
// unconditional core probability is the area ratio; conditioning on landing divides by coverage).
export function unigeoSgCorePerLanded(band: string, hr: number): number {
  const R = unigeoCircleR(UNIGEO_SG_R0, hr);
  const rc = (UNIGEO_CORE_PX[band] ?? UNIGEO_CORE_PX.near) / 2;
  if (R <= rc) return 1;
  const cov = unigeoCoverage(band, R);
  if (cov <= 0) return 1;
  return Math.min(1, ((rc / R) * (rc / R)) / cov);
}

// Area of intersection of two discs (radii R and r, centres d apart) — the analytic lens.
export function lensArea(R: number, r: number, d: number): number {
  if (d >= R + r) return 0;
  if (d <= Math.abs(R - r)) {
    const m = Math.min(R, r);
    return Math.PI * m * m;
  }
  const a = Math.min(1, Math.max(-1, (d * d + R * R - r * r) / (2 * d * R)));
  const b = Math.min(1, Math.max(-1, (d * d + r * r - R * R) / (2 * d * r)));
  const t = (-d + R + r) * (d + R - r) * (d - R + r) * (d + R + r);
  return R * R * Math.acos(a) + r * r * Math.acos(b) - 0.5 * Math.sqrt(Math.max(0, t));
}

// AR/SMG single-bullet core-per-hit (UNIGEO=all): uniform disc R_eff(hr) centred δ(hr) off the
// core ∩ core disc, over the disc area. Returns null for weapons without an accuracy-circle
// model (MG/SR/RL) and for SG (which uses the pellet path above).
export function unigeoSingleCoreProb(weapon: string, band: string, hr: number): number | null {
  const d0 = UNIGEO_DELTA0[weapon];
  const fb = UNIGEO_FBLOOM[weapon];
  const scale = ACCURACY_CIRCLE_SCALE[weapon];
  if (d0 === undefined || fb === undefined || scale === undefined) return null;
  const rc = (UNIGEO_CORE_PX[band] ?? UNIGEO_CORE_PX.near) / 2;
  const Reff = fb * unigeoCircleR((CIRCLE_PX_K * scale) / 2, hr);
  const delta = d0 * Math.max(0, 1 - Math.max(0, hr) / UNIGEO_DELTA_H);
  if (Reff <= 0) return delta <= rc ? 1 : 0;
  return Math.min(1, lensArea(Reff, rc, delta) / (Math.PI * Reff * Reff));
}
