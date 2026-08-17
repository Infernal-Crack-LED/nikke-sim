# Pellet reader — owner review guide (2026-07-30)

> **For the human, not an agent.** What we tested today, where the files are, what each one is
> supposed to show, and what "wrong" would look like. Everything below is on disk now.
>
> ⚠ **All paths are in the MAIN tree** (`/Users/maxwellsutton/nikke-sim/`), not the worktree —
> `scratchpad/` is gitignored and exists only there.

---

## 1. The one-paragraph version

The pellet counter had two independent faults: it located the crosshair by matching a picture of the
ammo box taken from one video (which failed on other videos), and a variable-name collision silently
zeroed all its counts. Both are fixed. Localization now finds the ammo counter **by its shape**
instead of its pixels, which works on all four videos. The counter now finds **~88–100% of the shots
actually fired** — the old "we're missing 25–38%" figure was a bad denominator that forgot guns
reload.

---

## 2. Images to eyeball

Generated today specifically for this review, at:

```
/Users/maxwellsutton/nikke-sim/scratchpad/pellets/REVIEW-2026-07-30/
```

Six consecutive frames from `marciana-solo.MP4` in each of two windows, run through both the old and
new localizer:

| folder                      | what it is                                                               |
| --------------------------- | ------------------------------------------------------------------------ |
| `debug-dead-template/`      | **The bug.** Old localizer, in the window where it failed (fightT 41–53) |
| `debug-dead-structural/`    | **The fix.** New localizer, same frames                                  |
| `debug-control-template/`   | Old localizer where it _did_ work (fightT 56–68) — the baseline          |
| `debug-control-structural/` | New localizer, same frames                                               |

**⚠ The two are not a pixel-aligned A/B — they're different sizes on purpose:**

- **`-template` images are 1280×320.** They are **cropped to where the old code thought the crosshair
  was**, shown as 4 panels: original | white mask | red mask | outlined detections.
  **This is the useful one for judging the bug** — if the crop is sitting on smoke, the HP bar, or
  empty background instead of on the cluster of pellet dots, that _is_ the failure, visible directly.
- **`-structural` images are 10416×792** — the **full frame** in the same 4 panels, because the new
  path doesn't auto-crop. Zoom in near the gunfire. Use these to judge **whether the white dots are
  being found and outlined**, not to judge crop placement.

**What "correct" looks like:** in `debug-control-template/`, the crop should sit on the pellet
cluster. In `debug-dead-template/`, it should visibly _not_ — that is the bug this whole day was
about. In both `-structural/` sets, the outlined components should land on the small white dots
around the point of aim.

**What would worry me:** outlined components landing on damage numbers, the HP bar, or muzzle flash
rather than the small round dots; or dots clearly visible to you that have no outline.

---

## 3. Data artifacts (numbers, not pictures)

One folder per full-video run, each with `pellets.json` (per-shot results) and `tracks.json`
(per-detection detail):

| path                                         | what it represents                                      |
| -------------------------------------------- | ------------------------------------------------------- |
| `scratchpad/pellets/g2-noir-structural/`     | `noir`, full fight — the first full run on the new code |
| `scratchpad/pellets/h4-marciana-structural/` | `marciana`, full fight                                  |
| `scratchpad/pellets/h4-guilty-structural/`   | `guilty`, full fight — never worked at all before       |
| `scratchpad/pellets/h4-isabel-structural/`   | `isabel`, full fight                                    |
| `scratchpad/pellets/h1-marciana-treecode/`   | `marciana` on the **old** code — kept for comparison    |

**Units:** `marciana` here is the **SG/Iron** unit (`marciana-solo.MP4`), not `marciana-marine-study`.

---

## 4. What each test actually proved

| test         | question it answered                                        | result                                                        |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------- |
| **H1**       | Do the old reference numbers reproduce from committed code? | **No** — they came from code no longer in the tree            |
| **§0.5**     | Does one pellet-animation model fit every unit?             | **Yes** — two units agree within ±0.05 across the whole curve |
| **Phase 2A** | Can we locate the crosshair without a per-video picture?    | **Yes** — all four videos pass, `guilty` went 0% → 20%        |
| **Gate 2**   | Does it find the shots that were actually fired?            | **Yes** — ~88–100% once reloads are accounted for             |
| **H2**       | Would we catch the silent-zero bug if it came back?         | **Yes** — test goes red on the old code, green on the new     |
| **H3**       | Does a wrong `--zoom` still fail silently?                  | **No** — it now errors instead of writing an empty file       |

---

## 5. Two things I'd want your eyes on specifically

1. **`marciana` scores 100.1% detection.** The denominator ignores boss transitions and cover phases,
   which _should_ push a genuinely complete reader **under** 100%. Landing exactly at 100% may mean
   slight over-counting. Not chased — flagged.
2. **The 4.9 MB test fixture** (`scripts/tests/fixtures/pellets/frames/`, 4 PNGs) is an order of
   magnitude larger than anything else in that directory. Justified, but it is a real repo-weight
   decision and it is yours to make.

---

## 6. Reproducing any of it

```sh
# a full-video run (~7 min)
npx tsx scripts/probe/read-pellets.ts "<video>" --fps 30 --zoom 2 --locate structural \
  --dump-tracks true --out /Users/maxwellsutton/nikke-sim/scratchpad/pellets/<name>

# score any run's crosshair quality
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --tracks <run>/tracks.json

# the three self-checks (not in verify.sh — they need scripts/probe/.venv)
scripts/probe/.venv/bin/python scripts/probe/count-pellets.py --selftest
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --selftest
scripts/probe/.venv/bin/python scripts/probe/temporal-count-regression.py
```

⚠ **Known gap:** `--debug-dir` is silently ignored when `--temporal` is used (the save call only
exists in the non-temporal branch). The review images above were therefore generated **without**
`--temporal`, so they show per-frame detections before the lifetime filter. Crosshair placement —
the thing worth judging — is unaffected. Logged as a follow-up, not fixed.
