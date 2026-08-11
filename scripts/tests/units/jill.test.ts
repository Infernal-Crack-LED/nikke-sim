// PER-UNIT KIT SPEC — `jill` (Jill, Attacker/AR/Electric, Burst III, cd 40s, ammo 9,
// datamined rate_of_fire 150 rpm = 2.5 pulls/sec — charFixes.pullsPerSec, video-confirmed).
// Kit-autonomy gauntlet 2026-07-26 (Tier 2).
//
// One assertion group per KIT LINE (J1..J7 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.jill.skills):
//   S1 ■ start of battle + reload-to-max → self: Normal Attack Damage Multiplier ▲30% for 9 rnd  [J1]
//      ■ on Burst Skill → self: True Damage ▲34.99% for 10 sec                                  [J2]
//   S2 ■ start of battle + reload-to-max → self: Acid Ammo — first round applies sustained dot;  [J3]
//         192% of final ATK as sustained damage every 1 sec for 30 sec (re-applied every reload,
//         ~5s cadence ⇒ effectively permanent; modeled as a whole-fight dot)
//      ■ entering Full Burst → self: ATK ▲40.03% for 10 sec                                     [J4]
//   BU ■ self: Reload speed fixed at 99.96% increase for 10 sec   ⟵ reloadSpeedClamp 99.96/10s   [—]
//      ■ self: Removes 100% of ammo. Forced Reload.               ⟵ consumeAmmo fraction 1       [J7]
//      ■ self: Hit Rate ▲80.78% for 10 sec                                                       [J6]
//      ■ self: Attack Damage ▲75% for 10 sec                                                     [J5]
//      ■ self: Normal attacks deal True Damage for 10 sec          ⟵ weaponSwap.trueNormals      [J2]
//
// Lines with no damage assertion of their own:
//   • "Reload speed is fixed at a 99.96% increase for 10 sec" is a stat LOCK (owner ruling
//     2026-07-22: "is fixed at" clamps the stat, it does NOT grant +99.96% speed), encoded as
//     reloadSpeedClamp 99.96/10s. A clamp is observable only against reload-speed support, and
//     this fixture has none — so the line is inert HERE and there is nothing to assert.
//
// ⚑ KNOWN GAP, recorded 2026-08-10 (phase-4 batch 4) — NOT fixed here, board-moving, owner-gated:
//   her burst weaponSwap does not restate `pullsPerSec`, and the engine's swap cadence branch
//   falls back to the AR class default (12/s) instead of her MEASURED charFixes 2.5/s, so she
//   fires ~4.8x too fast for the 10s window. Board mean 1.924; sim-only A/B with the swap
//   restating 2.5 → 0.983. Nothing in THIS spec discriminates the swap's fire cadence — add that
//   pin with the fix.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing). Jill deals damage from exactly TWO sources — normal attacks and the Acid Ammo dot; she
// has NO skill/burst direct damage (her burst is pure self-buff). That makes the normal-vs-dot
// split the clean scoping probe for her Damage-Up buffs:
//   J1  normalAttackPct folds into the NORMAL multiplier only (71.09 → 92.417 = ×1.30). Proven by
//       the normal atkPct moving while the dot total stays BYTE-identical; a generic attackDamagePct
//       (Damage-Up bucket) would lift the dot too — the counterfactual the shipped model provably
//       fails.
//   J2  the trueDamagePct buff is declared (fires once per cast) AND moves damage, because the
//       burst true-normals conversion gives it true-flavored hits to feed. Asserted both ways:
//       the buffApply exists with the kit value/duration/scope, AND removing it lowers her total.
//   J3  the dot is 192 atkPct on a 1-sec cadence, permanent (re-applied every reload). Count ≈ fight
//       seconds; removing it deletes every tick and ~40% of her total.
//   J4  fullBurstEnter, not burstCast: the ATK buff fires once per team Full Burst WINDOW (12 here,
//       frames byte-equal to fullBurstStart), not once per Jill cast (6). The burstCast counterfactual
//       collapses it to 6 — the discrimination.
//   J5/J6  burstCast self-buffs, value + 10-sec duration + one-per-cast count.
//   J7  consumeAmmo fraction 1 dumps the mag and forces a reload on EVERY cast: a reload lands within
//       the reload time of all 6 casts; with consumeAmmo removed only the coincidental natural
//       reloads remain (2/6).
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / jill B3 / helm B3, boss Fire,
// focus jill) — jill needs a real rotation (two B3s) to sustain Full Bursts. Deterministic (no
// seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / jill 2 / helm 3. */
const JILL = 2;
const FIGHT_SEC = 180;
/** Jill's reload completes well inside this many frames (reloadFrames 81 → ~92f effective). */
const RELOAD_WINDOW_F = 120;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Reload = Extract<SimEvent, { kind: 'reload' }>;
type FBStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('jill'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches ------------------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** J1 reference: her S1 normal-attack line removed. */
const jillNoNormal = withPatchedOverride('jill', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'normalAttackPct'));
  if (ov.skill1.length === before) {
    throw new Error('jill S1 normalAttackPct block missing — fixture is stale');
  }
});
/** J1 counterfactual: the same +30 as a GENERIC Damage-Up buff (would lift the dot too). */
const jillGenericDmgUp = withPatchedOverride('jill', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'normalAttackPct');
  if (!e) {
    throw new Error(
      'jill S1 normalAttackPct effect missing — fixture is stale'
    );
  }
  e.stat = 'attackDamagePct';
});
/** J2 reference: her S1 true-damage line removed. */
const jillNoTrueDmg = withPatchedOverride('jill', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'trueDamagePct'));
  if (ov.skill1.length === before) {
    throw new Error('jill S1 trueDamagePct block missing — fixture is stale');
  }
});
/** J3 reference: her Acid Ammo dot removed. */
const jillNoDot = withPatchedOverride('jill', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'dot')
  );
  if (ov.skill2.length === before) {
    throw new Error('jill S2 dot block missing — fixture is stale');
  }
});
/** J4 counterfactual: the ATK buff on the WRONG trigger (burstCast instead of fullBurstEnter). */
const jillAtkOnCast = withPatchedOverride('jill', (ov) => {
  let hit = false;
  for (const b of ov.skill2) {
    if (b.trigger.kind === 'fullBurstEnter') {
      b.trigger.kind = 'burstCast';
      hit = true;
    }
  }
  if (!hit) {
    throw new Error('jill S2 fullBurstEnter block missing — fixture is stale');
  }
});
/** J5 reference: her burst Attack Damage line removed. */
const jillNoAtkDmg = withPatchedOverride('jill', (ov) => {
  for (const b of ov.burst) {
    b.effects = b.effects.filter((e: any) => e.stat !== 'attackDamagePct');
  }
});
/** J6 reference: her burst Hit Rate line removed. */
const jillNoHitRate = withPatchedOverride('jill', (ov) => {
  for (const b of ov.burst) {
    b.effects = b.effects.filter((e: any) => e.stat !== 'hitRatePct');
  }
});
/** J7 reference: her burst ammo-dump (forced reload) removed. */
const jillNoConsume = withPatchedOverride('jill', (ov) => {
  let hit = false;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'consumeAmmo');
    if (b.effects.length !== before) {
      hit = true;
    }
  }
  if (!hit) {
    throw new Error('jill burst consumeAmmo effect missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) -------------------------------------------------
const base = run();
const noNormal = run({ jill: jillNoNormal });
const genericDmgUp = run({ jill: jillGenericDmgUp });
const noTrueDmg = run({ jill: jillNoTrueDmg });
const noDot = run({ jill: jillNoDot });
const atkOnCast = run({ jill: jillAtkOnCast });
const noAtkDmg = run({ jill: jillNoAtkDmg });
const noHitRate = run({ jill: jillNoHitRate });
const noConsume = run({ jill: jillNoConsume });

// ---- readers ---------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const jillDmg = (evs: SimEvent[]) => dmg(evs).filter((d) => d.slug === 'jill');
const jillNormals = (evs: SimEvent[]) =>
  jillDmg(evs).filter((d) => d.bucket === 'normal');
const jillDot = (evs: SimEvent[]) =>
  jillDmg(evs).filter((d) => d.srcSlot === 'skill2');
const sum = (ds: Damage[]) => ds.reduce((s, d) => s + d.amount, 0);
const round3 = (n: number) => Math.round(n * 1000) / 1000;

const jillBuffs = (evs: SimEvent[], stat: string) =>
  evs.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' && e.casterIdx === JILL && e.stat === stat
  );
const jillBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'jill'
  );
const jillReloads = (evs: SimEvent[]) =>
  evs.filter((e): e is Reload => e.kind === 'reload' && e.slug === 'jill');
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FBStart => e.kind === 'fullBurstStart');

describe('jill — kit spec', () => {
  describe('J1 — S1 Normal Attack Damage Multiplier ▲30% (normal-scoped, permanent)', () => {
    it('folds +30% into the normal multiplier: 71.09 → 92.417', () => {
      const shipped = [
        ...new Set(jillNormals(base.events).map((d) => round3(d.atkPct))),
      ];
      const removed = [
        ...new Set(jillNormals(noNormal.events).map((d) => round3(d.atkPct))),
      ];
      expect(removed).toEqual([71.09]);
      expect(shipped).toEqual([92.417]);
      expect(shipped[0] / removed[0]).toBeCloseTo(1.3, 3);
    });

    it('is scoped to NORMALS: removing it leaves the Acid dot total byte-identical', () => {
      expect(sum(jillDot(base.events))).toBe(sum(jillDot(noNormal.events)));
      expect(sum(jillNormals(base.events))).not.toBe(
        sum(jillNormals(noNormal.events))
      );
    });

    it('DISCRIMINATING: a generic Damage-Up +30 would lift the dot too', () => {
      // Proves the scoping assertion is one the generic (attackDamagePct) model provably fails.
      expect(sum(jillDot(genericDmgUp.events))).not.toBe(
        sum(jillDot(noNormal.events))
      );
    });
  });

  describe('J2 — S1 True Damage ▲34.99% on burst cast (live during the burst true-normals window)', () => {
    const applied = jillBuffs(base.events, 'trueDamagePct');

    it('is declared: 34.99% for 10 sec, self-scoped, once per burst cast', () => {
      expect(applied.length, 'no trueDamagePct buff was applied').toBe(
        jillBursts(base.events).length
      );
      expect([...new Set(applied.map((b) => b.value))]).toEqual([34.99]);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([JILL]);
    });

    it('MOVES damage: the burst true-normals conversion (weaponSwap.trueNormals, enacted 2026-08-09) gives it true-flavored hits to feed', () => {
      expect(base.totals.jill).toBeGreaterThan(noTrueDmg.totals.jill);
    });
  });

  describe('J3 — S2 Acid Ammo: 192% final ATK sustained damage every 1 sec, permanent', () => {
    const ticks = jillDot(base.events);

    it('ticks at the kit magnitude on a 1-sec cadence', () => {
      expect(ticks.length).toBeGreaterThan(0);
      expect([...new Set(ticks.map((d) => d.atkPct))]).toEqual([192]);
      const intervals = ticks.slice(1).map((d, i) => d.frame - ticks[i].frame);
      expect([...new Set(intervals)]).toEqual([FPS]);
    });

    it('is permanent (re-applied every reload): ≈ one tick per fight second', () => {
      expect(ticks.length).toBeGreaterThanOrEqual(FIGHT_SEC - 2);
      expect(ticks.length).toBeLessThanOrEqual(FIGHT_SEC + 2);
    });

    it('is a real damage source: removing it deletes every tick and a large share of her total', () => {
      expect(jillDot(noDot.events).length).toBe(0);
      // >1.15: the dot's SHARE of her total shrank when the burst true-normals window
      // (enacted 2026-08-09) grew her normal damage — the dot itself is unchanged.
      expect(base.totals.jill).toBeGreaterThan(noDot.totals.jill * 1.15);
    });
  });

  describe('J4 — S2 ATK ▲40.03% on entering Full Burst (not on cast)', () => {
    const applied = jillBuffs(base.events, 'atkPct');

    it('is 40.03% for 10 sec, self-scoped', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([40.03]);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([JILL]);
    });

    it('fires once per Full Burst WINDOW (frames byte-equal to fullBurstStart), not per cast', () => {
      const fb = fbStarts(base.events).map((f) => f.frame);
      expect(applied.map((b) => b.frame)).toEqual(fb);
      expect(applied.length).toBeGreaterThan(jillBursts(base.events).length);
    });

    it('DISCRIMINATING: on the wrong trigger (burstCast) it collapses to the cast count', () => {
      const wrong = jillBuffs(atkOnCast.events, 'atkPct');
      expect(wrong.map((b) => b.frame)).toEqual(
        jillBursts(atkOnCast.events).map((c) => c.frame)
      );
      expect(wrong.length).toBe(jillBursts(atkOnCast.events).length);
    });
  });

  describe('J5 — burst Attack Damage ▲75% for 10 sec (burstCast, self)', () => {
    const applied = jillBuffs(base.events, 'attackDamagePct');

    it('is 75% for 10 sec, self-scoped, once per cast', () => {
      expect(applied.length).toBe(jillBursts(base.events).length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([75]);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([JILL]);
    });

    it('is live: removing it lowers her total', () => {
      expect(jillBuffs(noAtkDmg.events, 'attackDamagePct').length).toBe(0);
      expect(base.totals.jill).toBeGreaterThan(noAtkDmg.totals.jill);
    });
  });

  describe('J6 — burst Hit Rate ▲80.78% for 10 sec (burstCast, self)', () => {
    const applied = jillBuffs(base.events, 'hitRatePct');

    it('is 80.78% for 10 sec, self-scoped, once per cast', () => {
      expect(applied.length).toBe(jillBursts(base.events).length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([80.78]);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([JILL]);
    });

    it('is load-bearing: normals inside the window core-hit strictly more than outside', () => {
      // Hit Rate shrinks the reticle → higher core fraction (engine HR→core path, LIVE by default).
      // The conversion SLOPE is engine-calibrated (⚑ at the engine level); this pins the DIRECTION
      // and the kit-stated 80.78 magnitude, not a specific core-rate number.
      const normals = jillNormals(base.events);
      let inSum = 0,
        inN = 0,
        outSum = 0,
        outN = 0;
      for (const d of normals) {
        const inside = applied.some(
          (w) => d.frame >= w.frame && d.frame <= w.expiresFrame!
        );
        if (inside) {
          inSum += d.coreRate;
          inN++;
        } else {
          outSum += d.coreRate;
          outN++;
        }
      }
      expect(
        inN,
        'no normal shots landed inside a hit-rate window'
      ).toBeGreaterThan(0);
      expect(
        outN,
        'no normal shots landed outside the hit-rate windows'
      ).toBeGreaterThan(0);
      expect(inSum / inN).toBeGreaterThan(outSum / outN);
    });

    it('is present in shipped and absent when removed', () => {
      expect(jillBuffs(noHitRate.events, 'hitRatePct').length).toBe(0);
    });
  });

  describe('J7 — burst Removes 100% of ammo + Forced Reload (consumeAmmo fraction 1)', () => {
    it('every cast is followed by a forced reload inside the reload window', () => {
      const bursts = jillBursts(base.events);
      const reloads = jillReloads(base.events);
      expect(bursts.length).toBeGreaterThan(0);
      const forced = bursts.filter((c) =>
        reloads.some(
          (r) => r.frame >= c.frame && r.frame <= c.frame + RELOAD_WINDOW_F
        )
      );
      expect(
        forced.length,
        'a cast without a forced reload means the ammo dump is missing'
      ).toBe(bursts.length);
    });

    it('DISCRIMINATING: the ammo dump adds reloads — strictly more reloads with consumeAmmo than without', () => {
      // The old cast-proximity discriminator went blind once the burst true-normals
      // weaponSwap landed (2026-08-09): applying a swap cancels any in-flight reload at
      // the cast frame, so a fresh reload start sits near every cast in BOTH fixtures.
      // The dump's aggregate effect is unambiguous instead: emptying a 9-round magazine
      // every cast forces extra reload cycles the no-consumeAmmo run never pays.
      expect(jillReloads(base.events).length).toBeGreaterThan(
        jillReloads(noConsume.events).length
      );
    });
  });

  describe('J8 — burst swap honors her measured fire cadence (fixed 2026-08-10)', () => {
    // Her burst is a SAME-WEAPON flavor swap — the magnum never changes, only its damage
    // flavor — so its shot cadence must stay her video-MEASURED 2.5 pulls/sec
    // (charFixes.pullsPerSec; 150 rpm, ammo-counter read, test battery 2 test 4). The engine's
    // swap fire-cadence branch (src/engine/sim.ts, the swap basePps resolution) now falls back
    // to `u.pullsPerSec` for a same-weapon swap (`u.swap.weapon === undefined`) before the
    // weapon-class default — jill is the roster's only carrier of both a charFixes cadence and
    // a weaponSwap (verified: no other override intersects `charFixes.pullsPerSec` with a
    // `weapon`-less `weaponSwap`), so this is behavior-identical for every other unit.
    //
    // This group used to DOCUMENT the pre-fix defect (in-swap ~9.3/s, ~4.7x out-of-swap); it now
    // pins the fixed PARITY behavior against the measured post-fix numbers (control fixture:
    // liter/crown/jill/helm, boss Fire, focus jill — cadence(in) 2.317/s, cadence(out) 1.975/s,
    // ratio 1.173).
    const cadence = (window: 'in' | 'out') => {
      const casts = jillBursts(base.events).map((c) => c.frame);
      const inSwap = (f: number) =>
        casts.some((c) => f >= c && f < c + 10 * FPS);
      const shots = jillNormals(base.events).filter((d) =>
        window === 'in' ? inSwap(d.frame) : !inSwap(d.frame)
      );
      const secs =
        window === 'in' ? casts.length * 10 : FIGHT_SEC - casts.length * 10;
      return shots.length / secs;
    };

    it('is at PARITY: in-swap cadence sits close to her out-of-swap cadence (not ~4.7x it)', () => {
      // A same-weapon flavor swap cannot change how fast the gun fires. The two are not
      // BYTE-equal (in-swap pays a different reload-downtime pattern under J7's forced-reload
      // ammo dump than the natural out-of-swap reload cycle), but the fixed ratio sits close to
      // 1 — measured 1.173 — a different order of magnitude from the pre-fix ~4.7.
      const ratio = cadence('in') / cadence('out');
      expect(ratio).toBeGreaterThan(1.0);
      expect(ratio).toBeLessThan(1.4);
    });

    it('quantifies it: ~2.3 shots/sec in the swap, matching her measured 2.5/sec nominal', () => {
      expect(cadence('in')).toBeGreaterThan(2.0);
      expect(cadence('in')).toBeLessThan(2.6);
      expect(cadence('out')).toBeLessThan(2.5);
    });

    // J9 pins the MECHANISM behind a small (~0.2-2.7%, FB-count-preserving) cast-timing ripple
    // this fix causes on OTHER B3-alternating units in a shared-chain comp (misc B3s/PI2 —
    // grave/anis-star/chisato/noir), investigated 2026-08-10 after an owner challenge to the
    // LOG-not-IMPLEMENT gate: burst gauge IS provably locked for the whole swap window
    // (addGauge's `fbEndFrame > frame || stage !== 0` early return, sim.ts) — shot COUNT during
    // the window cannot leak into the shared gauge. What DOES leak is her reload-cycle PHASE: her
    // flavor swap does not free-refill ammo on exit ("no free reload on exit either", sim.ts
    // ~3529), so the buggy 12/s cadence burned 7 magazines in her first 10s swap window where the
    // fixed 2.5/s cadence burns 2 — a different reload-cycle phase at the instant the lock lifts,
    // which shifts the frame of her own first post-lock shot and therefore the shared gauge's
    // refill curve by a fraction of a second. This is a REAL mechanic (reload continues ticking
    // through Full Burst in-game; only gauge CONTRIBUTION is gated) surfacing through an existing
    // primitive, not a new one this fix introduces — see DECISIONS.md (2026-08-10, jill IMPLEMENT
    // entry) for the full comp-level trace.
    it('DOCUMENTS THE MECHANISM: her first swap window completes only a couple reload cycles (not the ~7 the pre-fix cadence forced)', () => {
      const firstCast = jillBursts(base.events)[0].frame;
      const inFirstWindow = jillReloads(base.events).filter(
        (r) => r.frame >= firstCast && r.frame < firstCast + 10 * FPS
      );
      expect(inFirstWindow.length).toBeGreaterThanOrEqual(1);
      expect(inFirstWindow.length).toBeLessThanOrEqual(3);
    });
  });
});
