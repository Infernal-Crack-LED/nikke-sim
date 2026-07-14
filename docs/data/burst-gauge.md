# Burst gauge generation — full model

Detail doc for [game-mechanics.md](game-mechanics.md) §6. Engine:
`gaugePerShot`/`addGauge`/`skillGauge` + the burst-chain state machine in
`src/engine/sim.ts` ("gauge v4", 2026-07-13 — rebuilt from datamined tables and two solo
gauge recordings; supersedes the calibrated v3 model).

Primary sources:
- **Datamined `CharacterShotTable`** (community CSV mirror:
  https://github.com/coolguydlm123/nikkecsvlibrary) — per-unit columns
  `burst_energy_pershot`, `target_burst_energy_pershot`, `full_charge_burst_energy`,
  plus `reload_start_ammo`, `rate_of_fire`, and the per-cast stage window
  `burst_duration` in `CharacterTable`.
- **nikke-einkk reference simulator** (https://github.com/d34d633f/nikke-einkk) —
  implements the datamined generation formula including the focus bonus
  (`BurstGenerationEvent.bullet`) and the stage-window state machine.
- **Two solo gauge recordings vs the raid boss** (docs/probes/tb2, test 3): Maiden: Ice
  Rose (rocket launcher) and Takina (plain sniper rifle) — both fit the datamined model
  exactly, per-shot, with visible per-hit sub-steps.
- Community measurement lineage (hit-count tests, now superseded but corroborating):
  note.com/_trick_ (https://note.com/_trick_/n/n1c792ae5f06c), wiki3
  (https://wiki3.jp/nikke/page/2605), nikke.gg
  (https://nikke.gg/burst-gauge-generation/).

## 1. Core rules

- Gauge maximum = **10,000 energy** (UI shows 100.00%; 1% = 100 energy).
- Fill counts **HITS, not damage**.
- Per trigger pull vs the **stage target** (the raid boss, and also the practice target)
  the gauge gains the unit's datamined **`target_burst_energy_pershot`** — universally
  exactly **2× the non-target base** across the entire table. The old "boss ×2" rule IS
  this column. Shotguns: the table value is per pellet; per trigger = value ×
  `shot_count` (10). Multi-muzzle rows multiply by `muzzle_count`.
- **Locked during Full Burst and during the chain** (stages 1–3; einkk, KR sources,
  user-confirmed). The fast post-FB refill visible in recordings is NOT in-FB banking:
  charge-weapon units sit at full charge when FB ends and release a split second
  after the boundary, front-loading the first moments of the refill, on top of normal
  team rates. (An in-FB-generation interpretation was briefly adopted 2026-07-13 from
  the bar anatomy and corrected by the user the same day — the refill curves are
  explained without it.) Bar-reading note for future analysis: the bar's FULL-RESTING
  render occupies 83.5% of its pixel width (confirmed on a 9-second wait-at-full
  stretch); readings ≥96% are the pre-chain glow pulse.
- **The next chain cannot open until ~3s after Full Burst ends** (MEASURED: chain glow
  at FB-end +3.0s even when the refill completes at ~+1.2-2s and the Burst-1 cooldown
  is ready at +1.5s) — a post-full-burst re-engage window.
- Consequence: since high-generation comps finish refilling inside that ~3s window,
  **rotations are cooldown- and chain-bound, not gauge-bound** — full-burst counts are
  cooldown arithmetic, which is why they are deterministic run-to-run (the only real
  variance source is a boss range transition colliding with a chain, which blocks
  casts ~1s while the boss is off-screen).
- Burst Gen ▲ buffs and the Quantum cube sum additively, then multiply base generation.
- **No auto-play efficiency factor exists.** Both solo recordings match the datamined
  values with no loss; the old `AUTO_GEN_EFFICIENCY 0.7` was compensating for the chain
  mechanics in §3 (and partially the focus rule in §4), both now modeled directly.

## 2. Per-unit values

Per-unit data lives in **`data/gauge-per-shot.json`** (85 units datamined, 15
weapon-class modal fallbacks, 1 estimate). Class-modal targets per trigger (energy):
MG 10 per belt round · SMG 20–30 · AR 40–50 · SG 400 (10 pellets × 40) · SR 510–580
(modal 560) · RL 280 (modal; the "clip-reload" family runs 650–720).

Real per-unit outliers are kit design, not errors: Trina **720** (the famous battery),
Jill 220 (an AR firing at 150 rpm), Maiden: Ice Rose 364, Cinderella 45 (fast-cycling
launcher). Anis: Star is NOT a shot-row outlier — her solo measurement (battery 3 A3)
pinned her at the standard 280 row; her Siren-class battery reputation is her Skill-1
proc generation + her +6% team fill aura (the synergy aggregate folds these into its
per-shot number, which is why that column was retired). Independent cross-check: nikke-synergy's
arena calculator lists per-shot values matching our BASE column for snipers/rifles/MGs
(jill 1.1 = 110, takina 2.8 = 280, moran 0.25 = 25, crown 0.05 = 5), and its
`special_burst_gauge` annotations catalogue per-unit skill-generation quirks we don't
yet model (Ein's orb adds 560 every ~2.8s; Helm's kit adds a fixed 1,431; Liberalio and
Snow White: Heavy Arms have per-shot-sequence bonuses) — likely where Ein's current
0.7x residual lives. The blablalink/synergy-API `burstGaugePerShot` column was **dropped as a
gauge source** — its semantics vary per unit (helm's 5.6 is her TARGET value, takina's
2.8 is her BASE, trina's 14.4 is her target ×2, a2's 15.6 matches nothing datamined).

## 3. The burst chain consumes and gates the gauge

Datamined (`burst_duration`, einkk `ChangeBurstStepEvent`) and directly measured in the
3-unit battery fight (docs/probes/tb2 test 2, real rotation 40s):

- When the gauge fills, **opening the chain zeroes it** (stage 1 opens; the gauge is
  spent whether or not the chain completes).
- Stage 1 (waiting for a Burst 1) never expires. A Burst-1/2 cast opens the next stage
  with a **10-second window** (`burst_duration` 1000 = 10.00s; a few units carry 5s/15s/
  20s variants — the same column gives Burst-3 units their Full Burst length, which is
  how the 5s-FB units are encoded).
- If a window expires with no eligible caster (everyone on cooldown), the chain
  **collapses back to filling** — a full refill is needed. JP guides document the
  player-visible half of this ("holding the charged gauge too long resets it and it
  must be rebuilt" — kamigame 234723583702655646, gamewith 371574). This is what stretches
  rotations when no Burst 3 is ready: the measured 40s rotation decomposes as fill ~8s →
  chain opens → stage-3 window expires (cinderella on cooldown 32.5s effective) →
  refill → second chain completes exactly when her cooldown ends.
- Auto-burst selection is **leftmost slot order, with waiting**: inside a timed stage
  window the chain waits for the leftmost stage-filling unit whose cooldown ends before
  the window closes, rather than instantly handing the cast to a lower-priority ready
  unit (user-ruled 2026-07-13: a 3rd-from-left Burst 3 — e.g. Maiden in the elec-weak
  validation fight — never bursts on auto; no composition has enough cooldown reduction
  for the leftmost two to sit out an entire 10s window). The
  recorded run-B alternation (cinderella/neon strictly alternating at 16.4s rotations)
  falls out of leftmost + real cooldowns + moran's team-wide burst-cooldown reduction —
  a round-robin selection theory was tried and rejected (it makes bench Burst-3 units
  cast when real fights never pick them).

## 4. Charge weapons and the camera-focus bonus

einkk's datamined formula: a charge weapon held by the **camera-focused unit** generates
× (1 + 1.5 × chargePercent) — **×2.5 at full charge**. Both solos confirm it exactly
(a solo unit is always focused): maiden 364 × 2.5 = 910/shot, takina 560 × 2.5 =
1400/shot, measured to the pixel on the gauge bar.

- Default camera focus = formation slot 3 (engine: index `min(2, n-1)`); recordings
  where the user selects a focus unit pass `cfg.focusSlug`. **The recording itself
  perturbs the fight**: in battery test 5 alice (focused, sniper) came in +9.3% vs her
  unfocused original run while every teammate repeated within ±5%.
- **Unfocused charge units generate FLAT ×1.0 — MEASURED** (test battery 3, A1/A2
  pair: takina unfocused steps +5.6–6.5%/shot = her flat 560, takina focused +14–15% =
  560×2.5; the additive `full_charge_burst_energy` hypothesis is excluded — it would
  read +8.1%). The old ⚑×2.2 compensator is deleted; the sniper-heavy comps' remaining
  generation deficit belongs to the per-unit skill-generation quirks (§2), tracked as
  open-questions U11c.
- The old JP note "charge scaling is manual-only" (2024-04-25 patch,
  wiki3.jp/nikke/page/4279) matches the focus gating — "operated" = camera-focused. A
  wiki3 reader comment (2024-07-29) states it directly: the bonus applies to "the one
  NIKKE the camera is focused on" (焦点当ててるニケ1体) — independent support for
  focus-only, which implies the ⚑x2.2 for unfocused units is actually compensating for
  the unmodeled per-unit skill-generation quirks above, not a real charge bonus.

## 5. What generates besides bullets

- **Skill-damage hits**: every skill/additional-damage impact generates the caster's
  flat target per-shot value (NO focus/charge bonus — maiden's rider measured exactly
  364 while her weapon shots measured 910). Engine: `skillGauge()` on flatDamage procs.
- **DoT ticks** generate per tick (wiki3 measured Haran's S1 DoT at 290/tick ≈ her SR
  base). Engine: `skillGauge()` on dot ticks.
- Non-damage skill applications were measured by note.com/_trick_ to generate the same
  per-application amount [MEDIUM confidence, not modeled].

## 6. The two solo measurements (docs/probes/tb2, test 3)

| Solo vs raid boss | Observed | Model |
|---|---|---|
| Maiden: Ice Rose | 12.55%/pull in two sub-steps: +9.1% then +3.45% | weapon 364×2.5 = 910 + rider 364 (skill-gen, flat) — exact |
| Takina | ~14%/shot, full in ~8 shots incl. reload pause | 560×2.5 = 1400 — exact |

The earlier maiden recording vs the NEUTRAL practice target measured the same 910+345
per pull — the practice target counts as a stage target too (target column applies).

## 7. Cross-validation against nikke-synergy's "rl3" column (2026-07-13)

The synergy API's mysterious `rl3` column decodes as **gauge generated in the first ~3
seconds of an arena opener, at base (non-boss) values, unfocused** — and it validates
this model at roster scale: computing `basePerTrigger × shots-in-3s` from our data
reproduces rl3 within ±15% for **74 of 101 units, most exactly** (all plain assault
rifles at ratio 1.00, all machine guns via the wind-up ladder's ~71-73 rounds, all
shotguns, all plain snipers at 3 charge cycles — and always the UNFOCUSED calculation,
independently re-confirming the focus-only rule).

The mismatches decode into exact kit mechanics rather than noise:
- **Ein**: rl3 14.0 = 8.4 (3 shots) + 5.6 (exactly one orb tick in 3s) — orb model
  confirmed to the decimal.
- **Helm**: rl3 59.73 = 8.4 + 3 × **14.31 flat per shot** — matches the arena data's
  `fixed_add 14.31` independently; now modeled (`flatPerTrigger`, no boss doubling, no
  focus bonus). She is a major generation battery in every fight she's in.
- **Liberalio**: rl3 33.6 = 2 triggers × **6 volley hits** × 2.8 — now modeled (per-
  trigger values ×6). Adding this moved the run-G prediction from 12 to 13 full bursts,
  inside the video's measured 13-14.
- **Standard launchers**: uniformly rl3 = 4 shots (not 3) — their opener's first charge
  completes during battle start; a comparison artifact, not a data problem.
- **Jill**: matches once her real 150 rpm cadence is used.
- **Battery openers quantified** (rl3 minus weapon shots): Trina ≈ +28.8, Anis: Star
  ≈ +47, Laplace/A2 ≈ +26-29 of one-time battle-start-style fill — arena-decisive,
  once-per-fight in raids (unmodeled, small). Snow White: Heavy Arms ≈ 24 generating
  hits per 3s (burst-fire pattern, ambiguous trigger count — unmodeled, open-questions
  U11c). Modernia's ×2 and Mihara: Bonding Chain's +1.4/3s are kit hit-count quirks.
