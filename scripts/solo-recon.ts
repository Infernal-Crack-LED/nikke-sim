// Solo reconciliation for the AR/SMG/SG core-rate recordings (docs/probes/ar-sg-smg).
// Each recording is a 1-unit SOLO fight (no Full Burst — a lone unit can't complete all
// burst stages), so sim-solo vs the damage-screen total isolates the unit with zero
// team/FB confounds — the cleanest possible core-rate + normal-model check.
//   CORERATELO=<x> npx tsx scripts/solo-recon.ts
import { readFileSync } from 'node:fs';
import { runSim } from '../src/engine/sim.js';
import { resolveSkills } from '../src/skills/index.js';
import { loadOverride } from '../src/skills/overrides-node.js';
import type { DataFile, LevelMultiplier, SimConfig } from '../src/types.js';

const data: DataFile = JSON.parse(readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8'));
const mult: LevelMultiplier = JSON.parse(readFileSync(new URL('../data/level-multiplier.json', import.meta.url), 'utf8'));

// real solo totals + Combat ATK from the damage screens (docs/probes/ar-sg-smg/*.jpg)
const REAL: Record<string, { total: number; atk: number; weapon: string }> = {
  scarlet: { total: 81_819_203, atk: 94_055, weapon: 'AR' },
  chisato: { total: 112_428_402, atk: 90_730, weapon: 'SMG' },
  drake: { total: 53_974_999, atk: 92_657, weapon: 'SG' },
};

for (const slug of ['scarlet', 'chisato', 'drake']) {
  const c: any = data.characters[slug];
  const cfg: SimConfig = {
    slugs: [slug], bossElement: null, bossDef: 0, level: 400, copies: 10,
    doll: false, ol: 'base5', coreHitRate: 1, rangeBonus: true, durationSec: 180,
  };
  const prepared = [{ skills: resolveSkills(c, loadOverride(slug)), extraStats: [] as any[], loadout: [] as any[] }];
  const r: any = runSim([c], mult, cfg, prepared);
  const u: any = r.units[0];
  const real = REAL[slug];
  const ratio = u.totalDamage / real.total;
  const atk = u.staticAtk ?? u.atk ?? '?';
  const fb = r.fullBursts ?? r.fullBurstCount ?? '?';
  console.log(
    `${slug} (${real.weapon}): sim ${(u.totalDamage / 1e6).toFixed(1)}M vs real ${(real.total / 1e6).toFixed(1)}M  ratio ${ratio.toFixed(2)} | ` +
    `simATK ${atk} vs realATK ${real.atk} | FB ${fb} | bursts ${u.burstCasts} | shots ${u.shots ?? '?'}`,
  );
}
