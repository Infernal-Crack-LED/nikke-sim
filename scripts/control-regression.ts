// CONTROL REGRESSION — the liter / crown / helm support-core control suite.
//
// Source: docs/probes/720-kit-audit/{ada,maiden ice rose,scarlet black shadow,soda tb}.{jpg,MP4}
// — four independent 3:00 scope-lock recordings of the SAME support core, slot 5 empty:
//
//     slot 1  liter (Burst I)      constant
//     slot 2  crown (Burst II)     constant
//     slot 3  <carry> (Burst III)  the ONLY variable — ada / maiden-ice-rose /
//                                  scarlet-black-shadow / soda-twinkling-bunny
//     slot 4  helm  (Burst III)    constant  — the SR/Water helm, NOT helm-aquamarine
//
// That design is what makes this a CONTROL suite: the three constant supports get four
// independent readings of the same kit under four different carries, so a per-unit ratio that
// moves with the carry is a carry/interaction problem and one that holds across all four is the
// support's own kit. It is the tuning surface for driving liter / crown / helm to ratio 1.0.
//
// BOSS = Fire in all four (owner 2026-07-23: every 720-kit-audit recording uses the fire-boss
// preset — the owner's "water weak" label, the same mapping as `T4 water-weak (boss Fire)` in
// scripts/experiment.ts). Boss element is NOT inferable from footage (every boss is visually
// identical) — it comes from the owner, never from a frame grab. Under BEATS, Water beats Fire,
// so `helm` (Water) is the ONLY elementally-advantaged unit here; liter/crown (Iron) and every
// slot-3 carry (Electric / Electric / Wind / Iron) are neutral.
//
// FOCUS = the slot-3 carry (middle-slot default, the same convention the four C-* control comps
// in scripts/experiment.ts were wired under). Unconfirmed against the recorded camera.
//
// FULL-BURST COUNTS ARE NOT GRADED (owner 2026-07-23, "ignore FB counts for now") — no count has
// been video-measured off these four recordings, and an unmeasured pin would be a fabricated
// truth. This suite asserts DAMAGE ONLY. The FB count is printed for information.
//
// Two assert classes, same contract as scripts/regression.ts:
//  1. SNAPSHOTS — per-unit EV totals, a change DETECTOR. A diff that is intended regenerates with
//     `--update`, committed together with the change it reflects.
//  2. (no measured truths yet — see the FB note above.)
//
//   npx tsx scripts/control-regression.ts            # ratios + snapshot assert
//   npx tsx scripts/control-regression.ts --update   # regenerate snapshots
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import type { DataFile, LevelMultiplier, Element } from '../src/types.js';
import { runSim, MC_SEED_BASE, DEFAULT_MC_SEEDS } from '../src/engine/sim.js';
import { loadOverride } from '../src/skills/overrides-node.js';
import { scopeLockCfg } from './lib/scope-lock.js';
import {
  prepareTeam,
  type CubesFile,
  type OlLinesFile,
  type SkillLevelData,
  type UnitOptions,
} from '../src/prepare.js';

const data: DataFile = JSON.parse(readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8'));
const mult: LevelMultiplier = JSON.parse(readFileSync(new URL('../data/level-multiplier.json', import.meta.url), 'utf8'));
const cubes: CubesFile = JSON.parse(readFileSync(new URL('../data/cubes.json', import.meta.url), 'utf8'));
const olLines: OlLinesFile = JSON.parse(readFileSync(new URL('../data/ol-lines.json', import.meta.url), 'utf8'));
let skillLevels: SkillLevelData = {};
try {
  skillLevels = JSON.parse(readFileSync(new URL('../data/skill-levels.json', import.meta.url), 'utf8'));
} catch { /* optional */ }

export interface ControlComp {
  name: string;
  slugs: string[];
  boss: Element | null;
  focus?: string;
  modes?: Record<string, string>;
  lambda?: Record<string, 1 | 2 | 3>;
  /** end-of-fight Battle Records per-unit DAMAGE column (the ≡ row, NOT the ⚔ Combat Power). */
  real: Record<string, number>;
}

// Slot order + totals read off each Battle Records screenshot (slot order = team order,
// docs/probes/720-kit-audit/<name>.jpg). Digits re-verified at 3× zoom, 2026-07-23.
export const CONTROL_COMPS: ControlComp[] = [
  {
    name: 'CTRL ada (boss Fire, focus ada)',
    slugs: ['liter', 'crown', 'ada', 'helm'],
    boss: 'Fire',
    focus: 'ada',
    real: { liter: 124_543_305, crown: 211_302_032, ada: 628_376_078, helm: 589_548_661 },
  },
  {
    name: 'CTRL maiden-ice-rose (boss Fire, focus maiden-ice-rose)',
    slugs: ['liter', 'crown', 'maiden-ice-rose', 'helm'],
    boss: 'Fire',
    focus: 'maiden-ice-rose',
    real: { liter: 130_042_870, crown: 211_463_202, 'maiden-ice-rose': 558_995_823, helm: 573_101_464 },
  },
  {
    name: 'CTRL scarlet-black-shadow (boss Fire, focus scarlet-black-shadow)',
    slugs: ['liter', 'crown', 'scarlet-black-shadow', 'helm'],
    boss: 'Fire',
    focus: 'scarlet-black-shadow',
    real: { liter: 123_481_156, crown: 205_769_902, 'scarlet-black-shadow': 849_221_912, helm: 535_159_064 },
  },
  {
    name: 'CTRL soda-twinkling-bunny (boss Fire, focus soda-twinkling-bunny)',
    slugs: ['liter', 'crown', 'soda-twinkling-bunny', 'helm'],
    boss: 'Fire',
    focus: 'soda-twinkling-bunny',
    real: { liter: 118_663_892, crown: 174_602_181, 'soda-twinkling-bunny': 400_444_564, helm: 483_033_946 },
  },
];

function run(comp: ControlComp, seed?: number) {
  const chars = comp.slugs.map((s) => data.characters[s]);
  const unitOpts: UnitOptions[] = comp.slugs.map((slug) => ({
    doll: false, ol: 'base5', mode: comp.modes?.[slug], lambdaStage: comp.lambda?.[slug],
  }));
  const overrides: Record<string, ReturnType<typeof loadOverride>> = {};
  for (const s of comp.slugs) overrides[s] = loadOverride(s);
  const cfg = scopeLockCfg(comp.slugs, comp.boss, { focusSlug: comp.focus, seed });
  const prepared = prepareTeam(chars, unitOpts, { overrides, skillLevels, cubes, olLines });
  return runSim(chars, mult, cfg, prepared);
}

const SNAPSHOT_PATH = new URL('./control-regression-snapshot.json', import.meta.url);
const update = process.argv.includes('--update');
const snapshot: Record<string, Record<string, number>> = existsSync(SNAPSHOT_PATH)
  ? JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'))
  : {};

let failures = 0;
const fail = (msg: string) => { failures++; console.error(`  ✗ ${msg}`); };
const ok = (msg: string) => console.log(`  ✓ ${msg}`);

// ratio = sim/real (>1 HOT ▲ = sim over-models), the board convention — docs/CONVENTIONS.md.
const tag = (r: number) => (r > 1.03 ? 'HOT ▲' : r < 0.97 ? 'COLD ▼' : 'OK  ·');
const perUnit = new Map<string, number[]>();

for (const comp of CONTROL_COMPS) {
  console.log(`\n${comp.name}`);
  const ev = run(comp);

  // ratios: Monte-Carlo mean over the same seed set board-read uses (MC_SEED_BASE + i), so a
  // reading here is directly comparable to `npx tsx scripts/board-read.ts`.
  const totalsBySeed = new Map<string, number[]>();
  const fbCounts: number[] = [];
  for (let i = 0; i < DEFAULT_MC_SEEDS; i++) {
    const r = run(comp, MC_SEED_BASE + i);
    fbCounts.push(r.fullBursts);
    for (const u of r.units) {
      const arr = totalsBySeed.get(u.slug) ?? [];
      arr.push(u.totalDamage);
      totalsBySeed.set(u.slug, arr);
    }
  }
  const fbDist = [...new Set(fbCounts)].sort((a, b) => a - b).join('-');
  console.log(`  full bursts (NOT graded, informational): ${fbDist}`);
  for (const slug of comp.slugs) {
    const arr = totalsBySeed.get(slug)!;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const sd = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length);
    const real = comp.real[slug];
    const ratio = mean / real;
    perUnit.set(slug, [...(perUnit.get(slug) ?? []), ratio]);
    console.log(
      `  ${slug.padEnd(24)} sim ${(mean / 1e6).toFixed(0).padStart(5)}M  real ${(real / 1e6).toFixed(0).padStart(5)}M` +
      `  ratio ${ratio.toFixed(3)} ± ${(sd / real).toFixed(3)}  ${tag(ratio)}`
    );
  }

  // snapshot — per-unit EV totals, byte-stable
  const totals: Record<string, number> = {};
  for (const u of ev.units) totals[u.slug] = Math.round(u.totalDamage);
  if (update) {
    snapshot[comp.name] = totals;
  } else if (snapshot[comp.name]) {
    for (const [slug, val] of Object.entries(totals)) {
      const prev = snapshot[comp.name][slug];
      if (prev === undefined) continue;
      const drift = Math.abs(val - prev) / prev;
      if (drift > 0.001) fail(`${slug} total drifted ${(drift * 100).toFixed(2)}% (${prev} → ${val}) — intended? rerun with --update and commit with the change`);
      else ok(`${slug} snapshot stable`);
    }
  } else {
    console.log('  (no snapshot yet — run with --update)');
  }
}

// Cross-comp summary: the actual tuning readout. The three CONSTANT supports carry four
// readings each; a spread across them means the residual tracks the carry, a tight cluster
// off 1.0 means the support's own kit.
console.log('\nper-unit across the control suite (n = comps the unit appears in)');
for (const [slug, rs] of perUnit) {
  const mean = rs.reduce((a, b) => a + b, 0) / rs.length;
  const mad = rs.reduce((a, b) => a + Math.abs(b - 1), 0) / rs.length;
  console.log(
    `  ${slug.padEnd(24)} n=${rs.length}  mean ${mean.toFixed(3)}  |ratio−1| ${mad.toFixed(3)}` +
    `  [${rs.map((r) => r.toFixed(3)).join(' ')}]  ${tag(mean)}`
  );
}

if (update) {
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 1));
  console.log('\ncontrol snapshot regenerated — commit it together with the change it reflects');
} else if (failures) {
  console.error(`\ncontrol regression: ${failures} failure(s)`);
  process.exit(1);
} else {
  console.log('\ncontrol regression: all checks passed');
}
