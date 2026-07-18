# SG hit/miss zone calibration — method

Goal: for a shotgun (SG) unit, measure how much of the **spread circle** lands on the
boss's body (**hit zone**, pellets connect) vs. background gaps (**miss zone**, pellets
whiff) — **at each range band**, because the boss's on-screen size (and thus its coverage
of the spread circle) changes with distance.

## Source & scope

- First study: **Noir**, `docs/probes/ar-sg-smg/noir sg.MP4` (2622×1206 @ 60fps).
- Results live in `noir-sg-bands.json` (one entry per range band).

## The three concentric rings (all centered on the core/crosshair center — the "pink dot")

| Ring | What it is | How measured |
|---|---|---|
| **core** | boss red weak-point sphere | color extent of the red core (vertical, to dodge the red status-text band) |
| **crosshair** | white broken 4-arc ring | radial histogram of white-arc pixels → peak radius |
| **spread** | large translucent gray circle (drawn cyan in annotations) | owner-drawn ground truth; auto-estimate = crosshair × mid-ratio |

Mid-band reference: core **D=28**, crosshair **D=66**, spread **D=162** (spread/crosshair ≈ 2.454).

## Hit / miss

- **hit zone** = boss body inside the spread circle (pellets connect).
- **miss zone** = background/gaps inside the spread circle (pellets whiff).
- **Ground truth** = owner hand-outlines the miss patches in red; script fills the outlines,
  clips to the spread circle, and computes areas. (`POC5_missfill.png` = mid-band ground truth.)
- **Auto workflow** (agreed): the script auto-segments boss-body (dark metal OR blue joint-glow
  OR high-texture) → hit; remainder inside circle → miss. Owner corrects by re-outlining if off.

## Choosing the frame per band

Use a frame where **no damage popups overlap the spread circle** — these occur during reload
gaps (the mid frame was a "RELOADING" moment). For a target timestamp, scan a ±window and pick
the frame with the fewest orange-popup pixels near the core, arms-spread pose preferred.

## Bands (Noir study)

`mid` 0:13.9 (done) · `near` ~1:06 · `far` ~1:14 · `mid-far` ~1:57.

## accuracy_circle_scale -> pixels (calibration)

The game's `accuracy_circle_scale` (characters.json) maps to on-screen reticle diameter by a
**proportional** relation (offset ≈ 0), fit from three independent **bloom-peak** points
(AR 75->48px, SMG lm 110->71.5px, SG spread 250->162px):

> **diameter_px = 0.648 * scale**, R^2 = 0.9999

Uniform ~0.648 px per scale-unit, no dead zone; `accuracy_circle_scale` is the fully-bloomed reticle
diameter. **SUPERSEDES (2026-07-17)** the old `0.751*scale - 25.2` — that offset was a bloom-phase
artifact (the earlier AR 29px / SMG 60px were mid-bloom snapshots). Full data + provenance in
`accuracy-circle-calibration.json`; the reticle pulses on the fire cadence between a contracted floor
and the peak (see DERIVATION §2b).

**Cross-check / optimal range (reframed):** the AR reticle's contracted **floor** (~29px) ≈ the
mid-band boss core (28px), measured independently — but the AR *accuracy circle* is 48px, not 29px.
So fully bloomed the AR core fraction is only ~0.34; high Hit Rate squeezes the bloom toward the 29px
floor (≈ core), where core saturates to ~1. That is the real "optimal range = all-core" mechanism.

This conversion is the bridge from a unit's datamined `accuracy_circle_scale` to the on-screen
circle used for the hit/miss-vs-range computation above.

## Reproduce

Frames + overlays are generated in the session scratchpad; ground-truth annotations and the
band JSON are the durable artifacts kept here in `docs/data/sg-calc/`.
