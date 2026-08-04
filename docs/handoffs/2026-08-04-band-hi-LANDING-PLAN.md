# `band_hi = 20` — LANDING PLAN, with the blast radius DECLARED BEFORE THE EDIT

> AI-facing. Written and committed **before any production file is touched**, so the predicted
> fixture movement is a falsifiable prediction rather than a post-hoc rationalization.
>
> Authorizes the landing proposed by
> [`2026-08-04-lifetime-cap-PRECOMMIT.md`](2026-08-04-lifetime-cap-PRECOMMIT.md) §5 and measured in
> `docs/probe-runs.md` §14. **Owner approved 2026-08-04**, and chose **20** on the recommendation in
> that pre-commit's §2.2 (no rounding at either fps; one frame of margin above the longest observed
> owner pellet). Traps and graveyards in the five prior handoffs remain binding.
>
> **Slugs:** `marciana` (SG/Iron — `docs/probes/clean-weapons/marciana-solo.MP4`; **not**
> `marciana-marine-study`, AR/Iron), `noir`, `guilty`, `isabel`.

---

## 1. The change

**Four edits. Nothing else.**

1. `count-pellets.py` — add `--band-hi`, **defaulting to `args.max_pellet_frames`**.
2. `count-pellets.py:517` — build `band_ids` from **`tracks` directly**, not as a subset of
   `pellet_ids`.
3. `count-pellets.py:483` — **hoist the `band` count out of the `pellet_ids` skip** in
   `_frame_pellet_counts`, keeping the radius and non-red conditions.
4. `read-pellets.ts:787` — pass `--band-hi ${Math.max(4, Math.round((20 / 60) * fps))}` (**20** at
   60 fps, **10** at 30 fps; exact at both, no `.5` boundary — pre-commit §2.2).

⚑ Edits 2 and 3 are the RESTRUCTURE. Without them edit 4 is a **silent no-op**: a life-15 track is
not in `pellet_ids`, so it can never reach the band no matter what `band_hi` says.

## 2. ⚑ PREDICTED BLAST RADIUS — **ZERO fixtures move, ZERO pins move**

**This is the prediction. Any deviation is a STOP (§4).**

**The argument, in two steps:**

**(a) At the default, the restructure is provably a no-op.** Today
`band_ids = {tid ∈ pellet_ids : band_lo ≤ life ≤ cap}` and `pellet_ids = {life ≤ cap}`, so
`band_ids = {band_lo ≤ life ≤ cap}` — building it from `tracks` directly with the same bounds yields
the **identical set**. And since every band track is then in `pellet_ids` by construction, the
`pellet_ids` skip never excluded one, so hoisting the count out of it changes **nothing**. ⇒ With
`band_hi` defaulting to `max_pellet_frames`, `count-pellets.py`'s output is **byte-identical** for
every existing caller.

**(b) Only `read-pellets.ts` passes the new value, and no committed fixture runs that path.** Every
`pellet-selftest.sh` arm either replays stored `frame_counts` from a committed slice or re-runs
`count-pellets.py` at its own defaults. `count-pellets.py --cache-selftest` (and therefore
`CACHE_SELFTEST_EXPECT`) does **not** pass `--band-hi` ⇒ **it must not move.** The only vitest
touching `read-pellets.ts` (`scripts/tests/read-pellets-ammo-offset.test.ts`) is a static
source-text check on `ammoOffsetXNative`, unrelated.

| artifact                                      | prediction                                    |
| --------------------------------------------- | --------------------------------------------- |
| every `scripts/tests/fixtures/pellets/*.json` | **UNCHANGED, byte-identical**                 |
| `CACHE_SELFTEST_EXPECT`                       | **UNCHANGED** (`13`→ still `13`, `6.7` fixed) |
| `scripts/regression-snapshot*.json`           | **UNCHANGED** (unrelated subsystem)           |
| all 22 `pellet-selftest.sh` arms              | **PASS, unchanged output**                    |
| `verify.sh`                                   | **PASS**                                      |

⇒ **This landing changes the reader GOING FORWARD, not the committed record.** Existing dumps keep
the `band` values they were extracted with; the improvement appears on the next extraction. That is
the backward-compat design of pre-commit §5, not an oversight.

## 3. Success criteria — pre-stated in pre-commit §5, and how each is checked

| #   | Criterion                                                                      | How                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Categorical recovery in the PRODUCTION path** — the 5 cap-lost owner pellets | Re-run `count-pellets.py --temporal` on the labelled clip's frames (`scratchpad/pellets/groundtruth-f811-v4/frames`, 60 fps) **with** `--band-hi 20` and **without**; the band series must gain exactly the 5 pinned owner tracks (lives 15, 15, 16, 17, 19) and neither static (22, 36) |
| 2   | **`totalShots` and every event onset UNCHANGED** on all 5 dumps                | `read-pellets.ts --debounce-json` / `debounce_shots` over each dump's `frame_counts`; assert `totalShots` and every `start` identical with and without the flag                                                                                                                          |
| 3   | **Pooled MISSED unchanged**                                                    | `--missing-shots-selftest`; it keys on onsets, which criterion 2 pins                                                                                                                                                                                                                    |
| 4   | **Default-path byte-identity** (the §2(a) proof, empirically)                  | `count-pellets.py` output on one dump with no `--band-hi` must be byte-identical before vs after the restructure                                                                                                                                                                         |
| 5   | Both gates                                                                     | `pellet-selftest.sh` (22 arms) + `verify.sh`, TRUE exit codes                                                                                                                                                                                                                            |

⛔ **NOT judged on the cold bias closing** (pre-commit §2.5, §5). No bias-CLOSED verdict may be
stamped under any result — the 8.40 reference question (judge handoff item 2) is unsettled.

## 4. HARD STOPS — do not work around any of these

1. ⛔ **Any fixture or pin moves.** §2 predicts zero. A mover means the change is not understood.
   **STOP and report; do not regenerate.** (Owner pre-authorized regenerating _predicted_
   replay-consistency pins only — and zero are predicted.)
2. ⛔ **Any measured-truth assert moves** — never updated without a new measurement (constraint 5).
3. ⛔ **Criterion 2 fails** (an onset moves). That is the invariant the whole decoupled design exists
   to protect; a failure means edit 2 or 3 leaked into `pellet_ids`.
4. ⛔ Do not touch `debounce_shots`' selection logic, `MERGE_EVENT_MIN`, `marker_min`,
   `pellet_radius`, `_band_lo`, or `max_pellet_frames` itself.

## 5. The `band ⊄ white` consequence — enumerate and fix the record

After edit 3, a life-15 track counts in `band` and not in `white`, so **`band > white` is possible
per frame**. Known consumers of the old invariant — all **documentation**, no asserts found:

- `count-pellets.py:474` — "`a strict subset of `white``" in `_frame_pellet_counts`' docstring
- `count-pellets.py:588` — same phrasing in `debounce_shots`' docstring
- `read-pellets.ts:221` — same phrasing on the `band` field comment

All three must be corrected to state the new relation (a subset of the in-radius non-red tracks,
bounded by `[band_lo, band_hi]`, **which may exceed `white` when `band_hi > max_pellet_frames`**).

⚑ The implementer must **re-run the enumeration** rather than trusting this list — grep for `band`
in both readers and in `analyze-pellet-tracks.py`'s decomposition asserts
(`_ps_assert_hybrid_decomposition`, `--band-equivalence-audit`) and confirm none of them _asserts_
the subset relation. If one does, that is a §4.1 STOP.

## 6. After it verifies

A fresh cross-family **post-op** `/logic-gate` on the diff (`kimi-code/k3`), then the records:
`docs/probe-runs.md` §16, this plan's §7, the judge handoff's §6/§7. ⛔ **Do not push**; ⛔ `main` is
held and `/patch-notes` is owed before anything reaches it — and per constraint 8 this branch lands
via **PR**, never a local merge.

## 7. Result

**2026-08-04 — LANDED. Full narrative: `docs/probe-runs.md` §16.**

**All five §3 success criteria MET.** ⚑ **The §2 blast-radius prediction HELD exactly: ZERO fixtures
moved, ZERO pins moved**, `CACHE_SELFTEST_EXPECT` unchanged at `{9, 6, 6.7, 0.0}`. No §4 hard stop
fired. Cross-family post-op (`kimi-code/k3`, blind): **`ACCEPT`**, no blockers, contamination check
clean.

Criterion 2 turned out to be **guaranteed by construction**, not merely observed: the diff never
touches how `white`/`red`/`marker` are computed, so `totals` and therefore segmentation cannot move.
The new state is genuinely reachable — `band` differs on 979 frames of `h4-marciana-structural`, with
`band > white` on 442.

Three things this pass surfaced that the plan did not anticipate:

1. ⚑ **`band_hi` was not registered in `CACHEABLE_PARAMS`** — a knob that changes a
   `--load-detections` replay's answer, which is exactly the silent-wrong-answer failure that list
   exists to prevent. Fixed in `f67be274` with an optional-key path so pre-`band_hi` caches replay
   byte-identically. The post-op review classified this as cosmetic; it was not (§16D).
2. ⚑ **`--dump-tracks` never carries the `band` series**, so such a dump replays as pre-hybrid and
   cannot exercise this landing. Pre-existing; does **not** affect the production reader, which
   parses `--temporal` stdout. Recorded, not fixed — outside the declared blast radius (§16E).
3. **§5's consumer list was right on substance** — nothing _asserts_ the subset relation, only three
   docstrings claimed it, all corrected — but the plan's shot-4 note undercounted: **two** of the
   five pinned owner tracks belong to shot 4, not one (§16E).

⛔ **No bias-closure claim is made or licensed by this landing** (§3, pre-commit §2.5).
