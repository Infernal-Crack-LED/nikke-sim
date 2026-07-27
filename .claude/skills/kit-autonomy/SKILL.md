---
name: kit-autonomy
description: Router for the kit-autonomy gauntlet (autonomous test-first kit-faithfulness audit for ONE unit). Trigger: "run the kit-autonomy gauntlet on <slug>". The procedure of record is scripts/kit-autonomy/SKILL.md — READ AND FOLLOW IT; this file is only the harness routing layer. Canonical model names: scripts/kit-autonomy/CROSS-FAMILY-PROTOCOL.md.
---

# kit-autonomy — router (procedure: `scripts/kit-autonomy/SKILL.md`)

**This is a ROUTER, not the procedure.** The full stage protocol (S0–S9), non-negotiables, blind-packet
redaction, landing rules, batch hygiene, and concurrent-batch reconciliation live ONLY in
`scripts/kit-autonomy/SKILL.md` — read and follow it. Model routing is NOT restated here on purpose:
`scripts/kit-autonomy/CROSS-FAMILY-PROTOCOL.md` is the single source (change a model = edit that one file).

Harness notes:

- **Same-family roles** run as native subagents with the de-contaminated packet (base skill §0 redaction +
  leak assertion); prepend `.claude/subagent-non-negotiables.md` to every subagent prompt.
- **Cross-family roles** go through the CLI bridges (a harness cannot call another model family natively):
  `bash scripts/kit-autonomy/dispatch-claude.sh <packet.md> <model> <result.json>` and
  `bash scripts/kit-autonomy/dispatch-kimi.sh <packet.md> <model> <result.json>`, run FOREGROUND with a long
  timeout (~600000 ms — 44KB packets take 2–5 min; a slow dispatch is not a failure).
- Packet prep + leak assertion: `npx tsx scripts/kit-autonomy/prepare-cross-family-packet.ts <slug> --tokens
"<signature magnitudes + mechanic names>" --roles s2b,s7`.
- **Artifact economy (owner ruling 2026-07-26, corrected):** a `manual-review/<slug>.md` owner-review doc is
  ALWAYS generated, for every unit (GO and NO-GO alike) — the owner's review surface alongside the kit-status
  findings + `results/<slug>.json`; force-commit only the `cross-family/<slug>/*.json` RESULT files (packets
  are regenerable scratch — stopping the packet force-commit was the only intended cut); a DECISIONS.md entry
  only when an actual ruling/tradeoff occurred.
- Batch orchestration (restart-safe unit selection, stall recovery, lean spawn prompts) is documented for the
  Qwen driver in `.qwen/skills/kit-autonomy/SKILL.md` + `.qwen/agents/kit-gauntlet-driver.md`; the same
  patterns apply when this harness drives a batch.
