// block-order-guard.test.ts — the guard for same-frame BLOCK ORDER (faithfulness audit F2.5).
//
// The hazard: where one unit both WRITES and READS the same status or resource inside a single
// slot array, the gate is evaluated at trigger time and the effect written at apply time, so two
// blocks firing on the same frame resolve by their position in the flat block array
// (src/skills/index.ts `SLOTS.flatMap`). Reordering them flips the unit's behaviour and NOTHING
// noticed: no engine error, no validator error, and the graded comps only catch it if that unit
// happens to sit in one. Two overrides say so in their own prose — phantom depends on
// gate-before-inflict (her first shot misses Calling Card) and d-killer-wife on inflict-before-gate
// ("BLOCK ORDER IS LOAD-BEARING … do not reorder").
//
// So the census is pinned. A reorder now fails here, with the fixture diff naming the unit.
// Regenerate deliberately, never to make this green:
//   npx tsx scripts/lint-target-status.ts --update-block-order
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  blockOrderCensus,
  blockOrderPairs,
} from '../../src/skills/validate-structural.js';

const OVERRIDES_DIR = new URL('../../src/skills/overrides/', import.meta.url);
const FIXTURE = new URL('./fixtures/block-order-pairs.json', import.meta.url);

function loadOverrides(): Map<string, any> {
  const out = new Map<string, any>();
  for (const f of readdirSync(OVERRIDES_DIR)) {
    if (f.endsWith('.json')) {
      out.set(
        f.replace(/\.json$/, ''),
        JSON.parse(readFileSync(new URL(f, OVERRIDES_DIR), 'utf8'))
      );
    }
  }
  return out;
}

const pinned = JSON.parse(readFileSync(FIXTURE, 'utf8')).pairs as Record<
  string,
  any[]
>;

function block(overrides: Record<string, unknown> = {}) {
  return {
    trigger: { kind: 'shotFired' },
    target: { kind: 'self' },
    effects: [{ kind: 'buff', stat: 'atkPct', value: 10 }],
    ...overrides,
  };
}
const inflict = (name: string) =>
  block({
    target: { kind: 'enemy' },
    effects: [{ kind: 'targetStatus', name, durationSec: 5 }],
  });
const gate = (name: string) => block({ requiresTargetStatus: name });
const earn = (name: string) =>
  block({ effects: [{ kind: 'resource', name, delta: 1 }] });
const spendGate = (name: string) => block({ resourceGate: { name, min: 3 } });

describe('blockOrderPairs — the primitive', () => {
  it('reads producer-first, and flips to consumer-first when the two are swapped', () => {
    const forward = blockOrderPairs({
      skill1: [inflict('Wipe Out'), gate('Wipe Out')],
    });
    expect(forward).toEqual([
      {
        slot: 'skill1',
        family: 'status',
        name: 'Wipe Out',
        producer: 0,
        consumer: 1,
        order: 'producer-first',
      },
    ]);
    // The mutation the guard exists to catch.
    const swapped = blockOrderPairs({
      skill1: [gate('Wipe Out'), inflict('Wipe Out')],
    });
    expect(swapped[0].order).toBe('consumer-first');
    expect(swapped).not.toEqual(forward);
  });

  it('records a block that writes and reads the same name as same-block', () => {
    const pairs = blockOrderPairs({
      skill2: [
        block({
          resourceGate: { name: 'coin', min: 2 },
          effects: [{ kind: 'resource', name: 'coin', delta: -2 }],
        }),
      ],
    });
    expect(pairs).toEqual([
      {
        slot: 'skill2',
        family: 'resource',
        name: 'coin',
        producer: 0,
        consumer: 0,
        order: 'same-block',
      },
    ]);
  });

  it('covers the resource family and every same-slot pair, not just the first', () => {
    const pairs = blockOrderPairs({
      skill1: [earn('ghost'), spendGate('ghost'), spendGate('ghost')],
    });
    expect(pairs.map((p) => [p.producer, p.consumer, p.order])).toEqual([
      [0, 1, 'producer-first'],
      [0, 2, 'producer-first'],
    ]);
  });

  it('excludes cross-slot pairs — the slot flatten order fixes those', () => {
    expect(
      blockOrderPairs({ skill1: [gate('Hacked')], burst: [inflict('Hacked')] })
    ).toEqual([]);
  });

  it('sees a producer nested inside escalating steps', () => {
    const nested = block({
      target: { kind: 'enemy' },
      effects: [
        {
          kind: 'escalating',
          steps: [{ kind: 'targetStatus', name: 'Hacked', durationSec: 5 }],
        },
      ],
    });
    expect(blockOrderPairs({ skill1: [nested, gate('Hacked')] })).toHaveLength(
      1
    );
  });

  it('does not pair different names, or a producer with no consumer', () => {
    expect(
      blockOrderPairs({ skill1: [inflict('Wipe Out'), gate('Calling Card')] })
    ).toEqual([]);
    expect(blockOrderPairs({ skill1: [inflict('Wipe Out')] })).toEqual([]);
  });
});

describe('block-order guard — the shipped overrides', () => {
  const live = blockOrderCensus(loadOverrides());

  it('matches the pinned fixture', () => {
    // A failure here is a REORDER, not a formatting drift: read the diff, confirm the unit still
    // behaves as its note claims, then regenerate with --update-block-order.
    expect(live).toEqual(pinned);
  });

  it('pins the two documented dependents in the direction their prose claims', () => {
    // phantom: the gate sits FIRST, so the shot that inflicts Calling Card does not yet benefit.
    expect(live.phantom.find((p) => p.name === 'Calling Card')?.order).toBe(
      'consumer-first'
    );
    // d-killer-wife: the burst inflicts 'Wipe Out' and a LATER block in the same array reads it on
    // the same frame — her caveat's "do not reorder".
    expect(
      live['d-killer-wife'].find((p) => p.name === 'Wipe Out')?.order
    ).toBe('producer-first');
  });

  it('is NOT vacuous — reordering a shipped pair changes the census', () => {
    // Mutation check on the real file, so a fixture that silently stopped reflecting the overrides
    // cannot pass the parity test above by matching nothing.
    const mutated = loadOverrides();
    const dkw = structuredClone(mutated.get('d-killer-wife'));
    [dkw.burst[0], dkw.burst[1]] = [dkw.burst[1], dkw.burst[0]];
    mutated.set('d-killer-wife', dkw);
    const after = blockOrderCensus(mutated);
    expect(after).not.toEqual(pinned);
    expect(after['d-killer-wife'][0].order).toBe('consumer-first');
  });

  it('pins the census size, so a unit dropping out of it is loud too', () => {
    const units = Object.keys(pinned).length;
    const pairs = Object.values(pinned).reduce((n, p) => n + p.length, 0);
    expect([units, pairs]).toEqual([15, 144]);
  });
});
