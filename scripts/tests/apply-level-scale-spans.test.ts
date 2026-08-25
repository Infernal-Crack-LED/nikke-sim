// objectSpans (scripts/apply-level-scale.ts) — the byte-span scanner the annotation applier uses
// to insert into existing JSON text instead of re-serializing it.
//
// Why this test exists: the applier's FIRST implementation re-serialized whole override files,
// which expanded every compact object and produced ~100-line formatting diffs on protected,
// concurrently-edited files. The byte-span form fixes that, but a mis-keyed span is far worse than
// churn — it would insert an annotation into the WRONG effect, silently mis-scaling a real unit.
// So the scanner is validated against the ENTIRE override corpus, not a synthetic sample: every
// span it reports must slice to text that parses and deep-equals the structure at that path.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { objectSpans } from '../apply-level-scale.js';

const DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../src/skills/overrides'
);
const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));

const at = (root: unknown, path: string[]): unknown =>
  path.reduce<any>((o, k) => (o == null ? o : o[k]), root);

describe('objectSpans — every span round-trips against the real corpus', () => {
  it('covers a non-trivial number of override files', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it.each(files)('%s', (file) => {
    const text = readFileSync(join(DIR, file), 'utf8');
    const parsed = JSON.parse(text);
    const spans = objectSpans(text);
    expect(spans.size).toBeGreaterThan(0);
    for (const [key, [start, end]] of spans) {
      expect(end).toBeGreaterThan(start);
      const path = key.split(' > ').slice(1).filter(Boolean);
      // The slice must be valid JSON and identical to the value living at that path.
      expect(JSON.parse(text.slice(start, end))).toEqual(at(parsed, path));
    }
  });
});

describe('objectSpans — array element indices', () => {
  it('keys an object correctly when it FOLLOWS a scalar in a mixed array', () => {
    // Counting element separators (commas) rather than container opens is what makes this work;
    // an open-counting scanner keys the object as arr > 0.
    const text = '{ "arr": [5, { "a": 1 }, "s", { "b": 2 }] }';
    const spans = objectSpans(text);
    const parsed = JSON.parse(text);
    for (const [key, [start, end]] of spans) {
      const path = key.split(' > ').slice(1).filter(Boolean);
      expect(JSON.parse(text.slice(start, end))).toEqual(at(parsed, path));
    }
    expect(spans.has(' > arr > 1')).toBe(true);
    expect(spans.has(' > arr > 3')).toBe(true);
  });

  it('is not confused by braces or escapes inside strings', () => {
    const text = '{ "note": "a { b } [ c ] \\" d", "e": { "f": 1 } }';
    const spans = objectSpans(text);
    const [start, end] = spans.get(' > e')!;
    expect(JSON.parse(text.slice(start, end))).toEqual({ f: 1 });
  });
});
