// Per-unit value table + proxy enumeration for the roster generator (perf plan
// item 3 — docs/handoffs/2026-07-24-roster-generator-perf-plan.md). Pure and
// filesystem-free like teamcalc: sims are injected via `evalSets`, so the same
// code runs on the main thread, in the coordinator worker, and in tests.
//
// VALUE TABLE (item 3a): price every unit on one additive scale — its MARGINAL
// damage against a fixed REFERENCE CORE (a ≤20s B1 + a B2, picked by meta prior
// when available, + the top-2 B3s by solo value). The core is a measuring stick
// only — it is never an output.
//   - A B1/B2 support: the delta from swapping it into its class slot.
//     Marginals can be negative (worse than the reference support).
//   - A B3/Λ dealer: the delta from fielding it as the core's THIRD B3
//     (leave-one-out: a core B3's own stick is the top-2 excluding itself).
//     The plan drafted plain solo value here; measured on the no-meta bench,
//     add-in marginals beat solo pricing on both roster quality (+1.0%) and
//     total sims (−16%) — a support-B3's worth (privaty/neon-vision-eye-class
//     units that buff the other B3s) only shows next to real dealers. One sim
//     per unit either way.
//
// PROXY ENUMERATION (item 3b): enumerate every legal team SHAPE over pruned
// class pools with NO sims and keep the top-K by a bounded min-heap. Legal
// shapes are 1×B1 + 1×B2 + 3×B3 and 1×B1 + 2×B2 + 2×B3 (double-B1 stays
// excluded — see topTeams-role-bound.test.ts). The proxy is a RANKING score,
// not a damage estimate:
//   proxy = Σ value(u) × (1 + metaW·min(1, mean unit prior)) ×
//           (1 + synergyWeight·satisfiedPairs) × spread-closeness
// The exact-comp popularity bonus (metaPrior's compPop term) is deliberately
// omitted from the proxy: popular ranker comps are injected into the sim batch
// verbatim by bestTeam, so they never depend on surviving the proxy cut.

export interface ValueTableInput {
  /** available slugs (post-exclude); classes are read via `effBurst` */
  pool: string[];
  /** effective burst class for selection (teamcalc's effBurst — Λ pins applied) */
  effBurst: (slug: string) => string;
  /** burst cooldown in seconds (chars[slug].burstCooldownSec) */
  cooldownOf: (slug: string) => number;
  /** warmed solo score (teamcalc soloScore — how it is measured is the
   *  caller's policy; only the RANKING matters here, for the core's B3 pick) */
  soloValue: (slug: string) => number;
  /** meta unit prior for the reference-core support pick; omit → solo value */
  unitPrior?: (slug: string) => number;
  /** batch team sim (teamcalc evalSets — canonicalizes order + focus) */
  evalSets: (sets: string[][]) => Promise<({ teamDamage: number } | null)[]>;
  /** a single caster at/below this covers its stage solo (teamcalc CD_SHORT) */
  cdShort?: number;
}

export interface ValueTable {
  /** slug → marginal damage vs the reference core (B1/B2 by class-slot
   *  swap-in; B3/Λ by leave-one-out third-B3 add-in) */
  values: Map<string, number>;
  /** the reference core the marginals were measured against (diagnostic) */
  referenceCore: string[];
}

/** Build the per-unit value table for a pool: ~1 sim per unit plus a handful of
 *  reference baselines (solo values are read from the warmed cache, not
 *  re-simmed). Deterministic for a deterministic `evalSets`. */
export async function buildValueTable(
  input: ValueTableInput
): Promise<ValueTable> {
  const { pool, effBurst, cooldownOf, soloValue, evalSets } = input;
  const cdShort = input.cdShort ?? 20;
  const prior = input.unitPrior;
  const values = new Map<string, number>();
  const b1s = pool.filter((s) => effBurst(s) === 'I');
  const b2s = pool.filter((s) => effBurst(s) === 'II');
  const dps = pool
    .filter((s) => {
      const b = effBurst(s);
      return b !== 'I' && b !== 'II';
    })
    .sort((a, b) => soloValue(b) - soloValue(a) || (a < b ? -1 : 1));

  // Reference core supports: best ≤20s B1 + best B2 (by meta prior when
  // supplied, else solo value; slug-alpha tie-break so the core — and therefore
  // every marginal — is deterministic).
  const pick = (cands: string[]): string | undefined => {
    const score = (s: string) => (prior ? prior(s) : soloValue(s));
    return [...cands].sort(
      (a, b) => score(b) - score(a) || (a < b ? -1 : 1)
    )[0];
  };
  const refB1 = pick(b1s.filter((s) => cooldownOf(s) <= cdShort));
  const refB2 = pick(b2s);
  const refSupports = [...(refB1 ? [refB1] : []), ...(refB2 ? [refB2] : [])];
  const core = [...refSupports, ...dps.slice(0, 2)];

  // Batch every measurement into ONE evalSets call. Sims are 4–5-unit partial
  // teams (the engine runs those) — marginals are RELATIVE, so a small stick
  // still ranks.
  //   B1/B2 u: swap u into its class slot in the core; baseline = the core.
  //     Swapping the reference support in yields the core itself → marginal 0.
  //   B3/Λ u: field u as the core's third B3; baseline + stick are the top-2
  //     B3s EXCLUDING u (leave-one-out), so a core B3 is priced by the same
  //     rule as everyone else instead of degenerating to 0.
  const stickFor = (u: string): string[] =>
    dps.filter((s) => s !== u).slice(0, 2);
  const swapIn = (u: string): string[] => {
    const b = effBurst(u);
    let replaced = false;
    const team = core.map((s) => {
      if (!replaced && effBurst(s) === b) {
        replaced = true;
        return u;
      }
      return s;
    });
    if (!replaced) {team.push(u);}
    return [...new Set(team)];
  };
  const supports = [...b1s, ...b2s];
  const baselineKey = (stick: string[]) => stick.join(',');
  // distinct baselines: the core (supports) + one per leave-one-out stick (≤3)
  const baselines = new Map<string, string[]>();
  baselines.set(baselineKey(dps.slice(0, 2)), core);
  for (const u of dps) {
    const stick = stickFor(u);
    const key = baselineKey(stick);
    if (!baselines.has(key)) {baselines.set(key, [...refSupports, ...stick]);}
  }
  const baselineTeams = [...baselines.values()];
  const baselineIdx = new Map(
    [...baselines.keys()].map((k, i) => [k, i] as const)
  );
  const measureTeams = [
    ...supports.map(swapIn),
    ...dps.map((u) => [...refSupports, ...stickFor(u), u]),
  ];
  const results = await evalSets([...baselineTeams, ...measureTeams]);
  const baseDamage = (stick: string[]): number | undefined =>
    results[baselineIdx.get(baselineKey(stick))!]?.teamDamage;
  const all = [...supports, ...dps];
  all.forEach((u, i) => {
    const r = results[baselineTeams.length + i];
    const ref = baseDamage(i < supports.length ? dps.slice(0, 2) : stickFor(u));
    if (ref === undefined || !r) {
      // sim failed → neutral value (never silently cache a poisoned number);
      // real sims downstream still judge the unit if enumeration fields it
      console.warn(`teamvalue: marginal sim failed for ${u} — value 0`);
      values.set(u, 0);
      return;
    }
    values.set(u, r.teamDamage - ref);
  });
  return { values, referenceCore: core };
}

export interface EnumerateInput {
  /** class pools (already pruned; MUST contain any mustInclude unit of that
   *  class). A free Λ wildcard would go in poolB3 — none exists today (the only
   *  Λ, red-hood, is force-pinned to B3 by teamcalc's effBurst). */
  poolB1: string[];
  poolB2: string[];
  poolB3: string[];
  cooldownOf: (slug: string) => number;
  /** per-unit value (buildValueTable) */
  value: (slug: string) => number;
  /** locked units — every returned team contains all of them */
  mustInclude?: string[];
  /** per-unit boss-weakness advantage; when supplied, a team must field ≥1
   *  advantaged unit (teamcalc's requireElement rule) */
  advantaged?: (slug: string) => boolean;
  /** meta unit prior + blend weight (the proxy's meta term) */
  unitPrior?: (slug: string) => number;
  metaWeight?: number;
  /** like-tag synergy (teamcalc countSynergyPairs semantics, mask-compiled) */
  synergy?: {
    tags: Record<string, string[]>;
    pairs: [string, string][];
    weight: number;
  };
  /** soft spread shaping (solo roster generator): closeness of the team's
   *  prydwen meta sum to `target`, exp(-(Σ−t)²/2σ²) */
  spread?: {
    unitScore: (slug: string) => number;
    target: number;
    sigma: number;
  };
  /** hard roster rules (owner ruling 2026-07-24; teamcalc folds the same rules
   *  into legal()): `together` groups are all-or-none per team; `companions`
   *  requires ≥1 of `anyOf` on the team whenever `unit` is fielded; `requiredAny`
   *  requires ≥1 of `anyOf` on every team. Compiled to bitmasks so the hot loop
   *  pays a few ORs, not array scans. */
  constraints?: {
    together?: string[][];
    companions?: { unit: string; anyOf: string[] }[];
    requiredAny?: { label?: string; anyOf: string[] }[];
  };
  cdShort?: number;
  cdPair?: number;
  /** candidates kept (bounded min-heap); default 150 */
  topK?: number;
}

export interface EnumeratedTeam {
  /** the 5-unit set (b1, b2s…, b3s… — canonicalize before simming) */
  team: string[];
  proxy: number;
}

interface UnitInfo {
  slug: string;
  v: number; // value
  p: number; // unit prior
  sp: number; // spread unit score
  mask: number; // synergy tag bitmask (bit 2i = pair-i dealer, 2i+1 = buffer)
  must: number; // mustInclude membership bitmask
  adv: boolean;
  cd: number;
  cg: number; // together-group membership (one distinct bit per group member)
  need: number; // companion rules this unit TRIGGERS (bit per rule)
  prov: number; // companion rules this unit SATISFIES (bit per rule)
  reqAny: number; // requiredAny groups this unit SATISFIES (bit per rule)
}

/** Bounded min-heap over proxy score — O(log K) insert, keeps the best K. */
class TopK {
  private arr: EnumeratedTeam[] = [];
  constructor(private k: number) {}
  get min(): number {
    return this.arr.length < this.k ? -Infinity : this.arr[0].proxy;
  }
  push(proxy: number, team: string[]): void {
    if (this.arr.length < this.k) {
      this.arr.push({ proxy, team });
      let i = this.arr.length - 1;
      while (i > 0) {
        const par = (i - 1) >> 1;
        if (this.arr[par].proxy <= this.arr[i].proxy) {break;}
        [this.arr[par], this.arr[i]] = [this.arr[i], this.arr[par]];
        i = par;
      }
      return;
    }
    if (proxy <= this.arr[0].proxy) {return;}
    this.arr[0] = { proxy, team };
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < this.arr.length && this.arr[l].proxy < this.arr[m].proxy) {m = l;}
      if (r < this.arr.length && this.arr[r].proxy < this.arr[m].proxy) {m = r;}
      if (m === i) {break;}
      [this.arr[m], this.arr[i]] = [this.arr[i], this.arr[m]];
      i = m;
    }
  }
  sortedDesc(): EnumeratedTeam[] {
    return [...this.arr].sort((a, b) => b.proxy - a.proxy);
  }
}

/**
 * Enumerate every legal team shape over the class pools, score each with the
 * sim-free proxy, and return the top-K by proxy (descending). Legality inline:
 * burst-cooldown coverage (a lone B1/B2 must be ≤ cdShort; a B2 pair covers with
 * one short caster or two ≤ cdPair), the element requirement, and mustInclude
 * membership. Runs in well under a second at realistic pool sizes (~10⁶ combos
 * of a few float ops each).
 */
export function enumerateTeams(input: EnumerateInput): EnumeratedTeam[] {
  const cdShort = input.cdShort ?? 20;
  const cdPair = input.cdPair ?? 40;
  const metaW = input.metaWeight ?? 0;
  const synW = input.synergy?.weight ?? 0;
  const pairs = input.synergy?.pairs ?? [];
  const must = [...new Set(input.mustInclude ?? [])];
  const needAdv = !!input.advantaged;
  const spread = input.spread;
  const heap = new TopK(input.topK ?? 150);

  // Compile per-unit info once. Synergy tags become a bitmask so the inner loop
  // ORs masks instead of scanning tag arrays (countSynergyPairs semantics: a
  // pair is satisfied when the team carries both halves, on any unit(s)).
  const maskOf = (slug: string): number => {
    const tags = input.synergy?.tags[slug];
    if (!tags) {return 0;}
    let m = 0;
    pairs.forEach(([dealer, buffer], i) => {
      if (tags.includes(dealer)) {m |= 1 << (2 * i);}
      if (tags.includes(buffer)) {m |= 1 << (2 * i + 1);}
    });
    return m;
  };
  // Compile the hard roster rules to per-unit bitmasks (checked in emit):
  // each member of a `together` group gets a distinct bit (a team must carry
  // ALL of a group's bits or NONE); each `companions` rule j sets a need-bit on
  // its trigger unit and a prov-bit on every satisfier.
  const together = input.constraints?.together ?? [];
  const companions = input.constraints?.companions ?? [];
  const groupAll: number[] = [];
  const cgOf = new Map<string, number>();
  let cgBit = 0;
  for (const group of together) {
    let all = 0;
    for (const s of new Set(group)) {
      const bit = 1 << cgBit++;
      all |= bit;
      cgOf.set(s, (cgOf.get(s) ?? 0) | bit);
    }
    groupAll.push(all);
  }
  const needOf = new Map<string, number>();
  const provOf = new Map<string, number>();
  companions.forEach(({ unit, anyOf }, j) => {
    needOf.set(unit, (needOf.get(unit) ?? 0) | (1 << j));
    for (const s of anyOf)
      {if (s !== unit) {provOf.set(s, (provOf.get(s) ?? 0) | (1 << j));}}
  });
  const requiredAny = input.constraints?.requiredAny ?? [];
  const reqAnyAll: number[] = [];
  const reqAnyOf = new Map<string, number>();
  let raBit = 0;
  for (const group of requiredAny) {
    let all = 0;
    for (const s of new Set(group.anyOf)) {
      const bit = 1 << raBit++;
      all |= bit;
      reqAnyOf.set(s, (reqAnyOf.get(s) ?? 0) | bit);
    }
    reqAnyAll.push(all);
  }
  const info = (slug: string): UnitInfo => ({
    slug,
    v: input.value(slug),
    p: input.unitPrior?.(slug) ?? 0,
    sp: spread?.unitScore(slug) ?? 0,
    mask: maskOf(slug),
    must: (() => {
      const i = must.indexOf(slug);
      return i < 0 ? 0 : 1 << i;
    })(),
    adv: input.advantaged?.(slug) ?? false,
    cd: input.cooldownOf(slug),
    cg: cgOf.get(slug) ?? 0,
    need: needOf.get(slug) ?? 0,
    prov: provOf.get(slug) ?? 0,
    reqAny: reqAnyOf.get(slug) ?? 0,
  });
  // A lone >cdShort B1 can never cover its stage in these shapes (only one B1
  // slot exists), so filter it out of the dimension entirely.
  const b1s = input.poolB1
    .filter((s) => input.cooldownOf(s) <= cdShort)
    .map(info);
  const b2s = input.poolB2.map(info);
  const b3s = input.poolB3.map(info);

  // A mustInclude unit outside every pool (or overflowing a class's slots) makes
  // enumeration infeasible — return [] and let the caller fall back.
  const mustFull = (1 << must.length) - 1;
  const inPools = new Set([...b1s, ...b2s, ...b3s].map((u) => u.slug));
  if (must.some((s) => !inPools.has(s))) {return [];}
  const mustCount = (pool: UnitInfo[]) => pool.filter((u) => u.must).length;
  if (mustCount(b1s) > 1 || mustCount(b2s) > 2 || mustCount(b3s) > 3) {return [];}

  const pairsSat = (mask: number): number => {
    let n = 0;
    for (let i = 0; i < pairs.length; i++) {
      const both = 0b11 << (2 * i);
      if ((mask & both) === both) {n++;}
    }
    return n;
  };
  const inv2Sigma2 = spread ? 1 / (2 * spread.sigma * spread.sigma) : 0;

  // Score one complete team from accumulated partials; push into the heap.
  const emit = (
    v: number,
    p: number,
    sp: number,
    mask: number,
    mustAcc: number,
    adv: boolean,
    units: [UnitInfo, UnitInfo, UnitInfo, UnitInfo, UnitInfo]
  ): void => {
    if (mustAcc !== mustFull) {return;}
    if (needAdv && !adv) {return;}
    // hard roster rules: together groups all-or-none; companion needs satisfied
    if (groupAll.length || companions.length || reqAnyAll.length) {
      let cg = 0;
      let need = 0;
      let prov = 0;
      let reqAny = 0;
      for (const u of units) {
        cg |= u.cg;
        need |= u.need;
        prov |= u.prov;
        reqAny |= u.reqAny;
      }
      if (need & ~prov) {return;}
      for (const all of groupAll) {
        const got = cg & all;
        if (got && got !== all) {return;}
      }
      for (const all of reqAnyAll) {
        if ((reqAny & all) === 0) {return;}
      }
    }
    let proxy =
      v * (1 + metaW * Math.min(1, p / 5)) * (1 + synW * pairsSat(mask));
    if (spread) {
      const d = sp - spread.target;
      proxy *= Math.exp(-d * d * inv2Sigma2);
    }
    if (proxy <= heap.min) {return;}
    heap.push(
      proxy,
      units.map((u) => u.slug)
    );
  };

  for (const b1 of b1s) {
    // shape 1×B1 + 1×B2 + 3×B3 — the lone B2 must cover its stage solo (≤ cdShort)
    for (const b2 of b2s) {
      if (b2.cd > cdShort) {continue;}
      const v2 = b1.v + b2.v;
      const p2 = b1.p + b2.p;
      const sp2 = b1.sp + b2.sp;
      const m2 = b1.mask | b2.mask;
      const mu2 = b1.must | b2.must;
      const a2 = b1.adv || b2.adv;
      for (let i = 0; i < b3s.length; i++) {
        const x = b3s[i];
        const v3 = v2 + x.v;
        const p3 = p2 + x.p;
        const sp3 = sp2 + x.sp;
        const m3 = m2 | x.mask;
        const mu3 = mu2 | x.must;
        const a3 = a2 || x.adv;
        for (let j = i + 1; j < b3s.length; j++) {
          const y = b3s[j];
          const v4 = v3 + y.v;
          const p4 = p3 + y.p;
          const sp4 = sp3 + y.sp;
          const m4 = m3 | y.mask;
          const mu4 = mu3 | y.must;
          const a4 = a3 || y.adv;
          for (let k = j + 1; k < b3s.length; k++) {
            const z = b3s[k];
            emit(
              v4 + z.v,
              p4 + z.p,
              sp4 + z.sp,
              m4 | z.mask,
              mu4 | z.must,
              a4 || z.adv,
              [b1, b2, x, y, z]
            );
          }
        }
      }
    }
    // shape 1×B1 + 2×B2 + 2×B3 — the B2 pair covers with one ≤cdShort caster or
    // two ≤cdPair alternating (stageCovered semantics)
    for (let a = 0; a < b2s.length; a++) {
      const b2a = b2s[a];
      for (let b = a + 1; b < b2s.length; b++) {
        const b2b = b2s[b];
        const covered =
          b2a.cd <= cdShort ||
          b2b.cd <= cdShort ||
          (b2a.cd <= cdPair && b2b.cd <= cdPair);
        if (!covered) {continue;}
        const v2 = b1.v + b2a.v + b2b.v;
        const p2 = b1.p + b2a.p + b2b.p;
        const sp2 = b1.sp + b2a.sp + b2b.sp;
        const m2 = b1.mask | b2a.mask | b2b.mask;
        const mu2 = b1.must | b2a.must | b2b.must;
        const a2 = b1.adv || b2a.adv || b2b.adv;
        for (let i = 0; i < b3s.length; i++) {
          const x = b3s[i];
          const v3 = v2 + x.v;
          const p3 = p2 + x.p;
          const sp3 = sp2 + x.sp;
          const m3 = m2 | x.mask;
          const mu3 = mu2 | x.must;
          const a3 = a2 || x.adv;
          for (let j = i + 1; j < b3s.length; j++) {
            const y = b3s[j];
            emit(
              v3 + y.v,
              p3 + y.p,
              sp3 + y.sp,
              m3 | y.mask,
              mu3 | y.must,
              a3 || y.adv,
              [b1, b2a, b2b, x, y]
            );
          }
        }
      }
    }
  }
  return heap.sortedDesc();
}
