/**
 * modernia — BLIND per-unit kit spec test (S5).
 * Written from the kit prose ALONE: the driver's override, tests and reasoning were NOT consulted.
 *
 * KIT, read literally:
 *   S1a  on normal-attack HIT              -> 3.05% of final ATK as additional damage (per hit)
 *   S1b  every 200 normal-attack HITS      -> self Crit Damage +14.25%, x5 stacks, 10s
 *                                          -> self Max Ammo -5.04%,   x5 stacks, 10s  (a DEBUFF)
 *   S2a  on entering FULL BURST            -> ALL ALLIES Hit Rate +8.56% for 15s
 *   S2b  every 200 hits while Hit-Rate-up  -> self ATK +29.38% for 10s   (the status gate is a GAP)
 *   Ba   own burst                         -> all allies Full Burst Duration +5s
 *   Bb   own burst                         -> self unlimited ammunition, 15s
 *   Bc   own burst, Destroy Mode           -> 2.24% of final ATK as damage for 15s
 *   Bc'  Destroy Mode's line-of-sight / auto-aim / 'parts treated as one enemy' text is unmodelable on
 *        the partless scope-lock boss -> belongs in `unmodeled`, not in blocks.
 *
 * FIXTURE: controlComp('modernia', true) = liter B1 / crown B2 / modernia B3 / helm B3, so bursts actually
 * chain. A lone B3 makes ZERO Full Bursts, which would make every FB-keyed line below vacuous. helm stays in:
 * her buffs raise absolute totals but gate nothing here — every damage claim is a DELTA between two runs of
 * the SAME fixture, so her contribution cancels.
 *
 * SHAPE TOLERANCE: the packet documents two containers for a slot (a bare Block[] and a CharacterSkills with
 * .blocks). blocksOf() reads both, so a RED here means the MODEL is wrong, never the container.
 *
 * ENCODING TOLERANCE: S1a and Bc are magnitude-matched (3.05 / 2.24 in their slot), not shape-matched — a
 * per-hit rider is legitimately either an `extraHitDamagePct` buff or a hitCount:1 `flatDamage`. What the
 * assertions pin is the per-HIT scale of the contribution, which is what actually distinguishes the faithful
 * reading from the nearest-wrong DoT/one-shot encodings.
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

const SLUG = 'modernia';
type Slot = 'skill1' | 'skill2' | 'burst';
const SLOTS: Slot[] = ['skill1', 'skill2', 'burst'];

/* ------------------------------ override readers ------------------------------ */
function blocksOf(ov: any, slot: Slot): any[] {
  const s = ov?.[slot];
  if (Array.isArray(s)) return s;
  if (s && Array.isArray(s.blocks)) return s.blocks;
  return [];
}
function eachBlock(ov: any, fn: (b: any, slot: Slot) => void): void {
  for (const slot of SLOTS) for (const b of blocksOf(ov, slot)) fn(b, slot);
}
function eachEffect(ov: any, fn: (e: any, b: any, slot: Slot) => void): void {
  eachBlock(ov, (b, slot) => {
    for (const e of b.effects ?? []) fn(e, b, slot);
  });
}
function find(ov: any, pred: (e: any, b: any, slot: Slot) => boolean) {
  const hits: { eff: any; block: any; slot: Slot }[] = [];
  eachEffect(ov, (e, b, slot) => {
    if (pred(e, b, slot)) hits.push({ eff: e, block: b, slot });
  });
  return hits;
}
const mag = (n: unknown) => (typeof n === 'number' ? Math.abs(n) : NaN);
const isMag = (e: any, want: number, tol = 0.03) =>
  Math.abs(mag(e.value) - want) <= tol || Math.abs(mag(e.atkPct) - want) <= tol;
function zeroMagnitude(e: any): void {
  if (typeof e.value === 'number') e.value = 0;
  if (typeof e.atkPct === 'number') e.atkPct = 0;
}
function dropEffects(ov: any, kind: string): void {
  eachBlock(ov, (b) => {
    b.effects = (b.effects ?? []).filter((e: any) => e.kind !== kind);
  });
}

/* ---------------------------------- runner ------------------------------------ */
type Run = { res: any; events: any[]; total: number; all: Record<string, number> };
function run(mutate?: (ov: any) => void): Run {
  const events: any[] = [];
  const base: any = controlComp(SLUG, true);
  const opts: any = {
    ...base,
    cfg: { ...(base.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) },
  };
  if (mutate) {
    opts.overrides = { ...(base.overrides ?? {}), [SLUG]: withPatchedOverride(SLUG, mutate) };
  }
  const res = runComp(opts);
  return {
    res,
    events,
    total: unitOf(res, SLUG).totalDamage,
    all: totals(res) as Record<string, number>,
  };
}
const evsOf = (r: Run, kind: string) => r.events.filter((e) => e.kind === kind);
const buffVals = (r: Run, stat: string, want: number, tol = 0.06) =>
  r.events.filter((e) => e.kind === 'buffApply' && e.stat === stat && Math.abs(mag(e.value) - want) <= tol);
const inFbHits = (r: Run) => r.events.filter((e) => e.kind === 'damage' && e.inFullBurst).length;
const drop = (base: number, cf: number) => (base - cf) / base;

/* -------- the committed override, read (not written) via an empty patch clone --- */
const OV: any = withPatchedOverride(SLUG, () => {});
const RIDER = find(OV, (e, _b, slot) => slot === 'skill1' && isMag(e, 3.05));
const CRIT = find(OV, (e) => e.kind === 'buff' && e.stat === 'critDamagePct' && isMag(e, 14.25, 0.06));
const AMMO = find(OV, (e) => e.kind === 'buff' && (e.stat === 'maxAmmoPct' || e.stat === 'maxAmmoFlat'));
const HITRATE = find(OV, (e) => e.kind === 'buff' && e.stat === 'hitRatePct');
const ATK29 = find(OV, (e) => e.kind === 'buff' && isMag(e, 29.38, 0.06) && e.stat !== 'hitRatePct');
const FBEXT = find(OV, (e) => e.kind === 'fullBurstExtend');
const UNLIM = find(OV, (e) => e.kind === 'unlimitedAmmo');
const DESTROY = find(OV, (e, _b, slot) => slot === 'burst' && isMag(e, 2.24));

/* ------------------------- hoisted runs (12 x 180s sims) ---------------------- */
const BASE = run();
const NO_RIDER = run((ov) =>
  find(ov, (e, _b, s) => s === 'skill1' && isMag(e, 3.05)).forEach((h) => zeroMagnitude(h.eff)),
);
const NO_CRITDMG = run((ov) =>
  find(ov, (e) => e.kind === 'buff' && e.stat === 'critDamagePct' && isMag(e, 14.25, 0.06)).forEach((h) =>
    zeroMagnitude(h.eff),
  ),
);
const CRIT_1STACK = run((ov) =>
  find(ov, (e) => e.kind === 'buff' && e.stat === 'critDamagePct' && isMag(e, 14.25, 0.06)).forEach((h) => {
    h.eff.maxStacks = 1;
  }),
);
const CRIT_SHORT = run((ov) =>
  find(ov, (e) => e.kind === 'buff' && e.stat === 'critDamagePct' && isMag(e, 14.25, 0.06)).forEach((h) => {
    h.eff.durationSec = 1;
  }),
);
const AMMO_POS = run((ov) =>
  find(ov, (e) => e.kind === 'buff' && (e.stat === 'maxAmmoPct' || e.stat === 'maxAmmoFlat')).forEach((h) => {
    h.eff.value = Math.abs(h.eff.value);
  }),
);
const NO_HITRATE = run((ov) =>
  find(ov, (e) => e.kind === 'buff' && e.stat === 'hitRatePct').forEach((h) => zeroMagnitude(h.eff)),
);
const HITRATE_10S = run((ov) =>
  find(ov, (e) => e.kind === 'buff' && e.stat === 'hitRatePct').forEach((h) => {
    h.eff.durationSec = 10;
  }),
);
const NO_FBEXT = run((ov) => dropEffects(ov, 'fullBurstExtend'));
const NO_UNLIM = run((ov) => dropEffects(ov, 'unlimitedAmmo'));
const NO_DESTROY = run((ov) =>
  find(ov, (e, _b, s) => s === 'burst' && isMag(e, 2.24)).forEach((h) => zeroMagnitude(h.eff)),
);
const DESTROY_LONG = run((ov) =>
  find(ov, (e, _b, s) => s === 'burst' && isMag(e, 2.24)).forEach((h) => {
    if (typeof h.eff.durationSec === 'number') h.eff.durationSec = 60;
  }),
);

const TEAM = Object.keys(BASE.all).filter((s) => s !== SLUG);

describe('modernia — fixture non-vacuity', () => {
  it('the control comp actually bursts (a lone B3 would make every FB line vacuous)', () => {
    expect(evsOf(BASE, 'burstCast').length).toBeGreaterThanOrEqual(3);
    expect(evsOf(BASE, 'fullBurstStart').length).toBeGreaterThanOrEqual(3);
    expect(inFbHits(BASE)).toBeGreaterThan(0);
  });

  it('all three skill slots carry blocks (no silently-empty slot)', () => {
    for (const slot of SLOTS) expect(blocksOf(OV, slot).length, `${slot} has no blocks`).toBeGreaterThan(0);
  });

  it('no `ignored` effects anywhere (validator rule; skips belong in `note`/`unmodeled`)', () => {
    expect(find(OV, (e) => e.kind === 'ignored' || e.kind === 'unsupported')).toHaveLength(0);
  });
});

describe('S1a — normal-attack hit: 3.05% of final ATK additional damage', () => {
  it('is present in skill1 at the kit magnitude', () => {
    expect(RIDER.length, 'no 3.05%-magnitude effect in skill1').toBeGreaterThan(0);
  });

  // DISCRIMINATES: a PER-HIT rider is worth a large slice of her total (she fires ~40 hits/s as a
  // 2-hits-per-shot MG for the whole fight). The nearest-wrong encodings — dropped as cosmetic, or
  // bolted onto a rare trigger (one-shot on burst / every-200-hits) — all leave the delta near zero.
  it('per-hit scale: zeroing it costs >1.5% of her total damage', () => {
    expect(drop(BASE.total, NO_RIDER.total)).toBeGreaterThan(0.015);
  });

  // INERTNESS: 'Affects the target(s)' = enemy-facing damage from HER hits; it must not touch allies.
  it('is self-sourced: teammates are byte-identical when it is zeroed', () => {
    for (const s of TEAM) expect(NO_RIDER.all[s], `${s} moved`).toBe(BASE.all[s]);
  });
});

describe('S1b — every 200 normal-attack hits: Crit Damage +14.25%, 5 stacks, 10s (self)', () => {
  it('is keyed to a hitCount:200 trigger (not shotFired, not interval)', () => {
    expect(CRIT.length, 'no critDamagePct 14.25 buff').toBeGreaterThan(0);
    for (const h of CRIT) {
      expect(h.block.trigger?.kind).toBe('hitCount');
      expect(h.block.trigger?.count).toBe(200);
      expect(h.block.target?.kind).toBe('self');
      expect(h.eff.maxStacks).toBe(5);
      expect(h.eff.durationSec).toBe(10);
    }
  });

  // NON-VACUITY: at ~40 hits/s the 200-hit threshold clears every ~5s, so the fixture must show many
  // applications and must actually REACH the 5-stack cap. Without this, a maxStacks assertion is dead text.
  it('fires repeatedly and reaches the 5-stack cap in the fixture', () => {
    const a = buffVals(BASE, 'critDamagePct', 14.25);
    expect(a.length).toBeGreaterThanOrEqual(5);
    expect(Math.max(...a.map((e) => e.stacks ?? 1))).toBeGreaterThanOrEqual(2);
    expect(a.every((e) => e.maxStacks === 5)).toBe(true);
  });

  it('is self-only — never lands on an ally', () => {
    const t = new Set(buffVals(BASE, 'critDamagePct', 14.25).map((e) => e.targetSlug));
    expect([...t]).toEqual([SLUG]);
  });

  // DISCRIMINATES value + stacking: the nearest-wrong reads are (a) dropped, (b) 1 stack instead of 5.
  it('is live and genuinely stacks: zeroing and 1-stack both cost damage, 1-stack costs less than zeroing', () => {
    expect(BASE.total).toBeGreaterThan(NO_CRITDMG.total);
    expect(BASE.total).toBeGreaterThan(CRIT_1STACK.total);
    expect(CRIT_1STACK.total).toBeGreaterThan(NO_CRITDMG.total);
  });

  // DURATION LIVENESS only. 10s is longer than the ~5s refresh cadence, so 10s vs 20s is board-inert
  // here by construction — the exact value is pinned structurally above, not by damage.
  it('the 10s window is a real bounded window (shrinking it below the refresh cadence costs damage)', () => {
    expect(BASE.total).toBeGreaterThan(CRIT_SHORT.total);
  });

  it('teammates are byte-identical when the self crit-damage buff is zeroed', () => {
    for (const s of TEAM) expect(NO_CRITDMG.all[s], `${s} moved`).toBe(BASE.all[s]);
  });
});

describe('S1b — every 200 hits: Max Ammunition Capacity DOWN 5.04%, 5 stacks, 10s (self)', () => {
  // A weapon-state modifier IS damage: fewer rounds per belt = more reloads = fewer shots fired.
  it('is modeled, self-scoped, and encoded as a DEBUFF (negative value)', () => {
    expect(AMMO.length, 'no maxAmmo effect — the DOWN line was dropped as defensive').toBeGreaterThan(0);
    for (const h of AMMO) {
      expect(h.eff.value, 'Max Ammo DOWN must be negative').toBeLessThan(0);
      expect(h.block.target?.kind).toBe('self');
      expect(h.eff.maxStacks).toBe(5);
      expect(h.eff.durationSec).toBe(10);
      if (h.eff.stat === 'maxAmmoPct') expect(Math.abs(h.eff.value)).toBeCloseTo(5.04, 1);
    }
  });

  // DISCRIMINATES the SIGN, which is the whole failure mode here: flipping it to +5.04% must produce
  // strictly FEWER reloads. If the effect were inert (or dropped), the two runs would be identical.
  it('the DOWN direction bites: the faithful model reloads more often than a sign-flipped one', () => {
    const faithful = evsOf(BASE, 'reload').length;
    const flipped = evsOf(AMMO_POS, 'reload').length;
    expect(faithful).toBeGreaterThan(0);
    expect(faithful).toBeGreaterThan(flipped);
    expect(AMMO_POS.total).not.toBe(BASE.total);
  });
});

describe('S2a — entering Full Burst: ALL ALLIES Hit Rate +8.56% for 15s', () => {
  it('is keyed to fullBurstEnter and targets allies (not self, not burstCast)', () => {
    expect(HITRATE.length, 'no hitRatePct buff').toBeGreaterThan(0);
    for (const h of HITRATE) {
      expect(h.block.trigger?.kind).toBe('fullBurstEnter');
      expect(h.block.target?.kind).toBe('allies');
      expect(h.block.target?.excludeSelf ?? false).toBe(false);
      expect(mag(h.eff.value)).toBeCloseTo(8.56, 1);
      expect(h.eff.durationSec).toBe(15);
    }
  });

  // TARGET SET: 'all allies' = every unit in the comp, self included. Nearest-wrong = self-only (1 slug).
  it('lands on the WHOLE team including self', () => {
    const t = new Set(buffVals(BASE, 'hitRatePct', 8.56).map((e) => e.targetSlug));
    expect(t.has(SLUG)).toBe(true);
    expect(t.size).toBe(Object.keys(BASE.all).length);
  });

  // TRIGGER IDENTITY: re-fires per Full Burst rather than being a passive — multiple distinct expiry frames.
  it('re-applies each Full Burst (>=2 distinct expiry frames), not once as a passive', () => {
    const exp = new Set(buffVals(BASE, 'hitRatePct', 8.56).map((e) => e.expiresFrame));
    expect(exp.size).toBeGreaterThanOrEqual(2);
  });

  // DURATION SEMANTICS, read off expiresFrame without needing an event frame: 15s vs the nearest-wrong
  // 10s (an FB-window-length guess) must differ by exactly 5s = 300 frames on the first application.
  it('the window is 15s, not the 10s Full Burst length', () => {
    const a = buffVals(BASE, 'hitRatePct', 8.56)[0];
    const b = buffVals(HITRATE_10S, 'hitRatePct', 8.56)[0];
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a.expiresFrame - b.expiresFrame).toBeGreaterThanOrEqual(298);
    expect(a.expiresFrame - b.expiresFrame).toBeLessThanOrEqual(302);
  });

  // Hit Rate feeds the core-hit lift, so it is a TEAM damage buff: removing it must move teammates too.
  it('is a live team damage buff (zeroing it lowers her AND at least one teammate)', () => {
    expect(BASE.total).toBeGreaterThan(NO_HITRATE.total);
    expect(TEAM.some((s) => NO_HITRATE.all[s] < BASE.all[s])).toBe(true);
  });
});

describe('S2b — every 200 hits during Hit-Rate-up: self ATK +29.38% for 10s', () => {
  it('is present as an ATK buff (atkPct, not attackDamagePct), self, 10s, hitCount:200', () => {
    expect(ATK29.length, 'no 29.38 ATK buff').toBeGreaterThan(0);
    for (const h of ATK29) {
      expect(h.eff.stat, 'kit says ATK UP -> atkPct, not the Damage Up bucket').toBe('atkPct');
      expect(h.block.target?.kind).toBe('self');
      expect(h.eff.durationSec).toBe(10);
      expect(h.block.trigger?.kind).toBe('hitCount');
      expect(h.block.trigger?.count).toBe(200);
    }
  });

  it('lands only on modernia', () => {
    const t = new Set(buffVals(BASE, 'atkPct', 29.38).map((e) => e.targetSlug));
    expect([...t]).toEqual([SLUG]);
  });

  // GAP: 'during increasing Hit Rate status' is a REQUIRES-OWN-BUFF-ACTIVE gate. The schema has no such
  // primitive (fbGate/requiresTargetStatus/resourceGate all key off something else), so an ungated model
  // over-credits every pre-first-Full-Burst activation. Enable this once a buff-state gate exists.
  it.skip('GAP: the Hit-Rate-status gate — no ATK+29.38 application before the first Full Burst', () => {
    const firstFb = BASE.events.findIndex((e) => e.kind === 'fullBurstStart');
    const firstAtk = BASE.events.findIndex(
      (e) => e.kind === 'buffApply' && e.stat === 'atkPct' && Math.abs(mag(e.value) - 29.38) <= 0.06,
    );
    expect(firstAtk).toBeGreaterThan(firstFb);
  });
});

describe('burst — Full Burst Duration +5 sec (all allies)', () => {
  it('is modeled as fullBurstExtend of 5s on a burstCast trigger', () => {
    expect(FBEXT.length, 'no fullBurstExtend effect').toBeGreaterThan(0);
    for (const h of FBEXT) {
      expect(h.eff.seconds).toBe(5);
      expect(h.block.trigger?.kind).toBe('burstCast');
    }
  });

  // DISCRIMINATES via window LENGTH, not totals: a longer Full Burst means strictly more damage events
  // land with inFullBurst=true. Nearest-wrong (dropped, or 0s) collapses the delta to zero.
  it('genuinely lengthens the Full Burst window (more in-FB hits than without it)', () => {
    expect(inFbHits(BASE)).toBeGreaterThan(inFbHits(NO_FBEXT));
    expect(BASE.total).toBeGreaterThan(NO_FBEXT.total);
  });
});

describe('burst — unlimited ammunition for 15 sec (self)', () => {
  it('is modeled, self-scoped, burst-cast keyed, and time-bounded at 15s', () => {
    expect(UNLIM.length, 'no unlimitedAmmo effect').toBeGreaterThan(0);
    for (const h of UNLIM) {
      expect(h.eff.durationSec).toBe(15);
      expect(h.block.target?.kind).toBe('self');
      expect(h.block.trigger?.kind).toBe('burstCast');
    }
  });

  // DISCRIMINATES: unlimited ammo suppresses reloads only inside its window. Nearest-wrongs are
  // (a) dropped -> reload counts identical, (b) whole-fight -> she never reloads at all.
  it('suppresses reloads inside the window but not for the whole fight', () => {
    const withUl = evsOf(BASE, 'reload').length;
    const without = evsOf(NO_UNLIM, 'reload').length;
    expect(withUl).toBeLessThan(without);
    expect(withUl).toBeGreaterThan(0);
  });
});

describe('burst — Destroy Mode: 2.24% of final ATK as damage for 15 sec', () => {
  it('is present in the burst slot at the kit magnitude, on a burstCast trigger, self-scoped', () => {
    expect(DESTROY.length, 'no 2.24%-magnitude effect in the burst slot').toBeGreaterThan(0);
    for (const h of DESTROY) {
      expect(h.block.trigger?.kind).toBe('burstCast');
      expect(h.block.target?.kind).toBe('self');
    }
  });

  // READING (flagged): 'deals X% of final ATK as damage for 15 sec' on an auto-aiming firing mode is a
  // PER-HIT rider on every Destroy-Mode bullet, not a 1/sec DoT. This assertion is the discriminator:
  // per-hit at ~40 hits/s for 15s of each ~40s cycle is worth >1% of her total; a 15-tick DoT is worth
  // <0.1% and would fail here. A RED on this test is the encoding divergence, not a magnitude quibble.
  it('is a PER-HIT rider, not a per-second DoT: zeroing it costs >1% of her total', () => {
    expect(drop(BASE.total, NO_DESTROY.total)).toBeGreaterThan(0.01);
  });

  // DURATION: the window must be bounded at 15s, not the whole burst cycle.
  it('the 15s window is bounded (stretching it to 60s adds damage)', () => {
    expect(DESTROY_LONG.total).toBeGreaterThan(BASE.total);
  });

  it('does not leak onto teammates', () => {
    for (const s of TEAM) expect(NO_DESTROY.all[s], `${s} moved`).toBe(BASE.all[s]);
  });

  // The line-of-sight / auto-aim / 'parts treated as a single enemy' text has no engine primitive and
  // no observable on a partless boss. It must be recorded as unmodeled text, not silently dropped.
  it.skip('GAP: line-of-sight extension / auto-aim / parts-as-one-enemy — unobservable on the partless boss', () => {
    expect(OV.unmodeled?.burst?.length ?? 0).toBeGreaterThan(0);
  });
});
