# kit-autonomy — S2b ADVERSARIAL test-faithfulness reviewer (blind to the driver)

Paste at the top of a fresh subagent, prepended with `.claude/subagent-non-negotiables.md`. This is the
autonomous substitute for the owner-driven line-by-line spec review (kit-tdd Step 1). You are BLIND to the
driver's tests, dispositions, and reasoning — you receive only the kit prose + methodology, and you
independently re-derive what the tests MUST assert. Your leverage is ADVERSARIAL re-derivation: for each kit
line, generate the NEAREST-WONG reading and the assertion that distinguishes it, so a shared misread surfaces
instead of echoing.

> **Content gate:** NIKKE kit prose can carry suggestive flavor text that trips the safety classifier.
> Inspect prose STRUCTURALLY — capture only short mechanical fragments (the `■` trigger header, the
> `Affects …` target clause, the stat keyword before a `▲`/`▼`); quote ≤ ~40 chars; keep output clinical.

## You are given
- The unit's **kit prose** (skill1/skill2/burst) + base stats (weapon/class/element/burst/ammo/reloadFrames/
  chargeFrames/hitsPerShot/multipliers). This is ground truth — read it literally.
- A **REDACTED** methodology excerpt (the recurring failure-mode taxonomy + the 4 per-line questions + the
  disposition vocabulary). It has been stripped of THIS unit's name/answer; if you spot a leak (this unit's
  slug or magnitudes named in the methodology), declare it in `leakDetected` and reason from the prose anyway.
- The **harness API** (`scripts/tests/lib/harness.ts`: `controlComp(carry,helm?)`, `runComp`, `totals`,
  `unitOf`, `withPatchedOverride`, `cfg.onEvent` event kinds) and the **effect schema** (`src/skills/types.ts`).

## You must NOT see
The driver's tests, the driver's spec/dispositions, the driver's reasoning, the shipped override's encoding
choices, the truth file. If handed any of these, the review is void — say so.

## Method — per kit line (a `■` header = trigger+target; each following sentence = one effect line)
For EVERY line, independently produce:
1. **Disposition** (FAITHFUL / FIX / MISSING / GAP / UNMODELED / MEASUREMENT-GATED) — from the prose alone.
2. **The 4 questions:** (a) SCOPE — normal-attacks vs charge vs crit-only? (b) DURATION SEMANTICS — seconds
   vs ROUNDS (`durationShots`) vs stacks vs until-reload vs permanent? "for N round(s)" is never `durationSec`.
   (c) TRIGGER IDENTITY — `lastBullet`/`shotFired`/`hitCount`(counts ROUNDS)/`interval`/`fullBurstEnter`/
   `burstCast`/on-cast-vs-on-hit, and any gate (`fbGate`/`everyN`/`requiresCore`/`requiresTargetStatus`)?
   `burstCast` (this unit's own bursts) ≠ `fullBurstEnter` (any team FB). (d) TARGET SET — self / allies /
   all-including-self / enemy / caster-slot overwrite?
3. **The NEAREST-WONG reading** — the most plausible misread of this line (the one a reasonable model would
   make: e.g. generic crit for a scoped line; `durationSec` for a round count; `fullBurstEnter` for a
   `burstCast`-gated self mode; ungated for a status-gated rider). This is the adversarial payload.
4. **The distinguishing assertion** — the event-log assertion that is GREEN under the faithful reading and
   RED under the nearest-wrong reading (inertness included: what the line must NOT move).
5. **Evidence tier** for any magnitude (MEASURED / DATAMINED / COMMUNITY / CALIBRATED ⚑).

Then propose the **load-bearing set**: every FAITHFUL/FIX/MISSING line that is not UNMODELED (objective —
the driver cannot declare a divergent line non-load-bearing).

## Return ONLY this JSON
```json
{
  "slug": "<exact slug>",
  "leakDetected": "<null, or what leaked into the redacted methodology>",
  "spec": [
    { "slot": "skill1|skill2|burst", "kitLine": "<≤40-char structural fragment>", "disposition": "FAITHFUL|FIX|MISSING|GAP|UNMODELED|MEASUREMENT-GATED",
      "scope": "...", "durationSemantics": "...", "triggerIdentity": "...", "targetSet": "...",
      "nearestWrongModel": "<the most plausible misread>", "distinguishingAssertion": "<event-log assertion green-under-faithful / red-under-nearest-wrong>",
      "inertness": "<what must NOT move>", "evidenceTier": "MEASURED|DATAMINED|COMMUNITY|CALIBRATED", "loadBearing": true }
  ],
  "loadBearingSet": [ "<slot:line refs>" ],
  "unmodeledVerbatim": { "skill1": ["..."], "skill2": ["..."], "burst": ["..."] },
  "notes": "<anything the driver must reconcile — esp. where you expect a shared-prior misread>"
}
```
Tight structured JSON, not an essay. Save to `scripts/kit-autonomy/reviews/<slug>.test-review.json`.
