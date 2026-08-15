# Burst-generation investigation — four sessions, one item each

> **AI-facing plan. One item per session, in the order below.** Each item is self-contained: it names
> its own question, the premises to re-derive before starting, the method, the pre-committed decision
> rule, and which lane it runs in. Do NOT bundle them — they have different evidence bars, and three
> of the four can be answered without new footage.

## The frame (read this first — it constrains all four)

**Burst gauge is generated per HIT, and by nothing else.** There is no "gain X gauge per second" and
no timer that opens a chain regardless of gauge (owner ruling 2026-08-13, pinned in `CLAUDE.md`
verified facts and `docs/data/burst-gauge.md` §1). Generation happens in exactly ONE window per
cycle: after a Full Burst ends, before the next chain starts.

**The chain and Full Burst timings are settled and frame-verified.** The real cast ladder measures
1.383–1.400s against the engine's 30f+30f+22f = 82f = 1.3667s (`docs/probe-runs.md` 2026-08-13). So
the only place a full-burst count can go wrong is **how much gauge the team feeds the bar**.

⛔ **Do not chase the cycle-time difference.** A "the cycle is ~1.65s too long" figure describes a
symptom in units the game does not have — there is no time constant to change, and treating a
seconds-per-cycle number as the target is chasing a coincidence (owner ruling 2026-08-13). Converted
into the quantity that can actually be wrong, on the two comps whose cycles were filmed:

| comp               | real refill | fight needs  | sim feeds    | sim generates       |
| ------------------ | ----------- | ------------ | ------------ | ------------------- |
| iron sweep (run G) | 2.49s       | 40.2 gauge/s | 23.8 gauge/s | **59%** of required |
| T5 wind-weak       | 1.91s       | 52.4 gauge/s | 26.4 gauge/s | **50%** of required |

("sim feeds" = 100 ÷ the sim's own OBSERVED refill from its rotation log — not the matrix's
per-team "team rate" column (25.11/26.81), which is `gaugeGenerated ÷ gaugeBuildTimeSec`. Both are
sim figures; they are different quantities.)

_iron sweep's row re-derived 2026-08-14 (was 2.59s / 38.6 / 23.7 / **61%**, team rate 25.57) after
the `liberalio` Charge Speed immunity — DECISIONS 2026-08-14 — cost her two charges per fight. The
shortfall WIDENED; the thread's conclusion is unaffected. T5 is untouched: no Charge Speed source is
seated there. See the item-1/2/3 annotations below._

**The sim feeds the bar roughly half to two-thirds of what the fight requires.** That is a large,
findable modeling error, not a timing subtlety. It is robust to the Full-Burst-duration uncertainty
(at a 9.4s real Full Burst the two read 74%/61%); the exact percentage is not. Per-team detail:
[docs/fb-count-matrix.md](../fb-count-matrix.md).

### What is ALREADY settled — do not re-open any of these

- **Generation is locked during the chain and Full Burst.** Owner ruling, re-confirmed 2026-08-13.
- **The unfocused charge multiplier is 1.0, MEASURED.** `UNFOCUSED_CHARGE_GEN` (sim.ts:1374) rests on
  the 2026-07-13 A1/A2 paired battery: `takina` unfocused steps +5.6–6.5%/shot (her flat 560 target),
  focused steps +14–15% (560 × 2.5). **The comment records that the additive
  `full_charge_burst_energy` hypothesis is explicitly EXCLUDED — it would have read +8.1%.** Do not
  send a session after "unfocused charge units should get the full-charge bonus"; it is refuted.
- **A real weapon swap generates NO gauge** (owner ruling 2026-08-13, sim.ts:1493). Same-weapon
  flavor swaps keep feeding.
- **Per-shot values fit the datamine exactly for two charge weapons**, solo: Maiden: Ice Rose (RL) and
  `takina` (SR), per-shot with visible sub-steps (`docs/data/burst-gauge.md` §6).
- **The 22f / 30f / 30f chain ladder.** Frame-measured; footage-confirmed (real ladder 1.383–1.400s
  vs the engine's 82f = 1.3667s). The **10s Full Burst** is the modeled/datamined value, NOT
  footage-confirmed: real FB duration is only bounded at ≥8.87s (`docs/probe-runs.md` 2026-08-13),
  and a real-FB-duration read is that entry's named next measurement. The frame above already treats
  it as uncertain — do not cite this list to settle it.

---

## Item 1 — Is the refill window starved by post-Full-Burst reload state?

> **RESOLVED 2026-08-14 — NOT THE CAUSE (record and close).** The audit ran exactly as specified:
> per-unit gauge-eligible hits bucketed by time-since-FB-end over all 11 steady-state refill
> windows of each filmed comp. The first 1s after FB end delivers **114.7%** (iron sweep) and
> **140.7%** (T5) of the window-tail steady-state rate — ≥80% on both comps, so reload state is
> exonerated by the pre-committed rule. The window is FRONT-LOADED (units leave FB with
> full/restored magazines and live buffs), the exact opposite of a ramp; no unit's first post-FB
> hit lands on a reload completion (reloadBoundFirsts = 0 everywhere). Robust to the baseline
> choice (vs the whole-window average the first 1s still delivers ~111%/~127%). One sub-80%
> per-unit reading — `liberalio` 68% on iron sweep — is charge-PHASE timing (median first hit
> 1.12s ≈ her charge cycle; 0/11 reload-bound), not starvation.
>
> Step-0 premises were re-derived blind (three fresh-context verifiers, 2026-08-14): the FB
> boundaries write NO ammo/reload/charge phase field directly (state carries across; only
> FB-keyed kit blocks can touch it and none are seated in these comps); `unlimitedAmmo` lapse
> leaves the mag at its pre-window level and `nayuta`'s timed swap exit refills to full at FB end;
> `gaugeBuildTimeSec` is a rotation-state counter, not a pure firing window (it ticks through
> deploy delay, boss-unhittable transitions at 33/70/106/144/176s, and per-unit reloads) — so the
> audit buckets hit EVENTS directly. Committed instrument:
> `npx tsx scripts/battery/fb-count-matrix.ts --refill-starvation` (`auditRefillStarvation` in
> `scripts/battery/fb-count-matrix.ts`), pinned by `scripts/tests/battery/refill-starvation.test.ts`.
> Team-wide ≥0.9s silences inside 2 windows per comp are the boss unhittable transitions, not
> reload starvation. Nothing enacted; nothing to enact.
>
> **ANNOTATION 2026-08-14 — the iron-sweep figures above were measured against the PRE-fix engine;
> the verdict survives, the shape claim does not.** Every iron-sweep number in this block predates
> the `liberalio` Charge Speed immunity (DECISIONS 2026-08-14), which strips `maxwell`'s bundled
> `chargeSpeedPct 4.48` from her, lengthens her charge cycle by 4 frames a shot, costs her two
> charges over the fight, and re-phases all four of that comp's SR/charge units against the FB
> boundary. Post-fix, re-derived by re-running the committed instrument:
>
> | iron sweep (run G)                              | pre-fix                                | post-fix                            |
> | ----------------------------------------------- | -------------------------------------- | ----------------------------------- |
> | team first-1s delivery                          | 114.7%                                 | **86.0%**                           |
> | per-bucket team hits `[0-0.5, 0.5-1, 1-2, 2s+]` | `[24, 20, 40, 78]`                     | **`[18, 17, 42, 86]`**              |
> | per-bucket team rate (hits/s)                   | `4.364 / 3.636 / 3.636 / 3.416`        | **`3.273 / 3.091 / 3.818 / 3.644`** |
> | first-0.5s vs tail rate                         | 4.364 vs 3.416 = 1.278× (front-loaded) | **3.273 vs 3.644 = 0.898× (flat)**  |
> | lowest per-unit first-1s                        | `liberalio` 68%                        | **`milk-blooming-bunny` 37.7%**     |
>
> **The RESOLVED verdict is UNCHANGED: 86.0% still clears the pre-committed ≥80% threshold, so
> reload state stays exonerated and item 1 stays closed** — the margin is thinner, not breached.
> What no longer holds on this comp is the descriptive **"FRONT-LOADED"** characterization: iron
> sweep now reads FLAT (opening bucket 0.898× the tail). That is still not the starvation
> signature — a starved window ramps UP from a near-empty first bucket, and `reloadBoundFirsts`
> remains **0 for every unit on both comps**, including `milk-blooming-bunny`'s 37.7%, which is
> charge PHASE exactly as `liberalio`'s 68% was. **T5 wind-weak is completely unaffected** (140.7%,
> `[327, 320, 592, 703]`, still front-loaded) — no Charge Speed source is seated there, which is
> why only this one comp moved. Pins re-derived by running
> `npx tsx scripts/battery/fb-count-matrix.ts --refill-starvation --json` and updated in
> `scripts/tests/battery/refill-starvation.test.ts` (never hand-edited).
>
> _Attribution check:_ the "pre-fix" column is not quoted from this doc, it was re-MEASURED by
> re-running the same instrument with `charFixes.statImmunities` disabled, and it reproduced the
> original pins exactly (first-1s 1.1469 vs the pinned 1.147, team hits `[24, 20, 40, 78]`). The
> immunity is therefore the whole cause of the movement — nothing else drifted underneath it.
>
> **Out-of-scope observation (P3 verifier, filed not fixed — `src/engine/**` is protected):** the
> FSM comment at `sim.ts:3743-3745` still claims the fight-start deploy delay is "Default 0 → this
> never triggers", contradicting the constant at `sim.ts:62` (`ENV.FIGHTDELAY ?? 0.133` → ~8f,
> LANDED 2026-07-21). The code is authoritative; the comment is stale and needs an owner-approved
> one-line touch. It does not affect this audit: the delay cancels in the reconstruction check
> (both `gaugeBuildTimeSec` and the first-fill span count it).

**Run this one first.** It is the only candidate that is invisible to every existing check by
construction, and it needs no footage.

**QUESTION.** The refill window is short (~2–4s) and opens the _instant_ Full Burst ends — the moment
units are most likely to be mid-reload or empty, having just fired for 10s straight. Does the sim
under-feed the bar specifically in that window, while its fight-average generation rate still looks
correct?

**WHY IT CAN HIDE.** Every existing gauge validation is a _rate_ or a _per-shot_ check: the two solo
recordings measure per-shot steps, and `u.gaugeGenerated / gaugeBuildTimeSec` is an average. A defect
that costs shots only in the first ~1–2s after Full Burst ends would leave both intact and still
lengthen every cycle. Note this cuts both ways — if the sim over-models reload downtime there, it
under-generates; the item is the timing of ammo/reload state across the Full-Burst boundary, not
reload speed in general.

**PREMISES TO RE-DERIVE (step 0, one verifier each).**

1. What ammo/reload state does each unit actually hold at the FB-end frame, and is that state
   _carried across_ the boundary or reset? (Primary: `src/engine/sim.ts` reload + `firePull` paths.)
2. Do any units get infinite ammo / no-reload _during_ Full Burst, and if so what happens to their
   ammo counter at FB end?
3. Is `gaugeBuildTimeSec` (stage 0, not in FB, gauge < 100) actually the same window units are firing
   in — i.e. does anything else gate shots there?

**METHOD.** Sim-only, no footage. Instrument the per-unit gauge contribution **as a function of time
since FB end** (0–0.5s, 0.5–1s, 1–2s, 2s+) across every cycle of the two filmed comps, and compare
against each unit's steady-state rate. A starved window shows as a rate that ramps rather than being
flat from the first frame. Cross-check against the `reload` events already on the `onEvent` tap.
Extend `scripts/battery/fb-count-matrix.ts` rather than writing a new script.

**DECISION RULE (pre-commit before running).** If the first 1s after FB end delivers ≥80% of the
unit's steady-state rate on both comps, reload state is NOT the cause — record and close. If it
delivers <50%, quantify how much of the 39–50% shortfall it accounts for and hand that to a separate
gated enactment pass. Between 50–80%: contributing but not sufficient; report the share and continue
to item 2 rather than enacting.

**LANE.** Cheap lane — this is a sim-internal audit against exposed state, not a new game measurement.
`verify.sh` + a fixture is the gate. Escalate to `/scientific-method` ONLY if it ends in changing a
constant.

**DO NOT.** Do not change reload constants. Reload frames are datamined and several are measured; a
generation shortfall is not licence to retune them.

---

## Item 2 — Is any non-bullet gauge source missing or mis-scoped?

> **RESOLVED 2026-08-14 — census clean for comp-moving sources; one zero-contribution FINDING,
> one fixture-conflicting magnitude question (tracked, not enacted).** The audit ran as
> specified: a field-form census of `EffectDef` kinds vs the gauge-emission map
> (`GAUGE_KIND_CENSUS` — compile-time exhaustive over the union; every override file walked at
> runtime, unknown kinds throw), then a dynamic census of all nine off-count comps with the
> event tap, partitioning skill/burst damage instances and buff applications into UNLOCKED
> regions ([0, first gauge-full) + each [FB-end, next gauge-full) refill window) vs the
> chain + Full-Burst lock. Committed instrument:
> `npx tsx scripts/battery/fb-count-matrix.ts --gauge-sources`, pinned by
> `scripts/tests/battery/gauge-source-census.test.ts`. Findings:
>
> 1. **Emission map CLEAN.** Every emission site is measured or owner-ruled: `flatDamage`
>    (maiden rider anchor), `dot` (wiki3 Haran), `hitRepeat` (owner D4 2026-08-10; ⚑ the
>    specific mechanic is unmeasured but its sole carrier `emilia` seats no comp), the U28
>    `extraHitDamagePct` rider (encoded 2026-08-13, bounded), `fillGauge` (chain-lock ruling
>    2026-07-30), `shotGauge` (datamine + solo anchors; real weapon swaps no-gauge, ruling
>    2026-08-13). Nothing emits that lacks a ruling behind it.
> 2. **FINDING per the decision rule — `stackedNuke` (Maiden:IR MP) deals its impact with no
>    `skillGauge` and no ruling behind the omission** (unlike its `storedHit` sibling, whose
>    no-emission carries the owner 2026-08-04 ruling in code comments). Contribution is ZERO by
>    construction — its only trigger is `burstCast`, which always runs inside the chain lock —
>    and its sole carrier (`maiden-ice-rose`) seats none of the nine comps. Reported, not
>    enacted; a one-line comment belongs on the call site in a gated pass (`src/engine/**` is
>    protected).
> 3. **Non-emitting kinds contribute ZERO on all nine comps** — the dynamic half is the proof:
>    the only seated carrier is `rapi-red-hood` (`storedHit`, N1), whose releases are FB-locked
>    by construction (her 7 unlocked skill impacts are the co-authored `flatDamage` attach
>    rider). `storedHit` releases, `stackedNuke`, and the Pierce double-hit all land exclusively
>    inside the lock or ride an already-counted trigger.
> 4. **NEW EVIDENCE on the tracked divisor question (U28 residual — the `skillGauge` ÷hitsPerShot
>    for hitsPerShot > 1 is UNVERIFIED).** The census sized the exposure and found an existing
>    labeled fixture in conflict with the shipped divisor: **`anis-star` (RL, hitsPerShot 2)
>    battery 3 A3 solo measures ~10.7–11.3%/pull; the shipped model generates 8.9%/pull**
>    (700 shot + 140 rider halved, ×1.06 aura) — BELOW the measured band, while the fixture's
>    own decomposition (proc = full 280, NOT halved) is compatible. She is the only divisor
>    carrier on the four comps she seats (T5/T1/misc B3s/N5: +42–59 gauge/fight if resolved her
>    way ≈ 0.2s refill per cycle on T5 ≈ 12% of its 1.65s cycle gap); `modernia` (MG, hps 2,
>    1330 unlocked rider impacts on N2: +66.5 gauge/fight) is the other; every SG carrier's
>    skill hits land exclusively inside the lock (zero exposure). The mechanism (divisor 1 vs
>    two impacts per pull — her rockets may each carry a proc) stays footage-gated per the U28
>    residual; this item adds the fixture conflict + sizing, nothing enacted.
> 5. **Non-damage skill applications (burst-gauge.md §5, _trick_ MEDIUM-confidence rule,
>    unmodeled) CANNOT explain the filmed shortfalls**: fresh applications inside the steady
>    refill windows are **0 on iron sweep and 0 on T5** (1 across all 90 steady windows of the
>    nine comps) — kit activations cluster on `burstCast`/`fullBurstEnter` triggers, which are
>    locked, so the class's lower bound is exactly zero of the 38.7 / 49.7 gauge-per-cycle
>    shortfalls. Its upper bound rides buff refreshes, which are not applications in-game.
>
> **Net: item 2 supplies none of the 39–50% shortfall** — its one live lever (the divisor)
> closes ~12% of one comp's cycle gap and is measurement-gated anyway. The remainder of the
> thread's stop condition is unchanged. Nothing enacted; nothing here changes an engine
> constant, an override, or a snapshot.
>
> **ANNOTATION 2026-08-14 — iron-sweep figures re-derived after the `liberalio` Charge Speed
> immunity (DECISIONS 2026-08-14); the conclusion is unchanged and slightly STRENGTHENED.** The
> immunity costs her two charges per fight, so that comp generates less gauge and its measured
> shortfall WIDENS. Re-run of `npx tsx scripts/battery/fb-count-matrix.ts --gauge-sources --json`:
>
> | iron sweep (run G)              | pre-fix       | post-fix          |
> | ------------------------------- | ------------- | ----------------- |
> | unlocked / locked skill impacts | 24 / 111      | **26 / 107**      |
> | measured shortfall rate         | 14.94 gauge/s | **16.38 gauge/s** |
> | measured shortfall per cycle    | 38.67 gauge   | **40.76 gauge**   |
>
> Item 2's finding is a ZERO-contribution result, so a LARGER shortfall only makes "the non-bullet
> sources supply none of it" more true, not less. The point-5 sentence above ("the class's lower
> bound is exactly zero of the 38.7 / 49.7 gauge-per-cycle shortfalls") should now read **40.8 /
> 49.7** — the fresh-application count on iron sweep is still 0, so the bound is still exactly
> zero. T5's 26.03 / 49.67 are unchanged (no Charge Speed source seated there). All other comps'
> unlocked/locked splits are unchanged. Pins updated in
> `scripts/tests/battery/gauge-source-census.test.ts`.

**QUESTION.** Skill hits, DoT ticks and riders all feed the bar via `skillGauge` (sim.ts:1522, one
target-base hit per impact). Is every source that generates in-game actually emitting, and is
anything emitting that should not?

**WHY IT CAN HIDE.** The solo anchors are both _bullet_ measurements on charge weapons. A missing
`skillGauge` emission on a whole effect kind is invisible to them and invisible to damage tests
(gauge and damage are separate channels). The 2026-08-13 U28 pass already found one such asymmetry —
`extraHitDamagePct` was not emitting `skillGauge` per impact — and fixed it; that is existence proof
for the class, not evidence the class is now empty. That fixed instance also carries an existing
BOUND: the committed `scripts/battery/u28-gauge-ab.ts` shows all four carriers hold their
full-burst counts exactly on support-core comps (the refill-bound charge-B3 arm is flagged
unmeasured there) — so this session's job is the REMAINING impact kinds, not re-measuring the one
already closed and bounded.

**PREMISES TO RE-DERIVE.**

1. Enumerate every call site of `skillGauge` and every effect kind that produces a damage impact.
   Which impact-producing kinds do NOT emit? (Field-form census, not a prose grep — see the
   census-holes lesson: make unrecognised input LOUD.)
2. For each non-emitting kind, is the omission an owner ruling / measured, or unexamined?

**METHOD.** Census `src/skills/types.ts` effect kinds against `skillGauge` call sites, then a
per-comp census of which of the nine off-count teams carry carriers of any non-emitting kind. Compare
the estimated contribution against each team's shortfall. `scripts/battery/` is the home.

**DECISION RULE.** Any impact-producing effect kind that does not emit and has no ruling behind it is
a FINDING, reported with its carrier list and estimated gauge contribution — **not enacted in the
same session** (measurement ≠ enactment). If the census is clean, say so and close the item.

**LANE.** Cheap lane / findings-only audit. Any resulting encode goes through `/code-review`, or
`/scientific-method` if the answer is genuinely unknown rather than merely unencoded.

---

## Item 3 — Is the FOCUSED charge multiplier's per-unit sourcing right?

> **RESOLVED 2026-08-14 — CLOSED, cannot explain the shortfall (record and close).** The audit
> ran as specified: each of the nine off-count comps' focused unit was resolved down the engine
> ladder (`charFixes.focusChargeMult` → `magDumpRof`/`PENDING_TEAM_ISOLATION` pin →
> `characters.json` `chargeMultiplier` → `gauge-per-shot.json` `fullChargeBonus` → 250) and the
> resolved column graded against the record (`docs/data/burst-gauge.md` §4, DECISIONS
> 2026-07-29). Only FOUR comps focus a charge weapon, and all four resolve to MEASURED columns
> via the PRIMARY source, with no pin or charFixes in the path: **maxwell 250** (iron sweep),
> **anis-star 250** (T5 + T1), **scarlet-black-shadow 150** (N3). 250 is the family measured
> twice over (maiden-ice-rose + takina solo anchors, pixel-exact); 150 is enacted off two
> independent measurements (solo ~1.42× + team 11-FB count). The other five comps focus
> non-charge weapons (AR/MG/SG) that take no focus bonus at all. T1's recorded run reportedly
> focused scarlet-black-shadow rather than the sim roster's anis-star (comp note) — both
> columns are measured, so the verdict is robust to that ambiguity. The record check stands as
> stated in WHY below: the three 2026-07-29 DECISIONS entries (per-unit landing,
> alice/cinderella follow-up, SUPERSEDES) closed the 350/200/150 columns, and the ONLY
> unmeasured column — `vesti-tactical-upgrade`'s pinned-2.5 200 — seats no comp (off-count or
> otherwise). The sizing confirms it could not have mattered anyway: even with the column wrong
> in the most extreme direction, scaling the focused unit's whole rate to the largest live
> column (350) covers **≤22.4%** of iron sweep's measured generation shortfall (3.35 vs
> 14.94 gauge/s) and **≤12.6%** of T5's (3.27 vs 26.03) — ceilings, because skill-gen does not
> scale with the focus multiplier. Committed instrument:
> `npx tsx scripts/battery/fb-count-matrix.ts --focus-columns` (`auditFocusColumns` + the
> roster-wide `focusColumnCensus` in `scripts/battery/fb-count-matrix.ts`), pinned by
> `scripts/tests/battery/focus-columns.test.ts`. The census surfaced one documented benign
> source disagreement — `raven` (characters.json multiplier 0 vs gauge row 250; the engine's
> fallback resolves her to the measured 250 family, DECISIONS 2026-07-29 step-7) — and the
> four no-gauge-row 350 carriers (belorta/n102/yan/yuni), who seat no comp and ride the same
> datamined column + owner-confirmed rule as alice. Nothing enacted; nothing to enact.
>
> **ANNOTATION 2026-08-14 — iron-sweep sizing re-derived after the `liberalio` Charge Speed
> immunity (DECISIONS 2026-08-14); the item stays CLOSED and the ceiling gets TIGHTER.** The
> immunity re-phases that comp, which lowers the focused unit's own generation rate and widens
> the comp's measured shortfall — both movements push the ceiling DOWN. Re-run of
> `npx tsx scripts/battery/fb-count-matrix.ts --focus-columns --json`:
>
> | iron sweep (run G)                 | pre-fix       | post-fix          |
> | ---------------------------------- | ------------- | ----------------- |
> | focused unit's rate (`focusPer60`) | 8.368         | **7.954**         |
> | max alt-column upside              | 3.347 gauge/s | **3.182 gauge/s** |
> | measured shortfall rate            | 14.94 gauge/s | **16.38 gauge/s** |
> | ceiling cover                      | ≤22.4%        | **≤19.4%**        |
>
> So the sentence above should read **≤19.4% of iron sweep's measured shortfall (3.18 vs
> 16.38 gauge/s)**; T5's ≤12.6% (3.27 vs 26.03) is unchanged, as is every resolved column, the
> census, and the verdict — a wrong column explains even less of the gap than when the item
> closed. Note the focused unit on this comp is `maxwell`, whose column did not change; her
> rate moved only because the comp's Full Bursts re-phased around her. Pins updated in
> `scripts/tests/battery/focus-columns.test.ts`.

⚠ **Re-scoped.** The obvious version of this item — "unfocused charge units are missing the
full-charge bonus" — is **already refuted by measurement** (see the settled list above). Do not run
that. What remains is the _focused_ side's per-unit value — and a 2026-08-13 review found even that
premise stale: every live non-250 column was settled 2026-07-29 (see WHY below), so what remains is
a verification audit expected to CLOSE the item, not open a measurement.

**QUESTION.** The focus multiplier is sourced from `characters.json` `chargeMultiplier` (250 → ×2.5),
falling back to `gauge-per-shot.json` `fullChargeBonus` when that column reads 0, with a per-unit pin
list overriding both (sim.ts:1440-1456). Are the non-250 columns correct?

**WHY IT MATTERS AND WHY IT CAN HIDE.** The ×2.5 (250 column) is measured twice over (maiden,
takina). **Every other live column is also settled** (`docs/data/burst-gauge.md` §4, DECISIONS
2026-07-29): alice 350 MEASURED + enacted, scarlet-black-shadow 150 MEASURED + enacted, cinderella
200 enacted with the per-unit rule owner-confirmed TRUE — the ~2.2–3.1× reads that once appeared to
contradict the 200 column were RETRACTED as reading errors ("no open dispute on this value"). An
earlier version of this item claimed the 200/350 columns were unmeasured by quoting the engine's
`PENDING_TEAM_ISOLATION` comment; that comment was stale (refreshed 2026-08-13) and is not a source.
The ONE genuinely unmeasured column is `vesti-tactical-upgrade`'s 200: she is sim-supported
(2026-08-01) and the pin holds her at flat 2.5× until it is measured (her kit build's ⚑3 carries
the recipe). The focused unit is the top generator on 5 of 9 off-count teams (~30% of team
generation), so an error here is large for exactly one unit per team — and invisible on any team
whose focus is a non-charge weapon.

**PREMISES TO RE-DERIVE.**

1. Which units in the nine off-count comps are focused AND carry a charge weapon, and what column
   does each resolve to (250 / enacted outlier column / pinned)? Read the resolution off
   `characters.json` `chargeMultiplier` + `gaugePerShot()`; do not re-measure any column.
2. Confirm the column record is as stated in WHY — `docs/data/burst-gauge.md` §4 and DECISIONS
   2026-07-29 (the SUPERSEDES entry) closed the 350/200/150 columns. If that record stands, the
   only unmeasured column is `vesti-tactical-upgrade`'s pinned 200, and no off-count comp seats her.

**METHOD.** Resolve the multiplier per focused unit across the nine comps and compute how much of
each team's shortfall a wrong column could account for. If any off-count team's focus resolves to an
unmeasured column, that is a concrete, footage-answerable question — the per-shot sub-steps are
directly readable off a solo recording, the same method that measured the 250 column.

**DECISION RULE.** If every off-count team's focused charge unit resolves to a **measured or
owner-confirmed column** — 250, or an enacted outlier like scarlet-black-shadow's 1.5× — this item
cannot explain the shortfall: close it and say so. If any resolve to an unmeasured column (today
that can only be `vesti-tactical-upgrade`'s pinned 200, and she seats in no comp), the deliverable
is a recording request, not a value change. Expectation from current data: maxwell 250, anis-star
250 (two teams), scarlet-black-shadow 150 — the item closes.

**LANE.** Audit first (cheap). Any value change is `/scientific-method` with footage — this is a
damage-model constant and the fitting-to-data risk is maximal here.

---

## Item 4 — Do multi-hit weapons credit gauge per LANDED hit or per trigger?

> **RESOLVED 2026-08-14 — EXCLUDED as the shortfall cause; the owner question stays OPEN as a
> faithfulness matter (record and close).** The audit ran as specified: source question first,
> then the ENV-gated A/B.
>
> **Source census (premise 2) — the predicted finding: the primary sources NEVER distinguished
> landed hits from trigger pulls.** The datamine column is per-trigger (`target_burst_energy_pershot`;
> its per-pellet × `shot_count` split is table structure, not a miss test); the "fill counts HITS,
> not damage" lineage (note.com/\_trick\_, wiki3, nikke.gg) is gauge-vs-damage, not hits-vs-misses;
> the ONE explicit statement — auto-play.md §4 "(missed pellets generate nothing)" — is a
> parenthetical on the 2026-07-13 SG damage-falloff ⚑ calibration with no independent gauge-side
> record; and no SG solo gauge-bar recording has ever been read (both solo anchors are charge
> weapons). Per this item's method, that makes it an owner question before a measurement.
>
> **Step-0 premises re-derived (code, this session):** (1) `hitFraction` is fed at ONE call site
> only (firePull → `shotGauge`) and only for SG spray: landed/base pellets (Bernoulli per pellet
> under a seed, else the expected mean; base-capped per the A4 "+pellets buffs don't pump
> per-trigger energy" decision); AR/SMG/SR/RL/MG all pass 1. (3) MG `hitsPerShot` = belt rounds
> per pull and each round is credited as a gauge hit (`shotGauge` rounds × per-round table value;
> DECISIONS 2026-08-11 round definition pinned on `neve`; the §7 rl3 cross-check passed all MGs
> within ±15%) — no MG miss model exists anywhere, so landed-vs-trigger does not arise for MG.
>
> **A/B sizing (committed instrument, default OFF):** `SGGAUGE=trigger` (src/engine/sim.ts) forces
> the full datamine per-trigger value on every SG spray pull — gauge ONLY; damage keeps the landed
> fraction, rng streams untouched. Instrument:
> `npx tsx scripts/battery/fb-count-matrix.ts --multihit-crediting`, pinned by
> `scripts/tests/battery/multihit-crediting.test.ts` — all three live on branch
> **`audit/item4-multihit`** (worktree-isolated per CLAUDE.md rule 8; verify.sh green there; the
> arm-OFF default proven payload-byte-identical by a full five-artifact board rebuild; pending the
> owner's merge/PR call). Panel = the nine off-count comps + the two `dorothy-serendipity` anchor
> comps.
>
> **Measured (deterministic EV):** the arm lifts SG-carrier generation **+27–48%** (noir
> 12.93→16.92 gauge/60f, soda-twinkling-bunny 7.65→10.63 on her control, naga 3.07→4.54,
> arcana-fortune-mate 2.31→3.41, dorothy 4.93→6.24 PH) — team generation **+7–17% on all five
> SG-seated off-count comps** — and moves **ZERO Full-Burst counts anywhere**: every SG comp stays
> exactly one short (N3 9/10, misc B3s 12/13, soda-tb 9/10, N2 9/≥10, N5 11/12), both dorothy
> anchor comps hold 12/12, and the full 31-comp EV board shows 0 FB movers (damage collateral
> ≤+7.7%, SG comps only, rotation-coupling). The four SG-free comps — including the two filmed
> comps that carry the only quantified 39–50% shortfalls — are byte-identical between arms by
> construction and observation. The known sensitivity points the OTHER way: lowering SG gauge via
> faithful landing dropped N5 11→10 (2026-08-03, scientific-method harness), but raising it to the
> per-trigger CEILING cannot lift it back to its measured 12.
>
> **Verdict per the decision rule:** even the ceiling of the "missed pellets generate" hypothesis
> buys no burst boundary anywhere, and the two filmed shortfalls cannot be touched by SG crediting
> at all — item 4 cannot explain the shortfall. The owner question ("does a missed SG pellet
> generate burst gauge?") was filed as open-questions **U40** with this sizing attached — and the
> owner ANSWERED it the same day: **no, it doesn't.** The live per-landed-pellet crediting is
> CONFIRMED (DECISIONS 2026-08-14); the per-trigger arm survives default-OFF as the refuted
> reading's A/B revert. Nothing enacted — the ruling confirms the shipped model, and U40 moved to
> answered-questions.

**QUESTION.** `shotGauge(u, frame, hitFraction)` scales gauge by a hit fraction (sim.ts:1483-1500),
and shotguns feed it per pellet while MGs credit `hitsPerShot` rounds per pull. Does the game credit
gauge for pellets/rounds that MISS?

**WHY IT MATTERS.** This is the largest single lever in the set. `noir` (SG) generates **12.93
gauge/s** — the highest figure in the whole matrix — and SG pellet landing is a modeled,
probabilistic quantity (UNIGEO). If the sim withholds gauge for missed pellets and the game credits
per trigger, SG-seated teams under-generate by whatever fraction misses; if the reverse, they
over-generate. Same question for MG belt rounds. Five of the nine off-count comps seat an SG
(`soda-twinkling-bunny` on TWO — N3 and soda-tb control — plus `noir` in misc B3s, `naga` in N2,
`arcana-fortune-mate` in N5), and MG carriers appear in five (six carrier slots — `crown` twice).

**PREMISES TO RE-DERIVE.**

1. What is `hitFraction` actually fed at each `shotGauge` call site — landed pellets over total, or
   something else? Is it 1 for AR/SMG/SR/RL?
2. Does the "fill counts HITS, not damage" rule in `docs/data/burst-gauge.md` §1 have a primary
   source that distinguishes _hits landed_ from _trigger pulls_, or has that distinction never been
   stated?
3. Is `hitsPerShot` for MG the belt-round count, and does each round count as a hit for gauge?

**METHOD.** Start with the source question (2) — if the primary sources never distinguished the two,
that is the finding, and it is an owner question before it is a measurement. Then A/B the sim with
`hitFraction` forced to 1 for SG and measure the board + FB-count movement, ENV-gated and default
OFF. **`dorothy-serendipity` is the designated SG-spray regression anchor** — her 80-hit → 3-big-shot
consolidation amplifies pellet errors into large swings.

**DECISION RULE.** If forcing `hitFraction = 1` closes a material share of the 39–50% shortfall on
the SG-seated comps, that localizes it. The size of the move is the signal; the SG-free comps are a
scoping sanity check, not a discriminator — non-SG paths already pass `hitFraction = 1` by
construction, so "moves nothing there" is true by definition. It still does **not**
license landing the change — the game-behaviour question ("does a missed pellet generate?") is an
owner ruling or a footage measurement, not something the board can settle. A board improvement here
would be exactly the fit-to-data failure the harness exists to stop.

**LANE.** `/scientific-method` if it becomes a value change; the initial census and A/B are cheap
lane. **Ask the owner question first** — two of this session's items dissolved on being asked rather
than measured, and "does a missed pellet generate burst gauge" is likely one of them.

---

## Sequencing and stop conditions

1. **Item 1** (refill starvation) — sim-only, no footage, largest blind spot.
2. **Item 4** (multi-hit crediting) — largest single lever; open with the owner question.
3. **Item 2** (non-bullet sources) — census, cheap.
4. **Item 3** (focus column) — likely closes: every focused charge unit resolves to a measured or
   owner-confirmed column (250 for maxwell/anis-star ×2, scarlet-black-shadow's enacted 1.5×).

**Stop condition for the whole thread:** if items 1–4 together account for well under the measured
39–50% shortfall, the remainder is NOT in generation and the frame above is wrong — that is a real
result and it goes back to the owner rather than into a fifth speculative item.

> **STATUS 2026-08-14 — ALL FOUR ITEMS CLOSED; THE STOP CONDITION HAS BEEN MET.** Item 1 (refill
> starvation — NOT starved: front-loaded on T5, flat on iron sweep, both clearing the ≥80% rule),
> item 2 (non-bullet sources — census clean for comp
> movers; the one live lever is the footage-gated `skillGauge` divisor at ~12% of T5's cycle gap),
> item 3 (focus columns — all seated resolves measured, ceiling ≤19.4%), and item 4 (multi-hit
> crediting — the per-trigger CEILING arm buys zero Full Bursts anywhere) together account for
> well under the measured 39–50% shortfall. Per the stop condition, the remainder is not in any of
> the four generation candidates, and the thread goes back to the owner rather than into a fifth
> speculative item. Live residue: the **U28 divisor residual** (footage-gated) and the separate
> **real Full Burst duration** measurement (QUEUE item 2). Item 4's owner question (**U40** —
> does a missed pellet generate?) was ANSWERED 2026-08-14: no — per-landed crediting confirmed,
> nothing left to enact.

**Every item is findings-only.** None of them changes an engine constant, an override, or a snapshot
in the session that discovers it. Enactment is a separate gated pass with fresh context — the
measurement ≠ enactment rule, which this thread has already had to invoke once.
