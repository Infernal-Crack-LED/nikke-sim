#!/usr/bin/env python3
"""Burst-gauge FILL reader (CV worker) — measures how full the burst gauge is, per frame.

WHY THIS IS SEPARATE FROM scan-frames.py
----------------------------------------
scan-frames.py answers a different question: "when did a Full Burst happen?" Its bar_frame()
thresholds on per-column brightness (mean(RGB) > 150) inside a fixed crop, and it is VALIDATED
for Full-Burst COUNTS on 8 team recordings (docs/probe-runs.md). Do not disturb it.

That brightness test cannot measure gauge FILL reliably, for two measured reasons
(2026-07-29, docs/probes/solo/alice solo.MP4):

  1. The filled portion of the bar renders at ~152-165 mean brightness, and the raid-boss sky
     background is ~160 — the fill and the background are not separable by a brightness floor.
     The UNFILLED track, by contrast, sits at ~105 and is cleanly separable from both.
  2. When the gauge reaches full, the widget changes state: the "BURST" label is replaced by a
     green stage hexagon and the bar itself turns GREEN (~mean 70). A brightness floor of 150
     reads that as 0% fill, which looks identical to an empty bar. On a lone-Burst-III solo run
     (which can never cast, so the gauge fills and then holds) this produces a long run of
     "0.0" that is really "full and held" — the opposite reading.

So this worker inverts the discriminator: it measures the DARK UNFILLED TRACK inside the bar's
own borders, and detects the green full state explicitly.

METHOD
------
  * Bar extent is SELF-CALIBRATED per video, not hardcoded: the bar is drawn with a dark border
    that spans its full width, so the border row is found as the longest dark run (length in
    [MIN_BAR_PX, MAX_BAR_PX]) in a calibration frame. Its span gives the true 0%..100% extent.
    This matters — a fixed crop cannot be assumed to align with the bar, and the fill fraction
    must be taken relative to the BAR, not to the crop.
  * Fill is then 1 - darkColumns/barWidth over the bar's interior rows.
  * Full/ready is detected as green dominance over the bar interior and reported as state
    "full" with fill 100.0 (NOT 0.0).

CALIBRATION STATUS — PARTIALLY SUPERSEDED 2026-07-29 (third pass, owner rulings)
-------------------------------------------------------------------------------------------------
Scored against the repo's labeled anchor — the 2026-07-13 hand pixel reads in
docs/data/burst-gauge.md section 6 (maiden-ice-rose, docs/probes/tb2/tb2 3 maiden.MP4, documented
12.55%/pull in sub-steps of +9.1% then +3.45%):

  * SETTLED — shape: plateaus, cadence, single-frame snaps (no animation, no overshoot — a
    sampling/rendering artefact is REFUTED by direct observation), rider-first sub-step order
    (rider on fire, weapon gauge on rocket hit — the doc's "+9.1% then +3.45%" ordering is
    inverted), green full-state detection. 30fps reproduces 60fps exactly.
  * SETTLED — SMALL-step magnitude: the rider sub-step reads 3.6-3.7 at every sampling rate vs
    the modelled 3.64.
  * UNRESOLVED — LARGE-step magnitude: the weapon sub-step reads 9.4-10.8 (mean ~10.1) vs the
    modelled 9.1, and takina's shots read 14.5-16.7 vs the modelled 14.0 — hot by ~1.0-1.3%
    absolute on both tb2-test-3 solos while the rider step is exact; mechanism not yet
    discriminated (per-snap read bias at the hit instant vs a real table gap). RAW_OVER_TRUE
    (1.064) is anchor-derived metadata, NOT applied to output and NOT validated — do not
    "correct" reads with it.
  * WITHDRAWN — the shot-counting exclusion of the documented 12.55%/pull anchor: its endpoint
    evidence (shots 7-8, the full-cross at t=18.73, the corroborating ammo read at t=18.72) sits
    OUTSIDE the owner-bounded viable window for tb2 test 3 (0:06-0:17 ONLY; past ~0:17 the player
    takes manual aim — the scope HUD is visible on the tak footage from t~18). Inside the window
    the cumulative fill does not discriminate the documented model from the reader's hotter
    per-pull.
  * REJECTED (owner ruling 2026-07-29): the overcharge hypothesis — "real charge-at-release
    exceeds 1.0 and the x(1+1.5c) focus formula extends past c=1" — is ruled OUT. The datamined
    charge cap is correct; there is no overcharge. The ~1% large-step residual is a READER
    question, not a game-mechanics one — do not open a pipeline on it, and do not cite the maiden
    override's "156-212% overcharge" meter-display note as a mechanic.

CONSEQUENCE FOR CALLERS: trustworthy for shape AND small-step magnitude at >=15fps (5fps smears
a two-sub-step pull into one merged step); 30fps is the practical default. Residual uncertainty
is the +-1 column (0.72%) quantisation of the 138px bar. Large-step magnitudes are NOT confirmed
— do not enact engine constants from them, and define the footage's viable window BEFORE reading
(tb2 test 3: 0:06-0:17, owner-ruled). Full record:
docs/handoffs/2026-07-29-gauge-fill-reader-calibration.md (§RESULT + §OWNER-RULINGS).

USAGE NOTE: self-calibration picks the LONGEST dark run in the first plausible frame. On a
whole-video scan the intro fade (t~4-5s) can present a longer dark run than the bar — pass
--calib-frame <a mid-fight frame> or window the scan with --at to skip the intro, and check the
reported bar width (the bar is 138px on these recordings; a width at the MIN/MAX bound means
mis-calibration — the script warns on stderr in that case).

===================================================================================================
TEAM MODE (--team) — added 2026-08-14
===================================================================================================
Everything above describes the SOLO path and is unchanged. `--team` is a separate lock + read path
for TEAM-HUD recordings, where the solo self-calibration provably mis-locks: run against the
documented solo crop on `docs/probes/burst tests/alice focused.MP4` it settled on a 128px
sub-region and produced stuck 44-57% reads that did not track the gauge at all
(docs/handoffs/2026-07-29-gauge-fill-reader-calibration.md ~L215).

WHAT THE TEAM WIDGET LOOKS LIKE (measured 2026-08-14 on `docs/probes/u8/u8 g vid.mov`,
`docs/probes/probe u7/13 fb count wind weak vid.MP4` and `docs/probes/burst tests/alice focused.MP4`
— all 1206x2622 portrait, i.e. 2622x1206 after ffmpeg auto-rotate; all three agree):

  * The team burst widget owns ONE slot on the right of the HUD, rows y 491-498, and renders four
    different things in it over a cycle:
      - CHARGING: the word "BURST" plus a bar spanning x 2477..2610 (134px as the lock reports it;
        the painted extent is 134-136px depending on the anti-aliased edge column). The unfilled
        TRACK is dark (column mean 100-129); the filled part is light (131-165). Fill grows LEFT to
        RIGHT, so the track's RIGHT edge is the bar's right edge at every fill level.
      - FULL: the bar and the stage hexagon turn GREEN.
      - BURST CHAIN: the bar blinks and takes the stage colours; the chain has already zeroed the
        gauge, so nothing in this span is a charging read.
      - FULL BURST: the same slot becomes the MAGENTA drain bar with a RED glow outline (what
        scan-frames.py's detector 1 reads). It BLINKS — glow on ~0.15s, off ~0.13s — and the
        drained bar lingers ~1.3s after the drain finishes before the charging bar swaps in.
  * 134px, NOT the "~177-185px" quoted in the 2026-07-29 handoff. That figure was itself a
    mis-lock; the extent above is identical on all three team recordings measured.

LOCK METHOD (explicit, reported, and refuses rather than guessing)
  1. ROW BAND by MAGENTA VOTE. Over the calibration frames, count per row how often >= 25% of that
     row's pixels are magenta. Magenta appears in the burst-widget rows and NOWHERE else in the crop
     (measured on u8: rows 491-498 score 183-337 votes over 950 frames, every other row scores 0),
     so the contiguous run of high-voting rows IS the widget. This is what makes the lock explicit:
     it keys on a colour that only the burst widget renders, not on "the longest dark run", which on
     a team HUD has at least one same-size decoy (a 140-142px bar at rows 459-483).
  2. EXTENT from the dark track inside that band, by MODE (not mean/median — the distribution has
     junk tails). x1 = modal right edge of the longest dark run, which is fill-independent. x0 =
     modal left edge over near-empty frames (run >= TEAM_MIN_BAR_PX) whose right edge is the locked
     x1. Runs longer than TEAM_MAX_BAR_PX are discarded first: a cut-in or a dark scene makes whole
     crop rows dark, and those runs start at column 0 and would drag the left edge left.
  3. WIDTH GATE. Outside [TEAM_MIN_BAR_PX, TEAM_MAX_BAR_PX] the script EXITS non-zero; outside the
     measured [TEAM_EXPECT_MIN, TEAM_EXPECT_MAX] band it prints a loud stderr warning. It never
     silently reports a sub-region. A lock set with no Full Burst in it (so no magenta) also exits —
     pass --lock-frames pointing at a whole-video scan.

STATES (`state`) — only `filling` and `full` carry gauge; every other state has fillRaw = null:
  filling | full | chain | burstRender | fullburst | flash | unknown

DIAG MODE (--diag, team only) — the opening-window observable (2026-08-14, step 1a of
docs/handoffs/2026-08-14-burst-gen-next-session.md). The artifact resolver nulls fillRaw on every
non-charging render BY DESIGN; --diag additionally records, for EVERY frame, what the widget's
pixels contain before any classification: `diag = {fill, mag, red, green}` where `fill` is the raw
dark-track arithmetic (100 * litColumns / width) applied unconditionally and mag/red/green are the
colour-mask fractions over the locked band. Purpose: during the ~1.5s after a Full Burst when the
drained drain-bar still owns the widget slot (the reader's known blind spot), diag.fill answers
whether ANY fill-like paint exists under/behind the drain render — i.e. whether the blind spot is a
rendering fact of the game (nothing to read) or a flag-taxonomy choice (something readable was
discarded). diag.fill on a drain/blink/chain frame is NOT gauge and must never be fed to a rate —
it is raw pixel arithmetic, published only so a measurement can characterize the opening. Default
output (no --diag) is byte-identical to before the flag existed.

ARTIFACT FLAGS (per frame, in `flags`) — these are the reasons a team read is NOT trustworthy:
  * `lowFill`   — fill < TEAM_LOW_FILL_PCT. Owner-ruled UI artifact (the bar's first paint and the
                  "BURST" label both paint low-fill pixels), NOT gauge. Absolute low-fill levels
                  are UNRELIABLE; the fixture test does not assert on them.
  * `flash`     — the whole bar momentarily renders at fill colour (a gain-pulse animation). Measured
                  on u8 t=24.067-24.283: reads went 20.6 -> 100/78.7/100/27.9/96.3/100/33.1 -> 39.7,
                  i.e. ~0.25s of garbage straddling a real step. Per-frame it is indistinguishable
                  from a genuine 100%, so it is resolved temporally: a frame with no dark track is a
                  genuine `full` only if the widget reaches green-full or the magenta Full Burst
                  within TEAM_FULL_CONFIRM_SEC with no intervening filling read below
                  TEAM_FULL_HOLD_PCT; otherwise it is a flash and its fill is dropped.
  * `inFlashSpan` — a filling frame sitting between two flash frames of the same cluster; the
                  animation is still running, so the value is not trustworthy either.
  * `chainRender` — the burst chain owns the widget (state `chain`). Emitted for every frame from
                  the full instant to the Full Burst.
  * `burstRender`/`drainTail` — the Full-Burst bar (or its lingering drained render) owns the widget.
  * `spike`     — an isolated one-frame jump above both neighbours; excluded from the running max so
                  it cannot condemn the rest of the window.
  * `nonMonotonic` — a TRANSIENT dip below the run's maximum by more than TEAM_NOISE_PCT. Gauge only
                  rises inside a refill window, so this is reader noise/occlusion, not gauge.
  * `levelDrop` — a dip that PERSISTS (still below the maximum TEAM_DROP_CONFIRM_SEC later): the
                  trace stepped to a new level. The baseline re-anchors there rather than flagging
                  every honest read after it.
  * `noDarkTrack` — diagnostic: no unfilled columns at all. On a `full` frame that is the real thing;
                  on a `flash` frame it is the animation.
  * `offCurve`  — the read is inconsistent with the window's DOMINANT monotone fill curve (added
                  2026-08-14, second pass). Gauge only rises inside a refill window, so the honest
                  reads of a window form one non-decreasing curve; the largest set of reads
                  consistent with such a curve (within TEAM_NOISE_PCT, persistence-weighted — every
                  frame is one vote) IS that curve, and every read off it is an artifact. This is
                  the flag that closes the taxonomy leak the 2026-08-14 fill-trace measurement
                  found: a gain-pulse/paint-in excursion reading spuriously HIGH for >= 2
                  consecutive frames escapes `spike` (which only tests ISOLATED one-frame jumps),
                  survives as a "clean" read, and then `levelDrop` re-anchors the baseline BELOW it
                  — so the phantom high itself stayed clean and every honest read after it read as
                  a monotonicity violation downstream (11 of 36 refill windows in the fill-trace
                  clean set, worst apparent drop 91%: docs/handoffs/2026-08-14-fill-trace-deliverable.md
                  §6 — the deliverable's "24 of 36 have zero" counted the coverage-dropped window
                  I-5, whose census never ran). The persistence vote decides WHICH side of a
                  contradiction is honest: a brief high excursion loses to the sustained curve the
                  trace returns to.

VALIDATION STATUS OF TEAM MODE (2026-08-14) — scored ONLY against sim-independent labels, i.e. the
committed detector fixtures `docs/probe-data/tempo-cycle-u8-g-iron-sweep.json` and
`tempo-cycle-probe-u7-t5-wind-weak.json` (whose chain stage timestamps come from scan-frames.py's
8/8-validated hexagon detector) plus the trace's own internal structure. It was NOT scored against
data/gauge-per-shot.json, sim output, or any per-shot table — that would be circular, since the
per-shot table is exactly what a downstream measurement using this reader would be testing.
  * VALIDATED — the lock. 134px at x 2477..2610, rows 491-498, on both target videos and on
    `docs/probes/burst tests/alice focused.MP4`: the reported width matches the real team bar rather
    than a sub-region, and the solo path re-run on its own anchor is byte-identical (no regression).
  * VALIDATED — full-instant alignment, 24/24 chains across the two target recordings. u8: 12/12
    matched, residual (full - stage1) mean -0.032s, sd 0.013s, range [-0.050, -0.016]. probe u7:
    12/12, mean -0.051s, sd 0.019s, range [-0.083, -0.016]. Zero unmatched full instants on either;
    the one "extra" full per video lands on the opening chain whose stage-1 hexagon the detector
    recorded as null, i.e. the reader RECOVERS it. NOTE the offset is ~1 frame, NOT the ~0.5s
    "30f pre-B1" gap — this reader REPORTS the offset, it does not adjudicate it.
  * VALIDATED — structure. Over the 12 post-first-Full-Burst refill windows per video the unflagged
    trace is non-decreasing within TEAM_NOISE_PCT and resets at the chain; nonMonotonic flags
    average 0.9/window on u8 (max 3) and 1.8 on probe u7 (max 9). Closure: the clean trace spans a
    mean 80% of the bar per window (u8 min 59%, u7 min 58%), ending at mean 94% (u8) / 96% (u7)
    just before the chain.
  * KNOWN BLIND SPOT, not a defect — the reader cannot see the FIRST 0.77-1.70s of a refill window
    (mean ~1.5s): the drained Full-Burst bar still owns the widget slot, so the charging bar has not
    painted yet. Any consumer integrating a window must treat its opening as unobserved.
  * NOT VALIDATED — absolute low-fill levels (`lowFill` frames), the magnitude of any single step,
    and anything during a `flash`/`inFlashSpan`/`spike`/`levelDrop` frame. Reader quantisation is
    +-1 column = 0.75% of the 134px bar; that is a FLOOR on the error, not the whole error, because
    the gain-pulse animation blinds the reader for ~0.25s around large steps. About 65% of the
    frames in a window survive as clean reads.
  * NOT VALIDATED — per-unit attribution. A team trace is the TEAM SUM; it never isolates one unit.

usage: gauge-fill.py --frames <dir> --fps <n> [--at <s>] [--calib-frame <i>] [--out <file>]
       gauge-fill.py --team --frames <dir> --fps <n> [--at <s>] [--lock-frames <dir>]
                     [--crop <w:h:x:y>] [--bar <y0:y1:x0:x1>] [--spans <a-b,c-d,...>]
                     [--out <file>]
       gauge-fill.py --reflag <trace-or-bundle.json> [--out <file>]   # offCurve pass only

  # the documented team crop (2622x1206 landscape, after auto-rotate) and a whole-video lock set:
  ffmpeg -i VIDEO -vf "fps=5,crop=280:70:2342:465"  lock/f_%05d.png
  ffmpeg -i VIDEO -vf "fps=30,crop=280:70:2342:465" fine/f_%05d.png
  scripts/probe/gauge-fill.py --team --frames fine --fps 30 --lock-frames lock \
      --crop 280:70:2342:465 --spans 22.0-26.2,35.6-39.8
"""
import argparse
import glob
import json
import os
import sys

import numpy as np
from PIL import Image

# --- measured constants (2026-07-29, 2622x1206 portrait recordings) ---
DARK_MAX = 130.0      # per-column mean brightness at/below which a bar column is UNFILLED track
                      # (measured: track ~105, fill ~152-165, sky ~160 — the floor sits between
                      # track and fill, NOT between fill and background)
BORDER_MAX = 130.0    # brightness floor for the bar's dark border run (same family as DARK_MAX)
MIN_BAR_PX = 100      # plausible bar width bounds, used to reject non-bar dark runs during
MAX_BAR_PX = 200      # self-calibration (a dark load screen makes whole rows "dark")
INTERIOR_ROWS = 9     # bar interior band height sampled above the border row
GREEN_MARGIN = 25     # G must exceed R and B by this to count as the green full state
GREEN_FRAC = 0.30     # fraction of interior pixels that must be green to call the bar full

RAW_OVER_TRUE = 1.064  # anchor-derived, NOT validated and NOT applied to output (see CALIBRATION)

# --- team-mode constants (measured 2026-08-14 on u8 / probe u7 / burst-tests team recordings) ---
TEAM_MIN_BAR_PX = 110     # HARD gate: a lock outside this range EXITS non-zero. The decoy the solo
TEAM_MAX_BAR_PX = 200     # lock fell into on team footage was 128px, so the gate alone is not enough
                          # — the magenta row vote is what actually rejects it (it is not in the
                          # widget rows at all).
TEAM_EXPECT_MIN = 126     # measured team bar is 136px on all three recordings; a lock outside this
TEAM_EXPECT_MAX = 148     # band still runs but warns LOUDLY on stderr.
TEAM_MAG_ROW_FRAC = 0.25  # fraction of a row that must be magenta for that row to vote "widget"
TEAM_MAG_FRAC = 0.25      # fraction of the locked band that must be magenta to call FULL BURST
TEAM_RED_FRAC = 0.20      # ... and red, which the Full-Burst bar's glow outline and the chain's
                          # stage tint both paint over the bar. Either way it is NOT a charging
                          # gauge, which is all the flag has to say.
TEAM_MIN_MAG_FRAMES = 5   # a lock set with fewer magenta frames than this cannot identify the widget
TEAM_FB_TAIL_SEC = 0.20   # the Full-Burst bar BLINKS (measured on u8 at 60fps: red glow on ~0.15s,
                          # off ~0.13s), so its state has to be closed over the off-frames. 0.20s
                          # bridges the blink and stops ~0.2s past the swap to the charging bar
                          # (u8: last red frame t=23.367, charging bar paints from t=23.383).
TEAM_CHAIN_MAX_SEC = 4.0  # cap on the chain span opened by a green-full, in case no Full Burst
                          # follows it in the scanned range
TEAM_MIN_CHARGE_READS = 3  # mid-charge reads a window must show before a `full` is believed. A
                          # single stray mid read inside the Full-Burst blink is otherwise enough
                          # to mint a spurious full (measured on probe u7 at t=179.2).
TEAM_LOW_FILL_PCT = 8.0   # below this the render is the "BURST" label / first paint, not gauge
TEAM_FULL_HOLD_PCT = 95.0 # a filling read below this between a no-track frame and the green state
                          # proves the no-track frame was a gain-pulse flash, not a real full
TEAM_FLASH_JOIN_SEC = 0.30  # flash frames this close belong to one animation cluster
TEAM_FULL_CONFIRM_SEC = 3.0  # how far ahead a no-track frame may look for its green/magenta proof
TEAM_NOISE_PCT = 1.5      # a drop below the running max larger than this is flagged nonMonotonic
                          # (1.5% ~= 2 columns of the 136px bar)
TEAM_DROP_CONFIRM_SEC = 0.20  # a drop still below the baseline this long later is a levelDrop (a
                          # step to a new level), not a transient dip. Without it, ONE artifact read
                          # early in a window condemns every honest read after it (measured: a
                          # single spurious 85.1 flagged 59 good reads in the u8 t=79.6 window).


def find_bar(img):
    """Self-calibrate the bar's extent from its dark border row. Returns (row, x0, x1) or None."""
    best = None
    for y in range(img.shape[0]):
        dark = img[y].mean(axis=1) < BORDER_MAX
        start = None
        longest = (0, 0, 0)
        for i, v in enumerate(list(dark) + [False]):
            if v and start is None:
                start = i
            elif not v and start is not None:
                if i - start > longest[2]:
                    longest = (start, i - 1, i - start)
                start = None
        if MIN_BAR_PX <= longest[2] <= MAX_BAR_PX and (best is None or longest[2] > best[1][2]):
            best = (y, longest)
    if best is None:
        return None
    return best[0], best[1][0], best[1][1] + 1


def read_fill(img, row, x0, x1):
    """Return (state, fillPct) for one frame given the calibrated bar geometry."""
    y0 = max(0, row - INTERIOR_ROWS)
    y1 = max(y0 + 1, row - 1)
    seg = img[y0:y1, x0:x1]
    if seg.size == 0:
        return 'unknown', None
    green = ((seg[:, :, 1] > seg[:, :, 0] + GREEN_MARGIN)
             & (seg[:, :, 1] > seg[:, :, 2] + GREEN_MARGIN)).mean()
    if green >= GREEN_FRAC:
        return 'full', 100.0
    cols = seg.mean(axis=2).mean(axis=0)
    width = x1 - x0
    dark = int((cols < DARK_MAX).sum())
    return 'filling', round(100.0 * (width - dark) / width, 1)


# ==================================================================================================
# TEAM MODE — see the TEAM MODE section of the module docstring for the method and its validation.
# ==================================================================================================
def _longest_run(mask):
    """(start, endInclusive, length) of the longest True run in a 1-D boolean array."""
    best = (0, -1, 0)
    start = None
    for i, v in enumerate(list(mask) + [False]):
        if v and start is None:
            start = i
        elif not v and start is not None:
            if i - start > best[2]:
                best = (start, i - 1, i - start)
            start = None
    return best


def magenta_mask(seg):
    """The Full-Burst drain bar's colour. Same test as scan-frames.py's `magenta` channel."""
    r, g, b = seg[..., 0], seg[..., 1], seg[..., 2]
    return (r > 150) & (g < 120) & (b > 110) & (b > g + 40)


def green_mask(seg):
    g = seg[..., 1]
    return (g > seg[..., 0] + GREEN_MARGIN) & (g > seg[..., 2] + GREEN_MARGIN)


def red_mask(seg):
    """The Full-Burst bar's glow outline / the chain's stage tint. Same test as scan-frames.py."""
    r, g, b = seg[..., 0], seg[..., 1], seg[..., 2]
    return (r > 150) & (g < 115) & (b < 115) & (r > b + 80) & (r > g + 80)


def team_lock(files):
    """Locate the team burst widget. Returns (band, extent, diag) or raises SystemExit.

    band   = (y0, y1) inclusive row range of the widget
    extent = (x0, x1) inclusive column range of the charging bar
    """
    if not files:
        sys.exit('team lock: no calibration frames')
    h = np.array(Image.open(files[0]).convert('RGB')).shape[0]
    mag_votes = np.zeros(h, dtype=int)
    for f in files:  # pass 1 — which rows belong to the burst widget?
        img = np.array(Image.open(f).convert('RGB')).astype(int)
        rows_mag = magenta_mask(img).mean(axis=1)
        mag_votes += (rows_mag >= TEAM_MAG_ROW_FRAC).astype(int)

    top = int(mag_votes.max())
    if top < TEAM_MIN_MAG_FRAMES:
        sys.exit(
            f'team lock FAILED: only {top} frame(s) show the magenta Full-Burst drain bar in any '
            f'row (need >= {TEAM_MIN_MAG_FRAMES}). The magenta row vote is what identifies the team '
            f'burst widget, so a lock set that contains no Full Burst cannot lock. Point '
            f'--lock-frames at a whole-video scan (e.g. fps=5 over the full recording), and check '
            f'the crop actually contains the widget (documented: crop=280:70:2342:465 on '
            f'2622x1206 landscape frames).')

    # contiguous band around the best-voting row
    peak = int(np.argmax(mag_votes))
    floor = max(1, int(round(0.4 * top)))
    y0 = peak
    while y0 - 1 >= 0 and mag_votes[y0 - 1] >= floor:
        y0 -= 1
    y1 = peak
    while y1 + 1 < h and mag_votes[y1 + 1] >= floor:
        y1 += 1

    # Runs longer than TEAM_MAX_BAR_PX are a dark SCENE, not the bar (a cut-in or a load screen
    # makes the whole crop row dark and its run starts at column 0) — capping the run length is
    # what keeps those out of the edge statistics.
    runs = []
    for f in files:  # pass 2 — the charging bar's extent inside those rows
        band = np.array(Image.open(f).convert('RGB')).astype(int)[y0:y1 + 1]
        if magenta_mask(band).mean() >= TEAM_MAG_FRAC or green_mask(band).mean() >= GREEN_FRAC:
            continue
        cols = band.mean(axis=2).mean(axis=0)
        s, e, n = _longest_run(cols < DARK_MAX)
        if 20 <= n <= TEAM_MAX_BAR_PX:
            runs.append((s, e, n))
    if not runs:
        sys.exit('team lock FAILED: the widget rows never showed a dark charging track. Widen the '
                 'lock set (it must cover at least one refill window).')
    # The right edge is fill-independent (fill grows left to right), so it is the sturdiest anchor:
    # take its MODE. The left edge is only exposed on a near-empty frame, so take the mode over
    # near-empty runs that also end at the established right edge.
    x1 = max(set(e for _, e, _ in runs), key=[e for _, e, _ in runs].count)
    lefts = [s for s, e, n in runs if n >= TEAM_MIN_BAR_PX and abs(e - x1) <= 2]
    if not lefts:
        sys.exit(f'team lock FAILED: right edge locked at x={x1} but no near-empty frame exposed '
                 f'the left edge (need a run >= {TEAM_MIN_BAR_PX}px ending there). Without one the '
                 f'bar\'s extent is unobservable — widen the lock set.')
    x0 = max(set(lefts), key=lefts.count)
    diag = {
        'magentaVoteRows': [y0, y1],
        'magentaVotePeak': top,
        'magentaVoteFrames': len(files),
        'nearEmptyFrames': len(lefts),
        'trackFrames': len(runs),
        'rightEdgeVotes': [x1, [e for _, e, _ in runs].count(x1)],
        'leftEdgeVotes': [x0, lefts.count(x0)],
    }
    gate_team_width((y0, y1), (x0, x1), 'team lock')
    return (y0, y1), (x0, x1), diag


def gate_team_width(band, extent, who):
    """REFUSE a width that cannot be the team bar; WARN loudly on one outside the measured band."""
    (y0, y1), (x0, x1) = band, extent
    width = x1 - x0 + 1
    if not (TEAM_MIN_BAR_PX <= width <= TEAM_MAX_BAR_PX):
        sys.exit(
            f'{who} REFUSED: bar width {width}px is outside the allowed team range '
            f'[{TEAM_MIN_BAR_PX}, {TEAM_MAX_BAR_PX}] (band rows {y0}-{y1}, x {x0}-{x1}). This is '
            f'the mis-lock the solo path produced on team footage — refusing rather than reporting '
            f'a sub-region as if it were the bar.')
    if not (TEAM_EXPECT_MIN <= width <= TEAM_EXPECT_MAX):
        print(f'⚠⚠ {who} SUSPECT: bar width {width}px is outside the MEASURED team-bar band '
              f'[{TEAM_EXPECT_MIN}, {TEAM_EXPECT_MAX}] (134px on every team recording measured so '
              f'far). Band rows {y0}-{y1}, x {x0}-{x1}. Verify against the frame before trusting '
              f'any fill percentage.', file=sys.stderr)


def read_team_fill(img, band, extent, diag=False):
    """Return (state, fillPct|None, flags, diag|None) for one frame of a TEAM recording.

    The 4th element is None unless diag=True, in which case it carries the RAW per-frame pixel
    measurements taken BEFORE any state classification (see DIAG MODE in the module docstring).
    """
    (y0, y1), (x0, x1) = band, extent
    seg = img[y0:y1 + 1, x0:x1 + 1]
    if seg.size == 0:
        return 'unknown', None, [], None
    mag = magenta_mask(seg).mean()
    grn = green_mask(seg).mean()
    red = red_mask(seg).mean()
    cols = seg.mean(axis=2).mean(axis=0)
    width = x1 - x0 + 1
    dark = int((cols < DARK_MAX).sum())
    fill = round(100.0 * (width - dark) / width, 1)
    d = None
    if diag:
        d = {'fill': fill, 'mag': round(float(mag), 3),
             'red': round(float(red), 3), 'green': round(float(grn), 3)}
    if mag >= TEAM_MAG_FRAC:
        return 'fullburst', None, ['fullBurstDrain'], d
    if grn >= GREEN_FRAC:
        return 'full', 100.0, ['greenFull'], d
    if red >= TEAM_RED_FRAC:
        return 'burstRender', None, ['burstRender'], d
    flags = []
    if dark == 0:
        flags.append('noDarkTrack')
    if fill < TEAM_LOW_FILL_PCT:
        flags.append('lowFill')
    return 'filling', fill, flags, d


def resolve_team_artifacts(reads):
    """Temporal artifact pass. Mutates `reads` in place; see the ARTIFACT FLAGS docstring section.

    The cycle's render order is fixed — Full Burst (magenta drain) -> charging -> green full ->
    burst chain -> Full Burst — and three of those four renders are NOT a charging gauge, so most of
    this pass is about labelling them rather than reading them:

    1. CHAIN SPAN. From a green-full frame forward to the next Full Burst (capped at
       TEAM_CHAIN_MAX_SEC), the widget renders the chain's stage colours and blinks; nothing there
       is gauge (and the chain zeroes the bar anyway). Marked `chain`.
    2. DRAIN TAIL. The drained Full-Burst bar lingers up to TEAM_FB_TAIL_SEC after its last coloured
       frame, reading as a near-empty charging bar that it is not. Marked `burstRender`/`drainTail`.
    3. FLASH. A `noDarkTrack` frame is a genuine 100% only if the widget reaches green-full or the
       magenta Full Burst within TEAM_FULL_CONFIRM_SEC with no intervening filling read below
       TEAM_FULL_HOLD_PCT. Otherwise it is a gain-pulse flash and its value is dropped.
    4. Filling frames between two flash frames of one cluster are `inFlashSpan` (animation running).
    5. Any filling read more than TEAM_NOISE_PCT below the running max of its filling run is
       `nonMonotonic` — gauge does not fall inside a refill window, so that is reader noise.
    """
    n = len(reads)

    for i, r in enumerate(reads):  # 3. flash vs genuine full (run first: it creates `full` frames)
        if r['state'] != 'filling' or 'noDarkTrack' not in r['flags']:
            continue
        confirmed = False
        for j in range(i + 1, n):
            if reads[j]['t'] - r['t'] > TEAM_FULL_CONFIRM_SEC:
                break
            sj = reads[j]['state']
            if sj in ('full', 'fullburst'):
                confirmed = True
                break
            if sj == 'filling' and reads[j]['fillRaw'] is not None \
                    and reads[j]['fillRaw'] < TEAM_FULL_HOLD_PCT:
                break
        if confirmed:
            r['state'] = 'full'
        else:
            r['state'] = 'flash'
            r['fillRaw'] = None
            r['flags'].append('flash')

    for i, r in enumerate(reads):  # 2. Full-Burst drain tail (BEFORE the chain sweep, which uses it)
        if r['state'] not in ('fullburst', 'burstRender') or 'drainTail' in r['flags']:
            continue
        for j in range(i + 1, n):
            if reads[j]['t'] - r['t'] > TEAM_FB_TAIL_SEC:
                break
            if reads[j]['state'] not in ('filling', 'flash', 'full'):
                continue
            reads[j]['state'] = 'burstRender'
            reads[j]['fillRaw'] = None
            reads[j]['flags'] = [f for f in reads[j]['flags']
                                 if f not in ('lowFill', 'flash', 'greenFull')]
            reads[j]['flags'] += ['burstRender', 'drainTail']

    # 1. chain spans. One forward sweep, so exactly ONE `full` survives per cycle — the first
    #    green/saturated instant — and everything from there to the Full Burst is `chain`.
    #    A `full` also has to be EARNED: the widget must have been observed MID-charge since the
    #    last burst render. Without that gate the bright frame the widget paints just before each
    #    Full Burst opens a second, spurious `full` per cycle.
    chain_start = None
    seen_charge = 0
    for r in reads:
        if r['state'] in ('fullburst', 'burstRender'):
            chain_start = None
            seen_charge = 0
            continue
        if chain_start is not None:
            if r['t'] - chain_start > TEAM_CHAIN_MAX_SEC:
                chain_start = None
            else:
                r['state'] = 'chain'
                r['fillRaw'] = None
                if 'chainRender' not in r['flags']:
                    r['flags'].append('chainRender')
                continue
        if r['state'] == 'filling' and r['fillRaw'] is not None \
                and TEAM_LOW_FILL_PCT <= r['fillRaw'] < TEAM_FULL_HOLD_PCT:
            seen_charge += 1   # a MID-charge read; the `lowFill` band is UI artifact, not charge
        if r['state'] == 'full':
            if seen_charge >= TEAM_MIN_CHARGE_READS:
                chain_start = r['t']
            else:
                r['state'] = 'chain'
                r['fillRaw'] = None
                r['flags'] = [f for f in r['flags'] if f != 'greenFull']
                r['flags'].append('chainRender')

    flash_ts = [r['t'] for r in reads if r['state'] == 'flash']
    clusters = []
    for t in flash_ts:
        if clusters and t - clusters[-1][1] <= TEAM_FLASH_JOIN_SEC:
            clusters[-1][1] = t
        else:
            clusters.append([t, t])
    for r in reads:
        if r['state'] != 'filling':
            continue
        if any(a <= r['t'] <= b for a, b in clusters):
            r['flags'].append('inFlashSpan')

    # 5. isolated up-spikes first: one bogus high read must not poison the running maximum for the
    #    rest of the window (measured: a single 85.1 between two 6.7s flagged 59 good reads).
    #    A run is ONE refill window: `flash` frames sit inside it (same window, unreadable frames),
    #    so they must not split it — only a burst/chain render starts a new window.
    runs = []
    cur = []
    for r in reads:
        if r['state'] == 'filling' and r['fillRaw'] is not None:
            cur.append(r)
        elif r['state'] != 'flash':
            if cur:
                runs.append(cur)
            cur = []
    if cur:
        runs.append(cur)
    for run in runs:
        for k in range(1, len(run) - 1):
            v, a, b = run[k]['fillRaw'], run[k - 1]['fillRaw'], run[k + 1]['fillRaw']
            if v > a + TEAM_NOISE_PCT and v > b + TEAM_NOISE_PCT:
                run[k]['flags'].append('spike')
        solid = [r for r in run if 'spike' not in r['flags']]
        run_max = None
        for k, r in enumerate(solid):
            v = r['fillRaw']
            if run_max is None or v >= run_max - TEAM_NOISE_PCT:
                run_max = v if run_max is None else max(run_max, v)
                continue
            ahead = [x for x in solid[k + 1:] if x['t'] - r['t'] <= TEAM_DROP_CONFIRM_SEC]
            if len(ahead) >= 2 and all(x['fillRaw'] < run_max - TEAM_NOISE_PCT for x in ahead):
                r['flags'].append('levelDrop')   # the trace stepped to a new level and stayed there
                run_max = v
            else:
                r['flags'].append('nonMonotonic')  # a transient dip: reader noise, not gauge

    # 6. the dominant-curve pass (`offCurve`) — catches what 5 structurally cannot: a multi-frame
    #    spurious-high excursion is not an isolated `spike`, and once `levelDrop` re-anchors the
    #    baseline below it the phantom read itself stays "clean". Judging every read against the
    #    window's persistence-weighted dominant monotone curve condemns the excursion instead.
    flag_off_curve(reads)
    return reads


def _dominant_chain(vals, tol):
    """Indices of the LARGEST subset of `vals` consistent with one non-decreasing fill curve.

    Consistency is judged against the chain's RUNNING MAX (each kept read must sit within `tol`
    below every read kept before it), not merely against the previous element — an
    adjacent-only tolerance would let a chain ratchet downhill `tol` at a time. Exact
    O(n^2 * frontier) dynamic program over a Pareto frontier of (length, runningMax) per
    endpoint: longer is better, and between equal lengths a lower running max can only extend
    further. Deterministic; ties prefer the lower curve.
    """
    n = len(vals)
    if n == 0:
        return set()
    frontiers = []  # frontiers[j] = [(length, runningMax, prevIndex, prevFrontierSlot), ...]
    for j in range(n):
        cand = [(1, vals[j], -1, -1)]
        for i in range(j):
            for k, (ln, m, _, _) in enumerate(frontiers[i]):
                if vals[j] >= m - tol:
                    cand.append((ln + 1, max(m, vals[j]), i, k))
        cand.sort(key=lambda c: (-c[0], c[1]))
        front = []
        best_m = None
        for c in cand:  # Pareto prune: keep strictly-improving running max as length falls
            if best_m is None or c[1] < best_m:
                front.append(c)
                best_m = c[1]
        frontiers.append(front)
    bj = bk = 0
    best = (0, 0.0)
    for j in range(n):
        for k, (ln, m, _, _) in enumerate(frontiers[j]):
            if (ln, -m) > best:
                best = (ln, -m)
                bj, bk = j, k
    chain = set()
    while bj != -1:
        chain.add(bj)
        _, _, bj, bk = frontiers[bj][bk]
    return chain


def flag_off_curve(reads):
    """Second artifact pass: flag every read inconsistent with its window's dominant monotone
    curve as `offCurve`. See the ARTIFACT FLAGS docstring — this closes the multi-frame
    spurious-high leak that `spike` (isolated frames only) and `levelDrop` (re-anchors BELOW the
    phantom) leave open. Pure and idempotent over resolved reads, so it can also be re-applied to
    an already-emitted trace (`--reflag`). Returns the number of newly flagged reads.
    """
    added = 0
    runs = []
    cur = []
    for r in reads:  # same segmentation as the monotonicity pass: only a burst/chain render
        if r['state'] == 'filling' and r['fillRaw'] is not None:  # ends a refill window
            cur.append(r)
        elif r['state'] != 'flash':
            if cur:
                runs.append(cur)
            cur = []
    if cur:
        runs.append(cur)
    for run in runs:
        solid = [r for r in run if 'spike' not in r['flags']]
        chain = _dominant_chain([r['fillRaw'] for r in solid], TEAM_NOISE_PCT)
        for k, r in enumerate(solid):
            if k not in chain and 'offCurve' not in r['flags']:
                r['flags'].append('offCurve')
                added += 1
    return added


def reflag_main(args):
    """--reflag: re-run ONLY the off-curve pass on an already-emitted team trace (or a replay
    bundle holding one), and report the clean-set monotonicity census before/after per window.
    This is the committed instrument behind the before/after figures for the `offCurve` flag —
    the earlier passes are not re-run (they nulled the values they condemned), so the input's
    existing states/flags are taken as-is and only `offCurve` is added.
    """
    doc = json.load(open(args.reflag))
    trace = doc['trace'] if 'trace' in doc and 'reads' in doc.get('trace', {}) else doc
    reads = trace['reads']
    dirty_old = {'lowFill', 'flash', 'inFlashSpan', 'spike', 'nonMonotonic', 'levelDrop',
                 'noDarkTrack', 'burstRender', 'drainTail', 'chainRender', 'fullBurstDrain'}

    def census(run, dirty):
        clean = [r for r in run if r['state'] == 'filling' and r['fillRaw'] is not None
                 and not (set(r['flags']) & dirty)]
        run_max, viol, worst = -float('inf'), 0, 0.0
        for r in clean:
            if r['fillRaw'] < run_max - TEAM_NOISE_PCT:
                viol += 1
                worst = max(worst, run_max - r['fillRaw'])
            run_max = max(run_max, r['fillRaw'])
        return len(clean), viol, round(worst, 1)

    runs = []
    cur = []
    for r in reads:
        if r['state'] == 'filling' and r['fillRaw'] is not None:
            cur.append(r)
        elif r['state'] != 'flash':
            if cur:
                runs.append(cur)
            cur = []
    if cur:
        runs.append(cur)

    before = [census(run, dirty_old) for run in runs]
    added = flag_off_curve(reads)
    dirty_new = dirty_old | {'offCurve'}
    print(f'{args.reflag}: {len(runs)} windows, {added} reads newly flagged offCurve')
    print('win  span(s)              clean  viol/worst  ->  clean  viol/worst  offCurve(new)')
    for i, run in enumerate(runs):
        b = before[i]
        a = census(run, dirty_new)
        oc = sum(1 for r in run if 'offCurve' in r['flags'])
        oc_new = sum(1 for r in run if 'offCurve' in r['flags']
                     and not (set(r['flags']) - {'offCurve'}) & dirty_old)
        print(f'{i + 1:3}  {run[0]["t"]:8.3f}-{run[-1]["t"]:8.3f}  {b[0]:5}  '
              f'{b[1]:3}/{b[2]:<5}  ->  {a[0]:5}  {a[1]:3}/{a[2]:<5}  {oc:3} ({oc_new} were clean)')
    if args.out:
        with open(args.out, 'w') as fh:
            fh.write(json.dumps(doc, indent=1))
        print(f'wrote {args.out}')


def parse_spans(text):
    spans = []
    for chunk in text.split(','):
        chunk = chunk.strip()
        if not chunk:
            continue
        a, _, b = chunk.partition('-')
        spans.append((float(a), float(b)))
    return spans


def team_main(args):
    files = sorted(glob.glob(os.path.join(args.frames, '*.png')))
    if not files:
        sys.exit(f'no frames in {args.frames}')
    lock_dir = args.lock_frames or args.frames
    lock_files = sorted(glob.glob(os.path.join(lock_dir, '*.png')))

    if args.bar:
        y0, y1, x0, x1 = (int(v) for v in args.bar.split(':'))
        band, extent = (y0, y1), (x0, x1)
        diag = {'source': 'explicit --bar'}
        gate_team_width(band, extent, '--bar')
    else:
        # ⚠ AUTO-LOCK FOOTGUN (2026-08-17): team_lock can self-calibrate onto a dark terrain edge
        # on solo footage (no team burst widget present). The width gate catches egregious misses,
        # but a terrain edge in the right pixel range passes silently. For reliable reads, always
        # pass --bar with the known bar coordinates. The maiden fixture gate in
        # scripts/tests/gauge-fill-anchor.test.ts validates the reader against the labeled anchor.
        print(
            'WARNING: auto-locking the bar region (no --bar passed). On solo footage this can '
            'lock onto a dark terrain edge instead of the gauge bar. Pass --bar y0:y1:x0:x1 for '
            'reliable reads.',
            file=sys.stderr,
        )
        band, extent, diag = team_lock(lock_files)

    spans = parse_spans(args.spans) if args.spans else None
    reads = []
    for i, f in enumerate(files):
        t = round(args.at + i / args.fps, 3)
        if spans is not None and not any(a <= t <= b for a, b in spans):
            continue
        img = np.array(Image.open(f).convert('RGB')).astype(int)
        state, fill, flags, d = read_team_fill(img, band, extent, diag=args.diag)
        read = {'t': t, 'state': state, 'fillRaw': fill, 'flags': flags}
        if d is not None:
            read['diag'] = d
        reads.append(read)
    # NOTE: the resolver mutates state/fillRaw/flags only — a read's `diag` (raw pre-classification
    # pixel measurements) survives artifact resolution untouched, which is the whole point of it.
    resolve_team_artifacts(reads)

    crop = None
    if args.crop:
        cw, ch, cx, cy = (int(v) for v in args.crop.split(':'))
        crop = {'w': cw, 'h': ch, 'x': cx, 'y': cy}
    bar = {
        'mode': 'team',
        'rows': [band[0], band[1]],
        'x0': extent[0],
        'x1': extent[1],
        'widthPx': extent[1] - extent[0] + 1,
        'lock': diag,
    }
    if crop:
        bar['crop'] = crop
        bar['absolute'] = {
            'rows': [crop['y'] + band[0], crop['y'] + band[1]],
            'x0': crop['x'] + extent[0],
            'x1': crop['x'] + extent[1],
        }
    result = {
        'mode': 'team',
        'fps': args.fps,
        'at': args.at,
        'spans': [list(s) for s in spans] if spans else None,
        'bar': bar,
        'reads': reads,
    }
    out = json.dumps(result, indent=1)
    if args.out:
        with open(args.out, 'w') as fh:
            fh.write(out)
        print(f'wrote {args.out}  team bar={bar["widthPx"]}px '
              f'rows={bar["rows"]} x={bar["x0"]}-{bar["x1"]}  frames={len(reads)}')
    else:
        print(out)


def main():
    ap = argparse.ArgumentParser(description='Burst-gauge FILL reader (CV worker)')
    ap.add_argument('--frames', help='directory of extracted PNG frames')
    ap.add_argument('--fps', type=float)
    ap.add_argument('--reflag', help='re-run ONLY the offCurve pass on an already-emitted team '
                                     'trace JSON (or a replay bundle containing one) and print '
                                     'the clean-set monotonicity census before/after. No frames '
                                     'needed; add --out to write the reflagged document.')
    ap.add_argument('--at', type=float, default=0.0)
    ap.add_argument('--calib-frame', type=int, default=None,
                    help='frame index used to self-calibrate bar geometry. Default: the first '
                         'frame that yields a plausible bar (skips dark load screens).')
    ap.add_argument('--team', action='store_true',
                    help='TEAM-HUD mode: explicit magenta-vote lock on the team burst widget. The '
                         'solo self-calibration mis-locks on team footage — see the module '
                         'docstring, TEAM MODE.')
    ap.add_argument('--lock-frames', help='[team] separate frame dir used ONLY for the lock. It '
                                          'must span at least one Full Burst (the lock keys on the '
                                          'magenta drain bar). Defaults to --frames.')
    ap.add_argument('--bar', help='[team] skip the lock and use an explicit "y0:y1:x0:x1" '
                                  '(inclusive, in crop coordinates). [solo] same 4-field form '
                                  'skips self-calibration: y1 is taken as the bar\'s dark border '
                                  'row, x0:x1 as its extent (x1-exclusive, as find_bar returns). '
                                  'Use when whole-frame self-calibration mis-locks (a bright-sky '
                                  'boss offers longer dark runs than the bar).')
    ap.add_argument('--crop', help='[team] the ffmpeg crop the frames came from, "w:h:x:y", so the '
                                   'reported lock can also be given in absolute frame coordinates.')
    ap.add_argument('--spans', help='[team] comma-separated "start-end" second ranges to emit, e.g. '
                                    '"22.0-26.2,35.6-39.8". Frames outside are read-skipped.')
    ap.add_argument('--diag', action='store_true',
                    help='[team] record raw pre-classification pixel measurements per frame '
                         '(diag = {fill, mag, red, green}) alongside the resolved read — the '
                         'opening-window observable. diag.fill on a non-charging render is NOT '
                         'gauge; see DIAG MODE in the module docstring.')
    ap.add_argument('--out')
    args = ap.parse_args()

    if args.reflag:
        return reflag_main(args)
    if not args.frames or args.fps is None:
        ap.error('--frames and --fps are required (unless using --reflag)')

    if args.team:
        return team_main(args)

    files = sorted(glob.glob(os.path.join(args.frames, '*.png')))
    if not files:
        sys.exit(f'no frames in {args.frames}')

    geom = None
    if args.bar:
        _by0, _by1, _bx0, _bx1 = (int(v) for v in args.bar.split(':'))
        geom = (_by1, _bx0, _bx1)  # solo read_fill wants (borderRow, x0, x1-exclusive)
    elif args.calib_frame is not None:
        img = np.array(Image.open(files[args.calib_frame]).convert('RGB')).astype(int)
        geom = find_bar(img)
        if geom is None:
            sys.exit(f'--calib-frame {args.calib_frame} has no detectable bar '
                     f'(a dark load screen cannot self-calibrate — pick a mid-fight frame)')
    else:
        for f in files:
            geom = find_bar(np.array(Image.open(f).convert('RGB')).astype(int))
            if geom is not None:
                break
        if geom is None:
            sys.exit('no frame yielded a detectable bar — check the crop region')

    row, x0, x1 = geom
    if x1 - x0 in (MIN_BAR_PX, MAX_BAR_PX):
        print(f'⚠ calibrated bar width {x1 - x0}px sits exactly on the '
              f'{"MIN" if x1 - x0 == MIN_BAR_PX else "MAX"}_BAR_PX bound — likely a mis-lock '
              f'(the intro fade can out-compete the real bar). Pass --calib-frame with a '
              f'mid-fight frame.', file=sys.stderr)
    reads = []
    for i, f in enumerate(files):
        img = np.array(Image.open(f).convert('RGB')).astype(int)
        state, fill = read_fill(img, row, x0, x1)
        reads.append({'t': round(args.at + i / args.fps, 2), 'state': state, 'fillRaw': fill})

    result = {
        'fps': args.fps,
        'at': args.at,
        'bar': {'borderRow': row, 'x0': x0, 'x1': x1, 'widthPx': x1 - x0},
        'calibration': {'rawOverTrue': RAW_OVER_TRUE,
                        'anchor': 'maiden-ice-rose docs/probes/tb2/tb2 3 maiden.MP4 '
                                  '(12.55%/pull, +9.1/+3.45 sub-steps, docs/data/burst-gauge.md)'},
        'reads': reads,
    }
    out = json.dumps(result, indent=1)
    if args.out:
        with open(args.out, 'w') as fh:
            fh.write(out)
        print(f'wrote {args.out}  bar={x1 - x0}px  frames={len(reads)}')
    else:
        print(out)


if __name__ == '__main__':
    main()
