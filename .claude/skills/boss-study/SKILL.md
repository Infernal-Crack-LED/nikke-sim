---
name: boss-study
description: Boss studies — turn a fight recording into a boss-profile fragment (downtime windows, transitions, cover phases) via the mechanical scanner + a BLIND authoring pass. Use when processing footage for a new boss profile or validating the pipeline against a known boss.
---

# boss-study — recordings into boss profiles

Spec: `docs/handoffs/2026-07-16-boss-studies-spec.md` (rev 3+). This skill owns the FLOW;
the spec owns the schema and rulings (owner-authored QTE/element-lock, no community footage,
infinite HP / time-based triggers, DEF deferred to v2).

## The flow

1. **Scan (mechanical, no interpretation):**
   ```sh
   python3 scripts/boss-study/scan.py <video> --out <dir>
   ```
   Emits `observations.json` + per-window evidence sheets. Detectors: ammo-box tracker
   (NCC + digit-signature verify; NORMAL vs INVERTED=reload states), glyph ammo reads
   (authoritative on settled samples only), digit-stability firing classification
   (low-confidence samples are NEVER "firing"), UI-presence fight clock, FB-splash scan
   (probe-processing signature), face-count cover metric (v0 skin-blob proxy — DEAD, log column
   only), **and the CALIBRATED v1 cover/boss-walk detector** (`coverFaceWindowsVideoSec`):
   anime-face cascade (vendored lbpcascade_animeface.xml + `opencv-python-headless<5`; skipped
   gracefully if cv2 absent — pass `--team-size N` for the comp). Five frontal faces = the squad
   stood down: fires at EVERY boss-unhittable walk AND forced-cover phases (validated on
   714-noon/1.mp4 all five transitions + fight-end cover; zero false positives on crown.MP4).
   It is the durable second downtime signal — it pins transitions the ammo trace loses to
   natural-reload masking. Notes: during cover the reticle STAYS and the reload bar is routine
   (no UI shortcut); the yellow centre countdown is the FULL BURST timer (an FB marker, NOT a
   cover marker); kit states can RESKIN the focus aim UI (Red Hood's "SVD-00 READY" red launcher
   box embeds the ammo counter) — the tracker's template/verifier needs per-kit variants on such
   units, else it emits false "absent" runs.
   **Frame-reading rule (whole-picture):** never classify a new UI element from one frame in
   isolation — cross-check against calibration frames already in hand (root case: the FB
   countdown "02.38" misread as a cover-mechanic timer while our own crown t=60 frame shows
   "08.7" mid-FB).

2. **Author (BLIND subagent).** Spawn a subagent whose ONLY inputs are `observations.json`, the
   evidence sheets, and (for a real boss) the owner-authored block (QTE/element-lock windows,
   passed through verbatim). The subagent must NOT read the repo — no sim.ts, no docs, no git.
   It classifies every candidate window (boss-downtime / burst-pause / natural-reload /
   ambiguous), estimates transition times, and returns a profile fragment + per-window audit
   table + ⚑ list. Prime directive as kit-parse: faithful > fit; an honest AMBIGUOUS beats an
   invented classification.
   Attribution guards it must apply:
   - **the PRIMARY Full-Burst signal is `fullBurstWindowsVideoSec`** (the right-edge burst meter:
     white/grey = charging, red/flashing ~1Hz = inside FB; owner-identified, validated on
     crown.MP4 — 12 FBs all ~10s where the splash scan found only 8). Splashes are a secondary
     cross-check only — known to miss on bright boss backgrounds. Chain-cast pauses cluster in
     the ~4s BEFORE each FB window start;
   - a window whose ammo trace ran to ~0 with an INVERTED (reload) tail is a natural reload;
   - kit refills jump the counter WITHOUT a pause — events, not windows;
   - the top-centre damage total is NOT a downtime signal (DoTs).

3. **Grade (main session, NOT blind).** Compare the blind output against ground truth (known
   profile, or the owner-authored block + sim rotation). Pre-register expectations BEFORE the
   scan (Fable pre-op gate — standing rule): expected FB count + times from the sim, transition
   spacing tolerances, the masked-transition rule (a transition hidden inside a natural reload
   PASSES only if the ammo trace shows that reload), face-metric evaluability. Record results in
   the study's handoff doc; measurements → docs/probe-runs.md; rulings → DECISIONS.

## Calibration assets

`scripts/boss-study/ammo-box-template.png` + `glyphs.npz` were cut from crown.MP4
(2622×1206 landscape). A different resolution/aspect or a different focus-unit weapon UI needs
re-calibration (the box geometry constants live at the top of scan.py). MG counter fact: ticks
~30/s hot (settled-frame validated); other weapons need their own change-rate sanity check
before trusting digit-stability = holding fire.
