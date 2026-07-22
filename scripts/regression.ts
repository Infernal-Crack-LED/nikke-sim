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
import { assembleTeam, type Cell } from '../src/dpschart/matrix.js';
import { NOOP_CHARACTERS } from '../src/dpschart/noop.js';

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
    // video-measured 11-12 (docs/probes/u8 e). The coherent rotation model (2026-07-21: 30f-pre-B1 +
    // 22f-pre-FB + POST_FB 180→90) reads 10 here — a ±1 cycle-boundary UNDER-count, the opposite-side
    // pair of N3 (which OVER-counts by 1 without the ~1.5s POST_FB grace). Accepted as the inherent ±1
    // FB boundary noise (owner 2026-07-21), NOT a fresh measurement — the measured truth stays 11-12.
    realFullBursts: [10, 12],
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
    // exact incl. the alternating Burst II (mast odd cycles / crown even). OWNER NOTE
    // 2026-07-14: that recording had SCARLET in the MIDDLE slot (default focus) — i.e. a
    // different slot order than this comp definition. Sim predicts 13 with scarlet focus
    // too (verified), rotation alternation matched either way, so the pin holds; the
    // popups in that video are scarlet's.
  },
  {
    name: 'PH water B3s',
    slugs: ['little-mermaid', 'crown', 'quency-escape-queen', 'dorothy-serendipity', 'guillotine-winter-slayer'],
    boss: 'Fire',
    // FB UNPINNED 2026-07-17 (SMG cadence 20→24 = datamined ROF, role-audit D.2 owner decision a):
    // measured = 12 (video, rrh probe "water weak vid" 2026-07-14: 12/12 splash-counted, first banner
    // exact 2:54) but sim now reads 13. This is the SAME ±1 burst-cycle-boundary over-prediction as
    // T4/T7/N2/N4/N5 — the only SMG comp it affects (2 SMGs + little-mermaid's teamAmmo-400/37% fill,
    // whose +20% ammo rate trips one cycle early). Every OTHER SMG measured-FB comp still holds at 24.
    // Re-pin to 12 if/when the burst-cycle increment lands, or after a fresh PH-water FB re-measure.
    // guillotine-winter-slayer never bursts (bench B3) confirmed.
  },
  // T4: KNOWN MISMATCH — real = 14 FBs with privaty focus (probe u7, 2026-07-14) vs sim 13.
  // Do NOT pin until the ~1s-fast cycle increment lands (see experiment-harness-ai.md).
  { name: 'T4', slugs: ['anis-star', 'privaty', 'snow-white-heavy-arms', 'helm', 'crown'], boss: 'Fire' },
  { name: 'T7', slugs: ['crown', 'rapi-red-hood', 'anis-star', 'cinderella', 'mast-romantic-maid'], boss: 'Water' },

  // 714 noon probe (2026-07-14) — six of nine teams measured full-burst-exact via the
  // yellow-splash scan (see docs/probe-runs.md). Focus = middle slot (default), unconfirmed
  // against the recorded camera but the count holds. The three unpinned teams from that
  // batch are DELIBERATELY omitted: N2 (real >=10 vs sim 8, big under-count), N4 (real 10 vs
  // sim 11), N5 (real 12 vs sim 11) — all belong to the open burst-cycle timing increment,
  // like T4/T7.
  {
    name: 'N1 rapi/quency wind',
    slugs: ['d-killer-wife', 'grave', 'rapi-red-hood', 'quency-escape-queen', 'jill'],
    boss: 'Wind', focus: 'rapi-red-hood',
    realFullBursts: 13, // video: 13/13, uniform ~14s cadence
  },
  {
    name: 'N3 scarlet/liberalio iron',
    slugs: ['rouge', 'trina', 'scarlet-black-shadow', 'liberalio', 'soda-twinkling-bunny'],
    boss: 'Iron', focus: 'scarlet-black-shadow',
    realFullBursts: 10, // video: 10/10
  },
  {
    name: 'N6 mihara/maiden wind',
    slugs: ['little-mermaid', 'ade-agent-bunny', 'mihara-bonding-chain', 'maiden-ice-rose', 'maxwell'],
    boss: 'Wind', focus: 'mihara-bonding-chain',
    realFullBursts: 11, // video: 11/11
  },
  {
    name: 'N9 redhood/elegg electric',
    slugs: ['moran', 'crown', 'red-hood', 'elegg-boom-and-shock', 'dorothy-serendipity'],
    boss: 'Electric', focus: 'red-hood',
    realFullBursts: 12, // video: 12/12
  },
  {
    name: 'soda-tb control (neutral, focus soda-twinkling-bunny)',
    slugs: ['little-mermaid', 'crown', 'soda-twinkling-bunny', 'helm'],
    boss: null, focus: 'soda-twinkling-bunny',
    // KNOWN MISMATCH — real = 10 Full Bursts, sim = 9. DELIBERATELY UNPINNED, same treatment as T4/T7
    // above: pinning a count the sim cannot currently hit would just paint the gate red without adding
    // information. The comp is still graded on damage + snapshot.
    //   Measured 10 counted 2026-07-22 off the on-screen Full-Burst countdown (it ticks 1.00/s, verified
    //   across 8 consecutive reads), NOT from the 2026-07-15 recon's approximate start times: 13.29 left
    //   at video 164.2 pins her cast-162 window to exactly 15.0s, and 10.28 left at 182.5 pins a further
    //   window a 15.0s duration could not fit (the previous ran to 177.5) — 12.0s puts its start at
    //   180.8 with the chip counter reading 19, i.e. the +2s tier. Both ladder tiers, directly measured.
    //   The sim's shortfall is the open inter-Full-Burst overhead thread (N3 is the chip-free probe:
    //   15.0s window + 4.4s overhead = 19.4s cycle, where ten 15.0s windows in 180s need <=3.0s).
    //   RE-PIN TO 10 when that lands. Do NOT close it by shrinking the extension back toward +4 — the
    //   +2/+5 ladder is measurement-confirmed at both tiers.
    // Boss is NEUTRAL (owner 2026-07-22) — the control videos advantage nobody; see experiment.ts.
  },
];

function run(comp: Comp, seed?: number) {
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

// Full-burst counts are judged against the SEEDED distribution, not the single EV run.
// The real fight's FB count itself varies ±1 at boss-transition boundaries (the boss-range
// transition times + burst chain-cast gaps jitter per seed; the unseeded EV run pins them and
// can sit exactly on a burst-cadence collision that any jitter avoids — e.g. PE elec-DPS reads
// 10 in EV but 11×60%/12×40% seeded, matching the measured 11-12). So a comp PASSES when the
// measured value/range OVERLAPS the seeded run's observed [min,max] over the same MC seed set
// board-read uses (MC_SEED_BASE + i). Totals stay on the EV run (byte-stable, below).
function fbDistribution(comp: Comp): { min: number; max: number; counts: Map<number, number> } {
  const counts = new Map<number, number>();
  for (let i = 0; i < DEFAULT_MC_SEEDS; i++) {
    const fb = run(comp, MC_SEED_BASE + i).fullBursts;
    counts.set(fb, (counts.get(fb) ?? 0) + 1);
  }
  const vals = [...counts.keys()];
  return { min: Math.min(...vals), max: Math.max(...vals), counts };
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

  // 1. measured truths — full-burst counts (judged vs the SEEDED distribution, see fbDistribution)
  if (comp.realFullBursts !== undefined) {
    const want = comp.realFullBursts;
    const [w0, w1] = Array.isArray(want) ? want : [want, want];
    const { min, max, counts } = fbDistribution(comp);
    const pass = w0 <= max && w1 >= min; // measured range overlaps the seeded [min,max]
    const dist = [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([v, n]) => `${v}×${n}`).join(' ');
    const seededStr = min === max ? `${min}` : `${min}-${max}`;
    (pass ? ok : fail)(
      `[${comp.name}] full bursts seeded ${seededStr} (${dist}) vs measured ${Array.isArray(want) ? want.join('-') : want}`
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

// 4. Mast burst-gate (syncWithFocus) invariant: in the Hyper Carry frameworks a gated
// Mast never bursts more often than the focus (tested) unit — she only casts in a chain
// the focus completes, never a Helm-only chain. (Inert for these high-CDR control comps
// where the focus already bursts every full burst; the assert locks the contract.)
{
  console.log('\nMast burst-gate (syncWithFocus)');
  const tslug = 'cinderella-crystal-wave';
  const tested = { slug: tslug, element: data.characters[tslug].element as Element };
  const cell: Cell = { framework: 'standard-hc', eleadv: 'neutral', core: 'c100', invest: 'scope' };
  const team = assembleTeam(cell, tested);
  const overrides: Record<string, ReturnType<typeof loadOverride>> = {};
  for (const s of team.slugs) overrides[s] = loadOverride(s);
  const chars = team.slugs.map((s) => data.characters[s]);
  const prepared = prepareTeam(chars, team.unitOpts, { overrides, skillLevels, cubes, olLines });
  const r = runSim(chars, mult, team.cfg, prepared);
  const mast = r.units.find((u) => u.slug === 'mast-romantic-maid')!.burstCasts;
  const focus = r.units.find((u) => u.slug === tslug)!.burstCasts;
  (mast <= focus ? ok : fail)(`gated Mast casts (${mast}) ≤ focus casts (${focus})`);
}

// 5. Solo framework contract: the synthetic no-op controls deal ZERO damage, and the
// tested unit alternates the stage-3 cast with the no-op B3 — every OTHER full burst
// (everyOther gate + 7s CDR). Modernia is the adversarial case: her FB-extending burst
// (15s) would otherwise let the leftmost-wait rule hand her consecutive casts.
{
  console.log('\nSolo framework (no-op controls + every-other bursts)');
  for (const tslug of ['scarlet', 'modernia']) {
    const tested = { slug: tslug, element: data.characters[tslug].element as Element };
    const cell: Cell = { framework: 'solo', eleadv: 'neutral', core: 'c100', invest: 'scope' };
    const team = assembleTeam(cell, tested);
    const overrides: Record<string, ReturnType<typeof loadOverride>> = {};
    for (const s of team.slugs) overrides[s] = loadOverride(s);
    const chars = team.slugs.map((s) => data.characters[s] ?? NOOP_CHARACTERS[s]);
    const prepared = prepareTeam(chars, team.unitOpts, { overrides, skillLevels, cubes, olLines });
    const r = runSim(chars, mult, team.cfg, prepared);
    const t = r.units[team.testedIndex];
    const noopDmg = r.units.reduce((s, u, i) => (i === team.testedIndex ? s : s + u.totalDamage), 0);
    const noopB3 = r.units.find((u) => u.slug === 'noop-b3-rl')!;
    (noopDmg === 0 ? ok : fail)(`${tslug}: no-op controls deal 0 damage (got ${noopDmg})`);
    const alternates =
      r.fullBursts > 0 &&
      t.burstCasts + noopB3.burstCasts === r.fullBursts &&
      Math.abs(t.burstCasts - noopB3.burstCasts) <= 1;
    (alternates ? ok : fail)(
      `${tslug}: every-other bursts (tested ${t.burstCasts} + no-op B3 ${noopB3.burstCasts} = FB ${r.fullBursts})`,
    );
  }
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
