// PER-UNIT KIT SPEC — `diesel` (Diesel (Treasure), Defender/MG/Wind, Burst II, cd 20s, ammo 300,
// reloadFrames 151, hitsPerShot 1). Kit-autonomy gauntlet 2026-08-01.
//
// AUTHORITATIVE PROSE = the top-level data/characters.json `skills` field (the Treasure rework).
// The datamine role.skillDetails.*_detail.description_localkey is the UNTREASURED BASE kit and
// DISAGREES (base: S1 heal 'when attacked during Full Burst' + no 150-NA clause; S2 threshold
// 100 NA + no Pierce; burst taunt 5.06s + no Max HP). Every expected magnitude below is read from
// the Treasure prose, NOT from the override's own numbers.
//
// She is a TANK — most of the kit is defensive/utility and inert in the v1 DPS sim (no incoming
// damage, no HP pool, no taunt/Attract primitive). One assertion group per kit LINE:
//   S1 ■ entering Full Burst → self: DEF ▲25.92% for 10 sec                              [L1 inert]
//      ■ attacked in Attract status → self: Recovers 12.96% final Max HP                 [L2 UNMODELED]
//      ■ 150 normal attacks in Attract status → self: Stack count of buffs ▲1            [L3 UNMODELED]
//   S2 ■ 70 normal attacks → self: Strawberry Candy Max Ammo ▲56.7% x10 stacks, 10 sec    [L4 LIVE]
//      ■ reaches max stacks → all allies: Reload 86.62% magazine + Pierce ▲30% 10 sec     [L5 approx]
//   BU ■ 5 highest-final-ATK enemies: 299.66% final ATK as damage                        [L6 LIVE]
//      ■ self: Max HP ▲100.05% without restoring HP for 10 sec                           [L7 inert]
//      ■ Attract: Taunt all enemies for 10 sec                                           [L8 UNMODELED]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   L1  defPct is INERT in v1 (self DEF never feeds a Defender's own damage). Proven two ways: the
//       buffApply event exists at the kit value/scope/duration (the line IS encoded), AND removing
//       it leaves EVERY unit's total byte-identical (it is genuinely inert, not a damage buff
//       mislabeled). Counterfactual: the same line as attackDamagePct WOULD move totals — so the
//       inert assertion is one a mis-encoded damage buff provably fails.
//   L4  the Treasure threshold is 70 NA (base was 100). maxAmmoPct is LIVE — a bigger magazine means
//       fewer reloads -> more firing uptime, so shipped vs REMOVED differ on diesel's total. But the
//       damage channel SATURATES: any sufficient boost (56.7 OR 28.35 x10 stacks) already outlasts the
//       reload windows that matter in 180s, so the VALUE is not distinguishable in totals (and the
//       70-vs-100 threshold isn't either — both saturate the 10 stacks). The magnitude is therefore
//       pinned in the buffApply log (shipped [56.7] vs a wrong-value counterfactual [28.35]), and the
//       line's liveness in totals (boost vs no-boost).
//   L5  the engine has NO buff-stack-threshold / on-removal trigger, so 'reaches 10 simultaneous
//       stacks then removed' is approximated as the cumulative 700th NA (= 10 x 70-NA procs), the
//       ade-agent-bunny 'max stacks' precedent (⚑1, measurement-gated on MG cadence). Observable: the
//       pierceDamagePct 30% buffApply reaches ALL THREE allies for 10s (the instantReload half has no
//       event — it refills ammo directly — and pierceDamagePct is inert without a pierce ally, so the
//       team-wide buffApply is the clean discriminator vs a self-only or absent encoding).
//   L6  a burst CAST lands BEFORE the Full Burst window opens, so it must never take the +50% FB
//       major (verified fact). '5 enemies' collapses to the single partless boss (one hit per cast).
//   L7  targetMaxHpPct is INERT (diesel has no atkOfMaxHpPct feed). Same two-way proof as L1.
//
// UNMODELED (documented in the override's `unmodeled`, asserted NOWHERE because the engine has no
// primitive): L2 (heal needs an incoming-attack event + an Attract self-status; the v1 boss deals no
// damage), L3 (gated on the same unmodeled Attract status; 'Stack count of buffs ▲1' is ambiguous),
// L8 (no taunt/Attract primitive — tanking is out of domain for a DPS sim). All three are inert for
// damage; their absence moves no total, so there is nothing to pin.
//
// Fixture: liter (B1) / diesel (B2) / ada (B3), forced-neutral boss, focus ada — a legal B1+B2+B3
// chain so diesel CASTS her burst (~9x / 180s) and enters Full Burst (driving L1). Deterministic
// (no seed); event-log over totals where a line has an event, totals where it only moves the economy.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** runComp slot order: liter 0 / diesel 1 / ada 2. */
const DIESEL = 1;
const N_ALLIES = 3;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FullBurstStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['liter', 'diesel', 'ada'],
    bossElement: null,
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** L1 reference: her S1 DEF line removed entirely. */
const dieselNoDef = withPatchedOverride('diesel', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'defPct'));
  if (ov.skill1.length !== before - 1) {
    throw new Error('diesel S1 defPct block missing — fixture is stale');
  }
});
/** L1 counterfactual: the same FB-entry self line as a DAMAGE-relevant stat. */
const dieselDefAsDamage = withPatchedOverride('diesel', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'defPct');
  if (!e) {
    throw new Error('diesel S1 defPct effect missing — fixture is stale');
  }
  e.stat = 'attackDamagePct';
});
/** L4 reference: her Strawberry Candy max-ammo line removed. */
const dieselNoMaxAmmo = withPatchedOverride('diesel', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'maxAmmoPct'));
  if (ov.skill2.length !== before - 1) {
    throw new Error('diesel S2 maxAmmoPct block missing — fixture is stale');
  }
});
/** L4 counterfactual: half the kit value (28.35 = the under-leveled S2 magnitude) instead of
 *  56.7. The Treasure THRESHOLD change (70 NA vs base 100) is NOT behaviorally distinct in this
 *  fixture — MG fires fast enough that both thresholds saturate the 10 stacks to the same steady
 *  state, so the VALUE is the discriminator (half the capacity -> more reloads -> lower total). */
const dieselHalfAmmo = withPatchedOverride('diesel', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'maxAmmoPct');
  if (!e) {
    throw new Error('diesel S2 maxAmmoPct effect missing — fixture is stale');
  }
  e.value = 28.35;
});
/** L5 reference: her max-stack ally reload/pierce line removed. */
const dieselNoMaxStack = withPatchedOverride('diesel', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'pierceDamagePct'));
  if (ov.skill2.length !== before - 1) {
    throw new Error(
      'diesel S2 pierceDamagePct block missing — fixture is stale'
    );
  }
});
/** L5 inertness probe: Pierce Damage ▲ zeroed (30 -> 0). The fixture has NO pierce-tagged
 *  attacker, so this must leave every total byte-identical — proving the pierce half does not
 *  leak into non-pierce Damage-Up (fable S2b note 2). */
const dieselNoPierceValue = withPatchedOverride('diesel', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'pierceDamagePct');
  if (!e) {
    throw new Error(
      'diesel S2 pierceDamagePct effect missing — fixture is stale'
    );
  }
  e.value = 0;
});
/** L7 reference: her burst self Max-HP line removed. */
const dieselNoMaxHp = withPatchedOverride('diesel', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'targetMaxHpPct'));
  if (ov.burst.length !== before - 1) {
    throw new Error(
      'diesel burst targetMaxHpPct block missing — fixture is stale'
    );
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noDef = run({ diesel: dieselNoDef });
const defAsDamage = run({ diesel: dieselDefAsDamage });
const noMaxAmmo = run({ diesel: dieselNoMaxAmmo });
const halfAmmo = run({ diesel: dieselHalfAmmo });
const noMaxStack = run({ diesel: dieselNoMaxStack });
const noPierceValue = run({ diesel: dieselNoPierceValue });
const noMaxHp = run({ diesel: dieselNoMaxHp });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const dieselBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === DIESEL && b.stat === stat);
const dieselBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'diesel'
  );
/** Full Burst WINDOWS — fewer than diesel's burst casts: she casts B2 9x but a Full Burst only
 *  begins 5x in this comp (some B2 casts don't complete the chain to a window). L1 keys to the
 *  window (fullBurstEnter), L6/L7 key to her cast (burstCast). */
const fullBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is FullBurstStart => e.kind === 'fullBurstStart');
const dieselDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'diesel' && e.srcSlot === srcSlot
  );

describe('diesel (Treasure) — kit spec', () => {
  describe('L1 — S1 FB-entry DEF ▲25.92% is encoded, self-scoped, and exactly inert', () => {
    const applied = dieselBuffs(base.events, 'defPct');

    it('is 25.92% on herself for 10 sec, once per Full Burst window', () => {
      expect(applied.length).toBe(fullBursts(base.events).length);
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([25.92]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([DIESEL]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it("removing it changes NO unit's total by a single point (inert)", () => {
      expect(base.totals).toEqual(noDef.totals);
    });

    it('DISCRIMINATING: the same line as a damage stat WOULD move totals', () => {
      expect(defAsDamage.totals).not.toEqual(noDef.totals);
    });
  });

  describe('L4 — S2 Strawberry Candy is Max Ammo ▲56.7% per 70 NA, self-scoped, and LIVE', () => {
    const applied = dieselBuffs(base.events, 'maxAmmoPct');

    it('is 56.7% on herself for 10 sec, accruing as repeated stacks', () => {
      expect(applied.length).toBeGreaterThan(1);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([56.7]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([DIESEL]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is LIVE: removing it changes her total (fewer reloads -> more uptime)', () => {
      expect(base.totals.diesel).not.toEqual(noMaxAmmo.totals.diesel);
    });

    it('DISCRIMINATING: the magnitude is pinned by the event log, where a wrong value shows up', () => {
      // The damage channel SATURATES: 56.7x10 (567%) and 28.35x10 (283.5%) capacity both already
      // outlast the reload windows that matter in 180s, so halfAmmo.totals.diesel === base — the
      // value is NOT distinguishable in totals. It IS distinguishable in the buffApply log: a
      // wrong value lands a wrong stack magnitude. (base asserts [56.7] above; the counterfactual
      // must land a DIFFERENT magnitude there.)
      const halfValues = [
        ...new Set(
          dieselBuffs(halfAmmo.events, 'maxAmmoPct').map((b) => b.value)
        ),
      ];
      expect(halfValues).toEqual([28.35]);
      expect(halfValues).not.toEqual([...new Set(applied.map((b) => b.value))]);
    });
  });

  describe('L5 — S2 max-stack effect reaches ALL allies with Pierce ▲30% for 10 sec', () => {
    const applied = dieselBuffs(base.events, 'pierceDamagePct');

    it('fires (the 700-NA cycle is reached) at 30% for 10 sec', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([30]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('reaches all three allies (team-wide, not self-only)', () => {
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied) {
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      }
      for (const [frame, holders] of perFrame) {
        expect(
          holders.size,
          `frame ${frame} reached ${holders.size} allies, expected ${N_ALLIES}`
        ).toBe(N_ALLIES);
      }
    });

    it('DISCRIMINATING: removing the block deletes the team pierce buff entirely', () => {
      expect(dieselBuffs(noMaxStack.events, 'pierceDamagePct').length).toBe(0);
    });

    it('the Pierce half is inert without a pierce ally (30 -> 0 moves no total)', () => {
      // The fixture fields no pierce-tagged attacker, so Pierce Damage ▲ must NOT leak into the
      // non-pierce Damage-Up bucket: zeroing it leaves every total byte-identical. (The reload half
      // rides the same trigger and is the DPS-relevant piece here; it is the instantReload effect,
      // which has no event — it refills ammo directly.)
      expect(noPierceValue.totals).toEqual(base.totals);
    });
  });

  describe('L6 — burst nuke: 299.66% of final ATK, cast BEFORE the Full Burst window', () => {
    const nukes = dieselDamage(base.events, 'burst');

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(dieselBursts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([299.66]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      const took = nukes.filter((d) => d.fbMajorApplied);
      expect(
        took.map((d) => d.sec),
        'burst-cast damage must precede the FB window'
      ).toEqual([]);
    });
  });

  describe('L7 — burst self Max HP ▲100.05% is encoded and exactly inert', () => {
    // The engine converts targetMaxHpPct to a flat Max-HP grant at apply time (sim.ts: the buff
    // arrives as stat 'maxHpFlat', value = (100.05/100) × own Max HP), so the observable is a
    // SELF-caster maxHpFlat buffApply, not a 'targetMaxHpPct' event. The flat value is fixture-
    // dependent (scales with her final Max HP), so it is pinned as a single consistent positive
    // grant rather than a hardcoded number; the kit magnitude 100.05% is documented in the header.
    const applied = dieselBuffs(base.events, 'maxHpFlat');

    it('grants a self Max-HP pool once per burst cast', () => {
      expect(applied.length).toBe(dieselBursts(base.events).length);
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([DIESEL]);
      const values = [...new Set(applied.map((b) => b.value))];
      expect(values.length).toBe(1);
      expect(values[0]).toBeGreaterThan(0);
    });

    it("removing it changes NO unit's total by a single point (inert — no atkOfMaxHpPct feed)", () => {
      expect(base.totals).toEqual(noMaxHp.totals);
    });
  });
});
