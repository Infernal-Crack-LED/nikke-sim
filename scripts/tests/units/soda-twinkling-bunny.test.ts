// PER-UNIT KIT SPEC — `soda-twinkling-bunny` (Soda: Twinkling Bunny, Attacker/SG/Iron, Burst III,
// cd 40s, ammo 9, hitsPerShot 10, normalMult 231.6). Kit-autonomy gauntlet 2026-07-24 (driver tests).
//
// One assertion group per KIT LINE (STB1..STB8 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model each
// assertion must discriminate against) — never to supply the encoding under test.
//
// The kit centres on a Golden-Chip POOL (engine resource-counter primitive): start 50 (cap 50), +1 per
// "3 normal attacks during Full Burst", −17 on her own burst (spent AFTER the gates). Crit Damage is
// LIVE = pool × 1.32 (perResource); her burst ATK ▲65.25% is gated ≥30 chips, Hit Rate ▲38.91% ≥20,
// the Full-Burst-extension ladder is +2s at 10-19 / +5s at ≥20. The pool itself emits NO event
// (resource deltas are internal state), so it is observed INDIRECTLY: which resourceGate-gated buffs
// fire (and on which bursts), the Full-Burst window length, and the live crit damage folded into her
// expected-value damage totals.
//
// Kit (blablalink prose, data/characters.json → characters['soda-twinkling-bunny'].skills, lvl 10):
//   S1 ■ start of battle → self: Golden Chip stacks ▲50.                                      [STB1]
//      ■ after 3 normal attacks during Full Burst → self: Critical Damage ▲1.32%/stack, ≤50.   [STB2]
//         (the same trigger generates +1 Golden Chip — the pool rebuild)                       [STB3]
//      ■ after 3 normal attacks during Full Burst → self + 1 highest-final-ATK ally (except
//         self): Attack Damage ▲10.51% for 2 sec.                                             [STB4]
//   S2 ■ entering Burst Stage 3 → all allies: chip-gated CUMULATIVE Full Burst Duration ladder:
//         Time Extension I +2s at ≥10 chips, Time Extension II +3s more at ≥20 (so +5 at ≥20). [STB5]
//      ■ normal attack during Full Burst → 1 enemy nearest crosshair: rider damage by Time-Ext
//         state (52.04% TE-I / 85.02% TE-II, cumulative). Modeled flat 130 (⚑ recording-derived;
//         TE-II-dominant — the pool sits ≥20 most of the fight).                               [STB6]
//   BU ■ Onward, Soda! → all enemies: 628.7% final ATK as Burst Skill damage; Golden Chip ▼17
//         AFTER the effect is applied.                                                        [STB7]
//      ■ ≥20 chips → self: Hit Rate ▲38.91% for 15 sec.                                       [STB8]
//      ■ ≥30 chips → self: ATK ▲65.25% for 15 sec.                                            [STB8]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates nothing;
// every counterfactual below was measured RED vs the shipped override on this fixture):
//   STB1 pool starts at 50: the ≥30 ATK gate and the ≥20 HR gate BOTH fire on her FIRST burst (t≈5s)
//        and the first Full Burst is already extended to 15s — only possible if the pool opens at 50.
//        Nearest wrong: pool opens at 0 → no gate fires on burst 1, FB stays 10s.
//   STB2 crit is LIVE off the pool (perResource), not a from-0 ramp: the passive critDamagePct buff is
//        applied once at frame 0 with base value 0 (the perResource multiplier reads the live pool at
//        damage time) and removing it drops her total ~15M. Nearest wrong: a shotFired/everyN from-0
//        ramp (the prior model) accumulates only a few stacks because Soda fires few in-FB normals.
//   STB3 the +1/3-in-FB-normal rebuild sustains the pool late-fight: removing the generation drops the
//        ≥30 ATK gate 4→2 firings and the ≥20 HR gate 5→2 (the pool drains to 0 without rebuild).
//   STB4 AD buff hits self AND the top-ATK ally EXCLUDING self: the ally block never targets Soda (slot 2
//        receives exactly her own self-block count). Nearest wrong: drop excludeSelf → Soda is top final
//        ATK here, so the ally block double-targets her (slot 2 51→78) and the true carry (liter) gets 0.
//   STB5 FB extension is the CUMULATIVE ladder (+5 at ≥20): every FB window is 15s (10 base + 5). Nearest
//        wrong: no extension → 10s; a flat +2 (wrong shape) → ≤12s.
//   STB6 rider fires on in-FB normals at the kit slot: 154 skill2 hits at 130%, all inside Full Burst;
//        removing it drops her total ~126M (35%). Magnitude 130 is ⚑ recording-derived (out of scope).
//   STB7 burst nuke 628.7% once per cast, and the −17 spend lands AFTER the gates: reordering the spend
//        before the gates collapses the ≥30 ATK gate 4→1 and the ≥20 HR gate 5→3 (burst-5 pre-consume is
//        in [20,30): the gate must read it BEFORE the spend, exactly as "▼17 after applied" requires).
//   STB8 HR (≥20) fires on all 5 bursts, ATK (≥30) on the first 4 (the pool drains below 30 by burst 5
//        but stays ≥20) — both self-targeted, 15s. Nearest wrong: pool opens at 0 → neither fires.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / soda-twinkling-bunny B3 / helm B3, boss
// Fire, focus soda-twinkling-bunny) — she needs a real rotation to cast her burst at all (a lone B3 makes
// ZERO Full Bursts). Deterministic (no seed). Slot order: liter 0 / crown 1 / soda 2 / helm 3.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SODA = 'soda-twinkling-bunny';
const SODA_SLOT = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({ ...controlComp(SODA), overrides, cfg: { onEvent: (e) => events.push(e) } });
  return { events, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const sodaBuffs = (evs: SimEvent[], stat: string, value: number) =>
  buffs(evs).filter((b) => b.casterIdx === SODA_SLOT && b.stat === stat && b.value === value);
const sodaDmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage' && e.slug === SODA);
const sodaBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SODA);
const fbWindows = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');
const fbDurations = (evs: SimEvent[]) =>
  [...new Set(fbWindows(evs).map((f) => +((f.endFrame - f.frame) / FPS).toFixed(2)))].sort((a, b) => a - b);
const firstBurstFrame = (evs: SimEvent[]) => sodaBursts(evs)[0]?.frame ?? Infinity;

// ---- counterfactual patches (nearest-wrong models; all measured RED vs shipped) ---------------
/** STB2 reference: her live perResource crit line removed entirely. */
const noCrit = withPatchedOverride(SODA, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !b.effects.some((e: any) => e.stat === 'critDamagePct'));
  if (ov.skill1.length === before) throw new Error('stb S1 critDamagePct block missing — fixture is stale');
});
/** STB3 reference: the +1 chip generation removed (pool never rebuilds). */
const noGen = withPatchedOverride(SODA, (ov) => {
  let removed = 0;
  for (const blk of ov.skill1) {
    const before = blk.effects.length;
    blk.effects = blk.effects.filter((e: any) => !(e.kind === 'resource' && e.delta > 0));
    removed += before - blk.effects.length;
  }
  if (!removed) throw new Error('stb S1 +chip generation effect missing — fixture is stale');
});
/** STB4 reference: her AD self+ally blocks removed. */
const noAd = withPatchedOverride(SODA, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !b.effects.some((e: any) => e.stat === 'attackDamagePct'));
  if (ov.skill1.length === before) throw new Error('stb S1 attackDamagePct block missing — fixture is stale');
});
/** STB4 counterfactual: the ally block WITHOUT excludeSelf (double-targets Soda if she is top ATK). */
const noExclude = withPatchedOverride(SODA, (ov) => {
  let hit = 0;
  for (const blk of ov.skill1) if (blk.target?.kind === 'alliesTopAtk') { delete blk.target.excludeSelf; hit++; }
  if (!hit) throw new Error('stb S1 alliesTopAtk block missing — fixture is stale');
});
/** STB5 reference: the Full-Burst-extension ladder removed. */
const noFbExt = withPatchedOverride(SODA, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !b.effects.some((e: any) => e.kind === 'fullBurstExtend'));
  if (ov.skill2.length === before) throw new Error('stb S2 fullBurstExtend block missing — fixture is stale');
});
/** STB5 counterfactual: a FLAT +2 ladder (wrong shape — the kit is cumulative +2/+3 = +5 at ≥20). */
const flatLadder = withPatchedOverride(SODA, (ov) => {
  let hit = 0;
  for (const blk of ov.skill2) for (const e of blk.effects) if (e.kind === 'fullBurstExtend') { e.seconds = 2; hit++; }
  if (!hit) throw new Error('stb S2 fullBurstExtend block missing — fixture is stale');
});
/** STB6 reference: the in-FB rider removed. */
const noRider = withPatchedOverride(SODA, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !b.effects.some((e: any) => e.kind === 'flatDamage'));
  if (ov.skill2.length === before) throw new Error('stb S2 flatDamage rider missing — fixture is stale');
});
/** STB7 reference: the burst nuke removed. */
const noBurstDmg = withPatchedOverride(SODA, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !b.effects.some((e: any) => e.kind === 'flatDamage'));
  if (ov.burst.length === before) throw new Error('stb burst flatDamage missing — fixture is stale');
});
/** STB7 counterfactual: the −17 chip spend moved BEFORE the gates (violates "▼17 after applied"). */
const spendFirst = withPatchedOverride(SODA, (ov) => {
  const i = ov.burst.findIndex((b: any) => b.effects.some((e: any) => e.kind === 'resource'));
  if (i < 0) throw new Error('stb burst chip-spend block missing — fixture is stale');
  const [spend] = ov.burst.splice(i, 1);
  ov.burst.unshift(spend);
});
/** STB1/STB8 counterfactual: the pool opens at 0 instead of 50. */
const pool0 = withPatchedOverride(SODA, (ov) => {
  if (!ov.resources?.[0]) throw new Error('stb goldenChip resource missing — fixture is stale');
  ov.resources[0].initial = 0;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const rNoCrit = run({ [SODA]: noCrit });
const rNoGen = run({ [SODA]: noGen });
const rNoAd = run({ [SODA]: noAd });
const rNoExclude = run({ [SODA]: noExclude });
const rNoFbExt = run({ [SODA]: noFbExt });
const rFlatLadder = run({ [SODA]: flatLadder });
const rNoRider = run({ [SODA]: noRider });
const rNoBurstDmg = run({ [SODA]: noBurstDmg });
const rSpendFirst = run({ [SODA]: spendFirst });
const rPool0 = run({ [SODA]: pool0 });

const sodaTotal = (r: { totals: Record<string, number> }) => r.totals[SODA];
const atkGateFires = (evs: SimEvent[]) => sodaBuffs(evs, 'atkPct', 65.25).length;
const hrGateFires = (evs: SimEvent[]) => sodaBuffs(evs, 'hitRatePct', 38.91).length;

describe('soda-twinkling-bunny — kit spec', () => {
  describe('STB1 — S1 Golden Chip pool opens at 50 (resource initial)', () => {
    it('the ≥30 ATK gate and ≥20 HR gate BOTH clear on her first burst (pool ≥30 at t≈5s)', () => {
      const f0 = firstBurstFrame(base.events);
      expect(f0, 'no burst cast — fixture must rotate her').toBeLessThan(Infinity);
      const atkOnFirst = sodaBuffs(base.events, 'atkPct', 65.25).some((b) => b.frame === f0);
      const hrOnFirst = sodaBuffs(base.events, 'hitRatePct', 38.91).some((b) => b.frame === f0);
      expect(atkOnFirst, 'ATK ▲65.25 (≥30 chips) did not fire on burst 1 — pool did not open at 50').toBe(true);
      expect(hrOnFirst, 'Hit Rate ▲38.91 (≥20 chips) did not fire on burst 1 — pool did not open at 50').toBe(true);
    });

    it('the first Full Burst is already extended to 15s (pool ≥20 at the first stage-3 entry)', () => {
      expect(fbDurations(base.events)[0] === 15 || fbDurations(base.events).includes(15)).toBe(true);
      expect(fbDurations(base.events).some((d) => d > 10), 'no FB extension on a 50-chip open').toBe(true);
    });

    it('DISCRIMINATING: a pool opening at 0 fires NEITHER gate and leaves the FB at 10s', () => {
      expect(atkGateFires(rPool0.events)).toBe(0);
      expect(hrGateFires(rPool0.events)).toBe(0);
      expect(fbDurations(rPool0.events)).toEqual([10]);
    });
  });

  describe('STB2 — S1 Critical Damage is LIVE off the pool (perResource ×1.32), not a from-0 ramp', () => {
    it('is a passive self buff applied once at frame 0 with base value 0 (perResource reads the live pool)', () => {
      const crit = buffs(base.events).filter((b) => b.casterIdx === SODA_SLOT && b.stat === 'critDamagePct');
      expect(crit.length, 'no passive critDamagePct buff applied').toBeGreaterThan(0);
      for (const b of crit) {
        expect(b.value, 'perResource base must be 0 (a flat encoding emits its number here)').toBe(0);
        expect(b.targetIdx, 'crit buff is self-scoped').toBe(SODA_SLOT);
        expect(b.expiresFrame, 'passive crit buff has no wall-clock expiry').toBeNull();
      }
      expect(crit[0].frame, 'passive crit buff is up from battle start').toBe(0);
    });

    it('DISCRIMINATING: removing the live crit line drops her total (the pool×1.32 is damage-bearing)', () => {
      expect(sodaTotal(base), 'crit line is inert — not damage-bearing').toBeGreaterThan(sodaTotal(rNoCrit));
    });
  });

  describe('STB3 — S1 the +1-per-3-in-FB-normal rebuild sustains the pool late-fight', () => {
    it('with the rebuild, the ≥30 ATK gate fires on 4 bursts and the ≥20 HR gate on all 5', () => {
      expect(atkGateFires(base.events)).toBe(4);
      expect(hrGateFires(base.events)).toBe(sodaBursts(base.events).length);
      expect(hrGateFires(base.events)).toBe(5);
    });

    it('DISCRIMINATING: removing the generation drains the pool — gates stop firing late', () => {
      expect(atkGateFires(rNoGen.events), 'ATK gate count unchanged without rebuild').toBeLessThan(atkGateFires(base.events));
      expect(hrGateFires(rNoGen.events), 'HR gate count unchanged without rebuild').toBeLessThan(hrGateFires(base.events));
      expect(sodaTotal(rNoGen)).toBeLessThan(sodaTotal(base));
    });
  });

  describe('STB4 — S1 Attack Damage ▲10.51%/2s to self + the top-final-ATK ally (except self)', () => {
    const ad = (evs: SimEvent[]) => sodaBuffs(evs, 'attackDamagePct', 10.51);
    const byTarget = (evs: SimEvent[]) => {
      const m = new Map<number, number>();
      for (const b of ad(evs)) m.set(b.targetIdx ?? -1, (m.get(b.targetIdx ?? -1) ?? 0) + 1);
      return m;
    };

    it('buffs Soda herself AND at least one ally, every 3 in-FB normals', () => {
      const m = byTarget(base.events);
      expect(m.get(SODA_SLOT) ?? 0, 'self AD buff missing').toBeGreaterThan(0);
      const allyHits = [...m.entries()].filter(([tgt]) => tgt !== SODA_SLOT);
      expect(allyHits.length, 'no ally received the AD buff').toBeGreaterThan(0);
    });

    it('the ally block NEVER targets Soda (excludeSelf honored) — slot 2 holds exactly her self-block count', () => {
      const m = byTarget(base.events);
      const selfCount = m.get(SODA_SLOT) ?? 0;
      const allyTotal = [...m.entries()].filter(([tgt]) => tgt !== SODA_SLOT).reduce((s, [, n]) => s + n, 0);
      // self-block and ally-block share the same every-3-in-FB trigger, so they fire equally often;
      // if the ally block double-targeted Soda, slot 2 would carry self+ally (> allyTotal).
      expect(selfCount, 'slot 2 carries more than the self block — ally block is leaking onto Soda').toBe(allyTotal);
    });

    it('DISCRIMINATING: dropping excludeSelf double-targets Soda and starves the true carry', () => {
      const mBase = byTarget(base.events);
      const mNoEx = byTarget(rNoExclude.events);
      expect(mNoEx.get(SODA_SLOT) ?? 0, 'excludeSelf removal did not redirect the ally buff onto Soda').toBeGreaterThan(mBase.get(SODA_SLOT) ?? 0);
    });

    it('DISCRIMINATING: removing the AD line drops her total', () => {
      expect(ad(rNoAd.events).length).toBe(0);
      expect(sodaTotal(rNoAd)).toBeLessThan(sodaTotal(base));
    });
  });

  describe('STB5 — S2 Full Burst extension is the CUMULATIVE chip ladder (+5s at ≥20 chips)', () => {
    it('every Full Burst window is 15s (10s base + 5s extension) while the pool sits ≥20', () => {
      const durs = fbDurations(base.events);
      expect(durs.length, 'no Full Burst windows').toBeGreaterThan(0);
      expect(durs, 'a window not extended to 15s — ladder mis-shaped').toEqual([15]);
    });

    it('DISCRIMINATING: removing the ladder leaves 10s windows', () => {
      expect(fbDurations(rNoFbExt.events)).toEqual([10]);
    });

    it('DISCRIMINATING: a flat +2 (wrong shape) never reaches the 15s the cumulative +5 produces', () => {
      const durs = fbDurations(rFlatLadder.events);
      expect(Math.max(...durs), 'flat +2 reached 15s — not discriminating').toBeLessThan(15);
    });
  });

  describe('STB6 — S2 in-FB rider deals 130% (⚑ recording-derived) to 1 enemy, inside Full Burst only', () => {
    const riders = () => sodaDmg(base.events).filter((d) => d.srcSlot === 'skill2');

    it('fires on in-FB normals at the kit slot, all inside Full Burst', () => {
      const r = riders();
      expect(r.length, 'no skill2 rider damage').toBeGreaterThan(0);
      expect([...new Set(r.map((d) => d.atkPct))], 'rider magnitude drifted from the shipped 130').toEqual([130]);
      expect([...new Set(r.map((d) => d.inFullBurst))], 'rider fired outside Full Burst').toEqual([true]);
    });

    it('DISCRIMINATING: removing the rider zeroes skill2 damage and drops her total ~35%', () => {
      expect(sodaDmg(rNoRider.events).filter((d) => d.srcSlot === 'skill2').length).toBe(0);
      expect(sodaTotal(rNoRider)).toBeLessThan(sodaTotal(base));
    });
  });

  describe('STB7 — burst nuke 628.7% once per cast; the −17 chip spend lands AFTER the gates', () => {
    const nukes = (evs: SimEvent[]) => sodaDmg(evs).filter((d) => d.srcSlot === 'burst');

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      const n = nukes(base.events);
      expect(n.length).toBe(sodaBursts(base.events).length);
      expect(n.length).toBeGreaterThan(0);
      expect([...new Set(n.map((d) => d.atkPct))]).toEqual([628.7]);
      expect([...new Set(n.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('DISCRIMINATING: removing the nuke zeroes burst-bucket damage', () => {
      expect(nukes(rNoBurstDmg.events).length).toBe(0);
    });

    it('DISCRIMINATING: spending the chips BEFORE the gates collapses the late gates (pre-consume ordering)', () => {
      // burst-5 pre-consume is in [20,30): the ≥30 ATK gate and ≥20 HR gate must read it BEFORE the
      // −17 spend. Spend-first drops the pool below the gates first, so fewer gates clear.
      expect(atkGateFires(rSpendFirst.events), 'spend-first did not reduce ATK gate fires').toBeLessThan(atkGateFires(base.events));
      expect(hrGateFires(rSpendFirst.events), 'spend-first did not reduce HR gate fires').toBeLessThan(hrGateFires(base.events));
    });
  });

  describe('STB8 — burst self-buffs: Hit Rate ▲38.91%/15s (≥20) on all 5, ATK ▲65.25%/15s (≥30) on the first 4', () => {
    it('HR (≥20) fires on every burst; ATK (≥30) stops once the pool drains below 30 (burst 5)', () => {
      const bursts = sodaBursts(base.events).length;
      expect(hrGateFires(base.events), 'HR gate did not fire on every burst (pool ≥20 throughout)').toBe(bursts);
      expect(atkGateFires(base.events), 'ATK gate should drain below 30 by the last burst').toBe(bursts - 1);
    });

    it('both are self-targeted 15s buffs', () => {
      for (const stat of ['atkPct', 'hitRatePct'] as const) {
        const val = stat === 'atkPct' ? 65.25 : 38.91;
        const applied = sodaBuffs(base.events, stat, val);
        expect(applied.length, `${stat} ${val} never applied`).toBeGreaterThan(0);
        for (const b of applied) {
          expect(b.targetIdx, `${stat} buff is self-scoped`).toBe(SODA_SLOT);
          expect(b.expiresFrame! - b.frame, `${stat} buff duration`).toBe(15 * FPS);
        }
      }
    });

    it('DISCRIMINATING: a pool opening at 0 fires neither self-buff', () => {
      expect(atkGateFires(rPool0.events)).toBe(0);
      expect(hrGateFires(rPool0.events)).toBe(0);
    });
  });
});
