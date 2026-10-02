// PER-UNIT KIT SPEC — `sin-swift-bunny` (Sin: Swift Bunny, SR/Attacker/Water/Missilis, Burst III
// cd 40s, ammo 6, charge 1s). VARIANT of the base unit `sin` (AR/Electric) — a different unit and
// kit. Kit-autonomy gauntlet 2026-10-02, tier 2 (a self-mode system with mode-gated true damage,
// round-count per-shot buffs gated off a burst weapon swap, a mode-branched burst rider).
//
// One assertion group per KIT LINE, against the SHIPPED override; `withPatchedOverride` only builds
// the named nearest-wrong COUNTERFACTUALS, each of which must flip the assertion.
//
// Kit (data/characters.json → characters['sin-swift-bunny'].skills, L10):
//   S1 ■ battle start → self: ATK ▲ 15.35%, continuous                                         [S1]
//      ■ during Full Charge, not in Swift Piercing → self: Normal Attack Damage Multiplier ▲ 100%
//        for 1 round, Charge Damage ▲ 52.12% for 1 round                                      [S2]
//      ■ battle start / Full Charge held ≥1s → toggle Bunny Mode (Stance ⇄ Engage); allies in
//        the opposite mode follow                                                      [UNMODELED]
//   S2 ■ Engage — Noise Bullets: normals deal true damage (E1), Swift Piercing deals true damage
//        (E2)                                                                                 [S4]
//      ■ Stance — Enhanced Bullets: Critical Rate ▲ 35.14% (E1), Critical Damage ▲ 75.12% (E2) [S3]
//      ■ on using Burst Skill → self: Swift Piercing weapon change — charge fixed 0.5s, 73.22% of
//        final ATK, full charge 300%, 5 sec                                                   [S5]
//   BU ■ self: ATK ▲ 110% for 5 sec; all enemies: 516.6% of final ATK as Burst Skill damage;
//        Stance: + 958.9% additional damage; Engage: + 854.6% true damage                     [S6]
//
// Bunny Mode is a static user-selected kit mode (modes ['Stance','Engage'], Stance default). Why
// each assertion discriminates:
//   S1  one self grant at frame 0, no expiry, value 15.35.
//   S2  granted on every UNSWAPPED full-charge shot as a 1-round pair (theme-21 next-round
//       convention), so steady-state base shots fire at 69.04 × 2 with charge 2.5 + 0.5212; Swift
//       Piercing shots after the first of each window carry neither (the swapGate) — an ungated
//       grant lifts every Swift Piercing shot. The documented boundary residue (the first Swift
//       Piercing shot inherits the last base grant; the first base shot after the window has none)
//       is pinned so a change to it is visible.
//   S3  default = Stance: the crit pair exists from frame 0; Engage has neither.
//   S4  Engage makes her normals true — base weapon AND Swift Piercing (trueNormalsModes; the
//       engine applies the flavor to swap shots too, which is exactly Noise Bullets E2); Stance not.
//   S5  burstCast-keyed swap: shots inside cast → cast+300 are Swift Piercing at 73.22%, charged,
//       30 frames apart (0.5s fixed), charge multiplier 3.0 (300%); a 1.0s charge spaces them 60.
//   S6  ATK 110% self for 300 frames at each cast; the burst rider set is mode-branched (Stance
//       {516.6, 958.9}, Engage {516.6, 854.6}); the Engage 854.6% is true, the 516.6% is not; all
//       land before Full Burst opens (no +50% major); all three are tagged burstDesc 'allEnemies'
//       ("Affects the same targets" inherits the clause). A mode-blind encoding fires both riders.
//
// Fixture: controlComp — liter (B1) / crown (B2) / sin-swift-bunny (B3, focus) / `helm`
// (SR/Water Helm, B3), boss Fire. Deterministic; event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  controlComp,
  runComp,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'sin-swift-bunny';
const IDX = 2;
const BASE_MULT = 69.04;
const SP_MULT = 73.22;
const TRUE_BUFF = 100; // synthetic self True Damage ▲ used only to OBSERVE true flavor
const SP_FRAMES = 300;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

function run(mode?: string, override?: unknown) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG),
    modes: mode ? { [SLUG]: mode } : undefined,
    overrides: override ? { [SLUG]: override as never } : undefined,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, total: unitOf(res, SLUG).totalDamage };
}
type Run = ReturnType<typeof run>;

// ---- readers ----------------------------------------------------------------------------------
const dmg = (r: Run) =>
  r.events.filter((e): e is Damage => e.kind === 'damage' && e.slug === SLUG);
const normals = (r: Run) => dmg(r).filter((d) => d.srcSlot === 'normal');
const burstHits = (r: Run) => dmg(r).filter((d) => d.srcSlot === 'burst');
const shots = (r: Run) =>
  r.events.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const casts = (r: Run) =>
  r.events
    .filter(
      (e) => e.kind === 'burstCast' && (e as { slug: string }).slug === SLUG
    )
    .map((e) => e.frame);
const ownBuffs = (r: Run, stat: string) =>
  r.events.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' && e.casterIdx === IDX && e.stat === stat
  );
const inSp = (r: Run, frame: number) =>
  casts(r).some((c) => frame > c && frame < c + SP_FRAMES);
const spShots = (r: Run) => normals(r).filter((d) => inSp(r, d.frame));
const baseNormals = (r: Run) => normals(r).filter((d) => !inSp(r, d.frame));
/** Swift Piercing shots after each window's first (the first inherits the boundary grant). */
const spSteady = (r: Run) =>
  spShots(r).filter(
    (d) => !casts(r).some((c) => spShots(r).find((x) => x.frame > c) === d)
  );
const close = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const dmgUpAt = (xs: Damage[]) =>
  new Map(xs.map((d) => [d.frame, d.mult.dmgUp]));
const uniqAtk = (xs: Damage[]) =>
  [...new Set(xs.map((d) => +d.atkPct.toFixed(2)))].sort((a, b) => a - b);

// ---- counterfactual patches -------------------------------------------------------------------
const patch = (mutate: (ov: any) => void) => withPatchedOverride(SLUG, mutate);
const withTrueBuff = (ov: any) =>
  ov.skill1.push({
    slot: 'skill1',
    trigger: { kind: 'passive' },
    target: { kind: 'self' },
    effects: [{ kind: 'buff', stat: 'trueDamagePct', value: TRUE_BUFF }],
  });
const shotBlock = (ov: any) =>
  ov.skill1.find((b: any) => b.trigger.kind === 'fullCharge');
const swapEffect = (ov: any) =>
  ov.skill2
    .find((b: any) => b.effects.some((e: any) => e.kind === 'weaponSwap'))
    .effects.find((e: any) => e.kind === 'weaponSwap');

const ungatedShotBuff = patch((ov) => {
  delete shotBlock(ov).swapGate;
});
const modeBlind = patch((ov) => {
  for (const s of ['skill1', 'skill2', 'burst']) {
    for (const b of ov[s]) {
      delete b.mode;
    }
  }
});
const trueBuffed = patch(withTrueBuff);
const trueBuffedNoModeNormals = patch((ov) => {
  withTrueBuff(ov);
  delete ov.trueNormalsModes;
});
const swapOnFbEnter = patch((ov) => {
  ov.skill2.find((b: any) =>
    b.effects.some((e: any) => e.kind === 'weaponSwap')
  ).trigger = {
    kind: 'fullBurstEnter',
  };
});
const atkAfterNukes = patch((ov) => {
  const atk = ov.burst.shift();
  ov.burst.push(atk);
});
const slowSp = patch((ov) => {
  swapEffect(ov).chargeTimeSec = 1;
  swapEffect(ov).chargeTimeClamp = 1;
});

const stance = run('Stance');
const engage = run('Engage');
const byDefault = run();

describe('S1 — battle-start ATK ▲ 15.35% (self, continuous)', () => {
  it('one self grant at frame 0, no expiry', () => {
    const g = ownBuffs(stance, 'atkPct').filter((b) => b.value === 15.35);
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({
      frame: 0,
      targetSlug: SLUG,
      expiresFrame: null,
    });
  });
});

describe('S2 — during Full Charge outside Swift Piercing: Normal Attack ×2 + Charge Damage ▲ 52.12% (1 round)', () => {
  it('granted as a 1-round pair on every unswapped charged shot', () => {
    const unswappedCharged = shots(stance)
      .filter((s) => s.charged && !inSp(stance, s.frame))
      .map((s) => s.frame);
    for (const stat of ['normalAttackPct', 'chargeDamagePct']) {
      const g = ownBuffs(stance, stat);
      expect(g.map((b) => b.frame)).toEqual(unswappedCharged);
      expect(
        g.every((b) => b.durationShots === 1 && b.targetSlug === SLUG)
      ).toBe(true);
    }
    expect(ownBuffs(stance, 'normalAttackPct')[0].value).toBe(100);
    expect(ownBuffs(stance, 'chargeDamagePct')[0].value).toBe(52.12);
  });
  it('steady-state base shots fire at 69.04 × 2 with charge 2.5 + 0.5212', () => {
    const doubled = baseNormals(stance).filter((d) =>
      close(d.atkPct, BASE_MULT * 2)
    );
    expect(doubled.length).toBeGreaterThan(50);
    for (const d of doubled) {
      expect(d.mult.charge).toBeCloseTo(2.5 + 0.5212, 6);
    }
  });
  it('steady-state Swift Piercing shots carry neither buff', () => {
    const steady = spSteady(stance);
    expect(steady.length).toBeGreaterThan(20);
    for (const d of steady) {
      expect(d.atkPct).toBeCloseTo(SP_MULT, 6);
      expect(d.mult.charge).toBeCloseTo(3.0, 6);
    }
  });
  it('documented boundary residue (theme-21 next-round convention): first SP shot inherits, first base shot after misses', () => {
    for (const c of casts(stance)) {
      const firstSp = spShots(stance).find((d) => d.frame > c)!;
      expect(firstSp.atkPct).toBeCloseTo(SP_MULT * 2, 6);
      const firstBack = baseNormals(stance).find(
        (d) => d.frame >= c + SP_FRAMES
      );
      if (firstBack) {
        expect(firstBack.atkPct).toBeCloseTo(BASE_MULT, 6);
      }
    }
  });
  it('COUNTERFACTUAL: an ungated grant lifts every Swift Piercing shot', () => {
    const cf = run('Stance', ungatedShotBuff);
    expect(spSteady(cf).every((d) => close(d.atkPct, SP_MULT * 2))).toBe(true);
  });
});

describe('S3 — Bunny Mode is a kit mode, Stance by default; Enhanced Bullets in Stance', () => {
  it('the default selection behaves exactly as Stance', () => {
    expect(byDefault.total).toBe(stance.total);
  });
  it('Stance: Critical Rate ▲ 35.14% and Critical Damage ▲ 75.12% from frame 0, self', () => {
    expect(ownBuffs(stance, 'critRatePct')).toMatchObject([
      { frame: 0, value: 35.14, targetSlug: SLUG, expiresFrame: null },
    ]);
    expect(ownBuffs(stance, 'critDamagePct')).toMatchObject([
      { frame: 0, value: 75.12, targetSlug: SLUG, expiresFrame: null },
    ]);
  });
  it('Engage: neither', () => {
    expect(ownBuffs(engage, 'critRatePct')).toEqual([]);
    expect(ownBuffs(engage, 'critDamagePct')).toEqual([]);
  });
});

describe('S4 — Noise Bullets: true-flavored normals and Swift Piercing only in Engage', () => {
  const buffed = run('Engage', trueBuffed);
  const cf = dmgUpAt(normals(run('Engage', trueBuffedNoModeNormals)));
  it('Engage base-weapon shots take the True Damage ▲ buff', () => {
    const live = baseNormals(buffed);
    expect(live.length).toBeGreaterThan(50);
    for (const d of live) {
      expect(d.mult.dmgUp - cf.get(d.frame)!).toBeCloseTo(TRUE_BUFF / 100, 6);
    }
  });
  it('Engage Swift Piercing shots take it too', () => {
    const live = spShots(buffed);
    expect(live.length).toBeGreaterThan(20);
    for (const d of live) {
      expect(d.mult.dmgUp - cf.get(d.frame)!).toBeCloseTo(TRUE_BUFF / 100, 6);
    }
  });
  it('Stance shots do not', () => {
    const plain = dmgUpAt(normals(stance));
    for (const d of normals(run('Stance', trueBuffed))) {
      expect(d.mult.dmgUp).toBeCloseTo(plain.get(d.frame)!, 9);
    }
  });
});

describe('S5 — Swift Piercing on burst use: 0.5s fixed charge, 73.22%, ×3.0, 5 sec', () => {
  it('every shot inside the window is a charged Swift Piercing shot, 30 frames apart', () => {
    for (const r of [stance, engage]) {
      expect(casts(r).length).toBeGreaterThanOrEqual(5);
      for (const c of casts(r)) {
        const w = shots(r).filter(
          (s) => s.frame > c && s.frame < c + SP_FRAMES
        );
        expect(w.length).toBeGreaterThanOrEqual(6);
        expect(w.every((s) => s.charged)).toBe(true);
        // 0.5s fixed charge = 30 frames between pulls; a boss-script fire pause can stretch ONE
        // gap (the 4138 window holds a 90-frame one), so pin the minimum and the bulk, not all.
        const gaps = w.slice(1).map((s, i) => s.frame - w[i].frame);
        expect(Math.min(...gaps)).toBe(30);
        expect(gaps.filter((g) => g === 30).length).toBeGreaterThanOrEqual(
          gaps.length - 1
        );
      }
      expect(
        spShots(r).every(
          (d) => close(d.atkPct, SP_MULT) || close(d.atkPct, SP_MULT * 2)
        )
      ).toBe(true);
    }
  });
  it('base fire resumes after the window', () => {
    for (const c of casts(stance)) {
      const back = normals(stance).find((d) => d.frame >= c + SP_FRAMES);
      if (back) {
        expect(
          close(back.atkPct, BASE_MULT) || close(back.atkPct, BASE_MULT * 2)
        ).toBe(true);
      }
    }
  });
  it('COUNTERFACTUAL: a fullBurstEnter-keyed swap also fires on the rotations helm completes', () => {
    const swappedShots = (r: Run) =>
      normals(r).filter(
        (d) => close(d.atkPct, SP_MULT) || close(d.atkPct, SP_MULT * 2)
      ).length;
    expect(swappedShots(run('Stance', swapOnFbEnter))).toBeGreaterThan(
      swappedShots(stance) * 1.5
    );
  });
  it('COUNTERFACTUAL: a 1.0s charge spaces the Swift Piercing shots 60 frames', () => {
    const cf = run('Stance', slowSp);
    const c = casts(cf)[0];
    const w = shots(cf).filter((s) => s.frame > c && s.frame < c + SP_FRAMES);
    expect(w[1].frame - w[0].frame).toBe(60);
  });
});

describe('S6 — burst: ATK ▲ 110% (5 sec) + 516.6% + the mode-branched rider', () => {
  it('ATK ▲ 110% self-only at each cast, 300 frames', () => {
    const g = ownBuffs(stance, 'atkPct').filter((b) => b.value === 110);
    expect(g.map((b) => [b.frame, b.expiresFrame, b.targetSlug])).toEqual(
      casts(stance).map((c) => [c, c + 300, SLUG])
    );
  });
  it('rider set: Stance {516.6, 958.9}, Engage {516.6, 854.6}; one each per cast, pre-Full-Burst', () => {
    expect(uniqAtk(burstHits(stance))).toEqual([516.6, 958.9]);
    expect(uniqAtk(burstHits(engage))).toEqual([516.6, 854.6]);
    for (const r of [stance, engage]) {
      expect(burstHits(r)).toHaveLength(casts(r).length * 2);
      expect(
        burstHits(r).every(
          (d) => casts(r).includes(d.frame) && !d.fbMajorApplied
        )
      ).toBe(true);
    }
  });
  it('the Engage 854.6% is true damage; the 516.6% is not', () => {
    const plain = new Map(
      burstHits(engage).map((d) => [`${d.frame}:${d.atkPct}`, d.mult.dmgUp])
    );
    for (const d of burstHits(run('Engage', trueBuffed))) {
      const delta = d.mult.dmgUp - plain.get(`${d.frame}:${d.atkPct}`)!;
      expect(delta).toBeCloseTo(
        close(d.atkPct, 854.6) ? TRUE_BUFF / 100 : 0,
        6
      );
    }
  });
  it('the burst hits snapshot the ATK ▲ 110% (listed first); applied after them they miss it', () => {
    const late = new Map(
      burstHits(run('Stance', atkAfterNukes)).map((d) => [
        `${d.frame}:${d.atkPct}`,
        d.baseAtk,
      ])
    );
    for (const d of burstHits(stance)) {
      expect(d.baseAtk).toBeGreaterThan(
        late.get(`${d.frame}:${d.atkPct}`)! * 1.3
      );
    }
  });
  it("all three burst hits are tagged 'allEnemies' ('Affects the same targets' inherits the clause — owner ruling 2026-08-10)", () => {
    const ov = loadOverride(SLUG) as any;
    const hits = ov.burst.flatMap((b: any) =>
      b.effects.filter((e: any) => e.kind === 'flatDamage')
    );
    expect(hits.map((e: any) => [e.atkPct, e.burstDesc]).sort()).toEqual([
      [516.6, 'allEnemies'],
      [854.6, 'allEnemies'],
      [958.9, 'allEnemies'],
    ]);
  });
  it('COUNTERFACTUAL: a mode-blind encoding fires both riders', () => {
    expect(uniqAtk(burstHits(run('Stance', modeBlind)))).toEqual([
      516.6, 854.6, 958.9,
    ]);
  });
});
