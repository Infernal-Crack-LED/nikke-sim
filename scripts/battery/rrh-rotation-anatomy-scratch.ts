// Scratch diagnostic (2026-08-04): RRH control comp rotation anatomy under both
// rotation models — default 'refill' (chain opens on gauge-full) vs ROTMODEL=floor
// (the retired 150f post-FB chain lock). Prints per-FB start/end seconds + gauge
// generated per unit. Read-only.
import { loadWorld, type BatteryTeam } from './lib.js';
import { runSim } from '../../src/engine/sim.js';
import { loadOverride } from '../../src/skills/overrides-node.js';
import { prepareTeam, type UnitOptions } from '../../src/prepare.js';
import type { SimConfig, SimEvent } from '../../src/types.js';

const w = loadWorld();
const team: BatteryTeam = {
  name: 'rrh control',
  slugs: ['little-mermaid', 'crown', 'helm', 'rapi-red-hood'],
};

const chars = team.slugs.map((s) => w.data.characters[s]);
const overrides: Record<string, ReturnType<typeof loadOverride>> = {};
for (const s of team.slugs) {
  overrides[s] = loadOverride(s);
}
const unitOpts: UnitOptions[] = team.slugs.map(() => ({
  doll: false,
  ol: 'base5',
}));
const prepared = prepareTeam(chars, unitOpts, {
  overrides,
  skillLevels: w.skillLevels,
  cubes: w.cubes,
  olLines: w.olLines,
});

const events: SimEvent[] = [];
const cfg: SimConfig = {
  slugs: team.slugs,
  bossElement: null,
  bossDef: 0,
  level: 400,
  copies: 10,
  doll: false,
  ol: 'base5',
  coreHitRate: 1,
  rangeBonus: true,
  durationSec: 180,
  seed: 1000,
  onEvent: (e: SimEvent) => events.push(e),
};
const r = runSim(chars, w.mult, cfg, prepared);
console.log(
  `model=${process.env.ROTMODEL ?? 'refill(default)'}  FB=${r.fullBursts}`
);
const starts = events.filter((e) => e.kind === 'fullBurstStart');
const ends = events.filter((e) => e.kind === 'fullBurstEnd');
starts.forEach((s, i) => {
  const prev = i > 0 ? (s.sec - starts[i - 1].sec).toFixed(2) : '--';
  console.log(
    `FB${String(i + 1).padStart(2)} start=${s.sec.toFixed(2)}s end=${
      ends[i] ? ends[i].sec.toFixed(2) : '?'
    }s  cadence=${prev}`
  );
});
for (const u of r.units) {
  console.log(
    `  ${u.slug.padEnd(16)} gaugeGenerated=${u.gaugeGenerated.toFixed(0)}`
  );
}
