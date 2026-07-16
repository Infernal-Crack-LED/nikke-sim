#!/usr/bin/env python3
"""boss-study scanner — mechanical extraction pass for boss-profile studies.

Turns a fight recording into an observation log (observations.json): a per-sample
timeline of the focus unit's weapon state (ammo-box tracking + glyph ammo reads +
digit stability), UI presence (fight clock), Full-Burst splash times, the
face-count cover metric, and derived candidate not-firing windows with evidence
sheets. NO interpretation happens here — classifying windows into boss downtime /
burst pauses / natural reloads is the authoring step's job (/boss-study skill),
which runs BLIND on this file alone.

Deps: ffmpeg + numpy + PIL only (same policy as scripts/probe/classify.py).

Usage:
  python3 scripts/boss-study/scan.py <video> --out <dir> [--fps-aim 8] [--fps-ui 2]

Detector design notes (calibrated on docs/probes/control/crown.MP4, 2026-07-16;
calibration frame timestamps logged in observations.json for the grading record):
- The ammo box rides ~90px left of the moving auto-aim reticle. Found per frame by
  masked NCC (template ammo-box-template.png) over the central search region;
  peaks verified by the digit-region signature. Two box states exist:
  NORMAL  = bright digits on dark fill (bright ~0.17 / dark110 ~0.57 / mean ~120)
  INVERTED= dark "000" on bright fill + depleted mag bar  -> RELOADING.
- Glyph reader (glyphs.npz, 0-9): reads are authoritative ONLY on settled frames;
  while firing, the rolling ones/tens digits motion-blur and half-scrolled rolls
  misread systematically (a scrolling 8 composites toward 6). Validated on a 60fps
  hot stretch: settled frames decrement 1 per 2 frames = ~30 counter-ticks/s hot
  (plus small kit refills, e.g. +5). At 4-8 Hz sampling the digit region therefore
  ALWAYS changes while firing -> digit-region correlation (dcorr) >= 0.90 across
  consecutive found samples = HOLDING fire.
- The 3-segment bar above the box is a magazine-fill bar (barFrac ~ ammo/mag), a
  no-OCR cross-check on reads.
- Low-confidence samples are NEVER classified as firing: BOX_ABSENT and unverified
  peaks count toward candidate windows (Fable gate rev 7).
"""
import argparse, json, os, subprocess, sys
import numpy as np
from PIL import Image

try:
    import cv2  # optional: enables the v1 face/cover detector (opencv-python-headless<5)
except ImportError:
    cv2 = None

SRC_W, SRC_H = 2622, 1206
AIM = dict(x=900, y=380, w=1000, h=520)     # ammo-box search region (full-res crop)
DX0, DY0, DX1, DY1 = 8, 20, 70, 52          # digit window within box
BAR = (2, 4, 70, 13)                        # mag bar strip within box (x0,y0,x1,y1)
UI_W = 656
DMG_BOX_SMALL = (283, 2, 373, 15)           # top-centre damage box on small frame
BURST_METER_SMALL = (636, 121, 655, 126)    # right-edge burst meter (orig x2540-2620, y485-502):
                                            # grey/white = charging, red/flashing = INSIDE Full
                                            # Burst (owner-identified; validated on crown.MP4 —
                                            # 12 FBs, all ~10s). Flashes ~1Hz, so merge gaps <=1s.
BURST_RED_THRESH = 0.25
YELLOW_THRESH = 0.11                        # probe-processing whole-frame splash threshold
SPLASH_MIN_GAP = 10.0
DCORR_STATIC = 0.90                         # >= means digit region unchanged (holding fire)
CAND_MIN_SEC = 0.5                          # min not-firing run to emit a candidate window

HERE = os.path.dirname(os.path.abspath(__file__))

def sh(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"cmd failed: {cmd}\n{r.stderr[-2000:]}")

def gray_arr(img): return np.asarray(img.convert('L'), dtype=np.float64)

# ---------------- glyph reader ----------------
class GlyphReader:
    def __init__(self, npz_path):
        self.T = {ch: arr for ch, arr in np.load(npz_path).items()}

    @staticmethod
    def segment(d):
        b = d > 185
        colcnt = b.sum(0)
        spans, cur = [], None
        for i, c in enumerate(colcnt):
            if c >= 2:
                cur = i if cur is None else cur
            else:
                if cur is not None and i - cur >= 4: spans.append((cur, i))
                cur = None
        if cur is not None and len(colcnt) - cur >= 4: spans.append((cur, len(colcnt)))
        out = []
        for x0, x1 in spans:
            sub = b[:, x0:x1]
            rows = np.where(sub.any(1))[0]
            if len(rows) < 8: continue
            sub = sub[rows[0]:rows[-1] + 1]
            im = Image.fromarray((sub * 255).astype(np.uint8)).resize((12, 20), Image.NEAREST)
            out.append((np.asarray(im) > 127).astype(np.uint8))
        return out

    def read(self, d):
        out = ''
        for g in self.segment(d):
            best, bd = None, 1e9
            for ch, t in self.T.items():
                dist = (g != t).mean()
                if dist < bd: bd, best = dist, ch
            out += best if bd < 0.28 else '?'
        return out

# ---------------- ammo-box tracker ----------------
def classify_digit_region(d):
    """-> 'normal' | 'inverted' | None"""
    B, D, M = (d > 200).mean(), (d < 110).mean(), d.mean()
    if 0.10 <= B <= 0.32 and 0.38 <= D <= 0.75 and 95 <= M <= 155:
        return 'normal'
    # inverted (reload): dark glyph strokes on bright fill
    if B >= 0.25 and 0.15 <= D <= 0.55 and M >= 140:
        return 'inverted'
    return None

class BoxTracker:
    def __init__(self, tpl_png):
        tpl = gray_arr(Image.open(tpl_png))
        self.tpl, (self.th, self.tw) = tpl, tpl.shape
        m = np.ones_like(tpl); m[DY0:DY1, DX0:DX1] = 0.0
        self.mask, self.n_m = m, m.sum()
        self.tz = (tpl - (tpl * m).sum() / self.n_m) * m
        self.tnorm = np.sqrt((self.tz * self.tz).sum())

    def find(self, reg, topk=60):
        F = np.fft.rfft2(reg); shp = reg.shape
        corr = np.fft.irfft2(F * np.fft.rfft2(self.tz[::-1, ::-1], shp), shp)[self.th-1:, self.tw-1:]
        ones = np.fft.rfft2(self.mask[::-1, ::-1], shp)
        s1 = np.fft.irfft2(F * ones, shp)[self.th-1:, self.tw-1:]
        s2 = np.fft.irfft2(np.fft.rfft2(reg * reg) * ones, shp)[self.th-1:, self.tw-1:]
        ncc = corr / (np.sqrt(np.maximum(s2 - s1 * s1 / self.n_m, 1e-6)) * self.tnorm)
        flat = ncc.ravel().argsort()[::-1]
        seen = []
        for idx in flat[:200000]:
            y, x = divmod(int(idx), ncc.shape[1])
            if any(abs(y - sy) < 15 and abs(x - sx) < 15 for sy, sx in seen): continue
            seen.append((y, x))
            d = reg[y+DY0:y+DY1, x+DX0:x+DX1]
            if d.shape != (DY1-DY0, DX1-DX0): continue
            state = classify_digit_region(d)
            if state:
                bar = reg[y+BAR[1]:y+BAR[3], x+BAR[0]:x+BAR[2]]
                return dict(x=x, y=y, ncc=round(float(ncc[y, x]), 3), rank=len(seen),
                            state=state, digits=d, barFrac=round(float((bar > 190).mean()), 3))
            if len(seen) >= topk: break
        return None

def digit_corr(a, b):
    if a is None or b is None: return None
    az, bz = a - a.mean(), b - b.mean()
    den = np.sqrt((az * az).sum() * (bz * bz).sum())
    return round(float((az * bz).sum() / den), 4) if den > 1e-6 else None

# ---------------- small-frame detectors ----------------
def ui_present(g_small):
    x0, y0, x1, y1 = DMG_BOX_SMALL
    strip = g_small[y0:y1, x0:x1]
    return bool((strip < 90).mean() > 0.45 and 0.02 < (strip > 180).mean() < 0.5)

def yellow_frac(c):
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    return float(((r > 150) & (g > 120) & (b < 120) & (r + g > 2 * b + 100)).mean())

def burst_red_frac(c):
    x0, y0, x1, y1 = BURST_METER_SMALL
    strip = c[y0:y1, x0:x1]
    r, g = strip[..., 0], strip[..., 1]
    return float(((r > 170) & (r - g > 80)).mean())

class FaceDetectorV1:
    """CALIBRATED cover/boss-walk detector (2026-07-16): nagadomi's lbpcascade_animeface
    (vendored XML, MIT) on 1311-wide frames. The squad turns FRONTAL (faces to camera) during
    every boss-unhittable walk and during forced-cover phases — measured on 714-noon/1.mp4
    (all five transitions + the fight-end cover phase) with ZERO false positives across
    crown.MP4. Faces in the squad-strip portrait box are excluded; count threshold is
    comp-aware (unitCount-1); pre/post-fight lineups are frontal too, so gate on the fight
    clock downstream."""
    STRIP = (450, 830, 510)   # exclude portraits: x0..x1 when center-y below this

    def __init__(self, xml_path):
        self.casc = cv2.CascadeClassifier(xml_path)
        if self.casc.empty():
            raise RuntimeError(f'cascade failed to load: {xml_path}')

    def count(self, bgr_1311):
        gray = cv2.equalizeHist(cv2.cvtColor(bgr_1311, cv2.COLOR_BGR2GRAY))
        faces = self.casc.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=4,
                                           minSize=(45, 45))
        x0, x1, ymin = self.STRIP
        keep = [(x, y, w) for x, y, w, h in faces
                if not (y + h / 2 > ymin and x0 < x + w / 2 < x1)]
        if not keep:
            return 0, 0.0
        xs = [x + w / 2 for x, y, w in keep]
        return len(keep), round((max(xs) - min(xs)) / 1311, 3)

def face_metric(c):
    """UNCALIBRATED forced-cover metric v0 (superseded by FaceDetectorV1; kept as a log column).
    Counts head-sized skin blobs in the head band. Baseline on normal control
    footage already reaches 5-8 -> treat as DEAD unless a later calibration
    recording separates the distributions. Recorded for the log regardless."""
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    h = c.shape[0]
    skin = (r > 95) & (g > 40) & (b > 20) & (r > g) & (g > b) & (r - b > 30) & (r - g > 12)
    m = np.zeros_like(skin); m[int(h*0.30):int(h*0.75), :] = skin[int(h*0.30):int(h*0.75), :]
    gsz = 4
    grid = m[::gsz, ::gsz]
    lbl = np.zeros(grid.shape, dtype=np.int32)
    cur, H, W = 0, *grid.shape
    for yy in range(H):
        for xx in range(W):
            if grid[yy, xx] and lbl[yy, xx] == 0:
                cur += 1; stack = [(yy, xx)]; lbl[yy, xx] = cur
                while stack:
                    cy, cx = stack.pop()
                    for ny, nx in ((cy-1,cx),(cy+1,cx),(cy,cx-1),(cy,cx+1)):
                        if 0 <= ny < H and 0 <= nx < W and grid[ny, nx] and lbl[ny, nx] == 0:
                            lbl[ny, nx] = cur; stack.append((ny, nx))
    heads = 0
    if cur:
        areas = np.bincount(lbl.ravel())[1:] * gsz * gsz
        heads = int(((areas > 400) & (areas < 4000)).sum())
    return heads, round(float(m.mean()), 4)

# ---------------- main ----------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video')
    ap.add_argument('--out', required=True)
    ap.add_argument('--fps-aim', type=float, default=8)
    ap.add_argument('--fps-ui', type=float, default=2)
    ap.add_argument('--template', default=os.path.join(HERE, 'ammo-box-template.png'))
    ap.add_argument('--glyphs', default=os.path.join(HERE, 'glyphs.npz'))
    ap.add_argument('--cascade', default=os.path.join(HERE, 'lbpcascade_animeface.xml'))
    ap.add_argument('--team-size', type=int, default=5,
                    help='units in the recorded comp; face threshold = team_size - 1')
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    aim_dir, ui_dir = os.path.join(args.out, 'frames-aim'), os.path.join(args.out, 'frames-ui')
    ev_dir = os.path.join(args.out, 'evidence')
    for d in (aim_dir, ui_dir, ev_dir): os.makedirs(d, exist_ok=True)

    print('extracting frames…', flush=True)
    sh(f"ffmpeg -y -loglevel error -i '{args.video}' -vf 'fps={args.fps_aim},crop={AIM['w']}:{AIM['h']}:{AIM['x']}:{AIM['y']}' {aim_dir}/a_%05d.png")
    sh(f"ffmpeg -y -loglevel error -i '{args.video}' -vf 'fps={args.fps_ui},scale=1311:-1' {ui_dir}/u_%05d.png")

    tracker, reader = BoxTracker(args.template), GlyphReader(args.glyphs)
    facer = None
    if cv2 is not None and os.path.exists(args.cascade):
        facer = FaceDetectorV1(args.cascade)
    else:
        print('NOTE: cv2/cascade unavailable — v1 face/cover detector skipped', flush=True)

    ui_samples = []
    ui_files = sorted(os.listdir(ui_dir))
    for i, f in enumerate(ui_files):
        t = i / args.fps_ui
        path = os.path.join(ui_dir, f)
        big = Image.open(path).convert('RGB')
        c = np.asarray(big.resize((UI_W, int(big.height * UI_W / big.width))), dtype=np.float64)
        heads, skin = face_metric(c)
        rec = dict(t=round(t, 2), ui=ui_present(c.mean(axis=2)),
                   yellow=round(yellow_frac(c), 4), faces=heads, skin=skin,
                   burst=round(burst_red_frac(c), 3))
        if facer:
            n, span = facer.count(cv2.imread(path))
            rec['facesV1'], rec['facesV1Span'] = n, span
        ui_samples.append(rec)
        if i % 100 == 0: print(f'  ui {i}/{len(ui_files)}', flush=True)

    aim_samples, prev_digits = [], None
    aim_files = sorted(os.listdir(aim_dir))
    for i, f in enumerate(aim_files):
        t = i / args.fps_aim
        reg = gray_arr(Image.open(os.path.join(aim_dir, f)))
        hit = tracker.find(reg)
        rec = dict(t=round(t, 3), found=bool(hit))
        if hit:
            rec.update(x=hit['x'] + AIM['x'], y=hit['y'] + AIM['y'], ncc=hit['ncc'],
                       state=hit['state'], barFrac=hit['barFrac'])
            if hit['state'] == 'normal':
                rec['ammo'] = reader.read(hit['digits'])
                rec['dcorr'] = digit_corr(prev_digits, hit['digits'])
                prev_digits = hit['digits']
            else:
                prev_digits = None
        else:
            prev_digits = None
        aim_samples.append(rec)
        if i % 200 == 0: print(f'  aim {i}/{len(aim_files)}', flush=True)

    # fight clock
    present = [s['ui'] for s in ui_samples]
    def first_run(seq, need=5):
        run = 0
        for i, v in enumerate(seq):
            run = run + 1 if v else 0
            if run >= need: return i - need + 1
        return None
    fs_i = first_run(present)
    le = first_run(present[::-1])
    fe_i = None if le is None else len(present) - 1 - le
    fight_start = None if fs_i is None else ui_samples[fs_i]['t']
    fight_end = None if fe_i is None else ui_samples[fe_i]['t']

    # splashes (secondary FB signal; known-weak on bright boss backgrounds)
    splashes, last = [], -1e9
    for s in ui_samples:
        if s['yellow'] >= YELLOW_THRESH and s['t'] - last >= SPLASH_MIN_GAP:
            splashes.append(s['t']); last = s['t']

    # Full-Burst windows from the right-edge burst meter (PRIMARY FB signal): red/flashing =
    # inside FB; merge sub-1s flicker gaps.
    fb_windows, w_start, w_last = [], None, None
    for s in ui_samples:
        if s['burst'] >= BURST_RED_THRESH:
            if w_start is None: w_start = s['t']
            w_last = s['t']
        elif w_start is not None and s['t'] - w_last > 1.0:
            fb_windows.append([w_start, round(w_last + 1.0 / args.fps_ui, 2)]); w_start = None
    if w_start is not None:
        fb_windows.append([w_start, round(w_last + 1.0 / args.fps_ui, 2)])

    # per-sample firing classification (mechanical; low confidence is NEVER 'firing')
    def firing(rec):
        return bool(rec.get('found') and rec.get('state') == 'normal'
                    and rec.get('dcorr') is not None and rec['dcorr'] < DCORR_STATIC)
    # candidate not-firing windows
    windows, run_start = [], None
    for i, rec in enumerate(aim_samples):
        if not firing(rec):
            run_start = i if run_start is None else run_start
        else:
            if run_start is not None:
                t0, t1 = aim_samples[run_start]['t'], rec['t']
                if t1 - t0 >= CAND_MIN_SEC and (fight_start is None or t1 > fight_start) \
                        and (fight_end is None or t0 < fight_end):
                    seg = aim_samples[run_start:i]
                    states = [ (s.get('state') if s.get('found') else 'absent') for s in seg ]
                    reads = [s.get('ammo') for s in seg if s.get('ammo')]
                    windows.append(dict(
                        tStartVideo=t0, tEndVideo=t1, durSec=round(t1 - t0, 2),
                        states=dict(zip(*np.unique(states, return_counts=True))) if states else {},
                        statesSeq=states,
                        ammoReads=reads,
                        ammoBefore=next((s.get('ammo') for s in reversed(aim_samples[:run_start])
                                         if s.get('ammo') and '?' not in s.get('ammo')), None),
                        ammoAfter=next((s.get('ammo') for s in aim_samples[i:]
                                        if s.get('ammo') and '?' not in s.get('ammo')), None),
                    ))
                run_start = None
    # (an open run at video end is dropped: fight_end bounds interpretation anyway)
    for w in windows:
        w['states'] = {k: int(v) for k, v in w['states'].items()}

    # evidence sheets: small-frame strips around each window
    for wi, w in enumerate(windows):
        i0 = max(0, int((w['tStartVideo'] - 1.5) * args.fps_ui))
        i1 = min(len(ui_files) - 1, int((w['tEndVideo'] + 1.5) * args.fps_ui))
        tiles = [Image.open(os.path.join(ui_dir, ui_files[k])) for k in range(i0, i1 + 1)]
        if tiles:
            tw_, th_ = tiles[0].size
            sheet = Image.new('RGB', (tw_ * len(tiles), th_))
            for k, tile in enumerate(tiles): sheet.paste(tile, (k * tw_, 0))
            p = os.path.join(ev_dir, f'window_{wi:02d}.png')
            sheet.save(p); w['evidenceSheet'] = os.path.abspath(p)

    # cover/boss-walk windows from the v1 face detector: >= (team_size-1) frontal faces with
    # >=0.5 width span, >=2 consecutive samples. Fires at boss-walk transitions AND forced-cover
    # phases; pre/post-fight lineups are frontal too — bounded by the fight clock here.
    face_windows = []
    if facer:
        need = max(3, args.team_size - 1)
        f_start, f_last = None, None
        for s in ui_samples:
            hot = s.get('facesV1', 0) >= need and s.get('facesV1Span', 0) >= 0.5 \
                and (fight_start is None or s['t'] >= fight_start) \
                and (fight_end is None or s['t'] <= fight_end)
            if hot:
                if f_start is None: f_start = s['t']
                f_last = s['t']
            elif f_start is not None and s['t'] - f_last > 1.5:
                if f_last > f_start:
                    face_windows.append([f_start, round(f_last + 1.0 / args.fps_ui, 2)])
                f_start = None
        if f_start is not None and f_last > f_start:
            face_windows.append([f_start, round(f_last + 1.0 / args.fps_ui, 2)])

    out = dict(
        video=os.path.abspath(args.video), fpsAim=args.fps_aim, fpsUi=args.fps_ui,
        fightStartVideoSec=fight_start, fightEndVideoSec=fight_end,
        durationSec=None if None in (fight_start, fight_end) else round(fight_end - fight_start, 2),
        splashesVideoSec=splashes,
        fullBurstWindowsVideoSec=fb_windows,
        coverFaceWindowsVideoSec=face_windows,
        candidateWindows=windows,
        uiSamples=ui_samples, aimSamples=aim_samples,
        calibrationFramesVideoSec=[40, 41, 42, 43, 44, 60, 55.0, 75.0, 66.3, 67.7, 69.5, 72.0],
        notes="Raw observations only; window classification belongs to the /boss-study authoring "
              "step. 'ammo' reads are authoritative only on settled/static samples (rolling digits "
              "blur and misread). counter ticks ~30/s hot; small kit refills (+5-ish) move the "
              "counter WITHOUT a firing pause. INVERTED state = the reload display (dark 000 on "
              "bright). faces = UNCALIBRATED v0 cover metric (baseline 5-8 on normal frames -> "
              "likely DEAD; do not treat its absolute value as meaningful).")
    with open(os.path.join(args.out, 'observations.json'), 'w') as fp:
        json.dump(out, fp)
    print(f"wrote {args.out}/observations.json  fight={fight_start}..{fight_end} "
          f"splashes={len(splashes)} windows={len(windows)}")

if __name__ == '__main__':
    main()
