import { defineConfig } from 'vitest/config';

// One-off config to run the S5 cross-family BLIND test (avistar.test.ts in this dir) against the
// committed driver override. Kept separate from the root vitest.config.ts on purpose: the blind
// test is a gauntlet audit artifact, NOT part of the permanent `npx vitest run` regression gate
// (verify.sh), which watches scripts/tests/** only.
//   npx vitest run --config scripts/kit-autonomy/blind/vitest.avistar.config.ts
export default defineConfig({
  test: {
    include: ['scripts/kit-autonomy/blind/avistar.adapted.test.ts'],
    environment: 'node',
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
});
