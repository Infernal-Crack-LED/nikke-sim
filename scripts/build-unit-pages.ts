// Build data/unit-pages.json — everything the /unit/<slug> landing pages need that
// isn't already in a page-sized artifact. Plan:
// docs/handoffs/2026-08-02-character-landing-pages-plan.md.
//
//   npx tsx scripts/build-unit-pages.ts [--out <path>] [--only <slug>] [--tier <n>]
//
// TWO THINGS, ONE ARTIFACT, because both are per-unit page data with the same
// regeneration trigger (kits / overrides / engine changed):
//
// 1. `ol` — the FULL ranked free-line overload table, the same ranking the web's
//    "Optimize Overload" tab computes live, baked out so a landing page can publish
//    it without running the sim in the visitor's browser. Sibling of
//    scripts/build-ol-optimal.ts and in the SAME basis in every respect since the
//    owner's 2026-08-03 ruling: the Solo isolation cell at 12/12, the EXHAUSTIVE
//    multiset ranking (src/olconfigs.ts) over the weapon-aware free-line pool, at the
//    project tier (src/dpschart/matrix.ts OL_TIER = T11). Row 0 of this table and
//    data/ol-optimal.json's pick are therefore the same computation and can no longer
//    disagree — they used to, on 28 of 73 units, because ol-optimal ran a greedy
//    search at max roll.
//
//    The pool is weapon-aware — 3 types (MG/Pistol), 4 (AR/SMG/SG, which get Hit Rate)
//    or 5 (RL/SR, which get the charge lines) — so the exhaustive search is C(6,4)=15,
//    C(7,4)=35 or C(8,4)=70 sims per unit. `--tier` remains for basis A/Bs.
//
// 2. `status` — a SLIM PUBLIC PROJECTION of data/kit-status.json: the four
//    structured fields the page renders (tier / tuned / graded / unmodeled) and
//    nothing else. This exists for a concrete reason: kit-status.json is 366 KB,
//    almost all of it AI-facing prose (`evidence`, `residual`, `kitParse.findings`)
//    written in the repo's own shorthand and never shown to a player. Importing it
//    into the web bundle put ~310 KB of internal notes into the UnitPage chunk. The
//    projection is ~49 KB and carries only what the page actually reads, so a
//    verbose new finding can never silently inflate the bundle again.
//
// PUBLISHED OL FIELDS: label + gainPct only. Absolute damage is deliberately NOT in
// the artifact — it is basis-specific (this boss, this gear, this control team) and
// on a player-facing page a raw damage number reads as a claim about the reader's
// own damage. The gain over the 8/12 floor is the transferable quantity.
import { readFileSync } from 'node:fs';
import { writeJsonArtifact } from '../src/data/json-artifact.js';
import type { DataFile, LevelMultiplier, Element } from '../src/types.js';
import { loadOverride } from '../src/skills/overrides-node.js';
import type { OverrideFile } from '../src/skills/index.js';
import type {
  CubesFile,
  OlLinesFile,
  PrepareDeps,
  SkillLevelData,
} from '../src/prepare.js';
import { rankFreeLineConfigs } from '../src/olconfigs.js';
import { assembleTeam, OL_TIER, type Cell } from '../src/dpschart/matrix.js';
import { NOOP_CHARACTERS } from '../src/dpschart/noop.js';

const load = <T>(rel: string): T =>
  JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8')) as T;

const data = load<DataFile>('../data/characters.json');
const mult = load<LevelMultiplier>('../data/level-multiplier.json');
const cubes = load<CubesFile>('../data/cubes.json');
const olLines = load<OlLinesFile>('../data/ol-lines.json');
const olTiers = load<{ tiers: Array<Record<string, number>> }>(
  '../data/ol-tiers.json'
);
let skillLevels: SkillLevelData = {};
try {
  skillLevels = load<SkillLevelData>('../data/skill-levels.json');
} catch {
  /* optional */
}

const overrides: Record<string, OverrideFile | undefined> = {};
for (const slug of Object.keys(data.characters)) {
  overrides[slug] = loadOverride(slug);
}
const deps: PrepareDeps = { overrides, skillLevels, cubes, olLines };

// The project tier — what the web's Optimize Overload tab measures at by default and
// what every consumer applies, so the page's table and the live tab agree row-for-row.
const tierArg = process.argv.indexOf('--tier');
const TIER = tierArg >= 0 ? Number(process.argv[tierArg + 1]) : OL_TIER;
const tierValues = olTiers.tiers.find((t) => t.tier === TIER);
if (!tierValues) {
  throw new Error(`data/ol-tiers.json has no tier ${TIER}`);
}

// Same cell as build-ol-optimal.ts: solo isolation, elemental advantage, full core
// exposure, 12/12 investment.
const SOLO_CELL: Cell = {
  framework: 'solo',
  eleadv: 'eleweak',
  core: 'c100',
  invest: '12of12',
};

// How many rows to publish. The pool tops out at 70 combos; the tail is noise
// (sub-1% spreads between near-identical spreads) and a 70-row table on a landing
// page is not readable.
const TOP_N = 10;

const charFor = (slug: string) =>
  (data.characters as Record<string, unknown>)[slug] ??
  (NOOP_CHARACTERS as Record<string, unknown>)[slug];

const onlyArg = process.argv.indexOf('--only');
const only = onlyArg >= 0 ? process.argv[onlyArg + 1] : null;

// generatorSupported && simSupported — the same eligibility as build-ol-optimal.ts
// and the DPS chart population. Without a kit override an "optimal line" is
// meaningless (no buffs or burst behavior to optimize around).
const eligible = Object.entries(data.characters).filter(
  ([slug, c]) =>
    c.generatorSupported && c.simSupported && (only == null || slug === only)
);

// The slim public projection of data/kit-status.json. ONLY these four fields are
// copied — see the header note. Every unit kit-status knows about gets an entry,
// not just the OL-eligible ones, because a unit with no overload table still has a
// Sim status section on its page.
interface KitStatusEntry {
  tier?: string;
  tuned?: boolean;
  graded?: { teams?: number; within3pct?: number };
  unmodeled?: Record<string, string[]>;
}
const kitStatus = load<{ units: Record<string, KitStatusEntry> }>(
  '../data/kit-status.json'
).units;
const slimStatus = (s: KitStatusEntry): KitStatusEntry => {
  const out: KitStatusEntry = {};
  if (s.tier != null) {
    out.tier = s.tier;
  }
  if (s.tuned != null) {
    out.tuned = s.tuned;
  }
  if (s.graded?.teams) {
    out.graded = {
      teams: s.graded.teams,
      within3pct: s.graded.within3pct ?? 0,
    };
  }
  // Drop empty slot arrays — most units have unmodeled: {skill1: [], ...}, which
  // is pure weight in the bundle and renders as nothing.
  const unmodeled = Object.fromEntries(
    Object.entries(s.unmodeled ?? {}).filter(([, lines]) => lines.length > 0)
  );
  if (Object.keys(unmodeled).length) {
    out.unmodeled = unmodeled;
  }
  return out;
};

interface UnitPage {
  ol?: { label: string; gainPct: number }[];
  status?: KitStatusEntry;
}
const units: Record<string, UnitPage> = {};
for (const [slug, s] of Object.entries(kitStatus)) {
  if (only != null && slug !== only) {
    continue;
  }
  const status = slimStatus(s);
  if (Object.keys(status).length) {
    units[slug] = { status };
  }
}

let done = 0;
for (const [slug, c] of eligible) {
  const tested = { slug, element: c.element as Element };
  // The tested unit carries only the 8-line floor here; rankFreeLineConfigs
  // substitutes the four free lines per candidate loadout.
  const team = assembleTeam(SOLO_CELL, tested);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chars = team.slugs.map(charFor) as any[];
  const { results } = rankFreeLineConfigs({
    chars,
    mult,
    cfg: team.cfg,
    deps,
    baseOpts: team.unitOpts,
    carryIdx: team.testedIndex,
    topN: TOP_N,
    tierValues,
  });
  units[slug] ??= {};
  units[slug].ol = results.map((r) => ({
    label: r.label,
    gainPct: Number(r.gainPct.toFixed(2)),
  }));
  done++;
  if (done % 20 === 0) {
    process.stderr.write(`  …${done}/${eligible.length}\n`);
  }
}

const artifact = {
  _comment:
    'Per-unit data for the /unit/<slug> landing pages, built by ' +
    'scripts/build-unit-pages.ts. units.<slug>.ol = the exhaustive ranked free-line ' +
    'overload table (the four lines beyond the 4 elem + 4 atk floor) in the Solo ' +
    'framework at T11, the same basis as data/ol-optimal.json; gainPct is over the ' +
    '8/12 floor (four free lines empty). units.<slug>.status = the slim public ' +
    'projection of data/kit-status.json (tier/tuned/graded/unmodeled only — the ' +
    'evidence/residual/findings prose is AI-facing and deliberately excluded). ' +
    'Regenerate when kits/overrides/engine change.',
  framework: 'solo',
  tier: TIER,
  topN: TOP_N,
  units,
};

const outArg = process.argv.indexOf('--out');
const out =
  outArg >= 0
    ? process.argv[outArg + 1]
    : new URL('../data/unit-pages.json', import.meta.url).pathname;
await writeJsonArtifact(out, artifact);
process.stderr.write(
  `unit-pages: ${Object.keys(units).length} units (${done} with an overload table) → ${out}\n`
);
