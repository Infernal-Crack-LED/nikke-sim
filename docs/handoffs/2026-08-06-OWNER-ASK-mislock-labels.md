# OWNER ASK — mark the pellets on 10 crops

> **Owner-facing. This is the whole ask; you should not need any other file.**
> Basis: `docs/probe-runs.md` §39 → §43. Rewritten 2026-08-06 after the first version asked for
> something impossible (see §5).
>
> **Slugs.** `marciana` (SG/Iron, `docs/probes/clean-weapons/marciana-solo.MP4` — **not**
> `marciana-marine-study`, AR/Iron), `noir`, `guilty`, `isabel`.

## 1. ⛔ Read this before opening the crops

This doc deliberately does **NOT** show you where the two candidate crosshairs are, what either one
counted, or which shots are the "interesting" ones. **That is not coyness — it is the measurement.**
The whole question is which of two localizations is right, so a labeller who knows where they sit,
or which shots are expected to be bad, cannot give a clean answer.

⇒ Those details live in `MANIFEST.json` / `CANDIDATE-KEY.json` beside the crops. ⛔ **You do not need
them, and opening them before marking spoils the result.**

## 2. What to do

**Directory:** `/Users/maxwellsutton/nikke-sim/scratchpad/pellets/mislock-labels/`
10 shots (`shot01`…`shot10`), 4 frames each (`f08`…`f11`).

Per shot, pick **whichever ONE of the four frames reads clearest** and draw on it — macOS Preview
markup is exactly what the original `groundtruth-f8-11` set used, and its shape autocomplete is fine
(circles and squares both read; only a mark's **centre** is used, never its size or shape):

1. 🟢 **GREEN** — one shape around **every real pellet** you can see.
2. 🟣 **MAGENTA** — one shape on the **in-game crosshair reticle**, if you can identify it.
   At most one per crop, and only when you can actually see it.

Save the marked copy **in place, same filename**. Then run:

```sh
cd /Users/maxwellsutton/nikke-sim-wt-pellet
scripts/probe/.venv/bin/python scripts/probe/extract-groundtruth-positions.py \
    --marks /Users/maxwellsutton/nikke-sim/scratchpad/pellets/mislock-labels --marks-write
```

That reads your marks, writes their positions into `ANSWERS.json`, records which frame each shot came
from in `MARKS.json`, and prints what it found. ⛔ **Then commit `ANSWERS.json`** — the 2026-08-04
answers were never persisted and those cases are now unrecoverable (§32D).

### ⚑ MAGENTA, not red

This footage is full of red VFX and red/orange damage numbers, and no colour mask can separate a
drawn red from a rendered one. **A red mark will simply not be detected.** The selftest pins that a
game-red blob reads as neither colour.

## 3. ⚑ What you are NOT being asked for

⛔ **No counts. No "which lock is right". No "is this pellet inside a window".**

The first version wanted you to count pellets inside a 184 px disc centred on a bare coordinate, in
an image with nothing drawn on it. That is geometry by eye, and it was my error — the tool does all
of it from your marks. **If you find yourself measuring distances, stop.**

⚑ **"I can't read this one" is a real answer and a real finding.** Some crops are dense with damage
numbers and red VFX — inspecting shot 7 myself, I could not confidently pick out pellets. Leave that
crop unmarked and say so in its `notes`. An unreadable crop is **data about the footage**, not a
failure. Same for the reticle: can't identify it ⇒ leave it unmarked, set `reticle_visible: false`.
**A null is data; a guess is not.**

## 4. What this buys

Your marks give the first **MAGNITUDE** for the localization channel. Everything measured so far is
mechanism only:

- **§39** — on mislocked shots the two locks count **largely different pellets** (`J_mis` 0.29–0.60
  against a control of 0.95–1.00, several shots at **zero** overlap).
- **§42** — the mislock is **one-sided**: the structural lock jumps **up 265 px** onto the floating
  damage numbers while the template lock holds.
- **§43** — but the template is **also degraded** on those shots, so on ~1 in 5 **neither** lock is
  clearly right. That is the gap only labels can close.

⇒ This decides whether fixing localization closes the reader's ~1.4 pellets/shot residual — and
therefore whether the reader can be trusted to diagnose the **15.7% SG sim gap** it exists for
(`marciana` SG/Iron, no override, sim/real **0.843**).

## 5. How this ask was shrunk, and corrected

- **137 flagged mislocks → 82:** §40A found **40.1% are a STUCK TEMPLATE LOCK** — the reference
  frozen at one pixel while the structural lock moves normally. Mechanically identifiable, no
  labelling needed.
- **82 → 10:** stratified to the shots that actually discriminate.
- ⚑ **Two cheap tests were run first, specifically to avoid spending your time** — §41's offset check
  and §43's pixel test. **Both failed their own pre-committed rules** (by 9 px, and by one shot),
  which is why this ask still exists. Had either passed, it would have been withdrawn.
- ⚑ **The task itself was wrong in v1** and you caught it. Rewritten to marks-only.

## 6. Notes for whoever processes the results

- The crops are **midpoint-centred** between the two candidates at a per-shot radius, so both
  candidate windows are wholly inside every image; **pad, never clip** (§32C) — grey is outside the
  frame. Verified: all 40 crops are byte-identical to their source frame regions plus flat pad, so
  nothing is drawn on them.
- ⚑ **Residual risk, mitigated by reporting rather than a gate:** NIKKE renders healing popups in
  **green**, so the green mask could in principle fire on in-game text. Every mark's `area` and
  `bbox` is printed and stored — check them before trusting a shot with an implausible pellet count.
- §43D's triage — the informative subset is the ~17 shots where the template does **not** outscore
  the structural lock. ⛔ Re-cutting this sample on that basis needs its own pre-commit; re-selecting
  from a failed test's output is how a selection effect gets built in.
- Regenerate the crops (idempotent) with:

```sh
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py \
    --mislock-crops /Users/maxwellsutton/nikke-sim/scratchpad/pellets \
    --mislock-crops-out /Users/maxwellsutton/nikke-sim/scratchpad/pellets/mislock-labels
```
