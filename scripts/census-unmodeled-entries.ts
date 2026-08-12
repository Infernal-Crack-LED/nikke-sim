// census-unmodeled-entries.ts — roster-wide accounting of every `unmodeled` ENTRY against the kit
// text it claims to quote. Axis 2 of the phase-4 TAIL
// (docs/handoffs/2026-08-11-faithfulness-tail-plan.md §4.1).
//
//   npx tsx scripts/census-unmodeled-entries.ts                  # the worklist (UNMATCHED + MISFILED)
//   npx tsx scripts/census-unmodeled-entries.ts --all            # every tier, with counts
//   npx tsx scripts/census-unmodeled-entries.ts --tail           # units with no board reading
//   npx tsx scripts/census-unmodeled-entries.ts --graded         # the 45 board-graded units
//   npx tsx scripts/census-unmodeled-entries.ts --skipped        # what this census could NOT see
//   npx tsx scripts/census-unmodeled-entries.ts --histogram      # match-score distribution
//   npx tsx scripts/census-unmodeled-entries.ts --json           # machine-readable rows
//   npx tsx scripts/census-unmodeled-entries.ts --check          # exit 1 on an unaccepted finding
//   npx tsx scripts/census-unmodeled-entries.ts --explain <slug> # one unit: entry, best line, score
//
// WHY THIS EXISTS. Axis 1 (`census-kit-numbers.ts`) asks whether every kit MAGNITUDE reaches the
// override. This axis asks the converse, and it is the one that keeps the reviewer's inputs true:
// does every `unmodeled` entry still correspond to a line the kit actually prints?
//
// `unmodeled` is read as an INDEX of what the model skips — by `gen-unmodeled-review.ts`, by
// `data/kit-status.json`, and by every reviewer who greps it for open gaps. The owner ruling of
// 2026-08-11 ("record all unmodeled behavior as unmodeled rather than leaving it in prose") made
// that index authoritative, which cuts both ways: an entry describing a line the kit NO LONGER
// PRINTS — a kit rewrite, a rebalance, a line that was since modelled and the entry never retired —
// reads as a live gap forever, and costs a verification pass every time it is re-encountered. That
// is the same failure mode the CLAUDE.md current-state rule names for override prose (superseded
// narration retained in-file reads as a live claim), applied to the structured half.
//
// THE THREE QUESTIONS, in descending order of how loud a hit should be:
//
//   UNMATCHED — no kit line in the unit's whole kit resembles this entry. Either the kit text
//               changed under it, or the entry is a hand-written note that was never a kit line.
//   MISFILED  — the entry matches a kit line in a DIFFERENT slot than the one it is filed under.
//               The file still records the behaviour, but per-slot readers (the review doc groups
//               by slot; `--explain` in axis 1 prints per-slot) attribute it to the wrong skill.
//   NEAR      — matched only by token overlap, not by containment. Usually a legitimate paraphrase
//               or a partial quote; surfaced so the threshold's cost stays visible, not gated.
//
// THE MATCH IS DIRECTIONAL, and that is the whole design. An entry may legitimately be LONGER than
// its kit line (the "— magnitude only: …" annotation convention, 122 of 460 entries) but never
// carries content the kit line lacks. So the test is: is the entry's QUOTED HEAD covered by a kit
// line? Coverage of head-tokens by line-tokens — not similarity, which would punish exactly the
// annotated entries the convention encourages.
//
// WHAT IT CANNOT SEE — printed by `--skipped`, never silently swallowed:
//   * WRONGNESS THAT IS PRESENT BUT INCORRECT. An entry quoting a real kit line verbatim, filed in
//     the right slot, describing behaviour that is in fact MODELLED, is clean here. This census
//     falsifies "this entry quotes a line the kit prints"; it cannot falsify "this line is really
//     unmodelled". That stronger claim needs the per-unit read.
//   * A kit line that SHOULD have an entry and does not — that is axis 1's question for magnitudes
//     and the per-unit read's for qualitative lines. This axis only audits entries that exist.
//   * Kit text drift the roster sync has not pulled yet: this scores against today's
//     `data/characters.json`, so an entry is only stale relative to the kit text we currently hold.
//   * Units whose override has no `data/characters.json` kit at all — reported, never scored.
//
// CALIBRATION (the method rule of the tail plan: score every census against the graded 45 before
// trusting its tail output). Those units were read line-by-line by faithfulness batches 1-8, so
// they are an existing labeled set and no new ground truth was generated. A census that fires
// heavily on units that slice already cleared is measuring its own noise; the calibration figure is
// restated by `--all` on every run and pinned by the fixture.
//
// Self-validating fixture: scripts/tests/census-unmodeled-entries.test.ts pins the discriminating
// cases (annotation stripping, containment vs paraphrase, the misfiled detector, the graded
// calibration bound) so a later refactor cannot loosen the matcher without going red.
import { existsSync, readFileSync, readdirSync } from 'node:fs';

import { SLOTS, auditableLines, type Slot } from './census-kit-numbers.js';

const ROOT = new URL('../', import.meta.url);
const OVERRIDES_DIR = new URL('src/skills/overrides/', ROOT);
const CHARACTERS = new URL('data/characters.json', ROOT);
const KIT_STATUS = new URL('data/kit-status.json', ROOT);

/**
 * The annotation convention: a quoted kit line, then ` — `, then why it is unmodelled
 * (`ada`: "Recovers 10% … for 10 sec. — magnitude only: the 10s recovery-event WINDOW is
 * modeled …"). Only the FIRST separator splits: annotations themselves contain further dashes.
 *
 * An em dash inside a kit line would truncate the head early — which costs nothing, because a
 * shorter head is still covered by the line it came from. Truncating the ANNOTATION into the head
 * is the failure that matters, and taking the first separator is the conservative direction.
 */
export const ANNOTATION_SEP = / — /;

/**
 * The SECOND annotation form, found only by running this census: a trailing parenthetical
 * (`takina`: "Deals Stun to all enemies for 2 sec (boss-inert: the sim's boss does not
 * fire/charge/reload …)"). Four units annotate this way instead of with the em dash, and treating
 * the parenthetical as quoted text drags their coverage score below any sane floor — they were
 * four of the first run's UNMATCHED findings, all spurious.
 *
 * A token floor is what separates an annotation from the kit's own parentheses: game text prints
 * "normal attack(s)", "3 round(s)", "2 time(s)" — inflection markers of one token. An annotation
 * is a sentence. Stripping only trailing parentheticals of 3+ tokens keeps every inflection marker
 * intact, which matters because "attack(s)" vs "attack" changes nothing but dropping it silently
 * would.
 */
export const MIN_ANNOTATION_TOKENS = 3;

export function quotedHead(entry: string): string {
  let head = entry.split(ANNOTATION_SEP)[0]!.trim();
  const open = head.lastIndexOf('(');
  if (open > 0) {
    // TRAILING only: the parenthesis must run to the end of the head. Slicing from the last '('
    // without checking for a close treats the kit's own "attack(s). Affects all allies." as a
    // 4-token annotation and truncates the quote mid-sentence — caught by the fixture, and it
    // would have silently shortened the head on a large fraction of the roster.
    // An unclosed parenthesis IS normal: the em-dash split above can cut one in half.
    const inner = head.slice(open + 1).replace(/\)\s*$/, '');
    if (!inner.includes(')') && tokens(inner).length >= MIN_ANNOTATION_TOKENS) {
      head = head.slice(0, open).trim();
    }
  }
  return head;
}

/**
 * Kit text is written in BLOCKS: a '■' header carrying the trigger and target clause, then the
 * effect lines it governs. `unmodeled` entries quote the block, not the line — `naga`'s
 * "Activates after 12 normal attack(s). Affects all allies. Restores 14.57% of Cover HP." is a
 * header plus the line beneath it, and `tia` files a three-line block as one newline-joined entry.
 *
 * Scoring those against individual LINES is a structural blind spot, not a threshold problem: no
 * single line contains the entry, so a correctly-quoted block can never match. Blocks are
 * therefore the unit of comparison, with individual lines kept alongside for entries that quote
 * just one.
 */
export function blocks(kitText: string): string[] {
  const out: string[] = [];
  for (const raw of kitText.split('\n')) {
    const line = raw.trim();
    if (line.length === 0) {
      continue;
    }
    if (line.startsWith('■') || out.length === 0) {
      out.push(line.replace(/^\s*■\s*/, ''));
    } else {
      out[out.length - 1] += ` ${line}`;
    }
  }
  return out;
}

/**
 * Normalize for comparison. Kit text and hand-typed entries disagree on case, the '■' block
 * marker, unicode arrows/multiplication signs, non-breaking spaces and trailing punctuation —
 * none of which carry meaning here. Digits and percent signs are PRESERVED as tokens, because a
 * magnitude is the most distinctive thing an entry can quote.
 */
export function normalize(text: string): string {
  return text
    .replace(/^\s*■\s*/, '')
    .replace(/[\u00A0\u2007\u202F]/g, ' ')
    .toLowerCase()
    .replace(/[▲▼]/g, ' ')
    .replace(/[×✕]/g, ' ')
    .replace(/[“”"'`]/g, '')
    .replace(/[.,;:!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tokens that carry identity: words, numbers, and percent-suffixed magnitudes. */
export function tokens(text: string): string[] {
  return normalize(text).match(/[a-z]+|\d+(?:\.\d+)?%?/g) ?? [];
}

/**
 * Coverage of the ENTRY's tokens by a kit LINE's tokens — deliberately asymmetric (see header).
 * Multiset-insensitive on purpose: a repeated word is not extra evidence.
 */
export function coverage(head: string, line: string): number {
  const h = new Set(tokens(head));
  if (h.size === 0) {
    return 0;
  }
  const l = new Set(tokens(line));
  let hit = 0;
  for (const t of h) {
    if (l.has(t)) {
      hit++;
    }
  }
  return hit / h.size;
}

/**
 * The percent magnitudes a text prints — the same definition axis 1 audits
 * (`census-kit-numbers.ts`), kept deliberately consistent between the two censuses.
 */
export function magnitudesOf(text: string): Set<string> {
  return new Set(tokens(text).filter((t) => t.endsWith('%')));
}

/**
 * Does this line carry every magnitude the entry quotes?
 *
 * Token coverage alone cannot answer the question this census exists to ask. An entry quoting a
 * REBALANCED line — same words, different number — scores 10/11 against the line it no longer
 * matches, because a magnitude counts for exactly as much as the word "the". That is the single
 * most likely way a genuinely stale entry appears (a kit rebalance changes numbers, not phrasing),
 * so it gets its own gate and its own tier rather than a nudged threshold: a magnitude is the
 * least collidable thing an entry can quote, and disagreement on one is a finding, not noise.
 */
export function magnitudesAgree(head: string, line: string): boolean {
  const want = magnitudesOf(head);
  if (want.size === 0) {
    return true;
  }
  const have = magnitudesOf(line);
  for (const m of want) {
    if (!have.has(m)) {
      return false;
    }
  }
  return true;
}

/**
 * The NEAR floor. Below it an entry is reported UNMATCHED.
 *
 * Chosen from the observed score distribution (`--histogram`) rather than picked a priori: real
 * paraphrases of a line cluster high, and entries with no line behind them cluster low. The
 * fixture pins the calibration this threshold produces, so moving it goes red.
 */
export const NEAR_FLOOR = 0.6;

/**
 * Containment needs a floor of its own, and it binds on the CONTAINED side, whichever that is.
 *
 * The floor existed from the start on the head (`l.includes(h)`) and NOT on the line
 * (`h.includes(l)`) — which made every long entry that happened to quote a boilerplate clause read
 * as a perfect match. Both roster-wide MISFILED findings in the first run were that bug:
 * `liberalio` and `naga` scored 1.00 against the line "Affects self." / "Affects all allies.",
 * clauses that appear in nearly every kit in the game. A short line is not evidence of anything.
 */
export const MIN_CONTAINMENT_TOKENS = 4;

export type Tier =
  'exact' | 'contained' | 'near' | 'magnitudeDrift' | 'misfiled' | 'unmatched';

export interface EntryFinding {
  slot: Slot;
  entry: string;
  head: string;
  tier: Tier;
  score: number;
  bestLine: string;
  /** For `misfiled`: the slot whose kit text actually carries the line. */
  matchedSlot?: Slot;
}

export interface Row {
  slug: string;
  graded: boolean;
  findings: EntryFinding[];
  /** Loudness: slots the unit files entries under while shipping no kit text there. */
  emptySlotsWithEntries: Slot[];
  entryCount: number;
}

export interface Census {
  rows: Row[];
  /** Loudness: overrides with entries but no characters.json kit — scored against nothing. */
  noKitText: string[];
  /** Loudness: overrides absent from kit-status.json (graded/tail unknown, counted as tail). */
  noStatusEntry: string[];
}

/**
 * KNOWN findings that are NOT defects, each with the reason. `--check` ignores exactly these.
 *
 * Keep this list tiny and specific. An entry here is a claim that the record is CORRECT and the
 * matcher cannot see why — never a way to silence a finding nobody wants to deal with.
 */
export const ACCEPTED: Array<{
  slug: string;
  headStartsWith: string;
  why: string;
}> = [];

function bestMatch(
  head: string,
  lines: string[],
  requireMagnitudes = false
): { score: number; line: string } {
  let best = { score: 0, line: '' };
  for (const line of lines) {
    if (requireMagnitudes && !magnitudesAgree(head, line)) {
      continue;
    }
    const score = coverage(head, line);
    if (score > best.score) {
      best = { score, line };
    }
  }
  return best;
}

export function contains(head: string, line: string): boolean {
  const h = normalize(head);
  const l = normalize(line);
  const enough = (s: string) => tokens(s).length >= MIN_CONTAINMENT_TOKENS;
  return (l.includes(h) && enough(h)) || (h.includes(l) && enough(l));
}

export function auditUnit(
  slug: string,
  skills: Record<string, string | undefined>,
  override: Record<string, unknown>,
  graded: boolean
): Row {
  const unmodeled = (override.unmodeled ?? {}) as Record<
    string,
    string[] | undefined
  >;
  // Both granularities: a block for entries that quote a whole '■' group, the lines inside it for
  // entries that quote one effect. Matching takes the best of the two.
  const linesBySlot = new Map<Slot, string[]>();
  for (const slot of SLOTS) {
    const kit = skills[slot] ?? '';
    linesBySlot.set(slot, [...blocks(kit), ...auditableLines(kit)]);
  }

  const row: Row = {
    slug,
    graded,
    findings: [],
    emptySlotsWithEntries: [],
    entryCount: 0,
  };

  for (const slot of SLOTS) {
    const entries = unmodeled[slot] ?? [];
    if (entries.length === 0) {
      continue;
    }
    row.entryCount += entries.length;
    const own = linesBySlot.get(slot)!;
    if (own.length === 0) {
      row.emptySlotsWithEntries.push(slot);
    }

    for (const entry of entries) {
      const head = quotedHead(entry);
      const hit = own.find(
        (line) => contains(head, line) && magnitudesAgree(head, line)
      );
      if (hit) {
        row.findings.push({
          slot,
          entry,
          head,
          tier: normalize(hit) === normalize(head) ? 'exact' : 'contained',
          score: 1,
          bestLine: hit,
        });
        continue;
      }
      const best = bestMatch(head, own, true);
      if (best.score >= NEAR_FLOOR) {
        row.findings.push({
          slot,
          entry,
          head,
          tier: 'near',
          score: best.score,
          bestLine: best.line,
        });
        continue;
      }
      // Same words, different number: the shape a kit REBALANCE leaves behind. Reported apart
      // from `unmatched` because the disposition is different — the entry names a line that still
      // exists and quotes a magnitude it no longer prints.
      const drift = bestMatch(head, own);
      if (drift.score >= NEAR_FLOOR) {
        row.findings.push({
          slot,
          entry,
          head,
          tier: 'magnitudeDrift',
          score: drift.score,
          bestLine: drift.line,
        });
        continue;
      }
      // Not in its own slot — before calling it stale, check whether another slot carries it.
      // A misfiled entry still records the behaviour; a missing one does not, and conflating the
      // two would send a reviewer looking for a kit change that never happened.
      let misfiled: { slot: Slot; score: number; line: string } | undefined;
      for (const other of SLOTS) {
        if (other === slot) {
          continue;
        }
        const lines = linesBySlot.get(other)!;
        const hitOther = lines.find(
          (line) => contains(head, line) && magnitudesAgree(head, line)
        );
        const bestOther = hitOther
          ? { score: 1, line: hitOther }
          : bestMatch(head, lines, true);
        if (
          bestOther.score >= NEAR_FLOOR &&
          bestOther.score > (misfiled?.score ?? 0)
        ) {
          misfiled = {
            slot: other,
            score: bestOther.score,
            line: bestOther.line,
          };
        }
      }
      if (misfiled) {
        row.findings.push({
          slot,
          entry,
          head,
          tier: 'misfiled',
          score: misfiled.score,
          bestLine: misfiled.line,
          matchedSlot: misfiled.slot,
        });
        continue;
      }
      row.findings.push({
        slot,
        entry,
        head,
        tier: 'unmatched',
        score: best.score,
        bestLine: best.line,
      });
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
    const override = JSON.parse(
      readFileSync(new URL(file, OVERRIDES_DIR), 'utf8')
    ) as Record<string, unknown>;
    const entryTotal = Object.values(
      (override.unmodeled ?? {}) as Record<string, string[] | undefined>
    ).reduce((a, v) => a + (v?.length ?? 0), 0);
    const skills = characters?.[slug]?.skills;
    if (!skills) {
      if (entryTotal > 0) {
        noKitText.push(slug);
      }
      continue;
    }
    if (!status[slug]) {
      noStatusEntry.push(slug);
    }
    rows.push(auditUnit(slug, skills, override, Boolean(status[slug]?.board)));
  }
  return { rows, noKitText, noStatusEntry };
}

/**
 * The tiers that are FINDINGS — an entry the kit does not back as filed. `near` is deliberately
 * out: a paraphrase is a writing-style difference, not a record defect.
 */
export const WORKLIST_TIERS: readonly Tier[] = [
  'unmatched',
  'magnitudeDrift',
  'misfiled',
];

export function isWorklist(f: EntryFinding): boolean {
  return WORKLIST_TIERS.includes(f.tier);
}

export function isAccepted(slug: string, head: string): boolean {
  return ACCEPTED.some(
    (a) => a.slug === slug && head.startsWith(a.headStartsWith)
  );
}

function tierCounts(rows: Row[]): Record<Tier, number> {
  const counts: Record<Tier, number> = {
    exact: 0,
    contained: 0,
    near: 0,
    magnitudeDrift: 0,
    misfiled: 0,
    unmatched: 0,
  };
  for (const r of rows) {
    for (const f of r.findings) {
      counts[f.tier]++;
    }
  }
  return counts;
}

function printTier(rows: Row[], tier: Tier): void {
  const hits = rows.filter((r) => r.findings.some((f) => f.tier === tier));
  if (hits.length === 0) {
    console.log('  (none)');
    return;
  }
  for (const r of hits) {
    console.log(`  ${r.slug}${r.graded ? '  [graded]' : ''}`);
    for (const f of r.findings.filter((f) => f.tier === tier)) {
      const where = f.tier === 'misfiled' ? ` → actually ${f.matchedSlot}` : '';
      console.log(
        `      ${f.slot.padEnd(6)}${where} ${f.head.slice(0, 100)}\n` +
          `             ↳ best ${f.score.toFixed(2)} vs: ${f.bestLine.slice(0, 90) || '(no kit line in slot)'}`
      );
    }
  }
}

function explain(slug: string): void {
  const characters = JSON.parse(readFileSync(CHARACTERS, 'utf8')).characters;
  const skills = characters?.[slug]?.skills;
  const overrideUrl = new URL(`${slug}.json`, OVERRIDES_DIR);
  if (!existsSync(overrideUrl)) {
    console.error(
      `census-unmodeled-entries: no override at src/skills/overrides/${slug}.json`
    );
    process.exit(2);
  }
  if (!skills) {
    console.error(
      `census-unmodeled-entries: no data/characters.json kit for '${slug}' — entries cannot be scored`
    );
    process.exit(2);
  }
  const override = JSON.parse(readFileSync(overrideUrl, 'utf8'));
  const status = JSON.parse(readFileSync(KIT_STATUS, 'utf8')).units;
  const row = auditUnit(slug, skills, override, Boolean(status[slug]?.board));
  if (row.findings.length === 0) {
    console.log(`${slug}: no \`unmodeled\` entries.`);
    return;
  }
  for (const f of row.findings) {
    console.log(
      `\n${slug} · ${f.slot} · ${f.tier.toUpperCase()}${f.matchedSlot ? ` (matches ${f.matchedSlot})` : ''} · score ${f.score.toFixed(2)}`
    );
    console.log(`  ENTRY  ${f.entry.slice(0, 300)}`);
    console.log(`  HEAD   ${f.head.slice(0, 200)}`);
    console.log(
      `  LINE   ${f.bestLine.slice(0, 200) || '(no kit line matched)'}`
    );
    if (f.tier === 'unmatched' || f.tier === 'near') {
      const missing = [...new Set(tokens(f.head))].filter(
        (t) => !new Set(tokens(f.bestLine)).has(t)
      );
      console.log(
        `  ENTRY TOKENS NOT IN LINE: ${missing.join(' ') || '(none)'}`
      );
    }
  }
}

function main(): void {
  const argv = process.argv.slice(2);
  const explainAt = argv.indexOf('--explain');
  if (explainAt !== -1) {
    const slug = argv[explainAt + 1];
    if (!slug || slug.startsWith('--')) {
      console.error('census-unmodeled-entries: --explain needs a slug');
      process.exit(2);
    }
    explain(slug);
    return;
  }
  const known = new Set([
    '--all',
    '--tail',
    '--graded',
    '--skipped',
    '--histogram',
    '--json',
    '--check',
  ]);
  const unknown = argv.filter((a) => !known.has(a));
  if (unknown.length > 0) {
    console.error(
      `census-unmodeled-entries: unrecognised argument(s): ${unknown.join(', ')}\n` +
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

  if (argv.includes('--histogram')) {
    const buckets = new Map<string, number>();
    for (const r of rows) {
      for (const f of r.findings) {
        const b = (Math.floor(f.score * 10) / 10).toFixed(1);
        buckets.set(b, (buckets.get(b) ?? 0) + 1);
      }
    }
    console.log(
      'MATCH-SCORE DISTRIBUTION (coverage of entry head by best kit line)'
    );
    for (const b of [...buckets.keys()].sort()) {
      const n = buckets.get(b)!;
      console.log(
        `  ${b}  ${String(n).padStart(4)}  ${'█'.repeat(Math.ceil(n / 4))}`
      );
    }
    console.log(
      `  NEAR_FLOOR = ${NEAR_FLOOR} — below it an entry with no containment hit reads UNMATCHED`
    );
    return;
  }

  if (argv.includes('--skipped')) {
    console.log('WHAT THIS CENSUS COULD NOT SEE');
    console.log(
      '  an entry that quotes a real kit line, in the right slot, describing behaviour that is in ' +
        'fact MODELLED — clean here, and only the per-unit read can falsify it'
    );
    console.log(
      '  a kit line that SHOULD have an entry and has none — this axis audits entries that exist ' +
        '(magnitudes are axis 1: scripts/census-kit-numbers.ts)'
    );
    console.log(
      '  staleness relative to kit text the roster sync has not pulled: scored against today’s ' +
        'data/characters.json'
    );
    const empties = rows.flatMap((r) =>
      r.emptySlotsWithEntries.map((s) => `${r.slug}.${s}`)
    );
    console.log(
      `  ${empties.length} slot(s) carrying entries while shipping NO kit text${
        empties.length ? `: ${empties.join(', ')}` : ''
      }`
    );
    console.log(
      `  ${noKitText.length} override(s) with entries but no characters.json kit at all${
        noKitText.length ? `: ${noKitText.join(', ')}` : ''
      }`
    );
    console.log(
      `  ${noStatusEntry.length} override(s) absent from kit-status.json (counted as tail)${
        noStatusEntry.length ? `: ${noStatusEntry.join(', ')}` : ''
      }`
    );
    return;
  }

  const counts = tierCounts(rows);
  const worklist = WORKLIST_TIERS.reduce((a, t) => a + counts[t], 0);

  console.log(
    `UNMATCHED — no kit line in the unit's kit resembles this entry (${counts.unmatched}):`
  );
  printTier(rows, 'unmatched');
  console.log(
    `\nMAGNITUDE DRIFT — the entry quotes the line but not the number the kit now prints ` +
      `(${counts.magnitudeDrift}):`
  );
  printTier(rows, 'magnitudeDrift');
  console.log(
    `\nMISFILED — the entry matches a kit line in a DIFFERENT slot (${counts.misfiled}):`
  );
  printTier(rows, 'misfiled');

  if (argv.includes('--all')) {
    console.log(
      `\nNEAR — matched by token overlap only, not containment (${counts.near}):`
    );
    printTier(rows, 'near');
  }

  const graded = rows.filter((r) => r.graded);
  const tail = rows.filter((r) => !r.graded);
  const wl = (rs: Row[]) =>
    rs.reduce((a, r) => a + r.findings.filter(isWorklist).length, 0);
  console.log(
    `\n${rows.reduce((a, r) => a + r.entryCount, 0)} entr(ies) across ${rows.filter((r) => r.entryCount > 0).length} unit(s) · ` +
      `exact ${counts.exact} / contained ${counts.contained} / near ${counts.near} / ` +
      `magnitude-drift ${counts.magnitudeDrift} / misfiled ${counts.misfiled} / unmatched ${counts.unmatched}`
  );
  console.log(
    `CALIBRATION vs the sweep-read graded slice: worklist ${wl(graded)} graded (${graded.reduce((a, r) => a + r.entryCount, 0)} entries) ` +
      `vs ${wl(tail)} tail (${tail.reduce((a, r) => a + r.entryCount, 0)} entries)`
  );
  console.log(
    'A clean row means the entry QUOTES A LINE THE KIT PRINTS — never that the line is really ' +
      'unmodelled. Run --skipped for what this census cannot see.'
  );

  if (argv.includes('--check')) {
    const unexpected = rows.flatMap((r) =>
      r.findings
        .filter(isWorklist)
        .filter((f) => !isAccepted(r.slug, f.head))
        .map((f) => `${r.slug} ${f.slot} [${f.tier}]: ${f.head.slice(0, 120)}`)
    );
    if (ACCEPTED.length > 0) {
      console.log(
        `\n${ACCEPTED.length} accepted finding(s) (known matcher blind spots, not defects): ` +
          ACCEPTED.map(
            (a) => `${a.slug} "${a.headStartsWith.slice(0, 40)}"`
          ).join(', ')
      );
    }
    if (unexpected.length > 0) {
      console.error(
        `\n${unexpected.length} \`unmodeled\` entr(ies) that no kit line backs, or that are filed under ` +
          `the wrong slot — retire the entry, re-file it, or add it to ACCEPTED with the reason ` +
          `the matcher cannot see it:\n    ` +
          unexpected.join('\n    ')
      );
      process.exitCode = 1;
    }
  }
  if (worklist === 0) {
    console.log('worklist: empty.');
  }
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split('/').pop()!)
) {
  main();
}
