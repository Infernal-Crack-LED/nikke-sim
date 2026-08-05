// Artifact input-hash parity — the HARD half of the artifact-decoupling plan's
// decision 1 (docs/handoffs/2026-08-03-artifact-store-decoupling-plan.md §5):
// an artifact present in web/public/ must have been built from THIS tree's
// inputs, else fail naming the exact refresh command.
//
// Escape hatches, so the gate fires only where it is actionable:
//   - ABSENT board artifact → skip. The boards are gitignored build outputs;
//     fresh-worktree convention (CLAUDE.md constraint 8), same as
//     dpschart-parity.test.ts / unit-card-data.test.ts.
//   - Artifact with NO embedded inputsHash → skip. It predates Step 1 (a
//     published pre-Step-1 board, or the committed ol-default.json before its
//     first post-Step-1 regeneration). check-board-freshness.ts reports these
//     as NO-HASH.
//   - BOARDS_FETCHED=1 + mismatch → skip. ci.yml sets the env when PR CI
//     FETCHES the published boards instead of building them (Step 0): a
//     mismatch then means "published set is stale w.r.t. this branch", which
//     decision 1 rules ADVISORY — the deploy path rebuilds from the merged
//     branch (deploy.yml pre-deploy + the Railway build), so the PR must not
//     block on it. check-board-freshness.ts carries the advisory there.
// Without the env (the deploy gate — deploy.yml builds the boards before
// `verify.sh full` — and any local run after a build), a mismatch fails hard.
//
// ol-default.json is COMMITTED (never fetched, never stale-by-deploy-design),
// so it is always held to the hard gate; its refresh is a local rebuild +
// commit, which is why that one has no advisory escape.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  computeDpsChartInputHashes,
  computeRanksInputHash,
  computeOlDefaultInputHash,
} from '../../artifact-input-hash.js';

const REFRESH_BOARDS =
  'Refresh: npm run dpschart && npm run ranks:all (the deploy path rebuilds ' +
  'boards from the merged branch; this failure means a locally-present ' +
  'artifact disagrees with the tree it sits in).';
const REFRESH_OL_DEFAULT =
  'Refresh: npx tsx scripts/build-ol-default.ts, then commit web/public/ol-default.json.';

const fetched = process.env.BOARDS_FETCHED === '1';

const loadArtifact = (rel: string): Record<string, unknown> | null => {
  const url = new URL(`../../../${rel}`, import.meta.url);
  if (!existsSync(url)) {
    return null;
  }
  return JSON.parse(readFileSync(url, 'utf8')) as Record<string, unknown>;
};

const hasHash = (a: Record<string, unknown> | null): boolean =>
  !!a && typeof a.inputsHash === 'string';

const dpschart = loadArtifact('web/public/dpschart.json');
const dpsExpected = hasHash(dpschart)
  ? computeDpsChartInputHashes().inputsHash
  : '';
const dpsStale = hasHash(dpschart) && dpschart!.inputsHash !== dpsExpected;

const ranksArtifacts = ['burstgen', 'burstcdr', 'sustain', 'bufferchart', 'b1b2dps'].map(
  (name) => ({ name, art: loadArtifact(`web/public/${name}.json`) })
);
const ranksExpected = ranksArtifacts.some(({ art }) => hasHash(art))
  ? computeRanksInputHash()
  : '';

const olDefault = loadArtifact('web/public/ol-default.json');
const olExpected = hasHash(olDefault) ? computeOlDefaultInputHash() : '';

describe('board input-hash parity (artifact-decoupling plan §5 hard gate)', () => {
  it.skipIf(!hasHash(dpschart) || (fetched && dpsStale))(
    'dpschart.json was built from this tree\u2019s inputs',
    () => {
      expect(dpschart!.inputsHash, REFRESH_BOARDS).toBe(dpsExpected);
    }
  );

  for (const { name, art } of ranksArtifacts) {
    const stale = hasHash(art) && art!.inputsHash !== ranksExpected;
    it.skipIf(!hasHash(art) || (fetched && stale))(
      `${name}.json was built from this tree\u2019s inputs`,
      () => {
        expect(art!.inputsHash, REFRESH_BOARDS).toBe(ranksExpected);
      }
    );
  }

  it('ol-default.json exists (committed artifact)', () => {
    expect(
      olDefault,
      'web/public/ol-default.json is COMMITTED — restore it (git checkout).'
    ).not.toBeNull();
  });

  it.skipIf(!hasHash(olDefault))(
    'ol-default.json was built from this tree\u2019s inputs',
    () => {
      expect(olDefault!.inputsHash, REFRESH_OL_DEFAULT).toBe(olExpected);
    }
  );
});
