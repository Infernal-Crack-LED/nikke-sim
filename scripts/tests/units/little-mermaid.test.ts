// PER-UNIT KIT SPEC — `little-mermaid` (Little Mermaid, Supporter/SMG/Wind, Burst I, cd 20s,
// ammo 120, SMG 1440 rpm). Kit-autonomy gauntlet 2026-07-26, S2a test-first spec.
//
// One assertion group per KIT LINE (M2..M10 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.little-mermaid.skills):
//   S1 ■ only in Focusing status → all allies: focuses fire continuously                    [M1]
//      ■ when Full Burst ENDS → all allies: Cooldown of Burst Skill ▼ 7.48 sec              [M2]
//      ■ when entering Full Burst → all allies: Attack Damage ▲ 4% for 10 sec               [M3]
//      ■ each time TOTAL ALLY ammo expended reaches 400 → all allies: Fills Burst Gauge 37% [M4]
//   S2 ■ when the enemy appears → the target: Bubble: Damage Taken ▲ 5.05% continuously     [M5]
//      ■ after landing 50 normals → target in Bubble: Explosive Bubble: Damage Taken ▲ 5.05%
//        continuously, stuns 3 sec, REMOVES Bubble                                          [M6]
//      ■ every 1 sec only during Full Burst → random enemies: 63.36% of final ATK,
//        attacks sequentially 4 times                                                       [M7]
//      ■ each time TOTAL ALLY ammo expended reaches 500 → random enemies: Bubble Barrage:
//        85% of final ATK, attacks sequentially 10 times                                    [M8]
//   BU ■ all allies: Attack damage ▲ 10.13% for 10 sec; Reloads 33.26% magazine(s)          [M9]
//      ■ self: ATK ▲ 17.28% of the skill user's ATK for 10 sec                              [M10]
//
// Dispositions:
//   M1 UNMODELED-INERT — no assertion. "Focusing status / focuses fire" is targeting flavor:
//      the sim's scope-lock already focus-fires every unit onto the single boss, and the line
//      carries no numeric effect. Documented verbatim in the override's `unmodeled.skill1`.
//   M6 UNMODELED-MEASUREMENT-GATED — no assertion (kit-status F1). The kit-literal reading is a
//      RELOCATION: Explosive Bubble removes Bubble and re-applies the SAME 5.05% debuff, so the
//      boss carries exactly one 5.05% stack in steady state (what M5 pins). The stun is inert —
//      the engine models no boss actions. ⚑ F1 coexistence hypothesis: if in-game the Bubble
//      debuff icon persists beside Explosive Bubble, steady state is 10.1% (M5's counterfactual
//      below quantifies exactly that misread). Estimate: 5.05% (shipped, kit-literal relocation)
//      vs 10.1% (coexistence). Recipe: in-game debuff-icon / popup-delta read on a boss ~5s into
//      the fight (she lands 50 normals in ~2s at 1440 rpm). Tier: MEASUREMENT-GATED.
//   M2/M4/M9-reload emit NO event (burstCdr lowers burstCdFrames directly; fillGauge bumps the
//      gauge; instantReload tops up ammo) — observed through cadence/ammo, as in volume.test V2.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   M2  burstCdr 7.48 on FB-END accelerates the whole rotation: 12 LM casts / 12 FBs with it vs
//       9/9 without. A burstCast-keyed or absent CDR provably loses that cadence.
//   M3  the buff must land on the FB-ENTER frame (fullBurstStart), not her burstCast frame (the
//       cast lands ~1.4s BEFORE the window opens) — frame-exact against the fbStart events.
//   M4  structural pin of the teamAmmo(400)→fillGauge(37) encoding (the pre-Q6 hitCount-400
//       proxy underfilled 5–8× in MG comps) + a behavioural total-difference check.
//   M5  mult.taken is uniformly 1.0505 fight-wide — the F1 coexistence counterfactual (10.1)
//       would make it 1.101, so the single-stack pin is the one that model provably fails.
//   M7  10 ticks per full FB window, 9 of them FB-boosted (the +10s boundary tick lands exactly
//       at window end and loses the major by the engine's 'timing' FBRULE); a burstCast-keyed
//       DoT shifts the ticks early (<10 per window), and a missing ×4 shows 63.36, not 253.44.
//       All four sub-hits landing on the single boss is video-verified (control/lm.MP4, 2026-07-15).
//   M8  850 = 85×10 PER HIT (user-confirmed), on TEAM ammo (18 barrages here) — the pre-Q6
//       hitCount-500 proxy fires only ~6× (her own 3115 shots / 500). core:false user-confirmed.
//   M9  the 33.26% magazine refill is observable only as fewer magazine reloads / more shots.
//   M10 casterAtkPct ("17.28% of the skill USER'S ATK") resolves to a flat ATK grant at cast —
//       the buffApply carries the resolved magnitude, self-scoped; the nearest wrong (a generic
//       team attackDamagePct 17.28) is pinned absent.
//
// Fixture: little-mermaid B1 (slot 0) / crown B2 / ada B3 (focus) / helm B3, boss Iron (Wind's
// advantage element), 180s. LM is the SOLE Burst I, so she casts every Full Burst cycle and her
// FB-gated lines are never vacuous. Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const FIGHT_FRAMES = 180 * FPS;
/** Fixture slot order: little-mermaid 0 / crown 1 / ada 2 / helm 3. */
const LM = 0;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type Reload = Extract<SimEvent, { kind: 'reload' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

/** The fixture: the control core (crown B2 / ada B3 / helm B3) with liter's B1 slot replaced
 *  by little-mermaid, on Wind's advantage boss. */
const lmComp = {
  ...controlComp('ada'),
  slugs: ['little-mermaid', 'crown', 'ada', 'helm'],
  bossElement: 'Iron' as const,
};

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...lmComp,
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
const lmCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'little-mermaid'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');
const lmShots = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Shot => e.kind === 'shot' && e.slug === 'little-mermaid'
  );
const lmReloads = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Reload => e.kind === 'reload' && e.slug === 'little-mermaid'
  );
/** LM's skill2 damage instances at a given kit magnitude. */
const lmS2 = (evs: SimEvent[], atkPct: number) =>
  dmg(evs).filter(
    (d) =>
      d.slug === 'little-mermaid' &&
      d.srcSlot === 'skill2' &&
      d.atkPct === atkPct
  );
/** LM-caster buff applications of a stat (optionally at an exact value). */
const lmBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === LM &&
      b.stat === stat &&
      (value === undefined || b.value === value)
  );

// ---- counterfactual patches (nearest wrong model per line) ------------------------------------
/** M2 nearest-wrong (absent): the FB-end burstCdr block removed entirely. */
const cfNoCdr = withPatchedOverride('little-mermaid', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'burstCdr')
  );
  if (ov.skill1.length === before) {
    throw new Error('LM S1 burstCdr block missing — fixture is stale');
  }
});
/** M3 nearest-wrong (trigger): the 4% team buff re-keyed fullBurstEnter → burstCast (lands ~1.4s
 *  before the window actually opens). */
const cfAtk4BurstCast = withPatchedOverride('little-mermaid', (ov) => {
  const b = ov.skill1.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'attackDamagePct' && e.value === 4)
  );
  if (!b) {
    throw new Error('LM S1 attackDamagePct 4 block missing — fixture is stale');
  }
  b.trigger = { kind: 'burstCast' };
});
/** M4 nearest-wrong (absent): the teamAmmo-400 gauge fill removed. */
const cfNoFill = withPatchedOverride('little-mermaid', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'fillGauge')
  );
  if (ov.skill1.length === before) {
    throw new Error('LM S1 fillGauge block missing — fixture is stale');
  }
});
/** M5 nearest-wrong (F1 coexistence): Bubble + Explosive Bubble both persist → 10.1% taken. */
const cfStack10 = withPatchedOverride('little-mermaid', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'damageTakenPct');
  if (!e) {
    throw new Error('LM S2 damageTakenPct effect missing — fixture is stale');
  }
  e.value = 10.1;
});
/** M7 nearest-wrong (trigger): the DoT re-keyed fullBurstEnter → burstCast. The cast lands
 *  ~1.3s BEFORE the FB window opens, so the 10 ticks shift early and only ~8 land inside the
 *  window. (The pre-2026-07-15 noFb relic is no longer a counterfactual at all: the engine's
 *  default 'timing' FBRULE, 2026-07-23, grants FB by landing time regardless of any per-kit
 *  noFb flag — the video-verified FB-boost is pinned by the fbMajor counts in the PIN above.) */
const cfDotBurstCast = withPatchedOverride('little-mermaid', (ov) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'dot')
  );
  if (!b) {
    throw new Error('LM S2 dot block missing — fixture is stale');
  }
  b.trigger = { kind: 'burstCast' };
});
/** M7 nearest-wrong (magnitude): the ×4 sequential attacks dropped → 63.36%/s, not 253.44%/s. */
const cfDot63 = withPatchedOverride('little-mermaid', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'dot');
  if (!e) {
    throw new Error('LM S2 dot effect missing — fixture is stale');
  }
  e.atkPct = 63.36;
});
/** M8 nearest-wrong (trigger): the pre-Q6 hitCount-500 proxy (her OWN hits) for the team-ammo
 *  trigger — undercounts ~3× (3115 own shots vs ~9000 team ammo over 180s). */
const cfBarrageHitCount = withPatchedOverride('little-mermaid', (ov) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (!b) {
    throw new Error('LM S2 flatDamage block missing — fixture is stale');
  }
  b.trigger = { kind: 'hitCount', count: 500 };
});
/** M8 nearest-wrong (core): Barrage made core-eligible (user-confirmed core:false). */
const cfBarrageCore = withPatchedOverride('little-mermaid', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e) {
    throw new Error('LM S2 flatDamage effect missing — fixture is stale');
  }
  e.core = true;
});
/** M9 nearest-wrong (reload absent): the 33.26% magazine refill removed from the burst. */
const cfNoReload = withPatchedOverride('little-mermaid', (ov) => {
  let hit = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'instantReload');
    if (b.effects.length !== before) {
      hit++;
    }
  }
  if (!hit) {
    throw new Error('LM burst instantReload effect missing — fixture is stale');
  }
});
/** M10 nearest-wrong (stat/scope): "ATK ▲ 17.28% of the skill user's ATK" misread as a generic
 *  team attackDamagePct 17.28. */
const cfCasterTeam = withPatchedOverride('little-mermaid', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'casterAtkPct')
  );
  if (!b) {
    throw new Error('LM burst casterAtkPct block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
  b.effects.find((e: any) => e.stat === 'casterAtkPct').stat =
    'attackDamagePct';
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noCdr = run({ 'little-mermaid': cfNoCdr });
const atk4BurstCast = run({ 'little-mermaid': cfAtk4BurstCast });
const noFill = run({ 'little-mermaid': cfNoFill });
const stack10 = run({ 'little-mermaid': cfStack10 });
const dotBurstCast = run({ 'little-mermaid': cfDotBurstCast });
const dot63 = run({ 'little-mermaid': cfDot63 });
const barrageHitCount = run({ 'little-mermaid': cfBarrageHitCount });
const barrageCore = run({ 'little-mermaid': cfBarrageCore });
const noReload = run({ 'little-mermaid': cfNoReload });
const casterTeam = run({ 'little-mermaid': cfCasterTeam });

const casts = lmCasts(base.events).length;
const fbs = fbStarts(base.events).length;

describe('little-mermaid — kit spec', () => {
  describe('fixture sanity — LM casts every cycle and the team reaches Full Burst', () => {
    it('LM casts >0 bursts as sole B1, and the team completes >0 Full Bursts', () => {
      expect(casts).toBeGreaterThan(0);
      expect(fbs).toBeGreaterThan(0);
      // sole-B1 comp: she casts every cycle
      expect(casts).toBe(fbs);
    });
  });

  describe('M2 — S1 FB-END team Burst Skill cooldown ▼ 7.48 sec (burstCdr, all allies)', () => {
    it('is encoded fullBurstEnd → allies → burstCdr 7.48 (structural pin)', () => {
      // structural read straight off the shipped override, via a no-op patch clone
      const shipped = withPatchedOverride('little-mermaid', () => {});
      const blk = (shipped as any).skill1.find((x: any) =>
        x.effects.some((e: any) => e.kind === 'burstCdr')
      );
      expect(blk.trigger).toEqual({ kind: 'fullBurstEnd' });
      expect(blk.target).toEqual({ kind: 'allies' });
      expect(blk.effects.find((e: any) => e.kind === 'burstCdr').seconds).toBe(
        7.48
      );
    });
    it('FIRE-RATE: removing it slows BOTH her cast cadence and the team Full-Burst cadence', () => {
      // burstCdr emits no event; observe the cadence (volume.test V2 precedent).
      expect(lmCasts(base.events).length).toBeGreaterThan(
        lmCasts(noCdr.events).length
      );
      expect(fbStarts(base.events).length).toBeGreaterThan(
        fbStarts(noCdr.events).length
      );
    });
  });

  describe('M3 — S1 FB-ENTER team Attack Damage ▲ 4% for 10 sec', () => {
    const applied = lmBuffs(base.events, 'attackDamagePct', 4);
    it('lands on the Full-Burst-ENTER frame exactly, not on her (earlier) burstCast frame', () => {
      expect(applied.length).toBeGreaterThan(0);
      const buffFrames = [...new Set(applied.map((b) => b.frame))].sort(
        (a, b) => a - b
      );
      const fbFrames = fbStarts(base.events)
        .map((f) => f.frame)
        .sort((a, b) => a - b);
      expect(buffFrames).toEqual(fbFrames);
      // DISCRIMINATING: the burstCast-keyed counterfactual lands on the cast frames instead
      const cfFrames = [
        ...new Set(
          lmBuffs(atk4BurstCast.events, 'attackDamagePct', 4).map(
            (b) => b.frame
          )
        ),
      ];
      expect(cfFrames).not.toEqual(fbFrames);
    });
    it('reaches all four allies for exactly 10 sec', () => {
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
          `frame ${frame} reached ${holders.size} allies, expected 4`
        ).toBe(4);
      }
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
  });

  describe('M4 — S1 team-ammo-400 → Fills Burst Gauge by 37% (all allies)', () => {
    it('is encoded teamAmmo(400) → fillGauge(37) → allies (the pre-Q6 hitCount proxy is wrong)', () => {
      const shipped = withPatchedOverride('little-mermaid', () => {});
      const blk = (shipped as any).skill1.find((x: any) =>
        x.effects.some((e: any) => e.kind === 'fillGauge')
      );
      expect(blk.trigger).toEqual({ kind: 'teamAmmo', count: 400 });
      expect(blk.target).toEqual({ kind: 'allies' });
      expect(blk.effects.find((e: any) => e.kind === 'fillGauge').pct).toBe(37);
    });
    it('BEHAVIOURAL: the fill is chain-locked exactly like passive generation — removing it nets ZERO change in THIS fixture (deterministic)', () => {
      // fillGauge emits no event; observed through the 180s total. The engine gates this
      // effect the same way as every other gauge-generation path (addGauge's fbEndFrame/stage
      // guard, sim.ts) — a "Fills Burst Gauge X%" effect does NOT bypass the chain lock
      // (owner ruling, 2026-07-30). little-mermaid is the SOLE Burst I in this fixture,
      // casting every ~15s cycle: her chain/Full-Burst uptime is high enough that every crossing
      // of the teamAmmo(400) trigger in this specific comp lands while gauge generation is
      // already locked, so the fill is wasted and removing it changes nothing — a
      // FIXTURE-CONDITIONAL consequence of the corrected model (measured bit-identical), NOT a
      // universal claim that fillGauge always nets zero. A different fixture (a slower-cycling
      // comp with genuine unlocked windows between crossings) is EXPECTED to break this equality
      // by design; the correct response then is to re-measure the new expected delta, not to
      // treat the break as a regression to suppress.
      expect(base.totals['little-mermaid']).toBe(
        noFill.totals['little-mermaid']
      );
    });
  });

  describe('M5 — S2 Bubble: a SINGLE permanent Damage Taken ▲ 5.05% on the boss', () => {
    it('applies exactly one boss debuff: 5.05, no holder, no expiry', () => {
      const debuffs = buffs(base.events).filter(
        (b) => b.stat === 'damageTakenPct'
      );
      expect(debuffs.length).toBe(1);
      expect(debuffs[0].value).toBe(5.05);
      expect(debuffs[0].targetIdx).toBeNull(); // the boss
      expect(debuffs[0].expiresFrame).toBeNull(); // "continuously"
    });
    it('lifts mult.taken to exactly 1.0505 on EVERY damage instance fight-wide', () => {
      const taken = [
        ...new Set(dmg(base.events).map((d) => d.mult.taken.toFixed(4))),
      ].sort();
      expect(taken).toEqual(['1.0505']);
    });
    it('DISCRIMINATING (F1 coexistence): a 10.1% encoding would make taken 1.101, not 1.0505', () => {
      const taken = [
        ...new Set(dmg(stack10.events).map((d) => d.mult.taken.toFixed(4))),
      ].sort();
      expect(taken).toEqual(['1.1010']);
    });
  });

  describe('M7 — S2 Full-Burst DoT: 63.36% × 4 = 253.44%/sec for the 10s window, every 1s', () => {
    const dots = lmS2(base.events, 253.44);
    it('ticks at the kit magnitude, crit-eligible, never cores, never ranged', () => {
      expect(dots.length).toBeGreaterThan(0);
      expect(dots.every((d) => d.critEligible)).toBe(true);
      expect(dots.every((d) => !d.coreEligible)).toBe(true);
      expect(dots.every((d) => !d.rangeApplied)).toBe(true);
      expect([...new Set(dots.map((d) => d.bucket))]).toEqual(['skill']);
    });
    it('lands exactly 10 ticks per full window, 9 FB-boosted (the +10s boundary tick loses the major by timing)', () => {
      const complete = fbStarts(base.events).filter(
        (f) => f.endFrame <= FIGHT_FRAMES
      );
      expect(complete.length).toBeGreaterThan(0);
      for (const fb of complete) {
        const inWin = dots.filter(
          (d) => d.frame > fb.frame && d.frame <= fb.endFrame + 2
        );
        expect(inWin.length, `window @${fb.sec.toFixed(1)}s tick count`).toBe(
          10
        );
        expect(
          inWin.filter((d) => d.fbMajorApplied).length,
          `window @${fb.sec.toFixed(1)}s FB-boosted ticks`
        ).toBe(9);
        // nothing leaks past the 10s window
        expect(
          dots.filter(
            (d) => d.frame > fb.endFrame + 2 && d.frame <= fb.endFrame + 62
          ).length
        ).toBe(0);
      }
    });
    it('DISCRIMINATING (trigger): keyed to burstCast, the ticks shift early and windows hold <10', () => {
      const cf = lmS2(dotBurstCast.events, 253.44);
      expect(cf.length).toBeGreaterThan(0);
      const complete = fbStarts(dotBurstCast.events).filter(
        (f) => f.endFrame <= FIGHT_FRAMES
      );
      const inWinTotal = complete.reduce(
        (n, fb) =>
          n +
          cf.filter((d) => d.frame > fb.frame && d.frame <= fb.endFrame + 2)
            .length,
        0
      );
      // the cast precedes the window, so every full window loses its early ticks
      expect(inWinTotal).toBeLessThan(10 * complete.length);
    });
    it('DISCRIMINATING (missing ×4): a 63.36 encoding produces no 253.44 instances', () => {
      expect(lmS2(dot63.events, 253.44).length).toBe(0);
      expect(lmS2(dot63.events, 63.36).length).toBeGreaterThan(0);
    });
  });

  describe('M8 — S2 Bubble Barrage: 85% × 10 = 850% per team-ammo-500 crossing, core:false', () => {
    const barrages = lmS2(base.events, 850);
    it('lands at the kit magnitude, crit-eligible, NOT core-eligible, in the skill bucket', () => {
      expect(barrages.length).toBeGreaterThan(0);
      expect(barrages.every((d) => d.critEligible)).toBe(true);
      expect(barrages.every((d) => !d.coreEligible)).toBe(true);
      expect([...new Set(barrages.map((d) => d.bucket))]).toEqual(['skill']);
    });
    it('takes the FB major exactly when it lands inside a Full Burst window (FB is a timing gate)', () => {
      const windows = fbStarts(base.events);
      for (const d of barrages) {
        const inWindow = windows.some(
          (f) => d.frame >= f.frame && d.frame < f.endFrame
        );
        expect(d.fbMajorApplied, `barrage @${d.sec.toFixed(1)}s`).toBe(
          inWindow
        );
      }
    });
    it('DISCRIMINATING (trigger): team ammo fires it strictly more often than her OWN hits would', () => {
      // pre-Q6 hitCount-500 proxy: ~3115 own shots / 500 ≈ 6 firings vs ~9000 team ammo / 500 = 18.
      expect(barrages.length).toBeGreaterThan(
        lmS2(barrageHitCount.events, 850).length
      );
    });
    it('DISCRIMINATING (core): a core:true encoding flips coreEligible on', () => {
      const cf = lmS2(barrageCore.events, 850);
      expect(cf.length).toBeGreaterThan(0);
      expect(cf.every((d) => d.coreEligible)).toBe(true);
    });
  });

  describe('M9 — burst: team Attack Damage ▲ 10.13% for 10s + reloads 33.26% of every ally magazine', () => {
    const applied = lmBuffs(base.events, 'attackDamagePct', 10.13);
    it('reaches all four allies, once per cast, for exactly 10 sec', () => {
      expect(applied.length).toBe(casts * 4);
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied) {
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      }
      expect(perFrame.size).toBe(casts);
      for (const [frame, holders] of perFrame) {
        expect(
          holders.size,
          `frame ${frame} reached ${holders.size} allies, expected 4`
        ).toBe(4);
      }
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
    it('the 33.26% refill is live: removing it costs her magazine reloads and shots', () => {
      // instantReload emits no event; observe the ammo economy (25 reloads / 3115 shots with it
      // vs 28 / 3048 without — deterministic).
      expect(lmReloads(base.events).length).toBeLessThan(
        lmReloads(noReload.events).length
      );
      expect(lmShots(base.events).length).toBeGreaterThan(
        lmShots(noReload.events).length
      );
    });
  });

  describe("M10 — burst: ATK ▲ 17.28% of the skill USER'S ATK, self-scoped, 10 sec (casterAtkPct)", () => {
    const applied = lmBuffs(base.events, 'casterAtkPct');
    it('applies once per cast, to HER alone, for exactly 10 sec', () => {
      expect(applied.length).toBe(casts);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([LM]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
    it('DISCRIMINATING (misread): no generic team attackDamagePct 17.28 exists in the shipped model', () => {
      expect(lmBuffs(base.events, 'attackDamagePct', 17.28).length).toBe(0);
      // ...but the misread counterfactual produces exactly that
      expect(
        lmBuffs(casterTeam.events, 'attackDamagePct', 17.28).length
      ).toBeGreaterThan(0);
    });
  });
});
