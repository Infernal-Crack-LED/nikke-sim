# Audit-kit — FULL-CONTEXT REVIEWER prompt (SIGHTED)

Paste this at the top of a fresh subagent, prepended with `.claude/subagent-non-negotiables.md`. This
agent is the OPPOSITE of the blind rebuilder: it reads EVERYTHING about the unit and reports what the
override *claims* to model, what it deliberately doesn't, and the unit's current accuracy — the
"intended + documented" side of the three-way reconciliation.

> **Model:** default (this is retrieval + structuring, not the hard reasoning step). The rebuilder is
> the Opus-pinned agent, not this one.

---

You are doing a **full-context kit audit** of ONE NIKKE unit for the sim. Your job is to establish, from
PRIMARY FILES, the complete "intended + documented" picture of this unit's kit — so a downstream judge
can reconcile it against a blind, code-only reconstruction and the real kit text.

## Read, for the EXACT slug you are given (base ≠ variant — non-negotiable #1)

1. `data/characters.json` → `characters.<slug>` — the real in-game **skill prose** (skill1/skill2/burst)
   + weapon, class, element, burst tier, base stats, multipliers, ammo, hitsPerShot.
2. `data/kit-status.json` → this unit's entry — the audit findings + `unmodeled`/`caveats` themes.
3. `src/skills/overrides/<slug>.json` **IN FULL** — the `note`, the `caveats` array, the `unmodeled`
   arrays (per slot), every block, AND any non-block config fields (`consolidation`, `resources`,
   `charFixes`, `modes`, `hasPierce`, `pierceModes`, `burstSnapshotsPreFb`). Note WHERE each kit
   mechanic is encoded — some live outside the block schema.
4. Current accuracy: `npx tsx scripts/board-read.ts` (find this unit's row: ratio, N, MAD) OR, if it has
   no board data, note that.
5. Mechanics/formula SSOT for anything you need to interpret: `docs/data/damage-calculation.md` +
   `docs/data/game-mechanics.md` (or the `/context` pack if provided in your prompt).

## Produce — a line-by-line map of the real kit against the override

For EVERY line of every skill (skill1/skill2/burst), record where and how it is represented:

- `MODELED_BLOCK` — represented as one or more blocks (cite the block).
- `MODELED_CONFIG` — represented outside the block schema (e.g. `consolidation`, `resources`,
  `charFixes`) — say which, because a naive "is slot X modeled?" check on the block array would miss it.
- `UNMODELED` — in the override's `unmodeled` array (say why per the note: inert vs single boss, needs
  measurement, unexpressible, etc.).
- `MISSING` — a real kit line represented NOWHERE (neither a block, a config, nor `unmodeled`). These
  are silent drops — flag them prominently.

Also rule each documented **confound** (every `caveat` / `unmodeled` ⚑ / open measurement) explicitly,
so the judge can tell a KNOWN gap from a genuine surprise (FULL-CONTEXT GATE).

## Return ONLY this JSON

```json
{
  "slug": "<exact slug>",
  "board": { "ratio": <num|null>, "n": <int|null>, "mad": <num|null>, "tag": "HOT|COLD|OK|no-data" },
  "kitMap": {
    "skill1": [ { "kitLine": "...", "status": "MODELED_BLOCK|MODELED_CONFIG|UNMODELED|MISSING", "where": "<block/config/unmodeled ref>", "note": "..." } ],
    "skill2": [ ... ],
    "burst":  [ ... ]
  },
  "documentedConfounds": [ { "source": "caveat|unmodeled|note|open-question", "text": "...", "couldCauseGap": "HOT|COLD|neither", "why": "..." } ],
  "authorIntentSummary": "<2-4 sentences: what the override author was modeling, key approximations, and known-not-yet-faithful spots per the note>"
}
```

Non-negotiable #7: tight structured JSON, not an essay.
