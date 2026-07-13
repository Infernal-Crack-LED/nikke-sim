# Open mechanics questions (for user research)

Running record of unresolved game-mechanics questions that block sim accuracy.
Add entries as they come up; strike through when answered (record the answer inline).

## Q1 — the ×0.59 proc factor (2026-07-12)
Privaty:T's S2 procs (last-bullet 256.17% + Designated 1687%) scaled by ×0.59 land her at
1091M vs 1104M real (T4); Liberalio's S1 procs (202.5%/core-hit) scaled by the same ×0.59 land
1141M vs 1142M real (T1). SWHA's dwarves needed the same factor until the real mechanism was
found (sequential-AD dilution). BUT helm's 178.98% and anis-star's 120.13% full-charge procs
validate at FULL value — so it is not a universal "additional damage" rule.
0.59 ≈ 1/1.7 ≈ losing the +50% FB + +30% range major bucket.
**Question: do proc hits like Privaty's last-bullet and Liberalio's core-hit additional damage
receive the +50% full-burst damage bonus and the +30% full-range bonus? What distinguishes them
from helm/anis procs (which clearly get full value)?**

## Q2 — MG spool vs Privaty ammo cut (crown-T4 0.71)
Max Ammo ▼ clips the current belt (confirmed) and MG wind-up resets on reload (confirmed) —
i.e. real mechanics are as-simmed or harsher, yet real Crown does BEST in the Privaty comp
(373-375M vs 215-290M elsewhere, reproduced twice). Full spool persistence overshoots (1.36).
**Question: does the MG wind-up ramp take ~3.75s (our cubic, calibrated to "8s to empty 300")
or is it much faster in practice? Anything else Privaty grants MGs that would offset the cut?**

## Q3 — CCW review (unit too new for Wayback)
CCW reads 1.33 hot (T5, MG mode). Need her Prydwen review pasted to re-derive:
whether the 833.79% core-strike rider receives the core bucket (we model core:true),
her 900%/5s dot, the 6000% burst nuke interactions, and MG-mode cadence.

## Q4 — Maiden: Ice Rose without burst reads 0.60 cold
With her burst never cast (real T2), sim gives 151M vs 251M real. Her non-burst kit
(normals + MP auras) is undercounted ~40%. Candidates: RL cadence, the "MP replenished"
ally aura value, unmodeled passive damage.

## Q5 — mild systematic edges (park until majors are done)
Mast:RM 0.84-0.86 (both fights, never-bursting B2) · Neon:VE 0.87 · SBS 1.13 ·
Little Mermaid 1.15/1.02 · Nayuta 1.13.
