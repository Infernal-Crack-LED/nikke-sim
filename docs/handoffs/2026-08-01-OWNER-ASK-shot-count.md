# Owner ask — one hand shot-count, to close the missing-shot channel

> **For the owner to review, not an AI-facing doc.** Written 2026-08-01. One ask, ~5–10 minutes of
> your time, plus one piece of work I can do without you. Nothing here is urgent — the branch is in a
> clean, committed state either way.
>
> Units named use exact slugs: `isabel`, `guilty`, `noir`, and `marciana` (SG/Iron —
> **not** `marciana-marine-study`, AR/Iron, a different unit).

---

## Where things stand in one paragraph

The pellet counter reads **0.8–1.6 pellets too few per 10**, against a ±0.25 budget. This week
eliminated five candidate causes and found one partial cause. The partial cause is **shots the reader
never detects at all** — a missing shot contributes its whole ~8.4 pellets to the deficit. Measured
against the ammo counter as an independent arbiter, that channel accounts for **3.9–6.8% of shots**
where **8–16% would be needed** to explain the whole bias. So it is real, it is roughly a quarter to a
half of the problem, and something else is still unaccounted for.

## The ask — a hand shot-count on ONE `isabel` clip

**Why `isabel` specifically, and not the others.** The arbiter is only ground-truth-validated on
`marciana`, which is also the video where the channel is smallest (0.5%). `isabel` is the opposite
extreme and the only one where the answer materially changes depending on a judgement call I had to
make:

- `isabel`'s ammo counter produces two-frame glyph flips (reads `8 → 6 → 8` within four frames). Taken
  at face value that is "2 shots fired and 2 rounds reloaded in 4 frames", which is physically
  impossible at her cadence.
- I flagged those 5 events as inadmissible using an arithmetic rule: a drop of N rounds over W frames
  requires W ≥ (N−1) × cadence. That is a reasonable rule, but it is **my rule, not a measurement**.
- Including them: `isabel` reads **14.7%** missing — above the 8% bar, which would make this channel
  the whole story. Excluding them: **4.4%**, which makes it a partial story.

**A 3.4× swing on the headline result currently rests on my judgement call.** A hand count settles it.

### What to do

1. Open `docs/probes/clean-weapons/` — the `isabel` solo SG recording.
2. Pick any continuous **30-second** stretch of steady firing (avoid burst windows and the fight's
   opening if you can — a plain stretch is ideal). Note the start and end timestamps.
3. **Count the shots she fires in that window.** The ammo counter ticking down is the easiest cue;
   muzzle flashes work too. Reloads are fine to count through — I just need total shots fired.
4. Send me: the two timestamps and the count. That is the whole ask.

**Time: ~5–10 minutes.** No frame-stepping needed — a normal-speed or half-speed watch is enough,
since I need the total, not per-shot timing.

### What it decides

| Your count vs the ammo arbiter                     | What it means                                                                                                                       |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Matches the **admissible** reading (~4.4% missing) | My flip rule is right. The channel is partial, ~a quarter to a half of the bias, and the hunt continues for the rest.               |
| Matches the **raw** reading (~14.7% missing)       | My flip rule is wrong and I discarded real shots. The channel is likely the whole story, and the fix work is justified immediately. |
| Matches neither                                    | The ammo arbiter is not trustworthy on `isabel` and I need to say so before anything else leans on it.                              |

## The second item — no time from you, just a nod

The ammo reader currently decodes only **52–71%** of frames, because its digit atlas was harvested
white-only and `isabel`'s counter turns **red** at low ammo. I harvested 72 red glyphs to get this far,
but a proper **per-video red-digit atlas** would lift the read rate materially and tighten every number
above. That is a few hours of my work, no owner time, and it is worth doing before any fix lands —
a higher read rate narrows the lower bound the whole measurement rests on.

Say the word and I will queue it.

## What I am NOT asking for, and why

- **A per-shot pellet count.** Not needed — the question is how many shots exist, not how many pellets
  landed in each. The existing `marciana` ground truth already covers per-shot pellets.
- **A new recording.** Everything runs on footage already on disk.
- **A decision about the fix.** Nothing has been changed. No constant, guard, gate or threshold was
  touched this week; every result is recorded as a measurement only. When there is a fix worth landing
  I will bring it to you as its own gated pass.

## One caveat to hold, on my own numbers

The ammo arbiter systematically **under-counts** missing shots. The round that empties a magazine is
invisible to it — the counter jumps straight to the reload — and that shows up as ~one such event per
reload on every video. So the 3.9–6.8% figure is a **floor**, not a point estimate. If your hand count
comes back higher than the arbiter on `isabel`, that is consistent with this and not a contradiction.
