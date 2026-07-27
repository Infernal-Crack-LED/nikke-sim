---
name: skill-maintenance
description: The memory→skills/tests maintenance loop. Use after completing any non-trivial change (engine mechanic, override rework, measurement processed, or a debugging session that taught a gotcha) — before declaring the task done, run this loop so the lesson lands in a durable home instead of decaying in the chat transcript.
---

# Skill maintenance — fold what you just learned into a durable home

## When to use

After ANY non-trivial change, and especially after a surprise: a video measurement that overturned
an assumption, a multi-step extraction procedure you had to reconstruct, an engine mechanic change,
or a data-source discovery.

## The loop (run all four checks)

1. **Did this teach a repeatable procedure or gotcha?**
   - Refines an existing playbook → update the matching `.claude/skills/*/SKILL.md` body (dated
     change-log sections were abolished 2026-07-26 — git history is the record; operational
     knowledge goes in the body itself).
   - New repeatable procedure → new skill from `_TEMPLATE`.
   - A WHY (settled tradeoff, rejected alternative, owner ruling) → append to `docs/DECISIONS.md`
     with its evidence tier and where the proof lives. **If the ruling changed the LANDED state** (a
     live flag/default, timing constant, rotation rule, geometry model, or opt-in kit primitive), also
     update `docs/STATE.md` — the current-state registry is a derived index that must track the engine
     (docs/CONVENTIONS.md → Doc hygiene; DECISIONS is the append-only why, STATE.md the current what).
2. **Did engine behavior change?**
   - The regression snapshot will drift — regenerate deliberately
     (`npx tsx scripts/regression.ts --update`) and commit it WITH the change.
   - New measured truth (a video-counted full-burst count, a popup-verified value) → add it as a
     hard assert in `scripts/regression.ts`, not just a snapshot.
3. **Did game-mechanics knowledge change?** Run `/mechanics-doc-upkeep` — the source-of-truth pair
   (`docs/data/game-mechanics.md` + `docs/data/damage-calculation.md`) must reflect the engine.
4. **For work you can't eyeball** (rotation timing, popup values, gauge behavior): what would you
   need to SEE or MEASURE to know it's right? If no check exists, build one (the probe-processing
   skill catalogs the existing video/gauge tooling) and fold it into the relevant skill.

## Verify

```sh
bash scripts/verify.sh
```
