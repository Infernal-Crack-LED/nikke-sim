// The Overload free-line pool's Hit Rate gate must match the ENGINE, not a list
// someone remembered to update.
//
// Owner ruling 2026-08-02: a Hit Rate overload line counts as a damage line for
// AR/SMG/SG and does not for RL/SR/MG. That is not an independent policy — it is a
// restatement of what sim.ts already does: `HRCORE` converts live Hit Rate into a
// higher core-hit fraction only for weapons with a datamined accuracy-circle row
// (`HR_CORE_CIRCLE = { AR: 75, SMG: 110, SG: 250 }`); for everything else
// `hrCoreExp` returns 0, `hrCoreMult` returns 1, and the line is inert.
//
// WHY THIS TEST EXISTS. `src/olconfigs.ts` used to exclude Hit Rate for EVERY
// weapon, on a comment that said it was "dead for damage" — true when written,
// stale the moment HRCORE landed (2026-07-17), and silently wrong for three
// weapon classes for months afterwards. A hardcoded `expect(pool).toContain(...)`
// would have gone stale the same way. So this asserts the pool against a MEASURED
// engine behaviour: for each weapon class, does a hitRatePct buff actually move
// the resolved core rate? The pool must offer Hit Rate exactly when it does.
//
// The magnitude is deliberately not asserted — the HR→core curve is contested,
// ⚑-flagged territory (UNIGEO/CONE_DELTA/HRCORE, open-questions U27/U29) and this
// test must not quietly pin a value there. Same narrow-scope discipline as
// engine/hit-rate-core.test.ts, whose bare-weapon pattern this reuses.
import { describe, expect, it } from 'vitest';
import type { SimEvent, Weapon } from '../../../src/types.js';
import { freeLineCandidates } from '../../../src/olconfigs.js';
import { bareWeaponOverride, data, runComp } from '../lib/harness.js';

type DamageEvent = Extract<SimEvent, { kind: 'damage' }>;

// One bare-weapon carrier per class. Kits are zeroed by bareWeaponOverride, so
// these stand in for their weapon class and nothing else.
const CARRIER: Record<Weapon, string | null> = {
  AR: 'blanc',
  SMG: 'chisato',
  SG: 'drake',
  RL: 'ada',
  SR: 'alice',
  MG: 'avistar',
  Pistol: null, // no simSupported Pistol carrier to stand in for the class
};

// Mean resolved core rate on the carrier's normal attacks, with and without a
// single hitRatePct source (never two — sim.ts flags multi-source summation of
// this stat as "⚑ UNVALIDATED (R8)").
function meanCoreRate(slug: string, hitRatePct?: number): number {
  const events: SimEvent[] = [];
  runComp({
    slugs: [slug, 'crown'],
    bossElement: 'Iron',
    focusSlug: slug,
    overrides: {
      [slug]: {
        ...bareWeaponOverride(slug),
        skill1:
          hitRatePct === undefined
            ? []
            : [
                {
                  slot: 'skill1',
                  trigger: { kind: 'passive' },
                  target: { kind: 'self' },
                  effects: [
                    { kind: 'buff', stat: 'hitRatePct', value: hitRatePct },
                  ],
                },
              ],
      } as never,
      crown: bareWeaponOverride('crown'),
    },
    cfg: { disableBursts: true, onEvent: (e) => events.push(e) },
  });
  const normals = events.filter(
    (e): e is DamageEvent =>
      e.kind === 'damage' && e.slug === slug && e.srcSlot === 'normal'
  );
  expect(normals.length).toBeGreaterThan(0);
  return normals.reduce((sum, n) => sum + n.coreRate, 0) / normals.length;
}

describe('overload free-line pool: the Hit Rate gate tracks the engine', () => {
  const weapons = (Object.keys(CARRIER) as Weapon[]).filter(
    (w) => CARRIER[w] !== null
  );

  it.each(weapons)(
    '%s — Hit Rate is offered as a free line iff it moves the core rate',
    (weapon) => {
      const slug = CARRIER[weapon]!;
      expect(data.characters[slug]?.weapon).toBe(weapon); // carrier still is this class

      const base = meanCoreRate(slug);
      const buffed = meanCoreRate(slug, 40);
      const engineLift = buffed > base;
      const offered = freeLineCandidates(weapon).includes('hitrate');

      expect(
        offered,
        engineLift
          ? `${weapon}: a hitRatePct buff raises the core rate (${base} → ${buffed}), so the OL pool must offer Hit Rate`
          : `${weapon}: a hitRatePct buff leaves the core rate at ${base}, so offering Hit Rate would be a dead candidate`
      ).toBe(engineLift);
    }
  );

  it('the lift set is exactly AR/SMG/SG (the sim.ts HR_CORE_CIRCLE rows)', () => {
    const lifted = weapons.filter((w) => {
      const slug = CARRIER[w]!;
      return meanCoreRate(slug, 40) > meanCoreRate(slug);
    });
    expect(lifted.sort()).toEqual(['AR', 'SG', 'SMG']);
  });

  it('DEF is never a free-line candidate on any weapon', () => {
    for (const w of Object.keys(CARRIER) as Weapon[]) {
      expect(freeLineCandidates(w)).not.toContain('def');
    }
  });
});
