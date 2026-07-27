// PER-UNIT KIT SPEC — `asuka-wille` (Asuka: WILLE, MG/Attacker/Wind, Burst III, cd 40s, ammo 300 /
// reloadFrames 161). Kit-autonomy gauntlet 2026-07-24, test-first (S2a).
//
// ⚠ EXACT SLUG: this is the MG/Wind "Asuka: WILLE" variant (aka "aw"/"wasuka"), NOT base `asuka`
// (AR/Attacker/Fire/Burst III). Every assertion reasons from slug `asuka-wille`.
//
// One assertion group per KIT LINE (W1..W11 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` builds COUNTERFACTUALS only (the nearest wrong model each
// assertion must discriminate against) — never the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['asuka-wille'].skills):
//   S1 ■ after landing 50 normal attacks → target: 471.86% final ATK additional damage          [W1]
//      ■ in Annihilation State, every 10 shots → 2 nearest enemies: 15.62% final ATK damage     [W2]
//        + Anti A.T. Field: Damage Taken ▲0.83% / stacks to 30 (boss debuff, CONSUMED at state-  [W2]
//          end → effective life the 9s window, not the nominal 30s)
//   S2 ■ entering FB while in Annihilation State → self: Attack Damage ▲30.97% / 10s            [W3]
//        (fullBurstEnter + ownBurstGate:'cast' — fires at FB entry only on HER OWN rotations)
//      ■ using Annihilation (Emergency Repair, at Annihilation-State end ≈ fullBurstEnd ~t+9s):
//          Eff1 MG heating-up speed ▼100% / 3s        → UNMODELED (no wind-up primitive) ⚑2     [--]
//          Eff2 Removes 100% of ammo                  → consumeAmmo fraction:1 (modeled) ⚑7     [W11]
//          Eff3 recover 3.77% Max HP / 1s over 3s     → self heal EVENT (3 ticks, inert here)   [W4]
//          Eff4 reload speed fixed ▲60% for 1 round   → reloadSpeedPct 60 / 10.5s window ⚑3     [W5]
//   BU ■ Annihilation State → self: Normal Attack Mult ▼40% / 9s                                [W6]
//                          → self: Reloads 21% magazine (instantReload 0.21)                    [W7]
//                          → self: ATK ▲46.8% of caster ATK / 9s                                [W8]
//                          → self: Attack Damage ▲36% / 9s                                      [W9]
//        + inflicts targetStatus 'Annihilation State' 9s on the boss (the mode-window gate proxy)
//      ■ Annihilation finisher → target w/ Anti A.T. Field: 6.62% × stack count (cap 30 = 198.6%),[W10]
//        delaySec:9 → LANDS at state-end inside the FB window (FB-boosted, finding F2)
//
// Discrimination notes (a test that cannot fail under the nearest wrong model gates nothing):
//   W2  the Anti A.T. Field debuff is a BOSS debuff (targetIdx null) amplifying ALL team damage;
//       removing it must drop the team total, not just asuka-wille's. GAUNTLET FIX (consumption):
//       the burst finisher prose says the status "is removed after the effect is triggered", so the
//       debuff is CONSUMED at state-end (~cast+9s) — its real life is the 9s build window, NOT the
//       near-permanent 30-stack the parser-baseline shipped (which over-credited the whole team
//       ~3-4x avg). Now GATED: the burst inflicts targetStatus 'Annihilation State' 9s (no SELF-status
//       gate exists, so the mode is proxied as a boss status, marciana/privaty pattern) and the S1
//       proc carries requiresTargetStatus 'Annihilation State' at hitCount 10 (every 10 in-window
//       shots). The 15.62% rider + debuff fire ONLY inside [cast, +9s]; the debuff durationSec is 9
//       (effective=consumed). Residual ⚑6: instant stack-removal is unmodelable (no remove-target-buff
//       primitive) → gradual 9s expiry leaves a short post-window tail.
//   W3  TIER-2 HEADLINE: trigger is `fullBurstEnter` + ownBurstGate:'cast' (the purpose-built primitive
//       for "entering FB after her OWN burst"), NOT a bare fullBurstEnter. Annihilation State exists
//       only via HER OWN burst, so the FB-entry condition is satisfied exactly on rotations she bursts.
//       The fixture runs TWO Burst III units (asuka-wille + helm) so there are FB entries she does NOT
//       cast — a bare fullBurstEnter (ownBurstGate dropped) fires the 30.97% buff on every FB entry
//       (≈ double), over-crediting her in multi-B3 teams (cinderella-crystal-wave class finding).
//       Shipped count == her burst-cast count; the ungated counterfactual fires strictly more.
//   W4  the heal is a SELF recovery-event emitter (no HP amount modeled). asuka-wille has no
//       recovery-triggered block of her own and the heal targets only her, so it is damage-INERT
//       in this comp (verified: removing it moves no unit's total); its observable is the recovery
//       event itself, which the SimEvent union does not surface — so W4 is a structural PIN (the heal
//       effect is present + is a 3-tick HoT per the prose "every 1 sec over 3 sec"), not a totals
//       discriminator. Documented, not weakened.
//   W6  normalAttackPct -40 is a SELF-NERF during Annihilation State: removing it INCREASES her
//       normal-bucket damage. The discrimination direction is the reverse of a buff.
//   W10 the finisher is 6.62% × 30-stack cap = 198.6%, one hit per burst cast in the burst bucket,
//       with delaySec:9 so it LANDS at state-end (~cast+9s) INSIDE the FB window → FB-boosted (the
//       hand-slot F2 finding, now modeled). The single-stack counterfactual (6.62%) proves the
//       magnitude encodes the 30-stack mirror, not one stack. (The live stack count is measurement-gated
//       ⚑4/⚑5 — no dynamic-stack-scale primitive; the 30-cap is a documented proxy.)
//   W11 "Removes 100% of ammo" is modeled as consumeAmmo fraction:1 on the fullBurstEnd Emergency
//       Repair block (~10s after the burst's instantReload 0.21, so no collision); stripping it
//       perturbs her reload cadence (the forced reloads disappear).
//
// UNMODELED (documented in the override `unmodeled` + note, NO assertion here): S2 Eff1 (MG heating
// speed — no wind-up primitive ⚑2). The ammo dump (Eff2) IS modeled (W11). The Anti A.T. Field
// instant-consumption residual is ⚑6 (no remove-target-buff primitive; gradual-expiry proxy).
//
// Fixture: controlComp('asuka-wille') = liter (B1) / crown (B2) / asuka-wille (B3, focus) / helm
// (B3). Two Burst III units so asuka-wille casts ~half the FB cycles — required for the W3 trigger
// discrimination. Deterministic (no seed); event-log assertions over totals where a line is live.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / asuka-wille 2 / helm 3. */
const AW = 2;
const SLUG = 'asuka-wille';

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Reload = Extract<SimEvent, { kind: 'reload' }>;
type FBStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
const hasKind = (b: any, kind: string) =>
  b.effects.some((e: any) => e.kind === kind);
const findBlock = (arr: any[], pred: (b: any) => boolean, label: string) => {
  const b = arr.find(pred);
  if (!b) {
    throw new Error(`asuka-wille ${label} block missing — fixture is stale`);
  }
  return b;
};

/** W2 reference: strip the Anti A.T. Field damageTakenPct debuff from the S1 every-10-shots block. */
const awNoAtfDebuff = withPatchedOverride(SLUG, (ov) => {
  const b = findBlock(
    ov.skill1,
    (x) =>
      x.trigger?.kind === 'hitCount' &&
      x.requiresTargetStatus === 'Annihilation State',
    'S1 ATF'
  );
  const before = b.effects.length;
  b.effects = b.effects.filter((e: any) => e.stat !== 'damageTakenPct');
  if (b.effects.length === before) {
    throw new Error(
      'asuka-wille S1 damageTakenPct effect missing — fixture is stale'
    );
  }
});
/** W2 counterfactual: drop the Annihilation-State gate — the nearest wrong model (the prior ungated
 *  encoding), which spreads the proc + debuff across the WHOLE fight instead of the 9s window. */
const awUngated = withPatchedOverride(SLUG, (ov) => {
  const b = findBlock(
    ov.skill1,
    (x) =>
      x.trigger?.kind === 'hitCount' &&
      x.requiresTargetStatus === 'Annihilation State',
    'S1 ATF'
  );
  delete b.requiresTargetStatus;
});
/** W1 reference: remove the S1 50-hit 471.86% block entirely. */
const awNoS1Nuke = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (x: any) => !(x.trigger?.kind === 'hitCount' && x.trigger?.count === 50)
  );
  if (ov.skill1.length === before) {
    throw new Error('asuka-wille S1 50-hit block missing — fixture is stale');
  }
});
/** W3 counterfactual: drop the ownBurstGate so the FB-entry buff fires on EVERY Full Burst
 *  (including the co-B3's rotations) — the nearest wrong model it must discriminate against. */
const awFbEnter = withPatchedOverride(SLUG, (ov) => {
  const b = findBlock(
    ov.skill2,
    (x) =>
      hasStat(x, 'attackDamagePct') &&
      x.effects.some((e: any) => e.value === 30.97),
    'S2 30.97'
  );
  delete b.ownBurstGate;
});
/** W11 reference: strip the consumeAmmo ammo-dump from Emergency Repair. */
const awNoAmmoDump = withPatchedOverride(SLUG, (ov) => {
  const b = findBlock(
    ov.skill2,
    (x) => hasKind(x, 'consumeAmmo'),
    'S2 consumeAmmo'
  );
  const before = b.effects.length;
  b.effects = b.effects.filter((e: any) => e.kind !== 'consumeAmmo');
  if (b.effects.length === before) {
    throw new Error(
      'asuka-wille S2 consumeAmmo effect missing — fixture is stale'
    );
  }
});
/** W5 reference: strip the reloadSpeedPct 60 window from Emergency Repair. */
const awNoReloadSpeed = withPatchedOverride(SLUG, (ov) => {
  const b = findBlock(
    ov.skill2,
    (x) => hasStat(x, 'reloadSpeedPct'),
    'S2 reloadSpeed'
  );
  const before = b.effects.length;
  b.effects = b.effects.filter((e: any) => e.stat !== 'reloadSpeedPct');
  if (b.effects.length === before) {
    throw new Error(
      'asuka-wille S2 reloadSpeedPct effect missing — fixture is stale'
    );
  }
});
/** W6 reference: strip the burst normalAttackPct -40 self-nerf. */
const awNoNormalDebuff = withPatchedOverride(SLUG, (ov) => {
  const b = findBlock(
    ov.burst,
    (x) => hasStat(x, 'normalAttackPct'),
    'BU normalAttackPct'
  );
  const before = b.effects.length;
  b.effects = b.effects.filter((e: any) => e.stat !== 'normalAttackPct');
  if (b.effects.length === before) {
    throw new Error(
      'asuka-wille burst normalAttackPct effect missing — fixture is stale'
    );
  }
});
/** W7 reference: strip the burst instantReload 0.21. */
const awNoInstantReload = withPatchedOverride(SLUG, (ov) => {
  const b = findBlock(
    ov.burst,
    (x) => hasKind(x, 'instantReload'),
    'BU instantReload'
  );
  const before = b.effects.length;
  b.effects = b.effects.filter((e: any) => e.kind !== 'instantReload');
  if (b.effects.length === before) {
    throw new Error(
      'asuka-wille burst instantReload effect missing — fixture is stale'
    );
  }
});
/** W8 reference: strip the burst casterAtkPct 46.8 (the big ATK line). */
const awNoCasterAtk = withPatchedOverride(SLUG, (ov) => {
  const b = findBlock(
    ov.burst,
    (x) => hasStat(x, 'casterAtkPct'),
    'BU casterAtkPct'
  );
  const before = b.effects.length;
  b.effects = b.effects.filter((e: any) => e.stat !== 'casterAtkPct');
  if (b.effects.length === before) {
    throw new Error(
      'asuka-wille burst casterAtkPct effect missing — fixture is stale'
    );
  }
});
/** W9 reference: strip the burst attackDamagePct 36. */
const awNoBurstAtkDmg = withPatchedOverride(SLUG, (ov) => {
  const b = findBlock(
    ov.burst,
    (x) =>
      x.effects.some(
        (e: any) => e.stat === 'attackDamagePct' && e.value === 36
      ),
    'BU attackDamagePct36'
  );
  b.effects = b.effects.filter(
    (e: any) => !(e.stat === 'attackDamagePct' && e.value === 36)
  );
});
/** W10 reference: remove the Annihilation finisher block. */
const awNoFinisher = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (x: any) =>
      !x.effects.some((e: any) => e.kind === 'flatDamage' && e.atkPct === 198.6)
  );
  if (ov.burst.length === before) {
    throw new Error(
      'asuka-wille burst finisher block missing — fixture is stale'
    );
  }
});
/** W10 magnitude counterfactual: finisher at a SINGLE Anti A.T. Field stack (6.62%), not the 30-cap. */
const awSingleStack = withPatchedOverride(SLUG, (ov) => {
  const b = findBlock(
    ov.burst,
    (x) =>
      x.effects.some((e: any) => e.kind === 'flatDamage' && e.atkPct === 198.6),
    'BU finisher'
  );
  b.effects.find((e: any) => e.kind === 'flatDamage').atkPct = 6.62;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noAtfDebuff = run({ [SLUG]: awNoAtfDebuff });
const ungated = run({ [SLUG]: awUngated });
const noS1Nuke = run({ [SLUG]: awNoS1Nuke });
const fbEnter = run({ [SLUG]: awFbEnter });
const noReloadSpeed = run({ [SLUG]: awNoReloadSpeed });
const noAmmoDump = run({ [SLUG]: awNoAmmoDump });
const noNormalDebuff = run({ [SLUG]: awNoNormalDebuff });
const noInstantReload = run({ [SLUG]: awNoInstantReload });
const noCasterAtk = run({ [SLUG]: awNoCasterAtk });
const noBurstAtkDmg = run({ [SLUG]: awNoBurstAtkDmg });
const noFinisher = run({ [SLUG]: awNoFinisher });
const singleStack = run({ [SLUG]: awSingleStack });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const awDmg = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === SLUG && d.srcSlot === srcSlot);
const awNormalDmg = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === SLUG && d.bucket === 'normal');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const awBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FBStart => e.kind === 'fullBurstStart');
const awReloads = (evs: SimEvent[]) =>
  evs.filter((e): e is Reload => e.kind === 'reload' && e.slug === SLUG);
const sum = (t: Record<string, number>) =>
  Object.values(t).reduce((a, b) => a + b, 0);
/** asuka-wille self-buffs from a given caster slot at an exact value. */
const awSelfBuff = (evs: SimEvent[], stat: string, value: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === AW &&
      b.targetIdx === AW &&
      b.stat === stat &&
      b.value === value
  );

describe('asuka-wille (Asuka: WILLE) — kit spec', () => {
  it('fixture sanity: she casts bursts, but NOT every Full Burst (two B3 in the comp)', () => {
    expect(awBursts(base.events).length).toBeGreaterThan(0);
    expect(fbStarts(base.events).length).toBeGreaterThan(
      awBursts(base.events).length
    );
  });

  describe('W1 — S1 50-hit rider: 471.86% final ATK additional damage', () => {
    const riders = awDmg(base.events, 'skill1').filter(
      (d) => d.atkPct === 471.86
    );
    it('lands at the kit magnitude on the skill1 slot', () => {
      expect(riders.length).toBeGreaterThan(0);
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([471.86]);
    });
    it('DISCRIMINATING: removing the 50-hit block eliminates every 471.86% hit', () => {
      expect(
        awDmg(noS1Nuke.events, 'skill1').filter((d) => d.atkPct === 471.86)
          .length
      ).toBe(0);
    });
  });

  describe('W2 — S1 Anti A.T. Field: 15.62% rider + boss Damage-Taken debuff, GATED to the 9s Annihilation State window (consumed at state-end)', () => {
    const debuff = buffs(base.events).filter(
      (b) => b.stat === 'damageTakenPct'
    );
    // Annihilation State windows: [her burstCast, +9s]. The burst inflicts targetStatus
    // 'Annihilation State' (9s) which gates the S1 proc; the finisher consumes the status at
    // state-end, so the proc + debuff live ONLY inside these windows.
    const windows = awBursts(base.events).map(
      (c) => [c.frame, c.frame + 9 * FPS] as const
    );
    const inWindow = (f: number) => windows.some(([a, b]) => f >= a && f <= b);
    const rider = awDmg(base.events, 'skill1').filter(
      (d) => d.atkPct === 15.62
    );

    it('applies the debuff to the BOSS (targetIdx null) at 0.83% per stack, capping at 30', () => {
      expect(debuff.length).toBeGreaterThan(0);
      for (const b of debuff) {
        expect(b.targetIdx).toBeNull();
      }
      expect([...new Set(debuff.map((b) => b.value))]).toEqual([0.83]);
      expect([...new Set(debuff.map((b) => b.maxStacks))]).toEqual([30]);
      expect(Math.max(...debuff.map((b) => b.stacks))).toBe(30);
    });
    it('the debuff life is the 9s window (consumed at state-end), NOT the nominal 30s', () => {
      // The prose says 30s but the status is REMOVED by the finisher at ~9s, so the effective
      // duration encoded is 9s. A 30s persistence (the prior encoding) keeps the debuff near-permanent.
      for (const b of debuff) {
        expect(b.expiresFrame! - b.frame).toBe(9 * FPS);
      }
    });
    it('the 15.62% rider fires ONLY inside the Annihilation State windows (state-gated)', () => {
      expect(rider.length).toBeGreaterThan(0);
      expect(rider.filter((d) => !inWindow(d.frame)).map((d) => d.sec)).toEqual(
        []
      );
    });
    it('DISCRIMINATING: dropping the gate spreads the rider across the whole fight (the prior wrong model)', () => {
      const ungatedRider = awDmg(ungated.events, 'skill1').filter(
        (d) => d.atkPct === 15.62
      );
      expect(ungatedRider.length).toBeGreaterThan(rider.length);
      expect(ungatedRider.some((d) => !inWindow(d.frame))).toBe(true);
    });
    it('DISCRIMINATING: the debuff amplifies the WHOLE team — removing it drops the team total', () => {
      expect(sum(base.totals)).toBeGreaterThan(sum(noAtfDebuff.totals));
    });
  });

  describe('W3 — S2 FB-entry Attack Damage ▲30.97% / 10s is fullBurstEnter + ownBurstGate:cast, NOT a bare fullBurstEnter (TIER 2)', () => {
    const applied = awSelfBuff(base.events, 'attackDamagePct', 30.97);
    it('fires at FB entry on HER OWN rotations only (count == her burst-cast count), self-scoped, for 10s', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect(applied.length).toBe(awBursts(base.events).length);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
    it('DISCRIMINATING: a bare fullBurstEnter (ownBurstGate dropped) fires on EVERY FB entry — strictly more', () => {
      const fbApplied = awSelfBuff(fbEnter.events, 'attackDamagePct', 30.97);
      expect(fbApplied.length).toBeGreaterThan(applied.length);
      expect(fbApplied.length).toBe(fbStarts(fbEnter.events).length);
    });
  });

  describe('W4 — S2 Emergency Repair heal is a 3-tick self recovery emitter (damage-inert here)', () => {
    it('is present as a heal effect with ticks:3 / intervalSec:1 (prose: every 1s over 3s)', () => {
      // Structural PIN: the heal is damage-inert in this comp (self-targeted, asuka-wille has no
      // recovery block and the SimEvent union surfaces no recovery event), so the encoding is
      // asserted on the override shape, not the log.
      const ov: any = withPatchedOverride(SLUG, () => {});
      const blk = ov.skill2.find((x: any) => hasKind(x, 'heal'));
      expect(blk, 'Emergency Repair heal block missing').toBeTruthy();
      const heal = blk.effects.find((e: any) => e.kind === 'heal');
      expect(heal.ticks).toBe(3);
      expect(heal.intervalSec ?? 1).toBe(1);
    });
  });

  describe('W5 — S2 Emergency Repair reload speed fixed ▲60% (10.5s window proxy ⚑3)', () => {
    const applied = awSelfBuff(base.events, 'reloadSpeedPct', 60);
    it('applies reloadSpeedPct 60 to herself for the 10.5s window', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([60]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(Math.round(10.5 * FPS));
      }
    });
    it('DISCRIMINATING: stripping the window removes every reloadSpeedPct application', () => {
      expect(
        awSelfBuff(noReloadSpeed.events, 'reloadSpeedPct', 60).length
      ).toBe(0);
    });
  });

  describe('W6 — burst Annihilation State: Normal Attack Mult ▼40% / 9s (a SELF-NERF)', () => {
    const applied = awSelfBuff(base.events, 'normalAttackPct', -40);
    it('applies -40% to her own normals for 9s', () => {
      expect(applied.length).toBe(awBursts(base.events).length);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(9 * FPS);
      }
    });
    it('DISCRIMINATING: removing the nerf INCREASES her normal-bucket damage', () => {
      const baseNormal = awNormalDmg(base.events).reduce(
        (a, d) => a + d.amount,
        0
      );
      const freedNormal = awNormalDmg(noNormalDebuff.events).reduce(
        (a, d) => a + d.amount,
        0
      );
      expect(freedNormal).toBeGreaterThan(baseNormal);
    });
  });

  describe('W7 — burst Annihilation State: Reloads 21% magazine (instantReload 0.21)', () => {
    it('is encoded on the burst block (structural PIN)', () => {
      const ov: any = withPatchedOverride(SLUG, () => {});
      const blk = ov.burst.find((x: any) => hasKind(x, 'instantReload'));
      expect(blk, 'burst instantReload block missing').toBeTruthy();
      expect(
        blk.effects.find((e: any) => e.kind === 'instantReload').fraction
      ).toBe(0.21);
    });
    it('perturbs her reload cadence vs stripping it (not byte-identical)', () => {
      // The 21% top-up delays her next magazine reload; observable as a shift in reload timing.
      const baseReloads = awReloads(base.events).map((r) => r.frame);
      const strippedReloads = awReloads(noInstantReload.events).map(
        (r) => r.frame
      );
      expect(baseReloads).not.toEqual(strippedReloads);
    });
  });

  describe('W8 — burst Annihilation State: ATK ▲46.8% of caster ATK / 9s (the big ATK line)', () => {
    // casterAtkPct resolves to a FLAT ATK grant in `value`; the percentage is carried in the key
    // ("2:burst:casterAtkPct:46.8"), so filter on the key, not the value.
    const applied = buffs(base.events).filter(
      (b) =>
        b.casterIdx === AW &&
        b.targetIdx === AW &&
        b.stat === 'casterAtkPct' &&
        b.key.endsWith(':46.8')
    );
    it('applies 46.8% caster-ATK to herself for 9s, once per cast', () => {
      expect(applied.length).toBe(awBursts(base.events).length);
      expect(applied.length).toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(9 * FPS);
      }
    });
    it('DISCRIMINATING: removing it drops her total substantially', () => {
      expect(base.totals[SLUG]).toBeGreaterThan(noCasterAtk.totals[SLUG] * 1.1);
    });
  });

  describe('W9 — burst Annihilation State: Attack Damage ▲36% / 9s (distinct from the S2 30.97%/10s)', () => {
    const applied = awSelfBuff(base.events, 'attackDamagePct', 36);
    it('applies 36% for 9s (the 9s duration separates it from the S2 10s buff)', () => {
      expect(applied.length).toBe(awBursts(base.events).length);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(9 * FPS);
      }
    });
    it('DISCRIMINATING: removing it drops her total', () => {
      expect(base.totals[SLUG]).toBeGreaterThan(noBurstAtkDmg.totals[SLUG]);
    });
  });

  describe('W10 — burst Annihilation finisher: 6.62% × 30-stack cap = 198.6%, delayed to state-end (lands in FB)', () => {
    const finishers = awDmg(base.events, 'burst').filter(
      (d) => d.atkPct === 198.6
    );
    it('fires once per burst cast at 198.6% in the burst bucket', () => {
      expect(finishers.length).toBe(awBursts(base.events).length);
      expect(finishers.length).toBeGreaterThan(0);
      expect([...new Set(finishers.map((d) => d.bucket))]).toEqual(['burst']);
    });
    it('LANDS at Annihilation-State end (~cast+9s) INSIDE the FB window → takes the +50% FB major (finding F2)', () => {
      // delaySec:9 flighted hit: it lands ~9s after cast, inside the Full Burst window, so it is
      // FB-boosted — the prose "after Annihilation State ends" timing, not a cast-frame hit.
      expect(finishers.every((d) => d.inFullBurst && d.fbMajorApplied)).toBe(
        true
      );
    });
    it('DISCRIMINATING (presence): removing the finisher eliminates the 198.6% hit', () => {
      expect(
        awDmg(noFinisher.events, 'burst').filter((d) => d.atkPct === 198.6)
          .length
      ).toBe(0);
    });
    it('DISCRIMINATING (magnitude): a single-stack finisher is 6.62%, NOT 198.6%', () => {
      const single = awDmg(singleStack.events, 'burst');
      expect([...new Set(single.map((d) => d.atkPct))]).toEqual([6.62]);
      expect(single.filter((d) => d.atkPct === 198.6).length).toBe(0);
    });
  });

  describe('W11 — S2 Emergency Repair "Removes 100% of ammo" is modeled (consumeAmmo at state-end)', () => {
    it('is encoded as consumeAmmo fraction:1 on the fullBurstEnd Emergency Repair block', () => {
      const ov: any = withPatchedOverride(SLUG, () => {});
      const blk = ov.skill2.find((x: any) => hasKind(x, 'consumeAmmo'));
      expect(blk, 'Emergency Repair consumeAmmo block missing').toBeTruthy();
      expect(blk.trigger.kind).toBe('fullBurstEnd');
      expect(
        blk.effects.find((e: any) => e.kind === 'consumeAmmo').fraction
      ).toBe(1);
    });
    it('DISCRIMINATING: stripping the dump perturbs her reload cadence (forced reloads gone)', () => {
      const baseReloads = awReloads(base.events).map((r) => r.frame);
      const noDumpReloads = awReloads(noAmmoDump.events).map((r) => r.frame);
      expect(baseReloads).not.toEqual(noDumpReloads);
    });
  });
});
