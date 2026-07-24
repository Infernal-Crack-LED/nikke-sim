// PER-UNIT KIT SPEC — `privaty` (Privaty, Attacker/AR/Water, Burst III, cd 40s, ammo 60,
// chargeFrames 0, hitsPerShot 1, treasure). S5 BLIND post-op test: written from the kit PROSE
// ALONE (data/characters.json → characters.privaty.skills), blind to the driver's override + test.
// A judge runs this file, unmodified, against the driver's shipped override; GREEN = the driver's
// encoding converges with the prose reading, any RED = a divergence for the judge to classify.
//
// Kit (blablalink prose; quotes trimmed ≤40 chars, clinical):
//   S1 ■ entering Full Burst → all allies, each 10 sec:
//        ATK ▲ 23.61%                              [P1: atkPct]
//        Reload Speed ▲ 51.16%                     [P2: reloadSpeedPct]
//        Max Ammunition Capacity ▼ 50.66%          [P3: maxAmmoPct  (halves magazines)]
//        Attack Damage ▲ 20.16%                    [P4: attackDamagePct (Damage-Up bucket)]
//   S2 ■ last bullet hits the target → the target:
//        Damage Taken ▲ 10.01% for 10 sec          [P5: damageTakenPct — BOSS debuff, team-wide]
//        256.17% of final ATK additional damage    [P6: flatDamage 256.17, lastBullet]
//      ■ last bullet hits a target in Designated Target status → the target:
//        1687% of final ATK additional damage      [P7: flatDamage 1687, lastBullet, GATED on status]
//   BU ■ self: Elemental Advantage Attack Damage ▲ 130% for 10 sec   [P8: elemAdvantageDamagePct]
//      ■ all enemies: 1407.64% of final ATK as Burst Skill damage    [P9: flatDamage 1407.64, burst]
//                   Stuns for 3 sec                                [P10: stun — inert in v1]
//                   Designated Target: ATK ▼ 5.02% for 10 sec        [P11: status (gates P7) + inert ATK▼]
//
// Fixture: the 720-kit-audit control comp controlComp('privaty', true) = liter(B1) / crown(B2) /
//   privaty(B3, focus) / helm(B3), boss Fire, deterministic (no seed). Slot indices:
//   liter=0 crown=1 privaty=2 helm=3. Water > Fire on the element wheel (game-mechanics §10:
//   Fire→Wind→Iron→Electric→Water→Fire), so privaty HAS elemental advantage on this boss — that is
//   what makes P8 live. A lone B3 makes ZERO Full Bursts, so the B1/B2 core is required for any
//   burst-gated line (P8/P9/P11) to fire at all.
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong model gates
// nothing; counterfactuals are built with withPatchedOverride and, because we are BLIND to the
// driver's exact block layout, are wrapped in tryPatch so an unfindable target SKIPS the proof
// gracefully instead of crashing the file at import — the PRIMARY assertion against the shipped
// override always runs):
//   P1-P4 trigger: "entering Full Burst" = fullBurstEnter (EVERY team FB, incl. helm-completed FBs),
//     never burstCast (privaty's own casts only). Proven by apply-frame count == #fullBurstStart
//     and > #privaty-casts (fixture guard: helm completes some FBs, so the two are separable).
//   P1-P4 duration: "for 10 sec" = durationSec 600 frames, NEVER durationShots (a round-count model
//     carries durationShots and a null expiresFrame).
//   P1-P4 scope: "all allies" includes self → targetIdx set {0,1,2,3} per frame (an exclude-self
//     model drops index 2).
//   P3 mechanical: maxAmmo▼ halves magazines during FB → MORE last bullets → MORE P6 riders; removing
//     only maxAmmoPct lowers the rider count. This also discriminates P6's trigger as magazine-coupled
//     lastBullet (a hitCount:60 model is ~unaffected by maxAmmo▼).
//   P5 target: "Affects the target" = the BOSS (targetIdx null) — a team-wide taken debuff, not a
//     self/ally buff. Mechanically feeds mult.taken team-wide (more high-taken hits than S2-removed).
//   P6 trigger: "last bullet hits" = lastBullet (once per magazine), far fewer than per-shot; a
//     shotFired model lands near the shot count (fails < shots/3).
//   P7 gate: the 1687 rider fires ONLY on last bullets inside a Designated-Target window (opened by
//     privaty's burst, ~10s). Non-vacuity: fixture must exercise BOTH active (≥1 gated rider) and
//     inactive (≥1 ungated last bullet outside every window). Gated subset ⇒ count1687 < count256,
//     and every gated rider lands within ~10s of a privaty cast; dropping the gate fires it on EVERY
//     last bullet. This simultaneously verifies P11's status (applied by the burst, correctly named,
//     ~10s, re-applied per cast).
//   P8 identity: "Elemental Advantage Attack Damage" = elemAdvantageDamagePct (Damage-Up bucket,
//     active ONLY with advantage), NOT a generic attackDamagePct. Proven on a NEUTRAL-boss variant:
//     the faithful buff is damage-INERT (totals byte-identical with it removed) while a generic
//     attackDamagePct would still move damage. On the Fire boss it is LIVE (removing it lowers damage).
//     Trigger = burstCast (self mode in her OWN burst block) → count == #privaty-casts < #FB.
//   P9 timing: a burst CAST lands BEFORE the Full Burst window opens, so the nuke never takes the
//     +50% FB major (fbMajorApplied false; engine convention, cf. helm H7).
//   P10/P11b: stun on a non-acting partless boss and ATK▼ on the boss have NO damage observable in v1
//     (boss deals no damage; boss ATK feeds nothing) → it.skip (UNMODELED/inert). The load-bearing
//     part of P11 is the Designated-Target STATUS, asserted through P7.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import type { OverrideFile } from '../../../src/skills/index.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
  type CompOptions,
} from '../../tests/lib/harness.js';

const FPS = 60;
/** controlComp('privaty', true) slot order: liter 0 / crown 1 / privaty 2 / helm 3. */
const PRIVATY = 2;
const ALL_ALLIES = [0, 1, 2, 3];

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type Reload = Extract<SimEvent, { kind: 'reload' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FBStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}, comp: Partial<CompOptions> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('privaty', true),
    ...comp,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res), res };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
/** Defensive patch: returns undefined if the target structure is absent from the shipped override,
 *  so a counterfactual PROOF skips instead of crashing the whole file at import (we are blind to the
 *  driver's exact block layout). The primary assertion against the shipped override always runs. */
function tryPatch(slug: string, mutate: (ov: any) => void): OverrideFile | undefined {
  try {
    return withPatchedOverride(slug, mutate);
  } catch {
    return undefined;
  }
}
const requireFound = (found: boolean, msg: string) => {
  if (!found) throw new Error(msg);
};

/** P1-P4 reference: S1 removed entirely (robust — empty the slot, structure-independent). */
const noS1Ov = withPatchedOverride('privaty', (ov) => {
  ov.skill1 = [];
});
/** P5-P7 reference: S2 removed entirely. */
const noS2Ov = withPatchedOverride('privaty', (ov) => {
  ov.skill2 = [];
});
/** P8 reference: remove only the self elemAdvantage buff from the burst. */
const noBurstSelfOv = tryPatch('privaty', (ov) => {
  let found = false;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.stat !== 'elemAdvantageDamagePct');
    if (b.effects.length !== before) found = true;
  }
  ov.burst = ov.burst.filter((b: any) => b.effects.length > 0);
  requireFound(found, 'burst elemAdvantageDamagePct not found');
});
/** P8 counterfactual: re-type the self buff as a GENERIC Damage-Up (attackDamagePct). */
const elemAsAttackOv = tryPatch('privaty', (ov) => {
  let found = false;
  for (const b of ov.burst)
    for (const e of b.effects)
      if (e.stat === 'elemAdvantageDamagePct') {
        e.stat = 'attackDamagePct';
        found = true;
      }
  requireFound(found, 'burst elemAdvantageDamagePct not found');
});
/** P1-P4 trigger counterfactual: fullBurstEnter → burstCast (privaty's own casts only). */
const s1BurstCastOv = tryPatch('privaty', (ov) => {
  let found = false;
  for (const b of ov.skill1)
    if (b.trigger?.kind === 'fullBurstEnter') {
      b.trigger = { kind: 'burstCast' };
      found = true;
    }
  requireFound(found, 'no fullBurstEnter trigger in skill1');
});
/** P6 trigger counterfactual: lastBullet → shotFired (every trigger pull). */
const s2ShotFiredOv = tryPatch('privaty', (ov) => {
  let found = false;
  for (const b of ov.skill2)
    if (b.trigger?.kind === 'lastBullet') {
      b.trigger = { kind: 'shotFired' };
      found = true;
    }
  requireFound(found, 'no lastBullet trigger in skill2');
});
/** P7 gate counterfactual: drop the Designated-Target status gate (fires every last bullet). */
const s2UngatedOv = tryPatch('privaty', (ov) => {
  let found = false;
  for (const b of ov.skill2)
    if (b.requiresTargetStatus) {
      delete b.requiresTargetStatus;
      found = true;
    }
  requireFound(found, 'no requiresTargetStatus gate in skill2');
});
/** P3 isolation: remove only the maxAmmo▼ effect from S1. */
const noMaxAmmoOv = tryPatch('privaty', (ov) => {
  let found = false;
  for (const b of ov.skill1) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.stat !== 'maxAmmoPct');
    if (b.effects.length !== before) found = true;
  }
  ov.skill1 = ov.skill1.filter((b: any) => b.effects.length > 0);
  requireFound(found, 'skill1 maxAmmoPct not found');
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noS1 = run({ privaty: noS1Ov });
const noS2 = run({ privaty: noS2Ov });
const baseNeutral = run({}, { bossElement: null });
const noBurstSelf = noBurstSelfOv ? run({ privaty: noBurstSelfOv }) : null;
const noBurstSelfNeutral = noBurstSelfOv ? run({ privaty: noBurstSelfOv }, { bossElement: null }) : null;
const elemAsAttackNeutral = elemAsAttackOv ? run({ privaty: elemAsAttackOv }, { bossElement: null }) : null;
const s1BurstCast = s1BurstCastOv ? run({ privaty: s1BurstCastOv }) : null;
const s2ShotFired = s2ShotFiredOv ? run({ privaty: s2ShotFiredOv }) : null;
const s2Ungated = s2UngatedOv ? run({ privaty: s2UngatedOv }) : null;
const noMaxAmmo = noMaxAmmoOv ? run({ privaty: noMaxAmmoOv }) : null;

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const privDmg = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'privaty' && d.srcSlot === srcSlot);
const privBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === PRIVATY && b.stat === stat);
const shots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'privaty');
const reloads = (evs: SimEvent[]) =>
  evs.filter((e): e is Reload => e.kind === 'reload' && e.slug === 'privaty');
const privBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'privaty');
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FBStart => e.kind === 'fullBurstStart');
/** P6 ungated last-bullet rider (256.17%). */
const rider256 = (evs: SimEvent[]) =>
  privDmg(evs, 'skill2').filter((d) => Math.abs(d.atkPct - 256.17) < 0.01);
/** P7 Designated-Target-gated last-bullet rider (1687%). */
const rider1687 = (evs: SimEvent[]) =>
  privDmg(evs, 'skill2').filter((d) => Math.abs(d.atkPct - 1687) < 0.01);

/** Distinct application frames for a privaty-cast buff stat (one frame per trigger firing, even
 *  though an all-ally block emits one buffApply per holder). */
const applyFrames = (evs: SimEvent[], stat: string): number =>
  new Set(privBuffs(evs, stat).map((b) => b.frame)).size;

// ---- S1: four fullBurstEnter all-ally 10s buffs ----------------------------------------------
function s1Describe(stat: string, value: number, label: string) {
  describe(`S1 ${label} (${stat} ${value}%)`, () => {
    it(`applies ${value}% to all four allies, 10s wall-clock (not rounds), on every FB entry`, () => {
      const ap = privBuffs(base.events, stat);
      expect(ap.length, `no privaty ${stat} buff was applied`).toBeGreaterThan(0);
      expect([...new Set(ap.map((b) => b.value))]).toEqual([value]);
      // scope: all 4 allies (incl. self) per application frame
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of ap)
        (perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!).add(b.targetIdx);
      for (const [, holders] of perFrame)
        expect([...holders].sort((a, b) => (a ?? 9) - (b ?? 9))).toEqual(ALL_ALLIES);
      // duration: 10s wall-clock, NOT a round count
      for (const b of ap) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
        expect(b.durationShots).toBeNull();
      }
      // trigger: fullBurstEnter → one application-frame per Full Burst
      expect(perFrame.size).toBe(fbStarts(base.events).length);
    });
  });
}
s1Describe('atkPct', 23.61, 'ATK ▲');
s1Describe('reloadSpeedPct', 51.16, 'Reload Speed ▲');
s1Describe('maxAmmoPct', -50.66, 'Max Ammunition ▼');
s1Describe('attackDamagePct', 20.16, 'Attack Damage ▲');

describe('S1 trigger — fullBurstEnter (every team FB), not burstCast (own casts only)', () => {
  it('FIXTURE NON-VACUITY: privaty casts >0 and helm completes some FBs (casts < total FBs)', () => {
    expect(privBursts(base.events).length).toBeGreaterThan(0);
    expect(privBursts(base.events).length).toBeLessThan(fbStarts(base.events).length);
  });
  it('applies on every FB frame (== #fullBurstStart), more than #privaty-casts', () => {
    const frames = applyFrames(base.events, 'atkPct');
    expect(frames).toBe(fbStarts(base.events).length);
    expect(frames).toBeGreaterThan(privBursts(base.events).length);
  });
  it.skipIf(!s1BurstCast)('DISCRIMINATING: a burstCast-keyed model applies on fewer frames', () => {
    expect(applyFrames(s1BurstCast!.events, 'atkPct')).toBeLessThan(applyFrames(base.events, 'atkPct'));
  });
});

describe('S1 mechanical — weapon-state modifiers are live', () => {
  it('removing S1 lowers privaty total damage', () => {
    expect(base.totals.privaty).toBeGreaterThan(noS1.totals.privaty);
  });
  it.skipIf(!noMaxAmmo)(
    'P3 maxAmmo▼ raises the last-bullet rate (more 256.17 riders than with it removed)',
    () => {
      expect(rider256(base.events).length).toBeGreaterThan(rider256(noMaxAmmo!.events).length);
    },
  );
});

// ---- S2: last-bullet boss debuff + two riders -------------------------------------------------
describe('S2 P5 — last-bullet Damage Taken ▲10.01% is a BOSS debuff (benefits whole team)', () => {
  const taken = privBuffs(base.events, 'damageTakenPct');
  it('is 10.01% on the boss (targetIdx null), 10s, on lastBullet cadence', () => {
    expect(taken.length, 'no privaty damageTakenPct debuff was applied').toBeGreaterThan(0);
    expect([...new Set(taken.map((b) => b.value))]).toEqual([10.01]);
    expect([...new Set(taken.map((b) => b.targetIdx))], 'Damage Taken must target the boss, not an ally').toEqual([null]);
    for (const b of taken) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    // same lastBullet cadence as the 256.17 rider (±1 for fight-end reload timing)
    expect(Math.abs(taken.length - rider256(base.events).length)).toBeLessThanOrEqual(2);
  });
  it('feeds the taken bucket team-wide (more high-taken hits than with S2 removed)', () => {
    const highTaken = (evs: SimEvent[]) => dmg(evs).filter((d) => d.mult.taken > 1.05).length;
    expect(highTaken(base.events)).toBeGreaterThan(highTaken(noS2.events));
  });
});

describe('S2 P6 — last-bullet rider deals 256.17% of final ATK (skill2 bucket)', () => {
  it('is the kit magnitude in the skill bucket, from skill2', () => {
    const r = rider256(base.events);
    expect(r.length).toBeGreaterThan(0);
    expect([...new Set(r.map((d) => d.atkPct))]).toEqual([256.17]);
    expect([...new Set(r.map((d) => d.bucket))]).toEqual(['skill']);
    expect([...new Set(r.map((d) => d.srcSlot))]).toEqual(['skill2']);
  });
  it('fires per magazine (lastBullet), far fewer than per-shot', () => {
    const r = rider256(base.events).length;
    const s = shots(base.events).length;
    expect(r).toBeGreaterThan(0);
    expect(r, `${r} riders vs ${s} shots — a shotFired model lands near the shot count`).toBeLessThan(s / 3);
  });
  it.skipIf(!s2ShotFired)('DISCRIMINATING: a shotFired model fires the rider on every pull', () => {
    expect(rider256(s2ShotFired!.events).length).toBeGreaterThan(rider256(base.events).length);
  });
});

describe('S2 P7 — gated rider: 1687% on last bullets hitting a Designated Target', () => {
  const r1687 = rider1687(base.events);
  const r256 = rider256(base.events);
  const castFrames = privBursts(base.events).map((c) => c.frame);
  const inWindow = (f: number) => castFrames.some((c) => f >= c - 30 && f <= c + 10 * FPS + 30);

  it('NON-VACUITY: fixture exercises BOTH the active and the inactive case', () => {
    expect(r1687.length, 'active case: no gated rider ever fired').toBeGreaterThan(0);
    expect(
      r256.filter((d) => !inWindow(d.frame)).length,
      'inactive case: every last bullet qualified — the gate is vacuous',
    ).toBeGreaterThan(0);
  });
  it('is a strict gated subset of last bullets (fewer than the ungated 256.17 rider)', () => {
    expect(r1687.length).toBeLessThan(r256.length);
    expect([...new Set(r1687.map((d) => d.atkPct))]).toEqual([1687]);
  });
  it('every gated rider lands inside a Designated-Target window (~10s after a privaty cast)', () => {
    for (const d of r1687)
      expect(inWindow(d.frame), `gated rider at ${d.sec.toFixed(2)}s is outside every cast window`).toBe(true);
  });
  it.skipIf(!s2Ungated)('DISCRIMINATING: dropping the gate fires 1687 on EVERY last bullet', () => {
    expect(rider1687(s2Ungated!.events).length).toBeGreaterThan(r1687.length);
  });
});

describe('Burst P11 — Designated-Target status (gates P7), applied per cast, ~10s', () => {
  it('the status is re-applied by each burst (gated riders span ≥2 distinct cast windows)', () => {
    const r1687 = rider1687(base.events);
    const castFrames = privBursts(base.events).map((c) => c.frame);
    const windowsHit = new Set(
      r1687.map((d) => castFrames.find((c) => d.frame >= c - 30 && d.frame <= c + 10 * FPS + 30)),
    );
    expect(windowsHit.size).toBeGreaterThanOrEqual(2);
  });
});

// ---- Burst: self elemental-advantage buff, AoE nuke, stun, status -----------------------------
describe('Burst P8 — self Elemental Advantage Attack Damage ▲130% (burstCast, self, 10s)', () => {
  const elemAdv = privBuffs(base.events, 'elemAdvantageDamagePct');
  it('is 130% self-scoped, once per privaty burst cast (burstCast, not fullBurstEnter), for 10s', () => {
    expect(elemAdv.length, 'no privaty elemAdvantageDamagePct buff was applied').toBeGreaterThan(0);
    expect([...new Set(elemAdv.map((b) => b.value))]).toEqual([130]);
    expect([...new Set(elemAdv.map((b) => b.targetIdx))], 'self-scoped').toEqual([PRIVATY]);
    for (const b of elemAdv) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    expect(elemAdv.length).toBe(privBursts(base.events).length);
    expect(elemAdv.length).toBeLessThan(fbStarts(base.events).length);
  });
  it.skipIf(!noBurstSelf)('is LIVE with advantage (Water>Fire): removing it lowers privaty damage', () => {
    expect(base.totals.privaty).toBeGreaterThan(noBurstSelf!.totals.privaty);
  });
  it.skipIf(!noBurstSelfNeutral)('is INERT without advantage (neutral boss): removing it changes nothing', () => {
    expect(baseNeutral.totals).toEqual(noBurstSelfNeutral!.totals);
  });
  it.skipIf(!elemAsAttackNeutral || !noBurstSelfNeutral)(
    'DISCRIMINATING: a generic attackDamagePct would still move damage on a neutral boss',
    () => {
      expect(elemAsAttackNeutral!.totals.privaty).toBeGreaterThan(noBurstSelfNeutral!.totals.privaty);
    },
  );
});

describe('Burst P9 — nuke: 1407.64% of final ATK, Burst Skill damage, FB-exempt', () => {
  const nukes = privDmg(base.events, 'burst').filter((d) => Math.abs(d.atkPct - 1407.64) < 0.01);
  it('fires once per privaty burst cast at the kit magnitude, in the burst bucket', () => {
    expect(nukes.length).toBe(privBursts(base.events).length);
    expect(nukes.length).toBeGreaterThan(0);
    expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([1407.64]);
    expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
  });
  it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
    expect(nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec)).toEqual([]);
  });
});

describe('Burst P10 — stun 3s', () => {
  it.skip('UNMODELED: stun on a non-acting partless boss has no damage observable in v1', () => {});
});

describe('Burst P11b — Designated Target: ATK ▼5.02% on the enemy', () => {
  it.skip(
    'UNMODELED/inert: boss ATK feeds no damage path in v1 (the load-bearing part is the Designated-Target STATUS, asserted via P7/P11)',
    () => {},
  );
});
