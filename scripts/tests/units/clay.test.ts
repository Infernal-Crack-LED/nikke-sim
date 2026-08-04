// PER-UNIT KIT SPEC — `clay` (Clay, SMG/Electric/Supporter/Burst II, cd 40s, ammo 120,
// reloadFrames 81, normalMult 10.12, rate_of_fire 1440 → nominal 24 pulls/s, frame-quantized to the measured 20.0/s SMG cadence). Kit-autonomy
// gauntlet 2026-08-03. FROM-SCRATCH build (no prior override; baseline was bare weapon,
// simSupported:false).
//
// Kit (data/characters.json → characters.clay.skills, SL10):
//   S1 ■ after landing 60 normal attacks DURING Full Burst → all allies:                 [C1 trigger]
//      ■ Victorious Battle Cry: True Damage ▲6.45%, stacks up to 3 times, lasts 6 sec    [C1 stacks]
//      ■ when attacking an enemy projectile, damage to that projectile ▲45.05% for 6 sec [U1 INERT]
//   S2 ■ entering Burst Stage 1 → all allies: debuff immunity to 1 debuff(s) for 10 sec  [U2 INERT]
//      ■ only while in Victorious Battle Cry status → all allies:
//        ATK ▲20.07% of the skill user's ATK continuously                                [C2]
//   BU ■ all allies: True Damage ▲12.56% for 10 sec                                      [C3]
//      ■ self: normal attacks deal true damage for 10 sec                                [C4]
//
// INERT / UNENACTABLE lines (no assertions; carried VERBATIM in the override's `unmodeled`):
//   U1 the projectile-damage line — v1 fields a single partless boss that fires NO projectiles,
//      so there is no enemy projectile to attack and no projectile-interception model to feed;
//      out-of-domain by world-model, inert in every comp the sim can field.
//   U2 the stage-1 debuff immunity — v1 models no ally debuff list (the boss applies nothing to
//      allies), so no immunity can be enacted; claire's "Removes 1 debuff(s)" precedent.
//
// Encoding shape (see src/skills/overrides/clay.json):
//   C1 = shotFired + fbGate:'inFb' + everyN:60 → allies trueDamagePct 6.45 / maxStacks:3 /
//        durationSec:6. The soda precedent (sim.ts applyBlock): abort-gates are evaluated BEFORE
//        the everyN activation counter, so OUT-of-FB shots never advance the 60-count — exactly
//        "60 normal attacks during Full Burst" ("landing" == firing; v1 has no miss model). A
//        hitCount{count:60} trigger would be WRONG: its counter accrues and is consumed by
//        out-of-FB shots too (sim.ts firePull), silently burning the count.
//   C2 = the SAME trigger re-declared on the skill2 slot → allies casterAtkPct 20.07 /
//        durationSec:6. Co-extensive construction for "only while in Victorious Battle Cry
//        status" (the engine has no self-status channel — eunhwa-tu/frima precedent): the ATK
//        buff applies on exactly the events that grant Cry stacks and carries the same 6s
//        refresh window, so its uptime is IDENTICAL to Cry presence ([first trigger, last
//        trigger + 6s] under both the engine's instance-refresh expiry and a per-stack expiry
//        reading — Cry presence = any-stack-alive in both). casterAtkPct resolves to
//        (20.07/100)×clay.staticAtk flat ATK per ally (sim.ts applyEffect), exactly "20.07% of
//        the skill user's ATK"; "continuously" = held across the status window, not a frame-0
//        permanent (the nearest-wrong reading, discriminated below).
//   C3 = burstCast → allies trueDamagePct 12.56 / durationSec:10.
//   C4 = burstCast → self weaponSwap {damagePct:10.12, trueNormals:true, durationSec:10} — the
//        frima/takina same-weapon FLAVOR swap: damagePct = her own normal multiplier, so swap
//        shots deal EXACTLY her normal damage (baseMult = swap.damagePct ?? normalAttackMultiplier,
//        sim.ts firePull) and only the FLAVOR changes; the trueNormals window is the burst's
//        "normal attacks deal true damage" state. No free reload on a flavor swap (kit grants
//        none; sim.ts weaponSwap case).
//
// The payoff structure: trueDamagePct is FLAVOR-GATED (sim.ts dmgUp bucket), so the team True
// Damage buffs (C1 stacks, C3) pay ONLY on true-flavored hits — clay's own normals during her
// C4 swap windows and ada's true-flavored grenade DoT. liter (RL, plain) and helm (SR, plain —
// her own team trueDamagePct grant is flavor-gated inert on herself) deal NO true damage and
// are the byte-exact negative controls for the true lines. The C2 ATK grant is NOT flavor-gated
// (flat ATK moves everyone).
//
// Why each assertion discriminates:
//   C1  nearest-wrong triggers: (a) fbGate stripped — out-of-FB shots count, so Cry applies
//       OUTSIDE every FB window and far earlier than the 60th in-FB shot; (b) everyN:1 — Cry
//       on the 1st in-FB shot. The 60-count is pinned by first-application frame == the 60th
//       in-FB shot's frame; recurrence + the 3-stack/6s shape by the application stream across
//       ≥3 FB windows; the value of stacking by the maxStacks:1 counterfactual (less team true
//       damage → ada and clay totals drop).
//   C2  nearest-wrong is a frame-0 always-on passive ("continuously" misread as whole-fight).
//       Pinned by: first application frame == first Cry application frame (NOT 0), the
//       application frame set equalling the Cry frame set (co-extensive), 6s expiry, all-ally
//       targeting, and the passive counterfactual strictly over-crediting every ally's total.
//   C3  cast-keyed: application frame set == burstCast frame set, all-ally scope, 10s expiry;
//       the self-only counterfactual leaves ada at the removed-line level.
//   C4  the swap is a FLAVOR-only change: every clay normal instance reads atkPct 10.12 (her
//       base multiplier — bandSg.dmg 1 for non-SG) in AND out of the window; the flavor flip is
//       pinned by the removal delta on her own total AND by a per-instance dmgUp diff against a
//       no-true-buff reference: instances with a live trueDamagePct contribution occur EXACTLY
//       inside [cast, cast+10s] windows and throughout each one (the burst's own 12.56 covers
//       the whole window). The doubled-multiplier counterfactual proves the shipped swap keeps
//       her base multiplier.
//
// Fixture: liter (B1, 20s) / clay (B2, 40s — SOLE B2, so every chain waits on her and she
// casts every Full Burst) / ada (B3, 40s — the true CONSUMER: S2 420%-ATK true-flavored grenade
// DoT on FB entry and on cast) / helm (B3, 40s — byte-exact no-true control; alternates B3 with
// ada). Boss NEUTRAL (null — no elemental majors anywhere). Clay's 40s CD gates the rotation,
// so FB period ≈ 40s and ≥3 windows fit in the 180s basis. Deterministic (no seed). Slot order:
// liter 0 / clay 1 / ada 2 / helm 3.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const CLAY = 1;
const N_ALLIES = 4; // liter/clay/ada/helm — `allies` includes self
const CRY = 6.45;
const ATK_LINE = 20.07;
const BURST_TRUE = 12.56;
const NORMAL_MULT = 10.12;

const clayComp: { slugs: string[]; bossElement: null } = {
  slugs: ['liter', 'clay', 'ada', 'helm'],
  bossElement: null,
};

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...clayComp,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res, totals: totals(res), fullBursts: res.fullBursts };
}

// ---- counterfactual / reference patches -------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
const hasKind = (b: any, kind: string) =>
  b.effects.some((e: any) => e.kind === kind);

/** The skill1 Battle Cry block (the sole skill1 block). Throws if the shape drifted. */
function cryBlock(ov: any): any {
  const b = (ov.skill1 ?? []).find((x: any) => hasStat(x, 'trueDamagePct'));
  if (!b || b.trigger.kind !== 'shotFired' || b.everyN !== 60 || !b.fbGate) {
    throw new Error('clay skill1 Battle Cry block missing/altered — stale');
  }
  return b;
}

/** C1 reference: the Battle Cry line removed entirely. */
const noS1Cry = withPatchedOverride('clay', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'trueDamagePct'));
  if (ov.skill1.length === before) {
    throw new Error('clay skill1 Battle Cry block missing — stale');
  }
});
/** C1 counterfactual: the counter also accrues OUT of Full Burst (fbGate stripped). */
const s1NoFbGate = withPatchedOverride('clay', (ov) => {
  delete cryBlock(ov).fbGate;
});
/** C1 counterfactual: Cry on EVERY in-FB shot (the 60-count dropped). */
const s1EveryN1 = withPatchedOverride('clay', (ov) => {
  cryBlock(ov).everyN = 1;
});
/** C1 counterfactual: no stacking (one Cry stack instead of up to 3). */
const s1MaxStacks1 = withPatchedOverride('clay', (ov) => {
  const e = cryBlock(ov).effects.find((x: any) => x.stat === 'trueDamagePct');
  e.maxStacks = 1;
});
/** C2 reference: the ATK-of-clay line removed (skill2 block). */
const noS2Atk = withPatchedOverride('clay', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'casterAtkPct'));
  if (ov.skill2.length === before) {
    throw new Error('clay skill2 ATK block missing — stale');
  }
});
/** C2 counterfactual: "continuously" misread as a frame-0 always-on passive (the Cry gate,
 *  the 60-count and the 6s window all dropped). */
const s2Passive = withPatchedOverride('clay', (ov) => {
  const b = (ov.skill2 ?? []).find((x: any) => hasStat(x, 'casterAtkPct'));
  if (!b) {
    throw new Error('clay skill2 ATK block missing — stale');
  }
  b.trigger = { kind: 'passive' };
  delete b.fbGate;
  delete b.everyN;
  for (const e of b.effects) {
    delete e.durationSec;
  }
});
/** C3 reference: the burst's 12.56 team True Damage line removed. */
const noBurstTrue = withPatchedOverride('clay', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'trueDamagePct'));
  if (ov.burst.length === before) {
    throw new Error('clay burst trueDamagePct block missing — stale');
  }
});
/** C3 counterfactual: the 12.56 line scoped to self only (not all allies). */
const burstTrueSelfOnly = withPatchedOverride('clay', (ov) => {
  const b = ov.burst.find((x: any) => hasStat(x, 'trueDamagePct'));
  if (!b) {
    throw new Error('clay burst trueDamagePct block missing — stale');
  }
  b.target = { kind: 'self' };
});
/** C4 reference: the self true-normals line removed entirely (the frima noWakeUp reference).
 *  NOTE: stripping only the trueNormals FLAG would turn the effect into a REAL weapon swap,
 *  which the engine loads with a fresh magazine (free refill) — a counterfactual artifact that
 *  can outweigh the flavor payoff depending on cast timing. Removing the line is the faithful
 *  "burst without its self conversion" model, and its delta is exactly the flavor payoff. */
const noTrueNormals = withPatchedOverride('clay', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasKind(b, 'weaponSwap'));
  if (ov.burst.length === before) {
    throw new Error('clay burst trueNormals swap missing — stale');
  }
});
/** C4 counterfactual: the swap doubles her normal multiplier (a damage change, not flavor). */
const swapDoubleDmg = withPatchedOverride('clay', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'weaponSwap');
  if (!e) {
    throw new Error('clay burst weaponSwap effect missing — stale');
  }
  e.damagePct = 2 * NORMAL_MULT;
});
/** Reference: EVERY team True Damage line removed (C1 stacks + C3), C2/C4 kept — so clay's
 *  normal shot stream is timing-identical to base and per-instance dmgUp diffs isolate the
 *  true-flavor payoff inside the swap windows. */
const noAllTrue = withPatchedOverride('clay', (ov) => {
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'trueDamagePct'));
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'trueDamagePct'));
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const runNoCry = run({ clay: noS1Cry });
const runNoFbGate = run({ clay: s1NoFbGate });
const runEveryN1 = run({ clay: s1EveryN1 });
const runMaxStacks1 = run({ clay: s1MaxStacks1 });
const runNoS2Atk = run({ clay: noS2Atk });
const runS2Passive = run({ clay: s2Passive });
const runNoBurstTrue = run({ clay: noBurstTrue });
const runBurstSelf = run({ clay: burstTrueSelfOnly });
const runNoTrueNormals = run({ clay: noTrueNormals });
const runSwapDouble = run({ clay: swapDoubleDmg });
const runNoAllTrue = run({ clay: noAllTrue });

// ---- readers ----------------------------------------------------------------------------------
type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

const clayShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'clay');
const fbWindows = (evs: SimEvent[]) =>
  evs
    .filter((e): e is FbStart => e.kind === 'fullBurstStart')
    .map((e) => ({ start: e.frame, end: e.endFrame }));
const inFb = (wins: { start: number; end: number }[], frame: number) =>
  wins.some((w) => frame >= w.start && frame < w.end);
const inFbShots = (evs: SimEvent[]) => {
  const wins = fbWindows(evs);
  return clayShots(evs).filter((s) => inFb(wins, s.frame));
};
const clayCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'clay'
  );
const clayNormals = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'clay' && e.bucket === 'normal'
  );
/** clay's own applications of one stat at one magnitude (one event per holder per apply). */
const applies = (evs: SimEvent[], stat: string, value?: number) =>
  evs.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' &&
      e.casterIdx === CLAY &&
      e.stat === stat &&
      (value === undefined || e.value === value)
  );
const cryApplies = (evs: SimEvent[]) => applies(evs, 'trueDamagePct', CRY);
const atkApplies = (evs: SimEvent[]) => applies(evs, 'casterAtkPct');
const burstTrueApplies = (evs: SimEvent[]) =>
  applies(evs, 'trueDamagePct', BURST_TRUE);

describe('clay — kit spec', () => {
  describe('premise — the fixture produces Full Bursts clay casts', () => {
    it('≥3 Full Burst windows and clay casts every one of them (sole B2)', () => {
      expect(base.fullBursts).toBeGreaterThanOrEqual(3);
      expect(clayCasts(base.events).length).toBeGreaterThanOrEqual(3);
      expect(clayShots(base.events).length).toBeGreaterThan(500);
      expect(inFbShots(base.events).length).toBeGreaterThan(180);
    });
  });

  describe('C1 — S1: every 60th normal attack DURING Full Burst → all allies gain a Battle Cry true-damage stack (3 max, 6s)', () => {
    const cry = cryApplies(base.events);
    const wins = fbWindows(base.events);
    const fbShots = inFbShots(base.events);

    it('first activates on the 60th in-Full-Burst shot, not before', () => {
      expect(fbShots.length).toBeGreaterThan(61);
      const first = Math.min(...cry.map((b) => b.frame));
      expect(first).toBeGreaterThanOrEqual(fbShots[59].frame);
      expect(first).toBeLessThanOrEqual(fbShots[60].frame);
    });

    it('DISCRIMINATING: without the fbGate, Cry applies OUTSIDE Full Burst windows too', () => {
      const ungated = cryApplies(runNoFbGate.events);
      const winsU = fbWindows(runNoFbGate.events);
      expect(ungated.length).toBeGreaterThan(0);
      expect(
        ungated.some((b) => !inFb(winsU, b.frame)),
        'every gated-out application should sit in an FB window'
      ).toBe(true);
    });

    it('DISCRIMINATING: everyN:1 would fire Cry on the 1st in-FB shot', () => {
      const c1 = cryApplies(runEveryN1.events);
      const fbShots1 = inFbShots(runEveryN1.events);
      const firstC1 = Math.min(...c1.map((b) => b.frame));
      expect(firstC1).toBeLessThan(fbShots1[59].frame);
      expect(firstC1).toBeLessThanOrEqual(fbShots1[0].frame);
    });

    it('is 6.45% per stack, maxStacks 3, with a 6-sec expiry on every application', () => {
      expect(cry.length).toBeGreaterThan(0);
      for (const b of cry) {
        expect(b.value).toBe(CRY);
        expect(b.maxStacks).toBe(3);
        expect(b.expiresFrame! - b.frame).toBe(6 * FPS);
      }
      expect(Math.max(...cry.map((b) => b.stacks))).toBe(3);
    });

    it('recurs across ≥3 Full Burst windows (the counter rebuilds every window)', () => {
      const windowsHit = new Set(
        cry.map((b) =>
          wins.findIndex((w) => b.frame >= w.start && b.frame < w.end)
        )
      );
      windowsHit.delete(-1);
      expect(windowsHit.size).toBeGreaterThanOrEqual(3);
    });

    it('reaches all four allies on every application frame', () => {
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of cry) {
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

    it('moves the true-damage consumers (ada + clay herself) and NOT the no-true controls', () => {
      expect(base.totals.ada).toBeGreaterThan(runNoCry.totals.ada);
      expect(base.totals.clay).toBeGreaterThan(runNoCry.totals.clay);
      // liter and helm deal no true-flavored damage: the flavor gate makes both byte-exact.
      expect(base.totals.liter).toBe(runNoCry.totals.liter);
      expect(base.totals.helm).toBe(runNoCry.totals.helm);
    });

    it('DISCRIMINATING: maxStacks 1 would under-credit the team True Damage', () => {
      expect(base.totals.ada).toBeGreaterThan(runMaxStacks1.totals.ada);
      expect(base.totals.clay).toBeGreaterThan(runMaxStacks1.totals.clay);
    });
  });

  describe('C2 — S2: while in Battle Cry, all allies gain 20.07% of clay ATK (co-extensive, 6s)', () => {
    const atk = atkApplies(base.events);
    const cry = cryApplies(base.events);

    it('first applies on the first Battle Cry trigger frame — NOT at battle start', () => {
      expect(atk.length).toBeGreaterThan(0);
      const firstAtk = Math.min(...atk.map((b) => b.frame));
      const firstCry = Math.min(...cry.map((b) => b.frame));
      expect(firstAtk).toBe(firstCry);
      expect(firstAtk).toBeGreaterThan(0);
    });

    it('fires on exactly the Battle Cry trigger frames (co-extensive with the Cry status)', () => {
      const atkFrames = atk.map((b) => b.frame).sort((a, z) => a - z);
      const cryFrames = cry.map((b) => b.frame).sort((a, z) => a - z);
      expect(atkFrames).toEqual(cryFrames);
    });

    it('is a FLAT grant of exactly 20.07% of clay static ATK (casterAtkPct, not atkPct), 6-sec expiry, all four allies', () => {
      const clayAtk = unitOf(base.res, 'clay').staticAtk;
      const expectedFlat = (ATK_LINE / 100) * clayAtk;
      for (const b of atk) {
        // the emitted value is the resolved flat ATK — NOT the raw 20.07 (the atkPct misread),
        // and NOT scaled by each holder's own ATK.
        expect(b.value).toBeCloseTo(expectedFlat, 6);
        expect(b.expiresFrame! - b.frame).toBe(6 * FPS);
      }
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of atk) {
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      }
      for (const holders of perFrame.values()) {
        expect(holders.size).toBe(N_ALLIES);
      }
    });

    it('is load-bearing on EVERY ally total (flat ATK is not flavor-gated)', () => {
      for (const slug of ['liter', 'clay', 'ada', 'helm']) {
        expect(
          base.totals[slug],
          `${slug} total must drop without the ATK line`
        ).toBeGreaterThan(runNoS2Atk.totals[slug]);
      }
    });

    it('DISCRIMINATING: an always-on passive would over-credit every ally (Cry has downtime)', () => {
      const passive = atkApplies(runS2Passive.events);
      expect(Math.min(...passive.map((b) => b.frame))).toBe(0);
      expect(
        runS2Passive.totals.liter,
        'whole-fight ATK > Cry-windowed ATK'
      ).toBeGreaterThan(base.totals.liter);
      expect(runS2Passive.totals.helm).toBeGreaterThan(base.totals.helm);
    });
  });

  describe('C3 — burst: True Damage ▲12.56% to all allies for 10 sec per cast', () => {
    const b12 = burstTrueApplies(base.events);
    const castFrames = clayCasts(base.events).map((c) => c.frame);

    it('applies exactly on the cast frames, to all four allies, with a 10-sec expiry', () => {
      expect(castFrames.length).toBeGreaterThanOrEqual(3);
      const appliedFrames = [...new Set(b12.map((b) => b.frame))].sort(
        (a, z) => a - z
      );
      expect(appliedFrames).toEqual([...castFrames].sort((a, z) => a - z));
      expect(b12.length).toBe(castFrames.length * N_ALLIES);
      for (const b of b12) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('moves the true-damage consumers and NOT the no-true controls', () => {
      expect(base.totals.ada).toBeGreaterThan(runNoBurstTrue.totals.ada);
      expect(base.totals.clay).toBeGreaterThan(runNoBurstTrue.totals.clay);
      expect(base.totals.liter).toBe(runNoBurstTrue.totals.liter);
      expect(base.totals.helm).toBe(runNoBurstTrue.totals.helm);
    });

    it('DISCRIMINATING: self-scoped, ada would get nothing from this line', () => {
      expect(base.totals.ada).toBeGreaterThan(runBurstSelf.totals.ada);
      // self-only and fully-removed are identical FOR ADA (neither reaches her).
      expect(runBurstSelf.totals.ada).toBe(runNoBurstTrue.totals.ada);
    });
  });

  describe('C4 — burst: clay normals deal TRUE damage for 10 sec (flavor-only swap)', () => {
    const casts = clayCasts(base.events);

    it('never changes her normal multiplier — every normal instance reads the base 10.12', () => {
      const normals = clayNormals(base.events);
      expect(normals.length).toBeGreaterThan(500);
      for (const d of normals) {
        expect(d.atkPct).toBeCloseTo(NORMAL_MULT, 10);
      }
    });

    it('the flavor flip is load-bearing on her OWN total (true stack pays on her normals)', () => {
      expect(base.totals.clay).toBeGreaterThan(runNoTrueNormals.totals.clay);
    });

    it('the true bucket pays EXACTLY inside the 10s post-cast windows and throughout them', () => {
      const baseN = clayNormals(base.events);
      const noTrueN = clayNormals(runNoAllTrue.events);
      // Buff removal changes no ATK/timing/gauge → the shot streams are identical.
      expect(noTrueN.length).toBe(baseN.length);
      const diffFrames: number[] = [];
      for (let i = 0; i < baseN.length; i++) {
        expect(baseN[i].frame).toBe(noTrueN[i].frame);
        expect(baseN[i].mult.dmgUp).toBeGreaterThanOrEqual(
          noTrueN[i].mult.dmgUp
        );
        if (baseN[i].mult.dmgUp > noTrueN[i].mult.dmgUp) {
          diffFrames.push(baseN[i].frame);
        }
      }
      expect(diffFrames.length).toBeGreaterThan(0);
      // every payoff instance sits inside a [cast, cast+10s] swap window…
      const windows = casts.map((c) => ({
        start: c.frame,
        end: c.frame + 10 * FPS,
      }));
      for (const f of diffFrames) {
        expect(
          windows.some((w) => f >= w.start && f < w.end),
          `true-payoff normal at f${f} lies outside every swap window`
        ).toBe(true);
      }
      // …and each full window carries payoff to its tail (the swap really lasts 10s and the
      // burst's own 12.56 covers the whole window).
      for (const c of casts) {
        if (c.frame + 10 * FPS > 179 * FPS) {
          continue;
        } // window clipped by fight end
        expect(
          diffFrames.some(
            (f) => f >= c.frame + 8 * FPS && f < c.frame + 10 * FPS
          ),
          `no payoff normals in the last 2s of the swap window opening at f${c.frame}`
        ).toBe(true);
      }
    });

    it('DISCRIMINATING: a doubled swap multiplier would raise her normal damage (shipped swap is flavor-only)', () => {
      expect(runSwapDouble.totals.clay).toBeGreaterThan(base.totals.clay);
      const doubled = clayNormals(runSwapDouble.events).some(
        (d) => Math.abs(d.atkPct - 2 * NORMAL_MULT) < 1e-9
      );
      expect(doubled).toBe(true);
    });
  });

  describe('U — unmodeled lines live VERBATIM in the override (no silent drops, no ignored blocks)', () => {
    const ov: any = loadOverride('clay');

    it('carries the projectile line under skill1 and the debuff-immunity line under skill2', () => {
      expect(ov.unmodeled.skill1).toContain(
        'When attacking an enemy projectile, damage to that projectile ▲ 45.05% for 6 sec.'
      );
      expect(
        ov.unmodeled.skill2.some((s: string) =>
          s.includes('Gains debuff immunity to 1 debuff(s) for 10 sec.')
        )
      ).toBe(true);
    });

    it('has no `ignored` effect blocks anywhere', () => {
      const blocks = [
        ...(ov.skill1 ?? []),
        ...(ov.skill2 ?? []),
        ...(ov.burst ?? []),
      ];
      for (const b of blocks) {
        for (const e of b.effects) {
          expect(e.kind).not.toBe('ignored');
          expect(e.kind).not.toBe('unsupported');
        }
      }
    });
  });
});
