#!/usr/bin/env python3
"""Extract a per-video ammo-box template for the SG pellet counter.

The live ammo box is a dark rectangular HUD element at the bottom-right of the
action crop, containing 1-3 bright digits. It is visually similar across SG
units but its exact glyph style / surrounding VFX differs enough that a single
global template (tuned on marciana) produces false-positive locks on other
units. This script bootsraps a dedicated template from the input video itself.

Usage:
  python3 scripts/probe/extract-ammo-template.py <video> --out <png>
    [--seed-template <png>] [--frames N] [--fps F] [--crop W:H:X:Y]
    [--roi-x0 f] [--roi-y0 f] [--zoom Z]

It extracts N sparse frames from the video, restricts template matching to the
bottom-right ROI where the ammo box lives, picks the frame/scale with the
highest normalized correlation to the seed template, and writes the matched
region as the per-video template.
"""
import argparse, os, subprocess, sys, tempfile
import cv2
import numpy as np
from pathlib import Path


def load_rgb(path: str) -> np.ndarray:
    return cv2.cvtColor(cv2.imread(path), cv2.COLOR_BGR2RGB)


def extract_frames(video: str, crop: str, zoom: int, fps: int, n: int, tmpdir: str):
    """Extract n evenly-spaced frames from the first half of the video."""
    # Get duration via ffprobe
    probe = subprocess.run(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
         '-of', 'default=noprint_wrappers=1:nokey=1', video],
        capture_output=True, text=True
    )
    try:
        dur = float(probe.stdout.strip())
    except ValueError:
        dur = 0.0
    if not dur or dur <= 0:
        dur = 60.0
    # Sample from t=3s (skip loading screen) up to min(dur/2, 30s)
    t0 = 3.0
    t1 = min(dur * 0.5, 30.0)
    if t1 <= t0:
        t1 = t0 + 10.0
    times = np.linspace(t0, t1, n)
    files = []
    vf = f'fps={fps},{crop}'
    if zoom != 1:
        vf += f',scale=iw*{zoom}:ih*{zoom}'
    for i, t in enumerate(times):
        out = os.path.join(tmpdir, f'frame_{i:03d}.png')
        subprocess.run(
            ['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(t), '-i', video,
             '-vf', vf, '-frames:v', '1', out],
            check=False
        )
        if os.path.exists(out):
            files.append(out)
    return files


def best_match(frame: np.ndarray, tmpl: np.ndarray, roi_x0: float, roi_y0: float):
    """Return best template match restricted to bottom-right ROI."""
    h, w = frame.shape[:2]
    x0 = int(w * roi_x0)
    y0 = int(h * roi_y0)
    roi = frame[y0:h, x0:w]
    if roi.shape[0] < tmpl.shape[0] or roi.shape[1] < tmpl.shape[1]:
        return None
    res = cv2.matchTemplate(roi, tmpl, cv2.TM_CCOEFF_NORMED)
    _, conf, _, loc = cv2.minMaxLoc(res)
    abs_loc = (loc[0] + x0, loc[1] + y0)
    return {
        'conf': float(conf),
        'loc': abs_loc,
        'roi': roi,
        'loc_in_roi': loc,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('video')
    parser.add_argument('--out', required=True)
    parser.add_argument('--seed-template',
                        default=os.path.join(os.path.dirname(__file__), 'ammo-box-template.png'))
    parser.add_argument('--frames', type=int, default=8)
    parser.add_argument('--fps', type=int, default=1)
    parser.add_argument('--crop', default='crop=1303:396:672:268')
    parser.add_argument('--roi-x0', type=float, default=0.55)
    parser.add_argument('--roi-y0', type=float, default=0.50)
    parser.add_argument('--zoom', type=int, default=2)
    parser.add_argument('--pad', type=int, default=4,
                        help='extra pixels around the seed-template bbox to keep')
    args = parser.parse_args()

    seed = cv2.imread(args.seed_template)
    if seed is None:
        print(f'error: could not load seed template {args.seed_template}', file=sys.stderr)
        sys.exit(1)
    sh, sw = seed.shape[:2]

    with tempfile.TemporaryDirectory() as tmpdir:
        frames = extract_frames(args.video, args.crop, args.zoom, args.fps, args.frames, tmpdir)
        if not frames:
            print('error: no frames extracted', file=sys.stderr)
            sys.exit(1)

        best = None
        for fpath in frames:
            frame = load_rgb(fpath)
            m = best_match(frame, seed, args.roi_x0, args.roi_y0)
            if m is None:
                continue
            if best is None or m['conf'] > best['conf']:
                best = {**m, 'frame': fpath}

        if best is None or best['conf'] < 0.25:
            print(f'error: no reliable ammo-box match found (best conf={best["conf"] if best else None})',
                  file=sys.stderr)
            sys.exit(1)

        # Crop the matched region with a little padding; if the seed template is
        # larger than the true box, the padding lets the live template see the
        # same context the seed had.
        frame = load_rgb(best['frame'])
        x, y = best['loc']
        x0 = max(0, x - args.pad)
        y0 = max(0, y - args.pad)
        x1 = min(frame.shape[1], x + sw + args.pad)
        y1 = min(frame.shape[0], y + sh + args.pad)
        tmpl = frame[y0:y1, x0:x1]

        os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
        cv2.imwrite(args.out, cv2.cvtColor(tmpl, cv2.COLOR_RGB2BGR))
        print(f'extracted {tmpl.shape[1]}x{tmpl.shape[0]} template from {best["frame"]} '
              f'loc={best["loc"]} conf={best["conf"]:.3f} -> {args.out}')


if __name__ == '__main__':
    main()
