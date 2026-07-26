# Full-sweep plan — control-only → all owned units stable (±3% @ n≥5), fewest videos

Goal: move from "only the control anchors are ±3% at n≥5" to "every OWNED unit is within ±3% (per-unit,
on multi-run averages) with n≥5 real datapoints", using the **least number of recordings**.

## Definition of done

- Per owned unit: mean sim-vs-real within ±3% AND ≥5 real datapoints (recordings the unit appears in).
- Dashboard: `npx tsx scripts/board-read.ts` (per-unit ratio, N, MAD, ranked). Done = every owned unit in
  the "±3% ✓" band with N≥5. (Current: 4 units ±3% MAD, 9 within ±5%, 122 datapoints/44 units.)

## Roster + N refinements (owner, 2026-07-16)

- **NOT owned — exclude from the sweep: zwei, mari, mana** (in addition to the standing unowned set:
  exia, miranda, ludmilla-winter-owner, sakura-bloom-in-summer, asuka, asuka-wille).
- **Not site-supported ⇒ NOT a sweep target.** **tia: EXCLUDED entirely.** **red-hood: included as a B3
  ONLY** (her Λ flexible slot used in the B3 role — the solo-B1/B2 shape is the un-supported part, so never
  sweep/anchor her as a lone B1/B2).
- **N strategy: BREADTH-FIRST.** Aim the board for **N≥3 everywhere first**, THEN close out N4/N5 with teams
  built for MAXIMUM unit VARIETY (pack each late video with different still-under-N units). So early videos
  maximize NEW-unit coverage (first datapoints for as many units as possible); the fill-to-5 pass is a
  smaller, variety-optimized set at the end. N≥5 @ ±3% is the final bar.

## Two efficiency levers (the whole plan hangs on these)

1. **Fix SHARED-MECHANIC clusters first — they unblock many units from EXISTING footage (≈0 new videos).**
   A single engine/model fix can move a dozen units at once. These are pure leverage: do them before any
   new recording, because they change what "stable" even means for whole weapon classes.
2. **Amortize N via anchor-rotation.** Each video = 1 focused deep-read (for tuning) + 5 end-screen totals
   (=1 datapoint for each of the 5 units). Keep every newly-stable unit in the team as an off-burst anchor
   so its N climbs for free while new units take the focus slot. Most units then reach N≥5 as a BYPRODUCT
   of being a teammate, needing only ~1–2 FOCUSED videos of their own.

## TIER 0 — shared engine/model fixes (reuse existing recordings; unblock clusters)

Do these first. Each is "fix once, unblock many," and each mostly reuses footage we already have.

- **SG core-band CONFIRMATION (corrected premise, owner 2026-07-16).** The SG core bands are NOT
  HR-contaminated: they were counter-derived from noir/drake SOLO recordings, and both units' Hit Rate is
  FB-gated — a lone B3 casts no burst, so their HR NEVER fired → the current bands (near 0.048, else ~0) are
  ALREADY effectively HR=0. So this is a CONFIRMATION / cross-validation, not a re-derive. Value of the
  isabel-solo read: (a) a 2nd independent HR-clean SG anchor to test whether the band is unit-INDEPENDENT
  (the AR anchors DISagreed 0.20 vs 0.40 → a per-unit factor is possible for SG too); (b) if isabel matches
  the current bands (within ~2% — Fable pre-registered this as the LIKELY, VALID outcome, since SG core ≤0.05
  makes the bands HR-insensitive anyway), it REMOVES the G4 "magnitude-capped" caveat and lets the SG units
  count toward the sweep with confidence; (c) isabel's own first model datapoint. Anchors: isabel (#1),
  then guilty (purest normals) / brid as cross-checks. NOTE: the real SG magnitude driver is the LANDING
  fraction ({near 0.9, mid 1.0, far 0.75, midfar 0.9}), not the tiny core rate — one counter number per band
  pins only the PRODUCT landing×bracket; deliver M(band) as MEASURED, core as a flagged residual.
- **Hit-Rate → core-rate model (the SLOPE k).** Overturns "hitRatePct inert"; needs the clean HR=0 SG bands
  above FIRST. The slope comes from an HR-HAVING SG unit's core rate WITH HR active — but SG HR is
  FB-/burst-gated (dorothy, noir, soda), so it only reads in a TEAM (burst → HR-active window). **Reuse
  EXISTING footage**: soda-tb-control already has Soda bursting with HR ▲38.91% live — read her in-HR-window
  vs out-window core rate → k. No new recording. Then populate hitRatePct override-only for the HR units.
- **Shared AR-burst-window residual.** snow-white / moran / jill / scarlet-black-shadow share an AR-carry
  burst-window under/over-model. One focused AR-burst read (SW or moran) likely localizes it for all.
- **Soda 6-vs-5 burst over-generation (rotation bug, open-questions U16).** Engine-only, no new video.
- **Dynamic chip-state / other deferred engine items** as they gate specific units.
  EXIT CRITERIA for Tier 0: the SG units stop being magnitude-capped, HR units have a live core model, and
  the AR-burst cluster has a shared correction. Re-run board-read — expect a large jump in the ±5% bucket.

## TIER 1 — complete the control anchor set (the bootstrap floor)

The ladder needs 4 KNOWN-stable units to isolate a 5th. The element-clean control anchors (record neutral,
multiply ×1.10): **Little Mermaid**, **Crown**, **Helm**, and **snow-white** (base AR/Iron — NOT
`snow-white-heavy-arms`, which is a DIFFERENT unit: SR/Water, and IS the N4 / 1.07–1.35 / MAD .157 unstable
entry that belongs in the Tier-2 sweep, never the control set). ⚠️ ALWAYS use the full name + slug — many
NIKKEs have alternate forms with entirely different kits/weapons; conflating them is a P0-class error.
Status: Helm (N5, ±3%), Little Mermaid (N4 — one datapoint short of N5), Crown (N12 but two 1.14 outliers
to investigate), snow-white (control-frame anchor — confirm its ±3% before leaning on it as the 4th).

## TIER 2 — B3 sweep via the anchor-rotation ladder (the main video budget)

B3s first (they carry damage → highest-signal focused reads; and a stable B3 backline makes B1/B2 trivial).
Team shape each round: **B1 + B2 + 3×B3** (one B3 = the focus/main-burst unit under test; the others =
stable anchors, at least one off-burst). Round loop:

1. Team = [LM, Crown/Helm, 2 stable B3 anchors] + [TEST B3 as main-burst, centered/focused].
2. Record → hand-tune the TEST B3 to ±3% (kit-parse baseline is the starting point → fewer iterations).
3. Re-record to confirm; once ±3%, PROMOTE it to a stable B3 anchor.
4. Next round: demote it to off-burst B3, bring the next TEST B3 as main-burst. Its N keeps climbing as a
   teammate. Every ~2–3 rounds, RETIRE a control unit (LM→an owned B1 later, Crown→owned B2, Helm→owned B3)
   once enough owned anchors exist — the endgame is full owned teams, zero control units.
   **Ordering (easy → hard, to grow the anchor pool fast):**

- **Wave A — already near-stable, ~1 confirm video each** (build the anchor pool): cinderella-crystal-wave
  (done, N2), soda (done-ish, N1→needs N5), noir, dorothy, modernia, guillotine, mihara. These need mostly
  DATAPOINTS (N), not tuning — they ride as teammates + get one focus confirm.
- **Wave B — mid, ~2 videos each** (tune + confirm): rapi-red-hood, cinderella, jill, neon-vision-eye,
  liberalio, ada, elegg, diesel, laplace, eve, raven, drake, scarlet, mana, bready, anis-sparkling-summer,
  isabel (Wave B for isabel doubles as the SG-clean anchor in Tier 0).
- **Wave C — kit outliers, ~2–3 videos each** (gated on Tier 0 fixes): quency, nayuta, prika, milk, ein,
  maiden, maxwell, scarlet-black-shadow, snow-white-HA (also Tier 1). Do these AFTER Tier 0 so the shared
  fixes have already moved them most of the way.

## TIER 3 — B1/B2 sweep on stable B3 backlines

Once the B3 backline is stable, B1/B2 supports are cheap: field [owned test B1 or B2] + [4 stable owned
B3s]. Their own damage is small; grade them on TEAM total + rotation + focused buff reproduction (the naga
lesson — supporter own-total is a weak signal). Owned B1s: anis-star, rouge, d-killer-wife, moran, tove,
liter, volume, zwei, soline (+ LM done). Owned B2s: crown(done), grave, mast, naga, trina, blanc, guilty,
leona, helm-aquamarine, rosanna, mari, anchor, ade, delta, brid, velvet, takina, nayuta, mint, prika.
Many already have kit-parse baselines → fast.

## Video budget (order-of-magnitude)

- Floor from N≥5 alone: (owned units ~54) × 5 datapoints ÷ 5 slots/video = **~54 videos** if perfectly
  amortized (every unit in exactly 5 teams, no waste). Real amortization is imperfect (early anchors
  over-cover), so add ~30–50%.
- Tuning-focus overhead: ~1 focused video per unit for the mid/hard tier (baselines cut the easy tier to
  ~0.5). Focus and teammate-datapoints come from the SAME video, so this overlaps the N budget.
- **Realistic estimate: ~60–80 videos for full owned coverage** — BUT Tier 0 can erase a big chunk of the
  hard-tier tuning (SG/HR/AR clusters) using existing footage, so the NEW-video count is dominated by the
  N≥5 requirement, not tuning. The single most video-saving action is Tier 0 (esp. the SG-band re-derive:
  1 video unblocks ~12 units' accuracy).

## Progress tracking + guardrails

- Re-run `scripts/board-read.ts` after each wave; the "±3% ✓ / N" columns are the burn-down.
- Every new/tuned unit goes through the standard gate: kit-parse baseline → hand-tune vs recording →
  Fable pre/post-op → verify.sh + snapshot. Buffers get a `/sim-battery` blast-radius diff (G3).
- The kit-parse skill is the accelerator: it authors the ~80% baseline AND audits the hand-tune (it has
  already caught 2 real HT bugs) — run a blind parse on each unit before recording to pre-load the model.

## Open decisions (need owner input before executing)

1. **Owned roster:** confirm the exact owned-unit list (known-excluded: exia, miranda, ludmilla-WO,
   sakura-BiS, asuka, asuka-wille, tia, red-hood-as-solo-B1). The queue above assumes units with data/
   overrides are owned; confirm additions/removals.
2. **Front-load Tier 0?** Recommend YES — the SG-band + HR→core + AR-burst fixes unblock the most units per
   video and reuse existing footage. This reorders the "B3s first" instinct: do the shared ENGINE fixes
   first (no/low new video), THEN the per-unit B3 video sweep.
3. **Strict N≥5?** Confirm ±3% is on multi-run averages with N≥5, or whether a tighter/looser N applies for
   low-variance units.
