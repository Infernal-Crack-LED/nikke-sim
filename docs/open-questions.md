# Open mechanics questions

Running record of game-mechanics questions affecting sim accuracy, reorganized 2026-07-13.
This file holds only what's left to research. ⚑ = calibrated-and-applied but mechanism
unconfirmed (flagged for review).

**Closing a question (single numbering, since 2026-07-26):** a question keeps its U-number for
life — no A-number is minted. When one resolves, MOVE its entry to
[answered-questions.md](answered-questions.md) (append-only) with the resolution + date inline;
`docs/DECISIONS.md` and other docs reference the U-number. A resolution recorded only in
DECISIONS leaves the stale question here reading as live — always move it.

---

## UNANSWERED

### U39 — `snow-white-heavy-arms` Fully Active: is the volley delivered by USES or by TIME? (opened 2026-08-11, re-filed)

Her burst "Seven Dwarves Fully Active" is modeled as a weapon swap carrying the same 69.04% shot at
`chargeTimeClamp` 3.2 with `durationSec` 10 and `maxShots` 2 — the kit states **2 uses**, and ~6.5s
of 3.2s rounds is exactly 2 shots, so **the two readings agree at the current cadence and the sim
delivers by uses.**

They diverge only if a swap shot is DISPLACED — a shot lost to the window boundary, a cadence change,
or anything that shifts the round timing. Delivered by uses, a displaced shot still lands (the use is
owed); delivered by time, it is lost with the window. Her `maxShots` 2 therefore encodes an
assumption nothing currently tests.

**Resolving it:** a focus recording of a Fully Active window where the swap timing is perturbed
(entering the burst mid-charge is the natural case) — count the Fully-Active shots delivered. Two
shots regardless of entry phase = by uses; one = by time.

**Blast radius:** small today (the readings coincide), but it becomes live the moment her cadence
moves — which is why it is filed rather than folded into her prose. Related: M5 (`ada`) is the same
class of question, a `maxShots` count that a recording settles.

This question was originally logged as H2 in `experiment-harness-ai.md`, which CLOSED 2026-07-21 and
was archived out of the tree; it survived only in her override prose until this re-filing.

### U38 — "self and 2 allies on both sides": does `selfAndAdjacent.sides` mean 1 each side or 2? (opened 2026-08-03)

Two overrides use the positional `selfAndAdjacent` selector and both author `sides: 2`, which the
engine reads as every ally within TWO slots on each side — up to five units:

- `flora` skill 1 — blablalink prose: "Affects self and **both adjacent allies**"; the datamined
  table for the same line: "Affects self and 2 allies on both sides".
- `rouge` skill 2 — both prose and datamine: "Affects self and 2 allies on both sides".

The two phrasings do not agree. Read as "the 2 allies on either side of me", the set is **three**
units (`sides: 1`); read as "2 allies on each side", it is **five** (`sides: 2`, what ships).
Flora's English prose ("both adjacent allies") points at three; Rouge has no such second phrasing.

Why it matters now: Flora's S2-3 ATK ▲45.12%-of-caster buff targets "all allies in the Peace of Mind
state", i.e. whatever set S1 covers, so the same number decides how many allies a large team buff
reaches. The two units must stay consistent with each other and Flora's S1/S2-3 must stay consistent
internally — which is why the 2026-08-03 S2 landing kept `sides: 2` rather than splitting them.

**Resolving it:** a Korean/Japanese kit-text read of either unit's clause (the KR "자신과 양옆 N명"
form is unambiguous about which side the count attaches to), or an in-game observation of which
slots receive Rouge's Sword Coin in a 5-unit team. Do not resolve it from the English alone.

**Blast radius if it flips to `sides: 1`:** both units' team-buff reach shrinks from 5 to 3. Neither
is on the accuracy board today, so nothing measured constrains it.

---

### U37 — `flora` S2 True Damage ▲30.97%: 10 sec (prose) or 5 sec (datamine)? (opened 2026-08-03)

`data/characters.json` carries two descriptions of Flora's second skill and they disagree on one
number:

- `characters.flora.skills.skill2` (blablalink prose, the SSOT): "True Damage ▲ 30.97% for **10
  sec**."
- `characters.flora.role.skillDetails.skill2_detail` (datamined table, skill group 24112):
  `description_value_05` = **5** at every skill level.

The sim ships 10 sec, because that datamined capture is demonstrably PARTIAL for this unit — it is
missing three kit lines outright (S1's Burst-Stage-2 Max HP grant, S2's "shield placed in front of
this unit → ATK ▲45.12%", and the burst's "ATK ▲85.86% of the skill user's ATK"), which is the
signature of a table captured before/behind the unit's release state (Flora released 2026-07-23).
A table that is missing whole lines is not a trustworthy source for a duration on the lines it kept.

**Resolving it:** a fresh datamine of skill group 24112, or a footage read of the buff icon's
lifetime on an ally after Burst Stage 2 entry. Halving the window would roughly halve this line's
overlap with the Full Burst window.

---

### U36 — the popup reader's AUTO-ACCEPT path is unexercised: does it hold on a clean-band unit? (opened 2026-07-24)

**Status: an INSTRUMENT question, not a game-mechanics one — but it gates how much popup reading can
be trusted without Opus confirmation, so it is tracked here rather than lost in a script comment.**

`scripts/probe/read-popups-vlm.ts` now scores every deduped popup: `confidence` = agreeing looks /
total looks over the frames the popup persists in (genuinely independent samples — different images,
unlike re-running one frame, which a deterministic decoder answers identically including its
mistakes), plus `inBand` membership in the focus unit's `hit-bands.ts` value bands, plus two
class checks. `autoAccept` = confidence ≥ 0.75 AND ≥3 agreeing looks AND in-band AND the matched
band variant is reachable from the reported class AND exactly one variant matches.

**Why it is unproven.** The validation pass (2026-07-24, 20 frames of `docs/probes/control/lm.MP4`
t=45–49 against the hand read in `docs/probe-data/control-little-mermaid.json`) met the ship gate —
zero auto-accepted popups the hand read disagrees with — **vacuously: 0 of 30 popups auto-accepted.**
`little-mermaid`'s bands overlap outright (normal 14,664–69,913, its crit image 21,484–87,858, its
core image 36,660–174,782), so no value there can pin a class. The gate passed because nothing was
offered to it, which is not evidence that the rule is right.

Worth keeping, because it is what shaped the rule: the FIRST draft (agreeing looks + in-band only)
auto-accepted 4, of which **2 were wrong** — a 10,818,572 read as "normal" whose only matching bands
were `skill:core`/`skill:crit+core` (identity still unresolved: it fits a real core barrage
arithmetically, but the same run had the hallucination guard drop `6473333` and `17333`, and
`108,189` recurs in the neighbouring frames, so a digit concatenation is equally likely — note it is
NOT the top-centre team total, which sits outside the damage crop), and a 64,733 called "crit" when
64,733 is that unit's _non-crit_ normal. The two class conditions were added to catch exactly those.

**To answer it:** run the reader on a SHORT clip whose focus unit has a CLEAN, non-overlapping band
(a big skill/burst hit well clear of its normal band and of that normal's crit/core images — check
with `npx tsx scripts/probe/hit-values.ts <focus> <team…> --boss <E>` BEFORE picking the unit), then
compare every `autoAccepted[]` entry against a hand read of those instants. Ship the auto-accept
path as trusted only if the disagreement count is zero on a run where it actually accepted
something. Until then treat `autoAccept` as advisory and work from `needsConfirmation[]` (which is
the reader's real present-day value — it emits a ready-made batched `frames.ts --times` command).
Record: `docs/probe-runs.md` 2026-07-24; ruling: `docs/DECISIONS.md` "Probe reader build-out".

### U35 — `marciana` SG cold-read is the PELLET-LANDING term; exact per-band landing needs a solo recording (opened 2026-07-23)

**Settled by this probe (`docs/probe-data/marciana-sg-band.json`, n=2 = 0.850 COLD):** the 15% SG
cold-read on the bare-weapon basis is localized to the **pellet-landing** term of the SG weapon model,
by elimination. ATK basis pinned **+0.23%** (five popup values on one per-pellet lattice — near
26149/36207/46264 = 13u/18u/23u, far 20115/30172 = 10u/15u, all u≈2011.47); cadence = sim (40
game-frames); crit = fixed 15% stat; core popups visually rare (not the ~5× rise a core-driven gap
needs). With all held, the 17.7% real/sim excess is forced onto landing: real ≈ **8.45/10 mean** vs
sim **7.18** (sim per band: near 8.13 / mid 7.13 / midfar 6.57 / far 6.07), concentrated at the long
bands where the sim's silhouette-gap model drops pellets.

**What is STILL open (why this is UNANSWERED, not a verdict).** The **exact per-band landed-pellet
count** could not be measured: NIKKE stacks per-pellet popups nearly on top of each other (an isolated
near-band shot reads ~7–9 whites, indistinguishable from sim's 8.13), and the SG gold-standard fix —
the pellet lattice on the running-total **delta** — is unavailable because the mid-fight team DAMAGE
counter mixes all three units. **Recipe:** a **SOLO `marciana`** (exact slug `marciana`, SG/Iron — NOT
`marciana-marine-study`) scope-lock recording, boss Iron, bursting off. Then the single-unit running
total gives a clean per-shot delta on the lattice, reading landing shot-by-shot per band to ~0.1
pellet — which pins whether the fix is a flat landing lift or a band-shaped one (flat-at-range is the
hypothesis). Do NOT re-tune SG overrides to absorb this first: `marciana` has no override, so a pure
override re-tune would be fitting overrides to a weapon-model landing error. Related: **U27** (isabel
mid/midfar landing), the SG re-tune thread in CLAUDE.md, and **U32** (`folkwang` AR, same
solo-re-record need for the AR class).

**GATING FOLLOW-UP (owner direction 2026-07-24) — the instrument must be validated on a SECOND unit
before it answers this question.** We ran the CV pellet counter on four HR=0 solo SG recordings
(`marciana-solo`, `noir sg`, `guilty solo sg`, `isabel solo sg`) with locked parameters
(`--fps 30 --zoom 2 --marker-min 2 --core-rate 0.05`). **Validation FAILED.**

- `marciana-solo` reproduced the run18 mean (~7.3/10), confirming stability on the tuning video.
- `noir sg.MP4` (the cleanest running-counter anchor) read near1 ≈7.04/10 vs the lattice anchor 8.9/10,
  far ≈6.98/10 vs 7.4/10, midfar ≈7.36/10 vs 8.8/10. Shape ratios were also wrong: counter far/near
  ≈0.99 and midfar/near ≈1.05 vs anchor ratios 0.831 and 0.989 — a systematic cold bias plus
  band-dependent flattening.
- `guilty solo sg` and `isabel solo sg` produced only 3 and 4 detected shots respectively (vs ~200
  expected), indicating the marciana-derived ammo-box template does not generalize to those HUDs.
  **Conclusion:** the counter is not yet admissible for U35. It needs (1) a crosshair/template tracker
  that generalizes across SG units/HUDs, and (2) correction of the band-dependent flattening before its
  per-shot histogram can be admitted. Full scientific-method log:
  `docs/handoffs/scientific-method-harness.md` 2026-07-29 entry. The running-total pellet lattice
  remains the independent arbiter; the CV counter outranks it nowhere.

**2026-07-29 counter-fix follow-up.** Implemented per-video ammo-box template extraction
(`scripts/probe/extract-ammo-template.py`) and ROI-restricted template matching in
`count-pellets.py`; `read-pellets.ts` now extracts a unit-specific template before the counter run
and passes `--ammo-roi-x0 0.55 --ammo-roi-y0 0.50`. Short-clip tests (`guilty`/`isabel` t=25, 15s)
restored shot detection (15 and ~N shots vs the earlier 3–4 total). Full-video re-validation against
the running-counter anchor still failed:

- `noir sg.MP4` (`--center-exclude 24` and `36` produced identical results): totalShots=107,
  validShots=56, avgTotal=7.1. Band means: near1 n_valid=0/11 (all totals <5), near2 7.65/10 vs
  anchor 8.9 (-1.25), far 7.33/10 vs 7.4 (-0.07), midfar 6.91/10 vs 8.8 (-1.89). Shape ratios are
  unusable because near1 produced no valid shots; the surviving near value is still >1 pellet/shot
  low.
- `guilty solo sg.MP4` full run detected only 21 shots (12 valid); near1 n_valid=0/3, midfar 6.89/10
  (no anchor). The per-video template cleared the short-clip false lock but did not yet yield a
  usable second-anchor histogram.

The counter remains inadmissible. Next tuning targets: (a) near-band pellet loss, most likely from
`--center-exclude` removing central near pellets or from the crosshair crop drifting off the impact
cluster; (b) verify the per-video template is locking onto the true ammo box on `noir`/`guilty`
using `--dump-tracks` diagnostics; (c) only then re-run full `noir` + `guilty` validation.

**2026-07-29 near-band diagnostic.** Ran `noir sg.MP4 --at 40 --dur 20` with `--center-exclude 0`
and `36`; results were identical (4 shots, 1 valid, avgTotal=5), so `center-exclude` is not the
near-band cause. `--dump-tracks` showed the crosshair being placed at the **right edge** of the
damage crop (mean x≈2544 in a 2606px frame) instead of near the impact cluster. Pellet tracks are
uniformly distributed across the full frame, and the default `--pellet-radius 160` only counts a
narrow slice near x≈2544. This explains both the systematic cold bias and the near-band under-count.
The immediate blocker is the ammo-box-to-crosshair offset: `ammo_offset_x` is currently positive
(moves right from the ammo box), while the crosshair should be well to the left of the ammo box near
the crop centre. Calibrating that offset — or confirming the per-video template is actually locking
onto the ammo box and not a right-side HUD/VFX element — is the next step (the ammo-box quality step
left for later).

**2026-07-31 ROI-restriction shot-count sensitivity (RECORD, DO NOT ACT ON — n=1, discovered
incidentally, not investigated).** On `marciana-solo`'s (exact slug `marciana`, SG/Iron — not
`marciana-marine-study`) 1800-frame `h1` cache
(`scratchpad/pellets/h1-marciana-treecode/frames-pellet`), identical frames and identical
filter/tracker params, the ONLY difference being `--ammo-roi-x0 0.55 --ammo-roi-y0 0.50`:

```
with ROI    : totalShots=43 validShots=29 avgTotal=7.3 avgRed=0.17   (H1's reference; reproduced
                                                                       byte-identically, sha dc64e7cc…)
without ROI : totalShots=74 validShots=62 avgTotal=7.5 avgRed=0.23   (per-video template)
              totalShots=72 validShots=61 avgTotal=7.6 avgRed=0.23   (committed-seed template,
                                                                       scripts/probe/ammo-box-template.png)
```

The no-ROI figures sit close to `run18`'s 70/58/7.6 and to the ~90 shots expected on a 180s SG
fight. **The tension is explicit, not resolved:** the ROI was introduced immediately above this
same 2026-07-29 entry specifically to stop false locks on `guilty`/`isabel`, and demonstrably
restored their shot detection — so this is NOT "the ROI is a bug." More shots without it may
equally be more FALSE locks, not more real ones. Discovered while regenerating a lost cache
fixture for unrelated tooling work (`docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md`
Phase H). H1's "100% LOCK DROPOUT / the lost shots were REAL" diagnosis (Phase H) was formed on the
ROI-restricted run and has not been re-examined against this reading.

Artifacts (gitignored — re-derive with the commands below, per constraint 9):
`scratchpad/pellets/h1-cache-test/roi-results.json` (with ROI),
`scratchpad/pellets/h1-cache-test/recover-results.json` (without ROI, per-video template),
`scratchpad/pellets/h1-cache-test/seedtmpl-results.json` (without ROI, committed-seed template),
`scratchpad/pellets/h1-cache-test/detections-NOROI-agent-regen.json` (an independently-run no-ROI
regen that agrees with `recover-results.json`, 74/62/7.5/0.23).

Re-derivation (bracketed flag only for the "with ROI" row; swap `--ammo-template` to
`scripts/probe/ammo-box-template.png` for the committed-seed comparison):

```
scripts/probe/.venv/bin/python scripts/probe/count-pellets.py \
  scratchpad/pellets/h1-marciana-treecode/frames-pellet --temporal --backend opencv \
  --ammo-template scratchpad/pellets/h1-marciana-treecode/ammo-box-template.png \
  --ammo-offset-x 125 --ammo-offset-y -11 [--ammo-roi-x0 0.55 --ammo-roi-y0 0.50] \
  --center-exclude 36 --min-area 25 --max-area 750 --min-circ 0.55 \
  --pellet-radius 160 --max-pellet-frames 7 --shots
```

**UNANSWERED.** Whether the ROI's false-lock suppression on `guilty`/`isabel` also suppresses REAL
shots on `marciana`/`noir` (net helpful vs. net harmful) is not determined by this single reading.
Needs a per-video ROI on/off comparison against each video's own independent anchor (the
running-total pellet lattice for `marciana`, the `noir-solo-recon.json` band anchors for `noir`)
before touching the `--ammo-roi-x0`/`--ammo-roi-y0` defaults.

**2026-07-31 do REAL pellets land within `--center-exclude 36`? (RECORD, DO NOT ACT ON — n=1 video,
incidental, discovered while fixing the synthetic-labeled-set generator, not investigated further).**
Replayed the existing `scratchpad/pellets/h1-cache-test/detections.json` cache (exact slug
`marciana`, SG/Iron — not `marciana-marine-study`; the "with ROI" / H1-reference config, 43/29/
7.3/0.17) with `--center-exclude 0` so components inside the normally-excluded annulus are visible,
then read the radial distribution of `is_pellet` white-track positions (non-red) relative to each
frame's own tracked crosshair, restricted to `pellet_radius=160`.

- No persistent, high-lifetime component sits near `r≈0` (max track life anywhere is 120 frames, at
  mean `r≈1069px` — nowhere near the crosshair) — the "distinguish the reticle from real pellets"
  concern this question anticipated **did not materialize in this reading**, at least not as a
  single dominant blob; every track touching `r<36` has life ≤7 frames, the same short lifetime
  real pellet tracks show generally.
- Of 919 `is_pellet` tracks that are ever within `pellet_radius` at all, **58 (6.3%)** dip below
  `r=36` at some point in their life; 93/2230 pellet-radius frame-instances (4.2%) sit below `r=36`.
  Both are far below the synthetic generator's pre-fix ~24–29% (see the generator-fix commit
  `d18f014` and this doc's plan-doc correction log) but are **not zero** — if this reading is
  representative, `--center-exclude 36` is discarding a modest fraction of real pellets, a genuine
  cold-bias candidate on the live pipeline, distinct from the synthetic-labeling artifact.
- **Caveat that keeps this UNANSWERED, not a finding:** this cache's crosshair track is the same one
  the "2026-07-29 near-band diagnostic" entry above flagged as possibly **mislocated** (placed near
  the ammo-box/right-edge of the crop rather than the actual impact cluster on at least one other
  video). Whether that mislocation affects `marciana`'s own track here has not been checked. n=1
  video, one reading, no cross-video replication, no comparison against a labeled real-pellet
  ground truth — do not change `--center-exclude`, do not touch the synthetic generator's annulus
  bound on the strength of this alone, and do not draw a conclusion from it.

Re-derivation (uses the already-cached detections, ~1s, no venv setup beyond the existing probe
venv):

```
scripts/probe/.venv/bin/python scripts/probe/count-pellets.py \
  --load-detections scratchpad/pellets/h1-cache-test/detections.json \
  --temporal --backend opencv --center-exclude 0 \
  --dump-tracks /tmp/h1-ce0-tracks.json
```

then read `tracks[].{is_red,is_pellet,first,last,xs,ys}` against `cross_positions[frame_idx]` per
track frame and bucket `hypot(x-cx, y-cy)` for `is_pellet and not is_red` tracks within
`pellet_radius=160` (ad hoc analysis, not a committed script — this is a record-only reading, not a
standing instrument).

**2026-07-31 has the owner's 13-frame lifecycle actually been seen at NATIVE 60 fps? (RECORD, DO NOT
ACT ON — n=1 video, one ~15s window, `/logic-gate` preop premise check, kimi-k3 revision #1).** Every
real-data measurement behind the Phase 2 design (area-decay curves, the ±0.05 cross-unit agreement,
the life=1 statistics) was taken at **30 fps sampling**; the fine f1/f3–4-plateau/f5–11-decay
structure had only ever been observed in the owner's written spec and in the synthetic generator that
renders it. Extracted `docs/probes/clean-weapons/marciana-solo.MP4` (exact slug **`marciana`**,
SG/Iron — not `marciana-marine-study`) at native 60 fps, video t=71–86s (fight-time ≈66–81s, spans the
near→far band transition):

```
npx tsx scripts/probe/read-pellets.ts docs/probes/clean-weapons/marciana-solo.MP4 \
  --at 71 --dur 15 --fps 60 --dump-tracks true --out scratchpad/pellets/run20-60fps-premise
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py \
  --tracks scratchpad/pellets/run20-60fps-premise/tracks.json \
  --frames scratchpad/pellets/run20-60fps-premise/frames-pellet \
  --dup-check --start 0 --count 900
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py \
  --tracks scratchpad/pellets/run20-60fps-premise/tracks.json --raw-tracks 15 --raw-tracks-min-life 8
```

- **The 30fps-internal-render-on-60fps-capture concern did not hold up against this reading.**
  `--dup-check` over 899
  consecutive frame pairs found only 7.0% near-zero-diff pairs, and even-index vs odd-index mean
  diffs are statistically indistinguishable (3.765 vs 3.891, ~3% apart) — the alternating
  near-zero/high pattern a duplicated-half-frame source would produce is absent. Every captured frame
  carries new content; the 13-frame lifecycle is 13 real samples, not 6.5 doubled ones.
- **The qualitative shape (small dot → grow → peak → monotone decay) DOES appear on individual raw
  tracks, not just in the 30 fps population aggregate** — of the 15 longest-lived near-crosshair
  white tracks (life≥8), ~9–10 show a clear grow-then-monotone-decay profile, and 3 of those
  (ids 242/568/873) show a peak sitting almost exactly at two adjacent frames as the owner's f3–4
  plateau predicts (e.g. id=242: `f1=75 f2=458 f3=679 f4=689` then monotone decay to f16=27).
- **But the peak is noisier/wider than the spec's clean 2-frame table for most tracks** — several
  (ids 1168/2665/867/575) show an elevated, bumpy region spanning roughly f2–f7 rather than a crisp
  f3–4 plateau, consistent with the spec's own "pellets occlude" note for that phase, but meaning a
  strict f3–4-only definition of "peak" would misclassify several genuinely-still-elevated f5–f7
  frames as already decaying.
- **New finding not in the 30 fps record: some long-lived near-crosshair tracks are FLAT, not
  decaying at all** (ids 23/100/728/101/1350 — life 14–32 frames, area oscillating in a narrow band
  the whole time, no growth or decay). These do not fit the lifecycle at all and are exactly the
  false-positive population step 5's identity filter should reject; "long life ⇒ real pellet" is not
  a safe shortcut either.
- **Detection dropout remains high at native 60 fps**: life=1 39.5%, life≤2 64.3% of near-crosshair
  white tracks — not materially better than the 30 fps figures despite twice the sampling rate. This
  corroborates fable's still-open, still-BLOCKED preop revision #4 (gap tolerance as a step-5
  prerequisite, not late hygiene) with a second, independent (60 fps) reading.
- **Caveat on trust in this reading:** crosshair-validity was **5.8% near-fraction** (210 of the
  extraction's white tracks fall within `pellet_radius` of the tracked crosshair) — just above the
  `analyze-pellet-tracks.py` 5% BROKEN floor, well below the healthy `marciana`/run16 reference
  (14.3%). The lock did not look frozen (477px wander), but this run's crosshair track is weaker than
  the reference and the statistics above should be read with that in mind, not as a clean replication.

**UNANSWERED, narrower than before.** ⚑ **The spec referenced throughout this entry is the
then-13-frame one; the owner corrected the lifecycle to 14 native frames on 2026-08-05 (the added
frame is a FADE frame — `docs/probe-runs.md` §29/§29E), which does not disturb the dropout finding
below.** The lifecycle is real at 60 fps, not merely a 30 fps artifact or
a spec/generator fiction — but the owner's exact 2-frame peak-plateau table is optimistic for a
majority of individual tracks, and detection dropout (not fps) is now the dominant open question for
whether steps 4–6's track-level identity scoring has enough surviving evidence per pellet to work at
all. n=1 video, one window — do not tune template tolerances or the phase table off this reading.

**2026-07-31 does shared-t0 hold, and does it hold BY BAND? (RECORD, DO NOT ACT ON — n=7 near-band
shots from the same window above; far-band comparison BLOCKED by a crosshair-localization failure,
kimi-k3 preop revision #2).** §2.0 assumes all ~10 pellets of one blast share a single t0 (pellet
flight time negligible); a band-correlated violation would directly corrupt the far/near ratio
(0.831) U35 exists to measure. Added `--onset-spread` to `analyze-pellet-tracks.py` (commits this
session): for each debounced shot in a sibling `pellets.json`, it gathers near-crosshair white tracks
whose first frame falls within a window around the shot's frame index and reports the spread
(max−min) of those first-frames, banded by the boss range schedule (`docs/data/range-data.md`,
elapsed-fight-seconds: near 33–70s, far 70–106s, midfar 106–144s, near 144–176s, midfar 176–180s —
sourced, not re-derived here).

```
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py \
  --tracks scratchpad/pellets/run20-60fps-premise/tracks.json \
  --onset-spread scratchpad/pellets/run20-60fps-premise/pellets.json \
  --onset-at 71 --onset-fps 60 --onset-window 10 --onset-min-life 3
```

- **Near band (n=7 shots, fight-time 66.05–69.63s, all within the 33–70s near window):** with a
  `min_life>=3` filter (life=1/2 tracks are ~40–65% background/fragmentation noise per the finding
  above, so an unfiltered spread mixes real onset variance with noise-onset timing), per-shot spread
  ranged **0–17 frames (0–283 ms)**, mean **7.6 frames (126 ms)** — noticeably less than the ~36–41
  frame inter-blast spacing, but not negligible: one shot (fight=67.32s) showed 17f/283ms of spread,
  larger than a single pellet's own 13-frame (217ms) visible lifetime. Unfiltered (no life filter),
  spreads were larger still (11–32f, 100–533ms mean 15.6f) — almost certainly inflated by background
  blips sharing the window rather than genuine blast members, given the life=1/2 population size.
- **Far band: only 1 shot obtained (fight=76.45s, spread 10f/167ms, unfiltered — n too small for
  `min_life>=3`), and it could not be grown.** Two further attempts to extract dedicated far-band
  windows on the SAME video (`--at 90 --dur 15` and `--at 82 --dur 12`, both squarely inside the
  70–106s far window) both returned **zero non-zero pellet reads across the whole window** — the
  ammo-box template crosshair lock never acquired at all in either extraction. This is a direct,
  concrete hit of the already-known Phase 2A localization instability (this plan's own §"Phase 2A")
  — encountered here as a blocker to THIS premise check, not investigated or fixed (out of scope for
  a record-only pass).
- **Consequence: the far-vs-near onset-lag question kimi-k3's revision raises could NOT be tested.**
  Near-band spread is measured (loosely bounded, not exactly zero, well under inter-blast spacing);
  whether far-band pellets lag near-band pellets by more than the near-band's own spread remains
  completely open — there is no working far-band sample on this video to compare against. Re-run when
  Phase 2A localization work lands (do not force more far-band windows on `marciana` in the meantime;
  each attempt costs a full extraction+count pass for a result already shown likely to fail).
- **What this implies about t0 granularity, stated as the instruction asked:** a single per-blast t0
  is a reasonable APPROXIMATION for most near-band shots (spread mostly ≪ one pellet lifecycle), but
  not a safe assumption for every shot (the 283ms outlier), and the design should not assume it is
  more precise than "usually within about half a pellet-width of true onset" until the far-band
  comparison exists. Per-band t0 could not be evaluated at all (blocked above); per-track t0 (i.e. no
  shared-t0 assumption) remains the safe fallback the plan's own kill condition (§2.3) already names.

**UNANSWERED.** n=1 video, incomplete band coverage. Do not change the t0 design or step 4's overlap
policy off this reading.

### U34 — Max-Ammunition ▲ EXPIRY over-cap: does the belt clip immediately, or lazily at the next ▼? (opened 2026-07-23)

The engine clips the current belt to the new cap when a Max-Ammunition ▼ (`maxAmmoPct<0`) LANDS
(measured/user-confirmed, `docs/data/game-mechanics.md` § "Max Ammunition ▼"; `src/engine/sim.ts`
~1830). The contract is SILENT on the reverse: when a Max-Ammunition ▲ **expires** while the belt is
still OVER the new (lower) cap, the engine keeps the overhang and clips it LAZILY at the next ▼
landing — it does not clip at expiry. This path was unreached at the old 24/s SMG cadence but is now
REACHED at the shipped 20/s (2 genuine over-cap clips in the `modernia`/`liter` control comp — the
`hits-per-shot.test.ts` fixture that surfaced it). The behaviour is byte-identical between the two
cadence arms (only phasing differs), so it is NOT a frame-quantization defect — but it is now
load-bearing in the ammo economy of any SMG-or-MG comp that pairs a Max-Ammunition ▲ source (e.g.
`liter`) with a Max-Ammunition ▼ carrier (e.g. `modernia`), and it is MODEL-ONLY / unmeasured.
**Recipe:** in a focus recording of such a comp, read whether the ammo counter drops the instant the
▲ icon expires (immediate clip) or only later when the ▼ re-applies (lazy clip). Until measured, the
engine's lazy-clip stands as the current model, not a validated mechanic. Surfaced by the SMG-cadence
flip's implementation review (DECISIONS 2026-07-23).
**INSTRUMENT NOW EXISTS (2026-07-24, still UNANSWERED — nothing measured yet):**
`npx tsx scripts/probe/read-ammo.ts <video> --at <t> --dur 20 --out <dir>` reads the counter every
0.1 s and emits `reads[]` + `reloads[]`, so the clip instant is a JSON diff rather than a frame hunt
— an immediate clip shows as a step DOWN with no reload, a lazy clip shows the overhang persisting
until the ▼ lands. Validated on SMG in two range bands (`docs/probe-runs.md` 2026-07-24), which is
the relevant weapon class here. ⚠ It cannot yet read a small-magazine SG counter, so an SG-carrier
variant of this question stays blocked. **Still needs the recording** — the comps in question have
no focus footage yet.

### U32 — `folkwang` (AR) sits stably ~3.7% COLD on the bare-weapon basis (opened 2026-07-23)

**The reading.** `npx tsx scripts/clean-weapons-read.ts`: sim 23.91M vs real 24.82M = **0.963 COLD**,
**n=2**, with a run-to-run spread of only **±0.8%**. Tightened from 0.956 at n=1. So it is a small,
_stable_ residual sitting just outside the ±3% goal — not noise, and not one of the two big weapon-model
errors this basis found (SG landing, SMG cadence).

**Why it is interesting.** `folkwang` has **no override** and her kit deals **zero damage** (shields /
taunt / Max HP only), and bursting was off — so this cannot be calibration debt, kit misencoding, or
rotation. It is the **AR weapon model**, measured with nothing in the way. It also matches the board's
AR class mean (0.965) almost exactly, so it is very likely a class-wide AR term rather than anything
about her.

**Candidates, none tested.** AR frame cadence is exact (720 rpm = 5 frames — the SMG quantization
finding cannot apply here, verified by census); so the suspect list is the AR core-hit rate / accuracy
geometry (δ0 15.9 px, f_bloom 0.578 — both ⚑ fit-selected), the range-band map, or reload timing.

**Next step.** Cheap, and not yet done: an ammo-counter cadence read + a popup lattice on an
AR-focused clean-weapon recording. No such recording exists yet — `folkwang` was slot 2 (unfocused)
in both team-A runs, so her popups are unreadable. **Needs a re-record with `folkwang` in slot 3.**

### U30 — chunked (multi-part) reloads: `reload_bullet` IS the tell, already honored for 14 of 15 units; `grave` is the lone gap (opened 2026-07-22)

**The mechanic (owner correction, 2026-07-22 — the framing this entry opened with was wrong).** A
chunked-reload unit does **not** top up mid-magazine while firing. She empties the magazine
completely, then **refills it in parts** — `grave` and `soda-twinkling-bunny` are the owner-named
examples. The engine-visible consequence is therefore **reload DURATION** (N chunks take N× as long),
not any fire-during-reload behavior.

**`reload_bullet` encodes it exactly, as `1 / chunks`:**

| value   | chunks        | n   | who                                                                                                                                                                                                     |
| ------- | ------------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `10000` | 1 (whole mag) | 177 | everyone else                                                                                                                                                                                           |
| `3300`  | 3             | 14  | 9 SGs (9 ammo → 3 shells/chunk): `drake`, `maiden`, `neon`, `noir`, `pepper`, `product-23`, `soda-twinkling-bunny`, `sugar`, `viper` · 5 RLs (6 ammo → 2): `anis`, `centi`, `jackal`, `rumani`, `trina` |
| `5000`  | 2             | 1   | `grave` (60 ammo → 30/chunk)                                                                                                                                                                            |

**The datamined `reload_time` is PER CHUNK, and the shipped `reloadFrames` already multiplies it.**
Two independent confirmations:

1. **Bimodal split within one weapon class.** Chunked SGs carry `reload_time` 23–67; single-chunk SGs
   carry 150–267. Exactly ~3× apart, and they interleave nowhere. (`drake` 50 × 3 = 150 = exactly
   `dorothy-serendipity`/`brid-silent-track`/`naga`/`leona`'s single-chunk value.)
2. **The sync formula is exact.** `reloadFrames == reload_time × chunks × 0.6 + 21` holds to ±1 frame
   for **190 of 192** units — `× 1` for the 176 single-chunk units and **`× 3` for all 14 chunked
   ones**, with no tuning. (Two unrelated outliers: `asuka` 84 vs 81, `scarlet-black-shadow` 152 vs
   141 — small, separate.) The multiplier arrives via the upstream weapon-frames table
   (`src/data/sync.ts:178`, `wf?.reloadFrames`), so it is already live in the engine without anyone
   here having modeled it as chunking.

⇒ **No primitive is needed and none should be built.** The duration effect is modeled for 14 of the
15 carriers today.

**The one real gap — `grave`.** She is the sole `5000` unit and the sole carrier shipped on the
**× 1** formula: `reloadFrames 81` where × 2 chunks gives **141**. She is also the only carrier with a
measured reload — 3.35 s / **201 f** (n=19 clean gaps, range 2.85–3.52 s = 171–211 f, from
`grave solo.MP4`, 2026-07-15). Effective frames (`round(f × 0.975) + 13`):

| source                                | stored | effective | vs measured 201 f                             |
| ------------------------------------- | ------ | --------- | --------------------------------------------- |
| shipped (× 1)                         | 81     | 92 f      | −109 f, far too fast                          |
| × 2 (what `5000` implies)             | 141    | 150 f     | −51 f, still below her measured floor (171 f) |
| × 3                                   | 201    | 209 f     | **inside the measured range**                 |
| her hand-fit `charFixes.reloadFrames` | 193    | 201 f     | = measured (fitted to it)                     |

**`grave` is 2 chunks — owner ruling 2026-07-22**, i.e. `reload_bullet 5000` is correct at face value and
the ×3 fit above is NOT the explanation. So chunking takes her from 92 f to 150 f effective, and the
remaining ~51 f to her measured 201 f is **something else** — her kit's _"Heat Emission: Reload Ratio
▼50%"_ and/or animation overhead, exactly the ambiguity her own note flags as _"attribution … inferred,
not isolated."_ Her measured `charFixes.reloadFrames 193` stays the operative value; this is a
data-provenance correction sitting underneath it, **board-inert today**.

**Firing does NOT resume between chunks — measured twice.** `grave`: 61.5 shots per gap on a 60-round
mag (n=19) — if she resumed at the halfway chunk the shots-per-gap would average ~30–45. `noir`:
consecutive `009` → `009` mag-start frames bound _"EXACTLY one 9-shot mag,"_ and the damage counter is
_"identical at t53.0 and t53.8 → confirmed no firing during the preceding reload"_
(`docs/probe-data/noir-solo-recon.json`). Duration-only, on both a 2-chunk and a 3-chunk unit.

**`reload_start_ammo` remains useless and is not this field.** It equals `max_ammo − 1` for **192 of
192** shot rows — no exceptions, every class. It never identified anyone, and step 5d's named targets
`modernia` (299) and `volume` (119) are both `reload_bullet 10000`, i.e. single-chunk units that never
had the mechanic at all. The `reload_start_ammo 8` clause cited as the tell in DECISIONS 2026-07-13
and in `jill.json` is non-discriminating (`jill` is `reload_bullet 10000`). Her real mechanic is a
BURST buff — 100% ammo dump + Forced Reload + reload speed fixed at +99.96% for 10 s — which is its own
thread: **U31**.

**BUILT 2026-07-22 — the chunk COUNT is now derived and gated** (`scripts/check-reload-chunks.ts`, wired
into `verify.sh`). `chunks = 10000 / reload_bullet`, asserted against
`reloadFrames == reload_time × chunks × 0.6 + 21`. Census: **192 units — 15 chunked (14× 3-part, 1×
2-part), 177 single-part.** Zero behaviour change; it makes the previously-undocumented upstream
convention explicit and fails loudly if `sync.ts`'s `wf?.reloadFrames ?? api?.reload_time ?? …` fallback
ever drops the multiplier. Three tolerated known exceptions, each recorded in the file: `grave` (the real
gap — shipped ×1 of a 2-part reload, masked by her measured `charFixes 193`), `asuka` (+3 f) and
`scarlet-black-shadow` (+11 f), both single-part and unrelated to chunking.

**`grave`'s "Reload Ratio ▼50%" is EXPLAINED (owner 2026-07-22):** she reloads only half her bullets per
part, so a full magazine costs two parts and her effective reload time doubles. That is exactly
`reload_bullet 5000`, and it reconciles with her measurement — 61.5 shots per gap (a FULL 60-round mag
between gaps) with a gap ~2× a single part.

**⚠ THE COMPOSITION IS NOT DETERMINED — do not guess it.** How N parts compose into a duration is
contradicted by the only two units with measured reloads:

| model                        | `grave` (measured **201 f**, range 171–211, n=19) | `noir` (measured **~36–54 f**) |
| ---------------------------- | ------------------------------------------------- | ------------------------------ |
| shipped (one gap, tail once) | 92 f — far too fast                               | 73 f — already too SLOW        |
| chunk-derived, tail once     | 150 f — 51 f short                                | 73 f — too slow                |
| per-chunk tail               | **184 f — inside range ✓**                        | 141 f — wildly too slow        |

No single model fits both. Per-chunk tail would also make all 9 chunked SGs ~40% slower
(`soda-twinkling-bunny` 151 → 216 f), a large board move on calibrated units. **Independent finding worth
its own thread: `noir`'s shipped reload (73 f) already over-predicts her measured 36–54 f**, before any
chunk change. Settling this needs a frame-count of one chunked unit's reload broken into parts.

**LOW-PRIORITY ACTION ITEM — `grave`'s data value is HELD AT 81 (owner decision 2026-07-22).** She is not
corrected to the convention's 141. Two reasons: the composition question above is unsettled, and the
correction would change nothing today anyway — her MEASURED `charFixes.reloadFrames 193` (3.35 s gap,
n=19) overrides the data value before it reaches the engine. She is now **pinned** in
`scripts/check-reload-chunks.ts` rather than skipped, so the gate still fires if her 81 ever drifts.
**Do NOT "resolve" this by deleting her `charFixes` so the 81 takes effect** — 81 → 92 f effective
against a measured 201 f, and the 193 is measured truth (constraint 3). Revisit when the composition
question is settled.

**What remains open:** (1) `grave`'s true chunk count, 2 vs 3, and whether _"Reload Ratio ▼50%"_ is the
multiplier — one focus read of her reload split into visible chunks settles it; (2) whether the ×3 on
the 14 should be made explicit in the sync (derive `reloadFrames` from `reload_time × 10000 ÷
reload_bullet`) rather than inherited silently from the upstream table, which would fix `grave` as a
side effect; (3) the two formula outliers (`asuka`, `scarlet-black-shadow`). Confirmatory footage for
the 3300 group already exists if wanted — `noir`, `drake` (`docs/probe-data/coreband-drake-sg.json`),
`soda-twinkling-bunny` (`soda-tb-control-recon.json`). (NB `docs/probe-data/maiden-solo.json` is
**maiden-ice-rose** (RL/Electric), NOT `maiden` (SG/Electric, the unit in the 3300 group).)

### U29 — the Snow White: Heavy Arms fire team makes 12 Full Bursts in reality; the sim generates 10 (opened 2026-07-22)

The graded comp internally labeled "N5" — Anis: Star, Arcana: Fortune Mate, Privaty,
Snow White: Heavy Arms, Diesel: Winter Sweets, boss Fire, focus Privaty; recording
`docs/probes/714 noon/5.mp4` (+ `5.JPEG`) — has a **manually re-verified real Full Burst count of
12** (owner recount 2026-07-22, confirming what the original probe log always said:
`docs/probes/714 noon/probe.md:17` recorded "measured 12 / sim 11 ✗" at grading time).

**The sim has never matched it, and the pinned "11" was never a measurement** — it matched the OLD
sim's output, so this comp was wrongly counted among the "full-burst counts measured-exact" set.
Current state: 11 under the pre-UNIGEO engine, **10 under the shipped UNIGEO default** (the −1 from
11→10 is the shotgun-landing→burst-gauge coupling — isolated cleanly by the W6 gauge-decoupling run,
worktree deliverable addendum; decoupling restores 11 but the REAL count is 12, so both variants
under-generate and the coupling is not the root cause).

**What to investigate:** a burst-generation shortfall of ~2 Full Bursts on this comp — likely
family: the burst-cycle timing thread (same family as the open "re-pin the PH-water fire comp's FB
to 12 when the burst-cycle fix lands" item in the role-audit follow-ups), gauge under-generation on
one of the five kits, or a chain/cooldown collision unique to this comp. The per-pellet vs per-shot
question for shotgun gauge generation rides along: Anis: Star is RL, but Snow White: Heavy Arms'
weapon-swap kit and the comp's gauge economy need a real read against the footage's actual FB
timestamps. First measurement: pull the 12 real FB timestamps from `5.mp4` (03:00-anchored) and diff
against the sim's chain log to see WHERE the two missing chains fail to open.

**2026-08-14 addendum (investigation-plan item 4):** the sim reads **11** under the current engine
(the 10 above is the 2026-07-22 UNIGEO-era count). The per-pellet-vs-per-shot shotgun gauge
question this entry flagged is now SIZED and EXCLUDED as the missing burst: the per-trigger
ceiling arm (`SGGAUGE=trigger`, +48% on `arcana-fortune-mate`) moves N5 11→**11** — the gauge
ceiling buys no burst boundary here (instrument: `scripts/battery/fb-count-matrix.ts
--multihit-crediting`, branch `audit/item4-multihit`). The shortfall is not SG gauge crediting;
see U40 for the owner question, filed separately.

### U28 — `extraHitDamagePct` vs `flatDamage` are not interchangeable: gauge + flavor asymmetry (split out of U13, 2026-07-22)

A32 closed the crit divergence between the two encodings of function "additional damage". Two
divergences remain at the same call site. **They are not the same kind of open:**

1. **Burst gauge — RESOLVED 2026-08-13.** `extraHitDamagePct` now calls `skillGauge` at the same call
   site as an equivalent `flatDamage` proc (one target-base HIT of generation:
   `targetPerTrigger / hitsPerShot`, `/10` for SG, no `flatPerTrigger`, no charge/focus ×2.5), so the
   two encodings of one kit line are interchangeable in gauge terms and re-encoding a unit between
   them no longer silently changes its rotation. Landed as an encoding fix, not a measurement: the
   documented rule (`burst-gauge.md` §5, every skill/additional-damage impact generates) and the one
   MEASURED function rider (`maiden-ice-rose`, `burst-gauge.md`:145 — a visible second bar sub-step
   per pull) already answered the direction. → DECISIONS 2026-08-13.
   **Board effect: none, BY MECHANISM** (census: `scripts/battery/u28-gauge-ab.ts --lock-census`, 0
   unlocked emissions in every comp run). A field-form sweep finds exactly four carriers, one rider
   each, all `burstCast`-triggered — but the covering argument is PER-CARRIER, keyed to burst stage:
   `neon-vision-eye` (10s) and `neon-blue-ocean` (7s) are Burst III, so the granting cast opens a 10s
   FB 22f later and the window is strictly inside it; `modernia` (15s) is Burst III whose same
   `burstCast` grants `fullBurstExtend: 5`, so her window closes inside her OWN 15.37s FB; `nayuta`
   (10s) is Burst **II** and opens no FB at all — the `stage !== 0` half of the lock covers her, and
   on a chain collapse her rider's 600f expiry coincides exactly with `stageExpireFrame`, a zero-frame
   hole (⚑ default-only: `CHAIN_TIMEOUT=120` would open a real 8s one). ⚑ Two write-ups of this got it
   wrong in opposite directions — do not re-derive `modernia` against a nominal 10s FB (reads as a
   false 4.6s exposed tail), and do not extend the Burst-III argument to `nayuta`. What would expose
   the emission: a rider window outliving the Full Burst its own cast opens, or a chain expiring while
   a window is live.
   **Residual (the half still open):** `extraHitDamagePct` is a SUMMED stat dealt as ONE impact, so
   two riders on one unit would emit once where two `flatDamage` riders emit twice. No unit carries
   two today; fixing it means the stat stops being summed.
2. **Flavor — moot for crit (2026-07-25).** `extraHitDamagePct` is a SUMMED buff stat, so an individual rider
   has no `flavor`. This no longer matters for crit: true damage CAN crit (owner ruling 2026-07-25, in-game
   confirmed; reverses §2c), so a true-flavored rider critting at the caster rate is CORRECT and needs no
   per-source exemption. (The summed-stat flavor distinction could still matter for other flavor-gated
   behavior, e.g. `trueDamagePct` buff gating.)

**Still unmeasured — and it is a `skillGauge`-WIDE question, not an `extraHitDamagePct` one** (it
rides identically on every `flatDamage` and DoT carrier, and did so before the 2026-08-13 landing):
the per-impact MAGNITUDE at high hit rates. The `skillGauge` constant is anchored on ONE
measurement — `maiden-ice-rose`, RL, `hitsPerShot` 1, where "one hit" and "one trigger" coincide
(`burst-gauge.md`:145, two visible bar sub-steps per pull: +9.1% weapon then +3.45% rider). The
`/hitsPerShot` divisor — and the hardcoded `/10` for SG — generalizes from that single case and is
UNVERIFIED for `hitsPerShot > 1`; every unit where the divisor actually bites (`modernia` at 2, any SG
carrier at 10) rides extrapolation. Note also the measured rider sub-step reads 3.45% vs the modeled
3.64%, a small unexplained residual on the exact constant the whole path is anchored to.

**Gate:** a `hitsPerShot > 1` gauge-bar read to pin the divisor — `modernia` Destroy Mode is still the
natural probe (MG hit rates make per-hit generation obvious), though note her rider now generates
entirely inside the gauge lock, so the probe must read the BAR, not infer from her rotation. Until
then: do NOT author a true-flavored rider (the flavor half of the asymmetry is unchanged). The
"do not re-encode a unit between the two primitives" rule is LIFTED for gauge as of 2026-08-13.
**2026-08-14 (gauge-source census, investigation-plan item 2):** an EXISTING labeled fixture already
bears on the divisor — `anis-star` (RL, hitsPerShot 2) battery-3-A3 solo (probe-runs.md) measured
~10.7–11.3%/pull, and the shipped model generates only 8.9%/pull (700 focused shot + 140 rider
HALVED by the divisor, ×1.06 aura) — below the band, while the fixture's own decomposition (proc =
full 280, not halved) is compatible. She seats four of the nine off-count comps (+42–59 gauge/fight
if resolved her way ≈ 0.2s refill per cycle on T5 ≈ 12% of its cycle gap); `modernia`'s exposure is
+66.5 gauge/fight on N2 (1330 unlocked rider impacts); every SG carrier's skill hits land inside
the lock (zero exposure). The census nominates anis-star as the mechanism probe: divisor 1 vs TWO
impacts per pull (her rockets may each carry a proc) — gauge-equivalent resolutions, distinguishable
only by popup/footage. Instrument: `npx tsx scripts/battery/fb-count-matrix.ts --gauge-sources`.
→ A32 (U13), DECISIONS 2026-07-22 + 2026-08-13.

**2026-08-16 research pass (owner-directed; external sources, findings-only) — the divisor question
is now much narrower:**

1. **The per-HIT rule itself is community-settled at HIGH confidence for weapon normals** and
   MEDIUM-HIGH for skill sub-hits: (a) the note.com/_trick_ verification (2025-03-14, controlled
   shooting-range counting) states gauge has a per-HIT base per character, SG credits per pellet
   (×10 all-landed), missed shots credit nothing, and "skill generation = what ONE normal-attack
   HIT generates"; (b) nikke.gg (2023-01-12, measured) lists the 2-bullet-per-trigger units
   (`noah` RL, and the `crow` / `soline` / `quency` base SMGs — the datamine's
   `muzzle_count: 2` rows) crediting PER HIT; (c) the raw datamine
   (`CharacterShotTable`) stores `burst_energy_pershot` PER PROJECTILE beside `shot_count` ×
   `muzzle_count`, and our own `data/gauge-per-shot.json` per-trigger values reconcile as
   raw × muzzle_count exactly (`quency-escape-queen` 740×2 = 14.8); (d) an independent
   datamine-driven simulator (nikke-einkk) implements `pershot × shot_count × muzzle_count ×
focus`. ⇒ For a GENUINE multi-muzzle unit, the engine's `targetPerTrigger / hitsPerShot`
   rider credit recovers exactly the per-projectile value the community rule prescribes — the
   divisor is CORROBORATED for real multi-hit units, not refuted.
2. **`anis-star` is NOT a real multi-hit unit — her divisor bite is a HACK, not data.** Datamine:
   `shot_count 1 × muzzle_count 1`, one projectile crediting 280 on boss (matches our own
   2026-07-13 solo measurement). Her `hitsPerShot: 2` is an explicit carve-out documented in
   `src/data/weapon-fields.ts` (~:54-63) as a "LOAD-BEARING gauge-calibration hack" that halves
   her 40-tick burst-DoT's over-emitted `skillGauge`; removing it flips comp "PA MiKa" to 12 FBs
   vs measured 11. ⇒ Her rider halving divides by a synthetic 2 the game data does not contain —
   but it CANNOT be removed in isolation (compensating-errors class): the enactable shape is a
   BUNDLED re-model of her burst-DoT gauge emission + carve-out removal, verified on PA MiKa's
   pinned 11 AND T5 wind-weak (+58.8 gauge/fight ≈ 12% of its cycle gap rides this). Gated:
   engine change on a derived value → `/scientific-method` (or an owner ruling on the mechanic +
   `/code-review` on the bundle).

### U27 — isabel's mid/midfar SG landing needs a clock-drift-corrected re-derive (split out of U17, 2026-07-22)

**The one SG-landing thread still open.** The rest of the per-unit-landing investigation was CLOSED by owner
override on 2026-07-17 — see **A31 (U17)** in ANSWERED: landing is per-unit, the class `SG_LANDING_BY_BAND`
table STANDS as the shipped compromise, a class-wide far 0.66 is REJECTED, and the seeded pellet-count jitter

- `bossPelletProfile` landed instead. What remains: isabel's **mid** and **midfar** band reads rest on a
  SINGLE anchor whose measurement PREDATES the clock-drift discovery, so those two cells are not trustworthy at
  the precision the rest of the table now carries.

**Scope — deliberately narrow.** This is a re-derive of two existing cells from EXISTING footage. It is NOT
new footage, and NOT a per-unit landing profile (that is precisely the part the owner closed). isabel's near
and far cells are unaffected: far is already resolved as per-unit (her r0.87 sits low alongside
brid-silent-track r0.88, versus guilty r0.93 and noir r0.99 at/near table).

**Do NOT re-open the closed part from this.** The per-unit `sgFarScale≈0.88` candidate for isabel +
brid-silent-track stays DOCUMENTED-but-UNENCODED — both are sim-LOW for rider/term reasons, so a <1 landing
factor drags them further down. Trail: A31, `docs/probe-data/` isabel/guilty/brid-silent-track sg-band files

- `noir-solo-recon.json`, DECISIONS 2026-07-16/17.

### U26 — "All-or-nothing" crit on sequential attacks + an Eve carve-out (2026-07-21)

**Surfaced while modeling cinderella's burst** (a 10-hit "1365.92% × 10 sequential" nuke the engine
represents as one flatDamage instance). The engine rolls crit ONCE per damage instance
(`dealDamage`, `src/engine/sim.ts` ~1186–1191: a single Bernoulli `rng() < critRate` → full crit bonus
or nothing), so a single instance is inherently all-or-nothing. For a **sequential attack** this is
believed CORRECT: in NIKKE a multi-hit sequential round (Snow White: Heavy Arms' sequence, cinderella's
10-hit nuke, Eve's concentrated payload) has its critical hit decided at the **round/action level** — if
the round crits, the crit multiplier scales the whole round's damage; it does NOT independently roll
"crit, normal, crit, normal" across the micro-hits inside the round.

**Open items for later review:**

1. **Verify the engine's all-or-nothing crit is applied at the right granularity** for every sequential
   attack — i.e. one crit determination per sequential _round_, not per micro-hit, and not per whole
   multi-round skill either. Confirm cinderella's nuke, Snow White: Heavy Arms' sequence, and Eve's
   sequential procs/burst are each rolled once per round as intended.
2. **Eve (`eve`) is the exception and needs a carve-out.** Her kit is built around sequential attacks
   plus Unstable Energy, a passive that triggers after landing **44 critical NORMAL hits**. For that
   counter to fill at the right rate her ordinary rapid-fire weapon attacks must roll a **normal
   per-shot crit chance** (each shot independently crits or not, stacking the counter), even though the
   sequential payload it eventually fires resolves all-or-nothing. Today the engine does NOT roll a live
   per-shot crit counter for her — her cadence is approximated by a static threshold (`hitCount 59` =
   44 crit hits ÷ ~0.75 crit, `src/skills/overrides/eve.json`), which cannot respond to external
   crit-rate buffs shortening the real cadence (already flagged in her caveats). A faithful Eve wants
   per-shot crit rolling driving the counter, distinct from the round-level all-or-nothing rule.

Eve is currently **ungraded** (no board data, no focused Eve footage in the catalog), so this is a
model-correctness note to settle when Eve footage is captured — do not fudge her to close it. Related:
[[full-kit-audit-requirement]], sequential/`sequentialMultPct` bucket (Phase A4), U13 (DoT/rider crit).

### U23 — milk-blooming-bunny's burst-window over-model, exposed by the (faithful) Gain-Pierce landing (2026-07-20)

Enacting the kit-literal S1 "Gain Pierce for 6 sec" (`gainPierce` on `shotFired`; kit-audit Phase C
ENACT-NOW, DECISIONS 2026-07-20) lit `milk-blooming-bunny`'s previously-dead Pierce package — her burst
`pierceDamagePct +117.64%` now applies to her burst-window damage. Isolated A/B: **PG 0.653 COLD → 1.301
HOT** (total ~×2). The pierce value is datamined (not tuned) and the mechanism is verified faithful (debug:
`dmgUp` 1.00→2.31 during her ~10s burst window, correctly ending at t≈13.17 — the same unit-tagged pierce
Damage-Up model grave uses). So the residual **+0.30 HOT is a SEPARATE over-model**, not the pierce. Two
candidate drivers, both measurement-gated: **(1)** her auto-basis magnitudes — the burst `atkPct 220` + S2
DoT `447.7% ×5` and the whole Embarrassment-off cadence are an unmeasured parser baseline (plan
§milk-blooming-bunny gotcha 2, MEASUREMENT). ⚑ **Label updated 2026-08-12:** this used to read "the
Embarrassment mode-split"; the mode split no longer exists (owner ruled the manual branch out of the model
and her Embarrassment lines are filed under `unmodeled`). The auto basis is unchanged, so the SUBSTANCE of
this driver survives intact — only its name was stale;
**(2)** the pierce-window DPS share is unmeasured — a milk-blooming-bunny-FOCUS recording is needed to
confirm how much of her damage really lands inside the +117.64% window. Do NOT re-fudge 117.64 to cool her.
Recipe: milk-blooming-bunny-focus video, read burst-window vs out-of-window DPS split + confirm the pierce
buff-icon window. Trail: `src/skills/overrides/milk-blooming-bunny.json` caveat, DECISIONS 2026-07-20, plan
§milk-blooming-bunny.
**UPDATE 2026-07-21 (U13 DoT-crit flip):** enabling DoT crit added +0.030 to her HOT residual (1.300→1.330)
via her S2 447.7% dot now critting — a FAITHFUL mechanic, not new over-model. So when this reconciliation is
finally taken, ~0.03 of her heat is now correctly attributed to dot-crit; do not re-chase it as part of the
Embarrassment/pierce-window over-model.

### U21 — maxwell's "highest final ATK" buff recipient (A3, HELD 2026-07-20)

**A3 landed `byFinalAtk` on 4 units but HELD `maxwell`** — her S1 grants atkPct 43.1 + chargeSpeed to the
2 highest-FINAL-ATK allies on `fullBurstEnter`. Switching her to live-ATK ranking swings her only graded
comp ("PG iron sweep" [d-killer-wife, `takina`, `milk-blooming-bunny`, `maxwell`, `liberalio`]): the +43.1%
ATK lands on `takina` (Burst II — structurally the sole possible cause), pushing takina 0.988 OK → 1.280
HOT. This is a **transient-snapshot artifact**: peak effective ATK in that comp is milk 446k > liberalio
377k > takina 234k > maxwell 132k, so takina is NOT naturally top-2 — she only ranks up at maxwell's FB
_instant_ because milk's 446k (her own burst peak) is transiently at base then. Entangled with milk's known
COLD (0.681, pierce package inert) under-model, so the ranking there is untrustworthy. **RESOLVER:** a
maxwell-focus video reading which 2 allies actually receive her ATK/charge-speed buff icon at FB entry
(and whether the real game snapshots instantaneously or over the window). Until then maxwell stays on
STATIC ranking (status quo, no regression). NOTE when she lands: she'd be the first FB-enter atkPct final-ATK
selector, activating a same-frame apply-ordering dependence (other FB-enter final-ATK selectors' ATK grants
would then reorder her pick) — verify apply order at that time. Trail: DECISIONS 2026-07-20 A3,
`docs/handoffs/2026-07-20-kit-audit-implementation-plan.md` §A3.

### U19 — grave's burst-window over-model, exposed by the (faithful) timed-pierce primitive (2026-07-17)

**Surfaced by the `gainPierce` primitive (engine-modeling-gaps fix #7).** The timed-pierce window lets
"Gain Pierce for N sec" wake a unit's Pierce Damage ▲ buffs. **MECHANISM (owner-confirmed 2026-07-17):**
Pierce Damage ▲ is a real Damage-Up-bucket entry that DOES apply on the partless scope-lock boss (only
the separate pierce core+body DOUBLE-HIT is multipart-only, `PIERCE_CORE_DOUBLE=false`). So wiring it on
**grave** (measured, solo 1.005) at faithful kit values (self 52.8 + team 39.98 = +92.78 Damage Up for
10s/burst, S1's 48.4 excludeSelf'd) is CORRECT — yet it overshot her three comps from 0.836/0.831/0.800
COLD to **1.178/1.171/1.219 HOT**. The faithful pierce is now ENABLED (owner-directed 2026-07-17,
faithful>fit) — so the HOT is a live, isolated residual, not the pierce. Since the pierce is real, the
overshoot is diagnostic: grave's 0.836 COLD was a **NET of two errors** — the missing pierce (COLD) was
MASKING a compensating over-model in her burst window (HOT = the documented "AR-carry burst-window
residual"). **Open question:** where is the burst-window over-model? **TWO candidates remain** — Overheat
II/III ramp modeled as full-window uptime (her override's ⚑ says durationSec 7.5/5.0 would match the real
~2.5s/~5s ramp-in vs the current 10s), or her burst-window fire-rate/crit stack. **The third candidate is
CLOSED: the Prediction-end forced reload IS modeled** (`burstCast` + block `delaySec: 10` → `consumeAmmo`
fraction 1, which empties the magazine at Prediction end and forces the measured ~201f reload). It was
listed here as unmodeled long after it landed — verified against the shipped override 2026-08-10, batch 6. **Method:** a focused grave burst-window recording — fire count across
the 10s Prediction window + a Pierce-Damage-on/off popup to pin the real pierce magnitude; then trim the
burst-window over-model (grave should land back near 1.0 with pierce ON). Links: grave override ⚑1,
engine-modeling-gaps theme 5 / fix #7, damage-calculation.md dmgUp bucket.

### U8 — Probe-team residuals: what remains after the recorded re-runs

Nine probe recordings (2026-07-13, docs/probes/u8 + docs/probes/tb2) have resolved almost
everything here; per-run details in docs/probe-runs.md. STILL OPEN after test battery 2:

- **ein 0.71-0.76** (both run-E configs) — she cooled when the burst-gauge model was
  rebuilt (gauge v4) and is now the largest team-fight residual; her kit (stored/stacked
  skill damage) needs a review or an ein-focused recording.
- Mild burst-3 heat in run I (chisato 1.22, grave 1.15, noir 1.07) — partially the sim's
  ~7% fast rotation there.
- Run A: WHO casts Burst 2 each rotation (mint vs prika duet order) is still unverified —
  the test-battery recording used Alice's sniper-scope camera, which hides the burst
  cut-ins; needs one more run with a different focus unit. Also observed: Alice's total
  came in +9.3% vs the original run A while every other unit repeated within ±5% — the
  camera-focused unit generates x2.5 burst gauge on its charge shots (see the answered
  gauge item), so WHICH unit holds camera focus genuinely changes a fight's totals.
- Cinderella items: all SOLVED (docs/probe-runs.md, runs e3 + battery tests 1-2).
- Jill: SOLVED (battery test 4 — see the answered items).

UPDATE 2026-07-14 (714 noon probe, nine focused testing-request fights — docs/probe-runs.md).
Every focused (middle-slot) unit in that batch is in the enikk top-100 supported set, so its
read is meta-valid. New residuals / confirmations from the FOCUSED units:

- **Scarlet: Black Shadow — RESOLVED 2026-07-14 (CALIBRATED ⛑).** Her tracked ~1.23 heat,
  confirmed by a second focused fight (N3 boss Iron, 1.31; T1 1.18) and localized by her N3
  popup read: her charged-normal popup reads 1.55M vs sim 1.60M (correct), so the excess was
  entirely in the proc bucket. The blend-to-6 over-credited the burst-window proc tripling; a
  cadence sweep across BOTH fights lands hitCount 6→10 (near the literal every-9 outside-burst
  rate — the tripling barely materializes), moving T1 1.18→1.00 and N3 1.31→1.07 with no
  teammate/FB blast radius (self-damage procs). Still calibrated tier; re-check if a frame-exact
  proc-cadence read lands.
- **Guillotine: Winter Slayer — NEW residual, consistently hot 1.21–1.31, LOCALIZED to her
  normal fire.** First FOCUSED measurement (N8 boss Fire, bursting: 1.21) plus the non-bursting
  bench read (PH: 1.31). Decomposition localizes it precisely: her burst DoT is level-11-scaled
  and grades ACCURATE (N8 real DoT ≈114M ≈ sim 115M), so her Hero-Level auras + effective level
  are CORRECT; the excess is entirely in her normal-fire bucket, uniformly ~26% over in both
  fights (real normals ≈224M vs sim 294M in N8; PH 1.31 is normals-only). Ruled OUT: the
  near-infinite-uptime instantReload charfix (removing it moves her only 1.31→1.26 / 1.21→1.16).
  A flat 0.76× normal haircut would fix both to ~1.0, but the MECHANISM is unidentified — the
  suspect is a datamined MG weapon parameter (rate_of_fire / per-shot atkPct 13.7). NOT refit:
  needs a datamined recheck against the reference sim (nikke-einkk), since MG normals are not
  popup-readable and her level-scaled effects are confirmed right. Do not apply a blind normal
  scalar. Her auras also buff Water teammates, so any change needs a blast-radius pass.
- **milk-blooming-bunny 0.73** (focused, N10) — CONFIRMS the accepted DECISION (~0.7, poor
  auto-play); N10's total also graded exact (782M sim = 782M real). No action.
- **Vesti: Tactical Upgrade 3.23** (UNFOCUSED, N8) — her custom-volley model (4 rockets over
  ~1s, charFixes) is badly over. NOT a tuning target from this batch: she is unfocused here and
  is outside the enikk top-100 set. Needs a vesti-focused recording before any refit.
- rapi-red-hood (0.92, N1) belongs to her own active rework increment; modernia (0.90, N2) and
  snow-white (1.11, N4) are confounded by that comp's full-burst-count anomaly; privaty (1.58,
  N5) is already calibrated (0.97 on T4) — her N5 heat is Arcana: Fortune Mate's team buff
  inflating the whole side (arcana 1.88 / privaty 1.58 / snow-white:HA 1.33 together), and
  Arcana is unfocused here.
