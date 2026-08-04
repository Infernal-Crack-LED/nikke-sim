# Manual review — noah (Noah)

**Verdict: GO — faithfulness 1.0** (binding judge kimi-code/k3, zero gotchas, discriminationOk
true). Kit-autonomy gauntlet 2026-08-03. Tier 1 (pure tank — zero damage lines and zero
weapon-state modifiers in the whole kit; the single modeled line is an inert stat buff, with the
burstCast-vs-fullBurstEnter pin discriminated BEHAVIORALLY rather than just structurally).

RL / Defender / Wind / Burst II, Pilgrim, 40s CD, ammo 6, reloadFrames 171, chargeFrames 60,
hitsPerShot 2. noah is a PURE TANK kit — taunt / damage-taken reduction / invulnerability / DEF,
and nothing else. The sim models no HP pool, no incoming damage and no enemy targeting, so seven
of her eight kit lines are out-of-domain; her one in-domain line is the burst all-ally DEF ▲
133.48% for 10 sec grant, encoded as the engine-inert `defPct` buff (marciana convention — and
the LITERAL form this time: a plain self-DEF percentage, no caster-scaling approximation). Her
personal damage is weapon-only (RL charge cycle); she is damage-neutral by the same proof as the
six clean-weapon basis units (own AND team totals byte-identical with her kit zeroed, solo and
in-comp), though she is NOT one of the six basis cells (the harness list is owner-fixed).

## Kit summary & line-by-line dispositions

| Line | Kit text (SL10)                                                                | Disposition          | Encoding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---- | ------------------------------------------------------------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1-a | There is a 10% chance of activating when attacked. Affects all allies.         | UNMODELED (verbatim) | No `attacked` trigger kind and no RNG-gate primitive in TriggerDef; the v1 boss attacks nobody, so the clause can never fire. Pinned: the line lives verbatim in `unmodeled.skill1`; noah originates no interval-sourced buffs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| S1-b | Damage Taken ▼ 8% for 10 sec                                                   | UNMODELED (verbatim) | A DEFENSIVE ally-side mitigation — the schema's only damage-taken stat is `damageTakenPct`, a BOSS debuff where positive = boss takes MORE; expressing this line through it would invert both target and direction (the nearest-wrong model, independently flagged by S2b: a boss-held −8% would drag the whole board down 8%). Measurement-gated on v1 ever modeling incoming damage. Pinned: verbatim in `unmodeled.skill1`; the value 8 never surfaces as a buff from noah; no damageTakenPct event originates from her.                                                                                                                                                                                                                                                                                                          |
| S2-a | Activates when hitting a target with a Full Charge attack. Affects the target. | UNMODELED (verbatim) | No full-charge-hit trigger kind (hitCount counts cumulative hits regardless of charge; chargeCounter is the SBS threshold mechanic). Both payloads are out-of-domain anyway, so nothing discriminates a trigger encoding (S5 reached the identical conclusion). Pinned: verbatim in `unmodeled.skill2`; noah's skill2 slot is empty.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| S2-b | Taunt for 2 sec                                                                | UNMODELED (verbatim) | v1 models no aggro/targeting — resolveTargets({kind:'enemy'}) returns []. NOT fabricated as a targetStatus (that channel is for kit-NAMED gateable statuses such as d-killer-wife's Wipe Out; inventing a 'Taunt' status would create a gate no kit line asks for — folkwang precedent). Pinned: verbatim in `unmodeled.skill2`; the only buff stat noah originates is defPct.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| S2-c | ATK ▼ 13.25% for 5 sec                                                         | UNMODELED (verbatim) | An ENEMY ATK debuff; the sim models no enemy stats (the boss deals no damage, so nothing could consume it). NOT a negative atkPct on self/allies — the ▼ is on THE TARGET. Pinned: verbatim in `unmodeled.skill2`; 13.25 never surfaces as a buff value from noah.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| BU-a | Affects self. Attract: Taunt all enemies for 10 sec                            | UNMODELED (verbatim) | Same no-aggro ruling as S2-b. Pinned: verbatim in `unmodeled.burst` (with the 'Affects self.' scope header retained).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| BU-b | Invulnerable for 3 sec                                                         | UNMODELED (verbatim) | No HP pool / death / incoming-damage model. Deliberately NOT shield-encoded (the nearest-primitive trap, named independently by S2b and S6): a `shield` effect would open the targets' shieldedUntilFrame windows and fire teammates' 'shielded' triggers / requiresShielded gates — fabricating a synergy surface the kit never grants (marciana's Storage precedent). Pinned: verbatim in `unmodeled.burst`; noah's override carries zero shield/heal effects (structural pin); the only buff she originates is defPct (runtime pin).                                                                                                                                                                                                                                                                                              |
| BU-c | DEF ▲ 133.48% for 10 sec                                                       | FAITHFUL (inert)     | `burstCast` (OWN cast — she is Burst II; fullBurstEnter would over-fire on the chains a competing B2 opens) → `allies` → `buff defPct 133.48 durationSec:10`. defPct is deliberately INERT in v1 (self DEF never enters damage dealt; there is no incoming damage) — kept for kit completeness and any future DEF consumer/scaler. Four-way convergence: S6's blind block is byte-equivalent. Pinned: landings == noahBursts × 5 with all five slots per cast frame; 600-frame expiry; a fullBurstEnter counterfactual over-fires by exactly naga's chains (behavioral DIV — fullBursts 7 > noahBursts 4 in the driver fixture); self-only narrows to 1 landing per cast; stripping the line leaves every unit byte-identical; defPct→attackDamagePct MOVES the team (non-vacuity); 133.48 never surfaces as atkPct from any caster. |

## Cross-family corroboration

- **S2b test-faithness review — claude-fable-5.** Convergent: load-bearing set is exactly
  `burst: DEF ▲ 133.48% for 10 sec`; the unmodeled set matches the driver line-for-line.
  Named the three fabrication traps the driver had already refused — the boss-held
  damageTakenPct misroute of S1 ("costs the whole board −8%"), a targetStatus for the taunts,
  and a mis-scoped ally atkPct for S2's enemy ATK ▼ — and pre-warned the controlComp B2-slot
  fixture trap ("noah may NEVER cast — assert from the event log, never from an assumed
  cadence"). One adopted assertion: the global no-atkPct-133.48 pin (stat-confusion head),
  added to the driver test at S2c.
- **S5 blind test writer — claude-opus-5.** 18 tests (12 live + 6 GAP skips) built around a
  three-candidate data-driven fixture with a burstEligibility enabler — the author correctly
  anticipated the B2-slot trap S2b had warned about. vs the driver override the pristine
  adapted copy scored **6 FAIL / 6 PASS / 6 SKIP**: every failure traced to ONE blind-side
  premise bug — the author assumed defPct events originate ONLY from noah, but crown
  (CONTROL_CORE) emits her own documented defPct 37.44 at every Full Burst, so the selection
  predicate picked the candidate where noah casts ZERO bursts and every channel assertion read
  crown's events. The binding judge classified all six RECON_ERROR (blind side), not encoding
  faults. Three documented adapted-copy premise fixes (import path; selection predicate keyed
  to HER buff value per the author's own comment; defApplies scoped to her casterIdx) — all
  preserving assertion intent — brought the copy to **12 PASS / 0 FAIL / 6 SKIP**: value
  uniformity, whole-ally-set coverage incl. self, 10s-not-3s window, per-cast cadence with a
  genuine inactive case, the before-fullBurstStart ordering pin (and its fullBurstEnter
  inversion), byte-identical strip totals, the injected damageTakenPct/atkPct non-vacuity
  probes, the defPct-and-nothing-else event profile, and all three override-shape pins.
- **S6 blind override writer — claude-opus-5.** The burst block is BYTE-EQUIVALENT to the
  driver's (burstCast / allies / defPct 133.48 / durationSec 10) and the audit skips every
  other line on identical reasoning (ally-mitigation vs boss-debuff inversion named explicitly;
  enemy ATK inert; no taunt/invuln primitives; cadence tuple ALWAYS-⚑). THE one divergence:
  two damage-inert PLACEHOLDER blocks alongside the verbatim unmodeled records — skill1
  `interval:10 → defPct value 0` (self-flagged "INVENTED" trigger; the kit says
  10%-chance-when-attacked, not every-10s) and skill2 `shotFired → enemy, effects: []`
  ("recording the real trigger for future consumers"). The binding judge ruled the driver's
  unmodeled-verbatim encoding correct: the invented trigger violates MEASURED>FUDGE even at
  value 0, and a phantom noah-originated defPct channel recreates exactly the provenance hazard
  the crown incident had just demonstrated in this same run; S6's own flags concede the lines
  belong in unmodeled.
- **S7 binding judge — kimi-code/k3.** GO, faithfulness 1.0, zero gotchas, discriminationOk
  true. All eight lines adjudicated (1 FAITHFUL / 7 DOCUMENTED_GAP); both divergences ruled in
  the driver's favor; the six pristine S5 reds classified RECON_ERROR. Residuals flagged for
  owner spot-check: (a) defPct is engine-inert, so no totals assertion can ever catch a future
  WRONG defPct consumer; (b) noah's cast cadence rides the RL modal gauge fallback (she has no
  datamined gauge-per-shot row) — a wrong fallback shifts her cast COUNT, never the encoding;
  (c) the driver fixture's behavioral DIV depends on naga's chains completing (fixture-sanity
  pinned, but a future naga override change could silently void it).

## Residual flags (owner spot-check cluster)

1. **inert-defPct future-consumer blindness** — the channel is pinned at the event level; when
   (if) a DEF consumer/scaler ever lands, re-verify noah's grant magnitude semantics then.
2. **gauge-per-shot gap** — noah has no datamined row; RL modal 280/trigger × the RL-charge
   focus fallback sets her burst cadence. Recipe: a focus recording counting her casts over a
   known fight length.
3. **cadence tuple** (ALWAYS-⚑): chargeFrames 60 / ammo 6 / reloadFrames 171 / hitsPerShot 2
   are datamine-shipped and known-unreliable; they set her weapon output and gauge feed. No kit
   line keys off her shots, so a wrong cadence rescales nothing kit-side.
4. **naga-chain fixture dependency** — the behavioral burstCast-vs-fullBurstEnter pin assumes
   the fixture sanity assertions stay green (they are in-file and will fail loudly otherwise).
