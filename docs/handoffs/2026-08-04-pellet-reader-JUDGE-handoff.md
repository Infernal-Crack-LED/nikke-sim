# Pellet reader — judge handoff after the representative-frame LANDING

> AI-facing. Written at the end of a long session, for the judge session that follows.
> Supersedes nothing; it **CONTINUES**
> [`2026-08-03-pellet-reader-JUDGE-handoff.md`](2026-08-03-pellet-reader-JUDGE-handoff.md), which
> continues [`2026-08-02-pellet-reader-JUDGE-handoff.md`](2026-08-02-pellet-reader-JUDGE-handoff.md),
> which continues
> [`2026-08-01-pellet-cascade-JUDGE-handoff.md`](2026-08-01-pellet-cascade-JUDGE-handoff.md). **The
> graveyards in all four are live and binding. Read them before proposing anything.**
>
> **Slugs:** `marciana` (SG/Iron — `docs/probes/clean-weapons/marciana-solo.MP4`; **not**
> `marciana-marine-study`, AR/Iron), `noir`, `guilty`, `isabel`. All SG, `ammo: 9`,
> `hitsPerShot: 10`.

---

## 0. The one-paragraph state

**The representative-frame policy is FIXED AND LANDED** — the fallback hybrid on `plateau_median`, in
**both** `count-pellets.py` and `read-pellets.ts`, gates green, owner-authorised. That was the top
open item for two sessions and it is closed as a mechanism: the reader no longer samples the muzzle
flash, scoring **5/5** on the categorical plateau check against shipped's 2/5.

⚑ **And it made the counter COLDER, not closer.** Pooled `avgTotal` went **7.07 → 6.16**. This was a
**FAITHFULNESS fix, not a cold-bias fix** — shipped's 7.07 was §9B's _cancellation_ (only 12 of 35
reported pellets were owner pellets), so removing the flash inflation legitimately reads lower.
**Nobody may quote this landing as progress on the cold bias.** The bias is **OPEN**, and after this
session it has a different top candidate: **the lifetime CAP is discarding real pellets it has already
detected.**

Separately, §8H's long-standing "the two implementations may already be one event apart" worry is
**resolved and was misdiagnosed**: segmentation is in perfect lockstep, and the `h4-marciana`
177-vs-176 delta is a **marker-channel defect in the shipped TypeScript** (§11).

## 1. What was settled this session — all recorded in `docs/probe-runs.md`

| #   | Question                                                       | Outcome                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Is there a rule that lands in the cohort, not the flash? (§10) | **YES — two, both 5/5.** `lifetime_gated_median` and `plateau_median` land inside the plateau on all 5 labelled shots against shipped's **2/5**, at ceilings of **0.7%** / **1.1%** against shipped's 6.2%. Judged **categorically** (which FRAME is selected), never by a mean — the pre-committed rule in `2026-08-04-representative-frame-PRECOMMIT.md` forbids mean-ranking outright.                                             |
| 2   | Is either bare rule landable? (PROPOSAL §2)                    | **NO.** Both **ABSTAIN on 112/852 events (13.1%)** — no lifetime-band track in radius — and `debounce_shots` **has no abstain path**; it must emit one shot per event. A bare swap would either drop those events (a new missing-shot channel) or need a fallback. ⇒ the **fallback hybrid** is what was proposed and approved.                                                                                                       |
| 3   | Does the hybrid meet its pre-committed criteria? (§12)         | **YES, all six.** Categorical **5/5**; ceiling **1.8%** over the full **852** with **`no_rep` = 0**; pooled MISSED **58 / 7.0% UNCHANGED**; falsification control held on all 112 fallback events; lockstep held; `avgTotal` reported-only.                                                                                                                                                                                           |
| 4   | Did it land cleanly in both readers? (§13)                     | **YES.** Equivalence of the new production `band` channel against the audit arm's independent `_ps_band_totals`: **0 mismatches over 24,685 frames + both labelled crops**. Production `avgTotal` **6.1561**, an **exact match** to §12's scoring-variant figure. Exactly **one** pre-existing pin moved. `pellet-selftest.sh` 19 arms exit 0; `verify.sh` exit 0.                                                                    |
| 5   | Is the `h4-marciana` 177-vs-176 a lockstep break? (§11)        | **NO, and §8H's diagnosis was wrong twice.** Segmentation is IDENTICAL (`totalShots` **218** both, all 218 events agreeing on span/frames/white), and the two implementations are **byte-identical in logic** including the strict `<` — there is no median tie-break to find. **`white` and `red` are byte-identical on all 5697 frames; only `marker` differs, on 82.**                                                             |
| 6   | What causes the marker divergence? (§11E)                      | **`read-pellets.ts:599` ranks backends on `white + red` ALONE and carries `marker` as a passenger**, so `Array.reduce`'s strict `<` **resolves ties to ARRAY ORDER** (numpy) and discards opencv's hit-markers. Unanimous **82/82**: all backends tie on `white+red`; marker seen by opencv only; dump marker == opencv's. Cross-dump (§11I): fires on **7 of 8 dumps, 756 frames**, but only **ONE** ever flips an event's validity. |

## 2. Provenance ledger — which numbers carry which weight

| Figure                                                   | Weight                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Categorical **5/5** for both band rules                  | **Strong.** Scored on a plateau definition **anchored to §9C's already-recorded shipped verdict before it was committed** (it reproduces shipped = 2/5, IN on 1 and 5). Not fitted. **4 of the 5 shots are on the uncontested structural crop** — the verdict does not hinge on shot 4. |
| The hybrid's ceiling **1.8% over 852**, `no_rep` **0**   | **Strong.** Decomposes exactly: 740 banded (== bare `plateau_median`) + 112 fallback (== bit-identical shipped), asserted in code both per-event and pooled.                                                                                                                            |
| MISSED **58 / 7.0% unchanged**                           | **Strong, and TRUE BY CONSTRUCTION.** `match_shots` keys on event **onsets** (`detected_t0 = [s["start"] …]`), never on totals, so a representative-frame change cannot move it. Also reproduced empirically.                                                                           |
| Production/audit **equivalence, 0 mismatches**           | **Strong.** A re-implementation on a **different data path** reproducing the audit arm exactly, over 24,685 frames. `avgTotal` **6.1561** matches §12 to 4 dp.                                                                                                                          |
| Lockstep on a **COMMON input**                           | **Strong, judge-verified independently** — both readers give 218 / 177 / 7.2 / 0.15 on the same band-less `frame_counts`. ⚑ This also re-confirms §11: the shipped 176 was purely the marker channel.                                                                                   |
| §11's mechanism, **82/82 unanimous**                     | **Strong**, committed instrument (`--backend-marker-audit`) with a pinning fixture. ⚑ It does **NOT** decide whether opencv's marker is a TRUE core hit — only that the reader picks between them **by array order**.                                                                   |
| ⚑ Owner-pellet loss **6 of 42 after mislock correction** | **MEASURED, and it is the new top lead.** 42 owner pellets: **0 never detected**, **5 rejected by the LIFETIME CAP**, 8 by the radius gate (**7 are the documented shot-4 mislock**, 1 genuine), 29 countable. **Detection is not the problem; the GATES are.**                         |
| ⚑ **Pooled `avgTotal` 7.07 → 6.16**                      | **The uncomfortable number.** The landing moved the counter FURTHER from any warm target. Faithful, and colder. Do not paper over it.                                                                                                                                                   |
| ⚑ 112 fallback events, implied mean **5.33**             | **Derived** (from the pooled means, judge-checked arithmetic), not directly measured. Consistent with "events too sparse to hold a single band track". **Their nature is UNEXPLAINED.**                                                                                                 |
| `CACHE_SELFTEST_EXPECT` **7→6 / 7.1→6.7**                | **Legitimately moved.** It is a **replay-consistency pin** (a `--sweep` combo reproduces the cache's OWN creation-time answer), **NOT a measured-truth assert**. Direction coheres with §9D. Every other committed fixture is byte-identical.                                           |
| Counter cold bias **0.8–1.6 pellets/10 (~1.08/shot)**    | **Still the problem statement, still OPEN.** One more mechanism eliminated as its cause, and the leading candidate is now the lifetime cap.                                                                                                                                             |

## 3. The single most important thing to carry forward

**THE READER MISSES NOTHING — IT DISCARDS.** `never_detected` is **0 of 42**. Every owner-labelled
pellet is seen by the detector. The 13 that do not reach the count are thrown away by **gates**: 5 by
the lifetime cap, 8 by the radius gate (7 of which are the documented shot-4 mislock, so 1 genuine).

⇒ **Stop looking for a detection failure. Look at the gates.** Every remaining cold-bias candidate is
downstream of a successful detection.

⚑ **The lifetime cap's provenance is the tell.** `max_pellet_frames` = `max(4, round((13/60) × fps))`,
derived from "pellet markers last ~13 game-frames." But **measured owner-pellet lifetimes run 8 to
19**. So 13 is roughly the **MEDIAN of the true distribution, not its ceiling** — the cap saws off the
upper tail and discards those pellets as static HUD elements.

**And the labelled set hands you a clean separation for free:** owner pellets span **8–19**; the only
two non-owner tracks at or above the band sit at **22 and 36** (static HUD). **A cap anywhere in
20–21 admits every owner pellet and still excludes both static elements.** That is a _gap_, not a
threshold anyone would have to tune.

⚠ **THE WARNING THAT MUST RIDE WITH IT.** 6 of 42 ≈ 14% of ~8.4 pellets/shot ≈ **1.2 pellets/shot**
against a **~1.08** deficit. That is an **arithmetically seductive magnitude match** — the exact shape
of the `center_exclude` hypothesis that died ("11–14% inside r<36 ≈ 1.1–1.4, almost exactly the
bias"). The difference is that `center_exclude`'s premise came from a **stale spec doc and was false**,
whereas this one is measured off the owner labels. **It still has to be killed or confirmed by an
INDEPENDENT method, never by the arithmetic.** Score it categorically: does raising the cap into the
20–21 gap recover the 5 known-lost owner pellets **without** admitting the life-22 and life-36 static
elements?

Also inherited unchanged: **shot detection is DOWNSTREAM of the crosshair lock**, so any measurement
conditioned on "detected shots" is conditioned on lock quality.

## 4. Graveyard — this session's additions. DO NOT RESURRECT.

The prior handoffs hold their own graveyards — all live, and they overlap in places, so count them
there rather than trusting a total quoted here.

| Hypothesis                                                                       | Why it looked right                                                                              | What killed it                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **"§8H: the 177-vs-176 is a median tie-break (`<` vs `<=`)"**                    | A one-event delta between two hand-ported implementations is exactly what a tie-break looks like | **Refuted by INSPECTION in two minutes.** Both are byte-identical in logic — same median formula, same strict `<`. They pick the same representative frame                                                                       |
| **"§8H: the `debounce_shots` lockstep invariant may already be one event off"**  | The replay read `validShots` 177 against shipped's 176                                           | **`totalShots` = 218 in BOTH**, all 218 events agreeing on span/frames/white. Segmentation is perfect; only the `5 ≤ total ≤ 10` filter differs, via ONE event's `core` flag                                                     |
| **"Either bare 5/5 rule can simply replace the shipped median"**                 | Both scored 5/5 categorically and far under the ceiling bar                                      | **They abstain on 13.1% of events and `debounce_shots` has no abstain path.** A bare swap drops those events — a new missing-shot channel on a reader whose missing-shot rate is the open problem                                |
| **"Score shot 4 on the structural crop — that's what the reader actually sees"** | True on its own terms, and it is the crop the shipped reader uses                                | It selects a frame in crop A and checks it against a plateau defined in crop B (trap 9), **charging a documented LOCALIZATION mislock to the representative-frame policy**. Corrected → both rules 5/5, `total` = 7 matching §9B |
| **"Fixing the flash-sampling will warm the counter"**                            | The flash phase reads high, so sampling it should have been inflating... something               | **It went COLDER, 7.07 → 6.16.** Shipped's 7.07 was cancellation (§9B: 12 owner pellets among 35 reported). Faithful and colder are not contradictory                                                                            |

**The pattern, again, and it is the method note:** three of these five died to an **INSPECTION or an
existing fixture**, not to new derivation. The tie-break guess cost two sessions of "may already be
off" hedging and died to reading the two functions side by side.

## 5. Traps

Carry forward every trap in the prior three handoffs. New or changed this session:

1. ⚑ **`frame_counts` now has FOUR channels — `{white, red, marker, band}`.** `band` is the
   lifetime-gated in-radius count that feeds the hybrid. **If the `band` key is ABSENT,
   `debounce_shots` behaves exactly as pre-hybrid** — that backward-compat default is what keeps every
   old dump and committed fixture replaying unchanged. **A band-less replay is NOT the shipped answer
   any more**; do not read one as current behaviour.
2. ⚑ **Assert lockstep on a COMMON input**, via `read-pellets.ts --debounce-json` (the harness built
   for exactly this). Comparing shipped `pellets.json` against a dump replay measures §11's **marker
   channel**, not the algorithm — that confusion is the whole of §8H.
3. ⚑ **`CACHE_SELFTEST_EXPECT` is a REPLAY-CONSISTENCY pin, not a measured-truth assert.** It pins
   "the cache path reproduces the live path". It legitimately moves with an algorithm change.
   Measured-truth asserts still never move without a new measurement.
4. ⚑ **`max_pellet_frames` has THREE different live values** — `read-pellets.ts:505` scales it
   (`max(4, round((13/60) × fps))` → **13** at 60 fps, **7** at 30) and `count-pellets.py`'s standalone
   default is **8**. Use each dump's own. It is a **per-blob track-lifetime cap, NOT an event-span
   budget** — that category error produced a headline ~8× too large.
5. ⚑ **`t0` is NOT the same physical event across shots** — the blast has TWO onsets and `find_t0`
   takes whichever is nearer, so it is the **flash** onset on shots 2/4/5 and the **cohort** onset on
   1/3. Define rules on the EVENT's own frames. Two "f9" frames are not the same thing.
6. ⚑ **The owner's labelled count is a WINDOW count (f8–11), not a per-shot landed total.** "8.40
   landed pellets per shot" and the 8–16% threshold derived from it are window-conditional.
7. **Shot 4's label file records `locate: "template"`.** Using structural for it silently measures a
   different crop's centre.
8. **`reads[k].conf` in an ammo series is CROSSHAIR LOCK confidence**, not digit quality; digit
   quality is `reads[k].scores`.
9. **`cmd | tail; echo $?` reports TAIL's exit status.** Many false green readings in this thread.
10. **A git worktree runs NO pre-commit hooks** (`.husky/_` is gitignored and absent). Run
    `npx prettier --write` and `npm run typecheck` **manually**.
11. **NEVER `git restore` / `checkout --` / `reset --hard`**; do not `rm -rf` in the worktree.
    `scratchpad/pellets/_centering_tmp/` holds ~2.1 GB — leave it.
12. **Prefer SYNCHRONOUS subagents, commit per item**; never background a shell command in a headless
    session.
13. **Read the CLEAN crops** (`groundtruth-f8-11/`), never `-annotated/`.

## 6. Landed state

**Branch `fix/pellet-reader`, PUSHED to `origin` at this handoff as an owner-authorised checkpoint.**
Do not trust any commit count written here — read it live:
`git rev-list --count origin/fix/pellet-reader..HEAD`. **`main` is still deliberately held, and
`/patch-notes` is owed before anything reaches it.**

Fourteen commits this session, oldest first:

| SHA        | What                                                         |
| ---------- | ------------------------------------------------------------ |
| `ac822e36` | the PRE-COMMITTED decision rule (written before the numbers) |
| `d5679db2` | `--policy-score` — 4 candidates vs the plateau               |
| `6379c66b` | first-pass §10 result (superseded by `883218d4`)             |
| `94ac9ef2` | **the crop fix** — shot 4 scored on its own template crop    |
| `883218d4` | corrected §10 — both band rules reach 5/5                    |
| `2facc80e` | the enactment PROPOSAL                                       |
| `fd1bd23a` | §11 — the marker-channel defect                              |
| `cbe8659e` | `--backend-marker-audit` + fixture                           |
| `a67a862a` | §11H cites the committed instrument; §11I cross-dump         |
| `e3a3801a` | `hybrid_plateau_median` as a `--policy-score` variant        |
| `158174d3` | §12 — the hybrid meets all six criteria                      |
| `05516334` | **THE LANDING** — the hybrid in both readers                 |
| `93e30d70` | `--hybrid-landing-audit` + fixture                           |
| `c4128341` | §13 + PROPOSAL closeout                                      |

**Gates: `bash scripts/probe/pellet-selftest.sh` → 19 arms, TRUE exit 0. `bash scripts/verify.sh` →
TRUE exit 0** (both re-run by the judge, not taken on report).

**Three instruments landed, each with a committed self-validating fixture:** `--policy-score`,
`--backend-marker-audit`, `--hybrid-landing-audit` — all on
`scripts/probe/analyze-pellet-tracks.py`, all wired into `pellet-selftest.sh`. Plus
`read-pellets.ts --debounce-json`, the pure JSON-in/JSON-out lockstep harness.

**Behaviour-touching changes: ONE.** The fallback hybrid, in both `count-pellets.py` and
`read-pellets.ts`. Exactly one pre-existing pin moved (`CACHE_SELFTEST_EXPECT`, explained in-line);
every other committed fixture is byte-identical.

## 7. Open, in priority order

1. **⚑ THE LIFETIME CAP IS DISCARDING REAL PELLETS — the new top lead on the cold bias.** 5 of 42
   owner pellets are rejected by `max_pellet_frames` after being successfully detected; measured owner
   lifetimes are **8–19** against a cap of **13** at 60 fps. **The 20–21 gap** (non-owner statics sit
   at 22 and 36) is a clean separation. **Settle it categorically** — does raising the cap recover the
   5 known-lost owner pellets without admitting the two statics? — **never by the arithmetic**, which
   has the refuted `center_exclude` shape (§3). ⚑ Note the cap is fps-scaled, so the 30 fps dumps
   (cap 7) may lose a _larger_ fraction; check them.
2. **⚑ The 112-event abstention population (13.1%) — UNEXPLAINED.** No lifetime-band track in radius
   at all; implied mean total **5.33**. Either they are spurious detections, or real shots whose
   pellets fragmented below the band. **If the latter it is a second undercount channel.** Cheap —
   answerable from committed artifacts, no owner time.
3. **Track fragmentation** — 70% of tracks end by frame 2 at 30 fps, **64.3% at 60 fps**, when it
   should have roughly halved in relative terms. Flagged since 08-01 as a **larger** problem than the
   raw percentages suggest. Plausibly the same root as item 2 — treat them together.
4. **The missing-shot channel — which BASIS carries the bias was never decided.** Aggregate 3.9–6.8%
   vs per-event 16.7% / 17.4%. Cluster-merge explains ~1/3 of the arbiter-visible part; the `guilty`
   **f1787** miss is still mechanistically unexplained (n=1 — do not manufacture a cause).
5. **⚑ Is the TARGET itself right?** §9A made 8.40 an f8–11 **window** count. "Does any marker fade
   before t0+8?" is unanswered and needs owner labels at the plateau frame. **Part of the measured
   cold bias could be a mis-specified reference rather than a reader defect** — do not assume the whole
   1.08 is reader error.
6. **§11's backend-selector defect — recorded, unfixed, OWNER-GATED.** `read-pellets.ts:599` resolves
   backend ties by array order on a channel the comparison never inspects. Fixing it changes counts.
   ⚑ Prerequisite: **is opencv's marker = 3 at frame 1565 a true core hit or an opencv false
   positive?** The ⚔ hit-marker triangles are visually checkable in the footage. Do not fix the
   selector before answering it.
7. **`debounce_shots` SEGMENTATION — still ⛔ OWNER-GATED, untouched.** `cap_cadence` (~3 LOC) and
   `resplit` (~10 LOC) cut pooled MISSED **7.0% → 4.2% / 4.5%**. ⚑ `cap_cadence = 35` is NOT
   reproducible (the literal 0.9× gives 37/11/−0.019). ⛔ `candA` is REFUTED — do not re-propose.
8. **60 fps localization instability** — `run21`/`run21b` are template-mode with `cross_positions`
   None on 100% of frames; **never re-extracted under `--locate structural`.** Re-extract before
   designing any fix.
9. **The generator's radial envelope; Phase 2 steps 4–6** — every generator-derived fidelity number
   inherits the envelope gap; steps 4–6 remain blocked on the owner's Decision 1 and the outstanding
   `/logic-gate` pre-op revisions.
10. **Doc hygiene owed:** `/patch-notes` before `main`, and a `QUEUE.md` reconciliation — items 1, 2
    and 6 above are not yet filed there.

## 8. Method note for the next judge

**The pre-committed decision rule did the work again, and it is now 4 for 4 in this thread.** Writing
`2026-08-04-representative-frame-PRECOMMIT.md` to disk _before_ the measurement — with the plateau
definition **anchored to §9C's already-recorded shipped verdict**, so it reproduced 2/5 before any
candidate was scored — is what made the result decidable rather than negotiable. **Anchor a new
decision rule to an already-recorded result wherever one exists**; it converts "did you fit this?"
from an argument into a check.

Two things worth copying:

- **PREFER INSPECTION TO DERIVATION.** §8H's tie-break guess survived two sessions as a hedge and died
  in two minutes to reading the two functions side by side. Before measuring a divergence between two
  implementations, **read them both**.
- **A "defensible reading" can still be wrong.** The shot-4 mixed-crop scoring was well-argued and
  clearly documented, and it was still charging a localization defect to a different subsystem. The
  tell was structural, not numeric: _a frame selected in one crop, checked against a plateau defined
  in another._ When a result depends on which artifact you scored against, check that both halves
  came from the same one.

⚑ And the discipline that cost the most to get right: **the judge resolved a §1.1 ambiguity in its own
pre-commit AFTER seeing results.** That is normally the exact failure pre-commitment exists to prevent.
It stands only because it resolved in the direction trap 9 and §9B **independently required
beforehand**, and because a discriminating control held (the crop swap did **not** rescue
`shipped_median`). §10B records that honestly rather than presenting the 5/5 as if it had always been
unambiguous. **If you have to do this, say so in the artifact — do not let it read as clean.**
