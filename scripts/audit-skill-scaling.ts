// Roster census of SKILL-LEVEL SCALING coverage.
//
// `src/skills/scale.ts` scales a parsed override value by matching |v| against index 9 (max
// level) of that slot's blablalink level arrays and substituting index L-1. Two ways a value
// silently stays at max level when the user lowers a skill level:
//
//   SILENT  — the effect KIND (or the field) has no case in scaleEffect's switch, so the value
//             is returned untouched and NO warning is emitted. Detected here by: the value DOES
//             match a varying level-table entry, but nothing scales it.
//   WARNED  — the field IS on a scaling path but the authored number is DERIVED (a fold/sum, a
//             time-average, a stack-cap product), so it matches no table entry. scaleVal emits
//             "no level table match for N — kept at max-level value".
//
// Usage:
//   npx tsx scripts/audit-skill-scaling.ts              # roster summary + per-unit findings
//   npx tsx scripts/audit-skill-scaling.ts nayuta       # one unit, verbose
//   npx tsx scripts/audit-skill-scaling.ts --json       # machine-readable
//   npx tsx scripts/audit-skill-scaling.ts nayuta --sim # SIZE it: run the unit in a fixed
//                                                       # support team across skill-level
//                                                       # configs and print its damage delta
//
// A "varying" array is one whose index-0 and index-9 entries differ — a constant array (a 10s
// duration stored as [10,10,...]) is level-invariant, so not scaling it is CORRECT, and matching
// it would be the "for 10 sec collides with 10%" hazard scale.ts's header warns about.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { scaleBlocks } from '../src/skills/scale.js';
import type { Block } from '../src/skills/types.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Fields that are level-INVARIANT by design — never expected to scale. */
const TIME_FIELDS = new Set([
  'durationSec',
  'intervalSec',
  'delaySec',
  'rampSec',
  'chargeTimeSec',
  'chargeTimeClamp',
  'cooldownSec',
  'sec',
  'stage',
  'count',
  'ticks',
  'maxStacks',
  'maxShots',
  'durationShots',
  'pelletCount',
  'hits',
  'times',
  'min',
  'max',
  'mult',
]);

type Slot = 'skill1' | 'skill2' | 'burst';
const SLOTS: Slot[] = ['skill1', 'skill2', 'burst'];

interface Finding {
  slug: string;
  slot: Slot;
  kind: string;
  field: string;
  value: number;
  klass: 'SILENT' | 'WARNED';
  /** For WARNED: a two-term sum of table entries that reproduces the value, if one exists. */
  decomposition?: string;
}

const levelData: Record<string, Record<Slot, number[][]>> = JSON.parse(
  readFileSync(join(ROOT, 'data/skill-levels.json'), 'utf8')
);

const varying = (a: number[]) =>
  a.length === 10 && Math.abs(a[0] - a[9]) > 0.005;
/** Match restricted to arrays that actually CHANGE with level. Drives the SILENT class: not
 *  scaling a constant array is correct and invisible, so only a varying match is a real miss. */
const matchesVarying = (arrays: number[][], v: number) =>
  arrays.some((a) => varying(a) && Math.abs(a[9] - Math.abs(v)) < 0.005);

/** Find `x + y = v` over the slot's varying max-level entries — the fold pattern. */
function decompose(arrays: number[][], v: number): string | undefined {
  const maxes = arrays.filter(varying).map((a) => a[9]);
  const abs = Math.abs(v);
  for (let i = 0; i < maxes.length; i++) {
    for (let j = i; j < maxes.length; j++) {
      if (Math.abs(maxes[i] + maxes[j] - abs) < 0.005) {
        return `${maxes[i]} + ${maxes[j]}`;
      }
    }
  }
  // stack-cap product: value = tableEntry × integer
  for (const m of maxes) {
    if (m <= 0) {
      continue;
    }
    const n = abs / m;
    if (n > 1 && n < 200 && Math.abs(n - Math.round(n)) < 0.005) {
      return `${m} × ${Math.round(n)}`;
    }
  }
  return undefined;
}

/**
 * Classify one block's numeric fields by RUNNING THE REAL SCALER at level 1 for this slot and
 * observing what it did. Deliberately NOT a hand-mirror of scaleEffect's switch: a copy of that
 * table would silently drift out of date the moment a case was added, and would then report the
 * fixed cases as still-broken (or, worse, the broken ones as fixed).
 */
function classifyBlock(
  block: Record<string, unknown>,
  slug: string,
  slot: Slot,
  arrays: number[][],
  out: Finding[]
): void {
  const slotArrays = { skill1: [], skill2: [], burst: [], [slot]: arrays } as {
    skill1: number[][];
    skill2: number[][];
    burst: number[][];
  };
  const levels = { skill1: 10, skill2: 10, burst: 10, [slot]: 1 } as {
    skill1: number;
    skill2: number;
    burst: number;
  };
  const input = [{ ...block, slot }] as unknown as Block[];
  const warnings: string[] = [];
  const scaled = scaleBlocks(
    JSON.parse(JSON.stringify(input)) as Block[],
    slotArrays,
    levels,
    warnings
  );

  const walk = (
    before: Record<string, unknown>,
    after: Record<string, unknown>
  ): void => {
    if (before.kind === 'escalating' && Array.isArray(before.steps)) {
      const afterSteps = (after.steps ?? []) as Record<string, unknown>[];
      (before.steps as Record<string, unknown>[]).forEach((st, i) =>
        walk(st, afterSteps[i] ?? {})
      );
      return;
    }
    for (const [field, raw] of Object.entries(before)) {
      if (typeof raw !== 'number' || raw === 0 || TIME_FIELDS.has(field)) {
        continue;
      }
      // The scaler CHANGED it — this field is covered.
      if (after[field] !== raw) {
        continue;
      }
      const kind = String(before.kind);
      // It emitted a warning naming this value: derived, on a scaling path, kept at max level.
      // Anchored on the full phrase — a bare `includes(String(raw))` matches any warning that
      // merely CONTAINS the digits (a maxAmmo of 1 matched every message with a "1" in it).
      if (warnings.some((w) => w.includes(`match for ${raw} —`))) {
        out.push({
          slug,
          slot,
          kind,
          field,
          value: raw,
          klass: 'WARNED',
          decomposition: decompose(arrays, raw),
        });
        continue;
      }
      // Unchanged, unwarned, yet it IS a max-level entry of a varying table: silently unscaled.
      if (matchesVarying(arrays, raw)) {
        out.push({ slug, slot, kind, field, value: raw, klass: 'SILENT' });
      }
    }
  };

  const beforeEffects = (block.effects ?? []) as Record<string, unknown>[];
  const afterEffects = (scaled[0]?.effects ?? []) as unknown as Record<
    string,
    unknown
  >[];
  beforeEffects.forEach((e, i) => walk(e, afterEffects[i] ?? {}));
}

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const only = args.find((a) => !a.startsWith('--'));

/** --sim: size a unit's real damage sensitivity to each skill slot's level. Fields the scaler
 *  misses show up as a slot whose level can be dropped to 1 with little or no damage change. */
async function sizeUnit(slug: string): Promise<void> {
  const { loadWorld } = await import('./battery/lib.js');
  const { prepareTeam } = await import('../src/prepare.js');
  const { runSim } = await import('../src/engine/sim.js');
  const { loadOverride } = await import('../src/skills/overrides-node.js');
  const w = loadWorld();
  // A generic support shell so the subject unit is the only variable; it keeps a legal
  // B1/B2/B3x2 rotation shape so full-burst counts stay stable across the sweep.
  const shell = ['liter', 'crown', slug, 'noise', 'red-hood'].filter(
    (s, i, a) => a.indexOf(s) === i && w.data.characters[s]
  );
  const run = (levels: { skill1: number; skill2: number; burst: number }) => {
    const chars = shell.map((s) => w.data.characters[s]);
    const overrides: Record<string, unknown> = {};
    for (const s of shell) {
      overrides[s] = loadOverride(s);
    }
    const unitOpts = shell.map((s) => ({
      doll: false as const,
      ol: 'base5' as const,
      lambdaStage: s === 'red-hood' ? (3 as const) : undefined,
      skillLevels: s === slug ? levels : undefined,
    }));
    const prepared = prepareTeam(chars, unitOpts, {
      overrides: overrides as never,
      skillLevels: w.skillLevels,
      cubes: w.cubes,
      olLines: w.olLines,
    });
    const r = runSim(
      chars,
      w.mult,
      {
        slugs: shell,
        bossElement: null,
        bossDef: 0,
        level: 400,
        copies: 10,
        doll: false,
        ol: 'base5',
        coreHitRate: 1,
        rangeBonus: true,
        durationSec: 180,
        seed: 1000,
      } as never,
      prepared
    );
    return r.units.find((u) => u.slug === slug)!.totalDamage;
  };
  const cases: Array<
    [string, { skill1: number; skill2: number; burst: number }]
  > = [
    ['10/10/10', { skill1: 10, skill2: 10, burst: 10 }],
    [' 1/10/10', { skill1: 1, skill2: 10, burst: 10 }],
    ['10/ 1/10', { skill1: 10, skill2: 1, burst: 10 }],
    ['10/10/ 1', { skill1: 10, skill2: 10, burst: 1 }],
    [' 1/ 1/ 1', { skill1: 1, skill2: 1, burst: 1 }],
  ];
  const base = run(cases[0][1]);
  console.log(`\n=== --sim ${slug}  (team: ${shell.join(', ')}) ===`);
  console.log(`  levels     damage      vs 10/10/10`);
  for (const [label, lv] of cases) {
    const d = run(lv);
    console.log(
      `  ${label}   ${(d / 1e6).toFixed(2).padStart(8)}M   ${((d / base - 1) * 100).toFixed(1).padStart(7)}%`
    );
  }
  console.log('');
}

if (args.includes('--sim')) {
  if (!only) {
    throw new Error('--sim needs a slug: audit-skill-scaling.ts <slug> --sim');
  }
  await sizeUnit(only);
  process.exit(0);
}

const overrideDir = join(ROOT, 'src/skills/overrides');
const findings: Finding[] = [];
const noLevelData: string[] = [];

for (const file of readdirSync(overrideDir).sort()) {
  if (!file.endsWith('.json')) {
    continue;
  }
  const slug = file.replace(/\.json$/, '');
  if (only && slug !== only) {
    continue;
  }
  const ov = JSON.parse(readFileSync(join(overrideDir, file), 'utf8'));
  const lv = levelData[slug];
  if (!lv) {
    noLevelData.push(slug);
    continue;
  }
  for (const slot of SLOTS) {
    const arrays = lv[slot] ?? [];
    for (const block of ov[slot] ?? []) {
      classifyBlock(block, slug, slot, arrays, findings);
    }
  }
}

if (asJson) {
  console.log(JSON.stringify({ findings, noLevelData }, null, 2));
} else {
  const silent = findings.filter((f) => f.klass === 'SILENT');
  const warned = findings.filter((f) => f.klass === 'WARNED');
  const units = new Set(findings.map((f) => f.slug));

  console.log(
    `\n=== SILENT (no warning, value matches a varying level table but nothing scales it) — ${silent.length} values ===`
  );
  const byKind = new Map<string, Finding[]>();
  for (const f of silent) {
    const k = `${f.kind}.${f.field}`;
    if (!byKind.has(k)) {
      byKind.set(k, []);
    }
    byKind.get(k)!.push(f);
  }
  for (const [k, fs] of [...byKind].sort((a, b) => b[1].length - a[1].length)) {
    console.log(
      `\n  ${k}  (${fs.length} values, ${new Set(fs.map((f) => f.slug)).size} units)`
    );
    for (const f of fs) {
      console.log(`    ${f.slug.padEnd(30)} ${f.slot.padEnd(7)} ${f.value}`);
    }
  }

  console.log(
    `\n=== WARNED (on a scaling path but derived — emits "no level table match") — ${warned.length} values ===`
  );
  const byUnit = new Map<string, Finding[]>();
  for (const f of warned) {
    if (!byUnit.has(f.slug)) {
      byUnit.set(f.slug, []);
    }
    byUnit.get(f.slug)!.push(f);
  }
  for (const [slug, fs] of [...byUnit].sort(
    (a, b) => b[1].length - a[1].length
  )) {
    console.log(`\n  ${slug}  (${fs.length})`);
    for (const f of fs) {
      const d = f.decomposition ? `   ← ${f.decomposition}` : '';
      console.log(
        `    ${f.slot.padEnd(7)} ${f.kind}.${f.field} = ${f.value}${d}`
      );
    }
  }

  console.log(
    `\n=== SUMMARY ===\n  ${silent.length} SILENT + ${warned.length} WARNED across ${units.size} units` +
      `\n  ${noLevelData.length} overrides with NO level data at all: ${noLevelData.join(', ') || '(none)'}\n`
  );
}
