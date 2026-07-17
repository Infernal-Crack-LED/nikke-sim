// Dump everything an override author needs for one character:
//   npx tsx scripts/kit.ts <slug>
// Prints character data, raw skill prose, the override's structured blocks
// (what the engine actually runs), its unmodeled kit text + caveats, and —
// for authoring reference — what the OFFLINE kit parser would emit from the
// current prose (the engine never runs the parser; overrides are complete).
import { readFileSync } from 'node:fs';
import { resolveSkills } from '../src/skills/index.js';
import { loadOverride } from '../src/skills/overrides-node.js';
import { parseSkill } from './lib/kit-parser.js';

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

const override = loadOverride(slug);
const resolved = resolveSkills(c, override);
console.log('\n=== override blocks (what the engine runs) ===');
console.log(JSON.stringify(resolved.blocks, null, 1));
console.log('\n=== unmodeled kit text ===');
const un = resolved.unmodeled;
if (un && (un.skill1.length || un.skill2.length || un.burst.length)) {
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    un[slot].forEach((l) => console.log(`- ${slot}: ${l}`));
  }
} else console.log('(none recorded)');
console.log('\n=== caveats / warnings ===');
resolved.warnings.forEach((w) => console.log('- ' + w));
if (!resolved.warnings.length) console.log('(none)');

console.log('\n=== offline parser draft (authoring reference only — NOT what runs) ===');
for (const slot of ['skill1', 'skill2', 'burst'] as const) {
  const p = parseSkill(skills[slot], slot);
  console.log(`--- ${slot}: ${p.blocks.length} block(s), ${p.warnings.length} warning(s), ${p.unmodeled.length} unmodeled line(s)`);
  if (p.blocks.length) console.log(JSON.stringify(p.blocks, null, 1));
  p.warnings.forEach((w) => console.log(`  ⚠ ${w}`));
  p.unmodeled.forEach((l) => console.log(`  ∅ ${l}`));
}
