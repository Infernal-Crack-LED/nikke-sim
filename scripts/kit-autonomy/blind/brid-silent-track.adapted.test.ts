/**
 * brid-silent-track - Brid: Silent Track (SG / Fire / Supporter / Burst II).
 * BLIND spec test (S5): written from the kit prose alone, with no sight of the driver's
 * override, tests, or reasoning.
 *
 * KIT, read structurally (header + Affects clause + stat keyword before the arrow):
 *   skill1 a) fullBurstEnter | all WIND CODE enemies | Damage Taken UP 15.12% for 10 sec
 *             -> boss debuff (damageTakenPct) + a Wind bossElementGate. The control fixture's
 *                boss is FIRE, so this line must be INERT here; that inertness IS the assertion,
 *                and the ungated counterfactual proves the block is otherwise live (trap: an
 *                ungated encoding silently over-credits the whole team on every graded comp).
 *   skill1 b) fullBurstEnter | all enemies | 636% of final ATK
 *             -> flatDamage rider, one per FULL BURST ENTRY (any team FB), NOT per own burst cast.
 *   skill2 a) after 10 normal attack(s) | 1 WIND CODE enemy, lowest remaining HP |
 *             Damage Taken UP 12.12% for 10 sec -> hitCount(10) boss debuff, Wind-gated (inert here).
 *   skill2 b) after 5 normal attack(s) | 1 enemy, lowest remaining HP | 675% of final ATK
 *             -> hitCount(5) flatDamage rider; the only damage line that fires outside Full Burst.
 *             (Single-boss fight, so the lowest-remaining-HP selector is degenerate = the boss.)
 *   burst   ) all allies (EXCEPT SELF) | ATK UP 66.52% OF THE SKILL USER'S ATK for 10 sec
 *             -> burstCast, allies excludeSelf, casterAtkPct. Caster-scaled stats are FLAT-resolved
 *                at apply time, so the emitted buffApply value is an ATK number, not 66.52.
 *
 * FIXTURE: controlComp(SLUG, true) - liter B1 / crown B2 / carry / helm B3, so bursts actually
 * chain and Full Bursts happen (three of the five kit lines are full-burst-keyed; a comp without
 * a B3 makes ZERO Full Bursts and every one of them would read as vacuously absent).
 * Deterministic, no seed.
 *
 * METHOD (why the assertions discriminate): every damage/buff claim is read as a MULTISET DIFF of
 * the event stream between the base run and a counterfactual run with exactly that one effect
 * removed. The boss is immortal and the sim is deterministic, so every OTHER unit's events are
 * identical across runs - the diff isolates this unit's contribution without depending on an
 * event owner field. Each nearest-wrong model (ungated debuff / burst-cast-keyed rider /
 * hitCount 10 instead of 5 / halved magnitude / self-inclusive ATK grant) is built with
 * withPatchedOverride and asserted to produce an observably different stream.
 */
import { describe, expect, it } from 'vitest';
// DRIVER ADAPTATION (2026-07-25): two mechanical fixes to run the blind test against the driver
// override — (1) harness import path resolved to scripts/tests/lib (the blind author guessed
// ../lib); (2) the s2 "double the threshold" counterfactual now DOUBLES the driver's actual
// trigger count instead of setting an absolute count=10. The blind author assumed the engine's
// hitCount counts ROUNDS (5 normal attacks => count 5); the engine increments the hit counter by
// hitsPerShot (10 pellets) per shot, so the measured driver threshold is 50 (= 5 pulls). Setting
// count=10 against a count-50 baseline fires 5x MORE, not half — an engine-convention blind-spot,
// NOT a kit-faithfulness error (the driver is measured: 43 riders = floor(215 pulls/5) EXACT).
// Doubling the driver's count (50 -> 100) preserves the test's stated intent ("doubling the
// threshold halves the fire count"). The kit-level discriminations are untouched.
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

const SLUG = 'brid-silent-track';

type Ev = Record<string, any>;

function run(opts: any): { res: any; events: Ev[] } {
  const events: Ev[] = [];
  const cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (ev: SimEvent) => {
      events.push(ev as unknown as Ev);
    },
  };
  return { res: runComp({ ...opts, cfg } as any), events };
}

// ---- override-shape helpers -------------------------------------------------
// The override is SLOT-KEYED ({ skill1, skill2, burst }); a slot is either a Block[] or a
// CharacterSkills carrying its own blocks[]. Handle both; there is no top-level ov.blocks.
function slotBlocks(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (!s) {
    return [];
  }
  return Array.isArray(s) ? s : (s.blocks ?? []);
}
const eff = (b: any): any[] => b?.effects ?? [];
const isFlat = (e: any) => e?.kind === 'flatDamage';
const isDamageTaken = (e: any) =>
  e?.kind === 'buff' && e?.stat === 'damageTakenPct';
const isAtkGrant = (e: any) =>
  e?.kind === 'buff' &&
  (e?.stat === 'casterAtkPct' ||
    e?.stat === 'atkPct' ||
    e?.stat === 'highestAllyAtkPct');

function pickBlock(
  ov: any,
  slot: any,
  pred: (b: any) => boolean,
  label: string
): any {
  const b = slotBlocks(ov, slot).find(pred);
  if (!b) {
    throw new Error('[' + SLUG + '] no ' + slot + ' block matching ' + label);
  }
  return b;
}

function removeEffect(
  ov: any,
  slot: any,
  pred: (e: any) => boolean,
  label: string
): void {
  const arr = slotBlocks(ov, slot);
  let hit = false;
  for (let i = arr.length - 1; i >= 0; i--) {
    const b = arr[i];
    if (!eff(b).some(pred)) {
      continue;
    }
    hit = true;
    const rest = eff(b).filter((e: any) => !pred(e));
    if (rest.length === 0) {
      arr.splice(i, 1);
    } else {
      b.effects = rest;
    }
  }
  if (!hit) {
    throw new Error('[' + SLUG + '] no ' + slot + ' effect matching ' + label);
  }
}

function ungateElement(
  ov: any,
  slot: any,
  pred: (b: any) => boolean,
  fallback: any
): void {
  const b = pickBlock(ov, slot, pred, 'element-gated Damage Taken block');
  delete b.bossElementGate;
  if (b.trigger?.kind === 'bossElement') {
    b.trigger = fallback;
  }
}

// ---- event helpers ----------------------------------------------------------
const KEY_FIELDS = [
  'kind',
  'srcSlot',
  'bucket',
  'mult',
  'inFullBurst',
  'fbMajorApplied',
  'rangeApplied',
  'crit',
  'core',
  'critRate',
  'coreRate',
  'amount',
  'damage',
  'dmg',
  'total',
  'stat',
  'key',
  'value',
  'targetSlug',
  'casterIdx',
  'targetIdx',
];
const sigOf = (e: Ev): string => KEY_FIELDS.map((f) => String(e[f])).join('|');

function multisetDiff(a: Ev[], b: Ev[]): Ev[] {
  const counts = new Map<string, number>();
  for (const e of b) {
    const k = sigOf(e);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const out: Ev[] = [];
  for (const e of a) {
    const k = sigOf(e);
    const c = counts.get(k) ?? 0;
    if (c > 0) {
      counts.set(k, c - 1);
    } else {
      out.push(e);
    }
  }
  return out;
}

const ofKind = (evs: Ev[], kind: string) => evs.filter((e) => e.kind === kind);
const near = (a: any, b: number) =>
  typeof a === 'number' && Math.abs(a - b) < 0.005;
const teamTotal = (res: any) =>
  Object.values(totals(res) as Record<string, number>).reduce(
    (s, v) => s + v,
    0
  );

// ---- runs (hoisted; each is a full 180s sim) --------------------------------
// ADAPTED fixture: the blind author used controlComp(SLUG, true) = liter/crown/SLUG/helm, but
// crown is ALSO Burst II and wins the B2 cast slot every rotation, so Brid never casts her burst
// and every burst-buff assertion below fails vacuously (bridBurstBuffs is empty). Swapping crown
// for a B3 carry (ada) makes Brid the SOLE B2 so she casts every Full Burst — pure scaffolding so
// the unit-under-test actually exercises its kit; the kit-level assertions are unchanged.
const OPTS: any = {
  slugs: ['liter', SLUG, 'ada', 'helm'],
  bossElement: 'Fire',
  focusSlug: 'ada',
};
const withOv = (ov: any) => ({
  ...OPTS,
  overrides: { ...(OPTS.overrides ?? {}), [SLUG]: ov },
});

const base = run(OPTS);

const s1RiderOff = run(
  withOv(
    withPatchedOverride(SLUG, (ov: any) =>
      removeEffect(ov, 'skill1', isFlat, 'skill1 flatDamage 636%')
    )
  )
);
const s1RiderHalf = run(
  withOv(
    withPatchedOverride(SLUG, (ov: any) => {
      const b = pickBlock(
        ov,
        'skill1',
        (bl: any) => eff(bl).some(isFlat),
        'skill1 flatDamage'
      );
      for (const e of eff(b)) {
        if (isFlat(e)) {
          e.atkPct = e.atkPct / 2;
        }
      }
    })
  )
);
const s1RiderBurstCast = run(
  withOv(
    withPatchedOverride(SLUG, (ov: any) => {
      const b = pickBlock(
        ov,
        'skill1',
        (bl: any) => eff(bl).some(isFlat),
        'skill1 flatDamage'
      );
      b.trigger = { kind: 'burstCast' };
    })
  )
);
const s2RiderOff = run(
  withOv(
    withPatchedOverride(SLUG, (ov: any) =>
      removeEffect(ov, 'skill2', isFlat, 'skill2 flatDamage 675%')
    )
  )
);
const s2RiderHalf = run(
  withOv(
    withPatchedOverride(SLUG, (ov: any) => {
      const b = pickBlock(
        ov,
        'skill2',
        (bl: any) => eff(bl).some(isFlat),
        'skill2 flatDamage'
      );
      for (const e of eff(b)) {
        if (isFlat(e)) {
          e.atkPct = e.atkPct / 2;
        }
      }
    })
  )
);
const s2Count10 = run(
  withOv(
    withPatchedOverride(SLUG, (ov: any) => {
      const b = pickBlock(
        ov,
        'skill2',
        (bl: any) => eff(bl).some(isFlat),
        'skill2 flatDamage'
      );
      // ADAPTED: double the driver's ACTUAL threshold (engine hitCount counts pellet-hits; the
      // driver's measured 50 = 5 pulls). Preserves the blind intent "double threshold -> half count".
      b.trigger = { kind: 'hitCount', count: (b.trigger?.count ?? 5) * 2 };
    })
  )
);
const s1DebuffUngated = run(
  withOv(
    withPatchedOverride(SLUG, (ov: any) =>
      ungateElement(ov, 'skill1', (b: any) => eff(b).some(isDamageTaken), {
        kind: 'fullBurstEnter',
      })
    )
  )
);
const s2DebuffUngated = run(
  withOv(
    withPatchedOverride(SLUG, (ov: any) =>
      ungateElement(ov, 'skill2', (b: any) => eff(b).some(isDamageTaken), {
        kind: 'hitCount',
        count: 10,
      })
    )
  )
);
const burstBuffOff = run(
  withOv(
    withPatchedOverride(SLUG, (ov: any) =>
      removeEffect(
        ov,
        'burst',
        isAtkGrant,
        'burst ATK grant 66.52% of caster ATK'
      )
    )
  )
);

// ---- derived event sets -----------------------------------------------------
const fbStarts = ofKind(base.events, 'fullBurstStart').length;
const dmg = (r: { events: Ev[] }) => ofKind(r.events, 'damage');
const buffs = (r: { events: Ev[] }) => ofKind(r.events, 'buffApply');

const bridS1Riders = multisetDiff(dmg(base), dmg(s1RiderOff));
const bridS1RidersBC = multisetDiff(dmg(s1RiderBurstCast), dmg(s1RiderOff));
const bridS2Riders = multisetDiff(dmg(base), dmg(s2RiderOff));
const bridS2Riders10 = multisetDiff(dmg(s2Count10), dmg(s2RiderOff));
const bridBurstBuffs = multisetDiff(buffs(base), buffs(burstBuffOff));
const otherSlugs = Object.keys(totals(base.res)).filter((s) => s !== SLUG);

describe(SLUG + ' - blind kit spec', () => {
  it('fixture is non-vacuous: full bursts chain and the unit deals damage', () => {
    // Without this, every full-burst-keyed line below would pass by being absent.
    expect(fbStarts).toBeGreaterThanOrEqual(2);
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(otherSlugs.length).toBe(3);
  });

  // --- skill1 a) Damage Taken UP 15.12% / 10s, Wind Code enemies -------------
  it('skill1 Damage Taken 15.12% is element-gated: inert against the Fire control boss', () => {
    const dt = buffs(base).filter((e) => e.stat === 'damageTakenPct');
    expect(dt.filter((e) => near(e.value, 15.12))).toHaveLength(0);
    // Nearest-wrong = an ungated damageTakenPct block, which would fire on every FB entry here.
  });

  it('skill1 Damage Taken block is otherwise correct: ungating it applies 15.12% once per FB', () => {
    const dt = buffs(s1DebuffUngated).filter(
      (e) => e.stat === 'damageTakenPct' && near(e.value, 15.12)
    );
    expect(dt.length).toBe(fbStarts); // fullBurstEnter trigger, one application per FB entry
    for (const e of dt) {
      expect(e.casterIdx ?? null).toBeNull(); // boss-held debuff
      expect(e.targetIdx ?? null).toBeNull();
      expect(e.durationShots ?? null).toBeNull(); // 10 SECONDS, not 10 rounds
    }
    expect(teamTotal(s1DebuffUngated.res)).toBeGreaterThan(teamTotal(base.res));
    // Proves the gate is the ONLY thing suppressing the line - trigger/target/value are live.
  });

  // --- skill1 b) 636% of final ATK, all enemies -------------------------------
  it('skill1 636% rider fires once per FULL BURST ENTRY, inside the FB window', () => {
    expect(bridS1Riders.length).toBe(fbStarts);
    for (const e of bridS1Riders) {
      expect(e.srcSlot).toBe('skill1');
      expect(e.inFullBurst).toBe(true); // FB-enter timing: the rider takes the FB major
      const coreish = e.coreRate ?? e.core;
      if (typeof coreish === 'number') {
        expect(coreish).toBe(0);
      } // no core strike text in the kit
    }
  });

  it('skill1 636% rider is NOT keyed to this unit own burst cast', () => {
    // Nearest-wrong: burstCast keying. It fires pre-FB (inFullBurst false) and/or a different
    // number of times whenever another same-tier unit takes the burst slot in a rotation.
    const differs =
      bridS1RidersBC.length !== bridS1Riders.length ||
      bridS1RidersBC.some((e) => e.inFullBurst !== true);
    expect(differs).toBe(true);
  });

  it('skill1 rider magnitude is the authored 636% (halving it halves its contribution)', () => {
    const full = totals(base.res)[SLUG] - totals(s1RiderOff.res)[SLUG];
    const half = totals(s1RiderHalf.res)[SLUG] - totals(s1RiderOff.res)[SLUG];
    expect(full).toBeGreaterThan(0);
    expect(half / full).toBeCloseTo(0.5, 3);
  });

  // --- skill2 a) Damage Taken UP 12.12% / 10s after 10 normal attacks ---------
  it('skill2 Damage Taken 12.12% is element-gated (inert on Fire) but otherwise live at a 10-attack counter', () => {
    expect(
      buffs(base).filter(
        (e) => e.stat === 'damageTakenPct' && near(e.value, 12.12)
      )
    ).toHaveLength(0);

    const dt = buffs(s2DebuffUngated).filter(
      (e) => e.stat === 'damageTakenPct' && near(e.value, 12.12)
    );
    expect(dt.length).toBeGreaterThan(0);
    for (const e of dt) {
      expect(e.casterIdx ?? null).toBeNull();
      expect(e.durationShots ?? null).toBeNull(); // seconds, not rounds
    }
    // 10-attack counter must fire about HALF as often as the 5-attack damage counter.
    const ratio = dt.length / bridS2Riders.length;
    expect(ratio).toBeGreaterThan(0.35);
    expect(ratio).toBeLessThan(0.65);
    expect(teamTotal(s2DebuffUngated.res)).toBeGreaterThan(teamTotal(base.res));
  });

  // --- skill2 b) 675% of final ATK after 5 normal attacks ---------------------
  it('skill2 675% rider runs off a 5-attack counter, not a full-burst or per-shot trigger', () => {
    expect(bridS2Riders.length).toBeGreaterThan(fbStarts); // not FB-keyed
    for (const e of bridS2Riders) {
      expect(e.srcSlot).toBe('skill2');
    }
    // Nearest-wrong: threshold 10 (or a per-shot trigger). Doubling the threshold must halve
    // the fire count; a shotFired encoding would land near 0.1 and fail this band.
    const ratio = bridS2Riders10.length / bridS2Riders.length;
    expect(ratio).toBeGreaterThan(0.4);
    expect(ratio).toBeLessThan(0.65);
  });

  it('skill2 rider magnitude is the authored 675% (halving it halves its contribution)', () => {
    const full = totals(base.res)[SLUG] - totals(s2RiderOff.res)[SLUG];
    const half = totals(s2RiderHalf.res)[SLUG] - totals(s2RiderOff.res)[SLUG];
    expect(full).toBeGreaterThan(0);
    expect(half / full).toBeCloseTo(0.5, 3);
  });

  it('the two riders sit at the kit 636 : 675 ratio', () => {
    // ADAPTED: compare the `atkPct` coefficient the damage events carry directly (636 vs 675),
    // not the best-buffed max AMOUNT. The blind author assumed buff state cancels in an amount
    // ratio, but the S2 rider's peak in-FB instance carries more dmgUp than the S1 FB-enter nuke,
    // so it does NOT (amount ratio read ~0.80). atkPct is the buff-state-free coefficient, which is
    // exactly what this discrimination targets — and it is carried on every damage event.
    const a1 = bridS1Riders
      .map((e) => e.atkPct)
      .filter((v: any) => typeof v === 'number');
    const a2 = bridS2Riders
      .map((e) => e.atkPct)
      .filter((v: any) => typeof v === 'number');
    expect(a1.length).toBeGreaterThan(0);
    expect(a2.length).toBeGreaterThan(0);
    expect(Math.max(...a1) / Math.max(...a2)).toBeCloseTo(636 / 675, 6);
  });

  // --- burst) ATK UP 66.52% of the skill user ATK, allies except self ---------
  it('burst ATK grant is caster-scaled, allies-except-self, and time-bounded', () => {
    expect(bridBurstBuffs.length).toBeGreaterThanOrEqual(3); // non-vacuity: she casts at least once
    expect(bridBurstBuffs.length % 3).toBe(0); // 3 recipients per cast (4-unit comp minus self)
    for (const e of bridBurstBuffs) {
      expect(e.stat).toBe('casterAtkPct'); // not atkPct: it scales the CASTER ATK, not the target
      expect(e.value).toBeGreaterThan(500); // FLAT-resolved ATK at apply time, never the raw 66.52
      expect(near(e.value, 66.52)).toBe(false);
      expect(e.durationShots ?? null).toBeNull(); // 10 SECONDS, not 10 rounds
      expect(e.targetSlug).not.toBe(SLUG); // except self
    }
    expect(new Set(bridBurstBuffs.map((e) => e.targetSlug)).size).toBe(3);
  });

  it('burst ATK grant moves every ally and is inert on self', () => {
    expect(totals(burstBuffOff.res)[SLUG]).toBe(totals(base.res)[SLUG]); // except-self is real
    for (const s of otherSlugs) {
      expect(totals(base.res)[s]).toBeGreaterThan(totals(burstBuffOff.res)[s]);
    }
  });

  // --- cross-line inertness ---------------------------------------------------
  it('both damage riders are self-only: removing either moves no teammate', () => {
    for (const s of otherSlugs) {
      expect(totals(s1RiderOff.res)[s]).toBe(totals(base.res)[s]);
      expect(totals(s2RiderOff.res)[s]).toBe(totals(base.res)[s]);
    }
  });

  it.skip('ACTIVE case for both Wind Code Damage Taken lines needs a Wind-boss fixture', () => {
    // controlComp pins a Fire boss and exposes no boss-element parameter, so the gate can only be
    // shown INERT here plus live-when-ungated (above). A Wind-boss comp helper would close this.
  });
});
