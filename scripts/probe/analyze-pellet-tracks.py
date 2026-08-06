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
import importlib.util
import inspect
import json
import math
import os
import random
import statistics as st
import subprocess
import tempfile
from pathlib import Path
from types import SimpleNamespace

import cv2
import numpy as np
from scipy import ndimage

HERE = Path(__file__).resolve().parent
_CP_MODULE = None
_SP_MODULE = None


def _count_pellets_module():
    """Import count-pellets.py IN-PROCESS so the shot definition is the shipped one.

    The event grouping (`debounce_shots`) is already flagged in count-pellets.py as needing to stay
    in lockstep with read-pellets.ts; a third copy of it here would be a second place to drift.
    The filename has a hyphen, so it cannot be a plain `import` -- hence importlib. Nothing at
    count-pellets.py module scope runs anything (its work is under `if __name__ == '__main__'`)."""
    global _CP_MODULE
    if _CP_MODULE is None:
        spec = importlib.util.spec_from_file_location("count_pellets", HERE / "count-pellets.py")
        _CP_MODULE = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(_CP_MODULE)
    return _CP_MODULE

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


def crosshair_wander(data):
    """Spread of the crosshair's x across the run — the DIRECT signature of a frozen lock.

    A healthy lock follows the moving aim point; a mislocked one sits still. Reference (2026-07-30),
    `marciana` = the SG/Iron slug (marciana-solo.MP4), NOT marciana-marine-study (AR/Iron):
    marciana/run16 sweeps x 341..2692 (range 2351) over a ~2606px-wide crop; the frozen
    noir-near-ce36 lock sat in an 87px band at the right edge for all 600 frames. Near-fraction
    catches this too, but only indirectly — range measures the freeze itself.
    """
    xs = [c[0] for c in data["cross_positions"] if c]
    return (max(xs) - min(xs)) if xs else 0.0


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

    wander = crosshair_wander(data)
    cand = [t for t in tracks if not t["is_red"] and near_crosshair(t, cross, radius)]
    print(f"white tracks within pellet_radius({radius}) of crosshair: {len(cand)}"
          f"   [crosshair-validity: {frac:.1%} near — {'OK' if ok else 'BROKEN'}"
          f" | lock wander: {wander:.0f}px {'(FROZEN?)' if wander < 300 else ''}]")

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


def report_raw_tracks(data, n, min_life):
    """Print RAW per-frame area sequences for the N longest-lived near-crosshair white tracks.

    Added 2026-07-31 (pellet-reader Phase 2 gate, ITEM 2 -- premise check: has the owner's
    then-13-frame lifecycle (f1 1x dot -> f3-4 plateau -> f5-11 monotone decay -> f12-13 fade)
    -- OWNER-CORRECTED to 14 frames on 2026-08-05 (docs/probe-runs.md §29; same shape, one extra
    FADE frame, so f12-14) -- ever
    been observed at NATIVE 60fps, not just in the 30fps `report_tracks()` aggregate profile
    above (which resamples to 11 "sample positions", not raw frame offsets, and is dominated by
    the "acquires at its own peak" tracks the same way run16 was)? This prints individual tracks
    unresampled so the shape can be read directly off the numbers frame-by-frame.
    """
    p, cross = data["params"], data["cross_positions"]
    radius = p.get("pellet_radius", 160)
    cand = [t for t in data["tracks"] if not t["is_red"] and near_crosshair(t, cross, radius) and t["life"] >= min_life]
    cand.sort(key=lambda t: -t["life"])
    print(f"\nRAW TRACK AREA SEQUENCES (top {n} of {len(cand)} tracks with life >= {min_life}, near crosshair):")
    for t in cand[:n]:
        areas = t["areas"]
        seq = "  ".join(f"f{i + 1}={a}" for i, a in enumerate(areas))
        peak_i = areas.index(max(areas))
        print(f"  id={t['id']:5d} life={t['life']:3d} first_frame={t['first']:5d} peak_at_offset={peak_i + 1}")
        print(f"    {seq}")


def report_dup_check(frames_dir, files, start, count):
    """Detect duplicated/blended consecutive frames in a 60fps extraction.

    Added 2026-07-31 (pellet-reader Phase 2 gate, ITEM 2). If the GAME renders pellet VFX at
    30fps internally and this is a 60fps CAPTURE, every pair of consecutive extracted frames
    would be near-pixel-identical (duplicated) rather than each frame being a genuinely new
    render -- which would mean the (then-13-frame; 14 since 2026-08-05) lifecycle observed at 60fps is really
    13 duplicated HALF-frames (6.5 real updates), not 13 independent samples, and phase indexing
    (f1, f3-4, f8-11, f12-13) would be wrong by a factor of ~2. Mean absolute pixel difference
    between frame i and i+1, cropped to the pellet ROI (crosshair-radius disc) where motion is
    concentrated, cheaply distinguishes "new render every frame" (diffs vary frame to frame,
    near-zero only when nothing is moving) from "every other frame is a duplicate" (every OTHER
    diff drops to ~0, a strict alternating pattern).
    """
    print(f"\nDUPLICATE-FRAME CHECK (frames {start}..{start + count - 1}, consecutive-pair mean |diff|):")
    diffs = []
    for i in range(start, min(start + count - 1, len(files) - 1)):
        a = cv2.imread(f"{frames_dir}/{files[i]}")
        b = cv2.imread(f"{frames_dir}/{files[i + 1]}")
        if a is None or b is None:
            continue
        d = float(np.mean(np.abs(a.astype(np.int16) - b.astype(np.int16))))
        diffs.append(d)
    if not diffs:
        print("  (no frame pairs read)")
        return
    near_zero = sum(1 for d in diffs if d < 0.5)
    even_mean = st.mean(diffs[0::2]) if len(diffs) > 1 else 0.0
    odd_mean = st.mean(diffs[1::2]) if len(diffs) > 1 else 0.0
    print(f"  n_pairs={len(diffs)}  mean={st.mean(diffs):.3f}  median={st.median(diffs):.3f}"
          f"  min={min(diffs):.3f}  max={max(diffs):.3f}")
    print(f"  near-zero pairs (<0.5 mean abs diff, i.e. i and i+1 are ~identical): {near_zero}/{len(diffs)}"
          f" = {100 * near_zero / len(diffs):.1f}%")
    print(f"  even-index-pair mean diff: {even_mean:.3f}   odd-index-pair mean diff: {odd_mean:.3f}"
          f"   (a 30fps-internal/60fps-capture source would show one of these near-zero and the"
          f" other ~2x a genuine 60fps source's per-pair diff -- an alternating pattern, not just"
          f" a low overall near-zero rate)")


# Boss range-band schedule (owner-recorded, docs/data/range-data.md) as elapsed fight-seconds.
# Sourced, not re-derived here -- used only to LABEL which band a blast's onset-spread measurement
# falls in for reporting; it does not feed back into any band-distance or damage value.
RANGE_BAND_SCHEDULE = [
    (0, 33, "mid(start)"),
    (33, 70, "near"),
    (70, 106, "far"),
    (106, 144, "midfar"),
    (144, 176, "near"),
    (176, 1e9, "midfar"),
]


def band_for_fight_t(t):
    for lo, hi, band in RANGE_BAND_SCHEDULE:
        if lo <= t < hi:
            return band
    return "?"


def report_onset_spread(data, pellets_path, at, fps, window, min_life=1):
    """For each debounced shot in a pellets.json sibling run, gather every near-crosshair WHITE
    track whose first frame falls within +/-`window` frames of the shot's frame index, and report
    the spread (max-min) of those first-frames -- i.e. do the ~10 pellets of one blast share a
    single onset frame (t0), or is there real spread (e.g. projectile-flight-time lag)?

    Added 2026-07-31 (pellet-reader Phase 2 gate, ITEM 3 -- premise check: does shared-t0 hold, and
    does it hold BY BAND? kimi-k3 preop revision #2 / fable preop revision (assumptionsFlagged #2)).
    Frame index is derived from the shot's own `videoT` against the extraction's `--at` offset --
    no independent frame-alignment assumption. Band label comes from RANGE_BAND_SCHEDULE (sourced
    from docs/data/range-data.md, the owner-recorded boss range script) applied to the shot's
    `fightT` -- reporting only, not a re-derivation of the schedule itself.
    """
    with open(pellets_path) as fh:
        pj = json.load(fh)
    shots = pj.get("shots", [])
    p, tracks, cross = data["params"], data["tracks"], data["cross_positions"]
    radius = p.get("pellet_radius", 160)
    whites = [t for t in tracks if not t["is_red"] and near_crosshair(t, cross, radius) and t["life"] >= min_life]
    print(f"\nONSET SPREAD BY SHOT (window +/-{window}f, min_life>={min_life}, {len(shots)} debounced shots, fps={fps}):")
    print(f"  {'fightT':>7}  {'band':>12}  {'n':>3}  {'first-min':>9}  {'first-max':>9}  {'spread(f)':>9}  {'spread(ms)':>10}")
    rows = []
    for s in shots:
        video_t = s["videoT"]
        center_frame = round((video_t - at) * fps)
        lo, hi = center_frame - window, center_frame + window
        firsts = [t["first"] for t in whites if lo <= t["first"] <= hi]
        band = band_for_fight_t(s["fightT"])
        if not firsts:
            print(f"  {s['fightT']:7.2f}  {band:>12}  {0:3d}  {'--':>9}  {'--':>9}  {'--':>9}  {'--':>10}")
            continue
        spread_f = max(firsts) - min(firsts)
        rows.append((band, spread_f, len(firsts)))
        print(f"  {s['fightT']:7.2f}  {band:>12}  {len(firsts):3d}  {min(firsts):9d}  {max(firsts):9d}"
              f"  {spread_f:9d}  {1000 * spread_f / fps:10.1f}")
    by_band = collections.defaultdict(list)
    for band, spread_f, n in rows:
        by_band[band].append(spread_f)
    print("\n  PER-BAND SUMMARY (n = number of shots with >=1 detected white track in window):")
    for band, spreads in by_band.items():
        print(f"    {band:>12}: n={len(spreads)}  mean spread={st.mean(spreads):.1f}f"
              f"  ({1000 * st.mean(spreads) / fps:.1f}ms)  spreads={spreads}")


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


# ==================================================================== stale locks AT COUNTING FRAMES
# docs/probe-runs.md "2026-08-01 — stale-lock prevalence across the committed crosshair dumps"
# measured that 5.2-31.0% of ALL frames carry a HELD (stale) crosshair position, with a median
# 111-206px of real crosshair motion hidden behind the hold. It explicitly did NOT establish whether
# any of that reaches the COUNTS: the counter only reads t0+8..t0+11 of each DETECTED shot, a small
# and possibly non-representative subset. This section measures that subset directly.
#
# SINCE 2026-08-03 the dump can just SAY SO: count-pellets.py records a per-frame `cross_held`
# array straight from the locator's own branch, and stale_mask() below prefers it whenever it is
# present. Everything from here to the end of this comment describes the FALLBACK -- the rules that
# INFER the hold from its side effects, which is all a dump written before that field supports, and
# which every dump and fixture committed to date is scored by. The two are kept in one function so
# a mixed corpus stays comparable.
#
# The two hold mechanisms are DIFFERENT per localization mode and must not be tested with each
# other's rule (the prevalence entry's own "do not conflate the two confidence scales" note):
#
#   structural  count-pellets.py locate_crosshair_structural() returns `(last_acc, None)` when the
#               frame yields NO digit-row candidate at all -- the position is carried forward and
#               the confidence slot is set to None. So: STALE <=> conf is None AND a position exists.
#               (Re-acquisition on a failed continuity gate keeps a numeric score, so it is NOT
#               stale -- the lock moved, it just jumped.)
#   template    the positional-consistency gate's `elif last_acc is not None: accepted = last_acc`
#               branch carries the position forward while STILL recording the failing numeric
#               confidence, so `conf is None` never fires. But the accepted position is then no
#               longer derived from THIS frame's raw match: on an accepted frame
#               cross_positions[i] - cross_rawloc[i] is the fixed constant (tw//2 + ammo_offset),
#               and on a carry-forward it is not. So: STALE <=> that delta differs from the dump's
#               modal delta. Validated on run16/tracks.json, the reference healthy template dump:
#               0 of 1800 frames off-modal.
#   external    --crosshair-file supplied the positions (every conf is None AND every rawloc is
#               None -- the synthetic per-sequence dumps). Neither hold mechanism exists and the
#               dump is REFUSED rather than scored under a rule that cannot apply to it.
#
# Mode is inferred from the dump itself because --dump-tracks does not record `locate`: the
# structural confidence slot holds an UNNORMALISED surround brightness (observed 143-211 across
# every structural dump here) while the template slot holds a 0-1 normalised match score, so
# max(conf) > 1 separates them with no overlap. The report prints the discriminator, not just the
# verdict.
# THE COUNTING WINDOW IS DEFINED AT 60fps SAMPLING and is an OFFSET IN FRAMES, so it does not
# transfer to a dump extracted at another rate: the owner's pellet-lifecycle spec is 14 native
# frames at 60fps, and f8-11 is 133-183ms after onset. On a 30fps extraction the same INDEX offsets
# land 267-367ms after onset -- past the blast. Measured, and the reason --stale-counting-offsets
# exists: on the three 60fps dumps here the mean total at t0+8..t0+11 is 5.3-6.6 pellets (the window
# is on the cloud, as designed), while on the four 30fps full-video dumps it is 1.0-1.8; the
# rate-equivalent window there is t0+4..t0+6, where the mean total is 5.9-6.3 and matches. A dump's
# sampling rate is NOT recorded in --dump-tracks (its sibling pellets.json carries `fps`), so the
# window cannot be auto-corrected here -- it is passed in, and mismatching it is silent.
STALE_COUNTING_OFFSETS = (8, 9, 10, 11)   # the f8-11 counting window (owner lifecycle spec, 60fps)
STALE_MODE_CONF_SPLIT = 1.0               # max(conf) above this == structural's unnormalised score
STALE_COUNTING_FIXTURE = "scripts/tests/fixtures/pellets/stale-counting-slice.json"


def _pct(vals, p):
    """Linear-interpolation percentile (kept dependency-free, same form as score-pellets.py's)."""
    if not vals:
        return None
    s = sorted(vals)
    if len(s) == 1:
        return s[0]
    k = (len(s) - 1) * p / 100
    f, c = math.floor(k), math.ceil(k)
    return s[int(k)] if f == c else s[f] * (c - k) + s[c] * (k - f)


def detect_locate_mode(data):
    """('structural'|'template'|'external', evidence dict). See the section comment for the rule."""
    confs = data["cross_confs"]
    raw = data["cross_rawloc"]
    numeric = [c for c in confs if c is not None]
    ev = {
        "n_frames": len(confs),
        "n_conf_numeric": len(numeric),
        "max_conf": max(numeric) if numeric else None,
        "n_conf_none": sum(1 for c in confs if c is None),
        "n_rawloc_none": sum(1 for r in raw if r is None),
    }
    if not numeric:
        return "external", ev
    return ("structural" if ev["max_conf"] > STALE_MODE_CONF_SPLIT else "template"), ev


def stale_mask(data, mode):
    """Per-frame True where the crosshair position is a HELD carry-forward, not this frame's own
    measurement. Returns (mask, modal_delta_or_None).

    PREFERS THE DUMP'S OWN ANSWER. count-pellets.py records an explicit per-frame `cross_held`
    array (since 2026-08-03), which is the locator reporting the branch it actually took; the
    two per-mode rules above it are INFERENCES from a side effect of that branch (structural
    drops conf to None, template goes off-modal). When the field is there it is authoritative and
    the inference is skipped. When it is absent -- every dump and every committed fixture written
    before it -- the inferred rule runs exactly as before, so no existing scoring moves.

    The template mode's modal offset is still computed for reporting either way: `modal_delta` is
    a published field of the stale-counting report, not just an intermediate of the mask.
    """
    cross, confs, raw = data["cross_positions"], data["cross_confs"], data["cross_rawloc"]
    n = len(cross)
    modal = None
    if mode != "structural":
        deltas = collections.Counter()
        for c, r in zip(cross, raw):
            if c and r:
                deltas[(c[0] - r[0], c[1] - r[1])] += 1
        modal = list(deltas.most_common(1)[0][0]) if deltas else None
    held = data.get("cross_held")
    if held is not None and len(held) == n:
        return [bool(h) for h in held], modal
    if mode == "structural":
        return [confs[i] is None and cross[i] is not None for i in range(n)], None
    if modal is None:
        return [False] * n, None
    mx, my = modal
    mask = [bool(cross[i] and raw[i] and (cross[i][0] - raw[i][0], cross[i][1] - raw[i][1]) != (mx, my))
            for i in range(n)]
    return mask, modal


def stale_runs(mask):
    """Maximal [start, end] index ranges of consecutive stale frames."""
    out, i, n = [], 0, len(mask)
    while i < n:
        if mask[i]:
            j = i
            while j + 1 < n and mask[j + 1]:
                j += 1
            out.append((i, j))
            i = j + 1
        else:
            i += 1
    return out


def stale_displacements(cross, mask):
    """(run_disp, interp_err) keyed by frame index, for every stale frame with a good lock on BOTH
    sides of its run.

    `run_disp` is the prevalence entry's own measure -- |cross[after] - cross[before]| across the
    whole run. It is how wrong the held position had become by the END of the run, so for any
    single INTERIOR frame it is an UPPER BOUND, not that frame's error.
    `interp_err` linearly interpolates between the two good endpoints and reports the distance from
    the held position to that interpolated position -- a per-frame estimate rather than a bound.
    Justified only because the crosshair pans smoothly (the 2026-08-01 centering measurement puts
    clean-shot motion at ~2px/frame); over a long run the interpolation is itself a model, so the
    report carries run length alongside so a reader can see which runs it is trusting.
    """
    run_disp, interp = {}, {}
    n = len(cross)
    for a, b in stale_runs(mask):
        pre = cross[a - 1] if a - 1 >= 0 and cross[a - 1] else None
        post = cross[b + 1] if b + 1 < n and cross[b + 1] else None
        if not (pre and post):
            continue
        d = math.hypot(post[0] - pre[0], post[1] - pre[1])
        steps = b - a + 2
        for i in range(a, b + 1):
            if not cross[i]:
                continue
            run_disp[i] = d
            f = (i - a + 1) / steps
            ex, ey = pre[0] + f * (post[0] - pre[0]), pre[1] + f * (post[1] - pre[1])
            interp[i] = math.hypot(ex - cross[i][0], ey - cross[i][1])
    return run_disp, interp


def _dist_block(vals, radius, center_exclude):
    if not vals:
        return None
    return {
        "n": len(vals), "median": round(st.median(vals), 1),
        "p90": round(_pct(vals, 90), 1), "max": round(max(vals), 1),
        f"gt_pellet_radius_{radius}": sum(1 for v in vals if v > radius),
        "gt_half_radius_80": sum(1 for v in vals if v > 80),
        f"gt_center_exclude_{int(center_exclude)}": sum(1 for v in vals if v > center_exclude),
    }


def stale_counting_report(path, data, fps, t0_shift, offsets=STALE_COUNTING_OFFSETS):
    """One dump's counting-frame stale audit. Events come from count-pellets.py's OWN
    debounce_shots (imported, not re-implemented -- it is the shipped shot definition and stays in
    lockstep with read-pellets.ts); t0 is the event's rising edge (`start`)."""
    cp = _count_pellets_module()
    mode, mode_ev = detect_locate_mode(data)
    name = str(path)
    if mode == "external":
        return {"dump": name, "mode": mode, "mode_evidence": mode_ev, "refused": (
            "positions came from --crosshair-file (no conf, no rawloc): neither hold mechanism "
            "exists in this dump, so no staleness rule applies to it")}
    fc = data.get("frame_counts") or []
    cross = data["cross_positions"]
    n = len(cross)
    p = data.get("params", {})
    radius, cexc = p.get("pellet_radius", 160), p.get("center_exclude", 36)
    mask, modal = stale_mask(data, mode)
    run_disp, interp = stale_displacements(cross, mask)
    shots, _ = cp.debounce_shots(fc, fps) if fc else ([], {})
    totals = [r["white"] + r["red"] for r in fc]

    per_shot, cf_flags, rd, it, deltas = [], [], [], [], []
    for sh in shots:
        t0 = sh["start"] + t0_shift
        idx = [t0 + o for o in offsets if 0 <= t0 + o < n]
        if not idx:
            continue
        flags = [mask[i] for i in idx]
        cf_flags += flags
        inc = [fc[i]["white"] for i in idx]
        keep = [fc[i]["white"] for i, f in zip(idx, flags) if not f]
        row = {"t0": t0, "n_counting": len(idx), "n_stale": sum(flags),
               "count_included": round(sum(inc) / len(inc), 3),
               "count_excluded": round(sum(keep) / len(keep), 3) if keep else None}
        if sum(flags):
            for i, f in zip(idx, flags):
                if f:
                    if i in run_disp:
                        rd.append(run_disp[i])
                    if i in interp:
                        it.append(interp[i])
            if row["count_excluded"] is not None:
                deltas.append(row["count_excluded"] - row["count_included"])
        per_shot.append(row)

    n_stale_all = sum(mask)
    n_cf, n_cf_stale = len(cf_flags), sum(cf_flags)
    all_rate = n_stale_all / n if n else 0.0
    cf_rate = n_cf_stale / n_cf if n_cf else 0.0
    # Confound 1 (circularity): shot detection is DOWNSTREAM of the lock -- build_tracks_and_counts
    # only counts tracks within pellet_radius of cross_positions[fi], so a mispointed held window
    # suppresses the very counts an event is opened on. If it does, a low stale rate at counting
    # frames is SELECTION, not safety. These two conditionals measure the suppression directly.
    s_idx = [i for i in range(min(n, len(totals))) if mask[i]]
    g_idx = [i for i in range(min(n, len(totals))) if not mask[i]]
    ev_min = 3  # count-pellets.py debounce_shots' own event_min / make-groundtruth-f811.EVENT_MIN
    return {
        "dump": name, "mode": mode, "mode_evidence": mode_ev, "modal_delta": modal,
        "n_frames": n, "pellet_radius": radius, "center_exclude": cexc,
        "all_frames_stale_pct": round(100 * all_rate, 2),
        "n_events": len(shots), "n_shots_scored": len(per_shot),
        "n_counting_frames": n_cf, "n_counting_stale": n_cf_stale,
        "counting_stale_pct": round(100 * cf_rate, 2),
        "enrichment_vs_all_frames": round(cf_rate / all_rate, 3) if all_rate else None,
        "shots_with_stale_counting_frame": sum(1 for r in per_shot if r["n_stale"]),
        "displacement_run": _dist_block(rd, radius, cexc),
        "displacement_interp": _dist_block(it, radius, cexc),
        "count_delta_exclude_minus_include": ({
            "n_shots": len(deltas), "median": round(st.median(deltas), 3),
            "mean": round(sum(deltas) / len(deltas), 3),
            "max_abs": round(max(deltas, key=abs), 3),
            "mean_over_all_scored_shots": round(sum(deltas) / len(per_shot), 4) if per_shot else None,
        } if deltas else None),
        "circularity": {
            "p_event_frame_given_stale_pct":
                round(100 * sum(1 for i in s_idx if totals[i] >= ev_min) / len(s_idx), 1) if s_idx else None,
            "p_event_frame_given_good_pct":
                round(100 * sum(1 for i in g_idx if totals[i] >= ev_min) / len(g_idx), 1) if g_idx else None,
        },
        "per_shot": per_shot,
    }


STALE_PROFILE_OFFSETS = (-8, 0, 4, 8, 9, 10, 11, 12, 16, 20, 40, 60)
# The selection-vs-safety discriminator for confound 1. Stale rate is measured at a LADDER of
# offsets from the same t0, all equally conditioned on "a shot was detected here". If the counting
# window is depleted because detection AVOIDS bad locks, the depletion is a property of the whole
# detected-shot neighbourhood and should persist out to +40/+60; if it is a local artefact of the
# event body (where high counts are REQUIRED, and a mispointed window cannot produce them), the
# rate climbs back toward the unconditional prevalence with distance from t0.


def audit_stale_counting(paths, fps, t0_shift, save_fixture=None, offsets=STALE_COUNTING_OFFSETS):
    reports, pooled_rd, pooled_it, pooled_dc = [], [], [], []
    profile = {o: [0, 0] for o in STALE_PROFILE_OFFSETS}
    for path in paths:
        with open(path) as fh:
            data = json.load(fh)
        r = stale_counting_report(path, data, fps, t0_shift, offsets)
        reports.append(r)
        if r.get("refused"):
            continue
        # Pool the RAW per-frame values, not the per-dump medians -- a median of medians would
        # weight a 10-shot dump the same as a 190-shot one.
        mode, _ = detect_locate_mode(data)
        mask, _ = stale_mask(data, mode)
        rd, it = stale_displacements(data["cross_positions"], mask)
        n = len(data["cross_positions"])
        for row in r["per_shot"]:
            for o in STALE_PROFILE_OFFSETS:
                i = row["t0"] + o
                if 0 <= i < n:
                    profile[o][1] += 1
                    profile[o][0] += 1 if mask[i] else 0
            if not row["n_stale"]:
                continue
            for o in offsets:
                i = row["t0"] + o
                if 0 <= i < n and mask[i]:
                    if i in rd:
                        pooled_rd.append(rd[i])
                    if i in it:
                        pooled_it.append(it[i])
            if row["count_excluded"] is not None:
                pooled_dc.append(row["count_excluded"] - row["count_included"])
    scored = [r for r in reports if not r.get("refused")]
    tot_fr = sum(r["n_frames"] for r in scored)
    tot_fr_stale = sum(round(r["all_frames_stale_pct"] / 100 * r["n_frames"]) for r in scored)
    tot_cf = sum(r["n_counting_frames"] for r in scored)
    tot_cf_stale = sum(r["n_counting_stale"] for r in scored)
    all_rate = tot_fr_stale / tot_fr if tot_fr else 0.0
    cf_rate = tot_cf_stale / tot_cf if tot_cf else 0.0
    out = {
        "params": {"fps": fps, "t0_shift": t0_shift, "counting_offsets": list(offsets),
                   "t0_definition": "the debounce event's rising edge (count-pellets.py "
                                    "debounce_shots' `start`), + t0_shift"},
        "pooled": {
            "n_dumps": len(scored), "n_frames": tot_fr,
            "all_frames_stale_pct": round(100 * all_rate, 2),
            "n_counting_frames": tot_cf, "n_counting_stale": tot_cf_stale,
            "counting_stale_pct": round(100 * cf_rate, 2),
            "enrichment_vs_all_frames": round(cf_rate / all_rate, 3) if all_rate else None,
            "n_shots_scored": sum(r["n_shots_scored"] for r in scored),
            "shots_with_stale_counting_frame": sum(r["shots_with_stale_counting_frame"] for r in scored),
            "displacement_run": _dist_block(pooled_rd, 160, 36),
            "displacement_interp": _dist_block(pooled_it, 160, 36),
            "count_delta_exclude_minus_include": ({
                "n_shots": len(pooled_dc), "median": round(st.median(pooled_dc), 3),
                "mean": round(sum(pooled_dc) / len(pooled_dc), 3),
                "sd": round(st.pstdev(pooled_dc), 3),
                "max_abs": round(max(pooled_dc, key=abs), 3),
                "mean_over_all_scored_shots": round(
                    sum(pooled_dc) / sum(r["n_shots_scored"] for r in scored), 4)
                if any(r["n_shots_scored"] for r in scored) else None,
            } if pooled_dc else None),
            "stale_pct_by_offset_from_t0": {
                str(o): {"stale_pct": round(100 * a / b, 2), "n": b}
                for o, (a, b) in sorted(profile.items()) if b},
        },
        "dumps": reports,
    }
    if save_fixture:
        slim = []
        for path, r in zip(paths, reports):
            with open(path) as fh:
                d = json.load(fh)
            # Store the dump's LABEL (parent dir + filename), not the absolute path it was read
            # from -- the dumps live in a gitignored scratchpad whose absolute location is
            # machine-specific, and _stale_counting_expected keys off exactly these two components.
            slim.append({"dump": "/".join(Path(path).parts[-2:]), "params": d.get("params", {}),
                         "cross_positions": d["cross_positions"], "cross_confs": d["cross_confs"],
                         "cross_rawloc": d["cross_rawloc"], "frame_counts": d.get("frame_counts", [])})
        with open(save_fixture, "w") as fh:
            json.dump({
                "_source": ("count-pellets.py --dump-tracks crosshair/count arrays for a small "
                            "structural dump, a small template dump and a zero-stale-counting-frame "
                            "control, sliced to the four arrays this audit reads (no tracks, no "
                            "frames). Constraint 9 self-validation, same precedent as "
                            "score-pellets.py's real-fidelity-slice.json / centering-slice.json."),
                "_note": ("Pins detect_locate_mode + stale_mask + stale_displacements + the "
                          "counting-frame arithmetic with no images and no subprocess. Regenerate "
                          "with analyze-pellet-tracks.py --stale-counting <dumps> "
                          "--save-stale-counting-fixture."),
                "params": out["params"], "dumps": slim,
                "_expected": _stale_counting_expected(out),
            }, fh, indent=1)
        print(f"wrote stale-counting slice fixture -> {save_fixture}")
    print(json.dumps(out, indent=2))
    print("\nSTALE LOCKS AT COUNTING FRAMES (t0+8..t0+11 of every debounced shot; t0 = event rising edge)")
    print(f"{'dump':>40} {'mode':>10} {'allfrm':>7} {'cntfrm':>7} {'enrich':>7} {'shots':>6} "
          f"{'aff':>4} {'runmed':>7} {'intmed':>7} {'dCount':>7}")
    for r in out["dumps"]:
        if r.get("refused"):
            print(f"{r['dump'][-40:]:>40} {r['mode']:>10}  REFUSED: {r['refused']}")
            continue
        rd = r["displacement_run"]
        it = r["displacement_interp"]
        dc = r["count_delta_exclude_minus_include"]
        enr = r["enrichment_vs_all_frames"]
        s_enr = "-" if enr is None else f"{enr:.2f}x"
        s_rd = "-" if not rd else f"{rd['median']:.0f}"
        s_it = "-" if not it else f"{it['median']:.0f}"
        s_dc = "-" if not dc else f"{dc['mean']:+.3f}"
        print(f"{r['dump'][-40:]:>40} {r['mode']:>10} {r['all_frames_stale_pct']:6.1f}% "
              f"{r['counting_stale_pct']:6.1f}% {s_enr:>7} "
              f"{r['n_shots_scored']:6d} {r['shots_with_stale_counting_frame']:4d} "
              f"{s_rd:>7} {s_it:>7} {s_dc:>7}")
    pl = out["pooled"]
    print(f"\nPOOLED over {pl['n_dumps']} dumps: all-frames {pl['all_frames_stale_pct']}% vs "
          f"counting-frame {pl['counting_stale_pct']}% "
          f"(enrichment {pl['enrichment_vs_all_frames']}x, n={pl['n_counting_frames']} counting frames); "
          f"{pl['shots_with_stale_counting_frame']}/{pl['n_shots_scored']} shots carry >=1 stale counting frame.")
    for lbl, key in (("run-displacement (UPPER BOUND: measured across the whole run)", "displacement_run"),
                     ("interpolated per-frame estimate", "displacement_interp")):
        blk = pl[key]
        if blk:
            print(f"  pooled {lbl}: n={blk['n']} median={blk['median']} p90={blk['p90']} "
                  f"max={blk['max']}  >160px(pellet_radius): {blk['gt_pellet_radius_160']}  "
                  f">80px: {blk['gt_half_radius_80']}  >36px(center_exclude): {blk['gt_center_exclude_36']}")
    dc = pl["count_delta_exclude_minus_include"]
    if dc:
        print(f"  pooled A/B (exclude - include), affected shots n={dc['n_shots']}: median "
              f"{dc['median']:+.3f} mean {dc['mean']:+.3f} sd {dc['sd']} max|{dc['max_abs']:+.3f}|; "
              f"diluted over all scored shots {dc['mean_over_all_scored_shots']:+.4f} pellets/shot")
    prof = pl["stale_pct_by_offset_from_t0"]
    print("  stale% by offset from t0 (all equally conditioned on a DETECTED shot; "
          f"unconditional = {pl['all_frames_stale_pct']}%):")
    print("    " + "  ".join(f"t0{int(o):+d}:{v['stale_pct']:.1f}%"
                             for o, v in sorted(prof.items(), key=lambda kv: int(kv[0]))))
    print("CIRCULARITY -- shot detection is downstream of the lock (build_tracks_and_counts windows "
          "counts to cross_positions), so compare P(frame clears event_min) stale vs good per dump above: "
          "a large gap means the low counting-frame rate is SELECTION, not safety.")
    return out


REAL_GT_PATH = "scripts/tests/fixtures/pellets/groundtruth-f8-11.json"


def stale_counting_groundtruth(tracks_dir, score_json):
    """The GROUND-TRUTH arm: on the 6-shot `marciana` (SG/Iron -- NOT `marciana-marine-study`,
    AR/Iron) fixture, which counting frames are stale, and what does excluding them do to the
    fixture's bias and RMSE?

    t0 here is NOT estimated -- it is the owner-anchored value in groundtruth-f8-11.json, and each
    shot is read from the dump matching its OWN recorded `locate` mode (shot 4's crops were cut in
    template mode after structural mislocked, so scoring it against the structural dump would
    measure a different crop's lock). `score_json` is score-pellets.py --real-fixture's stdout,
    which carries the owner count, the shipped `current` estimator's error, and (additively) the
    per-offset counts the mean was taken over, so the exclude arm is a re-average of the SAME
    numbers rather than a second, independently-drifting count."""
    tracks_dir = Path(tracks_dir)
    dumps = {}
    for mode in ("structural", "template"):
        p = tracks_dir / f"tracks-{mode}.json"
        if p.exists():
            with open(p) as fh:
                d = json.load(fh)
            detected, ev = detect_locate_mode(d)
            if detected != mode:
                raise SystemExit(f"--stale-counting-groundtruth: {p} self-reports as '{detected}' "
                                 f"(max conf {ev['max_conf']}), not the '{mode}' its filename "
                                 "claims -- refusing to apply the wrong staleness rule to it")
            dumps[mode] = (d, stale_mask(d, mode)[0])
    if "structural" not in dumps:
        raise SystemExit(f"--stale-counting-groundtruth: {tracks_dir}/tracks-structural.json not "
                         "found. Regenerate at the ground-truth clip parameters (at=15 dur=30 "
                         "fps=60 zoom=2); see docs/handoffs/2026-08-01-pellet-centering-test-plan.md.")
    with open(REAL_GT_PATH) as fh:
        gt = json.load(fh)
    with open(score_json) as fh:
        scored = {r["seq"]: r for r in json.load(fh)["per_sequence"]}

    shots, incl, excl = [], [], []
    for s in gt["shots"]:
        row = {"shot": s["shot"], "t0": s["t0"], "locate": s["locate"], "owner_white": s["white"]}
        sc = scored.get(s["shot"])
        if sc is None:
            raise SystemExit(f"--stale-counting-groundtruth: no scored sequence for shot {s['shot']}")
        row["err_included"] = sc["error"]
        incl.append(sc["error"])
        if s["t0"] is None:
            # shot 0 is the confirmed false positive -- no onset, so it has no counting frames and
            # no stale-frame exposure at all. It still scores (its error IS the false-positive
            # question), so it stays in BOTH arms unchanged.
            row.update({"counting_stale": None, "kept_offsets": None, "err_excluded": sc["error"]})
            excl.append(sc["error"])
            shots.append(row)
            continue
        d, mask = dumps[s["locate"]]
        offs = sorted(int(k) for k in sc["per_offset_pred"])
        flags = [mask[s["t0"] + o] for o in offs]
        row["t0_stale"] = mask[s["t0"]]
        row["conf_at_counting"] = [d["cross_confs"][s["t0"] + o] for o in offs]
        row["counting_stale"] = [o for o, f in zip(offs, flags) if f]
        keep = [sc["per_offset_pred"][str(o)] for o, f in zip(offs, flags) if not f]
        row["kept_offsets"] = [o for o, f in zip(offs, flags) if not f]
        if keep:
            e = sum(keep) / len(keep) - s["white"]
            row["err_excluded"] = round(e, 3)
            excl.append(e)
        else:
            # Every counting frame held -- there is nothing left to average, so the exclude arm
            # DROPS this shot. That changes the denominator, which is stated rather than hidden:
            # the two arms are not scored over the same n.
            row["err_excluded"] = None
        shots.append(row)

    def agg(errs):
        n = len(errs)
        bias = sum(errs) / n
        sd = math.sqrt(sum((e - bias) ** 2 for e in errs) / (n - 1)) if n > 1 else None
        return {"n": n, "bias": round(bias, 3),
                "sd": round(sd, 3) if sd is not None else None,
                "se": round(sd / math.sqrt(n), 3) if sd is not None else None,
                "rmse": round(math.sqrt(sum(e * e for e in errs) / n), 3)}

    # t0 CALIBRATION -- the only place in the repo where an owner-anchored t0 exists, so it is the
    # only place the ESTIMATED t0 that every other dump has to use (the debounce event's rising
    # edge) can be scored. make-groundtruth-f811.py's find_t0 cannot be used off-fixture: it ranks
    # onsets by distance to an owner-supplied approximate shot index, which no other dump carries.
    cp = _count_pellets_module()
    calib = []
    for s in gt["shots"]:
        if s["t0"] is None:
            continue
        d, _m = dumps[s["locate"]]
        gt_shots, _summary = cp.debounce_shots(d["frame_counts"], 60.0)
        ev = [e for e in gt_shots if e["start"] <= s["t0"] <= e["end"]]
        est = ev[0]["start"] if ev else None
        calib.append({"shot": s["shot"], "owner_t0": s["t0"], "event_start": est,
                      "delta": None if est is None else est - s["t0"]})
    a_in, a_ex = agg(incl), agg(excl)
    out = {"tracks_dir": str(tracks_dir), "score_json": str(score_json),
           "t0_calibration": calib, "shots": shots,
           "included": a_in, "excluded": a_ex,
           "bias_shift": round(a_ex["bias"] - a_in["bias"], 3),
           "rmse_shift": round(a_ex["rmse"] - a_in["rmse"], 3),
           "bias_shift_vs_included_se": (round(abs(a_ex["bias"] - a_in["bias"]) / a_in["se"], 2)
                                         if a_in["se"] else None)}
    print(json.dumps(out, indent=2))
    print("\nGROUND-TRUTH ARM -- 6-shot `marciana` (SG/Iron) f8-11 fixture, owner-anchored t0")
    print(f"{'shot':>4} {'t0':>6} {'locate':>10} {'owner':>5} {'t0stale':>7} {'stale f':>16} "
          f"{'err incl':>8} {'err excl':>8}")
    for r in shots:
        st_l = "-" if r["counting_stale"] is None else (
            ",".join(f"f{o:02d}" for o in r["counting_stale"]) or "none")
        s_ex = "drop" if r["err_excluded"] is None else f"{r['err_excluded']:.2f}"
        print(f"{r['shot']:>4} {str(r['t0']):>6} {r['locate']:>10} {r['owner_white']:>5} "
              f"{str(r.get('t0_stale', '-')):>7} {st_l:>16} {r['err_included']:>8.2f} {s_ex:>8}")
    deltas = [c["delta"] for c in calib if c["delta"] is not None]
    print(f"\n  t0 calibration (debounce event rising edge vs owner-anchored t0): "
          f"{[c['delta'] for c in calib]}  exact on {sum(1 for d in deltas if d == 0)}/{len(calib)}, "
          f"max |error| {max((abs(d) for d in deltas), default=0)} frames")
    print(f"  INCLUDED n={a_in['n']} bias={a_in['bias']:+.3f} (se {a_in['se']}) rmse={a_in['rmse']}")
    print(f"  EXCLUDED n={a_ex['n']} bias={a_ex['bias']:+.3f} (se {a_ex['se']}) rmse={a_ex['rmse']}")
    print(f"  shift: bias {out['bias_shift']:+.3f}, rmse {out['rmse_shift']:+.3f}; "
          f"|bias shift| / included SE = {out['bias_shift_vs_included_se']}")
    return out


def _stale_counting_expected(report):
    """The subset the selftest pins -- small enough to read in a diff, specific enough that any
    mode-detection, masking, displacement or counting-window change moves it."""
    return {r["dump"].split("/")[-2] + "/" + r["dump"].split("/")[-1]: (
        {"refused": True} if r.get("refused") else {
            "mode": r["mode"], "all_frames_stale_pct": r["all_frames_stale_pct"],
            "counting_stale_pct": r["counting_stale_pct"],
            "n_counting_frames": r["n_counting_frames"], "n_counting_stale": r["n_counting_stale"],
            "shots_with_stale_counting_frame": r["shots_with_stale_counting_frame"],
            "displacement_run_median": r["displacement_run"]["median"] if r["displacement_run"] else None,
            "displacement_interp_median": r["displacement_interp"]["median"] if r["displacement_interp"] else None,
            "count_delta_mean": r["count_delta_exclude_minus_include"]["mean"]
            if r["count_delta_exclude_minus_include"] else None,
            "circularity": r["circularity"],
        }) for r in report["dumps"]}


def stale_counting_selftest():
    """Constraint 9 self-validation: replay the whole audit over the committed slice fixture."""
    with open(STALE_COUNTING_FIXTURE) as fh:
        fx = json.load(fh)
    p = fx["params"]
    reports = [stale_counting_report(d["dump"], d, p["fps"], p["t0_shift"],
                                     tuple(p.get("counting_offsets", STALE_COUNTING_OFFSETS)))
               for d in fx["dumps"]]
    got = _stale_counting_expected({"dumps": reports})
    expected = fx["_expected"]
    ok = got == expected
    print(f"expected: {json.dumps(expected, sort_keys=True)}")
    print(f"got     : {json.dumps(got, sort_keys=True)}")
    print("SELFTEST PASS" if ok else "SELFTEST FAIL")
    return 0 if ok else 1


# ==================================================================== THE MISSING-SHOT CHANNEL
# docs/handoffs/2026-08-01-missing-shot-channel-test-plan.md.
#
# Every counter-bias measurement so far has been conditioned on a DETECTED shot, so a shot the
# reader never opened an event for is invisible to all of them -- and a missing shot is a pure cold
# bias. This section counts those, using the ammo counter (count-pellets.py --ammo-series) as an
# arbiter that is NOT downstream of the pellet detector: the counter decrements once per shot
# whether or not a blast was detected.
#
# RECONSTRUCTION RULES, all fixed before the numbers existed:
#   * A read is DROPPED (treated as an abstention) if it is None, or above `ammo_max` -- a 3-glyph
#     counter can misread as e.g. "201" or "093", and the magazine size is a datamined kit value,
#     not a fitted one.
#   * A new LEVEL is accepted only after `confirm` consecutive surviving reads of the same value.
#     Abstentions do NOT break a run: they are missing data, not evidence of change.
#   * level DOWN by d  => d shots (recoverable ACROSS an abstention gap -- 7 before, 5 after means
#     two shots fired while zero were detected; this is why the method survives its shared lock).
#   * level UP         => a RELOAD, 0 recovered shots. Whatever was fired between the last
#     confirmed level and the reload is UNRECOVERABLE, so each reload contributes its pre-reload
#     level to `reload_headroom`: the count is a LOWER BOUND and the headroom is the size of the
#     hole (confound 1).
AMMO_CONFIRM = 2
AMMO_MAX = 9          # SG magazine size for every unit in scope (marciana/guilty/isabel/noir)
MISSING_SHOTS_FIXTURE = "scripts/tests/fixtures/pellets/missing-shots-slice.json"


def reconstruct_ammo(reads, confirm=AMMO_CONFIRM, ammo_max=AMMO_MAX):
    """Accepted (first_index, value) levels + the index of the last surviving read of each.

    Returns (levels, dropped) where levels is [{"i", "value", "prev_last_i"}] in frame order and
    `dropped` counts the reads discarded by each rule.
    """
    dropped = collections.Counter()
    levels, cur = [], None
    run_val, run_n, run_first = None, 0, None
    last_surviving_i = None
    for r in reads:
        v = r.get("ammo")
        if v is None:
            dropped[r.get("reason") or "abstain"] += 1
            continue
        if v > ammo_max:
            dropped["out-of-range"] += 1
            continue
        if v == run_val:
            run_n += 1
        else:
            run_val, run_n, run_first = v, 1, r["i"]
        if run_n >= confirm and v != cur:
            levels.append({"i": run_first, "value": v, "prev_last_i": last_surviving_i})
            cur = v
        if run_n >= confirm:
            last_surviving_i = r["i"]
        elif cur is not None and v == cur:
            last_surviving_i = r["i"]
    return levels, dict(dropped)


def ammo_shot_events(levels):
    """Decrement (=shots) and reload events from an accepted level sequence.

    Each decrement carries the WINDOW the counter changed in: strictly after the last surviving
    read of the old level, up to and including the first read of the new one.

    CONSECUTIVE upward transitions are ONE reload, not several. On `noir` -- the fastest reload in
    scope (62 datamined frames) -- the counter is readable THROUGH the reload animation and ramps
    1 -> 3 -> 6 -> 9, so the naive rule reported 79 reloads across a 190s fight in which 205 shots
    were fired from a 9-round magazine: arithmetically impossible, and it inflated `reload_headroom`
    to 284 by charging the hole three times. A magazine can only be reloaded once per emptying, so
    a run of ups with no shot between them is one event, and the headroom is the level before the
    FIRST up.
    """
    events, pending_up = [], None
    for k in range(1, len(levels)):
        prev, cur = levels[k - 1], levels[k]
        lo = (cur["prev_last_i"] + 1) if cur["prev_last_i"] is not None else cur["i"]
        lo = min(lo, cur["i"])
        if cur["value"] > prev["value"]:
            if pending_up is None:
                pending_up = {"kind": "reload", "lo": lo, "hi": cur["i"], "from": prev["value"],
                              "to": cur["value"], "shots": 0, "headroom": prev["value"], "ups": 1}
            else:
                pending_up.update(hi=cur["i"], to=cur["value"], ups=pending_up["ups"] + 1)
        elif cur["value"] < prev["value"]:
            if pending_up is not None:
                events.append(pending_up)
                pending_up = None
            events.append({"kind": "decrement", "lo": lo, "hi": cur["i"],
                           "from": prev["value"], "to": cur["value"],
                           "shots": prev["value"] - cur["value"]})
    if pending_up is not None:
        events.append(pending_up)
    return events


def flag_inadmissible_decrements(events, cadence_lo):
    """Multi-shot decrements whose window is TOO NARROW to hold the shots they claim.

    A weapon cannot fire faster than its cadence, so a drop of d over a window of w frames needs
    w >= (d-1) * cadence_lo. A d>1 drop with w ~ 0 is not a hidden burst of fire, it is a glyph
    misread that survived `confirm` (measured on `isabel`: a two-frame 8 -> 6 -> 8 flip, which the
    naive rule scored as 2 shots fired and 2 shots reloaded inside four frames).

    REPORTED, not enforced: the pre-committed reconstruction rule stands, and this is the
    whole-picture arithmetic check on what it produced.
    """
    bad = []
    for e in events:
        if e["kind"] != "decrement" or e["shots"] <= 1:
            continue
        if (e["hi"] - e["lo"]) < (e["shots"] - 1) * cadence_lo:
            bad.append(e)
    return bad


def admissible_shots(event, cadence_lo):
    """The most shots a decrement's window can physically hold at the measured cadence.

    The exact INVERSE of flag_inadmissible_decrements' predicate (w >= (d-1) * cadence_lo): a
    window of w frames admits at most w // cadence_lo + 1 shots. For a decrement that rule did not
    flag this is already >= its own `shots`, so the min() leaves it untouched -- only a flagged
    (physically impossible) drop is capped, which is exactly the phantom-shot inflation.

    ⚑ CALIBRATED ON THE `9 -> 0` CASE ONLY -- NOT GENERAL. It assumes a flagged window still holds
    ONE real shot, which is right when the misread interrupts a genuine decrement (`isabel`'s
    f1596-1602 `9 -> 0` sits between a confirmed 9 and a confirmed 8, so exactly one round was
    fired). It is WRONG for a ZERO-WIDTH flip such as the whole-clip `8 -> 6` events at f686 and
    f1833: the cap credits 0 // cadence_lo + 1 = 1 shot, but if the `6` was a pure glyph misread and
    the level truly never left 8, the truth is 0. Do not assume this rule generalises to the flips
    it has not been calibrated against.
    """
    if not cadence_lo:
        return event["shots"]
    return min(event["shots"], int((event["hi"] - event["lo"]) // cadence_lo) + 1)


def measure_cadence(events):
    """Inter-shot spacing MEASURED from the ammo series, not assumed from `rate_of_fire`.

    Only single-shot decrements with no reload between them are used, so reload gaps and
    abstention-hidden multi-shot decrements cannot stretch the estimate.
    """
    gaps = []
    prev = None
    for e in events:
        if e["kind"] == "reload":
            prev = None
            continue
        if prev is not None and e["shots"] == 1 and prev["shots"] == 1:
            gaps.append(e["hi"] - prev["hi"])
        prev = e
    if not gaps:
        return {"n": 0, "median": None, "mode": None, "gaps": []}
    return {"n": len(gaps), "median": st.median(gaps),
            "mode": collections.Counter(gaps).most_common(1)[0][0],
            "p10": _pct(gaps, 10), "p90": _pct(gaps, 90),
            "hist": dict(sorted(collections.Counter(gaps).items()))}


def match_shots(events, detected_t0, slack):
    """Greedy time-ordered assignment of detected shot onsets to ammo shot slots.

    Returns (slots, spurious). Each ammo shot is one slot with the window its decrement happened
    in, widened by `slack` -- the pellet detector's t0 is the EVENT_MIN rising edge, which sits AT
    or AFTER the shot frame (the blast has to brighten), so the two are not expected to coincide
    exactly. MISSED and SPURIOUS are returned separately and never netted (confound 5).
    """
    slots = []
    for e in events:
        for _ in range(e["shots"]):
            slots.append({"lo": e["lo"], "hi": e["hi"], "from": e["from"], "to": e["to"],
                          "multi": e["shots"] > 1, "t0": None})
    used = set()
    for s in slots:
        for j, t in enumerate(detected_t0):
            if j in used:
                continue
            if s["lo"] - slack <= t <= s["hi"] + slack:
                s["t0"] = t
                used.add(j)
                break
    spurious = [t for j, t in enumerate(detected_t0) if j not in used]
    return slots, spurious


def cadence_multiple_subcase(detected_t0, slots, events, cadence, tol=0.15):
    """§3b's cleanest sub-case: adjacent DETECTED gaps that are integer multiples of the measured
    cadence carry no reload ambiguity, so `gap/cadence - 1` is a prediction the ammo can falsify."""
    reload_spans = [(e["lo"], e["hi"]) for e in events if e["kind"] == "reload"]
    rows = []
    for a, b in zip(detected_t0, detected_t0[1:]):
        if any(a < hi and lo < b for lo, hi in reload_spans):
            continue
        k = (b - a) / cadence
        if abs(k - round(k)) > tol or round(k) < 2:
            continue
        inside = [s for s in slots if a < s["hi"] <= b and s["t0"] is None]
        rows.append({"from_t0": a, "to_t0": b, "gap": b - a, "k": round(k),
                     "predicted_missing": round(k) - 1, "ammo_missing": len(inside)})
    return rows


def classify_spurious(spurious, levels, events, slack):
    """Split the unmatched DETECTED onsets by why the ammo could not account for them.

    Only the last bucket is over-detection. The others are holes in the ARBITER, and lumping them
    in would inflate the detector's fabrication rate with the ammo's own blind spots:
      before-first-level / after-last-level  the clip starts or ends mid-magazine, so the level
                                             either side of the boundary was never established;
      in-reload-window                       the counter is blank through the reload animation, so
                                             the shot that EMPTIED the magazine is invisible to it.
                                             These are the `reload_headroom` shots, observed.
    """
    if not levels:
        return {"unexplained": list(spurious)}
    first_i, last_i = levels[0]["i"], levels[-1]["i"]
    reloads = [(e["lo"], e["hi"]) for e in events if e["kind"] == "reload"]
    out = collections.defaultdict(list)
    for t in spurious:
        if t < first_i:
            out["before-first-level"].append(t)
        elif t > last_i:
            out["after-last-level"].append(t)
        elif any(lo - slack <= t <= hi + slack for lo, hi in reloads):
            out["in-reload-window"].append(t)
        else:
            out["unexplained"].append(t)
    return dict(out)


def gate_against_owner_groundtruth(slots, gt_path=None):
    """§3a GATE: do the reconstructed shots recover the owner-confirmed real shots of the
    `marciana` (SG/Iron -- NOT `marciana-marine-study`, AR/Iron) f8-11 fixture?

    The fixture's shot 0 is an owner-confirmed FALSE POSITIVE, so the five remaining `t0` values
    are the ground truth. Each is matched to the ammo decrement window it falls in; the offset is
    reported per shot rather than summarised, because its SIGN is the check that matters -- the
    counter decrements ON the shot frame and t0 is the detector's EVENT_MIN rising edge, so a
    correct instrument produces offsets that are >= 0 and small, never negative.
    """
    with open(gt_path or REAL_GT_PATH) as fh:
        gt = json.load(fh)
    real = [s for s in gt["shots"] if s["shot"] != 0 and s.get("t0") is not None]
    lo, hi = min(s["t0"] for s in real), max(s["t0"] for s in real)
    rows = []
    for s in real:
        t0 = s["t0"]
        near = [w for w in slots if w["lo"] - 12 <= t0 <= w["hi"] + 12]
        best = min(near, key=lambda w: abs(t0 - w["hi"])) if near else None
        rows.append({"shot": s["shot"], "owner_t0": t0,
                     "ammo_window": [best["lo"], best["hi"]] if best else None,
                     "offset_t0_minus_window_hi": (t0 - best["hi"]) if best else None,
                     "transition": f'{best["from"]}->{best["to"]}' if best else None})
    inside = [w for w in slots if lo <= w["hi"] <= hi]
    return {
        "gt_fixture": gt_path or REAL_GT_PATH, "span": [lo, hi],
        "n_owner_real_shots": len(real),
        "n_recovered": sum(1 for r in rows if r["ammo_window"] is not None),
        "max_abs_offset": max((abs(r["offset_t0_minus_window_hi"]) for r in rows
                               if r["offset_t0_minus_window_hi"] is not None), default=None),
        "n_negative_offset": sum(1 for r in rows if (r["offset_t0_minus_window_hi"] or 0) < 0),
        "n_ammo_shots_in_span": len(inside),
        "ammo_shots_in_span_with_no_detected_t0": sum(1 for w in inside if w["t0"] is None),
        "per_shot": rows,
    }


HAND_COUNT_FIXTURE = "scripts/tests/fixtures/pellets/hand-count-slice.json"


def reload_extra_onsets(events, spurious, slack):
    """Split the in-reload SPURIOUS onsets into the magazine-emptying shot and the EXTRAS.

    A reload window can host at most ONE real weapon shot -- the round that emptied the magazine,
    fired immediately before the counter goes blank. That shot is invisible to the ammo arbiter
    (`reload_headroom`), which is why it lands in SPURIOUS rather than in a slot. But a SECOND
    detected onset inside the same reload window cannot be a weapon shot at all: the magazine is
    empty and the counter has not come back yet.

    So the extras are a mechanically-derived count of NON-AMMO damage events the shot detector
    fired on -- no pellet-count threshold and no timing prior involved. Returned per reload so the
    attribution is auditable, since this is the only arm that can see a channel the ammo cannot.
    """
    reloads = [e for e in events if e["kind"] == "reload"]
    rows, extras = [], []
    for e in reloads:
        inside = sorted(t for t in spurious if e["lo"] - slack <= t <= e["hi"] + slack)
        rows.append({"reload_window": [e["lo"], e["hi"]], "headroom": e.get("headroom"),
                     "onsets": inside,
                     "mag_empty": inside[0] if inside else None,
                     "extras": inside[1:]})
        extras.extend(inside[1:])
    return rows, sorted(extras)


def hand_count_report(ammo, tracks, fps, slack, confirm, ammo_max, window, hand, at=0.0):
    """Score ONE dump against an owner HAND SHOT-COUNT over a video-time window.

    This is the arm the ammo arbiter cannot supply for itself. `shots_from_ammo` counts DECREMENTS,
    so it is structurally blind to the round that empties each magazine, and its MISSED% is a rate
    against that already-incomplete denominator. A hand count is the true shot total, so it fixes
    the denominator AND supplies an external check on the reconstruction inside the window.

    `window` is [lo_sec, hi_sec] in the VIDEO's timebase (the owner reads timestamps off the player,
    not off the fight clock); `at` is the dump's own extraction offset so frame = (t - at) * fps.
    `hand` carries the owner's counts: {"shots", "magazines", "nonammo_events"}.

    The ammo series is reconstructed over the FULL clip and only then sliced to the window, so the
    levels either side of the boundary are established and no edge event is manufactured.
    """
    cp = _count_pellets_module()
    reads = ammo["reads"]
    lo_s, hi_s = window
    f_lo, f_hi = round((lo_s - at) * fps), round((hi_s - at) * fps)
    levels, dropped = reconstruct_ammo(reads, confirm, ammo_max)
    events_all = ammo_shot_events(levels)
    # An event belongs to the window when the ROUND IT REPRESENTS WAS FIRED inside it. For a
    # decrement that is the transition frame `hi`. For a RELOAD it is `lo` -- the frame the counter
    # goes blank, i.e. essentially the magazine-emptying shot's own frame -- because a reload's `hi`
    # is when the NEXT magazine's count appears, which can fall outside a window whose emptying shot
    # was inside it. Measured on `isabel`: the f1756 reload's `hi` is f1817, 11 frames past this
    # window's end, so scoring reloads by `hi` silently dropped a real magazine-emptying round.
    events = [e for e in events_all
              if f_lo <= (e["lo"] if e["kind"] == "reload" else e["hi"]) <= f_hi]
    fc = tracks.get("frame_counts") or []
    detected, _summary = cp.debounce_shots(fc, fps) if fc else ([], {})
    detected_all = [s["start"] for s in detected]
    detected_t0 = [t for t in detected_all if f_lo <= t <= f_hi]
    slots, spurious = match_shots(events, detected_t0, slack)
    by_cause = classify_spurious(spurious, levels, events_all, slack)
    reload_rows, extras = reload_extra_onsets(events_all, spurious, slack)
    reload_rows = [r for r in reload_rows if f_lo <= r["reload_window"][1] <= f_hi]
    extras = [t for t in extras if f_lo <= t <= f_hi]

    cad = measure_cadence(events_all)
    cad_lo = cad.get("p10") or 0
    bad = flag_inadmissible_decrements(events_all, cad_lo)
    bad_in_window = [e for e in bad if f_lo <= e["hi"] <= f_hi]
    bad_ids = {id(e) for e in bad}
    # A reload IMMEDIATELY FOLLOWING an inadmissible decrement is not a magazine change -- it is the
    # counter recovering from the same glyph misread. `isabel`'s flagged `9 -> 0` at f1596-1602 is
    # followed by a `0 -> 8` up at f1605 that no magazine performed. Phantom on the ADMISSIBLE basis
    # only; the raw count keeps it, like every other raw/admissible pair here.
    phantom_reload_ids = {id(e) for k, e in enumerate(events_all)
                          if e["kind"] == "reload" and k
                          and events_all[k - 1]["kind"] == "decrement"
                          and id(events_all[k - 1]) in bad_ids}

    dec_shots = sum(e["shots"] for e in events if e["kind"] == "decrement")
    # ADMISSIBLE basis, reported ALONGSIDE the raw one and never instead of it (the
    # missing_shots_report precedent). reconstruct_ammo has no magazine-consistency check, so a
    # glyph misread that survives `confirm` MINTS shots: measured on `isabel`, the 3-frame `0` at
    # f1602-1604 sitting between a confirmed 9 and a confirmed 8 scores as a 9-shot `9 -> 0`
    # decrement, inflating this window's decrement headline to 40 against a hand count of 32.
    # Capping each FLAGGED decrement at what its window can hold removes exactly that inflation.
    # The reload count -- the proxy for the magazine-emptying rounds the arbiter cannot see -- gets
    # the matching correction: phantom reloads are dropped on the admissible basis. The underlying
    # reconstruct_ammo defect is NOT fixed here (whole-fight blast radius).
    dec_shots_adm = sum(
        admissible_shots(e, cad_lo) if id(e) in bad_ids else e["shots"]
        for e in events if e["kind"] == "decrement")
    n_reloads = sum(1 for e in events if e["kind"] == "reload")
    n_reloads_adm = sum(1 for e in events
                        if e["kind"] == "reload" and id(e) not in phantom_reload_ids)
    missed = [s for s in slots if s["t0"] is None]
    n_hand = hand.get("shots")
    # Detections attributable to the WEAPON: everything the ammo matched, plus one magazine-emptying
    # shot per reload, i.e. total detections minus the extras that cannot be weapon shots.
    det_weapon = len(detected_t0) - len(extras)
    miss_vs_hand = (n_hand - det_weapon) if n_hand is not None else None
    miss_naive = (n_hand - len(detected_t0)) if n_hand is not None else None

    # The whole-clip extras scan: the same rule outside the hand-counted window, with the spacing
    # between consecutive extras, so a periodic non-ammo source is visible as a period rather than
    # asserted from one pair.
    slots_all, spurious_all = match_shots(events_all, detected_all, slack)
    _rows_all, extras_all = reload_extra_onsets(events_all, spurious_all, slack)
    gaps = [round((b - a) / fps, 2) for a, b in zip(extras_all, extras_all[1:])]

    return {
        "dump": "/".join(Path(ammo["tracks"]).parts[-2:]), "fps": fps, "slack": slack,
        "at": at, "window_sec": [lo_s, hi_s], "window_frames": [f_lo, f_hi],
        "hand": dict(hand),
        "ammo": {
            "decrement_shots": dec_shots, "n_reloads": n_reloads,
            "implied_total": dec_shots + n_reloads,
            "decrement_shots_admissible": dec_shots_adm,
            "n_reloads_admissible": n_reloads_adm,
            "implied_total_admissible": dec_shots_adm + n_reloads_adm,
            "read_pct": round(100 * sum(1 for r in reads
                                        if f_lo <= r["i"] <= f_hi and r.get("ammo") is not None)
                              / max(1, sum(1 for r in reads if f_lo <= r["i"] <= f_hi)), 1),
            "dropped": dropped,
            "inadmissible_decrements_in_window": [
                {"lo": e["lo"], "hi": e["hi"], "from": e["from"], "to": e["to"]}
                for e in bad_in_window],
            "n_inadmissible_whole_clip": len(bad),
        },
        "detected": {"n_in_window": len(detected_t0), "t0": detected_t0,
                     "n_whole_clip": len(detected_all)},
        "match": {"matched": len(slots) - len(missed), "MISSED": len(missed),
                  "SPURIOUS": len(spurious), "by_cause": by_cause,
                  "missed_windows": [{"lo": s["lo"], "hi": s["hi"],
                                      "from": s["from"], "to": s["to"]} for s in missed]},
        "nonammo": {"per_reload": reload_rows, "extras_in_window": extras,
                    "n_extras_in_window": len(extras),
                    "extras_whole_clip": extras_all, "n_extras_whole_clip": len(extras_all),
                    "gap_sec_between_extras": gaps,
                    "median_gap_sec": round(st.median(gaps), 2) if gaps else None},
        "score_vs_hand": {
            "hand_shots": n_hand,
            "hand_magazines": hand.get("magazines"),
            "hand_nonammo_events": hand.get("nonammo_events"),
            "ammo_visible_shots": dec_shots,
            "ammo_implied_total": dec_shots + n_reloads,
            "ammo_total_matches_hand": (dec_shots + n_reloads) == n_hand,
            "ammo_visible_shots_admissible": dec_shots_adm,
            "ammo_reloads_admissible": n_reloads_adm,
            "ammo_implied_total_admissible": dec_shots_adm + n_reloads_adm,
            "ammo_total_admissible_matches_hand": (dec_shots_adm + n_reloads_adm) == n_hand,
            "detected_in_window": len(detected_t0),
            "detected_weapon_attributable": det_weapon,
            "MISSED_vs_hand": miss_vs_hand,
            "MISSED_pct_vs_hand": round(100 * miss_vs_hand / n_hand, 1) if n_hand else None,
            "MISSED_vs_hand_if_every_detection_is_a_shot": miss_naive,
            "MISSED_pct_naive": round(100 * miss_naive / n_hand, 1) if n_hand else None,
            "MISSED_pct_arbiter_basis": round(100 * len(missed) / dec_shots, 1) if dec_shots else None,
        },
    }


def audit_hand_count(ammo_paths, fps, slack, confirm, ammo_max, window, hand, at,
                     save_fixture=None):
    reports = []
    for p in ammo_paths:
        with open(p) as fh:
            ammo = json.load(fh)
        if ammo.get("refused"):
            print(f"REFUSED {p}: {ammo['refused']}")
            continue
        with open(ammo["tracks"]) as fh:
            tracks = json.load(fh)
        reports.append(hand_count_report(ammo, tracks, fps, slack, confirm, ammo_max,
                                         window, hand, at))
    print(json.dumps({"dumps": reports}, indent=2))
    for r in reports:
        s = r["score_vs_hand"]
        print(f"\nHAND-COUNT SCORE — {r['dump']}  window {r['window_sec']}s "
              f"(frames {r['window_frames']})")
        print(f"  owner hand count      : {s['hand_shots']} shots / "
              f"{s['hand_magazines']} magazines / {s['hand_nonammo_events']} non-ammo events")
        print(f"  ammo arbiter, raw     : {s['ammo_visible_shots']} decrements + "
              f"{r['ammo']['n_reloads']} mag-empty = {s['ammo_implied_total']} "
              f"({'MATCHES' if s['ammo_total_matches_hand'] else 'DIFFERS FROM'} the hand count)")
        print(f"  ammo arbiter, ADMISS. : {s['ammo_visible_shots_admissible']} decrements + "
              f"{s['ammo_reloads_admissible']} mag-empty = {s['ammo_implied_total_admissible']} "
              f"({'MATCHES' if s['ammo_total_admissible_matches_hand'] else 'DIFFERS FROM'} "
              f"the hand count)   [flagged decrements capped at what their window can hold]")
        print(f"  detector              : {s['detected_in_window']} onsets, "
              f"{r['nonammo']['n_extras_in_window']} of them non-ammo -> "
              f"{s['detected_weapon_attributable']} weapon shots")
        print(f"  MISSED vs hand        : {s['MISSED_vs_hand']} ({s['MISSED_pct_vs_hand']}%)"
              f"   [naive, counting every onset as a shot: "
              f"{s['MISSED_vs_hand_if_every_detection_is_a_shot']} ({s['MISSED_pct_naive']}%)]")
        print(f"  MISSED, arbiter basis : {r['match']['MISSED']} "
              f"({s['MISSED_pct_arbiter_basis']}% of decrements)")
        print(f"  inadmissible flips in window: "
              f"{len(r['ammo']['inadmissible_decrements_in_window'])} "
              f"(whole clip {r['ammo']['n_inadmissible_whole_clip']})")
        print(f"  non-ammo extras, whole clip: {r['nonammo']['n_extras_whole_clip']}, "
              f"median gap {r['nonammo']['median_gap_sec']}s")
    if save_fixture:
        slims = []
        for p, r in zip(ammo_paths, reports):
            with open(p) as fh:
                ammo = json.load(fh)
            with open(ammo["tracks"]) as fh:
                tracks = json.load(fh)
            slims.append({
                "tracks": "/".join(Path(ammo["tracks"]).parts[-2:]),
                "range": ammo.get("range", [0, len(ammo["reads"])]),
                "reads": [{"i": x["i"], "ammo": x.get("ammo")} for x in ammo["reads"]],
                "frame_counts": tracks.get("frame_counts", []),
            })
        with open(save_fixture, "w") as fh:
            json.dump({
                "_source": ("count-pellets.py --ammo-series reads + the frame_counts they were "
                            "scored against, for the `isabel` full-fight dump "
                            "(docs/probes/ar-sg-smg/isabel solo sg.MP4, fps 30, at 0). Pins the "
                            "owner hand-count arm of the missing-shot channel. Constraint 9 "
                            "self-validation, same precedent as missing-shots-slice.json."),
                "_note": ("Replays hand_count_report with no images and no subprocess. Regenerate "
                          "with analyze-pellet-tracks.py --hand-count <ammo-series.json> "
                          "--hand-count-window ... --save-hand-count-fixture."),
                "params": {"fps": fps, "slack": slack, "confirm": confirm, "ammo_max": ammo_max,
                           "window": list(window), "at": at, "hand": dict(hand)},
                "dumps": slims,
                "_expected": [_hand_count_expected(r) for r in reports],
            }, fh)
        print(f"\nwrote hand-count slice fixture -> {save_fixture}")
    return reports


def _hand_count_expected(r):
    s = r["score_vs_hand"]
    return {
        "dump": r["dump"],
        "score_vs_hand": s,
        "detected_t0": r["detected"]["t0"],
        "MISSED": r["match"]["MISSED"],
        "SPURIOUS": r["match"]["SPURIOUS"],
        "extras_in_window": r["nonammo"]["extras_in_window"],
        "n_extras_whole_clip": r["nonammo"]["n_extras_whole_clip"],
        "median_gap_sec": r["nonammo"]["median_gap_sec"],
    }


def hand_count_selftest():
    """Constraint 9 self-validation: replay the hand-count arm over the committed slice."""
    with open(HAND_COUNT_FIXTURE) as fh:
        fx = json.load(fh)
    p = fx["params"]
    got = []
    for d in fx["dumps"]:
        ammo = {"tracks": d["tracks"], "range": d["range"], "reads": d["reads"]}
        got.append(_hand_count_expected(hand_count_report(
            ammo, d, p["fps"], p["slack"], p["confirm"], p["ammo_max"],
            p["window"], p["hand"], p["at"])))
    ok = got == fx["_expected"]
    print(f"expected: {json.dumps(fx['_expected'], sort_keys=True)}")
    print(f"got     : {json.dumps(got, sort_keys=True)}")
    print("SELFTEST PASS" if ok else "SELFTEST FAIL")
    return 0 if ok else 1


def missing_shots_report(ammo, tracks, fps, slack, confirm, ammo_max, gate=False):
    """One dump's missing-shot measurement. `ammo` is a count-pellets.py --ammo-series payload."""
    cp = _count_pellets_module()
    reads = ammo["reads"]
    levels, dropped = reconstruct_ammo(reads, confirm, ammo_max)
    events = ammo_shot_events(levels)
    fc = tracks.get("frame_counts") or []
    detected, summary = cp.debounce_shots(fc, fps) if fc else ([], {})
    lo, hi = ammo.get("range", [0, len(reads)])
    detected_t0 = [s["start"] for s in detected if lo <= s["start"] < hi]
    slots, spurious = match_shots(events, detected_t0, slack)
    cad = measure_cadence(events)
    cadence = cad["mode"] or cad["median"]
    shots_ammo = len(slots)
    missed = [s for s in slots if s["t0"] is None]
    headroom = sum(e.get("headroom", 0) for e in events if e["kind"] == "reload")
    bad = flag_inadmissible_decrements(events, cad.get("p10") or 0)
    bad_windows = {(e["lo"], e["hi"]) for e in bad}
    missed_admissible = [s for s in missed if (s["lo"], s["hi"]) not in bad_windows]
    shots_admissible = sum(1 for s in slots if (s["lo"], s["hi"]) not in bad_windows)

    # Confound 2: the ammo read reuses the dump's own lock, so quantify how much of the abstention
    # sits on the stale runs the 2026-08-01 prevalence entry already characterised.
    mode, _ev = detect_locate_mode(tracks)
    mask, _ = stale_mask(tracks, mode)
    n_stale = n_stale_abst = n_good = n_good_abst = 0
    for r in reads:
        i = r["i"]
        st_ = mask[i] if i < len(mask) else False
        ab = r.get("ammo") is None or (r.get("ammo") or 0) > ammo_max
        if st_:
            n_stale += 1
            n_stale_abst += ab
        else:
            n_good += 1
            n_good_abst += ab
    return {
        "dump": "/".join(Path(ammo["tracks"]).parts[-2:]), "fps": fps, "slack": slack,
        "confirm": confirm, "ammo_max": ammo_max, "range": [lo, hi],
        "n_reads": len(reads), "n_read_ok": sum(1 for r in reads if r.get("ammo") is not None),
        "read_pct": round(100 * sum(1 for r in reads if r.get("ammo") is not None) / max(1, len(reads)), 1),
        "dropped": dropped, "n_levels": len(levels),
        "cadence_frames": cad,
        "shots_from_ammo": shots_ammo,
        "shots_detected_total": len(detected_t0),
        "shots_detected_valid": summary.get("validShots"),
        "avg_total_valid": summary.get("avgTotal"),
        "MISSED": len(missed),
        "MISSED_pct_of_ammo": round(100 * len(missed) / shots_ammo, 1) if shots_ammo else None,
        "SPURIOUS": len(spurious),
        "SPURIOUS_pct_of_detected": round(100 * len(spurious) / len(detected_t0), 1) if detected_t0 else None,
        "spurious_by_cause": classify_spurious(spurious, levels, events, slack),
        "n_reloads": sum(1 for e in events if e["kind"] == "reload"),
        "reload_headroom": headroom,
        "missed_in_multi_decrement": sum(1 for s in missed if s["multi"]),
        "inadmissible_decrements": {
            "n_events": len(bad), "n_shots": sum(e["shots"] for e in bad),
            "cadence_lo_used": cad.get("p10"),
            "shots_from_ammo_admissible": shots_admissible,
            "MISSED_admissible": len(missed_admissible),
            "MISSED_pct_admissible": round(100 * len(missed_admissible) / shots_admissible, 1)
            if shots_admissible else None,
        },
        # Measured on the UNAMBIGUOUS decrements only (window width 0: the counter was read on both
        # the last frame of the old level and the first frame of the new one, so the shot frame is
        # exact). A correct pairing gives lags >= 0 -- the counter moves on the shot frame and the
        # detector's rising edge cannot precede the blast.
        "matched_lag_exact": (lambda L: {"n": len(L), "min": min(L), "median": st.median(L),
                                         "p90": _pct(L, 90), "max": max(L),
                                         "n_negative": sum(1 for v in L if v < 0)} if L else None)(
            [s["t0"] - s["hi"] for s in slots if s["t0"] is not None and s["hi"] == s["lo"]]),
        "cadence_multiple_subcase": (
            cadence_multiple_subcase(detected_t0, slots, events, cadence) if cadence else []),
        "abstention_vs_stale": {
            "stale_mode": mode, "n_stale": n_stale, "n_good": n_good,
            "abstain_pct_given_stale": round(100 * n_stale_abst / n_stale, 1) if n_stale else None,
            "abstain_pct_given_good": round(100 * n_good_abst / n_good, 1) if n_good else None,
        },
        "missed_windows": [{"lo": s["lo"], "hi": s["hi"], "from": s["from"], "to": s["to"]}
                           for s in missed],
        "spurious_t0": spurious,
        "owner_groundtruth_gate": gate_against_owner_groundtruth(slots) if gate else None,
    }


def _missing_shots_expected(reports):
    out = []
    for r in reports:
        row = {k: r[k] for k in ("dump", "shots_from_ammo", "shots_detected_total", "MISSED",
                                 "SPURIOUS", "reload_headroom", "n_reloads")}
        row["cadence_mode"] = r["cadence_frames"]["mode"]
        row["spurious_unexplained"] = len(r["spurious_by_cause"].get("unexplained", []))
        row["MISSED_admissible"] = r["inadmissible_decrements"]["MISSED_admissible"]
        g = r.get("owner_groundtruth_gate")
        if g:
            row["gate"] = {k: g[k] for k in ("n_owner_real_shots", "n_recovered", "max_abs_offset",
                                             "n_negative_offset", "n_ammo_shots_in_span",
                                             "ammo_shots_in_span_with_no_detected_t0")}
        out.append(row)
    return out


def audit_missing_shots(ammo_paths, fps, slack, confirm, ammo_max, save_fixture=None, gate=False):
    reports, slims = [], []
    for p in ammo_paths:
        with open(p) as fh:
            ammo = json.load(fh)
        if ammo.get("refused"):
            print(f"REFUSED {p}: {ammo['refused']}")
            continue
        with open(ammo["tracks"]) as fh:
            tracks = json.load(fh)
        reports.append(missing_shots_report(ammo, tracks, fps, slack, confirm, ammo_max, gate))
        slims.append({
            "tracks": "/".join(Path(ammo["tracks"]).parts[-2:]),
            "range": ammo.get("range", [0, len(ammo["reads"])]),
            "reads": [{"i": r["i"], "ammo": r.get("ammo"), "reason": r.get("reason"),
                       "conf": r.get("conf")} for r in ammo["reads"]],
            "cross_positions": tracks["cross_positions"], "cross_confs": tracks["cross_confs"],
            "cross_rawloc": tracks["cross_rawloc"], "frame_counts": tracks.get("frame_counts", []),
        })
    out = {"params": {"fps": fps, "slack": slack, "confirm": confirm, "ammo_max": ammo_max,
                      "gate": gate},
           "dumps": reports}
    if save_fixture:
        with open(save_fixture, "w") as fh:
            json.dump({
                "_source": ("count-pellets.py --ammo-series reads + the --dump-tracks arrays they "
                            "were scored against, for the marciana (SG/Iron -- NOT "
                            "marciana-marine-study, AR/Iron) groundtruth clip. Constraint 9 "
                            "self-validation, same precedent as stale-counting-slice.json."),
                "_note": ("Pins reconstruct_ammo + ammo_shot_events + match_shots + the cadence "
                          "measurement with no images and no subprocess. Regenerate with "
                          "analyze-pellet-tracks.py --missing-shots <ammo-series.json> "
                          "--save-missing-shots-fixture."),
                "params": out["params"], "dumps": slims,
                "_expected": _missing_shots_expected(reports),
            }, fh)
        print(f"wrote missing-shots slice fixture -> {save_fixture}")
    print(json.dumps(out, indent=2))
    print("\nMISSING-SHOT CHANNEL (ammo decrements vs pellet-detected shot events)")
    print(f"{'dump':>34} {'read%':>6} {'ammo':>5} {'det':>5} {'MISS':>5} {'MISS%':>6} "
          f"{'MISSok':>6} {'SPUR':>5} {'SPUR?':>6} {'rlds':>5} {'hdrm':>5} {'bad':>4} {'cad':>4}")
    for r in reports:
        ia = r["inadmissible_decrements"]
        print(f"{r['dump'][-34:]:>34} {r['read_pct']:5.1f}% {r['shots_from_ammo']:5d} "
              f"{r['shots_detected_total']:5d} {r['MISSED']:5d} "
              f"{(r['MISSED_pct_of_ammo'] if r['MISSED_pct_of_ammo'] is not None else -1):5.1f}% "
              f"{ia['MISSED_admissible']:6d} {r['SPURIOUS']:5d} "
              f"{len(r['spurious_by_cause'].get('unexplained', [])):6d} "
              f"{r['n_reloads']:5d} {r['reload_headroom']:5d} {ia['n_events']:4d} "
              f"{str(r['cadence_frames']['mode']):>4}")
    print("MISSED and SPURIOUS are reported separately and never netted. MISSED is a LOWER BOUND: "
          "shots inside a reload-spanning abstention gap are unrecoverable (see reload_headroom, "
          "and SPUR minus SPUR? is how many of those holes were OBSERVED as detected-but-unmatched "
          "onsets). MISSok excludes the `bad` arithmetically-inadmissible decrements; SPUR? is the "
          "only column that is over-detection rather than an arbiter blind spot.")
    return out


# The two arithmetic corrections above fire on dumps the committed slice does not contain (the
# `noir` reload up-ramp, the `isabel` two-frame level flip), so they are pinned here on a hand-built
# read series reproducing both shapes rather than by carrying two more multi-megabyte slices.
RECON_LOGIC_CASES = [
    # `noir`-shaped: the counter is readable THROUGH the reload and ramps 1 -> 3 -> 6 -> 9.
    # One reload, headroom 1 (the level before the FIRST up), not three reloads and headroom 10.
    {"name": "reload-up-ramp",
     "reads": ([{"i": i, "ammo": 2} for i in range(0, 4)] + [{"i": i, "ammo": 1} for i in range(4, 8)]
               + [{"i": i, "ammo": 3} for i in range(8, 10)] + [{"i": i, "ammo": 6} for i in range(10, 12)]
               + [{"i": i, "ammo": 9} for i in range(12, 16)] + [{"i": i, "ammo": 8} for i in range(16, 20)]),
     "expect": {"decrements": 2, "shots": 2, "reloads": 1, "headroom": 1, "inadmissible": 0}},
    # `isabel`-shaped: a two-frame 8 -> 6 -> 8 glyph flip. The pre-committed rule scores it as 2
    # shots fired and a reload inside four frames; the cadence arithmetic flags the drop as
    # inadmissible (window width 0 cannot hold a second shot at a 20-frame cadence).
    {"name": "two-frame-flip",
     "reads": ([{"i": i, "ammo": 8} for i in range(0, 6)] + [{"i": i, "ammo": 6} for i in range(6, 8)]
               + [{"i": i, "ammo": 8} for i in range(8, 12)] + [{"i": i, "ammo": 7} for i in range(12, 16)]),
     "expect": {"decrements": 2, "shots": 3, "reloads": 1, "headroom": 6, "inadmissible": 1}},
]


def _recon_logic_check():
    ok = True
    for case in RECON_LOGIC_CASES:
        levels, _ = reconstruct_ammo(case["reads"])
        events = ammo_shot_events(levels)
        dec = [e for e in events if e["kind"] == "decrement"]
        rel = [e for e in events if e["kind"] == "reload"]
        got = {"decrements": len(dec), "shots": sum(e["shots"] for e in dec), "reloads": len(rel),
               "headroom": sum(e["headroom"] for e in rel),
               "inadmissible": len(flag_inadmissible_decrements(events, 20))}
        good = got == case["expect"]
        ok = ok and good
        print(f"  {case['name']}: expected {case['expect']} got {got} "
              f"{'PASS' if good else 'FAIL'}")
    return ok


def missing_shots_selftest():
    """Constraint 9 self-validation: replay the whole reconstruction over the committed slice."""
    logic_ok = _recon_logic_check()
    with open(MISSING_SHOTS_FIXTURE) as fh:
        fx = json.load(fh)
    p = fx["params"]
    reports = []
    for d in fx["dumps"]:
        ammo = {"tracks": d["tracks"], "range": d["range"], "reads": d["reads"]}
        reports.append(missing_shots_report(ammo, d, p["fps"], p["slack"], p["confirm"],
                                            p["ammo_max"], p.get("gate", False)))
    got = _missing_shots_expected(reports)
    ok = got == fx["_expected"] and logic_ok
    print(f"expected: {json.dumps(fx['_expected'], sort_keys=True)}")
    print(f"got     : {json.dumps(got, sort_keys=True)}")
    print("SELFTEST PASS" if ok else "SELFTEST FAIL")
    return 0 if ok else 1


AMMO_ABSTENTION_FIXTURE = "scripts/tests/fixtures/pellets/ammo-abstention-slice.json"

# WHICH SUBSYSTEM produced an abstention. Every entry was traced to its emission site in
# count-pellets.py and re-verified against the source on 2026-08-03 -- NOT inferred from the reason
# string, which is reused across two readers whose failures do not mean the same thing.
#
#   --ammo-series path (the mode every dump audited here was produced by):
#     'no-lock'    count-pellets.py:902 (ammo_series_from_dump) -- cross_rawloc[i] is None: the dump
#                  carries no digit-row centre for this frame, so no crop is even attempted.
#     'held-lock'  ammo_series_from_dump -- the dump's `cross_held` says this frame's position is a
#                  CARRY-FORWARD of the previous lock, and the read taken there abstained. The crop
#                  was attempted at a place this frame never measured, so the abstention is a
#                  LOCALIZATION state; the segmentation reason it would otherwise have carried is
#                  kept alongside as `seg_reason`. Only emitted for dumps written since 2026-08-03
#                  (the ones carrying `cross_held`) -- on older dumps those frames still report
#                  their segmentation reason, which is why every reason-consumer here reads
#                  `seg_reason or reason` when it wants the segmentation view.
#     'no-digits'  count-pellets.py:867 (read_ammo_at_center) -- segment_ammo_digits returned [].
#     'cell-count' count-pellets.py:867 -- SAME line: it segmented some cells but not exactly
#                  AMMO_DIGIT_CELLS (3), so the place values cannot be trusted.
#     'low-score'  count-pellets.py:877 -- all 3 cells segmented AND matched, but
#                  min(scores) < digit_score_min (0.60) (or a cell matched no glyph at all).
#   --ammo-digits (template) path, mapped so a template-produced series is never left unclassified:
#     'no-box'         count-pellets.py:794 -- no template box accepted -> LOCALIZATION.
#     'too-many-cells' count-pellets.py:800 -- >3 cells segmented   -> SEGMENTATION.
#     (that path's 'low-score' twin of :877 lives at count-pellets.py:1470.)
#
# Only GLYPH-MATCH is reachable by a better/bigger digit atlas: it is the sole class where the
# reader got three clean cells and then failed to NAME them. LOCALIZATION, HELD-LOCK and
# SEGMENTATION frames never reach the atlas at all, so no amount of glyph harvesting can convert
# them.
#
# HELD-LOCK is its own class, NOT folded into either neighbour: it is not LOCALIZATION-in-the-
# 'no-lock' sense (a position exists, it is simply the previous frame's), and calling it
# SEGMENTATION would be the exact mis-attribution this class was added to stop.
ABSTENTION_CLASS = {
    "no-lock": "LOCALIZATION",
    "no-box": "LOCALIZATION",
    "held-lock": "HELD-LOCK",
    "no-digits": "SEGMENTATION",
    "cell-count": "SEGMENTATION",
    "too-many-cells": "SEGMENTATION",
    "low-score": "GLYPH-MATCH",
}
ATLAS_FIXABLE_CLASS = "GLYPH-MATCH"

# The structural locator stores an UNNORMALISED SURROUND BRIGHTNESS in `cross_confs` (that is the
# discriminator detect_locate_mode uses). Low = the digit row sits on the dark semi-transparent
# ammo badge, i.e. the reader is on the real counter; high = it is reading a bright scene region
# the badge is not covering. 60 is a PROXY split, NOT a calibrated boundary -- it was chosen off the
# bimodal shape of the conf distribution and nothing downstream of it may be reported as measured.
AMMO_SURROUND_DARK_MAX = 60.0

# Mirrors the inline predicate segment_ammo_digits builds its mask from (count-pellets.py:713-714):
# the low-ammo counter renders its glyphs RED and every other state WHITE, and the two are SEPARATE
# pixel predicates, so a red crop is a different segmentation population, not just a recolour. The
# committed atlas already holds both (`<digit>_f*.png` and `<digit>_red*.png`, harvested via
# --atlas-tag), which is exactly why the red share of the GLYPH-MATCH bucket is the number that
# decides whether a further harvest has anything to harvest. Duplicated rather than imported
# because count-pellets.py keeps them inline; if that predicate moves, this must follow it.
AMMO_GLYPH_WHITE = (190, 190, 190)   # r,g,b all strictly above
AMMO_GLYPH_RED = (150, 90, 90)       # r above, g and b strictly below

# Frames kept per dump in the committed fixture: a CONTIGUOUS middle slice of each clip. The full
# 7-dump payload is ~1.9 MB of reads + lock arrays before the pre-commit prettier pass expands it
# (~2.7 MB after), over the fixture budget; slicing keeps every field the report reads instead of
# dropping fields it needs. 1500 x 4 + the three 480-frame clips = 7441 frames, 1.1 MB committed.
AMMO_ABSTENTION_SLICE = 1500


def _sum_counts(dicts):
    out = collections.Counter()
    for d in dicts:
        out.update(d or {})
    return dict(out)


def _ammo_lowscore_colours(ammo, tracks):
    """RED vs WHITE for every GLYPH-MATCH frame, read from the FRAMES the series was scored on.

    This needs pixels: the series JSON records the match scores but not the COLOUR of the glyphs
    that scored badly, and red-vs-white is the whole question for a digit-atlas harvest (the atlas
    holds white glyphs only, so a red frame is a genuinely unrepresented glyph while a white one is
    the atlas failing on a shape it already covers)."""
    cp = _count_pellets_module()
    frames_dir = ammo.get("frames_dir")
    if not frames_dir:
        return None
    raw = tracks["cross_rawloc"]
    templ_h = ammo.get("templ_h", 74.0)
    wr, wg, wb = AMMO_GLYPH_WHITE
    rr_, rg, rb = AMMO_GLYPH_RED
    out = {}
    for r in ammo["reads"]:
        if ABSTENTION_CLASS.get(r.get("reason")) != ATLAS_FIXABLE_CLASS:
            continue
        i = r["i"]
        center = raw[i] if i < len(raw) else None
        if center is None:
            out[i] = "NO-LOCK"
            continue
        img = cp.load_rgb(str(Path(frames_dir) / r["file"]))
        roi = cp._ammo_roi_centered(img, center, templ_h)
        red, grn, blu = roi[..., 0].astype(int), roi[..., 1].astype(int), roi[..., 2].astype(int)
        n_white = int(((red > wr) & (grn > wg) & (blu > wb)).sum())
        n_red = int(((red > rr_) & (grn < rg) & (blu < rb)).sum())
        out[i] = "RED" if n_red > n_white else ("WHITE" if n_white > 0 else "NEITHER")
    return out


def ammo_abstention_raw(ammo, tracks, dark_max=AMMO_SURROUND_DARK_MAX, colours=None):
    """RAW per-dump counts for the abstention audit. Percentages are derived separately so the
    pooled figures are a sum of counts, never an average of rounded rates."""
    reads = ammo["reads"]
    mode, _ev = detect_locate_mode(tracks)
    mask, _ = stale_mask(tracks, mode)
    if colours is not None:
        colours = {int(k): v for k, v in colours.items()}

    reasons = collections.Counter()
    pops = {"dark": collections.Counter(), "bright": collections.Counter(),
            "no_conf": collections.Counter()}
    n_read = n_read_good = n_read_stale = n_good = n_stale = 0
    no_digits_on_stale = 0
    glyph_dark = glyph_dark_red = 0
    colour_counts = collections.Counter() if colours is not None else None

    for r in reads:
        i = r["i"]
        st = bool(mask[i]) if i < len(mask) else False
        got = r.get("ammo") is not None
        reason = r.get("reason")
        conf = r.get("conf")
        dark = conf is not None and conf < dark_max
        if got:
            n_read += 1
        else:
            reasons[reason] += 1
            # `seg_reason or reason` keeps this counter meaning the same thing on both dump
            # generations: on a post-2026-08-03 dump a held frame's 'no-digits' has been
            # relabelled 'held-lock' with the original preserved, so reading `reason` alone
            # would report 0 here and look like the phenomenon vanished when only its LABEL moved.
            if (r.get("seg_reason") or reason) == "no-digits" and st:
                no_digits_on_stale += 1
            if ABSTENTION_CLASS.get(reason) == ATLAS_FIXABLE_CLASS:
                if dark:
                    glyph_dark += 1
                if colours is not None:
                    lab = colours.get(i, "UNKNOWN")
                    colour_counts[lab] += 1
                    if dark and lab == "RED":
                        glyph_dark_red += 1
        if st:
            n_stale += 1
            n_read_stale += got
        else:
            n_good += 1
            n_read_good += got
            key = "no_conf" if conf is None else ("dark" if dark else "bright")
            pops[key]["READ" if got else reason] += 1

    return {
        "stale_mode": mode,
        "n_frames": len(reads),
        # BOTH read counts are reported because they differ and the difference is the whole
        # stale-lock story: n_read_any_lock counts every frame that produced a value (a frame whose
        # ammo is non-null has ALREADY cleared the 0.60 score gate -- that is what makes it
        # non-null), while n_read_good_lock excludes the handful that landed on a HELD, stale lock.
        "n_read_any_lock": n_read,
        "n_read_good_lock": n_read_good,
        "n_read_stale_lock": n_read_stale,
        "n_good_lock": n_good,
        "n_stale_lock": n_stale,
        "reasons": dict(reasons),
        "no_digits_on_stale": no_digits_on_stale,
        "good_lock_by_surround": {k: dict(v) for k, v in pops.items()},
        "glyph_match_dark_badge": glyph_dark,
        "glyph_match_dark_badge_red": glyph_dark_red if colours is not None else None,
        "glyph_match_colour": dict(colour_counts) if colours is not None else None,
    }


def _pool_ammo_abstention_raw(raws):
    modes = {r["stale_mode"] for r in raws}
    have_colour = all(r["glyph_match_colour"] is not None for r in raws) and bool(raws)
    return {
        "stale_mode": modes.pop() if len(modes) == 1 else "mixed",
        "n_frames": sum(r["n_frames"] for r in raws),
        "n_read_any_lock": sum(r["n_read_any_lock"] for r in raws),
        "n_read_good_lock": sum(r["n_read_good_lock"] for r in raws),
        "n_read_stale_lock": sum(r["n_read_stale_lock"] for r in raws),
        "n_good_lock": sum(r["n_good_lock"] for r in raws),
        "n_stale_lock": sum(r["n_stale_lock"] for r in raws),
        "reasons": _sum_counts([r["reasons"] for r in raws]),
        "no_digits_on_stale": sum(r["no_digits_on_stale"] for r in raws),
        "good_lock_by_surround": {
            k: _sum_counts([r["good_lock_by_surround"].get(k, {}) for r in raws])
            for k in ("dark", "bright", "no_conf")},
        "glyph_match_dark_badge": sum(r["glyph_match_dark_badge"] for r in raws),
        "glyph_match_dark_badge_red": (sum(r["glyph_match_dark_badge_red"] for r in raws)
                                       if have_colour else None),
        "glyph_match_colour": (_sum_counts([r["glyph_match_colour"] for r in raws])
                               if have_colour else None),
    }


def _ammo_abstention_view(raw):
    """Derived percentages for one raw count block (a dump, or the pooled sum)."""
    n = max(1, raw["n_frames"])
    reasons = raw["reasons"]
    abst = max(1, sum(reasons.values()))
    by_class = collections.Counter()
    for k, v in reasons.items():
        by_class[ABSTENTION_CLASS.get(k, "UNCLASSIFIED")] += v
    glyph = by_class.get(ATLAS_FIXABLE_CLASS, 0)
    read = raw["n_read_any_lock"]

    surround = {}
    for k, counts in raw["good_lock_by_surround"].items():
        tot = sum(counts.values())
        rd = counts.get("READ", 0)
        surround[k] = {
            "n": tot, "n_read": rd, "read_pct": round(100 * rd / max(1, tot), 1),
            "abstentions": {kk: {"n": vv, "pct": round(100 * vv / max(1, tot), 1)}
                            for kk, vv in sorted(counts.items(), key=lambda kv: -kv[1])
                            if kk != "READ"},
        }

    view = {
        "n_frames": raw["n_frames"],
        "n_read_any_lock": read,
        "read_pct_any_lock": round(100 * read / n, 1),
        "n_read_good_lock": raw["n_read_good_lock"],
        "n_read_stale_lock": raw["n_read_stale_lock"],
        "n_abstain": sum(reasons.values()),
        "reasons": {k: {"n": v, "class": ABSTENTION_CLASS.get(k, "UNCLASSIFIED"),
                        "pct_of_frames": round(100 * v / n, 1),
                        "pct_of_abstentions": round(100 * v / abst, 1)}
                    for k, v in sorted(reasons.items(), key=lambda kv: -kv[1])},
        "by_class": {k: {"n": v, "pct_of_frames": round(100 * v / n, 1),
                         "pct_of_abstentions": round(100 * v / abst, 1)}
                     for k, v in by_class.most_common()},
        "nominal_ceiling": {
            "what": ("read% if the ENTIRE GLYPH-MATCH class became perfect reads and nothing else "
                     "changed -- the whole headroom a digit-atlas harvest could ever address"),
            "glyph_match_frames": glyph,
            "read_pct": round(100 * read / n, 1),
            "ceiling_pct": round(100 * (read + glyph) / n, 1),
            "delta_pp": round(100 * glyph / n, 1),
        },
        "stale": {
            "stale_mode": raw["stale_mode"],
            "n_stale_lock": raw["n_stale_lock"], "n_good_lock": raw["n_good_lock"],
            "pct_stale": round(100 * raw["n_stale_lock"] / n, 1),
            "read_pct_good_lock": round(
                100 * raw["n_read_good_lock"] / max(1, raw["n_good_lock"]), 1),
            "read_pct_stale_lock": round(
                100 * raw["n_read_stale_lock"] / max(1, raw["n_stale_lock"]), 1),
            "no_digits_total": reasons.get("no-digits", 0),
            "no_digits_on_stale": raw["no_digits_on_stale"],
            "no_digits_on_stale_pct": round(
                100 * raw["no_digits_on_stale"] / max(1, reasons.get("no-digits", 0)), 1),
        },
        "good_lock_by_surround": surround,
        "surround_dark_max": AMMO_SURROUND_DARK_MAX,
    }

    col = raw["glyph_match_colour"]
    if col is None:
        view["glyph_match_colour"] = None
        view["honest_ceiling"] = {
            "unavailable": ("needs the frame PNGs -- rerun with --ammo-abstention-frames (the "
                            "series JSON records match scores, not glyph colour)"),
            "dark_badge_glyph_match": raw["glyph_match_dark_badge"],
        }
    else:
        red = col.get("RED", 0)
        dark_red = raw["glyph_match_dark_badge_red"] or 0
        view["glyph_match_colour"] = dict(
            sorted(col.items(), key=lambda kv: -kv[1]),
            red_pct_of_glyph_match=round(100 * red / max(1, glyph), 1))
        view["honest_ceiling"] = {
            "what": ("GLYPH-MATCH frames that are BOTH on the dark badge AND red-dominant -- the "
                     "only population a digit-atlas harvest could operate on honestly"),
            "dark_badge_glyph_match": raw["glyph_match_dark_badge"],
            "dark_badge_red_glyph_match": dark_red,
            "pct_of_glyph_match": round(100 * dark_red / max(1, glyph), 1),
            "pct_of_all_frames": round(100 * dark_red / n, 2),
            "ceiling_pct": round(100 * (read + dark_red) / n, 1),
            "delta_pp": round(100 * dark_red / n, 2),
        }
    return view


def ammo_abstention_report(ammo, tracks, dark_max=AMMO_SURROUND_DARK_MAX, colours=None):
    """One dump's abstention audit: why the ammo reader declined each frame it declined."""
    raw = ammo_abstention_raw(ammo, tracks, dark_max, colours)
    return {"dump": "/".join(Path(ammo["tracks"]).parts[-2:]),
            "range": ammo.get("range", [0, len(ammo["reads"])]),
            "raw": raw, **_ammo_abstention_view(raw)}


def _ammo_abstention_expected(reports, pooled):
    """The slim pinned view -- counts and the headline rates, no float soup."""
    out = []
    for r in reports + [pooled]:
        raw = r["raw"]
        row = {
            "dump": r["dump"],
            "n_frames": raw["n_frames"],
            "n_read_any_lock": raw["n_read_any_lock"],
            "n_read_good_lock": raw["n_read_good_lock"],
            "n_read_stale_lock": raw["n_read_stale_lock"],
            "reasons": dict(sorted(raw["reasons"].items())),
            "by_class": {k: v["n"] for k, v in sorted(r["by_class"].items())},
            "read_pct_any_lock": r["read_pct_any_lock"],
            "nominal_ceiling_pct": r["nominal_ceiling"]["ceiling_pct"],
            "nominal_delta_pp": r["nominal_ceiling"]["delta_pp"],
            "pct_stale": r["stale"]["pct_stale"],
            "read_pct_good_lock": r["stale"]["read_pct_good_lock"],
            "read_pct_stale_lock": r["stale"]["read_pct_stale_lock"],
            "no_digits_on_stale": raw["no_digits_on_stale"],
            "dark_n": r["good_lock_by_surround"]["dark"]["n"],
            "dark_read_pct": r["good_lock_by_surround"]["dark"]["read_pct"],
            "bright_read_pct": r["good_lock_by_surround"]["bright"]["read_pct"],
            "glyph_match_dark_badge": raw["glyph_match_dark_badge"],
            "glyph_match_colour": (dict(sorted(raw["glyph_match_colour"].items()))
                                   if raw["glyph_match_colour"] else None),
            "glyph_match_dark_badge_red": raw["glyph_match_dark_badge_red"],
        }
        out.append(row)
    return out


def _print_ammo_abstention(reports, pooled):
    rows = reports + [pooled]
    seen = []
    for r in rows:
        for k in r["reasons"]:
            if k not in seen:
                seen.append(k)
    print("\nAMMO-COUNTER ABSTENTION AUDIT (why the reader declines the frames it declines)")
    print(f"{'dump':>34} {'frames':>7} {'read':>6} {'read%':>6} " +
          " ".join(f"{k:>11}" for k in seen))
    for r in rows:
        print(f"{r['dump'][-34:]:>34} {r['n_frames']:7d} {r['n_read_any_lock']:6d} "
              f"{r['read_pct_any_lock']:5.1f}% " +
              " ".join(f"{r['reasons'].get(k, {}).get('n', 0):11d}" for k in seen))
    print("\nCLASS (traced to the count-pellets.py emission site, not the reason string) "
          "-- n / %frames / %abstentions")
    classes = [c for c in ("SEGMENTATION", "GLYPH-MATCH", "LOCALIZATION", "UNCLASSIFIED")
               if any(c in r["by_class"] for r in rows)]
    print(f"{'dump':>34} " + " ".join(f"{c:>24}" for c in classes))
    for r in rows:
        cells = []
        for c in classes:
            d = r["by_class"].get(c, {"n": 0, "pct_of_frames": 0.0, "pct_of_abstentions": 0.0})
            cells.append(f"{d['n']:6d} {d['pct_of_frames']:5.1f}% {d['pct_of_abstentions']:5.1f}%")
        print(f"{r['dump'][-34:]:>34} " + " ".join(f"{c:>24}" for c in cells))
    print("\nNOMINAL CEILING (every GLYPH-MATCH frame becomes a perfect read, nothing else changes)")
    print(f"{'dump':>34} {'glyph':>6} {'read%':>7} {'ceiling%':>9} {'delta_pp':>9}")
    for r in rows:
        nc = r["nominal_ceiling"]
        print(f"{r['dump'][-34:]:>34} {nc['glyph_match_frames']:6d} {nc['read_pct']:6.1f}% "
              f"{nc['ceiling_pct']:8.1f}% {nc['delta_pp']:+9.1f}")
    print("\nSTALE-LOCK CROSS-TAB (stale = the crosshair position is a HELD carry-forward)")
    print(f"{'dump':>34} {'stale%':>7} {'read|good':>10} {'read%|good':>11} {'read|stale':>11} "
          f"{'read%|stale':>12} {'no-digits':>10} {'on stale':>9} {'share':>7}")
    for r in rows:
        s = r["stale"]
        print(f"{r['dump'][-34:]:>34} {s['pct_stale']:6.1f}% {r['n_read_good_lock']:10d} "
              f"{s['read_pct_good_lock']:10.1f}% {r['n_read_stale_lock']:11d} "
              f"{s['read_pct_stale_lock']:11.1f}% {s['no_digits_total']:10d} "
              f"{s['no_digits_on_stale']:9d} {s['no_digits_on_stale_pct']:6.1f}%")
    print(f"\nGOOD-LOCK SUB-POPULATIONS by surround brightness (conf < {AMMO_SURROUND_DARK_MAX} = "
          "dark = on the semi-transparent ammo badge). The split is a PROXY, not a calibration.")
    print(f"{'dump':>34} {'dark n':>7} {'dark read%':>11} {'dark low-score%':>16} "
          f"{'bright n':>9} {'bright read%':>13} {'bright low-score%':>18}")
    for r in rows:
        d = r["good_lock_by_surround"]["dark"]
        b = r["good_lock_by_surround"]["bright"]
        dls = d["abstentions"].get("low-score", {"pct": 0.0})["pct"]
        bls = b["abstentions"].get("low-score", {"pct": 0.0})["pct"]
        print(f"{r['dump'][-34:]:>34} {d['n']:7d} {d['read_pct']:10.1f}% {dls:15.1f}% "
              f"{b['n']:9d} {b['read_pct']:12.1f}% {bls:17.1f}%")
    print("\nGLYPH-MATCH COLOUR + HONEST CEILING (dark-badge AND red -- the only glyphs a harvest "
          "could honestly add)")
    print(f"{'dump':>34} {'glyph':>6} {'RED':>6} {'RED%':>7} {'dark':>6} {'dark&RED':>9} "
          f"{'ceiling%':>9}")
    for r in rows:
        col = r["glyph_match_colour"]
        hc = r["honest_ceiling"]
        if col is None:
            print(f"{r['dump'][-34:]:>34} {r['nominal_ceiling']['glyph_match_frames']:6d} "
                  f"{'n/a':>6} {'n/a':>7} {hc['dark_badge_glyph_match']:6d} {'n/a':>9} {'n/a':>9}")
            continue
        print(f"{r['dump'][-34:]:>34} {r['nominal_ceiling']['glyph_match_frames']:6d} "
              f"{col.get('RED', 0):6d} {col['red_pct_of_glyph_match']:6.1f}% "
              f"{hc['dark_badge_glyph_match']:6d} {hc['dark_badge_red_glyph_match']:9d} "
              f"{hc['ceiling_pct']:8.1f}%")
    if rows and rows[0]["glyph_match_colour"] is None:
        print("colour columns are n/a: rerun with --ammo-abstention-frames to read the crops.")
    print("\nn_read_any_lock counts every frame that produced a value; n_read_good_lock excludes "
          "the ones that landed on a HELD stale lock. A non-null ammo has ALREADY cleared the 0.60 "
          "score gate by construction (count-pellets.py:877), so neither figure is a "
          "'before/after thresholding' pair -- the difference is stale locks and nothing else.")


def _ammo_abstention_slim(ammo, tracks, colours):
    """A contiguous middle slice of one dump, re-indexed to 0, carrying only the fields the report
    reads. Re-indexing is exact here: the structural stale mask is elementwise, so a slice of the
    arrays gives the slice's own mask."""
    n_dump = len(tracks["cross_confs"])
    keep = min(AMMO_ABSTENTION_SLICE, n_dump)
    lo = (n_dump - keep) // 2
    hi = lo + keep
    reads = []
    for r in ammo["reads"]:
        if not (lo <= r["i"] < hi):
            continue
        slim_read = {"i": r["i"] - lo, "ammo": r.get("ammo"), "reason": r.get("reason"),
                     "conf": r.get("conf")}
        # Only present on a post-2026-08-03 series. Carried because the report reads it
        # (`no_digits_on_stale`); dropping it would make the replay disagree with the live run it
        # is supposed to pin. Omitted entirely when absent, so an older fixture keeps its shape.
        if r.get("seg_reason") is not None:
            slim_read["seg_reason"] = r["seg_reason"]
        reads.append(slim_read)
    slim = {
        "tracks": "/".join(Path(ammo["tracks"]).parts[-2:]),
        "slice": [lo, hi], "n_frames_full_clip": n_dump,
        "range": [0, hi - lo],
        "reads": reads,
        "cross_positions": tracks["cross_positions"][lo:hi],
        "cross_confs": tracks["cross_confs"][lo:hi],
        "cross_rawloc": tracks["cross_rawloc"][lo:hi],
    }
    # Same conditional-carry rule: with it, the replay's stale mask is the dump's own explicit
    # answer; without it, the elementwise inferred rule, which slices exactly as before.
    if tracks.get("cross_held") is not None:
        slim["cross_held"] = tracks["cross_held"][lo:hi]
    if colours is not None:
        slim["glyph_match_colours"] = {str(i - lo): v for i, v in colours.items() if lo <= i < hi}
    return slim


def _replay_ammo_abstention(slims, dark_max):
    """Run the report over slim/sliced dumps -- no images, no subprocess. Shared by the fixture
    WRITER and the selftest, so `_expected` can only ever be the slice's own numbers."""
    reports = []
    for d in slims:
        ammo = {"tracks": d["tracks"], "range": d["range"], "reads": d["reads"]}
        reports.append(ammo_abstention_report(ammo, d, dark_max, d.get("glyph_match_colours")))
    pooled_raw = _pool_ammo_abstention_raw([r["raw"] for r in reports])
    pooled = {"dump": "POOLED", "range": None, "raw": pooled_raw,
              **_ammo_abstention_view(pooled_raw)}
    return reports, pooled


def audit_ammo_abstention(ammo_paths, use_frames=False, dark_max=AMMO_SURROUND_DARK_MAX,
                          save_fixture=None):
    reports, raws, slims = [], [], []
    for p in ammo_paths:
        with open(p) as fh:
            ammo = json.load(fh)
        if ammo.get("refused"):
            print(f"REFUSED {p}: {ammo['refused']}")
            continue
        with open(ammo["tracks"]) as fh:
            tracks = json.load(fh)
        colours = _ammo_lowscore_colours(ammo, tracks) if use_frames else None
        rep = ammo_abstention_report(ammo, tracks, dark_max, colours)
        reports.append(rep)
        raws.append(rep["raw"])
        slims.append(_ammo_abstention_slim(ammo, tracks, colours))
    if not reports:
        print("no readable series given")
        return None
    pooled_raw = _pool_ammo_abstention_raw(raws)
    pooled = {"dump": "POOLED", "range": None, "raw": pooled_raw,
              **_ammo_abstention_view(pooled_raw)}
    out = {"params": {"dark_max": dark_max, "with_frames": bool(use_frames)},
           "dumps": reports, "pooled": pooled}
    if save_fixture:
        sl_reports, sl_pooled = _replay_ammo_abstention(slims, dark_max)
        with open(save_fixture, "w") as fh:
            json.dump({
                "_source": ("count-pellets.py --ammo-series reads + the --dump-tracks lock arrays "
                            "they were scored against, for the 7 dumps of the 2026-08-03 ammo-OCR "
                            "abstention scoping (isabel / guilty / marciana (SG/Iron -- NOT "
                            "marciana-marine-study, AR/Iron) / noir). Constraint 9 "
                            "self-validation, same precedent as missing-shots-slice.json."),
                "_note": ("SLICED, not full-clip: each dump is a contiguous MIDDLE slice of "
                          f"{AMMO_ABSTENTION_SLICE} frames (or the whole clip if shorter), "
                          "re-indexed to 0, and `_expected` pins THAT SLICE's numbers -- they are "
                          "NOT the full-clip figures the docs cite. `slice` records the source "
                          "range. Replays the whole report with no images and no subprocess: the "
                          "GLYPH-MATCH colour labels are precomputed here, so the honest ceiling "
                          "is pinned too. Regenerate with analyze-pellet-tracks.py "
                          "--ammo-abstention <ammo-series.json...> --ammo-abstention-frames "
                          "--save-ammo-abstention-fixture <path>."),
                "params": out["params"], "dumps": slims,
                "_expected": _ammo_abstention_expected(sl_reports, sl_pooled),
            }, fh)
        print(f"wrote ammo-abstention slice fixture -> {save_fixture} "
              f"({sl_pooled['n_frames']} of {pooled['n_frames']} frames; `_expected` pins the "
              f"SLICE: pooled read {sl_pooled['n_read_any_lock']} "
              f"({sl_pooled['read_pct_any_lock']}%), NOT the full-clip figures above)")
    print(json.dumps(out, indent=2))
    _print_ammo_abstention(reports, pooled)
    return out


def ammo_abstention_selftest():
    """Constraint 9 self-validation: replay the whole abstention audit over the committed slice."""
    with open(AMMO_ABSTENTION_FIXTURE) as fh:
        fx = json.load(fh)
    reports, pooled = _replay_ammo_abstention(fx["dumps"], fx["params"]["dark_max"])
    got = _ammo_abstention_expected(reports, pooled)
    ok = got == fx["_expected"]
    print(f"expected: {json.dumps(fx['_expected'], sort_keys=True)}")
    print(f"got     : {json.dumps(got, sort_keys=True)}")
    print("SELFTEST PASS" if ok else "SELFTEST FAIL")
    return 0 if ok else 1


# ======================================================= THE PERFECT-LOCK CEILING (oracle) ========
# The question --ammo-abstention leaves open: a HELD lock reads at a position this frame never
# measured, so how much of the ammo counter is the reader losing TO THE LOCK -- i.e. how much would
# a perfect localizer recover? This arm answers it by CHEATING, deliberately.
#
# THE ORACLE. For a stale frame `i`, take the digit-row centre of the nearest frame within
# `max_gap` that BOTH had a good (non-held) lock AND actually read. That is not a localizer, it is
# a lower bound on what the best possible one could deliver: the ROI is 214x124px and the box moves
# ~10-30px/frame, so at max_gap<=2 a neighbour's centre still contains the counter. Feed the stale
# frame's OWN pixels through the shipped `read_ammo_at_center` at that borrowed centre.
#
#   * if it now decodes -> the digits were there and localization was the whole loss;
#   * if it still does not -> THE DIGITS ARE NOT THERE and no localization fix can recover the
#     read, because the read already had a better centre than any localizer could have found.
#
# THE CONTROL ARM IS WHAT MAKES IT VALID, and it is not optional -- the oracle is a borrowed
# position, so before its silence on stale frames means anything, the SAME borrowed-position
# procedure has to be shown harmless on frames that already read. Apply it to good frames and it
# must (a) still decode at ~the same rate and (b) return the SAME VALUE the frame read for itself.
# If the control arm degrades, the stale arm's silence is the oracle's own error floor and says
# nothing about the digits. Both arms are always reported; neither is meaningful alone.
#
# NOT A FIX AND NOT A PROPOSAL: nothing here can ship. A real reader has no future frames and no
# read-confirmed neighbours. This measures a CEILING, and a ceiling's only job is to say whether
# the work under it is worth doing.
ORACLE_CEILING_FIXTURE = "scripts/tests/fixtures/pellets/ammo-oracle-ceiling-slice.json"
ORACLE_MAX_GAP = 2          # frames either side to borrow a centre from (see the ROI argument above)
ORACLE_CONTROL_TARGET = 300  # good frames sampled per dump for the control arm, evenly spaced
ORACLE_SLICE = 1200          # frames kept per dump in the committed fixture (see _oracle_slim)
# DECLARED SANITY GATES, not calibrated boundaries: below either of these the control arm has
# degraded enough that the stale arm is reporting the oracle's error floor rather than the frames'
# contents, and the report says so instead of quoting a stale-arm number that cannot mean what it
# looks like. Set well below the measured control performance so they FAIL LOUDLY on a real
# regression rather than tracking it.
#
# The same-value floor is not 100% deliberately. The control arm reads a frame's OWN pixels at a
# BORROWED centre, so a mismatch is an oracle-induced misread (a shifted ROI clipping a glyph), not
# a real counter change -- and the measured rate of that across the 7 committed dumps is exactly
# 1 in 2216. That is the oracle's error floor; `control_differs_detail` lists the frames so it stays
# auditable instead of being a bare count.
ORACLE_CONTROL_FLOOR_PCT = 95.0
ORACLE_CONTROL_SAME_FLOOR_PCT = 99.0
ORACLE_ATLAS_DIR = HERE / "ammo-atlas"


def _oracle_key(entry):
    """Decode identity = (frame, borrowed centre). Both matter: the same frame read at a different
    centre is a different measurement, so a memoized decode may never be reused across centres."""
    return f'{entry["i"]}@{entry["center"][0]},{entry["center"][1]}'


def _oracle_plan(ammo, tracks, max_gap=ORACLE_MAX_GAP, control_target=ORACLE_CONTROL_TARGET):
    """Assign a borrowed centre to every frame of both arms. Pure and image-free, so the fixture
    replay builds the SAME plan the live run did and a memoized decode is addressable."""
    mode, _ev = detect_locate_mode(tracks)
    mask, _ = stale_mask(tracks, mode)
    n = len(mask)
    reads = {r["i"]: r for r in ammo["reads"]}
    raw = tracks["cross_rawloc"]
    # The oracle's SOURCE population: good lock AND a value. Both conditions are load-bearing --
    # a good lock that abstained has a centre of unproven quality, and a read on a held lock has a
    # value from a position that frame never measured.
    ok = [i for i in range(n) if not mask[i] and reads.get(i, {}).get("ammo") is not None]
    okset = set(ok)

    def borrow(i):
        for k in range(1, max_gap + 1):
            for j in (i - k, i + k):          # nearest first; ties resolve to the EARLIER frame
                if j in okset and raw[j] is not None:
                    return raw[j], j
        return None, None

    stale_arm, n_no_oracle, n_no_read = [], 0, 0
    for i in range(n):
        if not mask[i]:
            continue
        if i not in reads:
            n_no_read += 1                    # frame outside the series' own --ammo-series range
            continue
        c, j = borrow(i)
        if c is None:
            n_no_oracle += 1                  # no good-lock neighbour within max_gap
            continue
        stale_arm.append({"i": i, "center": [c[0], c[1]], "ref": j, "ref_ammo": reads[j]["ammo"]})
    # Evenly-spaced control sample rather than the first N: a contiguous head would sit entirely in
    # one part of the fight and could share whatever made that stretch easy or hard to read.
    step = max(1, len(ok) // control_target)
    control_arm = []
    for i in ok[::step]:
        c, j = borrow(i)
        if c is None:
            continue
        control_arm.append({"i": i, "center": [c[0], c[1]], "ref": j, "own_ammo": reads[i]["ammo"]})
    return {"mode": mode, "n_frames": n, "n_stale": sum(mask), "n_good_lock_read": len(ok),
            "n_no_oracle": n_no_oracle, "n_outside_range": n_no_read,
            "stale": stale_arm, "control": control_arm}


def _oracle_decode(frames_dir, entries, files, templ_h, digit_score_min, n_cells, atlas):
    """Run the SHIPPED reader at each borrowed centre. The only step that needs pixels."""
    cp = _count_pellets_module()
    out = {}
    for e in entries:
        img = cp.load_rgb(str(Path(frames_dir) / files[e["i"]]))
        d = cp.read_ammo_at_center(img, tuple(e["center"]), templ_h, atlas, digit_score_min, n_cells)
        out[_oracle_key(e)] = {"ammo": d.get("ammo"), "reason": d.get("reason"),
                               "cells": d.get("cells")}
    return out


def _oracle_load_atlas(atlas_dir=None):
    cp = _count_pellets_module()
    d = str(atlas_dir or ORACLE_ATLAS_DIR)
    atlas = cp.load_digit_atlas(d)
    if not atlas:
        raise SystemExit(f"--ammo-oracle-ceiling: no digit glyphs found at {d} "
                         f"(pass --ammo-oracle-atlas)")
    return atlas


def oracle_ceiling_raw(plan, decodes, max_gap=ORACLE_MAX_GAP):
    """RAW counts for both arms. Percentages are derived separately, so pooled figures are a sum of
    counts and never an average of rounded rates (same rule as the abstention audit)."""
    stale_fail = collections.Counter()
    stale_fail_cells = collections.Counter()
    diffs = collections.Counter()
    n_dec = n_impossible = 0
    for e in plan["stale"]:
        d = decodes[_oracle_key(e)]
        if d["ammo"] is None:
            stale_fail[d["reason"]] += 1
            stale_fail_cells[f'{d["reason"]}:{d["cells"]}'] += 1
            continue
        n_dec += 1
        gap = abs(d["ammo"] - e["ref_ammo"])
        diffs[gap] += 1
        # IMPOSSIBILITY BOUND, not a tolerance: the counter falls by at most one per frame (one
        # round), and the borrowed centre is at most max_gap frames away, so a decode further than
        # max_gap from the bracketing level cannot be a real counter value -- it is a misread. This
        # is the arm's own falsifier: a ceiling built out of misreads would show up right here.
        if gap > max_gap:
            n_impossible += 1
    ctrl_fail = collections.Counter()
    ctrl_differs_detail = []
    ctrl_dec = ctrl_same = ctrl_differs = 0
    for e in plan["control"]:
        d = decodes[_oracle_key(e)]
        if d["ammo"] is None:
            ctrl_fail[d["reason"]] += 1
            continue
        ctrl_dec += 1
        if d["ammo"] == e["own_ammo"]:
            ctrl_same += 1
        else:
            ctrl_differs += 1
            ctrl_differs_detail.append({"i": e["i"], "at_borrowed_centre": d["ammo"],
                                        "own_read": e["own_ammo"], "ref": e["ref"]})
    return {
        "mode": plan["mode"], "n_frames": plan["n_frames"], "n_stale": plan["n_stale"],
        "n_good_lock_read": plan["n_good_lock_read"], "n_no_oracle": plan["n_no_oracle"],
        "n_outside_range": plan["n_outside_range"],
        "stale_n_oracled": len(plan["stale"]), "stale_n_decoded": n_dec,
        "stale_fail": dict(stale_fail), "stale_fail_cells": dict(stale_fail_cells),
        "stale_decode_gap": {str(k): v for k, v in sorted(diffs.items())},
        "stale_n_impossible": n_impossible,
        "control_n": len(plan["control"]), "control_n_decoded": ctrl_dec,
        "control_n_same_value": ctrl_same, "control_n_differs": ctrl_differs,
        "control_differs_detail": ctrl_differs_detail, "control_fail": dict(ctrl_fail),
    }


def _pool_oracle_raw(raws):
    modes = {r["mode"] for r in raws}
    ints = ("n_frames", "n_stale", "n_good_lock_read", "n_no_oracle", "n_outside_range",
            "stale_n_oracled", "stale_n_decoded", "stale_n_impossible",
            "control_n", "control_n_decoded", "control_n_same_value", "control_n_differs")
    out = {"mode": modes.pop() if len(modes) == 1 else "mixed"}
    out.update({k: sum(r[k] for r in raws) for k in ints})
    out["stale_fail"] = _sum_counts([r["stale_fail"] for r in raws])
    out["stale_fail_cells"] = _sum_counts([r["stale_fail_cells"] for r in raws])
    out["stale_decode_gap"] = _sum_counts([r["stale_decode_gap"] for r in raws])
    out["control_fail"] = _sum_counts([r["control_fail"] for r in raws])
    out["control_differs_detail"] = [d for r in raws for d in r["control_differs_detail"]]
    return out


def _oracle_view(raw):
    """Derived rates for one raw block, plus the control arm's own verdict on itself."""
    ctrl_n = max(1, raw["control_n"])
    ctrl_dec_pct = round(100 * raw["control_n_decoded"] / ctrl_n, 1)
    same_n = max(1, raw["control_n_decoded"])
    same_pct = round(100 * raw["control_n_same_value"] / same_n, 1)
    return {
        "stale_decode_pct": round(100 * raw["stale_n_decoded"] / max(1, raw["stale_n_oracled"]), 1),
        "stale_oracled_pct_of_stale": round(
            100 * raw["stale_n_oracled"] / max(1, raw["n_stale"]), 1),
        "control_decode_pct": ctrl_dec_pct,
        "control_same_value_pct": same_pct,
        # The gate the whole arm hangs on. VALID means the borrowed-position procedure was shown
        # harmless on frames that already read, so the stale arm's silence is about the FRAMES.
        "control_verdict": ("VALID" if ctrl_dec_pct >= ORACLE_CONTROL_FLOOR_PCT
                            and same_pct >= ORACLE_CONTROL_SAME_FLOOR_PCT else
                            "DEGRADED -- stale-arm figure is the oracle's error floor, not a ceiling"),
    }


def oracle_ceiling_report(name, plan, decodes, max_gap=ORACLE_MAX_GAP):
    raw = oracle_ceiling_raw(plan, decodes, max_gap)
    return {"dump": name, "raw": raw, **_oracle_view(raw)}


def _oracle_ceiling_expected(reports, pooled):
    """The pinned summary: both arms' counts per dump plus the pooled block."""
    keys = ("stale_n_oracled", "stale_n_decoded", "stale_n_impossible",
            "control_n", "control_n_decoded", "control_n_same_value", "control_n_differs")
    per = [{"dump": r["dump"], **{k: r["raw"][k] for k in keys},
            "stale_fail": r["raw"]["stale_fail"], "control_verdict": r["control_verdict"]}
           for r in reports]
    return {"per_dump": per,
            "pooled": {**{k: pooled["raw"][k] for k in keys},
                       "control_differs_detail": pooled["raw"]["control_differs_detail"],
                       "stale_fail": pooled["raw"]["stale_fail"],
                       "stale_fail_cells": pooled["raw"]["stale_fail_cells"],
                       "stale_decode_gap": pooled["raw"]["stale_decode_gap"],
                       "stale_decode_pct": pooled["stale_decode_pct"],
                       "control_decode_pct": pooled["control_decode_pct"],
                       "control_same_value_pct": pooled["control_same_value_pct"],
                       "control_verdict": pooled["control_verdict"]}}


def _print_oracle_ceiling(reports, pooled):
    print("\nPERFECT-LOCK CEILING -- what a flawless localizer could recover from HELD frames")
    print(f"{'dump':22s} {'stale':>6s} {'oracled':>8s} {'decoded':>8s} {'%':>6s} "
          f"{'ctrl n':>7s} {'ctrl dec':>9s} {'same':>6s} {'differs':>8s}")
    for r in list(reports) + [pooled]:
        w = r["raw"]
        print(f"{r['dump'][:22]:22s} {w['n_stale']:6d} {w['stale_n_oracled']:8d} "
              f"{w['stale_n_decoded']:8d} {r['stale_decode_pct']:5.1f}% {w['control_n']:7d} "
              f"{w['control_n_decoded']:9d} {w['control_n_same_value']:6d} "
              f"{w['control_n_differs']:8d}")
    pr = pooled["raw"]
    print(f"\nCONTROL ARM: {pooled['control_decode_pct']}% of already-reading frames still decode at "
          f"a BORROWED centre, {pooled['control_same_value_pct']}% of those to the SAME value "
          f"({pr['control_n_same_value']}/{pr['control_n_decoded']}) -> {pooled['control_verdict']}")
    print(f"  oracle error floor (control frames whose borrowed-centre read DIFFERS from their "
          f"own): {pr['control_differs_detail'] or 'none'}")
    print(f"STALE ARM  : {pr['stale_n_decoded']}/{pr['stale_n_oracled']} "
          f"({pooled['stale_decode_pct']}%) of held frames decode under a PERFECT lock; "
          f"{pr['n_no_oracle']} held frames had no good-lock neighbour within the gap at all")
    print(f"  failures by reason:cells  {dict(sorted(pr['stale_fail_cells'].items()))}")
    print(f"  decode vs bracketing level (|gap|): {pr['stale_decode_gap']}  "
          f"impossible (> max gap): {pr['stale_n_impossible']}")
    print("A stale frame that will not decode AT A BETTER CENTRE THAN ANY LOCALIZER COULD FIND has "
          "no digits to read;\nno localization work recovers it. That is what this arm is for.")


def _oracle_slice_bounds(n_dump, keep, stale_idx):
    """The contiguous `keep`-frame window containing the most ORACLED STALE frames.

    Not the middle slice the abstention fixture takes: held frames cluster (reloads), so a middle
    slice can contain almost none and would pin a stale arm of ~0, i.e. a fixture that exercises
    the half of the instrument nobody else covers not at all. Oracle-ability is decided within
    +-max_gap frames, so away from the two edges a full-clip oracled frame is oracled in the slice
    too -- which makes this window an exact maximiser, not a heuristic. Ties go to the earliest
    start, so the choice is deterministic."""
    if keep >= n_dump:
        return 0, n_dump
    idx = sorted(stale_idx)
    best_lo, best_n, j0 = 0, -1, 0
    for lo in range(0, n_dump - keep + 1):
        while j0 < len(idx) and idx[j0] < lo:
            j0 += 1
        j = j0
        while j < len(idx) and idx[j] < lo + keep:
            j += 1
        if j - j0 > best_n:
            best_lo, best_n = lo, j - j0
    return best_lo, best_lo + keep


def _oracle_slim(ammo, tracks, plan_full, keep=ORACLE_SLICE):
    """One dump reduced to a contiguous slice re-indexed to 0, carrying only the fields the plan
    and the report read. Returns (slim, lo) -- `lo` maps a slice index back to a frame file."""
    n_dump = len(tracks["cross_confs"])
    lo, hi = _oracle_slice_bounds(n_dump, min(keep, n_dump), [e["i"] for e in plan_full["stale"]])
    slim = {
        "tracks": "/".join(Path(ammo["tracks"]).parts[-2:]),
        "slice": [lo, hi], "n_frames_full_clip": n_dump, "range": [0, hi - lo],
        "reads": [{"i": r["i"] - lo, "ammo": r.get("ammo"), "reason": r.get("reason")}
                  for r in ammo["reads"] if lo <= r["i"] < hi],
        "cross_positions": tracks["cross_positions"][lo:hi],
        "cross_confs": tracks["cross_confs"][lo:hi],
        "cross_rawloc": tracks["cross_rawloc"][lo:hi],
    }
    if tracks.get("cross_held") is not None:
        slim["cross_held"] = tracks["cross_held"][lo:hi]
    return slim, lo


def _replay_oracle_ceiling(dumps, max_gap=ORACLE_MAX_GAP, control_target=ORACLE_CONTROL_TARGET):
    """Run both arms over slim dumps carrying MEMOIZED decodes -- no images, no subprocess. Shared
    by the fixture WRITER and the selftest, so `_expected` can only ever be the slice's own
    numbers. What it pins is the ORACLE LOGIC (neighbour selection, both arms' tallies, the
    impossibility bound); the pixel decode itself is precomputed, exactly as the abstention
    fixture precomputes its GLYPH-MATCH colour labels."""
    reports = []
    for d in dumps:
        ammo = {"tracks": d["tracks"], "range": d["range"], "reads": d["reads"]}
        plan = _oracle_plan(ammo, d, max_gap, control_target)
        reports.append(oracle_ceiling_report(d["tracks"], plan, d["decodes"], max_gap))
    pooled_raw = _pool_oracle_raw([r["raw"] for r in reports])
    pooled = {"dump": "POOLED", "raw": pooled_raw, **_oracle_view(pooled_raw)}
    return reports, pooled


def audit_oracle_ceiling(ammo_paths, max_gap=ORACLE_MAX_GAP, control_target=ORACLE_CONTROL_TARGET,
                         atlas_dir=None, save_fixture=None):
    atlas = _oracle_load_atlas(atlas_dir)
    reports, raws, slims = [], [], []
    for p in ammo_paths:
        with open(p) as fh:
            ammo = json.load(fh)
        if ammo.get("refused"):
            print(f"REFUSED {p}: {ammo['refused']}")
            continue
        with open(ammo["tracks"]) as fh:
            tracks = json.load(fh)
        files = {r["i"]: r["file"] for r in ammo["reads"]}
        templ_h = ammo.get("templ_h", 74.0)
        smin = ammo.get("digit_score_min", 0.60)
        n_cells = ammo.get("n_cells", 3)
        plan = _oracle_plan(ammo, tracks, max_gap, control_target)
        decodes = _oracle_decode(ammo["frames_dir"], plan["stale"] + plan["control"], files,
                                 templ_h, smin, n_cells, atlas)
        rep = oracle_ceiling_report("/".join(Path(p).parts[-1:]), plan, decodes, max_gap)
        reports.append(rep)
        raws.append(rep["raw"])
        if save_fixture:
            slim, lo = _oracle_slim(ammo, tracks, plan)
            sl_ammo = {"tracks": slim["tracks"], "range": slim["range"], "reads": slim["reads"]}
            sl_plan = _oracle_plan(sl_ammo, slim, max_gap, control_target)
            # Decoded against the SLICE's own plan, not filtered out of the full-clip decode: the
            # slice's borrowed centres are re-derived from the sliced arrays, so a full-clip decode
            # could be keyed to a centre the slice never asks for.
            slim["decodes"] = _oracle_decode(ammo["frames_dir"], sl_plan["stale"] + sl_plan["control"],
                                             {e["i"]: files[e["i"] + lo]
                                              for e in sl_plan["stale"] + sl_plan["control"]},
                                             templ_h, smin, n_cells, atlas)
            slims.append(slim)
    if not reports:
        print("no readable series given")
        return None
    pooled_raw = _pool_oracle_raw(raws)
    pooled = {"dump": "POOLED", "raw": pooled_raw, **_oracle_view(pooled_raw)}
    out = {"params": {"max_gap": max_gap, "control_target": control_target},
           "dumps": reports, "pooled": pooled}
    if save_fixture:
        sl_reports, sl_pooled = _replay_oracle_ceiling(slims, max_gap, control_target)
        with open(save_fixture, "w") as fh:
            json.dump({
                "_source": ("count-pellets.py --ammo-series reads + the --dump-tracks lock arrays "
                            "they were scored against, for the 7 dumps of the 2026-08-03 stale-lock "
                            "recoverability diagnosis (isabel / guilty / marciana (SG/Iron -- NOT "
                            "marciana-marine-study, AR/Iron) / noir). Constraint 9 "
                            "self-validation, same precedent as ammo-abstention-slice.json."),
                "_note": ("SLICED, not full-clip: each dump is the contiguous "
                          f"{ORACLE_SLICE}-frame window holding the most ORACLED STALE frames (or "
                          "the whole clip if shorter), re-indexed to 0, and `_expected` pins THAT "
                          "SLICE's numbers -- they are NOT the full-clip figures the docs cite. "
                          "`slice` records the source range. `decodes` memoizes the shipped "
                          "read_ammo_at_center result at each borrowed centre, so the replay needs "
                          "no frame PNGs and no digit atlas; what it pins is the ORACLE LOGIC and "
                          "both arms' tallies. Regenerate with analyze-pellet-tracks.py "
                          "--ammo-oracle-ceiling <ammo-series.json...> "
                          "--save-ammo-oracle-fixture <path>."),
                "params": out["params"], "dumps": slims,
                "_expected": _oracle_ceiling_expected(sl_reports, sl_pooled),
            }, fh)
        print(f"wrote oracle-ceiling slice fixture -> {save_fixture} "
              f"(`_expected` pins the SLICE: stale {sl_pooled['raw']['stale_n_decoded']}/"
              f"{sl_pooled['raw']['stale_n_oracled']}, control "
              f"{sl_pooled['raw']['control_n_decoded']}/{sl_pooled['raw']['control_n']}, "
              f"NOT the full-clip figures below)")
    print(json.dumps(out, indent=2))
    _print_oracle_ceiling(reports, pooled)
    return out


def oracle_ceiling_selftest():
    """Constraint 9 self-validation: replay both arms over the committed slice."""
    with open(ORACLE_CEILING_FIXTURE) as fh:
        fx = json.load(fh)
    p = fx["params"]
    reports, pooled = _replay_oracle_ceiling(fx["dumps"], p["max_gap"], p["control_target"])
    got = _oracle_ceiling_expected(reports, pooled)
    ok = got == fx["_expected"]
    # The control arm is not just reported here, it is ASSERTED: a fixture whose control arm went
    # DEGRADED would still "match" its own pinned numbers while measuring nothing.
    ctrl_ok = pooled["control_verdict"] == "VALID"
    print(f"expected: {json.dumps(fx['_expected'], sort_keys=True)}")
    print(f"got     : {json.dumps(got, sort_keys=True)}")
    print(f"control arm: {pooled['control_verdict']} "
          f"({pooled['control_decode_pct']}% decode, "
          f"{pooled['raw']['control_n_same_value']}/{pooled['raw']['control_n_decoded']} same value)")
    print("SELFTEST PASS" if ok and ctrl_ok else "SELFTEST FAIL")
    return 0 if ok and ctrl_ok else 1


# ============================================================
# THE MERGE AUDIT -- how often does `debounce_shots` fuse two shots into ONE event, how many shots
# does that actually cost, and does fixing it move `avgTotal`? (docs/probe-runs.md §8)
#
# READ-ONLY BY CONSTRUCTION. Every candidate rule below is a LOCAL scoring variant that rebuilds the
# span list inside this arm; `count-pellets.py`'s `debounce_shots` and `read-pellets.ts`'s debounce
# block are NOT touched and NOT reachable from here except through the shipped-identity assert in
# `merge_audit_selftest`, which is the arm's own control: it proves `_merge_spans(..., "shipped")`
# reproduces the shipped estimator event-for-event, so any candidate row is a difference from the
# real baseline rather than from a private re-implementation of it.
# ============================================================
MERGE_AUDIT_FIXTURE = "scripts/tests/fixtures/pellets/merge-audit-slice.json"

# Mirrors the constants `debounce_shots` hardcodes (count-pellets.py:489). Named here so the
# candidate rules can be stated against them instead of re-hardcoding the same magic numbers.
MERGE_EVENT_MIN = 3          # a frame is ACTIVE at white+red >= 3; the event opens on the first one
MERGE_MARKER_MIN = 2         # core-hit flag only; it never enters a count
MERGE_MIN_PELLETS = 5        # the post-hoc `valid` clamp `avgTotal` averages over -- NOT segmentation
MERGE_MAX_PELLETS = 10

# --- the candidate rules, none of them adopted -----------------------------------------------
# cap_cadence: force-close a running event once it has spanned this fraction of the MEASURED cadence
#              period and reopen at the same frame. ~3 LOC against the shipped loop.
MERGE_CAP_CADENCE_MULT = 0.9
# resplit    : post-pass over OVER-SPAN events only; cut at an internal rising edge of at least
#              MERGE_RESPLIT_RISE pellets over the previous frame, no two cuts closer than
#              MERGE_RESPLIT_SEP_MULT of a cadence period. The rise floor sits ABOVE the 3-pellet
#              event floor so a decay-tail wobble cannot trip it. ~10 LOC.
MERGE_RESPLIT_RISE = 5
MERGE_RESPLIT_SEP_MULT = 0.6
# candA      : the peak detector -- T[i] >= 5, T[i] - max(T[i-4..i-1]) >= 4, T[i] > T[i+1], and a
#              12-frame refractory. REFUTED (§8E); kept scoreable so it is not re-proposed.
MERGE_CANDA_MIN = 5
MERGE_CANDA_RISE = 4
MERGE_CANDA_LOOKBACK = 4
MERGE_CANDA_REFRACTORY = 12
# gap1/gap2  : tighten `debounce_shots`'s own gap tolerance to 1 / 2 frames.
MERGE_RULES = ("shipped", "cap_cadence", "resplit", "gap2", "gap1", "candA")

MERGE_AUDIT_SLICE = 1200


def _merge_max_pellet_frames(fps):
    """Mirrors read-pellets.ts's production `Math.max(4, Math.round((14 / 60) * fps))` derivation.

    ⚑ THIS IS A PER-BLOB TRACK-LIFETIME CAP, NOT AN EVENT-SPAN BUDGET. It is passed to
    count-pellets.py as `--max-pellet-frames` and read at count-pellets.py:380 (`temporal_filter`)
    and :450 (`build_tracks_and_counts`) to decide which TRACKS are pellets at all;
    `debounce_shots` never reads it, and a shot EVENT's `frames` is a different quantity in a
    different unit. It is computed here only so the census can put the two side by side and show
    the category error rather than repeat it (§8A).

    JS `Math.round` is half-UP where Python's `round` is half-to-EVEN. HISTORICAL: under the prior
    13-frame pellet-lifetime spec, (13/60)*30 = 6.5 landed exactly on that tie (7 in the shipped
    pipeline, 6 from a naive Python `round` port), which is why this uses `floor(x + 0.5)` instead
    of Python's own `round`. Under the corrected 14-frame spec, (14/60)*30 = 7.0 is not a tie in
    either language, so the trap is not currently live -- but `floor(x + 0.5)` is kept regardless,
    because it remains the correct way to reproduce JS `Math.round` at any other fps where the
    product does land on a `.5` tie."""
    return max(4, math.floor((14 / 60) * fps + 0.5))


def _merge_resplit(totals, spans, cadence):
    """Post-pass: cut an OVER-SPAN event at its internal rising edges. Untouched spans pass through."""
    sep = max(2, round(MERGE_RESPLIT_SEP_MULT * cadence))
    out = []
    for a, b in spans:
        if (b - a) <= cadence:
            out.append((a, b))
            continue
        cuts = [a]
        for j in range(a + 1, b):
            if totals[j] - totals[j - 1] >= MERGE_RESPLIT_RISE and (j - cuts[-1]) >= sep:
                cuts.append(j)
        cuts.append(b)
        out.extend(zip(cuts, cuts[1:]))
    return out


def _merge_candA_peaks(totals):
    """candA's onsets. A pure peak rule with NO minimum-duration guard -- which is its defect: a
    single-frame VFX spike is a shot to it, and the refractory then suppresses the real round
    behind it (§8E, the `guilty` f1276 case)."""
    n, peaks, last = len(totals), [], -MERGE_CANDA_REFRACTORY - 1
    for i in range(n):
        if totals[i] < MERGE_CANDA_MIN:
            continue
        prev = max(totals[max(0, i - MERGE_CANDA_LOOKBACK):i], default=0)
        if totals[i] - prev < MERGE_CANDA_RISE:
            continue
        if not (i + 1 < n and totals[i] > totals[i + 1]):
            continue
        if i - last < MERGE_CANDA_REFRACTORY:
            continue
        last = i
        peaks.append(i)
    return peaks


def _merge_spans(totals, fps, rule="shipped", cadence=None):
    """Half-open ACTIVE spans under one rule. `rule="shipped"` is a port of `debounce_shots`'s own
    grouping loop and is asserted event-for-event against it in the selftest."""
    n = len(totals)
    if rule == "candA":
        # candA detects ONSETS, not spans. Each peak carries the window up to the NEXT peak so the
        # scorecard's `avgTotal` column stays comparable: every rule's count then comes from the
        # SAME median-representative policy, and only the segmentation differs.
        peaks = _merge_candA_peaks(totals)
        return list(zip(peaks, peaks[1:] + [n]))
    max_gap = {"gap1": 1, "gap2": 2}.get(rule, max(3, round(fps * 0.13)))
    cap = round(MERGE_CAP_CADENCE_MULT * cadence) if rule == "cap_cadence" and cadence else None
    spans, event_start, zero_run = [], -1, 0
    for i in range(n + 1):
        if i < n and totals[i] >= MERGE_EVENT_MIN:
            if event_start < 0:
                event_start = i
            zero_run = 0
            if cap and (i - event_start) >= cap:
                spans.append((event_start, i))
                event_start = i
            continue
        if event_start >= 0:
            zero_run += 1
            if zero_run <= max_gap and i < n:
                continue
            spans.append((event_start, i - zero_run))
            event_start, zero_run = -1, 0
    if rule == "resplit" and cadence:
        spans = _merge_resplit(totals, spans, cadence)
    return spans


def _merge_events(frame_counts, totals, spans, policy="median"):
    """`debounce_shots`'s emission step, verbatim in behaviour: the event's count is copied from ONE
    REPRESENTATIVE FRAME -- the active frame whose total is nearest the MEDIAN of the event's active
    frames (count-pellets.py:514-536). NOTHING IS SUMMED. That is why a merge reads COLD rather than
    hot: it roughly doubles the active-frame set with the first blast's decay tail and the
    inter-shot trough, and the median falls (§8D).

    `policy` selects WHICH active frame is copied. "median" is the shipped rule and is the default,
    so every merge-audit caller is byte-identical to the pre-policy version; "p75" and "max" exist
    only for the representative-frame audit's scorecard (§9) and are never reachable from the
    shipped reader. The representative frame is RECORDED on each event, because §9's finding is
    about WHICH frame gets picked, not about the count that frame happens to carry."""
    out = []
    for a, b in spans:
        if b - a < 2:
            continue
        active = [j for j in range(a, b) if totals[j] >= MERGE_EVENT_MIN]
        if not active:
            continue
        srt = sorted(totals[j] for j in active)
        m = len(srt)
        if policy == "max":
            rep = max(active, key=lambda j: (totals[j], -j))
        else:
            if policy == "p75":
                target = srt[min(m - 1, int(math.ceil(0.75 * m)) - 1)]
            else:
                target = (srt[(m - 1) // 2] + srt[m // 2]) / 2
            rep, best = active[0], float("inf")
            for j in active:
                off = abs(totals[j] - target)
                if off < best:
                    best, rep = off, j
        red = 1 if any(frame_counts[j].get("marker", 0) >= MERGE_MARKER_MIN
                       for j in range(a, b)) else 0
        out.append({"start": a, "end": b, "frames": b - a, "rep": rep,
                    "white": frame_counts[rep]["white"],
                    "red": red, "total": frame_counts[rep]["white"] + red})
    return out


def merge_audit_raw(name, ammo, frame_counts, fps, slack):
    """One dump's RAW counts: the over-span census against BOTH denominators, the ammo-arbiter
    excess-lost count, and every candidate's scorecard. Percentages are derived separately so a
    pooled figure is a sum of counts, never an average of rounded rates."""
    totals = [r["white"] + r["red"] for r in frame_counts]
    lo, hi = ammo.get("range", [0, len(ammo["reads"])])
    levels, _dropped = reconstruct_ammo(ammo["reads"])
    events = ammo_shot_events(levels)
    cad = measure_cadence(events)
    cadence = cad["mode"] or cad["median"]
    mpf = _merge_max_pellet_frames(fps)

    shipped = [e for e in _merge_events(frame_counts, totals, _merge_spans(totals, fps, "shipped"))
               if lo <= e["start"] < hi]
    over = [e for e in shipped if cadence and e["frames"] > cadence]

    # THE ARBITER. Expand every decrement into one slot per round, then ask how many slots fall
    # inside each over-span event. A slot is INSIDE when the window its decrement happened in ENDS
    # inside the event (widened by the matcher's own slack) -- the same direction `match_shots`
    # assigns in, so the two arms cannot disagree about which shot sits where. Excess = slots - 1:
    # one slot is the event's own shot and is not lost.
    slots_all = [(e["lo"], e["hi"]) for e in events if e["kind"] == "decrement"
                 for _ in range(e["shots"])]
    inside = excess = 0
    over_detail = []
    for e in over:
        c = sum(1 for (l, h) in slots_all if e["start"] - slack <= h <= e["end"] + slack)
        inside += c
        excess += max(0, c - 1)
        over_detail.append({"start": e["start"], "frames": e["frames"], "total": e["total"],
                            "ammo_shots_inside": c})

    cands = {}
    for rule in MERGE_RULES:
        ev = [x for x in _merge_events(frame_counts, totals,
                                       _merge_spans(totals, fps, rule, cadence))
              if lo <= x["start"] < hi]
        slots, spurious = match_shots(events, [x["start"] for x in ev], slack)
        valid = [x["total"] for x in ev if MERGE_MIN_PELLETS <= x["total"] <= MERGE_MAX_PELLETS]
        cands[rule] = {
            "n_detected": len(ev), "n_ammo_shots": len(slots),
            "MISSED": sum(1 for s in slots if s["t0"] is None), "SPURIOUS": len(spurious),
            "spurious_unexplained": len(
                classify_spurious(spurious, levels, events, slack).get("unexplained", [])),
            "n_valid": len(valid), "sum_valid_total": sum(valid),
        }
    return {
        "dump": name, "fps": fps, "slack": slack, "cadence_frames": cadence,
        "max_pellet_frames": mpf,
        "n_events": len(shipped),
        "n_over_max_pellet_frames": sum(1 for e in shipped if e["frames"] > mpf),
        "n_over_cadence": len(over),
        "max_span": max((e["frames"] for e in shipped), default=0),
        "n_ammo_shots": len(slots_all),
        "arbiter_ammo_shots_inside": inside, "arbiter_excess_lost": excess,
        "over_span_shipped_total": sum(e["total"] for e in over),
        "over_span_detail": over_detail,
        "candidates": cands,
    }


def _pool_merge_raw(raws):
    ints = ("n_events", "n_over_max_pellet_frames", "n_over_cadence", "n_ammo_shots",
            "arbiter_ammo_shots_inside", "arbiter_excess_lost", "over_span_shipped_total")
    out = {k: sum(r[k] for r in raws) for k in ints}
    out.update({"dump": "POOLED", "fps": None, "slack": None, "cadence_frames": None,
                "max_pellet_frames": None,
                "max_span": max((r["max_span"] for r in raws), default=0),
                "over_span_detail": [d for r in raws for d in r["over_span_detail"]]})
    ck = ("n_detected", "n_ammo_shots", "MISSED", "SPURIOUS", "spurious_unexplained", "n_valid",
          "sum_valid_total")
    out["candidates"] = {rule: {k: sum(r["candidates"][rule][k] for r in raws) for k in ck}
                         for rule in MERGE_RULES}
    return out


def _merge_view(raw):
    """Derived rates. The two census columns are reported SIDE BY SIDE on purpose: the
    `max_pellet_frames` one is the apples-to-oranges comparison, kept visible so it is not made a
    second time."""
    n = max(1, raw["n_events"])
    cands = {}
    for rule, c in raw["candidates"].items():
        cands[rule] = {
            "MISSED_pct": round(100 * c["MISSED"] / max(1, c["n_ammo_shots"]), 1),
            "avgTotal": round(c["sum_valid_total"] / c["n_valid"], 4) if c["n_valid"] else None,
        }
    shipped_avg = cands["shipped"]["avgTotal"]
    for rule, c in cands.items():
        c["avgTotal_change"] = (round(c["avgTotal"] - shipped_avg, 4)
                                if c["avgTotal"] is not None and shipped_avg is not None else None)
    return {
        "over_cadence_pct": round(100 * raw["n_over_cadence"] / n, 1),
        "over_max_pellet_frames_pct": round(100 * raw["n_over_max_pellet_frames"] / n, 1),
        "over_span_shipped_mean_total": (
            round(raw["over_span_shipped_total"] / raw["n_over_cadence"], 4)
            if raw["n_over_cadence"] else None),
        "excess_lost_pct_of_ammo": round(
            100 * raw["arbiter_excess_lost"] / max(1, raw["n_ammo_shots"]), 1),
        "candidates": cands,
    }


def merge_audit_report(name, ammo, frame_counts, fps, slack):
    raw = merge_audit_raw(name, ammo, frame_counts, fps, slack)
    return {"dump": name, "raw": raw, **_merge_view(raw)}


def _merge_audit_expected(reports, pooled):
    """The pinned summary: the census + arbiter counts per dump, plus every candidate's scorecard."""
    keys = ("n_events", "n_over_max_pellet_frames", "n_over_cadence", "max_span", "cadence_frames",
            "max_pellet_frames", "n_ammo_shots", "arbiter_ammo_shots_inside",
            "arbiter_excess_lost", "over_span_shipped_total")
    ck = ("MISSED", "SPURIOUS", "spurious_unexplained", "n_detected", "n_valid", "sum_valid_total")
    def block(r):
        return {**{k: r["raw"][k] for k in keys},
                "candidates": {rule: {k: r["raw"]["candidates"][rule][k] for k in ck}
                               for rule in MERGE_RULES}}
    return {"per_dump": [{"dump": r["dump"], **block(r)} for r in reports],
            "pooled": {**block(pooled), "over_cadence_pct": pooled["over_cadence_pct"],
                       "over_max_pellet_frames_pct": pooled["over_max_pellet_frames_pct"],
                       "over_span_shipped_mean_total": pooled["over_span_shipped_mean_total"],
                       "excess_lost_pct_of_ammo": pooled["excess_lost_pct_of_ammo"],
                       "candidate_view": pooled["candidates"]}}


def _print_merge_audit(reports, pooled):
    print("\nOVER-SPAN CENSUS -- one event that spans more than a whole cadence period had two "
          "shots' room")
    print(f"{'dump':22s} {'events':>7s} {'cad':>4s} {'>cadence':>9s} {'%':>6s} "
          f"{'mpf':>4s} {'>mpf':>6s} {'%':>6s} {'maxspan':>8s}")
    for r in list(reports) + [pooled]:
        w = r["raw"]
        print(f"{r['dump'][:22]:22s} {w['n_events']:7d} {str(w['cadence_frames']):>4s} "
              f"{w['n_over_cadence']:9d} {r['over_cadence_pct']:5.1f}% "
              f"{str(w['max_pellet_frames']):>4s} {w['n_over_max_pellet_frames']:6d} "
              f"{r['over_max_pellet_frames_pct']:5.1f}% {w['max_span']:8d}")
    print("⚑ `>mpf` IS THE CATEGORY ERROR, PRINTED SO IT IS NOT MADE AGAIN: max_pellet_frames is a "
          "PER-BLOB\n  TRACK-LIFETIME cap (count-pellets.py:380/:450) that debounce_shots never "
          "reads, and `frames` is a\n  PER-EVENT span. `>cadence` is the comparison that means "
          "something.")
    pr = pooled["raw"]
    print(f"\nAMMO ARBITER -- shots actually lost to merging: {pr['arbiter_excess_lost']} of "
          f"{pr['n_ammo_shots']} ({pooled['excess_lost_pct_of_ammo']}%), from "
          f"{pr['arbiter_ammo_shots_inside']} ammo shots inside {pr['n_over_cadence']} over-span "
          f"events")
    print("  ⚑ FLOOR, not a total: the arbiter is blind to a magazine-emptying round (the counter "
          "is blank\n  through the reload animation), so a merge that swallows one is invisible to "
          "it.")
    print(f"\nCANDIDATE SCORECARD -- shipped `avgTotal` {pooled['candidates']['shipped']['avgTotal']}"
          f", over-span shipped mean total {pooled['over_span_shipped_mean_total']}")
    print(f"{'rule':14s} {'MISSED':>7s} {'%':>6s} {'SPUR?':>6s} {'detected':>9s} {'valid':>6s} "
          f"{'avgTotal':>9s} {'change':>8s}")
    for rule in MERGE_RULES:
        c, v = pr["candidates"][rule], pooled["candidates"][rule]
        print(f"{rule:14s} {c['MISSED']:7d} {v['MISSED_pct']:5.1f}% {c['spurious_unexplained']:6d} "
              f"{c['n_detected']:9d} {c['n_valid']:6d} {str(v['avgTotal']):>9s} "
              f"{str(v['avgTotal_change']):>8s}")
    print("SPUR? is the unexplained spurious count -- the only over-detection column; the rest of "
          "SPURIOUS is\nthe arbiter's own blind spot. `avgTotal` is over the 5..10 `valid` clamp, "
          "so a rule that splits an\nevent into two sub-5 pieces removes it from the average "
          "entirely.")


def _merge_slim(ammo, frame_counts, fps, slack, over_idx, keep=MERGE_AUDIT_SLICE):
    """One dump reduced to the contiguous `keep`-frame window holding the most OVER-SPAN events,
    re-indexed to 0. `frame_counts` and `reads` are stored as compact tuples: an object per frame
    costs ~10x as much once the pre-commit prettier pass expands it, and the fixture budget is the
    binding constraint on how many dumps this can cover."""
    n_dump = len(frame_counts)
    lo, hi = _oracle_slice_bounds(n_dump, min(keep, n_dump), over_idx)
    return {
        "tracks": "/".join(Path(ammo["tracks"]).parts[-2:]),
        "fps": fps, "slack": slack, "slice": [lo, hi], "n_frames_full_clip": n_dump,
        "range": [0, hi - lo],
        "reads": [[r["i"] - lo, r.get("ammo")] for r in ammo["reads"] if lo <= r["i"] < hi],
        "frame_counts": [[c["white"], c["red"], c.get("marker", 0)] for c in frame_counts[lo:hi]],
    }


def _expand_frame_counts_row(row):
    """A compact `frame_counts` fixture/dump row is `[white, red, marker]`, or, once the source
    dump carries the `band` channel (docs/handoffs/2026-08-04-dump-band-LANDING-PLAN.md), `[white,
    red, marker, band]`. A 3-wide row means `band` is UNKNOWN and the key is OMITTED from the
    returned dict -- NEVER defaulted to 0 -- because `has_band` (count-pellets.py:598) tests key
    PRESENCE, not truthiness: a fabricated `band: 0` would flip a pre-hybrid replay onto the
    hybrid path with an all-zero band series."""
    w, r, m, *rest = row
    d = {"white": w, "red": r, "marker": m}
    if rest:
        d["band"] = rest[0]
    return d


def _merge_expand(d):
    """Compact fixture tuples -> the dict shapes the report reads."""
    fc = [_expand_frame_counts_row(row) for row in d["frame_counts"]]
    ammo = {"tracks": d["tracks"], "range": d["range"],
            "reads": [{"i": i, "ammo": a} for i, a in d["reads"]]}
    return ammo, fc


def _replay_merge_audit(dumps):
    """Run the whole arm over slim dumps -- no images, no subprocess, no tracks.json. Shared by the
    fixture WRITER and the selftest, so `_expected` can only ever be the slice's own numbers."""
    reports = []
    for d in dumps:
        ammo, fc = _merge_expand(d)
        reports.append(merge_audit_report(d["tracks"], ammo, fc, d["fps"], d["slack"]))
    pooled_raw = _pool_merge_raw([r["raw"] for r in reports])
    return reports, {"dump": "POOLED", "raw": pooled_raw, **_merge_view(pooled_raw)}


def _merge_shipped_identity(frame_counts, fps):
    """THE CONTROL: `_merge_spans(..., "shipped")` + `_merge_events` must reproduce the SHIPPED
    `debounce_shots` event for event. If it does not, every candidate row below is a difference
    from a private re-implementation instead of from the real baseline, and the arm measures
    nothing."""
    cp = _count_pellets_module()
    shipped, _summary = cp.debounce_shots(frame_counts, fps)
    totals = [r["white"] + r["red"] for r in frame_counts]
    mine = _merge_events(frame_counts, totals, _merge_spans(totals, fps, "shipped"))
    keys = ("start", "frames", "white", "red", "total")
    return ([{k: s[k] for k in keys} for s in shipped] == [{k: s[k] for k in keys} for s in mine])


def audit_merge(ammo_paths, fps_list, slack_list, save_fixture=None):
    reports, raws, slims = [], [], []
    for k, p in enumerate(ammo_paths):
        with open(p) as fh:
            ammo = json.load(fh)
        if ammo.get("refused"):
            print(f"REFUSED {p}: {ammo['refused']}")
            continue
        with open(ammo["tracks"]) as fh:
            tracks = json.load(fh)
        frame_counts = tracks.get("frame_counts") or []
        if not frame_counts:
            print(f"SKIPPED {p}: its tracks.json carries no `frame_counts` "
                  "(re-dump with count-pellets.py --dump-tracks)")
            continue
        fps = fps_list[k] if len(fps_list) > 1 else fps_list[0]
        slack = slack_list[k] if len(slack_list) > 1 else slack_list[0]
        if not _merge_shipped_identity(frame_counts, fps):
            raise SystemExit(f"--merge-audit: the shipped-identity control FAILED on {p}. The "
                             "local span rebuild no longer reproduces debounce_shots, so no "
                             "candidate row would be a difference from the real baseline.")
        rep = merge_audit_report("/".join(Path(p).parts[-1:]), ammo, frame_counts, fps, slack)
        reports.append(rep)
        raws.append(rep["raw"])
        if save_fixture:
            slims.append(_merge_slim(ammo, frame_counts, fps, slack,
                                     [d["start"] for d in rep["raw"]["over_span_detail"]]))
    if not reports:
        print("no readable series given")
        return None
    pooled_raw = _pool_merge_raw(raws)
    pooled = {"dump": "POOLED", "raw": pooled_raw, **_merge_view(pooled_raw)}
    out = {"params": {"fps": fps_list, "slack": slack_list, "rules": list(MERGE_RULES)},
           "dumps": reports, "pooled": pooled}
    if save_fixture:
        sl_reports, sl_pooled = _replay_merge_audit(slims)
        with open(save_fixture, "w") as fh:
            json.dump({
                "_source": ("count-pellets.py --ammo-series reads + the `frame_counts` of the "
                            "--dump-tracks dump they were scored against, for the 2026-08-04 "
                            "merge audit (isabel / guilty / marciana (SG/Iron -- NOT "
                            "marciana-marine-study, AR/Iron) / noir). Constraint 9 "
                            "self-validation, same precedent as ammo-oracle-ceiling-slice.json."),
                "_note": ("SLICED, not full-clip: each dump is the contiguous "
                          f"{MERGE_AUDIT_SLICE}-frame window holding the most OVER-SPAN events (or "
                          "the whole clip if shorter), re-indexed to 0, and `_expected` pins THAT "
                          "SLICE's numbers -- they are NOT the full-clip figures docs/probe-runs.md "
                          "§8 cites. `slice` records the source range. `reads` are [i, ammo] and "
                          "`frame_counts` are [white, red, marker] tuples to survive the prettier "
                          "pass at this many frames. Regenerate with analyze-pellet-tracks.py "
                          "--merge-audit <ammo-series.json...> --save-merge-audit-fixture <path>."),
                "params": out["params"], "dumps": slims,
                "_expected": _merge_audit_expected(sl_reports, sl_pooled),
            }, fh)
        pc = sl_pooled["raw"]["candidates"]
        print(f"wrote merge-audit slice fixture -> {save_fixture} (`_expected` pins the SLICE: "
              f"{sl_pooled['raw']['n_over_cadence']}/{sl_pooled['raw']['n_events']} over-span, "
              f"excess {sl_pooled['raw']['arbiter_excess_lost']}, shipped MISSED "
              f"{pc['shipped']['MISSED']}, NOT the full-clip figures below)")
    print(json.dumps(out, indent=2))
    _print_merge_audit(reports, pooled)
    return out


def merge_audit_selftest():
    """Constraint 9 self-validation: replay the whole arm over the committed slice, and assert the
    shipped-identity control on every dump in it."""
    with open(MERGE_AUDIT_FIXTURE) as fh:
        fx = json.load(fh)
    reports, pooled = _replay_merge_audit(fx["dumps"])
    got = _merge_audit_expected(reports, pooled)
    ok = got == fx["_expected"]
    ident = all(_merge_shipped_identity(_merge_expand(d)[1], d["fps"]) for d in fx["dumps"])
    print(f"expected: {json.dumps(fx['_expected'], sort_keys=True)}")
    print(f"got     : {json.dumps(got, sort_keys=True)}")
    print(f"shipped-identity control: {'PASS' if ident else 'FAIL'} "
          f"(local span rebuild == count-pellets.py debounce_shots on all "
          f"{len(fx['dumps'])} slices)")
    print("SELFTEST PASS" if ok and ident else "SELFTEST FAIL")
    return 0 if ok and ident else 1


# ============================================================
# THE REPRESENTATIVE-FRAME AUDIT -- WHICH FRAME does `debounce_shots` copy its count from, and is
# that frame the pellet cohort or the muzzle flash in front of it? (docs/probe-runs.md §9)
#
# READ-ONLY BY CONSTRUCTION, same contract as the merge audit above: every policy here is a LOCAL
# scoring variant routed through `_merge_events(..., policy=...)`, whose "median" arm is the shipped
# rule and is asserted event-for-event against count-pellets.py's own `debounce_shots` by
# `_merge_shipped_identity` before any row is scored. `count-pellets.py` and `read-pellets.ts` are
# not touched and not reachable from here.
#
# The arm has two halves, deliberately, because they fail differently:
#   LABELLED   (n=5, the owner's f8-11 hand count) -- decomposes each shot's owner pellets into
#              never-detected / filter-rejected / lifetime-gated / radius-gated / countable, then
#              asks how many of the reader's reported pellets at the REPRESENTATIVE frame are owner
#              pellets at all. Small n; its value is that it is CATEGORICAL (which frame), not a
#              mean.
#   NO-LABELS  (n=852 events over 5 dumps) -- the in-event track-LIFETIME histogram, which is
#              bimodal without any hand count, plus the per-policy `avgTotal` and `valid`-clamp
#              table. This is what makes the finding STRONG MECHANISTIC rather than n=5.
# ============================================================
REP_AUDIT_FIXTURE = "scripts/tests/fixtures/pellets/representative-audit-slice.json"
# The owner's hand count and the owner-drawn centroids for the same crops. Both are already
# committed and were labelled independently of anything here -- they are the audit's ground truth,
# and re-deriving them was never on the table (CLAUDE.md reuse-before-derive).
REP_LABEL_COUNTS = "scripts/tests/fixtures/pellets/groundtruth-f8-11.json"
REP_LABEL_POSITIONS = "scripts/tests/fixtures/pellets/groundtruth-f8-11-positions.json"
# score-pellets.py's committed detector-fidelity slice: does a pellet the owner labelled survive
# min_area / min_circ at all? Reused here instead of re-measuring the filters (§9E).
REP_FIDELITY_FIXTURE = "scripts/tests/fixtures/pellets/real-fidelity-slice.json"

REP_POLICIES = ("median", "p75", "max")
# The kit ceiling. `hitsPerShot` is 10 for marciana (SG/Iron -- NOT marciana-marine-study, AR/Iron,
# which is 1), isabel, guilty and noir in data/characters.json, so any event reading above 10 is
# over-counting by construction, whatever produced it.
REP_HITS_PER_SHOT = 10
# The offsets score-pellets.py measures at 100% raw-found AND 100% both-pass, i.e. the frames where
# a missing link is a LINKING failure and cannot be a detection failure. f11 is excluded: the same
# fixture puts it at 88%/79% (the fade has started).
REP_LINK_OFFSETS = (8, 9, 10)
REP_LINK_TOL = 8.0          # px, owner centroid -> track centroid; the residuals land well inside
REP_CROP_HALF = 184         # count-pellets.py crop_disc half-width; crop (x,y) -> full (x0+x, y0+y)
# A pellet cohort's track lifetime at 60 fps. Scaled by fps/60 for the 30 fps dumps -- the point of
# ⚑ NOT-fps-scaled below is precisely that a raw frame count is not comparable across dumps.
REP_OWNER_LIFE_LO_60FPS = 8
REP_WINDOW_PAD = 32         # frames of margin around the labelled t0 span before quiet-snapping


def _rep_xy(track, fi):
    k = fi - track["first"]
    return track["xs"][k], track["ys"][k]


def _rep_alive(track, fi):
    return track["first"] <= fi <= track["last"]


def _rep_in_radius(track, fi, cross, radius, offset=0):
    """The SHIPPED counting gate (count-pellets.py's results loop): a non-red pellet track is
    counted on a frame when its centroid is within `pellet_radius` of THAT FRAME's crosshair."""
    if not _rep_alive(track, fi):
        return False
    k = fi - offset
    if not 0 <= k < len(cross):
        return False
    cp = cross[k]
    if cp is None:
        return False
    x, y = _rep_xy(track, fi)
    return math.hypot(x - cp[0], y - cp[1]) <= radius


def _rep_ever_in_radius(track, cross, radius, offset=0):
    return any(_rep_in_radius(track, fi, cross, radius, offset)
               for fi in range(track["first"], track["last"] + 1))


def _rep_by_frame(tracks):
    out = {}
    for t in tracks:
        for fi in range(t["first"], t["last"] + 1):
            out.setdefault(fi, []).append(t)
    return out


def _rep_quiet_window(totals, t0s, fps, pad=REP_WINDOW_PAD):
    """A slice whose HEAD and TAIL both sit inside a quiet run at least `max_gap + 1` frames long.
    That is the condition under which `debounce_shots` segments the slice exactly as it segments the
    full clip around every labelled shot -- without it, a slice boundary can cut an event in half
    and the fixture would pin an artefact of the slicing."""
    max_gap = max(3, round(fps * 0.13))
    need = max_gap + 1
    n = len(totals)

    def quiet(a, b):
        return all(totals[j] < MERGE_EVENT_MIN for j in range(max(0, a), min(n, b)))

    lo = max(0, min(t0s) - pad)
    while lo > 0 and not quiet(lo, lo + need):
        lo += 1
    hi = min(n, max(t0s) + pad)
    while hi < n and not quiet(hi - need, hi):
        hi += 1
    return lo, hi


def _rep_load_labels():
    with open(REP_LABEL_COUNTS) as fh:
        counts = json.load(fh)
    with open(REP_LABEL_POSITIONS) as fh:
        positions = json.load(fh)
    pos_by_shot = {s["shot"]: s for s in positions["shots"]}
    shots = []
    for s in counts["shots"]:
        if s.get("t0") is None:
            continue        # shot 0 is the owner-confirmed false positive: no blast onset at all
        shots.append({"shot": s["shot"], "t0": s["t0"], "owner": s["white"],
                      "locate": s["locate"], "frames": pos_by_shot[s["shot"]]["frames"]})
    return shots


def _rep_label_window_counts(shots):
    """⚑ THE PREMISE CORRECTION, computed rather than asserted (§9A). The owner's number is a hand
    count of the markers visible in the f8-11 window, and the positions file carries the SAME count
    on all four of those frames. It is therefore a WINDOW-CONDITIONAL observation, not a per-shot
    landed total -- owner and reader are both single-window observers who differ in WHICH window."""
    out = []
    for s in shots:
        per_frame = [f["n_shapes"] for f in s["frames"]]
        out.append({"shot": s["shot"], "owner": s["owner"], "per_frame": per_frame,
                    "flat": len(set(per_frame)) == 1 and per_frame[0] == s["owner"]})
    return out


def _score_pellets_module():
    """Import score-pellets.py in-process for the SAME reason count-pellets.py is imported above:
    its fidelity cascade is the shipped scorer, and a second copy here would be a second place to
    drift. Nothing at its module scope runs anything."""
    global _SP_MODULE
    if _SP_MODULE is None:
        spec = importlib.util.spec_from_file_location("score_pellets", HERE / "score-pellets.py")
        _SP_MODULE = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(_SP_MODULE)
    return _SP_MODULE


def _rep_filter_fidelity():
    """§9E: of the owner-labelled pellet instances, what fraction is found raw, and what fraction
    survives min_area AND min_circ, at each offset? Scored by score-pellets.py's OWN cascade over
    its OWN committed slice -- reused, not re-measured (CLAUDE.md reuse-before-derive: an existing
    labelled artifact IS the independent method).

    ⚑ That fixture holds ONLY f8-11 crops -- no peak frame, no plateau, no full event -- so it can
    speak to detection and to the two filters and to NOTHING ELSE in this arm. In particular it
    cannot say whether a marker appeared and faded before f08."""
    try:
        with open(REP_FIDELITY_FIXTURE) as fh:
            fx = json.load(fh)
    except FileNotFoundError:
        return None
    report = _score_pellets_module().compute_real_fidelity_cascade(fx["sequences"])
    keep = ("n_labeled_pellet_frame_instances", "raw_found", "raw_found_pct", "passes_both",
            "passes_both_pct")
    return {
        "per_instance": {k: report["per_instance"][k] for k in keep},
        "n_distinct_pellets": report["per_distinct_pellet"]["n_distinct_pellets"],
        "per_offset": [{"offset": row["offset"], **{k: row[k] for k in keep}}
                       for row in report["per_offset"]],
    }


def _rep_owner_links(shot, by_frame, cross_crop, offset):
    """Owner centroid -> track, by consensus over the 100%-detection offsets.

    `cross_crop` is the crosshair track the shot's CROPS WERE CUT WITH (the label file's own
    `locate` field decides: structural for shots 1/2/3/5, template for shot 4). That is a different
    question from which crosshair the READER counts against, and conflating the two is exactly the
    shot-4 mislock this arm has to keep separable."""
    votes, residuals = {}, {}
    for f in shot["frames"]:
        name = f["frame"]
        if not (name.startswith("f") and name[1:3].isdigit()):
            continue
        if int(name[1:3]) not in REP_LINK_OFFSETS:
            continue
        fi = int(name.split("idx")[1].split(".")[0])
        k = fi - offset
        if not 0 <= k < len(cross_crop) or cross_crop[k] is None:
            continue
        cx, cy = cross_crop[k]
        x0, y0 = max(int(cx) - REP_CROP_HALF, 0), max(int(cy) - REP_CROP_HALF, 0)
        cands = by_frame.get(fi, [])
        for pi, (px, py) in enumerate(f["positions"]):
            fx, fy = x0 + px, y0 + py
            best, bd = None, float("inf")
            for t in cands:
                tx, ty = _rep_xy(t, fi)
                dist = math.hypot(tx - fx, ty - fy)
                if dist < bd:
                    bd, best = dist, t
            if best is not None and bd <= REP_LINK_TOL:
                votes.setdefault(pi, []).append(best["id"])
                residuals[pi] = max(residuals.get(pi, 0.0), bd)
    links = {pi: max(set(v), key=v.count) for pi, v in votes.items()}
    return links, residuals


def _rep_decompose(shot, links, tracks_by_id, event, cross_count, radius, offset, reader_white):
    """Where does each owner pellet go, and what is the reader actually reporting in its place?

    `cross_count` is the SHIPPED structural crosshair for every shot including 4 -- because that is
    what the reader counts against no matter which geometry the crops were cut with. The shot-4
    re-run under the template crosshair is a separate call (§9C)."""
    ids = sorted(set(links.values()))
    tracks = [tracks_by_id[i] for i in ids]
    life_rej = [t for t in tracks if not t["is_pellet"]]
    passed = [t for t in tracks if t["is_pellet"]]
    countable = [t for t in passed if _rep_ever_in_radius(t, cross_count, radius, offset)]
    rad_rej = [t for t in passed if t not in countable]

    best_n, best_f = 0, None
    for fi in range(event["start"] - 6, event["end"] + 6):
        c = sum(1 for t in countable if _rep_in_radius(t, fi, cross_count, radius, offset))
        if c > best_n:
            best_n, best_f = c, fi
    rep = event["rep"]
    rep_owner = sum(1 for t in countable if _rep_in_radius(t, rep, cross_count, radius, offset))
    return {
        "shot": shot["shot"], "t0": shot["t0"], "owner": shot["owner"],
        "linked": len(links), "distinct_tracks": len(ids),
        "never_detected": shot["owner"] - len(links),
        "life_gate_rejected": len(life_rej), "radius_gate_rejected": len(rad_rej),
        "countable": len(countable),
        "max_coexisting_countable": best_n, "max_coexisting_frame": best_f,
        "rep_frame": rep, "rep_offset": rep - shot["t0"],
        "rep_owner": rep_owner, "rep_non_owner": reader_white - rep_owner,
        "reader_white": reader_white,
    }


def _rep_peak(shot, links, tracks_by_id, event, totals, frame_counts,
              cross_count, radius, offset):
    """Is the PEAK frame the cohort or the flash? Scored by how much of the peak's white count links
    to an owner pellet -- the check that refutes `max` and, with it, p75 (§9D)."""
    active = [j for j in range(event["start"], event["end"]) if totals[j] >= MERGE_EVENT_MIN]
    peak = max(active, key=lambda j: (totals[j], -j))
    ids = sorted(set(links.values()))
    matched = sum(1 for i in ids
                  if tracks_by_id[i]["is_pellet"]
                  and _rep_in_radius(tracks_by_id[i], peak, cross_count, radius, offset))
    white = frame_counts[peak - offset]["white"]
    return {"shot": shot["shot"], "peak_frame": peak, "peak_offset": peak - shot["t0"],
            "peak_white": white, "owner_matched": matched, "unmatched": white - matched}


def _rep_trajectory(shot, links, tracks_by_id, event, frame_counts, cross_count, radius, offset):
    """The per-frame anatomy of one event: the two-phase structure, with the representative frame
    marked. This is the row that shows the rule sampling a mixture."""
    ids = sorted(set(links.values()))
    tracks = [tracks_by_id[i] for i in ids]
    t0 = shot["t0"]
    lo = min(event["start"], t0 - 4)
    hi = max(event["end"] + 3, t0 + 15)
    rows = []
    for fi in range(lo, hi):
        k = fi - offset
        if not 0 <= k < len(frame_counts):
            continue
        alive = [t for t in tracks if _rep_alive(t, fi)]
        pellets = [t for t in alive if t["is_pellet"]]
        inr = [t for t in pellets if _rep_in_radius(t, fi, cross_count, radius, offset)]
        white = frame_counts[k]["white"]
        rows.append({"frame": fi, "offset": fi - t0, "dumped_white": white,
                     "owner_alive": len(alive), "owner_pellet_alive": len(pellets),
                     "owner_counted": len(inr), "other_white": white - len(inr),
                     "is_rep": fi == event["rep"], "is_t0": fi == t0,
                     "in_f8_11": 8 <= fi - t0 <= 11})
    return {"shot": shot["shot"], "rows": rows}


def _rep_lifetimes(shot, links, tracks, event, cross_phys, radius, offset):
    """THE DISCRIMINATOR. Owner-pellet track lifetimes vs the lifetimes of every OTHER non-red track
    the reader would count inside the same event.

    `cross_phys` is the crosshair that describes where the pellets PHYSICALLY were (template for
    shot 4), because this half is about the population, not about what the reader did with it."""
    owner_ids = set(links.values())
    non = []
    for t in tracks:
        if t["id"] in owner_ids:
            continue
        if t["last"] < event["start"] or t["first"] >= event["end"]:
            continue
        if any(_rep_in_radius(t, fi, cross_phys, radius, offset)
               for fi in range(max(t["first"], event["start"]),
                               min(t["last"] + 1, event["end"]))):
            non.append(t["life"])
    # An owner track is owner because it was LINKED to an owner-drawn centroid, not because it was
    # in radius on some frame -- otherwise shot 4's radius mislock would empty the owner column of
    # the very cohort whose lifetimes are the point.
    own = [t["life"] for t in tracks if t["id"] in owner_ids]
    return {"shot": shot["shot"], "owner_lives": sorted(own), "non_owner_lives": sorted(non)}


def _rep_white_reconstruction(tracks, frame_counts, cross, radius, offset, window):
    """Control: recompute each frame's WHITE count from the tracks alone and compare it to the count
    the dump recorded. If this does not reproduce, every row above is built on a track model that
    does not match the counter, and the arm measures nothing.

    Scored over `window` only -- the range every non-red track overlapping it is carried in FULL
    for. Outside it the slice keeps coordinates but not the complete track set, so a mismatch there
    would be an artefact of the slicing rather than a property of the counter."""
    lo, hi = window
    by_frame = _rep_by_frame([t for t in tracks if t["is_pellet"]])
    checked = mismatched = 0
    detail = []
    for fi in range(lo, hi):
        got = sum(1 for t in by_frame.get(fi, [])
                  if _rep_in_radius(t, fi, cross, radius, offset))
        checked += 1
        if got != frame_counts[fi - offset]["white"]:
            mismatched += 1
            detail.append([fi, got, frame_counts[fi - offset]["white"]])
    return {"frames_checked": checked, "mismatched": mismatched, "detail": detail[:40]}


def _rep_policy_table(frame_counts, fps):
    """Per-policy `avgTotal`, raw and under the shipped 5..10 `valid` clamp. The clamp is the reason
    the median policy's headline number reads WARMER than what it actually counts (§9F)."""
    totals = [r["white"] + r["red"] for r in frame_counts]
    spans = _merge_spans(totals, fps, "shipped")
    out = {}
    for policy in REP_POLICIES:
        ev = _merge_events(frame_counts, totals, spans, policy)
        tot = [e["total"] for e in ev]
        valid = [x for x in tot if MERGE_MIN_PELLETS <= x <= MERGE_MAX_PELLETS]
        out[policy] = {"n_events": len(tot), "sum_raw": sum(tot),
                       "below_min": sum(1 for x in tot if x < MERGE_MIN_PELLETS),
                       "above_ceiling": sum(1 for x in tot if x > REP_HITS_PER_SHOT),
                       "n_valid": len(valid), "sum_valid": sum(valid)}
    return out


def _rep_lifetime_census(radius_tracks, frame_counts, fps, max_pellet_frames):
    """THE NO-LABELS ARM. For every shipped event in a dump, the lifetime histogram of the non-red
    tracks the reader would count inside it, plus how many of them fall in the owner-pellet lifetime
    band. Needs no hand count and no owner time -- which is what lets it run on 852 events."""
    totals = [r["white"] + r["red"] for r in frame_counts]
    events = _merge_events(frame_counts, totals, _merge_spans(totals, fps, "shipped"))
    lo = max(1, round(REP_OWNER_LIFE_LO_60FPS * fps / 60.0))
    hist = collections.Counter()
    counts = []
    for e in events:
        n = 0
        for life, runs in radius_tracks:
            # counted INSIDE the event = at least one COUNTED frame lands in [start, end)
            if not any(s < e["end"] and s + ln > e["start"] for s, ln in runs):
                continue
            hist[life] += 1
            if lo <= life <= max_pellet_frames:
                n += 1
        counts.append(n)
    ordered = sorted(counts)
    # Is either `valid`-clamp bound MOTIVATED? Split the band count by which side of the clamp the
    # event's shipped total falls on: a `>10` event carrying ~6-9 long-lived tracks is over-counting
    # and the upper bound is doing real work; a `<5` event carrying ~3-4 of them is a genuine low
    # reading being thrown away, and the lower bound is not (§9F).
    buckets = {}
    for label, keep in (("below_min", lambda x: x < MERGE_MIN_PELLETS),
                        ("valid", lambda x: MERGE_MIN_PELLETS <= x <= MERGE_MAX_PELLETS),
                        ("above_ceiling", lambda x: x > REP_HITS_PER_SHOT)):
        rows = [(e["total"], n) for e, n in zip(events, counts) if keep(e["total"])]
        buckets[label] = {
            "n_events": len(rows),
            "mean_rep_total": round(sum(r[0] for r in rows) / len(rows), 2) if rows else None,
            "mean_band_tracks": round(sum(r[1] for r in rows) / len(rows), 2) if rows else None,
        }
    return {
        "n_events": len(counts), "life_band": [lo, max_pellet_frames],
        "sum_band": sum(counts), "median_band": ordered[len(ordered) // 2] if ordered else None,
        "above_ceiling": sum(1 for x in counts if x > REP_HITS_PER_SHOT),
        "zero": sum(1 for x in counts if x == 0),
        "clamp_buckets": buckets,
        "histogram": {str(k): v for k, v in sorted(hist.items())},
    }


def _rep_radius_runs(track, cross, radius, offset=0):
    """A track reduced to the RUNS of frames on which the shipped radius gate counts it. This is the
    only pre-applied reduction in the fixture: the raw `xs`/`ys` of 33k tracks per 5700-frame dump
    do not fit the fixture budget, whereas the runs do. The LABELLED block keeps the raw
    coordinates, so the gate itself stays auditable from the fixture alone."""
    runs = []
    for fi in range(track["first"], track["last"] + 1):
        if _rep_in_radius(track, fi, cross, radius, offset):
            if runs and runs[-1][0] + runs[-1][1] == fi:
                runs[-1][1] += 1
            else:
                runs.append([fi, 1])
        # a gap simply starts a new run on the next hit
    return runs


# ---------------------------------------------------------------- the two halves, assembled

def _rep_labelled_report(block, shots, fidelity):
    """The n=5 half. Everything here is computed from the block's RAW track coordinates, so the
    radius gate, the linking and the reconstruction control are all auditable from the fixture."""
    params = block["params"]
    radius = params["pellet_radius"]
    offset = block["offset"]
    fps = block["fps"]
    cross = [tuple(c) if c else None for c in block["cross"]]
    cross_tmpl = [tuple(c) if c else None for c in block["cross_tmpl"]]
    frame_counts = [_expand_frame_counts_row(row) for row in block["frame_counts"]]
    tracks = [{"id": tid, "first": first, "last": first + len(xs) - 1, "life": len(xs),
               "is_pellet": bool(isp), "xs": xs, "ys": ys}
              for tid, first, isp, xs, ys in block["tracks_raw"]]
    tracks_by_id = {t["id"]: t for t in tracks}
    by_frame = _rep_by_frame(tracks)

    # Everything below is in ABSOLUTE clip frame indices, because the owner labels are (`idx1068`)
    # and so are the track spans. Only the segmentation runs in slice coordinates, and its events
    # are shifted back up immediately. It runs over `event_window`, whose head and tail are quiet --
    # NOT over the whole stored range, which is widened to carry every overlapping track in full.
    ev_lo, ev_hi = block["event_window"]
    window_counts = frame_counts[ev_lo - offset:ev_hi - offset]
    totals_slice = [r["white"] + r["red"] for r in window_counts]
    events = _merge_events(window_counts, totals_slice,
                           _merge_spans(totals_slice, fps, "shipped"))
    events = [{**e, "start": e["start"] + ev_lo, "end": e["end"] + ev_lo,
               "rep": e["rep"] + ev_lo} for e in events]
    totals = {k + offset: r["white"] + r["red"] for k, r in enumerate(frame_counts)}

    premise = _rep_label_window_counts(shots)
    decomp, peaks, lifes, traj, links_by_shot = [], [], [], [], {}
    for s in shots:
        ev = next((e for e in events if e["start"] <= s["t0"] < e["end"]), None)
        if ev is None:
            raise SystemExit(f"--representative-audit: labelled shot {s['shot']} (t0={s['t0']}) "
                             "falls in no shipped event; the slice boundary cut it.")
        crop_cross = cross_tmpl if s["locate"] == "template" else cross
        links, resid = _rep_owner_links(s, by_frame, crop_cross, offset)
        links_by_shot[s["shot"]] = links
        decomp.append({**_rep_decompose(s, links, tracks_by_id, ev, cross, radius, offset,
                                        ev["white"]),
                       "max_link_residual_px": round(max(resid.values()), 2) if resid else None,
                       "one_to_one": len(set(links.values())) == len(links) == s["owner"]})
        peaks.append(_rep_peak(s, links, tracks_by_id, ev, totals, frame_counts, cross,
                               radius, offset))
        # the PHYSICAL geometry for the population question; the SHIPPED one for what the reader did
        lifes.append(_rep_lifetimes(s, links, tracks, ev, crop_cross, radius, offset))
        traj.append(_rep_trajectory(s, links, tracks_by_id, ev, frame_counts, cross, radius,
                                    offset))

    # ⚑ The shot the label file itself marks `locate: "template"` re-scored under the crosshair its
    # crops were actually cut with. The whole radius-gate residual on it is that mislock, and this
    # is the row that proves it rather than asserting it.
    tmpl, tmpl_traj = [], []
    for s in shots:
        if s["locate"] != "template":
            continue
        ev = next(e for e in events if e["start"] <= s["t0"] < e["end"])
        tmpl.append(_rep_decompose(s, links_by_shot[s["shot"]], tracks_by_id, ev, cross_tmpl,
                                   radius, offset, ev["white"]))
        tmpl_traj.append(_rep_trajectory(s, links_by_shot[s["shot"]], tracks_by_id, ev,
                                         frame_counts, cross_tmpl, radius, offset))

    owner_lives = sorted(x for row in lifes for x in row["owner_lives"])
    non_lives = sorted(x for row in lifes for x in row["non_owner_lives"])
    band_lo = max(1, round(REP_OWNER_LIFE_LO_60FPS * fps / 60.0))
    tot = {k: sum(row[k] for row in decomp) for k in
           ("owner", "linked", "never_detected", "life_gate_rejected", "radius_gate_rejected",
            "countable", "max_coexisting_countable", "rep_owner", "rep_non_owner", "reader_white")}
    return {
        "premise_window_counts": premise,
        "decomposition": decomp,
        "decomposition_total": tot,
        "coexistence_equals_countable": all(
            row["max_coexisting_countable"] == row["countable"] for row in decomp),
        "template_relock": tmpl,
        "corrected_countable_total": sum(
            (next((r["countable"] for r in tmpl if r["shot"] == row["shot"]), row["countable"]))
            for row in decomp),
        "peaks": peaks,
        "peak_total": {"peak_white": sum(p["peak_white"] for p in peaks),
                       "owner_matched": sum(p["owner_matched"] for p in peaks),
                       "unmatched": sum(p["unmatched"] for p in peaks),
                       "shots_zero_matched": sum(1 for p in peaks if p["owner_matched"] == 0)},
        "lifetimes": lifes,
        "lifetime_summary": {
            "band_lo": band_lo,
            "owner_n": len(owner_lives), "owner_min": min(owner_lives) if owner_lives else None,
            "owner_max": max(owner_lives) if owner_lives else None,
            "owner_histogram": {str(k): v for k, v in
                                sorted(collections.Counter(owner_lives).items())},
            "non_owner_n": len(non_lives),
            "non_owner_below_band": sum(1 for x in non_lives if x < band_lo),
            "non_owner_at_or_above_band": sorted(x for x in non_lives if x >= band_lo),
            "non_owner_histogram": {str(k): v for k, v in
                                    sorted(collections.Counter(non_lives).items())},
        },
        "trajectories": traj,
        "trajectories_relock": tmpl_traj,
        "white_reconstruction": _rep_white_reconstruction(tracks, frame_counts, cross, radius,
                                                          offset, (ev_lo, ev_hi)),
        "filter_fidelity": fidelity,
        "params": params, "fps": fps, "slice": [offset, offset + len(frame_counts)],
        "event_window": [ev_lo, ev_hi],
    }


def _rep_dump_report(name, frame_counts, radius_tracks, fps, max_pellet_frames):
    return {"dump": name, "fps": fps, "max_pellet_frames": max_pellet_frames,
            "policies": _rep_policy_table(frame_counts, fps),
            "lifetimes": _rep_lifetime_census(radius_tracks, frame_counts, fps,
                                              max_pellet_frames)}


_REP_POLICY_KEYS = ("n_events", "sum_raw", "below_min", "above_ceiling", "n_valid", "sum_valid")


def _rep_pool_policies(reports):
    return {policy: {k: sum(r["policies"][policy][k] for r in reports) for k in _REP_POLICY_KEYS}
            for policy in REP_POLICIES}


def _rep_policy_view(row):
    raw = round(row["sum_raw"] / row["n_events"], 4) if row["n_events"] else None
    clamped = round(row["sum_valid"] / row["n_valid"], 4) if row["n_valid"] else None
    return {"avgTotal_raw": raw, "avgTotal_clamped": clamped,
            "clamp_effect": round(clamped - raw, 4) if raw is not None
            and clamped is not None else None,
            "above_ceiling_pct": round(100 * row["above_ceiling"] / row["n_events"], 1)
            if row["n_events"] else None}


def _rep_expand_dump(d):
    fc = [_expand_frame_counts_row(row) for row in d["frame_counts"]]
    tracks = [(life, [(flat[i], flat[i + 1]) for i in range(0, len(flat), 2)])
              for life, flat in d["radius_tracks"]]
    return fc, tracks


def _replay_representative_audit(fx):
    """Run the whole arm over the committed slice -- no images, no subprocess, no tracks.json.
    Shared by the fixture WRITER and the selftest, so `_expected` can only ever be the slice's own
    numbers."""
    shots = _rep_load_labels()
    labelled = _rep_labelled_report(fx["labelled"], shots, _rep_filter_fidelity())
    reports = []
    for d in fx["dumps"]:
        fc, tracks = _rep_expand_dump(d)
        reports.append(_rep_dump_report(d["tracks"], fc, tracks, d["fps"],
                                        d["max_pellet_frames"]))
    pooled = _rep_pool_policies(reports)
    return labelled, reports, pooled


def _rep_series(traj):
    """One event's per-frame counted-owner series, pinned as a list. This is the CATEGORICAL form of
    §9's finding -- where in the series the representative frame lands -- and it is what a candidate
    rule should be scored against, because it has an unambiguous right answer per shot."""
    return {"shot": traj["shot"], "first_offset": traj["rows"][0]["offset"],
            "rep_offset": next(r["offset"] for r in traj["rows"] if r["is_rep"]),
            "series": [r["owner_counted"] for r in traj["rows"]]}


def _rep_expected(labelled, reports, pooled):
    """The pinned summary. Deliberately the CATEGORICAL rows first -- which frame the rule picks,
    how much of the peak is unmatched, where the lifetime bands sit -- because those are what §9
    rests on; the means come last and are the weakest column."""
    dec_keys = ("shot", "owner", "linked", "never_detected", "life_gate_rejected",
                "radius_gate_rejected", "countable", "max_coexisting_countable", "rep_offset",
                "rep_owner", "rep_non_owner", "reader_white")
    ls = labelled["lifetime_summary"]
    return {
        "premise": [{"shot": p["shot"], "owner": p["owner"], "per_frame": p["per_frame"],
                     "flat": p["flat"]} for p in labelled["premise_window_counts"]],
        "decomposition": [{**{k: row[k] for k in dec_keys}, "one_to_one": row["one_to_one"]}
                          for row in labelled["decomposition"]],
        "decomposition_total": labelled["decomposition_total"],
        "coexistence_equals_countable": labelled["coexistence_equals_countable"],
        "template_relock": [{k: row[k] for k in dec_keys} for row in labelled["template_relock"]],
        "corrected_countable_total": labelled["corrected_countable_total"],
        "peaks": [{k: p[k] for k in ("shot", "peak_offset", "peak_white", "owner_matched",
                                     "unmatched")} for p in labelled["peaks"]],
        "peak_total": labelled["peak_total"],
        "lifetime_summary": {k: ls[k] for k in
                             ("band_lo", "owner_n", "owner_min", "owner_max", "owner_histogram",
                              "non_owner_n", "non_owner_below_band", "non_owner_at_or_above_band",
                              "non_owner_histogram")},
        "counted_owner_series": [_rep_series(t) for t in labelled["trajectories"]],
        "counted_owner_series_relock": [_rep_series(t)
                                        for t in labelled["trajectories_relock"]],
        "white_reconstruction": {k: labelled["white_reconstruction"][k]
                                 for k in ("frames_checked", "mismatched")},
        "filter_fidelity": labelled["filter_fidelity"],
        "per_dump": [{"dump": r["dump"], "fps": r["fps"],
                      "max_pellet_frames": r["max_pellet_frames"],
                      "policies": r["policies"], "lifetimes": r["lifetimes"]} for r in reports],
        "pooled_policies": pooled,
        "pooled_policy_view": {p: _rep_policy_view(pooled[p]) for p in REP_POLICIES},
    }


def _print_representative_audit(labelled, reports, pooled):
    print("\n⚑ PREMISE -- the owner's label is a WINDOW count, not a per-shot landed total")
    print(f"{'shot':>5s} {'owner':>6s} {'f08 f09 f10 f11':>17s}  identical on all four?")
    for p in labelled["premise_window_counts"]:
        print(f"{p['shot']:5d} {p['owner']:6d} {str(p['per_frame']):>17s}  {p['flat']}")
    print("  ⇒ owner and reader are BOTH single-window observers; they differ in WHICH window. Any\n"
          "  'landed pellets per shot' figure derived from this label is window-conditional.")

    print("\nPER-SHOT DECOMPOSITION -- where each owner pellet goes, and what the reader reports "
          "instead")
    print(f"{'shot':>4s} {'owner':>5s} {'nodet':>5s} {'filt':>4s} {'life':>4s} {'rad':>4s} "
          f"{'cntbl':>5s} {'coex':>4s} {'rep@':>5s} {'rep_own':>7s} {'rep_non':>7s} "
          f"{'reader':>6s} {'link_px':>7s}")
    for row in labelled["decomposition"]:
        print(f"{row['shot']:4d} {row['owner']:5d} {row['never_detected']:5d} {0:4d} "
              f"{row['life_gate_rejected']:4d} {row['radius_gate_rejected']:4d} "
              f"{row['countable']:5d} {row['max_coexisting_countable']:4d} "
              f"{row['rep_offset']:+5d} {row['rep_owner']:7d} {row['rep_non_owner']:7d} "
              f"{row['reader_white']:6d} {str(row['max_link_residual_px']):>7s}")
    tot = labelled["decomposition_total"]
    print(f"{'TOT':>4s} {tot['owner']:5d} {tot['never_detected']:5d} {0:4d} "
          f"{tot['life_gate_rejected']:4d} {tot['radius_gate_rejected']:4d} {tot['countable']:5d} "
          f"{tot['max_coexisting_countable']:4d} {'':5s} {tot['rep_owner']:7d} "
          f"{tot['rep_non_owner']:7d} {tot['reader_white']:6d}")
    print(f"  sums: owner {tot['owner']} = {tot['never_detected']} + 0 + "
          f"{tot['life_gate_rejected']} + {tot['radius_gate_rejected']} + {tot['countable']}   |   "
          f"reader {tot['reader_white']} = {tot['rep_owner']} owner + {tot['rep_non_owner']} "
          f"non-owner")
    print(f"  ⇒ OF THE {tot['reader_white']} PELLETS THE READER REPORTS, {tot['rep_owner']} ARE "
          f"OWNER PELLETS. The mean agreement is\n  a large under-count cancelling a large "
          f"over-count, not a measurement of the right quantity.")
    print(f"  `filt` (min_area/min_circ) is 0 by construction here -- every owner pellet linked to "
          f"a track,\n  and score-pellets.py's own fidelity slice puts the two filters at 100% "
          f"pass on f08/f09/f10.")
    print(f"  coexistence: max SIMULTANEOUSLY-visible countable == total countable on every shot: "
          f"{labelled['coexistence_equals_countable']}\n  ⇒ the cohort does NOT fade "
          f"asynchronously, so a single plateau frame can see all of it at once.")

    for row in labelled["template_relock"]:
        print(f"\n  ⚑ shot {row['shot']} re-scored under the TEMPLATE crosshair its crops were cut "
              f"with: radius-rejected\n  {row['radius_gate_rejected']}, countable "
              f"{row['countable']}, coexisting {row['max_coexisting_countable']} -- the whole "
              f"residual on that shot is the documented mislock.")
    print(f"  corrected countable across all shots: {labelled['corrected_countable_total']} vs "
          f"owner {tot['owner']}")

    print("\nIS THE PEAK FRAME SIGNAL? -- how much of the peak's white links to an owner pellet")
    print(f"{'shot':>4s} {'peak@':>6s} {'white':>6s} {'matched':>8s} {'unmatched':>10s}")
    for p in labelled["peaks"]:
        print(f"{p['shot']:4d} {p['peak_offset']:+6d} {p['peak_white']:6d} {p['owner_matched']:8d} "
              f"{p['unmatched']:10d}")
    pt = labelled["peak_total"]
    print(f"{'TOT':>4s} {'':6s} {pt['peak_white']:6d} {pt['owner_matched']:8d} "
          f"{pt['unmatched']:10d}  ({pt['shots_zero_matched']} of "
          f"{len(labelled['peaks'])} peaks are 100% unmatched)")
    print("  ⇒ the PEAK is the muzzle flash. `max` -- and p75, which leans on it -- is refuted; the "
          "median's\n  RATIONALE (avoid the peak) survives. What fails is WHICH frame the median "
          "lands on.")

    print("\nPER-FRAME ANATOMY -- countable owner pellets in radius, per frame (`R` = the "
          "representative frame)")
    for t in labelled["trajectories"]:
        cells = []
        for r in t["rows"]:
            mark = "R" if r["is_rep"] else ("|" if r["is_t0"] else " ")
            cells.append(f"{r['owner_counted']}{mark}")
        first = t["rows"][0]["offset"]
        print(f"  shot {t['shot']} (t0{first:+d} ->): " + " ".join(cells))
    for t in labelled["trajectories_relock"]:
        cells = []
        for r in t["rows"]:
            mark = "R" if r["is_rep"] else ("|" if r["is_t0"] else " ")
            cells.append(f"{r['owner_counted']}{mark}")
        print(f"  shot {t['shot']} RELOCKED (t0{t['rows'][0]['offset']:+d} ->): " + " ".join(cells))
    print("  a run of 0s then a flat plateau = the two-phase event: blast/flash first, cohort "
          "second.\n  An `R` inside the leading 0s is the rule sampling the flash. The RELOCKED row "
          "is the same shot\n  under the crosshair its crops were cut with -- its plateau is real, "
          "the shipped row's zeros are the\n  mislock.")

    print("\nTHE DISCRIMINATOR -- track LIFETIME, not frame magnitude")
    ls = labelled["lifetime_summary"]
    print(f"  owner pellets      n={ls['owner_n']:4d}  min={ls['owner_min']} max={ls['owner_max']}"
          f"  histogram {ls['owner_histogram']}")
    print(f"  non-owner in-event n={ls['non_owner_n']:4d}  below band(<{ls['band_lo']}): "
          f"{ls['non_owner_below_band']}  at/above band: {ls['non_owner_at_or_above_band']}")
    print(f"                     histogram {ls['non_owner_histogram']}")
    print("  ⇒ the two populations do not overlap in the band. This is the property the no-labels "
          "arm below\n  replicates without any hand count.")

    wr = labelled["white_reconstruction"]
    print(f"\nCONTROL -- white recomputed from tracks == the dump's own count on "
          f"{wr['frames_checked'] - wr['mismatched']}/{wr['frames_checked']} frames")
    if wr["detail"]:
        print(f"  mismatches (frame, recomputed, dumped): {wr['detail']}")
    fid = labelled["filter_fidelity"]
    if fid:
        print(f"\nDETECTION + FILTERS COST ZERO (score-pellets.py's own slice, "
              f"{fid['per_instance']['n_labeled_pellet_frame_instances']} instances / "
              f"{fid['n_distinct_pellets']} pellets)")
        for row in fid["per_offset"]:
            print(f"  f{row['offset']:02d}  raw_found {100 * row['raw_found_pct']:5.1f}%  "
                  f"both_pass {100 * row['passes_both_pct']:5.1f}%")
        print("  ⚑ f8-11 ONLY -- no peak, no plateau, no full event. It cannot say whether a marker "
              "appeared\n  and faded before f08; settling that needs owner labels at the plateau "
              "frame.")

    print("\nTHE NO-LABELS ARM -- in-event track-lifetime census, 0 hand counts, 0 owner time")
    print(f"{'dump':34s} {'fps':>5s} {'events':>7s} {'band':>8s} {'mean':>6s} {'median':>6s} "
          f"{'>ceil':>6s} {'%':>6s} {'zero':>5s}")
    for r in reports:
        lf = r["lifetimes"]
        mean = lf["sum_band"] / lf["n_events"] if lf["n_events"] else float("nan")
        pct = 100 * lf["above_ceiling"] / lf["n_events"] if lf["n_events"] else float("nan")
        print(f"{r['dump'][:34]:34s} {r['fps']:5.0f} {lf['n_events']:7d} "
              f"{str(lf['life_band']):>8s} {mean:6.2f} {str(lf['median_band']):>6s} "
              f"{lf['above_ceiling']:6d} {pct:5.1f}% {lf['zero']:5d}")
    for r in reports:
        print(f"  {r['dump'][:34]:34s} lifetime histogram {r['lifetimes']['histogram']}")
    print(f"  every histogram is BIMODAL: a 1-2 frame VFX mode and a separate mode at the "
          f"owner-pellet lifetime\n  (10-11 at 60 fps, 5-6 at 30 fps -- the correct half). "
          f"Counting only the band keeps >{REP_HITS_PER_SHOT}\n  to a few percent.")

    print(f"\nPOLICY + `valid` CLAMP -- pooled over {pooled['median']['n_events']} events")
    print(f"{'policy':8s} {'raw avgTotal':>13s} {'<5':>5s} {'>10':>5s} {'clamped n':>10s} "
          f"{'clamped avgTotal':>17s} {'clamp effect':>13s}")
    for policy in REP_POLICIES:
        row, view = pooled[policy], _rep_policy_view(pooled[policy])
        print(f"{policy:8s} {view['avgTotal_raw']:13.4f} {row['below_min']:5d} "
              f"{row['above_ceiling']:5d} {row['n_valid']:10d} {view['avgTotal_clamped']:17.4f} "
              f"{view['clamp_effect']:+13.4f}")
    over = pooled["max"]["above_ceiling"]
    print(f"  `max` puts {over}/{pooled['max']['n_events']} events above the kit ceiling of "
          f"{REP_HITS_PER_SHOT} -- physically impossible.")
    print("\nIS EITHER CLAMP BOUND MOTIVATED? -- band tracks actually present, by clamp bucket")
    print(f"{'dump':34s} {'bucket':14s} {'events':>7s} {'mean rep total':>15s} "
          f"{'mean band tracks':>17s}")
    for r in reports:
        for label, row in r["lifetimes"]["clamp_buckets"].items():
            print(f"{r['dump'][:34]:34s} {label:14s} {row['n_events']:7d} "
                  f"{str(row['mean_rep_total']):>15s} {str(row['mean_band_tracks']):>17s}")
    print("  UPPER bound MOTIVATED: `>10` events carry far fewer long-lived tracks than they report."
          "\n  LOWER bound NOT motivated: `<5` events carry a genuinely small number of them, so "
          "clamping\n  them out of `avgTotal` biases the shipped median WARM.")


def _rep_slim_labelled(tracks_path, tmpl_path, fps, shots):
    """The labelled clip reduced to one contiguous window holding all five labelled events, with
    RAW `xs`/`ys` retained.

    TWO ranges, and the distinction matters. `event_window` is the quiet-snapped range the
    segmentation runs over; the STORED range is that window widened to cover every kept track in
    full, so no track's `life` is ever truncated by the slicing and the white-reconstruction control
    over `event_window` is exact. Red tracks are dropped outright: count-pellets.py routes them to
    the red/marker channels and they can never enter a WHITE count."""
    with open(tracks_path) as fh:
        dump = json.load(fh)
    with open(tmpl_path) as fh:
        tmpl = json.load(fh)
    frame_counts, cross = dump["frame_counts"], dump["cross_positions"]
    totals = [r["white"] + r["red"] for r in frame_counts]
    lo, hi = _rep_quiet_window(totals, [s["t0"] for s in shots], fps)
    kept = [t for t in dump["tracks"]
            if not t["is_red"] and t["last"] >= lo and t["first"] < hi]
    cov_lo = min([lo] + [t["first"] for t in kept])
    cov_hi = max([hi] + [t["last"] + 1 for t in kept])
    return {
        "tracks": "/".join(Path(tracks_path).parts[-2:]),
        "tracks_tmpl": "/".join(Path(tmpl_path).parts[-2:]),
        "fps": fps, "offset": cov_lo, "slice": [cov_lo, cov_hi], "event_window": [lo, hi],
        "n_frames_full_clip": len(frame_counts),
        "params": {k: dump["params"][k] for k in
                   ("pellet_radius", "center_exclude", "min_area", "max_area", "min_circ",
                    "max_pellet_frames") if k in dump["params"]},
        "cross": cross[cov_lo:cov_hi],
        "cross_tmpl": tmpl["cross_positions"][cov_lo:cov_hi],
        "frame_counts": [[c["white"], c["red"], c.get("marker", 0)]
                         for c in frame_counts[cov_lo:cov_hi]],
        "tracks_raw": [[t["id"], t["first"], 1 if t["is_pellet"] else 0, t["xs"], t["ys"]]
                       for t in kept],
    }


def _rep_slim_dump(name, dump, fps):
    """One dump reduced to what the no-labels arm reads: the full `frame_counts` (the events must be
    the WHOLE clip's, or the pooled figures would be a slice artefact) plus, per non-red track that
    the shipped radius gate ever counts, its lifetime and the RUNS of frames it is counted on."""
    frame_counts, cross = dump["frame_counts"], dump["cross_positions"]
    radius = dump["params"]["pellet_radius"]
    out = []
    for t in dump["tracks"]:
        if t["is_red"]:
            continue
        track = {"first": t["first"], "last": t["last"], "xs": t["xs"], "ys": t["ys"]}
        runs = _rep_radius_runs(track, cross, radius)
        if runs:
            out.append([t["life"], [v for run in runs for v in run]])
    return {"tracks": name, "fps": fps,
            "max_pellet_frames": dump["params"]["max_pellet_frames"],
            # 3-wide [white, red, marker] when the source dump carries no `band` key (band
            # UNKNOWN), 4-wide [white, red, marker, band] when it does -- never a fabricated
            # `band: 0` (docs/handoffs/2026-08-04-dump-band-LANDING-PLAN.md §2).
            "frame_counts": [[c["white"], c["red"], c.get("marker", 0)] + (
                [c["band"]] if "band" in c else []) for c in frame_counts],
            "radius_tracks": out}


def _rep_full_clip_reconstruction(dump):
    """The SAME control as `_rep_white_reconstruction`, run over the WHOLE live clip rather than the
    committed window. Live-run only: the fixture cannot carry 11k tracks, so `_expected` pins the
    window figure and this is the number the full-clip citation in §9 comes from -- exactly the
    split the merge audit uses between its slice and its full-clip figures."""
    tracks = [{"id": t["id"], "first": t["first"], "last": t["last"], "life": t["life"],
               "is_pellet": t["is_pellet"], "xs": t["xs"], "ys": t["ys"]}
              for t in dump["tracks"] if not t["is_red"]]
    frame_counts = dump["frame_counts"]
    return _rep_white_reconstruction(tracks, frame_counts, dump["cross_positions"],
                                     dump["params"]["pellet_radius"], 0,
                                     (0, len(frame_counts)))


def audit_representative(tracks_paths, fps_list, labelled_path, labelled_tmpl_path, labelled_fps,
                         save_fixture=None):
    fixture = {"labelled": None, "dumps": []}
    shots = _rep_load_labels()
    for k, p in enumerate(tracks_paths):
        with open(p) as fh:
            dump = json.load(fh)
        if not dump.get("frame_counts"):
            print(f"SKIPPED {p}: no `frame_counts` (re-dump with count-pellets.py --dump-tracks)")
            continue
        fps = fps_list[k] if len(fps_list) > 1 else fps_list[0]
        if not _merge_shipped_identity(dump["frame_counts"], fps):
            raise SystemExit(f"--representative-audit: the shipped-identity control FAILED on {p}. "
                             "The local span rebuild no longer reproduces debounce_shots, so no "
                             "row below would be a difference from the real baseline.")
        fixture["dumps"].append(_rep_slim_dump("/".join(Path(p).parts[-2:]), dump, fps))
    full_clip = None
    if labelled_path:
        fixture["labelled"] = _rep_slim_labelled(labelled_path, labelled_tmpl_path, labelled_fps,
                                                 shots)
        with open(labelled_path) as fh:
            full_clip = _rep_full_clip_reconstruction(json.load(fh))
    if not fixture["dumps"] or fixture["labelled"] is None:
        print("--representative-audit needs at least one dump AND --representative-audit-labelled")
        return None
    labelled, reports, pooled = _replay_representative_audit(fixture)
    if save_fixture:
        with open(save_fixture, "w") as fh:
            json.dump({
                "_source": ("count-pellets.py --dump-tracks output for the 2026-08-04 "
                            "representative-frame audit: the 60 fps marciana (SG/Iron -- NOT "
                            "marciana-marine-study, AR/Iron) ground-truth clip that the owner's "
                            "f8-11 hand count was drawn on, plus the four structural dumps "
                            "(marciana (SG/Iron) / isabel / guilty / noir) the no-labels arm pools. "
                            "Constraint 9 self-validation, same precedent as merge-audit-slice.json."),
                "_note": ("TWO BLOCKS, sliced differently ON PURPOSE. `labelled` is a contiguous "
                          "window of the ground-truth clip whose head and tail both sit inside a "
                          "quiet run, so debounce_shots segments it exactly as it segments the full "
                          "clip around every labelled shot; it keeps RAW xs/ys so the radius gate, "
                          "the owner linking and the white-reconstruction control stay auditable, "
                          "and drops red tracks (they can never enter a WHITE count) and any track "
                          "straddling an edge (`_dropped_at_edge`). `dumps` are FULL-CLIP "
                          "frame_counts -- the pooled event figures would be a slicing artefact "
                          "otherwise -- with each non-red track reduced to [life, [start, len, "
                          "...]] runs of frames the shipped radius gate counts it on, because the "
                          "raw coordinates of 30k+ tracks per dump do not fit the fixture budget. "
                          "The owner labels themselves are NOT copied here: they stay in "
                          "groundtruth-f8-11.json / -positions.json and are read from there. "
                          "Regenerate with analyze-pellet-tracks.py --representative-audit "
                          "<tracks.json...> --representative-audit-labelled <tracks.json> "
                          "--representative-audit-labelled-tmpl <tracks.json> "
                          "--save-representative-audit-fixture <path>."),
                "labelled": fixture["labelled"], "dumps": fixture["dumps"],
                "_expected": _rep_expected(labelled, reports, pooled),
            }, fh)
        print(f"wrote representative-audit fixture -> {save_fixture} (`_expected` pins the SLICE; "
              "the full-clip reconstruction figure below is live-run only)")
    _print_representative_audit(labelled, reports, pooled)
    if full_clip:
        lw = labelled["event_window"]
        print(f"\nFULL-CLIP CONTROL (live only) -- white recomputed from tracks matches the dump on "
              f"{full_clip['frames_checked'] - full_clip['mismatched']}/"
              f"{full_clip['frames_checked']} frames")
        inside = [row for row in full_clip["detail"] if lw[0] <= row[0] < lw[1]]
        print(f"  mismatched frames: {[row[0] for row in full_clip['detail']]}\n"
              f"  of which inside the labelled window {lw}: {len(inside)}")
    return {"labelled": labelled, "dumps": reports, "pooled": pooled, "full_clip": full_clip}


def representative_audit_selftest():
    """Constraint 9 self-validation: replay the whole arm over the committed slice, and assert the
    shipped-identity control on every dump in it."""
    with open(REP_AUDIT_FIXTURE) as fh:
        fx = json.load(fh)
    labelled, reports, pooled = _replay_representative_audit(fx)
    got = _rep_expected(labelled, reports, pooled)
    ok = got == fx["_expected"]
    ident = all(_merge_shipped_identity(
        [_expand_frame_counts_row(row) for row in d["frame_counts"]], d["fps"])
        for d in fx["dumps"])
    # A compact digest rather than the merge audit's full expected/got dump: this arm's `_expected`
    # runs to tens of kilobytes and would drown pellet-selftest.sh's output. On FAILURE the
    # per-key diff below prints the full expected and got for whichever keys moved, which is the
    # part that is actually diagnostic.
    if not ok:
        for key in sorted(set(got) | set(fx["_expected"])):
            if got.get(key) != fx["_expected"].get(key):
                print(f"  DIFF {key}:\n    expected {json.dumps(fx['_expected'].get(key))}"
                      f"\n    got      {json.dumps(got.get(key))}")
    tot, pt = got["decomposition_total"], got["peak_total"]
    ls, pv = got["lifetime_summary"], got["pooled_policy_view"]
    print(f"decomposition: owner {tot['owner']} = {tot['never_detected']} never-detected + 0 "
          f"filter + {tot['life_gate_rejected']} lifetime + {tot['radius_gate_rejected']} radius + "
          f"{tot['countable']} countable")
    print(f"reader {tot['reader_white']} = {tot['rep_owner']} owner + {tot['rep_non_owner']} "
          f"non-owner   |   coexistence == countable on every shot: "
          f"{got['coexistence_equals_countable']}")
    print(f"peak: {pt['owner_matched']}/{pt['peak_white']} white owner-matched, "
          f"{pt['shots_zero_matched']} of {len(got['peaks'])} peaks 100% unmatched")
    print(f"lifetime: owner n={ls['owner_n']} min={ls['owner_min']}; non-owner n={ls['non_owner_n']}"
          f" with {ls['non_owner_below_band']} below the band and "
          f"{ls['non_owner_at_or_above_band']} at/above")
    print(f"policies over {got['pooled_policies']['median']['n_events']} events: "
          + "  ".join(f"{p} raw {pv[p]['avgTotal_raw']} clamped {pv[p]['avgTotal_clamped']} "
                      f"(>{REP_HITS_PER_SHOT} on {pv[p]['above_ceiling_pct']}%)"
                      for p in REP_POLICIES))
    print(f"white reconstruction: "
          f"{got['white_reconstruction']['frames_checked'] - got['white_reconstruction']['mismatched']}"
          f"/{got['white_reconstruction']['frames_checked']} frames")
    print(f"shipped-identity control: {'PASS' if ident else 'FAIL'} "
          f"(local span rebuild == count-pellets.py debounce_shots on all "
          f"{len(fx['dumps'])} dumps)")
    print("SELFTEST PASS" if ok and ident else "SELFTEST FAIL")
    return 0 if ok and ident else 1


# ============================================================
# THE REPRESENTATIVE-FRAME POLICY SCORE (docs/handoffs/2026-08-04-representative-frame-PRECOMMIT.md)
# -- of the four pre-committed candidates, does ANY land its representative frame inside the
# pellet-cohort PLATEAU instead of the pre-cohort muzzle flash §9C found the shipped median sampling
# on 3 of 5 labelled shots?
#
# READ-ONLY BY CONSTRUCTION: every rule here is a LOCAL scoring variant read off the
# ALREADY-COMMITTED representative-audit-slice.json -- no new raw data, no re-derivation
# (CLAUDE.md reuse-before-derive: an existing labelled fixture IS an independent method, and that
# fixture's `labelled.tracks_raw` / `dumps[].radius_tracks` / `_expected.counted_owner_series*` /
# `_expected.pooled_policy_view` already carry everything this arm needs). `debounce_shots` in both
# count-pellets.py and read-pellets.ts is untouched and not reachable from here; segmentation (which
# frames belong to which event) is untouched too -- reused verbatim via `_merge_spans`/`_merge_events`
# with policy="median", whose "median" arm is asserted event-for-event against count-pellets.py's own
# debounce_shots by `_merge_shipped_identity` before any row is scored. Only WHICH FRAME (or, for
# `lifetime_band_count`, what COUNT with no frame at all) each candidate reports differs.
#
# The decision rule itself (the categorical PLATEAU check, the ceiling check, the mean-matching
# disqualification) lives in the pre-commit doc, not here -- this arm computes the numbers the doc's
# rule is applied to, and nothing here stamps a verdict.
# ============================================================
POLICY_SCORE_FIXTURE = "scripts/tests/fixtures/pellets/policy-score-slice.json"
# §1.4's four mandatory candidates. The three FRAME rules report a `total` of (band-count at the
# chosen frame) + the SAME core-hit `red` flag `_merge_events` folds into "total"
# (count-pellets.py:489's own convention) so the ceiling check compares like with like and isolates
# the frame-selection difference, not also a change to what "total" means. `lifetime_band_count` is
# NOT a frame rule (§1.4) and carries no red flag -- it is §9G's own per-event band-track count,
# verbatim.
#
# `hybrid_plateau_median` (docs/handoffs/2026-08-04-representative-frame-PROPOSAL.md §2/§4) is a
# FIFTH rule, added AFTER the pre-commit doc's four and NOT part of it (that doc's §1.4 enumeration
# is unedited -- see its own header). It is the enactment PROPOSAL's own candidate: `plateau_median`
# where the event has a band track in radius, else the shipped median-of-active frame, unchanged --
# a strict superset of shipped behaviour that can only move events `plateau_median` would otherwise
# abstain on. THIS IS A MEASUREMENT PASS ONLY -- `debounce_shots` stays untouched in both
# `count-pellets.py:489` and `read-pellets.ts:627`; this rule lives purely inside this scoring arm.
POLICY_RULES = ("shipped_median", "lifetime_gated_median", "plateau_median", "lifetime_band_count",
                "hybrid_plateau_median")
_POLICY_FRAME_RULES = ("shipped_median", "lifetime_gated_median", "plateau_median",
                       "hybrid_plateau_median")


def _ps_band(fps, max_pellet_frames, band_hi=None):
    """The fps-scaled owner-pellet lifetime band [lo, band_hi] -- the same `lo` §9G's lifetime
    census uses (8 frames at 60 fps, scaled down at 30; `max_pellet_frames` is each dump's OWN
    value, never hardcoded -- trap 4).

    `band_hi` (docs/handoffs/2026-08-04-lifetime-cap-PRECOMMIT.md §3.8, pre-op gate revision 7) is
    an OPTIONAL third parameter, STRICTLY ADDITIVE: it defaults to `max_pellet_frames`, so every
    existing caller (six besides this definition -- the labelled/dump policy-score arms and the
    hybrid-landing-audit's equivalence + TS-lockstep arms) is behaviourally unchanged. Only
    `--cap-score` ever passes a non-None value, to decouple the counted-pellet band's upper bound
    from the `pellet_ids` gate `max_pellet_frames` also drives (the pre-commit's §1: this is a
    SEPARATE upper bound for the band only, never a recomputation of the cap itself)."""
    lo = max(1, round(REP_OWNER_LIFE_LO_60FPS * fps / 60.0))
    hi = max_pellet_frames if band_hi is None else band_hi
    return lo, hi


def _ps_band_totals(radius_tracks, band):
    """Per-frame count of tracks the shipped radius gate counts on that frame, restricted to tracks
    whose OVERALL lifetime falls in `band`. This is the lifetime-gated per-frame series
    `lifetime_gated_median` and `plateau_median` both select a representative frame from -- §9G's
    discriminator (track lifetime, not frame magnitude) applied per-frame instead of per-event."""
    totals = collections.Counter()
    for life, runs in radius_tracks:
        if not (band[0] <= life <= band[1]):
            continue
        for s, ln in runs:
            for f in range(s, s + ln):
                totals[f] += 1
    return totals


def _ps_band_count(radius_tracks, band, a, b):
    """`lifetime_band_count`'s own definition (§9G's basis, verbatim): the number of DISTINCT tracks
    whose overall lifetime falls in `band` and which the shipped radius gate counts at least once
    inside [a, b). Not a frame rule -- no representative frame is chosen (§1.4: exempt from §1.1)."""
    lo, hi = band
    n = 0
    for life, runs in radius_tracks:
        if not (lo <= life <= hi):
            continue
        if any(s < b and s + ln > a for s, ln in runs):
            n += 1
    return n


def _ps_labelled_radius_tracks(block, cross_key="cross"):
    """The labelled block's tracks reduced to the same [life, runs] shape `dumps[].radius_tracks`
    already carries -- built at replay time from the RAW xs/ys the labelled block keeps (unlike the
    dumps, which are pre-reduced at fixture-write time because 30k+ tracks/dump do not fit the
    budget; the labelled block is small enough to reduce on the fly).

    `cross_key` selects WHICH crosshair the radius gate runs against: `"cross"` (shipped structural,
    every shot except 4) or `"cross_tmpl"` (the crop shot 4's images were actually cut with -- its
    label file records `locate: "template"`, and its GROUND-TRUTH plateau is the relock series, so
    the frame-selection input must be scored on the SAME crop or a candidate is picking a frame in
    one crop and being checked against a plateau defined in a different one -- trap 9, JUDGE REVIEW
    2026-08-04: `_ps_score_labelled` selects `cross_key` per shot via its `locate` field; this
    function itself has no opinion on which shot needs which."""
    cross = [tuple(c) if c else None for c in block[cross_key]]
    radius = block["params"]["pellet_radius"]
    offset = block["offset"]
    out = []
    for _tid, first, _is_pellet, xs, ys in block["tracks_raw"]:
        track = {"first": first, "last": first + len(xs) - 1, "xs": xs, "ys": ys}
        runs = _rep_radius_runs(track, cross, radius, offset)
        if runs:
            out.append((len(xs), runs))
    return out


def _ps_events(frame_counts, fps):
    """Event span boundaries, reused VERBATIM from the shipped segmentation
    (`_merge_spans(..., "shipped")` -> `_merge_events(..., "median")`) -- segmentation is untouched by
    every candidate here; only which frame each rule copies its count from differs. The "median"
    policy's own `rep`/`white`/`red`/`total` fields double as the `shipped_median` rule's answer, so
    no separate computation is needed for the control."""
    totals = [r["white"] + r["red"] for r in frame_counts]
    spans = _merge_spans(totals, fps, "shipped")
    return _merge_events(frame_counts, totals, spans, "median")


def _ps_median_rep(totals, a, b):
    """The shipped median-of-active selection (count-pellets.py:514-536 / `_merge_events`'s "median"
    branch), generalized to an arbitrary per-frame totals mapping instead of the shipped white+red
    total -- so `lifetime_gated_median` can reuse the exact same SELECTION LOGIC over a DIFFERENT
    series (the band-gated one)."""
    active = [j for j in range(a, b) if totals.get(j, 0) >= MERGE_EVENT_MIN]
    if not active:
        return None
    srt = sorted(totals[j] for j in active)
    m = len(srt)
    target = (srt[(m - 1) // 2] + srt[m // 2]) / 2
    rep, best = active[0], float("inf")
    for j in active:
        off = abs(totals[j] - target)
        if off < best:
            best, rep = off, j
    return rep


def _ps_longest_modal_run(totals, a, b):
    """`plateau_median`'s own frame-selection rule (§1.4): the longest contiguous run of ACTIVE
    frames (>= MERGE_EVENT_MIN, the same floor the median selection uses -- without it a long run of
    genuine zero-frames outside the cohort would qualify as its own degenerate "plateau") whose
    values all fall within +-1 of the run's own mode. Returns the run as a list of frame indices, or
    [] if there are no active frames in [a, b)."""
    frames = [j for j in range(a, b) if totals.get(j, 0) >= MERGE_EVENT_MIN]
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


def _ps_plateau_rep(totals, a, b):
    run = _ps_longest_modal_run(totals, a, b)
    return run[len(run) // 2] if run else None


def _ps_red_flag(frame_counts, offset, a, b):
    """The same core-hit-marker-present-in-span flag `_merge_events` folds into "total"
    (count-pellets.py:489), applied to whichever frame the candidate rule picked instead of the
    shipped one -- so `total` means the same thing across every frame rule."""
    return 1 if any(frame_counts[j - offset].get("marker", 0) >= MERGE_MARKER_MIN
                    for j in range(a, b)) else 0


def _ps_score_event(policy, ev, frame_counts, offset, band_totals):
    """One event, one FRAME rule: `rep` (absolute frame index, or None if the rule found nothing to
    select) and `total` (the count it would report, comparable to shipped's `total`).

    `hybrid_plateau_median` is the one rule that can never abstain: when the event has no band
    track in radius (`_ps_plateau_rep` returns None) it falls back to the event's OWN shipped
    `rep`/`total` fields -- the exact `debounce_shots` answer, not a recomputation of it -- so the
    fallback is bit-identical to shipped BY CONSTRUCTION rather than by a second implementation that
    could drift from the first. `_ps_score_dump` asserts this at run time (the falsification
    control) rather than trusting the construction argument alone."""
    if policy == "shipped_median":
        return {"rep": ev["rep"], "total": ev["total"]}
    a, b = ev["start"], ev["end"]
    if policy == "lifetime_gated_median":
        rep = _ps_median_rep(band_totals, a, b)
    elif policy == "plateau_median":
        rep = _ps_plateau_rep(band_totals, a, b)
    elif policy == "hybrid_plateau_median":
        rep = _ps_plateau_rep(band_totals, a, b)
        if rep is None:
            return {"rep": ev["rep"], "total": ev["total"]}
    else:
        raise ValueError(f"_ps_score_event: not a frame rule: {policy}")
    if rep is None:
        return {"rep": None, "total": None}
    return {"rep": rep, "total": band_totals.get(rep, 0) + _ps_red_flag(frame_counts, offset, a, b)}


def _ps_plateau(series_row):
    """§1.1's PLATEAU, computed from the pinned ground-truth series: the longest contiguous run of
    frames with value >= max-1, length >= 3. Validity check #3: this must reproduce shipped = 2/5, IN
    on shots 1 and 5, OUT on 2/3/4."""
    series = series_row["series"]
    first = series_row["first_offset"]
    best, cur = [], []
    for i, v in enumerate(series):
        if v >= max(series) - 1:
            cur.append(i)
        else:
            if len(cur) > len(best):
                best = cur
            cur = []
    if len(cur) > len(best):
        best = cur
    if len(best) < 3:
        best = []
    return [first + i for i in best]


def _ps_ground_truth_series(fx):
    """Per shot: the pinned countable-owner-pellet series, shot 4 replaced by its RELOCK series (trap
    9 -- its shipped structural read is the documented mislock, not something a representative-frame
    rule could ever fix, so the PLATEAU it is scored against is the physically-correct one)."""
    by_shot = {r["shot"]: r for r in fx["_expected"]["counted_owner_series"]}
    for r in fx["_expected"]["counted_owner_series_relock"]:
        by_shot[r["shot"]] = r
    return by_shot


def _ps_score_labelled(fx):
    """THE CATEGORICAL HALF (n=5). For each labelled shot: where each frame rule's representative
    frame lands, relative to the ground-truth PLATEAU, plus `lifetime_band_count`'s own count against
    the plateau's size.

    ⚑ JUDGE REVIEW 2026-08-04 caught a crop mismatch on shot 4: its GROUND-TRUTH plateau is the
    RELOCK series (the crop its images were actually cut with, `locate: "template"`), so every
    band-dependent computation (the radius gate feeding `lifetime_gated_median`/`plateau_median`/
    `lifetime_band_count`) must run on `cross_tmpl` for that shot too -- scoring a frame picked in the
    structural crop against a plateau defined in the template crop is trap 9 exactly (picking a frame
    in crop A, checking it against crop B). Shots 1/2/3/5 stay on `cross` (structural); segmentation
    (`events`, shared by every shot) stays on the shipped structural `frame_counts` throughout --
    only the RADIUS GATE swaps crop, and only for shot 4."""
    block = fx["labelled"]
    shots = _rep_load_labels()
    fps = block["fps"]
    offset = block["offset"]
    frame_counts = [{"white": w, "red": r, "marker": m} for w, r, m in block["frame_counts"]]
    # `_ps_events` runs on the slice-local (0-based) `frame_counts` array; shift back to ABSOLUTE
    # clip frame indices before comparing to `t0` or indexing `band_totals` (keyed by absolute frame,
    # since `tracks_raw`'s own `first`/`xs`/`ys` are absolute) -- same shift `_rep_labelled_report`
    # applies to its own `events`.
    events = [{**e, "start": e["start"] + offset, "end": e["end"] + offset, "rep": e["rep"] + offset}
              for e in _ps_events(frame_counts, fps)]
    band = _ps_band(fps, block["params"]["max_pellet_frames"])
    rtracks_structural = _ps_labelled_radius_tracks(block, "cross")
    rtracks_template = _ps_labelled_radius_tracks(block, "cross_tmpl")
    by_crop = {
        "structural": (rtracks_structural, _ps_band_totals(rtracks_structural, band)),
        "template": (rtracks_template, _ps_band_totals(rtracks_template, band)),
    }
    truth = _ps_ground_truth_series(fx)

    rows = []
    for s in shots:
        t0 = s["t0"]
        ev = next((e for e in events if e["start"] <= t0 < e["end"]), None)
        if ev is None:
            raise SystemExit(f"--policy-score: labelled shot {s['shot']} (t0={t0}) falls in no "
                             "shipped event; the slice boundary cut it.")
        crop = "template" if s["locate"] == "template" else "structural"
        rtracks, band_totals = by_crop[crop]
        plateau = _ps_plateau(truth[s["shot"]])
        row = {"shot": s["shot"], "t0": t0, "crop": crop, "plateau_offsets": plateau,
              "plateau_size": len(plateau)}
        for policy in _POLICY_FRAME_RULES:
            r = _ps_score_event(policy, ev, frame_counts, offset, band_totals)
            rep_offset = (r["rep"] - t0) if r["rep"] is not None else None
            row[policy] = {"rep_offset": rep_offset, "total": r["total"],
                          "in_plateau": rep_offset in plateau if rep_offset is not None else False}
        row["lifetime_band_count"] = {"count": _ps_band_count(rtracks, band, ev["start"], ev["end"])}
        rows.append(row)

    # MANDATORY FALSIFICATION CONTROL (JUDGE REVIEW 2026-08-04): the crop swap touches ONLY the
    # radius gate feeding the band-dependent rules. `shipped_median` reads straight off the raw
    # `frame_counts` white+red totals, which are crosshair-independent (§9B: those counts are
    # computed once, under the shipped structural crosshair, "regardless of which crosshair the crops
    # were cut with"). If the swap moved `shipped_median` too, the crop selection would be leaking
    # into the control -- i.e. permissive -- and the fix would be wrong, not just the finding.
    shot4 = next(r for r in rows if r["shot"] == 4)
    sm4 = shot4["shipped_median"]
    if not (sm4["rep_offset"] == 3 and sm4["in_plateau"] is False):
        raise SystemExit("--policy-score: MANDATORY FALSIFICATION CONTROL FAILED -- scoring shot "
                         "4's radius gate on cross_tmpl moved shipped_median (expected rep_offset=3, "
                         f"OUT; got rep_offset={sm4['rep_offset']}, "
                         f"{'IN' if sm4['in_plateau'] else 'OUT'}). The control must be crop-blind; "
                         "if this fires, the per-shot crop selection is permissive and must be "
                         "reverted, not kept.")
    # CROSS-CHECK (§9B, independently derived before this arm existed): "under the template lock, 0
    # radius-rejected, 7 countable". Both band rules should land on that same total on shot 4.
    for p in ("lifetime_gated_median", "plateau_median"):
        if shot4[p]["total"] != 7:
            raise SystemExit(f"--policy-score: cross-check FAILED -- shot 4's {p} total is "
                             f"{shot4[p]['total']}, expected 7 (§9B: template lock gives 0 "
                             "radius-rejected, 7 countable).")

    scores = {policy: sum(1 for row in rows if row[policy]["in_plateau"])
              for policy in _POLICY_FRAME_RULES}
    return {"band": list(band), "rows": rows, "categorical_scores": scores}


def _ps_assert_hybrid_decomposition(name, events, frame_counts, band_totals):
    """Event-by-event: `hybrid_plateau_median` must decompose EXACTLY into bare `plateau_median` on
    every event with a band track in radius, and into bit-identical shipped (`rep` AND `total`, so
    `white`/`red` too since `total` is `white + red_flag`) on every event without one. This is
    PROPOSAL §4 item 4 (the falsification control) and the 740/112 decomposition §12's own text
    calls "a free, strong internal check" -- both ASSERTED here (SystemExit on mismatch), not
    assumed from `_ps_score_event`'s construction, and exercised on every `--policy-score` /
    `--policy-score-selftest` run since `_ps_score_dump` calls this for every dump."""
    n_banded = n_fallback = 0
    for ev in events:
        a, b = ev["start"], ev["end"]
        plateau_rep = _ps_plateau_rep(band_totals, a, b)
        hybrid = _ps_score_event("hybrid_plateau_median", ev, frame_counts, 0, band_totals)
        if plateau_rep is None:
            n_fallback += 1
            if hybrid["rep"] != ev["rep"] or hybrid["total"] != ev["total"]:
                raise SystemExit(
                    f"--policy-score: FALSIFICATION CONTROL FAILED on {name} event [{a},{b}) -- "
                    "hybrid_plateau_median must be bit-identical to shipped_median when no band "
                    f"track is in radius (rep {hybrid['rep']} vs {ev['rep']}, total "
                    f"{hybrid['total']} vs {ev['total']}).")
        else:
            n_banded += 1
            plateau = _ps_score_event("plateau_median", ev, frame_counts, 0, band_totals)
            if hybrid["rep"] != plateau["rep"] or hybrid["total"] != plateau["total"]:
                raise SystemExit(
                    f"--policy-score: DECOMPOSITION CHECK FAILED on {name} event [{a},{b}) -- "
                    "hybrid_plateau_median must reproduce bare plateau_median exactly on banded "
                    f"events (rep {hybrid['rep']} vs {plateau['rep']}, total {hybrid['total']} vs "
                    f"{plateau['total']}).")
    return {"n_banded": n_banded, "n_fallback": n_fallback}


def _ps_pool_hybrid_decomposition(dumps):
    return {"n_banded": sum(d["hybrid_decomposition"]["n_banded"] for d in dumps),
            "n_fallback": sum(d["hybrid_decomposition"]["n_fallback"] for d in dumps)}


def _ps_assert_decomposition_matches_plateau(dumps, pooled):
    """The pooled free check: the 740/112 split the per-event asserts already enforce must also
    equal bare `plateau_median`'s own pooled `n_scored`/`no_rep` -- banded events are exactly the
    ones `plateau_median` does NOT abstain on, fallback events are exactly the ones it does."""
    decomp = _ps_pool_hybrid_decomposition(dumps)
    pm = pooled["plateau_median"]
    if decomp["n_banded"] != pm["n_scored"] or decomp["n_fallback"] != pm["no_rep"]:
        raise SystemExit(
            "--policy-score: POOLED DECOMPOSITION MISMATCH -- hybrid_plateau_median's "
            f"banded/fallback split ({decomp['n_banded']}/{decomp['n_fallback']}) does not equal "
            f"bare plateau_median's n_scored/no_rep ({pm['n_scored']}/{pm['no_rep']}).")
    return decomp


def _ps_score_dump(d):
    """THE CEILING HALF, one dump: for every shipped event, what each rule would report, pooled by
    the caller across all dumps to the 852-event denominator §1.2 scores against."""
    fps = d["fps"]
    # `radius_tracks` is stored FLATTENED ([start, len, start, len, ...] per track) to fit the
    # fixture budget -- `_rep_expand_dump` is the shipped un-flattener, reused here rather than
    # re-implementing it a second time.
    frame_counts, radius_tracks = _rep_expand_dump(d)
    events = _ps_events(frame_counts, fps)
    band = _ps_band(fps, d["max_pellet_frames"])
    band_totals = _ps_band_totals(radius_tracks, band)
    out = {"dump": d["tracks"], "fps": fps, "n_events": len(events)}
    out["hybrid_decomposition"] = _ps_assert_hybrid_decomposition(d["tracks"], events, frame_counts,
                                                                   band_totals)
    for policy in _POLICY_FRAME_RULES:
        totals, above, no_rep = [], 0, 0
        for ev in events:
            r = _ps_score_event(policy, ev, frame_counts, 0, band_totals)
            if r["total"] is None:
                no_rep += 1
                continue
            totals.append(r["total"])
            if r["total"] > REP_HITS_PER_SHOT:
                above += 1
        out[policy] = {"n_scored": len(totals), "no_rep": no_rep, "sum_total": sum(totals),
                      "above_ceiling": above}
    counts = [_ps_band_count(radius_tracks, band, e["start"], e["end"]) for e in events]
    out["lifetime_band_count"] = {"n_scored": len(counts), "no_rep": 0, "sum_total": sum(counts),
                                  "above_ceiling": sum(1 for c in counts if c > REP_HITS_PER_SHOT)}
    return out


def _ps_pool_dumps(dumps):
    """Pooled `avgTotal` / `above_ceiling_pct` per rule over every dump event -- the 852-event
    denominator §1.2 scores against (5 dumps, 4 units; §9G already established 852 = the sum)."""
    pooled = {}
    for policy in POLICY_RULES:
        n_events = sum(r["n_events"] for r in dumps)
        n_scored = sum(r[policy]["n_scored"] for r in dumps)
        no_rep = sum(r[policy]["no_rep"] for r in dumps)
        above = sum(r[policy]["above_ceiling"] for r in dumps)
        sm = sum(r[policy]["sum_total"] for r in dumps)
        pooled[policy] = {
            "n_events": n_events, "n_scored": n_scored, "no_rep": no_rep,
            "avgTotal": round(sm / n_scored, 4) if n_scored else None,
            "above_ceiling_pct": round(100 * above / n_scored, 1) if n_scored else None,
        }
    return pooled


def _ps_expected(labelled, dumps, pooled):
    return {
        "band_labelled": labelled["band"],
        "rows": labelled["rows"],
        "categorical_scores": labelled["categorical_scores"],
        "per_dump": [{"dump": d["dump"], "fps": d["fps"], "n_events": d["n_events"],
                     "hybrid_decomposition": d["hybrid_decomposition"],
                     **{p: d[p] for p in POLICY_RULES}} for d in dumps],
        "pooled": pooled,
        "hybrid_decomposition_pooled": _ps_pool_hybrid_decomposition(dumps),
    }


def _print_policy_score(labelled, dumps, pooled):
    print("\nCATEGORICAL -- does the rule's representative frame land inside the ground-truth "
          "PLATEAU? (shot 4's radius gate + plateau both run on the TEMPLATE crop -- its own "
          "`locate`; every other shot on structural. `crop` is printed, never inferred.)")
    for row in labelled["rows"]:
        print(f"  shot {row['shot']}  t0={row['t0']}  crop={row['crop']}  "
              f"plateau_offsets={row['plateau_offsets']}")
        for p in _POLICY_FRAME_RULES:
            r = row[p]
            mark = "IN " if r["in_plateau"] else "OUT"
            print(f"    {p:24s} rep_offset={str(r['rep_offset']):>5s}  {mark}  "
                  f"total={r['total']}")
    cs = labelled["categorical_scores"]
    print("\nCATEGORICAL SCORE (of 5, §1.1: 5/5 promotable, 3-4/5 record only, <=2/5 reject)")
    for p in _POLICY_FRAME_RULES:
        print(f"  {p:24s} {cs[p]}/5")
    print("  MANDATORY FALSIFICATION CONTROL held: shipped_median stayed rep_offset=3, OUT on shot "
          "4 (the crop swap only reaches the band-dependent rules) -- checked above, would have "
          "raised SystemExit otherwise.")
    print("  CROSS-CHECK held: lifetime_gated_median and plateau_median both report total=7 on shot "
          "4 (§9B: template lock gives 0 radius-rejected, 7 countable) -- checked above.")

    print("\nlifetime_band_count -- exempt from §1.1; count vs the ground-truth plateau's own SIZE")
    for row in labelled["rows"]:
        print(f"  shot {row['shot']} (crop={row['crop']}): "
              f"count={row['lifetime_band_count']['count']}  plateau_size={row['plateau_size']}")

    print(f"\nCEILING (§1.2, free) -- pooled over {pooled['shipped_median']['n_events']} events "
          f"across {len(dumps)} dumps; reject above 12.4% (2x shipped)")
    print(f"{'policy':24s} {'n_scored':>8s} {'no_rep':>7s} {'avgTotal':>9s} {'>ceil %':>8s}")
    for p in POLICY_RULES:
        row = pooled[p]
        print(f"{p:24s} {row['n_scored']:8d} {row['no_rep']:7d} "
              f"{str(row['avgTotal']):>9s} {str(row['above_ceiling_pct']):>8s}")

    print("\nABSTENTION RISK -- band rules do not share shipped_median's denominator")
    gm, pm = pooled["lifetime_gated_median"], pooled["plateau_median"]
    print(f"  shipped_median / lifetime_band_count are scored on all {pooled['shipped_median']['n_events']} "
          f"events (no_rep 0 on both).")
    print(f"  lifetime_gated_median / plateau_median ABSTAIN (no representative frame at all) on "
          f"{gm['no_rep']}/{pooled['shipped_median']['n_events']} events "
          f"({100 * gm['no_rep'] / pooled['shipped_median']['n_events']:.1f}%) -- their "
          f"above_ceiling_pct is computed over n_scored={gm['n_scored']}, NOT the common 852. An "
          "abstention cannot over-count, so excluding it is defensible for THIS check specifically -- "
          "but a rule that silently drops 13% of events is a candidate NEW missing-shot channel, "
          "which this arm does not measure and does not resolve. Top open risk for any enactment "
          "pass on these rules.")

    hd = _ps_pool_hybrid_decomposition(dumps)
    hm = pooled["hybrid_plateau_median"]
    print("\nHYBRID_PLATEAU_MEDIAN -- the PROPOSAL's own rule (plateau_median where the event has a "
          "band track in radius, else shipped, unchanged); NOT part of the pre-commit doc's §1.4 "
          "enumeration, added after it per the enactment proposal's §4")
    print(f"  decomposition (asserted event-by-event, SystemExit on any mismatch): "
          f"{hd['n_banded']} banded (== bare plateau_median) + {hd['n_fallback']} fallback "
          f"(== bit-identical shipped) = {hd['n_banded'] + hd['n_fallback']}")
    print(f"  n_scored={hm['n_scored']}  no_rep={hm['no_rep']}  avgTotal={hm['avgTotal']}  "
          f"above_ceiling_pct={hm['above_ceiling_pct']}%  (reject above 12.4%)")

    print("\nTERTIARY (§1.3, REPORTED ONLY -- never a ranking criterion; mean-matching near 8.40 "
          "DISQUALIFIES a rule)")
    for p in POLICY_RULES:
        print(f"  {p:24s} avgTotal={pooled[p]['avgTotal']}")


def policy_score(save_fixture=None):
    with open(REP_AUDIT_FIXTURE) as fh:
        fx = json.load(fh)
    for d in fx["dumps"]:
        fc = [_expand_frame_counts_row(row) for row in d["frame_counts"]]
        if not _merge_shipped_identity(fc, d["fps"]):
            raise SystemExit(f"--policy-score: the shipped-identity control FAILED on {d['tracks']}. "
                             "The local span rebuild no longer reproduces debounce_shots, so no row "
                             "below would be a difference from the real baseline.")
    labelled = _ps_score_labelled(fx)
    dumps = [_ps_score_dump(d) for d in fx["dumps"]]
    pooled = _ps_pool_dumps(dumps)
    _ps_assert_decomposition_matches_plateau(dumps, pooled)
    if save_fixture:
        with open(save_fixture, "w") as fh:
            json.dump({
                "_source": ("Scored entirely off the already-committed "
                            f"{REP_AUDIT_FIXTURE} -- no new raw tracks.json, no re-derivation "
                            "(CLAUDE.md reuse-before-derive). docs/handoffs/"
                            "2026-08-04-representative-frame-PRECOMMIT.md is the decision rule this "
                            "arm's numbers are scored against."),
                "_note": ("Deliberately carries NO raw track data of its own -- `policy_score`/"
                          "`policy_score_selftest` both read "
                          f"{REP_AUDIT_FIXTURE} directly, so this "
                          "fixture only pins the SCORE (`_expected`), not a second copy of the "
                          "labelled/dumps blocks. Regenerate with analyze-pellet-tracks.py "
                          "--policy-score --save-policy-score-fixture <path>."),
                "_expected": _ps_expected(labelled, dumps, pooled),
            }, fh, indent=2)
        print(f"wrote policy-score fixture -> {save_fixture}")
    _print_policy_score(labelled, dumps, pooled)
    return {"labelled": labelled, "dumps": dumps, "pooled": pooled}


def policy_score_selftest():
    """Constraint 9 self-validation: replay the whole arm off the already-committed
    representative-audit-slice.json and assert the result against the committed score fixture."""
    with open(POLICY_SCORE_FIXTURE) as fh:
        fx = json.load(fh)
    with open(REP_AUDIT_FIXTURE) as fh:
        src = json.load(fh)
    ident = all(_merge_shipped_identity(
        [_expand_frame_counts_row(row) for row in d["frame_counts"]], d["fps"])
        for d in src["dumps"])
    labelled = _ps_score_labelled(src)
    dumps = [_ps_score_dump(d) for d in src["dumps"]]
    pooled = _ps_pool_dumps(dumps)
    _ps_assert_decomposition_matches_plateau(dumps, pooled)
    got = _ps_expected(labelled, dumps, pooled)
    ok = got == fx["_expected"]
    if not ok:
        for key in sorted(set(got) | set(fx["_expected"])):
            if got.get(key) != fx["_expected"].get(key):
                print(f"  DIFF {key}:\n    expected {json.dumps(fx['_expected'].get(key))}"
                      f"\n    got      {json.dumps(got.get(key))}")
    cs = got["categorical_scores"]
    print("categorical (of 5): " + "  ".join(f"{p}={cs[p]}" for p in _POLICY_FRAME_RULES))
    pv = got["pooled"]
    print(f"pooled over {pv['shipped_median']['n_events']} events: " +
          "  ".join(f"{p} avgTotal={pv[p]['avgTotal']} above_ceiling%={pv[p]['above_ceiling_pct']}"
                    for p in POLICY_RULES))
    print(f"shipped-identity control: {'PASS' if ident else 'FAIL'} "
          f"(local span rebuild == count-pellets.py debounce_shots on all {len(src['dumps'])} dumps)")
    print("SELFTEST PASS" if ok and ident else "SELFTEST FAIL")
    return 0 if ok and ident else 1


# ============================================================
# THE FADE-SCREEN GAP (docs/probe-runs.md §9A) -- §9A's own COULD-NOT-DETERMINE: the owner's f8-11
# label and `real-fidelity-slice.json` both only see the plateau window, so a marker that lands and
# fully dies BEFORE t0+8 is invisible to either. If any such marker is a real pellet, part of the
# measured ~1.08 cold bias is a mis-specified REFERENCE (the label misses pellets that already
# faded), not a reader defect. §9A says settling it needs owner labels at the plateau frame; this
# arm narrows that ask from "hand-count a new frame" down to a short adjudication list, over the SAME
# already-committed `labelled` block representative-audit's own reuse of the raw xs/ys (§9B/§9C)
# already established as this clip's ground truth.
#
# Every in-radius (§9B's own gate: `pellet_radius`, against whichever crosshair the shot's `locate`
# field says its crops were actually cut with), non-red track whose LAST frame is before its shot's
# t0+8 is bucketed by lifetime. Life 1..FLASH_MODE_MAX_LIFE is the documented flash-blob phase (§9C:
# "blobs live 1-3 frames"); life >= REP_OWNER_LIFE_LO_60FPS (8, the owner's own measured pellet
# floor, §9A) is a different population (§9B's one known static, life 22 -- a persistent UI element,
# not a fading pellet). Only the band BETWEEN those two -- life 4..7 -- is genuinely ambiguous: too
# long-lived to dismiss as flash, too short-lived to already sit in the owner's own verified range.
#
# `hitsPerShot` is 10 (REP_HITS_PER_SHOT, data/characters.json marciana -- SG/Iron, NOT
# marciana-marine-study, AR/Iron): a shot whose owner label already reads 10 has ZERO headroom, so
# whatever its ambiguous objects are, they cannot be additional COUNTABLE pellets without breaching
# the kit's own per-shot ceiling -- they are reported but not adjudicable. `min(headroom, ambiguous)`
# per shot, pooled over 5 shots, is the ABSOLUTE upper bound on how far this gap could shift the 8.40
# reference even in the most generous reading (every headroom-permitted ambiguous object turns out to
# be a real fading pellet).
#
# READ-ONLY BY CONSTRUCTION: reads only the already-committed REP_AUDIT_FIXTURE's `labelled` block
# (CLAUDE.md reuse-before-derive -- no new raw tracks.json, no live scratchpad access). Never touches
# read-pellets.ts, count-pellets.py, or any constant/default; enacts nothing -- this arm GENERATES
# the adjudication list, it does not decide it (2026-08-04 fade-screen ask, task 1 of 2).
# ============================================================
FADE_SCREEN_FIXTURE = "scripts/tests/fixtures/pellets/fade-screen-slice.json"
FLASH_MODE_MAX_LIFE = 3  # docs/probe-runs.md §9C: "blobs live 1-3 frames" -- the documented flash phase

# Per-shot t0 (absolute frame index, the same numbering `labelled.tracks_raw[].first` uses) --
# copied from policy-score-slice.json's own `_expected.rows[].t0`
# (scripts/tests/fixtures/pellets/policy-score-slice.json), itself
# groundtruth-f8-11.json's `shots[].t0` (shot 0 excluded there: no blast onset, an owner-confirmed
# false positive, so it carries no t0 at all -- the numbering here is 1..5, not 0..5). Owner labels
# are groundtruth-f8-11.json's `shots[].white` verbatim. Both are already-committed, independently
# labelled artifacts (CLAUDE.md reuse-before-derive) -- never re-derived here.
FADE_SCREEN_SHOTS = (
    # (shot, t0, owner_white, crosshair_key)
    (1, 1060, 7, "cross"),
    (2, 1096, 10, "cross"),
    (3, 1140, 8, "cross"),
    (4, 1289, 9, "cross_tmpl"),  # groundtruth-f8-11.json shot 4: locate == "template"
    (5, 1369, 8, "cross"),
)


def _fs_shot_events(labelled, shots=FADE_SCREEN_SHOTS):
    """Per-shot temporal neighbourhood, reusing `_ps_events` (== `_merge_spans`/`_merge_events`,
    already exercised on this exact `labelled.frame_counts` by `_ps_score_labelled`, which raises the
    identical premise check below) rather than re-deriving segmentation: the SHIPPED-debounced event
    span each shot's t0 falls inside. `labelled.frame_counts` covers ELEVEN spans, not five -- most of
    them unrelated flash/decay blips between the 5 real shots (§9C) -- so a track must overlap the
    SPECIFIC span its own shot owns, not merely be temporally closest to some t0; nearest-t0
    assignment over-attributes cross-event debris (verified empirically: it roughly 1.4x's this
    arm's population versus event-span attribution).

    Padded BACKWARD by the same debounce gap tolerance `_merge_spans`'s "shipped" rule itself uses
    (`max(3, round(fps*0.13))`, 8 frames at 60fps) so a pre-onset object -- alive before the frame
    total first crosses MERGE_EVENT_MIN, e.g. a track that dies at t0-1 -- is still attributed to the
    shot it precedes, without the pad reaching back into the PRIOR (unrelated) detected event (the
    real inter-event gaps here are 17+ frames, comfortably wider than the 8-frame pad)."""
    frame_counts = [{"white": w, "red": r, "marker": m} for w, r, m in labelled["frame_counts"]]
    fps, offset = labelled["fps"], labelled["offset"]
    events = _ps_events(frame_counts, fps)
    gap_pad = max(3, round(fps * 0.13))
    out = {}
    for shot, t0, owner, key in shots:
        ev = next((e for e in events if e["start"] <= (t0 - offset) < e["end"]), None)
        if ev is None:
            raise SystemExit(f"--fade-screen: shot {shot} (t0={t0}) falls in no shipped event; the "
                             "labelled slice boundary cut it.")
        out[shot] = {"nb_lo": ev["start"] + offset - gap_pad, "nb_hi": ev["end"] + offset,
                    "t0": t0, "owner": owner, "key": key}
    return out


def _fs_collect(labelled, shots=FADE_SCREEN_SHOTS):
    """Every in-radius, non-red track in `labelled.tracks_raw` that overlaps its shot's own event
    neighbourhood (`_fs_shot_events`) and whose LAST frame is before that shot's t0+8 -- the
    population §9A's COULD-NOT-DETERMINE gap is about (invisible to both the owner's f8-11 label and
    real-fidelity-slice.json, which also only look at f8-11)."""
    radius = labelled["params"]["pellet_radius"]
    offset = labelled["offset"]
    cross_by_key = {
        "cross": [tuple(c) if c else None for c in labelled["cross"]],
        "cross_tmpl": [tuple(c) if c else None for c in labelled["cross_tmpl"]],
    }
    neighbourhoods = _fs_shot_events(labelled, shots)
    rows = []
    for tid, first, is_pellet, xs, ys in labelled["tracks_raw"]:
        life = len(xs)
        last = first + life - 1
        matched = [s for s, nb in neighbourhoods.items() if first < nb["nb_hi"] and last >= nb["nb_lo"]]
        if not matched:
            continue  # belongs to none of the 5 real shots' own detected event -- unrelated debris
        # A track overlapping >1 neighbourhood would have to span the gap between them, which is
        # always far longer than 8 frames here -- it can never survive the t0+8 filter below whichever
        # shot it is attributed to. Nearest-t0 among the matches keeps the choice deterministic anyway.
        shot = min(matched, key=lambda s: abs((first + last) / 2 - neighbourhoods[s]["t0"]))
        nb = neighbourhoods[shot]
        t0, owner, key = nb["t0"], nb["owner"], nb["key"]
        track = {"first": first, "last": last, "xs": xs, "ys": ys}
        if not _rep_ever_in_radius(track, cross_by_key[key], radius, offset):
            continue
        if last >= t0 + 8:
            continue  # survives into (or past) the owner's own window -- not this gap's population
        rows.append({"id": tid, "shot": shot, "t0": t0, "owner": owner,
                    "first": first, "last": last, "life": life,
                    "span": [first - t0, last - t0], "is_pellet": bool(is_pellet)})
    return sorted(rows, key=lambda r: (r["shot"], r["first"]))


def _fs_ambiguous(row):
    return FLASH_MODE_MAX_LIFE < row["life"] < REP_OWNER_LIFE_LO_60FPS


def _fs_score(rows, shots=FADE_SCREEN_SHOTS):
    histogram = collections.Counter(r["life"] for r in rows)
    per_shot = []
    for shot, t0, owner, _key in shots:
        shot_rows = [r for r in rows if r["shot"] == shot]
        ambiguous = [r for r in shot_rows if _fs_ambiguous(r)]
        headroom = REP_HITS_PER_SHOT - owner
        adjudicable = ambiguous if headroom > 0 else []
        max_additional = min(max(headroom, 0), len(ambiguous))
        per_shot.append({
            "shot": shot, "t0": t0, "owner": owner, "headroom": headroom,
            "n_dies_before_window": len(shot_rows), "n_ambiguous": len(ambiguous),
            "n_adjudicable": len(adjudicable), "max_additional": max_additional,
            "adjudicable_ids": [r["id"] for r in adjudicable],
        })
    pooled_max_additional = sum(s["max_additional"] for s in per_shot)
    pooled_bound = round(pooled_max_additional / len(shots), 4)
    return {
        "histogram": {str(k): v for k, v in sorted(histogram.items())},
        "n_total": len(rows),
        "n_ambiguous": sum(s["n_ambiguous"] for s in per_shot),
        "per_shot": per_shot,
        "pooled_max_additional": pooled_max_additional,
        "pooled_bound_per_shot": pooled_bound,
    }


def _fs_expected(score):
    """The whole score IS the pinned summary -- a histogram, a 5-row per-shot table and a pooled
    bound, small enough to read in a diff, and exactly what the printout below is read off."""
    return score


def _print_fade_screen(score):
    print("\nFADE-SCREEN -- markers that die before t0+8 (docs/probe-runs.md §9A)")
    print(f"\npooled lifetime histogram (n={score['n_total']}, in-radius, non-red, dies before "
         "shot's own t0+8):")
    for life, n in score["histogram"].items():
        tag = " <- AMBIGUOUS" if FLASH_MODE_MAX_LIFE < int(life) < REP_OWNER_LIFE_LO_60FPS else ""
        print(f"  life={life:>3s}  n={n:3d}{tag}")
    print(f"\nambiguous band: {FLASH_MODE_MAX_LIFE} < life < {REP_OWNER_LIFE_LO_60FPS} (above the "
         f"flash phase, below the owner's own measured floor) -- {score['n_ambiguous']} objects "
         "pooled")
    print(f"\n  {'shot':>4s} {'t0':>6s} {'owner':>5s} {'headroom':>8s} {'ambiguous':>9s} "
         f"{'adjudicable':>11s} {'max_add':>7s}  ids")
    for s in score["per_shot"]:
        print(f"  {s['shot']:4d} {s['t0']:6d} {s['owner']:5d} {s['headroom']:8d} "
             f"{s['n_ambiguous']:9d} {s['n_adjudicable']:11d} {s['max_additional']:7d}  "
             f"{s['adjudicable_ids']}")
    print(f"\npooled upper bound on the reference shift: {score['pooled_max_additional']} additional "
         f"pellets max / {len(score['per_shot'])} shots = {score['pooled_bound_per_shot']} "
         "pellets/shot (absolute ceiling, kit-hitsPerShot-constrained -- NOT a claim any specific "
         "object IS a pellet; that needs the owner's adjudication)")


def fade_screen(save_fixture=None):
    with open(REP_AUDIT_FIXTURE) as fh:
        fx = json.load(fh)
    rows = _fs_collect(fx["labelled"])
    score = _fs_score(rows)
    if save_fixture:
        with open(save_fixture, "w") as fh:
            json.dump({
                "_source": (f"Scored entirely off the already-committed {REP_AUDIT_FIXTURE}'s "
                           "`labelled` block -- no new raw tracks.json, no re-derivation "
                           "(CLAUDE.md reuse-before-derive). docs/probe-runs.md §9A is the "
                           "COULD-NOT-DETERMINE gap this answers."),
                "_note": ("Deliberately carries NO raw track data of its own -- `fade_screen`/"
                          f"`fade_screen_selftest` both read {REP_AUDIT_FIXTURE} directly, so this "
                          "fixture only pins the SCORE (`_expected`). Regenerate with "
                          "analyze-pellet-tracks.py --fade-screen --save-fade-screen-fixture "
                          "<path>."),
                "_expected": _fs_expected(score),
            }, fh, indent=2)
        print(f"wrote fade-screen fixture -> {save_fixture}")
    _print_fade_screen(score)
    return score


def fade_screen_selftest():
    """Constraint 9 self-validation: replay the whole arm off the already-committed
    representative-audit-slice.json and assert the result against the committed fade-screen
    fixture."""
    with open(FADE_SCREEN_FIXTURE) as fh:
        fx = json.load(fh)
    with open(REP_AUDIT_FIXTURE) as fh:
        src = json.load(fh)
    rows = _fs_collect(src["labelled"])
    score = _fs_score(rows)
    got = _fs_expected(score)
    ok = got == fx["_expected"]
    if not ok:
        for key in sorted(set(got) | set(fx["_expected"])):
            if got.get(key) != fx["_expected"].get(key):
                print(f"  DIFF {key}:\n    expected {json.dumps(fx['_expected'].get(key))}"
                      f"\n    got      {json.dumps(got.get(key))}")
    _print_fade_screen(score)
    print("SELFTEST PASS" if ok else "SELFTEST FAIL")
    return 0 if ok else 1


# ---------------------------------------------------------------- adjudication crops (evidence
# generation ONLY -- this half of the fade-screen arm never scores or verdicts anything; it renders
# the `--fade-screen`-derived adjudicable objects as filmstrips for a HUMAN to look at. See
# docs/probe-runs.md §9A and the 2026-08-04 fade-screen ask, task 2.
FADE_SCREEN_CROP_HALF = 110   # -> 220x220 source-px crop, matching the ask's "roughly 220x220"
FADE_SCREEN_CROP_SCALE = 2    # nearest-neighbour upscale factor
FADE_SCREEN_RING_RADIUS = 26  # px, in the UPSCALED panel -- clear of a pellet's own few-px blob
FADE_SCREEN_LABEL_H = 46      # px, per-panel label strip height (upscaled space)
FADE_SCREEN_TITLE_H = 56      # px, whole-filmstrip title strip height (upscaled space)


def _fsc_track_positions(labelled):
    """id -> (first, xs, ys) for every track in `labelled.tracks_raw`, so the crop generator can
    look up any adjudicable id's raw per-frame positions without re-deriving them."""
    return {tid: (first, xs, ys) for tid, first, _is_pellet, xs, ys in labelled["tracks_raw"]}


def _fsc_adjudicable_rows(labelled, shots=FADE_SCREEN_SHOTS):
    """The exact objects `--fade-screen` flags as adjudicable (ambiguous AND its shot has
    headroom > 0) -- reused, not re-picked by hand, so a future fixture regeneration keeps the crop
    generator in lockstep with the arm's own numbers instead of a frozen id list going stale."""
    rows = _fs_collect(labelled, shots)
    score = _fs_score(rows, shots)
    adjudicable_ids = {rid for s in score["per_shot"] for rid in s["adjudicable_ids"]}
    by_shot = {s["shot"]: s for s in score["per_shot"]}
    return [dict(r, headroom=by_shot[r["shot"]]["headroom"]) for r in rows if r["id"] in adjudicable_ids]


def _fsc_crop(img, cx, cy, half=FADE_SCREEN_CROP_HALF):
    """A `2*half` square crop centred on (cx, cy), shifted (not shrunk) at the frame edges so every
    panel is the same size. Returns the crop plus the object's own position IN CROP COORDINATES (the
    shift means that is not always exactly `(half, half)`)."""
    h, w = img.shape[:2]
    x0 = max(0, min(int(round(cx)) - half, w - 2 * half))
    y0 = max(0, min(int(round(cy)) - half, h - 2 * half))
    crop = img[y0:y0 + 2 * half, x0:x0 + 2 * half]
    return crop, (cx - x0, cy - y0)


def _fsc_panel(frame_path, cx, cy, label):
    """One filmstrip panel: an upscaled (nearest-neighbour, so no re-blur) crop centred on the
    object's position at this frame, a high-contrast ring drawn AROUND (never over) that position,
    and a label strip on top. Ring radius (26px, upscaled space) is well clear of a pellet's own
    few-px blob, satisfying "beside or around, never on it"."""
    img = cv2.imread(str(frame_path))
    if img is None:
        raise SystemExit(f"--fade-screen-crops: could not read frame {frame_path}")
    crop, (ox, oy) = _fsc_crop(img, cx, cy)
    up = cv2.resize(crop, None, fx=FADE_SCREEN_CROP_SCALE, fy=FADE_SCREEN_CROP_SCALE,
                    interpolation=cv2.INTER_NEAREST)
    px, py = int(round(ox * FADE_SCREEN_CROP_SCALE)), int(round(oy * FADE_SCREEN_CROP_SCALE))
    # black outline + cyan ring, both OFF the object (radius > any pellet's own extent)
    cv2.circle(up, (px, py), FADE_SCREEN_RING_RADIUS, (0, 0, 0), 4, cv2.LINE_AA)
    cv2.circle(up, (px, py), FADE_SCREEN_RING_RADIUS, (255, 255, 0), 2, cv2.LINE_AA)
    strip = np.zeros((FADE_SCREEN_LABEL_H, up.shape[1], 3), dtype=np.uint8)
    cv2.putText(strip, label, (8, FADE_SCREEN_LABEL_H - 14), cv2.FONT_HERSHEY_SIMPLEX, 0.75,
               (255, 255, 255), 2, cv2.LINE_AA)
    return np.vstack([strip, up])


def _fsc_filmstrip(frames_dir, row, id_positions):
    """The whole filmstrip for one adjudicable object: one panel per frame of its life, PLUS one
    extra panel at t0+8 (the first frame of the owner's labelled window) cropped at the object's
    LAST known position, to show it is gone by then."""
    tid, t0 = row["id"], row["t0"]
    first, xs, ys = id_positions[tid]
    panels = []
    for k, (x, y) in enumerate(zip(xs, ys)):
        fi = first + k
        offset = fi - t0
        label = f"t0{offset:+d}"
        panels.append(_fsc_panel(frames_dir / f"f_{fi + 1:05d}.png", x, y, label))
    extra_fi = t0 + 8
    panels.append(_fsc_panel(frames_dir / f"f_{extra_fi + 1:05d}.png", xs[-1], ys[-1],
                             "t0+8 (owner window opens)"))
    gap = np.full((panels[0].shape[0], 6, 3), 128, dtype=np.uint8)
    body = panels[0]
    for p in panels[1:]:
        body = np.hstack([body, gap, p])
    title = (f"shot {row['shot']}  track {tid}  life={row['life']}  span=[{row['span'][0]:+d}, "
            f"{row['span'][1]:+d}]  owner={row['owner']}  headroom={row['headroom']}")
    title_strip = np.zeros((FADE_SCREEN_TITLE_H, body.shape[1], 3), dtype=np.uint8)
    cv2.putText(title_strip, title, (10, FADE_SCREEN_TITLE_H - 18), cv2.FONT_HERSHEY_SIMPLEX, 0.8,
               (255, 255, 255), 2, cv2.LINE_AA)
    return np.vstack([title_strip, body])


def fade_screen_crops(frames_dir, out_dir):
    """TASK 2 of the 2026-08-04 fade-screen ask: render one filmstrip PNG per `--fade-screen`
    adjudicable object, plus an INDEX.md. GENERATES EVIDENCE ONLY -- decides nothing, alters no
    recorded number, and never runs as part of --selftest / pellet-selftest.sh (its output is
    owner-facing scratch in /tmp, not a committed fixture; see CLAUDE.md's constraint 9 note on
    `--fade-screen` itself, which IS the committed, tested half)."""
    frames_dir, out_dir = Path(frames_dir), Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    with open(REP_AUDIT_FIXTURE) as fh:
        fx = json.load(fh)
    labelled = fx["labelled"]
    id_positions = _fsc_track_positions(labelled)
    rows = _fsc_adjudicable_rows(labelled)
    index_rows = []
    for row in rows:
        strip = _fsc_filmstrip(frames_dir, row, id_positions)
        fname = f"shot{row['shot']}_track{row['id']}.png"
        cv2.imwrite(str(out_dir / fname), strip)
        index_rows.append((row, fname))
        print(f"wrote {out_dir / fname}")
    lines = ["| shot | track id | span (t0-relative) | lifetime | owner label | headroom | file |",
            "| ---- | -------- | ------------------- | -------- | ------------ | -------- | ---- |"]
    for row, fname in index_rows:
        lines.append(f"| {row['shot']} | {row['id']} | [{row['span'][0]:+d}, {row['span'][1]:+d}] "
                     f"| {row['life']} | {row['owner']} | {row['headroom']} | `{fname}` |")
    index_path = out_dir / "INDEX.md"
    index_path.write_text(
        "# Fade-screen adjudication crops (docs/probe-runs.md §9A)\n\n"
        "Generated by `analyze-pellet-tracks.py --fade-screen-crops` -- evidence only, decides "
        "nothing. Each row is one in-radius, non-red track that dies before its shot's own t0+8 "
        "AND falls in the life-4..7 ambiguous band AND its shot has headroom under the "
        f"hitsPerShot={REP_HITS_PER_SHOT} ceiling. Is it a fading pellet or a muzzle-flash artifact?\n\n"
        + "\n".join(lines) + "\n")
    print(f"wrote {index_path}")
    return [r for r, _ in index_rows]


# ============================================================
# THE BACKEND/MARKER-CHANNEL AUDIT (docs/probe-runs.md §11) -- the `h4-marciana` 177-vs-176
# divergence found in passing by the merge audit (§8H). Replays count-pellets.py's OWN
# `debounce_shots` in-process over a dump's tracks.json `frame_counts` -- no re-implementation, no
# local scoring variant, unlike the merge/representative-frame audits above -- and diffs it
# event-for-event against the SHIPPED `read-pellets.ts` output already sitting in that dump's
# pellets.json. Three questions, in order:
#   1. SEGMENTATION LOCKSTEP -- does the Python replay's grouping/count agree with the shipped
#      TypeScript's, event for event?
#   2. CHANNEL CENSUS -- over every frame, do tracks.json's frame_counts and pellets.json's reads
#      agree on white / red / marker?
#   3. MECHANISM -- on a marker-divergent frame, do the three detector backends tie on white+red
#      (the only channel the shipped selector ranks on), which backend(s) saw a marker, and does the
#      dump's own marker equal opencv's?
#
# READ-ONLY BY CONSTRUCTION: read-pellets.ts, count-pellets.py's debounce_shots and MARKER_MIN are
# never touched or reachable from here.
# ============================================================
BACKEND_MARKER_AUDIT_FIXTURE = "scripts/tests/fixtures/pellets/backend-marker-audit-slice.json"


def _bma_valid(total, bounds):
    return bounds[0] <= total <= bounds[1]


def _bma_segmentation(frame_counts, fps, shipped_shots, shipped_summary, bounds):
    """Replay count-pellets.py's OWN `debounce_shots` (imported in-process by
    `_count_pellets_module`, same precedent as `_merge_shipped_identity`) and diff it
    event-for-event against pellets.json's already-computed `shots`. `bounds` is the dump's OWN
    `pellets.json["bounds"]` (min/max valid total), never hardcoded -- it is what the shipped
    `validShots`/`avgTotal`/`avgRed` clamp was computed against."""
    cp = _count_pellets_module()
    py_shots, py_summary = cp.debounce_shots(frame_counts, fps,
                                              min_pellets=bounds[0], max_pellets=bounds[1])
    keys = ("white", "red", "total", "core", "frames")
    n = min(len(py_shots), len(shipped_shots))
    diff = [i for i in range(n)
            if tuple(py_shots[i][k] for k in keys) != tuple(shipped_shots[i][k] for k in keys)]
    flips = [i for i in diff if _bma_valid(py_shots[i]["total"], bounds)
             != _bma_valid(shipped_shots[i]["total"], bounds)]
    detail = [{"index": i, "start": py_shots[i]["start"], "end": py_shots[i]["end"],
              "frames": py_shots[i]["frames"],
              "py": {k: py_shots[i][k] for k in keys},
              "shipped": {k: shipped_shots[i][k] for k in keys}}
              for i in diff]
    return {
        "py_totalShots": len(py_shots), "shipped_totalShots": len(shipped_shots),
        "len_mismatch": len(py_shots) != len(shipped_shots),
        "n_events_compared": n, "n_diff_events": len(diff), "diff_events": diff,
        "n_flip_validity": len(flips), "flip_events": flips, "diff_detail": detail,
        "py_summary": py_summary, "shipped_summary": shipped_summary,
    }


def _bma_census(frame_counts, reads):
    """Per-frame comparison of tracks.json's own `frame_counts` against pellets.json's `reads`, on
    the three channels debounce_shots and the backend selector consume: `white`/`red` feed
    debounce_shots's `totals` (both sides), `marker` never does -- it only feeds MARKER_MIN's
    core-hit flag (§11E). Histogram keys are stringified up front so a freshly-computed report and
    one round-tripped through JSON (the fixture replay) compare equal."""
    n = min(len(frame_counts), len(reads))
    white_diff = red_diff = 0
    marker_diff = []
    hist = collections.Counter()
    for j in range(n):
        a, b = frame_counts[j], reads[j]
        if a["white"] != b["white"]:
            white_diff += 1
        if a["red"] != b["red"]:
            red_diff += 1
        am, bm = a.get("marker", 0), b.get("marker", 0)
        if am != bm:
            marker_diff.append(j)
            hist[str(am - bm)] += 1
    return {"n_frames": n, "white_diff_frames": white_diff, "red_diff_frames": red_diff,
            "marker_diff_frames": marker_diff, "n_marker_diff": len(marker_diff),
            "marker_diff_hist": dict(sorted(hist.items(), key=lambda kv: int(kv[0])))}


def _bma_mechanism(marker_diff, frame_counts, backends_of):
    """For every marker-divergent frame: do all three backends TIE on white+red (the only channel
    the shipped selector ranks on, §11E), was a marker seen by opencv ONLY, and does the dump's own
    marker equal opencv's -- the three unanimous checks §11's mechanism claim rests on."""
    tie = opencv_only = dump_eq_opencv = 0
    detail = []
    for j in marker_diff:
        be = backends_of(j)
        wr = {k: be[k]["white"] + be[k]["red"] for k in be}
        is_tie = len(set(wr.values())) == 1
        saw = {k: be[k].get("marker", 0) > 0 for k in be}
        is_opencv_only = saw.get("opencv", False) and not any(
            v for k, v in saw.items() if k != "opencv")
        is_dump_eq = frame_counts[j].get("marker", 0) == be.get("opencv", {}).get("marker", 0)
        tie += is_tie
        opencv_only += is_opencv_only
        dump_eq_opencv += is_dump_eq
        detail.append({"frame": j, "tie": is_tie, "opencv_only": is_opencv_only,
                       "dump_eq_opencv": is_dump_eq})
    return {"n": len(marker_diff), "backends_tie_white_red": tie,
            "opencv_only_saw_marker": opencv_only, "dump_marker_eq_opencv": dump_eq_opencv,
            "detail": detail}


def _bma_dump_report(name, fps, frame_counts, reads, backends_of, shipped_shots, shipped_summary,
                     bounds):
    seg = _bma_segmentation(frame_counts, fps, shipped_shots, shipped_summary, bounds)
    census = _bma_census(frame_counts, reads)
    mech = _bma_mechanism(census["marker_diff_frames"], frame_counts, backends_of)
    return {"dump": name, "fps": fps, "bounds": list(bounds),
            "segmentation": seg, "census": census, "mechanism": mech}


def _bma_pool(reports):
    return {
        "n_dumps": len(reports),
        "n_events": sum(r["segmentation"]["n_events_compared"] for r in reports),
        "n_diff_events": sum(r["segmentation"]["n_diff_events"] for r in reports),
        "n_flip_validity": sum(r["segmentation"]["n_flip_validity"] for r in reports),
        "n_frames": sum(r["census"]["n_frames"] for r in reports),
        "n_marker_diff": sum(r["census"]["n_marker_diff"] for r in reports),
        "white_diff_frames": sum(r["census"]["white_diff_frames"] for r in reports),
        "red_diff_frames": sum(r["census"]["red_diff_frames"] for r in reports),
    }


def _bma_expected(reports):
    """The pinned summary: per dump, the segmentation lockstep + diff detail, the channel census,
    and the mechanism counts -- everything docs/probe-runs.md §11's numbers are read off."""
    def block(r):
        seg, census, mech = r["segmentation"], r["census"], r["mechanism"]
        return {
            "fps": r["fps"], "bounds": r["bounds"],
            "py_totalShots": seg["py_totalShots"], "shipped_totalShots": seg["shipped_totalShots"],
            "n_events_compared": seg["n_events_compared"], "n_diff_events": seg["n_diff_events"],
            "diff_events": seg["diff_events"], "n_flip_validity": seg["n_flip_validity"],
            "flip_events": seg["flip_events"], "diff_detail": seg["diff_detail"],
            "py_summary": seg["py_summary"], "shipped_summary": seg["shipped_summary"],
            "n_frames": census["n_frames"], "white_diff_frames": census["white_diff_frames"],
            "red_diff_frames": census["red_diff_frames"], "n_marker_diff": census["n_marker_diff"],
            "marker_diff_hist": census["marker_diff_hist"],
            "mech_n": mech["n"], "backends_tie_white_red": mech["backends_tie_white_red"],
            "opencv_only_saw_marker": mech["opencv_only_saw_marker"],
            "dump_marker_eq_opencv": mech["dump_marker_eq_opencv"],
            "mech_detail": mech["detail"],
        }
    return {"per_dump": [{"dump": r["dump"], **block(r)} for r in reports]}


def _print_backend_marker_audit(reports, pooled):
    print("\nSEGMENTATION LOCKSTEP -- count-pellets.py's own debounce_shots, replayed over each "
          "dump's tracks.json frame_counts, diffed event-for-event against pellets.json's shots")
    print(f"{'dump':26s} {'py.tot':>7s} {'sh.tot':>7s} {'ndiff':>6s} {'nflip':>6s}")
    for r in reports:
        seg = r["segmentation"]
        print(f"{r['dump'][:26]:26s} {seg['py_totalShots']:7d} {seg['shipped_totalShots']:7d} "
              f"{seg['n_diff_events']:6d} {seg['n_flip_validity']:6d}")
    for r in reports:
        for d in r["segmentation"]["diff_detail"]:
            print(f"  {r['dump']} event #{d['index']} span=[{d['start']}, {d['end']}) "
                  f"frames={d['frames']}  py={d['py']}  shipped={d['shipped']}")

    print("\nCHANNEL CENSUS -- tracks.json frame_counts[j] vs pellets.json reads[j], every frame")
    print(f"{'dump':26s} {'frames':>7s} {'white':>6s} {'red':>6s} {'marker':>7s}  hist(dump-reads)")
    for r in reports:
        c = r["census"]
        print(f"{r['dump'][:26]:26s} {c['n_frames']:7d} {c['white_diff_frames']:6d} "
              f"{c['red_diff_frames']:6d} {c['n_marker_diff']:7d}  {c['marker_diff_hist']}")

    print("\nMECHANISM -- on every marker-divergent frame: do all 3 backends tie on white+red, "
          "which saw a marker, does the dump's marker == opencv's")
    print(f"{'dump':26s} {'n':>5s} {'tie':>5s} {'opencvOnly':>10s} {'dumpEqOpencv':>12s}")
    for r in reports:
        m = r["mechanism"]
        print(f"{r['dump'][:26]:26s} {m['n']:5d} {m['backends_tie_white_red']:5d} "
              f"{m['opencv_only_saw_marker']:10d} {m['dump_marker_eq_opencv']:12d}")

    print(f"\nPOOLED over {pooled['n_dumps']} dumps: {pooled['n_events']} events compared, "
          f"{pooled['n_diff_events']} differ, {pooled['n_flip_validity']} flip validity; "
          f"{pooled['n_frames']} frames, {pooled['n_marker_diff']} marker-divergent "
          f"(white diff {pooled['white_diff_frames']}, red diff {pooled['red_diff_frames']})")


def _bma_load_dump(path):
    """Load one --backend-marker-audit DUMP_DIR: its tracks.json (for `frame_counts`) and
    pellets.json (for `reads`/`shots`/`summary`/`bounds`/`fps` -- the SHIPPED read-pellets.ts
    output, read as-is, never re-derived)."""
    d = Path(path)
    with open(d / "tracks.json") as fh:
        tracks = json.load(fh)
    with open(d / "pellets.json") as fh:
        pel = json.load(fh)
    frame_counts = tracks.get("frame_counts") or []
    if not frame_counts:
        raise SystemExit(f"--backend-marker-audit: {d}/tracks.json carries no `frame_counts` "
                         "(re-dump with count-pellets.py --dump-tracks)")
    reads = pel["reads"]
    shipped_shots = pel["shots"]
    shipped_summary = {k: pel["summary"][k]
                       for k in ("totalShots", "validShots", "avgTotal", "avgRed")}
    bounds = (pel["bounds"]["min"], pel["bounds"]["max"])
    return d.name, pel["fps"], frame_counts, reads, shipped_shots, shipped_summary, bounds


def _bma_slim(name, fps, frame_counts, reads, shipped_shots, shipped_summary, bounds, marker_diff):
    """One dump reduced to compact tuples for the fixture. FULL frame_counts/reads/shots -- NOT
    sliced to a window like `_merge_slim`/`_rep_slim` -- because §11's pinned numbers (totalShots,
    which event differs) are FULL-CLIP totals; a window slice would change `totalShots` and stop
    being the number docs/probe-runs.md cites. `backends_divergent` carries the per-backend
    white/red/marker triple ONLY for the marker-divergent frames -- the only ones the mechanism
    check ever reads; storing all ~5700 frames' 9-int backend triples would be a large size increase
    for data that agrees on every other frame."""
    return {
        "dump": name, "fps": fps, "bounds": list(bounds),
        "frame_counts": [[c["white"], c["red"], c.get("marker", 0)] for c in frame_counts],
        "reads": [[r["white"], r["red"], r.get("marker", 0), r["total"], int(bool(r["valid"]))]
                  for r in reads],
        "shots": [[s["white"], s["red"], s["total"], s["frames"], int(bool(s["core"]))]
                  for s in shipped_shots],
        "summary": shipped_summary,
        "backends_divergent": [
            [j] + [reads[j]["backends"][be].get(field, 0)
                   for be in ("numpy", "pil", "opencv") for field in ("white", "red", "marker")]
            for j in marker_diff
        ],
    }


def _bma_expand(d):
    """Compact fixture tuples -> the dict/callable shapes `_bma_dump_report` reads. Mirrors
    `_merge_expand`/`_rep_expand_dump`."""
    frame_counts = [{"white": w, "red": r, "marker": m} for w, r, m in d["frame_counts"]]
    reads = [{"white": w, "red": r, "marker": m, "total": t, "valid": bool(v)}
             for w, r, m, t, v in d["reads"]]
    shipped_shots = [{"white": w, "red": r, "total": t, "frames": f, "core": bool(c)}
                     for w, r, t, f, c in d["shots"]]
    backends_map = {}
    for row in d["backends_divergent"]:
        j, nw, nr, nm, pw, pr, pm, ow, orr, om = row
        backends_map[j] = {"numpy": {"white": nw, "red": nr, "marker": nm},
                           "pil": {"white": pw, "red": pr, "marker": pm},
                           "opencv": {"white": ow, "red": orr, "marker": om}}

    def backends_of(j):
        return backends_map[j]
    return (d["dump"], d["fps"], frame_counts, reads, backends_of, shipped_shots, d["summary"],
            tuple(d["bounds"]))


def audit_backend_marker(dump_dirs, save_fixture=None):
    reports, slims = [], []
    for path in dump_dirs:
        name, fps, frame_counts, reads, shipped_shots, shipped_summary, bounds = _bma_load_dump(path)

        def backends_of(j, reads=reads):
            return reads[j]["backends"]
        rep = _bma_dump_report(name, fps, frame_counts, reads, backends_of, shipped_shots,
                               shipped_summary, bounds)
        reports.append(rep)
        if save_fixture:
            slims.append(_bma_slim(name, fps, frame_counts, reads, shipped_shots, shipped_summary,
                                   bounds, rep["census"]["marker_diff_frames"]))
    if not reports:
        print("no readable dumps given")
        return None
    pooled = _bma_pool(reports)
    if save_fixture:
        with open(save_fixture, "w") as fh:
            json.dump({
                "_source": ("Each dump's committed tracks.json (count-pellets.py --dump-tracks) + "
                            "pellets.json (the shipped read-pellets.ts output), for the "
                            "2026-08-04 backend/marker-channel audit (docs/probe-runs.md §11). "
                            "Constraint 9 self-validation, same precedent as merge-audit-slice.json."),
                "_note": ("FULL-CLIP per dump, not a window slice (see _bma_slim's docstring): "
                          "`frame_counts` are [white, red, marker] tuples, `reads` are "
                          "[white, red, marker, total, valid01] tuples, `shots` are "
                          "[white, red, total, frames, core01] tuples, and "
                          "`backends_divergent` is [frame, numpy.white, numpy.red, numpy.marker, "
                          "pil.white, pil.red, pil.marker, opencv.white, opencv.red, "
                          "opencv.marker] for every marker-divergent frame only. Regenerate with "
                          "analyze-pellet-tracks.py --backend-marker-audit <dump-dir...> "
                          "--save-backend-marker-audit-fixture <path>."),
                "dumps": slims,
                "_expected": _bma_expected(reports),
            }, fh)
        print(f"wrote backend-marker-audit fixture -> {save_fixture}")
    _print_backend_marker_audit(reports, pooled)
    return {"dumps": reports, "pooled": pooled}


def backend_marker_audit_selftest():
    """Constraint 9 self-validation: replay the whole arm over the committed FULL-CLIP dumps and
    assert both the general `_expected` dict AND the §11 pinned h4-marciana-structural numbers
    explicitly, so a fixture edit that moved one of them cannot hide behind a coarse dict-equality
    pass."""
    with open(BACKEND_MARKER_AUDIT_FIXTURE) as fh:
        fx = json.load(fh)
    reports = []
    expanded_by_name = {}
    for d in fx["dumps"]:
        name, fps, frame_counts, reads, backends_of, shipped_shots, shipped_summary, bounds = \
            _bma_expand(d)
        expanded_by_name[name] = (frame_counts, backends_of)
        reports.append(_bma_dump_report(name, fps, frame_counts, reads, backends_of, shipped_shots,
                                        shipped_summary, bounds))
    pooled = _bma_pool(reports)
    got = _bma_expected(reports)
    ok = got == fx["_expected"]
    if not ok:
        for g, e in zip(got["per_dump"], fx["_expected"]["per_dump"]):
            if g != e:
                print(f"  DIFF dump {g.get('dump')}:\n    expected {json.dumps(e)}"
                      f"\n    got      {json.dumps(g)}")

    anchor = next((r for r in reports if r["dump"] == "h4-marciana-structural"), None)
    checks = []
    if anchor is None:
        checks.append(("h4-marciana-structural present", False))
    else:
        seg, census, mech = anchor["segmentation"], anchor["census"], anchor["mechanism"]
        ps, ss = seg["py_summary"], seg["shipped_summary"]
        e56 = next((d for d in seg["diff_detail"] if d["index"] == 56), None)
        checks += [
            ("py_totalShots == 218", seg["py_totalShots"] == 218),
            ("shipped_totalShots == 218", seg["shipped_totalShots"] == 218),
            ("n_diff_events == 1", seg["n_diff_events"] == 1),
            ("diff_events == [56]", seg["diff_events"] == [56]),
            ("n_flip_validity == 1", seg["n_flip_validity"] == 1),
            ("event 56 exists", e56 is not None),
            ("event 56 span == [1555, 1569)", e56 is not None and (e56["start"], e56["end"])
             == (1555, 1569)),
            ("event 56 frames == 14", e56 is not None and e56["frames"] == 14),
            ("event 56 py white/red/total/core == 4/1/5/True", e56 is not None
             and (e56["py"]["white"], e56["py"]["red"], e56["py"]["total"], e56["py"]["core"])
             == (4, 1, 5, True)),
            ("event 56 shipped white/red/total/core == 4/0/4/False", e56 is not None
             and (e56["shipped"]["white"], e56["shipped"]["red"], e56["shipped"]["total"],
                  e56["shipped"]["core"]) == (4, 0, 4, False)),
            ("py validShots/avgTotal/avgRed == 177/7.2/0.15",
             (ps["validShots"], ps["avgTotal"], ps["avgRed"]) == (177, 7.2, 0.15)),
            ("shipped validShots/avgTotal/avgRed == 176/7.3/0.14",
             (ss["validShots"], ss["avgTotal"], ss["avgRed"]) == (176, 7.3, 0.14)),
            ("white_diff_frames == 0", census["white_diff_frames"] == 0),
            ("red_diff_frames == 0", census["red_diff_frames"] == 0),
            ("n_marker_diff == 82", census["n_marker_diff"] == 82),
            ("marker_diff_hist == {1:76, 2:4, 3:2}",
             census["marker_diff_hist"] == {"1": 76, "2": 4, "3": 2}),
            ("mechanism n == 82", mech["n"] == 82),
            ("backends_tie_white_red == 82/82", mech["backends_tie_white_red"] == 82),
            ("opencv_only_saw_marker == 82/82", mech["opencv_only_saw_marker"] == 82),
            ("dump_marker_eq_opencv == 82/82", mech["dump_marker_eq_opencv"] == 82),
        ]
        frame_counts, backends_of = expanded_by_name["h4-marciana-structural"]
        be1565 = backends_of(1565)
        checks.append(("frame 1565 backends numpy/pil/opencv == "
                       "{0,0,0}/{0,0,0}/{white 0, red 0, marker 3}",
                       be1565["numpy"] == {"white": 0, "red": 0, "marker": 0}
                       and be1565["pil"] == {"white": 0, "red": 0, "marker": 0}
                       and be1565["opencv"] == {"white": 0, "red": 0, "marker": 3}))

    all_ok = ok and all(v for _, v in checks)
    for label, v in checks:
        print(f"  {'PASS' if v else 'FAIL'}  {label}")
    print(f"pooled over {pooled['n_dumps']} dumps: {pooled['n_events']} events, "
          f"{pooled['n_diff_events']} differ, {pooled['n_flip_validity']} flip validity, "
          f"{pooled['n_marker_diff']}/{pooled['n_frames']} frames marker-divergent")
    print("SELFTEST PASS" if all_ok else "SELFTEST FAIL")
    return 0 if all_ok else 1


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


# ============================================================
# THE HYBRID-LANDING AUDIT (docs/probe-runs.md §13; docs/handoffs/
# 2026-08-04-representative-frame-PROPOSAL.md). §9-§12 measured the fallback hybrid as a scoring
# VARIANT inside this file's `--policy-score` arm (`hybrid_plateau_median` in `_ps_score_event`).
# This arm checks the rule as it now actually SHIPS -- count-pellets.py's `band` channel
# (`_frame_pellet_counts`) and its hybrid branch inside `debounce_shots` (§13) -- against the four
# mandatory landing criteria, calling the SHIPPED functions directly rather than re-deriving a
# THIRD implementation of the same algorithm here.
#
# REUSE, NOT RE-DERIVE (CLAUDE.md constraint / the sufficiency rule): everything the AUDIT side
# needs -- the ground-truth plateau series, the labelled block's raw tracks, each of the 5 dumps'
# reduced `radius_tracks` -- already lives in the committed REP_AUDIT_FIXTURE
# (representative-audit-slice.json), produced independently by §9/§10's own arm. This audit reads
# it rather than re-deriving any of that. The ONE thing it cannot supply is production's OWN band
# COMPUTATION on the 5 full-clip dumps (the fixture's `radius_tracks` are ALREADY radius-gated --
# reusing them for the equivalence check would just be re-running the audit side against itself),
# so that piece alone needs each dump's LIVE tracks.json (full track list, not reduced) -- the
# same scratchpad dumps `--representative-audit`/`--backend-marker-audit` already read live.
# ============================================================
HYBRID_LANDING_FIXTURE = "scripts/tests/fixtures/pellets/hybrid-landing-audit-slice.json"


def _hla_reconstruct_frame_tracks(tracks, n_frames, offset=0):
    """Rebuild `build_tracks_and_counts`'s per-frame `frame_tracks` shape -- a per-frame list of
    (track_id, x, y, is_red) -- directly from a committed/live track list (dicts carrying `id`,
    `is_red`, `first`, `xs`, `ys`), with NO re-tracking. Re-running the nearest-neighbor tracker
    over these same points would risk a different crossing-track assignment than the ORIGINAL live
    run made (a real, if rare, source of drift this reconstruction avoids by construction: it
    reuses the track IDENTITY the original tracker already committed to, and only re-derives which
    FRAMES that identity was in-radius on). `offset` shifts ABSOLUTE track frame indices down to
    the local `0..n_frames-1` array this function returns, matching how `cross_positions` is
    indexed by every caller here."""
    frame_tracks = [[] for _ in range(n_frames)]
    track_life = {}
    for t in tracks:
        tid, is_red, first, xs, ys = t["id"], t["is_red"], t["first"], t["xs"], t["ys"]
        # D2 (2026-08-05-dump-schema-LANDING-PLAN.md §2.2): prefer the PER-FRAME `reds` channel
        # when the dump carries it -- kills SPLIT (docs/probe-runs.md §25B) by classifying each
        # frame's component instead of the track's creation-time `is_red`. Falls back to the
        # track-level value (today's behaviour, byte-identical) when `reds` is absent or short, so
        # a pre-fix or hand-built dump degrades gracefully instead of IndexError-ing mid-audit.
        reds = t.get("reds")
        life = len(xs)
        track_life[tid] = life
        for k in range(life):
            fi = first + k - offset
            if 0 <= fi < n_frames:
                frame_is_red = reds[k] if reds and k < len(reds) else is_red
                frame_tracks[fi].append((tid, xs[k], ys[k], frame_is_red))
    return frame_tracks, track_life


def _hla_production_band(tracks, cross_positions, params, fps, offset=0):
    """PRODUCTION's OWN `band` channel: count-pellets.py's real `_frame_pellet_counts`, called on
    `frame_tracks` reconstructed from `tracks` (see `_hla_reconstruct_frame_tracks`) -- the same
    function `build_tracks_and_counts` calls in the shipped `--temporal` pipeline, imported
    in-process rather than re-implemented. Returns a plain per-frame list, local-indexed like
    `cross_positions`."""
    cp = _count_pellets_module()
    n = len(cross_positions)
    frame_tracks, track_life = _hla_reconstruct_frame_tracks(tracks, n, offset)
    max_pf = params["max_pellet_frames"]
    pellet_ids = {tid for tid, life in track_life.items() if life <= max_pf}
    band_lo = cp._band_lo(fps)
    band_ids = {tid for tid in pellet_ids if band_lo <= track_life[tid] <= max_pf}
    # D4 (2026-08-05-dump-schema-LANDING-PLAN.md §2.2): resolve marker_radius from the dump's own
    # persisted `params` (Edit C) with the same fallback-to-default-65 D3 uses, instead of
    # hardcoding 65 here. Output impact today is ZERO -- `_frame_pellet_counts`'s `band` branch is
    # gated on `not is_red` only and never consults `marker_radius` -- this is a provenance-
    # correctness edit so a future extension of this function's `marker` output isn't silently
    # wrong on dumps with a non-default marker_radius (plan's stated non-overclaim).
    args_ns = SimpleNamespace(pellet_radius=params["pellet_radius"],
                               marker_radius=params.get("marker_radius", 65))
    prod = cp._frame_pellet_counts(frame_tracks, cross_positions, pellet_ids, band_ids, args_ns)
    return [r["band"] for r in prod]


def _hla_equivalence(prod_band, audit_totals, offset, n):
    """MANDATORY CHECK 1: per-frame diff between PRODUCTION's `band` (`prod_band`, local-indexed)
    and this file's INDEPENDENT `_ps_band_totals` (`audit_totals`, an absolute-indexed Counter --
    a different aggregation path over the SAME underlying per-track radius/lifetime facts: audit
    walks track-then-frame over already radius-gated runs; production walks frame-then-track
    inside the same pass that applies the radius/lifetime gates in the first place)."""
    diffs = [k for k in range(n) if prod_band[k] != audit_totals.get(k + offset, 0)]
    return {"n_frames": n, "n_mismatch": len(diffs), "diff_frames": diffs[:20]}


def _hla_score(frame_counts, band, fps, marker_min=2, min_pellets=5, max_pellets=10):
    """PRODUCTION's real `debounce_shots`, fed a band-augmented `frame_counts` array built from
    `frame_counts` (white/red/marker dicts) + `band` (a same-length list of ints). Every check in
    this arm that needs a `debounce_shots` answer routes through this one call, so `_expected` can
    only ever be this function's own numbers (same discipline as `_ps_score_labelled`/
    `_ps_score_dump`)."""
    cp = _count_pellets_module()
    frames = [dict(fc, band=b) for fc, b in zip(frame_counts, band)]
    return cp.debounce_shots(frames, fps, marker_min, min_pellets, max_pellets)


def _hla_falsification(frame_counts, band, shots_hybrid, fps, marker_min=2, min_pellets=5,
                       max_pellets=10):
    """MANDATORY CHECK 3: on every event where NO frame in its own span carries `band > 0`, the
    hybrid shot must be BIT-IDENTICAL to the shipped (band-stripped) answer -- same representative
    frame, same white/red/total. Segmentation is untouched by the hybrid rule (docs/probe-runs.md
    §12C), so `shots_hybrid` and the band-stripped replay below share the same event count/order by
    construction; this only asserts the PER-EVENT falsification control, not segmentation again."""
    cp = _count_pellets_module()
    shots_shipped, _ = cp.debounce_shots(frame_counts, fps, marker_min, min_pellets, max_pellets)
    n = min(len(shots_hybrid), len(shots_shipped))
    bad = []
    for i in range(n):
        h, s = shots_hybrid[i], shots_shipped[i]
        no_band = not any(band[j] > 0 for j in range(h["start"], h["end"]))
        if no_band and (h["frame"], h["white"], h["red"], h["total"]) != (
                s["frame"], s["white"], s["red"], s["total"]):
            bad.append(i)
    return {"n_events": n, "n_bad": len(bad), "bad_events": bad}


def _hla_ts_lockstep(frame_counts, band, fps, marker_min=2, min_pellets=5, max_pellets=10):
    """MANDATORY CHECK 4, LIVE ONLY (needs `npx tsx`; not replayed by the selftest, same
    live/replay split as `audit_representative`'s "FULL-CLIP CONTROL"): feed count-pellets.py's
    `debounce_shots` AND read-pellets.ts's `debounceShots` (via its `--debounce-json` harness) the
    SAME frame_counts-with-band array and diff the results event-for-event."""
    cp = _count_pellets_module()
    frames = [dict(fc, band=b) for fc, b in zip(frame_counts, band)]
    py_shots, _ = cp.debounce_shots(frames, fps, marker_min, min_pellets, max_pellets)
    tf = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False)
    try:
        json.dump(frames, tf)
        tf.close()
        proc = subprocess.run(
            ["npx", "tsx", str(HERE / "read-pellets.ts"), "--debounce-json", tf.name,
             "--fps", str(fps), "--marker-min", str(marker_min),
             "--min-pellets", str(min_pellets), "--max-pellets", str(max_pellets)],
            capture_output=True, text=True, cwd=str(HERE.parent.parent))
    finally:
        os.unlink(tf.name)
    if proc.returncode != 0:
        return {"ok": False, "error": proc.stderr[-2000:]}
    ts_out = json.loads(proc.stdout.strip().splitlines()[-1])
    ts_shots = ts_out["shots"]
    keys = ("frame", "white", "red", "total", "frames", "core")
    n = min(len(py_shots), len(ts_shots))
    diff = [i for i in range(n)
           if tuple(py_shots[i][k] for k in keys) != tuple(ts_shots[i][k] for k in keys)]
    return {"ok": not diff and len(py_shots) == len(ts_shots), "n_py": len(py_shots),
           "n_ts": len(ts_shots), "n_diff": len(diff), "diff_events": diff[:20]}


def audit_hybrid_landing(dump_dirs, save_fixture=None, ts_lockstep=False):
    with open(REP_AUDIT_FIXTURE) as fh:
        fx_rep = json.load(fh)
    name_fps = {d["tracks"]: d["fps"] for d in fx_rep["dumps"]}

    fixture = {"labelled": {}, "dumps": []}
    report = {"labelled": {}, "dumps": [], "lockstep": []}

    # ---- labelled block (n=5 categorical half), both crops ----
    block = fx_rep["labelled"]
    fps = block["fps"]
    offset = block["offset"]
    n = len(block["frame_counts"])
    frame_counts_base = [{"white": w, "red": r, "marker": m} for w, r, m in block["frame_counts"]]
    max_pf = block["params"]["max_pellet_frames"]
    band_range = _ps_band(fps, max_pf)
    tracks_dicts = [{"id": tid, "is_red": False, "first": first, "xs": xs, "ys": ys}
                    for tid, first, _isp, xs, ys in block["tracks_raw"]]
    truth = _ps_ground_truth_series(fx_rep)

    per_crop = {}
    for crop_key, cross_key in (("structural", "cross"), ("template", "cross_tmpl")):
        cross = [tuple(c) if c else None for c in block[cross_key]]
        prod_band = _hla_production_band(tracks_dicts, cross, block["params"], fps, offset)
        rtracks = _ps_labelled_radius_tracks(block, cross_key)
        audit_totals = _ps_band_totals(rtracks, band_range)
        equiv = _hla_equivalence(prod_band, audit_totals, offset, n)
        if equiv["n_mismatch"]:
            raise SystemExit(f"--hybrid-landing-audit: EQUIVALENCE FAILED on labelled/{crop_key}: "
                             f"{equiv['n_mismatch']}/{equiv['n_frames']} frames disagree "
                             f"{equiv['diff_frames']}")
        shots, summary = _hla_score(frame_counts_base, prod_band, fps)
        per_crop[crop_key] = {"band": prod_band, "shots": shots, "summary": summary,
                              "equivalence": equiv}

    cat_rows = []
    for s in _rep_load_labels():
        t0 = s["t0"]
        crop = "template" if s["locate"] == "template" else "structural"
        shots = per_crop[crop]["shots"]
        ev = next((sh for sh in shots if sh["start"] + offset <= t0 < sh["end"] + offset), None)
        if ev is None:
            raise SystemExit(f"--hybrid-landing-audit: labelled shot {s['shot']} (t0={t0}) falls "
                             "in no production event")
        rep_offset = (ev["frame"] + offset) - t0
        plateau = _ps_plateau(truth[s["shot"]])
        cat_rows.append({"shot": s["shot"], "crop": crop, "rep_offset": rep_offset,
                         "total": ev["total"], "in_plateau": rep_offset in plateau})
    cat_score = sum(1 for r in cat_rows if r["in_plateau"])
    fixture["labelled"] = {crop: {"band": v["band"]} for crop, v in per_crop.items()}
    report["labelled"] = {"categorical": cat_rows, "categorical_score": cat_score,
                          "equivalence": {crop: v["equivalence"] for crop, v in per_crop.items()},
                          "summary": {crop: v["summary"] for crop, v in per_crop.items()}}
    if ts_lockstep:
        report["lockstep"].append({"dump": "labelled/structural",
                                   **_hla_ts_lockstep(frame_counts_base, per_crop["structural"]["band"], fps)})

    # ---- the 5 full-clip dumps (ceiling/n_scored/falsification half) ----
    pooled_n = pooled_above = pooled_valid_n = 0
    pooled_valid_total = pooled_all_total = 0
    for d in dump_dirs:
        with open(Path(d) / "tracks.json") as fh:
            dump = json.load(fh)
        name = f"{Path(d).name}/tracks.json"
        if name not in name_fps:
            raise SystemExit(f"--hybrid-landing-audit: {name} is not one of REP_AUDIT_FIXTURE's "
                             f"5 dumps ({sorted(name_fps)})")
        dfps = name_fps[name]
        n_d = len(dump["frame_counts"])
        cross = [tuple(c) if c else None for c in dump["cross_positions"]]
        prod_band = _hla_production_band(dump["tracks"], cross, dump["params"], dfps, offset=0)
        radius = dump["params"]["pellet_radius"]
        rtracks = [(t["life"], _rep_radius_runs(
                       {"first": t["first"], "last": t["last"], "xs": t["xs"], "ys": t["ys"]},
                       cross, radius))
                   for t in dump["tracks"] if not t["is_red"]]
        rtracks = [(life, runs) for life, runs in rtracks if runs]
        band_range_d = _ps_band(dfps, dump["params"]["max_pellet_frames"])
        audit_totals = _ps_band_totals(rtracks, band_range_d)
        equiv = _hla_equivalence(prod_band, audit_totals, 0, n_d)
        if equiv["n_mismatch"]:
            raise SystemExit(f"--hybrid-landing-audit: EQUIVALENCE FAILED on {name}: "
                             f"{equiv['n_mismatch']}/{equiv['n_frames']} frames disagree "
                             f"{equiv['diff_frames']}")
        frame_counts_d = [{"white": c["white"], "red": c["red"], "marker": c.get("marker", 0)}
                          for c in dump["frame_counts"]]
        shots_hybrid, summary_hybrid = _hla_score(frame_counts_d, prod_band, dfps)
        fals = _hla_falsification(frame_counts_d, prod_band, shots_hybrid, dfps)
        if fals["n_bad"]:
            raise SystemExit(f"--hybrid-landing-audit: FALSIFICATION CONTROL FAILED on {name}: "
                             f"{fals['n_bad']}/{fals['n_events']} no-band events differ from "
                             f"shipped {fals['bad_events']}")
        for sh in shots_hybrid:
            pooled_n += 1
            pooled_all_total += sh["total"]
            if sh["total"] > REP_HITS_PER_SHOT:
                pooled_above += 1
            if MERGE_MIN_PELLETS <= sh["total"] <= MERGE_MAX_PELLETS:
                pooled_valid_n += 1
                pooled_valid_total += sh["total"]
        fixture["dumps"].append({"name": name, "fps": dfps, "band": prod_band})
        report["dumps"].append({"name": name, "fps": dfps, "n_events": len(shots_hybrid),
                                "summary": summary_hybrid, "equivalence": equiv,
                                "falsification": fals})
        if ts_lockstep:
            report["lockstep"].append({"dump": name,
                                       **_hla_ts_lockstep(frame_counts_d, prod_band, dfps)})

    report["pooled"] = {
        "n_scored": pooled_n, "no_rep": 0,  # production has no abstain path (PROPOSAL §2)
        "above_ceiling_pct": round(100 * pooled_above / pooled_n, 1) if pooled_n else None,
        # TWO DIFFERENT avgTotal DEFINITIONS, both reported-only (PROPOSAL §4 criterion 6 / never a
        # ranking criterion): `avgTotal_validShots` is what a REAL run's own `summary.avgTotal`
        # would show (the 5..10 valid-total clamp `debounce_shots` itself applies);
        # `avgTotal_unclamped` is the audit arm's OWN convention (§9F/§10D/§12A: mean over every
        # SCORED event, no clamp) -- directly comparable to those sections' cited figures. Do not
        # conflate the two or read a delta between them as a finding.
        "avgTotal_validShots": round(pooled_valid_total / pooled_valid_n, 4) if pooled_valid_n else None,
        "avgTotal_unclamped": round(pooled_all_total / pooled_n, 4) if pooled_n else None,
    }

    if save_fixture:
        with open(save_fixture, "w") as fh:
            json.dump({
                "_source": ("REP_AUDIT_FIXTURE (representative-audit-slice.json) for everything "
                            "the AUDIT side needs (ground-truth plateau, labelled tracks_raw, "
                            "each dump's radius_tracks) + each dump's LIVE tracks.json (production "
                            "band reconstruction only, which the reduced radius_tracks cannot "
                            "supply) for the 2026-08-04 hybrid-landing audit (docs/probe-runs.md "
                            "§13). Constraint 9 self-validation, same precedent as the other "
                            "pellets/*-audit-slice.json fixtures."),
                "_note": ("`labelled` carries production's per-frame `band` series for both crops "
                          "(structural/template) over the SAME window REP_AUDIT_FIXTURE's labelled "
                          "block covers. `dumps` carries production's `band` series for each of "
                          "the 5 full-clip dumps, full length, local-indexed 0..n-1 (offset 0 -- "
                          "these are un-sliced). Regenerate with analyze-pellet-tracks.py "
                          "--hybrid-landing-audit <dump-dir...> --save-hybrid-landing-audit-fixture "
                          "<path> [--hybrid-landing-audit-ts-lockstep] (the TS lockstep needs `npx "
                          "tsx` and is NOT replayed by the selftest, same live-only convention as "
                          "audit_representative's FULL-CLIP CONTROL)."),
                "labelled": fixture["labelled"], "dumps": fixture["dumps"],
                "_expected": _hla_expected(report),
            }, fh)
        print(f"wrote hybrid-landing-audit fixture -> {save_fixture}")
    _print_hybrid_landing_audit(report)
    return report


def _hla_expected(report):
    return {
        "labelled_categorical": report["labelled"]["categorical"],
        "labelled_categorical_score": report["labelled"]["categorical_score"],
        "labelled_equivalence": {k: {kk: vv for kk, vv in v.items() if kk != "diff_frames"}
                                 for k, v in report["labelled"]["equivalence"].items()},
        "labelled_summary": report["labelled"]["summary"],
        "dumps": [{"name": d["name"], "fps": d["fps"], "n_events": d["n_events"],
                  "summary": d["summary"],
                  "equivalence": {k: v for k, v in d["equivalence"].items() if k != "diff_frames"},
                  "falsification": d["falsification"]}
                 for d in report["dumps"]],
        "pooled": report["pooled"],
    }


def _print_hybrid_landing_audit(report):
    lab = report["labelled"]
    print(f"\nLABELLED CATEGORICAL: {lab['categorical_score']}/5")
    for r in lab["categorical"]:
        print(f"  shot {r['shot']} crop={r['crop']:10s} rep_offset={r['rep_offset']:+d} "
              f"total={r['total']} in_plateau={r['in_plateau']}")
    for crop, e in lab["equivalence"].items():
        print(f"  equivalence[{crop}]: {e['n_mismatch']}/{e['n_frames']} mismatched")
    print("\nDUMPS:")
    for d in report["dumps"]:
        print(f"  {d['name']:32s} fps={d['fps']:5.1f} events={d['n_events']:4d} "
              f"equiv_mismatch={d['equivalence']['n_mismatch']:3d} "
              f"falsification_bad={d['falsification']['n_bad']:3d} "
              f"validShots={d['summary']['validShots']} avgTotal={d['summary']['avgTotal']}")
    p = report["pooled"]
    print(f"\nPOOLED: n_scored={p['n_scored']} no_rep={p['no_rep']} "
          f"above_ceiling_pct={p['above_ceiling_pct']}% "
          f"avgTotal_validShots={p['avgTotal_validShots']} "
          f"avgTotal_unclamped={p['avgTotal_unclamped']}")
    if report["lockstep"]:
        print("\nLOCKSTEP (live, npx tsx read-pellets.ts --debounce-json):")
        for r in report["lockstep"]:
            print(f"  {r['dump']:24s} ok={r.get('ok')} py={r.get('n_py')} ts={r.get('n_ts')} "
                  f"n_diff={r.get('n_diff')} {r.get('error', '')[:200]}")


def hybrid_landing_audit_selftest():
    """Constraint 9 self-validation: replay the whole arm's PYTHON-SIDE checks (equivalence,
    categorical, ceiling/n_scored, falsification) over the committed slice, cross-checked against
    REP_AUDIT_FIXTURE (representative-audit-slice.json) for everything the audit side needs. The TS
    lockstep is LIVE-only (needs `npx tsx`) and is not part of this replay -- same split as
    `representative_audit_selftest`'s full-clip control."""
    with open(HYBRID_LANDING_FIXTURE) as fh:
        fx = json.load(fh)
    with open(REP_AUDIT_FIXTURE) as fh:
        fx_rep = json.load(fh)

    block = fx_rep["labelled"]
    fps = block["fps"]
    offset = block["offset"]
    n = len(block["frame_counts"])
    frame_counts_base = [{"white": w, "red": r, "marker": m} for w, r, m in block["frame_counts"]]
    max_pf = block["params"]["max_pellet_frames"]
    band_range = _ps_band(fps, max_pf)
    truth = _ps_ground_truth_series(fx_rep)

    per_crop = {}
    for crop_key, cross_key in (("structural", "cross"), ("template", "cross_tmpl")):
        prod_band = fx["labelled"][crop_key]["band"]
        rtracks = _ps_labelled_radius_tracks(block, cross_key)
        audit_totals = _ps_band_totals(rtracks, band_range)
        equiv = _hla_equivalence(prod_band, audit_totals, offset, n)
        shots, summary = _hla_score(frame_counts_base, prod_band, fps)
        per_crop[crop_key] = {"shots": shots, "summary": summary, "equivalence": equiv}

    cat_rows = []
    for s in _rep_load_labels():
        t0 = s["t0"]
        crop = "template" if s["locate"] == "template" else "structural"
        shots = per_crop[crop]["shots"]
        ev = next((sh for sh in shots if sh["start"] + offset <= t0 < sh["end"] + offset), None)
        rep_offset = (ev["frame"] + offset) - t0 if ev else None
        plateau = _ps_plateau(truth[s["shot"]])
        cat_rows.append({"shot": s["shot"], "crop": crop, "rep_offset": rep_offset,
                         "total": ev["total"] if ev else None,
                         "in_plateau": rep_offset in plateau if rep_offset is not None else False})
    cat_score = sum(1 for r in cat_rows if r["in_plateau"])

    pooled_n = pooled_above = pooled_valid_n = 0
    pooled_valid_total = pooled_all_total = 0
    dump_reports = []
    rep_dumps_by_name = {d["tracks"]: d for d in fx_rep["dumps"]}
    for d in fx["dumps"]:
        name = d["name"]
        rd = rep_dumps_by_name[name]
        frame_counts_d, rtracks = _rep_expand_dump(rd)
        dfps = rd["fps"]
        band_range_d = _ps_band(dfps, rd["max_pellet_frames"])
        audit_totals = _ps_band_totals(rtracks, band_range_d)
        equiv = _hla_equivalence(d["band"], audit_totals, 0, len(frame_counts_d))
        shots_hybrid, summary_hybrid = _hla_score(frame_counts_d, d["band"], dfps)
        fals = _hla_falsification(frame_counts_d, d["band"], shots_hybrid, dfps)
        for sh in shots_hybrid:
            pooled_n += 1
            pooled_all_total += sh["total"]
            if sh["total"] > REP_HITS_PER_SHOT:
                pooled_above += 1
            if MERGE_MIN_PELLETS <= sh["total"] <= MERGE_MAX_PELLETS:
                pooled_valid_n += 1
                pooled_valid_total += sh["total"]
        dump_reports.append({"name": name, "fps": dfps, "n_events": len(shots_hybrid),
                             "summary": summary_hybrid, "equivalence": equiv,
                             "falsification": fals})

    report = {
        "labelled": {"categorical": cat_rows, "categorical_score": cat_score,
                    "equivalence": {k: v["equivalence"] for k, v in per_crop.items()},
                    "summary": {k: v["summary"] for k, v in per_crop.items()}},
        "dumps": dump_reports,
        "pooled": {
            "n_scored": pooled_n, "no_rep": 0,
            "above_ceiling_pct": round(100 * pooled_above / pooled_n, 1) if pooled_n else None,
            "avgTotal_validShots": round(pooled_valid_total / pooled_valid_n, 4) if pooled_valid_n else None,
            "avgTotal_unclamped": round(pooled_all_total / pooled_n, 4) if pooled_n else None,
        },
        "lockstep": [],
    }
    got = _hla_expected(report)
    ok = got == fx["_expected"]
    if not ok:
        for key in sorted(set(got) | set(fx["_expected"])):
            if got.get(key) != fx["_expected"].get(key):
                print(f"  DIFF {key}:\n    expected {json.dumps(fx['_expected'].get(key))}"
                      f"\n    got      {json.dumps(got.get(key))}")
    _print_hybrid_landing_audit(report)
    print("SELFTEST PASS" if ok else "SELFTEST FAIL")
    return 0 if ok else 1


# ============================================================
# THE LIFETIME-CAP `band_hi` SCORE (docs/handoffs/2026-08-04-lifetime-cap-PRECOMMIT.md) -- a
# MEASUREMENT-ONLY pass. Scores a DECOUPLED band upper bound (`band_hi`, the counted-pellet band's
# own ceiling -- NOT a raised `max_pellet_frames`, which also gates `pellet_ids`/segmentation and
# is explicitly NOT what this arm measures, per the pre-commit's §1) against the pre-committed
# candidate set {control, 19, 20, 21} (60 fps basis, fps-scaled per dump: `round(x * fps / 60)`,
# Python `round()` -- the language this instrument runs in; §2.2's own table records where that
# disagrees with the JS `Math.round()` the shipped 30 fps cap was actually computed with).
#
# Reads REP_AUDIT_FIXTURE directly, same precedent as `--policy-score` and `--hybrid-landing-audit`
# -- no new raw tracks.json, no re-extraction, no owner time (CLAUDE.md reuse-before-derive; the
# pre-commit's §1 item 3 is explicit that a coupled candidate would need exactly that and is out of
# scope here).
#
# NOTHING HERE ENACTS. `debounce_shots`, `count-pellets.py:514`/`:517` and `read-pellets.ts:787`
# are never touched or reachable from this arm.
# ============================================================
CAP_SCORE_FIXTURE = "scripts/tests/fixtures/pellets/cap-score-slice.json"
# The pre-committed candidate set (pre-commit §2.2) -- 60 fps basis. "control" means band_hi = that
# dump's OWN stored `max_pellet_frames` (§3.7 -- never recomputed), i.e. no change from today.
CAP_CANDIDATES = ("control", 19, 20, 21)
# §2.3 -- reject above 6.2% (the shipped `plateau_median` anchor this hybrid rule replaced).
CAP_CEILING_PCT_MAX = 6.2
# §2.4 -- 2x the in-sample rate (5/5 = 1.00 per event), the thread's own precedent verbatim from
# the representative-frame pre-commit's §1.2.
CAP_CORRIDOR_MAX_PER_EVENT = 2.00
# §2.4 -- the 4 out-of-sample dumps, identified by their `tracks` name prefix. `groundtruth-f811-v4`
# (the labelled clip's own full-clip dump) is EXCLUDED from this set -- it is the SAME recording
# the 42-owner corridor was derived from, hence in-sample -- but stays IN the §2.3 pooled-852
# denominator, which pools all 5 dumps.
CAP_OUT_OF_SAMPLE_PREFIXES = ("h4-marciana", "h4-isabel", "h4-guilty", "g2-noir")

_CS_DUMP_PUBLIC_KEYS = ("dump", "fps", "band_hi", "n_events", "n_scored", "no_rep", "sum_total",
                       "above_ceiling", "above_ceiling_pct", "banded", "fallback")


def _cs_scaled_band_hi(candidate, fps, max_pellet_frames):
    """Resolve one 60 fps-basis candidate to THIS dump's own band_hi. "control" is the dump's OWN
    STORED `max_pellet_frames`, verbatim -- never recomputed (§3.7: `round(13*30/60)` is 6 in
    Python, but the 30 fps dumps store 7, the JS half-up value read-pellets.ts:787 actually
    computed; a Python recomputation would silently shift the control by one frame). Every other
    candidate is fps-scaled by the shipped formula by this instrument's OWN Python `round()` (the
    language it runs in; §2.2's table records where JS `Math.round()` would disagree -- only at
    `band_hi=21` on a 30 fps dump, recorded but never promotable for exactly that reason)."""
    if candidate == "control":
        return max_pellet_frames
    return round(candidate * fps / 60.0)


def _cs_assert_cap_values(dumps):
    """§3.7 -- the stored per-dump `max_pellet_frames` must be 13 at 60 fps and 7 at 30 fps. Not a
    tautology: this is the JS half-up value (`round(6.5)` is 6 in Python, 7 in
    `Math.round`/read-pellets.ts:787), so asserting the STORED value (rather than recomputing it)
    is the only way this instrument can avoid silently shifting the control by one frame."""
    want_by_fps = {60.0: 13, 30.0: 7}
    for d in dumps:
        want = want_by_fps.get(d["fps"])
        if want is None:
            raise SystemExit(f"--cap-score: unexpected fps {d['fps']} on {d['tracks']} -- only 60 "
                             "and 30 are known to this validity check (§3.7).")
        if d["max_pellet_frames"] != want:
            raise SystemExit(f"--cap-score: STORED max_pellet_frames DRIFTED on {d['tracks']} -- "
                             f"expected {want} at {d['fps']} fps, got {d['max_pellet_frames']}. "
                             "§3.7: this value must never be recomputed in Python.")


def _cs_assert_fidelity_premises():
    """§3.9 (pre-op gate revisions 3/4) -- pin the two structural premises the gate verified by
    inspection: `radius_tracks` is WHITE-ONLY (`_rep_slim_dump` skips `t["is_red"]` before a
    track's runs are ever built) and its runs are IN-RADIUS-ONLY (built via `_rep_radius_runs`, not
    a track's raw alive span). Both HOLD today. The control arm (`band_hi = max_pellet_frames`)
    cannot itself catch a regression in either -- corridor tracks are invisible there by
    construction -- so this is a static check on the FIXTURE-BUILDING CODE, tripped if a future
    `--representative-audit` regeneration changes either function's shape, not a check on the data
    `--cap-score` itself reads (which no longer carries a colour field to check against)."""
    slim_src = inspect.getsource(_rep_slim_dump)
    if "is_red" not in slim_src or "continue" not in slim_src:
        raise SystemExit("--cap-score: FIDELITY PREMISE FAILED -- _rep_slim_dump no longer "
                         "appears to skip is_red tracks before building radius_tracks; it may no "
                         "longer be white-only (§3.9, pre-op gate revision 3).")
    if "_rep_radius_runs" not in slim_src:
        raise SystemExit("--cap-score: FIDELITY PREMISE FAILED -- _rep_slim_dump no longer "
                         "appears to build runs via _rep_radius_runs; radius_tracks may no longer "
                         "be in-radius-only (§3.9, pre-op gate revision 4).")
    runs_src = inspect.getsource(_rep_radius_runs)
    if "_rep_in_radius" not in runs_src:
        raise SystemExit("--cap-score: FIDELITY PREMISE FAILED -- _rep_radius_runs no longer "
                         "appears to gate on _rep_in_radius; its runs may no longer be "
                         "in-radius-only (§3.9, pre-op gate revision 4).")


def _cs_assert_fidelity_premises_behavioural():
    """§3.9 hardening (cross-family post-op review fix 2, 2026-08-04) -- a BEHAVIOURAL pin alongside
    `_cs_assert_fidelity_premises`, which is a source-text tripwire (`inspect.getsource()` substring
    checks) and nothing more: a comment mentioning `is_red` would satisfy it, and a semantically
    broken builder that still mentions the right identifiers would pass. This runs the REAL
    `_rep_slim_dump` on a tiny synthetic in-memory dump and checks the three outcomes the two §3.9
    premises predict:
      - a RED track that would otherwise be in radius every frame (synthetic life=5) must NOT
        appear in `radius_tracks` (white-only premise);
      - a WHITE track entirely OUT of radius (synthetic life=6) must NOT appear (in-radius-only
        premise);
      - a WHITE track entirely IN radius (synthetic life=7) MUST appear, with the expected
        `[life, runs]` shape.
    Kept ALONGSIDE the source-text tripwire, not instead of it -- neither subsumes the other."""
    cross = [(0.0, 0.0)] * 8
    dump = {
        "frame_counts": [{"white": 0, "red": 0} for _ in range(8)],
        "cross_positions": cross,
        "params": {"pellet_radius": 5, "max_pellet_frames": 13},
        "tracks": [
            # RED, in radius every frame -- must NOT survive into radius_tracks
            {"id": 1, "first": 0, "last": 4, "life": 5, "is_red": True, "is_pellet": True,
             "xs": [0.0] * 5, "ys": [0.0] * 5},
            # WHITE, entirely OUT of radius -- must NOT survive
            {"id": 2, "first": 0, "last": 5, "life": 6, "is_red": False, "is_pellet": True,
             "xs": [100.0] * 6, "ys": [100.0] * 6},
            # WHITE, entirely IN radius -- MUST survive, as [7, [0, 7]]
            {"id": 3, "first": 0, "last": 6, "life": 7, "is_red": False, "is_pellet": True,
             "xs": [0.0] * 7, "ys": [0.0] * 7},
        ],
    }
    out = _rep_slim_dump("synthetic-fidelity-probe", dump, 60.0)["radius_tracks"]
    lives = [life for life, _runs in out]
    if 5 in lives:
        raise SystemExit("--cap-score: FIDELITY PREMISE FAILED (behavioural) -- a synthetic RED "
                         "track (life=5, in-radius every frame) appears in radius_tracks; "
                         "_rep_slim_dump is no longer white-only (§3.9, pre-op gate revision 3).")
    if 6 in lives:
        raise SystemExit("--cap-score: FIDELITY PREMISE FAILED (behavioural) -- a synthetic WHITE "
                         "track (life=6) entirely OUT of radius appears in radius_tracks; "
                         "_rep_slim_dump's runs are no longer in-radius-only (§3.9, pre-op gate "
                         "revision 4).")
    matches = [runs for life, runs in out if life == 7]
    if len(out) != 1 or len(matches) != 1 or matches[0] != [0, 7]:
        raise SystemExit("--cap-score: FIDELITY PREMISE FAILED (behavioural) -- expected exactly "
                         f"one radius_tracks entry [7, [0, 7]] (the synthetic in-radius WHITE "
                         f"track), got {out}.")


def _cs_assert_shot_red_event_fixed(dumps):
    """§3.10 (pre-op gate risk flag 3) -- the core-hit flag folded into `total` must be read from
    STORED `marker` counts, not re-derived per candidate (the "widening a band can only raise
    above_ceiling_pct" monotonicity claim depends on it). `_ps_red_flag` takes no band argument at
    all, so this holds by construction; spot-checked here on every shipped event against a live
    recomputation, so a future refactor that threads `band_hi` into it would trip this assert."""
    for d in dumps:
        frame_counts, _radius_tracks = _rep_expand_dump(d)
        for ev in _ps_events(frame_counts, d["fps"]):
            direct = _ps_red_flag(frame_counts, 0, ev["start"], ev["end"])
            shipped = 1 if ev["total"] - ev["white"] else 0
            if direct != shipped:
                raise SystemExit(f"--cap-score: SHOT_RED NOT EVENT-FIXED on {d['tracks']} event "
                                 f"[{ev['start']},{ev['end']}) -- recomputed red flag {direct} != "
                                 f"the shipped event's own {shipped} (§3.10).")


def _cs_assert_monotonic(dumps):
    """§3 validity check 2 -- band membership must be monotone non-decreasing in `band_hi`: a track
    admitted at candidate 19 is admitted at 20 and 21 too. Checked per dump on the ACTUAL scaled
    band_hi values (candidate order, not sorted -- a scaling bug could reorder them) and the ACTUAL
    admitted white-track count from the data, not assumed from the `<=` arithmetic alone."""
    for d in dumps:
        fps, max_pf = d["fps"], d["max_pellet_frames"]
        scaled = [(c, _cs_scaled_band_hi(c, fps, max_pf)) for c in CAP_CANDIDATES]
        vals = [v for _, v in scaled]
        if vals != sorted(vals):
            raise SystemExit(f"--cap-score: MONOTONICITY FAILED on {d['tracks']} -- scaled "
                             f"band_hi {scaled} is not non-decreasing in candidate order.")
        _frame_counts, radius_tracks = _rep_expand_dump(d)
        lo = _ps_band(fps, max_pf)[0]
        prev = -1
        for cand, hi in scaled:
            n = sum(1 for life, _runs in radius_tracks if lo <= life <= hi)
            if n < prev:
                raise SystemExit(f"--cap-score: MONOTONICITY FAILED on {d['tracks']} candidate "
                                 f"{cand} (band_hi={hi}) -- admitted white-track count {n} < "
                                 f"previous candidate's {prev}.")
            prev = n


def _cs_assert_out_of_sample_coverage(dumps, labelled_tracks_name):
    """§2.4 hardening (cross-family post-op review fix 1, 2026-08-04) -- `_cs_corridor_2_4` picks the
    4 out-of-sample dumps for the MANDATORY corridor arm by `d["tracks"].startswith(prefix)`. A
    future dump added to the fixture that matches NO prefix would silently fall out of that set --
    while still counting in §2.3's pooled 852-event denominator -- exactly the quiet scope drift this
    pre-commit exists to prevent. Assert SET EQUALITY instead of trusting the filter: every dump that
    is not the in-sample labelled clip must match EXACTLY ONE prefix, and every prefix must match at
    least one dump (a renamed dump would otherwise shrink the arm silently without either side
    raising)."""
    unmatched, ambiguous = [], []
    matched_by_prefix = {p: [] for p in CAP_OUT_OF_SAMPLE_PREFIXES}
    for d in dumps:
        name = d["tracks"]
        if name == labelled_tracks_name:
            continue
        hits = [p for p in CAP_OUT_OF_SAMPLE_PREFIXES if name.startswith(p)]
        if not hits:
            unmatched.append(name)
        elif len(hits) > 1:
            ambiguous.append((name, hits))
        else:
            matched_by_prefix[hits[0]].append(name)
    if unmatched:
        raise SystemExit(
            f"--cap-score: OUT-OF-SAMPLE COVERAGE FAILED -- dump(s) {unmatched} match no entry in "
            f"CAP_OUT_OF_SAMPLE_PREFIXES {CAP_OUT_OF_SAMPLE_PREFIXES} and are not the in-sample "
            f"labelled clip ({labelled_tracks_name!r}). §2.4's mandatory corridor arm's scope must "
            "be updated deliberately to include or exclude it -- it must never be dropped silently.")
    if ambiguous:
        raise SystemExit(
            f"--cap-score: OUT-OF-SAMPLE COVERAGE FAILED -- dump(s) {ambiguous} match more than one "
            "entry in CAP_OUT_OF_SAMPLE_PREFIXES; the prefix set must stay unambiguous.")
    empty_prefixes = [p for p, names in matched_by_prefix.items() if not names]
    if empty_prefixes:
        raise SystemExit(
            f"--cap-score: OUT-OF-SAMPLE COVERAGE FAILED -- prefix(es) {empty_prefixes} in "
            "CAP_OUT_OF_SAMPLE_PREFIXES match zero dumps in the fixture (a renamed dump would "
            "otherwise shrink §2.4's mandatory corridor arm silently).")


def _cs_consistency_2_1(fx):
    """§2.1 -- IMPLEMENTATION CONSISTENCY CHECK, in-sample (n=42 owner pellets, ONE clip). ⚑ CARRIES
    NO EVIDENTIAL WEIGHT (pre-op gate risk flag 1): the corridor [19,21] is DERIVED from this same
    pinned population, so a PASS here confirms only that this arm reads the right population, never
    that the candidate is correct out-of-sample. Read straight from `_expected.lifetime_summary` --
    the population §2.1 is defined against -- not recomputed from radius_tracks a second time."""
    ls = fx["_expected"]["lifetime_summary"]
    band_lo = ls["band_lo"]
    owner_hist = {int(k): v for k, v in ls["owner_histogram"].items()}
    owner_total = sum(owner_hist.values())
    statics = ls["non_owner_at_or_above_band"]
    fps = fx["labelled"]["fps"]
    max_pf = fx["labelled"]["params"]["max_pellet_frames"]
    per_candidate = {}
    for cand in CAP_CANDIDATES:
        hi = _cs_scaled_band_hi(cand, fps, max_pf)
        admitted = sum(v for life, v in owner_hist.items() if band_lo <= life <= hi)
        statics_admitted = [s for s in statics if band_lo <= s <= hi]
        per_candidate[str(cand)] = {
            "band_hi": hi, "owner_admitted": admitted, "owner_total": owner_total,
            "all_owner_recovered": admitted == owner_total,
            "statics_admitted": statics_admitted,
            "pass": admitted == owner_total and not statics_admitted,
        }
    return {"band_lo": band_lo, "owner_total": owner_total, "statics": statics,
           "per_candidate": per_candidate}


def _cs_score_dump_candidate(d, candidate):
    """One dump, one candidate: `hybrid_plateau_median` scored with THIS candidate's band_hi.
    Reuses `_ps_events` / `_ps_band_totals` / `_ps_score_event` / `_ps_assert_hybrid_decomposition`
    VERBATIM (the same functions `--policy-score`'s control arm uses) -- only the band's upper
    bound differs from `_ps_score_dump`, via `_ps_band`'s new optional third parameter. Keeps
    `events`/`band_totals` in the return for §2.4/§6 reuse (Python-side only -- never serialized;
    `_cs_dump_public` is the JSON-safe projection)."""
    fps, max_pf = d["fps"], d["max_pellet_frames"]
    frame_counts, radius_tracks = _rep_expand_dump(d)
    events = _ps_events(frame_counts, fps)
    hi = _cs_scaled_band_hi(candidate, fps, max_pf)
    band = _ps_band(fps, max_pf, hi)
    band_totals = _ps_band_totals(radius_tracks, band)
    decomp = _ps_assert_hybrid_decomposition(f"{d['tracks']}[cap={candidate}]", events,
                                             frame_counts, band_totals)
    totals, above, no_rep = [], 0, 0
    for ev in events:
        r = _ps_score_event("hybrid_plateau_median", ev, frame_counts, 0, band_totals)
        if r["total"] is None:
            no_rep += 1
            continue
        totals.append(r["total"])
        if r["total"] > REP_HITS_PER_SHOT:
            above += 1
    n_scored = len(totals)
    return {"dump": d["tracks"], "fps": fps, "band_hi": hi, "band_lo": band[0],
           "max_pellet_frames": max_pf, "n_events": len(events), "n_scored": n_scored,
           "no_rep": no_rep, "sum_total": sum(totals), "above_ceiling": above,
           "above_ceiling_pct": round(100 * above / n_scored, 1) if n_scored else None,
           "banded": decomp["n_banded"], "fallback": decomp["n_fallback"],
           "radius_tracks": radius_tracks, "band_totals": band_totals, "events": events}


def _cs_dump_public(d):
    return {k: d[k] for k in _CS_DUMP_PUBLIC_KEYS}


def _cs_pool_2_3(per_dump):
    """§2.3 -- pooled `above_ceiling_pct` for `hybrid_plateau_median` over all events/dumps at one
    candidate's band_hi. Widening a band can only ADD tracks (§2.3's own text), so this figure can
    only rise as the candidate set is walked control -> 19 -> 20 -> 21."""
    n_events = sum(x["n_events"] for x in per_dump)
    n_scored = sum(x["n_scored"] for x in per_dump)
    no_rep = sum(x["no_rep"] for x in per_dump)
    above = sum(x["above_ceiling"] for x in per_dump)
    sm = sum(x["sum_total"] for x in per_dump)
    banded = sum(x["banded"] for x in per_dump)
    fallback = sum(x["fallback"] for x in per_dump)
    above_pct = round(100 * above / n_scored, 1) if n_scored else None
    return {"n_events": n_events, "n_scored": n_scored, "no_rep": no_rep, "above_ceiling": above,
           "above_ceiling_pct": above_pct, "avgTotal": round(sm / n_scored, 4) if n_scored else None,
           "banded": banded, "fallback": fallback,
           "verdict": ("PASS" if above_pct is not None and above_pct <= CAP_CEILING_PCT_MAX
                       else "REJECT")}


def _cs_assert_control_reproduction(pooled_control):
    """§3 validity check 1 -- THE CONTROL MUST REPRODUCE EXACTLY. At band_hi = max_pellet_frames
    (today's value), every figure must match the already-landed §12/§13 numbers. If it does not,
    the arm is wrong and every other candidate's row is void -- fail loudly, never adjust the
    expected numbers to match."""
    want = {"n_scored": 852, "no_rep": 0, "banded": 740, "fallback": 112,
           "above_ceiling_pct": 1.8, "avgTotal": 6.1561}
    bad = {k: (want[k], pooled_control[k]) for k in want if pooled_control[k] != want[k]}
    if bad:
        detail = "; ".join(f"{k}: expected {w}, got {g}" for k, (w, g) in bad.items())
        raise SystemExit(f"--cap-score: CONTROL DID NOT REPRODUCE ({detail}). §3 validity check 1: "
                         "the arm is wrong and every other candidate's row is void.")


def _cs_corridor_admits(radius_tracks, events, max_pellet_frames, band_hi):
    """§2.4's own metric, numerator: distinct WHITE in-radius tracks whose OVERALL lifetime falls
    in the corridor (max_pellet_frames, band_hi] -- the population a raised band_hi newly admits
    over today's cap -- and which the radius gate counts at least once during ANY shipped event
    span (not merely somewhere in the clip)."""
    n = 0
    for life, runs in radius_tracks:
        if not (max_pellet_frames < life <= band_hi):
            continue
        if any(any(s < e["end"] and s + ln > e["start"] for s, ln in runs) for e in events):
            n += 1
    return n


def _cs_corridor_2_4(dumps):
    """§2.4 -- TERTIARY, out-of-sample, mandatory. Per out-of-sample dump (§2.4 excludes the
    labelled clip's own full-clip dump, `groundtruth-f811-v4`, which is in-sample):
    `corridor_admits_per_event` at each candidate, plus the full in-radius lifetime histogram
    (narrative, every candidate shares it -- it does not depend on band_hi). `h4-marciana` is
    reported SEPARATELY from the other three (same unit, different recording, vs different units
    entirely -- different failure modes)."""
    lifetime_hist_by_dump = {}
    expanded = {}
    for d in dumps:
        fc, radius_tracks = _rep_expand_dump(d)
        expanded[d["tracks"]] = (fc, radius_tracks)
        hist = collections.Counter(life for life, _r in radius_tracks)
        lifetime_hist_by_dump[d["tracks"]] = {str(k): v for k, v in sorted(hist.items())}

    out_of_sample = [d for d in dumps
                     if any(d["tracks"].startswith(p) for p in CAP_OUT_OF_SAMPLE_PREFIXES)]
    per_candidate = {}
    for cand in CAP_CANDIDATES:
        per_dump = {}
        for d in out_of_sample:
            name = d["tracks"]
            fps, max_pf = d["fps"], d["max_pellet_frames"]
            fc, radius_tracks = expanded[name]
            events = _ps_events(fc, fps)
            hi = _cs_scaled_band_hi(cand, fps, max_pf)
            n_admits = _cs_corridor_admits(radius_tracks, events, max_pf, hi)
            rate = round(n_admits / len(events), 4) if events else None
            per_dump[name] = {
                "fps": fps, "n_events": len(events), "band_hi": hi, "corridor_admits": n_admits,
                "corridor_admits_per_event": rate,
                "verdict": ("CONFIRMS"
                            if rate is not None and rate <= CAP_CORRIDOR_MAX_PER_EVENT
                            else "FAILS TO CONFIRM"),
            }
        marciana_name = next((n for n in per_dump if n.startswith("h4-marciana")), None)
        others = {n: v for n, v in per_dump.items() if n != marciana_name}
        n_failing = sum(1 for v in per_dump.values() if v["verdict"] == "FAILS TO CONFIRM")
        per_candidate[str(cand)] = {
            "per_dump": per_dump,
            "h4_marciana": per_dump.get(marciana_name),
            "other_three": others,
            "n_failing_of_4": n_failing,
            "downgrade": n_failing >= 2,
        }
    return {"lifetime_histograms_by_dump": lifetime_hist_by_dump, "per_candidate": per_candidate}


def _cs_reported_2_5(ceiling_2_3):
    """§2.5 -- QUATERNARY, reported only. ⛔ NEVER a ranking criterion (a candidate selected because
    its avgTotal moved toward 8.40 is DISQUALIFIED by the pre-commit). Relabels figures already
    computed by §2.3's pooling -- not a second computation -- so there is no way for the two to
    silently disagree."""
    return {str(cand): {"avgTotal": ceiling_2_3[str(cand)]["pooled"]["avgTotal"],
                        "no_rep": ceiling_2_3[str(cand)]["pooled"]["no_rep"],
                        "fallback_abstentions": ceiling_2_3[str(cand)]["pooled"]["fallback"]}
           for cand in CAP_CANDIDATES}


def _cs_fallback_events_control(dumps):
    """§6 sub-deliverable -- the 112 CONTROL fallback events (hybrid_plateau_median has no band
    track in radius, so it falls back to shipped): span, shipped white total, and a categorical
    breakdown of WHY no band track exists, from the tracks that overlap the event's span at all.
    REPORT ONLY (§6): this never influences §2's verdict."""
    out = []
    for d in dumps:
        fps, max_pf = d["fps"], d["max_pellet_frames"]
        fc, radius_tracks = _rep_expand_dump(d)
        events = _ps_events(fc, fps)
        band = _ps_band(fps, max_pf)
        band_lo = band[0]
        band_totals = _ps_band_totals(radius_tracks, band)
        for ev in events:
            a, b = ev["start"], ev["end"]
            if _ps_plateau_rep(band_totals, a, b) is not None:
                continue
            overlapping = [life for life, runs in radius_tracks
                          if any(s < b and s + ln > a for s, ln in runs)]
            if not overlapping:
                category = "none_in_radius"
            else:
                in_band = [life for life in overlapping if band_lo <= life <= max_pf]
                below = [life for life in overlapping if life < band_lo]
                above = [life for life in overlapping if life > max_pf]
                if in_band:
                    # a candidate track IS in the countable band, but no frame in the event ever
                    # reaches MERGE_EVENT_MIN concurrently among band-eligible tracks
                    category = "in_band_no_concurrency"
                elif below and above:
                    category = "mixed_outside_band"
                elif below:
                    category = "all_below_band_lo"
                else:
                    category = "all_above_cap"
            out.append({"dump": d["tracks"], "start": a, "end": b, "frames": b - a,
                       "white": ev["white"], "category": category,
                       "n_overlapping_tracks": len(overlapping)})
    return out


def _cs_fallback_become_banded(raw, fallback_events):
    """§6 -- of the 112 CONTROL fallback events, how many become banded (plateau_rep is no longer
    None) at each wider candidate band_hi. Reuses `raw[dump][candidate]["band_totals"]` -- already
    computed by `_cs_score_dump_candidate` -- rather than recomputing the band a second time."""
    by_dump = collections.defaultdict(list)
    for e in fallback_events:
        by_dump[e["dump"]].append((e["start"], e["end"]))
    out = {}
    for cand in CAP_CANDIDATES:
        if cand == "control":
            out[str(cand)] = 0   # these events ARE the control fallbacks, by definition
            continue
        n = 0
        for dump_name, spans in by_dump.items():
            band_totals = raw[dump_name][cand]["band_totals"]
            for a, b in spans:
                if _ps_plateau_rep(band_totals, a, b) is not None:
                    n += 1
        out[str(cand)] = n
    return out


def _cs_compute(fx):
    """The whole arm, shared by the fixture WRITER and the selftest so `_expected` can only ever be
    the slice's own numbers (same precedent as `_replay_representative_audit` /
    `policy_score`/`policy_score_selftest`)."""
    dumps = fx["dumps"]
    _cs_assert_cap_values(dumps)
    _cs_assert_fidelity_premises()
    _cs_assert_fidelity_premises_behavioural()
    _cs_assert_shot_red_event_fixed(dumps)
    _cs_assert_monotonic(dumps)
    _cs_assert_out_of_sample_coverage(dumps, fx["labelled"]["tracks"])

    raw = {d["tracks"]: {cand: _cs_score_dump_candidate(d, cand) for cand in CAP_CANDIDATES}
          for d in dumps}

    ceiling_2_3 = {}
    for cand in CAP_CANDIDATES:
        per_dump = [_cs_dump_public(raw[d["tracks"]][cand]) for d in dumps]
        pooled = _cs_pool_2_3([raw[d["tracks"]][cand] for d in dumps])
        ceiling_2_3[str(cand)] = {"per_dump": per_dump, "pooled": pooled}
    _cs_assert_control_reproduction(ceiling_2_3["control"]["pooled"])

    consistency_2_1 = _cs_consistency_2_1(fx)
    corridor_2_4 = _cs_corridor_2_4(dumps)
    reported_2_5 = _cs_reported_2_5(ceiling_2_3)
    fallback_events = _cs_fallback_events_control(dumps)
    categories = dict(collections.Counter(e["category"] for e in fallback_events))
    become_banded = _cs_fallback_become_banded(raw, fallback_events)

    return {
        "consistency_2_1": consistency_2_1,
        "ceiling_2_3": ceiling_2_3,
        "corridor_2_4": corridor_2_4,
        "reported_2_5": reported_2_5,
        "sub_deliverable_6": {
            "n_fallback_control": len(fallback_events),
            "categories": categories,
            "events": fallback_events,
            "becomes_banded_by_candidate": become_banded,
        },
    }


def _print_cap_score(result):
    print("\n§2.1 CONSISTENCY (in-sample, n=42 owner pellets, ONE clip) -- ⚑ TAUTOLOGICAL, CARRIES "
          "NO EVIDENTIAL WEIGHT (the corridor is derived from this same population); reported, "
          "never cited as evidence")
    c1 = result["consistency_2_1"]
    print(f"  band_lo={c1['band_lo']}  owner_total={c1['owner_total']}  statics={c1['statics']}")
    for cand in CAP_CANDIDATES:
        r = c1["per_candidate"][str(cand)]
        print(f"  {str(cand):8s} band_hi={r['band_hi']:3d}  owner_admitted={r['owner_admitted']}/"
              f"{r['owner_total']}  statics_admitted={r['statics_admitted']}  "
              f"{'PASS' if r['pass'] else 'FAIL'}")

    print("\n§2.3 CEILING (out-of-sample, pooled over 852 events/5 dumps/4 units) -- MANDATORY; "
          f"reject above {CAP_CEILING_PCT_MAX}%")
    for cand in CAP_CANDIDATES:
        p = result["ceiling_2_3"][str(cand)]["pooled"]
        print(f"  {str(cand):8s} n_scored={p['n_scored']:4d}  no_rep={p['no_rep']}  "
              f"banded/fallback={p['banded']}/{p['fallback']}  above_ceiling_pct={p['above_ceiling_pct']}%  "
              f"avgTotal={p['avgTotal']}  {p['verdict']}")

    print("\n§2.4 CORRIDOR (out-of-sample, per dump) -- MANDATORY; CONFIRMS at "
          f"<= {CAP_CORRIDOR_MAX_PER_EVENT}/event, downgrade if >= 2 of 4 dumps FAIL")
    for cand in CAP_CANDIDATES:
        r = result["corridor_2_4"]["per_candidate"][str(cand)]
        print(f"  candidate {cand}: n_failing_of_4={r['n_failing_of_4']}  "
              f"{'DOWNGRADE' if r['downgrade'] else 'OK'}")
        for name, v in r["per_dump"].items():
            tag = "[same unit, diff recording]" if name.startswith("h4-marciana") else ""
            print(f"    {name:34s} band_hi={v['band_hi']:3d}  admits={v['corridor_admits']:3d}  "
                  f"per_event={v['corridor_admits_per_event']}  {v['verdict']} {tag}")
    print("  in-radius lifetime histograms (narrative, candidate-independent):")
    for name, hist in result["corridor_2_4"]["lifetime_histograms_by_dump"].items():
        print(f"    {name}: {hist}")

    print("\n§2.5 REPORTED ONLY -- ⛔ NEVER a ranking criterion")
    for cand in CAP_CANDIDATES:
        r = result["reported_2_5"][str(cand)]
        print(f"  {str(cand):8s} avgTotal={r['avgTotal']}  no_rep={r['no_rep']}  "
              f"fallback_abstentions={r['fallback_abstentions']}")

    sd = result["sub_deliverable_6"]
    print(f"\n§6 SUB-DELIVERABLE -- the {sd['n_fallback_control']} CONTROL fallback events, REPORT "
          "ONLY (never influences §2's verdict)")
    print(f"  categories: {sd['categories']}")
    print(f"  become banded by candidate: {sd['becomes_banded_by_candidate']}")


def cap_score(save_fixture=None):
    with open(REP_AUDIT_FIXTURE) as fh:
        fx = json.load(fh)
    result = _cs_compute(fx)
    if save_fixture:
        with open(save_fixture, "w") as fh:
            json.dump({
                "_source": ("Scored entirely off the already-committed "
                            f"{REP_AUDIT_FIXTURE} -- no new raw tracks.json, no re-derivation "
                            "(CLAUDE.md reuse-before-derive). docs/handoffs/"
                            "2026-08-04-lifetime-cap-PRECOMMIT.md is the decision rule this arm's "
                            "numbers are scored against."),
                "_note": ("Deliberately carries NO raw track data of its own -- `cap_score`/"
                          "`cap_score_selftest` both read "
                          f"{REP_AUDIT_FIXTURE} directly, so this fixture only pins the SCORE "
                          "(`_expected`), not a second copy of the labelled/dumps blocks. "
                          "Regenerate with analyze-pellet-tracks.py --cap-score "
                          "--save-cap-score-fixture <path>."),
                "_expected": result,
            }, fh, indent=2)
        print(f"wrote cap-score fixture -> {save_fixture}")
    _print_cap_score(result)
    return result


def cap_score_selftest():
    """Constraint 9 self-validation: replay the whole arm off the already-committed
    representative-audit-slice.json and assert the result against the committed score fixture."""
    with open(CAP_SCORE_FIXTURE) as fh:
        fx = json.load(fh)
    with open(REP_AUDIT_FIXTURE) as fh:
        src = json.load(fh)
    got = _cs_compute(src)
    ok = got == fx["_expected"]
    if not ok:
        for key in sorted(set(got) | set(fx["_expected"])):
            if got.get(key) != fx["_expected"].get(key):
                print(f"  DIFF {key}:\n    expected {json.dumps(fx['_expected'].get(key))}"
                      f"\n    got      {json.dumps(got.get(key))}")
    _print_cap_score(got)
    print("SELFTEST PASS" if ok else "SELFTEST FAIL")
    return 0 if ok else 1


# ============================================================
# MARKER GEOMETRY (docs/probe-runs.md §15) -- §11F/§11H's backend-marker-audit found that the
# shipped backend selector resolves a tie between numpy/pil/opencv's white+red count by ARRAY
# ORDER, discarding opencv's `marker` reading on the loser -- but explicitly left open WHICH side
# is correct at the one event this flips (h4-marciana-structural frame 1565, opencv marker=3).
# docs/handoffs/2026-08-04-pellet-reader-JUDGE-handoff.md item 7 names that as the prerequisite
# before the selector defect can be fixed.
#
# This arm answers it with an INDEPENDENT signal from `marker`/`frame_counts` itself: the general
# RED pellet tracker (`tracks`, the same population `--backend-marker-audit`'s census reads) that
# count-pellets.py's `--dump-tracks` already carries. For one or more queried frames it lists every
# RED track within the dump's own `params.pellet_radius` of that frame's crosshair -- id, life,
# absolute position, distance, crosshair-relative dx/dy -- and, per track, that same dx/dy across a
# +/- window of neighbouring frames. A track whose crosshair-relative offset stays near-constant
# across several frames is CROSSHAIR-ATTACHED (plausibly a real UI element, e.g. a hit-marker
# glyph); a track that exists for exactly one frame is a one-off detection with no such evidence.
#
# READ-ONLY BY CONSTRUCTION: read-pellets.ts, count-pellets.py's debounce_shots and MARKER_MIN are
# never touched or reachable from here -- same precedent as --backend-marker-audit.
# ============================================================
MARKER_GEOMETRY_FIXTURE = "scripts/tests/fixtures/pellets/marker-geometry-slice.json"


def _mg_radius_tracks(tracks, cross, frame, radius):
    """Every RED track alive at `frame` and within `radius` of `cross`, sorted by id."""
    out = []
    for t in tracks:
        if not (t["first"] <= frame <= t["last"]):
            continue
        idx = frame - t["first"]
        x, y = t["xs"][idx], t["ys"][idx]
        dx, dy = x - cross[0], y - cross[1]
        dist = math.hypot(dx, dy)
        if dist <= radius:
            out.append({"id": t["id"], "life": t["life"], "x": round(x, 1), "y": round(y, 1),
                       "dist": round(dist, 2), "dx": round(dx, 2), "dy": round(dy, 2)})
    return sorted(out, key=lambda r: r["id"])


def _mg_track_window(track, cross_positions, frame, window):
    """`track`'s crosshair-relative dx/dy at every frame in [frame-window, frame+window]. A frame
    the track isn't alive at (outside [first, last]) reports dx=dy=None -- absence IS the signal
    that distinguishes a one-frame detection from a persistent, crosshair-attached one."""
    out = []
    for f in range(frame - window, frame + window + 1):
        if f < 0 or f >= len(cross_positions) or not (track["first"] <= f <= track["last"]):
            out.append({"frame": f, "dx": None, "dy": None})
            continue
        idx = f - track["first"]
        x, y = track["xs"][idx], track["ys"][idx]
        cx, cy = cross_positions[f]
        out.append({"frame": f, "dx": round(x - cx, 2), "dy": round(y - cy, 2)})
    return out


def _mg_frame_report(tracks, cross_positions, frame, radius, window):
    cross = cross_positions[frame]
    tracks_by_id = {t["id"]: t for t in tracks}
    near = _mg_radius_tracks(tracks, cross, frame, radius)
    for r in near:
        r["window"] = _mg_track_window(tracks_by_id[r["id"]], cross_positions, frame, window)
        present = [w for w in r["window"] if w["dx"] is not None]
        r["n_window_present"] = len(present)
        if len(present) > 1:
            dxs, dys = [w["dx"] for w in present], [w["dy"] for w in present]
            r["dx_range"] = round(max(dxs) - min(dxs), 2)
            r["dy_range"] = round(max(dys) - min(dys), 2)
        else:
            r["dx_range"] = r["dy_range"] = None
    return {"frame": frame, "cross": list(cross), "radius": radius, "n_near": len(near),
           "tracks": near}


def _mg_dump_report(name, tracks, cross_positions, frames, radius, window):
    return {"dump": name, "radius": radius, "window": window,
           "frames": [_mg_frame_report(tracks, cross_positions, f, radius, window) for f in frames]}


def _mg_expected(report):
    """The whole report IS the pinned summary -- a couple of frames, a handful of tracks each,
    small enough to read in a diff, and it is exactly what docs/probe-runs.md §15's geometry table
    is read off."""
    return report


def _print_marker_geometry(report):
    print(f"\nMARKER GEOMETRY -- {report['dump']}  radius={report['radius']}  "
         f"window=+/-{report['window']}")
    for fr in report["frames"]:
        print(f"\nframe {fr['frame']}  crosshair={fr['cross']}  n_near={fr['n_near']}")
        print(f"  {'id':>7s} {'life':>5s} {'x':>8s} {'y':>8s} {'dist':>7s} {'dx':>7s} {'dy':>7s} "
             f"{'n_win':>6s} {'dx_rng':>7s} {'dy_rng':>7s}")
        for t in fr["tracks"]:
            dxr = "-" if t["dx_range"] is None else f"{t['dx_range']:.2f}"
            dyr = "-" if t["dy_range"] is None else f"{t['dy_range']:.2f}"
            print(f"  {t['id']:7d} {t['life']:5d} {t['x']:8.1f} {t['y']:8.1f} {t['dist']:7.2f} "
                 f"{t['dx']:7.2f} {t['dy']:7.2f} {t['n_window_present']:6d} {dxr:>7s} {dyr:>7s}")
            for w in t["window"]:
                dx = "." if w["dx"] is None else f"{w['dx']:.2f}"
                dy = "." if w["dy"] is None else f"{w['dy']:.2f}"
                print(f"      f{w['frame']}: dx={dx} dy={dy}")


def _mg_load_dump(path):
    """Load one --marker-geometry TRACKS_JSON: only RED tracks' id/first/last/life/xs/ys, the
    crosshair series (`cross_positions`), and the dump's own `params.pellet_radius` -- never the
    full ~40k-track dump verbatim. `path` is the tracks.json FILE (not a dump dir); the dump name
    is its parent directory's name, the same slug every other arm uses."""
    with open(path) as fh:
        data = json.load(fh)
    cross_positions = data["cross_positions"]
    radius = data["params"]["pellet_radius"]
    tracks = [{"id": t["id"], "first": t["first"], "last": t["last"], "life": t["life"],
              "xs": t["xs"], "ys": t["ys"]}
             for t in data["tracks"] if t["is_red"]]
    name = Path(path).resolve().parent.name
    return name, tracks, cross_positions, radius


def _mg_slim(tracks, cross_positions, radius, frames, window):
    """Reduce a full dump to exactly what --marker-geometry-selftest needs to reproduce `frames`:
    the crosshair positions over the queried span (every frame in [min(frames)-window,
    max(frames)+window], since a track's window can reach any frame in that span) and only the RED
    tracks that land within `radius` of the crosshair at one of the QUERIED frames -- the only ones
    `_mg_frame_report` ever looks up -- each carrying its full xs/ys (a handful of points; these
    are short-lived tracks, not the whole clip). Mirrors `_bma_slim`'s precedent of storing only
    what the arm's own functions consume, replayed through those same functions."""
    lo, hi = min(frames) - window, max(frames) + window
    lo_c, hi_c = max(lo, 0), min(hi, len(cross_positions) - 1)
    cross_slice = {str(f): list(cross_positions[f]) for f in range(lo_c, hi_c + 1)}
    keep_ids = set()
    for f in frames:
        if 0 <= f < len(cross_positions):
            keep_ids.update(r["id"] for r in _mg_radius_tracks(tracks, cross_positions[f], f, radius))
    tracks_by_id = {t["id"]: t for t in tracks}
    return {
        "cross_positions": cross_slice,
        "radius": radius,
        "tracks": [tracks_by_id[i] for i in sorted(keep_ids)],
        "frame_span": [lo, hi],
    }


class _MGCrossSpan:
    """Dict-backed stand-in for the live `cross_positions` list, indexable the same way
    (`obj[frame]`) over exactly the fixture's committed span. A frame outside that span is a
    fixture/query mismatch, not a legitimate replay -- it raises (KeyError) rather than silently
    returning a wrong position."""

    def __init__(self, cross, hi):
        self._cross, self._hi = cross, hi

    def __len__(self):
        return self._hi + 1

    def __getitem__(self, f):
        return self._cross[f]


def _mg_expand(d):
    """Compact fixture slice -> the (tracks, cross_positions, radius) shapes `_mg_dump_report`
    reads, unchanged from the live shapes `_mg_slim` compacted."""
    cross = {int(k): v for k, v in d["cross_positions"].items()}
    _, hi = d["frame_span"]
    return d["tracks"], _MGCrossSpan(cross, hi), d["radius"]


def audit_marker_geometry(tracks_json, frames, radius_override, window, save_fixture=None):
    name, tracks, cross_positions, radius = _mg_load_dump(tracks_json)
    if radius_override is not None:
        radius = radius_override
    report = _mg_dump_report(name, tracks, cross_positions, frames, radius, window)
    if save_fixture:
        slim = _mg_slim(tracks, cross_positions, radius, frames, window)
        with open(save_fixture, "w") as fh:
            json.dump({
                "_source": (f"{tracks_json}'s own `tracks`/`cross_positions`/`params.pellet_radius` "
                           "(count-pellets.py --dump-tracks), for the 2026-08-04 marker=3 "
                           "false-positive-geometry check (docs/probe-runs.md §15, answering "
                           "docs/handoffs/2026-08-04-pellet-reader-JUDGE-handoff.md item 7's "
                           "prerequisite). Constraint 9 self-validation, same precedent as "
                           "backend-marker-audit-slice.json."),
                "_note": ("A SLICE, not the full dump: `slice.cross_positions` only covers "
                         "`slice.frame_span` (queried frames +/- window), and `slice.tracks` is "
                         "only the RED tracks within `radius` of the crosshair at one of the "
                         "queried `frames`, each with its full xs/ys (they are short-lived). "
                         "Regenerate with analyze-pellet-tracks.py --marker-geometry "
                         "<tracks.json> --marker-geometry-frames <F...> "
                         "--save-marker-geometry-fixture <path>."),
                "dump": name, "frames": frames, "window": window,
                "slice": slim,
                "_expected": _mg_expected(report),
            }, fh, indent=2)
        print(f"wrote marker-geometry fixture -> {save_fixture}")
    _print_marker_geometry(report)
    return report


def marker_geometry_selftest():
    """Constraint 9 self-validation: replay --marker-geometry over the committed slice (no
    scratchpad access -- every path this touches is under scripts/tests/fixtures/) and assert BOTH
    the general `_expected` dict AND the frame-1565 finding explicitly, so a fixture edit that moved
    either cannot hide behind a coarse dict-equality pass: ONE crosshair-attached track (id 11110,
    life 3, near-constant +9/-57..-59 across frames 1564-1566) plus TWO single-frame components
    (11115, 11117, life 1) that exist only at frame 1565 -- three red components within
    pellet_radius, but only one with any evidence of being crosshair-attached."""
    with open(MARKER_GEOMETRY_FIXTURE) as fh:
        fx = json.load(fh)
    tracks, cross_positions, radius = _mg_expand(fx["slice"])
    report = _mg_dump_report(fx["dump"], tracks, cross_positions, fx["frames"], radius, fx["window"])
    got = _mg_expected(report)
    ok = got == fx["_expected"]
    if not ok:
        print(f"  DIFF:\n    expected {json.dumps(fx['_expected'])}\n    got      {json.dumps(got)}")

    by_frame = {fr["frame"]: fr for fr in report["frames"]}
    f1565 = by_frame.get(1565)
    checks = [("frame 1565 present", f1565 is not None)]
    if f1565 is not None:
        by_id = {t["id"]: t for t in f1565["tracks"]}
        checks += [
            ("n_near at 1565 == 3", f1565["n_near"] == 3),
            ("track ids at 1565 == {11110, 11115, 11117}", set(by_id) == {11110, 11115, 11117}),
            ("11110 life == 3", by_id.get(11110, {}).get("life") == 3),
            ("11110 dx == 8.9 at 1565", by_id.get(11110, {}).get("dx") == 8.9),
            ("11110 dy == -57.0 at 1565", by_id.get(11110, {}).get("dy") == -57.0),
            ("11110 spans >1 window frame (crosshair-attached)",
             by_id.get(11110, {}).get("n_window_present", 0) > 1),
            ("11110 dx_range <= 1.0 (near-constant offset)",
             (by_id.get(11110, {}).get("dx_range") or 99) <= 1.0),
            ("11115 life == 1, single-frame only",
             by_id.get(11115, {}).get("life") == 1
             and by_id.get(11115, {}).get("n_window_present") == 1),
            ("11117 life == 1, single-frame only",
             by_id.get(11117, {}).get("life") == 1
             and by_id.get(11117, {}).get("n_window_present") == 1),
        ]
    all_ok = ok and all(v for _, v in checks)
    for label, v in checks:
        print(f"  {'PASS' if v else 'FAIL'}  {label}")
    _print_marker_geometry(report)
    print("SELFTEST PASS" if all_ok else "SELFTEST FAIL")
    return 0 if all_ok else 1


# ============================================================
# DUMP-REPLAY FIDELITY -- can tracks.json reproduce the channels production actually counted?
#
# Every analysis arm in this file that reasons about `white`/`red`/`marker` reads a
# count-pellets.py --dump-tracks tracks.json and re-derives those channels from the dump's
# `tracks` + `cross_positions` + `params`. That is only legitimate if the re-derivation MATCHES
# the `frame_counts` production actually emitted. This arm checks exactly that, per frame, and
# -- when it does not match -- separates the two mechanisms that can cause it:
#
#   (1) SPLIT: the in-radius, is_pellet track total is the SAME but its white/red/marker split
#       differs. `_track_components` stores `is_red` on a track ONCE, at creation, and never
#       updates it, while `_frame_pellet_counts` classifies using the PER-FRAME component's
#       `is_red` out of `frame_tracks`. --dump-tracks writes the track-level value, so a track
#       whose components change colour mid-life replays under the wrong channel. Nothing enters
#       or leaves the radius window, so the total is conserved -- that conservation IS the
#       signature.
#   (2) BOUNDARY: the total is NOT conserved. --dump-tracks rounds `xs`/`ys` to 0.1px, so a
#       track sitting within a rounding step of `pellet_radius` or `marker_radius` can fall on
#       the other side of `dist > radius` on replay. Signature: a track within
#       --fidelity-boundary-eps of one of those two radii on that frame.
#
# 2026-08-05-dump-schema-LANDING-PLAN.md landed the fix for BOTH: `_track_components` now stamps a
# per-frame `reds` array parallel to `xs`/`ys` (kills SPLIT on dumps that carry it -- D1/D2 read
# `reds` when present) and `--dump-tracks` stores `xs`/`ys` at full precision instead of rounding
# to 0.1px (kills BOUNDARY by construction, since `cross_positions` was already unrounded). Dumps
# written BEFORE that landing carry neither field and still exhibit both mechanisms exactly as
# measured in docs/probe-runs.md §25 -- this arm's fallback-to-track-level-`is_red` path is what
# replays those old dumps unchanged, so it is still worth knowing the two signatures above.
#
# ⚑ `marker_radius` is now persisted in `--dump-tracks`' `params` block (Edit C); D3/D4 resolve it
# from there with a fallback to count-pellets.py's default (65) for dumps that predate the
# persistence. `--fidelity-marker-radius` still lets a caller override it explicitly.
#
# ⚑ SCOPE NOTE, recorded rather than rediscovered later (plan §3): eleven OTHER call sites in this
# file plus two in score-pellets.py still read a track's creation-time `is_red` (deliberately --
# they ask a track-level "which colour is this track" question, not a per-frame channel-counting
# one, and changing them would move committed fixtures for no measured reason). On a SPLIT frame
# that per-track value is now something `reds`/`frame_counts` on the SAME dump demonstrably
# contradicts for at least one frame of that track's life. Any FUTURE arm built on those eleven
# sites inherits that mislabel; this comment exists so a later pass finds this note before
# re-deriving the SPLIT finding from scratch.
#
# READ-ONLY / MEASUREMENT ONLY: this reports a divergence rate and attributes it to a mechanism.
# It never touches count-pellets.py, read-pellets.ts, MARKER_MIN, debounce_shots, or any
# constant/gate/default, and it stamps no verdict on the cold bias.
DUMP_REPLAY_FIDELITY_FIXTURE = "scripts/tests/fixtures/pellets/dump-replay-fidelity-slice.json"
DRF_DEFAULT_MARKER_RADIUS = 65.0   # count-pellets.py's --marker-radius default; fallback for
                                    # dumps written before params.marker_radius was persisted
DRF_BOUNDARY_EPS = 0.05            # half a 0.1px rounding step


def _drf_frame_tracks(tracks, n_frames):
    """frame index -> [(id, x, y, is_red, is_pellet)] for every track alive at that frame, read
    straight off a --dump-tracks `tracks` list (`xs`/`ys` are indexed by frame - first).

    D1 (2026-08-05-dump-schema-LANDING-PLAN.md §2.2): prefer the per-frame `reds` channel when
    present -- this is §25's OWN arm, the one that measured SPLIT in the first place, so it is the
    most direct kill of it. Falls back to the track-level `is_red` when `reds` is absent or short
    (pre-fix / hand-built dumps), byte-identical to today's behaviour."""
    out = collections.defaultdict(list)
    for t in tracks:
        reds = t.get("reds")
        for i, f in enumerate(range(t["first"], t["last"] + 1)):
            if 0 <= f < n_frames and i < len(t["xs"]):
                is_red = bool(reds[i]) if reds and i < len(reds) else bool(t["is_red"])
                out[f].append((t["id"], t["xs"][i], t["ys"][i], is_red,
                               bool(t["is_pellet"])))
    return out


def _drf_recon_frame(entries, cross, pellet_radius, marker_radius):
    """Replay `_frame_pellet_counts`' white/red/marker window for ONE frame from dumped tracks.

    Deliberately the same shape as count-pellets.py's loop -- radius gate, then the is_pellet
    (lifetime) gate, then red-inside-marker_radius vs red-outside vs white. `dists` carries every
    in-frame track's distance so the BOUNDARY signature can be tested without a second pass."""
    white = red = marker = 0
    dists = []
    if cross is not None:
        for _tid, x, y, is_red, is_pellet in entries:
            dist = math.hypot(x - cross[0], y - cross[1])
            dists.append(dist)
            if dist > pellet_radius or not is_pellet:
                continue
            if is_red:
                if dist < marker_radius:
                    marker += 1
                else:
                    red += 1
            else:
                white += 1
    return {"white": white, "red": red, "marker": marker}, dists


def _drf_score(name, frame_tracks, cross_positions, frame_counts, pellet_radius, marker_radius,
               eps=DRF_BOUNDARY_EPS):
    """Score one dump frame-by-frame. `frame_tracks` need only support `[frame]` returning the
    entry list -- a live run passes the defaultdict `_drf_frame_tracks` builds, the selftest
    passes the fixture's own per-frame dict, both replay through this same function."""
    n = len(cross_positions)
    n_scored = n_div = n_marker_div = n_marker_bearing = 0
    n_split = n_boundary = n_unexplained = 0
    boundary_gaps = []
    divergent_frames = []
    for f in range(n):
        cross = cross_positions[f]
        stored = frame_counts[f]
        got, dists = _drf_recon_frame(frame_tracks[f], cross, pellet_radius, marker_radius)
        if cross is None:
            continue
        n_scored += 1
        if stored.get("marker", 0) > 0:
            n_marker_bearing += 1
        same = all(got[k] == stored.get(k, 0) for k in ("white", "red", "marker"))
        if same:
            continue
        n_div += 1
        if got["marker"] != stored.get("marker", 0):
            n_marker_div += 1
        got_total = got["white"] + got["red"] + got["marker"]
        stored_total = sum(stored.get(k, 0) for k in ("white", "red", "marker"))
        if got_total == stored_total:
            n_split += 1
            mech = "split"
            gap = None
        else:
            gap = min((min(abs(d - pellet_radius), abs(d - marker_radius)) for d in dists),
                      default=None)
            if gap is not None and gap <= eps:
                n_boundary += 1
                mech = "boundary"
                boundary_gaps.append(gap)
            else:
                n_unexplained += 1
                mech = "UNEXPLAINED"
        divergent_frames.append({
            "frame": f, "mechanism": mech,
            "stored": {k: stored.get(k, 0) for k in ("white", "red", "marker")},
            "replayed": got,
            "boundary_gap": None if gap is None else round(gap, 4),
        })
    return {
        "dump": name, "pellet_radius": pellet_radius, "marker_radius": marker_radius,
        "n_frames": n, "n_frames_scored": n_scored,
        "n_divergent": n_div,
        "n_marker_divergent": n_marker_div,
        "n_marker_bearing_frames": n_marker_bearing,
        # The rate that matters for any marker-channel analysis: divergence is concentrated on
        # the sparse marker population, so a per-FRAME rate understates it several-fold.
        "marker_divergence_rate": (round(n_marker_div / n_marker_bearing, 4)
                                   if n_marker_bearing else None),
        "frame_divergence_rate": round(n_div / n_scored, 4) if n_scored else None,
        "n_split": n_split, "n_boundary": n_boundary, "n_unexplained": n_unexplained,
        "max_boundary_gap": round(max(boundary_gaps), 4) if boundary_gaps else None,
        "frames": divergent_frames,
    }


def _drf_pool(reports):
    tot = lambda k: sum(r[k] for r in reports)  # noqa: E731
    div, mb, md = tot("n_divergent"), tot("n_marker_bearing_frames"), tot("n_marker_divergent")
    gaps = [r["max_boundary_gap"] for r in reports if r["max_boundary_gap"] is not None]
    return {
        "n_dumps": len(reports),
        "n_frames_scored": tot("n_frames_scored"),
        "n_divergent": div,
        "n_marker_divergent": md,
        "n_marker_bearing_frames": mb,
        "marker_divergence_rate": round(md / mb, 4) if mb else None,
        "frame_divergence_rate": (round(div / tot("n_frames_scored"), 4)
                                  if tot("n_frames_scored") else None),
        "n_split": tot("n_split"), "n_boundary": tot("n_boundary"),
        "n_unexplained": tot("n_unexplained"),
        "split_share_of_divergent": round(tot("n_split") / div, 4) if div else None,
        "max_boundary_gap": round(max(gaps), 4) if gaps else None,
    }


def _drf_expected(reports, pooled):
    return {
        "pooled": pooled,
        "dumps": [{k: r[k] for k in ("dump", "n_frames_scored", "n_divergent",
                                     "n_marker_divergent", "n_marker_bearing_frames",
                                     "marker_divergence_rate", "n_split", "n_boundary",
                                     "n_unexplained", "max_boundary_gap")}
                  for r in reports],
    }


def _print_dump_replay_fidelity(reports, pooled):
    print("\nDUMP-REPLAY FIDELITY -- does tracks.json reproduce the dump's own frame_counts?")
    print(f"  {'dump':28s} {'frames':>7s} {'diverg':>7s} {'mk-div':>7s} {'mk-frm':>7s} "
          f"{'mk-rate':>8s} {'split':>6s} {'bound':>6s} {'unexp':>6s}")
    for r in reports:
        rate = "-" if r["marker_divergence_rate"] is None else f"{r['marker_divergence_rate']:.4f}"
        print(f"  {r['dump']:28s} {r['n_frames_scored']:7d} {r['n_divergent']:7d} "
              f"{r['n_marker_divergent']:7d} {r['n_marker_bearing_frames']:7d} {rate:>8s} "
              f"{r['n_split']:6d} {r['n_boundary']:6d} {r['n_unexplained']:6d}")
    print(f"\n  POOLED  {pooled['n_dumps']} dumps / {pooled['n_frames_scored']} frames scored")
    print(f"    divergent frames          {pooled['n_divergent']} "
          f"({pooled['frame_divergence_rate']} of frames)")
    print(f"    marker-channel divergent  {pooled['n_marker_divergent']} of "
          f"{pooled['n_marker_bearing_frames']} marker-bearing frames "
          f"= {pooled['marker_divergence_rate']}")
    print(f"    mechanism: SPLIT {pooled['n_split']} ({pooled['split_share_of_divergent']} of "
          f"divergent) / BOUNDARY {pooled['n_boundary']} / UNEXPLAINED "
          f"{pooled['n_unexplained']}")
    if pooled["max_boundary_gap"] is not None:
        print(f"    worst BOUNDARY gap to a radius: {pooled['max_boundary_gap']}px "
              f"(eps {DRF_BOUNDARY_EPS})")


def _drf_load_dump(path, marker_radius):
    """`marker_radius=None` means "not explicitly overridden on the CLI" -- resolve it from the
    dump's own persisted `params.marker_radius` (Edit C) when present, falling back to
    DRF_DEFAULT_MARKER_RADIUS for dumps that predate that persistence (D3,
    2026-08-05-dump-schema-LANDING-PLAN.md §2.2 / gate revision R1: persisting the value is a
    no-op unless something reads it). An explicit `--fidelity-marker-radius` value still wins."""
    with open(path) as fh:
        data = json.load(fh)
    name = Path(path).resolve().parent.name
    cross = data["cross_positions"]
    frame_counts = data["frame_counts"]
    pellet_radius = float(data["params"]["pellet_radius"])
    if marker_radius is None:
        marker_radius = float(data["params"].get("marker_radius", DRF_DEFAULT_MARKER_RADIUS))
    frame_tracks = _drf_frame_tracks(data["tracks"], len(cross))
    return name, frame_tracks, cross, frame_counts, pellet_radius, marker_radius


def _drf_slim(name, frame_tracks, cross, frame_counts, pellet_radius, marker_radius, report,
              n_control):
    """Reduce a full dump to what the selftest replays: EVERY divergent frame (the population the
    whole finding rests on) plus `n_control` evenly-spaced non-divergent frames (so a replay that
    merely reported "everything diverges" would fail), each carrying its crosshair, its stored
    frame_counts, and the raw per-frame track entries `_drf_recon_frame` consumes. Per-frame
    independence is what makes a frame SUBSET an exact replay rather than an approximation."""
    div = {fr["frame"] for fr in report["frames"]}
    non_div = [f for f in range(len(cross)) if cross[f] is not None and f not in div]
    step = max(1, len(non_div) // n_control) if non_div else 1
    keep = sorted(div | set(non_div[::step][:n_control]))
    return {
        "dump": name, "pellet_radius": pellet_radius, "marker_radius": marker_radius,
        "frames": {str(f): {
            "cross": None if cross[f] is None else list(cross[f]),
            "counts": {k: frame_counts[f].get(k, 0) for k in ("white", "red", "marker")},
            "tracks": [list(e) for e in frame_tracks[f]],
        } for f in keep},
    }


class _DRFSeq:
    """Dict-backed stand-in for a full-length `cross_positions` / `frame_counts` / frame-tracks
    view, indexable over exactly the fixture's committed frames.

    ⚑ Indexing is POSITIONAL over the sorted kept frames, not by absolute frame number: the
    fixture is a scattered SUBSET, and `_drf_score` walks `range(len(cross_positions))`. All
    three views share one `frames` list, so position i means the same source frame in each --
    which is what makes a subset replay exact, since `_drf_score` scores every frame
    independently. The consequence is that a replayed report's `frames[].frame` is a slice
    index rather than the dump's own frame number; nothing in `_drf_expected` reads it, and the
    live path (real lists) is unaffected."""

    def __init__(self, per_frame, key, frames):
        self._d, self._key, self._frames = per_frame, key, frames

    def __len__(self):
        return len(self._frames)

    def __getitem__(self, i):
        v = self._d[self._frames[i]][self._key]
        return [tuple(e) for e in v] if self._key == "tracks" else v


def _drf_expand(d):
    frames = sorted(int(k) for k in d["frames"])
    per_frame = {int(k): v for k, v in d["frames"].items()}
    return (d["dump"], _DRFSeq(per_frame, "tracks", frames),
            _DRFSeq(per_frame, "cross", frames), _DRFSeq(per_frame, "counts", frames),
            d["pellet_radius"], d["marker_radius"])


def audit_dump_replay_fidelity(paths, marker_radius, n_control=200, save_fixture=None):
    reports = []
    slims = []
    for p in paths:
        name, ft, cross, fc, pr, mr = _drf_load_dump(p, marker_radius)
        r = _drf_score(name, ft, cross, fc, pr, mr)
        reports.append(r)
        if save_fixture:
            slims.append(_drf_slim(name, ft, cross, fc, pr, mr, r, n_control))
    pooled = _drf_pool(reports)
    if save_fixture:
        with open(save_fixture, "w") as fh:
            json.dump({
                "_source": ("count-pellets.py --dump-tracks tracks.json for each dump's own "
                            "`tracks`/`cross_positions`/`frame_counts`/`params.pellet_radius`, "
                            "sliced to every divergent frame plus evenly-spaced non-divergent "
                            "controls (docs/probe-runs.md §25). Regenerate with "
                            "analyze-pellet-tracks.py --dump-replay-fidelity <tracks.json...> "
                            "--save-dump-replay-fidelity-fixture <path>."),
                # Pin what the SLICE replays, not what the full dumps scored -- the selftest
                # replays the slice, and a slice's control frames change its denominators.
                "_expected": (lambda rs: _drf_expected(rs, _drf_pool(rs)))(
                    [_drf_score(*_drf_expand(s)) for s in slims]),
                "dumps": slims,
            }, fh)
        print(f"wrote dump-replay-fidelity fixture -> {save_fixture}")
    _print_dump_replay_fidelity(reports, pooled)
    return reports, pooled


def dump_replay_fidelity_selftest():
    """Constraint 9 self-validation: replay --dump-replay-fidelity over the committed slice (no
    scratchpad access) and assert the pinned `_expected` dict AND the finding's two decisive
    claims explicitly, so a fixture edit that moved either cannot hide behind dict equality:
      * the arm DISCRIMINATES -- the committed control frames replay EXACTLY (a check that fails
        the moment the reconstruction stops matching production at all), and
      * every divergent frame is attributed to SPLIT or BOUNDARY, i.e. `n_unexplained == 0`, the
        claim that the two mechanisms are a COMPLETE account rather than a partial one."""
    with open(DUMP_REPLAY_FIDELITY_FIXTURE) as fh:
        fx = json.load(fh)
    reports = [_drf_score(*_drf_expand(d)) for d in fx["dumps"]]
    pooled = _drf_pool(reports)
    got = _drf_expected(reports, pooled)
    ok = got == fx["_expected"]
    if not ok:
        print(f"  DIFF:\n    expected {json.dumps(fx['_expected'])}\n    got      {json.dumps(got)}")
    n_control = sum(len(d["frames"]) for d in fx["dumps"]) - pooled["n_divergent"]
    checks = [
        ("every divergent frame attributed to SPLIT or BOUNDARY (n_unexplained == 0)",
         pooled["n_unexplained"] == 0),
        (f"{n_control} committed control frames replay EXACTLY (arm discriminates)",
         n_control > 0 and pooled["n_divergent"] == sum(len(r["frames"]) for r in reports)),
        ("the SPLIT mechanism dominates (> 90% of divergent frames)",
         (pooled["split_share_of_divergent"] or 0) > 0.90),
        (f"every BOUNDARY frame sits within {DRF_BOUNDARY_EPS}px of a radius",
         pooled["max_boundary_gap"] is None or pooled["max_boundary_gap"] <= DRF_BOUNDARY_EPS),
    ]
    all_ok = ok and all(v for _, v in checks)
    for label, v in checks:
        print(f"  {'PASS' if v else 'FAIL'}  {label}")
    _print_dump_replay_fidelity(reports, pooled)
    print("  ⚑ RATES BELOW/ABOVE ARE SLICE RATES AND ARE ENRICHMENT-BIASED -- the slice keeps "
          "EVERY divergent\n    frame but only a sample of the non-divergent ones, so its "
          "denominators are not the dumps'.\n    The population figures are in docs/probe-runs.md "
          "§25; re-derive them with --dump-replay-fidelity\n    over the full tracks.json set. "
          "What this selftest pins is the NUMERATORS and the mechanism split.")
    print("SELFTEST PASS" if all_ok else "SELFTEST FAIL")
    return 0 if all_ok else 1


# ============================================================
# THE RADIUS GATE -- docs/handoffs/2026-08-05-radius-gate-PRECOMMIT.md, docs/probe-runs.md §35
#
# §19C named the radius gate and the mislock as carrying the ENTIRE -1.40/shot residual, and the
# mislock half is now closed at ~0 (§22C, §34). That makes `pellet_radius` the only channel any
# measurement has named. Is the 160px gate cutting into the real pellet cloud, or sitting in empty
# space?
#
# Radial histogram of LIFETIME-IN-BAND white tracks by distance from the crosshair, at the frame
# whose count actually becomes the shot's `white` (the landed hybrid's representative frame) -- so
# the gate is measured where the gate is applied.
#
# ⚑ TWO THINGS THE PRE-COMMIT PINS DOWN BECAUSE BOTH ARE EASY TO GET WRONG:
#   §2.1 annulus AREA grows with r, so a UNIFORM density yields a RISING raw count per annulus. The
#        verdict is read off DENSITY (count / area), never off raw counts.
#   §2.2 clutter is on every frame, pellets only near a shot -- so the same profile is built on
#        QUIET frames and the DIFFERENCE is what is attributed to pellets. A conclusion from the raw
#        shot-frame profile alone is inadmissible.
#
# MEASUREMENT ONLY: `pellet_radius` is not changed regardless of outcome (pre-commit §5).
RADIUS_GATE_FIXTURE = "scripts/tests/fixtures/pellets/radius-gate-slice.json"
RG_BIN = 20        # px per annulus
RG_MAX = 400       # px, outer edge of the profile
RG_QUIET_GAP = 30  # frames a QUIET frame must be from any event span
# Owner-marked pellet positions, 368x368 crops centred on the crosshair (radius 184 > the 160px
# gate). The INDEPENDENT attribution check -- see _rg_owner_label_bound.
RG_OWNER_POSITIONS = "scripts/tests/fixtures/pellets/groundtruth-f8-11-positions.json"
RG_CROP_RADIUS = 184.0


def _rg_profile(frames, tracks_by_frame, cross_positions, band_ids):
    """Radial histogram (counts per RG_BIN annulus) of in-band WHITE tracks over `frames`."""
    nb = RG_MAX // RG_BIN
    hist = [0] * nb
    for f in frames:
        cp = cross_positions[f]
        if cp is None:
            continue
        for tid, x, y, is_red in tracks_by_frame.get(f, ()):
            if is_red or tid not in band_ids:
                continue
            d = math.hypot(x - cp[0], y - cp[1])
            b = int(d // RG_BIN)
            if 0 <= b < nb:
                hist[b] += 1
    return hist


def _rg_density(hist, n_frames):
    """Per-frame count divided by annulus AREA -- the quantity the verdict is read off (§2.1)."""
    out = []
    for b, c in enumerate(hist):
        r0, r1 = b * RG_BIN, (b + 1) * RG_BIN
        area = math.pi * (r1 ** 2 - r0 ** 2)
        out.append((c / n_frames / area) if n_frames else 0.0)
    return out


def _rg_score(name, tracks, cross_positions, frame_counts, params, fps):
    cp_mod = _count_pellets_module()
    n = len(frame_counts)
    band_lo = cp_mod._band_lo(fps)
    band_hi = params.get("band_hi") or params["max_pellet_frames"]
    band_ids = {t["id"] for t in tracks if band_lo <= t["life"] <= band_hi}

    by_frame = collections.defaultdict(list)
    for t in tracks:
        reds = t.get("reds")
        for i, f in enumerate(range(t["first"], t["last"] + 1)):
            if f < 0 or f >= n or i >= len(t["xs"]):
                continue
            is_red = bool(reds[i]) if reds and i < len(reds) else bool(t["is_red"])
            by_frame[f].append((t["id"], t["xs"][i], t["ys"][i], is_red))

    shots, _ = cp_mod.debounce_shots([dict(r) for r in frame_counts], fps)
    # The representative frame IS the shot's `frame` -- debounce_shots reports the frame whose
    # count it copied, which is exactly where the radius gate got applied for that shot.
    shot_frames = [s["frame"] for s in shots if 0 <= s["frame"] < n]
    spans = [(s["start"], s["end"]) for s in shots]
    quiet = [f for f in range(n)
             if cross_positions[f] is not None
             and all(f < a - RG_QUIET_GAP or f > b + RG_QUIET_GAP for a, b in spans)]

    sh_hist = _rg_profile(shot_frames, by_frame, cross_positions, band_ids)
    qt_hist = _rg_profile(quiet, by_frame, cross_positions, band_ids)
    sh_den = _rg_density(sh_hist, len(shot_frames))
    qt_den = _rg_density(qt_hist, len(quiet))
    diff_den = [a - b for a, b in zip(sh_den, qt_den)]
    # per-SHOT pellet-attributable count in an annulus = (shot rate - quiet rate) per frame
    diff_per_shot = [sh_hist[b] / len(shot_frames) - (qt_hist[b] / len(quiet) if quiet else 0.0)
                     for b in range(len(sh_hist))]

    gate = params["pellet_radius"]
    gb = int(gate // RG_BIN)
    just_out = range(gb, min(gb + 3, len(sh_hist)))          # 160..219 at RG_BIN=20
    return {
        "dump": name, "fps": fps, "pellet_radius": gate, "band": [band_lo, band_hi],
        "n_shots": len(shots), "n_shot_frames": len(shot_frames), "n_quiet_frames": len(quiet),
        "shot_hist": sh_hist, "quiet_hist": qt_hist,
        "shot_density": [round(v, 9) for v in sh_den],
        "diff_density": [round(v, 9) for v in diff_den],
        "diff_per_shot": [round(v, 5) for v in diff_per_shot],
        "T_just_outside": round(sum(diff_per_shot[b] for b in just_out), 5),
        "peak_in_gate_density": round(max(diff_den[:gb]) if gb else 0.0, 9),
        "density_at_gate": round(diff_den[gb] if gb < len(diff_den) else 0.0, 9),
        "shot_count_just_outside": sum(sh_hist[b] for b in just_out),
        "quiet_rate_just_outside": round(
            sum(qt_hist[b] for b in just_out) / len(quiet) * len(shot_frames), 2) if quiet else 0.0,
    }


def _rg_owner_label_bound():
    """⚑ THE INDEPENDENT ATTRIBUTION CHECK -- and the one that overturned this arm's own headline.

    The quiet-frame control (§2.2) removes STATIC clutter. It CANNOT remove shot-correlated
    NON-pellet material (muzzle/impact VFX, debris) that appears only near a shot and survives the
    lifetime band -- so the difference profile is pellet-attributable only where something
    independent says pellets actually are.

    `groundtruth-f8-11-positions.json` is that independent thing: OWNER-MARKED pellet positions in
    368x368 crops centred on the crosshair (radius 184 > the 160px gate, so it CAN see past it).
    Returns the radial histogram of labelled pellet instances and the share at/beyond the gate."""
    with open(RG_OWNER_POSITIONS) as fh:
        d = json.load(fh)
    R = RG_CROP_RADIUS
    hist, tot, beyond, mx = collections.Counter(), 0, 0, 0.0
    for sh in d["shots"]:
        for fr in sh["frames"]:
            for px, py in fr["positions"]:
                r = math.hypot(px - R, py - R)
                tot += 1
                mx = max(mx, r)
                hist[int(r // RG_BIN) * RG_BIN] += 1
                if r >= 160:
                    beyond += 1
    return {"n_instances": tot, "max_radius": round(mx, 1), "n_at_or_beyond_gate": beyond,
            "share_beyond_gate": round(beyond / tot, 4) if tot else None,
            "hist": dict(sorted(hist.items())),
            "n_beyond_180": sum(v for k, v in hist.items() if k >= 180)}


def _rg_pool(reports):
    n_shots = sum(r["n_shots"] for r in reports)
    nb = RG_MAX // RG_BIN
    tot = [sum(r["diff_per_shot"][b] * r["n_shots"] for r in reports) for b in range(nb)]
    per_shot = [t / n_shots if n_shots else 0.0 for t in tot]
    gb = int(reports[0]["pellet_radius"] // RG_BIN) if reports else 8
    peak = max(per_shot[:gb]) if gb else 0.0
    at_gate = per_shot[gb] if gb < len(per_shot) else 0.0
    sh_out = sum(r["shot_count_just_outside"] for r in reports)
    qt_out = sum(r["quiet_rate_just_outside"] for r in reports)
    return {
        "n_dumps": len(reports), "n_shots": n_shots,
        "diff_per_shot": [round(v, 5) for v in per_shot],
        "T_just_outside": round(sum(per_shot[gb:min(gb + 3, nb)]), 5),
        "peak_in_gate_per_shot": round(peak, 5),
        "per_shot_at_gate": round(at_gate, 5),
        "gate_over_peak": round(at_gate / peak, 4) if peak else None,
        "clutter_share_just_outside": round(qt_out / sh_out, 4) if sh_out else None,
    }


def _rg_band(pooled):
    """Pre-commit §3's bands, committed at 57c1de78 before any number existed."""
    T, ratio = pooled["T_just_outside"], (pooled["gate_over_peak"] or 0)
    if T > 0.30 and ratio >= 0.25:
        return "THE GATE IS CUTTING THE CLOUD -- a live cold-bias channel, the first one found"
    if T >= 0.05:
        return "A REAL BUT MINOR CHANNEL -- record; it does not explain -1.40 on its own"
    return ("GATE IS IN EMPTY SPACE -- not the cold channel; the -1.40 needs another suspect "
            "(requires density <= 10% of in-gate peak before the gate, checked below)")


def _rg_controls(pooled):
    cs = pooled["clutter_share_just_outside"]
    return [
        ("CONTROL A -- clutter is < 80% of the shot-frame count just outside the gate",
         cs is not None and cs < 0.80, f"clutter share {cs}"),
        ("CONTROL B -- the difference profile INSIDE the gate is positive and larger than outside",
         pooled["peak_in_gate_per_shot"] > 0
         and pooled["peak_in_gate_per_shot"] > pooled["per_shot_at_gate"],
         f"in-gate peak {pooled['peak_in_gate_per_shot']}/shot vs at-gate "
         f"{pooled['per_shot_at_gate']}/shot"),
    ]


def _print_radius_gate(reports, pooled, checks):
    print("\nTHE RADIUS GATE -- is the 160px cut into the pellet cloud, or in empty space?")
    print("  (docs/handoffs/2026-08-05-radius-gate-PRECOMMIT.md; verdict read off DENSITY, §2.1)")
    gate = reports[0]["pellet_radius"] if reports else 160
    print(f"\n  PELLET-ATTRIBUTABLE (shot - quiet) per shot, by annulus -- gate at {gate}px:")
    print(f"  {'r range':>12s} {'per shot':>10s}   {'':2s}")
    for b, v in enumerate(pooled["diff_per_shot"]):
        r0, r1 = b * RG_BIN, (b + 1) * RG_BIN
        mark = "  <== GATE" if r0 == gate else ("" if r0 < gate else "   (outside)")
        bar = "#" * min(40, int(max(v, 0) * 60))
        print(f"  {f'{r0}-{r1}':>12s} {v:10.4f}   {bar}{mark}")
    print(f"\n  in-gate PEAK {pooled['peak_in_gate_per_shot']}/shot | at the gate "
          f"{pooled['per_shot_at_gate']}/shot | ratio {pooled['gate_over_peak']}")
    print(f"  T (pellet-attributable in {gate}-{gate + 60}px) = "
          f"**{pooled['T_just_outside']}/shot** over {pooled['n_shots']} shots")
    ob = pooled.get("owner_label_bound")
    if ob:
        print(f"\n  ⚑ INDEPENDENT ATTRIBUTION CHECK — OWNER-MARKED pellet positions "
              f"(n={ob['n_instances']} instances):")
        print(f"    max labelled radius **{ob['max_radius']}px**; at/beyond the 160px gate "
              f"{ob['n_at_or_beyond_gate']} = {ob['share_beyond_gate']}; "
              f"**beyond 180px: {ob['n_beyond_180']}**")
        print(f"    label histogram: {ob['hist']}")
        print("    ⇒ owner pellets STOP at ~167px. The difference profile's material beyond 180px")
        print("      is therefore NOT pellets — the quiet-frame control removes STATIC clutter but")
        print("      NOT shot-correlated VFX. ⛔ T as printed above is CONTAMINATED; the")
        print("      label-based bound is share_beyond_gate x 8.40 pellets/shot.")
    print(f"\n  PRE-COMMITTED BAND (on the CONTAMINATED T — see above): {_rg_band(pooled)}")
    print("\n  FALSIFICATION CONTROLS (§4 -- either firing VOIDS):")
    for label, ok, detail in checks:
        print(f"    {'PASS' if ok else '*** FIRED -- VOID ***':22s} {label}\n{' ' * 26}{detail}")


def audit_radius_gate(paths, fps_list, save_fixture=None):
    fpss = fps_list if len(fps_list) == len(paths) else [fps_list[0]] * len(paths)
    reports = []
    for p, fps in zip(paths, fpss):
        name, tracks, cross, fc, params, fps = _ms_load_dump(p, fps)
        reports.append(_rg_score(name, tracks, cross, fc, params, fps))
    pooled = _rg_pool(reports)
    pooled["owner_label_bound"] = _rg_owner_label_bound()
    checks = _rg_controls(pooled)
    if save_fixture:
        with open(save_fixture, "w") as fh:
            json.dump({"_source": ("count-pellets.py --dump-tracks tracks.json (post-8d500ff9), "
                                   "FULL dumps; docs/probe-runs.md §35."),
                       "_expected": {"pooled": pooled,
                                     "dumps": [{k: v for k, v in r.items()
                                                if k != "shot_density"} for r in reports]}},
                      fh, indent=1)
        print(f"wrote radius-gate fixture -> {save_fixture}")
    _print_radius_gate(reports, pooled, checks)
    return reports, pooled, checks


def radius_gate_selftest():
    """Constraint 9 self-validation. Pins the committed numbers' internal coherence and the
    properties §35's conclusion rests on; PRINTS that it does not re-derive them (the dumps are
    gitignored, and the profile is a property of the FULL track list)."""
    with open(RADIUS_GATE_FIXTURE) as fh:
        fx = json.load(fh)
    p, dumps = fx["_expected"]["pooled"], fx["_expected"]["dumps"]
    gb = int(dumps[0]["pellet_radius"] // RG_BIN)
    checks = [
        ("pooled shot count equals the sum of the per-dump rows",
         p["n_shots"] == sum(d["n_shots"] for d in dumps)),
        ("every dump has both shot frames and quiet frames (the control is exercised)",
         all(d["n_shot_frames"] > 0 and d["n_quiet_frames"] > 0 for d in dumps)),
        ("the difference profile is positive somewhere INSIDE the gate (method sees pellets)",
         p["peak_in_gate_per_shot"] > 0),
        ("T is the sum of the 3 annuli immediately outside the gate",
         abs(p["T_just_outside"] - sum(p["diff_per_shot"][gb:gb + 3])) < 1e-4),
        ("the profile spans the committed RG_MAX/RG_BIN grid",
         len(p["diff_per_shot"]) == RG_MAX // RG_BIN),
    ]
    ok = all(v for _, v in checks)
    for label, v in checks:
        print(f"  {'PASS' if v else 'FAIL'}  {label}")
    print(f"  T = {p['T_just_outside']}/shot | in-gate peak {p['peak_in_gate_per_shot']} | "
          f"gate/peak {p['gate_over_peak']} | clutter share {p['clutter_share_just_outside']}")
    print("  ⚑ COHERENCE-ONLY: replays no dump. Re-derive with --radius-gate; §35 has the command.")
    print("SELFTEST PASS" if ok else "SELFTEST FAIL")
    return 0 if ok else 1


# ============================================================
# BAND_HI ON THE PRODUCTION PATH, OUT OF SAMPLE -- docs/probe-runs.md §30
#
# §19 measured what the landed `band_hi = 20` (10 at 30 fps) buys on the production path and got
# +0.60 pellets/shot -- but on ONE clip, FIVE shots, and its own §19D says so: the recovered
# pellets are among the five that GENERATED the cap hypothesis, so "the fix recovers them" is close
# to tautological on that footage. The out-of-sample evidence was §14's ceiling and corridor gates,
# which are per-EVENT and label-free -- a different basis from the per-SHOT production gain.
#
# This arm closes that named gap: the same A/B, on the PRODUCTION path, across every shot of every
# schemafix dump -- footage that had no part in generating the hypothesis.
#
# ⚑ WHY NO RE-EXTRACTION IS NEEDED (and this is the reuse-before-derive finding, §30A):
# `--dump-tracks` stores `frame_counts` as `results[i]["opencv"]`, and `--temporal`'s stdout -- the
# thing read-pellets.ts parses and feeds to `debounceShots` -- prints that same `results` list.
# Production runs `--backend opencv` with the others zero-filled, and since the §24 selector fix
# the passenger channels resolve to opencv's real values. So a schemafix dump's `frame_counts` ARE
# the per-frame values production's estimator consumes. Running `debounce_shots` on them IS the
# production path, without ffmpeg, without the VLM, and without re-extracting anything.
#
# ⚑ The CONTROL arm has to be RECOMPUTED (band at the pre-landing bound) while the LANDED arm is
# the dump's own stored `band`. That asymmetry is the arm's own validity check: recomputing at the
# dump's OWN band_hi must reproduce the stored series exactly, or the recomputation is wrong and
# the A/B means nothing.
#
# MEASUREMENT ONLY: never touches band_hi, debounce_shots, read-pellets.ts or any constant.
BAND_PROD_FIXTURE = "scripts/tests/fixtures/pellets/band-production-ab-slice.json"


def _bp_band_series(tracks, cross_positions, pellet_radius, band_lo, band_hi, n):
    """Recompute count-pellets.py's `band` channel at an arbitrary `band_hi`, from a dump's own
    tracks -- mirroring `_frame_pellet_counts`' band branch exactly: NON-RED on that frame, in
    radius, and overall lifetime within [band_lo, band_hi]. NOT gated by pellet_ids.

    ⚑ Uses the PER-FRAME `reds` channel, because the band branch tests `not is_red` per frame --
    on a pre-2026-08-05 dump this would inherit §25's mislabel (§26C measured 13 divergent band
    frames from exactly that, going to 0 once `reds` existed)."""
    band_ids = {t["id"] for t in tracks if band_lo <= t["life"] <= band_hi}
    series = [0] * n
    for t in tracks:
        if t["id"] not in band_ids:
            continue
        reds = t.get("reds")
        for i, f in enumerate(range(t["first"], t["last"] + 1)):
            if f < 0 or f >= n or i >= len(t["xs"]):
                continue
            cp = cross_positions[f]
            if cp is None:
                continue
            if bool(reds[i]) if reds and i < len(reds) else bool(t["is_red"]):
                continue
            if math.hypot(t["xs"][i] - cp[0], t["ys"][i] - cp[1]) <= pellet_radius:
                series[f] += 1
    return series


def _bp_score(name, tracks, cross_positions, frame_counts, params, fps, marker_min=2):
    cp_mod = _count_pellets_module()
    n = len(frame_counts)
    pr = params["pellet_radius"]
    band_lo = cp_mod._band_lo(fps)
    landed_hi = params.get("band_hi") or params["max_pellet_frames"]
    control_hi = params["max_pellet_frames"]   # the pre-landing bound: band_hi defaulted to it

    # VALIDITY CHECK -- recomputing at the dump's OWN band_hi must reproduce its stored series.
    recomputed_landed = _bp_band_series(tracks, cross_positions, pr, band_lo, landed_hi, n)
    recon_mismatch = sum(1 for f in range(n)
                         if recomputed_landed[f] != frame_counts[f].get("band", 0))
    control = _bp_band_series(tracks, cross_positions, pr, band_lo, control_hi, n)

    def run(series):
        fc = [dict(r, band=series[f]) for f, r in enumerate(frame_counts)]
        return cp_mod.debounce_shots(fc, fps, marker_min)

    ctrl_shots, _ = run(control)
    land_shots, _ = run(recomputed_landed)
    assert len(ctrl_shots) == len(land_shots), (
        f"{name}: segmentation moved ({len(ctrl_shots)} -> {len(land_shots)}); band_hi must not "
        "change event grouping -- debounce_shots segments on white+red, which this A/B never touches")

    def avg_total(shots, lo=5, hi=10):
        v = [s["total"] for s in shots if lo <= s["total"] <= hi]
        return (sum(v) / len(v), len(v)) if v else (None, 0)

    deltas = [l["total"] - c["total"] for c, l in zip(ctrl_shots, land_shots)]
    moved = [d for d in deltas if d]
    ca, cv = avg_total(ctrl_shots)
    la, lv = avg_total(land_shots)
    return {
        "dump": name, "fps": fps, "band_lo": band_lo,
        "control_band_hi": control_hi, "landed_band_hi": landed_hi,
        "recon_mismatch_frames": recon_mismatch,
        "n_shots": len(land_shots),
        "n_shots_moved": len(moved),
        "sum_delta_total": sum(deltas),
        # THE headline, per SHOT -- the same basis §19 reported (+0.60 on 5 in-sample shots)
        "delta_per_shot": round(sum(deltas) / len(deltas), 4) if deltas else None,
        "mean_delta_on_moved": round(sum(moved) / len(moved), 4) if moved else None,
        "n_valid_control": cv, "n_valid_landed": lv,
        "avg_total_control": None if ca is None else round(ca, 4),
        "avg_total_landed": None if la is None else round(la, 4),
        "delta_hist": dict(sorted(collections.Counter(deltas).items())),
    }


def _bp_pool(reports):
    tot = lambda k: sum(r[k] for r in reports)  # noqa: E731
    n = tot("n_shots")
    return {
        "n_dumps": len(reports), "n_shots": n,
        "n_shots_moved": tot("n_shots_moved"),
        "sum_delta_total": tot("sum_delta_total"),
        "delta_per_shot": round(tot("sum_delta_total") / n, 4) if n else None,
        "recon_mismatch_frames": tot("recon_mismatch_frames"),
        "n_valid_control": tot("n_valid_control"), "n_valid_landed": tot("n_valid_landed"),
    }


def _bp_expected(reports, pooled):
    return {"pooled": pooled,
            "dumps": [{k: (v if k != "delta_hist" else {str(a): b for a, b in v.items()})
                       for k, v in r.items()} for r in reports]}


def _print_band_production(reports, pooled):
    print("\nBAND_HI ON THE PRODUCTION PATH, OUT OF SAMPLE (docs/probe-runs.md §30)")
    print(f"  {'dump':26s} {'shots':>6s} {'moved':>6s} {'Σδ':>6s} {'δ/shot':>8s} "
          f"{'avgT ctrl':>10s} {'avgT land':>10s} {'reconΔ':>7s}")
    for r in reports:
        print(f"  {r['dump']:26s} {r['n_shots']:6d} {r['n_shots_moved']:6d} "
              f"{r['sum_delta_total']:6d} {r['delta_per_shot']:+8.4f} "
              f"{r['avg_total_control']:10.4f} {r['avg_total_landed']:10.4f} "
              f"{r['recon_mismatch_frames']:7d}")
    print(f"\n  POOLED  {pooled['n_shots']} shots / {pooled['n_dumps']} dumps: "
          f"Σδ {pooled['sum_delta_total']:+d} pellets, **{pooled['delta_per_shot']:+.4f} per shot**")
    print(f"    valid shots {pooled['n_valid_control']} -> {pooled['n_valid_landed']}")
    print(f"    RECONSTRUCTION CONTROL: {pooled['recon_mismatch_frames']} frames where recomputing "
          f"at the dump's OWN band_hi\n      disagrees with its stored `band` (must be 0, else the "
          f"A/B is meaningless)")
    print("\n  ⚑ OUT OF SAMPLE. §19's +0.60/shot was 5 shots on the ONE clip that generated the cap")
    print("    hypothesis (its own §19D calls that near-tautological). These dumps had no part in")
    print("    generating it. ⚑ Different BASIS from §19 too: every shot, not 5 owner-labelled ones,")
    print("    and no owner reference -- this measures what the landing MOVED, not accuracy.")


def _bp_load(path, fps):
    with open(path) as fh:
        d = json.load(fh)
    if not any("reds" in t for t in d["tracks"][:50]):
        raise SystemExit(
            "=" * 78 + "\n!! DUMP PREDATES THE PER-FRAME `reds` SCHEMA -- REFUSING !!\n" + "=" * 78 +
            f"\n  {path}\n  The `band` branch tests `not is_red` PER FRAME, so a pre-2026-08-05 dump\n"
            "  inherits docs/probe-runs.md §25's mislabel on exactly this channel (§26C measured\n"
            "  13 divergent band frames from it). Re-dump at or after 8d500ff9 (§26).\n" + "=" * 78)
    if not any("band" in r for r in d["frame_counts"][:50]):
        raise SystemExit(f"!! {path} carries no `band` in frame_counts (pre-§23 dump) -- REFUSING")
    return (Path(path).resolve().parent.name, d["tracks"], d["cross_positions"],
            d["frame_counts"], d["params"], fps)


def audit_band_production(paths, fps_list, save_fixture=None):
    fpss = fps_list if len(fps_list) == len(paths) else [fps_list[0]] * len(paths)
    reports = [_bp_score(*_bp_load(p, f)) for p, f in zip(paths, fpss)]
    pooled = _bp_pool(reports)
    if save_fixture:
        with open(save_fixture, "w") as fh:
            json.dump({"_source": ("count-pellets.py --dump-tracks tracks.json (post-8d500ff9), "
                                   "full dumps; docs/probe-runs.md §30. Regenerate with "
                                   "analyze-pellet-tracks.py --band-production-ab <tracks.json...> "
                                   "--save-band-production-fixture <path>."),
                       "_expected": _bp_expected(reports, pooled)}, fh, indent=1)
        print(f"wrote band-production fixture -> {save_fixture}")
    _print_band_production(reports, pooled)
    return reports, pooled


def band_production_selftest():
    """Constraint 9 self-validation. ⚑ This arm's fixture pins RESULTS, not a replay slice: the A/B
    needs whole dumps (band_ids is a lifetime property of the FULL track list, so a frame-window
    slice would silently change which tracks are admitted). The scratchpad dumps are gitignored, so
    the selftest asserts the committed numbers are internally coherent and carry the properties the
    §30 conclusion rests on -- and states plainly that it does NOT re-derive them."""
    with open(BAND_PROD_FIXTURE) as fh:
        fx = json.load(fh)
    exp = fx["_expected"]
    p, dumps = exp["pooled"], exp["dumps"]
    checks = [
        ("reconstruction control is 0 on every dump (the A/B's validity precondition)",
         all(d["recon_mismatch_frames"] == 0 for d in dumps) and p["recon_mismatch_frames"] == 0),
        ("pooled totals equal the sum of the per-dump rows",
         p["n_shots"] == sum(d["n_shots"] for d in dumps)
         and p["sum_delta_total"] == sum(d["sum_delta_total"] for d in dumps)),
        ("delta_per_shot is sum_delta_total / n_shots",
         p["n_shots"] and abs(p["delta_per_shot"] - p["sum_delta_total"] / p["n_shots"]) < 5e-4),
        ("every dump's landed band_hi exceeds its control (the landing widened the band)",
         all(d["landed_band_hi"] > d["control_band_hi"] for d in dumps)),
        ("the A/B moved something (non-vacuous)", p["n_shots_moved"] > 0),
        ("every per-dump delta_hist sums to that dump's shot count",
         all(sum(d["delta_hist"].values()) == d["n_shots"] for d in dumps)),
    ]
    ok = all(v for _, v in checks)
    for label, v in checks:
        print(f"  {'PASS' if v else 'FAIL'}  {label}")
    print(f"  pooled: {p['n_shots']} shots, {p['sum_delta_total']:+d} pellets, "
          f"{p['delta_per_shot']:+.4f}/shot")
    print("  ⚑ COHERENCE-ONLY: this replays no dump (they are gitignored). Re-derive with "
          "--band-production-ab\n    over the schemafix dumps; docs/probe-runs.md §30D has the "
          "command.")
    print("SELFTEST PASS" if ok else "SELFTEST FAIL")
    return 0 if ok else 1


# ============================================================
# MARKER SEMANTICS -- docs/handoffs/2026-08-05-marker-semantics-PRECOMMIT.md
#
# §24D: `MARKER_MIN = 2` is met by red UI-BANNER GLYPHS, so the reader raises `core` flags on UI
# artifacts. ⚑ That is NOT a reporting detail -- BOTH debounce implementations compute
# `shot_red = 1 if core_hit else 0` and `total = white + shot_red`, so a FALSE core flag adds
# exactly +1 pellet to that shot. Removing false flags therefore makes the reader COLDER (the
# pre-commit's §2 directional prediction, stated before scoring).
#
# The discriminator (pre-commit §4), over each marker-contributing track's own life:
#   C1 PERSISTENCE -- life >= 2. Always decidable; a single-frame detection carries no
#                     persistence evidence by construction.
#   C2 ATTACHMENT  -- a crosshair-attached marker holds a near-constant CROSSHAIR-RELATIVE offset
#                     while its ABSOLUTE position follows the crosshair; a screen-fixed UI glyph is
#                     the opposite. Needs the crosshair to actually move, so below
#                     MS_TRAVEL_MIN the honest answer is UNDECIDABLE -- reported as its own
#                     category, never folded into either verdict.
#
# ⚑ SUBSTRATE RULE (pre-commit §3): only a dump carrying per-frame `reds` may be scored. On a
# pre-2026-08-05 dump §25 measured a 12.20% mislabel on exactly this channel, so this arm REFUSES
# such a dump rather than returning a plausible wrong answer.
#
# MEASUREMENT ONLY: never touches MARKER_MIN, debounce_shots, read-pellets.ts or any constant.
MARKER_SEMANTICS_FIXTURE = "scripts/tests/fixtures/pellets/marker-semantics-slice.json"
MS_LIFE_MIN = 2        # C1, pre-commit §4
MS_SPREAD_MAX = 6.0    # C2 attached/screen-fixed spread bound (zoomed px)
MS_TRAVEL_MIN = 10.0   # C2 minimum crosshair travel for the test to carry information
# Fragment-likeness proxy (owner 2026-08-05: the hit-marker VFX lasts 14 native frames). Distances
# are CROSSHAIR-RELATIVE so crosshair motion between the two frames cannot fake a match.
MS_FRAGMENT_REL_PX = 15.0
MS_FRAGMENT_FRAMES = 2


def _ms_rel_at(t, cross_positions, f):
    """One track's crosshair-relative (dx, dy) at absolute frame `f`, or None if unavailable."""
    i = f - t["first"]
    if i < 0 or i >= len(t["xs"]) or f < 0 or f >= len(cross_positions):
        return None
    cp = cross_positions[f]
    return None if cp is None else (t["xs"][i] - cp[0], t["ys"][i] - cp[1])


def _ms_spread(pts):
    """Max pairwise distance over a small point list (track lives are <= max_pellet_frames)."""
    return max((math.hypot(a[0] - b[0], a[1] - b[1]) for a in pts for b in pts), default=0.0)


def _ms_classify(tracks, cross_positions, pellet_radius, marker_radius, ceiling=None):
    """Classify every marker-CONTRIBUTING track (red on some frame, within marker_radius of the
    crosshair on that frame, and admitted by the lifetime `ceiling`) by the pre-commit's C1/C2.

    Returns {track_id: {"life", "verdict", "rel_spread", "abs_spread", "cross_travel",
    "marker_frames"}}. `verdict` is one of LIFE1 / ATTACHED / SCREEN_FIXED / MOVING / UNDECIDABLE.
    Uses the PER-FRAME `reds` channel (post-2026-08-05 schema) -- the caller guarantees it.

    ⚑ `ceiling=None` reproduces the SHIPPED reader exactly: admit iff the dump's own `is_pellet`
    (life <= max_pellet_frames). §27 was measured on that default and its committed fixture pins
    it, so the default must never move. A numeric `ceiling` instead admits `life <= ceiling`, which
    is what §31 needs to reach the tracks the shipped ceiling EXCLUDES (docs/probe-runs.md §28C).
    """
    out = {}
    for t in tracks:
        if ceiling is None:
            if not t.get("is_pellet"):
                continue
        elif t["life"] > ceiling:
            continue
        reds = t.get("reds")
        marker_frames, abs_pts, rel_pts, cross_pts = [], [], [], []
        for i, f in enumerate(range(t["first"], t["last"] + 1)):
            # `f < 0` is not merely out of range -- Python would index from the END of
            # cross_positions and silently score against the wrong frame. Guarded explicitly.
            if f < 0 or f >= len(cross_positions) or i >= len(t["xs"]):
                continue
            cp = cross_positions[f]
            if cp is None:
                continue
            x, y = t["xs"][i], t["ys"][i]
            abs_pts.append((x, y))
            rel_pts.append((x - cp[0], y - cp[1]))
            cross_pts.append(tuple(cp))
            is_red = bool(reds[i]) if reds and i < len(reds) else bool(t["is_red"])
            if is_red and math.hypot(x - cp[0], y - cp[1]) < marker_radius:
                marker_frames.append(f)
        if not marker_frames:
            continue
        life = t["life"]
        rel = _ms_spread(rel_pts)
        abs_ = _ms_spread(abs_pts)
        travel = _ms_spread(cross_pts)
        if life < MS_LIFE_MIN:
            verdict = "LIFE1"
        elif travel < MS_TRAVEL_MIN:
            verdict = "UNDECIDABLE"
        elif rel <= MS_SPREAD_MAX:
            verdict = "ATTACHED"
        elif abs_ <= MS_SPREAD_MAX:
            verdict = "SCREEN_FIXED"
        else:
            verdict = "MOVING"
        out[t["id"]] = {"life": life, "verdict": verdict, "rel_spread": round(rel, 2),
                        "abs_spread": round(abs_, 2), "cross_travel": round(travel, 2),
                        "marker_frames": marker_frames}
    return out


# Which verdicts a marker KEEPS under each arm. C1 keeps everything that persists at all; C1+C2
# additionally drops the tracks C2 positively identifies as screen-fixed. ⚑ UNDECIDABLE and MOVING
# are KEPT in both arms -- the rule only ever drops what it can positively rule out, which is what
# makes it biased AGAINST finding artifacts (pre-commit §4).
MS_ARMS = {
    "C1": {"ATTACHED", "SCREEN_FIXED", "MOVING", "UNDECIDABLE"},
    "C1+C2": {"ATTACHED", "MOVING", "UNDECIDABLE"},
}


def _ms_marker_series(classified, n_frames, keep_verdicts):
    """Per-frame marker count counting only tracks whose verdict is in `keep_verdicts`."""
    series = [0] * n_frames
    for _tid, info in classified.items():
        if info["verdict"] not in keep_verdicts:
            continue
        for f in info["marker_frames"]:
            series[f] += 1
    return series


def _ms_score(name, tracks, cross_positions, frame_counts, params, fps, marker_min):
    """Score one dump. The A/B replaces ONLY `marker` in the dump's own stored `frame_counts`, so
    `white`/`red`/`band` are bit-identical between arms and the delta isolates the marker channel
    (and `band`'s presence keeps `debounce_shots` on the same hybrid branch in both arms -- a
    recomputed series that dropped `band` would silently take the PRE-hybrid path and change the
    answer for reasons unrelated to this filter)."""
    cp_mod = _count_pellets_module()
    n = len(frame_counts)
    classified = _ms_classify(tracks, cross_positions, params["pellet_radius"],
                              params.get("marker_radius", 65))
    # CONTROL: the unfiltered recomputation must reproduce the dump's own stored marker exactly.
    # This is docs/probe-runs.md §26's n_divergent == 0 restated per-frame, and it is what makes
    # the filtered arm's delta attributable to the FILTER rather than to the reconstruction.
    unfiltered = _ms_marker_series(classified, n, set(MS_ARMS["C1"]) | {"LIFE1"})
    recon_mismatch = sum(1 for f in range(n) if unfiltered[f] != frame_counts[f].get("marker", 0))

    shipped = [dict(r) for r in frame_counts]
    base_shots, _base_summary = cp_mod.debounce_shots(shipped, fps, marker_min)

    # ⚑ NOT `summary['avgTotal']` -- debounce_shots rounds that to ONE decimal, so differencing two
    # of them yields a 0.1-resolution number that LOOKS precise at 4dp and is not (both arms
    # reported an identical -0.1000 on the first run, which is what surfaced this). Recomputed
    # here at full precision from the shot list, over the same [min_pellets, max_pellets] valid
    # subset the summary uses. The valid SET itself moves as flags drop (a shot at total 11 that
    # drops to 10 ENTERS it), so this is not simply -1/n.
    def avg_total(shots, lo=5, hi=10):
        v = [s["total"] for s in shots if lo <= s["total"] <= hi]
        return (sum(v) / len(v), len(v)) if v else (None, 0)

    base_avg, base_valid = avg_total(base_shots)
    arms = {}
    for arm, keep in MS_ARMS.items():
        series = _ms_marker_series(classified, n, keep)
        filtered = [dict(r, marker=series[f]) for f, r in enumerate(frame_counts)]
        # Segmentation is IDENTICAL between arms by construction -- debounce_shots segments on
        # `white + red`, and this filter only ever rewrites `marker` -- so zipping the two shot
        # lists is index-aligned. Asserted rather than assumed.
        shots, _summary = cp_mod.debounce_shots(filtered, fps, marker_min)
        assert len(shots) == len(base_shots), (
            f"{name}/{arm}: segmentation moved ({len(base_shots)} -> {len(shots)} shots); the "
            "marker filter must never change event grouping")
        base_core = [s for s in base_shots if s["core"]]
        dropped = [(b, s) for b, s in zip(base_shots, shots) if b["core"] and not s["core"]]
        gained = [(b, s) for b, s in zip(base_shots, shots) if not b["core"] and s["core"]]
        after_avg, after_valid = avg_total(shots)
        arms[arm] = {
            "n_shots": len(shots), "n_shots_base": len(base_shots),
            "n_core_base": len(base_core),
            "n_core_after": sum(1 for s in shots if s["core"]),
            "n_core_dropped": len(dropped), "n_core_gained": len(gained),
            "core_drop_rate": (round(len(dropped) / len(base_core), 4) if base_core else None),
            # -1 pellet per dropped flag, straight off total = white + shot_red
            "delta_total_pellets": -len(dropped),
            "n_valid_base": base_valid, "n_valid_after": after_valid,
            "avg_total_base": None if base_avg is None else round(base_avg, 4),
            "avg_total_after": None if after_avg is None else round(after_avg, 4),
            "delta_avg_total": (None if (base_avg is None or after_avg is None)
                                else round(after_avg - base_avg, 4)),
            "marker_mass_base": sum(unfiltered),
            "marker_mass_after": sum(series),
            "marker_mass_removed_pct": (round(1 - sum(series) / sum(unfiltered), 4)
                                        if sum(unfiltered) else None),
        }
    verdicts = collections.Counter(i["verdict"] for i in classified.values())
    # ⚑ THE SHARPEST CHALLENGE TO C1, measured rather than argued: could a GENUINE hit-marker be
    # single-frame? Geometry cannot answer it directly -- a life-1 track has one frame, so its
    # attachment is undefined by construction, which is exactly why C1 fires before C2. What CAN
    # be measured is how long the POSITIVELY-identified crosshair-attached markers live. If those
    # cluster well above 1, a life-1 red blob near the crosshair is far likelier a glyph than a
    # marker. ⚑ SUPPORTING EVIDENCE, NOT PROOF -- settling it outright needs the marker VFX's own
    # duration from footage, or an owner adjudication.
    att_life = collections.Counter(i["life"] for i in classified.values()
                                   if i["verdict"] == "ATTACHED")

    # ⚑ OWNER MEASUREMENT 2026-08-05: the hit-marker VFX lasts 14 NATIVE frames -- ~7 frames at the
    # production 30fps sampling, i.e. exactly `max_pellet_frames`. Two consequences, both measured
    # here rather than argued, and they push in OPPOSITE directions:
    #
    #   (a) CEILING EXCLUSION (a COLD channel this arm otherwise never sees). A red near-crosshair
    #       track whose life exceeds max_pellet_frames is dropped from `pellet_ids` and never
    #       reaches `marker` at all. Since a full marker already spans ~7 sampled frames, a little
    #       detection jitter puts it over. These are MISSED core hits, the opposite sign to the
    #       false-flag channel this arm was built to measure.
    #   (b) FRAGMENT-LIKENESS (which cuts AGAINST C1). If a genuine marker spans ~7 sampled frames
    #       but tracks fragment, a life-1 detection may be a PIECE of a real marker rather than a
    #       UI glyph. Proxy: does a life-1 marker track sit within MS_FRAGMENT_REL_PX (in
    #       CROSSHAIR-RELATIVE coordinates, so crosshair motion cannot fake it) of a life>=2 marker
    #       track within +/- MS_FRAGMENT_FRAMES? ⚑ Suggestive, NOT decisive: "fragment-like" is not
    #       "is a fragment", and a marker that shattered into ALL life-1 pieces has no life>=2
    #       anchor, so this test would call every piece isolated. It is a LOWER bound on
    #       fragmentation.
    tracks_by_id = {t["id"]: t for t in tracks}
    excluded = 0
    for t in tracks:
        if t.get("is_pellet") or t["life"] <= params.get("max_pellet_frames", 7):
            continue
        reds = t.get("reds")
        for i, f in enumerate(range(t["first"], t["last"] + 1)):
            if f < 0 or f >= len(cross_positions) or i >= len(t["xs"]):
                continue
            cp = cross_positions[f]
            if cp is None:
                continue
            is_red = bool(reds[i]) if reds and i < len(reds) else bool(t["is_red"])
            if is_red and math.hypot(t["xs"][i] - cp[0],
                                     t["ys"][i] - cp[1]) < params.get("marker_radius", 65):
                excluded += 1
                break
    by_frame = collections.defaultdict(list)
    for tid, info in classified.items():
        for f in info["marker_frames"]:
            by_frame[f].append((tid, info))
    frag = iso = 0
    for tid, info in classified.items():
        if info["life"] != 1:
            continue
        f = info["marker_frames"][0]
        rel = _ms_rel_at(tracks_by_id[tid], cross_positions, f)
        near = False
        for g in range(f - MS_FRAGMENT_FRAMES, f + MS_FRAGMENT_FRAMES + 1):
            if g == f:
                continue
            for tid2, info2 in by_frame.get(g, []):
                if tid2 == tid or info2["life"] < 2:
                    continue
                r2 = _ms_rel_at(tracks_by_id[tid2], cross_positions, g)
                if rel and r2 and math.hypot(rel[0] - r2[0],
                                             rel[1] - r2[1]) <= MS_FRAGMENT_REL_PX:
                    near = True
                    break
            if near:
                break
        frag += near
        iso += not near
    return {
        "dump": name, "fps": fps, "n_frames": n,
        "n_marker_tracks": len(classified),
        "verdicts": dict(sorted(verdicts.items())),
        "attached_life_hist": dict(sorted(att_life.items())),
        "n_excluded_by_ceiling": excluded,
        "life1_fragment_like": frag, "life1_isolated": iso,
        "recon_mismatch_frames": recon_mismatch,
        "arms": arms,
        "_classified": classified,
    }


def _ms_pool(reports):
    out = {"n_dumps": len(reports),
           "n_marker_tracks": sum(r["n_marker_tracks"] for r in reports),
           "recon_mismatch_frames": sum(r["recon_mismatch_frames"] for r in reports),
           "n_excluded_by_ceiling": sum(r["n_excluded_by_ceiling"] for r in reports),
           "life1_fragment_like": sum(r["life1_fragment_like"] for r in reports),
           "life1_isolated": sum(r["life1_isolated"] for r in reports),
           "verdicts": dict(sorted(collections.Counter(
               {k: sum(r["verdicts"].get(k, 0) for r in reports)
                for k in {k for r in reports for k in r["verdicts"]}}).items())),
           "attached_life_hist": dict(sorted(
               {k: sum(r["attached_life_hist"].get(k, 0) for r in reports)
                for k in {k for r in reports for k in r["attached_life_hist"]}}.items())),
           "arms": {}}
    for arm in MS_ARMS:
        base = sum(r["arms"][arm]["n_core_base"] for r in reports)
        drop = sum(r["arms"][arm]["n_core_dropped"] for r in reports)
        mb = sum(r["arms"][arm]["marker_mass_base"] for r in reports)
        ma = sum(r["arms"][arm]["marker_mass_after"] for r in reports)
        out["arms"][arm] = {
            "n_core_base": base, "n_core_dropped": drop,
            "n_core_gained": sum(r["arms"][arm]["n_core_gained"] for r in reports),
            "core_drop_rate": round(drop / base, 4) if base else None,
            "delta_total_pellets": -drop,
            "n_shots": sum(r["arms"][arm]["n_shots"] for r in reports),
            "marker_mass_removed_pct": round(1 - ma / mb, 4) if mb else None,
        }
    return out


def _ms_band(rate):
    """Pre-commit §6's three bands, committed at e909c94c before any number existed."""
    if rate < 0.05:
        return "< 5%: MINOR channel -- record the measurement and close item 2, no landing"
    if rate <= 0.20:
        return "5-20%: a REAL channel -- worth its own landing with its own blast-radius pass"
    return "> 20%: DOMINANT reporting defect -- landing is the next priority after re-extraction"


def _ms_controls(reports, pooled):
    """Pre-commit §7's three falsification controls. Any firing VOIDS the result."""
    c1 = pooled["arms"]["C1"]
    checks = []
    # CONTROL A -- discrimination, against §15's INDEPENDENT n=1 adjudication.
    a_dump = next((r for r in reports if "marciana" in r["dump"]), None)
    a_ok, a_detail = None, "no marciana dump in this run -- control A NOT EXERCISED"
    if a_dump:
        cls = a_dump["_classified"]
        at_1565 = {tid: i for tid, i in cls.items() if 1565 in i["marker_frames"]}
        kept = {tid for tid, i in at_1565.items() if i["verdict"] in MS_ARMS["C1"]}
        a_ok = len(at_1565) == 3 and kept == {11110}
        a_detail = (f"f1565: {len(at_1565)} contributing tracks "
                    f"{ {t: at_1565[t]['verdict'] for t in sorted(at_1565)} }, kept={sorted(kept)} "
                    f"(§15 adjudication: 3 -> 1, only 11110 survives)")
    checks.append(("CONTROL A -- reproduces §15's f1565 adjudication (3 -> 1)", a_ok, a_detail))
    # CONTROL B -- over-filtering.
    removed = c1["marker_mass_removed_pct"] or 0
    checks.append(("CONTROL B -- removes <= 60% of marker mass", removed <= 0.60,
                   f"removed {removed:.1%} of marker mass (C1 arm)"))
    # CONTROL C -- non-vacuity.
    checks.append(("CONTROL C -- does not drop EVERY core flag",
                   c1["n_core_dropped"] < c1["n_core_base"],
                   f"dropped {c1['n_core_dropped']} of {c1['n_core_base']} core flags"))
    return checks


def _ms_expected(reports, pooled):
    # ⚑ `attached_life_hist` is keyed by INT life. JSON writes those keys as strings and reads
    # them back as strings, so a fixture round-trip would never dict-compare equal to a live
    # replay -- stringify on both sides here, where the comparison actually happens.
    def _lh(d):
        return {str(k): v for k, v in d.items()}
    return {"pooled": {k: v for k, v in pooled.items()
                       if k not in ("verdicts", "attached_life_hist")},
            "verdicts": pooled["verdicts"],
            "attached_life_hist": _lh(pooled["attached_life_hist"]),
            "dumps": [{"dump": r["dump"], "n_marker_tracks": r["n_marker_tracks"],
                       "verdicts": r["verdicts"],
                       "attached_life_hist": _lh(r["attached_life_hist"]),
                       "n_excluded_by_ceiling": r["n_excluded_by_ceiling"],
                       "life1_fragment_like": r["life1_fragment_like"],
                       "life1_isolated": r["life1_isolated"],
                       "recon_mismatch_frames": r["recon_mismatch_frames"],
                       "arms": r["arms"]} for r in reports]}


def _print_marker_semantics(reports, pooled, checks):
    print("\nMARKER SEMANTICS -- are `core` flags raised by UI artifacts? "
          "(docs/handoffs/2026-08-05-marker-semantics-PRECOMMIT.md)")
    print(f"\n  {'dump':26s} {'mkTracks':>9s} {'LIFE1':>6s} {'ATTCH':>6s} {'FIXED':>6s} "
          f"{'MOVNG':>6s} {'UNDEC':>6s} {'reconΔ':>7s}")
    for r in reports:
        v = r["verdicts"]
        print(f"  {r['dump']:26s} {r['n_marker_tracks']:9d} {v.get('LIFE1',0):6d} "
              f"{v.get('ATTACHED',0):6d} {v.get('SCREEN_FIXED',0):6d} {v.get('MOVING',0):6d} "
              f"{v.get('UNDECIDABLE',0):6d} {r['recon_mismatch_frames']:7d}")
    for arm in MS_ARMS:
        print(f"\n  ARM {arm}")
        print(f"    {'dump':26s} {'shots':>6s} {'core0':>6s} {'core1':>6s} {'drop':>5s} "
              f"{'rate':>7s} {'ΔavgTot':>9s} {'valid':>6s}")
        for r in reports:
            a = r["arms"][arm]
            rate = "-" if a["core_drop_rate"] is None else f"{a['core_drop_rate']:.4f}"
            dav = "-" if a["delta_avg_total"] is None else f"{a['delta_avg_total']:+.4f}"
            print(f"    {r['dump']:26s} {a['n_shots']:6d} {a['n_core_base']:6d} "
                  f"{a['n_core_after']:6d} {a['n_core_dropped']:5d} {rate:>7s} "
                  f"{dav:>9s} {a['n_valid_base']:6d}->{a['n_valid_after']:<6d}")
        p = pooled["arms"][arm]
        print(f"    POOLED: {p['n_core_dropped']}/{p['n_core_base']} core flags dropped "
              f"= {p['core_drop_rate']}  |  Δtotal {p['delta_total_pellets']} pellets over "
              f"{p['n_shots']} shots  |  marker mass removed {p['marker_mass_removed_pct']}")
    print(f"\n  ATTACHED-track life histogram (pooled): {pooled['attached_life_hist']}")
    print("    ⚑ supporting evidence for C1's `life >= 2`, not proof — a life-1 track's attachment")
    print("      is undefined by construction, so geometry cannot settle whether a GENUINE marker")
    print("      can be single-frame. That needs the marker VFX duration or an owner adjudication.")
    fl, il = pooled["life1_fragment_like"], pooled["life1_isolated"]
    print(f"\n  ⚑ OWNER 2026-08-05: the marker VFX lasts 14 NATIVE frames (~7 at 30fps sampling,")
    print(f"    i.e. exactly max_pellet_frames) -- two consequences, OPPOSITE in sign:")
    print(f"    (a) CEILING EXCLUSION (COLD): {pooled['n_excluded_by_ceiling']} red near-crosshair "
          f"tracks live LONGER than\n        max_pellet_frames and never reach `marker` at all -- "
          f"MISSED core hits.")
    print(f"    (b) FRAGMENT-LIKENESS (cuts AGAINST C1): of {fl + il} life-1 marker tracks, "
          f"{fl} ({fl / (fl + il):.1%})\n        sit within {MS_FRAGMENT_REL_PX:.0f}px "
          f"crosshair-relative of a life>=2 marker within +/-{MS_FRAGMENT_FRAMES} frames,\n"
          f"        so they may be PIECES of a real marker rather than glyphs. {il} are isolated.\n"
          f"        ⚑ Suggestive, not decisive, and a LOWER bound: a marker shattered into ALL\n"
          f"        life-1 pieces has no life>=2 partner and would score as isolated.")
    print(f"\n  RECONSTRUCTION CONTROL: {pooled['recon_mismatch_frames']} frames where the "
          f"UNFILTERED recomputation disagrees with the dump's own stored `marker` "
          f"(must be 0 -- §26)")
    print(f"\n  PRE-COMMITTED BAND (C1 arm): {_ms_band(pooled['arms']['C1']['core_drop_rate'] or 0)}")
    print("\n  FALSIFICATION CONTROLS (pre-commit §7 -- any firing VOIDS the result):")
    for label, ok, detail in checks:
        state = "NOT EXERCISED" if ok is None else ("PASS" if ok else "*** FIRED -- VOID ***")
        print(f"    {state:22s} {label}\n{' ' * 26}{detail}")


def _ms_load_dump(path, fps):
    with open(path) as fh:
        data = json.load(fh)
    name = Path(path).resolve().parent.name
    if not any("reds" in t for t in data["tracks"][:50]):
        raise SystemExit(
            "=" * 78 + "\n"
            "!! DUMP PREDATES THE PER-FRAME `reds` SCHEMA -- REFUSING !!\n" + "=" * 78 + "\n"
            f"  {path}\n"
            "  carries no per-frame `reds`, so its white/red/marker split cannot be replayed\n"
            "  faithfully -- docs/probe-runs.md §25 measured a 12.20% mislabel on exactly the\n"
            "  marker channel this arm scores. Scoring it would return a plausible WRONG answer.\n"
            "  => Re-dump with count-pellets.py at or after commit 8d500ff9 (docs/probe-runs.md\n"
            "     §26), then score the new dump.\n" + "=" * 78)
    return (name, data["tracks"], data["cross_positions"], data["frame_counts"],
            data["params"], fps)


def _ms_slim(name, tracks, cross_positions, frame_counts, params, fps, report):
    """Commit the frames each marker-contributing track touches, plus those tracks themselves --
    what `_ms_classify` and `debounce_shots` actually consume. `debounce_shots` needs a CONTIGUOUS
    series (it walks events across frames), so the slice keeps a contiguous frame WINDOW around
    the densest marker region rather than a scattered subset."""
    fr = sorted({f for i in report["_classified"].values() for f in i["marker_frames"]})
    if not fr:
        lo, hi = 0, min(400, len(frame_counts) - 1)
    else:
        mid = fr[len(fr) // 2]
        lo, hi = max(0, mid - 400), min(len(frame_counts) - 1, mid + 400)
    # ⚑ Straddling tracks are TRIMMED to the window, not dropped. Dropping them would break the
    # reconstruction control -- the slice's own `frame_counts` come from the dump, so every track
    # contributing a marker inside the window must still be present, or the recomputation would
    # under-count at the edges and the control would fail for a slicing reason rather than a real
    # one. Re-basing without trimming is not an option either: a negative `first` makes Python
    # index cross_positions from the END and score against the wrong frame silently.
    #
    # ⚑ `life` deliberately keeps its ORIGINAL value. C1 asks how long the track really persisted,
    # which is a fact about the track, not about the window we happened to cut.
    keep = []
    for t in tracks:
        if t["last"] < lo or t["first"] > hi:
            continue
        a, b = max(t["first"], lo), min(t["last"], hi)
        o = a - t["first"]                      # offset into the track's own arrays
        k = dict(t, first=a - lo, last=b - lo)
        for arr in ("xs", "ys", "areas", "reds"):
            if arr in t:
                k[arr] = t[arr][o:o + (b - a + 1)]
        keep.append(k)
    return {
        "dump": name, "params": params, "fps": fps, "frame_span": [lo, hi],
        "cross_positions": [cross_positions[f] for f in range(lo, hi + 1)],
        "frame_counts": [frame_counts[f] for f in range(lo, hi + 1)],
        "tracks": keep,
    }


def _ms_expand(d):
    return (d["dump"], d["tracks"], d["cross_positions"], d["frame_counts"], d["params"], d["fps"])


def audit_marker_semantics(paths, fps_list, marker_min=2, save_fixture=None):
    fpss = fps_list if len(fps_list) == len(paths) else [fps_list[0]] * len(paths)
    reports, slims = [], []
    for p, fps in zip(paths, fpss):
        name, tracks, cross, fc, params, fps = _ms_load_dump(p, fps)
        r = _ms_score(name, tracks, cross, fc, params, fps, marker_min)
        reports.append(r)
        if save_fixture:
            slims.append(_ms_slim(name, tracks, cross, fc, params, fps, r))
    pooled = _ms_pool(reports)
    checks = _ms_controls(reports, pooled)
    if save_fixture:
        srs = [_ms_score(*_ms_expand(s), marker_min) for s in slims]
        with open(save_fixture, "w") as fh:
            json.dump({
                "_source": ("count-pellets.py --dump-tracks tracks.json (post-8d500ff9, carrying "
                            "per-frame `reds`), sliced to a contiguous frame window around each "
                            "dump's densest marker region. docs/probe-runs.md §27. Regenerate "
                            "with analyze-pellet-tracks.py --marker-semantics <tracks.json...> "
                            "--save-marker-semantics-fixture <path>."),
                "_expected": _ms_expected(srs, _ms_pool(srs)),
                "dumps": slims,
            }, fh)
        print(f"wrote marker-semantics fixture -> {save_fixture}")
    _print_marker_semantics(reports, pooled, checks)
    return reports, pooled, checks


def marker_semantics_selftest():
    """Constraint 9 self-validation: replay --marker-semantics over the committed slice (no
    scratchpad access) and assert the pinned `_expected` dict AND that the arm DISCRIMINATES --
    the unfiltered recomputation must reproduce each slice's own stored `marker` exactly (0
    mismatched frames), and the classifier must place tracks in more than one verdict class. A
    rule that classified everything identically would score a tidy delta and mean nothing."""
    with open(MARKER_SEMANTICS_FIXTURE) as fh:
        fx = json.load(fh)
    reports = [_ms_score(*_ms_expand(d), 2) for d in fx["dumps"]]
    pooled = _ms_pool(reports)
    got = _ms_expected(reports, pooled)
    ok = got == fx["_expected"]
    if not ok:
        print(f"  DIFF:\n    expected {json.dumps(fx['_expected'])}\n    got      {json.dumps(got)}")
    checks = [
        ("unfiltered recomputation reproduces stored `marker` exactly (§26 substrate holds)",
         pooled["recon_mismatch_frames"] == 0),
        ("classifier is DISCRIMINATING (>1 verdict class populated)",
         sum(1 for v in pooled["verdicts"].values() if v) > 1),
    ]
    all_ok = ok and all(v for _, v in checks)
    for label, v in checks:
        print(f"  {'PASS' if v else 'FAIL'}  {label}")
    _print_marker_semantics(reports, pooled, _ms_controls(reports, pooled))
    print("  ⚑ SLICE numbers, not population numbers -- the committed window is a contiguous\n"
          "    excerpt around each dump's densest marker region. docs/probe-runs.md §27 carries\n"
          "    the population figures; this pins the classifier and the A/B machinery.")
    print("SELFTEST PASS" if all_ok else "SELFTEST FAIL")
    return 0 if all_ok else 1


# ============================================================
# NETTING THE TWO MARKER CHANNELS -- docs/probe-runs.md §31
#
# §27 and §28C found channels of OPPOSITE SIGN in the same `marker` series, and neither was ever
# netted against the other:
#
#   WARM (§27) -- `core` flags raised by tracks that fail C1 persistence. A `core` flag adds +1 to
#       that shot's total, so removing false ones makes the reader COLDER. Measured: 39 of 180
#       flags, -0.048 pellets/shot.
#   COLD (§28C) -- red near-crosshair tracks whose life EXCEEDS `max_pellet_frames` never enter
#       `pellet_ids`, so they never reach `marker` at all. If they are genuine markers those are
#       MISSED core hits, and recovering them makes the reader WARMER. Measured: 164 tracks, life
#       histogram peaking at 8-10, just over the cutoff of 7.
#
# ⚑ THE CEILING VALUE IS NOT INVENTED HERE. The owner measured (2026-08-05) that the hit-marker VFX
# and the pellet VFX have the SAME duration -- 14 native frames. `band_hi` is the already-landed,
# already-gated ceiling for a 14-frame VFX's lifetime band (§14's out-of-sample ceiling + corridor
# gates, landed §16) -- 10 at 30 fps against a nominal 7. Reusing it for the marker channel applies
# a validated bound to a same-duration VFX rather than fitting a new one. The unbounded arm is
# reported alongside as the strict upper bound.
#
# ⚑ PRE-DECLARED, before scoring: the cold channel will add FAR fewer core flags than its 164-track
# count, because MARKER_MIN = 2 needs two admitted tracks CONCURRENT in one event. The NET SIGN is
# NOT predictable in advance and is the point of the measurement.
#
# MEASUREMENT ONLY: never touches MARKER_MIN, debounce_shots, max_pellet_frames or any constant.
MARKER_NET_FIXTURE = "scripts/tests/fixtures/pellets/marker-net-slice.json"
MN_UNBOUNDED = 10 ** 9


def _mn_configs(params):
    """The four scored configurations plus the upper bound. `ceiling=None` means the SHIPPED
    `is_pellet` gate; `keep=None` means no C1 filter."""
    band_hi = params.get("band_hi") or params["max_pellet_frames"]
    return [
        ("shipped", None, None),
        ("warm_removed_C1", None, MS_ARMS["C1"]),
        (f"cold_recovered_band_hi_{band_hi}", band_hi, None),
        (f"net_both_band_hi_{band_hi}", band_hi, MS_ARMS["C1"]),
        ("cold_recovered_unbounded", MN_UNBOUNDED, None),
        ("net_both_unbounded", MN_UNBOUNDED, MS_ARMS["C1"]),
    ]


def _mn_score(name, tracks, cross_positions, frame_counts, params, fps, marker_min=2):
    cp_mod = _count_pellets_module()
    n = len(frame_counts)
    pr, mr = params["pellet_radius"], params.get("marker_radius", 65)

    def series_for(ceiling, keep):
        cls = _ms_classify(tracks, cross_positions, pr, mr, ceiling)
        verdicts = keep if keep is not None else {"LIFE1", "ATTACHED", "SCREEN_FIXED", "MOVING",
                                                  "UNDECIDABLE"}
        return _ms_marker_series(cls, n, verdicts), cls

    def run(series):
        return cp_mod.debounce_shots([dict(r, marker=series[f]) for f, r in enumerate(frame_counts)],
                                     fps, marker_min)

    base_series, _ = series_for(None, None)
    # VALIDITY CONTROL: the shipped configuration must reproduce the dump's own stored `marker`.
    recon_mismatch = sum(1 for f in range(n) if base_series[f] != frame_counts[f].get("marker", 0))
    base_shots, _ = run(base_series)
    base_core = sum(1 for s in base_shots if s["core"])

    arms = {}
    for label, ceiling, keep in _mn_configs(params):
        series, cls = series_for(ceiling, keep)
        shots, _ = run(series)
        assert len(shots) == len(base_shots), (
            f"{name}/{label}: segmentation moved; the marker channel must never change grouping")
        core = sum(1 for s in shots if s["core"])
        d_total = sum(s["total"] - b["total"] for b, s in zip(base_shots, shots))
        arms[label] = {
            "n_marker_tracks": len(cls),
            "n_core": core, "delta_core": core - base_core,
            "delta_total_pellets": d_total,
            "delta_per_shot": round(d_total / len(shots), 4) if shots else None,
        }
    return {"dump": name, "n_shots": len(base_shots), "n_core_shipped": base_core,
            "recon_mismatch_frames": recon_mismatch, "arms": arms}


def _mn_pool(reports):
    labels = list(reports[0]["arms"]) if reports else []
    n = sum(r["n_shots"] for r in reports)
    out = {"n_dumps": len(reports), "n_shots": n,
           "n_core_shipped": sum(r["n_core_shipped"] for r in reports),
           "recon_mismatch_frames": sum(r["recon_mismatch_frames"] for r in reports),
           "arms": {}}
    for lb in labels:
        dt = sum(r["arms"][lb]["delta_total_pellets"] for r in reports)
        out["arms"][lb] = {
            "n_core": sum(r["arms"][lb]["n_core"] for r in reports),
            "delta_core": sum(r["arms"][lb]["delta_core"] for r in reports),
            "delta_total_pellets": dt,
            "delta_per_shot": round(dt / n, 4) if n else None,
        }
    return out


def _mn_expected(reports, pooled):
    return {"pooled": pooled,
            "dumps": [{"dump": r["dump"], "n_shots": r["n_shots"],
                       "n_core_shipped": r["n_core_shipped"],
                       "recon_mismatch_frames": r["recon_mismatch_frames"],
                       "arms": r["arms"]} for r in reports]}


def _print_marker_net(reports, pooled):
    print("\nNETTING THE TWO MARKER CHANNELS (docs/probe-runs.md §31)")
    print("  WARM = §27's false core flags (removing them COOLS the reader)")
    print("  COLD = §28C's ceiling-excluded markers (recovering them WARMS it)")
    print(f"\n  {'configuration':32s} {'core':>6s} {'Δcore':>6s} {'Δpellets':>9s} {'Δ/shot':>9s}")
    for lb, a in pooled["arms"].items():
        star = "  <<< THE NET" if lb.startswith("net_both_band_hi") else ""
        print(f"  {lb:32s} {a['n_core']:6d} {a['delta_core']:+6d} "
              f"{a['delta_total_pellets']:+9d} {a['delta_per_shot']:+9.4f}{star}")
    print(f"\n  over {pooled['n_shots']} shots / {pooled['n_dumps']} dumps; shipped core flags "
          f"= {pooled['n_core_shipped']}")
    print(f"  RECONSTRUCTION CONTROL: {pooled['recon_mismatch_frames']} frames where the SHIPPED "
          f"configuration\n    disagrees with the dump's own stored `marker` (must be 0)")


def audit_marker_net(paths, fps_list, save_fixture=None):
    fpss = fps_list if len(fps_list) == len(paths) else [fps_list[0]] * len(paths)
    reports = []
    for p, fps in zip(paths, fpss):
        name, tracks, cross, fc, params, fps = _ms_load_dump(p, fps)
        reports.append(_mn_score(name, tracks, cross, fc, params, fps))
    pooled = _mn_pool(reports)
    if save_fixture:
        with open(save_fixture, "w") as fh:
            json.dump({"_source": ("count-pellets.py --dump-tracks tracks.json (post-8d500ff9), "
                                   "FULL dumps; docs/probe-runs.md §31. Regenerate with "
                                   "analyze-pellet-tracks.py --marker-net <tracks.json...> "
                                   "--save-marker-net-fixture <path>."),
                       "_expected": _mn_expected(reports, pooled)}, fh, indent=1)
        print(f"wrote marker-net fixture -> {save_fixture}")
    _print_marker_net(reports, pooled)
    return reports, pooled


def marker_net_selftest():
    """Constraint 9 self-validation. ⚑ Like `--band-production-ab`, this pins RESULTS rather than a
    replay slice: the lifetime ceiling is a property of the FULL track list, so a frame-window
    slice would silently change which tracks are admitted. It asserts the committed numbers are
    internally coherent and carry the properties §31's conclusion rests on -- and PRINTS that it
    does not re-derive them."""
    with open(MARKER_NET_FIXTURE) as fh:
        fx = json.load(fh)
    exp = fx["_expected"]
    p, dumps = exp["pooled"], exp["dumps"]
    warm = p["arms"]["warm_removed_C1"]
    cold = next(v for k, v in p["arms"].items() if k.startswith("cold_recovered_band_hi"))
    net = next(v for k, v in p["arms"].items() if k.startswith("net_both_band_hi"))
    unb = next(v for k, v in p["arms"].items() if k.startswith("cold_recovered_unbounded"))
    checks = [
        ("reconstruction control is 0 on every dump (validity precondition)",
         p["recon_mismatch_frames"] == 0
         and all(d["recon_mismatch_frames"] == 0 for d in dumps)),
        ("the shipped arm is the zero point (delta_core == 0, delta_total == 0)",
         p["arms"]["shipped"]["delta_core"] == 0
         and p["arms"]["shipped"]["delta_total_pellets"] == 0),
        ("WARM removal is COLD-signed (drops core flags, delta <= 0)",
         warm["delta_core"] <= 0 and warm["delta_total_pellets"] <= 0),
        ("COLD recovery is WARM-signed (adds core flags, delta >= 0)",
         cold["delta_core"] >= 0 and cold["delta_total_pellets"] >= 0),
        ("the two channels have OPPOSITE sign -- the premise §31 exists to test",
         warm["delta_total_pellets"] * cold["delta_total_pellets"] <= 0
         and (warm["delta_total_pellets"] or cold["delta_total_pellets"])),
        ("the unbounded ceiling recovers at least as much as band_hi (it is the upper bound)",
         unb["delta_core"] >= cold["delta_core"]),
        ("the NET equals neither channel alone (it is genuinely a combination)",
         net["delta_total_pellets"] != warm["delta_total_pellets"]
         or net["delta_total_pellets"] != cold["delta_total_pellets"]),
        ("pooled shot count equals the sum of the per-dump rows",
         p["n_shots"] == sum(d["n_shots"] for d in dumps)),
    ]
    ok = all(v for _, v in checks)
    for label, v in checks:
        print(f"  {'PASS' if v else 'FAIL'}  {label}")
    print(f"  WARM {warm['delta_per_shot']:+.4f}/shot | COLD {cold['delta_per_shot']:+.4f}/shot "
          f"| NET {net['delta_per_shot']:+.4f}/shot over {p['n_shots']} shots")
    print("  ⚑ COHERENCE-ONLY: replays no dump (they are gitignored). Re-derive with --marker-net; "
          "\n    docs/probe-runs.md §31D has the command.")
    print("SELFTEST PASS" if ok else "SELFTEST FAIL")
    return 0 if ok else 1


# ============================================================
# MISLOCK RATE -- docs/handoffs/2026-08-04-mislock-rate-PRECOMMIT.md
#
# What fraction of PRODUCTION shots have a mislocked crosshair? The detector is
# structural-vs-template DISAGREEMENT at each shot's counting frames t0+8..t0+11 (t0 =
# debounce_shots' own event `start` -- its docstring: "a consumer with no owner shot times can
# index counting frames off the SAME event grouping the shipped estimator uses instead of
# re-deriving onsets from a private copy"). Per the pre-commit's §3, a shot is MISLOCKED iff its
# median displacement over those 4 frames exceeds the dump's OWN `params.pellet_radius` (160 for
# every dump this arm has seen). Per §4.1, a dump whose template arm locks < 90% of counting
# frames is EXCLUDED -- disagreement is meaningless when one side is absent.
#
# READ-ONLY BY CONSTRUCTION: this never touches read-pellets.ts, count-pellets.py's
# debounce_shots/MARKER_MIN, or any constant/guard/threshold. It reports a RATE; it does not
# retune the localizer or stamp a verdict on the cold bias (pre-commit §5).
MISLOCK_RATE_FIXTURE = "scripts/tests/fixtures/pellets/mislock-rate-slice.json"
MISLOCK_COUNTING_OFFSETS = (8, 9, 10, 11)  # pre-commit §1/§3
MISLOCK_LOCK_GATE = 0.90                   # pre-commit §4.1


def _mlr_score(name, shots, n, struct_cross, tmpl_cross, pellet_radius, fps,
               offsets=MISLOCK_COUNTING_OFFSETS):
    """Score one dump's ALREADY-SEGMENTED `shots` (count-pellets.py debounce_shots' own event
    list -- every event, not just the [min_pellets,max_pellets]-valid subset, matching how this
    dump's own `totalShots` is reported elsewhere, e.g. docs/probe-runs.md's 218/203/180/214)
    against structural-vs-template crosshair disagreement. `struct_cross`/`tmpl_cross` need only
    support `[frame_index]` -- a live run passes the dumps' own `cross_positions` lists, the
    selftest passes a sparse dict slice of just the frames actually used, both work identically."""
    shot_reports = []
    total_counting = 0
    locked_counting = 0
    for s in shots:
        t0 = s["start"]
        frames = [t0 + o for o in offsets if 0 <= t0 + o < n]
        disps = []
        n_locked = 0
        per_frame = []
        for f in frames:
            sc = struct_cross[f]
            tc = tmpl_cross[f]
            if tc is not None:
                n_locked += 1
            d = None
            if sc is not None and tc is not None:
                d = math.hypot(sc[0] - tc[0], sc[1] - tc[1])
                disps.append(d)
            per_frame.append({"frame": f, "struct": sc, "tmpl": tc,
                              "disp": round(d, 2) if d is not None else None})
        total_counting += len(frames)
        locked_counting += n_locked
        median_disp = round(st.median(disps), 2) if disps else None
        shot_reports.append({
            "shot_frame": s["frame"], "t0": t0, "n_counting_frames": len(frames),
            "n_locked": n_locked, "n_both": len(disps), "median_disp": median_disp,
            # §4.3: disagreement never identifies WHICH arm is wrong, only THAT they disagree --
            # this key names the CONDITION, never attributes fault to "structural".
            "mislocked": median_disp is not None and median_disp > pellet_radius,
            "frames": per_frame,
        })
    lock_rate = round(locked_counting / total_counting, 4) if total_counting else None
    scored = [s for s in shot_reports if s["median_disp"] is not None]
    mislocked = [s for s in scored if s["mislocked"]]
    disps_pooled = [s["median_disp"] for s in scored]
    return {
        "dump": name, "pellet_radius": pellet_radius, "fps": fps, "n_frames": n,
        "n_shots": len(shot_reports),
        "n_counting_frames": total_counting, "n_locked_counting_frames": locked_counting,
        "template_lock_rate": lock_rate,
        "excluded": lock_rate is None or lock_rate < MISLOCK_LOCK_GATE,
        "n_shots_scored": len(scored), "n_shots_no_overlap": len(shot_reports) - len(scored),
        "n_mislocked": len(mislocked),
        "mislock_rate": round(len(mislocked) / len(scored), 4) if scored else None,
        "displacement_median": round(st.median(disps_pooled), 2) if disps_pooled else None,
        "displacement_p90": round(_pct(disps_pooled, 90), 2) if disps_pooled else None,
        "displacement_max": round(max(disps_pooled), 2) if disps_pooled else None,
        "shots": shot_reports,
    }


def _mlr_band(rate):
    """Pre-commit §3's three bands, pre-committed before any production number existed."""
    if rate < 0.02:
        return "< 2%: mislocks are RARE -- the shot-4 case is unrepresentative, item 3 closes as minor"
    if rate <= 0.10:
        return "2-10%: RECORD the rate -- a real channel, comparable to the lifetime cap's, worth its own pass"
    return "> 10%: mislocks are the DOMINANT undercount channel and outrank every other open item"


def _mlr_pool(reports):
    """Pool across dumps that PASS the §4.1 gate only -- an excluded dump contributes nothing (its
    disagreement is meaningless with one arm absent, not zero)."""
    included = [r for r in reports if not r["excluded"]]
    scored = [s for r in included for s in r["shots"] if s["median_disp"] is not None]
    mislocked = [s for s in scored if s["mislocked"]]
    disps = [s["median_disp"] for s in scored]
    rate = len(mislocked) / len(scored) if scored else None
    return {
        "n_dumps_included": len(included), "n_dumps_excluded": len(reports) - len(included),
        "excluded_dumps": [r["dump"] for r in reports if r["excluded"]],
        "n_shots_scored": len(scored), "n_mislocked": len(mislocked),
        "mislock_rate": round(rate, 4) if rate is not None else None,
        "displacement_median": round(st.median(disps), 2) if disps else None,
        "displacement_p90": round(_pct(disps, 90), 2) if disps else None,
        "displacement_max": round(max(disps), 2) if disps else None,
        "band": _mlr_band(rate) if rate is not None else None,
    }


def _print_mislock_rate(reports, pooled):
    print("\nMISLOCK RATE -- docs/handoffs/2026-08-04-mislock-rate-PRECOMMIT.md")
    for r in reports:
        tag = "EXCLUDED (template lock < 90%, pre-commit §4.1)" if r["excluded"] else "included"
        print(f"\n{r['dump']}  [{tag}]")
        print(f"  frames={r['n_frames']} shots={r['n_shots']} pellet_radius={r['pellet_radius']} "
             f"fps={r['fps']}")
        lr = f"{r['template_lock_rate'] * 100:.1f}%" if r["template_lock_rate"] is not None else "n/a"
        print(f"  counting frames: {r['n_locked_counting_frames']}/{r['n_counting_frames']} "
             f"template-locked ({lr})")
        if not r["excluded"]:
            print(f"  scored shots={r['n_shots_scored']} (no-overlap={r['n_shots_no_overlap']})  "
                 f"mislocked={r['n_mislocked']}  rate={r['mislock_rate']}")
            print(f"  displacement median={r['displacement_median']} p90={r['displacement_p90']} "
                 f"max={r['displacement_max']}")
    excl = f": {', '.join(pooled['excluded_dumps'])}" if pooled["excluded_dumps"] else ""
    print(f"\nPOOLED ({pooled['n_dumps_included']} dumps included, "
         f"{pooled['n_dumps_excluded']} excluded{excl})")
    print(f"  n shots scored={pooled['n_shots_scored']}  mislocked={pooled['n_mislocked']}  "
         f"rate={pooled['mislock_rate']}")
    print(f"  displacement median={pooled['displacement_median']} p90={pooled['displacement_p90']} "
         f"max={pooled['displacement_max']}")
    print(f"  band: {pooled['band']}")


def _mlr_needed_frames(shots, n, offsets=MISLOCK_COUNTING_OFFSETS):
    need = set()
    for s in shots:
        t0 = s["start"]
        for o in offsets:
            f = t0 + o
            if 0 <= f < n:
                need.add(f)
    return need


def _mlr_slim(name, shots, n, struct_cross, tmpl_cross, pellet_radius, fps):
    """Reduce a full (structural, template) dump pair to exactly what --mislock-rate-selftest
    needs to reproduce the score: debounce_shots' own event list (just `frame`/`start` -- the
    other keys `_mlr_score` never reads), and both arms' crosshair positions ONLY at the frames
    some shot's counting window actually touches. Mirrors `_mg_slim`'s precedent."""
    need = sorted(_mlr_needed_frames(shots, n))
    return {
        "name": name, "n": n, "pellet_radius": pellet_radius, "fps": fps,
        "shots": [{"frame": s["frame"], "start": s["start"]} for s in shots],
        "struct_cross": {str(f): struct_cross[f] for f in need},
        "tmpl_cross": {str(f): tmpl_cross[f] for f in need},
    }


def _mlr_expand(d):
    """Compact fixture slice -> the (name, shots, n, struct_cross, tmpl_cross, pellet_radius, fps)
    tuple `_mlr_score` reads. The cross dicts are keyed by exactly the frames `_mlr_score` will
    ever index for this `shots`/`n` (see `_mlr_needed_frames`), so plain dict `[frame]` indexing
    works identically to the live list-indexed `cross_positions` it stands in for."""
    struct_cross = {int(k): v for k, v in d["struct_cross"].items()}
    tmpl_cross = {int(k): v for k, v in d["tmpl_cross"].items()}
    return (d["name"], d["shots"], d["n"], struct_cross, tmpl_cross, d["pellet_radius"], d["fps"])


def _mlr_strip(report):
    """Drop the per-frame `frames` detail (struct/tmpl xy + disp per counting frame) from a shot
    report -- decisive for a human reading the printed table, not for the pinned `_expected` dict,
    which only needs to catch a regression in the SCORE, not in every intermediate coordinate."""
    out = dict(report)
    out["shots"] = [{k: v for k, v in s.items() if k != "frames"} for s in report["shots"]]
    return out


def _mlr_expected(reports, pooled):
    return {"dumps": [_mlr_strip(r) for r in reports], "pooled": pooled}


def audit_mislock_rate(struct_paths, tmpl_paths, fps_list, save_fixture=None):
    if len(struct_paths) != len(tmpl_paths):
        raise SystemExit(f"--mislock-rate: {len(struct_paths)} structural path(s) vs "
                         f"{len(tmpl_paths)} --mislock-rate-template path(s) -- must pair 1:1, "
                         "same order")
    if len(fps_list) not in (1, len(struct_paths)):
        raise SystemExit("--mislock-rate-fps takes 1 value or one per dump "
                         f"({len(struct_paths)} given), got {len(fps_list)}")
    cp = _count_pellets_module()
    reports, slims = [], []
    for i, (sp, tp) in enumerate(zip(struct_paths, tmpl_paths)):
        fps = fps_list[0] if len(fps_list) == 1 else fps_list[i]
        with open(sp) as fh:
            sd = json.load(fh)
        with open(tp) as fh:
            td = json.load(fh)
        struct_cross, tmpl_cross = sd["cross_positions"], td["cross_positions"]
        frame_counts = sd["frame_counts"]
        n = len(frame_counts)
        if len(struct_cross) != n or len(tmpl_cross) != n:
            raise SystemExit(f"--mislock-rate: {sp} ({len(struct_cross)} frames) vs {tp} "
                             f"({len(tmpl_cross)} frames) vs its own frame_counts ({n}) -- length "
                             "mismatch. Wrong template, a partial run, or a mismatched frame "
                             "source; refusing to score misaligned frame indices.")
        pellet_radius = sd["params"]["pellet_radius"]
        shots, _summary = cp.debounce_shots(frame_counts, fps)
        name = Path(sp).resolve().parent.name
        rep = _mlr_score(name, shots, n, struct_cross, tmpl_cross, pellet_radius, fps)
        reports.append(rep)
        if save_fixture:
            slims.append(_mlr_slim(name, shots, n, struct_cross, tmpl_cross, pellet_radius, fps))
    pooled = _mlr_pool(reports)
    if save_fixture:
        with open(save_fixture, "w") as fh:
            json.dump({
                "_source": ("count-pellets.py --dump-tracks structural + template pairs (see "
                           "docs/handoffs/2026-08-04-mislock-rate-PRECOMMIT.md), sliced to just "
                           "the counting-frame crosshair positions --mislock-rate consumes."),
                "_note": ("A SLICE per dump, not the full dumps: `shots` is debounce_shots' own "
                         "event list reduced to `frame`/`start`, and `struct_cross`/`tmpl_cross` "
                         "cover only the frames inside some shot's t0+{8,9,10,11} window (t0 = "
                         "the shot's own `start`). Regenerate with analyze-pellet-tracks.py "
                         "--mislock-rate <structural.json...> --mislock-rate-template "
                         "<template.json...> [--mislock-rate-fps <fps...>] "
                         "--save-mislock-rate-fixture <path>."),
                "dumps": slims,
                "_expected": _mlr_expected(reports, pooled),
            }, fh, indent=2)
        print(f"wrote mislock-rate fixture -> {save_fixture}")
    _print_mislock_rate(reports, pooled)
    return reports, pooled


def mislock_rate_selftest():
    """Constraint 9 self-validation: replay --mislock-rate over the committed slice (no scratchpad
    access) and assert both the pinned `_expected` dict AND the pre-commit §2 calibration's
    decisive claim explicitly, so a fixture edit that moved either cannot hide behind a coarse
    dict-equality pass -- the one KNOWN structural mislock (shot t0=1289, `marciana` SG/Iron
    groundtruth clip: structural locked onto a floating damage-number stack across its whole
    f8-11 window) must classify MISLOCKED, and every other KNOWN-good shot in the fixture must
    classify NOT mislocked. This is the detector DISCRIMINATING, not merely running."""
    with open(MISLOCK_RATE_FIXTURE) as fh:
        fx = json.load(fh)
    reports = []
    for d in fx["dumps"]:
        name, shots, n, struct_cross, tmpl_cross, pellet_radius, fps = _mlr_expand(d)
        reports.append(_mlr_score(name, shots, n, struct_cross, tmpl_cross, pellet_radius, fps))
    pooled = _mlr_pool(reports)
    got = _mlr_expected(reports, pooled)
    ok = got == fx["_expected"]
    if not ok:
        print(f"  DIFF:\n    expected {json.dumps(fx['_expected'])}\n    got      {json.dumps(got)}")

    checks = []
    if reports:
        by_t0 = {s["t0"]: s for s in reports[0]["shots"]}
        checks.append(("shot t0=1289 (known structural mislock) classified MISLOCKED",
                       by_t0.get(1289, {}).get("mislocked") is True))
        for t0 in (1056, 1096, 1136, 1369):
            checks.append((f"shot t0={t0} (known-good) classified NOT mislocked",
                           by_t0.get(t0, {}).get("mislocked") is False))
    all_ok = ok and all(v for _, v in checks)
    for label, v in checks:
        print(f"  {'PASS' if v else 'FAIL'}  {label}")
    _print_mislock_rate(reports, pooled)
    print("SELFTEST PASS" if all_ok else "SELFTEST FAIL")
    return 0 if all_ok else 1


# ============================================================
# LOCK ADJUDICATION -- docs/handoffs/2026-08-04-mislock-cost-PRECOMMIT.md's own §21C conclusion:
# "measuring what a mislock costs requires ground truth on mislocked PRODUCTION shots." §21 (the
# swapped-window Δcount A/B) is VOID and stays void -- this does not retry it. It generates the
# ground-truth ASK instead: one BLINDED PNG per sampled shot, showing BOTH candidate crosshair
# positions (structural, template) marked A/B with the letter assignment randomized+seeded and the
# case order shuffled+seeded, so nothing in the image, filename, or index reveals which lock is
# which or whether the shot is mislocked. The owner answers one question per image -- "which
# position, A or B, is the actual crosshair?" -- landing the ground truth §21C said was missing.
#
# READ-ONLY BY CONSTRUCTION: reuses §20's OWN detector (`_mlr_score`) for classification -- never
# redefines "mislocked" -- and each arm's own shipped `debounce_shots` output for the answer key's
# "total" figures (an independent re-segmentation per arm, NOT the swapped-window Δcount §21 tried
# and voided). Never touches read-pellets.ts, count-pellets.py's debounce_shots/thresholds, or any
# constant/guard/default. It generates an ADJUDICATION ASK; it does not itself adjudicate, score,
# or draw any cost/severity conclusion.
# ============================================================
LOCK_ADJUDICATION_FIXTURE = "scripts/tests/fixtures/pellets/lock-adjudication-slice.json"
LOCK_ADJUDICATION_SEED = 20260804           # fixed + recorded -- the whole 24-case set regenerates
                                             # byte-identical from this seed alone
LOCK_ADJUDICATION_OFFSET = 9                # t0+9, a counting frame (pre-commit §1/§3: t0+8..t0+11)
LOCK_ADJUDICATION_N_MISLOCKED = 20
LOCK_ADJUDICATION_N_CONTROL = 4
LOCK_ADJUDICATION_MATCH_TOL = 15            # frames -- nearest-start tolerance for the template
                                             # arm's OWN independent shot segmentation when reporting
                                             # its "total" in the answer key (informational only)
LOCK_ADJUDICATION_CONTEXT_WIDTH = 1200      # px, downscaled context-panel target width
LOCK_ADJUDICATION_CROP_HALF = 150           # -> 300x300 source-px crop (the ask's own number)
LOCK_ADJUDICATION_CROP_SCALE = 2            # nearest-neighbour upscale factor
LOCK_ADJUDICATION_RING_RADIUS = 22          # px, upscaled-crop space -- clear of crop centre
LOCK_ADJUDICATION_RING_RADIUS_CTX = 10      # px, in the DOWNSCALED context panel
# Fill for out-of-frame area in an edge-adjacent crop (§22F). Flat mid-grey: no game frame produces
# a uniform patch of it, so it reads as "outside the capture", not as dark game content.
LOCK_ADJUDICATION_PAD_BGR = (128, 128, 128)
LOCK_ADJUDICATION_LABEL_H = 44              # px, per-crop label strip height (upscaled space)
LOCK_ADJUDICATION_FIXTURE_KEEP_MIS = 8      # per dump, real candidates kept in the committed slice
LOCK_ADJUDICATION_FIXTURE_KEEP_CTL = 3      # -- more than the 5/1 --lock-adjudication draws, so the
                                             # selftest exercises a REAL subset-of-a-pool sample, not
                                             # "the whole pool, in order"


def _la_match_tmpl_total(t0, tmpl_starts, tmpl_by_start, tol=LOCK_ADJUDICATION_MATCH_TOL):
    """The template arm's OWN independent shot -- its own onset detection over its own
    `frame_counts`, its own `total` -- nearest to the structural shot's `t0`. Reported for context
    only (the answer key's `total_tmpl`); a miss (no template event within `tol` frames) is
    reported as `None`, never guessed. This is NOT §21's swapped-window Δcount (which held the
    structural TRACKS fixed and varied only the window) -- it is each arm's own already-shipped,
    already-computed count, matched by nearest onset."""
    if not tmpl_starts:
        return None, None
    best = min(tmpl_starts, key=lambda x: abs(x - t0))
    if abs(best - t0) > tol:
        return None, None
    return tmpl_by_start[best]["total"], best


def _la_candidates(name, sd, td, fps):
    """Every shot in one dump `_mlr_score` can classify (has a `median_disp`, i.e. both arms locked
    on at least one of the t0+8..t0+11 counting frames), reduced to exactly what lock-adjudication
    needs: `mislocked` (§20's own classification, never redefined here), the two candidate
    positions AT t0+9 (a counting frame), and each arm's own shipped `total`. A candidate is
    dropped only when the t0+9 frame itself has no position from one or both arms -- it can still
    be `mislocked` by the OTHER 3 counting frames' median, but this tool needs a markable position
    at the specific frame it renders."""
    cp = _count_pellets_module()
    pellet_radius = sd["params"]["pellet_radius"]
    frame_counts = sd["frame_counts"]
    n = len(frame_counts)
    if (len(td["frame_counts"]) != n or len(sd["cross_positions"]) != n
            or len(td["cross_positions"]) != n):
        raise SystemExit(f"--lock-adjudication: {name}: structural/template frame_counts/"
                         "cross_positions length mismatch -- refusing to score misaligned frame "
                         "indices.")
    struct_shots, _ = cp.debounce_shots(frame_counts, fps)
    tmpl_shots, _ = cp.debounce_shots(td["frame_counts"], fps)
    struct_by_start = {s["start"]: s for s in struct_shots}
    tmpl_by_start = {s["start"]: s for s in tmpl_shots}
    tmpl_starts = sorted(tmpl_by_start)
    mlr = _mlr_score(name, struct_shots, n, sd["cross_positions"], td["cross_positions"],
                     pellet_radius, fps)
    out = []
    for s in mlr["shots"]:
        if s["median_disp"] is None:
            continue
        t0 = s["t0"]
        f9 = t0 + LOCK_ADJUDICATION_OFFSET
        if not 0 <= f9 < n:
            continue
        struct_pos = sd["cross_positions"][f9]
        tmpl_pos = td["cross_positions"][f9]
        if struct_pos is None or tmpl_pos is None:
            continue
        total_tmpl, tmpl_t0_matched = _la_match_tmpl_total(t0, tmpl_starts, tmpl_by_start)
        out.append({
            "dump": name, "t0": t0, "frame9": f9, "mislocked": s["mislocked"],
            "median_disp": s["median_disp"], "struct_pos": list(struct_pos),
            "tmpl_pos": list(tmpl_pos), "total_struct": struct_by_start[t0]["total"],
            "total_tmpl": total_tmpl, "tmpl_t0_matched": tmpl_t0_matched,
        })
    return out


def _la_select(pools, dump_order, seed=LOCK_ADJUDICATION_SEED,
               n_mislocked=LOCK_ADJUDICATION_N_MISLOCKED, n_control=LOCK_ADJUDICATION_N_CONTROL):
    """Deterministic stratified sample + BLINDED A/B assignment + shuffle, from `pools` (dump name
    -> candidate list, see `_la_candidates`) -- PURE DATA, no images, no scratchpad, so this is
    exactly what --lock-adjudication-selftest replays.

    Fixed draw order (for reproducibility only, not otherwise meaningful): all dumps' mislocked
    picks in `dump_order`, then all dumps' control picks in `dump_order`; then one A/B letter draw
    per case in that same combined order (independent per image, per the ask); then one final
    shuffle of the whole 24-case list. Every draw comes from the ONE seeded `rng`, in that fixed
    sequence, so the entire set regenerates byte-identical from `seed` alone. `rng.sample` reads
    the FULL population it draws from, so reproducing a specific real selection needs the FULL real
    pool, not a reduced slice -- see `_la_slim_pools` for what a reduced fixture slice validates
    instead (the selection LOGIC's determinism, not byte-identity with one historical live run)."""
    rng = random.Random(seed)
    n_dumps = len(dump_order)

    def targets(total):
        base, rem = divmod(total, n_dumps)
        return [base + (1 if i < rem else 0) for i in range(n_dumps)]

    def draw(want_mislocked, want):
        picks = []
        for dump_name, want_n in zip(dump_order, want):
            pool = sorted((c for c in pools[dump_name] if c["mislocked"] == want_mislocked),
                         key=lambda c: c["t0"])
            if len(pool) < want_n:
                raise SystemExit(f"--lock-adjudication: {dump_name} has only {len(pool)} "
                                 f"{'mislocked' if want_mislocked else 'not-mislocked'} candidates, "
                                 f"need {want_n}.")
            picks.extend(dict(c) for c in rng.sample(pool, want_n))
        return picks

    cases = draw(True, targets(n_mislocked)) + draw(False, targets(n_control))
    for c in cases:
        struct_is_a = rng.random() < 0.5
        c["letter_struct"] = "A" if struct_is_a else "B"
        c["letter_tmpl"] = "B" if struct_is_a else "A"
    order = list(range(len(cases)))
    rng.shuffle(order)
    shuffled = [cases[i] for i in order]
    for idx, c in enumerate(shuffled, start=1):
        c["case_id"] = f"case_{idx:02d}"
    return shuffled


def _la_slim_pools(pools, dump_order, keep_mis=LOCK_ADJUDICATION_FIXTURE_KEEP_MIS,
                   keep_ctl=LOCK_ADJUDICATION_FIXTURE_KEEP_CTL):
    """Reduce the full real per-dump candidate pools to exactly what --lock-adjudication-selftest
    needs: the first `keep_mis` mislocked + `keep_ctl` not-mislocked candidates per dump, by `t0` --
    a DETERMINISTIC cut (not a random one), so regenerating the committed fixture from a live run is
    itself reproducible. Mirrors `_mlr_slim`'s precedent: a SLICE of real data, not synthetic
    fabrication -- and, per `_la_select`'s docstring, NOT the byte-identical live 24-case selection
    (that needs the full pool)."""
    out = {}
    for name in dump_order:
        mis = sorted((c for c in pools[name] if c["mislocked"]), key=lambda c: c["t0"])[:keep_mis]
        ctl = sorted((c for c in pools[name] if not c["mislocked"]),
                     key=lambda c: c["t0"])[:keep_ctl]
        out[name] = mis + ctl
    return out


def _la_expected(cases):
    """The exact fields `_la_select` computes (case order, dump/t0/mislocked carried through
    unchanged, plus the letters it assigns) -- everything --lock-adjudication-selftest needs to
    prove the sampling and A/B assignment are reproducible from the seed."""
    return [{"case_id": c["case_id"], "dump": c["dump"], "t0": c["t0"], "mislocked": c["mislocked"],
            "letter_struct": c["letter_struct"], "letter_tmpl": c["letter_tmpl"]}
           for c in cases]


def _la_frame_path(struct_dir, frame9):
    return Path(struct_dir) / "frames-pellet" / f"f_{frame9 + 1:05d}.png"


def _la_context_panel(frame_path, struct_pos, tmpl_pos, letter_struct, letter_tmpl,
                      width=LOCK_ADJUDICATION_CONTEXT_WIDTH):
    """The whole frame, downscaled, with BOTH candidate positions marked -- same ring style/colour/
    size for both, beside (never over) the position -- and labelled A/B per the case's (already
    randomized) letter assignment."""
    img = cv2.imread(str(frame_path))
    if img is None:
        raise SystemExit(f"--lock-adjudication: could not read frame {frame_path}")
    h, w = img.shape[:2]
    scale = width / w
    small = cv2.resize(img, (width, max(1, int(round(h * scale)))), interpolation=cv2.INTER_AREA)
    for pos, letter in ((struct_pos, letter_struct), (tmpl_pos, letter_tmpl)):
        x, y = int(round(pos[0] * scale)), int(round(pos[1] * scale))
        r = LOCK_ADJUDICATION_RING_RADIUS_CTX
        cv2.circle(small, (x, y), r, (0, 0, 0), 3, cv2.LINE_AA)
        cv2.circle(small, (x, y), r, (255, 255, 0), 2, cv2.LINE_AA)
        cv2.putText(small, letter, (x + r + 4, y - r), cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                   (0, 0, 0), 4, cv2.LINE_AA)
        cv2.putText(small, letter, (x + r + 4, y - r), cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                   (255, 255, 0), 2, cv2.LINE_AA)
    return small


def _la_crop_panel(frame_path, cx, cy, label, half=LOCK_ADJUDICATION_CROP_HALF,
                   scale=LOCK_ADJUDICATION_CROP_SCALE):
    """One ~300x300 source-px crop **always centred** on (cx, cy), upscaled nearest-neighbour, with
    a high-contrast ring drawn AROUND (never over) the position and a label strip carrying ONLY
    `A` or `B`.

    ⚑ PADS rather than shifts or clips (docs/probe-runs.md §22F, owner-flagged on the 2026-08-04
    set: _"b shows the right half of the crosshair, the left bound of the image bisects the
    crosshair"_). The previous version SHIFTED the window back inside the frame, which cannot help
    when the marked position is itself within `half` of a frame edge -- the ring then lands on the
    crop boundary with no context on that side, exactly what the owner hit. Out-of-frame area is
    filled with a flat mid-grey that no game frame produces, so an adjudicator reads it as "outside
    the capture" rather than as dark game content. The marked position is now at the crop centre on
    EVERY case, which also removes centring as a possible blinding cue."""
    img = cv2.imread(str(frame_path))
    if img is None:
        raise SystemExit(f"--lock-adjudication: could not read frame {frame_path}")
    h, w = img.shape[:2]
    ix, iy = int(round(cx)), int(round(cy))
    crop = np.full((2 * half, 2 * half, 3), LOCK_ADJUDICATION_PAD_BGR, dtype=np.uint8)
    sx0, sy0 = max(0, ix - half), max(0, iy - half)
    sx1, sy1 = min(w, ix + half), min(h, iy + half)
    if sx1 > sx0 and sy1 > sy0:
        crop[sy0 - (iy - half):sy1 - (iy - half),
             sx0 - (ix - half):sx1 - (ix - half)] = img[sy0:sy1, sx0:sx1]
    up = cv2.resize(crop, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST)
    px, py = half * scale, half * scale
    cv2.circle(up, (px, py), LOCK_ADJUDICATION_RING_RADIUS, (0, 0, 0), 4, cv2.LINE_AA)
    cv2.circle(up, (px, py), LOCK_ADJUDICATION_RING_RADIUS, (255, 255, 0), 2, cv2.LINE_AA)
    strip = np.zeros((LOCK_ADJUDICATION_LABEL_H, up.shape[1], 3), dtype=np.uint8)
    cv2.putText(strip, label, (8, LOCK_ADJUDICATION_LABEL_H - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.85,
               (255, 255, 255), 2, cv2.LINE_AA)
    return np.vstack([strip, up])


def _la_render(frame_path, case):
    """Context panel (top) + the two A/B crops side by side (bottom), one composite PNG per case."""
    ctx = _la_context_panel(frame_path, case["struct_pos"], case["tmpl_pos"],
                            case["letter_struct"], case["letter_tmpl"])
    a_pos = case["struct_pos"] if case["letter_struct"] == "A" else case["tmpl_pos"]
    b_pos = case["struct_pos"] if case["letter_struct"] == "B" else case["tmpl_pos"]
    crop_a = _la_crop_panel(frame_path, a_pos[0], a_pos[1], "A")
    crop_b = _la_crop_panel(frame_path, b_pos[0], b_pos[1], "B")
    gap = np.full((crop_a.shape[0], 8, 3), 128, dtype=np.uint8)
    crops_row = np.hstack([crop_a, gap, crop_b])
    cw, ctxw = crops_row.shape[1], ctx.shape[1]
    if cw < ctxw:
        crops_row = np.hstack([crops_row, np.zeros((crops_row.shape[0], ctxw - cw, 3), dtype=np.uint8)])
    elif ctxw < cw:
        ctx = np.hstack([ctx, np.zeros((ctx.shape[0], cw - ctxw, 3), dtype=np.uint8)])
    return np.vstack([ctx, crops_row])


def lock_adjudication(struct_paths, tmpl_paths, fps_list, out_dir, seed=LOCK_ADJUDICATION_SEED,
                      save_fixture=None):
    if len(struct_paths) != len(tmpl_paths):
        raise SystemExit(f"--lock-adjudication: {len(struct_paths)} structural path(s) vs "
                         f"{len(tmpl_paths)} --lock-adjudication-template path(s) -- must pair "
                         "1:1, same order")
    if len(fps_list) not in (1, len(struct_paths)):
        raise SystemExit("--lock-adjudication-fps takes 1 value or one per dump "
                         f"({len(struct_paths)} given), got {len(fps_list)}")
    pools, dump_order, struct_dirs = {}, [], {}
    for i, (sp, tp) in enumerate(zip(struct_paths, tmpl_paths)):
        fps = fps_list[0] if len(fps_list) == 1 else fps_list[i]
        with open(sp) as fh:
            sd = json.load(fh)
        with open(tp) as fh:
            td = json.load(fh)
        name = Path(sp).resolve().parent.name
        dump_order.append(name)
        struct_dirs[name] = Path(sp).resolve().parent
        pools[name] = _la_candidates(name, sd, td, fps)
    cases = _la_select(pools, dump_order, seed)

    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    index_lines = [
        "# Lock adjudication", "",
        "For each image, decide which marked position -- `A` or `B` -- is the ACTUAL crosshair.",
        "",
        "Answer one of: `A`, `B`, `neither` (NEITHER marker is on the crosshair), `both` (the two "
        "markers coincide / both sit on the reticle), or `?` (genuinely undecidable).",
        "",
        "⚑ `neither` and `both` are offered EXPLICITLY because the 2026-08-04 set did not offer "
        "them and the owner had to volunteer both -- `neither` turned out to be 20% of flagged "
        "shots (docs/probe-runs.md §22B), a category the two-mode comparison cannot name.",
        "",
        "⚑ A panel that is mostly FLAT GREY means that lock points OUTSIDE the captured frame, "
        "so there is no game content there to show. That lock is definitively wrong -- answer the "
        "other letter, or `neither` if the other one is also not on the crosshair. "
        "(docs/probe-runs.md §33: 0.43% of locked frames land off the right edge.)",
        "",
        "⛔ RECORD THE ANSWERS IN `ANSWERS.json` (written alongside these images) AND COMMIT IT. "
        "The 2026-08-04 answers were never committed, so the 4 `neither` cases can no longer be "
        "identified and their cost is unmeasurable -- see docs/probe-runs.md §32.",
        "",
    ]
    answer_key = []
    for c in cases:
        frame_path = _la_frame_path(struct_dirs[c["dump"]], c["frame9"])
        img = _la_render(frame_path, c)
        fname = f"{c['case_id']}.png"
        cv2.imwrite(str(out_dir / fname), img)
        index_lines.append(f"- `{fname}`")
        answer_key.append({
            "case": c["case_id"], "dump": c["dump"], "t0": c["t0"], "frame": c["frame9"],
            "mislocked": c["mislocked"], "median_disp": c["median_disp"],
            "letter_struct": c["letter_struct"], "letter_tmpl": c["letter_tmpl"],
            "struct_pos": c["struct_pos"], "tmpl_pos": c["tmpl_pos"],
            "total_struct": c["total_struct"], "total_tmpl": c["total_tmpl"],
            "tmpl_t0_matched": c["tmpl_t0_matched"],
        })
        print(f"wrote {out_dir / fname}")
    (out_dir / "INDEX.md").write_text("\n".join(index_lines) + "\n")
    print(f"wrote {out_dir / 'INDEX.md'}")
    with open(out_dir / "ANSWER-KEY.json", "w") as fh:
        json.dump({"seed": seed, "cases": answer_key}, fh, indent=2)
    print(f"wrote {out_dir / 'ANSWER-KEY.json'}")
    # ⚑ §32: the 2026-08-04 run wrote only the KEY, into a gitignored scratch dir, and the owner's
    # verdicts were never persisted anywhere -- so the 4 `neither` cases became unidentifiable and
    # §8 item 1 (their cost) cannot be executed. Emitting a pre-filled, order-matched template makes
    # recording them the DEFAULT rather than an afterthought.
    answers_stub = {
        "_README": ("Fill each `verdict` with one of: A | B | neither | both | ?. Then COMMIT this "
                    "file (it is the durable record of the adjudication -- ANSWER-KEY.json alone "
                    "cannot reconstruct the owner's verdicts). Score it with "
                    "analyze-pellet-tracks.py --lock-adjudication-score <this file> "
                    "--lock-adjudication-key <ANSWER-KEY.json>."),
        "seed": seed,
        "answers": [{"case": c["case"], "verdict": None} for c in answer_key],
    }
    with open(out_dir / "ANSWERS.json", "w") as fh:
        json.dump(answers_stub, fh, indent=2)
    print(f"wrote {out_dir / 'ANSWERS.json'}  <-- FILL IN AND COMMIT (see §32)")

    if save_fixture:
        slim_pools = _la_slim_pools(pools, dump_order)
        fixture_cases = _la_select(slim_pools, dump_order, seed)
        with open(save_fixture, "w") as fh:
            json.dump({
                "_source": ("count-pellets.py --dump-tracks structural + template pairs (see "
                           "docs/handoffs/2026-08-04-mislock-cost-PRECOMMIT.md's §21C ask), through "
                           "_la_candidates for all 4 production dumps."),
                "_note": ("A reduced SLICE, not the full real pools -- pools[name] here is "
                         f"`_la_slim_pools`' first {LOCK_ADJUDICATION_FIXTURE_KEEP_MIS} mislocked + "
                         f"{LOCK_ADJUDICATION_FIXTURE_KEEP_CTL} not-mislocked candidates per dump, "
                         "by t0. This is NOT the byte-identical live 24-case selection (`rng.sample` "
                         "reads the FULL population, see _la_select's docstring) -- it validates "
                         "that --lock-adjudication-selftest's OWN selection is reproducible from its "
                         "seed, not that it matches this specific live run's real 24 cases. "
                         "Regenerate with analyze-pellet-tracks.py --lock-adjudication "
                         "<structural.json...> --lock-adjudication-template <template.json...> "
                         "--save-lock-adjudication-fixture <path> (also renders the real images to "
                         "--lock-adjudication-out in the same run)."),
                "seed": seed, "dump_order": dump_order, "pools": slim_pools,
                "_expected": _la_expected(fixture_cases),
            }, fh, indent=2)
        print(f"wrote lock-adjudication fixture -> {save_fixture}")
    return cases


# --- scoring a filled ANSWERS.json (§32) -------------------------------------------------------
# ⚑ `A_imprecise` / `B_imprecise` were OWNER-VOLUNTEERED on 2026-08-05 ("a but slightly off, b is a
# total miss though") -- the SECOND time the offered vocabulary proved too narrow, after `neither`
# and `both` on 2026-08-04 (§22A). Recorded as first-class values rather than coerced, because
# coercing is exactly how the 08-04 `neither` category nearly went unnamed.
LA_VERDICTS = ("A", "B", "A_imprecise", "B_imprecise", "neither", "both", "?")
LA_IMPRECISE = {"A_imprecise": "A", "B_imprecise": "B"}


def _las_score(answers, key, imprecise="strict"):
    """Join a filled ANSWERS.json against its ANSWER-KEY.json and reproduce docs/probe-runs.md
    §22B's verdict split and §22C's severity, from committed data rather than from chat.

    ⚑ §22D's limit is STRUCTURAL and is reproduced here rather than papered over: severity is
    defined ONLY on template-right cases, because that is the only subset where a valid reference
    exists. `neither` cases are counted and reported, never folded into the severity mean."""
    by_case = {c["case"]: c for c in key["cases"]}
    ans = {a["case"]: a.get("verdict") for a in answers["answers"]}
    missing = [c for c, v in ans.items() if v is None]
    unknown = [c for c in ans if c not in by_case]
    bad = [f"{c}={v}" for c, v in ans.items() if v is not None and v not in LA_VERDICTS]
    if unknown or bad:
        raise SystemExit(f"--lock-adjudication-score: unknown cases {unknown}; "
                         f"bad verdicts {bad} (allowed: {', '.join(LA_VERDICTS)})")
    split = collections.Counter()
    severity, sev_cases = [], []
    for case, v in ans.items():
        if v is None:
            continue
        k = by_case[case]
        if not k["mislocked"]:
            split[f"control:{v}"] += 1
            continue
        if v in LA_IMPRECISE and imprecise == "lenient":
            v = LA_IMPRECISE[v]
        if v in LA_IMPRECISE:
            split[v] += 1
        elif v == "?":
            split["undecidable"] += 1
        elif v == "neither":
            split["neither"] += 1
        elif v == "both":
            split["both"] += 1
        elif v == k["letter_struct"]:
            split["structural_right"] += 1
        elif v == k["letter_tmpl"]:
            split["template_right"] += 1
            # production (structural) lock is WRONG here; template is the valid reference
            d = k["total_struct"] - k["total_tmpl"]
            severity.append(d)
            sev_cases.append({"case": case, "delta": d})
        else:
            raise SystemExit(f"--lock-adjudication-score: {case} verdict {v!r} matches neither "
                             f"letter ({k['letter_struct']}/{k['letter_tmpl']})")
    n_mis = sum(v for k2, v in split.items() if not k2.startswith("control:"))
    # An `*_imprecise` verdict still says the OTHER lock is "a total miss", so under EITHER reading
    # the production (structural) lock is bad whenever the imprecise pick is TEMPLATE.
    # ⚑ ONLY in the strict arm: under `lenient` these were already folded into `template_right`
    # above, so adding them again double-counts (it reported 20/20 before this guard).
    imp_tmpl = sum(1 for c, v in ans.items()
                   if v in LA_IMPRECISE and by_case[c]["mislocked"]
                   and LA_IMPRECISE[v] == by_case[c]["letter_tmpl"]) if imprecise == "strict" else 0
    mean = round(st.mean(severity), 4) if severity else None
    sd = round(st.stdev(severity), 4) if len(severity) > 1 else 0.0
    return {
        "n_answered": len([v for v in ans.values() if v is not None]),
        "n_unanswered": len(missing), "unanswered": sorted(missing),
        "n_mislocked_scored": n_mis,
        "split": dict(sorted(split.items())),
        "imprecise_reading": imprecise,
        "production_lock_bad": split["template_right"] + split["neither"] + imp_tmpl,
        "production_lock_bad_rate": (
            round((split["template_right"] + split["neither"] + imp_tmpl) / n_mis, 4)
            if n_mis else None),
        "severity_n": len(severity), "severity_mean": mean, "severity_sd": sd,
        "severity_se": round(sd / math.sqrt(len(severity)), 4) if len(severity) > 1 else None,
        "severity_values": severity, "severity_cases": sev_cases,
    }


def _print_lock_adjudication_score(r):
    print("\nLOCK ADJUDICATION — SCORED FROM COMMITTED ANSWERS (docs/probe-runs.md §22/§32)")
    print(f"  answered {r['n_answered']}, unanswered {r['n_unanswered']} {r['unanswered'] or ''}")
    print(f"  imprecise reading: {r.get('imprecise_reading')}")
    print(f"  verdict split (mislocked cases, n={r['n_mislocked_scored']}): {r['split']}")
    print(f"  production lock BAD on {r['production_lock_bad']}/{r['n_mislocked_scored']} "
          f"= {r['production_lock_bad_rate']}   (template-right + neither)")
    if r["severity_n"]:
        print(f"  severity (template-right only, n={r['severity_n']}): {r['severity_values']}")
        print(f"    mean {r['severity_mean']} sd {r['severity_sd']} SE {r['severity_se']}")
    print("  ⛔ §22D: `neither` cases are EXCLUDED from severity by construction — template is not a")
    print("     valid reference there — so the severity mean is biased TOWARD zero and the true")
    print("     cost is >= what it reports. Sizing that needs a third reference, not this arm.")


def audit_lock_adjudication_score(answers_path, key_path, imprecise="strict"):
    with open(answers_path) as fh:
        answers = json.load(fh)
    with open(key_path) as fh:
        key = json.load(fh)
    if answers.get("seed") != key.get("seed"):
        raise SystemExit(f"--lock-adjudication-score: seed mismatch — answers {answers.get('seed')} "
                         f"vs key {key.get('seed')}. These are not the same adjudication run.")
    r = _las_score(answers, key, imprecise)
    _print_lock_adjudication_score(r)
    return r


def lock_adjudication_score_selftest():
    """Constraint 9 self-validation on synthetic data (the 2026-08-04 answers are LOST, §32, so
    there is no real pair to replay). Pins the join, the letter->lock mapping, the §22D exclusion,
    and the severity arithmetic against a hand-built key whose right answer is computable by hand."""
    key = {"seed": 1, "cases": [
        # struct picked (A) -> structural_right, no severity
        {"case": "c1", "mislocked": True, "letter_struct": "A", "letter_tmpl": "B",
         "total_struct": 7, "total_tmpl": 7},
        # tmpl picked (B) -> template_right, severity = 5 - 8 = -3
        {"case": "c2", "mislocked": True, "letter_struct": "A", "letter_tmpl": "B",
         "total_struct": 5, "total_tmpl": 8},
        # letters SWAPPED, tmpl picked (A) -> template_right, severity = 9 - 7 = +2
        {"case": "c3", "mislocked": True, "letter_struct": "B", "letter_tmpl": "A",
         "total_struct": 9, "total_tmpl": 7},
        # neither -> counted, EXCLUDED from severity
        {"case": "c4", "mislocked": True, "letter_struct": "A", "letter_tmpl": "B",
         "total_struct": 1, "total_tmpl": 2},
        # control -> never enters the mislocked split
        {"case": "c5", "mislocked": False, "letter_struct": "A", "letter_tmpl": "B",
         "total_struct": 8, "total_tmpl": 8},
    ]}
    answers = {"seed": 1, "answers": [
        {"case": "c1", "verdict": "A"}, {"case": "c2", "verdict": "B"},
        {"case": "c3", "verdict": "A"}, {"case": "c4", "verdict": "neither"},
        {"case": "c5", "verdict": "both"},
    ]}
    r = _las_score(answers, key)
    checks = [
        ("letter->lock mapping honours per-case swapped letters (c3's A is TEMPLATE)",
         r["split"].get("template_right") == 2),
        ("structural_right counted, and contributes NO severity",
         r["split"].get("structural_right") == 1 and r["severity_n"] == 2),
        ("`neither` counted but EXCLUDED from severity (§22D)",
         r["split"].get("neither") == 1 and -1 not in r["severity_values"]),
        ("controls never enter the mislocked split",
         r["n_mislocked_scored"] == 4 and r["split"].get("control:both") == 1),
        ("severity values are struct - tmpl, in case order", r["severity_values"] == [-3, 2]),
        ("production lock bad = template_right + neither", r["production_lock_bad"] == 3),
    ]
    ok = all(v for _, v in checks)
    for label, v in checks:
        print(f"  {'PASS' if v else 'FAIL'}  {label}")
    _print_lock_adjudication_score(r)
    print("SELFTEST PASS" if ok else "SELFTEST FAIL")
    return 0 if ok else 1


def lock_adjudication_selftest():
    """Constraint 9 self-validation: replay `_la_select` over the committed slice -- NO scratchpad
    or frame access, selection is pure data -- and assert the pinned 24-case `_expected` list
    matches byte-for-byte, PLUS the decisive claims a coarse dict-equality pass could hide behind:
    the 20/4 mislocked/control split really is stratified 5-per-dump / 1-per-dump, the A/B letters
    actually vary (the randomization is live, not defaulting to always-A-is-structural), the same
    seed reproduces the identical selection, and a different seed changes it."""
    with open(LOCK_ADJUDICATION_FIXTURE) as fh:
        fx = json.load(fh)
    cases = _la_select(fx["pools"], fx["dump_order"], fx["seed"])
    got = _la_expected(cases)
    ok = got == fx["_expected"]
    if not ok:
        print(f"  DIFF:\n    expected {json.dumps(fx['_expected'])}\n    got      {json.dumps(got)}")

    replay = _la_expected(_la_select(fx["pools"], fx["dump_order"], fx["seed"]))
    different_seed = _la_expected(_la_select(fx["pools"], fx["dump_order"], fx["seed"] + 1))
    n_mis = sum(1 for c in cases if c["mislocked"])
    n_ctl = len(cases) - n_mis
    per_dump_mis = collections.Counter(c["dump"] for c in cases if c["mislocked"])
    per_dump_ctl = collections.Counter(c["dump"] for c in cases if not c["mislocked"])
    letters_a = sum(1 for c in cases if c["letter_struct"] == "A")
    checks = [
        ("24 cases total", len(cases) == 24),
        ("20 mislocked, 4 control", n_mis == 20 and n_ctl == 4),
        ("mislocked stratified 5/dump across all 4 dumps",
         len(per_dump_mis) == 4 and all(v == 5 for v in per_dump_mis.values())),
        ("control stratified 1/dump across all 4 dumps",
         len(per_dump_ctl) == 4 and all(v == 1 for v in per_dump_ctl.values())),
        ("A/B letters vary across cases (randomization live)", 0 < letters_a < 24),
        ("case ids are exactly case_01..case_24, no gaps",
         sorted(c["case_id"] for c in cases) == [f"case_{i:02d}" for i in range(1, 25)]),
        ("same seed reproduces the identical 24-case selection", replay == got),
        ("a different seed changes the selection", different_seed != got),
    ]
    all_ok = ok and all(v for _, v in checks)
    for label, v in checks:
        print(f"  {'PASS' if v else 'FAIL'}  {label}")
    print("SELFTEST PASS" if all_ok else "SELFTEST FAIL")
    return 0 if all_ok else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--tracks", help="tracks.json from count-pellets.py --dump-tracks")
    ap.add_argument("--frames", help="directory of extracted pellet frames (enables detector comparison)")
    ap.add_argument("--start", type=int, default=0, help="first frame index for --frames comparison")
    ap.add_argument("--count", type=int, default=60, help="frames to compare (default 60 = ~3 blasts)")
    ap.add_argument("--selftest", action="store_true", help=f"validate against {FIXTURE} and exit")
    ap.add_argument("--raw-tracks", type=int, metavar="N",
                     help="print RAW (unresampled) per-frame area sequences for the N longest-lived "
                          "near-crosshair white tracks -- the 60fps lifecycle-shape premise check "
                          "(pellet-reader Phase 2 gate, ITEM 2)")
    ap.add_argument("--raw-tracks-min-life", type=int, default=8,
                     help="minimum track life to be eligible for --raw-tracks (default 8)")
    ap.add_argument("--dup-check", action="store_true",
                     help="report consecutive-frame pixel-diff stats over --frames/--start/--count, "
                          "to detect duplicated/blended frames (30fps-internal-render-on-60fps-capture "
                          "premise check, pellet-reader Phase 2 gate ITEM 2). Requires --frames. Cheap "
                          "(pixel diff only) -- does not imply --compare-frames.")
    ap.add_argument("--compare-frames", action="store_true",
                     help="run the (expensive: per-frame LoG) threshold-vs-LoG detector comparison over "
                          "--frames/--start/--count. Previously implied by passing --frames alone; now "
                          "opt-in so --dup-check / --raw-tracks runs stay fast over a full extraction.")
    ap.add_argument("--onset-spread", metavar="PELLETS_JSON",
                     help="report per-shot intra-blast onset (t0) spread of near-crosshair white tracks, "
                          "using a sibling pellets.json's debounced --shots list for blast timing, banded "
                          "by RANGE_BAND_SCHEDULE (pellet-reader Phase 2 gate, ITEM 3)")
    ap.add_argument("--onset-at", type=float, default=0.0,
                     help="the extraction's --at video-seconds offset (must match the read-pellets.ts run "
                          "that produced --tracks), for onset-spread frame alignment")
    ap.add_argument("--onset-fps", type=float, default=60.0, help="sampling fps for onset-spread (default 60)")
    ap.add_argument("--onset-window", type=int, default=20,
                     help="+/- frame window around each shot's frame index to search for near-crosshair "
                          "white track onsets (default 20)")
    ap.add_argument("--onset-min-life", type=int, default=1,
                     help="exclude near-crosshair white tracks shorter than this from onset-spread "
                          "(default 1 = no filter; the shipped detector's life=1 population is ~40-60%% "
                          "background/fragmentation noise, not necessarily blast members -- raise this "
                          "to see the spread among longer, more plausibly-real fragments)")
    ap.add_argument("--stale-counting", nargs="+", metavar="TRACKS_JSON",
                     help="measure how often the crosshair lock is a HELD (stale) carry-forward AT "
                          "THE COUNTING FRAMES (t0+8..t0+11 of every debounced shot), versus the "
                          "all-frames prevalence recorded in docs/probe-runs.md 2026-08-01, plus the "
                          "held-position displacement there and the include-vs-exclude count A/B. "
                          "Takes any number of count-pellets.py --dump-tracks dumps; each dump's "
                          "localization mode is detected from its own data (see the section comment)")
    ap.add_argument("--stale-counting-fps", type=float, default=60.0,
                     help="sampling fps handed to count-pellets.py's debounce_shots for its gap "
                          "tolerance (default 60). Only affects event MERGING; the pooled "
                          "counting-frame stale rate moved 4.09%%->4.44%% between 60 and 30")
    ap.add_argument("--stale-counting-t0-shift", type=int, default=0,
                     help="shift every t0 by N frames -- the alignment-sensitivity sweep. The event "
                          "rising edge reproduces the 5 owner-anchored groundtruth-f8-11 t0 values "
                          "exactly on 3 of 5 and 4 frames early on 2, so +-4 bounds the error")
    ap.add_argument("--stale-counting-offsets", type=int, nargs="+", metavar="N",
                     help="frame offsets from t0 that make up the counting window (default "
                          f"{' '.join(str(o) for o in STALE_COUNTING_OFFSETS)}). The f8-11 default "
                          "is defined at 60fps SAMPLING; on a 30fps extraction the rate-equivalent "
                          "window is 4 5 6 (see the section comment -- passing the wrong one is "
                          "silent, and measured here it moved the stale rate 3.4-4.8%% -> 5.6-6.4%%)")
    ap.add_argument("--save-stale-counting-fixture", metavar="PATH",
                     help=f"write the selftest slice fixture (default path {STALE_COUNTING_FIXTURE})")
    ap.add_argument("--stale-counting-selftest", action="store_true",
                     help=f"replay --stale-counting against {STALE_COUNTING_FIXTURE} and exit")
    ap.add_argument("--stale-counting-groundtruth", metavar="TRACKS_DIR",
                     help="the GROUND-TRUTH arm: score the 6-shot `marciana` (SG/Iron) f8-11 fixture "
                          "with stale counting frames INCLUDED vs EXCLUDED, using its own "
                          f"owner-anchored t0 values from {REAL_GT_PATH} instead of an estimated "
                          "one. TRACKS_DIR holds tracks-structural.json + tracks-template.json "
                          "regenerated at the clip's exact parameters (at=15 dur=30 fps=60 zoom=2); "
                          "requires --gt-score-json")
    ap.add_argument("--missing-shots", nargs="+", metavar="AMMO_SERIES_JSON",
                     help="THE MISSING-SHOT CHANNEL (docs/handoffs/2026-08-01-missing-shot-channel-"
                          "test-plan.md): reconstruct shots fired from a count-pellets.py "
                          "--ammo-series read series and compare against the pellet-detected shot "
                          "events of the dump it was read from (each series records its own "
                          "tracks.json path). Reports MISSED and SPURIOUS SEPARATELY, the measured "
                          "cadence, the reload headroom that bounds how much MISSED under-counts, "
                          "and the abstention rate conditioned on the dump's own stale mask")
    ap.add_argument("--missing-shots-fps", type=float, default=60.0,
                     help="sampling fps of the dumps being scored (default 60; the full-fight h4/g2 "
                          "dumps are 30) -- handed to debounce_shots for its gap tolerance")
    ap.add_argument("--missing-shots-slack", type=int, default=6,
                     help="frames of tolerance when matching a detected shot onset to an ammo "
                          "decrement window (default 6 at 60fps). The detector's t0 is the "
                          "EVENT_MIN rising edge, which sits AT or AFTER the shot frame")
    ap.add_argument("--missing-shots-confirm", type=int, default=AMMO_CONFIRM,
                     help=f"consecutive surviving reads needed to accept a new ammo level "
                          f"(default {AMMO_CONFIRM})")
    ap.add_argument("--missing-shots-ammo-max", type=int, default=AMMO_MAX,
                     help=f"magazine size; a read above it is discarded as a glyph misread "
                          f"(default {AMMO_MAX})")
    ap.add_argument("--save-missing-shots-fixture", metavar="PATH",
                     help=f"write the selftest slice fixture (default path {MISSING_SHOTS_FIXTURE})")
    ap.add_argument("--missing-shots-gate", action="store_true",
                     help="§3a GATE: also score the reconstruction against the owner-confirmed "
                          f"real shots in {REAL_GT_PATH}. Only meaningful for a dump of the "
                          "`marciana` (SG/Iron) groundtruth clip (at=15 dur=30 fps=60 zoom=2)")
    ap.add_argument("--missing-shots-selftest", action="store_true",
                     help=f"replay --missing-shots against {MISSING_SHOTS_FIXTURE} and exit")
    ap.add_argument("--hand-count", nargs="+", metavar="AMMO_SERIES_JSON",
                     help="THE HAND-COUNT ARM: score a count-pellets.py --ammo-series dump against "
                          "an OWNER HAND SHOT-COUNT over a video-time window. The ammo arbiter "
                          "counts DECREMENTS, so it is structurally blind to the round that empties "
                          "each magazine; a hand count supplies the true denominator and an external "
                          "check on the reconstruction. Reports MISSED against the hand count, "
                          "against the naive every-onset-is-a-shot reading, and on the arbiter's own "
                          "basis, plus the per-reload non-ammo extra onsets")
    ap.add_argument("--hand-count-window", nargs=2, type=float, metavar=("LO_SEC", "HI_SEC"),
                     help="the VIDEO-time window the owner hand-counted (seconds; the owner reads "
                          "timestamps off the player, not off the fight clock)")
    ap.add_argument("--hand-count-at", type=float, default=0.0,
                     help="the dump's own --at extraction offset, so frame = (t - at) * fps "
                          "(default 0)")
    ap.add_argument("--hand-count-fps", type=float, default=30.0,
                     help="sampling fps of the dump being scored (default 30; the full-fight h4/g2 "
                          "dumps are 30) -- handed to debounce_shots for its gap tolerance")
    ap.add_argument("--hand-count-slack", type=int, default=8,
                     help="frames of tolerance when matching a detected shot onset to an ammo "
                          "decrement window (default 8). The detector's t0 is the EVENT_MIN rising "
                          "edge, which sits AT or AFTER the shot frame")
    ap.add_argument("--hand-count-shots", type=int,
                     help="the owner's hand-counted number of shots fired in the window")
    ap.add_argument("--hand-count-magazines", type=int,
                     help="the owner's hand-counted number of full magazines emptied in the window")
    ap.add_argument("--hand-count-nonammo", type=int,
                     help="owner-reported non-ammo skill damage events in the window (projectiles "
                          "that cost no ammo and leave no shotgun pellet markers)")
    ap.add_argument("--save-hand-count-fixture", metavar="PATH",
                     help=f"write the selftest slice fixture (default path {HAND_COUNT_FIXTURE})")
    ap.add_argument("--hand-count-selftest", action="store_true",
                     help=f"replay --hand-count against {HAND_COUNT_FIXTURE} and exit")
    ap.add_argument("--ammo-abstention", nargs="+", metavar="AMMO_SERIES_JSON",
                     help="one or more count-pellets.py --ammo-series payloads: report WHY the "
                          "ammo-counter OCR abstains -- per-frame read rate, the reason breakdown, "
                          "each reason resolved to the SUBSYSTEM that emitted it "
                          "(LOCALIZATION/SEGMENTATION/GLYPH-MATCH), the NOMINAL ceiling a perfect "
                          "digit atlas could reach, the stale-lock cross-tab and the dark-badge vs "
                          "bright good-lock sub-populations. Per series and pooled")
    ap.add_argument("--ammo-abstention-frames", action="store_true",
                     help="(--ammo-abstention) ALSO read the frame PNGs each series records in its "
                          "`frames_dir` to classify every GLYPH-MATCH crop as red- or "
                          "white-dominant, which is what the HONEST ceiling (dark-badge AND red) "
                          "needs. Without it those columns report unavailable rather than guess")
    ap.add_argument("--ammo-abstention-dark-max", type=float, default=AMMO_SURROUND_DARK_MAX,
                     help=f"(--ammo-abstention) surround-brightness split below which a good-lock "
                          f"frame counts as sitting on the dark ammo badge (default "
                          f"{AMMO_SURROUND_DARK_MAX}; a PROXY, not a calibrated boundary)")
    ap.add_argument("--save-ammo-abstention-fixture", metavar="PATH",
                     help=f"write the selftest slice fixture (default path {AMMO_ABSTENTION_FIXTURE})")
    ap.add_argument("--ammo-abstention-selftest", action="store_true",
                     help=f"replay --ammo-abstention against {AMMO_ABSTENTION_FIXTURE} and exit")
    ap.add_argument("--ammo-oracle-ceiling", nargs="+", metavar="AMMO_SERIES_JSON",
                     help="THE PERFECT-LOCK CEILING: re-read every HELD-lock frame at the digit-row "
                          "centre BORROWED from its nearest good-lock reading neighbour, to measure "
                          "how much of the ammo counter a flawless localizer could recover. Needs "
                          "the frame PNGs each series records in its `frames_dir`. Always reports "
                          "the CONTROL ARM alongside -- the same borrowed centre applied to frames "
                          "that already read, which must still decode to the SAME value or the "
                          "stale-arm figure is the oracle's own error floor. Diagnostic only: no "
                          "real reader has future frames, so nothing here can ship")
    ap.add_argument("--ammo-oracle-gap", type=int, default=ORACLE_MAX_GAP,
                     help=f"frames either side to borrow a centre from (default {ORACLE_MAX_GAP}; "
                          f"the ROI is 214x124px and the box moves ~10-30px/frame, so beyond ~2 the "
                          f"borrowed ROI can no longer be assumed to contain the counter)")
    ap.add_argument("--ammo-oracle-control", type=int, default=ORACLE_CONTROL_TARGET,
                     help=f"good frames sampled per dump for the control arm, evenly spaced "
                          f"(default {ORACLE_CONTROL_TARGET})")
    ap.add_argument("--ammo-oracle-atlas", metavar="DIR",
                     help=f"digit glyph atlas for the re-read (default {ORACLE_ATLAS_DIR})")
    ap.add_argument("--save-ammo-oracle-fixture", metavar="PATH",
                     help=f"write the selftest slice fixture (default path {ORACLE_CEILING_FIXTURE})")
    ap.add_argument("--ammo-oracle-ceiling-selftest", action="store_true",
                     help=f"replay --ammo-oracle-ceiling against {ORACLE_CEILING_FIXTURE} and exit")
    ap.add_argument("--merge-audit", nargs="+", metavar="AMMO_SERIES_JSON",
                    help="MERGE AUDIT (docs/probe-runs.md §8): how often debounce_shots fuses two "
                         "shots into one event, how many shots the ammo arbiter says that actually "
                         "costs, and how six candidate segmentation rules score on MISSED / "
                         "unexplained-SPURIOUS / avgTotal. Reads each series' tracks.json "
                         "`frame_counts`; changes NO segmentation behaviour (every candidate is a "
                         "local scoring variant, and a control asserts the shipped rule reproduces "
                         "count-pellets.py's debounce_shots event for event).")
    ap.add_argument("--merge-audit-fps", type=float, nargs="+", default=[30.0], metavar="FPS",
                    help="sampling fps: one value for all series, or one per series (default 30). "
                         "It sets both the gap tolerance and max_pellet_frames, so a 60 fps dump "
                         "passed as 30 is scored against the wrong cadence.")
    ap.add_argument("--merge-audit-slack", type=int, nargs="+", default=[8], metavar="N",
                    help="matcher slack in frames: one value for all series, or one per series "
                         "(default 8, the §3b convention; the 60 fps series were scored at 6)")
    ap.add_argument("--save-merge-audit-fixture", metavar="PATH",
                    help=f"write the committed replay slice (see {MERGE_AUDIT_FIXTURE})")
    ap.add_argument("--merge-audit-selftest", action="store_true",
                    help=f"replay {MERGE_AUDIT_FIXTURE} and exit")
    ap.add_argument("--representative-audit", nargs="+", metavar="TRACKS_JSON",
                    help=("THE REPRESENTATIVE-FRAME AUDIT (docs/probe-runs.md §9): which frame does "
                          "debounce_shots copy its count from -- the pellet cohort, or the muzzle "
                          "flash in front of it? Decomposes the owner's 5 labelled shots into "
                          "never-detected / filter-rejected / lifetime-gated / radius-gated / "
                          "countable, marks the representative frame on each event's per-frame "
                          "anatomy, scores the peak frame's white as owner-matched vs artefact, "
                          "contrasts owner-pellet against non-owner track LIFETIMES, and then "
                          "replicates that lifetime split WITHOUT labels over every event in every "
                          "dump given, alongside the per-policy avgTotal and `valid`-clamp table. "
                          "READ-ONLY: every policy is a local scoring variant and the shipped one "
                          "is asserted against count-pellets.py's own debounce_shots first."))
    ap.add_argument("--representative-audit-fps", type=float, nargs="+", default=[30.0],
                    metavar="FPS",
                    help=("sampling fps per --representative-audit dump (one value, or one per "
                          "dump). Default 30"))
    ap.add_argument("--representative-audit-labelled", metavar="TRACKS_JSON",
                    help=(f"the --dump-tracks dump of the clip {REP_LABEL_COUNTS} was hand-counted "
                          "on, located the SHIPPED way (structural). Required: it carries the n=5 "
                          "half"))
    ap.add_argument("--representative-audit-labelled-tmpl", metavar="TRACKS_JSON",
                    help=("the TEMPLATE-crosshair re-dump of the same clip. The label file's own "
                          "`locate` field says which shots' crops were cut with it, and the "
                          "shot-4 relock row needs it"))
    ap.add_argument("--representative-audit-labelled-fps", type=float, default=60.0,
                    help="sampling fps of the labelled clip (default 60)")
    ap.add_argument("--save-representative-audit-fixture", metavar="PATH",
                    help=f"write the committed replay fixture (see {REP_AUDIT_FIXTURE})")
    ap.add_argument("--representative-audit-selftest", action="store_true",
                    help=f"replay {REP_AUDIT_FIXTURE} and exit")
    ap.add_argument("--policy-score", action="store_true",
                    help=("THE REPRESENTATIVE-FRAME POLICY SCORE (docs/handoffs/"
                          "2026-08-04-representative-frame-PRECOMMIT.md): scores the pre-committed "
                          "shipped_median / lifetime_gated_median / plateau_median / "
                          "lifetime_band_count candidates against the categorical PLATEAU check "
                          f"(n=5) and the free ceiling check (n=852), reading {REP_AUDIT_FIXTURE} "
                          "directly -- no new raw data, no tracks.json arguments needed. Also "
                          "scores `hybrid_plateau_median` (docs/handoffs/"
                          "2026-08-04-representative-frame-PROPOSAL.md §2/§4): plateau_median where "
                          "the event has a band track in radius, else shipped, unchanged -- the "
                          "enactment proposal's own candidate, added after and separate from the "
                          "pre-commit doc's four."))
    ap.add_argument("--save-policy-score-fixture", metavar="PATH",
                    help=f"write the committed score fixture (see {POLICY_SCORE_FIXTURE})")
    ap.add_argument("--policy-score-selftest", action="store_true",
                    help=f"replay --policy-score against {POLICY_SCORE_FIXTURE} and exit")
    ap.add_argument("--gt-score-json", metavar="PATH",
                     help="score-pellets.py --real-fixture stdout JSON (carries each shot's owner "
                          "count, the shipped estimator's error and its per-offset counts)")
    ap.add_argument("--backend-marker-audit", nargs="+", metavar="DUMP_DIR",
                    help=("THE BACKEND/MARKER-CHANNEL AUDIT (docs/probe-runs.md §11): replays "
                          "count-pellets.py's OWN debounce_shots in-process over each dump's "
                          "tracks.json `frame_counts` and diffs it event-for-event against the "
                          "SHIPPED read-pellets.ts output already sitting in that dump's "
                          "pellets.json -- no segmentation logic is re-implemented here. Reports, "
                          "per dump: the segmentation lockstep (totalShots both sides, which "
                          "events differ and on which fields, which flip the 5..10 valid-total "
                          "clamp), a full-clip channel census (white/red/marker) between "
                          "tracks.json's frame_counts and pellets.json's reads, and, for every "
                          "marker-divergent frame, the backend-selector mechanism (does the "
                          "winning backend tie on white+red with the others, which backend(s) saw "
                          "a marker, does the dump's own marker equal opencv's). Each DUMP_DIR "
                          "must contain both tracks.json and pellets.json. read-pellets.ts, "
                          "count-pellets.py's debounce_shots and MARKER_MIN are UNCHANGED by this "
                          "arm."))
    ap.add_argument("--save-backend-marker-audit-fixture", metavar="PATH",
                    help=f"write the committed replay fixture (see {BACKEND_MARKER_AUDIT_FIXTURE})")
    ap.add_argument("--backend-marker-audit-selftest", action="store_true",
                    help=f"replay {BACKEND_MARKER_AUDIT_FIXTURE} and exit")
    ap.add_argument("--hybrid-landing-audit", nargs="+", metavar="DUMP_DIR",
                    help=("THE HYBRID-LANDING AUDIT (docs/probe-runs.md §13): checks the "
                          "fallback-hybrid representative-frame rule AS SHIPPED (count-pellets.py's "
                          "`band` channel + its hybrid branch inside `debounce_shots`, and "
                          "read-pellets.ts's mirror) against the four mandatory landing criteria -- "
                          "EQUIVALENCE (production's own `band` vs this file's independent "
                          "`_ps_band_totals`), criteria re-measured against PRODUCTION "
                          "`debounce_shots` itself (categorical 5/5, ceiling/n_scored/no_rep), the "
                          "FALSIFICATION control (bit-identical to shipped on no-band events), and "
                          "(with --hybrid-landing-audit-ts-lockstep) LOCKSTEP against "
                          "read-pellets.ts on a common input. Each DUMP_DIR is a live "
                          "count-pellets.py --dump-tracks directory (tracks.json) for one of "
                          "REP_AUDIT_FIXTURE's 5 dumps -- everything the AUDIT side needs is reused "
                          "from that already-committed fixture, never re-derived."))
    ap.add_argument("--hybrid-landing-audit-ts-lockstep", action="store_true",
                    help="also run the LIVE TS lockstep check (needs `npx tsx`); not part of the "
                         "selftest replay")
    ap.add_argument("--save-hybrid-landing-audit-fixture", metavar="PATH",
                    help=f"write the committed replay fixture (see {HYBRID_LANDING_FIXTURE})")
    ap.add_argument("--hybrid-landing-audit-selftest", action="store_true",
                    help=f"replay {HYBRID_LANDING_FIXTURE} (python side only) and exit")
    ap.add_argument("--cap-score", action="store_true",
                    help=("THE LIFETIME-CAP band_hi SCORE (docs/handoffs/"
                          "2026-08-04-lifetime-cap-PRECOMMIT.md): scores the pre-committed "
                          "candidate set {control, 19, 20, 21} for a DECOUPLED counted-pellet "
                          "band upper bound (never a raised max_pellet_frames -- see the "
                          "pre-commit's §1) against §2.1's in-sample consistency check (no "
                          "evidential weight), §2.3's out-of-sample ceiling check and §2.4's "
                          "out-of-sample corridor-emptiness check, plus §2.5's reported-only "
                          f"figures and the §6 fallback-event sub-deliverable. Reads {REP_AUDIT_FIXTURE} "
                          "directly -- no new raw data, no tracks.json arguments needed. "
                          "MEASUREMENT ONLY: nothing here enacts."))
    ap.add_argument("--save-cap-score-fixture", metavar="PATH",
                    help=f"write the committed score fixture (see {CAP_SCORE_FIXTURE})")
    ap.add_argument("--cap-score-selftest", action="store_true",
                    help=f"replay --cap-score against {CAP_SCORE_FIXTURE} and exit")
    ap.add_argument("--marker-geometry", metavar="TRACKS_JSON",
                    help=("MARKER GEOMETRY (docs/probe-runs.md §15): for each of "
                          "--marker-geometry-frames, list every RED track within (the dump's own) "
                          "params.pellet_radius of that frame's crosshair -- id, lifetime, "
                          "absolute position, distance, and crosshair-relative dx/dy -- plus each "
                          "track's dx/dy across a +/- --marker-geometry-window neighbourhood, so a "
                          "track with a near-constant offset (crosshair-attached) is "
                          "distinguishable from one that exists for a single frame only. Answers "
                          "docs/handoffs/2026-08-04-pellet-reader-JUDGE-handoff.md item 7's "
                          "prerequisite: is opencv's marker=3 reading at h4-marciana-structural "
                          "frame 1565 a true core hit or a false positive? TRACKS_JSON is the "
                          "tracks.json FILE from count-pellets.py --dump-tracks. Read-only: never "
                          "touches read-pellets.ts, count-pellets.py or any constant/default."))
    ap.add_argument("--marker-geometry-frames", type=int, nargs="+", metavar="FRAME",
                    help="frame indices to query (required with --marker-geometry)")
    ap.add_argument("--marker-geometry-window", type=int, default=3,
                    help="+/- frames of neighbourhood each near-crosshair track's dx/dy "
                         "trajectory is reported over (default 3)")
    ap.add_argument("--marker-geometry-radius", type=float, default=None,
                    help="override the dump's own params.pellet_radius (default: use the dump's "
                         "own)")
    ap.add_argument("--save-marker-geometry-fixture", metavar="PATH",
                    help=f"write the committed replay slice (see {MARKER_GEOMETRY_FIXTURE})")
    ap.add_argument("--marker-geometry-selftest", action="store_true",
                    help=f"replay {MARKER_GEOMETRY_FIXTURE} and exit")
    ap.add_argument("--dump-replay-fidelity", nargs="+", metavar="TRACKS_JSON",
                    help=("DUMP-REPLAY FIDELITY (docs/probe-runs.md §25): does re-deriving "
                          "white/red/marker from a --dump-tracks tracks.json reproduce the "
                          "`frame_counts` production actually emitted? Scores every frame of "
                          "every named dump and attributes each divergence to SPLIT (in-radius "
                          "total conserved -- the per-frame is_red that --dump-tracks does not "
                          "persist) or BOUNDARY (total not conserved -- the 0.1px xs/ys rounding "
                          "flipping a radius test). Reports the marker-channel divergence rate, "
                          "which is what any marker-semantics analysis off tracks.json inherits. "
                          "READ-ONLY / MEASUREMENT ONLY: never touches count-pellets.py, "
                          "read-pellets.ts, MARKER_MIN, debounce_shots or any constant."))
    ap.add_argument("--fidelity-marker-radius", type=float, default=None,
                    help=("marker_radius to replay with, overriding the dump's own persisted "
                          "params.marker_radius (D3, 2026-08-05-dump-schema-LANDING-PLAN.md). "
                          "Dumps written before that persistence landed carry no such param, so "
                          f"replay falls back to count-pellets.py's default "
                          f"(={DRF_DEFAULT_MARKER_RADIUS}) for those."))
    ap.add_argument("--fidelity-controls", type=int, default=200, metavar="N",
                    help="non-divergent control frames per dump to commit into the fixture "
                         "(default 200)")
    ap.add_argument("--save-dump-replay-fidelity-fixture", metavar="PATH",
                    help=f"write the committed replay slice (see {DUMP_REPLAY_FIDELITY_FIXTURE})")
    ap.add_argument("--dump-replay-fidelity-selftest", action="store_true",
                    help=f"replay {DUMP_REPLAY_FIDELITY_FIXTURE} and exit")
    ap.add_argument("--radius-gate", nargs="+", metavar="TRACKS_JSON",
                    help=("THE RADIUS GATE (docs/handoffs/2026-08-05-radius-gate-PRECOMMIT.md, "
                          "docs/probe-runs.md §35): is the 160px pellet_radius cutting into the real "
                          "pellet cloud, or sitting in empty space? Radial histogram of "
                          "lifetime-in-band WHITE tracks at each shot's representative frame, with a "
                          "QUIET-frame control subtracted to isolate pellets from clutter. ⚑ The "
                          "verdict is read off DENSITY, not raw counts (annulus area grows with r). "
                          "MEASUREMENT ONLY -- pellet_radius is not changed regardless of outcome."))
    ap.add_argument("--radius-gate-fps", type=float, nargs="+", default=[30.0], metavar="FPS",
                    help="sampling fps, 1 value or one per dump (default 30)")
    ap.add_argument("--save-radius-gate-fixture", metavar="PATH",
                    help=f"write the committed result fixture (see {RADIUS_GATE_FIXTURE})")
    ap.add_argument("--radius-gate-selftest", action="store_true",
                    help=f"replay {RADIUS_GATE_FIXTURE} and exit")
    ap.add_argument("--marker-net", nargs="+", metavar="TRACKS_JSON",
                    help=("NET THE TWO MARKER CHANNELS (docs/probe-runs.md §31): §27's WARM channel "
                          "(false core flags -- removing them COOLS the reader) against §28C's COLD "
                          "channel (markers whose life exceeds max_pellet_frames and never reach "
                          "`marker` at all -- recovering them WARMS it). Opposite signs, never "
                          "netted. The recovery ceiling reuses the already-landed band_hi, which is "
                          "the validated bound for a 14-frame VFX (owner: the marker and the pellet "
                          "share that duration), with an unbounded arm as the strict upper bound. "
                          "MEASUREMENT ONLY."))
    ap.add_argument("--marker-net-fps", type=float, nargs="+", default=[30.0], metavar="FPS",
                    help="sampling fps, 1 value or one per dump (default 30)")
    ap.add_argument("--save-marker-net-fixture", metavar="PATH",
                    help=f"write the committed result fixture (see {MARKER_NET_FIXTURE})")
    ap.add_argument("--marker-net-selftest", action="store_true",
                    help=f"replay {MARKER_NET_FIXTURE} and exit")
    ap.add_argument("--band-production-ab", nargs="+", metavar="TRACKS_JSON",
                    help=("BAND_HI ON THE PRODUCTION PATH, OUT OF SAMPLE (docs/probe-runs.md §30): "
                          "what the landed band_hi actually buys per SHOT, across every shot of "
                          "every named dump. Closes §19D's own caveat -- §19's +0.60/shot was 5 "
                          "shots on the ONE clip that generated the cap hypothesis. Recomputes the "
                          "band series at the pre-landing bound and at the dump's own, then runs "
                          "count-pellets.py's real debounce_shots on each. ⚑ Needs NO "
                          "re-extraction: a --dump-tracks frame_counts IS what --temporal prints "
                          "and production consumes. REFUSES a dump without per-frame `reds` or "
                          "without `band`. MEASUREMENT ONLY."))
    ap.add_argument("--band-production-fps", type=float, nargs="+", default=[30.0], metavar="FPS",
                    help="sampling fps, 1 value or one per dump (default 30)")
    ap.add_argument("--save-band-production-fixture", metavar="PATH",
                    help=f"write the committed result fixture (see {BAND_PROD_FIXTURE})")
    ap.add_argument("--band-production-selftest", action="store_true",
                    help=f"replay {BAND_PROD_FIXTURE} and exit")
    ap.add_argument("--marker-semantics", nargs="+", metavar="TRACKS_JSON",
                    help=("MARKER SEMANTICS (docs/handoffs/2026-08-05-marker-semantics-PRECOMMIT.md, "
                          "docs/probe-runs.md §27): what fraction of production `core` flags are "
                          "raised by UI artifacts rather than real crosshair-attached hit-markers, "
                          "and what does that cost? ⚑ A core flag adds +1 to that shot's `total` "
                          "(total = white + shot_red), so this moves the pellet count, not just a "
                          "report. Classifies every marker-contributing track by C1 persistence "
                          "(life >= 2) and C2 attachment (crosshair-relative vs absolute spread), "
                          "then re-runs count-pellets.py's OWN debounce_shots on shipped vs "
                          "filtered marker series. ⚑ REFUSES a dump written before the per-frame "
                          "`reds` schema (§26) -- §25 measured a 12.20%% mislabel on exactly this "
                          "channel. MEASUREMENT ONLY: never touches MARKER_MIN, debounce_shots, "
                          "read-pellets.ts or any constant."))
    ap.add_argument("--marker-semantics-fps", type=float, nargs="+", default=[30.0], metavar="FPS",
                    help="sampling fps, 1 value or one per --marker-semantics dump (default 30, "
                         "matching every production dump)")
    ap.add_argument("--save-marker-semantics-fixture", metavar="PATH",
                    help=f"write the committed replay slice (see {MARKER_SEMANTICS_FIXTURE})")
    ap.add_argument("--marker-semantics-selftest", action="store_true",
                    help=f"replay {MARKER_SEMANTICS_FIXTURE} and exit")
    ap.add_argument("--fade-screen", action="store_true",
                    help=("FADE-SCREEN GAP (docs/probe-runs.md §9A): every in-radius, non-red track "
                          "in the already-committed representative-audit-slice.json's `labelled` "
                          "block whose last frame dies before its shot's t0+8, bucketed by lifetime "
                          "-- pooled histogram, the ambiguous life-4..7 band (above the documented "
                          "1-3-frame flash phase, below the owner's own measured 8-frame pellet "
                          "floor), and per-shot hitsPerShot=10 headroom bounding how many of them "
                          "could possibly be additional pellets. Reads REP_AUDIT_FIXTURE directly -- "
                          "no new raw data, no tracks.json argument needed. MEASUREMENT ONLY: "
                          "nothing here enacts or adjudicates."))
    ap.add_argument("--save-fade-screen-fixture", metavar="PATH",
                    help=f"write the committed score fixture (see {FADE_SCREEN_FIXTURE})")
    ap.add_argument("--fade-screen-selftest", action="store_true",
                    help=f"replay --fade-screen against {FADE_SCREEN_FIXTURE} and exit")
    ap.add_argument("--fade-screen-crops", metavar="FRAMES_DIR",
                    help=("EVIDENCE GENERATION ONLY (task 2 of the 2026-08-04 fade-screen ask): "
                          "render one filmstrip PNG per --fade-screen adjudicable object (one panel "
                          "per life frame + one at t0+8) plus an INDEX.md, for a human to adjudicate "
                          "pellet-vs-artifact. FRAMES_DIR holds the extracted frame PNGs "
                          "(f_00001.png.., 1-indexed; absolute frame i -> f_{i+1:05d}.png). Never "
                          "runs under --selftest / pellet-selftest.sh; decides nothing."))
    ap.add_argument("--fade-screen-crops-out", metavar="DIR", default="/tmp/fade-adjudication",
                    help="output directory for --fade-screen-crops (default /tmp/fade-adjudication)")
    ap.add_argument("--mislock-rate", nargs="+", metavar="STRUCT_TRACKS_JSON",
                    help=("MISLOCK RATE (docs/handoffs/2026-08-04-mislock-rate-PRECOMMIT.md): what "
                          "fraction of PRODUCTION shots have a mislocked crosshair, by "
                          "structural-vs-template disagreement at each shot's counting frames "
                          "t0+8..t0+11 (t0 = debounce_shots' own event `start`). A shot is "
                          "MISLOCKED iff its median displacement over those 4 frames exceeds the "
                          "dump's own params.pellet_radius (pre-commit §3); a dump whose template "
                          "arm locks < 90%% of counting frames is EXCLUDED (§4.1). One or more "
                          "structural tracks.json paths; pair 1:1, same order, with "
                          "--mislock-rate-template. READ-ONLY: never touches read-pellets.ts, "
                          "count-pellets.py's debounce_shots/MARKER_MIN, or any constant/guard/"
                          "threshold -- reports a RATE only."))
    ap.add_argument("--mislock-rate-template", nargs="+", metavar="TEMPLATE_TRACKS_JSON",
                    help="template-mode tracks.json paths, one per --mislock-rate entry, same order "
                         "(same frames, --locate template instead of structural)")
    ap.add_argument("--mislock-rate-fps", type=float, nargs="+", default=[30.0], metavar="FPS",
                    help="sampling fps, 1 value or one per --mislock-rate dump (default 30, matching "
                         "every production dump; the labelled calibration clip is 60)")
    ap.add_argument("--save-mislock-rate-fixture", metavar="PATH",
                    help=f"write the committed replay slice (see {MISLOCK_RATE_FIXTURE})")
    ap.add_argument("--mislock-rate-selftest", action="store_true",
                    help=f"replay {MISLOCK_RATE_FIXTURE} and exit")
    ap.add_argument("--lock-adjudication", nargs="+", metavar="STRUCT_TRACKS_JSON",
                    help=("LOCK ADJUDICATION (docs/handoffs/2026-08-04-mislock-cost-PRECOMMIT.md's "
                          "§21C ask): render a BLINDED image set for the owner to answer, per shot, "
                          "which marked position -- A or B -- is the actual crosshair. 20 "
                          "MISLOCKED + 4 not-mislocked control shots stratified across dumps, "
                          "seeded selection + seeded A/B assignment + seeded case-order shuffle "
                          "(see --lock-adjudication-seed). Structural dump paths; pair with "
                          "--lock-adjudication-template. READ-ONLY: shares §20's --mislock-rate "
                          "detector, never redefines it; never touches read-pellets.ts or "
                          "count-pellets.py's debounce_shots/thresholds/defaults."))
    ap.add_argument("--lock-adjudication-score", metavar="ANSWERS_JSON",
                    help=("Score a FILLED ANSWERS.json against its ANSWER-KEY.json and reproduce "
                          "docs/probe-runs.md §22B's verdict split + §22C's severity from committed "
                          "data. Exists because the 2026-08-04 answers were never persisted (§32), "
                          "so the 4 `neither` cases can no longer be identified. Needs "
                          "--lock-adjudication-key."))
    ap.add_argument("--lock-adjudication-key", metavar="ANSWER_KEY_JSON",
                    help="the ANSWER-KEY.json written beside the images, for --lock-adjudication-score")
    ap.add_argument("--lock-adjudication-imprecise", choices=["strict", "lenient"], default="strict",
                    help="how to read owner-volunteered A_imprecise/B_imprecise verdicts: `strict` "
                         "(own category, excluded from severity) or `lenient` (mapped to the plain "
                         "letter). Report BOTH -- see _las_score's docstring.")
    ap.add_argument("--lock-adjudication-score-selftest", action="store_true",
                    help="replay --lock-adjudication-score over synthetic data and exit")
    ap.add_argument("--lock-adjudication-template", nargs="+", metavar="TEMPLATE_TRACKS_JSON",
                    help="template-mode tracks.json paths, one per --lock-adjudication entry, same "
                         "order")
    ap.add_argument("--lock-adjudication-fps", type=float, nargs="+", default=[30.0],
                    metavar="FPS",
                    help="sampling fps, 1 value or one per --lock-adjudication dump (default 30, "
                         "matching every production dump)")
    ap.add_argument("--lock-adjudication-seed", type=int, default=LOCK_ADJUDICATION_SEED,
                    help=f"RNG seed for sampling + A/B assignment + shuffle (default "
                         f"{LOCK_ADJUDICATION_SEED})")
    ap.add_argument("--lock-adjudication-out", metavar="DIR", default="/tmp/lock-adjudication",
                    help="output directory for images + INDEX.md + ANSWER-KEY.json (default "
                         "/tmp/lock-adjudication)")
    ap.add_argument("--save-lock-adjudication-fixture", metavar="PATH",
                    help=f"write the committed replay slice (see {LOCK_ADJUDICATION_FIXTURE})")
    ap.add_argument("--lock-adjudication-selftest", action="store_true",
                    help=f"replay {LOCK_ADJUDICATION_FIXTURE} and exit")
    args = ap.parse_args()

    if args.stale_counting_selftest:
        raise SystemExit(stale_counting_selftest())
    if args.missing_shots_selftest:
        raise SystemExit(missing_shots_selftest())
    if args.hand_count_selftest:
        raise SystemExit(hand_count_selftest())
    if args.ammo_abstention_selftest:
        raise SystemExit(ammo_abstention_selftest())
    if args.ammo_oracle_ceiling_selftest:
        raise SystemExit(oracle_ceiling_selftest())
    if args.representative_audit_selftest:
        raise SystemExit(representative_audit_selftest())
    if args.backend_marker_audit_selftest:
        raise SystemExit(backend_marker_audit_selftest())
    if args.backend_marker_audit:
        audit_backend_marker(args.backend_marker_audit, args.save_backend_marker_audit_fixture)
        return 0
    if args.cap_score_selftest:
        raise SystemExit(cap_score_selftest())
    if args.cap_score:
        cap_score(args.save_cap_score_fixture)
        return 0
    if args.fade_screen_selftest:
        raise SystemExit(fade_screen_selftest())
    if args.fade_screen:
        fade_screen(args.save_fade_screen_fixture)
        return 0
    if args.fade_screen_crops:
        fade_screen_crops(args.fade_screen_crops, args.fade_screen_crops_out)
        return 0
    if args.radius_gate_selftest:
        raise SystemExit(radius_gate_selftest())
    if args.radius_gate:
        audit_radius_gate(args.radius_gate, args.radius_gate_fps, args.save_radius_gate_fixture)
        raise SystemExit(0)
    if args.marker_net_selftest:
        raise SystemExit(marker_net_selftest())
    if args.marker_net:
        audit_marker_net(args.marker_net, args.marker_net_fps, args.save_marker_net_fixture)
        raise SystemExit(0)
    if args.band_production_selftest:
        raise SystemExit(band_production_selftest())
    if args.band_production_ab:
        audit_band_production(args.band_production_ab, args.band_production_fps,
                              args.save_band_production_fixture)
        raise SystemExit(0)
    if args.marker_semantics_selftest:
        raise SystemExit(marker_semantics_selftest())
    if args.marker_semantics:
        audit_marker_semantics(args.marker_semantics, args.marker_semantics_fps,
                               save_fixture=args.save_marker_semantics_fixture)
        raise SystemExit(0)
    if args.dump_replay_fidelity_selftest:
        raise SystemExit(dump_replay_fidelity_selftest())
    if args.dump_replay_fidelity:
        audit_dump_replay_fidelity(args.dump_replay_fidelity, args.fidelity_marker_radius,
                                   args.fidelity_controls,
                                   args.save_dump_replay_fidelity_fixture)
        raise SystemExit(0)
    if args.marker_geometry_selftest:
        raise SystemExit(marker_geometry_selftest())
    if args.marker_geometry:
        if not args.marker_geometry_frames:
            ap.error("--marker-geometry requires --marker-geometry-frames")
        audit_marker_geometry(args.marker_geometry, args.marker_geometry_frames,
                              args.marker_geometry_radius, args.marker_geometry_window,
                              args.save_marker_geometry_fixture)
        return 0
    if args.mislock_rate_selftest:
        raise SystemExit(mislock_rate_selftest())
    if args.mislock_rate:
        if not args.mislock_rate_template:
            ap.error("--mislock-rate requires --mislock-rate-template")
        audit_mislock_rate(args.mislock_rate, args.mislock_rate_template, args.mislock_rate_fps,
                           args.save_mislock_rate_fixture)
        return 0
    if args.lock_adjudication_score_selftest:
        raise SystemExit(lock_adjudication_score_selftest())
    if args.lock_adjudication_score:
        if not args.lock_adjudication_key:
            ap.error("--lock-adjudication-score requires --lock-adjudication-key")
        audit_lock_adjudication_score(args.lock_adjudication_score, args.lock_adjudication_key,
                                      args.lock_adjudication_imprecise)
        raise SystemExit(0)
    if args.lock_adjudication_selftest:
        raise SystemExit(lock_adjudication_selftest())
    if args.lock_adjudication:
        if not args.lock_adjudication_template:
            ap.error("--lock-adjudication requires --lock-adjudication-template")
        lock_adjudication(args.lock_adjudication, args.lock_adjudication_template,
                          args.lock_adjudication_fps, args.lock_adjudication_out,
                          args.lock_adjudication_seed, args.save_lock_adjudication_fixture)
        return 0
    if args.hybrid_landing_audit_selftest:
        raise SystemExit(hybrid_landing_audit_selftest())
    if args.hybrid_landing_audit:
        audit_hybrid_landing(args.hybrid_landing_audit, args.save_hybrid_landing_audit_fixture,
                             args.hybrid_landing_audit_ts_lockstep)
        return 0
    if args.policy_score_selftest:
        raise SystemExit(policy_score_selftest())
    if args.policy_score:
        policy_score(args.save_policy_score_fixture)
        return 0
    if args.representative_audit:
        fps_list = args.representative_audit_fps
        if len(fps_list) not in (1, len(args.representative_audit)):
            ap.error("--representative-audit-fps takes 1 value or one per dump "
                     f"({len(args.representative_audit)} given), got {len(fps_list)}")
        audit_representative(args.representative_audit, fps_list,
                             args.representative_audit_labelled,
                             args.representative_audit_labelled_tmpl,
                             args.representative_audit_labelled_fps,
                             args.save_representative_audit_fixture)
        return 0
    if args.merge_audit_selftest:
        raise SystemExit(merge_audit_selftest())
    if args.merge_audit:
        for name, vals in (("--merge-audit-fps", args.merge_audit_fps),
                           ("--merge-audit-slack", args.merge_audit_slack)):
            if len(vals) not in (1, len(args.merge_audit)):
                ap.error(f"{name} takes 1 value or one per series "
                         f"({len(args.merge_audit)} given), got {len(vals)}")
        audit_merge(args.merge_audit, args.merge_audit_fps, args.merge_audit_slack,
                    args.save_merge_audit_fixture)
        return
    if args.ammo_oracle_ceiling:
        audit_oracle_ceiling(args.ammo_oracle_ceiling, args.ammo_oracle_gap,
                             args.ammo_oracle_control, args.ammo_oracle_atlas,
                             args.save_ammo_oracle_fixture)
        return
    if args.ammo_abstention:
        audit_ammo_abstention(args.ammo_abstention, args.ammo_abstention_frames,
                              args.ammo_abstention_dark_max, args.save_ammo_abstention_fixture)
        return
    if args.hand_count:
        if not args.hand_count_window:
            ap.error("--hand-count requires --hand-count-window LO_SEC HI_SEC")
        audit_hand_count(args.hand_count, args.hand_count_fps, args.hand_count_slack,
                         AMMO_CONFIRM, AMMO_MAX, args.hand_count_window,
                         {"shots": args.hand_count_shots,
                          "magazines": args.hand_count_magazines,
                          "nonammo_events": args.hand_count_nonammo},
                         args.hand_count_at, args.save_hand_count_fixture)
        return
    if args.missing_shots:
        audit_missing_shots(args.missing_shots, args.missing_shots_fps, args.missing_shots_slack,
                            args.missing_shots_confirm, args.missing_shots_ammo_max,
                            args.save_missing_shots_fixture, args.missing_shots_gate)
        return
    if args.stale_counting_groundtruth:
        if not args.gt_score_json:
            ap.error("--stale-counting-groundtruth requires --gt-score-json")
        stale_counting_groundtruth(args.stale_counting_groundtruth, args.gt_score_json)
        return
    if args.stale_counting:
        audit_stale_counting(args.stale_counting, args.stale_counting_fps,
                             args.stale_counting_t0_shift, args.save_stale_counting_fixture,
                             tuple(args.stale_counting_offsets or STALE_COUNTING_OFFSETS))
        return
    if args.selftest:
        raise SystemExit(selftest())
    if not args.tracks:
        ap.error("--tracks is required (or use --selftest)")

    with open(args.tracks) as fh:
        data = json.load(fh)
    report_tracks(data)
    if args.raw_tracks:
        report_raw_tracks(data, args.raw_tracks, args.raw_tracks_min_life)
    if args.compare_frames:
        if not args.frames:
            ap.error("--compare-frames requires --frames")
        compare_frames(data, args.frames, args.start, args.count)
    if args.dup_check:
        if not args.frames:
            ap.error("--dup-check requires --frames")
        report_dup_check(args.frames, data["frame_files"], args.start, args.count)
    if args.onset_spread:
        report_onset_spread(data, args.onset_spread, args.onset_at, args.onset_fps, args.onset_window,
                             args.onset_min_life)


if __name__ == "__main__":
    main()
