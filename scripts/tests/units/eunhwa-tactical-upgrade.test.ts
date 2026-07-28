// PER-UNIT KIT SPEC — `eunhwa-tactical-upgrade` (Eunhwa: Tactical Upgrade, Attacker/SR/Fire,
// Burst II, cd 20s, ammo 6, chargeFrames 60, normalAttackMultiplier 69.04, chargeMultiplier 250).
// Kit-autonomy gauntlet 2026-07-27; test-first (TDD transition step 3). FROM-SCRATCH build: no
// override existed before this gauntlet, so the RED phase is the whole file failing at load (no
// override on disk) and GREEN lands with the S3 override. Variant of base `eunhwa` — NEVER refer
// to her by the bare base name (P0 disambiguation; slug eunhwa-tactical-upgrade, aka eunwhatu).
//
// One assertion group per KIT LINE (ETU1..ETU8 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['eunhwa-tactical-upgrade'].skills):
//   S1 ■ using Burst Skill / Full Charge during Full Burst → self: Camouflage 5s              [—]
//        (prevents single-target targeting; removed on a direct hit)                          [—]
//      ■ only while in Camouflage status / self:
//        Normal attacks deal true damage continuously                                         [—]  (FLAVOR change)
//        True Damage ▲42.24% continuously                                                     [ETU1]
//   S2 ■ only if self survives (no death in v1 → unconditional). AS Formation:
//        E1 all allies from the same squad: Critical Rate ▲8.16% continuously                 [ETU2]
//        E2 all allies: Charge Damage ▲41.81% continuously                                    [ETU3]
//        E3 self: ATK ▲42.24% continuously                                                    [ETU4]
//        Bonus when applying LT Formation to self (GATED on emma-tactical-upgrade present —
//        LT Formation is applied by emma-tu; presence ≡ formation applied, teamHas.slugs auto
//        gate per the emma-tu override note; emma-tu IS simSupported so this is board-live):
//        E1 all allies: Projectile Explosion Damage ▲5.11% continuously                       [ETU7]
//        E2 all allies: True Damage ▲30.97% continuously                                      [ETU7]
//   BU ■ self: Changes the weapon in use — Charge time 0.3s, Damage 105.6% of final ATK as
//        true damage, Full Charge damage 300% of damage, Max Ammunition 1 round, fires an
//        Exploding Bullet (AoE). The 1-round magazine CYCLES over the swap window → MULTIPLE
//        true-damage cannon shots per burst (~6 at 10s); the kit states neither a duration nor
//        'deactivates when rounds fired' (⚑ kit-silent duration).                            [ETU5]
//      ■ target(s) hit (ON-HIT, per cannon shot): Explosive Round: Damage Taken ▲27.87% 10s   [ETU6]
//
// UNMODELED lines (documented, no assertion — nothing observable or no primitive):
//   [—] Camouflage (both triggers): v1 has a single immortal boss and no targeting model, so
//       single-target-target prevention moves no damage. Verbatim in the override's unmodeled.
//   [—] S1-L3 'Normal attacks deal true damage continuously' (the FLAVOR change of her sustained
//       SR normals): the engine's only true-normal mechanism is weaponSwap.trueNormals, which is
//       windowed and cannot coexist with her burst cannon swap (single swap slot), and there is no
//       camouflage SELF-status to gate it (no self-status channel). The True Damage ▲42.24% buff
//       IS encoded (ETU1) and pays off on the true-flavored burst cannon shots. Because her base
//       SR normals stay NON-true, the unconditional buff is inert on them and effectively windowed
//       to the cannon — no always-on over-credit; the residual is an UNDER-count (⚑ in the caveats).
//   [—] Burst 'Fires an Exploding Bullet dealing area-of-effect damage': splash radius inert vs
//       the single partless boss; the cannon HITS are modeled (ETU5). Verbatim in unmodeled.
//
// S2b RECONCILIATION (driver vs claude-fable-5, 2026-07-27) — fable's review moved THREE readings:
//   (1) BURST CANNON IS MULTI-SHOT: the kit gives 'Max Ammunition Capacity: 1 round' but, unlike
//       e-h, never says 'deactivates when all rounds fired' — so the 1-round magazine cycles over
//       the swap window (fire / 141f reload / fire …), ~6 shots per burst. The driver's first
//       encoding used maxShots:1 (one shot, e-h precedent) and UNDER-modelled her by ~2× (probe:
//       175.9M → 353.7M). Adopted: weaponSwap durationSec:10 (FB-window convention), no maxShots.
//       The kit-silent duration is ⚑ measurement-gated (estimate + recipe + tier 2 in the caveats).
//   (2) DEBUFF IS ON-HIT, REFRESHED: 'Target: Target(s) hit' → shotFired + swapGate:'swapped', so
//       the 27.87% vulnerability lands on the first cannon shot and refreshes per subsequent shot
//       (~96% team uptime vs ~67% for the driver's original cast-once). Adopted.
//   (3) trueDamagePct 42.24 NOT a naive always-on: fable flagged 'Camouflage permanently active' as
//       the #1 nearest-wrong model. Driver holds the unconditional passive is faithful-IN-EFFECT
//       because the buff pays off ONLY on true-flavored hits and her base normals are non-true (the
//       unmodeled flavor change) — so it is inert on them and effectively windowed to the cannon;
//       the nearest-wrong always-on reading would REQUIRE true-flavored base normals, which the sim
//       does not produce. The residual error is an under-count (⚑), not an over-credit. Concurred.
//   Converged outright: S2-E1 critRatePct 8.16 unscoped all-allies (same-squad ≡ team, single
//   deployed squad), S2-E2 chargeDamagePct 41.81 additive-ppt, S2-E3 atkPct 42.24 self, LT-bonus
//   teamHas gate (fable's 'GAP' = 'needs a gate'; driver supplied teamHas.slugs), chargeMultPct 300
//   = ×3 on the 105.6 (not additive, not 300% of ATK), Camouflage + AoE splash UNMODELED.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   ETU1 the True Damage ▲42.24% is a Damage-Up bucket that pays off ONLY on true-flavored hits.
//        Her burst cannon shots ARE true-flavored (weaponSwap.trueNormals), so removing the buff
//        drops EVERY cannon shot's mult.dmgUp by exactly 0.4224 (floor 1.4224 → 1.0) — a swing a
//        non-true-flavored cannon would never show (proving the buff AND the cannon's true flavor
//        in one diff). The diff form isolates the 42.24 from helm's FB-entry attackDamagePct 27.87
//        (a fixture confound that lifts some cannon shots by +0.2787 in mult.dmgUp).
//   ETU2 the crit rate is UNSCOPED (critRatePct, not critRateNormalPct) and reaches ALL ALLIES
//        ('same squad' ≡ the whole deployed team): the buffApply targets all four allies and lifts
//        the team's SKILL/BURST-bucket crit rates. The critRateNormalPct counterfactual leaves the
//        skill/burst buckets at base crit — provably the model shipped does NOT use (helm H1 idiom).
//   ETU3 Charge Damage ▲41.81% is ADDITIVE percentage points in the charge bucket: the cannon's
//        mult.charge is 3.4181 (= 300% full-charge + 0.4181), dropping by EXACTLY 0.4181 to 3.0 when
//        removed. The multiplicative chargeDamageMultPct reading would be 3.0×1.4181 = 4.2543.
//   ETU4 ATK ▲42.24% is SELF-scoped: the buffApply targets ETU alone; removing it lowers ETU's
//        total while leaving every ally BYTE-identical (an all-allies atkPct would move the team).
//   ETU5 the burst is a real WEAPON SWAP to a 1-round true-damage cannon that CYCLES: MULTIPLE
//        atkPct-105.6 normal-bucket shots per burstCast (≥2 per full window, ~6 at 10s), each
//        charge-bucketed at mult.charge 3.4181. A maxShots:1 / flatDamage encoding produces exactly
//        ONE hit per burst — provably fewer. Removing the swap erases every cannon shot.
//   ETU6 the Damage Taken ▲27.87% is a BOSS DEBUFF (damageTakenPct, targetIdx null → mult.taken on
//        every ally's damage), applied ON-HIT per cannon shot and refreshed: the application count
//        EQUALS the cannon-shot count (a cast-once encoding gives one per burst, far fewer), and
//        mult.taken is 1.2787 across ~96% of damage instances. The debuff-removed counterfactual
//        leaves mult.taken === 1.0; the wrong-channel counterfactual (an ally ATK buff on the enemy
//        target) resolves to nobody and never moves mult.taken.
//   ETU7 the LT-Formation bonus is GATED on emma-tactical-upgrade presence (teamHas.slugs): absent
//        in the main fixture (no emma-tu), present with emma-tu (projExpl 5.11 + trueDamage 30.97
//        on all four allies, frame 0, no expiry). The ungated counterfactual (teamHas stripped)
//        fires the bonus even WITHOUT emma-tu — proving the gate suppresses it — and lifts every
//        cannon shot's mult.dmgUp by exactly 0.3097 (the 30.97 true-damage payoff, isolated from
//        helm's confound by the diff), proving the bonus is live, not inert.
//   ETU8 every kit magnitude is the level-10 datamined value (8.16 / 41.81 / 42.24 / 105.6 / 300 /
//        27.87 / 5.11 / 30.97), not a lower level — pinned across the buffApply + damage events.
//
// Fixture (MAIN): liter (B1, 20s) / eunhwa-tactical-upgrade (B2, 20s) / ada (B3, 40s) / helm
// (B3, 40s), boss Fire (nobody advantaged: Fire/Electric/Water/Iron vs Fire), focus eunhwa-tu
// (×2.5 charge gauge → she casts every ~15s, 12 casts / 180s). ETU is slot 1. Fixture B (gate):
// emma-tactical-upgrade (B1, 20s) replaces liter so the teamHas gate is satisfied. Deterministic
// (no seed) — event logs align index-for-index across counterfactual runs. NOTE: helm's treasure
// FB-entry attackDamagePct 27.87 lifts SOME cannon shots' mult.dmgUp by +0.2787; the true-damage
// assertions therefore use DIFFS (base vs buff-removed) so the confound cancels.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const FIGHT_FRAMES = 180 * FPS;
const SWAP_WINDOW = 10 * FPS;
/** Fixture slot order (MAIN): liter 0 / eunhwa-tactical-upgrade 1 / ada 2 / helm 3. */
const ETU = 1;
const ALL_FOUR = [0, 1, 2, 3];

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

const MAIN = ['liter', 'eunhwa-tactical-upgrade', 'ada', 'helm'];
const GATE = [
  'emma-tactical-upgrade',
  'eunhwa-tactical-upgrade',
  'ada',
  'helm',
];

function run(slugs: string[], overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs,
    bossElement: 'Fire',
    focusSlug: 'eunhwa-tactical-upgrade',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const etuBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast =>
      e.kind === 'burstCast' && e.slug === 'eunhwa-tactical-upgrade'
  );
/** The burst cannon shots: the weaponSwap shots at the kit's 105.6% per-shot multiplier (distinct
 *  from her 69.04% base SR normal). */
const cannonShots = (evs: SimEvent[]) =>
  dmg(evs).filter(
    (d) =>
      d.slug === 'eunhwa-tactical-upgrade' && Math.abs(d.atkPct - 105.6) < 1e-6
  );
/** Buffs applied BY ETU (casterIdx 1). */
const etuBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === ETU &&
      b.stat === stat &&
      (value === undefined || b.value === value)
  );
/** Sorted distinct mult.dmgUp values (6dp strings) on the cannon shots. */
const cannonDmgUpSet = (evs: SimEvent[]): number[] =>
  [...new Set(cannonShots(evs).map((d) => d.mult.dmgUp.toFixed(6)))]
    .map(Number)
    .sort((a, b) => a - b);

/** Distinct crit rates per unit on the given buckets — the ETU2 unscoped discriminator. */
function critRatesByUnit(
  evs: SimEvent[],
  buckets: Damage['bucket'][]
): Record<string, string> {
  const out: Record<string, Set<string>> = {};
  for (const d of dmg(evs)) {
    if (!buckets.includes(d.bucket)) {
      continue;
    }
    (out[d.slug] ??= new Set()).add(d.critRate.toFixed(9));
  }
  return Object.fromEntries(
    Object.entries(out).map(([k, v]) => [k, [...v].sort().join(',')])
  );
}

// ---- counterfactual patches -------------------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** ETU1 reference: the S1 True Damage line removed. */
const noTrueDmg = withPatchedOverride('eunhwa-tactical-upgrade', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'trueDamagePct'));
  if (ov.skill1.length === before) {
    throw new Error('ETU S1 trueDamagePct block missing — fixture is stale');
  }
});

/** ETU2 reference: the S2-E1 crit-rate line removed. */
const noCrit = withPatchedOverride('eunhwa-tactical-upgrade', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'critRatePct'));
  if (ov.skill2.length === before) {
    throw new Error('ETU S2 critRatePct block missing — fixture is stale');
  }
});

/** ETU2 counterfactual: the same line scoped to NORMAL attacks only (critRateNormalPct). */
const critNormalOnly = withPatchedOverride('eunhwa-tactical-upgrade', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'critRatePct');
  if (!e) {
    throw new Error('ETU S2 critRatePct effect missing — fixture is stale');
  }
  e.stat = 'critRateNormalPct';
});

/** ETU3 reference: the S2-E2 charge-damage line removed. */
const noCharge = withPatchedOverride('eunhwa-tactical-upgrade', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'chargeDamagePct'));
  if (ov.skill2.length === before) {
    throw new Error('ETU S2 chargeDamagePct block missing — fixture is stale');
  }
});

/** ETU4 reference: the S2-E3 ATK line removed. */
const noAtk = withPatchedOverride('eunhwa-tactical-upgrade', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'atkPct'));
  if (ov.skill2.length === before) {
    throw new Error('ETU S2 atkPct block missing — fixture is stale');
  }
});

/** ETU5 reference: the burst weapon-swap removed. */
const noCannon = withPatchedOverride('eunhwa-tactical-upgrade', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'weaponSwap')
  );
  if (ov.burst.length === before) {
    throw new Error('ETU burst weaponSwap block missing — fixture is stale');
  }
});

/** ETU5 counterfactual: the cannon as a single-shot swap (maxShots:1, the e-h reading) — provably
 *  fewer cannon shots than the shipped cycling magazine. */
const cannonMaxShots1 = withPatchedOverride('eunhwa-tactical-upgrade', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'weaponSwap');
  if (!e) {
    throw new Error('ETU burst weaponSwap effect missing — fixture is stale');
  }
  e.maxShots = 1;
});

/** ETU6 reference: the on-hit damage-taken debuff removed. */
const noDebuff = withPatchedOverride('eunhwa-tactical-upgrade', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'damageTakenPct'));
  if (ov.burst.length === before) {
    throw new Error(
      'ETU burst damageTakenPct block missing — fixture is stale'
    );
  }
});

/** ETU6 counterfactual: the debuff as an ally-style ATK buff on the enemy target (inert — the
 *  enemy target resolves to no entity). mult.taken must never move under it. */
const debuffWrongStat = withPatchedOverride('eunhwa-tactical-upgrade', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'damageTakenPct');
  if (!e) {
    throw new Error(
      'ETU burst damageTakenPct effect missing — fixture is stale'
    );
  }
  e.stat = 'atkPct';
});

/** ETU7 counterfactual: the LT-Formation bonus UNGATED (teamHas stripped → fires without emma). */
const bonusUngated = withPatchedOverride('eunhwa-tactical-upgrade', (ov) => {
  let n = 0;
  for (const b of ov.skill2) {
    if (b.teamHas) {
      delete b.teamHas;
      n++;
    }
  }
  if (!n) {
    throw new Error(
      'ETU S2 teamHas-gated bonus blocks missing — fixture is stale'
    );
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run(MAIN);
const rNoTrueDmg = run(MAIN, { 'eunhwa-tactical-upgrade': noTrueDmg });
const rNoCrit = run(MAIN, { 'eunhwa-tactical-upgrade': noCrit });
const rCritNormal = run(MAIN, { 'eunhwa-tactical-upgrade': critNormalOnly });
const rNoCharge = run(MAIN, { 'eunhwa-tactical-upgrade': noCharge });
const rNoAtk = run(MAIN, { 'eunhwa-tactical-upgrade': noAtk });
const rNoCannon = run(MAIN, { 'eunhwa-tactical-upgrade': noCannon });
const rMaxShots1 = run(MAIN, { 'eunhwa-tactical-upgrade': cannonMaxShots1 });
const rNoDebuff = run(MAIN, { 'eunhwa-tactical-upgrade': noDebuff });
const rWrongStat = run(MAIN, { 'eunhwa-tactical-upgrade': debuffWrongStat });
const rUngated = run(MAIN, { 'eunhwa-tactical-upgrade': bonusUngated });
const rGate = run(GATE); // emma-tactical-upgrade present → LT bonus live

describe('eunhwa-tactical-upgrade (Eunhwa: Tactical Upgrade) — kit spec', () => {
  describe('ETU1 — S1 True Damage ▲42.24% (self), windowed to Camouflage, pays off on the true-flavored burst cannon', () => {
    const applied = etuBuffs(base.events, 'trueDamagePct', 42.24);

    it('is a WINDOWED, re-applied 5s self buff (not a permanent frame-0 passive)', () => {
      expect(
        applied.length,
        'windowed → many applications, not one'
      ).toBeGreaterThan(1);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([42.24]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([ETU]);
      // every application carries a finite 5s (300-frame) expiry — the Camouflage window length
      expect(applied.every((b) => typeof b.expiresFrame === 'number')).toBe(
        true
      );
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([5 * FPS]);
    });

    it('re-applies on full charges DURING Full Burst (per-FC refresh, not once per FB)', () => {
      let inFb = false;
      let fbStarts = 0;
      let duringFb = 0;
      for (const e of base.events) {
        if (e.kind === 'fullBurstStart') {
          inFb = true;
          fbStarts++;
        } else if (e.kind === 'fullBurstEnd') {
          inFb = false;
        } else if (
          inFb &&
          e.kind === 'buffApply' &&
          e.stat === 'trueDamagePct' &&
          e.value === 42.24 &&
          e.casterIdx === ETU
        ) {
          duringFb++;
        }
      }
      expect(fbStarts).toBeGreaterThan(0);
      expect(
        duringFb,
        'per-full-charge refresh yields strictly more apps than FB windows'
      ).toBeGreaterThan(fbStarts);
    });

    it('every cannon shot carries the 42.24 Damage-Up floor (mult.dmgUp ≥ 1.4224)', () => {
      const set = cannonDmgUpSet(base.events);
      expect(set.length).toBeGreaterThan(0);
      expect(set[0], 'lowest cannon dmgUp must be the 42.24 floor').toBeCloseTo(
        1.4224,
        6
      );
    });

    it('DISCRIMINATING: removing the buff drops every cannon dmgUp by exactly 0.4224 (cannon IS true-flavored)', () => {
      const shipped = cannonDmgUpSet(base.events);
      const removed = cannonDmgUpSet(rNoTrueDmg.events);
      expect(removed.length).toBe(shipped.length);
      shipped.forEach((v, i) =>
        expect(v - removed[i], `cannon dmgUp tier ${i}`).toBeCloseTo(0.4224, 6)
      );
      expect(removed[0], 'floor without the buff').toBeCloseTo(1.0, 6);
    });

    it('is LIVE: removing it lowers ETU total (and is self-scoped — allies unchanged)', () => {
      expect(base.totals['eunhwa-tactical-upgrade']).toBeGreaterThan(
        rNoTrueDmg.totals['eunhwa-tactical-upgrade']
      );
      for (const s of ['liter', 'ada', 'helm']) {
        expect(base.totals[s]).toBe(rNoTrueDmg.totals[s]);
      }
    });
  });

  describe('ETU2 — S2-E1 Critical Rate ▲8.16% (same squad ≡ all allies), unscoped', () => {
    const applied = etuBuffs(base.events, 'critRatePct', 8.16);

    it('is 8.16% from frame 0, no expiry, on all four allies', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([8.16]);
      expect([...new Set(applied.map((b) => b.frame))]).toEqual([0]);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual(
        ALL_FOUR
      );
    });

    it('is UNSCOPED: lifts the team skill/burst-bucket crit rates (not normal-only)', () => {
      expect(critRatesByUnit(base.events, ['skill', 'burst'])).not.toEqual(
        critRatesByUnit(rNoCrit.events, ['skill', 'burst'])
      );
      expect(critRatesByUnit(rCritNormal.events, ['skill', 'burst'])).toEqual(
        critRatesByUnit(rNoCrit.events, ['skill', 'burst'])
      );
    });

    it('is LIVE: removing it lowers every ally total', () => {
      for (const s of MAIN) {
        expect(base.totals[s], `${s} total`).toBeGreaterThan(rNoCrit.totals[s]);
      }
    });
  });

  describe('ETU3 — S2-E2 Charge Damage ▲41.81% (all allies), additive ppt in the charge bucket', () => {
    const applied = etuBuffs(base.events, 'chargeDamagePct', 41.81);

    it('is 41.81% from frame 0, no expiry, on all four allies', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([41.81]);
      expect([...new Set(applied.map((b) => b.frame))]).toEqual([0]);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual(
        ALL_FOUR
      );
    });

    it('is ADDITIVE ppt: every cannon mult.charge is 3.4181 (300% FC + 0.4181), dropping to 3.0 when removed', () => {
      expect([
        ...new Set(
          cannonShots(base.events).map((d) => d.mult.charge.toFixed(6))
        ),
      ]).toEqual(['3.418100']);
      expect([
        ...new Set(
          cannonShots(rNoCharge.events).map((d) => d.mult.charge.toFixed(6))
        ),
      ]).toEqual(['3.000000']);
    });

    it('is LIVE: removing it lowers the charge-weapon allies (ETU/helm/ada)', () => {
      for (const s of ['eunhwa-tactical-upgrade', 'helm', 'ada']) {
        expect(base.totals[s], `${s} total`).toBeGreaterThan(
          rNoCharge.totals[s]
        );
      }
    });
  });

  describe('ETU4 — S2-E3 ATK ▲42.24% (self only)', () => {
    const applied = etuBuffs(base.events, 'atkPct', 42.24);

    it('is 42.24% from frame 0, no expiry, self-scoped (ETU alone)', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([42.24]);
      expect([...new Set(applied.map((b) => b.frame))]).toEqual([0]);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([ETU]);
    });

    it('is LIVE + SELF-scoped: removing lowers ETU total, allies byte-identical', () => {
      expect(base.totals['eunhwa-tactical-upgrade']).toBeGreaterThan(
        rNoAtk.totals['eunhwa-tactical-upgrade']
      );
      for (const s of ['liter', 'ada', 'helm']) {
        expect(
          base.totals[s],
          `${s} must be untouched by a self ATK buff`
        ).toBe(rNoAtk.totals[s]);
      }
    });
  });

  describe('ETU5 — Burst weapon swap: a cycling 1-round true-damage cannon (multiple shots per cast)', () => {
    it('fires MULTIPLE cannon shots per burstCast (≥2 per full window), in the normal bucket', () => {
      const bursts = etuBursts(base.events);
      const cannon = cannonShots(base.events);
      expect(bursts.length).toBeGreaterThan(0);
      expect(
        cannon.length,
        'a cycling 1-round magazine fires far more shots than casts'
      ).toBeGreaterThan(bursts.length);
      expect([...new Set(cannon.map((d) => d.bucket))]).toEqual(['normal']);
      expect(cannon.every((d) => d.critEligible)).toBe(true);
      // every full-window burst yields ≥2 cannon shots (a maxShots:1 model gives exactly 1)
      const fullWindows = bursts
        .map((b) => b.frame)
        .filter((f) => f + SWAP_WINDOW <= FIGHT_FRAMES);
      expect(fullWindows.length).toBeGreaterThan(0);
      for (const f of fullWindows) {
        const count = cannon.filter(
          (c) => c.frame >= f && c.frame < f + SWAP_WINDOW
        ).length;
        expect(count, `burst at frame ${f}`).toBeGreaterThanOrEqual(2);
      }
    });

    it('carries the kit full-charge multiplier (300% → mult.charge 3.4181 with charge damage)', () => {
      expect([
        ...new Set(
          cannonShots(base.events).map((d) => d.mult.charge.toFixed(6))
        ),
      ]).toEqual(['3.418100']);
    });

    it('DISCRIMINATING: a single-shot (maxShots:1) cannon fires far fewer shots; removing the swap fires none', () => {
      const shipped = cannonShots(base.events).length;
      const single = cannonShots(rMaxShots1.events).length;
      expect(single).toBe(etuBursts(base.events).length); // exactly one per cast
      expect(shipped).toBeGreaterThan(single);
      expect(cannonShots(rNoCannon.events).length).toBe(0);
      expect(base.totals['eunhwa-tactical-upgrade']).toBeGreaterThan(
        rNoCannon.totals['eunhwa-tactical-upgrade']
      );
    });
  });

  describe('ETU6 — Burst cannon applies Damage Taken ▲27.87% to the boss on-hit, refreshed per shot', () => {
    const debuffApps = (evs: SimEvent[]) =>
      buffs(evs).filter(
        (b) =>
          b.stat === 'damageTakenPct' &&
          b.targetIdx === null &&
          b.value === 27.87
      );

    it('applies once per cannon shot landed (on-hit refresh), on the boss, 10s windows', () => {
      const apps = debuffApps(base.events);
      const cannon = cannonShots(base.events).length;
      expect(apps.length).toBeGreaterThan(0);
      expect(
        apps.length,
        'on-hit refresh: one application per cannon shot, not one per burst'
      ).toBe(cannon);
      for (const b of apps) {
        expect(b.targetIdx, 'a boss debuff has no unit holder').toBeNull();
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('mult.taken is 1.2787 in-window, covering ~the whole fight (on-hit refresh)', () => {
      const all = dmg(base.events);
      const lifted = all.filter((d) => d.mult.taken > 1);
      expect(
        lifted.length / all.length,
        'on-hit refresh keeps the vulnerability up across ~the whole fight'
      ).toBeGreaterThan(0.9);
      expect([...new Set(lifted.map((d) => d.mult.taken.toFixed(6)))]).toEqual([
        '1.278700',
      ]);
    });

    it('DISCRIMINATING: boss-DEBUFF channel — removed leaves mult.taken 1.0; wrong-stat never moves it', () => {
      expect(
        dmg(base.events).some((d) => d.mult.taken > 1.2),
        'shipped must lift mult.taken'
      ).toBe(true);
      expect(
        dmg(rNoDebuff.events).every((d) => d.mult.taken === 1),
        'debuff-removed must stay at 1.0'
      ).toBe(true);
      expect(
        dmg(rWrongStat.events).some((d) => d.mult.taken > 1.0001),
        'atkPct on the enemy target resolves to nobody — mult.taken must stay 1.0'
      ).toBe(false);
    });

    it('is LIVE: removing it lowers every ally total (the debuff amplifies the whole team)', () => {
      for (const s of MAIN) {
        expect(base.totals[s], `${s} total`).toBeGreaterThan(
          rNoDebuff.totals[s]
        );
      }
    });
  });

  describe('ETU7 — S2 LT-Formation bonus (projExpl 5.11 + trueDmg 30.97), gated on emma-tu', () => {
    it('is ABSENT without emma-tactical-upgrade (main fixture)', () => {
      expect(etuBuffs(base.events, 'projectileExplosionPct', 5.11)).toEqual([]);
      expect(etuBuffs(base.events, 'trueDamagePct', 30.97)).toEqual([]);
    });

    it('is PRESENT with emma-tu: both buffs on all four allies, frame 0, no expiry', () => {
      const proj = etuBuffs(rGate.events, 'projectileExplosionPct', 5.11);
      const tru = etuBuffs(rGate.events, 'trueDamagePct', 30.97);
      expect(proj.length).toBeGreaterThan(0);
      expect(tru.length).toBeGreaterThan(0);
      expect([...new Set(proj.map((b) => b.targetIdx))].sort()).toEqual(
        ALL_FOUR
      );
      expect([...new Set(tru.map((b) => b.targetIdx))].sort()).toEqual(
        ALL_FOUR
      );
      expect([...new Set(proj.map((b) => b.frame))]).toEqual([0]);
      expect([...new Set(tru.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it('DISCRIMINATING: stripping the gate fires the bonus even WITHOUT emma-tu', () => {
      expect(
        etuBuffs(rUngated.events, 'projectileExplosionPct', 5.11).length
      ).toBeGreaterThan(0);
      expect(
        etuBuffs(rUngated.events, 'trueDamagePct', 30.97).length
      ).toBeGreaterThan(0);
    });

    it('is LIVE: the bonus true-damage lifts every cannon dmgUp by exactly 0.3097 (isolated from helm)', () => {
      const gated = cannonDmgUpSet(base.events);
      const ungated = cannonDmgUpSet(rUngated.events);
      expect(ungated.length).toBe(gated.length);
      ungated.forEach((v, i) =>
        expect(v - gated[i], `cannon dmgUp tier ${i}`).toBeCloseTo(0.3097, 6)
      );
      expect(ungated[0], 'floor with both true-damage buffs').toBeCloseTo(
        1.7321,
        6
      );
    });
  });

  describe('ETU8 — kit magnitudes are the level-10 datamined values', () => {
    it('pins every buff value and the cannon/debuff magnitudes', () => {
      expect([
        ...new Set(etuBuffs(base.events, 'critRatePct').map((b) => b.value)),
      ]).toEqual([8.16]);
      expect([
        ...new Set(
          etuBuffs(base.events, 'chargeDamagePct').map((b) => b.value)
        ),
      ]).toEqual([41.81]);
      expect([
        ...new Set(etuBuffs(base.events, 'atkPct').map((b) => b.value)),
      ]).toEqual([42.24]);
      expect([
        ...new Set(etuBuffs(base.events, 'trueDamagePct').map((b) => b.value)),
      ]).toEqual([42.24]);
      expect([
        ...new Set(cannonShots(base.events).map((d) => d.atkPct)),
      ]).toEqual([105.6]);
      expect([
        ...new Set(
          buffs(base.events)
            .filter((b) => b.stat === 'damageTakenPct' && b.targetIdx === null)
            .map((b) => b.value)
        ),
      ]).toEqual([27.87]);
    });
  });
});
