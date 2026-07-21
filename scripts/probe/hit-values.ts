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

import { loadWorld, autoWire, type BatteryTeam } from '../battery/lib.js';
import { prepareTeam, type UnitOptions } from '../../src/prepare.js';
import { loadOverride } from '../../src/skills/overrides-node.js';
import { runSim } from '../../src/engine/sim.js';
import type { SimConfig, Element } from '../../src/types.js';

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

const w = loadWorld();
const bt: BatteryTeam = { name: focus, slugs: team, focus: focusSlug, modes: {}, lambda: {} };
autoWire(w, bt);

// Capture the engine's DBG instance lines in-process (DBG_UNIT is read live from process.env).
process.env.DBG_UNIT = focus;
process.env.DBG_N = '1000000';
const lines: string[] = [];
const realLog = console.log;
console.log = (...a: unknown[]) => { const s = a.join(' '); if (s.includes(`[dbg ${focus}]`)) lines.push(s); else realLog(...a); };

const chars = bt.slugs.map((s) => w.data.characters[s]);
const overrides: Record<string, ReturnType<typeof loadOverride>> = {};
for (const s of bt.slugs) overrides[s] = loadOverride(s);
const unitOpts: UnitOptions[] = bt.slugs.map((slug) => ({ doll: false, ol: 'base5', mode: bt.modes?.[slug], lambdaStage: bt.lambda?.[slug] }));
const cfg: SimConfig = {
  slugs: bt.slugs, bossElement: boss, bossDef: 0, level: 400, copies: 10,
  doll: false, ol: 'base5', coreHitRate: 0, rangeBonus: true, durationSec: 180, focusSlug,
};
// coreHitRate:0 so the printed dmg is the clean NON-core base; core factor is applied on top below.
const prepared = prepareTeam(chars, unitOpts, { overrides, skillLevels: w.skillLevels, cubes: w.cubes, olLines: w.olLines });
const res = runSim(chars, w.mult, cfg, prepared);
console.log = realLog;

// Parse: [dbg slug] t=.. <category> atkPct=X baseAtk=.. major=M elem=.. charge=.. dmgUp=.. taken=.. dmg=Y
interface Inst { cat: string; atkPct: number; major: number; dmg: number; }
const insts: Inst[] = [];
for (const l of lines) {
  const m = l.match(/\] t=[\d.]+ (\w+) atkPct=([\d.]+) baseAtk=\d+ major=([\d.]+) .* dmg=(\d+)/);
  if (m) insts.push({ cat: m[1], atkPct: +m[2], major: +m[3], dmg: +m[4] });
}

// Group by (category, coefficient). atkPct pins the hit type.
const groups = new Map<string, Inst[]>();
for (const i of insts) {
  const key = `${i.cat}|${i.atkPct.toFixed(1)}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key)!.push(i);
}

// That unit's crit + core multipliers (base stats; buffs shift these but this is the reference).
const u = res.units.find((x) => x.slug === focus);
const fchar = w.data.characters[focus] as any;
const critBonus = ((fchar?.baseStats?.critDamage ?? 150) - 100) / 100;
const coreBonus = ((fchar?.coreAttackMultiplier ?? 200) - 100) / 100;

console.log(`\nHIT-VALUE TABLE — ${focus}  (team: ${team.join(', ')}; boss ${boss ?? 'neutral'})`);
console.log(`base crit +${(critBonus * 100).toFixed(0)}% (x${(1 + critBonus).toFixed(3)} on major=1) · base core +${(coreBonus * 100).toFixed(0)}% · values are NON-crit NON-core, per single instance\n`);
console.log('hit type'.padEnd(16) + 'coef%'.padStart(8) + '  n' + 'base min'.padStart(13) + 'base max'.padStart(13) + '  crit(min–max)'.padStart(24));
const rows = [...groups.entries()].sort((a, b) => Math.max(...b[1].map((i) => i.dmg)) - Math.max(...a[1].map((i) => i.dmg)));
for (const [key, g] of rows) {
  const [cat, coef] = key.split('|');
  const dmgs = g.map((i) => i.dmg).sort((a, b) => a - b);
  const lo = dmgs[0], hi = dmgs[dmgs.length - 1];
  // crit popup = base x (major+critBonus)/major. major here ~ 1 + FB + range (no crit/core). Use the
  // group's own major to show the realistic crit ratio (during FB it reads smaller than x1.5).
  const majMin = Math.min(...g.map((i) => i.major)), majMax = Math.max(...g.map((i) => i.major));
  const critLo = Math.round(lo * (majMin + critBonus) / majMin);
  const critHi = Math.round(hi * (majMax + critBonus) / majMax);
  console.log(
    cat.padEnd(16) + coef.padStart(8) + `  ${String(g.length).padStart(3)}` +
    lo.toLocaleString().padStart(13) + hi.toLocaleString().padStart(13) +
    `  ${critLo.toLocaleString()}–${critHi.toLocaleString()}`.padStart(24)
  );
}
console.log(`\nfocus-unit total (sim): ${u ? u.totalDamage.toLocaleString() : '?'}`);
console.log('NOTE: heals are NOT here (they pop over the CHARACTER, not the crosshair). Core popups = base x' +
  `${(1 + coreBonus).toFixed(2)} (red "CORE HIT"). Crit+core = both factors.\n`);
