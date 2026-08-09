> **CLOSED (2026-08-09).** This handoff has landed; live follow-ups are in `docs/handoffs/QUEUE.md`.

# §40C's systematic offset — PRE-COMMIT (2026-08-06)

> AI-facing. **Committed BEFORE the wider-n numbers exist.** Read-only characterization; nothing
> enacted. Slugs: `marciana` (SG/Iron — **not** `marciana-marine-study`, AR/Iron), `noir`, `guilty`,
> `isabel`.

## The hazard

§40C's `dx` = +322 ± 121 / `dy` = −330 ± 63 (sign-consistent 10/10) was computed on **10 shots I
hand-picked** for an owner ask. ⛔ **I now want that offset to be real** — it would replace an
expensive labelling round with a cheap code fix. That is textbook confirmation pressure, so the
predictions go down first.

## The hypothesis

**H_element:** the structural and template locators track **two different HUD elements** with a
fixed geometric relationship. A "mislock" is then a BIMODAL JUMP between them, not a continuum of
jitter.

**H_jitter (null):** the locks disagree by varying amounts in varying directions; the 10-shot
consistency was a selection artifact.

## ⛔ Predictions — committed before the numbers

| #      | Prediction                                                                           | Kills H_element if…                                 |
| ------ | ------------------------------------------------------------------------------------ | --------------------------------------------------- |
| **P1** | Across **ALL clean (non-stuck) mislocked shots**, `dx > 0` and `dy < 0` on **≥ 90%** | signs are mixed (≲ 70%) ⇒ the 10 were cherry-picked |
| **P2** | `dy` clusters tightly — **sd < 100 px**                                              | broadly spread ⇒ jitter, not a fixed element offset |
| **P3** | On **NON-mislocked** shots the two locks agree — median \|dx\|, \|dy\| **< 20 px**   | non-mislocked shots are ALSO offset ⇒ the mislock   |
|        |                                                                                      | classification is measuring something else entirely |

**Verdict rule:** P1 **and** P2 **and** P3 all hold ⇒ **SYSTEMATIC TWO-ELEMENT OFFSET**, and the
localization fix is a candidate that needs no owner labelling. Any one failing ⇒ **H_element is not
established**, the lead is recorded as dead-or-partial, and the owner ask proceeds as written.

⛔ **The 10-shot figures do NOT count as evidence for P1/P2** — they are the observation that
generated the hypothesis, not a test of it. Only the wider clean population tests it.

## Scope

⛔ Nothing enacted regardless of outcome. No localizer change, no constant, no threshold. This
characterizes an existing observation at larger n and records the result either way.
