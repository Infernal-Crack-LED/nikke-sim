import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['scripts/kit-autonomy/blind/delta.adapted.test.ts'],
    environment: 'node',
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
});
