/**
 * neve — Neve. BLIND kit-spec test (S5 cross-family), written from the kit prose ALONE.
 *
 * KIT (SG / Water / Attacker / Burst III, cd 40s, ammo 9, 10 hits/shot, no charge):
 *   skill1  "Affects 1 enemy ... lowest remaining HP" + "Deals 145.45% of final ATK"
 *           -> NO activation clause => INTERVAL rider. The cadence itself is NOT in the kit text
 *              (ALWAYS-⚑ #2), so this file pins the MAGNITUDE, the target set, the flavor and the
 *              trigger KIND, and leaves the interval seconds unasserted (it.skip below).
 *   skill2  "Activates when entering Full Burst. Affects self."
 *           "Gain Pierce for 2 round(s)" + "ATK ▲ 124.8% for 2 round(s)"
 *           -> fullBurstEnter (fires on ANY team Full Burst, not only neve's own cast), self,
 *              ROUND-count duration (durationShots), never wall-clock seconds.
 *   burst   "Affects self." Critical Rate ▲ 31.95% / Hit Rate ▲ 22.04%, both "for 20 sec"
 *           -> burstCast (self-buffs living in her OWN burst slot), wall-clock seconds, no damage.
 *
 * FIXTURE — controlComp('neve', true): liter B1 + crown B2 make bursts actually chain (a lone B3
 * makes ZERO Full Bursts), and the fixed SECOND Burst-III slot is what makes the two trigger
 * identities separable. Neve's own burst cd is 40s while the comp opens a Full Burst far more
 * often, so she cannot cast on every Full Burst. That yields two counts that are ORDER-INDEPENDENT
 * (no reliance on intra-frame event ordering between fullBurstStart and buff dispatch):
 *     skill2 applies  == fullBurstStart count   (fullBurstEnter)   — RED if keyed to burstCast
 *     burst  applies  <  fullBurstStart count   (burstCast)        — RED if keyed to fullBurstEnter
 * Each is the other's nearest-wrong model, so the pair is mutually reinforcing.
 * controlComp('neve', false) (neve sole B3) is a secondary fixture used only for liveness.
 *
 * Structural assertions read the COMMITTED override through withPatchedOverride(slug, no-op),
 * which returns a clone (disk untouched). They pin literal kit values that the damage totals
 * cannot distinguish (e.g. 145.45 vs a scaled re-authoring). Behavioural counterfactuals pin that
 * each line is LIVE and correctly scoped.
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

const SLUG = 'neve';

// kit literals
const RIDER_PCT = 145.45;
const ATK_PCT = 124.8;
const ATK_ROUNDS = 2;
const CRIT_PCT = 31.95;
const HITRATE_PCT = 22.04;
const BURST_SEC = 20;

type Comp = ReturnType<typeof controlComp>;
type Res = ReturnType<typeof runComp>;
type Ov = ReturnType<typeof withPatchedOverride>;
type Slot = 'skill1' | 'skill2' | 'burst';

/** Loose structural views — the override FILE is slot-keyed; tolerate both the bare Block[] slot
 *  shape and a slot object carrying its own blocks[] so the structural checks can't false-RED on
 *  container shape rather than on kit faithfulness. */
type LooseEffect = {
  kind: string;
  stat?: string;
  value?: number;
  atkPct?: number;
  durationSec?: number;
  durationShots?: number;
  core?: boolean;
  flavor?: string;
  [k: string]: unknown;
};
type LooseBlock = {
  slot?: string;
  trigger?: { kind?: string; sec?: number };
  target?: { kind?: string };
  effects?: LooseEffect[];
  [k: string]: unknown;
};
type LooseOv = { hasPierce?: boolean; [k: string]: unknown };

const loose = (ov: Ov): LooseOv => ov as unknown as LooseOv;

function blocksOf(ov: Ov, slot: Slot): LooseBlock[] {
  const s = loose(ov)[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s as LooseBlock[];
  const inner = (s as { blocks?: unknown }).blocks;
  return Array.isArray(inner) ? (inner as LooseBlock[]) : [];
}

function effectsOf(ov: Ov, slot: Slot): LooseEffect[] {
  return blocksOf(ov, slot).flatMap((b) => b.effects ?? []);
}

// ---------------------------------------------------------------- harness plumbing

function run(opts: Comp): { res: Res; events: SimEvent[] } {
  const events: SimEvent[] = [];
  const tapped = {
    ...opts,
    cfg: {
      ...(opts as { cfg?: Record<string, unknown> }).cfg,
      onEvent: (ev: SimEvent) => events.push(ev),
    },
  } as Comp;
  return { res: runComp(tapped), events };
}

function comp(ov?: Ov, helm = true): Comp {
  const base = controlComp(SLUG, helm);
  return ov ? ({ ...base, overrides: { [SLUG]: ov } } as Comp) : base;
}

type BuffEv = {
  kind: 'buffApply';
  stat: string;
  value: number;
  targetSlug?: string;
  durationShots?: number;
  durationSec?: number;
  expiresFrame?: number;
};

const buffApplies = (events: SimEvent[]): BuffEv[] =>
  events.filter((e) => e.kind === 'buffApply') as unknown as BuffEv[];

const countKind = (events: SimEvent[], kind: string): number =>
  events.filter((e) => (e as { kind: string }).kind === kind).length;

/** buff applications identified by their kit-literal magnitude (no other unit in the control comp
 *  carries these exact values), so the filter never depends on caster indices. */
const byValue = (events: SimEvent[], stat: string, value: number): BuffEv[] =>
  buffApplies(events).filter((e) => e.stat === stat && e.value === value);

const neveTotal = (r: Res): number => totals(r)[SLUG];

const others = (r: Res): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(totals(r))) if (k !== SLUG) out[k] = v;
  return out;
};

// ---------------------------------------------------------------- overrides (clones)

const OV = withPatchedOverride(SLUG, () => {});

const ovRiderZero = withPatchedOverride(SLUG, (ov) => {
  for (const e of effectsOf(ov, 'skill1')) if (e.kind === 'flatDamage') e.atkPct = 0;
});
const ovRiderDouble = withPatchedOverride(SLUG, (ov) => {
  for (const e of effectsOf(ov, 'skill1')) if (e.kind === 'flatDamage') e.atkPct = RIDER_PCT * 2;
});
const ovS2AsBurstCast = withPatchedOverride(SLUG, (ov) => {
  for (const b of blocksOf(ov, 'skill2')) {
    if (b.trigger?.kind === 'fullBurstEnter') b.trigger = { kind: 'burstCast' };
  }
});
const ovAtkAsSeconds = withPatchedOverride(SLUG, (ov) => {
  for (const e of effectsOf(ov, 'skill2')) {
    if (e.kind === 'buff' && e.stat === 'atkPct') {
      delete e.durationShots;
      e.durationSec = ATK_ROUNDS; // the nearest-wrong reading: "2 round(s)" as 2 wall-clock sec
    }
  }
});
const ovAtkZero = withPatchedOverride(SLUG, (ov) => {
  for (const e of effectsOf(ov, 'skill2')) if (e.kind === 'buff' && e.stat === 'atkPct') e.value = 0;
});
const ovCritZero = withPatchedOverride(SLUG, (ov) => {
  for (const e of effectsOf(ov, 'burst')) if (e.kind === 'buff' && e.stat === 'critRatePct') e.value = 0;
});
const ovHitRateZero = withPatchedOverride(SLUG, (ov) => {
  for (const e of effectsOf(ov, 'burst')) if (e.kind === 'buff' && e.stat === 'hitRatePct') e.value = 0;
});

// ---------------------------------------------------------------- hoisted runs (9 sims)

const base = run(comp());
const sole = run(comp(undefined, false));
const riderZero = run(comp(ovRiderZero));
const riderDouble = run(comp(ovRiderDouble));
const s2AsBurstCast = run(comp(ovS2AsBurstCast));
const atkAsSeconds = run(comp(ovAtkAsSeconds));
const atkZero = run(comp(ovAtkZero));
const critZero = run(comp(ovCritZero));
const hitRateZero = run(comp(ovHitRateZero));

const FB_STARTS = countKind(base.events, 'fullBurstStart');

describe('neve — fixture sanity', () => {
  it('the control comp actually bursts and neve deals damage', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    // Non-vacuity for every Full-Burst-keyed assertion in this file.
    expect(FB_STARTS).toBeGreaterThan(1);
    expect(countKind(sole.events, 'fullBurstStart')).toBeGreaterThan(0);
  });
});

describe('neve skill1 — "Deals 145.45% of final ATK", 1 enemy, no activation clause', () => {
  it('is ONE interval-triggered enemy-targeted flatDamage rider at exactly 145.45%', () => {
    const dmgBlocks = blocksOf(OV, 'skill1').filter((b) =>
      (b.effects ?? []).some((e) => e.kind === 'flatDamage'),
    );
    // The kit carries exactly one damage line; splitting it would double-count.
    expect(dmgBlocks.length).toBe(1);
    // Nearest-wrong trigger identities: passive (fires once at t=0) or an invented event trigger.
    // The prose has no "Activates when" clause, so the disposition is interval.
    expect(dmgBlocks[0].trigger?.kind).toBe('interval');
    expect(dmgBlocks[0].target?.kind).toBe('enemy');

    const eff = (dmgBlocks[0].effects ?? []).find((e) => e.kind === 'flatDamage');
    expect(eff?.atkPct).toBe(RIDER_PCT);
    // The text says neither "core strike" nor any sustained/sequential/true flavour.
    expect(eff?.core).not.toBe(true);
    expect(eff?.flavor).toBeUndefined();
  });

  it('the rider is LIVE and scales linearly with its atkPct (so 145.45 is the real magnitude)', () => {
    const d1 = neveTotal(base.res) - neveTotal(riderZero.res);
    const d2 = neveTotal(riderDouble.res) - neveTotal(riderZero.res);
    // Non-vacuity: the rider fires at least once in the 180s fixture.
    expect(d1).toBeGreaterThan(0);
    // Doubling the kit % must exactly double the contribution — RED if the rider is authored at a
    // fudged/absorbed magnitude that does not track the kit number, or if it is gated off.
    expect(d2 / d1).toBeCloseTo(2, 6);
  });

  it('the rider is self-sourced only — teammates are byte-identical when it is zeroed', () => {
    expect(others(riderZero.res)).toEqual(others(base.res));
  });

  // ⚑ ALWAYS-⚑ #2: the kit text gives this damage line NO trigger, so its cadence (interval
  // seconds / first-fire phase) is outside the input domain of a blind read. Pin from the
  // datamined skill cooldown or from popup footage; not assertable from prose.
  it.skip('rider cadence (interval seconds + first-fire phase) — ⚑ not in the kit text', () => {});

  // "1 enemy unit(s) with the lowest remaining HP" — v1 has a single immortal boss and no HP
  // pool, so the selection rule is unobservable; only target.kind === 'enemy' is testable.
  it.skip('lowest-remaining-HP enemy selection — unobservable (single partless boss)', () => {});
});

describe('neve skill2 — "Activates when entering Full Burst. Affects self."', () => {
  it('fires on EVERY team Full Burst (fullBurstEnter), not only on neve\'s own burst', () => {
    const applies = byValue(base.events, 'atkPct', ATK_PCT);
    // Order-independent count identity: one application per Full Burst.
    expect(applies.length).toBe(FB_STARTS);
    // Nearest-wrong (burstCast-keyed) demonstrably UNDER-fires in this fixture, which proves the
    // assertion above actually discriminates rather than passing vacuously.
    const wrong = byValue(s2AsBurstCast.events, 'atkPct', ATK_PCT);
    expect(wrong.length).toBeLessThan(FB_STARTS);
    expect(wrong.length).toBeGreaterThan(0);
  });

  it('ATK ▲ 124.8% is a self-scaling atkPct on SELF only', () => {
    const applies = byValue(base.events, 'atkPct', ATK_PCT);
    expect(applies.length).toBeGreaterThan(0);
    // Raw percentage => atkPct. A casterAtkPct mis-encoding would emit a FLAT ATK number
    // ((124.8/100)×staticAtk), so the literal 124.8 filter would find nothing.
    for (const e of applies) expect(e.targetSlug).toBe(SLUG);
    // Inertness: no teammate is ever granted this buff.
    expect(buffApplies(base.events).filter((e) => e.value === ATK_PCT && e.targetSlug !== SLUG)).toHaveLength(0);
  });

  it('"for 2 round(s)" is a ROUND count, not 2 wall-clock seconds', () => {
    const eff = effectsOf(OV, 'skill2').find((e) => e.kind === 'buff' && e.stat === 'atkPct');
    expect(eff?.durationShots).toBe(ATK_ROUNDS);
    expect(eff?.durationSec).toBeUndefined();

    for (const e of byValue(base.events, 'atkPct', ATK_PCT)) {
      expect(e.durationShots).toBe(ATK_ROUNDS);
    }
    // Behavioural discrimination: a round window stretches across reloads / shrinks with fire
    // rate, so re-reading it as durationSec:2 moves neve's total.
    expect(neveTotal(atkAsSeconds.res)).not.toBe(neveTotal(base.res));
  });

  it('the ATK buff is live and self-scoped (teammates unmoved when zeroed)', () => {
    expect(neveTotal(base.res)).toBeGreaterThan(neveTotal(atkZero.res));
    expect(others(atkZero.res)).toEqual(others(base.res));
  });

  it('"Gain Pierce" is a gainPierce EFFECT on the FB-enter block, not a whole-fight hasPierce flag', () => {
    const fbBlocks = blocksOf(OV, 'skill2').filter((b) => b.trigger?.kind === 'fullBurstEnter');
    expect(fbBlocks.length).toBeGreaterThan(0);
    expect(fbBlocks.every((b) => b.target?.kind === 'self')).toBe(true);
    expect(fbBlocks.flatMap((b) => b.effects ?? []).some((e) => e.kind === 'gainPierce')).toBe(true);
    // Nearest-wrong: the boolean flag tags EVERY shot of the fight as Pierce, but the kit grants
    // it only for 2 rounds after entering Full Burst.
    expect(loose(OV).hasPierce).not.toBe(true);
  });

  // The gainPierce effect carries only durationSec — there is no round-count primitive for it, so
  // "Gain Pierce for 2 round(s)" cannot be expressed faithfully; any seconds value is a ⚑ estimate.
  it.skip('Pierce expiry after 2 ROUNDS — GAP: gainPierce has no durationShots primitive', () => {});

  // The control comp carries no Pierce Damage ▲ consumer, so the pierce tag moves no damage here;
  // its effect is only measurable in a comp with a pierce-damage buff.
  it.skip('Pierce damage contribution — no Pierce Damage ▲ carrier in the control comp', () => {});
});

describe('neve burst — self Critical Rate ▲ 31.95% / Hit Rate ▲ 22.04%, 20 sec', () => {
  it('fires on neve\'s OWN burst cast (burstCast), NOT on every team Full Burst', () => {
    const crit = byValue(base.events, 'critRatePct', CRIT_PCT);
    expect(crit.length).toBeGreaterThan(0);
    // Her cd is 40s and the comp opens Full Bursts far more often, so a burstCast-keyed block
    // MUST fire strictly fewer times than there are Full Bursts. RED under a fullBurstEnter
    // mis-key (which would over-credit her crit window on rotations she never cast).
    expect(crit.length).toBeLessThan(FB_STARTS);
    // Hit Rate rides the same cast.
    expect(byValue(base.events, 'hitRatePct', HITRATE_PCT).length).toBe(crit.length);
  });

  it('both buffs are self-only, wall-clock 20s, and share one window', () => {
    const bBlocks = blocksOf(OV, 'burst');
    expect(bBlocks.length).toBeGreaterThan(0);
    expect(bBlocks.every((b) => b.trigger?.kind === 'burstCast')).toBe(true);
    expect(bBlocks.every((b) => b.target?.kind === 'self')).toBe(true);

    const bEff = effectsOf(OV, 'burst');
    const crit = bEff.find((e) => e.kind === 'buff' && e.stat === 'critRatePct');
    const hr = bEff.find((e) => e.kind === 'buff' && e.stat === 'hitRatePct');
    expect(crit?.value).toBe(CRIT_PCT);
    expect(crit?.durationSec).toBe(BURST_SEC);
    expect(crit?.durationShots).toBeUndefined();
    expect(hr?.value).toBe(HITRATE_PCT);
    expect(hr?.durationSec).toBe(BURST_SEC);
    expect(hr?.durationShots).toBeUndefined();

    // Scope trap: the prose says plain "Critical Rate ▲", NOT "Critical Rate of normal attacks",
    // so the normal-attack-scoped stat would under-credit her skill1 rider.
    expect(bEff.some((e) => e.stat === 'critRateNormalPct')).toBe(false);

    // Same cast, same 20s window => identical expiry for the pair (frame-free duration check).
    const critEv = byValue(base.events, 'critRatePct', CRIT_PCT);
    const hrEv = byValue(base.events, 'hitRatePct', HITRATE_PCT);
    for (let i = 0; i < critEv.length; i++) {
      expect(critEv[i].targetSlug).toBe(SLUG);
      expect(hrEv[i].targetSlug).toBe(SLUG);
      expect(hrEv[i].expiresFrame).toBe(critEv[i].expiresFrame);
    }
    // Inertness: no ally receives either buff.
    expect(
      buffApplies(base.events).filter(
        (e) => (e.value === CRIT_PCT || e.value === HITRATE_PCT) && e.targetSlug !== SLUG,
      ),
    ).toHaveLength(0);
  });

  it('the burst self-buffs are LIVE (zeroing each lowers neve\'s damage) and move nobody else', () => {
    expect(neveTotal(base.res)).toBeGreaterThan(neveTotal(critZero.res));
    expect(others(critZero.res)).toEqual(others(base.res));
    // Hit Rate lifts the core-hit rate (engine hrCoreMult, live by default); on a SG with a 200%
    // core multiplier that is strictly damage-positive. Equality here would mean the line is inert.
    expect(neveTotal(base.res)).toBeGreaterThan(neveTotal(hitRateZero.res));
    expect(others(hitRateZero.res)).toEqual(others(base.res));
  });

  it('the burst deals NO damage of its own', () => {
    // The burst prose is two self-buff lines only — a flatDamage/dot/storedHit in the burst slot
    // would be invented damage.
    const kinds = effectsOf(OV, 'burst').map((e) => e.kind);
    for (const k of ['flatDamage', 'dot', 'storedHit', 'weaponSwap']) {
      expect(kinds).not.toContain(k);
    }
  });

  // ⚑ ALWAYS-⚑ #7: the Hit-Rate → core-rate conversion magnitude is measured-only (engine-side
  // hrCoreMult), so only the DIRECTION of the 22.04% grant is assertable from prose.
  it.skip('Hit Rate → core-rate magnitude — ⚑ measured-only, not derivable from kit text', () => {});
});
