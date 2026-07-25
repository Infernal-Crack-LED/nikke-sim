#!/usr/bin/env python3
"""Deterministic CV scan worker for NIKKE probe recordings — NO VLM.

Four detectors over frame directories that `scan.ts` extracts in ONE ffmpeg pass:

  1. GAUGE STATE (burst-indicator widget, 188x82 @ 2428,448)
     What this crop ACTUALLY renders (measured on "13 fb count wind weak", 2026-07-24 — the
     widget is absent entirely between cycles, so most frames are empty):
       a) the burst CHAIN, as a coloured STAGE HEXAGON at the crop's left edge, ~0.4s each:
            green hexagon "I"   -> "stage1"
            yellow hexagon "II" -> "stage2"
            red hexagon "III"   -> "stage3"   (the Full Burst follows this cast)
       b) the FULL BURST window, as a magenta bar that resets to ~full at the burst and
          DRAINS MONOTONICALLY to zero over ~8.5s of rendered width -> "full".
          This is the owner's "blinking, draining red bar with NO numeral".
     The burst gauge CHARGING is not in this crop, so no "filling" state is emitted — a CV
     classifier reports what is on screen and invents nothing. (A white "BURST" ready banner
     does appear before each chain; its whiteness is recorded as a metric, not a state,
     because white HUD text is not specific enough to key a state off.)

     TWO features, two failure modes, so both are extracted:
       HEXAGON — a saturated blob confined to the left HEX_FRAC of the crop. Stage hexagons
         read 0.22-0.30 of that sub-region vs <=0.12 background, so a 0.15 floor separates
         them 2x over. A screen-wide colour wash (explosion, golden splash) also fills the
         sub-region, so a CONCENTRATION gate is required: a real hexagon puts nearly all its
         colour in the left region (hex/whole >= 1/HEX_FRAC, i.e. ~3.6), a wash spreads it
         evenly (ratio ~1). HEX_CONC = 2.0 sits between them.
       DRAIN WINDOW — the fill time series. A reset (jump up >= RESET_JUMP, or the bar
         appearing at >= WINDOW_START_FILL) begins a Full Burst; the window ends when the bar
         is gone for GAP_TOL. This is a ~8.5s-long signal, so unlike the 0.4s hexagon it
         cannot be missed by sampling rate — it is the sturdiest FB instrument here, and its
         DURATION is a free measurement of Full-Burst extensions.

  2. FB SPLASH (whole frame, 64x30 downscale)
     Yellow fraction (r>150, g>120, b<120, r+g>2b+100) >= 0.11, candidates <10s apart
     rejected. MEASURED CALIBRATION (2026-07-14, 9-team batch) — do not refit.

  3. BURST BAR / SOLO METER (200x14 @ 2420,478 / 142x12 @ 2470,488)
     White-fill rows 6-8 > 150 -> fill percentage; deduped >=95% -> <50% drops.
     ⚠ These two crops are SUB-STRIPS OF THE GAUGE CROP (188x82 @ 2428,448 spans x 2428-2616,
     y 448-530), so they are NOT an independent instrument — they re-measure the same drain
     bar at coarser granularity, and their "drop" fires when the drain crosses 50% rather
     than at the burst. Kept as a diagnostic (and for odd resolutions where the gauge crop
     misses), NOT counted toward Full-Burst confidence. Detector 1's drain window supersedes.

  4. NUKE / LASER (whole frame, 64x30)
     Blue dominance (b>150, b>r+30) > 25% of frame — the cindy-class signature.

Usage:
  scan-frames.py --fps N [--at S] [--gauge-dir D] [--splash-dir D] [--bar-dir D]
                 [--solo-dir D] [--debug-dir D] [--out FILE]

Output: JSON (stdout, or --out) with per-frame metrics + per-detector candidate events.
Merging the detectors into one FB list is `scan.ts`'s job.
"""
import argparse
import json
import math
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image

# ---- measured thresholds (see module docstring; treat as calibrations) ----
HEX_FRAC = 0.28          # left fraction of the gauge crop that holds the stage hexagon
HEX_MIN = 0.15           # min colour-mask fraction inside the hexagon region for a stage call
HEX_CONC = 2.0           # min hexRegion/wholeCrop colour ratio — rejects screen-wide washes
FILL_MIN = 0.02          # bar-present floor (fraction of bar columns carrying magenta)
RESET_JUMP = 0.25        # a rise this large mid-window starts a NEW Full Burst
WINDOW_START_FILL = 0.5  # a bar appearing at least this full starts a window
GAP_TOL = 1.0            # s the bar may vanish (cut-in occlusion) without ending a window
WINDOW_MIN = 3.0         # s — shorter "windows" are flicker, not a Full Burst
SPLASH_YELLOW = 0.11     # whole-frame 64x30 yellow fraction for a Full Burst splash
SPLASH_MIN_GAP = 10.0    # s — real full bursts are 13-34s apart; cut-in echoes cluster ~7s
NUKE_BLUE = 0.25         # whole-frame blue dominance for a nuke/laser
BAR_BRIGHT = 150         # per-column brightness floor for "filled" in the burst bar
BAR_FULL = 95.0          # % fill that counts as a full bar
BAR_EMPTY = 50.0         # % fill that counts as consumed
BAR_DEDUPE = 4.0         # s


def load_rgb(path):
    return np.array(Image.open(path).convert('RGB')).astype(np.int16)


def frame_files(d):
    p = Path(d)
    if not p.is_dir():
        return []
    return sorted(str(f) for f in p.iterdir() if f.suffix.lower() in ('.png', '.jpg', '.jpeg'))


def frame_time(path, fps, at):
    """f_00001.png -> at + (idx-1)/fps (ffmpeg numbers its output from 1)."""
    digits = ''.join(ch for ch in Path(path).stem if ch.isdigit())
    idx = int(digits) if digits else 1
    return round(at + (idx - 1) / fps, 4)


# ============================================================
# 1. Gauge state
# ============================================================
def gauge_masks(img):
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    green = (g > r + 35) & (g > b + 35) & (g > 90)
    yellow = (r > 150) & (g > 120) & (b < 130) & (np.abs(r - g) < 90) & (r > b + 70)
    red = (r > 150) & (g < 115) & (b < 115) & (r > b + 80) & (r > g + 80)
    # the charging fill is MAGENTA (high R, high B, low G) — distinct from the red hexagon
    magenta = (r > 150) & (g < 120) & (b > 110) & (b > g + 40)
    return green, yellow, red, magenta


def gauge_frame(img):
    h, w = img.shape[:2]
    hw = max(1, int(round(w * HEX_FRAC)))
    hg, hy, hr, _ = gauge_masks(img[:, :hw])
    hex_g, hex_y, hex_r = float(hg.mean()), float(hy.mean()), float(hr.mean())

    wg, wy, wr, mag = gauge_masks(img)
    whole_g, whole_y, whole_r = float(wg.mean()), float(wy.mean()), float(wr.mean())
    flood = whole_y

    # fill fraction: share of BAR columns (right of the hexagon) carrying magenta fill
    bar = mag[:, hw:]
    fill = float((bar.any(axis=0)).mean()) if bar.size else 0.0
    white = float(((img[..., 0] > 200) & (img[..., 1] > 200) & (img[..., 2] > 200)).mean())

    def hexagon(hex_frac, whole_frac):
        # a real hexagon concentrates its colour in the left region; a screen-wide wash does not
        return hex_frac >= HEX_MIN and hex_frac >= HEX_CONC * whole_frac

    state = None
    cands = []
    if hexagon(hex_g, whole_g):
        cands.append((hex_g, 'stage1'))
    if hexagon(hex_y, whole_y):
        cands.append((hex_y, 'stage2'))
    if hexagon(hex_r, whole_r):
        cands.append((hex_r, 'stage3'))
    if cands:
        state = max(cands)[1]
    elif fill > FILL_MIN:
        state = 'full'
    return {
        'state': state,
        'fill': round(fill, 3),
        'hexG': round(hex_g, 3),
        'hexY': round(hex_y, 3),
        'hexR': round(hex_r, 3),
        'wholeG': round(whole_g, 3),
        'wholeY': round(whole_y, 3),
        'wholeR': round(whole_r, 3),
        'flood': round(flood, 3),
        'white': round(white, 3),
    }


def full_windows(frames):
    """Full Burst windows from the drain bar: a reset starts one, the bar vanishing ends it."""
    windows, cur = [], None

    def close(end_t, end_fill):
        if cur and end_t - cur['start'] >= WINDOW_MIN:
            cur['end'] = end_t
            cur['durationSec'] = round(end_t - cur['start'], 2)
            cur['endFill'] = end_fill
            windows.append(cur)

    for f in frames:
        t, fill = f['t'], f['fill']
        if fill <= FILL_MIN:
            if cur and t - cur['last'] > GAP_TOL:
                close(cur['last'], cur['lastFill'])
                cur = None
            continue
        if cur is None:
            cur = {'start': t, 'startFill': fill, 'peakFill': fill, 'last': t, 'lastFill': fill,
                   'partial': fill < WINDOW_START_FILL}
        elif fill - cur['lastFill'] >= RESET_JUMP:
            close(cur['last'], cur['lastFill'])
            cur = {'start': t, 'startFill': fill, 'peakFill': fill, 'last': t, 'lastFill': fill,
                   'partial': fill < WINDOW_START_FILL}
        else:
            cur['peakFill'] = max(cur['peakFill'], fill)
        cur['last'], cur['lastFill'] = t, fill
    if cur:
        close(cur['last'], cur['lastFill'])
    return windows


STAGE_KEY = {'stage1': 'hexG', 'stage2': 'hexY', 'stage3': 'hexR'}


def gauge_events(frames, min_gap=1.0):
    """One event per contiguous run of a stage state (hexagons persist 0.3-0.5s)."""
    events = []
    last = {}
    for f in frames:
        st = f['state']
        if st not in STAGE_KEY:
            continue
        prev = last.get(st)
        last[st] = f['t']
        if prev is not None and f['t'] - prev < min_gap:
            continue
        events.append({'t': f['t'], 'state': st, 'strength': f[STAGE_KEY[st]]})
    return events


# ============================================================
# 2 + 4. Whole-frame splash / nuke
# ============================================================
def splash_frame(img):
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    yellow = (r > 150) & (g > 120) & (b < 120) & (r + g > 2 * b + 100)
    blue = (b > 150) & (b > r + 30)
    return float(yellow.mean()), float(blue.mean())


def peak_events(frames, key, thresh, min_gap):
    """Cluster consecutive over-threshold frames; keep the PEAK frame of each cluster."""
    events, cluster = [], []
    for f in frames:
        if f[key] >= thresh:
            cluster.append(f)
        elif cluster:
            events.append(max(cluster, key=lambda x: x[key]))
            cluster = []
    if cluster:
        events.append(max(cluster, key=lambda x: x[key]))
    out = []
    for e in events:
        if out and e['t'] - out[-1]['t'] < min_gap:
            # keep the stronger of two too-close candidates (cut-in echo rejection)
            if e[key] > out[-1][key]:
                out[-1] = e
            continue
        out.append(e)
    return [{'t': e['t'], key: round(e[key], 4)} for e in out]


# ============================================================
# 3. Burst bar
# ============================================================
def bar_frame(img, rows=(6, 9)):
    h = img.shape[0]
    r0, r1 = min(rows[0], h - 1), min(rows[1], h)
    strip = img[r0:r1]
    bright = strip.mean(axis=2) > BAR_BRIGHT
    cols = bright.any(axis=0)
    return round(float(cols.mean()) * 100.0, 1)


def bar_events(frames):
    """A Full Burst consumes the bar: a >=BAR_FULL -> <BAR_EMPTY drop."""
    events = []
    armed = False
    for f in frames:
        if f['fillPct'] >= BAR_FULL:
            armed = True
        elif armed and f['fillPct'] < BAR_EMPTY:
            if not events or f['t'] - events[-1]['t'] >= BAR_DEDUPE:
                events.append({'t': f['t'], 'fillPct': f['fillPct']})
            armed = False
    return events


# ============================================================
def save_debug(path, img, label):
    import cv2
    out = cv2.cvtColor(img.astype(np.uint8), cv2.COLOR_RGB2BGR)
    scale = max(1, int(320 / max(1, out.shape[1])))
    if scale > 1:
        out = cv2.resize(out, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST)
    cv2.putText(out, label, (4, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
    cv2.imwrite(path, out)


def main():
    global HEX_MIN
    ap = argparse.ArgumentParser(description='Deterministic CV scan worker for probe recordings')
    ap.add_argument('--fps', type=float, required=True)
    ap.add_argument('--at', type=float, default=0.0)
    ap.add_argument('--gauge-dir')
    ap.add_argument('--splash-dir')
    ap.add_argument('--bar-dir')
    ap.add_argument('--solo-dir')
    ap.add_argument('--debug-dir')
    ap.add_argument('--out')
    ap.add_argument('--hex-min', type=float, default=HEX_MIN)
    ap.add_argument('--splash-yellow', type=float, default=SPLASH_YELLOW)
    ap.add_argument('--min-gap', type=float, default=SPLASH_MIN_GAP)
    args = ap.parse_args()
    HEX_MIN = args.hex_min

    if args.debug_dir:
        os.makedirs(args.debug_dir, exist_ok=True)

    result = {
        'fps': args.fps,
        'at': args.at,
        'thresholds': {
            'hexMin': HEX_MIN, 'hexFrac': HEX_FRAC, 'splashYellow': args.splash_yellow,
            'minGap': args.min_gap, 'nukeBlue': NUKE_BLUE,
            'barBright': BAR_BRIGHT, 'barFull': BAR_FULL, 'barEmpty': BAR_EMPTY,
        },
    }

    # --- gauge ---
    gf = frame_files(args.gauge_dir) if args.gauge_dir else []
    if gf:
        frames = []
        for f in gf:
            img = load_rgb(f)
            m = gauge_frame(img)
            m['t'] = frame_time(f, args.fps, args.at)
            frames.append(m)
            if args.debug_dir and m['state'] in ('stage1', 'stage2', 'stage3'):
                save_debug(os.path.join(args.debug_dir, f'gauge_{m["t"]:.2f}_{m["state"]}.png'),
                           img, f'{m["state"]} {m["t"]:.2f}')
        result['gauge'] = {
            'frames': frames,
            'events': gauge_events(frames),
            'fullWindows': full_windows(frames),
        }

    # --- whole-frame splash + nuke ---
    sf = frame_files(args.splash_dir) if args.splash_dir else []
    if sf:
        frames = []
        for f in sf:
            y, b = splash_frame(load_rgb(f))
            frames.append({'t': frame_time(f, args.fps, args.at), 'yellow': round(y, 4), 'blue': round(b, 4)})
        result['splash'] = {
            'frames': frames,
            'events': peak_events(frames, 'yellow', args.splash_yellow, args.min_gap),
        }
        result['nuke'] = {'events': peak_events(frames, 'blue', NUKE_BLUE, args.min_gap)}

    # --- burst bar / solo meter ---
    for key, d in (('bar', args.bar_dir), ('solo', args.solo_dir)):
        ff = frame_files(d) if d else []
        if not ff:
            continue
        frames = [{'t': frame_time(f, args.fps, args.at), 'fillPct': bar_frame(load_rgb(f))} for f in ff]
        result[key] = {'frames': frames, 'events': bar_events(frames)}

    text = json.dumps(result)
    if args.out:
        with open(args.out, 'w') as fh:
            fh.write(text)
        counts = {k: len(v.get('events', [])) for k, v in result.items() if isinstance(v, dict) and 'events' in v}
        print(f'wrote {args.out}  events: {counts}', file=sys.stderr)
    else:
        print(text)


if __name__ == '__main__':
    main()
