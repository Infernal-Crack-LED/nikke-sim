/**
 * rapunzel-pure-grace — Rapunzel: Pure Grace (SR / Iron / Defender / Burst I; ammo 6, chargeFrames 60)
 * BLIND kit-spec test: written from the kit prose ALONE (no sight of the shipped override, the
 * driver's tests, or the driver's reasoning).
 *
 * KIT (structural read — `■` header + `Affects` clause + stat keyword before the arrow):
 *   skill1-a  start of battle, self            -> shared Shield = 20.59% of caster final Max HP, CONTINUOUS
 *   skill1-b  when using Burst Skill, self     -> the same shield again, CONTINUOUS
 *   skill1-c  full charge held >1s WHILE a shield is set, ALL ALLIES -> Attack Damage +10.41%, CONTINUOUS
 *   skill2-a  attacking with Full Charge, self -> recovers 2% of caster final Max HP (a heal => 'recovery')
 *   skill2-b  full charge held >1s WHILE shielded, self -> Current HP -2%/s and Shield HP +3.16%/s, CONTINUOUS
 *   burst-a   self                             -> Max HP +10.13% for 10 sec
 *   burst-b   all allies                       -> Attack Damage +15.24% for 10 sec
 *
 * WHY THE ASSERTIONS DISCRIMINATE
 *   - skill1-c is ALL ALLIES and CONTINUOUS: the coverage assertion (every slug in totals gets it)
 *     fails under the nearest-wrong self-only encoding; the expiresFrame assertion fails under a
 *     nearest-wrong timed ("for N sec") encoding.
 *   - skill1-c / skill2-b are literally gated on "while a Shield is set in front of this unit", and
 *     her own skill1-a shield is what satisfies it. Stripping the shield effects from her clone must
 *     therefore kill the 10.41% buff; it does NOT under the nearest-wrong ungated-passive encoding
 *     (numerically identical on this fixture, which is exactly why only a counterfactual can see it).
 *   - burst-a is SELF-scoped and (she carries no atkOfMaxHpPct) offensively inert: the byte-identical
 *     totals assertion fails under a nearest-wrong allies-wide or ATK-flavoured encoding.
 *   - burst-b is ALL ALLIES for 10s: coverage + a finite expiresFrame + a strict damage drop when removed.
 *
 * FIXTURE NOTES
 *   - controlComp(SLUG, true) = liter (B1) / crown (B2) / rapunzel (carry slot) / helm (B3).
 *     Rapunzel is BURST I, so she CONTENDS WITH LITER for stage 1 and may never cast in the control
 *     comp. Every burst assertion therefore runs on a fixture where an in-memory `burstFirst` effect
 *     is injected into her clone so she takes the stage-1 cast. The burst counterfactuals compare
 *     that same fixture against itself, so the rotation is apples-to-apples.
 *   - The engine models no HP pool and `cfg.onEvent` carries no heal/shield/recovery kind, so the
 *     shield magnitude, the 2% heal amount, the -2%/s drain and the +3.16%/s shield regen are NOT
 *     directly observable. They are pinned STRUCTURALLY on the override clone withPatchedOverride
 *     hands back, plus an `it.skip` recording the missing observable.
 *   - 6 hoisted runs.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'rapunzel-pure-grace';
const S1_ATK = 10.41; // skill1-c Attack Damage, all allies, continuous
const BURST_ATK = 15.24; // burst-b Attack Damage, all allies, 10 sec
const SHIELD_PCT = 20.59; // skill1-a / skill1-b shared shield, % of caster final Max HP
const FIGHT_FRAMES = 180 * 60;

const near = (a: unknown, b: number) => typeof a === 'number' && Math.abs(a - b) < 1e-6;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type DamageEv = Extract<SimEvent, { kind: 'damage' }>;
const buffApplies = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const damages = (evs: SimEvent[]) => evs.filter((e): e is DamageEv => e.kind === 'damage');

// ---- override-clone pokers -------------------------------------------------
// Tolerant of both slot shapes (slot as Block[] vs slot as { blocks: Block[] }).
type EffLike = { kind?: string; [k: string]: unknown };
type BlkLike = {
  trigger?: { kind?: string };
  target?: { kind?: string };
  effects?: EffLike[];
  [k: string]: unknown;
};
type Slot = 'skill1' | 'skill2' | 'burst';

function slotBlocks(ov: unknown, slot: Slot): BlkLike[] {
  const raw = (ov as Record<string, unknown> | undefined)?.[slot];
  if (Array.isArray(raw)) return raw as BlkLike[];
  const nested = (raw as { blocks?: unknown } | undefined)?.blocks;
  return Array.isArray(nested) ? (nested as BlkLike[]) : [];
}
function effectsIn(ov: unknown, slot: Slot): EffLike[] {
  return slotBlocks(ov, slot).flatMap((b) => b.effects ?? []);
}
function blocksWithEffect(ov: unknown, slot: Slot, kind: string): BlkLike[] {
  return slotBlocks(ov, slot).filter((b) => (b.effects ?? []).some((e) => e.kind === kind));
}
function stripEffects(ov: unknown, slot: Slot, pred: (e: EffLike) => boolean): void {
  for (const b of slotBlocks(ov, slot)) {
    if (Array.isArray(b.effects)) b.effects = b.effects.filter((e) => !pred(e));
  }
}
// Rapunzel is Burst I and shares stage 1 with liter in controlComp; force her to take the cast.
function addBurstFirst(ov: unknown): void {
  slotBlocks(ov, 'skill1').push({
    slot: 'skill1',
    trigger: { kind: 'passive' },
    target: { kind: 'self' },
    effects: [{ kind: 'burstFirst' }],
  } as BlkLike);
}

// The unmutated clone — used for the structural pins on unobservable lines.
const OV: unknown = withPatchedOverride(SLUG, () => {});

const NO_S1_ATK = withPatchedOverride(SLUG, (ov) =>
  stripEffects(ov, 'skill1', (e) => e.kind === 'buff' && near(e.value, S1_ATK)),
);
const NO_SHIELD = withPatchedOverride(SLUG, (ov) =>
  stripEffects(ov, 'skill1', (e) => e.kind === 'shield'),
);
const BURST_FIRST = withPatchedOverride(SLUG, (ov) => addBurstFirst(ov));
const BF_NO_ALLY_ATK = withPatchedOverride(SLUG, (ov) => {
  addBurstFirst(ov);
  stripEffects(ov, 'burst', (e) => e.kind === 'buff' && near(e.value, BURST_ATK));
});
const BF_NO_SELF_HP = withPatchedOverride(SLUG, (ov) => {
  addBurstFirst(ov);
  stripEffects(
    ov,
    'burst',
    (e) => e.kind === 'buff' && String(e.stat ?? '').toLowerCase().includes('maxhp'),
  );
});

// ---- runs (hoisted) --------------------------------------------------------
type Run = {
  res: ReturnType<typeof runComp>;
  events: SimEvent[];
  t: Record<string, number>;
};
function run(patched?: ReturnType<typeof withPatchedOverride>): Run {
  const events: SimEvent[] = [];
  const opts = controlComp(SLUG, true);
  if (patched) opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: patched };
  opts.cfg = {
    ...opts.cfg,
    onEvent: (ev: SimEvent) => {
      events.push(ev);
    },
  };
  const res = runComp(opts);
  return { res, events, t: totals(res) };
}

const R_BASE = run();
const R_NO_S1_ATK = run(NO_S1_ATK);
const R_NO_SHIELD = run(NO_SHIELD);
const R_BF = run(BURST_FIRST);
const R_BF_NO_ALLY = run(BF_NO_ALLY_ATK);
const R_BF_NO_SELF_HP = run(BF_NO_SELF_HP);

const SLUGS = Object.keys(R_BASE.t);
const idxFrom = (r: Run, v: number) =>
  buffApplies(r.events).find((e) => e.stat === 'attackDamagePct' && near(e.value, v))?.casterIdx ??
  null;
const RAP_IDX = idxFrom(R_BASE, S1_ATK);
const RAP_IDX_BF = idxFrom(R_BF, BURST_ATK) ?? idxFrom(R_BF, S1_ATK);

const atkBuffs = (r: Run, v: number) =>
  buffApplies(r.events).filter((e) => e.stat === 'attackDamagePct' && near(e.value, v));

describe('rapunzel-pure-grace — fixture sanity', () => {
  it('fires and the control comp is the expected 4-unit board', () => {
    expect(unitOf(R_BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(SLUGS.length).toBeGreaterThanOrEqual(4);
    expect(SLUGS).toContain(SLUG);
  });
});

describe('skill1-a / skill1-b — shared Shield 20.59% of final Max HP, continuous', () => {
  // No shield/heal event kind on cfg.onEvent and no HP pool in v1, so the shield is pinned
  // structurally. Two SEPARATE activations (start of battle + on Burst Skill) => two blocks.
  it('models BOTH shield activations at 20.59% of caster Max HP', () => {
    const shields = effectsIn(OV, 'skill1').filter((e) => e.kind === 'shield');
    expect(shields.length).toBeGreaterThanOrEqual(2);
    for (const s of shields) expect(near(s.maxHpPct, SHIELD_PCT)).toBe(true);
  });

  it('keys one shield to battle start and one to her own burst cast', () => {
    const kinds = new Set(
      blocksWithEffect(OV, 'skill1', 'shield').map((b) => String(b.trigger?.kind ?? '')),
    );
    // nearest-wrong: a single shield block (drops the burst re-shield), or keying the second to
    // fullBurstEnter (which would fire on ANY team full burst, over-crediting the gate below).
    expect(kinds.has('passive')).toBe(true);
    expect(kinds.has('burstCast')).toBe(true);
    expect(kinds.has('fullBurstEnter')).toBe(false);
  });

  it('the shield is CONTINUOUS, not a timed window', () => {
    for (const s of effectsIn(OV, 'skill1').filter((e) => e.kind === 'shield')) {
      const d = s.durationSec;
      expect(d == null || (typeof d === 'number' && d >= 180)).toBe(true);
    }
  });
});

describe('skill1-c — Attack Damage +10.41%, ALL ALLIES, continuous, shield-gated', () => {
  it('applies 10.41 attackDamagePct to EVERY ally (not self-only)', () => {
    const applies = atkBuffs(R_BASE, S1_ATK);
    expect(applies.length).toBeGreaterThan(0); // non-vacuity: the fixture exercises the active case
    const covered = new Set(applies.map((e) => e.targetSlug));
    for (const s of SLUGS) expect(covered.has(s)).toBe(true);
  });

  it('is CONTINUOUS — no finite in-fight expiry (vs the nearest-wrong 10 sec window)', () => {
    for (const e of atkBuffs(R_BASE, S1_ATK)) {
      const f = e.expiresFrame;
      expect(f == null || (typeof f === 'number' && f >= FIGHT_FRAMES)).toBe(true);
      expect(e.durationShots == null).toBe(true); // seconds/continuous, never a ROUND count
    }
  });

  it('is load-bearing: removing it drops EVERY unit on the board', () => {
    expect(atkBuffs(R_NO_S1_ATK, S1_ATK)).toHaveLength(0);
    for (const s of SLUGS) expect(R_NO_S1_ATK.t[s]).toBeLessThan(R_BASE.t[s]);
  });

  it('is GATED on a shield being set: stripping her shield kills the buff', () => {
    // "Activates only when Full Charge is maintained ... while a Shield is set in front of this
    // unit" — her own skill1-a shield is what satisfies it, so the two are numerically identical
    // on this fixture and ONLY the counterfactual separates the faithful requiresShielded gate
    // from the nearest-wrong ungated passive.
    expect(atkBuffs(R_NO_SHIELD, S1_ATK)).toHaveLength(0);
  });
});

describe('skill2-a — full-charge attack recovers 2% of final Max HP', () => {
  it('models a self heal on her full-charge attack (drives ally on-recovery kits)', () => {
    const healBlocks = blocksWithEffect(OV, 'skill2', 'heal');
    expect(healBlocks.length).toBeGreaterThan(0); // MISSING-line detector
    for (const b of healBlocks) {
      expect(b.target?.kind).toBe('self');
      // "when attacking with Full Charge" = per trigger pull for a charge SR — never `passive`,
      // never fullBurstEnter (which would fire on team bursts she took no shot for).
      expect(['shotFired', 'chargeCounter']).toContain(String(b.trigger?.kind ?? ''));
    }
  });

  it.skip('GAP: the 2%-of-Max-HP recovery amount is unobservable (no HP pool; no heal/recovery event kind on cfg.onEvent)', () => {});
});

describe('skill2-b — Current HP -2%/s and Shield HP +3.16%/s while shielded, continuous', () => {
  it('the self HP drain is NOT encoded as damage', () => {
    // nearest-wrong: reading "Current HP ▼ 2% every 1 sec" as a DoT / flat hit on the boss.
    const kinds = new Set(effectsIn(OV, 'skill2').map((e) => String(e.kind)));
    expect(kinds.has('dot')).toBe(false);
    expect(kinds.has('flatDamage')).toBe(false);
    expect(kinds.has('hitRepeat')).toBe(false);
    expect(kinds.has('storedHit')).toBe(false);
  });

  it.skip('GAP: shield-HP restoration (3.16%/s) is unobservable — v1 models no HP or shield pool, and nothing consumes shield HP', () => {});
});

describe('burst-a — self Max HP +10.13% for 10 sec', () => {
  it('applies a SELF-only flat Max HP grant with a finite window', () => {
    const hp = buffApplies(R_BF.events).filter(
      (e) => e.stat === 'maxHpFlat' && e.casterIdx === RAP_IDX_BF && e.targetIdx === RAP_IDX_BF,
    );
    expect(hp.length).toBeGreaterThan(0); // caster-scaled % re-emits FLAT, so assert the flat number
    for (const e of hp) {
      expect(Number(e.value)).toBeGreaterThan(0);
      expect(typeof e.expiresFrame).toBe('number');
      expect(Number(e.expiresFrame)).toBeLessThan(FIGHT_FRAMES); // 10 sec, not continuous
    }
  });

  it('is offensively INERT — removing it moves nobody (she carries no HP->ATK scaler)', () => {
    // nearest-wrong: encoding it allies-wide, or as an ATK/Attack-Damage buff, moves the board here.
    for (const s of SLUGS) expect(R_BF_NO_SELF_HP.t[s]).toBe(R_BF.t[s]);
  });
});

describe('burst-b — Attack Damage +15.24%, all allies, 10 sec', () => {
  it('non-vacuity: she actually casts her Burst I on the burstFirst fixture', () => {
    // If this is the only red test, the control comp is starving her stage-1 cast (liter is also
    // Burst I) and the fixture — not the override — is what needs changing.
    expect(atkBuffs(R_BF, BURST_ATK).length).toBeGreaterThan(0);
  });

  it('covers EVERY ally and expires inside the fight (10 sec, not continuous)', () => {
    const applies = atkBuffs(R_BF, BURST_ATK);
    const covered = new Set(applies.map((e) => e.targetSlug));
    for (const s of SLUGS) expect(covered.has(s)).toBe(true);
    for (const e of applies) {
      expect(typeof e.expiresFrame).toBe('number');
      expect(Number(e.expiresFrame)).toBeLessThan(FIGHT_FRAMES);
      expect(e.durationShots == null).toBe(true);
    }
  });

  it('is load-bearing: removing it drops every unit on the board', () => {
    expect(atkBuffs(R_BF_NO_ALLY, BURST_ATK)).toHaveLength(0);
    for (const s of SLUGS) expect(R_BF_NO_ALLY.t[s]).toBeLessThan(R_BF.t[s]);
  });
});

describe('whole-kit inertness — no invented damage', () => {
  it('her kit deals ZERO skill- or burst-bucket damage (every line is a shield/heal/buff)', () => {
    expect(RAP_IDX).not.toBeNull();
    const buckets = new Set(
      damages(R_BF.events)
        .filter((e) => e.srcSlot === RAP_IDX_BF)
        .map((e) => String(e.bucket)),
    );
    expect(buckets.has('skill')).toBe(false);
    expect(buckets.has('burst')).toBe(false);
  });
});
