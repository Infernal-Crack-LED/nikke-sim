#!/usr/bin/env python3
"""Synthetic SG pellet-blast sequences with exact labels — Phase 1 §1.2 steps 1-4,
docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md.

Six hand-counted real shots (scripts/tests/fixtures/pellets/groundtruth-f8-11.json) cannot
separate candidate detectors/counters. This generates as many labeled examples as needed by
compositing REAL pellet patches (cropped from the owner-counted ground truth, so their pixel
statistics are real, not synthesized from scratch) onto REAL background frames sampled from all
four SG videos (marciana/noir/guilty/isabel), rendered as full 13-frame lifecycle sequences (not
isolated frames) so Phase 2's per-track lifecycle scorer has something to score against.

The 13-frame size/alpha curve below is THIS SCRIPT's linear interpolation of the owner's
QUALITATIVE lifecycle table (docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md, "The
pellet lifecycle (owner spec, 2026-07-30)") -- f1=1x, peak 2x held at f3-4, shrink back to 1x by
f11, fade over f12-13. It is NOT re-derived from a separate measurement; treat it as a modeling
choice, not a second data point corroborating the spec.

HONEST LIMIT (mandatory per the plan's own instruction): the background for one synthetic blast
is a SINGLE real quiet frame (no detected pellets nearby) repeated across all 13 frames, not a
real 13-frame background sequence -- avoids needing a fresh 60fps extraction for guilty/isabel/
noir (only marciana has one, from the groundtruth-f8-11 session; the other three videos' existing
dumps in scratchpad/pellets/ are 30fps). This is a reasonable simplification (a game background
barely changes in 0.2s) but it means NO synthetic sequence exercises background motion/VFX
evolution within a blast, and it means the compositing itself (alpha-blit a real cropped patch)
is easier than however the game actually renders/blends its own pellet markers -- scores here
are optimistic relative to real footage BY CONSTRUCTION. Per the plan: the 6 owner-counted real
shots and the docs/probe-data/*-sg-band.json anchors are a MANDATORY held-out real-data check; a
candidate must pass both, never this alone.

Run with the probe venv:
  scripts/probe/.venv/bin/python scripts/probe/make-synthetic-pellets.py \\
      --out scratchpad/pellets/synthetic --seed 20260731 --sequences-per-video 6

--audit-labels PATH   report + REFUSE (loud banner, exit 1) if a generated labels.json contains any
                       labeled pellet the CONFIGURED pipeline (--center-exclude, --pellet-radius) is
                       never going to see -- inside the center-exclude annulus, off the rendered
                       frame, or beyond pellet_radius. Standing guard for the 2026-07-31 bug below.
--audit-selftest       pins the audit's union-counting arithmetic against a fixed 3-position
                       example, no files needed (constraint 9 self-validation).

**2026-07-31 fix, and the invariant it enforces.** Pellet placement used to be
`r = max(8, gauss(MEDIAN_R, R_SPREAD))` -- an unclamped floor at 8px that let ~24% of placements
land inside `--center-exclude 36` (the SAME 36 this script's own CENTER_EXCLUDE constant declares
and score-pellets.py passes to the counter), plus a few off-frame from crosshairs near the top edge.
Those pellets were labeled as truth the counter is CONFIGURED to discard -- 28.9% of the n=12
baseline was structurally uncountable, which is why every estimator scored 2+ pellets cold on the
synthetic screen and disagreed with the real-footage screen by a wide margin (see the plan's §2.2b
correction log). Fixed by resampling (never clamping) `r` into `[CENTER_EXCLUDE + margin,
PELLET_RADIUS]` and rejecting any position that would not fully render inside the frame, for every
placed pellet.

⚠ **Consequence, stated honestly, not a second measurement:** truncating the gaussian at
`CENTER_EXCLUDE + margin` instead of letting it range from 8px shifts the radial distribution away
from HANDOFF.md's documented "median ~64, spread 40" and slightly EASIER (less crowding near the
crosshair, since the excluded annulus is where pellets pack most densely). This is a modeling
choice made explicit, same standard as the background/compositing honest limit below -- not a claim
about real pellet placement.

**Which invariant this enforces:** truth here means "a pellet the correctly-configured counter
SHOULD count," not "every pellet that exists in the scene." The labeled set exists to score
counters against the pipeline's own configuration; labeling something the pipeline is configured to
reject makes the gate untestable rather than strict.
"""
import argparse
import json
import math
import random
import sys
from pathlib import Path

import cv2
import numpy as np

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
GT_FIXTURE = REPO / 'scripts' / 'tests' / 'fixtures' / 'pellets' / 'groundtruth-f8-11.json'
GT_CROPS_DIR = REPO / 'scripts' / 'tests' / 'fixtures' / 'pellets'

# Background sources: existing structural-localization dumps in the MAIN TREE's scratchpad
# (gitignored, not re-derived here -- reuse-before-derive, CLAUDE.md §⚖). All four are the
# Phase 2A/2A-G2/H4 artifacts this plan already produced and cited.
VIDEO_DUMPS = {
    'marciana': '/Users/maxwellsutton/nikke-sim/scratchpad/pellets/h4-marciana-structural',
    'noir': '/Users/maxwellsutton/nikke-sim/scratchpad/pellets/g2-noir-structural',
    'guilty': '/Users/maxwellsutton/nikke-sim/scratchpad/pellets/h4-guilty-structural',
    'isabel': '/Users/maxwellsutton/nikke-sim/scratchpad/pellets/h4-isabel-structural',
}

PELLET_RADIUS = 160    # zoomed px, matches every reference run's --pellet-radius at zoom 2
CENTER_EXCLUDE = 36    # score-pellets.py passes this to count-pellets.py --center-exclude
CENTER_EXCLUDE_MARGIN = 6  # buffer above count-pellets.py's strict "< center_exclude" rejection --
                           # a composited patch's rendered centroid can round a pixel or two off the
                           # nominal placement, so sit clear of the boundary rather than exactly on it
MIN_R = CENTER_EXCLUDE + CENTER_EXCLUDE_MARGIN
MAX_PLACEMENT_TRIES = 200  # per-pellet resample budget before giving up on this background frame
MEDIAN_R, R_SPREAD = 64, 40  # HANDOFF.md: white pellets median radius ~64px zoom2 from crosshair


def sample_pellet_position(cx0, cy0, w, h, edge_margin, rng, max_tries=MAX_PLACEMENT_TRIES):
    """Resample (never clamp) a radius/angle draw until it lands where the CONFIGURED pipeline can
    count it: outside --center-exclude (with margin), inside --pellet-radius, and far enough from
    every frame edge that the rendered patch (up to its 2x peak-lifecycle size) is never clipped.
    Returns None if `max_tries` is exhausted -- the caller must treat that as "this background is
    unusable," not silently accept a degraded (clamped/off-frame) placement."""
    for _ in range(max_tries):
        r = rng.gauss(MEDIAN_R, R_SPREAD)
        if not (MIN_R <= r <= PELLET_RADIUS):
            continue
        theta = rng.uniform(0, 2 * math.pi)
        x, y = cx0 + r * math.cos(theta), cy0 + r * math.sin(theta)
        if edge_margin <= x <= w - edge_margin and edge_margin <= y <= h - edge_margin:
            return x, y
    return None


def lifecycle_scale(offset):
    """offset: 1..13 (game frame within the blast). Returns the pellet's linear SIZE multiplier.

    f1=1x -> grows to 2x by f3, holds through f4 (the only two frames at one size), shrinks
    linearly back to 1x by f11, holds at 1x while fading (f12-13 alpha, not further shrinkage --
    the table lists f12-13 size as "1x", not smaller).
    """
    if offset <= 1:
        return 1.0
    if offset <= 3:
        return 1.0 + (offset - 1) * 0.5      # f1=1.0, f2=1.5, f3=2.0
    if offset <= 4:
        return 2.0
    if offset <= 11:
        return 2.0 - (offset - 4) * (1.0 / 7)  # f4=2.0 .. f11=1.0, linear
    return 1.0


def lifecycle_alpha(offset):
    """f1-11 fully opaque; f12-13 fade ("partially transparent") toward, but not to, zero."""
    if offset <= 11:
        return 1.0
    if offset == 12:
        return 0.66
    return 0.33


def extract_patch_library(rng):
    """Real pellet patches (RGBA, soft-edged) cropped from the owner-counted f8-11 ground truth.
    Shares NO threshold/filter tuning with count-pellets.py beyond the settled defaults (area
    25-750, circ>=0.55, WHITE_LO 210) -- this is asset harvesting, not detection under test."""
    gt = json.loads(GT_FIXTURE.read_text())
    patches = []
    for shot in gt['shots']:
        if shot['white'] == 0:
            continue
        for rel in shot['crops']:
            im = cv2.imread(str(GT_CROPS_DIR / rel))
            if im is None:
                continue
            rgb = cv2.cvtColor(im, cv2.COLOR_BGR2RGB)
            mask = np.all(rgb >= 210, axis=2).astype(np.uint8) * 255
            n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
            for i in range(1, n):
                area = stats[i, cv2.CC_STAT_AREA]
                if not (25 <= area <= 750):
                    continue
                x, y, w, h = (stats[i, cv2.CC_STAT_LEFT], stats[i, cv2.CC_STAT_TOP],
                              stats[i, cv2.CC_STAT_WIDTH], stats[i, cv2.CC_STAT_HEIGHT])
                comp = (labels[y:y + h, x:x + w] == i).astype(np.uint8) * 255
                perim = cv2.arcLength(cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0][0], True)
                circ = 4 * math.pi * area / (perim * perim) if perim else 0
                if circ < 0.55:
                    continue
                pad = 4
                y0, y1 = max(0, y - pad), min(rgb.shape[0], y + h + pad)
                x0, x1 = max(0, x - pad), min(rgb.shape[1], x + w + pad)
                patch_rgb = rgb[y0:y1, x0:x1].copy()
                patch_mask = np.zeros(patch_rgb.shape[:2], np.uint8)
                py0, px0 = y - y0, x - x0
                patch_mask[py0:py0 + h, px0:px0 + w] = comp
                alpha = cv2.GaussianBlur(patch_mask, (5, 5), 0)
                patches.append(np.dstack([patch_rgb, alpha]))
    if not patches:
        raise SystemExit('no pellet patches extracted from the ground-truth fixture')
    rng.shuffle(patches)
    return patches


def load_dump(path):
    d = json.loads((Path(path) / 'tracks.json').read_text())
    p = json.loads((Path(path) / 'pellets.json').read_text())
    return d['frame_files'], d['cross_positions'], d['frame_counts'], d['params'], p


def find_quiet_frames(frame_counts, cross_positions, pellets_meta, n, rng, min_gap=12):
    """Frame indices with white==0 and red==0 AND a resolved crosshair AND at least `min_gap`
    quiet neighbours either side (avoids sitting in the tail/lead-in of a real blast) --
    restricted to the ACTUAL FIGHT WINDOW (fightStartVideoT .. +180s). These dumps extract from
    video t=0, which includes pre-fight menu/character-showcase frames; without this bound, a
    "quiet" (white==0) menu frame gets picked as a combat background by mistake -- caught by
    visual inspection of an early run (a Marciana bio-card screen, not gameplay).

    Returns the FULL shuffled candidate pool (not just `n`), so the caller can skip backgrounds
    whose crosshair sits too close to a frame edge to place pellets validly and still reach `n`
    built sequences without re-deriving a bigger pool after the fact."""
    fps = pellets_meta['fps']
    fight_start = pellets_meta.get('fightStartVideoT') or 0
    lo = int(round(fight_start * fps))
    hi = min(len(frame_counts), int(round((fight_start + 180) * fps)))
    quiet = [i for i in range(max(min_gap, lo), min(hi, len(frame_counts) - min_gap))
             if cross_positions[i]
             and all(frame_counts[j]['white'] == 0 and frame_counts[j]['red'] == 0
                     for j in range(i - min_gap, i + min_gap))]
    if len(quiet) < n:
        raise SystemExit(f'only {len(quiet)} quiet in-fight frames found (need {n}) -- widen the video or shrink min_gap')
    rng.shuffle(quiet)
    return quiet


def composite(bg_bgr, patches_for_pellets, positions, offset):
    out = bg_bgr.copy().astype(np.float32)
    scale = lifecycle_scale(offset)
    alpha_mult = lifecycle_alpha(offset)
    boxes = []  # (cx, cy, r) for occlusion bookkeeping
    for patch, (cx, cy) in zip(patches_for_pellets, positions):
        rgb, a = patch[..., :3], patch[..., 3].astype(np.float32) / 255.0
        h0, w0 = rgb.shape[:2]
        h1, w1 = max(1, round(h0 * scale)), max(1, round(w0 * scale))
        rgb_s = cv2.resize(rgb, (w1, h1), interpolation=cv2.INTER_LINEAR)
        a_s = cv2.resize(a, (w1, h1), interpolation=cv2.INTER_LINEAR) * alpha_mult
        x0, y0 = int(round(cx - w1 / 2)), int(round(cy - h1 / 2))
        x1, y1 = x0 + w1, y0 + h1
        H, W = out.shape[:2]
        sx0, sy0 = max(0, -x0), max(0, -y0)
        sx1, sy1 = w1 - max(0, x1 - W), h1 - max(0, y1 - H)
        dx0, dy0 = max(0, x0), max(0, y0)
        dx1, dy1 = min(W, x1), min(H, y1)
        if dx1 <= dx0 or dy1 <= dy0:
            continue
        a_crop = a_s[sy0:sy1, sx0:sx1][..., None]
        rgb_bgr = cv2.cvtColor(rgb_s[sy0:sy1, sx0:sx1], cv2.COLOR_RGB2BGR)
        out[dy0:dy1, dx0:dx1] = rgb_bgr * a_crop + out[dy0:dy1, dx0:dx1] * (1 - a_crop)
        boxes.append((cx, cy, max(w1, h1) / 2))
    occluded = set()
    for i in range(len(boxes)):
        for j in range(i + 1, len(boxes)):
            xi, yi, ri = boxes[i]
            xj, yj, rj = boxes[j]
            if math.hypot(xi - xj, yi - yj) < 0.7 * (ri + rj):
                occluded.add(i)
                occluded.add(j)
    return np.clip(out, 0, 255).astype(np.uint8), sorted(occluded)


def render_sequences(args):
    rng = random.Random(args.seed)
    patches = extract_patch_library(rng)
    print(f'{len(patches)} real pellet patches extracted from ground truth', file=sys.stderr)

    # Edge margin: half the largest patch dimension at the 2x peak-lifecycle scale, plus a small
    # pad, so a pellet placed this far (or farther) from every frame edge always renders in full --
    # never partially clipped off-frame, which the fix's frame-bounds invariant forbids.
    max_patch_half = max(max(p.shape[0], p.shape[1]) for p in patches) / 2.0
    edge_margin = math.ceil(max_patch_half * 2.0) + 2
    print(f'edge margin (2x-peak patch half-extent + pad): {edge_margin}px', file=sys.stderr)

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    manifest = []
    seq_id = 0
    total_skipped = 0
    for slug, dump_dir in VIDEO_DUMPS.items():
        frame_files, cross_positions, frame_counts, params, pellets_meta = load_dump(dump_dir)
        frames_dir = Path(dump_dir) / 'frames-pellet'
        quiet_pool = find_quiet_frames(frame_counts, cross_positions, pellets_meta, args.sequences_per_video, rng)
        built = 0
        skipped = 0
        for qi in quiet_pool:
            if built >= args.sequences_per_video:
                break
            bg = cv2.imread(str(frames_dir / frame_files[qi]))
            if bg is None:
                continue
            cx0, cy0 = cross_positions[qi]
            h, w = bg.shape[:2]
            n_pellets = rng.randint(5, 10)
            chosen = [patches[rng.randrange(len(patches))] for _ in range(n_pellets)]
            positions = []
            for _ in range(n_pellets):
                pos = sample_pellet_position(cx0, cy0, w, h, edge_margin, rng)
                if pos is None:
                    break
                positions.append(pos)
            if len(positions) < n_pellets:
                # This background's crosshair is too close to a frame edge to place every pellet
                # inside the countable annulus -- skip it rather than accept a degraded (clamped or
                # off-frame) placement, and try the next candidate background instead.
                skipped += 1
                continue

            seq_dir = out / f'seq{seq_id:04d}_{slug}'
            seq_dir.mkdir(parents=True, exist_ok=True)
            frames_out = []
            phases = []
            for offset in range(1, 14):
                frame, occluded = composite(bg, chosen, positions, offset)
                fname = f'f_{offset:05d}.png'
                cv2.imwrite(str(seq_dir / fname), frame)
                frames_out.append(fname)
                phases.append({
                    'offset': offset,
                    'scale': round(lifecycle_scale(offset), 3),
                    'alpha': lifecycle_alpha(offset),
                    'occluded_pellets': occluded,
                })
            manifest.append({
                'seq': seq_id, 'video': slug, 'source_frame_idx': qi,
                'crosshair': [cx0, cy0], 'n_pellets': n_pellets,
                'positions': [[round(x, 1), round(y, 1)] for x, y in positions],
                'pellet_radius': PELLET_RADIUS, 'center_exclude': CENTER_EXCLUDE,
                'frames_dir': str(seq_dir), 'frames': frames_out, 'phases': phases,
            })
            seq_id += 1
            built += 1
            print(f'  seq{seq_id - 1:04d} [{slug}] n={n_pellets} -> {seq_dir}', file=sys.stderr)
        if built < args.sequences_per_video:
            raise SystemExit(f'{slug}: only built {built}/{args.sequences_per_video} sequences '
                              f'({skipped} backgrounds skipped -- crosshair too near a frame edge '
                              'to place every pellet countably) -- widen the video pool or shrink '
                              '--sequences-per-video')
        total_skipped += skipped
        print(f'  [{slug}] skipped {skipped} unusable background(s)', file=sys.stderr)

    print(f'total backgrounds skipped across all videos: {total_skipped}', file=sys.stderr)

    manifest_path = out / 'labels.json'
    manifest_path.write_text(json.dumps({
        '_honest_limit': ('Synthetic labels validate the DETECTOR, not the compositing '
                           'assumption -- background is a single real quiet frame repeated '
                           'across all 13 offsets, and alpha-blit compositing is easier than '
                           'however the game actually blends its pellet markers. Held-out real '
                           'data (scripts/tests/fixtures/pellets/groundtruth-f8-11.json, '
                           'docs/probe-data/*-sg-band.json) is MANDATORY alongside this, never a '
                           'substitute for it. SEPARATELY (2026-07-31 fix): pellet radius is now '
                           'resampled into [CENTER_EXCLUDE + margin, PELLET_RADIUS] instead of the '
                           'unclamped gauss(MEDIAN_R=64, R_SPREAD=40) HANDOFF.md documents -- this '
                           'shifts the radial distribution and makes the set slightly EASIER (less '
                           'crowding near the crosshair), a modeling choice, not a second '
                           'measurement of real pellet placement.'),
        'seed': args.seed,
        'edge_margin_px': edge_margin,
        'total_backgrounds_skipped': total_skipped,
        'sequences': manifest,
    }, indent=2))
    print(f'wrote {len(manifest)} sequences -> {manifest_path}', file=sys.stderr)


# ------------------------------------------------------------------ audit-labels (constraint 9)
# 2026-07-31: the bug this fix corrects was found by an ad-hoc, uncommitted check. This turns that
# one-off catch into a standing guard so it can never silently regress -- see module docstring.
def audit_positions(sequences):
    """Pure arithmetic over an already-loaded sequence list (each needs 'crosshair',
    'center_exclude', 'pellet_radius', 'width', 'height', 'positions') -- no file IO, so
    `audit_selftest` below can pin it without needing image fixtures on disk.

    A position can fail more than one check at once (e.g. off-frame AND beyond pellet_radius, in a
    far corner) -- `n_uncountable_union` counts each such position ONCE, since that is what
    determines whether the counter can ever see it, not how many ways it fails."""
    n_labeled = n_in_exclude = n_off_frame = n_outside_radius = n_union = 0
    for seq in sequences:
        cx, cy = seq['crosshair']
        ce, pr = seq['center_exclude'], seq['pellet_radius']
        w, h = seq['width'], seq['height']
        for x, y in seq['positions']:
            n_labeled += 1
            d = math.hypot(x - cx, y - cy)
            in_exclude = d < ce
            off_frame = not (0 <= x < w and 0 <= y < h)
            outside_radius = d > pr
            n_in_exclude += in_exclude
            n_off_frame += off_frame
            n_outside_radius += outside_radius
            n_union += (in_exclude or off_frame or outside_radius)
    return {
        'n_labeled': n_labeled,
        'n_inside_center_exclude': n_in_exclude,
        'n_off_frame': n_off_frame,
        'n_outside_pellet_radius': n_outside_radius,
        'n_uncountable_union': n_union,
        'uncountable_fraction': round(n_union / n_labeled, 4) if n_labeled else 0.0,
    }


def audit_labels(labels_path):
    """Load a generated labels.json and run `audit_positions` against it, reading each sequence's
    rendered frame dimensions off disk (rendered sequences are not committed -- reproduce first)."""
    data = json.loads(Path(labels_path).read_text())
    seqs = []
    for seq in data['sequences']:
        frame_path = Path(seq['frames_dir']) / seq['frames'][0]
        im = cv2.imread(str(frame_path))
        if im is None:
            raise SystemExit(f'cannot read {frame_path} for --audit-labels -- are the rendered '
                              'frames still on disk? (reproduce the labels.json first)')
        h, w = im.shape[:2]
        seqs.append({**seq, 'width': w, 'height': h})
    return audit_positions(seqs)


def cmd_audit_labels(path):
    report = audit_labels(path)
    print(json.dumps(report, indent=2))
    if report['uncountable_fraction'] > 0:
        print('!! LABELED SET CONTAINS STRUCTURALLY UNCOUNTABLE PELLETS -- REFUSING !!', file=sys.stderr)
        print(f"     {report['n_uncountable_union']}/{report['n_labeled']} labeled pellets "
              f"({report['uncountable_fraction'] * 100:.1f}%) sit inside --center-exclude, off the "
              'rendered frame, or beyond --pellet-radius -- the configured counter is never going '
              'to see them, so scoring against this set is not a valid test.', file=sys.stderr)
        print('     This generator\'s own placement rule should prevent this; if it does not, that '
              'is a generator bug -- fix the generator, do not just drop the offending labels.',
              file=sys.stderr)
        raise SystemExit(1)
    print('audit-labels: PASS -- 0 structurally uncountable pellets', file=sys.stderr)


def audit_selftest():
    """Fixed 3-position example pinning the union-counting arithmetic: one clean pellet, one inside
    center_exclude, and one that is BOTH off-frame and beyond pellet_radius (must count once in the
    union, not twice) -- no files needed, constraint 9 self-validation."""
    seqs = [{
        'crosshair': [100, 100], 'center_exclude': 36, 'pellet_radius': 160,
        'width': 200, 'height': 200,
        'positions': [
            (150, 100),        # r=50: clean
            (120, 100),        # r=20: inside center_exclude
            (100, -200),       # r=300: off-frame AND beyond pellet_radius -- union counts it ONCE
        ],
    }]
    report = audit_positions(seqs)
    expected = {'n_labeled': 3, 'n_inside_center_exclude': 1, 'n_off_frame': 1,
                'n_outside_pellet_radius': 1, 'n_uncountable_union': 2}
    got = {k: report[k] for k in expected}
    ok = got == expected
    print(f'expected: {expected}')
    print(f'got:      {got}')
    print('SELFTEST PASS' if ok else 'SELFTEST FAIL')
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--out', default='scratchpad/pellets/synthetic')
    ap.add_argument('--seed', type=int, default=20260731)
    ap.add_argument('--sequences-per-video', type=int, default=6)
    ap.add_argument('--audit-labels', metavar='PATH',
                     help='report + REFUSE (exit 1) if the labels.json at PATH contains any '
                          'structurally uncountable labeled pellet; does not generate anything')
    ap.add_argument('--audit-selftest', action='store_true',
                     help='pin the audit union-counting arithmetic against a fixed example and exit')
    args = ap.parse_args()
    if args.audit_selftest:
        raise SystemExit(audit_selftest())
    if args.audit_labels:
        cmd_audit_labels(args.audit_labels)
        return
    render_sequences(args)


if __name__ == '__main__':
    main()
