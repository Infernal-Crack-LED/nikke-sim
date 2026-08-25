// validate-structural.test.ts — the override authoring rules, exercised as a pure function.
//
// Before the 2026-08-10 extraction these rules lived inside scripts/validate-overrides.ts's
// validate(), which loads from disk and runs a smoke sim — so none of them had a test (the
// "validator's target: enemy rule has no test" gap, docs/engine-modeling-gaps.md §1a). All
// fixtures here are synthetic objects; nothing touches src/skills/overrides/.
import { describe, expect, it } from 'vitest';
import {
  structuralCheck,
  targetStatusCensus,
} from '../../src/skills/validate-structural.js';

const CTX = {
  characterSlugs: new Set(['liter', 'crown', 'blanc', 'noir']),
  squadOf: (slug: string) => (slug === 'blanc' ? 'Cafe Sweety' : undefined),
};

// The smallest override that passes every structural rule.
function minimal(overrides: Record<string, unknown> = {}) {
  return {
    note: 'test fixture',
    skill1: [],
    skill2: [],
    burst: [],
    unmodeled: { skill1: [], skill2: [], burst: [] },
    ...overrides,
  };
}

function block(overrides: Record<string, unknown> = {}) {
  return {
    trigger: { kind: 'passive' },
    target: { kind: 'self' },
    effects: [{ kind: 'buff', stat: 'atkPct', value: 10 }],
    ...overrides,
  };
}

describe('structuralCheck — baseline', () => {
  it('accepts a minimal valid override with zero errors and zero warnings', () => {
    const r = structuralCheck('liter', minimal(), CTX);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('rejects a missing slot, a missing note, and a missing unmodeled record', () => {
    const r = structuralCheck('liter', { skill1: [] }, CTX);
    expect(r.errors.join('\n')).toMatch(/skill2: missing/);
    expect(r.errors.join('\n')).toMatch(/burst: missing/);
    expect(r.errors.join('\n')).toMatch(/missing top-level "note"/);
    expect(r.errors.join('\n')).toMatch(/missing "unmodeled"/);
  });

  it('rejects unknown trigger / target / effect kinds and stats', () => {
    const r = structuralCheck(
      'liter',
      minimal({
        skill1: [
          {
            trigger: { kind: 'onTuesdays' },
            target: { kind: 'everyone' },
            effects: [{ kind: 'buff', stat: 'luckPct', value: 1 }],
          },
        ],
      }),
      CTX
    );
    expect(r.errors.join('\n')).toMatch(/bad trigger/);
    expect(r.errors.join('\n')).toMatch(/bad target/);
    expect(r.errors.join('\n')).toMatch(/unknown stat "luckPct"/);
  });

  // charFixes.statImmunities is enforced by a bare string match in the engine, so anything the
  // validator lets through unrecognised becomes a permanent SILENT no-op — the unit keeps
  // receiving the stat while its note claims immunity. These pin that it is LOUD.
  it('accepts a valid charFixes.statImmunities entry', () => {
    const r = structuralCheck(
      'liter',
      minimal({ charFixes: { statImmunities: ['chargeSpeedPct'] } }),
      CTX
    );
    expect(r.errors).toEqual([]);
  });

  it('rejects an unknown stat key in charFixes.statImmunities', () => {
    const r = structuralCheck(
      'liter',
      minimal({ charFixes: { statImmunities: ['chargeSpeedPCT'] } }),
      CTX
    );
    expect(r.errors.join('\n')).toMatch(/unknown stat "chargeSpeedPCT"/);
  });

  it('rejects an AUTHORED-side alias, naming the applied key it must use instead', () => {
    const r = structuralCheck(
      'liter',
      minimal({ charFixes: { statImmunities: ['casterMaxHpPct'] } }),
      CTX
    );
    expect(r.errors.join('\n')).toMatch(/authored-side alias/);
    expect(r.errors.join('\n')).toMatch(/"maxHpFlat"/);
  });

  it('rejects a non-array statImmunities', () => {
    const r = structuralCheck(
      'liter',
      minimal({ charFixes: { statImmunities: 'chargeSpeedPct' } }),
      CTX
    );
    expect(r.errors.join('\n')).toMatch(
      /statImmunities: must be an array of stat keys/
    );
  });

  it('rejects the inert noFb flag', () => {
    const r = structuralCheck(
      'liter',
      minimal({
        skill1: [
          block({
            effects: [{ kind: 'flatDamage', atkPct: 50, noFb: true }],
          }),
        ],
      }),
      CTX
    );
    expect(r.errors.join('\n')).toMatch(/"noFb" is inert/);
  });
});

describe('structuralCheck — targetStatus placement (the previously-untested target:enemy rule)', () => {
  it('rejects a targetStatus effect on a non-enemy block', () => {
    const r = structuralCheck(
      'liter',
      minimal({
        skill1: [
          block({
            effects: [
              { kind: 'targetStatus', name: 'Wipe Out', durationSec: 10 },
            ],
          }),
        ],
      }),
      CTX
    );
    expect(r.errors.join('\n')).toMatch(
      /targetStatus effect must sit on a block with target "enemy"/
    );
  });

  it('catches a targetStatus nested inside escalating steps too', () => {
    const r = structuralCheck(
      'liter',
      minimal({
        skill1: [
          block({
            effects: [
              {
                kind: 'escalating',
                steps: [
                  { kind: 'targetStatus', name: 'Wipe Out', durationSec: 10 },
                ],
              },
            ],
          }),
        ],
      }),
      CTX
    );
    expect(r.errors.join('\n')).toMatch(
      /targetStatus effect must sit on a block with target "enemy"/
    );
  });

  it('accepts a targetStatus effect on an enemy-targeted block', () => {
    const r = structuralCheck(
      'liter',
      minimal({
        skill1: [
          block({
            target: { kind: 'enemy' },
            effects: [
              { kind: 'targetStatus', name: 'Wipe Out', durationSec: 10 },
            ],
          }),
        ],
      }),
      CTX
    );
    expect(r.errors).toEqual([]);
  });
});

describe('structuralCheck — chargeCounter is fully routed (audit F2.1, closed 2026-08-11)', () => {
  it('ACCEPTS everyN + delaySec on a chargeCounter block — the rule that errored here is gone', () => {
    // The inverse of the assertion this test used to make. sim.ts routes chargeCounter through
    // applyBlock now, so these fields run like they do on any other trigger; the engine side is
    // pinned by scripts/tests/engine/charge-counter-gates.test.ts.
    const r = structuralCheck(
      'liter',
      minimal({
        skill1: [
          block({
            trigger: { kind: 'chargeCounter', count: 3 },
            everyN: 2,
            delaySec: 1.5,
          }),
        ],
      }),
      CTX
    );
    expect(r.errors).toEqual([]);
  });

  it('accepts a runtime-gated chargeCounter block (gates honored since the blockGatesPass fix)', () => {
    const r = structuralCheck(
      'liter',
      minimal({
        skill1: [
          block({
            trigger: { kind: 'chargeCounter', count: 3 },
            fbGate: 'inFb',
            resourceGate: { name: 'chips', min: 30 },
          }),
        ],
      }),
      CTX
    );
    expect(r.errors).toEqual([]);
  });

  it('accepts an ungated chargeCounter block', () => {
    const r = structuralCheck(
      'liter',
      minimal({
        skill1: [block({ trigger: { kind: 'chargeCounter', count: 3 } })],
      }),
      CTX
    );
    expect(r.errors).toEqual([]);
  });
});

describe('structuralCheck — enemy-targeted buff allowlist (warning channel)', () => {
  it('accepts an enemy DEF ▼ buff silently — the DEF channel is live (2026-08-10)', () => {
    const r = structuralCheck(
      'liter',
      minimal({
        burst: [
          block({
            target: { kind: 'enemy' },
            effects: [{ kind: 'buff', stat: 'defPct', value: -20.25 }],
          }),
        ],
      }),
      CTX
    );
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('still warns on an enemy ATK ▼ buff (no channel) and on defPct at exactly 0', () => {
    const r = structuralCheck(
      'liter',
      minimal({
        burst: [
          block({
            target: { kind: 'enemy' },
            effects: [
              { kind: 'buff', stat: 'atkPct', value: -9.09 },
              { kind: 'buff', stat: 'defPct', value: 0 },
            ],
          }),
        ],
      }),
      CTX
    );
    expect(r.warnings.join('\n')).toMatch(/"atkPct" is DROPPED/);
    expect(r.warnings.join('\n')).toMatch(/defPct at value 0 is DROPPED/);
  });

  it('warns on an allowed enemy stat at a non-positive value', () => {
    const r = structuralCheck(
      'liter',
      minimal({
        burst: [
          block({
            target: { kind: 'enemy' },
            effects: [{ kind: 'buff', stat: 'damageTakenPct', value: -5 }],
          }),
        ],
      }),
      CTX
    );
    expect(r.warnings.join('\n')).toMatch(/non-positive value \(-5\)/);
  });
});

describe('structuralCheck — boss-side stat on an ally-side target (Tier 0 / D2, 2026-08-10)', () => {
  // Live carriers when this landed: moran (allies, damageTakenPct -35.14), rouge
  // (selfAndAdjacent, -15.2), rumani (self, -20.06). All three are kit damage-reduction
  // clauses kept for fidelity; the engine reads damageTakenPct only off the boss (sim.ts:1861).
  it.each([
    ['allies', -35.14],
    ['self', -20.06],
  ])('warns on an ally-side damageTakenPct (target %s)', (kind, value) => {
    const r = structuralCheck(
      'liter',
      minimal({
        burst: [
          block({
            target: { kind },
            effects: [{ kind: 'buff', stat: 'damageTakenPct', value }],
          }),
        ],
      }),
      CTX
    );
    expect(r.errors).toEqual([]);
    expect(r.warnings.join('\n')).toMatch(
      /BOSS-SIDE stat on an ally-side target/
    );
  });

  it('does NOT warn on an ally-side defPct — 28 overrides carry ordinary DEF ▲ kit lines', () => {
    const r = structuralCheck(
      'liter',
      minimal({
        skill2: [
          block({ effects: [{ kind: 'buff', stat: 'defPct', value: 30 }] }),
        ],
      }),
      CTX
    );
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('does NOT warn on an ally-side distributedDamagePct — the unit-side read is live (sim.ts:1868)', () => {
    const r = structuralCheck(
      'liter',
      minimal({
        skill1: [
          block({
            effects: [
              { kind: 'buff', stat: 'distributedDamagePct', value: 24.3 },
            ],
          }),
        ],
      }),
      CTX
    );
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('catches a boss-side stat nested inside escalating steps', () => {
    const r = structuralCheck(
      'liter',
      minimal({
        skill1: [
          block({
            effects: [
              {
                kind: 'escalating',
                steps: [{ kind: 'buff', stat: 'damageTakenPct', value: -10 }],
              },
            ],
          }),
        ],
      }),
      CTX
    );
    expect(r.warnings.join('\n')).toMatch(
      /BOSS-SIDE stat on an ally-side target/
    );
  });
});

describe('structuralCheck — same-unit status order warning (audit F2.5)', () => {
  it('warns when one unit both produces and consumes the same status name', () => {
    const r = structuralCheck(
      'liter',
      minimal({
        skill1: [
          block({
            requiresTargetStatus: 'Calling Card',
            target: { kind: 'enemy' },
            effects: [{ kind: 'flatDamage', atkPct: 84.33 }],
          }),
          block({
            target: { kind: 'enemy' },
            effects: [
              { kind: 'targetStatus', name: 'Calling Card', durationSec: 5 },
            ],
          }),
        ],
      }),
      CTX
    );
    expect(r.errors).toEqual([]);
    const msg = r.warnings.join('\n');
    expect(msg).toMatch(
      /status "Calling Card": produced .* AND consumed .* ORDER .* load-bearing/
    );
    // and it names the ORDER SHIPPED, not just the fact of a pair — this is phantom's shape, where
    // the gate sits first and the inflicting shot does not itself benefit
    expect(msg).toMatch(
      /reads skill1\[0\] → writes skill1\[1\] \(the gate misses that frame\)/
    );
  });

  it('warns on the resource family too, naming the same-slot order', () => {
    const r = structuralCheck(
      'liter',
      minimal({
        skill2: [
          block({ effects: [{ kind: 'resource', name: 'coin', delta: 1 }] }),
          block({ resourceGate: { name: 'coin', min: 3 } }),
        ],
      }),
      CTX
    );
    expect(r.errors).toEqual([]);
    expect(r.warnings.join('\n')).toMatch(
      /resource "coin": adjusted \(skill2\[0\]\) AND gated \(skill2\[1\]\) .* writes skill2\[0\] → reads skill2\[1\]/
    );
  });

  it('says so plainly when the pair is cross-slot only (order fixed by the flatten order)', () => {
    const r = structuralCheck(
      'liter',
      minimal({
        skill1: [block({ requiresTargetStatus: 'Hacked' })],
        burst: [
          block({
            target: { kind: 'enemy' },
            effects: [{ kind: 'targetStatus', name: 'Hacked', durationSec: 5 }],
          }),
        ],
      }),
      CTX
    );
    expect(r.errors).toEqual([]);
    expect(r.warnings.join('\n')).toMatch(
      /status "Hacked": .* cross-slot only, so the ORDER is fixed by the slot flatten order/
    );
  });
});

describe('structuralCheck — prose line-citation warning (audit F1/0.3)', () => {
  it('warns on a bare sim.ts:<line> citation in note or caveats', () => {
    const r = structuralCheck(
      'liter',
      minimal({
        note: 'the drop happens at sim.ts:2295 as documented',
        caveats: ['see types.ts:54 for the clamp'],
      }),
      CTX
    );
    expect(r.errors).toEqual([]);
    const msg = r.warnings.join('\n');
    expect(msg).toMatch(/note: bare line-number citation/);
    expect(msg).toMatch(/sim\.ts:2295/);
    expect(msg).toMatch(/caveats\[0\]/);
  });

  it('does not warn on a named-code-block citation', () => {
    const r = structuralCheck(
      'liter',
      minimal({ note: 'the charge-frames clamp in sim.ts governs this' }),
      CTX
    );
    expect(r.warnings).toEqual([]);
  });
});

describe('structuralCheck — teamHas facets', () => {
  it('rejects an unknown facet and an unknown slug', () => {
    const r = structuralCheck(
      'liter',
      minimal({
        skill1: [
          block({ teamHas: { elment: 'Water' } }),
          block({ teamHas: { slugs: ['not-a-unit'] } }),
        ],
      }),
      CTX
    );
    expect(r.errors.join('\n')).toMatch(/unknown teamHas facet "elment"/);
    expect(r.errors.join('\n')).toMatch(/"not-a-unit" is not a character slug/);
  });

  it('rejects sameSquad on a unit with no curated squad, accepts it on a mapped one', () => {
    const bad = structuralCheck(
      'liter',
      minimal({ skill1: [block({ teamHas: { sameSquad: true } })] }),
      CTX
    );
    expect(bad.errors.join('\n')).toMatch(/no curated squad/);
    const good = structuralCheck(
      'blanc',
      minimal({ skill1: [block({ teamHas: { sameSquad: true } })] }),
      CTX
    );
    expect(good.errors).toEqual([]);
  });
});

describe('targetStatusCensus — cross-slug names (audit F2.2)', () => {
  const producer = (name: string) =>
    minimal({
      skill1: [
        block({
          target: { kind: 'enemy' },
          effects: [{ kind: 'targetStatus', name, durationSec: 10 }],
        }),
      ],
    });
  const consumer = (name: string) =>
    minimal({
      burst: [block({ requiresTargetStatus: name })],
    });

  it('passes an exactly-matched producer/consumer pair silently', () => {
    const r = targetStatusCensus(
      new Map([
        ['a-unit', producer('Wipe Out')],
        ['b-unit', consumer('Wipe Out')],
      ])
    );
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('errors on a case-mismatched consumer (the silent-typo gate)', () => {
    const r = targetStatusCensus(
      new Map([
        ['a-unit', producer('Wipe Out')],
        ['b-unit', consumer('wipe out')],
      ])
    );
    expect(r.errors.join('\n')).toMatch(/nearly matches "Wipe Out"/);
    expect(r.errors.join('\n')).toMatch(/NEVER opens/);
  });

  it('warns (not errors) on a consumer with no producer anywhere — future-gated stays authorable', () => {
    const r = targetStatusCensus(
      new Map([['rei-unit', consumer('Anti A.T. Field')]])
    );
    expect(r.errors).toEqual([]);
    expect(r.warnings.join('\n')).toMatch(/"Anti A\.T\. Field" .* no producer/);
  });

  it('sees a producer nested inside escalating steps', () => {
    const nested = minimal({
      skill1: [
        block({
          target: { kind: 'enemy' },
          effects: [
            {
              kind: 'escalating',
              steps: [{ kind: 'targetStatus', name: 'Marked', durationSec: 5 }],
            },
          ],
        }),
      ],
    });
    const r = targetStatusCensus(
      new Map([
        ['a-unit', nested],
        ['b-unit', consumer('Marked')],
      ])
    );
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });
});

describe('structuralCheck — selfStatus placement + fullCharge trigger (2026-08-24 primitives)', () => {
  it('accepts a fullCharge-trigger block (the kind is a first-class TRIGGERS member)', () => {
    const r = structuralCheck(
      'liter',
      minimal({ skill1: [block({ trigger: { kind: 'fullCharge' } })] }),
      CTX
    );
    expect(r.errors).toEqual([]);
  });

  it('rejects a selfStatus effect on an enemy-targeted block — it would apply to nobody', () => {
    const r = structuralCheck(
      'liter',
      minimal({
        burst: [
          block({
            slot: 'burst',
            trigger: { kind: 'burstCast' },
            target: { kind: 'enemy' },
            effects: [
              { kind: 'selfStatus', name: 'Test Mode', durationSec: 9 },
            ],
          }),
        ],
      }),
      CTX
    );
    expect(r.errors.join('\n')).toMatch(
      /selfStatus effect must sit on a block with an ally-side target/
    );
  });

  it('accepts the asuka-wille shape: selfStatus on self, requiresSelfStatus consumer in another slot', () => {
    const r = structuralCheck(
      'liter',
      minimal({
        skill1: [
          block({
            trigger: { kind: 'hitCount', count: 10 },
            target: { kind: 'enemy' },
            requiresSelfStatus: 'Test Mode',
            effects: [{ kind: 'flatDamage', atkPct: 15.62 }],
          }),
        ],
        burst: [
          block({
            slot: 'burst',
            trigger: { kind: 'burstCast' },
            target: { kind: 'self' },
            effects: [
              { kind: 'selfStatus', name: 'Test Mode', durationSec: 9 },
            ],
          }),
        ],
      }),
      CTX
    );
    expect(r.errors).toEqual([]);
  });

  it('warns with the shipped order on a same-slot selfStatus producer/consumer pair', () => {
    const r = structuralCheck(
      'liter',
      minimal({
        skill1: [
          block({
            requiresSelfStatus: 'Test Mode',
            effects: [{ kind: 'buff', stat: 'atkPct', value: 10 }],
          }),
          block({
            target: { kind: 'self' },
            effects: [
              { kind: 'selfStatus', name: 'Test Mode', durationSec: 9 },
            ],
          }),
        ],
      }),
      CTX
    );
    expect(r.errors).toEqual([]);
    expect(r.warnings.join('\n')).toMatch(
      /self-status "Test Mode": produced .* AND consumed .* ORDER .* load-bearing/
    );
  });
});

describe('targetStatusCensus — selfStatus same-unit rule (2026-08-24)', () => {
  const selfProducer = (name: string) =>
    minimal({
      burst: [
        block({
          slot: 'burst',
          trigger: { kind: 'burstCast' },
          target: { kind: 'self' },
          effects: [{ kind: 'selfStatus', name, durationSec: 9 }],
        }),
      ],
    });
  const selfConsumer = (name: string) =>
    minimal({
      skill1: [
        block({
          trigger: { kind: 'hitCount', count: 10 },
          target: { kind: 'enemy' },
          requiresSelfStatus: name,
          effects: [{ kind: 'flatDamage', atkPct: 10 }],
        }),
      ],
    });
  const both = (name: string) => {
    const o = selfConsumer(name);
    (o as any).burst = (selfProducer(name) as any).burst;
    return o;
  };

  it('errors on a requiresSelfStatus gate with no same-unit producer of the exact name', () => {
    const r = targetStatusCensus(new Map([['a-unit', selfConsumer('Mode A')]]));
    expect(r.errors.join('\n')).toMatch(
      /a-unit: requiresSelfStatus "Mode A" .* no selfStatus producer in this unit's own override/
    );
  });

  it('a producer in a DIFFERENT unit does not satisfy the same-unit rule', () => {
    const r = targetStatusCensus(
      new Map([
        ['a-unit', selfConsumer('Mode A')],
        ['b-unit', selfProducer('Mode A')],
      ])
    );
    expect(r.errors.join('\n')).toMatch(/a-unit: requiresSelfStatus "Mode A"/);
  });

  it('passes when the same unit produces and consumes the exact name', () => {
    const r = targetStatusCensus(new Map([['a-unit', both('Mode A')]]));
    expect(r.errors).toEqual([]);
  });
});

describe('structuralCheck — levelScale / levelConst annotations', () => {
  const withEffect = (eff: Record<string, unknown>) =>
    minimal({
      skill1: [
        {
          slot: 'skill1',
          trigger: { kind: 'passive' },
          target: { kind: 'self' },
          effects: [eff],
        },
      ],
    });
  const CTX_LV = {
    ...CTX,
    levelArrays: {
      skill1: [
        Array(10)
          .fill(0)
          .map((_, i) => 5 + i),
      ], // varying, max 14
      skill2: [],
      burst: [],
    },
  };

  it('does not CRASH on levelScale: null — typeof null is "object"', () => {
    // Object.entries(null) throws; an unguarded null took the whole validation gate down with a
    // stack trace instead of reporting a structural error.
    const run = () =>
      structuralCheck(
        'liter',
        withEffect({
          kind: 'buff',
          stat: 'atkPct',
          value: 14,
          levelScale: null,
        }),
        CTX_LV
      );
    expect(run).not.toThrow();
    expect(run().errors.join()).toMatch(/must be an object mapping field/);
  });

  it('accepts a resolvable anchor', () => {
    const r = structuralCheck(
      'liter',
      withEffect({
        kind: 'buff',
        stat: 'atkPct',
        value: 28,
        levelScale: { value: [14] },
      }),
      CTX_LV
    );
    expect(r.errors).toEqual([]);
  });

  it('rejects an anchor that is not a max-level entry', () => {
    const r = structuralCheck(
      'liter',
      withEffect({
        kind: 'buff',
        stat: 'atkPct',
        value: 28,
        levelScale: { value: [999] },
      }),
      CTX_LV
    );
    expect(r.errors.join()).toMatch(/anchor 999 is not a max-level value/);
  });

  it('rejects levelScale on a field the scaler never reads', () => {
    // `heal.ticks` is on no scaling path — the annotation would be a silent no-op.
    const r = structuralCheck(
      'liter',
      withEffect({ kind: 'heal', ticks: 14, levelScale: { ticks: [14] } }),
      CTX_LV
    );
    expect(r.errors.join()).toMatch(/not a field the scaler substitutes/);
  });

  it('rejects a levelConst naming a non-scalable field', () => {
    const r = structuralCheck(
      'liter',
      withEffect({
        kind: 'buff',
        stat: 'atkPct',
        value: 14,
        levelConst: ['bogusField'],
      }),
      CTX_LV
    );
    expect(r.errors.join()).toMatch(/marking it constant does nothing/);
  });

  it('accepts levelConst on perResource.mult (a dotted field path)', () => {
    const r = structuralCheck(
      'liter',
      withEffect({
        kind: 'buff',
        stat: 'atkPct',
        value: 0,
        perResource: { name: 'x', mult: 14 },
        levelConst: ['perResource.mult'],
      }),
      CTX_LV
    );
    expect(r.errors).toEqual([]);
  });
});
