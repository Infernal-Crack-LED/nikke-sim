# `--dump-tracks` schema fidelity — LANDING PLAN (2026-08-05)

> **CLOSED (2026-08-05) — LANDED.** per-frame reds + full-precision positions; the record is `docs/probe-runs.md` §26.
> ⚑ **Deliberately still TRACKED, not archived**: `docs/probe-runs.md` is CHANGELOG-class and cites
> this file by path as the plan-of-record (blast radius, gate verdict). Moving it to the gitignored
> `closed/` would dangle that citation. Nothing here is live work — open items are in `QUEUE.md`.

> AI-facing. Executes the fix `docs/probe-runs.md` §25 identified and deliberately did not make.
> **Blast radius below was MEASURED before any production file was touched** (the §16/§23/§24
> convention). Prerequisite for `2026-08-04-pellet-reader-SESSION-JUDGE-handoff.md` §8 item 2
> (marker semantics), and it MUST land before §8 item 7 (re-extraction) or the re-extraction has to
> be done twice.
>
> **Slugs.** Dump names below are dump slugs, not unit slugs. The units behind them are `marciana`
> (SG/Iron, `docs/probes/clean-weapons/marciana-solo.MP4` — **not** `marciana-marine-study`,
> AR/Iron), `noir`, `guilty`, `isabel`. `groundtruth-f811-v4` and `h4-marciana-structural` are both
> `marciana` (SG/Iron).

## 1. The defect

`docs/probe-runs.md` §25, measured over 23,997 frames / 5 dumps / 4 units: re-deriving
`white`/`red`/`marker` from a `--dump-tracks` `tracks.json` does **not** reproduce the
`frame_counts` production emitted. 507 divergent frames; on the marker-bearing population — the one
a marker analysis consumes — **12.20%**. Two mechanisms, `UNEXPLAINED = 0`:

1. **SPLIT (491/507).** `_track_components` writes `is_red` onto a track **once, at creation**, and
   never updates it. `_frame_pellet_counts` classifies using the **per-frame** component's `is_red`
   out of `frame_tracks`. `--dump-tracks` persists only the track-level value.
2. **BOUNDARY (16/507).** `xs`/`ys` are rounded to 0.1 px; a track within a rounding step of
   `pellet_radius`/`marker_radius` lands on the other side of `dist > radius` on replay. All 16 sit
   within 0.0397 px.

Third gap, found while measuring the first: **`marker_radius` is not persisted in `params` at all**,
so every replay silently assumes `count-pellets.py`'s default.

## 2. The change

**Revised after the cross-family pre-op gate (§7).** Edit B is stronger than first drafted, and
edit C acquired the consumers it was missing.

### 2.1 Dump-writer edits (`count-pellets.py`)

| #   | Edit                                                                                                                                                  | Kills                 | Cost (measured) |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | --------------- |
| A   | Carry the **per-frame** `is_red` through `_track_components` onto the track record, and emit it as a dense `reds` array parallel to `xs`/`ys`/`areas` | SPLIT, **exactly**    | **+10%**        |
| B   | Store `xs`/`ys` at **FULL precision (drop `round(v, 1)` entirely)**                                                                                   | BOUNDARY, **exactly** | **+19–22%**     |
| C   | Persist `marker_radius` **and** `band_hi` into the dump's `params` block                                                                              | the silent assumption | negligible      |

⚑ **Edit B is full precision, not 2 dp — and that is the gate's doing.** 2 dp only _shrinks_ the
flip window to ~±0.007 px; it cannot make `n_divergent == 0` provable, because the dump does not
record the true pre-rounding distance, so no measurement on existing dumps can rule out a residual
flip. Full precision removes the mechanism **by construction** instead of shrinking it: replay then
computes `math.hypot` over the same float64s production used.

⚑ **This is exact only because `cross_positions` carries NO rounding error.** Verified, not assumed:
`count-pellets.py:1862` writes the list unrounded, and every stored value on both
`h4-marciana-structural` (n=5473) and `groundtruth-f811-v4` (n=1801) is **integer-valued** — the
localizers emit integer pixel coordinates. So `xs`/`ys` were the only lossy term.

### 2.2 Consumer edits — ⚑ WITHOUT THESE THE LANDING IS A NO-OP

The pre-op gate caught a silent no-op in **both** prior landing plans in this thread (§24E, §16), and
flagged the same shape here: **a schema field nothing reads changes nothing.** So:

| #   | Edit                                                                                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | `_drf_frame_tracks` (§25's own arm) consumes `reds` when present                                                                                                                                    |
| D2  | `_hla_reconstruct_frame_tracks` (band-equivalence / hybrid-landing audit) consumes `reds` when present                                                                                              |
| D3  | `_drf_load_dump` resolves marker radius as `params.get("marker_radius", 65)`, still overridable by `--fidelity-marker-radius` — otherwise edit C persists a value **nothing reads** (the gate's R1) |
| D4  | `_hla_production_band` stops hardcoding `marker_radius=65` in its `SimpleNamespace` in favour of the same persisted-with-fallback resolution                                                        |

- **D1/D2 both fall back to track-level `is_red` when `reds` is absent** — the backward-compat
  contract §4 rests on.
- **⚑ D4's output impact today is ZERO and the plan says so rather than overclaiming:**
  `_hla_production_band` returns only `band`, and `band` is gated on `not is_red` without ever
  consulting `marker_radius`. D4 is a provenance-correctness edit that removes a hardcoded constant
  which would silently be wrong if that function is ever extended to return `marker`.
- **D1/D2 read `reds` defensively** (`reds[k] if reds and k < len(reds) else t["is_red"]`), so a
  malformed or hand-built dump degrades to today's behaviour instead of `IndexError`-ing mid-audit.

## 3. Scope boundary — what is deliberately NOT touched

Eleven other sites read `t["is_red"]` (`analyze-pellet-tracks.py`
113/149/277/365/3914/3942/3965/5399/5566/5625/6536; `score-pellets.py` 1125/1294). Those ask a
**track-level classification** question ("the white tracks near the crosshair"), not a **per-frame
channel counting** question. A track that flips colour mid-life has no single right answer at the
track level, and changing them would move committed fixtures for no measured reason.

⚑ **The consequence, recorded rather than discovered later (gate blast-radius note):** after this
landing those sites read a creation-time value that the dump itself now demonstrably contradicts on
SPLIT frames. Any FUTURE arm built on them inherits the 12.20% mislabel §25 measured. **Note this in
`analyze-pellet-tracks.py`'s `--dump-replay-fidelity` section comment** so the next pass does not
rediscover it.

## 4. Known-unknowns, with their decision rules pre-committed

1. **`band` replay divergence is unmeasured.** `band` rides the same SPLIT mechanism, but **no dump
   on disk carries `band` in `frame_counts`** — every one predates §23. The §5 acceptance dump is the
   **first post-§23 dump**, so acceptance step 3 doubles as the first-ever `band`-divergence
   measurement. **Pre-committed rule (gate risk-flag):** a nonzero `band` divergence on the NEW dump
   after edit D is **outside these edits' scope** — it does **NOT** block the landing; it is
   RECORDED as a new finding in §25's follow-up and raised to the owner. A nonzero `band` divergence
   would only block if it also breaks the `white`/`red`/`marker` acceptance in step 3.
2. **`reds` is parallel to `xs` only because a track can never resume after a missed frame** (the
   tracker matches on `last_frame == fi - 1` only). It holds on the current code and **no test pins
   it**. The implementation must therefore append to `reds` in **both** tracker branches
   (matched-track and new-track) — a one-sided append misaligns `reds` against `xs` silently.
   **Add an assert** in the dump writer that `len(reds) == len(xs)` for every track.
3. **Re-run determinism is assumed** (same frames ⇒ same detections ⇒ same tracks). Acceptance step 2
   tests it explicitly rather than assuming it.

## 5. Acceptance test — pre-committed, and step 4 is what catches a no-op

`groundtruth-f811-v4`'s 1801 frames are on disk, so the counter re-runs **without ffmpeg and without
the VLM**: `count-pellets.py <frames_dir> --temporal --dump-tracks <new path> …` (~90 s at the logged
~49 ms/frame). ⛔ Write to a **NEW** directory — never overwrite an existing dump.

1. **Re-dump `groundtruth-f811-v4` with the fix**, into a new path, mirroring the original run's
   flags exactly (read them off the original dump's `params` + the original run log).
2. **DETERMINISM CONTROL, before reading anything else.** The new dump's `frame_counts` must equal
   the old dump's `frame_counts` **frame for frame**. These edits cannot change what production
   counts (§6), so any difference here is re-run drift and **invalidates the acceptance read** —
   STOP and report rather than interpreting step 3.
3. **`--dump-replay-fidelity` on the NEW dump ⇒ `n_divergent == 0`.** Provable by construction now:
   `reds` is exact (booleans), and full-precision `xs`/`ys` against integer `cross_positions` make
   replay arithmetic bit-identical to production's. Today the same dump gives **15** (13 SPLIT,
   2 BOUNDARY).
4. ⚑ **A landing that leaves step 3 at 15 is the NO-OP this section exists to catch.** Report the
   number, never "it looks right".
5. **BACKWARD-COMPAT CONTROL:** `--dump-replay-fidelity` on an **untouched old dump** must still
   report its §25A number exactly (`h4-marciana-structural` = **89**, 88 SPLIT / 1 BOUNDARY). Fails
   if the fallback broke; cannot pass vacuously.
6. `bash scripts/probe/pellet-selftest.sh` (26 arms) and `bash scripts/verify.sh` green, **zero
   fixtures regenerated**.

## 6. Blast radius — MEASURED, declared before the edit

| Claim                                                       | How it was checked                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Production is UNAFFECTED — zero shots, zero counts move** | `read-pellets.ts:790` drives production off `--temporal` **stdout**; it only ever _passes_ `--dump-tracks` through (`:782–787`) and never **reads** the file. `count-pellets.py:1852` writes the dump **after** `--temporal`'s results are built. A dump-writer edit cannot reach the counting path.                                                       |
| **ZERO committed fixtures move**                            | Additive + optional: `reds` absent ⇒ fall back to track-level `is_red`, byte-identical to today. The four fixtures holding `is_red` (`h1-cache-slice`, `real-fidelity-slice`, `run16-tracks-slice`, `synthetic-fidelity-slice`) plus `dump-replay-fidelity-slice` all predate `reds`. Same precedent as `band_hi`'s `CACHEABLE_PARAMS_OPTIONAL` carve-out. |
| **Every existing dump on disk still replays**               | Same fallback. No dump is invalidated by this landing.                                                                                                                                                                                                                                                                                                     |
| **Other `tracks.json` consumers unaffected**                | `temporal-count-regression.py`, `make-groundtruth-f811.py`, `vlm-pellet-test.py`, `make-synthetic-pellets.py`, `count-pellets.py --ammo-series` — none reads `reds`, all tolerate an extra key; `params` gains keys, none removed or renamed.                                                                                                              |
| ⚑ **`_track_components` IS on the live production path**    | Gate blast-radius note, and the plan no longer says "all edits are in the dump writer". Edit A appends to `reds` on every run, production included. Functionally inert (nothing reads it until the writer), but a one-sided append misaligns silently — hence §4.2's mandatory assert.                                                                     |
| **Size cost**                                               | Measured per-dump, **not** quoted as a global constant: A +10%, B +19–22% on `h4-marciana-structural` (9.2 MB) and `groundtruth-f811-v4` (2.8 MB). Scales with `sum(track life)`.                                                                                                                                                                          |
| **New dumps are not byte-comparable to old ones**           | Gate note: full-precision `xs`/`ys` vs 1 dp breaks any rounding-sensitive cross-dump diff. No such tool exists today; recorded so one is not built on the assumption.                                                                                                                                                                                      |

## 7. Cross-family pre-op gate — VERDICT, quoted at receipt

**`kimi-code/k3`** (driver is Claude ⇒ cross-family per `/logic-gate` routing), packet
`scratchpad/gates/2026-08-05-dump-schema/preop-packet.md`, verdict
`scratchpad/gates/2026-08-05-dump-schema/preop-verdict.json`. ⚑ Both live in the **gitignored**
scratchpad — trap 6 of the 08-04 session handoff (the last session's four gate artifacts were LOST
with the worktree), so the substance is quoted **here, at receipt**, and no conclusion depends on
the files surviving.

**`APPROVED-WITH-REVISIONS`.** All four revisions executed:

| Gate revision                                                                                                                  | Disposition                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1 — "Edit C only PERSISTS `marker_radius`/`band_hi`; no consumer READS them. That is the exact no-op shape §3 names."         | **ACCEPTED** ⇒ new edits **D3** (`_drf_load_dump`) and **D4** (`_hla_production_band` stops hardcoding 65). D4's current output impact stated as ZERO rather than overclaimed.                                     |
| R2 — "Verify `cross_positions` is full precision, or edit B cannot kill BOUNDARY."                                             | **RESOLVED IN THE PLAN'S FAVOUR, by measurement:** every stored value on both dumps is **integer-valued**. `xs`/`ys` were the only lossy term. Now stated in §2.1 instead of assumed.                              |
| R3 — "2 dp leaves a ~±0.007 px residual window; `n_divergent == 0` may be unattainable. Restate the threshold BEFORE landing." | **ACCEPTED, and answered by strengthening the fix rather than weakening the bar:** edit B became **full precision**, which removes the mechanism by construction. `n_divergent == 0` is now provable, not hopeful. |
| R4 — "Read `reds` defensively rather than blind-indexing."                                                                     | **ACCEPTED** ⇒ §2.2's fallback expression, plus §4.2's `len(reds) == len(xs)` assert at dump time.                                                                                                                 |

Gate blast-radius notes and risk flags folded in: `_track_components` is on the live path (§6);
the eleven out-of-scope `is_red` sites now read a value the dump contradicts (§3, with a required
code comment); new dumps are not byte-comparable to old (§6); the `band` known-unknown got a
**pre-committed decision rule** (§4.1); the determinism assumption became **acceptance step 2**
(§5); the size figures are quoted per-dump, not globally (§6).

The gate's `simplerPath` was `null`.

## 8. Hard stops

- ⛔ **Do NOT overwrite any existing dump** in `scratchpad/pellets/`. New dumps go to new paths —
  §25's population is the evidence.
- ⛔ **Do NOT touch** `MARKER_MIN`, `debounce_shots` (either implementation), `read-pellets.ts`'s
  counting path, or any constant/gate/threshold/default. This landing changes a **diagnostic dump's
  schema** and four **analysis** call sites. Nothing else.
- ⛔ **Do NOT regenerate a committed fixture.** If one moves, the additive-and-optional contract is
  broken — **STOP and report**, do not `--update`.
- ⛔ **Do not adjudicate marker truth.** Whether `MARKER_MIN = 2` should be met by UI-banner glyphs
  is §8 item 2 of the session handoff, a separate pass with its own blast radius. This landing only
  makes the substrate faithful enough to ask the question.
- ⛔ **No verdict on the cold bias.** Nothing here touches it.
