// PER-UNIT KIT SPEC — `eve` (EVE, Attacker/AR/Iron, Burst III, cd 40s, ammo 60, no charge).
// Kit-autonomy gauntlet 2026-07-25 (Tier 2: burstCast + bossElement status-gate + crit-count
// proxy + sequentialMultPct own-bucket multiplier).
//
// One assertion group per KIT LINE (E1..E8 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.eve.skills):
//   S1 ■ start of battle → self: Critical Rate ▲60% continuously                              [E1]
//      ■ after 44 critical normal hits → random enemy: Unstable Energy 240% × 3 sequential     [E2]
//        (= 720%; the 44-CRIT trigger is proxied as hitCount 59 = 44 / 0.75 crit — see ⚑)
//      ■ when Unstable Energy hits an Electric target → that target: Damage Taken ▲10% 10s     [E3]
//   S2 ■ start of battle → self: ATK ▲50% continuously + Max Ammunition Capacity ▲25%          [E4]
//      ■ every 10 normal hits on an Electric target → self: Reloads 3 round(s)                 [E5]
//   BU ■ random enemy: 457.14% × 6 sequential (= 2742.84%) — modeled UNFLAVORED (see E6)       [E6]
//      ■ self 10s: Exospine Mk2 — Unstable Energy sequential multiplier scaled by 100% (×2)    [E7]
//      ■ self 10s: Exospine Mk2 — Eagle Eye ATK multiplier scaled by 100% (ATK ▲50% again)     [E8]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   E1  the +60 is a plain (unscoped) self critRatePct — her kit places NO scoping on it, so the
//       faithful model IS the generic buff. Proven live: shipped normal-attack critRate is 0.75
//       (15 base + 60), the buff-removed counterfactual is 0.15. Self-scoped: only eve's crit
//       moves, her allies' do not.
//   E2  magnitude 720 (240 × 3), NOT 240 — the counterfactual that forgets the ×3 sequential is
//       the nearest wrong model and the assertion fails under it. Cadence is the crit-count proxy
//       hitCount 59 (44 crits / 0.75): procs land ~once per 59 normal hits, asserted as a band the
//       literal-44 reading (≈34% more procs) falls outside.
//   E3  the debuff is GATED on an Electric boss. Vs Electric the boss carries damageTakenPct 10
//       (targetIdx null) and eve's mult.taken reads 1.1; vs an Iron boss BOTH vanish (gate inert)
//       and mult.taken is 1.0. The Iron==neutral element reading is asserted alongside.
//   E4  ATK ▲50% is encoded as casterAtkPct — "▲50% of the skill user's ATK" — which the engine
//       resolves to a FLAT ATK grant (= 50% of eve's scope-lock ATK, a large number, NOT a small
//       flat +50 and NOT a generic percentage atkPct). Max Ammo ▲25 is a permanent self passive.
//   E5  the 3-round refund is GATED on Electric (bossElementGate). Vs Electric the refund is live
//       (fewer magazine reloads than the refund-removed counterfactual); vs Iron it is inert
//       (reload count byte-identical to the removed counterfactual).
//   E6  the burst nuke is 2742.84 (457.14 × 6), in the burst bucket, cast BEFORE the FB window
//       (no +50% major), and — the subtle faithfulness point — carries NO sequential flavor, so
//       Mk2 cannot double it (the kit doubles Unstable Energy, not the nuke). Pinned by seqMult=1
//       on the nuke while, in the SAME fight, the Unstable Energy proc reaches seqMult=2 under
//       Mk2 — proving the engine routes flavor→seqMult here and the nuke genuinely opts out.
//   E7  Mk2's Unstable-Energy doubling is a TRUE ×2 via sequentialMultPct in its OWN multiplicative
//       bucket: the proc reads seqMult=2 inside the 10s window and 1 outside, exactly 2 (no
//       dilution). Counterfactual: the ADDITIVE sequentialDamagePct (snow-white-heavy-arms'
//       mechanic) leaves seqMult=1 and folds the bonus into dmgUp — the assertion fails under it.
//   E8  Mk2 also re-grants the Eagle Eye ATK as a TIMED (10s) casterAtkPct whose resolved flat
//       value EQUALS the permanent S2 grant — "scaled by 100%" re-grants the same 50%-of-ATK, so
//       eve runs at ×2 Eagle Eye ATK during Mk2. Distinct from the permanent passive by expiry.
//
// INERT / out-of-domain (no assertion, documented): the "Previous effects trigger repeatedly"
// flavor line is inherent (S1 keeps firing); the Max-Ammo DOUBLING under Mk2 is not modeled (Mk2
// scales the Eagle Eye *damage multiplier* = the ATK buff; a doubled mag is a second-order reload
// cadence effect, inert for DPS); the 10s REFRESH cadence of Damage Taken is approximated as
// permanent-while-Electric (over-credits only the opening seconds — see override caveat).
//
// Fixture: liter (B1) / crown (B2) / eve (B3), focus eve, deterministic (no seed). eve needs a
// real rotation to cast her burst at all (a lone B3 makes zero Full Bursts). Two boss elements:
// Electric (her intended target — every line live) and Iron (neutral for eve — the gated lines
// inert, element major 1.0), which is what makes the gate discriminations possible.
import { describe, expect, it } from 'vitest';
import type { Element, SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  withPatchedOverride,
  type CompOptions,
} from '../lib/harness.js';

const FPS = 60;
const MK2_FRAMES = 10 * FPS;
/** slugs order: liter 0 / crown 1 / eve 2. */
const EVE = 2;
/** eve's scope-lock ATK is 119,667; casterAtkPct 50 resolves to a flat grant of half of that. */
const EVE_ATK_GRANT_50PCT = 59833.5;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Reload = Extract<SimEvent, { kind: 'reload' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

const eveComp = (bossElement: Element | null): CompOptions => ({
  slugs: ['liter', 'crown', 'eve'],
  bossElement,
  focusSlug: 'eve',
});

function run(
  overrides: Record<string, any> = {},
  bossElement: Element | null = 'Electric'
) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...eveComp(bossElement),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches ------------------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
const hasKind = (b: any, kind: string) =>
  b.effects.some((e: any) => e.kind === kind);

/** E1 counterfactual: her S1 crit-rate line removed entirely. */
const eveNoCrit = withPatchedOverride('eve', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'critRatePct'));
  if (ov.skill1.length === before) {
    throw new Error('eve S1 critRatePct block missing — fixture is stale');
  }
});
/** E2 counterfactual: Unstable Energy at 240% (the ×3 sequential forgotten). */
const eveUnstable240 = withPatchedOverride('eve', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e || e.atkPct !== 720) {
    throw new Error('eve S1 720% flatDamage missing — fixture is stale');
  }
  e.atkPct = 240;
});
/** E5 counterfactual: her S2 reload-refund line removed. */
const eveNoRefund = withPatchedOverride('eve', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasKind(b, 'instantReload'));
  if (ov.skill2.length === before) {
    throw new Error('eve S2 instantReload block missing — fixture is stale');
  }
});
/** E7 counterfactual: Mk2 doubling as the ADDITIVE sequentialDamagePct (the diluting bucket). */
const eveSeqDamage = withPatchedOverride('eve', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'sequentialMultPct');
  if (!e) {
    throw new Error('eve burst sequentialMultPct missing — fixture is stale');
  }
  e.stat = 'sequentialDamagePct';
});

// ---- runs (hoisted: each is a full 180s sim) -------------------------------------------------
const base = run(); // Electric, shipped
const noCrit = run({ eve: eveNoCrit }); // Electric
const unstable240 = run({ eve: eveUnstable240 }); // Electric
const noRefund = run({ eve: eveNoRefund }); // Electric
const seqDamage = run({ eve: eveSeqDamage }); // Electric
const iron = run({}, 'Iron'); // Iron, shipped (gates inert, elem neutral)
const ironNoRefund = run({ eve: eveNoRefund }, 'Iron');

// ---- readers ---------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const eveDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'eve' && d.srcSlot === srcSlot);
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const eveBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === EVE && b.stat === stat);
const eveBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'eve');
const eveReloads = (evs: SimEvent[]) =>
  evs.filter((e): e is Reload => e.kind === 'reload' && e.slug === 'eve');
const eveShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'eve');

/** Dedup precision-sensitive floats (critRate / mult decomposition / kit magnitudes). */
const distinctNum = (xs: number[], dp = 6) =>
  [...new Set(xs.map((x) => Number(x.toFixed(dp))))].sort((a, b) => a - b);
/** Dedup exact values (ints, strings, null) — no rounding. */
const distinct = <T>(xs: T[]): T[] => [...new Set(xs)];

/** Unstable Energy procs: her skill1 flat hits (720% in shipped). */
const unstableProcs = (evs: SimEvent[]) => eveDamage(evs, 'skill1');

/** [start, end] frames of each Mk2 window = each eve burst cast + 10s. */
const mk2Windows = (evs: SimEvent[]): Array<[number, number]> =>
  eveBursts(evs).map((c) => [c.frame, c.frame + MK2_FRAMES]);

const inMk2 = (windows: Array<[number, number]>, frame: number) =>
  windows.some(([a, b]) => frame >= a && frame <= b);

describe('eve — kit spec', () => {
  describe('E1 — S1 Critical Rate ▲60% is a live, self-scoped passive (15 → 75%)', () => {
    it("lifts eve's normal-attack crit rate to exactly 0.75", () => {
      expect(
        distinctNum(eveDamage(base.events, 'normal').map((d) => d.critRate))
      ).toEqual([0.75]);
    });
    it('DISCRIMINATING: removing the line drops her to the 0.15 base', () => {
      expect(
        distinctNum(eveDamage(noCrit.events, 'normal').map((d) => d.critRate))
      ).toEqual([0.15]);
    });
    it('is self-scoped: a permanent critRatePct=60 buff held by eve alone', () => {
      const applied = eveBuffs(base.events, 'critRatePct');
      expect(distinctNum(applied.map((b) => b.value))).toEqual([60]);
      expect(distinct(applied.map((b) => b.targetIdx))).toEqual([EVE]);
      expect(distinct(applied.map((b) => b.expiresFrame))).toEqual([null]);
    });
  });

  describe('E2 — S1 Unstable Energy: 720% (240×3) sequential, on the crit-count proxy cadence', () => {
    it('procs at the kit magnitude 720 in the skill bucket, srcSlot skill1', () => {
      const procs = unstableProcs(base.events);
      expect(procs.length).toBeGreaterThan(0);
      expect(
        distinctNum(
          procs.map((d) => d.atkPct),
          4
        )
      ).toEqual([720]);
      expect(distinct(procs.map((d) => d.bucket))).toEqual(['skill']);
    });
    it('DISCRIMINATING magnitude: the ×3-forgotten model lands at 240, not 720', () => {
      expect(
        distinctNum(
          unstableProcs(unstable240.events).map((d) => d.atkPct),
          4
        )
      ).toEqual([240]);
    });
    it('fires on the hitCount-59 proxy cadence (44 crits / 0.75), not the literal 44', () => {
      const shots = eveShots(base.events).length;
      const procs = unstableProcs(base.events).length;
      const expect59 = shots / 59;
      const expect44 = shots / 44;
      expect(
        procs,
        `${procs} procs / ${shots} shots — expected ≈${expect59.toFixed(1)} (÷59), not ≈${expect44.toFixed(1)} (÷44)`
      ).toBeGreaterThanOrEqual(Math.floor(expect59 * 0.8));
      expect(
        procs,
        'proc count is implausibly high for the ÷59 cadence'
      ).toBeLessThanOrEqual(Math.ceil(expect59 * 1.2));
      expect(
        procs,
        'proc count must sit well below the literal-÷44 reading'
      ).toBeLessThan(expect44 * 0.85);
    });
  });

  describe('E3 — S1 Damage Taken ▲10% is gated on an Electric boss', () => {
    it('vs Electric: the boss carries damageTakenPct 10 (enemy debuff, targetIdx null)', () => {
      const debuff = buffs(base.events).filter(
        (b) => b.stat === 'damageTakenPct' && b.targetIdx === null
      );
      expect(
        debuff.length,
        'no boss damageTakenPct debuff vs Electric'
      ).toBeGreaterThan(0);
      expect(distinctNum(debuff.map((b) => b.value))).toEqual([10]);
    });
    it("vs Electric: eve's damage actually takes the +10% (mult.taken 1.1 once live)", () => {
      const taken = distinctNum(
        eveDamage(base.events, 'normal').map((d) => d.mult.taken),
        4
      );
      expect(
        taken.some((t) => Math.abs(t - 1.1) < 1e-3),
        `mult.taken values ${taken} never reach 1.1`
      ).toBe(true);
    });
    it('DISCRIMINATING gate: vs an Iron boss the debuff is absent and mult.taken stays 1.0', () => {
      const debuff = buffs(iron.events).filter(
        (b) => b.stat === 'damageTakenPct' && b.targetIdx === null
      );
      expect(debuff).toEqual([]);
      expect(
        distinctNum(
          eveDamage(iron.events, 'normal').map((d) => d.mult.taken),
          4
        )
      ).toEqual([1]);
    });
    it('Iron is element-neutral for eve (Iron major 1.0, the "Iron == neutral" caveat)', () => {
      expect(
        distinctNum(
          eveDamage(iron.events, 'normal').map((d) => d.mult.elem),
          4
        )
      ).toEqual([1]);
      expect(
        distinctNum(
          eveDamage(base.events, 'normal').map((d) => d.mult.elem),
          4
        )
      ).toEqual([1.1]);
    });
  });

  describe('E4 — S2 Eagle Eye: ATK ▲50% (casterAtkPct flat grant) + Max Ammunition ▲25%, permanent self', () => {
    it("grants casterAtkPct as a flat ATK grant = 50% of eve's ATK, self-held, no expiry", () => {
      const applied = eveBuffs(base.events, 'casterAtkPct').filter(
        (b) => b.expiresFrame === null
      );
      expect(
        applied.length,
        'no permanent casterAtkPct passive'
      ).toBeGreaterThan(0);
      // casterAtkPct is "▲50% of the skill user's ATK": the engine resolves it to a FLAT grant
      // (59833.5 = 0.5 × 119667), NOT a generic percentage atkPct and NOT a small flat +50.
      expect(
        distinctNum(
          applied.map((b) => b.value),
          1
        )
      ).toEqual([EVE_ATK_GRANT_50PCT]);
      expect(distinct(applied.map((b) => b.targetIdx))).toEqual([EVE]);
    });
    it('grants maxAmmoPct 25, self-held, no expiry', () => {
      const applied = eveBuffs(base.events, 'maxAmmoPct').filter(
        (b) => b.expiresFrame === null
      );
      expect(distinctNum(applied.map((b) => b.value))).toEqual([25]);
      expect(distinct(applied.map((b) => b.targetIdx))).toEqual([EVE]);
    });
  });

  describe('E5 — S2 reload refund (3 rounds / 10 hits) is gated on an Electric boss', () => {
    it('vs Electric the refund is live: fewer magazine reloads than with it removed', () => {
      const withRefund = eveReloads(base.events).length;
      const without = eveReloads(noRefund.events).length;
      expect(
        without,
        'removing the refund did not increase reloads — refund is inert vs Electric'
      ).toBeGreaterThan(withRefund);
    });
    it('DISCRIMINATING gate: vs Iron the refund is inert (reload count identical to removed)', () => {
      expect(eveReloads(iron.events).length).toBe(
        eveReloads(ironNoRefund.events).length
      );
    });
  });

  describe('E6 — burst nuke: 2742.84% (457.14×6), unflavored, cast before the FB window', () => {
    const nukes = (evs: SimEvent[]) => eveDamage(evs, 'burst');
    it('fires once per cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes(base.events).length).toBe(eveBursts(base.events).length);
      expect(nukes(base.events).length).toBeGreaterThan(0);
      expect(
        distinctNum(
          nukes(base.events).map((d) => d.atkPct),
          4
        )
      ).toEqual([2742.84]);
      expect(distinct(nukes(base.events).map((d) => d.bucket))).toEqual([
        'burst',
      ]);
    });
    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(
        nukes(base.events)
          .filter((d) => d.fbMajorApplied)
          .map((d) => d.sec)
      ).toEqual([]);
    });
    it('carries NO sequential flavor: seqMult 1 on every nuke, while the same fight routes the proc to seqMult 2 under Mk2', () => {
      expect(
        distinctNum(
          nukes(base.events).map((d) => d.mult.seqMult),
          4
        )
      ).toEqual([1]);
      const windows = mk2Windows(base.events);
      const procsInMk2 = unstableProcs(base.events).filter((d) =>
        inMk2(windows, d.frame)
      );
      expect(
        procsInMk2.length,
        'no Unstable Energy proc landed inside an Mk2 window to contrast against'
      ).toBeGreaterThan(0);
      expect(
        distinctNum(
          procsInMk2.map((d) => d.mult.seqMult),
          4
        )
      ).toEqual([2]);
    });
  });

  describe('E7 — Mk2 doubles Unstable Energy via sequentialMultPct: a TRUE ×2 in its own bucket', () => {
    it('applies sequentialMultPct 100 for exactly 10s on every burst cast, self-held', () => {
      const applied = eveBuffs(base.events, 'sequentialMultPct');
      expect(applied.length).toBe(eveBursts(base.events).length);
      expect(distinctNum(applied.map((b) => b.value))).toEqual([100]);
      expect(distinct(applied.map((b) => b.targetIdx))).toEqual([EVE]);
      expect(distinct(applied.map((b) => b.expiresFrame! - b.frame))).toEqual([
        MK2_FRAMES,
      ]);
    });
    it('procs read seqMult 2 inside the Mk2 window and 1 outside (exactly ×2, undiluted)', () => {
      const windows = mk2Windows(base.events);
      const procs = unstableProcs(base.events);
      const inside = procs.filter((d) => inMk2(windows, d.frame));
      const outside = procs.filter((d) => !inMk2(windows, d.frame));
      expect(inside.length).toBeGreaterThan(0);
      expect(outside.length).toBeGreaterThan(0);
      expect(
        distinctNum(
          inside.map((d) => d.mult.seqMult),
          4
        )
      ).toEqual([2]);
      expect(
        distinctNum(
          outside.map((d) => d.mult.seqMult),
          4
        )
      ).toEqual([1]);
    });
    it('DISCRIMINATING bucket: the additive sequentialDamagePct leaves seqMult 1 (bonus folds into dmgUp)', () => {
      const windows = mk2Windows(seqDamage.events);
      const inside = unstableProcs(seqDamage.events).filter((d) =>
        inMk2(windows, d.frame)
      );
      expect(
        inside.length,
        'no proc inside an Mk2 window in the counterfactual run'
      ).toBeGreaterThan(0);
      expect(
        distinctNum(
          inside.map((d) => d.mult.seqMult),
          4
        )
      ).toEqual([1]);
    });
  });

  describe('E8 — Mk2 re-grants the Eagle Eye ATK as a TIMED (10s) casterAtkPct, equal to the passive', () => {
    it('emits a timed casterAtkPct whose flat value EQUALS the permanent grant (×2 Eagle Eye ATK)', () => {
      const passive = eveBuffs(base.events, 'casterAtkPct').filter(
        (b) => b.expiresFrame === null
      );
      const timed = eveBuffs(base.events, 'casterAtkPct').filter(
        (b) => b.expiresFrame !== null
      );
      expect(timed.length).toBe(eveBursts(base.events).length);
      const passiveVal = distinctNum(
        passive.map((b) => b.value),
        1
      );
      expect(passiveVal).toEqual([EVE_ATK_GRANT_50PCT]);
      // "scaled by 100%" re-grants the SAME 50%-of-ATK, so the timed grant equals the passive.
      expect(
        distinctNum(
          timed.map((b) => b.value),
          1
        )
      ).toEqual(passiveVal);
      expect(distinct(timed.map((b) => b.expiresFrame! - b.frame))).toEqual([
        MK2_FRAMES,
      ]);
      expect(distinct(timed.map((b) => b.targetIdx))).toEqual([EVE]);
    });
  });
});
