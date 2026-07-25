// PER-UNIT KIT SPEC — `chisato` (Chisato, Attacker/SMG/Iron, Burst III, cd 40s, ammo 120, reloadFrames 81,
// hitsPerShot 1, normalMult 10.12 / coreMult 250, critRate 15 / critDamage 150).
// Kit-autonomy gauntlet 2026-07-25 (driver-authored S2a; tests FIRST; reconciled vs blind S2b claude-fable-5).
//
// One assertion group per KIT LINE (C1..C6), asserted against the override loaded from disk.
// `withPatchedOverride` builds COUNTERFACTUALS only (the nearest-wrong reading each assertion must
// discriminate against) — never the encoding under test.
//
// Kit (data/characters.json → characters.chisato.skills, levels 10/10/10 — the normalized `skills` prose is the SSOT):
//   S1 ■ battle start → self: Charges Extrasensory to 100% (continuous, unremovable)                      [C1 bookkeeping]
//      ■ while in Extrasensory, by charge level (each gate triggers all below it):
//          at 100%: Dodging Bullets: Invulnerable 2 sec                                                   [C2 UNMODELED]
//          >70%: ATK ▲ 53.69% (continuous)                                                                [C1]
//          >55%: True Damage ▲ 48.62% (continuous)                                                        [C1]
//          >25%: Hit Rate ▲ 22.37% (continuous)                                                           [C1]
//      ■ every 2 sec → self: Extrasensory ▼ 1%                                                            [C1 bookkeeping]
//   S2 ■ on Burst Skill → self: Normal attacks deal true damage for 10 sec                                 [C3]
//      ■ after 48 normal attacks → the target: 472.18% of final ATK as true damage                        [C4]
//   BU ■ self: Charges Extrasensory to 100%                                                               [C6 fold]
//      ■ self: ATK ▲ 73.16% for 10 sec                                                                    [C5]
//
// EXTRASENSORY CURRENCY MODEL (why C1 is a fused-passive decay, not a modeled resource): the gauge is a
// battle-start-charged resource that DECAYS at 1%/2s (0.5%/s) and her OWN burst recharges it to 100%. From
// 100% the >70%/>55%/>25% gates cross their thresholds at t≈60s/90s/150s. The engine has no Extrasensory
// resource primitive, so the trajectory is encoded as FUSED PASSIVES (sim.ts:1786 — a passive buff honoring an
// explicit durationSec: live from frame 0, expires after durationSec) at 60/90/150s, PLUS a burstCast skill1
// block that re-applies all three (same buff keys → refresh) on each of her own casts (the recharge-to-100%).
// In a bursting comp (casts ~every 34s < the 60s ATK fuse) every gate stays permanently refreshed; in a
// never-burst comp the gates fall off at 60/90/150s. The literal charge/drain lines (battle-start charge,
// 1%/2s drain) are currency bookkeeping folded into this derivation → UNMODELED (inert: no damage observable).
//
// TRUE-DAMAGE ENGINE NOTE (⚑ engine-fidelity, NOT an override-encoding gotcha): the owner ruling "true damage
// cannot crit" (DECISIONS 2026-07-21) is documented as an engine `crit && !trueFlavor` guard, but NO such guard
// exists in sim.ts on this branch (git log -S '!opts.trueFlavor' is empty; the swap-normal path hardcodes
// crit:true at sim.ts:2843 and the flatDamage path uses crit:e.crit!==false at sim.ts:1844). Measured reality
// (open-questions.md:481 — "her true-damage-window normals RETAIN core+crit — MEASURED, faithful") and our probe
// agree: chisato's true swap normals AND her skill2 true rider are crit+core ELIGIBLE in the current engine.
// The override encodes the kit faithfully (trueNormals on the swap, flavor:'true' on the rider); whether true
// damage crits/cores is the ENGINE's domain. C3 pins the actual engine behaviour (crit/core ON) so a future
// engine guard is detected; the override note's "CRIT now OFF / engine crit&&!trueFlavor guard" and "swap mag
// refill" claims are STALE (sim.ts:1944/2487 — a trueNormals flavor swap does NOT refill the mag) and are
// corrected in the S3 note addendum. Core-on-true-damage remains ⚑ unverified in-game (SMG coreMult 250 lever).
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong gates nothing):
//   C1  the three gates are FUSED PASSIVES: live from frame 0, FINITE durations 60/90/150s, self-scoped, and
//       REFRESHED on her own burstCast. Nearest-wrong (a): a PERMANENT passive (strip durationSec → dur null) —
//       the prior encoding that OVER-credited never-burst comps. (b): NO refresh (drop the burstCast block) —
//       each gate fires once at frame 0 and expires at 60/90/150s; in this bursting comp her total DROPS because
//       the ATK 53.69 gate is up only the first 60s instead of ~100%. Frame-discriminated (frame-0 passive app
//       plus one app per cast frame).
//   C2  PIN (documented skip): "Invulnerable 2 sec" is boss-inert (the partless boss does nothing to her). The
//       S1 SLOT is active (it emits the C1 gates), so this is a specific within-slot skip. Assert: chisato's
//       self-buffs emit EXACTLY the three modeled stat families {atkPct, trueDamagePct, hitRatePct} and NO
//       shield/invuln/status effect — the documented skip is distinguished from a silent drop or a mis-encoding
//       of invulnerability as a damage stat.
//   C3  "Normal attacks deal true damage for 10 sec" on burstCast = same-weapon weaponSwap damagePct 10.12 (her
//       own normal mult, unchanged) + trueNormals:true for 10s (the takina precedent). trueNormals makes the
//       swap-window normals TRUE-flavored, which routes the permanent self trueDamagePct 48.62 (flavor-gated —
//       sim.ts:1414) into their Damage-Up bucket ONLY inside the [cast, +10s] window. Nearest-wrong (a): strip
//       the trueDamagePct buff (timing-stable — removes a stat, not the swap) → window normals lose the +0.4862
//       dmgUp while OUTSIDE-window normals are byte-identical (proves the gate is flavor-scoped, not global).
//       (b): trueNormals:false → window normals lose the true flavor → her total drops. Frame-paired: a normal is
//       elevated (true-flavored) IFF its frame falls in a [cast, +10s] window — proves the window is timed to
//       burstCast AND that trueNormals is the mechanism. [ENGINE ⚑ PIN: window normals stay crit+core-eligible.]
//   C4  "after 48 normal attacks → 472.18% of final ATK as true damage" = hitCount 48 → flatDamage atkPct 472.18,
//       flavor:'true'. Fires floor(normals/48)× over the fight; the true flavor routes trueDamagePct 48.62 into
//       its Damage-Up bucket. Nearest-wrong (a): hitCount 24 → ~2× riders. (b): plain flavor (delete flavor) →
//       rider loses trueDamagePct → strictly lower dmgUp.
//   C5  "ATK ▲ 73.16% for 10 sec" on burstCast (her OWN cast) = atkPct 73.16, dur 10s, self-scoped, once per cast
//       (NOT at frame 0 — that is the S1 53.69 gate, a distinct magnitude). Nearest-wrong (trigger):
//       fullBurstEnter → fires on FB-START frames (once per team Full Burst, ≠ her cast count, different frames).
//   C6  PIN (documented fold): the burst's "Charges Extrasensory to 100%" is folded into the C1 burstCast refresh
//       (the recharge-to-100% re-applies the three gates); the literal currency line is UNMODELED. Assert: the
//       burst SLOT emits EXACTLY {atkPct} (the 73.16) and NO resource/gauge effect — the fold is distinguished
//       from a silent drop or a mis-encoding of the recharge as a damage stat.
//
// Fixture: controlComp('chisato') = liter(B1) / crown(B2) / chisato(B3) / helm(B3), boss Fire (chisato Iron is
// neutral vs Fire — clean: no element major confounds the true-damage assertions), focus chisato. The control
// core makes the team complete Full Bursts so chisato actually CASTS (a lone B3 makes zero Full Bursts). Chisato
// is one of two B3s (with helm), so she casts ~6× over 180s while the team completes ~11 Full Bursts. Slot order:
// liter 0 / crown 1 / chisato 2 / helm 3. Deterministic (no seed → EV pass, byte-stable totals).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const CHI = 2; // controlComp slot order: liter 0 / crown 1 / chisato 2 / helm 3

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('chisato'),
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
const chiBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === CHI &&
      b.stat === stat &&
      (value === undefined || b.value === value),
  );
const targetsOf = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.targetIdx))].sort(
    (a, b) => (a ?? -1) - (b ?? -1),
  );
const dursOf = (bs: BuffApply[]) => [
  ...new Set(
    bs.map((b) => (b.expiresFrame == null ? null : b.expiresFrame - b.frame)),
  ),
];
const chiDamage = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'chisato');
const chiNormals = (evs: SimEvent[]) =>
  chiDamage(evs).filter((d) => d.bucket === 'normal');
const chiRiders = (evs: SimEvent[]) =>
  chiDamage(evs).filter((d) => d.srcSlot === 'skill2');
const chiCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'chisato',
  );
const castFrames = (evs: SimEvent[]) =>
  chiCasts(evs)
    .map((c) => c.frame)
    .sort((a, b) => a - b);
const fbStartFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame);
/** [castFrame, +10s) true-damage swap windows — half-open: the swap expires AT cast+10s, so a
 *  normal landing exactly on the +10s frame is already a regular (non-true) normal. */
const castWindows = (evs: SimEvent[]): [number, number][] =>
  chiCasts(evs).map((c) => [c.frame, c.frame + 10 * FPS]);
const inWindow = (frame: number, wins: [number, number][]) =>
  wins.some(([s, e]) => frame >= s && frame < e);

// ---- counterfactual patches (nearest-wrong readings) -----------------------------------------
/** C1 nearest-wrong (decay): strip durationSec from the S1 gates → permanent (dur null). */
const cfPermanent = withPatchedOverride('chisato', (ov: any) => {
  let n = 0;
  for (const b of ov.skill1)
    for (const e of b.effects)
      if (e.stat && e.durationSec != null) {
        delete e.durationSec;
        n++;
      }
  if (n === 0)
    throw new Error('chisato S1 durationSec missing — fixture is stale');
});
/** C1 nearest-wrong (refresh): drop the S1 burstCast refresh block → gates fire once at frame 0 only. */
const cfNoRefresh = withPatchedOverride('chisato', (ov: any) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => b.trigger?.kind !== 'burstCast');
  if (ov.skill1.length === before)
    throw new Error(
      'chisato S1 burstCast refresh block missing — fixture is stale',
    );
});
/** C3 isolation (flavor gate): strip the self trueDamagePct buff entirely (timing-stable — a stat, not the swap). */
const cfNoTrueDmg = withPatchedOverride('chisato', (ov: any) => {
  let removed = 0;
  for (const b of ov.skill1) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.stat !== 'trueDamagePct');
    removed += before - b.effects.length;
  }
  ov.skill1 = ov.skill1.filter((b: any) => b.effects.length > 0);
  if (removed === 0)
    throw new Error('chisato S1 trueDamagePct missing — fixture is stale');
});
/** C3 nearest-wrong (mechanism): trueNormals:true → false (window normals lose the true flavor). */
const cfNoTrueNormals = withPatchedOverride('chisato', (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'weaponSwap'),
  );
  if (!b)
    throw new Error('chisato S2 weaponSwap block missing — fixture is stale');
  b.effects.find((e: any) => e.kind === 'weaponSwap').trueNormals = false;
});
/** C4 nearest-wrong (count): hitCount 48 → 24 (~2× riders). */
const cfCount24 = withPatchedOverride('chisato', (ov: any) => {
  const b = ov.skill2.find((x: any) => x.trigger?.kind === 'hitCount');
  if (!b)
    throw new Error('chisato S2 hitCount block missing — fixture is stale');
  b.trigger.count = 24;
});
/** C4 nearest-wrong (flavor): the rider's flavor:'true' removed → loses trueDamagePct. */
const cfPlainRider = withPatchedOverride('chisato', (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'flatDamage'),
  );
  if (!b)
    throw new Error('chisato S2 flatDamage block missing — fixture is stale');
  delete b.effects.find((e: any) => e.kind === 'flatDamage').flavor;
});
/** C5 nearest-wrong (trigger): the burst ATK line keyed to fullBurstEnter (FB-START frames). */
const cfBurstFbEnter = withPatchedOverride('chisato', (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'atkPct'),
  );
  if (!b)
    throw new Error('chisato burst atkPct block missing — fixture is stale');
  b.trigger = { kind: 'fullBurstEnter' };
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const permanent = run({ chisato: cfPermanent });
const noRefresh = run({ chisato: cfNoRefresh });
const noTrueDmg = run({ chisato: cfNoTrueDmg });
const noTrueNormals = run({ chisato: cfNoTrueNormals });
const count24 = run({ chisato: cfCount24 });
const plainRider = run({ chisato: cfPlainRider });
const burstFbEnter = run({ chisato: cfBurstFbEnter });

const casts = chiCasts(base.events).length;
const fbs = fbStartFrames(base.events).length;
const wins = castWindows(base.events);

// Frame-paired normal dmgUp comparison (base vs the timing-stable no-trueDamage run). A normal is
// TRUE-flavored (elevated by the trueDamagePct 48.62 contribution) IFF its frame is in a swap window.
const baseNormalFrames = chiNormals(base.events).map((d) => d.frame);
const noTdNormalFrames = chiNormals(noTrueDmg.events).map((d) => d.frame);
const baseDuByFrame = new Map<number, number>();
for (const d of chiNormals(base.events))
  baseDuByFrame.set(d.frame, d.mult.dmgUp);
const noTdDuByFrame = new Map<number, number>();
for (const d of chiNormals(noTrueDmg.events))
  noTdDuByFrame.set(d.frame, d.mult.dmgUp);

describe('chisato — kit spec', () => {
  describe('fixture sanity — chisato casts her burst and the team reaches Full Burst', () => {
    it('chisato casts >0 bursts and the team completes >0 Full Bursts', () => {
      expect(casts).toBeGreaterThan(0);
      expect(fbs).toBeGreaterThan(0);
    });
    it('chisato cast frames are distinct from Full-Burst-start frames (a cast precedes the FB it opens)', () => {
      const cf = castFrames(base.events);
      const fs = fbStartFrames(base.events);
      expect(cf.every((f) => !fs.includes(f))).toBe(true);
    });
  });

  describe('C1 — S1 Extrasensory threshold gates are fused passives (frame-0 + finite dur + burstCast refresh)', () => {
    it('ATK 53.69 / True Damage 48.62 / Hit Rate 22.37 fire at frame 0, self-scoped, durations 60/90/150s', () => {
      const atk = chiBuffs(base.events, 'atkPct', 53.69);
      const td = chiBuffs(base.events, 'trueDamagePct', 48.62);
      const hr = chiBuffs(base.events, 'hitRatePct', 22.37);
      for (const bs of [atk, td, hr]) {
        expect(bs.length).toBeGreaterThan(0);
        expect(targetsOf(bs)).toEqual([CHI]); // self only
        expect(Math.min(...bs.map((b) => b.frame))).toBe(0); // live from battle start
      }
      expect(dursOf(atk)).toEqual([60 * FPS]);
      expect(dursOf(td)).toEqual([90 * FPS]);
      expect(dursOf(hr)).toEqual([150 * FPS]);
    });
    it('each gate REFRESHES on her own burstCast: count = 1 + #casts, non-frame-0 apps land on cast frames', () => {
      const cf = castFrames(base.events);
      for (const [stat, val] of [
        ['atkPct', 53.69],
        ['trueDamagePct', 48.62],
        ['hitRatePct', 22.37],
      ] as const) {
        const bs = chiBuffs(base.events, stat, val);
        expect(bs.length).toBe(1 + casts);
        expect(
          bs
            .filter((b) => b.frame !== 0)
            .map((b) => b.frame)
            .sort((a, b) => a - b),
        ).toEqual(cf);
      }
    });
    it('DISCRIMINATING (decay vs permanent): stripping durationSec makes the gates permanent (dur null)', () => {
      expect(dursOf(chiBuffs(permanent.events, 'atkPct', 53.69))).toEqual([
        null,
      ]);
      expect(dursOf(chiBuffs(base.events, 'atkPct', 53.69))).toEqual([
        60 * FPS,
      ]);
    });
    it('DISCRIMINATING (refresh is load-bearing): without the burstCast refresh the gates fire once and her total drops', () => {
      expect(chiBuffs(noRefresh.events, 'atkPct', 53.69).length).toBe(1); // frame 0 only
      expect(noRefresh.totals.chisato).toBeLessThan(base.totals.chisato);
    });
  });

  describe('C2 — S1 "Invulnerable 2 sec" (at 100%) is UNMODELED (boss-inert)', () => {
    it("PIN: chisato's self-buffs emit EXACTLY {atkPct, trueDamagePct, hitRatePct} and NO shield/invuln/status effect", () => {
      const stats = new Set(
        buffs(base.events)
          .filter((b) => b.casterIdx === CHI)
          .map((b) => b.stat),
      );
      expect([...stats].sort()).toEqual([
        'atkPct',
        'hitRatePct',
        'trueDamagePct',
      ]);
    });
  });

  describe('C3 — S2 "Normal attacks deal true damage for 10 sec" = burstCast same-weapon swap (trueNormals)', () => {
    it('swap-window normals exist, keep her normal multiplier (same-weapon swap, atkPct 10.12)', () => {
      const windowNormals = chiNormals(base.events).filter((d) =>
        inWindow(d.frame, wins),
      );
      expect(windowNormals.length).toBeGreaterThan(0);
      expect([...new Set(windowNormals.map((d) => d.atkPct))]).toEqual([10.12]);
    });
    it('timing-stable isolation: removing the trueDamagePct buff does not change which frames she shoots', () => {
      expect(noTdNormalFrames).toEqual(baseNormalFrames);
    });
    it('FLAVOR GATE: trueDamagePct rides ONLY the true-flavored window normals (outside-window normals byte-identical)', () => {
      // a normal is elevated (true-flavored) IFF its frame is in a swap window
      const elevated: number[] = [];
      const notElevated: number[] = [];
      for (const frame of baseNormalFrames) {
        const du = baseDuByFrame.get(frame)!;
        const duNoTd = noTdDuByFrame.get(frame)!;
        (du > duNoTd + 0.01 ? elevated : notElevated).push(frame);
      }
      expect(
        elevated.length,
        'no window normal carried the trueDamagePct contribution',
      ).toBeGreaterThan(0);
      // leak-proof: every elevated normal is inside a swap window; every window normal is elevated
      expect(elevated.every((f) => inWindow(f, wins))).toBe(true);
      expect(notElevated.every((f) => !inWindow(f, wins))).toBe(true);
      // positive coverage: every cast opens a true-damage window
      for (const [s, e] of wins)
        expect(elevated.some((f) => f >= s && f < e)).toBe(true);
      // cleanest proof of flavor-scoping: OUTSIDE-window normals are byte-identical with the
      // trueDamagePct buff removed (never true-flavored, so the buff never touched them)
      const outside = (m: Map<number, number>) =>
        [...m.entries()]
          .filter(([f]) => !inWindow(f, wins))
          .map(([, du]) => +du.toFixed(6))
          .sort((a, b) => a - b);
      expect(outside(baseDuByFrame)).toEqual(outside(noTdDuByFrame));
    });
    it('ENGINE ⚑ PIN: true swap normals remain crit+core-eligible (no true-damage-crit guard in the engine)', () => {
      const windowNormals = chiNormals(base.events).filter((d) =>
        inWindow(d.frame, wins),
      );
      expect([...new Set(windowNormals.map((d) => d.critEligible))]).toEqual([
        true,
      ]);
      expect([...new Set(windowNormals.map((d) => d.coreEligible))]).toEqual([
        true,
      ]);
    });
    it('DISCRIMINATING (mechanism): trueNormals:false strips the true flavor → her total drops', () => {
      expect(noTrueNormals.totals.chisato).toBeLessThan(base.totals.chisato);
    });
  });

  describe('C4 — S2 "after 48 normals → 472.18% final ATK true damage" = hitCount 48 flatDamage (flavor true)', () => {
    const riders = chiRiders(base.events);
    it('fires floor(normals/48)× at the kit magnitude, in the skill bucket', () => {
      const normals = chiNormals(base.events).length;
      expect(riders.length).toBeGreaterThan(0);
      expect(riders.length).toBe(Math.floor(normals / 48));
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([472.18]);
      expect([...new Set(riders.map((d) => d.bucket))]).toEqual(['skill']);
    });
    it('is NOT core-eligible (kit lacks any core-strike language; flatDamage core defaults off)', () => {
      expect([...new Set(riders.map((d) => d.coreEligible))]).toEqual([false]);
    });
    it('is true-flavored: trueDamagePct 48.62 rides its Damage-Up bucket', () => {
      // frame-pair (timing-stable: removing the trueDamagePct buff does not move the hitCount procs);
      // each shipped rider outruns its no-trueDamage counterpart by the +0.4862 trueDamagePct term
      const noTdRiders = chiRiders(noTrueDmg.events);
      expect(noTdRiders.map((d) => d.frame)).toEqual(
        riders.map((d) => d.frame),
      );
      const noTdByFrame = new Map(
        noTdRiders.map((d) => [d.frame, d.mult.dmgUp]),
      );
      for (const d of riders)
        expect(d.mult.dmgUp).toBeGreaterThan(noTdByFrame.get(d.frame)! + 0.01);
    });
    it('DISCRIMINATING (count): hitCount 24 (nearest-wrong) produces ~2× riders', () => {
      expect(chiRiders(count24.events).length).toBeGreaterThan(riders.length);
    });
    it('DISCRIMINATING (flavor): plain flavor (nearest-wrong) loses trueDamagePct → strictly lower rider dmgUp', () => {
      const plain = chiRiders(plainRider.events);
      expect(plain.map((d) => d.frame)).toEqual(riders.map((d) => d.frame));
      const plainByFrame = new Map(plain.map((d) => [d.frame, d.mult.dmgUp]));
      for (const d of riders)
        expect(d.mult.dmgUp).toBeGreaterThan(plainByFrame.get(d.frame)! + 0.01);
    });
  });

  describe('C5 — Burst "ATK ▲ 73.16% for 10 sec" on her own burstCast', () => {
    const atk = chiBuffs(base.events, 'atkPct', 73.16);
    it('fires once per cast (NOT at frame 0), target self, 10s duration', () => {
      expect(atk.length).toBe(casts);
      expect(atk.length).toBeGreaterThan(0);
      expect(targetsOf(atk)).toEqual([CHI]);
      expect(dursOf(atk)).toEqual([10 * FPS]);
      expect(atk.every((b) => b.frame !== 0)).toBe(true);
      expect(atk.map((b) => b.frame).sort((a, b) => a - b)).toEqual(
        castFrames(base.events),
      );
    });
    it('DISCRIMINATING (trigger): fullBurstEnter (nearest-wrong) fires on FB-start frames, ≠ her cast count', () => {
      const cf = chiBuffs(burstFbEnter.events, 'atkPct', 73.16);
      expect(cf.length).toBeGreaterThan(0);
      expect(cf.length).not.toBe(casts); // once per team FB, not per chisato cast
      const fs = fbStartFrames(burstFbEnter.events);
      expect(cf.every((b) => fs.includes(b.frame))).toBe(true);
    });
  });

  describe('C6 — Burst "Charges Extrasensory to 100%" is folded into the C1 refresh (no resource effect)', () => {
    it('PIN: the burst slot emits EXACTLY {atkPct} (the 73.16) and NO resource/gauge effect', () => {
      const burstStats = new Set(
        buffs(base.events)
          .filter((b) => b.key.startsWith(`${CHI}:burst:`))
          .map((b) => b.stat),
      );
      expect([...burstStats].sort()).toEqual(['atkPct']);
    });
  });
});
