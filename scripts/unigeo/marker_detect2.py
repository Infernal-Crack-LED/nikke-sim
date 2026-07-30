#!/usr/bin/env python3
"""Pellet-marker detection v2 — matched annular filter.

Marker anatomy (measured, frame 315 radial profiles):
  WHITE pellet marker = bright interior (~250) + dark-grey ring outline at r~5-6 (~160)
                        + bright recovery outside (~230). Outer diameter ~13 px.
  RED core marker     = red-filled circle, same size (roundness separates it from the
                        wedge-shaped binary hit-markers inside the crosshair).
"""
import cv2
import numpy as np


def _kernels():
    """disc(r<=2), annulus(4.5..6.5), annulus(8..10) — normalized"""
    sz = 21
    c = sz // 2
    yy, xx = np.mgrid[0:sz, 0:sz]
    d = np.hypot(xx - c, yy - c)
    k_in = (d <= 2.2).astype(np.float32)
    k_ring = ((d >= 4.2) & (d <= 6.6)).astype(np.float32)
    k_out = ((d >= 8.0) & (d <= 10.0)).astype(np.float32)
    return (k_in / k_in.sum(), k_ring / k_ring.sum(), k_out / k_out.sum())


K_IN, K_RING, K_OUT = _kernels()


def _closed_ring(gray_f, x, y, r_ring=5.5, n_ang=16):
    """verify the dark outline is CLOSED: every angular sample at r_ring is dark
    vs the interior, and the outside recovers. Returns True/False."""
    h, w = gray_f.shape
    inside = []
    for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
        px, py = int(x) + dx, int(y) + dy
        if 0 <= px < w and 0 <= py < h:
            inside.append(gray_f[py, px])
    if not inside:
        return False
    inside = float(np.mean(inside))
    if inside < 180:
        return False
    ring_vals, out_vals = [], []
    for a in np.linspace(0, 2 * np.pi, n_ang, endpoint=False):
        rx, ry = int(round(x + r_ring * np.cos(a))), int(round(y + r_ring * np.sin(a)))
        ox, oy = int(round(x + 9.0 * np.cos(a))), int(round(y + 9.0 * np.sin(a)))
        if not (0 <= rx < w and 0 <= ry < h and 0 <= ox < w and 0 <= oy < h):
            return False
        ring_vals.append(gray_f[ry, rx])
        out_vals.append(gray_f[oy, ox])
    ring_vals = np.array(ring_vals, float)
    out_vals = np.array(out_vals, float)
    # closed: at least 14/16 ring samples clearly below the interior; median dip strong;
    # outside recovers on most angles
    dark = (inside - ring_vals) > 25
    recov = (out_vals - ring_vals) > 15
    med_ring = float(np.median(ring_vals))
    # marker outlines are GREY (~150-170); popup digit holes are bounded by BLACK
    # glyph outlines (~40-80) — the darkness floor separates them
    if med_ring < 118 or ring_vals.min() < 70:
        return False
    dip = inside - med_ring
    return dark.sum() >= 14 and 45 < dip < 130 and recov.sum() >= 11


def white_markers(gray_f, thresh=55.0):
    """score = inside + outside - 2*ring; peaks then verified as CLOSED rings"""
    m_in = cv2.filter2D(gray_f, -1, K_IN)
    m_ring = cv2.filter2D(gray_f, -1, K_RING)
    m_out = cv2.filter2D(gray_f, -1, K_OUT)
    score = m_in + m_out - 2.0 * m_ring
    cand = (score > thresh) & (m_in > 180) & (m_in - m_ring > 40)
    score_sup = np.where(cand, score, 0).astype(np.float32)
    dil = cv2.dilate(score_sup, np.ones((9, 9), np.uint8))
    peaks = (score_sup == dil) & (score_sup > 0)
    ys, xs = np.where(peaks)
    out = []
    for y, x in zip(ys, xs):
        if _closed_ring(gray_f, x, y):
            out.append((float(x), float(y), float(score[y, x])))
    return out


def red_markers(redness_f, min_area=45, max_area=220):
    """red-filled circles; wedges/capsules rejected by circularity"""
    m = (redness_f > 110).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, st, cent = cv2.connectedComponentsWithStats(m, 8)
    out = []
    for i in range(1, n):
        a = st[i, cv2.CC_STAT_AREA]
        if not (min_area <= a <= max_area):
            continue
        comp = (lab == i).astype(np.uint8)
        cnts, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        if not cnts:
            continue
        per = cv2.arcLength(cnts[0], True)
        if per <= 0:
            continue
        circ = 4 * np.pi * a / (per * per)
        w, h = st[i, cv2.CC_STAT_WIDTH], st[i, cv2.CC_STAT_HEIGHT]
        aspect = max(w, h) / max(min(w, h), 1)
        if circ > 0.72 and aspect < 1.45:
            out.append((float(cent[i][0]), float(cent[i][1]), float(circ)))
    return out


def detect(im, cx, cy, zone=115):
    """all pellet markers within `zone` of the disc centre; returns (x,y,kind,score)"""
    x0 = max(int(cx) - zone - 15, 0)
    y0 = max(int(cy) - zone - 15, 0)
    sz = 2 * (zone + 15)
    crop = im[y0:y0 + sz, x0:x0 + sz]
    b = crop[:, :, 0].astype(np.float32)
    g = crop[:, :, 1].astype(np.float32)
    r = crop[:, :, 2].astype(np.float32)
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY).astype(np.float32)
    redness = np.clip(r - np.maximum(g, b), 0, 255).astype(np.float32)

    marks = []
    for x, y, s in white_markers(gray):
        # not a red-dominant spot (else white filter can fire on red circle interiors)
        if redness[int(y), int(x)] >= 60 or np.hypot(x + x0 - cx, y + y0 - cy) > zone:
            continue
        # COLOUR NEUTRALITY: marker interior and outline are grey/white; gold coins
        # (bright centre, dark outline, similar size) are warm -> reject saturated colour
        iy, ix = int(y), int(x)
        cr, cg, cb = r[iy, ix], g[iy, ix], b[iy, ix]
        if max(cr, cg, cb) - min(cr, cg, cb) > 35:
            continue
        ring_sat = []
        for a in np.linspace(0, 2 * np.pi, 8, endpoint=False):
            px, py = int(round(x + 5.5 * np.cos(a))), int(round(y + 5.5 * np.sin(a)))
            if 0 <= px < crop.shape[1] and 0 <= py < crop.shape[0]:
                ring_sat.append(max(r[py, px], g[py, px], b[py, px]) - min(r[py, px], g[py, px], b[py, px]))
        if ring_sat and np.median(ring_sat) > 45:
            continue
        marks.append((x + x0, y + y0, 'white', s))
    for x, y, c in red_markers(redness):
        if np.hypot(x + x0 - cx, y + y0 - cy) <= zone:
            marks.append((x + x0, y + y0, 'red', c))
    # dedupe (white peak inside a red circle -> keep red)
    out = []
    for m in sorted(marks, key=lambda t: 0 if t[2] == 'red' else 1):
        if all(np.hypot(m[0] - o[0], m[1] - o[1]) >= 6 for o in out):
            out.append(m)
    return out


if __name__ == '__main__':
    import sys, glob
    C = np.load('b2_centers.npy')
    cmap = {int(row[0]): (row[1], row[2], row[3]) for row in C}
    files = sorted(glob.glob('w_b2/f*.jpg'))
    for idx in (int(a) for a in sys.argv[1:]):
        if idx not in cmap:
            print(idx, 'no disc')
            continue
        cx, cy, R = cmap[idx]
        im = cv2.imread(files[idx])
        mk = detect(im, cx, cy)
        n_w = sum(1 for m in mk if m[2] == 'white')
        n_r = sum(1 for m in mk if m[2] == 'red')
        rad = [(m[2][0], round(float(np.hypot(m[0] - cx, m[1] - cy)), 1)) for m in mk]
        print(f"frame {idx} t={46.5 + idx / 60:.2f}s white={n_w} red={n_r} {rad}")
        dbg = im.copy()
        cv2.circle(dbg, (int(cx), int(cy)), int(R), (255, 255, 0), 1)
        for x, y, k, s in mk:
            col = (0, 0, 255) if k == 'red' else (0, 255, 0)
            cv2.circle(dbg, (int(x), int(y)), 9, col, 2)
        xa, ya = int(cx) - 150, int(cy) - 140
        cv2.imwrite(f'mk2_{idx}.png',
                    cv2.resize(dbg[max(ya, 0):ya + 300, max(xa, 0):xa + 330], None,
                               fx=2.2, fy=2.2, interpolation=cv2.INTER_NEAREST))
