// Buffer ranking board — how much damage a support unit ADDS to two standard
// carries, ranked. Owner methodology (2026-07-26):
//
//   Comp: the tested buffer + synthetic no-op stage fillers + two standard
//   damage-dealing carries (src/ranks/synthetics.ts), at scope lock, both
//   carries elementally advantaged.
//     tested B1 → [tested, no-op B2, carry, carry] (no-op B1 if B1 CD > 20s)
//     tested B2 → [no-op B1, tested, carry, carry]
//     tested B3 → [no-op B1, no-op B2, carry, carry, tested-rightmost]
//   A tested B3 sits RIGHTMOST so the two carries always win the stage-3 cast
//   and it never bursts (pinned in tests) — its value must come through
//   passives and cast-free lines.
//   Value = % team damage increase = (Σ carry DPS with the buffer − Σ carry
//   DPS with a stage-matched no-op baseline) / Σ carry DPS with the baseline.
//   The buffer's own weapon damage is NOT counted. Rotation-driven value
//   (gauge batteries, CDR) IS captured — the whole fight is simmed.
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
import {
  CARRY_MG,
  CARRY_RL,
  carryWithWeapon,
  syntheticFor,
  type SyntheticCharacter,
} from './synthetics.js';
import {
  NOOP_B1,
  NOOP_B2,
  NOOP_B3,
  NOOP_CHARACTERS,
  NOOP_ROUGE_B1,
} from '../dpschart/noop.js';

const BEATS: Record<Element, Element> = {
  Electric: 'Water',
  Iron: 'Electric',
  Wind: 'Iron',
  Fire: 'Wind',
  Water: 'Fire',
};
const BEATS_INVERSE: Record<Element, Element> = {
  Water: 'Electric',
  Electric: 'Iron',
  Iron: 'Wind',
  Wind: 'Fire',
  Fire: 'Water',
};

// A B1 with cooldown above this cannot solo-sustain a standard 1-B1/1-B2 rotation
// (matches CD_SHORT in src/teamcalc.ts), so the buffer comp gives it a second B1.
const B1_SOLO_CD_THRESHOLD = 20;

// ---- typed-board carry adaptation -------------------------------------------

export interface CarrySpec {
  weapon: Weapon | null; // both carries become this weapon (null = keep MG+RL)
  pierce: boolean; // both carries gain Pierce
  element: Element | null; // both carries become this element (null = Iron)
}
const PLAIN_SPEC: CarrySpec = { weapon: null, pierce: false, element: null };

// Manual patches for what the override scan can't see (applied over the derived
// spec). Keep each entry justified by a kit line.
export const BUFFER_PROFILES: Record<string, Partial<CarrySpec>> = {};

// ---- comp profiles (with-healer / with-shielder) -----------------------------
// Some headline buffs are gated on a teammate the standard comp doesn't field:
// crown's team Attack Damage ▲ fires on 'when recovery takes effect', naga's
// core/ATK lines require a shield covering her. The plain run shows the floor
// (crown's own Relax self-heal gives ~27% uptime; naga's lines stay inert); the
// profile run gives the stage-filler no-op a synthetic kit that holds the gate
// at ~100% uptime (owner ruling 2026-07-26). Profiled units are ranked BOTH
// ways — the `profile` field on each entry tells the frontend which is which.
export interface BufferCompProfile {
  id: string;
  note: string; // player-facing, in the artifact's profiles map
  noopSkill1: object[]; // synthetic skill1 blocks injected on the no-op fillers
}
export const COMP_PROFILES: Record<string, BufferCompProfile> = {
  'with-healer': {
    id: 'with-healer',
    note: 'a healing teammate keeps recovery-triggered buffs at full uptime',
    noopSkill1: [
      {
        slot: 'skill1',
        trigger: { kind: 'interval', sec: 1 },
        target: { kind: 'allies' },
        effects: [{ kind: 'heal' }],
      },
    ],
  },
  'with-shielder': {
    id: 'with-shielder',
    note: 'a shielding teammate keeps shield-gated buffs at full uptime',
    noopSkill1: [
      {
        slot: 'skill1',
        trigger: { kind: 'interval', sec: 5 },
        target: { kind: 'allies' },
        effects: [{ kind: 'shield', durationSec: 10 }],
      },
    ],
  },
};
export const BUFFER_COMP_PROFILES: Record<string, string> = {
  crown: 'with-healer', // S2: team Attack Damage ▲ 20.99% (7s) on 'recovery takes effect'
  naga: 'with-shielder', // S1/burst: coreDamagePct 85.17 + casterAtkPct 31.02 require a shield on her
};

// Duo profiles: a real (or synthetic) partner unit is added to the team so the
// tested B2's value with its canonical partner can be ranked. The pair's
// overrides implement the rotation (e.g. Prika's duet mode makes her burst
// first then never again). Value is the tested buffer's marginal added team
// damage % versus a baseline where the tested slot is a no-op B2 but the
// partner is still present in solo/default mode.
export const DUO_BUFFER_PROFILES: Record<
  string,
  {
    partner: string;
    id: string;
    note: string;
    mode?: string;
    partnerMode?: string;
    synthetic?: boolean;
  }
> = {
  mint: {
    partner: 'prika',
    id: 'w/ Prika',
    note: 'paired with Prika — Prika takes the first B2, Mint every B2 after',
    mode: 'duet (w/ Prika)',
    partnerMode: 'duet (w/ Mint)',
  },
  prika: {
    partner: 'mint',
    id: 'w/ Mint',
    note: 'paired with Mint — Prika takes the first B2, Mint every B2 after',
    mode: 'duet (w/ Mint)',
    partnerMode: 'duet (w/ Prika)',
  },
  'mast-romantic-maid': {
    partner: 'anchor-innocent-maid',
    id: 'w/ Anchor',
    note: 'paired with Anchor: Innocent Maid as the second B2',
  },
  blanc: {
    partner: NOOP_ROUGE_B1,
    id: 'w/ Rouge',
    note: 'synthetic Rouge squadmate keeps the same-squad CDR gate active',
    synthetic: true,
  },
};

// Slugs excluded from the buffer population: kits whose net effect is to reduce
// team damage in the standard comp produce a misleadingly negative % increase.
export const EXCLUDED_BUFFER_SLUGS = new Set(['blanc']);

// Walk every {target, effects} block in the override JSON (any nesting — skill
// slots, modes, steps) and derive what the carries must provide for the unit's
// ALLY-FACING typed buffs to apply. Returns the spec + an audit trail.
export function deriveCarrySpec(override: unknown): {
  spec: CarrySpec;
  rules: string[];
} {
  const spec: CarrySpec = { ...PLAIN_SPEC };
  const rules: string[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      return node.forEach(visit);
    }
    if (!node || typeof node !== 'object') {
      return;
    }
    const block = node as {
      target?: any;
      effects?: any[];
      bossElementGate?: any;
    };
    const target = block.target;
    if (target && Array.isArray(block.effects) && target.kind !== 'self') {
      if (target.kind === 'alliesOfWeapon' && target.weapon && !spec.weapon) {
        spec.weapon = target.weapon as Weapon;
        rules.push(
          `alliesOfWeapon ${target.weapon} → carries become ${target.weapon}`
        );
      }
      if (
        target.kind === 'alliesOfElement' &&
        target.element &&
        !spec.element
      ) {
        spec.element = target.element as Element;
        rules.push(
          `alliesOfElement ${target.element} → carries become ${target.element}`
        );
      }
      if (block.bossElementGate && !spec.element) {
        const gate = block.bossElementGate as Element;
        const counter = BEATS_INVERSE[gate];
        if (counter) {
          spec.element = counter;
          rules.push(
            `bossElementGate ${gate} → carries become ${counter} (advantaged vs ${gate} boss, debuff active)`
          );
        }
      }
      for (const e of block.effects) {
        if (
          e?.kind === 'buff' &&
          e.stat === 'pierceDamagePct' &&
          !spec.pierce
        ) {
          spec.pierce = true;
          rules.push('pierceDamagePct on allies → carries gain Pierce');
        }
        if (e?.kind === 'gainPierce' && !spec.pierce) {
          spec.pierce = true;
          rules.push('gainPierce on allies → carries gain Pierce');
        }
        if (
          e?.kind === 'buff' &&
          e.stat === 'projectileExplosionPct' &&
          !spec.weapon
        ) {
          spec.weapon = 'RL';
          rules.push(
            'projectileExplosionPct on allies → carries become RL (proj-explosion normals)'
          );
        }
      }
    }
    for (const v of Object.values(node)) {
      visit(v);
    }
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

// Effective burst cooldown for a real unit, honoring override charFixes.
function effectiveBurstCooldownSec(ctx: RanksCtx, slug: string): number {
  const char = ctx.characters[slug];
  return (
    ctx.deps.overrides[slug]?.charFixes?.burstCooldownSec ??
    char?.burstCooldownSec ??
    40
  );
}

// The two carry records for one board arm (typed adapts both).
function carriesFor(board: BufferBoard, spec: CarrySpec): SyntheticCharacter[] {
  const mg =
    board === 'typed' && spec.weapon
      ? carryWithWeapon(spec.weapon)
      : syntheticFor(CARRY_MG)!;
  const rl =
    board === 'typed' && spec.weapon
      ? carryWithWeapon(spec.weapon)
      : syntheticFor(CARRY_RL)!;
  const element = (board === 'typed' ? spec.element : null) ?? 'Iron';
  return [
    { ...mg, element },
    { ...rl, element },
  ];
}

export function assemble(
  slug: string,
  burst: string,
  board: BufferBoard,
  spec: CarrySpec,
  partner?: string,
  b1CdSec?: number
): AssembledBufferTeam {
  const [c1, c2] = carriesFor(board, spec);
  let slugs: string[];
  let noopSlot: string;
  if (burst === 'I') {
    // A B1 with >20s cooldown cannot solo-sustain a standard rotation; give it
    // a second B1 filler instead of a B2 so the team can still full-burst.
    const needsSecondB1 =
      b1CdSec !== undefined && b1CdSec > B1_SOLO_CD_THRESHOLD;
    slugs = partner
      ? [slug, partner, c1.slug, c2.slug]
      : [slug, needsSecondB1 ? NOOP_B1 : NOOP_B2, c1.slug, c2.slug];
    noopSlot = NOOP_B1;
  } else if (burst === 'II') {
    slugs = partner
      ? [NOOP_B1, slug, partner, c1.slug, c2.slug]
      : [NOOP_B1, slug, c1.slug, c2.slug];
    noopSlot = NOOP_B2;
  } else {
    // B3 (or Λ): tested rightmost so the carries always win the stage-3 cast.
    slugs = partner
      ? [NOOP_B1, NOOP_B2, slug, partner, c1.slug, c2.slug]
      : [NOOP_B1, NOOP_B2, c1.slug, c2.slug, slug];
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
  valuePct: number; // total % team damage increase vs the no-op baseline (CAN BE NEGATIVE)
  carryDps: number; // Σ carry DPS with the buffer (internal context, not emitted)
  baselineDps: number; // Σ carry DPS with the no-op baseline (internal context, not emitted)
  testedBurstCasts: number; // pin: a tested B3 must be 0 (rightmost rule)
  profile: string | null; // comp profile id (with-healer/with-shielder/duo); null = plain
  rules: string[]; // typed-board adaptation audit trail ([] on generic)
  rank: number;
}

// One value run. Returns Σ carry DPS for the comp plus the tested slot's cast
// count; the baseline swaps the tested unit for its stage-matched no-op (same
// carries). When `profile` is set, every no-op filler also carries the
// profile's synthetic kit (the with-healer/with-shielder gate opener).
// `characterOverrides` lets per-profile runs temporarily mutate a real unit's
// override without editing the source file (e.g. Blanc's same-squad CDR is
// suppressed in her plain row so the w/ Rouge profile can show the difference).
function carryDpsSum(
  team: AssembledBufferTeam,
  ctx: RanksCtx,
  spec: CarrySpec,
  pierceOverride: boolean,
  testedSlug?: string,
  profile?: string | null,
  unitOptsMap: Record<string, UnitOptions> = {},
  characterOverrides: Record<string, any> = {}
): { sum: number; testedBurstCasts: number } {
  const chars = team.slugs.map((s) => charFor(ctx, s, team.chars as any));
  const element = (chars[team.carryIdxs[0]] as CharacterData)
    .element as Element;
  const defaultOpts: UnitOptions = { ol: 'base5' as const, stars: 3, core: 7 };
  const unitOpts: UnitOptions[] = team.slugs.map((s) => {
    if ((NOOP_CHARACTERS as any)[s]) {
      return {};
    }
    const extra = unitOptsMap[s];
    return extra ? { ...defaultOpts, ...extra } : defaultOpts;
  });
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
  const compProfile = profile ? COMP_PROFILES[profile] : undefined;
  const extraOverrides: Record<string, any> = {};
  if (pierceOverride) {
    for (const i of team.carryIdxs) {
      extraOverrides[team.slugs[i]] = {
        slug: team.slugs[i],
        hasPierce: true,
        skill1: [],
        skill2: [],
        burst: [],
      };
    }
  }
  if (compProfile) {
    for (const s of team.slugs) {
      if (!(NOOP_CHARACTERS as any)[s]) {
        continue;
      } // no-op fillers only
      extraOverrides[s] = {
        slug: s,
        skill1: compProfile.noopSkill1,
        skill2: [],
        burst: [],
      };
    }
  }
  for (const [s, ovr] of Object.entries(characterOverrides)) {
    extraOverrides[s] = {
      ...(extraOverrides[s] ?? ctx.deps.overrides[s] ?? {}),
      ...ovr,
      slug: s,
    };
  }
  const deps = Object.keys(extraOverrides).length
    ? { ...ctx.deps, overrides: { ...ctx.deps.overrides, ...extraOverrides } }
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
// spec, profile) — every buffer of the same burst stage + adaptation shares one.
// `profile` forces a comp-profile variant (null = plain); when omitted the
// unit's own BUFFER_COMP_PROFILES entry is used (rankBuffers passes both).
export function bufferValueFor(
  slug: string,
  board: BufferBoard,
  ctx: RanksCtx,
  baselineMemo: Map<string, number> = new Map(),
  profile?: string | null
): Omit<BufferValue, 'rank'> {
  const char = ctx.characters[slug];
  if (!char) {
    throw new Error(`${slug}: not in characters.json`);
  }
  const burst = char.burst === 'Λ' ? 'III' : char.burst;
  const activeProfile =
    profile === undefined ? (BUFFER_COMP_PROFILES[slug] ?? null) : profile;
  const { spec, rules } =
    board === 'typed'
      ? deriveCarrySpec(ctx.deps.overrides[slug])
      : { spec: { ...PLAIN_SPEC }, rules: [] };
  const duoProfile =
    activeProfile && DUO_BUFFER_PROFILES[slug]?.id === activeProfile
      ? DUO_BUFFER_PROFILES[slug]
      : undefined;

  const b1CdSec =
    burst === 'I' ? effectiveBurstCooldownSec(ctx, slug) : undefined;
  const team = assemble(slug, burst, board, spec, duoProfile?.partner, b1CdSec);
  const baselineTeam = assemble(
    team.noopSlot,
    burst,
    board,
    spec,
    duoProfile?.partner,
    b1CdSec
  );
  const b1Filler =
    burst === 'I' && b1CdSec !== undefined && b1CdSec > B1_SOLO_CD_THRESHOLD
      ? 'b1'
      : 'b2';
  const baselineKey = duoProfile
    ? `${burst}|${spec.weapon ?? 'plain'}|${spec.pierce}|${spec.element ?? 'Iron'}|${activeProfile}|partner=${duoProfile.partner}|partnerMode=solo|b1filler=${b1Filler}`
    : `${burst}|${spec.weapon ?? 'plain'}|${spec.pierce}|${spec.element ?? 'Iron'}|${activeProfile ?? 'plain'}|b1filler=${b1Filler}`;

  // Blanc's same-squad CDR is composition-gated (teamHas.sameSquad). Her plain
  // row has no squadmate, so the CDR block would be inert; suppress it entirely
  // for the plain row so the profiled row (w/ synthetic Rouge squadmate) shows a
  // clean rotation delta.
  function blancNoCdrOverride(ctx: RanksCtx): any {
    const ovr = ctx.deps.overrides.blanc ?? {};
    return {
      ...ovr,
      skill2: (ovr.skill2 ?? []).filter(
        (b: any) => !b.effects?.some((e: any) => e.kind === 'burstCdr')
      ),
      slug: 'blanc',
    };
  }
  const characterOverrides: Record<string, any> = {};
  if (slug === 'blanc' && activeProfile === null) {
    characterOverrides.blanc = blancNoCdrOverride(ctx);
  }

  let baseline = baselineMemo.get(baselineKey);
  if (baseline === undefined) {
    const baselineOpts: Record<string, UnitOptions> = {};
    if (duoProfile) {
      baselineOpts[duoProfile.partner] = {
        mode: duoProfile.partnerMode ?? 'solo',
      };
    }
    baseline = carryDpsSum(
      baselineTeam,
      ctx,
      spec,
      board === 'typed' && spec.pierce,
      undefined,
      activeProfile,
      baselineOpts,
      characterOverrides
    ).sum;
    baselineMemo.set(baselineKey, baseline);
  }
  const testedOpts: Record<string, UnitOptions> = {};
  if (duoProfile) {
    testedOpts[slug] = { mode: duoProfile.mode ?? 'solo' };
    testedOpts[duoProfile.partner] = { mode: duoProfile.partnerMode ?? 'solo' };
  }
  const run = carryDpsSum(
    team,
    ctx,
    spec,
    board === 'typed' && spec.pierce,
    slug,
    activeProfile,
    testedOpts,
    characterOverrides
  );
  return {
    slug,
    valuePct: baseline > 0 ? ((run.sum - baseline) / baseline) * 100 : 0,
    carryDps: run.sum,
    baselineDps: baseline,
    testedBurstCasts: run.testedBurstCasts,
    profile: activeProfile,
    rules,
  };
}

// Rank a population on one board. Units with a comp profile appear TWICE —
// plain (profile: null) and profiled — so the two standings compare at a
// glance (owner ruling 2026-07-26).
export function rankBuffers(
  population: string[],
  board: BufferBoard,
  ctx: RanksCtx
): BufferValue[] {
  const memo = new Map<string, number>();
  const results = population.flatMap((slug) => {
    const rows = [bufferValueFor(slug, board, ctx, memo, null)];
    if (BUFFER_COMP_PROFILES[slug]) {
      rows.push(
        bufferValueFor(slug, board, ctx, memo, BUFFER_COMP_PROFILES[slug])
      );
    }
    const duo = DUO_BUFFER_PROFILES[slug];
    if (duo) {
      rows.push(bufferValueFor(slug, board, ctx, memo, duo.id));
    }
    return rows;
  });
  results.sort((a, b) => b.valuePct - a.valuePct);
  return results.map((r, i) => ({ ...r, rank: i + 1 }));
}
