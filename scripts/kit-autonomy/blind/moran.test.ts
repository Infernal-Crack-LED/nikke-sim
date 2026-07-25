/**
 * moran (AR / Electric / Defender / Burst I) — BLIND post-op kit-spec test (S5).
 * Written from the kit prose alone; the driver's test/override/reasoning were not consulted.
 *
 * KIT (cd 40s, ammo 60, reloadFrames 111, normalAttackMultiplier 14.71, coreAttackMultiplier 200):
 *   S1a passive, self   : DEF up 3.51% per 1% HP lost           -> unreachable + defPct inert in v1
 *   S1b 5 normals WHILE WEAPON CHANGED, enemy : 47.18% of final ATK additional damage
 *   S1c 'when Raptures appear', self : Fervor — Burst CD down 20 sec continuously
 *   S2a firing the final bullet, enemy : taunt 4 sec            -> no taunt/aggro primitive
 *   S2b HP below 20%, self : Perseverance Max HP tiers          -> trigger unreachable (immortal team)
 *   S2c entering Full Burst while in Fervor, all allies : Burst CD down 7.48 sec
 *   Bu  self   : weapon swap 14.7% per shot / 10 sec, unlimited ammo 10 sec,
 *                36.14% of attack damage recovered as HP 10 sec, Attract taunt 10 sec
 *   Bu  allies : Damage Taken down 35.14% 10 sec (DEFENSIVE, not a boss debuff),
 *                DEF up 14.85% of caster DEF 10 sec,
 *                ATK up 42.57% of caster ATK 10 sec  <- the only damage-bearing team line
 *
 * FIXTURE: controlComp('moran', true) = liter(B1) / crown(B2) / moran / helm(B3). 180s, deterministic.
 *   moran is Burst I, so the fixture carries a full I->II->III chain and helm supplies the B3.
 *   FIXTURE RISK (flagged): liter is ALSO Burst I. If the engine lets only one B1 cast per rotation
 *   moran may never burst, which would make every burst-slot claim vacuous — the non-vacuity test
 *   below is ordered first so that failure mode is diagnosed loudly instead of hiding.
 *
 * WHY THESE DISCRIMINATE: every behavioural claim is a counterfactual PAIR (faithful override vs the
 * nearest-wrong model built with withPatchedOverride), so a green run cannot come from an inert model.
 *
 * WHOLE-PICTURE NOTE: the swap deals 14.7% per shot while her BASE AR normal multiplier is 14.71 — the
 * weapon swap is therefore very nearly damage-NEUTRAL on its own. Totals cannot discriminate 'swap
 * modeled' from 'swap dropped'; the swap's real payload is the unlimited ammo plus opening the swapGate
 * for the 47.18% rider, so the rider is used as the swap-liveness probe instead.
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

const SLUG = 'moran';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;
type AnyEv = SimEvent & Record<string, any>;

const near = (a: unknown, b: number, tol = 0.02) =>
  typeof a === 'number' && Math.abs(a - b) <= tol;

function forEachEffect(ov: any, cb: (eff: any, block: any, slot: string) => void) {
  for (const slot of SLOTS) for (const b of ov[slot] ?? []) for (const e of b.effects ?? []) cb(e, b, slot);
}

function dropEffects(ov: any, pred: (eff: any, block: any, slot: string) => boolean) {
  for (const slot of SLOTS) {
    const blocks = ov[slot] ?? [];
    for (const b of blocks) b.effects = (b.effects ?? []).filter((e: any) => !pred(e, b, slot));
    ov[slot] = blocks.filter((b: any) => (b.effects ?? []).length > 0);
  }
}

function run(patch?: (ov: any) => void) {
  const events: AnyEv[] = [];
  const comp = controlComp(SLUG, true) as any;
  const opts: any = {
    ...comp,
    cfg: { ...(comp.cfg ?? {}), onEvent: (ev: AnyEv) => events.push(ev) },
  };
  if (patch) {
    opts.overrides = { ...(comp.overrides ?? {}), [SLUG]: withPatchedOverride(SLUG, patch) };
  }
  const res = runComp(opts);
  return { res, events, tot: totals(res) as Record<string, number> };
}

const team = (t: Record<string, number>) => Object.values(t).reduce((a, b) => a + b, 0);
const kindCount = (e: AnyEv[], kind: string) => e.filter((x) => x.kind === kind).length;

// ---- the committed override, read-only (no-op mutator returns the clone) ----
const OV: any = withPatchedOverride(SLUG, () => {});
function findAll(pred: (eff: any, block: any, slot: string) => boolean) {
  const out: { slot: string; block: any; eff: any }[] = [];
  for (const slot of SLOTS) {
    for (const b of OV[slot] ?? []) for (const e of b.effects ?? []) if (pred(e, b, slot)) out.push({ slot, block: b, eff: e });
  }
  return out;
}
const docText = [OV.note ?? '', ...SLOTS.flatMap((s) => OV.unmodeled?.[s] ?? [])]
  .join(' | ')
  .toLowerCase();
const documented = (...kws: string[]) => kws.some((k) => docText.includes(k));

const ATK_BUFF = findAll((e, _b, slot) => slot === 'burst' && e.kind === 'buff' && near(e.value, 42.57));
const RIDER = findAll((e, _b, slot) => slot === 'skill1' && e.kind === 'flatDamage' && near(e.atkPct, 47.18));
const FERVOR = findAll((e, _b, slot) => slot === 'skill1' && e.kind === 'burstCdr');
const FB_CDR = findAll((e, _b, slot) => slot === 'skill2' && e.kind === 'burstCdr');
const SWAP = findAll((e, _b, slot) => slot === 'burst' && e.kind === 'weaponSwap');
const UNLIMITED = findAll((e, _b, slot) => slot === 'burst' && e.kind === 'unlimitedAmmo');
const HEAL = findAll((e, _b, slot) => slot === 'burst' && e.kind === 'heal');

const isRiderBlock = (b: any) =>
  (b.effects ?? []).some((e: any) => e.kind === 'flatDamage' && near(e.atkPct, 47.18));

// ---- hoisted runs (11 x 180s) ----
const base = run();
const noBurstAtk = run((ov) =>
  dropEffects(ov, (e, _b, slot) => slot === 'burst' && e.kind === 'buff' && near(e.value, 42.57)),
);
const atkPctModel = run((ov) =>
  forEachEffect(ov, (e, _b, slot) => {
    if (slot === 'burst' && e.kind === 'buff' && near(e.value, 42.57)) e.stat = 'atkPct';
  }),
);
const dur20 = run((ov) =>
  forEachEffect(ov, (e, _b, slot) => {
    if (slot === 'burst' && e.kind === 'buff' && near(e.value, 42.57)) e.durationSec = 20;
  }),
);
const noUnlimited = run((ov) => dropEffects(ov, (e) => e.kind === 'unlimitedAmmo'));
const noRider = run((ov) =>
  dropEffects(ov, (e, _b, slot) => slot === 'skill1' && e.kind === 'flatDamage' && near(e.atkPct, 47.18)),
);
const riderUngated = run((ov) => {
  for (const b of ov.skill1 ?? []) if (isRiderBlock(b)) delete b.swapGate;
});
const riderEvery1 = run((ov) => {
  for (const b of ov.skill1 ?? []) {
    if (!isRiderBlock(b)) continue;
    if (b.trigger?.kind === 'hitCount') b.trigger.count = 1;
    if (b.everyN) b.everyN = 1;
  }
});
const noFbCdr = run((ov) =>
  dropEffects(ov, (e, _b, slot) => slot === 'skill2' && e.kind === 'burstCdr'),
);
const noFervor = run((ov) =>
  dropEffects(ov, (e, _b, slot) => slot === 'skill1' && e.kind === 'burstCdr'),
);
const stripDefensive = run((ov) =>
  dropEffects(
    ov,
    (e) =>
      e.kind === 'buff' &&
      ['defPct', 'maxHpPct', 'maxHpFlat', 'casterMaxHpPct', 'targetMaxHpPct', 'damageTakenPct'].includes(e.stat),
  ),
);

// moran's burst ATK grant, identified by DIFFING base against the run with it removed —
// this needs no knowledge of her unit index and survives other units' casterAtkPct buffs.
const casterAtkEv = (e: AnyEv[]) => e.filter((x) => x.kind === 'buffApply' && x.stat === 'casterAtkPct');
const diffVals = new Set(casterAtkEv(base.events).map((e) => e.value));
for (const v of casterAtkEv(noBurstAtk.events).map((e) => e.value)) diffVals.delete(v);
const MORAN_ATK_VALUES = [...diffVals];
const V = MORAN_ATK_VALUES[0];
const atkApplies = (e: AnyEv[]) =>
  e.filter((x) => x.kind === 'buffApply' && x.stat === 'casterAtkPct' && x.value === V);
const ATK_TARGETS = new Set(atkApplies(base.events).map((e) => e.targetSlug));
const castsIn = (e: AnyEv[]) => atkApplies(e).length / Math.max(1, ATK_TARGETS.size);

describe('moran — harness wiring + non-vacuity', () => {
  it('the event stream is actually collected', () => {
    expect(base.events.length).toBeGreaterThan(0);
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('moran really casts her burst in this fixture (else every burst claim is vacuous)', () => {
    // Exactly one caster-scaled ATK value appears in base and vanishes when her burst buff is
    // removed. Zero values here means she never bursts (B1 contention with liter) — a FIXTURE
    // failure, not a spec failure.
    expect(MORAN_ATK_VALUES.length).toBe(1);
    expect(castsIn(base.events)).toBeGreaterThanOrEqual(1);
  });
});

describe('burst / allies — ATK up 42.57% of the skill user ATK for 10 sec', () => {
  it('structural: caster-scaled, all allies incl. self, 10s, on her own burst cast', () => {
    expect(ATK_BUFF.length).toBe(1);
    const { eff, block } = ATK_BUFF[0];
    // nearest-wrong #1: atkPct (scales each ally by THEIR own ATK) — a different mechanic.
    expect(eff.stat).toBe('casterAtkPct');
    expect(eff.durationSec).toBe(10);
    expect(block.target.kind).toBe('allies');
    // nearest-wrong #2: excludeSelf — the kit says 'all allies', she buffs herself too.
    expect(block.target.excludeSelf ?? false).toBe(false);
    // nearest-wrong #3: fullBurstEnter — would fire on ANY team Full Burst, over-crediting the
    // rotations she does not cast. Her burst effects are keyed to her OWN cast.
    expect(block.trigger.kind).toBe('burstCast');
  });

  it('emits a FLAT-resolved caster ATK number to all four allies, not the raw 42.57%', () => {
    expect(V).toBeDefined();
    expect(V).not.toBe(42.57); // atkPct would re-emit the raw percentage
    expect(V as number).toBeGreaterThan(100);
    expect(ATK_TARGETS.size).toBe(4);
    expect(ATK_TARGETS.has(SLUG)).toBe(true);
  });

  it('the target-scaled model is genuinely distinguishable (non-vacuity for the stat choice)', () => {
    const raw = atkPctModel.events.filter(
      (e) => e.kind === 'buffApply' && e.stat === 'atkPct' && near(e.value, 42.57),
    );
    expect(raw.length).toBeGreaterThan(0);
    expect(team(atkPctModel.tot)).not.toBe(team(base.tot));
  });

  it('is not inert: removing it drops team damage', () => {
    expect(team(base.tot)).toBeGreaterThan(team(noBurstAtk.tot));
  });

  it('the 10 sec window binds (a 20 sec model is strictly stronger)', () => {
    expect(team(dur20.tot)).toBeGreaterThan(team(base.tot));
  });
});

describe('burst / self — weapon swap, unlimited ammunition, lifesteal', () => {
  it('structural: swap 14.7% per shot for 10 sec, self', () => {
    expect(SWAP.length).toBe(1);
    expect(near(SWAP[0].eff.damagePct, 14.7)).toBe(true);
    expect(SWAP[0].eff.durationSec).toBe(10);
    expect(SWAP[0].block.target.kind).toBe('self');
  });

  it('structural: unlimited ammunition for 10 sec', () => {
    expect(UNLIMITED.length).toBe(1);
    expect(UNLIMITED[0].eff.durationSec).toBe(10);
  });

  it('unlimited ammo is not inert — it removes reloads and/or adds shots', () => {
    // Her magazine is 60 and the window is 10s, so the swap window spans about one full
    // magazine: dropping unlimited ammo must cost her at least a reload or some damage.
    expect(
      kindCount(noUnlimited.events, 'reload') > kindCount(base.events, 'reload') ||
        base.tot[SLUG] > noUnlimited.tot[SLUG],
    ).toBe(true);
    expect(base.tot[SLUG]).toBeGreaterThanOrEqual(noUnlimited.tot[SLUG]);
  });

  it('the 36.14% lifesteal line is represented, not silently dropped', () => {
    // Damage-inert here (no HP pool), but it is a real on-recovery tandem channel, so it must be
    // either a heal effect or explicitly documented.
    expect(HEAL.length > 0 || documented('recover', 'lifesteal', 'heal')).toBe(true);
  });
});

describe('skill1 — 47.18% of final ATK every 5 normals WHILE THE WEAPON IS CHANGED', () => {
  it('structural: enemy-targeted, 5-hit trigger, swap-gated, no core', () => {
    expect(RIDER.length).toBe(1);
    const { eff, block } = RIDER[0];
    expect(block.target.kind).toBe('enemy');
    const trig = block.trigger ?? {};
    expect(
      (trig.kind === 'hitCount' && trig.count === 5) ||
        (trig.kind === 'shotFired' && block.everyN === 5),
    ).toBe(true);
    // nearest-wrong: an ungated rider that fires all fight instead of only inside her 10s swap.
    expect(block.swapGate).toBe('swapped');
    // the text says 'additional damage', never 'core strike' — no core bucket.
    expect(eff.core ?? false).toBe(false);
  });

  it('fires, and only while the swap is live', () => {
    expect(base.tot[SLUG]).toBeGreaterThan(noRider.tot[SLUG]); // non-inert AND the swap goes live
    expect(riderUngated.tot[SLUG]).toBeGreaterThan(base.tot[SLUG]); // the gate is closed most of the fight
  });

  it('the 5-hit threshold binds (a 1-hit model is strictly stronger)', () => {
    expect(riderEvery1.tot[SLUG]).toBeGreaterThan(base.tot[SLUG]);
  });
});

describe('skill1 — Fervor: Cooldown of Burst Skill down 20 sec, self, continuous', () => {
  it('structural: self-targeted 20 sec CDR from battle start', () => {
    expect(FERVOR.length).toBe(1);
    expect(near(FERVOR[0].eff.seconds, 20)).toBe(true);
    expect(FERVOR[0].block.target.kind).toBe('self');
    // 'Activates when Raptures appear' = battle start, so a passive trigger, not an event trigger.
    expect(FERVOR[0].block.trigger.kind).toBe('passive');
  });

  it('is not inert: her 40 sec base cooldown is genuinely shortened', () => {
    expect(castsIn(base.events)).toBeGreaterThanOrEqual(castsIn(noFervor.events));
    expect(
      castsIn(base.events) > castsIn(noFervor.events) || team(base.tot) > team(noFervor.tot),
    ).toBe(true);
  });
});

describe('skill2 — entering Full Burst while in Fervor: all allies Burst CD down 7.48 sec', () => {
  it('structural: full-burst-enter, all allies incl. self', () => {
    expect(FB_CDR.length).toBe(1);
    expect(near(FB_CDR[0].eff.seconds, 7.48)).toBe(true);
    // nearest-wrong: burstCast (would fire only on rotations SHE bursts); the kit says
    // 'entering Full Burst', which is any team Full Burst.
    expect(FB_CDR[0].block.trigger.kind).toBe('fullBurstEnter');
    expect(FB_CDR[0].block.target.kind).toBe('allies');
    expect(FB_CDR[0].block.target.excludeSelf ?? false).toBe(false);
  });

  it('accelerates the team rotation', () => {
    expect(kindCount(base.events, 'fullBurstStart')).toBeGreaterThanOrEqual(
      kindCount(noFbCdr.events, 'fullBurstStart'),
    );
    expect(
      kindCount(base.events, 'fullBurstStart') > kindCount(noFbCdr.events, 'fullBurstStart') ||
        team(base.tot) > team(noFbCdr.tot),
    ).toBe(true);
  });
});

describe('inertness + no silent drops', () => {
  it('the defensive half of the kit moves ZERO damage for anyone', () => {
    // Stripping every DEF / Max-HP / Damage-Taken buff from her override must leave all four
    // units byte-identical. RED if 'Damage Taken down 35.14%' (an ALLY defensive buff) was
    // mis-encoded as a positive damageTakenPct boss debuff, which would inflate the whole team.
    expect(stripDefensive.tot).toEqual(base.tot);
  });

  it('every unmodeled kit line is documented in note/unmodeled', () => {
    expect(documented('taunt', 'attract')).toBe(true);
    expect(documented('perseverance', 'max hp')).toBe(true);
    expect(documented('damage taken')).toBe(true);
    expect(documented('def')).toBe(true);
  });
});

describe('GAPs — kit lines with no primitive / no reachable trigger', () => {
  it.skip('S1a DEF up 3.51% per 1% HP lost: no HP-loss tracking (immortal team) and defPct is inert in v1', () => {});
  it.skip('S2a taunt 4 sec on the final bullet: no taunt/aggro primitive; the boss deals no damage', () => {});
  it.skip('S2b Perseverance Max HP tiers: the HP-below-20% trigger is unreachable, and a self Max HP grant is offensively inert without an atkOfMaxHpPct consumer', () => {});
  it.skip('burst Attract taunt 10 sec / Damage Taken down 35.14%: defensive-only, no primitive', () => {});
  it.skip('Fervor as a CONTINUOUS cooldown reduction: burstCdr is a one-shot subtraction, so a permanent 40->20 sec cooldown FLOOR has no primitive — flagged, magnitude 20 sec is kit-literal', () => {});
  it.skip('swap-window shot economy (pulls/sec and cadence of the changed weapon) is kit-silent — flagged, not asserted', () => {});
});
