#!/usr/bin/env python3
"""W1 - M1 fallback: fit-selection of the long-band core-size series.

Scores candidate core-DIAMETER series against the 18 measured cells
(docs/probe-data/soda-tb-sg-core-hr-windows.json ownerCount.shots +
docs/probe-data/soda-tb-midfar-replication.json) under the H1-Part-1 model:

  pellets: per-area density ~ r^(k-1) in the aim circle (k=1 uniform per area)
  R0 = 0.648 * 250 / 2 = 81 px ; R(hr) = R0 * (1 - hr/100)
  landing p = eps * coverage_k(band, R(hr))
  core-per-landed p = (r_core(band)/R(hr))^(k+1) / coverage_k(band, R(hr)),
  clamped [0,1]; eps and k in [0.8,1.6] profiled per candidate.

Coverage from scripts/unigeo/silhouette-radii-hist.json (gen-coverage.py -
the pocket-inclusive committed silhouette, 114267 px).

Candidates (core diameters near/mid/midfar/far):
  A traced        31 / 28   / 21   / 17
  B offset-curve  31 / 27   / 23.9 / 21.5
  C 1/d           31 / 20.9 / 15.8 / 12.7

Also: reference reproduction (traced radii 79.3/48.2, core 16.1*20.7/d), and
band-distance sensitivity (distances at each end of the 10-wide owner windows;
candidate C re-derived from 1/d at the shifted distances, A/B held fixed).
"""
import json
import math
import os

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
side = json.load(open(os.path.join(HERE, "silhouette-radii-hist.json")))
HIST = np.array(side["histCounts"], dtype=float)
BIN = side["meta"]["histBinPx"]
EDGES = np.arange(len(HIST) + 1) * BIN
CENTERS = (EDGES[:-1] + EDGES[1:]) / 2.0

R0 = 0.648 * 250 / 2  # 81.0
BANDS = ["near", "mid", "midfar", "far"]

# 9 measured window states: (label, band, hr, shots, landed, cores)
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

CANDIDATES = {
    "A": {"near": 31.0, "mid": 28.0, "midfar": 21.0, "far": 17.0},
    "B": {"near": 31.0, "mid": 27.0, "midfar": 23.9, "far": 21.5},
    "C": {"near": 31.0, "mid": 20.9, "midfar": 15.8, "far": 12.7},
}

ANCHOR_DIST = {"near": 20.7, "mid": 30.7, "midfar": 40.7, "far": 50.7}


def coverage(band, R, k, dist):
    s = dist["near"] / dist[band]
    if R <= 0:
        return 1.0
    scaled = CENTERS * s
    inside = scaled <= R
    wgt = np.where(scaled > 0, scaled ** (k - 1.0), 1.0)
    num = float((HIST[inside] * wgt[inside]).sum()) * s * s
    den = 2.0 * math.pi * (R ** (k + 1.0)) / (k + 1.0)
    return min(1.0, num / den)


def binom_ll(k, n, p):
    p = min(max(p, 1e-12), 1 - 1e-12)
    return k * math.log(p) + (n - k) * math.log(1 - p)


def sat_ll():
    tot = 0.0
    for _, _, _, shots, landed, cores in STATES:
        n = 10 * shots
        ph = landed / n
        tot += binom_ll(landed, n, ph)
        ph2 = cores / landed
        tot += binom_ll(cores, landed, ph2)
    return tot


SAT = sat_ll()


def model_ll(core_diam, eps, k, dist, radii=None):
    """radii: optional override {0.0: R_hr0, 38.91: R_hr39} (traced-radii ref)."""
    ll = 0.0
    cells = []
    for label, band, hr, shots, landed, cores in STATES:
        R = radii[hr] if radii else R0 * (1 - hr / 100.0)
        cov = coverage(band, R, k, dist)
        p_land = min(1.0, eps * cov)
        n = 10 * shots
        ll += binom_ll(landed, n, p_land)
        rc = core_diam[band] / 2.0
        p_core = min(1.0, (rc / R) ** (k + 1.0) / cov) if R > rc else 1.0
        ll += binom_ll(cores, landed, p_core)
        cells.append((label, band, hr, n, landed, p_land, landed, cores, p_core))
    return ll, cells


def fit(core_diam, dist, radii=None, eps_grid=None, k_grid=None):
    eps_grid = eps_grid if eps_grid is not None else np.arange(0.85, 1.0001, 0.0005)
    k_grid = k_grid if k_grid is not None else np.arange(0.8, 1.6001, 0.01)
    best = None
    for k in k_grid:
        for eps in eps_grid:
            ll, _ = model_ll(core_diam, eps, k, dist, radii)
            if best is None or ll > best[0]:
                best = (ll, eps, k)
    ll, eps, k = best
    _, cells = model_ll(core_diam, eps, k, dist, radii)
    dev = 2 * (SAT - ll)
    return {"logL": ll, "eps": round(float(eps), 4), "k": round(float(k), 3), "deviance": dev, "cells": cells}


def zrow(cells):
    out = []
    for label, band, hr, n, landed, p_land, nl, cores, p_core in cells:
        zL = (landed / n - p_land) / math.sqrt(max(p_land * (1 - p_land), 1e-12) / n)
        zC = (cores / nl - p_core) / math.sqrt(max(p_core * (1 - p_core), 1e-12) / nl)
        out.append((label, p_land, landed / n, zL, p_core, cores / nl, zC))
    return out


def report(name, res):
    print(f"\n=== {name}: deviance {res['deviance']:.1f} (logL {res['logL']:.2f}), eps={res['eps']}, k={res['k']} ===")
    print(f"{'cell':14s} {'pL_pred':>7s} {'pL_obs':>7s} {'zL':>6s} {'pC_pred':>8s} {'pC_obs':>7s} {'zC':>6s}")
    for label, pl, ol, zl, pc, oc, zc in zrow(res["cells"]):
        print(f"{label:14s} {pl:7.3f} {ol:7.3f} {zl:6.2f} {pc:8.4f} {oc:7.4f} {zc:6.2f}")


print(f"saturated logL = {SAT:.2f}")

# ── main scorecard: anchored distances, engine-form radii ──
results = {}
for name, cd in CANDIDATES.items():
    results[name] = fit(cd, ANCHOR_DIST)
    report(f"candidate {name} (anchored 20.7/30.7/40.7/50.7, R0=81, linear law)", results[name])

# ── reference reproduction: traced radii + 1/d-scaled traced core (16.1 px near) ──
traced_core = {b: 2 * 16.1 * ANCHOR_DIST["near"] / ANCHOR_DIST[b] for b in BANDS}
ref = fit(traced_core, ANCHOR_DIST, radii={0.0: 79.3, 38.91: 48.2})
report("REF reproduction (traced R 79.3/48.2, core 16.1*20.7/d)", ref)

# ── sensitivity: distances at each end of the 10-wide windows ──
for tag, dist in (
    ("LOW ends 15/25/35/45", {"near": 15.0, "mid": 25.0, "midfar": 35.0, "far": 45.0}),
    ("HIGH ends 25/35/45/55", {"near": 25.0, "mid": 35.0, "midfar": 45.0, "far": 55.0}),
):
    print(f"\n########## sensitivity: {tag} ##########")
    cands = dict(CANDIDATES)
    cands = {k: dict(v) for k, v in cands.items()}
    # candidate C is the 1/d series -> re-derive at the shifted distances
    cands["C"] = {b: 31.0 * dist["near"] / dist[b] for b in BANDS}
    print("re-derived C diameters:", {b: round(v, 1) for b, v in cands["C"].items()})
    for name, cd in cands.items():
        r = fit(cd, dist)
        print(
            f"candidate {name}: deviance {r['deviance']:.1f}  eps={r['eps']} k={r['k']}"
        )
