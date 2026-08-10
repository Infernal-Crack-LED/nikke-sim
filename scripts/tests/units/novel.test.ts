// PER-UNIT KIT SPEC — `novel` (Novel, Defender/SMG/Iron, Burst II, cd 20s). Kit-autonomy
// gauntlet 2026-08-03 (test-first re-derivation). NOTE: this is a FROM-SCRATCH unit — there was
// no shipped override before this gauntlet (simSupported was false), so the harness cannot even
// load her until src/skills/overrides/novel.json exists. The override was authored first (the
// faithful encoding under test); every assertion below PINS a kit line GREEN vs that override and
// RED vs the nearest-wrong counterfactual (withPatchedOverride), so the file still discriminates
// exactly as a verification gauntlet would.
//
// Kit (blablalink prose, data/characters.json → characters.novel.skills), max level:
//   S1 ■ 3 enemies with the highest final DEF: 52.36% of final ATK as damage (10s CD).    [N1]
//      ■ those enemies: DEF ▼ 7.05% for 5 sec.                            [UNMODELED — no primitive]
//   S2 ■ every 100 landed normal attacks → self "Cornucopia":
//        DEF ▲ 13.5%, stacks up to 5 times, lasts 15 sec.                                 [N2]
//   BU ■ the 1 enemy with the highest final ATK: 330.61% of final ATK as Burst damage.    [N3]
//      ■ Cornucopia at max stacks → 1 enemy: Damage Taken ▲ 67.5% for 5 sec.              [N4/N5]
//
// Modeling posture (see the override note + caveats for the full story):
//   * Cornucopia is her identity and the burst GATE: one hitCount:100 block builds (a) the literal
//     defPct 13.5/maxStacks 5/15s stack buff (damage-inert in v1 — self DEF never feeds own
//     damage) and (b) a +1 resource 'cornucopia' (pool 0..5, soda Golden-Chip pattern) because the
//     engine has no own-buff-stack gate — the burst's Damage-Taken mark reads resourceGate min:5.
//   * The S1 DEF▼ enemy debuff is UNMODELED (no dynamic enemy-DEF-reduction primitive; mast
//     Sea-Breeze precedent; ~0.02% team damage) — verbatim in unmodeled, NOT asserted here.
//   * 'Affects 3/1 enemy unit(s) with the highest final DEF/ATK' targeting clauses collapse to the
//     single scope-lock boss ({kind:'enemy'} documented stand-in; v1 fields one immortal enemy).
//
// Fixture: a custom B1/B2/B3 chain — liter(B1) / novel(B2) / modernia(B3) / helm(B3), boss Fire,
// focus novel (mast precedent: the standard controlComp cannot be used — crown is also Burst II
// and would take the stage-II slot, leaving novel ZERO casts). Here novel is the SOLE Burst II,
// so she casts every Full Burst (10 casts / 180s). The fixture's opening chain fires early
// (~4.9s), BEFORE Cornucopia can reach max stacks (~29.7s = 5 × 100 shots), so the first two
// casts land without the Damage-Taken mark and the remaining eight carry it — the gate is
// observably load-bearing in BOTH directions. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['liter', 'novel', 'modernia', 'helm'] as const;
/** slot order: liter 0 / novel 1 / modernia 2 / helm 3. */
const NOVEL = 1;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Fire',
    focusSlug: 'novel',
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
const novelShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'novel');
const novelCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'novel'
  );
/** The stage-3 cast of each rotation — when the Full Burst chain completes. */
const stage3Casts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.stage === 3);

/** Cornucopia DEF▲ stack applications (the S2 line's observable). */
const cornucopiaApplies = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === NOVEL && b.stat === 'defPct' && b.value === 13.5
  );
/** The boss-held Damage-Taken marks (caster/target null = the enemyBuffs list). */
const marks = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.stat === 'damageTakenPct' && b.value === 67.5);
const s1Procs = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'novel' && d.srcSlot === 'skill1');
const nukes = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'novel' && d.srcSlot === 'burst');

// ---- counterfactuals (nearest-wrong model each assertion must discriminate against) -----------
/** N1 counterfactual: the S1 proc on a 20s cycle instead of the datamined 10s CD. */
const novelSlowS1 = withPatchedOverride('novel', (ov) => {
  const b = ov.skill1.find((x: any) => x.trigger?.kind === 'interval');
  if (!b || b.trigger.sec !== 10) {
    throw new Error('novel S1 interval:10 block missing — fixture is stale');
  }
  b.trigger.sec = 20;
});
/** N2 isolation: the DEF▲ stack buff removed, the cornucopia RESOURCE kept — defPct is inert in
 *  v1, so this must move NO unit's total by a single point (proves inertness, not assumes it). */
const novelNoDefBuff = withPatchedOverride('novel', (ov) => {
  for (const b of ov.skill2) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.stat !== 'defPct');
    if (b.effects.length === before) {
      throw new Error('novel S2 defPct effect missing — fixture is stale');
    }
  }
});
/** N2 counterfactual: Cornucopia capped at ONE stack (no 5-stack accrual). */
const novelOneStack = withPatchedOverride('novel', (ov) => {
  let n = 0;
  for (const b of ov.skill2) {
    for (const e of b.effects) {
      if (e.stat === 'defPct') {
        e.maxStacks = 1;
        n++;
      }
    }
  }
  if (!n) {
    throw new Error('novel S2 defPct effect missing — fixture is stale');
  }
});
/** N5 counterfactual: the Damage-Taken mark UNGATED (fires on every cast, even before Cornucopia
 *  reaches max stacks) — the always-on model the kit text explicitly forbids. */
const novelUngatedMark = withPatchedOverride('novel', (ov) => {
  const b = ov.burst.find(
    (x: any) =>
      x.resourceGate?.name === 'cornucopia' &&
      x.effects.some((e: any) => e.stat === 'damageTakenPct')
  );
  if (!b) {
    throw new Error(
      'novel burst cornucopia-gated mark missing — fixture is stale'
    );
  }
  delete b.resourceGate;
});
/** N3 counterfactual: the burst nuke keyed to fullBurstEnter (lands at the stage-3 completion of
 *  each rotation, ~0.5s after novel's own cast) instead of her own burstCast. */
const novelNukeOnFbEnter = withPatchedOverride('novel', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (!b || b.trigger.kind !== 'burstCast') {
    throw new Error('novel burst nuke block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const slowS1 = run({ novel: novelSlowS1 });
const noDefBuff = run({ novel: novelNoDefBuff });
const oneStack = run({ novel: novelOneStack });
const ungated = run({ novel: novelUngatedMark });
const nukeFbEnter = run({ novel: novelNukeOnFbEnter });

describe('novel — kit spec', () => {
  it('fixture sanity: novel is the sole Burst II and casts every Full Burst', () => {
    expect(novelCasts(base.events).length).toBeGreaterThanOrEqual(8);
  });

  describe('N1 — S1 deals 52.36% of final ATK on the datamined 10s skill CD', () => {
    const procs = s1Procs(base.events);

    it('fires every 10s (first at t=10), at the kit magnitude, in the skill bucket', () => {
      expect(procs.length).toBeGreaterThanOrEqual(16);
      expect([...new Set(procs.map((d) => d.atkPct))]).toEqual([52.36]);
      expect([...new Set(procs.map((d) => d.bucket))]).toEqual(['skill']);
      expect(procs[0].frame).toBe(10 * FPS);
      for (let i = 1; i < procs.length; i++) {
        expect(procs[i].frame - procs[i - 1].frame, '10s cadence').toBe(
          10 * FPS
        );
      }
    });

    it('is crit-eligible (engine rider default; prose states no exemption)', () => {
      expect([...new Set(procs.map((d) => d.critEligible))]).toEqual([true]);
    });

    it('DISCRIMINATING: a 20s cycle fires on a 20s cadence and strictly fewer procs', () => {
      const half = s1Procs(slowS1.events);
      expect(half.length).toBeGreaterThan(0);
      expect(half.length).toBeLessThan(procs.length);
      for (let i = 1; i < half.length; i++) {
        expect(half[i].frame - half[i - 1].frame).toBe(20 * FPS);
      }
    });
  });

  describe('N2 — Cornucopia: DEF ▲13.5% per 100 landed normal attacks, 5-stack cap, 15s window', () => {
    const applies = cornucopiaApplies(base.events);

    it('accrues exactly one stack per 100 shots (the kth application rides the 100k-th shot)', () => {
      const shots = novelShots(base.events);
      expect(applies.length).toBeGreaterThanOrEqual(5);
      for (let k = 1; k <= 5; k++) {
        const frame = applies[k - 1].frame;
        const firedByFrame = shots.filter((s) => s.frame <= frame).length;
        expect(
          firedByFrame,
          `stack ${k} applied with ${firedByFrame} shots fired, expected ${100 * k}`
        ).toBe(100 * k);
      }
    });

    it('ramps 1→5 stacks then holds the cap, self-targeted, each application a 15s window', () => {
      expect(applies.slice(0, 5).map((b) => b.stacks)).toEqual([1, 2, 3, 4, 5]);
      expect([...new Set(applies.map((b) => b.maxStacks))]).toEqual([5]);
      expect([...new Set(applies.map((b) => b.targetIdx))]).toEqual([NOVEL]);
      for (const b of applies) {
        expect(b.expiresFrame! - b.frame, '15s duration').toBe(15 * FPS);
      }
      // every post-cap application HOLDS stacks=5 (refresh keeps the pile pinned well past the
      // 45s the kit's 15s-per-stack reading would need if stacks expired independently — S2b)
      expect([...new Set(applies.slice(5).map((b) => b.stacks))]).toEqual([5]);
      expect(applies[applies.length - 1].sec).toBeGreaterThan(45);
    });

    it('DISCRIMINATING: a one-stack cap never reaches the 5-stack ceiling', () => {
      const capped = cornucopiaApplies(oneStack.events);
      expect(capped.length).toBeGreaterThan(0);
      expect(Math.max(...capped.map((b) => b.stacks))).toBe(1);
    });

    it('is damage-INERT in v1 (self DEF never feeds own damage): removing it moves no total', () => {
      expect(base.totals).toEqual(noDefBuff.totals);
    });
  });

  describe('N3 — burst nuke: 330.61% of final ATK on HER cast, before the Full Burst window', () => {
    const hits = nukes(base.events);
    const casts = novelCasts(base.events);

    it('fires once per novel cast, at the kit magnitude, in the burst bucket', () => {
      expect(hits.length).toBe(casts.length);
      expect(hits.length).toBeGreaterThan(0);
      expect([...new Set(hits.map((d) => d.atkPct))]).toEqual([330.61]);
      expect([...new Set(hits.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('lands on her own burstCast frames (stage 2), not at Full Burst completion (stage 3)', () => {
      const castFrames = new Set(casts.map((c) => c.frame));
      const s3Frames = new Set(stage3Casts(base.events).map((c) => c.frame));
      for (const d of hits) {
        expect(castFrames.has(d.frame), 'nuke rides her own cast').toBe(true);
        expect(s3Frames.has(d.frame), 'not the stage-3 completion frame').toBe(
          false
        );
      }
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(hits.filter((d) => d.fbMajorApplied)).toEqual([]);
    });

    it('DISCRIMINATING: a fullBurstEnter-keyed nuke lands at the stage-3 frames instead', () => {
      const moved = nukes(nukeFbEnter.events);
      const castFrames = new Set(casts.map((c) => c.frame));
      expect(moved.length).toBeGreaterThan(0);
      expect(moved.some((d) => castFrames.has(d.frame))).toBe(false);
    });
  });

  describe('N4 — the Cornucopia-gated mark: Damage Taken ▲67.5% on the boss for 5s', () => {
    const applied = marks(base.events);

    it('is 67.5% for exactly 5s, boss-held (no unit caster/target)', () => {
      expect(applied.length).toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
        expect(b.casterIdx).toBeNull();
        expect(b.targetIdx).toBeNull();
      }
    });

    it('every mark lands on one of novel burstCast frames', () => {
      const castFrames = new Set(novelCasts(base.events).map((c) => c.frame));
      for (const b of applied) {
        expect(castFrames.has(b.frame), `mark at frame ${b.frame}`).toBe(true);
      }
    });

    it('is a LIVE team-wide amp: hits inside a window carry the taken multiplier, outside carry none', () => {
      const all = dmg(base.events);
      const inWindow = all.filter((d) =>
        applied.some((b) => d.frame >= b.frame && d.frame < b.frame + 5 * FPS)
      );
      const outside = all.filter(
        (d) =>
          !applied.some(
            (b) => d.frame >= b.frame && d.frame < b.frame + 5 * FPS
          )
      );
      expect(
        [...new Set(inWindow.map((d) => d.mult.taken))],
        'in-window hits take 1.675 (some same-frame cast hits resolve pre-buff and stay 1)'
      ).toEqual([1, 1.675]);
      expect(outside.length).toBeGreaterThan(0);
      expect([...new Set(outside.map((d) => d.mult.taken))]).toEqual([1]);
    });
  });

  describe('N5 — the gate is load-bearing: the mark requires Cornucopia at max stacks', () => {
    const casts = novelCasts(base.events);
    const applies = cornucopiaApplies(base.events);
    const applied = marks(base.events);
    const fifthStack = applies.find((b) => b.stacks === 5)!;

    it('the fixture exercises BOTH sides of the gate (early casts exist, 5th stack accrues mid-fight)', () => {
      expect(fifthStack).toBeDefined();
      expect(casts.some((c) => c.frame < fifthStack.frame)).toBe(true);
      expect(casts.some((c) => c.frame > fifthStack.frame)).toBe(true);
    });

    it('casts before the 5th stack land WITHOUT the mark; every cast after carries it', () => {
      for (const c of casts) {
        const marked = applied.some((b) => Math.abs(b.frame - c.frame) < FPS);
        if (c.frame < fifthStack.frame) {
          expect(marked, `cast at ${c.sec.toFixed(2)}s is pre-max-stacks`).toBe(
            false
          );
        } else {
          expect(
            marked,
            `cast at ${c.sec.toFixed(2)}s is post-max-stacks`
          ).toBe(true);
        }
      }
    });

    it('mark count == post-max-stacks cast count (nothing extra, nothing missing)', () => {
      const postCasts = casts.filter((c) => c.frame > fifthStack.frame).length;
      expect(applied.length).toBe(postCasts);
    });

    it('DISCRIMINATING: an ungated mark fires on EVERY cast, including the early ones', () => {
      const allMarks = marks(ungated.events);
      expect(allMarks.length).toBe(novelCasts(ungated.events).length);
      expect(allMarks.length).toBeGreaterThan(marks(base.events).length);
    });
  });

  describe('N6 — S1 DEF ▼7.05%/5s rides the enemy defPct channel (encoded 2026-08-10)', () => {
    // boss-held debuff: emitted with novel's skill1 key prefix, 5s window, one per S1 proc.
    // The channel's damage math is pinned by scripts/tests/engine/enemy-def-debuff.test.ts
    // (reuse-before-derive) — this group pins only novel's magnitude, cadence, and window.
    const shaves = buffs(base.events).filter(
      (b) => b.stat === 'defPct' && b.value === -7.05
    );

    it('one -7.05 boss debuff per S1 proc, same frames, 5s window, from the skill1 slot', () => {
      const procs = s1Procs(base.events);
      expect(shaves.length).toBe(procs.length);
      expect(shaves.map((b) => b.frame)).toEqual(procs.map((d) => d.frame));
      for (const b of shaves) {
        expect(b.key.startsWith(`${NOVEL}:skill1:`)).toBe(true);
        expect(b.expiresFrame! - b.frame).toBe(5 * 60);
      }
    });
  });
});
