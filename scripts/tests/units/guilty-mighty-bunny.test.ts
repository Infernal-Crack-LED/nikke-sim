// PER-UNIT KIT SPEC — `guilty-mighty-bunny` (Guilty: Mighty Bunny, SR/Attacker/Water/Missilis,
// Burst III cd 40s, ammo 6, charge 1s). VARIANT of the base unit `guilty` (SG/Wind) — a different
// unit and kit. Kit-autonomy gauntlet 2026-10-02, tier 2 (a self-mode system with mode-gated true
// damage, a round-count burst buff, a uses-bounded burst weapon swap).
//
// One assertion group per KIT LINE, against the SHIPPED override; `withPatchedOverride` only builds
// the named nearest-wrong COUNTERFACTUALS, each of which must flip the assertion.
//
// Kit (data/characters.json → characters['guilty-mighty-bunny'].skills, L10):
//   S1 ■ battle start → self: ATK ▲ 20.1%, continuous                                          [G1]
//      ■ battle start / Full Charge held ≥1s outside Mighty Stomp → toggle Bunny Mode
//        (Stance ⇄ Engage); allies in the opposite mode follow                     [UNMODELED]
//   S2 ■ Engage — Chain Release: normals deal true damage (E1), Mighty Stomp deals true damage
//        (E2), on landing a Full Charge attack: 370.08% of final ATK as true damage (E3)     [G3–G5]
//      ■ Stance — Chain Enhance: Attack Damage ▲ 20.45% (E1), Charge Damage ▲ 40% (E2), on
//        landing a Full Charge attack: 450.89% of final ATK as additional damage (E3)        [G2–G3]
//   BU ■ self: Mighty Stomp weapon change — charge fixed 1.5s, 101.3% of final ATK, full charge
//        250%, 1 round; Charge Damage ▲ 1400% for 1 round; Attack Damage ▲ 77.35% for 10 sec [G6–G8]
//
// Bunny Mode is a static user-selected kit mode (modes ['Stance','Engage'], Stance default — the
// kit's battle-start line puts her INTO Stance; only a 1s Full Charge hold, which the sim never
// performs, switches it). Why each assertion discriminates:
//   G1  one self grant at frame 0, no expiry, value 20.1.
//   G2  the default selection IS Stance: Chain Enhance's two buffs exist from frame 0 and Chain
//       Release's rider never fires; Engage swaps both sides. A mode-blind encoding (both branches
//       always on) fires both riders.
//   G3  the full-charge rider fires once per CHARGED shot INCLUDING the Mighty Stomp shot (it is a
//       full-charge attack) — an unswapped-only reading drops the 6 Stomp riders.
//   G4  Engage's rider is TRUE: a self True Damage ▲ buff lands in its dmgUp, which a plain rider
//       ignores; it never cores (a skill hit — the 2026-08-13 true-damage ruling).
//   G5  Engage makes her normals true (trueNormalsModes), Stance does not — the base weapon AND the
//       Stomp shot (the engine applies the unit's static true-normal flavor to swap shots too, which
//       is exactly Chain Release E2), so one swap block serves both modes.
//   G6  exactly one Stomp shot per cast (maxShots 1 — "Duration: 1 rounds"), charged, at 101.3%,
//       ≥ 89 frames after the cast (the 90-frame fixed charge counts the cast frame); without maxShots the swap
//       keeps firing Stomps for its whole durationSec.
//   G7  the 1400% Charge Damage rides exactly ONE round — the Stomp: the Stomp's charge multiplier
//       is 2.5 + 14.0 (+0.4 Stance), and the next base shot is back to 2.5 (+0.4).
//   G8  Attack Damage 77.35% is self-only, granted at each cast, expiring 600 frames later.
//
// Fixture: controlComp — liter (B1) / crown (B2) / guilty-mighty-bunny (B3, focus) / `helm`
// (SR/Water Helm, B3), boss Fire. Deterministic; event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'guilty-mighty-bunny';
const IDX = 2;
const BASE_MULT = 69.04;
const STOMP_MULT = 101.3;
const ENGAGE_RIDER = 370.08;
const STANCE_RIDER = 450.89;
const TRUE_BUFF = 100; // synthetic self True Damage ▲ used only to OBSERVE true flavor

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
const baseShots = (r: Run) =>
  normals(r).filter((d) => d.atkPct.toFixed(2) === BASE_MULT.toFixed(2));
const stomps = (r: Run) =>
  normals(r).filter((d) => d.atkPct.toFixed(2) === STOMP_MULT.toFixed(2));
const riders = (r: Run) => dmg(r).filter((d) => d.srcSlot === 'skill2');
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
const uniqAtk = (xs: Damage[]) =>
  [...new Set(xs.map((d) => +d.atkPct.toFixed(2)))].sort();
const dmgUpAt = (xs: Damage[]) =>
  new Map(xs.map((d) => [d.frame, d.mult.dmgUp]));

// ---- counterfactual patches -------------------------------------------------------------------
const patch = (mutate: (ov: any) => void) => withPatchedOverride(SLUG, mutate);
const withTrueBuff = (ov: any) =>
  ov.skill1.push({
    slot: 'skill1',
    trigger: { kind: 'passive' },
    target: { kind: 'self' },
    effects: [{ kind: 'buff', stat: 'trueDamagePct', value: TRUE_BUFF }],
  });
const rider = (ov: any, mode: string) =>
  ov.skill2.find(
    (b: any) => b.mode === mode && b.trigger.kind === 'fullCharge'
  );
const swapEffects = (ov: any) =>
  ov.burst
    .filter((b: any) => b.effects.some((e: any) => e.kind === 'weaponSwap'))
    .map((b: any) => b.effects.find((e: any) => e.kind === 'weaponSwap'));
const burstBuffs = (ov: any) =>
  ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'attackDamagePct')
  );

const modeBlind = patch((ov) => {
  for (const s of ['skill1', 'skill2', 'burst']) {
    for (const b of ov[s]) {
      delete b.mode;
    }
  }
});
const riderUnswappedOnly = patch((ov) => {
  rider(ov, 'Stance').swapGate = 'unswapped';
});
const trueBuffed = patch(withTrueBuff);
const trueBuffedPlainRider = patch((ov) => {
  withTrueBuff(ov);
  delete rider(ov, 'Engage').effects[0].flavor;
});
const trueBuffedNoModeNormals = patch((ov) => {
  withTrueBuff(ov);
  delete ov.trueNormalsModes;
});
const noMaxShots = patch((ov) => {
  for (const e of swapEffects(ov)) {
    delete e.maxShots;
  }
});
const fasterStomp = patch((ov) => {
  for (const e of swapEffects(ov)) {
    e.chargeTimeSec = 1;
    e.chargeTimeClamp = 1;
  }
});
const twoRoundChargeBuff = patch((ov) => {
  burstBuffs(ov).effects.find(
    (e: any) => e.stat === 'chargeDamagePct'
  ).durationShots = 2;
});
const adAllAllies = patch((ov) => {
  const b = burstBuffs(ov);
  const ad = b.effects.find((e: any) => e.stat === 'attackDamagePct');
  b.effects = b.effects.filter((e: any) => e !== ad);
  ov.burst.push({ ...b, target: { kind: 'allies' }, effects: [ad] });
});

const stance = run('Stance');
const engage = run('Engage');
const byDefault = run();

describe('G1 — S1 battle-start ATK ▲ 20.1% (self, continuous)', () => {
  it('one self grant at frame 0, no expiry', () => {
    const g = ownBuffs(stance, 'atkPct');
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({
      frame: 0,
      value: 20.1,
      targetSlug: SLUG,
      expiresFrame: null,
    });
  });
});

describe('G2 — Bunny Mode is a kit mode, Stance by default', () => {
  it('the default selection behaves exactly as Stance', () => {
    expect(byDefault.total).toBe(stance.total);
  });
  it('Stance: Chain Enhance buffs from frame 0, only the 450.89% rider', () => {
    expect(
      ownBuffs(stance, 'attackDamagePct').filter((b) => b.value === 20.45)
    ).toMatchObject([{ frame: 0, expiresFrame: null, targetSlug: SLUG }]);
    expect(
      ownBuffs(stance, 'chargeDamagePct').filter((b) => b.value === 40)
    ).toMatchObject([{ frame: 0, expiresFrame: null, targetSlug: SLUG }]);
    expect(uniqAtk(riders(stance))).toEqual([STANCE_RIDER]);
  });
  it('Engage: no Chain Enhance buffs, only the 370.08% rider', () => {
    expect(
      ownBuffs(engage, 'attackDamagePct').filter((b) => b.value === 20.45)
    ).toEqual([]);
    expect(
      ownBuffs(engage, 'chargeDamagePct').filter((b) => b.value === 40)
    ).toEqual([]);
    expect(uniqAtk(riders(engage))).toEqual([ENGAGE_RIDER]);
  });
  it('COUNTERFACTUAL: a mode-blind encoding fires both riders', () => {
    expect(uniqAtk(riders(run('Stance', modeBlind)))).toEqual([
      ENGAGE_RIDER,
      STANCE_RIDER,
    ]);
  });
});

describe('G3 — the full-charge rider fires on every charged shot, the Stomp included', () => {
  it('one rider per charged shot, frame-locked to it', () => {
    for (const r of [stance, engage]) {
      const charged = shots(r)
        .filter((s) => s.charged)
        .map((s) => s.frame);
      expect(charged.length).toBeGreaterThan(50);
      expect(riders(r).map((d) => d.frame)).toEqual(charged);
    }
  });
  it('the Stomp shots carry a rider', () => {
    const riderFrames = new Set(riders(stance).map((d) => d.frame));
    expect(stomps(stance).length).toBeGreaterThan(0);
    for (const s of stomps(stance)) {
      expect(riderFrames.has(s.frame)).toBe(true);
    }
  });
  it('COUNTERFACTUAL: an unswapped-only rider drops the Stomp riders', () => {
    const cf = run('Stance', riderUnswappedOnly);
    expect(riders(cf).length).toBe(
      riders(stance).length - stomps(stance).length
    );
  });
});

describe('G4 — Engage rider (Chain Release E3) is true damage from a skill', () => {
  const buffed = run('Engage', trueBuffed);
  const plain = run('Engage', trueBuffedPlainRider);
  it('a True Damage ▲ buff lands in its dmgUp; a plain rider ignores it', () => {
    const a = riders(buffed)[0];
    const b = riders(plain)[0];
    expect(a.frame).toBe(b.frame);
    expect(a.mult.dmgUp - b.mult.dmgUp).toBeCloseTo(TRUE_BUFF / 100, 6);
  });
  it('never cores (skill-sourced)', () => {
    expect(riders(engage).every((d) => !d.coreEligible)).toBe(true);
  });
});

describe('G5 — true-flavored normals and Stomp only in Engage', () => {
  const buffed = run('Engage', trueBuffed);
  it('Engage base-weapon normals take the True Damage ▲ buff (trueNormalsModes)', () => {
    const cf = dmgUpAt(baseShots(run('Engage', trueBuffedNoModeNormals)));
    const live = baseShots(buffed);
    expect(live.length).toBeGreaterThan(50);
    for (const d of live) {
      expect(d.mult.dmgUp - cf.get(d.frame)!).toBeCloseTo(TRUE_BUFF / 100, 6);
    }
  });
  it('Stance base-weapon normals do not', () => {
    const plain = dmgUpAt(baseShots(stance));
    for (const d of baseShots(run('Stance', trueBuffed))) {
      expect(d.mult.dmgUp).toBeCloseTo(plain.get(d.frame)!, 9);
    }
  });
  it('the Engage Stomp is true (trueNormalsModes covers swap shots); without the field it is not', () => {
    const cf = dmgUpAt(stomps(run('Engage', trueBuffedNoModeNormals)));
    for (const d of stomps(buffed)) {
      expect(d.mult.dmgUp - cf.get(d.frame)!).toBeCloseTo(TRUE_BUFF / 100, 6);
    }
  });
  it('the Stance Stomp is not true', () => {
    const plain = dmgUpAt(stomps(stance));
    for (const d of stomps(run('Stance', trueBuffed))) {
      expect(d.mult.dmgUp).toBeCloseTo(plain.get(d.frame)!, 9);
    }
  });
});

describe('G6 — Mighty Stomp: one 1.5s-charge shot per cast', () => {
  it('exactly one Stomp per cast, charged, the first shot after the cast, ≥ 90 frames later', () => {
    for (const r of [stance, engage]) {
      const cs = casts(r);
      expect(cs.length).toBeGreaterThanOrEqual(5);
      const st = stomps(r);
      expect(st).toHaveLength(cs.length);
      cs.forEach((c, i) => {
        const first = shots(r).find((s) => s.frame > c)!;
        expect(first.frame).toBe(st[i].frame);
        expect(first.charged).toBe(true);
        // 90-frame fixed charge, counted from the cast frame inclusive
        expect(st[i].frame - c).toBeGreaterThanOrEqual(89);
      });
    }
  });
  it('the Stomp lands inside Full Burst and takes the +50% major (it fires ~1.5s after the cast)', () => {
    expect(stomps(stance).every((d) => d.inFullBurst && d.fbMajorApplied)).toBe(
      true
    );
  });
  it('COUNTERFACTUAL: without maxShots the swap keeps firing Stomps', () => {
    expect(stomps(run('Stance', noMaxShots)).length).toBeGreaterThan(
      casts(stance).length
    );
  });
  it('COUNTERFACTUAL: a 1.0s charge fires the Stomp earlier', () => {
    const cf = stomps(run('Stance', fasterStomp));
    expect(cf[0].frame).toBeLessThan(stomps(stance)[0].frame);
  });
});

describe('G7 — Charge Damage ▲ 1400% for exactly one round (the Stomp)', () => {
  it('Stomp charge multiplier = 2.5 + 14.0 (+0.4 Stance); the next base shot is back to base', () => {
    for (const [r, extra] of [
      [stance, 0.4],
      [engage, 0],
    ] as const) {
      for (const s of stomps(r)) {
        expect(s.mult.charge).toBeCloseTo(2.5 + 14 + extra, 6);
        const next = normals(r).find((d) => d.frame > s.frame)!;
        expect(next.mult.charge).toBeCloseTo(2.5 + extra, 6);
      }
    }
  });
  it('granted at each cast as a 1-round buff', () => {
    expect(
      ownBuffs(stance, 'chargeDamagePct')
        .filter((b) => b.value === 1400)
        .map((b) => [b.frame, b.durationShots])
    ).toEqual(casts(stance).map((c) => [c, 1]));
  });
  it('COUNTERFACTUAL: a 2-round buff also lifts the shot after the Stomp', () => {
    const cf = run('Stance', twoRoundChargeBuff);
    const s = stomps(cf)[0];
    const next = normals(cf).find((d) => d.frame > s.frame)!;
    expect(next.mult.charge).toBeCloseTo(2.5 + 14 + 0.4, 6);
  });
});

describe('G8 — Attack Damage ▲ 77.35% for 10 sec (self)', () => {
  it('self-only, once per cast, 600 frames', () => {
    const g = ownBuffs(stance, 'attackDamagePct').filter(
      (b) => b.value === 77.35
    );
    expect(g.map((b) => [b.frame, b.expiresFrame, b.targetSlug])).toEqual(
      casts(stance).map((c) => [c, c + 600, SLUG])
    );
  });
  it('COUNTERFACTUAL: an all-allies reading lands on four targets', () => {
    const g = ownBuffs(run('Stance', adAllAllies), 'attackDamagePct').filter(
      (b) => b.value === 77.35
    );
    expect(new Set(g.map((b) => b.targetSlug)).size).toBe(4);
  });
});
