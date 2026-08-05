// Fetch the six published board artifacts from the live site into web/public/ —
// Step 0 of the artifact-decoupling plan
// (docs/handoffs/2026-08-03-artifact-store-decoupling-plan.md §8). PR CI runs
// this INSTEAD of building the boards: the live site already IS the artifact
// store — the same transport build-dpschart.ts's fetchLiveCandidate uses for
// carry-over, just without the rebuild fallback.
//
// Hard-fails after retries when the site is unreachable or serves an invalid
// body: Step 0's premise is that the published artifact is the CI source, and a
// silent fallback-to-build would quietly restore the exact ~8-min cost this
// step removes. Escape hatch if the site is ever down: swap ci.yml's fetch step
// back to `npm run dpschart && npm run ranks:all` (the deploy path still
// builds, so nothing about deploy correctness depends on this script).
//
// Local use: `npx tsx scripts/fetch-published-boards.ts` pulls what production
// serves over whatever web/public/ currently holds.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SITE_ORIGIN = process.env.NIKKESIM_SITE_ORIGIN ?? 'https://nikkesim.app';

// dpschart + the five `npm run ranks:all` boards. ol-default.json is NOT one:
// it belongs to the infographics build (build-ol-default.ts), not the board set.
const BOARDS = [
  'dpschart',
  'burstgen',
  'burstcdr',
  'sustain',
  'bufferchart',
  'b1b2dps',
];

const ATTEMPTS = 3;
const TIMEOUT_MS = 10_000;

async function fetchBoard(name: string): Promise<string> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(`${SITE_ORIGIN}/${name}.json`, {
          signal: ctrl.signal,
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const text = await res.text();
        const parsed: unknown = JSON.parse(text);
        if (parsed === null || typeof parsed !== 'object') {
          throw new Error('body is not a JSON object');
        }
        return text;
      } finally {
        clearTimeout(timer);
      }
    } catch (e) {
      lastError = e;
      if (attempt < ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
  const msg =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `${SITE_ORIGIN}/${name}.json failed after ${ATTEMPTS} attempts: ${msg}`
  );
}

let failed = false;
for (const name of BOARDS) {
  try {
    const text = await fetchBoard(name);
    const out = fileURLToPath(
      new URL(`../web/public/${name}.json`, import.meta.url)
    );
    writeFileSync(out, text);
    process.stderr.write(`fetched ${name}.json (${text.length} B)\n`);
  } catch (e) {
    failed = true;
    process.stderr.write(`FAIL ${(e as Error).message}\n`);
  }
}
if (failed) {
  process.stderr.write(
    'fetch-published-boards: published artifact unavailable — refusing to ' +
      'silently rebuild (see header comment for the escape hatch)\n'
  );
  process.exit(1);
}
