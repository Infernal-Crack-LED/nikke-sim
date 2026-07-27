// PER-UNIT KIT SPEC — `zwei` (Zwei, Supporter/SG/Electric, Burst I, cd 20s, ammo 9, hitsPerShot 10).
// Kit-autonomy gauntlet 2026-07-24 (driver-authored S2a; tests FIRST; reconciled vs blind S2b fable).
//
// One assertion group per KIT LINE (Z1..Z8), asserted against the override loaded from disk.
// `withPatchedOverride` builds COUNTERFACTUALS only (the nearest-wrong reading each assertion must
// discriminate against) — never the encoding under test.
//
// Kit (data/characters.json → characters.zwei.skills):
//   S1 ■ entering Full Burst → all allies: Pierce Damage ▲20.13% for 1 ROUND(S)            [Z1]
//      ■ entering Full Burst → all allies: Pierce Damage ▲10.06% for 10 sec                [Z2]
//      ■ normal attack during Full Burst → all allies: Pierce Damage ▲24.99% ×3, 1 ROUND   [Z3]
//   S2 ■ after 5 normal attacks → all allies: Restores 7.52% of Cover HP  (UNMODELED)      [Z4]
//      ■ entering Full Burst → all allies: Critical Rate ▲18.63% for 10 sec                [Z5]
//      ■ normal attack while in Pierce Attacks 101 status → all allies: Crit Rate ▲15% ×3, 5s [Z6]
//   BU ■ self: Changes weapon → charge cannon 50.69% final ATK, charge 1.2s, Full Charge    [Z7]
//         300%, Max Ammo 1, Additional Effect: Pierce (swap-scoped)
//      ■ all allies: Pierce Attacks 101 = Pierce Damage ▲25.03% for 10 sec (on burst cast)  [Z8]
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong gates nothing):
//   Z1  "for 1 round(s)" is a ROUND count (durationShots 1, holder-scoped, NO wall-clock expiry),
//       NEVER durationSec. Nearest-wrong: the stale parser-baseline encoding durationSec 5 (the schema
//       had no round primitive when it was authored; durationShots now exists — helm carrier). GREEN vs
//       faithful (durationShots 1 / expiresFrame null), RED vs durationSec 5 (expiresFrame +300).
//   Z2  a 10-SECOND timed buff on fullBurstEnter (5 FB → 5 applications/target). Nearest-wrong trigger:
//       burstCast (Zwei casts 9× → 9/target). Count-per-target discriminates the trigger identity.
//   Z3  round-count (durationShots 1) AND ×3 stacking AND fbGate(inFb) ("during Full Burst"). Nearest-wrong:
//       durationSec 5 (round misread) — RED on durationShots; ungated (no fbGate) fires on every Zwei shot,
//       not just the in-FB ones — RED on "every application lands inside an FB window".
//   Z4  UNMODELED (it.skip): "Restores 7.52% of Cover HP" — no cover/HP pool in the partless-boss sim, and
//       whether cover repair fires ally 'recovery' triggers is an UNVERIFIED hypothesis. Encoding it as a
//       `heal` would pump crown's on-recovery tandem (+20.99% AD) every 5 Zwei shots off an unmeasured
//       mechanic (measured>fudge). Blind S2b independently converged on UNMODELED. Documented, not dropped.
//   Z5  unscoped Critical Rate ▲ (critRatePct — lifts crit on EVERY bucket) vs the scoped critRateNormalPct
//       (normal attacks only). Nearest-wrong: scoped. Proven two ways: the buffApply stat is critRatePct
//       (not critRateNormalPct), AND the scoped counterfactual leaves the team's skill/burst bucket crit
//       rates UNCHANGED while the generic model lifts them.
//   Z6  ×3 stacking, 5-SECOND window, swapGate('swapped') as the documented proxy for "while in Pierce
//       Attacks 101 status" — that ally-held status is her burst's 25.03% pierce team-buff (10s from
//       burstCast); no ally-buff-state gate primitive exists, so swapGate (the swap is live for the same
//       ⚑10s from burstCast) is the faithful proxy and, unlike fbGate, stays silent on rotations Zwei does
//       NOT burst. Nearest-wrong: UNGATED shotFired — her base SG fires all fight, so ungated parks the team
//       at +45% crit permanently (the single largest over-credit in this kit) — RED on "every application
//       lands inside a [burstCast, +10s] window" and on application count.
//   Z7  swap-scoped Pierce ("Additional Effect: Pierce" on the CHANGED weapon): the swap cannon shots
//       (atkPct 50.69) exist and are pierce-tagged. Nearest-wrong: weaponSwap removed → no 50.69 shots.
//   Z8  burstCast trigger (fires per Zwei cast = 9×/target), NOT fullBurstEnter (5×/target). The named
//       "Pierce Attacks 101" status is an ALLY buff (not an enemy status), so it is the pierceDamagePct
//       buff itself + the gate key for Z6. Nearest-wrong trigger: fullBurstEnter — RED on 9×/target.
//
// Fixture: Zwei is Burst I, so a custom sole-B1 comp [zwei(B1) / crown(B2) / helm(B3)] is used (NOT
// controlComp, which would add liter as a second B1 and make the Z6 status-gate proxy inexact). Zwei is
// the sole Burst I → every Full Burst follows her cast → the swapGate proxy for "Pierce Attacks 101 status"
// is exact here. Boss Fire (Zwei is Electric → clean ×1.10), focus Zwei. Deterministic (no seed).
// Slot order: zwei 0 / crown 1 / helm 2.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const ZWEI = 0;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

const FIXTURE = {
  slugs: ['zwei', 'crown', 'helm'] as string[],
  bossElement: 'Fire' as const,
  focusSlug: 'zwei',
};

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({ ...FIXTURE, overrides, cfg: { onEvent: (e) => events.push(e) } });
  return { events };
}

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const zweiBuffs = (evs: SimEvent[], stat: string, value: number) =>
  buffs(evs).filter(
    (b) => b.casterIdx === ZWEI && b.stat === stat && b.value === value
  );
const perTarget = (bs: BuffApply[], tgt: number) =>
  bs.filter((b) => b.targetIdx === tgt);
const zweiShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'zwei');
const zweiBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'zwei'
  );
const zweiDamage = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage' && e.slug === 'zwei');

/** Full-Burst windows [startFrame, endFrame] from the boundary events. */
function fbWindows(evs: SimEvent[]): [number, number][] {
  return evs
    .filter((e) => e.kind === 'fullBurstStart')
    .map((e: any) => [e.frame, e.endFrame]);
}
/** [burstCast, +10s] windows — the Pierce Attacks 101 status window the Z6 gate reads. */
function castWindows(evs: SimEvent[]): [number, number][] {
  return zweiBursts(evs).map((c) => [c.frame, c.frame + 10 * FPS]);
}
const inWindow = (frame: number, wins: [number, number][]) =>
  wins.some(([s, e]) => frame >= s && frame <= e);

/** Distinct crit rates seen per unit on the given buckets — the Z5 scope discriminator. */
function critRatesByUnit(
  evs: SimEvent[],
  buckets: Damage['bucket'][]
): Record<string, string> {
  const out: Record<string, Set<string>> = {};
  for (const d of evs.filter((e): e is Damage => e.kind === 'damage')) {
    if (!buckets.includes(d.bucket)) {continue;}
    (out[d.slug] ??= new Set()).add(d.critRate.toFixed(9));
  }
  return Object.fromEntries(
    Object.entries(out).map(([k, v]) => [k, [...v].sort().join(',')])
  );
}

// ---- counterfactual patches (nearest-wrong readings) -----------------------------------------
const eff = (b: any, stat: string, value: number) =>
  b.effects.find((e: any) => e.stat === stat && e.value === value);

/** Z1/Z3 nearest-wrong: the "for 1 round(s)" lines as wall-clock durationSec 5 (stale baseline). */
const cfRoundSec = withPatchedOverride('zwei', (ov: any) => {
  for (const b of ov.skill1)
    {for (const e of b.effects) {
      if (
        e.stat === 'pierceDamagePct' &&
        (e.value === 20.13 || e.value === 24.99)
      ) {
        delete e.durationShots;
        e.durationSec = 5;
      }
    }}
});
/** Z2 nearest-wrong: the 10.06% FB-enter buff keyed to burstCast (9×/target) instead of fullBurstEnter (5×). */
const cfS2Trigger = withPatchedOverride('zwei', (ov: any) => {
  const b = ov.skill1.find((x: any) =>
    x.effects.some(
      (e: any) => e.stat === 'pierceDamagePct' && e.value === 10.06
    )
  );
  if (!b) {throw new Error('zwei S1 10.06 block missing — fixture is stale');}
  b.trigger = { kind: 'burstCast' };
});
/** Z5 nearest-wrong: the 18.63% crit as scoped critRateNormalPct (normal attacks only). */
const cfCritScoped = withPatchedOverride('zwei', (ov: any) => {
  const e = eff(
    ov.skill2.find((x: any) =>
      x.effects.some((y: any) => y.stat === 'critRatePct' && y.value === 18.63)
    ),
    'critRatePct',
    18.63
  );
  if (!e)
    {throw new Error('zwei S2 18.63 crit effect missing — fixture is stale');}
  e.stat = 'critRateNormalPct';
});
/** Z3/Z6 nearest-wrong: strip the gate from BOTH normal-attack lines — skill1 24.99% (fbGate inFb) and
 *  skill2 15% (swapGate swapped) — so they fire on every Zwei shot, in and out of FB / the swap window. */
const cfNoGate = withPatchedOverride('zwei', (ov: any) => {
  let stripped = 0;
  for (const slot of ['skill1', 'skill2'] as const)
    {for (const b of ov[slot])
      {if (b.trigger?.kind === 'shotFired' && (b.fbGate || b.swapGate)) {
        delete b.fbGate;
        delete b.swapGate;
        stripped++;
      }}}
  if (stripped < 2)
    {throw new Error(
      'zwei expected 2 gated shotFired blocks — fixture is stale'
    );}
});
/** Z7 nearest-wrong: the burst weaponSwap removed. */
const cfNoSwap = withPatchedOverride('zwei', (ov: any) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'weaponSwap')
  );
  if (ov.burst.length === before)
    {throw new Error('zwei burst weaponSwap block missing — fixture is stale');}
});
/** Z8 nearest-wrong: the 25.03% pierce team-buff keyed to fullBurstEnter (5×/target) not burstCast (9×). */
const cfBurstPierceFbEnter = withPatchedOverride('zwei', (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some(
      (e: any) => e.stat === 'pierceDamagePct' && e.value === 25.03
    )
  );
  if (!b)
    {throw new Error('zwei burst 25.03 pierce block missing — fixture is stale');}
  b.trigger = { kind: 'fullBurstEnter' };
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const roundSec = run({ zwei: cfRoundSec });
const s2Trigger = run({ zwei: cfS2Trigger });
const critScoped = run({ zwei: cfCritScoped });
const noGate = run({ zwei: cfNoGate });
const noSwap = run({ zwei: cfNoSwap });
const burstPierceFb = run({ zwei: cfBurstPierceFbEnter });

const wins = fbWindows(base.events);
const castWins = castWindows(base.events);

describe('zwei — kit spec', () => {
  describe('Z1 — S1 FB-enter Pierce Damage 20.13% is a ROUND count (for 1 round), all allies', () => {
    const applied = zweiBuffs(base.events, 'pierceDamagePct', 20.13);
    it('is durationShots 1 with NO wall-clock expiry (round-count, not seconds)', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.durationShots))]).toEqual([1]);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame))],
        'a round-count buff carries no timed expiry'
      ).toEqual([null]);
    });
    it('reaches all three allies once per Full Burst', () => {
      for (const tgt of [0, 1, 2])
        {expect(perTarget(applied, tgt).length).toBe(wins.length);}
    });
    it('DISCRIMINATING: the stale durationSec 5 encoding carries a timed expiry, not a round budget', () => {
      const cf = zweiBuffs(roundSec.events, 'pierceDamagePct', 20.13);
      expect([...new Set(cf.map((b) => b.durationShots))]).toEqual([null]);
      expect([
        ...new Set(
          cf.map((b) =>
            b.expiresFrame != null ? b.expiresFrame - b.frame : null
          )
        ),
      ]).toEqual([5 * FPS]);
    });
  });

  describe('Z2 — S1 FB-enter Pierce Damage 10.06% for 10 sec (timed), all allies', () => {
    const applied = zweiBuffs(base.events, 'pierceDamagePct', 10.06);
    it('is a 10-second timed buff (expiresFrame +600), no round budget', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
      expect([...new Set(applied.map((b) => b.durationShots))]).toEqual([null]);
    });
    it('DISCRIMINATING: keyed to fullBurstEnter (5×/target), NOT burstCast (9×/target)', () => {
      expect(perTarget(applied, ZWEI).length).toBe(wins.length); // 5 (per FB)
      const cf = zweiBuffs(s2Trigger.events, 'pierceDamagePct', 10.06);
      expect(perTarget(cf, ZWEI).length).toBe(zweiBursts(base.events).length); // 9 (per cast)
      expect(perTarget(cf, ZWEI).length).not.toBe(
        perTarget(applied, ZWEI).length
      );
    });
  });

  describe('Z3 — S1 normal-attack-in-FB Pierce Damage 24.99% ×3 stacks, for 1 ROUND', () => {
    const applied = zweiBuffs(base.events, 'pierceDamagePct', 24.99);
    it('is a round-count (durationShots 1) buff with a ×3 stacking CAP', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.durationShots))]).toEqual([1]);
      // "stacks up to 3 time(s)" → the CAP is 3. With durationShots 1 each stack expires after the
      // holder's next round, so stacks rarely ACCRUE to 3 in-fight (S2b: "stacks on a fast ally
      // effectively never reach 3 simultaneously") — the faithful claim is the cap, not the accrual.
      expect([...new Set(applied.map((b) => b.maxStacks))]).toEqual([3]);
      expect(applied.some((b) => b.stacks >= 1)).toBe(true);
    });
    it('fires ONLY during Full Burst (fbGate inFb) — every application lands in an FB window', () => {
      expect(applied.every((b) => inWindow(b.frame, wins))).toBe(true);
    });
    it('DISCRIMINATING: durationSec 5 (round misread) loses the round budget', () => {
      const cf = zweiBuffs(roundSec.events, 'pierceDamagePct', 24.99);
      expect([...new Set(cf.map((b) => b.durationShots))]).toEqual([null]);
    });
    it('DISCRIMINATING: ungated (no fbGate) fires outside FB windows too', () => {
      const cf = zweiBuffs(noGate.events, 'pierceDamagePct', 24.99);
      expect(
        cf.some((b) => !inWindow(b.frame, wins)),
        'ungated applications must appear outside FB'
      ).toBe(true);
      expect(cf.length).toBeGreaterThan(applied.length);
    });
  });

  describe('Z4 — S2 every-5-normal-attacks Cover HP restore is UNMODELED (documented, not a heal)', () => {
    it.skip(
      'GAP/UNMODELED: no cover/HP pool in the partless-boss sim; whether cover repair fires ally ' +
        "'recovery' triggers is an UNVERIFIED hypothesis (⚑). Encoding it as a `heal` would pump crown's " +
        'on-recovery tandem (+20.99% AD) every 5 Zwei shots off an unmeasured mechanic (measured>fudge). ' +
        'Blind S2b independently converged on UNMODELED. The line is recorded verbatim in unmodeled.skill2 + ' +
        'caveats, not silently dropped.',
      () => {}
    );
  });

  describe('Z5 — S2 FB-enter Critical Rate 18.63% for 10 sec is UNSCOPED (generic), all allies', () => {
    const applied = zweiBuffs(base.events, 'critRatePct', 18.63);
    it('is the generic critRatePct stat (not the scoped critRateNormalPct), 10s, once per FB', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.stat))]).toEqual(['critRatePct']);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
      expect(perTarget(applied, ZWEI).length).toBe(wins.length);
    });
    it('DISCRIMINATING: a scoped critRateNormalPct would leave skill/burst bucket crit UNCHANGED', () => {
      expect(critRatesByUnit(base.events, ['skill', 'burst'])).not.toEqual(
        critRatesByUnit(critScoped.events, ['skill', 'burst'])
      );
      expect(zweiBuffs(critScoped.events, 'critRatePct', 18.63).length).toBe(0);
    });
  });

  describe('Z6 — S2 normal-attack-while-Pierce-Attacks-101 Crit Rate 15% ×3, 5 sec (swapGate proxy)', () => {
    const applied = zweiBuffs(base.events, 'critRatePct', 15);
    it('is a 5-second ×3-stacking buff', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([5 * FPS]);
      expect([...new Set(applied.map((b) => b.maxStacks))]).toEqual([3]);
      expect([...new Set(applied.map((b) => b.stacks))].sort()).toEqual([
        1, 2, 3,
      ]);
    });
    it('fires ONLY inside the Pierce Attacks 101 window ([burstCast, +10s]) — the swapGate proxy', () => {
      expect(applied.every((b) => inWindow(b.frame, castWins))).toBe(true);
    });
    it('DISCRIMINATING: ungated (no swapGate) fires outside the windows + far more often', () => {
      const cf = zweiBuffs(noGate.events, 'critRatePct', 15);
      expect(
        cf.some((b) => !inWindow(b.frame, castWins)),
        'ungated applications must appear outside the window'
      ).toBe(true);
      expect(cf.length).toBeGreaterThan(applied.length);
    });
  });

  describe('Z7 — burst self weaponSwap: charge cannon 50.69% final ATK, swap-scoped Pierce', () => {
    const swapShots = (evs: SimEvent[]) =>
      zweiDamage(evs).filter((d) => d.atkPct === 50.69);
    it('the swap cannon fires (atkPct 50.69 shots exist) and is removed with the swap block', () => {
      expect(swapShots(base.events).length).toBeGreaterThan(0);
      expect(swapShots(noSwap.events).length).toBe(0);
    });
    // NOTE: no teammate-inertness assertion here, and deliberately so. The swap is self-targeted, but
    // removing it shifts Zwei's shot CADENCE (charge cannon ≠ SG timing), which shifts her shotFired-
    // triggered team buffs (the 24.99% pierce + 15% crit stacks), moving crown/helm ~1%. A "removing the
    // swap moves no teammate total" assertion is therefore FALSE — self-scoped but not teammate-inert.
  });

  describe('Z8 — burst Pierce Attacks 101 = Pierce Damage 25.03% for 10 sec, all allies, on BURST CAST', () => {
    const applied = zweiBuffs(base.events, 'pierceDamagePct', 25.03);
    it('is a 10-second timed buff reaching all three allies', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
      for (const tgt of [0, 1, 2])
        {expect(perTarget(applied, tgt).length).toBeGreaterThan(0);}
    });
    it('DISCRIMINATING: keyed to burstCast (9×/target), NOT fullBurstEnter (5×/target)', () => {
      expect(perTarget(applied, ZWEI).length).toBe(
        zweiBursts(base.events).length
      ); // 9 (per cast)
      const cf = zweiBuffs(burstPierceFb.events, 'pierceDamagePct', 25.03);
      expect(perTarget(cf, ZWEI).length).toBe(wins.length); // 5 (per FB)
      expect(perTarget(cf, ZWEI).length).not.toBe(
        perTarget(applied, ZWEI).length
      );
    });
  });
});
