// nikke-sim CLI
//   npm run sim -- liter crown naga modernia alice --element Iron --doll yes --ol 5 \
//     --cubes resilience,resilience,bastion,bastion,resilience \
//     --lines "elem*4,atk*4;;;elem*4+ammo*2;" --skill-levels "10,10,10/10/10,10,7" --best-ol 4
import { readFileSync } from 'node:fs';
import type { DataFile, Element, LevelMultiplier, SimConfig } from './types.js';
import { runSim } from './engine/sim.js';
import { printReport } from './report.js';
import { bestOl } from './bestol.js';
import { loadOverride } from './skills/overrides-node.js';
import {
  prepareTeam,
  type CubesFile,
  type LineSelection,
  type OlLinesFile,
  type SkillLevelData,
  type UnitOptions,
} from './prepare.js';

const ELEMENTS = ['Fire', 'Water', 'Wind', 'Electric', 'Iron'];

function usage(msg?: string): never {
  if (msg) console.error(`error: ${msg}\n`);
  console.error(
    `usage: npm run sim -- <slug1> <slug2> <slug3> <slug4> <slug5> [options]

  team rules: exactly one Burst I, one Burst II, two Burst III + one flex (Λ counts as any)
  slot order matters: leftmost eligible nikke bursts first

options:
  --element <Fire|Water|Wind|Electric|Iron>   boss element (default: none — no elemental advantage)
  --doll <yes|no,...>   doll per slot, 1 or 5 comma-separated entries (default: no)
  --ol <0|5,...>        overload gear level per slot, 1 or 5 entries (default: 0)
  --level <n>           synchro level (default: 400)
  --copies <0-10>       dupes: 0-3 = limit breaks, 4-10 = core levels (default: 3 = MLB)
  --core-rate <0-1>     fraction of hits that strike a core (default: 0)
  --no-range            drop the +0.3 effective-range bonus (default: on)
  --duration <sec>      fight length (default: 180)
  --rotation            print the full burst rotation log

loadout (per-slot lists are comma- or semicolon-separated in slot order; a single entry applies to all 5):
  --cubes <c1,..,c5>            harmony cube per slot ('-' = none), e.g. resilience,bastion,-,wingman,-
  --lines <s1;s2;s3;s4;s5>      OL lines per slot: type[*count][@value] joined by '+',
                                e.g. "elem*4+atk*4;;;ammo*2;" (types: see data/ol-lines.json)
  --skill-levels <l1,..,l5>     skill levels per slot as n or s1/s2/burst, e.g. 10/4/10 (default 10)
  --lambda-as <1|2|3,...>       pin a Λ unit (Red Hood) to burst ONLY at that stage, per slot ('-' = auto)
  --mode <m1,..,m5>             kit mode per slot for mode-switch units, e.g. CCW snipe|mg ('-' = default)
  --best-ol <1-5>               after the sim, greedy-search the best OL lines for that slot

  --list [filter]       list available slugs and exit
  --coverage            parser health across the roster`
  );
  process.exit(1);
}

const argv = process.argv.slice(2);
const data: DataFile = JSON.parse(
  readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8')
);
const mult: LevelMultiplier = JSON.parse(
  readFileSync(new URL('../data/level-multiplier.json', import.meta.url), 'utf8')
);

if (argv[0] === '--coverage') {
  const { resolveSkills } = await import('./skills/index.js');
  let clean = 0, warned = 0, overridden = 0;
  const rows: Array<[string, number, string]> = [];
  for (const c of Object.values(data.characters)) {
    const s = resolveSkills(c, loadOverride(c.slug));
    if (s.source !== 'parser') overridden++;
    if (s.warnings.length) { warned++; rows.push([c.slug, s.warnings.length, s.warnings[0]]); }
    else clean++;
  }
  rows.sort((a, b) => b[1] - a[1]);
  for (const [slug, n, first] of rows) console.log(`${slug.padEnd(30)} ${String(n).padStart(2)}  ${first}`);
  console.log(`\n${clean} clean, ${warned} with warnings, ${overridden} hand-verified (of ${Object.keys(data.characters).length})`);
  process.exit(0);
}

if (argv[0] === '--list') {
  const filter = argv[1]?.toLowerCase();
  const rows = Object.values(data.characters)
    .filter((c) => !filter || c.slug.includes(filter) || c.name.toLowerCase().includes(filter))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  for (const c of rows) {
    console.log(
      `${c.slug.padEnd(30)} ${c.name.padEnd(24)} B${c.burst.padEnd(3)} ${c.weapon.padEnd(6)} ${c.element}`
    );
  }
  process.exit(0);
}

const slugs: string[] = [];
const opts: Record<string, string | boolean> = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--no-range') opts.noRange = true;
  else if (a === '--rotation') opts.rotation = true;
  else if (a.startsWith('--')) {
    const key = a.slice(2);
    const val = argv[++i];
    if (val === undefined) usage(`missing value for --${key}`);
    opts[key] = val;
  } else slugs.push(a.toLowerCase());
}

if (slugs.length !== 5) usage(`need exactly 5 nikkes, got ${slugs.length}`);

const chars = slugs.map((slug) => {
  const c = data.characters[slug];
  if (!c) {
    const suggestions = Object.keys(data.characters).filter((k) => k.includes(slug)).slice(0, 5);
    usage(`unknown nikke "${slug}"${suggestions.length ? ` — did you mean: ${suggestions.join(', ')}` : ' (use --list to browse)'}`);
  }
  return c;
});

// team composition check: 1×BI, 1×BII, 2×BIII, 1 flex (Λ wildcards)
const counts = { I: 0, II: 0, III: 0, 'Λ': 0 } as Record<string, number>;
for (const c of chars) counts[c.burst]++;
const flexOk =
  counts['Λ'] >= 0 &&
  counts.I >= 1 && counts.I <= 2 &&
  counts.II >= 1 && counts.II <= 2 &&
  counts.III >= 2 && counts.III <= 3 &&
  counts.I + counts.II + counts.III + counts['Λ'] === 5;
const strictOk = counts.I >= 1 && counts.II >= 1 && counts.III >= 2;
if (!(strictOk || counts['Λ'] > 0) || !flexOk) {
  console.error(
    `warning: composition is ${counts.I}×BI ${counts.II}×BII ${counts.III}×BIII ${counts['Λ']}×BΛ — expected 1×BI, 1×BII, 2×BIII + flex. Running anyway; rotation may stall.\n`
  );
}

const element = opts.element ? String(opts.element) : null;
if (element && !ELEMENTS.includes(element[0].toUpperCase() + element.slice(1).toLowerCase())) {
  usage(`unknown element "${element}"`);
}

const cfg: SimConfig = {
  slugs,
  bossElement: element
    ? ((element[0].toUpperCase() + element.slice(1).toLowerCase()) as Element)
    : null,
  bossDef: opts['boss-def'] ? Number(opts['boss-def']) : 0,
  level: opts.level ? Number(opts.level) : 400,
  copies: opts.copies ? Number(opts.copies) : 3,
  doll: false, // per-unit via --doll (defaults below)
  ol: 0,       // per-unit via --ol
  coreHitRate: opts['core-rate'] ? Number(opts['core-rate']) : 0,
  rangeBonus: !opts.noRange,
  durationSec: opts.duration ? Number(opts.duration) : 180,
};
if (cfg.copies < 0 || cfg.copies > 10) usage(`--copies must be 0-10`);
if (cfg.coreHitRate < 0 || cfg.coreHitRate > 1) usage(`--core-rate must be 0-1`);

// ---- loadout flags ----
const cubesData: CubesFile = JSON.parse(
  readFileSync(new URL('../data/cubes.json', import.meta.url), 'utf8')
);
const olLinesData: OlLinesFile = JSON.parse(
  readFileSync(new URL('../data/ol-lines.json', import.meta.url), 'utf8')
);
let skillLevelData: SkillLevelData = {};
try {
  skillLevelData = JSON.parse(
    readFileSync(new URL('../data/skill-levels.json', import.meta.url), 'utf8')
  );
} catch {
  // optional: run `npx tsx src/data/sync-skill-levels.ts` to enable skill levels < 10
}

function perSlot(raw: string | undefined, sep: string): (string | undefined)[] {
  if (!raw) return [undefined, undefined, undefined, undefined, undefined];
  const parts = String(raw).split(sep).map((s) => s.trim());
  if (parts.length === 1) return Array(5).fill(parts[0]);
  if (parts.length !== 5) usage(`expected 1 or 5 ${sep}-separated entries, got ${parts.length}`);
  return parts.map((p) => (p === '' || p === '-' ? undefined : p));
}

const unitOpts: UnitOptions[] = perSlot(opts.cubes as string, ',').map((cubeSpec, i) => {
  const u: UnitOptions = {};
  if (cubeSpec) {
    const [id, lvl] = cubeSpec.split('@');
    const match = Object.keys(cubesData.cubes).find((k) => k.startsWith(id.toLowerCase()));
    if (!match) usage(`unknown cube "${id}" (options: ${Object.keys(cubesData.cubes).join(', ')})`);
    u.cube = { id: match, level: lvl ? Number(lvl) : 15 };
  }
  return u;
});

perSlot(opts.ol as string, ',').forEach((spec, i) => {
  if (spec === undefined) return;
  if (spec !== '0' && spec !== '5') usage(`--ol entries must be 0 or 5 (got "${spec}")`);
  unitOpts[i].ol = spec === '5' ? 5 : 0;
});

perSlot(opts.doll as string, ',').forEach((spec, i) => {
  if (spec === undefined) return;
  unitOpts[i].doll = /^y(es)?$|^true$|^1$|^on$/i.test(spec);
});

perSlot(opts.mode as string, ',').forEach((spec, i) => {
  if (spec === undefined) return;
  const modes = loadOverride(slugs[i])?.modes;
  if (!modes?.length) usage(`--mode set for slot ${i + 1} (${chars[i].name}) but their kit declares no modes`);
  const match = modes.find((m) => m.toLowerCase().startsWith(spec.toLowerCase()));
  if (!match) usage(`unknown mode "${spec}" for ${chars[i].name} (options: ${modes.join(', ')})`);
  unitOpts[i].mode = match;
});

perSlot(opts['mp-priority'] as string, ',').forEach((spec, i) => {
  if (spec === undefined) return;
  unitOpts[i].mpPriority = /^y(es)?$|^true$|^1$|^on$/i.test(spec);
});

perSlot(opts['lambda-as'] as string, ',').forEach((spec, i) => {
  if (spec === undefined) return;
  if (!['1', '2', '3'].includes(spec)) usage(`--lambda-as entries must be 1, 2, or 3 (got "${spec}")`);
  if (chars[i].burst !== 'Λ') usage(`--lambda-as set for slot ${i + 1} (${chars[i].name}) but they are B${chars[i].burst}, not Λ`);
  unitOpts[i].lambdaStage = Number(spec) as 1 | 2 | 3;
});

perSlot(opts.lines as string, ';').forEach((spec, i) => {
  if (!spec) return;
  unitOpts[i].lines = spec.split(/[+,]/).filter(Boolean).map((token) => {
    const m = token.trim().match(/^([a-z]+)(?:\*(\d+))?(?:@([\d.]+))?$/i);
    if (!m) usage(`bad OL line token "${token}" (format: type[*count][@value])`);
    const type = Object.keys(olLinesData.lines).find((k) => k.startsWith(m[1].toLowerCase()));
    if (!type) usage(`unknown OL line type "${m[1]}" (options: ${Object.keys(olLinesData.lines).join(', ')})`);
    return { type, count: m[2] ? Number(m[2]) : 1, value: m[3] ? Number(m[3]) : undefined };
  });
});

perSlot(opts['skill-levels'] as string, ',').forEach((spec, i) => {
  if (!spec) return;
  const parts = spec.split('/').map(Number);
  const [s1, s2, b] = parts.length === 1 ? [parts[0], parts[0], parts[0]] : parts;
  if ([s1, s2, b].some((n) => !Number.isInteger(n) || n < 1 || n > 10)) {
    usage(`bad skill levels "${spec}" (1-10, as n or s1/s2/burst)`);
  }
  unitOpts[i].skillLevels = { skill1: s1, skill2: s2, burst: b };
});

const overrides = Object.fromEntries(slugs.map((s) => [s, loadOverride(s)]));
const prepared = prepareTeam(chars, unitOpts, {
  overrides,
  skillLevels: skillLevelData,
  cubes: cubesData,
  olLines: olLinesData,
});

const result = runSim(chars, mult, cfg, prepared);
printReport(result, Boolean(opts.rotation));

if (opts['best-ol']) {
  const slot = Number(opts['best-ol']);
  if (!Number.isInteger(slot) || slot < 1 || slot > 5) usage(`--best-ol needs a slot number 1-5`);
  console.log(`best OL lines for slot ${slot} (${chars[slot - 1].name}) — greedy, max-roll lines, cap 4/type:\n`);
  const r = bestOl(chars, mult, cfg, prepared, slot - 1, olLinesData);
  r.picks.forEach((p, i) =>
    console.log(
      `  ${i + 1}. ${p.name.padEnd(30)} +${p.unitGainPct.toFixed(2)}% unit dmg  (+${p.teamGainPct.toFixed(2)}% team)`
    )
  );
  if (!r.picks.length) console.log('  no line adds ≥0.05% damage');
  const total = r.baselineDamage ? ((r.finalDamage - r.baselineDamage) / r.baselineDamage) * 100 : 0;
  console.log(`\n  total: +${total.toFixed(1)}% unit damage vs current loadout`);
  console.log(`  single-line comparison: ${r.rejected.map((x) => `${x.type} +${x.gainPct.toFixed(2)}%`).join(', ')}`);
}
