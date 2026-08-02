import { defineConfig } from 'vitest/config';

// Vitest is the faithfulness gate (TDD transition, 2026-07-23): every file under
// scripts/tests/ runs on `npx vitest run`, which verify.sh calls as ONE step. A new test
// file is wired in by existing — no verify.sh edit, which is how the 6 orphaned bespoke
// tests went unwatched for months.
//
// Tests live under scripts/tests/, NEVER under src/engine/ — that is a protected path
// , and test authoring must never trip the content guard.
//   scripts/tests/engine/      — engine primitive tests (step 2 backfill)
//   scripts/tests/units/<slug> — per-unit kit specs (step 3, owner-driven)
//   scripts/tests/generators/  — roster/team generator + web-logic tests
//   scripts/tests/lib/         — shared fixtures (harness.ts, fast-cfg.ts) + their own tests
//
// Keeping the suite fast: docs/test-speed-gotchas.md (fastCfg for length-independent
// tests, why isolation stays off, which costs are inherent).
export default defineConfig({
  test: {
    include: ['scripts/tests/**/*.test.ts'],
    environment: 'node',
    // Threads + no isolation: files share ONE module registry per worker, so the
    // harness's data loads (characters.json etc.) and the generator files' ~150
    // loadOverride calls happen once per worker instead of once per file (~170×).
    // Safe because the suite is hermetic: harness exports are read-only, override
    // fixtures are deep-cloned before mutation (withPatchedOverride), the process-
    // level sim cache is keyed per cfg and only touched by cache:'shared' users,
    // serve tests bind ephemeral ports, and the lone console.warn spy is restored.
    pool: 'threads',
    isolate: false,
    // Full-roster generator searches take ~10-25s each (generator-lock ~22s); sim
    // fixtures are sub-second. One generous ceiling beats per-file timeout annotations.
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
});
