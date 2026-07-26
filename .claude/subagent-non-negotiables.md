# Subagent non-negotiables (paste at the top of EVERY subagent prompt)

A compact hard-rules header so a subagent can't violate a rule it never saw. The orchestrator
prepends this (or points to it) in every spawn; the parent verifies its own PREMISES before spawning
(a wrong premise poisons every downstream agent).

## NON-NEGOTIABLES
1. **EXACT SLUG.** Refer to every unit by its exact slug + full name. NEVER conflate a base with a
   variant (Snow White `snow-white` AR/Iron ≠ Snow White: Heavy Arms `snow-white-heavy-arms` SR/Water) —
   they are entirely different units; conflating is a P0 failure. Reason from the slug, not the base name.
   The ONLY sanctioned shorthand is an APPROVED nickname from the unit's `nicknames` array in
   data/characters.json (e.g. "rrh" = `rapi-red-hood`, "swha" = `snow-white-heavy-arms`); community
   slang not in that list is unapproved — spell the unit out.
2. **MEASURED > FUDGE.** Model only REAL OBSERVED mechanics. If a value isn't derivable, FLAG it (⚑) with
   an estimate + recipe — never invent damage/mechanics to hit a number. A blind honest flag is CORRECT.
3. **WHOLE-PICTURE.** Sanity-check every reading against the unit's fire rate / ammo / arithmetic total /
   the mechanic's own math / which recording it came from. A locally-plausible reading that contradicts
   something already known is WRONG — surface the contradiction, don't pass it along.
4. **PROVE-IT-DIFFERENTLY — and know when you are DONE.** Before asserting a load-bearing claim, ask: could
   you prove it by an INDEPENDENT method (different from how you derived it)? If not, label it a HYPOTHESIS,
   not a fact. **⇒ AND CONVERSELY:** an existing labeled artifact in this repo — a `scripts/tests/**` vitest
   pin, the regression snapshot, `docs/probe-data/*.json`, a `docs/probe-runs.md` measurement — **IS an
   independent method**; its labels were produced independently of your derivation. When such a check exists
   and passes, the bar is **MET** — say so and STOP. "A further experiment is conceivable" is never a reason
   to keep going. Over-validation is a real, expensive failure mode here, not a safe default.
5. **TREAD LIGHTLY ON THE TREE.** During any PARALLEL run, do NOT write to `src/skills/overrides/` or run
   `validate-overrides` there (it corrupts sibling agents) — validate by inspection. Leave no scratch behind.
6. **NO `ignored`-effect blocks** in overrides (the validator rejects them) — document skips in the `note`.
7. **RETURN STRUCTURED.** End with a tight findings block (result + confidence + "what I verified"), not a
   prose essay — the orchestrator has to cross-check you fast without a context flood.
8. **REUSE BEFORE YOU DERIVE.** Before generating ground truth by hand, spend a few minutes searching for an
   existing labeled set (`scripts/tests/**`, the regression snapshot, `docs/probe-data/`, `docs/probe-runs.md`,
   `data/*.json`). If one exists, run the existing harness against it and report the result — that IS the
   validation and you are done. If none exists, say so explicitly and state the cost BEFORE starting.
   (A 2026-07-24 reader review burned ~5h re-reading 7 videos frame-by-frame for data the harness already had.)
9. **STAY IN SCOPE.** Answer the question you were sent to answer. A finding outside your scope is REPORTED,
   never acted on — do not expand into a rewrite, a re-plan, or a neighbouring subsystem. If the scope looks
   wrong, say so in the findings block and stop; the orchestrator decides.
