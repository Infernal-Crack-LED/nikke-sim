// Boss-DEF measurement battery.
//
//   npx tsx scripts/battery/boss-def.ts
//
// Question: the scope-lock boss's DEF. Every sim assumes `bossDef: 0`. NIKKE DEF
// is SUBTRACTIVE and applied INSIDE the base term, before the skill coefficient:
//   dmg = max(0, effectiveATK - bossDEF) * (atkPct/100) * major * elem * charge * dmgUp * ...
// (src/engine/sim.ts dealDamage, line ~698). So a nonzero DEF scales EVERY hit of a
// unit by exactly (1 - bossDEF/effectiveATK) — independent of coefficient/major/element,
// dependent only on that unit's effective ATK. Lower-ATK units feel it more.
//
// Two independent lines both put the scope-lock boss DEF at NEGLIGIBLE:
//
//  (A) Empirical (ginmy.net/nikke_def_test, harvested 2026-07-14): NIKKE enemy DEF is a
//      small FLAT value — Union-Training mobs = 100, boss-type enemies ~= 140 (min-1
//      damage floor, rounds). At scope-lock effective ATK this is <0.2% of damage.
//
//  (B) Our own clean datamined-coefficient popup decompositions already matched the sim
//      to sub-percent at bossDef=0 (see the ANCHORS table below), which bounds the DEF
//      from OUR ACTUAL raid recordings to |DEF| < a few hundred. A DEF of thousands would
//      have thrown every one of those popups off by several percent, and they matched.
//
// Part 1 sweeps bossDef across real comps and prints the board's marginal shift, proving
// DEF only becomes material (> the ~3% single-run repeatability noise) at implausibly
// large values. Part 2 prints the measured-popup DEF bounds. Conclusion: keep bossDef=0
// as an evidence-backed approximation (error <0.2%); revisit only if a future low-ATK
// low-coefficient popup shows a uniform cold bias.

import { loadWorld, BEATS, autoWire, type BatteryTeam } from './lib.js';
import { prepareTeam, type UnitOptions } from '../../src/prepare.js';
import { loadOverride } from '../../src/skills/overrides-node.js';
import { runSim } from '../../src/engine/sim.js';
import type { SimConfig, Element } from '../../src/types.js';

const w = loadWorld();

function runWithDef(team: BatteryTeam, boss: Element | null, bossDef: number) {
  const chars = team.slugs.map((s) => w.data.characters[s]);
  const overrides: Record<string, ReturnType<typeof loadOverride>> = {};
  for (const s of team.slugs) overrides[s] = loadOverride(s);
  const unitOpts: UnitOptions[] = team.slugs.map((slug) => ({
    doll: false, ol: 'base5', mode: team.modes?.[slug], lambdaStage: team.lambda?.[slug],
  }));
  const cfg: SimConfig = {
    slugs: team.slugs, bossElement: boss, bossDef, level: 400, copies: 10,
    doll: false, ol: 'base5', coreHitRate: 1, rangeBonus: true, durationSec: 180,
    focusSlug: team.focus,
  };
  const prepared = prepareTeam(chars, unitOpts, {
    overrides, skillLevels: w.skillLevels, cubes: w.cubes, olLines: w.olLines,
  });
  return runSim(chars, w.mult, cfg, prepared);
}

// Real graded comps spanning the ATK range (attacker-heavy T1, supporter-heavy T3).
const SWEEP: { name: string; team: BatteryTeam; boss: Element }[] = [
  {
    name: 'T1 (attacker-heavy)',
    boss: 'Iron',
    team: { slugs: ['mast-romantic-maid', 'scarlet-black-shadow', 'anis-star', 'liberalio', 'crown'],
      focus: 'anis-star', modes: {}, lambda: {} },
  },
  {
    name: 'T3 (support-heavy)',
    boss: 'Wind',
    team: { slugs: ['rapi-red-hood', 'mihara-bonding-chain', 'little-mermaid', 'crown', 'helm'],
      focus: 'little-mermaid', modes: {}, lambda: {} },
  },
];

const DEFS = [0, 140, 560, 2000, 5000, 10000, 20000];

console.log('='.repeat(78));
console.log('PART 1 — Board sensitivity to bossDef (sim-only, fully reproducible)');
console.log('='.repeat(78));
console.log('ginmy measured boss-type DEF ~= 140. Sweep shows per-unit total %-shift vs def=0.\n');

let worstAt140 = 0;
for (const s of SWEEP) {
  autoWire(w, s.team);
  const base = runWithDef(s.team, s.boss, 0);
  const baseByUnit = new Map(base.units.map((u) => [u.slug, u.totalDamage]));
  console.log(`--- ${s.name}  boss ${s.boss} ---`);
  // header
  const hdr = ['bossDef'.padStart(8), ...base.units.map((u) => u.slug.slice(0, 10).padStart(11))].join('');
  console.log(hdr + '   maxΔ%');
  for (const def of DEFS) {
    const res = runWithDef(s.team, s.boss, def);
    const cells: string[] = [];
    let maxAbs = 0;
    for (const u of res.units) {
      const b = baseByUnit.get(u.slug) ?? u.totalDamage;
      const pct = b > 0 ? (u.totalDamage - b) / b * 100 : 0;
      if (Math.abs(pct) > maxAbs) maxAbs = Math.abs(pct);
      cells.push(pct.toFixed(2).padStart(11));
    }
    if (def === 140 && maxAbs > worstAt140) worstAt140 = maxAbs;
    console.log(String(def).padStart(8) + cells.join('') + `   ${maxAbs.toFixed(2)}%`);
  }
  console.log('');
}

console.log('='.repeat(78));
console.log('PART 2 — DEF bounds from measured clean-coefficient popups (docs/probe-runs.md)');
console.log('='.repeat(78));
console.log(`
Each anchor is a single-instance popup whose coefficient is DATAMINED (not a calibrated
override value), decomposed against the sim's combat ATK at bossDef=0. Because DEF scales
a hit by (1 - DEF/effATK), the sim/real match error caps DEF at:  |DEF| <= matchErr * effATK.
`);
type Anchor = { unit: string; popup: number; coef: string; effAtk: number; matchPct: number; src: string };
const ANCHORS: Anchor[] = [
  // cinderella rocket core hit — 32.11% datamined coef, matched to 0.3% at combat ATK 80,118
  { unit: 'cinderella', popup: 121_124, coef: '32.11% x 200% charge x core x elem x 1.07',
    effAtk: 80_118, matchPct: 0.3, src: 'probe-runs.md:352 (u8 e3, OL0 basis)' },
  // cinderella pre-full-burst rocket core / proc pair — matched to 0.3%
  { unit: 'cinderella', popup: 113_571, coef: '32.11% pre-FB rocket core',
    effAtk: 80_118, matchPct: 0.3, src: 'probe-runs.md:401' },
  // opening-shot popups matched to 99.7% across four classes (body 180,633)
  { unit: 'multi-class opener', popup: 180_633, coef: 'datamined normal, non-crit opener',
    effAtk: 80_118, matchPct: 0.3, src: 'probe-runs.md:425 (99.7% on 4 classes)' },
];
for (const a of ANCHORS) {
  const bound = Math.round((a.matchPct / 100) * a.effAtk);
  console.log(`  ${a.unit.padEnd(18)} popup ${a.popup.toLocaleString().padStart(9)}  ` +
    `effATK ${a.effAtk.toLocaleString()}  match ${a.matchPct}%  =>  |DEF| <= ~${bound}`);
  console.log(`      coef: ${a.coef}`);
  console.log(`      src:  ${a.src}\n`);
}

console.log('-'.repeat(78));
console.log('CONCLUSION');
console.log('-'.repeat(78));
console.log(`
* ginmy.net/nikke_def_test (empirical): boss-type enemy DEF ~= 140 (mobs 100), flat &
  subtractive, min-1 floor. Our engine already applies DEF in exactly this position
  (baseAtk = max(0, effectiveAtk - bossDef); +ATK inside the paren, charge/skill mult
  outside — all confirmed by ginmy atkbuff/atkdamagebuff tests).
* Board impact of def=140 across real comps: <= ${worstAt140.toFixed(2)}% on the lowest-ATK
  unit (see Part 1) — an order of magnitude under the ~3% single-run repeatability floor.
* Our own raid-recording popups independently bound |DEF| < a few hundred (Part 2),
  consistent with ~140.
=> KEEP bossDef=0 as an evidence-backed approximation (introduces <0.2% error). Setting it
   to 140 is "more correct" but shifts every snapshot by <0.2% (below noise) and is the
   owner's call. DEF only becomes material to the +-3% goal above ~2000, which is ruled out.
`);
