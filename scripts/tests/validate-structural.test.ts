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

describe('structuralCheck — chargeCounter still-bypassed fields (audit F2.1)', () => {
  it('errors when a chargeCounter block carries everyN or delaySec (still not routed)', () => {
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
    const msg = r.errors.join('\n');
    expect(msg).toMatch(/chargeCounter dispatch/);
    expect(msg).toMatch(/everyN, delaySec/);
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
  it('warns on an enemy DEF ▼ buff (dropped at dispatch)', () => {
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
    expect(r.warnings.join('\n')).toMatch(
      /enemy-targeted buff "defPct" is DROPPED/
    );
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
    expect(r.warnings.join('\n')).toMatch(
      /status "Calling Card": produced .* AND consumed .* ORDER .* load-bearing/
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
