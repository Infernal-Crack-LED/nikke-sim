# Pellet reader — judge handoff after the 2026-08-01 elimination sweep

> AI-facing. Written 2026-08-01 at the end of a long session, for the judge session that follows.
> Supersedes nothing; it CONTINUES
> [`2026-08-01-pellet-cascade-JUDGE-handoff.md`](2026-08-01-pellet-cascade-JUDGE-handoff.md), whose
> §1 pre-commitment and §3 graveyard are still live and still binding. **Read that one too.**
>
> **CONTINUED BY
> [`2026-08-03-pellet-reader-JUDGE-handoff.md`](2026-08-03-pellet-reader-JUDGE-handoff.md) — read that
> one first; this file stays live for its ledger, graveyard and traps.**
>
> **Slugs:** `marciana` (SG/Iron — `docs/probes/clean-weapons/marciana-solo.MP4`; **not**
> `marciana-marine-study`, AR/Iron), `noir`, `guilty`, `isabel`. All SG, `ammo: 9`.

---

## 0. The one-paragraph state

The counter reads **0.8–1.6 pellets/10 cold** against a ±0.25 budget. Five candidate causes were
ELIMINATED on 2026-08-01 and one PARTIAL cause was measured. The partial cause is **undetected shots**
— a missing shot contributes its whole ~8.4 pellets. Measured against the ammo counter as an
independent arbiter the whole-fight AGGREGATE is **3.9–6.8% of shots**, where **8–16%** is needed to
carry the whole bias. Two owner hand counts have since shown **that aggregate is not the per-event
rate**: on `isabel` (36 shots / 30 s) and `guilty` (23 shots / 20 s) the reader's per-event miss rate
is **16.7% and 17.4%** — within 0.7 pp of each other — while the aggregates differ 2.3× (5.6% vs
13.0%), because misses and inventions cancel inside the netted figure (`docs/probe-runs.md` §4.5, §7).
Both hand counts also validated the arbiter itself: it reproduces 36 and 23 exactly, so `isabel`'s
3.4× raw-vs-admissible swing is **resolved in favour of the admissible reading (~4.4%)** and the raw
14.7% is an artifact.

**Cluster-merge in `debounce_shots` is REAL, SMALL, and REFUTED as an explanation of the cold bias**
(`docs/probe-runs.md` §8). The debouncer does merge adjacent shots into one event when its gap
tolerance is exceeded, and three of the four `guilty` misses are traced to specific merged entries
whose swallowed shots peak at T = 11–13 — **merge failures, not sensitivity failures**. But the size
is **31 of 815 events (3.8%)** against the cadence period, ~**20 shots pooled = 2.6%** of ammo shots
by the arbiter, which is **roughly one third of the arbiter-visible missing-shot channel** and about
**one eighth** of what the earlier `frames > max_pellet_frames` framing suggested. And it is **not
the cold bias**: both minimal fixes read **bit-identical to shipped on all 5 owner-labelled
`marciana` (SG/Iron) shots**, and every merge fix moves pooled `avgTotal` by ≤ 0.007 against a
**1.08 pellets/shot** deficit — some of them in the wrong direction.

⚑ **Status of the remainder, honestly:** it is **OPEN again**. The missing-shot channel is real but
partial, and merging is only part of it; the ~1.08 pellets/shot gap now has **no measured
explanation**. The newly-identified lead is the **REPRESENTATIVE-FRAME POLICY** — `debounce_shots`
copies each event's count from ONE frame, the active frame nearest the **median**, and on the 5
owner-labelled shots median reads **−1.40 COLD** while max-of-event reads **+4.20 HOT**. That is
**HYPOTHESIS strength, n=5, post-hoc** — no policy is proposed — but it has a **REUSE path needing no
new labels and no owner footage**: score representative policies against `real-fidelity-slice.json`
and the `groundtruth-f8-11` crops (`docs/probe-runs.md` §8G, and the `QUEUE.md` item).

## 1. What was settled 2026-08-01 — all recorded in `docs/probe-runs.md`

| #   | Question                                    | Outcome                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Do real pellets survive the filter?         | **94.6%** both-pass (n=168 instances / 42 pellets). Filters near-inert on real pellets (`min_area` 2.45%, `min_circ` 0.61% of found). The synthetic 71.6% characterises the GENERATOR. All 9 failures at f11, pellets faded to 199–209 vs the WHITE_LO 210 mask — a fade-out boundary effect, not a filter defect. |
| 2   | Is the counting window too small?           | **ELIMINATED.** Precision falls 0.906 → 0.853 → 0.807 as radius grows; 175→190 adds +10 FP and ZERO TP; the confirmed true-zero shot starts reporting 1.00 at radius 175. Cause: `crop_disc()` slices a SQUARE with no mask, so scene content runs to r=259 in the corners.                                        |
| 3   | Does the n=120 synthetic cascade reproduce? | **YES, exactly** (96.89 → 85.38 → 80.23 → 71.61). `min_circ` dominance CONFIRMED at 17.19% vs 11.88%. The slice fixture's inversion is small-sample noise (sequences 0/30/60/90; two reject ZERO on circ).                                                                                                         |
| 4   | Is the crop mis-centred per shot?           | **NO.** Offsets are within centroid noise — per-axis SE 29.5/22.0 px, every shot ≤2.7σ, pooled mean t = (0.08, 0.24).                                                                                                                                                                                              |
| 5   | Do stale locks reach the counting frames?   | **No decision-rule row fires.** Counting frames are DEPLETED (6.05%/13.89% vs 20.01% all-frames), A/B 1.1 SE from zero. **But the depletion is SELECTION — see §3.**                                                                                                                                               |
| 6   | Is there a missing-shot channel?            | **YES.** Whole-fight AGGREGATE 3.9–6.8% of shots vs the 8% needed — the "between" row fired. ⚑ But the aggregate is a NETTED figure: two hand-counted windows put the PER-EVENT rate at **16.7% / 17.4%**, at or above the 8% bar (`docs/probe-runs.md` §7). Which basis carries the bias is not yet decided.      |

## 2. Provenance ledger — which numbers carry which weight

| Figure                                                | Weight                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Real BOTH-pass **94.6%**                              | **Strong.** xy-matched, gate-validated, self-pinned by `real-fidelity-slice.json`. Corroborates the independent bias-derived 0.925–0.98 reference. One clip, one unit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| n=120 cascade **71.6%** + `min_circ` dominance        | **Strong, confirmed.** Re-run by two independent script instances agreeing on every field; the "judge never re-ran it" gap is CLOSED.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Centroid SE **29.5/22.0 px**                          | **Strong.** Independently reproduced by the driver from the positions fixture. Supersedes the 18 px assumed in the centering plan.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Stale-lock prevalence **5.2–31.0% of frames**         | **Solid on the four full-fight dumps.** ⚑ The original 7-dump table DOUBLE-COUNTS (3 small dumps are 60fps re-extractions of windows inside 2 of the same 4 videos) and mixed 30/60fps. Corrected in the same probe-runs section.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Missing-shot **3.9–6.8% aggregate / ~17% per event**  | **⚑ TWO DIFFERENT BASES — never quote one for the other.** **AGGREGATE (whole-fight, netted):** 3.9–6.8%, MEDIUM and a FLOOR not a point estimate. **PER EVENT (misses counted separately from inventions):** `isabel` **16.7%** (6 missed + 4 invented over 36 shots, aggregate 5.6%), `guilty` **17.4%** (4 missed + 1 invented over 23 shots, aggregate 13.0%) — within **0.7 pp** of each other while the aggregates differ **2.3×**. n=2 windows / 2 units, **MEDIUM**, below the n ≥ 5 board standard. **Arbiter gate-validation now covers three units:** `marciana` (SG/Iron; 5/5 owner shots recovered), `isabel` (hand count reproduced 36 exactly; admissibility rule confirmed by an independent method, so `isabel` reads 4.4% and the 3.4× swing is closed — `docs/probe-runs.md` §4), **and `guilty`** (hand count reproduced **23** exactly as 21 decrements + 2 magazine-empty, the 9/9/5 magazine structure confirmed, and the reconstructed **ending ammo level 4 independently matches the owner's "4 of 9 left"** — an ending-state check the `isabel` clean-magazine window could not provide; raw == admissible, 0 inadmissible flips — `docs/probe-runs.md` §7). `noir` alone remains internally consistent with no ground truth. |
| ⚑ **`--hand-count`'s `detected_weapon_attributable`** | **NOT authoritative — an UPPER BOUND.** The matcher credits **any** in-reload onset as that magazine's emptying round, so it cannot tell a real emptying shot from a false positive landing in the same reload window. On `guilty` it therefore reported **3 missed** where the truth is **4 missed + 1 invented** (it could not separate the real f1446 from the spurious f1456). **Both the `isabel` and `guilty` hand-count numbers inherit this**, which is one reason the arm's `MISSED_vs_hand` understates the per-event rate relative to the independent derivation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Ammo-arbiter read rate **52–71%** (pooled 60.6%)      | **Known limitation, and MEASURED as SEGMENTATION/LOCALIZATION-limited — not atlas-limited** (`docs/probe-runs.md` §5, 24,319 frames). **80.7% of abstentions are SEGMENTATION**, and 97.0% of the largest bucket (`no-digits`) falls on stale-lock frames, where the crop is not the ammo box at all. The atlas already carries **141 glyphs: 69 white + 72 red**, and red only ever renders digits 0–4 at magazine size 9, so it is complete. A perfect atlas is worth **+0.21 pp honest / +4.8 pp nominal**. ⚑ **And localization is NOT the lever either** — measured with an oracle localizer (`docs/probe-runs.md` §6): **+0.18 pp demonstrated / +1.33 pp optimistic bound**, because **70.2% of stale frames render no digits at all** (reload: badge crisp and localizable, digit cells empty). The surviving read-rate levers are temporal interpolation (+4.7 pp measured) and the 3-cell gate (needs a positional rule), both in `QUEUE.md`.                                                                                                                                                                                                                                                                                                   |
| Landed pellets/shot **8.4**                           | **Measured**, from the owner counts 7/10/8/9/8. The 8% threshold is derived from it and was re-checked, not assumed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Cadence **40 frames @60fps**                          | **Measured** per dump, and `60/ceil(60/1.5) = 40` confirms nominal = effective for the 90 rpm datamine.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Counter cold bias **0.8–1.6 pellets/10**              | **The problem statement. Unmoved by everything this month except the partial channel above.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

## 3. The single most important thing to carry forward

**Shot detection is DOWNSTREAM of the crosshair lock.** `build_tracks_and_counts` windows counts to
`cross_positions`, so `P(frame clears event_min | stale)` is 4.5–12.0% vs 31–34% given a good lock.
Stale% by offset from `t0`: `t0+8: 4.5%`, `t0+9: 3.1%`, `t0+11: 4.2%` — a deep trough exactly at the
counting window — rebounding to `t0+20: 19.7%`, `t0+40: 27.2%`, `t0+60: 31.8%` against 20.01%
unconditional.

⇒ **Any measurement conditioned on "detected shots" is conditioned on lock quality.** A reassuring
number from such a measurement is not reassurance. This is why measurement 5 above does not close the
question, and it is the trap most likely to catch the next session.

Related, and also load-bearing: **the tracker HOLDS the last good position when a frame yields no
structural candidate** — 154/155 stale runs have every interior position identical to the last good
one. That carry-forward is now EXPLICIT rather than inferred: `locate_crosshair_structural` returns
`(center, score, held)`, `--dump-tracks`/`--dump-detections` carry a per-frame `cross_held` array, the
abstention reason `held-lock` has its own class, and the docstring states what the function does.
`stale_mask()` prefers `cross_held` and falls back to the inferred per-mode rule, so every committed
dump and fixture scores exactly as before and **no detection number moved**.

**The warning above is unchanged by that fix.** Signalling a held lock does not make the position
real. Every measurement conditioned on "detected shots" is still conditioned on lock quality; the
`held` flag only lets you SEE which frames are affected.

## 4. Graveyard — 2026-08-01 additions. DO NOT RESURRECT.

The prior handoff's §3 holds six more. These three are new, and **all three were the driver's own.**

| Hypothesis                                                           | Why it looked right                                                                                                        | What killed it                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **"`pellet_radius` 160 is slightly too small"** (owner's + driver's) | All 9 outer marks sit 0.4–6.8 px past the line; the crop reaches r=184 so the owner could have marked further and did not  | Precision falls monotonically; 175→190 adds 10 FP and 0 TP; the true-zero shot reports 1.00 at 175. And 8 of 9 outer marks are in shot 1 ALONE — a too-small radius cannot produce that                                                                                                                                                    |
| **"`center_exclude` is eating the cold bias"** (driver's)            | The centre-weighted spec put ~11–14% of pellets inside r<36; on 10 pellets/shot ≈ 1.1–1.4, almost exactly the 0.8–1.6 bias | The sweep's 36→24 cell recovers exactly ONE distinct pellet. And the premise was FALSE: the live engine has run uniform-in-circle since UNIGEO shipped 2026-07-22 — the centre is genuinely SPARSE. The driver reasoned from `CENTER-WEIGHTED-PELLET-SPEC.md`, whose header falsely claimed it was live (corrected on `main` in `eb1fde5`) |
| **"The fixture's shot gaps hide ~4 undetected shots"** (driver's)    | The 80-frame gap is EXACTLY 2.00 cadence periods; a reload would not land on an integer multiple                           | Both gaps DO contain shots — **and the reader detected them** (debounce rising edges at 1176 and 1329, verified). `groundtruth-f8-11.json`'s six `t0`s come from `--shot-times`, a **required owner-supplied list**, never an exhaustive detection. The arithmetic predicted the right shots and blamed the wrong stage                    |

**Pattern across all three: the driver reasoned from a document or a fixture without checking what it
actually was.** The spec header was stale; the fixture was a hand-picked sample. Verify what an
artifact IS before reasoning from its contents.

## 5. Traps

1. **`cmd | tail; echo $?` reports TAIL's exit status.** Three false readings in this thread now.
2. **Two confidence scales.** Structural dumps score ~91–95 with `None` for a held lock; template dumps
   score 0–1 (medians 0.41–0.60). A `conf < 0.6` test is meaningful ONLY in template mode.
   - **And in an AMMO SERIES, `reads[k].conf` is the CROSSHAIR LOCK confidence — not digit-match
     quality.** It is byte-identical to the source `tracks.json.cross_confs`. **Digit quality lives in
     `reads[k].scores`** — three per-cell template scores, because the counter renders as **3 cells
     with leading zeros** ("008"). ⚑ Consequence: `probe-runs.md` §5.5's dark-badge `conf < 60` split
     is a LOCK/SURROUND measure (which §5.5 already labels a PROXY for "the reader is on the
     semi-transparent badge"), **not an OCR-quality partition** — do not re-read it as one.
3. **`f8-11` is a 60fps definition and does not transfer by index.** On 30fps dumps it lands past the
   blast (1.0–1.8 pellets vs 5.9–6.3 at the rate-equivalent `t0+4…t0+6`).
4. **Fixture shot 4 records `locate: "template"`, not `structural`.** Using structural for it silently
   measures a different crop's centre.
5. **Read the CLEAN crops** (`groundtruth-f8-11/`), never `groundtruth-f8-11-annotated/`.
6. **NEVER `git restore` / `checkout --` / `reset --hard`**; and **do not `rm -rf` in the worktree** — a
   safety hook blocks it, correctly. `scratchpad/pellets/_centering_tmp/` holds ~2.1 GB; leave it.
7. **Prefer SYNCHRONOUS subagents and commit per item.** Three background subagents lost completion
   records to process exits on 2026-07-31; committed work survived every time.
8. **Headless sessions: never background a shell command** — foreground with an explicit timeout.
9. **`max_pellet_frames` is a PER-BLOB TRACK-LIFETIME cap, NOT an event-span budget — never compare
   it to an event's `frames`.** It is passed to `count-pellets.py` as `--max-pellet-frames` and read
   at `count-pellets.py:380` / `:450` to decide which TRACKS count as pellets; **`debounce_shots`
   never reads it.** This trap cost a whole framing: it produced the "31.3% of detections are merged"
   headline, which is **~8× too large** — the meaningful denominator is the **cadence period**, and
   the real figure is 3.8% (`docs/probe-runs.md` §8A). ⚑ It also has a rounding trap: the shipped
   value comes from JS `Math.round((13/60) × fps)`, which is half-UP, so at 30 fps it is **7**, where
   a naive Python `round(6.5)` gives 6 (banker's rounding).
10. **`debounce_shots` exists TWICE — `count-pellets.py:489` and `read-pellets.ts:627` — as two
    independent implementations, not a shared module.** Any segmentation change must land in both.
    ⚑ And they may **already be one event apart**: the Python replay reproduces the shipped
    `pellets.json` summaries exactly on 7 of 8 dumps, but on `h4-marciana` (`marciana`, SG/Iron) reads
    `validShots` 177 / `avgTotal` 7.2 / `avgRed` 0.15 against the shipped 176 / 7.3 / 0.14 — one extra
    core-flagged valid event, probably a median tie-break (a strict `<` against `<=` on the distance-to-median comparison). NOT chased
    (`docs/probe-runs.md` §8H). Do not assume lockstep; verify it on the dump you are using.

## 6. Landed state

**Branch `fix/pellet-reader`: `origin` at `8d75008`; everything after it is local-only and UNPUSHED.**
Do not trust a commit count written into this file — any number here is stale the moment the
sentence itself is committed. Read it live: `git rev-list --count origin/fix/pellet-reader..HEAD`.
The last owner-authorised push was `8d75008`. `main` carries `eb1fde5`
(the sg-calc spec correction), which is NOT on this branch.

`bash scripts/verify.sh` → true exit 0. `bash scripts/probe/pellet-selftest.sh` → true exit 0, 16
arms. **`/patch-notes` is owed before anything reaches `main`, which is still deliberately held.**

Instruments landed today, all committed at named paths with pinning fixtures:
`score-pellets.py --audit-fidelity-real` / `--pellet-radius` / `--center-exclude` / `--real-positions`;
`analyze-pellet-tracks.py --stale-counting` / `--stale-counting-offsets` / `--missing-shots` /
`--missing-shots-gate`; `count-pellets.py --ammo-series`; fixtures `real-fidelity-slice.json`,
`centering-slice.json`, `stale-counting-slice.json`, `missing-shots-slice.json`; 72 red digit glyphs in
`scripts/probe/ammo-atlas/`, which now holds **141 glyphs — 69 white + 72 red**, a complete set (red
only ever renders digits 0–4 at magazine size 9).

Landed 2026-08-02/03, same convention: `analyze-pellet-tracks.py --hand-count` (fixture
`hand-count-slice.json`, `--hand-count-selftest`), `analyze-pellet-tracks.py --ammo-abstention`
(fixture `ammo-abstention-slice.json`, `--ammo-abstention-selftest`), and `analyze-pellet-tracks.py
--ammo-oracle-ceiling` (fixture `ammo-oracle-ceiling-slice.json`, `--ammo-oracle-ceiling-selftest`) —
all wired into `scripts/probe/pellet-selftest.sh`.

Landed `8ecad5a7`: **held-lock signalling**, detection UNCHANGED. `locate_crosshair_structural` →
`(center, score, held)`; per-frame `cross_held` in both dump formats; `held-lock` as its own
`ABSTENTION_CLASS` member (not folded into SEGMENTATION); `stale_mask()` prefers `cross_held` and
falls back to the inferred rule, so **no fixture and no dump needed regeneration**.

Landed 2026-08-03, documentation only: **the second owner hand count (`guilty`)** — `docs/probe-runs.md`
§7. **No code changed**; the existing committed `--hand-count` arm was re-run on a second window and a
second independent derivation scored the same frames. `debounce_shots` is UNTOUCHED. Re-run verbatim:

```sh
python3 scripts/probe/analyze-pellet-tracks.py --hand-count \
  /Users/maxwellsutton/nikke-sim/scratchpad/pellets/_missingshot_tmp/h4-guilty-ammo.json \
  --hand-count-window 42.8 62.8 --hand-count-at 0 --hand-count-fps 30 --hand-count-slack 8 \
  --hand-count-shots 23 --hand-count-magazines 2
```

⚑ `--hand-count-magazines` was passed the owner's **reload count** (2) — the window holds three
magazine segments (9/9/5) separated by two reloads. The field is a **pure passthrough entering no
arithmetic**, so nothing in the reading depends on it.

Landed 2026-08-04: **`analyze-pellet-tracks.py --merge-audit`** (fixture `merge-audit-slice.json`,
`--merge-audit-selftest`, wired into `pellet-selftest.sh` as its 16th arm) — the instrument behind
`docs/probe-runs.md` §8. It scores the over-span census against **both** denominators side by side
(so the `max_pellet_frames` category error is visible rather than repeated), the ammo-arbiter
excess-lost count, and six candidate segmentation rules on MISSED / unexplained-SPURIOUS /
`avgTotal`. **`debounce_shots` is UNTOUCHED in both implementations**: every candidate is a local
scoring variant inside the audit, and a **shipped-identity control** asserts the local span rebuild
reproduces `count-pellets.py`'s `debounce_shots` event for event before anything is scored — it runs
in the selftest and again before every live run. No pre-existing fixture's `_expected` moved.
Re-run verbatim: `docs/probe-runs.md` §8J (⚑ two invocations, pooling different sets on purpose).

## 7. Open, in priority order

**The top item is now #1, the science — because the instrument's biggest advertised lever turned out
not to exist.** Localization was item 1 one commit ago on a +14.3 to +17.1 pp estimate; that estimate
is REFUTED (`docs/probe-runs.md` §6) and what remains of it is a small, explicitly not-recommended
build, so it drops to the bottom of the instrument items.

1. **The remainder of the cold bias — still the headline question, and it is OPEN with NO measured
   explanation.** Cluster-merge in `debounce_shots` was the live candidate; it is now **measured,
   small, and missing-shot-channel only** (`docs/probe-runs.md` §8). Against the cadence period the
   prevalence is **31 of 815 events (3.8%)**, not the 31.3% the `frames > max_pellet_frames` framing
   gave — `max_pellet_frames` is a **per-blob track-lifetime cap** and the comparison was a category
   error. By the ammo arbiter the merge costs ~**20 shots pooled = 2.6%**, roughly **one third** of
   the arbiter-visible missing-shot channel. The three named `guilty` entries and their swallowed
   shots stand exactly as recorded; only the size changed.

   ⚑ **REFUTED as the cold bias.** Both minimal fixes read **bit-identical to shipped on all 5
   owner-labelled `marciana` (SG/Iron) shots** in `groundtruth-f8-11.json`, and every merge fix moves
   pooled `avgTotal` by ≤ 0.007 against a **1.08 pellets/shot** deficit — two of the variants in the
   wrong direction. ⚑ And **the fourth `guilty` miss (f1787) is still NOT explained** — peak T = 8, on
   a fully-measured lock, at post-reload crosshair re-acquisition; mechanism unknown.

   **The new lead is the REPRESENTATIVE-FRAME POLICY**, which is upstream of segmentation and
   unaffected by it: `debounce_shots` copies each event's count from ONE frame, the active frame
   nearest the **median** of the event's active frames, and sums nothing. On the 5 owner-labelled
   shots median reads **−1.40 COLD**, max-of-event **+4.20 HOT**. ⚑ **HYPOTHESIS, n = 5, post-hoc — no
   policy is proposed.** The way to settle it is a **REUSE path needing no new labels**:
   `real-fidelity-slice.json` + the `groundtruth-f8-11` crops (`docs/probe-runs.md` §8G).

   ⚑ Note that §6 CLOSED two would-be candidates rather than opening any: stale locks bound at ~0.2
   pellets/10 **with the wrong sign** (excluding them makes counts colder), and recovering them would
   surface ≲5 extra shot events out of 815. The `guilty` window corroborates that stale locks are not
   the miss mechanism: **3 of its 4 missed shots sit on FULLY-MEASURED locks**, and stale share during
   the three firing spans is 1.4% (6/420) against 24.5% window-wide.

   **⚠ Blast radius, and why a `debounce_shots` change stays OWNER-GATED.** Two minimal fixes are
   costed in §8F — `cap_cadence` (~3 LOC) and `resplit` (~10 LOC) — and both cut pooled MISSED from
   **7.0% to 4.2–4.5%** while beating shipped on the `guilty` hand window. But changing
   `debounce_shots` moves every detected shot in every dump: **3 committed fixtures FAIL and need
   regeneration** (`missing-shots-slice.json`, `hand-count-slice.json`, `stale-counting-slice.json`;
   5 pass unaffected), and **`read-pellets.ts:627` is a second implementation that must change in
   lockstep**. It is not a change for the session that discovers it — and it buys a missing-shot
   improvement, **not** a cold-bias fix.

2. **The generator's radial envelope — now the top INSTRUMENT item.** It places every label strictly
   inside the counting window (884 labels, r=42.0–157.1) while ~10% of real marks fall outside. **No
   synthetic measurement can see that**, so every generator-derived fidelity number inherits the gap —
   which is why this outranks the read-rate levers now that the big one is gone.
3. **60 fps localization instability — still OPEN, and ⚑ it is NOT the same issue as stale locks.**
   `run21`/`run21b` (901 / 721 frames) lock zero frames; gate 1 is a whole-video conjunction and
   cannot see it. It was filed as "one root cause wearing two faces" with the stale-lock hole — that
   bundling is **wrong**: both dumps are TEMPLATE-mode (`cross_confs` populated on 100% of frames, band
   0.356–0.467, medians 0.41/0.42) with `cross_positions` **None on every single frame**, i.e. no
   frame ever cleared `--relock-conf-min 0.55`. The stale/held mechanism is structural-mode and
   requires `conf is None`, which never occurs in these dumps. **Open question to carry:** these
   windows have never been re-extracted under `--locate structural`, so it is unknown whether the
   instability survives at all in the mode the reader actually ships. Re-extract before designing a
   fix.
4. **Optional and NOT recommended: a `locate_badge_structural` second tier.** ⚑ ESTIMATE ~270 LOC and
   a 4–6 h session (150 tier + 40 wiring/signalling + 80 plus JSON fixture, plus 2–4 h re-extraction)
   for **≤+1.6 pp** read rate — on frames whose semantic value is "reloading", not a magazine level,
   with a measured risk of locking onto damage popups. Recorded so it is not re-derived; **do not
   build it on these numbers.**
5. Phase 2 steps 4–6, still blocked on the owner's Decision 1; the remaining `/logic-gate` pre-op
   revisions (kimi #1/#2/#3/#9/#10, fable #4).

## 8. Method note for the next judge

Three plans this session used a **pre-committed decision rule written to disk before the measurement
ran**, and it worked every time — twice the result contradicted the driver's stated expectation and
the pre-commitment is why that was visible rather than negotiable. Two of those runs also had the
subagent **derive the sign convention / premise independently before computing**, which caught a
fixture-mode error the plan itself had got wrong. Keep both habits.
