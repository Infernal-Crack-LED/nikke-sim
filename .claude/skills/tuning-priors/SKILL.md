---
name: tuning-priors
description: Mine recurring correction patterns ACROSS hand-tunes into reusable modeling priors, so new characters start from a better fit instead of re-discovering the same fix. Use after a batch of hand-tunes lands, when a correction "feels familiar" (you've made this same fix on another unit), periodically to refresh docs/modeling-priors.md, or to decide when a recurring per-kit fix has earned promotion to an engine/parser default. Distinct from skill-maintenance (which lands ONE lesson per change) — this mines the corpus of MANY tunes for cross-cutting structure.
---

# Tuning priors — turn the tuning history into a better starting model

## When to use
- A hand-tune just landed and its root cause is one you've fixed before on another unit.
- After a calibration batch (e.g. a reference-grade push, a probe run of several units).
- Periodically, to re-mine the corpus and refresh `docs/modeling-priors.md`.
- When deciding whether a recurring per-kit correction should become an ENGINE default (the way
  the 22-frame release latency became the default for every sniper + launcher).

The goal: every new character's override should START from the accumulated priors, so tuning is a
small correction, not a from-scratch fit.

## Steps

1. **Gather the correction corpus.** For each tuned unit pull (symptom → root cause → fix):
   - `docs/hand-tuned.md` + `data/hand-tuned.json` (the evidence column names the fix);
   - the override `note` in `src/skills/overrides/<slug>.json`;
   - `docs/DECISIONS.md` calibration entries and `docs/answered-questions.md` items;
   - `docs/probe-runs.md` (what a recording overturned).

2. **Cluster by CORRECTION TYPE, not by unit.** The clusters (extend as new ones appear):
   cadence / rate-of-fire · proc-class Full-Burst & range exemption · release latency ·
   parser-dropped DoT or unsupported trigger · stack/currency → steady-state averaging ·
   multi-projectile instance split/merge · HP-scaling source · element-advantage factor ·
   focus-gauge (charge-weapon) · base-stat / gear basis. A **pattern** = the same root-cause fix
   in **≥3 units**.

3. **For each pattern, write the prior** in `docs/modeling-priors.md`: name the game-mechanic root
   cause, list the units it hit (evidence), and state the PRIOR — the concrete default to apply to
   a fresh override before tuning. Note the typical magnitude/direction (e.g. "parser reads sustained
   DoTs as 1/s → undercounts ~Nx; rebuild as a real-interval DoT").

4. **Decide engine-default vs per-kit checklist.**
   - **Universal** (holds for every unit of a class/weapon, no known exception) → propose folding it
     into the engine/parser default so it applies automatically. That's an engine change → run
     `/mechanics-doc-upkeep` + add/adjust a `scripts/regression.ts` assert + `bash scripts/verify.sh`.
     Record the promotion in `docs/DECISIONS.md`.
   - **Per-kit** (varies — e.g. the proc-class Full-Burst treatment is genuinely per-kit: Scarlet
     exempt, Liberalio measured ×1.3333 WITH Full Burst) → it stays a CHECKLIST item, applied then
     verified per unit. Never silently generalize a per-kit pattern into a default.

5. **Maintain the new-character starting checklist** (the last section of `docs/modeling-priors.md`):
   the ordered pre-corrections + priors to apply when an override is first created, so the first sim
   already lands close. When `/probe-processing` or `/hand-tune-batches` tunes a NEW unit, start from
   this checklist.

6. **Log exceptions.** When a fresh tune CONTRADICTS a prior, record it as a per-kit exception under
   that pattern — the contradiction is data (it usually means the pattern is per-kit, not universal),
   not a reason to delete the prior.

## Verify
```sh
bash scripts/verify.sh   # only if a prior was promoted to an engine default
```
