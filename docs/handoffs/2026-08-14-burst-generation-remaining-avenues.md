# Burst generation — remaining avenues after the four-item plan closed (2026-08-14)

> **AI-facing handoff.** Written from the 2026-08-14 review of the merged `audit/item4-multihit`
> branch (PR #117): all four plan items verified sound and closed (each independently re-run and
> code-audited; every headline number reproduced), plus a roster-wide census that closed one more
> candidate class. Owner rulings landed the same day: **a missed SG pellet generates NO gauge**
> (U40) and **Full Burst is EXACTLY 10s unless an ability extends or shortens it** (both in
> DECISIONS 2026-08-14). Predecessor:
> [closed/2026-08-13-burst-generation-investigation-plan.md](closed/2026-08-13-burst-generation-investigation-plan.md).

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
2. **The `anis-star` `skillGauge` divisor — ENACTED 2026-08-16 (DECISIONS: carve-out
   removed via `/scientific-method`, 2-of-2 ACCEPT HIGH).** Delivered the sized ~12% of T5's
   cycle gap (T5 11/12-mix → 12×100%, shortfall 26.0 → 22.7 gauge/s; every enabled measured FB
   pin byte-identical). The solo magnitude residual (10.39 vs ≥ ~10.96 exclusion) stays open
   (U28), footage-gated; note the
   fixture's own decomposition lands ~3% under its band floor, so the pipeline may still want the
   solo re-read. The encoding choice (divisor 1 vs per-impact procs) propagates to `modernia` —
   engine semantics, not a one-unit tweak.
3. ~~**Bar-validate one non-charge weapon family (recording ask — needs new footage).**~~ **DONE
   2026-08-15** — owner delivered `docs/probes/solo/ccw-solo.mov` + `nayuta-solo.mov`; BOTH rows
   bar-validated (`nayuta` SMG datamined 20: 0.220 raw %/shot ≈ 0.207 bias-adjusted;
   `cinderella-crystal-wave` MG class-modal 10: 0.109 raw ≈ 0.103; cadence side-results: SMG
   19.95/s off the ammo counter, MG terminal 60.1/s off her fillGauge proc snaps). Full record:
   `docs/probe-runs.md` 2026-08-15 solo-reads entry. AR and SG families remain never-bar-checked;
   the team-seated read (H-A sizing) was not part of the delivered footage.
4. **`liberalio` charge-speed-effect immunity — CHECKED 2026-08-14: LIVE defect in iron sweep
   (run G), inert in his other three seated comps.** His skill2 is kit-literal ("Immunity to
   Increase/Decrease Charge Speed effects, continuous"); the override already documents that only
   his own-buff case is enforced (`excludeSelf`) and **no receiving-side immunity primitive
   exists** — `sim.ts`'s charge-time formula sums every active `chargeSpeedPct` unconditionally.
   In iron sweep, `maxwell`'s skill1 (+4.48% charge speed to top-2 static-ATK allies on
   `fullBurstEnter`) reaches him (confirmed via `DBG_BUFFS`), and an A/B with it zeroed moves him
   94→92 pulls, 518.9M→494.8M damage — the sim over-credits him ~4.9%, and his sim/real ratio
   would improve 1.071 → 1.021 if the immunity were enforced. Team FB count unchanged (11 both
   arms). **Direction note: this runs AGAINST the generation shortfall** — enforcing it lowers
   sim generation slightly, so it cannot be part of the missing ~39%. Enactment (a receiving-side
   immunity primitive, engine + schema) is kit-literal → encode + `/code-review` lane, on a
   worktree, **awaiting owner approval** (proposed in QUEUE).
5. **`snow-white-heavy-arms` U11c burst-fire quirk** — **MEASURED 2026-08-15**
   (`docs/probes/solo/swha-solo.mov`, same probe-runs entry): the volley generates gauge **per
   HIT** (~560 each; bar 0→full in 3.2s on ~3 pulls — per-effect credit caps at 75.6, refuted by
   closure), not per proc. The engine credits once per flatDamage EFFECT (`sim.ts:2751`), an
   under-credit of **22.4% of bar per pull**. No longer a "~24 hits/3s" annotation — now a
   quantified enactment candidate (owner-gated engine touch: per-sub-hit gauge on multi-hit
   riders, a roster-wide candidate class the census was blind to). Stated team bound: naive
   enactment moves N5 11 → ~13 vs **12 measured**.
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
