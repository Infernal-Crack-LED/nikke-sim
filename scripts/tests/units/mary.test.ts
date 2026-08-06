// PER-UNIT KIT SPEC — `mary` (Mary, Supporter/SG/Water, Burst I, cd 40s, ammo 9,
// hitsPerShot 10, reloadFrames 111). Kit-autonomy gauntlet 2026-08-05, test-first.
// SLUG DISAMBIGUATION: base unit `mary` (SG/Water) — NOT the variant `mary-bay-goddess`
// (SR/Water, aka "mbg"). lint-slug-disambiguation flags ANY bare "Mary"/"mary" token for
// this pair (the base unit has no approved nickname), so the confirmation is recorded
// here: every assertion in this file is about the SG healer, slug `mary`.
//
// One assertion group per KIT LINE (L1..L4 below), asserted against the SHIPPED override
// loaded from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest
// wrong model each assertion must discriminate against) and to ISOLATE one of her two heal
// channels from the other — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.mary.skills):
//   S1 ■ last bullet hits the target → 1 ally with the lowest HP%:
//        recovers 8.4% of the skill user's final Max HP as HP                          [L1]
//   S2 ■ entering Full Burst → all allies: Incoming healing ▲23.78% for 15 sec          [L2]
//   BU ■ all allies: recovers 39.6% of the skill user's final Max HP as HP              [L3]
//      ■ when above 50% HP → all allies: DEF ▲19.8% for 10 sec                          [L4]
//
// Line dispositions:
//   L1 ENACTED (damage-inert, observable) — trigger lastBullet (per emptied 9-shell
//      magazine), target alliesLowestHp count:1, heal ticks:1. v1 has NO HP pool: the
//      heal effect emits a RECOVERY event with no HP amount (helm H2 precedent 'a heal
//      is an event, not a number'), so the 8.4%-of-final-Max-HP magnitude is NOT
//      numerically modeled — the event cadence is. 'Lowest HP%' is indeterminate without
//      an HP pool and resolves to the leftmost ally — the engine's documented stand-in
//      for alliesLowestHp (types.ts). The fixture puts crown leftmost (slot 0) so the
//      stand-in target IS the fixture's recovery consumer and the channel is observable.
//   L2 UNMODELED — 'Incoming healing ▲' has nothing to amplify: no incomingHealingPct
//      StatKey exists and there is no HP pool for healing received to scale (flora S1 /
//      marciana S1 / sakura-suzuhara L2 precedent — doubly inert, damage-neutral). Pinned
//      only by the negative assertion: NOTHING may come out of her skill2 slot.
//   L3 ENACTED (damage-inert, observable) — trigger burstCast (HER cast; she is Burst I —
//      keying to fullBurstEnter would heal on rotations another Burst I opened, pinned in
//      the contention arm), target allies (self-inclusive), heal ticks:1 (the line carries
//      no duration/interval clause — a single instant recovery, NOT a HoT). The 39.6%
//      magnitude is not numerically modeled (no HP pool) — only the event is.
//   L4 ENACTED (damage-inert, observable) — the kit's 'when above 50% HP' status gate is
//      a DERIVED-DETERMINISTIC PROXY collapse: v1 models no HP pool and no incoming damage
//      (immortal units), so every unit's HP fraction is permanently 100% > 50% and the
//      gate is always satisfied — the line is unconditional on burstCast (flora's
//      stage-enter proxy is the same argument shape). DEF ▲19.8% is plain target-scaled
//      defPct (no 'of the skill user's DEF' qualifier — unlike marciana's caster-scaled
//      line, no approximation caveat). defPct is offensively INERT in v1 (StatKey doc),
//      pinned damage-neutral here. Whether the game reads the gate on the CASTER's HP or
//      each TARGET's HP is unobservable in v1 — both readings collapse to the same
//      encoding while nobody takes damage.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model
// gates nothing):
//   L1  nearest-wrong triggers: shotFired (fires every pull — 9x over-fire on an ammo-9
//       SG), burstCast (fires ~4x per fight instead of once per magazine), a t=0 passive
//       (fires once, frame 0). Pinned against her own shot log: one recovery firing per
//       shot with ammoAfter 0, on that shot's frame, never on any other frame.
//   L3  nearest-wrong: (a) burst removed → zero cast-anchored recovery; (b) fullBurstEnter
//       → recovery lands on the FB-window start frame (~chain-length AFTER her cast) and,
//       in the two-B1 contention comp, on liter-opened rotations she never cast. Both arms
//       pinned. The heal is instant (ticks:1): collapsing/expanding the tick count moves
//       the event count — pinned at exactly one firing per target per cast.
//   L4  nearest-wrong: (a) line dropped as 'gate unmodelable' → zero defPct grants;
//       (b) encoding it into a LIVE damage channel (ally damageTakenPct or an ATK stat)
//       → totals move; shipped must be byte-identical to the line-removed totals.
//
// Fixture: [crown (B2/20s), mary (B1/40s), ada (B3/40s)] boss Fire — one caster per burst
// stage so the chain runs and her Burst I casts (a lone B1 can never open a Full Burst).
// Crown is BOTH the leftmost ally (the alliesLowestHp stand-in target for L1) and the
// fixture's recovery consumer (her S2 'recovery → all allies attackDamagePct 20.99/7s',
// value-distinct from her own burst's 36.24 grant — attribution is clean). Crown's own
// hitCount:860 self-heal would also emit recovery events late in the fight, so it is
// patched out (helm-test crownNoHeal pattern) — every 20.99 buffApply in the log is then
// attributable to mary's heals. ada/liter carry no heal or recovery blocks (verified).
// Gauge note: mary has no datamined row in data/gauge-per-shot.json; the engine's SG
// fallback (modal 400) equals her datamined target_burst_energy_pershot 4000 → 400.0, so
// the fallback IS her value (helm H3 pattern: gauge is carried by data, not the override).
// Deterministic (no seed); assertions are event-log based, except the damage-neutrality
// arms which compare totals between shipped and a counterfactual.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const SLUG = 'mary';
/** Main fixture slot order: crown 0 / mary 1 / ada 2. */
const CROWN = 0;
const MARY = 1;
const FPS = 60;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type FullBurstStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

/** Crown's S2 hitCount:860 self-heal removed — see file header (isolation, helm pattern). */
const crownNoHeal = withPatchedOverride('crown', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'heal')
  );
  if (ov.skill2.length === before) {
    throw new Error('crown S2 heal block missing — fixture is stale');
  }
});

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['crown', SLUG, 'ada'],
    bossElement: 'Fire',
    overrides: { crown: crownNoHeal, ...overrides },
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const maryShots = (events: SimEvent[]): Shot[] =>
  events.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
/** The pulls that emptied her magazine — the frame her lastBullet trigger fires. */
const maryLastBullets = (events: SimEvent[]): Shot[] =>
  maryShots(events).filter((s) => !s.unlimitedAmmo && s.ammoAfter === 0);
const maryCasts = (events: SimEvent[]): BurstCast[] =>
  events.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.unitIdx === MARY
  );
const fbStarts = (events: SimEvent[]): FullBurstStart[] =>
  events.filter((e): e is FullBurstStart => e.kind === 'fullBurstStart');
/** Crown's recovery-triggered team ATK buff — one firing = one frame, one buffApply per
 *  ally in the comp (3 here). Value-distinct from crown's own 36.24 burst grant. */
const crownRecoveryBuffs = (events: SimEvent[]): BuffApply[] =>
  events.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' &&
      e.casterIdx === CROWN &&
      e.stat === 'attackDamagePct' &&
      e.value === 20.99
  );
/** Firings = distinct frames of crown's recovery buff (one firing per recovery event). */
const recoveryFrames = (events: SimEvent[]): number[] =>
  [...new Set(crownRecoveryBuffs(events).map((b) => b.frame))].sort(
    (a, b) => a - b
  );
/** L4 channel: mary-granted DEF buffs. */
const maryDefBuffs = (events: SimEvent[]): BuffApply[] =>
  events.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' && e.stat === 'defPct' && e.casterIdx === MARY
  );
/** L2 negative pin: anything at all coming out of mary's skill2 slot. */
const marySkill2Buffs = (events: SimEvent[]): BuffApply[] =>
  events.filter(
    (e): e is BuffApply => e.kind === 'buffApply' && e.key.startsWith(`${MARY}:skill2:`)
  );

// Counterfactuals on mary's OWN override are lazy — before S3 there is no override on
// disk, so every test must fail on its own assertion (a module-load throw would collapse
// the whole suite into one error and hide the per-line RED state).
const maryPatch = (mutate: (ov: any) => void) => () =>
  withPatchedOverride(SLUG, mutate);

const hasHeal = (b: any) => b.effects.some((e: any) => e.kind === 'heal');
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.kind === 'buff' && e.stat === stat);

/** L1 isolation: her burst heal removed, so every remaining recovery firing is S1's. */
const maryNoBurstHeal = maryPatch((ov) => {
  const had = ov.burst.some((b: any) => hasHeal(b));
  if (!had) {
    throw new Error('mary burst heal block missing — fixture is stale');
  }
  ov.burst = ov.burst.map((b: any) => ({
    ...b,
    effects: b.effects.filter((e: any) => e.kind !== 'heal'),
  }));
});
/** L3 isolation: her S1 heal removed, so every remaining recovery firing is the burst's. */
const maryNoS1Heal = maryPatch((ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasHeal(b));
  if (ov.skill1.length === before) {
    throw new Error('mary S1 heal block missing — fixture is stale');
  }
});
/** L1 reference: S1 removed entirely (nearest-wrong: no per-magazine channel at all). */
const maryNoS1 = maryPatch((ov) => {
  ov.skill1 = [];
});
/** L1 counterfactual: the same heal on EVERY trigger pull. */
const maryS1ShotFired = maryPatch((ov) => {
  const b = ov.skill1.find((x: any) => hasHeal(x));
  if (!b) {
    throw new Error('mary S1 heal block missing — fixture is stale');
  }
  b.trigger = { kind: 'shotFired' };
});
/** L1 counterfactual: the heal keyed to her burst casts instead of her magazine. */
const maryS1BurstCast = maryPatch((ov) => {
  const b = ov.skill1.find((x: any) => hasHeal(x));
  if (!b) {
    throw new Error('mary S1 heal block missing — fixture is stale');
  }
  b.trigger = { kind: 'burstCast' };
});
/** L3 reference: the whole burst slot removed. */
const maryNoBurst = maryPatch((ov) => {
  ov.burst = [];
});
/** L4 reference: the DEF line dropped ('gate unmodelable' nearest-wrong). */
const maryNoDef = maryPatch((ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'defPct'));
  if (ov.burst.length === before) {
    throw new Error('mary burst defPct block missing — fixture is stale');
  }
});

describe('mary kit spec', () => {
  // ---- L1: S1 'last bullet hits → 1 lowest-HP ally recovers 8.4% of final Max HP' ----

  it('L1 fires once per emptied magazine, anchored to her last-bullet frame', () => {
    const { events } = run({ [SLUG]: maryNoBurstHeal() });
    const lastBullets = maryLastBullets(events);
    expect(lastBullets.length).toBeGreaterThan(3); // SG cadence sanity over 180s
    const frames = recoveryFrames(events);
    expect(frames).toEqual(lastBullets.map((s) => s.frame).sort((a, b) => a - b));
    // exactly one recovery event (→ 3 ally buffApplies) per firing frame — ticks:1.
    for (const f of frames) {
      expect(
        crownRecoveryBuffs(events).filter((b) => b.frame === f).length
      ).toBe(3);
    }
    // accrues to the first emptied magazine — never a t=0 passive grant.
    expect(frames[0]).toBeGreaterThan(0);
  });

  it('L1 discriminates vs a shotFired trigger (9x over-fire on an ammo-9 SG)', () => {
    const shipped = run({ [SLUG]: maryNoBurstHeal() });
    const cf = run({
      [SLUG]: withPatchedOverride(SLUG, (ov) => {
        const noBurstHeal = maryNoBurstHeal();
        ov.burst = noBurstHeal.burst;
        const b = ov.skill1.find((x: any) => hasHeal(x));
        if (!b) {
          throw new Error('mary S1 heal block missing — fixture is stale');
        }
        b.trigger = { kind: 'shotFired' };
      }),
    });
    const shots = maryShots(cf.events).length;
    expect(recoveryFrames(cf.events).length).toBe(shots);
    expect(recoveryFrames(cf.events).length).toBeGreaterThan(
      recoveryFrames(shipped.events).length
    );
  });

  it('L1 discriminates vs a burstCast trigger (per-cast, not per-magazine)', () => {
    const shipped = run({ [SLUG]: maryNoBurstHeal() });
    const cf = run({
      [SLUG]: withPatchedOverride(SLUG, (ov) => {
        const noBurstHeal = maryNoBurstHeal();
        ov.burst = noBurstHeal.burst;
        const b = ov.skill1.find((x: any) => hasHeal(x));
        if (!b) {
          throw new Error('mary S1 heal block missing — fixture is stale');
        }
        b.trigger = { kind: 'burstCast' };
      }),
    });
    expect(recoveryFrames(cf.events).length).toBe(maryCasts(cf.events).length);
    expect(recoveryFrames(cf.events).length).not.toBe(
      recoveryFrames(shipped.events).length
    );
  });

  it('L1 removed → the per-magazine recovery stream disappears', () => {
    const { events } = run({
      [SLUG]: withPatchedOverride(SLUG, (ov) => {
        const noS1 = maryNoS1();
        const noBurstHeal = maryNoBurstHeal();
        ov.skill1 = noS1.skill1;
        ov.burst = noBurstHeal.burst;
      }),
    });
    expect(crownRecoveryBuffs(events).length).toBe(0);
  });

  // ---- L3: burst 'all allies recover 39.6% of the skill user's final Max HP' ----

  it('L3 she casts her Burst I and every cast fires exactly one recovery event', () => {
    const { events } = run({ [SLUG]: maryNoS1Heal() });
    const casts = maryCasts(events);
    expect(casts.length).toBeGreaterThanOrEqual(3); // 40s CD over 180s
    // instant heal (ticks:1): one firing on each cast frame, one buffApply per ally.
    expect(recoveryFrames(events)).toEqual(
      casts.map((c) => c.frame).sort((a, b) => a - b)
    );
    for (const c of casts) {
      expect(
        crownRecoveryBuffs(events).filter((b) => b.frame === c.frame).length
      ).toBe(3);
    }
  });

  it('L3 heals on HER CAST frame — before the Full Burst window opens, never on FB-start frames', () => {
    const { events } = run({ [SLUG]: maryNoS1Heal() });
    const casts = maryCasts(events);
    const starts = fbStarts(events);
    expect(starts.length).toBeGreaterThanOrEqual(3);
    // her cast precedes the FB window it opens (chain B1→B2→B3 takes frames).
    const opened = casts.filter((c) =>
      starts.some((s) => s.frame > c.frame && s.frame - c.frame <= 10 * FPS)
    );
    expect(opened.length).toBeGreaterThanOrEqual(3);
    for (const c of opened) {
      const s = starts.find((x) => x.frame > c.frame)!;
      expect(s.frame).toBeGreaterThan(c.frame);
    }
    // no recovery firing lands on an FB-start frame (a fullBurstEnter encoding would).
    const startFrames = new Set(starts.map((s) => s.frame));
    for (const f of recoveryFrames(events)) {
      expect(startFrames.has(f)).toBe(false);
    }
  });

  it('L3 burst removed → the cast-anchored recovery stream disappears', () => {
    const { events } = run({
      [SLUG]: withPatchedOverride(SLUG, (ov) => {
        const noS1 = maryNoS1Heal();
        const noBurst = maryNoBurst();
        ov.skill1 = noS1.skill1;
        ov.burst = noBurst.burst;
      }),
    });
    expect(crownRecoveryBuffs(events).length).toBe(0);
  });

  // ---- L2 negative pins: the UNMODELED incoming-healing line must produce NOTHING ----
  // Reviewer (S2b, claude-fable-5) reinforcement: the nearest-wrong is encoding the line
  // as a `heal` on fullBurstEnter, which would emit spurious recovery events every FB —
  // so pin BOTH the buff channel (no skill2-slot buffApply) AND the event channel (no
  // recovery firing on any FB-start frame; mary's burst heal fires on her CAST frame,
  // strictly earlier, so an FB-start firing can only come from a fullBurstEnter-keyed
  // recovery line).

  it('L2 nothing comes out of her skill2 slot at all', () => {
    const { events } = run();
    expect(marySkill2Buffs(events).length).toBe(0);
  });

  it('L2 no recovery event rides any Full Burst start frame (no FB-enter heal smuggled in)', () => {
    const { events } = run();
    const firingSet = new Set(recoveryFrames(events));
    for (const s of fbStarts(events)) {
      expect(firingSet.has(s.frame)).toBe(false);
    }
  });

  // ---- L4: burst 'when above 50% HP → all allies DEF ▲19.8% for 10 sec' ----

  it('L4 lands the exact kit numbers on every cast, on all allies (gate always satisfied)', () => {
    const { events } = run();
    const casts = maryCasts(events);
    const defs = maryDefBuffs(events);
    // the HP gate never blocks in v1 (nobody takes damage): one grant per ally per cast.
    expect(defs.length).toBe(casts.length * 3);
    for (const d of defs) {
      expect(d.value).toBe(19.8); // kit-text literal (Lv.10)
      expect(d.expiresFrame).not.toBeNull();
      expect(d.expiresFrame! - d.frame).toBe(10 * FPS); // 'for 10 sec'
    }
    // every cast frame carries grants for all three allies.
    for (const c of casts) {
      const atCast = defs.filter((d) => d.frame === c.frame);
      expect(atCast.map((d) => d.targetIdx).sort()).toEqual([0, 1, 2]);
    }
  });

  it('L4 is damage-neutral: defPct is inert in v1 (byte-identical totals without it)', () => {
    const shipped = run();
    const noDef = run({ [SLUG]: maryNoDef() });
    expect(maryDefBuffs(noDef.events).length).toBe(0);
    expect(noDef.totals).toEqual(shipped.totals);
  });

  // ---- B1-contention arm: burstCast vs fullBurstEnter identity (sakura-suzuhara /
  //      rumani pattern) — with a second Burst I (liter) in the team, some Full Bursts
  //      open without mary's cast, and her burst heal must NOT fire on those. ----

  const LITER = 2; // [crown, mary, liter, ada] — crown stays slot 0 (leftmost heal target)
  const N_ALLIES = 4; // contention fixture size: one buffApply per firing per ally

  function runContention(overrides: Record<string, any> = {}) {
    const events: SimEvent[] = [];
    const res = runComp({
      slugs: ['crown', SLUG, 'liter', 'ada'],
      bossElement: 'Fire',
      overrides: { crown: crownNoHeal, ...overrides },
      cfg: { onEvent: (e) => events.push(e) },
    });
    return { events, totals: totals(res) };
  }
  const literCasts = (events: SimEvent[]) =>
    events.filter(
      (e): e is BurstCast => e.kind === 'burstCast' && e.unitIdx === LITER
    ).length;
  /** Each FB, tagged with whether HER cast opened it (her stage-1 cast lands prior). */
  const openedBy = (events: SimEvent[]) => {
    const casts = maryCasts(events);
    return fbStarts(events).map((fb) => ({
      frame: fb.frame,
      hers: casts.some(
        (c) => fb.frame - c.frame >= 0 && fb.frame - c.frame <= 120
      ),
    }));
  };
  /** Instant heal: the whole observable sits ON the anchor frame. */
  const atFrame = (events: SimEvent[], frame: number) =>
    crownRecoveryBuffs(events).filter((b) => b.frame === frame).length;

  it('contention: burst heal anchors to HER casts (even broken-chain ones), never to liter-opened FBs', () => {
    const { events } = runContention();
    const casts = maryCasts(events);
    expect(casts.length).toBeGreaterThanOrEqual(1);
    expect(literCasts(events)).toBeGreaterThanOrEqual(1);
    // every one of her casts emits exactly one recovery event (→ 4 ally buffApplies).
    for (const c of casts) {
      expect(atFrame(events, c.frame)).toBe(N_ALLIES);
    }
    // she has casts that never became a Full Burst (broken chain) — the heal fired anyway.
    expect(casts.length).toBeGreaterThan(
      openedBy(events).filter((f) => f.hers).length
    );
    // no recovery event on any liter-opened FB frame.
    const literOpened = openedBy(events).filter((f) => !f.hers);
    expect(literOpened.length).toBeGreaterThanOrEqual(1);
    for (const fb of literOpened) {
      expect(atFrame(events, fb.frame)).toBe(0);
    }
  });

  it('contention: fullBurstEnter counterfactual heals on liter-opened rotations instead', () => {
    const shipped = runContention();
    const cf = runContention({
      [SLUG]: withPatchedOverride(SLUG, (ov) => {
        const b = ov.burst.find((x: any) => hasHeal(x));
        if (!b) {
          throw new Error('mary burst heal block missing — fixture is stale');
        }
        b.trigger = { kind: 'fullBurstEnter' };
      }),
    });
    // keyed to every team FB window — one instant heal (→ 4 buffApplies) per window.
    const fbs = openedBy(cf.events);
    expect(fbs.length).toBeGreaterThanOrEqual(3);
    for (const fb of fbs) {
      expect(atFrame(cf.events, fb.frame)).toBe(N_ALLIES);
    }
    // recovery events land on liter-opened rotations where shipped has NONE.
    const literOpened = fbs.filter((f) => !f.hers);
    expect(literOpened.length).toBeGreaterThanOrEqual(1);
    for (const fb of literOpened) {
      expect(atFrame(shipped.events, fb.frame)).toBe(0);
    }
    expect(crownRecoveryBuffs(cf.events).length).not.toBe(
      crownRecoveryBuffs(shipped.events).length
    );
  });
});
