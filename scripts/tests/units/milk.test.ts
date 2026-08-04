// PER-UNIT KIT SPEC — `milk` (Milk (Treasure), Attacker/SR/Water, Burst I, cd 40s, ammo 6,
// chargeFrames 60, Tetra). Kit-autonomy gauntlet 2026-08-03. FROM-SCRATCH build (epinel
// precedent): no override existed, so the SHIPPED state these tests assert against is the
// empty-baseline override (all slots []) — every line is RED against it and goes GREEN in S3.
//
// EXACT SLUG: slug `milk` IS the Treasure variant ("treasure": true, name "Milk (Treasure)"
// in data/characters.json). The slug-disambiguation lint trips on the bare "Milk" base name
// (shared with milk-blooming-bunny, SR/Iron "mbb"/"bmilk") — unavoidable, because the slug
// itself is the base word and the unit has no approved nickname; the variant is confirmed
// (mbb's gauntlet documents the identical unavoidable trip). NOT milk-blooming-bunny.
//
// One assertion group per KIT LINE (K1..K7), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` builds COUNTERFACTUALS only (the nearest wrong model each
// assertion must discriminate against) and ISOLATES the burst-heal window (teammate heals
// would otherwise mask it) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['milk'].skills; L10 values):
//   S1 ■ every 20 sec → 3 ally units with the highest FINAL ATK: ATK ▲31.83% for 10 sec    [K1]
//      ■ start of battle → self: Cooldown of Burst Skill ▼20 sec continuously               [K2]
//   S2 ■ above 80% HP → all allies: Critical Damage ▲11.13% continuously                    [K3]
//      ■ attacking with Full Charge for 10 time(s) → all allies: Burst CD ▼2.83 sec         [K4]
//   BU ■ 1 enemy with the highest final DEF: 367.34% of final ATK as Burst Skill damage     [K5]
//      ■ all allies: Recovers 16.16% of attack damage as HP over 10 sec                    [K6]
//      ■ all allies: Incoming healing ▲75.5% for 10 sec                                     [K7]
//
// UNMODELED (documented, no assertion):
//   • K7 "Incoming healing ▲75.5% for 10 sec" — no incoming-healing StatKey exists and the
//     engine models no HP amounts (heals are event-only), so the buff could only multiply
//     event-less nothing. Inert in v1; verbatim in override.unmodeled.
//   • K6 magnitude 16.16% — the engine `heal` carries no HP amount by design (types.ts);
//     only the 10-SECOND WINDOW of recovery events is asserted (helm H8 precedent). The
//     number rides verbatim in the override note/unmodeled, not fudged into a fake amount.
//
// ENCodings UNDER TEST:
//   K1  interval:20 → alliesTopAtk{count:3, byFinalAtk:true} → atkPct 31.83/10s. Self is
//       eligible (no "except self" clause — maxwell precedent). byFinalAtk per the A3
//       literal-word rule: the kit says "highest FINAL ATK" (maxwell/miranda precedent).
//       TREASURE discrimination: the pre-treasure base kit targeted 2 allies (the stale
//       skill1_detail still reads "2 allies") — count:2 is the nearest-wrong counterfactual,
//       the same shape as helm H5's treasure-value pin.
//   K2  charFixes.burstCooldownSec 20 — the engine's channel for "this unit's burst cooldown
//       IS N seconds" (prepare.ts subtracts CDR from the charFixes-corrected CD; it is the
//       ONLY permanent-CD hook — a burstCdr block is a one-shot refund of REMAINING CD and
//       cannot express "▼20s continuously"). "Activates at the start of battle" is trivially
//       satisfied: the lowered CD is live from frame 0. Observable: her burst cadence.
//   K3  passive → allies → critDamagePct 11.13, no durationSec. The >80% HP gate is
//       trivially always-true in v1: there is no HP pool and the boss deals no damage, so
//       milk sits at 100% HP the whole fight (mast's HP<70% always-on precedent).
//   K4  chargeCounter:10 → allies → burstCdr 2.83 (a real per-10-full-charges refund; the
//       counter cycles — scalar count = same threshold every phase). For an SR every pull IS
//       a full charge, so a hitCount:10 trigger would be observationally IDENTICAL on this
//       unit — the discriminating counterfactual is therefore block-REMOVAL, not a trigger
//       swap (honestly noted; the chargeCounter-vs-hitCount split is engine-tested elsewhere).
//   K5  burstCast → enemy → flatDamage 367.34. "1 enemy with the highest final DEF" is
//       trivially the partless solo boss. TRIGGER NOTE: milk is the fixture's only B1, so she
//       casts EVERY Full Burst — burstCast vs fullBurstEnter fire the same COUNT here and are
//       instead discriminated by TIMING: a burstCast nuke lands before the FB window opens
//       (never takes the +50% major); a fullBurstEnter nuke lands inside it (does).
//   K6  burstCast → allies → heal{ticks:10, intervalSec:1} — a 10-second window of recovery
//       events (helm H8 pattern), asserted via crown's "when recovery takes effect" consumer
//       in an ISOLATED run where teammate heal sources (crown self-heal, helm S1/burst heals)
//       are patched out, leaving milk's burst heal as the only recovery source.
//
// FIXTURE: milk/crown/ada/helm, boss Fire (water advantage), focus ada. milk is the SOLE B1:
// with the treasure self-CDR her effective 20s CD covers stage I alone (crown B2 20s; ada +
// helm B3 40s alternate) — the team Full-Bursts every ~15-20s, so her burst-gated lines get
// many casts to be measured over 180s. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['milk', 'crown', 'ada', 'helm'] as const;
const MILK = 0;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const removeBlock = (ov: any, slot: string, pred: (b: any) => boolean) => {
  const before = ov[slot].length;
  ov[slot] = ov[slot].filter((b: any) => !pred(b));
  if (ov[slot].length === before) {
    throw new Error(`milk ${slot} block missing — fixture is stale`);
  }
};

/** K2 counterfactual: the un-treasured 40s burst cooldown (no self-CDR). */
const milkNoCdr = withPatchedOverride('milk', (ov) => {
  if (!ov.charFixes?.burstCooldownSec) {
    throw new Error(
      'milk charFixes.burstCooldownSec missing — fixture is stale'
    );
  }
  delete ov.charFixes.burstCooldownSec;
});
/** K1 counterfactual: the pre-treasure base-kit scope (2 allies, per the stale skill1_detail). */
const milkTop2 = withPatchedOverride('milk', (ov) => {
  const t = ov.skill1.find((b: any) => b.target?.kind === 'alliesTopAtk');
  if (!t) {
    throw new Error('milk K1 block missing — fixture is stale');
  }
  t.target.count = 2;
});
/** K1 counterfactual: STATIC base-ATK ranking (kit says FINAL ATK → byFinalAtk:true is shipped). */
const milkStaticRank = withPatchedOverride('milk', (ov) => {
  const t = ov.skill1.find((b: any) => b.target?.kind === 'alliesTopAtk');
  if (!t) {
    throw new Error('milk K1 block missing — fixture is stale');
  }
  delete t.target.byFinalAtk;
});
/** K3 counterfactual: self-only crit damage. */
const milkCritSelf = withPatchedOverride('milk', (ov) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'critDamagePct')
  );
  if (!b) {
    throw new Error('milk K3 block missing — fixture is stale');
  }
  b.target = { kind: 'self' };
});
/** K4 counterfactual: the full-charge counter removed (no team burst-CDR refunds). */
const milkNoK4 = withPatchedOverride('milk', (ov) => {
  removeBlock(ov, 'skill2', (b) => b.trigger?.kind === 'chargeCounter');
});
/** K5 counterfactual: nuke keyed to fullBurstEnter (lands INSIDE the FB window). */
const milkFbEnterNuke = withPatchedOverride('milk', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (!b) {
    throw new Error('milk K5 block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
/** K6 counterfactual: single instant recovery event instead of the 10-second window. */
const milkInstantHeal = withPatchedOverride('milk', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'heal');
  if (!e) {
    throw new Error('milk K6 heal missing — fixture is stale');
  }
  delete e.ticks;
  delete e.intervalSec;
});
/** K6 counterfactual: burst heal removed entirely. */
const milkNoHeal = withPatchedOverride('milk', (ov) => {
  removeBlock(ov, 'burst', (b) =>
    b.effects.some((e: any) => e.kind === 'heal')
  );
});
/** K6 isolation: strip teammate heal sources so milk's burst heal is the only recovery
 *  feed — crown's self-heal (skill2) and helm's S1 per-pull + burst heals. Same isolation
 *  pattern as helm.test.ts H8 (crownNoHeal + helmNoS1Heal), extended to helm's burst heal. */
const hasHeal = (b: any) => b.effects.some((e: any) => e.kind === 'heal');
const crownNoHeal = withPatchedOverride('crown', (ov) => {
  removeBlock(ov, 'skill2', hasHeal);
});
const helmNoHeals = withPatchedOverride('helm', (ov) => {
  removeBlock(ov, 'skill1', hasHeal);
  removeBlock(ov, 'burst', hasHeal);
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noCdr = run({ milk: milkNoCdr });
const top2 = run({ milk: milkTop2 });
const staticRank = run({ milk: milkStaticRank });
const critSelf = run({ milk: milkCritSelf });
const noK4 = run({ milk: milkNoK4 });
const fbEnterNuke = run({ milk: milkFbEnterNuke });
const isolated = run({ crown: crownNoHeal, helm: helmNoHeals });
const isolatedNoHeal = run({
  milk: milkNoHeal,
  crown: crownNoHeal,
  helm: helmNoHeals,
});
const isolatedInstant = run({
  milk: milkInstantHeal,
  crown: crownNoHeal,
  helm: helmNoHeals,
});

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const casts = (evs: SimEvent[], slug: string) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === slug);
const castFrames = (evs: SimEvent[], slug: string) =>
  casts(evs, slug).map((c) => c.frame);
const gapsSec = (frames: number[]) =>
  frames.slice(1).map((f, i) => (f - frames[i]) / FPS);

const milkAtkBuffs = buffs(base.events).filter(
  (b) => b.casterIdx === MILK && b.stat === 'atkPct'
);
const k1Frames = [...new Set(milkAtkBuffs.map((b) => b.frame))].sort(
  (a, b) => a - b
);
const k1HoldersAt = (evs: SimEvent[], frame: number) =>
  buffs(evs)
    .filter(
      (b) => b.casterIdx === MILK && b.stat === 'atkPct' && b.frame === frame
    )
    .map((b) => b.targetIdx)
    .filter((t): t is number => t !== null) // ally buffs never carry a null targetIdx
    .sort((a, b) => a - b);
const k1Signatures = (evs: SimEvent[]) =>
  k1Frames.map((f) => k1HoldersAt(evs, f).join(','));

/** Crown's recovery-consumer firing frames (her 'when recovery takes effect' team buff —
 *  one firing = one frame even though the block targets all allies; helm.test.ts pattern). */
const recoveryFrames = (evs: SimEvent[]): number[] =>
  [
    ...new Set(
      buffs(evs)
        .filter(
          (b) =>
            b.casterIdx === 1 &&
            b.stat === 'attackDamagePct' &&
            b.value === 20.99
        )
        .map((b) => b.frame)
    ),
  ].sort((a, b) => a - b);

describe('milk (Treasure) — kit spec', () => {
  describe('K1 — S1 every 20s: ATK ▲31.83%/10s on the 3 highest-FINAL-ATK allies', () => {
    it('fires every 20 sec from t=20 (interval cadence, first after one cooldown)', () => {
      expect(k1Frames).toEqual(
        [20, 40, 60, 80, 100, 120, 140, 160].map((s) => s * FPS)
      );
    });

    it('reaches exactly 3 allies per firing, self eligible (no "except self" clause)', () => {
      expect(k1Frames.length).toBeGreaterThan(0);
      for (const f of k1Frames) {
        const holders = k1HoldersAt(base.events, f);
        expect(
          holders.length,
          `frame ${f} reached ${holders.length} allies, expected 3`
        ).toBe(3);
      }
      const everTargeted = new Set(milkAtkBuffs.map((b) => b.targetIdx));
      expect(everTargeted.has(MILK)).toBe(true);
    });

    it('is the TREASURE scope 3, not the pre-treasure base-kit 2', () => {
      const top2Sizes = k1Frames.map((f) => k1HoldersAt(top2.events, f).length);
      expect([...new Set(top2Sizes)]).toEqual([2]);
      expect(
        k1Frames.map((f) => k1HoldersAt(base.events, f).length)
      ).not.toEqual(top2Sizes);
    });

    it('ranks by LIVE final ATK (byFinalAtk), not static base ATK', () => {
      // The live ranking genuinely re-orders across the fight as buffed ATK moves…
      expect(new Set(k1Signatures(base.events)).size).toBeGreaterThan(1);
      // …and diverges from the static-ranking counterfactual at some firing.
      expect(k1Signatures(base.events)).not.toEqual(
        k1Signatures(staticRank.events)
      );
    });

    it('grants 31.83% for exactly 10 sec', () => {
      expect([...new Set(milkAtkBuffs.map((b) => b.value))]).toEqual([31.83]);
      for (const b of milkAtkBuffs) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
  });

  describe('K2 — S1 battle-start self: Burst CD ▼20 sec continuously (treasure)', () => {
    const shippedFrames = castFrames(base.events, 'milk');
    const noCdrFrames = castFrames(noCdr.events, 'milk');

    it('casts strictly more bursts than the un-treasured 40s cooldown', () => {
      expect(shippedFrames.length).toBeGreaterThan(0);
      expect(shippedFrames.length).toBeGreaterThan(noCdrFrames.length);
    });

    it('never waits a full un-treasured cycle: every inter-cast gap is under 20s', () => {
      for (const g of gapsSec(shippedFrames)) {
        expect(g).toBeLessThan(20);
      }
    });

    it('DISCRIMINATING: the 40s counterfactual never breaks below a 20s gap', () => {
      for (const g of gapsSec(noCdrFrames)) {
        expect(g).toBeGreaterThan(20);
      }
    });
  });

  describe('K3 — S2 above 80% HP: teamwide Critical Damage ▲11.13% continuously', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === MILK && b.stat === 'critDamagePct'
    );

    it('is live from frame 0 for all four allies (HP gate trivially true — no HP pool in v1)', () => {
      expect(applied.length).toBe(SLUGS.length);
      expect([...new Set(applied.map((b) => b.frame))]).toEqual([0]);
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([
        0, 1, 2, 3,
      ]);
    });

    it('is 11.13 continuously (no expiry)', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([11.13]);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it('DISCRIMINATING: a self-only encoding reaches only milk', () => {
      const selfOnly = buffs(critSelf.events).filter(
        (b) => b.casterIdx === MILK && b.stat === 'critDamagePct'
      );
      expect([...new Set(selfOnly.map((b) => b.targetIdx))]).toEqual([MILK]);
    });
  });

  describe('K4 — S2 every 10 full charges: all allies Burst CD ▼2.83 sec', () => {
    it('accelerates milk herself ("all allies" includes the caster)', () => {
      const shipped = castFrames(base.events, 'milk');
      const without = castFrames(noK4.events, 'milk');
      expect(shipped.length).toBeGreaterThan(without.length);
    });

    it('accelerates the team rotation (teammate cast frames move)', () => {
      let moved = false;
      for (const slug of ['crown', 'ada', 'helm']) {
        if (
          JSON.stringify(castFrames(base.events, slug)) !==
          JSON.stringify(castFrames(noK4.events, slug))
        ) {
          moved = true;
        }
      }
      expect(moved).toBe(true);
    });
  });

  describe('K5 — burst nuke: 367.34% of final ATK on the highest-DEF enemy', () => {
    const nukes = dmg(base.events).filter(
      (d) => d.slug === 'milk' && d.srcSlot === 'burst'
    );

    it('fires once per cast at the kit magnitude, in the burst bucket', () => {
      const castCount = casts(base.events, 'milk').length;
      expect(castCount).toBeGreaterThan(0);
      expect(nukes.length).toBe(castCount);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([367.34]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied)).toEqual([]);
    });

    it('DISCRIMINATING: fullBurstEnter keying lands inside the FB window and takes the major', () => {
      const cf = dmg(fbEnterNuke.events).filter(
        (d) => d.slug === 'milk' && d.srcSlot === 'burst'
      );
      expect(cf.some((d) => d.fbMajorApplied)).toBe(true);
    });
  });

  describe('K6 — burst recovery: 16.16% of attack damage as HP OVER 10 SEC (event window)', () => {
    // In the isolated run milk's burst heal is the ONLY recovery source (crown's self-heal
    // and helm's S1/burst heals patched out), so every crown recovery-consumer firing is
    // attributable to a milk burst-heal tick. The HP AMOUNT (16.16%) is unmodeled by engine
    // design — only the window shape is assertable (helm H8 precedent).
    const FIGHT_FRAMES = 180 * FPS;
    const milkCasts = casts(isolated.events, 'milk').filter(
      (c) => c.frame + 10 * FPS <= FIGHT_FRAMES
    );
    const frames = recoveryFrames(isolated.events);

    it('isolation is clean: with the heal removed there are ZERO recovery events', () => {
      expect(recoveryFrames(isolatedNoHeal.events)).toEqual([]);
    });

    it('has bursts with a complete 10s window to measure', () => {
      expect(milkCasts.length).toBeGreaterThan(0);
    });

    it('keeps recovery firing across the whole 10 sec after each cast', () => {
      for (const cast of milkCasts) {
        const inWindow = frames.filter(
          (f) => f > cast.frame && f <= cast.frame + 10 * FPS
        );
        const spanSec = inWindow.length
          ? (inWindow[inWindow.length - 1] - cast.frame) / FPS
          : 0;
        expect(
          inWindow.length,
          `burst at ${(cast.frame / FPS).toFixed(2)}s produced ${inWindow.length} recovery ` +
            `firing(s) spanning ${spanSec.toFixed(1)}s — a single instant heal produces exactly 1`
        ).toBeGreaterThanOrEqual(8);
        expect(spanSec).toBeGreaterThanOrEqual(8);
      }
    });

    it('DISCRIMINATING: a single instant heal collapses each window to one firing', () => {
      const instantFrames = recoveryFrames(isolatedInstant.events);
      const perCast = milkCasts.map(
        (c) =>
          instantFrames.filter((f) => f >= c.frame && f <= c.frame + 10 * FPS)
            .length
      );
      for (const n of perCast) {
        expect(n).toBeLessThanOrEqual(1);
      }
    });
  });

  // K7 — "Incoming healing ▲75.5% for 10 sec" — UNMODELED: no incoming-healing stat exists
  // and heals carry no HP amount in v1, so the line is provably inert. Documented in the
  // override's unmodeled field; no assertion (a test here could only pin nothing).
});
