# Burst generation — remaining avenues after the four-item plan closed (2026-08-14)

> **AI-facing handoff.** Written from the 2026-08-14 review of the merged `audit/item4-multihit`
> branch (PR #117): all four plan items verified sound and closed (each independently re-run and
> code-audited; every headline number reproduced), plus a roster-wide census that closed one more
> candidate class. Owner rulings landed the same day: **a missed SG pellet generates NO gauge**
> (U40) and **Full Burst is EXACTLY 10s unless an ability extends or shortens it** (both in
> DECISIONS 2026-08-14). Predecessor:
> [2026-08-13-burst-generation-investigation-plan.md](2026-08-13-burst-generation-investigation-plan.md).

## Where the thread stands

With Full Burst pinned at 10s and the chain ladder footage-exonerated, the filmed-cycle conversion
is un-hedged: **the sim feeds the bar 61% (iron sweep run G) / 50% (T5 wind-weak) of what the real
fights require, and all of it is burst generation** (`docs/fb-count-matrix.md`).

**The central contradiction — read this before picking an avenue.** Iron sweep (run G) is five SR
units (`d-killer-wife`, `milk-blooming-bunny`, `maxwell`, `takina`, `liberalio`) whose per-shot
gauge values match the datamine against two solo bar anchors, whose focused (×2.5) and unfocused
(×1.0) charge multipliers are both MEASURED (2026-07-13 A1/A2 battery), and which carry **zero
burst-gauge kit lines** (roster census below) — yet the real fight generates ~38.6 gauge/s where
those same measured values produce 23.7. There is no measured-value-respecting arithmetic that
closes a +63% gap on that comp. Therefore either **a settled premise breaks in TEAM context**, or
**a source with no sim primitive exists** (the item-2 census enumerates the sim's own effect-kind
universe and is structurally blind to that class).

Hypothesis classes the next measurement must discriminate:

- **H-A (per-hit credit is larger in team than solo).** Both bar anchors are SOLO recordings; a
  team-context scaling of the per-shot table would be invisible to them and to every existing
  check. Fill-trace signature: the same step CADENCE as the sim but larger step SIZES.
- **H-B (more hits than the sim models in the window).** Cadence/uptime fidelity — charge-time
  buff uptime in the refill window, reload modeling, auto-play behavior. Signature: more steps
  than the sim's hit schedule, ordinary sizes.
- **H-C (an unmodeled source class).** Signature: steps with no counterpart in the sim's per-frame
  hit schedule (e.g. at buff-refresh instants — the `_trick_` non-damage-application rule's upper
  bound rides those).
- **H-D (the bar needs less than "100" in team context).** Signature: the trace visibly reaches
  full early, or the chain opens at a sub-full render level.

## Ranked avenues

1. **⇒ PRIMARY, unblocked, no new footage: read the refill-window FILL-TRACE on the two existing
   recordings** (iron sweep run G, T5 wind-weak — the same files the tempo-gap pass scanned).
   `scripts/probe/scan.ts` already extracts gauge-bar fill traces to find window boundaries; this
   read uses the trace VALUES inside each refill window: real generation rate in gauge/s, plus the
   step structure that separates H-A/H-B/H-C/H-D above. One measurement, four hypothesis classes.
   **In flight 2026-08-14 via `/scientific-method`.** Known confound to premise-check first: the
   bar's under-render (the drain-side defects found 2026-08-13) and the bar-render calibration's
   validity on the fill side.
2. **The `anis-star` `skillGauge` divisor (U28 residual) — the one candidate with an existing
   labeled fixture that EXCLUDES the shipped value.** Shipped 8.9%/pull vs her battery-3 A3 solo
   measured ~10.7–11.3%; sized at ~12% of T5's cycle gap (+42–59 gauge/fight on her four comps).
   `/scientific-method`, leading with the existing fixture (reuse-before-derive); note the
   fixture's own decomposition lands ~3% under its band floor, so the pipeline may still want the
   solo re-read. The encoding choice (divisor 1 vs per-impact procs) propagates to `modernia` —
   engine semantics, not a one-unit tweak.
3. **Bar-validate one non-charge weapon family (recording ask — needs new footage).** Both solo
   gauge anchors are charge weapons; no MG/SMG/AR/SG per-shot row has ever been checked against a
   bar. T5 seats two unvalidated families (`cinderella-crystal-wave` MG, `nayuta` SMG). One solo
   gauge-bar recording of an MG or SMG unit validates a whole family — and if H-A is real, a
   TEAM-seated bar read of the same unit sizes the team scaling directly.
4. **`liberalio` charge-speed-effect immunity (cheap code check, in flight 2026-08-14).** His S2
   grants "immunity to Increase/Decrease Charge Speed effects"; he seats BOTH filmed comps plus
   T1 and N3. If the sim applies a team charge-speed buff to his cadence that the game blocks (or
   the reverse), his gauge/s and damage both move. Findings-only check of override + engine
   plumbing.
5. **`snow-white-heavy-arms` U11c burst-fire quirk** — ~24 generating hits per 3s, documented
   unmodeled (`docs/data/burst-gauge.md` §2), seated in off-count N5. Not a filmed-comp mover but
   a known missing generation source on the off-count list; keep it on the residue ledger.
6. **stage1→stage2 real 33f/32f vs modeled 30f** (`STAGE_CAST_GAP_FRAMES`) — runs AGAINST the gap
   so it never inflated the finding; worth one measurement before anyone touches the constant.

## Closed — do not re-open without new evidence

- The four plan items: refill starvation (window is front-loaded), non-bullet source census
  (clean for comp movers), focus columns (all seated columns measured; ceiling ≤22%), SG
  multi-hit crediting (per-landed confirmed by owner ruling U40; the per-trigger CEILING moves
  zero FB counts anywhere).
- **Gauge-rate buffs** (closed 2026-08-14 by roster census): the engine's `burstGenPct` primitive
  is applied correctly inside the generating window; all 9 kit carriers of "Burst Gauge filling
  speed ▲" are modeled and test-pinned (`anis-star` +6%, `grave`, `alice-wonderland-bunny`,
  `label`, `mana`, `mica-snow-buddy`, `neon-vision-eye`, `rupee-winter-shopper`, `sin`); the
  one-shot `fillGauge` carriers seated in comps are modeled; iron sweep carries zero gauge kit
  lines of any kind. Cubes are excluded by scope lock and no burst-gauge cube exists in
  `data/cubes.json` anyway.
- **The real-FB-duration read** (owner ruling: exactly 10s unless ability-modified).

## Instrument hygiene from the branch review (small, non-blocking)

- `GAUGE_KIND_CENSUS` basis strings + census header in `scripts/battery/fb-count-matrix.ts` cite
  `sim.ts` line anchors that went stale (~15–25 lines off) during the branch's own later commits.
- The "31-comp EV board: 0 FB movers" claim in DECISIONS/plan rides on an ad-hoc re-run (the
  committed pin covers the 11-comp panel); either commit the arm-diff driver as a flag or reword
  the citation.
- `auditFocusColumns` mirrors the engine's unexported `PENDING_TEAM_ISOLATION` set
  (`PENDING_TEAM_ISOLATION_MIRROR`) — nothing trips if they diverge; consider exporting the set
  or pinning the mirror against the engine source text.
