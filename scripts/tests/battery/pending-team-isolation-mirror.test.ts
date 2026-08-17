// Pins PENDING_TEAM_ISOLATION_MIRROR in fb-count-matrix.ts against the engine source text.
//
// auditFocusColumns() carries a local copy of the engine's PENDING_TEAM_ISOLATION set
// (sim.ts). If the engine set changes (a new unit is added or vesti-tactical-upgrade is
// removed), the mirror silently diverges and the audit's classification of "pending team
// isolation" units becomes wrong. This test reads the engine source text and asserts the
// two sets are identical.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PENDING_TEAM_ISOLATION_MIRROR } from '../../battery/fb-count-matrix.js';

function extractEngineSet(): Set<string> {
  const src = readFileSync('src/engine/sim.ts', 'utf-8');
  const match = src.match(
    /PENDING_TEAM_ISOLATION\s*=\s*new\s+Set\(\[([^\]]*)\]\)/
  );
  if (!match) {
    throw new Error(
      'PENDING_TEAM_ISOLATION set not found in sim.ts — the regex needs updating'
    );
  }
  const entries = match[1]
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
  return new Set(entries);
}

describe('PENDING_TEAM_ISOLATION_MIRROR stays in sync with engine', () => {
  it('mirror matches the engine source set', () => {
    const engine = extractEngineSet();
    const mirror = PENDING_TEAM_ISOLATION_MIRROR;

    const engineOnly = [...engine].filter((s) => !mirror.has(s));
    const mirrorOnly = [...mirror].filter((s) => !engine.has(s));

    expect(engineOnly, `in engine but not mirror: ${engineOnly}`).toEqual([]);
    expect(mirrorOnly, `in mirror but not engine: ${mirrorOnly}`).toEqual([]);
  });
});
