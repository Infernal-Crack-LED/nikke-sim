// Meta-parity guard for the three per-route head tables (the lockstep rule of
// docs/frontend-conventions.md §6.3): the client head sync
// (web/src/useDocumentHead.ts META), the deployed server
// (src/server/static.ts TAB_META), and the legacy mirror
// (scripts/serve.mjs TAB_META) must carry IDENTICAL titles/descriptions per
// route key. The 2026-08-11 drift
// (docs/handoffs/closed/2026-08-11-meta-table-drift.md) happened because
// single-table edits went unenforced; this test is the enforcement. A new
// route must be added to ALL THREE tables; a reword must land in all three.
import { describe, expect, it } from 'vitest';
import { META } from '../../../web/src/useDocumentHead.js';
import { TAB_META as STATIC_META } from '../../../src/server/static.js';
import { TAB_META as LEGACY_META } from '../../serve.mjs';

// The servers' tables also carry derived `unit/<slug>` keys (added at module
// load from data/characters.json); the client deliberately has none —
// UnitPage sets its own head so the dataset stays out of the eager chunk.
// Route keys are the '/'-free ones.
const routeKeys = (table: Record<string, { title: string }>) =>
  Object.keys(table)
    .filter((k) => !k.includes('/'))
    .sort();

describe('per-route head meta parity across the three lockstep tables', () => {
  const clientKeys = routeKeys(META);
  const staticKeys = routeKeys(STATIC_META);
  const legacyKeys = routeKeys(LEGACY_META);

  it('all three tables carry the same route key set', () => {
    // A key present on one table and missing on another is exactly the
    // /characters gap of the 2026-08-11 drift — fail on set difference, not
    // just on the intersection.
    expect(staticKeys).toEqual(clientKeys);
    expect(legacyKeys).toEqual(clientKeys);
  });

  it('title + description agree across all three tables per route', () => {
    const drifted: string[] = [];
    for (const key of clientKeys) {
      const client = META[key];
      const deployed = STATIC_META[key];
      const legacy = LEGACY_META[key];
      if (!deployed || !legacy) {
        continue; // reported by the key-set assertion above
      }
      if (deployed.title !== client.title) {
        drifted.push(`${key}.title — static.ts vs useDocumentHead.ts`);
      }
      if (deployed.desc !== client.description) {
        drifted.push(`${key}.desc — static.ts vs useDocumentHead.ts`);
      }
      if (legacy.title !== client.title) {
        drifted.push(`${key}.title — serve.mjs vs useDocumentHead.ts`);
      }
      if (legacy.desc !== client.description) {
        drifted.push(`${key}.desc — serve.mjs vs useDocumentHead.ts`);
      }
    }
    expect(drifted).toEqual([]);
  });

  it('the two servers agree on the derived unit/<slug> meta', () => {
    const unitKeys = Object.keys(STATIC_META)
      .filter((k) => k.startsWith('unit/'))
      .sort();
    expect(unitKeys.length).toBeGreaterThan(0);
    expect(
      Object.keys(LEGACY_META)
        .filter((k) => k.startsWith('unit/'))
        .sort()
    ).toEqual(unitKeys);
    const drifted: string[] = [];
    for (const key of unitKeys) {
      const deployed = STATIC_META[key];
      const legacy = LEGACY_META[key];
      if (deployed.title !== legacy.title) {
        drifted.push(`${key}.title`);
      }
      if (deployed.desc !== legacy.desc) {
        drifted.push(`${key}.desc`);
      }
    }
    expect(drifted).toEqual([]);
  });

  it('route + unit/<slug> keys partition each table completely', () => {
    // A key that is neither '/'-free (route) nor unit/<slug> would be checked
    // by NONE of the assertions above — assert the partition is total so an
    // unclassified key fails loudly here instead of drifting silently. The
    // client table is in the loop too: it carries no '/'-bearing keys today
    // and a future one would be unreachable dead config worth flagging.
    const unclassified: string[] = [];
    for (const [name, table] of [
      ['useDocumentHead.ts', META],
      ['static.ts', STATIC_META],
      ['serve.mjs', LEGACY_META],
    ] as const) {
      for (const key of Object.keys(table)) {
        if (key.includes('/') && !key.startsWith('unit/')) {
          unclassified.push(`${name}: ${key}`);
        }
      }
    }
    expect(unclassified).toEqual([]);
  });
});
