# Manual review — yukiko (Yukiko)

**Gauntlet date:** 2026-08-19
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (element-bucket placement of `elemAdvantageDamagePct`; flavor-gated `distributedDamagePct` amp; `bossElementGate`-scoped 1 More cluster; cast-frame block-order simultaneity; state window derived from FB timing)

> Slug disambiguation: `yukiko` is a NEW unit (no base counterpart, no variant). The S0 lint's
> "Scarlet" flag was a false positive — "Scarlet Flower" is the name of her S2 state, not a
> reference to `scarlet` (AR/Electric) or `scarlet-black-shadow` (RL/Wind).

## Kit summary

Yukiko is a Fire-element MG Attacker on Burst III with a Persona-flavored kit. A permanent persona
("Konohana Sakuya") heals all allies every 3 seconds (event-only in the sim — no HP pool; the
magnitude 5.7% of her final max HP has no engine consumer, but the recovery events are load-bearing
through on-recovery consumers like crown). She grants herself ATK ▲ 65.37% for 15s at battle start
and again every time Full Burst ends, and Attack Damage ▲ 55.31% permanently. Her burst, Maragidyne,
deals 1258.79% of final ATK as distributed damage to all enemies (cast-instant — no +50% Full Burst
major) and, **if a Wind Code enemy is present**, triggers "1 More": ATK ▲ 45.33% for 10s. The 1 More
event also detonates a 400.31%-of-final-ATK distributed hit on all enemies (S1). Using her burst
activates the Scarlet Flower state until Full Burst ends: team heals every 3s within the window,
"Fire Amp" (Distributed Damage ▲ 90.01%, a flavor-gated multiplicative bucket that covers her own
burst nuke), and a defensive Water-code damage reduction (unmodeled — no incoming-damage model).
Entering Burst Stage 3 grants her Elemental Advantage Attack Damage ▲ 48.15% for 10s — the ELEMENT
bucket, live only while advantaged (vs Wind). Her last S2 line (Follow Up: 80.25%-of-own-ATK grant
to "standard Burst 3 allies in the Persona state") is UNMODELED: no Persona-state primitive exists
and no roster unit carries Persona state, so the target set is provably empty today.

## Line-by-line

| Line                                                                    | Disposition        | Notes                                                                                                                                         |
| ----------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: Persona state wrapper (continuous, unremovable)                     | FAITHFUL (wrapper) | State NAME has no engine primitive; the healing function it wraps IS modeled; verbatim in unmodeled                                          |
| S1: every 3s → all allies Media heal (5.7% final max HP)                | FAITHFUL (event)   | `interval:3` heal; magnitude unmodeled (no HP pool); strict 3s cadence + recovery-consumer tandem pinned (Y1)                                 |
| S1: battle start AND Full Burst end → self ATK ▲ 65.37%/15s             | FAITHFUL           | Two blocks on the two named triggers; application frames = {0} ∪ fullBurstEnd frames (Y2)                                                     |
| S1: when 1 More takes effect → all enemies 400.31% distributed          | FAITHFUL           | `burstCast` + `bossElementGate:'Wind'`; once per cast vs Wind, absent vs Fire (Y3); cast-frame slot order keeps the same-cast amp OFF it      |
| S2: battle start → self Attack Damage ▲ 55.31% continuously             | FAITHFUL           | `battleStart`, no expiry (Y4)                                                                                                                  |
| S2: Scarlet Flower state wrapper (burst use → Full Burst end)           | FAITHFUL (wrapper) | Window derived: cast → FB end = 22f pre-delay + 10s FB = 622f ≈ 10.37s (⚑ derived constant); "cannot be removed" reads undispellable         |
| S2: state Effect 1 — Mediarama heal every 3s (5.7% final max HP)        | FAITHFUL (event)   | `delaySec:3` + `heal{ticks:3, intervalSec:3}` = cast+3/+6/+9s — exactly three activations inside the window (Y5d)                             |
| S2: state Effect 2 — Fire Amp: Distributed Damage ▲ 90.01%              | FAITHFUL           | `distributedDamagePct` (flavor-gated own bucket); nuke takes ×1.9001, normals byte-identical; unscoped counterfactual lifts normals (Y5)      |
| S2: state Effect 3 — damage taken from Water Code ▼ 17.95%              | UNMODELED          | Defensive; v1 models no incoming damage; verbatim in unmodeled                                                                                |
| S2: entering Burst Stage 3 → Elemental Advantage Attack Damage ▲ 48.15%/10s | FAITHFUL       | `stageEnter:3` (30f ahead of her cast); ELEMENT bucket — moves damage vs Wind, exactly inert vs Fire; Damage-Up counterfactual discriminated (Y6) |
| S2: 1 More → standard B3 allies in Persona state: ATK ▲ 80.25% of own ATK/25s | UNMODELED (GAP) | No Persona-state primitive; no roster carrier; skill user excluded by the kit → target set empty today; encoding without the gate would wrongly buff any B3 ally. Recipe in unmodeled                     |
| Burst: all enemies 1258.79% final ATK distributed damage                | FAITHFUL           | Cast-instant (no +50% FB major — cast lands 22f before FB opens), crit-eligible, TAGGED `burstDesc:'allEnemies'` (her clause is trina's literal amp string — census-enforced); takes the same-cast Fire Amp (Y8) |
| Burst: if Wind Code enemy present → 1 More: ATK ▲ 45.33%/10s            | FAITHFUL           | `burstCast` + `bossElementGate:'Wind'`; present once per cast vs Wind, ABSENT vs Fire (Y9)                                                    |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. All 9 load-bearing lines
  FAITHFUL; Scarlet Protection UNMODELED; Follow Up flagged GAP ("must carry the full trigger/target
  text, not a silent drop"). Converged with the driver on every subtle point: the 1 More cascade must
  carry the Wind gate on all three dependent lines; the Scarlet Flower window is burstCast-keyed and
  Full-Burst-end-bounded (NOT fullBurstEnter, NOT permanent — "continuous and cannot be removed"
  means undispellable); Fire Amp ordering is the entire observable of that line; elemAdvantage must be
  element-bucket (inert vs the Fire control boss); the heals are load-bearing through crown's
  on-recovery kit.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Fixture: `controlComp('yukiko', false)`
  (liter/crown/yukiko — the blind author deliberately dropped the second B3 to keep yukiko's own-cast
  count deterministic). Vs the driver override: **10 passed / 5 skipped / 0 failed** — the 5 skips
  are the blind author's OWN documented gaps (Follow Up target primitive, Scarlet Protection, heal
  magnitude, amp-on-nuke cast-frame ordering judged MEASUREMENT-GATED, elemAdvantage effect on a
  Fire-only fixture). Independent gap list matches the driver's.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Converges on 9 of 11 blocks (identical
  skill1; identical burst; stageEnter-3 elemAdvantage; Fire Amp as `distributedDamagePct`). Four
  divergences: (1) encodes Follow Up with a stand-in target, dropping the Persona filter its own flag
  admits; (2) Mediarama as a single instant heal (its block contradicts its own "ticks 3" flag);
  (3) Fire Amp window 10.4s = 624f, 2 frames past Full Burst end; (4) `passive` vs `battleStart` for
  the 55.31% line (behaviorally identical at scope).
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, zero
  REAL-GOTCHA.** Every kit line accounted (9 FAITHFUL + 4 documented gaps). All four blind-vs-driver
  divergences ruled in the driver's favor: the blind Follow Up encoding "over-credits" (the kit's
  'except the skill user' + 'in the Persona state' clauses make the target set provably empty on
  today's roster, matching S2b's GAP disposition); the blind single-instant Mediarama "contradicts
  the kit's 'Activates every 3 sec'" where the driver's +3/+6/+9s encoding matches prose and is
  frame-pinned. Discrimination holds: every load-bearing assertion fails under its named
  nearest-wrong model.

## Residual flags (owner spot-check cluster)

1. **Same-cast Fire-Amp-on-nuke ordering** — the driver pins amp-APPLIES citing the measured U10
   same-cast rule; S5 independently judged exactly this MEASUREMENT-GATED, and the SSOT settles
   earlier-cast buffs/entry auras, not this exact simultaneity. Directionally corroborated by S2b.
   One Wind-boss focus-video popup of the 1258.79% nuke with/without the ×1.9001 amp closes it. The
   engine's block order also keeps the amp OFF the same-cast 400.31% S1 hit (skill1 resolves first)
   — same footage settles both.
2. **"1 More = her own burst vs Wind" literal read** — converged across all four agents, but rests on
   prose alone. If 1 More is actually an ally-sourced / any-weakness-hit Persona team mechanic, three
   lines re-key (recipe in the override caveats).
3. **`hitsPerShot: 1` on an MG is a datamine inherit** — base-stat territory (out of override scope);
   flagged by the blind S6 author, worth a cadence probe before trusting her MG damage share against
   a recording.
