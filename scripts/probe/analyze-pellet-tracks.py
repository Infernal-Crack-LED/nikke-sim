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
import json
import math
import statistics as st
from pathlib import Path

import cv2
import numpy as np
from scipy import ndimage

HERE = Path(__file__).resolve().parent
_CP_MODULE = None


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
    13-frame lifecycle (f1 1x dot -> f3-4 plateau -> f5-11 monotone decay -> f12-13 fade) ever
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
    render -- which would mean the "13-frame lifecycle" observed at 60fps sampling is really
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
# transfer to a dump extracted at another rate: the owner's pellet-lifecycle spec is 13 native
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
    measurement. Returns (mask, modal_delta_or_None)."""
    cross, confs, raw = data["cross_positions"], data["cross_confs"], data["cross_rawloc"]
    n = len(cross)
    if mode == "structural":
        return [confs[i] is None and cross[i] is not None for i in range(n)], None
    deltas = collections.Counter()
    for c, r in zip(cross, raw):
        if c and r:
            deltas[(c[0] - r[0], c[1] - r[1])] += 1
    if not deltas:
        return [False] * n, None
    modal = deltas.most_common(1)[0][0]
    mask = [bool(cross[i] and raw[i] and (cross[i][0] - raw[i][0], cross[i][1] - raw[i][1]) != modal)
            for i in range(n)]
    return mask, list(modal)


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
    # An event belongs to the window when the transition itself happened inside it.
    events = [e for e in events_all if f_lo <= e["hi"] <= f_hi]
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

    dec_shots = sum(e["shots"] for e in events if e["kind"] == "decrement")
    # ADMISSIBLE basis, reported ALONGSIDE the raw one and never instead of it (the
    # missing_shots_report precedent). reconstruct_ammo has no magazine-consistency check, so a
    # glyph misread that survives `confirm` MINTS shots: measured on `isabel`, the 3-frame `0` at
    # f1602-1604 sitting between a confirmed 9 and a confirmed 8 scores as a 9-shot `9 -> 0`
    # decrement, inflating this window's headline to 40 decrements / 44 implied against a hand
    # count of 32 / 36. Capping each FLAGGED decrement at what its window can hold removes exactly
    # that inflation. n_reloads is deliberately NOT adjusted -- the flag rule speaks to decrements
    # only, and the reload count is the proxy for the magazine-emptying rounds the arbiter cannot
    # see. The underlying reconstruct_ammo defect is NOT fixed here (whole-fight blast radius).
    bad_keys = {(e["lo"], e["hi"]) for e in bad_in_window}
    dec_shots_adm = sum(
        admissible_shots(e, cad_lo) if (e["lo"], e["hi"]) in bad_keys else e["shots"]
        for e in events if e["kind"] == "decrement")
    n_reloads = sum(1 for e in events if e["kind"] == "reload")
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
            "implied_total_admissible": dec_shots_adm + n_reloads,
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
            "ammo_implied_total_admissible": dec_shots_adm + n_reloads,
            "ammo_total_admissible_matches_hand": (dec_shots_adm + n_reloads) == n_hand,
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
              f"{r['ammo']['n_reloads']} mag-empty = {s['ammo_implied_total_admissible']} "
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
    ap.add_argument("--gt-score-json", metavar="PATH",
                     help="score-pellets.py --real-fixture stdout JSON (carries each shot's owner "
                          "count, the shipped estimator's error and its per-offset counts)")
    args = ap.parse_args()

    if args.stale_counting_selftest:
        raise SystemExit(stale_counting_selftest())
    if args.missing_shots_selftest:
        raise SystemExit(missing_shots_selftest())
    if args.hand_count_selftest:
        raise SystemExit(hand_count_selftest())
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
