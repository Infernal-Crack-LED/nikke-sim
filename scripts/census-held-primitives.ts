// census-held-primitives.ts — the primitives the docs say are HELD or have ZERO carriers, checked
// against what the tree actually contains. Axis 5 of the phase-4 TAIL
// (docs/handoffs/2026-08-11-faithfulness-tail-plan.md §4.4, audit F11).
//
//   npx tsx scripts/census-held-primitives.ts           # the drift report
//   npx tsx scripts/census-held-primitives.ts --json    # machine-readable rows
//   npx tsx scripts/census-held-primitives.ts --check   # exit 1 when a documented status is wrong
//
// WHY THIS EXISTS. F11 holds a list of primitives "logged with carriers, none meeting the build bar
// today", and QUEUE carries matching ENGINE PRIMITIVE GAP entries. Those claims are load-bearing in
// a specific way: a reviewer who hits a kit line needing one of them looks the primitive up, reads
// "not authorized, log another carrier", and records the line as unmodelable — WITHOUT re-checking
// whether it was built since. A stale "gap" therefore manufactures unmodeled entries forever.
//
// That is not hypothetical. `addStack` was carried in this table's first run as the documented
// "two carriers is not yet a mandate; log a third before building. Not authorized" — while the
// effect had ALREADY shipped (`42a642de` "Slice C: addStack effect + flora/k carriers"), was
// implemented at `sim.ts` `case 'addStack'`, and had SEVEN carriers including the very `flora` S1
// the QUEUE entry said it blocked.
//
// The check is deliberately mechanical and narrow: for each named primitive, does the SCHEMA
// declare it, does the ENGINE implement it, and how many overrides carry it? A documented status
// that disagrees with those three facts is the finding. Primitives with no schema key —
// `pascal`'s DEF-ranked ally selector, `grave`'s empty-magazine effect, `trony`'s windowed damage
// accumulator — are NOT auditable this way and are listed as such rather than silently omitted.
import { readFileSync, readdirSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const OVERRIDES_DIR = new URL('src/skills/overrides/', ROOT);
const SIM = new URL('src/engine/sim.ts', ROOT);
const TYPES = new URL('src/skills/types.ts', ROOT);

export type DocStatus =
  | 'live' // built and in use; carriers expected
  | 'zero-carrier' // schema key exists, nothing carries it (collapse-or-keep, bucket-matrix §6)
  | 'gap'; // NOT built — the docs say a kit line needing this is unmodelable

export interface Held {
  /** The schema key or effect-kind string that marks a carrier. */
  key: string;
  status: DocStatus;
  why: string;
}

/**
 * The documented status of each mechanically-detectable primitive, as the docs state it TODAY.
 * This table is the claim under test — when it disagrees with the tree, one of the two is wrong
 * and the census says which.
 */
export const HELD: Held[] = [
  {
    key: 'addStack',
    status: 'live',
    why: 'shipped in 42a642de; QUEUE carried it as an unbuilt GAP until 2026-08-11 while 7 overrides encoded it',
  },
  {
    key: 'hasTrueNormals',
    status: 'zero-carrier',
    why: 'StatKey with no carrier — collapse-or-keep decision, bucket-matrix §6',
  },
  {
    key: 'whileSwapped',
    status: 'zero-carrier',
    why: 'StatKey with no carrier — collapse-or-keep decision, bucket-matrix §6',
  },
  {
    key: 'fireRatePct',
    status: 'zero-carrier',
    why: 'StatKey with no carrier — collapse-or-keep decision, bucket-matrix §6',
  },
  {
    key: 'elementDamagePct',
    status: 'zero-carrier',
    why: 'StatKey with no carrier — collapse-or-keep decision, bucket-matrix §6',
  },
];

/**
 * Held primitives that have NO schema key, so no carrier count can be taken. Named here so the
 * census reports its own blind spot instead of implying F11 is fully covered.
 */
export const UNAUDITABLE = [
  'DEF-ranked ally selector (pascal) — a target selector, not a key',
  'empty-magazine effect + status-end trigger (grave, U19)',
  'windowed damage accumulator (trony) — NO-GO(engine-core) 2026-08-04',
  'MG wind-up-speed modifier (asuka-wille, rei-ayanami)',
  'incoming/outgoing-healing StatKey family — inert without an HP pool',
];

export interface Row {
  key: string;
  documented: DocStatus;
  inSchema: boolean;
  inEngine: boolean;
  carriers: string[];
  actual: DocStatus;
  drifted: boolean;
}

/**
 * What the TREE says a primitive's status is, from the only three facts that decide it.
 *
 * A primitive the engine implements and overrides carry is LIVE, whatever any doc says. With no
 * engine support it is a GAP. Implemented but uncarried is the zero-carrier middle — the
 * collapse-or-keep population.
 */
export function actualStatus(
  inEngine: boolean,
  carrierCount: number
): DocStatus {
  if (!inEngine) {
    return 'gap';
  }
  return carrierCount > 0 ? 'live' : 'zero-carrier';
}

export function census(): Row[] {
  const sim = readFileSync(SIM, 'utf8');
  const types = readFileSync(TYPES, 'utf8');
  const files = readdirSync(OVERRIDES_DIR).filter((f) => f.endsWith('.json'));

  return HELD.map((h) => {
    const carriers = files
      .filter((f) =>
        readFileSync(new URL(f, OVERRIDES_DIR), 'utf8').includes(`"${h.key}"`)
      )
      .map((f) => f.replace(/\.json$/, ''));
    const inSchema = types.includes(`'${h.key}'`) || types.includes(h.key);
    const inEngine = sim.includes(h.key);
    const actual = actualStatus(inEngine, carriers.length);
    return {
      key: h.key,
      documented: h.status,
      inSchema,
      inEngine,
      carriers,
      actual,
      drifted: actual !== h.status,
    };
  });
}

function main(): void {
  const argv = process.argv.slice(2);
  const known = new Set(['--json', '--check']);
  const unknown = argv.filter((a) => !known.has(a));
  if (unknown.length > 0) {
    console.error(
      `census-held-primitives: unrecognised argument(s): ${unknown.join(', ')}\n` +
        `expected any of: ${[...known].join(' ')}`
    );
    process.exit(2);
  }

  const rows = census();
  if (argv.includes('--json')) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  for (const r of rows) {
    console.log(
      `${r.drifted ? '✗' : '✓'} ${r.key.padEnd(20)} documented=${r.documented.padEnd(13)} ` +
        `actual=${r.actual.padEnd(13)} engine=${r.inEngine ? 'yes' : 'NO '} ` +
        `carriers=${r.carriers.length}${r.carriers.length ? ` (${r.carriers.slice(0, 6).join(', ')})` : ''}`
    );
  }

  console.log(
    '\nNOT AUDITABLE BY KEY — no schema key exists, so no carrier count is possible:'
  );
  for (const u of UNAUDITABLE) {
    console.log(`  ${u}`);
  }
  console.log(
    '  ⇒ these still need the per-unit read; this census covers only the keyed primitives.'
  );

  const drifted = rows.filter((r) => r.drifted);
  console.log(
    `\n${rows.length} keyed primitive(s) checked · ${drifted.length} drifted from their documented status`
  );
  if (drifted.length > 0 && argv.includes('--check')) {
    console.error(
      `\n${drifted.length} primitive(s) whose documented status is wrong. A stale "gap" is the ` +
        'expensive direction: a reviewer records kit lines as unmodelable against a primitive that ' +
        'already exists.\n    ' +
        drifted
          .map(
            (r) => `${r.key}: docs say ${r.documented}, tree says ${r.actual}`
          )
          .join('\n    ')
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split('/').pop()!)
) {
  main();
}
