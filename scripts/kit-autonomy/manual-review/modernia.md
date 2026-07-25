# Manual review — `modernia` (Modernia)

**Gauntlet date:** 2026-07-25 · **Verdict:** GO (cross-family corroborated) · **Faithfulness:** 1.0 · **Tier:** 2

MG / Attacker / Fire / Burst III (cd 40s), Pilgrim. ammo 300 / reloadFrames 159 / hitsPerShot 2 / normalMult 7.71.

## What the kit does (owner sanity-check)

Modernia is a volume-of-fire MG Attacker. Every bullet that lands adds a small extra hit worth 3.05% of her
final ATK, and every 200 hits she gains a stack of Critical Damage ▲14.25% (up to 5, 10s each) — paid for with a
matching Max Ammunition ▼5.04% per stack, which shrinks her 300-round belt toward ~225 and makes her reload more
often. On every team Full Burst she gives all allies Hit Rate ▲8.56% for 15s, and while that accuracy status is
running, each further 200 hits grants herself ATK ▲29.38% for 10s. Her Burst III lengthens the team's Full Burst
by 5s and puts her into Destroy Mode for 15s: unlimited ammunition (no reloads), extended line of sight / auto-aim
that treats the stage target as one enemy regardless of parts, and an extra 2.24% of final ATK riding her fire.
Her best stretch is her own burst window, where no-reload uptime, maxed crit-damage stacks and the Destroy Mode
rider all overlap.

## Disposition of every kit line (judge-confirmed)

| Line | Disposition | Encoding |
| --- | --- | --- |
| S1 per-hit 3.05% final ATK rider | FAITHFUL | `hitCount:1` enemy `flatDamage 3.05` — fires 2×/pull (hitsPerShot 2), crit-ON, skill bucket |
| S1 200-hit Crit Damage ▲14.25% ×5 / 10s | FAITHFUL | `hitCount:200` self `critDamagePct 14.25`, maxStacks 5 |
| S1 200-hit Max Ammo ▼5.04% ×5 / 10s | FAITHFUL | same block, `maxAmmoPct -5.04` (negative — weapon-state damage, NOT skipped) |
| S2 FB-enter Hit Rate ▲8.56% / 15s, all allies | FAITHFUL | `fullBurstEnter` allies `hitRatePct 8.56` (NOT burstCast) |
| S2 200-hit-in-status ATK ▲29.38% / 10s, self | DOCUMENTED-GAP (⚑3) | `hitCount:200` self `atkPct 29.38` + `fbGate:'inFb'` proxy |
| Burst FB Duration ▲5s, all allies | FAITHFUL | `burstCast` allies `fullBurstExtend 5` (her casts only → 15s vs 10s) |
| Burst unlimited ammunition 15s, self | FAITHFUL | `burstCast` self `unlimitedAmmo 15` |
| Burst Destroy Mode 2.24% / 15s, self | DOCUMENTED-GAP (⚑5) | `burstCast` self `extraHitDamagePct 2.24` (per-hit rider → 4.48%/shot, crit-ON) |
| Burst auto-aim / line-of-sight / parts clause | DOCUMENTED-GAP (unmodeled) | verbatim in `unmodeled.burst` — inert vs partless scope-lock boss |

## Cross-family convergence

- **S2b (claude-fable-5):** independently re-derived all 9 lines; named the fbGate:'inFb' proxy "the nearest
  faithful proxy", caught the Max-Ammo-DOWN trap, and classed the Destroy Mode cadence MEASUREMENT-GATED (→ ⚑5).
- **S5 (claude-opus-5, blind test):** 27/29 non-skipped assertions GREEN vs the driver override. The 2 REDs are
  blind-test over-assumptions, both classified RECON_ERROR by the judge (below).
- **S6 (claude-opus-5, blind override):** byte-identical to the driver on 6/7 lines; the 7th (S1 rider) is the
  `extraHitDamagePct`-vs-`flatDamage` encoding fork — damage-log-identical, the driver's `flatDamage` chosen for
  burst-gauge economy (flatDamage emits skillGauge per proc; the passive-buff path emits none). Independently chose
  fbGate:'inFb' and the per-hit Destroy Mode reading, and the same ⚑ set.
- **S7 (claude-opus-5, binding judge):** GO, faithfulness 1.0, discriminationOk true. No REAL-GOTCHA survived.

## The two S5 blind-test REDs (adjudicated RECON_ERROR — NOT driver unfaithfulness)

1. **S2a "zeroing Hit Rate lowers her own total"** — modernia is MG; the engine's HR→core lift is wired only for
   AR/SMG/SG (game-mechanics §7), so Hit Rate moves zero of HER own damage (probe: modernia/crown/helm totals
   byte-identical with it zeroed; only liter, the AR-class consumer, drops 1.1%). The line is faithfully encoded and
   live; the blind test assumed a self-damage consequence the SSOT says an MG cannot have. Documented as ⚑2.
2. **Burst FB+5s "more total damage"** — removing the extend lets her fit 6 casts / 11 FB windows into 180s vs
   5 / 10 with it (shorter windows cycle faster → more Destroy-Mode uptime), so total damage goes UP despite fewer
   in-FB hits per window. This is the documented "FB-count anomaly." The driver's M5 discriminates via window
   DURATION (15s her casts / 10s helm's; 300-frame delta), the correct observable, and is green.

Neither was "fixed" by weakening the model (that would fabricate an MG Hit-Rate core lift / a monotonic-FB mechanic).

## ⚑ flags (estimates needing measurement; all with recipes in the override)

- **⚑1** MG cadence tuple (reloadFrames 159 + rolling-reload) is datamine-sourced/unreliable; the whole kit's proc
  rate inherits this. Recipe: read her ammo counter frame-by-frame on a solo recording.
- **⚑2** Hit-Rate→core-rate lift for MG is unmeasured (engine wires it only for AR/SMG/SG). Recipe: CORE HIT popup
  fraction inside vs outside the 15s post-FB window, at matched wind-up spin state.
- **⚑3** The "during increasing Hit Rate status" gate is proxied as fbGate:'inFb' (no requires-own-buff gate exists
  in the schema). Exact when she bursts; undercounts the 5s status tail on another B3's 10s window; the hit counter
  accrues out-of-window. Recipe: count ATK▲29.38 buff applications per rotation vs sim.
- **⚑4** Burst is datamined as skill_type ChangeWeapon (swap to shot 1026002); the model keeps the base MG profile
  through Destroy Mode (shared end_rate_of_fire 4200 weakly corroborates). The Destroy Mode rider CRITS (RIDERCRIT
  default-ON). Recipe: pull shot 1026002's rate/damage/core row; model a weaponSwap if it differs.
- **⚑5** Destroy Mode 2.24% CADENCE is unmeasured — shipped as a per-hit rider (the 1/s-DoT reading is ~40-60× lower
  and was rejected as a massive undercount, but no popup count confirms per-hit). Recipe: count 2.24% popups/sec
  inside the 15s window — per-hit tracks fire cadence (~60/s), DoT gives exactly 1/s.

## Board / measurement residual (NOT a faithfulness blocker)

Board reads **0.84 COLD** on a single recorded read (sim over-predicts ~16%). Per kit-status this read is confounded
by the FB-count anomaly and a masking-case comp (naga phantom-buff exposure). The gauntlet is a faithfulness audit,
not a measurement tuning; the model was deliberately NOT fudged to cool the board (the judge explicitly noted the
driver removed the previously-shipped UNGATED ATK▲29.38% over-credit "on kit text, explicitly not to cool a 1.07-HOT
board"). A clean Modernia focus recording is the path to grading this unit.

## Judge residuals for the owner to spot-check (non-verdict-changing)

1. **Test-coverage hole:** no assertion directly pins the APPLICATION CADENCE (inter-application frame gap) of the
   two 200-hit blocks. M1's shots×2 pin establishes the hit-counter convention indirectly; a direct frame-gap assert
   would close the hole if the engine's counter ever also counted the S1 rider's own damage instances.
2. **Gauge coupling (U11c):** the S1 rider's `flatDamage`-vs-`extraHitDamagePct` fork was chosen for burst-gauge
   economy, which is SSOT-consistent (game-mechanics §6), but whether an "additional damage" rider generates gauge
   per proc in-game is itself unverified — and the driver states her measured-exact rotation depends on it. Worth an
   owner eye before anyone re-encodes this line.

## Artifacts

- Driver test: `scripts/tests/units/modernia.test.ts` (20 assertions, green)
- Driver override: `src/skills/overrides/modernia.json`
- Blind test: `scripts/kit-autonomy/blind/modernia.test.ts`
- Blind override: `scripts/kit-autonomy/blind/modernia.override.json`
- Cross-family packets + results: `scripts/kit-autonomy/cross-family/modernia/`
- Binding judge verdict: `scripts/kit-autonomy/results/modernia.json`
