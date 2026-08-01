# Manual review — dorothy (Dorothy)

**Gauntlet date:** 2026-07-31
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (scoped `burstCdr` team-rotation lever; self-state "Manifestation" gate; `burstCast`-keyed timed Pierce window; meta-defining Brand redistribution nuke)

> Slug disambiguation: `dorothy` is the base AR/Water/Supporter (data name "Dorothy", Burst I, cd 20s,
> Pilgrim). The slug lint flagged the SHARED base name "Dorothy" (vs `dorothy-serendipity`, the SG/Water
> attacker) — confirmed exact slug `dorothy` and used it verbatim everywhere; the two are entirely
> different units. Structurally a team burst-cooldown engine whose own damage is two distributed channels.

## Kit summary

Dorothy is a Water-element AR Supporter on Burst I whose meta identity is rotation speed, not personal
damage. Every time she empties her 60-round magazine (last bullet / reload start) she cuts ALL allies'
Burst Skill cooldowns by 1.56s (self included) — a recurring per-magazine team rotation accelerator that
is her load-bearing contribution. Her Skill 2, "Scorch to Dust", has no activation clause, so it is a
20s internal-cooldown periodic nuke (datamined `skillCooldownsSec.skill2 = 20`; the base CD is NOT in the
kit text but the burst's "Skill 2 CD ▼18s" proves a base ≥18s exists) dealing 216% of her final ATK as
Distributed Damage to all enemies (the single boss under scope lock). Her Burst Skill, "Paradise Lost",
puts her into Manifestation for 10s: she gains Pierce for 10s (a TIMED window, not a whole-fight flag),
her Skill 2 cooldown is slashed by 18s for the window (so Scorch to Dust fires far more often), and her
last-bullet shots additionally grant the team +50.68% Damage to Parts for 5s. The burst also Brands a
designated enemy: it accumulates all damage the team deals to it over 10s, then re-deals that total
(capped at 8900.83% of her final ATK) to all enemies as Distributed Damage when the window ends. In
practice the cap is far below what a realistic team deals in 10s (~98M vs a ~29M raw cap in the control
comp, ≈11× headroom), so Brand effectively always pays out its full cap as one large delayed nuke that
lands inside her own Full Burst window (cast+10s ⇒ fbMajorApplied true).

## Line-by-line

| Line                                                                                            | Disposition       | Notes                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1-L1: lastBullet → allies `burstCdr` 1.56 (self incl.)                                         | FAITHFUL          | Load-bearing rotation lever; D1 proves it live by comparing fullBurstStart frames shipped-vs-stripped (every FB after her first reload arrives strictly earlier) and discriminates ally-wide vs self-only / removed                                                                                                                                                         |
| S1-L2: lastBullet "during Manifestation" → allies `partsDamagePct` 50.68/5s                     | DOCUMENTED_GAP    | Stat/value/duration/trigger/target all faithful; `partsDamagePct` is INERT in v1 (partless boss — D2 byte-identical totals). The "during Manifestation" self-state gate is deliberately UNENFORCED (no primitive); moot                                                                                                                                                     |
| S2: interval:20 → enemy `flatDamage` 216 distributed                                            | FAITHFUL          | 20s grid (first fire t=20, 8 fires/180s), skill bucket; D3 pins magnitude + cadence (interval:10/40 counterfactuals) + distributed flavor (distributedDamagePct probe lift); teammate totals byte-identical when stripped                                                                                                                                                   |
| Burst-L1: "Manifestation: Cooldown of Skill 2 ▼18s, 10s"                                        | DOCUMENTED_GAP    | ⚑ UNMODELED — no skill2-CDR primitive shortens the interval timer, and no clean phase-independent reduction (extra-cast count depends on burst phase in the S2 cycle). Estimate ~+5 nukes ≈ +1080% distributed/burst; recipe + Tier 2 recorded                                                                                                                              |
| Burst-L2: burstCast → self `gainPierce` 10s                                                     | FAITHFUL          | TIMED window, NOT top-level `hasPierce`; D4 discriminates behind a pierceDamagePct probe (no-window < timed < permanent); inert in the base comp (no Pierce Damage ▲ consumer)                                                                                                                                                                                              |
| Burst-L3: "Brand" — accumulate team damage 10s → re-deal to all enemies, cap 8900.83% final ATK | FAITHFUL (at-cap) | No accumulator primitive, but the cap binds (~11× headroom) so it is exactly `flatDamage` 8900.83 distributed `delaySec:10`; D6 pins one-per-cast, cap magnitude, cast+10s landing INSIDE her FB (fbMajorApplied true), and discriminates the instant-at-cast mis-model (lands pre-FB, misses the major). Residual ⚑: at-cap assumption + redistribution pipeline semantics |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. All five modeled lines
  FAITHFUL with matching counterfactuals; the two unmodelable lines (Manifestation S2-CDR, Brand
  accumulator) flagged as GAPs. **Independently derived the Brand at-cap `delaySec:10` encoding** (valid
  only with the cap-binds derivation) AND the instant-at-cast FB-major discrimination before seeing the
  driver's work, and pre-flagged the fixture trap (a Burst I unit seated in the B3 carry slot never
  casts ⇒ green-by-vacuity). No REAL-GOTCHA.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived all five kit lines with
  FB-count rotation discrimination (S1a), linearity magnitude pins (S2, Brand), a timed-vs-permanent
  Pierce check, and its own `it.skip` GAPs for Manifestation + the Brand cap. As-written vs the driver
  override: 12 pass / 2 fail / 3 skip — **both failures are the S1b "during Manifestation" gate**, which
  the blind asserts structurally but the engine has no primitive to express (and the effect is inert).
  After adapting (`blind/dorothy.adapted.test.ts`: [P1] import path; [P2] the S1b gate contrast
  redirected to the documented ⚑ per the anchor-innocent-maid [P7] precedent — inert effect, no
  self-state gate primitive): **14 pass / 3 skip / 0 fail** GREEN vs the driver override, preserving
  every kit claim and counterfactual.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. **Block-identical to the driver on all
  five modeled lines** — S1 `burstCdr` 1.56/allies, S1 `partsDamagePct` 50.68/5s/allies, S2 `interval:20`
  `flatDamage` 216 distributed/enemy, burst `gainPierce` 10s/self, and burst Brand `flatDamage` 8900.83
  distributed `delaySec:10`/enemy. The Manifestation S2-CDR was authored as a mode-gated `interval:2`
  block that is INERT by default (mode is user-selected) AND listed in `unmodeled` — functionally the
  same decision as the driver's ⚑. The Brand accumulator is listed in `unmodeled` as an at-cap
  approximation, matching the driver's residual ⚑.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true,
  s5TestsVsDriverOverride: GREEN (0 red).** All six kit lines FAITHFUL or DOCUMENTED_GAP, zero silent
  drops. Three gotchas, all FIDELITY / `documentedByDriver:true`: Manifestation S2-CDR (med, ~+1080%
  distributed/burst under-credited — a primitive absence all three agents independently confirmed, not a
  driver error), the S1-L2 Manifestation gate (low, inert), and the Brand at-cap residual (low). The
  judge called Brand the "strongest convergence in the kit" and verified every load-bearing test fails
  under its named nearest-wrong model.

## Residual flags for owner

1. **Brand cap-binds is sim-internal.** The at-cap reduction rests on the sim's OWN team-damage totals
   (~98M/10s vs ~29M raw cap), never validated against a real Dorothy fight. A deliberately weak team
   could fall below the cap and be over-credited. Spot-check Brand popups in a recorded Dorothy comp.
2. **Manifestation S2-CDR is unmodeled (med).** The burst is supposed to buy ~~5 extra Scorch to Dust procs
   (~~+1080% distributed) per 10s window; the engine has no skill-cooldown-modulation primitive. Needs the
   driver's proposed `skill2CooldownReductionSec` scoped-buff stat + footage of the real in-window S2
   cadence (continuous recharge shortening vs a single ready-snap) before enacting.
3. **S2 first-fire phase (t=20)** is the standing ⚑ interval convention, not measured.
4. **S1 burst-CDR rotation effect** is validated through the sim's own chain arithmetic; it has no
   popup-level anchor.
5. **Redistribution pipeline semantics** (whether Brand's capped value re-runs the full Damage-Up bucket
   or is dealt as a raw distributed value) is a second-order uncertainty the `flatDamage` idiom resolves
   by treating 8900.83% as a skill multiplier, consistent with every other distributed nuke.

None block GO; all are recorded in the override note/caveats and `data/kit-status.json` residual.
