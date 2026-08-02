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

--audit-fidelity PATH (2026-07-31, generator fidelity gate): every estimator score this file
produces is only as trustworthy as the generator's own rendering fidelity -- §2.2b found the
synthetic screen scoring 3.6-12.4x further from zero than the real 6-shot screen, unexplained by
the (separately real and separately fixed) label-placement bug. This flag answers whether the
generator itself is the remaining explanation: for each labeled pellet at f8-11, find the nearest
RAW (pre-filter) connected component the real detector would see, and report the cascade
raw-found -> +min_area(25-750) -> +min_circ(>=0.55) -> BOTH. REFUSES (loud banner, exit 1) below a
0.90 both-pass floor -- see FIDELITY_BOTH_PASS_FLOOR's docstring for exactly how that floor was
derived (there is no direct real-pellet measurement to compare against; the docstring says so and
what would fix that). Needs the labels' rendered frames on disk. Combine with
--save-detections-fixture PATH to refresh the committed --audit-fidelity-selftest fixture.

--audit-fidelity-real (2026-08-01, docs/handoffs/2026-08-01-pellet-cascade-JUDGE-handoff.md §1):
the REAL-side twin of --audit-fidelity. Same cascade, same 20px tolerance, same WHITE_LO 210 mask,
same min_area/min_circ thresholds -- but run against the OWNER-MARKED pellet positions on the 6
real f8-11 crops from docs/probes/clean-weapons/marciana-solo.MP4 -- slug `marciana` (SG/Iron), NOT
`marciana-marine-study` (AR/Iron) -- in
scripts/tests/fixtures/pellets/groundtruth-f8-11-positions.json, instead
of a generator's own labels. This is the measurement FIDELITY_BOTH_PASS_FLOOR's docstring says does
not exist: it converts the 0.90 floor's DERIVED reference into a measured real-pellet
filter-survival rate, so the synthetic cascade can be read against a real one rather than against
an inference. It RECORDS a number -- per that handoff's evidence-discipline clause it deliberately
does NOT enforce a floor, change a threshold, or stamp a verdict.

--pellet-radius / --center-exclude / --real-positions (2026-08-01, same handoff §2): window
overrides + position-level scoring for the --real-fixture screen. --audit-fidelity-real measures
filter survival with NO windowing, but the LIVE counter only counts components inside the annulus
center_exclude < r <= pellet_radius, and ~10% of the owner-marked real pellets fall outside it
(9/168 instances beyond r=160, max r=166.8; 8/168 inside r=36) -- biasing the counter COLD, the
direction of its actual problem. The synthetic generator places every label strictly inside the
window by construction (884 labels, r=42.0..157.1), so no synthetic screen can see this at all.
These flags sweep the window against the owner's hand counts WITHOUT editing any constant; the
defaults are the live values (160 / 36) and this flag pair changes no default. --real-positions
turns on precision/recall for the real screen by matching against the owner-marked xy positions,
counting EVERY mark toward recall regardless of the window, so recall is comparable across cells.

Two structural differences from the synthetic path, both handled explicitly rather than by
falling through to the synthetic assumptions:
  - real frames are named f08_idx1068.png .. f11_idx1071.png (and shot00's lone
    shot00_confirm_idx1004.png), not the synthetic f_00008.png -- offsets come from
    load_real_sequences()'s own ^f(\\d\\d)_ labels, and an unmatched frame is a hard error, never a
    silent [] that would read as a spurious 0%;
  - positions are PER FRAME (the owner marked each frame independently), not one list reused
    across all four offsets -- frame N's positions are matched against frame N's components only.
Because the four frames re-observe the SAME 42 pellets, the per-instance rate (n=168) is
pseudo-replicated; the report therefore also links pellets across f08-f11 by nearest neighbour and
reports per-distinct-pellet rates (n=42) with the linkage's own quality stats.
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

# ------------------------------------------------------------ generator fidelity gate (2026-07-31)
# See docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md §2.2b "Generator fidelity gate
# (2026-07-31)" (in-place, right after the re-score subsection) and the matching 2026-07-31
# Correction log entry. Three consecutive wrong conclusions in this thread traced back to the same
# root cause: the
# synthetic generator (make-synthetic-pellets.py) was reasoned about but never independently
# validated against reality -- every check so far tests the pipeline THROUGH the generator, never
# the generator itself. This gate closes that gap: it asks, for each LABELED (true) pellet at each
# counting frame (f8-11), whether the pixels the generator actually rendered survive the SAME
# settled raw-detection + filter stage count-pellets.py applies live (WHITE_LO 210 threshold ->
# min_area 25-750 -> min_circ >= 0.55), reporting the cascade rather than just a pass/fail count.
FIDELITY_TOLERANCE = 20      # px -- nearest-raw-component match gate, same order as DIST_TOLERANCE
FIDELITY_MIN_AREA = 25       # settled count-pellets.py --min-area default
FIDELITY_MAX_AREA = 750      # settled count-pellets.py --max-area default
FIDELITY_MIN_CIRC = 0.55     # settled count-pellets.py --min-circ default

# The floor, and why it is 0.90 and not "measured real-pellet survival":
#
# There is NO direct measurement of real-pellet filter-survival, because the only real fixture
# with per-shot detail (scripts/tests/fixtures/pellets/groundtruth-f8-11.json) carries COUNTS, not
# labeled xy pellet positions (recorded limitation, plan §2.2b) -- so "nearest raw component to a
# labeled real pellet" cannot be computed on it today. What DOES exist is an indirect DERIVATION:
# the real 6-shot fixture's own measured bias for the current (unmodified) pipeline is -0.375
# pellets (§2.2b re-score, `current` estimator), and the tighter per-estimator range across the
# same table is -0.167 to -0.625 pellets, against a mean true count of ~8.4 pellets/shot. Reading
# that bias as "the filter stage drops (true - observed) pellets" gives an implied real
# filter-survival rate of 1 + bias/true_mean ~= 1 - 0.17/8.4 .. 1 - 0.63/8.4 = 0.98 .. 0.925,
# centered close to ~0.93. This is a DERIVED reference, not a measured one -- it is one step removed
# (bias-implied, not xy-matched) and folds in every OTHER source of bias the pipeline has (missed
# shots, event segmentation, localization) alongside filter-survival specifically, so it is at best
# an upper-bound-ish proxy, not a clean isolated number.
#
# The floor is set at 0.90 -- comfortably under that ~0.925-0.98 derived range, not at it -- so the
# gate is conservative rather than hair-trigger on the (acknowledged) imprecision of the derivation.
# docs/handoffs/QUEUE.md carries the owner-time ask to close this gap directly: label xy positions
# on the 6 owner-counted real crops so this floor can be swapped for an actual measurement.
FIDELITY_BOTH_PASS_FLOOR = 0.90


def nearest_white_component(pos, comps, tol=FIDELITY_TOLERANCE):
    """pos=(x,y); comps=raw per-frame component dicts (count-pellets.py's _raw_components/
    --dump-detections output: cx, cy, is_red, area, circ, ... -- NO area/circ/center-exclude
    filter applied yet). Returns the nearest WHITE (is_red False) component within `tol`, or None
    if none is that close -- mirrors what --min-area/--max-area/--min-circ WOULD be filtering."""
    best, best_d = None, tol
    for c in comps:
        if c.get('is_red'):
            continue
        d = math.hypot(pos[0] - c['cx'], pos[1] - c['cy'])
        if d <= best_d:
            best_d, best = d, c
    return best


def compute_fidelity_cascade(seq_detections):
    """seq_detections: list of {'positions': [[x,y], ...], 'detections_by_offset': {8: [...raw
    comps...], 9: [...], 10: [...], 11: [...]}}. Pure arithmetic, no file/subprocess IO -- this is
    what --audit-fidelity-selftest pins against a committed fixture, and what the live
    --audit-fidelity path (audit_fidelity()) feeds after running the real detector.

    For each (labeled pellet, counting frame) pair this is a cascade, not four independent checks:
    raw-found is the precondition for area/circ to mean anything (no component -> both fail by
    construction), and 'passes_both' is the actual filter-survival outcome — the fraction that
    would legitimately increment count-pellets.py's live per-frame pellet count."""
    instances = []
    for sd in seq_detections:
        by_offset = sd['detections_by_offset']
        for pi, (x, y) in enumerate(sd['positions']):
            for offset in (8, 9, 10, 11):
                comps = by_offset.get(offset, by_offset.get(str(offset), []))
                instances.append(cascade_instance((x, y), comps, seq=sd.get('seq'),
                                                   offset=offset, pellet_index=pi))
    return summarize_cascade(instances)


def cascade_instance(pos, comps, seq=None, offset=None, pellet_index=None):
    """One (labeled pellet, frame) cascade record — the single place the raw-found -> min_area ->
    min_circ -> BOTH decision is evaluated, shared by the synthetic (compute_fidelity_cascade) and
    the real (compute_real_fidelity_cascade) paths so the two numbers are computed by identical
    arithmetic against identical thresholds and are therefore directly comparable."""
    comp = nearest_white_component(pos, comps)
    rec = {'seq': seq, 'offset': offset, 'pellet_index': pellet_index,
           'raw_found': comp is not None, 'passes_area': False, 'passes_circ': False,
           'passes_both': False, 'area': None, 'circ': None, 'dist': None}
    if comp is None:
        return rec
    rec['area'] = comp['area']
    rec['circ'] = round(float(comp['circ']), 4)
    rec['dist'] = round(math.hypot(pos[0] - comp['cx'], pos[1] - comp['cy']), 2)
    rec['passes_area'] = bool(FIDELITY_MIN_AREA <= comp['area'] <= FIDELITY_MAX_AREA)
    rec['passes_circ'] = bool(comp['circ'] >= FIDELITY_MIN_CIRC)
    rec['passes_both'] = bool(rec['passes_area'] and rec['passes_circ'])
    return rec


def summarize_cascade(instances):
    """Aggregate cascade_instance() records into the four-stage report. Percentages are of
    n_labeled (every stage denominated the same way), matching what --audit-fidelity has always
    printed."""
    n_labeled = len(instances)
    n_raw = sum(1 for r in instances if r['raw_found'])
    n_area = sum(1 for r in instances if r['raw_found'] and r['passes_area'])
    n_circ = sum(1 for r in instances if r['raw_found'] and r['passes_circ'])
    n_both = sum(1 for r in instances if r['passes_both'])

    def frac(n):
        return round(n / n_labeled, 4) if n_labeled else 0.0

    return {
        'n_labeled_pellet_frame_instances': n_labeled,
        'raw_found': n_raw, 'raw_found_pct': frac(n_raw),
        'passes_min_area': n_area, 'passes_min_area_pct': frac(n_area),
        'passes_min_circ': n_circ, 'passes_min_circ_pct': frac(n_circ),
        'passes_both': n_both, 'passes_both_pct': frac(n_both),
    }


def run_fidelity_detections(seq, tmp_dir):
    """Subprocess to count-pellets.py --dump-detections -- the RAW pre-filter per-frame component
    list (WHITE_LO 210 threshold, connected components, area+circularity, NO area/circ/center-
    exclude decision applied) that this repo already ships and already uses for cache-then-sweep
    (see count-pellets.py's _raw_components / CACHEABLE_PARAMS block). Reused here rather than
    re-implementing WHITE_LO thresholding a third time (make-synthetic-pellets.py's own
    extract_patch_library already duplicates it once, for patch harvesting)."""
    frames_dir = Path(seq['frames_dir'])
    w, h = png_dims(frames_dir / seq['frames'][0])
    cx, cy = seq['crosshair']
    crosshair_file = tmp_dir / f"fcross_{seq['seq']}.json"
    crosshair_file.write_text(json.dumps({
        f: {'x': round(cx / w * 1000), 'y': round(cy / h * 1000)} for f in seq['frames']
    }))
    dets_out = tmp_dir / f"fdet_{seq['seq']}.json"
    cmd = [
        PY, str(COUNTER), str(frames_dir),
        '--temporal', '--backend', 'opencv',
        '--crosshair-file', str(crosshair_file),
        '--center-exclude', str(seq['center_exclude']),
        '--min-area', str(FIDELITY_MIN_AREA), '--max-area', str(FIDELITY_MAX_AREA),
        '--min-circ', str(FIDELITY_MIN_CIRC),
        '--pellet-radius', str(seq['pellet_radius']), '--marker-radius', '65',
        '--max-pellet-frames', '13',
        '--dump-detections', str(dets_out), '--force',
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        print(proc.stderr, file=sys.stderr)
        raise SystemExit(f'count-pellets.py --dump-detections exited {proc.returncode} on seq{seq["seq"]}')
    return json.loads(dets_out.read_text())


def build_seq_detections(labels_sequences, tmp_dir):
    """Run run_fidelity_detections per sequence and slice out just the f8-11 raw component lists
    the cascade needs -- the shared step between the live --audit-fidelity path and
    --save-detections-fixture (which persists this same structure for the selftest fixture)."""
    out = []
    for seq in labels_sequences:
        dets = run_fidelity_detections(seq, tmp_dir)
        frame_files = dets['frame_files']
        detections = dets['detections']
        by_offset = {}
        for offset in (8, 9, 10, 11):
            fname = f'f_{offset:05d}.png'
            by_offset[offset] = detections[frame_files.index(fname)] if fname in frame_files else []
        out.append({
            'seq': seq['seq'], 'video': seq['video'],
            'positions': seq['positions'], 'detections_by_offset': by_offset,
        })
    return out


def audit_fidelity(labels_path, save_fixture_path=None):
    """The live gate: run the real detector's raw-detection stage against a generated labels.json's
    rendered frames (must exist on disk -- reproduce first, per the same convention --audit-labels
    uses) and report + enforce the fidelity cascade. REFUSES (loud banner, exit 1) if the both-pass
    rate falls below FIDELITY_BOTH_PASS_FLOOR -- same style as count-pellets.py's --load-detections/
    --dump-detections guards and make-synthetic-pellets.py's --audit-labels."""
    check_labels_countable(labels_path)
    data = json.loads(Path(labels_path).read_text())
    tmp_dir = Path(labels_path).parent / '_fidelity_tmp'
    tmp_dir.mkdir(parents=True, exist_ok=True)
    seq_detections = build_seq_detections(data['sequences'], tmp_dir)
    if save_fixture_path:
        Path(save_fixture_path).write_text(json.dumps({
            '_source': str(labels_path),
            '_note': ('Per-sequence positions + RAW (pre-filter) f8-11 component detections from '
                       'count-pellets.py --dump-detections, sliced to just the 4 counting frames. '
                       'Pins compute_fidelity_cascade() against a known-good result -- see '
                       'score-pellets.py --audit-fidelity-selftest / docs/handoffs/'
                       '2026-07-30-pellet-reader-implementation-plan.md §1.2 fidelity gate.'),
            'sequences': seq_detections,
        }, indent=2))
        print(f'wrote detections fixture -> {save_fixture_path}', file=sys.stderr)
    report = compute_fidelity_cascade(seq_detections)
    report['n_sequences'] = len(seq_detections)
    report['tolerance_px'] = FIDELITY_TOLERANCE
    report['min_area'] = FIDELITY_MIN_AREA
    report['max_area'] = FIDELITY_MAX_AREA
    report['min_circ'] = FIDELITY_MIN_CIRC
    report['both_pass_floor'] = FIDELITY_BOTH_PASS_FLOOR
    print(json.dumps(report, indent=2))
    if report['passes_both_pct'] < FIDELITY_BOTH_PASS_FLOOR:
        print('=' * 78, file=sys.stderr)
        print('!! GENERATOR FIDELITY GATE FAILED -- REFUSING !!', file=sys.stderr)
        print('=' * 78, file=sys.stderr)
        print(f"  Only {report['passes_both_pct'] * 100:.1f}% of labeled pellets survive the "
              'settled raw-detection + filter stage at f8-11 '
              f"(floor: {FIDELITY_BOTH_PASS_FLOOR * 100:.0f}%).", file=sys.stderr)
        print('  This generator composites pellets that the CONFIGURED counter throws away at a', file=sys.stderr)
        print('  materially higher rate than the derived real-pellet reference -- scores measured', file=sys.stderr)
        print('  on this set characterize the GENERATOR, not the estimator/detector under test.', file=sys.stderr)
        print(f"  Cascade: raw_found={report['raw_found_pct']*100:.1f}% -> "
              f"+min_area={report['passes_min_area_pct']*100:.1f}% -> "
              f"+min_circ={report['passes_min_circ_pct']*100:.1f}% -> "
              f"BOTH={report['passes_both_pct']*100:.1f}%", file=sys.stderr)
        print('  Do not treat estimator scores from this generator as a bias measurement until', file=sys.stderr)
        print('  this gate passes -- see docs/handoffs/2026-07-30-pellet-reader-implementation-', file=sys.stderr)
        print('  plan.md §2.2b "Generator fidelity gate (2026-07-31)".', file=sys.stderr)
        print('=' * 78, file=sys.stderr)
        raise SystemExit(1)
    print(f"audit-fidelity: PASS -- {report['passes_both_pct']*100:.1f}% both-pass "
          f"(floor {FIDELITY_BOTH_PASS_FLOOR*100:.0f}%)", file=sys.stderr)


FIDELITY_SELFTEST_FIXTURE = (REPO / 'scripts' / 'tests' / 'fixtures' / 'pellets' /
                              'synthetic-fidelity-slice.json')


def audit_fidelity_selftest():
    """Pins compute_fidelity_cascade() against a committed fixture (4 real synthetic sequences, one
    per video, from scratchpad/pellets/synthetic-v3-n120 -- pre-baked f8-11 raw detections, no
    images/subprocess/venv-cv2 needed at selftest time) -- constraint 9 self-validation, same
    precedent as run16-tracks-slice.json / h1-cache-slice.json."""
    data = json.loads(FIDELITY_SELFTEST_FIXTURE.read_text())
    seq_detections = [
        {**s, 'detections_by_offset': {int(k): v for k, v in s['detections_by_offset'].items()}}
        for s in data['sequences']
    ]
    report = compute_fidelity_cascade(seq_detections)
    expected = data['_expected']
    got = {k: report[k] for k in expected}
    ok = got == expected
    print(f'expected: {expected}')
    print(f'got:      {got}')
    print('SELFTEST PASS' if ok else 'SELFTEST FAIL')
    return 0 if ok else 1


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


def load_real_sequences(pellet_radius=REAL_PELLET_RADIUS, center_exclude=REAL_CENTER_EXCLUDE,
                        with_positions=False):
    """Build score-pellets sequence dicts (same schema as make-synthetic-pellets.py's labels.json
    entries) from the 6 owner-counted real f8-11 crops. Each crop is already centered on
    ITS OWN frame's crosshair (make-groundtruth-f811.py's crop_disc), so `crosshair` is the crop's
    own center for every sequence, not a whole-frame position -- verified 368x368 / center (184,184)
    across all 22 committed crops. shot0 (the confirmed false positive, n_pellets=0) is included:
    a candidate's bias on a true-zero shot is exactly the false-positive question §2.2 asks about.

    `pellet_radius` / `center_exclude` default to the module constants (the settled live values, 160
    and 36) -- unflagged behaviour is unchanged. They are parameters so the WINDOW itself can be
    swept without editing constants, per docs/handoffs/2026-08-01-pellet-cascade-JUDGE-handoff.md:
    the --audit-fidelity-real cascade measures filter survival with NO windowing, but the live
    counter windows to center_exclude < r <= pellet_radius, and ~10% of the owner-marked real
    pellets fall outside that window (9/168 instances beyond r=160, 8/168 inside r=36). The
    synthetic generator places every label strictly inside the window (r=42.0..157.1 over 884
    labels), so no synthetic-based measurement can see the effect at all.

    `with_positions` additionally attaches the owner-marked xy positions
    (groundtruth-f8-11-positions.json, the same file --audit-fidelity-real reads) as
    `positions_per_frame`, which turns on position-level TP/FP/FN for the real screen (it is
    otherwise count-only). The positions are attached UNFILTERED -- every owner mark counts toward
    recall regardless of which side of the window it sits on, which is exactly what makes recall
    comparable across window settings. A frame with no positions entry is a hard error, never a
    silent [] that would read as a spurious 0% (same rule --audit-fidelity-real states)."""
    gt = json.loads(REAL_GT_PATH.read_text())
    pos_by_shot = {}
    if with_positions:
        pos = json.loads(REAL_POSITIONS_PATH.read_text())
        pos_by_shot = {s['shot']: {f['frame']: f['positions'] for f in s['frames']}
                       for s in pos['shots']}
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
        seq = {
            'seq': shot['shot'], 'video': 'marciana-real-f811',
            'frames_dir': str(frames_dir), 'frames': frames,
            'crosshair': [REAL_CROP_RADIUS, REAL_CROP_RADIUS],
            'pellet_radius': pellet_radius, 'center_exclude': center_exclude,
            'n_pellets': shot['white'], 'offset_labels': offset_labels,
        }
        if with_positions:
            by_frame = pos_by_shot.get(shot['shot'])
            if by_frame is None:
                raise SystemExit(f'score-pellets.py: {REAL_POSITIONS_PATH.name} has no shot '
                                 f'{shot["shot"]} -- refusing to score it as if it had no pellets')
            missing = [f for f in frames if f not in by_frame]
            if missing:
                raise SystemExit(f'score-pellets.py: {REAL_POSITIONS_PATH.name} shot '
                                 f'{shot["shot"]} is missing positions for {missing}')
            seq['positions_per_frame'] = [[tuple(p) for p in by_frame[f]] for f in frames]
        sequences.append(seq)
    return sequences


# ------------------------------------------------- REAL-pellet fidelity cascade (2026-08-01, §1)
# docs/handoffs/2026-08-01-pellet-cascade-JUDGE-handoff.md §1. The synthetic cascade above has no
# real-side counterpart -- FIDELITY_BOTH_PASS_FLOOR's own docstring records that gap ("there is NO
# direct measurement of real-pellet filter-survival") and names the fix: owner-labeled xy positions
# on the 6 counted real crops. Those positions now exist (groundtruth-f8-11-positions.json,
# owner-drawn 2026-07-31, shape counts reconciled against the independent hand counts), so this
# runs the SAME cascade on them.
REAL_POSITIONS_PATH = REAL_GT_DIR / 'groundtruth-f8-11-positions.json'
REAL_FIDELITY_SELFTEST_FIXTURE = REAL_GT_DIR / 'real-fidelity-slice.json'

# Nearest-neighbour linkage of the same physical pellet across f08->f09->f10->f11. The four frames
# are consecutive 60fps captures of ONE shot, so a pellet moves only a few px between them, while
# neighbouring pellets sit tens of px apart -- the link is unambiguous by a wide margin and the
# report proves it rather than asserting it (max link distance, worst Lowe ratio, min in-frame
# neighbour spacing all come out in `linkage`).
LINK_MAX_DIST = 20.0   # px; same order as FIDELITY_TOLERANCE, and >> the observed ~2-4px drift
LINK_RATIO_MAX = 0.6   # Lowe ratio: nearest/second-nearest must be comfortably < 1 to be 1-to-1


def link_frames_by_nearest(frames):
    """Chain-link pellet identities across a shot's frames (ordered by offset) by greedy nearest
    neighbour, f08->f09->f10->f11. Returns (pellet_ids_per_frame, stats, steps) where
    pellet_ids_per_frame[k][i] is the distinct-pellet id of frame k's position i, stats carries the
    evidence that the linkage is clean (per-step displacements, the worst nearest/second-nearest
    ratio, and the minimum in-frame neighbour spacing -- the scale that makes the link
    unambiguous), and steps is the raw per-link displacement list so the caller can pool it.

    Reading `worst_nearest_over_second`: the crops are re-centered on the crosshair every frame, so
    when the aim pans between two frames EVERY pellet translates by the same vector. That inflates
    the displacement (and hence the ratio) without making the link ambiguous at all -- a rigid
    translation preserves relative geometry and the assignment stays an identity map. Check a large
    step's COHERENCE across the frame pair before reading it as per-pellet drift."""
    ids_per_frame = [list(range(len(frames[0]['positions'])))] if frames else []
    steps, ratios, unmatched = [], [], 0
    for k in range(1, len(frames)):
        prev, cur = frames[k - 1]['positions'], frames[k]['positions']
        pairs = sorted((math.hypot(p[0] - c[0], p[1] - c[1]), i, j)
                       for i, p in enumerate(prev) for j, c in enumerate(cur))
        used_p, used_c = set(), set()
        assign = {}
        for d, i, j in pairs:
            if i in used_p or j in used_c or d > LINK_MAX_DIST:
                continue
            used_p.add(i)
            used_c.add(j)
            assign[j] = i
            steps.append(d)
        # nearest/second-nearest ratio per previous-frame pellet -- ambiguity evidence
        for i, p in enumerate(prev):
            ds = sorted(math.hypot(p[0] - c[0], p[1] - c[1]) for c in cur)
            if len(ds) >= 2 and ds[1] > 0:
                ratios.append(ds[0] / ds[1])
        ids = []
        for j in range(len(cur)):
            if j in assign:
                ids.append(ids_per_frame[k - 1][assign[j]])
            else:
                unmatched += 1
                ids.append(None)
        ids_per_frame.append(ids)
    spacings = []
    for fr in frames:
        pts = fr['positions']
        for i, a in enumerate(pts):
            for b in pts[i + 1:]:
                spacings.append(math.hypot(a[0] - b[0], a[1] - b[1]))
    return ids_per_frame, {
        'n_link_steps': len(steps),
        'median_step_px': round(_median(steps), 2) if steps else None,
        'max_step_px': round(max(steps), 2) if steps else None,
        'worst_nearest_over_second': round(max(ratios), 4) if ratios else None,
        'min_in_frame_neighbour_px': round(min(spacings), 2) if spacings else None,
        'unmatched_positions': unmatched,
        'one_to_one': unmatched == 0,
    }, steps


def build_real_seq_detections(tmp_dir):
    """Run the RAW (pre-filter) detector over the 6 committed real f8-11 crop dirs and pair each
    frame's components with THAT FRAME's owner-marked positions.

    Two things this must not get wrong, both of which would silently read as a ~0% cascade:
      - frame->offset mapping. build_seq_detections() slices by the SYNTHETIC name f_{offset:05d}
        .png; the real crops are f08_idx1068.png etc. Offsets come from load_real_sequences()'s
        ^f(\\d\\d)_ labels and every expected frame must appear in the detector's own frame_files --
        an unmatched frame raises, it never falls back to [].
      - per-frame positions. The owner marked each frame independently, so frame N's positions
        belong to frame N only and are never pooled across the four offsets.
    Coordinates: the crops ARE the images handed to count-pellets.py, so its cx/cy are already in
    the same 368x368 crop pixel space the owner's positions use -- no transform, and none wanted."""
    pos_doc = json.loads(REAL_POSITIONS_PATH.read_text())
    pos_by_frame = {f['frame']: f['positions']
                    for shot in pos_doc['shots'] for f in shot['frames']}
    out = []
    for seq in load_real_sequences():
        dets = run_fidelity_detections(seq, tmp_dir)
        frame_files = dets['frame_files']
        detections = dets['detections']
        frames = []
        for fname, offset in zip(seq['frames'], seq['offset_labels']):
            if fname not in frame_files:
                raise SystemExit(f'--audit-fidelity-real: frame {fname} (shot {seq["seq"]}) is not '
                                  'in count-pellets.py --dump-detections frame_files -- refusing to '
                                  'score a silently-empty component list')
            if fname not in pos_by_frame:
                raise SystemExit(f'--audit-fidelity-real: frame {fname} has no owner positions in '
                                  f'{REAL_POSITIONS_PATH.name} -- refusing to score it as 0 pellets')
            frames.append({
                'frame': fname, 'offset': offset,
                'positions': pos_by_frame[fname],
                'detections': detections[frame_files.index(fname)],
            })
        out.append({'seq': seq['seq'], 'video': seq['video'],
                    'crosshair': seq['crosshair'], 'pellet_radius': seq['pellet_radius'],
                    'center_exclude': seq['center_exclude'], 'frames': frames})
    return out


def compute_real_fidelity_cascade(seq_frames):
    """Pure arithmetic (no IO) over build_real_seq_detections()'s output -- what
    --audit-fidelity-real-selftest pins against the committed real-fidelity-slice.json fixture.

    Reports the cascade three ways because the 168 pellet-frame instances are NOT independent
    (the same 42 physical pellets re-observed in 4 frames each):
      per_instance          -- n=168, the number directly comparable to the synthetic n=120 cascade
      per_distinct_pellet   -- n=42; `mean_pass_fraction` is the cluster-corrected point estimate
                                (each pellet contributes its own 0/.25/.5/.75/1 survival fraction),
                                with `all4` (strict) and `any1` (lenient) either side of it
      per_shot              -- so one bad shot cannot hide inside the aggregate
      per_offset            -- f08/f09/f10/f11 separately (n=42 each). The counting window is not
                                homogeneous: pellets are still FADING through it, so the last
                                frame is where the WHITE_LO 210 mask starts losing them, and an
                                aggregate over all four hides that
    plus `rejected_of_found`, the min_area-vs-min_circ split expressed as a fraction of raw-found,
    which is the form the synthetic reading (min_circ 17.2% vs min_area 11.9%) is quoted in."""
    instances, per_shot, pellets, all_steps = [], [], {}, []
    diag = {'n_inside_center_exclude': 0, 'n_beyond_pellet_radius': 0}
    for sd in seq_frames:
        frames = [f for f in sd['frames'] if f['offset'] is not None]
        frames.sort(key=lambda f: f['offset'])
        shot_inst = []
        for f in frames:
            for pi, pos in enumerate(f['positions']):
                rec = cascade_instance(pos, f['detections'], seq=sd['seq'],
                                       offset=f['offset'], pellet_index=pi)
                rec['frame'] = f['frame']
                shot_inst.append(rec)
                cx, cy = sd['crosshair']
                d = math.hypot(pos[0] - cx, pos[1] - cy)
                diag['n_inside_center_exclude'] += d < sd['center_exclude']
                diag['n_beyond_pellet_radius'] += d > sd['pellet_radius']
        instances.extend(shot_inst)
        if shot_inst:
            row = summarize_cascade(shot_inst)
            row['seq'] = sd['seq']
            row['n_frames'] = len(frames)
            per_shot.append(row)
        # distinct-pellet linkage within this shot
        if len(frames) >= 2:
            ids_per_frame, link_stats, steps = link_frames_by_nearest(frames)
            all_steps.extend(steps)
        else:
            ids_per_frame = [list(range(len(f['positions']))) for f in frames]
            link_stats = {'n_link_steps': 0, 'one_to_one': True, 'unmatched_positions': 0,
                          'median_step_px': None, 'max_step_px': None,
                          'worst_nearest_over_second': None, 'min_in_frame_neighbour_px': None}
        if per_shot and per_shot[-1]['seq'] == sd['seq']:
            per_shot[-1]['linkage'] = link_stats
        by_frame = {}
        for rec in shot_inst:
            by_frame.setdefault(rec['frame'], []).append(rec)
        for k, f in enumerate(frames):
            for pi, rec in enumerate(sorted(by_frame[f['frame']], key=lambda r: r['pellet_index'])):
                pid = ids_per_frame[k][pi] if k < len(ids_per_frame) else None
                key = (sd['seq'], pid if pid is not None else f'unlinked-{f["frame"]}-{pi}')
                pellets.setdefault(key, []).append(rec['passes_both'])

    report = {'per_instance': summarize_cascade(instances)}
    n_raw = report['per_instance']['raw_found']
    report['rejected_of_found'] = {
        'n_raw_found': n_raw,
        'by_min_area': round((n_raw - report['per_instance']['passes_min_area']) / n_raw, 4) if n_raw else None,
        'by_min_circ': round((n_raw - report['per_instance']['passes_min_circ']) / n_raw, 4) if n_raw else None,
        'by_both_stages': round((n_raw - report['per_instance']['passes_both']) / n_raw, 4) if n_raw else None,
    }
    fracs = [sum(v) / len(v) for v in pellets.values()]
    n_p = len(fracs)
    mean_frac = sum(fracs) / n_p if n_p else None
    sd_frac = ((sum((x - mean_frac) ** 2 for x in fracs) / (n_p - 1)) ** 0.5) if n_p > 1 else None
    report['per_distinct_pellet'] = {
        'n_distinct_pellets': n_p,
        'mean_pass_fraction': round(mean_frac, 4) if mean_frac is not None else None,
        'sd': round(sd_frac, 4) if sd_frac is not None else None,
        'se': round(sd_frac / n_p ** 0.5, 4) if sd_frac is not None else None,
        'all4': sum(1 for x in fracs if x == 1.0),
        'all4_pct': round(sum(1 for x in fracs if x == 1.0) / n_p, 4) if n_p else None,
        'any1': sum(1 for x in fracs if x > 0),
        'any1_pct': round(sum(1 for x in fracs if x > 0) / n_p, 4) if n_p else None,
    }
    report['per_shot'] = per_shot
    by_offset = {}
    for rec in instances:
        by_offset.setdefault(rec['offset'], []).append(rec)
    report['per_offset'] = []
    for off in sorted(by_offset):
        row = summarize_cascade(by_offset[off])
        row['offset'] = off
        report['per_offset'].append(row)
    report['linkage_overall'] = {
        'n_link_steps': len(all_steps),
        'median_inter_frame_displacement_px': round(_median(all_steps), 2) if all_steps else None,
        'max_inter_frame_displacement_px': round(max(all_steps), 2) if all_steps else None,
        'all_shots_one_to_one': all(r.get('linkage', {}).get('one_to_one', True) for r in per_shot),
    }
    report['diagnostics'] = diag
    report['thresholds'] = {
        'tolerance_px': FIDELITY_TOLERANCE, 'min_area': FIDELITY_MIN_AREA,
        'max_area': FIDELITY_MAX_AREA, 'min_circ': FIDELITY_MIN_CIRC,
    }
    return report


def audit_fidelity_real(save_fixture_path=None):
    """Live real-pellet cascade. RECORDS a measurement -- deliberately no floor, no threshold
    change, no verdict (docs/handoffs/2026-08-01-pellet-cascade-JUDGE-handoff.md §1 evidence
    discipline: landing FIDELITY_BOTH_PASS_FLOOR off this number is a separate, owner-gated pass)."""
    tmp_dir = REPO / 'scratchpad' / 'pellets' / '_fidelity_tmp_real'
    tmp_dir.mkdir(parents=True, exist_ok=True)
    seq_frames = build_real_seq_detections(tmp_dir)
    if save_fixture_path:
        Path(save_fixture_path).write_text(json.dumps({
            '_source': str(REAL_POSITIONS_PATH.relative_to(REPO)),
            '_note': ('Per-FRAME owner-marked pellet positions + the RAW (pre-filter) component '
                       'list count-pellets.py --dump-detections produces for that same frame, for '
                       'the 6 real f8-11 crops. Pins compute_real_fidelity_cascade() against a '
                       'known-good result with no images/subprocess/cv2 needed -- see '
                       'score-pellets.py --audit-fidelity-real-selftest and docs/handoffs/'
                       '2026-08-01-pellet-cascade-JUDGE-handoff.md §1.'),
            'sequences': seq_frames,
            '_expected': _real_expected_block(compute_real_fidelity_cascade(seq_frames)),
        }, indent=2))
        print(f'wrote real-fidelity fixture -> {save_fixture_path}', file=sys.stderr)
    report = compute_real_fidelity_cascade(seq_frames)
    report['n_shots'] = len(seq_frames)
    print(json.dumps(report, indent=2))
    pi = report['per_instance']
    pd = report['per_distinct_pellet']
    print(f"audit-fidelity-real: raw_found={pi['raw_found_pct']*100:.1f}% -> "
          f"+min_area={pi['passes_min_area_pct']*100:.1f}% -> "
          f"+min_circ={pi['passes_min_circ_pct']*100:.1f}% -> "
          f"BOTH={pi['passes_both_pct']*100:.1f}%  "
          f"(n={pi['n_labeled_pellet_frame_instances']} instances; per-distinct-pellet "
          f"mean={pd['mean_pass_fraction']*100:.1f}%, n={pd['n_distinct_pellets']})",
          file=sys.stderr)


def _real_expected_block(report):
    """The subset of compute_real_fidelity_cascade()'s report the selftest pins -- the headline
    cascade plus both denominators, kept small so the fixture stays readable."""
    pi, pd = report['per_instance'], report['per_distinct_pellet']
    return {
        'per_instance': {k: pi[k] for k in (
            'n_labeled_pellet_frame_instances', 'raw_found', 'raw_found_pct',
            'passes_min_area', 'passes_min_area_pct', 'passes_min_circ',
            'passes_min_circ_pct', 'passes_both', 'passes_both_pct')},
        'per_distinct_pellet': {k: pd[k] for k in (
            'n_distinct_pellets', 'mean_pass_fraction', 'all4', 'any1')},
        'rejected_of_found': report['rejected_of_found'],
    }


def audit_fidelity_real_selftest():
    """Constraint 9 self-validation for the real cascade, same precedent as
    --audit-fidelity-selftest / synthetic-fidelity-slice.json: replays
    compute_real_fidelity_cascade() over committed positions+detections and compares to the
    fixture's own _expected block. No images, no subprocess, no cv2."""
    data = json.loads(REAL_FIDELITY_SELFTEST_FIXTURE.read_text())
    report = compute_real_fidelity_cascade(data['sequences'])
    expected = data['_expected']
    got = _real_expected_block(report)
    ok = got == expected
    print(f'expected: {json.dumps(expected, sort_keys=True)}')
    print(f'got:      {json.dumps(got, sort_keys=True)}')
    print('SELFTEST PASS' if ok else 'SELFTEST FAIL')
    return 0 if ok else 1


# --------------------------------------------- crop-centering audit (2026-08-01, centering plan)
# docs/handoffs/2026-08-01-pellet-centering-test-plan.md. The f8-11 crops are centred on the
# crosshair AT THE COUNTING FRAME (`cross[f]`, make-groundtruth-f811.py:168-183), but the owner's
# marked pellet clouds sit 20-52px off that centre, per-shot, swinging sign between shots. This
# audit measures whether that offset is the crosshair's OWN motion between the firing frame `t0`
# and the counting frame `f` (H1 frame-lag), a localization failure (H0a), or a real aim-vs-impact
# offset (H0b). It RECORDS the measurement; per the plan's §6 it changes no constant, no centring
# behaviour, and stamps no verdict.
#
# SIGN CONVENTION, derived from the crop geometry rather than asserted:
#   crop_disc() cuts a (2*REAL_CROP_RADIUS)^2 square whose centre pixel (184,184) IS the full-frame
#   point cross[f]. So a pellet at full-frame point P appears at crop coordinate
#       p = P - cross[f] + (184,184).
#   If the pellets are frozen at the aim point of the FIRING frame, their cloud centre is P ~=
#   cross[t0], which lands at crop coordinate cross[t0] - cross[f] + (184,184). Therefore
#       CLOUD := centroid(crop) - (184,184)  ==  cross[t0] - cross[f]  =:  DISP
#   under H1 -- a DIRECT match, no sign flip, with DISP defined exactly as the plan's §3 defines it.
#   Equivalently: if the crosshair pans +x between t0 and f, DISP is -x and the cloud is left of
#   centre, which is the plan's own prose statement of the same thing.
CENTERING_SLICE_FIXTURE = REAL_GT_DIR / 'centering-slice.json'
CENTERING_T0_PERTURB = 2   # plan §5 confound 5: is DISP stable if find_t0's estimate is off by +-2?
CENTERING_HEADLINE_OFFSET = 8   # §3 computes the rule on f08; the other offsets are reported too


def _mean(vals):
    return sum(vals) / len(vals) if vals else None


def _sd(vals):
    if len(vals) < 2:
        return 0.0
    m = _mean(vals)
    return math.sqrt(sum((v - m) ** 2 for v in vals) / (len(vals) - 1))


def build_centering_slice(tracks_dir):
    """Extract the minimal crosshair-track slice the centering audit needs from a pair of
    count-pellets.py --dump-tracks dumps regenerated at the ground-truth clip's EXACT parameters
    (at=15 dur=30 fps=60 zoom=2). Two dumps because the fixture itself records a per-shot `locate`
    mode: shot 4's structural lock mislocked onto a floating damage-number stack across its whole
    f8-11 window, so its crops were cut from a template-mode run (groundtruth-f8-11.json's own
    `locate_note`). Using the structural dump for shot 4 would measure a DIFFERENT crop's centre
    than the one the owner annotated.

    Slicing rather than committing the 2.7MB dumps keeps the selftest fixture small; nothing outside
    frames t0-2..t0+2 and the four counting frames is used by compute_centering()."""
    tracks_dir = Path(tracks_dir)
    dumps = {}
    for mode in ('structural', 'template'):
        p = tracks_dir / f'tracks-{mode}.json'
        if p.exists():
            dumps[mode] = json.loads(p.read_text())
    if 'structural' not in dumps:
        raise SystemExit(f'--audit-centering: {tracks_dir}/tracks-structural.json not found. '
                         'Regenerate it at the ground-truth clip parameters; see '
                         'docs/handoffs/2026-08-01-pellet-centering-test-plan.md §4.')
    gt = json.loads(REAL_GT_PATH.read_text())
    out = []
    for shot in gt['shots']:
        if shot.get('t0') is None:
            continue
        mode = shot.get('locate', 'structural')
        if mode not in dumps:
            raise SystemExit(f'--audit-centering: shot {shot["shot"]} needs the {mode} dump '
                             f'({tracks_dir}/tracks-{mode}.json), which is missing.')
        d = dumps[mode]
        cross, confs = d['cross_positions'], d['cross_confs']
        t0 = shot['t0']
        offsets = sorted(int(re.match(r'^f(\d\d)_', Path(c).name).group(1))
                         for c in shot['crops'] if re.match(r'^f\d\d_', Path(c).name))
        want = {t0 + k for k in range(-CENTERING_T0_PERTURB, CENTERING_T0_PERTURB + 1)}
        want |= {t0 + o for o in offsets}
        out.append({
            'shot': shot['shot'], 'video_t': shot['video_t'], 't0': t0, 'locate': mode,
            'owner_white': shot['white'], 'offsets': offsets,
            # str keys: JSON has no int keys, and round-tripping through the fixture must be lossless
            'cross': {str(i): cross[i] for i in sorted(want) if i < len(cross)},
            'confs': {str(i): confs[i] for i in sorted(want) if i < len(confs)},
        })
    return out


def compute_centering(slice_shots):
    """Pure arithmetic over the slice + the committed owner positions. No images, no cv2.

    Per shot and counting offset: DISP = cross[t0] - cross[f], CLOUD = centroid - (184,184),
    residual = CLOUD - DISP. Also the t0 +-CENTERING_T0_PERTURB stability sweep and the cloud's own
    centroid standard error, both of which the plan lists as confounds that must be reported
    alongside the number rather than after it."""
    pos = json.loads(REAL_POSITIONS_PATH.read_text())
    by_shot = {s['shot']: s for s in pos['shots']}
    c0 = float(REAL_CROP_RADIUS)
    shots_out = []
    for sl in slice_shots:
        pshot = by_shot.get(sl['shot'])
        if pshot is None:
            raise SystemExit(f'--audit-centering: shot {sl["shot"]} has no owner positions in '
                             f'{REAL_POSITIONS_PATH.name}')
        frames_by_off = {}
        for fr in pshot['frames']:
            m = re.match(r'^f(\d\d)_', fr['frame'])
            if m:
                frames_by_off[int(m.group(1))] = fr
        t0 = sl['t0']
        cross, confs = sl['cross'], sl['confs']
        if str(t0) not in cross or cross[str(t0)] is None:
            raise SystemExit(f'--audit-centering: shot {sl["shot"]} has no crosshair lock at t0={t0}')
        ct0 = cross[str(t0)]
        per_offset = []
        for off in sl['offsets']:
            fi = t0 + off
            fr = frames_by_off.get(off)
            if fr is None:
                raise SystemExit(f'--audit-centering: shot {sl["shot"]} offset f{off:02d} has no '
                                 f'owner positions -- refusing to score a frame nobody marked')
            cf = cross.get(str(fi))
            if cf is None:
                raise SystemExit(f'--audit-centering: shot {sl["shot"]} has no crosshair lock at '
                                 f'counting frame {fi}')
            xs = [p[0] for p in fr['positions']]
            ys = [p[1] for p in fr['positions']]
            n = len(xs)
            cloud = [_mean(xs) - c0, _mean(ys) - c0]
            se = [_sd(xs) / math.sqrt(n) if n else None, _sd(ys) / math.sqrt(n) if n else None]
            disp = [ct0[0] - cf[0], ct0[1] - cf[1]]
            resid = [cloud[0] - disp[0], cloud[1] - disp[1]]
            per_offset.append({
                'offset': off, 'frame_idx': fi, 'n_pellets': n,
                'cross_t0': ct0, 'cross_f': cf,
                'conf_t0': confs.get(str(t0)), 'conf_f': confs.get(str(fi)),
                'DISP': [round(v, 2) for v in disp], 'DISP_mag': round(math.hypot(*disp), 2),
                'CLOUD': [round(v, 2) for v in cloud], 'CLOUD_mag': round(math.hypot(*cloud), 2),
                'CLOUD_se': [round(v, 2) if v is not None else None for v in se],
                'residual': [round(v, 2) for v in resid],
                'residual_mag': round(math.hypot(*resid), 2),
            })
        head = next(o for o in per_offset if o['offset'] == CENTERING_HEADLINE_OFFSET)
        # EMPIRICAL sign check, independent of t0 and therefore of the whole hypothesis set.
        # Between two COUNTING frames the pellets are world-fixed (they have already landed), so if
        # the sign convention above is right the cloud must translate by exactly MINUS the
        # crosshair's motion: CLOUD(f_last) - CLOUD(f_first) == -(cross[f_last] - cross[f_first]).
        # A sign error inverts this and shows up as ~2x the crosshair motion instead of ~0.
        sign_check = None
        if len(per_offset) >= 2:
            a, b = per_offset[0], per_offset[-1]
            obs = [b['CLOUD'][0] - a['CLOUD'][0], b['CLOUD'][1] - a['CLOUD'][1]]
            pred = [-(b['cross_f'][0] - a['cross_f'][0]), -(b['cross_f'][1] - a['cross_f'][1])]
            sign_check = {
                'from_offset': a['offset'], 'to_offset': b['offset'],
                'observed_cloud_delta': [round(v, 2) for v in obs],
                'predicted_from_crosshair': [round(v, 2) for v in pred],
                'error': [round(obs[0] - pred[0], 2), round(obs[1] - pred[1], 2)],
                'error_mag': round(math.hypot(obs[0] - pred[0], obs[1] - pred[1]), 2),
                'error_mag_if_sign_flipped': round(math.hypot(obs[0] + pred[0], obs[1] + pred[1]), 2),
            }
        # Confound 5: perturb t0, hold the counting frame fixed, and see how far DISP moves.
        f_head = t0 + CENTERING_HEADLINE_OFFSET
        cf_head = cross[str(f_head)]
        perturb = []
        for k in range(-CENTERING_T0_PERTURB, CENTERING_T0_PERTURB + 1):
            cp = cross.get(str(t0 + k))
            if cp is None:
                perturb.append({'dt0': k, 'DISP': None})
                continue
            dp = [cp[0] - cf_head[0], cp[1] - cf_head[1]]
            perturb.append({'dt0': k, 'frame_idx': t0 + k, 'conf': confs.get(str(t0 + k)),
                            'DISP': [round(v, 2) for v in dp],
                            'delta_from_t0': round(math.hypot(dp[0] - head['DISP'][0],
                                                              dp[1] - head['DISP'][1]), 2)})
        shots_out.append({
            'shot': sl['shot'], 'video_t': sl['video_t'], 't0': t0, 'locate': sl['locate'],
            'owner_white': sl['owner_white'], 'per_offset': per_offset,
            'headline': {k: head[k] for k in ('offset', 'frame_idx', 'n_pellets', 'DISP', 'DISP_mag',
                                              'CLOUD', 'CLOUD_mag', 'CLOUD_se', 'residual',
                                              'residual_mag', 'conf_t0', 'conf_f')},
            't0_perturbation': perturb,
            't0_perturb_max_delta': round(max((p['delta_from_t0'] for p in perturb
                                               if p['DISP'] is not None), default=0.0), 2),
            'sign_check': sign_check,
            # residual == P - cross[t0], so it must NOT depend on f. Any spread across the four
            # counting frames is pure measurement noise, and a large one would mean the pellets are
            # NOT world-fixed over the counting window (invalidating the whole framing).
            'residual_spread_across_offsets': round(max(
                math.hypot(o['residual'][0] - head['residual'][0],
                           o['residual'][1] - head['residual'][1]) for o in per_offset), 2),
        })
    return {
        'n_shots': len(shots_out),
        'crop_center': [c0, c0],
        'headline_offset': CENTERING_HEADLINE_OFFSET,
        'sign_convention': 'CLOUD == cross[t0] - cross[f] == DISP under H1 (see the section comment)',
        'shots': shots_out,
    }


def _centering_expected_block(report):
    """The subset the selftest pins -- per shot, the f08 headline vectors plus the t0-stability
    number. Small enough to read in a diff, specific enough that any arithmetic or indexing change
    moves it."""
    return {str(s['shot']): {
        'DISP': s['headline']['DISP'], 'CLOUD': s['headline']['CLOUD'],
        'residual': s['headline']['residual'], 'residual_mag': s['headline']['residual_mag'],
        't0_perturb_max_delta': s['t0_perturb_max_delta'],
        'sign_check_error_mag': s['sign_check']['error_mag'] if s['sign_check'] else None,
        'residual_spread_across_offsets': s['residual_spread_across_offsets'],
    } for s in report['shots']}


def verify_centering_crops(tracks_dir):
    """THE INDEXING GATE, made re-runnable instead of a one-off (constraint 9).

    Every DISP number depends on the regenerated crosshair track being indexed to the SAME frames
    the committed crops were cut from. Nothing else in this audit can detect an off-by-N frame
    index or a wrong --locate mode -- it would just produce confident garbage. So: re-cut each
    committed crop from the regenerated frames at cross[frame_idx] and require BYTE identity.

    crop_disc() upscales x3 for review; the committed set is the native-resolution re-encode of
    those (see make-groundtruth-f811.py's commit message), so the comparison is done at scale 1.
    Returns None when TRACKS_DIR has no frames/ dir (the fixture-replay path can't run this)."""
    import numpy as np  # local: only this path needs them, and the selftest path must stay
    import cv2          # dependency-free (no images, no cv2) like every other *-selftest here

    tracks_dir = Path(tracks_dir)
    frames = sorted((tracks_dir / 'frames').glob('f_*.png'))
    if not frames:
        return None
    gt = json.loads(REAL_GT_PATH.read_text())
    dumps = {m: json.loads((tracks_dir / f'tracks-{m}.json').read_text())
             for m in ('structural', 'template') if (tracks_dir / f'tracks-{m}.json').exists()}
    out = {'n_checked': 0, 'n_identical': 0, 'mismatches': []}
    for shot in gt['shots']:
        d = dumps.get(shot.get('locate', 'structural'))
        if d is None:
            continue
        cross = d['cross_positions']
        rad = int(d['params']['pellet_radius'] * 1.15)
        for rel in shot['crops']:
            m = re.search(r'_idx(\d+)\.png$', Path(rel).name)
            if not m:
                continue
            fi = int(m.group(1))
            ref = cv2.imread(str(REAL_GT_DIR / rel))
            cx, cy = (int(v) for v in cross[fi])
            im = cv2.imread(str(frames[fi]))
            got = im[max(cy - rad, 0):cy + rad, max(cx - rad, 0):cx + rad]
            out['n_checked'] += 1
            if got.shape == ref.shape and not np.any(got != ref):
                out['n_identical'] += 1
            else:
                out['mismatches'].append({'crop': rel, 'frame_idx': fi, 'cross': [cx, cy],
                                          'got_shape': list(got.shape), 'ref_shape': list(ref.shape)})
    out['all_identical'] = out['n_checked'] > 0 and not out['mismatches']
    return out


def audit_centering(tracks_dir, save_fixture_path=None):
    gate = verify_centering_crops(tracks_dir)
    if gate is not None and not gate['all_identical']:
        print(json.dumps(gate, indent=2), file=sys.stderr)
        raise SystemExit(
            '--audit-centering: INDEXING GATE FAILED -- the regenerated crops are not byte-identical '
            'to the committed ones, so the frame indexing or the --locate mode is wrong and every '
            'DISP below would be meaningless. Refusing to report numbers. Regenerate the tracks at '
            'the exact ground-truth clip parameters (at=15 dur=30 fps=60 zoom=2); see '
            'docs/handoffs/2026-08-01-pellet-centering-test-plan.md §4.')
    slice_shots = build_centering_slice(tracks_dir)
    report = compute_centering(slice_shots)
    report['indexing_gate'] = gate or 'skipped (no frames/ dir alongside the tracks dumps)'
    if save_fixture_path:
        Path(save_fixture_path).write_text(json.dumps({
            '_source': ('count-pellets.py --dump-tracks crosshair tracks, regenerated at the '
                        'groundtruth-f8-11 clip parameters (at=15 dur=30 fps=60 zoom=2, '
                        'docs/probes/clean-weapons/marciana-solo.MP4 -- slug `marciana`, SG/Iron, '
                        'NOT `marciana-marine-study`), sliced to the frames the centering audit '
                        'reads. Structural for shots 1/2/3/5, template for shot 4, matching each '
                        "shot's own `locate` field in groundtruth-f8-11.json."),
            '_note': ('Indexing was gated before this was written: the crops regenerated from these '
                      'same dumps are BYTE-IDENTICAL to all 21 committed crops under '
                      'groundtruth-f8-11/, and find_t0 reproduces every recorded t0 '
                      '(None/1060/1096/1140/1289/1369). Pins compute_centering() with no images, '
                      'subprocess or cv2 -- see score-pellets.py --audit-centering-selftest and '
                      'docs/handoffs/2026-08-01-pellet-centering-test-plan.md.'),
            'clip': {'at': 15, 'dur': 30, 'fps': 60, 'zoom': 2},
            'shots': slice_shots,
            '_expected': _centering_expected_block(report),
        }, indent=2) + '\n')
        print(f'wrote centering slice fixture -> {save_fixture_path}', file=sys.stderr)
    print(json.dumps(report, indent=2))
    print('\naudit-centering (f08 headline; DISP = cross[t0]-cross[f], CLOUD = centroid-(184,184)):',
          file=sys.stderr)
    print(f"{'shot':>4} {'loc':>10} {'DISP':>18} {'CLOUD':>18} {'CLOUD-DISP':>18} {'|res|':>7} "
          f"{'conf_t0':>8} {'conf_f':>7} {'t0+-2':>7}", file=sys.stderr)
    for s in report['shots']:
        h = s['headline']
        fmt = lambda v: f"({v[0]:+7.1f},{v[1]:+7.1f})"  # noqa: E731
        ct, cf = h['conf_t0'], h['conf_f']
        print(f"{s['shot']:>4} {s['locate']:>10} {fmt(h['DISP']):>18} {fmt(h['CLOUD']):>18} "
              f"{fmt(h['residual']):>18} {h['residual_mag']:>7.1f} "
              f"{(f'{ct:.3f}' if ct is not None else '-'):>8} "
              f"{(f'{cf:.3f}' if cf is not None else '-'):>7} "
              f"{s['t0_perturb_max_delta']:>7.1f}", file=sys.stderr)
    print('\nsign check (pellets are world-fixed between counting frames, so the cloud must move by '
          'MINUS the crosshair):', file=sys.stderr)
    for s in report['shots']:
        sc = s['sign_check']
        if not sc:
            continue
        print(f"  shot{s['shot']}: f{sc['from_offset']:02d}->f{sc['to_offset']:02d} "
              f"observed={sc['observed_cloud_delta']} predicted={sc['predicted_from_crosshair']} "
              f"|err|={sc['error_mag']:.1f}  (|err| if sign were flipped: "
              f"{sc['error_mag_if_sign_flipped']:.1f})   residual spread across f08-f11 = "
              f"{s['residual_spread_across_offsets']:.1f}px", file=sys.stderr)


def audit_centering_selftest():
    """Constraint 9 self-validation, same precedent as --audit-fidelity-real-selftest /
    real-fidelity-slice.json: replays compute_centering() over the committed crosshair slice + the
    committed owner positions and compares to the fixture's own _expected block."""
    data = json.loads(CENTERING_SLICE_FIXTURE.read_text())
    got = _centering_expected_block(compute_centering(data['shots']))
    expected = data['_expected']
    ok = got == expected
    print(f'expected: {json.dumps(expected, sort_keys=True)}')
    print(f'got:      {json.dumps(got, sort_keys=True)}')
    print('SELFTEST PASS' if ok else 'SELFTEST FAIL')
    return 0 if ok else 1


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
    positions -- which includes the real-fixture screen even under --real-positions, whose owner
    marks are PER FRAME (`positions_per_frame`) rather than the single static list this takes; the
    persist family therefore reports no precision/recall on the real screen rather than a wrong
    one."""
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
    # The real screen's owner marks are PER FRAME (each frame marked independently), not one static
    # list reused across offsets the way a synthetic sequence's are -- same structural difference
    # --audit-fidelity-real already handles. Only set by load_real_sequences(with_positions=True).
    per_frame_positions = seq.get('positions_per_frame')
    per_offset = []
    for fi in range(n_frames):
        offset = fi + 1
        if per_frame_positions is not None:
            true_positions = per_frame_positions[fi]
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


def check_labels_countable(labels_path):
    """REFUSE (same style as count-pellets.py's --load-detections/--dump-detections guards) to
    score a synthetic labels.json that contains any structurally uncountable labeled pellet --
    inside --center-exclude, off-frame, or beyond --pellet-radius. Delegates to
    make-synthetic-pellets.py --audit-labels (constraint 9: one guard, not a re-implementation of
    it here) rather than re-deriving the check. 2026-07-31: the generator used to place ~24% of
    labels inside the excluded annulus it was itself configured to reject, which is exactly the bug
    this refuses on."""
    maker = HERE / 'make-synthetic-pellets.py'
    proc = subprocess.run([PY, str(maker), '--audit-labels', str(labels_path)],
                           capture_output=True, text=True)
    sys.stderr.write(proc.stdout)
    sys.stderr.write(proc.stderr)
    if proc.returncode != 0:
        raise SystemExit(f'score-pellets.py: REFUSING to score {labels_path} -- '
                          'make-synthetic-pellets.py --audit-labels found it uncountable (see above)')


def run(args):
    if args.real_fixture:
        sequences = load_real_sequences(pellet_radius=args.pellet_radius,
                                        center_exclude=args.center_exclude,
                                        with_positions=args.real_positions)
        tmp_dir = REPO / 'scratchpad' / 'pellets' / '_score_tmp_real'
    else:
        check_labels_countable(args.labels)
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
        row = {
            'seq': seq['seq'], 'video': seq['video'], 'n_pellets': seq['n_pellets'],
            'f8_11_mean_count': round(mean_count, 2), 'error': round(err, 2),
        }
        if args.real_positions:
            # Raw admitted-detection total across this shot's frames -- the "how many detections did
            # widening newly admit" number a window sweep is read on, which the mean/TP-FP split
            # alone does not give (a cell can gain TPs and FPs at once).
            row['pred_total'] = sum(o['pred'] for o in per_offset)
            row['true_total'] = sum(len(p) for p in seq['positions_per_frame'])
            row['tp'] = sum(o['tp'] for o in per_offset)
            row['fp'] = sum(o['fp'] for o in per_offset)
            row['fn'] = sum(o['fn'] for o in per_offset)
        per_seq_report.append(row)
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
    # Provenance for a windowed measurement: which window produced these numbers. Emitted only when
    # the window is NOT the documented default or when position scoring is on, so a plain
    # `--real-fixture` run's output stays byte-identical to every reproduction already on record
    # (docs/handoffs/2026-08-01-pellet-cascade-JUDGE-handoff.md's requirement).
    if args.real_fixture and (args.real_positions
                              or args.pellet_radius != REAL_PELLET_RADIUS
                              or args.center_exclude != REAL_CENTER_EXCLUDE):
        report['window'] = {
            'pellet_radius': args.pellet_radius, 'center_exclude': args.center_exclude,
            'baseline_pellet_radius': REAL_PELLET_RADIUS,
            'baseline_center_exclude': REAL_CENTER_EXCLUDE,
        }
    if args.real_positions:
        report['pred_total'] = sum(r['pred_total'] for r in per_seq_report)
        report['true_total'] = sum(r['true_total'] for r in per_seq_report)
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
    # --- real-window overrides (2026-08-01, docs/handoffs/2026-08-01-pellet-cascade-JUDGE-handoff.md)
    # DEFAULTS ARE THE LIVE CONSTANTS AND ARE NOT CHANGED BY THIS FLAG PAIR: these exist so the
    # counter's WINDOW can be swept against the 6 owner-counted real shots without editing
    # REAL_PELLET_RADIUS / REAL_CENTER_EXCLUDE between runs. --audit-fidelity-real measures filter
    # survival with no windowing at all; ~10% of the owner marks sit outside the live window, and
    # the synthetic generator can never show it (all 884 labels are strictly inside by
    # construction). Landing any new default is a separate, owner-gated pass.
    ap.add_argument('--pellet-radius', type=int, default=REAL_PELLET_RADIUS,
                     help=f'(--real-fixture) outer window radius in crop px (default '
                          f'{REAL_PELLET_RADIUS}, the live value); sweeping this does NOT change '
                          f'any default')
    ap.add_argument('--center-exclude', type=float, default=REAL_CENTER_EXCLUDE,
                     help=f'(--real-fixture) inner exclusion radius in crop px (default '
                          f'{REAL_CENTER_EXCLUDE}, the live value); sweeping this does NOT change '
                          f'any default')
    ap.add_argument('--real-positions', action='store_true',
                     help='(--real-fixture) also score position-level TP/FP/FN against the '
                          'owner-marked xy positions (groundtruth-f8-11-positions.json), turning '
                          'on precision/recall for the real screen, which is otherwise count-only. '
                          'Every owner mark counts toward recall regardless of the window, so '
                          'recall is comparable across --pellet-radius/--center-exclude settings.')
    ap.add_argument('--estimators', action='store_true',
                     help='also score the pre-registered cheap-estimator list (median/max/quantile '
                          'aggregations) alongside the current-pipeline control')
    ap.add_argument('--audit-fidelity', metavar='PATH',
                     help='GENERATOR FIDELITY GATE: for each labeled pellet at f8-11, find the '
                          'nearest raw (pre-filter) connected component and report the cascade '
                          '(raw-found -> +min_area -> +min_circ -> BOTH); REFUSES (exit 1) if the '
                          'both-pass rate falls below FIDELITY_BOTH_PASS_FLOOR (0.90, a DERIVED '
                          'reference -- see the constant\'s docstring). Needs the labels\' rendered '
                          'frames on disk (reproduce first, same convention as --audit-labels).')
    ap.add_argument('--save-detections-fixture', metavar='PATH',
                     help='(--audit-fidelity / --audit-fidelity-real) also write the positions + '
                          'raw f8-11 detections used, for building/refreshing that mode\'s '
                          'committed selftest fixture (synthetic-fidelity-slice.json / '
                          'real-fidelity-slice.json)')
    ap.add_argument('--audit-fidelity-real', action='store_true',
                     help='REAL-pellet cascade: run the SAME raw-found -> +min_area -> +min_circ -> '
                          'BOTH cascade over the owner-marked pellet positions on the 6 real f8-11 '
                          'crops (groundtruth-f8-11-positions.json). Records the measurement '
                          'FIDELITY_BOTH_PASS_FLOOR was only able to DERIVE; enforces no floor. '
                          'Reports per-instance (n=168), per-distinct-pellet (n=42) and per-shot '
                          'rates. Combine with --save-detections-fixture to refresh the committed '
                          '--audit-fidelity-real-selftest fixture. Needs the probe venv (cv2).')
    ap.add_argument('--audit-fidelity-real-selftest', action='store_true',
                     help='pin compute_real_fidelity_cascade() against the committed '
                          'real-fidelity-slice.json fixture and exit -- no images/subprocess '
                          'needed (constraint 9 self-validation)')
    ap.add_argument('--audit-fidelity-selftest', action='store_true',
                     help='pin compute_fidelity_cascade() against the committed '
                          'synthetic-fidelity-slice.json fixture and exit -- no images/subprocess '
                          'needed (constraint 9 self-validation)')
    ap.add_argument('--audit-centering', metavar='TRACKS_DIR',
                     help='CROP-CENTERING AUDIT: measure whether the owner-marked pellet cloud\'s '
                          'offset from the f8-11 crop centre is the crosshair\'s own motion between '
                          'the firing frame t0 and the counting frame f (DISP = cross[t0]-cross[f] '
                          'vs CLOUD = centroid-(184,184), plus the residual, the cloud\'s centroid '
                          'SE, the locator confidences and a t0+-2 stability sweep). TRACKS_DIR must '
                          'hold tracks-structural.json (and tracks-template.json, which shot 4 '
                          'needs) from count-pellets.py --dump-tracks regenerated at the ground-'
                          'truth clip parameters at=15 dur=30 fps=60 zoom=2. Records a measurement; '
                          'changes no constant and no centring behaviour '
                          '(docs/handoffs/2026-08-01-pellet-centering-test-plan.md §6). Combine with '
                          '--save-centering-fixture to refresh the committed selftest fixture.')
    ap.add_argument('--save-centering-fixture', metavar='PATH',
                     help='(--audit-centering) also write the sliced crosshair track + expected '
                          'block, for building/refreshing centering-slice.json')
    ap.add_argument('--audit-centering-selftest', action='store_true',
                     help='pin compute_centering() against the committed centering-slice.json '
                          'fixture and exit -- no images/subprocess needed (constraint 9 '
                          'self-validation)')
    ap.add_argument('--selftest', action='store_true')
    args = ap.parse_args()
    if args.selftest:
        raise SystemExit(selftest())
    if args.audit_centering_selftest:
        raise SystemExit(audit_centering_selftest())
    if args.audit_centering:
        audit_centering(args.audit_centering, save_fixture_path=args.save_centering_fixture)
        return
    if args.audit_fidelity_selftest:
        raise SystemExit(audit_fidelity_selftest())
    if args.audit_fidelity_real_selftest:
        raise SystemExit(audit_fidelity_real_selftest())
    if args.audit_fidelity_real:
        audit_fidelity_real(save_fixture_path=args.save_detections_fixture)
        return
    if args.audit_fidelity:
        audit_fidelity(args.audit_fidelity, save_fixture_path=args.save_detections_fixture)
        return
    if not args.labels and not args.real_fixture:
        ap.error('--labels or --real-fixture is required (or use --selftest)')
    # The window overrides are real-screen-only by construction: a synthetic sequence carries its
    # OWN pellet_radius/center_exclude in labels.json (the generator placed its labels against
    # those), so silently overriding them would score a labels file against a window it was never
    # generated for. Refuse rather than mislead.
    if not args.real_fixture and (args.pellet_radius != REAL_PELLET_RADIUS
                                  or args.center_exclude != REAL_CENTER_EXCLUDE
                                  or args.real_positions):
        ap.error('--pellet-radius/--center-exclude/--real-positions apply to --real-fixture only '
                 '(a synthetic labels.json carries its own window)')
    run(args)


if __name__ == '__main__':
    main()
