// Solo reconciliation for the AR/SMG/SG core-rate recordings (docs/probes/ar-sg-smg).
// Each recording is a 1-unit SOLO fight (no Full Burst — a lone unit can't complete all
// burst stages), so sim-solo vs the damage-screen total isolates the unit with zero
// team/FB confounds — the cleanest core-rate + normal-model check.
//   CORERATELO=<x> npx tsx scripts/solo-recon.ts
// Uses the scope-lock SSOT (forced-neutral boss) + a sanity self-check, so it can never
// drift from the basis (a hand-rolled core-0 config here caused a bogus "ATK confound").
import { readFileSync } from 'node:fs';
import { runSim } from '../src/engine/sim.js';
import { resolveSkills } from '../src/skills/index.js';
import { loadOverride } from '../src/skills/overrides-node.js';
import { scopeLockCfg, sanityCheck, loadData } from './lib/scope-lock.js';

const { data, mult } = loadData();
const ref = JSON.parse(readFileSync(new URL('../data/reference-stats.json', import.meta.url), 'utf8'));
const REAL: Record<string, number> = ref.recordingSoloTotals;

for (const [slug, w] of [['scarlet', 'AR'], ['chisato', 'SMG'], ['drake', 'SG']] as const) {
  const c: any = data.characters[slug];
  const cfg = scopeLockCfg([slug], null); // solo, forced neutral (matches the no-FB solo recording)
  const prepared = [{ skills: resolveSkills(c, loadOverride(slug)), extraStats: [] as any[], loadout: [] as any[] }];
  const r: any = runSim([c], mult, cfg, prepared);
  const issues = sanityCheck([c], r);
  if (issues.length) issues.forEach((i) => console.log('  ⚠ SANITY: ' + i));
  const real = REAL[`${slug}-${w.toLowerCase()}`];
  const u = r.units[0];
  console.log(
    `${slug} (${w}): sim ${(u.totalDamage / 1e6).toFixed(1)}M vs real ${(real / 1e6).toFixed(1)}M  ratio ${(u.totalDamage / real).toFixed(2)} | ATK ${u.staticAtk} | FB ${r.fullBursts ?? 0} | bursts ${u.burstCasts}`,
  );
}
