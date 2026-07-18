# Blind kit-rebuild — JUDGE prompt

Paste this at the top of a fresh subagent, then attach the matched pair:
`reconstructions/<slug>.json` (the blind reconstruction) + `truth/<slug>.truth.json` (real prose +
the override's note/unmodeled/caveats). The judge is the ONLY step that sees ground truth.

The judge does the discriminating work of this whole test: separating an *expected* divergence (a kit
line the override deliberately doesn't model, or an inert-vs-single-boss effect) from a **real gotcha**
(the code faithfully-but-non-obviously diverges from the kit, or the override mis-encodes the kit).

---

You are grading a **blind reconstruction** of a game character's skill kit. Someone read only the
simulator's code + a structured override (with all skill text stripped) and tried to reconstruct the
unit's real in-game skill prose. You have the ground truth.

Inputs:
- `reconstruction` — their per-slot reconstructed prose, plus their `codeDrivenSurprises` / `lowConfidence`.
- `realSkills` — the ACTUAL in-game skill prose (skill1 / skill2 / burst).
- `unmodeled` — kit lines the override DELIBERATELY does not model. A divergence that matches one of
  these is **EXPECTED**, not a gotcha (the code was never meant to represent it).
- `overrideNote` / `caveats` — the author's own record of modeling choices & known caveats.

**For each slot**, align the reconstruction against `realSkills` line-by-line and classify every
divergence into exactly one category:

- `FAITHFUL` — reconstruction matches the real line (same trigger/target/stat/value/duration intent).
  Minor wording differences are fine.
- `EXPECTED_GAP` — the real line is absent/wrong in the reconstruction BECAUSE it's in `unmodeled` or is
  documented inert in the note. The override never encoded it, so the code couldn't reveal it. Not a bug.
- `GOTCHA` — the reconstruction (derived faithfully from code) diverges from the real kit in a way that
  is NOT explained by `unmodeled`. This is the payload. Two sub-kinds:
    - `ENCODING` — the override mis-encodes the kit (wrong value/stat/trigger/target vs real prose).
    - `ENGINE` — the override encodes it fine, but the engine routes/executes it so that the *behavior*
      differs non-obviously from the kit wording (bucket routing, trigger timing, a silent rule). These
      are the most valuable: they're the implementation surprises the test exists to find.
- `RECON_ERROR` — the divergence is just the reconstructor misreading the code (the code was actually
  clear); note it so it doesn't get mistaken for a real gotcha.

Also assess their `codeDrivenSurprises`: for each, mark `CONFIRMED` (a real code behavior, matches how
sim.ts works) or `SPURIOUS`, and whether it corresponds to a real kit divergence.

**Return ONLY this JSON:**

```json
{
  "slug": "<from truth>",
  "perSlot": {
    "skill1": { "faithful": <n>, "findings": [ { "category": "GOTCHA|EXPECTED_GAP|RECON_ERROR", "subkind": "ENCODING|ENGINE|null", "realLine": "...", "reconLine": "...", "explanation": "..." } ] },
    "skill2": { ... },
    "burst":  { ... }
  },
  "gotchas": [
    { "subkind": "ENCODING|ENGINE", "slot": "skill1|skill2|burst", "summary": "<one line>", "evidence": "<file:line in sim.ts/types.ts + the real kit line it contradicts>", "severity": "high|med|low" }
  ],
  "surpriseAudit": [ { "claim": "<their codeDrivenSurprise>", "verdict": "CONFIRMED|SPURIOUS", "isRealDivergence": true } ],
  "faithfulnessScore": <0..1 fraction of real kit lines reconstructed FAITHFUL or EXPECTED_GAP>,
  "verdict": "<one paragraph: does the code faithfully represent this kit? what are the real gotchas worth acting on?>"
}
```

The `gotchas` array is the deliverable. An empty `gotchas` array with high `faithfulnessScore` means the
implementation is transparent for this unit. A `GOTCHA/ENGINE` finding is a candidate entry for the
kit-parse reconciliation backlog or engine-modeling-gaps thread map — but per repo rules it is a
FINDING, not an enacted change.
