// backfill-unmodeled-heal-magnitudes.ts — file every inert HP-restore MAGNITUDE under the
// override's `unmodeled` record, instead of leaving it in `note`/`caveats` prose.
//
//   npx tsx scripts/backfill-unmodeled-heal-magnitudes.ts --check   # what it would write
//   npx tsx scripts/backfill-unmodeled-heal-magnitudes.ts --write   # do it
//
// OWNER RULING 2026-08-11: "We should record all unmodeled behavior as unmodeled rather than
// leaving it in prose." This is the enactment for the class that raised the question — the
// half-populated heal-magnitude record surfaced by `scripts/census-kit-numbers.ts`
// (docs/handoffs/2026-08-11-faithfulness-tail-plan.md §5): of 92 heal-magnitude kit lines across
// 62 units, 42 were structurally recorded and 50 were not.
//
// WHY THE RECORD MATTERS THOUGH THE VALUE DOES NOT. A heal's AMOUNT has no engine consumer — the
// sim has no HP pool — so nothing here moves damage. What moves is trust in the field: `unmodeled`
// is what `data/kit-status.json`, `scripts/gen-unmodeled-review.ts` and every reviewer's grep read
// to answer "what does this model skip?". Half-populated, it silently under-reports; the ruling
// makes it a complete index.
//
// SCOPE IS DELIBERATELY NARROW — this script only ever touches the HEAL-MAGNITUDE class, and only
// where the census says the number is missing from the structured record. It is not a general
// "generate prose into overrides" tool: `src/skills/overrides/**` is a protected path, the prose
// there is machine-read (kit-status provenance sniffing + the generated review doc), and a
// mass-authoring instrument aimed at it is exactly the wrong thing to leave lying around.
//
// WHAT IT WRITES, and why it is honest. Every one of these lines already has its recovery EVENT
// modelled — a `heal` effect somewhere in the override (for `sin` in the `burst` slot, where her
// "when using Burst Skill" trigger belongs, though the kit prints the clause under skill 2). So
// the entry records exactly what is missing (the amount) and what is not (the event), in the
// established `ada` wording — NOT a bare "unmodeled", which would wrongly imply the recovery
// channel is absent and invite someone to "fix" it by adding a second emitter.
//
// SAFETY. It edits the `unmodeled` arrays as TEXT and leaves the rest of each file byte-identical:
// a whole-file JSON round-trip is NOT safe here (prettier's objectWrap:preserve keeps whatever
// wrapping the file already has, so re-stringifying would reformat ~94 overrides into a diff that
// buries the real change). Idempotent: an entry whose kit line is already recorded is skipped, so
// re-running after a roster sync only picks up genuinely new lines.
import { readFileSync, writeFileSync } from 'node:fs';
import { census, type Row } from './census-kit-numbers.js';

const OVERRIDES_DIR = new URL('../src/skills/overrides/', import.meta.url);

/** Scan a JSON array starting at `open` (the '[') and return the index just past its ']'. */
function arrayEnd(raw: string, open: number): number {
  let depth = 0;
  let inString = false;
  for (let i = open; i < raw.length; i++) {
    const c = raw[i];
    if (inString) {
      if (c === '\\') {
        i++;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
    } else if (c === '[') {
      depth++;
    } else if (c === ']') {
      depth--;
      if (depth === 0) {
        return i + 1;
      }
    }
  }
  throw new Error('unterminated array');
}

/**
 * The `"unmodeled": { … }` region, so a slot key elsewhere in the file is never matched.
 *
 * The key scan is a plain `indexOf`, which would mis-locate if a `note` mentioned the field name
 * in escaped quotes BEFORE the real key. Guarded rather than assumed: the match must be followed
 * by `:` and then `{`, so a prose mention throws loudly instead of splicing the wrong region.
 */
function unmodeledRegion(raw: string): [number, number] {
  let key = -1;
  for (
    let at = raw.indexOf('"unmodeled"');
    at !== -1;
    at = raw.indexOf('"unmodeled"', at + 1)
  ) {
    if (/^\s*:\s*\{/.test(raw.slice(at + '"unmodeled"'.length))) {
      key = at;
      break;
    }
  }
  if (key === -1) {
    throw new Error('no unmodeled field (or only prose mentions of it)');
  }
  const open = raw.indexOf('{', key);
  let depth = 0;
  let inString = false;
  for (let i = open; i < raw.length; i++) {
    const c = raw[i];
    if (inString) {
      if (c === '\\') {
        i++;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
    } else if (c === '{') {
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) {
        return [open, i + 1];
      }
    }
  }
  throw new Error('unterminated unmodeled object');
}

export function insertEntries(
  raw: string,
  slot: string,
  additions: string[]
): string {
  if (additions.length === 0) {
    return raw;
  }
  const [regionStart, regionEnd] = unmodeledRegion(raw);
  const region = raw.slice(regionStart, regionEnd);
  // Same guard as unmodeledRegion: the slot key must be followed by `: [`, so an entry whose
  // TEXT contains `"burst"` cannot be mistaken for the key.
  let keyAt = -1;
  for (
    let at = region.indexOf(`"${slot}"`);
    at !== -1;
    at = region.indexOf(`"${slot}"`, at + 1)
  ) {
    if (/^\s*:\s*\[/.test(region.slice(at + slot.length + 2))) {
      keyAt = at;
      break;
    }
  }
  if (keyAt === -1) {
    throw new Error(`unmodeled has no "${slot}" key`);
  }
  const open = region.indexOf('[', keyAt);
  const close = arrayEnd(region, open);
  const existing = JSON.parse(region.slice(open, close)) as string[];
  const merged = [...existing, ...additions];
  const rebuilt =
    '[\n' +
    merged.map((e) => `      ${JSON.stringify(e)}`).join(',\n') +
    '\n    ]';
  return (
    raw.slice(0, regionStart) +
    region.slice(0, open) +
    rebuilt +
    region.slice(close) +
    raw.slice(regionEnd)
  );
}

/** Which slots of this override actually carry a `heal` effect. */
function healSlots(override: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const slot of ['skill1', 'skill2', 'burst']) {
    const blocks = (override[slot] ?? []) as Array<{ effects?: unknown[] }>;
    const found = JSON.stringify(blocks).includes('"kind":"heal"');
    if (found) {
      out.push(slot);
    }
  }
  return out;
}

export function entryFor(line: string, slots: string[]): string {
  const where =
    slots.length === 0
      ? 'no recovery event is emitted'
      : `the recovery EVENT is modeled (heal, ${slots.join('/')} slot${slots.length > 1 ? 's' : ''})`;
  return (
    `${line} — magnitude only: the HP amount has no engine consumer (no HP pool), so the number ` +
    `is unmodeled; ${where}, which is the board-relevant half — on-recovery consumers read the ` +
    `event, never the amount.`
  );
}

function healFindings(row: Row) {
  return [...row.silent, ...row.proseOnly].filter((f) => f.kind === 'heal');
}

function main(): void {
  const argv = process.argv.slice(2);
  const write = argv.includes('--write');
  if (!write && !argv.includes('--check')) {
    console.error(
      'backfill-unmodeled-heal-magnitudes: pass --check or --write'
    );
    process.exit(2);
  }

  let units = 0;
  let entries = 0;
  let skipped = 0;
  for (const row of census().rows) {
    const findings = healFindings(row);
    if (findings.length === 0) {
      continue;
    }
    const url = new URL(`${row.slug}.json`, OVERRIDES_DIR);
    let raw = readFileSync(url, 'utf8');
    const slots = healSlots(JSON.parse(raw));
    let touched = 0;

    for (const slot of ['skill1', 'skill2', 'burst'] as const) {
      const forSlot = findings.filter((f) => f.slot === slot);
      const additions: string[] = [];
      for (const f of forSlot) {
        // Idempotence: the kit line already recorded (in any wording) is left alone.
        if (
          JSON.parse(raw).unmodeled?.[slot]?.some((e: string) =>
            e.includes(f.line)
          )
        ) {
          skipped++;
          continue;
        }
        additions.push(entryFor(f.line, slots));
      }
      if (additions.length > 0) {
        raw = insertEntries(raw, slot, additions);
        touched += additions.length;
      }
    }

    if (touched > 0) {
      units++;
      entries += touched;
      console.log(`${write ? 'wrote' : 'would write'} ${touched}  ${row.slug}`);
      if (write) {
        writeFileSync(url, raw);
      }
    }
  }
  console.log(
    `\n${entries} entr(ies) across ${units} unit(s)${skipped ? `; ${skipped} already recorded` : ''}`
  );
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split('/').pop()!)
) {
  main();
}
