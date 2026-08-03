// Precompute the buffer ranking boards into web/public/bufferchart.json.
// Two boards per unit: 'generic' (plain MG+RL carries) and 'typed' (carries
// adapt to the buffer's kit, auto-derived from its override). See
// src/ranks/buffer.ts for the methodology. BUILD OUTPUT — gitignored, not in
// verify.sh.
//
//   npx tsx scripts/build-bufferchart.ts [--out <path>]
//   npx tsx scripts/build-bufferchart.ts --explain <slug> [--typed]  (diagnostic)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { DataFile, LevelMultiplier, Element } from '../src/types.js';
import { loadOverride } from '../src/skills/overrides-node.js';
import { unitElements } from '../src/elements.js';
import { NOOP_CHARACTERS } from '../src/dpschart/noop.js';
import type { OverrideFile } from '../src/skills/index.js';
import type {
  CubesFile,
  OlLinesFile,
  PrepareDeps,
  SkillLevelData,
} from '../src/prepare.js';
import {
  rankBuffers,
  bufferValueFor,
  COMP_PROFILES,
  DUO_BUFFER_PROFILES,
  EXCLUDED_BUFFER_SLUGS,
  type BufferBoard,
  type BufferValue,
} from '../src/ranks/buffer.js';
import type { RanksCtx } from '../src/ranks/burstgen.js';
import type { BufferChartArtifact, BufferRow } from '../src/ranks/types.js';

const load = <T>(rel: string): T =>
  JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8')) as T;

const data = load<DataFile>('../data/characters.json');
const mult = load<LevelMultiplier>('../data/level-multiplier.json');
const cubes = load<CubesFile>('../data/cubes.json');
const olLines = load<OlLinesFile>('../data/ol-lines.json');
let skillLevels: SkillLevelData = {};
try {
  skillLevels = load<SkillLevelData>('../data/skill-levels.json');
} catch {
  /* optional */
}
const tags = load<{ tags: Record<string, string[]> }>(
  '../data/archetype-tags.json'
).tags;

const overrides: Record<string, OverrideFile | undefined> = {};
for (const slug of Object.keys(data.characters)) {
  overrides[slug] = loadOverride(slug);
}
// Synthetic controls are not roster entries, but their overrides carry the
// framework effects: the no-op B1's 7s team burst-cooldown reduction and the
// no-op B3's mock burst. Load every registered control so a future addition
// cannot be forgotten — the same loop build-b1b2dps.ts uses. Without it this
// board silently ran with no enabler at all, which is what it did from
// 91f53ea9 until 2026-08-03.
for (const slug of Object.keys(NOOP_CHARACTERS)) {
  overrides[slug] = loadOverride(slug);
}

const deps: PrepareDeps = { overrides, skillLevels, cubes, olLines };
const ctx: RanksCtx = { characters: data.characters as any, mult, deps };

const SLOTS = ['skill1', 'skill2', 'burst'] as const;
const explainArg = process.argv.indexOf('--explain');
const explainSlug = explainArg >= 0 ? process.argv[explainArg + 1] : null;
if (explainArg >= 0 && !explainSlug) {
  throw new Error('--explain requires a slug');
}
if (explainSlug && !data.characters[explainSlug]) {
  throw new Error(`--explain: "${explainSlug}" is not in characters.json`);
}
// A roster slug with no override dies deep inside prepareUnit; fail at the door
if (explainSlug && !data.characters[explainSlug].simSupported) {
  throw new Error(
    `--explain: "${explainSlug}" is not sim-supported, so it has no override to explain`
  );
}

// EXCLUDED_BUFFER_SLUGS never enters the population: a kit that reduces team
// damage in the standard comp would report a misleadingly negative % increase,
// useless for ranking support value. The set is currently EMPTY — no unit meets
// that criterion — so this filter passes everything through today. The artifact
// keeps every row it computes, negatives included; the leaderboard trims those
// at render time (src/ranks/buffer-rows.ts) so the unit card can still quote a
// unit's own value.
const population: string[] = [];
for (const [slug, c] of Object.entries(data.characters)) {
  if (EXCLUDED_BUFFER_SLUGS.has(slug)) {
    continue;
  }
  if (!c.simSupported) {
    continue;
  }
  if (c.burst === 'I' || c.burst === 'II') {
    population.push(slug);
  } else if (c.burst === 'III' && (tags[slug] ?? []).includes('buffer')) {
    population.push(slug);
  }
}
population.sort();

// --explain <slug>: why does this unit sit where it sits? Prints the shipped
// value, then two ablations against it — the unit with its kit stripped
// entirely (its floor: what the BODY alone is worth, which is now weapon and
// gauge only, since the standard team's spare no-op covers the tested unit's
// burst stage and a long cooldown no longer costs the team Full Bursts) and one
// run per buff effect with that effect removed (which lines actually reach the
// carries, and which are inert).
//
// CAVEAT on --typed: each ablation re-derives the carry spec from the ABLATED
// override, so removing the very effect that drives a typed adaptation
// (alliesOfWeapon, pierce, projectile-explosion, an element gate) also reverts
// the carries to the generic pair for that row — the printed change then mixes
// 'effect removed' with 'carry adaptation lost'. Read per-effect ablations on
// the generic board; --typed is honest only for the shipped and floor rows.
//
// The same shape applies to the ONE-ENABLER rule on either board: for the
// units that supply team cooldown reduction (12 today), stripping the kit or ablating the
// ally-CDR line flips them out of the enabler role and stands the no-op B1's 7s
// control back up, so those rows read net of the restored standard enabler
// (liter's ally-CDR ablation reads -11.29 with the control regained, and her
// floor reads -0.33% for the same reason).
// Diagnostic only — writes nothing.
if (explainSlug) {
  const board: BufferBoard = process.argv.includes('--typed')
    ? 'typed'
    : 'generic';
  const ctxWith = (ov: Record<string, OverrideFile | undefined>): RanksCtx => ({
    ...ctx,
    deps: { ...deps, overrides: ov },
  });
  // always the PLAIN row — a comp profile is a different team, so mixing the
  // two would compare a unit against a baseline it never ran with
  const value = (ov: Record<string, OverrideFile | undefined>): number =>
    bufferValueFor(explainSlug, board, ctxWith(ov), new Map(), null).valuePct;
  const shipped = value(overrides);
  const c = data.characters[explainSlug];
  const clone = (): OverrideFile =>
    JSON.parse(JSON.stringify(overrides[explainSlug])) as OverrideFile;

  process.stdout.write(
    `${explainSlug} — ${board} board\n` +
      `  ${c.burst}, ${c.burstCooldownSec}s burst cooldown, ${c.weapon}, ${c.class}\n` +
      `  shipped                            ${shipped.toFixed(2)}%\n`
  );
  const stripped = clone();
  for (const slot of SLOTS) {
    stripped[slot] = [];
  }
  const floor = value({ ...overrides, [explainSlug]: stripped });
  process.stdout.write(
    `  kit stripped (rotation floor)      ${floor.toFixed(2)}%` +
      `   ← what the body alone is worth\n`
  );
  for (const slot of SLOTS) {
    const blocks = overrides[explainSlug]?.[slot] ?? [];
    blocks.forEach((block, bi) => {
      (block.effects ?? []).forEach((eff, ei) => {
        const ov = clone();
        const target = ov[slot]?.[bi];
        if (!target) {
          return;
        }
        target.effects = block.effects.filter((_, i) => i !== ei);
        const v = value({ ...overrides, [explainSlug]: ov });
        const label = `${slot}[${bi}] ${eff.kind}${'stat' in eff && eff.stat ? ` ${eff.stat} ${eff.value ?? ''}` : ''}`;
        process.stdout.write(
          `  without ${label.padEnd(42)} ${v.toFixed(2)}%   (Δ ${(v - shipped).toFixed(2)})\n`
        );
      });
    });
  }
  process.exit(0);
}

const boards = {
  generic: rankBuffers(population, 'generic', ctx),
  typed: rankBuffers(population, 'typed', ctx),
};

const pack = (ranked: BufferValue[]): BufferRow[] =>
  // fixed arity 4: [slug, addedPct, rules, profile] — profile null = plain run
  ranked.map((r): BufferRow => [
    r.slug,
    Math.round(r.valuePct * 10) / 10, // one decimal, e.g. 12.3
    r.rules,
    r.profile,
  ]);

const artifact: BufferChartArtifact = {
  generatedAt: new Date().toISOString(),
  methodology:
    'Total % team damage increase: two standard carries (synthetic class-modal ' +
    'MG + RL, Attacker scope-lock stats, both elementally advantaged) are simmed ' +
    '180s with the tested buffer vs a stage-matched no-op baseline. The team is ' +
    'the standard five: a no-op B1, two no-op B2 and the two carries, with the ' +
    'tested unit taking the spare slot of its own burst stage and leading that ' +
    'stage (the second no-op B2 is the spare on B2 rows) — the spare keeps ' +
    'every burst stage ' +
    'covered, so a long burst cooldown does not cost the team Full Bursts. ' +
    'Camera focus sits on that spare no-op B2 (SR), never on the tested unit, ' +
    'so burst generation is identical in every run. Exactly one burst-cooldown ' +
    'enabler is fielded: the tested unit when its kit reduces ally cooldowns, ' +
    'the no-op B1 otherwise. The reported ' +
    'value is (carry DPS with buffer − carry DPS with no-op) / carry DPS with ' +
    'no-op × 100. B3 buffers sit rightmost and never burst. generic: plain ' +
    'MG+RL carries — only requirement-free buffs counted. typed: carries adapt ' +
    'to the kit (auto-derived from the override: weapon-typed targets swap both ' +
    "carries' weapon; pierce buffs grant both carries Pierce; True Damage ▲ " +
    'buffs give both carries True-flavored normal attacks; Distributed/' +
    'Sustained Damage ▲ buffs give each carry a small synthetic periodic hit ' +
    '(one flavored tick every 10s, sized off the weapon modal — a MOCK, not a ' +
    'measured value, since a kit-less carry cannot otherwise generate either ' +
    'flavor) tagged that flavor; ' +
    'projectile-explosion buffs make both RL; element-typed targets and ' +
    'boss-element-gated enemy debuffs set both carries to the advantaged element). ' +
    "The buffer's own damage is not counted; rotation value (gauge/CDR) is " +
    'captured. Defensive/sustain kits read ~0 (scope-lock boss deals no damage).',
  units: Object.fromEntries(
    population.map((slug) => {
      const c = data.characters[slug];
      return [
        slug,
        {
          name: c.name,
          element: c.element as Element,
          elements: unitElements(c),
          weapon: c.weapon,
          burst: c.burst,
          imageUrl: c.imageUrl ?? null,
        },
      ];
    })
  ),
  profiles: Object.fromEntries([
    ...Object.values(COMP_PROFILES).map((p) => [p.id, p.note]),
    ...Object.values(DUO_BUFFER_PROFILES).map((p) => [p.id, p.note]),
  ]),
  cells: { generic: pack(boards.generic), typed: pack(boards.typed) },
};

const outArg = process.argv.indexOf('--out');
const out =
  outArg >= 0
    ? process.argv[outArg + 1]
    : new URL('../web/public/bufferchart.json', import.meta.url).pathname;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(artifact));
const top = (b: BufferValue[]) =>
  b
    .slice(0, 10)
    .map((r) => `  #${r.rank} ${r.slug} +${r.valuePct.toFixed(1)}%`)
    .join('\n');
process.stderr.write(
  `bufferchart: ${population.length} units × 2 boards → ${out}\nGENERIC:\n${top(boards.generic)}\nTYPED:\n${top(boards.typed)}\n`
);
