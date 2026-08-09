// gen-unmodeled-review.ts — aggregate every `unmodeled` kit line across shipped overrides
// into a single review doc with inferred overarching-reason counts.
//
// Usage: npx tsx scripts/gen-unmodeled-review.ts
// Output: docs/unmodeled-entries-review.md
import { readFileSync, writeFileSync } from 'node:fs';

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

// Tokenize a string into meaningful words (>=4 chars, letters/digits/emoji arrows ok).
function tokens(s: string): string[] {
  return (s.toLowerCase().match(/[\u25b2\u25bc\u2192a-z0-9%.]+/g) ?? []).filter(
    (t) => t.length >= 4 && !/^[0-9.]+x?$/.test(t)
  );
}

// Find the caveat most likely explaining this unmodeled entry.
function bestMatchingText(
  entry: string,
  sources: (string[] | string | undefined)[]
): { text: string; score: number } | undefined {
  const entryTokens = new Set(tokens(entry));
  let best: { text: string; score: number } | undefined;
  for (const src of sources) {
    const list = Array.isArray(src) ? src : src ? [src] : [];
    for (const c of list) {
      const cTokens = new Set(tokens(c));
      let score = 0;
      for (const t of entryTokens) {
        if (cTokens.has(t)) {
          score += t.length;
        }
      }
      if (score > 0 && (!best || score > best.score)) {
        best = { text: c, score };
      }
    }
  }
  return best;
}

function matchingCaveat(
  entry: string,
  caveats: string[] | undefined,
  note: string | undefined
): string | undefined {
  // Prefer a caveat, fall back to a matching note paragraph.
  const fromCaveat = bestMatchingText(entry, [caveats]);
  if (fromCaveat) {
    return fromCaveat.text;
  }
  const fromNote = note
    ? bestMatchingText(entry, [
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
      const caveat = matchingCaveat(line, u.caveats, u.note);
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

writeFileSync(OUT, md, 'utf8');
console.log(
  `Wrote ${OUT.pathname} with ${total} unmodeled entries across ${sortedCounts.length} categories.`
);
