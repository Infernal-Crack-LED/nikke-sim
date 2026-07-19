# Audit-kit — RECONCILING JUDGE prompt (three-way)

Paste this at the top of a fresh subagent, prepended with `.claude/subagent-non-negotiables.md` and the
`/context` mechanics pack. This is the final step of the `audit-kit` skill. Unlike the plain blind-rebuild
JUDGE (which sees only the blind reconstruction), this judge reconciles THREE sources against each other:

1. **BLIND REBUILD** (`reconstructions/<slug>.json`) — what the code *actually does*, reconstructed
   code-only by a blind Opus agent. Behavior, with no knowledge of intent.
2. **FULL-CONTEXT REVIEW** (the sighted reviewer's JSON) — what the override *claims/intends* to model,
   what it deliberately doesn't (`unmodeled`/`caveats`), and the unit's board accuracy. Intent + documented gaps.
3. **GROUND TRUTH** — the real in-game **kit text** (`truth/<slug>.truth.json` → `realSkills`, plus
   `data/characters.json` if you need weapon/stat facts) AND the **game mechanics / damage-formula SSOT**
   (`docs/data/damage-calculation.md` + `docs/data/game-mechanics.md`, mirrored in the `/context` pack).

Your leverage is the triangulation: the blind rebuild tells you what the code does, the full-context
review tells you whether that was intended and documented, and the ground truth tells you what's correct.

## Method — per real kit line

Align the real kit text against the blind rebuild, using the full-context review to attribute each
divergence, and the damage-formula SSOT to check that each modeled effect is mechanically correct (right
bucket, right trigger timing, right stacking rule). Classify each line:

- `FAITHFUL` — blind rebuild matches the real kit line AND the formula SSOT agrees the routing is correct.
- `EXPECTED_GAP` — the real line is absent/approximated in the blind rebuild, and the full-context review
  confirms it's in `unmodeled`/`caveats` (documented, often inert vs a single boss). Known, not a bug.
- `GOTCHA` — a divergence NOT excused by the full-context review. Sub-kinds:
    - `ENCODING` — the override mis-encodes the kit (wrong value/stat/trigger/target vs real prose).
    - `ENGINE` — encoded fine, but the engine routes/executes it so behavior differs non-obviously from
      the kit wording (bucket routing, trigger timing, silent rule) — CHECK against the formula SSOT.
    - `FIDELITY` — the override models the *downstream effect* rather than the *named mechanic*, so it is
      right-on-the-board but not faithful (e.g. a kit "Hit Rate ▲ X%" encoded as a hardcoded core-rate
      instead of `hitRatePct` through the HR→core slope). The kind the reconcile view is built to catch.
    - `SILENT_DROP` — the full-context review found the line `MISSING` (nowhere: not a block, config, or
      `unmodeled`). Highest priority.
- `RECON_ERROR` — the divergence is just the blind agent misreading clear code (the full-context review
  and code agree). Note it so it isn't mistaken for a real finding.

Then **cross-check the two agents against each other**: for each blind `codeDrivenSurprise`, does the
full-context review corroborate it (documented in note/caveats) or was it undocumented (a fresh find)?
Undocumented + formula-confirmed = the most valuable output.

## Return ONLY this JSON

```json
{
  "slug": "<exact slug>",
  "board": { "ratio": <num|null>, "tag": "HOT|COLD|OK|no-data" },
  "lineFindings": {
    "skill1": [ { "realLine": "...", "category": "FAITHFUL|EXPECTED_GAP|GOTCHA|RECON_ERROR", "subkind": "ENCODING|ENGINE|FIDELITY|SILENT_DROP|null", "blindSaid": "...", "reviewSaid": "...", "formulaCheck": "<what damage-calc/game-mechanics says about the correct routing>", "explanation": "..." } ],
    "skill2": [ ... ],
    "burst":  [ ... ]
  },
  "gotchas": [ { "subkind": "ENCODING|ENGINE|FIDELITY|SILENT_DROP", "slot": "...", "summary": "...", "evidence": "<file:line + real kit line + formula-SSOT citation>", "documentedInReview": true, "severity": "high|med|low", "suggestedFix": "<the faithful representation, or 'needs measurement' + recipe — NEVER a fudge>" } ],
  "agentCrossCheck": [ { "blindSurprise": "...", "corroboratedByReview": true, "verdict": "CONFIRMED|SPURIOUS", "fresh": true } ],
  "faithfulnessScore": <0..1 fraction of real kit lines FAITHFUL or EXPECTED_GAP>,
  "verdict": "<one paragraph: does the code faithfully represent this kit? which gotchas are real and worth acting on, ranked? which are documented-known vs fresh?>"
}
```

FINDINGS ONLY — nothing here is an enacted change. A `FIDELITY`/`ENGINE`/`SILENT_DROP` gotcha is a
candidate for `docs/engine-modeling-gaps.md` or the kit-parse reconciliation backlog, and any value
change is subject to measured>fudge + the scientific-method gate + `verify.sh`/snapshot. `suggestedFix`
must be a faithful representation or a flagged measurement, never a number chosen to hit the board.
