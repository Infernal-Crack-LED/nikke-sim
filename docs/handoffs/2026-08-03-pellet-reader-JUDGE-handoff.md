# Pellet reader — judge handoff after the representative-frame audit

> AI-facing. Written at the end of a long session, for the judge session that follows.
> Supersedes nothing; it **CONTINUES**
> [`2026-08-02-pellet-reader-JUDGE-handoff.md`](2026-08-02-pellet-reader-JUDGE-handoff.md), which in
> turn continues
> [`2026-08-01-pellet-cascade-JUDGE-handoff.md`](2026-08-01-pellet-cascade-JUDGE-handoff.md). **The
> graveyards in all three are live and binding. Read them before proposing anything.**
>
> **Slugs:** `marciana` (SG/Iron — `docs/probes/clean-weapons/marciana-solo.MP4`; **not**
> `marciana-marine-study`, AR/Iron), `noir`, `guilty`, `isabel`. All SG, `ammo: 9`.

---

## 0. The one-paragraph state

The counter reads **0.8–1.6 pellets/10 cold** against a ±0.25 budget, and after this session that gap
finally has a **mechanism**, at **STRONG MECHANISTIC** tier: `debounce_shots` copies each event's
count from ONE representative frame, and that frame **lands in the muzzle-flash phase, not on the
pellet cohort**, on **3 of the 5 owner-labelled `marciana` (SG/Iron) shots**. Everything else that was
a live candidate was closed this session. The owner ask is ANSWERED — 36 shots / 4 complete 9-round
magazines in the `isabel` window — and the ammo arbiter reproduces it exactly, so the arbiter is now
gate-validated on **three of four units** (`marciana`, `isabel`, `guilty`; only `noir` lacks ground
truth). The read-rate levers are gone: the atlas harvest is REFUTED **before it was built** and
stale-lock localization is REFUTED at **10–70× smaller** than its own estimate. Cluster-merge in
`debounce_shots` is real but **~8× smaller than first recorded** and is **not** the cold bias.

⚑ **The load-bearing premise correction of the session, and it propagates:** the owner's labelled
pellet count is **NOT a per-shot landed total** — it is a count of markers visible in the **f8–11
window**, identical on all four frames of every shot. So **"landed pellets per shot = 8.4", and the
8–16% missing-shot threshold derived from it, are WINDOW-CONDITIONAL**. Any argument that quotes 8.4
as "how many pellets a shot lands" is quoting a different quantity than it thinks.

The representative-frame verdict does **not** rest on the n=5 mean — that is exactly the trap that
sank p75. It rests on (a) the two-phase event structure and (b) a **label-free** result: in-event
track-lifetime histograms are **bimodal on all four units across 815+ events**, and on the labelled
set owner pellets have lives **8–19** (n=42, min 8) while **146 of 148** non-owner blobs have life
**≤ 7** — **zero overlap in the 8–13 band**. **The discriminator is TRACK LIFETIME, not frame
magnitude.**

## 1. What was settled this session — all recorded in `docs/probe-runs.md`

| #   | Question                                                         | Outcome                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | How many shots in the owner's `isabel` window? (§4)              | **36 shots / 4 complete 9-round magazines**, 30.205–60.205 s of `isabel solo sg.MP4`. The arbiter reproduces it **exactly** — 32 visible decrements + 4 counter-invisible magazine-emptying rounds. The admissibility ("flip") rule is **CONFIRMED by an independent method**: all 11 raw `ammo: 0` reads clip-wide sit inside an 8-run, so the counter never credibly displays 0. **The 3.4× raw-vs-admissible swing is RESOLVED in favour of the admissible ~4.4%; the raw 14.7% is an artifact.**                                                                                                                                                                                                                                                                  |
| 2   | Are the in-reload extra detections `isabel`'s S2 rockets? (§4.4) | **NO — the owner hypothesis is refuted as the explanation.** S2 "Pointed Feather" is real and already modelled (`interval: 15`, measured ~14.7 s, ~12×/180 s), but across all 5721 frames the extra detections are **phase-locked to +16–18 frames after each magazine's emptying round** (6 of 7 inside a 0.07 s spread over four minutes), 6 distinct events in 190.7 s, **median spacing 22.7 s, sd ≈ 16 s — not periodic**. The "median gap 14.48 s" was a coincidence of an irregular set (gaps include 0.67 s and 39.63 s).                                                                                                                                                                                                                                     |
| 3   | Is the ammo read rate atlas-limited? (§5)                        | **NO — REFUTED BEFORE IT WAS BUILT.** 24,319 frames / 7 series: **80.7% of abstentions are SEGMENTATION**, and **97.0%** of the largest bucket (`no-digits`) falls on stale-lock frames. GLYPH-MATCH is **12.2%**, and **95% of those are white** — floating battle-damage popups the structural locator mistook for the counter. ⚑ **The atlas was NEVER white-only: 141 glyphs = 69 white + 72 red**, and since every magazine is 9 the counter only ever renders red on digits 0–4 — exactly what the 72 cover; red already reads **33–52%** on every video. Ceiling **+4.8 pp nominal / +0.21 pp honest** against ~7.7 h of labelling and a permanent **~7× match cost**.                                                                                         |
| 4   | Is stale-lock localization worth +14.3 to +17.1 pp? (§6)         | **NO — wrong by 10–70×.** **70.2% of the 4,707 stale frames are reload frames where the game renders NO DIGITS AT ALL** (badge crisp and localizable, cells empty); 14.5% end-of-fight HUD-gone, 14.6% transients, 0.7% intro. Oracle ceiling **+0.18 pp demonstrated / +1.33 pp optimistic**, with a control arm (99.2% decode, 2215/2216 identical) validating the oracle before use. **Gate relaxation is strictly WORSE than holding** — end-of-run error 27.8 px → 254.9 px, it grabs damage popups. **There is ONE lock, not two:** `cross_positions − cross_rawloc` = (162, −12) or (162, −13) in **100% of frames in all 7 dumps**. Downstream the stale channel bounds at **~0.2 pellets/10 and with the WRONG SIGN** (excluding stale makes counts colder). |
| 5   | Does the per-event miss rate replicate? (§7)                     | **YES, and it is the real quantity.** `guilty solo sg.MP4` 42.8–62.8 s = **23 shots** as magazine segments 9/9/5, 2 reloads, ending 4 of 9; both arms reproduce 23 exactly (21 visible decrements + 2 invisible) and the reconstructed level at frame 1884 = **4**, an independent anchor. Per-event miss: `isabel` **16.7%** / `guilty` **17.4%** — **within 0.7 pp** — while the aggregates differ **2.3×** (5.6% vs 13.0%).                                                                                                                                                                                                                                                                                                                                        |
| 6   | How big is cluster-merge, and is it the cold bias? (§8)          | **Real, ~8× smaller than first recorded, and NOT the cold bias.** Against the **cadence period** it is **31 of 815 (3.8%)**, costing **~20 shots pooled (2.6%)** — roughly **one third of the arbiter-visible missing-shot channel**. The 5 owner-labelled shots are **bit-identical** under shipped, `cap_cadence` and `resplit` (all read 7.00 vs owner 8.40); pooled `avgTotal` moves **−0.003 to −0.007** against a **1.08** deficit, and the best variants move it **colder**.                                                                                                                                                                                                                                                                                   |
| 7   | Is the representative-frame policy the cold bias? (§9)           | **It is mechanically WRONG — tier STRONG MECHANISTIC.** A 4–6 frame blast/flash phase (blobs live 1–3 frames) precedes the pellet cohort, and the median-representative samples the mixture, landing in the **pre-cohort flash phase on 3 of 5 labelled shots**. **Of the 35 pellets the reader reports across those 5 shots, only 12 are owner pellets** — the 7.00-vs-8.40 near-miss is **coincidental cancellation of a large under-count against a large over-count**. **Coexistence is REFUTED** (all countable owner pellets ARE simultaneously visible in one frame on every shot; cohorts hold a flat plateau for 8–10 frames).                                                                                                                               |

## 2. Provenance ledger — which numbers carry which weight

| Figure                                                        | Weight                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isabel` **36 shots / 4 magazines**                           | **Owner ground truth**, and the arbiter reproduces it exactly. Gate-validation now covers `marciana` (SG/Iron), `isabel` and `guilty`; **`noir` alone has no ground truth.**                                                                                                                                         |
| The admissibility ("flip") rule                               | **CONFIRMED by an independent method** — all 11 raw `ammo: 0` reads clip-wide sit inside an 8-run. This is what closes the 3.4× swing; it is not an assumption any more.                                                                                                                                             |
| Reload echo **phase-locked +16–18 frames**                    | **Strong, whole-clip (5721 frames), and it REFUTES the rocket reading.** 6 of 7 inside a 0.07 s spread over four minutes. What the echo actually IS remains unnamed — it is currently counted as a detected shot carrying ~0 pellets, inflating detections and deflating the per-shot average at once.               |
| Abstention census **80.7% / 12.2% / 7.1%**                    | **Strong.** 24,319 frames, 7 series, committed instrument (`--ammo-abstention`) with a pinning fixture. Kills the atlas route outright.                                                                                                                                                                              |
| Oracle ceiling **+0.18 pp / +1.33 pp**                        | **Strong, and control-validated before use** (99.2% decode, 2215/2216 identical). Supersedes the +14.3 to +17.1 pp estimate by 10–70×.                                                                                                                                                                               |
| Per-event miss **16.7% / 17.4%**                              | **MEDIUM — n=2 windows, 2 units, below the n ≥ 5 board standard.** ⚑ Both readings inherit the `--hand-count` matcher's upper-bound defect (see traps 2 and the row below).                                                                                                                                          |
| ⚑ `--hand-count`'s `detected_weapon_attributable`             | **NOT authoritative — an UPPER BOUND.** The matcher credits **ANY** in-reload onset as the magazine-emptying round, so it cannot distinguish f1446 (the real emptying shot) from f1456 (a false positive on a 7-of-7 stale run). **Both hand-count runs inherit this.**                                              |
| Cluster-merge **31 of 815 (3.8%) / ~20 shots (2.6%)**         | **Strong on size, and the refutation is decisive** — it reused an existing fixture rather than deriving new ground truth. ⚑ Its predecessor figure, "255 of 815 (31.3%)", was a **category error** (see trap 1).                                                                                                     |
| ⚑ `cap_cadence`'s reported **35 / 9 / −0.003**                | **DID NOT REPRODUCE.** The literal 0.9× semantics robustly gives **37 / 11 / −0.019**; only a **1.0×** cap reaches 35. The multiplier was NOT fitted. Do not read `cap_cadence = 35` as a re-runnable measurement — both fixes still cut pooled MISSED from 7.0% to **4.2% / 4.5%**, so nothing above depends on it. |
| ⚑ Owner labelled count / **landed pellets per shot 8.4**      | **WINDOW-CONDITIONAL, and this propagates.** It counts markers visible in the **f8–11 window**, identical on all four frames of every shot — **not** a per-shot landed total. The 8–16% missing-shot threshold derives from it and inherits the conditioning.                                                        |
| Track lifetime as the discriminator                           | **Strong, and it REPLICATES WITHOUT LABELS.** Labelled: owner pellets n=42, lives **8–19** (min 8); non-owner n=148, **146 of 148** at life **≤ 7** — **zero overlap in the 8–13 band**. Label-free: bimodal in-event lifetime histograms on **all four units across 815+ events**.                                  |
| **Peak / p75 as a representative policy**                     | **ARTIFACT — refuted.** 89% of peak-frame blobs are unmatched, 4 of 5 peaks are 100% unmatched, and `max` puts **504/852 events (59%) above the physical ceiling of 10** (`hitsPerShot: 10`, confirmed in `data/characters.json` for all four units). The median's stated rationale HOLDS; p75 falls with the peak.  |
| The **7.00 vs 8.40** near-miss                                | **COINCIDENTAL.** Only 12 of the 35 reported pellets across the 5 labelled shots are owner pellets — a large under-count cancelling a large over-count. Never quote the near-miss as evidence the policy is roughly right.                                                                                           |
| Detection / area / circularity filters                        | **Eliminated — they cost ZERO** (100% both-pass at offsets 8/9/10). The `valid` clamp biases **WARM (+0.24)**, not cold; its upper bound is physically motivated, its lower bound is not.                                                                                                                            |
| Counter cold bias **0.8–1.6 pellets/10 (≈1.08 pellets/shot)** | **The problem statement. For the first time it has a named mechanism at STRONG MECHANISTIC tier** — the representative-frame policy — and a settle path needing no owner time.                                                                                                                                       |

## 3. The single most important thing to carry forward

**THE EVENT IS TWO-PHASE, AND EVERY FRAME-INDEXED CLAIM IN THIS THREAD IS CONDITIONED ON WHICH PHASE
IT LANDED IN.** A blast/flash phase of 4–6 frames (blobs live 1–3 frames) comes first, then the pellet
cohort, which holds a flat plateau for 8–10 frames. The shipped policy samples the mixture and takes
the flash on most shots.

Three consequences, all load-bearing:

1. **The owner's labels are a WINDOW count, not a shot total** (§0). "8.4 landed pellets per shot" and
   the 8–16% threshold derived from it are window-conditional. Re-check any argument that leans on
   them.
2. ⚑ **The blast produces TWO detector onsets** (flash, then cohort), and `find_t0` picks whichever is
   nearest the owner's index — so the fixture's `t0` is the **flash** onset on shots 2/4/5 and the
   **cohort** onset on 1/3. **The f8–11 window is NOT anchored to the same physical event across
   shots.** Two "f9" frames in that fixture are not the same thing.
3. **Judge a candidate policy by WHICH FRAME it selects, never by the mean it produces.** Mean-matching
   is what promoted p75, and p75 is refuted.

⇒ **The settle path costs no owner time and needs no new labels:** score any candidate rule on **which
frame it selects — pre-cohort flash vs plateau — against the 5 labelled events.** That is a
**categorical** check with an unambiguous right answer per shot, immune to the mean-matching trap. A
second free check comes with it: **any rule putting >10 on more than a few percent of 815 events is
over-counting by construction** (`hitsPerShot: 10` is the physical ceiling).

This also inherits, unchanged, the previous handoff's §3 warning: **shot detection is DOWNSTREAM of
the crosshair lock**, so any measurement conditioned on "detected shots" is conditioned on lock
quality. Held-lock signalling (`8ecad5a7`) only lets you SEE which frames are affected; it does not
make a held position real.

## 4. Graveyard — this session's additions. DO NOT RESURRECT.

The two prior handoffs hold nine more. These are new, and **every one of them was refuted by the
driver's own follow-up work inside the same session.**

| Hypothesis                                                                      | Why it looked right                                                                                                                   | What killed it                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **"A per-video red-digit atlas harvest will lift the read rate"**               | GLYPH-MATCH abstentions are visible on every video and red digits read only 33–52%, so the atlas looked thin                          | The abstention census: the atlas is **12.2%** of abstentions and **95% of those are white** (damage popups misread as the counter). And the premise was FALSE — the atlas was **never white-only**: 141 glyphs = 69 white + **72 red**, complete at digits 0–4                                                    |
| **"Stale-lock localization is worth +14.3 to +17.1 pp"**                        | Stale frames are 5.2–31.0% of frames and are exactly where reads are missing, so recovering the lock looked like recovering the reads | **70.2% of stale frames render NO DIGITS AT ALL** — they are reload frames; the badge is crisp and localizable and the cells are empty. Oracle ceiling **+0.18 pp / +1.33 pp**, and gate relaxation is strictly WORSE (27.8 px → 254.9 px)                                                                        |
| **"The 60 fps instability and the stale locks are one root cause"**             | Both present as "the reader loses the crosshair", and both windows are unusable                                                       | The dumps' own fields: `run21`/`run21b` are **template-mode** with `cross_confs` populated on 100% of frames and `cross_positions` None on 100%; the held-lock mechanism requires `conf is None`, which **never occurs** there                                                                                    |
| **"Cluster-merge affects 31.3% of detections"**                                 | 255 of 815 events have `frames > max_pellet_frames`, and `max_pellet_frames` reads like an event-span budget                          | **Category error** — `max_pellet_frames` is a **per-blob track-lifetime cap** and `debounce_shots` never reads it. Against the **cadence period** the real figure is **31 of 815 (3.8%)**, ~8× smaller                                                                                                            |
| **"A merged event drops a shot AND its pellets, so the sign is unguessable"**   | If one event stands for two shots, both counts should be lost                                                                         | False: `debounce_shots` copies **ONE representative frame** and **sums nothing**, so a merge loses the shot, not the pellets                                                                                                                                                                                      |
| **"Pellets may not coexist in any single frame"** (the motivation for peak/p75) | The reader never sees 8–9 at once on the median frame, so staggered arrival was the natural read                                      | **All countable owner pellets ARE simultaneously visible in one frame on every shot**; the cohort holds a flat plateau for 8–10 frames. Coexistence REFUTED                                                                                                                                                       |
| **`candA` — the peak-detector segmentation rule**                               | It won on the `guilty` window it was tuned on                                                                                         | Pooled MISSED 7.0% → **14.5%** — it doubles the quantity it was proposed to reduce — worse on **7 of 8 series**, and it detects **32 vs a hand count of 36** on `isabel`. Root defect: **no minimum-duration guard**, so it fires on a one-frame VFX spike and refracts over the real shot. **DO NOT RE-PROPOSE** |
| **p75 as the representative frame**                                             | It split the difference between a cold median and a hot max and matched the labelled mean best                                        | It was a **fitted number picked after seeing the other two**, on n=5 from one clip — and it falls with the peak, which is 89%-unmatched artifact                                                                                                                                                                  |

**The pattern, and it is the method note:** every one of these was killed by an **INDEPENDENT arm or a
fixture that already existed** — never by more of the same derivation.

## 5. Traps

1. ⚑ **`max_pellet_frames` is a PER-BLOB TRACK-LIFETIME cap, NOT an event-span budget — never compare
   it to an event's `frames`.** It is read in `temporal_filter` / `build_tracks_and_counts` to decide
   which TRACKS count as pellets; **`debounce_shots` never reads it.** This one trap cost a whole
   framing (the "31.3%" headline, ~8× too large).
2. ⚑ **`--hand-count`'s matcher credits ANY in-reload onset as the magazine-emptying round**, so it
   cannot separate the real emptying shot from a false positive in the same reload window (f1446 vs
   f1456). **`detected_weapon_attributable` is an UPPER BOUND**, and **both** hand-count runs inherit
   it. Do not quote it as ground truth.
3. ⚑ **`debounce_shots` exists TWICE** — in `count-pellets.py` and again at **`read-pellets.ts:627`** —
   as two independent implementations, not a shared module. Any segmentation change must land in
   **both**, in lockstep. And ⚑ they may **already be one event apart** on `h4-marciana` (`validShots`
   177 vs shipped 176); verify lockstep on the dump you are using.
4. ⚑ **A git worktree runs NO pre-commit hooks.** `core.hooksPath=.husky/_`, and `.husky/_` is husky's
   **gitignored generated** directory, created by `npm install` in the main repo and **never present in
   a worktree**. So **every commit in any `nikke-sim-wt-*` worktree silently bypasses lint-staged and
   `npm run typecheck`.** Run `npx prettier --write` on every file you touch and `npm run typecheck`
   **manually** before committing. (Verified clean as of HEAD — keep it that way.)
5. ⚑ **In an ammo series, `reads[k].conf` is the CROSSHAIR LOCK confidence, not digit-match quality.**
   It is byte-identical to the source `tracks.json.cross_confs`. **Digit quality lives in
   `reads[k].scores`** — three per-cell template scores, because the counter renders as **3 cells with
   leading zeros** ("008"). Any `conf`-based split is a LOCK/SURROUND measure, never an OCR-quality
   partition.
6. **`cmd | tail; echo $?` reports TAIL's exit status.** Several false green readings in this thread
   now. Always take the TRUE exit status with no pipe in the path.
7. **Read the CLEAN crops** (`groundtruth-f8-11/`), never `groundtruth-f8-11-annotated/`.
8. ⚑ **The fixture's `t0` is not the same physical event across shots** — `find_t0` picks whichever of
   the blast's TWO onsets is nearest the owner's index (flash on shots 2/4/5, cohort on 1/3). Do not
   treat "offset 9" as a fixed phase.
9. **Fixture shot 4 records `locate: "template"`, not `structural`** — and its entire **−5 residual is
   that documented structural mislock**; under the template lock it gives 7 countable, coexisting 8
   frames. Using structural for it silently measures a different crop's centre.
10. **`f8-11` is a 60 fps definition and does not transfer by index** to 30 fps dumps.
11. **Two confidence scales.** Structural dumps score ~91–95 with `None` for a held lock; template
    dumps score 0–1. A `conf < 0.6` test is meaningful ONLY in template mode.
12. **NEVER `git restore` / `checkout --` / `reset --hard`**, and **do not `rm -rf` in the worktree** —
    a safety hook blocks it, correctly. `scratchpad/pellets/_centering_tmp/` holds ~2.1 GB; leave it.
13. **Prefer SYNCHRONOUS subagents and commit per item**; **headless sessions never background a shell
    command** — foreground with an explicit timeout.

## 6. Landed state

**Branch `fix/pellet-reader`. Nothing pushed this session; `main` is deliberately held.** Do not trust
a commit count written into this file — read it live:
`git rev-list --count origin/fix/pellet-reader..HEAD`.

Commits this session, oldest first:

| SHA        | What                                                                  |
| ---------- | --------------------------------------------------------------------- |
| `326a8459` | `--hand-count` + fixture                                              |
| `360f7ac8` | `docs/probe-runs.md` §4 + the hand-count headline fix                 |
| `c47ca357` | magazine-emptying-round counting fix                                  |
| `eaf0712e` | `--ammo-abstention`                                                   |
| `0dff37f3` | `docs/probe-runs.md` §5 (the abstention census / atlas refutation)    |
| `0b19af20` | read the unpushed count live, not from a frozen number                |
| `8ecad5a7` | **held-lock signalling** + the oracle ceiling                         |
| `cb5b83f9` | `docs/probe-runs.md` §6 + the stale-lock refutation                   |
| `5a0abb56` | `docs/probe-runs.md` §7 (the second hand count)                       |
| `3431e0a5` | `--merge-audit`                                                       |
| `d085eb60` | `docs/probe-runs.md` §8 (cluster-merge re-sized, refuted as the bias) |
| `d74a13a5` | `--representative-audit` + `docs/probe-runs.md` §9                    |

**Gates: `bash scripts/probe/pellet-selftest.sh` → 17 arms, exit 0. `bash scripts/verify.sh` → exit 0.**
(Both taken as TRUE exit statuses — see trap 6.)

**Five instruments landed this session, each with a committed self-validating fixture:**
`--hand-count`, `--ammo-abstention`, `--ammo-oracle-ceiling`, `--merge-audit`,
`--representative-audit` — all on `scripts/probe/analyze-pellet-tracks.py`, all wired into
`scripts/probe/pellet-selftest.sh`.

**Held-lock signalling (`8ecad5a7`) is the session's only behaviour-touching change, and detection is
UNCHANGED:** `locate_crosshair_structural` returns `(center, score, held)`, both dump formats carry a
per-frame `cross_held`, `held-lock` is its own abstention class, and `stale_mask()` prefers
`cross_held` with a fallback to the inferred rule — so **no fixture needed regeneration**.

**`/patch-notes` is owed before anything reaches `main`.**

## 7. Open, in priority order

1. **THE REPRESENTATIVE-FRAME POLICY — the live lead on the cold bias, and the top item.** Tier
   **STRONG MECHANISTIC**, resting on the two-phase event structure plus the label-free bimodal
   lifetime result — **not** on the n=5 mean. **The discriminator is TRACK LIFETIME** (owner pellets
   life 8–19; 146 of 148 non-owner blobs ≤ 7; zero overlap in the 8–13 band). **Settle it with the
   categorical check** — score which FRAME a candidate rule selects (pre-cohort flash vs plateau)
   against the 5 labelled events, plus the free >10-per-event ceiling check. **No new labels, no owner
   time.** ⚑ Carry the premise correction with it: the owner labels are a **window** count.
2. **`debounce_shots` minimal fix — ⛔ OWNER-GATED.** `cap_cadence` (~3 LOC) and `resplit` (~10 LOC)
   both beat shipped on every arm, pooled MISSED **7.0% → 4.2% / 4.5%**. It buys a **missing-shot**
   improvement, **not** a cold-bias fix. Gated because **3 fixtures regenerate** and
   **`read-pellets.ts:627` is a second implementation that must change in lockstep**. ⚑ Do not read
   `cap_cadence = 35` as reproducible (see the ledger). ⛔ `candA` is REFUTED — do not re-propose.
3. **60 fps localization instability — a DIFFERENT fault, still OPEN.** `run21`/`run21b` are
   template-mode with `cross_confs` on 100% of frames (0.357–0.467) and `cross_positions` None on
   100%; the held-lock mechanism needs `conf is None`, which never occurs there. **These far-band
   windows have never been re-extracted under `--locate structural`** — re-extract before designing
   any fix.
4. **The worktree hook gap** (trap 4). **The fix belongs at worktree creation**, not in a per-session
   habit — every `nikke-sim-wt-*` commit currently bypasses lint-staged and typecheck.
5. ⚑ **The f1787 miss on `guilty` — mechanism UNKNOWN.** Not explained by cluster-merge: peak T = 8,
   post-reload lock re-acquisition, on a **measured** lock. n=1 event. Do not manufacture a cause.
6. ⚑ **A pre-existing Python/TypeScript one-event divergence on `h4-marciana`** (`validShots` 177 vs
   shipped 176) — **the lockstep invariant may ALREADY be off.** Verify it on the dump you use.
7. ⚑ **Does any marker fade before t0+8?** Needs owner labels at the plateau frame (owner time). The
   "never detected = 0" row is conditional on the f8–11 window.
8. **The generator's radial envelope; Phase 2 steps 4–6.** The envelope places every label strictly
   inside the counting window while ~10% of real marks fall outside, so every generator-derived
   fidelity number inherits the gap. Phase 2 steps 4–6 remain blocked on the owner's Decision 1 and the
   outstanding `/logic-gate` pre-op revisions.

## 8. Method note for the next judge

**Six of this session's own confident claims were refuted inside the same session — and in every case
the killer was an INDEPENDENT arm or a fixture that already existed, never more of the same
derivation.** The atlas died to a census, the localization lever to an oracle with a control arm, the
"one root cause" bundling to the dumps' own fields, the 31.3% to reading what `max_pellet_frames`
actually is, and coexistence to looking at a single frame. The cluster-merge refutation cost almost
nothing because it **reused the 5 owner-labelled shots** instead of asking for new ones.

⇒ Two habits to keep, both cheap: **before reasoning from an artifact, verify what the artifact IS**
(the labels are a window count; `max_pellet_frames` is a track cap; `conf` is a lock score), and
**prefer a categorical decision rule over a mean-matching one** — p75 passed the mean test and was
still artifact.
