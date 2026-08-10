# 2026-08-10 — Gauge-economy measurement pass (faithfulness phase 2d, FINDINGS-ONLY)

> Owner-approved scope: measurement/instruments only, STOP before any constant changes. The
> eventual fix is ONE batched `/scientific-method` pass over the whole cluster — the correction
> directions interact (compensating-errors rule), so nothing here lands piecemeal.

## What was measured

1. **U28 (extraHitDamagePct emits no gauge vs flatDamage's per-proc `skillGauge`) — BOUNDED.**
   New committed instrument `scripts/battery/u28-gauge-ab.ts`: each carrier's rider converted
   in-memory to a PERMANENT per-pull `flatDamage` — a deliberate gauge-emission exaggeration
   (window gating dropped, so it over-emits by ~1/uptime). Result: **zero full-burst-count
   movement on all four carriers** (modernia 10=10, nayuta 5=5, neon-blue-ocean 11=11,
   neon-vision-eye 13=13) in the control-comp shape. Since the exaggerated arm cannot move FB
   counts there, the true asymmetry cannot either — in that shape. ⚑ The refill-bound charge-B3
   comps (the tempo thread's 4 disabled comps) are where gauge deltas bind; re-run the arm there
   before generalizing. The encoding asymmetry itself remains real (gauge-truthfulness), just
   not FB-visible in support-core comps.

2. **The charge-B3 fill-tempo gap — NOT re-measured here; the 2026-08-03 `/scientific-method`
   record stands** (`docs/handoffs/scientific-method-harness.md`; instrument `decomposeCycles()`
   pinned by `scripts/tests/gauge-cycle-decomp.test.ts`; the 2026-08-04 owner ruling resolved
   the video-offset question and flipped `ROTMODEL=refill`). Invocation caveat hit in this pass:
   `DECOMP=1` prints only on the deterministic report path — under the MC (`n=25`) comps it is
   silent; use the pinned test's fixtures or a seedless single run when refreshing numbers.

3. **The "skillGauge fires twice per shot on shotFired-triggered flatDamage riders" log entry
   (QUEUE, from the 2026-08-03 pass) — NOT REPRODUCED BY INSPECTION in this pass, and not
   re-derived.** The visible call sites are one weapon-path `shotGauge` per pull plus one
   `skillGauge` per rider proc, which is the DOCUMENTED intended behavior (burst-gauge SSOT).
   The 2026-08-03 log remains the finding of record; its dedicated pre-op must first REPRODUCE
   the double-emit (event-log gauge decomposition on one carrier) before any correction —
   correcting an unreproduced defect is how a compensating error gets planted.

4. **Theme 20 data quality (`gauge-per-shot.json` `fullChargeBonus` vs
   `characters.json.chargeMultiplier`) — unchanged from the engine-modeling-gaps §20 record:**
   6/44 SR/RL rows synthesized class-modals, 4 units (belorta, n102, yan, yuni) with
   `chargeMultiplier: 350` and no gauge row (the `?? 250` fallback under-fills them), `raven`
   one live disagreement (250 vs 0). Suggested fix unchanged: source from
   `characters.json.chargeMultiplier` with the gauge row as an explicit override, + a validator
   lint on new SR/RL overrides.

## The batched proposal (owner gate, one dedicated pass)

A single `/scientific-method` pass scoped to burst-gauge generation, bundling: (a) the
charge-B3 fill-tempo channel (success criterion: the 4 disabled comps' measured FB counts,
re-enabled); (b) reproduce-then-fix the double-emit log entry; (c) the U28 encoding fix (both
rider encodings emit identically), re-bounded in the charge-B3 shape first; (d) the theme-20
sourcing fix + lint. Land together, A/B the FULL measured timeline per the compensating-errors
rule — the directions partially cancel (double-emit correction is gauge-DOWN, U28 is gauge-UP,
tempo is comp-dependent).
