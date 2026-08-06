# `--representative-audit` → the shipped channel — LANDING PLAN (2026-08-06)

> AI-facing. **Blast radius MEASURED before the edit, not assumed** (the `2026-08-04-band-hi` /
> `2026-08-05-dump-schema` precedent). Owner-approved 2026-08-06. Closes `docs/probe-runs.md` §36's
> open item.
>
> **Slugs.** `marciana` (SG/Iron, `docs/probes/clean-weapons/marciana-solo.MP4` — **not**
> `marciana-marine-study`, AR/Iron), `noir`, `guilty`, `isabel`.

## 1. ⚑ THE ROUTE CHANGED — the originally-described fix was the wrong shape

§36E proposed: widen `_rep_slim_labelled`'s rows to carry `band`, then thread the hybrid selection
in. **The measurement refutes that route on three independent grounds:**

- ⛔ **A — no committed band-carrying source.** All six source dumps the fixture was built on have
  `frame_counts` keys `['marker','red','white']` — `has_band` is **false at the source**, so widening
  the writer would still emit 3-wide rows. The band-carrying re-dumps exist only as **gitignored
  scratchpad**.
- ⛔ **B — any re-dump bundles an unrelated number-mover.** Commit `8d500ff9` changed coordinate
  precision (`xs: 851.2` → `851.2325581395348`) and added `reds`; **11,314 of 11,525 tracks differ on
  that basis alone**. `count-pellets.py:1893` states outright that "a 0.1px rounding step could flip a
  `dist > radius` boundary test on replay" ⇒ regenerating `tracks_raw` is a **known** mover of the
  radius gate, which feeds four more arms. One diff would carry **three** independent changes.
- ⚑ **C — the capability ALREADY EXISTS and needs no fixture body change.** `--hybrid-landing-audit`
  already reconstructs production's real `band` from `labelled.tracks_raw` (`_hla_production_band`
  :5473, calling count-pellets' own `_frame_pellet_counts` in-process), **hard-asserts** it against an
  independent aggregation (`_hla_equivalence` :5498), and feeds it to the real `cp.debounce_shots`
  (`_hla_score` :5516). It passes today.

⇒ **The landing REUSES that reconstruction instead of widening anything.** Row widening is
**abandoned** — which also means the four `for w, r, m in` destructure sites
(`_ps_score_labelled:4364`, `_fs_shot_events:4741`, `audit_hybrid_landing:5583`,
`hybrid_landing_audit_selftest:5775`) are **never touched and cannot crash**.

## 2. The change

1. **`_hla_production_band` honours `band_hi`.** It currently hardcodes the COUPLED pre-§14
   semantics: `band_ids = {tid in pellet_ids if band_lo <= life <= max_pf}` — it ignores
   `params["band_hi"]`. Change the upper bound to `params.get("band_hi", max_pf)` and drop the
   `⊆ pellet_ids` coupling when `band_hi > max_pf`.
2. **`_rep_labelled_report` selects the representative frame and `reader_white` from the hybrid
   answer** — `_hla_score`'s `cp.debounce_shots` on the band-augmented frames — instead of
   `_merge_events`' median-of-`white+red`.
3. **`rep_owner` scores the population the count actually came from**: owner-linked tracks in radius
   at the hybrid rep frame AND in `band_ids` on a banded event / `pellet_ids` on a fallback event.
4. **`life_gate_rejected` is reported BOTH ways** — keep the existing `is_pellet` key unchanged and
   ADD a shipped-channel key. ⚑ Additive, so the legacy number stays auditable and the diff stays
   readable.

## 3. ⛔ BLAST RADIUS — declared before the edit, MEASURED

| Prediction                                                                                                                                                                                                                                                                                                 | Basis                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1** — `_rep_slim_labelled` is NOT modified; labelled rows stay 3-wide; the 4 destructure sites are untouched.                                                                                                                                                                                           | Route C needs no widening (§1).                                                                                                                                                    |
| **P2** — Edit 1 is **INERT on every committed fixture** ⇒ `hybrid-landing-audit-slice.json` **unchanged**.                                                                                                                                                                                                 | `_rep_slim_labelled`'s params whitelist excludes `band_hi`; the fixture's `labelled.params` has no `band_hi`, so `.get("band_hi", max_pf)` = `max_pf` = 13. **Verified directly.** |
| **P3** — `policy-score-slice.json`, `fade-screen-slice.json`, `cap-score-slice.json` **unchanged**.                                                                                                                                                                                                        | They read `tracks_raw`/`cross`/`params`/scalars, never the rep frame. No re-dump occurs.                                                                                           |
| **P4** — ONLY `representative-audit-slice.json`'s `_expected` moves, and ONLY these keys: `decomposition[].rep_offset/rep_owner/rep_non_owner/reader_white`, the same keys in `decomposition_total`, `template_relock[]`, `counted_owner_series[].rep_offset`, `counted_owner_series_relock[].rep_offset`. | All key off `event["rep"]`/`reader_white` (`_rep_decompose:3377-3388`, `_rep_series:3716`).                                                                                        |
| **P5** — **UNCHANGED** in that fixture: `peak_*`, `lifetime_summary`, `white_reconstruction`, `filter_fidelity`, and `owner`/`linked`/`never_detected`/`radius_gate_rejected`/`countable`.                                                                                                                 | Rep-independent. `countable` is "ever in radius", not "at rep".                                                                                                                    |
| **P6** — the pellet selftest stays **31 arms, 31 PASS**; `verify.sh` stays PASS.                                                                                                                                                                                                                           | Measured baseline: 31/31, `verify.sh` PASS in 105 s, tree clean.                                                                                                                   |

⚑ **A deviation from P1–P5 is a STOP, not a fixup.** If any other fixture moves, the change is doing
more than it claims — report it and stop rather than regenerating the extra fixture.

## 4. ⛔ Traps the measurement surfaced

1. ⚑ **`_rep_series:3716` is an unguarded `next(r for r in traj["rows"] if r["is_rep"])`.** If a
   hybrid rep frame lands outside `_rep_trajectory`'s window
   (`[min(event.start, t0-4), max(event.end+3, t0+15))`) it raises **`StopIteration`, not a
   diagnostic**. The hybrid rep frame CAN sit later than the median one. ⇒ **Widen the window or
   raise a real error naming the frame** — do not let a bare `StopIteration` be the failure mode.
2. ⚑ **Two "shipped" definitions will coexist.** `--policy-score`'s `shipped_median` control stays on
   the `_ps_events` median path. `_ps_score_labelled:4408`'s MANDATORY FALSIFICATION CONTROL (shot 4
   `rep_offset == 3`, OUT) sits on that path and will survive unchanged — so the divergence would
   land **silently**. ⇒ Add a comment at both sites naming the other one.
3. **`verify.sh` does NOT run `pellet-selftest.sh`** (measured — it runs typecheck, kit-status,
   nicknames, reload-chunks, doc-drift, sg-geometry, regression, control-regression, vitest,
   overload, doll). ⇒ **The 31 pellet arms are outside the push gate.** Run `pellet-selftest.sh`
   EXPLICITLY; green `verify.sh` alone does not cover this change.

## 5. ⛔ Scope

- ⛔ **No re-dump. No `tracks_raw` regeneration. No row widening.** Those bundle §1's B-problem.
- ⛔ **No constant, default or engine change.** `pellet_radius`, `max_pellet_frames`, `band_hi`
  defaults are untouched — this changes what the AUDIT SCORES, never what the reader emits.
- ⛔ **Regenerate exactly one fixture** (`representative-audit-slice.json`), together with the change
  it reflects — never to silence a failure.
- ⚑ **Tooling surface** — `verify.sh` + `pellet-selftest.sh` are the gate; `/scientific-method` is
  not required (CLAUDE.md SUFFICIENCY §4).

## 6. Done when

`pellet-selftest.sh` 31/31, `verify.sh` PASS, P1–P5 held exactly, and the arm **runs to a report on
band-carrying production dumps** instead of exiting 1 on the shipped-identity control — which is the
observable §36B recorded as the failure.
