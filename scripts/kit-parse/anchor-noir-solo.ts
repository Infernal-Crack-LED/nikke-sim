// noir SOLO anchor check — the SG landing table (docs/probe-data/noir-solo-recon.json)
// was calibrated against her solo total; any change touching noir must hold this
// within 0.5% (kit-parse rollout anchor guard — see 2026-07-16-kit-parse-rollout.md).
// Reference (2026-07-16, post prose-free migration + Wave 1): 65,290,757.10
//   npx tsx scripts/kit-parse/anchor-noir-solo.ts
import { runSim } from '../../src/engine/sim.js';
import { resolveSkills } from '../../src/skills/index.js';
import { loadOverride } from '../../src/skills/overrides-node.js';
import { scopeLockCfg, loadData } from '../lib/scope-lock.js';

const REFERENCE = 65290757.100286506;
const { data, mult } = loadData();
const c: any = data.characters['noir'];
const cfg = scopeLockCfg(['noir'], null);
const prepared = [{ skills: resolveSkills(c, loadOverride('noir')), extraStats: [] as any[], loadout: [] as any[] }];
const r = runSim([c], mult, cfg as any, prepared as any);
const total = r.units[0].totalDamage;
const drift = (total / REFERENCE - 1) * 100;
console.log(`noir solo total: ${total}`);
console.log(`vs reference ${REFERENCE}: ${drift >= 0 ? '+' : ''}${drift.toFixed(4)}%`);
if (Math.abs(drift) > 0.5) {
  console.error('ANCHOR GUARD FAILED (>0.5%) — pause and escalate to owner before promoting');
  process.exit(1);
}
console.log('anchor guard OK (≤0.5%)');
