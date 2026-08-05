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
import sys, os, json, math, argparse, hashlib, collections
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
# ------------------------------------------------------------------------------------------
# Cache-then-sweep (Phase 1 §1.1, docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md).
#
# Detection (mask threshold + connected components + per-component contour/circularity/hole
# stats) is the expensive part of a frame pass (~146ms/frame) and is IDENTICAL regardless of
# which area/circularity/center-exclude/peanut thresholds a sweep wants to try — those are
# comparisons over the same raw component list, not re-detections. `_raw_components` computes
# every component's stats ONCE, deferring only the area/circ/hole/center-exclude ACCEPT/REJECT
# decision (which is cheap dict/tuple arithmetic) to `_filter_components`. `detect_components_
# with_pos` composes them so the live (non-cached) path is unchanged.
#
# DETECT_MIN_AREA/DETECT_MAX_AREA bound the raw dump to components a sweep could plausibly want
# — NOT a re-tuning of the settled WHITE_LO/area/circularity defaults (CLAUDE.md — those stay
# min-area=25/max-area=750/min-circ=0.55 at the filter stage). They exist only so a future sweep
# can loosen --min-area/--max-area within this headroom without a fresh dump; a sweep outside it
# needs a new --dump-detections pass.
# ------------------------------------------------------------------------------------------
DETECT_MIN_AREA = 4
DETECT_MAX_AREA = 5000


def _raw_components(img: np.ndarray, args):
    """Every WHITE/RED-mask component's stats, in the same (white-then-red, label order) order
    `detect_components_with_pos` used to filter live — NO area/circ/hole/center-exclude decision
    applied yet. Returns (raw_list, w, h); raw_list items are dicts with cx/cy/is_red/area/circ/
    has_hole/bw/bh (bw/bh = the bounding box of the component's largest contour, matching what
    the peanut-recovery aspect check in `_filter_components` used to compute inline)."""
    import cv2
    h, w = img.shape[:2]
    bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    raw = []

    def scan(lower_bgr, upper_bgr, is_red):
        mask = cv2.inRange(bgr, lower_bgr, upper_bgr)
        n, labels, stats, centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)
        for i in range(1, n):
            area = int(stats[i, cv2.CC_STAT_AREA])
            if area < args.detect_min_area or area > args.detect_max_area:
                continue
            mx, my = centroids[i]
            comp_mask = (labels == i).astype(np.uint8) * 255
            contours, hierarchy = cv2.findContours(comp_mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
            if not contours:
                continue
            perim = cv2.arcLength(contours[0], True)
            circ = circularity(area, perim)
            has_hole = any(hh[2] != -1 for hh in hierarchy[0] if hh[3] == -1)
            bx, by, bw, bh = cv2.boundingRect(contours[0])
            raw.append({
                'cx': float(mx), 'cy': float(my), 'is_red': bool(is_red),
                'area': area, 'circ': float(circ), 'has_hole': bool(has_hole),
                'bw': int(bw), 'bh': int(bh),
            })

    scan(WHITE_LO[::-1].copy(), np.array([255, 255, 255], dtype=np.uint8), False)
    scan(RED_LO[::-1].copy(), RED_HI[::-1].copy(), True)
    return raw, w, h


def _filter_components(raw_list, args, w, h):
    """Apply the area/circularity/hole/center-exclude/peanut-recovery decision to a raw
    component list — the exact logic `detect_components_with_pos` used to apply inline, just
    replayable against a cached list instead of pixels. Returns the same (cx, cy, is_red, area,
    circ) tuple list, peanut-multiplicity-expanded, that the live path returned."""
    cx0, cy0 = w / 2, h / 2
    comps = []
    for r in raw_list:
        area = r['area']
        if area < args.min_area or area > args.max_area:
            continue
        if math.hypot(r['cx'] - cx0, r['cy'] - cy0) < args.center_exclude:
            continue
        circ = r['circ']
        mult = 1
        if circ >= args.min_circ:
            # Normal round pellet: reject hole-digits (0/6/8/9).
            if r['has_hole']:
                continue
        else:
            # Low circularity — normally rejected, but a compact low-circ WHITE blob is
            # usually overlapping/partially-occluded pellets. Recover it with a multiplicity
            # from its area (partial single = 1, peanut pair = 2). Holes are ALLOWED here:
            # a crescent + full-circle peanut has a hole from the occluded circle's shadowed
            # background, whereas hole-digits are roundish (circ >= min_circ) and take the
            # normal path above. Elongated fragments stay rejected via circ-lo / aspect.
            if r['is_red'] or args.peanut_max_mult < 1:
                continue
            if circ < args.peanut_circ_lo:
                continue
            bw, bh = r['bw'], r['bh']
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
            comps.append((r['cx'] + off, r['cy'], r['is_red'], area, circ))
    return comps


def detect_components_with_pos(img: np.ndarray, args):
    """Return list of (cx, cy, is_red, area, circ) for each detected component."""
    raw, w, h = _raw_components(img, args)
    return _filter_components(raw, args, w, h)

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
# The fps-scaled owner-pellet lifetime band's LOWER bound (docs/handoffs/
# 2026-08-04-representative-frame-PROPOSAL.md §2/§4, docs/probe-runs.md §9G/§13). Duplicated from
# analyze-pellet-tracks.py's `REP_OWNER_LIFE_LO_60FPS` (same name, same value, same formula at its
# own `_ps_band`) rather than imported — this module has no dependency on analyze-pellet-tracks.py
# (the import runs the other way, in-process, see that file's `_count_pellets_module`) and stays
# standalone. Kept in lockstep by convention, not by sharing code, same as `debounce_shots` itself.
# ============================================================
REP_OWNER_LIFE_LO_60FPS = 8


def _band_lo(fps):
    return max(1, round(REP_OWNER_LIFE_LO_60FPS * fps / 60.0))


# ============================================================
# Cross-frame tracking + per-frame result assembly (Phase 1 §1.1) — factored out of main()'s
# `--temporal` loop so it can run BOTH against a live per-frame detection pass and against a
# `--load-detections` cache's filtered component lists. Match-distance (30 zoomed px) and the
# pellet-lifetime cutoff (`--max-pellet-frames`) are the two things a filter/tracker sweep varies
# here; both are cheap (O(components), not O(pixels)) so many combinations run in seconds once
# `all_comps` is available, whether freshly detected or filtered from a cache.
#
# Split into `_track_components` (the nearest-neighbor tracker) and `_frame_pellet_counts` (the
# per-frame radius/lifetime window) so the counting half can be re-run standalone against a
# RECONSTRUCTED `frame_tracks` (e.g. from a committed dump's own track list) without re-deriving
# track identity from raw components a second time — see analyze-pellet-tracks.py's
# `--band-equivalence-audit`, which needs exactly that to check the `band` channel below against
# an independently-computed one without the two runs disagreeing over which components matched
# which track on a near-miss.
# ============================================================
def _track_components(all_comps):
    """The nearest-neighbor tracker. `all_comps`: per-frame list of (cx, cy, is_red, area, circ).
    Returns (tracks, frame_tracks) — `frame_tracks[fi]` is a per-frame list of
    (track_id, x, y, is_red)."""
    tracks = []
    next_id = 0
    frame_tracks = []  # per-frame list of (track_id, x, y, is_red)
    for fi, comps in enumerate(all_comps):
        prev_active = [t for t in tracks if t['last_frame'] == fi - 1]
        matched = set()
        # NOT `active` — that name is the CLI backend-selector dict from main()'s top
        # (`active = backends if args.backend == 'all' else {...}`), read further down by
        # the results loop's `if name in active`. Reusing it here for the per-frame active-
        # track list silently rebinds it for the rest of the function, so `name in active`
        # checks a list of (track_id, x, y, is_red) tuples instead of the backend dict and
        # is never true — every entry falls to the zero-fill branch. Measured: with this
        # collision, --temporal --dump-tracks reports frame_counts all-zero regardless of
        # --backend, on every video (Phase 2A diagnosis,
        # docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md).
        frame_active = []
        for cx, cy, is_red, area, circ in comps:
            best_t, best_d = None, 30  # match_dist
            for t in prev_active:
                if t['id'] in matched:
                    continue
                d = math.hypot(cx - t['last_pos'][0], cy - t['last_pos'][1])
                if d < best_d:
                    best_d, best_t = d, t
            if best_t:
                best_t['last_frame'] = fi
                best_t['last_pos'] = (cx, cy)
                best_t['areas'].append(area)
                best_t['circs'].append(circ)
                best_t['xs'].append(cx)
                best_t['ys'].append(cy)
                # `reds` is the PER-FRAME is_red, parallel to xs/ys/areas — `is_red` above stays
                # the track-level (creation-time) value untouched, since eleven out-of-scope call
                # sites still read it (docs/handoffs/2026-08-05-dump-schema-LANDING-PLAN.md §3).
                # Appended in BOTH tracker branches (this matched-track one and the new-track one
                # below) so `reds` never drifts out of alignment with `xs` (§4.2).
                best_t['reds'].append(is_red)
                matched.add(best_t['id'])
                frame_active.append((best_t['id'], cx, cy, is_red))
            else:
                tracks.append({'id': next_id, 'is_red': is_red, 'first_frame': fi,
                               'last_frame': fi, 'last_pos': (cx, cy),
                               'areas': [area], 'circs': [circ], 'xs': [cx], 'ys': [cy],
                               'reds': [is_red]})
                frame_active.append((next_id, cx, cy, is_red))
                next_id += 1
        frame_tracks.append(frame_active)
    return tracks, frame_tracks


def _frame_pellet_counts(frame_tracks, cross_positions, pellet_ids, band_ids, args):
    """Per-frame {"white", "red", "marker", "band"} counts, windowed by crosshair radius.

    `band` (docs/handoffs/2026-08-04-representative-frame-PROPOSAL.md §2, upper bound decoupled
    from `pellet_ids` by docs/handoffs/2026-08-04-band-hi-LANDING-PLAN.md) is the number of WHITE
    (non-red) in-radius tracks on that frame whose OVERALL lifetime falls in `[_band_lo(fps),
    band_hi]`, bounded by radius + non-red only — NOT gated by `pellet_ids`. `white` requires
    lifetime `<= args.max_pellet_frames` (the `pellet_ids` gate) instead. `band` is therefore no
    longer a strict subset of `white`: it MAY EXCEED `white` when `band_hi > args.max_pellet_frames`
    (band_hi defaults to `args.max_pellet_frames`, which reproduces the old subset relation
    exactly). `band_ids` is precomputed by the caller once from `track_life`, directly off
    `tracks` — not as a subset of `pellet_ids`."""
    results = []
    for fi in range(len(frame_tracks)):
        cp = cross_positions[fi] if fi < len(cross_positions) else None
        white, red, marker, band = 0, 0, 0, 0
        if cp:
            for tid, x, y, is_red in frame_tracks[fi]:
                dist = math.hypot(x - cp[0], y - cp[1])
                if dist > args.pellet_radius:
                    continue
                # `band` is gated by radius + non-red only (NOT by pellet_ids) — hoisted out of
                # the pellet_ids skip below so a track with band_lo <= life <= band_hi can count
                # here even when band_hi > max_pellet_frames excludes it from pellet_ids/white.
                if not is_red and tid in band_ids:
                    band += 1
                if tid not in pellet_ids:
                    continue
                if is_red:
                    # Red components tight to the crosshair are the triangular core-hit
                    # hit-markers, not pellets; count them separately as a core-hit signal.
                    if dist < args.marker_radius:
                        marker += 1
                    else:
                        red += 1
                else:
                    white += 1
        results.append({"white": white, "red": red, "marker": marker, "band": band})
    return results


def build_tracks_and_counts(all_comps, cross_positions, args):
    """Track components across frames, classify by lifetime, and window by crosshair radius.

    `all_comps`: per-frame list of (cx, cy, is_red, area, circ) — either detect_components_with_
    pos(img, args) output (live) or _filter_components(raw, args, w, h) output (cached replay).
    Returns (results, tracks, track_life, pellet_ids, frame_tracks) — `results` is the per-frame
    {"white", "red", "marker", "band"} dict list `--temporal` has always emitted (`band` added
    2026-08-04); the rest are what `--dump-tracks` reports.
    """
    tracks, frame_tracks = _track_components(all_comps)
    track_life = {t['id']: t['last_frame'] - t['first_frame'] + 1 for t in tracks}
    pellet_ids = {t['id'] for t in tracks if track_life[t['id']] <= args.max_pellet_frames}
    fps = getattr(args, 'fps', 30.0) or 30.0
    band_lo = _band_lo(fps)
    # `band_hi` is DECOUPLED from `max_pellet_frames`/`pellet_ids` (docs/handoffs/
    # 2026-08-04-band-hi-LANDING-PLAN.md) — build band_ids from `tracks` directly rather than as a
    # subset of pellet_ids, so a track admitted into `band` need not be admitted into `pellet_ids`.
    # Resolved per-call (not once at parse time) so a --sweep combo that overrides
    # max_pellet_frames without also overriding band_hi still gets the right default.
    band_hi = getattr(args, 'band_hi', None)
    if band_hi is None:
        band_hi = args.max_pellet_frames
    band_ids = {t['id'] for t in tracks if band_lo <= track_life[t['id']] <= band_hi}

    results = _frame_pellet_counts(frame_tracks, cross_positions, pellet_ids, band_ids, args)
    return results, tracks, track_life, pellet_ids, frame_tracks


# ============================================================
# Shot-level debouncing — a faithful Python port of read-pellets.ts's event-grouping estimator
# (Phase 1 §1.1: "make the filters, the tracker, AND THE SHOT ESTIMATOR consume that cache").
# This exists so a cache-then-sweep loop can go all the way from a `--load-detections` replay to
# shot-level totals/avgTotal — the thing a parameter choice actually needs to be judged on — in
# one fast Python process, without invoking read-pellets.ts's ffmpeg/VLM orchestration per combo.
#
# KEEP THIS IN LOCKSTEP WITH read-pellets.ts's debounce block (search that file for "debounce:
# gap-tolerant event grouping"). It is a second implementation of the same algorithm, not a
# shared module, so it is validated against the TS output once (scripts/probe/
# temporal-count-regression.py's sibling check / the H1 tree-code run's committed pellets.json)
# rather than assumed — see `--shots` below.
# ============================================================
def _longest_modal_run(totals, a, b, event_min):
    """The longest contiguous run of ACTIVE frames (>= `event_min`) in `[a, b)` whose values all
    fall within +-1 of the run's own mode. `totals` is a {frame_index: count} mapping (absent keys
    read as 0). This is `plateau_median`'s frame-selection rule (docs/handoffs/
    2026-08-04-representative-frame-PROPOSAL.md §2), ported verbatim from
    analyze-pellet-tracks.py's `_ps_longest_modal_run` (the `--policy-score` arm's
    `hybrid_plateau_median` reference) — kept in lockstep by convention, not a shared module, same
    as the rest of this function."""
    frames = [j for j in range(a, b) if totals.get(j, 0) >= event_min]
    if not frames:
        return []
    blocks, cur = [], [frames[0]]
    for f in frames[1:]:
        if f == cur[-1] + 1:
            cur.append(f)
        else:
            blocks.append(cur)
            cur = [f]
    blocks.append(cur)

    best = []
    for block in blocks:
        n = len(block)
        if n <= len(best):
            continue
        for length in range(n, len(best), -1):
            found = None
            for start in range(0, n - length + 1):
                sub = block[start:start + length]
                vals = [totals[f] for f in sub]
                mode = collections.Counter(vals).most_common(1)[0][0]
                if all(abs(v - mode) <= 1 for v in vals):
                    found = sub
                    break
            if found is not None:
                best = found
                break
    return best


def _plateau_rep(totals, a, b, event_min):
    run = _longest_modal_run(totals, a, b, event_min)
    return run[len(run) // 2] if run else None


def debounce_shots(frame_counts, fps, marker_min=2, min_pellets=5, max_pellets=10):
    """frame_counts: per-frame {"white", "red", "marker"} dicts (build_tracks_and_counts output,
    or any source of the same shape). Returns (shots, summary) mirroring read-pellets.ts's
    `shots`/`summary.{totalShots,validShots,avgTotal,avgRed}`.

    FALLBACK HYBRID representative-frame rule (docs/handoffs/2026-08-04-representative-frame-
    PROPOSAL.md §2/§4, landed docs/probe-runs.md §13): if any frame in the event carries a `band`
    key (docs/probe-runs.md §9G's lifetime-gated series — restricted to tracks whose overall
    lifetime falls in `[band_lo, band_hi]`; bounded by radius + non-red only, NOT by `pellet_ids`,
    so `band` may EXCEED `white` when `band_hi > max_pellet_frames`, docs/handoffs/
    2026-08-04-band-hi-LANDING-PLAN.md), select the representative by `plateau_median` over that
    band series instead of the shipped median-of-
    `white+red`. ⚑ BACKWARD COMPAT: when NO frame in `frame_counts` carries a `band` key (every
    dump before 2026-08-04, and every fixture committed before this rule), this function is
    BYTE-IDENTICAL to the pre-hybrid shipped behaviour below — the `has_band` check is computed
    once, up front, so an absent key can never silently fall through to a `.get(..., 0)` default
    and change an old dump's answer."""
    max_gap = max(3, round(fps * 0.13))
    event_min = 3
    has_band = any('band' in r for r in frame_counts)
    totals = [r['white'] + r['red'] for r in frame_counts]
    n = len(frame_counts)
    shots = []
    event_start = -1
    zero_run = 0
    for i in range(n + 1):
        in_event = i < n and totals[i] >= event_min
        if in_event:
            if event_start < 0:
                event_start = i
            zero_run = 0
            continue
        if event_start >= 0:
            zero_run += 1
            if zero_run <= max_gap and i < n:
                continue
            event_end = i - zero_run
            event_frames = event_end - event_start
            if event_frames >= 2:
                active_idx = [j for j in range(event_start, event_end) if totals[j] >= event_min]
                sorted_totals = sorted(totals[j] for j in active_idx)
                m = len(sorted_totals)
                median_total = (
                    (sorted_totals[(m - 1) // 2] + sorted_totals[m // 2]) / 2 if m else 0
                )
                rep_idx = active_idx[0] if active_idx else event_start
                best_d = float('inf')
                for j in active_idx:
                    d = abs(totals[j] - median_total)
                    if d < best_d:
                        best_d, rep_idx = d, j
                core_hit = any(
                    frame_counts[j].get('marker', 0) >= marker_min
                    for j in range(event_start, event_end)
                )
                shot_red = 1 if core_hit else 0
                rep = frame_counts[rep_idx]
                white, total = rep['white'], rep['white'] + shot_red
                # The hybrid override: only ever REPLACES `rep_idx`/`white`/`total` above, never
                # `shot_red`/`core_hit`/`event_frames`/`start`/`end` -- those are unchanged by the
                # representative-frame rule regardless of which policy picked the frame.
                if has_band:
                    band_totals = {j: frame_counts[j].get('band', 0)
                                    for j in range(event_start, event_end)}
                    band_rep = _plateau_rep(band_totals, event_start, event_end, event_min)
                    if band_rep is not None:
                        rep_idx = band_rep
                        white = band_totals[band_rep]
                        total = white + shot_red
                shots.append({
                    'frame': rep_idx, 'white': white, 'red': shot_red,
                    'total': total, 'frames': event_frames, 'core': core_hit,
                    # DIAGNOSTIC-ONLY, additive (2026-08-01): the event's own frame bounds.
                    # `frame` is the REPRESENTATIVE (median-total, or hybrid-plateau where a band
                    # exists) frame, which is not the blast onset -- but every offset-indexed
                    # counting rule in this pipeline (f8-11) is defined relative to the ONSET t0,
                    # and make-groundtruth-f811.py's find_t0 can only be used where an owner-
                    # supplied approximate shot index exists. `start` is the rising edge this event
                    # was opened on, so a consumer with no owner shot times can index counting
                    # frames off the SAME event grouping the shipped estimator uses instead of
                    # re-deriving onsets from a private copy. Nothing in the returned counts/
                    # summary depends on these two keys, so read-pellets.ts's debounce block stays
                    # in lockstep unchanged.
                    'start': event_start, 'end': event_end,
                })
            event_start = -1
            zero_run = 0

    valid = [s for s in shots if min_pellets <= s['total'] <= max_pellets]
    summary = {
        'totalShots': len(shots),
        'validShots': len(valid),
        'avgTotal': round(sum(s['total'] for s in valid) / len(valid), 1) if valid else None,
        'avgRed': round(sum(s['red'] for s in valid) / len(valid), 2) if valid else None,
    }
    return shots, summary


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


# ============================================================
# Structural crosshair localization (Phase 2A part 2,
# docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md).
#
# cv2.matchTemplate keys on one video's specific box pixels and does not
# generalise (`guilty`: 3 shots on a 180s fight) and, worse, freezes on a
# false seed with no way back (`noir-near-ce36`) — and no confidence
# threshold can separate a false seed from a real box, because their
# confidence bands overlap (§H5: `noir`'s false lock sits at conf 0.43,
# inside marciana's own healthy 0.39-0.53 lock band).
#
# This replaces appearance-matching with the SAME shape model
# `segment_ammo_digits` already uses to read the counter once it is found:
# the ammo box is a fixed-geometry HUD element -- 2-3 bright (or red, at low
# ammo) glyphs sharing a top edge, rendered on a dark badge. That geometry
# is a property of the UI, not of any one recording's pixels, so it
# generalises where a pixel template cannot. Disambiguation from a same-shaped
# false candidate (a floating damage number is also 2-3 bright digits) is by
# TWO independent structural cues, not a single tunable scalar:
#   1. the digit row's local surround is DARK (the badge) -- a floating
#      number has no badge, so its surround is the (brighter) battle scene;
#   2. continuity with the previous frame's lock (the box slides smoothly
#      with the aim point, same `--max-template-disp` gate as the template
#      path) -- a decoy at a random screen position rarely sits within the
#      gate two frames running.
# Categorical shape-admission (a component either has 2-3 row-mates of digit
# size or it doesn't) is what keeps this out of the H5 failure mode: there is
# no single confidence scalar whose "real" and "false" bands can overlap.
# ============================================================
STRUCT_ROW_SIZES = (2, 3)  # ammo counters render 2 or 3 digits


def _digit_glyph_mask(rgb):
    """White-or-red glyph mask — the same colour rule `segment_ammo_digits` reads digits with."""
    r, g, b = rgb[..., 0].astype(int), rgb[..., 1].astype(int), rgb[..., 2].astype(int)
    white = (r > 190) & (g > 190) & (b > 190)
    red = (r > 150) & (g < 90) & (b < 90)
    return ((white | red) * 255).astype(np.uint8)


def _group_digit_rows(mask, templ_h, row_tol_frac=DIGIT_ROW_TOL):
    """Connected glyph-shaped components grouped by shared top edge (one group = one number)."""
    import cv2
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    hlo, hhi = DIGIT_H_RANGE[0] * templ_h, DIGIT_H_RANGE[1] * templ_h
    wlo, whi = DIGIT_W_RANGE[0] * templ_h, DIGIT_W_RANGE[1] * templ_h
    cands = []
    for i in range(1, n):
        x, y, w, h, _area = stats[i]
        if hlo <= h <= hhi and wlo <= w <= whi:
            cands.append((x, y, w, h))
    tol = row_tol_frac * templ_h
    groups, used = [], set()
    for idx, c in enumerate(cands):
        if idx in used:
            continue
        row = [j for j, c2 in enumerate(cands) if abs(c2[1] - c[1]) <= tol]
        for j in row:
            used.add(j)
        groups.append([cands[j] for j in row])
    return groups


def locate_ammo_structural(rgb, templ_h):
    """Candidate ammo-counter positions in FULL-frame coords, best (darkest surround) first.

    Each candidate is `(surround_gray, cx, cy, row_width)`. `surround_gray` is the mean
    brightness of a padded margin around the digit row, excluding the glyph pixels
    themselves — low means "sits on a dark badge" (the real counter), high means
    "floats on the battle scene" (a damage number of the same glyph shape).
    """
    import cv2
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    mask = _digit_glyph_mask(rgb)
    pad = int(0.15 * templ_h)
    h, w = gray.shape
    out = []
    for grp in _group_digit_rows(mask, templ_h):
        if len(grp) not in STRUCT_ROW_SIZES:
            continue
        x0 = min(c[0] for c in grp)
        y0 = min(c[1] for c in grp)
        x1 = max(c[0] + c[2] for c in grp)
        y1 = max(c[1] + c[3] for c in grp)
        px0, px1 = max(0, x0 - pad), min(w, x1 + pad)
        py0, py1 = max(0, y0 - pad), min(h, y1 + pad)
        region = gray[py0:py1, px0:px1]
        region_mask = mask[py0:py1, px0:px1] > 0
        bg = region[~region_mask]
        if not bg.size:
            continue
        out.append((float(bg.mean()), (x0 + x1) / 2.0, (y0 + y1) / 2.0, float(x1 - x0)))
    out.sort(key=lambda c: c[0])
    return out


def locate_crosshair_structural(rgb, templ_h, last_acc, max_disp):
    """One frame's (cx, cy) digit-row centre, its surround score, and whether it was HELD.

    Returns `(center, score, held)`.

    WHAT IT ACTUALLY DOES, precisely — the previous docstring claimed "no carry-forward on a
    lost lock" while the `if not cands` branch below IS one, and that mismatch is the reason
    `held` exists:

      * When the frame yields ANY structural candidate it RE-ACQUIRES from this frame's own
        pixels — no previous position survives into the answer. Selection prefers CONTINUITY
        over raw score: the candidate nearest the previous lock wins if it is within
        `max_disp` (the box moves smoothly with the aim point, same gate the template path
        uses), else the darkest-surround candidate re-acquires the lock outright. There is no
        confidence-scalar override tier. `held` is False and `score` is a number.
      * When candidate generation returns NOTHING it CARRIES THE PREVIOUS POSITION FORWARD
        (`last_acc`) with `score=None` and `held=True`. Measured (docs/probe-runs.md,
        2026-08-03): that case is overwhelmingly RELOAD — the badge is crisp and localizable
        but the game renders no digits in it at all — plus end-of-fight HUD-absent frames and
        1-2 frame transients. It is NOT a "the aim point moved and we lost it" case, which is
        why relaxing the gate to recover it was measured strictly WORSE than holding (it locks
        onto floating damage popups).
      * Before the first acquisition `last_acc` is None, so a candidate-less frame returns
        `(None, None, False)` — there is no position, held or otherwise. `held` therefore
        means "this position is real but is NOT this frame's own measurement", and no caller
        has to infer that from a None in the confidence slot.
    """
    cands = locate_ammo_structural(rgb, templ_h)
    if not cands:
        return last_acc, None, last_acc is not None
    if last_acc is not None:
        nearest = min(cands, key=lambda c: math.hypot(c[1] - last_acc[0], c[2] - last_acc[1]))
        d = math.hypot(nearest[1] - last_acc[0], nearest[2] - last_acc[1])
        if d <= max_disp:
            return (nearest[1], nearest[2]), nearest[0], False
    best = cands[0]
    return (best[1], best[2]), best[0], False


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
# Ammo SERIES over an existing --dump-tracks dump.
# docs/handoffs/2026-08-01-missing-shot-channel-test-plan.md — the missing-shot channel.
#
# The ammo counter is the one shot arbiter in this pipeline that is not downstream of the pellet
# DETECTOR: it decrements once per shot whether or not a blast was detected, so
# `shots_from_ammo - shots_detected_by_pellets` measures the reader's missing-shot channel
# directly. `--ammo-digits` above reads one frame at a time and re-localizes the box itself with
# cv2.matchTemplate; this mode reads a whole dump and reuses the dump's OWN recorded box position
# instead. Two reasons:
#   * cost — matchTemplate over a 2604x792 frame is ~10x the rest of the per-frame work, and a
#     full-fight dump is 5700 frames;
#   * lockstep — the ammo read then shares exactly the localization the pellet counts were
#     produced under, which makes the shared-lock confound MEASURABLE (abstention conditioned on
#     the dump's own stale mask) rather than merely argued. §2 of the test plan names that
#     non-independence as the method's one real weakness; sharing it deliberately and reporting
#     the correlation is more honest than half-sharing it.
#
# Only `--locate structural` dumps are readable this way: there `cross_rawloc[i]` IS the accepted
# digit-row centre (count-pellets.py's structural branch stores `round(center)`), which is the
# exact reference point `segment_ammo_digits` needs. In a template dump `cross_rawloc` is the RAW (possibly
# rejected) box top-left, so the mode REFUSES it and points at --ammo-digits instead.
#
# ABSTENTION CONTRACT (same as --ammo-digits, and the reason this is admissible as an arbiter): a
# frame either yields a fully-confident counter or it reports None with a reason. It never guesses.
# A partly-guessed counter is worse than no read because it looks like data.
# ============================================================
AMMO_ROI_HALF_X = 1.45   # ROI half-extent around the digit-row centre, in template heights.
AMMO_ROI_HALF_Y = 0.84   # 1.45/0.84 x 74px reproduces _ammo_roi's 214x124 extent exactly.
AMMO_DIGIT_CELLS = 3     # this HUD renders a fixed-width 3-digit counter ("004"), measured below


def _ammo_roi_centered(img_rgb, center, templ_h):
    """ROI around a digit-row CENTRE, matching the extent `_ammo_roi` gives the template path."""
    h, w = img_rgb.shape[:2]
    hx, hy = int(round(AMMO_ROI_HALF_X * templ_h)), int(round(AMMO_ROI_HALF_Y * templ_h))
    cx, cy = int(round(center[0])), int(round(center[1]))
    return img_rgb[max(0, cy - hy):min(h, cy + hy), max(0, cx - hx):min(w, cx + hx)]


def read_ammo_at_center(img_rgb, center, templ_h, atlas, digit_score_min, n_cells=AMMO_DIGIT_CELLS):
    """One frame's ammo value at a KNOWN digit-row centre, or an abstention carrying its reason.

    `n_cells` is a fixed-width requirement, not a filter: the counter renders three glyphs
    ("009".."000"), so a frame that segments a different number has lost or gained one and its
    place values can no longer be trusted (dropping the LAST glyph of "004" reads 0, not 4).
    """
    import cv2  # noqa: F401  (match_digit needs it; keep the import cost inside the call path)
    roi = _ammo_roi_centered(img_rgb, center, templ_h)
    cells = segment_ammo_digits(roi, templ_h)
    out = {'cells': len(cells)}
    if len(cells) != n_cells:
        out.update({'ammo': None, 'reason': 'no-digits' if not cells else 'cell-count'})
        return out
    digits, scores = [], []
    for cell, _ in cells:
        d, s = match_digit(cell, atlas)
        digits.append(d)
        scores.append(round(s, 3))
    out['digits'] = digits
    out['scores'] = scores
    if any(d is None for d in digits) or min(scores) < digit_score_min:
        out.update({'ammo': None, 'reason': 'low-score'})
        return out
    out['ammo'] = int(''.join(str(d) for d in digits))
    return out


def ammo_series_from_dump(tracks_path, frames_dir, atlas, templ_h, digit_score_min,
                          n_cells=AMMO_DIGIT_CELLS, limit=None):
    """Per-frame ammo reads for every frame of a structural --dump-tracks dump."""
    with open(tracks_path) as fh:
        data = json.load(fh)
    confs, raw, fnames = data['cross_confs'], data['cross_rawloc'], data['frame_files']
    numeric = [c for c in confs if c is not None]
    # Same discriminator analyze-pellet-tracks.py's detect_locate_mode uses: the structural
    # confidence slot holds an UNNORMALISED surround brightness, the template slot a 0-1 score.
    if not numeric or max(numeric) <= 1.0:
        mode = 'external' if not numeric else 'template'
        return {'tracks': str(tracks_path), 'mode': mode, 'refused': (
            f'{mode} dump: cross_rawloc is not a digit-row centre, so there is no reference point '
            f'to read the counter at. Use --ammo-digits with --ammo-template on the frames instead.')}
    # Per-frame HELD-lock flags when the dump carries them (count-pellets.py has recorded
    # `cross_held` since 2026-08-03). Absent on older dumps -> every frame reads as not-held and
    # the reason set is exactly what it always was, so previously-produced series stay comparable.
    held = data.get('cross_held') or []
    lo, hi = (0, len(fnames)) if limit is None else limit
    reads = []
    for i in range(lo, min(hi, len(fnames))):
        c = raw[i]
        if c is None:
            reads.append({'i': i, 'file': fnames[i], 'ammo': None, 'reason': 'no-lock',
                          'conf': confs[i]})
            continue
        img = load_rgb(os.path.join(frames_dir, fnames[i]))
        e = read_ammo_at_center(img, c, templ_h, atlas, digit_score_min, n_cells)
        e['i'] = i
        e['file'] = fnames[i]
        e['conf'] = confs[i]
        # A read taken at a HELD position was taken at a place this frame never measured. When it
        # abstains, the abstention is a LOCALIZATION state, and reporting it as 'no-digits' (or
        # 'cell-count') attributes a lock failure to segmentation -- measured on the 7 committed
        # dumps, 70.2% of held frames are RELOADS, where the badge is crisp and the game simply
        # renders no digits. The segmentation reason is preserved as `seg_reason` rather than
        # discarded, so nothing that used it can silently lose its denominator.
        if i < len(held) and held[i] and e.get('ammo') is None:
            e['seg_reason'] = e['reason']
            e['reason'] = 'held-lock'
        if i < len(held):
            e['held'] = bool(held[i])
        reads.append(e)
    return {
        'tracks': str(tracks_path), 'frames_dir': str(frames_dir), 'mode': 'structural',
        'templ_h': templ_h, 'digit_score_min': digit_score_min, 'n_cells': n_cells,
        'n_frames': len(fnames), 'range': [lo, min(hi, len(fnames))], 'reads': reads,
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
# Self-test: validate locate_ammo_structural against a committed real frame crop
# (CLAUDE.md constraint 9 — the instrument stays reproducible from a clean checkout).
# ============================================================
STRUCT_FIXTURE = 'scripts/tests/fixtures/pellets/ammo-box-structural-frame350.png'

# `marciana` (slug `marciana`, SG/Iron, marciana-solo.MP4 — NOT marciana-marine-study), frame 350,
# fightT ~41.6s — inside the dropout window (fightT 41.4-53.3) where the OLD template matcher had
# 0% confident matches (docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md Phase 2A).
# The crop keeps both the real ammo box ("008", a dark badge) and a 5-digit floating damage number
# ("26149") that shares the same glyph shape/brightness, so the selftest proves the STRUCT_ROW_SIZES
# count filter rejects the look-alike rather than merely getting lucky on this one frame.
STRUCT_SELFTEST_EXPECT = {'n_candidates': 1, 'cx': 106.0, 'cy': 310.0}


def selftest_structural():
    import cv2
    im = cv2.imread(STRUCT_FIXTURE)
    if im is None:
        print(f'selftest: could not load fixture {STRUCT_FIXTURE}', file=sys.stderr)
        return 1
    rgb = cv2.cvtColor(im, cv2.COLOR_BGR2RGB)
    cands = locate_ammo_structural(rgb, templ_h=74.0)
    got = {'n_candidates': len(cands)}
    if cands:
        got['cx'] = round(cands[0][1], 1)
        got['cy'] = round(cands[0][2], 1)
    ok = (got.get('n_candidates') == STRUCT_SELFTEST_EXPECT['n_candidates'] and
          cands and
          abs(cands[0][1] - STRUCT_SELFTEST_EXPECT['cx']) < 1.0 and
          abs(cands[0][2] - STRUCT_SELFTEST_EXPECT['cy']) < 1.0)
    print(f'expected: {STRUCT_SELFTEST_EXPECT}')
    print(f'got     : {got}')
    print('SELFTEST PASS' if ok else 'SELFTEST FAIL')
    return 0 if ok else 1


# ============================================================
# --load-detections cache: filter/tracker param persistence
# ============================================================
# Filter/tracker knobs that determine a --load-detections replay's answer but that a
# --dump-detections cache's `params` block did NOT originally persist — only detection/
# localization params (frame size, --locate, offsets, red thresholds, --detect-*) were saved,
# so a replay that didn't re-pass every one of these fell back to argparse defaults that differ
# from whatever produced the cache, and returned a plausible-looking WRONG answer with no warning
# (Phase H hardening finding, docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md).
# Persisted at dump time under `dump['filter_params']`; a `--load-detections` replay uses the
# cache's value for each unless the CLI explicitly passes its own (see _explicit_cacheable_params).
CACHEABLE_PARAMS = [
    'center_exclude', 'min_area', 'max_area', 'min_circ', 'pellet_radius', 'marker_radius',
    'max_pellet_frames', 'pellet_unit_area', 'peanut_circ_lo', 'peanut_aspect', 'peanut_max_mult',
    'fps', 'marker_min', 'bounds', 'band_hi',
]
# `band_hi` (added 2026-08-04, docs/handoffs/2026-08-04-band-hi-LANDING-PLAN.md) changes the
# `band` series the same way every other entry above changes its own output, so a
# --load-detections replay must re-apply it exactly like the rest of CACHEABLE_PARAMS. It gets
# ONE exception, though: its own argparse default (None) already IS the historically-correct
# fallback — build_tracks_and_counts resolves a None band_hi to args.max_pellet_frames, which is
# exactly what every cache dumped before this param existed already computed. So unlike every
# other entry, a cache whose `filter_params` predates `band_hi` (the common case for every cache
# on disk today) is not an error to refuse on — it replays byte-identically to before with no
# override needed. This set carves that one param out of the refuse-loudly path in
# _resolve_cache_params below.
CACHEABLE_PARAMS_OPTIONAL = {'band_hi'}


def _explicit_cacheable_params(argv):
    """Which of CACHEABLE_PARAMS the caller actually typed on argv, vs left at the argparse
    default.

    A parsed Namespace can't answer this by itself — an explicitly-passed flag whose value
    happens to equal the default looks identical to an unset default once parsed. Comparing
    args.<dest> to parser.get_default(<dest>) (the other option the task note allows) would
    misclassify that case, so this instead re-parses the SAME argv with a second, throwaway
    parser scoped to just these dests, each defaulted to argparse.SUPPRESS — a dest lands in the
    resulting Namespace's vars() iff its flag was actually present on argv, default value or not.
    Option strings/types must stay in sync with the real definitions in main()'s parser above.
    """
    p = argparse.ArgumentParser(add_help=False)
    p.add_argument('--center-exclude', type=float, default=argparse.SUPPRESS)
    p.add_argument('--min-area', type=int, default=argparse.SUPPRESS)
    p.add_argument('--max-area', type=int, default=argparse.SUPPRESS)
    p.add_argument('--min-circ', type=float, default=argparse.SUPPRESS)
    p.add_argument('--pellet-radius', type=int, default=argparse.SUPPRESS)
    p.add_argument('--marker-radius', type=int, default=argparse.SUPPRESS)
    p.add_argument('--max-pellet-frames', type=int, default=argparse.SUPPRESS)
    p.add_argument('--pellet-unit-area', type=int, default=argparse.SUPPRESS)
    p.add_argument('--peanut-circ-lo', type=float, default=argparse.SUPPRESS)
    p.add_argument('--peanut-aspect', type=float, default=argparse.SUPPRESS)
    p.add_argument('--peanut-max-mult', type=int, default=argparse.SUPPRESS)
    p.add_argument('--fps', type=float, default=argparse.SUPPRESS)
    p.add_argument('--marker-min', type=int, default=argparse.SUPPRESS)
    p.add_argument('--bounds', default=argparse.SUPPRESS)
    p.add_argument('--band-hi', type=int, default=argparse.SUPPRESS)
    ns, _ = p.parse_known_args(argv)
    return set(vars(ns).keys())


def _resolve_cache_params(args, loaded, explicit, load_path):
    """Merge a --load-detections cache's persisted filter_params into `args` (mutated in place),
    letting any CLI flag the caller actually typed override the cached value.

    Refuses (loud banner + exit 1) rather than silently defaulting when the cache predates
    filter_params AND the caller didn't explicitly supply every one of CACHEABLE_PARAMS itself —
    the exact silent-wrong-answer shape this function exists to eliminate (see
    analyze-pellet-tracks.py's "CROSSHAIR TRACK LOOKS BROKEN" for the precedent this follows).

    CACHEABLE_PARAMS_OPTIONAL entries (currently just `band_hi`) are exempt from that refusal: a
    cache missing one of them isn't a wrong-answer risk, because that param's own argparse default
    already reproduces the pre-existing behavior (see the comment on CACHEABLE_PARAMS_OPTIONAL
    above). They're still merged from the cache when present, same as everything else.
    """
    cached = loaded.get('filter_params', {})
    missing = [p for p in CACHEABLE_PARAMS
               if p not in explicit and p not in cached and p not in CACHEABLE_PARAMS_OPTIONAL]
    if missing:
        print('=' * 78, file=sys.stderr)
        print('!! --load-detections CACHE HAS NO filter_params FOR THESE ARGS — REFUSING !!', file=sys.stderr)
        print('=' * 78, file=sys.stderr)
        print(f'  {load_path}', file=sys.stderr)
        print('  was dumped before filter/tracker params were persisted into the cache (or is', file=sys.stderr)
        print('  missing some of them), and the following were not explicitly passed on this', file=sys.stderr)
        print('  command line either:', file=sys.stderr)
        print(f'    {", ".join(missing)}', file=sys.stderr)
        print('  Replaying anyway would silently fall back to argparse defaults that likely differ', file=sys.stderr)
        print('  from whatever produced this cache, and LOOK like a plausible answer while being', file=sys.stderr)
        print('  wrong — that silent-failure shape is exactly what this refusal exists to prevent.', file=sys.stderr)
        print('  => Re-dump with the current script (persists filter_params automatically), or pass', file=sys.stderr)
        print('     every one of --center-exclude/--min-area/--max-area/--min-circ/--pellet-radius/', file=sys.stderr)
        print('     --marker-radius/--max-pellet-frames/--pellet-unit-area/--peanut-circ-lo/', file=sys.stderr)
        print('     --peanut-aspect/--peanut-max-mult/--fps/--marker-min/--bounds explicitly.', file=sys.stderr)
        print('=' * 78, file=sys.stderr)
        sys.exit(1)
    for p in CACHEABLE_PARAMS:
        # Non-optional params are guaranteed present in `cached` here (else the refusal above
        # would already have fired). An optional param (band_hi) may legitimately be absent from
        # an old cache — leave `args` at whatever the CLI/argparse default already resolved to,
        # which is exactly the pre-band_hi behavior this exemption exists to preserve.
        if p not in explicit and p in cached:
            setattr(args, p, cached[p])


# ============================================================
# --load-detections cache: crosshair-localization param persistence
# ============================================================
# 2026-07-31 incident that motivated this block: a --dump-detections cache's `params` already
# stored `locate`/`struct_*` but never --ammo-template's identity or --ammo-roi-x0/--ammo-roi-y0.
# While trying to regenerate a lost cache from source frames, an agent omitted --ammo-roi-x0/y0
# (invisible in the old cache, so nothing flagged the gap) and, separately, picked an
# --ammo-template file that shared a filename with the correct one but not its content — two
# on-disk templates, two different crosshair tracks, no warning either way.
#
# Unlike CACHEABLE_PARAMS (filter/tracker knobs, genuinely re-applied on every --load-detections
# replay), these values only ever affect DETECTION-TIME localization: a replay reuses the
# crosshair track frozen in the cache at dump time and can never actually re-run localization
# against a different template/ROI/locate method. So the risk here isn't "silently computes with
# a wrong default" (as with the filter params) — it's "silently accepts a flag that LOOKS like an
# override but cannot take effect, while the frozen-at-dump-time track quietly disagrees with it."
# That is why a MISMATCH is refused outright (there is a concrete wrong answer to catch), while a
# cache that simply predates this block is a BANNER, not a refusal (there is nothing to check the
# explicit flag against, and if nothing localization-related was passed the flag is moot either
# way — this keeps every cache dumped before this change, including a legacy replay that never
# touches these flags, working exactly as before).
LOCALIZATION_PARAM_KEYS = [
    'ammo_template_path', 'ammo_template_sha256', 'ammo_roi_x0', 'ammo_roi_y0',
    'locate', 'struct_templ_h', 'struct_offset_x', 'struct_offset_y',
]


def _file_sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 16), b''):
            h.update(chunk)
    return h.hexdigest()


def _explicit_localization_params(argv):
    """Same SUPPRESS-second-parse technique as _explicit_cacheable_params (see its docstring),
    scoped to the crosshair-localization inputs.
    """
    p = argparse.ArgumentParser(add_help=False)
    p.add_argument('--ammo-template', default=argparse.SUPPRESS)
    p.add_argument('--ammo-roi-x0', type=float, default=argparse.SUPPRESS)
    p.add_argument('--ammo-roi-y0', type=float, default=argparse.SUPPRESS)
    p.add_argument('--locate', choices=['template', 'structural'], default=argparse.SUPPRESS)
    p.add_argument('--struct-templ-h', type=float, default=argparse.SUPPRESS)
    p.add_argument('--struct-offset-x', type=float, default=argparse.SUPPRESS)
    p.add_argument('--struct-offset-y', type=float, default=argparse.SUPPRESS)
    ns, _ = p.parse_known_args(argv)
    return set(vars(ns).keys())


def _check_localization_params(args, loaded, explicit, load_path):
    """Validate (and, where meaningful, merge) a --load-detections cache's crosshair-localization
    params against this invocation. Mutates args in place for the merge; exits 1 on a real
    mismatch. See the module comment above for why this differs from _resolve_cache_params.
    """
    cached = loaded.get('params', {})
    complete = all(k in cached for k in LOCALIZATION_PARAM_KEYS)
    checks = [
        ('ammo_template', 'ammo_template_sha256',
         _file_sha256(args.ammo_template) if args.ammo_template else None),
        ('ammo_roi_x0', 'ammo_roi_x0', args.ammo_roi_x0),
        ('ammo_roi_y0', 'ammo_roi_y0', args.ammo_roi_y0),
        ('locate', 'locate', args.locate),
        ('struct_templ_h', 'struct_templ_h', args.struct_templ_h),
        ('struct_offset_x', 'struct_offset_x', args.struct_offset_x),
        ('struct_offset_y', 'struct_offset_y', args.struct_offset_y),
    ]
    if not complete:
        explicit_hit = [dest for dest, _, _ in checks if dest in explicit]
        if explicit_hit:
            print('=' * 78, file=sys.stderr)
            print('!! --load-detections CACHE PREDATES LOCALIZATION-PARAM PERSISTENCE !!', file=sys.stderr)
            print('=' * 78, file=sys.stderr)
            print(f'  {load_path} has no recorded ammo-template hash / ROI / locate / struct-*', file=sys.stderr)
            print(f'  block, so the explicitly-passed {", ".join(explicit_hit)} cannot be checked', file=sys.stderr)
            print('  against whatever actually produced this cache\'s crosshair track. These flags', file=sys.stderr)
            print('  have NO effect on a --load-detections replay either way — the track is frozen', file=sys.stderr)
            print('  at dump time — so this is a consistency WARNING, not a recomputation.', file=sys.stderr)
            print('  => Re-dump with the current script to get a verifiable cache.', file=sys.stderr)
            print('=' * 78, file=sys.stderr)
        return
    for dest, cache_key, current in checks:
        if dest in explicit and current != cached.get(cache_key):
            print('=' * 78, file=sys.stderr)
            print('!! --load-detections LOCALIZATION MISMATCH — REFUSING !!', file=sys.stderr)
            print('=' * 78, file=sys.stderr)
            print(f'  {load_path}', file=sys.stderr)
            print(f'  was localized with {cache_key}={cached.get(cache_key)!r}', file=sys.stderr)
            flag = '--' + dest.replace('_', '-')
            print(f'  but this invocation explicitly passes {flag}, resolving to {current!r}.', file=sys.stderr)
            print('  A --load-detections replay can never re-run localization — the crosshair track', file=sys.stderr)
            print('  is frozen at dump time — so honoring this flag would silently keep using the OLD', file=sys.stderr)
            print('  track while claiming the NEW template/ROI/locate is in effect.', file=sys.stderr)
            print(f'  => Re-dump with {flag} matching this invocation instead.', file=sys.stderr)
            print('=' * 78, file=sys.stderr)
            sys.exit(1)
    # Every one of these is inert to replay computation (see module comment) — merging cached
    # values into args is pure bookkeeping so `args` stays truthful about what actually produced
    # the frozen track. ammo_template's PATH can't be reconstructed from its cached hash, so it's
    # left alone rather than merged.
    for dest, cache_key, _ in checks:
        if dest != 'ammo_template' and dest not in explicit and cache_key in cached:
            setattr(args, dest, cached[cache_key])


# ============================================================
# --load-detections cache-then-sweep regression pin
# ============================================================
CACHE_SLICE_FIXTURE = 'scripts/tests/fixtures/pellets/h1-cache-slice.json'
CACHE_SELFTEST_COMBO = [{"min_area": 25, "max_area": 750, "min_circ": 0.55}]
# Pinned from the committed fixture (a 200-frame slice of scratchpad/pellets/h1-cache-test/
# detections.json, itself frames 1-200 of scratchpad/pellets/h1-marciana-treecode/frames-pellet —
# marciana-solo.MP4, slug `marciana` (SG/Iron), not marciana-marine-study).
# Independently cross-checked against scratchpad/pellets/h1-cache-test/live200-shots.log (an
# uncommitted scratch run over the same 200 frames with the full filter/tracker arg set passed
# explicitly) before being pinned here — that agreement IS the fixture's validation.
#
# ⚑ MOVED 2026-08-04 (validShots 7->6, avgTotal 7.1->6.7) by the fallback-hybrid representative-
# frame rule (docs/handoffs/2026-08-04-representative-frame-PROPOSAL.md, landed docs/probe-runs.md
# §13) — this is a REAL 200-frame slice fed through the full `--temporal --sweep` pipeline, so
# `build_tracks_and_counts` now always emits a `band` channel and `debounce_shots` always attempts
# the hybrid. 7 of this slice's 9 events move to a LOWER-total plateau frame instead of the
# shipped flash-phase frame (consistent with §9D: the shipped median samples the muzzle flash,
# which reads high); one of them (event index 4, span [78,85)) crosses the `min_pellets=5` floor
# going from total=5 (valid) to total=4 (invalid), which is the entire validShots/avgTotal delta.
# Reproduced directly: `debounce_shots` on this slice's own `build_tracks_and_counts` output vs the
# same output with `band` stripped (the pre-hybrid answer) diverges on exactly events
# {0, 2, 3, 4, 6} (0-indexed) and agrees on {1, 5, 7, 8} — event 4 is the only one that also flips
# validity. This is the change working as designed, not a bug.
CACHE_SELFTEST_EXPECT = {"totalShots": 9, "validShots": 6, "avgTotal": 6.7, "avgRed": 0.0}
CACHE_SELFTEST_OVERRIDE_EXPECT = {"totalShots": 3, "validShots": 1, "avgTotal": 5.0, "avgRed": 0.0}


def _cache_selftest_sweep(extra_args):
    """Drive the real CLI as a subprocess (same technique as temporal-count-regression.py) so this
    pin exercises argparse + _explicit_cacheable_params + _resolve_cache_params exactly as a real
    invocation would, not just the helper functions directly."""
    import subprocess, tempfile
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as tf:
        json.dump(CACHE_SELFTEST_COMBO, tf)
        combo_path = tf.name
    try:
        proc = subprocess.run(
            [sys.executable, __file__, '--load-detections', CACHE_SLICE_FIXTURE,
             '--temporal', '--sweep', combo_path] + extra_args,
            capture_output=True, text=True)
    finally:
        os.unlink(combo_path)
    if proc.returncode != 0:
        print(proc.stderr, file=sys.stderr)
        return None
    return json.loads(proc.stdout.strip().splitlines()[0])['summary']


def selftest_cache():
    """Regression pin for the --load-detections cache-then-sweep filter/tracker param persistence
    fix (Phase H hardening, docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md — a
    replay that omitted args silently fell back to argparse defaults that differed from whatever
    produced the cache, returning a plausible-looking wrong answer with no warning). Checks:
      1. A --sweep combo naming only min_area/max_area/min_circ reproduces the cache's OWN
         creation-time answer, by falling back to its filter_params block for every other
         filter/tracker knob (center_exclude, pellet_radius, marker_radius, max_pellet_frames,
         ...) instead of silently defaulting.
      2. An explicit CLI flag (--pellet-radius 80) still overrides the cached value.
    """
    ok = True
    got_base = _cache_selftest_sweep([])
    print(f'cache-fallback expected: {CACHE_SELFTEST_EXPECT}')
    print(f'cache-fallback got     : {got_base}')
    ok = ok and (got_base == CACHE_SELFTEST_EXPECT)

    got_override = _cache_selftest_sweep(['--pellet-radius', '80'])
    print(f'explicit-override expected: {CACHE_SELFTEST_OVERRIDE_EXPECT}')
    print(f'explicit-override got     : {got_override}')
    ok = ok and (got_override == CACHE_SELFTEST_OVERRIDE_EXPECT)

    print('SELFTEST PASS' if ok else 'SELFTEST FAIL')
    return 0 if ok else 1


# ============================================================
# Main
# ============================================================
def main():
    if '--selftest' in sys.argv:
        raise SystemExit(selftest_structural())
    if '--cache-selftest' in sys.argv:
        raise SystemExit(selftest_cache())
    parser = argparse.ArgumentParser(description='Shotgun pellet counter (A/B: numpy, PIL, OpenCV)')
    parser.add_argument('input', nargs='?', help='image file or directory of frames')
    parser.add_argument('--selftest', action='store_true', help=f'validate locate_ammo_structural against {STRUCT_FIXTURE} and exit (handled before other args are required)')
    parser.add_argument('--cache-selftest', action='store_true', help=f'validate --load-detections cache-then-sweep param persistence against {CACHE_SLICE_FIXTURE} and exit (handled before other args are required)')
    parser.add_argument('--debug-dir', help='save debug masks + outlines')
    parser.add_argument('--center-exclude', type=float, default=18, help='exclude radius from crop centre (px)')
    parser.add_argument('--min-area', type=int, default=100, help='min component area (px²)')
    parser.add_argument('--max-area', type=int, default=3000, help='max component area (px²)')
    parser.add_argument('--min-circ', type=float, default=0.55, help='min circularity (0..1)')
    parser.add_argument('--zoom', type=int, default=1, help='upscale factor applied during extraction (for offset/area defaults)')
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
    parser.add_argument('--relock-conf-min', type=float, default=0.55, help='confidence bar to (re)acquire the crosshair lock: gates the very first lock (instead of the base 0.3), and lets a strong match beyond --max-template-disp override a stale/false lock rather than being discarded as a jump (default 0.55)')
    parser.add_argument('--track-conf-min', type=float, default=0.3, help='min confidence to accept a smooth, in-gate continuation of the current lock (default 0.3, the original base threshold) — raise this to stop a chain of weak matches drifting the lock away from the real box one small step at a time')
    parser.add_argument('--locate', choices=['template', 'structural'], default='template', help='crosshair localization method: "template" = cv2.matchTemplate on --ammo-template (default, needs a per-video template); "structural" = find the ammo counter by its shape (2-3 digit glyphs on a dark badge, see locate_ammo_structural) — no template needed, does not depend on any one video\'s pixels (default: template)')
    parser.add_argument('--struct-templ-h', type=float, help='ammo-badge basis height in ZOOMED px, for the digit height/width gates (default 37*zoom = 74 at zoom 2, the box size measured across all four videos)')
    parser.add_argument('--struct-offset-x', type=float, help='crosshair X offset from the structural digit-row CENTRE in zoomed px (default 81*zoom = 162 at zoom 2, calibrated against the template-derived crosshair on marciana)')
    parser.add_argument('--struct-offset-y', type=float, help='crosshair Y offset from the structural digit-row CENTRE in zoomed px (default -6.25*zoom = -12.5 at zoom 2)')
    parser.add_argument('--temporal', action='store_true', help='enable temporal filtering (track components across frames, classify by lifetime)')
    parser.add_argument('--max-pellet-frames', type=int, default=8, help='max frames a pellet component persists (default 8 at 30fps)')
    parser.add_argument('--band-hi', type=int, default=None, help='upper lifetime bound (frames) for the `band` series (docs/handoffs/2026-08-04-band-hi-LANDING-PLAN.md), decoupled from --max-pellet-frames/pellet_ids. Defaults to --max-pellet-frames when omitted, which reproduces the pre-existing band ⊆ pellet_ids behaviour exactly (byte-identical output for every caller that does not pass this flag). Raising it admits longer-lived tracks into `band` WITHOUT admitting them into `pellet_ids`/`white` — band may then exceed white.')
    parser.add_argument('--dump-tracks', help='(temporal) write full per-track diagnostics JSON to this path')
    parser.add_argument('--dump-detections', help='(temporal) write the RAW pre-filter per-frame component list + crosshair track to this path — the cache half of cache-then-sweep (Phase 1 §1.1, docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md). Detection (mask+CC+contour stats) runs once and is cached; a later --load-detections run replays filtering/tracking against it in seconds instead of minutes.')
    parser.add_argument('--load-detections', help='(temporal) replay filtering + tracking from a --dump-detections cache instead of re-detecting from frame images. The positional `input` arg is ignored in this mode (frame identity comes from the cache). Combine with --min-area/--max-area/--min-circ/--center-exclude/--pellet-radius/--max-pellet-frames/--band-hi/--peanut-* to sweep those cheaply; the crosshair track and raw components are frozen at dump time (re-dump to change --locate or the WHITE_LO/RED_LO color thresholds).')
    parser.add_argument('--detect-min-area', type=int, default=DETECT_MIN_AREA, help=f'(--dump-detections) raw component area floor BEFORE filtering — generous headroom for a future --min-area sweep, not the tunable pellet-shape filter itself (default {DETECT_MIN_AREA})')
    parser.add_argument('--detect-max-area', type=int, default=DETECT_MAX_AREA, help=f'(--dump-detections) raw component area ceiling BEFORE filtering, same rationale as --detect-min-area (default {DETECT_MAX_AREA})')
    parser.add_argument('--fps', type=float, default=30.0, help='sampling fps of the frame source — only used by --shots/--sweep for the debounce gap-tolerance constant (read-pellets.ts computes the same thing from its own --fps; default 30 matches every reference run)')
    parser.add_argument('--shots', action='store_true', help='(temporal) also run the shot-level debouncer (a Python port of read-pellets.ts\'s event-grouping estimator — see debounce_shots) over the frame counts and print shots + summary to stderr, instead of needing the TS orchestrator for a quick sweep read')
    parser.add_argument('--marker-min', type=int, default=2, help='(--shots) min red hit-markers in an event to call it a core hit (default 2, matches read-pellets.ts)')
    parser.add_argument('--bounds', default='5,10', help='(--shots) MIN,MAX total pellets for a shot to count as "valid" (default 5,10, matches read-pellets.ts)')
    parser.add_argument('--sweep', help='(temporal, needs --load-detections) JSON file: a list of param-override objects (any of min_area/max_area/min_circ/center_exclude/pellet_radius/marker_radius/max_pellet_frames/band_hi/peanut_circ_lo/peanut_aspect/peanut_max_mult/pellet_unit_area). Runs filter+track+debounce for each combo against the SAME cached detections and prints one JSON summary line per combo to stdout — the "seconds not minutes" sweep this phase exists for.')
    parser.add_argument('--ammo-digits', action='store_true', help='read the AMMO COUNTER digits inside the located box (needs --ammo-template + --ammo-atlas)')
    parser.add_argument('--ammo-atlas', help='directory of digit glyph PNGs named <digit>_<tag>.png')
    parser.add_argument('--build-atlas', action='store_true', help='(with --ammo-digits --ammo-atlas --labels) harvest labelled glyphs instead of reading')
    parser.add_argument('--atlas-tag', default='f', help='(--build-atlas) filename tag for harvested glyphs, written as <digit>_<tag><frame><cell>.png — give a distinct tag when EXTENDING an existing atlas so the new glyphs cannot overwrite its originals (default "f")')
    parser.add_argument('--labels', help='(--build-atlas) comma-separated counter values, one per input frame, in filename order')
    parser.add_argument('--ammo-series', metavar='TRACKS_JSON', help='read the ammo counter for EVERY frame of an existing --dump-tracks dump, reusing that dump\'s own recorded box localization (structural dumps only). Needs --ammo-series-frames + --ammo-atlas; writes the per-frame read series as JSON to stdout. This is the shot ARBITER half of docs/handoffs/2026-08-01-missing-shot-channel-test-plan.md — analyze-pellet-tracks.py --missing-shots consumes its output.')
    parser.add_argument('--ammo-series-frames', metavar='DIR', help='(--ammo-series) directory holding the dump\'s extracted frames (its frame_files names are resolved inside it)')
    parser.add_argument('--ammo-series-range', metavar='LO,HI', help='(--ammo-series) read only frame indices [LO,HI) of the dump — for a quick check without paying for a full 5700-frame fight')
    parser.add_argument('--ammo-cells', type=int, default=AMMO_DIGIT_CELLS, help=f'(--ammo-series) exact digit count the counter renders; a frame segmenting any other number ABSTAINS (default {AMMO_DIGIT_CELLS})')
    parser.add_argument('--digit-score-min', type=float, default=0.60, help='min glyph match score; a frame below it ABSTAINS rather than guessing (default 0.60)')
    parser.add_argument('--force', action='store_true', help='(--dump-detections) overwrite an existing dump path — refused otherwise (2026-07-31: an unforced overwrite destroyed scratchpad/pellets/h1-cache-test/detections.json with no way back; see docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md Phase H)')
    args = parser.parse_args()

    if args.dump_detections and os.path.exists(args.dump_detections) and not args.force:
        print('=' * 78, file=sys.stderr)
        print('!! --dump-detections REFUSING TO OVERWRITE AN EXISTING FILE — pass --force !!', file=sys.stderr)
        print('=' * 78, file=sys.stderr)
        print(f'  {args.dump_detections} already exists.', file=sys.stderr)
        print('  A silent overwrite here already destroyed a fixture once with no way back — the', file=sys.stderr)
        print('  cache is the only record of a raw per-frame detection + crosshair-localization run', file=sys.stderr)
        print('  that can take minutes to reproduce, and (2026-07-31 incident) may not even be', file=sys.stderr)
        print('  byte-reproducible if any localization input silently differs. Move the existing', file=sys.stderr)
        print('  file aside, pick a new --dump-detections path, or pass --force to replace it.', file=sys.stderr)
        print('=' * 78, file=sys.stderr)
        sys.exit(1)

    # Default crosshair offset scales with zoom so direct callers get the same
    # native geometry as the orchestrator (12.5 px right, 100 px above ammo box centre).
    if args.ammo_offset_x is None:
        args.ammo_offset_x = 12.5 * args.zoom
    if args.ammo_offset_y is None:
        args.ammo_offset_y = -100 * args.zoom

    # Structural-locate defaults scale with zoom the same way (see locate_ammo_structural /
    # the Phase 2A part 2 calibration in the implementation plan).
    if args.struct_templ_h is None:
        args.struct_templ_h = 37.0 * args.zoom
    if args.struct_offset_x is None:
        args.struct_offset_x = 81.0 * args.zoom
    if args.struct_offset_y is None:
        args.struct_offset_y = -6.25 * args.zoom

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

    if args.load_detections or args.ammo_series:
        # Frame identity comes from the cache / the dump's own frame_files; `input` is unused
        # (and often omitted) in both modes.
        files = []
    else:
        if not args.input:
            print('input is required unless --load-detections is given', file=sys.stderr)
            sys.exit(1)
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

    if args.ammo_series:
        if not args.ammo_series_frames:
            print('--ammo-series needs --ammo-series-frames', file=sys.stderr)
            sys.exit(1)
        atlas = load_digit_atlas(args.ammo_atlas or '')
        if not atlas:
            print(f'--ammo-series needs a digit atlas (--ammo-atlas {args.ammo_atlas})',
                  file=sys.stderr)
            sys.exit(1)
        rng = None
        if args.ammo_series_range:
            lo, hi = args.ammo_series_range.split(',')
            rng = (int(lo), int(hi))
        out = ammo_series_from_dump(args.ammo_series, args.ammo_series_frames, atlas,
                                    args.struct_templ_h, args.digit_score_min,
                                    args.ammo_cells, rng)
        if out.get('refused'):
            print(f'--ammo-series REFUSED {args.ammo_series}: {out["refused"]}', file=sys.stderr)
            print(json.dumps(out, indent=2))
            sys.exit(2)
        n_read = sum(1 for r in out['reads'] if r.get('ammo') is not None)
        reasons = collections.Counter(r.get('reason') for r in out['reads'] if r.get('ammo') is None)
        print(f'ammo-series: {n_read}/{len(out["reads"])} frames read '
              f'({100 * n_read / max(1, len(out["reads"])):.1f}%); abstentions {dict(reasons)}',
              file=sys.stderr)
        print(json.dumps(out))
        return

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
                    saved += build_atlas_from_cells(cells, lab, args.ammo_atlas,
                                                    f'{args.atlas_tag}{fi:03d}')
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
        #
        # Two sources for all_comps/cross_positions, both feeding the SAME downstream tracker
        # (build_tracks_and_counts) — cache-then-sweep (Phase 1 §1.1):
        #   --load-detections <cache>  : replay filtering from a --dump-detections cache (fast,
        #                                 no image I/O, no re-localization — see below)
        #   (default)                  : fresh per-frame detection + localization from `files`,
        #                                 optionally ALSO written to --dump-detections
        raw_dump = None       # per-frame raw (pre-filter) component lists, if --dump-detections
        frame_w = frame_h = None
        if args.load_detections:
            with open(args.load_detections) as lf:
                loaded = json.load(lf)
            explicit = _explicit_cacheable_params(sys.argv[1:])
            _resolve_cache_params(args, loaded, explicit, args.load_detections)
            loc_explicit = _explicit_localization_params(sys.argv[1:])
            _check_localization_params(args, loaded, loc_explicit, args.load_detections)
            fnames = loaded['frame_files']
            cross_positions = [tuple(c) if c else None for c in loaded['cross_positions']]
            cross_confs = loaded['cross_confs']
            cross_rawloc = [tuple(c) if c else None for c in loaded['cross_rawloc']]
            # Caches written before the held-lock signal existed carry no `cross_held`. It is NOT
            # reconstructible from the cache (the candidate list is gone), so it stays None and the
            # key is omitted from anything this run writes — consumers then fall back to their own
            # inferred staleness rule instead of reading a fabricated all-False array as truth.
            cross_held = loaded.get('cross_held')
            frame_w, frame_h = loaded['params']['frame_w'], loaded['params']['frame_h']
            all_comps = [_filter_components(fr, args, frame_w, frame_h) for fr in loaded['detections']]
        else:
            all_comps = []       # per-frame component lists (full frame coords)
            cross_positions = [] # per-frame crosshair positions (full frame coords)
            fnames = []
            cross_confs = []   # per-frame template match confidence (None if no template) —
                               # when --locate structural, this holds the accepted candidate's
                               # SURROUND score instead (lower = darker badge = better; see
                               # locate_ammo_structural). Same slot, documented meaning per mode.
            cross_rawloc = []  # per-frame raw (unfiltered) template match top-left loc, or the
                               # best structural candidate's (cx, cy) before the continuity gate
            cross_held = []    # per-frame True where the position is a CARRY-FORWARD of the
                               # previous frame's lock rather than this frame's own measurement.
                               # BOTH modes have a hold branch and neither used to be observable:
                               # structural signals it by dropping conf to None, template keeps
                               # recording the FAILING numeric conf, so downstream code had to
                               # infer staleness per mode (analyze-pellet-tracks.py stale_mask).
                               # This records the locator's own answer instead of inferring it.
            last_acc = None    # last accepted ammo-box top-left loc (for displacement gate)
            last_acc_struct = None  # last accepted structural digit-row centre (cx, cy)
            max_disp = args.max_template_disp
            if args.dump_detections:
                raw_dump = []
            for f in files:
                img = load_rgb(f)
                fname = os.path.basename(f)
                fnames.append(fname)
                # Detect components on the full (uncropped) frame
                raw, frame_w, frame_h = _raw_components(img, args)
                all_comps.append(_filter_components(raw, args, frame_w, frame_h))
                if raw_dump is not None:
                    raw_dump.append(raw)
                # Find crosshair position via ammo template
                cross_pos = None
                conf_val = None
                raw_loc = None
                held_val = False
                if args.locate == 'structural':
                    center, score, held = locate_crosshair_structural(img, args.struct_templ_h,
                                                                      last_acc_struct, max_disp)
                    if center is not None:
                        last_acc_struct = center
                        conf_val = score
                        held_val = held
                        raw_loc = (round(center[0]), round(center[1]))
                        cross_pos = (round(center[0] + args.struct_offset_x),
                                     round(center[1] + args.struct_offset_y))
                elif ammo_tmpl is not None:
                    import cv2 as _cv2
                    frame_bgr = _cv2.cvtColor(img, _cv2.COLOR_RGB2BGR)
                    conf, loc = match_ammo_in_roi(frame_bgr, ammo_tmpl, args.ammo_roi_x0, args.ammo_roi_y0)
                    conf_val = float(conf)
                    raw_loc = (int(loc[0]), int(loc[1]))
                    cand = raw_loc
                    # Positional-consistency gate: the ammo box moves smoothly, so a match
                    # that jumps implausibly far (e.g. locking onto the HP bar) is rejected
                    # and the last accepted position is carried forward instead.
                    #
                    # This gate has no way back once the FIRST lock is wrong: an unconditional
                    # base-threshold (conf>0.3) seed can land on background clutter (measured:
                    # noir-near-ce36 seeded at conf=0.43 on smoke, frame ~2, then froze there for
                    # all 600 frames while conf 0.5-0.8 matches on the REAL box kept appearing and
                    # being discarded as "jumps" for the rest of the run — see Phase 2A diagnosis,
                    # docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md). A strong match
                    # is therefore allowed to (re)acquire the lock even when it fails the distance
                    # gate, and the very first lock must itself clear the stronger bar rather than
                    # the base threshold.
                    accepted = None
                    if last_acc is None:
                        if conf >= args.relock_conf_min:
                            accepted = cand
                            last_acc = cand
                    elif conf >= args.track_conf_min and math.hypot(cand[0] - last_acc[0], cand[1] - last_acc[1]) < max_disp:
                        accepted = cand
                        last_acc = cand
                    elif conf >= args.relock_conf_min:
                        accepted = cand
                        last_acc = cand
                    elif last_acc is not None:
                        accepted = last_acc
                        held_val = True   # the carry-forward branch named in the comment above
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
                # A --crosshair-file fallback position (the block just above) is an EXTERNAL
                # measurement, not a carry-forward, so held_val stays False for it by construction.
                cross_held.append(held_val)

            if args.dump_detections:
                dump = {
                    "params": {
                        "frame_w": frame_w, "frame_h": frame_h,
                        "zoom": args.zoom, "locate": args.locate,
                        "ammo_offset_x": args.ammo_offset_x, "ammo_offset_y": args.ammo_offset_y,
                        "struct_templ_h": args.struct_templ_h, "struct_offset_x": args.struct_offset_x,
                        "struct_offset_y": args.struct_offset_y,
                        "max_template_disp": args.max_template_disp,
                        "relock_conf_min": args.relock_conf_min, "track_conf_min": args.track_conf_min,
                        "red_r_min": args.red_r_min, "red_gb_max": args.red_gb_max,
                        "detect_min_area": args.detect_min_area, "detect_max_area": args.detect_max_area,
                        "ammo_template_path": args.ammo_template,
                        "ammo_template_sha256": _file_sha256(args.ammo_template) if args.ammo_template else None,
                        "ammo_roi_x0": args.ammo_roi_x0, "ammo_roi_y0": args.ammo_roi_y0,
                    },
                    "filter_params": {p: getattr(args, p) for p in CACHEABLE_PARAMS},
                    "frame_files": fnames,
                    "cross_positions": cross_positions,
                    "cross_confs": cross_confs,
                    "cross_rawloc": cross_rawloc,
                    "detections": raw_dump,
                }
                if cross_held is not None:
                    dump["cross_held"] = cross_held
                with open(args.dump_detections, 'w') as df:
                    json.dump(dump, df)
                print(f'dumped raw detections for {len(fnames)} frames -> {args.dump_detections}',
                      file=sys.stderr)

        # Track components across frames, classify by lifetime, window by crosshair radius.
        frame_results, tracks, track_life, pellet_ids, frame_tracks = build_tracks_and_counts(
            all_comps, cross_positions, args)

        results = []
        for fi, fname in enumerate(fnames):
            fr = frame_results[fi]
            entry = {"file": fname}
            for name in backends:
                entry[name] = (
                    dict(fr) if name in active
                    else {"white": 0, "red": 0, "marker": 0, "band": 0}
                )
            results.append(entry)

        # Optional diagnostic dump: every track with full stats + per-frame crosshair data
        if args.dump_tracks:
            # `len(reds) == len(xs)` for every track — Edit A appends to `reds` in both tracker
            # branches on the assumption that a track can never resume after a missed frame
            # (docs/handoffs/2026-08-05-dump-schema-LANDING-PLAN.md §4.2); this is the constructive
            # check that a future tracker change hasn't silently broken that assumption.
            for t in tracks:
                assert len(t['reds']) == len(t['xs']), (
                    f"track {t['id']}: reds/xs length mismatch "
                    f"({len(t['reds'])} vs {len(t['xs'])}) — reds is no longer parallel to xs"
                )
            dump = {
                "params": {
                    "max_pellet_frames": args.max_pellet_frames,
                    "min_area": args.min_area, "max_area": args.max_area,
                    "min_circ": args.min_circ, "center_exclude": args.center_exclude,
                    "pellet_radius": args.pellet_radius,
                    "marker_radius": args.marker_radius,
                    "band_hi": args.band_hi if getattr(args, 'band_hi', None) is not None else args.max_pellet_frames,
                    "ammo_offset_x": args.ammo_offset_x, "ammo_offset_y": args.ammo_offset_y,
                },
                "frame_files": fnames,
                "cross_positions": cross_positions,
                "cross_confs": cross_confs,
                "cross_rawloc": cross_rawloc,
                "frame_counts": [{"white": r["opencv"]["white"], "red": r["opencv"]["red"], "marker": r["opencv"]["marker"], "band": r["opencv"]["band"]} for r in results],
                "tracks": [{
                    "id": t['id'], "is_red": t['is_red'],
                    "first": t['first_frame'], "last": t['last_frame'],
                    "life": track_life[t['id']], "is_pellet": t['id'] in pellet_ids,
                    "mean_area": round(sum(t['areas']) / len(t['areas']), 1),
                    "max_area": max(t['areas']),
                    "mean_circ": round(sum(t['circs']) / len(t['circs']), 3),
                    # Full precision (no round()) — a 0.1px rounding step could flip a `dist >
                    # radius` boundary test on replay (BOUNDARY, §25B); `cross_positions` is
                    # verified unrounded (count-pellets.py's own list, integer-valued on every
                    # dump measured), so full-precision xs/ys make replay arithmetic bit-identical
                    # to production's instead of merely closer.
                    "xs": t['xs'],
                    "ys": t['ys'],
                    "areas": t['areas'],
                    # Per-frame is_red, parallel to xs/ys/areas — kills SPLIT (§25B) by letting a
                    # replay classify each frame's component instead of the track's creation-time
                    # value. `is_red` above is left untouched for the eleven out-of-scope
                    # track-level call sites (plan §3).
                    "reds": t['reds'],
                } for t in tracks],
            }
            # Omitted (not defaulted to all-False) when this run replayed a pre-held-lock
            # --load-detections cache: absent means "unknown, use the inferred rule", and a
            # fabricated all-False array would read as "nothing was ever held".
            if cross_held is not None:
                dump["cross_held"] = cross_held
            with open(args.dump_tracks, 'w') as df:
                json.dump(dump, df)
            print(f'dumped {len(tracks)} tracks -> {args.dump_tracks}', file=sys.stderr)

        # Shot-level debounce (Phase 1 §1.1's "the shot estimator consumes that cache" half) —
        # a fast, in-process alternative to routing through read-pellets.ts's TS debounce.
        if args.shots or args.sweep:
            bounds = [int(x) for x in args.bounds.split(',')]

        if args.shots:
            shots, summary = debounce_shots(frame_results, args.fps, args.marker_min, bounds[0], bounds[1])
            print(f'shots: {json.dumps(summary)}', file=sys.stderr)
            for s in shots[:25]:
                print(f'  {s}', file=sys.stderr)
            if len(shots) > 25:
                print(f'  ... and {len(shots) - 25} more', file=sys.stderr)

        # Parameter sweep over the SAME cached/detected raw components — the "seconds not
        # minutes" half of cache-then-sweep. Needs --load-detections (or --dump-detections in the
        # same run) so combos can be re-filtered without re-detecting from pixels.
        if args.sweep:
            src_raw = loaded['detections'] if args.load_detections else raw_dump
            if src_raw is None:
                print('--sweep needs --load-detections (or --dump-detections in this same run) '
                      'so combos can reuse the cached raw detections', file=sys.stderr)
                sys.exit(1)
            with open(args.sweep) as sf:
                combos = json.load(sf)
            for combo in combos:
                combo_args = argparse.Namespace(**vars(args))
                for k, v in combo.items():
                    setattr(combo_args, k, v)
                comps_c = [_filter_components(fr, combo_args, frame_w, frame_h) for fr in src_raw]
                fr_c, _, _, _, _ = build_tracks_and_counts(comps_c, cross_positions, combo_args)
                _, summary_c = debounce_shots(fr_c, args.fps, args.marker_min, bounds[0], bounds[1])
                print(json.dumps({"combo": combo, "summary": summary_c}))
            return  # sweep output already streamed above, one line per combo — skip the normal print
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
