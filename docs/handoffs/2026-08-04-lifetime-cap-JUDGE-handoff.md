# Pellet reader — judge handoff after the LIFETIME-CAP measurement

> AI-facing. Written for the session that follows.
> **CONTINUES** [`2026-08-04-pellet-reader-JUDGE-handoff.md`](2026-08-04-pellet-reader-JUDGE-handoff.md),
> which continues [`2026-08-03-…`](2026-08-03-pellet-reader-JUDGE-handoff.md) →
> [`2026-08-02-…`](2026-08-02-pellet-reader-JUDGE-handoff.md) →
> [`2026-08-01-pellet-cascade-…`](2026-08-01-pellet-cascade-JUDGE-handoff.md).
> **The graveyards and traps in all five are live and binding. Read them before proposing anything.**
>
> **Slugs:** `marciana` (SG/Iron — `docs/probes/clean-weapons/marciana-solo.MP4`; **not**
> `marciana-marine-study`, AR/Iron), `noir`, `guilty`, `isabel`. All SG, `ammo: 9`,
> `hitsPerShot: 10`.

---

## 0. The one-paragraph state

**The lifetime-cap hypothesis was measured, passed both mandatory out-of-sample gates, and LANDED —
all on 2026-08-04, owner-approved.** The decoupled band ceiling `band_hi = 20` (60 fps; 10 at 30 fps)
recovers all 5 cap-discarded owner pellets, holds pooled `above_ceiling_pct` at **3.1%** against a
6.2% reject line, and admits only **0.64–0.84 tracks/event** on four out-of-sample dumps against a
pre-committed 2.00 ceiling. Measurement: `docs/probe-runs.md` §14. Landing: §16, plan
`2026-08-04-band-hi-LANDING-PLAN.md` — all five pre-stated criteria met, the blast radius **declared
before the edit held exactly (zero fixtures, zero pins)**. Three cross-family gates ran
(`kimi-code/k3`): pre-op `APPROVED-WITH-REVISIONS` (7 mandatory, all executed before any number
existed), and two post-op `ACCEPT`s.

⚑ **Two things that must not be misread.** **The cold bias is NOT closed and must not be described
as closed** (§2, §5.4). And **nothing on the board moves until footage is RE-EXTRACTED** — the
improvement reaches new extractions only; every committed dump keeps the band values it was
extracted with (§7.1).

§3 below is retained because it is _why_ the landing is shaped the way it is, and because the
restructure it describes is now live code.

Separately, item 7's cheap prerequisite is **ANSWERED** (§1.5) and item 3's population is
**mis-described in two prior documents** (§1.4).

## 1. What settled this session — all recorded in `docs/probe-runs.md` §14 / §15

| #   | Question                                                          | Outcome                                                                                                                                                                                                                                                                        |
| --- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Does widening the lifetime band recover the 5 lost owner pellets? | **YES, and it clears both mandatory out-of-sample gates.** `above_ceiling_pct` 3.1% (reject > 6.2%); corridor admission 0.64–0.84/event on 4 dumps (downgrade at ≥ 2 dumps > 2.00 — **0 of 4 failed**). Control reproduced the landed 740/112/1.8%/6.1561 figures **exactly**. |
| 2   | Which value in the corridor?                                      | **20**, on lockstep-safety grounds pre-committed before scoring. ⚑ **19 is equally safe** — the choice is a margin judgment, NOT forced (§4). 21 is excluded: `Math.round(10.5)=11` vs Python `round(10.5)=10`.                                                                |
| 3   | Do the "sensitivity arms" support that choice?                    | ⚑ **NO — they are VACUOUS out-of-sample.** All three candidates fps-scale to `band_hi = 10` at 30 fps, so on all 4 out-of-sample dumps 19/20/21 are **one measurement, not three**. The evidence supports **widening**; it does not discriminate the value (§14C).             |
| 4   | What are the 112 abstaining events?                               | ⚑ **Two prior docs describe them WRONGLY.** "No band track in radius at all" is true of **3 of 112**. For **81 (72%)** a band track IS present and in radius; the event abstains because the band series never reaches `MERGE_EVENT_MIN` (3) **concurrently** (§1.4).          |
| 5   | Is opencv's `marker = 3` at frame 1565 a true core hit? (item 7)  | **NO — the crosshair-attached marker count is 1, same as the neighbouring frames** (§1.5). n=1 frame; RECORDS an observation, enacts nothing.                                                                                                                                  |

### 1.4 The abstention correction (item 3), stated precisely

`_ps_longest_modal_run` filters `totals.get(j, 0) >= MERGE_EVENT_MIN` **before** looking for a
plateau, so a lone in-band track can never form one. Breakdown of the 112:
`in_band_no_concurrency` **81**, `all_below_band_lo` **18**, `mixed_outside_band` **9**,
`none_in_radius` **3**, `all_above_cap` **1**.

⇒ The abstention is a **concurrency threshold**, not an absence of band tracks. The wording in
`2026-08-04-representative-frame-PRECOMMIT.md:150` and the prior handoff's item 3 is contradicted.
⛔ **What the 81 MEAN is still unanswered** and keeps its own evidence bar — §14F is report-only by
its own pre-commit, and nothing about the cap verdict rests on it.

### 1.5 Item 7's prerequisite — ANSWERED, and it does NOT license the fix

At `h4-marciana` frame 1565, of three red components inside `pellet_radius`:

| track   | life | dx / dy across f1564–1566     | reading                                                 |
| ------- | ---- | ----------------------------- | ------------------------------------------------------- |
| `11110` | 3    | (+9, −57) (+9, −57) (+9, −59) | **constant offset ⇒ crosshair-attached**, a real marker |
| `11115` | 1    | — (−46, −8) —                 | single-frame, on the horizontal red UI banner line      |
| `11117` | 1    | — (+63, −6) —                 | single-frame, same line                                 |

⇒ `marker = 3` is **1 genuine marker + 2 single-frame banner glyphs**. ⛔ **n = 1 frame, 1 dump, 1
unit.** Per evidence-proportionality this RECORDS an observation; the `read-pellets.ts:882`
backend-selector defect stays **owner-gated and unfixed**, and no verdict was stamped on it.

## 2. Provenance ledger — which numbers carry which weight

| Figure                                                   | Weight                                                                                                                                                                                  |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Control reproduction 740/112/1.8%/6.1561/852/0           | **Strongest thing here.** Exact-match `SystemExit` assert, not a report. If it ever drifts, every other row is void.                                                                    |
| Ceiling **3.1%** over 852 events / 5 dumps / 4 units     | **Strong, out-of-sample, label-free.** Anchored to the already-recorded 6.2% shipped-median figure, not a threshold picked after seeing results.                                        |
| Corridor **0.64–0.84/event** on 4 out-of-sample dumps    | **Strong.** Sub-1.0 admission is pellet-like; a static-HUD population would scale with clip length, not with event count. Threshold (2.00 = 2× in-sample) pre-committed before scoring. |
| ⚑ `band_hi` = **20 specifically**                        | **WEAK — margin judgment, not measurement.** 19 is equally lockstep-safe and numerically identical out-of-sample. Do not present 20 as measured-optimal.                                |
| §2.1 categorical **42/42**                               | ⚑ **ZERO evidential weight — TAUTOLOGICAL.** The corridor is derived from the same pinned population the check re-reads. Demoted by the pre-op gate. **The proposal may not cite it.**  |
| ⚑ Pooled `avgTotal` **6.1561 → 6.6631**                  | **Reported only, and FORBIDDEN as a ranking criterion** by the pre-commit. See §5.4 before relating it to the cold bias — the two are on **different bases**.                           |
| The 112 → 96 abstention change (16 events become banded) | **Measured**, from the same run. Its meaning is unexplained.                                                                                                                            |
| §1.5's frame-1565 geometry                               | **n = 1 frame.** Hypothesis-strength. Committed instrument + pinned fixture, so it is reproducible — but it is one frame.                                                               |
| Counter cold bias **0.8–1.6 pellets/10**                 | **STILL OPEN. STILL THE PROBLEM STATEMENT.** Nothing this session closed it.                                                                                                            |

## 3. The single most important thing to carry forward

**THE LANDING IS A RESTRUCTURE, NOT A CONSTANT CHANGE — AND THE NAIVE EDIT IS A PROVABLE SILENT
NO-OP.**

In production, `band_ids` is built **as a subset of `pellet_ids`** (`count-pellets.py:517`) and
`_frame_pellet_counts` **skips any track not in `pellet_ids` before the band check runs** (`:483`).
So raising a bound inside that comprehension while `pellet_ids` stays at 13 **changes nothing** — a
life-15 track never reaches the band. The landing must:

1. build `band_ids` from **`tracks` directly**, not from `pellet_ids`;
2. **hoist the band count out of the `pellet_ids` skip**, keeping the radius and non-red conditions;
3. add `--band-hi` defaulting to `max_pellet_frames` so every existing dump/fixture replays
   byte-identical; `read-pellets.ts:787` passes it explicitly.

⚑ **The measurement arm models the RESTRUCTURED path, not today's code.** `_ps_band_totals` reads
`radius_tracks` directly and never consults `pellet_ids` — which is the only reason the candidate
was measurable at all. A landing session that reads §14 as "we measured today's code with a bigger
number" will ship a no-op and see no movement.

⚑ **After the restructure `band` is NO LONGER a subset of `white`** (`band > white` becomes possible
per frame). **Enumerating every consumer of that invariant is a landing PREREQUISITE.** Known
starting points: `_frame_pellet_counts`'s docstring ("a strict subset of `white`"),
`read-pellets.ts:220`, and `--band-equivalence-audit`'s decomposition asserts.

⚠ And the deferred question: this pass says **nothing** about raising `max_pellet_frames` itself.
That would move `white` → `totals` → `debounce_shots` segmentation → **event onsets**, which
destroys the "MISSED unchanged, TRUE BY CONSTRUCTION" invariant the representative-frame landing was
accepted on. It needs re-extraction and its own blast-radius measurement.

## 4. Graveyard — this session's additions. DO NOT RESURRECT.

The prior handoffs hold their own graveyards — all live, and they overlap; count them there.

| Hypothesis                                                                    | Why it looked right                                                        | What killed it                                                                                                                                             |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **"Raise `max_pellet_frames` from 13 to 20"** (the prior handoff's item 1)    | It is the constant whose provenance is demonstrably wrong (median≠ceiling) | The cap gates `pellet_ids`, which gates all four channels **and event segmentation**. Wrong lever — see §3. Superseded by the decoupled `band_hi`          |
| **"`band_hi = 20` is FORCED by the `.5`-rounding hazard"**                    | Python is banker's, JS is half-up — a real and already-fired hazard        | **`round(9.5) == 10` in BOTH.** Only 21 desyncs. 19 is equally safe ⇒ the choice is a margin judgment. Caught by the pre-op gate before any number existed |
| **"19 and 21 are sensitivity arms showing the verdict is value-robust"**      | Three candidates were scored and all three passed                          | All three scale to `band_hi = 10` at 30 fps ⇒ **one measurement, not three**, on every out-of-sample dump. The advertised sensitivity analysis is vacuous  |
| **"The 112 abstentions have no band track in radius at all"** (2 docs say so) | It is what the abstention condition sounds like                            | True of **3 of 112**. 81 have one; the gate is `>= MERGE_EVENT_MIN` **concurrency**, not existence                                                         |
| **"The §2.1 categorical check is the PRIMARY evidence"**                      | It is a clean 42/42 with an unambiguous right answer                       | **Tautological** — the corridor is derived from the population the check re-reads, so it cannot fail. Demoted to a consistency check by the pre-op gate    |
| **"opencv's `marker = 3` at f1565 might be a true core hit"**                 | opencv is the shipped backend and sees things numpy/pil miss               | Two of the three are single-frame components on the same horizontal line — a red UI banner. The crosshair-attached count is 1 (§1.5)                       |

**The pattern, and it is the method note:** **three of these six died to the PRE-OP GATE, before any
number existed** — the cheapest possible place. A fourth died to reading the frame. None needed new
measurement.

## 5. Traps

Carry forward every trap in the prior four handoffs. New or changed this session:

1. ⚑ **PYTHON `round()` IS BANKER'S; JS `Math.round()` IS HALF-UP — and they have ALREADY diverged
   here.** `round(13 × 30/60)` = `round(6.5)` is **6** in Python but the dumps store **7**, because
   `read-pellets.ts:787` (JS) is what computes the cap. **Never recompute a stored cap** — use each
   dump's own `max_pellet_frames`. Any bound computed on both sides must avoid `.5` at every
   supported fps.
2. ⚑ **A CATEGORICAL CHECK DERIVED FROM THE POPULATION IT SCORES IS TAUTOLOGICAL.** It cannot fail
   and carries no information. Before promoting one to PRIMARY, ask: could this have come out any
   other way? (This is a _different_ failure from mean-matching, and the pre-commit design did not
   catch it — the gate did.)
3. ⚑ **`band` is a strict subset of `white` TODAY, and will NOT be after the landing.** Every assert
   or docstring that assumes it is in the landing's blast radius (§3).
4. ⚑ **DO NOT RELATE `avgTotal` TO THE ~1.08 COLD BIAS — THEY ARE DIFFERENT BASES.** `avgTotal` is
   per-EVENT pooled over 852 unlabelled events; the ~1.08 figure is per-SHOT against an f8–11
   **window** reference (§9A) on the labelled clip. The pre-commit forbids `avgTotal` as a ranking
   criterion; it is equally invalid as a bias-closure claim. **The bias is OPEN.**
5. ⚑ **The audit arm freezes segmentation** (events come from each dump's stored `frame_counts`).
   That is what makes "band_hi cannot move an onset" true _in the audit_. It is not a proof about
   production.
6. **`cmd | tail; echo $?` reports TAIL's exit status.** Still generating false greens — it caught
   the orchestrator once more this session. Run the command bare or use `${PIPESTATUS[0]}`.
7. **A git worktree runs NO pre-commit hooks** (`.husky/_` is gitignored/absent). Run
   `npx prettier --write` manually. ⚑ Prettier has **no Python parser** — `.py` files need nothing.
8. **NEVER `git restore` / `checkout --` / `reset --hard`**; do not `rm -rf` in the worktree.
   `scratchpad/pellets/_centering_tmp/` holds ~2.1 GB — leave it.
9. **Prefer SYNCHRONOUS subagents, commit per item**; never background a shell command in a headless
   session (`CLAUDE_CODE_ENTRYPOINT=sdk-cli`, no tty).
10. ⚑ **A cross-family gate packet must not contain your own disposition table.** The post-op judge
    flagged this session's packet **CONTAMINATED** for exactly that and compensated. Send the pre-op
    packet + verdict + diff, and nothing of your own.
11. **The dumps live in a GITIGNORED scratchpad** (`/Users/maxwellsutton/nikke-sim/scratchpad/pellets/`).
    Committed fixtures must carry their own data slice; cite the scratchpad only as `_source`.

## 6. Landed state

**Branch `fix/pellet-reader`.** Do not trust any commit count written here — read it live:
`git rev-list --count origin/fix/pellet-reader..HEAD`. **`main` is still deliberately held, and
`/patch-notes` is owed before anything reaches it.** ⛔ **NOT PUSHED — the owner has not asked.**

Nine commits this session, oldest first:

| SHA        | What                                                                    |
| ---------- | ----------------------------------------------------------------------- |
| `5e41b418` | the PRE-COMMITTED decision rule (written before the numbers)            |
| `23ef2da9` | the kimi-k3 pre-op gate's 7 mandatory revisions folded in               |
| `65b844a4` | **the instrument** — `--cap-score` + fixture + selftest                 |
| `8b2ba0de` | `docs/probe-runs.md` §14 + the pre-commit's §7 result                   |
| `1be93d6f` | §14F — the factual correction to how the 112 were described             |
| `b9530d67` | the post-op review's two hardening fixes                                |
| `bc5f2352` | §14C sensitivity limit + §14J both gate records                         |
| `0548a39b` | **`--marker-geometry`** + fixture (item 7's prerequisite, constraint 9) |
| `9d9df4f1` | §15 — the frame-1565 geometry record                                    |

**Gates, re-run by the judge with TRUE exit codes (not through `tail`): `pellet-selftest.sh` → 22
arms, exit 0. `verify.sh` → exit 0.** **ZERO pre-existing fixtures moved** — production behaviour is
untouched, so that was a pass/fail criterion, not a prediction.

**Two instruments landed, each with a committed self-validating fixture:** `--cap-score` and
`--marker-geometry`, both on `scripts/probe/analyze-pellet-tracks.py`, both wired into
`pellet-selftest.sh`. Both selftests were shown to **FIRE when their expectations are violated**.

⚑ **THEN THE LANDING WENT IN** (owner-approved, same day — `docs/probe-runs.md` §16):

| SHA        | What                                                                     |
| ---------- | ------------------------------------------------------------------------ |
| `a470a7be` | the landing plan, **blast radius declared BEFORE the edit**              |
| `77dcf930` | **the restructure** — `band_ids` off `tracks`, band hoisted, `--band-hi` |
| `44069380` | `read-pellets.ts` passes `--band-hi`; docstring corrected                |
| `f67be274` | `band_hi` registered with the `--load-detections` cache system           |

**Behaviour-touching changes: the measurement pass had ZERO; the landing has ONE** — the decoupled
band ceiling, in `count-pellets.py` + `read-pellets.ts`. `debounce_shots`' selection logic,
`_band_lo`, `max_pellet_frames`, `MERGE_EVENT_MIN`, `marker_min` and `pellet_radius` are all still
untouched. **Zero fixtures and zero pins moved across BOTH passes.**

## 7. Open, in priority order

1. ~~**LAND `band_hi = 20`**~~ — ✅ **LANDED 2026-08-04, owner-approved.** Plan
   `2026-08-04-band-hi-LANDING-PLAN.md`, record `docs/probe-runs.md` §16. All five pre-stated
   criteria met; the declared blast radius held exactly (**zero fixtures, zero pins**); cross-family
   post-op `ACCEPT`. ⚑ **Two follow-ups it left open, both recorded in §16E:**
   (a) **`--dump-tracks` never carries the `band` series**, so any dump replays as pre-hybrid and
   cannot exercise the landing — a future re-extraction for audit purposes produces band-less dumps.
   Pre-existing, does not affect the production reader (which parses `--temporal` stdout). Fixing it
   changes the dump format ⇒ its own blast-radius pass.
   (b) The improvement reaches **new extractions only** — the committed dumps keep the band values
   they were extracted with, by design. **Nothing on the board moves until something is re-extracted.**
2. **⚑ IS THE TARGET ITSELF RIGHT? — promoted, and it now GATES the bias question.** §9A made 8.40
   an f8–11 **window** count. Until "does any marker fade before t0+8?" is settled with owner labels
   at the plateau frame, **no bias-CLOSED verdict is possible whatever the cap does** (§5.4). This
   is now the cheapest thing standing between the project and a real answer on the cold bias.
3. **⚑ PRODUCTION MISLOCK RATE — unquantified, and in-sample the LARGEST gate-loss channel** (7 of
   13 discarded owner pellets, more than the cap's 5). Sits upstream of every shot-conditioned
   measurement. Question: **what fraction of production shots are mislocked?**
   ⚑ **CORRECTION (2026-08-04): this does NOT hang off item 8.** `run21`/`run21b` are two far-band
   worst-case windows, not the production corpus, and §17 showed they are unusable rather than
   informative. The number that bears on production is **`h4-marciana-structural`'s 21.4% held**
   — and **"held" is not "wrong"** (a held lock is correct whenever the crosshair did not move), so
   this needs the **displacement** test, not the hold rate. That is the entry point now; item 8 is
   closed and gates nothing.
4. **The 112 → 96 abstentions, reframed.** ⚑ It is a **concurrency** gate, not an absence of tracks
   (§1.4) — the old framing is dead. Open: what the 81 `in_band_no_concurrency` events are, and what
   the 16 that become banded at `band_hi = 20` have in common. Cheap; answerable from committed
   fixtures.
5. **Track fragmentation** — 70% of tracks end by frame 2 at 30 fps, 64.3% at 60 fps. Flagged since
   08-01 as larger than the raw percentages suggest. Plausibly the same root as item 4 — treat
   together.
6. **The missing-shot channel — which BASIS carries the bias was never decided.** Aggregate 3.9–6.8%
   vs per-event 16.7%/17.4%. The `guilty` **f1787** miss is still mechanistically unexplained (n=1 —
   do not manufacture a cause).
7. **§11's backend-selector defect — the PREREQUISITE IS NOW ANSWERED (§1.5); the FIX is still
   OWNER-GATED.** `read-pellets.ts:882` resolves backend ties by array order on a channel the
   comparison never inspects. The blocking question ("is the f1565 marker real?") is answered **no**
   at n=1. Measured blast radius: ONE event across 8 dumps. ⚑ Ready for an owner decision; do not
   self-authorize it on an n=1 read.
8. ~~**60 fps localization instability**~~ — ✅ **ANSWERED 2026-08-04, in the NEGATIVE**
   (`docs/probe-runs.md` §17). Re-localized both windows under `--locate structural`: lock rate goes
   **0% → 100% / 99.4%**, but **~81% of those locks are HELD** (`conf is None`) against 8.1% on
   `i3-noir-far-60fps` and 21.4% on `h4-marciana-structural`. Stale run-displacement median **202.6 px**
   vs a 160 px `pellet_radius`, and 29 of 30 shots carry a stale counting frame. ⚑ **Structural
   converts a LOUD failure into a SILENT one** — 100% positions, most of them fabricated by hold.
   `run21`/`run21b` stay **UNUSABLE**. ⚑ The item's framing was also wrong: 4 of 6 60 fps dumps
   already lock 100%, including a far-band one, so neither 60 fps nor the far band is the
   discriminator. **Why these two windows fail is UNEXPLAINED** (§17E) — and item 3 does **not** hang
   off this after all (see §7.3).
9. **`debounce_shots` SEGMENTATION — still ⛔ OWNER-GATED, untouched.** `cap_cadence` (~3 LOC) and
   `resplit` (~10 LOC) cut pooled MISSED **7.0% → 4.2%/4.5%**. ⚑ `cap_cadence = 35` is NOT
   reproducible. ⛔ `candA` is REFUTED — do not re-propose.
10. **The generator's radial envelope; Phase 2 steps 4–6** — blocked on the owner's Decision 1 and
    the outstanding `/logic-gate` pre-op revisions.
11. **Doc hygiene owed:** `/patch-notes` before `main`. QUEUE.md now points here (updated this
    session); items 1–4 and 7 above are the live ones.

## 8. Method note for the next judge

**The pre-committed decision rule is now 5 for 5 — but this session it was the CROSS-FAMILY PRE-OP
GATE that did the heavy lifting, and that is the transferable lesson.** Three of six graveyard
entries died at the gate, before a single number existed. The pre-commit alone would have shipped
all three: a false rounding claim, a tautological PRIMARY criterion, and a landing plan that was a
silent no-op. **A pre-commit fixes you to a rule; it does not check whether the rule is sound. Those
are different failures and they need different instruments.**

Three things worth copying:

- **ASK WHETHER YOUR CHECK COULD HAVE COME OUT DIFFERENTLY.** The 42/42 categorical looked like the
  strongest result in the pass and carried zero information. Deriving a threshold from a population
  and then scoring it against that same population feels rigorous and proves nothing.
- **VERIFY THE GATE'S CLAIMS TOO.** All seven revisions were checked before folding — two
  (`radius_tracks` colour and radius semantics) resolved to "premise HOLDS, no change needed" by two
  minutes of inspection, and one corrected a factual error _of mine_. A gate is a reviewer, not an
  oracle; taking it on report is the same mistake as taking a subagent on report.
- **PREFER INSPECTION TO DERIVATION — again.** Item 7's prerequisite had been deferred for a session
  as "a visual check". It took one crop and one query of the dump's own track geometry; the constant
  crosshair offset settled it far better than the eye did.

⚑ And the discipline that cost the most: **the post-op packet was CONTAMINATED** — it carried the
orchestrator's own revision-disposition table into a review that is supposed to be blind. The judge
caught it, said so, and compensated. It is recorded in §14J rather than quietly dropped, because the
next session needs to know the blindness contract is load-bearing and that it worked.
