# Manual review — belorta (Belorta)

**Gauntlet date:** 2026-08-05
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (scoped all-ally buff `chargeSpeedPct`; timed 10s duration; `burstCast`-vs-`fullBurstEnter` trigger identity)

> Slug disambiguation: `belorta` is the BASE unit (no variant exists) — SR/Electric/Attacker/Burst II,
> Rocket Launcher, 20s burst CD. Lint passed with no AMBIGUOUS.

## Kit summary

Belorta is an Electric rocket-launcher Attacker. Her Skill 1 widens her explosion radius for 5s after
every full-charge attack — a pure AoE-geometry stat with no damage term and no engine primitive, inert
against the single partless scope-lock boss. Her Skill 2 is a crowd-fighting tool: when ONE attack hits
MORE than 4 enemy units, the victims take a small DEF reduction (3.52%/5s) and a 14.96%-of-final-ATK
additional hit — a gate the single-boss sim can never satisfy, so both sentences are dead in domain.
Her burst "Tricky Bomber" deals one 192%-of-final-ATK hit to enemies in range the moment she casts
(FB-exempt by timing — the cast lands before the Full Burst window opens; crits at the caster rate per
the U1 FunctionTable rule; never cores, never range), and grants ALL allies — herself included — Charge
Speed ▲2.82% for 10s, keyed to HER OWN burst cast (not Full Burst entry). The charge-speed buff is live:
the engine shortens the charge cycle by (1 − ΣCS/100) per frame on her 90-frame RL charge (and on any
charge-weapon ally), which the spec test pins through a 1s-duration counterfactual.

## Line-by-line

| Line                                                        | Disposition    | Notes                                                                                                                                     |
| ----------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| S1: full charge → self Explosion Radius ▲9.55%/5s           | DOCUMENTED_GAP | AoE geometry, not damage: no radius StatKey exists and `projectileExplosionPct` is Explosion DAMAGE ▲ (a different mechanic). Inert vs one partless boss; verbatim unmodeled; ⚑ out-of-domain (needs multi-enemy/spatial model) |
| S2: gate — an attack hits more than 4 enemy unit(s)         | DOCUMENTED_GAP | Unsatisfiable vs the single scope-lock boss; verbatim unmodeled; ⚑ out-of-domain (needs a multi-enemy encounter model)                    |
| S2: DEF ▼3.52%/5s on the target(s)                          | DOCUMENTED_GAP | Inherits the gate; ALSO no boss-DEF-reduction channel (defPct is self-DEF/inert; damageTakenPct is the Taken bucket — folding it in would be a fudge). Verbatim unmodeled |
| S2: 14.96% of final ATK as additional damage                | DOCUMENTED_GAP | Inherits the gate. The kit's biggest inflation trap (~24% of her 61.3 normal mult PER SHOT if shipped ungated, plus phantom burst gauge). Pinned absent against a gate-less-rider counterfactual |
| Burst: burstCast → enemy flatDamage 192%                    | FAITHFUL       | One hit per own cast, literal maxed magnitude (lv-1 = 68.57 is the counterfactual), bucket 'burst', FB-exempt (empty fbMajorApplied list), crit-eligible at caster rate (U1) |
| Burst: burstCast → all allies chargeSpeedPct 2.82%/10s      | FAITHFUL       | All 3 allies incl. self per cast; 600-frame expiry; lands ON her cast frame (burstCast, not fullBurstEnter); live consumption pinned via the 1s-duration counterfactual |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Independently derived the
  same dispositions for every line: S1 UNMODELED (radius is geometry; named the projectileExplosionPct
  laundering as the nearest-wrong model), S2 UNMODELED (gate unsatisfiable; named the hitCount misread
  and the gate-less rider as the traps), burst nuke FAITHFUL + load-bearing (burstCast, pre-FB, no
  range), charge-speed FAITHFUL + load-bearing (all allies incl. self, burstCast-keyed, wall-clock 10s).
  Caught the crit convention: flatDamage riders default crit ON (U1 FunctionTable rule — an ENGINE fact,
  not kit-silent), which the driver then pinned with a critEligible assertion + crit:false counterfactual.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived the full spec from kit
  prose. Adapted (plumbing only, every asserted intent preserved): (1) `onEvent` moved into `comp.cfg`
  (the blind packet's top-level field never reached runSim — every event slice was empty); (2) fixture
  moved from `controlComp` to a B2-free comp — the engine's first-ready pick breaks equal-CD ties
  LEFTMOST and crown monopolizes stage 2 there (probe: belorta 0 casts/180s), exactly the failure the
  blind model's own gap note prescribed for; (3) B2e's observable moved from count to frames (same
  intent, observable valid in a B2-free comp). Result vs the driver override: **13 pass / 2 skip /
  0 fail** — the skips are the two pre-declared structural GAPs (S1 radius primitive, S2 multi-enemy
  gate + enemy-DEF-down primitive), both matching the driver's DOCUMENTED_GAP dispositions.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Byte-equivalent on BOTH load-bearing
  burst lines (burstCast flatDamage 192 + burstCast chargeSpeedPct 2.82/10s/allies — cosmetic noRange/
  noFb spelled explicitly where the engine hardcodes/auto-exempts). Diverged on skill1/skill2 by
  shipping them LIVE-with-flags under a self-imposed "a blind parser must not silently delete a damage
  line" rule, while its own caveats conceded the driver's reading: radius → "the faithful alternative
  is to leave it fully unmodeled (zero damage)"; S2 gate → "NEVER satisfied at scope lock … the
  pessimistic reading (drop both skill2 blocks) is equally defensible". Also independently refused the
  damageTakenPct fold for the DEF-down ("would be a fudge").
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, 0 gotchas.**
  All 6 lines accounted (2 FAITHFUL + 4 DOCUMENTED_GAP), zero silent drops. Ruled both S6 divergences
  spurious (RECON_ERROR-class on the blind side — it shipped the exact nearest-wrong encodings S2b had
  pre-named while its own caveats conceded the inert reading), verified the formula checks (no radius
  term anywhere in the damage buckets; DEF is a flat subtractive term with no boss-reduction channel;
  burst-cast boundary rule; charge-speed subtractive on charge time), and confirmed every
  counterfactual suite fails as required so the green is not vacuous.

## Residual flags (owner spot-check)

- Burst nuke's pre-FB exemption and caster-rate crit rest on the engine/datamined U1/U10 FunctionTable
  conventions, not a belorta-specific popup pair. One recorded burst-cast popup pair (crit vs non-crit,
  no +50%) would independently confirm (standing popup-math note).
- ⚑ out-of-domain (both damage-exactly-zero in sim domain, estimate+recipe+tier in the override note):
  (1) Explosion Radius needs a multi-enemy/spatial-AoE model before any radius stat can be load-bearing;
  (2) the S2 gate + DEF-shred + rider need a multi-enemy encounter model + a boss-DEF-down primitive.
- Cadence tuple (ammo 6 / reloadFrames 141 / chargeFrames 90) is datamine-sourced (characters.json),
  no charFixes; unmeasured like every non-hand-tuned unit.
