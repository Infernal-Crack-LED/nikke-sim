// Regenerate data/gauge-per-shot.json from the committed data/characters.json.
//
// `src/data/sync.ts` already writes this file as part of a full sync, but a sync needs DB
// credentials and rewrites the whole roster. This script does the gauge table ALONE, offline, from
// what is already committed — which is what you want when the generator's rules change, when an
// override is added, or when `scripts/tests/data/gauge-per-shot-generated.test.ts` goes red and you
// want to see the diff before deciding whether the artifact or the generator is wrong.
//
//   npx tsx scripts/gen-gauge-per-shot.ts            # write the file
//   npx tsx scripts/gen-gauge-per-shot.ts --check    # exit 1 if the committed file is stale
//   npx tsx scripts/gen-gauge-per-shot.ts --diff     # show what would change, write nothing
import { readFileSync } from 'node:fs';
import { buildGaugePerShot } from '../src/data/gauge-per-shot-gen.js';
import { writeJsonArtifact } from '../src/data/json-artifact.js';

const CHARS = new URL('../data/characters.json', import.meta.url);
const OUT = new URL('../data/gauge-per-shot.json', import.meta.url);

type Row = Record<string, unknown>;

const characters = (
  JSON.parse(readFileSync(CHARS, 'utf8')) as {
    characters: Record<string, never>;
  }
).characters;
const generated = buildGaugePerShot(characters) as unknown as Record<
  string,
  Row
>;
const committed = JSON.parse(readFileSync(OUT, 'utf8')) as Record<string, Row>;

const FIELDS = [
  'basePerTrigger',
  'targetPerTrigger',
  'fullChargeBonus',
  'flatPerTrigger',
  'baseGaugeProb',
] as const;

const added: string[] = [];
const removed: string[] = [];
const changed: string[] = [];
for (const slug of [
  ...new Set([...Object.keys(committed), ...Object.keys(generated)]),
].sort()) {
  const a = committed[slug];
  const b = generated[slug];
  if (!a) {
    added.push(slug);
    continue;
  }
  if (!b) {
    removed.push(slug);
    continue;
  }
  for (const f of FIELDS) {
    if ((a[f] ?? null) !== (b[f] ?? null)) {
      changed.push(
        `${slug}.${f}: ${String(a[f] ?? '—')} → ${String(b[f] ?? '—')}`
      );
    }
  }
}

const stale = added.length + removed.length + changed.length > 0;
const mode = process.argv.includes('--check')
  ? 'check'
  : process.argv.includes('--diff')
    ? 'diff'
    : 'write';

if (mode !== 'write' || stale) {
  console.log(
    `rows: committed ${Object.keys(committed).length} → generated ${Object.keys(generated).length}`
  );
  console.log(
    `added ${added.length} · removed ${removed.length} · value changes ${changed.length}`
  );
  if (removed.length) {
    console.log(
      `REMOVED (a generator must not drop rows): ${removed.join(', ')}`
    );
  }
  for (const line of changed) {
    console.log(`  ${line}`);
  }
  if (added.length) {
    console.log(`  added: ${added.join(', ')}`);
  }
}

if (mode === 'check') {
  if (stale) {
    console.error(
      '\ndata/gauge-per-shot.json is STALE — run `npx tsx scripts/gen-gauge-per-shot.ts`.'
    );
    process.exit(1);
  }
  console.log('data/gauge-per-shot.json is up to date.');
} else if (mode === 'write') {
  await writeJsonArtifact(OUT, generated);
  console.log(
    stale
      ? 'data/gauge-per-shot.json rewritten.'
      : 'no change (already up to date).'
  );
}
