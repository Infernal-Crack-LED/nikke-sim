// audit-b3-ranks.ts — Burst-3 DPS rank audit: line the sim's own B3 DPS chart up against the
// Japanese community damage-score lists, with the community Tsareena build sheet as a third,
// weaker opinion. FINDINGS ONLY — this script never edits an override, a constant, or the chart.
//
//   npx tsx scripts/audit-b3-ranks.ts
//   npx tsx scripts/audit-b3-ranks.ts --framework=solo --invest=scope --core=c100
//   npx tsx scripts/audit-b3-ranks.ts --md=docs/b3-dps-rank-audit.md --full
//
// Inputs
//   web/public/dpschart.json          the sim's B3 DPS chart (build with `npx tsx scripts/build-dpschart.ts`)
//   docs/data/ranks/*_scores.csv      owner-supplied community score lists (GITIGNORED — not in a
//                                     clean clone; the script hard-fails and says so)
//   docs/data/community-rank-names.json  JP row name -> slug (committed)
//   data/tsareena-build.json          community build sheet: per-unit investment priority
//   data/characters.json              roster identity
//
// Method (stated because the two lists are not natively comparable)
//   * BEST-ROW-PER-SLUG on both sides. The community list scores some units several times (comp
//     conditions, Treasure vs not, damage-branch splits) and the sim chart carries profile rows for
//     the same reason; taking each side's best row for a slug compares "this unit's best expression"
//     to "this unit's best expression" and sidesteps a pairing that has no correct answer.
//   * Ranks are RE-COMPUTED over the INTERSECTION only. Raw rank 12-of-88 and raw rank 12-of-76 are
//     different claims; every delta below is rank-within-the-same-population.
//   * The two lists' arms are matched: the community neutral list vs a `neutral` cell, the
//     elemental-advantage list vs an `eleweak` cell.
//   * Rank RANGE across all 90 chart cells is reported so a flag can be told apart from an artifact
//     of the one cell the audit happens to headline.
//
// Weighting, per the audit's brief: the CSV score lists are the primary authority for DAMAGE, the
// Tsareena sheet the secondary one. Where they disagree the disagreement is reported and the CSV
// is used, because the Tsareena sheet's priority ranks whole-account investment value (support,
// PvP and campaign utility included), not damage output.
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import {
  CELLS,
  CORE_IDS,
  FRAMEWORKS,
  INVEST_IDS,
  cellId,
  type Cell,
  type CoreId,
  type FrameworkId,
  type InvestId,
} from '../src/dpschart/matrix.js';
import { boardStats, collectBoardReadings } from './lib/board-readings.js';

// ---- inputs ---------------------------------------------------------------

const CHART_PATH = 'web/public/dpschart.json';
const CSV = {
  neutral: 'docs/data/ranks/neutral_scores.csv',
  eleweak: 'docs/data/ranks/ele_adv_nikke_scores.csv',
} as const;
const NAME_MAP_PATH = 'docs/data/community-rank-names.json';

interface DpsArtifact {
  generatedAt: string;
  units: Record<string, { name: string; element: string; weapon: string }>;
  profiles: Record<string, string>;
  cells: Record<string, [string, number, string | null][]>;
}
interface NameMapEntry {
  slug: string | null;
  variant?: string;
  simProfile?: string;
  treasure?: 'withTreasure' | 'noTreasure' | 'unmarked';
  compConditioned?: boolean;
  confidence?: 'low';
}

function readJson<T>(path: string, hint: string): T {
  if (!existsSync(path)) {
    throw new Error(`missing input ${path} — ${hint}`);
  }
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

// ---- args -----------------------------------------------------------------

interface Args {
  framework: FrameworkId;
  invest: InvestId;
  core: CoreId;
  md: string | null;
  full: boolean;
  board: boolean;
}
function parseArgs(argv: string[]): Args {
  const out: Args = {
    framework: 'standard-hc',
    invest: '12of12',
    core: 'c50',
    md: null,
    full: false,
    board: true,
  };
  for (const arg of argv) {
    const [flag, value] = arg.split(/=(.*)/s);
    switch (flag) {
      case '--framework':
        if (!(value in FRAMEWORKS)) {
          throw new Error(
            `--framework must be one of ${Object.keys(FRAMEWORKS).join(', ')} (got ${value})`
          );
        }
        out.framework = value as FrameworkId;
        break;
      case '--invest':
        if (!(INVEST_IDS as readonly string[]).includes(value)) {
          throw new Error(
            `--invest must be one of ${INVEST_IDS.join(', ')} (got ${value})`
          );
        }
        out.invest = value as InvestId;
        break;
      case '--core':
        if (!(CORE_IDS as readonly string[]).includes(value)) {
          throw new Error(
            `--core must be one of ${CORE_IDS.join(', ')} (got ${value})`
          );
        }
        out.core = value as CoreId;
        break;
      case '--md':
        if (!value) {
          throw new Error('--md needs a path (--md=docs/b3-dps-rank-audit.md)');
        }
        out.md = value;
        break;
      case '--full':
        out.full = true;
        break;
      case '--no-board':
        // the measured cross-check re-runs every graded comp; skip it for a fast structural read
        out.board = false;
        break;
      default:
        throw new Error(
          `unrecognized argument ${arg} — supported: --framework= --invest= --core= --md= --full --no-board`
        );
    }
  }
  return out;
}

// ---- community score lists ------------------------------------------------

interface CsvRow {
  rawRank: number;
  name: string;
  score: number;
}
function readScoreCsv(path: string): CsvRow[] {
  if (!existsSync(path)) {
    throw new Error(
      `missing ${path} — the community score CSVs live under docs/data/ranks/, which is GITIGNORED. ` +
        `They are owner-supplied third-party lists; copy them back in before re-running this audit.`
    );
  }
  const lines = readFileSync(path, 'utf8').trim().split('\n');
  const header = lines[0].trim();
  if (header !== 'number,name,score') {
    throw new Error(
      `${path}: unexpected header "${header}" (want number,name,score)`
    );
  }
  return lines.slice(1).map((line, i) => {
    const parts = line.trim().split(',');
    if (parts.length !== 3) {
      throw new Error(
        `${path} line ${i + 2}: expected 3 columns, got "${line}"`
      );
    }
    const score = Number(parts[2]);
    if (!Number.isFinite(score)) {
      throw new Error(`${path} line ${i + 2}: non-numeric score "${parts[2]}"`);
    }
    return { rawRank: Number(parts[0]), name: parts[1], score };
  });
}

// ---- main -----------------------------------------------------------------

const args = parseArgs(process.argv.slice(2));

const chart = readJson<DpsArtifact>(
  CHART_PATH,
  'build it with `npx tsx scripts/build-dpschart.ts`'
);
const nameMap = readJson<{ map: Record<string, NameMapEntry> }>(
  NAME_MAP_PATH,
  'this file is committed; restore it from git'
).map;
const tsareenaSheet = readJson<{
  syncedAt: string;
  units: Record<
    string,
    {
      priority: string;
      build: { endgameUses: string | null; notes: string | null };
    }
  >;
}>('data/tsareena-build.json', 'sync it from the bakery-bot DB');
const tsareena = tsareenaSheet.units;
// Per-unit evidence tier + open kit findings. MODEL_ONLY means nothing has ever been measured
// against a real fight for this unit, so a rank disagreement there is unsurprising; a
// MEASURED/CALIBRATED unit disagreeing is a much louder signal.
const kitStatus = readJson<{
  units: Record<
    string,
    {
      tier?: string;
      kitParse?: { status?: string; provenance?: string; findings?: string[] };
    }
  >;
}>(
  'data/kit-status.json',
  'regenerate with `npx tsx scripts/kit-status.ts --refresh`'
).units;

const roster = readJson<{
  characters: Record<
    string,
    {
      slug: string;
      name: string;
      burst: string;
      class: string;
      element: string;
      treasure: boolean;
    }
  >;
}>('data/characters.json', 'sync it with scripts/sync').characters;

const arms = ['neutral', 'eleweak'] as const;
type Arm = (typeof arms)[number];

// --- resolve every community row, loudly ---
interface CommunityRow extends CsvRow {
  arm: Arm;
  entry: NameMapEntry;
}
const unmappedNames: string[] = [];
const community: Record<Arm, CommunityRow[]> = { neutral: [], eleweak: [] };
for (const arm of arms) {
  for (const row of readScoreCsv(CSV[arm])) {
    const entry = nameMap[row.name];
    if (!entry) {
      unmappedNames.push(`${arm}: ${row.name}`);
      continue;
    }
    community[arm].push({ ...row, arm, entry });
  }
}
if (unmappedNames.length) {
  throw new Error(
    `${unmappedNames.length} community row name(s) are not in ${NAME_MAP_PATH} — add them ` +
      `(never let an unrecognised name fall through silently):\n  ${unmappedNames.join('\n  ')}`
  );
}

// --- best community row per slug, per arm ---
interface CommunityBest {
  slug: string;
  score: number;
  rawRank: number;
  name: string;
  entry: NameMapEntry;
  otherRows: CommunityRow[];
}
const excluded = {
  zeroScore: new Set<string>(),
  lowConfidence: new Set<string>(),
  compConditioned: new Map<string, CommunityRow>(),
};
function bestPerSlug(rows: CommunityRow[]): Map<string, CommunityBest> {
  const out = new Map<string, CommunityBest>();
  for (const row of rows) {
    const slug = row.entry.slug;
    if (!slug) {
      continue;
    }
    if (row.entry.confidence === 'low') {
      excluded.lowConfidence.add(row.name);
      continue;
    }
    if (row.score === 0) {
      // score 0 on these lists means "not evaluated", not "deals no damage".
      excluded.zeroScore.add(row.name);
      continue;
    }
    if (row.entry.compConditioned) {
      // Scored with a partner no control framework fields — ranking it against a chart cell
      // would compare two different teams and read as a sim error. Reported separately.
      excluded.compConditioned.set(row.name, row);
      continue;
    }
    const prev = out.get(slug);
    if (!prev) {
      out.set(slug, {
        slug,
        score: row.score,
        rawRank: row.rawRank,
        name: row.name,
        entry: row.entry,
        otherRows: [],
      });
    } else if (row.score > prev.score) {
      out.set(slug, {
        slug,
        score: row.score,
        rawRank: row.rawRank,
        name: row.name,
        entry: row.entry,
        otherRows: [...prev.otherRows, { ...prev } as unknown as CommunityRow],
      });
    } else {
      prev.otherRows.push(row);
    }
  }
  return out;
}
const communityBest: Record<Arm, Map<string, CommunityBest>> = {
  neutral: bestPerSlug(community.neutral),
  eleweak: bestPerSlug(community.eleweak),
};

// --- best sim row per slug, per cell ---
function simBestPerSlug(
  cell: Cell
): Map<string, { dps: number; profile: string | null }> {
  const rows = chart.cells[cellId(cell)];
  if (!rows) {
    throw new Error(`chart has no cell ${cellId(cell)}`);
  }
  const out = new Map<string, { dps: number; profile: string | null }>();
  for (const [slug, dps, profile] of rows) {
    const prev = out.get(slug);
    if (!prev || dps > prev.dps) {
      out.set(slug, { dps, profile });
    }
  }
  return out;
}
const headlineCell: Record<Arm, Cell> = {
  neutral: {
    framework: args.framework,
    eleadv: 'neutral',
    core: args.core,
    invest: args.invest,
  },
  eleweak: {
    framework: args.framework,
    eleadv: 'eleweak',
    core: args.core,
    invest: args.invest,
  },
};
const simBest: Record<
  Arm,
  Map<string, { dps: number; profile: string | null }>
> = {
  neutral: simBestPerSlug(headlineCell.neutral),
  eleweak: simBestPerSlug(headlineCell.eleweak),
};

// --- rank range across every cell of the matrix (robustness) ---
const rankRange = new Map<string, { min: number; max: number }>();
for (const cell of CELLS) {
  const ordered = [...simBestPerSlug(cell).entries()].sort(
    (a, b) => b[1].dps - a[1].dps
  );
  ordered.forEach(([slug], i) => {
    const rank = i + 1;
    const cur = rankRange.get(slug);
    if (!cur) {
      rankRange.set(slug, { min: rank, max: rank });
    } else {
      cur.min = Math.min(cur.min, rank);
      cur.max = Math.max(cur.max, rank);
    }
  });
}

// --- the comparable population, per arm ---
interface Compared {
  slug: string;
  name: string;
  element: string;
  weapon: string;
  communityRank: number;
  communityScore: number;
  communityRowName: string;
  simRank: number;
  simDps: number;
  simProfile: string | null;
  delta: number; // simRank − communityRank; + = sim ranks it WORSE than the community does
}
function compare(arm: Arm): Compared[] {
  const cb = communityBest[arm];
  const sb = simBest[arm];
  const shared = [...cb.keys()].filter((slug) => sb.has(slug));
  const cOrder = shared
    .slice()
    .sort((a, b) => cb.get(b)!.score - cb.get(a)!.score);
  const sOrder = shared.slice().sort((a, b) => sb.get(b)!.dps - sb.get(a)!.dps);
  const cRank = new Map(cOrder.map((s, i) => [s, i + 1]));
  const sRank = new Map(sOrder.map((s, i) => [s, i + 1]));
  return shared
    .map((slug) => {
      const unit = roster[slug];
      const chartUnit = chart.units[slug];
      return {
        slug,
        name: unit?.name ?? slug,
        element: unit?.element ?? chartUnit?.element ?? '?',
        weapon: chartUnit?.weapon ?? '?',
        communityRank: cRank.get(slug)!,
        communityScore: cb.get(slug)!.score,
        communityRowName: cb.get(slug)!.name,
        simRank: sRank.get(slug)!,
        simDps: sb.get(slug)!.dps,
        simProfile: sb.get(slug)!.profile,
        delta: sRank.get(slug)! - cRank.get(slug)!,
      };
    })
    .sort((a, b) => a.communityRank - b.communityRank);
}
const compared: Record<Arm, Compared[]> = {
  neutral: compare('neutral'),
  eleweak: compare('eleweak'),
};

// --- Tsareena priority, as a PvE-damage-relevance ladder ---
const PRIORITY_SCORE: Record<string, number | null> = {
  'Highest Priority': 5,
  'High Priority': 4,
  'High PvE Priority': 4,
  'Medium Priority': 3,
  'PvE Medium Priority': 3,
  'Low Priority': 2,
  'PvE Low Priority': 2,
  'PvP Medium Priority': 0,
  'PvP Low Priority': 0,
  'High Support Priority': null, // ranks support value; not a damage claim at all
};
function tsareenaOf(slug: string) {
  const t = tsareena[slug];
  if (!t) {
    return null;
  }
  if (!(t.priority in PRIORITY_SCORE)) {
    throw new Error(
      `unrecognised Tsareena priority "${t.priority}" on ${slug} — add it to PRIORITY_SCORE ` +
        `rather than letting it score as unknown`
    );
  }
  return {
    priority: t.priority,
    score: PRIORITY_SCORE[t.priority],
    soloRaid: (t.build.endgameUses ?? '').toLowerCase().includes('solo raid'),
    notes: t.build.notes,
  };
}

// --- basis caveats: places the two sides are not measuring the same build ---
function basisCaveat(slug: string): string | null {
  const entry =
    communityBest.eleweak.get(slug)?.entry ??
    communityBest.neutral.get(slug)?.entry;
  if (!entry) {
    return null;
  }
  if (entry.treasure === 'unmarked' && roster[slug]?.treasure) {
    return (
      'BASIS: the sim runs the **Treasure** build (validation basis is treasure-on); the community list ' +
      'scores this unit once with no 宝もの marker. On the four units it does mark both ways the Treasure ' +
      'row scores roughly double the plain one, so part of this gap may be a build mismatch rather than a model error.'
    );
  }
  if (entry.treasure === 'noTreasure') {
    return 'BASIS: only the non-Treasure community row was available for this slug.';
  }
  if (entry.variant) {
    return `BASIS: community row is the conditioned one — ${entry.variant}.`;
  }
  return null;
}

// --- measured cross-check: does the accuracy board agree with the flag's direction? ---
// Board ratio is sim/real: >1 = HOT (the sim over-models this unit against real fights),
// <1 = COLD (it under-models). A rank flag saying "the sim rates this unit too high" is
// CORROBORATED by a HOT board reading and CONTRARY to a COLD one.
interface Measured {
  n: number;
  mean: number;
  temp: string;
  band: string;
}
const measured = new Map<string, Measured>();
if (args.board) {
  for (const [slug, records] of Object.entries(collectBoardReadings())) {
    const s = boardStats(records);
    measured.set(slug, { n: s.n, mean: s.mean, temp: s.temp, band: s.band });
  }
}
function measuredCell(slug: string): string {
  const tier = kitStatus[slug]?.tier ?? '?';
  const m = measured.get(slug);
  const reading = !args.board
    ? 'board check not run'
    : m
      ? `${m.temp} ${m.mean.toFixed(2)} (n=${m.n}, ${m.band})`
      : '**no measured data**';
  return `${tier} · ${reading}`;
}
function corroboration(
  slug: string,
  kind: 'sim-under-rates' | 'sim-over-rates'
): string {
  const m = measured.get(slug);
  if (!args.board) {
    return '';
  }
  if (!m) {
    return 'unmeasured — no real fight recorded for this unit';
  }
  // Use the board's own HOT/COLD/OK banding (±3% of parity is noise) rather than the raw sign,
  // so a 0.98 reading is not dressed up as agreement.
  const hot = m.temp.startsWith('HOT');
  const cold = m.temp.startsWith('COLD');
  if (!hot && !cold) {
    return 'NEUTRAL — the board reads this unit at parity (within the ±3% noise band)';
  }
  if (kind === 'sim-over-rates' && hot) {
    return 'CORROBORATED — the board also reads the sim HOT here';
  }
  if (kind === 'sim-under-rates' && cold) {
    return 'CORROBORATED — the board also reads the sim COLD here';
  }
  return `CONTRARY — the board reads the sim ${hot ? 'HOT' : 'COLD'} here, the opposite direction`;
}

// ---- flags ----------------------------------------------------------------

type Severity = 'MAJOR' | 'NOTABLE';
interface Flag {
  kind: 'sim-under-rates' | 'sim-over-rates' | 'csv-vs-tsareena' | 'coverage';
  severity: Severity;
  slug: string;
  arm: Arm | 'both';
  detail: string;
}
const flags: Flag[] = [];

const N = {
  neutral: compared.neutral.length,
  eleweak: compared.eleweak.length,
};

for (const arm of arms) {
  for (const row of compared[arm]) {
    const range = rankRange.get(row.slug);
    const rangeNote = range
      ? ` (sim rank across all 90 cells: ${range.min}–${range.max})`
      : '';
    const absoluteUnder = row.communityRank <= 10 && row.simRank > 20;
    const absoluteOver = row.simRank <= 10 && row.communityRank > 20;
    if (row.delta >= 10 || absoluteUnder) {
      flags.push({
        kind: 'sim-under-rates',
        severity: row.delta >= 20 || absoluteUnder ? 'MAJOR' : 'NOTABLE',
        slug: row.slug,
        arm,
        detail: `community #${row.communityRank}, sim #${row.simRank} of ${N[arm]} (Δ +${row.delta})${rangeNote}`,
      });
    }
    if (row.delta <= -10 || absoluteOver) {
      flags.push({
        kind: 'sim-over-rates',
        severity: row.delta <= -20 || absoluteOver ? 'MAJOR' : 'NOTABLE',
        slug: row.slug,
        arm,
        detail: `sim #${row.simRank}, community #${row.communityRank} of ${N[arm]} (Δ ${row.delta})${rangeNote}`,
      });
    }
  }
}

// CSV vs Tsareena disagreements, on the CSV's terms (the CSV is the one we act on).
for (const row of compared.eleweak) {
  const t = tsareenaOf(row.slug);
  if (!t) {
    continue;
  }
  const topThird = row.communityRank <= Math.ceil(N.eleweak / 3);
  const bottomThird = row.communityRank > Math.ceil((2 * N.eleweak) / 3);
  const lowPriority = t.score !== null && t.score <= 2;
  if (topThird && (lowPriority || !t.soloRaid)) {
    flags.push({
      kind: 'csv-vs-tsareena',
      severity: t.score === 0 || !t.soloRaid ? 'MAJOR' : 'NOTABLE',
      slug: row.slug,
      arm: 'eleweak',
      detail:
        `CSV #${row.communityRank}/${N.eleweak} (top third) but Tsareena "${t.priority}"` +
        (t.soloRaid ? '' : ' — and lists no Solo Raid endgame use at all'),
    });
  }
  if (bottomThird && t.score !== null && t.score >= 4) {
    flags.push({
      kind: 'csv-vs-tsareena',
      severity: 'NOTABLE',
      slug: row.slug,
      arm: 'eleweak',
      detail: `CSV #${row.communityRank}/${N.eleweak} (bottom third) but Tsareena "${t.priority}"`,
    });
  }
}

// Coverage: who is on one side and not the other.
const simSlugs = new Set(simBest.eleweak.keys());
const csvSlugs = new Set(communityBest.eleweak.keys());
const simOnly = [...simSlugs].filter((s) => !csvSlugs.has(s));
const csvOnly = [...csvSlugs].filter((s) => !simSlugs.has(s));

// ---- report ---------------------------------------------------------------

const out: string[] = [];
const p = (s = '') => out.push(s);
const fmt = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 0 });
const label = (slug: string) => `${roster[slug]?.name ?? slug} (\`${slug}\`)`;

p('# Burst-3 DPS rank audit — sim chart vs the community damage lists');
p();
p(
  `Generated by \`npx tsx scripts/audit-b3-ranks.ts${process.argv.slice(2).length ? ' ' + process.argv.slice(2).join(' ') : ''}\`. ` +
    `Findings only — nothing here has been enacted.`
);
p();
p('## Basis');
p();
p(`| | |`);
p(`| --- | --- |`);
p(`| Sim chart | \`${CHART_PATH}\`, generated ${chart.generatedAt} |`);
p(
  `| Headline cell | \`${args.framework}\` framework · core \`${args.core}\` · investment \`${args.invest}\`, one cell per arm |`
);
p(
  `| Community lists | \`${CSV.neutral}\` and \`${CSV.eleweak}\` (owner-supplied, gitignored) |`
);
p(
  `| Tsareena sheet | \`data/tsareena-build.json\`, synced ${tsareenaSheet.syncedAt.slice(0, 10)} (${Object.keys(tsareena).length} of ${Object.keys(roster).length} roster units covered) |`
);
p(
  `| Compared population | ${N.neutral} slugs (neutral arm), ${N.eleweak} slugs (elemental-advantage arm) — ranks re-computed over the intersection |`
);
p(
  `| Measured cross-check | ${args.board ? `\`scripts/lib/board-readings.ts\` — ${measured.size} units with real recorded fights` : 'skipped (`--no-board`)'} |`
);
p();
p(
  'Δ is `sim rank − community rank`. **Positive Δ = the sim ranks the unit WORSE than the community does** ' +
    '(candidate under-model); negative Δ = the sim ranks it better (candidate over-model).'
);
p();

p(
  '## 1. Flags — the sim ranks a unit BELOW where the community damage lists put it'
);
p();
const under = flags.filter((f) => f.kind === 'sim-under-rates');
p(renderFlagTable(under, 'sim-under-rates'));
p();

p(
  '## 2. Flags — the sim ranks a unit ABOVE where the community damage lists put it'
);
p();
const over = flags.filter((f) => f.kind === 'sim-over-rates');
p(renderFlagTable(over, 'sim-over-rates'));
p();

// Open kit-status findings on the loudest flags — an already-known modelling gap is the first
// place to look before treating a rank disagreement as a new discovery.
const majorSlugs = [
  ...new Set(
    flags
      .filter(
        (f) =>
          f.severity === 'MAJOR' &&
          (f.kind === 'sim-under-rates' || f.kind === 'sim-over-rates')
      )
      .map((f) => f.slug)
  ),
];
const withFindings = majorSlugs
  .map((slug) => ({
    slug,
    // drop the per-run "gauntlet: GO, faithfulness N" header line — it is a provenance stamp,
    // not a finding, and it buries the real ones.
    findings: (kitStatus[slug]?.kitParse?.findings ?? []).filter(
      (f) => !/^kit-autonomy gauntlet/.test(f)
    ),
  }))
  .filter((r) => r.findings.length);
p('## 3. Already-known kit findings on the MAJOR-flagged units');
p();
p(
  'Straight from `data/kit-status.json` — where a flag already has a recorded explanation, it is not a new discovery.'
);
p();
if (!withFindings.length) {
  p('_None recorded._');
} else {
  for (const { slug, findings } of withFindings) {
    p(`**${label(slug)}**`);
    p();
    for (const f of findings) {
      p(`- ${f.replace(/\n+/g, ' ')}`);
    }
    p();
  }
}

p('## 4. CSV vs Tsareena conflicts');
p();
p(
  "Reported, then **resolved in the CSV's favour** — the Tsareena sheet ranks whole-account " +
    'investment priority (support, PvP and campaign value folded in), the CSV lists rank damage.'
);
p();
const conflicts = flags.filter((f) => f.kind === 'csv-vs-tsareena');
if (!conflicts.length) {
  p('_None._');
} else {
  p('| Unit | Severity | Conflict |');
  p('| --- | --- | --- |');
  for (const f of dedupe(conflicts)) {
    p(`| ${label(f.slug)} | ${f.severity} | ${f.detail} |`);
  }
}
p();

p('## 5. Coverage gaps');
p();
p('**On the sim chart, absent from the community lists:**');
p();
if (!simOnly.length) {
  p('_None._');
} else {
  for (const slug of simOnly.sort()) {
    const r = rankRange.get(slug);
    p(
      `- ${label(slug)} — sim rank range ${r?.min}–${r?.max} across the 90 cells`
    );
  }
}
p();
p('**On the community lists, absent from the sim chart:**');
p();
if (!csvOnly.length) {
  p('_None._');
} else {
  for (const slug of csvOnly.sort()) {
    const c = communityBest.eleweak.get(slug)!;
    p(
      `- ${label(slug)} — community raw rank ${c.rawRank}/88, score ${c.score} (row \`${c.name}\`)`
    );
  }
}
p();
if (excluded.zeroScore.size) {
  p(
    `**Scored 0 by the community lists** (means "not evaluated", not "no damage") — excluded from every rank above: ` +
      [...excluded.zeroScore].map((n) => `\`${n}\``).join(', ')
  );
  p();
}
if (excluded.lowConfidence.size) {
  p(
    `**Unresolved community row names** — excluded from every rank above: ` +
      [...excluded.lowConfidence]
        .map((n) => `\`${n}\` (${nameMap[n]?.variant ?? 'no resolution'})`)
        .join('; ')
  );
  p();
}
if (excluded.compConditioned.size) {
  p(
    '**Comp-conditioned community rows** — no comparable chart cell, so excluded from every rank above:'
  );
  p();
  for (const [name, row] of excluded.compConditioned) {
    const plain = communityBest[row.arm].get(row.entry.slug!);
    p(
      `- \`${name}\` → ${label(row.entry.slug!)} — score ${row.score} (community raw rank ${row.rawRank}/88)` +
        (plain
          ? `, vs ${plain.score} for the unconditioned \`${plain.name}\` row`
          : '') +
        `. ${row.entry.variant}`
    );
  }
  p();
}

// Every community row that lost the best-per-slug contest, so the pairing is auditable.
const alternates = arms
  .flatMap((arm) => [...communityBest[arm].values()].map((b) => ({ arm, b })))
  .filter(({ b }) => b.otherRows.length);
if (alternates.length) {
  p(
    '**Alternate community rows folded into a best-per-slug pick** (the higher-scoring row was used):'
  );
  p();
  const seen = new Set<string>();
  for (const { b } of alternates) {
    if (seen.has(b.slug)) {
      continue;
    }
    seen.add(b.slug);
    p(
      `- ${label(b.slug)} — used \`${b.name}\`; also on the list: ` +
        b.otherRows.map((r) => `\`${r.name}\``).join(', ')
    );
  }
  p();
}

// Does a flag survive a change of framework/investment, or is it an artifact of the headline cell?
// Ranks below are re-computed over the SAME intersection population as the headline, so they are
// directly comparable to the community rank.
{
  const shared = compared.eleweak.map((r) => r.slug);
  const probe: { key: string; label: string; cell: Cell }[] = [
    {
      key: 'soloScope',
      label: 'Solo · scope lock',
      cell: {
        framework: 'solo',
        eleadv: 'eleweak',
        core: 'c100',
        invest: 'scope',
      },
    },
    {
      key: 'solo12',
      label: 'Solo · 12/12',
      cell: {
        framework: 'solo',
        eleadv: 'eleweak',
        core: 'c100',
        invest: '12of12',
      },
    },
    {
      key: 'std',
      label: 'Standard · 12/12',
      cell: {
        framework: 'standard',
        eleadv: 'eleweak',
        core: args.core,
        invest: '12of12',
      },
    },
    {
      key: 'hc',
      label: 'Standard HC · 12/12 (headline)',
      cell: headlineCell.eleweak,
    },
  ];
  const ranks = probe.map(({ cell }) => {
    const best = simBestPerSlug(cell);
    const ordered = shared
      .slice()
      .sort((a, b) => best.get(b)!.dps - best.get(a)!.dps);
    return new Map(ordered.map((s, i) => [s, i + 1]));
  });
  const flaggedSlugs = [
    ...new Set(
      flags
        .filter(
          (f) => f.kind === 'sim-under-rates' || f.kind === 'sim-over-rates'
        )
        .map((f) => f.slug)
    ),
  ];
  p('## 6. Does the flag survive a change of framework?');
  p();
  p(
    'Every rank here is over the same elemental-advantage intersection, so the columns are directly ' +
      'comparable. A flag that only exists in one column is a statement about the control comp, not about the unit.'
  );
  p();
  p(
    `| Unit | Community # | ${probe.map((x) => x.label + ' #').join(' | ')} | Reading |`
  );
  p(`| --- | ---: | ${probe.map(() => '---:').join(' | ')} | --- |`);
  const commRank = new Map(
    compared.eleweak.map((r) => [r.slug, r.communityRank])
  );
  for (const slug of flaggedSlugs.sort(
    (a, b) => (commRank.get(a) ?? 999) - (commRank.get(b) ?? 999)
  )) {
    const c = commRank.get(slug)!;
    const rs = ranks.map((m) => m.get(slug)!);
    const deltas = rs.map((r) => Math.abs(r - c));
    const spread = Math.max(...deltas) - Math.min(...deltas);
    const bestIdx = deltas.indexOf(Math.min(...deltas));
    const reading =
      spread >= 10
        ? `framework-sensitive — closest under **${probe[bestIdx].label}** (Δ ${rs[bestIdx] - c > 0 ? '+' : ''}${rs[bestIdx] - c})`
        : 'consistent across all four';
    p(`| ${label(slug)} | ${c} | ${rs.join(' | ')} | ${reading} |`);
  }
  p();
}

if (args.board) {
  const flagged = [
    ...new Set(
      flags
        .filter(
          (f) => f.kind === 'sim-under-rates' || f.kind === 'sim-over-rates'
        )
        .map((f) => f.slug)
    ),
  ];
  const unmeasured = flagged.filter((s) => !measured.has(s));
  p('## 7. Recording priorities');
  p();
  p(
    `${unmeasured.length} of the ${flagged.length} flagged units have **no real fight recorded at all**, ` +
      'so nothing in this audit can be resolved for them without footage. Ranked by how loud the disagreement is:'
  );
  p();
  p('| Unit | Worst Δ | Direction | Tier |');
  p('| --- | ---: | --- | --- |');
  const worstBySlug = new Map<string, { d: number; kind: string }>();
  for (const f of flags) {
    if (f.kind !== 'sim-under-rates' && f.kind !== 'sim-over-rates') {
      continue;
    }
    const d = Math.abs(Number(/Δ ?\+?(-?\d+)/.exec(f.detail)?.[1] ?? 0));
    const cur = worstBySlug.get(f.slug);
    if (!cur || d > cur.d) {
      worstBySlug.set(f.slug, { d, kind: f.kind });
    }
  }
  for (const slug of unmeasured.sort(
    (a, b) => (worstBySlug.get(b)?.d ?? 0) - (worstBySlug.get(a)?.d ?? 0)
  )) {
    const w = worstBySlug.get(slug)!;
    p(
      `| ${label(slug)} | ${w.d} | ${w.kind === 'sim-over-rates' ? 'sim rates it too high' : 'sim rates it too low'} | ${kitStatus[slug]?.tier ?? '?'} |`
    );
  }
  p();
}

if (args.full) {
  for (const arm of arms) {
    p(
      `## Full table — ${arm === 'neutral' ? 'neutral' : 'elemental-advantage'} arm`
    );
    p();
    p(
      '| Community # | Sim # | Δ | Unit | Element | Weapon | Community score | Sim DPS | Sim range | Measured | Tsareena |'
    );
    p(
      '| ---: | ---: | ---: | --- | --- | --- | ---: | ---: | --- | --- | --- |'
    );
    for (const row of compared[arm]) {
      const t = tsareenaOf(row.slug);
      const r = rankRange.get(row.slug);
      p(
        `| ${row.communityRank} | ${row.simRank} | ${row.delta > 0 ? '+' : ''}${row.delta} | ${label(row.slug)}${row.simProfile ? ` [${row.simProfile}]` : ''} | ${row.element} | ${row.weapon} | ${row.communityScore} | ${fmt(row.simDps)} | ${r?.min}–${r?.max} | ${measuredCell(row.slug).replace(/\*\*/g, '')} | ${t ? t.priority : '—'} |`
      );
    }
    p();
  }
}

function dedupe(list: Flag[]): Flag[] {
  const seen = new Map<string, Flag>();
  for (const f of list) {
    const key = `${f.slug}|${f.kind}|${f.detail}`;
    if (!seen.has(key)) {
      seen.set(key, f);
    }
  }
  return [...seen.values()];
}

function renderFlagTable(
  list: Flag[],
  kind: 'sim-under-rates' | 'sim-over-rates'
): string {
  if (!list.length) {
    return '_None._';
  }
  // Merge the two arms into one row per unit so a unit flagged in both reads once.
  const bySlug = new Map<string, Flag[]>();
  for (const f of list) {
    if (!bySlug.has(f.slug)) {
      bySlug.set(f.slug, []);
    }
    bySlug.get(f.slug)!.push(f);
  }
  const rows = [...bySlug.entries()]
    .map(([slug, fs]) => {
      const severity: Severity = fs.some((f) => f.severity === 'MAJOR')
        ? 'MAJOR'
        : 'NOTABLE';
      const worst = Math.max(
        ...fs.map((f) =>
          Math.abs(Number(/Δ ?\+?(-?\d+)/.exec(f.detail)?.[1] ?? 0))
        )
      );
      const t = tsareenaOf(slug);
      const caveat = basisCaveat(slug);
      return {
        slug,
        severity,
        worst,
        detail:
          fs.map((f) => `**${f.arm}** — ${f.detail}`).join('<br>') +
          (caveat ? `<br>⚠ ${caveat}` : ''),
        tsareena: t ? t.priority : '—',
        measured: `${measuredCell(slug)}<br>${corroboration(slug, kind)}`,
      };
    })
    .sort((a, b) =>
      a.severity === b.severity
        ? b.worst - a.worst
        : a.severity === 'MAJOR'
          ? -1
          : 1
    );
  const lines = [
    '| Unit | Severity | Where they disagree | Measured board (sim/real) | Tsareena |',
    '| --- | --- | --- | --- | --- |',
  ];
  for (const r of rows) {
    lines.push(
      `| ${label(r.slug)} | ${r.severity} | ${r.detail} | ${r.measured} | ${r.tsareena} |`
    );
  }
  return lines.join('\n');
}

const report = out.join('\n') + '\n';
if (args.md) {
  writeFileSync(args.md, report);
  console.log(`wrote ${args.md} (${report.split('\n').length} lines)`);
} else {
  console.log(report);
}
