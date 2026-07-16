// lint-slug-disambiguation.ts — flag ambiguous BASE unit-names in a blob of text.
// Many NIKKEs share a base name with a variant that is an ENTIRELY DIFFERENT unit
// (different kit/weapon/element/slug) — conflating them is a P0-class error. This scans
// stdin (or a file arg) for a bare base-name used WITHOUT its disambiguating variant, and
// prints, for each hit, the actual candidates so the exact slug can be chosen.
//
// APPROVED-NICKNAME AWARE: characters.json carries per-unit `nicknames` (sync-derived
// from bakery-bot aliases; the derivation drops anything ambiguous, see
// src/data/nicknames.ts). An approved nickname maps to exactly ONE slug, so its use is
// never ambiguous — occurrences are masked out before scanning (a nickname that embeds
// a base name, like "neo neon", must not false-positive as a bare base). The standing
// rule: refer to units by FULL name/slug or an approved nickname, nothing else.
//
//   npx tsx scripts/lint-slug-disambiguation.ts [file]   (else reads stdin)
//   exit 0 always (advisory); prints "AMBIGUOUS: ..." lines to stdout when it finds any.
import { readFileSync } from 'node:fs';

const raw = JSON.parse(readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8'));
const chars: Record<string, any> = raw.characters || raw;

// base name = display name up to the first ':' (variants are "Base: Variant"); group slugs by base.
const byBase = new Map<string, { slug: string; w: string; el: string; nicks: string[] }[]>();
const nicknames: string[] = [];
for (const [slug, c] of Object.entries(chars)) {
  const name: string = (c as any)?.name;
  if (!name) continue;
  const nicks: string[] = (c as any).nicknames ?? [];
  nicknames.push(...nicks);
  // " (Treasure)" is a favorite-item marker, not part of the name — strip it so
  // "Helm (Treasure)" and "Helm: Aquamarine" group under the same base "Helm"
  const base = name.replace(' (Treasure)', '').split(':')[0].trim();
  (byBase.get(base) ?? byBase.set(base, []).get(base)!).push({
    slug,
    w: (c as any).weapon ?? '?',
    el: (c as any).element ?? '?',
    nicks,
  });
}
// ambiguous = a base shared by >= 2 distinct units
const ambiguous = [...byBase.entries()].filter(([, v]) => v.length >= 2);

const text = process.argv[2] ? readFileSync(process.argv[2], 'utf8') : readFileSync(0, 'utf8');

const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// mask approved-nickname occurrences (longest first, whole-word) so a nickname is
// never misread as a bare base name
let scan = text;
for (const n of [...new Set(nicknames)].sort((a, b) => b.length - a.length)) {
  scan = scan.replace(new RegExp(`(^|[^\\w])${escRe(n)}(?![\\w])`, 'gi'), '$1§');
}

let hits = 0;
for (const [base, variants] of ambiguous) {
  // match the base name as a whole phrase NOT immediately followed by ':' (i.e. used bare,
  // not as part of a full "Base: Variant" name). Case-insensitive, word-bounded.
  const re = new RegExp(`(^|[^\\w:])${escRe(base)}(?![\\w:])(?!\\s*:)`, 'gi');
  if (re.test(scan)) {
    hits++;
    const opts = variants
      .map((v) => `${v.slug} (${v.w}/${v.el}${v.nicks.length ? `, aka ${v.nicks.map((n) => `"${n}"`).join('/')}` : ''})`)
      .join('  |  ');
    console.log(`AMBIGUOUS BASE "${base}" used bare → which one? ${opts}`);
  }
}
if (hits > 0) {
  console.log(`(${hits} ambiguous base-name${hits > 1 ? 's' : ''} — confirm the exact slug before this lands; conflating base/variant is P0. Refer to units by FULL name/slug or an APPROVED nickname — the "aka" list above.)`);
}
process.exit(0);
