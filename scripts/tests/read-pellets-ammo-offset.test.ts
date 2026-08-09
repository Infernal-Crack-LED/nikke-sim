/**
 * read-pellets.ts is a CLI entry point (parses argv and exits if no video is given), so it
 * cannot be imported directly in a test. Pin the `--ammo-offset-x` default from the source text
 * instead. commit 5c62a2d (2026-07-29) silently flipped this from the owner-POC-validated +62.5
 * to -62.5 while adding the flag, and nothing caught it — this is the guard against a repeat.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  new URL('../probe/read-pellets.ts', import.meta.url),
  'utf8'
);

describe('read-pellets.ts ammoOffsetXNative default', () => {
  it('defaults to +62.5 native px, not the -62.5 sign-flip from 5c62a2d', () => {
    const match = source.match(
      /ammoOffsetXNative\s*=\s*Number\(flags\['ammo-offset-x'\]\s*\?\?\s*(-?[\d.]+)\)/
    );
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(62.5);
  });
});
