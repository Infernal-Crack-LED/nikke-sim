// Per-unit expected-hit-value table — the deterministic key for identifying popups.
//
//   npx tsx scripts/probe/hit-values.ts <focus> <slot1> <slot2> ... [--boss Water] [--focus <slug>]
//   e.g. npx tsx scripts/probe/hit-values.ts little-mermaid little-mermaid crown helm snow-white --boss Water
//        npx tsx scripts/probe/hit-values.ts liberalio mast-romantic-maid scarlet-black-shadow liberalio anis-star crown --boss Iron
//
// Before reading a video, dump every DAMAGE-instance value the focus unit produces, grouped by
// hit type (category + coefficient), across the whole fight. Then a popup's value maps to a hit
// type DETERMINISTICALLY instead of by guesswork — the entanglement that burned us (LM's 63.36%
// DoT ~= her buffed SMG normal; liberalio's 202.5% proc overlapping her charge shot).
//
// It reports the BASE (non-crit, non-core) value range per hit type, plus that unit's CRIT and
// CORE multipliers, so you know exactly what each hit's crit / core / crit+core popup looks like.
// Crit is currently gated OFF in the engine (XCRIT empty) → base values here are the sim's
// non-crit; multiply by the printed factors to get the elevated-popup targets.

import { computeHitBands } from './hit-bands.js';
import type { Element } from '../../src/types.js';

const argv = process.argv.slice(2);
const flags: Record<string, string> = {};
const pos: string[] = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) { flags[argv[i].slice(2)] = argv[++i]; }
  else pos.push(argv[i]);
}
const focus = pos[0];
const team = pos.length > 1 ? pos.slice(1) : pos; // if only focus given, treat as solo
if (!focus) { console.error('usage: hit-values.ts <focus> <slot1..slotN> [--boss <Element>] [--focus <slug>]'); process.exit(1); }
const boss = (flags.boss as Element) ?? null;
const focusSlug = flags.focus ?? focus;

// The band derivation lives in hit-bands.ts so this table and read-popups-vlm.ts's in-band
// verdict can never drift apart.
const table = computeHitBands(focus, team, boss, focusSlug);
const { critBonus, coreBonus } = table;

console.log(`\nHIT-VALUE TABLE — ${focus}  (team: ${table.team.join(', ')}; boss ${boss ?? 'neutral'})`);
console.log(`base crit +${(critBonus * 100).toFixed(0)}% (x${(1 + critBonus).toFixed(3)} on major=1) · base core +${(coreBonus * 100).toFixed(0)}% · values are NON-crit NON-core, per single instance\n`);
console.log('hit type'.padEnd(16) + 'coef%'.padStart(8) + '  n' + 'base min'.padStart(13) + 'base max'.padStart(13) + '  crit(min–max)'.padStart(24));
for (const b of table.bands) {
  console.log(
    b.cat.padEnd(16) + b.coefPct.toFixed(1).padStart(8) + `  ${String(b.n).padStart(3)}` +
    b.baseLo.toLocaleString().padStart(13) + b.baseHi.toLocaleString().padStart(13) +
    `  ${b.critLo.toLocaleString()}–${b.critHi.toLocaleString()}`.padStart(24)
  );
}
console.log(`\nfocus-unit total (sim): ${table.focusTotal != null ? table.focusTotal.toLocaleString() : '?'}`);
console.log('NOTE: heals are NOT here (they pop over the CHARACTER, not the crosshair). Core popups = base x' +
  `${(1 + coreBonus).toFixed(2)} (red "CORE HIT"). Crit+core = both factors.\n`);
