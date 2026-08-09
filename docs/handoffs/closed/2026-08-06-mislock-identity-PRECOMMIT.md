> **CLOSED (2026-08-09).** This handoff has landed; live follow-ups are in `docs/handoffs/QUEUE.md`.

# Mislock severity by track-set IDENTITY — PRE-COMMIT (2026-08-06)

> AI-facing. **Committed BEFORE the arm emits any number.**
>
> **Slugs.** `marciana` (SG/Iron, `docs/probes/clean-weapons/marciana-solo.MP4` — **not**
> `marciana-marine-study`, AR/Iron), `noir`, `guilty`, `isabel`. `*-schemafix` / `groundtruth-f811-*`
> are dump slugs, not units.

## 1. The contradiction this exists to resolve

| source   | observable                          | n          | verdict                        |
| -------- | ----------------------------------- | ---------- | ------------------------------ |
| **§22C** | COUNT difference between two locks  | 10 shots   | mislocks cost **≈0**           |
| **§38C** | OWNER-ANCHORED error, shot-4 relock | **1** shot | mislocks carry **~1.0 of 1.4** |

§37B supplies the mechanism that would reconcile them: a mislocked count is **refilled by non-pellet
tracks**, so a COUNT observable is structurally blind to the loss. ⛔ **That is currently an
explanation, not a measurement.** This pass tests it.

⚑ **Recorded up front so neither can later be presented as fresh confirmation:** both numbers above
already exist. Whatever this arm returns, it is **new evidence about the MECHANISM**, and it does not
retroactively strengthen either prior result.

## 2. The measurement

Per shot, build the set of tracks the **shipped path actually counts** — `band_ids` members inside
`pellet_radius` of the crosshair at the band-plateau frame — **twice**: once under the **structural**
lock, once under the **template** lock. Then report, per shot:

- `n_struct`, `n_tmpl` — the two counts;
- `count_diff` = `n_tmpl − n_struct`;
- **`jaccard`** = `|A ∩ B| / |A ∪ B|` over the two counted track-ID sets.

⚑ **Jaccard is SYMMETRIC and needs no ground truth** — that is the whole point. It asks "are these
the same pellets?", not "which lock is right?", so it runs on all production mislocks where no owner
labels exist.

**Populations:** MISLOCKED shots (the `--mislock-rate` displacement criterion) as the subject;
**NON-mislocked shots as the control**. Report the labelled clip (6 mislocks / 37 shots) and the
production dumps separately, never pooled.

## 3. ⛔ Decision bands — committed before any number exists

Let `J_mis` / `J_ok` = median Jaccard on mislocked / non-mislocked shots, and `ΔC` = mean
`|count_diff|` on mislocked shots.

| Outcome                           | Verdict                                                                                                                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `J_mis < 0.50` **and** `ΔC < 1.0` | ⚑ **COMPENSATING ERROR CONFIRMED AT SCALE — same count, different pellets.** §22C's ≈0 is explained as BLINDNESS, not absence. Localization becomes the established channel. |
| `J_mis ≥ 0.80` **and** `ΔC < 1.0` | **MISLOCKS ARE GENUINELY HARMLESS.** Same count AND same pellets ⇒ §22C stands unqualified, §38C's shot 4 was atypical, and the −1.40 lives somewhere not yet identified.    |
| `0.50 ≤ J_mis < 0.80`             | **PARTIAL.** Record with its n; does not on its own promote or demote the channel.                                                                                           |
| `ΔC ≥ 1.0`                        | Counts diverge materially too ⇒ §22C's own premise (that counts barely move) does not hold on this population. Record; re-examine §22C's sample before ranking anything.     |

## 4. ⛔ Falsification controls — any firing VOIDS

- **CONTROL SANITY.** If `J_ok < 0.90` on non-mislocked shots, then even AGREEING locks disagree on
  which tracks they count ⇒ the metric is measuring noise, not mislocks ⇒ **VOID**.
- **CONTROL CHANNEL.** Sets must be built from the **shipped** channel (`band_ids` at the band-plateau
  frame), not the legacy `pellet_ids`/median frame — the §36/§37 defect. The arm must PRINT which
  channel it used. If it cannot demonstrate it, **VOID**.
- **CONTROL POPULATION.** Mislocked and non-mislocked shots are classified by the EXISTING
  `--mislock-rate` criterion, fixed before any Jaccard is read. ⛔ No re-tuning that threshold after
  seeing results.
- **CONTROL SEPARATION.** The labelled clip and the production dumps are reported separately. ⛔ No
  pooled headline — the labelled clip is in-sample.

## 5. ⛔ Scope — what this CANNOT do

- ⛔ **This measures the MECHANISM, not the MAGNITUDE.** A low Jaccard proves the two locks count
  different pellets; it does **NOT** say which is correct, nor how many REAL pellets are lost.
  **Sizing the channel still requires owner labels.** ⚑ Any statement of the form "mislocks cost N
  pellets/shot" is OUT OF SCOPE for this pass and must not appear in its findings.
- ⛔ **NOTHING IS ENACTED.** No constant, default or localizer change regardless of outcome. The
  localization fix is a separate, gated pass.
- ⛔ Does not overturn §22C. At most it establishes that §22C's OBSERVABLE cannot see the effect —
  which is a statement about the instrument, not about the channel's size.
- ⚑ Tooling surface ⇒ `verify.sh` + `pellet-selftest.sh` are the gate.

## 6. What would be sufficient, stated up front

A committed arm at a named path, with a self-validating fixture and a selftest arm, reporting
`J_mis`, `J_ok`, `ΔC` and n for the labelled clip and the production dumps **separately**, scored
against §3. **That is the whole bar.** If `J_ok` passes CONTROL SANITY and `J_mis` lands in a band,
record it and stop.
