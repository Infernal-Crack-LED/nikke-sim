# kit-autonomy — S6 BLIND post-op override-writer (kit-parse BLIND-STUDY mode)

Paste at the top of a fresh subagent, prepended with `.claude/subagent-non-negotiables.md`. You author a
baseline `OverrideFile` for ONE unit from its raw kit text + methodology ONLY — a second, independent
prose→JSON read. The judge diffs your override against the driver's; where you agree, confidence is high;
where you disagree, the judge adjudicates against the prose + formula.

> **Content gate:** inspect kit prose STRUCTURALLY (the `■` header + `Affects …` clause + the stat keyword
> before `▲`/`▼`); quote ≤ ~40 chars; clinical output; do not echo full flavorful sentences.

## Prime directive (never violate)
Model REAL OBSERVED mechanics. **Faithful > fit. Measured > fudge.** NEVER fabricate a calibrated value to
hit a target — if a value isn't derivable from the kit text, FLAG it (⚑) with an initial estimate + recipe.
A blind parser that honestly flags what it can't know is CORRECT; one that guesses a precise ⚑ value is WRONG.

## You are given
- The unit's **raw kit text** (skill1/skill2/burst) + base stats. Ground truth.
- **Methodology (read freely):** `src/skills/types.ts` (the effect schema — your vocabulary),
  `docs/modeling-priors.md` (the priors + new-character checklist), the kit-parse HARD RULES (weapon-state
  modifiers ARE damage; tandem/cross-unit effects; DEF/HP/lifesteal not skippable; Hit-Rate→core; recurring
  conditional triggers incl. `lastBullet`; `burstCast` vs `fullBurstEnter` trigger fidelity; DoT
  append-not-refresh), and the ALWAYS-⚑ taxonomy. PLUS ONE different unit's override as a STYLE example.
  All REDACTED of THIS unit's answer — declare `leakDetected` if you spot this unit's slug/magnitudes in them.

## You must NOT see (BLIND-STUDY + VALUES-WITHHELD)
This unit's own `src/skills/overrides/<slug>.json`; the driver's tests/reasoning; `docs/DECISIONS.md`;
`docs/handoffs/*`; `docs/probe-data/*` / other units' probe totals; `scripts/kit-parse/grade.ts`,
`sweep-grade.ts`, `scripts/experiment.ts`, board-read output (you must NOT be able to fit to the board); git
history. If handed any, the override is void — say so.

## Method
1. **Full-kit audit (REQUIRED):** enumerate EVERY line of every skill; for each, IMPLEMENTED (which effect)
   or SKIPPED (reason). No silent drops. SKIPPED rows ↔ the `unmodeled` field 1:1 (verbatim).
2. **Classify each line** using the `types.ts` schema as vocabulary (StatKey buffs, TriggerDef, TargetDef,
   EffectDef, block gates `fbGate`/`everyN`/`requiresCore`/`requiresTargetStatus`/`formation`/`mode`/
   `swapGate`). Apply the HARD RULES — never auto-skip weapon-state / heal-shield-DEF-HP-lifesteal-gauge /
   Hit-Rate / recurring-conditional-trigger lines.
3. **Apply the priors** as starting guesses; emit the ALWAYS-⚑ fields (cadence tuple; kit-silent trigger;
   weapon-swap economy; stack/currency steady-state; split-vs-merge; per-kit noFb; Hit-Rate magnitude) with
   estimate + reasoning + recipe. FB-by-timing default ON (don't set `noFb` unmeasured); `noRange` is
   engine-automatic (don't set or flag it).
4. **Write the OverrideFile** — ALL THREE slots present (empty array only for a genuinely effect-free slot),
   PLUS `unmodeled` (REQUIRED, verbatim per slot), optional `caveats` (⚑-visibility), and a `note` that
   BEGINS with the HYPOTHESIS banner: `PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is
   an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number.` No `ignored`
   blocks (the validator rejects them).

## Return ONLY this JSON
```json
{
  "slug": "<exact slug>",
  "leakDetected": "<null or what leaked>",
  "override": { "slug": "...", "skill1": [ ], "skill2": [ ], "burst": [ ], "unmodeled": { "skill1": [], "skill2": [], "burst": [] }, "caveats": [ ], "note": "PARSER BASELINE (HYPOTHESIS …) …" },
  "audit": [ { "slot": "...", "kitLine": "<≤40 chars>", "status": "IMPLEMENTED|SKIPPED", "effectOrReason": "..." } ],
  "flags": [ { "field": "<override path>", "estimate": "...", "reasoning": "...", "recipe": "..." } ]
}
```
Save the override to `scripts/kit-autonomy/blind/<slug>.override.json` and the JSON to
`scripts/kit-autonomy/blind/<slug>.audit.json`. Tight structured JSON, not an essay.
