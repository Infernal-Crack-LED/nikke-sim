// Functional test for the ROUND-COUNT buff-duration primitive (durationShots).
//
// "for N round(s)" kit lines expire after the HOLDER fires N rounds, not after a wall-clock
// window. The distinction is only observable when the N rounds span a RELOAD — which is exactly
// helm's case: her burst grants Charge Damage Multiplier ▲158.4% "for 10 round(s)" and her
// magazine is 6, so the window covers ~6 charged shots, a reload, then ~4 more. A durationSec
// approximation either truncates at the reload or overshoots past the 10th round.
//
// Fixture: the control comp (liter / crown / ada / helm) so helm actually casts her burst — a
// lone Burst III never bursts. Only helm's burst block is patched in memory; her committed
// override JSON is untouched. Deterministic EV runs (no seed) so totals are byte-stable.
//
// Assertions:
//   1. MECHANISM LIVE     — more rounds ⇒ more damage (durationShots 1 < 10).
//   2. PER-ROUND DECREMENT — damage is STRICTLY monotonic across N = 1..10. A time proxy, or a
//      decrement that fired on anything other than her own rounds, would plateau somewhere in
//      that ladder; one extra round must always buy exactly one more buffed charged shot.
//   3. SPANS THE RELOAD   — durationShots 10 beats the durationSec 13 model it replaces. 13s
//      covers ~7 charged shots at her measured 90-frame bolt cycle once the mid-window reload is
//      paid, so a round count that survived the reload MUST score higher. This is the assertion
//      that actually discriminates rounds from seconds.
//   4. SELF-SCOPED/INERT  — her teammates are byte-identical across every N. The buff targets
//      self, so a decrement that leaked onto other units (or a shared budget) would move them.
//      Inertness for units with NO round-scoped buff is proven separately by the regression
//      snapshot being byte-identical for every non-carrier.
//
//   npx tsx scripts/tests/duration-shots.test.ts
import { readFileSync } from 'node:fs';
import type { DataFile, LevelMultiplier } from '../../src/types.js';
import { runSim } from '../../src/engine/sim.js';
import { loadOverride } from '../../src/skills/overrides-node.js';
import { scopeLockCfg } from '../lib/scope-lock.js';
import {
  prepareTeam,
  type CubesFile,
  type OlLinesFile,
  type SkillLevelData,
} from '../../src/prepare.js';

const data: DataFile = JSON.parse(readFileSync(new URL('../../data/characters.json', import.meta.url), 'utf8'));
const mult: LevelMultiplier = JSON.parse(readFileSync(new URL('../../data/level-multiplier.json', import.meta.url), 'utf8'));
const cubes: CubesFile = JSON.parse(readFileSync(new URL('../../data/cubes.json', import.meta.url), 'utf8'));
const olLines: OlLinesFile = JSON.parse(readFileSync(new URL('../../data/ol-lines.json', import.meta.url), 'utf8'));
let skillLevels: SkillLevelData = {};
try {
  skillLevels = JSON.parse(readFileSync(new URL('../../data/skill-levels.json', import.meta.url), 'utf8'));
} catch { /* optional */ }

let failures = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`);
const fail = (m: string) => { failures++; console.error(`  ✗ ${m}`); };

const SLUGS = ['liter', 'crown', 'ada', 'helm'];

/**
 * Run the control comp with helm's burst Charge-Damage window scoped by `window`:
 * either a round count (`{ shots: N }`) or the wall-clock model it replaced (`{ sec: S }`).
 * Returns every unit's total damage.
 */
function run(window: { shots: number } | { sec: number }): Record<string, number> {
  const overrides: Record<string, any> = {};
  for (const s of SLUGS) overrides[s] = loadOverride(s);
  const helm = JSON.parse(JSON.stringify(overrides.helm));
  const buff = helm.burst
    .flatMap((b: any) => b.effects)
    .find((e: any) => e.stat === 'chargeDamageMultPct');
  if (!buff) throw new Error('helm burst chargeDamageMultPct block missing — fixture is stale');
  delete buff.durationShots;
  delete buff.durationSec;
  if ('shots' in window) buff.durationShots = window.shots;
  else buff.durationSec = window.sec;
  overrides.helm = helm;

  const chars = SLUGS.map((s) => data.characters[s]);
  const prepared = prepareTeam(
    chars,
    SLUGS.map(() => ({ doll: false, ol: 'base5' as const })),
    { overrides, skillLevels, cubes, olLines }
  );
  const cfg = scopeLockCfg(SLUGS, 'Fire', { focusSlug: 'ada' });
  const res = runSim(chars, mult, cfg, prepared);
  return Object.fromEntries(res.units.map((u) => [u.slug, u.totalDamage]));
}

console.log('\n== durationShots (round-count buff duration) ==');

const ladder = Array.from({ length: 10 }, (_, i) => run({ shots: i + 1 }));
const helmDmg = ladder.map((r) => r.helm);

// 1. mechanism live
(helmDmg[0] < helmDmg[9] ? ok : fail)(
  `more rounds ⇒ more damage (1 round ${(helmDmg[0] / 1e6).toFixed(1)}M < 10 rounds ${(helmDmg[9] / 1e6).toFixed(1)}M)`
);

// 2. strictly monotonic — every added round buys another buffed charged shot
{
  const breaks = helmDmg.slice(1).map((d, i) => (d > helmDmg[i] ? null : i + 2)).filter(Boolean);
  (breaks.length === 0 ? ok : fail)(
    breaks.length === 0
      ? `strictly monotonic across N=1..10 (${helmDmg.map((d) => (d / 1e6).toFixed(0)).join(' → ')}M)`
      : `NOT monotonic — no gain at N=${breaks.join(',')} (a time proxy or a mis-scoped decrement)`
  );
}

// 3. the discriminating one: 10 rounds outlives the 13s window because it survives her reload
{
  const bySec = run({ sec: 13 }).helm;
  (helmDmg[9] > bySec ? ok : fail)(
    `10 rounds spans the reload — beats the durationSec 13 model ` +
    `(${(helmDmg[9] / 1e6).toFixed(1)}M > ${(bySec / 1e6).toFixed(1)}M, +${((helmDmg[9] / bySec - 1) * 100).toFixed(1)}%)`
  );
}

// 4. self-scoped: teammates identical across every N
{
  const drifted = SLUGS.filter((s) => s !== 'helm' && new Set(ladder.map((r) => r[s])).size > 1);
  (drifted.length === 0 ? ok : fail)(
    drifted.length === 0
      ? 'self-scoped — liter/crown/ada byte-identical across N=1..10'
      : `round budget LEAKED onto ${drifted.join(', ')} — the decrement is not holder-scoped`
  );
}

if (failures) {
  console.error(`\nduration-shots: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nduration-shots: all passed');
