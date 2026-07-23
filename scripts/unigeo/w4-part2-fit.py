#!/usr/bin/env python3
"""W4 - M4 Part-2 fits: AR + SMG (delta0, f_bloom) by binomial MLE on the CLEAN
cells (P-CELLS-corrected set), vs the incumbent delta-cone on the SAME cells.

Model (H1 Part 2): single-bullet core-per-hit =
  lens(R_eff, r_core, delta) / (pi R_eff^2)
  R_class(hr) = 0.648*scale/2 * max(0, 1-hr/100);  R_eff = f_bloom * R_class
  delta(hr)   = delta0 * max(0, 1-hr/120)   (pre-committed law, H=120 fixed)
  r_core from the W1 FIT-SELECTED series (candidate C), near shared with A.

Incumbent cone (frozen 2026-07-19 constants, exact live formulas):
  sigma = 0.648*scale/2/2.53 * max(0.10, 1-shrink*hr), shrink AR .009 SMG .004
  delta = DELTA0 * max(0, 1-hr/120), DELTA0 AR 18 SMG 16
  p = min(1, RicianCDF(r_core_A, sigma, delta))   [cone basis = candidate A]

Cells (provenance: closed handoffs 2026-07-19-geometry-campaign-findings.md:26-35,
2026-07-18-core-rate-vs-hitrate-test-plan.md:382-431; coreband2-moran-ar.json).
"""
import math

import numpy as np

CORE_C = {"near": 31.0, "mid": 20.9, "midfar": 15.8, "far": 12.7}  # FIT-SELECTED (W1)
CORE_A = {"near": 31.0, "mid": 28.0, "midfar": 21.0, "far": 17.0}  # traced (cone basis)
SCALE = {"AR": 75.0, "SMG": 110.0}

# AR clean fitted cells: (label, band, hr, k, n)
AR_CELLS = [
    ("moran near (recon, n=120)", "near", 0.0, 48, 120),
    ("moran mid 9/57", "mid", 0.0, 9, 57),
    ("moran midfar 6/42", "midfar", 0.0, 6, 42),
    ("moran far 2/40", "far", 0.0, 2, 40),
    ("scarlet far spawn 3/36", "far", 0.0, 3, 36),
    ("blanc far spawn 20/180 @HR39.24", "far", 39.24, 20, 180),
]
JILL_CONSTRAINT = ("near", 80.78, 0.85)  # predicted near core at HR 80.78 must be >= 0.85

SMG_CELLS = [
    ("chisato near HR0 32/109", "near", 0.0, 32, 109),
    ("chisato near HR22.37 57/156", "near", 22.37, 57, 156),
]

# validation-only series (never fitted)
QUENCY = [("near", 14, 24), ("mid", 7, 17), ("midfar", 4, 15), ("far", 5, 35)]  # HR ~61.1, biased high
LM15 = [("near", 0.238, 122), ("mid", 0.092, 100), ("midfar", 0.042, 100), ("far", 0.014, 100)]
LABEL23 = [("near", 0.37, 48), ("mid", 0.28, 50), ("midfar", 0.20, 50), ("far", 0.13, 50)]


def lens_area(R, r, d):
    if d >= R + r:
        return 0.0
    if d <= abs(R - r):
        m = min(R, r)
        return math.pi * m * m
    a = (d * d + R * R - r * r) / (2 * d * R)
    b = (d * d + r * r - R * R) / (2 * d * r)
    a = min(1, max(-1, a))
    b = min(1, max(-1, b))
    t = (-d + R + r) * (d + R - r) * (d - R + r) * (d + R + r)
    return R * R * math.acos(a) + r * r * math.acos(b) - 0.5 * math.sqrt(max(0.0, t))


def uni_p(weapon, band, hr, d0, fb, core=CORE_C):
    rc = core[band] / 2
    Rc = 0.648 * SCALE[weapon] / 2 * max(0.0, 1 - hr / 100)
    Re = fb * Rc
    d = d0 * max(0.0, 1 - hr / 120)
    if Re <= 0:
        return 1.0 if d <= rc else 0.0
    return lens_area(Re, rc, d) / (math.pi * Re * Re)


def cone_p(weapon, band, hr):
    rc = CORE_A[band] / 2
    shrink = {"AR": 0.009, "SMG": 0.004}[weapon]
    sig = 0.648 * SCALE[weapon] / 2 / 2.53 * max(0.10, 1 - shrink * max(0, hr))
    delta = {"AR": 18.0, "SMG": 16.0}[weapon] * max(0.0, 1 - max(0, hr) / 120)
    # Rician CDF via Simpson, matching sg-geometry.ts offsetCoreProb (N=64)
    if delta == 0:
        return min(1.0, 1 - math.exp(-(rc * rc) / (2 * sig * sig)))
    s2 = sig * sig
    N = 64
    h = rc / N

    def f(rho):
        return (rho / s2) * math.exp(-(rho * rho + delta * delta) / (2 * s2)) * np.i0(rho * delta / s2)

    tot = f(0) + f(rc)
    for i in range(1, N):
        tot += (4 if i % 2 else 2) * f(i * h)
    return min(1.0, float(h / 3 * tot))


def bll(k, n, p):
    p = min(max(p, 1e-12), 1 - 1e-12)
    return k * math.log(p) + (n - k) * math.log(1 - p)


def deviance(cells, pfun):
    sat = sum(bll(k, n, k / n) for _, _, _, k, n in cells)
    ll = sum(bll(k, n, pfun(band, hr)) for _, band, hr, k, n in cells)
    return 2 * (sat - ll)


def fit(weapon, cells, core=CORE_C, constraint=None):
    best = None
    for d0 in np.arange(0.0, 60.001, 0.1):
        for fb in np.arange(0.40, 1.0001, 0.0025):
            if constraint:
                band, hr, floor = constraint
                if uni_p(weapon, band, hr, d0, fb, core) < floor:
                    continue
            ll = sum(bll(k, n, uni_p(weapon, band, hr, d0, fb, core)) for _, band, hr, k, n in cells)
            if best is None or ll > best[0]:
                best = (ll, d0, fb)
    return best


print("=== AR fit (clean cells, jill saturation constraint) ===")
for core_name, core in (("C (FIT-SELECTED)", CORE_C), ("A (traced, cone basis)", CORE_A)):
    ll, d0, fb = fit("AR", AR_CELLS, core, JILL_CONSTRAINT)
    sat = sum(bll(k, n, k / n) for _, _, _, k, n in AR_CELLS)
    dev = 2 * (sat - ll)
    print(f"\ncore series {core_name}: delta0_AR={d0:.1f}px  f_bloom_AR={fb:.3f}  deviance={dev:.2f}")
    for lab, band, hr, k, n in AR_CELLS:
        p = uni_p("AR", band, hr, d0, fb, core)
        z = (k / n - p) / math.sqrt(max(p * (1 - p), 1e-12) / n)
        print(f"  {lab:34s} pred {p:.3f}  obs {k/n:.3f}  z {z:5.2f}")
    jb, jh, jf = JILL_CONSTRAINT
    pj = uni_p("AR", jb, jh, d0, fb, core)
    print(f"  jill near @HR80.78 predicted {pj:.3f} (constraint >= {jf})")
    print(f"  D2: delta(80.78) = {d0 * max(0, 1 - 80.78/120):.2f} px (bound <= ~10.8)")
    print(f"  D2 ceiling (near HR0): (15.5/(f_bloom*24.3))^2 -> pred cap {(15.5/(fb*24.3))**2:.3f}"
          f"  [ceiling test {'VALID' if fb >= 0.95 else 'VOID (f_bloom < 0.95)'}]")

cone_dev_ar = deviance(AR_CELLS, lambda b, h: cone_p("AR", b, h))
print(f"\nincumbent cone deviance on the SAME AR cells: {cone_dev_ar:.2f}")
for lab, band, hr, k, n in AR_CELLS:
    p = cone_p("AR", band, hr)
    z = (k / n - p) / math.sqrt(max(p * (1 - p), 1e-12) / n)
    print(f"  {lab:34s} pred {p:.3f}  obs {k/n:.3f}  z {z:5.2f}")
print(f"  cone jill near @HR80.78 predicted {cone_p('AR','near',80.78):.3f}")

print("\n=== SMG fit (SATURATED - 2 cells, 2 params; result is CALIBRATION, capped at LOG) ===")
ll, d0s, fbs = fit("SMG", SMG_CELLS, CORE_C)
sat = sum(bll(k, n, k / n) for _, _, _, k, n in SMG_CELLS)
print(f"delta0_SMG={d0s:.1f}px  f_bloom_SMG={fbs:.3f}  deviance={2*(sat-ll):.4f}")
for lab, band, hr, k, n in SMG_CELLS:
    print(f"  {lab:34s} pred {uni_p('SMG', band, hr, d0s, fbs):.3f}  obs {k/n:.3f}")
cone_dev_smg = deviance(SMG_CELLS, lambda b, h: cone_p("SMG", b, h))
print(f"incumbent cone deviance on the SAME SMG cells: {cone_dev_smg:.2f}")
for lab, band, hr, k, n in SMG_CELLS:
    print(f"  {lab:34s} cone pred {cone_p('SMG', band, hr):.3f}  obs {k/n:.3f}")

print("\n=== validation-only direction checks (never fitted) ===")
print("quency-escape-queen SMG @HR~61.1 (biased-high; PASS iff pred <= obs + 3sd):")
for band, k, n in QUENCY:
    obs = k / n
    sd = math.sqrt(obs * (1 - obs) / n)
    p = uni_p("SMG", band, 61.1, d0s, fbs)
    pc = cone_p("SMG", band, 61.1)
    print(f"  {band:7s} obs {obs:.3f}+3sd={obs+3*sd:.3f}  uni {p:.3f} {'OK' if p <= obs+3*sd else 'VIOLATION'}  cone {pc:.3f}")
print("little-mermaid SMG @HR15 (biased-high; pred <= obs + 3sd):")
for band, obs, n in LM15:
    sd = math.sqrt(obs * (1 - obs) / n)
    p = uni_p("SMG", band, 15.0, d0s, fbs)
    pc = cone_p("SMG", band, 15.0)
    print(f"  {band:7s} obs {obs:.3f}+3sd={obs+3*sd:.3f}  uni {p:.3f} {'OK' if p <= obs+3*sd else 'VIOLATION'}  cone {pc:.3f}")
print("Label AR @HR~23 (thin, spawn method; direction only):")
# uses the AR fit under core C
llA, d0a, fba = fit("AR", AR_CELLS, CORE_C, JILL_CONSTRAINT)
for band, obs, n in LABEL23:
    p = uni_p("AR", band, 23.0, d0a, fba)
    pc = cone_p("AR", band, 23.0)
    print(f"  {band:7s} obs {obs:.3f}  uni {p:.3f}  cone {pc:.3f}")
print("scarlet AR near per-frame 0.394 vs D2 ceiling 0.417:")
print(f"  uni pred near HR0 {uni_p('AR','near',0,d0a,fba):.3f}; ceiling {(15.5/(fba*24.3))**2:.3f}"
      f" ({'VALID' if fba >= 0.95 else 'VOID: f_bloom_AR < 0.95'})")
print("scarlet near spawn 0.25 (fade-stack low-n; report-only, not fitted)")
