/**
 * Rei Ayanami (Tentative Name) — `rei-ayanami-tentative-name` (AR / Wind / Attacker / Burst III)
 * BLIND kit spec test (S5 post-op author): written from the kit prose ALONE — no sight of the
 * driver's override, tests, reasoning, or any truth file.
 *
 * KIT STRUCTURE (magnitudes verbatim, prose paraphrased):
 *   skill1 a) after 18 normal hits on a target in `Anti A.T. Field` status → 590.64% rider,
 *             plus `Anti A.T. Field stacks ▲10` (no engine primitive)
 *   skill1 b) after 7 normal hits while in `Attack State` status → 286.37% rider
 *   skill1 c) FB-enter, allies in `Annihilation State` → two Annihilation-only lines (no primitive)
 *             plus ATK ▲17.6% of the skill user's ATK for 9 sec
 *   skill2 a) FB-enter, MG allies who have used their bursts → MG Ramp-Up Speed ▲100%, 13 sec
 *   skill2 b) FB-enter, all allies → ATK ▲11.61% of the skill user's ATK for 10 sec
 *   burst  a) self, `Attack State`: Attack Damage ▲35.9% + ATK ▲63.36% of own ATK, 10 sec
 *   burst  b) all enemies: 990.2% of final ATK as Burst Skill damage
 *
 * READING (the 4 questions, applied literally):
 *   - `Anti A.T. Field` and `Annihilation State` are FOREIGN statuses: nothing in this kit grants
 *     either, and no unit in the control fixture carries them. Both gated lines MUST be inert here.
 *     Modelled-but-gated and not-modelled are observationally identical — the test asserts the
 *     OBSERVABLE (no credit) and proves non-vacuity by adding the ungated variant itself.
 *   - `Attack State` is granted by this unit's OWN burst — the burst block literally labels its two
 *     self buffs `Attack State:`. So skill1 b) is a self-gated every-7-hits rider live only for the
 *     10 sec after each of HER burst casts, NOT a whole-fight rider. That is the single highest-risk
 *     divergence in this kit and gets a delta-vs-delta discriminator below.
 *   - `of the skill user's ATK` ⇒ casterAtkPct (flat-resolved at apply time), never atkPct.
 *   - `when entering Full Burst` ⇒ fullBurstEnter (fires on ANY team Full Burst), never burstCast.
 *   - `for N sec` ⇒ wall-clock seconds, never rounds (durationShots must stay unset).
 *
 * FIXTURE: controlComp(SLUG, true) — liter B1 / crown B2 / rei B3 / helm B3. The SECOND Burst III
 * matters: it lets a Full Burst complete without her cast, so a fullBurstEnter line and a
 * burst-cast line have different activation counts and the trigger-identity assertions genuinely
 * discriminate (asserted explicitly in the `fixture non-vacuity` block).
 *
 * IDENTIFICATION TRICK: caster-scaled buffs emit a FLAT ATK number, so the raw kit percentage is
 * never visible on the event. Her two casterAtkPct magnitudes are identified stat-independently by
 * their exact ratio 63.36/11.61 = 5.45736, and the forbidden Annihilation magnitude by
 * 17.6/11.61 = 1.51593. No ATK constant is hardcoded anywhere in this file.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed 2026-07-28: blind/ sits under kit-autonomy/, not tests/units/

const SLUG = 'rei-ayanami-tentative-name';

// ---- kit magnitudes (verbatim from the kit text) ---------------------------
const S1_ATF_RIDER = 590.64;
const S1_ATTACK_STATE_RIDER = 286.37;
const S1_ANNIHILATION_ATK = 17.6;
const S2_TEAM_ATK = 11.61;
const BURST_ATTACK_DMG = 35.9;
const BURST_SELF_ATK = 63.36;
const BURST_NUKE = 990.2;

const RATIO_BURST_OVER_S2 = BURST_SELF_ATK / S2_TEAM_ATK; // 5.45736…
const RATIO_ANNI_OVER_S2 = S1_ANNIHILATION_ATK / S2_TEAM_ATK; // 1.51593…

// ---- local structural shapes ----------------------------------------------
// Deliberately local + loose: this file must compile and RUN without betting on
// the exact union shape of SimEvent or on whether an override slot is a bare
// Block[] or a { blocks: Block[] } wrapper (both forms are handled below).
type SlotName = 'skill1' | 'skill2' | 'burst';

interface EffectLike {
  kind: string;
  stat?: string;
  value?: number;
  atkPct?: number;
  durationSec?: number;
}

interface BlockLike {
  slot?: SlotName;
  trigger?: Record<string, unknown>;
  target?: Record<string, unknown>;
  effects?: EffectLike[];
}

interface BuffApplyLike {
  kind: string;
  stat: string;
  value: number;
  targetSlug?: string;
  casterIdx: number | null;
  durationShots?: number;
}

interface DamageLike {
  kind: string;
  srcSlot?: string;
  fbMajorApplied?: boolean;
}

function near(a: number, b: number, rel = 1e-6): boolean {
  return Math.abs(a - b) <= rel * Math.max(1, Math.abs(b));
}

function unique<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

function slotBlocks(ov: unknown, slot: SlotName): BlockLike[] {
  const rec = ov as Record<string, unknown>;
  const raw = rec[slot];
  if (Array.isArray(raw)) {
    return raw as BlockLike[];
  }
  const nested = (raw as { blocks?: unknown } | undefined)?.blocks;
  if (Array.isArray(nested)) {
    return nested as BlockLike[];
  }
  throw new Error(`${SLUG} override: slot ${slot} carries no block array`);
}

function removeEffects(
  ov: unknown,
  slot: SlotName,
  pred: (e: EffectLike) => boolean
): number {
  let removed = 0;
  for (const b of slotBlocks(ov, slot)) {
    const eff = b.effects;
    if (!Array.isArray(eff)) {
      continue;
    }
    for (let i = eff.length - 1; i >= 0; i--) {
      if (pred(eff[i])) {
        eff.splice(i, 1);
        removed++;
      }
    }
  }
  return removed;
}

function buffApplies(events: SimEvent[]): BuffApplyLike[] {
  return events.filter(
    (e) => (e as { kind?: string }).kind === 'buffApply'
  ) as unknown as BuffApplyLike[];
}

function damages(events: SimEvent[]): DamageLike[] {
  return events.filter(
    (e) => (e as { kind?: string }).kind === 'damage'
  ) as unknown as DamageLike[];
}

function countKind(events: SimEvent[], kind: string): number {
  return events.filter((e) => (e as { kind?: string }).kind === kind).length;
}

function findRatioPair(vals: number[], ratio: number): [number, number] | null {
  for (const small of vals) {
    if (small <= 0) {
      continue;
    }
    for (const big of vals) {
      if (Math.abs(big / small - ratio) <= 1e-4 * ratio) {
        return [small, big];
      }
    }
  }
  return null;
}

// ---- the fixture -----------------------------------------------------------
function runFixture(patched?: unknown): {
  res: ReturnType<typeof runComp>;
  events: SimEvent[];
} {
  const events: SimEvent[] = [];
  const onEvent = (ev: SimEvent): void => {
    events.push(ev);
  };
  const bag = controlComp(SLUG, true) as unknown as Record<string, unknown>;
  const overrides = {
    ...((bag.overrides as Record<string, unknown> | undefined) ?? {}),
    ...(patched ? { [SLUG]: patched } : {}),
  };
  const opts = {
    ...bag,
    overrides,
    onEvent,
    cfg: {
      ...((bag.cfg as Record<string, unknown> | undefined) ?? {}),
      onEvent,
    },
  } as unknown as Parameters<typeof runComp>[0];
  return { res: runComp(opts), events };
}

// ---- counterfactual overrides (built once, hoisted) ------------------------
// Anti A.T. Field rider: REMOVE it (must be inert ⇒ zero delta) and, separately,
// ADD an UNGATED copy (must move damage ⇒ the assertion above is not vacuous).
// blind author's removal non-vacuity count, asserted nowhere; _-prefixed to satisfy no-unused-vars
let _atfRemovedCount = 0;
const ovAtfRemoved = withPatchedOverride(SLUG, (ov) => {
  _atfRemovedCount = removeEffects(
    ov,
    'skill1',
    (e) => e.kind === 'flatDamage' && near(e.atkPct ?? -1, S1_ATF_RIDER)
  );
});
const ovAtfUngated = withPatchedOverride(SLUG, (ov) => {
  slotBlocks(ov, 'skill1').push({
    slot: 'skill1',
    trigger: { kind: 'hitCount', count: 18 },
    target: { kind: 'enemy' },
    effects: [{ kind: 'flatDamage', atkPct: S1_ATF_RIDER }],
  });
});

// Attack-State rider: REMOVE it (must lower her damage ⇒ it is live) and ADD an
// UNGATED copy (its delta is the whole-fight yield of one such rider).
let attackStateRemovedCount = 0;
const ovAttackStateRemoved = withPatchedOverride(SLUG, (ov) => {
  attackStateRemovedCount = removeEffects(
    ov,
    'skill1',
    (e) =>
      e.kind === 'flatDamage' && near(e.atkPct ?? -1, S1_ATTACK_STATE_RIDER)
  );
});
const ovAttackStateUngated = withPatchedOverride(SLUG, (ov) => {
  slotBlocks(ov, 'skill1').push({
    slot: 'skill1',
    trigger: { kind: 'hitCount', count: 7 },
    target: { kind: 'enemy' },
    effects: [{ kind: 'flatDamage', atkPct: S1_ATTACK_STATE_RIDER }],
  });
});

// Annihilation-State ATK: ADD the ungated all-allies form (nearest-wrong model).
const ovAnnihilationUngated = withPatchedOverride(SLUG, (ov) => {
  slotBlocks(ov, 'skill1').push({
    slot: 'skill1',
    trigger: { kind: 'fullBurstEnter' },
    target: { kind: 'allies' },
    effects: [
      {
        kind: 'buff',
        stat: 'casterAtkPct',
        value: S1_ANNIHILATION_ATK,
        durationSec: 9,
      },
    ],
  });
});

// skill2 team ATK: flip casterAtkPct → atkPct (the nearest-wrong scaling).
let s2StatPatchCount = 0;
const ovS2AsAtkPct = withPatchedOverride(SLUG, (ov) => {
  for (const b of slotBlocks(ov, 'skill2')) {
    for (const e of b.effects ?? []) {
      if (e.stat === 'casterAtkPct' && near(e.value ?? -1, S2_TEAM_ATK)) {
        e.stat = 'atkPct';
        s2StatPatchCount++;
      }
    }
  }
});

// burst self buffs: flip the self block to all-allies (the nearest-wrong target).
let burstTargetPatchCount = 0;
const ovBurstToAllies = withPatchedOverride(SLUG, (ov) => {
  for (const b of slotBlocks(ov, 'burst')) {
    const carriesAttackDmg = (b.effects ?? []).some(
      (e) =>
        e.stat === 'attackDamagePct' && near(e.value ?? -1, BURST_ATTACK_DMG)
    );
    if (carriesAttackDmg) {
      b.target = { kind: 'allies' };
      burstTargetPatchCount++;
    }
  }
});

// burst nuke: remove the 990.2% hit.
let burstNukeRemovedCount = 0;
const ovBurstNukeRemoved = withPatchedOverride(SLUG, (ov) => {
  burstNukeRemovedCount = removeEffects(
    ov,
    'burst',
    (e) => e.kind === 'flatDamage' && near(e.atkPct ?? -1, BURST_NUKE)
  );
});

// ---- runs (hoisted — 9 full 180 s sims) ------------------------------------
const base = runFixture();
const cfAtfRemoved = runFixture(ovAtfRemoved);
const cfAtfUngated = runFixture(ovAtfUngated);
const cfAsRemoved = runFixture(ovAttackStateRemoved);
const cfAsUngated = runFixture(ovAttackStateUngated);
const cfAnnihilation = runFixture(ovAnnihilationUngated);
const cfS2AtkPct = runFixture(ovS2AsAtkPct);
const cfBurstAllies = runFixture(ovBurstToAllies);
const cfBurstNuke = runFixture(ovBurstNukeRemoved);

const allySlugs = Object.keys(totals(base.res)).sort();
const teammateSlugs = allySlugs.filter((s) => s !== SLUG);
const reiBase = unitOf(base.res, SLUG).totalDamage;
const fbStarts = countKind(base.events, 'fullBurstStart');
const baseBuffs = buffApplies(base.events);
const casterAtkValues = unique(
  baseBuffs.filter((b) => b.stat === 'casterAtkPct').map((b) => b.value)
);
const pair = findRatioPair(casterAtkValues, RATIO_BURST_OVER_S2);
const vS2 = pair ? pair[0] : Number.NaN;
const vBurst = pair ? pair[1] : Number.NaN;
const s2Events = baseBuffs.filter(
  (b) => b.stat === 'casterAtkPct' && b.value === vS2
);
const burstAtkEvents = baseBuffs.filter(
  (b) => b.stat === 'casterAtkPct' && b.value === vBurst
);
const herBurstCasts = burstAtkEvents.length;

describe('rei-ayanami-tentative-name — fixture non-vacuity', () => {
  it('the control comp actually bursts, and a Full Burst completes WITHOUT her cast', () => {
    // Without this, every fullBurstEnter-vs-burstCast assertion below would be vacuous.
    expect(allySlugs.length).toBeGreaterThanOrEqual(4);
    expect(allySlugs).toContain(SLUG);
    expect(fbStarts).toBeGreaterThanOrEqual(2);
    expect(herBurstCasts).toBeGreaterThanOrEqual(2);
    expect(fbStarts).toBeGreaterThan(herBurstCasts);
  });

  it('her two caster-scaled ATK magnitudes are present at the exact kit ratio 63.36/11.61', () => {
    // Identifies both skill2 b) and burst a) without hardcoding any ATK constant.
    expect(pair).not.toBeNull();
    expect(vBurst / vS2).toBeCloseTo(RATIO_BURST_OVER_S2, 4);
  });
});

describe('skill2 b — FB-enter: ATK ▲11.61% of the skill user ATK to ALL allies, 10 s', () => {
  it('fires on EVERY Full Burst enter and reaches every ally including self', () => {
    // Discriminates fullBurstEnter from the nearest-wrong burstCast: a burstCast key
    // would yield allySlugs.length * herBurstCasts (< fbStarts, asserted above).
    expect(s2Events.length).toBe(allySlugs.length * fbStarts);
    const targets = unique(
      s2Events.map((e) => e.targetSlug).filter((s): s is string => !!s)
    ).sort();
    expect(targets).toEqual(allySlugs);
  });

  it('is CASTER-scaled (flat ATK), not target-scaled, and time-bound not round-bound', () => {
    // Nearest-wrong #1: atkPct — would emit the raw 11.61 on every target.
    expect(vS2).not.toBeCloseTo(S2_TEAM_ATK, 3);
    // Nearest-wrong #2: `for 10 sec` mis-read as a round count.
    // mechanical fix 2026-07-28: the buffApply event carries durationShots:number|null (null when
    // absent), not undefined — assert null (intent unchanged: no round-count budget on a timed buff)
    for (const e of s2Events) {
      expect(e.durationShots).toBeNull();
    }
    // All of them come from one caster (her).
    expect(unique(s2Events.map((e) => e.casterIdx)).length).toBe(1);
  });

  it('the atkPct counterfactual is RED: it emits the raw kit percentage instead', () => {
    expect(s2StatPatchCount).toBe(1);
    const patched = buffApplies(cfS2AtkPct.events);
    expect(
      patched.some((b) => b.stat === 'atkPct' && near(b.value, S2_TEAM_ATK))
    ).toBe(true);
    expect(
      patched.some((b) => b.stat === 'casterAtkPct' && b.value === vS2)
    ).toBe(false);
  });
});

describe('skill1 c — Annihilation-State ATK ▲17.6% is NOT credited without the status', () => {
  it('no caster-scaled ATK magnitude sits at the 17.6%-of-skill-user ratio', () => {
    // The target set is `all allies in Annihilation State status`; nothing in this kit
    // grants that status and no fixture ally carries it, so the line must be inert.
    for (const v of casterAtkValues) {
      expect(Math.abs(v / vS2 - RATIO_ANNI_OVER_S2)).toBeGreaterThan(
        1e-4 * RATIO_ANNI_OVER_S2
      );
    }
  });

  it('non-vacuity: the same buff scoped to plain allies DOES move the team', () => {
    const cfValues = unique(
      buffApplies(cfAnnihilation.events)
        .filter((b) => b.stat === 'casterAtkPct')
        .map((b) => b.value)
    );
    expect(
      cfValues.some(
        (v) =>
          Math.abs(v / vS2 - RATIO_ANNI_OVER_S2) <= 1e-4 * RATIO_ANNI_OVER_S2
      )
    ).toBe(true);
    const baseTeam = allySlugs.reduce((a, s) => a + totals(base.res)[s], 0);
    const cfTeam = allySlugs.reduce(
      (a, s) => a + totals(cfAnnihilation.res)[s],
      0
    );
    expect(cfTeam).toBeGreaterThan(baseTeam);
  });
});

describe('skill1 a — Anti A.T. Field 18-hit rider (590.64%) is inert without the status', () => {
  it('removing it changes NOTHING (it never fires in a comp with no Anti A.T. Field)', () => {
    // Passes whether the driver modelled-and-gated it or documented it unmodelled;
    // fails loudly if the rider was wired ungated.
    expect(unitOf(cfAtfRemoved.res, SLUG).totalDamage).toBe(reiBase);
    for (const s of teammateSlugs) {
      expect(totals(cfAtfRemoved.res)[s]).toBe(totals(base.res)[s]);
    }
  });

  it('non-vacuity: an UNGATED 18-hit copy of the same rider adds substantial damage', () => {
    expect(unitOf(cfAtfUngated.res, SLUG).totalDamage).toBeGreaterThan(
      reiBase * 1.2
    );
  });
});

describe('skill1 b — Attack-State 7-hit rider (286.37%) fires ONLY in her own burst windows', () => {
  it('is live in the control comp (removing it lowers her damage)', () => {
    expect(attackStateRemovedCount).toBeGreaterThanOrEqual(1);
    expect(unitOf(cfAsRemoved.res, SLUG).totalDamage).toBeLessThan(reiBase);
  });

  it('is GATED, not a whole-fight rider — its yield is a fraction of an ungated copy', () => {
    // The discriminator: deltaShipped = what the shipped rider actually contributes;
    // deltaUngated = what one whole-fight copy of the same rider contributes.
    // `Attack State` lasts 10 s per her burst cast (~40 s of a 180 s fight), so the
    // shipped rider must yield well under half of the ungated copy. If it were keyed
    // whole-fight the two deltas would be ~equal and this goes RED.
    const deltaShipped = reiBase - unitOf(cfAsRemoved.res, SLUG).totalDamage;
    const deltaUngated = unitOf(cfAsUngated.res, SLUG).totalDamage - reiBase;
    expect(deltaUngated).toBeGreaterThan(0);
    expect(deltaShipped).toBeGreaterThan(0.05 * deltaUngated);
    expect(deltaShipped).toBeLessThan(0.6 * deltaUngated);
  });

  it('inertness: neither skill1 rider touches teammates', () => {
    for (const s of teammateSlugs) {
      expect(totals(cfAsRemoved.res)[s]).toBe(totals(base.res)[s]);
    }
  });
});

describe('burst a — self `Attack State`: Attack Damage ▲35.9% + ATK ▲63.36% of own ATK, 10 s', () => {
  const attackDmgEvents = baseBuffs.filter(
    (b) => b.stat === 'attackDamagePct' && near(b.value, BURST_ATTACK_DMG)
  );

  it('Attack Damage ▲35.9% lands on SELF only, once per her burst cast', () => {
    expect(attackDmgEvents.length).toBe(herBurstCasts);
    expect(unique(attackDmgEvents.map((e) => e.targetSlug))).toEqual([SLUG]);
    // Raw percentage stat — emitted verbatim, unlike the caster-scaled ATK line.
    for (const e of attackDmgEvents) {
      expect(e.value).toBeCloseTo(BURST_ATTACK_DMG, 6);
      expect(e.durationShots).toBeNull(); // mechanical fix 2026-07-28: event carries null, not undefined
    }
  });

  it('ATK ▲63.36% of the skill user ATK lands on SELF only (never the team)', () => {
    expect(unique(burstAtkEvents.map((e) => e.targetSlug))).toEqual([SLUG]);
    expect(vBurst).not.toBeCloseTo(BURST_SELF_ATK, 3); // caster-scaled ⇒ flat ATK
    for (const e of burstAtkEvents) {
      expect(e.durationShots).toBeNull();
    } // mechanical fix 2026-07-28: null not undefined
  });

  it('is burst-cast keyed, not FB-enter keyed (fewer applications than Full Bursts)', () => {
    expect(herBurstCasts).toBeLessThan(fbStarts);
    expect(herBurstCasts).toBeLessThan(s2Events.length / allySlugs.length + 1);
  });

  it('non-vacuity: granting the same block to all allies DOES raise teammate damage', () => {
    expect(burstTargetPatchCount).toBe(1);
    for (const s of teammateSlugs) {
      expect(totals(cfBurstAllies.res)[s]).toBeGreaterThan(totals(base.res)[s]);
    }
  });
});

describe('burst b — 990.2% of final ATK as Burst Skill damage', () => {
  it('is live and is hers alone (removing it lowers only her total)', () => {
    expect(burstNukeRemovedCount).toBe(1);
    expect(unitOf(cfBurstNuke.res, SLUG).totalDamage).toBeLessThan(reiBase);
    for (const s of teammateSlugs) {
      expect(totals(cfBurstNuke.res)[s]).toBe(totals(base.res)[s]);
    }
  });

  it('burst-cast damage is Full-Burst exempt (lands before the FB window opens)', () => {
    const burstHits = damages(base.events).filter((d) => d.srcSlot === 'burst');
    expect(burstHits.length).toBeGreaterThanOrEqual(herBurstCasts);
    for (const d of burstHits) {
      expect(d.fbMajorApplied).toBeFalsy();
    }
  });
});

describe('GAPs — kit lines with no engine primitive', () => {
  it.skip('skill1 a: `Anti A.T. Field stacks ▲10` — no status-STACK primitive', () => {
    /* targetStatus is a named window with a duration; it carries no stack count,
       and no consumer of an Anti A.T. Field stack exists in this kit. */
  });

  it.skip('skill1 c: `Units affected by Annihilation State additional effect ▲1`', () => {
    /* No primitive: the affected-unit count of a foreign unit's effect is not a StatKey. */
  });

  it.skip('skill1 c: `Attack range of Annihilation State additional effect ▲500%`', () => {
    /* No primitive: attack range of a foreign effect is not modelled. */
  });

  it.skip('skill2 a: MG Ramp-Up Speed ▲100% for 13 s to MG allies who have burst', () => {
    /* Two blockers: (1) no MG ramp-up StatKey — the MG wind-up ladder is a measured
       engine constant with no buff channel; (2) the target set (weapon=MG ∧ burst-cast
       this rotation) is not expressible — burstCasters has no weapon facet and
       alliesOfWeapon has no burst-cast facet. Inert in this fixture regardless: the
       control comp contains no machine gun. */
  });

  it.skip('rider noFb / noRange conventions on both skill1 riders', () => {
    /* Per-block FB/range flags are not attributable from the event log without a unit
       identity on the damage event; MEASUREMENT-GATED (popup read), not asserted blind. */
  });
});
