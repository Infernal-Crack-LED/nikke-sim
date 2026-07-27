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
//   BU ■ self: Reload speed fixed at 99.96% increase for 10 sec   ⟵ UNMODELED (stat LOCK)        [—]
//      ■ self: Removes 100% of ammo. Forced Reload.               ⟵ consumeAmmo fraction 1       [J7]
//      ■ self: Hit Rate ▲80.78% for 10 sec                                                       [J6]
//      ■ self: Attack Damage ▲75% for 10 sec                                                     [J5]
//      ■ self: Normal attacks deal True Damage for 10 sec          ⟵ UNMODELED (conversion)      [—]
//
// UNMODELED lines (no damage assertion; documented here, flagged in the override with ⚑):
//   • "Reload speed is fixed at a 99.96% increase for 10 sec" is a stat LOCK (owner ruling
//     2026-07-22: "is fixed at" clamps the stat, it does NOT grant +99.96% speed). The engine has
//     no clamp vocabulary; the line is INERT in any comp without reload-speed support (this
//     fixture has none), so there is nothing to assert. ⚑ recipe: engine stat-clamp primitive.
//   • "Normal attacks deal True Damage for 10 sec" is a damage-type conversion. The primitive
//     EXISTS (weaponSwap.trueNormals — Takina's "Normal attacks deal true damage"), but enacting
//     it is MEASUREMENT-GATED: it would activate J2's trueDamagePct (currently inert — see J2b),
//     shifting a MEASURED, video-confirmed fit on an unresolved FB-state popup question (owner:
//     "do NOT re-fudge"). J2b below pins the present inertness so the compensating error is loud.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing). Jill deals damage from exactly TWO sources — normal attacks and the Acid Ammo dot; she
// has NO skill/burst direct damage (her burst is pure self-buff). That makes the normal-vs-dot
// split the clean scoping probe for her Damage-Up buffs:
//   J1  normalAttackPct folds into the NORMAL multiplier only (71.09 → 92.417 = ×1.30). Proven by
//       the normal atkPct moving while the dot total stays BYTE-identical; a generic attackDamagePct
//       (Damage-Up bucket) would lift the dot too — the counterfactual the shipped model provably
//       fails.
//   J2  the trueDamagePct buff is declared (fires once per cast) yet currently changes NO damage,
//       because her normals are not true-flavored (the conversion above is unmodeled). Asserted BOTH
//       ways: the buffApply exists AND removing it leaves her total untouched.
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
  if (ov.skill1.length === before)
    {throw new Error('jill S1 normalAttackPct block missing — fixture is stale');}
});
/** J1 counterfactual: the same +30 as a GENERIC Damage-Up buff (would lift the dot too). */
const jillGenericDmgUp = withPatchedOverride('jill', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'normalAttackPct');
  if (!e)
    {throw new Error(
      'jill S1 normalAttackPct effect missing — fixture is stale'
    );}
  e.stat = 'attackDamagePct';
});
/** J2 reference: her S1 true-damage line removed. */
const jillNoTrueDmg = withPatchedOverride('jill', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'trueDamagePct'));
  if (ov.skill1.length === before)
    {throw new Error('jill S1 trueDamagePct block missing — fixture is stale');}
});
/** J3 reference: her Acid Ammo dot removed. */
const jillNoDot = withPatchedOverride('jill', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'dot')
  );
  if (ov.skill2.length === before)
    {throw new Error('jill S2 dot block missing — fixture is stale');}
});
/** J4 counterfactual: the ATK buff on the WRONG trigger (burstCast instead of fullBurstEnter). */
const jillAtkOnCast = withPatchedOverride('jill', (ov) => {
  let hit = false;
  for (const b of ov.skill2)
    {if (b.trigger.kind === 'fullBurstEnter') {
      b.trigger.kind = 'burstCast';
      hit = true;
    }}
  if (!hit)
    {throw new Error('jill S2 fullBurstEnter block missing — fixture is stale');}
});
/** J5 reference: her burst Attack Damage line removed. */
const jillNoAtkDmg = withPatchedOverride('jill', (ov) => {
  for (const b of ov.burst)
    {b.effects = b.effects.filter((e: any) => e.stat !== 'attackDamagePct');}
});
/** J6 reference: her burst Hit Rate line removed. */
const jillNoHitRate = withPatchedOverride('jill', (ov) => {
  for (const b of ov.burst)
    {b.effects = b.effects.filter((e: any) => e.stat !== 'hitRatePct');}
});
/** J7 reference: her burst ammo-dump (forced reload) removed. */
const jillNoConsume = withPatchedOverride('jill', (ov) => {
  let hit = false;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'consumeAmmo');
    if (b.effects.length !== before) {hit = true;}
  }
  if (!hit)
    {throw new Error('jill burst consumeAmmo effect missing — fixture is stale');}
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

  describe('J2 — S1 True Damage ▲34.99% on burst cast (declared; currently damage-inert)', () => {
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

    it('is INERT today: removing it changes no damage (normals are not true-flavored)', () => {
      // Documents the compensating error: without the burst true-damage CONVERSION (unmodeled),
      // trueDamagePct has no true-flavored hit to apply to. When the conversion is enacted this
      // assertion must be flipped to a damage-moving one (⚑ recipe in the override).
      expect(base.totals.jill).toBe(noTrueDmg.totals.jill);
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
      expect(base.totals.jill).toBeGreaterThan(noDot.totals.jill * 1.3);
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

    it('DISCRIMINATING: without consumeAmmo, most casts have no close reload', () => {
      const bursts = jillBursts(noConsume.events);
      const reloads = jillReloads(noConsume.events);
      const forced = bursts.filter((c) =>
        reloads.some(
          (r) => r.frame >= c.frame && r.frame <= c.frame + RELOAD_WINDOW_F
        )
      );
      expect(forced.length).toBeLessThan(bursts.length);
    });
  });
});
