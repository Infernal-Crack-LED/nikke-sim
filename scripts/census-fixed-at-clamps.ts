// census-fixed-at-clamps.ts — every kit line that FIXES a value, against the encoding that makes
// it actually fixed. Axis 4 of the phase-4 TAIL
// (docs/handoffs/2026-08-11-faithfulness-tail-plan.md §4.3) and phase-4 checklist item 7.
//
//   npx tsx scripts/census-fixed-at-clamps.ts            # the worklist
//   npx tsx scripts/census-fixed-at-clamps.ts --all      # every carrier, with its encoding
//   npx tsx scripts/census-fixed-at-clamps.ts --skipped  # what this census could NOT see
//   npx tsx scripts/census-fixed-at-clamps.ts --json     # machine-readable rows
//   npx tsx scripts/census-fixed-at-clamps.ts --check    # exit 1 on an unencoded fixing line
//
// WHY THIS EXISTS. "Reload speed is fixed at a 95% increase", "Charge time is fixed at 1.8 sec",
// "Pellet count is fixed at 1" are not ordinary buffs: they OVERRIDE the additive stack rather than
// adding to it. Encoding one as a plain additive buff is the specific error the checklist names —
// it reads correct at the nominal value and silently drifts the moment any other buff touches the
// same stat, which is exactly when a fixing line is supposed to bite.
//
// The engine has purpose-built StatKeys for this (`src/skills/types.ts`): `reloadSpeedClamp`,
// `reloadTimeClamp`, `chargeTimeClamp`. This census asks one question per fixing line: does the
// carrier encode it with the machinery that actually clamps?
//
// THE EQUIVALENCE THAT MAKES THIS NON-TRIVIAL — and the reason a naive "does the file contain a
// clamp key" grep produces a false positive. A weapon-swap that sets its own charge time is
// ALREADY buff-immune: `sim.ts:3711-3714` forces `chargeSpeedPct` to 0 whenever
// `u.swap?.chargeFrames != null`, so `chargeTimeSec` on a swap yields the fixed value with no
// clamp needed. `maxwell-ordinary-mechanic` encodes all five of her Overcurrent-staged "Charge
// Time is fixed at X" values that way and is CORRECT. `nayuta` needs both fields precisely because
// hers differ — the swap weapon charges in 2.13s and the kit fixes it at 1.8 — which is what a
// clamp is for. So the accepted encodings are per-family, not a single key.
//
// WHAT IT CANNOT SEE — printed by `--skipped`, never silently swallowed:
//   * Whether the VALUE is right. A clamp at the wrong number reads as clean here.
//   * Fixing lines for stats with no clamp primitive at all. Those are a gap in the schema, not in
//     the override, and this census reports them as `unclassified` rather than as failures.
//   * "Cannot be removed" — that is buff-persistence boilerplate on hundreds of lines, not a
//     fixing clause, and matching it would bury the worklist.
//
// Self-validating fixture: scripts/tests/census-fixed-at-clamps.test.ts pins the family
// classification, the swap equivalence, the "Fixed Damage" false positive, and the roster result.
import { readFileSync, readdirSync } from 'node:fs';

import { auditableLines } from './census-kit-numbers.js';
import { blocks, coverage } from './census-unmodeled-entries.js';

const ROOT = new URL('../', import.meta.url);
const OVERRIDES_DIR = new URL('src/skills/overrides/', ROOT);
const CHARACTERS = new URL('data/characters.json', ROOT);

const SLOTS = ['skill1', 'skill2', 'burst'] as const;
type Slot = (typeof SLOTS)[number];

/**
 * A line that FIXES a value.
 *
 * The VERB form is load-bearing and was missing from the first cut: `snow-white-heavy-arms` writes
 * "Fixes charge time at 3.2 sec continuously" — no "is fixed", no "fixed at" — so she was
 * invisible to this census while carrying a `chargeTimeClamp`. That hole was found only by the
 * converse check below (a clamp with no fixing line behind it), which is why that check exists
 * rather than being an afterthought: a census cannot validate its own recall.
 *
 * `Fixed Damage` is excluded by the family classifier rather than here: it is a DAMAGE TYPE
 * (`emilia`: "Deals Fixed Damage to the main body equal to 58.99% …"), not a clamp, and it is the
 * one collision this wording has roster-wide.
 */
export const FIXING_LINE =
  /\bis fixed\b|\bfixed at\b|\bfixes\b[^.]*\bat\b|\bfixed\.?$/i;

export type Family = 'reload' | 'charge' | 'pellet' | 'unclassified';

/**
 * Which clamp family a fixing line belongs to — derived from the SUBJECT of the sentence, since
 * that is what decides which primitive can express it.
 */
export function family(line: string, blockContext = ''): Family {
  if (/fixed damage/i.test(line)) {
    return 'unclassified';
  }
  // The line first, then the '■' block it sits in. Kit text states the subject once and then
  // enumerates: `maxwell-ordinary-mechanic` writes "Charge Time is fixed. …" and follows it with
  // five bare "Stage 3: Fixed at 2 sec." lines, none of which names what is being fixed. Judging
  // those on their own text alone drops five real fixing lines into `unclassified`.
  for (const text of [line, blockContext]) {
    if (/reload/i.test(text)) {
      return 'reload';
    }
    if (/charge time/i.test(text)) {
      return 'charge';
    }
    if (/pellet/i.test(text)) {
      return 'pellet';
    }
  }
  return 'unclassified';
}

/**
 * The encodings that genuinely fix a value, per family. More than one is legitimate (see the
 * equivalence note in the header), so this is a set membership test, not a single required key.
 */
export const ACCEPTED_ENCODINGS: Record<Family, string[]> = {
  reload: ['reloadSpeedClamp', 'reloadTimeClamp'],
  // `chargeTimeSec` counts ONLY inside a weaponSwap, which is the only place it appears.
  charge: ['chargeTimeClamp', 'chargeTimeSec'],
  pellet: ['pelletFraction', 'pelletCountFlat'],
  unclassified: [],
};

export interface Finding {
  slug: string;
  slot: Slot;
  line: string;
  family: Family;
  encodedWith: string[];
  /** The line is filed under `unmodeled` — dispositioned, not missing. */
  recordedUnmodeled: boolean;
  ok: boolean;
}

/**
 * Is this fixing line filed under `unmodeled`?
 *
 * A clamp is not the only correct outcome. `liberalio`'s "Gentle Current: Fixes charge time at 1
 * sec" triggers on a Full Charge against "a Rapture that is NOT the stage target" — impossible
 * against a single boss, so it can never fire and is deliberately recorded rather than encoded.
 * Reporting it as a missing clamp would demand an encoding for a line that must not have one.
 *
 * The 2026-08-11 owner ruling makes `unmodeled` the authoritative index of what the model skips,
 * so every census in this family has to honour it the same way — otherwise each axis invents its
 * own definition of "accounted for" and they disagree on the same unit.
 */
export function recordedAsUnmodeled(
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
  overrideRaw: string
): Finding[] {
  const out: Finding[] = [];
  for (const slot of SLOTS) {
    const kit = skills[slot] ?? '';
    const blockOf = (line: string) =>
      blocks(kit).find((b) => b.includes(line)) ?? '';
    for (const line of auditableLines(kit)) {
      if (!FIXING_LINE.test(line)) {
        continue;
      }
      const fam = family(line, blockOf(line));
      const encodedWith = ACCEPTED_ENCODINGS[fam].filter((k) =>
        overrideRaw.includes(`"${k}"`)
      );
      const recordedUnmodeled = recordedAsUnmodeled(
        line,
        JSON.parse(overrideRaw) as Record<string, unknown>
      );
      out.push({
        slug,
        slot,
        line,
        family: fam,
        encodedWith,
        recordedUnmodeled,
        // An unclassified line has no primitive that could express it, so it is reported for a
        // human rather than judged — calling it a failure would be blaming the override for a
        // schema gap.
        ok:
          fam === 'unclassified' || encodedWith.length > 0 || recordedUnmodeled,
      });
    }
  }
  return out;
}

/**
 * The CONVERSE check, and the reason this census can be trusted at all: an override that carries a
 * clamp primitive whose kit prints no fixing line this census recognises.
 *
 * Every "does X reach Y" census can only report on what its matcher SEES, so its recall is
 * invisible from the inside — a phrasing it misses looks exactly like a roster with nothing to
 * find. Here the clamp keys are an INDEPENDENT list of units that must have a fixing line, so
 * running the matcher against them measures recall directly. It immediately paid: it is what
 * exposed `snow-white-heavy-arms`'s "Fixes charge time at 3.2 sec" verb phrasing.
 */
export function clampsWithoutLine(
  findings: Finding[]
): Array<{ slug: string; key: string }> {
  const out: Array<{ slug: string; key: string }> = [];
  const familyOfKey = (key: string): Family =>
    (Object.keys(ACCEPTED_ENCODINGS) as Family[]).find((f) =>
      ACCEPTED_ENCODINGS[f].includes(key)
    )!;
  for (const file of readdirSync(OVERRIDES_DIR).sort()) {
    if (!file.endsWith('.json')) {
      continue;
    }
    const slug = file.replace(/\.json$/, '');
    const raw = readFileSync(new URL(file, OVERRIDES_DIR), 'utf8');
    // `chargeTimeSec` is excluded: it is a weapon-swap's ordinary charge time and most carriers
    // are not fixing anything, so it would report the whole swap roster as a hole.
    for (const key of [
      'reloadSpeedClamp',
      'reloadTimeClamp',
      'chargeTimeClamp',
    ]) {
      if (!raw.includes(`"${key}"`)) {
        continue;
      }
      const fam = familyOfKey(key);
      if (!findings.some((f) => f.slug === slug && f.family === fam)) {
        out.push({ slug, key });
      }
    }
  }
  return out;
}

export function census(): Finding[] {
  const characters = JSON.parse(readFileSync(CHARACTERS, 'utf8')).characters as
    Record<string, { skills?: Record<string, string> }> | undefined;
  const out: Finding[] = [];
  for (const file of readdirSync(OVERRIDES_DIR).sort()) {
    if (!file.endsWith('.json')) {
      continue;
    }
    const slug = file.replace(/\.json$/, '');
    const skills = characters?.[slug]?.skills;
    if (!skills) {
      continue;
    }
    out.push(
      ...auditUnit(
        slug,
        skills,
        readFileSync(new URL(file, OVERRIDES_DIR), 'utf8')
      )
    );
  }
  return out;
}

function main(): void {
  const argv = process.argv.slice(2);
  const known = new Set(['--all', '--skipped', '--json', '--check']);
  const unknown = argv.filter((a) => !known.has(a));
  if (unknown.length > 0) {
    console.error(
      `census-fixed-at-clamps: unrecognised argument(s): ${unknown.join(', ')}\n` +
        `expected any of: ${[...known].join(' ')}`
    );
    process.exit(2);
  }

  const rows = census();
  if (argv.includes('--json')) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  if (argv.includes('--skipped')) {
    console.log('WHAT THIS CENSUS COULD NOT SEE');
    console.log(
      '  whether the clamp VALUE is right — a clamp at the wrong number reads as clean'
    );
    console.log(
      '  fixing lines for stats with NO clamp primitive: reported `unclassified`, never failed —\n' +
        '  that is a schema gap, not an override defect'
    );
    console.log(
      '  "cannot be removed" — buff-persistence boilerplate on hundreds of lines, not a fixing clause'
    );
    const unc = rows.filter((r) => r.family === 'unclassified');
    console.log(`  ${unc.length} unclassified fixing line(s):`);
    for (const r of unc) {
      console.log(`      ${r.slug} ${r.slot}: ${r.line.slice(0, 88)}`);
    }
    return;
  }

  const bad = rows.filter((r) => !r.ok);
  console.log(
    `UNENCODED — the kit fixes a value and the override has no clamp for it (${bad.length}):`
  );
  for (const r of bad) {
    console.log(
      `  ${r.slug.padEnd(28)} ${r.slot.padEnd(7)} [${r.family}] ${r.line.slice(0, 80)}`
    );
  }
  if (bad.length === 0) {
    console.log('  (none)');
  }

  const recorded = rows.filter(
    (r) => r.recordedUnmodeled && r.encodedWith.length === 0
  );
  console.log(
    `\nRECORDED, NOT ENCODED — filed under \`unmodeled\` instead of clamped (${recorded.length}):`
  );
  for (const r of recorded) {
    console.log(
      `  ${r.slug.padEnd(28)} ${r.slot.padEnd(7)} [${r.family}] ${r.line.slice(0, 74)}`
    );
  }
  if (recorded.length === 0) {
    console.log('  (none)');
  }

  const orphans = clampsWithoutLine(rows);
  console.log(
    `\nRECALL CHECK — a clamp whose kit prints no fixing line this census recognises (${orphans.length}):`
  );
  for (const o of orphans) {
    console.log(`  ${o.slug.padEnd(28)} ${o.key}`);
  }
  if (orphans.length === 0) {
    console.log('  (none — every clamp carrier has a matched fixing line)');
  }

  if (argv.includes('--all')) {
    console.log('\nALL FIXING LINES:');
    for (const r of rows) {
      console.log(
        `  ${r.ok ? '✓' : '✗'} ${r.slug.padEnd(28)} ${r.slot.padEnd(7)} [${r.family}] ` +
          `${r.encodedWith.join(',') || '—'}  ${r.line.slice(0, 60)}`
      );
    }
  }

  const byFamily = (f: Family) => rows.filter((r) => r.family === f).length;
  console.log(
    `\n${rows.length} fixing line(s) across ${new Set(rows.map((r) => r.slug)).size} unit(s) · ` +
      `reload ${byFamily('reload')} / charge ${byFamily('charge')} / pellet ${byFamily('pellet')} / ` +
      `unclassified ${byFamily('unclassified')}`
  );
  console.log(
    'A clean row means a clamp primitive is PRESENT — never that its value is right. ' +
      'Run --skipped for what this census cannot see.'
  );

  if (argv.includes('--check')) {
    if (bad.length > 0) {
      console.error(
        `\n${bad.length} fixing line(s) with no clamp encoding — a "fixed at" value encoded as an ` +
          'ordinary additive buff drifts as soon as any other buff touches the same stat.'
      );
      process.exitCode = 1;
    }
    if (orphans.length > 0) {
      console.error(
        `\n${orphans.length} clamp(s) with no recognised fixing line — either the kit phrasing is ` +
          'one this matcher misses (widen FIXING_LINE) or the clamp has no kit basis. Both matter.'
      );
      process.exitCode = 1;
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split('/').pop()!)
) {
  main();
}
