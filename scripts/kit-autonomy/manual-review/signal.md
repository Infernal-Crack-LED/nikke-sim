# Manual review — signal (Signal)

**Gauntlet date:** 2026-08-05
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (`fullBurstEnter`-vs-`burstCast` identity on the S2 heal; FB-exempt-by-cast-timing
nuke on a mid-chain B2; the self-targeted heal-event channel observed via an inert probe;
two engine-gap ⚑ clusters on the unmodeled enemy ▼ lines)

> Slug disambiguation: `signal` is the SMG/Fire BASE unit — no variant shares the name;
> lint-slug-disambiguation passes clean. SMG / Attacker / Fire / Burst II, Elysion SSR, cd
> 20s, ammo 120, reloadFrames 81, released 2022-11-04. FROM-SCRATCH build: no prior
> override, `simSupported` false → true (1-line characters.json diff); kit-status row seeded
> in the --refresh shape then flipped via --gauntlet (--check OK at 172 units, no per-unit
> --refresh — rapi/pascal precedent).

## Kit summary

Signal is a fire-element Burst II SMG attacker whose kit is one nuke, one self-recovery
window, and a pair of enemy stat-shreds the sim has no channel for. Her burst ("Emergency
Signal") deals 229.22% of final ATK to enemies within attack range (collapses to the single
scope-lock boss) — cast mid-chain BEFORE the Full Burst window opens, so the hit never takes
the +50% FB major (FB-exempt by cast timing; pinned via `fbMajorApplied` + cast-frame
identity against the `fullBurstEnter` counterfactual). Skill 2 ("Waiting for Signal") keys
on ENTERING Full Burst (any team FB — the wider trigger, never `burstCast`) and recovers
44.08% of attack damage as HP over 10s on HERSELF: a lifesteal-style HoT whose HP magnitude
is unmodelable by engine design (no HP pool) — the encodable substance is the 10-second
recovery-event window (`heal ticks:10 intervalSec:1`), observed through an inert
recovery-triggered probe on signal herself (the engine emits no recovery SimEvent and
`fireRecovery` dispatches only the RECIPIENT's blocks, so a self-heal is observable only
through the recipient's own recovery trigger). Skill 1 ("Attack Signal") — every 60 landed
normal attacks, enemy DEF ▼5.94% and ATK ▼5.94% for 5s — and the burst's DEF ▼12.34% for 10s
are all enemy-side stat debuffs with NO sim channel: `applyEffect` admits only
`damageTakenPct`/`distributedDamagePct` > 0 into enemyBuffs, drops every other enemy buff at
dispatch ("other enemy debuffs (ATK▼, DEF▼) don't affect our damage with DEF=0"), and
`cfg.bossDef` is a flat per-hit subtraction no debuff scales. All three ▼ lines ship
VERBATIM UNMODELED with ⚑ estimate+recipe+tier (mica/ether/exia/himeno/eunhwa precedent);
the nearest-wrong laundering into `damageTakenPct` is pinned RED (it would emit boss debuffs
AND lift team totals — the shipped model does neither).

## Line-by-line

| Line | Disposition | Notes |
| --- | --- | --- |
| S1: after 60 normal attacks → enemy DEF ▼5.94% / 5s | DOCUMENTED_GAP | The `hitCount:60` trigger IS engine-native, but the enemy DEF▼ effect has no sim channel (see ⚑1) — encoding a live trigger with a dead effect is noise, not faithfulness. Verbatim in `unmodeled.skill1`; omission pinned by ABSENCE (zero signal-cast buffApply events) against the `damageTakenPct 5.94` laundering counterfactual, which emits boss debuffs and lifts team totals. |
| S1: enemy ATK ▼5.94% / 5s | DOCUMENTED_GAP | Same no-channel fate; doubly inert — the v1 boss never attacks, so an enemy ATK-down has no consumer even in principle. Rides ⚑1. |
| S2: entering Full Burst → self, recover 44.08% of attack damage as HP over 10s | FAITHFUL (event channel) | `fullBurstEnter` → self → `heal ticks:10 intervalSec:1`. Trigger identity pinned behaviorally: every recovery firing lands strictly AFTER her cast frame (the FB window, opened after the B3 cast, keys the heal); the `burstCast` counterfactual fires exactly ON every cast frame. The 44.08% HP magnitude rides verbatim in `unmodeled.skill2` ("magnitude only" — no HP pool by design; milk K6 precedent). Window shape: ≥8 firings, ≥8s span per cycle; probe proven inert on totals; removing S2 starves the armed probe AND leaves totals byte-identical. |
| Burst: 229.22% of final ATK as damage to enemies within attack range | FAITHFUL | `burstCast` → enemy → `flatDamage 229.22`: once per signal cast (sole B2, casts every Full Burst), burst bucket, crit-eligible by rider convention, no core (text carries no core-strike clause), never takes the +50% FB major (cast lands before the window opens). Removal erases every nuke and lowers her total; lvl-1 114.61 arm pinned RED. |
| Burst: enemy DEF ▼12.34% / 10s | DOCUMENTED_GAP | Same no-channel fate as S1's DEF▼ (⚑2): verbatim in `unmodeled.burst`, pinned against a `damageTakenPct 12.34` laundering (emits boss debuffs + lifts totals). |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Converged on every
  encodable line: `hitCount:60` cumulative-hit trigger identity (first fire EARNED, never
  t=0); `fullBurstEnter` — explicitly "the correct WIDER trigger; do not narrow it to
  burstCast"; burst nuke `burstCast` / burst bucket / FB-exempt-by-timing / no core / no
  range; and THE trap named on S2 — "'44.08% of attack damage' parsed as an attackDamagePct
  44.08 BUFF … catastrophically over-credited" (the driver's model never touches a damage
  stat). Its two conditional-FAITHFUL dispositions (enemy `defPct` encodings for the ▼ lines)
  carried their own escape clause — "if the engine has no enemy-DEF consumer, the faithful
  dispositions become GAP and the driver must declare that openly" — and the condition
  verified FALSE in `sim.ts applyEffect` (enemyBuffs admits only `damageTakenPct`/
  `distributedDamagePct` > 0; bossDef flat). Fixture hazard (competing B2 in controlComp)
  independently flagged — resolved by the driver's sole-B2 fixture.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. **7 passed / 7 failed / 5 skipped**
  vs the driver override (adapted copy — two structural fixes only: harness import path +
  `cfg.onEvent` placement; pristine preserved at `blind/signal.test.ts`). The 5 skips are the
  blind author's OWN engine-gap declarations (enemy-DEF/ATK consumer absent; lifesteal
  magnitude unobservable — the author independently discovered the self-targeted heal is
  observable by NO teammate consumer; range-exclusion unreadable blind). The 7 REDs decompose
  completely: 5 = dead-encoding-vs-documented-UNMODELED policy (the blind suite's OWN
  fudge-detector — "the skill1 shred moves NO damage" — is GREEN against the driver override,
  proving mechanical equivalence); 2 = the competing-B2 fixture artifact (driver probe: under
  controlComp crown takes every stage-2 cast — burstCast by slug {liter:10, crown:10, helm:5,
  signal:0} — vacating its own burst assertions; standing batch precedent rules this a
  fixture-choice artifact, NOT a faithfulness signal). The 7 GREENs include every
  mechanically load-bearing convergence (fullBurstEnter/self/no-damage-buff/no-44.08-anywhere/
  team-inert; burstCast/enemy/one-flatDamage-229.22/no-core; noFb strict no-op).
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Converged on every encodable
  line: `hitCount:60` → enemy (the ▼ pair), `fullBurstEnter` → self → `heal ticks:10
  intervalSec:1` ("literal text, NOT burstCast"), `burstCast` → enemy → `flatDamage 229.22`.
  It ENCODED the three ▼ lines as enemy `defPct`/`atkPct` debuffs with NEGATIVE values while
  its own audit declared them "engine-inert (no boss-DEF debuff channel)" / "permanently 0
  damage at scope lock" — the engine drops those at dispatch before any event, so the blind
  and driver encodings are behaviorally IDENTICAL; the divergence is documentation policy
  (dead blocks vs documented zero), which the judge litigated.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, gotchas [], discriminationOk:true.**
  Ruled Cluster 1 (the ▼ lines) for the driver: "the documented-zero treatment is faithful" —
  verbatim unmodeled + ⚑ estimate/recipe/tier, engine fact verified against the SSOT, never
  laundered into damageTakenPct. Ruled the two Cluster-B S5 REDs a fixture artifact under
  standing batch precedent (the driver's sole-B2 fixture pins the nuke non-vacuously).
  Confirmed Cluster 2 (S2 probe methodology + window assertions) and Cluster 3 (nuke
  identity) as faithful. "No real gotchas. … The one fudge that would have moved totals
  [was] pinned RED by both driver and blind."

## Residual flags for owner

1. **S1 cluster — enemy DEF▼5.94%/ATK▼5.94% for 5s every 60 hits (⚑1, ENGINE GAP, minor).**
   Estimate: ~8.3 flat boss DEF (5.94% of the 140-DEF scope-lock boss) off every hit during
   the 5s window at near-permanent uptime (SMG ~24 hits/s ⇒ 60 hits ≈ 2.5s — the counter
   refreshes well inside the 5s expiry while firing): a small team-wide lift, honestly
   absent; comps read COLD by exactly that amount. The ATK▼ half is damage-ZERO in v1 (the
   boss never attacks — a survivability lever only in real fights). Recipe: a
   boss-DEF-reduction debuff primitive feeding the subtractive DEF term (+ an
   incoming-boss-damage model before the ATK▼ half could mean anything) — engine-core. NEVER
   launder into damageTakenPct (pinned RED). Enact together with ⚑2 + mica's DEF▼13.32% +
   novel's DEF▼7.05% (same mechanic family).
2. **Burst DEF▼12.34% for 10s (⚑2, ENGINE GAP, minor).** Estimate: ~17.3 flat boss DEF off
   every hit during the 10s window per 20s cycle (~50% uptime) — a small team-wide lift;
   signal's whole team value lives here, honestly absent. Same recipe as ⚑1.
3. **S2 lifesteal magnitude (unmodelable by design).** The 44.08%-of-attack-damage HP value
   cannot be represented without an HP pool; the recovery-event WINDOW is modeled and pinned.
   Becomes load-bearing only if the sim ever adds HP/damage-taken or an ally whose damage
   keys off receiving recovery.
4. **SMG cadence tuple (shipped datamine as-is).** ammo 120 / reloadFrames 81 / RoF 1440 —
   the cadence-tuple ⚑ was RETIRED by owner ruling 2026-07-25 (datamine tuple reliable); it
   feeds the ⚑1 counter's proc cadence whenever that gap is enacted.
