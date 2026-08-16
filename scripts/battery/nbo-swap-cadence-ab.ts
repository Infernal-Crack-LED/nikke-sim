// nbo-swap-cadence-ab.ts — size Neon: Blue Ocean's burst weapon-swap throughput (⚑1 on her
// override) and prove the engine's MG-path swap-cadence hole.
//
//   npx tsx scripts/battery/nbo-swap-cadence-ab.ts
//
// WHY: `neon-blue-ocean` sits sim-#10 / community-#57-of-70 on the B3 DPS board
// (docs/b3-dps-rank-audit.md). Her override's ⚑1 leaves the swapped burst weapon's cadence
// kit-silent and falls back to the engine's swap default = "the base weapon's cadence". For an
// MG that default is the most aggressive assumption available: 60 rounds/s at the top of the
// measured wind-up ladder, with the belt refilled on swap entry, so her 7s window fires ~301
// shots at 33% of final ATK each (plus one 11% `extraHitDamagePct` rider per shot).
//
// This script runs the standard-framework control comp (little-mermaid / crown /
// helm-aquamarine / nbo) vs a Fire boss (her elemental advantage) under four arms:
//
//   base            shipped override, untouched
//   pps1.5          swap `pullsPerSec: 1.5` — the datamined swap ROF reading (90/60 = 1.5/s;
//                   `role.skillDetails.ulti_skill_detail.skill_value_data[1]`, the same column
//                   that reads 144→2.4/s for `k` and 4200→60/s for `velvet`, both of which ARE
//                   the shipped `pullsPerSec` on those two overrides)
//   pps1.5+SG       same, plus `weapon: 'SG'` — the "shotgun-class water cannon" reading (90 is
//                   exactly the SG class rate_of_fire), which also routes the swap through the
//                   pellet-landing model
//   noswap          the weaponSwap line deleted entirely — the floor: what she is worth on her
//                   base MG alone
//
// EXPECTED (and the point): `pps1.5` and `pps1.5+SG` print IDENTICAL numbers to `base`. The
// engine's fire loop branches `if (chargeFrames > 0) … else if (u.char.weapon === 'MG') … else
// { …swap pullsPerSec… }` (src/engine/sim.ts) — the MG wind-up branch is keyed on the unit's
// BASE weapon class and never reads `u.swap.pullsPerSec` or `u.swap.weapon`. So on an MG-base
// unit a swap cadence is silently unauthorable. NBO is the only MG unit in the tree carrying a
// `weaponSwap`, which is why nothing has caught it. Findings-only; print-only; nothing is enacted.
import { loadWorld } from './lib.js';
import { loadOverride } from '../../src/skills/overrides-node.js';
import { prepareTeam, type UnitOptions } from '../../src/prepare.js';
import { runSim, type SimResult } from '../../src/engine/sim.js';
import type { SimConfig } from '../../src/types.js';
import type { OverrideFile } from '../../src/skills/index.js';

const SLUG = 'neon-blue-ocean';
const SLUGS = ['little-mermaid', 'crown', 'helm-aquamarine', SLUG];

type Arm = { label: string; patch: (o: OverrideFile) => OverrideFile };

const clone = (o: OverrideFile): OverrideFile =>
  JSON.parse(JSON.stringify(o)) as OverrideFile;

function mapSwap(
  o: OverrideFile,
  fn: (e: Record<string, unknown>) => Record<string, unknown> | null
): OverrideFile {
  const out = clone(o);
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    const blocks = (out as unknown as Record<string, unknown[]>)[slot];
    if (!Array.isArray(blocks)) {
      continue;
    }
    for (const b of blocks as Record<string, unknown>[]) {
      const effects = b.effects as Record<string, unknown>[] | undefined;
      if (!effects) {
        continue;
      }
      b.effects = effects
        .map((e) => (e.kind === 'weaponSwap' ? fn(e) : e))
        .filter(Boolean) as Record<string, unknown>[];
    }
  }
  return out;
}

const ARMS: Arm[] = [
  { label: 'base (shipped)', patch: (o) => o },
  {
    label: 'swap pullsPerSec 1.5',
    patch: (o) => mapSwap(o, (e) => ({ ...e, pullsPerSec: 1.5 })),
  },
  {
    label: 'swap pullsPerSec 1.5 + weapon SG',
    patch: (o) => mapSwap(o, (e) => ({ ...e, pullsPerSec: 1.5, weapon: 'SG' })),
  },
  { label: 'weaponSwap removed', patch: (o) => mapSwap(o, () => null) },
];

const w = loadWorld();
const shipped = loadOverride(SLUG);
if (!shipped) {
  throw new Error(`no override for ${SLUG}`);
}

// runOnce() from ./lib.js re-reads every override off disk, so it cannot see an in-memory patch.
// Same basis as runOnce (scope lock: sync 400, 10/10/10, no cube, base5 gear, partless boss,
// 180s, deterministic — no seed), with the nbo override supplied by the caller.
function run(nbo: OverrideFile): SimResult {
  const chars = SLUGS.map((s) => w.data.characters[s]);
  const overrides = Object.fromEntries(
    SLUGS.map((s) => [s, s === SLUG ? nbo : loadOverride(s)])
  );
  const unitOpts: UnitOptions[] = SLUGS.map(() => ({
    doll: false,
    ol: 'base5',
  }));
  const cfg: SimConfig = {
    slugs: SLUGS,
    bossElement: 'Fire',
    bossDef: 0,
    level: 400,
    copies: 10,
    doll: false,
    ol: 'base5',
    coreHitRate: 0,
    rangeBonus: true,
    durationSec: 180,
  };
  const prepared = prepareTeam(chars, unitOpts, {
    overrides,
    skillLevels: w.skillLevels,
    cubes: w.cubes,
    olLines: w.olLines,
  });
  return runSim(chars, w.mult, cfg, prepared);
}

console.log(
  `\n${SLUGS.join(' / ')} — Fire boss (nbo elementally advantaged), core 0%, 180s, deterministic\n`
);
console.log(
  `${'arm'.padEnd(32)} ${'nbo damage'.padStart(11)} ${'share'.padStart(7)} ${'vs base'.padStart(9)} ${'FB'.padStart(4)} ${'bursts'.padStart(7)}`
);

const results: number[] = [];
for (const arm of ARMS) {
  const r = run(arm.patch(clone(shipped)));
  const u = r.units.find((x) => x.slug === SLUG);
  if (!u) {
    throw new Error('nbo missing from result');
  }
  const team = r.teamDamage;
  results.push(u.totalDamage);
  const rel =
    results.length === 1
      ? '—'
      : `${((u.totalDamage / results[0] - 1) * 100).toFixed(1)}%`;
  console.log(
    `${arm.label.padEnd(32)} ${(u.totalDamage / 1e6).toFixed(1).padStart(10)}M ${((100 * u.totalDamage) / team).toFixed(1).padStart(6)}% ${rel.padStart(9)} ${String(r.fullBursts).padStart(4)} ${String(u.burstCasts).padStart(7)}`
  );
}
console.log();
