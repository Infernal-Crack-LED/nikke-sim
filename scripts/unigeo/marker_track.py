#!/usr/bin/env python3
"""Temporal pellet-marker tracker.

Per window: detect ring markers per frame (marker_detect2), associate into tracks,
gate SPAWNS to the disc (pellets land inside the grey circle — ruling 3), then cluster
spawn times into shots. Output per shot: (n_white, n_red, spawn radii relative to the
spawn-frame disc centre).
"""
import cv2
import numpy as np
import glob
import json
import marker_detect2 as M


def disc_centers(files, cache):
    try:
        arr = np.load(cache)
        return {int(r[0]): (r[1], r[2], r[3]) for r in arr}
    except Exception:
        pass
    prev = None
    cmap = {}
    for i, f in enumerate(files):
        im = cv2.imread(f)
        d = M.find_disc(im, prev)
        if d:
            cmap[i] = d
            prev = (d[0], d[1])
    np.save(cache, np.array([[i, *cmap[i]] for i in sorted(cmap)]))
    return cmap


def interp_centers(cmap, n):
    """linear interpolation across missing frames (clamped at the ends)"""
    ks = sorted(cmap)
    out = {}
    for i in range(n):
        if i in cmap:
            out[i] = cmap[i]
            continue
        lo = max((k for k in ks if k < i), default=None)
        hi = min((k for k in ks if k > i), default=None)
        if lo is None or hi is None:
            src = lo if lo is not None else hi
            if src is None:
                continue
            out[i] = cmap[src]
            continue
        t = (i - lo) / (hi - lo)
        a, b = cmap[lo], cmap[hi]
        out[i] = (a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2]))
    return out


def run_window(dirname, cache, t0, fps=60.0, spawn_margin=10.0):
    files = sorted(glob.glob(dirname + '/f*.jpg'))
    cmap = interp_centers(disc_centers(files, cache), len(files))
    tracks = []          # dicts: x,y,kind,spawn_frame,spawn_r,last_seen,seen
    for i, f in enumerate(files):
        if i not in cmap:
            continue
        cx, cy, R = cmap[i]
        im = cv2.imread(f)
        det = M.detect(im, cx, cy, zone=130)
        # de-dup detections tighter than physical marker spacing
        ded = []
        for m in sorted(det, key=lambda t: 0 if t[2] == 'red' else 1):
            if all(np.hypot(m[0] - o[0], m[1] - o[1]) >= 8 for o in ded):
                ded.append(m)
        for x, y, kind, s in ded:
            best = None
            for tr in tracks:
                # STATIC markers: match against the track ORIGIN, tight radius —
                # anything that drifts (rising coins, moving VFX) fragments and dies
                if i - tr['last_seen'] <= 12 and np.hypot(x - tr['x0'], y - tr['y0']) < 5:
                    if best is None or np.hypot(x - tr['x0'], y - tr['y0']) < np.hypot(x - best['x0'], y - best['y0']):
                        best = tr
            if best is not None:
                best['x'], best['y'] = x, y
                best['last_seen'] = i
                best['seen'] += 1
                if kind == 'red':
                    best['red_votes'] += 1
                continue
            # new spawn: must be on the disc (+margin)
            r_spawn = float(np.hypot(x - cx, y - cy))
            if r_spawn <= R + spawn_margin:
                tracks.append({'x': x, 'y': y, 'x0': x, 'y0': y, 'kind': kind, 'spawn_frame': i,
                               'spawn_r': r_spawn, 'last_seen': i, 'seen': 1,
                               'red_votes': 1 if kind == 'red' else 0})
    # retro-merge fragments: same screen spot, adjacent lifetimes -> one marker
    tracks.sort(key=lambda t: t['spawn_frame'])
    merged = []
    for t in tracks:
        host = None
        for m in merged:
            if (t['spawn_frame'] - m['last_seen'] <= 25
                    and np.hypot(t['x0'] - m['x0'], t['y0'] - m['y0']) < 6):
                host = m
                break
        if host is not None:
            host['last_seen'] = max(host['last_seen'], t['last_seen'])
            host['seen'] += t['seen']
            host['red_votes'] += t['red_votes']
        else:
            merged.append(t)
    # quality gate: a real marker persists a few frames
    merged = [t for t in merged if t['seen'] >= 3]
    for t in merged:
        t['kind'] = 'red' if t['red_votes'] >= max(1, t['seen'] // 3) else 'white'
    # cluster spawns into shots (gap > 0.35 s starts a new shot; cadence ~0.67 s)
    shots = []
    for t in merged:
        if shots and (t['spawn_frame'] - shots[-1]['frames'][0]) <= int(0.35 * fps):
            s = shots[-1]
        else:
            shots.append({'frames': [], 'markers': []})
            s = shots[-1]
        s['frames'].append(t['spawn_frame'])
        s['markers'].append(t)
    out = []
    for s in shots:
        n_w = sum(1 for t in s['markers'] if t['kind'] == 'white')
        n_r = sum(1 for t in s['markers'] if t['kind'] == 'red')
        out.append({
            't_video': round(t0 + s['frames'][0] / fps, 2),
            'landed': n_w + n_r, 'cores': n_r,
            'radii_white': sorted(round(t['spawn_r'], 1) for t in s['markers'] if t['kind'] == 'white'),
            'radii_red': sorted(round(t['spawn_r'], 1) for t in s['markers'] if t['kind'] == 'red'),
        })
    return out


if __name__ == '__main__':
    shots = run_window('w_b2', 'b2_centers.npy', 46.5)
    print(f"burst-2 window: {len(shots)} shot events")
    for s in shots:
        print(f"  t={s['t_video']:6.2f}  landed={s['landed']:2d} cores={s['cores']}  "
              f"rw={s['radii_white']} rr={s['radii_red']}")
    owner = [[9,0],[10,0],[9,1],[9,3],[10,0],[10,2],[10,1],[9,0],[9,0],[9,1],[9,1],[9,1],[8,0],[10,0],[9,1],[10,0]]
    print("\nowner near_ON :", [tuple(x) for x in owner])
    print("machine       :", [(s['landed'], s['cores']) for s in shots])
    json.dump(shots, open('b2_shots.json', 'w'), indent=1)
