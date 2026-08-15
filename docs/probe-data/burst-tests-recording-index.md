# docs/probes/burst tests/ — recording index

Media in that directory is gitignored (it exists only in the main checkout), and the pre-commit
hook cannot stage ANY path under `docs/probes/` (lint-staged's re-add fails on ignored paths), so
this index lives here in `docs/probe-data/` instead of beside the media. A convenience copy may
be placed at `docs/probes/burst tests/probe.md` in the main checkout; THIS file is the tracked
source. Context: test battery 3 Part A (`docs/probe-runs.md`, 2026-07-13 entries at lines
480–530). All recordings: scope lock, full auto, 1206x2622 portrait (2622x1206 landscape after
ffmpeg auto-rotate), 60 fps.

## a2 anis star.MP4 — the Part A3 SOLO recording (identity confirmed 2026-08-15)

- **Identity (verified from the footage, 2026-08-15):** `anis-star` (Anis: Star, rocket
  launcher / Electric / Burst I / Defender) **alone — no teammate in any sampled frame** across
  the whole 22.5 s file. Evidence: one character model on field in every 1 fps full frame; the
  entry cut-in shows a single portrait; 6-round magazine counter (matches her datamined ammo 6);
  charge-percent HUD; a solo Burst I cast at video t≈20.4–21.7 whose stage-II hand-off timer
  (08.32 s) counts down with nobody to receive it — the burst-chain collapse the Part A3 entry
  recorded.
- **Provenance trap:** the `a2` filename prefix belongs to the A1/A2 TEAM pair below; this file
  is the **A3 solo** despite the shared prefix.
- **Timeline:** load screen to ~6.2 s; fight timer 03:00 at video t≈6.5 s; magazine 1 fired
  ~8.8–13.7 s; reload 14.0–16.0 s; magazine 2 fired ~17.2/18.1/19.1 s; gauge green-full 19.38 s;
  Burst I cast ~20.4 s; bar zeroes 21.73 s; file ends 22.5 s.
- **Reader artifact span:** a screen-tint/flash corrupts the solo gauge reader over
  t≈16.0–17.97 s (fill drifts down then flashes to 100 while filling) — exclude reads there.
- **Parsed:** `docs/probe-data/anis-star-solo-a3-gauge-reread.json` (2026-08-15 per-pull re-read;
  measurement logged in `docs/probe-runs.md`). Re-derive frames:
  `ffmpeg -i "docs/probes/burst tests/a2 anis star.MP4" -vf "fps=30,crop=400:160:2350:430"` and
  run `scripts/probe/gauge-fill.py --fps 30 --calib-frame 300`.

## a2 takina focus.MP4 / a2 crown focus.mov — the Part A1/A2 TEAM pair

Two-unit team (`takina` slot 1, `crown` slot 2), camera focus on crown (A1) vs takina (A2);
the focus-only ×2.5 charge-gauge measurement (`docs/probe-runs.md:485–509`).

## alice focused.MP4 (+ .jpg) — full-burst-count recording

`alice` (SR/Fire) focused, team context; used for full-burst counts, NOT for gauge reads (the
2026-07-29 "isolating team-context gauge read" task on it was retired as a category error). Also
one of the three recordings on which the team bar geometry (134 px, rows 491–498) was measured.

## Raven Solo Burst Gen.MP4 (+ .jpg) — raven solo burst-generation recording

Solo `raven` burst-generation footage (separate thread; not part of battery 3).
