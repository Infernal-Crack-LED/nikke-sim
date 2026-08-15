# Pre-op packet — `anis-star` skillGauge divisor: the solo re-read (2026-08-15)

> AI-facing. The exact context + plan packet sent to the pre-op judge; the post-op judge receives
> THIS SAME packet plus the work deliverable (never the driver's verdict). Step 3 of
> `docs/handoffs/2026-08-14-burst-gen-next-session.md`, run under `/scientific-method`.

## A. Verified premises (step-0 premise gate, 3 verifiers, 2026-08-15 — all CONFIRM, scope-corrected)

- **P1 (fixture vs shipped).** The battery-3 A3 solo fixture for `anis-star` (Anis: Star,
  RL/Electric/Burst I/Defender, `hitsPerShot: 2`) is a MEASURED band: **~10.7–11.3 %-of-bar per
  pull** (`docs/probe-runs.md:515-520`; mirrored in `data/gauge-per-shot.json:50-56` `source` and
  `docs/answered-questions.md` A25). The shipped engine computes **8.904 %/pull** = shot 7.42
  (280/100 × 2.5 focus × 1.06 aura) + rider 1.484 (280/100 ÷ 2 hitsPerShot × 1.06), verified at
  zero residual against the engine by `scripts/battery/fb-count-matrix.ts --credit-schedule`.
  SCOPE: the fixture measured ONE SCALAR total per pull; its "280 shot + 280 proc" split is an
  interpretation, not a measured sub-step. No committed frame-level `anis-star` fixture exists.
- **P2 (mechanism + blast radius).** `skillGauge` (`src/engine/sim.ts:1551-1563`) credits
  `targetPerTrigger/100 ÷ hitsPerShot` (SG hard-codes ÷10) per skill-damage impact; call sites:
  flatDamage :2751, hitRepeat :2788, pendingHits :4066, DoT :4092, extraHitDamagePct :4399. The
  divisor is unchanged since 2026-07-13 and its correctness is UNMEASURED for `hitsPerShot > 1`
  (the anchor of record, `maiden-ice-rose`, has hitsPerShot 1 where ÷1 = no-divisor).
  `anis-star`'s rider is `shotFired` → one `flatDamage` per pull; `modernia`'s is
  `hitCount count:1` (per hit, 2/pull) AND she sits on the separate `extraHitDamagePct` site,
  which also carries `nayuta`, `neon-blue-ocean`, `neon-vision-eye`. Blast radius is asymmetric.
- **P3-A (U28 gate).** U28's live half is the `skillGauge`-WIDE per-impact magnitude for
  `hitsPerShot > 1` (`docs/open-questions.md:624-648`, UNANSWERED). What is footage/popup-gated is
  choosing between two GAUGE-EQUIVALENT mechanisms: divisor-1 with one impact vs shipped divisor-2
  with two impacts per pull (each rocket carrying a proc). That the shipped total undershoots the
  labeled band (~17–21 % low) is ALREADY established by committed artifacts
  (`scripts/tests/battery/gauge-source-census.test.ts:220-228`).
- **P3-B (fixture self-inconsistency).** The fixture's own decomposition does NOT reproduce its own
  band: (700 + 280) × 1.06 = **10.39 %/pull**, below every point of the stated 10.7–11.3 band
  (2.9 % under the floor, 5.6 % under the midpoint; alternative aura grouping is worse, 9.97).
  The census test's word "compatible" is imprecise. Raw media exists locally and UNREAD at
  `docs/probes/burst tests/a2 anis star.MP4` (untracked dir, no probe.md, no catalog entry, no
  committed raw per-pull data — only the rounded band summary).

**Premise-gate ruling on the packet's fork:** the fixture alone does NOT meet the bar — it excludes
the shipped total but cannot select an encoding (P3-A), and its own summary is internally
inconsistent (P3-B). The solo re-read is required, and the footage already exists on disk.

## B. Context (from the `context` skill; anchors current 2026-08-15)

- **Validation basis (§0):** scope lock, focus defaults to middle slot; graded via
  `scripts/experiment.ts`; configs only via `scopeLockCfg` (`scripts/lib/scope-lock.ts`).
- **Gauge v4 (§7):** `addGauge`/`skillGauge`/`shotGauge`; datamined per-shot table
  `data/gauge-per-shot.json`. Focus bonus: the CAMERA-FOCUSED unit's CHARGE weapon (SR/RL)
  generates ×2.5 (`FOCUS_CHARGE_GEN` sim.ts:1324); unfocused charge ×1.0 (measured, sim.ts:1332).
  Gauge locked during FB AND the chain, unlocking the instant FB ends (owner rulings). Team
  `burstGenPct` aura applies in `addGauge` (sim.ts:1504-1510) — `anis-star` carries +6 % team-wide
  (`src/skills/overrides/anis-star.json`, formation-independent).
- **Charge weapons (§4):** RL release latency ~22f after full charge; overcharge climbs to
  `chargeMultiplier` cap. `anis-star` chargeMultiplier 250.
- **Worked anchor (§12):** `maiden-ice-rose` gauge 364×2.5, the two-visible-sub-step pattern
  (`docs/data/burst-gauge.md:145`) — reproduced historically to <0.15 % error by the bar reader.
- **Video toolchain (§14):** `scripts/probe/gauge-fill.py` (solo gauge-bar reader, calibrated —
  `docs/handoffs/2026-07-29-gauge-fill-reader-calibration.md`; bar-render calibration is a MEASURED
  constant, never refit). Popup colours: white=normal, orange=crit, red=CORE (RL never cores on
  range; skills never core).
- **Evidence tiers (§13):** MEASURED > CALIBRATED ⚑ > DATAMINED > MODEL-ONLY. Never refit measured
  constants. Overturning the 2026-07-13 band summary needs same-tier evidence — a finer-granularity
  re-read of the SAME footage is same-tier (video), method-diverse (per-pull deltas vs the original
  aggregate bar read).
- **Rotation (§8):** solo `anis-star` is Burst I — she makes zero FULL bursts alone (no stage-2/3
  enabler), but she CAN solo-cast Burst 1: `docs/probe-runs.md:518-519` records that this very
  recording caught a live burst-chain collapse (gauge consumed, Burst-1 cast, window expiry,
  refill). The recording therefore contains consumption/lock/refill transients and possible
  bar-saturation clipping — handled by revision R2 below. [Corrected from the draft packet's
  "one long generating window" claim, which the pre-op judge refuted from the fixture's own text.]

## C. The plan

**Question.** What per-pull burst-gauge total and sub-step structure does `anis-star` produce in
solo focused play?

**Hypotheses.**

- **H0 (shipped):** per-pull total **8.90 %**, sub-steps [shot ≈7.42 %, one rider ≈1.48 %].
- **H1 (divisor wrong):** rider credits full `targetPerTrigger` — total **10.39 %**, sub-steps
  [≈7.42 %, one rider ≈2.97 %].
- **H1b (two impacts):** each rocket carries a proc at the shipped ÷2 — total **10.39 %**,
  sub-steps [≈7.42 %, two riders ≈1.48 % each]. Gauge-equivalent to H1 in total; distinguishable
  ONLY by sub-step count/timing.
- **H-band (missing term):** the original 10.7–11.3 band is accurate and NO decomposition of the
  known terms reproduces it — an unmodeled generation term exists; the divisor question cannot be
  closed from this read alone.
- **H-basis (broken basis):** the reader fails its control, or the focus premise fails (see
  controls) — the run is instrument-invalid, NOT evidence for any hypothesis above.

**Method.**

1. Instrument-validation prelude (reuse-before-derive): run `scripts/probe/gauge-fill.py` against
   its committed labeled fixture(s); additionally reproduce the `maiden-ice-rose` anchor sub-step
   pattern from its committed artifacts if a runnable fixture exists. The control value is a
   MEASUREMENT with a pinned expected result — not asserted.
2. Read `/Users/maxwellsutton/nikke-sim/docs/probes/burst tests/a2 anis star.MP4` (media stays
   untracked; derived data is committed): per-pull bar deltas for EVERY pull in the recording,
   with sub-step decomposition (count, size, timing relative to release vs rocket impact) wherever
   the render resolves it. Record per-reading quantization/error bounds from the reader's
   calibration. Flagged/artifact windows excluded by the reader's own flag taxonomy (exclusions
   reported, not silent).
3. Commit: the replay bundle (`docs/probe-data/`), a `probe.md` + catalog entry for the recording
   dir, and any reader flag/fixture additions. Measurement → `docs/probe-runs.md` (LOG tier).

**Predictions (discriminating).**

- H0 vs H1/H1b separation is **1.49 pp per pull** — an order of magnitude above the reader's
  demonstrated <0.15 % anchor error; ~10+ pulls give a decisive median.
- H1 vs H1b: number of post-shot rider sub-steps per pull (one ~2.97 % vs two ~1.48 %); rider
  credit timing should sit at rocket IMPACT (flight-delayed, pendingHits path) vs shot credit at
  release.
- Focus check (basis): the shot leg alone should read ≈7.42 %. If it reads ≈2.97 % the ×2.5 focus
  premise is broken for this recording → H-basis, stop.
- If the median total reproduces the ORIGINAL band (≥10.7) instead of 10.39 → H-band.

**Pre-committed decision rule.** Let T = median per-pull total over clean pulls; require **n ≥ 8**
clean pulls else CANNOT-MEASURE. Tolerance ±0.35 pp (≈2 bar-render quantization steps; the work
agent must restate the actual quantization bound from the calibration doc before reading, and if
it exceeds 0.35 the tolerance becomes 2× the actual bound, stated before unblinding the numbers).

- T ∈ [8.55, 9.25] AND one rider sub-step → **H0 holds**; the 2026-07-13 band summary is
  contradicted at same tier (finer method, same footage) — LOG for owner; no engine change.
- T ∈ [10.04, 10.74] → divisor under-credits; **H1 vs H1b decided by sub-step count** (if
  sub-steps unresolvable: LOG the total-level finding; the encoding choice stays open per U28).
- T ≥ 10.74 → **H-band**; record the missing-term size; no encoding verdict.
- Control failure or focus-check failure → **H-basis** (instrument-invalid ≠ effect-absent —
  falsification clause distinguishes the two by construction: H-basis fires ONLY on the prelude
  control or the shot-leg check, never on the target statistic).
- Anything else (T in no window, bimodal T, rider sub-steps inconsistent across pulls) →
  INCONCLUSIVE; report the distribution.

**Controls.** (i) The reader's committed labeled fixture(s) — pass required before the target
read; (ii) the shot-leg ≈7.42 % focus check inside the same recording (internal control on the
same basis); (iii) quantization bounds restated from `docs/handoffs/2026-07-29-…calibration.md`
before reading; (iv) her +6 % aura applies to BOTH legs in the engine — all predicted numbers
above are with-aura, so no grouping ambiguity enters the comparison.

**What this test CANNOT establish.** Team-context generation (the 59 %/50 % shortfall — step 2's
thread); anything about `modernia`'s per-hit cadence or the `extraHitDamagePct` site (her own
Destroy-Mode bar read remains U28's named probe); the enactment itself — MEASUREMENT ≠ ENACTMENT,
any engine change is a separate gated pass with the pre-registered blast radius: `anis-star`
+42–59 gauge/fight on her four comps (≈12 % of T5 wind-weak's cycle gap), plus the
`modernia`/`nayuta`/`neon-blue-ocean`/`neon-vision-eye` surfaces from P2.

## D. Pre-op verdict + mandatory revisions (executed; judge: APPROVED-WITH-REVISIONS, 2026-08-15)

The five revisions below are BINDING amendments to §C. The judge's spot-check refuted two packet
claims (R1: the MP4's solo identity was never confirmed — the `a2` filename series belongs to the
A1/A2 `takina`/`crown` TEAM pair, `docs/probe-runs.md:485-509`; R2: the "one long generating
window" claim — the fixture's own note records a Burst-1 cast/chain collapse in this recording).

- **R1 — Recording-identity gate.** BEFORE the target read, open the footage and confirm from the
  formation UI that it is `anis-star` ALONE (solo). Any teammate present → instrument-invalid for
  this plan (per-pull deltas not attributable) → H-basis / CANNOT-MEASURE, STOP; do not adapt the
  method mid-read. Record the confirmed identity + provenance mapping (file → `docs/probe-runs.md`
  A3 entry) in the new probe.md.
- **R2 — Lock/saturation exclusions.** Pre-committed exclusion classes in the clean-pull
  criterion: (a) any pull whose delta could be clipped (bar above ~90 % at release — threshold
  restated from the calibration doc), (b) any pull overlapping the chain/lock window or the
  consumption/refill transient. Excluded pulls reported with reasons; **n ≥ 8 is counted AFTER
  exclusions.**
- **R3 — "Clean pull" defined in advance.** Full-charge release (charge state noted per pull where
  the reticle resolves it — partial-charge gauge behaviour is unmeasured and a variance rival), no
  reload overlap, no reader-flagged window, and passing the R2 exclusions. Anything else is
  excluded-with-reason, never silently dropped.
- **R4 — Boundary overlap closed.** All decision-rule intervals are half-open; **T ∈ [10.70,
  10.74) is INCONCLUSIVE-boundary** (doubly consistent with H1 and H-band), never an H1 accept.
- **R5 — Totals-only path keeps the absent-vs-broken split.** (a) If sub-steps are unresolvable,
  the shot-leg focus check cannot execute — "unresolvable" is NOT "failed"; proceed totals-only.
  (b) **T < 8.55 (e.g. the ~4.4–5.9 no-focus arithmetic) is basis-suspect/INCONCLUSIVE, never
  "effect absent".**

**Judge risk flags (carried):** same-footage dependence — the re-read shares any per-recording
systematic with the original band; never cite it later as an independent-method confirmation of
the band itself. Sub-step resolution may fail on a 2-rocket volley — expect the H1-vs-H1b half to
come back open. If T lands in the H1 window, the follow-up divisor change argues FAITHFULNESS at
the enactment gate, not here. If R2's exclusions bind hard on a ~30 s recording containing a chain
collapse, CANNOT-MEASURE is the honest outcome — do not relax the clean-pull criterion post hoc.
