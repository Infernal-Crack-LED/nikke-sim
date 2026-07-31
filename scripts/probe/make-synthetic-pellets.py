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
CENTER_EXCLUDE = 36
MEDIAN_R, R_SPREAD = 64, 40  # HANDOFF.md: white pellets median radius ~64px zoom2 from crosshair


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
    visual inspection of an early run (a Marciana bio-card screen, not gameplay)."""
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
    return rng.sample(quiet, n)


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

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    manifest = []
    seq_id = 0
    for slug, dump_dir in VIDEO_DUMPS.items():
        frame_files, cross_positions, frame_counts, params, pellets_meta = load_dump(dump_dir)
        frames_dir = Path(dump_dir) / 'frames-pellet'
        quiet = find_quiet_frames(frame_counts, cross_positions, pellets_meta, args.sequences_per_video, rng)
        for qi in quiet:
            bg = cv2.imread(str(frames_dir / frame_files[qi]))
            if bg is None:
                continue
            cx0, cy0 = cross_positions[qi]
            n_pellets = rng.randint(5, 10)
            chosen = [patches[rng.randrange(len(patches))] for _ in range(n_pellets)]
            positions = []
            for _ in range(n_pellets):
                r = max(8, rng.gauss(MEDIAN_R, R_SPREAD))
                theta = rng.uniform(0, 2 * math.pi)
                positions.append((cx0 + r * math.cos(theta), cy0 + r * math.sin(theta)))

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
            print(f'  seq{seq_id - 1:04d} [{slug}] n={n_pellets} -> {seq_dir}', file=sys.stderr)

    manifest_path = out / 'labels.json'
    manifest_path.write_text(json.dumps({
        '_honest_limit': ('Synthetic labels validate the DETECTOR, not the compositing '
                           'assumption -- background is a single real quiet frame repeated '
                           'across all 13 offsets, and alpha-blit compositing is easier than '
                           'however the game actually blends its pellet markers. Held-out real '
                           'data (scripts/tests/fixtures/pellets/groundtruth-f8-11.json, '
                           'docs/probe-data/*-sg-band.json) is MANDATORY alongside this, never a '
                           'substitute for it.'),
        'seed': args.seed,
        'sequences': manifest,
    }, indent=2))
    print(f'wrote {len(manifest)} sequences -> {manifest_path}', file=sys.stderr)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--out', default='scratchpad/pellets/synthetic')
    ap.add_argument('--seed', type=int, default=20260731)
    ap.add_argument('--sequences-per-video', type=int, default=6)
    args = ap.parse_args()
    render_sequences(args)


if __name__ == '__main__':
    main()
