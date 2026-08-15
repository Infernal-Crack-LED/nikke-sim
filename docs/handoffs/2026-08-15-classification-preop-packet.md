# Pre-op packet — burst-generation H-A/H-B/H-C classification on the bar-paint-anchored statistic (2026-08-15)

> AI-facing. Step 2 of `docs/handoffs/2026-08-14-burst-gen-next-session.md`, run under
> `/scientific-method`. The post-op judge receives THIS packet + the work deliverable, never the
> driver's verdict. Predecessor run + its lessons: `docs/handoffs/scientific-method-harness.md`
> 2026-08-14 entry (all five lessons executed below); hypothesis classes:
> `docs/handoffs/2026-08-14-burst-generation-remaining-avenues.md`.

## A. Premise-gate disposition (step 0)

Every load-bearing premise here was established THIS SESSION by fresh-context agents from primary
artifacts, or is re-checked in-run by an instrument self-check — per the cheapness gate, no
additional premise-verifiers were spawned:

- **Pa (trace basis).** The team reader's clean set is now artifact-free after the `offCurve`
  flag-taxonomy fix: all 11 clean-set monotonicity-violation windows drop to zero, fixture
  re-pinned and independently validated byte-identical against a fresh video re-scan
  (step 1b, PR #120, verify green). ⇒ THE STATISTIC MUST USE `--reflag`-UPGRADED TRACES — the
  frozen `docs/probe-data/fill-trace-*.json` `result` blocks intentionally predate `offCurve`.
- **Pb (sim arm freshness — a caught trap, folded into method).** PR #119 (`liberalio` Charge
  Speed immunity) changed iron sweep run G's engine behaviour (94→92 pulls). The #118-era
  bundles' sim arms are therefore STALE for that comp. ⇒ The sim credit schedule is REGENERATED
  from current `main` (post-#119) via `scripts/battery/fb-count-matrix.ts --credit-schedule
--json`, never reused from bundles; its own checks gate each arm (control C2).
- **Pc (anchor validity).** Anchoring the real window at the charging bar's first paint rests on
  two owner rulings + one measurement: Full Burst is EXACTLY 10s (DECISIONS 2026-08-14); gauge
  generates only FB-end→chain-start (CLAUDE.md pinned ruling); FB-start→bar-paint measures
  10.13–10.22s (n=36 windows, probe-runs 2026-08-14) — so bar-paint IS the true FB end. Step 1a's
  opening statistic (banked-at-paint medians 5.3–8.1% vs 42–81% predicted by drain-empty banking;
  dark track under the drain bar on 36/36 windows) CORROBORATES; it is NOT load-bearing for the
  anchor and is NOT promoted by this run (§F).
- **Pd (spent avenues).** H-D (bar needs <100) is bounded by the symmetric closure arithmetic and
  H-E (window accounting) by the ladder/boundary reads — packet §1 verified facts, probe-runs
  2026-08-14, read from file this session, unmutated.

## B. Context (anchors current 2026-08-15; sources for every constant named)

- **The open question.** Real teams fill the bar in ~1.8–2.6s where the sim needs ~3.3–4.2s; the
  sim feeds 59% (iron sweep run G) / 50% (T5 wind-weak) of required generation
  (`docs/fb-count-matrix.md`, post-#119 figures). The prior run's re-anchored in-window rate ratio
  ~1.7–2.0× is LOGGED-NOT-VERDICT and MUST NOT be promoted retroactively; this run computes fresh.
- **Hypothesis classes** (`2026-08-14-burst-generation-remaining-avenues.md`): H-A per-hit credit
  larger in team than solo (signature: same event cadence, scaled sizes); H-B more hits than
  modeled (surplus events at modeled sizes); H-C a source with no sim primitive (credit
  unattributable to any modeled cadence).
- **Real-side instrument.** `scripts/probe/gauge-fill.py --team` (nine flags + `offCurve`),
  `--reflag` to upgrade committed traces without video re-scan; per-read noise band
  `TEAM_NOISE_PCT` = 1.5% (below the running max). Real window w = `[barPaint_w, fullInstant_w)`
  per `fill-trace-compare.ts` `WindowResult.barPaint` (first `filling`-state read) and
  `.fullInstant`. Recordings: iron sweep run G (`docs/probes/u8/u8 g vid.mov`, 5 SR comp:
  `d-killer-wife`·`takina`·`milk-blooming-bunny`·`maxwell`·`liberalio`) and T5 wind-weak (the
  probe-u7 recording). The misc B3s (run I) arm is EXCLUDED from classification: its sim arm
  self-voided (SG crediting not reconstructable — step 1c is owner-gated and NOT landed);
  real-side descriptives may be reported, clearly fenced.
- **Sim-side instrument.** `scripts/battery/fb-count-matrix.ts --credit-schedule --json` →
  `CreditScheduleReport`: per-frame `credits: GaugeCredit[]` (source kinds incl. `fill` which
  bypasses addGauge), refill windows `{start, end}` with `end = gaugeFull = b1 − PRE_B1_SEC`, and
  `CreditScheduleChecks` — (a) endpoint reconciliation vs the engine's `u.gaugeGenerated`
  (residual must be 0), (b) DBG_GAUGE line-by-line cross-check, (c) LOUD listing of any credit
  path it could not rebuild. An arm failing ANY check is VOIDED (the instrument disowns itself —
  harness lesson 4).
- **Gauge mechanics** (SSOT `docs/data/burst-gauge.md`, engine `src/engine/sim.ts`): per-shot
  table `data/gauge-per-shot.json` (datamine-exact on solo anchors); focused charge ×2.5 /
  unfocused ×1.0 (both measured); `burstGenPct` aura in `addGauge` (sim.ts:1504-1510); gauge
  locked during FB and the chain (owner rulings); credits are team-aggregate onto one shared bar.
- **Evidence discipline:** MEASUREMENT ≠ ENACTMENT — this run classifies and LOGS; any
  constant/default change is a separate gated pass. Sub-±3% uniform offsets are systematics, not
  noise. Basis clauses outrank verdict branches (harness lesson 1).

## C. The statistic (every endpoint, denominator, and anchor pinned — harness lesson 2)

All real-side reads: `--reflag`-upgraded traces, CLEAN reads only (zero flags). Bin = 1/30s at
the native trace cadence, window-relative.

- **Event-bin (real):** Δfill between consecutive clean reads ≤ 2 trace-frames apart, Δ >
  **E_min = 1.0 fill-%** (⚠ restate from the calibration doc + `TEAM_NOISE_PCT` BEFORE any
  real-side number is computed; if the documented noise bound exceeds 1.0, E_min = that bound —
  fixed before unblinding). Δ spanning an excluded read is a **bridged increment**: counted in
  rate closure, EXCLUDED from occupancy/size statistics, mass reported per window.
- **Per comp arm (pooled over usable windows, plus per-window tables):**
  - **ρ** = (Σ real Δ over windows / Σ real window durations) ÷ (Σ sim credits in sim windows /
    Σ sim window durations). Numerators and denominators each reported separately.
  - **O** (occupancy ratio) = real event-bin fraction ÷ sim credit-bin fraction (sim credits
    binned 1/30s; sim-side fractions computed over the sim's own windows).
  - **S** (size ratio) = median real per-event-bin Δ ÷ median sim per-credit-bin amount.
  - **C_ceiling** (H-C detector, computed from the engine BEFORE the real read): the maximum
    event-bins/s the modeled comp can produce — every seated unit at its maximum modeled fire
    cadence with 100% uptime + all riders (from the regenerated schedule's per-unit credit
    inventory + engine cadence constants; the derivation shown in the deliverable).
  - **Closure check:** |O_eff × S − ρ| / ρ where O_eff includes bridged-mass correction; residual
    > 0.25 → the decomposition does not close → INCONCLUSIVE regardless of branch hits.

## D. Pre-committed decision rule (priority order; intervals half-open)

**Basis clauses first (any failure → that comp arm CANNOT-MEASURE; both arms failing → run
CANNOT-MEASURE):**

- B1: ≥ 4 usable windows per comp after reflag exclusions; per-window clean-bin coverage ≥ 60%
  of [barPaint, fullInstant).
- B2: sim arm passes all `CreditScheduleChecks` (endpoint residual 0; DBG_GAUGE reconciled; no
  LOUD unreconstructed path relevant to the comp).
- B3: per-window ρ dispersion: IQR/median ≤ 0.6.
- B4: saturation: bins with fill > 90% excluded from event statistics (reported).

**Then, per comp arm:**

1. If real event-rate > 1.15 × C_ceiling → **H-C mass present**; its share of ρ quantified as
   (real rate − ceiling-capped rate)/real rate; the REMAINDER still classified below.
2. If O ∈ [0.75, 1.25) AND S ≥ 1.35 → **H-A**.
3. If O ≥ 1.4 AND S ∈ [0.7, 1.3) → **H-B**.
4. Both factors mid-band, or closure residual > 0.25 → **MIXED/INCONCLUSIVE** — report the
   (O, S, ρ) triple and distributions; no class verdict.

**Cross-comp rule:** a CLASS-level claim requires the same branch on BOTH arms (iron sweep AND
T5 wind-weak). Disagreement → per-comp findings only, logged. **No retroactive promotion:** the
prior ~1.7–2.0× logged ratio is not evidence in this run; fresh ρ only.

## E. Controls (each with its own check — harness lesson 3)

- **C1 (reader basis):** the re-pinned team fixture vitest green in the work worktree.
- **C2 (sim instrument):** the `CreditScheduleChecks` trio per arm (this control VOIDS arms, not
  the run).
- **C3 (binning robustness):** sim-side O and S recomputed under ±1-frame alignment jitter and
  60→30fps rebinning; if either shifts > 10%, widen the class thresholds by the observed shift —
  fixed and stated BEFORE the real side is unblinded.
- **C4 (noise floor):** false-event rate measured on known-quiet spans (the drain-hold quiet
  reads: median 0 filled columns, step-1a diag) — must be < 5% of quiet bins at E_min, else E_min
  is raised to the empirical 95th percentile of quiet-span Δ (stated before unblinding).
- **C5 (anchor):** step-1a opening fixtures' vitest green (corroboration only; see Pc).

## F. What this run CANNOT establish

The specific mechanic inside a class (H-B's uptime-vs-reload-vs-auto-play split needs its own
test); anything about the misc B3s sim arm (voided without step 1c); promotion of the
"nothing banks during the drain hold" claim — 1a's intercepts were observed before any rule was
written, so promotion requires a pre-registered replication on NEW footage or an owner ruling;
any enactment — the classification's output is a LOGGED finding + the discriminating next
measurement per class (H-A → a team-seated bar read of an already-solo-validated unit; H-B → a
per-unit cadence read in-window; H-C → source hunting at the unattributable instants).
