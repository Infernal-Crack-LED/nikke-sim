# Burst-generation thread — next-session pickup (written 2026-08-14)

> **AI-facing handoff. Read this INSTEAD of re-deriving the thread.** It consolidates everything
> the 2026-08-14 sessions settled and the exact remaining steps. Authority order still applies:
> STATE.md / DECISIONS / the mechanics pair win over this doc on any conflict.

## 0. Before anything: repo state to reconcile

- **PR #118** (`measure/fill-trace` — team-HUD fill reader, engine-exact credit schedule,
  comparison tool, the measurement record, STATE registry rows) and **PR #119**
  (`fix/liberalio-charge-speed-immunity` — the `statImmunities` primitive + re-pinned audit
  guards) may still be open. If so: they merge #118-first (shared doc files), and nothing below
  starts until both are on `main`. After merge, clean up: `git worktree remove` the
  `.claude/worktrees/agent-*` trees and `../nikke-sim-wt-pr-fill-trace`, delete local branches
  `instrument/gauge-fill-team`, `instrument/gauge-credit-schedule`, `measure/fill-trace`,
  `fix/liberalio-charge-speed-immunity` once merged.
- A patch-note draft for the liberalio fix was approved-pending at session end (see chat/PR #119
  thread) — publish via `/patch-notes` if the owner approved it.

## 1. Verified facts (owner-ruled or measured — do NOT re-derive, do NOT re-open)

1. **Full Burst is EXACTLY 10s unless an ability extends/shortens it** (owner 2026-08-14,
   DECISIONS) — independently footage-confirmed at 10.13–10.22s (drain-window start →
   charging-bar paint, n=36 windows, 3 recordings).
2. **Gauge generates per HIT, only in FB-end → chain-start** (owner, pinned in CLAUDE.md).
   **Missed SG pellets generate nothing** (U40). **Gauge-rate buffs are all modeled**
   (`burstGenPct`, roster census 2026-08-14). **Kit immunities cover in-battle buffs only** —
   cube/OL gear still applies (owner 2026-08-14).
3. **The per-cycle tempo gap decomposes 93.5–97% into refill-window DURATION on all three filmed
   comps** — iron sweep (run G), T5 wind-weak, and the `liberalio`-free misc B3s (run I) —
   residual ≤0.06s (probe-runs 2026-08-14). Not Full-Burst length, not the cast ladder.
4. **The real gauge-full→FB ladder is 1.75–1.77s vs the modeled 1.867s**, with the ~0.47s the
   30f pre-B1 gap predicts before stage-1 REDISTRIBUTED between stage 3 and FB. Logged read;
   `PRE_B1_GAP_FRAMES = 30f` is frame-measured (chisato.mov 2026-07-21) and is NOT refit grounds
   without same-tier frame evidence explicitly reconciled with that measurement.
5. **The four-item generation plan (2026-08-13) is fully closed** — refill starvation, missing
   source kinds, focus columns, SG crediting all excluded. Post-liberalio-fix iron-sweep figures:
   shortfall 16.38 gauge/s, sim feeds ~59% of required (re-pinned 2026-08-14, PR #119).
6. **The fill-trace classification measurement returned CANNOT-MEASURE** on its pre-committed
   statistic (blind spot at every window start × inverted fill shapes — sim front-loads, real
   back-loads; both judges ACCEPT HIGH). The **~1.7–2.0× in-window rate ratio is LOGGED,
   suggestive, NOT a verdict** — it cannot be promoted retroactively. "Nothing banked during
   Full Burst" is hypothesis-tier ONLY (rests on the owner-ruled-unreliable low-fill read).
7. **`anis-star`'s battery-3 A3 solo fixture EXCLUDES the shipped `skillGauge` divisor** —
   measured ~10.7–11.3%/pull vs shipped 8.9%/pull (÷hitsPerShot halves her rider). Sized at ~12%
   of T5's cycle gap. Footage-gated under the U28 residual; the encoding choice propagates to
   `modernia`.

## 2. The open question, stated precisely

Real teams fill the bar in ~1.8–2.6s where the sim needs ~3.3–4.2s, with per-shot values that
are datamine-exact on solo anchors and multipliers that are measured. **WHERE does the real
fight's ~1.7–2× in-window credit rate come from?** The hypothesis classes (defined in
`2026-08-14-burst-generation-remaining-avenues.md` §hypotheses and the pre-op packet):
H-A per-hit credit larger in team than solo · H-B more hits than modeled · H-C a source with no
sim primitive · (H-D bar-threshold and H-E window-accounting are largely spent: closure
arithmetic bounds H-D, and the ladder/boundary reads landed as logged facts).

## 3. Remaining steps, in order

**Step 1 — instrument preludes (cheap lane; `verify.sh` + fixtures are the gate, no
scientific-method needed):**

- **(1a) Opening-window observable.** Does ANY gauge bank during the ~1.45–1.52s the drained FB
  bar holds the widget slot before the charging bar paints? Approach: sub-widget paint detection
  under the drain bar, or characterize the first-paint fill level against a calibrated low-fill
  target on solo footage (where truth is computable). This settles whether the real generating
  window opens at FB-end or at bar-paint, and converts the struck "nothing banked" claim into a
  measurement. Highest-value single item (named by the blind post-op judge).
- **(1b) Close the reader's flag-taxonomy leak.** 12 of 36 windows carry clean-set monotonicity
  violations (worst 91% drop — see the per-window tables in the deliverable) — an artifact class
  the nine flags miss. Find it, flag it, re-pin the team fixture. Required before any
  bar-paint-anchored rate statistic is verdict-eligible.
- **(1c) SG landed-pellet gauge fraction onto the event tap** (small engine change — protected
  path, needs owner approval; kit-literal/observability lane). Unblocks credit-schedule amounts
  on SG-seated comps, turning misc B3s (run I) into a full third arm and unblocking N2/N3/N5/
  soda-tb analyses later.

**Step 2 — the NEW classification pre-op (full `/scientific-method`).** A fresh pre-committed
rule on the `[barPaint, green-full]`-anchored statistic to classify H-A/H-B/H-C. Requirements
from the harness log (2026-08-14 entry — read it): pin EVERY endpoint/denominator/anchor in the
packet; give every control its own check (the "same relative span cancels bias" control failed
by design last time); reuse the committed replay bundles (`docs/probe-data/fill-trace-*.json`)
and instruments — the raw traces do not need re-scanning unless (1b) changes flags. Discriminating
signatures: H-A = matched event counts, scaled increment quantiles; H-B = event surplus at
modeled sizes; H-C = surplus at schedule-empty instants. Run 1a/1b first; include the third arm
if 1c landed.

**Step 3 — the `anis-star` divisor pipeline (full `/scientific-method`).** Lead with the
existing battery-3 fixture (reuse-before-derive); the premise gate decides whether the fixture
alone meets the bar or the ~3% decomposition nuance (fixture's own arithmetic lands 10.39 vs its
10.7 band floor) requires the solo re-read. Prediction to pre-register: resolving her way adds
+42–59 gauge/fight on her four comps ≈ 12% of T5's cycle gap.

**Step 4 — recording asks (owner-gated, batch via `/hand-tune-batches` conventions):** a solo
gauge-bar recording of one MG or SMG unit (no non-charge per-shot row has ever been
bar-validated; T5 seats both families — `cinderella-crystal-wave` MG, `nayuta` SMG); T1
wind-weak still has no video (screenshot only).

**Step 5 — residue ledger (findings-only, do not enact mid-sweep):**
`snow-white-heavy-arms` U11c burst-fire generation quirk (~24 hits/3s unmodeled, seats N5);
`ein` U8 0.7× team residual (N2); the stage1→2 real 33f/32f vs modeled 30f side observation
(runs AGAINST the gap); the plan doc's hand-derived "at 9.4s: 74%/61%" sensitivity pair is
labelled directional-only (does not reproduce from the published columns).

## 4. Where everything lives

| artifact                                                    | path                                                                      |
| ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| Measurement record + strikes + reconciliation               | `docs/probe-runs.md` 2026-08-14 entry                                     |
| Harness lessons (read before writing the new pre-op)        | `docs/handoffs/scientific-method-harness.md` 2026-08-14 entry             |
| Pre-op packet (method + revisions R1–R3 + risk flags)       | `docs/handoffs/2026-08-14-fill-trace-preop-packet.md`                     |
| Deliverable (per-window tables, histograms, boundary reads) | `docs/handoffs/2026-08-14-fill-trace-deliverable.md` (lands with PR #118) |
| Replay bundles (re-run analysis without the videos)         | `docs/probe-data/fill-trace-*.json`                                       |
| Team fill reader                                            | `scripts/probe/gauge-fill.py --team` (+ team fixture/vitest)              |
| Sim credit schedule                                         | `scripts/battery/fb-count-matrix.ts --credit-schedule --json`             |
| Comparison/analysis                                         | `scripts/probe/fill-trace-compare.ts` (+ 19-assertion vitest)             |
| Hypothesis classes + closed-avenue list                     | `docs/handoffs/2026-08-14-burst-generation-remaining-avenues.md`          |
| Four-item plan + post-fix annotations                       | `docs/handoffs/2026-08-13-burst-generation-investigation-plan.md`         |
| Per-comp gauge tables                                       | `docs/fb-count-matrix.md` (regenerate after any engine change)            |

## 5. Traps for the fresh session

- **Fresh worktrees:** `npm install` first (hooks + deps), and if verify fails
  `prerender-api-parity` on missing `web/public/*.json`, run
  `npm run dpschart && npm run ranks:all` — environmental, not your change.
- **Compensating errors:** if step 2 ends in boundary/timing enactments, the full measured
  timeline lands TOGETHER (standing rule) — no single-knob landing.
- **Measurement ≠ enactment:** every step above that measures, LOGS; enactment is a separate
  gated pass. The suggestive 1.7–2.0× ratio especially must not be encoded without step 2's
  verdict.
- **P0-sensitive work happens early in a fresh context** — this doc exists so the next session
  starts at step 1 without re-reading the whole thread.
