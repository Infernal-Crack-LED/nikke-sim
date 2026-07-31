#!/usr/bin/env python3
"""Score a pellet detector/counter against synthetic labeled sequences — Phase 1 §1.2 step 5,
docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md.

Metrics (the ISBI Particle-Tracking-Challenge pair the reference fields select on, plus the
phase-resolved recall Phase 3's exit criterion needs):

  - Jaccard / F1 (position-level, per frame): predicted pellet-track positions vs true pellet
    positions, greedy-matched within a distance tolerance. TP/FP/FN -> Jaccard = TP/(TP+FP+FN),
    F1 = 2TP/(2TP+FP+FN).
  - Count RMSE: the pipeline's f8-11 mean count vs the sequence's true pellet count, over all
    sequences.
  - Phase-resolved recall: TP/true_n_pellets broken out by lifecycle offset (1-13) -- shows WHERE
    in the lifecycle a candidate under- or over-detects (the peak f3-4 occlusion window vs the
    f8-11 "reliable" window is exactly the thing this whole plan is trying to separate).

The candidate under test is the SAME count-pellets.py this repo already ships (--temporal, the
settled filter defaults), fed a --crosshair-file built from the labels' KNOWN crosshair position
-- this deliberately removes localization from the score (Phase 2A is a separate, already-solved
problem) so the number isolates DETECTION/COUNTING accuracy, which is what §1.2/Phase 2/Phase 3
are about.

Run with the probe venv:
  scripts/probe/.venv/bin/python scripts/probe/score-pellets.py \\
      --labels scratchpad/pellets/synthetic-v2/labels.json
  scripts/probe/.venv/bin/python scripts/probe/score-pellets.py --selftest
"""
import argparse
import json
import math
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PY = sys.executable
COUNTER = HERE / 'count-pellets.py'

DIST_TOLERANCE = 20  # zoomed px -- roughly a pellet radius at 1x-2x size; ISBI-style match gate


def png_dims(path):
    import struct
    with open(path, 'rb') as f:
        f.seek(16)
        w, h = struct.unpack('>II', f.read(8))
    return w, h


def run_counter_on_sequence(seq, tmp_dir):
    frames_dir = Path(seq['frames_dir'])
    w, h = png_dims(frames_dir / seq['frames'][0])
    cx, cy = seq['crosshair']
    crosshair_file = tmp_dir / f"cross_{seq['seq']}.json"
    crosshair_file.write_text(json.dumps({
        f: {'x': round(cx / w * 1000), 'y': round(cy / h * 1000)} for f in seq['frames']
    }))
    tracks_out = tmp_dir / f"tracks_{seq['seq']}.json"
    cmd = [
        PY, str(COUNTER), str(frames_dir),
        '--temporal', '--backend', 'opencv',
        '--crosshair-file', str(crosshair_file),
        '--center-exclude', str(seq['center_exclude']),
        '--min-area', '25', '--max-area', '750', '--min-circ', '0.55',
        '--pellet-radius', str(seq['pellet_radius']), '--marker-radius', '65',
        '--max-pellet-frames', '13',
        '--dump-tracks', str(tracks_out),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        print(proc.stderr, file=sys.stderr)
        raise SystemExit(f'count-pellets.py exited {proc.returncode} on seq{seq["seq"]}')
    return json.loads(tracks_out.read_text())


def match_greedy(pred_pts, true_pts, tol=DIST_TOLERANCE):
    """Greedy nearest-neighbor bipartite matching within `tol`. Returns (tp, fp, fn)."""
    pred = list(pred_pts)
    true = list(true_pts)
    pairs = []
    for i, p in enumerate(pred):
        for j, t in enumerate(true):
            d = math.hypot(p[0] - t[0], p[1] - t[1])
            if d <= tol:
                pairs.append((d, i, j))
    pairs.sort()
    used_p, used_t = set(), set()
    tp = 0
    for d, i, j in pairs:
        if i in used_p or j in used_t:
            continue
        used_p.add(i)
        used_t.add(j)
        tp += 1
    fp = len(pred) - len(used_p)
    fn = len(true) - len(used_t)
    return tp, fp, fn


def score_sequence(seq, dump):
    """Per-offset (1..13) TP/FP/FN from the pipeline's pellet-classified track positions vs the
    sequence's true (fixed) pellet positions, plus the f8-11 mean count for RMSE.

    Filters candidate tracks by distance from the crosshair (<= pellet_radius), matching what the
    real per-frame white/red COUNT does (count-pellets.py's build_tracks_and_counts applies this
    windowing when it builds frame_results, but `is_pellet` on a raw track does NOT -- it is a
    lifetime classification only, computed over the WHOLE frame). Without this filter, static
    background clutter far from the crosshair (HUD text, title elements) gets counted as a
    spurious detection at every single offset -- caught by a suspiciously EXACT-across-all-13-
    offsets false-positive count before this fix (constant `fp` regardless of offset is not a
    real detection pattern; real pellets' detectability varies by lifecycle phase)."""
    tracks = dump['tracks']
    n_frames = len(seq['frames'])
    cx, cy = seq['crosshair']
    radius = seq['pellet_radius']
    per_offset = []
    for fi in range(n_frames):
        offset = fi + 1
        pred_pts = [(t['xs'][fi - t['first']], t['ys'][fi - t['first']])
                    for t in tracks
                    if t['is_pellet'] and not t['is_red'] and t['first'] <= fi <= t['last']]
        pred_pts = [p for p in pred_pts if math.hypot(p[0] - cx, p[1] - cy) <= radius]
        tp, fp, fn = match_greedy(pred_pts, seq['positions'])
        per_offset.append({'offset': offset, 'tp': tp, 'fp': fp, 'fn': fn, 'pred': len(pred_pts)})
    f8_11 = [o['pred'] for o in per_offset if 8 <= o['offset'] <= 11]
    mean_count = sum(f8_11) / len(f8_11) if f8_11 else 0.0
    return per_offset, mean_count


def run(args):
    labels = json.loads(Path(args.labels).read_text())
    tmp_dir = Path(args.labels).parent / '_score_tmp'
    tmp_dir.mkdir(exist_ok=True)

    all_offsets = {}  # offset -> [tp, fp, fn] accumulators
    count_errs = []
    per_seq_report = []
    for seq in labels['sequences']:
        dump = run_counter_on_sequence(seq, tmp_dir)
        per_offset, mean_count = score_sequence(seq, dump)
        err = mean_count - seq['n_pellets']
        count_errs.append(err)
        for o in per_offset:
            acc = all_offsets.setdefault(o['offset'], [0, 0, 0])
            acc[0] += o['tp']
            acc[1] += o['fp']
            acc[2] += o['fn']
        per_seq_report.append({
            'seq': seq['seq'], 'video': seq['video'], 'n_pellets': seq['n_pellets'],
            'f8_11_mean_count': round(mean_count, 2), 'error': round(err, 2),
        })
        print(f"  seq{seq['seq']:04d} [{seq['video']}] true={seq['n_pellets']} "
              f"f8-11_mean={mean_count:.2f} err={err:+.2f}", file=sys.stderr)

    count_rmse = math.sqrt(sum(e * e for e in count_errs) / len(count_errs)) if count_errs else None

    phase_report = {}
    overall_tp = overall_fp = overall_fn = 0
    for offset in sorted(all_offsets):
        tp, fp, fn = all_offsets[offset]
        overall_tp += tp
        overall_fp += fp
        overall_fn += fn
        recall = tp / (tp + fn) if (tp + fn) else None
        jaccard = tp / (tp + fp + fn) if (tp + fp + fn) else None
        f1 = 2 * tp / (2 * tp + fp + fn) if (2 * tp + fp + fn) else None
        phase_report[offset] = {
            'tp': tp, 'fp': fp, 'fn': fn,
            'recall': round(recall, 3) if recall is not None else None,
            'jaccard': round(jaccard, 3) if jaccard is not None else None,
            'f1': round(f1, 3) if f1 is not None else None,
        }

    overall_jaccard = overall_tp / (overall_tp + overall_fp + overall_fn) if (overall_tp + overall_fp + overall_fn) else None
    overall_f1 = 2 * overall_tp / (2 * overall_tp + overall_fp + overall_fn) if (2 * overall_tp + overall_fp + overall_fn) else None

    report = {
        'n_sequences': len(labels['sequences']),
        'dist_tolerance_px': DIST_TOLERANCE,
        'count_rmse': round(count_rmse, 3) if count_rmse is not None else None,
        'overall_jaccard': round(overall_jaccard, 3) if overall_jaccard is not None else None,
        'overall_f1': round(overall_f1, 3) if overall_f1 is not None else None,
        'phase_resolved': phase_report,
        'per_sequence': per_seq_report,
    }
    print(json.dumps(report, indent=2))
    return report


# ------------------------------------------------------------------ selftest
# A tiny, fully-synthetic 2-frame example (no video/venv dependency beyond count-pellets.py
# itself) pinning match_greedy's TP/FP/FN arithmetic -- CLAUDE.md constraint 9: this instrument
# must self-validate from a clean checkout, not just "look right" on one manual run.
def selftest():
    true_pts = [(10, 10), (50, 50), (90, 90)]
    pred_pts = [(11, 9), (52, 48), (200, 200)]  # 2 close matches + 1 spurious detection
    tp, fp, fn = match_greedy(pred_pts, true_pts)
    ok = (tp, fp, fn) == (2, 1, 1)
    print(f'expected: tp=2 fp=1 fn=1  got: tp={tp} fp={fp} fn={fn}')
    print('SELFTEST PASS' if ok else 'SELFTEST FAIL')
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--labels', help='labels.json from make-synthetic-pellets.py')
    ap.add_argument('--selftest', action='store_true')
    args = ap.parse_args()
    if args.selftest:
        raise SystemExit(selftest())
    if not args.labels:
        ap.error('--labels is required (or use --selftest)')
    run(args)


if __name__ == '__main__':
    main()
