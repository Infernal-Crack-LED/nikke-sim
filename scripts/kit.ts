// Dump everything an override author needs for one character:
//   npx tsx scripts/kit.ts <slug>            # THE entry point for any per-character claim
//   npx tsx scripts/kit.ts <slug> --raw      # + the raw characters.json blob (see the warning)
// Prints character data, the RESOLVED skill prose, the override's structured blocks
// (what the engine actually runs), its unmodeled kit text + caveats, and —
// for authoring reference — what the OFFLINE kit parser would emit from the
// current prose (the engine never runs the parser; overrides are complete).
//
// ⚠ WHY `--raw` IS OPT-IN (2026-07-22). The raw blob carries the character's `role.weapon
// .shot_detail`, whose `description_localkey` fields are the BASE-KIT prose templates. For a
// Treasure unit those are NOT the text her override is synced from, and the values differ
// wildly — `privaty` reads 85.79 / 1089 / 457.87 raw vs 256.17 / 1687 / 1407.64 Treasure. A
// 2026-07-22 session scraped `description_localkey` out of this dump instead of reading the
// `=== skillN text ===` sections printed a few lines below, concluded a real kit mechanic
// ("Designated Target status") had been invented by the override author, and had to walk it
// back. The `=== skillN text ===` sections are the RESOLVED text — Treasure remap applied —
// and are what every per-character claim must cite. Do not grep this file's raw output for
// kit prose; read the labelled sections.
import { readFileSync } from 'node:fs';
import { resolveSkills } from '../src/skills/index.js';
import { loadOverride } from '../src/skills/overrides-node.js';
import { parseSkill } from './lib/kit-parser.js';

const RAW = process.argv.includes('--raw');
const slug = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!slug) {
  console.error('usage: npx tsx scripts/kit.ts <slug> [--raw]');
  process.exit(1);
}
const data = JSON.parse(readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8'));
const c = data.characters[slug];
if (!c) {
  console.error(`unknown slug "${slug}"`);
  process.exit(1);
}

const { skills, baseStats, ...meta } = c;
const { role, ...flat } = meta as Record<string, unknown> & { role?: any };
console.log('=== character ===');
console.log(JSON.stringify(flat, null, 1));

// The weapon spec, flattened to the fields that actually drive the sim. The full row (and the
// BASE-KIT prose templates inside it) is `--raw` only — see the header warning.
const shot = role?.weapon?.shot_detail;
if (shot) {
  const chunks = !shot.reload_bullet ? 1 : Math.round(10000 / shot.reload_bullet);
  console.log('\n=== weapon spec (datamined) ===');
  console.log(
    [
      `weapon_type      ${shot.weapon_type}`,
      `max_ammo         ${shot.max_ammo}`,
      `rate_of_fire     ${shot.rate_of_fire} rpm`,
      `reload_time      ${shot.reload_time} cs${chunks > 1 ? ' (PER CHUNK)' : ''}`,
      `reload_bullet    ${shot.reload_bullet} → ${chunks} reload part(s)${chunks > 1 ? ' — empties, then refills in parts' : ''}`,
      `shot_count       ${shot.shot_count} × muzzle_count ${shot.muzzle_count}`,
      `charge_time      ${shot.charge_time}${shot.charge_time ? ' cs' : ''}`,
      `core_damage_rate ${shot.core_damage_rate}`,
      `input_type       ${shot.input_type}`,
    ].join('\n'),
  );
  console.log(`\nengine-facing: reloadFrames ${flat.reloadFrames} · hitsPerShot ${flat.hitsPerShot} · ammo ${flat.ammo}`);
}

if (RAW) {
  console.log('\n=== raw characters.json role blob (--raw) ===');
  console.log('⚠ `description_localkey` fields below are BASE-KIT templates. For a Treasure unit they are');
  console.log('  NOT what the override is synced from — cite the `=== skillN text ===` sections instead.');
  console.log(JSON.stringify(role, null, 1));
}
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
