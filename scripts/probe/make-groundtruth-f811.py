#!/usr/bin/env python3
"""Regenerate SG pellet ground-truth crops at f8-11 (shrinking, SEPARATED phase) instead of the
shot's PEAK frame (f3-4, where pellets OCCLUDE) -- Phase 1 Sec1.2 step 0,
docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md.

The original 6-shot ground truth (scratchpad/pellets/HANDOFF.md, 2026-07-26, main tree,
untracked) was hand-counted on make-groundtruth.py's PEAK-frame crops -- the frame the owner's
own pellet-lifecycle spec (2026-07-30) identifies as LEAST readable (pellets overlap at 2x size).
This script extracts the SAME 6 shots at 60fps (the lifecycle spec's own frame rate -- a fully
detected pellet spans exactly 13 native frames at 60fps sampling, no 30fps rounding), locates
each shot's t0 from the tracked white-pellet count crossing EVENT_MIN (matching read-pellets.ts's
own shot-debounce definition, so "t0" here means the same thing it means everywhere else in this
pipeline), and crops t0+8..t0+11 -- the "reliable" window per the lifecycle table.

Detection/tracking/localization is NOT reimplemented here -- it shells out to the already-
validated count-pellets.py (--locate structural, --temporal, --dump-tracks) via subprocess, the
same pattern scripts/probe/temporal-count-regression.py uses to drive the real script under test
rather than a parallel copy of its logic.

Run with the probe venv:
  scripts/probe/.venv/bin/python scripts/probe/make-groundtruth-f811.py \\
      docs/probes/clean-weapons/marciana-solo.MP4 --at 30 --dur 15 --zoom 2 \\
      --shot-times 31.73,32.88,33.50,34.27,36.48,37.82 \\
      --out scratchpad/pellets/groundtruth-f811
"""
import argparse
import json
import math
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
PY = sys.executable
COUNTER = HERE / 'count-pellets.py'

EVENT_MIN = 3  # matches read-pellets.ts's debounce / count-pellets.py's debounce_shots


def extract_frames(video, at, dur, zoom, out_dir):
    fps = 60  # the lifecycle spec's own rate -- a full pellet is exactly 13 frames at this fps
    vf = f'fps={fps},crop=1303:396:672:268'
    if zoom != 1:
        vf += f',scale=iw*{zoom}:ih*{zoom}'
    subprocess.run(
        ['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(at), '-t', str(dur),
         '-i', video, '-vf', vf, str(out_dir / 'f_%05d.png')],
        check=True,
    )
    files = sorted(out_dir.glob('f_*.png'))
    print(f'{len(files)} frames @ {fps}fps -> {out_dir}', file=sys.stderr)
    return files, fps


def run_counter(frames_dir, zoom, dump_tracks_path, locate='structural', ammo_template=None):
    cmd = [
        PY, str(COUNTER), str(frames_dir),
        '--temporal', '--locate', locate, '--backend', 'opencv',
        '--zoom', str(zoom),
        '--center-exclude', str(round(18 * zoom)),
        '--min-area', str(round(100 * (zoom / 4) ** 2)),
        '--max-area', str(round(3000 * (zoom / 4) ** 2)),
        '--min-circ', '0.55',
        '--pellet-radius', str(round(80 * zoom)),
        '--marker-radius', '65',
        '--max-pellet-frames', '13',  # 13 native frames at 60fps sampling == 1 game frame each
        '--dump-tracks', str(dump_tracks_path),
    ]
    if locate == 'template' and ammo_template:
        cmd += ['--ammo-template', str(ammo_template),
                '--ammo-offset-x', str(round(62.5 * zoom)), '--ammo-offset-y', str(round(-5.5 * zoom)),
                '--ammo-roi-x0', '0.55', '--ammo-roi-y0', '0.50']
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        print(proc.stderr, file=sys.stderr)
        raise SystemExit(f'count-pellets.py exited {proc.returncode}')
    with open(dump_tracks_path) as f:
        return json.load(f)


EXPECTED_LEAD = 4  # peak sits ~3-4 frames after a blast's t0 (lifecycle table: peak at f3-4)


def find_t0(frame_counts, approx_idx, before=20, after=6):
    """Onset (rising edge: total clears EVENT_MIN, previous frame did not) of the qualifying run
    closest to `approx_idx - EXPECTED_LEAD` within a narrow window.

    NOT "the first qualifying frame in a wide window" -- SG shots fire at ~1.5/s (~40 frames
    apart at 60fps), so a window wider than that risks locking onto an ADJACENT shot's onset
    instead of this one's (measured: an earlier +/-45-frame version of this function found a t0
    28 frames before a shot's known approx_idx -- a neighbouring real shot, not this one). Ranking
    onsets by distance to the expected peak-minus-lead position, in a window narrower than the
    inter-shot cadence, disambiguates.
    """
    target = approx_idx - EXPECTED_LEAD
    lo = max(0, approx_idx - before)
    hi = min(len(frame_counts), approx_idx + after)
    onsets = []
    for i in range(lo, hi):
        tot = frame_counts[i]['white'] + frame_counts[i]['red']
        prev_tot = (frame_counts[i - 1]['white'] + frame_counts[i - 1]['red']) if i > 0 else 0
        if tot >= EVENT_MIN and prev_tot < EVENT_MIN:
            onsets.append(i)
    if not onsets:
        return None
    return min(onsets, key=lambda i: abs(i - target))


def crop_disc(im, cx, cy, rad, scale):
    cx, cy = int(cx), int(cy)
    x0, y0 = max(cx - rad, 0), max(cy - rad, 0)
    cr = im[y0:cy + rad, x0:cx + rad]
    if cr.size == 0:
        return np.zeros((rad * 2, rad * 2, 3), np.uint8)
    return cv2.resize(cr, (cr.shape[1] * scale, cr.shape[0] * scale), interpolation=cv2.INTER_NEAREST)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('video')
    ap.add_argument('--at', type=float, default=30)
    ap.add_argument('--dur', type=float, default=15)
    ap.add_argument('--zoom', type=int, default=2)
    ap.add_argument('--shot-times', required=True,
                     help='comma-separated video times (s) of each shot, from the existing hand-count table')
    ap.add_argument('--out', default='scratchpad/pellets/groundtruth-f811')
    ap.add_argument('--locate', choices=['structural', 'template'], default='structural',
                     help='crosshair localization method (default structural, per Phase 2A). '
                          'template is a fallback for a shot whose structural lock mislocks '
                          '(needs --ammo-template).')
    ap.add_argument('--ammo-template', default=str(HERE / 'ammo-box-template.png'))
    args = ap.parse_args()

    out = Path(args.out)
    frames_dir = out / 'frames'
    out.mkdir(parents=True, exist_ok=True)
    frames_dir.mkdir(exist_ok=True)

    files, fps = extract_frames(args.video, args.at, args.dur, args.zoom, frames_dir)
    dump_path = out / 'tracks.json'
    data = run_counter(frames_dir, args.zoom, dump_path, args.locate, args.ammo_template)
    frame_counts = data['frame_counts']
    cross = data['cross_positions']
    pellet_r = data['params']['pellet_radius']

    manifest = []
    for si, t in enumerate([float(x) for x in args.shot_times.split(',') if x.strip()]):
        approx_idx = int(round((t - args.at) * fps))
        t0 = find_t0(frame_counts, approx_idx)
        shot_dir = out / f'shot{si:02d}'
        shot_dir.mkdir(exist_ok=True)
        entry = {'shot': si, 'video_t': t, 'approx_idx': approx_idx, 't0': t0, 'crops': []}
        if t0 is None:
            print(f'shot{si:02d} t={t}s: no t0 found (no EVENT_MIN-clearing frame near approx_idx={approx_idx}) '
                  '-- likely the false-positive shot; recording as such', file=sys.stderr)
            manifest.append(entry)
            continue
        t0_pos = cross[t0] if t0 < len(cross) else None
        for offset in range(8, 12):  # f8..f11 (0-indexed from t0)
            fi = t0 + offset
            if fi >= len(files) or fi >= len(cross) or not cross[fi]:
                continue
            cx, cy = cross[fi]
            # Reject a frame whose crosshair jumped far from t0's position -- a jump this size
            # inside one blast (~0.2s) means the structural locator lost the real ammo box and
            # grabbed a decoy (e.g. a floating multi-digit damage-number stack briefly matching
            # the digit-row shape gate), NOT a moving aim point. Measured: exactly this pattern
            # produced a garbage crop (no crosshair/pellets, just damage-number text) on one of
            # the 6 shots -- see this file's own commit message / the plan doc's step-0 note.
            # MAX_TEMPLATE_DISP (150 zoomed px) is the same bound the live pipeline uses
            # everywhere else for "the box moves smoothly, a jump this big is a false lock."
            if t0_pos and math.hypot(cx - t0_pos[0], cy - t0_pos[1]) > 150:
                entry.setdefault('rejected', []).append({
                    'offset': offset, 'frame_idx': fi, 'reason': 'crosshair jumped from t0',
                    'dx': cx - t0_pos[0], 'dy': cy - t0_pos[1],
                })
                continue
            im = cv2.imread(str(files[fi]))
            crop = crop_disc(im, cx, cy, int(pellet_r * 1.15), 3)
            fname = f'f{offset:02d}_idx{fi:04d}.png'
            cv2.imwrite(str(shot_dir / fname), crop)
            entry['crops'].append({
                'offset': offset, 'frame_idx': fi, 'file': str(shot_dir / fname),
                'white': frame_counts[fi]['white'], 'red': frame_counts[fi]['red'],
            })
        manifest.append(entry)
        print(f'shot{si:02d} t={t}s: t0=idx{t0} ({len(entry["crops"])} crops) -> {shot_dir}', file=sys.stderr)

    with open(out / 'manifest.json', 'w') as f:
        json.dump(manifest, f, indent=2)
    print(f'wrote manifest -> {out / "manifest.json"}', file=sys.stderr)


if __name__ == '__main__':
    main()
