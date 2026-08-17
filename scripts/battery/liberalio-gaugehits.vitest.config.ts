// OPT-IN vitest config for the `liberalio` sub-hit gauge-credit arm (2026-08-17).
// Identical to the repo's vitest.config.ts except that every import of
// `src/skills/overrides-node.js` resolves to scripts/battery/liberalio-gaugehits-loader-arm.ts,
// which injects `gaugeHits` at LOAD time (see that file's header for why the in-memory
// `run(comp, patch)` seam is not sufficient for the battery fixtures).
//
// Nothing uses this config unless it is passed explicitly — `npx vitest run` and verify.sh keep
// using vitest.config.ts, so the gate is unchanged.
//
//   npx vitest run --config scripts/battery/liberalio-gaugehits.vitest.config.ts        # pass-through
//   LIB_GAUGEHITS=5 npx vitest run --config scripts/battery/liberalio-gaugehits.vitest.config.ts
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('../..', import.meta.url)),
  resolve: {
    alias: [
      {
        // Matches the WHOLE specifier (every caller writes some `../` prefix) so the
        // replacement substitutes the entire id rather than splicing onto a leftover prefix.
        find: /^.*src\/skills\/overrides-node\.js$/,
        replacement: fileURLToPath(
          new URL('./liberalio-gaugehits-loader-arm.ts', import.meta.url)
        ),
      },
    ],
  },
  test: {
    include: ['scripts/tests/**/*.test.ts'],
    environment: 'node',
    pool: 'threads',
    isolate: false,
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
});
