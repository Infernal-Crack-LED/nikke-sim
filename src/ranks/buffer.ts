// Buffer ranking board — how much damage a support unit ADDS to two standard
// carries, ranked. Owner methodology (2026-07-26):
//
//   Comp: the tested buffer + synthetic no-op stage fillers + two standard
//   damage-dealing carries (src/ranks/synthetics.ts), at scope lock, both
//   carries elementally advantaged.
//     tested B1 → [tested, no-op B2, carry, carry]
//     tested B2 → [no-op B1, tested, carry, carry]
//     tested B3 → [no-op B1, no-op B2, carry, carry, tested-rightmost]
//   A tested B3 sits RIGHTMOST so the two carries always win the stage-3 cast
//   and it never bursts (pinned in tests) — its value must come through
//   passives and cast-free lines.
//   Value = Σ carry DPS with the buffer − Σ carry DPS with a stage-matched
//   no-op in its slot (baseline). The buffer's own weapon damage is NOT
//   counted. Rotation-driven value (gauge batteries, CDR) IS captured — the
//   whole fight is simmed.
//
//   TWO BOARDS:
//     generic — carries are the plain MG + RL pair; only buffs that need no
//               special ally properties apply (ATK/crit/generic + whatever the
//               MG/RL pair naturally catches — RL normals count as projectile
//               explosion by engine default).
//     typed   — the carries adapt to the tested unit's kit, AUTO-DERIVED from
//               its override: alliesOfWeapon W → both carries become W;
//               pierceDamagePct / gainPierce on allies → both carries gain
//               Pierce; projectileExplosionPct on allies → both carries RL;
//               alliesOfElement E → both carries element E. Manual
//               BUFFER_PROFILES patches what the derivation can't see.
//
// Reading: generic = the buffer's plug-and-play value; typed = its value when
// the team is built around it. Known caveat (same as the DPS chart): purely
// defensive/sustain kits read ~0 — the boss deals no damage at scope lock.
import type { CharacterData, Element, SimConfig, Weapon } from '../types.js';
import { prepareTeam, type UnitOptions } from '../prepare.js';
import { runSim } from '../engine/sim.js';
import type { RanksCtx } from './burstgen.js';
import { CARRY_MG, CARRY_RL, carryWithWeapon, syntheticFor, type SyntheticCharacter } from './synthetics.js';
import { NOOP_B1, NOOP_B2, NOOP_B3, NOOP_CHARACTERS } from '../dpschart/noop.js';

const BEATS: Record<Element, Element> = {
  Electric: 'Water', Iron: 'Electric', Wind: 'Iron', Fire: 'Wind', Water: 'Fire',
};

// ---- typed-board carry adaptation -------------------------------------------

export interface CarrySpec {
  weapon: Weapon | null;   // both carries become this weapon (null = keep MG+RL)
  pierce: boolean;         // both carries gain Pierce
  element: Element | null; // both carries become this element (null = Iron)
}
const PLAIN_SPEC: CarrySpec = { weapon: null, pierce: false, element: null };

// Manual patches for what the override scan can't see (applied over the derived
// spec). Keep each entry justified by a kit line.
export const BUFFER_PROFILES: Record<string, Partial<CarrySpec>> = {};

// Walk every {target, effects} block in the override JSON (any nesting — skill
// slots, modes, steps) and derive what the carries must provide for the unit's
// ALLY-FACING typed buffs to apply. Returns the spec + an audit trail.
export function deriveCarrySpec(override: unknown): { spec: CarrySpec; rules: string[] } {
  const spec: CarrySpec = { ...PLAIN_SPEC };
  const rules: string[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    const block = node as { target?: any; effects?: any[] };
    const target = block.target;
    if (target && Array.isArray(block.effects) && target.kind !== 'self') {
      if (target.kind === 'alliesOfWeapon' && target.weapon && !spec.weapon) {
        spec.weapon = target.weapon as Weapon;
        rules.push(`alliesOfWeapon ${target.weapon} → carries become ${target.weapon}`);
      }
      if (target.kind === 'alliesOfElement' && target.element && !spec.element) {
        spec.element = target.element as Element;
        rules.push(`alliesOfElement ${target.element} → carries become ${target.element}`);
      }
      for (const e of block.effects) {
        if (e?.kind === 'buff' && e.stat === 'pierceDamagePct' && !spec.pierce) {
          spec.pierce = true;
          rules.push('pierceDamagePct on allies → carries gain Pierce');
        }
        if (e?.kind === 'gainPierce' && !spec.pierce) {
          spec.pierce = true;
          rules.push('gainPierce on allies → carries gain Pierce');
        }
        if (e?.kind === 'buff' && e.stat === 'projectileExplosionPct' && !spec.weapon) {
          spec.weapon = 'RL';
          rules.push('projectileExplosionPct on allies → carries become RL (proj-explosion normals)');
        }
      }
    }
    for (const v of Object.values(node)) visit(v);
  };
  visit(override);
  const manual = BUFFER_PROFILES[(override as { slug?: string })?.slug ?? ''];
  if (manual) {
    Object.assign(spec, manual);
    rules.push(`manual BUFFER_PROFILES patch: ${JSON.stringify(manual)}`);
  }
  return { spec, rules };
}

// ---- team assembly + run ----------------------------------------------------

export type BufferBoard = 'generic' | 'typed';

interface AssembledBufferTeam {
  slugs: string[];
  chars: (CharacterData & { baseStats: any })[];
  carryIdxs: number[];
  noopSlot: string; // stage-matched no-op for the baseline
}

// The two carry records for one board arm (typed adapts both).
function carriesFor(board: BufferBoard, spec: CarrySpec): SyntheticCharacter[] {
  const mg = board === 'typed' && spec.weapon ? carryWithWeapon(spec.weapon) : syntheticFor(CARRY_MG)!;
  const rl = board === 'typed' && spec.weapon ? carryWithWeapon(spec.weapon) : syntheticFor(CARRY_RL)!;
  const element = (board === 'typed' ? spec.element : null) ?? 'Iron';
  return [
    { ...mg, element },
    { ...rl, element },
  ];
}

function assemble(slug: string, burst: string, board: BufferBoard, spec: CarrySpec): AssembledBufferTeam {
  const [c1, c2] = carriesFor(board, spec);
  let slugs: string[];
  let noopSlot: string;
  if (burst === 'I') {
    slugs = [slug, NOOP_B2, c1.slug, c2.slug];
    noopSlot = NOOP_B1;
  } else if (burst === 'II') {
    slugs = [NOOP_B1, slug, c1.slug, c2.slug];
    noopSlot = NOOP_B2;
  } else {
    // B3 (or Λ): tested rightmost so the carries always win the stage-3 cast.
    slugs = [NOOP_B1, NOOP_B2, c1.slug, c2.slug, slug];
    noopSlot = NOOP_B3;
  }
  return {
    slugs,
    chars: [c1, c2] as any,
    carryIdxs: [slugs.indexOf(c1.slug), slugs.lastIndexOf(c2.slug)],
    noopSlot,
  };
}

function charFor(ctx: RanksCtx, slug: string, carries: SyntheticCharacter[]) {
  return (
    carries.find((c) => c.slug === slug) ??
    ctx.characters[slug] ??
    syntheticFor(slug) ??
    (NOOP_CHARACTERS as any)[slug]
  );
}

export interface BufferValue {
  slug: string;
  value: number;      // added carry DPS vs the no-op baseline
  carryDps: number;   // Σ carry DPS with the buffer
  baselineDps: number;
  testedBurstCasts: number; // pin: a tested B3 must be 0 (rightmost rule)
  rules: string[];    // typed-board adaptation audit trail ([] on generic)
  rank: number;
}

// One value run. Returns Σ carry DPS for the comp plus the tested slot's cast
// count; the baseline swaps the tested unit for its stage-matched no-op (same
// carries).
function carryDpsSum(
  team: AssembledBufferTeam,
  ctx: RanksCtx,
  spec: CarrySpec,
  pierceOverride: boolean,
  testedSlug?: string,
): { sum: number; testedBurstCasts: number } {
  const chars = team.slugs.map((s) => charFor(ctx, s, team.chars as any));
  const element = (chars[team.carryIdxs[0]] as CharacterData).element as Element;
  const unitOpts: UnitOptions[] = team.slugs.map((s) =>
    (NOOP_CHARACTERS as any)[s] ? {} : { ol: 'base5' as const, stars: 3, core: 7 },
  );
  const cfg: SimConfig = {
    slugs: team.slugs,
    bossElement: BEATS[element], // both carries advantaged
    bossDef: 0,
    level: 400,
    copies: 0,
    doll: false,
    ol: 'base5',
    coreHitRate: 0,
    rangeBonus: true,
    durationSec: 180,
    focusSlug: team.slugs[team.carryIdxs[1]], // the right carry (RL on generic)
  };
  const deps = pierceOverride
    ? {
        ...ctx.deps,
        overrides: {
          ...ctx.deps.overrides,
          ...Object.fromEntries(
            team.carryIdxs.map((i) => [
              team.slugs[i],
              { slug: team.slugs[i], hasPierce: true, skill1: [], skill2: [], burst: [] } as any,
            ]),
          ),
        },
      }
    : ctx.deps;
  const prepared = prepareTeam(chars, unitOpts, deps);
  const r = runSim(chars, ctx.mult, cfg, prepared);
  const sum = team.carryIdxs.reduce((a, i) => a + r.units[i].dps, 0);
  const testedBurstCasts = testedSlug
    ? r.units[team.slugs.indexOf(testedSlug)].burstCasts
    : 0;
  return { sum, testedBurstCasts };
}

// Value of one buffer on one board. Baselines are memoized per (burst, board,
// spec) — every buffer of the same burst stage + adaptation shares one.
export function bufferValueFor(
  slug: string,
  board: BufferBoard,
  ctx: RanksCtx,
  baselineMemo: Map<string, number> = new Map(),
): Omit<BufferValue, 'rank'> {
  const char = ctx.characters[slug];
  if (!char) throw new Error(`${slug}: not in characters.json`);
  const burst = char.burst === 'Λ' ? 'III' : char.burst;
  const { spec, rules } = board === 'typed'
    ? deriveCarrySpec(ctx.deps.overrides[slug])
    : { spec: { ...PLAIN_SPEC }, rules: [] };

  const team = assemble(slug, burst, board, spec);
  const baselineTeam = assemble(team.noopSlot, burst, board, spec);
  const baselineKey = `${burst}|${spec.weapon ?? 'plain'}|${spec.pierce}|${spec.element ?? 'Iron'}`;
  let baseline = baselineMemo.get(baselineKey);
  if (baseline === undefined) {
    baseline = carryDpsSum(baselineTeam, ctx, spec, board === 'typed' && spec.pierce).sum;
    baselineMemo.set(baselineKey, baseline);
  }
  const run = carryDpsSum(team, ctx, spec, board === 'typed' && spec.pierce, slug);
  return {
    slug,
    value: run.sum - baseline,
    carryDps: run.sum,
    baselineDps: baseline,
    testedBurstCasts: run.testedBurstCasts,
    rules,
  };
}

// Rank a population on one board.
export function rankBuffers(
  population: string[],
  board: BufferBoard,
  ctx: RanksCtx,
): BufferValue[] {
  const memo = new Map<string, number>();
  const results = population.map((slug) => bufferValueFor(slug, board, ctx, memo));
  results.sort((a, b) => b.value - a.value);
  return results.map((r, i) => ({ ...r, rank: i + 1 }));
}
