# Remaining work — top-ranked DPS validation + unmodeled kit pieces (2026-09-04)

**SSOT for the two in-flight threads** from the 2026-08-21 → 2026-08-25 commits: (A) validating the
sim's top-ranked DPS against community lists and recordings, and (B) reviewing missing/unmodeled
kit pieces (the 2026-08-23 top-board kit-faithfulness audit and its follow-ups). This doc
categorizes everything still OPEN in those two threads and gives the implement/review plan per
item. AI-facing.

**Sources of truth this doc aggregates** (each owns its own detail; this doc is the index):

- `docs/b3-dps-rank-audit.md` — sim chart vs community damage lists (generated 2026-08-16 by
  `scripts/audit-b3-ranks.ts`; regenerable).
- `docs/kit-faithfulness-audit-2026-08-23.md` — 45-unit top-board audit, FINDINGS ONLY.
- `docs/handoffs/2026-08-24-kit-audit-primitive-followups.md` — what landed (fullCharge,
  selfStatus, copyResource) and every open thread with its gate.
- `docs/handoffs/2026-08-25-skill-level-scaling.md` — scaling fix landed; per-unit backlog open.
- `docs/unmodeled-entries-review.md` — generated triage of all 469 `unmodeled` entries
  (regenerate: `npx tsx scripts/gen-unmodeled-review.ts`).
- `docs/engine-modeling-gaps.md` — engine-level gap census (open: 20b/20c/20d + gated theme tails).
- `docs/open-questions.md` — U19, U23, U26–U31, U38, U39, U40 referenced below.

**Excluded:** `docs/enikk-top100-audit.md` is stale (owner ruling 2026-09-04) — do not cite it for
roster-coverage claims. Unrelated QUEUE threads (takina residual, nbo swap footage, burst-gen
denominator, shortfall explainer) stay in `docs/handoffs/QUEUE.md` and are not re-listed here.

---

## Category A — validating the top-ranked DPS (b3 rank audit follow-ups)

The audit compared 70 slugs (neutral + eleweak arms) and flagged 23 units where sim rank disagrees
with the community lists by ≥10. **Nothing from it has been enacted.**

### A0. Re-run the rank audit against the current chart — DONE 2026-09-04

Re-ran against the 2026-08-25 chart (which already contains the mihara restraint-pacing and
skill-level-scaling landings). Required one script fix: `PRIORITY_SCORE` learned the Tsareena
sheet's new "High Union Raid Priority" label (score 4 — all six carriers are raid DPS).
**Outcome: the flags are stable** — same 14-unit recording list (§7), small Δ wobbles only. Two
movements worth noting: `jill`'s eleweak +10 flag dropped below the flag threshold (22 flagged
units now, was 23), and `mihara-bonding-chain`'s measured board improved HOT 1.18 → 1.08 (±8%)
with her Δ −10 rank flag intact — the restraint-pacing landing shows in the cross-check but
doesn't close the community disagreement.

### A1. MAJOR/NOTABLE flags with NO recording — 14 units (recording-gated)

Ranked by loudest disagreement (worst Δ): `raven` +43, `sugar` −40, `vesti-tactical-upgrade` −25,
`laplace` +18, `e-h` +17, `k` +16, `asuka-wille` −15, `julia` +15, `marciana-marine-study` +14,
`phantom` −14, `ark-ranger-black` +13, `eve` −13, `ludmilla-winter-owner` −11,
`sakura-bloom-in-summer` −10.

- **Plan:** publish recording asks via `/testing-requests` (or owner's roster via
  `/hand-tune-batches` where owned); each incoming fight goes `/probe-processing` → hand-tune.
  `raven` is the top ask — community #4/#5 vs sim #47, plus two known kit-status ENGINE items
  (22f RL bolt-recovery input; `chargeMultiplier 0` vs datamined 250% full-charge — a possible
  2.5× under-credit on her normal channel).
- **Gate:** footage. Nothing here is enactable from the tree.

### A2. Flags where the measured board exists and contradicts or corroborates

- `ein` — community ranks her #26/#27, sim #41/#43, and the measured board CORROBORATES
  (0.73 COLD, n=3). Highest-confidence real under-model on the board.
  **Plan:** diagnose from existing footage (no new recording needed); candidate causes already
  filed: QUEUE item 2 `ein` U8 0.7× team residual + the cross-slot scaling value (Category C2).
- `privaty` — sim ranks her far ABOVE community (Δ −46/−56) and measures HOT 1.21 (n=3,
  corroborated). ⚠ basis caveat: community list has no treasure marker, sim runs treasure-on.
  **Plan:** settle the treasure-basis question (A3) first; the HOT board is already real and
  hers to explain independent of the rank gap.
- `scarlet-black-shadow` — sim ranks ABOVE community (Δ −11/−12) but the board reads COLD 0.93
  (n=2, N3) — CONTRARY. The N3 re-read found the 848% in-burst proc ABSENT from a confirmed burst
  window. **Plan:** the queued isolated-burst measurement (one burst-window recording, count
  procs) settles both the proc cadence and the rank flag.
- `milk-blooming-bunny` — sim ranks BELOW community (Δ +11/+12) but measures HOT 1.22 (n=1) —
  CONTRARY, and the community row is the conditioned (shyness-stack) one.
  **Plan:** re-basis against the unconditioned community row; the HOT board itself is U23 +
  the pierce-tagging item (B4), both measurement-gated.
- `alice` — HOT 1.10 (n=1), corroborated. `chisato` — COLD 0.97 (n=3), corroborated.
  **Plan:** fold into the normal hand-tune pipeline; no audit-specific action.

### A3. Treasure-basis mismatch between sim and community lists (owner ruling)

The sim validates treasure-on; the community CSV scores each unit once with no 宝もの marker. On
the 4 units scored both ways the treasure row is ~2× the plain one. Contaminates the `privaty`,
`sugar`, `phantom` flags (and any treasure unit's Δ).

- **Plan:** one owner ruling — either re-basis the comparison (exclude/rescale treasure units) or
  accept the contamination and downgrade those flags. Cheap; unblocks correct triage of A1/A2.

---

## Category B — kit-faithfulness audit follow-ups (missing primitives + divergences)

From `docs/kit-faithfulness-audit-2026-08-23.md` + the 2026-08-24 followups handoff. Landed
already: `fullCharge`, `selfStatus`, `copyResource` primitives and the §6 prose-drift deletions.

### B1. Mechanical, unblocked (no new evidence needed)

1. **fullCharge roster tail** — ~20 overrides still carry `shotFired` blocks under "Full Charge"
   kit text: `a2`, `delta`, `emilia`, `exia`, `frima`, `harran`, `himeno`, `laplace`, `n102`,
   `nihilister`, `rapunzel`, `rapunzel-pure-grace`, `raven`, `velvet`, `vesti-tactical-upgrade`,
   `yan`, `yuni`, `zwei`. (`mari` is kit-silent — NOT a migration candidate.)
   **Plan:** per unit, match each `shotFired` block to its kit clause, migrate only
   full-charge-worded lines, A/B byte-identical. ⚠ `zwei` is SG — migration there is a behavior
   CHANGE (block goes silent), needs a real read of her charge mechanics first.
2. **`rei-ayanami-tentative-name` + `rem` selfStatus migrations** — both still carry the retired
   boss-`targetStatus` self-mode proxy. Mechanically identical to the landed `asuka-wille`
   migration; behavior-identical per their notes.
3. **Validator/census hardening** (cross-family review follow-ups, 2026-08-25):
   - extend `blockOrderPairs` census to `copyResource` (producer `name` + consumer `from`) and
     `perResource` readers — or scope it out in the census header;
   - extend the declared-`resources[]` guard beyond `copyResource` to plain `resource` effects and
     `perResource` (roster-wide blast radius — sweep findings-only first);
   - fix `gen-unmodeled-review.ts` `bestMatchingText` mis-attributing mihara's inert S2 entries.
4. **Note palimpsests** — `neon-vision-eye` and `maiden-ice-rose` need wholesale current-state
   note rewrites with capture-first checks against DECISIONS (higher-risk prose surgery).
5. **Parser-baseline drift** — `kit-parser.ts` now emits `fullCharge`; committed baselines under
   `overrides-baselines/` carry `shotFired`. Reconcile on next baseline regeneration (not ad hoc).

### B2. Primitives to build (cheap) — every consumer separately gated

1. **`selfStatusEnd` trigger** — replaces `asuka-wille`'s Emergency-Repair `fullBurstEnd` proxy
   (~1s late); the missing half of "while in state X". Consumers waiting: `grave` Heat-Emission
   off-window gating (U19), `crust` stance machine. Build the primitive now; enact consumers only
   behind their own measurement/owner gates.
2. **`consumeStatus` / remove-target-buff** — `asuka-wille` ⚑6 Anti A.T. Field instant-consume
   (model over-credits the team-amp tail ~34% vs ~22.5% uptime). Recipe in her note; unmeasured
   unit — enactment is measurement-gated.
3. **Status-linked durations (retire `9999`/`100000` sentinels)** — `prika` ×3 and
   `cinderella-crystal-wave` mode-swap. Design only makes sense after the underlying windows are
   measured/ruled (prika's duet Encore window is the load-bearing ⚑ OPEN, measured ladder
   0.890→1.064). Deferred design.

### B3. Owner-ruling gated

1. **`cinderella` G1 same-cast snapshot** — the audit's largest open faithfulness risk
   (~20–25% nuke swing; `burstSnapshotsPreFb: false` vs the e3-video reading). Override already
   carries "⚑ OWNER RESOLUTION REQUIRED" with the one-popup recipe (u8 e3 footage).
2. **`flora` `sides: 2` vs `sides: 1`** (U38, shared with `rouge`) — shipped choice is the
   inflating one; widens a 45.12% caster-ATK buff + crown's recovery-event feed. One reading
   settles it.
3. **`mint` duet t=0 Singing gate** — modelable honestly now that `selfStatus` exists, but `mint`
   is HELD (M12). Owner disposition first.
4. **`grave` U19 enactment** — note computes the faithful durations; owner decision + measurement
   gate (she grades 1.17–1.22 HOT by owner direction).
5. **`crust` stance machine** — structural owner ruling on the sim's always-full-charge basis.

### B4. Measurement-gated

1. **Hit-Rate→core conversion magnitude** (shared engine ⚑) — ONE measurement de-risks `miranda`,
   `anchor-innocent-maid`, `drake`, `phantom`, `jill`, `chisato` and breaks the jill-cell
   circularity in the sg-geometry slope. Highest leverage single measurement in this list.
2. **`asuka-wille` cluster** — wholly unmeasured: finisher 30-cap vs blind-rebuild 10 (3×
   spread), A.T. Field consume (B2.2), "MG heating up speed ▼100%" unmodeled, Emergency-Repair
   timing (B2.1). One focused recording likely settles several.
3. **`drake` trigger pulls vs pellets** — if pellets, the nukes are 10× hotter. Largest single
   lever on an unrecorded unit.
4. **`bready` Aftertaste additive vs multiplicative** — ~41% lever; no recording exists.
5. **`eunhwa-tactical-upgrade`** — burst cannon window kit-silent (10s default, ~2× lever) +
   dropped camouflage true-damage (under-count).
6. **`mari` S2 estimated `shotFired` trigger** — top per-unit uncertainty on the buffer board.
7. **`mast-romantic-maid` Drunken live-resource upgrade** (mint-style counter) — reads 0.951 COLD;
   the faithful path is named.
8. **`dorothy-serendipity` solo consolidation re-validation** — 80-pellet accrual calibrated
   all-land but accrues landed; solo count reads LOW.
9. **`milk-blooming-bunny` pierce-tagging** — engine applies burst pierceDamagePct to her S2
   Distributed-Damage rider (measured 10.96M→6.70M/tick without gainPierce); engine-scope fix.
10. **Small fry (batch):** `snow-white-heavy-arms` displaced-swap-shot charge (U39),
    `phantom` dagger `everyN: 60` drift, `marciana-marine-study` three interpretation choices,
    `nayuta` bolt-recovery note arithmetic (2.3s vs 2.13s), `prika` disclosure-parity caveat.

### B5. Gauge cluster (engine-wide, owner-bounded — batch deliberately)

- Rider `extraHitDamagePct` emits no burst gauge (U28 surviving half; `scripts/battery/u28-gauge-ab.ts`).
- **20b** — `snow-white-heavy-arms` authors 15 gauge calls/pull, ledger observes 6 rider credits.
- **20c** — rider gauge per PULL or per HIT (`modernia` is the only discriminating carrier).
- **20d** — `k`'s burst swap costs a rotation step (4 casts vs 5; ammo/reload-on-revert suspected).
- **Plan:** one batched gauge session — the compensating-errors rule forbids piecemeal enactment.

---

## Category C — skill-level scaling backlog (from the 2026-08-25 landing)

Engine fix landed (0 SILENT, 13 pinned assertions). Remaining:

1. **C1. Treasure per-level data — 19 units, BLOCKED on data.** `diesel`, `drake`, `exia`,
   `flora`, `frima`, `helm`, `julia`, `laplace`, `milk`, `miranda`, `moran`, `phantom`, `poli`,
   `privaty`, `rosanna`, `sugar`, `tove`, `viper`, `zwei`. Blablalink roledata has no
   favorite-item fields; boosts are non-uniform so no base-kit anchor recovers them.
   **Plan:** (a) investigate whether another source exposes treasure per-level values
   (`data/sources.json`, the DB the treasure PROSE came from); (b) failing that, an owner ruling
   on the scaling rule unblocks all 19 without new data.
2. **C2. 13 cross-slot/unavailable values, 11 units — open, low priority.** Cross-slot anchors
   (`ein`, `eve`, `neon-vision-eye` ×2, `emma-tactical-upgrade`, `red-hood`) may mean the blocks
   are filed under the wrong slot — **worth a look before building cross-slot anchor support.**
   No-table values: `ark-ranger-black` ×2, `cinderella`, `cinderella-crystal-wave`, `sin`, `soda`,
   `soda-twinkling-bunny`.
3. **C3. Census tails.** 8 overrides have no level data at all (`anne-miracle-fairy`,
   `laplace-ultimate-hero`, `maxwell-ordinary-mechanic`, `queen`, `rei-ayanami-tentative-name`,
   `yukiko`, 2 noop controls); 3 ambiguous level tables where two varying arrays share a max
   (`mari` skill2, `prika` skill1, `snow-crane` skill1).
   **Census:** `npx tsx scripts/audit-skill-scaling.ts`; size a unit with `--sim <slug>`.

---

## Category D — unmodeled-entries triage (469 entries, ~146 units)

From `docs/unmodeled-entries-review.md` (generated mirror; per-unit `unmodeled` fields in
`src/skills/overrides/*.json` are the source of truth). **Most of this is NOT backlog:**
212 defensive/HP/shield/aggro entries are inert by design at v1 scope (immortal, partless,
non-attacking boss), and the doc explicitly rejects nearest-wrong encodings (the liter-S2 lesson).
The ACTIONABLE residue:

1. **Measurement-gated items with recipes** — `little-mermaid` Explosive Bubble stack coexistence
   (read boss debuff icons ~5s in); `pepper`/`trina` burst-amp scope ⚑ **live and dangerous** —
   tagging cinderella would flip her 0.893 COLD → 1.523 HOT; validate against real fights BEFORE
   tagging any further comp-mate (census: `scripts/census-burst-amp-scope.ts`); `kilo` HP-basis
   burst nuke (needs an HP-basis primitive + popup read); `k` S1 crit-gated counter (~5% of burst
   damage); `rupee-winter-shopper` shopping-pool decay (sole-B1 recording); cadence tuples
   (`anne-miracle-fairy` RL, `diesel-winter-sweets` RL, `arcana-fortune-mate` SG, emma/folkwang/helm
   HoT ticks, `yukiko` first-tick phase).
2. **Missing-primitive clusters** (95 entries) — enemy-count gates, kill/neutralize triggers,
   part/projectile triggers, explosion radius, RNG when-attacked procs, DEF-ranked targeting
   selectors (`pascal`), consume-target-status (`phantom` S2), MG wind-up modifier
   (`asuka-wille`/`rei-ayanami-tentative-name`), dual weapon-swap slots
   (`eunhwa-tactical-upgrade`), Persona/ally-self-mode gates. Mostly inert at scope lock today;
   build only when a graded consumer lands.
3. **Boss-scope expansion** — a parts/downtime boss model would re-activate the part-gated
   cluster (~20 units) and the explosion-radius cluster. This is the boss-studies program
   (`docs/handoffs/2026-07-16-boss-studies-spec.md`), not a per-unit fix.

---

## Recommended execution order

1. ~~**A0**~~ **DONE 2026-09-04** — re-ran `audit-b3-ranks` against the 2026-08-25 chart; flags stable.
2. **B1** — mechanical batch: fullCharge tail, rei/rem selfStatus, validator/census follow-ups,
   palimpsests. Byte-identical or findings-only; land in per-unit slices with green gates.
3. **A3 + B3** — one batched owner-ruling ask: treasure re-basis, flora sides, mint disposition,
   cinderella G1 recipe go/no-go, grave U19, crust.
4. **B2** — build `selfStatusEnd` + `consumeStatus` (capability only, no consumer enactment).
5. **B4.1** — the single HR→core measurement (de-risks 6 units at once).
6. **A1/A2** — publish recording asks (raven first); process incoming footage through the normal
   probe → hand-tune pipeline; scarlet-black-shadow isolated-burst measurement.
7. **B5** — batched gauge cluster (one session, owner-bounded).
8. **C1** — treasure data-source investigation; fall back to owner ruling.
9. **D1** + **C2/C3** — measurement recipes and census tails as footage/capacity allow.
