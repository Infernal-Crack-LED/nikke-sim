# Manual review — aigis (Aigis)

**Gauntlet date:** 2026-09-03
**Verdict:** GO (cross-family corroborated — two judges)
**Faithfulness:** 0.9 (kimi-code/k3, binding) · 0.83 (claude-opus-5, second judge)
**Tier:** 2 (burstCast-vs-fullBurstEnter on "Activates when using Burst Skill"; a Full-Burst-end-bounded window derived from chain timing; caster-scaled team ATK grant)

> Slug disambiguation: `aigis` is a NEW unit (no base counterpart, no variant). The game's English
> spelling is "Aigis" (the blablalink roster name); the owner's "aegis" refers to this unit.
>
> Routing for this run (owner instruction): the driver was Claude Fable 5.1, so the roles the protocol
> pins to `claude-fable-5` (S2b) went to `kimi-code/k3`; S5/S6 stayed on `claude-opus-5`; the Tier-2
> second S2b reviewer and second S7 judge were `claude-opus-5`; the binding S7 judge was `kimi-code/k3`.

## Kit summary

Aigis is an Iron SMG Supporter on Burst II (20s cooldown) with a Persona-flavored kit. From battle
start she permanently buffs her own ATK and DEF by 21.12% each. When she casts her own Burst Skill she
grants every ally, herself included, a flat ATK add equal to 21.12% of her own ATK (plus a DEF grant
scaled off her DEF), both lasting until that Full Burst ends. Her burst is a single instant hit of 396%
of final ATK as distributed damage to all enemies, landing before Full Burst opens (no +50% major). In
game terms she is a cast-gated team flat-ATK buffer with one moderate burst nuke per rotation.

## Line-by-line

| Line                                                             | Disposition | Notes                                                                                                                                                                       |
| ---------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: Persona - Palladion state wrapper (continuous, unremovable)  | UNMODELED   | Named state container; both effects it wraps ARE modeled; verbatim in unmodeled                                                                                             |
| S1: Tarukaja — self ATK ▲ 21.12% continuously                    | FAITHFUL    | `battleStart`, no expiry (A1); timed and dropped counterfactuals discriminated                                                                                              |
| S1: Rakukaja — self DEF ▲ 21.12% continuously                    | FAITHFUL    | `defPct` (exact stat), inert by mechanism (no engine reader); silent-drop counterfactual has no event (A2)                                                                  |
| S2: "when using Burst Skill as long as this unit is still alive" | FAITHFUL    | `burstCast` — HER cast, not any team Full Burst; benched-behind-crown fixture proves a fullBurstEnter model over-fires (A3). "Still alive" clause recorded as scope-trivial |
| S2: Matarukaja — all allies ATK ▲ 21.12% of the skill user's ATK | FAITHFUL    | `casterAtkPct` (flat 21.12% of her static ATK, uniform, self included); self-only / excludeSelf / target-scaled counterfactuals discriminated (A3)                          |
| S2: Marakukaja — all allies DEF ▲ 21.12% of the skill user's DEF | UNMODELED   | No caster-DEF-scaled StatKey (defPct is the target's own DEF %); DEF has no consumer in v1; verbatim in unmodeled with recipe                                               |
| S2: Deactivation condition — when Full Burst ends                | FAITHFUL ⚑  | durationSec 10.867 = 652 f (30 f stage gap + 22 f pre-FB + 600 f), DERIVED from measured chain timing; every expiry pinned to the actual `fullBurstEnd` frame (A3)          |
| Burst: all enemies — 396% of final ATK as distributed damage     | FAITHFUL    | Cast-instant (no +50% major, no range), crit-eligible, distributed flavor, TAGGED `burstDesc 'allEnemies'` (owner ruling 2026-08-10, census-enforced) (A4)                  |

## Cross-family corroboration

- **S2b (kimi-code/k3, binding reviewer):** `leakDetected: null`. 3 load-bearing lines, all FAITHFUL;
  Marakukaja UNMODELED verbatim. Named the exact traps: burstCast-not-fullBurstEnter with a "benched"
  fixture as the mandatory discriminator, casterAtkPct flat value (not 21.12), self included, the FB-end
  window pinned to `fullBurstEnd` frames, nuke pre-FB/no-major/no-range. All converged with the driver.
- **S2b (claude-opus-5, second reviewer):** `leakDetected: null`. 8 lines. Same load-bearing set; flagged
  the HARNESS HAZARD that `controlComp('aigis')` benches her behind crown (which the driver's fixtures
  avoid, and which the blind S5 author then fell into). One dissent — `burstDesc 'allEnemies'` called
  "reflexive" — overruled by the owner ruling 2026-08-10 (literal-only) and the census fixture that
  enforces it.
- **S5 (claude-opus-5, blind test):** `leakDetected: null`. Unmodified file does not compile (one
  unescaped apostrophe) and, with that fixed, runs 6 pass / 5 fail / 1 skip — every failure downstream of
  its `controlComp('aigis', true)` fixture where she never casts (its non-vacuity gate is satisfied by
  liter's casterAtkPct, not hers). Adapted copy (quote + fixture → liter / aigis / `scarlet` (AR/Electric) / `helm` (SR/Water)):
  **11 passed / 1 skipped / 0 failed** vs the driver override. The skip is the blind author's own
  Marakukaja GAP.
- **S6 (claude-opus-5, blind override):** `leakDetected: null`. Converges on skill1 (passive vs
  battleStart — equivalent), the S2 burstCast/allies/casterAtkPct block, and the burst nuke. Two
  divergences: Marakukaja shipped as a `defPct` basis approximation (ruled the weaker reading — wrong
  basis); the window authored as 11 s vs the driver's frame-exact 652 f.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 0.9, discriminationOk true.** One low gotcha:
  the "still alive" clause was not recorded — fixed (verbatim in unmodeled.skill2). Convergence RED only
  on the blind fixture defect; 11/11 green once she can cast.
- **S7 (claude-opus-5, second judge):** **GO, faithfulness 0.83, discriminationOk true.** Same
  "still alive" nit (fixed) plus one ENGINE-level finding routed off this unit: `casterAtkPct` resolves
  off the caster's STATIC ATK while `docs/data/damage-calculation.md` §1a says a "% of caster's ATK"
  grant converts off the caster's FINAL ATK — roster-wide and pre-existing (see open-questions U41), the
  encoding here is the correct stat either way.

## Residual flags (owner spot-check cluster)

1. **The 652 f window** is exact only on the plain 30 f / 22 f / 600 f chain; a Full-Burst extender
   (modernia-style `fullBurstExtend`) or a stalled chain makes the fixed durationSec drift from the
   kit's event condition. Recipe: read her buff banner across the FB boundary on a focus recording.
2. **`casterAtkPct` basis (static vs final caster ATK)** — not an aigis defect; a roster-wide engine
   question (U41). Her own +21.12% Tarukaja is excluded from the basis of the team grant she hands out
   today; if the game uses final ATK the grant is ~21% larger.
3. **Marakukaja** stays unmodeled until a DEF consumer exists (recipe in the override).
