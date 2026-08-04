# kit-autonomy — S5 BLIND post-op test-writer (blind to the driver)

Paste at the top of a fresh subagent, prepended with the subagent-rules preamble from `.claude/`
(dispatch-claude.sh / dispatch-kimi.sh prepend it automatically). You write a full
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
- An already-audited unit's `scripts/tests/units/<unit>.test.ts` is the STRUCTURAL exemplar (header evidence
  comment, `run()` helper collecting `cfg.onEvent`, `withPatchedOverride` counterfactuals, hoisted runs,
  discriminating + inertness assertions). Copy the discipline, not the unit.

## You must NOT see

The driver's tests, the driver's override, the driver's reasoning, the truth file. If handed any, the test is
void — say so.

## Harness boilerplate (copy EXACTLY — the import paths + shapes are the #1 blind failure)

Test files live at `scripts/tests/units/<slug>.test.ts`. Imports are ESM (`.js` extensions, NodeNext) and
relative to THAT directory:

```ts
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';
```

Shape cheat-sheet (verified against `harness.ts` / `types.ts` — the shapes blind tests most often guess WRONG):

- `totals(res)` → `Record<slug, number>` — a PER-SLUG MAP of total damage, NOT a scalar. Read one unit as
  `totals(res)['<slug>']`, or use `unitOf(res, '<slug>')` for the full result row (`.totalDamage`, per-bucket
  breakdown, events). `unitOf` THROWS if the slug isn't in the comp.
- `controlComp(carry, fixedB3?=true)` → `CompOptions`; `runComp(opts)` → `SimResult` (deterministic, no seed).
  (The fixed B3 slot is a set SR/Water unit; the exact signature is restated in the HARNESS API block below.)
- `CompOptions.overrides` is a PER-SLUG MAP: `Record<slug, OverrideFile | undefined>`. There is NO top-level
  `blocks` on an override and NO `o.blocks`.
- The `OverrideFile` is SLOT-KEYED: `{ skill1?, skill2?, burst? }`, each slot a `CharacterSkills` carrying its
  OWN `blocks: Block[]` (+ `unmodeled`, `hasPierce`, `modes`, `resources`, …). A counterfactual therefore
  patches `ov.skill1!.blocks` / `ov.burst!.blocks` — `ov.blocks` is a NO-OP (no such top-level field).
- Build counterfactuals with `withPatchedOverride('<slug>', (ov) => { …mutate ov.skill1/skill2/burst… })` → an
  in-memory `OverrideFile` clone (committed JSON untouched); pass it via `overrides: { '<slug>': patched }`.
- `gainPierce` (a Block EFFECT — timed/step-gated pierce) ≠ `hasPierce` (a static boolean FLAG). Don't encode
  one as the other.
- Caster-scaled buff events emit FLAT-resolved values on `buffApply` (e.g. `casterAtkPct` re-emits as flat ATK;
  `casterMaxHpPct`/`targetMaxHpPct` as `maxHpFlat`) — assert the flat number, not the percentage.
- There is NO `buffRemove` event on natural time-lapse (only on explicit removal) — for a "for N sec" buff,
  assert it is GONE after the window via totals/events; don't assert a removal frame.
- Boss-held debuffs emit `buffApply` with `casterIdx === null` AND `targetIdx === null` — filter them by
  stat+value.

## Method

1. Enumerate every kit line; disposition each (FAITHFUL/FIX/MISSING/GAP/UNMODELED/MEASUREMENT-GATED) + the 4
   questions (scope / duration semantics / trigger identity / target set).
2. Write `scripts/tests/units/<slug>.test.ts` (return its full source): one assertion group per kit line.
   - **Fixture:** `controlComp('<slug>', true)` (supplies B1/B2 so a B3 casts; a lone B3 makes ZERO Full
     Bursts). Deterministic (no seed). Pass the fixed-B3 flag `false` if the fixed B3 slot's buffs confound a reading.
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
  "spec": [
    {
      "slot": "...",
      "kitLine": "<≤40 chars>",
      "disposition": "...",
      "assertion": "<what it proves + nearest-wrong it fails under>"
    }
  ],
  "fixtures": "<which comp(s) used and why>",
  "gaps": ["<it.skip lines + reason>"]
}
```

Save the test source to `scripts/kit-autonomy/blind/<slug>.test.ts` and the JSON to
`scripts/kit-autonomy/blind/<slug>.test-spec.json`. Tight structured JSON, not an essay.
