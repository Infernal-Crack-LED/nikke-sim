// Team / roster / character-analysis search. Filesystem-free (takes data
// objects) like runSim, so the web app and CLI share it. It only READS the
// engine (runSim/prepareTeam) — never modifies it.
//
// Team legality mirrors the site's rule: 1×Burst I, 1×Burst II, 2×Burst III +
// 1 flex, with Λ acting as a wildcard for any burst slot.
//
// The search is a heuristic (team optimisation is a big space): rough-score
// every candidate solo to prune the DPS pool, build a legal seed team by role,
// then local-swap-refine on FULL-team sims (which capture support synergy). Not
// guaranteed globally optimal — good and fast.
import { runSim } from './engine/sim.js';
import { prepareTeam, type PrepareDeps, type UnitOptions } from './prepare.js';
import type { CharacterData, LevelMultiplier, SimConfig } from './types.js';

type Char = CharacterData & { baseStats: any };

export interface TeamCalcInput {
  chars: Record<string, Char>; // all characters, keyed by slug
  mult: LevelMultiplier;
  deps: PrepareDeps;
  cfg: Omit<SimConfig, 'slugs'>; // boss weakness/def/core/level/… (no slugs)
  loadout?: UnitOptions; // uniform loadout assumption applied to every unit
  blocked?: string[]; // excluded slugs (don't-own)
  /** DPS-pool prune size (top-N B3 by solo score). Higher = slower, more thorough. */
  poolB3?: number;
  /** Max local-search rounds. */
  rounds?: number;
}

export interface TeamUnit {
  slug: string;
  name: string;
  burst: string;
  weapon: string;
  element: string;
  advantaged: boolean;
  share: number;
  totalDamage: number;
}
export interface TeamResult {
  slugs: string[];
  teamDamage: number;
  teamDps: number;
  fullBurstUptime: number;
  units: TeamUnit[];
}

const NEED = { I: 1, II: 1, III: 2 } as const;

function deficits(counts: Record<string, number>): number {
  return (
    Math.max(0, NEED.I - (counts.I ?? 0)) +
    Math.max(0, NEED.II - (counts.II ?? 0)) +
    Math.max(0, NEED.III - (counts.III ?? 0))
  );
}

/** 5 distinct units that can cover 1×BI, 1×BII, 2×BIII with Λ as wildcards. */
function isLegal(slugs: string[], chars: Record<string, Char>): boolean {
  if (slugs.length !== 5 || new Set(slugs).size !== 5) return false;
  const c: Record<string, number> = { I: 0, II: 0, III: 0, 'Λ': 0 };
  for (const s of slugs) c[chars[s].burst]++;
  return (c['Λ'] ?? 0) >= deficits(c);
}

export function makeCalc(input: TeamCalcInput) {
  const { chars, mult, deps } = input;
  const loadout = input.loadout ?? {};
  const blocked = new Set(input.blocked ?? []);
  const poolB3 = input.poolB3 ?? 24;
  const rounds = input.rounds ?? 3;

  // memoize full-team sims (keyed by ordered slugs) and solo scores so repeated
  // bestTeam calls (topTeams) and refine rounds don't re-sim the same teams.
  const teamCache = new Map<string, ReturnType<typeof runSim>>();
  const simTeam = (slugs: string[]) => {
    const key = slugs.join(',');
    const hit = teamCache.get(key);
    if (hit) return hit;
    const cs = slugs.map((s) => chars[s]);
    const prepared = prepareTeam(cs, slugs.map(() => loadout), deps);
    const r = runSim(cs, mult, { ...input.cfg, slugs } as SimConfig, prepared);
    teamCache.set(key, r);
    return r;
  };

  // rough solo score to prune the (large) B3 DPS pool. Supports (B1/B2) are
  // kept wholesale — they score poorly solo but enable teams.
  const soloCache = new Map<string, number>();
  const soloScore = (slug: string): number => {
    const hit = soloCache.get(slug);
    if (hit !== undefined) return hit;
    let v = 0;
    try {
      v = simTeam([slug, slug, slug, slug, slug]).units[0].totalDamage;
    } catch {
      v = 0;
    }
    soloCache.set(slug, v);
    return v;
  };

  const buildPool = (extraExclude: Set<string>): string[] => {
    const avail = Object.keys(chars).filter(
      (s) => !blocked.has(s) && !extraExclude.has(s),
    );
    const byBurst = (b: string) => avail.filter((s) => chars[s].burst === b);
    const topB3 = byBurst('III')
      .map((s) => [s, soloScore(s)] as const)
      .sort((a, b) => b[1] - a[1])
      .slice(0, poolB3)
      .map(([s]) => s);
    // keep all supports + all Λ (few, often enablers or flex DPS)
    return [...topB3, ...byBurst('I'), ...byBurst('II'), ...byBurst('Λ')];
  };

  // legal seed by role: fill 2×B3, 1×B1, 1×B2 (Λ substitutes), then best flex
  const seedTeam = (pool: string[], mustInclude?: string): string[] => {
    const score = new Map(pool.map((s) => [s, soloScore(s)]));
    const ranked = [...pool].sort(
      (a, b) => (score.get(b) ?? 0) - (score.get(a) ?? 0),
    );
    const team: string[] = [];
    const take = (pred: (s: string) => boolean) => {
      const s = ranked.find((x) => !team.includes(x) && pred(x));
      if (s) team.push(s);
    };
    if (mustInclude && chars[mustInclude]) team.push(mustInclude);
    const isB = (b: string) => (s: string) =>
      chars[s].burst === b || chars[s].burst === 'Λ';
    take(isB('III'));
    take(isB('III'));
    take(isB('I'));
    take(isB('II'));
    take(() => true); // flex
    return team.slice(0, 5);
  };

  // local search: swap each slot for a pool alternative, keep improvements
  const refine = (
    start: string[],
    pool: string[],
    locked: Set<string>,
  ): TeamResult => {
    let team = start;
    let best = simTeam(team);
    for (let round = 0; round < rounds; round++) {
      let improved = false;
      for (let i = 0; i < 5; i++) {
        if (locked.has(team[i])) continue;
        const slotBurst = chars[team[i]].burst;
        for (const alt of pool) {
          if (team.includes(alt)) continue;
          // role-restrict: only swap for the same burst class (or Λ either way)
          // — keeps the search cheap without losing meaningful moves
          const altBurst = chars[alt].burst;
          if (altBurst !== slotBurst && altBurst !== 'Λ' && slotBurst !== 'Λ')
            continue;
          const cand = team.slice();
          cand[i] = alt;
          if (!isLegal(cand, chars)) continue;
          const r = simTeam(cand);
          if (r.teamDamage > best.teamDamage) {
            best = r;
            team = cand;
            improved = true;
          }
        }
      }
      if (!improved) break;
    }
    return toResult(best);
  };

  const toResult = (r: ReturnType<typeof simTeam>): TeamResult => ({
    slugs: r.units.map((u) => u.slug),
    teamDamage: r.teamDamage,
    teamDps: r.teamDps,
    fullBurstUptime: r.fullBurstUptime,
    units: r.units.map((u) => ({
      slug: u.slug,
      name: u.name,
      burst: u.burst,
      weapon: u.weapon,
      element: u.element,
      advantaged: u.advantaged,
      share: u.share,
      totalDamage: u.totalDamage,
    })),
  });

  const bestTeam = (opts?: {
    exclude?: Set<string>;
    mustInclude?: string;
  }): TeamResult | null => {
    const exclude = opts?.exclude ?? new Set<string>();
    const pool = buildPool(exclude);
    const seed = seedTeam(pool, opts?.mustInclude);
    if (!isLegal(seed, chars)) return null; // e.g. everything useful blocked
    const locked = opts?.mustInclude
      ? new Set([opts.mustInclude])
      : new Set<string>();
    return refine(seed, pool, locked);
  };

  return {
    bestTeam,
    /** Top-N teams that share no characters (greedy-sequential). */
    topTeams: (n: number): TeamResult[] => {
      const used = new Set<string>();
      const out: TeamResult[] = [];
      for (let i = 0; i < n; i++) {
        const t = bestTeam({ exclude: used });
        if (!t) break;
        out.push(t);
        t.slugs.forEach((s) => used.add(s));
      }
      return out;
    },
    /** Best team built around a pinned unit + that unit's line in it. */
    characterAnalysis: (slug: string): { team: TeamResult; unit: TeamUnit } | null => {
      const team = bestTeam({ mustInclude: slug });
      if (!team) return null;
      const unit = team.units.find((u) => u.slug === slug)!;
      return { team, unit };
    },
    simTeam,
  };
}
