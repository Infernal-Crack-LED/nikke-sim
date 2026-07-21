// Functional test for the reload-triggered buff-removal primitive (removeOnReload).
//
// The primitive is INERT for every committed override (no unit sets removeOnReload today, so the
// regression snapshot is byte-identical — that proves inertness). This test proves the mechanism
// actually FIRES, using cinderella (RL/Electric) as an in-memory fixture ONLY: it swaps her
// permanent chargeSpeedPct-45 passive for the faithful kit toggle — a shotFired → chargeSpeedPct
// 100 buff flagged removeOnReload:true — WITHOUT touching her committed override JSON (kept +45 on
// disk; the faithful toggle is HELD pending the divisive-CS gated pass, see DECISIONS 2026-07-21).
//
// Cinderella charges 1s/shot at CS 0 and ~instantly at CS 100 (subtractive, capped). With the
// toggle: shot 1 of each magazine charges at CS 0 (buff not yet re-applied), shots 2-24 at CS 100.
// removeOnReload strips the buff on every reload-to-max, so EACH new magazine starts slow again.
// If the strip did NOT fire, CS would stick at 100 after the first full charge for the whole fight,
// so only ONE slow shot would ever occur → MORE total pulls. The pull-count gap is the observable.
//
//   npx tsx scripts/tests/reload-buff-removal.test.ts
import { readFileSync } from 'node:fs';
import type { DataFile, LevelMultiplier } from '../../src/types.js';
import { runSim } from '../../src/engine/sim.js';
import { loadOverride } from '../../src/skills/overrides-node.js';
import { scopeLockCfg } from '../lib/scope-lock.js';
import { prepareTeam, type CubesFile, type OlLinesFile } from '../../src/prepare.js';

const data: DataFile = JSON.parse(readFileSync(new URL('../../data/characters.json', import.meta.url), 'utf8'));
const mult: LevelMultiplier = JSON.parse(readFileSync(new URL('../../data/level-multiplier.json', import.meta.url), 'utf8'));
const cubes: CubesFile = JSON.parse(readFileSync(new URL('../../data/cubes.json', import.meta.url), 'utf8'));
const olLines: OlLinesFile = JSON.parse(readFileSync(new URL('../../data/ol-lines.json', import.meta.url), 'utf8'));

let failures = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`);
const fail = (m: string) => { failures++; console.error(`  ✗ ${m}`); };

// Run solo cinderella (RL) with an in-memory override whose CS is the reload-toggle; `strip` picks
// whether the CS buff is flagged removeOnReload. Returns her total pull (rocket) count over 180s.
function cindyPulls(strip: boolean): number {
  const base = loadOverride('cinderella');
  if (!base) throw new Error('cinderella override missing');
  const ov = JSON.parse(JSON.stringify(base)) as any;
  // This fixture isolates the CS/removeOnReload per-rocket-charge cadence path, so disable her
  // committed magDumpRof (whole-mag dump, DECISIONS 2026-07-21): under mag-dump CS only shortens the
  // ONE prime charge per magazine, not each rocket, so the toggle would have no observable cadence
  // effect. Removing it here restores the per-rocket-charge model the mechanism test needs.
  if (ov.charFixes) delete ov.charFixes.magDumpRof;
  // Replace her passive chargeSpeedPct-45 block with the faithful full-charge → CS 100 toggle.
  ov.skill1 = [
    {
      slot: 'skill1',
      trigger: { kind: 'shotFired' }, // every full-charge rocket (RL: every pull is a full charge)
      target: { kind: 'self' },
      effects: [{ kind: 'buff', stat: 'chargeSpeedPct', value: 100, removeOnReload: strip }],
    },
  ];
  const chars = [data.characters['cinderella']];
  const prepared = prepareTeam(chars, [{ doll: false, ol: 'base5' }], {
    overrides: { cinderella: ov }, skillLevels: {}, cubes, olLines,
  });
  const cfg = scopeLockCfg(['cinderella'], 'Water', { focusSlug: 'cinderella' });
  const res = runSim(chars, mult, cfg, prepared);
  return res.units[0].pulls;
}

console.log('reload-triggered buff removal (removeOnReload)');

const pullsStrip = cindyPulls(true);
const pullsNoStrip = cindyPulls(false);
console.log(`  cinderella pulls — strip-on: ${pullsStrip}, strip-off: ${pullsNoStrip}`);

// 1. The strip fires: resetting CS each reload forces one slow (CS-0) charge per magazine, so
//    strip-on yields FEWER pulls than strip-off (where CS sticks at 100 after the first charge).
if (pullsStrip < pullsNoStrip) ok(`removeOnReload strips on reload (strip-on ${pullsStrip} < strip-off ${pullsNoStrip})`);
else fail(`removeOnReload did NOT strip: strip-on ${pullsStrip} !< strip-off ${pullsNoStrip}`);

// 2. The gap is materially large (many reloads over 180s), not a rounding artifact.
if (pullsNoStrip - pullsStrip >= 100) ok(`strip effect is substantial (Δ=${pullsNoStrip - pullsStrip} pulls)`);
else fail(`strip effect too small to be the mechanism (Δ=${pullsNoStrip - pullsStrip})`);

// 3. Determinism: the deterministic (seedless) run reproduces.
if (cindyPulls(true) === pullsStrip) ok('deterministic run reproduces');
else fail('non-deterministic pull count');

if (failures) { console.error(`\nreload-buff-removal: ${failures} FAILED`); process.exit(1); }
console.log('\nreload-buff-removal: all checks passed');
