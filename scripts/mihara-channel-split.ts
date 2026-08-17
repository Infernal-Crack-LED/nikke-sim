// Per-channel damage split for mihara-bonding-chain on the N6 graded comp.
// One-shot analysis: run the comp with event logging, aggregate damage by srcSlot.
//   npx tsx scripts/mihara-channel-split.ts
import { readFileSync } from 'node:fs';
import type { DataFile, LevelMultiplier, SimEvent } from '../src/types.js';
import { runSim } from '../src/engine/sim.js';
import { loadOverride } from '../src/skills/overrides-node.js';
import { scopeLockCfg } from './lib/scope-lock.js';
import {
  prepareTeam,
  type CubesFile,
  type OlLinesFile,
  type SkillLevelData,
} from '../src/prepare.js';

const data: DataFile = JSON.parse(
  readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8')
);
const mult: LevelMultiplier = JSON.parse(
  readFileSync(
    new URL('../data/level-multiplier.json', import.meta.url),
    'utf8'
  )
);
const cubes: CubesFile = JSON.parse(
  readFileSync(new URL('../data/cubes.json', import.meta.url), 'utf8')
);
const olLines: OlLinesFile = JSON.parse(
  readFileSync(new URL('../data/ol-lines.json', import.meta.url), 'utf8')
);
let skillLevels: SkillLevelData = {};
try {
  skillLevels = JSON.parse(
    readFileSync(new URL('../data/skill-levels.json', import.meta.url), 'utf8')
  );
} catch {
  /* optional */
}

const SLUGS = [
  'little-mermaid',
  'ade-agent-bunny',
  'mihara-bonding-chain',
  'maiden-ice-rose',
  'maxwell',
];
const FOCUS = 'mihara-bonding-chain';
const BOSS = 'Wind' as const;

const chars = SLUGS.map((slug) => ({
  ...data.characters[slug],
  slug,
  ol: 'base5' as const,
}));

const overrides: Record<string, ReturnType<typeof loadOverride>> = {};
for (const s of SLUGS) {
  overrides[s] = loadOverride(s);
}

const unitOpts = SLUGS.map((slug) => ({
  slug,
  ol: 'base5' as const,
}));

const cfg = scopeLockCfg(SLUGS, BOSS, { focusSlug: FOCUS });

const events: SimEvent[] = [];
cfg.onEvent = (e: SimEvent) => events.push(e);

const prepared = prepareTeam(chars, unitOpts, {
  overrides,
  skillLevels,
  cubes,
  olLines,
});

const result = runSim(chars, mult, cfg, prepared);

// Filter to mihara's damage events
const miharaIdx = SLUGS.indexOf(FOCUS);
const dmgEvents = events.filter(
  (e): e is Extract<SimEvent, { kind: 'damage' }> =>
    e.kind === 'damage' && e.unitIdx === miharaIdx
);

// Aggregate by srcSlot
const bySlot = new Map<string, { count: number; total: number }>();
const byBucket = new Map<string, { count: number; total: number }>();

for (const e of dmgEvents) {
  const slot = e.srcSlot ?? 'null';
  const prev = bySlot.get(slot) ?? { count: 0, total: 0 };
  prev.count++;
  prev.total += e.amount;
  bySlot.set(slot, prev);

  const bPrev = byBucket.get(e.bucket) ?? { count: 0, total: 0 };
  bPrev.count++;
  bPrev.total += e.amount;
  byBucket.set(e.bucket, bPrev);
}

const totalDmg = dmgEvents.reduce((s, e) => s + e.amount, 0);

console.log(`\n=== mihara-bonding-chain per-channel split (N6 comp) ===`);
console.log(`Total damage: ${totalDmg.toLocaleString()}`);
console.log(`Snapshot value: ${result.units[miharaIdx].totalDamage}`);
console.log();

console.log('--- by srcSlot ---');
for (const [slot, v] of [...bySlot.entries()].sort(
  (a, b) => b[1].total - a[1].total
)) {
  const pct = ((v.total / totalDmg) * 100).toFixed(1);
  console.log(
    `  ${slot.padEnd(10)} ${v.count.toString().padStart(5)} hits  ${v.total.toLocaleString().padStart(15)}  (${pct}%)`
  );
}

console.log();
console.log('--- by bucket ---');
for (const [bucket, v] of [...byBucket.entries()].sort(
  (a, b) => b[1].total - a[1].total
)) {
  const pct = ((v.total / totalDmg) * 100).toFixed(1);
  console.log(
    `  ${bucket.padEnd(10)} ${v.count.toString().padStart(5)} hits  ${v.total.toLocaleString().padStart(15)}  (${pct}%)`
  );
}

// Further split skill1 into Restraint dumps (flatDamage atkPct=500.6 exactly) vs Ensnaring DoT
const skill1Events = dmgEvents.filter((e) => e.srcSlot === 'skill1');
const restraintDumps = skill1Events.filter(
  (e) => Math.abs(e.atkPct - 500.6) < 0.01
);
const ensnaringTicks = skill1Events.filter(
  (e) => Math.abs(e.atkPct - 500.6) >= 0.01
);

console.log();
console.log('--- skill1 sub-split ---');
const restraintTotal = restraintDumps.reduce((s, e) => s + e.amount, 0);
const ensnaringTotal = ensnaringTicks.reduce((s, e) => s + e.amount, 0);
console.log(
  `  Restraint dumps (atkPct=500.6): ${restraintDumps.length} hits, total ${restraintTotal.toLocaleString()}  (${((restraintTotal / totalDmg) * 100).toFixed(1)}%)`
);
console.log(
  `  Ensnaring DoT ticks:            ${ensnaringTicks.length} ticks, total ${ensnaringTotal.toLocaleString()}  (${((ensnaringTotal / totalDmg) * 100).toFixed(1)}%)`
);

// Ensnaring tick magnitude distribution
if (ensnaringTicks.length > 0) {
  const atkPcts = ensnaringTicks.map((e) => e.atkPct);
  const uniqueAtkPcts = [...new Set(atkPcts)].sort((a, b) => a - b);
  console.log(`  Ensnaring unique atkPcts: ${uniqueAtkPcts.length}`);
  console.log(
    `  atkPct range: ${Math.min(...atkPcts).toFixed(2)} - ${Math.max(...atkPcts).toFixed(2)}`
  );
  const stacks = uniqueAtkPcts.map((v) => (v / 25.08).toFixed(1));
  console.log(`  Implied stacks: ${stacks.join(', ')}`);
  // Per-tick average stack count
  const totalStackSec = ensnaringTicks.reduce(
    (s, e) => s + e.atkPct / 25.08,
    0
  );
  console.log(
    `  Per-tick avg stacks: ${(totalStackSec / ensnaringTicks.length).toFixed(2)}`
  );
}

// Count structural events
const fbEnds = events.filter((e) => e.kind === 'fullBurstEnd');
const stage3 = events.filter(
  (e) =>
    e.kind === 'buffApply' &&
    e.stat === 'sustainedDamagePct' &&
    e.casterIdx === miharaIdx
);
const burstCasts = events.filter(
  (e) => e.kind === 'burstCast' && e.unitIdx === miharaIdx
);
const fbStarts = events.filter((e) => e.kind === 'fullBurstStart');

console.log();
console.log('--- structural counts ---');
console.log(`  Full Burst ends (all units): ${fbEnds.length}`);
console.log(`  Full Burst starts (all units):  ${fbStarts.length}`);
console.log(`  Burst casts (mihara):          ${burstCasts.length}`);
console.log(`  Stage-3 entries (sustDmg%):    ${stage3.length}`);

// Print Restraint dump timing
console.log();
console.log(`--- Restraint dump timing (${restraintDumps.length} dumps) ---`);
for (const d of restraintDumps.slice(0, 20)) {
  console.log(
    `  t=${d.sec.toFixed(2)}s  atkPct=${d.atkPct}  amount=${d.amount.toLocaleString()}  inFB=${d.inFullBurst}`
  );
}
if (restraintDumps.length > 20) {
  console.log(`  ... (${restraintDumps.length - 20} more)`);
}

// Ensnaring resource pool — not measurable via events
console.log();
console.log(
  '--- Ensnaring resource pool: resource changes are not emitted as SimEvents — not measurable via the event log ---'
);
