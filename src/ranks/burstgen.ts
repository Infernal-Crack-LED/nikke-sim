// Burst-generation ranking board — every sim-supported unit modeled in a standard
// no-op team with bursting enabled, ranked by the gauge-per-second it contributes
// during the windows when the team bar is actively accepting energy.
//
// Methodology: the unit under test joins a team of synthetic no-op units (no
// skills, weapon-class-modal gauge generation). The tested unit is placed as the
// leftmost member of its burst category so it bursts first when ready, and is
// measured UNFOCUSED — camera focus is parked on a non-charge no-op teammate so
// charge weapons generate at ×1.0 (the ×2.5 focused charge bonus is a camera
// artifact a board cannot grant to every unit at once, so it is not applied here).
// Bursts are enabled, so the metric is the unit's average contribution to the
// team gauge fill rate, not raw uncapped generation. Full Burst / chain lockout
// windows are excluded automatically by the engine's gaugeBuildTimeSec counter.
//
// Base no-op teams (unit under test is inserted at the leftmost slot of its
// burst category, marked with ▼):
//   B1 20s: [▼unit, B2 SR, B2 SR, B3 RL, B3 MG]
//   B1 40s: [▼unit, B1 AR, B2 SR, B3 RL, B3 MG]  (second B1 covers off-rotations)
//   B2:     [B1 AR, ▼unit, B2 SR, B3 RL, B3 MG]
//   B3:     [B1 AR, B2 SR, B2 SR, ▼unit, B3 RL]
//
// Profiles (team-ammo-scaling kits; the B3 no-ops are replaced with MG):
//   little-mermaid:          B3 slots become MG
//   cinderella-crystal-wave: second B3 becomes MG
//
// Isomorphic: the caller supplies the data context, so this runs in the
// precompute script (fs-loaded data) or the browser unchanged.
import type { CharacterData, LevelMultiplier, SimConfig } from '../types.js';
import { prepareTeam, type PrepareDeps, type UnitOptions } from '../prepare.js';
import { runSim } from '../engine/sim.js';
import {
  NOOP_B1,
  NOOP_B2,
  NOOP_B3,
  NOOP_B3_RL,
  NOOP_CHARACTERS,
} from '../dpschart/noop.js';
import { syntheticFor } from './synthetics.js';

export interface RanksCtx {
  characters: Record<string, CharacterData & { baseStats: any }>;
  mult: LevelMultiplier;
  deps: PrepareDeps;
}

// slug → team profile. Profiled units are ranked BOTH ways (plain base team AND
// profiled) — the `profile` field on each entry tells the frontend which is
// which.
export interface BurstGenProfile {
  id: string;
  teammates: string[]; // 4 synthetic slugs that surround the tested unit
  note: string; // player-facing, surfaced in the artifact's profiles map
}

// Base no-op team templates. The unit under test is inserted at the leftmost
// slot of its burst category, so these 4-slug arrays are ordered by the remaining
// slots.
const B1_20S_TEAM = [NOOP_B2, NOOP_B2, NOOP_B3_RL, NOOP_B3];
const B1_40S_TEAM = [NOOP_B1, NOOP_B2, NOOP_B3_RL, NOOP_B3];
const B2_TEAM = [NOOP_B1, NOOP_B2, NOOP_B3_RL, NOOP_B3];
const B3_TEAM = [NOOP_B1, NOOP_B2, NOOP_B2, NOOP_B3_RL];

export const BURSTGEN_PROFILES: Record<string, BurstGenProfile> = {
  'little-mermaid': {
    id: 'with-2mg',
    teammates: [NOOP_B2, NOOP_B2, NOOP_B3, NOOP_B3],
    note: 'modeled with two machine-gun B3 partners — her 400-ammunition team fill scales with team ammunition burn',
  },
  'cinderella-crystal-wave': {
    id: 'with-mg',
    teammates: [NOOP_B1, NOOP_B2, NOOP_B2, NOOP_B3],
    note: 'modeled with a machine-gun B3 partner — her 200-ammunition team fill scales with team ammunition burn',
  },
};

export interface BurstGenEntry {
  slug: string;
  gaugePerSec: number; // gauge-percent per second the unit adds while the bar is building
  gaugeTotal: number; // uncapped gauge-percent the unit contributed over the whole fight
  fullBursts: number; // full bursts completed by the team
  barsPerFight: number; // gaugeTotal / 100
  profile: string | null; // profile id, null = plain base-team run
  rank: number; // 1-based, by descending gaugePerSec
}

// Leftmost slot for each burst category (B1=0, B2=1, B3=3).
function leftmostSlot(burst: CharacterData['burst']): number {
  if (burst === 'I') {
    return 0;
  }
  if (burst === 'II') {
    return 1;
  }
  return 3; // 'III' or 'Λ'
}

function is40sB1(char: CharacterData): boolean {
  return char.burst === 'I' && char.burstCooldownSec > 30;
}

// Resolve a slug to a CharacterData, checking real units, then no-op controls,
// then ranking-board synthetics.
function characterFor(
  slug: string,
  ctx: RanksCtx
): CharacterData & { baseStats: any } {
  const found =
    ctx.characters[slug] ??
    (NOOP_CHARACTERS[slug] as
      (CharacterData & { baseStats: any }) | undefined) ??
    syntheticFor(slug);
  if (!found) {
    throw new Error(`unknown burst-gen unit "${slug}"`);
  }
  return found;
}

// Pick the base 4 no-op teammates for a unit based on its burst category and
// B1 cooldown length.
function baseTeamFor(char: CharacterData): string[] {
  if (char.burst === 'I') {
    return is40sB1(char) ? B1_40S_TEAM : B1_20S_TEAM;
  }
  if (char.burst === 'II') {
    return B2_TEAM;
  }
  return B3_TEAM; // 'III' or 'Λ'
}

// Build the 5-slug team for a unit. withProfile=false uses the base team for its
// burst category; withProfile=true uses the unit's special profile if defined.
function buildTeam(
  slug: string,
  char: CharacterData,
  withProfile: boolean
): string[] {
  const profile = withProfile ? BURSTGEN_PROFILES[slug] : undefined;
  const base = profile?.teammates ?? baseTeamFor(char);
  const slot = leftmostSlot(char.burst);
  const team = [...base];
  team.splice(slot, 0, slug);
  return team;
}

// Run one unit in its no-op team and return its burst-generation contribution.
// The tested unit is leftmost in its burst category and measured unfocused
// (charge weapons at ×1.0; camera focus is parked on a non-charge teammate).
export function burstGenFor(
  slug: string,
  ctx: RanksCtx,
  withProfile = true
): BurstGenEntry {
  const char = characterFor(slug, ctx);
  const slugs = buildTeam(slug, char, withProfile);
  const chars = slugs.map((s) => characterFor(s, ctx));
  const unitIdx = leftmostSlot(char.burst);
  const unitOpts: UnitOptions[] = chars.map((c) => {
    const opts: UnitOptions = {
      ol: 'base5',
      stars: 3,
      core: 7,
    };
    // Λ units must be pinned to a single stage so they don't displace other
    // burst categories. Default them to B3 for this board.
    if (c.burst === 'Λ') {
      opts.lambdaStage = 3;
    }
    return opts;
  });
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
    // Camera focus is parked on a non-charge no-op teammate so the unit under
    // test is measured UNFOCUSED: the focused charge bonus (sim.ts gaugePerShot,
    // per-unit since 2026-07-29, SR/RL only) is a camera artifact a ranking board
    // cannot grant to every unit at once. Focusing a non-charge unit means no unit
    // receives it, so charge weapons are ranked on raw ×1.0 generation. (If no
    // non-charge teammate exists, the engine's default slot-2 focus applies.)
    focusSlug: slugs.find((s) => {
      if (s === slug) {
        return false;
      }
      const w = characterFor(s, ctx).weapon;
      return w !== 'SR' && w !== 'RL';
    }),
  };
  const prepared = prepareTeam(chars, unitOpts, ctx.deps);
  const r = runSim(chars, ctx.mult, cfg, prepared);
  const u = r.units[unitIdx];
  const gaugeBuildTime = r.gaugeBuildTimeSec;
  const gaugePerSec =
    gaugeBuildTime > 0 ? u.gaugeGenerated / gaugeBuildTime : 0;
  return {
    slug,
    gaugePerSec,
    gaugeTotal: u.gaugeGenerated,
    fullBursts: r.fullBursts,
    barsPerFight: u.gaugeGenerated / 100,
    profile: withProfile ? (BURSTGEN_PROFILES[slug]?.id ?? null) : null,
    rank: 0, // filled by rankBurstGen
  };
}

// Rank the whole population (every sim-supported slug). Profiled units appear
// TWICE — plain (profile: null) and profiled (profile: id) — so the two
// standings compare at a glance.
export function rankBurstGen(
  population: string[],
  ctx: RanksCtx
): BurstGenEntry[] {
  const scored = population.flatMap((slug) => {
    const char = ctx.characters[slug];
    if (!char) {
      return [];
    }
    const rows = [burstGenFor(slug, ctx, false)];
    const profile = BURSTGEN_PROFILES[slug];
    if (profile) {
      rows.push(burstGenFor(slug, ctx, true));
    }
    return rows;
  });
  scored.sort((a, b) => b.gaugePerSec - a.gaugePerSec);
  return scored.map((s, i) => ({ ...s, rank: i + 1 }));
}
