// Enemy DEF ▼ channel (landed 2026-08-10, owner-ruled — faithfulness audit F4): an
// enemy-targeted `defPct` buff at a nonzero value reaches `enemyBuffs` and scales
// `cfg.bossDef` by (1 + Σ/100) at damage time (sim.ts bossDefNow), floor 0.
//
// The channel is PROVABLY inert on the graded basis — bossDef = 0 short-circuits, a
// percentage of zero is zero — and live at the web app's raid DEF defaults, where the
// pre-channel drop was worth several percent per carrier (damage-bucket-matrix §5 trap 4).
//
// Method: equivalence arms. A permanent −50% shave at bossDef 20,000 must produce the
// EXACT totals of bossDef 10,000 with no debuff (same comp, same timeline — the debuff
// feeds no gauge and alters no cadence, so the arms differ only in the DEF subtraction).
import { describe, expect, it } from 'vitest';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const CARRY = 'ada';

function run(shavePct: number | null, bossDef: number) {
  const carry = withPatchedOverride(CARRY, (ov) => {
    if (shavePct != null) {
      ov.skill1.push({
        slot: 'skill1',
        trigger: { kind: 'passive' },
        target: { kind: 'enemy' },
        effects: [{ kind: 'buff', stat: 'defPct', value: shavePct }],
      });
    }
  });
  return totals(
    runComp({
      ...controlComp(CARRY),
      overrides: { [CARRY]: carry },
      cfg: { bossDef },
    })
  );
}

describe('enemy DEF ▼ channel (defPct on the enemy scales cfg.bossDef)', () => {
  it('a permanent −50% shave at bossDef 20,000 equals bossDef 10,000 exactly', () => {
    expect(run(-50, 20000)).toEqual(run(null, 10000));
  });

  it('the shave floors at DEF 0: −150% at bossDef 20,000 equals bossDef 0', () => {
    expect(run(-150, 20000)).toEqual(run(null, 0));
  });

  it('a DEF ▲ (+50%) raises effective DEF: equals bossDef 30,000 exactly', () => {
    expect(run(50, 20000)).toEqual(run(null, 30000));
  });

  it('PROOF the graded basis is untouched: at bossDef 0 the debuff is byte-identical to none', () => {
    expect(run(-50, 0)).toEqual(run(null, 0));
  });

  it('the debuff actually moves damage at nonzero DEF (the arms above are not vacuous)', () => {
    const shaved = run(-50, 20000);
    const unshaved = run(null, 20000);
    expect(shaved[CARRY]).toBeGreaterThan(unshaved[CARRY]);
  });
});
