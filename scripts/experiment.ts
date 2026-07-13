// Hypothesis lab for the sim-vs-real validation investigation.
// Runs the real-sample comps with in-memory-patched overrides and prints
// per-unit sim/real ratios per variant. Not part of the product.
//   npx tsx scripts/experiment.ts
import { readFileSync } from 'node:fs';
import type { DataFile, LevelMultiplier, SimConfig, Element } from '../src/types.js';
import { runSim } from '../src/engine/sim.js';
import { loadOverride } from '../src/skills/overrides-node.js';
import type { OverrideFile } from '../src/skills/index.js';
import {
  prepareTeam,
  type CubesFile,
  type OlLinesFile,
  type SkillLevelData,
  type UnitOptions,
} from '../src/prepare.js';

const data: DataFile = JSON.parse(readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8'));
const mult: LevelMultiplier = JSON.parse(readFileSync(new URL('../data/level-multiplier.json', import.meta.url), 'utf8'));
const cubes: CubesFile = JSON.parse(readFileSync(new URL('../data/cubes.json', import.meta.url), 'utf8'));
const olLines: OlLinesFile = JSON.parse(readFileSync(new URL('../data/ol-lines.json', import.meta.url), 'utf8'));
let skillLevels: SkillLevelData = {};
try {
  skillLevels = JSON.parse(readFileSync(new URL('../data/skill-levels.json', import.meta.url), 'utf8'));
} catch { /* optional */ }

interface Comp {
  name: string;
  slugs: string[];
  boss: Element | null;
  real: Record<string, number>;
}

const COMPS: Comp[] = [
  {
    name: 'T1 wind-weak (boss Iron)',
    slugs: ['anis-star', 'mast-romantic-maid', 'crown', 'scarlet-black-shadow', 'liberalio'],
    boss: 'Iron',
    real: {
      'anis-star': 916_819_928, 'mast-romantic-maid': 149_003_513, crown: 278_575_442,
      'scarlet-black-shadow': 1_964_356_603, liberalio: 1_142_469_032,
    },
  },
  {
    name: 'T3 fire-weak (boss Wind)',
    slugs: ['little-mermaid', 'crown', 'rapi-red-hood', 'mihara-bonding-chain', 'helm'],
    boss: 'Wind',
    real: {
      'little-mermaid': 509_505_044, crown: 215_495_230, 'rapi-red-hood': 985_340_728,
      'mihara-bonding-chain': 915_651_002, helm: 173_187_582,
    },
  },
  {
    name: 'T4 water-weak (boss Fire)',
    slugs: ['anis-star', 'crown', 'snow-white-heavy-arms', 'privaty', 'helm'],
    boss: 'Fire',
    real: {
      'anis-star': 1_128_483_012, crown: 373_216_848, 'snow-white-heavy-arms': 1_837_128_591,
      privaty: 1_104_217_650, helm: 374_735_080,
    },
  },
  {
    name: 'T2 elec-weak (boss Water)',
    slugs: ['anis-star', 'crown', 'neon-vision-eye', 'cinderella', 'maiden-ice-rose'],
    boss: 'Water',
    real: {
      'anis-star': 984_995_678, crown: 195_539_778, 'neon-vision-eye': 1_474_983_283,
      cinderella: 1_368_483_883, 'maiden-ice-rose': 251_154_035,
    },
  },
  {
    name: 'T5 wind-weak probe (boss Iron)',
    slugs: ['nayuta', 'cinderella-crystal-wave', 'anis-star', 'liberalio', 'velvet'],
    boss: 'Iron',
    real: {
      nayuta: 891_842_251, 'cinderella-crystal-wave': 1_189_732_641, 'anis-star': 721_912_265,
      liberalio: 1_042_219_930, velvet: 188_915_506,
    },
  },
  {
    name: 'T6 neutral (no advantage)',
    slugs: ['crown', 'rapi-red-hood', 'little-mermaid', 'snow-white-heavy-arms', 'helm'],
    boss: null,
    real: {
      crown: 221_080_065, 'rapi-red-hood': 1_024_779_898, 'little-mermaid': 499_756_023,
      'snow-white-heavy-arms': 1_147_472_116, helm: 186_659_650,
    },
  },
  {
    name: 'T7 elec-weak probe (boss Water)',
    slugs: ['crown', 'rapi-red-hood', 'anis-star', 'cinderella', 'mast-romantic-maid'],
    boss: 'Water',
    real: {
      crown: 290_250_898, 'rapi-red-hood': 1_150_852_812, 'anis-star': 873_986_132,
      cinderella: 1_278_372_685, 'mast-romantic-maid': 130_547_286,
    },
  },
];

// deep-clone an override and let the variant mutate it; return undefined = drop unit's override
type Patch = Record<string, (o: OverrideFile) => OverrideFile>;

function run(comp: Comp, patch: Patch = {}) {
  const chars = comp.slugs.map((s) => data.characters[s]);
  const overrides: Record<string, OverrideFile | undefined> = {};
  for (const s of comp.slugs) {
    const base = loadOverride(s);
    overrides[s] = base && patch[s] ? patch[s](JSON.parse(JSON.stringify(base))) : base;
  }
  const unitOpts: UnitOptions[] = comp.slugs.map((slug) => ({
    doll: DOLL,
    ol: 0,
  }));
  const cfg: SimConfig = {
    slugs: comp.slugs, bossElement: comp.boss, bossDef: 0, level: 400, copies: 10,
    doll: false, ol: 0, coreHitRate: 1, rangeBonus: true, durationSec: 180,
  };
  const prepared = prepareTeam(chars, unitOpts, { overrides, skillLevels, cubes, olLines });
  return runSim(chars, mult, cfg, prepared);
}

function report(comp: Comp, label: string, patch: Patch = {}) {
  const res = run(comp, patch);
  console.log(`\n--- ${comp.name} · ${label} ---`);
  for (const u of res.units) {
    const real = comp.real[u.slug];
    const total = u.totalDamage;
    const m = (n: number) => (n / 1e6).toFixed(0).padStart(6);
    console.log(
      `${u.slug.padEnd(24)} shots ${String(u.pulls).padStart(5)}  n ${m(u.breakdown.normal)}  s ${m(u.breakdown.skill)}  b ${m(u.breakdown.burst)}  tot ${m(total)}M  ratio ${(total / real).toFixed(2)}`
    );
  }
}

const t1 = COMPS[0], t3 = COMPS[1], t4 = COMPS[2];

let DOLL = false;
console.log('===== SCOPE LOCK basis: core 7, no cube, no doll, OL0, 10/10/10 =====');
for (const c of COMPS) report(c, 'scope lock');


// ---- SWHA variants (T4 real: 1_807_804_067 replicate; current s=1520M, ratio 1.33) ----
const swhaVariant = (label, volley, lump) => report(t4, `SWHA ${label}`, {
  'snow-white-heavy-arms': (o) => {
    for (const b of o.skill1 ?? []) for (const e of b.effects) {
      if (e.kind === 'flatDamage' && e.atkPct === 527.95) e.atkPct = volley;
      if (e.kind === 'flatDamage' && e.atkPct === 7129.44) e.atkPct = lump;
    }
    return o;
  },
});
swhaVariant('A: no burst lump', 527.95, 0.0001);
swhaVariant('B: lump w/o x2.584 (=2112%)', 527.95, 2112);
swhaVariant('C: volley single dwarf 105.59', 105.59, 7129.44);
swhaVariant('D: volley 527.95 but no 41.9 AoE + lump w/o mult', 527.95, 2112);


// ---- SWHA E: Fully Active as weaponSwap (3.2s charge, 2 shots ~6.5s), 528% charge buff
// covers both rounds; lump unchanged (it is the volley EXTRA over baseline for 2 shots) ----
report(t4, 'SWHA E: fully-active weaponSwap', {
  'snow-white-heavy-arms': (o) => {
    for (const b of o.skill2 ?? []) for (const e of b.effects) {
      if (e.kind === 'buff' && e.value === 528) e.durationSec = 6.5;
    }
    o.burst = [
      ...(o.burst ?? []),
      {
        slot: 'burst', trigger: { kind: 'burstCast' }, target: { kind: 'self' },
        effects: [{ kind: 'weaponSwap', damagePct: 69.04, chargeTimeSec: 3.2, durationSec: 6.5 }],
      },
    ];
    return o;
  },
});


// ---- Mihara honest stack rebuild at scope-lock basis: avg ~10.8 stacks between bursts,
// full 20-stack mirror during her burst windows (delta = 1001 - baseline) ----
report(t3, 'Mihara rebuild avg 10.8', {
  'mihara-bonding-chain': (o) => {
    for (const b of o.skill1 ?? []) for (const e of b.effects) {
      if (e.kind === 'dot') e.atkPct = 270.9;
    }
    for (const b of o.burst ?? []) for (const e of b.effects) {
      if (e.kind === 'dot') e.atkPct = 1001 - 270.9;
    }
    return o;
  },
});


// ---- SR fire-cycle variants: real cycle = charge + bolt recovery? ----
for (const cf of [78, 84, 90]) {
  report(COMPS.find(c => c.name.startsWith('T6')), `helm chargeFrames ${cf}`, {
    helm: (o) => ({ ...o, charFixes: { chargeFrames: cf } }),
  });
  report(COMPS.find(c => c.name.startsWith('T5')), `velvet chargeFrames ${cf}`, {
    velvet: (o) => ({ ...o, charFixes: { chargeFrames: cf } }),
  });
}


// ---- helm 90-frame cycle across the other helm fights ----
report(t3, 'helm cf90 (T3)', { helm: (o) => ({ ...o, charFixes: { chargeFrames: 90 } }) });
report(t4, 'helm cf90 (T4)', { helm: (o) => ({ ...o, charFixes: { chargeFrames: 90 } }) });


// ---- Cinderella class check: DB says Defender (hp 16500 / atk 400, crown-identical row).
// Variant: Attacker statline (hp 13500 / atk 600) + Attacker gear ----
{
  const t7 = COMPS.find(c => c.name.startsWith('T7'));
  const cindy = data.characters['cinderella'];
  const saved = { class: cindy.class, hp: cindy.baseStats.hp, atk: cindy.baseStats.atk };
  cindy.class = 'Attacker';
  cindy.baseStats.hp = 13500;
  cindy.baseStats.atk = 600;
  report(t7, 'cinderella as Attacker');
  cindy.class = saved.class;
  cindy.baseStats.hp = saved.hp;
  cindy.baseStats.atk = saved.atk;
}


// ---- SWHA component split: volley-only vs lump-only, in both her fights ----
const t6c = COMPS.find(c => c.name.startsWith('T6'));
const noLump = (o) => {
  for (const b of o.skill1 ?? []) for (const e of b.effects) {
    if (e.kind === 'flatDamage' && e.atkPct === 7129.44) e.atkPct = 0.0001;
  }
  return o;
};
const noVolley = (o) => {
  for (const b of o.skill1 ?? []) for (const e of b.effects) {
    if (e.kind === 'flatDamage' && (e.atkPct === 527.95 || e.atkPct === 41.9)) e.atkPct = 0.0001;
  }
  return o;
};
report(t4, 'SWHA no-lump', { 'snow-white-heavy-arms': noLump });
report(t4, 'SWHA no-volley', { 'snow-white-heavy-arms': noVolley });
report(t6c, 'SWHA no-lump', { 'snow-white-heavy-arms': noLump });
report(t6c, 'SWHA no-volley', { 'snow-white-heavy-arms': noVolley });


// ---- Privaty component splits ----
report(t4, 'privaty no-designated-dot', {
  privaty: (o) => {
    for (const b of o.skill2 ?? []) b.effects = b.effects.filter(e => !(e.kind === 'dot'));
    return o;
  },
});
report(t4, 'privaty no-256-proc', {
  privaty: (o) => {
    for (const b of o.skill2 ?? []) b.effects = b.effects.filter(e => !(e.kind === 'flatDamage' && e.atkPct === 256.17));
    return o;
  },
});
