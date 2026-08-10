// PER-UNIT KIT SPEC — `alice-wonderland-bunny` (Alice: Wonderland Bunny, Supporter/SMG/Water,
// Burst I, cd 40s, ammo 120, reloadFrames 81, RoF 1440; variant of base `alice` — a different
// unit, SR/Fire). Kit-autonomy gauntlet 2026-07-28, test-first spec.
//
// One assertion group per KIT LINE (A1..A8 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) and to silence crown's own Relax self-heal so every
// recovery firing in fixture A is attributable to THIS unit (the blocks under test are untouched).
//
// Kit (data/characters.json → characters['alice-wonderland-bunny'].skills, max level):
//   S1 ■ after 60 normal attacks → all allies: Recovers 7.4% of her final Max HP as HP          [A1]
//      ■ (same activation) Carrot Party: Damage to Interruption Parts ▲2%, stacks 5×, 5 sec      [A2]
//      ■ after 90 normal attacks → all Water Code allies: Stack count of buffs ▲ 1               [A3 UNMODELED]
//   S2 ■ after Full Burst ends → all allies: Burst Gauge filling speed ▲10% for 5 sec            [A4]
//      ■ entering Full Burst → all allies: Max Ammunition Capacity ▲40% for 15 sec               [A5]
//      ■ (same activation) Reload 40%                                                            [A5]
//   BU ■ all allies: Re-enters Burst Stage 1                                                     [A6]
//      ■ all allies: Restores 27% of her final Max HP as HP                                      [A7]
//      ■ when Carrot Party is at max stacks → all allies: Incoming healing ▲150% for 15 sec      [A8 UNMODELED]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   A1  the heal is an EVENT, not a number (no HP pool at scope): its only observable is crown's
//       "when recovery takes effect" consumer (team Attack Damage ▲20.99%). Pinned at HER hit
//       cadence — one firing per 60 normal attacks — which a burst-keyed heal (the nearest wrong
//       trigger) cannot produce: the counterfactual fires only on her ~4 burst frames and is
//       silent on every 60-hit frame. Crown's own Relax self-heal is patched out (crownNoHeal),
//       so every non-burst-frame recovery firing is attributable to this line.
//   A2  partsDamagePct is parsed but INERT in v1 (no parts on the boss): removing the line must
//       change NO unit's total by a single point (byte-identical, the helm H4 shape), while the
//       buff itself is live at the event level — value exactly 2 (SL10; not the SL1 0.89), 5s
//       duration, maxStacks 5, all three allies, and every application lands on a 60th-hit frame
//       (a burstCast-keyed counterfactual lands on burst frames instead).
//   A4  trigger is fullBurstEnd, NOT fullBurstEnter: the buff must land on the fullBurstEnd event
//       frame (~10s AFTER the window opens), which a fullBurstEnter encoding (the nearest wrong
//       trigger — the other S2 line's trigger) provably does not. Value 10, 5s, all allies.
//   A5  fullBurstEnter: maxAmmoPct 40 for 15s on all allies, frame-exact with the fullBurstStart
//       event; a self-only encoding (nearest wrong target) reaches 1 holder, not 3. The Reload 40%
//       is an instantReload (fraction 0.4 of max capacity — NOT a reload-SPEED buff): with it, she
//       runs fewer natural magazine reloads over the fight than without it.
//   A6  reenterStage holds stage 1 so a SECOND B1 casts in the same chain (the tia T6 shape): in
//       [awb, liter, crown, ada] the first chain is awb(S1) → liter(S1, exactly 30f later — the
//       frame-pinned STAGE_CAST_GAP) → crown(S2) → ada(S3). With reenterStage removed the stage
//       advances after awb and liter never reaches a stage-1 window in chain 1 (awb wins every
//       later leftmost tie). liter's chain-1 stage-1 cast is the observable.
//   A7  the burst heal reaches ALL allies: crown's recovery consumer fires on every awb burstCast
//       frame. A self-only encoding (nearest wrong target) leaves crown silent on the cast frames.
//
// UNMODELED (inert at the damage-sim scope; documented, no assertions):
//   - A3 "■ Activates after 90 normal attack(s). Affects all Water Code allies.\nStack count of
//     buffs ▲ 1." — MODELED 2026-08-09 as a +1 stack GRANT (hitCount:90 → Water allies →
//     addStack), aligning with the guilty/pepper/rupee/mica-snow-buddy majority reading of the
//     identical sentence; the 2026-07-28 cap-raise dissent stays on record in the override note.
//     Damage-inert here either way (the only stackable Water buff, Carrot Party, is
//     partsDamagePct — no parts on the v1 boss); A2 splits its bump events from the 60-hit procs.
//   - A8 "■ Activates when Carrot Party is at max stacks. Affects all allies.\nIncoming healing
//     ▲ 150% for 15 sec." — no healing-received channel exists (no HP pool) and the activation
//     condition references the inert Carrot Party stack count.
//   - A1/A7 heal AMOUNTS (7.4% / 27% of final Max HP): the heal effect emits recovery events with
//     no HP amount modeled (engine design); the event CADENCE and TARGETS are what is pinned.
//   - A2 damage CHANNEL: partsDamagePct is inert in v1 by engine design (no destructible parts);
//     the buff's existence/magnitude/stacking are pinned at the event level, its damage is not.
//
// Fixtures (all deterministic — no seed; bossRange 'near' pins the range band so no unhittable
// window can stretch a cast gap):
//   A = [alice-wonderland-bunny, crown, ada], boss Fire, focus ada — full B1/B2/B3 chain with
//       crown as the recovery consumer (her Relax self-heal patched out); 4 awb casts over 180s
//       (sole B1, 40s CD → chains at ~40/80/120/160).
//   B = [alice-wonderland-bunny, liter, crown, ada], boss Fire, focus ada — two B1s: the reentry
//       chain structure (A6).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const AWB = 'alice-wonderland-bunny';

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type Reload = Extract<SimEvent, { kind: 'reload' }>;

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
  const reloads = (slug: string): Reload[] =>
    events.filter((e): e is Reload => e.kind === 'reload' && e.slug === slug);
  return {
    events,
    res,
    totals: totals(res),
    casts,
    shots,
    applies,
    fbStarts,
    fbEnds,
    reloads,
  };
}

const FIX_A = { slugs: [AWB, 'crown', 'ada'], focusSlug: 'ada' };
const FIX_B = { slugs: [AWB, 'liter', 'crown', 'ada'], focusSlug: 'ada' };

/** Fixture A slot map: awb 0 / crown 1 / ada 2. */
const AWB_A = 0;
const CROWN_A = 1;

// ---- crown isolation ---------------------------------------------------------------------------
// Crown's S2 Relax self-heal (every 860 hits) also fires her own recovery consumer. Patching it
// out leaves THIS unit's heals as the only recovery source in fixture A, so every recovery firing
// is attributable to a line under test (the helm-test H8 isolation, same pattern).
const crownNoHeal = withPatchedOverride('crown', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'heal')
  );
  if (ov.skill2.length === before) {
    throw new Error('crown S2 heal block missing — fixture is stale');
  }
});

/** Fixture-A run with crown's self-heal always patched out. */
function runA(awbOverride?: any) {
  const overrides: Record<string, any> = { crown: crownNoHeal };
  if (awbOverride) {
    overrides[AWB] = awbOverride;
  }
  const r = run({ ...FIX_A, overrides });
  /** Distinct frames crown's recovery consumer fired (one firing = one frame, even though the
   *  block targets all allies and emits one buffApply per holder). */
  const recoveryFrames = [
    ...new Set(
      r.events
        .filter(
          (e): e is BuffApply =>
            e.kind === 'buffApply' &&
            e.casterIdx === CROWN_A &&
            e.stat === 'attackDamagePct' &&
            e.value === 20.99
        )
        .map((b) => b.frame)
    ),
  ].sort((a, b) => a - b);
  return { ...r, recoveryFrames };
}

// ---- counterfactuals (nearest wrong models) ----------------------------------------------------

/** A1 counterfactual: the S1 heal keyed to her burst cast (once per burst, not every 60 hits). */
const awbHealOnBurst = withPatchedOverride(AWB, (ov) => {
  const b = ov.skill1.find((b: any) =>
    b.effects.some((e: any) => e.kind === 'heal')
  );
  if (!b) {
    throw new Error('awb S1 heal block missing — fixture is stale');
  }
  b.trigger = { kind: 'burstCast' };
});
/** A2 reference: the Carrot Party line removed (totals must be byte-identical — inert). */
const awbNoCarrot = withPatchedOverride(AWB, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'partsDamagePct')
  );
  if (ov.skill1.length !== before - 1) {
    throw new Error('awb S1 partsDamagePct block missing — fixture is stale');
  }
});
/** A2 counterfactual: Carrot Party keyed to her burst cast instead of the 60-hit count. */
const awbCarrotOnBurst = withPatchedOverride(AWB, (ov) => {
  const b = ov.skill1.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'partsDamagePct')
  );
  if (!b) {
    throw new Error('awb S1 partsDamagePct block missing — fixture is stale');
  }
  b.trigger = { kind: 'burstCast' };
});
/** A4 counterfactual: the gauge-speed buff keyed to Full Burst ENTRY (lands ~10s early). */
const awbGaugeOnFbEnter = withPatchedOverride(AWB, (ov) => {
  const b = ov.skill2.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'burstGenPct')
  );
  if (!b) {
    throw new Error('awb S2 burstGenPct block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
/** A5 counterfactual: the max-ammo buff mis-targeted as self-only. */
const awbMaxAmmoSelfOnly = withPatchedOverride(AWB, (ov) => {
  const b = ov.skill2.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'maxAmmoPct')
  );
  if (!b) {
    throw new Error('awb S2 maxAmmoPct block missing — fixture is stale');
  }
  b.target = { kind: 'self' };
});
/** A5 reference: the Reload 40% instant-refill removed (more natural reloads without it). */
const awbNoInstantReload = withPatchedOverride(AWB, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'instantReload')
  );
  if (ov.skill2.length !== before - 1) {
    throw new Error('awb S2 instantReload block missing — fixture is stale');
  }
});
/** A6 reference: the burst re-entry line removed (stage advances after her). */
const awbNoReenter = withPatchedOverride(AWB, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'reenterStage')
  );
  if (ov.burst.length !== before - 1) {
    throw new Error('awb burst reenterStage block missing — fixture is stale');
  }
});
/** A7 counterfactual: the burst heal mis-targeted as self-only (crown never receives it). */
const awbBurstHealSelfOnly = withPatchedOverride(AWB, (ov) => {
  const b = ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.kind === 'heal')
  );
  if (!b) {
    throw new Error('awb burst heal block missing — fixture is stale');
  }
  b.target = { kind: 'self' };
});

// ---- spec --------------------------------------------------------------------------------------

describe('alice-wonderland-bunny kit spec', () => {
  it('A1 — S1: heal EVENT fires every 60 normal attacks (recovery cadence, not burst cadence)', () => {
    const s = runA();
    const awbCasts = s.casts(AWB);
    expect(awbCasts.length).toBeGreaterThanOrEqual(3); // fixture sanity: she bursts
    const nShots = s.shots(AWB).length;
    const burstFrames = new Set(awbCasts.map((c) => c.frame));
    const nonBurstFirings = s.recoveryFrames.filter((f) => !burstFrames.has(f));
    // one recovery firing per 60 hits (the burst heal owns the cast frames — A7)
    expect(nonBurstFirings.length).toBe(Math.floor(nShots / 60));
    // counterfactual: a burst-keyed heal is silent on every 60-hit frame
    const cf = runA(awbHealOnBurst);
    const cfBurstFrames = new Set(cf.casts(AWB).map((c) => c.frame));
    const cfNonBurst = cf.recoveryFrames.filter((f) => !cfBurstFrames.has(f));
    expect(cfNonBurst.length).toBe(0);
    expect(cf.recoveryFrames.length).toBeLessThan(s.recoveryFrames.length);
  });

  it('A2 — S1: Carrot Party is partsDamagePct 2 / 5s / maxStacks 5 on the 60-hit count, exactly inert', () => {
    const s = runA();
    const nShots = s.shots(AWB).length;
    const shotFrames = s.shots(AWB).map((x) => x.frame);
    const hitFrames = new Set(shotFrames.filter((_, i) => (i + 1) % 60 === 0));
    const allApplied = s
      .applies('partsDamagePct', 2)
      .filter((b) => b.casterIdx === AWB_A);
    // The 90-hit addStack grant (enacted 2026-08-09) bumps live pre-cap Carrot Party
    // instances on its own frames — split those from the 60-hit proc applications.
    const applied = allApplied.filter((b) => hitFrames.has(b.frame));
    const bumps = allApplied.filter((b) => !hitFrames.has(b.frame));
    // one application per ally (3) per 60-hit proc — plus at most one coincident
    // addStack bump per shared frame (shot 180 = LCM(60,90): both blocks fire there)
    const sharedFrames = shotFrames.filter(
      (_, i) => (i + 1) % 180 === 0
    ).length;
    expect(applied.length).toBeGreaterThanOrEqual(Math.floor(nShots / 60) * 3);
    expect(applied.length).toBeLessThanOrEqual(
      Math.floor(nShots / 60) * 3 + sharedFrames * 3
    );
    expect(
      bumps.length,
      'the 90-hit addStack must bump at least one live pre-cap instance'
    ).toBeGreaterThan(0);
    for (const b of applied) {
      expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      expect(b.maxStacks).toBe(5);
    }
    // reaches all three allies per proc
    const perFrame = new Map<number, Set<string | null>>();
    for (const b of applied) {
      (
        perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!
      ).add(b.targetSlug);
    }
    for (const [, holders] of perFrame) {
      expect(holders).toEqual(new Set([AWB, 'crown', 'ada']));
    }
    // stacks accrue past 1 (2.5s proc cadence < 5s duration) and never exceed the cap
    const stacksSeen = applied.map((b) => b.stacks);
    expect(Math.max(...stacksSeen)).toBeGreaterThanOrEqual(2);
    expect(Math.max(...stacksSeen)).toBeLessThanOrEqual(5);
    // value pin: the SL10 magnitude, not the SL1 value
    expect(s.applies('partsDamagePct', 0.89).length).toBe(0);
    // INERT: removing it changes NO unit's total by a single point (no parts on the v1 boss)
    const removed = runA(awbNoCarrot);
    expect(s.totals).toEqual(removed.totals);
    // counterfactual: a burstCast key lands on burst frames, not 60-hit frames
    const cf = runA(awbCarrotOnBurst);
    const cfApplied = cf
      .applies('partsDamagePct', 2)
      .filter((b) => b.casterIdx === AWB_A);
    expect(cfApplied.length).toBeGreaterThan(0);
    expect(cfApplied.every((b) => hitFrames.has(b.frame))).toBe(false);
  });

  it('A4 — S2: burstGenPct 10 for 5s on fullBurstEnd (not FB entry), all allies', () => {
    const s = runA();
    const ends = s.fbEnds();
    expect(ends.length).toBeGreaterThanOrEqual(3); // fixture sanity: FBs happen
    const applied = s
      .applies('burstGenPct', 10)
      .filter((b) => b.casterIdx === AWB_A);
    expect(applied.length).toBe(ends.length * 3); // all three allies, every FB end
    for (const b of applied) {
      expect(ends).toContain(b.frame); // frame-exact with the fullBurstEnd event
      expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
    }
    // counterfactual: fullBurstEnter lands on the window OPEN, ~10s before the end
    const cf = runA(awbGaugeOnFbEnter);
    const starts = cf.fbStarts();
    const cfApplied = cf
      .applies('burstGenPct', 10)
      .filter((b) => b.casterIdx === AWB_A);
    expect(cfApplied.length).toBeGreaterThan(0);
    expect(cfApplied.every((b) => starts.includes(b.frame))).toBe(true);
    expect(cfApplied.some((b) => cf.fbEnds().includes(b.frame))).toBe(false);
  });

  it('A5 — S2: maxAmmoPct 40 / 15s + Reload 40% instant refill on FB entry, all allies', () => {
    const s = runA();
    const starts = s.fbStarts();
    const ammo = s
      .applies('maxAmmoPct', 40)
      .filter((b) => b.casterIdx === AWB_A);
    expect(ammo.length).toBe(starts.length * 3);
    for (const b of ammo) {
      expect(starts).toContain(b.frame); // frame-exact with the fullBurstStart event
      expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
    }
    // counterfactual: self-only reaches one holder per FB, not three
    const cf = runA(awbMaxAmmoSelfOnly);
    const cfAmmo = cf
      .applies('maxAmmoPct', 40)
      .filter((b) => b.casterIdx === AWB_A);
    expect(cfAmmo.length).toBe(cf.fbStarts().length);
    expect([...new Set(cfAmmo.map((b) => b.targetSlug))]).toEqual([AWB]);
    // the Reload 40% is an instant refill: fewer natural magazine reloads with it than without
    const withRefill = s.reloads(AWB).length;
    const without = runA(awbNoInstantReload).reloads(AWB).length;
    expect(withRefill).toBeLessThan(without);
    // NEGATIVE pin (S2b blind reviewer): "Reload 40%." is NOT a reload-SPEED buff — the nearest
    // shared-prior misread. No reloadSpeedPct buffApply may be sourced from her kit at all.
    const fromHer = (b: BuffApply) => b.casterIdx === AWB_A;
    expect(s.applies('reloadSpeedPct', 40).filter(fromHer)).toEqual([]);
    expect(
      s.events.filter(
        (e): e is BuffApply =>
          e.kind === 'buffApply' &&
          e.stat === 'reloadSpeedPct' &&
          e.casterIdx === AWB_A
      )
    ).toEqual([]);
  });

  it('A6 — burst: re-enters Burst Stage 1 → a second B1 casts inside the same chain', () => {
    const chain1 = (overrides?: Record<string, any>) => {
      const r = run({ ...FIX_B, overrides });
      const awb1 = r.casts(AWB)[0];
      const liter1 = r.casts('liter')[0];
      const crown1 = r.casts('crown')[0];
      const ada1 = r.casts('ada')[0];
      expect(awb1).toBeDefined();
      expect(crown1).toBeDefined();
      expect(ada1).toBeDefined();
      expect(awb1.stage).toBe(1);
      expect(crown1.stage).toBe(2);
      expect(ada1.stage).toBe(3);
      return { awb1, liter1, crown1 };
    };
    // shipped: liter fills stage 1 in chain 1, exactly one stage-gap (30f) after awb
    const s = chain1();
    expect(s.liter1).toBeDefined();
    expect(s.liter1.stage).toBe(1);
    expect(s.liter1.frame - s.awb1.frame).toBe(30); // STAGE_CAST_GAP_FRAMES, no rng (unseeded)
    expect(s.liter1.frame).toBeLessThan(s.crown1.frame);
    // counterfactual: stage advances after awb → liter gets no chain-1 stage-1 window
    const c = chain1({ [AWB]: awbNoReenter });
    const literInChain1 =
      c.liter1 !== undefined && c.liter1.frame < c.crown1.frame;
    expect(literInChain1).toBe(false);
  });

  it('A7 — burst: heal reaches ALL allies (crown recovery fires on every awb cast frame)', () => {
    const s = runA();
    const castFrames = s.casts(AWB).map((c) => c.frame);
    expect(castFrames.length).toBeGreaterThanOrEqual(3);
    // every burstCast frame carries a recovery firing (the burst heal lands on the cast)
    for (const f of castFrames) {
      expect(s.recoveryFrames).toContain(f);
    }
    // counterfactual: a self-only heal leaves crown silent on (almost) every cast frame
    const cf = runA(awbBurstHealSelfOnly);
    const cfCastFrames = cf.casts(AWB).map((c) => c.frame);
    const cfHits = cfCastFrames.filter((f) => cf.recoveryFrames.includes(f));
    expect(cfHits.length).toBeLessThan(cfCastFrames.length);
  });
});
