// gen-unmodeled-review.ts — aggregate every `unmodeled` kit line across shipped overrides
// into a single review doc with inferred overarching-reason counts.
//
//   npx tsx scripts/gen-unmodeled-review.ts            # regenerate docs/unmodeled-entries-review.md
//   npx tsx scripts/gen-unmodeled-review.ts --check     # verify.sh gate: committed doc == regenerated
//
// TWO-STEP CHAIN (the reason both guards below exist). This doc is the SECOND link in
// overrides → data/kit-status.json (kit-status.ts --refresh) → this doc. Only the first link was
// gated, which left two ways to ship a stale doc and stay green:
//   1. verify.sh checked kit-status.json against the overrides but never this doc against
//      kit-status.json, so a doc regenerated one commit too early passed (it did, 2026-08-09 —
//      it carried a superseded anchor-innocent-maid entry through a green verify until a
//      cross-family code review caught it). `--check` closes that.
//   2. Running THIS script alone looks like a successful refresh even when kit-status.json is
//      itself stale — it prints "Wrote … with N entries" either way. The staleMirrors() gate
//      below refuses to write in that case and names the command you actually needed.
import { readFileSync, writeFileSync } from 'node:fs';
import { staleMirrors } from './lib/kit-status-mirrors.js';

const ROOT = new URL('../', import.meta.url);
const KIT_STATUS = new URL('data/kit-status.json', ROOT);
const OUT = new URL('docs/unmodeled-entries-review.md', ROOT);

interface UnitEntry {
  name: string;
  unmodeled: Record<string, string[]>;
  caveats?: string[];
  note?: string;
}

const status: Record<string, UnitEntry> = JSON.parse(
  readFileSync(KIT_STATUS, 'utf8')
).units;

const slots = ['skill1', 'skill2', 'burst'] as const;

// Kit-template words shared by nearly every skill line and caveat \u2014 overlap on
// them says nothing about whether a caveat explains THIS line, so they never score.
const STOPWORDS = new Set([
  'activates',
  'activate',
  'affects',
  'affect',
  'allies',
  'ally',
  'battle',
  'caster',
  'continuously',
  'damage',
  'deals',
  'effect',
  'effects',
  'enemy',
  'enemies',
  'final',
  'once',
  'recover',
  'recovers',
  'restores',
  'self',
  'skill',
  'this',
  'that',
  'time',
  'times',
  'unit',
  'units',
  'user',
  'when',
  'while',
  'with',
]);

// Tokenize a string into meaningful words (>=4 chars, letters/digits/emoji arrows ok).
function tokens(s: string): string[] {
  return (s.toLowerCase().match(/[\u25b2\u25bc\u2192a-z0-9%.]+/g) ?? []).filter(
    (t) => t.length >= 4 && !/^[0-9.]+x?$/.test(t) && !STOPWORDS.has(t)
  );
}

// Slot labels declared at the head of a caveat ("skill1: \u2026", "skill2/burst: \u2026",
// "S2 'Taunt\u2026' UNMODELED", "burst: \u2026"). A caveat that names slots is only ever a
// candidate Why for entries in one of those slots.
function declaredSlots(text: string): Set<string> | undefined {
  const head = text.slice(0, 60).toLowerCase();
  const found = head.match(/\b(skill1|skill2|burst|s1|s2)\b/g);
  if (!found) {
    return undefined;
  }
  const alias: Record<string, string> = { s1: 'skill1', s2: 'skill2' };
  return new Set(found.map((t) => alias[t] ?? t));
}

// Find the caveat most likely explaining this unmodeled entry. Guarded against
// the mispairing failure mode (a skill1 line citing a burst caveat because both
// said "Max HP"): slot-declared caveats never cross slots, numeric tokens
// ("3.99%", "\u25b226.66") weigh 3\u00d7 as near-unique line identifiers, and a low-score
// generic-word overlap is rejected outright rather than paired wrongly \u2014 the
// caller then falls back to the honest 'See unit note / caveats'.
function bestMatchingText(
  entry: string,
  slot: string,
  sources: (string[] | string | undefined)[]
): { text: string; score: number } | undefined {
  const entryTokens = new Set(tokens(entry));
  let best: { text: string; score: number } | undefined;
  for (const src of sources) {
    const list = Array.isArray(src) ? src : src ? [src] : [];
    for (const c of list) {
      const slots = declaredSlots(c);
      if (slots && !slots.has(slot)) {
        continue;
      }
      const cTokens = new Set(tokens(c));
      let score = 0;
      let numericHit = false;
      for (const t of entryTokens) {
        if (cTokens.has(t)) {
          const numeric = /\d/.test(t);
          score += t.length * (numeric ? 3 : 1);
          numericHit ||= numeric;
        }
      }
      if (slots?.has(slot)) {
        score += 8;
      }
      if (score === 0 || (!numericHit && score < 15)) {
        continue;
      }
      if (!best || score > best.score) {
        best = { text: c, score };
      }
    }
  }
  return best;
}

function matchingCaveat(
  entry: string,
  slot: string,
  caveats: string[] | undefined,
  note: string | undefined
): string | undefined {
  // Prefer a caveat, fall back to a matching note paragraph.
  const fromCaveat = bestMatchingText(entry, slot, [caveats]);
  if (fromCaveat) {
    return fromCaveat.text;
  }
  const fromNote = note
    ? bestMatchingText(entry, slot, [
        note.split(/\.\s+/).filter((p) => p.length > 20),
      ])
    : undefined;
  return fromNote?.text;
}

function normalize(s: string): string {
  return s.toLowerCase();
}

function classify(
  entry: string,
  caveat: string | undefined,
  note: string | undefined
): string {
  const text = normalize(entry + ' ' + (caveat ?? '') + ' ' + (note ?? ''));
  const entryNorm = normalize(entry);

  // Entry-only signals first (the kit text itself tells us the bucket).
  if (
    /explosion radius|\bsplash\b|area of effect|aoe\b|stack count of debuffs|remove .*debuff|removes .*debuff|damage taken ▼|ally mitigation|enemy .*atk▼|def▼ .* enemy/.test(
      entryNorm
    )
  ) {
    return 'Missing engine primitive / trigger';
  }
  if (
    /def ▲|def ▼|max hp|cover|restores .* hp|as hp|invulnerable|potency of hp|dodging bullets|decoy|shield/.test(
      entryNorm
    )
  ) {
    return 'Defensive / HP / shield / aggro';
  }
  if (
    /cancels |mode:|stance|user-selectable|transformation status|highlight status|maillard|blanching|everyone's star|my own star|possession|ghost|neutralized/.test(
      entryNorm
    )
  ) {
    return 'Out-of-domain / parser unsupported';
  }
  if (/hit rate ▲ .*round|round\(s\)/.test(entryNorm)) {
    return 'Weapon-state / shot-count approximation';
  }

  if (
    /no .*primitive|no schema|no engine primitive|no such primitive|no .*trigger|no self-status gate|no buff-stack gate|no stack-count amplifier|no remove-buff|no consume-status|no live stack-mirror|no redistribution primitive|no enemy-atk debuff primitive|no cover\/hp pool|unexpressible|not representable|no statkey|no ammo-refill primitive/.test(
      text
    )
  ) {
    return 'Missing engine primitive / trigger';
  }
  if (
    /no hp pool|hp pool|defensive|shield|taunt|aggro|incoming-damage model|no incoming damage|damage redistribution|cover hp|cover-hp|restores .*cover|incoming healing|indomitability|lethal damage|no heal amounts/.test(
      text
    )
  ) {
    return 'Defensive / HP / shield / aggro';
  }
  if (
    /partsdamagepct|interruption parts|destructible parts|partless/.test(text)
  ) {
    return 'Partless boss';
  }
  if (/calm|self-status|buff-stack gate|stack gate|status gate/.test(text)) {
    return 'Self-status / stack gate';
  }
  if (/\bchance\b|\brandom\b|\brng\b|\bprobability\b|30% chance/.test(text)) {
    return 'RNG / probabilistic';
  }
  if (
    /ammo-refill|reload .*magazine|maxammo|pullspersec|reloadframes|shot-count|pellet|weapon-swap|swap weapon|range-band/.test(
      text
    )
  ) {
    return 'Weapon-state / shot-count approximation';
  }
  if (
    /unmeasured|unverified|datamine-unreliable|measurement-gated|read .*video|read .*footage/.test(
      text
    )
  ) {
    return 'Measurement-gated / unverified cadence';
  }
  if (
    /out-of-domain|not a kit line|data gap|unsupported|parser skipped/.test(
      text
    )
  ) {
    return 'Out-of-domain / parser unsupported';
  }
  return 'Other / see caveats';
}

const entries: {
  slug: string;
  name: string;
  slot: string;
  line: string;
  category: string;
  reason: string;
}[] = [];

for (const [slug, u] of Object.entries(status).sort(([a], [b]) =>
  a.localeCompare(b)
)) {
  if (!u.unmodeled) {
    continue;
  }
  for (const slot of slots) {
    for (const line of u.unmodeled[slot] ?? []) {
      const caveat = matchingCaveat(line, slot, u.caveats, u.note);
      const category = classify(line, caveat, u.note);
      entries.push({
        slug,
        name: u.name,
        slot,
        line: line.trim(),
        category,
        reason: caveat?.trim() ?? 'See unit note / caveats',
      });
    }
  }
}

const counts = new Map<string, number>();
for (const e of entries) {
  counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
}
const sortedCounts = [...counts.entries()].sort((a, b) => b[1] - a[1]);

const total = entries.length;

let md = `# Unmodeled kit entries review

> **AI-facing triage inventory.** This doc aggregates every line currently filed under an override's
> \\"unmodeled\\" field, groups it by the overarching reason it cannot be expressed in v1, and cites the
> unit caveat that explains the skip. It is generated by \\"npx tsx scripts/gen-unmodeled-review.ts\\".
>
> **Scope:** shipped overrides in \\"src/skills/overrides/*.json\\" (synthetic/noop units excluded). Generated
> from \\"data/kit-status.json\\", which mirrors the live override files.

## Summary counts

| Reason | Entries | Share |
| --- | --- | --- |
`;
for (const [cat, n] of sortedCounts) {
  md += `| ${cat} | ${n} | ${((n / total) * 100).toFixed(1)}% |\n`;
}
md += `| **Total** | **${total}** | 100.0% |\n\n`;

md += `## Entries by reason\n\n`;
for (const [cat, n] of sortedCounts) {
  md += `### ${cat} (${n})\n\n`;
  const catEntries = entries.filter((e) => e.category === cat);
  let currentSlug = '';
  for (const e of catEntries) {
    if (e.slug !== currentSlug) {
      if (currentSlug) {
        md += '\n';
      }
      currentSlug = e.slug;
      md += `**${e.name}** (${e.slug})\n\n`;
    }
    md += `- **${e.slot}:** ${e.line}\n`;
    md += `  - *Why:* ${e.reason}\n`;
  }
  md += '\n';
}

const mode = process.argv[2];

if (mode === '--check') {
  // Gate only. Freshness of kit-status.json itself is verify.sh's job — it runs
  // `kit-status.ts --check` immediately before this, so by here the mirrors are known good.
  let committed: string;
  try {
    committed = readFileSync(OUT, 'utf8');
  } catch {
    console.error(
      `unmodeled-review check FAILED: ${OUT.pathname} missing — run: npx tsx scripts/gen-unmodeled-review.ts`
    );
    process.exit(1);
  }
  if (committed !== md) {
    console.error(
      'unmodeled-review check FAILED: docs/unmodeled-entries-review.md is stale vs data/kit-status.json.'
    );
    console.error(
      '  fix: npx tsx scripts/kit-status.ts --refresh && npx tsx scripts/gen-unmodeled-review.ts'
    );
    process.exit(1);
  }
  console.log(`unmodeled-review check OK (${total} entries)`);
} else if (mode != null) {
  console.error('usage: gen-unmodeled-review.ts [--check]');
  process.exit(2);
} else {
  // Writing from stale mirrors is the failure this refuses to perform silently: the output would
  // look freshly generated while describing overrides as they were N commits ago.
  const stale = staleMirrors();
  if (stale.length) {
    console.error(
      'gen-unmodeled-review: data/kit-status.json is STALE vs the overrides — refusing to write a doc derived from it.'
    );
    stale.slice(0, 10).forEach((e) => console.error('  - ' + e));
    if (stale.length > 10) {
      console.error(`  … and ${stale.length - 10} more`);
    }
    console.error(
      '  fix: npx tsx scripts/kit-status.ts --refresh   (then re-run this)'
    );
    process.exit(1);
  }
  writeFileSync(OUT, md, 'utf8');
  console.log(
    `Wrote ${OUT.pathname} with ${total} unmodeled entries across ${sortedCounts.length} categories.`
  );
}
