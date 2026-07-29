#!/usr/bin/env python3
"""SG pellet-marker counter wrapper.

Uses the UNIGEO marker-detection logic (scripts/unigeo/marker_detect2.py +
marker_track.py) and locates the aim disc via the proven ammo-box-template crosshair
track from read-pellets.ts/count-pellets.py (disc_centers_ammo), so it runs on any solo
SG recording. A HoughCircles finder (find_disc) remains as a fallback when no ammo
template is supplied.

Output:
  <out>/shots.json      per-shot landed/core counts + radial positions
  <out>/discs.json      per-frame disc centre/radius/confidence
  <out>/debug/          frames with disc + detected markers drawn
"""
import argparse
import glob
import json
import math
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import cv2
import numpy as np

# Make the UNIGEO marker scripts importable (tracked in scripts/unigeo/).
UNIGEO_DIR = Path(__file__).resolve().parent.parent / "unigeo"
sys.path.insert(0, str(UNIGEO_DIR))
import marker_detect2 as M  # noqa: E402


# ---------------------------------------------------------------------------
# HoughCircles fallback disc finder (disc_centers_ammo's ammo-box template track is
# the primary path; this is used only when no ammo template is supplied)
# ---------------------------------------------------------------------------

def _disc_score(gray, cx, cy, R):
    """Score a candidate disc (cx,cy,R).

    The aim disc is a translucent grey circle.  We expect:
      - the interior to be slightly darker / lower-contrast than the scene;
      - a visible edge gradient;
      - not too much high-frequency texture inside.
    """
    h, w = gray.shape
    cx, cy, R = int(round(cx)), int(round(cy)), int(round(R))
    if cx - R < 0 or cx + R >= w or cy - R < 0 or cy + R >= h:
        return -1e9

    Y, X = np.mgrid[0:h, 0:w]
    d = np.hypot(X - cx, Y - cy)
    inside = d <= R * 0.7
    ring = (d >= R * 0.85) & (d <= R * 1.15)
    outside = (d >= R * 1.3) & (d <= R * 1.6)

    if inside.sum() < 100 or outside.sum() < 100:
        return -1e9

    in_mean = float(gray[inside].mean())
    out_mean = float(gray[outside].mean())
    ring_mean = float(gray[ring].mean())
    ring_std = float(gray[ring].std())

    # The disc edge should be darker than the outside (grey ring).
    edge_score = (out_mean - ring_mean) / 50.0
    # Interior should be similar to outside or slightly darker, not wildly different.
    interior_score = 1.0 - abs(in_mean - out_mean) / 80.0
    # Ring should have relatively uniform intensity (the disc rim).
    rim_uniformity = 1.0 - min(ring_std / 40.0, 1.0)

    return edge_score + interior_score + rim_uniformity


def find_disc(img_bgr, prev=None, hr=0.0):
    """Return (cx, cy, R) for the aim disc, or None.

    prev: optional (cx, cy, R) from previous frame for temporal smoothing.
    hr:   known hit-rate percent (0.0 for the solo HR=0 recordings).
    """
    h, w = img_bgr.shape[:2]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    gray_blur = cv2.medianBlur(gray, 5)

    # Expected radius in the native damage-area crop.
    # UNIGEO R0 = 81 px at HR=0 in the full-frame / drawn-geometry coordinate system.
    # The damage-area crop is in the same coordinate system, so R at HR is:
    #   R = 81 * (1 - hr/100)
    R_exp = 81.0 * max(0.0, 1.0 - hr / 100.0)
    r_min = max(20, int(R_exp * 0.6))
    r_max = min(min(h, w) // 2 - 5, int(R_exp * 1.4))
    if r_min >= r_max:
        return None

    # The crosshair/disc sits on the boss, which is in the right half of the damage-area crop.
    # Prior is roughly the right-centre of the crop.
    centre_prior = (w * 0.72, h * 0.48)

    circles = cv2.HoughCircles(
        gray_blur,
        cv2.HOUGH_GRADIENT,
        dp=1,
        minDist=max(60, int(R_exp * 0.7)),
        param1=80,
        param2=18,
        minRadius=r_min,
        maxRadius=r_max,
    )

    if circles is None or circles.size == 0:
        return prev

    best = None
    best_score = -1e9
    for c in circles[0]:
        cx, cy, R = c
        # Stay away from the very edges of the damage crop and from the left-background area.
        if cx < w * 0.45 or cx > w - R or cy < h * 0.2 or cy > h * 0.85:
            continue
        score = _disc_score(gray, cx, cy, R)
        if score is None or score < -1e8:
            continue
        # Favour expected radius and centre proximity.
        score -= 0.5 * abs(R - R_exp) / R_exp
        score -= 0.3 * math.hypot(cx - centre_prior[0], cy - centre_prior[1]) / max(w, h)
        if prev is not None:
            score -= 0.4 * math.hypot(cx - prev[0], cy - prev[1]) / max(w, h)
            score -= 0.2 * abs(R - prev[2]) / max(prev[2], 1)
        if score > best_score:
            best_score = score
            best = (float(cx), float(cy), float(R))

    return best


def match_ammo_in_roi(frame_bgr, tmpl, roi_x0, roi_y0):
    """cv2.matchTemplate restricted to a bottom-right ROI (replicates count-pellets.py).

    Returns (conf, loc) where loc is the template top-left corner in full-frame coords.
    """
    h, w = frame_bgr.shape[:2]
    x0 = int(w * roi_x0) if roi_x0 >= 0 else 0
    y0 = int(h * roi_y0) if roi_y0 >= 0 else 0
    roi = frame_bgr[y0:h, x0:w]
    if roi.shape[0] < tmpl.shape[0] or roi.shape[1] < tmpl.shape[1]:
        return 0.0, (0, 0)
    res = cv2.matchTemplate(roi, tmpl, cv2.TM_CCOEFF_NORMED)
    _, conf, _, loc = cv2.minMaxLoc(res)
    return float(conf), (int(loc[0] + x0), int(loc[1] + y0))


def disc_centers_ammo(files, tmpl, zoom, offx_native, offy_native, roi, hr, max_disp):
    """Per-frame disc centre from the ammo-box template track — the PROVEN crosshair
    locator from count-pellets.py / read-pellets.ts (template match + calibrated offset
    + frame-to-frame displacement gate). The crosshair IS the aim-disc centre, so this
    replaces the unreliable HoughCircles find_disc. The disc radius is the drawn-geometry
    calibration (R0 = 85.7 px native at HR=0) scaled by zoom and hit-rate.

    Returns {frame_index: (cx, cy, R, conf)}.
    """
    th, tw = tmpl.shape[:2]
    offx, offy = offx_native * zoom, offy_native * zoom
    R = 85.7 * zoom * max(0.0, 1.0 - hr / 100.0)
    roi_x0, roi_y0 = roi
    centres = {}
    last = None  # last accepted ammo-box top-left loc (for the displacement gate)
    for i, f in enumerate(files):
        im = cv2.imread(str(f))
        if im is None:
            continue
        conf, loc = match_ammo_in_roi(im, tmpl, roi_x0, roi_y0)
        if conf < 0.3:
            continue  # no usable lock; interp_centres fills the gap
        # Positional-consistency gate: the ammo box moves smoothly, so a match that jumps
        # more than max_disp (zoomed px) from the last accepted lock is a false lock
        # (e.g. the HP bar) — decline it rather than guess.
        if last is not None and max_disp > 0 and math.hypot(loc[0] - last[0], loc[1] - last[1]) > max_disp:
            continue
        last = loc
        cx = loc[0] + tw // 2 + offx
        cy = loc[1] + th // 2 + offy
        centres[i] = (float(cx), float(cy), float(R), float(conf))
    return centres


# ---------------------------------------------------------------------------
# Frame extraction + tracking + shot clustering
# ---------------------------------------------------------------------------

def extract_frames(video, at, dur, out_dir, crop="1303:396:672:268", fps=60):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    args = ["ffmpeg", "-y", "-loglevel", "error", "-ss", str(at), "-t", str(dur),
            "-i", str(video), "-vf", f"fps={fps},{crop}", str(out_dir / "f_%05d.png")]
    subprocess.run(args, check=True)
    return sorted(out_dir.glob("f_*.png"))


def disc_centers(files, hr=0.0):
    """Return {frame_index: (cx, cy, R, conf)} using find_disc + temporal prior."""
    centres = {}
    prev = None
    for i, f in enumerate(files):
        im = cv2.imread(str(f))
        if im is None:
            continue
        d = find_disc(im, prev=prev, hr=hr)
        if d is not None:
            conf = 1.0
            # Lower confidence if we fell back to prev (no new detection).
            if prev is not None and math.hypot(d[0] - prev[0], d[1] - prev[1]) < 0.5 and abs(d[2] - prev[2]) < 0.5:
                conf = 0.5
            centres[i] = (float(d[0]), float(d[1]), float(d[2]), float(conf))
            prev = d
    return centres


def interp_centres(cmap, n):
    """Linear interpolation across missing frames (clamped at ends)."""
    ks = sorted(cmap)
    out = {}
    for i in range(n):
        if i in cmap:
            out[i] = cmap[i]
            continue
        lo = max((k for k in ks if k < i), default=None)
        hi = min((k for k in ks if k > i), default=None)
        if lo is None or hi is None:
            src = lo if lo is not None else hi
            if src is None:
                continue
            out[i] = cmap[src]
            continue
        t = (i - lo) / (hi - lo)
        a, b = cmap[lo], cmap[hi]
        out[i] = (
            a[0] + t * (b[0] - a[0]),
            a[1] + t * (b[1] - a[1]),
            a[2] + t * (b[2] - a[2]),
            min(a[3], b[3]),
        )
    return out


def run(files, t0_video, fps=60.0, hr=0.0, zone_factor=1.6, spawn_margin=10.0, debug_dir=None,
        tmpl=None, zoom=2, offx=62.5, offy=-5.5, roi=(0.55, 0.50), max_disp=150.0):
    if tmpl is not None:
        raw = disc_centers_ammo(files, tmpl, zoom, offx, offy, roi, hr, max_disp)
    else:
        raw = disc_centers(files, hr=hr)
    cmap = interp_centres(raw, len(files))
    tracks = []
    for i, f in enumerate(files):
        if i not in cmap:
            continue
        cx, cy, R, _ = cmap[i]
        im = cv2.imread(str(f))
        if im is None:
            continue
        zone = int(R * zone_factor)
        det = M.detect(im, cx, cy, zone=zone)
        # de-dup tighter than physical marker spacing
        ded = []
        for m in sorted(det, key=lambda t: 0 if t[2] == "red" else 1):
            if all(math.hypot(m[0] - o[0], m[1] - o[1]) >= 8 for o in ded):
                ded.append(m)

        for x, y, kind, s in ded:
            best = None
            for tr in tracks:
                if i - tr["last_seen"] <= 12 and math.hypot(x - tr["x0"], y - tr["y0"]) < 5:
                    if best is None or math.hypot(x - tr["x0"], y - tr["y0"]) < math.hypot(x - best["x0"], y - best["y0"]):
                        best = tr
            if best is not None:
                best["x"] = x
                best["y"] = y
                best["last_seen"] = i
                best["seen"] += 1
                if kind == "red":
                    best["red_votes"] += 1
                continue
            r_spawn = float(math.hypot(x - cx, y - cy))
            if r_spawn <= R + spawn_margin:
                tracks.append({
                    "x": x, "y": y, "x0": x, "y0": y,
                    "kind": kind, "spawn_frame": i,
                    "spawn_r": r_spawn, "last_seen": i, "seen": 1,
                    "red_votes": 1 if kind == "red" else 0,
                })

        if debug_dir is not None and i % 6 == 0:
            _debug_frame(im, cx, cy, R, ded, debug_dir / f"{i:05d}.png")

    # retro-merge fragments
    tracks.sort(key=lambda t: t["spawn_frame"])
    merged = []
    for t in tracks:
        host = None
        for m in merged:
            if t["spawn_frame"] - m["last_seen"] <= 25 and math.hypot(t["x0"] - m["x0"], t["y0"] - m["y0"]) < 6:
                host = m
                break
        if host is not None:
            host["last_seen"] = max(host["last_seen"], t["last_seen"])
            host["seen"] += t["seen"]
            host["red_votes"] += t["red_votes"]
        else:
            merged.append(t)

    merged = [t for t in merged if t["seen"] >= 3]
    for t in merged:
        t["kind"] = "red" if t["red_votes"] >= max(1, t["seen"] // 3) else "white"

    # cluster spawns into shots (gap > 0.35 s starts a new shot)
    shots = []
    for t in merged:
        if shots and (t["spawn_frame"] - shots[-1]["frames"][0]) <= int(0.35 * fps):
            s = shots[-1]
        else:
            shots.append({"frames": [], "markers": []})
            s = shots[-1]
        s["frames"].append(t["spawn_frame"])
        s["markers"].append(t)

    out = []
    for s in shots:
        n_w = sum(1 for t in s["markers"] if t["kind"] == "white")
        n_r = sum(1 for t in s["markers"] if t["kind"] == "red")
        out.append({
            "t_video": round(t0_video + s["frames"][0] / fps, 3),
            "landed": n_w + n_r,
            "cores": n_r,
            "radii_white": sorted(round(t["spawn_r"], 1) for t in s["markers"] if t["kind"] == "white"),
            "radii_red": sorted(round(t["spawn_r"], 1) for t in s["markers"] if t["kind"] == "red"),
        })
    return out, cmap


def _debug_frame(im, cx, cy, R, markers, out_path):
    out = im.copy()
    cv2.circle(out, (int(cx), int(cy)), int(R), (255, 255, 0), 2)
    cv2.circle(out, (int(cx), int(cy)), 3, (0, 0, 255), -1)
    for x, y, kind, _ in markers:
        col = (0, 0, 255) if kind == "red" else (0, 255, 0)
        cv2.circle(out, (int(x), int(y)), 6, col, 2)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out_path), out)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="SG pellet-marker counter (UNIGEO marker pipeline)")
    parser.add_argument("video", help="input video path")
    parser.add_argument("--at", type=float, default=0, help="start time in seconds")
    parser.add_argument("--dur", type=float, default=0, help="duration in seconds (0 = rest of video)")
    parser.add_argument("--fps", type=int, default=60, help="frame extraction rate")
    parser.add_argument("--hr", type=float, default=0.0, help="known hit-rate percent (0 for solo HR=0)")
    parser.add_argument("--crop", default="crop=1303:396:672:268", help="ffmpeg crop filter")
    parser.add_argument("--zoom", type=int, default=2,
                        help="damage-area crop upscale (default 2; matches the 74px ammo-box template)")
    parser.add_argument("--ammo-template", default=str(Path(__file__).resolve().parent / "ammo-box-template.png"),
                        help="ammo-box template for crosshair localization (default: scripts/probe/ammo-box-template.png; "
                             "pass empty string to fall back to the HoughCircles find_disc)")
    parser.add_argument("--ammo-offset-x", type=float, default=62.5,
                        help="crosshair X offset from ammo-box centre, native px (default 62.5)")
    parser.add_argument("--ammo-offset-y", type=float, default=-5.5,
                        help="crosshair Y offset from ammo-box centre, native px (default -5.5)")
    parser.add_argument("--ammo-roi-x0", type=float, default=0.55,
                        help="restrict ammo template matching to x >= roi-x0 * width (default 0.55)")
    parser.add_argument("--ammo-roi-y0", type=float, default=0.50,
                        help="restrict ammo template matching to y >= roi-y0 * height (default 0.50)")
    parser.add_argument("--max-template-disp", type=float, default=150.0,
                        help="max frame-to-frame ammo-box displacement (zoomed px) before rejecting a false lock")
    parser.add_argument("--out", required=True, help="output directory")
    parser.add_argument("--debug", action="store_true", help="write debug frames")
    args = parser.parse_args()

    tmpl = None
    if args.ammo_template:
        tmpl = cv2.imread(args.ammo_template)
        if tmpl is None:
            print(f"warning: could not load ammo template {args.ammo_template}; "
                  f"falling back to HoughCircles find_disc", file=sys.stderr)

    out_dir = Path(args.out)
    frames_dir = out_dir / "frames"
    debug_dir = out_dir / "debug" if args.debug else None

    print(f"extracting frames @ {args.fps}fps (zoom {args.zoom}) ...")
    dur = args.dur if args.dur > 0 else None
    ffmpeg_dur = ["-t", str(args.dur)] if args.dur > 0 else []
    vf = f"fps={args.fps},{args.crop}" + (f",scale=iw*{args.zoom}:ih*{args.zoom}" if args.zoom != 1 else "")
    frames_dir.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-ss", str(args.at)]
        + ffmpeg_dur
        + ["-i", args.video, "-vf", vf, str(frames_dir / "f_%05d.png")],
        check=True,
    )
    files = sorted(frames_dir.glob("f_*.png"))
    if not files:
        sys.exit("no frames extracted")
    print(f"  {len(files)} frames -> {frames_dir}")

    print("running marker counter ...")
    shots, cmap = run(files, args.at, fps=args.fps, hr=args.hr, debug_dir=debug_dir,
                      tmpl=tmpl, zoom=args.zoom, offx=args.ammo_offset_x, offy=args.ammo_offset_y,
                      roi=(args.ammo_roi_x0, args.ammo_roi_y0), max_disp=args.max_template_disp)

    shots_path = out_dir / "shots.json"
    shots_path.write_text(json.dumps({
        "video": args.video,
        "at": args.at,
        "dur": args.dur,
        "hr": args.hr,
        "fps": args.fps,
        "shots": shots,
        "summary": {
            "totalShots": len(shots),
            "avgLanded": round(sum(s["landed"] for s in shots) / len(shots), 2) if shots else 0,
            "avgCores": round(sum(s["cores"] for s in shots) / len(shots), 2) if shots else 0,
        },
    }, indent=2) + "\n")
    print(f"wrote {shots_path}")

    discs_path = out_dir / "discs.json"
    discs_path.write_text(json.dumps({
        "video": args.video,
        "at": args.at,
        "fps": args.fps,
        "discs": {str(i): {"cx": c[0], "cy": c[1], "R": c[2], "conf": c[3]} for i, c in cmap.items()},
    }, indent=2) + "\n")
    print(f"wrote {discs_path}")

    if debug_dir:
        print(f"debug frames -> {debug_dir}")


if __name__ == "__main__":
    main()
