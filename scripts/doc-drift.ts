// doc-drift.ts — catch the two doc-drift classes that repeatedly outlived their landings.
//
// WHY (2026-07-22): a single planning pass hit four stale doc claims, each of which changed a
// priority. Root cause was always the same — a landing propagates to DECISIONS and to the code,
// but the doc that POSES the question keeps posing it. Two mechanically-checkable classes:
//
//   1. "which units use primitive X" — derivable from the overrides, yet hand-maintained in
//      docs/STATE.md §5 and restated in docs/engine-modeling-gaps.md. Failures seen: STATE.md
//      listed `snow-white` under weaponSwap/hasPierce/fbGate/teamAmmo for two days after her
//      re-encode dropped them; engine-modeling-gaps said "0 enactments" for `teamHas` and
//      `maxAmmoFlat` after both had landed.
//        → CENSUS is GENERATED here (single source), and STATE.md §5 is LINTED for FALSE MEMBERS
//          (a slug listed under a primitive it no longer uses). We lint rather than regenerate §5
//          because its Users cells carry editorial structure a generator would destroy: the `/`
//          convention maps users to specific primitives in a multi-primitive row, and long lists
//          are deliberately abbreviated ("~30 units"). False membership is the half that misleads;
//          a missing name is benign (STATE.md says the lists are "current but not a contract").
//
//   2. a resolved question still filed under open-questions ## UNANSWERED. Failures seen: U17 sat
//      in UNANSWERED with a header reading "CLOSED — OWNER OVERRIDE"; U22 stayed CONTESTED after
//      the owner re-ruled it the same day. Greps for open work kept resurfacing settled records.
//        → LINTED: a resolution verb in an UNANSWERED entry's header/opening is an error.
//
// USAGE
//   npx tsx scripts/doc-drift.ts            # check (verify.sh gate) — exits 1 on drift
//   npx tsx scripts/doc-drift.ts --update   # regenerate the census block in engine-modeling-gaps
//
// MATCHING NOTE (learned the hard way): primitives are matched as a QUOTED TOKEN inside the
// override's NON-PROSE fields only. A bare-token grep hits `note`/`caveats` prose and produces
// false findings — a "hitRatePct ... inert" sweep once flagged six overrides whose caveats had
// ALREADY been corrected. Prose is excluded here by construction.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const OVERRIDES = new URL('src/skills/overrides/', ROOT);
const STATE_MD = new URL('docs/STATE.md', ROOT);
const GAPS_MD = new URL('docs/engine-modeling-gaps.md', ROOT);
const QUESTIONS_MD = new URL('docs/open-questions.md', ROOT);

const BEGIN = '<!-- BEGIN GENERATED: primitive-census (npx tsx scripts/doc-drift.ts --update) -->';
const END = '<!-- END GENERATED: primitive-census -->';

// Prose fields are current-state narration, never structural — see CONVENTIONS "Doc hygiene".
const PROSE_FIELDS = new Set(['note', 'caveats', 'unmodeled']);

const update = process.argv.includes('--update');
const problems: string[] = [];

// ── load overrides, structural content only ──────────────────────────────────────────────────
const slugs = readdirSync(OVERRIDES)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.slice(0, -5))
  .sort();

const structural = new Map<string, string>();
for (const slug of slugs) {
  const doc = JSON.parse(readFileSync(new URL(`${slug}.json`, OVERRIDES), 'utf8'));
  const stripped = Object.fromEntries(
    Object.entries(doc).filter(([k]) => !PROSE_FIELDS.has(k)),
  );
  structural.set(slug, JSON.stringify(stripped));
}

/** Units whose override structurally references `name` (as a JSON key OR an enum value). */
const usersOf = (name: string): string[] => {
  const token = `"${name}"`;
  return slugs.filter((s) => structural.get(s)!.includes(token));
};

// ── char-data source ─────────────────────────────────────────────────────────────────────────
// A few STATE.md §5 rows in the "Unit-level / char-static flags" table are NOT override opt-ins at
// all — they are datamined per-unit fields on data/characters.json (e.g. `hitsPerShot`). Censusing
// only the overrides under-reports those to 0, which reads as "nothing uses this". A unit counts as
// a user when its value differs from the field's MODAL value (= the datamine default), which is the
// only non-arbitrary "is this set meaningfully" rule available.
const charsRaw = JSON.parse(readFileSync(new URL('data/characters.json', ROOT), 'utf8'));
const chars: Record<string, any> = charsRaw.characters ?? charsRaw;
const charDataUsers = (name: string): string[] => {
  const present = Object.entries(chars).filter(([, c]) => (c as any)?.[name] !== undefined);
  if (!present.length) return [];
  const counts = new Map<string, number>();
  for (const [, c] of present) {
    const k = JSON.stringify((c as any)[name]);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const modal = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return present
    .filter(([, c]) => JSON.stringify((c as any)[name]) !== modal)
    .map(([slug]) => slug)
    .sort();
};

// ── parse STATE.md §5 primitive tables ───────────────────────────────────────────────────────
// Row shape: | `prim` (+`opt`) | meaning | users |   — cell 1 may name several primitives.
const stateText = readFileSync(STATE_MD, 'utf8');
const sec5 = stateText.split('## 5. Opt-in kit primitives inventory')[1]?.split('\n## ')[0] ?? '';
if (!sec5) problems.push('STATE.md: could not locate "## 5. Opt-in kit primitives inventory"');

type Row = { prims: string[]; users: string; line: string; rawLine: string };
const rows: Row[] = [];
for (const line of sec5.split('\n')) {
  if (!line.startsWith('|')) continue;
  const cells = line.split('|').map((c) => c.trim());
  // cells[0] is '' (leading pipe). Need at least prim | meaning | users.
  if (cells.length < 5) continue;
  const [, c1, , c3] = cells;
  if (/^-+$/.test(c1) || c1 === 'Primitive') continue;
  const prims = [...c1.matchAll(/`([A-Za-z][A-Za-z0-9.]*)`/g)].map((m) => m[1]);
  if (!prims.length) continue;
  rows.push({ prims, users: c3, line: line.slice(0, 90), rawLine: line });
}

// ── CHECK 1: false members in STATE.md §5 ────────────────────────────────────────────────────
// Direction matters: a slug LISTED under a primitive it no longer uses actively misleads (it is
// what sent a 2026-07-22 planning pass down two wrong paths). A slug MISSING from a list is benign
// — STATE.md itself says these lists are "current but not a contract" and abbreviates long ones.
// So we flag (and under --update, prune) false members only, never absences.
const slugSet = new Set(slugs);
const falseMembers: { slug: string; row: Row }[] = [];
for (const row of rows) {
  const named = [...row.users.matchAll(/[a-z][a-z0-9]*(?:-[a-z0-9]+)*/g)]
    .map((m) => m[0])
    .filter((t) => slugSet.has(t));
  // union BOTH sources — a char-data-backed listing (e.g. under `hitsPerShot`) is a real user and
  // must never be pruned just because no override opts in.
  const anyUser = new Set(row.prims.flatMap((p) => [...usersOf(p), ...charDataUsers(p)]));
  for (const slug of new Set(named)) if (!anyUser.has(slug)) falseMembers.push({ slug, row });

  // EXACT prose counts ("8 units (…)") must match reality — this is the U14 class, where a stated
  // count outlived its landing and mis-set a priority. "~14 units" is approximate BY DESIGN
  // (the leading ~ is the author saying "about"), so those are skipped.
  // In a multi-primitive row a count is often SCOPED to one of them — e.g. the alliesOf* row reads
  // "(element) 8 units; …", where 8 is alliesOfElement alone, not the 4-primitive union. So accept a
  // claim matching the union OR any single constituent; only flag what matches nothing.
  const validCounts = new Set<number>([
    anyUser.size,
    ...row.prims.map((p) => new Set([...usersOf(p), ...charDataUsers(p)]).size),
  ]);
  for (const m of row.users.matchAll(/(?<!~)\b(\d+) units\b/g)) {
    const claimed = Number(m[1]);
    if (!validCounts.has(claimed)) {
      problems.push(
        `STATE.md §5: cell claims "${claimed} units" for ` +
          `${row.prims.map((p) => `\`${p}\``).join(' / ')} but the tree has ${anyUser.size}` +
          `\n      row: ${row.line}…\n      fix by hand (counts are prose), or write "~${anyUser.size} units"` +
          ` / link the generated census in engine-modeling-gaps.md`,
      );
    }
  }
}

if (falseMembers.length && update) {
  // Group by ROW: a row can hold several false members, and pruning them one-at-a-time against the
  // ORIGINAL row text fails after the first edit (the line no longer matches). One pass per row.
  const byRow = new Map<string, { row: Row; slugs: string[] }>();
  for (const { slug, row } of falseMembers) {
    const e = byRow.get(row.rawLine) ?? { row, slugs: [] };
    e.slugs.push(slug);
    byRow.set(row.rawLine, e);
  }
  let out = stateText;
  for (const { row, slugs: dead } of byRow.values()) {
    let cell = row.users;
    for (const slug of dead) {
      // (?![\w-]) / (?<![\w-]) so `helm` never matches inside `helm-aquamarine`
      cell = cell.replace(new RegExp(`(?<![\\w-])${slug}(?![\\w-])`, 'g'), '');
    }
    // tidy the separators the removals left behind, without touching the editorial `/` grouping
    cell = cell
      .replace(/\s*,(\s*,)+/g, ',')
      .replace(/\(\s*,\s*/g, '(')
      .replace(/\s*,\s*\)/g, ')')
      .replace(/\s*,\s*(?=\/)/g, ' ')
      .replace(/(?<=\/)\s*,\s*/g, ' ')
      .replace(/^\s*,\s*|\s*,\s*$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    const cells = row.rawLine.split('|');
    cells[3] = ` ${cell} `;
    out = out.replace(row.rawLine, cells.join('|'));
  }
  writeFileSync(STATE_MD, out);
  console.log(`doc-drift: pruned ${falseMembers.length} false member(s) from STATE.md §5`);
  for (const { slug, row } of falseMembers) {
    console.log(`    - ${slug} from ${row.prims.map((p) => `\`${p}\``).join('/')}`);
  }
} else {
  for (const { slug, row } of falseMembers) {
    problems.push(
      `STATE.md §5: "${slug}" is listed under ${row.prims.map((p) => `\`${p}\``).join(' / ')} ` +
        `but its override does not structurally reference any of them (prose mentions do not count)` +
        `\n      row: ${row.line}…\n      fix: npx tsx scripts/doc-drift.ts --update`,
    );
  }
}

// ── CHECK 2: a resolved question still filed under ## UNANSWERED ─────────────────────────────
// A resolved entry left here reads as live work to every future agent and to greps.
//
// PRECISION OVER RECALL, deliberately. A naive "resolution verb anywhere in the header" rule
// false-positives on the COMMON and legitimate case of an entry whose SUB-PART resolved while the
// entry stays open — e.g. U16 "(2026-07-16; over-generation RESOLVED 2026-07-21)", where the
// worklist itself is still live. A lint that cries wolf gets ignored, and this repo's own history
// (guardrails had to become ENFORCE, not remind) says that failure mode is the expensive one. So we
// match only the two shapes that actually caused the 2026-07-22 finds:
//   (a) a top-of-body status blockquote  →  "> **CLOSED — OWNER OVERRIDE (2026-07-17).**"   [U17]
//   (b) a struck-through / superseded stub header  →  "### ~~U22~~ — MOVED TO ANSWERED …"   [U22]
const STAMP_BLOCKQUOTE = /^\s*>\s*\*\*(?:~~)?(CLOSED|RESOLVED|SUPERSEDED)\b/;
const STUB_HEADER = /~~U\d+~~|\(SUPERSEDED\b|MOVED TO ANSWERED/i;
const qText = readFileSync(QUESTIONS_MD, 'utf8');
const unanswered = qText.split('## UNANSWERED')[1]?.split('\n## ANSWERED')[0] ?? '';
if (!unanswered) problems.push('open-questions.md: could not locate "## UNANSWERED"');
for (const chunk of unanswered.split(/\n(?=### )/)) {
  const lines = chunk.split('\n');
  const header = lines[0] ?? '';
  if (!header.startsWith('### ')) continue;
  const body = lines.slice(1).filter((l) => l.trim() !== '');
  const stamped = STUB_HEADER.test(header)
    ? 'a superseded-stub header'
    : STAMP_BLOCKQUOTE.test(body[0] ?? '')
      ? `a "${(body[0].match(STAMP_BLOCKQUOTE) as RegExpMatchArray)[1]}" status stamp`
      : null;
  if (stamped) {
    problems.push(
      `open-questions.md: "${header.slice(4, 80)}…" is filed under UNANSWERED but carries ${stamped}` +
        ` — re-file the settled record to ANSWERED (append-only) and leave only what is genuinely open.`,
    );
  }
}

// ── GENERATE: the primitive census ───────────────────────────────────────────────────────────
const censusPrims = [...new Set(rows.flatMap((r) => r.prims))].sort();
const ABBREV_OVER = 8; // keep the block readable; the count stays exact
const censusLines = [
  BEGIN,
  '',
  '| Primitive | Users | Enacted on |',
  '| --- | --- | --- |',
  ...censusPrims.map((p) => {
    const u = usersOf(p);
    const cd = charDataUsers(p);
    // char-data-sourced rows (e.g. hitsPerShot) have no override opt-in; report their real source
    if (!u.length && cd.length) {
      const shown = cd.length > ABBREV_OVER ? `${cd.slice(0, ABBREV_OVER).join(', ')}, …` : cd.join(', ');
      return `| \`${p}\` | ${cd.length} _(char-data)_ | ${shown} |`;
    }
    const shown = u.length === 0 ? '_none_' : u.length > ABBREV_OVER ? `${u.slice(0, ABBREV_OVER).join(', ')}, …` : u.join(', ');
    return `| \`${p}\` | ${u.length} | ${shown} |`;
  }),
  '',
  END,
];
const census = censusLines.join('\n');

const gapsText = readFileSync(GAPS_MD, 'utf8');
const hasMarkers = gapsText.includes(BEGIN) && gapsText.includes(END);
if (!hasMarkers) {
  problems.push(
    `engine-modeling-gaps.md: missing the generated census markers. Add\n      ${BEGIN}\n      ${END}\n      then run: npx tsx scripts/doc-drift.ts --update`,
  );
} else {
  const re = new RegExp(`${BEGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  const current = gapsText.match(re)![0];
  if (update) {
    if (current !== census) {
      writeFileSync(GAPS_MD, gapsText.replace(re, census));
      console.log(`doc-drift: census updated (${censusPrims.length} primitives)`);
    } else console.log('doc-drift: census already fresh');
  } else if (current !== census) {
    problems.push(
      'engine-modeling-gaps.md: the generated primitive census is STALE — run `npx tsx scripts/doc-drift.ts --update`',
    );
  }
}

// ── report ───────────────────────────────────────────────────────────────────────────────────
if (problems.length) {
  console.error(`\ndoc-drift: ${problems.length} problem(s)\n`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error('');
  process.exit(1);
}
console.log(
  `doc-drift: ok (${censusPrims.length} primitives censused across ${slugs.length} overrides; ` +
    `${rows.length} STATE.md §5 rows checked)`,
);
