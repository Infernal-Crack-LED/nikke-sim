// Item-5 test (perf plan 2026-07-24): cross-run sim cache. A team's sim depends
// only on (cfg, loadout, loadouts) — not blocked/meta/synergy — so a process-level
// bundle keyed by those lets a fresh makeCalc reuse every prior sim (re-clicking,
// tweaking locks, toggling shaping). `cache:'none'` (default) stays per-instance so
// the CLI/tests are hermetic. It only READS the engine.
//
// Sim reuse is counted via a loadoutFor that tallies resolutions (5 per uncached
// sim). Each test uses a UNIQUE cfg (distinct bossDef) so the module-level bundle
// store doesn't leak between tests. Correctness (shared === none) is asserted too.
import { describe, expect, it } from 'vitest';
import { makeCalc } from '../../../src/teamcalc.js';
import { fastCfg } from '../lib/fast-cfg.js';
import { deps, generatorPool, mult } from '../lib/harness.js';

const { chars, overrides } = generatorPool();

let calls = 0;
const mk = (cache: 'shared' | 'none', bossDef: number) =>
  makeCalc({
    chars: chars as any,
    mult,
    deps: { overrides, ...deps },
    // unique cfg per test → its own bundle; bossDef doesn't change legality.
    // Shorter fight for the cache-semantics tests: they assert reuse counts and
    // byte parity, not absolute team quality.
    cfg: fastCfg([], null, { bossDef }) as any,
    loadoutFor: () => {
      calls++;
      return {};
    },
    cache,
  });

describe('shared cross-run sim cache (item 5)', () => {
  it('a second shared calc reuses the first calc’s sims (0 re-sims) and matches it', async () => {
    const a = await mk('shared', 1001).bestTeam();
    expect(a).not.toBeNull();
    calls = 0;
    const b = await mk('shared', 1001).bestTeam(); // fresh instance, same cfg
    expect(calls, 'shared re-run re-simmed instead of reusing the bundle').toBe(
      0
    );
    expect(b).toEqual(a); // correctness: reuse is not stale
  });

  it('cache:none does NOT share — a second calc re-sims from cold', async () => {
    await mk('none', 1002).bestTeam();
    calls = 0;
    await mk('none', 1002).bestTeam();
    expect(
      calls,
      'default cache leaked across instances (not hermetic)'
    ).toBeGreaterThan(0);
  });

  it('a different cfg gets its own bundle (no cross-config reuse)', async () => {
    await mk('shared', 1003).bestTeam();
    calls = 0;
    await mk('shared', 2003).bestTeam(); // different bossDef → different bundle
    expect(
      calls,
      'a different cfg wrongly reused another cfg’s sims'
    ).toBeGreaterThan(0);
  });

  it('shared and none produce the identical bestTeam', async () => {
    const s = await mk('shared', 1004).bestTeam();
    const n = await mk('none', 1004).bestTeam();
    expect(s).toEqual(n);
  });
});
