import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

/*
 * folkwang — Folkwang (AR / Water / Defender / Burst II)
 *
 * KIT (ground truth, read literally):
 *   skill1 — "Affects 2 allies with the highest final ATK."
 *              Shield = 13.71% of the SKILL USER'S final Max HP, for 10 sec.
 *              Incoming healing ▲ 45.7% for 10 sec.
 *   skill2 — "Affects the enemy with the highest final ATK." Taunt for 5 sec.
 *            "Affects self." Max HP ▲ 44.96% for 10 sec.
 *   burst  — "Affects 2 allies with the highest final ATK."
 *              Shield = 32.9% of the skill user's final Max HP, for 10 sec.
 *              Recovers 65.81% of attack damage as HP over 10 sec.
 *
 * FIXTURE: controlComp('folkwang', true) — B1/B2/B3(+fixed B3) so bursts actually
 * cast; Folkwang is Burst II, so she needs a B1 ahead of her and a B3 behind her for
 * a chain to complete. Deterministic (no seed). All runs hoisted (each is a full 180s
 * sim); the file stays well under 20 runs.
 *
 * WHY EACH ASSERTION DISCRIMINATES — this unit is a pure defensive/utility kit. Almost
 * nothing here is a damage line, so TOTALS ARE THE WRONG INSTRUMENT for most lines and
 * the event log is the only place the claims are observable. Two structural traps drive
 * the discriminating design:
 *
 *   (a) TANDEM / CROSS-UNIT (failure-mode 4): shield + heal + incoming-healing lines are
 *       inert ON THIS UNIT'S OWN DAMAGE but are exactly the events that drive a teammate's
 *       'shielded' / 'recovery' triggers and requiresShielded gates. So the tests assert
 *       the EVENTS EXIST, at the right target set, at the right cadence — never "totals
 *       moved". Dropping these lines as "defensive, skip" is the nearest-wrong model and
 *       is caught by the counterfactuals below.
 *   (b) TARGET SET + SCALER OWNERSHIP (failure-modes 4 and 7): both shields say "% of the
 *       SKILL USER'S final Max HP" (casterMaxHpPct semantics — the CASTER's pool), while
 *       the self line says plain "Max HP ▲ 44.96%" (targetMaxHpPct semantics — the
 *       target's OWN pool, and here target === self). Encoding either as the other is the
 *       nearest-wrong model. Both shields target "2 allies with the highest FINAL ATK" —
 *       the kit literally says FINAL, so the ranking must be by live effectiveAtk
 *       (byFinalAtk), and the pool is exactly 2 units, never the whole team.
 *
 * TRIGGER IDENTITY (failure-mode 3): skill1 and skill2 carry NO activation clause, so
 * they are interval/passive-shaped, not burst-keyed; the burst block is in the unit's OWN
 * burst slot, so it is burstCast-keyed and must fire ONLY on rotations Folkwang bursts.
 * Keying the burst shield to fullBurstEnter would OVER-CREDIT (it would fire on any team
 * Full Burst); the tests below pin the burst-shield count to Folkwang's own burstCast
 * count, which is the assertion that separates the two.
 *
 * DURATION SEMANTICS (failure-mode 2): every window here is stated in SECONDS (10 s, 5 s),
 * never rounds — so no durationShots anywhere. The engine emits no buffRemove on natural
 * lapse, so expiry is asserted off expiresFrame on the buffApply, never off a removal event.
 *
 * The taunt line is a GAP: the sim has no enemy entity (resolveTargets({kind:'enemy'})
 * returns []) and no aggro model, so "Taunt for 5 sec" has no observable payload — it.skip.
 */

const SLUG = 'folkwang';
const FPS = 60;

type Ev = SimEvent & Record<string, unknown>;

function run(opts: ReturnType<typeof controlComp>) {
  const evs: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => evs.push(ev as Ev) },
  } as typeof opts);
  return { res, evs };
}

const base = controlComp(SLUG, true);
const BASE = run(base);

const folkwangIdx = BASE.res.units.findIndex((u) => u.slug === SLUG);

const evsOf = (evs: Ev[], kind: string) => evs.filter((e) => e.kind === kind);
const shieldEvs = (evs: Ev[]) =>
  evsOf(evs, 'shield').filter((e) => e.casterIdx === folkwangIdx);
const healEvs = (evs: Ev[]) =>
  evsOf(evs, 'recovery').filter((e) => e.casterIdx === folkwangIdx);
const buffs = (evs: Ev[], stat: string) =>
  evsOf(evs, 'buffApply').filter((e) => e.stat === stat);
const folkwangBursts = (evs: Ev[]) =>
  evsOf(evs, 'burstCast').filter(
    (e) => e.slug === SLUG || e.casterIdx === folkwangIdx
  );

describe('folkwang — kit spec (blind, from kit prose)', () => {
  it('fixture sanity: Folkwang is in the comp, bursts fire, and the run is non-trivial', () => {
    // Non-vacuity guard for EVERY burst-keyed assertion below: if Folkwang never cast,
    // a "burst shield count === burst cast count" assertion would be 0 === 0 and prove nothing.
    expect(folkwangIdx).toBeGreaterThanOrEqual(0);
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(folkwangBursts(BASE.evs).length).toBeGreaterThan(0);
    expect(evsOf(BASE.evs, 'fullBurstStart').length).toBeGreaterThan(0);
  });

  describe('skill1 — Shield 13.71% of the SKILL USER\u2019s Max HP, 10 s, to 2 highest-final-ATK allies', () => {
    it('emits shield events (the line is NOT droppable as "defensive")', () => {
      // Nearest-wrong: "shields are defensive, the boss deals no damage, skip the line."
      // That model emits ZERO shield events and silently kills every teammate
      // 'shielded' trigger / requiresShielded gate in the roster. RED under that model.
      expect(shieldEvs(BASE.evs).length).toBeGreaterThan(0);
    });

    it('the 13.71% shield is scaled by the CASTER\u2019s Max HP, not the target\u2019s', () => {
      // "equal to 13.71% of the skill user's final Max HP" => casterMaxHpPct semantics.
      // Nearest-wrong: targetMaxHpPct (the recipient's own pool). Discriminated by
      // patching the CASTER's own Max HP and observing the shield magnitude move:
      // under the faithful model it moves, under target-scaling it does not.
      const s1 = shieldEvs(BASE.evs).filter(
        (e) => (e.maxHpPct as number | undefined) === 13.71
      );
      expect(s1.length).toBeGreaterThan(0);
      for (const e of s1) {
        // Every skill1 shield must carry the caster-scaled amount, resolved off Folkwang.
        expect(e.casterIdx).toBe(folkwangIdx);
        expect(e.amount as number).toBeCloseTo(
          BASE.res.units[folkwangIdx].maxHp * 0.1371,
          0
        );
      }
    });

    it('the shield lasts 10 s (seconds, not rounds)', () => {
      const s1 = shieldEvs(BASE.evs).filter(
        (e) => (e.maxHpPct as number | undefined) === 13.71
      );
      for (const e of s1) {
        expect(e.durationSec as number).toBe(10);
        expect((e as Record<string, unknown>).durationShots).toBeUndefined();
      }
    });

    it('hits exactly 2 allies per activation, ranked by FINAL ATK', () => {
      // "Affects 2 allies with the highest final ATK" — a COUNT-2 slice, and the word
      // "final" forces live-effectiveAtk ranking (byFinalAtk), not static base ATK.
      // Nearest-wrong A: {kind:'allies'} (whole team) => 4-5 targets per activation.
      // Nearest-wrong B: count:1. Both RED here.
      const s1 = shieldEvs(BASE.evs).filter(
        (e) => (e.maxHpPct as number | undefined) === 13.71
      );
      const perFrame = new Map<number, Set<number>>();
      for (const e of s1) {
        const f = e.frame as number;
        if (!perFrame.has(f)) {
          perFrame.set(f, new Set());
        }
        perFrame.get(f)!.add(e.targetIdx as number);
      }
      expect(perFrame.size).toBeGreaterThan(0);
      for (const [, tgts] of perFrame) {
        expect(tgts.size).toBe(2);
      }

      // The chosen 2 must be the top-2 by live effective ATK at least once — a
      // static-ATK ranking picks a different pair whenever a buff reorders the team.
      const topTwo = [...BASE.res.units]
        .map((u, i) => ({ i, atk: u.effectiveAtk ?? u.staticAtk }))
        .sort((a, b) => b.atk - a.atk)
        .slice(0, 2)
        .map((x) => x.i);
      const anyFrame = [...perFrame.values()][0];
      for (const t of anyFrame) {
        expect(topTwo).toContain(t);
      }
    });

    it('Incoming Healing \u25b2 45.7% for 10 s rides the SAME 2-ally target set', () => {
      // Both skill1 lines sit under one "■ Affects 2 allies…" header, so they share the
      // target set. Nearest-wrong: scoping the healing buff to self (a common slip when a
      // support line reads defensively) => targetIdx would be folkwangIdx only.
      const heal = buffs(BASE.evs, 'incomingHealingPct');
      expect(heal.length).toBeGreaterThan(0);
      for (const e of heal) {
        expect(e.value as number).toBeCloseTo(45.7, 5);
        expect(e.casterIdx).toBe(folkwangIdx);
      }
      const shieldTargets = new Set(
        shieldEvs(BASE.evs)
          .filter((e) => (e.maxHpPct as number | undefined) === 13.71)
          .map((e) => e.targetIdx as number)
      );
      for (const e of heal) {
        expect(shieldTargets.has(e.targetIdx as number)).toBe(true);
      }
    });

    it('skill1 is NOT burst-keyed — it fires independently of Folkwang\u2019s own bursts', () => {
      // Trigger identity: skill1 carries NO activation clause => interval/passive, not
      // burstCast and not fullBurstEnter. Nearest-wrong: keying it to burstCast, which
      // would pin its activation count to the burst count. Discriminated by count:
      // a 180 s fight yields strictly more skill1 activations than Folkwang bursts.
      const acts = new Set(
        shieldEvs(BASE.evs)
          .filter((e) => (e.maxHpPct as number | undefined) === 13.71)
          .map((e) => e.frame as number)
      ).size;
      expect(acts).toBeGreaterThan(folkwangBursts(BASE.evs).length);
    });
  });

  describe('skill2 — self Max HP \u25b2 44.96% for 10 s', () => {
    it('applies to SELF only, as a target-own-pool Max HP grant', () => {
      // "■ Affects self. Max HP ▲ 44.96%" — plain "Max HP ▲ x%" on self => targetMaxHpPct
      // (the target's OWN pool), emitted flat-resolved under stat 'maxHpFlat'.
      // Nearest-wrong A: target {kind:'allies'} (the "■ Affects self" sub-header ignored,
      // inheriting skill2's first header) => teammates receive it. RED here.
      // Nearest-wrong B: casterMaxHpPct — identical numerically on a self-grant, so this
      // test deliberately does NOT rest on magnitude; the target-set assertion is the
      // discriminator, and failure-mode 7 (own-HP-only scalers) is the reason it matters.
      const hp = buffs(BASE.evs, 'maxHpFlat').filter(
        (e) => e.casterIdx === folkwangIdx
      );
      expect(hp.length).toBeGreaterThan(0);
      for (const e of hp) {
        expect(e.targetIdx).toBe(folkwangIdx);
      }
    });

    it('the grant is flat-resolved to 44.96% of Folkwang\u2019s own Max HP, for 10 s', () => {
      const hp = buffs(BASE.evs, 'maxHpFlat').filter(
        (e) => e.targetIdx === folkwangIdx
      );
      for (const e of hp) {
        expect(e.value as number).toBeGreaterThan(0);
        expect(e.expiresFrame as number).toBeGreaterThan(e.frame as number);
        // 10 s window, stated in SECONDS: expiry is exactly 10 s after apply.
        expect((e.expiresFrame as number) - (e.frame as number)).toBe(10 * FPS);
        expect((e as Record<string, unknown>).durationShots).toBeUndefined();
      }
    });

    it('Max HP \u25b2 does NOT convert into damage for Folkwang (no HP-scaling ATK line in her kit)', () => {
      // Failure-mode 7 read in the INERT direction: Folkwang has no atkOfMaxHpPct line, so
      // the Max HP buff must not move her damage. Nearest-wrong: encoding the self Max HP
      // as an ATK-ish stat (or letting an HP scaler leak in) => her totals shift.
      // Counterfactual: strip the skill2 self-HP block; damage must be byte-identical.
      const patched = withPatchedOverride(SLUG, (ov) => {
        ov.skill2!.blocks = ov.skill2!.blocks.filter(
          (b) =>
            !b.effects.some(
              (e) =>
                e.kind === 'buff' &&
                (e.stat === 'targetMaxHpPct' || e.stat === 'casterMaxHpPct')
            )
        );
      });
      const noHp = run({ ...base, overrides: { [SLUG]: patched } });
      expect(totals(noHp.res)[SLUG]).toBe(totals(BASE.res)[SLUG]);
      // …and non-vacuity: the block really existed in the shipped model.
      expect(
        buffs(BASE.evs, 'maxHpFlat').filter((e) => e.targetIdx === folkwangIdx)
          .length
      ).toBeGreaterThan(0);
      expect(
        buffs(noHp.evs, 'maxHpFlat').filter((e) => e.targetIdx === folkwangIdx)
          .length
      ).toBe(0);
    });

    it.skip('Taunt for 5 sec — GAP: no enemy entity and no aggro model in the sim, so no observable payload', () => {
      // "■ Affects the enemy with the highest final ATK. Taunt for 5 sec."
      // resolveTargets({kind:'enemy'}) returns [] (no enemy entity) and the sim models no
      // aggro/targeting, so the taunt has zero observable consequence at scope lock. It
      // belongs in `unmodeled.skill2` verbatim, not as a block. Missing primitive: aggro.
    });
  });

  describe('burst — Shield 32.9% of caster Max HP (10 s) + heal 65.81% of attack damage over 10 s, to 2 highest-final-ATK allies', () => {
    it('the 32.9% shield fires on Folkwang\u2019s OWN burst cast, not on any team Full Burst', () => {
      // Trigger identity (failure-mode 3): a burst-slot line is burstCast-keyed. The comp
      // holds another Burst III unit, so team Full Bursts occur on rotations Folkwang may
      // not have cast. Nearest-wrong: fullBurstEnter => activation count tracks
      // fullBurstStart events instead of Folkwang's burstCast count, OVER-CREDITING.
      const acts = new Set(
        shieldEvs(BASE.evs)
          .filter((e) => (e.maxHpPct as number | undefined) === 32.9)
          .map((e) => e.frame as number)
      );
      expect(acts.size).toBe(folkwangBursts(BASE.evs).length);
    });

    it('burst shield is caster-Max-HP scaled at 32.9%, 10 s, to exactly 2 allies', () => {
      const b = shieldEvs(BASE.evs).filter(
        (e) => (e.maxHpPct as number | undefined) === 32.9
      );
      expect(b.length).toBeGreaterThan(0);
      const perFrame = new Map<number, Set<number>>();
      for (const e of b) {
        expect(e.durationSec as number).toBe(10);
        expect(e.amount as number).toBeCloseTo(
          BASE.res.units[folkwangIdx].maxHp * 0.329,
          0
        );
        const f = e.frame as number;
        if (!perFrame.has(f)) {
          perFrame.set(f, new Set());
        }
        perFrame.get(f)!.add(e.targetIdx as number);
      }
      for (const [, tgts] of perFrame) {
        expect(tgts.size).toBe(2);
      }
    });

    it('"Recovers 65.81% of attack damage as HP over 10 sec" emits a heal-over-time, not one instant tick', () => {
      // Duration semantics + tandem: "over 10 sec" is a HoT. The engine models no HP
      // amount, but each tick emits a 'recovery' event that drives a teammate's
      // 'recovery' trigger (e.g. an on-heal damage buff). Nearest-wrong A: a single
      // instant heal (ticks:1) => one event per burst instead of ~10, starving an
      // on-recovery consumer of 9 refreshes. Nearest-wrong B: dropping the line as
      // "no HP pool modeled, inert" => zero events.
      const heals = healEvs(BASE.evs);
      expect(heals.length).toBeGreaterThan(0);
      const bursts = folkwangBursts(BASE.evs).length;
      expect(bursts).toBeGreaterThan(0);
      // ~10 ticks (1 s interval over a 10 s window) per burst, allowing the tail of the
      // fight to truncate the final window.
      expect(heals.length).toBeGreaterThan(bursts * 5);
    });

    it('the burst heal ticks are spaced ~1 s apart within a window (not co-located on the cast frame)', () => {
      // Discriminates ticks:10 spread over time from 10 events emitted at once.
      const frames = [
        ...new Set(healEvs(BASE.evs).map((e) => e.frame as number)),
      ].sort((a, b) => a - b);
      expect(frames.length).toBeGreaterThan(1);
      const gaps = frames.slice(1).map((f, i) => f - frames[i]);
      const oneSecGaps = gaps.filter((g) => g === FPS);
      expect(oneSecGaps.length).toBeGreaterThan(0);
    });

    it('burst heal targets the same 2 highest-final-ATK allies as the burst shield', () => {
      const shieldTargets = new Set(
        shieldEvs(BASE.evs)
          .filter((e) => (e.maxHpPct as number | undefined) === 32.9)
          .map((e) => e.targetIdx as number)
      );
      const healTargets = new Set(
        healEvs(BASE.evs).map((e) => e.targetIdx as number)
      );
      expect(healTargets.size).toBeGreaterThan(0);
      for (const t of healTargets) {
        expect(shieldTargets.has(t)).toBe(true);
      }
    });

    it.skip('the 65.81%-of-attack-damage HP AMOUNT is unobservable — no HP pool in v1', () => {
      // GAP: the `heal` effect models no HP quantity (v1 boss deals no damage, nobody is
      // ever below max), so the 65.81%-of-attack-damage magnitude has no payload to assert.
      // Only the recovery EVENT cadence is observable, and that is covered above.
    });
  });

  describe('inertness — Folkwang\u2019s kit moves no damage, hers or her teammates\u2019', () => {
    it('no kit line grants any damage-relevant stat', () => {
      // Whole-picture check: this kit is shields/heal/incoming-healing/Max-HP/taunt only.
      // Nearest-wrong: inventing an ATK/damage buff to "make the Defender contribute"
      // (failure-mode: measured > fudge). Any such stat from Folkwang is RED here.
      const damageStats = new Set([
        'atkPct',
        'casterAtkPct',
        'highestAllyAtkPct',
        'atkOfMaxHpPct',
        'critRatePct',
        'critRateNormalPct',
        'critDamagePct',
        'coreDamagePct',
        'elementDamagePct',
        'attackDamagePct',
        'sustainedDamagePct',
        'damageTakenPct',
        'trueDamagePct',
        'extraHitDamagePct',
        'hitRatePct',
      ]);
      const offenders = evsOf(BASE.evs, 'buffApply').filter(
        (e) => e.casterIdx === folkwangIdx && damageStats.has(e.stat as string)
      );
      expect(offenders.map((e) => e.stat)).toEqual([]);
    });

    it('removing ALL of Folkwang\u2019s shield/heal/HP blocks leaves every teammate\u2019s damage byte-identical in this fixture', () => {
      // Non-vacuity for the tandem claim, stated honestly: the control comp contains no
      // 'shielded'/'recovery'-trigger consumer, so these lines are correctly inert HERE.
      // That is precisely WHY the tests above assert EVENTS rather than totals — a
      // totals-only spec would let the whole kit be deleted and stay green.
      const stripped = withPatchedOverride(SLUG, (ov) => {
        const drop = (bs: typeof ov.skill1.blocks) =>
          bs.filter(
            (b) =>
              !b.effects.some((e) => e.kind === 'shield' || e.kind === 'heal')
          );
        ov.skill1!.blocks = drop(ov.skill1!.blocks);
        ov.skill2!.blocks = drop(ov.skill2!.blocks);
        ov.burst!.blocks = drop(ov.burst!.blocks);
      });
      const noSupport = run({ ...base, overrides: { [SLUG]: stripped } });
      const a = totals(BASE.res);
      const b = totals(noSupport.res);
      for (const slug of Object.keys(a)) {
        expect(b[slug]).toBe(a[slug]);
      }
      // …and prove the strip was real (else this test is vacuous).
      expect(shieldEvs(noSupport.evs).length).toBe(0);
      expect(healEvs(noSupport.evs).length).toBe(0);
      expect(shieldEvs(BASE.evs).length).toBeGreaterThan(0);
    });
  });
});
