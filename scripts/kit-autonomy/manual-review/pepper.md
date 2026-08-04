# Manual review — pepper (Pepper)

**Gauntlet date:** 2026-08-03
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (meta-defining stack-increment burst line; stack-gate via resource pool; `burstCast`-vs-`fullBurstEnter`; kit-silent interval trigger)

> Slug disambiguation: `pepper` is the only Pepper in the roster (no variants; lint clean).
> First encoding — no override existed before this gauntlet; `simSupported` flipped with this landing.

## Kit summary

Pepper is a Wind shotgun Supporter on Burst I (20s cooldown) whose kit is mostly sustain and
stack machinery. Every time her last bullet lands she heals the lowest-HP ally (event-only — no HP
pool in the sim) and builds one stack of Refresh Heart, a team-wide incoming-healing buff that caps
at 5 stacks; the sim tracks only the STACK COUNT (as a resource pool), because her burst reads it.
Her skill 2 fires on a kit-silent internal timer — the datamined 10s cooldown — hitting the
strongest enemy for 160% of her ATK and lowering that enemy's ATK (defensive, inert in a sim where
the boss deals no damage). Her burst nukes the strongest enemy for 1237.5% of ATK (FB-exempt — the
cast lands before the Full Burst window opens), adds one stack to every stackable buff her allies
hold (only the self-interaction with Refresh Heart is modelable — no cross-unit stack primitive
exists), and — once Refresh Heart is at max stacks — heals the whole team (event-only, driving any
teammate's "when recovery takes effect" kit, e.g. Crown).

## Line-by-line

| Line                                                          | Disposition              | Notes                                                                                                                             |
| ------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| S1: lastBullet → 1 lowest-HP ally heal (4.45% caster Max HP)  | FAITHFUL                 | `lastBullet → alliesLowestHp(1) → heal`; event-only (no HP pool); lowest-HP resolves LEFTMOST (documented v1 stand-in); P1 pins cadence via Crown's recovery consumer under isolation |
| S1: lastBullet → all allies Refresh Heart ▲6.53%, 5×, 15s     | SPLIT                    | Stack COUNT modeled as `refreshHeart` resource (max 5, load-bearing gate currency for the burst); 6.53% incoming-healing magnitude has no StatKey → unmodeled payload; 15s lapse ≈ no-lapse at her ~8.4s clip cadence (⚑3) |
| S2: 160% of final ATK to highest-final-ATK enemy              | FAITHFUL                 | Kit-silent trigger → `interval:10` from the datamined skill CD (helm-aquamarine precedent); 17 hits/180s; ⚑ first-fire phase t=10 (⚑2) |
| S2: ATK ▼3.55% for 5s on that enemy                            | DOCUMENTED_GAP           | No enemy-ATK debuff primitive; boss ATK feeds nothing in v1 (boss deals no damage); absence-pinned (the damageTakenPct reflex IS caught) |
| Burst: 1237.5% Burst Skill damage to highest-final-ATK enemy  | FAITHFUL                 | `burstCast` flatDamage, FB-exempt (cast precedes the window), crit-eligible, once per cast = nuke count                                                                   |
| Burst: all allies +1 stack to stackable buffs                  | SPLIT                    | Self-slice modeled: +1 `refreshHeart` on cast, ordered BEFORE the gate (kit ■ order; a 4-mag cast heals — pinned); generic cross-unit clause → unmodeled ⚑4 (engine-core primitive missing) |
| Burst: Refresh Heart at max stacks → allies heal 27.22%        | FAITHFUL                 | `resourceGate{refreshHeart ≥ 5}` → allies heal (event-only); silent-then-firing gate timing pinned incl. the 4-mag-cast ordering discrimination                              |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Independently derived
  the same dispositions for all 7 lines, and CAUGHT the driver's initial misjudgment: the Refresh
  Heart stack state IS load-bearing (the burst gate reads it; at ~8.4s mag cadence vs the 15s
  window the stacks ramp to 5 mid-fight under refresh-on-reapply semantics) and is modelable via a
  resource pool + `resourceGate`. Also mandated the fixture-shape guard (pepper is Burst I —
  `controlComp` seats liter at B1, where pepper would cast zero bursts) and the observability rule
  (heals are only assertable through a recovery consumer). Converged.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived the kit from
  prose; 3 legit GAP skips (generic stack increment, max-stack heal observability, S1-heal tandem
  in the controlComp geometry). One mechanical import-path fix applied (blind/ location, 2026-07-28
  precedent). Run UNMODIFIED vs the driver override: **13 pass / 3 skip / 0 fail → GREEN.** Their
  interval-SHAPE pin (steady cadence, never magazine-locked) and FB-exemption pin pass unchanged.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Converges on the S1 heal encoding,
  the interval trigger shape, the FB-exempt 1237.5 nuke, the ATK▼ unmodeling, and the
  heal-amounts-unmodelable convention. Diverges twice, both blind-side under-models: (1) skill2
  period guessed 20s (the prose gives no number; the datamined skillCooldownsSec.skill2 = 10s is
  ground truth the driver has and the blind packet did not — the driver spec discriminates 17 vs 8
  hits); (2) the burst heal shipped UNCONDITIONAL with a self-flagged ⛑ over-fire caveat ("stack-
  count gate not expressible — no resourceGate on a named ally buff"), where the driver's
  owner-scoped resource pool + `resourceGate` (soda-twinkling-bunny precedent) expresses the gate
  faithfully.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, convergence
  GREEN.** All 7 lines FAITHFUL or DOCUMENTED_GAP; every FAITHFUL line fires at its prose-implied
  cadence with a RED counterfactual pin; zero undocumented gotchas. The blind divergences are
  classified as blind-side under-models, not driver errors. Single low-severity finding: the
  documented gauge data gap below (explicitly "data (not a kit line)", `documentedByDriver:true`,
  not a GO condition).

## Residual flags for owner

1. **⚑1 Cadence tuple (ALWAYS-⚑).** SG pullsPerSec class default 1.5 + reloadFrames 142 + ammo 9 —
   all datamine, unverified for pepper. A ~15–20% mag-dump-cadence swing moves the S1 heal cadence
   AND the Refresh Heart ramp timing (hence the burst-gate transition frame). Recipe: read shot
   cadence + reload gap from any pepper-focus video.
2. **⚑2 skill2 first-fire phase.** `interval:10` fires first at t=10 (the documented convention);
   worth exactly 1 proc (17 vs 18 hits). Recipe: time the first 160% popup in a pepper-focus solo.
3. **⚑3 Refresh Heart no-lapse approximation.** The resource pool never decays; the kit's stacks
   last 15s. At her ~8.4s clip cadence the applications beat the window so stacks never lapse while
   she keeps firing (behavior-identical in scope); diverges only if she stops firing >15s.
4. **Kit-■-order reading.** The burst's +1 stack increment is ordered BEFORE the max-stacks gate
   (bullets resolve in listed order; a 4-mag cast therefore heals). An ordering reading, not a
   measured fact — pinned by the 4-mag-cast discrimination, spot-check vs footage if ever graded.
5. **Gauge-per-shot data gap (judge-flagged, owner backfill).** pepper has NO row in
   `data/gauge-per-shot.json` — the engine falls back to the SG modal 400 (4%/shot) while her
   datamined shot_detail carries 4500/9000 (⇒ a 900 row, drake's exact profile, which HAS one).
   Her burst cadence — hence nuke count and gate timing — is undervalued ~2.2× pending the row. A
   datamine transcription, not a kit-encoding decision; deferred to keep this commit kit-scoped.
