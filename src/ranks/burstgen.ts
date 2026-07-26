// Burst-generation ranking board — every sim-supported unit modeled SOLO, ranked
// by its UNCAPPED total burst gauge generated over a 180s fight (gauge-percent
// units, 100 = one full bar), kit gauge effects included.
//
// Methodology (owner ruling 2026-07-26): the run uses cfg.disableBursts — the
// team never bursts, the bar pins at 100, and the engine's additive
// UnitResult.gaugeGenerated counter accumulates everything the unit feeds the
// bar BEFORE the clamp (src/engine/sim.ts addGauge/fillGauge). That makes the
// metric pure raw generation: no Full Burst / chain lockout windows, and
// teammate composition is irrelevant EXCEPT for the two team-ammo-scaling kits
// below. The tested unit holds camera focus (focusSlug), so charge weapons get
// the measured ×2.5 focus bonus — the same convention as the DPS chart.
// Consequence: gauge kits gated on a Full Burst happening (none sim-supported
// today) read 0 on this board.
//
// Profiles (burst-gen census 2026-07-26 — the ONLY two kits that scale with
// team ammo burn; every other burst-gauge-buffer-tagged unit is a self/own-shot
// proc that works solo):
//   little-mermaid          +2 MG partners  (S1: 400 team ammo → fill 37%)
//   cinderella-crystal-wave +1 MG partner   (S1: 200 team ammo → fill 12%)
// The partners are zero-damage synthetic MGs (src/ranks/synthetics.ts) — only
// their 300-round belts matter.
//
// Isomorphic: the caller supplies the data context, so this runs in the
// precompute script (fs-loaded data) or the browser unchanged.
import type { CharacterData, LevelMultiplier, SimConfig } from '../types.js';
import { prepareTeam, type PrepareDeps, type UnitOptions } from '../prepare.js';
import { runSim } from '../engine/sim.js';
import { NOOP_MG, syntheticFor } from './synthetics.js';

export interface RanksCtx {
  characters: Record<string, CharacterData & { baseStats: any }>;
  mult: LevelMultiplier;
  deps: PrepareDeps;
}

// slug → team profile. Profiled units are ranked BOTH ways (plain solo AND
// profiled) — the `profile` field on each entry tells the frontend which is
// which (owner ruling 2026-07-26).
export interface BurstGenProfile {
  id: string;
  partners: string[]; // partner synthetic slugs appended to the solo team
  note: string;       // player-facing, surfaced in the artifact's profiles map
}
export const BURSTGEN_PROFILES: Record<string, BurstGenProfile> = {
  'little-mermaid': {
    id: 'with-2mg',
    partners: [NOOP_MG, NOOP_MG],
    note: 'modeled with two machine-gun partners — her 400-ammunition fill scales with team ammunition burn',
  },
  'cinderella-crystal-wave': {
    id: 'with-1mg',
    partners: [NOOP_MG],
    note: 'modeled with one machine-gun partner — her 200-ammunition fill scales with team ammunition burn',
  },
};

export interface BurstGenEntry {
  slug: string;
  gaugeTotal: number;   // uncapped gauge-percent over 180s (100 = one bar)
  barsPerFight: number; // gaugeTotal / 100
  profile: string | null; // profile id, null = plain solo run
  rank: number;         // 1-based, by descending gaugeTotal
}

// One unit's uncapped gauge total with an explicit partner list. The tested unit
// is always slot 0.
export function burstGenWithPartners(slug: string, partners: string[], ctx: RanksCtx): number {
  const slugs = [slug, ...partners];
  const chars = slugs.map((s) => ctx.characters[s] ?? syntheticFor(s));
  // Scope-lock loadout (Base-5, no cube/doll, 3★/core 7 — the DPS chart's scope
  // tier). Investment barely moves this board (gauge is cadence/kit-driven, not
  // ATK-driven), but the convention keeps the boards comparable.
  const unitOpts: UnitOptions[] = slugs.map(() => ({ ol: 'base5', stars: 3, core: 7 }));
  const cfg: SimConfig = {
    slugs,
    bossElement: null,
    bossDef: 0,
    level: 400,
    copies: 0, // per-unit stars/core win
    doll: false,
    ol: 'base5',
    coreHitRate: 0,
    rangeBonus: true,
    durationSec: 180,
    focusSlug: slug,
    disableBursts: true, // the board's defining rule — see the module header
  };
  const prepared = prepareTeam(chars, unitOpts, ctx.deps);
  const r = runSim(chars, ctx.mult, cfg, prepared);
  return r.units[0].gaugeGenerated;
}

// One unit's uncapped gauge total. withProfile=false forces the plain solo run
// even for a profiled unit (the board emits both variants).
export function burstGenFor(slug: string, ctx: RanksCtx, withProfile = true): number {
  const profile = withProfile ? BURSTGEN_PROFILES[slug] : undefined;
  return burstGenWithPartners(slug, profile?.partners ?? [], ctx);
}

// Rank the whole population (every sim-supported slug). Profiled units appear
// TWICE — plain (profile: null) and profiled (profile: id) — so the two
// standings compare at a glance (owner ruling 2026-07-26).
export function rankBurstGen(population: string[], ctx: RanksCtx): BurstGenEntry[] {
  const scored = population.flatMap((slug) => {
    const rows = [{ slug, gaugeTotal: burstGenFor(slug, ctx, false), profile: null as string | null }];
    const profile = BURSTGEN_PROFILES[slug];
    if (profile) rows.push({ slug, gaugeTotal: burstGenFor(slug, ctx, true), profile: profile.id });
    return rows;
  });
  scored.sort((a, b) => b.gaugeTotal - a.gaugeTotal);
  return scored.map((s, i) => ({
    ...s,
    barsPerFight: s.gaugeTotal / 100,
    rank: i + 1,
  }));
}
