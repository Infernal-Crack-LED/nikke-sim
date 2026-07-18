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

Three independent (scale, pixel-diameter) **bloom-peak** points, each from a different weapon class /
recording (the reticle pulses on the fire cadence — measure the fully-bloomed peak, not a snapshot):

| Element | Unit | Scale | Measured px (peak) |
|---|---|---|---|
| AR accuracy circle | scarlet | 75 | 48 |
| SMG accuracy circle | little-mermaid (lm, 0:10) | 110 | 71.5 |
| SG spread circle | noir (mid, 0:13.9) | 250 | 162 |

Least-squares fit (through the origin):

> **diameter_px = 0.648 · scale**, **R² = 0.9999**

- **Proportional** — px/scale is uniform: 48/75 = 0.640, 71.5/110 = 0.650, 162/250 = 0.648.
- `accuracy_circle_scale` **is** the fully-bloomed reticle diameter; **no dead zone**.
- **SUPERSEDES (2026-07-17)** the old `0.751·scale − 25.2`: that −25.2 offset was a **bloom-phase
  artifact**. The earlier AR (29px) and SMG (60px) points were mid-bloom snapshots; re-measuring every
  class at its **peak** collapses the offset to 0. Consequence: the AR base core fraction drops from
  ~1.0 (the 29px reading) to **0.34** (48px), which is what makes the HR→core shrink model have real
  headroom on AR.

### 2b. Reticle bloom (why the peak is the anchor)

The reticle is not static — it **pulses on the fire cadence** (~20 Hz), expanding on each shot and
contracting between shots, oscillating between a contracted **floor** and a fully-bloomed **peak**.
Measured directly on `lm.MP4` (SMG little-mermaid) over a 60-frame window: the circle cycles between a
contracted ~59px and the ~71.5px peak. `accuracy_circle_scale` corresponds to the **peak**, so a
single-frame snapshot taken mid-cycle under-reads it — which is exactly what happened to the original
AR (29px) and SMG (60px) points and produced the spurious −25.2 offset. Hit Rate suppresses the bloom
(shifts the whole oscillation toward the floor), which is the physical basis of the HR→core shrink model.

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

## 5. Cross-check (independent validation) — reframed after the bloom recalibration

The AR reticle's **contracted floor / inner bound** reads **~29px**, and the mid-band boss core =
**28px**, measured completely separately. They match to 1px. But 29px is **not** the AR accuracy
circle — fully bloomed that circle is **48px** (§2). So the correct reading is: **29px is the AR
reticle's HR-shrink floor**, and it happens to equal the core. That makes the "optimal range =
all-core" mechanism a *saturation* effect: fully bloomed the AR core fraction is only
`coreFracGeo(28, 48) ≈ 0.34`; as Hit Rate squeezes the bloom down toward the 29px floor (≈ core),
`coreFracGeo → ~1`. The old "AR circle 29 ≈ core 28 ⇒ ~100% core at optimal" reading conflated a
mid-bloom *snapshot* of the accuracy circle with the floor. The core still never entered the §2
regression, so its ≈ the floor is an independent check on the shrink model.

## Reproduce

Measurement + fit scripts run in the session scratchpad (`ffmpeg` frame extraction + OpenCV color
/ radial-histogram / regression). Durable artifacts: the JSONs and annotation PNGs in this folder.
