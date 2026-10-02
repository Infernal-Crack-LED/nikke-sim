// Engine primitive: `trueNormalsModes` — normal attacks are True-flavored only while the unit's
// SELECTED kit mode is listed. The mode-scoped sibling of `hasTrueNormals`, exactly as
// `pierceModes` is to `hasPierce` (resolved once at setup from the selected mode). Carriers:
// guilty-mighty-bunny and sin-swift-bunny ("Bunny Mode: Engage … Normal attacks deal true damage.
// This effect is continuous and cannot be removed").
//
// Observable: True flavor is what lets a `trueDamagePct` buff into a hit's Damage-Up bucket
// (sim.ts dealDamage), so with a self `trueDamagePct` buff live, a normal-attack event's
// `mult.dmgUp` rises ONLY when the flavor is on. Same zeroed-kit carrier pattern as
// mode-gate.test.ts (blanc + a bare-weapon crown filler, bursts off).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { structuralCheck } from '../../../src/skills/validate-structural.js';
import { bareWeaponOverride, runComp } from '../lib/harness.js';

type DamageEvent = Extract<SimEvent, { kind: 'damage' }>;

const CARRY = 'blanc';
const TRUE_BUFF = 100;

/** blanc's normal-attack dmgUp values with a +100% self True Damage buff, for a mode selection. */
function normalDmgUp(
  selectedMode: string | undefined,
  trueNormalsModes?: string[]
) {
  const events: SimEvent[] = [];
  runComp({
    slugs: [CARRY, 'crown'],
    bossElement: 'Iron',
    focusSlug: CARRY,
    modes: selectedMode !== undefined ? { [CARRY]: selectedMode } : undefined,
    overrides: {
      [CARRY]: {
        slug: CARRY,
        modes: ['Stance', 'Engage'],
        ...(trueNormalsModes ? { trueNormalsModes } : {}),
        skill1: [
          {
            slot: 'skill1',
            trigger: { kind: 'passive' },
            target: { kind: 'self' },
            effects: [
              { kind: 'buff', stat: 'trueDamagePct', value: TRUE_BUFF },
            ],
          },
        ],
        skill2: [],
        burst: [],
      } as any,
      crown: bareWeaponOverride('crown'),
    },
    cfg: { disableBursts: true, onEvent: (e) => events.push(e) },
  });
  return new Set(
    events
      .filter(
        (e): e is DamageEvent =>
          e.kind === 'damage' && e.slug === CARRY && e.srcSlot === 'normal'
      )
      .map((e) => +e.mult.dmgUp.toFixed(6))
  );
}

describe('trueNormalsModes (mode-scoped true-flavored normals)', () => {
  const plain = normalDmgUp('Stance'); // no trueNormalsModes at all = the unflavored baseline

  it('baseline: without the field, a True Damage buff never reaches normal attacks', () => {
    expect(plain.size).toBe(1);
    expect(normalDmgUp('Engage')).toEqual(plain);
  });

  it('DISCRIMINATING: the listed mode makes normals True — the True Damage buff lands in dmgUp', () => {
    const engage = normalDmgUp('Engage', ['Engage']);
    expect(engage.size).toBe(1);
    const [base] = plain;
    const [withTrue] = engage;
    expect(withTrue - base).toBeCloseTo(TRUE_BUFF / 100, 6);
  });

  it('DISCRIMINATING: an unlisted mode keeps normals plain (not a whole-fight hasTrueNormals)', () => {
    expect(normalDmgUp('Stance', ['Engage'])).toEqual(plain);
  });

  it('default selection (modes[0]) follows the same rule', () => {
    expect(normalDmgUp(undefined, ['Engage'])).toEqual(plain);
    expect(normalDmgUp(undefined, ['Stance'])).toEqual(
      normalDmgUp('Engage', ['Engage'])
    );
  });

  it('validator: a trueNormalsModes entry must name a declared mode', () => {
    const ctx = { characterSlugs: new Set([CARRY]), squadOf: () => undefined };
    const ov = (modes: string[] | undefined, tnm: string[]) => ({
      note: 'fixture',
      ...(modes ? { modes } : {}),
      trueNormalsModes: tnm,
      skill1: [],
      skill2: [],
      burst: [],
      unmodeled: { skill1: [], skill2: [], burst: [] },
    });
    expect(
      structuralCheck(CARRY, ov(['Stance', 'Engage'], ['Engage']), ctx).errors
    ).toEqual([]);
    expect(
      structuralCheck(CARRY, ov(['Stance', 'Engage'], ['Engaged']), ctx).errors
    ).toEqual([
      'trueNormalsModes: mode "Engaged" not declared in top-level modes[]',
    ]);
    expect(
      structuralCheck(CARRY, ov(undefined, ['Engage']), ctx).errors
    ).toHaveLength(1);
  });
});
