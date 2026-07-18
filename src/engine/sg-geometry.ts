// Accuracy-circle geometry — the px calibration (docs/data/sg-calc/) turned into
// core-hit-fraction and SG pellet-landing primitives, so those quantities are
// GEOMETRICALLY grounded from a unit's datamined accuracy_circle_scale + the boss
// range band, instead of owner-chosen tables and an abstract free-parameter reticle.
//
// ⚑ APPROXIMATION BASELINE — every constant here is a principled approximation, NOT
// measured-truth (see docs/data/sg-calc/DERIVATION.md §"These numbers are approximations"
// and accuracy-circle-calibration.json approximationCaveat). They may FILL unmeasured
// bands and GROUND free parameters, but must NEVER refit a measured constant
// (hard-constraint #3). Consumers land behind ENV flags, default matching current
// behaviour, until the board A/B says a workstream helps. See
// docs/data/sg-calc/IMPLEMENTATION-PLAN.md.

// scale → on-screen accuracy-circle diameter in px, at scope-lock resolution 2622×1206.
// PROPORTIONAL (offset≈0), R²=0.9999 from 3 independent BLOOM-PEAK measurements
// (AR scarlet 75→48px, SMG lm 110→71.5px, SG noir 250→162px). accuracy_circle_scale IS the
// fully-bloomed reticle diameter — the reticle pulses on the fire cadence between a contracted
// floor and this peak, and the peak is the anchor → no dead zone. The old 0.751·scale−25.2 offset
// was a bloom-phase artifact (the earlier AR 29px / SMG 60px were mid-bloom snapshots); re-measuring
// every class at its peak makes the map proportional. px/scale is uniform: 48/75=0.640, 71.5/110=0.650,
// 162/250=0.648. (The AR contracted floor ~29px ≈ the boss core, which is why high HR ≈ all-core.)
export const CIRCLE_PX_K = 0.648;
export const CIRCLE_PX_C = 0;

// range → boss-core diameter in px. Inverse-with-offset (perspective projection:
// apparent size ∝ 1/(distance + camera-offset)), R²=0.93; the ~47 offset is the
// camera-to-shooter distance. FORM robustly selected by the owner range bounds; k,c
// ride on fuzzy range midpoints (±~10%) and would be pinned exactly by one hard
// range measurement (open owner ruling in the implementation plan).
export const CORE_PX_K = 2100;
export const CORE_PX_C = 47;

// Datamined per-weapon-class accuracy_circle_scale (the class exemplars the px
// calibration was fit against). Mirrors sim.ts HR_CORE_CIRCLE. MG/SR/RL have no
// accuracy-circle model here → geometry does not touch their core rate.
export const ACCURACY_CIRCLE_SCALE: Record<string, number> = { AR: 75, SMG: 110, SG: 250 };

// Measured boss-core diameter per range band (px), hand-outlined on the Noir SG study
// (noir-sg-bands.json). The boss is the SAME physical union raid boss across element
// assignments (owner) → these transport across comps. Equivalent to coreDpx() at the
// calibration's impliedRanges (near 20.7, mid 28.0, midfar 52.9, far 76.4) by construction.
export const BAND_CORE_PX: Record<string, number> = { near: 31, mid: 28, midfar: 21, far: 17 };

// Hand-outlined SG pellet HIT fraction per band (noir-sg-bands.json): the fraction of the
// fixed D=162 spread circle covered by the boss body = expected fraction of pellets that land.
// Declines cleanly with range as the boss shrinks inside the fixed spread circle.
export const BAND_SG_HIT_FRAC: Record<string, number> = {
  near: 0.797,
  mid: 0.71,
  midfar: 0.634,
  far: 0.465,
};

// scale → accuracy-circle diameter in px (offset is 0 now, so Math.max is vestigial — kept harmless).
export function circleDpx(scale: number): number {
  return Math.max(0, CIRCLE_PX_K * scale + CIRCLE_PX_C);
}

// range → boss-core diameter in px.
export function coreDpx(range: number): number {
  return CORE_PX_K / (range + CORE_PX_C);
}

// range = inverse of coreDpx (for the continuous-range path / cross-checks).
export function rangeFromCoreDpx(coreD: number): number {
  return CORE_PX_K / coreD - CORE_PX_C;
}

// Concentric core inside the accuracy circle ⇒ fraction of shots on the core ≈ area ratio.
// Clamped to 1 (the core cannot be more than fully covered).
export function coreFracGeo(coreD: number, circleD: number): number {
  if (circleD <= 0) return 1;
  const r = coreD / circleD;
  return Math.min(1, r * r);
}

// Accuracy-circle diameter at a given hit rate, using the SAME fractional shrink the
// HRCORE reticle model applies (circle(hr) = circle(0) · max(FLOOR, 1 − s·hr)).
export function circleDpxAtHr(
  scale: number,
  hr: number,
  slope: number,
  floorFrac: number,
): number {
  const frac = Math.max(floorFrac, 1 - slope * Math.max(0, hr));
  return circleDpx(scale) * frac;
}

// ── Center-weighted pellet-landing model (CENTER-WEIGHTED-PELLET-SPEC.md) ────────────────────────
// Pellet impacts are a 2D isotropic Gaussian cone centered on the aim point, NOT a uniform disc
// (frame-measured on noir sg.MP4: 6-band study, all bands "denser-center"). A pellet lands / cores
// iff it falls within the boss body / core radius ⇒ the Rayleigh CDF. ONE σ drives BOTH SG landing
// and per-weapon core-hit (same cone at boss-body vs core radius), unifying Workstreams A/B/C.
export const K_SIGMA = 2.53;      // the visible spread disc (=circleDpx) is the ~2.5σ envelope
export const CORE_AUTOAIM = 0.55; // core-ONLY auto-aim loss (reticle never nails the ~1px true center)

// P(a pellet lands within radius R of the aim point) for an isotropic 2D Gaussian, σ.
export function rayleighWithin(R: number, sigma: number): number {
  if (sigma <= 0) return R > 0 ? 1 : 0;
  return 1 - Math.exp(-(R * R) / (2 * sigma * sigma));
}

// Pellet-spread σ (px) for a weapon at a given hit rate: half the (HR-shrunk) accuracy circle,
// divided by K_SIGMA. hr=0 gives AR 9.6 / SMG 14.1 / SG 32.0 px.
export function pelletSigma(
  scale: number,
  hr: number,
  slope: number,
  floorFrac: number,
): number {
  return circleDpxAtHr(scale, hr, slope, floorFrac) / 2 / K_SIGMA;
}

// Boss-body radius per band (px) from the measured hand-outlined area fraction: R_boss =
// R_disc·sqrt(hitFrac), where R_disc = circleDpx(250)/2 = 81 (noir reference). Reuses the measured
// silhouette; the Gaussian just re-weights the overlap. profileScale scales the boss size per boss.
export function bossBodyRadius(hitFrac: number, profileScale = 1): number {
  const RDISC = circleDpx(250) / 2;
  return RDISC * Math.sqrt(Math.max(0, hitFrac)) * profileScale;
}

// SG pellet-landing fraction: Gaussian cone (σ) overlapping the boss body (R_boss).
export function pelletLandFrac(hitFrac: number, sigma: number, profileScale = 1): number {
  return rayleighWithin(bossBodyRadius(hitFrac, profileScale), sigma);
}

// Core-hit fraction from the SAME cone at the core radius, with the core-only auto-aim loss.
export function pelletCoreFrac(coreDpxBand: number, sigma: number): number {
  return CORE_AUTOAIM * rayleighWithin(coreDpxBand / 2, sigma);
}
