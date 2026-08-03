// Buffer board: what does a long burst cooldown cost the tested unit, and what
// would happen if its stage were kept covered by a second no-op filler?
//
// The board inserts the tested unit into a fixed team and compares it against a
// stage-matched no-op baseline (src/ranks/buffer.ts assemble). The no-op it
// displaces bursts every 20s, so a unit with a longer cooldown holds up the
// team's whole Full Burst chain and pays for the Full Bursts the baseline gets
// and it does not — before a single buff is counted. This prints, for every
// tested unit whose effective cooldown exceeds 20s:
//
//   - SHIPPED     the team the board actually runs, with its FB count vs the
//                 baseline's, and the value that falls out
//   - IF PAIRED   the same unit with a no-op of its OWN stage added, so both
//                 sides full-burst the same number of times (the shape
//                 src/ranks/b1b2dps.ts B2_TEAM already uses)
//
// The IF PAIRED column is a HYPOTHETICAL — nothing here changes the board, and
// its numbers are not board numbers. Read it as "what is the cooldown toll
// worth", not as a proposed ranking.
//
// SELF-VALIDATING: this script builds its teams by hand, so its sim config
// could drift from carryDpsSum's. Every SHIPPED value is therefore checked
// against bufferValueFor — the board's own code path — and the run FAILS on a
// mismatch. (It caught a real one: a hardcoded bossElement that silently
// changed the answer for element-conditional kits.)
//
//   npx tsx scripts/probe/buffer-rotation-audit.ts
import { readFileSync } from 'node:fs';
import type { DataFile, LevelMultiplier, SimConfig } from '../../src/types.js';
import { loadOverride } from '../../src/skills/overrides-node.js';
import type { OverrideFile } from '../../src/skills/index.js';
import {
  prepareTeam,
  type CubesFile,
  type OlLinesFile,
  type PrepareDeps,
  type SkillLevelData,
} from '../../src/prepare.js';
import { runSim } from '../../src/engine/sim.js';
import { bufferValueFor } from '../../src/ranks/buffer.js';
import type { RanksCtx } from '../../src/ranks/burstgen.js';
import { NOOP_B1, NOOP_B2, NOOP_CHARACTERS } from '../../src/dpschart/noop.js';
import {
  CARRY_MG,
  CARRY_RL,
  syntheticFor,
} from '../../src/ranks/synthetics.js';

const load = <T>(rel: string): T =>
  JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8')) as T;

const data = load<DataFile>('../../data/characters.json');
const mult = load<LevelMultiplier>('../../data/level-multiplier.json');
const cubes = load<CubesFile>('../../data/cubes.json');
const olLines = load<OlLinesFile>('../../data/ol-lines.json');
let skillLevels: SkillLevelData = {};
try {
  skillLevels = load<SkillLevelData>('../../data/skill-levels.json');
} catch {
  /* optional */
}
const overrides: Record<string, OverrideFile | undefined> = {};
for (const slug of Object.keys(data.characters)) {
  overrides[slug] = loadOverride(slug);
}
const deps: PrepareDeps = { overrides, skillLevels, cubes, olLines };
const ctx: RanksCtx = { characters: data.characters as any, mult, deps };

const charFor = (s: string): any =>
  (data.characters as any)[s] ?? syntheticFor(s) ?? (NOOP_CHARACTERS as any)[s];

// Mirrors carryDpsSum (src/ranks/buffer.ts) for the GENERIC board: carries are
// Iron, so the boss is what Iron beats; the RL carry holds camera focus; only
// no-op fillers run with empty options.
function carryDps(slugs: string[]): { dps: number; fb: number } {
  const chars = slugs.map(charFor);
  const unitOpts = slugs.map((s) =>
    (NOOP_CHARACTERS as any)[s]
      ? {}
      : { ol: 'base5' as const, stars: 3, core: 7 }
  );
  const cfg: SimConfig = {
    slugs,
    bossElement: 'Electric', // BEATS.Iron — both generic carries are Iron
    bossDef: 0,
    level: 400,
    copies: 0,
    doll: false,
    ol: 'base5',
    coreHitRate: 0,
    rangeBonus: true,
    durationSec: 180,
    focusSlug: CARRY_RL,
  };
  const r = runSim(chars, mult, cfg, prepareTeam(chars, unitOpts as any, deps));
  const carries = [slugs.indexOf(CARRY_MG), slugs.lastIndexOf(CARRY_RL)];
  return {
    dps: carries.reduce((a, i) => a + r.units[i].dps, 0),
    fb: r.fullBursts,
  };
}
const pct = (t: { dps: number }, b: { dps: number }) =>
  ((t.dps - b.dps) / b.dps) * 100;

const cdOf = (slug: string): number =>
  overrides[slug]?.charFixes?.burstCooldownSec ??
  (data.characters as any)[slug]?.burstCooldownSec ??
  40;

// Every tested unit the board runs whose cooldown outlasts the 20s no-op, plus
// two 20s controls — a fix has to leave those alone to be a fix.
const CONTROLS = ['crown', 'liter'];
const subjects = Object.entries(data.characters as any)
  .filter(
    ([slug, c]: [string, any]) =>
      c.simSupported && (c.burst === 'I' || c.burst === 'II') && cdOf(slug) > 20
  )
  .map(([slug]) => slug)
  .sort();

process.stdout.write(
  `${subjects.length} tested units carry a burst cooldown longer than the 20s no-op they displace\n\n` +
    `${'unit'.padEnd(24)} ${'st'.padEnd(3)} ${'cd'.padEnd(4)} ${'SHIPPED'.padStart(8)}  FB      ${'IF PAIRED'.padStart(9)}  FB\n`
);

let failures = 0;
for (const slug of [...subjects, ...CONTROLS]) {
  const stage = (data.characters as any)[slug].burst === 'I' ? 'B1' : 'B2';
  const isB1 = stage === 'B1';
  // the shipped shapes, straight out of assemble()
  const filler = isB1 ? (cdOf(slug) > 20 ? NOOP_B1 : NOOP_B2) : NOOP_B1;
  const shipTeam = isB1
    ? [slug, filler, CARRY_MG, CARRY_RL]
    : [filler, slug, CARRY_MG, CARRY_RL];
  const shipBase = isB1
    ? [NOOP_B1, filler, CARRY_MG, CARRY_RL]
    : [filler, NOOP_B2, CARRY_MG, CARRY_RL];
  // the hypothetical: the tested unit's own stage stays covered by a no-op
  const pairTeam = isB1
    ? [slug, NOOP_B1, NOOP_B2, CARRY_MG, CARRY_RL]
    : [NOOP_B1, slug, NOOP_B2, CARRY_MG, CARRY_RL];
  const pairBase = isB1
    ? [NOOP_B1, NOOP_B1, NOOP_B2, CARRY_MG, CARRY_RL]
    : [NOOP_B1, NOOP_B2, NOOP_B2, CARRY_MG, CARRY_RL];

  const sT = carryDps(shipTeam);
  const sB = carryDps(shipBase);
  const pT = carryDps(pairTeam);
  const pB = carryDps(pairBase);
  const shipped = pct(sT, sB);

  // the guard: the hand-built SHIPPED team must agree with the board's own path
  const board = bufferValueFor(slug, 'generic', ctx, new Map(), null).valuePct;
  const agrees = Math.abs(shipped - board) < 0.02;
  if (!agrees) {
    failures++;
  }
  process.stdout.write(
    `${slug.padEnd(24)} ${stage} ${String(cdOf(slug)).padEnd(4)} ` +
      `${shipped.toFixed(2).padStart(7)}%  ${sT.fb}v${sB.fb}` +
      `${agrees ? '   ' : ` ✗board=${board.toFixed(2)} `}` +
      `   ${pct(pT, pB).toFixed(2).padStart(8)}%  ${pT.fb}v${pB.fb}\n`
  );
}

if (failures) {
  throw new Error(
    `${failures} SHIPPED value(s) disagree with bufferValueFor — this script's team/config no longer mirrors carryDpsSum; fix it before trusting any number above`
  );
}
process.stdout.write(
  '\nall SHIPPED values reproduce bufferValueFor — teams and sim config still mirror the board\n'
);
