/**
 * eunhwa-tactical-upgrade - Eunhwa: Tactical Upgrade (SR / Fire / Attacker / Burst II)
 * BLIND kit-spec test: written from the kit prose alone. No sight of the shipped override, the
 * driver's tests, or any driver reasoning. Base: cd 20s, ammo 6, reload 141f, charge 60f,
 * hitsPerShot 1, normal 69.04%, core 200%.
 *
 * WHAT THE KIT SAYS (structural read - the header line + the Affects clause + the stat keyword):
 *  S1 a) header 'Activates when using Burst Skill. Affects self.' -> Camouflage 5 sec.
 *          => burstCast trigger (fires only on rotations SHE bursts), self.
 *  S1 b) header 'Activates when attacking with Full Charge during Full Burst. Affects self.'
 *          -> Camouflage 5 sec. => a PER-FULL-CHARGE re-application gated to Full Burst
 *             (shotFired + fbGate inFb), NOT a once-per-FB fullBurstEnter.
 *  S1 c) header 'Activates only when in Camouflage status. Affects self.'
 *          -> normals deal true damage (GAP: no timed true-flavor primitive outside weaponSwap)
 *          -> True Damage 42.24% => trueDamagePct 42.24, self, WINDOWED with the Camouflage.
 *  S2    header 'Activates only when self survives.' -> passive in v1 (nothing damages allies).
 *          AS: Critical Rate 8.16% (all allies from the SAME SQUAD), Charge Damage 41.81%
 *          (all allies), ATK 42.24% (self).
 *          LT bonus: Projectile Explosion Damage 5.11% + True Damage 30.97% (all allies),
 *          conditional on 'applying LT Formation to self' - the condition is KIT-SILENT (FLAG).
 *  B     'Changes the weapon in use' -> weaponSwap 105.6% as TRUE damage, 0.3s charge,
 *          full charge x300%, Max Ammunition 1 round, exploding bullet; plus the boss debuff
 *          'Explosive Round: Damage Taken 27.87% for 10 sec' on targets hit.
 *
 * FIXTURE: controlComp(SLUG, true) = liter B1 / crown B2 / carry / helm B3, boss Fire, focus carry.
 *   Eunhwa is BURST II and the control comp already seats crown at B2, so the two compete for the
 *   B2 link of the chain. Every group except the burst behavioural check is fixture-independent
 *   (S2 is passive; the Camouflage FB clause rides ANY team Full Burst). If the burst behavioural
 *   test reports zero burst casts, the finding is the FIXTURE, not the model - see the spec gaps.
 *
 * DISCRIMINATION STRATEGY: buffApply-event assertions for scope/target-set/window questions
 * (the fields the harness documents), committed-override structural assertions for the burst
 * weapon's literal kit numbers (fixture-independent), and one zeroed-value counterfactual for
 * load-bearingness + teammate inertness. Two full 180s runs.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'eunhwa-tactical-upgrade';

// Kit magnitudes, verbatim from the prose.
const CAMO_TRUE = 42.24;
const AS_CRIT = 8.16;
const AS_CHARGE = 41.81;
const AS_ATK = 42.24;
const LT_PROJ = 5.11;
const LT_TRUE = 30.97;
const SWAP_DMG = 105.6;
const SWAP_CHARGE_SEC = 0.3;
const SWAP_FULL_CHARGE = 300;
const SWAP_AMMO = 1;
const DT_VALUE = 27.87;
const DT_SEC = 10;
const EPS = 1e-6;

type Opts = ReturnType<typeof controlComp>;
type Res = ReturnType<typeof runComp>;
type SlotName = 'skill1' | 'skill2' | 'burst';

interface EvLike {
  kind: string;
  stat?: string;
  key?: string;
  value?: number;
  targetSlug?: string;
  casterIdx?: number | null;
  targetIdx?: number | null;
  expiresFrame?: number;
  refresh?: boolean;
}

interface EffLike {
  kind: string;
  stat?: string;
  value?: number;
  durationSec?: number;
  damagePct?: number;
  chargeTimeSec?: number;
  chargeMultPct?: number;
  maxAmmo?: number;
  trueNormals?: boolean;
}

interface BlockLike {
  slot?: string;
  target?: { kind?: string };
  effects?: EffLike[];
}

type SlotHolder = BlockLike[] | { blocks?: BlockLike[] } | undefined;

// The override FILE is slot-keyed; tolerate both the flat Block[] form and the
// CharacterSkills { blocks: Block[] } form so the structural assertions cannot
// fail for a packaging reason.
function blocksOf(ov: unknown, slot: SlotName): BlockLike[] {
  const holder = (ov as Record<SlotName, SlotHolder>)[slot];
  if (!holder) {
    return [];
  }
  return Array.isArray(holder) ? holder : (holder.blocks ?? []);
}

function allBlocks(ov: unknown): BlockLike[] {
  return (['skill1', 'skill2', 'burst'] as SlotName[]).flatMap((s) =>
    blocksOf(ov, s)
  );
}

function effectsOf(blocks: BlockLike[]): EffLike[] {
  return blocks.flatMap((b) => b.effects ?? []);
}

function record(opts: Opts): { res: Res; events: EvLike[] } {
  const events: EvLike[] = [];
  const seen = new Set<unknown>();
  const push = (ev: SimEvent): void => {
    if (seen.has(ev)) {
      return;
    }
    seen.add(ev);
    events.push(ev as unknown as EvLike);
  };
  const bag = opts as unknown as Record<string, unknown>;
  const cfg = (bag.cfg ?? {}) as Record<string, unknown>;
  const merged = { ...bag, onEvent: push, cfg: { ...cfg, onEvent: push } };
  return { res: runComp(merged as unknown as Opts), events };
}

function withOverride(patched: unknown): Opts {
  const bag = controlComp(SLUG, true) as unknown as Record<string, unknown>;
  const prev = (bag.overrides ?? {}) as Record<string, unknown>;
  return {
    ...bag,
    overrides: { ...prev, [SLUG]: patched },
  } as unknown as Opts;
}

function applies(events: EvLike[], stat: string, value: number): EvLike[] {
  return events.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      typeof e.value === 'number' &&
      Math.abs(e.value - value) < EPS
  );
}

const committed = withPatchedOverride(SLUG, () => {});

// Counterfactual: neutralise the Camouflage True Damage magnitude while leaving every trigger,
// gate and target untouched, so the rotation and the burst gauge are byte-identical.
const zeroCamoOv = withPatchedOverride(SLUG, (ov) => {
  for (const b of allBlocks(ov)) {
    for (const e of b.effects ?? []) {
      if (
        e.kind === 'buff' &&
        e.stat === 'trueDamagePct' &&
        typeof e.value === 'number' &&
        Math.abs(e.value - CAMO_TRUE) < EPS
      ) {
        e.value = 0;
      }
    }
  }
});

// Hoisted runs - two full 180s sims.
const base = record(controlComp(SLUG, true));
const zeroCamo = record(withOverride(zeroCamoOv));

const compSlugs = Object.keys(totals(base.res));
const teammates = compSlugs.filter((s) => s !== SLUG);

describe('eunhwa-tactical-upgrade - fixture sanity', () => {
  it('the control comp runs, the unit is in it, and she deals damage', () => {
    expect(compSlugs).toContain(SLUG);
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(base.events.length).toBeGreaterThan(0);
  });

  it('the team reaches Full Burst (skill1 clause b needs FB windows to be non-vacuous)', () => {
    const fb = base.events.filter((e) => e.kind === 'fullBurstStart').length;
    expect(fb).toBeGreaterThan(0);
  });
});

describe('skill1 - Camouflage True Damage 42.24%', () => {
  const camo = applies(base.events, 'trueDamagePct', CAMO_TRUE);

  it('is a WINDOWED, re-applied buff - not a permanent passive', () => {
    // Nearest-wrong: reading the word continuously as continuously-for-the-whole-fight and
    // encoding a passive trueDamagePct 42.24 applied once at frame 0 with no expiry. That model
    // drops the Camouflage gate entirely and credits the buff for all 180s.
    expect(camo.length).toBeGreaterThan(1);
    for (const e of camo) {
      expect(typeof e.expiresFrame).toBe('number');
      expect(Number.isFinite(e.expiresFrame as number)).toBe(true);
    }
  });

  it('affects SELF only', () => {
    // Nearest-wrong: target allies. Both S1 headers say Affects self.
    expect(camo.length).toBeGreaterThan(0);
    for (const e of camo) {
      expect(e.targetSlug).toBe(SLUG);
    }
  });

  it('re-applies on full charges DURING Full Burst, not once per Full Burst', () => {
    let inFb = false;
    let fbStarts = 0;
    let duringFb = 0;
    for (const e of base.events) {
      if (e.kind === 'fullBurstStart') {
        inFb = true;
        fbStarts += 1;
      } else if (e.kind === 'fullBurstEnd') {
        inFb = false;
      } else if (
        inFb &&
        e.kind === 'buffApply' &&
        e.stat === 'trueDamagePct' &&
        typeof e.value === 'number' &&
        Math.abs(e.value - CAMO_TRUE) < EPS
      ) {
        duringFb += 1;
      }
    }
    expect(fbStarts).toBeGreaterThan(0);
    expect(duringFb).toBeGreaterThan(0);
    // Nearest-wrong: keying clause b to fullBurstEnter, which yields EXACTLY one application per
    // Full Burst window. A per-full-charge trigger inside the window yields strictly more.
    expect(duringFb).toBeGreaterThan(fbStarts);
  });

  it('is load-bearing: zeroing the magnitude strictly lowers HER damage', () => {
    // Non-vacuity for the whole Camouflage branch: if nothing she does is true-flavored while the
    // window is open, a trueDamagePct buff is inert and this is RED.
    expect(totals(zeroCamo.res)[SLUG]).toBeLessThan(totals(base.res)[SLUG]);
  });

  it('moves no teammate (self-scoped, and the rotation is unchanged)', () => {
    for (const s of teammates) {
      expect(totals(zeroCamo.res)[s]).toBe(totals(base.res)[s]);
    }
  });

  it.skip('GAP - normal attacks deal TRUE damage while in Camouflage: no timed true-flavor primitive exists for the BASE weapon (weaponSwap.trueNormals is swap-scoped only)', () => {});

  it.skip('GAP - Camouflage is removed upon taking a direct hit: the v1 boss deals no damage, so removal is unobservable', () => {});

  it.skip('GAP - prevents being targeted by single-target attacks: purely defensive, no incoming damage modelled', () => {});
});

describe('skill2 - AS Formation (passive: activates only when self survives)', () => {
  it('Critical Rate 8.16% is GENERIC crit, not normal-attack-scoped', () => {
    // The kit line is a bare Critical Rate line with no normal-attack qualifier, so critRatePct is
    // the literal read. Nearest-wrong: critRateNormalPct (under-credits skill/burst crit).
    const generic = effectsOf(blocksOf(committed, 'skill2')).filter(
      (e) =>
        e.kind === 'buff' &&
        e.stat === 'critRatePct' &&
        Math.abs((e.value ?? 0) - AS_CRIT) < EPS
    );
    const scoped = effectsOf(allBlocks(committed)).filter(
      (e) => e.stat === 'critRateNormalPct'
    );
    expect(generic.length).toBeGreaterThan(0);
    expect(scoped.length).toBe(0);
  });

  it('Critical Rate 8.16% is SQUAD-scoped - it does not blanket the control comp', () => {
    // The kit says all allies from the same squad. liter / crown / helm are not Eunhwa squad-mates,
    // so under the faithful reading nobody but Eunhwa receives it in this fixture.
    // Nearest-wrong: a plain allies target, which hands 8.16% crit to all four teammates.
    const ev = applies(base.events, 'critRatePct', AS_CRIT);
    const targets = new Set(ev.map((e) => e.targetSlug));
    for (const s of teammates) {
      expect(targets.has(s)).toBe(false);
    }
  });

  it('Charge Damage 41.81% reaches ALL allies including self', () => {
    // Nearest-wrong: self-only (under-credits the whole team's charge bucket).
    const ev = applies(base.events, 'chargeDamagePct', AS_CHARGE);
    expect(ev.length).toBeGreaterThan(0);
    const targets = new Set(ev.map((e) => e.targetSlug));
    for (const s of compSlugs) {
      expect(targets.has(s)).toBe(true);
    }
  });

  it('ATK 42.24% is SELF only', () => {
    // Nearest-wrong: promoting an Affects self ATK line to an allies grant (over-credits 4 units).
    const ev = applies(base.events, 'atkPct', AS_ATK);
    expect(ev.length).toBeGreaterThan(0);
    for (const e of ev) {
      expect(e.targetSlug).toBe(SLUG);
    }
  });

  it('the two LT-Formation bonuses share ONE condition - both live or both absent, and both hit all allies; the LT True Damage stacks with the S1 Camouflage rather than overwriting it', () => {
    // The LT activation condition is KIT-SILENT (FLAG), so this does not assert a default. It
    // asserts internal consistency: the two bonus lines sit under the same Bonus effects header,
    // so any model that grants one and not the other is unfaithful whichever default it picked.
    const proj = applies(base.events, 'projectileExplosionPct', LT_PROJ);
    const lt = applies(base.events, 'trueDamagePct', LT_TRUE);
    expect(proj.length > 0).toBe(lt.length > 0);
    if (lt.length > 0) {
      const projT = new Set(proj.map((e) => e.targetSlug));
      const ltT = new Set(lt.map((e) => e.targetSlug));
      for (const s of compSlugs) {
        expect(projT.has(s)).toBe(true);
        expect(ltT.has(s)).toBe(true);
      }
      // Nearest-wrong: authoring both True Damage lines under one buff key, so the 42.24%
      // Camouflage window silently overwrites the 30.97% team line (or vice versa).
      const camoKeys = new Set(
        applies(base.events, 'trueDamagePct', CAMO_TRUE).map((e) => e.key)
      );
      const ltKeys = new Set(lt.map((e) => e.key));
      for (const k of ltKeys) {
        expect(camoKeys.has(k)).toBe(false);
      }
    }
  });
});

describe('burst - weapon swap + Explosive Round', () => {
  const burstBlocks = blocksOf(committed, 'burst');
  const swaps = effectsOf(burstBlocks).filter((e) => e.kind === 'weaponSwap');

  it('is ONE weaponSwap carrying the literal kit numbers', () => {
    // Nearest-wrong: encoding the 105.6% as a flatDamage rider (loses the ammo economy, the 0.3s
    // charge cadence and the x300% full-charge multiplier), or leaving the base 6-round magazine
    // in place instead of the stated 1-round capacity.
    expect(swaps.length).toBe(1);
    const s = swaps[0];
    expect(s.damagePct).toBeCloseTo(SWAP_DMG, 6);
    expect(s.chargeTimeSec).toBeCloseTo(SWAP_CHARGE_SEC, 6);
    expect(s.chargeMultPct).toBeCloseTo(SWAP_FULL_CHARGE, 6);
    expect(s.maxAmmo).toBe(SWAP_AMMO);
    expect(typeof s.durationSec).toBe('number');
    expect(s.durationSec as number).toBeGreaterThan(0);
  });

  it('swap shots are TRUE damage', () => {
    // 'Damage: 105.6% of final ATK as true damage'. Nearest-wrong: omitting trueNormals, which
    // silently disconnects the burst from BOTH True Damage buffs in this kit (S1 42.24%, S2 30.97%).
    expect(swaps[0]?.trueNormals).toBe(true);
  });

  it('Explosive Round is an ENEMY debuff of 27.87% for 10 sec', () => {
    // Nearest-wrong: modelling Damage Taken as a self/ally attackDamagePct buff, which credits only
    // the caster instead of the whole team.
    const dtBlocks = burstBlocks.filter((b) =>
      (b.effects ?? []).some((e) => e.stat === 'damageTakenPct')
    );
    expect(dtBlocks.length).toBeGreaterThan(0);
    for (const b of dtBlocks) {
      expect(b.target?.kind).toBe('enemy');
      const e = (b.effects ?? []).find(
        (x) => x.stat === 'damageTakenPct'
      ) as EffLike;
      expect(e.value).toBeCloseTo(DT_VALUE, 6);
      expect(e.durationSec).toBeCloseTo(DT_SEC, 6);
    }
    const selfish = effectsOf(allBlocks(committed)).filter(
      (e) =>
        e.kind === 'buff' &&
        e.stat === 'attackDamagePct' &&
        Math.abs((e.value ?? 0) - DT_VALUE) < EPS
    );
    expect(selfish.length).toBe(0);
  });

  it('the Explosive Round debuff actually lands on the boss in the control comp', () => {
    // NON-VACUITY for the whole burst group, and the fixture guard: Eunhwa is Burst II and
    // controlComp already seats crown at B2, so if this reports zero the finding is the FIXTURE
    // (she never won the B2 link), not the override.
    expect(
      base.events.filter((e) => e.kind === 'burstCast').length
    ).toBeGreaterThan(0);
    const dt = applies(base.events, 'damageTakenPct', DT_VALUE);
    expect(dt.length).toBeGreaterThan(0);
    for (const e of dt) {
      expect(e.casterIdx).toBeNull();
      expect(e.targetIdx).toBeNull();
    }
  });

  it.skip('GAP - the Exploding Bullet AoE / projectile-explosion flavor: weaponSwap carries no flavor field, so the S2 Projectile Explosion Damage 5.11% cannot feed the burst shot', () => {});

  it.skip('FLAG - the swap window length is kit-silent: durationSec is an unverifiable estimate (10s taken from the Explosive Round window / standard Full Burst duration)', () => {});
});
