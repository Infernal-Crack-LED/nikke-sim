#!/usr/bin/env python3
"""§0.7 — VLM zero-shot pellet counting test.

Crops f8–11 frames from a structural dump around the crosshair, sends each to a
local VLM (OpenAI-compatible endpoint), and compares the VLM's count to the
track-based white count from pellets.json.

Outputs:
  - Crops saved to <out-dir>/crops/
  - Single HTML report at <out-dir>/report.html
  - Summary stats printed to stdout

Usage:
  scripts/probe/.venv/bin/python scripts/probe/vlm-pellet-test.py \
    --dump /Users/maxwellsutton/nikke-sim/scratchpad/pellets/h4-marciana-structural \
    --endpoint http://localhost:8090/v1 \
    --n 80 \
    --out /Users/maxwellsutton/nikke-sim/scratchpad/pellets/vlm-test
"""
import argparse
import base64
import html
import io
import json
import os
import re
import sys
import time

import cv2
import numpy as np
import urllib.request
import urllib.error


def load_dump(dump_dir):
    pellets_path = os.path.join(dump_dir, "pellets.json")
    tracks_path = os.path.join(dump_dir, "tracks.json")
    frames_dir = os.path.join(dump_dir, "frames-pellet")

    with open(pellets_path) as f:
        pellets = json.load(f)
    with open(tracks_path) as f:
        tracks = json.load(f)

    return pellets, tracks, frames_dir


def select_frames(pellets, n, lo=6, hi=10):
    """Pick n frame indices where lo <= white <= hi, evenly spread."""
    candidates = []
    for i, r in enumerate(pellets["reads"]):
        if lo <= r["white"] <= hi:
            candidates.append((i, r["white"]))
    if not candidates:
        print(f"ERROR: no frames with {lo} <= white <= {hi}", file=sys.stderr)
        sys.exit(1)
    # evenly sample
    if len(candidates) <= n:
        return candidates
    step = len(candidates) / n
    return [candidates[int(i * step)] for i in range(n)]


def crop_frame(frames_dir, frame_files, frame_idx, cross_pos, crop_size=320):
    """Load frame, crop crop_size x crop_size around cross_pos. Returns (crop_bgr, crop_size_actual)."""
    fname = frame_files[frame_idx]
    path = os.path.join(frames_dir, fname)
    img = cv2.imread(path)
    if img is None:
        return None, None
    h, w = img.shape[:2]
    cx, cy = int(round(cross_pos[0])), int(round(cross_pos[1]))
    half = crop_size // 2
    x1 = max(0, cx - half)
    y1 = max(0, cy - half)
    x2 = min(w, x1 + crop_size)
    y2 = min(h, y1 + crop_size)
    x1 = max(0, x2 - crop_size)
    y1 = max(0, y2 - crop_size)
    crop = img[y1:y2, x1:x2]
    return crop, crop.shape[:2]


def encode_base64(img_bgr):
    _, buf = cv2.imencode(".png", img_bgr)
    return base64.b64encode(buf.tobytes()).decode("ascii")


def query_vlm(endpoint, model, b64_image, prompt, max_tokens=16):
    """Send image to VLM, return raw text response."""
    url = f"{endpoint}/chat/completions"
    payload = json.dumps({
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{b64_image}"},
                    },
                    {"type": "text", "text": prompt},
                ],
            }
        ],
        "max_tokens": max_tokens,
        "temperature": 0,
    }).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data["choices"][0]["message"]["content"].strip()


def parse_count(text):
    """Extract the first integer from VLM response text."""
    m = re.search(r"\d+", text)
    return int(m.group()) if m else None


def get_model_name(endpoint):
    try:
        req = urllib.request.Request(f"{endpoint}/models")
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        models = data.get("data", data.get("models", []))
        if models:
            return models[0].get("id", models[0].get("model", models[0].get("name", "")))
    except Exception:
        pass
    return "qwen2.5-vl-7b"


PROMPT = (
    "How many small white circular dots are visible in this image? "
    "These are game projectiles (pellets) — small bright white circles, "
    "typically 5-15 of them scattered in a cluster. "
    "Do not count damage numbers, text, or other effects. "
    "Count carefully and give only the number."
)


def generate_html(results, summary, out_path, endpoint, model, dump_dir):
    """Generate a single HTML report with all results."""
    ts = time.strftime("%Y-%m-%d %H:%M:%S")

    verdict_class = "pass" if summary["pct_within_2"] >= 70 else "fail"
    verdict_text = "VLM VIABLE" if summary["pct_within_2"] >= 70 else "VLM NOT VIABLE"

    cards = []
    for r in results:
        delta = r["delta"]
        if delta is not None:
            abs_d = abs(delta)
            if abs_d <= 1:
                badge_class = "good"
                badge = f"Δ{delta:+d}"
            elif abs_d <= 2:
                badge_class = "ok"
                badge = f"Δ{delta:+d}"
            else:
                badge_class = "bad"
                badge = f"Δ{delta:+d}"
        else:
            badge_class = "bad"
            badge = "PARSE FAIL"

        cards.append(f"""
    <div class="card">
      <div class="card-header">
        <span class="frame-idx">Frame {r['frame_idx']} ({r['frame_file']})</span>
        <span class="badge {badge_class}">{badge}</span>
      </div>
      <img src="data:image/png;base64,{r['b64']}" alt="crop {r['frame_idx']}" />
      <div class="counts">
        <div class="count-item">
          <span class="label">Track count</span>
          <span class="value">{r['track_white']}</span>
        </div>
        <div class="count-item">
          <span class="label">VLM count</span>
          <span class="value">{r['vlm_count'] if r['vlm_count'] is not None else '—'}</span>
        </div>
        <div class="count-item">
          <span class="label">VLM raw</span>
          <span class="value raw">{html.escape(r['vlm_raw'])}</span>
        </div>
      </div>
    </div>""")

    cards_html = "\n".join(cards)

    doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>§0.7 VLM Pellet Count Test — {ts}</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
         background: #1a1a2e; color: #e0e0e0; padding: 24px; }}
  h1 {{ font-size: 1.4em; margin-bottom: 8px; color: #fff; }}
  .meta {{ font-size: 0.85em; color: #888; margin-bottom: 20px; line-height: 1.6; }}
  .meta code {{ background: #2a2a3e; padding: 2px 6px; border-radius: 4px; }}
  .summary {{ display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }}
  .stat {{ background: #16213e; border-radius: 10px; padding: 16px 24px; text-align: center;
           min-width: 120px; }}
  .stat .num {{ font-size: 1.8em; font-weight: 700; }}
  .stat .lbl {{ font-size: 0.75em; color: #888; margin-top: 4px; }}
  .verdict {{ padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 1.1em;
              margin-bottom: 24px; display: inline-block; }}
  .verdict.pass {{ background: #0f5132; color: #75e6a0; }}
  .verdict.fail {{ background: #5c1a1a; color: #f0a0a0; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
           gap: 16px; }}
  .card {{ background: #16213e; border-radius: 10px; overflow: hidden; }}
  .card-header {{ display: flex; justify-content: space-between; align-items: center;
                  padding: 10px 14px; background: #1a1a3e; }}
  .frame-idx {{ font-size: 0.8em; color: #aaa; }}
  .badge {{ font-size: 0.85em; font-weight: 700; padding: 3px 10px; border-radius: 999px; }}
  .badge.good {{ background: #0f5132; color: #75e6a0; }}
  .badge.ok {{ background: #4a3f10; color: #e6d075; }}
  .badge.bad {{ background: #5c1a1a; color: #f0a0a0; }}
  .card img {{ width: 100%; display: block; image-rendering: pixelated; }}
  .counts {{ display: flex; gap: 12px; padding: 10px 14px; flex-wrap: wrap; }}
  .count-item {{ display: flex; flex-direction: column; }}
  .count-item .label {{ font-size: 0.7em; color: #888; text-transform: uppercase; }}
  .count-item .value {{ font-size: 1.1em; font-weight: 600; }}
  .count-item .value.raw {{ font-size: 0.8em; font-weight: 400; color: #aaa;
                            max-width: 200px; word-break: break-all; }}
  .dist {{ margin: 24px 0; }}
  .dist h2 {{ font-size: 1em; margin-bottom: 12px; }}
  .dist-row {{ display: flex; align-items: center; margin-bottom: 6px; }}
  .dist-label {{ width: 80px; font-size: 0.85em; text-align: right; padding-right: 12px; }}
  .dist-bar {{ height: 22px; border-radius: 4px; min-width: 2px; }}
  .dist-bar.good {{ background: #0f5132; }}
  .dist-bar.ok {{ background: #4a3f10; }}
  .dist-bar.bad {{ background: #5c1a1a; }}
  .dist-count {{ padding-left: 8px; font-size: 0.8em; color: #888; }}
</style>
</head>
<body>
<h1>§0.7 — VLM Zero-Shot Pellet Count Test</h1>
<div class="meta">
  <strong>Date:</strong> {ts}<br>
  <strong>Model:</strong> <code>{html.escape(model)}</code> @ <code>{html.escape(endpoint)}</code><br>
  <strong>Dump:</strong> <code>{html.escape(dump_dir)}</code><br>
  <strong>Frames tested:</strong> {summary['n_tested']} of {summary['n_candidates']} candidates
    (white count 6–10)<br>
  <strong>Crop:</strong> 320×320 px centered on structural crosshair<br>
  <strong>Prompt:</strong> "{html.escape(PROMPT)}"
</div>

<div class="verdict {verdict_class}">{verdict_text} — {summary['pct_within_2']:.0f}% within ±2
  (threshold: 70%)</div>

<div class="summary">
  <div class="stat"><div class="num">{summary['n_tested']}</div><div class="lbl">frames</div></div>
  <div class="stat"><div class="num">{summary['pct_within_1']:.0f}%</div><div class="lbl">within ±1</div></div>
  <div class="stat"><div class="num">{summary['pct_within_2']:.0f}%</div><div class="lbl">within ±2</div></div>
  <div class="stat"><div class="num">{summary['pct_within_3']:.0f}%</div><div class="lbl">within ±3</div></div>
  <div class="stat"><div class="num">{summary['median_abs_err']}</div><div class="lbl">median |err|</div></div>
  <div class="stat"><div class="num">{summary['mean_err']:+.2f}</div><div class="lbl">mean err (bias)</div></div>
  <div class="stat"><div class="num">{summary['max_abs_err']}</div><div class="lbl">max |err|</div></div>
  <div class="stat"><div class="num">{summary['n_parse_fail']}</div><div class="lbl">parse fails</div></div>
</div>

<div class="dist">
  <h2>Error distribution</h2>
  {summary['dist_html']}
</div>

<div class="grid">
{cards_html}
</div>
</body>
</html>"""

    with open(out_path, "w") as f:
        f.write(doc)


def main():
    ap = argparse.ArgumentParser(description="§0.7 VLM zero-shot pellet count test")
    ap.add_argument("--dump", required=True, help="path to structural dump dir (pellets.json + tracks.json + frames-pellet/)")
    ap.add_argument("--endpoint", default="http://localhost:8090/v1", help="OpenAI-compatible VLM endpoint")
    ap.add_argument("--n", type=int, default=80, help="number of frames to test")
    ap.add_argument("--crop-size", type=int, default=320, help="crop size in px")
    ap.add_argument("--out", default=None, help="output dir (default: <dump>/../vlm-test)")
    ap.add_argument("--lo", type=int, default=6, help="min white count for frame selection")
    ap.add_argument("--hi", type=int, default=10, help="max white count for frame selection")
    args = ap.parse_args()

    out_dir = args.out or os.path.join(os.path.dirname(args.dump), "vlm-test")
    crops_dir = os.path.join(out_dir, "crops")
    os.makedirs(crops_dir, exist_ok=True)

    print(f"Loading dump from {args.dump} ...")
    pellets, tracks, frames_dir = load_dump(args.dump)
    frame_files = tracks["frame_files"]
    cross_positions = tracks.get("cross_positions", [])
    params = tracks.get("params", {})

    print(f"  {len(pellets['reads'])} reads, {len(frame_files)} frames, "
          f"{len(cross_positions)} crosshair positions")
    print(f"  params: pellet_radius={params.get('pellet_radius')}, "
          f"ammo_offset=({params.get('ammo_offset_x')},{params.get('ammo_offset_y')})")

    selected = select_frames(pellets, args.n, args.lo, args.hi)
    print(f"  {len(selected)} frames selected (white {args.lo}–{args.hi})")

    model = get_model_name(args.endpoint)
    print(f"  VLM model: {model}")

    results = []
    t0 = time.time()
    for i, (frame_idx, track_white) in enumerate(selected):
        fname = frame_files[frame_idx]
        cross = cross_positions[frame_idx] if frame_idx < len(cross_positions) else None
        if not cross:
            print(f"  [{i+1}/{len(selected)}] {fname}: no crosshair, skipping")
            continue

        crop, crop_shape = crop_frame(frames_dir, frame_files, frame_idx, cross, args.crop_size)
        if crop is None:
            print(f"  [{i+1}/{len(selected)}] {fname}: frame not found, skipping")
            continue

        b64 = encode_base64(crop)

        # save crop
        crop_path = os.path.join(crops_dir, fname)
        cv2.imwrite(crop_path, crop)

        # query VLM
        try:
            raw = query_vlm(args.endpoint, model, b64, PROMPT)
        except Exception as e:
            raw = f"ERROR: {e}"

        vlm_count = parse_count(raw)
        delta = (vlm_count - track_white) if vlm_count is not None else None

        results.append({
            "frame_idx": frame_idx,
            "frame_file": fname,
            "track_white": track_white,
            "vlm_count": vlm_count,
            "vlm_raw": raw,
            "delta": delta,
            "b64": b64,
            "crop_shape": crop_shape,
        })

        d_str = f"Δ{delta:+d}" if delta is not None else "PARSE FAIL"
        print(f"  [{i+1}/{len(selected)}] {fname}: track={track_white} vlm={vlm_count} {d_str}  "
              f"raw={raw!r}")

    elapsed = time.time() - t0
    print(f"\nDone in {elapsed:.1f}s ({elapsed/len(results):.1f}s/frame)")

    # summary stats
    deltas = [r["delta"] for r in results if r["delta"] is not None]
    abs_deltas = [abs(d) for d in deltas]
    n_parse_fail = sum(1 for r in results if r["vlm_count"] is None)
    n_valid = len(deltas)

    if n_valid == 0:
        print("ERROR: no valid VLM responses", file=sys.stderr)
        sys.exit(1)

    summary = {
        "n_tested": len(results),
        "n_candidates": len(selected),
        "n_valid": n_valid,
        "n_parse_fail": n_parse_fail,
        "pct_within_1": 100 * sum(1 for d in abs_deltas if d <= 1) / n_valid,
        "pct_within_2": 100 * sum(1 for d in abs_deltas if d <= 2) / n_valid,
        "pct_within_3": 100 * sum(1 for d in abs_deltas if d <= 3) / n_valid,
        "median_abs_err": int(sorted(abs_deltas)[n_valid // 2]),
        "mean_err": sum(deltas) / n_valid,
        "max_abs_err": max(abs_deltas),
    }

    # error distribution for HTML
    from collections import Counter
    dist = Counter(deltas)
    max_count = max(dist.values()) if dist else 1
    dist_rows = []
    for d in sorted(dist.keys()):
        count = dist[d]
        pct = 100 * count / n_valid
        bar_w = max(2, int(300 * count / max_count))
        cls = "good" if abs(d) <= 1 else ("ok" if abs(d) <= 2 else "bad")
        dist_rows.append(
            f'<div class="dist-row">'
            f'<span class="dist-label">{d:+d}</span>'
            f'<div class="dist-bar {cls}" style="width:{bar_w}px"></div>'
            f'<span class="dist-count">{count} ({pct:.0f}%)</span>'
            f'</div>'
        )
    summary["dist_html"] = "\n".join(dist_rows)

    print(f"\n{'='*60}")
    print(f"§0.7 VLM ZERO-SHOT PELLET COUNT — RESULTS")
    print(f"{'='*60}")
    print(f"  Model:          {model}")
    print(f"  Frames tested:  {summary['n_tested']}")
    print(f"  Parse fails:    {summary['n_parse_fail']}")
    print(f"  Within ±1:      {summary['pct_within_1']:.1f}%")
    print(f"  Within ±2:      {summary['pct_within_2']:.1f}%  {'PASS' if summary['pct_within_2'] >= 70 else 'FAIL'} (threshold: 70%)")
    print(f"  Within ±3:      {summary['pct_within_3']:.1f}%")
    print(f"  Median |err|:   {summary['median_abs_err']}")
    print(f"  Mean err:       {summary['mean_err']:+.2f}  (bias)")
    print(f"  Max |err|:      {summary['max_abs_err']}")
    verdict = "VLM VIABLE" if summary["pct_within_2"] >= 70 else "VLM NOT VIABLE"
    print(f"\n  VERDICT: {verdict}")
    print(f"{'='*60}")

    # generate HTML
    report_path = os.path.join(out_dir, "report.html")
    generate_html(results, summary, report_path, args.endpoint, model, args.dump)
    print(f"\n  Report: {report_path}")
    print(f"  Crops:  {crops_dir}/")

    # save raw results as JSON
    json_path = os.path.join(out_dir, "results.json")
    json_results = []
    for r in results:
        json_results.append({
            "frame_idx": r["frame_idx"],
            "frame_file": r["frame_file"],
            "track_white": r["track_white"],
            "vlm_count": r["vlm_count"],
            "vlm_raw": r["vlm_raw"],
            "delta": r["delta"],
        })
    with open(json_path, "w") as f:
        json.dump({"summary": {k: v for k, v in summary.items() if k != "dist_html"},
                    "results": json_results}, f, indent=2)
    print(f"  JSON:   {json_path}")


if __name__ == "__main__":
    main()
