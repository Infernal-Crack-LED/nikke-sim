// Buffer ranking board — how much damage a support unit ADDS to two standard
// carries, ranked. Owner methodology (2026-07-26):
//
//   Comp: the STANDARD TEAM (see assemble) — no-op B1 + two no-op B2 + the two
//   standard damage-dealing carries (src/ranks/synthetics.ts) — with the tested
//   buffer in place of the second no-op B2, at scope lock, both carries
//   elementally advantaged.
//     tested B1 → [tested, no-op B1, no-op B2, carry, carry]
//     tested B2 → [no-op B1, tested, no-op B2, carry, carry]
//     tested B3 → [no-op B1, no-op B2, carry, carry, tested-rightmost]
//   The baseline is the same team with a no-op of the tested unit's OWN stage
//   in its place, so both sides field the same stage distribution.
//   A tested B3's BURST IS SUPPRESSED outright (`burstOffSlug`); rightmost
//   placement only orders the stage-3 cast and does not on its own keep the
//   tested unit from taking one.
//   A tested B3's value must come through passives and cast-free lines.
//   Value = % team damage increase = (Σ carry DPS with the buffer − Σ carry
//   DPS with the stage-matched baseline) / Σ carry DPS with that baseline.
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
//               Pierce; trueDamagePct on allies → both carries' normal attacks
//               become True-flavored (hasTrueNormals); sustainedDamagePct /
//               distributedDamagePct on allies → each carry gets a synthetic
//               MOCK_TICK rider (a small periodic hit tagged that flavor — see
//               FLAVOR MOCK below, neither flavor is otherwise producible by a
//               kit-less carry); projectileExplosionPct on allies → both
//               carries RL; alliesOfElement E → both carries element E.
//               Manual BUFFER_PROFILES patches what the derivation can't see.
//
// Reading: generic = the buffer's plug-and-play value; typed = its value when
// the team is built around it. Known caveat (same as the DPS chart): purely
// defensive/sustain kits read ~0 — the boss deals no damage at scope lock.
import type { CharacterData, Element, SimConfig, Weapon } from '../types.js';
import { prepareTeam, type UnitOptions } from '../prepare.js';
import { runSim } from '../engine/sim.js';
import type { RanksCtx } from './burstgen.js';
import { OFF_BOARD_BUFFER_SLUGS } from './buffer-rows.js';
import {
  CARRY_MG,
  CARRY_RL,
  carryWithWeapon,
  MODAL_WEAPON,
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

// ---- typed-board carry adaptation -------------------------------------------

export interface CarrySpec {
  weapon: Weapon | null; // both carries become this weapon (null = keep MG+RL)
  pierce: boolean; // both carries gain Pierce
  element: Element | null; // both carries become this element (null = Iron)
  trueFlavor: boolean; // both carries' normal attacks become True-flavored (hasTrueNormals)
  sustained: boolean; // each carry gets a synthetic MOCK_TICK sustained-flavored rider
  distributed: boolean; // each carry gets a synthetic MOCK_TICK distributed-flavored rider
}
const PLAIN_SPEC: CarrySpec = {
  weapon: null,
  pierce: false,
  element: null,
  trueFlavor: false,
  sustained: false,
  distributed: false,
};

// Manual patches for what the override scan can't see (applied over the derived
// spec). Keep each entry justified by a kit line.
export const BUFFER_PROFILES: Record<string, Partial<CarrySpec>> = {};

// ---- FLAVOR MOCK (sustained / distributed, typed board only) ---------------
// Sustained (dot) and distributed (flatDamage) damage are only ever produced by
// a skill/burst kit line targeting the ENEMY (docs/data/damage-calculation.md
// §1e/§1g) — every real user of either flavor casts it themselves (dot for
// sustained, flatDamage for distributed; verified across the whole roster,
// 2026-08-03 typed-board flavor audit). The synthetic carries have empty
// skill1/skill2/burst (pure weapon fire), so they can NEVER generate a
// sustained- or distributed-flavored instance on their own — an ally-facing
// Sustained/Distributed Damage ▲ buff (crust, rosanna-chic-ocean,
// delta-ninja-thief, elegg, mast-romantic-maid) read exactly 0 on BOTH boards,
// the same silently-inert shape True Damage had before hasTrueNormals.
// OWNER-CHOSEN MOCK (Option 3 of the 2026-08-03 audit, POLICY not measurement):
// each carry takes one instant hit every MOCK_TICK_INTERVAL_SEC, tagged the
// needed flavor, sized at MOCK_TICK_ATK_MULT × that carry's OWN weapon's modal
// per-shot multiplier (MODAL_WEAPON) so it scales sensibly across a typed-board
// weapon swap. Fixed-interval (not burstCast-triggered) so the registered total
// is independent of the team's Full Burst count/rotation — deterministic and
// reproducible the way every other typed-board rule is. The interval/mult pair
// is picked to be a MINORITY of the carry's own DPS (empirically <15% at
// scope-lock, checked via `--explain <slug> --typed`) — just enough surface for
// the flavor gate to multiply, not a claim about what a "generic carry" should
// deal. Modeled as `flatDamage` (not `dot`) for both flavors: the engine's
// flavor gate reads identically off either kind (sim.ts's flatDamage case sets
// `sustained: e.flavor === 'sustained'` the same as the dot case), and a single
// instant hit avoids a dot's own intervalSec/durationSec bookkeeping for what
// is a mock, not a modeled kit line.
const MOCK_TICK_INTERVAL_SEC = 10;
const MOCK_TICK_ATK_MULT = 5;
function flavorMockBlock(
  weapon: Weapon,
  flavor: 'sustained' | 'distributed'
): object {
  return {
    slot: 'skill1',
    trigger: { kind: 'interval', sec: MOCK_TICK_INTERVAL_SEC },
    target: { kind: 'enemy' },
    effects: [
      {
        kind: 'flatDamage',
        atkPct:
          MOCK_TICK_ATK_MULT * MODAL_WEAPON[weapon].normalAttackMultiplier,
        flavor,
      },
    ],
  };
}

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
    // NOOP_ROUGE_B1's squad membership (satisfying the sameSquad gate) is registered in
    // src/data/squads.ts, not here — see that file's comment for why it lives there
    // (DECISIONS.md 2026-08-03 `noop-rouge-b1` ruling).
    partner: NOOP_ROUGE_B1,
    id: 'w/ Rouge',
    note: 'synthetic Rouge squadmate keeps the same-squad CDR gate active',
    synthetic: true,
  },
};

// Slugs kept out of the buffer population entirely. The criterion is a kit whose
// net effect in the standard comp is to REDUCE team damage: the board would
// report a misleadingly negative % increase that says nothing about the unit's
// support value. NO UNIT CURRENTLY MEETS IT — the set is empty, and the hook is
// kept because the criterion can be met again whenever the comp shape moves.
// `npx tsx scripts/probe/buffer-rotation-audit.ts --excluded` checks each entry's
// live value against the criterion.
export const EXCLUDED_BUFFER_SLUGS = new Set<string>();

// The board's population — THE definition, shared by the builder
// (scripts/build-bufferchart.ts) and the rotation audit
// (scripts/probe/buffer-rotation-audit.ts) so the audit cannot describe a
// different board than the one that ships.
//
// A unit is in when it is sim-supported, is a Burst-1/Burst-2 or a Burst-3 the
// archetype tags call a buffer, and is neither EXCLUDED (negative-value kits)
// nor OFF-BOARD (kept off by name, owner direction). Both exclusions bite HERE,
// before any value is computed: a unit that is not in the population has no row
// in the artifact, so nothing downstream can rank over it, count it, or draw it
// as a neighbour. `--explain <slug>` still reports on an excluded unit — it
// takes any sim-supported slug and computes the value directly.
export function bufferPopulation(
  characters: Record<string, { simSupported?: boolean; burst?: string }>,
  tags: Record<string, string[]>
): string[] {
  const population: string[] = [];
  for (const [slug, c] of Object.entries(characters)) {
    if (EXCLUDED_BUFFER_SLUGS.has(slug) || OFF_BOARD_BUFFER_SLUGS.has(slug)) {
      continue;
    }
    if (!c.simSupported) {
      continue;
    }
    if (c.burst === 'I' || c.burst === 'II') {
      population.push(slug);
    } else if (c.burst === 'III' && (tags[slug] ?? []).includes('buffer')) {
      population.push(slug);
    }
  }
  return population.sort();
}

// Does this unit supply the TEAM's burst-cooldown reduction?
//
// The board fields exactly one CDR source per team, the way an optimal team
// does (owner ruling 2026-08-03): the tested unit if it is an enabler, the
// no-op B1 otherwise. This is what decides which.
//
// KNOWN GAP, no carrier today (owner-deferred 2026-08-03): this walk does not
// check `block.mode` (types.ts's per-block mode gate, sim.ts:750's
// `!b.mode || b.mode === selectedMode`) the way it already checks `formation`
// and `teamHas` below. A unit whose only ally-facing burstCdr lives behind a
// non-default mode would still count as an enabler here even when that mode
// is not the one running, standing the no-op B1 control down for nothing.
// Harden if a mode-gated ally-facing burstCdr kit ever ships.
//
// Ally-facing only. Self-only reduction does not make a unit the team's
// enabler — the same line the burst-CDR board already draws ("self-only
// cooldown reduction is a note column, never part of the ranked value"), and
// the reason prika, tia and red-hood do not count despite carrying `burstCdr`.
// The scan must reach ARBITRARY nesting: the four ladder enablers (liter,
// volume, dolla, helm-aquamarine) bury theirs inside an `escalating` effect's
// `steps`, so a shallow "block.effects has a burstCdr" check silently misses
// the board's most important CDR unit.
//
// `burstSuppressed` drops the WHOLE burst slot, matching what burstOffSlug
// actually wipes (`{...own, burst: []}`). Dropping only burstCast-triggered
// blocks would disagree with it: a burst-slot block on some other trigger would
// still count the unit as the team's enabler while the wipe had already removed
// its CDR, leaving a team with no enabler at all. No unit relies on that path
// today — every B3 buffer's burst slot is burstCast-triggered or empty, and no
// burstCdr carrier is a B3 — but the two must not drift apart.
export function suppliesTeamCdr(
  override: unknown,
  burstSuppressed = false
): boolean {
  let found = false;
  const hasCdr = (node: unknown): boolean => {
    if (Array.isArray(node)) {
      return node.some(hasCdr);
    }
    if (!node || typeof node !== 'object') {
      return false;
    }
    if ((node as { kind?: string }).kind === 'burstCdr') {
      return true;
    }
    return Object.values(node as Record<string, unknown>).some(hasCdr);
  };
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      return node.forEach(visit);
    }
    if (!node || typeof node !== 'object') {
      return;
    }
    const block = node as {
      slot?: string;
      trigger?: any;
      target?: any;
      formation?: string;
      teamHas?: unknown;
      effects?: unknown[];
    };
    if (
      block.target &&
      // ally-facing only: `!== 'self'` would also admit an enemy-targeted
      // burstCdr, which would make a unit the team's enabler without ever
      // reducing an ally's cooldown. None exists today.
      String(block.target.kind).startsWith('allies') &&
      Array.isArray(block.effects) &&
      !(burstSuppressed && block.slot === 'burst') &&
      // The standard team ALWAYS seats a B1 (the no-op B1 on every row, plus
      // the tested unit on B1 rows), and the engine activates a formation-gated
      // block only when `(formation === 'hasB1') === teamHasB1`
      // (src/engine/sim.ts:737). A `noB1` block is therefore permanently inert
      // here and cannot make anyone the team's enabler — anis-star and
      // rapi-red-hood carry their ONLY ally-facing burstCdr behind exactly that
      // gate, so counting it stood the control down and left those two teams
      // with no enabler at all.
      (!block.formation || block.formation === 'hasB1') &&
      // `teamHas` is the third static gate the engine applies in that same
      // filter (sim.ts:740), and this treats EVERY teamHas-gated block as
      // inert. That is exact for the `slugs` and `sameSquad` facets — the
      // synthetic no-ops and carries carry no curated squad, and the gate fails
      // closed — but deliberately approximate for the structural ones: the two
      // carries are B3 / Attacker / MG+RL at a fixed element, so a future
      // `teamHas: {burst: 'III'}` (or class/weapon/element) gate WOULD in fact
      // fire here, and treating it as inert leaves the control standing beside
      // a unit whose CDR really does apply — two enablers rather than one.
      // Chosen anyway because the opposite error is worse: counting a gate that
      // does NOT fire leaves the team with NO enabler, which is exactly what
      // the noB1 gate did. Revisit when a structural teamHas first appears on
      // an ally-facing burstCdr; none exists today (the only teamHas +
      // burstCdr block is blanc's, self-targeted).
      !block.teamHas &&
      hasCdr(block.effects)
    ) {
      found = true;
    }
    Object.values(node as Record<string, unknown>).forEach(visit);
  };
  visit(override);
  return found;
}

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
          e.stat === 'trueDamagePct' &&
          !spec.trueFlavor
        ) {
          spec.trueFlavor = true;
          rules.push(
            'trueDamagePct on allies → carries deal True-flavored normal attacks'
          );
        }
        if (
          e?.kind === 'buff' &&
          e.stat === 'sustainedDamagePct' &&
          !spec.sustained
        ) {
          spec.sustained = true;
          rules.push(
            'sustainedDamagePct on allies → carries gain a synthetic sustained-flavored MOCK_TICK rider'
          );
        }
        if (
          e?.kind === 'buff' &&
          e.stat === 'distributedDamagePct' &&
          !spec.distributed
        ) {
          spec.distributed = true;
          rules.push(
            'distributedDamagePct on allies → carries gain a synthetic distributed-flavored MOCK_TICK rider'
          );
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
  focusSlot: number; // the spare stage slot — camera focus, see carryDpsSum
  burstOffSlug: string | null; // a tested B3: its burst is turned off outright
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

// The STANDARD TEAM (owner spec 2026-08-03), five slots:
//
//   1  no-op B1 (AR, 20s, 7s team CDR)   2  no-op B2 (SR, 20s)
//   3  no-op B2 (SR, 20s)  ← the unit under test replaces THIS slot
//   4  carry (B3, 40s, MG)               5  carry (B3, 40s, RL)
//
// Slot 3's spare is the whole point: every burst stage stays covered by a 20s
// no-op, so a tested unit with a 40s or 60s cooldown no longer holds up the
// chain and no longer pays for Full Bursts the baseline gets and it does not.
// Both carries are B3/40s and alternate, which covers stage 3 on the same 20s
// cadence.
//
// One WRINKLE the slot numbering does not capture: burst-stage contests are
// won by slot ORDER, so a tested unit left sitting behind the no-op of its own
// stage would simply stop bursting (measured: a tested B2 placed after the
// no-op B2 casts 1 burst in 180s instead of 5; a tested B1 behind the no-op B1
// casts none at all). The tested unit therefore leads its own stage and the
// spare no-op falls in behind it — same five units, same spare coverage. This
// is the rule src/ranks/b1b2dps.ts already relies on for its partner rows.
export function assemble(
  slug: string | null, // null = the baseline: a stage-matched no-op in its place
  burst: string,
  board: BufferBoard,
  spec: CarrySpec,
  partner?: string
): AssembledBufferTeam {
  const [c1, c2] = carriesFor(board, spec);
  // slot 3 holds the partner on a duo row, else the spare no-op B2
  const spare = partner ?? NOOP_B2;
  // The baseline swaps the tested unit for a no-op of ITS OWN stage, so both
  // teams field the same stage distribution and can reach the same number of
  // Full Bursts. Standing the tested unit against the plain standard team
  // instead would charge every B1 for trading a no-op B2 away: measured, that
  // is up to -2 Full Bursts and -34 points (anis-star), which is the same
  // rotation distortion this whole change exists to remove, aimed elsewhere.
  const tested =
    slug ?? (burst === 'I' ? NOOP_B1 : burst === 'II' ? NOOP_B2 : NOOP_B3);
  let slugs: string[];
  if (burst === 'I') {
    slugs = [tested, NOOP_B1, spare, c1.slug, c2.slug];
  } else if (burst === 'II') {
    slugs = [NOOP_B1, tested, spare, c1.slug, c2.slug];
  } else {
    // B3 (or Λ): rightmost, so the carries always win the stage-3 cast and the
    // tested unit never bursts — its own damage must not enter a SUPPORT rank.
    slugs = [NOOP_B1, spare, c1.slug, c2.slug, tested];
  }
  return {
    slugs,
    chars: [c1, c2] as any,
    carryIdxs: [slugs.indexOf(c1.slug), slugs.lastIndexOf(c2.slug)],
    focusSlot: slugs.indexOf(spare),
    // A tested B3's burst is turned OFF, so its own damage cannot enter a
    // SUPPORT rank and its value has to come through passives and cast-free
    // lines. Sitting it rightmost only makes that LIKELY — the carries win the
    // stage-3 cast while both are off cooldown, but they are 40s units, and a
    // fast enough rotation reaches a stage 3 where only the tested unit is
    // ready. That is exactly what happened when camera focus moved to the SR
    // no-op and the team sped up: ada took a cast. Suppressing the burst slot
    // outright makes the documented rule true by construction instead of by
    // rotation luck. Byte-identical for the 16 B3 buffers that never cast one.
    burstOffSlug:
      slug !== null && burst !== 'I' && burst !== 'II' ? slug : null,
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
  testedBurstCasts: number; // a tested B3's burst EFFECTS are suppressed (burstOffSlug); this counts rotation turns, which it can still take
  fullBursts: number; // the team's Full Bursts over the fight
  baselineFullBursts: number; // ...and its baseline's. They legitimately differ (gauge, own CDR, a weaker enabler); the guarantee is only that neither depends on the tested unit's own cooldown
  profile: string | null; // comp profile id (with-healer/with-shielder/duo); null = plain
  rules: string[]; // typed-board adaptation audit trail ([] on generic)
  rank: number;
}

// One value run. Returns Σ carry DPS for the comp plus the tested slot's cast
// count; the baseline swaps the tested unit for its stage-matched no-op (same
// carries). When `profile` is set, every no-op filler also carries the
// profile's synthetic kit (the with-healer/with-shielder gate opener).
function carryDpsSum(
  team: AssembledBufferTeam,
  ctx: RanksCtx,
  spec: CarrySpec,
  pierceOverride: boolean,
  trueFlavorOverride: boolean,
  sustainedOverride: boolean,
  distributedOverride: boolean,
  testedSlug?: string,
  profile?: string | null,
  unitOptsMap: Record<string, UnitOptions> = {},
  // The team fields exactly ONE burst-cooldown enabler. When the tested unit
  // (or its duo partner) is that enabler, the no-op B1 stands down.
  disableNoopCdr = false
): { sum: number; testedBurstCasts: number; fullBursts: number } {
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
    // Camera focus sits on the SPARE stage slot — the no-op B2 (SR) on every
    // plain row. Focus is what grants a charge weapon x2.5 burst gauge, so
    // whoever holds it sets the pace of the whole team's rotation, and pinning
    // it to a fixed inert SR standardizes burst generation across every run.
    // It used to sit on the second carry, whose weapon the TYPED board rewrites
    // per tested unit: an RL carry banks the x2.5 (140 + 250 full charge) while
    // an SG carry cannot take it at all (200, no full-charge bonus), so the
    // team's gauge — and its Full Burst count — moved with the kit under test.
    // On a duo row the partner occupies this slot and holds focus instead;
    // that is symmetric, since the duo baseline seats the partner there too.
    focusSlug: team.slugs[team.focusSlot],
  };
  const compProfile = profile ? COMP_PROFILES[profile] : undefined;
  const extraOverrides: Record<string, any> = {};
  if (disableNoopCdr) {
    extraOverrides[NOOP_B1] = {
      slug: NOOP_B1,
      skill1: [],
      skill2: [],
      burst: [],
    };
  }
  if (team.burstOffSlug) {
    const own = ctx.deps.overrides[team.burstOffSlug];
    extraOverrides[team.burstOffSlug] = { ...(own ?? {}), burst: [] };
  }
  if (
    pierceOverride ||
    trueFlavorOverride ||
    sustainedOverride ||
    distributedOverride
  ) {
    team.carryIdxs.forEach((slugIdx) => {
      // Read the weapon off the slug itself (syntheticFor), not team.chars[ci] —
      // chars is carries-only ([c1, c2]) and happens to sit in the same order as
      // carryIdxs today, but nothing enforces that pairing; a future reorder or a
      // chars shape that goes slugs-parallel would silently size the MOCK_TICK
      // off the wrong carry's weapon (kimi-code/k3 cross-family review, 2026-08-03).
      const weapon = syntheticFor(team.slugs[slugIdx])!.weapon;
      const skill1: object[] = [];
      if (sustainedOverride) {
        skill1.push(flavorMockBlock(weapon, 'sustained'));
      }
      if (distributedOverride) {
        skill1.push(flavorMockBlock(weapon, 'distributed'));
      }
      extraOverrides[team.slugs[slugIdx]] = {
        slug: team.slugs[slugIdx],
        hasPierce: pierceOverride,
        hasTrueNormals: trueFlavorOverride,
        skill1,
        skill2: [],
        burst: [],
      };
    });
  }
  if (compProfile) {
    // DEDUPED: a stage-matched baseline seats the same no-op slug twice
    // ([B1, B2, B2, ...] for a tested B2; [B1, B1, B2, ...] for a tested B1),
    // so iterating team.slugs merged the profile kit in TWICE on the baseline
    // side and once on the tested side. Inert today — the profiles inject heals
    // and shields, which touch no carry damage — but asymmetric, and it would
    // double-apply silently the day a profile carries a damage-relevant line.
    for (const s of new Set(team.slugs)) {
      if (!(NOOP_CHARACTERS as any)[s]) {
        continue;
      } // no-op fillers only
      // MERGE, never replace. The fillers' own overrides carry the framework
      // effects — the B1 control's team CDR, the B3 control's mock burst — and
      // replacing them wholesale stripped the team's only cooldown enabler on
      // every profiled row: crown `with-healer` ran 9 Full Bursts beside its
      // own plain row at 10, contradicting the one-enabler rule this board is
      // documented on. Start from whatever extraOverrides already holds for
      // this filler so the disableNoopCdr write above survives too.
      // All three slots stay present: a filler with no override file at all
      // (noop-b2-sr) would otherwise fail the every-slot-defined contract.
      const own = extraOverrides[s] ?? ctx.deps.overrides[s];
      extraOverrides[s] = {
        ...(own ?? {}),
        slug: s,
        skill1: [...(own?.skill1 ?? []), ...compProfile.noopSkill1],
        skill2: own?.skill2 ?? [],
        burst: own?.burst ?? [],
      };
    }
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
  return { sum, testedBurstCasts, fullBursts: r.fullBursts };
}

// Value of one buffer on one board. Baselines are memoized per (burst, board,
// spec, profile) — every buffer of the same burst stage + adaptation shares one.
// `profile` forces a comp-profile variant (null = plain); when omitted the
// unit's own BUFFER_COMP_PROFILES entry is used (rankBuffers passes both).
interface BaselineRun {
  sum: number;
  fullBursts: number;
}

export function bufferValueFor(
  slug: string,
  board: BufferBoard,
  ctx: RanksCtx,
  baselineMemo: Map<string, BaselineRun> = new Map(),
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

  // Exactly one burst-cooldown enabler per team (owner ruling 2026-08-03).
  // The tested unit takes that role when it can; otherwise the no-op B1 keeps
  // it. The BASELINE always keeps the no-op's — the tested unit is not in it,
  // so standing the control down there would field a team with no enabler at
  // all and measure every CDR unit against a rotation nobody would run.
  const team = assemble(slug, burst, board, spec, duoProfile?.partner);
  const baselineTeam = assemble(null, burst, board, spec, duoProfile?.partner);
  // sustained/distributed MUST be in the key (unlike pierce/trueFlavor, which are
  // pure flavor TAGS with no damage of their own): the MOCK_TICK rider they
  // inject is a real flatDamage instance that fires whether or not any buff
  // ever multiplies it, so it changes the baseline's raw DPS by itself — two
  // units sharing every other key component but differing here would
  // otherwise read each other's wrong (mock-rider-sized) baseline.
  const baselineKey = duoProfile
    ? `${burst}|${spec.weapon ?? 'plain'}|${spec.pierce}|${spec.element ?? 'Iron'}|${spec.sustained}|${spec.distributed}|${activeProfile}|partner=${duoProfile.partner}|partnerMode=${duoProfile.partnerMode ?? 'solo'}`
    : `${burst}|${spec.weapon ?? 'plain'}|${spec.pierce}|${spec.element ?? 'Iron'}|${spec.sustained}|${spec.distributed}|${activeProfile ?? 'plain'}`;
  let baseline = baselineMemo.get(baselineKey);
  if (baseline === undefined) {
    const baselineOpts: Record<string, UnitOptions> = {};
    if (duoProfile) {
      baselineOpts[duoProfile.partner] = {
        mode: duoProfile.partnerMode ?? 'solo',
      };
    }
    const b = carryDpsSum(
      baselineTeam,
      ctx,
      spec,
      board === 'typed' && spec.pierce,
      board === 'typed' && spec.trueFlavor,
      board === 'typed' && spec.sustained,
      board === 'typed' && spec.distributed,
      undefined,
      activeProfile,
      baselineOpts,
      duoProfile
        ? suppliesTeamCdr(ctx.deps.overrides[duoProfile.partner])
        : false
    );
    baseline = { sum: b.sum, fullBursts: b.fullBursts };
    baselineMemo.set(baselineKey, baseline);
  }
  const testedOpts: Record<string, UnitOptions> = {};
  if (duoProfile) {
    testedOpts[slug] = { mode: duoProfile.mode ?? 'solo' };
    testedOpts[duoProfile.partner] = { mode: duoProfile.partnerMode ?? 'solo' };
  }
  // A duo partner sits in BOTH teams, so an enabler partner stands the control
  // down on both sides; a tested enabler only does so on its own side.
  const partnerIsEnabler = duoProfile
    ? suppliesTeamCdr(ctx.deps.overrides[duoProfile.partner])
    : false;
  const testedIsEnabler = suppliesTeamCdr(
    ctx.deps.overrides[slug],
    team.burstOffSlug === slug
  );
  const run = carryDpsSum(
    team,
    ctx,
    spec,
    board === 'typed' && spec.pierce,
    board === 'typed' && spec.trueFlavor,
    board === 'typed' && spec.sustained,
    board === 'typed' && spec.distributed,
    slug,
    activeProfile,
    testedOpts,
    testedIsEnabler || partnerIsEnabler
  );
  return {
    slug,
    valuePct:
      baseline.sum > 0 ? ((run.sum - baseline.sum) / baseline.sum) * 100 : 0,
    carryDps: run.sum,
    baselineDps: baseline.sum,
    testedBurstCasts: run.testedBurstCasts,
    fullBursts: run.fullBursts,
    baselineFullBursts: baseline.fullBursts,
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
  const memo = new Map<string, BaselineRun>();
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
