> **CLOSED (2026-08-09).** This handoff has landed; live follow-ups are in `docs/handoffs/QUEUE.md`.

# The radius gate — PRE-COMMIT (2026-08-05)

> AI-facing. **Committed BEFORE any production number exists** (the `2026-08-04-mislock-rate-PRECOMMIT.md`
> / `2026-08-05-marker-semantics-PRECOMMIT.md` precedent).
>
> **Slugs.** `marciana` (SG/Iron, `docs/probes/clean-weapons/marciana-solo.MP4` — **not**
> `marciana-marine-study`, AR/Iron), `noir`, `guilty`, `isabel`. `*-schemafix` names are dump slugs.

## 1. Why this is the item

§19C: _"the radius gate and the mislock now carry the entire residual on this clip"_ — and the
mislock half is now **closed at ≈0 cost** (§22C, §34). ⇒ **The radius gate is the only channel any
measurement has ever named as carrying §19's −1.40 pellets/shot**, and until 2026-08-05 it had no
queue entry at all.

The concrete instance is n=1: on the labelled clip's shot 1, an owner pellet's closest approach is
**161.4 px against a 160 px `pellet_radius`**.

**The question: is the gate cutting into the real pellet cloud, or sitting in empty space?**

## 2. The measurement

For every shot across the four `*-schemafix` dumps, at the frame whose count actually becomes that
shot's `white` (the **representative frame** the landed hybrid selects — not an offset window, so
this measures the gate where the gate is actually applied), build a **radial histogram** of white
tracks by distance from that frame's crosshair, in 20 px annuli out to 400 px.

**Restricted to LIFETIME-IN-BAND tracks** (`band_lo ≤ life ≤ band_hi`, i.e. [4, 10] at 30 fps) —
the §14-validated pellet-like population. An unrestricted profile would be dominated by HUD and
background clutter and could not answer the question.

### 2.1 ⚑ The trap this measurement has to avoid

**Annulus AREA grows with r**, so a _uniform_ density produces a _rising_ raw count per annulus. A
raw-count histogram that climbs toward 160 px would look like "the cloud extends to the gate" when it
may mean nothing at all. ⇒ **Report per-annulus DENSITY (count ÷ annulus area) alongside raw counts,
and read the verdict off DENSITY.**

### 2.2 The control that isolates pellets from clutter

Clutter is present on every frame; pellets only near a shot. So the same radial profile is built on
**QUIET frames** (frames ≥ 30 frames from any event span), and the **DIFFERENCE profile
(shot − quiet)** is what is attributed to pellets. ⛔ A conclusion drawn from the raw shot-frame
profile alone is not admissible under this pre-commit.

## 3. Decision bands — committed before any number exists

Let `dens(r)` be the difference-profile density and `T` = the pellet-attributable count in
`160 ≤ r < 220` (the annuli immediately outside the gate), pooled over all shots.

| Outcome                                                                                      | Verdict                                                                                              |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `dens(r)` has fallen to **≤ 10%** of its in-gate peak before 160 px, **and** `T ≤ 0.05`/shot | **GATE IS IN EMPTY SPACE.** Not the cold channel. Record and close; the −1.40 needs another suspect. |
| `T` is **0.05–0.30**/shot                                                                    | **A REAL BUT MINOR CHANNEL.** Record; it does not explain −1.40 on its own.                          |
| `T > 0.30`/shot **and** `dens(r)` is still ≥ 25% of peak at the gate                         | **THE GATE IS CUTTING THE CLOUD** — a live cold-bias channel, and the first one found.               |

## 4. ⛔ Falsification controls — either firing VOIDS the result

- **CONTROL A — CLUTTER DOMINANCE.** If the quiet-frame profile accounts for **≥ 80%** of the
  shot-frame count in the `160 ≤ r < 220` band, the difference is a small residual between two large
  numbers and `T` is not trustworthy ⇒ **VOID**, report as unmeasurable by this method.
- **CONTROL B — IN-GATE SANITY.** The difference profile inside the gate must be **positive and
  substantially larger** than outside it. If pellets are not detectable _inside_ 160 px by this
  method, the method does not see pellets at all ⇒ **VOID**.

## 5. ⛔ Scope

- ⛔ **NOTHING IS ENACTED.** `pellet_radius` is **not** changed regardless of outcome. ⚑ Widening the
  gate to recover pellets would be a **fudge**: the accuracy-circle geometry is owner-ruled ground
  truth (it measures the mechanic directly, and outranks damage-back-derived rates). A gate that is
  provably cutting the cloud is a finding to bring to the owner, not a constant to retune.
- ⛔ No verdict on the cold bias beyond this one channel.
- ⚑ Uses the `*-schemafix` dumps and `debounce_shots` on their own `frame_counts` — **the production
  path, no re-extraction** (§30A).
