# Pellet reader — what I need from you (2026-07-31)

> **For the human, not an agent.** Written to be readable away from the machine. Three decisions,
> one of which blocks everything else. Everything below is committed on branch `fix/pellet-reader`
> in the worktree `/Users/maxwellsutton/nikke-sim-wt-pellet`. Nothing is pushed.
>
> Companion to [`2026-07-30-pellet-reader-OWNER-REVIEW.md`](2026-07-30-pellet-reader-OWNER-REVIEW.md),
> which covers the earlier localization work.

---

## The one-paragraph version

Phase 1 (the measurement harness) is finished and verified. Phase 2 (the actual counting redesign)
went through the cross-family plan review you asked for and came back approved-with-revisions from
both reviewers — but before building it, we tested the cheap alternative first, as both reviewers
demanded. That test could not be trusted, because the synthetic test data it scores against turned
out to be broken. It has now been broken in **three different ways**, each found only after a
confident conclusion had been drawn from it. It is now gated so it refuses to produce numbers while
it is still wrong. **The decision I need is whether to keep fixing it, or stop and move the
measurement onto real footage instead.**

---

## Decision 1 — the generator: fix it a third time, or stop? ⬅ this blocks everything

### What is actually wrong

The synthetic test set composites pellet images onto real background frames so we have data with
known-correct answers to score the counter against. Three defects, found in sequence:

| #   | defect                                                                                                                                                                      | status                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 1   | The documentation claimed the set was _easier_ than real footage. It was much harder.                                                                                       | explained by #2 and #3 |
| 2   | It placed a quarter of its pellets inside the exclusion zone the counter is configured to ignore, then counted them as correct answers. 28.9% of the data was unanswerable. | **fixed**              |
| 3   | Its pellets are drawn in a way the counter's shape filter rejects — 28% of them, versus about 7% for real pellets.                                                          | **found, not fixed**   |

Defect 3 measured, on the full 120-sequence set:

| stage                                         | synthetic pellets surviving |
| --------------------------------------------- | --------------------------- |
| found by the detector at all                  | 96.9%                       |
| ...also passes the size filter                | 85.4%                       |
| ...also passes the roundness filter           | 80.2%                       |
| ...survives both (what actually gets counted) | **71.6%**                   |

The acceptance floor is 90%. An independent check I ran with a different method on a third of the
data agreed on the shape and the verdict (65.3%), differing by a few points on magnitude. Both are
recorded; neither was reconciled to the other.

**The roundness filter is the bigger culprit** — it rejects 17.2% of found pellets versus 11.9% for
the size filter. The likely cause is that pasting a soft-edged image onto a background produces
ragged shapes, where a real pellet drawn by the game engine is cleanly round.

### Why this matters beyond the test data

Two things you already signed off on are currently untestable because of it:

- The **80% recall floor** we pre-committed for Phase 2 cannot be met by any counter on this data.
  The ceiling is about 65–72%. Fixing defect 2 moved that ceiling; it did not remove it.
- Any bias number measured on this set describes the generator, not the counter.

### Your options

**A — Fix the rendering a third time.** Attack the roundness problem directly.
_For:_ if it works, we get a large, cheap, fast-to-score test set back.
_Against:_ two fixes have already each revealed another layer. There is no reason to believe a
third is the last. Cost is unknown, which is itself the problem.

**B — Stop fixing it. Use it only for what it is good at.** The set is genuinely fine for measuring
_false positives_ (its background clutter is real footage). Retire it for bias measurement and move
that onto real recordings — the per-band values in `noir-solo-recon.json`, at roughly 25–45 shots
per band.
_For:_ the error budget arithmetic already says real data is the only thing with enough statistical
power to certify the ±0.25 pellets target anyway. The six hand-counted shots have a standard error
around 0.68 — nearly three times looser than the target — so they can only ever _fail_ a candidate,
never confirm one.
_Against:_ real-footage runs are slower, and there is a prerequisite (see Decision 3).

**C — B now, keep the gate, revisit A only if the real-data path stalls.**

### My recommendation: **C**

The error budget already told us real data is where certification has to happen. Option A is
optimising a tool we would not be certifying against anyway. The gate stays in place either way —
it now refuses loudly instead of quietly producing wrong numbers, which is the actual win from this
week.

**One caveat you should weigh.** My own diagnosis of defect 2 was incomplete: I predicted fixing it
would recover about 1.8–2.0 pellets of bias, and it recovered 0.3. I found a real defect and assumed
it was the whole story. It was one layer of three. Treat the recommendation above accordingly — it
is a judgement about where effort goes, not a guarantee that layer four does not exist.

---

## Decision 2 — 20 to 30 minutes of your time, whenever you are home

The fidelity gate's 90% floor is **derived, not measured**. It is inferred from the six hand-counted
shots' own bias, because that fixture records _how many_ pellets were in each shot but not _where
they were_. Without positions, "was this labelled pellet found by the detector" cannot be computed
on real data.

**The ask:** mark the centre of each pellet on 20 small images —
`scripts/tests/fixtures/pellets/groundtruth-f8-11/shot01..shot05/`, four frames each. That converts
the floor from an inference into a measurement, and tightens the gate materially.

Not urgent. The derived floor is deliberately conservative and the gate works without it. Filed in
the queue so it does not get lost.

---

## Decision 3 — the prerequisite for moving to real data

Before per-band certification on real footage means anything, there is an unresolved question about
**shot detection**, filed under open question U35.

On identical frames with identical settings, changing only whether template matching is restricted
to a region of the screen, the counter finds either **43 shots (29 usable)** or **72 to 74 shots
(61 to 62 usable)**. The higher figure is much closer to the roughly 90 shots expected in the
window.

This is deliberately **not** being treated as a bug. That restriction was added on purpose and
demonstrably rescued shot detection on two other recordings — more shots without it may simply be
more false locks. But both plan reviewers independently insisted that any before-and-after
comparison must run on the _same set of detected shots_, or a shift in shot count masquerades as, or
hides, a change in pellet counting.

**So: if you choose B or C above, this gets resolved first.** It is one measurement, not a rebuild.

---

## Decision 4 — pushing

The branch is **58 commits ahead of its remote and 57 ahead of `main`**. None pushed, per the
standing rule that pushing waits for you. It is accumulating; worth deciding whether you want it
pushed or merged, or left local until the pellet work concludes. If you do want it pushed, patch
notes get drafted first.

---

## What is running right now

A background agent is working through the plan-review revisions that do **not** depend on any of
the decisions above:

- Removing the requirement that a pellet must be observed _fading_ before it counts. Measured
  detection at the fade frames is 35% and 1% — requiring it would reject nearly every real pellet.
- Writing down precisely how the counting frames combine into one number per shot, which is
  currently unspecified and directly determines bias.
- Listing everything that breaks when frame extraction moves from 30 to 60 frames per second.

Plus two premise checks that could invalidate the Phase 2 design before it is built:

- **Has the 13-frame pellet animation ever actually been observed at 60 frames per second?** Every
  measurement behind the design was taken at 30. The fine structure the design depends on has only
  been seen in your written specification and in the generator that renders that specification.
- **Do all pellets of one shot really appear on the same frame, regardless of distance?** If distant
  pellets land a frame later than near ones, the design's timing anchor introduces an error that
  correlates with distance — which would corrupt exactly the near-versus-far ratio this whole
  project exists to measure.

Both are findings-only. Neither will change anything on the strength of one recording.

---

## Where things genuinely stand

**Solid:** the crosshair localization rebuild (works on all four recordings), the measurement
harness, the cache-and-sweep tooling, the six hand-counted reference shots, and the guards — the
tooling now refuses rather than silently producing wrong answers, which caught this week's defects.

**Not solid:** the synthetic test data, and consequently every bias number measured on it. The
question of whether the cheap counting approach is good enough is **unresolved** — not answered.
Phase 2's build steps are neither justified nor ruled out.

**Unchanged:** the counter is still roughly 3 to 6 times over the bias budget that open question U35
needs. That is the actual problem, and none of this week's work has moved it yet. What this week
bought was the ability to tell whether a change moves it, which we did not previously have.
