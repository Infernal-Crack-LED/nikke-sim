#!/usr/bin/env python3
"""Shotgun pellet counter — A/B comparison of three CV backends.

Counts white (normal hit) and red (core hit) pellet dots in a cropped frame
from the NIKKE damage-number region. Each backend uses its own idiomatic
approach to color thresholding + connected-component detection + filtering.

Usage:
  python3 scripts/probe/count-pellets.py <image-or-dir> [opts]
    --debug-dir DIR     save thresholded masks + outlined detections
    --center-exclude R  exclude components within R px of crop centre (default 18)
    --min-area N        minimum component area in px² (default 8)
    --max-area N        maximum component area in px² (default 3000)
    --min-circ N        minimum circularity 0..1 (default 0.35)
    --zoom N            upscale factor applied during extraction (for area scaling)

Output: JSON to stdout — per-frame counts from all three backends.
  [{"file": "f_00001.jpg", "numpy": {"white": 6, "red": 1}, "pil": {...}, "opencv": {...}}, ...]
"""
import sys, os, json, math, argparse
import numpy as np
from pathlib import Path

# ---- colour thresholds (tuned for NIKKE pellet dots on boss/VFX background) ----
# White pellet: very bright, near-pure white (R,G,B all high)
# Red pellet:   pure red (high R, low G, low B) — not orange, not pink
WHITE_LO = np.array([210, 210, 210], dtype=np.uint8)
RED_LO   = np.array([200, 0, 0],   dtype=np.uint8)
RED_HI   = np.array([255, 60, 60], dtype=np.uint8)

def load_rgb(path: str) -> np.ndarray:
    """Load an image as an HxWx3 uint8 RGB numpy array."""
    from PIL import Image
    return np.array(Image.open(path).convert('RGB'))

def match_ammo_in_roi(frame_bgr, ammo_tmpl, roi_x0: float, roi_y0: float):
    """Run cv2.matchTemplate restricted to a bottom-right ROI.

    Returns (conf, loc) where loc is the top-left corner in FULL-frame coords.
    If ROI args are disabled (<0), searches the full frame.
    """
    import cv2 as _cv2
    h, w = frame_bgr.shape[:2]
    x0 = int(w * roi_x0) if roi_x0 >= 0 else 0
    y0 = int(h * roi_y0) if roi_y0 >= 0 else 0
    roi = frame_bgr[y0:h, x0:w]
    if roi.shape[0] < ammo_tmpl.shape[0] or roi.shape[1] < ammo_tmpl.shape[1]:
        return 0.0, (0, 0)
    res = _cv2.matchTemplate(roi, ammo_tmpl, _cv2.TM_CCOEFF_NORMED)
    _, conf, _, loc = _cv2.minMaxLoc(res)
    return float(conf), (int(loc[0] + x0), int(loc[1] + y0))

def circularity(area: float, perimeter: float) -> float:
    if perimeter == 0:
        return 0.0
    return 4.0 * math.pi * area / (perimeter * perimeter)

def has_holes_scipy(comp: np.ndarray) -> bool:
    """True if a binary component has internal holes (like the digit '0' or '8')."""
    from scipy import ndimage
    ys, xs = np.where(comp)
    y0, y1 = ys.min(), ys.max() + 1
    x0, x1 = xs.min(), xs.max() + 1
    crop = comp[y0:y1, x0:x1]
    # Invert: background pixels inside the bounding box
    inv = ~crop
    labelled, n = ndimage.label(inv)
    # A hole is a background region that does NOT touch the bounding box border
    for i in range(1, n + 1):
        region = labelled == i
        ry, rx = np.where(region)
        touches_border = (ry.min() == 0 or ry.max() == region.shape[0] - 1 or
                          rx.min() == 0 or rx.max() == region.shape[1] - 1)
        if not touches_border:
            return True
    return False

# ============================================================
# Backend 1: numpy + scipy
# ============================================================
def count_numpy(img: np.ndarray, args) -> dict:
    from scipy import ndimage
    h, w = img.shape[:2]
    cx, cy = w / 2, h / 2

    def detect(mask):
        labelled, n = ndimage.label(mask)
        count = 0
        for i in range(1, n + 1):
            comp = labelled == i
            area = int(comp.sum())
            if area < args.min_area or area > args.max_area:
                continue
            # centroid check — exclude crosshair centre
            ys, xs = np.where(comp)
            mx, my = xs.mean(), ys.mean()
            if math.hypot(mx - cx, my - cy) < args.center_exclude:
                continue
            # circularity via bounding-box aspect ratio (cheap proxy)
            bw = xs.max() - xs.min() + 1
            bh = ys.max() - ys.min() + 1
            aspect = min(bw, bh) / max(bw, bh) if max(bw, bh) > 0 else 0
            fill = area / (bw * bh) if bw * bh > 0 else 0
            # Proxy for circularity: circles have aspect~1, fill~0.79
            if aspect < 0.6 or fill < args.min_circ:
                continue
            # Reject components with holes (digits like 0, 6, 8, 9)
            if has_holes_scipy(comp):
                continue
            count += 1
        return count

    white_mask = np.all(img >= WHITE_LO, axis=2)
    red_mask = np.all((img >= RED_LO) & (img <= RED_HI), axis=2)
    return {"white": detect(white_mask), "red": detect(red_mask)}

# ============================================================
# Backend 2: PIL (point threshold + scipy components)
# ============================================================
def count_pil(img: np.ndarray, args) -> dict:
    from PIL import Image
    from scipy import ndimage
    pil = Image.fromarray(img)
    h, w = img.shape[:2]
    cx, cy = w / 2, h / 2

    # PIL point() for thresholding — idiomatic PIL approach
    r, g, b = pil.split()
    white_mask = np.array(
        r.point(lambda p: 255 if p >= 210 else 0)
    ).astype(bool) & np.array(
        g.point(lambda p: 255 if p >= 210 else 0)
    ).astype(bool) & np.array(
        b.point(lambda p: 255 if p >= 210 else 0)
    ).astype(bool)

    red_mask = np.array(
        r.point(lambda p: 255 if p >= 200 else 0)
    ).astype(bool) & np.array(
        g.point(lambda p: 255 if p <= 60 else 0)
    ).astype(bool) & np.array(
        b.point(lambda p: 255 if p <= 60 else 0)
    ).astype(bool)

    def detect(mask):
        labelled, n = ndimage.label(mask)
        count = 0
        for i in range(1, n + 1):
            comp = labelled == i
            area = int(comp.sum())
            if area < args.min_area or area > args.max_area:
                continue
            ys, xs = np.where(comp)
            mx, my = xs.mean(), ys.mean()
            if math.hypot(mx - cx, my - cy) < args.center_exclude:
                continue
            bw = xs.max() - xs.min() + 1
            bh = ys.max() - ys.min() + 1
            aspect = min(bw, bh) / max(bw, bh) if max(bw, bh) > 0 else 0
            fill = area / (bw * bh) if bw * bh > 0 else 0
            if aspect < 0.6 or fill < args.min_circ:
                continue
            if has_holes_scipy(comp):
                continue
            count += 1
        return count

    return {"white": detect(white_mask), "red": detect(red_mask)}

# ============================================================
# Backend 3: OpenCV (inRange + connectedComponentsWithStats + contours)
# ============================================================
def count_opencv(img: np.ndarray, args) -> dict:
    import cv2
    h, w = img.shape[:2]
    cx, cy = w / 2, h / 2
    # OpenCV uses BGR
    bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

    def detect(lower_bgr, upper_bgr):
        mask = cv2.inRange(bgr, lower_bgr, upper_bgr)
        n, labels, stats, centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)
        count = 0
        for i in range(1, n):
            area = stats[i, cv2.CC_STAT_AREA]
            if area < args.min_area or area > args.max_area:
                continue
            mx, my = centroids[i]
            if math.hypot(mx - cx, my - cy) < args.center_exclude:
                continue
            # circularity via contour perimeter + hole detection via hierarchy
            comp_mask = (labels == i).astype(np.uint8) * 255
            contours, hierarchy = cv2.findContours(comp_mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
            if not contours:
                continue
            # RETR_CCOMP: hierarchy[0][j] = [next, prev, child, parent]
            # A hole exists if any outer contour (parent==-1) has a child (child!=-1)
            has_hole = any(h[2] != -1 for h in hierarchy[0] if h[3] == -1)
            if has_hole:
                continue
            perim = cv2.arcLength(contours[0], True)
            circ = circularity(area, perim)
            if circ < args.min_circ:
                continue
            count += 1
        return count

    white_bgr_lo = WHITE_LO[::-1].copy()
    white_bgr_hi = np.array([255, 255, 255], dtype=np.uint8)
    red_bgr_lo = RED_LO[::-1].copy()
    red_bgr_hi = RED_HI[::-1].copy()
    return {
        "white": detect(white_bgr_lo, white_bgr_hi),
        "red": detect(red_bgr_lo, red_bgr_hi),
    }

# ============================================================
# Temporal tracking: detect components with positions, track across
# frames, classify by lifetime (pellets are short-lived, damage numbers persist)
# ============================================================
def detect_components_with_pos(img: np.ndarray, args):
    """Return list of (cx, cy, is_red, area, circ) for each detected component."""
    import cv2
    h, w = img.shape[:2]
    cx0, cy0 = w / 2, h / 2
    bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    comps = []

    def detect(lower_bgr, upper_bgr, is_red):
        mask = cv2.inRange(bgr, lower_bgr, upper_bgr)
        n, labels, stats, centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)
        for i in range(1, n):
            area = stats[i, cv2.CC_STAT_AREA]
            if area < args.min_area or area > args.max_area:
                continue
            mx, my = centroids[i]
            if math.hypot(mx - cx0, my - cy0) < args.center_exclude:
                continue
            comp_mask = (labels == i).astype(np.uint8) * 255
            contours, hierarchy = cv2.findContours(comp_mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
            if not contours:
                continue
            perim = cv2.arcLength(contours[0], True)
            circ = circularity(area, perim)
            has_hole = any(h[2] != -1 for h in hierarchy[0] if h[3] == -1)
            mult = 1
            if circ >= args.min_circ:
                # Normal round pellet: reject hole-digits (0/6/8/9).
                if has_hole:
                    continue
            else:
                # Low circularity — normally rejected, but a compact low-circ WHITE blob is
                # usually overlapping/partially-occluded pellets. Recover it with a multiplicity
                # from its area (partial single = 1, peanut pair = 2). Holes are ALLOWED here:
                # a crescent + full-circle peanut has a hole from the occluded circle's shadowed
                # background, whereas hole-digits are roundish (circ >= min_circ) and take the
                # normal path above. Elongated fragments stay rejected via circ-lo / aspect.
                if is_red or args.peanut_max_mult < 1:
                    continue
                if circ < args.peanut_circ_lo:
                    continue
                bx, by, bw, bh = cv2.boundingRect(contours[0])
                aspect = min(bw, bh) / max(bw, bh) if max(bw, bh) > 0 else 0
                if aspect < args.peanut_aspect:
                    continue
                unit = args.pellet_unit_area
                if area < unit * 0.6 or area > unit * args.peanut_max_mult * 1.4:
                    continue
                mult = max(1, min(args.peanut_max_mult, round(area / unit)))
            # Emit `mult` co-located components so the existing tracker/counter counts each.
            for k in range(mult):
                off = (k - (mult - 1) / 2.0) * 0.5
                comps.append((float(mx) + off, float(my), is_red, int(area), float(circ)))

    detect(WHITE_LO[::-1].copy(), np.array([255,255,255], dtype=np.uint8), False)
    detect(RED_LO[::-1].copy(), RED_HI[::-1].copy(), True)
    return comps

def temporal_filter(all_comps, max_pellet_frames=8, match_dist=30):
    """Track components across frames, return per-frame pellet counts.
    all_comps: list of [(cx, cy, is_red, area, circ), ...] per frame.
    Returns: list of {"white": int, "red": int} per frame (short-lived components only).
    """
    # Track: {id, is_red, last_frame, first_frame, last_pos}
    tracks = []
    next_id = 0
    # Per-frame: which track IDs are active
    frame_tracks = []

    for fi, comps in enumerate(all_comps):
        matched_tracks = set()
        matched_comps = set()
        active_ids = []

        # Greedy nearest-neighbor matching to previous frame's tracks
        prev_active = [t for t in tracks if t['last_frame'] == fi - 1]
        for ci, (cx, cy, is_red, area, circ) in enumerate(comps):
            best_track = None
            best_dist = match_dist
            for t in prev_active:
                if t['id'] in matched_tracks:
                    continue
                d = math.hypot(cx - t['last_pos'][0], cy - t['last_pos'][1])
                if d < best_dist:
                    best_dist = d
                    best_track = t
            if best_track:
                best_track['last_frame'] = fi
                best_track['last_pos'] = (cx, cy)
                matched_tracks.add(best_track['id'])
                active_ids.append(best_track['id'])
            else:
                # New track
                tracks.append({'id': next_id, 'is_red': is_red, 'first_frame': fi,
                               'last_frame': fi, 'last_pos': (cx, cy)})
                active_ids.append(next_id)
                next_id += 1

        frame_tracks.append(active_ids)

    # Compute lifetime for each track
    track_lifetime = {}
    for t in tracks:
        track_lifetime[t['id']] = t['last_frame'] - t['first_frame'] + 1

    # Per-frame pellet counts: only count tracks with lifetime <= max_pellet_frames
    # But we don't know the final lifetime until all frames are processed.
    # So: a track is a "pellet" if its total lifetime <= max_pellet_frames.
    pellet_ids = {t['id'] for t in tracks if track_lifetime[t['id']] <= max_pellet_frames}
    track_color = {t['id']: t['is_red'] for t in tracks}

    results = []
    for fi, active_ids in enumerate(frame_tracks):
        white = sum(1 for tid in active_ids if tid in pellet_ids and not track_color[tid])
        red = sum(1 for tid in active_ids if tid in pellet_ids and track_color[tid])
        results.append({"white": white, "red": red})
    return results

# ============================================================
# Ammo counter: read the 3 digits inside the box the pellet tracker already locates.
#
# The box is ALREADY found every frame by the proven `--ammo-template` + `--max-template-disp`
# track above (it is crosshair-anchored and slides across the frame, so a fixed crop misses it).
# This mode reuses that lock and adds the last 20%: segment the glyphs, match each against a
# fixed-font digit atlas, and ABSTAIN rather than guess when the match is poor.
#
# Deterministic beats a VLM here for the same reason the timer read fails: 2-3 white digits on a
# fixed crop is exactly where a 7B VLM produces confident wrong answers (~25% correction rate on
# the timer spine), while template matching on a fixed bitmap font is exact or it declines.
#
# The glyphs are white on a dark box, and the box turns RED at low ammo (owner note) — both are
# matched. Selection is by SHAPE, not position: digit components share a top edge, a ~45px height
# at zoom 2 and an even pitch, which separates them from HUD marks of similar brightness.
# ============================================================
DIGIT_H_RANGE = (0.55, 0.90)   # digit height as a fraction of the template height (74px at zoom 2)
DIGIT_W_RANGE = (0.08, 0.45)   # digit width, same basis
DIGIT_ROW_TOL = 0.10           # max top-edge spread (fraction of template height) within one row


def _ammo_roi(img_rgb, loc, tshape, pad_x=70, pad_y=25):
    """Generous region around the matched ammo template — the box plus slack for the digits."""
    th, tw = tshape[:2]
    h, w = img_rgb.shape[:2]
    x0, x1 = max(0, loc[0] - pad_x), min(w, loc[0] + tw + pad_x)
    y0, y1 = max(0, loc[1] - pad_y), min(h, loc[1] + th + pad_y)
    return img_rgb[y0:y1, x0:x1], (x0, y0)


def segment_ammo_digits(roi_rgb, templ_h):
    """Return the digit cells (binary crops) left-to-right, or [] if the box is not readable."""
    import cv2
    r, g, b = roi_rgb[..., 0].astype(int), roi_rgb[..., 1].astype(int), roi_rgb[..., 2].astype(int)
    white = (r > 190) & (g > 190) & (b > 190)
    red = (r > 150) & (g < 90) & (b < 90)          # the low-ammo box renders its digits red
    mask = ((white | red) * 255).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)

    hlo, hhi = DIGIT_H_RANGE[0] * templ_h, DIGIT_H_RANGE[1] * templ_h
    wlo, whi = DIGIT_W_RANGE[0] * templ_h, DIGIT_W_RANGE[1] * templ_h
    cands = []
    for i in range(1, n):
        x, y, w, h, _ = stats[i]
        if hlo <= h <= hhi and wlo <= w <= whi:
            cands.append((x, y, w, h, i))
    if not cands:
        return []
    # keep the largest set of components sharing a top edge — that is the number, and it drops
    # same-height HUD marks elsewhere in the ROI
    tol = DIGIT_ROW_TOL * templ_h
    best = []
    for _, y0, _, _, _ in cands:
        row = [c for c in cands if abs(c[1] - y0) <= tol]
        if len(row) > len(best):
            best = row
    best.sort(key=lambda c: c[0])
    cells = []
    for x, y, w, h, i in best:
        cells.append(((labels[y:y + h, x:x + w] == i).astype(np.uint8) * 255, (x, y, w, h)))
    return cells


def normalize_glyph(cell, size=(20, 32)):
    import cv2
    return cv2.resize(cell, size, interpolation=cv2.INTER_AREA)


def load_digit_atlas(path):
    """atlas dir of <digit>_<tag>.png glyph bitmaps -> {digit: [normalized glyph, ...]}"""
    import cv2
    atlas = {}
    p = Path(path)
    if not p.is_dir():
        return atlas
    for f in sorted(p.glob('*.png')):
        d = f.stem.split('_')[0]
        if not d.isdigit():
            continue
        img = cv2.imread(str(f), cv2.IMREAD_GRAYSCALE)
        if img is None:
            continue
        atlas.setdefault(int(d), []).append(normalize_glyph(img))
    return atlas


def match_digit(cell, atlas):
    """Best (digit, score) for one glyph by normalized correlation against the atlas."""
    import cv2
    g = normalize_glyph(cell)
    best, best_score = None, -1.0
    for d, glyphs in atlas.items():
        for ref in glyphs:
            s = float(cv2.matchTemplate(g, ref, cv2.TM_CCOEFF_NORMED)[0][0])
            if s > best_score:
                best, best_score = d, s
    return best, best_score


def read_ammo_frame(img_rgb, ammo_tmpl, args, last_acc):
    """Locate the box (proven template track + jump gate) and read its digits."""
    import cv2
    frame_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
    conf, loc = match_ammo_in_roi(frame_bgr, ammo_tmpl, args.ammo_roi_x0, args.ammo_roi_y0)
    accepted = None
    # The jump gate assumes CONSECUTIVE frames (the box slides smoothly). Pass
    # --max-template-disp 0 to disable it for scattered/sampled frames, where a large jump
    # between samples is expected and carrying the previous box forward would be the bug.
    gate = args.max_template_disp
    if conf > 0.3 and (last_acc is None or gate <= 0 or
                       math.hypot(loc[0] - last_acc[0], loc[1] - last_acc[1]) < gate):
        accepted = (int(loc[0]), int(loc[1]))
    elif last_acc is not None:
        accepted = last_acc
    if accepted is None:
        return {'ammo': None, 'reason': 'no-box', 'boxConf': round(float(conf), 3)}, last_acc, []

    roi, _ = _ammo_roi(img_rgb, accepted, ammo_tmpl.shape)
    cells = segment_ammo_digits(roi, ammo_tmpl.shape[0])
    out = {'boxConf': round(float(conf), 3), 'cells': len(cells), 'loc': list(accepted)}
    if not cells or len(cells) > 3:
        out.update({'ammo': None, 'reason': 'no-digits' if not cells else 'too-many-cells'})
        return out, accepted, []
    return out, accepted, cells


def build_atlas_from_cells(cells, label, outdir, tag):
    import cv2
    os.makedirs(outdir, exist_ok=True)
    if len(cells) != len(label):
        return 0
    for k, ((cell, _), ch) in enumerate(zip(cells, label)):
        cv2.imwrite(os.path.join(outdir, f'{ch}_{tag}{k}.png'), cell)
    return len(cells)


# ============================================================
# Debug: save thresholded masks with detected dots outlined
# ============================================================
def save_debug(img: np.ndarray, path: str, args):
    import cv2
    h, w = img.shape[:2]
    cx, cy = w / 2, h / 2
    bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

    white_mask = cv2.inRange(bgr, WHITE_LO[::-1].copy(), np.array([255, 255, 255], dtype=np.uint8))
    red_mask = cv2.inRange(bgr, RED_LO[::-1].copy(), RED_HI[::-1].copy())

    # Outline detected components
    out = img.copy()
    for mask, color in [(white_mask, (0, 255, 0)), (red_mask, (0, 0, 255))]:
        n, labels, stats, centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)
        for i in range(1, n):
            area = stats[i, cv2.CC_STAT_AREA]
            if area < args.min_area or area > args.max_area:
                continue
            mx, my = centroids[i]
            if math.hypot(mx - cx, my - cy) < args.center_exclude:
                continue
            cv2.circle(out, (int(mx), int(my)), 8, color, 1)
            cv2.putText(out, str(i), (int(mx) + 10, int(my)), cv2.FONT_HERSHEY_SIMPLEX, 0.3, color, 1)

    # Draw crosshair exclusion zone
    cv2.circle(out, (int(cx), int(cy)), int(args.center_exclude), (128, 128, 128), 1)

    # Side-by-side: original | white mask | red mask | outlined
    combined = np.hstack([
        img,
        np.stack([white_mask]*3, axis=2),
        np.stack([red_mask]*3, axis=2),
        out,
    ])
    cv2.imwrite(path, cv2.cvtColor(combined, cv2.COLOR_RGB2BGR))

# ============================================================
# Main
# ============================================================
def main():
    parser = argparse.ArgumentParser(description='Shotgun pellet counter (A/B: numpy, PIL, OpenCV)')
    parser.add_argument('input', help='image file or directory of frames')
    parser.add_argument('--debug-dir', help='save debug masks + outlines')
    parser.add_argument('--center-exclude', type=float, default=18, help='exclude radius from crop centre (px)')
    parser.add_argument('--min-area', type=int, default=100, help='min component area (px²)')
    parser.add_argument('--max-area', type=int, default=3000, help='max component area (px²)')
    parser.add_argument('--min-circ', type=float, default=0.55, help='min circularity (0..1)')
    parser.add_argument('--red-r-min', type=int, default=200, help='red pellet R-channel floor (default 200)')
    parser.add_argument('--red-gb-max', type=int, default=60, help='red pellet G/B-channel ceiling (default 60; real red pellets anti-alias up to ~90)')
    parser.add_argument('--pellet-unit-area', type=int, default=320, help='approx area (px²) of one pellet at this zoom — basis for peanut multiplicity (default 320 at 2x)')
    parser.add_argument('--peanut-circ-lo', type=float, default=0.30, help='min circularity for a low-circ blob to be recovered as overlapping pellets (default 0.30; below this = streak/damage)')
    parser.add_argument('--peanut-aspect', type=float, default=0.45, help='min bounding-box aspect ratio for a recovered peanut blob (default 0.45; excludes elongated fragments)')
    parser.add_argument('--peanut-max-mult', type=int, default=0, help='max pellets a low-circ blob can count as (default 0 = DISABLED; it over-counts without visual tuning — see HANDOFF. Try 2 with the debug-peanut strips)')
    parser.add_argument('--backend', choices=['all', 'numpy', 'pil', 'opencv'], default='all',
                        help='run one backend only (default: all for A/B)')
    parser.add_argument('--crosshair-file', help='JSON file mapping frame filename to {x,y} normalized 0-1000 crosshair coords')
    parser.add_argument('--ammo-template', help='path to ammo box template image — enables per-frame crosshair tracking via template matching')
    parser.add_argument('--ammo-offset-x', type=float, default=125, help='crosshair X offset from ammo box center in zoomed px (default 125 = 62.5 native at 2x)')
    parser.add_argument('--ammo-offset-y', type=float, default=-11, help='crosshair Y offset from ammo box center in zoomed px (default -11 = -5.5 native at 2x)')
    parser.add_argument('--ammo-roi-x0', type=float, default=-1, help='if >=0, restrict ammo-box template matching to x >= roi-x0 * frame_width')
    parser.add_argument('--ammo-roi-y0', type=float, default=-1, help='if >=0, restrict ammo-box template matching to y >= roi-y0 * frame_height')
    parser.add_argument('--pellet-radius', type=int, default=80, help='radius of pellet crop in ZOOMED px (default 80)')
    parser.add_argument('--marker-radius', type=int, default=65, help='red components closer than this to the crosshair (zoomed px) are core-hit hit-markers, not pellets (default 65)')
    parser.add_argument('--max-template-disp', type=float, default=150, help='max frame-to-frame ammo-box displacement (zoomed px) before a template match is rejected as a false lock (default 150)')
    parser.add_argument('--temporal', action='store_true', help='enable temporal filtering (track components across frames, classify by lifetime)')
    parser.add_argument('--max-pellet-frames', type=int, default=8, help='max frames a pellet component persists (default 8 at 30fps)')
    parser.add_argument('--dump-tracks', help='(temporal) write full per-track diagnostics JSON to this path')
    parser.add_argument('--ammo-digits', action='store_true', help='read the AMMO COUNTER digits inside the located box (needs --ammo-template + --ammo-atlas)')
    parser.add_argument('--ammo-atlas', help='directory of digit glyph PNGs named <digit>_<tag>.png')
    parser.add_argument('--build-atlas', action='store_true', help='(with --ammo-digits --ammo-atlas --labels) harvest labelled glyphs instead of reading')
    parser.add_argument('--labels', help='(--build-atlas) comma-separated counter values, one per input frame, in filename order')
    parser.add_argument('--digit-score-min', type=float, default=0.60, help='min glyph match score; a frame below it ABSTAINS rather than guessing (default 0.60)')
    args = parser.parse_args()

    # Apply tunable red threshold to the module-level constants used by all backends
    global RED_LO, RED_HI
    RED_LO = np.array([args.red_r_min, 0, 0], dtype=np.uint8)
    RED_HI = np.array([255, args.red_gb_max, args.red_gb_max], dtype=np.uint8)

    # Load crosshair positions if provided
    crosshairs = {}
    if args.crosshair_file:
        with open(args.crosshair_file) as f:
            crosshairs = json.load(f)

    # Load ammo box template for per-frame crosshair tracking
    ammo_tmpl = None
    if args.ammo_template:
        import cv2 as _cv2
        ammo_tmpl = _cv2.imread(args.ammo_template)
        if ammo_tmpl is None:
            print(f'warning: could not load ammo template {args.ammo_template}', file=sys.stderr)

    backends = {'numpy': count_numpy, 'pil': count_pil, 'opencv': count_opencv}
    active = backends if args.backend == 'all' else {args.backend: backends[args.backend]}

    p = Path(args.input)
    if p.is_dir():
        files = sorted(str(f) for f in p.iterdir() if f.suffix.lower() in ('.jpg', '.jpeg', '.png'))
    else:
        files = [str(p)]

    if args.debug_dir:
        os.makedirs(args.debug_dir, exist_ok=True)

    results = []

    def apply_crosshair_crop(img, fname):
        """Crop image around crosshair using ammo template or crosshair file."""
        crop_center = None
        if ammo_tmpl is not None:
            import cv2 as _cv2
            frame_bgr = _cv2.cvtColor(img, _cv2.COLOR_RGB2BGR)
            conf, loc = match_ammo_in_roi(frame_bgr, ammo_tmpl, args.ammo_roi_x0, args.ammo_roi_y0)
            if conf > 0.3:
                th, tw = ammo_tmpl.shape[:2]
                crop_center = (int(loc[0] + tw//2 + args.ammo_offset_x),
                               int(loc[1] + th//2 + args.ammo_offset_y))
        if crop_center is None:
            ch = crosshairs.get(fname)
            if ch and ch.get('x') is not None and ch.get('y') is not None:
                h, w = img.shape[:2]
                crop_center = (int(ch['x'] / 1000 * w), int(ch['y'] / 1000 * h))
        if crop_center is not None:
            h, w = img.shape[:2]
            cx, cy = crop_center
            r = args.pellet_radius
            x0 = max(0, cx - r); x1 = min(w, cx + r)
            y0 = max(0, cy - r); y1 = min(h, cy + r)
            if x1 - x0 >= 20 and y1 - y0 >= 20:
                return img[y0:y1, x0:x1]
        return img

    if args.ammo_digits:
        if ammo_tmpl is None:
            print('--ammo-digits needs --ammo-template', file=sys.stderr)
            sys.exit(1)
        labels = (args.labels or '').split(',') if args.build_atlas else []
        atlas = {} if args.build_atlas else load_digit_atlas(args.ammo_atlas or '')
        if not args.build_atlas and not atlas:
            print(f'--ammo-digits needs a digit atlas (--ammo-atlas {args.ammo_atlas}); '
                  f'build one with --build-atlas --labels "076,065,..."', file=sys.stderr)
            sys.exit(1)
        last_acc = None
        saved = 0
        out = []
        for fi, f in enumerate(files):
            img = load_rgb(f)
            entry, last_acc, cells = read_ammo_frame(img, ammo_tmpl, args, last_acc)
            entry['file'] = os.path.basename(f)
            if args.build_atlas:
                lab = labels[fi].strip() if fi < len(labels) else ''
                entry['label'] = lab
                if lab and cells:
                    saved += build_atlas_from_cells(cells, lab, args.ammo_atlas, f'f{fi:03d}')
                    entry['saved'] = len(cells) == len(lab)
            elif cells:
                digits, scores = [], []
                for cell, _ in cells:
                    d, s = match_digit(cell, atlas)
                    digits.append(d)
                    scores.append(round(s, 3))
                entry['digits'] = digits
                entry['scores'] = scores
                # abstain on the whole frame if ANY glyph is weak — a partly-guessed counter is
                # worse than no read, because it looks like data
                if min(scores) < args.digit_score_min or any(d is None for d in digits):
                    entry['ammo'] = None
                    entry['reason'] = 'low-score'
                else:
                    entry['ammo'] = int(''.join(str(d) for d in digits))
            out.append(entry)
        if args.build_atlas:
            print(f'atlas: saved {saved} glyphs -> {args.ammo_atlas}', file=sys.stderr)
        print(json.dumps(out, indent=2))
        return

    if args.temporal:
        # Temporal mode: detect on FULL frames (stable coords), track, filter by lifetime,
        # then count only short-lived components near the crosshair per frame.
        all_comps = []       # per-frame component lists (full frame coords)
        cross_positions = [] # per-frame crosshair positions (full frame coords)
        fnames = []
        cross_confs = []   # per-frame template match confidence (None if no template)
        cross_rawloc = []  # per-frame raw (unfiltered) template match top-left loc
        last_acc = None    # last accepted ammo-box top-left loc (for displacement gate)
        max_disp = args.max_template_disp
        for f in files:
            img = load_rgb(f)
            fname = os.path.basename(f)
            fnames.append(fname)
            # Detect components on the full (uncropped) frame
            all_comps.append(detect_components_with_pos(img, args))
            # Find crosshair position via ammo template
            cross_pos = None
            conf_val = None
            raw_loc = None
            if ammo_tmpl is not None:
                import cv2 as _cv2
                frame_bgr = _cv2.cvtColor(img, _cv2.COLOR_RGB2BGR)
                conf, loc = match_ammo_in_roi(frame_bgr, ammo_tmpl, args.ammo_roi_x0, args.ammo_roi_y0)
                conf_val = float(conf)
                raw_loc = (int(loc[0]), int(loc[1]))
                cand = raw_loc
                # Positional-consistency gate: the ammo box moves smoothly, so a match
                # that jumps implausibly far (e.g. locking onto the HP bar) is rejected
                # and the last accepted position is carried forward instead.
                accepted = None
                if conf > 0.3 and (last_acc is None or
                                   math.hypot(cand[0] - last_acc[0], cand[1] - last_acc[1]) < max_disp):
                    accepted = cand
                    last_acc = cand
                elif last_acc is not None:
                    accepted = last_acc
                if accepted is not None:
                    th, tw = ammo_tmpl.shape[:2]
                    cross_pos = (int(accepted[0] + tw//2 + args.ammo_offset_x),
                                 int(accepted[1] + th//2 + args.ammo_offset_y))
            if cross_pos is None:
                ch = crosshairs.get(fname)
                if ch and ch.get('x') is not None and ch.get('y') is not None:
                    h, w = img.shape[:2]
                    cross_pos = (int(ch['x'] / 1000 * w), int(ch['y'] / 1000 * h))
            cross_positions.append(cross_pos)
            cross_confs.append(conf_val)
            cross_rawloc.append(raw_loc)

        # Track components across frames and classify by lifetime.
        # Each track records per-frame position/area/circularity for diagnostics.
        tracks = []
        next_id = 0
        frame_tracks = []  # per-frame list of (track_id, x, y, is_red)
        for fi, comps in enumerate(all_comps):
            prev_active = [t for t in tracks if t['last_frame'] == fi - 1]
            matched = set()
            active = []
            for cx, cy, is_red, area, circ in comps:
                best_t, best_d = None, 30  # match_dist
                for t in prev_active:
                    if t['id'] in matched: continue
                    d = math.hypot(cx - t['last_pos'][0], cy - t['last_pos'][1])
                    if d < best_d: best_d, best_t = d, t
                if best_t:
                    best_t['last_frame'] = fi
                    best_t['last_pos'] = (cx, cy)
                    best_t['areas'].append(area)
                    best_t['circs'].append(circ)
                    best_t['xs'].append(cx)
                    best_t['ys'].append(cy)
                    matched.add(best_t['id'])
                    active.append((best_t['id'], cx, cy, is_red))
                else:
                    tracks.append({'id': next_id, 'is_red': is_red, 'first_frame': fi,
                                   'last_frame': fi, 'last_pos': (cx, cy),
                                   'areas': [area], 'circs': [circ], 'xs': [cx], 'ys': [cy]})
                    active.append((next_id, cx, cy, is_red))
                    next_id += 1
            frame_tracks.append(active)

        track_life = {t['id']: t['last_frame'] - t['first_frame'] + 1 for t in tracks}
        pellet_ids = {t['id'] for t in tracks if track_life[t['id']] <= args.max_pellet_frames}

        results = []
        for fi, fname in enumerate(fnames):
            cp = cross_positions[fi]
            white, red, marker = 0, 0, 0
            if cp:
                for tid, x, y, is_red in frame_tracks[fi]:
                    if tid not in pellet_ids: continue
                    dist = math.hypot(x - cp[0], y - cp[1])
                    if dist > args.pellet_radius: continue
                    if is_red:
                        # Red components tight to the crosshair are the triangular core-hit
                        # hit-markers, not pellets; count them separately as a core-hit signal.
                        if dist < args.marker_radius: marker += 1
                        else: red += 1
                    else:
                        white += 1
            entry = {"file": fname}
            for name in backends:
                entry[name] = {"white": white, "red": red, "marker": marker}
            results.append(entry)

        # Optional diagnostic dump: every track with full stats + per-frame crosshair data
        if args.dump_tracks:
            dump = {
                "params": {
                    "max_pellet_frames": args.max_pellet_frames,
                    "min_area": args.min_area, "max_area": args.max_area,
                    "min_circ": args.min_circ, "center_exclude": args.center_exclude,
                    "pellet_radius": args.pellet_radius,
                    "ammo_offset_x": args.ammo_offset_x, "ammo_offset_y": args.ammo_offset_y,
                },
                "frame_files": fnames,
                "cross_positions": cross_positions,
                "cross_confs": cross_confs,
                "cross_rawloc": cross_rawloc,
                "frame_counts": [{"white": r["opencv"]["white"], "red": r["opencv"]["red"], "marker": r["opencv"]["marker"]} for r in results],
                "tracks": [{
                    "id": t['id'], "is_red": t['is_red'],
                    "first": t['first_frame'], "last": t['last_frame'],
                    "life": track_life[t['id']], "is_pellet": t['id'] in pellet_ids,
                    "mean_area": round(sum(t['areas']) / len(t['areas']), 1),
                    "max_area": max(t['areas']),
                    "mean_circ": round(sum(t['circs']) / len(t['circs']), 3),
                    "xs": [round(v, 1) for v in t['xs']],
                    "ys": [round(v, 1) for v in t['ys']],
                    "areas": t['areas'],
                } for t in tracks],
            }
            with open(args.dump_tracks, 'w') as df:
                json.dump(dump, df)
            print(f'dumped {len(tracks)} tracks -> {args.dump_tracks}', file=sys.stderr)
    else:
        # Per-frame mode (original)
        for f in files:
            img = apply_crosshair_crop(load_rgb(f), os.path.basename(f))
            fname = os.path.basename(f)
            entry = {"file": fname}
            for name, fn in active.items():
                entry[name] = fn(img, args)
            for name in backends:
                if name not in entry:
                    entry[name] = {"white": 0, "red": 0}
            results.append(entry)
            if args.debug_dir:
                save_debug(img, os.path.join(args.debug_dir, Path(f).stem + '_debug.png'), args)

    print(json.dumps(results, indent=2))

if __name__ == '__main__':
    main()
