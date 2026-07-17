# SG/accuracy-circle calibration — derivation

> **These numbers are approximations.** Every value here is measured from screen recordings or
> hand-outlined, then fit to the simplest logically-consistent model. They are internally
> cross-validated (see §4) and serve as a **principled baseline** for reticle/accuracy geometry.
> They **cannot reach true in-game accuracy without the game source code** — the exact reticle
> render formula, camera projection constants, and per-shot bloom RNG are unknown. Treat as a
> grounded starting point to refine with more measurements; never as measured-truth.

All pixel measurements are at the scope-lock recording resolution **2622×1206**.

## 1. Ring geometry per frame (concentric on the core/crosshair center)

For each recording we locate the boss core (red weak-point) and measure three concentric rings:

| Ring | How measured |
|---|---|
| core (red) | color extent of the red core (vertical, to dodge the horizontal red status-text) |
| crosshair (white) | radial histogram of white-arc pixels → peak radius |
| spread / accuracy circle | owner-drawn ground truth (cyan); the gray translucent disc |

## 2. `accuracy_circle_scale` → pixel diameter

Three independent (scale, pixel-diameter) points, each from a different weapon class / recording:

| Element | Unit | Scale | Measured px |
|---|---|---|---|
| AR inner accuracy circle | scarlet (0:10) | 75 | 29 |
| SMG crosshair | quency (0:22) | 110 | 60 |
| SG spread circle | noir (mid, 0:13.9) | 250 | 162 |

Least-squares fit:

> **diameter_px = 0.751 · scale − 25.2**  (equivalently `0.751·(scale − 33.6)`), **R² = 0.999**

- **Not proportional** — px/scale runs 0.39 → 0.55 → 0.65 across the three points.
- Slope ≈ ¾ px per scale-unit; a **~34-scale dead zone** below which the circle renders ~0px.
- The additive constant (~25px) is the fixed base reticle size.

## 3. Boss core diameter ↔ range band

Core diameters measured per Noir band (near→far, boss shrinks with distance):

| Band | Core D (px) | Range bounds (owner) |
|---|---|---|
| near | 31 | 15–25 |
| mid | 28 | 25–45 |
| mid-far | 21 | 35–55 |
| far | 17 | 56–100 |

Model selection (both numbers treated as fuzzy; the range **bounds** are the hard constraint):

- **Pure inverse `d = k/r`** — RULED OUT. Requires `d·r` constant, but near's feasible `d·r`
  interval `[465,775]` and far's `[952,1700]` do not overlap → impossible within bounds.
- **Linear `d = a − b·r`** — RULED OUT. Best fit puts mid-far at range 57.7, past its 35–55 cap.
- **Inverse-with-offset `d = k/(r + c)`** — SELECTED. All four implied ranges land in-bounds; R²=0.93.

> **core_D_px ≈ 2100 / (range + 47)**   →   inverted:  **range ≈ 2100 / core_D_px − 47**

Implied ranges: near 20.7, mid 28.0, mid-far 52.9, far 76.4 — all inside the owner bounds. This is
the physically expected form: apparent size ∝ 1/(distance + camera-offset); the **~47 offset** is
the camera-to-shooter distance, which is why pure `1/r` was too steep. `k,c` still ride on fuzzy
range midpoints (±~10%); the **form** is what the bounds robustly select.

## 4. Hit / miss zones (SG pellet geometry)

Within the spread circle, we hand-outline (owner ground truth) the **miss** patches — background
gaps where pellets whiff — and take **hit = spread − miss** (boss body, pellets connect):

| Band | Core D | **Hit** | **Miss** |
|---|---|---|---|
| near | 31 | 79.7% | 20.3% |
| mid | 28 | 71.0% | 29.0% |
| mid-far | 21 | 63.4% | 36.6% |
| far | 17 | 46.5% | 53.5% |

Hit% declines cleanly with range (near 79.7 → far 46.5): the boss shrinks inside the fixed
D=162 spread circle, so more pellets land on background. Annotations: `noir-sg-*-missred.png`,
`POC5_missfill.png`. Data: `noir-sg-bands.json`.

## 5. Cross-check (independent validation)

The AR 75-scale accuracy circle = **29px**, and the mid-band boss core = **28px**, measured
completely separately (one from the AR reticle, one from hand-outlining Noir's core). They match
to 1px, and **mid is the AR's optimal range**. That is the design meaning of optimal range: the
accuracy circle shrinks to the core diameter, so every in-zone shot is a core hit. The core never
entered the §2 regression yet lands on the predicted AR circle — an independent check on the whole
scale→pixel map.

## Reproduce

Measurement + fit scripts run in the session scratchpad (`ffmpeg` frame extraction + OpenCV color
/ radial-histogram / regression). Durable artifacts: the JSONs and annotation PNGs in this folder.
