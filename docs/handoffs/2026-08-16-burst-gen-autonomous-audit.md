# Burst-generation shortage — autonomous audit findings (2026-08-16)

> AI-facing handoff. Work done without owner footage or rulings: gate greening, a sim-side
> code/override census, a refill-window cadence-buff audit, and a fresh `fb-count-matrix` run.
> Nothing enacted that changes engine behavior. Predecessor: the deep-dive summary delivered
> in-session and the 2026-08-15 H-A/H-B/H-C classification.

## What was done

1. **Gate baseline.** `bash scripts/verify.sh` failed only on stale rank-board artifacts
   (`dpschart.json`, `burstgen.json`, etc.). Re-ran `npm run dpschart && npm run ranks:all`;
   `verify.sh` is now green (302/302 test files, 4536 passed).
2. **STATE.md probe-reader table updated** for the 2026-08-15 instruments: `gauge-fill.py --team`
   (`offCurve` flag, `--reflag`, `--diag`), `fill-trace-compare.ts opening`, and
   `fill-trace-compare.ts classify`. Removed the closed "flag-taxonomy leak" wording.
3. **Code census for one-effect-many-hits gauge credit.** Walked every `skillGauge` call site
   and every `flatDamage` + `flavor: 'sequential'` override.
4. **Refill-window cadence-buff audit.** Ran the event tap on all nine off-count comps and
   listed every `chargeSpeedPct` / `chargeTimeClamp` / `attackSpeedPct` / `fireRatePct` /
   `reloadSpeedPct` / `burstGenPct` buff that applies inside a refill window.
5. **Fresh shortage numbers.** Re-ran `npx tsx scripts/battery/fb-count-matrix.ts --json` and
   `npx tsx scripts/battery/fb-count-matrix.ts --gauge-sources`.

## Key findings

### 1. Sequential `flatDamage` census is complete and unchanged

Six overrides carry `flatDamage` + `flavor: 'sequential'`:

| unit                     | trigger                        | gauge-relevant? | note                              |
| ------------------------ | ------------------------------ | --------------- | --------------------------------- |
| `snow-white-heavy-arms`  | `shotFired` ungated + swapGate | **YES**         | measured per-hit 2026-08-15       |
| `eve`                    | `hitCount` 59                  | **YES**         | `720%` consolidated to one impact |
| `little-mermaid`         | `teamAmmo` 500                 | **YES**         | lands in refill windows           |
| `cinderella`             | `burstCast`                    | no              | chain/FB-locked                   |
| `elegg-boom-and-shock`   | `burstCast`                    | no              | chain/FB-locked                   |
| `sakura-bloom-in-summer` | `burstCast`                    | no              | chain/FB-locked                   |

No additional sequential carriers were found. The planned `gaugeHits` enactment still
affects only the first three and still does **not** move the two filmed shortfall comps
(iron sweep, T5 wind-weak) because none of those three are seated there.

### 2. No other obvious "one effect, many hits" multiplicity was found

- `hitRepeat` has one carrier (`emilia`) and is gated to weapon-hit frames; she seats no
  off-count comp.
- `extraHitDamagePct` carriers (`modernia`, `nayuta`, `neon-blue-ocean`, `neon-vision-eye`)
  already emit `skillGauge` per pull (U28 landed 2026-08-13). The U28 residual — whether the
  `skillGauge` divisor should be 1 for `hitsPerShot > 1` — remains open on `anis-star` and
  `modernia`.
- The gauge-source census (`GAUGE_KIND_CENSUS`) is exhaustive at the effect-kind level.
  The gap is not a missing _kind_; it is missing _credit multiplicity within_ `flatDamage`
  (the SWHA finding) or an entirely unmodeled source class.

### 3. Cadence buffs in refill windows are sparse and already modeled

| comp                   | cadence buffs active in refill windows                             | already modeled? |
| ---------------------- | ------------------------------------------------------------------ | ---------------- |
| **iron sweep (run G)** | **NONE**                                                           | n/a              |
| T5 wind-weak           | `anis-star` `chargeTimeClamp 0.7s` (covers most of each refill)    | yes              |
| T1 wind-weak           | `anis-star` clamp + `mast-romantic-maid` `reloadSpeedPct 30.08`    | yes              |
| misc B3s               | `anis-star` clamp (she is not focused)                             | yes              |
| N1 rapi/quency wind    | `quency-escape-queen` self `reloadSpeedPct 25.87`                  | yes              |
| soda-tb control        | none                                                               | n/a              |
| N2 modernia wind       | none                                                               | n/a              |
| N5 snowwhite-HA fire   | `anis-star` clamp + `snow-white-heavy-arms` `chargeTimeClamp 1.2s` | yes              |

**Implication:** `iron sweep (run G)` is still the cleanest contradiction. It has no
charge-speed, reload-speed, fire-rate, or attack-speed buffs that could inflate refill-window
cadence, yet it shows the same ~1.6× generation shortfall as the other comps. Any explanation
that relies on cadence buffs cannot be the global cause.

### 4. The H-B "more events" signature needs a source

The 2026-08-15 classification found an H-B-shaped signature for iron sweep
(occupancy ~1.83×, size ~1.07×). The sim schedules ~16 gauge credits in a typical iron-sweep
refill window. To match the observed rate, the real fight would need ~29 credits in the same
window. For five SR units firing at datamined cadence, that would require effective charge
times far below the solo-measured 1.2 s — not supported by the existing anchors.

### 5. Non-damage skill applications are the only remaining effect-kind candidate

The gauge-source census reports an upper-bound estimate if every non-damage skill
application (`buffApply`) in a refill window generated the caster's per-impact gauge value:

- **iron sweep (run G):** 0.0–47.9 gauge/cycle vs measured shortfall 40.8 gauge/cycle.
- **T5 wind-weak:** 0.0–43.8 gauge/cycle vs measured shortfall 49.7 gauge/cycle.

However, **iron sweep has 0 _fresh_ non-damage applications in steady refill windows**
(only refreshes and first-fill applications). So this candidate does not explain iron sweep
unless the real game counts refreshes or applies the rule differently.

## Candidate mechanisms still in play

Ranked by how much autonomous work can still be done:

1. **Per-sub-hit gauge multiplicity (owner-gated engine touch).**
   - Proven for SWHA; `eve` and `little-mermaid` are the other two gauge-relevant carriers.
   - Will help N5 (`snow-white-heavy-arms`) but will not move iron sweep or T5.
   - Implementation plan exists: add `gaugeHits` field, fire `skillGauge` that many times
     without expanding damage instances.

2. **`anis-star` / `modernia` `skillGauge` divisor (U28 residual, footage-gated).**
   - The 2026-08-15 solo re-read returned CANNOT-MEASURE at n≥8.
   - If the rider credited full `targetPerTrigger` instead of `÷hitsPerShot`, T5 would gain
     ~58.8 gauge over the fight (~12% of its cycle gap).
   - Needs a clean ≥60 s solo `anis-star` re-record.

3. **Team-context charge / fire cadence differs from solo (footage-gated).**
   - Iron sweep has no buffs to explain this, so the cadence would have to be an intrinsic
     team-context behavior (auto-play, camera focus, release latency).
   - A team-seated bar read of an already-solo-validated unit would test this directly.

4. **Non-damage skill applications generate gauge in refill windows (unmeasured).**
   - The `_trick_` note is the only supporting evidence; no committed measurement confirms
     it, and iron sweep has 0 fresh steady-window applications.

5. **Unmodeled source class (H-C).**
   - The 2026-08-15 classification's branch-1 H-C stamp was struck by the blind post-op judge
     on closure/noise-power grounds, but an unattributable excess remains descriptive.

## Recommended next unblocked actions

1. **Land the per-sub-hit `gaugeHits` enactment** if/when owner approval is given. It is the
   only candidate with a measured premise, a bounded blast radius (3 units), and a clear
   verification gate (N5 FB count 11 → 12).
2. **Re-run the H-A/H-B/H-C classification with a symmetric-E_min statistic** as its own
   pre-registered pass. T5's O/S were structurally uninterpretable under the one-sided
   threshold; a symmetric statistic would let both comps speak.
3. **C4 noise-floor re-run** on offCurve-reflagged quiet spans — the cheapest resolver for
   whether iron sweep's H-C candidate re-stamps.
4. **Source-hunt the excess event instants** in the iron-sweep fill trace: clustered events
   at visual causes support H-C; scattered events refute it.
5. **Update the gauge-source census** if the per-sub-hit enactment lands — the census should
   explicitly note that `flatDamage` emission can be `skillGauge-per-sub-hit` when `gaugeHits`
   is present.

## What was NOT done (requires owner input or new footage)

- No engine changes to gauge mechanics.
- No new recordings.
- No owner rulings requested or assumed.
- No push; all changes are local and reversible.
