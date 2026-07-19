# Blind kit-rebuild test

A **two-way faithfulness check** on the sim's kit implementation. Normally we author an override
*from* a unit's skill text (prose → code). This test runs the arrow backwards: an LLM reads **only the
engine code + the structured override, with all skill text stripped out**, and reconstructs the unit's
in-game skill prose purely from what the code implements. Comparing that reconstruction against the real
kit surfaces **non-obvious implementation gotchas** — the things a forward read glosses over:

- a stat that's routed to an unexpected damage bucket,
- a trigger whose runtime behavior doesn't match its name,
- a silently-applied engine rule (e3-style: e.g. ally-granted Max HP not feeding a teammate's
  `atkOfMaxHpPct`),
- or an override that simply mis-encodes the kit (wrong value / stat / trigger / target).

If a code-only reader reconstructs the real kit **faithfully**, the implementation is transparent for
that unit. Where it can't — and the gap isn't a known `unmodeled` line — the divergence *is* the finding.

This is a **findings-only** harness (like the kit-status audit). Nothing it produces is an enacted
change; a confirmed `GOTCHA/ENGINE` is a candidate for
[docs/engine-modeling-gaps.md](../../docs/engine-modeling-gaps.md) or the
[kit-parse reconciliation backlog](../../docs/handoffs/kit-parse-reconciliation-backlog.md), subject to
the usual measured>fudge / DECISIONS discipline.

## Two ways to run this

- **Standalone blind-rebuild** (`RECONSTRUCT.md` → `JUDGE.md`): reconstruct code-only, judge vs truth.
  The lightweight two-way check documented below.
- **Full `audit-kit` skill** (`.claude/skills/audit-kit/`): the three-way audit — adds a SIGHTED
  full-context reviewer (`FULL-CONTEXT-REVIEW.md`) alongside the blind rebuild, then a RECONCILING judge
  (`RECONCILE.md`) that triangulates both against the real kit text + the damage-formula SSOT. Use that
  skill for a deep per-unit faithfulness audit; use the standalone loop for a quick code-transparency spot-check.

## The three roles (strict blindness boundary)

```
                     ┌─────────────────────────── sees ───────────────────────────┐
  build-packet.ts →  packets/<slug>.blind.json   +   the engine code (codeFiles)     → RECONSTRUCTOR
  (this script)      truth/<slug>.truth.json                                          → JUDGE only
```

- **build-packet.ts** — deterministic. Emits the matched pair per unit.
- **RECONSTRUCTOR** (`RECONSTRUCT.md`) — a *blind* subagent. Sees the blind packet + engine code, never
  the truth file, never the real prose, never the unit's identity. Outputs reconstructed kit prose +
  its `codeDrivenSurprises` (candidate gotchas it spotted in the code).
- **JUDGE** (`JUDGE.md`) — sees the reconstruction + the truth file (real prose + the override's
  `unmodeled`/`note`/`caveats`). Classifies every divergence and emits the `gotchas` list.

### What's stripped for blindness (and why the packet is safe)

The blind packet is anonymized (**codename only** — no name/slug/image/nicknames, so the reconstructor
can't recall the real kit from training data) and the override is stripped of every prose-carrying
field: `note`, `unmodeled`, `caveats`, and any stray `raw` verbatim text on a block. The unit's
`skills` prose and the `role` datamine blob (which embeds raw `description_localkey` skill text + the
unit name) are excluded entirely. `build-packet.ts` runs a **leak assertion** on every packet — it
scans all string *values* for prose glyphs (`■`, `▲`), synergy-API `_localkey`s, and the unit's own
name tokens, and **throws** if any appear. The whole test is void if the reconstructor can read the
answer, so the builder fails loudly rather than emit a tainted packet.

> Known residual leak (accepted): the engine code itself (`types.ts`, `sim.ts`) names some real units
> in comments as examples. A reconstructor *may* therefore recognize a unit whose block structure
> matches a named example. Mitigation: `RECONSTRUCT.md` requires it to (a) reconstruct strictly from
> code semantics regardless, and (b) declare any `recognizedUnit` so the judge can discount recall.

## Run it

```sh
# 1. Build packets (one unit, several, or the whole roster)
npx tsx scripts/blind-rebuild/build-packet.ts dorothy-serendipity
npx tsx scripts/blind-rebuild/build-packet.ts --all

# 2. RECONSTRUCT (blind, PINNED TO OPUS). Spawn a subagent on Opus (claude-opus-4-8) with
#    RECONSTRUCT.md at the top, attach ONE packets/<slug>.blind.json, and let it read the codeFiles.
#    Save its JSON to reconstructions/<slug>.json. (Do NOT give it anything from truth/.)
#    Agent tool: model: "opus"  ·  Workflow: agent(prompt, { model: 'opus' })

# 3. JUDGE. Spawn a fresh subagent with JUDGE.md at the top, attach
#    reconstructions/<slug>.json + truth/<slug>.truth.json. Save its JSON to results/<slug>.json.
```

`packets/`, `truth/`, `reconstructions/`, and `results/` are all gitignored (regenerable). Only
`build-packet.ts`, `RECONSTRUCT.md`, `JUDGE.md`, and this README are tracked.

### Scaling to the roster

The driver (or a `Workflow`) pipelines each slug through the two subagent stages independently:
`reconstruct → judge`. Blindness is preserved because the two stages are separate subagents with
disjoint inputs. Rank the roster by judge `gotchas` (ENGINE first, then ENCODING), and feed confirmed
findings into the existing backlogs. Because the reconstructor is blind, a clean run is real evidence
the implementation is transparent — not just that the author agrees with themselves.
