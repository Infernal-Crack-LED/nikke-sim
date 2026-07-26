# Probe reader build-out — implementation plan (2026-07-24)

> AI-facing plan. Goal: drive `/probe-processing` to **near-zero Opus frame reads** by closing the
> five script gaps in the skill's MISSING READERS worklist. Owner direction 2026-07-24: the old skill
> regularly burned 2–3 h producing nothing, and manual LLM frame-reading has a poor track record —
> minimizing model reads IS the objective. Reuse qwen's existing VLM/CV harness; build nothing that
> already exists.


> **STATUS 2026-07-24 — P0, P1, P2 and P4 are BUILT on branch `probe-readers`, awaiting owner merge.**
> Outcome + evidence: `docs/DECISIONS.md` (Probe reader build-out) and `docs/probe-runs.md`
> (2026-07-24 instrument validation); live instrument registry: `docs/STATE.md` §7.
> Headline: `scan.ts` is EXACT on 8 recordings with independently measured Full-Burst counts.
> **What this plan got WRONG, corrected by measurement:** the burst-gauge crop shows a DRAINING
> Full-Burst window bar, not a filling gauge (the plan's guessed `filling`/`stage` vocabulary came
> from the VLM prompt, not the screen) — though the plan's instinct that "`full` is the only state
> whose fill decreases monotonically over ~10 s" was exactly right and became the primary detector;
> and the "team burst bar" it lists as a separate detector is a SUB-STRIP of the gauge crop, so it
> was never independent. **Open tail:** the popup auto-accept path is UNEXERCISED, and `read-ammo`
> cannot yet read a small-magazine SG counter. P3 remains a validation obligation under U35.

## What already exists (inventory — reuse, do not rewrite)

| Asset | What it gives us |
|---|---|
| `scripts/probe/frames.ts` | ffmpeg extraction: `--times` batch, `--at/--dur/--fps` bursts, region presets, `--sheet`, `--zoom`. **All extraction is solved** — no new ffmpeg code anywhere in this plan. |
| `scripts/probe/count-pellets.py` (606 ln) | The structural template for a CV worker: argparse, per-frame detection, `detect_components_with_pos()`, `temporal_filter()` (cross-frame track matching), `save_debug()`, JSON out. **Already locates the ammo box every frame** via `--ammo-template` + `--max-template-disp` jump gate. |
| `scripts/probe/read-pellets.ts` (643 ln) | The orchestrator pattern: extract two rates → run the Python worker → VLM timer spine → debounce → JSON. |
| `scripts/probe/classify.py` | Colour-gate idiom (`white/orange/red/green` saturated-text masks) + region crops + `--rate` tallies. The nearest thing to a scan we already have. |
| `scripts/probe/read-burst-gauge.ts` | Fixed gauge crop `crop=188:82:2428:448`, state vocabulary (owner-confirmed 2026-07-24), debounce, `--sim` compare, and the sim-side plumbing. **Keep the whole shell; swap the classifier.** |
| `scripts/probe/read-total-damage.ts` | Fixed total crop, 1 fps sampling, monotonicity warnings. Works well (below). |
| `scratchpad/burst-gauge-*/frames-gauge/` | ~80 already-extracted gauge crops with VLM labels — the seed corpus for a CV classifier, free. |
| `scripts/probe/.venv` | numpy, scipy, **cv2**, PIL. No OCR engine (no tesseract) — and none is needed; `cv2.matchTemplate` is already in use. |

## What the existing artifacts say about reliability (measured from the scratch runs, not assumed)

- **`read-total-damage.ts` is solid.** `scratchpad/total-dmg-full*/total-damage.json`:
  190/190 non-null reads, 3 non-monotonic steps. Keep as-is. (Trim head/tail — the t=0 read is
  13,466,858 and the last is 0, i.e. pre/post-fight screens.)
- **`read-burst-gauge.ts`'s VLM classifier is NOT usable for FB counting yet.**
  `scratchpad/burst-gauge-lm/burst-gauge.json` — a **30 s** window produced **6 transitions into
  `full`** and `full` as the majority state (28/60 reads), with 9 nulls. A Full Burst is a 10 s window
  and they are 13–34 s apart, so 30 s admits at most ~2. `burst-gauge-sim` shows the same shape
  (3 to-`full` in 30 s). This is the empirical form of the audit's finding — the gauge crop is small,
  low-contrast and animated, which is the worst case for a 7B VLM.
- **The VLM timer spine is the weak link.** `timerCorrections` = 12–17 per 60 frames (~25%) across
  every gauge run; two runs of `read-total-damage.ts` over the same video agreed on the timer only
  **82.6%** of the time.
- **⚠ Re-running a VLM reader is NOT a confirmation route.** The same two runs agreed on the damage
  total **100.0%** (190/190) — the decoder is effectively deterministic, so a second run re-computes
  the same answer, including the same mistakes. Confirmation must be **method-diverse** (CV vs VLM,
  or arithmetic closure). This kills the cheapest-looking cross-check, so state it up front.

⇒ **Design rule for everything below: prefer deterministic CV on a fixed crop over a VLM read.** Use
the VLM only where the task is genuinely semantic (popup scene understanding).

---

## P0 — `scripts/probe/scan.ts` + `scan-frames.py` (deterministic CV, no VLM)

**Why first:** it is the largest recurring token sink (the burst-bar / splash / nuke scans are
re-derived from prose EVERY run), it needs no model at all, and it is the independent instrument for
FB counts — the measurement that becomes `scripts/regression.ts` asserts.

**Scope — one worker, three detectors, all on frames `frames.ts` already extracts:**

1. **Gauge-state classifier** (fixed crop, the high-value one). Per frame, on the 188×82 gauge crop:
   hue/saturation histogram → `filling` (grey+white) / `stage1` (green) / `stage2` (yellow) /
   `stage3` (red, steady) / `full` (red, DRAINING, no numeral). Two discriminators the VLM lacks:
   **(a)** numeral presence/identity by `cv2.matchTemplate` against I/II/III glyphs cut from the
   existing corpus; **(b)** fill-fraction as a time series — `full` is the only state whose fill
   *decreases monotonically over ~10 s*, which is a temporal signature, not a per-frame guess.
   Reuse `temporal_filter()`'s track-matching idea for the debounce.
2. **FB splash** — whole-frame 64×30 downscale, yellow fraction
   (`r>150, g>120, b<120, r+g>2b+100`), threshold **0.11**, reject candidates <10 s apart. Pure
   port of the documented recipe; do not refit the thresholds (measured constants).
3. **Burst bar / nuke** — bar `crop=200:14:2420:478` white-fill rows 6–8 >150 (solo meter
   `crop=142:12:2470:488`); nuke blue dominance (`b>150, b>r+30`) >25%.

**Output:** `scan.json` — `{gaugeStates[], fbCandidates[{videoT, source, confidence}], nukeEvents[]}`,
plus `--debug-dir` overlays (same convention as `count-pellets.py --debug-dir`).

**Wiring:** add `--classifier cv|vlm` to `read-burst-gauge.ts` (default `cv` once validated). Its
shell — crops, debounce, `fightT`, `--sim` compare — is reused wholesale; only the per-frame
classification swaps. Two classifiers over one shell IS the PROVE-IT-DIFFERENTLY pair.

**Validation gate (must pass before it is trusted for counts):** run against ≥2 recordings whose FB
count is measured ground truth (the graded comps pinned in `scripts/regression.ts`), plus the LM
control window above where the VLM demonstrably fails. Accept only if the CV count matches the
measured count exactly and the gauge timeline shows no <10 s `full` re-entry.

**Effort:** ~1 focused session. Riskiest part is `stage3` vs `full` (both red) — the drain signature
is the answer, and it is exactly what a per-frame model can't see.

## P1 — ammo counter: extend `count-pellets.py`, don't write a new VLM reader

**Reuse:** the box is ALREADY located every frame (`--ammo-template` + jump gate). The missing 20%
is reading the 3 digits inside it.

**Design — digit template matching, no OCR engine, no VLM:**
1. New mode `--ammo-digits`: crop the located box, threshold the white glyphs, split into digit cells
   by connected components (fixed-width font, so cell segmentation is trivial).
2. Build a **digit atlas** once (0–9 glyph crops harvested from labeled frames in
   `scratchpad/pellets/`), match each cell with `cv2.matchTemplate`, emit value + per-digit match
   score. Reject a frame whose score falls below a floor rather than guessing.
3. Temporal sanity: ammo is **monotonically non-increasing between reloads** and steps by the
   weapon's shots-per-trigger. A read that violates monotonicity without a reload jump is discarded —
   free arithmetic closure, the same trick that makes `total-damage.json` self-checking.

**Orchestrator:** `scripts/probe/read-ammo.ts`, modeled on `read-pellets.ts` (or a `--ammo` flag on
it — they share the extraction + template track, so a flag is likely cheaper). Output
`ammo.json` — `{reads[{videoT, fightT, ammo, score}], reloads[], cadence: {byBand[], overall}}`.

**Why deterministic beats VLM here:** the timer (also 2–3 white digits on a fixed crop) is the VLM's
worst artifact — ~25% correction rate. A digit atlas on a fixed font is exact or it abstains.

**Payoff beyond cadence:** this is the **only** shots/second instrument that works for EVERY weapon
class (the pellet counter is SG-only), it retires the last routine hand read in the skill, and it
directly answers **U34** (does a Max-Ammunition ▲ expiry clip the belt immediately or lazily — that
question's recipe is literally "read whether the ammo counter drops at expiry").

**Validation gate:** reproduce the measured SMG 20 rounds/s on the `idoll-ocean` clean-weapons
footage, in two range bands, and agree with the hand read that settled it.

## P2 — Battle-Records screenshot reader (`scripts/probe/read-battle-records.ts`)

**Recommendation: VLM, not OCR — with an arithmetic checksum.** Rationale: this is a static,
high-contrast, large-digit screen sampled ONCE per probe (not 190×), so the VLM's cost and its
per-frame flakiness both mostly vanish; and the layout is semantic (per-unit rows, slot order, four
icon-labelled fields) which is what a VLM is actually good at. Installing an OCR engine to read one
screenshot per probe is not worth the dependency.

**The checksum is what makes it trustworthy, and it is free:** the per-unit damage totals must sum to
the final cumulative team total from `total-damage.json` (same fight, independent instrument). If the
sum closes, the read is confirmed by arithmetic, not by a second opinion. Add a same-class ATK
uniformity check against `data/reference-stats.json` and hard-code the field map (⚔ = Combat Power,
NOT ATK — the misread that caused the phantom "13% ATK confound").

**Output:** `battle-records.json` — `{units[{slot, slug?, totalDamage, damageTaken, healing, cp}],
checksum: {sum, cumulativeTotal, deltaPct}}`, feeding `docs/probe-data/<slug>.json` directly.

**Effort:** smallest of the three. Slot order → comp order → focus unit (middle slot) is already a
documented convention.

## P3 — `read-pellets.ts` validation, filed as a targeted U35 follow-up

Per owner direction: this script is the instrument we intend to answer **U35** with, so it must be
validated on a SECOND unit before its output can speak to the question. Current state: tuned on
`marciana-solo.MP4` only; best run detects **70 of ~90** shots, `avgTotal` **7.6** vs the
lattice-measured ≈**8.45**, `avgRed` 0.19 vs ~0.5 expected. Filed into U35 as a gating follow-up —
the U35 solo recording is scored by the lattice (ground truth) AND by the pellet counter, and the
counter's histogram is only admissible where the two agree.

## P4 — popup confidence threshold for `read-popups-vlm.ts`

**Mechanism (not a self-reported score — models are badly calibrated about their own reads):** the
dedup already sees the SAME popup across the N frames it persists in (`--time-win 0.7` at `--fps 5` ⇒
3–4 looks). Those are **different images**, so they are genuinely independent samples even from a
deterministic decoder. Confidence := number of agreeing looks / total looks, plus a
`hit-values.ts` band-membership check (a value inside a known band for the focus unit is
corroborated; one outside every band is a misread or an unmodelled hit — both worth surfacing).

**Threshold policy:** `confidence ≥ 3/4 looks AND in-band` ⇒ auto-accept, no Opus confirmation;
anything else lands in a `needsConfirmation[]` array that Opus resolves in ONE batched `--times`
call. Emit both arrays so the skill's budget rule has something concrete to spend on.

**Validation:** one pass against a hand-read probe already in `docs/probe-data/` — measure how many
auto-accepted popups the hand read disagrees with. Ship only if that is zero.

---

## Order + dependencies

1. **P0 scan.ts** — unblocks trustworthy FB counts; no dependencies; biggest token win.
2. **P1 read-ammo** — reuses the P0 digit/template machinery patterns; retires the last hand read;
   also answers U34.
3. **P2 battle-records** — depends on nothing, but its checksum wants `total-damage.json`, so it
   slots in naturally after any full run.
4. **P4 popup threshold** — after P0/P1, since it needs a hand-read reference and Opus attention.
5. **P3** is not a build — it is a validation obligation filed against U35.

Each item is `/scientific-method`-gated only where it would change a MEASURED value or a default;
building a reader and validating it against known ground truth is ordinary work. Nothing here touches
`src/engine/**`, `data/**`, or `src/skills/overrides/**`.
