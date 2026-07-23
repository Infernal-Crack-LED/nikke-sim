// W5 step 1 - PRE-REGISTERED per-unit movement table for the UNIGEO board A/B.
// Computed from the MODEL DELTAS (live cone vs UNIGEO) + the OFF-baseline bucket
// shares ONLY - no graded ON run is performed here. This table is committed BEFORE
// any OFF-vs-ON comparison is graded (rev 4 unpredicted-mover trigger basis).
//
// Method: per graded unit,
//   SG ('sg' and 'all'): predicted normal-bucket factor
//     F = sum_b w_b * (L_on/L_off) * (M_b + cb*acr_on)/(M_b + cb*acr_off),
//     w_b = band-time * L_off (normalized), M_b = 1 + 0.5*fbShare + critAvg + range_b,
//     fbShare ~0.35, critAvg ~0.075, range_b = 0.3 for the weapon's RANGE_ELIGIBLE bands.
//   AR/SMG ('all' only): same with L ratio = 1 and the unit's modeled live-HR state.
//   predicted dRatio = ratio_off * normalShare * (F - 1); band = point +-50% (stated slack).
// Also prints the raw per-band model tables. SG landing feeds burst gauge (missed
// pellets generate nothing), so FB counts are an EMPIRICAL check, not a formality.
import { readFileSync } from 'node:fs';
import type { DataFile, LevelMultiplier } from '../../src/types.js';
import { runSim } from '../../src/engine/sim.js';
import {
  unigeoSgLanding,
  unigeoSgCorePerLanded,
  unigeoSingleCoreProb,
} from '../../src/engine/unigeo.js';
import {
  BAND_CORE_PX,
  BAND_SG_HIT_FRAC,
  CONE_SIGMA_SHRINK,
  coneDelta,
  coneSigma,
  offsetCoreProb,
  pelletLandFrac,
} from '../../src/engine/sg-geometry.js';
import { loadOverride } from '../../src/skills/overrides-node.js';
import {
  prepareTeam,
  type CubesFile,
  type OlLinesFile,
  type SkillLevelData,
  type UnitOptions,
} from '../../src/prepare.js';
import { scopeLockCfg } from '../lib/scope-lock.js';
import { COMPS } from '../experiment.js';

const data: DataFile = JSON.parse(readFileSync(new URL('../../data/characters.json', import.meta.url), 'utf8'));
const mult: LevelMultiplier = JSON.parse(readFileSync(new URL('../../data/level-multiplier.json', import.meta.url), 'utf8'));
const cubes: CubesFile = JSON.parse(readFileSync(new URL('../../data/cubes.json', import.meta.url), 'utf8'));
const olLines: OlLinesFile = JSON.parse(readFileSync(new URL('../../data/ol-lines.json', import.meta.url), 'utf8'));
let skillLevels: SkillLevelData = {};
try {
  skillLevels = JSON.parse(readFileSync(new URL('../../data/skill-levels.json', import.meta.url), 'utf8'));
} catch { /* optional */ }

const BANDS = ['near', 'mid', 'midfar', 'far'] as const;
const BAND_T: Record<string, number> = { near: 69, mid: 33, midfar: 46, far: 36 };

// live cone SG landing/core at hr
function coneSgLanding(band: string, hr: number): number {
  const sig = coneSigma(250, hr, CONE_SIGMA_SHRINK.SG);
  return pelletLandFrac(BAND_SG_HIT_FRAC[band], sig, 1);
}
function coneCore(weapon: 'AR' | 'SMG' | 'SG', band: string, hr: number): number {
  const scale = { AR: 75, SMG: 110, SG: 250 }[weapon];
  const sig = coneSigma(scale, hr, CONE_SIGMA_SHRINK[weapon]);
  return Math.min(1, offsetCoreProb(BAND_CORE_PX[band] / 2, sig, coneDelta(weapon, hr)));
}

console.log('=== model tables (off = live cone, on = UNIGEO) ===');
console.log('SG landing @HR0 / @HR38.91:');
for (const b of BANDS) {
  console.log(
    `  ${b.padEnd(7)} off ${coneSgLanding(b, 0).toFixed(3)} -> on ${unigeoSgLanding(b, 0).toFixed(3)}` +
      `   | HR39 off ${coneSgLanding(b, 38.91).toFixed(3)} -> on ${unigeoSgLanding(b, 38.91).toFixed(3)}`,
  );
}
console.log('SG core-per-landed @HR0:');
for (const b of BANDS)
  console.log(`  ${b.padEnd(7)} off ${coneCore('SG', b, 0).toFixed(4)} -> on ${unigeoSgCorePerLanded(b, 0).toFixed(4)}`);
for (const w of ['AR', 'SMG'] as const) {
  for (const hr of [0, 22.37, 61.1, 80.78]) {
    const row = BANDS.map(
      (b) => `${b} ${coneCore(w, b, hr).toFixed(3)}->${(unigeoSingleCoreProb(w, b, hr) ?? NaN).toFixed(3)}`,
    ).join('  ');
    console.log(`${w} core @HR${hr}: ${row}`);
  }
}

// per-unit modeled live-HR state for the prediction (from override inspection):
// chisato 22.37 permanent-refreshed; quency-escape-queen ~61.1 while firing;
// jill 80.78 for ~10s per ~40s burst (mix 25%); others 0. noir's burst 13.93/10s noted, ~0.
const HR_STATE: Record<string, Array<[number, number]>> = {
  chisato: [[22.37, 1]],
  'quency-escape-queen': [[61.1, 1]],
  jill: [
    [0, 0.75],
    [80.78, 0.25],
  ],
};

const FB_SHARE = 0.35;
const CRIT_AVG = 0.075;
const RANGE_B: Record<string, Record<string, number>> = {
  SG: { near: 0.3, mid: 0, midfar: 0, far: 0 },
  SMG: { near: 0, mid: 0.3, midfar: 0, far: 0 },
  AR: { near: 0, mid: 0.3, midfar: 0, far: 0 },
};

function sgFactor(cb: number): number {
  let num = 0;
  let den = 0;
  for (const b of BANDS) {
    const w = BAND_T[b] * coneSgLanding(b, 0);
    const M = 1 + 0.5 * FB_SHARE + CRIT_AVG + RANGE_B.SG[b];
    num += w * (unigeoSgLanding(b, 0) / coneSgLanding(b, 0)) * ((M + cb * unigeoSgCorePerLanded(b, 0)) / (M + cb * coneCore('SG', b, 0)));
    den += w;
  }
  return num / den;
}
function singleFactor(weapon: 'AR' | 'SMG', cb: number, states: Array<[number, number]>): number {
  let f = 0;
  for (const [hr, wt] of states) {
    let num = 0;
    let den = 0;
    for (const b of BANDS) {
      const w = BAND_T[b];
      const M = 1 + 0.5 * FB_SHARE + CRIT_AVG + RANGE_B[weapon][b];
      num += w * ((M + cb * (unigeoSingleCoreProb(weapon, b, hr) ?? 0)) / (M + cb * coneCore(weapon, b, hr)));
      den += w;
    }
    f += wt * (num / den);
  }
  return f;
}

console.log('\n=== OFF baseline (deterministic) + predicted movers ===');
console.log('comp | unit | weapon | ratio_off | normShare | F_sg | F_all | pred dRatio sg | pred dRatio all');
const rows: string[] = [];
for (const comp of COMPS) {
  const chars = comp.slugs.map((s) => data.characters[s]);
  const overrides: Record<string, ReturnType<typeof loadOverride>> = {};
  for (const s of comp.slugs) overrides[s] = loadOverride(s);
  const unitOpts: UnitOptions[] = comp.slugs.map((slug) => ({
    doll: false,
    ol: 'base5',
    mode: comp.modes?.[slug],
    lambdaStage: comp.lambda?.[slug],
  }));
  const cfg = scopeLockCfg(comp.slugs, comp.boss, { focusSlug: comp.focus });
  const prepared = prepareTeam(chars, unitOpts, { overrides, skillLevels, cubes, olLines });
  const res = runSim(chars, mult, cfg, prepared);
  for (const u of res.units) {
    const ch = data.characters[u.slug];
    const w = ch.weapon;
    const real = comp.real[u.slug];
    const ratio = u.totalDamage / real;
    const nShare = u.breakdown.normal / u.totalDamage;
    const cb = (ch.coreAttackMultiplier - 100) / 100;
    let fSg = 1;
    let fAll = 1;
    if (w === 'SG') {
      fSg = sgFactor(cb);
      fAll = fSg;
    } else if (w === 'AR' || w === 'SMG') {
      fAll = singleFactor(w, cb, HR_STATE[u.slug] ?? [[0, 1]]);
    }
    const dSg = ratio * nShare * (fSg - 1);
    const dAll = ratio * nShare * (fAll - 1);
    if (w === 'SG' || w === 'AR' || w === 'SMG') {
      rows.push(
        `${comp.name} | ${u.slug} | ${w} | ${ratio.toFixed(3)} | ${nShare.toFixed(3)} | ${fSg.toFixed(4)} | ${fAll.toFixed(4)} | ${dSg >= 0 ? '+' : ''}${dSg.toFixed(4)} | ${dAll >= 0 ? '+' : ''}${dAll.toFixed(4)}`,
      );
    }
  }
}
for (const r of rows) console.log(r);
