// PER-UNIT KIT SPEC — `himeno` (Himeno, Supporter/SR/Wind, Burst II, cd 20s, ammo 6,
// chargeFrames 60, reloadFrames 159, chargeMultiplier 250). Kit-autonomy gauntlet 2026-08-05.
// BASE UNIT — first modeling (no prior override; baseline was bare weapon, simSupported:false).
// SR RARITY (original_rare SR — like belorta/claire) → the plain scope-lock ceiling
// (copies 10 ⇒ 3★ + core 7) is unreachable for an SR unit: unitLimits {stars:3, core:0}
// (belorta precedent).
//
// One assertion group per KIT LINE (S1, S2a, S2b, B1, B2 below), asserted against the SHIPPED
// override loaded from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the
// nearest wrong model each assertion must discriminate against) — never to supply the encoding
// under test.
//
// Kit (blablalink prose, data/characters.json → characters.himeno.skills):
//   S1 ■ the target, when hitting it with Full Charge: DEF ▼6.94% for 3 sec               [S1]
//   S2 ■ all allies with sniper rifles (20s cooldown, no activation clause):
//        ATK ▲10.98% for 10 sec                                                           [S2a]
//        Max Ammunition Capacity ▲2 round(s) for 10 sec                                   [S2b]
//   BU ■ the 1 ally unit with the highest FINAL ATK (datamine prefer_target_condition
//      ExcludeSelf), on her burst cast:
//        Charge Damage ▲23.76% for 10 sec                                                 [B1]
//        Critical Rate ▲16.35% for 10 sec                                                 [B2]
//
// Dispositions:
//   S1  UNMODELED (pinned by ABSENCE): the sim's enemy-buff channel admits only
//       damageTakenPct/distributedDamagePct and the boss's DEF is a flat constant no debuff
//       scales, so an enemy DEF▼ moves nothing (sim.ts drops enemy ATK▼/DEF▼ at dispatch —
//       'other enemy debuffs (ATK▼, DEF▼) don't affect our damage with DEF=0'; eunhwa shipped
//       her two same-family 'DEF ▼ x% for N sec' datamined lines the same way, earlier in this
//       batch). The whole sentence is recorded VERBATIM in unmodeled.skill1 — the full-charge
//       trigger is part of the skipped sentence (an enemy-targeted full-charge effect has no
//       channel either). Nearest wrong model: laundering the DEF▼ into damageTakenPct (a
//       different mechanic — the boss taking more damage) would fabricate a team lift the kit
//       never grants; the ABSENCE pins prove the shipped override is not that model.
//   S2a FAITHFUL — interval:20 trigger (the CD-driven skill2 convention, poli precedent: a
//       20s-cooldown skill with no visible activation clause fires every 20s of battle, first
//       at t=20s), target alliesOfWeapon SR with NO excludeSelf (the kit says 'all allies with
//       sniper rifles' and she is herself an SR — she is included), atkPct 10.98 for 10s: a
//       50% duty-cycle team buff, NOT a permanent aura.
//   S2b FAITHFUL — same block: maxAmmoFlat 2 for 10s — the theme-14 FLAT-round primitive
//       ('▲ N round(s)'); maxAmmo() = round(base×(1+pct/100)) + flat, so the nearest wrong
//       encoding (maxAmmoPct 2) computes round(6×1.02) = 6 and never extends a magazine.
//   B1  FAITHFUL — burstCast-keyed (HER cast, not fullBurstEnter) chargeDamagePct 23.76 for
//       10s to alliesTopAtk{count:1, excludeSelf, byFinalAtk}. The kit says 'highest FINAL
//       ATK' → byFinalAtk (live effectiveAtk ranking, A3 literal-word precedent); datamine
//       prefer_target_condition 'ExcludeSelf' → excludeSelf. In both fixtures the top candidate
//       is ada (base ATK 600 — the charge bucket is live on her: ada's RL is a charge weapon,
//       chargeMultiplier 250).
//   B2  FAITHFUL — same block: GENERIC critRatePct 16.35 for 10s (the kit says plain
//       'Critical Rate', no 'of normal attacks' scoping → lifts every bucket, the inverse of
//       the helm critRateNormalPct trap).
//
// Fixtures (both deterministic — no seed; event-log over totals), mirroring eunhwa's batch-mate
// pair (same weapon class, same B2 shape):
//   A (rotation): liter (B1, SMG) / delta (B2, SR, 40s) / himeno (B2, SR, 20s) / ada (B3, RL,
//       40s), forced-neutral boss (null), camera focus himeno (SR charge weapon ⇒ ×2.5 burst
//       gauge). Delta sits LEFT of himeno, so delta wins every B2 tie and leads the FB cycles;
//       himeno casts on the ALTERNATE chains — her cast frames are distinct from every Full
//       Burst start frame, the burstCast-vs-fullBurstEnter discriminator. SR allies = {delta,
//       himeno} — liter (SMG) and ada (RL) are OUT of the S2 scope, so the scope is
//       discriminated 2-of-4. Delta's kit is self-only (no ally buffs, no boss debuffs); ada's
//       enemy-targeted blocks are DoTs only; liter has no enemy-targeted blocks — so ANY
//       boss-held buffApply in this fixture would be a laundering of her S1 DEF▼ line.
//   B (solo window): liter / himeno / ada, same basis — she is the ONLY Burst II, so she casts
//       every FB chain and her 10s windows have clean gaps for functional observation (in/out
//       crit-rate delta, in/out charge multiplier, magazine extension). NOTE on the ammo pin:
//       liter's OWN kit grants maxAmmoPct 45.17 to all allies for 5s on each of her burst casts
//       (her S1 escalating step), so some magazines in EVERY variant refill to 9 rounds while
//       her window covers the reload — that contamination is identical across base/pct/removed
//       runs; the clean flat-round observable is a magazine whose FIRST shot leaves ammoAfter 7
//       (a 6+2 refill with no liter pct live), which only the flat encoding ever produces.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** Fixture A slot order: liter 0 / delta 1 / himeno 2 / ada 3. */
const DELTA_A = 1;
const HIMENO_A = 2;
const ADA_A = 3;
const TEAM_SIZE_A = 4;
/** Fixture B slot order: liter 0 / himeno 1 / ada 2. */
const HIMENO_B = 1;
const ADA_B = 2;
const HIMENO = 'himeno';

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

const RUN_OPTS = {
  bossElement: null,
  focusSlug: HIMENO,
  unitLimits: { [HIMENO]: { stars: 3, core: 0 } },
} as const;

function runA(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({
    slugs: ['liter', 'delta', HIMENO, 'ada'],
    ...RUN_OPTS,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}
function runB(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({
    slugs: ['liter', HIMENO, 'ada'],
    ...RUN_OPTS,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const casts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === HIMENO);
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');
const himenoShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === HIMENO);
/** Her S2 buff applications for one stat in fixture A (caster = her A slot). */
const s2AppliesA = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === HIMENO_A && b.stat === stat);
/** Her burst-skill buff applications for one stat (by fixture slot). */
const burstApplies = (evs: SimEvent[], stat: string, slot: number) =>
  buffs(evs).filter((b) => b.casterIdx === slot && b.stat === stat);

// ---- counterfactual patches -------------------------------------------------------------------
/** S1 counterfactual: the nearest wrong encoding — laundering the DEF▼ into a boss
 *  damageTakenPct debuff (a different mechanic the kit never grants). */
const himenoS1Laundered = withPatchedOverride(HIMENO, (ov) => {
  ov.skill1 = [
    {
      slot: 'skill1',
      trigger: { kind: 'shotFired' },
      target: { kind: 'enemy' },
      effects: [
        { kind: 'buff', stat: 'damageTakenPct', value: 6.94, durationSec: 3 },
      ],
    },
  ];
});
/** S2 counterfactual: the whole S2 as ONE permanent passive (no 20s duty cycle, no expiry —
 *  keeping durationSec would collapse it to a single t=0 window, the wrong direction). */
const himenoS2Passive = withPatchedOverride(HIMENO, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.map((b: any) => ({
    ...b,
    trigger: { kind: 'passive' },
    effects: b.effects.map((e: any) => {
      const { durationSec, ...rest } = e;
      return rest;
    }),
  }));
  if (ov.skill2.length !== before || before === 0) {
    throw new Error('himeno skill2 blocks missing — fixture is stale');
  }
});
/** S2 counterfactual: unscoped — buffs ALL allies, not the sniper-rifle carriers. */
const himenoS2AllAllies = withPatchedOverride(HIMENO, (ov) => {
  const block = ov.skill2.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'atkPct')
  );
  if (!block) {
    throw new Error('himeno S2 atkPct block missing — fixture is stale');
  }
  block.target = { kind: 'allies' };
});
/** S2b counterfactual: the percent-only approximation (maxAmmoPct 2 → round(6×1.02) = 6). */
const himenoS2AmmoPct = withPatchedOverride(HIMENO, (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'maxAmmoFlat');
  if (!e) {
    throw new Error('himeno S2 maxAmmoFlat effect missing — fixture is stale');
  }
  e.stat = 'maxAmmoPct';
});
/** S2 reference: both S2 lines removed (duty-cycle / functional baseline). */
const himenoNoS2 = withPatchedOverride(HIMENO, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = [];
  if (before === 0) {
    throw new Error('himeno skill2 blocks missing — fixture is stale');
  }
});
/** Burst counterfactual: the buffs keyed to fullBurstEnter instead of her cast. */
const himenoBurstOnFbEnter = withPatchedOverride(HIMENO, (ov) => {
  const block = ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'chargeDamagePct')
  );
  if (!block) {
    throw new Error('himeno burst block missing — fixture is stale');
  }
  block.trigger = { kind: 'fullBurstEnter' };
});
/** Burst counterfactual: unscoped — buffs ALL allies, not the single top-ATK carrier. */
const himenoBurstAllAllies = withPatchedOverride(HIMENO, (ov) => {
  const block = ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'chargeDamagePct')
  );
  if (!block) {
    throw new Error('himeno burst block missing — fixture is stale');
  }
  block.target = { kind: 'allies' };
});
/** Burst reference: the whole burst block removed (functional baseline). */
const himenoNoBurst = withPatchedOverride(HIMENO, (ov) => {
  const before = ov.burst.length;
  ov.burst = [];
  if (before === 0) {
    throw new Error('himeno burst blocks missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const baseA = runA();
const baseB = runB();
const launderedB = runB({ [HIMENO]: himenoS1Laundered });
const s2PassiveB = runB({ [HIMENO]: himenoS2Passive });
const s2AllAlliesA = runA({ [HIMENO]: himenoS2AllAllies });
const s2AmmoPctB = runB({ [HIMENO]: himenoS2AmmoPct });
const noS2B = runB({ [HIMENO]: himenoNoS2 });
const fbEnterA = runA({ [HIMENO]: himenoBurstOnFbEnter });
const burstAllAlliesA = runA({ [HIMENO]: himenoBurstAllAllies });
const noBurstB = runB({ [HIMENO]: himenoNoBurst });

// ---- derived observations ---------------------------------------------------------------------
const totalOf = (evs: SimEvent[], slug: string): number =>
  dmg(evs)
    .filter((d) => d.slug === slug)
    .reduce((acc, d) => acc + d.amount, 0);
const normalCritRates = (evs: SimEvent[], slug: string): number[] =>
  [
    ...new Set(
      dmg(evs)
        .filter((d) => d.slug === slug && d.bucket === 'normal')
        .map((d) => Number(d.critRate.toFixed(9)))
    ),
  ].sort((a, b) => a - b);
const adaChargeMults = (evs: SimEvent[]): number[] =>
  [
    ...new Set(
      dmg(evs)
        .filter((d) => d.slug === 'ada' && d.bucket === 'normal')
        .map((d) => d.mult.charge)
    ),
  ].sort((a, b) => a - b);
/** Group a unit's shots by magazine ordinal. */
function byMag(evs: SimEvent[], slug: string): Map<number, Shot[]> {
  const m = new Map<number, Shot[]>();
  for (const s of
    evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === slug)) {
    (m.get(s.magIndex) ?? m.set(s.magIndex, []).get(s.magIndex)!).push(s);
  }
  return m;
}
const magSizes = (evs: SimEvent[], slug: string): number[] =>
  [...byMag(evs, slug).values()].map((ss) => ss.length);
/** ammoAfter of each magazine's FIRST shot — the refill size minus one. */
const firstShotAmmoAfter = (evs: SimEvent[], slug: string): number[] =>
  [...byMag(evs, slug).values()].map((ss) => ss[0].ammoAfter);

describe('himeno — kit spec', () => {
  describe('S1 — DEF ▼6.94% for 3 sec on full-charge hit is UNMODELED (no enemy-DEF channel)', () => {
    it('is recorded VERBATIM in the override unmodeled block', () => {
      const ov = loadOverride(HIMENO) as any;
      expect(ov.unmodeled.skill1.join('\n')).toContain(
        'DEF ▼ 6.94% for 3 sec.'
      );
    });

    it('enacts NOTHING: no boss debuff anywhere in either fixture', () => {
      // Boss debuffs emit with targetIdx null. Fixture mates cannot produce one: liter has no
      // enemy-targeted blocks, delta is self-only, ada's enemy blocks are DoTs (damage events,
      // not buffs) — so ANY boss-held buffApply would be a laundering of her DEF▼ line.
      for (const evs of [baseA, baseB]) {
        expect(
          buffs(evs).filter((b) => b.targetIdx === null),
          'no boss-targeted debuff may exist (DEF▼ is dropped, not laundered)'
        ).toEqual([]);
      }
    });

    it('DISCRIMINATING: a damageTakenPct laundering would emit boss debuffs and move totals', () => {
      const laundered = buffs(launderedB).filter(
        (b) => b.targetIdx === null && b.stat === 'damageTakenPct'
      );
      expect(
        laundered.length,
        'the laundered model emits boss debuffs — the shipped model must not'
      ).toBeGreaterThan(0);
      expect([...new Set(laundered.map((b) => b.value))]).toEqual([6.94]);
      expect(totalOf(launderedB, 'ada')).toBeGreaterThan(totalOf(baseB, 'ada'));
    });
  });

  describe('S2a — 20s-interval ATK ▲10.98% for 10s to all sniper-rifle allies', () => {
    const applied = s2AppliesA(baseA, 'atkPct');

    it('fires on the 20s cooldown: first at t=20s, period exactly 1200 frames', () => {
      const frames = [...new Set(applied.map((b) => b.frame))].sort(
        (a, b) => a - b
      );
      expect(frames.length).toBeGreaterThanOrEqual(8);
      expect(frames[0], 'the interval first-fires at t=20s, not t=0').toBe(
        20 * FPS
      );
      for (let i = 1; i < frames.length; i++) {
        expect(frames[i] - frames[i - 1]).toBe(20 * FPS);
      }
    });

    it('reaches EXACTLY the two SR allies (delta + herself), never liter (SMG) or ada (RL)', () => {
      expect(applied.length).toBeGreaterThan(0);
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied) {
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      }
      for (const [frame, holders] of perFrame) {
        expect(
          holders,
          `frame ${frame} reached ${holders.size} allies, expected exactly the 2 SR carriers`
        ).toEqual(new Set([DELTA_A, HIMENO_A]));
      }
      expect([...new Set(applied.map((b) => b.value))]).toEqual([10.98]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('FUNCTIONAL: the duty-cycle buff lifts the SR carriers’ totals vs S2 removed', () => {
      expect(totalOf(baseB, HIMENO)).toBeGreaterThan(
        totalOf(noS2B, HIMENO)
      );
    });

    it('DISCRIMINATING: a permanent passive applies once at t=0 and over-credits', () => {
      // Fixture B: she is the only SR wielder, so the passive pool is {herself} — one apply.
      const passive = buffs(s2PassiveB).filter(
        (b) => b.casterIdx === HIMENO_B && b.stat === 'atkPct'
      );
      expect(passive.length).toBe(1);
      expect(
        passive[0].frame,
        'the passive model is live from frame 0 — the shipped model never applies before t=20s'
      ).toBe(0);
      expect(
        totalOf(s2PassiveB, HIMENO),
        'always-on ATK over-credits the 50% duty cycle'
      ).toBeGreaterThan(totalOf(baseB, HIMENO));
    });

    it('DISCRIMINATING: unscoped all-allies reaches 4 targets including the non-SR mates', () => {
      const unscoped = s2AppliesA(s2AllAlliesA, 'atkPct');
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of unscoped) {
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      }
      const holderSets = [...perFrame.values()];
      expect(holderSets.length).toBeGreaterThan(0);
      for (const holders of holderSets) {
        expect(
          holders.size,
          'unscoped model buffs the whole team, shipped buffs 2-of-4'
        ).toBe(TEAM_SIZE_A);
      }
    });
  });

  describe('S2b — Max Ammunition Capacity ▲2 rounds for 10s (FLAT, not percent)', () => {
    const applied = s2AppliesA(baseA, 'maxAmmoFlat');

    it('is the flat-round primitive at the same firings as the ATK line, for 10s', () => {
      const atkFrames = new Set(s2AppliesA(baseA, 'atkPct').map((b) => b.frame));
      expect(
        new Set(applied.map((b) => b.frame)),
        'ammo and ATK share one activation (one block, two effects)'
      ).toEqual(atkFrames);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([2]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('FUNCTIONAL: an in-window refill loads exactly 6 + 2 rounds (first shot leaves ammoAfter 7)', () => {
      // liter's own maxAmmoPct window also extends some magazines in EVERY variant (see header),
      // so the clean flat-round observable is a refill to exactly 8: a magazine whose FIRST shot
      // leaves ammoAfter 7 — impossible without the +2 flat (base refill leaves 5, liter-only 8).
      const firsts = firstShotAmmoAfter(baseB, HIMENO);
      expect(
        firsts.filter((n) => n === 7).length,
        `first-shot ammoAfter ${JSON.stringify(firsts)} — expected at least one 6+2 refill`
      ).toBeGreaterThanOrEqual(1);
      const sizes = magSizes(baseB, HIMENO);
      expect(
        sizes.filter((n) => n === 8).length,
        'an 8-round magazine (7…0) must follow the 6+2 refill'
      ).toBeGreaterThanOrEqual(1);
    });

    it('DISCRIMINATING: maxAmmoPct 2 computes round(6×1.02) = 6 — no 6+2 refill ever happens', () => {
      expect(
        firstShotAmmoAfter(s2AmmoPctB, HIMENO),
        'the percent-only model never produces a first-shot ammoAfter of 7'
      ).not.toContain(7);
      expect(
        magSizes(s2AmmoPctB, HIMENO),
        'the percent-only model never extends a magazine to 8 rounds'
      ).not.toContain(8);
      expect(
        firstShotAmmoAfter(noS2B, HIMENO),
        'with S2 removed, no 6+2 refill exists either'
      ).not.toContain(7);
    });
  });

  describe('B1 — burst grants Charge Damage ▲23.76% for 10s to ONE ally, on HER cast', () => {
    const applied = burstApplies(baseA, 'chargeDamagePct', HIMENO_A);
    const herCasts = casts(baseA);
    const fbFrames = new Set(fbStarts(baseA).map((e) => e.frame));

    it('casts her burst at all in the rotation fixture', () => {
      expect(herCasts.length).toBeGreaterThan(2);
    });

    it('applies once per HER cast to exactly ONE ally — never herself', () => {
      expect(applied.length).toBe(herCasts.length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([23.76]);
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied) {
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      }
      expect(perFrame.size).toBe(herCasts.length);
      for (const [frame, holders] of perFrame) {
        expect(
          holders.size,
          `frame ${frame} reached ${holders.size} allies, expected exactly 1`
        ).toBe(1);
        expect(
          holders.has(HIMENO_A),
          `frame ${frame}: ExcludeSelf — the skill user is never her own target`
        ).toBe(false);
      }
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('applies on HER cast frames (burstCast-keyed), never on Full Burst start frames', () => {
      for (const b of applied) {
        expect(
          herCasts.some((c) => c.frame === b.frame),
          `charge buff at frame ${b.frame} is not on one of her cast frames`
        ).toBe(true);
        expect(
          fbFrames.has(b.frame),
          `charge buff at frame ${b.frame} must not sit on a Full Burst start frame`
        ).toBe(false);
      }
    });

    it('FUNCTIONAL: the buff is live on the charge bucket — ada’s charge mult lifts by exactly +0.2376 (23.76 ppt) in-window', () => {
      // d.mult.charge is the normalized multiplier (250% → 2.5). ada also lands a 17.5
      // composite-charge hit as part of her RL weapon spec; it lifts to 17.7376 in-window —
      // every charge-bucket instance takes the same +0.2376 additive shift.
      const withBuff = adaChargeMults(baseB);
      const without = adaChargeMults(noBurstB);
      expect(
        withBuff,
        'base run must show both the plain 2.5 and the lifted 2.7376 charge mults'
      ).toContain(2.7376);
      expect(withBuff).toContain(2.5);
      expect(without, 'the plain 2.5 must exist with the burst removed').toContain(
        2.5
      );
      expect(
        without,
        'with the burst removed, the 2.7376 lifted mult never appears'
      ).not.toContain(2.7376);
      expect(2.7376 / 2.5).toBeCloseTo(1.09504, 9);
    });

    it('DISCRIMINATING: a fullBurstEnter keying misses her cast frames entirely in this fixture', () => {
      const onFb = burstApplies(fbEnterA, 'chargeDamagePct', HIMENO_A);
      expect(onFb.length).toBeGreaterThan(0);
      const herCastFrames = new Set(casts(fbEnterA).map((c) => c.frame));
      expect(
        onFb.filter((b) => herCastFrames.has(b.frame)).length,
        'fullBurstEnter applications never land on her cast frames'
      ).toBe(0);
    });

    it('DISCRIMINATING: an all-allies encoding reaches 4 targets per cast', () => {
      const unscoped = burstApplies(burstAllAlliesA, 'chargeDamagePct', HIMENO_A);
      expect(unscoped.length).toBe(TEAM_SIZE_A * casts(burstAllAlliesA).length);
    });
  });

  describe('B2 — burst grants Critical Rate ▲16.35% for 10s to the SAME single ally', () => {
    const applied = burstApplies(baseA, 'critRatePct', HIMENO_A);
    const herCasts = casts(baseA);

    it('applies once per HER cast, same single target as the charge line', () => {
      expect(applied.length).toBe(herCasts.length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([16.35]);
      const chargeTargets = new Map<number, number | null>();
      for (const b of burstApplies(baseA, 'chargeDamagePct', HIMENO_A)) {
        chargeTargets.set(b.frame, b.targetIdx);
      }
      for (const b of applied) {
        expect(
          chargeTargets.get(b.frame),
          `frame ${b.frame}: the crit buff must ride the same single target as the charge buff`
        ).toBe(b.targetIdx);
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('FUNCTIONAL: the buffed ally’s crit rate moves by exactly 16.35 ppt in-window', () => {
      const rates = normalCritRates(baseB, 'ada');
      const stripped = normalCritRates(noBurstB, 'ada');
      expect(
        stripped.length,
        'ada must have a single baseline crit rate with the burst removed'
      ).toBe(1);
      expect(
        rates,
        'base run: ada must have both out-of-window and in-window crit states'
      ).toEqual([stripped[0], Number((stripped[0] + 0.1635).toFixed(9))]);
    });
  });

  describe('target-selection encoding — literal kit/datamine semantics', () => {
    it('is alliesTopAtk{1, excludeSelf, byFinalAtk}: "1 ally with the highest FINAL ATK"', () => {
      // byFinalAtk vs static ranking and excludeSelf are not behaviorally separable in these
      // fixtures (ada is the top candidate on BOTH bases, and never below the skill user), so
      // the datamine-literal encoding is pinned directly on the shipped JSON.
      const ov = loadOverride(HIMENO) as any;
      const block = ov.burst.find((b: any) =>
        b.effects.some((e: any) => e.stat === 'chargeDamagePct')
      );
      expect(block.target).toEqual({
        kind: 'alliesTopAtk',
        count: 1,
        excludeSelf: true,
        byFinalAtk: true,
      });
    });
  });
});
