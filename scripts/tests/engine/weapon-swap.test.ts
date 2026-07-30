// Engine-primitive backfill: `weaponSwap` (14 carriers) + `swapGate` (7) — TDD transition step 2
// (docs/handoffs/2026-07-23-tdd-transition-plan.md), primitive census in docs/engine-modeling-gaps.md.
// "Changes the weapon in use: …" kit lines are the densest primitive left unbackfilled after the
// 2026-07-23 batch (flatDamage/hitCount/hitsPerShot/burstCdr/buff-application/block-gates) — a swap
// touches SEVEN independent fields at once (cadence, per-shot multiplier, ammo capacity, charge
// behavior, true-damage flavor, Pierce tag, uses-based early end), any one of which silently reverting
// to the base-weapon value would be invisible in a total-damage snapshot.
//
// Method: a plain non-charge, non-MG carrier (`blanc`, AR) with her whole kit zeroed and a SYNTHETIC
// `interval`-triggered weaponSwap installed in skill1 — independent of burst timing/rotation entirely,
// so every arm below isolates the swap mechanic from the rotation model. The second slot (`crown`) is
// bare-weapon too (`bareWeaponOverride`), so no ally buff can leak into blanc's multiplier decomposition.
// `sec` on every SimEvent (not `frame`) is the readout — no FPS import needed.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { bareWeaponOverride, data, runComp } from '../lib/harness.js';

type ShotEvent = Extract<SimEvent, { kind: 'shot' }>;
type DamageEvent = Extract<SimEvent, { kind: 'damage' }>;
type BuffApplyEvent = Extract<SimEvent, { kind: 'buffApply' }>;

const CARRY = 'blanc'; // AR, hitsPerShot 1, chargeFrames 0, ammo 60, normalAttackMultiplier 13.65
const OTHER = 'crown'; // bare-weapon filler — irrelevant to every assertion below
const BASE_PPS = 12; // NOMINAL_PULLS_PER_SEC.AR
const BASE_MULT = data.characters[CARRY].normalAttackMultiplier;

const SWAP_SEC = 30; // interval trigger: fires t=30,60,90,120,150 — 5 windows in the 180s fight
const SWAP_DUR = 8; // well inside each 30s gap, so windows never overlap or chain

const inWindow = (sec: number) =>
  sec >= SWAP_SEC && ((sec - SWAP_SEC) % SWAP_SEC) - 0 < SWAP_DUR;

/** Run blanc with a synthetic weaponSwap on a repeating interval, plus optional extra skill1 blocks. */
function swapComp(effect: Record<string, unknown>, extraBlocks: any[] = []) {
  const events: SimEvent[] = [];
  runComp({
    slugs: [CARRY, OTHER],
    bossElement: 'Iron', // neutral wheel-wise; irrelevant here (elem is its own bucket, not dmgUp)
    focusSlug: CARRY,
    overrides: {
      [CARRY]: {
        slug: CARRY,
        skill1: [
          {
            slot: 'skill1',
            trigger: { kind: 'interval', sec: SWAP_SEC },
            target: { kind: 'self' },
            effects: [{ kind: 'weaponSwap', durationSec: SWAP_DUR, ...effect }],
          },
          ...extraBlocks,
        ],
        skill2: [],
        burst: [],
      } as any,
      [OTHER]: bareWeaponOverride(OTHER),
    },
    cfg: { disableBursts: true, onEvent: (e) => events.push(e) },
  });
  const shots = events.filter(
    (e): e is ShotEvent => e.kind === 'shot' && e.slug === CARRY
  );
  const normals = events.filter(
    (e): e is DamageEvent =>
      e.kind === 'damage' && e.slug === CARRY && e.srcSlot === 'normal'
  );
  const buffs = events.filter(
    (e): e is BuffApplyEvent => e.kind === 'buffApply' && e.targetSlug === CARRY
  );
  return { events, shots, normals, buffs };
}

describe('weaponSwap (temporary weapon override)', () => {
  it('fixture check — blanc is a plain non-charge, non-MG, non-swap AR carrier', () => {
    const c = data.characters[CARRY];
    expect(c.weapon).toBe('AR');
    expect(c.chargeFrames).toBe(0);
    expect(c.hitsPerShot).toBe(1);
    expect(BASE_MULT).toBeGreaterThan(0);
  });

  it('DISCRIMINATING: an explicit pullsPerSec overrides the fire cadence only inside the window', () => {
    // maxAmmo:999 keeps a mag change from ever happening inside an 8s window, so reload downtime
    // (which the base-ammo arms below intentionally DO exercise) cannot dilute the cadence readout.
    const { shots } = swapComp({
      damagePct: BASE_MULT,
      pullsPerSec: 30,
      maxAmmo: 999,
    });
    const inRate = shots.filter((s) => inWindow(s.sec)).length / (5 * SWAP_DUR);
    const outRate =
      shots.filter((s) => !inWindow(s.sec)).length / (180 - 5 * SWAP_DUR);
    expect(
      inRate,
      `in-window rate ${inRate.toFixed(1)}/s should approach the swap's 30/s`
    ).toBeGreaterThan(25);
    expect(
      outRate,
      `out-of-window rate ${outRate.toFixed(1)}/s should stay near base AR 12/s`
    ).toBeLessThan(15);
  });

  it('DISCRIMINATING: an unspecified pullsPerSec falls back to the swap WEAPON CLASS default, not the base weapon or a flat constant', () => {
    // No explicit pullsPerSec — only `weapon: 'SMG'` (effective 20/s, frame-quantized). A no-op swap would
    // read 12/s (blanc's own AR rate); a hardcoded fallback constant would read 4/s; only the weapon-class
    // lookup reads ~20/s. maxAmmo:999 again removes reload downtime from the readout.
    const { shots } = swapComp({
      damagePct: BASE_MULT,
      weapon: 'SMG',
      maxAmmo: 999,
    });
    const inRate = shots.filter((s) => inWindow(s.sec)).length / (5 * SWAP_DUR);
    const outRate =
      shots.filter((s) => !inWindow(s.sec)).length / (180 - 5 * SWAP_DUR);
    expect(
      inRate,
      `in-window rate ${inRate.toFixed(1)}/s should approach SMG's ~20/s, not AR's 12 or a flat 4`
    ).toBeGreaterThan(18);
    expect(
      outRate,
      `out-of-window rate ${outRate.toFixed(1)}/s should stay at blanc's own AR rate`
    ).toBeLessThan(14);
  });

  it('DISCRIMINATING: damagePct REPLACES the base normalAttackMultiplier, not adds to it', () => {
    const SWAP_MULT = 500; // far from BASE_MULT (13.65) so the two arms are unmistakable
    const { normals } = swapComp({
      damagePct: SWAP_MULT,
      pullsPerSec: BASE_PPS,
    });
    const inAtk = new Set(
      normals.filter((n) => inWindow(n.sec)).map((n) => n.atkPct)
    );
    const outAtk = new Set(
      normals.filter((n) => !inWindow(n.sec)).map((n) => n.atkPct)
    );
    expect(
      inAtk,
      'every in-window normal should carry exactly the swap damagePct'
    ).toEqual(new Set([SWAP_MULT]));
    expect(
      outAtk,
      'every out-of-window normal should carry exactly the base normalAttackMultiplier'
    ).toEqual(new Set([BASE_MULT]));
  });

  it('DISCRIMINATING: hasPierce tags only swap-window shots as Pierce (feeds pierceDamagePct only there)', () => {
    const PIERCE_BUFF = 1000; // huge — its presence/absence in dmgUp is unmistakable
    const { normals } = swapComp(
      { damagePct: BASE_MULT, pullsPerSec: BASE_PPS, hasPierce: true },
      [
        {
          slot: 'skill1',
          trigger: { kind: 'passive' },
          target: { kind: 'self' },
          effects: [
            { kind: 'buff', stat: 'pierceDamagePct', value: PIERCE_BUFF },
          ],
        },
      ]
    );
    const inDmgUp = new Set(
      normals.filter((n) => inWindow(n.sec)).map((n) => n.mult.dmgUp)
    );
    const outDmgUp = new Set(
      normals.filter((n) => !inWindow(n.sec)).map((n) => n.mult.dmgUp)
    );
    expect(
      inDmgUp,
      'in-window dmgUp should carry the pierce bucket (1 + 1000/100)'
    ).toEqual(new Set([11]));
    expect(
      outDmgUp,
      'out-of-window dmgUp should NOT carry pierce — blanc is not Pierce-tagged there'
    ).toEqual(new Set([1]));
  });

  it('DISCRIMINATING: trueNormals routes only swap-window shots through trueDamagePct', () => {
    const TRUE_BUFF = 800;
    const { normals } = swapComp(
      { damagePct: BASE_MULT, pullsPerSec: BASE_PPS, trueNormals: true },
      [
        {
          slot: 'skill1',
          trigger: { kind: 'passive' },
          target: { kind: 'self' },
          effects: [{ kind: 'buff', stat: 'trueDamagePct', value: TRUE_BUFF }],
        },
      ]
    );
    const inDmgUp = new Set(
      normals.filter((n) => inWindow(n.sec)).map((n) => n.mult.dmgUp)
    );
    const outDmgUp = new Set(
      normals.filter((n) => !inWindow(n.sec)).map((n) => n.mult.dmgUp)
    );
    expect(
      inDmgUp,
      'in-window dmgUp should carry the true-damage bucket (1 + 800/100)'
    ).toEqual(new Set([9]));
    expect(
      outDmgUp,
      'out-of-window shots are not true-flavored — the bucket must not leak outside the window'
    ).toEqual(new Set([1]));
  });

  it('DISCRIMINATING: entering a real (non-trueNormals) swap force-refills ammo to swap.maxAmmo; trueNormals does not', () => {
    const HUGE_AMMO = 900; // far above blanc's base 60, so a refill jump is unmistakable
    const real = swapComp({
      damagePct: BASE_MULT,
      pullsPerSec: BASE_PPS,
      maxAmmo: HUGE_AMMO,
    });
    const flavor = swapComp({
      damagePct: BASE_MULT,
      pullsPerSec: BASE_PPS,
      maxAmmo: HUGE_AMMO,
      trueNormals: true,
    });
    const firstAfterEntry = (shots: ShotEvent[]) =>
      shots.find((s) => s.sec >= SWAP_SEC && s.slug === CARRY)!;
    const realFirst = firstAfterEntry(real.shots);
    const flavorFirst = firstAfterEntry(flavor.shots);
    expect(
      realFirst.ammoAfter,
      'a real swap should force-refill to the new (huge) capacity on entry'
    ).toBeGreaterThan(HUGE_AMMO - 5);
    expect(
      flavorFirst.ammoAfter,
      'a trueNormals (same-weapon flavor) swap must NOT force a free reload on entry'
    ).toBeLessThan(60);
  });

  it('DISCRIMINATING: maxShots ends the swap early (uses-based), independent of durationSec', () => {
    const SWAP_MULT = 500;
    // durationSec 9999 is a hard time bound far beyond the fight — with maxShots omitted the swap
    // therefore never expires on its own, and the recurring interval trigger just keeps refreshing an
    // already-live swap. maxAmmo:999 removes reload downtime so the per-window shot count is exact.
    const capped = swapComp({
      damagePct: SWAP_MULT,
      pullsPerSec: 30,
      maxAmmo: 999,
      durationSec: 9999,
      maxShots: 3,
    });
    const uncapped = swapComp({
      damagePct: SWAP_MULT,
      pullsPerSec: 30,
      maxAmmo: 999,
      durationSec: 9999,
    });
    const swapShots = (r: typeof capped) =>
      r.normals.filter((n) => n.sec >= SWAP_SEC && n.atkPct === SWAP_MULT);
    // Bucket the capped arm's swap shots by WHICH interval firing produced them (each of the 5
    // triggers reopens a fresh maxShots:3 window) — the discriminating claim is "3 per window", not
    // just "3 total", since the interval keeps re-triggering across the fight.
    const perWindowCounts = new Map<number, number>();
    for (const n of swapShots(capped)) {
      const w = Math.floor((n.sec - SWAP_SEC) / SWAP_SEC);
      perWindowCounts.set(w, (perWindowCounts.get(w) ?? 0) + 1);
    }
    expect(
      [...perWindowCounts.values()],
      'every window should independently cut off at exactly 3 swapped shots'
    ).toEqual([3, 3, 3, 3, 3]);
    // Without maxShots the swap never lapses, so (barring the brief pre-first-window base-rate
    // stretch) essentially every later normal shot should be swap-flavored — far more than 5×3.
    const uncappedSwapShots = swapShots(uncapped);
    expect(
      uncappedSwapShots.length,
      'without maxShots the 9999s duration should keep the swap live for the rest of the fight'
    ).toBeGreaterThan(15 * 5);
    const lastCappedNormal = capped.normals[capped.normals.length - 1];
    expect(
      lastCappedNormal.atkPct,
      'after each uses-based cutoff, fire must revert to the base weapon, not stay swapped'
    ).toBe(BASE_MULT);
  });

  it("swapGate: 'swapped' fires only inside the window, 'unswapped' only outside — both directions", () => {
    const { buffs } = swapComp(
      { damagePct: BASE_MULT, pullsPerSec: BASE_PPS },
      [
        {
          slot: 'skill1',
          trigger: { kind: 'shotFired' },
          target: { kind: 'self' },
          swapGate: 'swapped',
          effects: [{ kind: 'buff', stat: 'critDamagePct', value: 1 }],
        },
        {
          slot: 'skill1',
          trigger: { kind: 'shotFired' },
          target: { kind: 'self' },
          swapGate: 'unswapped',
          effects: [{ kind: 'buff', stat: 'critDamagePct', value: 2 }],
        },
      ]
    );
    const swappedGate = buffs.filter((b) => b.value === 1);
    const unswappedGate = buffs.filter((b) => b.value === 2);
    expect(
      swappedGate.length,
      "the 'swapped' gate should fire at least once"
    ).toBeGreaterThan(0);
    expect(
      unswappedGate.length,
      "the 'unswapped' gate should fire at least once"
    ).toBeGreaterThan(0);
    expect(
      swappedGate.every((b) => inWindow(b.sec)),
      "every 'swapped'-gated activation must land inside a swap window"
    ).toBe(true);
    expect(
      unswappedGate.every((b) => !inWindow(b.sec)),
      "every 'unswapped'-gated activation must land outside every swap window"
    ).toBe(true);
  });
});
