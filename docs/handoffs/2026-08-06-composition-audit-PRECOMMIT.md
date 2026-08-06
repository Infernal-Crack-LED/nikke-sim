# The composition audit — PRE-COMMIT (2026-08-06)

> AI-facing. **Committed BEFORE any number exists** (the `2026-08-04-mislock-rate-PRECOMMIT.md` /
> `2026-08-05-marker-semantics-PRECOMMIT.md` / `2026-08-05-radius-gate-PRECOMMIT.md` precedent).
> ⚑ Written in explicit response to `2026-08-06-radius-gate-JUDGE-verdict.md` §5, which found the
> last pre-commit's controls did not cover the confound that mattered. §4 below is that repair.
>
> **Slugs.** `marciana` (SG/Iron, `docs/probes/clean-weapons/marciana-solo.MP4` — **not**
> `marciana-marine-study`, AR/Iron), `noir`, `guilty`, `isabel`. `*-schemafix` / `*-v6-landed` are
> dump slugs, not units.

## 1. Why this is the item

`representative-audit-slice.json` is the only owner-anchored decomposition of the reader's count in
the repo. On the labelled clip it reports **`rep_owner` 12, `rep_non_owner` 23, `reader_white` 35
against `owner` 42** — i.e. two thirds of what the reader counts is not an owner-labelled pellet,
and on **3 of 5 shots the count contains ZERO owner pellets** while still landing near the true
total. If that survives, the reader's count is a proxy that only coincidentally tracks pellets.

⛔ **But that fixture is at a superseded configuration** (`max_pellet_frames: 13`, no `band_hi`),
i.e. it predates the `band_hi` landing (§14/§16), the schema fix (§26) and the 13→14 lifetime
landing (§29). **The landed 60 fps config is `--max-pellet-frames 14 --band-hi 20`**, from
`read-pellets.ts`'s `max(4, round(14/60 * fps))` / `max(4, round(20/60 * fps))` — confirmed against
the 30 fps production dumps, which carry 7 and 10. No existing 60 fps dump of the labelled clip is
at that config.

**The question: at the LANDED config, is the reader's per-shot count made of the owner's pellets?**

## 2. The measurement

Regenerate the two 60 fps dumps of the labelled clip **from the frames already on disk** (no video
re-extraction) at `--max-pellet-frames 14 --band-hi 20`, everything else identical to
`groundtruth-f811-v5-schemafix` — one `--locate structural`, one `--locate template` (shot 4's crops
were cut with the template crosshair). Then run `analyze-pellet-tracks.py --representative-audit`
against them plus the four 30 fps production dumps.

⚑ **Reuse, not derivation:** the instrument, the owner labels, the frames and the fixture all
already exist. Nothing here generates new ground truth and no owner time is spent.

## 3. ⛔ Decision bands — committed before any number exists

Let, pooled over the 5 labelled shots that carry pellets:

- **`P` = `rep_owner` / `reader_white`** — the share of what the reader counts, at the frame it
  actually counts, that is an owner-labelled pellet;
- **`S`** = how many of the 5 shots have `rep_owner == 0`.

⚑ **The verdict is read off `P` and `S` — COMPOSITION — never off the total.** A total that moves
toward 42 proves nothing about identity; that conflation is exactly what let §22C conclude "a bad
lock does not cost pellets" while a bad lock was rejecting 7 of 9 real ones.

| Outcome                       | Verdict                                                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `P ≥ 0.80` **and** `S = 0`    | **COMPOSITION IS SOUND** at the landed config. The count is made of pellets; the residual is a magnitude problem, not an identity one. Close the thread and say so.                  |
| `0.50 ≤ P < 0.80`, or `S = 1` | **PARTIALLY REPAIRED.** Record. The landed config improved identity but a substantial share of the count is still not pellets.                                                       |
| `P < 0.50` **or** `S ≥ 2`     | ⚑ **THE COUNT IS NOT MADE OF PELLETS.** Then every per-shot number derived from the reader (§30B's +0.50, §22C's severity, §31's −0.043) is measuring a proxy. Becomes the top item. |

Prior values for reference (pre-`band_hi`, so NOT a prediction): `P` = 12/35 = **0.34**, `S` = **3**.

**Secondary, reported but NOT verdict-bearing:** the ceiling `corrected_countable_total` vs
`owner` = 42, and how the shortfall splits across `never_detected` / `life_gate_rejected` /
`radius_gate_rejected` / frame selection.

## 4. ⛔ Falsification controls — any one firing VOIDS the corresponding claim

- **CONTROL A — CONFIG.** If the regenerated dumps' `params` are not exactly
  `max_pellet_frames == 14` and `band_hi == 20`, or tracks lack the post-schemafix `reds` key, the
  run measured the wrong configuration ⇒ **VOID**.
- **CONTROL B — LINKAGE.** If `never_detected > 0`, or `linked != owner` on any shot, the owner→track
  linking changed under the new config ⇒ **`rep_owner` is not comparable to the prior run**; VOID the
  comparison (absolutes may still be reported).
- **CONTROL C — RECONSTRUCTION.** If `white_reconstruction.mismatched > 0` the audit cannot reproduce
  the reader's own count from the dump, so no decomposition of that count is trustworthy ⇒ **VOID**.
- **CONTROL CHANNEL — ⚑ THE CHANNEL CONFOUND (the §35 repair).** `_rep_decompose` classifies
  `life_gate_rejected` from `is_pellet`, which `count-pellets.py:1887` sets as
  `life <= max_pellet_frames`. **`band_hi` gates a DIFFERENT population (`band_ids`).** If the
  shipped count is built from `band` rather than `pellet_ids`, then the audit's life gate scores a
  channel production no longer uses, and any `life_gate_rejected` figure is an artifact of the
  audit's own definition rather than a production defect. ⇒ **A blind premise-verification pass is
  running on exactly this question. Until it returns, NO reading of `life_gate_rejected` is
  admissible**, and the composition verdict (`P`, `S`) must be stated independently of it.
- **CONTROL PASSENGER — MISLOCK.** Shot 4 is `locate: "template"`. Every pooled figure is reported
  **both** as-scored and with the `template_relock` correction, never silently one of them.

## 5. ⛔ Scope

- ⛔ **NOTHING IS ENACTED**, regardless of outcome. No constant, no default, no instrument change, no
  fixture regeneration. `scripts/tests/fixtures/pellets/representative-audit-slice.json` is left
  **byte-identical** — it pins a different configuration on purpose and is not this pass's to update.
- ⛔ **This is ELIMINATION, not confirmation.** n = **5 shots, one clip**, and these are the labels
  the reader was tuned against (§19D). It can show the count is not made of pellets; it cannot
  certify that any config makes it so. Same honest limit the 2026-08-01 counting-window sweep stated.
- ⛔ **No ranking against interval-carrying estimates.** Any per-shot rate from n=5 is reported with
  its n attached and is not called "the largest channel" — the judge verdict's §3 finding.
- ⚑ **This surface is TOOLING, not a damage-model value** — `verify.sh` plus the existing fixtures
  are its gate; `/scientific-method` is not required (CLAUDE.md SUFFICIENCY rule §4).

## 6. What would be sufficient, stated up front

To report the composition defect as REAL: **`P < 0.50` or `S ≥ 2`, with Controls A, B, C and
PASSENGER all passing, at a config verified `14`/`20`.** That is the whole bar. If it is met, record
it and stop —
a further conceivable experiment is not a reason to withhold. If `P ≥ 0.80` and `S = 0`, the thread
closes and the cold-SG hunt moves to magnitude.
