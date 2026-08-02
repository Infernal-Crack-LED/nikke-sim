import { defineConfig } from 'vitest/config';

// One-off config to run the S5 cross-family BLIND test (biscuit.adapted.test.ts) against the
// committed driver override. Kept separate from the root vitest.config.ts on purpose: the blind
// test is a gauntlet audit artifact, NOT part of the permanent regression gate (verify.sh), which
// watches scripts/tests/** only.
//   npx vitest run --config scripts/kit-autonomy/blind/vitest.biscuit.config.ts
export default defineConfig({
  test: {
    include: ['scripts/kit-autonomy/blind/biscuit.adapted.test.ts'],
    environment: 'node',
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
});
