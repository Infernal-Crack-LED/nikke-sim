// Advisory staleness check for Step 0/1 of the artifact-decoupling plan
// (docs/handoffs/2026-08-03-artifact-store-decoupling-plan.md §5/§8): do the
// artifacts in web/public/ (fetched from the live site by
// fetch-published-boards.ts in PR CI, or built locally) match THIS tree's
// committed inputs?
//
// ADVISORY by owner decision 2026-08-04 — the plan §5 recommendation. A stale
// board NEVER fails CI, because the deploy path makes board staleness
// self-healing: deploy.yml still builds the boards pre-deploy (the HARD gate),
// and the Railway build regenerates them from the merged branch, so a stale
// published set is rebuilt AT deploy time and the deployed site is never
// stale. The board-join tests keep running against whatever is in web/public/
// either way: they are shape/join checks, not engine-vs-artifact value parity,
// so the common stale case (an engine PR) still exercises them meaningfully.
//
// Per-artifact states:
//   FRESH   — embedded inputsHash matches the recomputed bucket hash.
//   STALE   — both hashes present, they differ; names the refresh command.
//   NO-HASH — the artifact predates Step 1 (no embedded inputsHash): not
//             comparable. dpschart has hashed since b71af726; the five rank
//             boards only once a build with this change has deployed.
//
// ol-default.json is the exception that gets a HARD gate elsewhere: it is
// COMMITTED, so its parity test (board-hash-parity.test.ts) fails everywhere —
// a drift there is always locally fixable (rebuild + commit).
//
// Hash recomputation goes through scripts/artifact-input-hash.ts — the SSOT
// the builders share (plan §5: one implementation).
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  computeDpsChartInputHashes,
  computeRanksInputHash,
  computeOlDefaultInputHash,
} from './artifact-input-hash.js';

const short = (v: unknown): string => {
  const s = typeof v === 'string' ? v : '(none)';
  return `${s.slice(0, 12)}…`;
};

const readArtifact = (rel: string): Record<string, unknown> | null => {
  const abs = fileURLToPath(new URL(`../${rel}`, import.meta.url));
  if (!existsSync(abs)) {
    return null;
  }
  return JSON.parse(readFileSync(abs, 'utf8')) as Record<string, unknown>;
};

let stale = false;

// ---- dpschart ---------------------------------------------------------------------

const dpschart = readArtifact('web/public/dpschart.json');
if (dpschart === null) {
  console.log(
    'dpschart: MISSING from web/public/ — not comparable ' +
      '(run scripts/fetch-published-boards.ts or npm run dpschart first)'
  );
} else if (typeof dpschart.inputsHash !== 'string') {
  console.log(
    'dpschart: NO-HASH — artifact predates input hashing; ' +
      'run `npm run dpschart` to make it checkable.'
  );
} else {
  const { globalHash, inputsHash } = computeDpsChartInputHashes();
  if (dpschart.inputsHash === inputsHash) {
    console.log(
      `dpschart: FRESH — matches this tree (inputsHash ${short(inputsHash)})`
    );
  } else {
    stale = true;
    const globalMatch = dpschart.globalHash === globalHash;
    console.log(
      [
        'dpschart: STALE — the published artifact was built from different inputs.',
        `  published inputsHash ${short(dpschart.inputsHash)} / this tree ${short(inputsHash)}`,
        `  global bucket ${globalMatch ? 'MATCHES (per-unit drift only)' : 'differs (engine/global inputs moved)'}`,
      ].join('\n')
    );
  }
}

// ---- the five rank boards (one shared bucket — see artifact-input-hash.ts) --------

const ranksHash = computeRanksInputHash();
const rankBoards = ['burstgen', 'burstcdr', 'sustain', 'bufferchart', 'b1b2dps'];
for (const name of rankBoards) {
  const art = readArtifact(`web/public/${name}.json`);
  if (art === null) {
    console.log(`${name}: MISSING from web/public/ — not comparable`);
    continue;
  }
  if (typeof art.inputsHash !== 'string') {
    console.log(
      `${name}: NO-HASH — published before Step 1 embedded inputsHash ` +
        `(this tree would be ${short(ranksHash)}). Not comparable.`
    );
    continue;
  }
  if (art.inputsHash === ranksHash) {
    console.log(
      `${name}: FRESH — matches this tree (ranks hash ${short(ranksHash)})`
    );
  } else {
    stale = true;
    console.log(
      `${name}: STALE — published ranks hash ${short(art.inputsHash)} / ` +
        `this tree ${short(ranksHash)}`
    );
  }
}

// ---- ol-default (committed — its HARD gate is the parity test) --------------------

const olDefault = readArtifact('web/public/ol-default.json');
if (olDefault === null) {
  console.log(
    'ol-default: MISSING from web/public/ (it is committed — restore it)'
  );
} else {
  const olHash = computeOlDefaultInputHash();
  if (typeof olDefault.inputsHash !== 'string') {
    console.log(
      'ol-default: NO-HASH — committed copy predates Step 1; run ' +
        '`npx tsx scripts/build-ol-default.ts` and commit to make it checkable.'
    );
  } else if (olDefault.inputsHash === olHash) {
    console.log(`ol-default: FRESH — matches this tree (${short(olHash)})`);
  } else {
    stale = true;
    console.log(
      [
        `ol-default: STALE — committed copy hash ${short(olDefault.inputsHash)} / this tree ${short(olHash)}`,
        '  Fix: npx tsx scripts/build-ol-default.ts && commit the result.',
      ].join('\n')
    );
  }
}

// Infographics are not fetched in CI (PR CI still renders them in the artifacts
// tier), so there is nothing stale to check — their inputsHash lands in
// dist/img/manifest.json as provenance for plan Step 3.

if (stale) {
  console.log(
    [
      'board-freshness: advisory only — this never fails CI. The deploy path rebuilds',
      'the boards from the merged branch (deploy.yml pre-deploy + the Railway build).',
      '  To build the boards locally instead: npm run dpschart && npm run ranks:all',
    ].join('\n')
  );
}
process.exit(0);
