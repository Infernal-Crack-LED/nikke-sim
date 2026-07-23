#!/usr/bin/env python3
"""W4 addendum: profile-likelihood ridge for the AR (delta0, f_bloom) fit -
reports the set of parameter pairs within deviance +1 and +2 of the minimum,
to make the identifiability of the two mechanistic parameters explicit."""
import math

import numpy as np

CORE_C = {"near": 31.0, "mid": 20.9, "midfar": 15.8, "far": 12.7}
SCALE = {"AR": 75.0}
AR_CELLS = [
    ("moran near", "near", 0.0, 48, 120),
    ("moran mid", "mid", 0.0, 9, 57),
    ("moran midfar", "midfar", 0.0, 6, 42),
    ("moran far", "far", 0.0, 2, 40),
    ("scarlet far spawn", "far", 0.0, 3, 36),
    ("blanc far spawn", "far", 39.24, 20, 180),
]


def lens_area(R, r, d):
    if d >= R + r:
        return 0.0
    if d <= abs(R - r):
        m = min(R, r)
        return math.pi * m * m
    a = min(1, max(-1, (d * d + R * R - r * r) / (2 * d * R)))
    b = min(1, max(-1, (d * d + r * r - R * R) / (2 * d * r)))
    t = (-d + R + r) * (d + R - r) * (d - R + r) * (d + R + r)
    return R * R * math.acos(a) + r * r * math.acos(b) - 0.5 * math.sqrt(max(0.0, t))


def uni_p(band, hr, d0, fb):
    rc = CORE_C[band] / 2
    Re = fb * 0.648 * 75 / 2 * max(0.0, 1 - hr / 100)
    d = d0 * max(0.0, 1 - hr / 120)
    if Re <= 0:
        return 1.0 if d <= rc else 0.0
    return lens_area(Re, rc, d) / (math.pi * Re * Re)


def bll(k, n, p):
    p = min(max(p, 1e-12), 1 - 1e-12)
    return k * math.log(p) + (n - k) * math.log(1 - p)


sat = sum(bll(k, n, k / n) for _, _, _, k, n in AR_CELLS)
grid = []
for d0 in np.arange(0.0, 40.001, 0.25):
    for fb in np.arange(0.40, 1.0001, 0.005):
        if uni_p("near", 80.78, d0, fb) < 0.85:
            continue
        ll = sum(bll(k, n, uni_p(band, hr, d0, fb)) for _, band, hr, k, n in AR_CELLS)
        grid.append((2 * (sat - ll), d0, fb))
grid.sort()
d_min = grid[0][0]
in1 = [(d0, fb) for dev, d0, fb in grid if dev <= d_min + 1]
in2 = [(d0, fb) for dev, d0, fb in grid if dev <= d_min + 2]
print(f"min deviance {d_min:.2f} at delta0={grid[0][1]:.2f} f_bloom={grid[0][2]:.3f}")
for tag, s in (("+1", in1), ("+2", in2)):
    d0s = [a for a, _ in s]
    fbs = [b for _, b in s]
    print(f"dev within {tag}: n={len(s)}  delta0 range [{min(d0s):.1f},{max(d0s):.1f}]  f_bloom range [{min(fbs):.3f},{max(fbs):.3f}]")
# f_bloom profile at a few fixed values
for fb in (0.5, 0.578, 0.65, 0.75, 0.85, 0.95, 1.0):
    best = min(
        (2 * (sat - sum(bll(k, n, uni_p(band, hr, d0, fb)) for _, band, hr, k, n in AR_CELLS)), d0)
        for d0 in np.arange(0.0, 40.001, 0.25)
        if uni_p("near", 80.78, d0, fb) >= 0.85
    )
    print(f"f_bloom={fb:.3f}: best deviance {best[0]:.2f} at delta0={best[1]:.2f}")
