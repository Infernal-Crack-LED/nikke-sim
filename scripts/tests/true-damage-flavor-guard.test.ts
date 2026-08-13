// true-damage-flavor-guard.test.ts — pins the owner's 2026-08-13 true-damage ruling.
//
// The ruling: true damage is a FLAVOR, like pierce. It changes the flavor of the damage, not the
// PROPERTIES of the damage. So what may core depends on the SOURCE:
//   • a WEAPON dealing true damage  → can crit AND core
//   • a SKILL  dealing true damage  → can crit, but NOT core
//
// The engine already conformed when the ruling was made (DECISIONS 2026-08-13), by two independent
// paths rather than by one guard:
//   • WEAPON — `trueFlavor: !!u.swap?.trueNormals || u.hasTrueNormals` rides the normal-fire path,
//     so a true-flavored normal crits and cores exactly like any other normal. Nothing to assert
//     here that the weapon path does not already assert for every unit.
//   • SKILL  — dot / rider / flatDamage instances core ONLY via an explicit per-effect `coreRate`
//     (or the XCORE A/B env, which is a debug switch, not authoring). So skill-sourced true damage
//     does not core BECAUSE no authored effect asks it to.
//
// That second one is the fragile half, and it is why this file exists. It holds by ABSENCE, not by
// construction: nothing in the schema or the validator stops a future override from putting a
// `coreRate` on a true-flavored skill effect, which is precisely the combination the ruling
// forbids. It would be silent — no engine error, no validator error, and the graded comps would
// only notice if that unit sat in one.
//
// If this test fails, do NOT delete the coreRate to make it green without reading the kit: either
// the effect is weapon-sourced and is modeled in the wrong place, or the kit line genuinely says
// "core strike", in which case the ruling itself is what needs revisiting (DECISIONS, same tier).
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const OVERRIDES_DIR = new URL('../../src/skills/overrides/', import.meta.url);
const SLOTS = ['skill1', 'skill2', 'burst'] as const;

/** Every authored effect in the roster, tagged with where it came from. */
function allEffects(): Array<{ slug: string; slot: string; effect: any }> {
  const out: Array<{ slug: string; slot: string; effect: any }> = [];
  for (const f of readdirSync(OVERRIDES_DIR)) {
    if (!f.endsWith('.json')) {
      continue;
    }
    const slug = f.replace(/\.json$/, '');
    const ov = JSON.parse(readFileSync(new URL(f, OVERRIDES_DIR), 'utf8'));
    for (const slot of SLOTS) {
      for (const block of ov[slot] ?? []) {
        for (const effect of block.effects ?? []) {
          out.push({ slug, slot, effect });
        }
      }
    }
  }
  return out;
}

describe('true damage is a flavor, not a property change (owner ruling 2026-08-13)', () => {
  const effects = allEffects();

  it('reads the whole roster — the guard is worthless if the scan is empty', () => {
    expect(effects.length).toBeGreaterThan(500);
  });

  it('no SKILL-sourced true-damage effect asks to core', () => {
    const violations = effects
      .filter(
        ({ effect }) =>
          effect.flavor === 'true' &&
          (effect.coreRate != null || effect.core === true)
      )
      .map(({ slug, slot, effect }) => `${slug}.${slot}:${effect.kind}`);
    expect(violations).toEqual([]);
  });

  it('true-flavored skill effects DO exist, so the check above is not vacuous', () => {
    const trueFlavored = effects.filter(
      ({ effect }) => effect.flavor === 'true'
    );
    expect(trueFlavored.length).toBeGreaterThan(0);
  });
});
