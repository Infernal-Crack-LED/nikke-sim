// Unit regression for the accuracy-circle geometry module (src/engine/sg-geometry.ts).
// Reproduces the calibration points and the §5 independent cross-check from
// docs/data/sg-calc/ (DERIVATION.md, accuracy-circle-calibration.json). These pin the
// px relations so a later refit (e.g. new k,c after a hard range measurement) can't
// silently drift the geometry primitives. All tolerances follow the stated fit residuals.
//
//   npx tsx scripts/sg-geometry-regression.ts
import {
  circleDpx,
  coreDpx,
  rangeFromCoreDpx,
  coreFracGeo,
  circleDpxAtHr,
  BAND_CORE_PX,
  BAND_SG_HIT_FRAC,
  rayleighWithin,
  pelletSigma,
  pelletLandFrac,
  pelletCoreFrac,
} from '../src/engine/sg-geometry.js';

let failures = 0;
function ok(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`  ✗ ${msg}`);
    failures++;
  } else {
    console.log(`  ✓ ${msg}`);
  }
}
function close(a: number, b: number, tol: number, msg: string): void {
  ok(Math.abs(a - b) <= tol, `${msg}  (got ${a.toFixed(3)}, want ${b}±${tol})`);
}

console.log('== §2 scale → circle px (3 independent bloom-peak points, proportional, residuals ≤0.7px) ==');
close(circleDpx(75), 48, 0.7, 'AR scarlet scale 75 → ~48px (bloom peak)');
close(circleDpx(110), 71.5, 0.7, 'SMG lm scale 110 → ~71.5px (bloom peak)');
close(circleDpx(250), 162, 0.7, 'SG noir scale 250 → ~162px (bloom peak)');

console.log('\n== §3 range → core px (inverse-with-offset at implied ranges) ==');
close(coreDpx(20.7), BAND_CORE_PX.near, 0.5, 'range 20.7 → near core 31px');
close(coreDpx(28.0), BAND_CORE_PX.mid, 0.5, 'range 28.0 → mid core 28px');
close(coreDpx(52.9), BAND_CORE_PX.midfar, 0.5, 'range 52.9 → midfar core 21px');
close(coreDpx(76.4), BAND_CORE_PX.far, 0.5, 'range 76.4 → far core 17px');
close(rangeFromCoreDpx(28), 28.0, 0.01, 'rangeFromCoreDpx is the exact inverse of coreDpx');

console.log('\n== §5 reframe: AR accuracy circle = 48px (base ~0.34 core); 29px is the HR-shrink floor ≈ core ==');
// The AR 75-scale accuracy circle is 48px fully bloomed → a 0.34 base core fraction, NOT ~1. The old
// "≈1 at optimal" reading came from a 29px mid-bloom snapshot. 29px is really the CONTRACTED / HR-shrink
// floor, which ≈ the mid-band core (28px) — that inner bound is where core saturates (→~1) as high Hit
// Rate squeezes the bloom down to it, not the base circle.
const AR_INNER_BOUND_PX = 29; // contracted / HR-shrink floor reading; ≈ core
close(circleDpx(75), 48, 0.7, 'AR accuracy circle (bloom peak) = 48px');
close(AR_INNER_BOUND_PX, BAND_CORE_PX.mid, 1, 'AR HR-shrink floor 29px ≈ mid core 28px (independent, ≤1px)');
close(coreFracGeo(BAND_CORE_PX.mid, 48), 0.34, 0.03, 'base AR core fraction ≈ 0.34 at the 48px accuracy circle');
ok(coreFracGeo(BAND_CORE_PX.mid, AR_INNER_BOUND_PX) > 0.9, 'core fraction → ~1 as HR shrinks the bloom to the 29px floor');

console.log('\n== coreFracGeo basics ==');
ok(coreFracGeo(50, 25) === 1, 'core larger than circle clamps to 1');
close(coreFracGeo(15, 30), 0.25, 1e-9, 'half-diameter core → quarter area');
ok(coreFracGeo(10, 0) === 1, 'zero circle (dead zone) → fully covered (guarded)');

console.log('\n== circleDpxAtHr (HR shrinks the circle) ==');
const s = 1.4285 / 168.3931;
const floor = 1 - s * 100;
ok(circleDpxAtHr(75, 0, s, floor) === circleDpx(75), 'hr=0 leaves the circle unchanged');
ok(circleDpxAtHr(75, 50, s, floor) < circleDpx(75), 'positive hr shrinks the circle');
ok(circleDpxAtHr(75, 1e6, s, floor) >= circleDpx(75) * floor - 1e-9, 'shrink is floored (never collapses to 0)');

console.log('\n== center-weighted pellet model (spec §3: σ, landing, unified core) ==');
const SLOPE = 1.4285 / 168.3931;
const FLOOR = 1 - SLOPE * 100;
// σ per weapon at hr=0 (spec §2a): AR 9.6 / SMG 14.1 / SG 32.0 px
close(pelletSigma(75, 0, SLOPE, FLOOR), 9.6, 0.2, 'AR pellet σ ≈ 9.6px');
close(pelletSigma(110, 0, SLOPE, FLOOR), 14.1, 0.2, 'SMG pellet σ ≈ 14.1px');
close(pelletSigma(250, 0, SLOPE, FLOOR), 32.0, 0.2, 'SG pellet σ ≈ 32.0px');
ok(pelletSigma(250, 40, SLOPE, FLOOR) < pelletSigma(250, 0, SLOPE, FLOOR), 'higher HR shrinks σ');
// SG landing reproduces the measured recon shape (spec §3 table), σ_SG at hr=0
const sigSG = pelletSigma(250, 0, SLOPE, FLOOR);
close(pelletLandFrac(BAND_SG_HIT_FRAC.near, sigSG), 0.922, 0.01, 'SG landing near ≈ 0.922 (recon 0.888)');
close(pelletLandFrac(BAND_SG_HIT_FRAC.far, sigSG), 0.775, 0.01, 'SG landing far ≈ 0.775 (recon 0.740)');
ok(
  pelletLandFrac(BAND_SG_HIT_FRAC.near, sigSG) > pelletLandFrac(BAND_SG_HIT_FRAC.far, sigSG),
  'SG landing falls with range (near > far), matching recon',
);
// unified core reproduces the measured near-core cells (CORE_AUTOAIM = 0.55)
close(pelletCoreFrac(BAND_CORE_PX.near, pelletSigma(75, 0, SLOPE, FLOOR)), 0.400, 0.01, 'AR near core ≈ 0.400 (measured 0.40)');
close(pelletCoreFrac(BAND_CORE_PX.near, pelletSigma(110, 0, SLOPE, FLOOR)), 0.250, 0.02, 'SMG near core ≈ 0.25 (measured 0.28)');
close(pelletCoreFrac(BAND_CORE_PX.near, sigSG), 0.061, 0.02, 'SG near core ≈ 0.06 (measured 0.048)');
close(rayleighWithin(0, 10), 0, 1e-9, 'rayleigh(0) = 0');
ok(rayleighWithin(1e6, 10) > 0.999, 'rayleigh(∞) → 1');

if (failures) {
  console.error(`\nsg-geometry regression: ${failures} FAILED`);
  process.exit(1);
}
console.log('\nsg-geometry regression: all checks passed');
