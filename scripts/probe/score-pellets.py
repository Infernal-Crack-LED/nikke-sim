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

--estimators (2026-07-31, Phase 2 pre-op revision, docs/handoffs/2026-07-30-pellet-reader-
implementation-plan.md §2.2/step 2): also scores the PRE-REGISTERED cheap-estimator list --
aggregation formulas over the SAME per-frame counts already computed above, no new detection code
-- against the current-pipeline control, reporting signed bias/SD/SE/RMSE per estimator so a
candidate can be screened before building Phase 2's full lifecycle-template machinery.
--real-fixture scores against the 6 owner-counted real shots (scripts/tests/fixtures/pellets/
groundtruth-f8-11.json) instead of a synthetic --labels file -- the mandatory held-out real-data
screen (§1.2's honest limit).
"""
import argparse
import json
import math
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
PY = sys.executable
COUNTER = HERE / 'count-pellets.py'

REAL_GT_DIR = REPO / 'scripts' / 'tests' / 'fixtures' / 'pellets'
REAL_GT_PATH = REAL_GT_DIR / 'groundtruth-f8-11.json'
REAL_CROP_RADIUS = 184     # crop_disc's own radius (make-groundtruth-f811.py), crosshair at center
REAL_PELLET_RADIUS = 160   # matches every reference run's --pellet-radius at zoom 2
REAL_CENTER_EXCLUDE = 36

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


def load_real_sequences():
    """Build score-pellets sequence dicts (same schema as make-synthetic-pellets.py's labels.json
    entries) from the 6 owner-counted real f8-11 crops. Each crop is already a disc centered on
    ITS OWN frame's crosshair (make-groundtruth-f811.py's crop_disc), so `crosshair` is the crop's
    own center for every sequence, not a whole-frame position -- verified 368x368 / center (184,184)
    across all 22 committed crops. shot0 (the confirmed false positive, n_pellets=0) is included:
    a candidate's bias on a true-zero shot is exactly the false-positive question §2.2 asks about."""
    gt = json.loads(REAL_GT_PATH.read_text())
    sequences = []
    for shot in gt['shots']:
        crops = shot.get('crops') or []
        if not crops:
            continue
        frames_dir = (REAL_GT_DIR / crops[0]).parent
        frames = sorted(Path(c).name for c in crops)
        offset_labels = []
        for fn in frames:
            m = re.match(r'^f(\d\d)_', fn)
            offset_labels.append(int(m.group(1)) if m else None)
        sequences.append({
            'seq': shot['shot'], 'video': 'marciana-real-f811',
            'frames_dir': str(frames_dir), 'frames': frames,
            'crosshair': [REAL_CROP_RADIUS, REAL_CROP_RADIUS],
            'pellet_radius': REAL_PELLET_RADIUS, 'center_exclude': REAL_CENTER_EXCLUDE,
            'n_pellets': shot['white'], 'offset_labels': offset_labels,
        })
    return sequences


# ------------------------------------------------------------ pre-registered cheap estimators
# Phase 2 pre-op (2026-07-31): both cross-family reviewers independently proposed scoring a dumb
# aggregation over the ALREADY-COMPUTED per-frame counts before building the full lifecycle-
# template machinery (t0 estimation, phase-indexed gating, trackpy). This section adds exactly
# that -- no new detection/tracking code, only aggregation formulas over count-pellets.py's
# existing per-frame output (`per_offset`'s raw counts) and a MINIMAL track-level persistence
# filter applied to the same `--dump-tracks` track list score_sequence() already loads.
def _median(vals):
    if not vals:
        return None
    s = sorted(vals)
    m = len(s)
    return (s[(m - 1) // 2] + s[m // 2]) / 2


def _percentile(vals, p):
    """Linear-interpolation percentile (no numpy dependency in this script)."""
    if not vals:
        return None
    s = sorted(vals)
    if len(s) == 1:
        return s[0]
    k = (len(s) - 1) * p / 100
    f, c = math.floor(k), math.ceil(k)
    if f == c:
        return s[int(k)]
    return s[f] * (c - k) + s[c] * (k - f)


def persisted_track_ids(tracks):
    """Kimi's minimal temporal filter: persist >=2 consecutive frames (track life -- tracks are
    already frame-contiguous by construction) AND non-increasing area after the track's own peak.
    A life=1 track always fails (life<2); a track that keeps GROWING after its peak (two blobs
    merging, not a decaying pellet) also fails."""
    ids = set()
    for t in tracks:
        if t['is_red']:
            continue
        life = t['last'] - t['first'] + 1
        if life < 2:
            continue
        areas = t['areas']
        if not areas:
            continue
        peak_i = areas.index(max(areas))
        tail = areas[peak_i:]
        if all(tail[k] >= tail[k + 1] for k in range(len(tail) - 1)):
            ids.add(t['id'])
    return ids


def offset_filtered_counts(tracks, persisted_ids, n_frames, cx, cy, radius):
    """Per-frame white-pellet counts using ONLY the persisted+monotonic-decay tracks, radius-
    windowed the same way the live per-frame white/red COUNT is (see score_sequence's own
    docstring on why this windowing must be explicit)."""
    counts = [0] * n_frames
    for t in tracks:
        if t['id'] not in persisted_ids:
            continue
        for fi in range(t['first'], min(t['last'], n_frames - 1) + 1):
            x = t['xs'][fi - t['first']]
            y = t['ys'][fi - t['first']]
            if math.hypot(x - cx, y - cy) <= radius:
                counts[fi] += 1
    return counts


def filtered_offset_stats(tracks, persisted_ids, n_frames, cx, cy, radius, true_positions):
    """Position-matched TP/FP/FN per offset for the persisted-track subset -- the *_persist
    estimators use a DIFFERENT track subset than score_sequence()'s raw per_offset (is_pellet vs
    persisted_ids), so their precision/recall is not the same number and must be scored
    separately, not assumed equal to the raw family's. None if the sequence has no labeled
    positions (the real-fixture screen)."""
    if true_positions is None:
        return None
    stats = []
    for fi in range(n_frames):
        pred_pts = [(t['xs'][fi - t['first']], t['ys'][fi - t['first']])
                    for t in tracks if t['id'] in persisted_ids and t['first'] <= fi <= t['last']]
        pred_pts = [p for p in pred_pts if math.hypot(p[0] - cx, p[1] - cy) <= radius]
        tp, fp, fn = match_greedy(pred_pts, true_positions)
        stats.append({'tp': tp, 'fp': fp, 'fn': fn})
    return stats


def compute_estimators(seq, dump, per_offset):
    """The pre-registered estimator list (docs/handoffs/2026-07-30-pellet-reader-implementation-
    plan.md §2.2 step 2a), scored on the SAME sequence score_sequence() already scored:

      current                    -- CONTROL: existing pipeline, mean of raw f8-11 counts
      median_persist_readable    -- kimi's form: median over the readable window (f1, f8-11),
                                     after the minimal persist+monotonic-decay filter
      max_nonpeak_persist        -- fable's form (max)
      p75_nonpeak_persist        -- fable's form (p75 quantile)
      p90_nonpeak_persist        -- fable's form (p90 quantile)
      median_readable_nofilter   -- isolates what the persistence filter buys, median family
      max_nonpeak_nofilter       -- isolates what the persistence filter buys, max family

    "Non-peak" uses the same cheap proxy make-groundtruth.py uses: the peak is the max-raw-count
    frame in THIS sequence; peak and its immediate neighbour are excluded. On a sequence that
    only carries the f8-11 window already (the real 6-shot fixture -- no f1..f7/f12-13 available),
    this proxy has nothing to exclude a true peak FROM and can leave very few non-peak frames;
    `_degenerate_nonpeak` flags when that happens rather than silently falling back."""
    n_frames = len(seq['frames'])
    offset_labels = seq.get('offset_labels') or [p['offset'] for p in seq.get('phases', [])] or list(range(1, n_frames + 1))
    raw_counts = [o['pred'] for o in per_offset]
    cx, cy = seq['crosshair']
    radius = seq['pellet_radius']

    persisted_ids = persisted_track_ids(dump['tracks'])
    filtered_counts = offset_filtered_counts(dump['tracks'], persisted_ids, n_frames, cx, cy, radius)

    peak_idx = max(range(n_frames), key=lambda i: raw_counts[i]) if n_frames else 0
    nonpeak_idx = [i for i in range(n_frames) if abs(i - peak_idx) > 1]
    degenerate_nonpeak = not nonpeak_idx
    if degenerate_nonpeak:
        nonpeak_idx = list(range(n_frames))

    readable_idx = [i for i, off in enumerate(offset_labels) if off in (1, 8, 9, 10, 11)]
    if not readable_idx:
        readable_idx = list(range(n_frames))
    f811_idx = [i for i, off in enumerate(offset_labels) if off in (8, 9, 10, 11)]
    if not f811_idx:
        f811_idx = list(range(n_frames))

    def med(idxs, src):
        return _median([src[i] for i in idxs])

    def mx(idxs, src):
        return max((src[i] for i in idxs), default=None)

    def pct(idxs, src, p):
        return _percentile([src[i] for i in idxs], p)

    return {
        'current': (sum(raw_counts[i] for i in f811_idx) / len(f811_idx)) if f811_idx else None,
        'median_persist_readable': med(readable_idx, filtered_counts),
        'max_nonpeak_persist': mx(nonpeak_idx, filtered_counts),
        'p75_nonpeak_persist': pct(nonpeak_idx, filtered_counts, 75),
        'p90_nonpeak_persist': pct(nonpeak_idx, filtered_counts, 90),
        'median_readable_nofilter': med(readable_idx, raw_counts),
        'max_nonpeak_nofilter': mx(nonpeak_idx, raw_counts),
        '_degenerate_nonpeak': degenerate_nonpeak,
        '_n_nonpeak': len(nonpeak_idx), '_n_readable': len(readable_idx),
    }


ESTIMATOR_KEYS = [
    'current', 'median_persist_readable', 'max_nonpeak_persist', 'p75_nonpeak_persist',
    'p90_nonpeak_persist', 'median_readable_nofilter', 'max_nonpeak_nofilter',
]


def aggregate_estimator_stats(per_seq_rows):
    out = {}
    for k in ESTIMATOR_KEYS:
        errs = [r[k] for r in per_seq_rows if r.get(k) is not None]
        n = len(errs)
        if n == 0:
            out[k] = None
            continue
        mean = sum(errs) / n
        sd = (sum((e - mean) ** 2 for e in errs) / (n - 1)) ** 0.5 if n > 1 else None
        se = (sd / n ** 0.5) if sd is not None else None
        rmse = (sum(e * e for e in errs) / n) ** 0.5
        out[k] = {
            'n': n, 'bias': round(mean, 3),
            'sd': round(sd, 3) if sd is not None else None,
            'se': round(se, 3) if se is not None else None,
            'rmse': round(rmse, 3),
        }
    return out


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
    true_positions = seq.get('positions')  # absent for the real-fixture screen (no labeled xy)
    per_offset = []
    for fi in range(n_frames):
        offset = fi + 1
        pred_pts = [(t['xs'][fi - t['first']], t['ys'][fi - t['first']])
                    for t in tracks
                    if t['is_pellet'] and not t['is_red'] and t['first'] <= fi <= t['last']]
        pred_pts = [p for p in pred_pts if math.hypot(p[0] - cx, p[1] - cy) <= radius]
        if true_positions is not None:
            tp, fp, fn = match_greedy(pred_pts, true_positions)
        else:
            tp = fp = fn = None
        per_offset.append({'offset': offset, 'tp': tp, 'fp': fp, 'fn': fn, 'pred': len(pred_pts)})
    f8_11 = [o['pred'] for o in per_offset if 8 <= o['offset'] <= 11]
    mean_count = sum(f8_11) / len(f8_11) if f8_11 else 0.0
    return per_offset, mean_count


def run(args):
    if args.real_fixture:
        sequences = load_real_sequences()
        tmp_dir = REPO / 'scratchpad' / 'pellets' / '_score_tmp_real'
    else:
        labels = json.loads(Path(args.labels).read_text())
        sequences = labels['sequences']
        tmp_dir = Path(args.labels).parent / '_score_tmp'
    tmp_dir.mkdir(parents=True, exist_ok=True)

    all_offsets = {}  # offset -> [tp, fp, fn] accumulators -- RAW/is_pellet track family
    all_offsets_persisted = {}  # offset -> [tp, fp, fn] -- persist+monotonic-decay track family
    count_errs = []
    per_seq_report = []
    per_seq_estimator_errs = []  # {estimator_key: error} per sequence, for aggregate_estimator_stats
    degenerate_nonpeak_n = 0
    for seq in sequences:
        dump = run_counter_on_sequence(seq, tmp_dir)
        per_offset, _unused_mean = score_sequence(seq, dump)
        est = compute_estimators(seq, dump, per_offset)
        mean_count = est['current'] if est['current'] is not None else 0.0
        err = mean_count - seq['n_pellets']
        count_errs.append(err)
        if est['_degenerate_nonpeak']:
            degenerate_nonpeak_n += 1
        for o in per_offset:
            if o['tp'] is None:
                continue
            acc = all_offsets.setdefault(o['offset'], [0, 0, 0])
            acc[0] += o['tp']
            acc[1] += o['fp']
            acc[2] += o['fn']
        if args.estimators:
            cx, cy = seq['crosshair']
            persisted_ids = persisted_track_ids(dump['tracks'])
            pstats = filtered_offset_stats(dump['tracks'], persisted_ids, len(seq['frames']),
                                            cx, cy, seq['pellet_radius'], seq.get('positions'))
            if pstats is not None:
                for offset0, s in enumerate(pstats):
                    acc = all_offsets_persisted.setdefault(offset0 + 1, [0, 0, 0])
                    acc[0] += s['tp']
                    acc[1] += s['fp']
                    acc[2] += s['fn']
        per_seq_report.append({
            'seq': seq['seq'], 'video': seq['video'], 'n_pellets': seq['n_pellets'],
            'f8_11_mean_count': round(mean_count, 2), 'error': round(err, 2),
        })
        if args.estimators:
            per_seq_estimator_errs.append({
                k: (est[k] - seq['n_pellets']) for k in ESTIMATOR_KEYS if est.get(k) is not None
            })
        print(f"  seq{seq['seq']:04d} [{seq['video']}] true={seq['n_pellets']} "
              f"f8-11_mean={mean_count:.2f} err={err:+.2f}"
              + (' [DEGENERATE non-peak set]' if est['_degenerate_nonpeak'] else ''),
              file=sys.stderr)

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

    overall_precision = overall_tp / (overall_tp + overall_fp) if (overall_tp + overall_fp) else None
    overall_recall = overall_tp / (overall_tp + overall_fn) if (overall_tp + overall_fn) else None
    overall_jaccard = overall_tp / (overall_tp + overall_fp + overall_fn) if (overall_tp + overall_fp + overall_fn) else None
    overall_f1 = 2 * overall_tp / (2 * overall_tp + overall_fp + overall_fn) if (2 * overall_tp + overall_fp + overall_fn) else None

    report = {
        'source': 'real-fixture' if args.real_fixture else str(args.labels),
        'n_sequences': len(sequences),
        'dist_tolerance_px': DIST_TOLERANCE,
        'count_rmse': round(count_rmse, 3) if count_rmse is not None else None,
        'overall_precision': round(overall_precision, 3) if overall_precision is not None else None,
        'overall_recall': round(overall_recall, 3) if overall_recall is not None else None,
        'overall_jaccard': round(overall_jaccard, 3) if overall_jaccard is not None else None,
        'overall_f1': round(overall_f1, 3) if overall_f1 is not None else None,
        'phase_resolved': phase_report,
        'per_sequence': per_seq_report,
        'degenerate_nonpeak_sequences': degenerate_nonpeak_n,
    }
    if args.estimators:
        report['estimators'] = aggregate_estimator_stats(per_seq_estimator_errs)
        report['estimator_keys'] = ESTIMATOR_KEYS
        # Position-level precision/recall for the *_persist estimator family -- a DIFFERENT
        # track subset (persisted_ids) than the raw/is_pellet family `overall_precision/recall`
        # above already reports, so it needs its own numbers, not a copy.
        p_tp = sum(v[0] for v in all_offsets_persisted.values())
        p_fp = sum(v[1] for v in all_offsets_persisted.values())
        p_fn = sum(v[2] for v in all_offsets_persisted.values())
        report['persisted_precision'] = round(p_tp / (p_tp + p_fp), 3) if (p_tp + p_fp) else None
        report['persisted_recall'] = round(p_tp / (p_tp + p_fn), 3) if (p_tp + p_fn) else None
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
    ap.add_argument('--real-fixture', action='store_true',
                     help='score against the 6 owner-counted real shots '
                          '(scripts/tests/fixtures/pellets/groundtruth-f8-11.json) instead of --labels')
    ap.add_argument('--estimators', action='store_true',
                     help='also score the pre-registered cheap-estimator list (median/max/quantile '
                          'aggregations) alongside the current-pipeline control')
    ap.add_argument('--selftest', action='store_true')
    args = ap.parse_args()
    if args.selftest:
        raise SystemExit(selftest())
    if not args.labels and not args.real_fixture:
        ap.error('--labels or --real-fixture is required (or use --selftest)')
    run(args)


if __name__ == '__main__':
    main()
