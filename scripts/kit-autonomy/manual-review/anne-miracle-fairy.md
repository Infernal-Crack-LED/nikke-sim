# Manual review — anne-miracle-fairy (Anne: Miracle Fairy)

**Gauntlet date:** 2026-08-19
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (class-scoped buffs ×3 lines; `burstCast`-vs-`fullBurstEnter` Burst-II trigger identity; meta-defining revive ⚑; S1 heal-window tick granularity)

> Slug disambiguation: `anne-miracle-fairy` is a NEW unit — Burst II RL/Wind Supporter, no base
> counterpart, no variant. The S0 lint resolved clean (no AMBIGUOUS) on the full variant name.
> She is Burst II, so her fixture makes her the SOLE B2 (a second B2 contests the single slot and
> zeroes her burst casts). She has no Synergy row, so the release-date audit pin (a null date is
> acceptable only when Synergy has no row) was confirmed against her at onboarding — nothing
> fabricated.

## Kit summary

Anne is a pure sustain/support kit with ZERO damage lines. Her only damage-relevant payload is her
burst's class-scoped ATK grant; everything else is heal-channel (tandem-only in a sim with no HP
pool) or has no StatKey at all. S1 "Fairy Dance" opens a 5-sec healing window for **Supporter**
allies every 3 normal attacks (event-only; the 6.07%-of-attack-damage magnitude is unmodeled — no
HP pool). S2 "Fairy's Jest" is doubly unmodelable on both ■ lines: the allies' Incoming Healing ▲
23.46% (gated on her own HP > 90%) and the enemies' Incoming Healing ▼ 78.93%/10s (gated on her own
HP ≥ 90% at last-bullet) — there is no incoming-healing StatKey, no HP pool to gate on, and no
enemy-healing model, so both are inert at v1 scope and carried verbatim in `unmodeled`. Her burst
"Blue Butterfly Slumber" heals all **Attacker** allies for 38.61% of her final max HP (event-only),
grants them ATK ▲ 77.22% for 10s (the load-bearing line, keyed to her OWN `burstCast`), and revives
1 incapacitated Attacker at 99% HP once per battle — the revive is ⚑ UNMODELED and meta-defining:
the engine has no death/revive/HP-pool primitive, so the condition can never fire at scope; in real
play it is the reason she is fielded.

## Line-by-line

| Line                                                                          | Disposition          | Notes                                                                                                                       |
| ----------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| S1: after 3 normal attacks → all Supporter allies, heal 6.07% atk dmg, 5 sec  | FAITHFUL (event)     | `hitCount:3` → `alliesOfClass Supporter` → `heal{ticks:5,intervalSec:1}`; magnitude unmodeled (no HP pool); Supporter scope + window shape pinned structurally, class exclusion pinned via the asuka probe (A2) |
| S2: all allies while HP > 90% → Incoming Healing ▲ 23.46%                     | UNMODELED            | No incoming-healing StatKey + no HP pool to gate/amplify; inert; verbatim in `unmodeled.skill2`                              |
| S2: last bullet while HP ≥ 90% → all enemies Incoming Healing ▼ 78.93%/10s    | UNMODELED            | No enemy-healing model + HP gate; explicitly NOT a `damageTakenPct` debuff (the catastrophic pattern-match); verbatim (A5)   |
| Burst: all Attacker allies → heal 38.61% of caster final max HP               | FAITHFUL (event)     | `burstCast` → `alliesOfClass Attacker` → `heal`; magnitude unmodeled; one recovery landing per own cast via the asuka probe (A3) |
| Burst: all Attacker allies → ATK ▲ 77.22% for 10 sec                          | FAITHFUL             | `burstCast` → `alliesOfClass Attacker` → `atkPct 77.22/10s`; the only damage-relevant line; class scope, cast-frame identity, timed expiry, live-ness all pinned (A4); the fullBurstEnter + all-allies + casterAtkPct counterfactuals all discriminate |
| Burst: revive 1 incapacitated Attacker at 99% HP, once per battle             | UNMODELED ⚑ (meta)   | No death/revive/HP-pool primitive; offensively inert at scope; estimate/recipe/tier recorded in `unmodeled.burst` + gaps §18 |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Independently derived the
  SAME load-bearing set (the S1 Supporter heal, the burst Attacker heal, the burst `atkPct 77.22/10s`)
  and the SAME unmodeled set (23.46, 78.93, the revive). Pre-registered the two traps the driver also
  hit: the Burst-II contested-slot fixture hazard, and the "Incoming Healing ▼ 78.93% on all enemies →
  `damageTakenPct` boss debuff" catastrophic misread. Recommended class scoping be proven via a crown
  invariance probe (crown sits in NEITHER of Anne's class target sets) — adopted as the A6 guard.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Fixture: `controlComp('anne-miracle-fairy',
  true)` — which deliberately fields crown, the fixture's own Burst II, alongside Anne. Vs the driver
  override: **10 passed / 5 RED / 4 self-documented skips.** The binding judge ruled ALL 5 REDs
  RECON_ERROR, not encoding divergences: crown out-rotates Anne (40s vs 60s CD) for the single stage-2
  slot so Anne casts zero bursts (probe: burstCasts by slug = liter 10 / crown 10 / helm 5 / anne 0),
  making three assertions vacuous; the `casterAtkPct` filter caught CROWN's 23 flat caster-ATK grants
  (Anne emits none); and the wide-heals totals-invariance is crown's recovery consumer SATURATED by
  helm's every-pull all-allies heal (161 firings ≈ 1127s of 7s-window coverage). The driver spec avoids
  all three by fielding Anne as sole B2 + probing through asuka. The 4 skips are the blind author's own
  documented gaps (the two S2 lines, the revive).
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Load-bearing encodings CONVERGE 3/3
  (identical trigger/target/effect on all three modeled lines: `hitCount:3` Supporter heal, `burstCast`
  Attacker heal, `burstCast` Attacker `atkPct 77.22/10s`). Four presentational divergences, all
  behaviour-neutral today: (1) S1 `heal{ticks:1}` vs driver's `ticks:5/intervalSec:1` (window shape —
  unobservable until a Supporter recovery consumer exists); (2) two empty-effects placeholder blocks for
  the S2 lines vs driver's verbatim `unmodeled` entries; (3) burst heal+buff fused into one block + an
  empty-effects revive placeholder vs driver's split blocks + ⚑ `unmodeled` revive.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, zero
  REAL-GOTCHA.** All six kit lines accounted (3 FAITHFUL + 3 documented gaps). Every S5 RED adjudicated
  RECON_ERROR against the probe evidence. The most dangerous misread (78.93 → `damageTakenPct`) is
  absent from both the override and the event log and is documented against. Discrimination holds: each
  load-bearing assertion demonstrably fails under its named nearest-wrong model in the driver's fixture.

## Residual flags (owner spot-check cluster)

1. **S1 tick granularity** — `ticks:5/intervalSec:1` approximates the kit's per-ATTACK healing inside
   the 5-sec window at the ~1-shot/sec RL cadence. Presently inert (no Supporter-class recovery consumer
   exists in the roster). The blind S6 author used `ticks:1`; both are ⚑ estimates either way. Re-derive
   from footage if a Supporter recovery consumer ever ships.
2. **Cadence tuple (datamine)** — RL pullsPerSec / reloadFrames 141 / chargeFrames 60 drive the
   every-3-normals S1 proc cadence and gauge fill. Rounds/min + reload gap from any Anne focus video.
3. **The revive is META-DEFINING but unmodeled** — no death/revive/HP-pool primitive, so the kit's
   entire real-play raid value is outside the sim (rapunzel-resurrect precedent class). Needs an HP pool
   + death/revive model before it can be enacted.
