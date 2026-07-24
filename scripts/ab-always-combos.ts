// Item 3c (roster-generator perf plan): the always-combos retirement A/B —
// the owner-decision artifact. Generates the 5-team solo roster WITH the
// curated SOLO_ALWAYS_COMBOS pins (control — today's default) and WITHOUT them
// (treatment — pure derived search), for every audited boss weakness plus the
// no-weakness case, and reports which curated supports the derived path fields
// on its own merit.
//
//   npx tsx scripts/ab-always-combos.ts            # full table (~10 min)
//   npx tsx scripts/ab-always-combos.ts Electric   # one weakness
//
// Basis: the bench basis (scope-lock cfg, neutral boss element, uniform {}
// loadout, full 74-unit modeled pool, meta + prydwen spread + synergy exactly
// as the web wires them). The SYNCED-ROSTER case cannot be reproduced offline —
// eligibility comes from the live per-user roster sync — so that arm is a
// one-click in-app spot-check for the owner, not part of this table.
//
// DECISION RULE (plan 3c): if treatment matches or beats control on score and
// fields the crown/liter/naga-class supports by itself, the owner can retire
// the hardcoded sets (assignAlwaysCombos STAYS — it is the user-pin path).
// Until the owner rules, the curated sets remain default-ON in the web app.
import { performance } from 'node:perf_hooks';
import {
  assignAlwaysCombos,
  countSynergyPairs,
  makeCalc,
  type AlwaysCombos,
  type MetaScoring,
  type TeamResult,
} from '../src/teamcalc.js';
import type { Element } from '../src/types.js';
import { scopeLockCfg } from './lib/scope-lock.js';
import { deps, mult, generatorPool, archetypeTags } from './tests/lib/harness.js';
import { META_WEIGHTS } from '../web/src/metaWeights.js';
import bossingTiers from '../data/bossing-tiers.json' with { type: 'json' };

// ---- web-config mirrors (keep in sync with web/src/App.tsx + genCalc.ts) ----
const SOLO_ALWAYS_COMBOS: AlwaysCombos = {
  pairs: [
    ['mint', 'prika'],
    ['mast-romantic-maid', 'anchor-innocent-maid'],
  ],
  oneOf: [{ anchor: 'crown', choices: ['helm', 'naga'] }],
  singles: [
    'moran',
    'anis-star',
    'liter',
    'little-mermaid',
    'nayuta',
    'privaty',
  ],
};
const CURATED = [
  ...(SOLO_ALWAYS_COMBOS.pairs ?? []).flat(),
  ...(SOLO_ALWAYS_COMBOS.oneOf ?? []).flatMap((o) => [o.anchor, ...o.choices]),
  ...(SOLO_ALWAYS_COMBOS.singles ?? []),
];
const SYNERGY_PAIRS: [string, string][] = [
  ['pierce', 'pierce-buffer'],
  ['projectile', 'projectile-buffer'],
];
const SYNERGY_WEIGHT = 0.08;
const PRYDWEN_TIER_SCORE: Record<string, number> = {
  SSS: 5,
  SS: 4,
  S: 3,
  A: 2,
  B: 1,
  C: 0,
  D: 0,
  E: 0,
  F: 0,
};
const TIERS = (bossingTiers as { tiers: Record<string, string> }).tiers;
const prydwenScoreOf = (slug: string): number =>
  PRYDWEN_TIER_SCORE[TIERS[slug] ?? ''] ?? 0;

function metaScoringFor(weakness: Element | null): MetaScoring | undefined {
  if (!weakness) return undefined;
  const entry = META_WEIGHTS.byWeakness[weakness];
  if (!entry) return undefined;
  const fallback = new Set(META_WEIGHTS.fallbackSlugs);
  const compPop: Record<string, number> = {};
  for (const c of entry.comps) compPop[[...c.slugs].sort().join('|')] = c.pop;
  return {
    unitScore: (slug: string) =>
      fallback.has(slug)
        ? (META_WEIGHTS.tierPop[slug] ?? 0)
        : (entry.unitPop[slug] ?? 0),
    compPop,
    seedComps: entry.comps.map((c) => c.slugs),
    weight: META_WEIGHTS.weightDefault,
    comboWeight: META_WEIGHTS.comboWeight,
  };
}

const { chars, overrides } = generatorPool();
const available = (slug: string): boolean => !!(chars as any)[slug];

// soft downward spread targets (App.tsx soloSpreadTargets, full modeled pool)
const spreadTargets = (): number[] => {
  const scores = Object.keys(chars)
    .map(prydwenScoreOf)
    .sort((a, b) => b - a)
    .slice(0, 25);
  const M = scores.length ? scores.reduce((s, v) => s + v, 0) / 5 : 0;
  return [M + 2, M + 1, M, M, M - 2];
};

// mirror of web/src/genCalc.ts TEAM_CONSTRAINTS (owner ruling 2026-07-24):
// active in BOTH arms — the retirement decision replaced the curated pins with
// these fielding conditions, so reruns of this instrument compare against the
// shipped default.
const TEAM_CONSTRAINTS = {
  together: [['mint', 'prika']],
  companions: [
    {
      unit: 'naga',
      anyOf: Object.entries(archetypeTags)
        .filter(([slug, tags]) => slug !== 'naga' && tags.includes('shield'))
        .map(([slug]) => slug),
    },
  ],
};

const calcFor = (weakness: Element | null) =>
  makeCalc({
    chars: chars as any,
    mult,
    deps: { overrides, ...deps },
    cfg: scopeLockCfg([], null) as any,
    loadout: {},
    meta: metaScoringFor(weakness),
    requireElement: weakness,
    prydwenScore: prydwenScoreOf,
    synergy: { tags: archetypeTags, pairs: SYNERGY_PAIRS, weight: SYNERGY_WEIGHT },
    constraints: TEAM_CONSTRAINTS,
    cache: 'shared', // control/treatment share every sim for the same weakness
  });

// the web's ranking score (damage × meta blend × synergy) so both arms are
// compared on what the generator actually optimizes, not raw damage alone
function scoreOf(t: TeamResult, weakness: Element | null): number {
  const meta = metaScoringFor(weakness);
  const slugs = t.units.map((u) => u.slug);
  let prior = 0;
  if (meta) {
    let sum = 0;
    for (const s of slugs) sum += meta.unitScore(s);
    prior = Math.min(
      1,
      sum / slugs.length +
        meta.comboWeight * (meta.compPop[[...slugs].sort().join('|')] ?? 0),
    );
  }
  const pairs = countSynergyPairs(slugs, archetypeTags, SYNERGY_PAIRS);
  return (
    t.teamDamage *
    (1 + (meta?.weight ?? 0) * prior) *
    (1 + SYNERGY_WEIGHT * pairs)
  );
}

async function runArm(
  weakness: Element | null,
  withCombos: boolean,
): Promise<TeamResult[]> {
  const calc = calcFor(weakness);
  if (!withCombos) return calc.topTeams(5, { spreadTargets: spreadTargets() });
  // mirror App.tsx runTopTeams: fold combos, then the crown+naga → helm rule
  const ac = assignAlwaysCombos(
    SOLO_ALWAYS_COMBOS,
    [],
    chars as any,
    5,
    available,
  );
  const crownTeam = ac.pinnedByTeam.find((t) => t.includes('crown'));
  const placed = new Set([...ac.pinnedByTeam.flat(), ...ac.singles]);
  if (
    crownTeam?.includes('naga') &&
    !crownTeam.includes('helm') &&
    available('helm') &&
    !placed.has('helm')
  ) {
    ac.singles.push('helm');
  }
  return calc.topTeams(5, {
    pinnedByTeam: ac.pinnedByTeam,
    mustUse: ac.singles,
    spreadTargets: spreadTargets(),
  });
}

function report(
  weakness: Element | null,
  control: TeamResult[],
  treatment: TeamResult[],
): void {
  const label = weakness ?? 'none';
  const total = (ts: TeamResult[]) => ts.reduce((s, t) => s + t.teamDamage, 0);
  const totalScore = (ts: TeamResult[]) =>
    ts.reduce((s, t) => s + scoreOf(t, weakness), 0);
  const fielded = (ts: TeamResult[]) => {
    const used = new Set(ts.flatMap((t) => t.slugs));
    return CURATED.filter((s) => used.has(s));
  };
  const fmt = (ts: TeamResult[]) =>
    ts
      .map(
        (t) =>
          `    ${t.slugs.join(',')}  ${(t.teamDamage / 1e6).toFixed(0)}M (score ${(scoreOf(t, weakness) / 1e6).toFixed(0)}M)`,
      )
      .join('\n');
  console.log(`\n== weakness: ${label} ==`);
  console.log(
    `  control   (curated ON):  total ${(total(control) / 1e9).toFixed(2)}B, score ${(totalScore(control) / 1e9).toFixed(2)}B, ${control.length} teams`,
  );
  console.log(fmt(control));
  console.log(
    `  treatment (curated OFF): total ${(total(treatment) / 1e9).toFixed(2)}B, score ${(totalScore(treatment) / 1e9).toFixed(2)}B, ${treatment.length} teams`,
  );
  console.log(fmt(treatment));
  const cf = fielded(control);
  const tf = fielded(treatment);
  console.log(`  curated fielded — control: ${cf.length}/${CURATED.length} [${cf.join(' ')}]`);
  console.log(`  curated fielded — TREATMENT (on merit): ${tf.length}/${CURATED.length} [${tf.join(' ')}]`);
  const dropped = cf.filter((s) => !tf.includes(s));
  if (dropped.length) console.log(`  dropped by treatment: [${dropped.join(' ')}]`);
  const dScore = totalScore(treatment) / totalScore(control) - 1;
  console.log(
    `  Δ roster score (treatment vs control): ${(dScore * 100).toFixed(1)}%`,
  );
}

async function main(): Promise<void> {
  const only = process.argv[2] as Element | undefined;
  const weaknesses: (Element | null)[] = only
    ? [only]
    : [...(Object.keys(META_WEIGHTS.byWeakness) as Element[]), null];
  for (const w of weaknesses) {
    const t0 = performance.now();
    const control = await runArm(w, true);
    const treatment = await runArm(w, false);
    report(w, control, treatment);
    console.log(`  (${((performance.now() - t0) / 1000).toFixed(0)}s)`);
  }
}

void main();
