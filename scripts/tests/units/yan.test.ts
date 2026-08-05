// PER-UNIT KIT SPEC — `yan` (Yan, Supporter/RL/Fire, Burst I, cd 20s, ammo 6, chargeFrames 90,
// reloadFrames 141, normalMult 61.3, chargeMultiplier 350, Tetra). Kit-autonomy gauntlet
// 2026-08-05. FROM-SCRATCH build — no prior override existed; the shipped state the RED phase
// asserts against is "no override on disk" (simSupported:false), and every assertion goes GREEN
// when src/skills/overrides/yan.json lands (S3).
//
// Kit (blablalink prose, data/characters.json → characters.yan.skills):
//   S1 "Struck Dumb"            ■ Activates at the beginning of Full Burst. Affects all allies.
//                                  Charge Damage ▲ 21.55% for 10 sec.          [Y1 trigger / Y2 buff]
//   S2 "The More, the Merrier"  ■ Activates when performing a Full Charge attack. Affects all allies.
//                                  ATK ▲ 2.77% for 5 sec.                        [Y3 trigger / Y4]
//                                  Critical Rate ▲ 1.33% for 5 sec.              [Y5]
//   BU "Fat Cat"                ■ Affects enemies within attack range.
//                                  Deals 348.73% of final ATK as damage.         [Y6]
//                                  Forced movement toward the center of attack range,
//                                  lasts for 2 sec.                              [Y7 UNMODELED]
//
// UNMODELED line (no assertion; carried verbatim in the override's `unmodeled.burst`):
//   Y7 the forced-movement line is a crowd-control PULL on normal enemies. v1 fights a single
//     scope-lock boss with no enemy movement/position model; bosses are not pulled, so the line
//     moves no damage. It is NOT re-encoded as a damage buff (that would over-credit a vuln the
//     kit does not deliver — viper/phantom/marciana precedent).
//
// Encoding shape (see src/skills/overrides/yan.json):
//   Y1+Y2 = fullBurstEnter → allies chargeDamagePct 21.55 / 10s. "At the beginning of Full
//           Burst" is the FB window opening (fullBurstEnter), NOT her own burst cast — a B1 cast
//           lands BEFORE the window opens (helm H7 precedent), so a burstCast encoding would
//           apply the buff frames early and only on her own casts.
//   Y3+Y4 = shotFired → allies atkPct 2.77 / 5s. shotFired == "performing a Full Charge attack"
//           for an RL: every RL trigger pull is a full charge (frima precedent for SR; pinned
//           here directly — every `shot` event of hers carries charged:true). No-stack refresh
//           semantics: maxStacks defaults to 1, so re-fires refresh the 5s window without
//           stacking — the kit names no stack counter.
//   Y5    = shotFired → allies critRatePct 1.33 / 5s. Plain "Critical Rate" is the UNSCOPED stat
//           (contrast helm's "Critical Rate OF NORMAL ATTACKS" → critRateNormalPct): her grant
//           lifts every ally's crit on every bucket.
//   Y6    = burstCast → enemy flatDamage 348.73 (burst bucket). The AoE clause collapses to the
//           single boss; the B1 cast precedes the FB window, so the nuke never takes the +50%
//           FB major.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   Y1  nearest-wrong = burstCast trigger. Pinned by the application frames equalling the
//       fullBurstStart frames and NOT the (strictly earlier) yan burstCast frames; the
//       counterfactual provably lands on the cast frames instead.
//   Y2  chargeDamagePct feeds ONLY charged hits (the charge bucket): yan (RL), ada (RL) and helm
//       (SR) normals move on removal, crown (MG — no charge hits) is the byte-exact negative
//       control, and no unit's skill/burst buckets move. Magnitude/target set/duration pinned
//       from the buffApply log (21.55, all 4 allies per firing, 10s expiry).
//   Y3  nearest-wrong = an in-FB-gated reading ("charges during Full Burst only"). Shipped
//       applies from her FIRST pull (pre-FB) and keeps applying outside FB windows; the gated
//       counterfactual produces zero out-of-window applications.
//   Y4  nearest-wrong = a STACKING reading (each re-fire adds a stack). Pinned by stacks===1 and
//       maxStacks===1 on every application + the 5s expiry; the stacking counterfactual provably
//       grows stacks. All-ally reach pinned by the 4 distinct holders per firing.
//   Y5  the unscoped-stat reading is pinned by the skill-bucket negative: removing S2 moves the
//       crit rate of ada's SKILL hits (unscoped reaches every bucket), which a normal-scoped
//       encoding would leave untouched.
//   Y6  magnitude pinned exactly (348.73 — the nearest-wrong is the datamine level-1 value
//       172.4), once per cast, burst bucket, and fbMajorApplied false on every nuke.
//
// Fixture: yan (B1, 20s) / crown (B2, 20s) / ada (B3, 40s) / helm (B3, 40s), NEUTRAL boss (null
// — no elemental majors anywhere), focus yan (×2.5 gauge on her RL so her 20s-CD burst casts
// every ~20s chain). The two 40s B3s alternate, so the chain runs every ~20s and yan casts ~9
// times. Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const YAN = 0;
const N_ALLIES = 4; // yan/crown/ada/helm — `allies` includes self

const yanComp: { slugs: string[]; bossElement: null; focusSlug: string } = {
  slugs: ['yan', 'crown', 'ada', 'helm'],
  bossElement: null,
  focusSlug: 'yan',
};

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...yanComp,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const yanShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'yan');
const yanBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'yan');
const fbStartFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame);
/** Full Burst windows as [start, end) frame pairs. */
const fbWindows = (evs: SimEvent[]) =>
  evs
    .filter((e) => e.kind === 'fullBurstStart')
    .map((e) => [e.frame, (e as any).endFrame as number]);
const inAnyFb = (frame: number, windows: number[][]) =>
  windows.some(([s, e]) => frame >= s && frame < e);

/** yan's buffApply events for one stat. */
const yanApplies = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === YAN && b.stat === stat);

// ---- counterfactual / reference patches -------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** Y1 counterfactual: S1 keyed on her own burst CAST instead of Full Burst entry. */
const s1OnCast = withPatchedOverride('yan', (ov) => {
  const b = ov.skill1.find((x: any) => hasStat(x, 'chargeDamagePct'));
  if (!b) {
    throw new Error('yan S1 chargeDamagePct block missing — fixture is stale');
  }
  b.trigger = { kind: 'burstCast' };
});
/** Y2 reference: S1 removed entirely. */
const noS1 = withPatchedOverride('yan', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'chargeDamagePct'));
  if (ov.skill1.length === before) {
    throw new Error('yan S1 chargeDamagePct block missing — fixture is stale');
  }
});
/** Y3 counterfactual: S2 gated to Full Burst windows only. */
const s2InFbOnly = withPatchedOverride('yan', (ov) => {
  const blocks = ov.skill2.filter((b: any) => b.trigger.kind === 'shotFired');
  if (blocks.length < 2) {
    throw new Error('yan S2 shotFired blocks missing — fixture is stale');
  }
  for (const b of blocks) {
    b.fbGate = 'inFb';
  }
});
/** Y4 counterfactual: the ATK grant STACKS on every re-fire (up to 10). */
const s2Stacking = withPatchedOverride('yan', (ov) => {
  const b = ov.skill2.find((x: any) => hasStat(x, 'atkPct'));
  if (!b) {
    throw new Error('yan S2 atkPct block missing — fixture is stale');
  }
  b.effects.find((e: any) => e.stat === 'atkPct').maxStacks = 10;
});
/** Y4/Y5 reference: S2 removed entirely (both lines). */
const noS2 = withPatchedOverride('yan', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !hasStat(b, 'atkPct') && !hasStat(b, 'critRatePct')
  );
  if (ov.skill2.length === before) {
    throw new Error('yan S2 blocks missing — fixture is stale');
  }
});
/** Y6 reference: the burst damage line removed. */
const noBurstDmg = withPatchedOverride('yan', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !b.effects.some((e: any) => e.kind === 'flatDamage'));
  if (ov.burst.length === before) {
    throw new Error('yan burst flatDamage block missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const onCast = run({ yan: s1OnCast });
const s1Gone = run({ yan: noS1 });
const gated = run({ yan: s2InFbOnly });
const stacking = run({ yan: s2Stacking });
const s2Gone = run({ yan: noS2 });
const burstGone = run({ yan: noBurstDmg });

describe('yan — kit spec', () => {
  describe('Y1 — S1 activates at the beginning of FULL BURST, not on her own burst cast', () => {
    const applied = yanApplies(base.events, 'chargeDamagePct');
    const starts = fbStartFrames(base.events);
    const casts = yanBursts(base.events).map((c) => c.frame);

    it('fires once per Full Burst entry, exactly on the FB-start frames', () => {
      expect(starts.length, 'no Full Burst in the fixture').toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.frame))].sort((a, b) => a - b)).toEqual(
        [...new Set(starts)].sort((a, b) => a - b)
      );
    });

    it('her B1 cast strictly PRECEDES the Full Burst window it opens', () => {
      expect(casts.length).toBeGreaterThan(0);
      for (const c of casts) {
        const next = starts.find((s) => s >= c);
        expect(next, `cast at ${c} opened no FB window`).toBeDefined();
        expect(c).toBeLessThan(next!);
      }
    });

    it('DISCRIMINATING: a burstCast-keyed encoding lands on the cast frames, not FB entry', () => {
      const cfFrames = [
        ...new Set(yanApplies(onCast.events, 'chargeDamagePct').map((b) => b.frame)),
      ].sort((a, b) => a - b);
      expect(cfFrames).not.toEqual([...new Set(starts)].sort((a, b) => a - b));
    });
  });

  describe('Y2 — S1 grants Charge Damage ▲21.55% to ALL allies for 10 sec', () => {
    const applied = yanApplies(base.events, 'chargeDamagePct');

    it('is 21.55% for exactly 10 sec', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([21.55]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('reaches all four allies, including herself, at every firing', () => {
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
          `frame ${frame} reached ${holders.size} allies, expected ${N_ALLIES}`
        ).toBe(N_ALLIES);
      }
    });

    it('pays off ONLY on charged hits: yan/ada/helm normals move, crown is byte-exact', () => {
      // crown deals no charge-bucket damage (MG normals; skill/burst buckets never take
      // chargeDamagePct) — removing S1 must not change her total by a point.
      expect(base.totals.crown).toBe(s1Gone.totals.crown);
      for (const s of ['yan', 'ada', 'helm']) {
        expect(
          base.totals[s],
          `${s} has charged hits and must profit from S1`
        ).not.toBe(s1Gone.totals[s]);
      }
    });

    it('moves no skill or burst bucket (charge-bucket scoping), team-wide', () => {
      const rates = (evs: SimEvent[], bucket: Damage['bucket']) => {
        const out: Record<string, number> = {};
        for (const d of dmg(evs)) {
          if (d.bucket === bucket) {
            out[`${d.slug}:${d.amount}`] = (out[`${d.slug}:${d.amount}`] ?? 0) + 1;
          }
        }
        return out;
      };
      expect(rates(base.events, 'skill')).toEqual(rates(s1Gone.events, 'skill'));
      expect(rates(base.events, 'burst')).toEqual(rates(s1Gone.events, 'burst'));
    });
  });

  describe('Y3 — S2 fires on EVERY full-charge attack (every RL trigger pull)', () => {
    const shots = yanShots(base.events);
    const applied = yanApplies(base.events, 'atkPct');

    it('every yan pull IS a full charge (RL)', () => {
      expect(shots.length).toBeGreaterThan(0);
      expect(shots.every((s) => s.charged)).toBe(true);
    });

    it('applies at HER shot cadence, once per pull per ally', () => {
      expect(
        applied.length,
        `${applied.length} applications vs ${shots.length} pulls × ${N_ALLIES} allies`
      ).toBeGreaterThanOrEqual(Math.floor(shots.length * N_ALLIES * 0.9));
    });

    it('starts on her FIRST pull (pre-FB) and keeps applying outside Full Burst', () => {
      const windows = fbWindows(base.events);
      const first = Math.min(...applied.map((b) => b.frame));
      expect(
        first,
        'first application must precede the first Full Burst window'
      ).toBeLessThan(Math.min(...windows.map(([s]) => s)));
      expect(
        first,
        'no application before her first shot — a passive/frame-0 encoding applies ' +
          'before any Full Charge has landed (S2b claude-fable-5 reconciliation)'
      ).toBeGreaterThanOrEqual(Math.min(...shots.map((s) => s.frame)));
      expect(
        applied.some((b) => !inAnyFb(b.frame, windows)),
        'a purely in-FB reading produces no out-of-window applications'
      ).toBe(true);
    });

    it('DISCRIMINATING: an in-FB-gated reading applies only inside Full Burst windows', () => {
      const windows = fbWindows(gated.events);
      const gatedApplies = yanApplies(gated.events, 'atkPct');
      expect(gatedApplies.length).toBeGreaterThan(0);
      expect(gatedApplies.every((b) => inAnyFb(b.frame, windows))).toBe(true);
      expect(
        gatedApplies.length,
        'the gated reading must produce strictly fewer applications than shipped'
      ).toBeLessThan(applied.length);
    });
  });

  describe('Y4 — S2 grants ATK ▲2.77% for 5 sec, refreshed without stacking', () => {
    const applied = yanApplies(base.events, 'atkPct');

    it('is 2.77% for exactly 5 sec', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([2.77]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
    });

    it('never stacks: every application sits at stacks 1 of maxStacks 1', () => {
      expect([...new Set(applied.map((b) => b.stacks))]).toEqual([1]);
      expect([...new Set(applied.map((b) => b.maxStacks))]).toEqual([1]);
    });

    it('reaches all four allies at every firing', () => {
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied) {
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      }
      for (const [frame, holders] of perFrame) {
        expect(holders.size, `frame ${frame}`).toBe(N_ALLIES);
      }
    });

    it('is live: removing S2 moves EVERY ally\'s total', () => {
      for (const s of ['yan', 'crown', 'ada', 'helm']) {
        expect(base.totals[s], s).not.toBe(s2Gone.totals[s]);
      }
    });

    it('DISCRIMINATING: a stacking reading grows stacks past 1', () => {
      const stacked = yanApplies(stacking.events, 'atkPct');
      expect(Math.max(...stacked.map((b) => b.stacks))).toBeGreaterThan(1);
    });
  });

  describe('Y5 — S2 grants UNSCOPED Critical Rate ▲1.33% for 5 sec', () => {
    const applied = yanApplies(base.events, 'critRatePct');

    it('is 1.33% for exactly 5 sec, all four allies', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([1.33]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied) {
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      }
      for (const [, holders] of perFrame) {
        expect(holders.size).toBe(N_ALLIES);
      }
    });

    it('is UNSCOPED: it lifts crit even on skill-bucket hits (ada grenades)', () => {
      const skillCrit = (evs: SimEvent[]) =>
        dmg(evs)
          .filter((d) => d.slug === 'ada' && d.bucket === 'skill' && d.critEligible)
          .map((d) => d.critRate.toFixed(9));
      expect(skillCrit(base.events)).not.toEqual(skillCrit(s2Gone.events));
    });
  });

  describe('Y6 — burst "Fat Cat": 348.73% of final ATK, once per cast, no FB major', () => {
    const nukes = dmg(base.events).filter(
      (d) => d.slug === 'yan' && d.srcSlot === 'burst'
    );
    const casts = yanBursts(base.events);

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(casts.length).toBeGreaterThan(0);
      expect(nukes.length).toBe(casts.length);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([348.73]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the B1 cast lands before FB opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied)).toEqual([]);
    });

    it('is live: removing it deletes exactly her burst-bucket damage', () => {
      expect(
        dmg(burstGone.events).filter((d) => d.slug === 'yan' && d.srcSlot === 'burst')
      ).toEqual([]);
      expect(nukes.length).toBeGreaterThan(0);
    });
  });
});
