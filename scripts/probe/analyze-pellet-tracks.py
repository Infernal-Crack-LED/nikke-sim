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
    """read-pellets.ts:505's `Math.max(4, Math.round((13 / 60) * fps))`.

    ⚑ THIS IS A PER-BLOB TRACK-LIFETIME CAP, NOT AN EVENT-SPAN BUDGET. It is passed to
    count-pellets.py as `--max-pellet-frames` and read at count-pellets.py:380 (`temporal_filter`)
    and :450 (`build_tracks_and_counts`) to decide which TRACKS are pellets at all;
    `debounce_shots` never reads it, and a shot EVENT's `frames` is a different quantity in a
    different unit. It is computed here only so the census can put the two side by side and show
    the category error rather than repeat it (§8A).

    JS `Math.round` is half-UP where Python's `round` is half-to-EVEN, and (13/60)*30 = 6.5 lands
    exactly on the tie -- 7 in the shipped pipeline, 6 from a naive Python port. Reproduced
    explicitly, because the 31.3% figure this arm corrects is the `frames > 7` census."""
    return max(4, math.floor((13 / 60) * fps + 0.5))


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


def _merge_expand(d):
    """Compact fixture tuples -> the dict shapes the report reads."""
    fc = [{"white": w, "red": r, "marker": m} for w, r, m in d["frame_counts"]]
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
    frame_counts = [{"white": w, "red": r, "marker": m} for w, r, m in block["frame_counts"]]
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
    fc = [{"white": w, "red": r, "marker": m} for w, r, m in d["frame_counts"]]
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
            "frame_counts": [[c["white"], c["red"], c.get("marker", 0)] for c in frame_counts],
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
        [{"white": w, "red": r, "marker": m} for w, r, m in d["frame_counts"]], d["fps"])
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
POLICY_RULES = ("shipped_median", "lifetime_gated_median", "plateau_median", "lifetime_band_count")
_POLICY_FRAME_RULES = ("shipped_median", "lifetime_gated_median", "plateau_median")


def _ps_band(fps, max_pellet_frames):
    """The fps-scaled owner-pellet lifetime band [lo, max_pellet_frames] -- the same `lo` §9G's
    lifetime census uses (8 frames at 60 fps, scaled down at 30; `max_pellet_frames` is each dump's
    OWN value, never hardcoded -- trap 4)."""
    lo = max(1, round(REP_OWNER_LIFE_LO_60FPS * fps / 60.0))
    return lo, max_pellet_frames


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
    select) and `total` (the count it would report, comparable to shipped's `total`)."""
    if policy == "shipped_median":
        return {"rep": ev["rep"], "total": ev["total"]}
    a, b = ev["start"], ev["end"]
    if policy == "lifetime_gated_median":
        rep = _ps_median_rep(band_totals, a, b)
    elif policy == "plateau_median":
        rep = _ps_plateau_rep(band_totals, a, b)
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
                     **{p: d[p] for p in POLICY_RULES}} for d in dumps],
        "pooled": pooled,
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

    print("\nTERTIARY (§1.3, REPORTED ONLY -- never a ranking criterion; mean-matching near 8.40 "
          "DISQUALIFIES a rule)")
    for p in POLICY_RULES:
        print(f"  {p:24s} avgTotal={pooled[p]['avgTotal']}")


def policy_score(save_fixture=None):
    with open(REP_AUDIT_FIXTURE) as fh:
        fx = json.load(fh)
    for d in fx["dumps"]:
        fc = [{"white": w, "red": r, "marker": m} for w, r, m in d["frame_counts"]]
        if not _merge_shipped_identity(fc, d["fps"]):
            raise SystemExit(f"--policy-score: the shipped-identity control FAILED on {d['tracks']}. "
                             "The local span rebuild no longer reproduces debounce_shots, so no row "
                             "below would be a difference from the real baseline.")
    labelled = _ps_score_labelled(fx)
    dumps = [_ps_score_dump(d) for d in fx["dumps"]]
    pooled = _ps_pool_dumps(dumps)
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
        [{"white": w, "red": r, "marker": m} for w, r, m in d["frame_counts"]], d["fps"])
        for d in src["dumps"])
    labelled = _ps_score_labelled(src)
    dumps = [_ps_score_dump(d) for d in src["dumps"]]
    pooled = _ps_pool_dumps(dumps)
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
                          "directly -- no new raw data, no tracks.json arguments needed."))
    ap.add_argument("--save-policy-score-fixture", metavar="PATH",
                    help=f"write the committed score fixture (see {POLICY_SCORE_FIXTURE})")
    ap.add_argument("--policy-score-selftest", action="store_true",
                    help=f"replay --policy-score against {POLICY_SCORE_FIXTURE} and exit")
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
    if args.ammo_abstention_selftest:
        raise SystemExit(ammo_abstention_selftest())
    if args.ammo_oracle_ceiling_selftest:
        raise SystemExit(oracle_ceiling_selftest())
    if args.representative_audit_selftest:
        raise SystemExit(representative_audit_selftest())
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
