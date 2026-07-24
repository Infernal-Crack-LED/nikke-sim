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
    """Return list of (cx, cy, is_red, area) for each detected component."""
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
            if any(h[2] != -1 for h in hierarchy[0] if h[3] == -1):
                continue
            perim = cv2.arcLength(contours[0], True)
            circ = circularity(area, perim)
            if circ < args.min_circ:
                continue
            comps.append((mx, my, is_red, area))

    detect(WHITE_LO[::-1].copy(), np.array([255,255,255], dtype=np.uint8), False)
    detect(RED_LO[::-1].copy(), RED_HI[::-1].copy(), True)
    return comps

def temporal_filter(all_comps, max_pellet_frames=8, match_dist=30):
    """Track components across frames, return per-frame pellet counts.
    all_comps: list of [(cx, cy, is_red, area), ...] per frame.
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
        for ci, (cx, cy, is_red, area) in enumerate(comps):
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
    parser.add_argument('--backend', choices=['all', 'numpy', 'pil', 'opencv'], default='all',
                        help='run one backend only (default: all for A/B)')
    parser.add_argument('--crosshair-file', help='JSON file mapping frame filename to {x,y} normalized 0-1000 crosshair coords')
    parser.add_argument('--ammo-template', help='path to ammo box template image — enables per-frame crosshair tracking via template matching')
    parser.add_argument('--ammo-offset-x', type=float, default=125, help='crosshair X offset from ammo box center in zoomed px (default 125 = 62.5 native at 2x)')
    parser.add_argument('--ammo-offset-y', type=float, default=-11, help='crosshair Y offset from ammo box center in zoomed px (default -11 = -5.5 native at 2x)')
    parser.add_argument('--pellet-radius', type=int, default=80, help='radius of pellet crop in ZOOMED px (default 80)')
    parser.add_argument('--temporal', action='store_true', help='enable temporal filtering (track components across frames, classify by lifetime)')
    parser.add_argument('--max-pellet-frames', type=int, default=8, help='max frames a pellet component persists (default 8 at 30fps)')
    args = parser.parse_args()

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
            res = _cv2.matchTemplate(frame_bgr, ammo_tmpl, _cv2.TM_CCOEFF_NORMED)
            _, conf, _, loc = _cv2.minMaxLoc(res)
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

    if args.temporal:
        # Temporal mode: detect on FULL frames (stable coords), track, filter by lifetime,
        # then count only short-lived components near the crosshair per frame.
        all_comps = []       # per-frame component lists (full frame coords)
        cross_positions = [] # per-frame crosshair positions (full frame coords)
        fnames = []
        for f in files:
            img = load_rgb(f)
            fname = os.path.basename(f)
            fnames.append(fname)
            # Detect components on the full (uncropped) frame
            all_comps.append(detect_components_with_pos(img, args))
            # Find crosshair position via ammo template
            cross_pos = None
            if ammo_tmpl is not None:
                import cv2 as _cv2
                frame_bgr = _cv2.cvtColor(img, _cv2.COLOR_RGB2BGR)
                res = _cv2.matchTemplate(frame_bgr, ammo_tmpl, _cv2.TM_CCOEFF_NORMED)
                _, conf, _, loc = _cv2.minMaxLoc(res)
                if conf > 0.3:
                    th, tw = ammo_tmpl.shape[:2]
                    cross_pos = (int(loc[0] + tw//2 + args.ammo_offset_x),
                                 int(loc[1] + th//2 + args.ammo_offset_y))
            if cross_pos is None:
                ch = crosshairs.get(fname)
                if ch and ch.get('x') is not None and ch.get('y') is not None:
                    h, w = img.shape[:2]
                    cross_pos = (int(ch['x'] / 1000 * w), int(ch['y'] / 1000 * h))
            cross_positions.append(cross_pos)

        # Track components across frames and classify by lifetime
        filtered = temporal_filter(all_comps, args.max_pellet_frames)

        # Per-frame: count only short-lived components near the crosshair
        # Re-run detection to get positions of the filtered (pellet) components
        # Actually, temporal_filter already gives per-frame counts of short-lived tracks.
        # But we need to also filter by proximity to crosshair.
        # Re-track with position data to get per-frame pellet positions.
        tracks = []
        next_id = 0
        frame_tracks = []  # per-frame list of (track_id, x, y, is_red)
        for fi, comps in enumerate(all_comps):
            prev_active = [t for t in tracks if t['last_frame'] == fi - 1]
            matched = set()
            active = []
            for cx, cy, is_red, area in comps:
                best_t, best_d = None, 30  # match_dist
                for t in prev_active:
                    if t['id'] in matched: continue
                    d = math.hypot(cx - t['last_pos'][0], cy - t['last_pos'][1])
                    if d < best_d: best_d, best_t = d, t
                if best_t:
                    best_t['last_frame'] = fi
                    best_t['last_pos'] = (cx, cy)
                    matched.add(best_t['id'])
                    active.append((best_t['id'], cx, cy, is_red))
                else:
                    tracks.append({'id': next_id, 'is_red': is_red, 'first_frame': fi,
                                   'last_frame': fi, 'last_pos': (cx, cy)})
                    active.append((next_id, cx, cy, is_red))
                    next_id += 1
            frame_tracks.append(active)

        track_life = {t['id']: t['last_frame'] - t['first_frame'] + 1 for t in tracks}
        pellet_ids = {t['id'] for t in tracks if track_life[t['id']] <= args.max_pellet_frames}

        results = []
        for fi, fname in enumerate(fnames):
            cp = cross_positions[fi]
            white, red = 0, 0
            if cp:
                for tid, x, y, is_red in frame_tracks[fi]:
                    if tid not in pellet_ids: continue
                    if math.hypot(x - cp[0], y - cp[1]) <= args.pellet_radius:
                        if is_red: red += 1
                        else: white += 1
            entry = {"file": fname}
            for name in backends:
                entry[name] = {"white": white, "red": red}
            results.append(entry)
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
