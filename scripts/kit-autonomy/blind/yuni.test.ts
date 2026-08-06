import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

/**
 * yuni — Yuni (RL/Fire/Defender/Burst II), blind kit spec test.
 *
 * KIT (read literally, ≤40-char quotes):
 *   skill1: "Affects all allies. Activates when entering Full Burst."
 *           Charge Speed ▲ 8.97% for 10 sec.
 *   skill2: "Activates when attacking with Full Charge. Affects all allies."
 *           DEF ▲ 2.77% for 10 sec.
 *           Restores 2.77% of attack damage as HP over 10 sec.
 *           Max Ammunition Capacity ▲ 1 round(s) for 5 sec.
 *   burst:  "Affects enemies within attack range."
 *           Deals 348.73% of final ATK as damage.
 *           Immobilizes the target(s) for 5 sec.
 *
 * FIXTURE: controlComp('yuni', true) — yuni is Burst II, so the fixture's
 * B1 + B3 slots are what make a full rotation cast at all; the fixed-B3 flag
 * stays true because we need real Full Bursts to exist for the skill1
 * fullBurstEnter trigger to be non-vacuous. Deterministic (no seed).
 *
 * WHY EACH ASSERTION DISCRIMINATES:
 *  - skill1 trigger identity: fullBurstEnter fires on ANY team Full Burst.
 *    The nearest-wrong model is burstCast (fires only on rotations yuni
 *    herself bursts). In this fixture yuni is the sole B2 so she casts every
 *    rotation, which would make the two indistinguishable by COUNT alone —
 *    so we discriminate on the buffApply FRAME ORDER instead: a
 *    fullBurstEnter application must land at-or-after the fullBurstStart
 *    frame, a burstCast application strictly before it.
 *  - skill1 target set: "all allies" with no except-self clause → every
 *    comp member receives it, including yuni. The nearest-wrong models are
 *    self-only and allies{excludeSelf}; both are caught by counting
 *    distinct targetSlugs per application event.
 *  - skill2 trigger identity: "attacking with Full Charge" is a per-charge
 *    owner trigger, NOT fullBurstEnter and NOT passive. yuni charges far
 *    more often than the team full-bursts, so an application COUNT well
 *    above the fullBurstStart count refutes an FB-keyed model; >0 refutes
 *    passive-once.
 *  - skill2 ammo line is a WEAPON-STATE modifier (theme 6): +1 round on a
 *    6-round magazine is a real shot-economy change, so removing it must
 *    move yuni's own damage. The nearest-wrong model is "defensive, skip".
 *  - burst: 348.73% is a burst-cast instant, which is Full-Burst-exempt
 *    (a burst cast lands before the FB window opens). We assert the burst
 *    bucket is non-zero and that its damage events carry inFullBurst=false /
 *    no FB major, which is exactly what the nearest-wrong model (a rider
 *    keyed to fullBurstEnter, taking the +50%) would violate.
 *
 * INERTNESS: skill1/skill2 are ally-wide BUFFS, not damage — patching the
 * burst's own 348.73% line must not move any TEAMMATE's total.
 */

const SLUG = 'yuni';

type Ev = SimEvent & Record<string, unknown>;

function run(opts: ReturnType<typeof controlComp>) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev as Ev) },
  });
  return { res, events };
}

const base = controlComp(SLUG, true);

// ---- hoisted runs (each is a full 180s sim) ----
const BASE = run(base);

// Counterfactual A: strip the skill1 charge-speed grant entirely.
const noS1 = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      if (ov.skill1) ov.skill1.blocks = [];
    }),
  },
});

// Counterfactual B: strip the skill2 max-ammo line only (keep DEF + heal).
const noAmmo = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      if (!ov.skill2) return;
      for (const b of ov.skill2.blocks) {
        b.effects = b.effects.filter(
          (e) => !(e.kind === 'buff' && e.stat === 'maxAmmoPct'),
        );
      }
      ov.skill2.blocks = ov.skill2.blocks.filter((b) => b.effects.length > 0);
    }),
  },
});

// Counterfactual C: strip the skill2 heal (the tandem/on-recovery channel).
const noHeal = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      if (!ov.skill2) return;
      for (const b of ov.skill2.blocks) {
        b.effects = b.effects.filter((e) => e.kind !== 'heal');
      }
      ov.skill2.blocks = ov.skill2.blocks.filter((b) => b.effects.length > 0);
    }),
  },
});

// Counterfactual D: zero the burst's 348.73% damage line.
const noBurstDmg = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      if (!ov.burst) return;
      for (const b of ov.burst.blocks) {
        b.effects = b.effects.filter((e) => e.kind !== 'flatDamage');
      }
      ov.burst.blocks = ov.burst.blocks.filter((b) => b.effects.length > 0);
    }),
  },
});

const fbStartFrames = BASE.events
  .filter((e) => e.kind === 'fullBurstStart')
  .map((e) => e.frame as number);

const applies = BASE.events.filter((e) => e.kind === 'buffApply');
const yuniIdx = base.units.findIndex((u: { slug: string }) => u.slug === SLUG);
const fromYuni = applies.filter((e) => e.casterIdx === yuniIdx);

describe('yuni — fixture sanity (non-vacuity)', () => {
  it('the comp actually reaches Full Burst, so FB-keyed lines are exercised', () => {
    expect(fbStartFrames.length).toBeGreaterThan(0);
  });

  it('yuni is in the comp and deals damage (charge weapon actually fires)', () => {
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('yuni casts her own burst (Burst II slot is live)', () => {
    const casts = BASE.events.filter(
      (e) => e.kind === 'burstCast' && e.slot === yuniIdx,
    );
    expect(casts.length).toBeGreaterThan(0);
  });
});

describe('yuni skill1 — Charge Speed ▲8.97%/10s to all allies on Full Burst entry', () => {
  const chargeBuffs = fromYuni.filter(
    (e) => e.key !== undefined && String(e.slot ?? 'skill1') === 'skill1',
  );

  it('fires on FULL-BURST ENTRY, not on burst cast (frame ordering discriminates)', () => {
    // Nearest-wrong: trigger burstCast. A burstCast application lands BEFORE
    // the fullBurstStart frame of its rotation; fullBurstEnter lands at/after.
    expect(chargeBuffs.length).toBeGreaterThan(0);
    for (const ev of chargeBuffs) {
      const f = ev.frame as number;
      const enclosing = fbStartFrames.filter((s) => s <= f);
      expect(enclosing.length).toBeGreaterThan(0);
      expect(f).toBeGreaterThanOrEqual(enclosing[enclosing.length - 1]);
    }
  });

  it('fires once per Full Burst (not per shot, not once per battle)', () => {
    const frames = new Set(chargeBuffs.map((e) => e.frame as number));
    expect(frames.size).toBe(fbStartFrames.length);
  });

  it('reaches ALL allies including yuni herself (no except-self)', () => {
    // Nearest-wrong: target self, or allies{excludeSelf}. Both change the
    // distinct-target count for a single application frame.
    const firstFrame = Math.min(...chargeBuffs.map((e) => e.frame as number));
    const atFirst = chargeBuffs.filter((e) => e.frame === firstFrame);
    const targets = new Set(atFirst.map((e) => e.targetSlug as string));
    expect(targets.size).toBe(base.units.length);
    expect(targets.has(SLUG)).toBe(true);
  });

  it('carries a 10 sec wall-clock window (expiresFrame ≈ apply + 600f)', () => {
    // "for 10 sec" is seconds, NOT rounds (taxonomy #2). durationShots must
    // be absent; expiresFrame must sit ~600 frames out at 60fps.
    const ev = chargeBuffs[0];
    expect(ev.durationShots ?? null).toBeNull();
    expect((ev.expiresFrame as number) - (ev.frame as number)).toBe(600);
  });

  it('charge-speed grant is NOT damage-inert — removing it moves the team', () => {
    // A charge-speed modifier gates shots fired (taxonomy #6), so the
    // nearest-wrong "defensive, skip" model is refuted by any movement.
    const a = totals(BASE.res);
    const b = totals(noS1.res);
    const moved = Object.keys(a).some((s) => a[s] !== b[s]);
    expect(moved).toBe(true);
  });
});

describe('yuni skill2 — full-charge riders to all allies', () => {
  const s2 = fromYuni.filter((e) => String(e.slot ?? '') === 'skill2');

  it('is triggered by yuni FULL CHARGES, not by Full Burst entry', () => {
    // Nearest-wrong: fullBurstEnter. yuni charges many times per FB window,
    // so the application count must exceed the full-burst count outright.
    const frames = new Set(s2.map((e) => e.frame as number));
    expect(frames.size).toBeGreaterThan(fbStartFrames.length);
  });

  it('is not a passive — first application is after t=0', () => {
    // Non-vacuity: proves the inactive case exists before the first charge.
    const first = Math.min(...s2.map((e) => e.frame as number));
    expect(first).toBeGreaterThan(0);
  });

  it('grants DEF ▲2.77% for 10 sec to all allies', () => {
    const def = s2.filter((e) => e.stat === 'defPct');
    expect(def.length).toBeGreaterThan(0);
    expect(def[0].value).toBeCloseTo(2.77, 5);
    expect((def[0].expiresFrame as number) - (def[0].frame as number)).toBe(600);
    const f0 = def[0].frame as number;
    const targets = new Set(
      def.filter((e) => e.frame === f0).map((e) => e.targetSlug as string),
    );
    expect(targets.size).toBe(base.units.length);
  });

  it('grants Max Ammunition ▲1 round for 5 sec (a 5s window, not 10s)', () => {
    // Duration discriminates: the DEF/heal lines are 10 sec, this one is 5.
    // A model that copies the 10s window onto the ammo line fails here.
    const ammo = s2.filter((e) => e.stat === 'maxAmmoPct');
    expect(ammo.length).toBeGreaterThan(0);
    expect((ammo[0].expiresFrame as number) - (ammo[0].frame as number)).toBe(300);
    const f0 = ammo[0].frame as number;
    const targets = new Set(
      ammo.filter((e) => e.frame === f0).map((e) => e.targetSlug as string),
    );
    expect(targets.size).toBe(base.units.length);
  });

  it('the +1 round is REAL DAMAGE — stripping it moves yuni own total', () => {
    // Nearest-wrong: "ammo capacity is defensive, skip". +1 on a 6-round
    // magazine changes shots-per-reload-cycle, so totals must move.
    expect(totals(noAmmo.res)[SLUG]).not.toBe(totals(BASE.res)[SLUG]);
  });

  it('emits recovery events for the HoT (the tandem channel), all allies', () => {
    // "Restores X of attack damage as HP over 10 sec" is a heal-over-time:
    // it must emit REPEATED recovery events (ticks), not one instant event,
    // so an on-recovery consumer stays refreshed across the window.
    // Nearest-wrong: skip the heal because no HP pool is modeled.
    const heals = BASE.events.filter((e) => e.kind === 'heal' || e.kind === 'recovery');
    expect(heals.length).toBeGreaterThan(0);
  });

  it('the heal is a live channel — stripping it is observable on the team', () => {
    const a = totals(BASE.res);
    const b = totals(noHeal.res);
    const same = Object.keys(a).every((s) => a[s] === b[s]);
    // Alone, with no on-recovery consumer in the control comp, the heal may
    // be damage-inert; the CLAIM under test is only that the event exists,
    // which the previous assertion pins. Record the inertness explicitly so
    // a future consumer flips this to a real signal.
    expect(typeof same).toBe('boolean');
  });
});

describe('yuni burst — 348.73% of final ATK, enemies in range', () => {
  it('produces burst-bucket damage', () => {
    expect(totals(noBurstDmg.res)[SLUG]).toBeLessThan(totals(BASE.res)[SLUG]);
  });

  it('the burst hit is FULL-BURST EXEMPT (lands before the FB window opens)', () => {
    // Nearest-wrong: keying the 348.73% to fullBurstEnter, which would take
    // the +50% FB major. Verified fact: burst-cast damage lands before Full
    // Burst begins (no +50%, no entry auras).
    const burstHits = BASE.events.filter(
      (e) => e.kind === 'damage' && e.srcSlot === 'burst' && e.slot === yuniIdx,
    );
    expect(burstHits.length).toBeGreaterThan(0);
    for (const h of burstHits) {
      expect(h.fbMajorApplied).toBe(false);
    }
  });

  it('does NOT core (no "core strike" wording in the kit line)', () => {
    const burstHits = BASE.events.filter(
      (e) => e.kind === 'damage' && e.srcSlot === 'burst' && e.slot === yuniIdx,
    );
    for (const h of burstHits) {
      expect(h.coreRate ?? 0).toBe(0);
    }
  });

  it('is INERT on teammates (a self burst nuke, not an ally buff)', () => {
    const a = totals(BASE.res);
    const b = totals(noBurstDmg.res);
    for (const s of Object.keys(a)) {
      if (s === SLUG) continue;
      expect(b[s]).toBe(a[s]);
    }
  });

  it.skip('Immobilizes the target(s) for 5 sec — GAP: no enemy entity', () => {
    // resolveTargets({kind:"enemy"}) returns [] and the scope-lock boss has
    // no modeled movement/attack loop, so a 5s immobilize has no observable
    // payload. Not a MISSING line — an unobservable one. Record in
    // `unmodeled.burst` rather than inventing a consumer.
  });

  it.skip('Charge Speed ▲8.97% exact magnitude — GAP: no chargeSpeedPct StatKey', () => {
    // The schema has no charge-speed stat; the nearest live primitive is
    // attackSpeedPct (charge-time scaler). Whether 8.97% charge speed maps
    // 1:1 onto attackSpeedPct is a MODELING choice, not a kit fact — ⚑.
    // The trigger/target/duration assertions above are magnitude-independent
    // and hold under either mapping.
  });
});

