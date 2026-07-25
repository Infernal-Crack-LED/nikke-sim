// Per-unit hit-value BANDS — the deterministic key for identifying a popup, as a library.
//
// `hit-values.ts` prints this table for a human; this module computes it so a reader can check
// band membership programmatically. Both share one derivation, so the CLI table and a reader's
// in-band verdict can never drift apart.
//
// A band is one (category, coefficient) hit type's non-crit non-core value range across the whole
// fight, plus its crit / core / crit+core images. A popup value inside a band is CORROBORATED; a
// value outside every band is either a misread or an unmodelled hit — both worth surfacing.

import { loadWorld, autoWire, type BatteryTeam } from '../battery/lib.js';
import { prepareTeam, type UnitOptions } from '../../src/prepare.js';
import { loadOverride } from '../../src/skills/overrides-node.js';
import { runSim } from '../../src/engine/sim.js';
import type { SimConfig, Element } from '../../src/types.js';

export interface HitBand {
  cat: string;
  coefPct: number;
  n: number;
  baseLo: number;
  baseHi: number;
  critLo: number;
  critHi: number;
  coreLo: number;
  coreHi: number;
  critCoreLo: number;
  critCoreHi: number;
}

export interface HitBandTable {
  focus: string;
  team: string[];
  boss: Element | null;
  critBonus: number;
  coreBonus: number;
  bands: HitBand[];
  focusTotal: number | null;
}

interface Inst { cat: string; atkPct: number; major: number; dmg: number }

/** Run the sim once with the debug tap on and group the focus unit's instances into value bands. */
export function computeHitBands(focus: string, team: string[], boss: Element | null, focusSlug = focus): HitBandTable {
  const w = loadWorld();
  const bt: BatteryTeam = { name: focus, slugs: team.length ? team : [focus], focus: focusSlug, modes: {}, lambda: {} };
  autoWire(w, bt);

  const prevUnit = process.env.DBG_UNIT;
  const prevN = process.env.DBG_N;
  process.env.DBG_UNIT = focus;
  process.env.DBG_N = '1000000';
  const lines: string[] = [];
  const realLog = console.log;
  console.log = (...a: unknown[]) => {
    const s = a.join(' ');
    if (s.includes(`[dbg ${focus}]`)) lines.push(s);
    else realLog(...a);
  };

  let res;
  try {
    const chars = bt.slugs.map((s) => w.data.characters[s]);
    const overrides: Record<string, ReturnType<typeof loadOverride>> = {};
    for (const s of bt.slugs) overrides[s] = loadOverride(s);
    const unitOpts: UnitOptions[] = bt.slugs.map((slug) => ({
      doll: false, ol: 'base5', mode: bt.modes?.[slug], lambdaStage: bt.lambda?.[slug],
    }));
    // coreHitRate:0 so the printed dmg is the clean NON-core base; core is applied on top below.
    const cfg: SimConfig = {
      slugs: bt.slugs, bossElement: boss, bossDef: 0, level: 400, copies: 10,
      doll: false, ol: 'base5', coreHitRate: 0, rangeBonus: true, durationSec: 180, focusSlug,
    };
    const prepared = prepareTeam(chars, unitOpts, {
      overrides, skillLevels: w.skillLevels, cubes: w.cubes, olLines: w.olLines,
    });
    res = runSim(chars, w.mult, cfg, prepared);
  } finally {
    console.log = realLog;
    if (prevUnit === undefined) delete process.env.DBG_UNIT; else process.env.DBG_UNIT = prevUnit;
    if (prevN === undefined) delete process.env.DBG_N; else process.env.DBG_N = prevN;
  }

  const insts: Inst[] = [];
  for (const l of lines) {
    const m = l.match(/\] t=[\d.]+ (\w+) atkPct=([\d.]+) baseAtk=\d+ major=([\d.]+) .* dmg=(\d+)/);
    if (m) insts.push({ cat: m[1], atkPct: +m[2], major: +m[3], dmg: +m[4] });
  }
  const groups = new Map<string, Inst[]>();
  for (const i of insts) {
    const key = `${i.cat}|${i.atkPct.toFixed(1)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(i);
  }

  const fchar = w.data.characters[focus] as unknown as {
    baseStats?: { critDamage?: number };
    coreAttackMultiplier?: number;
  };
  const critBonus = ((fchar?.baseStats?.critDamage ?? 150) - 100) / 100;
  const coreBonus = ((fchar?.coreAttackMultiplier ?? 200) - 100) / 100;

  const bands: HitBand[] = [...groups.entries()].map(([key, g]) => {
    const [cat, coef] = key.split('|');
    const dmgs = g.map((i) => i.dmg).sort((a, b) => a - b);
    const lo = dmgs[0], hi = dmgs[dmgs.length - 1];
    // A crit popup reads base x (major+critBonus)/major — during Full Burst the major is already
    // ~1.5, so the visible crit factor is ~x1.333, not x1.5. Use each group's own major range.
    const majMin = Math.min(...g.map((i) => i.major)), majMax = Math.max(...g.map((i) => i.major));
    const critLo = Math.round((lo * (majMin + critBonus)) / majMin);
    const critHi = Math.round((hi * (majMax + critBonus)) / majMax);
    return {
      cat, coefPct: Number(coef), n: g.length,
      baseLo: lo, baseHi: hi,
      critLo, critHi,
      coreLo: Math.round(lo * (1 + coreBonus)), coreHi: Math.round(hi * (1 + coreBonus)),
      critCoreLo: Math.round(critLo * (1 + coreBonus)), critCoreHi: Math.round(critHi * (1 + coreBonus)),
    };
  }).sort((a, b) => b.baseHi - a.baseHi);

  return {
    focus, team: bt.slugs, boss, critBonus, coreBonus, bands,
    focusTotal: res.units.find((x) => x.slug === focus)?.totalDamage ?? null,
  };
}

export interface BandHit { cat: string; coefPct: number; variant: 'base' | 'crit' | 'core' | 'crit+core' }

/**
 * Which hit types could produce this popup value. `tolPct` widens each band's edges — buffs the
 * sim models will already be inside the min/max, so the tolerance only absorbs rounding.
 */
export function matchBands(table: HitBandTable, value: number, tolPct = 1): BandHit[] {
  const out: BandHit[] = [];
  const f = tolPct / 100;
  for (const b of table.bands) {
    const variants: [BandHit['variant'], number, number][] = [
      ['base', b.baseLo, b.baseHi],
      ['crit', b.critLo, b.critHi],
      ['core', b.coreLo, b.coreHi],
      ['crit+core', b.critCoreLo, b.critCoreHi],
    ];
    for (const [variant, lo, hi] of variants)
      if (value >= lo * (1 - f) && value <= hi * (1 + f))
        out.push({ cat: b.cat, coefPct: b.coefPct, variant });
  }
  return out;
}
