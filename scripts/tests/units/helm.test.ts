// PER-UNIT KIT SPEC — `helm` (Helm (Treasure), Attacker/SR/Water, Burst III, cd 40s, ammo 6,
// chargeFrames 60). TDD transition step 3; owner-driven spec review 2026-07-23.
//
// One assertion group per KIT LINE (H1..H9 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) and to ISOLATE a line whose effect is otherwise masked
// by another of her own lines — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.helm.skills):
//   S1 ■ last bullet hits → all allies: Critical Rate OF NORMAL ATTACKS ▲14.64% for 5 sec.   [H1]
//      ■ attacking with Full Charge → all allies: recovers 0.59% of Max HP                   [H2]
//                                                  fills Burst Gauge by 14.31%               [H3]
//   S2 ■ all allies: Damage to Interruption Parts ▲3.08% continuously                        [H4]
//      ■ entering Full Burst → all allies: Attack Damage ▲27.87% for 10 sec                  [H5]
//      ■ hitting with Full Charge → the target: 178.98% of final ATK as additional damage    [H6]
//   BU ■ highest-final-ATK enemy: 8236.8% of final ATK as Burst Skill damage                 [H7]
//      ■ all allies: recovers 54.45% of attack damage as HP FOR 10 SEC                       [H8]
//      ■ self: Charge Damage Multiplier ▲158.4% FOR 10 ROUND(S)                              [H9]
//
// Why each assertion discriminates (the point of the file — a test that cannot fail under the
// nearest wrong model gates nothing):
//   H1  a GENERIC critRatePct would lift crit on every skill proc and burst nuke in the team,
//       because this buff targets ALL ALLIES. Proven three ways at once: shipped vs buff-removed
//       must be IDENTICAL on skill/burst buckets and DIFFERENT on normal, and the generic
//       counterfactual must MOVE the skill/burst buckets — i.e. the shipped assertion is one the
//       generic model provably fails.
//   H2  the heal is an event, not a number: it drives crown's "when recovery takes effect" block.
//       Asserted at HER CADENCE (once per charged pull), which a burst-only heal cannot produce.
//   H4  partsDamagePct must be exactly inert against the partless scope-lock boss — byte-identical
//       totals for every unit, not "small".
//   H5  the TREASURE value 27.87, not the untreasured base 11.85 (the 0.591-COLD regression).
//   H7  a burst CAST lands BEFORE the Full Burst window opens, so it must never take the +50%
//       major (verified fact, 2026-07-13).
//   H9  round-count, not seconds: durationShots 10 with NO wall-clock expiry, holder-scoped.
//       The rounds-beat-seconds discrimination itself lives in engine/duration-shots.test.ts.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / ada B3 / helm B3, boss Fire,
// focus ada) — helm needs a real rotation to cast her burst at all. Deterministic (no seed).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const CARRY = 'ada';
/** controlComp slot order: liter 0 / crown 1 / ada 2 / helm 3. */
const CROWN = 1;
const HELM = 3;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(CARRY),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasStat = (b: any, stat: string) => b.effects.some((e: any) => e.stat === stat);
const hasHeal = (b: any) => b.effects.some((e: any) => e.kind === 'heal');

/** H1 reference: her S1 crit line removed entirely. */
const helmNoCrit = withPatchedOverride('helm', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'critRateNormalPct'));
  if (ov.skill1.length === before) throw new Error('helm S1 critRateNormalPct block missing — fixture is stale');
});
/** H1 counterfactual: the same line as a GENERIC (unscoped) crit-rate buff. */
const helmGenericCrit = withPatchedOverride('helm', (ov) => {
  const e = ov.skill1.flatMap((b: any) => b.effects).find((x: any) => x.stat === 'critRateNormalPct');
  if (!e) throw new Error('helm S1 critRateNormalPct effect missing — fixture is stale');
  e.stat = 'critRatePct';
});
/** H4 reference: her parts-damage line removed. */
const helmNoParts = withPatchedOverride('helm', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'partsDamagePct'));
  if (ov.skill2.length === before) throw new Error('helm S2 partsDamagePct block missing — fixture is stale');
});
/** H8 isolation: her S1 full-charge heal fires every ~1.5s and SATURATES crown's recovery
 *  consumer, which would mask the burst heal's window entirely. Removing S1's heal (and crown's
 *  own hitCount heal) leaves helm's BURST heal — the shipped, unpatched line under test — as the
 *  only recovery source in the fight, so every recovery firing is attributable to it. */
const helmNoS1Heal = withPatchedOverride('helm', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasHeal(b));
  if (ov.skill1.length === before) throw new Error('helm S1 heal block missing — fixture is stale');
});
const crownNoHeal = withPatchedOverride('crown', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasHeal(b));
  if (ov.skill2.length === before) throw new Error('crown S2 heal block missing — fixture is stale');
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noCrit = run({ helm: helmNoCrit });
const genericCrit = run({ helm: helmGenericCrit });
const noParts = run({ helm: helmNoParts });
const isolated = run({ helm: helmNoS1Heal, crown: crownNoHeal });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const helmDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'helm' && d.srcSlot === srcSlot);
const helmShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'helm');
const helmBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'helm');
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');

/** Distinct crit rates seen per unit on the given buckets — the H1 discriminator. */
function critRatesByUnit(evs: SimEvent[], buckets: Damage['bucket'][]): Record<string, string> {
  const out: Record<string, Set<string>> = {};
  for (const d of dmg(evs)) {
    if (!buckets.includes(d.bucket)) continue;
    (out[d.slug] ??= new Set()).add(d.critRate.toFixed(9));
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v].sort().join(',')]));
}

/** Frames at which crown's recovery-triggered team buff fired (one firing = one frame, even
 *  though the block targets all allies and so emits one buffApply per holder). */
const recoveryFrames = (evs: SimEvent[]): number[] =>
  [...new Set(
    buffs(evs)
      .filter((b) => b.casterIdx === CROWN && b.stat === 'attackDamagePct' && b.value === 20.99)
      .map((b) => b.frame),
  )].sort((a, b) => a - b);

describe('helm (Treasure) — kit spec', () => {
  describe('H1 — S1 crit rate is scoped to NORMAL ATTACKS, for every ally', () => {
    it('does NOT lift crit on any skill or burst damage, team-wide', () => {
      // Shipped must be byte-identical to buff-REMOVED on the non-normal buckets.
      expect(critRatesByUnit(base.events, ['skill', 'burst'])).toEqual(
        critRatesByUnit(noCrit.events, ['skill', 'burst']),
      );
    });

    it('DOES lift crit on normal attacks (the buff is live, not inert)', () => {
      expect(critRatesByUnit(base.events, ['normal'])).not.toEqual(
        critRatesByUnit(noCrit.events, ['normal']),
      );
    });

    it('DISCRIMINATING: an unscoped critRatePct would move the skill/burst buckets', () => {
      // Proves the first assertion is one the generic (pre-2026-07-23) model provably fails.
      expect(critRatesByUnit(genericCrit.events, ['skill', 'burst'])).not.toEqual(
        critRatesByUnit(noCrit.events, ['skill', 'burst']),
      );
    });
  });

  describe('H2 — S1 full-charge heal fires a recovery event on every charged pull', () => {
    it('drives crown\'s recovery consumer at HER shot cadence, not once per burst', () => {
      const frames = recoveryFrames(base.events).length;
      const shots = helmShots(base.events).length;
      const bursts = helmBursts(base.events).length;
      expect(
        frames,
        `${frames} recovery firings vs ${shots} helm pulls / ${bursts} bursts — a burst-only or ` +
          'magazine-only trigger would land near the burst count',
      ).toBeGreaterThanOrEqual(Math.floor(shots * 0.9));
    });
  });

  describe('H3 — S1 fills Burst Gauge by 14.31% (carried by gauge data, not an override block)', () => {
    it('is the datamined flat per-trigger term, not an override effect', () => {
      const gauge = JSON.parse(
        readFileSync(new URL('../../../data/gauge-per-shot.json', import.meta.url), 'utf8'),
      );
      expect(gauge.helm.flatPerTrigger, 'kit 14.31% → flatPerTrigger 1431').toBe(1431);
    });

    it.skip('is unscaled by camera focus and suppressed during FB/chain — step-2 gauge backfill', () => {
      // GAP: the gauge pipeline emits no event, so this is not assertable from the log today.
      // Owned by the step-2 "gauge suppression during FB/chain" row (plan doc), not by this file.
    });
  });

  describe('H4 — S2 interruption-parts damage is exactly inert vs the partless boss', () => {
    it('removing it changes NO unit\'s total by a single point', () => {
      expect(base.totals).toEqual(noParts.totals);
    });
  });

  describe('H5 — S2 grants the TREASURE Attack Damage on Full Burst entry', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === HELM && b.stat === 'attackDamagePct',
    );

    it('is 27.87% (treasure), not the untreasured base 11.85%', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([27.87]);
    });

    it('reaches all four allies, including herself, for 10 sec', () => {
      expect(applied.length, 'no FB-entry attackDamagePct buff was applied').toBeGreaterThan(0);
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied) (perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!).add(b.targetIdx);
      for (const [frame, holders] of perFrame) {
        expect(holders.size, `frame ${frame} reached ${holders.size} allies, expected 4`).toBe(4);
      }
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });
  });

  describe('H6 — S2 full-charge rider deals 178.98% of final ATK, once per charged pull', () => {
    const riders = helmDamage(base.events, 'skill2');

    it('lands exactly once per pull', () => {
      expect(riders.length).toBe(helmShots(base.events).length);
    });

    it('is the kit magnitude and is crit-eligible (engine rider convention)', () => {
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([178.98]);
      expect(riders.every((d) => d.critEligible)).toBe(true);
    });
  });

  describe('H7 — burst nuke: 8236.8% of final ATK, cast BEFORE the Full Burst window', () => {
    const nukes = helmDamage(base.events, 'burst');

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(helmBursts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([8236.8]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      const took = nukes.filter((d) => d.fbMajorApplied);
      expect(took.map((d) => d.sec), 'burst-cast damage must precede the FB window').toEqual([]);
    });
  });

  describe('H8 — burst recovery is a 10-SECOND window, not a single instant', () => {
    // The kit reads "Recovers 54.45% of attack damage as HP FOR 10 SEC" — recovery keeps taking
    // effect across the window, so a recovery CONSUMER stays refreshed for its whole length. No HP
    // pool is modeled, so the window's only observable is exactly that consumer behaviour.
    // Only casts whose FULL window fits inside the 180s fight are measurable — helm's last cast
    // lands at ~179.7s and its window is truncated by the end of the fight, which is a property of
    // the fixture, not of the kit.
    const FIGHT_FRAMES = 180 * FPS;
    const casts = helmBursts(isolated.events).filter((c) => c.frame + 10 * FPS <= FIGHT_FRAMES);
    const frames = recoveryFrames(isolated.events);

    it('has bursts with a complete window to measure', () => {
      expect(casts.length, 'no helm burst has a full 10s window inside the fight').toBeGreaterThan(0);
    });

    it('keeps recovery firing across the whole 10 sec after each cast', () => {
      for (const cast of casts) {
        const inWindow = frames.filter((f) => f >= cast.frame && f <= cast.frame + 10 * FPS);
        const spanSec = inWindow.length ? (inWindow[inWindow.length - 1] - cast.frame) / FPS : 0;
        expect(
          inWindow.length,
          `burst at ${cast.sec.toFixed(2)}s produced ${inWindow.length} recovery firing(s) ` +
            `spanning ${spanSec.toFixed(1)}s — a single instant heal produces exactly 1 at 0.0s`,
        ).toBeGreaterThanOrEqual(8);
        expect(spanSec, 'the window must reach ~10s, not collapse to the cast frame').toBeGreaterThanOrEqual(8);
      }
    });
  });

  describe('H9 — burst Charge Damage Multiplier is a ROUND count, self-scoped', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === HELM && b.stat === 'chargeDamageMultPct',
    );

    it('is 158.4% for 10 rounds with NO wall-clock expiry', () => {
      expect(applied.length).toBe(helmBursts(base.events).length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([158.4]);
      expect([...new Set(applied.map((b) => b.durationShots))]).toEqual([10]);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame))],
        'a round-count buff must not also carry a timed expiry',
      ).toEqual([null]);
    });

    it('is held by helm alone (self-scoped, no ally shares the round budget)', () => {
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([HELM]);
    });
  });
});
