// B1/B2 DPS ranking board — raw damage dealt by Burst-1 and Burst-2 units in a
// Solo-style isolation framework. Modeled after the B3 DPS chart's Solo control
// (src/dpschart/matrix.ts): the tested unit is surrounded by synthetic no-op
// units that deal zero damage and provide only the baseline rotation support a
// real team would need.
//
// Control teams (the tested unit is inserted at the leftmost slot of its stage;
// profile rows with a partner put the partner in that leftmost slot and the tested
// unit immediately after):
//   B1 20s: [tested, B2 SR, B2 SR, B3 RL, B3 MG]
//   B1 40s: [tested, B1 AR, B2 SR, B3 RL, B3 MG]  (second B1 covers off-rotations)
//   B2:     [B1 AR, tested, B2 SR, B3 RL, B3 MG]  (a second B2 is always present)
//   Partner rows: B1 40s [partner, tested, B2 SR, B3 RL, B3 MG];
//                 B2     [B1 AR, partner, tested, B3 RL, B3 MG]
//
// The no-op B1 (AR) in the 40s-B1 and B2 templates contributes the standard 7 s
// team burst-cooldown reduction via its override (noop-b1-ar.json); 20s-B1 rows
// have no second B1, so they rely on the tested B1's own CDR.
//
// Cells: core 0 / core 100 × neutral / elemental advantage. Investment is fixed
// to scope lock (Base-5, 3★/core 7, no cube/doll).
//
// Forced rows: Red Hood is a Λ unit, so she is pinned to B1 and B2 via
// lambdaStage. Rapi: Red Hood is normally B3, so she is forced to B1 via
// forceStage. Note: lambdaStage and forceStage behave identically for
// rotation eligibility, but differ for burst-stage-targeted buffs in the
// current engine — a Λ unit pinned via lambdaStage is only treated as a B3
// target (legacy behavior), while forceStage is honored at any stage. The
// no-op teammates here carry no stage-targeted buffs, so this asymmetry does
// not affect these rankings.
//
// Profiles: a few units are ranked twice — their plain Solo row plus a row with
// a canonical partner in the matching stage slot — mirroring the buffer board's
// DUO_BUFFER_PROFILES pattern.
import type { Element, SimConfig } from '../types.js';
import { BEATS } from '../elements.js';
import { prepareTeam, type UnitOptions } from '../prepare.js';
import { runSim } from '../engine/sim.js';
import {
  NOOP_B1,
  NOOP_B2,
  NOOP_B3,
  NOOP_B3_RL,
  NOOP_CHARACTERS,
  type NoopCharacter,
} from '../dpschart/noop.js';
import type { RanksCtx } from './burstgen.js';

// Base no-op team templates (4-slug arrays; the tested unit is inserted at its
// stage's leftmost slot).
const B1_20S_TEAM = [NOOP_B2, NOOP_B2, NOOP_B3_RL, NOOP_B3];
const B1_40S_TEAM = [NOOP_B1, NOOP_B2, NOOP_B3_RL, NOOP_B3];
const B2_TEAM = [NOOP_B1, NOOP_B2, NOOP_B3_RL, NOOP_B3];

export interface B1B2DpsProfile {
  id: string;
  partner: string; // slug inserted in the partner stage slot
  note: string;
}

// Partner profiles keyed by profile id. `dpsFor` looks up the partner for a row
// by its `profile` value, so each id must be unique and self-contained.
export const B1B2_DPS_PROFILES: Record<string, B1B2DpsProfile> = {
  'with-avistar': {
    id: 'with-avistar',
    partner: 'avistar',
    note: 'with Avistar as a MG B1 partner — models Anis: Star alongside a magazine-fed B1',
  },
  'with-other-b1': {
    id: 'with-other-b1',
    partner: NOOP_B1,
    note: 'with a generic other B1 — models Anis: Star alongside a standard AR B1 partner',
  },
  'with-chime': {
    id: 'with-chime',
    partner: 'chime',
    note: 'with Chime as a second B2 — models Crown alongside an extra Burst-2 partner',
  },
};

// Additional profile rows, keyed by the parent slug. ids must match entries in
// B1B2_DPS_PROFILES.
export const B1B2_DPS_EXTRA_PROFILES: Record<string, string[]> = {
  'anis-star': ['with-avistar', 'with-other-b1'],
  crown: ['with-chime'],
};

export type B1B2DpsCell =
  'c0-neutral' | 'c0-eleadv' | 'c100-neutral' | 'c100-eleadv';

export const B1B2_DPS_CELLS: B1B2DpsCell[] = [
  'c0-neutral',
  'c0-eleadv',
  'c100-neutral',
  'c100-eleadv',
];

export interface B1B2TestedUnit {
  slug: string;
  effectiveBurst: 'I' | 'II';
  element: Element;
  profile: string | null;
  forceStage?: 1 | 2; // pin Λ units via lambdaStage, non-Λ units via forceStage
}

export type B1B2DpsTemplate = 'b1-20s' | 'b1-40s' | 'b2';

export interface B1B2DpsEntry {
  slug: string;
  dps: number;
  profile: string | null;
  template: B1B2DpsTemplate;
  rank: number;
}

function leftmostSlot(burst: 'I' | 'II'): number {
  return burst === 'I' ? 0 : 1;
}

const STAGE_ROMAN = { 1: 'I', 2: 'II', 3: 'III' } as const;

function fillsStage(
  char: NoopCharacter,
  forceStage: 1 | 2 | 3 | undefined,
  stage: 1 | 2 | 3
): boolean {
  if (forceStage !== undefined) {
    return forceStage === stage;
  }
  return char.burst === STAGE_ROMAN[stage];
}

function charFor(ctx: RanksCtx, slug: string): NoopCharacter {
  const found =
    (ctx.characters[slug] as NoopCharacter | undefined) ??
    NOOP_CHARACTERS[slug];
  if (!found) {
    throw new Error(`unknown B1/B2 DPS unit "${slug}"`);
  }
  return found;
}

function assertRotationLegal(
  team: string[],
  tested: B1B2TestedUnit,
  ctx: RanksCtx
): void {
  const chars = team.map((s) => charFor(ctx, s));
  for (const stage of [1, 2, 3] as const) {
    const has = chars.some((c, i) => {
      const isTested = team[i] === tested.slug;
      return fillsStage(c, isTested ? tested.forceStage : undefined, stage);
    });
    if (!has) {
      throw new Error(
        `B1/B2 DPS team for ${tested.slug}${
          tested.profile ? ` [${tested.profile}]` : ''
        } has no eligible unit for stage ${stage}: ${team.join(', ')}`
      );
    }
  }
}

export function buildTeam(
  tested: B1B2TestedUnit,
  ctx: RanksCtx,
  partner?: string
): { team: string[]; template: B1B2DpsTemplate } {
  const char = charFor(ctx, tested.slug);
  // For forced Λ/B3 rows, cooldown is taken from the character record.
  const cd = char.burstCooldownSec;
  const isLongB1 = tested.effectiveBurst === 'I' && cd > 30;
  // Resolve the partner from the explicit argument, then from the profile, so
  // buildTeam and dpsFor can never disagree about a row's team.
  const resolvedPartner =
    partner ??
    (tested.profile ? B1B2_DPS_PROFILES[tested.profile]?.partner : undefined);
  let base: string[];
  let template: B1B2DpsTemplate;
  if (tested.effectiveBurst === 'I') {
    // If a B1 partner is requested (or the B1 is 40s), use the 40s B1 template.
    // For a 20s B1 this is a TEMPLATE SWITCH: the partner occupies the second
    // B1 slot, and the second no-op B2 is removed, so the row gains rotation
    // coverage from the partner at the cost of one B2 slot. This is disclosed
    // in the published methodology and profile notes.
    template = resolvedPartner || isLongB1 ? 'b1-40s' : 'b1-20s';
    base = resolvedPartner || isLongB1 ? [...B1_40S_TEAM] : [...B1_20S_TEAM];
  } else {
    template = 'b2';
    base = [...B2_TEAM];
  }

  if (resolvedPartner) {
    const partnerChar = charFor(ctx, resolvedPartner);
    const expectedPartnerStage = tested.effectiveBurst === 'I' ? 1 : 2;
    if (!fillsStage(partnerChar, undefined, expectedPartnerStage)) {
      throw new Error(
        `B1/B2 DPS profile partner "${resolvedPartner}" for ${tested.slug} does not fill burst stage ${expectedPartnerStage}`
      );
    }
    if (tested.effectiveBurst === 'I') {
      // The partner occupies the second B1 slot (the first element of B1_40S_TEAM).
      base[0] = resolvedPartner;
    } else {
      // The partner occupies the second B2 slot.
      base[1] = resolvedPartner;
    }
  }

  // Profile rows put the partner first in the stage so the partner bursts
  // before the tested unit (e.g. Avistar -> Anis: Star, Chime -> Crown).
  const partnerIdx = resolvedPartner ? base.indexOf(resolvedPartner) : -1;
  const slot =
    partnerIdx >= 0 ? partnerIdx + 1 : leftmostSlot(tested.effectiveBurst);
  const team = [...base];
  team.splice(slot, 0, tested.slug);
  assertRotationLegal(team, tested, ctx);
  return { team, template };
}

function unitOptsFor(
  slug: string,
  tested: B1B2TestedUnit,
  testedChar: NoopCharacter
): UnitOptions {
  const opts: UnitOptions = {
    ol: 'base5',
    stars: 3,
    core: 7,
  };
  if (slug === tested.slug && tested.forceStage) {
    // Λ units use the existing lambdaStage path; everyone else uses the new
    // forceStage path so lambdaStage stays Λ-only.
    if (testedChar.burst === 'Λ') {
      opts.lambdaStage = tested.forceStage;
    } else {
      opts.forceStage = tested.forceStage;
    }
  }
  return opts;
}

export function dpsFor(
  cell: B1B2DpsCell,
  tested: B1B2TestedUnit,
  ctx: RanksCtx
): { dps: number; template: B1B2DpsTemplate } {
  const { team: slugs, template } = buildTeam(tested, ctx);
  const chars = slugs.map((s) => charFor(ctx, s));
  const unitIdx = slugs.indexOf(tested.slug);
  if (unitIdx === -1) {
    throw new Error(
      `B1/B2 DPS team for ${tested.slug} does not contain the tested unit: ${slugs.join(', ')}`
    );
  }
  const testedChar = chars[unitIdx];
  const unitOpts = slugs.map((s) => unitOptsFor(s, tested, testedChar));

  const [coreStr, eleStr] = cell.split('-') as [string, string];
  const coreHitRate = coreStr === 'c100' ? 1 : 0;
  const bossElement: Element | null =
    eleStr === 'eleadv' ? BEATS[tested.element] : null;

  const cfg: SimConfig = {
    slugs,
    bossElement,
    bossDef: 0,
    level: 400,
    copies: 0,
    doll: false,
    ol: 'base5',
    coreHitRate,
    rangeBonus: true,
    durationSec: 180,
    focusSlug: tested.slug,
  };

  const prepared = prepareTeam(chars, unitOpts, ctx.deps);
  const r = runSim(chars, ctx.mult, cfg, prepared);
  return { dps: r.units[unitIdx].dps, template };
}

export function rankB1B2Dps(
  population: B1B2TestedUnit[],
  ctx: RanksCtx
): Record<B1B2DpsCell, B1B2DpsEntry[]> {
  const byCell: Partial<Record<B1B2DpsCell, B1B2DpsEntry[]>> = {};
  for (const cell of B1B2_DPS_CELLS) {
    const scored = population.map((t) => {
      const { dps, template } = dpsFor(cell, t, ctx);
      return {
        slug: t.slug,
        dps,
        profile: t.profile ?? null,
        template,
      };
    });
    scored.sort((a, b) => b.dps - a.dps);
    byCell[cell] = scored.map((s, i) => ({ ...s, rank: i + 1 }));
  }
  return byCell as Record<B1B2DpsCell, B1B2DpsEntry[]>;
}
