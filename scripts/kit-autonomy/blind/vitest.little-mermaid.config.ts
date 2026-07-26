import { defineConfig } from 'vitest/config';

// One-off config to run the S5 cross-family BLIND test (little-mermaid.test.ts in this dir)
// against the committed driver override. Mirrors vitest.blind.config.ts (alice). Not part of
// verify.sh.
//   npx vitest run --config scripts/kit-autonomy/blind/vitest.little-mermaid.config.ts
export default defineConfig({
  test: {
    include: ['scripts/kit-autonomy/blind/little-mermaid.test.ts'],
    environment: 'node',
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
});
