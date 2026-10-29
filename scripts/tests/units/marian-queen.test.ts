// PER-UNIT KIT SPEC — `marian-queen` (Marian: Queen; MG / Attacker / Fire / Pilgrim, Burst III,
// cd 40s, ammo 300, reloadFrames 171, normalMult 5.57, coreMult 200). NEW unit — no base `marian`
// exists in the roster. Kit-autonomy gauntlet 2026-10-29. Tier 2 (a self-status gate — Penetrant
// Wish — splits the Full-Burst-entry line into two branches; burstCast-vs-fullBurstEnter identity;
// a boss status — Open Wounds — gates the core-strike proc).
//
// One assertion group per KIT LINE (P1..P8), asserted against the SHIPPED override loaded from disk.
// `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model each
// assertion must discriminate against).
//
// Kit (blablalink prose, data/characters.json → characters['marian-queen'].skills, SL10):
//   S1 ■ start of battle → self: Into the Fray: Sharpened Resolve — launches Dark Matter spears:
//        Effect 1: 125.51% of final ATK, "Attacks sequentially 7 times"; Recurring interval 4 sec  [P1]
//        Effect 2: on a spear hit → the target: Open Wounds: Damage Taken ▲ 5.05%, continuous,
//                  cannot be removed                                                           [P2]
//      ■ using Burst Skill → all enemies: Open Wounds (same 5.05%, continuous)                  [P3]
//   S2 ■ using Burst Skill → self: Into the Fray: Penetrant Wish, Duration 10 sec:
//        Effect 1: after performing 2 normal attacks → all enemies in Open Wounds: 14.06% of final
//                  ATK as core strike damage                                                   [P4]
//        Effect 2: Recurring interval of Sharpened Resolve ▼ 2 sec                              [P5]
//      ■ entering Full Burst while NOT in Penetrant Wish → self: Sequential Attack Damage ▲ 85.17% 10s
//      ■ entering Full Burst while IN Penetrant Wish → self: Core Damage ▲ 24.64% 10s           [P6]
//   BU ■ self: Reloads 100% of ammo; MG Ramp-Up Speed ▲ 100% 10s [P8 GAP]; ATK ▲ 78.4% 10s;
//        Attack Damage ▲ 78.14% 10s                                                            [P7]
//      ■ all enemies: 1346.4% of final ATK as Burst Skill damage                               [P7]
//
// UNMODELED / ⚑ (documented in the override, not asserted):
//   - MG Ramp-Up Speed ▲ 100%: the engine models the measured MG wind-up ladder but has no
//     wind-up-speed modifier (engine-modeling-gaps; same line as rei-ayanami-tentative-name /
//     asuka-wille) → P8 it.skip.
//   - Sharpened Resolve first-volley phase: engine `interval` convention (first volley at t=4s,
//     not t=0) ⚑.
//
// Why each assertion discriminates:
//   P1  Volleys of EXACTLY 7 sequential hits at 125.51%, every 240f outside the P5 window.
//       Counterfactuals: one aggregated hit (1 event / volley), a single 125.51% hit (7× under),
//       flavor dropped (P6 Sequential Attack Damage can no longer reach the spears).
//   P2  Damage Taken 5.05 on the BOSS, first applied on the first volley, NO expiry, never stacks.
//       Counterfactuals: a 10s duration (expires), stacking per volley (stacks > 1).
//   P3  A separate burstCast-keyed application of the same debuff (refresh on her cast frames) —
//       shares the S1 key, so it never co-stacks with P2. Counterfactual: block dropped.
//   P4  Core strikes (14.06%, core-eligible, skill2) ONLY inside the 10s Penetrant Wish window
//       after each of her casts, one per 2 of her shots there. Counterfactuals: gate dropped
//       (strikes outside the window), core flag dropped, count 1 (twice as many), Open Wounds
//       producer removed (the boss-status gate never opens → no strikes).
//   P5  Inside the window the volley period is 120f (4s − 2s); outside, 240f. Counterfactual:
//       the reduction buff dropped → 240f everywhere.
//   P6  At Full Bursts entered after HER cast → Core Damage ▲ 24.64% (10s) and NO Sequential buff;
//       at Full Bursts another B3 (helm) completed → Sequential Attack Damage ▲ 85.17% (10s) and NO
//       Core buff. Counterfactuals: either gate dropped (the buff appears in the other branch);
//       the sequential buff observably lifts the spears' Damage-Up term by 0.8517.
//   P7  Her burst: nuke 1346.4% on the cast frame (burst bucket, no Full-Burst +50%), self ATK
//       ▲ 78.4% + Attack Damage ▲ 78.14% for 10s, magazine refilled to full.
//       Counterfactuals: fullBurstEnter keying (frame shift), instantReload dropped.
//
// Fixture: the control comp — liter (B1) / crown (B2) / marian-queen (B3) / helm (B3, the SR/Water
// Helm — NOT helm-aquamarine), boss Fire, focus marian-queen. Two B3s, so some Full Bursts are
// completed by helm while her 40s cooldown is down (the NOT-in-Penetrant-Wish branch). Deterministic.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'marian-queen';
const FPS = 60;
const WIN = 10 * FPS; // Penetrant Wish / burst-buff duration

type Dmg = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(ov?: any) {
  const events: SimEvent[] = [];
  const base = controlComp(SLUG);
  const res = runComp({
    ...base,
    overrides: ov ? { [SLUG]: ov } : {},
    cfg: { onEvent: (e) => events.push(e) },
  });
  const idx = base.slugs.indexOf(SLUG);
  const dmg = events.filter(
    (e): e is Dmg => e.kind === 'damage' && e.slug === SLUG
  );
  const shots = events.filter(
    (e): e is Shot => e.kind === 'shot' && e.slug === SLUG
  );
  const casts = events
    .filter((e) => e.kind === 'burstCast' && e.slug === SLUG)
    .map((e) => e.frame);
  const fbStarts = events
    .filter((e) => e.kind === 'fullBurstStart')
    .map((e) => e.frame);
  // boss debuffs carry targetIdx null — attribute them by the `<ownerIdx>:<slot>:…` key prefix
  const mine = events.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' &&
      (e.casterIdx === idx ||
        (e.targetIdx === null && e.key.startsWith(`${idx}:`)))
  );
  const spears = dmg.filter((d) => d.srcSlot === 'skill1');
  const volleys = [...new Set(spears.map((d) => d.frame))].sort(
    (a, b) => a - b
  );
  return {
    events,
    idx,
    dmg,
    shots,
    casts,
    fbStarts,
    mine,
    spears,
    volleys,
    strikes: dmg.filter((d) => d.srcSlot === 'skill2'),
    totals: totals(res),
  };
}
type Run = ReturnType<typeof run>;

const inWish = (r: Run, f: number) =>
  r.casts.some((c) => f >= c && f <= c + WIN);
/** Full Bursts whose chain SHE completed (her cast within 2s before the FB start). */
const fbAfterHerCast = (r: Run) =>
  r.fbStarts.filter((s) => r.casts.some((c) => c <= s && s - c <= 120));
const fbWithoutHerCast = (r: Run) =>
  r.fbStarts.filter((s) => !fbAfterHerCast(r).includes(s));
const inFbWindow = (starts: number[], f: number) =>
  starts.some((s) => f >= s && f < s + WIN);
const selfBuffs = (r: Run, stat: string) =>
  r.mine.filter((b) => b.stat === stat && b.targetIdx === r.idx);
const bossBuffs = (r: Run, stat: string) =>
  r.mine.filter((b) => b.stat === stat && b.targetIdx === null);

// ---- counterfactual patches -------------------------------------------------------------------
const patch = (mutate: (ov: any) => void) => withPatchedOverride(SLUG, mutate);
const findBlock = (ov: any, slot: string, pred: (b: any) => boolean) => {
  const b = ov[slot].find(pred);
  if (!b) {
    throw new Error(`${SLUG} ${slot} block missing — fixture is stale`);
  }
  return b;
};
const hasStat = (stat: string) => (b: any) =>
  b.effects.some((e: any) => e.stat === stat);
const isInterval = (b: any) => b.trigger.kind === 'interval';
const isStrike = (b: any) => b.trigger.kind === 'hitCount';

const main = run();

describe(`${SLUG} — fixture`, () => {
  it('she casts her burst, and helm completes some Full Bursts without her', () => {
    expect(main.casts.length).toBeGreaterThanOrEqual(2);
    expect(fbAfterHerCast(main).length).toBeGreaterThanOrEqual(2);
    expect(fbWithoutHerCast(main).length).toBeGreaterThanOrEqual(1);
  });
});

describe('P1 — Sharpened Resolve: 7 sequential Dark Matter spears × 125.51%, every 4 sec', () => {
  it('every volley is exactly 7 hits at 125.51% of final ATK on the boss', () => {
    expect(main.volleys.length).toBeGreaterThan(40);
    for (const v of main.volleys) {
      const hits = main.spears.filter((d) => d.frame === v);
      expect(hits.length).toBe(7);
      for (const h of hits) {
        expect(h.atkPct).toBe(125.51);
        expect(h.bucket).toBe('skill');
      }
    }
  });

  it('the first volley lands at t=4s (interval convention) and outside the burst window every 240f', () => {
    expect(main.volleys[0]).toBe(4 * FPS);
    for (let i = 1; i < main.volleys.length; i++) {
      const v = main.volleys[i];
      if (!inWish(main, v)) {
        expect(v - main.volleys[i - 1]).toBe(4 * FPS);
      }
    }
  });

  it('the spears are sequential-flavored (static block shape)', () => {
    const ov: any = withPatchedOverride(SLUG, () => {});
    const b = findBlock(ov, 'skill1', isInterval);
    expect(b.trigger.sec).toBe(4);
    const hits = b.effects.filter((e: any) => e.kind === 'flatDamage');
    expect(hits.length).toBe(7);
    for (const e of hits) {
      expect(e.flavor).toBe('sequential');
      expect(e.atkPct).toBe(125.51);
    }
  });

  it('DISCRIMINATING: a single 125.51% hit per volley deals 1/7 of the spear damage', () => {
    const cf = run(
      patch((ov) => {
        const b = findBlock(ov, 'skill1', isInterval);
        let kept = false;
        b.effects = b.effects.filter((e: any) => {
          if (e.kind !== 'flatDamage') {
            return true;
          }
          if (kept) {
            return false;
          }
          kept = true;
          return true;
        });
      })
    );
    expect(cf.spears.length).toBe(cf.volleys.length);
    expect(cf.spears.length).toBeLessThan(main.spears.length / 6);
  });
});

describe('P2 — Open Wounds: boss Damage Taken ▲ 5.05%, continuous, non-stacking', () => {
  const ow = bossBuffs(main, 'damageTakenPct');

  it('first applied on the first spear volley, on the BOSS, value 5.05, with NO expiry', () => {
    expect(ow.length).toBeGreaterThan(0);
    expect(Math.min(...ow.map((b) => b.frame))).toBe(main.volleys[0]);
    for (const b of ow) {
      expect(b.value).toBe(5.05);
      expect(b.expiresFrame).toBeNull();
      expect(b.key.split(':')[1]).toBe('skill1');
    }
  });

  it('never stacks: one entry, stacks 1, across every volley and burst cast', () => {
    for (const b of ow) {
      expect(b.stacks).toBe(1);
    }
    expect(new Set(ow.map((b) => b.key)).size).toBe(1);
  });

  it('DISCRIMINATING: a stacking reading (maxStacks 7) accumulates stacks', () => {
    const cf = run(
      patch((ov) => {
        const b = findBlock(ov, 'skill1', isInterval);
        b.effects.find((e: any) => e.stat === 'damageTakenPct').maxStacks = 7;
      })
    );
    expect(
      Math.max(...bossBuffs(cf, 'damageTakenPct').map((b) => b.stacks))
    ).toBeGreaterThan(1);
  });

  it('DISCRIMINATING: a timed (10s) reading carries an expiry', () => {
    const cf = run(
      patch((ov) => {
        const b = findBlock(ov, 'skill1', isInterval);
        b.effects.find((e: any) => e.stat === 'damageTakenPct').durationSec =
          10;
      })
    );
    expect(
      bossBuffs(cf, 'damageTakenPct').some((b) => b.expiresFrame !== null)
    ).toBe(true);
  });

  it('it amplifies the whole team (an ally deals less without it)', () => {
    const cf = run(
      patch((ov) => {
        for (const slot of ['skill1', 'burst']) {
          for (const b of ov[slot]) {
            b.effects = b.effects.filter(
              (e: any) => e.stat !== 'damageTakenPct'
            );
          }
        }
      })
    );
    expect(cf.totals.liter).toBeLessThan(main.totals.liter);
  });
});

describe('P3 — burst use re-applies Open Wounds to all enemies (same debuff, no co-stack)', () => {
  it('an Open Wounds application lands on each of her burst-cast frames', () => {
    const ow = bossBuffs(main, 'damageTakenPct');
    for (const c of main.casts) {
      expect(ow.some((b) => b.frame === c)).toBe(true);
    }
  });

  it('the burst-use block is burstCast-keyed, enemy-targeted, and shares the S1 slot key', () => {
    const ov: any = withPatchedOverride(SLUG, () => {});
    const b = ov.skill1.find(
      (x: any) => x.trigger.kind === 'burstCast' && hasStat('damageTakenPct')(x)
    );
    expect(b).toBeDefined();
    expect(b.target.kind).toBe('enemy');
  });

  it('DISCRIMINATING: without the burst-use block, no application lands on a cast frame between volleys', () => {
    const cf = run(
      patch((ov) => {
        ov.skill1 = ov.skill1.filter(
          (x: any) => !(x.trigger.kind === 'burstCast')
        );
      })
    );
    const ow = bossBuffs(cf, 'damageTakenPct');
    const offVolley = cf.casts.filter((c) => !cf.volleys.includes(c));
    expect(offVolley.length).toBeGreaterThan(0);
    for (const c of offVolley) {
      expect(ow.some((b) => b.frame === c)).toBe(false);
    }
  });
});

describe('P4 — Penetrant Wish (10s after her burst): every 2 normal attacks → 14.06% core strike', () => {
  it('core strikes are 14.06%, core-eligible, skill damage', () => {
    expect(main.strikes.length).toBeGreaterThan(0);
    for (const s of main.strikes) {
      expect(s.atkPct).toBe(14.06);
      expect(s.coreEligible).toBe(true);
      expect(s.bucket).toBe('skill');
    }
  });

  it('they occur ONLY inside the 10s window after each of her casts, on her shot frames', () => {
    const shotFrames = new Set(main.shots.map((s) => s.frame));
    for (const s of main.strikes) {
      expect(inWish(main, s.frame)).toBe(true);
      expect(shotFrames.has(s.frame)).toBe(true);
    }
  });

  it('one strike per 2 of her shots inside each window', () => {
    for (const c of main.casts) {
      const n = main.shots.filter(
        (s) => s.frame > c && s.frame < c + WIN
      ).length;
      const k = main.strikes.filter(
        (s) => s.frame > c && s.frame < c + WIN
      ).length;
      expect(n).toBeGreaterThan(100);
      expect(Math.abs(k - n / 2)).toBeLessThanOrEqual(1);
    }
  });

  // countScope 'gated': only rounds fired WHILE in Penetrant Wish advance the count, so after
  // every window the cumulative strikes are exactly half the cumulative in-window rounds.
  const cumulativeExact = (r: Run) => {
    let n = 0;
    return r.casts.every((c) => {
      n += r.shots.filter((s) => s.frame >= c && s.frame < c + WIN).length;
      const k = r.strikes.filter((s) => s.frame < c + WIN).length;
      return k === Math.floor(n / 2);
    });
  };

  it('only rounds fired inside Penetrant Wish count toward the 2 (cumulative strikes = ⌊in-window rounds / 2⌋)', () => {
    expect(cumulativeExact(main)).toBe(true);
  });

  it('DISCRIMINATING: an ungated counter is pre-charged by rounds fired outside the window', () => {
    const cf = run(
      patch((ov) => {
        delete findBlock(ov, 'skill2', isStrike).trigger.countScope;
      })
    );
    expect(cumulativeExact(cf)).toBe(false);
  });

  it('the Penetrant Wish status is opened by her burst, self, 10s', () => {
    const ov: any = withPatchedOverride(SLUG, () => {});
    const b = ov.skill2.find((x: any) =>
      x.effects.some((e: any) => e.kind === 'selfStatus')
    );
    expect(b.trigger.kind).toBe('burstCast');
    expect(b.target.kind).toBe('self');
    const st = b.effects.find((e: any) => e.kind === 'selfStatus');
    expect(st.name).toBe('Penetrant Wish');
    expect(st.durationSec).toBe(10);
  });

  it('DISCRIMINATING: dropping the Penetrant Wish gate fires strikes outside the window', () => {
    const cf = run(
      patch((ov) => {
        delete findBlock(ov, 'skill2', isStrike).requiresSelfStatus;
      })
    );
    expect(cf.strikes.some((s) => !inWish(cf, s.frame))).toBe(true);
  });

  it('DISCRIMINATING: a fullBurstEnter-keyed Penetrant Wish opens the window on helm’s Full Bursts too', () => {
    const cf = run(
      patch((ov) => {
        findBlock(ov, 'skill2', (b: any) =>
          b.effects.some((e: any) => e.kind === 'selfStatus')
        ).trigger = { kind: 'fullBurstEnter' };
      })
    );
    const other = fbWithoutHerCast(cf);
    expect(cf.strikes.some((s) => inFbWindow(other, s.frame))).toBe(true);
    expect(main.strikes.some((s) => inFbWindow(other, s.frame))).toBe(false);
  });

  it('DISCRIMINATING: every normal attack (count 1) doubles the strikes', () => {
    const cf = run(
      patch((ov) => {
        findBlock(ov, 'skill2', isStrike).trigger.count = 1;
      })
    );
    expect(cf.strikes.length).toBeGreaterThan(main.strikes.length * 1.8);
  });

  it('DISCRIMINATING: a plain (non-core) hit is not core-eligible', () => {
    const cf = run(
      patch((ov) => {
        findBlock(ov, 'skill2', isStrike).effects[0].core = false;
      })
    );
    expect(cf.strikes.every((s) => !s.coreEligible)).toBe(true);
  });

  it('DISCRIMINATING: with no Open Wounds status on the boss the strikes never fire', () => {
    const cf = run(
      patch((ov) => {
        for (const b of ov.skill1) {
          b.effects = b.effects.filter((e: any) => e.kind !== 'targetStatus');
        }
      })
    );
    expect(cf.strikes).toEqual([]);
  });
});

describe('P5 — Penetrant Wish: Sharpened Resolve recurring interval ▼ 2 sec (4s → 2s)', () => {
  const gapsInWindow = (r: Run) => {
    const out: number[] = [];
    for (let i = 1; i < r.volleys.length; i++) {
      const v = r.volleys[i];
      if (r.casts.some((c) => v >= c + 121 && v < c + WIN)) {
        out.push(v - r.volleys[i - 1]);
      }
    }
    return out;
  };

  it('inside the window the volley period is 120f', () => {
    const g = gapsInWindow(main);
    expect(g.length).toBeGreaterThanOrEqual(main.casts.length * 3);
    expect(g.every((x) => x === 2 * FPS)).toBe(true);
  });

  it('the reduction is a self skillCooldownReductionSec 2 for 10s on each cast', () => {
    const red = selfBuffs(main, 'skillCooldownReductionSec');
    expect(red.map((b) => b.frame)).toEqual(main.casts);
    for (const b of red) {
      expect(b.value).toBe(2);
      expect(b.expiresFrame! - b.frame).toBe(WIN);
    }
  });

  it('DISCRIMINATING: without the reduction every in-window gap stays 240f', () => {
    const cf = run(
      patch((ov) => {
        for (const b of ov.skill2) {
          b.effects = b.effects.filter(
            (e: any) => e.stat !== 'skillCooldownReductionSec'
          );
        }
      })
    );
    expect(gapsInWindow(cf).every((x) => x === 4 * FPS)).toBe(true);
    expect(cf.volleys.length).toBeLessThan(main.volleys.length);
  });
});

describe('P6 — Full Burst entry branches on the Penetrant Wish state', () => {
  const core = selfBuffs(main, 'coreDamagePct');
  const seq = selfBuffs(main, 'sequentialDamagePct');

  it('IN Penetrant Wish (FB after her cast) → Core Damage ▲ 24.64% 10s, no Sequential buff', () => {
    const mineFb = fbAfterHerCast(main);
    expect(core.map((b) => b.frame)).toEqual(mineFb);
    for (const b of core) {
      expect(b.value).toBe(24.64);
      expect(b.expiresFrame! - b.frame).toBe(WIN);
    }
    for (const f of mineFb) {
      expect(seq.some((b) => b.frame === f)).toBe(false);
    }
  });

  it('NOT in Penetrant Wish (FB helm completed) → Sequential Attack Damage ▲ 85.17% 10s, no Core buff', () => {
    const other = fbWithoutHerCast(main);
    expect(seq.map((b) => b.frame)).toEqual(other);
    for (const b of seq) {
      expect(b.value).toBe(85.17);
      expect(b.expiresFrame! - b.frame).toBe(WIN);
    }
    for (const f of other) {
      expect(core.some((b) => b.frame === f)).toBe(false);
    }
  });

  it('the Sequential buff lifts the spears’ Damage-Up term by 0.8517 in those Full Bursts', () => {
    const cf = run(
      patch((ov) => {
        ov.skill2 = ov.skill2.filter(
          (b: any) => !hasStat('sequentialDamagePct')(b)
        );
      })
    );
    const other = fbWithoutHerCast(main);
    const lifted = main.spears.filter((d) => inFbWindow(other, d.frame));
    expect(lifted.length).toBeGreaterThan(0);
    for (const d of lifted) {
      const twin = cf.spears.find((x) => x.frame === d.frame)!;
      expect(d.mult.dmgUp - twin.mult.dmgUp).toBeCloseTo(0.8517, 6);
    }
  });

  it('DISCRIMINATING: dropping the NOT-state gate grants the Sequential buff after her cast too', () => {
    const cf = run(
      patch((ov) => {
        delete findBlock(ov, 'skill2', hasStat('sequentialDamagePct'))
          .ownBurstGate;
      })
    );
    const s = selfBuffs(cf, 'sequentialDamagePct').map((b) => b.frame);
    expect(fbAfterHerCast(cf).some((f) => s.includes(f))).toBe(true);
  });

  it('DISCRIMINATING: dropping the IN-state gate grants Core Damage on helm’s Full Bursts too', () => {
    const cf = run(
      patch((ov) => {
        delete findBlock(ov, 'skill2', hasStat('coreDamagePct'))
          .requiresSelfStatus;
      })
    );
    const c = selfBuffs(cf, 'coreDamagePct').map((b) => b.frame);
    expect(fbWithoutHerCast(cf).some((f) => c.includes(f))).toBe(true);
  });
});

describe('P7 — burst: self ATK / Attack Damage 10s, 100% reload, 1346.4% nuke', () => {
  it('the nuke lands on each cast frame: 1346.4%, burst bucket, no Full-Burst +50%', () => {
    const nukes = main.dmg.filter((d) => d.srcSlot === 'burst');
    expect(nukes.map((d) => d.frame)).toEqual(main.casts);
    for (const d of nukes) {
      expect(d.atkPct).toBe(1346.4);
      expect(d.bucket).toBe('burst');
      expect(d.fbMajorApplied).toBe(false);
    }
  });

  it('self ATK ▲ 78.4% and Attack Damage ▲ 78.14% for 10s on each cast', () => {
    for (const [stat, v] of [
      ['atkPct', 78.4],
      ['attackDamagePct', 78.14],
    ] as const) {
      const bs = selfBuffs(main, stat).filter(
        (b) => b.key.split(':')[1] === 'burst'
      );
      expect(bs.map((b) => b.frame)).toEqual(main.casts);
      for (const b of bs) {
        expect(b.value).toBe(v);
        expect(b.expiresFrame! - b.frame).toBe(WIN);
      }
    }
  });

  it('the magazine is full again right after each cast', () => {
    for (const c of main.casts) {
      const next = main.shots.find((s) => s.frame > c)!;
      expect(next.ammoAfter).toBeGreaterThanOrEqual(298);
    }
  });

  it('DISCRIMINATING: without the reload the first post-cast shot is not from a full magazine', () => {
    const cf = run(
      patch((ov) => {
        for (const b of ov.burst) {
          b.effects = b.effects.filter((e: any) => e.kind !== 'instantReload');
        }
      })
    );
    expect(
      cf.casts.some((c) => cf.shots.find((s) => s.frame > c)!.ammoAfter < 298)
    ).toBe(true);
  });

  it('DISCRIMINATING: fullBurstEnter keying moves the nuke off the cast frame', () => {
    const cf = run(
      patch((ov) => {
        findBlock(ov, 'burst', (b: any) =>
          b.effects.some((e: any) => e.atkPct === 1346.4)
        ).trigger = { kind: 'fullBurstEnter' };
      })
    );
    const nukes = cf.dmg.filter((d) => d.srcSlot === 'burst');
    expect(nukes.some((d) => cf.casts.includes(d.frame))).toBe(false);
  });
});

describe('P8 — burst: Machine Gun Ramp-Up Speed ▲ 100% for 10 sec', () => {
  it.skip('GAP: no MG wind-up-speed modifier exists in the engine (docs/engine-modeling-gaps.md — MG ramp-up speed); the line is in `unmodeled`', () => {});

  it('the line is recorded verbatim in unmodeled.burst', () => {
    const ov: any = withPatchedOverride(SLUG, () => {});
    expect(
      ov.unmodeled.burst.some((l: string) =>
        l.includes('Machine Gun Ramp-Up Speed ▲ 100% for 10 sec')
      )
    ).toBe(true);
  });
});
