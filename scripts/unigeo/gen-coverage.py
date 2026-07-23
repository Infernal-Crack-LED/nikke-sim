#!/usr/bin/env python3
"""UNIGEO coverage-profile generation (2026-07-22, worktree branch).

Rebuilds the per-band radial silhouette-coverage profiles used by the UNIGEO
engine arm (H1 Part 1: pellets uniform-per-area in the aim circle, landing =
eps * coverage(band, R(hr))) from the owner-drawn silhouette artifacts.

Inputs (owner-drawn overlay frames; gitignored media, live in the MAIN tree):
  docs/probes/drawn-geometry/'blanc solo 40% hit-0003.png'
    - magenta outline = boss silhouette (near band, clock 02:16)
    - cyan ring       = boss core (center is the aim-circle center)

Extraction follows docs/probes/drawn-geometry/extract_drawn_geometry.py EXACTLY
(same color thresholds, same 9x9 ellipse morphological close, same corner
flood-fill, largest interior blob, ring-fit centroid for the core center).

Scaling model (sg-drawn-geometry.json derived.landingCheck_noFreeParameters):
  the traced NEAR silhouette is range-scaled per band by px ~ 1/distance at
  band distances near 20.7 / mid 30.7 / midfar 40.7 / far 50.7, about the
  traced core center. The aim circle is centered on the core center.

Outputs (deterministic, committed):
  src/engine/unigeo-coverage.ts   - per-band coverage(R) tables, R = 1..96 px
                                    step 0.5 (k=1 uniform-per-area weights)
  scripts/unigeo/silhouette-radii-hist.json
                                  - raw silhouette radial histogram (0.25 px
                                    bins about the core center) + metadata,
                                    consumed by the W1/W4 analysis scripts so
                                    analysis and engine share one geometry.

Run:  python3 scripts/unigeo/gen-coverage.py [path-to-drawn-frame]
"""
import cv2
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
DEFAULT_FRAME = os.path.join(
    "/Users/maxwellsutton/nikke-sim/docs/probes/drawn-geometry",
    "blanc solo 40% hit-0003.png",
)
FRAME = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_FRAME

BAND_DIST = {"near": 20.7, "mid": 30.7, "midfar": 40.7, "far": 50.7}
NEAR_DIST = BAND_DIST["near"]
R_GRID_MAX = 96.0   # px; SG R0 = 0.648*250/2 = 81, headroom for interpolation
R_GRID_STEP = 0.5
HIST_BIN = 0.25     # px radial histogram bin width


def color_mask(img, kind):
    b = img[:, :, 0].astype(int)
    g = img[:, :, 1].astype(int)
    r = img[:, :, 2].astype(int)
    if kind == "pink":
        return ((r > 170) & (b > 170) & (g < 160) & (np.abs(r - b) < 100)).astype(np.uint8)
    if kind == "cyan":
        return ((g > 170) & (b > 170) & (r < 150)).astype(np.uint8)
    raise ValueError(kind)


def components(mask, min_area=150):
    n, lab, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    out = []
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] < min_area:
            continue
        ys, xs = np.where(lab == i)
        out.append(
            {
                "area": int(stats[i, cv2.CC_STAT_AREA]),
                "bbox": [int(stats[i, 0]), int(stats[i, 1]), int(stats[i, 2]), int(stats[i, 3])],
                "xs": xs,
                "ys": ys,
            }
        )
    return sorted(out, key=lambda c: -c["area"])


def ring_fit(comp):
    xs, ys = comp["xs"], comp["ys"]
    cx, cy = xs.mean(), ys.mean()
    d = np.hypot(xs - cx, ys - cy)
    return {
        "cx": float(cx),
        "cy": float(cy),
        "r_mean": float(d.mean()),
        "r_std": float(d.std()),
        "ringness": float(d.std() / max(d.mean(), 1e-9)),
        "r_inner": float(np.percentile(d, 5)),
    }


def main():
    img = cv2.imread(FRAME)
    if img is None:
        sys.exit(f"cannot read {FRAME}")
    h, w = img.shape[:2]

    # -- silhouette: pink outline -> close pen gaps -> flood outside -> interior blob --
    pink = color_mask(img, "pink")
    kern = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    pink_closed = cv2.morphologyEx(pink, cv2.MORPH_CLOSE, kern)
    inv = (1 - pink_closed).astype(np.uint8)
    flood_src = inv.copy()
    mask_ff = np.zeros((h + 2, w + 2), np.uint8)
    for seed in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        if flood_src[seed[1], seed[0]] == 1:
            cv2.floodFill(flood_src, mask_ff, seed, 2)
    outside = flood_src == 2
    interior = (~outside) & (pink == 0)
    # The committed silhouette artifact (sg-drawn-geometry.json silhouette_near
    # area_px = 114267, "flood-filled from the outline incl. pen-crossing pockets
    # (~5k px)") is the union of ALL interior components with area >= 150 -- the
    # main blob (108987 px) plus the pen-crossing pockets (3912/596/569/203 px).
    # Reproduced here exactly (verified: sum == 114267 on the committed frame).
    icomps = components(interior.astype(np.uint8), 150)
    if not icomps:
        sys.exit("no silhouette interior found")
    sil = np.zeros((h, w), bool)
    for c in icomps:
        sil[c["ys"], c["xs"]] = True

    # -- core ring (cyan) on the same frame -> center --
    ccomps = components(color_mask(img, "cyan"), 80)
    x0, y0, bw, bh = icomps[0]["bbox"]
    core = None
    for c in ccomps[:8]:
        f = ring_fit(c)
        if x0 <= f["cx"] <= x0 + bw and y0 <= f["cy"] <= y0 + bh:
            if core is None or c["area"] > core[0]["area"]:
                core = (c, f)
    if core is None:
        sys.exit("no core ring found inside silhouette bbox")
    ccx, ccy = core[1]["cx"], core[1]["cy"]

    # -- radial histogram of silhouette pixels about the core center --
    ys, xs = np.where(sil)
    rad = np.hypot(xs - ccx, ys - ccy)
    nbins = int(np.ceil(rad.max() / HIST_BIN)) + 1
    hist, edges = np.histogram(rad, bins=nbins, range=(0.0, nbins * HIST_BIN))

    def coverage(band, R, k=1.0):
        """Density-weighted silhouette coverage of the aim circle (radius R px)
        for a per-area pellet density ~ r^(k-1) (k=1 => uniform per area).
        Silhouette scaled about the core center by s = d_near/d_band."""
        s = NEAR_DIST / BAND_DIST[band]
        if R <= 0:
            return 1.0
        centers = (edges[:-1] + edges[1:]) / 2.0
        scaled = centers * s
        inside = scaled <= R
        wgt = np.where(scaled > 0, scaled ** (k - 1.0), 1.0)
        num = float((hist[inside] * wgt[inside]).sum()) * s * s
        den = 2.0 * np.pi * (R ** (k + 1.0)) / (k + 1.0)
        return min(1.0, num / den)

    grid = np.arange(R_GRID_STEP, R_GRID_MAX + 1e-9, R_GRID_STEP)
    tables = {b: [round(coverage(b, float(R)), 6) for R in grid] for b in BAND_DIST}

    meta = {
        "generatedBy": "scripts/unigeo/gen-coverage.py",
        "frame": os.path.basename(FRAME),
        "coreCenter": [round(ccx, 1), round(ccy, 1)],
        "coreRingRInnerPx": round(core[1]["r_inner"], 1),
        "silhouetteAreaPx": int(sil.sum()),
        "silhouetteBbox": [x0, y0, bw, bh],
        "bandDistances": BAND_DIST,
        "histBinPx": HIST_BIN,
        "rGridStep": R_GRID_STEP,
        "rGridMax": R_GRID_MAX,
    }

    # -- JSON sidecar for the analysis scripts --
    with open(os.path.join(HERE, "silhouette-radii-hist.json"), "w") as f:
        json.dump({"meta": meta, "histCounts": hist.tolist()}, f)

    # -- generated TS constant file for the engine --
    lines = [
        "// GENERATED FILE - do not edit by hand.",
        "// Rebuild: python3 scripts/unigeo/gen-coverage.py",
        "// Per-band radial silhouette-coverage profiles for the UNIGEO arm:",
        "// coverage(band, R) = fraction of the aim circle (radius R px, centered on",
        "// the traced boss-core center) covered by the range-scaled boss silhouette,",
        "// uniform-per-area weighting (H1 Part 1). Silhouette: owner-traced near-band",
        f"// frame '{os.path.basename(FRAME)}' (core center {round(ccx,1)},{round(ccy,1)};",
        f"// area {int(sil.sum())} px^2), scaled px ~ 1/d at band distances",
        "// near 20.7 / mid 30.7 / midfar 40.7 / far 50.7.",
        f"export const UNIGEO_COV_R_STEP = {R_GRID_STEP};",
        f"export const UNIGEO_COV_R_MAX = {R_GRID_MAX};",
        "export const UNIGEO_COVERAGE: Record<string, number[]> = {",
    ]
    for b in ("near", "mid", "midfar", "far"):
        lines.append(f"  {b}: [")
        row = tables[b]
        for i in range(0, len(row), 12):
            lines.append("    " + ", ".join(f"{v}" for v in row[i : i + 12]) + ",")
        lines.append("  ],")
    lines.append("};")
    lines.append("")
    ts_path = os.path.join(REPO, "src", "engine", "unigeo-coverage.ts")
    with open(ts_path, "w") as f:
        f.write("\n".join(lines))

    print(json.dumps(meta, indent=1))
    for b in BAND_DIST:
        print(
            b,
            "cov(R=81)=%.3f" % coverage(b, 81.0),
            "cov(R=49.48)=%.3f" % coverage(b, 81.0 * (1 - 38.91 / 100)),
        )
    print("wrote", ts_path)


if __name__ == "__main__":
    main()
