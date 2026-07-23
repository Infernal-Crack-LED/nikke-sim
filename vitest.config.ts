import { defineConfig } from 'vitest/config';

// Vitest is the faithfulness gate (TDD transition, 2026-07-23): every file under
// scripts/tests/ runs on `npx vitest run`, which verify.sh calls as ONE step. A new test
// file is wired in by existing — no verify.sh edit, which is how the 6 orphaned bespoke
// tests went unwatched for months.
//
// Tests live under scripts/tests/, NEVER under src/engine/ — that is a protected path
// (CLAUDE.md guard), and test authoring must never trip the content guard.
//   scripts/tests/engine/      — engine primitive tests (step 2 backfill)
//   scripts/tests/units/<slug> — per-unit kit specs (step 3, owner-driven)
//   scripts/tests/generators/  — roster/team generator + web-logic tests
//   scripts/tests/lib/         — shared fixtures (harness.ts)
export default defineConfig({
  test: {
    include: ['scripts/tests/**/*.test.ts'],
    environment: 'node',
    // Full-roster generator searches take 30-90s each (generator-lock ~80s); sim fixtures
    // are sub-second. One generous ceiling beats per-file timeout annotations.
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
});
