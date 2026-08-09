> **CLOSED (2026-08-09).** This handoff has landed; live follow-ups are in `docs/handoffs/QUEUE.md`.

# The band-less-reader SWEEP — findings + ONE batched proposal (2026-08-06)

> AI-facing. **FINDINGS-ONLY** (CLAUDE.md batch-and-stop): this pass edits no instrument, no
> constant, no fixture and no citation. It ends in **one batched proposal for the owner**.
> Closes the sweep §23C implied and `docs/probe-runs.md` §37 filed as owed.
>
> Method: two independent passes, deliberately split so neither could reach the verdict alone — one
> classified every ARM by channel provenance, one catalogued every CITATION of a pellet-reader
> number. **The join is what follows.** Load-bearing claims re-verified by hand.

## 0. Headline — the defect was CONTAINED, and the sweep found a different, larger one

⚑ **The §36 channel defect did not spread.** Every heavily-cited production number traces to a
**band-aware** arm or to an **owner hand-count**. `--representative-audit` was the one arm whose
output was read as owner-anchored production behaviour, and §37 fixed it. ✅ **No override in the
tree cites the CV pellet reader at all** — every landing-fraction in override prose traces to an
owner hand-count or datamined `hitsPerShot`, so **the damage model was never exposed to any of
this.**

⛔ **But the sweep surfaced a bigger problem than the one it was sent to find:** the branch's single
most-cited number has **no committed instrument**.

## 1. ⛔ TOP FINDING — §19's `−1.40 pellets/shot` cannot be reproduced

`−1.40` is cited in `docs/probe-runs.md` §19, `DECISIONS.md:2881`, `STATE.md:315`, `QUEUE.md`, three
JUDGE handoffs and `analyze-pellet-tracks.py:7215`. **It is the denominator of the entire cold-SG
accounting** — §27C's "3.4% of the residual", §31D's "3%" and §35D's "32%" are all fractions of it.

**Its producing instrument is not in the tree.** All ~40 committed arms were enumerated; none
produces it. §19E is titled "Reproduction" but names only the A/B's **inputs**
(`policy-score-slice.json` t0 rows, `groundtruth-f8-11.json` labels,
`representative-audit-slice.json` decomposition) — never a script path, because there is none. The
A/B was ad-hoc and uncommitted.

⚑ **This is the SECOND occurrence of a failure CLAUDE.md already names.** Constraint 9 exists
because of the 2026-07-29 gauge instrument that was cited as evidence, lived in `/tmp`, and was
lost. The rule: _"An instrument cited as evidence MUST be in the tree at a named path, and the
citation must name that path."_ It went unnoticed here because **§19E reads like a reproduction
section**.

⛔ **Consequence to hold honestly:** `−1.40` is not refuted — it may well be right. It is
**unreproducible**, so every fraction expressed against it inherits that.

## 2. ⚑ LIVE TRAP — one arm prints both channels with nothing marking which is which

`--representative-audit` now prints, **in a single stdout**, a **band-aware** labelled block
(§37) and a few lines below it a **legacy** `_rep_policy_table` block (`median`/`p75`/`max` on
`_merge_events`' pre-hybrid `white+red`). The scoping is correct and deliberate — documented at
`audit_representative:4104-4114`, `:4533-4541` and §37F — but **no marker reaches the output**.

⇒ That adjacency is the exact shape of the §36 defect, one arm over and still live. A reader takes
the second block for production behaviour because the first one is.

## 3. Latent mis-scopes — real, but lightly cited today

| Arm                                                             | What it actually measures                                                                                                  | Wrong reading it invites                                      |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `--stale-counting-groundtruth`                                  | Errors from `score-pellets.py --real-fixture`'s `current` estimator — the **mean of per-frame detector counts over f8–11** | "the shipped reader's per-shot error against 8.40"            |
| `score-pellets.py --estimators` / `--real-fixture` (count half) | Same `current` control row, self-labelled "existing pipeline"; **never calls `debounce_shots`, never reads `band`**        | "candidate rule X beats the shipped reader by N pellets/shot" |
| `--dump-replay-fidelity`                                        | Per-frame replay of **3 of 4** channels (`_drf_slim` persists white/red/marker only)                                       | "the dump replays at 99.x%" as a whole-schema claim           |
| `--stale-counting` count columns                                | Mean `white` at a **fixed t0+8..11 window** — a third counting rule again                                                  | a shipped per-shot count difference                           |
| `vlm-pellet-test.py`                                            | VLM vs per-frame `white`                                                                                                   | "the VLM agrees with the reader's count"                      |

⚑ `current` is **neither channel** — not the legacy per-shot rule and not the shipped one. It is a
detector-window estimator. Its name and its "existing pipeline" label are the whole problem.

## 4. ⚑ A latent asymmetry that MY OWN LANDING ARMED

`_ps_band(fps, max_pellet_frames, band_hi=None)` is called at **9 sites and only ONE passes
`band_hi`** (`--cap-score:6286`). `--policy-score` (`:4504`, `:4632`) and `--hybrid-landing-audit`
(`:5758`, `:5820`, `:5950`, `:5984`) all compute the band as `[lo, max_pellet_frames]`, so their
"hybrid" numbers describe the **§13/§14** hybrid, not the landed **§16** one.

⛔ **`bad4808e` (this session) added `band_hi` to `_rep_slim_labelled`'s params whitelist** — which
is what makes this reachable, and the failure is asymmetric:

- `--hybrid-landing-audit` **hard-exits** (its equivalence assert compares `_hla_gate_ids`, which
  DOES read `params.band_hi`, against `_ps_band`, which does not) — loud, safe;
- `--policy-score` **silently narrows the band** — quiet, wrong.

⇒ The moment the labelled block is re-dumped at production parameters, that goes live.

⛔ **CORRECTION (2026-08-06, while enacting item 4) — this section originally called the hazard
"INERT today (no committed fixture's source dump persists a `band_hi`)". THAT WAS WRONG, and it was
wrong in the direction that matters.** A direct scan found **two** committed fixtures already
carrying **decoupled** dump-level `band_hi`: `marker-semantics-slice.json`'s dumps (`band_hi` 10 vs
`max_pellet_frames` 7) and `residual-ab-slice.json`'s `dumps[1]` (20 vs 14). ⇒ Threading `band_hi`
through the 8 omitting call sites is **NOT provably inert**, and `_ps_band` feeds
`hybrid_plateau_median`, which backs **§12D's load-bearing 740/112 decomposition assert**. That is
why item 4's fix is **deferred with cause** rather than landed — it needs its own measured
blast-radius pass. The hazard is documented at `_ps_band` itself.

## 5. Stale claims still reading as production truth

- **`docs/probe-runs.md` §9B** still states `35 = 12 owner + 23 non-owner` and the "coincidental
  cancellation" reading as production behaviour. §36C/§37B retract it — **but only in §36/§37.**
- The same figure reads as a live production claim in `2026-08-03-pellet-reader-JUDGE-handoff.md`,
  `2026-08-04-pellet-reader-JUDGE-handoff.md` and `2026-08-06-composition-audit-PRECOMMIT.md`,
  none carrying a retraction banner.
- **`STATE.md:315` and `DECISIONS.md:2913-2916`** merge four different arms into one unattributed
  production sentence ("mislocks ≈0, marker semantics −0.043/shot, `band_hi` +0.50/shot, ~1.4/shot
  residual stands"). ⛔ DECISIONS is CHANGELOG-class — supersede in place, never correct.
- **Five fixtures carry no `_note` at all** (`band-production-ab`, `dump-replay-fidelity`,
  `marker-net`, `marker-semantics`, `radius-gate`) — headline numbers with no stated population.

## 6. ✅ Clean — checked and correct, record so nobody re-checks

- **`--merge-audit`** is legacy-only **by design** and **hard-exits** on a band-carrying dump
  (verified empirically: `_merge_shipped_identity` returns False with `band` present, True
  band-stripped). A safety property, not a defect.
- **`--backend-marker-audit`**: the LIVE arm is band-aware; only the fixture replay is stripped, and
  because `_expected` is written from the live run, regenerating from a band dump **fails loudly**.
- **`--policy-score`'s `shipped_median`** is the pre-hybrid control **on purpose**.
- **`--band-production-ab`, `--marker-semantics`, `--marker-net`, `--radius-gate`, `--cap-score`,
  `--lock-adjudication`, `--hybrid-landing-audit`** — all band-aware; several **refuse** band-less
  dumps outright.
- **`--mislock-rate`, `--fade-screen`, `--hand-count`, `--missing-shots`, `--marker-geometry`** —
  genuinely band-independent (they measure locks, sub-band lifetimes, or onsets, not per-shot counts).
- ✅ **`8.40` is an owner hand-count, not a reader output**, and is unaffected throughout.

## 7. ⛔ THE BATCHED PROPOSAL — owner-approved 2026-08-06; STATUS BELOW

Ordered by value; each is independently landable.

1. **Rebuild §19's A/B as a committed arm** (`--residual-ab` or similar) with a self-validating
   fixture, and make §19E cite that path. ⚑ Until then, **stop quoting `−1.40` as a measurement** —
   and re-express §27C/§31D/§35D's fractions once a reproducible denominator exists. _Highest value:
   it restores the denominator of the whole cold-SG accounting._
2. **Add a one-line channel marker to `--representative-audit`'s stdout** above the policy table
   ("LEGACY pre-hybrid channel — not the shipped reader"). ~2 lines, kills §2's live trap.
3. **Rename `score-pellets.py`'s `current` estimator** to something that does not read as "the
   shipped pipeline" (e.g. `detector_window_mean`), and label the `--stale-counting-groundtruth`
   error table with the estimator it came from.
4. **Pass `band_hi` at the remaining 8 `_ps_band` call sites**, or make the parameter mandatory so
   omission is a hard error rather than a silent narrowing (§4). Do this **before** any re-dump of
   the labelled block at production parameters.
5. **Banner the stale §9B claim** in place, and add the retraction pointer to the three handoffs
   (§5). Cheap; stops the phantom-finding cycle CLAUDE.md's override-prose rule already warns about.
6. **Give the five `_note`-less fixtures a `_source`/`_note`** stating the population their headline
   number describes.
7. **Optional, larger:** re-express `STATE.md:315` with per-claim arm attribution, and supersede
   `DECISIONS.md:2913-2916` in place with an attributed version.

## 8. STATUS — owner approved 2026-08-06, worked through autonomously

| #   | Status                                                                                                                                                                                                                                                                                                                                                          | Where                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 1   | ✅ **DONE — and §19 REPRODUCED to ±0.0000** (band 1). `--residual-ab` + fixture + selftest arm (32 arms). ⚑ Recorded as _consistency_, not confirmation — the pre-commit said so before the number existed.                                                                                                                                                     | `probe-runs` §38, pre-commit `141258da` |
| 2   | ✅ **DONE** — the legacy policy block now says so on stdout.                                                                                                                                                                                                                                                                                                    | `ad54abf4`                              |
| 3   | ✅ **DONE** — `current` corrected at its definition, in the module docstring, and at the point of output. ⚑ The KEY is deliberately NOT renamed (real fixture radius for a labelling item); stated in code.                                                                                                                                                     | `ad54abf4`                              |
| 4   | ⚠ **HALF DONE — hazard documented, fix DEFERRED WITH CAUSE.** Two committed fixtures already carry decoupled dump-level `band_hi`, so threading it is **NOT provably inert**, and `_ps_band` feeds §12D's load-bearing 740/112 assert. ⇒ needs its own measured blast-radius pass. **Do it BEFORE any re-dump of the labelled block at production parameters.** | `be519635`                              |
| 5   | ✅ **DONE** — retraction banners on §9B and three handoffs, scoped to retract only the composition figure.                                                                                                                                                                                                                                                      | `e8bb241c`, `71a13467`                  |
| 6   | ⚠ **MOSTLY DONE** — all five fixtures now carry a population `_note`. ⛔ **Remaining half: the WRITERS do not emit them, so a regeneration drops them.**                                                                                                                                                                                                        | `c2716ecb`                              |
| 7   | ✅ **DONE** — per doc class: `STATE.md` rewritten (current-state), `DECISIONS.md` amended in place (changelog). Every figure now carries arm, basis and n.                                                                                                                                                                                                      | `41ca8b21`                              |

⚑ **Two items are deliberately incomplete and say so.** Item 4's fix and item 6's writer sync are
both filed rather than rushed — item 4 specifically because its radius is measured and non-zero.
