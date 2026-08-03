// The DPS chart links every ranked unit to /unit/:slug. The chart artifact's
// unit map is generated independently of data/characters.json, so a renamed or
// removed character would produce links to real 404s. Pin the invariant here.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const DPSCHART = new URL(
  '../../../web/public/dpschart.json',
  import.meta.url
);
const CHARACTERS = new URL('../../../data/characters.json', import.meta.url);

// Minimal shape of the artifact; keep the test self-contained so it does not
// pull web/src modules into the Node-side typecheck.
interface DpsArtifact {
  units?: Record<string, unknown>;
  cells?: Record<string, [string, number, string | null][]>;
}

const artifactMissing = !existsSync(DPSCHART);
const enforceParity = process.env.DPSCHART_PARITY_FAIL_ON_MISSING === '1';

if (artifactMissing) {
  console.warn(
    'dpschart-parity skipped: web/public/dpschart.json is missing. ' +
      'Run `npm run dpschart` before `npm run test:unit` to enforce this invariant.'
  );
}

describe('dpschart.json is a subset of characters.json', () => {
  // dpschart.json is a gitignored build output. Skip when absent in ordinary
  // test runs, but fail hard when explicitly asked to enforce the invariant
  // (e.g. right after `npm run dpschart` in build:deploy).
  it.skipIf(artifactMissing && !enforceParity)(
    'every unit slug in the artifact exists in characters.json',
    () => {
      if (artifactMissing && enforceParity) {
        throw new Error(
          'dpschart-parity: web/public/dpschart.json is missing. ' +
            'Run `npm run dpschart` first.'
        );
      }
      const artifact = JSON.parse(
        readFileSync(DPSCHART, 'utf8')
      ) as DpsArtifact;
      const characters = JSON.parse(
        readFileSync(CHARACTERS, 'utf8')
      ) as {
        characters?: Record<string, unknown>;
      };
      const roster = new Set(Object.keys(characters.characters ?? {}));

      const slugs = new Set([
        ...Object.keys(artifact.units ?? {}),
        ...Object.values(artifact.cells ?? {}).flatMap((rows) =>
          rows.map(([slug]) => slug)
        ),
      ]);

      expect(slugs.size).toBeGreaterThan(0);
      for (const slug of slugs) {
        expect(roster).toContain(slug);
      }
    }
  );
});
