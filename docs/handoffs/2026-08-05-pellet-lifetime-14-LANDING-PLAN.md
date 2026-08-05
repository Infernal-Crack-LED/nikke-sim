# Pellet lifetime 13 → 14 — LANDING PLAN (2026-08-05)

> AI-facing. Enacts the OWNER-MEASURED correction recorded in `docs/probe-runs.md` §28D/E.
> **Blast radius below was MEASURED by actually toggling the constant and running the gate**, before
> any production file was touched — not reasoned about. See §4.
>
> **Slugs.** `marciana` (SG/Iron, `docs/probes/clean-weapons/marciana-solo.MP4` — **not**
> `marciana-marine-study`, AR/Iron), `noir`, `guilty`, `isabel`. Names like
> `h4-marciana-structural` / `groundtruth-f811-v4` are dump slugs, not unit slugs.

## 1. What is being corrected, and by what evidence

**Owner measurement, 2026-08-05:** a pellet lasts **14 native frames, not 13** — a correction to the
lifecycle spec that has governed every `max_pellet_frames` derivation in this thread. The same
measurement gives the hit-marker VFX as 14 native frames (that half is §28A/B/C's business, not this
plan's).

⚑ **Constraint 3 says measured constants are never REFIT. This is not a refit** — it is the owner
correcting the measured value itself, the highest evidence tier available here, and the same shape as
§18's owner-confirmed 8.40 reference. It still lands under the normal discipline: declared blast
radius, gate, controls.

## 2. Why this goes FIRST, before the two open marker items

§28C's ceiling-exclusion channel is **defined relative to `max_pellet_frames`** — it counts red
near-crosshair tracks whose life exceeds that cap — so netting it against §27's false-flag channel
should happen on a corrected cap. Same sequencing lesson §26 recorded: land the substrate
correction, then measure on it.

⚑ **Correction after the pre-op gate: the urgency of that argument was OVERSTATED and is withdrawn.**
At the production 30 fps sampling the cap is **7 either way**, so §28C's 164-track census does **not**
move with this landing and would not have to be redone. This goes first because it is cheap,
correct-first hygiene that retires a documented trap (§5) — **not** because it unblocks §28C.

## 3. The change

| #   | Site                                                                                 | Edit                                                            |
| --- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| A   | `read-pellets.ts:790` — the LIVE production derivation                               | `Math.round((13 / 60) * fps)` → `(14 / 60)`                     |
| B   | `analyze-pellet-tracks.py:2725` `_merge_max_pellet_frames`                           | `math.floor((13 / 60) * fps + 0.5)` → `(14 / 60)`               |
| C   | `read-pellets.ts:6`, `analyze-pellet-tracks.py:453`, `make-synthetic-pellets.py:19`  | doc/comment text `13` → `14`                                    |
| D   | `make-groundtruth-f811.py:10/45/70`                                                  | the hardcoded `--max-pellet-frames 13` → `14` (a 60 fps script) |
| E   | ⚑ **`score-pellets.py:246` and `:377`** — two explicit `'--max-pellet-frames', '13'` | → `'14'`                                                        |
| F   | `_merge_max_pellet_frames`'s docstring                                               | the `.5`-tie workaround note is now HISTORICAL — see §5         |

⚑ **Edit E was MISSED by the first draft and found by the pre-op gate's demand for a stated
repo-wide grep** (revision 3). The plan's completeness had been resting on an unstated search. The
grep is now stated and its full result is §4.1.

⚑ **Edit D must also update the inline comment at `make-groundtruth-f811.py:45`**
(`# ... a full pellet is exactly 13 frames at this fps`) **and `:70`**
(`# 13 native frames at 60fps sampling == 1 game frame each`). The second one's _rationale_ is tied
to the value, so changing the number and leaving the justification stale recreates exactly the trap
edit F retires (gate revision 4).

⚑ **Edit F must also fix a STALE ANCHOR in the same docstring** (gate revision 2): it cites
`read-pellets.ts:505`, but the derivation is at **`read-pellets.ts:790`**. Trading one stale fact
for another is not a fix — **cite the function/expression without a line number** so it cannot rot
again.

⛔ **`docs/data/damage-calculation.md:302`'s `+ 13 frames` is the RELOAD constant and is UNRELATED.
Do not touch it.** It matches the same grep and is the obvious mis-edit.

## 4. Blast radius — MEASURED, not assumed

Method: set edit B to `14`, run `scripts/probe/pellet-selftest.sh` (27 arms), diff the one failing
arm's `_expected` against what it produced, then revert (verified byte-identical with `cmp`).

**Exactly ONE arm moves: `--merge-audit`. Exactly TWO dumps inside it move, both 60 fps.**

| dump                     | fps | `max_pellet_frames` | `n_over_max_pellet_frames`   |
| ------------------------ | --- | ------------------- | ---------------------------- |
| `h4-isabel-structural`   | 30  | 7 → **7**           | 20 → **20**                  |
| `h4-guilty-structural`   | 30  | 7 → **7**           | 13 → **13**                  |
| `h4-marciana-structural` | 30  | 7 → **7**           | 17 → **17**                  |
| `g2-noir-structural`     | 30  | 7 → **7**           | 31 → **31**                  |
| `groundtruth-f811-v4`    | 60  | 13 → **14**         | 22 → **11**                  |
| `i3-noir-near-60fps`     | 60  | 13 → **14**         | 7 → **7**                    |
| **pooled**               |     |                     | 110 → **99** (51.4% → 46.3%) |

⚑ **What does NOT move, verified field by field:** every candidate's `MISSED`, `SPURIOUS`,
`n_detected`, `n_valid`, `spurious_unexplained`, `sum_valid_total` — on **every** dump — and the
entire pooled `candidate_view` block (`MISSED_pct`, `avgTotal`, `avgTotal_change`) is
**byte-identical**. `n_events`, `n_ammo_shots`, `n_over_cadence`, `max_span`, `over_span_shipped_*`
and the arbiter figures are all unchanged.

⇒ **The constant reaches only a DIAGNOSTIC CENSUS** — the count of events whose span exceeds a
per-blob track cap, which `_merge_max_pellet_frames`'s own docstring already flags as a **category
error displayed for contrast** (§8A). It changes **no** segmentation, **no** counting, **no**
candidate ranking, and **no** `avgTotal`.

| Claim                                                                 | Basis                                                                                                                                                                                                                        |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Every 30 fps production dump is untouched**                         | `max(4, JS-round(L/60 × 30))` = **7 for both 13 and 14**. Confirmed empirically on all four dumps above.                                                                                                                     |
| **No measurement in §§14–27 moves**                                   | All of them are 30 fps production dumps. Follows from the row above.                                                                                                                                                         |
| **ONE committed fixture regenerates: `merge-audit-slice`**            | It is the only arm that failed. Its `_expected` moves in exactly the `max_pellet_frames` / `n_over_max_pellet_frames` / `over_max_pellet_frames_pct` fields.                                                                 |
| **`representative-audit-slice` / `stale-counting-slice` do NOT move** | §28E named them as at-risk because they store `max_pellet_frames: 13`. ⚑ **That was wrong** — they store it as a DUMP PARAM (what the dump was made with), which this edit does not retroactively change. Their arms passed. |
| **`band_hi` is unaffected**                                           | Decoupled from `max_pellet_frames` since the §16 landing; derived from its own `20 / 60`.                                                                                                                                    |
| **`REP_OWNER_LIFE_LO_60FPS = 8` is unaffected**                       | That is the owner's pellet-COUNT floor for the band, a different quantity from the lifetime.                                                                                                                                 |

### 4.1 The stated repo-wide grep (gate revision 3) — every pellet-lifetime `13` in the tree

`grep -rnE "max-pellet-frames.{0,6}13|13 ?/ ?60|13 native|13 frames at"` over `*.ts`/`*.py`/`*.sh`/`*.md`,
excluding `node_modules`, `docs/probe-runs.md` and `docs/handoffs/` (CHANGELOG-class and AI-facing
history — those RECORD the old value and must keep it):

| Hit                                                       | Disposition                       |
| --------------------------------------------------------- | --------------------------------- |
| `read-pellets.ts:6`, `:790`                               | edits C, A                        |
| `analyze-pellet-tracks.py:453`, `:2713`, `:2722`, `:2725` | edits C, F, F, B                  |
| `make-groundtruth-f811.py:10`, `:45`, `:70`               | edit D                            |
| `make-synthetic-pellets.py:19`                            | edit C                            |
| **`score-pellets.py:246`, `:377`**                        | **edit E — the missed site**      |
| `docs/data/damage-calculation.md:302`                     | ⛔ RELOAD constant — DO NOT TOUCH |

**No other hit exists.** ⚑ There is **no `v5` generator** — `groundtruth-f811-v5-schemafix` was
produced by invoking `count-pellets.py` directly with flags read off the v4 dump, not by a committed
script, so §28D's "v4/v5 built one frame short" has exactly one code owner (edit D) plus a dump on
disk that this landing deliberately does not touch (§7).

### 4.2 Edit A's exposure — MEASURED, closing the gate's revision 1

⚑ **The §4 toggle exercised only edit B (the Python mirror); the TypeScript derivation was never
toggled**, so the "MEASURED" claim did not originally cover edit A. Closed by direct search rather
than by argument:

- `grep -rn "max-pellet-frames\|maxPelletFrames" scripts/tests/ web/` → **no hits.** Nothing pins
  the TS-built command string or the derived value.
- The two vitests that touch `read-pellets.ts`
  (`read-pellets-ammo-offset.test.ts`, `read-pellets-backend-select.test.ts`) reference neither the
  flag nor the constant.

⇒ **Edit A has zero test exposure.** It changes what a FUTURE production run passes to
`count-pellets.py`; no committed artifact records it.

### 4.3 Edit E's exposure — MEASURED

Toggled both `score-pellets.py` literals to `14` and ran all four of its selftest arms
(`--selftest`, `--audit-fidelity-selftest`, `--audit-fidelity-real-selftest`,
`--audit-centering-selftest`): **all four PASS.** They replay committed slices rather than
re-invoking the counter, so the flag sits on a live-run path the fixtures do not exercise. Reverted,
`cmp`-verified byte-identical.

## 5. ⚑ THE PART THAT IS NOT JUST A NUMBER — a documented trap is retired

`(13/60) × 30 = 6.5` lands **exactly** on the JS-half-up / Python-half-to-even tie: 7 in the shipped
pipeline, 6 from a naive Python port. That is trap 1 of the 08-04 session handoff, and
`_merge_max_pellet_frames` carries a bespoke `math.floor(x + 0.5)` **specifically to reproduce the JS
answer**.

`(14/60) × 30 = 7.0` is not a tie in either language. **The correction removes the defect the
workaround exists for.**

⛔ **Keep the `floor(x + 0.5)` form anyway** — it is still the correct way to mirror JS `Math.round`
for any other fps, and removing it would re-introduce the hazard the moment someone runs at an fps
where the product lands on a `.5`. **Rewrite the docstring** so the tie is described as
_historical_ (why the form exists) rather than _live_ (something `13` currently triggers). A future
reader must not conclude the hazard is active at 30 fps when it no longer is.

## 6. Acceptance test

1. Apply edits A–E.
2. `pellet-selftest.sh` — **`--merge-audit` must be the ONLY arm that fails**, and it must fail with
   exactly the §4 deltas. Any other arm failing means the blast radius was wrong ⇒ **STOP and
   report**.
3. Regenerate **only** `merge-audit-slice.json`, together with the change it reflects (constraint 5).
   Diff its `_expected`: **only** `max_pellet_frames`, `n_over_max_pellet_frames` and
   `over_max_pellet_frames_pct` may move, and only on the two 60 fps dumps. Any other field moving
   ⇒ **STOP**.
4. `pellet-selftest.sh` (27 arms) and `bash scripts/verify.sh` green.
5. **30 fps INVARIANCE CONTROL — run it as a literal command and paste the output** (gate risk
   flag 3); do not eyeball it. The entire "30 fps is inert" conclusion rests on this one line:

   ```sh
   python3 -c "import math
   for L in (13,14): print(L, max(4, math.floor((L/60)*30+0.5)), max(4, math.floor((L/60)*60+0.5)))"
   ```

   Already run pre-landing, and this is the expected output — it must still hold after:

   ```
   13 7 13
   14 7 14
   ```

## 7. ⛔ Hard stops

- ⛔ **Do NOT touch `docs/data/damage-calculation.md:302`** — that `13` is the reload constant.
- ⛔ **Do NOT re-dump or re-extract anything.** Existing dumps keep the `max_pellet_frames` they were
  made with; this changes what FUTURE runs derive. Re-extraction is a separate queued item.
- ⛔ **Do NOT regenerate any fixture other than `merge-audit-slice.json`.** If another moves, the §4
  blast radius is wrong — STOP, do not `--update` past it.
- ⛔ **Do NOT remove the `floor(x + 0.5)` form** (§5).
- ⛔ **Do not touch `MARKER_MIN`, `debounce_shots`, `band_hi`, `REP_OWNER_LIFE_LO_60FPS`** or any
  other constant.
- ⛔ **No verdict on the cold bias**, and no re-scoring of §27/§28.

## 8. Cross-family pre-op gate — VERDICT, quoted at receipt

**`kimi-code/k3`** (driver is Claude ⇒ cross-family per `/logic-gate` routing). Packet
`scratchpad/gates/2026-08-05-pellet-14/preop-packet.md`, verdict `…/preop-verdict.json`. ⚑ Both live
in the **gitignored** scratchpad — trap 6 of the 08-04 handoff (four gate artifacts were lost with a
worktree), so the substance is quoted **here, at receipt**, and no conclusion depends on the files
surviving.

**`APPROVED-WITH-REVISIONS`.** All four revisions executed:

| Gate revision                                                                                                                                                    | Disposition                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1 — "§4's toggle-and-run exercised ONLY edit B. Edit A, the LIVE derivation, was never toggled, so 'MEASURED' does not cover the TS side."                      | **ACCEPTED — a real hole in my own evidence claim.** Closed by search, not argument: **§4.2**. No test or snapshot pins the TS command or the derived value; edit A has zero test exposure.                                                                  |
| R2 — "Edit F's docstring rewrite must also fix the STALE ANCHOR (`read-pellets.ts:505` vs the real `:790`); trading one stale fact for another is not a fix."    | **ACCEPTED** ⇒ §3 now requires citing the function/expression **without a line number**, so it cannot rot again.                                                                                                                                             |
| R3 — "The plan's completeness rests on an unstated grep. State it and enumerate every hit."                                                                      | **ACCEPTED, and it FOUND A MISSED SITE.** The stated grep (**§4.1**) surfaced `score-pellets.py:246`/`:377`, now **edit E**, with its own measured exposure (**§4.3**, all four arms pass). It also resolved the v5 loose end: there is **no v5 generator**. |
| R4 — "`make-groundtruth-f811.py:45`'s comment justifies itself with the value; changing the number and leaving the rationale recreates the trap edit F retires." | **ACCEPTED** ⇒ folded into edit D explicitly, for both `:45` and `:70`.                                                                                                                                                                                      |

**Also accepted — the gate corrected an OVERCLAIM of mine.** Its `assumptionsFlagged` #3 noted that
§2's sequencing urgency was overstated: at 30 fps the cap is 7 either way, so §28C's census does not
move with this landing and would not have to be redone. **§2 now withdraws that argument** and
rests the ordering on cheapness plus §5's trap retirement instead.

The gate's `simplerPath` was `null`, and it recorded that none of the three prior-gate failure modes
recur here: not a silent no-op (the 60 fps census verifiably moves), not an unchecked mechanism (the
radius was toggled-and-run), not a persisted-param-nobody-reads (the constant feeds a live CLI arg).
