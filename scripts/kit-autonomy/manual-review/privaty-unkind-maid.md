# Manual review — privaty-unkind-maid (Privaty: Unkind Maid)

**Verdict:** GO (cross-family corroborated) · **faithfulness 1.0** · **tier 2** · **date 2026-08-01**

Electric SG Attacker, Burst III (cd 40s), ammo 9 / reloadFrames 141 / hitsPerShot 10 pellets /
normalMult 182.1. Variant of base Privaty (the AR/Water unit) — distinct slug, distinct kit.

## Kit summary

A pellet-counter kit. Every 30 pellets she fires a bonus 202.84%-of-final-ATK hit at the enemies
nearest her crosshair (S1). Landing ≥5 pellets with a single shot gives herself a 2s reload-speed
buff (S2a). During Full Burst, every 30 pellet hits drips one shell back into her magazine and
stacks a 2s ATK buff up to 5 times (S2b). Her Burst III grants herself 10s of Attack Damage
▲10.56% and Critical Damage ▲88.17%, and deals a single 1066.66% burst hit to all enemies.

## Line-by-line dispositions

| Line    | Kit text (≤40ch)                                        | Disposition       | Encoding                                                                                                                                                                                                                                                                                                                              |
| ------- | ------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1      | hitting target with 30 pellets → 202.84%                | FAITHFUL          | `hitCount count:30` → enemy → `flatDamage 202.84 noRange`. Engine adds `hitsPerShot`=10/pull (sim.ts:3585) ⇒ every 3rd pull, repeating. crit-on default, no core (no "core strike" text), FB-by-timing. "2 enemies nearest crosshair" collapses to the lone boss.                                                                     |
| S2a     | ≥5 pellets/shot → Reload Speed ▲20.88% 2s               | FAITHFUL (approx) | `shotFired` → self → `reloadSpeedPct 20.88 / 2s`. The per-shot ≥5-pellet landing gate has no engine primitive and is dropped (assumed satisfied at single-boss focus-band landing ~9/10; 2s window refreshed every shot ⇒ ~100% uptime). ⚑2.                                                                                          |
| S2b     | 30 pellet hits during FB → Reload 1 + ATK ▲11.22% ×5/2s | FAITHFUL          | `hitCount count:30` + `fbGate:'inFb'` → self → `instantReload fraction 0.1111` (one shell of 9) + `buff atkPct 11.22 maxStacks 5 / 2s`. `fbGate:'inFb'` (sim.ts:2030) gates firing to Full Burst — the velvet/modernia precedent for "N hits during Full Burst". ⚑3: the counter still accrues ungated (small boundary over-accrual). |
| Burst-1 | self Attack damage ▲10.56% + Crit Damage ▲88.17% 10s    | FAITHFUL          | `burstCast` → self → `attackDamagePct 10.56 / 10s` + `critDamagePct 88.17 / 10s`. Self-scoped; fires on HER OWN cast (not fullBurstEnter).                                                                                                                                                                                            |
| Burst-2 | all enemies → 1066.66% Burst Skill damage               | FAITHFUL          | `burstCast` → enemy → `flatDamage 1066.66`. Burst-cast instant damage is auto-FB-exempt (cast lands before the FB window); crit-on at sheet rate. "All enemies" collapses to the lone boss.                                                                                                                                           |

`unmodeled` arrays are genuinely empty; no `ignored` blocks.

## Cross-family corroboration

- **S2b pre-op test-faithfulness review — claude-fable-5** (`reviews/privaty-unkind-maid.test-review.json`):
  independently re-derived all five lines FAITHFUL. **Made the decisive catch:** it dispositioned S2b
  FAITHFUL via `hitCount:30 + fbGate:'inFb'` where the driver's first draft had it UNMODELED (the driver
  wrongly assumed no FB-gate primitive existed). Driver verified `fbGate` at types.ts:374 / sim.ts:2030
  and corrected the override + test.
- **S5 blind test-writer — claude-opus-5** (`blind/privaty-unkind-maid.test.ts`): independently wrote a
  27-assertion spec; also modeled S2b as FB-gated. Reconciled (harness-shape bugs fixed: events carry
  numeric `casterIdx`/`targetIdx` + `.slug`, not `casterSlug`/`targetSlug`/`srcSlug`; one over-strict
  byte-identical teammate-inertness assertion relaxed to a 0.5% relative tolerance for the real
  S1-gauge→rotation coupling). Runs **24 passed / 3 legit GAP skips / 0 failed** vs the driver override.
- **S6 blind override-writer — claude-opus-5** (`blind/privaty-unkind-maid.override.json`): structurally
  IDENTICAL to the driver override on all five lines (including `hitCount:30 + fbGate:'inFb'`,
  `instantReload 0.1111`, same ⚑ set). Only cosmetic difference: S6 set `crit:true` on the S1 rider
  explicitly; the driver relies on the engine flatDamage crit-ON default (equivalent, isabel precedent).
- **S7 reconciling judge — kimi-code/k3** (`results/privaty-unkind-maid.json`): binding verdict **GO,
  faithfulness 1.0**, `gotchas: []`, `discriminationOk: true`, convergence GREEN. Confirmed the fbGate
  catch and classified all three approximations as documented ⚑s, not gotchas.

## Residual flags (owner spot-check)

- **⚑1 — fired-vs-landed pellet cadence (S1):** the `hitCount` counter counts FIRED pellets (10/pull);
  the kit reads LANDED pellets. Near-equivalent at single-boss focus-band landing (~9/10); cadence
  stretches if landing drops. Recipe: per-shot landed-pellet count from a pum focus video.
- **⚑2 — S2a ≥5-pellet per-shot gate (dropped):** no engine primitive; assumed satisfied at focus-band
  landing. Bites only at far band / <5 landing. Recipe: per-shot landed-pellet count at the recorded band.
- **⚑3 — S2b counter accrues ungated (boundary):** the engine counter cycles whether or not the gated
  block applies, so there is a small over-accrual into FB-entry firings (same documented approximation as
  modernia S2b). Recipe: footage of her ATK-stack icon applications per FB window vs sim.
- **⚑4 — SG cadence tuple (mandatory):** pullsPerSec (SG class default ~1.5) + reloadFrames 141
  (datamine) + rolling-reload — datamine-unreliable; her whole proc economy is downstream of it. Recipe:
  rounds/min + reload gap from a focus video.
- **S7 judge residual:** neither test suite builds the named `fullBurstEnter` counterfactual for the burst
  self-buffs. It is behaviorally vacuous in the sole-B3 driver fixture (her cast precedes every Full
  Burst), but in any future dual-B3 graded comp the burstCast-vs-fullBurstEnter distinction becomes live
  and a one-line counterfactual should be added.

## Artifacts

- Driver test: `scripts/tests/units/privaty-unkind-maid.test.ts` (17 assertions, GREEN)
- Driver override: `src/skills/overrides/privaty-unkind-maid.json`
- Judge result: `scripts/kit-autonomy/results/privaty-unkind-maid.json`
- Blind: `scripts/kit-autonomy/blind/privaty-unkind-maid.{test.ts,adapted.test.ts,override.json,test-spec.json,override-audit.json}`
- Cross-family result JSONs: `scripts/kit-autonomy/cross-family/privaty-unkind-maid/{s2b,s5,s6,s7}-result.json`
