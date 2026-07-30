# Pellet reader — prior-art survey (how does the rest of the world solve this?)

> Date: 2026-07-30 · AI-facing · **findings-only, nothing enacted**
> Trigger: repeated failures of the SG pellet counter (VLM, OpenCV, OCR; qwen/kimi/claude) —
> see `docs/handoffs/2026-07-29-sg-landing-recalibration-plan.md` (REJECT outcome),
> `scratchpad/pellets/HANDOFF.md` (tuning record), open-questions **U35**.
>
> Purpose: find out whether this workflow is already solved elsewhere, name concrete vetted
> candidates with sources, and record the dead paths so nobody re-walks them.

---

## 1. The problem, stated the way the literature states it

Strip the game context and this is a textbook problem with three well-studied fields behind it:

> **Detect, count, and (optionally) localize up to ~10 small, roughly-circular, near-point-like
> bright features (white; a rare red variant) that appear transiently (~13 frames @60 fps) at
> quasi-static positions inside a ~170 px-diameter region of a noisy, cluttered, high-dynamic-range
> video frame, where the clutter includes bright transient VFX of similar size and colour, moving
> HUD elements, and occluding overlaid text (damage numbers). Count accuracy target: ≈ ±0.5 of 10.**

That is, near-verbatim, the problem statement of:

- **Single-particle tracking / spot detection in fluorescence microscopy** (bright diffraction-limited
  dots, noisy variable background, count + localize + track).
- **Point-source detection in astronomical images** (faint point sources, structured background,
  crowded/blended sources, accuracy-critical photometry).
- **Infrared small/dim target detection (IRSTD)** (few-pixel point targets on cluttered bright
  backgrounds, false-alarm suppression is the whole game).

All three have decades of vetted, benchmarked tooling. **We have been solving a solved problem with
an ad-hoc method.** Specifically, `count-pellets.py` uses an _absolute RGB threshold_ (`R,G,B ≥ 210`)

- connected components + circularity, which is the one approach every one of those fields abandoned
  first, for exactly the failure modes we are hitting.

### 1a. Diagnosis — why the current pipeline fails (from our own record)

Reading `scratchpad/pellets/HANDOFF.md` against the literature, three structural faults stand out.
These determine which candidates below are worth anything:

| #      | Fault                                                                                                                                                                                                                                                                                                                                                                                          | Consequence                                                                                                                        |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **F1** | **Absolute-brightness thresholding.** A pellet is visible ~6–7 frames at our 30 fps sampling, yet the handoff reports "most real pellet tracks are life=1 (detected only at peak brightness)". If true, the detector is seeing ~1/6 of the available evidence per pellet. ⚠ _This is the single most load-bearing claim in this doc and it is currently a repo assertion, not a measured one._ | Missed shots (70/90 = 78% detection), cold per-shot counts, and no robustness to VFX changing local background brightness.         |
| **F2** | **Counting blobs in one chosen frame, not counting tracks.** Temporal tracking exists but is used only as a _filter_ (life ≤ 7 = pellet). The shot total is the blob count of a single "median" frame. Every vetted pipeline in §2 counts **tracks**, not per-frame blobs.                                                                                                                     | Occlusion undercount and single-frame VFX spike overcount are _both_ single-frame artifacts — track-counting removes both classes. |
| **F3** | **Validation set of 6 hand-counted shots, no standard metric.** The fields above validate on labeled sets with Jaccard/F1 + localization RMSE (the ISBI Particle Tracking Challenge metrics). We cannot select between candidates on 6 shots.                                                                                                                                                  | Every tuning pass has been a fit to a handful of frames — which is precisely why it did not generalize from `marciana` to `noir`.  |

**F3 is the gate on everything else.** No candidate below can be chosen without a bigger labeled set,
and §4 argues the cheapest labeled set is synthetic, not hand-counted.

---

## 2. Candidate solutions (vetted, with sources)

Ordered by expected value here. C1–C5 are the five real recommendations; C6–C9 are credible but
second-tier.

### C1 — Matched-filter spot detection (LoG / DoG / DAOFIND) instead of RGB thresholding

**What.** Replace `R,G,B ≥ 210 → connected components` with a Laplacian-of-Gaussian (or
Difference-of-Gaussian) filter tuned to the pellet radius, then local-maxima detection with a
threshold on _filtered response_ (i.e. local contrast), not absolute pixel value.

**Why it fits.** This is the standard answer to F1. A matched filter responds to a _blob of the right
size against its local background_, so a dimming pellet at frame 8 of its lifecycle still fires, and
a bright-but-wrong-size VFX smear does not. It is also brightness- and background-invariant, which is
exactly what broke generalization from `marciana` to `guilty`/`isabel`.

**Evidence it works.** Fiji/TrackMate's default detector is LoG, documented as "performing remarkably
well for its simplicity… excels at finding bright, blob-like, roundish objects" and needing only two
parameters (approximate diameter + quality threshold) — our two parameters are both known. Its
accuracy is characterized against the ISBI Particle Tracking Challenge ground truth. `photutils`
ships `DAOStarFinder`, an implementation of Stetson's DAOFIND (1987) that finds local density maxima
matching a 2D Gaussian kernel of a given size, validated in practice to "identify faint sources with
high accuracy while not producing a large excess of false sources." scikit-image ships
`blob_log`/`blob_dog`/`blob_doh` directly.

**Cost.** Low. `skimage.feature.blob_log` or `photutils.DAOStarFinder` is a drop-in replacement for
the thresholding block in `count-pellets.py`; the venv already has numpy/scipy/opencv.

**How we'd validate it here.** Score against the labeled set from §4 with Jaccard + count RMSE.
Cheap falsification: re-run on the 6 existing hand-counted shots and check whether track lifetimes
rise from ~1 toward the expected 6–7 (this alone confirms or kills F1).

Sources: [TrackMate LoG/DoG detector](https://imagej.net/plugins/trackmate/detectors/difference-of-gaussian) ·
[TrackMate accuracy vs ISBI ground truth](https://imagej.net/plugins/trackmate/accuracy) ·
[photutils point-source detection](https://photutils.readthedocs.io/en/stable/user_guide/detection.html) ·
[TrackMate review (Wiley Analytical Science)](https://analyticalscience.wiley.com/content/article-do/trackmate-my-favorite-image-analysis-tool-neubias-members) ·
[spot-detection methods review](https://www.ias-iss.org/ojs/IAS/article/view/1690)

---

### C2 — Count **tracks**, not blobs: Crocker–Grier / LAP linking (trackpy)

**What.** Detect in every frame, link detections across frames into tracks (nearest-neighbour or
LAP), then define the shot's pellet count as **the number of distinct tracks born inside the shot
event**, with a plausible-lifetime filter. Not "the blob count of the best frame".

**Why it fits.** This is the direct fix for F2, and it fixes both error directions at once:

- A VFX blip is a **1-frame track** at a random position → rejected on lifetime.
- A pellet occluded by a damage number for 1–2 of its 6–7 frames is **still one track** (linking
  bridges gaps) → no undercount, and no need for the rejected "peanut" multiplicity heuristic.
- Our pellets are nearly ideal for this: they are **static** once landed, and consecutive shots are
  40 game-frames apart while a pellet lives 13 — so tracks from adjacent shots barely overlap.

**Evidence it works.** `trackpy` is a Python implementation of the Crocker–Grier algorithm, described
as "a precise approach in colloidal studies for identifying and tracking small roughly point-like
features on a noisy and variable background", with documented sub-pixel precision better than 0.05 px.
Its pipeline is literally the three stages we want: bandpass → local maximum → centroid refine, then
link. TrackMate provides the same in a GUI with ISBI-benchmarked linkers.

**Cost.** Low–medium. `trackpy.batch()` + `trackpy.link()` replaces both the detection block and the
hand-rolled greedy tracker and debouncer in `read-pellets.ts`.

**Caveat.** Track-counting changes the _definition_ of a shot count, so the 6-shot ground truth must
be re-scored under the new definition before comparing to old runs.

Sources: [trackpy introduction](https://soft-matter.github.io/trackpy/dev/introduction.html) ·
[trackpy subpixel accuracy/uncertainty](http://soft-matter.github.io/trackpy/dev/tutorial/uncertainty.html) ·
[Crocker–Grier reference implementation](https://github.com/tacaswell/trackpy) ·
[ISBI Particle Tracking Challenge](http://bioimageanalysis.org/track/)

---

### C3 — Exact-sprite template matching with alpha masks + NMS (Multi-Template-Matching)

**What.** NIKKE is a Unity game. The pellet-hit marker and the red core triangle are **fixed sprites**,
not procedural effects. Extract them from the game's asset bundles at pixel-exact resolution with
their alpha channel, then detect by alpha-masked normalized cross-correlation with non-maximum
suppression and an expected-object-count cap.

**Why it fits.** This turns a statistical detection problem into a near-deterministic one. NCC is
insensitive to brightness changes (it mean-centers and normalizes both template and window), which
kills F1. Multiple templates handle the pellet's lifecycle stages (small → peak → shrink) and the
white/red variants — which is exactly what MTM is built for. And the alpha mask means the sprite's
transparent corners don't drag the correlation against whatever background is behind it.

**Evidence it works.** `Multi-Template-Matching` (Thomas & Gehrig, _BMC Bioinformatics_ 21:44, 2020)
is a maintained package whose `matchTemplates` returns best locations given a score threshold and/or
an expected number of objects, combining detections from multiple templates and filtering them with
NMS to prevent overlapping detections. Alpha-masked NCC for object detection is a documented
technique. On the asset side, **AssetRipper** extracts individual sprites from packed atlas textures
with accurate UV mapping and slicing data (and has official Mac releases); **NikkeTools** handles
NIKKE's specific asset encryption/decryption; **nikke-db** already hosts extracted NIKKE assets.

**Cost.** Medium — the asset-extraction leg is the unknown (finding the right sprite in the bundle).
But it is _one-time_, and it is the only candidate that could plausibly get us to near-exact counts.

**Risk.** If the marker is rendered with additive blending / a shader tint rather than blitted
straight, the on-screen appearance won't match the raw sprite and NCC degrades. Falsifiable in an
afternoon: extract one candidate sprite, correlate against a known-good frame, look at the peak.

Sources: [Multi-Template-Matching (BMC Bioinformatics 2020)](https://link.springer.com/article/10.1186/s12859-020-3363-7) ·
[MTM Python package](https://github.com/multi-template-matching/MultiTemplateMatching-Python) ·
[alpha-masked NCC for object detection](https://v-hramchenko.medium.com/normalized-cross-correlation-with-alpha-masked-templates-for-object-detection-c5eb76b16479) ·
[AssetRipper](https://assetripper.org/) · [NikkeTools](https://github.com/FZFalzar/NikkeTools) ·
[nikke-db](https://github.com/Nikke-db/Nikke-db.github.io)

---

### C4 — Top-hat + local-contrast preprocessing (the IRSTD stack)

**What.** Morphological top-hat transform to remove the smooth background, then a Local Contrast
Measure (LCM / RLCM / MPCM family) to amplify point targets and suppress clutter, then adaptive
thresholding. A preprocessing stage, composable with C1/C2.

**Why it fits.** This subfield exists _specifically_ for "small dim point targets against a bright,
cluttered, high-brightness background with edge and clutter false alarms" — our exact false-positive
profile (boss VFX, HP bar, perimeter red circles). It is deterministic, training-free, and cheap.

**Evidence it works.** The standard formulation: "the infrared image undergoes top-hat transformation
to mitigate most background clutter and highlight potential target pixels", followed by a local
contrast operator to "enhance the target and suppress the background", with adaptive threshold
segmentation. The LCM family (LCM, ILCM, RLCM, DLCM, MPCM) is an active, benchmarked literature with
documented detection-rate / false-alarm-rate tradeoffs, explicitly motivated by the failure of plain
statistical window features on "interfering targets, high brightness background, background edges,
and clutter".

**Cost.** Low. `cv2.morphologyEx(..., MORPH_TOPHAT)` plus a ~20-line LCM implementation.

Sources: [LCM framework for IR small-target detection (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S026322411630238X) ·
[A Local Contrast Method for Small Infrared Target Detection](https://www.researchgate.net/publication/260623416_A_Local_Contrast_Method_for_Small_Infrared_Target_Detection) ·
[joint local contrast measures](https://www.sciencedirect.com/science/article/abs/pii/S0030402622016953) ·
[regional feature difference of patch image](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9103031/)

---

### C5 — deepBlink (U-Net spot localization, threshold-independent)

**What.** A trained U-Net that outputs spot coordinates directly, with no intensity threshold to tune.

**Why it fits.** It attacks our worst meta-problem: **every parameter we tune is a parameter that
fails to generalize to the next video.** deepBlink's headline property is threshold-independence. It
trains from "custom images and coordinate labels", which is exactly the artifact §4 produces anyway.

**Evidence it works.** deepBlink (Eichenberger et al., _Nucleic Acids Research_ 49(13):7292, 2021)
"outperforms other state-of-the-art methods across six publicly available datasets containing
synthetic and experimental data", with detection efficiency above 85% and localization error below
0.5 pixels, on 129 smFISH / 105 SunTag / 64 Particle / 240 Microtubule / 240 Receptor / 240 Vesicle
images — i.e. it is benchmarked at dataset sizes we can realistically produce.

**Cost.** Medium-high (needs a training set + a GPU-ish training run), but the training set is the
same artifact C1–C4 need for validation, so the marginal cost is the training loop.

Sources: [deepBlink (NAR 2021)](https://academic.oup.com/nar/article/49/13/7292/6312733) ·
[deepBlink (PMC full text)](https://ncbi.nlm.nih.gov/pmc/articles/PMC8287908) ·
[DeepSpot (related, spot enhancement)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10951802/)

---

### C6 — Temporal median background subtraction (preprocessing)

Per-pixel temporal median over a rolling window models the slowly-varying background (boss body, HUD,
static geometry); subtracting it leaves transients. Pellets are transient _and_ static-in-position —
a favourable signature. Documented as the simplest reliable background model ("pixel-wise temporal
median filtering"), with the known caveat that the model degrades when foreground occupies many
frames — mild here, since pellets occupy ~13/40 frames of a shot cycle at a small pixel footprint.

Cheap, composable with C1/C4, and worth trying before anything expensive.
Caveat: the camera/crosshair moves, so this must be done in a **crosshair-stabilized** reference
frame or it smears — which couples it to the crosshair-tracking problem we already have.

Sources: [robust background subtraction techniques](https://www.osti.gov/servlets/purl/15013815) ·
[background subtraction method survey](https://www.banuba.com/blog/background-subtraction-guide)

---

### C7 — Fine-tuned small-object detector (YOLOv8/RT-DETR) + SAHI tiled inference

Train a detector on labeled pellet frames; run inference tiled via SAHI to recover small-object
performance. YOLOv8 has been shown to give "almost perfect object detection even when trained on a
small dataset (100 to 350 images)" in a peer-reviewed behavioural-research setting. SAHI (Akyon et
al., 2022) reports +6.8/5.1/5.3 AP from sliced inference alone and cumulative +12.7/13.4/14.5 AP with
sliced fine-tuning, on VisDrone/xView. Synthetic training data is trivially available to us (§4), and
models trained on synthetic images have been shown to reach "F1-scores very competitive to models
trained on real images."

Caveat: documented generalization weakness — "YOLO detectors don't extrapolate well to the same
object in other backgrounds", restored by training across varied backgrounds. That is a direct
warning about the marciana→noir failure we already lived, and it means the synthetic generator must
sample backgrounds from _all_ our videos, not one.

Sources: [SAHI (arXiv 2202.06934)](https://arxiv.org/abs/2202.06934) ·
[SAHI explained (LearnOpenCV)](https://learnopencv.com/slicing-aided-hyper-inference/) ·
[YOLOv8 on small datasets (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11362367/) ·
[object detectors trained on synthetic data](https://scholarworks.sjsu.edu/cgi/viewcontent.cgi?article=1737&context=etd_projects)

---

### C8 — Density-map counting (U-Net density regression / P2PNet)

If we only need the **count** and not per-pellet positions, density-map regression needs only
dot annotations (much cheaper than boxes) and "can be trained end-to-end from very few images".
P2PNet (ICCV 2021) is the point-based counting reference. Deprioritized because (a) we plausibly
_do_ want positions later — `read-markers.py`'s one value-add was radial landing positions, which
feed the UNIGEO coverage model directly — and (b) P2PNet is documented as _not_ handling small-object
features and scale changes well, which is our regime.

Sources: [P2PNet (ICCV 2021)](https://openaccess.thecvf.com/content/ICCV2021/html/Song_Rethinking_Counting_and_Localization_in_Crowds_A_Purely_Point-Based_Framework_ICCV_2021_paper.html) ·
[density-map counting implementation](https://github.com/NeuroSYS-pl/objects_counting_dmap)

---

### C9 — Distance-transform watershed / StarDist for merged blobs

Targeted only at the overlap/occlusion undercount. Distance-transform watershed is the classical
answer for splitting touching round objects and "works very well on rounded objects". StarDist
represents objects as star-convex polygons and "outperformed strong watershed and U-Net baselines",
excelling "on densely packed, roughly round nuclei where pixel-based methods tend to merge touching
objects".

**Deprioritized on our own evidence**: `scratchpad/pellets/HANDOFF.md` §3b established that our
occlusion cases are 12 px² slivers at the noise floor, and that the shot-level count was already
correct — i.e. the merge problem is small here, and C2 (track-counting) addresses it more cheaply.
Keep in reserve if C2's linking proves insufficient.

Sources: [scikit-image watershed](https://scikit-image.org/docs/stable/auto_examples/segmentation/plot_watershed.html) ·
[ImageJ distance-transform watershed](https://imagej.net/plugins/distance-transform-watershed) ·
[StarDist (Cell Detection with Star-convex Polygons)](https://arxiv.org/pdf/1806.03535) ·
[StarDist 3D / benchmark vs watershed (WACV 2020)](https://openaccess.thecvf.com/content_WACV_2020/papers/Weigert_Star-convex_Polyhedra_for_3D_Object_Detection_and_Segmentation_in_Microscopy_WACV_2020_paper.pdf)

---

## 3. Rejected / dead paths (do not re-walk)

| Path | Verdict | Why |
| ------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **VLM counting** (GPT-4V-class, qwen/kimi/claude vision) | **REJECTED — primary counting** | Documented across benchmarks: GPT-4V "fails on all object counting tests"; models are "ineffective at counting challenging objects, including small objects"; accuracy degrades with occlusion and clutter, and beyond ~10–20 objects. This matches our own experience exactly, and the repo already rules that re-running a VLM reader is not a confirmation route (QUEUE ⚠ 137). |
| **SAM / SAM 2** | **REJECTED — detection** | "Sometimes fails to cleanly segment very tiny objects… particularly when they occupy only a few pixels"; ~12×12 px objects get segmented as a single unit; needs prompt context it can't get here. Possible future role: mask refinement _given_ seeds from C1/C3 — not a detector. |
| **Ring/annulus structural detector** (`read-markers.py`, `marker_detect2.py`) | **REJECTED (in-repo, 2026-07-26)** | Requires a dark grey ring our pellets lack → under-counts (0 white where owner sees 7–9); lowering the score threshold does nothing because the structural filters are the bottleneck; its "red circles" are perimeter VFX, not cores. Recorded in `scratchpad/pellets/HANDOFF.md`. **Its ammo-box crosshair track and radial-position output are still worth salvaging.** |
| **Peanut / area-multiplicity recovery heuristic** | **REJECTED (in-repo, run19)** | Measured regression: valid shots 58→49, above-bound 5→14. Left in-tree disabled (`--peanut-max-mult 0`). C2 supersedes the motivation. |
| **Hough Circle Transform** | **REJECTED (expected) — cheap to falsify** | Needs resolvable circular _edges_; our pellets are ~7 px native filled, anti-aliased dots. HCT is parameter-brittle at small radii and is not what any of the three reference fields uses. Not worth a session; if someone insists, 30 minutes on the 6 labeled shots settles it. |
| **Cellpose** | **NOT RECOMMENDED** | Excellent generalist, but built for _textured cells with size/flow priors_, benchmarked on cell corpora (70k+ segmented objects). Our targets are point-like, not cell-like; deepBlink (C5) and StarDist (C9) are the better-matched members of that family. |
| **Zero-shot open-world counting** (CountGD, T-Rex2/CountAnything) | **NOT a primary; useful as a cross-check** | Genuinely capable (visual-exemplar + text prompting, GroundingDINO-based), but open-world counting offers no accuracy guarantee near our ±0.5-of-10 bar. Real value: **bootstrapping labels** for §4 / providing an _independent-method_ second opinion, which the repo's evidence rules explicitly want. |
| **More parameter tuning of the current RGB-threshold detector** | **STOP** | Four documented tuning passes (run16→run19, then the per-video-template pass) each fixed the tuning video and failed the next unit. The method, not the parameters, is the defect (F1/F2). Further tuning is the definition of fitting to the instrument. |

Sources for the rejections: [LVLM effectiveness assessment (arXiv 2403.04306)](https://arxiv.org/pdf/2403.04306) ·
[LVLM-Count](https://arxiv.org/html/2412.00686) · [GPT-4V evaluation (Roboflow)](https://blog.roboflow.com/gpt-4-vision/) ·
[SAM 2 (arXiv 2408.00714)](https://arxiv.org/pdf/2408.00714) · [SAM 2 small-object limits](https://www.labellerr.com/blog/learn-sam-2-in-minutes/) ·
[CountGD (VGG/Oxford)](https://www.robots.ox.ac.uk/~vgg/publications/2024/AminiNaieni24b/amininaieni24b.pdf) ·
[T-Rex2 (arXiv 2403.14610)](https://arxiv.org/pdf/2403.14610) ·
[Cellpose (bioRxiv/Nat Methods)](https://www.biorxiv.org/content/10.1101/2020.02.02.931238v2.full)

---

## 4. The prerequisite nobody has built: a real labeled set

Every candidate above is selected the same way in the literature — score against ground truth with
Jaccard/F1 and count RMSE. We have **6 hand-counted shots**. That is the binding constraint (F3), and
hand-counting more is exactly the expensive-derivation failure mode `CLAUDE.md` §⚖ warns about.

**The cheap route is synthetic composition**, and it falls out of C3's asset extraction for free:

1. Extract the pellet + core-triangle sprites (C3).
2. Composite **N** of them at known coordinates onto **real background frames sampled from all four
   videos** (`marciana`, `noir`, `guilty`, `isabel`) — including frames with damage numbers, VFX, and
   the HP bar, so the clutter distribution is real.
3. That yields unlimited frames with **perfect** labels: exact count, exact positions, exact occlusion.

This is a validation harness _and_ the training set for C5/C7, and it directly answers the
generalization failure (train/score across all four backgrounds, not one). It also satisfies the
repo's committed-tooling rule (constraint 9): a generator script + a pinned fixture that
self-validates, rather than another `/tmp` instrument.

**Honest limit:** synthetic labels validate the _detector_, not the _compositing assumption_. If the
game blends the marker rather than blitting it (the C3 risk), synthetic frames are systematically
easier than real ones and scores will be optimistic. Mitigation: keep the 6 owner-counted shots as a
held-out real-data check, and require any candidate to pass both.

---

## 5. Recommended sequencing (proposal — not enacted)

Cheapest-first, each step falsifiable on its own:

1. **Confirm or kill F1** (~1 hour). Dump the track-lifetime histogram from an existing run. If most
   pellet tracks really are life=1 against an expected 6–7, the threshold is the defect and C1 is
   near-certain to help. If lifetimes are already 5–7, F1 is wrong and this whole ordering changes.
2. **C1 + C2 together** — swap in `blob_log`/DAOStarFinder detection and count linked tracks. These
   are the two structural fixes, they're both cheap, and F2 changes the count definition so they
   should land as one change against a re-scored ground truth.
3. **§4 synthetic labeled set** — needed to score step 2 honestly, and a prerequisite for everything after.
4. **C4 top-hat/LCM** as preprocessing if step 2's false-positive rate is still the binding error.
5. **C3 exact-sprite matching** — highest ceiling, highest unknown. Spike the asset extraction early
   (it's also step 4's input); commit to it only if the sprite correlates cleanly on a known frame.
6. **C5/C7 learned detectors** only if 2–5 leave a residual, since by then the labeled set exists and
   the marginal cost is just training.

Steps 1–2 are unblocked today and need no new footage.

**Note on scope:** none of this is a damage-model value change, so per `CLAUDE.md` §⚖ it does **not**
require the `/scientific-method` gate — `verify.sh` + committed fixtures are the gate for reader
tooling. The gate re-attaches the moment a counter output is used to move UNIGEO (U35).
