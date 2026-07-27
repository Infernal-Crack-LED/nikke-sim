// Static invariant: src/infographics/core/** must stay platform-free — no
// @napi-rs/canvas, no sharp, no imports of the Node host (../node/**). This is
// what keeps @napi-rs/canvas out of the web bundle AND keeps the
// fonts-before-draw ordering guarantee honest (node/render.ts is the only
// module that imports node/fonts.ts, as its first statement). Mirrors the
// eslint `no-restricted-imports` override in eslint.config.mjs — this test
// catches the violation even if eslint isn't run.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';

const CORE_DIR = new URL('../../../src/infographics/core/', import.meta.url);
const IMPORT_RE = /(?:import|export)[^'"]*from\s*['"]([^'"]+)['"]/g;
const BANNED = [/^@napi-rs\/canvas/, /^sharp(\/|$)/, /^\.\.\/node(\/|$)/];

describe('infographics core/ platform boundary', () => {
  const files = readdirSync(CORE_DIR).filter((f) => f.endsWith('.ts'));
  it('core/ exists and is non-empty', () => {
    expect(files.length).toBeGreaterThan(0);
  });
  for (const file of files) {
    it(`${file} imports no Node-only module`, () => {
      const src = readFileSync(new URL(file, CORE_DIR), 'utf8');
      const specifiers = [...src.matchAll(IMPORT_RE)].map((m) => m[1]);
      const bad = specifiers.filter((s) => BANNED.some((re) => re.test(s)));
      expect(bad, `${file} must not import: ${bad.join(', ')}`).toEqual([]);
    });
  }
});
