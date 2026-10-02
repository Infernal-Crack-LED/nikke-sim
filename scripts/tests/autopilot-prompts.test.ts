// Pins the new-unit watch's prompt templates (scripts/autopilot/new-unit-watch/) against run.sh's
// placeholder filler. The templates were first committed as .md, and lint-staged's Prettier pass
// rewrote `__UNITS__`-style placeholders into `**UNITS**` emphasis — the job would have handed the
// headless session literal "**NAME**" text. They are .txt now (out of Prettier's globs) with
// `{{KEY}}` placeholders; this test fails if a template uses a key run.sh does not fill, or if any
// mangled `**KEY**` / `__KEY__` remnant reappears.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const DIR = new URL('../autopilot/new-unit-watch/', import.meta.url);
const read = (f: string) => readFileSync(new URL(f, DIR), 'utf8');

const runSh = read('run.sh');
const filled = new Set(
  [
    ...(runSh.match(/for k in \(([^)]*)\)/)?.[1] ?? '').matchAll(/"([A-Z]+)"/g),
  ].map((m) => m[1])
);

describe.each(['prompt-roster.txt', 'prompt-unit.txt'])('%s', (file) => {
  const text = read(file);

  it('run.sh references this template', () => {
    expect(runSh).toContain(`$HOME_DIR/${file}`);
  });

  it('every {{KEY}} placeholder is one run.sh fills', () => {
    const keys = [...text.matchAll(/\{\{([A-Z]+)\}\}/g)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.filter((k) => !filled.has(k))).toEqual([]);
  });

  it('carries no Prettier-mangled or legacy placeholder', () => {
    expect(text).not.toMatch(
      /\*\*(WT|BRANCH|SLUG|NAME|UNITLINE|UNITS|SUMMARY)\*\*/
    );
    expect(text).not.toMatch(
      /__(WT|BRANCH|SLUG|NAME|UNITLINE|UNITS|SUMMARY)__/
    );
  });
});
