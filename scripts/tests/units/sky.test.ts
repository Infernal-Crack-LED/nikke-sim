// PER-UNIT KIT SPEC — `sky` (Sky; SR / Supporter / Iron / Elysion, Burst I, cd 40s, ammo 6,
// chargeFrames 60). NEW unit. Kit-autonomy gauntlet 2026-11-20. Tier 2 (a hold-charge trigger the
// sim cannot perform → a user-selected mode; a status-REMOVAL trigger; a self-stun; stacking).
//
// One assertion group per KIT LINE (K1..K7), asserted against the SHIPPED override loaded from disk.
// `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model each
// assertion must discriminate against).
//
// Kit (blablalink prose, data/characters.json → characters.sky.skills, SL10):
//   S1 ■ Full Charge maintained ≥1s while not in Defiant Spirit → all allies:
//        Defiant Spirit: debuff immunity ×1 for 5 sec, 3 times per battle               [K1 UNMODELED]
//      ■ Full Charge maintained ≥1s → self: Gains Pierce 40 sec; Pierce Damage ▲ 60% 40s [K2 mode]
//   S2 ■ entering Full Burst → all allies: ATK ▲ 20% of the skill user's ATK for 10 sec  [K3]
//      ■ High Tension is removed → all allies: Low Tension: ATK ▼ 10% of skill user's ATK 20s [K4]
//      ■ only when in Low Tension → self: Low Energy: Stuns for 20 sec                    [K5]
//   BU ■ all allies: High Tension: Pierce Damage ▲ 15% for 35 sec, stacks up to 3          [K6]
//      ■ self: ATK ▲ 50% for 35 sec                                                       [K7]
//
// The sim releases at full charge and never HOLDS it, so the two "Full Charge maintained for 1 or
// more seconds" lines cannot fire in-engine (the rapunzel-pure-grace / sin-swift-bunny precedent).
// K2 is a user-selected mode: 'Release' (default — the line never fires) vs 'Hold' (a player who
// holds at least once per 40s: Pierce + Pierce Damage ▲ 60% always up). K1 (debuff immunity) is
// defensive and hold-gated → recorded `unmodeled` verbatim.
//
// Why each assertion discriminates:
//   K2   Release: her shots carry no Damage-Up from Pierce Damage (not Pierce-tagged, no 60% buff).
//        Hold: every shot of hers is Pierce-tagged and carries the 60% (dmgUp ≥ 1.6), self only.
//        Counterfactuals: the mode gate dropped (60% live in Release), allies scope (5 holders).
//   K3   Keys to FULL BURST ENTRY — every FB, including the many where she did not cast (fixture B,
//        dorothy covers stage 1) — all 5 allies, 20% of HER static ATK as flat ATK, 10s.
//        Counterfactual: burstCast keying (only her casts).
//   K4   Keys to the LAPSE of her own High Tension window (35s after her latest cast). In fixture B
//        dorothy's burst-cooldown reduction brings two of her casts back INSIDE 35s, which refreshes
//        High Tension (no removal) — so Low Tension lands exactly twice, at cast+35s of the casts
//        NOT followed by an in-window re-cast. Counterfactual: burstCast + delaySec 35 (fires after
//        EVERY cast, 4×). All 5 allies, −10% of her ATK, 20s; counterfactual self scope (1 holder).
//   K5   She fires NOTHING for 20s from each lapse, fires before and after; allies keep firing.
//        Counterfactual: stun dropped (she fires inside the window).
//   K6   Each cast: 5 holders, Pierce Damage 15, 35s; a re-cast inside 35s STACKS (2) and refreshes,
//        a cast after a lapse restarts at 1. Feeds a Pierce-tagged ally (alice): removing it lowers
//        alice's total. Counterfactual maxStacks 1 (never 2).
//   K7   Self only, ATK 50, 35s, on each cast; counterfactual allies scope.
//
// Fixtures (deterministic, no seed; boss Fire, focus alice — a Pierce-tagged SR):
//   A: sky (sole B1) / crown (B2) / alice, helm (B3) — she casts every 40s, every window lapses.
//   B: sky / dorothy (B1 + per-reload burst-cooldown reduction to all allies) / crown / alice / helm.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const SLUG = 'sky';
const FPS = 60;
const A = [SLUG, 'crown', 'alice', 'helm'];
const B = [SLUG, 'dorothy', 'crown', 'alice', 'helm'];

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type Dmg = Extract<SimEvent, { kind: 'damage' }>;

function run(slugs: string[], ov?: any, mode?: string) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs,
    bossElement: 'Fire',
    focusSlug: 'alice',
    overrides: ov ? { [SLUG]: ov } : {},
    modes: mode ? { [SLUG]: mode } : undefined,
    cfg: { onEvent: (e) => events.push(e) },
  });
  const idx = slugs.indexOf(SLUG);
  const casts = events
    .filter((e) => e.kind === 'burstCast' && (e as any).slug === SLUG)
    .map((e) => e.frame);
  const fbStarts = events
    .filter((e) => e.kind === 'fullBurstStart')
    .map((e) => e.frame);
  const mine = events.filter(
    (e): e is BuffApply => e.kind === 'buffApply' && e.casterIdx === idx
  );
  const shots = (slug: string) =>
    events
      .filter((e): e is Shot => e.kind === 'shot' && e.slug === slug)
      .map((e) => e.frame);
  const normals = events.filter(
    (e): e is Dmg =>
      e.kind === 'damage' && e.slug === SLUG && e.srcSlot === 'normal'
  );
  const staticAtk = (res as any).units.find((u: any) => u.slug === SLUG)
    .staticAtk as number;
  return {
    events,
    idx,
    casts,
    fbStarts,
    mine,
    shots,
    normals,
    staticAtk,
    totals: totals(res),
  };
}
type Run = ReturnType<typeof run>;

const bySlot = (r: Run, slot: string, stat: string) =>
  r.mine.filter((b) => b.key.split(':')[1] === slot && b.stat === stat);
const frames = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.frame))].sort((a, b) => a - b);
const holdersAt = (bs: BuffApply[], f: number) =>
  bs
    .filter((b) => b.frame === f)
    .map((b) => b.targetIdx)
    .sort();
/** Expected High Tension lapses: cast + 35s for every cast NOT followed by a re-cast inside 35s. */
const lapses = (r: Run) =>
  r.casts
    .filter((c, i) => {
      const next = r.casts[i + 1];
      return next === undefined || next - c >= 35 * FPS;
    })
    .map((c) => c + 35 * FPS)
    .filter((f) => f < 180 * FPS);

// ---- counterfactual patches -------------------------------------------------------------------
const patch = (mutate: (ov: any) => void) => withPatchedOverride(SLUG, mutate);
const find = (ov: any, slot: string, pred: (b: any) => boolean) => {
  const b = ov[slot].find(pred);
  if (!b) {
    throw new Error(`${SLUG} ${slot} block missing — fixture is stale`);
  }
  return b;
};
const hasStat = (stat: string, value?: number) => (b: any) =>
  b.effects.some(
    (e: any) => e.stat === stat && (value === undefined || e.value === value)
  );
const hasKind = (kind: string) => (b: any) =>
  b.effects.some((e: any) => e.kind === kind);

const a = run(A);
const b = run(B);
const aHold = run(A, undefined, 'Hold');

describe(`${SLUG} — fixture`, () => {
  it('A: she is the sole Burst I and casts every ~40s', () => {
    expect(a.casts.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < a.casts.length; i++) {
      expect(a.casts[i] - a.casts[i - 1]).toBeGreaterThanOrEqual(35 * FPS);
    }
  });
  it('B: dorothy covers stage 1 too, and at least one of her re-casts lands inside 35s', () => {
    const gaps = b.casts.slice(1).map((c, i) => c - b.casts[i]);
    expect(gaps.some((g) => g < 35 * FPS)).toBe(true);
    expect(gaps.some((g) => g >= 35 * FPS)).toBe(true);
    expect(b.fbStarts.length).toBeGreaterThan(b.casts.length);
  });
});

describe('K1 — Defiant Spirit (hold-gated debuff immunity) is recorded unmodeled', () => {
  it('verbatim in unmodeled.skill1, and no block carries it', () => {
    const ov = withPatchedOverride(SLUG, () => {});
    expect(
      ov.unmodeled!.skill1.some((l: string) => l.includes('Defiant Spirit'))
    ).toBe(true);
    expect(JSON.stringify(ov.skill1)).not.toContain('Defiant');
  });
});

describe('K2 — hold Full Charge 1s → self Pierce + Pierce Damage ▲ 60% (mode Hold)', () => {
  it('Release (default): no 60% grant, and her shots are not Pierce-tagged (High Tension skips them)', () => {
    expect(bySlot(a, 'skill1', 'pierceDamagePct')).toEqual([]);
    expect(a.normals.length).toBeGreaterThan(0);
    const noHt = run(
      A,
      patch((ov) => {
        ov.burst = ov.burst.filter(
          (blk: any) => !hasStat('pierceDamagePct')(blk)
        );
      })
    );
    expect(noHt.normals.map((d) => [d.frame, d.mult.dmgUp])).toEqual(
      a.normals.map((d) => [d.frame, d.mult.dmgUp])
    );
  });

  it('Hold: the 60% is on her alone, permanent, and every shot of hers takes it (Pierce-tagged)', () => {
    const g = bySlot(aHold, 'skill1', 'pierceDamagePct');
    expect(g.map((x) => x.targetIdx)).toEqual([aHold.idx]);
    expect(g[0].value).toBe(60);
    expect(g[0].expiresFrame).toBeNull();
    // same shot frames in both modes (the hold itself is not charged); Hold adds ≥ 0.6 Damage Up
    // per shot — the 60%, plus 0.15 per High Tension stack while it is up, now that she pierces
    expect(aHold.normals.map((d) => d.frame)).toEqual(
      a.normals.map((d) => d.frame)
    );
    const diffs = aHold.normals.map(
      (d, i) => d.mult.dmgUp - a.normals[i].mult.dmgUp
    );
    for (const x of diffs) {
      expect(x).toBeGreaterThanOrEqual(0.6 - 1e-9);
    }
    expect(diffs.some((x) => x > 0.6 + 1e-9)).toBe(true);
    expect(aHold.totals[SLUG]).toBeGreaterThan(a.totals[SLUG]);
  });

  it('DISCRIMINATING: dropping the mode gate makes it live in Release', () => {
    const cf = run(
      A,
      patch((ov) => {
        delete find(ov, 'skill1', hasStat('pierceDamagePct', 60)).mode;
      })
    );
    expect(bySlot(cf, 'skill1', 'pierceDamagePct').length).toBe(1);
  });

  it('DISCRIMINATING: allies scope would hand the 60% to all four', () => {
    const cf = run(
      A,
      patch((ov) => {
        find(ov, 'skill1', hasStat('pierceDamagePct', 60)).target = {
          kind: 'allies',
        };
      }),
      'Hold'
    );
    expect(bySlot(cf, 'skill1', 'pierceDamagePct').length).toBe(4);
  });
});

describe('K3 — entering Full Burst → all allies ATK ▲ 20% of her ATK, 10s', () => {
  const g = bySlot(b, 'skill2', 'casterAtkPct').filter((x) => x.value > 0);

  it('on EVERY Full Burst start (incl. ones she did not cast), all 5, +20% of her ATK, 10s', () => {
    expect(frames(g)).toEqual(b.fbStarts);
    for (const f of b.fbStarts) {
      expect(holdersAt(g, f)).toEqual([0, 1, 2, 3, 4]);
    }
    for (const x of g) {
      expect(x.value).toBeCloseTo(0.2 * b.staticAtk, 3);
      expect(x.expiresFrame! - x.frame).toBe(10 * FPS);
    }
  });

  it('DISCRIMINATING: burstCast keying fires only on her casts', () => {
    const cf = run(
      B,
      patch((ov) => {
        find(ov, 'skill2', hasStat('casterAtkPct', 20)).trigger = {
          kind: 'burstCast',
        };
      })
    );
    const cg = bySlot(cf, 'skill2', 'casterAtkPct').filter((x) => x.value > 0);
    expect(frames(cg).length).toBe(cf.casts.length);
    expect(frames(cg).length).toBeLessThan(b.fbStarts.length);
  });
});

describe('K4 — High Tension removed → all allies Low Tension: ATK ▼ 10% of her ATK, 20s', () => {
  const lowB = bySlot(b, 'skill2', 'casterAtkPct').filter((x) => x.value < 0);
  const lowA = bySlot(a, 'skill2', 'casterAtkPct').filter((x) => x.value < 0);

  it('A: lands 35s after every cast (each window lapses before her next cast)', () => {
    expect(frames(lowA)).toEqual(lapses(a));
    expect(frames(lowA)).toEqual(
      a.casts.map((c) => c + 35 * FPS).filter((f) => f < 180 * FPS)
    );
  });

  it('B: lands ONLY at real lapses — an in-window re-cast refreshes High Tension, no Low Tension', () => {
    expect(lapses(b).length).toBeGreaterThan(0);
    expect(frames(lowB)).toEqual(lapses(b));
    expect(frames(lowB).length).toBeLessThan(
      b.casts.filter((c) => c + 35 * FPS < 180 * FPS).length
    );
  });

  it('all 5 allies, −10% of her static ATK as flat ATK, 20s', () => {
    for (const f of frames(lowB)) {
      expect(holdersAt(lowB, f)).toEqual([0, 1, 2, 3, 4]);
    }
    for (const x of lowB) {
      expect(x.value).toBeCloseTo(-0.1 * b.staticAtk, 3);
      expect(x.expiresFrame! - x.frame).toBe(20 * FPS);
    }
  });

  it('DISCRIMINATING: a burstCast + 35s delay stand-in fires after EVERY cast', () => {
    const cf = run(
      B,
      patch((ov) => {
        for (const blk of ov.skill2) {
          if (blk.trigger.kind === 'selfStatusEnd') {
            blk.trigger = { kind: 'burstCast' };
            blk.delaySec = 35;
          }
        }
      })
    );
    const cl = bySlot(cf, 'skill2', 'casterAtkPct').filter((x) => x.value < 0);
    expect(frames(cl).length).toBeGreaterThan(frames(lowB).length);
  });

  it('DISCRIMINATING: self scope would debuff only her', () => {
    const cf = run(
      B,
      patch((ov) => {
        find(ov, 'skill2', hasStat('casterAtkPct', -10)).target = {
          kind: 'self',
        };
      })
    );
    const cl = bySlot(cf, 'skill2', 'casterAtkPct').filter((x) => x.value < 0);
    for (const f of frames(cl)) {
      expect(holdersAt(cl, f)).toEqual([cf.idx]);
    }
  });
});

describe('K5 — Low Energy: she is stunned for 20s on entering Low Tension', () => {
  const inStun = (r: Run, f: number) =>
    lapses(r).some((l) => f >= l && f < l + 20 * FPS);

  it('she fires nothing inside any stun window, but fires before and after', () => {
    for (const r of [a, b]) {
      const mine = r.shots(SLUG);
      expect(mine.filter((f) => inStun(r, f))).toEqual([]);
      const l0 = lapses(r)[0];
      expect(mine.some((f) => f < l0)).toBe(true);
      expect(mine.some((f) => f >= l0 + 20 * FPS)).toBe(true);
    }
  });

  it('allies are not stunned (alice fires inside her stun window)', () => {
    expect(a.shots('alice').some((f) => inStun(a, f))).toBe(true);
  });

  it('DISCRIMINATING: without the stun she fires inside the window', () => {
    const cf = run(
      A,
      patch((ov) => {
        ov.skill2 = ov.skill2.filter((blk: any) => !hasKind('stun')(blk));
      })
    );
    expect(cf.shots(SLUG).some((f) => inStun(a, f))).toBe(true);
  });
});

describe('K6 — burst → all allies High Tension: Pierce Damage ▲ 15%, 35s, stacks to 3', () => {
  const g = bySlot(b, 'burst', 'pierceDamagePct');

  it('each cast: all 5, 15 per stack, 35s', () => {
    expect(frames(g)).toEqual(b.casts);
    for (const c of b.casts) {
      expect(holdersAt(g, c)).toEqual([0, 1, 2, 3, 4]);
    }
    for (const x of g) {
      expect(x.value).toBe(15);
      expect(x.expiresFrame! - x.frame).toBe(35 * FPS);
      expect(x.maxStacks).toBe(3);
    }
  });

  it('an in-window re-cast stacks; a cast after a lapse restarts at 1', () => {
    const own = g.filter((x) => x.targetIdx === b.idx);
    const stacks = own.map((x) => x.stacks);
    expect(stacks[0]).toBe(1);
    expect(Math.max(...stacks)).toBeGreaterThanOrEqual(2);
    b.casts.forEach((c, i) => {
      if (i > 0 && c - b.casts[i - 1] >= 35 * FPS) {
        expect(own[i].stacks).toBe(1);
      }
    });
  });

  it('feeds a Pierce-tagged ally: removing it lowers alice', () => {
    const cf = run(
      B,
      patch((ov) => {
        ov.burst = ov.burst.filter(
          (blk: any) => !hasStat('pierceDamagePct')(blk)
        );
      })
    );
    expect(cf.totals.alice).toBeLessThan(b.totals.alice);
  });

  it('DISCRIMINATING: maxStacks 1 never reaches 2', () => {
    const cf = run(
      B,
      patch((ov) => {
        delete find(ov, 'burst', hasStat('pierceDamagePct')).effects[0]
          .maxStacks;
      })
    );
    const st = bySlot(cf, 'burst', 'pierceDamagePct').map((x) => x.stacks);
    expect(Math.max(...st)).toBe(1);
  });
});

describe('K7 — burst → self ATK ▲ 50%, 35s', () => {
  const g = bySlot(a, 'burst', 'atkPct');

  it('each cast, her alone, 50, 35s', () => {
    expect(frames(g)).toEqual(a.casts);
    for (const x of g) {
      expect(x.targetIdx).toBe(a.idx);
      expect(x.value).toBe(50);
      expect(x.expiresFrame! - x.frame).toBe(35 * FPS);
    }
  });

  it('DISCRIMINATING: allies scope reaches all four', () => {
    const cf = run(
      A,
      patch((ov) => {
        find(ov, 'burst', hasStat('atkPct', 50)).target = { kind: 'allies' };
      })
    );
    const cg = bySlot(cf, 'burst', 'atkPct');
    expect(holdersAt(cg, cf.casts[0])).toEqual([0, 1, 2, 3]);
  });
});
