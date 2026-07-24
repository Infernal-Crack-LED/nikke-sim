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
    parser.add_argument('--pellet-radius', type=int, default=80, help='radius of pellet crop in NATIVE px (default 80 = 160px diameter)')
    args = parser.parse_args()

    # Load crosshair positions if provided
    crosshairs = {}
    if args.crosshair_file:
        with open(args.crosshair_file) as f:
            crosshairs = json.load(f)

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
    for f in files:
        img = load_rgb(f)
        fname = os.path.basename(f)

        # Crosshair-directed crop: if we have a crosshair position for this frame,
        # crop a pellet_radius region around it before counting
        ch = crosshairs.get(fname)
        if ch and ch.get('x') is not None and ch.get('y') is not None:
            h, w = img.shape[:2]
            cx = int(ch['x'] / 1000 * w)
            cy = int(ch['y'] / 1000 * h)
            r = args.pellet_radius
            x0 = max(0, cx - r); x1 = min(w, cx + r)
            y0 = max(0, cy - r); y1 = min(h, cy + r)
            if x1 - x0 >= 20 and y1 - y0 >= 20:  # guard against degenerate crops
                img = img[y0:y1, x0:x1]

        entry = {"file": fname}
        for name, fn in active.items():
            entry[name] = fn(img, args)
        # Fill missing backends with zeros for consistent output schema
        for name in backends:
            if name not in entry:
                entry[name] = {"white": 0, "red": 0}
        results.append(entry)
        if args.debug_dir:
            save_debug(img, os.path.join(args.debug_dir, Path(f).stem + '_debug.png'), args)

    print(json.dumps(results, indent=2))

if __name__ == '__main__':
    main()
