/**
 * maxwell-ordinary-mechanic — BLIND per-unit kit spec test (S5).
 *
 * Base: SR / Wind / Supporter / Burst II — cd 20s, ammo 6, reload 141f, charge 60f,
 * hitsPerShot 1, normal 69.04%, core 200%. A charge weapon: every trigger pull is a
 * Full Charge attack, so "when performing a Full Charge attack" is a per-shot trigger.
 *
 * WHAT THE KIT SAYS (read literally; each line gets one assertion group below):
 *   S1a  "Full Charge attack" → ALL ALLIES: Max HP ▲ 1% of the SKILL USER's max HP,
 *        "continuously", stacks up to 30.
 *   S1b  "entering Burst Stage 3" → ALL ALLIES: Attack Damage ▲ 10% for 5 sec.
 *   S2a  "using Burst Skill" → ALL ALLIES: ATK ▲ 1% of the SKILL USER's FINAL max HP,
 *        for 15 sec.  ("final" = after S1a's 30 stacks, so the grant GROWS over the fight.)
 *   S2b  "using Burst Skill" → SELF: Overcurrent ATK ▲ 30% "continuously", up to 5 stages.
 *   S2c  "Full Charge attack" → ALL ALLIES: fills Burst Gauge by 7.15%.
 *   B1   SELF weapon swap "Matis UberBuster": 350% of final ATK, Full Charge 300%,
 *        Max Ammunition 1, Additional Effect: Gains Pierce. Charge time is FIXED and
 *        varies with the Overcurrent stage: ≤1 → 3s, 2 → 2.5s, 3 → 2s, 4 → 1.5s, ≥5 → 0.4s.
 *   B2   ALL ALLIES: Attack Damage ▲ 25% for 10 sec.
 *
 * FIXTURE: controlComp(SLUG, true) — liter B1 / crown B2 / helm B3 supply a real burst
 * chain so Full Bursts actually happen (a unit that never sees a B3 cast makes ZERO Full
 * Bursts and every stage-3 / FB-keyed assertion below would be vacuous). Deterministic,
 * no seed.
 *
 * ⚠ FIXTURE CAVEAT (declared up front, not discovered): maxwell-ordinary-mechanic is
 * BURST II and the control comp already contains a Burst II unit (crown), so the two
 * compete for the single stage-2 slot each rotation. Every S2a / S2b / B1 / B2 assertion
 * is keyed to HIS OWN burst cast. The `non-vacuity` test in each of those groups asserts
 * he casts at all (and ≥6 times for the Overcurrent cap). If THOSE go red, the fixture —
 * not the model — is the fault, and the burst-keyed groups below are VOID rather than
 * refuted.
 *
 * IDENTITY WITHOUT INDICES: the comp roster/slot order is not part of the harness API, so
 * maxwell's caster index is recovered encoding-agnostically as the casterIdx of the first
 * buffApply whose targetSlug is his AND whose casterIdx === targetIdx (a self-application —
 * every faithful encoding of this kit produces at least one, since all four of his
 * ally-targeted lines include himself and Overcurrent is self-only).
 *
 * FRAME-FREE DURATION CHECKS: buffApply carries expiresFrame but not the apply frame, and
 * there is NO buffRemove on natural lapse. S2a (15s) and B2 (10s) both fire on the SAME
 * event — his burst cast — so their expiry frames differ by exactly 5s = 300 frames. That
 * difference is asserted directly; it needs no apply frame and it fails under any 15↔10
 * mix-up.
 *
 * SCHEMA-SHAPE TOLERANCE: the packet documents the override file both as slot → Block[]
 * and as slot → { blocks: Block[] }. blocksOf() accepts either, so the counterfactual
 * patches below are shape-agnostic.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
// ADAPTED (driver plumbing only — assertions verbatim from the S5 blind): the blind guessed the
// harness import path as '../lib/harness.js'; the real harness lives at scripts/tests/lib/harness.ts.
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

const SLUG = 'maxwell-ordinary-mechanic';
const FIGHT_FRAMES = 180 * 60;

// ATK-ish stat keys an "ATK ▲ x% of max HP" line could legitimately be emitted under
// (casterAtkPct re-emits flat; atkOfMaxHpPct may emit raw). Kept wide on purpose.
const ATK_STATS = new Set([
  'atkPct',
  'casterAtkPct',
  'atkOfMaxHpPct',
  'highestAllyAtkPct',
]);
// Max-HP grant keys, override-side and event-side (casterMaxHpPct re-emits as maxHpFlat).
const HP_STATS = new Set([
  'casterMaxHpPct',
  'targetMaxHpPct',
  'maxHpPct',
  'maxHpFlat',
]);

interface BuffEv {
  kind: 'buffApply';
  stat: string;
  key?: string;
  value: number;
  stacks?: number;
  maxStacks?: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug?: string;
  expiresFrame?: number | null;
  durationShots?: number;
}

interface EffLike {
  kind: string;
  stat?: string;
  value?: number;
  durationSec?: number;
  maxStacks?: number;
  pct?: number;
  atkPct?: number;
  damagePct?: number;
  chargeTimeSec?: number;
  chargeMultPct?: number;
  maxAmmo?: number;
  hasPierce?: boolean;
  name?: string;
  delta?: number;
}

interface BlockLike {
  slot?: string;
  trigger?: {
    kind?: string;
    count?: number | number[];
    sec?: number;
    stage?: number;
  };
  target?: { kind?: string; excludeSelf?: boolean; count?: number };
  effects?: EffLike[];
  resourceGate?: { name?: string; min?: number; max?: number };
  mode?: string;
}

type Patch = ReturnType<typeof withPatchedOverride>;

function blocksOf(ov: unknown): { slot: string; block: BlockLike }[] {
  const rec = ov as Record<string, unknown>;
  const out: { slot: string; block: BlockLike }[] = [];
  for (const slot of ['skill1', 'skill2', 'burst']) {
    const v = rec[slot];
    if (!v) {
      continue;
    }
    const arr = Array.isArray(v) ? v : (v as { blocks?: unknown }).blocks;
    if (Array.isArray(arr)) {
      for (const b of arr) {
        out.push({ slot, block: b as BlockLike });
      }
    }
  }
  return out;
}

const effectsOf = (b: BlockLike): EffLike[] =>
  Array.isArray(b.effects) ? b.effects : [];

const allEffects = (ov: unknown, slot?: string): EffLike[] =>
  blocksOf(ov)
    .filter((x) => (slot ? x.slot === slot : true))
    .flatMap((x) => effectsOf(x.block));

function run(overrides?: Record<string, Patch>) {
  const evs: SimEvent[] = [];
  const base = controlComp(SLUG, true) as unknown as Record<string, unknown>;
  const cfg = {
    ...((base.cfg as Record<string, unknown>) ?? {}),
    onEvent: (e: SimEvent) => {
      evs.push(e);
    },
  };
  const opts = { ...base, cfg, ...(overrides ? { overrides } : {}) };
  const res = runComp(opts as Parameters<typeof runComp>[0]);
  return { res, evs };
}

const buffsOf = (evs: SimEvent[]): BuffEv[] =>
  evs.filter((e) => e.kind === 'buffApply') as unknown as BuffEv[];

const countOf = (evs: SimEvent[], kind: string): number =>
  evs.filter((e) => e.kind === kind).length;

/** maxwell's caster index: the first self-application landing on his own slug. */
function selfCasterIdx(evs: SimEvent[]): number | null {
  for (const b of buffsOf(evs)) {
    if (
      b.targetSlug === SLUG &&
      b.casterIdx !== null &&
      b.targetIdx !== null &&
      b.casterIdx === b.targetIdx
    ) {
      return b.casterIdx;
    }
  }
  return null;
}

const permanent = (b: BuffEv): boolean =>
  !(typeof b.expiresFrame === 'number' && b.expiresFrame < FIGHT_FRAMES);

// ── runs (hoisted; each is a full 180s sim) ─────────────────────────────────────
const BASE = run();
const MX = selfCasterIdx(BASE.evs);
const MXB = buffsOf(BASE.evs).filter((b) => MX !== null && b.casterIdx === MX);
const BASE_T = totals(BASE.res);
const TEAMMATES = Object.keys(BASE_T).filter((s) => s !== SLUG);

// S2c counterfactuals
const NO_GAUGE = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const { block } of blocksOf(ov)) {
      block.effects = effectsOf(block).filter((e) => e.kind !== 'fillGauge');
    }
  }),
});
const GAUGE_SELF = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const { block } of blocksOf(ov)) {
      if (effectsOf(block).some((e) => e.kind === 'fillGauge')) {
        block.target = { kind: 'self' };
      }
    }
  }),
});
// S1b counterfactual: 5s → 10s
const S1B_LONG = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const e of allEffects(ov)) {
      if (e.kind === 'buff' && e.stat === 'attackDamagePct' && e.value === 10) {
        e.durationSec = 10;
      }
    }
  }),
});
// S2b counterfactual: Overcurrent cap 5 → 30
const OC_UNCAPPED = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const e of allEffects(ov)) {
      if (e.kind === 'buff' && e.stat === 'atkPct' && e.value === 30) {
        e.maxStacks = 30;
      }
    }
  }),
});
// S2a counterfactual: the 15s ATK grant scoped to self instead of all allies
const S2A_SELF = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const { block } of blocksOf(ov)) {
      const hit = effectsOf(block).some(
        (e) =>
          e.kind === 'buff' &&
          ATK_STATS.has(e.stat ?? '') &&
          e.durationSec === 15
      );
      if (hit) {
        block.target = { kind: 'self' };
      }
    }
  }),
});
// B2 counterfactual: the 25%/10s ally buff scoped to self
const B2_SELF = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const { slot, block } of blocksOf(ov)) {
      if (slot !== 'burst') {
        continue;
      }
      const hit = effectsOf(block).some(
        (e) =>
          e.kind === 'buff' && e.stat === 'attackDamagePct' && e.value === 25
      );
      if (hit) {
        block.target = { kind: 'self' };
      }
    }
  }),
});
// B1 counterfactuals: flatten the Overcurrent charge-time ladder / delete the swap
const FLAT_CHARGE = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const e of allEffects(ov)) {
      if (e.kind === 'weaponSwap') {
        e.chargeTimeSec = 3;
      }
    }
  }),
});
const NO_SWAP = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const { slot, block } of blocksOf(ov)) {
      if (slot !== 'burst') {
        continue;
      }
      block.effects = effectsOf(block).filter((e) => e.kind !== 'weaponSwap');
    }
  }),
});
// S1a→S2a coupling counterfactual: delete the Max HP stacks
const NO_HP_STACKS = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const { slot, block } of blocksOf(ov)) {
      if (slot !== 'skill1') {
        continue;
      }
      block.effects = effectsOf(block).filter(
        (e) => !(e.kind === 'buff' && HP_STATS.has(e.stat ?? ''))
      );
    }
  }),
});

const OV = withPatchedOverride(SLUG, () => {});

describe('maxwell-ordinary-mechanic — fixture sanity', () => {
  it('the control comp actually bursts (stage chain reaches Full Burst)', () => {
    // Every stage-3 / FB-keyed assertion in this file is vacuous without this.
    expect(countOf(BASE.evs, 'fullBurstStart')).toBeGreaterThan(0);
    expect(countOf(BASE.evs, 'burstCast')).toBeGreaterThan(0);
  });

  it('maxwell is identifiable as a caster in the event log', () => {
    expect(MX).not.toBeNull();
    expect(MXB.length).toBeGreaterThan(0);
  });
});

describe("S1a — Full Charge → all allies: Max HP ▲1% of the SKILL USER's max HP, 30 stacks, continuous", () => {
  const hp = MXB.filter((b) => HP_STATS.has(b.stat));

  it('non-vacuity: the line fires (he full-charges repeatedly)', () => {
    expect(hp.length).toBeGreaterThan(0);
  });

  it('trigger is the per-full-charge shot, not passive / FB-enter', () => {
    // A `passive` encoding applies once (stacks stay 1); a fullBurstEnter encoding tops out
    // near the FB count (<10 over 180s). Only a per-shot trigger reaches 30 stacks —
    // ~0.7 charges/s (6 rounds + a 141f reload) caps the stack in roughly 43s.
    expect(hp.length).toBeGreaterThanOrEqual(30);
    expect(Math.max(...hp.map((b) => b.stacks ?? 1))).toBe(30);
  });

  it('stacks are capped at 30 and never exceed it', () => {
    for (const b of hp) {
      expect(b.maxStacks).toBe(30);
      expect(b.stacks ?? 1).toBeLessThanOrEqual(30);
    }
  });

  it('scope is ALL ALLIES, not self-only', () => {
    const targets = new Set(hp.map((b) => b.targetSlug));
    expect(targets.has(SLUG)).toBe(true);
    expect(targets.size).toBe(Object.keys(BASE_T).length);
  });

  it('"continuously" — the grant never expires inside the fight', () => {
    expect(hp.every(permanent)).toBe(true);
    // and it is a time buff, not a round-count buff
    expect(
      hp.every((b) => b.durationShots === undefined || b.durationShots === null)
    ).toBe(true);
  });

  it('each stack is 1% of BASE max HP — the grant does not compound off its own boost', () => {
    // caster-scaled HP re-emits flat at apply time. Under a faithful linear reading every
    // stack contributes the same flat number (+30% at cap). If the flat value is recomputed
    // against an already-boosted max HP the emitted values grow stack-over-stack — a silent
    // 1.01^30 (≈ +35%) over-credit. Per-target, so unequal ally HP pools cannot alias it.
    const mine = hp.filter((b) => b.targetSlug === SLUG).map((b) => b.value);
    expect(mine.length).toBeGreaterThan(1);
    expect(new Set(mine).size).toBe(1);
  });

  it('the stacked Max HP FEEDS the S2a ATK conversion ("final" max HP)', () => {
    // Deleting the stacks must lower team damage. If it does not, the ATK-from-max-HP line
    // is reading BASE max HP and the word "final" is unmodeled.
    const base = Object.values(BASE_T).reduce((a, b) => a + b, 0);
    const cut = Object.values(totals(NO_HP_STACKS.res)).reduce(
      (a, b) => a + b,
      0
    );
    expect(cut).toBeLessThan(base);
  });
});

describe('S1b — entering Burst Stage 3 → all allies: Attack Damage ▲10% for 5 sec', () => {
  const ad10 = MXB.filter(
    (b) => b.stat === 'attackDamagePct' && b.value === 10
  );

  it('non-vacuity: the line fires', () => {
    expect(ad10.length).toBeGreaterThan(0);
  });

  it("trigger is stage-3 ENTRY (any ally's B3 cast), not his own burst cast", () => {
    // He is Burst II — he can never enter stage 3 himself, so a burstCast keying would
    // desynchronise the count from the rotation entirely.
    const fbs = countOf(BASE.evs, 'fullBurstStart');
    const rounds = ad10.length / Object.keys(BASE_T).length;
    expect(Math.round(rounds)).toBe(fbs);
  });

  it('lands BEFORE Full Burst opens, not at FB entry', () => {
    // The measured chain is B3 cast → 22f → Full Burst. A fullBurstEnter keying would put
    // the first application at/after the first fullBurstStart in the (chronological) log.
    const firstBuff = BASE.evs.findIndex(
      (e) =>
        e.kind === 'buffApply' &&
        (e as unknown as BuffEv).casterIdx === MX &&
        (e as unknown as BuffEv).stat === 'attackDamagePct' &&
        (e as unknown as BuffEv).value === 10
    );
    const firstFb = BASE.evs.findIndex((e) => e.kind === 'fullBurstStart');
    expect(firstBuff).toBeGreaterThanOrEqual(0);
    expect(firstFb).toBeGreaterThanOrEqual(0);
    expect(firstBuff).toBeLessThan(firstFb);
  });

  it('scope is ALL ALLIES', () => {
    expect(new Set(ad10.map((b) => b.targetSlug)).size).toBe(
      Object.keys(BASE_T).length
    );
  });

  it('the 5s window is real and binding (not 10s, not permanent)', () => {
    expect(ad10.every((b) => typeof b.expiresFrame === 'number')).toBe(true);
    const base = Object.values(BASE_T).reduce((a, b) => a + b, 0);
    const longer = Object.values(totals(S1B_LONG.res)).reduce(
      (a, b) => a + b,
      0
    );
    // stretching 5s → 10s covers the whole Full Burst window ⇒ strictly more damage
    expect(longer).toBeGreaterThan(base);
  });
});

describe("S2a — his burst → all allies: ATK ▲1% of the SKILL USER's final max HP, 15 sec", () => {
  const atk = MXB.filter(
    (b) => ATK_STATS.has(b.stat) && !(b.stat === 'atkPct' && b.value === 30)
  );
  const allyAtk = atk.filter((b) => b.targetSlug !== SLUG);

  it('non-vacuity: he casts his own burst and the grant lands on allies', () => {
    // If this is red, the Burst-II slot collision with crown starved his cast — fixture
    // fault, and every assertion in this group plus S2b / B1 / B2 is VOID, not refuted.
    expect(allyAtk.length).toBeGreaterThan(0);
  });

  it('scope is ALL ALLIES including self', () => {
    expect(new Set(atk.map((b) => b.targetSlug)).size).toBe(
      Object.keys(BASE_T).length
    );
    const base = Object.values(BASE_T).reduce((a, b) => a + b, 0);
    const selfOnly = Object.values(totals(S2A_SELF.res)).reduce(
      (a, b) => a + b,
      0
    );
    expect(selfOnly).toBeLessThan(base);
  });

  it("the basis is the CASTER's max HP — every ally gets the SAME flat ATK", () => {
    // "1% of the skill user's final max HP". A per-target basis (each ally converting its
    // OWN max HP) is the nearest-wrong model and emits five different values in one
    // dispatch — Attacker/Supporter/Defender HP pools differ.
    const firstRound = atk.slice(0, Object.keys(BASE_T).length);
    expect(firstRound.length).toBe(Object.keys(BASE_T).length);
    expect(new Set(firstRound.map((b) => b.value)).size).toBe(1);
  });

  it('"FINAL" max HP — the grant grows as S1a stacks accrue', () => {
    const mine = atk.filter((b) => b.targetSlug === SLUG).map((b) => b.value);
    expect(mine.length).toBeGreaterThan(1);
    expect(mine[mine.length - 1]).toBeGreaterThan(mine[0]);
  });

  it("the window is 15s — exactly 5s longer than the burst's own 10s ally buff", () => {
    // Both fire on the SAME burst cast, so the expiry-frame gap IS the duration gap.
    const ad25 = MXB.filter(
      (b) => b.stat === 'attackDamagePct' && b.value === 25
    );
    expect(ad25.length).toBeGreaterThan(0);
    const a = atk.find((b) => typeof b.expiresFrame === 'number');
    const d = ad25.find((b) => typeof b.expiresFrame === 'number');
    expect(a).toBeDefined();
    expect(d).toBeDefined();
    expect(
      Math.abs((a!.expiresFrame as number) - (d!.expiresFrame as number) - 300)
    ).toBeLessThanOrEqual(2);
  });
});

describe('S2b — his burst → self: Overcurrent ATK ▲30% continuously, max 5 stages', () => {
  const oc = MXB.filter((b) => b.stat === 'atkPct' && b.value === 30);

  it('non-vacuity: he bursts more than 5 times, so the cap is exercised', () => {
    expect(oc.length).toBeGreaterThan(5);
  });

  it('scope is SELF ONLY — no ally ever receives it', () => {
    expect(new Set(oc.map((b) => b.targetSlug))).toEqual(new Set([SLUG]));
  });

  it('capped at 5 stages', () => {
    for (const b of oc) {
      expect(b.maxStacks).toBe(5);
      expect(b.stacks ?? 1).toBeLessThanOrEqual(5);
    }
    expect(Math.max(...oc.map((b) => b.stacks ?? 1))).toBe(5);
  });

  it('"continuously" — never expires', () => {
    expect(oc.every(permanent)).toBe(true);
  });

  it('the 5-stage cap is binding (an uncapped model over-credits)', () => {
    expect(unitOf(OC_UNCAPPED.res, SLUG).totalDamage).toBeGreaterThan(
      unitOf(BASE.res, SLUG).totalDamage
    );
  });

  it('inertness: a self-ATK change moves nobody else', () => {
    const after = totals(OC_UNCAPPED.res);
    for (const s of TEAMMATES) {
      expect(after[s]).toBe(BASE_T[s]);
    }
  });
});

describe('S2c — Full Charge → Fills Burst Gauge by 7.15%', () => {
  it('the effect exists at 7.15%', () => {
    const fills = allEffects(OV).filter((e) => e.kind === 'fillGauge');
    expect(fills.length).toBeGreaterThan(0);
    expect(fills.some((e) => e.pct === 7.15)).toBe(true);
  });

  it('it materially accelerates the rotation (more Full Bursts than without it)', () => {
    expect(countOf(BASE.evs, 'fullBurstStart')).toBeGreaterThan(
      countOf(NO_GAUGE.evs, 'fullBurstStart')
    );
  });

  it('ONE fill per full charge — "affects all allies" must not multiply by the ally count', () => {
    // The burst gauge is a single team pool. At ~0.7 charges/s a per-target fill would be
    // 5 × 7.15% ≈ 25%/s of gauge — a Full Burst every few seconds, which no fight shows.
    // Retargeting the block to self must therefore change nothing.
    expect(countOf(GAUGE_SELF.evs, 'fullBurstStart')).toBe(
      countOf(BASE.evs, 'fullBurstStart')
    );
  });
});

describe('burst B1 — weapon swap "Matis UberBuster" (350% / FC 300% / 1 ammo / Pierce)', () => {
  const swaps = allEffects(OV, 'burst').filter((e) => e.kind === 'weaponSwap');

  it("the swap is modeled and carries the kit's numbers", () => {
    expect(swaps.length).toBeGreaterThan(0);
    for (const s of swaps) {
      expect(s.damagePct).toBe(350);
      expect(s.chargeMultPct).toBe(300);
      expect(s.maxAmmo).toBe(1);
      expect(typeof s.durationSec).toBe('number');
      expect(s.durationSec as number).toBeGreaterThan(0);
    }
  });

  it('the swap actually fires damage (deleting it costs him damage)', () => {
    expect(unitOf(NO_SWAP.res, SLUG).totalDamage).toBeLessThan(
      unitOf(BASE.res, SLUG).totalDamage
    );
  });

  it('the Overcurrent charge-time LADDER is modeled: 3 / 2.5 / 2 / 1.5 / 0.4 s', () => {
    // Structural, because a single stage-agnostic charge time also passes the behavioural
    // check below. The ladder is the whole point of the burst: at stage 5 the charge time
    // collapses 3s → 0.4s, a ~7× shot-rate swing inside the swap window.
    const times = new Set(
      swaps
        .map((s) => s.chargeTimeSec)
        .filter((t): t is number => typeof t === 'number')
    );
    expect(times).toEqual(new Set([3, 2.5, 2, 1.5, 0.4]));
  });

  it('the ladder is binding — flattening every stage to 3s costs damage', () => {
    expect(unitOf(FLAT_CHARGE.res, SLUG).totalDamage).toBeLessThan(
      unitOf(BASE.res, SLUG).totalDamage
    );
  });

  it('the ladder is stage-gated on an Overcurrent counter, not on time or mode', () => {
    const gated = blocksOf(OV).filter(
      (x) =>
        x.slot === 'burst' &&
        effectsOf(x.block).some((e) => e.kind === 'weaponSwap') &&
        x.block.resourceGate !== undefined
    );
    expect(gated.length).toBeGreaterThanOrEqual(2);
    const pool = new Set(gated.map((x) => x.block.resourceGate?.name));
    expect(pool.size).toBe(1);
  });

  it('Pierce is SWAP-SCOPED, not a whole-fight tag', () => {
    // "Additional Effect: Gains Pierce" sits under the weapon-change block, so it applies
    // only while the UberBuster is out. A top-level hasPierce flag tags all 180s of his
    // base SR fire and over-credits every Pierce Damage ▲ consumer on the team.
    expect((OV as unknown as { hasPierce?: boolean }).hasPierce).not.toBe(true);
    const scoped =
      swaps.some((s) => s.hasPierce === true) ||
      allEffects(OV, 'burst').some((e) => e.kind === 'gainPierce');
    expect(scoped).toBe(true);
  });
});

describe('burst B2 — all allies: Attack Damage ▲25% for 10 sec', () => {
  const ad25 = MXB.filter(
    (b) => b.stat === 'attackDamagePct' && b.value === 25
  );

  it('non-vacuity: it fires on his burst', () => {
    expect(ad25.length).toBeGreaterThan(0);
  });

  it('scope is ALL ALLIES — self-scoping strips every teammate', () => {
    expect(new Set(ad25.map((b) => b.targetSlug)).size).toBe(
      Object.keys(BASE_T).length
    );
    const after = totals(B2_SELF.res);
    for (const s of TEAMMATES) {
      expect(after[s]).toBeLessThan(BASE_T[s]);
    }
  });

  it('applied at his BURST CAST, before Full Burst opens', () => {
    const firstBuff = BASE.evs.findIndex(
      (e) =>
        e.kind === 'buffApply' &&
        (e as unknown as BuffEv).casterIdx === MX &&
        (e as unknown as BuffEv).stat === 'attackDamagePct' &&
        (e as unknown as BuffEv).value === 25
    );
    const firstFb = BASE.evs.findIndex((e) => e.kind === 'fullBurstStart');
    expect(firstBuff).toBeGreaterThanOrEqual(0);
    expect(firstBuff).toBeLessThan(firstFb);
  });

  it('it is a timed 10s window, not permanent', () => {
    expect(ad25.every((b) => typeof b.expiresFrame === 'number')).toBe(true);
  });
});

describe('kit-silent / unrepresentable — declared gaps', () => {
  it.skip("swap window length: the kit states NO duration for the UberBuster (⚑ estimate = the 10s Full Burst window, matching the burst's own 10s ally buff) — measurement-gated, no assertion", () => {});

  it.skip('swap shot economy: "Max Ammunition Capacity: 1" means a reload between every shot, and the kit is silent on the swap weapon\'s reload time (⚑). At a 0.4s stage-5 charge the reload, not the charge time, dominates the shot rate — the ladder\'s real value cannot be pinned from prose', () => {});

  it.skip('"Charge Time is FIXED": the value is a CLAMP that charge-speed buffs must not move. The schema has chargeSpeedPct but no clamp primitive, so a chargeSpeedPct support would illegally shorten it', () => {});

  it.skip('S2a basis: no StatKey expresses "ATK = x% of the CASTER\'s max HP granted to allies" (atkOfMaxHpPct is documented as the target\'s OWN max HP). The caster-basis equality test above is the live probe for this gap', () => {});
});
