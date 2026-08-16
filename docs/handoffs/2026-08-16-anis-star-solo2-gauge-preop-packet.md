# Pre-op packet — `anis-star` solo recording #2: per-pull gauge magnitude + same-regime noise floor (2026-08-16)

Status: pre-op **APPROVED-WITH-REVISIONS** (Fable, 2026-08-16); revisions R1–R5 below are
EXECUTED in this packet (amendments marked inline). Measurement-only session — **no
enactment**: whatever the outcome, this run records (probe-data artifact, probe-runs append,
harness log); any engine/data/override change it motivates is a SEPARATE gated pass
(evidence-proportionality). Resolves the two halves of QUEUE item 2's recording ask:
U28's magnitude half AND the same-regime noise floor the 2026-08-16 C4 re-run missed its
basis floor on.

**Pre-op revisions (executed):**

- **R1 (K-band disjointness rule):** the K-bands are baseline-dependent — H-model (10.39) and
  the elevated band's bottom sliver ([10.96, ~11.11]) are integer-disjoint ONLY when the
  window's rendered baseline ∈ ~[1.4, 6.5). Per window, K-bands are computed from that
  window's OWN rendered baseline; if two hypotheses share the observed K there, the window is
  **doubly-consistent** and cannot count toward the "exactly ONE hypothesis" clause. The
  formula inherits the A3 post-op interpretation (rendered ~2.2 = real gauge, not a border
  artifact); if a window's hypothesis assignment flips between the rendered-baseline and
  true-zero interpretations, that window is INCONCLUSIVE for the affected pair.
- **R2 (per-window drop, not run-fatal):** a single window whose 30fps trace boundaries miss
  the ±1.5s montage tolerance is DROPPED (logged verbatim). BASIS-BROKEN fires only if <2
  refill windows survive, or ALL windows disagree (systematic anchor/reader failure).
- **R3 (W4 anomaly gate):** W4 (~77→83.5, ~6.5s) fills ~2× faster than W2/W3; at her cadence
  (≈1.05s/pull + one 2.35s reload) K=9–10 pulls need ≳9s — NO hypothesis under test predicts
  a 6.5s fill. W4 cannot enter the ≥2-window decision rule unless its pull count is
  hand-montage-verified AND its trace boundaries reconcile the discrepancy; otherwise it is
  dropped per R2 and logged, never interpreted.
- **R4 (cross-check every counted window):** the pixel-free hand-montage ammo pull-count
  cross-check applies to EVERY window that enters the decision rule (one batched ffmpeg tile
  per window, ≤3 tiles, bounded). A reader-only window may be reported descriptively but
  never counted toward "exactly ONE hypothesis" — pull instants otherwise come solely from
  the same reader whose false-event rate Question B measures.
- **R5 (citation fix):** H-model's 10.39 cites the branch-local DECISIONS entry on
  `anis-star-gauge-divisor` (pending PR) — NOT main's DECISIONS, where no entry exists yet;
  the value is independently derivable as (280×2.5 + 280)×1.06 and recorded in the
  2026-08-15/16 harness-log entries on main.

## Recording

`docs/probes/solo/anis-star-solo.mov` — new owner recording, 85.06s, 60fps, 1206×2622 with
rotation-90 side-data (decodes to the standard 2622×1206; verified). Catalog entry drafted
(uncommitted). This is a SECOND, independent recording of `anis-star` (Anis: Star, RL /
Electric / Burst I) solo under scope lock — distinct footage from the 22.53s A3 clip every
prior solo read used, so it breaks the same-footage dependence the 2026-08-15 LOG flagged.

## Structural facts established pre-registration (categorical only — method: scaffold passes + a 1fps bar-strip montage; NO outcome values read)

- **Identity (R1):** exactly one character model throughout; ammo HUD is an "AMMO / NNN" text
  label consistent with her 6-round magazine; "Burst Skill / Star Anis" cast card observed.
  Clip ends mid-fight at timer ~01:35 (85s sample — sufficient; no end screen).
- **Game t0:** the HUD fades in already showing 02:59; t0 bounded 1.0–2.0s video time (wider
  than the usual ±0.5s — flagged; absolute fight-time is not load-bearing for this read since
  windows are internally anchored).
- **Solo cycle structure:** four solo Burst-1 casts (~t14, ~t39, ~t64.5, ~t83–84 video time),
  each followed by a ~10s stage-II hand-off countdown (the chain waiting on a nonexistent
  Burst II) then expiry back to the charging bar. Gauge is locked during the countdown (chain
  stage ≠ 0 — settled owner rulings).
- **Window map (±1s at 1fps; exact boundaries to be fixed by the 30fps trace per the
  bar-first-paint owner ruling, DECISIONS 2026-08-16):** opening fill W1 ≈ 2→14; refill
  windows W2 ≈ 27.5→39, W3 ≈ 51→64.5, W4 ≈ 77→83.5. Three complete refill windows + one
  opening window.
- **Reader path defect found and bounded:** `gauge-fill.py` WITHOUT an explicit `--bar`
  override self-calibrates onto a dark terrain edge on this footage (the first structural
  trace was invalid — all-'filling' states, spurious reset clusters). The solo burst widget
  sits top-right (~x 2470–2612, y ~488–500 in the 2622×1206 frame); the C4 record's swha
  command used exactly this form (`--bar 489:501:2474:2612`). The work step derives the exact
  `--bar` for this footage and MUST pass the maiden-ice-rose fixture-reproduction gate before
  any value is read.
- **`read-ammo.ts` cannot read her HUD** (text-label style vs the box template; 0/851 frames).
  Pull instants therefore come from the trace's credit events, cross-checked by the
  owner-primary hand-montage ammo method (bounded, the 2026-08-15 counting instrument).
  Reader extension = tooling follow-up, not this measurement's job.

**Blindness declaration:** the packet author has seen a 1fps bar-region montage (window
boundaries, countdown digits, coarse bar shapes) and the invalid terrain trace's structural
counts. NOT seen: any per-pull delta, any count-to-fill, any fill reading at measurement
resolution, any false-event quantity. The old A3 basis's committed values (medians, bounds,
105 quiet bins) are prior knowledge from the record, as they were for the C4 packet.

## Question A — per-pull gauge magnitude (U28's open half)

**Hypotheses (steady per-pull total, %/bar, at her solo decomposition
`(280×2.5 focused shot + 280 rider) × 1.06 aura` and rivals):**

- **H-model = 10.39 %/pull** — the divisor-1 model (enacted 2026-08-16 on branch
  `anis-star-gauge-divisor`; DECISIONS). The 2026-08-15 count-to-fill bound EXCLUDED this on
  the old footage; this read tests it on independent footage.
- **H-elevated ∈ [10.96, ~12.2] %/pull** — the measured-band/elevation reading (the old
  bound's allowed region; medians 11.25–11.6 LOG-tier). If confirmed, the residual above
  10.39 is real and belongs to an unmodeled mechanism (solo-side; the team-side 1.6–1.9×
  elevation is a separate thread).
- **H-legacy = 8.90 %/pull** — the pre-2026-08-16 shipped decomposition (halved rider).
  Included for completeness; already excluded once.

**Primary discriminator — pixel-free count-to-fill per window (integer-separated):** pulls
from window open (bar first paint / post-expiry zero) to bar-full,
`K = ceil((100 − baseline_rendered) / P)` with the rendered baseline read per window from the
trace (old basis: 2.2). At baseline ~2.2: **H-legacy ⇒ K=11–12, H-model ⇒ K=10,
H-elevated ⇒ K=8–9.** K=10 vs K=9 is the live discrimination (model vs elevated). The exact
per-window K-bands are computed from each window's OWN rendered baseline before the counts
are compared — pre-committed formula, not post-hoc.

**Secondary (corroboration only): per-pull medians**, n ≥ 8 clean pulls pooled across
windows, exclusions pre-committed identical to 2026-08-15 (partial-charge window-opener
excluded per window; artifact/tint spans excluded by the committed `offCurve` flags; a pull
whose credit is clipped at bar-full excluded). **Tolerance-widening guard (2026-08-15 lesson,
binding):** if 2× the restated per-pull quantization bound ≥ 0.57pp (the H-model↔H-elevated
separation), the medians branch is declared NON-DISCRIMINATING and only the counting branch
decides. Medians are then reported descriptively.

**Decision rule (pre-committed):**

- ≥2 complete refill windows yield K values all consistent with exactly ONE hypothesis's
  K-band ⇒ that hypothesis's P-range is **MEASURED on this footage** (tier: measured; n = the
  windows + pooled clean pulls). Record; NO stamp beyond the measurement (VALIDATED/REFUTED
  of engine values is a separate pass — this is a solo observable, and H-model vs H-elevated
  both leave the enacted carve-out removal's comp-level verification untouched).
- Windows disagree with each other, or K lands between bands ⇒ **INCONCLUSIVE-LOG** (record
  per-window K verbatim; no interpretation stamp).
- The opening window W1 is reported SEPARATELY (opening regime; owner ruling anchors its
  start at bar first-paint) — it corroborates but does not enter the ≥2-window rule.
- **Falsification content:** H-model predicts K=10 exactly; a clean K=9 on ≥2 windows
  falsifies H-model's solo decomposition (the enacted change stays justified by its OWN
  basis — datamine + comp pins — but the solo residual becomes a measured overshoot to file
  on U28); a clean K=10 on ≥2 windows measures AGAINST the old footage's ≥10.96 bound, which
  then needs reconciliation (footage-vs-footage, logged, no stamp this session).

## Question B — same-regime noise floor (classification-thread resolver)

Guard construction IDENTICAL to the C4 packet (committed in
`docs/probe-data/c4-noise-floor-rerun-2026-08-16.json`): bin = 1/30s at the 30fps trace,
event grouping ≤2 trace-frames, guard = 2 pre-frames + 0.3s latency + 8 post-frames around
each pull-credit instant (doubled half-width on flagged/widened pulls), quiet bins = in-window
reads outside all guards and exclusions. Thresholds and Wilson construction as committed
(1.41 / 1.5 / 1.596; z = 1.645) — reported at all three, binding threshold 1.41.

**Floors (power-CHECKED against this footage's structure, per the C4 satisfiability lesson):**

- Primary basis = THIS recording's pooled refill windows W2+W3+W4 (~31s of window time).
  Projection at the old basis's quiet density (105 bins / 11.67s ≈ 9.0 bins/s): **~250–280
  quiet bins available** vs the pre-committed **primary floor 150**. Satisfiable with ~1.7×
  margin — the check the C4 packet skipped.
- Joint pooled basis = this recording + the old A3 basis (105) vs the **pooled floor 180** —
  satisfiable even if this recording under-delivers by half.
- **Pre-committed failure branch:** if the realized quiet-bin count still misses the floor
  (e.g. the guard construction consumes more than projected), the branch returns
  **CANNOT-MEASURE** — descriptive log only, no stamp, no third re-run authorized by this
  packet.

**Output:** false-event bin rate + one-sided Wilson 95% upper bound per threshold, per window
and pooled — the input the classification thread's ranked item (2), the noise-corrected
ceiling test, needs. This packet does NOT run that ceiling test (separate pre-op, per the
judge-ranked list).

## Method (work step, after approval)

1. Frames already extracted: `/tmp/anis-star-solo-2/frames30` (2552 @ 30fps). Derive the
   `--bar` override for the top-right solo widget; run
   `scripts/probe/.venv/bin/python scripts/probe/gauge-fill.py --frames <dir> --fps 30
--calib-frame <suitable> --bar <y0:y1:x0:x1> --out <trace>`. **GATE before any value is
   used:** reproduce the maiden-ice-rose anchor fixture per the committed prelude method
   (the 2026-08-15 instrumentPrelude) — reader fails to reproduce ⇒ BASIS-BROKEN, stop.
2. Fix window boundaries from the trace (bar first-paint / zero / full instants) and check
   them against the pre-registered montage map (±1.5s tolerance) — a single disagreeing
   window is DROPPED and logged (R2); BASIS-BROKEN only if <2 refill windows survive or all
   disagree. W4 additionally carries the R3 gate.
3. Pull instants from credit events; the pull COUNT of EVERY window entering the decision
   rule is cross-checked by the owner-primary hand-montage ammo read (one batched ffmpeg
   tile per window, ≤3 tiles total; bounded — no frame hunts) per R4. Reader-only windows
   are descriptive.
4. Compute Question A per its decision rule; compute Question B per its guard + floors.
5. Artifacts: verdict-free `docs/probe-data/anis-star-solo2-gauge.json` (trace series,
   per-pull table, window map, quiet-bin table, commands), probe-runs.md append, catalog
   entry committed, harness-log entry after the 2-of-2. Constraint 9: the `--bar` override +
   any helper lands committed (extend the reader's docs/flags or a fixture; no /tmp-only
   instruments cited).

## What this plan CANNOT establish

- The team-context in-window elevation (1.6–1.9×, classification thread) — this is solo
  footage; only the solo per-pull total is measured.
- Rider structure 1×280 vs 2×140 (gauge-equivalent; popups not in scope).
- The `skillGauge` `/hitsPerShot` divisor for genuine multi-hit units (she is hitsPerShot 1
  now; `modernia` bar read remains the named probe).
- Any engine/data value — measurement-only; enactment is a separate gated pass.
- Whether the 2026-07-13 band was right — a THIRD instrument on independent footage can
  corroborate or tension it, but the old bound stays its own record.

## Premise-gate note

The load-bearing premises here are the structural facts listed above, all established THIS
session from primary sources (the scaffold manifests + the montage) and not carried from
memory; the prior-record values (8.90 / 10.39 / bounds / 105 bins / guard spec) are read from
the committed artifacts they live in (`anis-star-solo-a3-gauge-reread.json`,
`c4-noise-floor-rerun-2026-08-16.json`, DECISIONS 2026-08-16). No premise rests on chat
memory; fresh premise-verifier spawns were therefore not repeated for values re-read from
files this session (cheapness gate).
