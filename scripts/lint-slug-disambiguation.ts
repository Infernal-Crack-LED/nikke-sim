// lint-slug-disambiguation.ts — flag ambiguous BASE unit-names in a blob of text.
// Many NIKKEs share a base name with a variant that is an ENTIRELY DIFFERENT unit
// (different kit/weapon/element/slug) — conflating them is a P0-class error. This scans
// stdin (or a file arg) for a bare base-name used WITHOUT its disambiguating variant, and
// prints, for each hit, the actual candidates so the exact slug can be chosen.
//
//   npx tsx scripts/lint-slug-disambiguation.ts [file]   (else reads stdin)
//   exit 0 always (advisory); prints "AMBIGUOUS: ..." lines to stdout when it finds any.
import { readFileSync } from 'node:fs';

const raw = JSON.parse(readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8'));
const chars: Record<string, any> = raw.characters || raw;

// base name = display name up to the first ':' (variants are "Base: Variant"); group slugs by base.
const byBase = new Map<string, { slug: string; w: string; el: string }[]>();
for (const [slug, c] of Object.entries(chars)) {
  const name: string = (c as any)?.name;
  if (!name) continue;
  const base = name.split(':')[0].trim();
  (byBase.get(base) ?? byBase.set(base, []).get(base)!).push({
    slug,
    w: (c as any).weapon ?? '?',
    el: (c as any).element ?? '?',
  });
}
// ambiguous = a base shared by >= 2 distinct units
const ambiguous = [...byBase.entries()].filter(([, v]) => v.length >= 2);

const text = process.argv[2] ? readFileSync(process.argv[2], 'utf8') : readFileSync(0, 'utf8');

let hits = 0;
for (const [base, variants] of ambiguous) {
  // match the base name as a whole phrase NOT immediately followed by ':' (i.e. used bare,
  // not as part of a full "Base: Variant" name). Case-insensitive, word-bounded.
  const esc = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^\\w:])${esc}(?![\\w:])(?!\\s*:)`, 'gi');
  if (re.test(text)) {
    hits++;
    const opts = variants.map((v) => `${v.slug} (${v.w}/${v.el})`).join('  |  ');
    console.log(`AMBIGUOUS BASE "${base}" used bare → which one? ${opts}`);
  }
}
if (hits > 0) {
  console.log(`(${hits} ambiguous base-name${hits > 1 ? 's' : ''} — confirm the exact slug before this lands; conflating base/variant is P0.)`);
}
process.exit(0);
