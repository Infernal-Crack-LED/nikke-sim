# Manual review — mica-snow-buddy (Mica: Snow Buddy)

**Gauntlet date:** 2026-07-31
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (meta-defining "Stack count of buffs ▲1" line + a status-gated max-ammo line; the DPS-relevant
encoding is a caster-scaled team ATK buff + a self burst-gauge buff + a stack-gated team max-ammo buff via a
resource clock — no scoped-crit, no round-count, no burstCast-vs-fullBurstEnter subtlety on her OWN damage,
which is negligible)

> Slug disambiguation: `mica-snow-buddy` (aka "msb") is Mica: Snow Buddy (data `name:"Mica: Snow Buddy"`,
> Tetra Iron SMG Supporter, Burst I, 20s CD) — a VARIANT of the RL/Wind base `mica`. GREENFIELD — she shipped
> with NO override (`simSupported:false`); before this gauntlet the unit could not sim at all (`resolveSkills`
> throws for prose-without-override).

## Kit summary

Mica: Snow Buddy is an Iron SMG Supporter whose damage contribution is almost entirely INDIRECT. Her Skill 1
"Tidying Up" builds a stack counter (1 stack per 120 landed normal attacks, up to 10) as a defensive
damage-taken reduction on the team; once that counter maxes out, the whole team gains **+40% Max Ammunition
Capacity** permanently (stretching everyone's magazines, cutting reload downtime). Her Skill 2 "Blessing
Cannon" accelerates that stack build (+1 buff stack every 150 hits) and gives herself a permanent **+300%
burst-gauge fill rate**. Her Burst "Snowfield Festival" (20s CD, Burst I) cleanses one debuff from the team
and grants all allies an ATK buff equal to **39.93% of her own ATK for 5 seconds**.

**The key modeling judgment (the stack-gate, drives M3/M4/M5):** the max-ammo line is gated on "Tidying Up at
max stacks". The sim models the stack accrual explicitly as a `tidyingUp` resource pool (0..10): +1 on
hitCount:120 (Block A) and +1 on hitCount:150 (Block C — the self-directed portion of "Stack count of buffs
▲1", which adds a stack to her OWN stackable Tidying-Up buff). The max-ammo buff fires only once the pool
reaches 10 (`resourceGate{min:10}`). The activation TIME is NOT hardcoded — it emerges from the engine's
hit-count cadence: in the fixture, frame 2797 (~46.6s). This commits to the **refresh-on-reapply** reading of
"Stacks up to 10 times and lasts for 15 sec" (the standard NIKKE convention for stackable timed buffs); the
rejected per-stack-independent-decay reading would cap concurrent stacks at ~2 and the gate would NEVER open
(0% uptime). All three blind agents independently made this same call and flagged the same binary.

**The damage-taken channel (M3):** "Damage Taken ▼2%" is a reduction on ALLIES (defensive), NOT the schema's
boss-debuff `damageTakenPct` (positive = boss takes MORE). The 2% magnitude is inert (the sim models no
incoming damage); only the stack CLOCK is modeled (as the ammo gate). Encoding the ▼ on the boss would wrongly
fabricate up to +20% team damage — the override deliberately does not emit `damageTakenPct`, and the test
guard-asserts no boss-held `damageTakenPct` apply exists.

## Line-by-line

| Line                                                                     | Disposition                                              | Notes                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: landing 120 normals → all allies Tidying Up Damage Taken ▼2%/10x/15s | PARTIAL (clock FAITHFUL / value DOCUMENTED_GAP)          | The STACK CLOCK is modeled (`tidyingUp` resource +1 on hitCount:120, Block A) because it gates the ammo line; the defensive 2% value is inert (no incoming damage) and documented (⚑ M3). NOT encoded as boss `damageTakenPct` — guard-tested  |
| S1: Tidying Up at max stacks → all allies Max Ammo ▲40% continuously     | FAITHFUL                                                 | `maxAmmoPct` 40 → allies, `resourceGate{tidyingUp,min:10}` on hitCount:120, no duration ("continuously"). Activation EMERGES at frame 2797 (~46.6s). Gated-vs-t=0 / scoping / value / permanence / liveness all discriminated (M4)             |
| S2: landing 150 normals → all allies Stack count of buffs ▲1             | PARTIAL (self-fold FAITHFUL / cross-ally DOCUMENTED_GAP) | SELF portion folded as `tidyingUp` +1 on hitCount:150 (Block C; accelerates the gate ~78.6s→~46.6s, proven live by the >30s delay on removal). CROSS-ALLY portion (teammates' stack buffs) has no primitive — documented (⚑ M5, meta-defining) |
| S2: start of battle → self Burst Gauge filling speed ▲300% continuously  | FAITHFUL                                                 | `burstGenPct` 300, passive self (frame 0, permanent). Value/scope/frame/permanence pinned; LIVE via timing (first burst 262→180) + ~2% totals (M2)                                                                                             |
| Burst: all allies Removes 1 debuff(s)                                    | DOCUMENTED_GAP                                           | Debuff cleanse; v1 boss applies no debuffs, nothing to remove. Carried verbatim in `unmodeled.burst`; structurally pinned (M6)                                                                                                                 |
| Burst: all allies ATK ▲39.93% of skill user's ATK for 5s                 | FAITHFUL (dominant)                                      | `casterAtkPct` 39.93 (FLAT, % of msb's static ATK), `burstCast` trigger, allies INCLUDESELF, 5s. Basis/scoping/timing/duration/liveness discriminated (M1)                                                                                     |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. The reviewer DIVERGED from the
  driver's initial (more conservative) call and argued the max-ammo line is the unit's main team-damage
  contribution and IS modelable via a stack clock + gate, with the "Stack count of buffs" line folding into
  the ramp; it independently DERIVED an activation of ~45-50s (H/120 + H/150 ≥ 10 → H≈667 landed rounds). The
  driver ADOPTED this more-complete model (S2c); the engine-emergent activation (frame 2797 = 46.6s) matched
  the reviewer's independent derivation. The reviewer also flagged the two hazards the driver had already
  handled: the damageTakenPct-inversion trap (▼ on allies must NOT be a boss debuff) and the Burst-I fixture
  hazard (controlComp seats liter at B1 alongside msb, so msb must be made the sole B1 to cast).
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived the same dispositions and the
  same discriminations (gated-vs-passive ammo, casterAtkPct-flat-vs-atkPct basis, burstCast-vs-fullBurstEnter
  trigger identity, 5s duration, the no-boss-damageTakenPct guard). After MECHANICAL-ONLY adaptation (sole-B1
  fixture; override slots are block arrays not `{blocks}`; `casterAtkPct` filters isolated to msb's casterIdx
  because **crown's** S1 `casterAtkPct` otherwise contaminates them — the label precedent; the always-on
  counterfactual also deletes the `resourceGate` so it builds a true ungated t=0 buff), the blind test vs the
  driver override is **13 pass / 1 fail / 3 skip**. The 3 skips are the documented GAPs. The 1 fail is a
  GENUINE BLIND OVER-CLAIM, not a driver divergence: it asserts removing `burstGenPct` "costs Full Bursts"
  (fbBase > fbNoGauge), but over a 180s fight the 20s burst CD bottlenecks at 9 Full Bursts WITH OR WITHOUT the
  gauge buff (measured 9 vs 9). The driver's `burstGenPct:300` is provably live via the timing/totals channel
  (first burst 262→180, ~2% totals), which the driver test pins; the blind writer chose an insensitive
  observable (count) for a timing effect. The judge classified this RECON_ERROR, not a gotcha.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. INDEPENDENT CONVERGENCE — byte-identical burst
  `casterAtkPct 39.93`/burstCast/allies/5s and S2 `burstGenPct 300`/passive/self; the SAME `maxAmmoPct 40` to
  all allies (the blind writer gated it via a derived `hitCount:720` proxy trigger — the 10th grant lands at
  round 720 merging the 120- and 150-hit cadences — vs the driver's resource-pool + `resourceGate`; functionally
  equivalent activation ~50s, the driver's is more primitive-faithful since the blind writer's redacted schema
  hid the `resourceGate` primitive); the SAME unmodeled set (damage-taken defensive / stack-count no-primitive
  / debuff cleanse); and the SAME key flag (refresh-vs-decay stack semantics = gate ~50s vs NEVER).
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, gotchas:[].** All six
  kit lines accounted (4 FAITHFUL + 2 DOCUMENTED_GAP with the partially-modeled portions live and pinned, the
  inert portions documented verbatim with ⚑ tiers + recipes). The judge called the stack-gate encoding "the
  strongest artifact in the packet" (engine-emergent frame 2797 matching the S2b ~45-50s derivation and the S6
  ~50s proxy), confirmed the damageTakenPct-inversion guard correct, and classified the lone S5 RED as
  RECON_ERROR (blind FB-count over-claim; the driver is live through the timing channel).

## Residual flags for owner

1. **⚑ M4 — max-ammo activation-time / stack semantics (the standing refit candidate).** The ▲40% max-ammo
   team buff is gated on 10 Tidying-Up stacks; the modeled activation (~46.6s in fixture) assumes
   refresh-on-reapply stack semantics + every fired round landing + the engine's SMG cadence/reload. Estimate:
   the buff adds ~+1.8% to +3.6% per ally (measured: removing it drops ada +1.75%, helm +2.48%, msb +3.18%,
   crown +3.58%); under the rejected per-stack-decay reading it would be 0. **Recipe:** footage of the
   Tidying-Up stack-counter accrual — if the displayed stack count climbs monotonically past 3, refresh-on-apply
   is confirmed and ~46s stands; if it oscillates at 2-3, the gate is unreachable and the max-ammo block should
   be deleted. A popup-read of the real activation time would outrank the derivation. Tier 2 (status-gate).
2. **⚑ M5 — "Stack count of buffs ▲1" cross-ally portion (meta-defining, out-of-domain).** Adding stacks to
   TEAMMATES' stackable buffs has no engine primitive; only the self-portion is folded (Block C). Estimate: 0 in
   a single-unit encoding (purely a function of which stacking allies are fielded). Recipe: a cross-unit
   "buffStackBonus" raising qualifying stacking buffs' stacks while active. Tier 2.
3. **⚑ M3 — Tidying-Up defensive value (out-of-domain).** The 2% damage-taken reduction is inert in v1 (no
   incoming damage). If unit-facing boss damage is ever modeled, add an ally damage-taken-reduction stat
   (distinct from the boss-debuff `damageTakenPct`) stacked via the existing `tidyingUp` pool.
4. **⚑ M6 — cadence tuple (MANDATORY, datamine-unreliable).** `pullsPerSec` at the SMG class default /
   `reloadFrames 141` / 120-ammo belt; this also sets the M4 activation time. Recipe: rounds/min + reload gap
   from any msb focus video.
5. **Same-model residual (judge-flagged):** all three agents independently committed to refresh-on-reapply
   stack semantics for "stacks up to 10 times, lasts 15 sec" (the standard NIKKE convention), under which the
   ammo gate opens ~46s; under per-stack-independent decay the gate NEVER opens (0% uptime). This is the ⚑ M4
   binary — documented by everyone, settled by no measurement. It is in the override's `caveats`/`note`; a
   one-minute owner read of those plus a footage stack-counter read is the remaining human check. Still
   MODEL_ONLY/untuned — the gauntlet certifies structure (faithfulness), not magnitudes.
