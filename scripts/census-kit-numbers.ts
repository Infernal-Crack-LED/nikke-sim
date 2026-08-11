// census-kit-numbers.ts — roster-wide accounting of every MAGNITUDE the kit text prints
// against the override that models the unit. The phase-4 TAIL instrument
// (docs/handoffs/2026-08-11-faithfulness-tail-plan.md).
//
//   npx tsx scripts/census-kit-numbers.ts                 # SILENT findings (the worklist)
//   npx tsx scripts/census-kit-numbers.ts --prose         # + the prose-only tier
//   npx tsx scripts/census-kit-numbers.ts --all           # every unit, both tiers, with counts
//   npx tsx scripts/census-kit-numbers.ts --tail          # restrict to units with no board reading
//   npx tsx scripts/census-kit-numbers.ts --graded        # restrict to the 45 board-graded units
//   npx tsx scripts/census-kit-numbers.ts --skipped       # what the census could NOT see
//   npx tsx scripts/census-kit-numbers.ts --json          # machine-readable rows
//   npx tsx scripts/census-kit-numbers.ts --check         # exit 1 on any SILENT finding
//   npx tsx scripts/census-kit-numbers.ts --explain <slug> # one unit: kit line + prose + encoded values
//
// WHY THIS EXISTS. The faithfulness sweep's per-unit reads (batches 1-8) covered the 45
// board-graded units; the remaining ~140 have no ratio to explain and no comp to check inertness
// against, so a per-unit read buys much less there and costs the same. What a tail unit CAN still
// be caught on, with no board at all, is a kit line the model never actually encodes.
//
// THE ONE QUESTION THIS ASKS — and it is deliberately narrow: WHERE does the digit string the kit
// prints appear in the unit's override file? Two tiers, and the second is the interesting one:
//
//   SILENT     — the magnitude appears nowhere in the file: not in an encoded block, not in
//                `unmodeled`, not in `note`/`caveats` prose. Rare and loud.
//   PROSE-ONLY — it appears ONLY in `note`/`caveats`: the author saw the line, reasoned about it
//                in prose, and then neither encoded it nor filed it under `unmodeled`. The
//                structured record — the half that `kit-status.json` and
//                `gen-unmodeled-review.ts` read, and the half a reviewer greps — does not carry
//                it at all.
//
// WHY THE PROSE-ONLY TIER IS THE WORKLIST (the historical positive control, checked 2026-08-11).
// `red-hood`'s Red Wolf "Charge Speed ▲ 100.8%" was found BY HAND during the M8 pass and turned
// out never to have been modelled — only implied by a swap clamp. Replaying this census against
// her pre-fix override (`git show 94de2eb2^`) puts her squarely in PROSE-ONLY, not SILENT: 100.8
// appears exactly once in that file, inside a `note` sentence arguing about the charge window.
// So the one KNOWN defect of this class would have been caught here — by the prose-only tier. A
// magnitude that a note discusses and no block encodes is the shape of a line that got reasoned
// about and then lost, which is why this tier is worth reading unit by unit even though it is the
// noisier of the two.
//
// WHAT A CLEAN ROW DOES *NOT* MEAN. A present number is not evidence of correct encoding — it may
// sit on the wrong stat, the wrong target, the wrong duration, or in a `note` sentence saying the
// opposite. This census can only ever falsify "the model never saw this line". Every stronger
// claim needs the per-unit read. It is a triage instrument, not a verdict.
//
// CALIBRATION (2026-08-11, the reason to trust the signal). Run against the 45 units the sweep
// already read line-by-line, the SILENT tier fires on exactly ONE line roster-wide — `crown`'s
// heal magnitude, an HP-pool value that is inert by design. A sweep that already found these
// units clean agrees with the census on 44 of 45, which is what makes a hit in the untouched tail
// worth opening a file for. The already-reviewed slice IS the labeled set here (the SUFFICIENCY
// rule): no new ground truth was generated to validate this instrument.
//
// WHAT IT CANNOT SEE — printed by `--skipped`, never silently swallowed:
//   * Non-percent quantities. Durations ("for 10 sec"), round/shot counts ("for 1 shot"), stack
//     caps ("stacks up to 5 time(s)") and ammo counts carry no `%` and are OUT OF SCOPE. A whole
//     class of real defects (`d-killer-wife`'s round-count Pierce) is therefore invisible here.
//   * Purely qualitative lines — "Gain Pierce", "Pellet count is fixed at 1", mode swaps. They
//     print no magnitude, so they cannot be accounted numerically at all.
//   * A magnitude the kit prints and the override encodes in a TRANSFORMED form: split per hit,
//     converted to another unit, folded into a clamp, or time-averaged (the F7 ramp bakes). Those
//     read as accounted whenever the source number also appears in prose, and as SILENT when it
//     does not — so a SILENT hit is a question to open the file on, not an accusation. The live
//     example is `power` skill2: her kit's "Reloads 100% of the magazine" IS encoded, as
//     `instantReload fraction: 1`, so the digit string "100" never appears and she reads SILENT.
//     A percent stored as a fraction is invisible to a digit-string matcher by construction.
//   * Any unit whose slug has no `data/characters.json` entry, or whose slot ships empty kit text.
//
// `--check` IS NOT WIRED INTO verify.sh — deliberately, and this comment is the record of why.
// The tier currently fires on 4 real, undispositioned lines; gating on it today would either
// paint the tree red or force a same-session enactment, and a roster sweep is FINDINGS-ONLY
// (CLAUDE.md batch-and-stop). Wire it once those four carry a disposition, and it becomes the
// guard that keeps the class from ever growing back.
//
// Self-validating fixture: scripts/tests/census-kit-numbers.test.ts pins the discriminating cases
// (a condition threshold is not a magnitude; prose-only vs silent; the calibration bound on the
// graded slice) so a later refactor cannot loosen the matcher without going red.
import { readFileSync, readdirSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const OVERRIDES_DIR = new URL('src/skills/overrides/', ROOT);
const CHARACTERS = new URL('data/characters.json', ROOT);
const KIT_STATUS = new URL('data/kit-status.json', ROOT);

export const SLOTS = ['skill1', 'skill2', 'burst'] as const;
export type Slot = (typeof SLOTS)[number];

// A magnitude is a percent-suffixed number. Everything else the kit prints is out of scope (see
// the header) — narrow on purpose: percent magnitudes are what the damage model carries, and
// they are distinctive enough (9.55, 435.6, 1365.92) that presence/absence is a real signal.
export const MAGNITUDE = /(\d+(?:\.\d+)?)\s*%/g;

// Condition clauses print a percent that is a THRESHOLD, not a magnitude the model owes an
// encoding for — `chisato`'s "Only when above 70%: ATK ▲ 53.69%" owes 53.69, not 70. They are
// STRIPPED from the line (not the whole line dropped) so the magnitude beside them still counts,
// and every strip is reported by `--skipped` so the filter can never quietly widen.
//
// HP gates and resource gates only. A PROC CHANCE ("There is a 30% chance of activating") is
// deliberately NOT stripped: it is a real quantity a model can get wrong — treating a 30% proc as
// always-on is an over-credit — so it stays auditable like any other magnitude.
export const CONDITION_CLAUSES: RegExp[] = [
  /only when (?:above|below)\s*\d+(?:\.\d+)?%/gi,
  // "HP falls below 90%", "HP drops to 90% or below", "own HP dips below 40%"
  /(?:own |the caster's |self )?hp (?:dips|falls|drops)\s*(?:below|under|to)\s*\d+(?:\.\d+)?%(?:\s*or (?:below|above|lower|higher))?/gi,
  // "Activates when above 80% HP", "with over 25% HP", "when below 50% HP"
  /(?:above|below|over|under)\s*\d+(?:\.\d+)?%\s*hp/gi,
  // "while this unit's HP is at 90% or above", "HP is above 50%"
  /hp is\s*(?:at\s*)?(?:above|below|over|under)?\s*\d+(?:\.\d+)?%(?:\s*or (?:above|below|higher|lower))?/gi,
  // "the HP of anyone in the squad is lower than 15%", "HP percentage is lower than 60%"
  /(?:is|are)\s*(?:lower|higher|less|greater) than\s*\d+(?:\.\d+)?%/gi,
  // "the HP of an adjacent ally drops to 90% or below" — same gate with a subject in between
  /hp of [^.,]{1,40}?\s*(?:dips|falls|drops)\s*(?:below|under|to)\s*\d+(?:\.\d+)?%(?:\s*or (?:below|above|lower|higher))?/gi,
  // resource gates: "when battery reaches 100%", "when Over Energy reaches 100%"
  /reaches\s*\d+(?:\.\d+)?%/gi,
  // resource gates, the other direction: "Deactivation condition: When the battery drops to 0%"
  /(?:battery|energy|gauge)\s*(?:drops?|falls?|dips)\s*to\s*\d+(?:\.\d+)?%/gi,
  // "above 50% of max HP" and friends
  /(?:above|below)\s*\d+(?:\.\d+)?%\s*(?:of )?(?:max )?hp/gi,
];

export function stripConditions(line: string): {
  text: string;
  stripped: string[];
} {
  const stripped: string[] = [];
  let text = line;
  for (const re of CONDITION_CLAUSES) {
    text = text.replace(new RegExp(re.source, re.flags), (m) => {
      stripped.push(m);
      return ' ';
    });
  }
  return { text, stripped };
}

/**
 * Every auditable line of a slot's kit text, with the '■' block marker removed.
 *
 * HEADER LINES ARE INCLUDED, and that is load-bearing. A '■' line usually carries only the
 * trigger and target clause, so an early version of this census skipped the lot — a silent hole a
 * naive grep caught immediately: 40 header lines print a percent, and four of them print a real
 * BUFF MAGNITUDE on the same line as the trigger (`aria` skill1 "Critical Damage ▲ 26.99%" and
 * skill2 "Critical Rate ▲ 7.03%", `neon` (SG/Fire, not the two variants) skill2 "Critical Rate ▲ 45.93% for 2 shots", `yan`
 * skill1 "Charge Damage ▲ 21.55%"). Dropping them would have made this census structurally blind
 * to exactly the units whose whole skill is one line — the opposite of what it is for. The
 * threshold percents that share those lines are handled by CONDITION_CLAUSES, not by discarding
 * the line.
 */
export function auditableLines(kitText: string): string[] {
  return kitText
    .split('\n')
    .map((l) => l.replace(/^\s*■\s*/, '').trim())
    .filter((l) => l.length > 0);
}

export function magnitudes(text: string): string[] {
  return [...text.matchAll(MAGNITUDE)].map((m) => m[1]);
}

/** Every numeric token in a blob, as the exact digit strings it prints. */
function numberTokens(blob: string): Set<string> {
  return new Set([...blob.matchAll(/\d+(?:\.\d+)?/g)].map((m) => m[0]));
}

/**
 * HP-restore lines. Their magnitude is inert BY DESIGN — the sim has no HP pool, so a heal's
 * amount has no engine consumer and only the recovery EVENT is board-relevant (audit F9; the
 * 5-carrier lifesteal non-emitter ruling, DECISIONS 2026-08-10). They are two thirds of every
 * finding this census produces, and reporting them beside real damage lines buries the worklist —
 * so they are CLASSIFIED, not filtered: still counted, still listed under their own heading,
 * never silently dropped.
 *
 * Deliberately keyed on the restore VERB, so a magnitude that merely mentions HP as a BASIS stays
 * in the worklist: `kilo`'s "damage equal to 1150.84% of the ATK, which is calculated from 5% of
 * final Max HP" and `soline-frost-ticket`'s "Max HP ▲ number of tickets * 10%" are stat lines,
 * not heals.
 */
export const HEAL_LINE = /\b(?:recovers?|restores?|heals?)\b/i;

export interface LineFinding {
  slot: Slot;
  line: string;
  missing: string[];
  kind: 'heal' | 'other';
}

export interface Row {
  slug: string;
  graded: boolean;
  silent: LineFinding[];
  proseOnly: LineFinding[];
  /** Loudness: what this row could not account for. */
  emptySlots: Slot[];
  conditionsStripped: string[];
  linesWithoutMagnitude: number;
}

export interface Census {
  rows: Row[];
  /** Loudness: override files the census could not read a kit for at all. */
  noKitText: string[];
  /** Loudness: override slugs absent from kit-status.json (graded/tail unknown). */
  noStatusEntry: string[];
}

export function auditUnit(
  slug: string,
  skills: Record<string, string | undefined>,
  overrideRaw: string,
  graded: boolean
): Row {
  const override = JSON.parse(overrideRaw) as Record<string, unknown>;
  // Whole-file tokens decide SILENT; structured-only tokens decide PROSE-ONLY. The structured
  // side is the encoded blocks PLUS `unmodeled` — a line deliberately filed as unmodeled is
  // accounted for, which is the entire point of that field.
  const fileTokens = numberTokens(overrideRaw);
  const structured = numberTokens(
    JSON.stringify([
      ...SLOTS.map((s) => override[s] ?? []),
      override.unmodeled ?? {},
    ])
  );

  const row: Row = {
    slug,
    graded,
    silent: [],
    proseOnly: [],
    emptySlots: [],
    conditionsStripped: [],
    linesWithoutMagnitude: 0,
  };

  for (const slot of SLOTS) {
    const kitText = skills[slot] ?? '';
    if (!kitText.trim()) {
      row.emptySlots.push(slot);
      continue;
    }
    for (const line of auditableLines(kitText)) {
      const { text, stripped } = stripConditions(line);
      row.conditionsStripped.push(...stripped);
      const values = magnitudes(text);
      if (values.length === 0) {
        row.linesWithoutMagnitude++;
        continue;
      }
      const kind = HEAL_LINE.test(line) ? 'heal' : 'other';
      const silent = values.filter((v) => !fileTokens.has(v));
      if (silent.length > 0) {
        row.silent.push({ slot, line, missing: silent, kind });
        continue;
      }
      const proseOnly = values.filter((v) => !structured.has(v));
      if (proseOnly.length > 0) {
        row.proseOnly.push({ slot, line, missing: proseOnly, kind });
      }
    }
  }
  return row;
}

export function census(): Census {
  const characters = JSON.parse(readFileSync(CHARACTERS, 'utf8')).characters as
    Record<string, { skills?: Record<string, string> }> | undefined;
  const status = JSON.parse(readFileSync(KIT_STATUS, 'utf8')).units as Record<
    string,
    { board?: unknown }
  >;
  const rows: Row[] = [];
  const noKitText: string[] = [];
  const noStatusEntry: string[] = [];

  for (const file of readdirSync(OVERRIDES_DIR).sort()) {
    if (!file.endsWith('.json')) {
      continue;
    }
    const slug = file.replace(/\.json$/, '');
    const skills = characters?.[slug]?.skills;
    if (!skills) {
      noKitText.push(slug);
      continue;
    }
    if (!status[slug]) {
      noStatusEntry.push(slug);
    }
    rows.push(
      auditUnit(
        slug,
        skills,
        readFileSync(new URL(file, OVERRIDES_DIR), 'utf8'),
        Boolean(status[slug]?.board)
      )
    );
  }
  return { rows, noKitText, noStatusEntry };
}

function printFindings(rows: Row[], key: 'silent' | 'proseOnly'): void {
  const of = (r: Row, kind: 'heal' | 'other') =>
    r[key].filter((f) => f.kind === kind);

  const worklist = rows.filter((r) => of(r, 'other').length > 0);
  for (const r of worklist) {
    console.log(`  ${r.slug}${r.graded ? '  [graded]' : ''}`);
    for (const f of of(r, 'other')) {
      console.log(
        `      ${f.slot.padEnd(6)} ${f.line.slice(0, 96)}\n             ↳ ${f.missing.join(', ')}`
      );
    }
  }
  if (worklist.length === 0) {
    console.log('  (none)');
  }

  // Counted and named, never dropped: the amount of a heal has no engine consumer, so this
  // class is expected — but a unit LEAVING it would be a real signal, and that is only visible
  // if the class stays on screen.
  const heals = rows.filter((r) => of(r, 'heal').length > 0);
  if (heals.length > 0) {
    console.log(
      `  — plus ${heals.reduce((a, r) => a + of(r, 'heal').length, 0)} HP-restore magnitude(s) across ` +
        `${heals.length} unit(s), inert by design (no HP pool — only the recovery EVENT is board-relevant): ` +
        heals.map((r) => `${r.slug}×${of(r, 'heal').length}`).join(', ')
    );
  }
}

/**
 * Everything needed to disposition ONE unit's findings without opening the file: the kit line,
 * the prose sentences that mention the missing magnitude, and the slot's encoded values. The
 * point of the worklist is deciding whether a prose-only number is a legitimate TRANSFORMATION
 * or a dropped line, and that decision is always made from exactly these three things.
 */
function explain(slug: string): void {
  const characters = JSON.parse(readFileSync(CHARACTERS, 'utf8')).characters;
  const skills = characters?.[slug]?.skills;
  if (!skills) {
    console.error(`census-kit-numbers: no characters.json kit for '${slug}'`);
    process.exit(2);
  }
  const raw = readFileSync(
    new URL(`${slug}.json`, OVERRIDES_DIR),
    'utf8'
  ) as string;
  const override = JSON.parse(raw);
  const status = JSON.parse(readFileSync(KIT_STATUS, 'utf8')).units;
  const row = auditUnit(slug, skills, raw, Boolean(status[slug]?.board));

  const prose = [override.note ?? '', ...(override.caveats ?? [])].join(' ');
  const findings = [...row.silent, ...row.proseOnly];
  if (findings.length === 0) {
    console.log(`${slug}: no unaccounted magnitude.`);
    return;
  }
  for (const f of findings) {
    console.log(`\n${slug} · ${f.slot} · ${f.kind}\n  KIT   ${f.line}`);
    for (const value of f.missing) {
      console.log(`  ↳ ${value} — not in any encoded block`);
      const sentences = prose
        .split(/(?<=[.;])\s+/)
        .filter((s) => s.includes(value));
      for (const s of sentences) {
        console.log(`      PROSE  …${s.trim().slice(0, 300)}`);
      }
      if (sentences.length === 0) {
        console.log('      PROSE  (nothing — this magnitude is SILENT)');
      }
    }
    const values = [
      ...new Set(
        [
          ...JSON.stringify(override[f.slot] ?? []).matchAll(/\d+(?:\.\d+)?/g),
        ].map((m) => m[0])
      ),
    ];
    console.log(
      `  ENCODED VALUES in ${f.slot}: ${values.join(', ') || '(none)'}`
    );
  }
}

function main(): void {
  const argv = process.argv.slice(2);
  const explainAt = argv.indexOf('--explain');
  if (explainAt !== -1) {
    const slug = argv[explainAt + 1];
    if (!slug || slug.startsWith('--')) {
      console.error('census-kit-numbers: --explain needs a slug');
      process.exit(2);
    }
    explain(slug);
    return;
  }
  const known = new Set([
    '--prose',
    '--all',
    '--tail',
    '--graded',
    '--skipped',
    '--json',
    '--check',
  ]);
  const unknown = argv.filter((a) => !known.has(a));
  if (unknown.length > 0) {
    console.error(
      `census-kit-numbers: unrecognised argument(s): ${unknown.join(', ')}\n` +
        `expected any of: ${[...known].join(' ')}`
    );
    process.exit(2);
  }

  const { rows: allRows, noKitText, noStatusEntry } = census();
  const rows = argv.includes('--tail')
    ? allRows.filter((r) => !r.graded)
    : argv.includes('--graded')
      ? allRows.filter((r) => r.graded)
      : allRows;

  if (argv.includes('--json')) {
    console.log(JSON.stringify({ rows, noKitText, noStatusEntry }, null, 2));
    return;
  }

  if (argv.includes('--skipped')) {
    console.log('WHAT THIS CENSUS COULD NOT SEE');
    console.log(
      `  ${rows.reduce((a, r) => a + r.linesWithoutMagnitude, 0)} kit line(s) print no percent magnitude (qualitative lines, ` +
        'durations and counts — out of scope by construction)'
    );
    const conds = rows.flatMap((r) => r.conditionsStripped);
    console.log(
      `  ${conds.length} condition clause(s) stripped before matching (a threshold percent is not a magnitude):`
    );
    [...new Set(conds.map((c) => c.trim().toLowerCase()))]
      .sort()
      .forEach((c) => console.log(`      ${c}`));
    const empties = rows.flatMap((r) =>
      r.emptySlots.map((s) => `${r.slug}.${s}`)
    );
    console.log(`  ${empties.length} slot(s) with empty kit text`);
    if (empties.length > 0) {
      console.log(`      ${empties.join(', ')}`);
    }
    console.log(
      `  ${noKitText.length} override(s) with no characters.json kit at all${
        noKitText.length ? `: ${noKitText.join(', ')}` : ''
      }`
    );
    console.log(
      `  ${noStatusEntry.length} override(s) absent from kit-status.json (graded/tail unknown, counted as tail)${
        noStatusEntry.length ? `: ${noStatusEntry.join(', ')}` : ''
      }`
    );
    return;
  }

  const silentUnits = rows.filter((r) => r.silent.length > 0);
  const proseUnits = rows.filter((r) => r.proseOnly.length > 0);

  console.log(
    `SILENT — the kit prints this magnitude and the override never mentions it (${silentUnits.length} unit(s), ` +
      `${silentUnits.reduce((a, r) => a + r.silent.length, 0)} line(s)):`
  );
  printFindings(rows, 'silent');

  if (argv.includes('--prose') || argv.includes('--all')) {
    console.log(
      `\nPROSE-ONLY — mentioned in note/caveats but neither encoded nor filed under unmodeled ` +
        `(${proseUnits.length} unit(s), ${proseUnits.reduce((a, r) => a + r.proseOnly.length, 0)} line(s)):`
    );
    printFindings(rows, 'proseOnly');
  }

  const graded = rows.filter((r) => r.graded);
  const tail = rows.filter((r) => !r.graded);
  console.log(
    `\n${rows.length} unit(s) audited · ${graded.length} graded / ${tail.length} tail · ` +
      `SILENT ${graded.filter((r) => r.silent.length).length} graded + ${tail.filter((r) => r.silent.length).length} tail · ` +
      `PROSE-ONLY ${graded.filter((r) => r.proseOnly.length).length} graded + ${tail.filter((r) => r.proseOnly.length).length} tail`
  );
  console.log(
    'A clean row means the number is PRESENT somewhere in the file — never that it is correctly ' +
      'encoded. Run --skipped for what this census cannot see.'
  );
  if (!argv.includes('--prose') && !argv.includes('--all')) {
    console.log(
      'PROSE-ONLY is the tail worklist — the one known defect of this class (`red-hood` M8) sat ' +
        'there, not in SILENT. Run --prose to read it.'
    );
  }

  if (argv.includes('--check') && silentUnits.length > 0) {
    console.error(
      `\n${silentUnits.length} unit(s) carry a kit magnitude their override never mentions: ${silentUnits
        .map((r) => r.slug)
        .join(', ')}`
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
