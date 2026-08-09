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

SECOND MODE -- `--marks <dir>` (2026-08-06)
-------------------------------------------
The same green-shape reading, pointed at a crop set that has NO prior hand count: the mislock
label crops from `analyze-pellet-tracks.py --mislock-crops`. There the owner is asked to MARK
what is visible and nothing else -- GREEN on every real pellet, MAGENTA on the in-game crosshair
reticle -- and every count, window membership and adjudication is computed downstream from those
positions. That is the whole point of the mode: the earlier version of that ask made a human judge
"how many pellets fall inside a 184 px disc centred on (587, 274)" by eye, which is geometry a tool
owns.

⚑ The count-reconciliation gate above CANNOT apply here: there is no independent hand count to
reconcile against (that is exactly what the marks are producing). So `--marks` is a separate path
that never touches the f8-11 path, and the f8-11 path keeps its REFUSE-on-mismatch gate intact.
What `--marks` validates instead is mechanical and reported per shot: exactly one marked frame per
shot (ambiguity is refused, not silently collapsed), at most one reticle mark, and every mark's
area so an accidental colour hit is visible rather than silent.

    ... extract-groundtruth-positions.py --marks <labels-dir> [--marks-write]
    ... extract-groundtruth-positions.py --marks-selftest
"""

import argparse
import json
import pathlib
import sys
import tempfile

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


# Reticle-annotation mask -- MAGENTA, and deliberately NOT red. These crops are raw game frames and
# NIKKE's own VFX and damage numbers are full of saturated red and orange, so no mask can separate a
# drawn red mark from a rendered one; magenta (red AND blue high, green low) does not occur in this
# footage. INDEX.md tells the labeller magenta for this reason.
MAGENTA_MIN = 110  # min on BOTH the red and blue channels
MAGENTA_MARGIN = 50  # red AND blue must each exceed green by this much


def green_mask(img):
    b, g, r = (img[:, :, i].astype(int) for i in range(3))
    m = (g > GREEN_MIN) & (g > r + GREEN_MARGIN) & (g > b + GREEN_MARGIN)
    return m.astype(np.uint8)


def magenta_mask(img):
    b, g, r = (img[:, :, i].astype(int) for i in range(3))
    m = (r > MAGENTA_MIN) & (b > MAGENTA_MIN) & (r > g + MAGENTA_MARGIN) & (b > g + MAGENTA_MARGIN)
    return m.astype(np.uint8)


def _components(mask):
    """Connected components of an annotation mask, as dicts sorted row-major.

    Closes the mask first so a hollow drawn ring becomes a single filled component -- otherwise one
    circle can split into arcs and be counted several times. The sort makes re-running produce a
    byte-identical file.
    """
    m = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((CLOSE_KERNEL, CLOSE_KERNEL), np.uint8))
    n, _lab, stats, cent = cv2.connectedComponentsWithStats(m, 8)
    out = [
        {
            "x": float(cent[i][0]),
            "y": float(cent[i][1]),
            "area": int(stats[i, cv2.CC_STAT_AREA]),
            "bbox": [int(stats[i, cv2.CC_STAT_LEFT]), int(stats[i, cv2.CC_STAT_TOP]),
                     int(stats[i, cv2.CC_STAT_WIDTH]), int(stats[i, cv2.CC_STAT_HEIGHT])],
        }
        for i in range(1, n)
        if stats[i, cv2.CC_STAT_AREA] >= MIN_SHAPE_AREA
    ]
    out.sort(key=lambda c: (round(c["y"], 1), round(c["x"], 1)))
    return out


def shape_centroids(img):
    """Centroid of each drawn GREEN shape, as (x, y, area) in crop pixel coordinates."""
    return [(c["x"], c["y"], c["area"]) for c in _components(green_mask(img))]


# ============================================================
# MARKS MODE -- the mislock label crops (analyze-pellet-tracks.py --mislock-crops)
#
# The owner does exactly two things per crop: GREEN shape on every real pellet, MAGENTA shape on the
# in-game reticle if identifiable. Everything else is derived. See the module docstring for why the
# f8-11 path's count gate cannot apply here and what replaces it.
# ============================================================
MARKS_ANSWERS = "ANSWERS.json"
MARKS_JSON = "MARKS.json"


def _frame_marks(img_path):
    """Green (pellet) and magenta (reticle) marks on one crop. Read-only."""
    img = cv2.imread(str(img_path))
    if img is None:
        return {"frame": img_path.name, "unreadable": True, "pellets": [], "reticle": []}
    return {
        "frame": img_path.name,
        "unreadable": False,
        "pellets": _components(green_mask(img)),
        "reticle": _components(magenta_mask(img)),
    }


def _resolve_shot(frames):
    """One shot's marked frame + status, from its per-frame marks.

    ⚑ Exactly ONE marked frame per shot is required. Several marked frames are NOT collapsed --
    they would be different pellet sets from different moments, and silently picking one (or
    unioning them) invents a labelling the owner never made. That is refused and reported.
    """
    marked = [f for f in frames if f["pellets"] or f["reticle"]]
    if not marked:
        return None, "UNMARKED", ("no marks on any of this shot's frames -- an unreadable crop is a "
                                  "real finding; record it in `notes`")
    if len(marked) > 1:
        names = ", ".join(f["frame"] for f in marked)
        return None, "AMBIGUOUS", (f"{len(marked)} frames carry marks ({names}) -- mark ONE frame "
                                   "per shot; refusing to guess which is the intended labelling")
    f = marked[0]
    if len(f["reticle"]) > 1:
        return f, "MULTI-RETICLE", (f"{len(f['reticle'])} magenta shapes on {f['frame']} -- at most "
                                    "one reticle per crop; pellets kept, crosshair left null")
    if not f["reticle"]:
        return f, "OK-NO-RETICLE", "pellets marked; no reticle mark (set `reticle_visible` yourself)"
    return f, "OK", ""


def read_marks(labels_dir, write=False):
    """Read owner marks off a mislock-label crop set; optionally write them into ANSWERS.json."""
    labels_dir = pathlib.Path(labels_dir)
    if not labels_dir.is_dir():
        print(f"--marks: {labels_dir} is not a directory", file=sys.stderr)
        return 1
    shot_dirs = sorted(p for p in labels_dir.iterdir() if p.is_dir() and p.name.startswith("shot"))
    if not shot_dirs:
        print(f"--marks: no shotNN/ directories under {labels_dir}", file=sys.stderr)
        return 1

    shots, resolved = [], {}
    for sd in shot_dirs:
        frames = [_frame_marks(p) for p in sorted(sd.glob("*.png"))]
        chosen, status, why = _resolve_shot(frames)
        resolved[sd.name] = (chosen, status)
        shots.append({
            "shot": sd.name,
            "status": status,
            "note": why,
            "marked_frame": chosen["frame"] if chosen else None,
            "n_pellets": len(chosen["pellets"]) if chosen else 0,
            "n_reticle_shapes": len(chosen["reticle"]) if chosen else 0,
            "pellet_marks": chosen["pellets"] if chosen else [],
            "reticle_marks": chosen["reticle"] if chosen else [],
            "frames": [{"frame": f["frame"], "unreadable": f["unreadable"],
                        "n_pellets": len(f["pellets"]), "n_reticle": len(f["reticle"])}
                       for f in frames],
        })
        area = [c["area"] for c in (chosen["pellets"] if chosen else [])]
        print(f"  {sd.name}: {status:<13} frame={shots[-1]['marked_frame'] or '-':<16} "
              f"pellets={shots[-1]['n_pellets']:<3} reticle={shots[-1]['n_reticle_shapes']}"
              + (f"  mark areas={area}" if area else ""))
        if why:
            print(f"      ⚑ {why}")

    (labels_dir / MARKS_JSON).write_text(json.dumps({
        "_source": (
            "Owner marks read off the mislock label crops by "
            "scripts/probe/extract-groundtruth-positions.py --marks. GREEN shape = one real pellet, "
            "MAGENTA shape = the in-game crosshair reticle. Positions are CENTROIDS in CROP pixel "
            "coordinates; map to frame pixels with the per-shot origin in INDEX.md/MANIFEST.json."),
        "_note": (
            "Provenance for ANSWERS.json: `marked_frame` is the frame each shot's positions came "
            "from. `area`/`bbox` per mark are reported so an accidental colour hit (the footage has "
            "green heal numbers) is visible rather than silent. status: OK | OK-NO-RETICLE | "
            "MULTI-RETICLE | AMBIGUOUS (several frames marked -- refused) | UNMARKED."),
        "labels_dir": str(labels_dir),
        "shots": shots,
    }, indent=2) + "\n")
    print(f"wrote {labels_dir / MARKS_JSON}")

    if not write:
        print("(report only -- pass --marks-write to fill ANSWERS.json)")
        return 0

    ans_path = labels_dir / MARKS_ANSWERS
    if not ans_path.exists():
        print(f"--marks-write: {ans_path} does not exist (generate the crop set first)",
              file=sys.stderr)
        return 1
    answers = json.loads(ans_path.read_text())
    n_written = 0
    for row in answers.get("answers", []):
        chosen, status = resolved.get(row["shot"], (None, "MISSING"))
        if chosen is None:
            continue
        row["pellets"] = [[round(c["x"], 1), round(c["y"], 1)] for c in chosen["pellets"]]
        if len(chosen["reticle"]) == 1:
            c = chosen["reticle"][0]
            row["crosshair"] = [round(c["x"], 1), round(c["y"], 1)]
            row["reticle_visible"] = True
        n_written += 1
    ans_path.write_text(json.dumps(answers, indent=2) + "\n")
    print(f"wrote {ans_path}  ({n_written}/{len(answers.get('answers', []))} shots filled from "
          "marks; unmarked/ambiguous shots left untouched)  <-- COMMIT IT (§32D)")
    return 0


def marks_selftest():
    """Pin the two-colour mark reading end to end, on synthetic crops in a temp dir.

    Covers what a centroid-only pin would miss: that the two masks do not read each other, that
    game-red and game-white pixels are read as NEITHER (the reason the reticle mark is magenta and
    not red), and the three refusal paths -- several marked frames, several reticle marks, and no
    marks at all.
    """
    with tempfile.TemporaryDirectory() as td:
        root = pathlib.Path(td)
        blank = np.zeros((200, 200, 3), np.uint8)

        def put(shot, frame, img):
            (root / shot).mkdir(parents=True, exist_ok=True)
            cv2.imwrite(str(root / shot / frame), img)

        # shot01 -- the happy path, plus DECOYS: img1 red blob and img1 white blob that must read as
        # nothing at all (this footage is full of both).
        img1 = blank.copy()
        cv2.circle(img1, (40, 50), 9, (0, 255, 0), 2)        # pellet mark (hollow ring)
        cv2.rectangle(img1, (120, 40), (140, 60), (0, 255, 0), 2)  # pellet mark (square outline)
        cv2.circle(img1, (100, 150), 8, (255, 0, 255), 2)    # reticle mark (magenta)
        cv2.circle(img1, (30, 170), 10, (40, 40, 220), -1)   # game red VFX -- NOT img1 reticle
        cv2.circle(img1, (170, 170), 10, (255, 255, 255), -1)  # game white -- NOT img1 pellet
        put("shot01", "f08.png", img1)
        put("shot01", "f09.png", blank.copy())
        put("shot01", "f10.png", blank.copy())

        # shot02 -- pellets but no reticle mark
        img2 = blank.copy()
        cv2.circle(img2, (60, 60), 8, (0, 255, 0), 2)
        put("shot02", "f08.png", img2)

        # shot03 -- two frames marked: AMBIGUOUS, must refuse
        img3 = blank.copy()
        cv2.circle(img3, (60, 60), 8, (0, 255, 0), 2)
        put("shot03", "f08.png", img3)
        put("shot03", "f09.png", img3.copy())

        # shot04 -- two reticle marks: pellets kept, crosshair refused
        img4 = blank.copy()
        cv2.circle(img4, (60, 60), 8, (0, 255, 0), 2)
        cv2.circle(img4, (100, 100), 8, (255, 0, 255), 2)
        cv2.circle(img4, (140, 140), 8, (255, 0, 255), 2)
        put("shot04", "f08.png", img4)

        # shot05 -- nothing marked at all: UNMARKED (img1 real finding, not img1 failure)
        put("shot05", "f08.png", blank.copy())

        (root / MARKS_ANSWERS).write_text(json.dumps({
            "_README": "selftest stub",
            "answers": [{"shot": f"shot{i:02d}", "pellets": [], "crosshair": None,
                         "reticle_visible": None, "notes": None} for i in range(1, 6)],
        }, indent=2) + "\n")

        rc = read_marks(root, write=True)
        marks = json.loads((root / MARKS_JSON).read_text())
        answers = json.loads((root / MARKS_ANSWERS).read_text())
        by_shot = {s["shot"]: s for s in marks["shots"]}
        ans = {a["shot"]: a for a in answers["answers"]}

        def near(pos, want, tol=2):
            return abs(pos[0] - want[0]) <= tol and abs(pos[1] - want[1]) <= tol

        p1 = ans["shot01"]["pellets"]
        checks = [
            ("read_marks returned 0", rc == 0),
            ("shot01 OK: 2 pellet marks, 1 reticle mark",
             by_shot["shot01"]["status"] == "OK" and by_shot["shot01"]["n_pellets"] == 2
             and by_shot["shot01"]["n_reticle_shapes"] == 1),
            ("shot01 pellet centroids land on the drawn shapes",
             len(p1) == 2 and any(near(p, [40, 50]) for p in p1)
             and any(near(p, [130, 50]) for p in p1)),
            ("shot01 crosshair centroid lands on the magenta mark",
             ans["shot01"]["crosshair"] is not None and near(ans["shot01"]["crosshair"], [100, 150])
             and ans["shot01"]["reticle_visible"] is True),
            ("game RED blob read as NEITHER a pellet nor a reticle (why the mark is magenta)",
             not any(near(p, [30, 170], 12) for p in p1)
             and not near(ans["shot01"]["crosshair"], [30, 170], 12)),
            ("game WHITE blob read as neither",
             not any(near(p, [170, 170], 12) for p in p1)),
            ("the green mask does not fire on the magenta mark",
             not any(near(p, [100, 150], 12) for p in p1)),
            ("shot02 OK-NO-RETICLE: pellets written, crosshair + reticle_visible left null",
             by_shot["shot02"]["status"] == "OK-NO-RETICLE" and len(ans["shot02"]["pellets"]) == 1
             and ans["shot02"]["crosshair"] is None and ans["shot02"]["reticle_visible"] is None),
            ("shot03 two marked frames -> AMBIGUOUS, ANSWERS left untouched",
             by_shot["shot03"]["status"] == "AMBIGUOUS" and ans["shot03"]["pellets"] == []),
            ("shot04 two reticle marks -> pellets kept, crosshair refused",
             by_shot["shot04"]["status"] == "MULTI-RETICLE" and len(ans["shot04"]["pellets"]) == 1
             and ans["shot04"]["crosshair"] is None),
            ("shot05 no marks -> UNMARKED, ANSWERS left untouched",
             by_shot["shot05"]["status"] == "UNMARKED" and ans["shot05"]["pellets"] == []
             and ans["shot05"]["notes"] is None),
            ("MARKS.json records which frame each shot's marks came from",
             by_shot["shot01"]["marked_frame"] == "f08.png"
             and by_shot["shot03"]["marked_frame"] is None),
            ("every mark carries an area + bbox (accidental colour hits stay visible)",
             all("area" in m and "bbox" in m for m in by_shot["shot01"]["pellet_marks"])),
        ]
    all_ok = all(v for _, v in checks)
    print("\nMARKS MODE -- mislock label crops (green = pellet, magenta = reticle)")
    for label, v in checks:
        print(f"  {'PASS' if v else 'FAIL'}  {label}")
    print("SELFTEST PASS" if all_ok else "SELFTEST FAIL")
    return 0 if all_ok else 1


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
    ap.add_argument("--marks", metavar="LABELS_DIR",
                    help="MARKS MODE: read owner marks (GREEN = one real pellet, MAGENTA = the "
                         "in-game crosshair reticle) off a mislock-label crop set -- the shotNN/ "
                         "directories under LABELS_DIR -- and report their CROP-pixel positions. "
                         "Writes MARKS.json (per-frame provenance) beside them. ⚑ Separate path "
                         "from the f8-11 extraction above and does not weaken it: that one still "
                         "REFUSES unless every frame's shape count equals the owner's independent "
                         "hand count, which cannot exist here because these marks ARE the first "
                         "count of these shots.")
    ap.add_argument("--marks-write", action="store_true",
                    help="with --marks: also fill `pellets` / `crosshair` / `reticle_visible` into "
                         "LABELS_DIR/ANSWERS.json. Unmarked and ambiguous shots are left untouched "
                         "(null is data, a guess is not).")
    ap.add_argument("--marks-selftest", action="store_true",
                    help="pin the two-colour mark reading (and its three refusal paths) against "
                         "synthetic crops in a temp dir, and exit")
    args = ap.parse_args()

    if args.selftest:
        sys.exit(selftest())
    if args.marks_selftest:
        sys.exit(marks_selftest())
    if args.marks:
        sys.exit(read_marks(args.marks, args.marks_write))
    if args.marks_write:
        ap.error("--marks-write requires --marks")

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
