/**
 * jill — BLIND kit-spec test (cross-family S5). Written from the kit prose ALONE;
 * the driver's override, tests and reasoning were never read.
 *
 * KIT (AR / Electric / Attacker / Burst III — 9 ammo, 81 reload frames, no charge, no burst damage line):
 *   S1a "start of battle + upon reloading to Max Ammunition, self: Magnum Ammo —
 *        Normal Attack Damage Multiplier +30% for 9 round(s)"
 *        -> normalAttackPct 30, ROUND-counted (durationShots 9, NOT 9 seconds), re-armed every magazine.
 *   S1b "when using Burst Skill, self: True Damage +34.99% for 10 sec"
 *        -> trueDamagePct 34.99, trigger = burstCast (jill's OWN burst), NOT fullBurstEnter.
 *   S2a "start of battle + upon reloading to max ammunition, self: Acid Ammo — only the first round
 *        deals sustained damage; 192% of final ATK every 1 sec for 30 sec"
 *        -> ONE maintained sustained DoT at 192%/s. The re-arm period (one magazine, ~2s) is far
 *           SHORTER than the 30s window, so the real behaviour is refresh/maintain. Encoding it as a
 *           per-magazine re-application would stack ~14 concurrent copies (engine never dedups DoTs).
 *   S2b "when entering Full Burst, self: ATK +40.03% for 10 sec"
 *        -> atkPct 40.03, trigger = fullBurstEnter (ANY team Full Burst), plain percentage stat.
 *   Ba  "Reload speed is fixed at a 99.96% increase for 10 sec" -> reloadSpeedPct 99.96 (the "fixed at"
 *        CLAMP has no engine primitive — recorded as a gap; weapon-state IS damage, it gates shot count).
 *   Bb  "Removes 100% of ammo. Forced Reload" -> consumeAmmo: the payoff is that it RE-ARMS S1a + S2a.
 *   Bc  "Hit Rate +80.78% for 10 sec" -> hitRatePct 80.78 (core-hit lift; magnitude is measured-only).
 *   Bd  "Attack Damage +75% for 10 sec" -> attackDamagePct 75 (Damage-Up bucket, so it also lifts the
 *        sustained ticks — the mirror image of S1a's normal-only scope).
 *   Be  "Normal attacks deal True Damage for 10 sec" -> true-flavored normals; this is what makes S1b
 *        pay out at all, so S1b being non-inert is the indirect proof that Be is wired.
 *
 * FIXTURE: controlComp('jill', true) = liter B1 / crown B2 / jill B3 (focus) / helm B3.
 *   The SECOND Burst III (helm) is load-bearing: it makes team Full Bursts strictly more frequent than
 *   jill's own burst casts, which is the only way burstCast (S1b) and fullBurstEnter (S2b) can diverge.
 *   A lone B3 casts ZERO bursts and every burst assertion here would be vacuous — hence the explicit
 *   non-vacuity guard below.
 *
 * SHAPE NOTES (defensive on purpose): two spellings of the override file are documented, so blocksOf()
 *   accepts BOTH `ov.skill1: Block[]` and `ov.skill1.blocks: Block[]`, and slotOf()/isJill() accept the
 *   plausible unit-attribution fields on shot/reload/burstCast. A "harness wiring" describe runs first so
 *   a field-name miss reads as one legible failure instead of ten confusing ones.
 *
 * 11 sim runs, all hoisted to module scope.
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

const SLUG = 'jill';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;

type Opts = ReturnType<typeof controlComp>;
type AnyEv = SimEvent & Record<string, any>;

// ---------- override-shape helpers ----------
function blocksOf(ov: any, slot: (typeof SLOTS)[number]): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return Array.isArray(s.blocks) ? s.blocks : [];
}
function eachBlock(ov: any, fn: (b: any, slot: string) => void): void {
  for (const slot of SLOTS) for (const b of blocksOf(ov, slot)) fn(b, slot);
}
function eachEffect(ov: any, fn: (e: any, b: any, slot: string) => void): void {
  eachBlock(ov, (b, slot) => {
    for (const e of b.effects ?? []) fn(e, b, slot);
  });
}

// ---------- counterfactual builders (nearest-wrong models) ----------
const zeroBuff = (stat: string, value: number) => (ov: any) =>
  eachEffect(ov, (e) => {
    if (e.kind === 'buff' && e.stat === stat && Math.abs(Number(e.value) - value) < 0.5) e.value = 0;
  });
const dropKind = (kind: string) => (ov: any) =>
  eachBlock(ov, (b) => {
    b.effects = (b.effects ?? []).filter((e: any) => e.kind !== kind);
  });
const compose =
  (...fns: ((ov: any) => void)[]) =>
  (ov: any) => {
    for (const f of fns) f(ov);
  };
// Nearest-wrong for Acid Ammo: a per-magazine re-application holding a 30s window, which STACKS
// (~14 concurrent instances at a ~2s magazine cycle) instead of one maintained instance.
const stackDot = (ov: any) =>
  eachBlock(ov, (b) => {
    let hit = false;
    for (const e of b.effects ?? []) {
      if (e.kind === 'dot') {
        e.durationSec = 30;
        hit = true;
      }
    }
    if (hit) b.trigger = { kind: 'lastBullet' };
  });

const patch = (mutate: (ov: any) => void) => ({ [SLUG]: withPatchedOverride(SLUG, mutate as any) });

// ---------- run helper ----------
function run(mutate?: (ov: any) => void) {
  const base: any = controlComp(SLUG, true);
  const events: AnyEv[] = [];
  const onEvent = (ev: SimEvent) => {
    events.push(ev as AnyEv);
  };
  const opts: any = { ...base, onEvent, cfg: { ...(base.cfg ?? {}), onEvent } };
  if (mutate) opts.overrides = { ...(base.overrides ?? {}), ...patch(mutate) };
  const res = runComp(opts as Opts);
  const all = totals(res);
  return { res, events, all, total: all[SLUG] };
}

// ---------- event helpers ----------
const slotOf = (e: AnyEv): unknown => e.srcSlot ?? e.slot ?? e.unitIdx ?? e.casterIdx ?? e.idx;
const isJill = (e: AnyEv, idx: number): boolean =>
  e.slug === SLUG || e.unitSlug === SLUG || slotOf(e) === idx;
const jillIndex = (evs: AnyEv[]): number => {
  const e = evs.find((x) => x.kind === 'buffApply' && x.targetSlug === SLUG && x.targetIdx != null);
  return e ? Number(e.targetIdx) : -1;
};
const evsOfKind = (evs: AnyEv[], kind: string, idx: number) =>
  evs.filter((e) => e.kind === kind && isJill(e, idx));
const buffApplies = (evs: AnyEv[], stat: string, value: number) =>
  evs.filter(
    (e) => e.kind === 'buffApply' && e.stat === stat && Math.abs(Number(e.value) - value) < 0.02,
  );
const jillShots = (r: { events: AnyEv[] }) => evsOfKind(r.events, 'shot', jillIndex(r.events)).length;
const jillReloads = (r: { events: AnyEv[] }) =>
  evsOfKind(r.events, 'reload', jillIndex(r.events)).length;
const others = (t: Record<string, number>) =>
  Object.fromEntries(Object.entries(t).filter(([k]) => k !== SLUG));

// ---------- hoisted runs (11 full 180s sims) ----------
const R = {
  base: run(),
  noMagnum: run(zeroBuff('normalAttackPct', 30)),
  noDot: run(dropKind('dot')),
  noDotNoMagnum: run(compose(dropKind('dot'), zeroBuff('normalAttackPct', 30))),
  noTrue: run(zeroBuff('trueDamagePct', 34.99)),
  noHitRate: run(zeroBuff('hitRatePct', 80.78)),
  noAtkDmg: run(zeroBuff('attackDamagePct', 75)),
  noDotNoAtkDmg: run(compose(dropKind('dot'), zeroBuff('attackDamagePct', 75))),
  noReload: run(zeroBuff('reloadSpeedPct', 99.96)),
  noConsume: run(dropKind('consumeAmmo')),
  stackedDot: run(stackDot),
};
const EV = R.base.events;
const IDX = jillIndex(EV);
const FB_COUNT = EV.filter((e) => e.kind === 'fullBurstStart').length;
const JILL_CASTS = evsOfKind(EV, 'burstCast', IDX).length;

let SHAPE: any = null;
withPatchedOverride(SLUG, (ov: any) => {
  SHAPE = ov;
});

describe('jill — harness wiring (a field-name miss must read as ONE failure)', () => {
  it('emits events and jill is in the comp', () => {
    expect(EV.length).toBeGreaterThan(0);
    expect(unitOf(R.base.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(IDX).toBeGreaterThanOrEqual(0);
  });

  it('attributes shots, reloads and burst casts to jill', () => {
    expect(jillShots(R.base)).toBeGreaterThan(0);
    expect(jillReloads(R.base)).toBeGreaterThan(0);
    expect(JILL_CASTS).toBeGreaterThan(0);
  });

  it('fixture is NON-VACUOUS: team Full Bursts outnumber jill own burst casts', () => {
    // Without this, burstCast (S1b) and fullBurstEnter (S2b) are indistinguishable and the two
    // trigger-identity tests below prove nothing. A failure here is a FIXTURE problem, not a model bug.
    expect(FB_COUNT).toBeGreaterThan(JILL_CASTS);
  });
});

describe('S1a Magnum Ammo — Normal Attack Damage Multiplier +30%, 9 ROUNDS, self', () => {
  it('grants normalAttackPct 30 to jill and to nobody else', () => {
    const b = buffApplies(EV, 'normalAttackPct', 30);
    expect(b.length).toBeGreaterThan(0);
    expect(b.every((e) => e.targetSlug === SLUG)).toBe(true);
  });

  it('duration is ROUND-counted (9 rounds), not 9 wall-clock seconds', () => {
    // "for 9 round(s)" = durationShots. Damage-equivalent at the base 9-round magazine, but a
    // durationSec:9 (or bare passive) encoding diverges the moment max ammo changes.
    const b = buffApplies(EV, 'normalAttackPct', 30);
    expect(b[0].durationShots).toBe(9);
  });

  it('re-arms on every reload-to-max, not once at battle start', () => {
    const b = buffApplies(EV, 'normalAttackPct', 30);
    expect(b.length).toBeGreaterThan(20);
    expect(b.length).toBeGreaterThanOrEqual(jillReloads(R.base) - 1);
  });

  it('is scoped to NORMAL attacks, not the generic Damage-Up bucket', () => {
    // Discriminator: measure the buff's damage cost with the sustained DoT live vs removed.
    // normalAttackPct cannot touch DoT ticks -> the cost is identical (ratio 1).
    // The nearest-wrong (attackDamagePct 30) would also lift the 192%/s ticks -> ratio > 1.
    const withDot = R.base.total - R.noMagnum.total;
    const withoutDot = R.noDot.total - R.noDotNoMagnum.total;
    expect(withDot).toBeGreaterThan(0);
    expect(withDot / withoutDot).toBeCloseTo(1, 2);
  });
});

describe("S1b True Damage +34.99% — on jill's OWN burst cast", () => {
  it('grants trueDamagePct 34.99 to jill', () => {
    const t = buffApplies(EV, 'trueDamagePct', 34.99);
    expect(t.length).toBeGreaterThan(0);
    expect(t.every((e) => e.targetSlug === SLUG)).toBe(true);
  });

  it('fires once per jill burst cast — NOT once per team Full Burst', () => {
    // "Activates when using Burst Skill" is burst-cast identity. Keying it to fullBurstEnter
    // over-credits every rotation the OTHER Burst III (helm) completes.
    const t = buffApplies(EV, 'trueDamagePct', 34.99);
    expect(t.length).toBe(JILL_CASTS);
    expect(t.length).toBeLessThan(FB_COUNT);
  });

  it('is non-inert — which also proves the burst true-flavors her normals (Be)', () => {
    // trueDamagePct only pays out on true-flavored damage. If zeroing it costs nothing, either
    // this buff or the burst's "Normal attacks deal True Damage" line is not wired.
    expect(R.base.total).toBeGreaterThan(R.noTrue.total);
  });

  it('is self-scoped: no teammate total moves', () => {
    expect(others(R.noTrue.all)).toEqual(others(R.base.all));
  });
});

describe('S2a Acid Ammo — ONE maintained 192%/s sustained DoT', () => {
  it('contributes a substantial share of jill damage', () => {
    expect(R.base.total).toBeGreaterThan(R.noDot.total * 1.05);
  });

  it('does NOT stack per magazine (the 30s-window nearest-wrong is >2x)', () => {
    // Re-keying the DoT to a per-magazine trigger with a 30s window stacks ~14 concurrent copies
    // (the engine appends an instance per fire and never dedups). If the shipped model already
    // stacks, this counterfactual is a no-op and the ratio collapses to ~1.
    expect(R.stackedDot.total).toBeGreaterThan(R.base.total * 2);
  });

  it('moves no teammate (self-cast, boss-facing)', () => {
    expect(others(R.noDot.all)).toEqual(others(R.base.all));
  });

  it.skip('GAP: per-tick flavor is "sustained" and ticks are non-core — damage-event flavor/bucket field names are not in the packet, so this cannot be asserted blind', () => {});
});

describe('S2b ATK +40.03% — on entering ANY team Full Burst', () => {
  it('applies on every Full Burst entry, not only on jill own bursts', () => {
    const a = buffApplies(EV, 'atkPct', 40.03).filter((e) => e.targetSlug === SLUG);
    expect(a.length).toBe(FB_COUNT);
    expect(a.length).toBeGreaterThan(JILL_CASTS);
  });

  it('is a plain percentage stat, not a caster-scaled flat ATK grant', () => {
    const a = buffApplies(EV, 'atkPct', 40.03).filter((e) => e.targetSlug === SLUG);
    expect(Number(a[0].value)).toBeCloseTo(40.03, 2);
  });
});

describe('Burst — reload speed fixed at +99.96% / Removes 100% of ammo / Forced Reload', () => {
  it('grants reloadSpeedPct 99.96 to jill', () => {
    const r = buffApplies(EV, 'reloadSpeedPct', 99.96);
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].targetSlug).toBe(SLUG);
  });

  it('reload speed IS damage: removing it costs jill shots and damage', () => {
    // Weapon-state modifiers gate shot count; "defensive, skip it" is the classic wrong call.
    expect(jillShots(R.base)).toBeGreaterThan(jillShots(R.noReload));
    expect(R.base.total).toBeGreaterThan(R.noReload.total);
  });

  it.skip('GAP: "reload speed is FIXED at" is a stat CLAMP, not an additive buff — no engine primitive exists, so a co-active reload buff would stack above the fixed value', () => {});

  it('Removes 100% of ammo -> an extra forced reload per burst', () => {
    expect(jillReloads(R.base)).toBeGreaterThan(jillReloads(R.noConsume));
  });

  it('the forced reload RE-ARMS Magnum Ammo (reload-to-max) — the kit combo', () => {
    expect(buffApplies(EV, 'normalAttackPct', 30).length).toBeGreaterThan(
      buffApplies(R.noConsume.events, 'normalAttackPct', 30).length,
    );
  });
});

describe('Burst — Hit Rate +80.78% / Attack Damage +75% / true normals', () => {
  it('grants hitRatePct 80.78 to jill', () => {
    const h = buffApplies(EV, 'hitRatePct', 80.78);
    expect(h.length).toBeGreaterThan(0);
    expect(h[0].targetSlug).toBe(SLUG);
  });

  it('Hit Rate is wired to the core-hit lift (removing it costs damage)', () => {
    expect(R.base.total).toBeGreaterThan(R.noHitRate.total);
  });

  it.skip('⚑ measured-only: the Hit-Rate -> core-rate magnitude is a derived constant, not assertable from kit text', () => {});

  it('grants attackDamagePct 75 to jill only', () => {
    const a = buffApplies(EV, 'attackDamagePct', 75).filter((e) => e.targetSlug === SLUG);
    expect(a.length).toBeGreaterThan(0);
  });

  it('Attack Damage lands in the Damage-Up bucket: its cost is LARGER when the DoT is live', () => {
    // Mirror image of the S1a scope test. attackDamagePct credits the sustained ticks too, so
    // removing it must cost more with the DoT present. A ratio of exactly 1 means the engine
    // excludes sustained ticks from Damage-Up — report that, do not silently re-encode.
    const withDot = R.base.total - R.noAtkDmg.total;
    const withoutDot = R.noDot.total - R.noDotNoAtkDmg.total;
    expect(withDot).toBeGreaterThan(0);
    expect(withDot).toBeGreaterThan(withoutDot);
  });

  it('Attack Damage is self-scoped: no teammate total moves', () => {
    expect(others(R.noAtkDmg.all)).toEqual(others(R.base.all));
  });

  it.skip('GAP: "Normal attacks deal True Damage for 10 sec" has no standalone primitive (only weaponSwap.trueNormals) — direct per-shot flavor tagging is not assertable from the documented event fields', () => {});
});

describe('no-invention / inertness guards (measured > fudge)', () => {
  it('the burst slot invents no damage — the kit gives the burst no damage number', () => {
    const kinds = blocksOf(SHAPE, 'burst').flatMap((b: any) =>
      (b.effects ?? []).map((e: any) => e.kind),
    );
    expect(kinds).not.toContain('flatDamage');
    expect(kinds).not.toContain('dot');
    expect(kinds).not.toContain('storedHit');
  });

  it('the kit carries no Pierce, heal, shield, gauge or rotation effect', () => {
    expect(SHAPE?.hasPierce ?? false).toBeFalsy();
    const kinds = SLOTS.flatMap((s) => blocksOf(SHAPE, s)).flatMap((b: any) =>
      (b.effects ?? []).map((e: any) => e.kind),
    );
    for (const k of [
      'heal',
      'shield',
      'fillGauge',
      'gainPierce',
      'burstCdr',
      'fullBurstExtend',
      'stun',
      'burstEligibility',
      'reenterStage',
    ]) {
      expect(kinds).not.toContain(k);
    }
  });

  it('every kit line reads "Affects self": no block targets allies', () => {
    const targets = SLOTS.flatMap((s) => blocksOf(SHAPE, s)).map((b: any) => b.target?.kind);
    expect(targets.length).toBeGreaterThan(0);
    expect(targets.every((t: string) => t === 'self' || t === 'enemy')).toBe(true);
  });
});
