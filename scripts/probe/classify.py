#!/usr/bin/env python3
"""Popup colour classifier for probe frames.

    python3 scripts/probe/classify.py <image-or-glob> [--region crosshair|character|full] [--rate]

We have no OCR (no tesseract), so VALUES are still read by eye. But damage-number COLOUR is
programmatic, and colour is what encodes crit/core/heal:
    crit   -> orange  (crit icon; R high, G mid, B low)
    core   -> red     ("CORE HIT"; R high, G low, B low)
    normal -> white   (R,G,B all high)
    heal   -> green   (G high, R/B low)  -- lives over the CHARACTER, not the crosshair

This counts saturated popup-text pixels of each class inside a region. Damage numbers are far more
saturated than the grey/brown battlefield, so the counts are a usable signal. Per-frame it FLAGS
which classes are present (so you know which frames to read for values); with --rate over a burst of
frames (see scripts/probe/frames.ts --fps) it reports the present-fraction per class, an APPROXIMATE
crit / core rate (approximate: overlapping popups + effects add noise; confirm against value reads).
"""
import sys, glob
import numpy as np
from PIL import Image

# Region crops for the 2622x1206 landscape frame (must match scripts/probe/frames.ts).
# (left, upper, right, lower)
REGIONS = {
    "full": None,
    "crosshair": (780, 110, 780 + 1100, 110 + 640),   # centre/boss — DAMAGE numbers
    "character": (930, 600, 930 + 760, 600 + 520),     # lower-centre — the focus unit + HEALS
}

def classify(px):
    """px: HxWx3 uint8 -> dict of pixel counts per colour class (saturated text only)."""
    r, g, b = px[..., 0].astype(int), px[..., 1].astype(int), px[..., 2].astype(int)
    mx = np.maximum(np.maximum(r, g), b)
    bright = mx > 150                                   # ignore dark background
    white = bright & (r > 190) & (g > 190) & (b > 190)
    # orange crit: strong R, mid G, low B, clearly warmer than white
    orange = bright & (r > 180) & (g > 90) & (g < 205) & (b < 100) & (r - b > 90) & (r - g > 35)
    # red core: strong R, low G and B
    red = bright & (r > 150) & (g < 95) & (b < 95) & (r - g > 80)
    # green heal: strong G, R and B clearly lower
    green = bright & (g > 150) & (g - r > 45) & (g - b > 45)
    return {
        "crit(orange)": int(orange.sum()),
        "core(red)":    int(red.sum()),
        "normal(white)": int(white.sum()),
        "heal(green)":  int(green.sum()),
    }

def region_of(img, name):
    box = REGIONS.get(name)
    return img if box is None else img.crop(box)

def main():
    args = sys.argv[1:]
    region = "full"
    rate = False
    paths = []
    i = 0
    while i < len(args):
        if args[i] == "--region": region = args[i + 1]; i += 2
        elif args[i] == "--rate": rate = True; i += 1
        else: paths += sorted(glob.glob(args[i])); i += 1
    if not paths:
        print("usage: classify.py <image-or-glob> [--region crosshair|character|full] [--rate]"); sys.exit(1)

    PRESENT = 40   # pixel count above which a class counts as "present" in a frame
    tallies = {k: 0 for k in ["crit(orange)", "core(red)", "normal(white)", "heal(green)"]}
    n = 0
    for p in paths:
        img = region_of(Image.open(p).convert("RGB"), region)
        counts = classify(np.asarray(img))
        n += 1
        flags = " ".join(f"{k.split('(')[0]}={counts[k]}" for k in counts)
        present = [k.split('(')[0] for k, v in counts.items() if v >= PRESENT]
        for k, v in counts.items():
            if v >= PRESENT: tallies[k] += 1
        if not rate:
            print(f"{p.split('/')[-1]:32s} [{region}]  {flags}   present: {', '.join(present) or '—'}")
    if rate:
        print(f"\ncolour PRESENT-fraction across {n} frames (region={region}, approx rate):")
        for k, c in tallies.items():
            print(f"  {k:16s} {c}/{n}  {100*c/n:5.1f}%")
        print("NOTE approximate — overlapping popups + effect colours inflate counts; confirm vs value reads.")

if __name__ == "__main__":
    main()
