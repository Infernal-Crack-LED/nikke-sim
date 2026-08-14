# Charge-B3 gauge-fill-tempo gap — the one live item, ready for its `/scientific-method` pass

> **Status 2026-08-13.** This was a four-item bundle ("land together, the directions cancel"). Three
> items were not open work and closed the same day (§ Closed below, do not reopen). **What remains is
> ONE item and it no longer needs bundling** — the only gauge-DOWN direction turned out not to exist,
> so there is nothing left to cancel against. It is unblocked: the footage is on disk and the
> instrument is committed and fixture-pinned. It wants `/scientific-method` because the answer is
> genuinely unknown, not because the code is hard.

## Verified facts (re-derived 2026-08-13 — do not re-derive, but DO run the premise gate on §Premises)

- The gap is **general and board-wide**, not `liberalio`-specific and not a narrow fix. That is the
  2026-08-03 `/scientific-method` LOG verdict (2-of-2 ACCEPT, both MEDIUM), recorded in
  `docs/handoffs/scientific-method-harness.md`. It stands.
- It is what keeps **four comps `disabled: true` in `scripts/regression.ts`**, each under-counting
  measured full bursts by 1–2: `iron sweep (run G)` (sim 11 vs measured 13–14), `T5 wind-weak`
  (11–12 vs 13), `T1 wind-weak` (11–12 vs 13), `N3 scarlet/liberalio iron` (9 vs 10).
- **Root cause of the exposure, already settled:** commit `c12fcf4e` (2026-07-26) correctly fixed
  `liberalio`'s 6×-inflated burst-gauge datamine, which UNMASKED a pre-existing shortfall her old
  value had papered over. She is the only unit common to all four comps. The fix was right; the
  shortfall it revealed is the open thing.
- **Already tested and REFUTED as the mechanism** (do not re-run these): the burstCdr-proc /
  FB-window-phase theory (`case 'burstCdr'` applies unconditionally; a bounding A/B stripping
  `d-killer-wife`'s and `rouge`'s burstCdr took iron sweep run G 11→9, i.e. the mechanism is real and
  net-POSITIVE), and `liberalio` trigger-count semantics (H0c — `DBG_GAUGE` showed 1:1 with her
  `hitsPerShot=1` datamine).
- **The 2026-08-04 ROTMODEL flip is already absorbed.** There is no post-FB chain-open lock; the
  decomposition floor dropped the dead +2.5s term and now reads refill-from-zero directly
  (~2.5–4.7s across six comps). The LOG verdict survived that flip.
- **U28 is DONE and is not part of this** — the gauge asymmetry it described cannot be the shortfall:
  three of the four disabled comps seat no `extraHitDamagePct` carrier at all, and the fourth
  (T5 / `nayuta`) censuses 55/55 emissions gauge-locked.

## The one live item

**Success criterion (pre-committed):** the four disabled comps' MEASURED full-burst counts, with
`disabled: true` removed from `scripts/regression.ts`. Measured truth is never edited to fit.

**The step that lifts MEDIUM → HIGH, named by the 2026-08-03 record itself:** frame-measure the real
**FB-end → next-B1 gap** on ONE disabled comp's footage — the disputed segment directly, not a
downstream proxy. The sim's own claim to falsify is `excess` ≈ 2.5–4.7s of refill-from-zero per cycle.

**What would be sufficient** (state it now so the question is decidable rather than open-ended): one
disabled comp's footage, FB-end → next-B1 read at frame accuracy across every cycle in the fight
(n≈10–13 cycles, not a single cycle), compared against that comp's `decomposeCycles()` excess. If the
real gap matches the sim's, the tempo model is exonerated and the shortfall is elsewhere (that is a
real result — log it, do not go hunting for a second theory in the same pass). If it is consistently
shorter, the gauge-generation rate during refill is the lever.

## How to run it

- **Footage: `docs/probes/u8/u8 g vid.mov` + `u8 g dmg.png` = "iron sweep run G".** ⚑ `docs/probes/`
  is GITIGNORED, so it exists only in the **main tree** (`/Users/maxwellsutton/nikke-sim/docs/probes/`)
  — a fresh worktree has no `docs/probes/` directory at all. Process it from the main tree, or point
  the reader scripts at an absolute path.
- ⚑ **That comp's video read is genuinely ambiguous (13–14).** Its regression entry pins the certain
  low end. Do not let the ambiguity silently become the finding — read the FB-end→B1 GAPS, which is
  the disputed quantity, rather than re-litigating the count.
- **Instrument (committed, fixture-pinned): `decomposeCycles()` in `scripts/experiment.ts`**, CLI via
  `DECOMP=1`, pinned by `scripts/tests/gauge-cycle-decomp.test.ts` (6 comps; the guarded invariant is
  the H0b-band RELATIONSHIP between N6 and the disabled comps, not raw numbers).
  Sample: `DECOMP=1 SEEDS=1 ONLY="N6 mihara/maiden wind" npx tsx scripts/experiment.ts` →
  `[decomp] fbDur=10.00s chain=1.40s floor=11.90s observed=16.57s excess=4.67s/cycle`.
- ⚑ **`DECOMP=1` prints only on the deterministic report path** — under the MC (`n=25`) comps it is
  SILENT. Use `SEEDS=1` or the pinned test's fixtures when refreshing numbers.
- Processing the recording: `/probe-processing` (the `probe-scaffold` agent runs the readers; this
  session's Opus confirms the load-bearing values — the split matters here, a VLM must not be trusted
  for FB counts).

## Premises to re-derive at step 0 (fresh-context `premise-verifier`, blind, one each)

The premise gate exists because premise drift is the documented failure mode. Candidates, in priority
order — each is load-bearing and each has a specific way of being stale:

1. **"The four comps' `realFullBursts` are the measured truth as recorded."** Verify against the probe
   files themselves, not the regression comments. `iron sweep run G`'s own comment concedes a 13–14
   ambiguity.
2. **"`N6 mihara/maiden wind` is a valid PASSING baseline."** The 2026-08-03 record capped its own
   confidence partly on this: N6 passes today because it has ~2 cycles of slack, NOT because its
   2.24s/cycle (now 4.67s under the corrected floor) excess is correct.
3. **"`decomposeCycles()`'s floor is right post-ROTMODEL-flip"** — i.e. FB-duration + 0.5s pre-B1 +
   chain span, with no post-FB term. ⚑ And per the 2026-08-13 U28 lesson, check the floor's FB term
   against each comp's OWN Full Burst length rather than a nominal 10s. The `fullBurstExtend` carriers
   are `d`, `isabel`, `mihara`, `modernia`, `soda-twinkling-bunny`, `vesti` (base slugs — NOT
   `mihara-bonding-chain`, which does not extend). Checked against the comps in play: **the only one
   affected is `N3 scarlet/liberalio iron`, via `soda-twinkling-bunny`** — and N3 is one of the four
   DISABLED comps, so a floor hardcoding 10s would misprice a cycle there by up to the extension.
   The `N6` baseline and the other three disabled comps seat no extender, so their floors are safe on
   this axis. (This item is here because the first draft of this handoff claimed `mihara` was in N6 —
   it is `mihara-bonding-chain`, a different unit. Exactly the base/variant conflation that makes a
   premise gate worth running.)
4. **"`liberalio` is the only unit common to all four disabled comps."** Cheap to re-check; it is the
   premise the whole "unmasked, not caused" framing rests on.

## Traps this thread has already sprung on someone

- **Video time ≠ fight time.** Anchor to the exact 03:00→02:59 frame; the pre-timer footage is a LOAD
  SCREEN, not human startup lag. An off-by-one-second anchor is roughly a whole Full Burst, and the
  2026-08-04 ruling that overturned the post-FB chain delay turned on exactly this confound.
- **Judge a rotation change by MEASURED FB COUNTS on the graded comps, not the aggregate board
  ratio.** Ratio regressions from a rotation fix are usually fit-exposure (overrides tuned against the
  buggy rotation) — re-tune those units separately, never re-fudge the rotation to protect a ratio.
- **Reason about a carrier against ITS OWN cast** — burst stage and `fullBurstExtend` both break the
  nominal "10s FB opened by a stage-3 cast" picture. This cost two wrong claims on 2026-08-13.
- **Ratio direction:** board tools print sim/real (>1 HOT); solo recons print realOverSim (>1 COLD).
  Opposite conventions.

## Closed 2026-08-13 — do not reopen without new evidence

Full reasoning: `docs/DECISIONS.md`, "THE BURST-GAUGE ECONOMY CLUSTER" (2026-08-13).

- **U28 rider-encoding asymmetry — ENCODED.** `extraHitDamagePct` now emits `skillGauge` per impact
  like an equivalent `flatDamage` rider. Answered question (`burst-gauge.md` §5 + the
  `maiden-ice-rose` solo anchor), so it skipped the pipeline per the 2026-08-11 owner ruling and went
  through `/code-review` instead. Board movement zero BY MECHANISM — every carrier's rider window
  closes inside the Full Burst its own cast opens (`modernia` against her own `fullBurstExtend: 5`),
  censused by `scripts/battery/u28-gauge-ab.ts --lock-census`.
- **"skillGauge fires twice per shot" (2026-08-03) — NOT A DEFECT.** One `shotGauge` + one
  `skillGauge` per pull is exactly what the `maiden-ice-rose` anchor measures (12.55%/pull = 910
  weapon + 364 rider) and her rider IS a `shotFired` → `flatDamage` block.
- **Theme 20 (`fullChargeBonus` sourcing) — landed 2026-08-08 in `ccee21f7`**, lint included
  (`scripts/tests/data/gauge-per-shot-source.test.ts`). It carried no DECISIONS entry, which is why
  two docs still called it open three days later.
