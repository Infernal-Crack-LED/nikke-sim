// PER-UNIT KIT SPEC — `frima` (Frima (Treasure), Supporter/SR/Iron, Burst I, cd 20s, ammo 6,
// chargeFrames 60, normalMult 65.95, chargeMultiplier 250). Kit-autonomy gauntlet 2026-08-02.
// P0 disambiguation: this slug is the TREASURE variant — never the bare base Frima.
//
// Kit (blablalink treasure prose, data/characters.json → characters.frima.skills — the favorite-item
// prose is the SSOT, DECISIONS 2026-07-17; the datamine skill1/skill2 detail tables carry the
// UNTREASURED base kit and disagree — base S1 is "4 normal attacks → DEF ▼15.84%", base S2/burst
// have NO True Damage lines at all):
//   S1 ■ hitting a target with Full Charge → the target: Sleepy, DEF ▼4%, stacks ×5, 10 sec   [F5]
//      ■ landing 6 Full Charges on a max-Sleepy target → self: Wake Up — normal attacks deal
//        true damage for 10 sec                                                               [F1]
//   S2 ■ attacking with Full Charge → all allies: Max HP ▲6.09% for 4 sec                     [F0b INERT]
//      ■ attacking with Full Charge while in Wake Up status → all allies: True Damage ▲28.16%
//        for 5 sec                                                                            [F2]
//   BU ■ 10 highest-final-DEF enemies: 101.66% of final ATK as damage (+ DEF ▼9.86% 10s)      [F4 / F6]
//      ■ all allies: Max HP ▲30.26% for 4 sec                                                 [F0d INERT]
//      ■ when in Wake Up status → all allies: True Damage ▲49.97% for 10 sec                  [F3]
//
// DEF ▼ lines — ENCODED 2026-08-10 on the enemy defPct channel (bossDefNow scales cfg.bossDef,
//   floor 0; channel damage math owned by scripts/tests/engine/enemy-def-debuff.test.ts):
//   F5 Sleepy = shotFired → enemy defPct -4 /10s maxStacks 5 (every SR pull is a full charge);
//   F6 the burst rider = defPct -9.86 /10s riding the nuke block AFTER the flatDamage (kit
//     order). Both sub-0.1% at the scope-lock 140-DEF basis, live at web raid DEF defaults.
//     NOT encoded as damageTakenPct — a different bucket that would over-credit a team vuln the
//     kit does not deliver (viper/phantom/marciana precedent).
//
// INERT lines (no assertions; carried verbatim in the override's `unmodeled`):
//   F0b/F0d the two ally Max HP ▲ lines — offensively INERT: ally-granted Max HP does not feed a
//     teammate's atkOfMaxHpPct conversion (e3 video rule; effectiveAtk counts only OWN-kit
//     maxHpFlat, casterIdx === u.idx, sim.ts:1513), and frima has no HP scaling of her own.
//
// Encoding shape (see src/skills/overrides/frima.json):
//   F1 = chargeCounter {count:6, countInFb:6} → self weaponSwap {damagePct:65.95 (= her normal
//        multiplier, so swap shots deal exactly her normal FC damage), trueNormals:true,
//        durationSec:10}. "Wake Up status" ≡ the trueNormals swap window (co-extensive; the engine
//        has no self-status channel, eunhwa-tu precedent — but unlike eunhwa-tu frima has NO
//        competing cannon swap, so the single swap slot carries Wake Up exactly). The "max stacks
//        of Sleepy" precondition is satisfied by construction: 5 FC hits stack Sleepy to max, so
//        the 6-FC count lands on a max-stack target (10s stack duration > her ~7.85s FC cycle).
//        countInFb:6 is set EXPLICITLY because the chargeCounter default is countInFb ?? 1 within
//        10s of the owner's OWN burst cast (the SBS lowered-threshold semantics, sim.ts:3600) —
//        omitting it would fire Wake Up on every FC for 10s after each of her bursts. (That
//        mis-encoding is damage-neutral at steady state — Wake Up uptime is ~100% either way,
//        since the ~7.85s re-trigger cycle < the 10s duration — so it is not behaviour-pinnable;
//        it is wrong in principle and documented in the override note.)
//   F2 = shotFired + swapGate:'swapped' → allies trueDamagePct 28.16 / 5s. shotFired == "attacking
//        with Full Charge" for an SR (every pull is a full charge; the swap inherits base
//        chargeFrames so swap shots stay charged). swapGate is the Wake Up gate.
//   F3 = burstCast + swapGate:'swapped' → allies trueDamagePct 49.97 / 10s.
//   F4 = burstCast → enemy flatDamage 101.66 (plain flavor; the 10-highest-DEF targeting collapses
//        to the single boss). B1 cast lands BEFORE the FB window → never takes the +50% major.
//
// Why each assertion discriminates:
//   F1  the nearest-wrong is count:1 / a t=0 passive (true normals from the first FC). Pinned by
//       the FIRST 28.16 application (the gate-opening proxy — S2-L2 can only apply while the swap
//       is live) landing on the 6th full charge, not before; the count:1 counterfactual provably
//       lands it on the 1st. Recurrence + the 10s duration are pinned by the application count and
//       span across the whole fight (a one-shot or short window produces far fewer applications).
//       The true FLAVOR itself is pinned by the removal delta: trueDamagePct is flavor-gated
//       (sim.ts:1690), so base-vs-noWakeUp on frima's OWN total is exactly the true-window payoff.
//   F2  swapGate pinned by first-application timing (ungated applies from the 1st FC); the
//       allies-not-self targeting by the self-only counterfactual (ada gets nothing); the flavor
//       gate by the exact crown negative control (crown deals no true damage — removing F2 changes
//       her total by zero, byte-for-byte; safe because a buff removal changes no shot timing or
//       gauge, so the deterministic event stream is identical apart from true-flavored instances).
//   F3  the gate is LIVE in this fixture: the team gauge fills fast, so frima's first burst cast
//       (~t=4.9s) precedes her Wake Up onset (6th FC, ~t=7.9s) and the shipped swapGate blocks
//       exactly that cast's 49.97 application — pinned by the applied-frame set equalling the
//       cast frames at/after onset, and by the ungated counterfactual applying on ALL casts. The
//       compound counterfactual (Wake Up removed, gate removed) proves the gate keys on the swap:
//       zero applications gated-without-Wake Up, one per cast ungated.
//   F4  plain flavor pinned by the flavor:'true' counterfactual (a true nuke would dip into her
//       live trueDamagePct and her total would RISE); magnitude + once-per-cast + no FB major
//       directly from the damage log.
//
// Fixture: frima (B1) / crown (B2) / ada (B3, 40s) / helm (B3, 40s), NEUTRAL boss (null — no
// elemental majors anywhere), focus frima (×2.5 gauge on her SR so her 20s-CD burst casts every
// ~20s chain). The two 40s B3s alternate, so the chain runs every ~20s and frima casts ~9 times.
// ada's true-flavored grenade DoT (every FB entry) is the ally CONSUMER of frima's True Damage
// buffs; crown (MG normals + plain nuke/riders) and helm (plain SR normals, plain S2 rider, plain
// nuke — her own trueDamagePct 93.66 team grant is flavor-gated inert on herself) deal NO
// true-flavored damage and are the two BYTE-EXACT negative controls. The gate is live in this
// fixture: the team gauge fills fast enough that frima's FIRST burst cast (~t=4.9s) lands BEFORE
// her Wake Up onset (6th FC, ~t=7.9s), so the shipped swapGate blocks exactly that one cast's
// 49.97 application — the direct gated-vs-ungated discrimination. Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const FRIMA = 0;
const N_ALLIES = 4; // frima/crown/ada/helm — `allies` includes self

const frimaComp: { slugs: string[]; bossElement: null; focusSlug: string } = {
  slugs: ['frima', 'crown', 'ada', 'helm'],
  bossElement: null,
  focusSlug: 'frima',
};

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...frimaComp,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / reference patches -------------------------------------------------------
const hasKind = (b: any, kind: string) =>
  b.effects.some((e: any) => e.kind === kind);
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** F1 reference: Wake Up removed entirely (her normals never turn true). */
const noWakeUp = withPatchedOverride('frima', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasKind(b, 'weaponSwap'));
  if (ov.skill1.length === before) {
    throw new Error('frima S1 Wake Up weaponSwap block missing — stale');
  }
});
/** F1 counterfactual: Wake Up from the 1st full charge (count 1, not 6). */
const wakeUpCount1 = withPatchedOverride('frima', (ov) => {
  const b = ov.skill1.find((x: any) => x.trigger.kind === 'chargeCounter');
  if (!b) {
    throw new Error('frima S1 chargeCounter block missing — stale');
  }
  b.trigger.count = 1;
  b.trigger.countInFb = 1;
});
/** F2 reference: the 28.16 team True Damage line removed. */
const noS2True = withPatchedOverride('frima', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'trueDamagePct'));
  if (ov.skill2.length === before) {
    throw new Error('frima S2 trueDamagePct block missing — stale');
  }
});
/** F2 counterfactual: the line gated on NOTHING (applies from the first FC, pre-Wake Up). */
const s2Ungated = withPatchedOverride('frima', (ov) => {
  const b = ov.skill2.find((x: any) => hasStat(x, 'trueDamagePct'));
  if (!b || !b.swapGate) {
    throw new Error('frima S2 trueDamagePct block/swapGate missing — stale');
  }
  delete b.swapGate;
});
/** F2 counterfactual: the line scoped to self only (not all allies). */
const s2SelfOnly = withPatchedOverride('frima', (ov) => {
  const b = ov.skill2.find((x: any) => hasStat(x, 'trueDamagePct'));
  if (!b) {
    throw new Error('frima S2 trueDamagePct block missing — stale');
  }
  b.target = { kind: 'self' };
});
/** F3 reference: the burst's 49.97 team True Damage line removed. */
const noBurstTrue = withPatchedOverride('frima', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'trueDamagePct'));
  if (ov.burst.length === before) {
    throw new Error('frima burst trueDamagePct block missing — stale');
  }
});
/** F3 counterfactual: the burst line gated on NOTHING (applies on every cast, incl. the
 *  pre-Wake Up first cast the shipped gate blocks). */
const burstTrueUngated = withPatchedOverride('frima', (ov) => {
  const b = ov.burst.find((x: any) => hasStat(x, 'trueDamagePct'));
  if (!b || !b.swapGate) {
    throw new Error('frima burst trueDamagePct block/swapGate missing — stale');
  }
  delete b.swapGate;
});
/** F3 counterfactual (compound): Wake Up removed AND the burst line ungated — proves the gate
 *  keys on the swap. Gated-without-Wake Up applies zero; this applies one per cast. */
const noWakeUngatedBurst = withPatchedOverride('frima', (ov) => {
  ov.skill1 = ov.skill1.filter((b: any) => !hasKind(b, 'weaponSwap'));
  const b = ov.burst.find((x: any) => hasStat(x, 'trueDamagePct'));
  if (!b || !b.swapGate) {
    throw new Error('frima burst trueDamagePct block/swapGate missing — stale');
  }
  delete b.swapGate;
});
/** F4 reference: the burst nuke removed. */
const noNuke = withPatchedOverride('frima', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasKind(b, 'flatDamage'));
  if (ov.burst.length === before) {
    throw new Error('frima burst flatDamage block missing — stale');
  }
});
/** F4 counterfactual: the nuke dealt as TRUE damage (kit says plain damage). */
const nukeTrue = withPatchedOverride('frima', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e) {
    throw new Error('frima burst flatDamage effect missing — stale');
  }
  e.flavor = 'true';
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const runNoWake = run({ frima: noWakeUp });
const runCount1 = run({ frima: wakeUpCount1 });
const runNoS2 = run({ frima: noS2True });
const runS2Ungated = run({ frima: s2Ungated });
const runS2Self = run({ frima: s2SelfOnly });
const runNoBurstTrue = run({ frima: noBurstTrue });
const runBurstUngated = run({ frima: burstTrueUngated });
const runNoWakeUngated = run({ frima: noWakeUngatedBurst });
const runNoNuke = run({ frima: noNuke });
const runNukeTrue = run({ frima: nukeTrue });

// ---- readers ----------------------------------------------------------------------------------
type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

const shots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'frima');
const casts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'frima'
  );
const nukes = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'frima' && e.srcSlot === 'burst'
  );
/** frima's own trueDamagePct applications at a given magnitude (one event per holder per apply). */
const trueApplies = (evs: SimEvent[], value: number) =>
  evs.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' &&
      e.casterIdx === FRIMA &&
      e.stat === 'trueDamagePct' &&
      e.value === value
  );

describe('frima (Treasure) — kit spec', () => {
  describe('premise — every frima pull is a full charge (SR)', () => {
    it('all shot events are charged, so shotFired == "attacking with Full Charge"', () => {
      const all = shots(base.events);
      expect(all.length).toBeGreaterThan(100);
      expect(all.every((s) => s.charged)).toBe(true);
    });
  });

  describe('F1 — S1 Wake Up: every 6th Full Charge, normals deal true damage for 10 sec (self)', () => {
    const b28 = trueApplies(base.events, 28.16);
    const firstApply = Math.min(...b28.map((b) => b.frame));
    const sixth = shots(base.events)[5];

    it('first activates on the 6th full charge, not before (the round-count threshold)', () => {
      expect(sixth).toBeDefined();
      // S2-L2 is swap-gated, so its first application is the Wake Up onset proxy.
      expect(
        firstApply,
        `first 28.16 apply at f${firstApply}, 6th FC at f${sixth.frame}`
      ).toBeGreaterThanOrEqual(sixth.frame);
      expect(firstApply).toBeLessThanOrEqual(shots(base.events)[6].frame);
    });

    it('DISCRIMINATING: count:1 would open the window on the 1st full charge', () => {
      const c1 = trueApplies(runCount1.events, 28.16);
      const firstC1 = Math.min(...c1.map((b) => b.frame));
      expect(firstC1).toBeLessThan(sixth.frame);
      expect(firstC1).toBeLessThanOrEqual(shots(runCount1.events)[1].frame);
    });

    it('the window recurs and dominates the fight (10s duration on a ~7.85s FC cycle)', () => {
      expect(b28.length).toBeGreaterThanOrEqual(100);
      expect(Math.max(...b28.map((b) => b.frame))).toBeGreaterThanOrEqual(
        170 * FPS
      );
    });

    it('turning her normal attacks true is load-bearing on her OWN total (flavor-gated payoff)', () => {
      // trueDamagePct pays ONLY on true-flavored hits (sim.ts:1690); without the swap her normals
      // stay non-true and the whole steady-state True Damage stack is inert on her — so this delta
      // IS the proof the swap makes her normals true-flavored across the window.
      expect(base.totals.frima).toBeGreaterThan(runNoWake.totals.frima);
    });
  });

  describe('F2 — S2 while Wake Up: True Damage ▲28.16% to ALL allies for 5 sec per Full Charge', () => {
    const b28 = trueApplies(base.events, 28.16);

    it('is 28.16% with a 5-sec expiry on every application', () => {
      expect(b28.length).toBeGreaterThan(0);
      for (const b of b28) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
    });

    it('reaches all four allies (including herself) on every application frame', () => {
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of b28) {
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

    it('is gated on Wake Up: no application before the 6th full charge', () => {
      const sixth = shots(base.events)[5];
      expect(Math.min(...b28.map((b) => b.frame))).toBeGreaterThanOrEqual(
        sixth.frame
      );
    });

    it('DISCRIMINATING: ungated, it would apply from the 1st full charge', () => {
      const ung = trueApplies(runS2Ungated.events, 28.16);
      const sixthUng = shots(runS2Ungated.events)[5];
      expect(Math.min(...ung.map((b) => b.frame))).toBeLessThan(sixthUng.frame);
    });

    it('moves the true-damage consumers (frima herself + ada) and NOT the non-true controls', () => {
      expect(base.totals.frima).toBeGreaterThan(runNoS2.totals.frima);
      expect(base.totals.ada).toBeGreaterThan(runNoS2.totals.ada);
      // crown and helm deal no true-flavored damage: the flavor gate makes both byte-exact.
      expect(base.totals.crown).toBe(runNoS2.totals.crown);
      expect(base.totals.helm).toBe(runNoS2.totals.helm);
    });

    it('DISCRIMINATING: self-scoped, ada would get nothing', () => {
      expect(base.totals.ada).toBeGreaterThan(runS2Self.totals.ada);
      // self-only and fully-removed are identical FOR ADA (neither reaches her).
      expect(runS2Self.totals.ada).toBe(runNoS2.totals.ada);
    });
  });

  describe('F3 — burst while Wake Up: True Damage ▲49.97% to all allies for 10 sec', () => {
    const b49 = trueApplies(base.events, 49.97);
    const castFrames = new Set(casts(base.events).map((c) => c.frame));

    it('is 49.97% with a 10-sec expiry, applied exactly on the cast frames inside Wake Up', () => {
      expect(castFrames.size).toBeGreaterThanOrEqual(6);
      // The first cast lands BEFORE the Wake Up onset (the gate is live in this fixture):
      // exactly the casts at/after onset apply, each reaching all four allies.
      const onset = Math.min(
        ...trueApplies(base.events, 28.16).map((b) => b.frame)
      );
      const gatedCasts = [...castFrames].filter((f) => f >= onset);
      expect(gatedCasts.length).toBe(castFrames.size - 1); // only the first cast is pre-onset
      const appliedFrames = new Set(b49.map((b) => b.frame));
      expect([...appliedFrames].sort((a, z) => a - z)).toEqual(
        gatedCasts.sort((a, z) => a - z)
      );
      expect(b49.length).toBe(gatedCasts.length * N_ALLIES);
      for (const b of b49) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: ungated, the pre-Wake Up first cast would apply too', () => {
      const ung = trueApplies(runBurstUngated.events, 49.97);
      expect(ung.length).toBeGreaterThan(b49.length);
      expect(ung.length).toBe(casts(runBurstUngated.events).length * N_ALLIES);
    });

    it('DISCRIMINATING: the gate keys on Wake Up — zero applications with Wake Up removed, one-per-cast ungated', () => {
      expect(trueApplies(runNoWake.events, 49.97).length).toBe(0);
      expect(
        trueApplies(runNoWakeUngated.events, 49.97).length
      ).toBeGreaterThanOrEqual(6 * N_ALLIES);
    });

    it('moves the true-damage consumers and NOT the non-true controls', () => {
      expect(base.totals.ada).toBeGreaterThan(runNoBurstTrue.totals.ada);
      expect(base.totals.frima).toBeGreaterThan(runNoBurstTrue.totals.frima);
      expect(base.totals.crown).toBe(runNoBurstTrue.totals.crown);
      expect(base.totals.helm).toBe(runNoBurstTrue.totals.helm);
    });
  });

  describe('F4 — burst nuke: 101.66% of final ATK, plain damage, once per cast, pre-FB', () => {
    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      const n = nukes(base.events);
      expect(n.length).toBe(casts(base.events).length);
      expect(n.length).toBeGreaterThanOrEqual(6);
      expect([...new Set(n.map((d) => d.atkPct))]).toEqual([101.66]);
      expect([...new Set(n.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the B1 cast lands before FB opens)', () => {
      expect(nukes(base.events).every((d) => !d.fbMajorApplied)).toBe(true);
    });

    it('DISCRIMINATING: a true-flavored nuke would dip into her live True Damage and rise', () => {
      expect(runNukeTrue.totals.frima).toBeGreaterThan(base.totals.frima);
    });

    it('the nuke is load-bearing on her total', () => {
      expect(base.totals.frima).toBeGreaterThan(runNoNuke.totals.frima);
    });
  });

  describe('F5 — S1 Sleepy: DEF ▼4% ×5 stacks/10s per Full Charge hit, on the enemy defPct channel (encoded 2026-08-10)', () => {
    // channel damage math owned by scripts/tests/engine/enemy-def-debuff.test.ts
    // (reuse-before-derive) — this group pins only her magnitude, cadence, and window.
    const shaves = base.events.filter(
      (e): e is BuffApply =>
        e.kind === 'buffApply' && e.stat === 'defPct' && e.value === -4
    );

    it('one -4 application per full-charge shot, same frames, 10s window, from the skill1 slot', () => {
      const shotFrames = shots(base.events).map((s) => s.frame);
      expect(shaves.length).toBe(shotFrames.length);
      expect(shaves.length).toBeGreaterThan(100);
      expect(shaves.map((b) => b.frame)).toEqual(shotFrames);
      for (const b of shaves) {
        expect(b.key.startsWith(`${FRIMA}:skill1:`)).toBe(true);
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
  });

  describe('F6 — burst rider: DEF ▼9.86%/10s riding the nuke block (encoded 2026-08-10)', () => {
    const shaves = base.events.filter(
      (e): e is BuffApply =>
        e.kind === 'buffApply' && e.stat === 'defPct' && e.value === -9.86
    );

    it('one -9.86 boss debuff per burst cast, same frames, 10s window, from the burst slot', () => {
      const castFrames = casts(base.events).map((c) => c.frame);
      expect(shaves.length).toBe(castFrames.length);
      expect(shaves.length).toBeGreaterThanOrEqual(6);
      expect(shaves.map((b) => b.frame)).toEqual(castFrames);
      for (const b of shaves) {
        expect(b.key.startsWith(`${FRIMA}:burst:`)).toBe(true);
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
  });
});
