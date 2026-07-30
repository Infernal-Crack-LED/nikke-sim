#!/usr/bin/env python3
"""Pellet-reader diagnostics: lifetime histogram + an INDEPENDENT detector comparison.

Two modes, both operating on artifacts a normal `read-pellets.ts` run already produces
(`--dump-tracks` JSON + the extracted frame PNGs). Neither re-runs the pipeline.

  --tracks <tracks.json>            lifetime histogram, area-profile, peak-position stats
  --tracks <t.json> --frames <dir>  ALSO: per-frame threshold-vs-LoG counts across a window

Why the LoG comparison exists
-----------------------------
The shipped detector (`count-pellets.py`) finds pellets by ABSOLUTE brightness
(`R,G,B >= 210`) + connected components + circularity. The pellet lifecycle (owner spec,
2026-07-30, 60fps source) is: f1 small w/ shadowed surround -> f3-4 peak (2x, pellets OCCLUDE
each other) -> f5-11 shrink back to 1x -> f12-13 fade -> gone. The readable frames are f1 and
f8-11; the peak is the LEAST readable.

A brightness threshold calibrated for the bright 2x peak cannot see the small dim phases. This
mode measures that directly by running a scale-normalised Laplacian-of-Gaussian (a CENTER-SURROUND
matched filter -- the response shape a bright core on a dark halo actually has) over the same
frames and comparing per-frame counts. LoG keys on local contrast and blob size, not absolute
level, so it should hold detections across the frames the threshold drops.

This is an INDEPENDENT method: it shares no thresholds, no morphology and no tracker with the
shipped detector. Statistics from tracks.json and pixels from the PNGs are separate evidence.
"""
import argparse
import collections
import json
import math
import statistics as st

import cv2
import numpy as np
from scipy import ndimage

# ---------------------------------------------------------------- tracks.json


def near_crosshair(t, cross_positions, radius):
    f = t["first"]
    c = cross_positions[f] if f < len(cross_positions) and cross_positions[f] else None
    if not c:
        return False
    return math.hypot(t["xs"][0] - c[0], t["ys"][0] - c[1]) <= radius


# A dump whose ammo-box template mislocked reports a crosshair that is nowhere near the pellet
# cluster. Every downstream statistic then silently computes over ~nothing and LOOKS merely
# underpowered rather than invalid -- which is exactly how `noir-near-ce36` was first read as a
# small-sample result on 2026-07-30.
#
# Reference numbers (2026-07-30), `marciana` = the SG/Iron slug (marciana-solo.MP4), NOT
# marciana-marine-study:
#   healthy  marciana/run16 : 14.3% of white tracks inside pellet_radius, median offset (-50,-180),
#                             crosshair x sweeps 341..2692 (it tracks the moving aim point)
#   BROKEN   noir-near-ce36 :  1.3% inside, median offset (-1027,-125), crosshair x pinned to
#                             2514..2601 -- an 87px band at the right edge of the 2606px crop,
#                             stuck for all 600 frames while the pellets sit ~1000px to the left.
#
# NOTE: template-match CONFIDENCE does not catch this (noir 0.430 vs marciana 0.502, 0% below 0.30).
# That is the documented failure mode -- the template locks onto the HP bar/other furniture while
# confidence stays in its normal 0.33-0.51 band. Do not use confidence as the validity check.
CROSSHAIR_MIN_NEAR_FRAC = 0.05  # below this, treat the dump's crosshair track as BROKEN


def check_crosshair_validity(data):
    """Return (ok, near_frac, median_dx, median_dy). Guards against mislocked-template dumps."""
    p, tracks, cross = data["params"], data["tracks"], data["cross_positions"]
    radius = p.get("pellet_radius", 160)
    dxs, dys, near = [], [], 0
    for t in tracks:
        if t["is_red"]:
            continue
        c = cross[t["first"]] if t["first"] < len(cross) and cross[t["first"]] else None
        if not c:
            continue
        dx, dy = t["xs"][0] - c[0], t["ys"][0] - c[1]
        dxs.append(dx)
        dys.append(dy)
        if math.hypot(dx, dy) <= radius:
            near += 1
    if not dxs:
        return False, 0.0, 0.0, 0.0
    frac = near / len(dxs)
    return frac >= CROSSHAIR_MIN_NEAR_FRAC, frac, st.median(dxs), st.median(dys)


def report_tracks(data):
    p, tracks, cross = data["params"], data["tracks"], data["cross_positions"]
    radius = p.get("pellet_radius", 160)

    ok, frac, mdx, mdy = check_crosshair_validity(data)
    if not ok:
        print("=" * 78)
        print("!! CROSSHAIR TRACK LOOKS BROKEN — DO NOT READ THE STATISTICS BELOW AS A RESULT !!")
        print("=" * 78)
        print(f"  only {frac:.1%} of white tracks fall within pellet_radius({radius}) of the")
        print(f"  reported crosshair (healthy reference: marciana/run16 = 14.3%).")
        print(f"  median offset of white tracks from the crosshair: dx={mdx:+.0f} dy={mdy:+.0f}")
        print("  => the ammo-box template almost certainly mislocked; the pellet cluster is not")
        print("     where this dump says the crosshair is. Everything below is computed over")
        print("     near-nothing and will LOOK underpowered rather than invalid.")
        print("  => This dump cannot answer a lifecycle/decay question. Get a dump whose")
        print("     crosshair track is sound (see the plan's Phase 2A) instead of re-reading it.")
        print("=" * 78 + "\n")

    cand = [t for t in tracks if not t["is_red"] and near_crosshair(t, cross, radius)]
    print(f"white tracks within pellet_radius({radius}) of crosshair: {len(cand)}"
          f"   [crosshair-validity: {frac:.1%} near — {'OK' if ok else 'BROKEN'}]")

    # A fully-detected pellet spans 13 game frames at 60fps => 6-7 samples at 30fps.
    hist = collections.Counter(t["life"] for t in cand)
    total = sum(hist.values()) or 1
    print("\nLIFETIME HISTOGRAM (full pellet at 30fps sampling = 6-7):")
    for life in sorted(hist):
        bar = "#" * int(60 * hist[life] / total)
        print(f"  life {life:3d}: {hist[life]:5d}  {100 * hist[life] / total:5.1f}%  {bar}")

    longs = [t for t in cand if t["life"] >= 5]
    if longs:
        argmax = collections.Counter(t["areas"].index(max(t["areas"])) for t in longs)
        print(f"\nPOSITION OF MAX AREA within a track (life>=5, n={len(longs)}):")
        print("  (a track that ACQUIRES AT PEAK and only decays peaks at sample 1)")
        for i in sorted(argmax)[:6]:
            print(f"    sample {i + 1}: {argmax[i]:4d}  ({100 * argmax[i] / len(longs):4.1f}%)")

        prof = collections.defaultdict(list)
        for t in longs:
            m = max(t["areas"]) or 1
            for i, a in enumerate(t["areas"]):
                prof[i].append(a / m)
        print("\n  normalised area profile (mean rel-size per sample):")
        print(
            "   ",
            " -> ".join(f"{st.mean(prof[i]):.2f}" for i in sorted(prof) if len(prof[i]) >= 20),
        )
        peaks = [max(t["areas"]) for t in longs]
        troughs = [min(t["areas"]) for t in longs]
        print(f"\n  peak area median   : {st.median(peaks):7.1f} px^2")
        print(f"  trough area median : {st.median(troughs):7.1f} px^2")
        print(f"  dynamic range      : {st.median(peaks) / max(1, st.median(troughs)):7.1f}x")

    ones = [t for t in cand if t["life"] == 1]
    if ones:
        print(f"\n  life=1 median area : {st.median([t['mean_area'] for t in ones]):7.1f} px^2")
        # Real pellets are STATIC. If life=1 tracks were one pellet shattered by the tracker's
        # zero gap tolerance, they would cluster in space across adjacent frames. Test it.
        by_frame = collections.defaultdict(list)
        for t in ones:
            by_frame[t["first"]].append((t["xs"][0], t["ys"][0]))
        clustered = 0
        for f, pts in by_frame.items():
            for x, y in pts:
                if any(
                    math.hypot(x - a, y - b) < 30
                    for g in (f - 2, f - 1, f + 1, f + 2)
                    for a, b in by_frame.get(g, [])
                ):
                    clustered += 1
        pct = 100 * clustered / len(ones)
        print(f"  life=1 with a static neighbour within +/-2 frames: {clustered}/{len(ones)} = {pct:.0f}%")
        print("    (high => tracker fragmentation; low => genuinely isolated blips)")


# ------------------------------------------------------------ detectors


def count_threshold(rgb, cx, cy, radius, center_exclude, min_area=25, max_area=750, min_circ=0.55):
    """Replicates the SHIPPED detector: absolute RGB threshold + CC + circularity + no-holes."""
    mask = np.all(rgb >= 210, axis=2).astype(np.uint8) * 255
    n, labels, stats, cents = cv2.connectedComponentsWithStats(mask, connectivity=8)
    hits = 0
    for i in range(1, n):
        area = stats[i, cv2.CC_STAT_AREA]
        if area < min_area or area > max_area:
            continue
        mx, my = cents[i]
        d = math.hypot(mx - cx, my - cy)
        if d > radius or d < center_exclude:
            continue
        comp = (labels == i).astype(np.uint8) * 255
        contours, hier = cv2.findContours(comp, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            continue
        perim = cv2.arcLength(contours[0], True)
        circ = 4 * math.pi * area / (perim * perim) if perim else 0
        if circ < min_circ:
            continue
        if any(h[2] != -1 for h in hier[0] if h[3] == -1):
            continue
        hits += 1
    return hits


def count_log(rgb, cx, cy, radius, center_exclude, sigmas=(3.0, 4.5, 6.0, 8.0), thresh=6.0):
    """INDEPENDENT method: scale-normalised Laplacian-of-Gaussian + local maxima + NMS.

    Keys on local CONTRAST and blob SIZE, not absolute brightness, so it is not calibrated to
    the bright 2x peak the way the shipped threshold is. sigma range spans the pellet's 1x..2x
    radii. No shared thresholds, morphology or tracker with count_threshold().
    """
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(np.float32)
    # scale-normalised LoG: bright blob on darker surround => positive peak in -sigma^2 * LoG
    resp = np.max(
        [-(s**2) * ndimage.gaussian_laplace(gray, sigma=s) for s in sigmas],
        axis=0,
    )
    peak = ndimage.maximum_filter(resp, size=5)
    ys, xs = np.nonzero((resp == peak) & (resp > thresh))
    pts = sorted(zip(resp[ys, xs], xs, ys), reverse=True)
    kept = []
    for _v, x, y in pts:
        d = math.hypot(x - cx, y - cy)
        if d > radius or d < center_exclude:
            continue
        if any(math.hypot(x - kx, y - ky) < 12 for kx, ky in kept):  # NMS
            continue
        kept.append((x, y))
    return len(kept)


def compare_frames(data, frames_dir, start, count):
    p, cross = data["params"], data["cross_positions"]
    files = data["frame_files"]
    radius = p.get("pellet_radius", 160)
    cexc = p.get("center_exclude", 36)
    print(f"\nPER-FRAME DETECTOR COMPARISON (frames {start}..{start + count - 1})")
    print("  blasts are ~20 frames apart at 30fps (1.5 shots/s).")
    print(f"  {'frame':>6}  {'thresh':>6}  {'LoG':>4}   profile")
    for i in range(start, min(start + count, len(files))):
        c = cross[i] if i < len(cross) and cross[i] else None
        if not c:
            continue
        path = f"{frames_dir}/{files[i]}"
        bgr = cv2.imread(path)
        if bgr is None:
            continue
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        t = count_threshold(rgb, c[0], c[1], radius, cexc)
        g = count_log(rgb, c[0], c[1], radius, cexc)
        print(f"  {i:6d}  {t:6d}  {g:4d}   {'T' * t:<12}|{'L' * g}")


FIXTURE = "scripts/tests/fixtures/pellets/run16-tracks-slice.json"

# Pinned from the committed fixture (a 400-frame slice of the run16 dump). These reproduce the
# full-run figures cited in docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md
# (life=1 58.8%, max-at-first 73.5%) to within slice noise -- the slice is representative.
SELFTEST_EXPECT = {"near_crosshair": 303, "life1_pct": 56.8, "argmax_first_pct": 77.4}


def selftest():
    """Self-validate against the committed fixture, so this instrument's cited numbers stay
    reproducible from a clean checkout (CLAUDE.md constraint 9)."""
    with open(FIXTURE) as fh:
        data = json.load(fh)
    p, cross = data["params"], data["cross_positions"]
    radius = p.get("pellet_radius", 160)
    cand = [t for t in data["tracks"] if not t["is_red"] and near_crosshair(t, cross, radius)]
    longs = [t for t in cand if t["life"] >= 5]
    got = {
        "near_crosshair": len(cand),
        "life1_pct": round(100 * sum(1 for t in cand if t["life"] == 1) / len(cand), 1),
        "argmax_first_pct": round(
            100 * sum(1 for t in longs if t["areas"].index(max(t["areas"])) == 0) / len(longs), 1
        ),
    }
    ok = got == SELFTEST_EXPECT
    print(f"expected: {SELFTEST_EXPECT}")
    print(f"got     : {got}")
    print("SELFTEST PASS" if ok else "SELFTEST FAIL")
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--tracks", help="tracks.json from count-pellets.py --dump-tracks")
    ap.add_argument("--frames", help="directory of extracted pellet frames (enables detector comparison)")
    ap.add_argument("--start", type=int, default=0, help="first frame index for --frames comparison")
    ap.add_argument("--count", type=int, default=60, help="frames to compare (default 60 = ~3 blasts)")
    ap.add_argument("--selftest", action="store_true", help=f"validate against {FIXTURE} and exit")
    args = ap.parse_args()

    if args.selftest:
        raise SystemExit(selftest())
    if not args.tracks:
        ap.error("--tracks is required (or use --selftest)")

    with open(args.tracks) as fh:
        data = json.load(fh)
    report_tracks(data)
    if args.frames:
        compare_frames(data, args.frames, args.start, args.count)


if __name__ == "__main__":
    main()
