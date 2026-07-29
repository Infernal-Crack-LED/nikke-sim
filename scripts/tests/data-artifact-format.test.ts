// Pins the invariant that keeps generated JSON reviewable: every GENERATED data/*.json artifact is
// byte-identical to what src/data/json-artifact.ts writes for its own contents.
//
// The failure this guards against is not cosmetic. When a generator picked its own JSON.stringify
// indent and lint-staged's `prettier --write` reformatted it into the commit, a regenerated artifact
// landed as a whole-file rewrite — `npm run sync` on 2026-07-28 produced a 194,406-line diff on
// data/characters.json for two real field changes, which makes reviewing what a sync changed
// impossible and `git log -S` on a data value useless.
//
// A failure here means a generator stopped going through writeJsonArtifact, or an artifact was
// committed through a path that reformatted it. The fix is to rewrite that file through
// writeJsonArtifact — never to relax this test.
//
// HAND-MAINTAINED artifacts are deliberately NOT listed: gauge-per-shot.json, ol-probabilities.json,
// doll-economy.json, doll-super-success.json, cubes.json, reference-stats.json and friends are
// hand-edited (several use blank lines between entries for readability, which no JSON.stringify
// round-trip preserves). They are prettier-clean via the commit hook, which is all they need — they
// have no generator to disagree with. Add a file here when a GENERATOR starts writing it.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { formatJsonArtifact } from '../../src/data/json-artifact.js';

const GENERATED: Array<[file: string, generator: string]> = [
  ['characters.json', 'src/data/sync.ts'],
  ['bossing-tiers.json', 'src/data/sync.ts'],
  ['level-multiplier.json', 'src/data/sync.ts'],
  ['tsareena-build.json', 'src/data/sync.ts'],
  ['skill-levels.json', 'src/data/sync-skill-levels.ts'],
  ['archetype-tags.json', 'scripts/build-archetype-tags.ts'],
  ['kit-status.json', 'scripts/kit-status.ts'],
  ['ol-optimal.json', 'scripts/build-ol-optimal.ts'],
  ['enikk-supported.json', 'scripts/enikk/roster-audit.ts'],
];

const DATA_DIR = new URL('../../data/', import.meta.url);

describe('generated data/*.json is in its generator’s canonical format', () => {
  for (const [file, generator] of GENERATED) {
    it(`${file} (written by ${generator})`, async () => {
      const url = new URL(file, DATA_DIR);
      const committed = readFileSync(url, 'utf8');
      expect(await formatJsonArtifact(url, JSON.parse(committed))).toBe(
        committed
      );
    });
  }
});
