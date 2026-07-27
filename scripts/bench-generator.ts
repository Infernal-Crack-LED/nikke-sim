// Tracked perf harness for the roster generator (docs/handoffs/2026-07-24-roster-generator-perf-plan.md
// item 0). The A/B instrument every later item cites — NOT part of verify.sh (perf, not correctness).
//
//   npx tsx scripts/bench-generator.ts --single   # single-sim cost (cold/warm/avg)
//   npx tsx scripts/bench-generator.ts --best      # bestTeam: wall time + sim count + team
//   npx tsx scripts/bench-generator.ts --top [N]   # topTeams(N=5): wall time + sim count + teams
//   npx tsx scripts/bench-generator.ts --focus     # focus-slot (middle-slot ×2.5) spread + solo-rank
//   npx tsx scripts/bench-generator.ts --polish [N] # item-4 A/B: greedy-only vs cross-team polish
//   npx tsx scripts/bench-generator.ts --all       # everything
//
// Sim counts are exact: a counting `loadoutFor` (called once per unit = 5× per uncached sim)
// tallies calls and we divide by 5. Fixtures come from scripts/tests/lib/harness.ts (the same
// generator pool the vitest suite uses), so the numbers track the shipped config.
import { performance } from 'node:perf_hooks';
import { makeCalc } from '../src/teamcalc.js';
import { runSim } from '../src/engine/sim.js';
import { prepareTeam } from '../src/prepare.js';
import { scopeLockCfg } from './lib/scope-lock.js';
import {
  deps,
  mult,
  generatorPool,
  archetypeTags,
} from './tests/lib/harness.js';

const { genChars, chars, overrides } = generatorPool();
const D = { overrides, ...deps };
const SYNERGY = {
  tags: archetypeTags,
  pairs: [
    ['pierce', 'pierce-buffer'],
    ['projectile', 'projectile-buffer'],
  ] as [string, string][],
  weight: 0.08,
};
// mirror of web/src/genCalc.ts TEAM_CONSTRAINTS (owner ruling 2026-07-24) — the
// bench tracks the shipped generator config
const CONSTRAINTS = {
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

// A makeCalc whose loadoutFor counts calls, so we can read exact sim counts. Each
// uncached sim resolves a loadout for all 5 slots, so sims = loadoutCalls / 5.
let loadoutCalls = 0;
const mk = () =>
  makeCalc({
    chars: chars as any,
    mult,
    deps: D,
    cfg: scopeLockCfg([], null) as any,
    loadoutFor: () => {
      loadoutCalls++;
      return {};
    },
    synergy: SYNERGY,
    constraints: CONSTRAINTS,
  });

// A bare-engine sim (no memoization) for the --focus / solo-rank hypothesis probes.
const cfgFor = (slugs: string[]) => ({
  ...(scopeLockCfg([], null) as any),
  slugs,
});
const rawSim = (slugs: string[]) => {
  const cs = slugs.map((s) => (chars as any)[s]);
  const prepared = prepareTeam(
    cs,
    slugs.map(() => ({})),
    D
  );
  return runSim(cs, mult, cfgFor(slugs), prepared);
};

function poolInfo(): void {
  const byBurst: Record<string, number> = {};
  for (const c of genChars) {
    byBurst[c.burst] = (byBurst[c.burst] ?? 0) + 1;
  }
  console.log(`pool: ${genChars.length} generator-supported chars`, byBurst);
}

function benchSingle(): void {
  const calc = mk();
  const team = genChars.slice(0, 5).map((c) => c.slug);
  const t0 = performance.now();
  calc.simTeam(team);
  const t1 = performance.now();
  const team2 = genChars.slice(5, 10).map((c) => c.slug);
  const t2 = performance.now();
  calc.simTeam(team2);
  const t3 = performance.now();
  console.log(
    `single sim: cold ${(t1 - t0).toFixed(1)}ms, warm ${(t3 - t2).toFixed(1)}ms`
  );
  let n = 0;
  const t4 = performance.now();
  for (let i = 0; i + 5 <= Math.min(genChars.length, 105); i += 5) {
    calc.simTeam(genChars.slice(i, i + 5).map((c) => c.slug));
    n++;
  }
  const t5 = performance.now();
  console.log(`avg over ${n} sims: ${((t5 - t4) / n).toFixed(1)}ms`);
}

async function benchBest(): Promise<void> {
  loadoutCalls = 0;
  const calc = mk();
  const t0 = performance.now();
  const r = await calc.bestTeam();
  const t1 = performance.now();
  console.log(
    `bestTeam: ${((t1 - t0) / 1000).toFixed(1)}s, sims=${loadoutCalls / 5}, team=${r?.slugs.join(',')}`
  );
}

type Roster = Awaited<ReturnType<ReturnType<typeof mk>['topTeams']>>;

function reportRoster(
  label: string,
  teams: Roster,
  secs: number,
  sims: number
): void {
  const total = teams.reduce((a, t) => a + t.teamDamage, 0);
  const inv = teams.filter(
    (t, i) => i > 0 && t.teamDamage > teams[i - 1].teamDamage
  ).length;
  console.log(
    `${label}: ${secs.toFixed(1)}s, sims=${sims}, teams=${teams.length}, total=${(total / 1e9).toFixed(3)}B, inversions=${inv}`
  );
  for (const t of teams) {
    console.log('  ', t.slugs.join(','), Math.round(t.teamDamage / 1e6) + 'M');
  }
}

async function runTop(
  n: number,
  polishPasses?: number
): Promise<[Roster, number, number]> {
  loadoutCalls = 0;
  const calc = mk();
  const t0 = performance.now();
  const teams = await calc.topTeams(
    n,
    polishPasses === undefined ? undefined : { polishPasses }
  );
  const t1 = performance.now();
  return [teams, (t1 - t0) / 1000, loadoutCalls / 5];
}

async function benchTop(n: number): Promise<void> {
  const [teams, secs, sims] = await runTop(n);
  reportRoster(`topTeams(${n})`, teams, secs, sims);
}

// Item-4 A/B: greedy-only control vs the shipped polish passes. Fresh calc per
// arm (CLI caches are hermetic), so the sim counts are comparable.
async function benchPolish(n: number): Promise<void> {
  const [ctl, ctlS, ctlSims] = await runTop(n, 0);
  reportRoster(`polish OFF (greedy)`, ctl, ctlS, ctlSims);
  const [trt, trtS, trtSims] = await runTop(n);
  reportRoster(`polish ON`, trt, trtS, trtSims);
  const tot = (r: Roster) => r.reduce((a, t) => a + t.teamDamage, 0);
  console.log(
    `Δ roster damage: ${((tot(trt) / tot(ctl) - 1) * 100).toFixed(2)}%, ` +
      `Δ sims: ${trtSims - ctlSims} (${((trtSims / ctlSims - 1) * 100).toFixed(0)}%), ` +
      `Δ wall: ${(trtS - ctlS).toFixed(1)}s`
  );
}

function benchFocus(): void {
  // (1) solo-score ranking: 5-copy vs 1-unit over all B3s (proves the 1-unit hack).
  const B3 = genChars.filter((c) => c.burst === 'III').map((c) => c.slug);
  const t0 = performance.now();
  const five = new Map(
    B3.map((s) => [s, rawSim([s, s, s, s, s]).units[0].totalDamage])
  );
  const t1 = performance.now();
  const one = new Map(B3.map((s) => [s, rawSim([s]).units[0].totalDamage]));
  const t2 = performance.now();
  console.log(
    `5-copy solo pass: ${((t1 - t0) / 1000).toFixed(1)}s; 1-unit pass: ${((t2 - t1) / 1000).toFixed(1)}s`
  );
  const rank = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
  const top24_5 = new Set(rank(five).slice(0, 24));
  const top24_1 = new Set(rank(one).slice(0, 24));
  const overlap = [...top24_5].filter((s) => top24_1.has(s)).length;
  console.log(`top-24 overlap (1-unit vs 5-copy): ${overlap}/24`);

  // (2) slot-order (focus = middle slot) sensitivity on a real top team.
  const team = [
    'rapi-red-hood',
    'asuka-wille',
    'anis-star',
    'crown',
    'privaty',
  ].filter((s) => (chars as any)[s]);
  if (team.length === 5) {
    const results: [string, number][] = [];
    for (let f = 0; f < 5; f++) {
      const order = [...team];
      [order[2], order[f]] = [order[f], order[2]];
      results.push([order[2], rawSim(order).teamDamage]);
    }
    const vals = results.map(([, v]) => v);
    const spread = (Math.max(...vals) / Math.min(...vals) - 1) * 100;
    console.log(`focus-slot spread (same 5 units): ${spread.toFixed(1)}%`);
    for (const [focus, v] of results) {
      console.log(`  focus=${focus}: ${(v / 1e6).toFixed(0)}M`);
    }
  } else {
    console.log('focus-slot: reference team not fully in pool, skipped');
  }
}

const args = process.argv.slice(2);
const has = (f: string) => args.includes(f);
const all = has('--all') || args.length === 0;

async function main(): Promise<void> {
  poolInfo();
  if (all || has('--single')) {
    benchSingle();
  }
  if (all || has('--best')) {
    await benchBest();
  }
  if (all || has('--top')) {
    const i = args.indexOf('--top');
    const n = Number(args[i + 1]);
    await benchTop(Number.isFinite(n) && n > 0 ? n : 5);
  }
  if (all || has('--focus')) {
    benchFocus();
  }
  if (has('--polish')) {
    const i = args.indexOf('--polish');
    const n = Number(args[i + 1]);
    await benchPolish(Number.isFinite(n) && n > 0 ? n : 5);
  }
}

void main();
