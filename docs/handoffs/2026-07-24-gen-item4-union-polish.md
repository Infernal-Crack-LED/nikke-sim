# Item 4 findings + carrying the polish pass into the UNION RAID path (2026-07-24)

> AI-facing handoff. **Half 1** = what item 4 actually taught us (solo path, built + verified,
> branch `gen-item4`, commit `d35d726`, worktree `../nikke-sim-wt-gen-item4`). **Half 2** = the
> spec for doing the same thing to the union-raid generator, which the solo work does NOT cover.
> Measurement record: `docs/handoffs/closed/2026-07-24-gen-item4-polish-ab.md`. Ruling:
> `docs/DECISIONS.md` (§ roster-generator perf plan, item 4). Plan of record (closed):
> `docs/handoffs/closed/2026-07-24-roster-generator-perf-plan.md`.

## Status

- **Solo path: DONE, awaiting owner merge.** `verify.sh` green; 6 new tests; 78 pre-existing
  generator tests green with nothing re-pinned; real-Chromium pool === fallback parity holds.
- **Union path: NOT STARTED.** `runUnionTopTeams` (`web/src/App.tsx:3039–3079`) runs its OWN
  greedy loop over `genBestTeam` — it never calls `topTeams`, so it inherited none of item 4.

---

## Half 1 — findings that carry forward

### F1. The plan's polish shape could not have worked (structural, not empirical)

The draft said: re-run team _i_ with `exclude` = units of ALL OTHER final teams. Team _i_'s greedy
pool is `P − ∪_{j<i} T_j − reserved_{j>i}`; that polish pool is `P − ∪_{j≠i} T_j`, a strict SUBSET
for every _i_ and IDENTICAL for the last team. So the pass can only ever search a subset of what
greedy already searched — it cannot reach the team the inversion proves was missed. Anything of this
shape is a near-no-op by construction. **What shipped instead: a seeded re-run** — the previous
roster's teams are offered to every team as extra local-search starts (`bestTeam({ extraSeeds })`),
so team _i_ can reclaim AND refine from a team a later index found, and the tail rebuilds behind it.

### F2. The gain came from refining a seed that LOST to its incumbent

Bench reclaim: the 2033M team-5 set, refined inside team 3's pool, reached **2401M** and beat that
row's 2343M. So the cheap rule "only adopt seeds that already score higher" would have found
nothing. A seed is a BASIN, not a candidate. Corollary for any future pruning: prune on
_proximity_, never on _already-winning_.

### F3. The accept rule has to be per-PASS on the roster total, not per-team

A reclaim raises team _i_ and the rebuilt tail drops (bench: +58M on row 3, −19M on row 5, net
+39M). A per-team strict-improvement rule would have rejected the tail rebuild and left the roster
inconsistent. Pass-level acceptance on the total is what makes "polish never lowers the roster"
true, and ties keep the incumbent so a no-op pass is byte-stable (⇒ idempotent, pinned by test).

### F4. `seedsOnly` is exact, not an approximation

While a pass reproduces the previous roster team-for-team, each team's pool is identical to the one
that produced its incumbent ⇒ the full pipeline (deterministic + cached) would return that incumbent
again. Those teams therefore refine ONLY the seeds. The first team that actually changes ends the
shortcut and everything behind it rebuilds in full. This is the invariant that keeps polish cheap;
**any future change that makes the search non-deterministic or cfg-dependent breaks it.**

### F5. The cost is entirely in re-climbing seeds — hence `POLISH_SEED_FRAC = 0.8`

Refine-every-seed: 3362 sims / 91.6s. Gated: **2197 sims / 55.9s, same roster.** `seedsOnly` alone
was worth only 3440 → 3362. The gate sims every seed (one can win outright) and re-climbs only those
within 80% of the score to beat. It is a **search-budget knob, not a modeled constant** — bench-tuned,
documented, and A/B-able by setting it to 0.

### F6. Where it pays — and where it measurably does nothing

| config                                                  | quality                                                   | cost                                |
| ------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------- |
| constrained 20-unit pool (4 Burst-I)                    | greedy **stalls at 3 teams** → polish **4 teams, +13.0%** | small (cache-warm)                  |
| no-meta CLI bench, full pool                            | +0.27% (14.432B → 14.471B)                                | +28% sims / +19% wall               |
| shipped app config (Chromium, full pool, meta + spread) | **none** — identical roster                               | **none** — 7865ms vs 7884ms (noise) |

The app-path no-op and the app-path zero-cost are the SAME fact: with spread shaping on, a team
built for a different meta-sum target scores low under team _i_'s objective, falls under the gate,
and is never re-climbed. Proof it is not the gate hiding a gain: the **gate-off** arm returns the
identical roster for +19% wall. ⚠ **n=1 configuration** — one weakness setting, unblocked pool. Not
evidence of a no-op across app settings.

⇒ The item's real customer is the SMALL ELIGIBLE POOL (many units blocked as don't-own) — the
owner-reported "generator only returns 3 teams" symptom that `topTeams-role-bound.test.ts` exists for.

### F7. Display order is a separate fix from the polish

Sorting strongest-first removes the inversion from what the user SEES; the polish removes it at the
source. Solo sorts UNLESS `pinnedByTeam` rows are used (rows map to UI team indices). **This rule
does not transfer to union — see U1.**

---

## Half 2 — union raid implementation spec

### U1. HARD CONSTRAINT: the union roster must NEVER be sorted

Union row _i_ is bound to **boss _i_**: `unionGenBossOpts[i]` supplies row _i_'s cfg
(`App.tsx:3064–3065`), and `shareUnionRoster(unionGenResults, unionGenBossOpts)` (`App.tsx:6621`)
zips result index → boss options. Reordering rows would pair each team with the wrong boss — a
correctness bug, not a cosmetic one. So union takes the polish pass ONLY, never the sort. (The
inversion is also meaningless there: teams are built against different bosses, so a later row
out-scoring an earlier one is expected, not a search failure.)

### U2. Why `topTeams` cannot simply be called

`topTeams` lives inside ONE `makeCalc` instance = one `cfg`. Union needs a different cfg per team
(`unionCalcCfg(opts)`, `opts.weakness`) ⇒ a different calc/coordinator/cache bundle per row. The
polish driver must therefore be parameterized over a per-index build function.

### U3. Proposed shape — extract the driver, don't duplicate it

1. **`src/teamcalc.ts` — export a pure driver** (name e.g. `polishRoster`), lifted verbatim from the
   `build` + pass loop now inlined at `src/teamcalc.ts:1427–1473`:
   ```ts
   export async function polishRoster<T extends { slugs: string[] }>(opts: {
     n: number;
     reserved: string[][];
     passes?: number; // default POLISH_PASSES
     score: (i: number, t: T) => number; // team i's ranking score
     build: (
       i: number,
       o: {
         // one team, index i
         exclude: Set<string>;
         mustInclude: string[];
         extraSeeds: string[][];
         seedsOnly: boolean;
         seedFloor?: number;
       }
     ) => Promise<T | null>;
   }): Promise<T[]>;
   ```
   `topTeams` then becomes `polishRoster(...)` + its sort; behaviour must stay byte-identical
   (re-run `--polish 5` and the generator suite as the gate).
2. **`web/src/simClient.ts`** — widen `BestTeamOpts` (`simClient.ts:19–22`) with
   `extraSeeds` / `seedsOnly` / `seedFloor` so `genBestTeam` forwards them, and expose the calc's
   ranking score (see U4).
3. **`web/src/App.tsx:3039–3079`** — replace the hand-rolled loop with `polishRoster`, whose
   `build(i, o)` calls `genBestTeam(paramsFor(i), o)` with row _i_'s boss params. Keep
   `assignMustUse`/`reserved` exactly as they are. **Do not sort the output** (U1).

### U4. Cross-boss scoring — the one genuinely new problem

`score(i, t)` needs team _i_'s ranking score **under boss _i_**. Two sub-problems:

- **Not currently exposed.** `scoreOf` (damage × meta × synergy) is private to `makeCalc`. Add it to
  the returned object (e.g. `scoreTeam(r)`) and thread it through `simClient`. Do NOT reimplement the
  blend in App.tsx — a drifted copy would silently mis-rank.
- **The pass gate sums scores across DIFFERENT bosses** — resolved, use the RAW SUM
  (`Σ score_i(new) > Σ score_i(old)`, the solo rule unchanged). The concern was that element
  advantage/boss config change each row's magnitude, so a big-magnitude row could outvote a
  proportionally larger loss on a small one. It is NOT a distortion here: **the app already treats
  the raw sum as the union objective** — `shareUnionRoster` reports
  `totalDamage: teams.reduce((sum, t) => sum + t.teamDamage, 0)` (`App.tsx:2364`) and `rosterView`'s
  `rosterTotal` does the same for union results (`App.tsx:3667`), because union raid scoring IS the
  total across the three teams. Magnitude weighting is the objective, not a bug. (A per-row
  normalized rule, `Σ new_i/greedy_i > n`, would weight rows equally — that is the ALTERNATIVE if
  the owner ever wants "every boss matters the same", but it does not match how the result is
  scored or displayed today.) **Remaining sub-choice, one line either way:** accept on `score`
  (meta/synergy blended — consistent with what each row is optimized for, the recommendation) or on
  raw `teamDamage` (exactly what the game counts). Pin whichever ships as a test invariant.

### U5. Seeds are cross-boss ⇒ they cost real sims

A seed from row _j_ must be re-simmed under boss _i_'s cfg (different bundle, cold entry). Expect
union polish to be MORE expensive than solo's app-path no-op — the `seedsOnly` shortcut still helps,
but the cheap-cache-hit assumption behind F5 is weaker here. **Measure before landing**; if the pass
is expensive and finds nothing, that is a legitimate "don't ship it" answer (same honesty as F6).

### U6. Cache pressure

`MAX_BUNDLES = 3` (`src/teamcalc.ts:567`). Union already uses exactly 3 cfgs, so a polish pass that
cycles all three keeps them all resident (no eviction), but it WILL evict the solo generator's
bundle. Watch the item-5 "2nd Calculate is instant" property when switching modes; raising
`MAX_BUNDLES` to 4 is the trivial fix if it regresses (measure first).

### U7. Test plan (vitest, no workers needed)

`makeCalc` is importable directly, so the union case is testable without the browser: build **three
calcs with three different `cfg`s** (different `weakness`/boss) over one restricted pool and drive
`polishRoster`. Pin:

- roster total never drops vs the greedy arm (`passes: 0`), under whichever U4 rule is chosen;
- teams stay disjoint, 5 distinct, in-pool, `reserved[i]` honored per row;
- **row _i_ keeps boss _i_** — assert the output order is the construction order (the anti-sort guard);
- idempotence (a 6-pass run equals the 2-pass run);
- the solo suite still green + `topTeams` byte-identical after the U3 extraction.

Model it on `scripts/tests/generators/cross-team-polish.test.ts`; reuse the 20-unit / 4-Burst-I
constrained pool idea, since F6 says that is where a difference will actually show up.

### U8. Gate

`bash scripts/verify.sh` green; `npx tsx scripts/bench-generator.ts --polish 5` unchanged for solo
(the extraction is a refactor); a union arm added to the bench or a scratch A/B for the union
numbers; `npm run web:build && node scripts/pool-browser-check.mjs` still parity-green.
Work on an isolated worktree/branch (`teamcalc.ts` is load-bearing, shared-tree discipline).

---

## Open decisions for the owner

1. **Merge `gen-item4` to main?** (then `/patch-notes`). Recommendation: merge — no measurable cost
   in the path users run, recovers a whole team on constrained pools. Holding is defensible on
   "don't carry code that does nothing in the default config" grounds.
2. ~~**U4 accept rule for union**~~ — RESOLVED 2026-07-24 without an owner call: raw sum, because
   the app already reports the union roster as a plain sum of the three teams' damage (union raid
   scoring is the total). Only the score-vs-teamDamage sub-choice remains, and it is one line.
3. **Is union polish wanted at all** if U5 measures expensive-and-inert? Cheap pre-check: run the
   union path against a constrained pool first and see whether greedy leaves a team on the table
   the way it did in solo (that single measurement decides the whole item).
