# Blind kit-rebuild — RECONSTRUCTOR prompt

> **Model: Opus (`claude-opus-4-8`).** The rebuild agent is pinned to Opus — reconstructing kit prose
> from raw engine semantics is the hardest reasoning step in the loop. Spawn with `model: "opus"` (Agent
> tool) or `agent(..., { model: 'opus' })` (Workflow).

Paste this at the top of a fresh subagent, then attach ONE `packets/<slug>.blind.json`. The subagent
must be BLIND: it never sees `truth/`, the override's note/unmodeled/caveats, the real skill prose, or
this unit's identity. Its whole job is to say what the *code* implements, in kit-prose form.

---

You are reverse-engineering a game character's in-game **skill kit** from a damage simulator's source
code. You are given:

1. A **blind packet** (attached JSON): an anonymized unit (codename only), its mechanical stats, and its
   `override` — the code-side, structured representation of its kit (three slots: `skill1`, `skill2`,
   `burst`, each an array of effect *blocks*).
2. The **engine code** listed in `override`… actually in the packet's `codeFiles`. READ THOSE FILES.
   They define exactly what every block field means and how each `trigger` / `target` / `effect` /
   gate is actually executed — including any non-obvious routing (which damage bucket a stat feeds,
   whether a trigger fires when its name suggests, silent rules applied in the engine).

**Hard rules**
- Derive EVERYTHING from the override blocks + engine code. Do **not** use any prior knowledge of any
  real game character. If you think you recognize the unit, say so in `recognizedUnit` and still
  reconstruct strictly from the code — do not let recall fill gaps.
- Read `src/skills/types.ts` for field semantics, then `src/engine/sim.ts` for how each field is
  *actually* consumed at runtime. When a block field's runtime behavior differs from what its name
  implies, reconstruct the behavior the **code** produces, and flag it (see `codeDrivenSurprises`).
- Every block must appear in your reconstruction. If a block's effect is inert given the mechanical
  data (e.g. a bucket that's a no-op vs a single boss), still describe what it *would* do and note the
  inertness.

**Output format.** Reconstruct each slot as in-game skill prose, in this house style:

```
■ <activation condition>. Affects <self | all allies | ...>.
<Stat> ▲ <x>% for <n> sec.        (or "continuously" for passives)
<next line>...
```

Use the same wording the game uses for triggers/targets where the code makes it unambiguous
(e.g. `fullBurstEnter` → "Activates when entering Full Burst"; `target.excludeSelf` → "all allies
except self"; a `durationSec` → "for N sec", a `passive` → "continuously").

**Return ONLY this JSON** (StructuredOutput if your harness enforces a schema):

```json
{
  "codename": "<from packet>",
  "recognizedUnit": "<real name if you recognized it, else null — for audit; must NOT influence output>",
  "reconstruction": {
    "skill1": "<reconstructed prose>",
    "skill2": "<reconstructed prose>",
    "burst":  "<reconstructed prose>"
  },
  "codeDrivenSurprises": [
    "<each place where the runtime behavior in sim.ts is NOT obvious from the block/field name — the
      candidate gotchas. e.g. 'stat X is added to the Damage-Up bucket, not multiplied on ATK',
      'trigger Y actually fires at FB-entry not on cast', 'effect Z is silently inert because ...'>"
  ],
  "lowConfidence": [
    "<blocks/fields whose intended kit wording you could not pin down from code alone>"
  ]
}
```

Write the reconstruction JSON to `scripts/blind-rebuild/reconstructions/<slug>.json` (the harness will
tell you the slug) OR return it as your final message for the driver to save.
