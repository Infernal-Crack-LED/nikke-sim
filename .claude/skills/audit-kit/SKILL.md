---
name: audit-kit
description: Deep, two-way faithfulness audit of ONE unit's kit implementation. Triangulates a SIGHTED full-context review (what the override intends + documents), a BLIND Opus code-only rebuild (what the engine actually does), and a three-way reconciling judge (both vs the real kit text + the damage-formula SSOT). Use to answer "does the sim faithfully represent this unit's kit, and where does it silently diverge?" — before enacting an override/engine change, when a unit's board reading is unexplained, or to industrialize kit-faithfulness review across the roster. Findings-only; nothing here edits the tree.
---

# audit-kit — three-way kit faithfulness audit

Reverse-checks the sim against a unit's real kit. Normal authoring goes prose → override (forward). This
runs the arrow backward and sideways at once, then reconciles:

- **BLIND rebuild** (Opus, code-only) — reconstructs the kit from the engine + stripped override. Says
  what the code *does*, with zero knowledge of intent or the real text. Surfaces non-obvious routing.
- **SIGHTED full-context review** — reads the real kit text, the override in full, `kit-status.json`,
  and the board. Says what the override *intends* and what it deliberately doesn't model.
- **RECONCILING judge** — receives BOTH, plus the real kit text and the damage-formula/mechanics SSOT,
  and classifies every divergence: faithful, documented gap, or a real gotcha (encoding / engine /
  fidelity / silent-drop).

The value is triangulation: the blind agent can't be biased by intent, the sighted agent knows what's
already documented, and the judge grades both against ground truth + the formula. A fresh gotcha the
blind agent found and the review did NOT document, confirmed against the formula, is the payload.

## When to use
- Before enacting an override/engine change on a unit — establish what's actually unfaithful first.
- When a unit's board reading (`scripts/board-read.ts`) is HOT/COLD with no attributed cause.
- Auditing a slot whose mechanic lives outside the block schema (`consolidation`/`resources`/`charFixes`)
  — the blind rebuild is unusually good at catching "the block array is empty but the skill IS modeled."
- Industrializing faithfulness review across the roster (loop the steps, or wire the Workflow below).

## Non-negotiables
Prepend `.claude/subagent-non-negotiables.md` to EVERY subagent prompt below. Verify YOUR OWN premise
first: the EXACT slug (base ≠ variant is a P0 failure). This skill is **findings-only** — it never edits
overrides or the engine. A confirmed gotcha is a candidate for `docs/engine-modeling-gaps.md` or the
kit-parse reconciliation backlog, enacted ONLY later under measured>fudge + the scientific-method gate +
`verify.sh`/snapshot.

## Steps (per unit `<slug>`)

1. **Build the blind packet** (deterministic, strips all skill text; runs a leak assertion):
   ```sh
   npx tsx scripts/blind-rebuild/build-packet.ts <slug>
   ```
   → `scripts/blind-rebuild/packets/<slug>.blind.json` (blind input) +
   `scripts/blind-rebuild/truth/<slug>.truth.json` (judge-only ground truth).

2. **Spawn the two independent reviewers IN PARALLEL** (they must be SEPARATE subagents so the blind one
   stays blind — it never sees the review, the truth file, or the unit's identity):
   - **BLIND rebuilder — PIN TO OPUS (`model: "opus"`).** Prompt = `scripts/blind-rebuild/RECONSTRUCT.md`
     + attach ONLY `packets/<slug>.blind.json`; it reads the packet's `codeFiles`. Give it NOTHING from
     `truth/`, `data/characters.json`, or the override. Save its JSON → `reconstructions/<slug>.json`.
   - **SIGHTED full-context reviewer — PIN TO OPUS (`model: "opus"`).** Prompt = `scripts/blind-rebuild/FULL-CONTEXT-REVIEW.md`
     (prepend the non-negotiables). It reads `characters.json`, `kit-status.json`, the override in full,
     and runs `board-read`. Save its JSON → a scratch path (e.g. `<scratchpad>/audit-kit/<slug>.review.json`).

3. **Spawn the RECONCILING judge — PIN TO OPUS (`model: "opus"`)** (after both finish). Prompt = `scripts/blind-rebuild/RECONCILE.md`,
   prepended with the non-negotiables AND the `/context` mechanics pack (invoke the `context` skill and
   paste the relevant sections — §1 buckets, §2 crit/core/FB, §9 procs/DoT/flavors — so it can do the
   formula check without re-exploring). Attach all three: `reconstructions/<slug>.json`, the review JSON,
   and `truth/<slug>.truth.json`. Save its JSON → `results/<slug>.json`. The judge's return now includes
   a `kitDescription` field — a plain-English "what this kit does" paragraph, separate from the gotcha
   findings — see the "kitDescription" gotcha note below.

4. **Synthesize for the owner.** Report the judge's `gotchas` ranked (SILENT_DROP → ENGINE/FIDELITY →
   ENCODING), each with: the real kit line, what the code does, the formula citation, whether the review
   already documented it, and the faithful `suggestedFix` (or a measurement flag — never a fudge). Route
   confirmed engine/fidelity gotchas into `docs/engine-modeling-gaps.md`; per-unit encoding gotchas into
   the kit-parse reconciliation backlog. Do NOT edit anything.

## Roster scale (optional Workflow)
Pipeline each slug through the three stages independently (`reconstruct ‖ review → reconcile`), all three
stages PINNED TO OPUS (`model: "opus"`), and rank the roster by confirmed `gotchas` (SILENT_DROP/ENGINE/FIDELITY
first). Because the blind stage is a separate blind subagent, a clean audit is real evidence the
implementation is faithful — not just the author agreeing with themselves. Only launch a Workflow when
the owner has opted into multi-agent orchestration.

## `kitDescription` — generated description, for owner review (never auto-landed)
The RECONCILE judge also returns `kitDescription`: a plain-English paragraph of what the unit's kit
actually does, independent of the gotcha-hunting (see `RECONCILE.md`). This is display copy, not a
finding — it is not graded, not part of `faithfulnessScore`, and this skill still edits nothing. When a
roster-scale run produces a per-unit fix brief (`docs/handoffs/kit-audit-fixplans/<slug>.md`), carry
`kitDescription` into that brief under its own section so the owner can sanity-check it there. It rides
along ONLY when a brief is later enacted: the override JSON has a matching optional `kitDescription`
key (`src/skills/index.ts` `OverrideFile`, display-only, never engine-consumed) — whoever lands the
enactment copies the (owner-reviewed/edited) description into that key at the same time, same as any
other override field. Never write it into `src/skills/overrides/*.json` directly from this skill.

## Gotcha
- **Blindness is load-bearing.** If the blind rebuilder ever sees the review, the truth file, or the real
  name, the whole audit is void — keep it a separate subagent with only the packet + code. `build-packet.ts`
  guards the packet (leak assertion); YOU guard what you hand the subagent.
- **Residual code leak (accepted):** `sim.ts`/`types.ts` comments name some units as examples, so the
  blind agent may recognize a unit. It must declare `recognizedUnit` and reconstruct from code regardless;
  the judge discounts recall.

## Verify
```sh
npx tsx scripts/blind-rebuild/build-packet.ts <slug>   # packet builds + leak assertion passes
```
(No engine/snapshot change — this skill produces findings, not edits.)

## Change log
- 2026-07-17 — created. Wraps the `scripts/blind-rebuild/` machinery (build-packet + RECONSTRUCT +
  FULL-CONTEXT-REVIEW + RECONCILE) into a three-agent audit. POC validated on `dorothy-serendipity`.
