#!/usr/bin/env python3
"""W1 addendum: score the three candidate core series at the FIXED engine form
(k=1 uniform per area, eps=0.96) - the exact H1-Part-1 parameters the UNIGEO
arm ships, and therefore the expected W3 engine deviance."""
import json
import math
import os

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
side = json.load(open(os.path.join(HERE, "silhouette-radii-hist.json")))
HIST = np.array(side["histCounts"], dtype=float)
BIN = side["meta"]["histBinPx"]
CENTERS = (np.arange(len(HIST)) + 0.5) * BIN
R0 = 0.648 * 250 / 2
DIST = {"near": 20.7, "mid": 30.7, "midfar": 40.7, "far": 50.7}
STATES = [
    ("near_ON", "near", 38.91, 16, 149, 11),
    ("near_OFF", "near", 0.0, 5, 39, 0),
    ("mid_ON", "mid", 38.91, 19, 174, 5),
    ("mid_OFF", "mid", 0.0, 4, 31, 1),
    ("midfar_ON", "midfar", 38.91, 18, 140, 11),
    ("midfar_OFF", "midfar", 0.0, 4, 28, 0),
    ("far_ON", "far", 38.91, 19, 135, 3),
    ("far_OFF", "far", 0.0, 5, 32, 0),
    ("midfarREP_ON", "midfar", 38.91, 18, 135, 4),
]
CAND = {
    "A": {"near": 31.0, "mid": 28.0, "midfar": 21.0, "far": 17.0},
    "B": {"near": 31.0, "mid": 27.0, "midfar": 23.9, "far": 21.5},
    "C": {"near": 31.0, "mid": 20.9, "midfar": 15.8, "far": 12.7},
}


def cov(band, R, k=1.0):
    s = DIST["near"] / DIST[band]
    if R <= 0:
        return 1.0
    sc = CENTERS * s
    inside = sc <= R
    w = np.where(sc > 0, sc ** (k - 1), 1.0)
    num = float((HIST[inside] * w[inside]).sum()) * s * s
    den = 2 * math.pi * R ** (k + 1) / (k + 1)
    return min(1.0, num / den)


def bll(k, n, p):
    p = min(max(p, 1e-12), 1 - 1e-12)
    return k * math.log(p) + (n - k) * math.log(1 - p)


SAT = sum(bll(l, 10 * s, l / (10 * s)) + bll(c, l, c / l) for _, _, _, s, l, c in STATES)

for name, cd in CAND.items():
    ll = 0.0
    rows = []
    for lab, band, hr, s, l, c in STATES:
        R = R0 * (1 - hr / 100)
        C = cov(band, R)
        pl = min(1.0, 0.96 * C)
        rc = cd[band] / 2
        pc = 1.0 if R <= rc else min(1.0, (rc / R) ** 2 / C)
        ll += bll(l, 10 * s, pl) + bll(c, l, pc)
        zc = (c / l - pc) / math.sqrt(max(pc * (1 - pc), 1e-12) / l)
        rows.append((lab, pl, l / (10 * s), pc, c / l, zc))
    print(f"candidate {name} FIXED k=1 eps=0.96: deviance {2 * (SAT - ll):.1f}")
    for lab, pl, ol, pc, oc, zc in rows:
        print(f"  {lab:14s} pL {pl:.3f}/{ol:.3f}  pC {pc:.4f}/{oc:.4f} zC {zc:5.2f}")
