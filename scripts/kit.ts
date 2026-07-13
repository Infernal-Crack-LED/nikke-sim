// Dump everything an override author needs for one character:
//   npx tsx scripts/kit.ts <slug>
// Prints character data, raw skill prose, the parser's current structured
// blocks (with any existing override applied), and outstanding warnings.
import { readFileSync } from 'node:fs';
import { resolveSkills } from '../src/skills/index.js';
import { loadOverride } from '../src/skills/overrides-node.js';

const slug = process.argv[2];
if (!slug) {
  console.error('usage: npx tsx scripts/kit.ts <slug>');
  process.exit(1);
}
const data = JSON.parse(readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8'));
const c = data.characters[slug];
if (!c) {
  console.error(`unknown slug "${slug}"`);
  process.exit(1);
}

const { skills, baseStats, ...meta } = c;
console.log('=== character ===');
console.log(JSON.stringify(meta, null, 1));
for (const slot of ['skill1', 'skill2', 'burst'] as const) {
  console.log(`\n=== ${slot} text ===`);
  console.log(skills[slot] || '(none)');
}

const resolved = resolveSkills(c, loadOverride(slug));
console.log(`\n=== parsed blocks (source: ${resolved.source}) ===`);
console.log(JSON.stringify(resolved.blocks, null, 1));
console.log('\n=== warnings ===');
resolved.warnings.forEach((w) => console.log('- ' + w));
if (!resolved.warnings.length) console.log('(none)');
