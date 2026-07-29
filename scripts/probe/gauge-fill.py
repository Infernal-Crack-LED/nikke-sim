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

CALIBRATION STATUS — NOT YET SETTLED (2026-07-29). READ BEFORE QUOTING AN ABSOLUTE VALUE.
-----------------------------------------------------------------------------------------
Scored against the repo's own labeled anchor — the 2026-07-13 hand pixel reads in
docs/data/burst-gauge.md section 6, made long before any of these scripts existed and therefore
independent of them:

  maiden-ice-rose (docs/probes/tb2/tb2 3 maiden.MP4): documented 12.55%/pull in two sub-steps
  of +9.1% then +3.45%.

At --fps 5 the magnitude was method-dependent and even changed SIGN (+6.4% by summing paired
sub-steps, -2.8% by endpoint/pull-count), because a two-sub-step pull smears across samples and
"how many pulls occurred" becomes ambiguous. Re-running at --fps 30 resolves the structure and
gives a stable, and more interesting, answer.

At --fps 30 over 6 complete pulls (cadence a regular 1.37s, reload gap at t=14.03-17.20):

  sub-step        model    measured here
  rider  (small)   3.64        3.63       <- EXACT
  weapon (big)     9.1        10.1        <- +11%
  per pull        12.74       13.76

The small sub-step matching the model to two decimals means this worker's ABSOLUTE SCALE IS
CORRECT — the discrepancy is not a calibration factor and must not be papered over with one.
The large sub-step specifically reads ~11% high. Two live hypotheses, UNRESOLVED as of
2026-07-29: (a) the weapon sub-step genuinely generates more than the modelled 910 energy,
which would put a documented measured constant in question, or (b) a large jump's rise spans
more than one sampled frame and an intermediate value inflates the measured step.

CONSEQUENCE FOR CALLERS: trustworthy for SHAPE (step timing, cadence, pull counting,
filling-vs-full state) and for SMALL sub-steps. Do NOT derive an engine constant from a large
step's magnitude until (a) vs (b) is settled — that question is gated by /scientific-method.

usage: gauge-fill.py --frames <dir> --fps <n> [--at <s>] [--calib-frame <i>] [--out <file>]
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

RAW_OVER_TRUE = 1.064  # measured over-read vs the maiden-ice-rose anchor (see CALIBRATION)


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


def main():
    ap = argparse.ArgumentParser(description='Burst-gauge FILL reader (CV worker)')
    ap.add_argument('--frames', required=True, help='directory of extracted PNG frames')
    ap.add_argument('--fps', type=float, required=True)
    ap.add_argument('--at', type=float, default=0.0)
    ap.add_argument('--calib-frame', type=int, default=None,
                    help='frame index used to self-calibrate bar geometry. Default: the first '
                         'frame that yields a plausible bar (skips dark load screens).')
    ap.add_argument('--out')
    args = ap.parse_args()

    files = sorted(glob.glob(os.path.join(args.frames, '*.png')))
    if not files:
        sys.exit(f'no frames in {args.frames}')

    geom = None
    if args.calib_frame is not None:
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
