// PER-UNIT KIT SPEC — `rupee-winter-shopper` (Rupee: Winter Shopper, Defender/AR/Electric,
// Burst I, cd 20s, ammo 60, reloadFrames 81, rate_of_fire 720). Kit-autonomy gauntlet 2026-08-05.
//
// One assertion group per KIT LINE (RW1..RW7 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.rupee-winter-shopper.skills):
//   S1 "Winter Premium" ■ last bullet hits the target → all allies:
//        DEF ▲19.02% for 5 sec                                                                 [RW1]
//   S2 "VIP Gift" ■ an ally uses a Burst Skill → all allies:
//        Shopping: DEF ▲1.33%, stacks up to 4 times, lasts 20 sec                             [RW2]
//      ■ Shopping at max stacks when Full Burst ends → all allies:
//        Burst Gauge filling speed ▲7.9% for 5 sec                                            [RW3]
//   BU "Shopaholic Date" ■ self: Attract — taunts all enemies for 5 sec                       [UNMODELED]
//      ■ self: Recovers 50.47% of attack damage as HP over 10 sec                             [RW6/SSOT]
//      ■ all allies: Reload Speed ▲63.17% for 10 sec                                          [RW4]
//      ■ all allies: Re-enters Burst Stage 1                                                  [RW5]
//
// Dispositions + why each assertion discriminates:
//   RW1 FAITHFUL — lastBullet → allies → defPct 19.02 / 5s. "last bullet hits" = the magazine
//      drying out (engine lastBullet fires on fire-dry; v1 has no miss model, clay precedent, so
//      "hits" == the 60th shot of every magazine). defPct has NO consumer in sim.ts (v1: self DEF
//      moves no damage), so the line is FAITHFUL-AND-INERT: asserted at the event level (one apply
//      per ally, frame-exact with each magazine's last shot, 5s expiry) and byte-identical totals
//      when removed. Nearest-wrong: a fullBurstEnter key (fires at window opens, ~40s cadence,
//      not the ~5.8s magazine cadence).
//   RW2 FAITHFUL — "an ally uses a Burst Skill" = any stage cast by any unit: three stageEnter
//      blocks (stage 1/2/3) → allies → defPct 1.33, maxStacks 4, 20s. The three blocks share one
//      buff key (caster+slot+stat+value) so they MERGE into a single Shopping instance whose
//      stacks accrue across the chain's casts. Asserted: one apply per ally per ally-cast frame,
//      stacks ramp 1→4 in the double-B1 fixture (4 casts/chain) and never exceed the cap;
//      byte-identical totals when removed (defPct inert). The Shopping stack count also feeds RW3's
//      gate via the owner's `shopping` resource pool (the power/rupee resource-mirror construction;
//      the pool itself has no event channel — it is observable ONLY through RW3's gate).
//      Nearest-wrong: a burstCast (owner-only) key — fires only on HER cast frames, never on
//      teammates' casts, so the stack-granting frame set collapses to her own casts (pinned via
//      the frame set, not the count — the three retargeted blocks all fire per own cast).
//   RW3 FAITHFUL (gate LOAD-BEARING) — fullBurstEnd + resourceGate{shopping ≥ 4} → allies →
//      burstGenPct 7.9 / 5s. In FIX_A (3 casts/chain) the pool reaches 3 after chain 1 and 4
//      during chain 2, so the FIRST FB end is silent and every later FB end fires all-allies
//      burstGenPct frame-exact with the fullBurstEnd event. burstGenPct scales each holder's gauge
//      contribution (sim.ts energy term) — the kit's "Burst Gauge filling speed" mechanic.
//      Nearest-wrong: the ungated fullBurstEnd block fires on the FIRST FB end too (pool 3 < 4).
//   RW4 FAITHFUL — burstCast → allies → reloadSpeedPct 63.17 / 10s. Damage-relevant: reload speed
//      shortens the reload gap → more shots → the removed-line run must total LOWER for the
//      reload-bound units (byte-different totals, not "similar"). Nearest-wrong: self-only target
//      (one holder per cast instead of all allies).
//   RW5 FAITHFUL — burstCast → allies → reenterStage stage:1. Meta-defining B1 re-entry (the
//      Tia/awb/avistar stage-hold primitive): FIX_B fields a second B1 (liter) — shipped, liter
//      fills stage 1 in chain 1 exactly one STAGE_CAST_GAP (30f) after rupee-winter-shopper and
//      before crown's stage-2 cast; with re-entry removed the stage advances and liter gets no
//      chain-1 stage-1 window. FIX_A (no second B1) is the real-kit no-op case: exactly one
//      stage-1 cast per chain.
//   RW7 FAITHFUL (target-set pin) — the self heal's TARGET is observable even though its amount
//      is not: with crown's own self-heal patched out, crown's "when recovery takes effect"
//      consumer (attackDamagePct 20.99) must stay SILENT for the whole fight (nothing reaches
//      her); an allies-widened heal counterfactual fires it after every rws cast. The S2b
//      reviewer's "Affects self" trap, pinned both ways (helm-H8 / awb-A7 isolation, inverted).
//   RW6 SSOT/UNOBSERVABLE + CLOSED EFFECT SET — (a) the burst's self heal "Recovers 50.47% of
//      attack damage as HP over 10 sec" is modeled as heal ticks:10 intervalSec:1 → self (engine
//      design: no HP amount modeled, recovery events only). It is UNOBSERVABLE in the event log:
//      there is no 'heal' SimEvent kind, the recovery events reach only HER (a self heal), and she
//      carries no 'recovery' trigger — so it carries NO assertion (avistar self-HoT precedent).
//      (b) "Attract: Taunts all enemies for 5 sec" is UNMODELED — the engine has no taunt
//      primitive and v1's partless boss deals no damage and has no target choice, so enemy
//      target-lock moves no damage (defensive; label precedent). (c) CLOSED SET pin: the distinct
//      buff stats sourced from her kit are exactly {defPct, burstGenPct, reloadSpeedPct} — no
//      fabricated channel stands in for the taunt or the heal.
//
// Inert UNMODELED magnitudes with no assertions: the 50.47%/10s self heal (SSOT-modeled, event-
// unobservable) and the 5s taunt (unmodeled, defensive). Every other kit magnitude is pinned.
//
// Fixtures (all deterministic — no seed; bossRange 'near' pins the range band):
//   FIX_A = [rupee-winter-shopper, crown, ada], boss Fire, focus ada — full B1/B2/B3 chain;
//       3 ally casts per chain, so Shopping ramps 1→3/chain and the shopping pool (no decay)
//       crosses the 4-cap gate during chain 2 → RW3's first-FB-end silence is observable.
//   FIX_B = [rupee-winter-shopper, liter, crown, ada], boss Fire, focus ada — two B1s: the
//       re-entry chain structure (RW5) and the full 1→4 Shopping ramp (4 casts/chain).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const RWS = 'rupee-winter-shopper';

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(o: {
  slugs: string[];
  focusSlug: string;
  overrides?: Record<string, any>;
}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: o.slugs,
    bossElement: 'Fire',
    focusSlug: o.focusSlug,
    overrides: o.overrides,
    cfg: { bossRange: 'near', onEvent: (e) => events.push(e) },
  });
  const casts = (slug: string): BurstCast[] =>
    events.filter(
      (e): e is BurstCast => e.kind === 'burstCast' && e.slug === slug
    );
  const allCasts = (): BurstCast[] =>
    events.filter((e): e is BurstCast => e.kind === 'burstCast');
  const shots = (slug: string): Shot[] =>
    events.filter((e): e is Shot => e.kind === 'shot' && e.slug === slug);
  const applies = (stat: string, value: number): BuffApply[] =>
    events.filter(
      (e): e is BuffApply =>
        e.kind === 'buffApply' && e.stat === stat && e.value === value
    );
  const fbStarts = (): number[] =>
    events.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame);
  const fbEnds = (): number[] =>
    events.filter((e) => e.kind === 'fullBurstEnd').map((e) => e.frame);
  return { events, res, totals: totals(res), casts, allCasts, shots, applies, fbStarts, fbEnds };
}

const FIX_A = { slugs: [RWS, 'crown', 'ada'], focusSlug: 'ada' };
const FIX_B = { slugs: [RWS, 'liter', 'crown', 'ada'], focusSlug: 'ada' };

/** FIX_A slot map: rws 0 / crown 1 / ada 2. FIX_B adds liter at 1. */
const RWS_A = 0;

// ---- counterfactuals (nearest wrong models) ----------------------------------------------------

/** RW1 reference: the S1 DEF line removed (totals must be byte-identical — defPct is inert). */
const rwsNoS1Def = withPatchedOverride(RWS, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'defPct')
  );
  if (ov.skill1.length !== before - 1) {
    throw new Error('rws S1 defPct block missing — fixture is stale');
  }
});
/** RW1 counterfactual: the S1 DEF line keyed to Full Burst ENTRY (window cadence, not magazine). */
const rwsS1OnFbEnter = withPatchedOverride(RWS, (ov) => {
  const b = ov.skill1.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'defPct')
  );
  if (!b) {
    throw new Error('rws S1 defPct block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
/** RW2 reference: the Shopping line removed (all three stageEnter blocks + their pool mirrors). */
const rwsNoShopping = withPatchedOverride(RWS, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'defPct')
  );
  if (ov.skill2.length !== before - 3) {
    throw new Error('rws S2 Shopping blocks missing — fixture is stale');
  }
});
/** RW2 counterfactual: Shopping keyed to her OWN burst casts only (1 stack/chain, cap unreachable
 *  in a 3-cast chain). Pool-mirror blocks are retriggered alongside to keep the gate comparison
 *  isolated to the buff's cadence. */
const rwsShoppingOwnBurst = withPatchedOverride(RWS, (ov) => {
  const blocks = ov.skill2.filter((b: any) =>
    b.effects.some((e: any) => e.stat === 'defPct')
  );
  if (blocks.length !== 3) {
    throw new Error('rws S2 Shopping blocks missing — fixture is stale');
  }
  for (const b of blocks) {
    b.trigger = { kind: 'burstCast' };
  }
});
/** RW3 counterfactual: the gate removed (fires on EVERY FB end, incl. the first, pool < 4). */
const rwsGaugeUngated = withPatchedOverride(RWS, (ov) => {
  const b = ov.skill2.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'burstGenPct')
  );
  if (!b || !b.resourceGate) {
    throw new Error('rws S2 gated burstGenPct block missing — fixture is stale');
  }
  delete b.resourceGate;
});
/** RW4 reference: the burst reload-speed line removed (totals must move — reload economy). */
const rwsNoReloadBuff = withPatchedOverride(RWS, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'reloadSpeedPct')
  );
  if (ov.burst.length !== before - 1) {
    throw new Error('rws burst reloadSpeedPct block missing — fixture is stale');
  }
});
/** RW4 counterfactual: the reload-speed buff mis-targeted as self-only. */
const rwsReloadSelfOnly = withPatchedOverride(RWS, (ov) => {
  const b = ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'reloadSpeedPct')
  );
  if (!b) {
    throw new Error('rws burst reloadSpeedPct block missing — fixture is stale');
  }
  b.target = { kind: 'self' };
});
/** RW5 reference: the burst re-entry line removed (stage advances after her). */
const rwsNoReenter = withPatchedOverride(RWS, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'reenterStage')
  );
  if (ov.burst.length !== before - 1) {
    throw new Error('rws burst reenterStage block missing — fixture is stale');
  }
});
/** RW6 isolation: crown's own S2 Relax self-heal (every 860 hits) also fires her recovery
 *  consumer. Patching it out leaves rupee-winter-shopper's burst heal as the ONLY possible
 *  recovery source, so any crown-consumer firing on an rws cast frame is provably an
 *  allies-widened heal (the S2b reviewer's target-set trap). */
const crownNoHeal = withPatchedOverride('crown', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'heal')
  );
  if (ov.skill2.length === before) {
    throw new Error('crown S2 heal block missing — fixture is stale');
  }
});
/** RW6 counterfactual: the self heal mis-widened to ALL allies (feeds crown's recovery
 *  consumer on every rws cast — the nearest-wrong of the 'Affects self' sub-block). */
const rwsHealOnAllies = withPatchedOverride(RWS, (ov) => {
  const b = ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.kind === 'heal')
  );
  if (!b) {
    throw new Error('rws burst heal block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});

// ---- spec --------------------------------------------------------------------------------------

describe('rupee-winter-shopper kit spec', () => {
  it('RW1 — S1: lastBullet → all allies DEF ▲19.02% for 5s at the magazine cadence (inert)', () => {
    const s = run(FIX_A);
    const rwsShots = s.shots(RWS);
    expect(rwsShots.length).toBeGreaterThan(120); // fixture sanity: several magazines
    // last bullet of each exhausted magazine (ammo 60, no partial-reload source in her kit)
    const lastShotFrames = new Set(
      rwsShots.filter((_, i) => (i + 1) % 60 === 0).map((x) => x.frame)
    );
    expect(lastShotFrames.size).toBeGreaterThanOrEqual(2);
    const applied = s.applies('defPct', 19.02).filter((b) => b.casterIdx === RWS_A);
    // one apply per ally (3) per magazine-out proc
    expect(applied.length).toBe(lastShotFrames.size * 3);
    for (const b of applied) {
      expect(lastShotFrames.has(b.frame)).toBe(true); // magazine cadence, not burst/FB cadence
      expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
    }
    // reaches all three allies (incl. herself) per proc
    const perFrame = new Map<number, Set<string | null>>();
    for (const b of applied) {
      (
        perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!
      ).add(b.targetSlug);
    }
    for (const [, holders] of perFrame) {
      expect(holders).toEqual(new Set([RWS, 'crown', 'ada']));
    }
    // INERT: defPct has no damage consumer — removing it changes NO unit's total by a point
    const removed = run({ ...FIX_A, overrides: { [RWS]: rwsNoS1Def } });
    expect(s.totals).toEqual(removed.totals);
    // counterfactual: a fullBurstEnter key lands on window opens, never on last-shot frames
    const cf = run({ ...FIX_A, overrides: { [RWS]: rwsS1OnFbEnter } });
    const cfApplied = cf.applies('defPct', 19.02).filter((b) => b.casterIdx === RWS_A);
    expect(cfApplied.length).toBeGreaterThan(0);
    expect(cfApplied.every((b) => lastShotFrames.has(b.frame))).toBe(false);
    const starts = new Set(cf.fbStarts());
    expect(cfApplied.every((b) => starts.has(b.frame))).toBe(true);
  });

  it('RW2 — S2: Shopping DEF ▲1.33% on EVERY ally burst cast, stacks to 4, 20s, all allies (inert)', () => {
    // FIX_B: 4 ally casts per chain → the ramp reaches the 4-cap inside chain 1
    const s = run(FIX_B);
    const allyCastFrames = new Set(s.allCasts().map((c) => c.frame));
    expect(allyCastFrames.size).toBeGreaterThanOrEqual(8); // fixture sanity: ≥2 chains
    const applied = s.applies('defPct', 1.33).filter((b) => b.casterIdx === RWS_A);
    // one apply per ally (4) per ally cast
    expect(applied.length).toBe(allyCastFrames.size * 4);
    for (const b of applied) {
      expect(allyCastFrames.has(b.frame)).toBe(true); // fires on every ally's cast frame
      expect(b.expiresFrame! - b.frame).toBe(20 * FPS);
      expect(b.maxStacks).toBe(4);
      expect(b.stacks).toBeGreaterThanOrEqual(1);
      expect(b.stacks).toBeLessThanOrEqual(4);
    }
    // the ramp reaches the cap within a chain (4 casts ≥ 4 stacks) — the gate's real condition
    expect(Math.max(...applied.map((b) => b.stacks))).toBe(4);
    // reaches all four allies per cast
    const perFrame = new Map<number, Set<string | null>>();
    for (const b of applied) {
      (
        perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!
      ).add(b.targetSlug);
    }
    for (const [, holders] of perFrame) {
      expect(holders).toEqual(new Set([RWS, 'liter', 'crown', 'ada']));
    }
    // INERT: defPct has no damage consumer — removing it changes NO unit's total by a point
    const removed = run({ ...FIX_B, overrides: { [RWS]: rwsNoShopping } });
    expect(s.totals).toEqual(removed.totals);
    // counterfactual: an owner-burstCast key fires ONLY on her own cast frames — never on
    // teammates' casts, so the per-cast frame set collapses to her casts (all three retargeted
    // blocks fire per own cast; the discrimination is the frame SET, not just the count)
    const cf = run({ ...FIX_B, overrides: { [RWS]: rwsShoppingOwnBurst } });
    const cfApplied = cf.applies('defPct', 1.33).filter((b) => b.casterIdx === RWS_A);
    expect(cfApplied.length).toBeGreaterThan(0);
    const rwsCastFrames = new Set(s.casts(RWS).map((c) => c.frame));
    expect(cfApplied.every((b) => rwsCastFrames.has(b.frame))).toBe(true);
    // strictly fewer distinct stack-granting frames than the any-ally-cast model
    expect(new Set(cfApplied.map((b) => b.frame)).size).toBeLessThan(
      allyCastFrames.size
    );
  });

  it('RW3 — S2: Shopping-max gate → burstGenPct ▲7.9% for 5s on FB END, silent before the cap', () => {
    const s = run(FIX_A);
    const ends = s.fbEnds();
    expect(ends.length).toBeGreaterThanOrEqual(3); // fixture sanity: FBs happen
    const applied = s.applies('burstGenPct', 7.9).filter((b) => b.casterIdx === RWS_A);
    expect(applied.length).toBeGreaterThan(0);
    // FIX_A ramps the pool 3→(cap 4): the FIRST FB end predates the cap and must be silent
    expect(applied.every((b) => b.frame !== ends[0])).toBe(true);
    // every later FB end fires all-allies, frame-exact with the fullBurstEnd event, for 5s
    for (const end of ends.slice(1)) {
      const atEnd = applied.filter((b) => b.frame === end);
      expect(atEnd.length, `FB end ${end} missing the gated grant`).toBe(3);
      for (const b of atEnd) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
    }
    // counterfactual: ungated fires on the FIRST FB end too (pool 3 < 4 there)
    const cf = run({ ...FIX_A, overrides: { [RWS]: rwsGaugeUngated } });
    const cfApplied = cf.applies('burstGenPct', 7.9).filter((b) => b.casterIdx === RWS_A);
    expect(cfApplied.some((b) => b.frame === cf.fbEnds()[0])).toBe(true);
    expect(cfApplied.length).toBeGreaterThan(applied.length);
  });

  it('RW4 — burst: Reload Speed ▲63.17% for 10s reaches ALL allies on every cast (damage-relevant)', () => {
    const s = run(FIX_A);
    const castFrames = s.casts(RWS).map((c) => c.frame);
    expect(castFrames.length).toBeGreaterThanOrEqual(3); // fixture sanity: she bursts
    const applied = s.applies('reloadSpeedPct', 63.17).filter((b) => b.casterIdx === RWS_A);
    expect(applied.length).toBe(castFrames.length * 3);
    for (const b of applied) {
      expect(castFrames).toContain(b.frame); // frame-exact with HER burst cast
      expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    }
    const perFrame = new Map<number, Set<string | null>>();
    for (const b of applied) {
      (
        perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!
      ).add(b.targetSlug);
    }
    for (const [, holders] of perFrame) {
      expect(holders).toEqual(new Set([RWS, 'crown', 'ada']));
    }
    // DAMAGE-RELEVANT: removing the reload economy changes totals (byte-different, not similar)
    const removed = run({ ...FIX_A, overrides: { [RWS]: rwsNoReloadBuff } });
    expect(s.totals).not.toEqual(removed.totals);
    // counterfactual: self-only reaches one holder per cast, not three
    const cf = run({ ...FIX_A, overrides: { [RWS]: rwsReloadSelfOnly } });
    const cfApplied = cf.applies('reloadSpeedPct', 63.17).filter((b) => b.casterIdx === RWS_A);
    expect(cfApplied.length).toBe(castFrames.length);
    expect([...new Set(cfApplied.map((b) => b.targetSlug))]).toEqual([RWS]);
  });

  it('RW5 — burst: re-enters Burst Stage 1 → a second B1 casts inside the same chain', () => {
    const chain1 = (overrides?: Record<string, any>) => {
      const r = run({ ...FIX_B, overrides });
      const rws1 = r.casts(RWS)[0];
      const liter1 = r.casts('liter')[0];
      const crown1 = r.casts('crown')[0];
      const ada1 = r.casts('ada')[0];
      expect(rws1).toBeDefined();
      expect(crown1).toBeDefined();
      expect(ada1).toBeDefined();
      expect(rws1.stage).toBe(1);
      expect(crown1.stage).toBe(2);
      expect(ada1.stage).toBe(3);
      return { rws1, liter1, crown1 };
    };
    // shipped: liter fills stage 1 in chain 1, exactly one stage-gap (30f) after rws
    const s = chain1();
    expect(s.liter1).toBeDefined();
    expect(s.liter1!.stage).toBe(1);
    expect(s.liter1!.frame - s.rws1.frame).toBe(30); // STAGE_CAST_GAP_FRAMES, no rng (unseeded)
    expect(s.liter1!.frame).toBeLessThan(s.crown1.frame);
    // counterfactual: stage advances after rws → liter gets no chain-1 stage-1 window
    const c = chain1({ [RWS]: rwsNoReenter });
    const literInChain1 =
      c.liter1 !== undefined && c.liter1.frame < c.crown1.frame;
    expect(literInChain1).toBe(false);
    // FIX_A is the real-kit no-op case (no second B1): rws is the ONLY stage-1 caster, and
    // removing the re-entry changes NOTHING — byte-identical totals and identical cast frames
    // (the engine's stage-hold is inert when no second eligible B1 exists to fill it)
    const a = run(FIX_A);
    const stage1 = a.allCasts().filter((x) => x.stage === 1);
    expect(stage1.length).toBeGreaterThan(0);
    expect([...new Set(stage1.map((x) => x.slug))]).toEqual([RWS]);
    const noReenter = run({ ...FIX_A, overrides: { [RWS]: rwsNoReenter } });
    expect(noReenter.totals).toEqual(a.totals);
    expect(noReenter.allCasts().map((c) => `${c.slug}@${c.frame}`)).toEqual(
      a.allCasts().map((c) => `${c.slug}@${c.frame}`)
    );
  });

  it('RW6 — closed effect set: exactly {defPct, burstGenPct, reloadSpeedPct}; no taunt/heal channel', () => {
    // The taunt has no engine primitive and the self heal is event-unobservable (no 'heal'
    // SimEvent kind; recovery events reach only her, and she has no recovery trigger) — so her
    // kit may surface ONLY the three encoded buff stats, nothing standing in for either.
    const s = run(FIX_B);
    const fromHer = new Set(
      s.events
        .filter(
          (e): e is BuffApply =>
            e.kind === 'buffApply' && e.casterIdx === RWS_A
        )
        .map((b) => b.stat)
    );
    expect([...fromHer].sort()).toEqual([
      'burstGenPct',
      'defPct',
      'reloadSpeedPct',
    ]);
    // and no damage attributed to her skill slots (her kit carries no hit: S1/S2 are pure buffs)
    const herSkillDamage = s.events.filter(
      (e) =>
        e.kind === 'damage' &&
        e.slug === RWS &&
        (e.srcSlot === 'skill1' || e.srcSlot === 'skill2' || e.srcSlot === 'burst')
    );
    expect(herSkillDamage).toEqual([]);
  });

  it('RW7 — burst heal targets SELF ONLY: crown\'s recovery consumer is silent on her cast frames', () => {
    // The heal itself is event-unobservable (RW6 header), but its TARGET SET is not: an
    // allies-widened heal would pump recovery events into crown's "when recovery takes effect"
    // consumer (attackDamagePct 20.99 from crown's slot), firing on/after every rws cast frame.
    // Crown's own self-heal is patched out (crownNoHeal) so rws's heal is the only candidate
    // recovery source — the helm-H8 / awb-A7 isolation pattern, run inverted.
    const CROWN_A = 1; // FIX_A slot map: rws 0 / crown 1 / ada 2
    const isolated = (rwsOverride?: any) => {
      const overrides: Record<string, any> = { crown: crownNoHeal };
      if (rwsOverride) {
        overrides[RWS] = rwsOverride;
      }
      const r = run({ ...FIX_A, overrides });
      const crownConsumerFrames = [
        ...new Set(
          r.applies('attackDamagePct', 20.99)
            .filter((b) => b.casterIdx === CROWN_A)
            .map((b) => b.frame)
        ),
      ];
      const castFrames = r.casts(RWS).map((c) => c.frame);
      expect(castFrames.length).toBeGreaterThanOrEqual(3); // fixture sanity: she bursts
      return { crownConsumerFrames, castFrames };
    };
    // shipped: with crown's own heal removed, her consumer NEVER fires (no recovery source
    // reaches crown at all) — in particular not in the 10s after any rws cast
    const s = isolated();
    expect(s.crownConsumerFrames).toEqual([]);
    // counterfactual: an allies-widened heal fires crown's consumer after every rws cast
    const cf = isolated(rwsHealOnAllies);
    expect(cf.crownConsumerFrames.length).toBeGreaterThan(0);
    const hits = cf.castFrames.filter((f) =>
      cf.crownConsumerFrames.some((g) => g >= f && g <= f + 10 * FPS)
    );
    expect(hits.length).toBe(cf.castFrames.length);
  });
});
