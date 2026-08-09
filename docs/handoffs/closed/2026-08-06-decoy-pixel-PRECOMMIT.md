> **CLOSED (2026-08-09).** This handoff has landed; live follow-ups are in `docs/handoffs/QUEUE.md`.

# §42's decoy hypothesis — the PIXEL TEST — PRE-COMMIT (2026-08-06)

> AI-facing. **Committed BEFORE any pixel score exists.** Slugs: `marciana` (SG/Iron — **not**
> `marciana-marine-study`, AR/Iron), `noir`, `guilty`, `isabel`.

## The hazard

§42 says the structural locator **leaves the ammo box and grabs the floating damage numbers** on a
mislock. ⛔ **I want this to be true** — it would answer "which lock is right?" mechanically and
save the owner a 40-crop labelling round I already built. Predictions therefore go down first.

## The test

Both locators are supposed to find the **ammo box**. There is a committed template for it:
`scripts/probe/ammo-box-template.png`. So score `cv2.matchTemplate` (`TM_CCOEFF_NORMED`) of that
template against the frame patch centred on **each** lock position at `t0+9`, for mislocked and
normal shots, stuck-template shots excluded (§40A). Frames already on disk; no owner time.

## ⛔ Predictions — committed before the numbers

| #      | Prediction                                                                                           |
| ------ | ---------------------------------------------------------------------------------------------------- |
| **P1** | On **NORMAL** shots the structural position scores HIGH — it is on the box.                          |
| **P2** | On **MISLOCKED** shots the structural score DROPS materially — **median drop > 0.20**                |
| **P3** | On **MISLOCKED** shots the TEMPLATE position outscores the STRUCTURAL position on **≥ 80%** of shots |

**Verdict rule:** P1 **and** P2 **and** P3 ⇒ **the structural lock leaves the box on a mislock and
the template lock does not** ⇒ "which lock is right" is answered mechanically and the owner ask
drops to a spot-check at most. Any failing ⇒ **not established**; the ask proceeds as built.

⛔ **P3 is the load-bearing one.** P1+P2 alone would only show structural left the box — if the
template is ALSO off-box (P3 fails), then neither lock is trustworthy and owner labels are still
required. ⚑ **A P3 failure must not be reported as a partial success.**

## Scope

- ⛔ Nothing enacted. No localizer change, no constant, no threshold.
- ⛔ Still **NOT magnitude**. Even a clean pass says which lock is right, never how many real pellets
  the wrong one costs. ⚑ The shortcut `count_diff × mislock rate` remains §20D's refuted move.
- ⚑ `TM_CCOEFF_NORMED` scale is not something I have calibrated here, so **P2/P3 are stated as
  RELATIVE comparisons**, not absolute cutoffs — deliberately, so the result cannot be rescued by
  picking a favourable absolute bar afterwards.
