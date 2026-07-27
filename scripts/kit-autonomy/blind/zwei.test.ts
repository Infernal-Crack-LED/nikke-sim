// PER-UNIT KIT SPEC — `zwei` (Zwei, Supporter/SG/Electric, Burst I, cd 20s, ammo 9,
// reloadFrames 111, hitsPerShot 10, normalAttackMultiplier 201.5, coreAttackMultiplier 200).
// BLIND author: written from kit PROSE ALONE (S5). No sight of the driver's test/override/reasoning.
//
// Kit (blablalink prose):
//   S1 ■ entering Full Burst → all allies: Pierce Damage ▲20.13% for 1 ROUND;                   [Z1a]
//                                          Pierce Damage ▲10.06% for 10 sec.                     [Z1b]
//      ■ normal attack DURING Full Burst → all allies: Pierce Damage ▲24.99% x3, for 1 ROUND.   [Z2]
//   S2 ■ after 5 normal attacks → all allies: Restores 7.52% Cover HP (recovery event)           [Z3]
//      ■ entering Full Burst → all allies: Critical Rate ▲18.63% for 10 sec.                     [Z4]
//      ■ normal attack while in "Pierce Attacks 101" status → all allies:                        [Z5]
//                                          Critical Rate ▲15% for 5 sec, x3.
//   BU ■ self: weapon swap — charge 1.2s, dmg 50.69% ATK, full-charge 300%, max ammo 1, +Pierce  [Z6]
//      ■ all allies: "Pierce Attacks 101": Pierce Damage ▲25.03% for 10 sec.                     [Z7]
//
// WHOLE-PICTURE (the load-bearing read): pierceDamagePct is INERT in v1 unless the holder is
// Pierce-tagged (types.ts). Zwei's base SG is NOT pierce; teammates get pierce ONLY from the burst.
// The burst's ally line is a NAMED STATUS "Pierce Attacks 101" — the name itself denotes granting
// Pierce attacks, so I model it as gainPierce(allies,10s) + pierceDamagePct 25.03. ⚑ INTERPRETIVE:
// if the status were a bare label with no pierce grant, every S1/BU Pierce Damage ▲ stays inert and
// moves ZERO damage. The two joint-damage assertions (Z7) are therefore the PRIMARY driver-
// convergence detector: if the driver read the status as a bare label, they go RED — the payload.
//
// Two INDEPENDENT proof channels are used so the pierce assertions do not all hinge on that one read:
//   (A) BUFF-APPLICATION semantics (Z1/Z2): a Pierce Damage ▲ buff is APPLIED (buffApply event) with
//       the right value / ROUND-count duration / ally target set REGARDLESS of whether it feeds damage
//       — this pins the "for 1 round(s)" trap (durationShots, NOT durationSec) even while inert.
//   (B) DAMAGE movement (Z7): teammate totals move only if gainPierce is live AND zwei bursts.
//
// FIXTURE CAVEAT (⚑ critical): controlComp forces the carry into a support slot, but zwei is BURST I
// and COLLIDES with liter (also B1). The team [liter, crown, zwei, helm] completes Full Burst via
// liter(B1)→crown(B2)→helm(B3) whether or not zwei ever casts HER burst. So the two FB-ENTER lines
// (Z1, Z4) fire on the team's FB regardless — but Z6 (self swap), Z7 (ally pierce grant) and Z5
// ("Pierce Attacks 101" window) all need zwei to ACTUALLY CAST. The `fixture sanity` test guards this:
// if it goes RED, those assertions are known-vacuous and the comp must be rebuilt with zwei in B1.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

const FPS = 60;
const CARRY = 'zwei';
/** controlComp slot order: liter 0 / crown 1 / zwei 2 / helm 3. */
const LITER = 0;
const ZWEI = 2;
const ALL_ALLIES = new Set([0, 1, 2, 3]); // 4-unit team, slot 5 empty

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(CARRY),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res), res };
}

// ---- counterfactual patches (nearest-wrong models each assertion must discriminate against) ----
const allSlots = (ov: any) => [
  ov.skill1 ?? [],
  ov.skill2 ?? [],
  ov.burst ?? [],
];
/** Zero every Pierce Damage ▲ magnitude — kills the S1/BU pierce contribution to teammate damage. */
const zeroPierce = withPatchedOverride('zwei', (ov) => {
  let n = 0;
  for (const slot of allSlots(ov))
    {for (const b of slot)
      {for (const e of b.effects)
        {if (e.stat === 'pierceDamagePct') {
          e.value = 0;
          n++;
        }}}}
  if (n === 0)
    {throw new Error(
      'zwei: no pierceDamagePct effects found — fixture is stale'
    );}
});
/** Remove the burst's Pierce GRANT (my gainPierce read of "Pierce Attacks 101"). If the driver did
 *  NOT model a grant, this patch is a no-op and the Z7 grant-dependency assertion goes RED — payload. */
const noGainPierce = withPatchedOverride('zwei', (ov) => {
  for (const slot of allSlots(ov))
    {for (const b of slot)
      {b.effects = b.effects.filter((e: any) => e.kind !== 'gainPierce');}}
});
/** Remove the burst weapon swap. */
const noSwap = withPatchedOverride('zwei', (ov) => {
  let n = 0;
  for (const b of ov.burst ?? []) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'weaponSwap');
    n += before - b.effects.length;
  }
  if (n === 0)
    {throw new Error('zwei: no weaponSwap effect in burst — fixture is stale');}
});

// ---- runs (hoisted: each is a full 180s sim) ---------------------------------------------------
const base = run();
const pierceZeroed = run({ zwei: zeroPierce });
const grantRemoved = run({ zwei: noGainPierce });
const swapRemoved = run({ zwei: noSwap });

// ---- readers ----------------------------------------------------------------------------------
const zweiBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  evs.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' &&
      e.casterIdx === ZWEI &&
      e.stat === stat &&
      (value === undefined || Math.abs(e.value - value) < 0.005)
  );
const zweiBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'zwei'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').length;
/** [start,end] frame windows for every Full Burst. */
function fbWindows(evs: SimEvent[]): [number, number][] {
  const s = evs
    .filter((e) => e.kind === 'fullBurstStart')
    .map((e: any) => e.frame);
  const e2 = evs
    .filter((e) => e.kind === 'fullBurstEnd')
    .map((e: any) => e.frame);
  return s.map((f, i) => [f, e2[i] ?? Infinity]);
}
const inSomeFb = (frame: number, w: [number, number][]) =>
  w.some(([a, b]) => frame >= a && frame <= b);
/** allies reached per application frame — a self-scoped mis-encoding collapses this to {ZWEI}. */
function targetsPerFrame(apps: BuffApply[]): Set<number | null>[] {
  const byFrame = new Map<number, Set<number | null>>();
  for (const b of apps)
    {(byFrame.get(b.frame) ?? byFrame.set(b.frame, new Set()).get(b.frame)!).add(
      b.targetIdx
    );}
  return [...byFrame.values()];
}

describe('zwei — kit spec', () => {
  describe('fixture sanity (zwei is BURST I, may collide with liter in controlComp)', () => {
    it('the team enters Full Burst at least once', () => {
      expect(fbStarts(base.events)).toBeGreaterThan(0);
    });
    it('zwei actually CASTS her burst — else Z5/Z6/Z7 are vacuous', () => {
      expect(
        zweiBursts(base.events).length,
        'zwei never cast her B1 burst in controlComp (liter B1 collision) — the swap/grant/status ' +
          'assertions below cannot be exercised; rebuild the comp with zwei in the B1 slot'
      ).toBeGreaterThan(0);
    });
  });

  describe('Z4 — S2 Critical Rate ▲18.63% on FB entry, ALL allies, 10 sec', () => {
    const apps = zweiBuffs(base.events, 'critRatePct', 18.63);
    it('is applied at the kit magnitude on Full Burst entry', () => {
      expect(apps.length).toBeGreaterThan(0);
      expect([...new Set(apps.map((b) => b.value))]).toEqual([18.63]);
    });
    it('DISCRIMINATING: reaches all four allies (not self-scoped)', () => {
      for (const holders of targetsPerFrame(apps)) {
        expect(holders).toEqual(ALL_ALLIES);
      }
    });
    it('DISCRIMINATING: 10-SECOND window, not rounds/other', () => {
      for (const b of apps) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
        expect(b.durationShots ?? null).toBeNull();
      }
    });
    it('fires once per holder per Full Burst (FB-enter, not per-shot)', () => {
      // one application-frame per FB; per-shot would produce many more.
      const frames = new Set(apps.map((b) => b.frame));
      expect(frames.size).toBeLessThanOrEqual(fbStarts(base.events));
    });
  });

  describe('Z5 — S2 Critical Rate ▲15% for 5 sec, x3, gated on "Pierce Attacks 101" status', () => {
    const apps = zweiBuffs(base.events, 'critRatePct', 15);
    it('is applied at 15% for 5 sec (distinct from the 18.63% FB-enter buff)', () => {
      expect(apps.length).toBeGreaterThan(0);
      expect([...new Set(apps.map((b) => b.value))]).toEqual([15]);
      for (const b of apps) {expect(b.expiresFrame! - b.frame).toBe(5 * FPS);}
    });
    it('GATE APPROXIMATION: applications occur only AFTER zwei has cast her burst (status opens then)', () => {
      // No ally-self-status gate primitive exists in the schema; "Pierce Attacks 101" is granted by
      // zwei's burst, so a faithful approximation confines this buff to post-burst windows. A model
      // that fires it from t=0 (ungated) would apply it before the first zwei burst.
      const firstBurst = Math.min(
        ...zweiBursts(base.events).map((c: any) => c.frame)
      );
      for (const b of apps) {expect(b.frame).toBeGreaterThanOrEqual(firstBurst);}
    });
  });

  describe('Z1 — S1 Pierce Damage ▲ on FB entry (ROUND-count trap), ALL allies', () => {
    // NOTE: pierceDamagePct is inert-for-damage until the holder is pierce-tagged, but the buff is
    // still APPLIED — these assertions pin the DURATION SEMANTICS independent of the gainPierce read.
    const a = zweiBuffs(base.events, 'pierceDamagePct', 20.13);
    const b = zweiBuffs(base.events, 'pierceDamagePct', 10.06);
    it('Z1a: 20.13% lasts 1 ROUND (durationShots 1, NO wall-clock expiry) — not 1 second', () => {
      expect(a.length).toBeGreaterThan(0);
      expect([...new Set(a.map((x) => x.durationShots))]).toEqual([1]);
      expect([...new Set(a.map((x) => x.expiresFrame))]).toEqual([null]);
    });
    it('Z1b: 10.06% lasts 10 SECONDS (durationSec, no round count)', () => {
      expect(b.length).toBeGreaterThan(0);
      for (const x of b) {
        expect(x.expiresFrame! - x.frame).toBe(10 * FPS);
        expect(x.durationShots ?? null).toBeNull();
      }
    });
    it('both reach all four allies', () => {
      for (const holders of targetsPerFrame([...a, ...b]))
        {expect(holders).toEqual(ALL_ALLIES);}
    });
  });

  describe('Z2 — S1 Pierce Damage ▲24.99% x3, per normal attack DURING Full Burst, 1 round', () => {
    const z2 = zweiBuffs(base.events, 'pierceDamagePct', 24.99);
    const z1 = zweiBuffs(base.events, 'pierceDamagePct', 20.13);
    it('is applied at 24.99% for 1 round', () => {
      expect(z2.length).toBeGreaterThan(0);
      expect([...new Set(z2.map((x) => x.durationShots))]).toEqual([1]);
    });
    it('DISCRIMINATING: fires PER-SHOT in FB (many applications), not once-per-FB like Z1a', () => {
      // a fullBurstEnter mis-encoding would produce ~the same count as the 20.13% once-per-FB line.
      expect(z2.length).toBeGreaterThan(z1.length);
    });
    it('every application lands inside a Full Burst window (fbGate inFb)', () => {
      const w = fbWindows(base.events);
      for (const x of z2) {expect(inSomeFb(x.frame, w)).toBe(true);}
    });
  });

  describe('Z6 — BU weapon swap (self): 50.69% dmg / 300% full-charge / 1 ammo / +Pierce', () => {
    it("changes ZWEI's own damage vs the no-swap counterfactual", () => {
      // (couples on zwei actually bursting — guarded by fixture sanity)
      expect(base.totals.zwei).not.toBe(swapRemoved.totals.zwei);
    });
    it("is SELF-scoped: a teammate's total is (near-)inert to the swap", () => {
      // swap only alters zwei\'s own shots; any residual teammate delta is second-order (gauge/FB
      // timing from her changed cadence), so allow a small tolerance rather than byte-equality.
      const a = base.totals.liter;
      const c = swapRemoved.totals.liter;
      expect(Math.abs(a - c) / c).toBeLessThan(0.02);
    });
  });

  describe('Z7 — BU "Pierce Attacks 101": gainPierce(allies) is what makes every Pierce Damage ▲ live', () => {
    // PRIMARY DRIVER-CONVERGENCE PAYLOAD. Both assertions require (a) zwei to burst and (b) the burst
    // to grant allies Pierce. If the driver read "Pierce Attacks 101" as a bare label (no pierce
    // grant), teammates never become pierce-tagged, every Pierce Damage ▲ stays inert, and BOTH go
    // RED — surfacing the divergence.
    it('teammate damage DROPS when all Pierce Damage ▲ magnitudes are zeroed', () => {
      expect(base.totals.liter).toBeGreaterThan(
        pierceZeroed.totals.liter
      );
    });
    it('teammate damage DROPS when the pierce GRANT is removed (proves the grant, not just the ▲)', () => {
      expect(base.totals.liter).toBeGreaterThan(
        grantRemoved.totals.liter
      );
    });
  });

  // Z3 — GAP: S2 "Restores 7.52% Cover HP after 5 normal attacks" is a recovery event with NO HP pool
  // in v1 and NO recovery/heal event kind exposed on cfg.onEvent. It is observable ONLY through a
  // teammate\'s on-recovery consumer (tandem), whose buff signature this BLIND test cannot key on
  // without the consumer\'s kit — and crown\'s own heal + helm\'s per-charge heal both saturate any
  // such consumer, masking zwei\'s contribution. Left as a documented skip.
  it.skip('Z3 — heal drives a tandem on-recovery consumer (unobservable blind; masked by crown/helm heals)', () => {});
});
