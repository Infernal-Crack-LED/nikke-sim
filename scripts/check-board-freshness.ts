// Advisory staleness check for Step 0 of the artifact-decoupling plan
// (docs/handoffs/2026-08-03-artifact-store-decoupling-plan.md §5/§8): does the
// PUBLISHED dpschart artifact (fetched into web/public/ by
// fetch-published-boards.ts) match THIS tree's committed inputs?
//
// ADVISORY by owner decision 2026-08-04 — the plan §5 recommendation. A stale
// artifact NEVER fails CI, because the deploy path makes the staleness
// self-healing: deploy.yml still builds the boards pre-deploy (the HARD gate),
// and the Railway build regenerates them from the merged branch, so a stale
// published artifact is rebuilt AT deploy time and the deployed site is never
// stale. The board-join tests keep running against the fetched artifact either
// way: they are shape/join checks (slugs ⊆ roster, fixed card geometry,
// rank/index consistency), not engine-vs-artifact value parity, so the common
// stale case (an engine PR) still exercises them meaningfully.
//
// Only dpschart carries input hashes today; the other five boards derive from
// the same engine/data inputs, so dpschart's verdict stands in for the set
// until Step 1 gives every board its own hash.
//
// Recomputes the hash via scripts/artifact-input-hash.ts — the SSOT it shares
// with build-dpschart.ts (plan §5: one implementation).
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { computeDpsChartInputHashes } from './artifact-input-hash.js';

const DPSCHART = fileURLToPath(
  new URL('../web/public/dpschart.json', import.meta.url)
);

if (!existsSync(DPSCHART)) {
  process.stderr.write(
    'board-freshness: no web/public/dpschart.json to compare ' +
      '(run scripts/fetch-published-boards.ts first) — skipping\n'
  );
  process.exit(0);
}

const { globalHash, inputsHash } = computeDpsChartInputHashes();
const published = JSON.parse(readFileSync(DPSCHART, 'utf8')) as {
  inputsHash?: unknown;
  globalHash?: unknown;
};

const short = (v: unknown): string => {
  const s = typeof v === 'string' ? v : '(none)';
  return `${s.slice(0, 12)}…`;
};

if (published.inputsHash === inputsHash) {
  console.log(
    `board-freshness: FRESH — published dpschart matches this tree ` +
      `(inputsHash ${short(inputsHash)})`
  );
  process.exit(0);
}

const globalMatch = published.globalHash === globalHash;
console.log(
  [
    'board-freshness: STALE — the published artifact was built from different inputs.',
    `  published inputsHash ${short(published.inputsHash)} / this tree ${short(inputsHash)}`,
    `  global bucket ${globalMatch ? 'MATCHES (per-unit drift only)' : 'differs (engine/global inputs moved)'}`,
    '  Advisory only — this never fails CI: the deploy path rebuilds the boards from',
    '  the merged branch (deploy.yml pre-deploy + the Railway build). To build the',
    '  boards locally instead: npm run dpschart && npm run ranks:all',
  ].join('\n')
);
process.exit(0);
