import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

/**
 * guilty-mighty-bunny (SR / Water / Attacker / Burst III, 6 ammo, 60f charge) — BLIND kit-spec test.
 *
 * Written from the kit prose ALONE (role S5): no sight of the driver's override, tests or reasoning.
 * Every claim below traces to one of these kit lines:
 *
 *   S1 a ■ battle start, self: "ATK ▲ 20.1%", continuous.
 *   S1 b ■ battle start AND a Full Charge maintained >=1s while NOT in Mighty Stomp: toggles
 *          Bunny Mode: Stance <-> Bunny Mode: Engage. At battle start the unit is NOT in Stance, so
 *          the start-of-battle branch resolves to STANCE => Stance is the DEFAULT state. The TOGGLE
 *          itself is player-driven and has no engine primitive (see the skipped test).
 *   S1 c/d ■ entering one mode converts allies in the opposite mode. No roster ally carries a Bunny
 *          Mode and the mode carries no stat payload => offensively inert, and it must not leak.
 *   S2 Engage ■ normal attacks + Mighty Stomp deal TRUE damage (flavor only); on landing a Full
 *          Charge: 370.08% of final ATK as true damage to the target.
 *   S2 Stance ■ "Attack Damage ▲ 20.45%" + "Charge Damage ▲ 40%" (continuous, self); on landing a
 *          Full Charge: 450.89% of final ATK as additional damage.
 *   Burst ■ "Mighty Stomp: Changes the weapon in use", charge time fixed 1.5s, 101.3% per shot,
 *          Full Charge Damage 250%, "Duration: 1 rounds"; Add.1 "Charge Damage ▲ 1400% for 1
 *          rounds"; Add.2 "Attack Damage ▲ 77.35% for 10 sec".
 *
 * FIXTURE: controlComp(SLUG, true). B1+B2 are REQUIRED — a lone Burst III unit makes zero Full
 * Bursts, which would make every burst-slot assertion vacuous. The fixed B3 slot is kept because NO
 * assertion here reads an absolute damage number: every magnitude claim is either a structural read
 * of the committed override or a self-referential counterfactual delta, both immune to a teammate's
 * buffs.
 *
 * SHAPE DEFENSE (blind): the two available descriptions of OverrideFile disagree on whether a slot
 * is `Block[]` or `{ blocks: Block[] }`, so slotBlocks() accepts both. The owner field on
 * damage/shot events is not pinned either, so ownerOf() tries the plausible names and the shot
 * assertion fails LOUDLY (shots > 20) rather than passing vacuously if none resolves.
 */

const SLUG = 'guilty-mighty-bunny';

type Ev = SimEvent & Record<string, any>;

const near = (a: unknown, b: number, tol = 0.5): boolean =>
  typeof a === 'number' && Math.abs(a - b) <= tol;

/* ---------- override-shape helpers (tolerant of Block[] vs { blocks: Block[] }) ---------- */
type Slot = 'skill1' | 'skill2' | 'burst';
const SLOTS: Slot[] = ['skill1', 'skill2', 'burst'];

function slotBlocks(ov: any, slot: Slot): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return Array.isArray(s.blocks) ? s.blocks : [];
}
const effectsOf = (b: any): any[] => (Array.isArray(b?.effects) ? b.effects : []);
const allBlocks = (ov: any): any[] => SLOTS.flatMap((s) => slotBlocks(ov, s));
const allEffects = (ov: any): any[] => allBlocks(ov).flatMap(effectsOf);
const slotEffects = (ov: any, slot: Slot): any[] => slotBlocks(ov, slot).flatMap(effectsOf);

/** the committed override, READ (never mutated) through the clone withPatchedOverride hands us */
const COMMITTED: any = (() => {
  let snap: any = null;
  withPatchedOverride(SLUG, (ov: any) => {
    snap = JSON.parse(JSON.stringify(ov));
  });
  return snap;
})();

/* ---------- run helpers ---------- */
function withOv(ov: any) {
  const cfg: any = controlComp(SLUG, true);
  cfg.overrides = { ...(cfg.overrides ?? {}), [SLUG]: ov };
  return cfg;
}
function run(cfg: any) {
  const evs: Ev[] = [];
  cfg.onEvent = (ev: SimEvent) => {
    evs.push(ev as Ev);
  };
  const res = runComp(cfg);
  const t = totals(res) as Record<string, number>;
  return { res, evs, t, total: t[SLUG] };
}

const ownerOf = (ev: any): string | undefined =>
  ev.slug ?? ev.unitSlug ?? ev.srcSlug ?? ev.sourceSlug ?? ev.casterSlug ?? ev.owner ?? ev.unit;
const maybeCarry = (ev: any): boolean => {
  const o = ownerOf(ev);
  return o === undefined || o === SLUG;
};
const isCarry = (ev: any): boolean => ownerOf(ev) === SLUG;

const buffApplies = (evs: Ev[], stat: string, value: number, tol = 0.5): Ev[] =>
  evs.filter((e) => e.kind === 'buffApply' && e.stat === stat && near(e.value, value, tol));

/* ---------- counterfactual overrides (value patches only: the effect instance survives, so burst
   gauge / shot counts / event counts are identical across every run below) ---------- */
const OV_S1_ATK_ZERO = withPatchedOverride(SLUG, (ov: any) => {
  for (const e of allEffects(ov)) {
    if (e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 20.1, 0.05)) e.value = 0;
  }
});
const riderScaled = (scale: number) =>
  withPatchedOverride(SLUG, (ov: any) => {
    for (const e of allEffects(ov)) {
      if (e.kind === 'flatDamage' && (near(e.atkPct, 370.08) || near(e.atkPct, 450.89))) {
        e.atkPct = e.atkPct * scale;
      }
    }
  });
const OV_RIDER_ZERO = riderScaled(0);
const OV_RIDER_DOUBLE = riderScaled(2);
const OV_1400_AS_SECONDS = withPatchedOverride(SLUG, (ov: any) => {
  for (const e of slotEffects(ov, 'burst')) {
    if (
      e.kind === 'buff' &&
      e.stat === 'chargeDamagePct' &&
      typeof e.value === 'number' &&
      e.value >= 1000
    ) {
      delete e.durationShots;
      e.durationSec = 10;
    }
  }
});
const OV_7735_SHORT = withPatchedOverride(SLUG, (ov: any) => {
  for (const e of slotEffects(ov, 'burst')) {
    if (e.kind === 'buff' && e.stat === 'attackDamagePct' && near(e.value, 77.35, 0.05)) {
      delete e.durationShots;
      e.durationSec = 1;
    }
  }
});

/* ---------- hoisted runs: 6 full 180s sims ---------- */
const BASE = run(controlComp(SLUG, true));
const NO_S1_ATK = run(withOv(OV_S1_ATK_ZERO));
const RIDER_0 = run(withOv(OV_RIDER_ZERO));
const RIDER_2X = run(withOv(OV_RIDER_DOUBLE));
const CHG_AS_TIME = run(withOv(OV_1400_AS_SECONDS));
const ADPCT_SHORT = run(withOv(OV_7735_SHORT));

describe('guilty-mighty-bunny — skill1', () => {
  // Discriminates the SCOPE trap: a caster-scaled encoding (casterAtkPct) re-emits a FLAT ATK
  // number, never 20.1, and a Damage-Up encoding would surface under attackDamagePct.
  it('S1-a: ATK ▲20.1% is a plain self atkPct buff, continuous', () => {
    const ap = buffApplies(BASE.evs, 'atkPct', 20.1, 0.05).filter((e) => e.targetSlug === SLUG);
    expect(ap.length).toBeGreaterThan(0);
    expect(buffApplies(BASE.evs, 'attackDamagePct', 20.1, 0.05).length).toBe(0);
    for (const e of ap) expect(e.durationShots ?? undefined).toBeUndefined();
  });

  // Non-vacuity + inertness: the buff moves the carry and NOTHING else. A value patch cannot change
  // event counts, so any teammate movement would mean the buff was mis-targeted at allies.
  it('S1-a is load-bearing on the carry and inert on every teammate', () => {
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(NO_S1_ATK.total).toBeLessThan(BASE.total);
    for (const slug of Object.keys(BASE.t)) {
      if (slug === SLUG) continue;
      expect(NO_S1_ATK.t[slug]).toBeCloseTo(BASE.t[slug], 3);
    }
  });

  // The kit's battle-start branch reads: "Activates if this unit is NOT in the Bunny Mode: Stance
  // state -> Initiates Bunny Mode: Stance." At frame 0 she is in neither mode, so the opening state
  // is STANCE and Chain Enhance (not Chain Release) is the live S2 branch. Nearest-wrong: defaulting
  // to Engage because it is the flashier branch — that run carries neither buff below.
  it('S1-b: the battle-start resolution is Bunny Mode: Stance (Chain Enhance live by default)', () => {
    const ad = buffApplies(BASE.evs, 'attackDamagePct', 20.45, 0.05).filter(
      (e) => e.targetSlug === SLUG,
    );
    const cd = buffApplies(BASE.evs, 'chargeDamagePct', 40, 0.05).filter(
      (e) => e.targetSlug === SLUG,
    );
    expect(ad.length).toBeGreaterThan(0);
    expect(cd.length).toBeGreaterThan(0);
  });

  // TARGET-SET inertness for S1-c/d: the mode-conversion lines touch allies, but they carry no stat
  // payload, so none of this unit's self-only magnitudes may ever land on a teammate.
  it('S1 leaks none of its self-only magnitudes onto a teammate', () => {
    const leaks = BASE.evs.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.targetSlug !== undefined &&
        e.targetSlug !== SLUG &&
        ((e.stat === 'atkPct' && near(e.value, 20.1, 0.05)) ||
          (e.stat === 'attackDamagePct' &&
            (near(e.value, 20.45, 0.05) || near(e.value, 77.35, 0.05))) ||
          (e.stat === 'chargeDamagePct' && near(e.value, 1400, 0.5))),
    );
    expect(leaks).toEqual([]);
  });

  it.skip('S1-b GAP: the Stance<->Engage TOGGLE (Full Charge held >=1s, not during Mighty Stomp) has no engine primitive — `mode` is a static user choice, `selfStatus` is a max-extending timed window, and neither can flip a binary state per sustained charge; the sim also releases charge shots at full charge, so the ">=1 second maintained" condition is itself unobservable', () => {});

  it.skip('S1-c/S1-d GAP: converting allies in the opposite Bunny Mode — no roster ally carries a Bunny Mode and the mode itself has no stat payload, so the line is unobservable (its only testable residue is the no-leak assertion above)', () => {});
});

describe('guilty-mighty-bunny — skill2 (Chain Release / Chain Enhance)', () => {
  // Neither branch may be silently dropped, and neither may be unconditionally live: the kit makes
  // them mutually exclusive states. Nearest-wrong: authoring both ungated (double-credit) or keeping
  // only Stance (the Engage rider vanishes).
  it('S2: BOTH Bunny-Mode branches are authored, and each is gated', () => {
    const gateKeys = [
      'mode',
      'requiresSelfStatus',
      'requiresTargetStatus',
      'resourceGate',
      'fbGate',
      'swapGate',
      'ownBurstGate',
      'teamHas',
      'formation',
      'everyN',
    ];
    const gated = (b: any) => gateKeys.some((k) => b[k] !== undefined);
    const blocks = slotBlocks(COMMITTED, 'skill2');
    const engage = blocks.filter((b) =>
      effectsOf(b).some((e) => e.kind === 'flatDamage' && near(e.atkPct, 370.08)),
    );
    const stance = blocks.filter((b) =>
      effectsOf(b).some(
        (e) =>
          (e.kind === 'flatDamage' && near(e.atkPct, 450.89)) ||
          (e.kind === 'buff' && e.stat === 'attackDamagePct' && near(e.value, 20.45, 0.05)),
      ),
    );
    expect(engage.length).toBeGreaterThan(0);
    expect(stance.length).toBeGreaterThan(0);
    for (const b of [...engage, ...stance]) expect(gated(b)).toBe(true);
  });

  // TRIGGER IDENTITY + exclusivity in one count. One rider per charged pull (she is an SR: every
  // pull is a full charge, so fullCharge and shotFired are byte-identical here and this assertion
  // deliberately does NOT claim to separate them — see the spec note). Upper bound <= shots rules
  // out BOTH branches firing (that would be ~2x shots); the lower bound rules out a burst-cast /
  // full-burst-enter / every-N keying, which would collapse the count to roughly the burst count.
  it('S2: exactly ONE Full-Charge rider fires, once per charged pull', () => {
    const shots = BASE.evs.filter((e) => e.kind === 'shot' && isCarry(e));
    expect(shots.length).toBeGreaterThan(20);
    const bursts = buffApplies(BASE.evs, 'chargeDamagePct', 1400, 0.5).length;
    const riders = BASE.evs.filter(
      (e) => e.kind === 'damage' && e.srcSlot === 'skill2' && maybeCarry(e),
    );
    expect(riders.length).toBeGreaterThan(bursts * 5);
    expect(riders.length).toBeLessThanOrEqual(shots.length);
    expect(riders.length).toBeGreaterThanOrEqual(shots.length - bursts - 2);
  });

  // The rider is real damage, and its payload genuinely rides atkPct (doubling the field doubles the
  // delta). Nearest-wrong: a rider authored as an inert/zero stub, or one whose damage actually
  // comes from somewhere else. Both kit magnitudes must be present in the file.
  it('S2: the live Full-Charge rider carries real damage and is linear in its atkPct', () => {
    const d1 = BASE.total - RIDER_0.total;
    const d2 = RIDER_2X.total - RIDER_0.total;
    expect(d1).toBeGreaterThan(0);
    expect(d2 / d1).toBeGreaterThan(1.96);
    expect(d2 / d1).toBeLessThan(2.04);
    const pcts = allEffects(COMMITTED)
      .filter((e) => e.kind === 'flatDamage')
      .map((e) => e.atkPct);
    expect(pcts.some((p: any) => near(p, 370.08))).toBe(true);
    expect(pcts.some((p: any) => near(p, 450.89))).toBe(true);
  });

  // BUCKET SCOPE. "Charge Damage ▲40%" is charge-bucket additive, not a generic Damage-Up term; a
  // totals counterfactual cannot tell the two apart (both raise damage), only the stat key can.
  it('S2 Stance: ▲20.45% is attackDamagePct and ▲40% is chargeDamagePct', () => {
    const effs = slotEffects(COMMITTED, 'skill2').filter((e) => e.kind === 'buff');
    expect(effs.some((e) => e.stat === 'attackDamagePct' && near(e.value, 20.45, 0.05))).toBe(true);
    expect(effs.some((e) => e.stat === 'chargeDamagePct' && near(e.value, 40, 0.05))).toBe(true);
    expect(effs.some((e) => e.stat === 'attackDamagePct' && near(e.value, 40, 0.05))).toBe(false);
  });

  it.skip('S2 Engage E1/E2 GAP: "normal attacks deal true damage" / "Mighty Stomp deals true damage" — damage events carry no flavor field, and the control comp has no trueDamagePct consumer, so the flavor is damage-neutral and unobservable here. Recipe: a comp containing a True Damage ▲ buffer would make it readable as a totals delta', () => {});
});

describe('guilty-mighty-bunny — burst (Mighty Stomp)', () => {
  // Every stated burst number, pinned structurally. maxShots 1 is the "Duration: 1 rounds" reading
  // (corroborated by Add.1's own "for 1 rounds"); nearest-wrong is a standard 10s weapon-change
  // window, which would fire several stomps. Two swap effects are tolerated (a mode-gated
  // true-flavored variant for the Engage branch is a legitimate encoding), but all must agree.
  it('burst: Mighty Stomp is a weaponSwap carrying 101.3% / 250% / 1.5s and ONE round', () => {
    const swaps = slotEffects(COMMITTED, 'burst').filter((e) => e.kind === 'weaponSwap');
    expect(swaps.length).toBeGreaterThan(0);
    for (const s of swaps) {
      expect(near(s.damagePct, 101.3)).toBe(true);
      expect(near(s.chargeMultPct, 250)).toBe(true);
      expect(near(s.chargeTimeSec, 1.5, 0.01) || near(s.chargeTimeClamp, 1.5, 0.01)).toBe(true);
      expect(s.maxShots).toBe(1);
    }
  });

  // DURATION SEMANTICS, the headline trap on this kit. "for 1 rounds" is a ROUND budget spent by
  // firing, not a clock. Under the nearest-wrong (a 10s window) the ▲1400% charge damage survives
  // the swap and lands on her ordinary SR charge shots, so the counterfactual total must be HIGHER.
  it('burst Add.1: Charge Damage ▲1400% is ROUND-scoped (1 round), not a timed window', () => {
    const a = buffApplies(BASE.evs, 'chargeDamagePct', 1400, 0.5);
    expect(a.length).toBeGreaterThanOrEqual(2);
    for (const e of a) expect(e.durationShots).toBe(1);
    expect(CHG_AS_TIME.total).toBeGreaterThan(BASE.total);
  });

  // The mirror-image semantics check: Add.2 is stated in SECONDS, so it must NOT be round-scoped,
  // must be bounded (not continuous), and must re-arm exactly once per burst cast — same count as
  // the ▲1400% buff, which rides the same cast. Shortening the window must cost damage.
  it('burst Add.2: Attack Damage ▲77.35% is TIME-scoped (10 sec), once per burst', () => {
    const a = buffApplies(BASE.evs, 'attackDamagePct', 77.35, 0.05);
    const c = buffApplies(BASE.evs, 'chargeDamagePct', 1400, 0.5);
    expect(a.length).toBeGreaterThanOrEqual(2);
    expect(a.length).toBe(c.length);
    for (const e of a) {
      expect(e.durationShots ?? undefined).toBeUndefined();
      expect(typeof e.expiresFrame).toBe('number');
    }
    expect(ADPCT_SHORT.total).toBeLessThan(BASE.total);
  });
});
