// census-kit-quantities.ts — the NON-percent quantities a kit prints (durations, round counts,
// stack caps, trigger counts) against the typed fields that carry them. Axis 3 of the phase-4 TAIL
// (docs/handoffs/2026-08-11-faithfulness-tail-plan.md §4.2).
//
//   npx tsx scripts/census-kit-quantities.ts            # the worklist
//   npx tsx scripts/census-kit-quantities.ts --all      # every quantity, accounted or not
//   npx tsx scripts/census-kit-quantities.ts --graded   # the 45 board-graded units
//   npx tsx scripts/census-kit-quantities.ts --tail     # units with no board reading
//   npx tsx scripts/census-kit-quantities.ts --skipped  # what this census could NOT see
//   npx tsx scripts/census-kit-quantities.ts --json     # machine-readable rows
//
// ⚠ STATUS: DECLINED AS A WORKLIST GENERATOR (2026-08-11). Committed as the EVIDENCE for that
// verdict, and so the axis is not rebuilt on the premise this run disproved. Three findings, in
// increasing order of how decisive they are:
//
//   1. It fails the tail's calibration rule — 8.0% of graded-slice quantities read unaccounted vs
//      2.2% of tail ones. Firing ~3x harder on units the sweep already read line-by-line means it
//      is measuring authoring style, not defects: CONSOLIDATION and time-averaging are what a
//      careful review produces (`dorothy-serendipity`'s 5 round-count lines fold into one
//      `consolidation` block; `nayuta` folds two riders into one), and they read as missing here.
//   2. Its recall is poor — 456 numeric kit lines match no pattern at all, against 924 parsed
//      quantities. A worklist from a matcher with that coverage cannot support a claim in either
//      direction.
//   3. THE PREMISE WAS WRONG. The tail plan justified this axis as "the tier that held the
//      `d-killer-wife` round-count defect". Replaying it against her pre-fix override (`git show
//      ae0010d6^`) reads CLEAN — because that line was correctly filed under `unmodeled` the whole
//      time, with a reasoned annotation. The 2026-08-11 change was a DISPOSITION change: the
//      Pierce tag turned out to feed the Damage-Up bucket, so an inert-looking line became worth
//      modeling. The quantity was accounted for before and after, so no accounting census could
//      ever have caught it. That defect class is a MODELING JUDGEMENT, reachable only by the
//      per-unit read.
//
// WHY IT WAS PROPOSED. Axis 1 audits percent MAGNITUDES and is explicitly blind to everything else
// — "for 10 sec", "for 3 round(s)", "stacks up to 5 time(s)", "after 12 normal attack(s)". The
// reasoning was that a buff with the wrong WINDOW is wrong for the whole fight even when its
// magnitude is perfect, which is true — but "wrong window" is not the same failure as "window
// absent", and only the second is mechanically detectable. See the STATUS block above.
//
// WHY IT IS TYPED, AND WHY A PRESENCE CHECK WOULD BE WORTHLESS HERE. Axis 1 measured the collision
// problem directly: 281 of 282 integer magnitudes appear somewhere in their override by accident,
// colliding with a duration, a stack cap or a trigger count. Non-percent quantities are integers
// almost by definition and they are SMALL (1, 3, 5, 10), so "does this digit appear in the file"
// answers yes for everything. The only version of this axis worth running matches a quantity
// against the FIELD that is supposed to hold it: a duration must land in `durationSec`, a round
// count in `durationShots`, a stack cap in `maxStacks`, a trigger count in the `hitCount` trigger.
//
// WHAT COUNTS AS ACCOUNTED — the same definition as every other tail census, deliberately:
//   1. the typed field carries the value, or
//   2. a known EQUIVALENT encoding carries it (a heal-over-time writes ticks × intervalSec, not
//      durationSec; a `dot` carries its own durationSec), or
//   3. the line is filed under `unmodeled` (the 2026-08-11 owner ruling makes that authoritative).
// Letting each axis invent its own definition of "accounted for" is how two censuses end up
// disagreeing about the same unit.
//
// WHAT IT CANNOT SEE — printed by `--skipped`, never silently swallowed:
//   * Whether the window is applied to the RIGHT effect. A `durationSec: 10` on the wrong buff
//     reads as clean.
//   * Continuous/passive lines that correctly carry no duration at all — they print no quantity,
//     so they are out of scope rather than counted as clean.
//   * Any quantity whose phrasing this matcher does not recognise. The `--skipped` count of
//     unparsed numeric lines is the honest measure of that, and it is reported every run.
import { readFileSync, readdirSync } from 'node:fs';

import { auditableLines } from './census-kit-numbers.js';
import { coverage } from './census-unmodeled-entries.js';

const ROOT = new URL('../', import.meta.url);
const OVERRIDES_DIR = new URL('src/skills/overrides/', ROOT);
const CHARACTERS = new URL('data/characters.json', ROOT);
const KIT_STATUS = new URL('data/kit-status.json', ROOT);

const SLOTS = ['skill1', 'skill2', 'burst'] as const;
type Slot = (typeof SLOTS)[number];

export type QuantityKind = 'duration' | 'rounds' | 'stacks' | 'hitCount';

/** How each kit phrasing is written, and which fields are allowed to carry it. */
export const PATTERNS: Array<{
  kind: QuantityKind;
  re: RegExp;
  fields: string[];
}> = [
  {
    kind: 'duration',
    re: /\bfor (\d+(?:\.\d+)?) sec\b/gi,
    // `ticks` is admitted because a heal-over-time expresses "for N sec" as N one-second recovery
    // events (ticks:N, intervalSec default 1) and never writes durationSec at all.
    fields: ['durationSec', 'ticks'],
  },
  {
    kind: 'rounds',
    re: /\bfor (\d+) round\(s\)/gi,
    fields: ['durationShots'],
  },
  {
    kind: 'stacks',
    re: /\bstacks? up to (\d+) time\(s\)/gi,
    fields: ['maxStacks'],
  },
  {
    kind: 'hitCount',
    re: /\bafter (?:landing )?(\d+) normal attack\(s\)/gi,
    fields: ['count', 'hitCount'],
  },
];

export interface Finding {
  slug: string;
  slot: Slot;
  kind: QuantityKind;
  value: number;
  line: string;
  accounted: boolean;
  via: string;
}

/** Every value the override stores under any of `fields`, anywhere in the file. */
export function valuesOf(node: unknown, fields: string[]): Set<number> {
  const out = new Set<number>();
  const walk = (x: unknown): void => {
    if (Array.isArray(x)) {
      x.forEach(walk);
      return;
    }
    if (x && typeof x === 'object') {
      for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
        if (fields.includes(k) && typeof v === 'number') {
          out.add(v);
        }
        walk(v);
      }
    }
  };
  walk(node);
  return out;
}

function recordedUnmodeled(
  line: string,
  override: Record<string, unknown>
): boolean {
  const unmodeled = (override.unmodeled ?? {}) as Record<
    string,
    string[] | undefined
  >;
  return Object.values(unmodeled)
    .flatMap((v) => v ?? [])
    .some((entry) => coverage(line, entry) >= 0.8);
}

export function auditUnit(
  slug: string,
  skills: Record<string, string | undefined>,
  override: Record<string, unknown>
): { findings: Finding[]; unparsedNumericLines: number } {
  const findings: Finding[] = [];
  let unparsedNumericLines = 0;

  for (const slot of SLOTS) {
    for (const line of auditableLines(skills[slot] ?? '')) {
      let matchedAny = false;
      for (const p of PATTERNS) {
        for (const m of line.matchAll(p.re)) {
          matchedAny = true;
          const value = Number(m[1]);
          const stored = valuesOf(override, p.fields);
          let accounted = stored.has(value);
          let via = accounted ? p.fields.join('|') : '';
          if (!accounted && recordedUnmodeled(line, override)) {
            accounted = true;
            via = 'unmodeled';
          }
          findings.push({
            slug,
            slot,
            kind: p.kind,
            value,
            line,
            accounted,
            via,
          });
        }
      }
      // Loudness: a line carrying a bare number that no pattern claimed. This is the census's own
      // recall, and it is the number to read before trusting a clean worklist.
      if (!matchedAny && /\d/.test(line) && !/%/.test(line)) {
        unparsedNumericLines++;
      }
    }
  }
  return { findings, unparsedNumericLines };
}

export function census(): {
  findings: Finding[];
  graded: Set<string>;
  unparsedNumericLines: number;
} {
  const characters = JSON.parse(readFileSync(CHARACTERS, 'utf8')).characters as
    Record<string, { skills?: Record<string, string> }> | undefined;
  const status = JSON.parse(readFileSync(KIT_STATUS, 'utf8')).units as Record<
    string,
    { board?: unknown }
  >;
  const findings: Finding[] = [];
  const graded = new Set<string>();
  let unparsedNumericLines = 0;

  for (const file of readdirSync(OVERRIDES_DIR).sort()) {
    if (!file.endsWith('.json')) {
      continue;
    }
    const slug = file.replace(/\.json$/, '');
    const skills = characters?.[slug]?.skills;
    if (!skills) {
      continue;
    }
    if (status[slug]?.board) {
      graded.add(slug);
    }
    const r = auditUnit(
      slug,
      skills,
      JSON.parse(readFileSync(new URL(file, OVERRIDES_DIR), 'utf8'))
    );
    findings.push(...r.findings);
    unparsedNumericLines += r.unparsedNumericLines;
  }
  return { findings, graded, unparsedNumericLines };
}

function main(): void {
  const argv = process.argv.slice(2);
  const known = new Set(['--all', '--graded', '--tail', '--skipped', '--json']);
  const unknown = argv.filter((a) => !known.has(a));
  if (unknown.length > 0) {
    console.error(
      `census-kit-quantities: unrecognised argument(s): ${unknown.join(', ')}\n` +
        `expected any of: ${[...known].join(' ')}`
    );
    process.exit(2);
  }

  const { findings: all, graded, unparsedNumericLines } = census();
  const findings = argv.includes('--graded')
    ? all.filter((f) => graded.has(f.slug))
    : argv.includes('--tail')
      ? all.filter((f) => !graded.has(f.slug))
      : all;

  if (argv.includes('--json')) {
    console.log(JSON.stringify(findings, null, 2));
    return;
  }

  if (argv.includes('--skipped')) {
    console.log('WHAT THIS CENSUS COULD NOT SEE');
    console.log(
      `  ${unparsedNumericLines} kit line(s) carry a non-percent number that no pattern claimed — ` +
        'this census’s own recall, and the number to read before trusting a clean worklist'
    );
    console.log(
      '  whether a window is applied to the RIGHT effect — a durationSec on the wrong buff is clean here'
    );
    console.log(
      '  continuous/passive lines that correctly carry no duration: they print no quantity at all'
    );
    return;
  }

  const bad = findings.filter((f) => !f.accounted);
  const byUnit = new Map<string, Finding[]>();
  for (const f of bad) {
    byUnit.set(f.slug, [...(byUnit.get(f.slug) ?? []), f]);
  }

  console.log(
    `UNACCOUNTED — the kit prints this quantity and no typed field carries it (${bad.length}):`
  );
  for (const [slug, fs] of [...byUnit].sort()) {
    console.log(`  ${slug}${graded.has(slug) ? '  [graded]' : ''}`);
    for (const f of fs) {
      console.log(
        `      ${f.slot.padEnd(6)} ${f.kind.padEnd(9)} ${String(f.value).padEnd(5)} ${f.line.slice(0, 74)}`
      );
    }
  }
  if (bad.length === 0) {
    console.log('  (none)');
  }

  if (argv.includes('--all')) {
    console.log('\nALL QUANTITIES:');
    for (const f of findings) {
      console.log(
        `  ${f.accounted ? '✓' : '✗'} ${f.slug.padEnd(26)} ${f.kind.padEnd(9)} ${String(f.value).padEnd(5)} ${f.via}`
      );
    }
  }

  const rate = (only: (f: Finding) => boolean) => {
    const set = all.filter(only);
    return set.length === 0
      ? '—'
      : `${set.filter((f) => !f.accounted).length}/${set.length}`;
  };
  console.log(
    `\n${findings.length} quantit(ies) across ${new Set(findings.map((f) => f.slug)).size} unit(s) · ` +
      `unaccounted ${bad.length}`
  );
  console.log(
    `CALIBRATION vs the sweep-read graded slice: graded ${rate((f) => graded.has(f.slug))} ` +
      `vs tail ${rate((f) => !graded.has(f.slug))} unaccounted`
  );
  console.log(
    `RECALL: ${unparsedNumericLines} numeric kit line(s) no pattern claimed — run --skipped.`
  );
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split('/').pop()!)
) {
  main();
}
