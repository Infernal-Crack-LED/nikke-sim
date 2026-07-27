import { defineConfig } from 'vitest/config';

// One-off config to run the S5 cross-family BLIND test for diesel-winter-sweets against the
// committed driver override. Mirrors vitest.blind.config.ts (alice). Not part of verify.sh.
//   npx vitest run --config scripts/kit-autonomy/blind/vitest.dws.config.ts
export default defineConfig({
  test: {
    include: [
      'scripts/kit-autonomy/blind/diesel-winter-sweets.adapted.test.ts',
    ],
    environment: 'node',
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
});
