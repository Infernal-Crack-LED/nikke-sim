# Gauge-economy cluster — ONE item left: the charge-B3 fill-tempo gap

> **Status 2026-08-13.** Opened 2026-08-10 as a findings-only measurement pass that ended in a
> batched proposal: land four interacting corrections together under `/scientific-method`, because
> their directions partially cancel. Picking that up, **three of the four were not open work** — two
> were already answered, one had already landed. They closed the same day without a pipeline
> (DECISIONS 2026-08-13, burst-gauge economy cluster). What is left is item (a), the only genuine
> unknown, and the bundling constraint is gone with it: the only gauge-DOWN direction turned out not
> to exist, so there is nothing left to cancel against.

## The one live item — charge-B3 gauge-fill-tempo gap

**Not re-measured since the 2026-08-03 `/scientific-method` record, which stands** (LOG verdict,
2-of-2 ACCEPT at MEDIUM/MEDIUM; `docs/handoffs/scientific-method-harness.md`). Verdict there: a
general, board-wide charge-B3 gauge-fill-tempo gap — NOT `liberalio`-specific, NOT a narrow fix.
It is what keeps four comps disabled in `scripts/regression.ts` (iron sweep run G, T5 wind-weak,
T1 wind-weak, N3 scarlet/liberalio iron), each under-counting measured full bursts by 1–2.

- **Success criterion:** those four comps' measured FB counts, re-enabled.
- **The step that lifts MEDIUM → HIGH, already named by that record:** frame-measure the real
  FB-end → next-B1 gap on ONE disabled comp's footage — the disputed segment itself, not a
  downstream proxy. `docs/probes/u8/u8 g vid.mov` is "iron sweep run G" and is on disk, so this is
  not footage-gated.
- **Instrument:** `decomposeCycles()` in `scripts/experiment.ts` (CLI `DECOMP=1`), pinned by
  `scripts/tests/gauge-cycle-decomp.test.ts`. Invocation caveat: `DECOMP=1` prints only on the
  deterministic report path — under the MC (`n=25`) comps it is silent, so use the pinned test's
  fixtures or a seedless single run when refreshing numbers.
- **ROTMODEL flip already accounted for:** the 2026-08-04 owner ruling removed the post-FB
  chain-open lock and the decomposition floor dropped the dead +2.5s term, so `excess` now reads
  refill-from-zero directly (~2.5–4.7s across the six comps). The LOG verdict survived that flip.

## Closed 2026-08-13 (do not re-open without new evidence)

- **U28 rider-encoding asymmetry — ENCODED.** `extraHitDamagePct` now emits `skillGauge` per impact,
  like an equivalent `flatDamage` rider. Answered, not measured: `docs/data/burst-gauge.md` §5 plus
  the `maiden-ice-rose` solo anchor (12.55%/pull = 910 weapon + 364 rider). Board movement zero —
  `scripts/battery/u28-gauge-ab.ts --lock-census` shows the ≤10s riders (`nayuta`,
  `neon-vision-eye`, `neon-blue-ocean`) sit inside the chain+FB gauge lock by mechanism and
  `modernia`'s 15s by measurement only. **This also answers the 2026-08-10 "re-run the arm in the
  refill-bound charge-B3 shape before generalizing" caveat:** T5 wind-weak (`nayuta`) is 55/55
  locked, and the other three disabled comps seat no `extraHitDamagePct` carrier at all — so U28 is
  not part of their shortfall.
- **The "skillGauge fires twice per shot" log entry (2026-08-03) — NOT A DEFECT.** One `shotGauge`
  (weapon) plus one `skillGauge` (rider) per pull is exactly what the `maiden-ice-rose` anchor
  measures, and her rider IS a `shotFired` → `flatDamage` block. The 2026-08-10 pass had already
  failed to reproduce it by inspection; what was missing was the link to the existing measurement.
- **Theme 20 (`fullChargeBonus` sourcing) — landed 2026-08-08 in `ccee21f7`**, with
  `scripts/tests/data/gauge-per-shot-source.test.ts` as the lint. It carried no DECISIONS entry, so
  `docs/engine-modeling-gaps.md` §20 and this handoff both still called it "not yet done" three days
  later. §20 now records it as fixed.
