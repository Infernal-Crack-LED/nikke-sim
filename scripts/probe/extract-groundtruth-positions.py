#!/usr/bin/env python3
"""Extract owner-drawn pellet POSITIONS from the annotated f8-11 ground-truth crops.

Why this exists (2026-07-31). `scripts/tests/fixtures/pellets/groundtruth-f8-11.json` records how
MANY pellets the owner counted per shot, but not WHERE they were. That gap is what forced
`score-pellets.py --audit-fidelity`'s both-pass floor to be a DERIVED reference (inferred from the
real screen's own bias) rather than a measured one: "was this labelled real pellet found by the
detector" is not computable without positions.

The owner supplied them by drawing green shapes (circles/squares -- macOS shape autocomplete makes
the exact shape inconsistent, so this reads CENTROIDS and never assumes a shape) around each pellet,
directly on the committed crops. Those annotated copies are preserved verbatim at
`scripts/tests/fixtures/pellets/groundtruth-f8-11-annotated/`; the crops under
`groundtruth-f8-11/` are kept CLEAN, because `make-synthetic-pellets.py` harvests real pellet
patches from them and green outlines baked into those pixels would corrupt every synthetic set built
afterwards.

Validation is built in and is the point: the number of green shapes found per frame must equal the
owner's independently-derived hand count for that shot (`white` in the fixture). Those two numbers
come from two separate passes on two separate days -- counting, then drawing -- so agreement is a
genuine cross-check rather than a self-consistency check. A mismatch means the extraction is wrong
(or an annotation was missed) and this script REFUSES rather than emitting positions nobody verified.

    scripts/probe/.venv/bin/python scripts/probe/extract-groundtruth-positions.py --write
    scripts/probe/.venv/bin/python scripts/probe/extract-groundtruth-positions.py --selftest
"""

import argparse
import json
import pathlib
import sys

import cv2
import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
FIXTURES = HERE.parent / "tests" / "fixtures" / "pellets"
GT_JSON = FIXTURES / "groundtruth-f8-11.json"
ANNOTATED = FIXTURES / "groundtruth-f8-11-annotated"
OUT_JSON = FIXTURES / "groundtruth-f8-11-positions.json"

# Green-annotation mask. Deliberately loose on hue and strict on green-vs-others: the owner drew in
# a saturated green that no NIKKE pellet/VFX/damage-number pixel comes close to, so a wide margin
# costs nothing and survives whatever anti-aliasing the drawing tool applied to the outline.
GREEN_MIN = 120  # min green channel
GREEN_MARGIN = 50  # green must exceed red AND blue by this much
CLOSE_KERNEL = 5  # morphological close: turns a drawn OUTLINE into one solid blob
MIN_SHAPE_AREA = 12  # px, post-close -- drops stray anti-aliasing specks, keeps real shapes


def green_mask(img):
    b, g, r = (img[:, :, i].astype(int) for i in range(3))
    m = (g > GREEN_MIN) & (g > r + GREEN_MARGIN) & (g > b + GREEN_MARGIN)
    return m.astype(np.uint8)


def shape_centroids(img):
    """Centroid of each drawn shape, as (x, y) floats in crop pixel coordinates.

    Closes the mask first so a hollow drawn ring becomes a single filled component -- otherwise one
    circle can split into arcs and be counted several times. Returns centroids sorted for stable
    output (row-major), so re-running produces a byte-identical file.
    """
    m = cv2.morphologyEx(green_mask(img), cv2.MORPH_CLOSE, np.ones((CLOSE_KERNEL, CLOSE_KERNEL), np.uint8))
    n, _lab, stats, cent = cv2.connectedComponentsWithStats(m, 8)
    out = [
        (float(cent[i][0]), float(cent[i][1]), int(stats[i, cv2.CC_STAT_AREA]))
        for i in range(1, n)
        if stats[i, cv2.CC_STAT_AREA] >= MIN_SHAPE_AREA
    ]
    out.sort(key=lambda t: (round(t[1], 1), round(t[0], 1)))
    return out


def selftest():
    """Pin the centroid arithmetic against a fixed synthetic image -- no files needed."""
    img = np.zeros((120, 120, 3), np.uint8)
    cv2.circle(img, (30, 40), 9, (0, 255, 0), 2)  # hollow ring -> must close to ONE shape
    cv2.rectangle(img, (70, 20), (88, 38), (0, 255, 0), 2)  # square outline
    cv2.circle(img, (60, 95), 7, (0, 255, 0), -1)  # filled
    got = [(round(x), round(y)) for x, y, _a in shape_centroids(img)]
    expected = [(30, 40), (79, 29), (60, 95)]
    ok = len(got) == 3 and all(
        any(abs(gx - ex) <= 2 and abs(gy - ey) <= 2 for gx, gy in got) for ex, ey in expected
    )
    print(f"expected ~{expected}\ngot       {got}")
    print("SELFTEST PASS" if ok else "SELFTEST FAIL")
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--selftest", action="store_true", help="pin centroid extraction against a fixed synthetic image and exit")
    ap.add_argument("--write", action="store_true", help=f"write {OUT_JSON.name} (default: report only)")
    ap.add_argument("--annotated", default=str(ANNOTATED), help="annotated crop directory")
    args = ap.parse_args()

    if args.selftest:
        sys.exit(selftest())

    gt = json.loads(GT_JSON.read_text())
    ann_root = pathlib.Path(args.annotated)
    shots_out, failures = [], []

    for shot in gt["shots"]:
        sid = f"shot{shot['shot']:02d}"
        owner_n = shot["white"]
        frames = []
        for rel in shot["crops"]:
            name = pathlib.Path(rel).name
            path = ann_root / sid / name
            if not path.exists():
                failures.append(f"{sid}/{name}: annotated crop MISSING at {path}")
                continue
            img = cv2.imread(str(path))
            if img is None:
                failures.append(f"{sid}/{name}: unreadable")
                continue
            cents = shape_centroids(img)
            if len(cents) != owner_n:
                failures.append(
                    f"{sid}/{name}: found {len(cents)} green shapes but the owner counted "
                    f"{owner_n} pellets for this shot"
                )
            frames.append({
                "frame": name,
                "n_shapes": len(cents),
                "positions": [[round(x, 1), round(y, 1)] for x, y, _a in cents],
                "shape_areas": [a for _x, _y, a in cents],
            })
        shots_out.append({"shot": shot["shot"], "video_t": shot["video_t"], "owner_white": owner_n, "frames": frames})
        seq = [f["n_shapes"] for f in frames]
        print(f"  {sid}: owner={owner_n:2d}  per-frame shapes={seq}")

    if failures:
        print("\n" + "=" * 78, file=sys.stderr)
        print("REFUSING TO WRITE — annotation extraction does not reconcile with the owner counts:", file=sys.stderr)
        for f in failures:
            print(f"  - {f}", file=sys.stderr)
        print(
            "\n  The per-frame green-shape count MUST equal the owner's hand count for that shot.\n"
            "  These are two independent derivations (counting pass, then drawing pass); if they\n"
            "  disagree, the extraction is wrong or an annotation was missed — do not emit\n"
            "  positions nobody has verified.",
            file=sys.stderr,
        )
        print("=" * 78, file=sys.stderr)
        sys.exit(1)

    print("\nAll shots reconcile: green-shape count == owner hand count on every annotated frame.")

    if args.write:
        OUT_JSON.write_text(json.dumps({
            "_source": (
                "Owner-drawn green shapes on the f8-11 ground-truth crops, 2026-07-31. Shapes are a "
                "mix of circles and squares (macOS shape autocomplete); this file records CENTROIDS "
                "only, never a shape or radius."
            ),
            "_note": (
                "Positions are in CROP pixel coordinates of the matching file under "
                "scripts/tests/fixtures/pellets/groundtruth-f8-11/ (368x368, identical geometry to "
                "the annotated copies under groundtruth-f8-11-annotated/). Regenerate with "
                "scripts/probe/extract-groundtruth-positions.py --write, which REFUSES unless every "
                "frame's shape count equals the owner's independent hand count in "
                "groundtruth-f8-11.json. Purpose: converts score-pellets.py's FIDELITY_BOTH_PASS_FLOOR "
                "from a DERIVED reference into a measurable one (QUEUE.md owner-time ask, now closed)."
            ),
            "video": gt["video"],
            "slug": gt["slug"],
            "clip": gt["clip"],
            "shots": shots_out,
        }, indent=2) + "\n")
        print(f"wrote {OUT_JSON}")
    else:
        print("(report only — pass --write to emit the positions fixture)")


if __name__ == "__main__":
    main()
