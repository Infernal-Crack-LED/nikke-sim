// validate-nicknames.ts — gate check for the approved-nickname safety invariant.
// Every `nicknames` entry in data/characters.json must be unambiguous: an approved
// nickname resolves to exactly ONE unit and can never be read as a unit name. The
// sync-time derivation (src/data/nicknames.ts) enforces this against the FULL
// bakery-bot roster; this re-checks the checked-in file (roster-local, so a
// weaker net) to catch hand edits between syncs. Exit 1 on any violation.
import { readFileSync } from 'node:fs';

const raw = JSON.parse(readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8'));
const chars: Record<string, any> = raw.characters;

const normName = (n: string) => n.replace(' (Treasure)', '').trim().toLowerCase();

const fullNames = new Map<string, string>();
const baseOwners = new Map<string, Set<string>>();
for (const [slug, c] of Object.entries(chars)) {
  fullNames.set(normName(c.name), slug);
  const base = normName(c.name).split(':')[0].trim();
  (baseOwners.get(base) ?? baseOwners.set(base, new Set()).get(base)!).add(slug);
}

const claims = new Map<string, string[]>();
const errors: string[] = [];
for (const [slug, c] of Object.entries(chars)) {
  for (const n of c.nicknames ?? []) {
    if (n !== n.toLowerCase().trim() || !n)
      errors.push(`"${n}" (${slug}): not lowercase/trimmed/non-empty`);
    (claims.get(n) ?? claims.set(n, []).get(n)!).push(slug);
    const owner = fullNames.get(n);
    if (owner) errors.push(`"${n}" (${slug}): equals full name of ${owner}`);
    const bases = baseOwners.get(n);
    if (bases && bases.size >= 2)
      errors.push(`"${n}" (${slug}): equals ambiguous base name (${[...bases].sort().join(', ')})`);
  }
}
for (const [n, slugs] of claims)
  if (slugs.length > 1) errors.push(`"${n}": claimed by multiple units (${slugs.sort().join(', ')})`);

const total = [...claims.keys()].length;
if (errors.length) {
  console.error(`nickname validation FAILED (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`nicknames OK — ${total} approved nicknames, all unambiguous`);
