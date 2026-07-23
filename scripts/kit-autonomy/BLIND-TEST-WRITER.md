# kit-autonomy — S5 BLIND post-op test-writer (blind to the driver)

Paste at the top of a fresh subagent, prepended with `.claude/subagent-non-negotiables.md`. You write a full
per-unit kit spec test from the kit prose ALONE — the same forcing function the driver used, independently.
Your convergence with the driver's tests (run unmodified against the driver's override by the judge) is the
faithfulness signal; a divergence you catch that the driver did not document is the payload.

> **Content gate:** inspect kit prose STRUCTURALLY (the `■` header + `Affects …` clause + the stat keyword
> before `▲`/`▼`); quote ≤ ~40 chars; keep output clinical. Do not echo full flavorful sentences.

## You are given
- The unit's **kit prose** (skill1/skill2/burst) + base stats. Ground truth — read literally.
- The **harness API** (`scripts/tests/lib/harness.ts`) + the **effect schema** (`src/skills/types.ts`) + the
  disposition vocabulary + the 4 per-line questions + the RECURRING FAILURE-MODE taxonomy (REDACTED of this
  unit's answer — declare `leakDetected` if you spot this unit's slug/magnitudes in it).
- The exemplar `scripts/tests/units/helm.test.ts` for STRUCTURE only (header evidence comment, `run()` helper
  collecting `cfg.onEvent`, `withPatchedOverride` counterfactuals, hoisted runs, discriminating + inertness
  assertions). Copy the discipline, not the unit.

## You must NOT see
The driver's tests, the driver's override, the driver's reasoning, the truth file. If handed any, the test is
void — say so.

## Method
1. Enumerate every kit line; disposition each (FAITHFUL/FIX/MISSING/GAP/UNMODELED/MEASUREMENT-GATED) + the 4
   questions (scope / duration semantics / trigger identity / target set).
2. Write `scripts/tests/units/<slug>.test.ts` (return its full source): one assertion group per kit line.
   - **Fixture:** `controlComp('<slug>', true)` (supplies B1/B2 so a B3 casts; a lone B3 makes ZERO Full
     Bursts). Deterministic (no seed). Use `helm=false` if helm's buffs confound a reading.
   - **Discriminating assertion per FAITHFUL/FIX/MISSING line:** GREEN under the faithful reading, RED under
     the nearest-wrong model (built via `withPatchedOverride`). Event-log over totals wherever the claim is
     structural (`cfg.onEvent`; kinds shot/damage/buffApply/buffRemove/reload/burstCast/fullBurstStart/
     fullBurstEnd; `damage` carries bucket/srcSlot/crit+core rates/multiplier decomposition).
   - **Inertness assertions:** what the line must NOT move (teammates byte-identical; wrong buckets unmoved).
   - **Non-vacuity:** for a gated/conditional line, assert the fixture actually exercises BOTH the active and
     inactive case (else the assertion tests nothing).
   - **GAP lines:** `it.skip` with the reason (missing primitive / unobservable payload).
   - Header comment: what the kit says, the fixture, and WHY each assertion discriminates.
3. Keep runs hoisted (each `runComp` is a full 180s sim); a file under ~20 runs.

## Return ONLY this JSON
```json
{
  "slug": "<exact slug>",
  "leakDetected": "<null or what leaked>",
  "testSource": "<the full <slug>.test.ts source>",
  "spec": [ { "slot": "...", "kitLine": "<≤40 chars>", "disposition": "...", "assertion": "<what it proves + nearest-wrong it fails under>" } ],
  "fixtures": "<which comp(s) used and why>",
  "gaps": [ "<it.skip'd lines + reason>" ]
}
```
Save the test source to `scripts/kit-autonomy/blind/<slug>.test.ts` and the JSON to
`scripts/kit-autonomy/blind/<slug>.test-spec.json`. Tight structured JSON, not an essay.
