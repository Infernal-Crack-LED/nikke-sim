// Deterministic engine regression gate (nikke-sim's ids-style sim harness).
//
// Two assert classes:
//  1. MEASURED TRUTHS — facts established by video/gauge measurement (full-burst
//     counts of the graded comps, the two solo gauge fills). These must hold
//     EXACTLY; a failure means the engine regressed against reality, not
//     against a snapshot. Never "update" these without a new measurement.
//  2. SNAPSHOTS — per-unit damage totals for every lab comp, recorded from a
//     known-good run. A failure here is a change DETECTOR, not necessarily a
//     bug: if the diff is intended (a deliberate model change), regenerate with
//     `npx tsx scripts/regression.ts --update` and commit the new snapshot
//     together with the change and its docs (the stop-doc-drift hook will
//     remind you about the source-of-truth docs).
//
//   npx tsx scripts/regression.ts            # assert
//   npx tsx scripts/regression.ts --update   # regenerate snapshots
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import type { DataFile, LevelMultiplier, SimConfig, Element } from '../src/types.js';
import { runSim } from '../src/engine/sim.js';
import { loadOverride } from '../src/skills/overrides-node.js';
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

interface Comp {
  name: string;
  slugs: string[];
  boss: Element | null;
  focus?: string;
  lambda?: Record<string, 1 | 2 | 3>;
  modes?: Record<string, string>;
  // measured truth (video-counted). undefined = ungraded (snapshot-only).
  realFullBursts?: number | [number, number];
}

// Keep slot orders in sync with scripts/experiment.ts (the lab is authoritative
// for comp definitions; this file pins the measured subset).
const COMPS: Comp[] = [
  {
    name: 'elec battery (run B order)',
    slugs: ['moran', 'cinderella', 'neon-vision-eye', 'trina'],
    boss: 'Water', focus: 'cinderella',
    realFullBursts: 11, // video, docs/probes/u8 + tb2 test 1
  },
  {
    name: 'misc B3s (run I order)',
    slugs: ['grave', 'anis-star', 'jill', 'chisato', 'noir'],
    boss: 'Water',
    realFullBursts: 13, // video, docs/probes/u8 i + tb2 test 4
  },
  {
    name: 'elec DPS (run E order)',
    slugs: ['crown', 'ein', 'ada', 'rouge', 'cinderella'],
    boss: 'Water',
    realFullBursts: [11, 12], // video, docs/probes/u8 e
  },
  {
    name: 'iron sweep (run G)',
    slugs: ['d-killer-wife', 'takina', 'milk-blooming-bunny', 'maxwell', 'liberalio'],
    boss: 'Electric',
    realFullBursts: [13, 14], // video, docs/probes/u8 g
  },
  {
    name: 'T2 elec-weak',
    slugs: ['crown', 'neon-vision-eye', 'anis-star', 'cinderella', 'maiden-ice-rose'],
    boss: 'Water',
    realFullBursts: 12, // video, probe u7 "12 burst count elec weak" (2026-07-14): 12/12 splash-counted, caster order exact
  },
  {
    name: 'T5 wind-weak',
    slugs: ['nayuta', 'cinderella-crystal-wave', 'anis-star', 'liberalio', 'velvet'],
    boss: 'Iron',
    realFullBursts: 13, // video, probe u7 "13 fb count wind weak" (2026-07-14): 13/13 splash-counted, caster order exact
  },
  {
    name: 'PA MiKa',
    slugs: ['anis-star', 'mint', 'prika', 'alice', 'red-hood'],
    boss: 'Iron',
    modes: { mint: 'duet (w/ Prika)', prika: 'duet (w/ Mint)' },
    realFullBursts: 11, // video, rrh probe "mika t255 11fb" (2026-07-14): 11/11 splash-counted,
    // casters exact incl. the OWNER CONVENTION for the mint/prika duet: first chain cast
    // MANUALLY (prika takes the first Burst 2 per burstFirst), auto thereafter (mint B2).
  },
  {
    name: 'T1 wind-weak',
    slugs: ['mast-romantic-maid', 'scarlet-black-shadow', 'anis-star', 'liberalio', 'crown'],
    boss: 'Iron',
    realFullBursts: 13, // video, rrh probe "windweak t257 13fb" (2026-07-14): 13/13, casters
    // exact incl. the alternating Burst II (mast odd cycles / crown even)
  },
  // T4: KNOWN MISMATCH — real = 14 FBs with privaty focus (probe u7, 2026-07-14) vs sim 13.
  // Do NOT pin until the ~1s-fast cycle increment lands (see experiment-harness-ai.md).
  { name: 'T4', slugs: ['anis-star', 'privaty', 'snow-white-heavy-arms', 'helm', 'crown'], boss: 'Fire' },
  { name: 'T7', slugs: ['crown', 'rapi-red-hood', 'anis-star', 'cinderella', 'mast-romantic-maid'], boss: 'Water' },
];

function run(comp: Comp, seed?: number) {
  const chars = comp.slugs.map((s) => data.characters[s]);
  const unitOpts: UnitOptions[] = comp.slugs.map((slug) => ({
    doll: false, ol: 0, mode: comp.modes?.[slug], lambdaStage: comp.lambda?.[slug],
  }));
  const overrides: Record<string, ReturnType<typeof loadOverride>> = {};
  for (const s of comp.slugs) overrides[s] = loadOverride(s);
  const cfg: SimConfig = {
    slugs: comp.slugs, bossElement: comp.boss, bossDef: 0, level: 400, copies: 10,
    doll: false, ol: 0, coreHitRate: 1, rangeBonus: true, durationSec: 180,
    focusSlug: comp.focus, seed,
  };
  const prepared = prepareTeam(chars, unitOpts, { overrides, skillLevels, cubes, olLines });
  return runSim(chars, mult, cfg, prepared);
}

const SNAPSHOT_PATH = new URL('./regression-snapshot.json', import.meta.url);
const update = process.argv.includes('--update');
const snapshot: Record<string, Record<string, number>> = existsSync(SNAPSHOT_PATH)
  ? JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'))
  : {};

let failures = 0;
const fail = (msg: string) => { failures++; console.error(`  ✗ ${msg}`); };
const ok = (msg: string) => console.log(`  ✓ ${msg}`);

for (const comp of COMPS) {
  console.log(`\n${comp.name}`);
  const res = run(comp);

  // 1. measured truths — full-burst counts
  if (comp.realFullBursts !== undefined) {
    const want = comp.realFullBursts;
    const got = res.fullBursts;
    const pass = Array.isArray(want) ? got >= want[0] && got <= want[1] : got === want;
    (pass ? ok : fail)(
      `full bursts ${got} vs measured ${Array.isArray(want) ? want.join('-') : want}`
    );
  }

  // 2. snapshots — per-unit totals (deterministic run must be byte-stable)
  const totals: Record<string, number> = {};
  for (const u of res.units) totals[u.slug] = Math.round(u.totalDamage);
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

// 3. seeded determinism: same seed twice must be identical
{
  console.log('\nseeded determinism');
  const a = run(COMPS[0], 1234).units.map((u) => Math.round(u.totalDamage)).join(',');
  const b = run(COMPS[0], 1234).units.map((u) => Math.round(u.totalDamage)).join(',');
  (a === b ? ok : fail)(`seed 1234 reproduces (${a === b ? 'identical' : 'DIVERGED'})`);
}

if (update) {
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 1));
  console.log('\nsnapshot regenerated — commit it together with the engine change it reflects');
} else if (failures) {
  console.error(`\nregression: ${failures} failure(s)`);
  process.exit(1);
} else {
  console.log('\nregression: all checks passed');
}
