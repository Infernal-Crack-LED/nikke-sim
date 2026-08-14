# Charge-B3 gauge-fill-tempo gap — MEASURED 2026-08-13, one question left

> **Status 2026-08-13 (second update).** The `/scientific-method` pass ran. **The tempo gap is real
> and measured**; what remains is a single small follow-up measurement, tracked in
> [QUEUE.md](QUEUE.md) item 2. Full record: `docs/probe-runs.md` (2026-08-13 entry) + the decision-log
> entry in `scientific-method-harness.md`. Packet and deliverable:
> `2026-08-13-tempo-gap-preop-packet.md`, `2026-08-13-tempo-gap-deliverable.md`.

## What the pass established

- The real burst cycle is **1.662s (iron sweep run G) / 1.649s (T5 wind-weak) per cycle FASTER** than
  the sim. Two recordings, two teams, two boss elements; robust across three detection spines and two
  sampling rates. MEASURED.
- **The burst chain is EXONERATED.** Real stage1→FB ladder is 1.383–1.400s against the engine's
  30f+30f+22f = 82f = 1.3667s — within 1–2 frames, and if anything longer.
- ⇒ **100% of the gap sits in the FB-start → next-stage-1 span** (`FB duration + refill + pre-B1`).
- **Attribution inside that span is UNRESOLVED** and that is the honest result. FB-end and gauge-full
  are both unrendered, so the span is indivisible. The refill error is a RANGE — iron [0.529, 1.662],
  T5 [0.516, 1.649] s/cycle — never a point value.
- ⛔ Nothing enacted. Decision **LOG** (2-of-2 ACCEPT, both MEDIUM).

## The one open question

**Is the real Full Burst actually 10s?** The guard-corrected duration lower bound is ≥8.87s, which
leaves only 0.40–0.53s of the gap unexplained by a shorter-than-modeled Full Burst — below the pass's
pre-committed 0.6s margin. One clean read of the real FB duration, off a visual that does NOT share
the drain bar's under-render (the FB screen border / cut-in vignette, or a buff-icon timer), settles
it: **"≈10s" converts the whole thing to H1 CONFIRMED on the already-measured gap.** Recipe and
scope live in QUEUE.md item 2.

## ⚑ METHOD WARNING — do not measure the FB-END edge

The original brief asked for an **FB-end → next-B1** read. **That edge is not measurable and the
attempt would return a confident wrong number.** The burst bar's last ~1.5s is too narrow to render,
so a nominal 10s Full Burst reads 8.2–9.4s, biased early by a **non-constant** 1.2–1.8s — larger than
the ~1.65s effect being hunted. `scan.ts:343-346` says so in the source. What IS frame-accurate:
**FB-START** and the **stage-1/2/3 cast ladder**, which is what the pass measured instead.

## Instruments (committed, fixture-pinned)

- `scripts/probe/scan.ts --fps 60 --cycle-table` + `scripts/probe/cycle-table.ts` — per-cycle periods,
  ladder spans, and the two guards (3a late-start rejection, 3b tail-stitch rejection). Pinned by
  `scripts/tests/probe/cycle-table.test.ts` against committed frame traces in
  `docs/probe-data/tempo-cycle-*.json`, so it runs without the gitignored recordings.
- `DECOMP=1 SEEDS=1 ONLY=… [SLUGS=…] npx tsx scripts/experiment.ts` — the sim arm. ⚑ `DECOMP=1` is
  SILENT under Monte Carlo; `SEEDS=1` is required. `SLUGS=` overrides a comp's roster in slot order.
- Footage (main tree only — `docs/probes/` is gitignored, a worktree has none):
  `docs/probes/u8/u8 g vid.mov`, `docs/probes/probe u7/13 fb count wind weak vid.MP4`.

## Two scanner defects found (corrected in `cycle-table.ts`, NOT in the worker)

Changing `scan-frames.py` itself would move the full-burst counts it is 8/8-validated on.

- **Late start, 10 of 26 cycles.** The burst cut-in occludes the HUD ~0.4s after the bar renders; if
  the last pre-occlusion frame has decayed, `RESET_JUMP` trips and the window restarts ~0.417s late.
- **Tail stitching, 3 of 26 windows.** `GAP_TOL=1.0s` welds isolated post-FB false positives onto a
  window tail (+0.55–0.88s). ⚑ **This one decided the verdict** — without guard 3b the bound reads
  9.40s and the pass would have landed H1 CONFIRMED.

## Traps this thread has sprung (all still live)

- **`liberalio` is perfectly confounded** — it is in all four disabled comps and **zero** passing
  comps, so co-occurrence is a lead, not a localization. The shortfall class also hits liberalio-free
  comps (`misc B3s (run I order)`, sim 12 vs measured 13).
- **`iron sweep (run G)` mixes two recordings** — damage basis from run 1, FB-count basis from a
  re-run with a **different slot order** (footage middle slot = `maxwell`, the comp's =
  `milk-blooming-bunny`). Immaterial to rotation (11 FBs either way), material to any damage claim.
- **Exact slugs:** `d-killer-wife` (SR/Fire) is NOT `d` (SMG/Wind) — only the latter carries
  `fullBurstExtend`. Reasoning from the base name puts a wrong 15s Full Burst in the floor.
- **Video time ≠ fight time.** Anchor to the 03:00→02:59 frame; pre-timer footage is a LOAD SCREEN.
  The pass sidestepped this entirely by measuring only within-video differences.
- **Judge a rotation change by MEASURED FB COUNTS**, not the aggregate board ratio.

## Closed 2026-08-13 — do not reopen without new evidence

Full reasoning: `docs/DECISIONS.md`, "THE BURST-GAUGE ECONOMY CLUSTER" (2026-08-13).

- **U28 rider-encoding asymmetry — ENCODED.** `extraHitDamagePct` now emits `skillGauge` per impact
  like an equivalent `flatDamage` rider. Board movement zero BY MECHANISM.
- **"skillGauge fires twice per shot" (2026-08-03) — NOT A DEFECT.** One `shotGauge` + one
  `skillGauge` per pull is exactly what the `maiden-ice-rose` anchor measures.
- **Theme 20 (`fullChargeBonus` sourcing) — landed 2026-08-08 in `ccee21f7`.**
- **burstCdr phase / `liberalio` trigger-count semantics — REFUTED as the mechanism** (2026-08-03).
