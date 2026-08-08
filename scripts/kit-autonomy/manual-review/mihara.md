# Manual review — mihara (Mihara)

**Gauntlet date:** 2026-08-05
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (use-count staging — two escalating ladders ticking on one trigger; burstCast-vs-fullBurstEnter identity with a co-B3 discriminator; a status-gate-equivalent encoding; Full-Burst-duration modifier with a blast-radius ⚑)

> Slug disambiguation: `mihara` is the BASE unit (Mihara, AR/Water/Attacker/Burst III,
> cd 40s, ammo 60, SR rarity, released 2022-11-04). The variant `mihara-bonding-chain`
> (MG/Fire, aka "mbc"/"miharabc"/"mihara os", gauntleted 2026-07-26) is a DIFFERENT unit.
> lint-slug-disambiguation flags every bare "Mihara"/"mihara" token for this pair —
> including the slug itself, so NO text form passes clean (the base unit has no approved
> nickname); the confirmation is recorded here and in the test / override headers per the
> mica precedent — this run is about the AR/Water attacker only.

## Kit summary

Mihara is a Water AR Attacker holding a Burst III slot (40s CD). Her kit is ONE escalating
ladder keyed to her OWN burst-cast count (the Liter/isabel "Once:/Twice:" family) plus a
last-bullet crit-damage rider. Skill 1 ("Endure") refreshes a 10s self Critical Damage
▲18.7% buff every time her 60-round magazine empties (~7.0s cycle at AR cadence — near-
continuous uptime after the first magazine). Skill 2 ("Highway to Hell") escalates on each
of her own burst casts: cast 1 grants ATK ▲15.56% for 45s; cast 2 onward re-applies it and
adds Critical Rate ▲11.28% for 45s ("each subsequent effect triggers all effects before
it"). Her Burst ("Sense Sharing") shortens the Full Burst window HER cast opens by 5s
(10s → 5s), deals 399.6% of final ATK as burst damage to all enemies, and — once Highway
to Hell 2 is live (cast 2 onward) — adds a further 266.4% hit. She is an SR rarity unit,
so the spec runs her on the {stars:3, core:0} ceiling.

## Line-by-line

| Line | Disposition | Notes |
| ---- | ----------- | ----- |
| S1 "Endure": last bullet hits the target → self Critical Damage ▲18.7% for 10s | FAITHFUL | Engine-native `lastBullet` trigger (magazine exhaustion / reload start; the sim models no misses, so last-fired == last-hit at scope) → self `critDamagePct 18.7 / durationSec 10`. Unscoped "Critical Damage" = the generic stat (not the normal-attack-scoped variant). Pinned: applications land EXACTLY on magazine-end frames (set equality vs ammoAfter==0 shot frames), ≥20/180s, self-only, 10s windows. Nearest-wrongs pinned RED: shotFired ("when attacking") re-applies on every pull; functional removal lowers her total (load-bearing crit-damage buffer) |
| S2 "Highway to Hell" trigger: when using Burst Skill, affects self | FAITHFUL | `burstCast` keyed to HER OWN cast — not fullBurstEnter: the control fixture seats helm as co-B3, so team Full Bursts happen on rotations mihara does NOT cast; those must neither apply her buffs nor advance her ladder (the S2b reviewer independently named this trap) |
| S2 Once: Highway to Hell 1 — ATK ▲15.56% for 45s | FAITHFUL | `escalating` step 1 (`atkPct 15.56 / durationSec 45`): lands on every own cast including the first; the 45s window exceeds her 40s CD so refresh keeps it live at scope |
| S2 Twice: Highway to Hell 2 — Critical Rate ▲11.28% for 45s ("each subsequent effect triggers all effects before it") | FAITHFUL | `escalating` step 2 (`critRatePct 11.28 / durationSec 45`): absent on cast 1, applied alongside a fresh ATK re-grant on every cast 2+ (pinned per cast frame; the flat-encoding counterfactual fronts the crit rate onto cast 1; the passive applies both at frame 0). Ladder capped at 2 steps — no phantom third step, no uncapped stacking |
| Burst line 1: Full Burst Duration ▼5s on all allies | FAITHFUL ⚑ | `fullBurstExtend seconds:-5` on burstCast → allies — isabel's identical "Full Burst Time ▼ 5 sec" encoding. Pinned: FB windows opened by HER casts run exactly 300f (5s); helm-opened windows stay 600f (10s); the ▲5 sign flip reads 900f and removal reads 600f (both RED). ⚑ BLAST-RADIUS (isabel's standing flag): the engine's rotation model resolves the NET effect as net-POSITIVE — the 5s window ends earlier so the chain re-opens sooner and a 180s fight packs one EXTRA full burst (5 FBs / 5 casts vs 4/4; team 296.0M vs 267.7M without the line, +10.5%), outweighing the per-window +50% loss (1633 vs 2446 in-FB damage instances). The REAL-game sign is measurement-gated — /sim-battery diff + a mihara focus recording before trusting her board number |
| Burst line 2: 399.6% of final ATK as Burst Skill damage to all enemies | FAITHFUL | Step 1 of the burst slot's escalating damage ladder (`flatDamage atkPct 399.6`), burst bucket, crit-eligible at her sheet rate (flatDamage crit-on default; U1), never cores (no "core strike" text), FB-EXEMPT by timing (burstCast resolves pre-FB — `fbMajorApplied === false` on every instance, U10). One instance per own cast, on cast frames |
| Burst line 3: while in Highway to Hell 2 status — 266.4% of final ATK as additional damage to all enemies | FAITHFUL | Step 2 of the same escalating ladder (`flatDamage atkPct 266.4`): cast 1 applies step 1 only; cast 2+ applies both. ENCODING CHOICE: the kit's gate is a SELF status (HttH2) and the engine has no owner-buff-active gate, so the ladder's activation counter — ticking on the SAME own-burstCast trigger as S2's counter — stands in for it; the 45s stage-2 duration exceeds the 40s CD, so the counter and the named status coincide at scope (the lapse-divergence case is documented in caveats). Cast-2 onset pinned (cast 1 → exactly [399.6]; casts 2+ → [266.4, 399.6]); always-on (fires cast 1) and omitted counterfactuals both RED; lvl-1 magnitudes 174.82/116.55 pinned RED. Same crit/no-core/FB-exempt treatment as the base hit |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Converged on
  every line — the lastBullet S1 trigger (with the identical shotFired/passive nearest-
  wrong), the burstCast-not-fullBurstEnter S2 keying (reviewer independently named the
  helm co-B3 trap), the Liter-style escalating ladder with cast-2 onset of the crit-rate
  step, the FB-exempt/no-core burst nuke, and the HttH2-gated additional as a cast-2-onset
  rider ("if the driver resolved the gate PRE-skill2 it would first fire on cast 3 — this
  ordering is itself a divergence the test must pin", adopted: the driver spec pins
  cast-2). One conditional divergence: the FB▼5s line dispositioned GAP *with an explicit
  escape clause* — "if the engine clamps negative seconds this line is a real GAP and must
  be declared". The condition verified FALSE against sim.ts (the handler adds `seconds`
  sign-agnostically; isabel ships −5 with a pinned spec), so FAITHFUL + ⚑ is exactly the
  review's prescribed outcome.
- **S5 (claude-opus-5, blind tests):** `leakDetected:null`. Dispatch needed one retry
  (first attempt exhausted max_turns with no JSON). Adapted copy (three structural fixes
  documented in its header: harness import path; the rider-gate structural assertion —
  pristine expected a block-level gate KEY, the driver encodes the gate as the ladder's
  STEP INDEX, adapted to accept either shape; the FB-shorten net-sign assertion — pristine
  expected removal to RAISE team damage, the engine's rotation model resolves the OPPOSITE
  sign, adapted to movement + pinned engine sign with the ⚑ noted) runs **19 tests — 16
  passed / 3 skipped / 0 failed** against the driver override. The 3 skips are the blind
  writer's OWN honest gaps: rider cast-2-vs-cast-3 onset (kit-ambiguous, footage-gated —
  the driver pins cast-2 via SLOTS dispatch order), exact lastBullet count (cadence
  datamine), and no event channel for an FB-duration change (asserted indirectly).
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Converged line-for-line:
  identical S1/S2/burst-FB encodings (same triggers, stats, magnitudes, durations). ONE
  structural difference: the HttH2 gate modeled as an explicit resource pool
  (highwayToHell +1/own cast, cap 2) + `resourceGate min:2` on a separate rider block
  where the driver uses the escalating ladder's step index — behaviourally identical at
  scope, as S6's own caveat concedes ("at scope-lock rotation the two readings coincide").
  S6 additionally flagged the negative-seconds concern (verified live), the reduce-BY vs
  set-TO reading (engine is reduce-BY), the same-cast arming ordering (landed on cast 2,
  same as driver), and the rider crit convention (engine default).
- **S7 (kimi-code/k3, binding judge):** verdict **GO**, faithfulness **1.0**, zero
  gotchas, `discriminationOk:true`, S5-vs-driver GREEN. Rationale: all six lines encoded,
  firing at the prose-implied cadence, each discriminating RED under its named nearest-
  wrong model; three independent derivations converged including both classic traps
  (burstCast-vs-fullBurstEnter keying; the FB▼5s line not being a skippable no-op). The
  two surviving residuals are recorded as owner spot-checks, not verdict blockers (below).

## Residual flags (owner spot-check cluster)

- ⚑1 **FB▼5s net rotation sign** — engine net-positive (+10.5% team via one extra full
  burst per fight); the real-game sign is measurement-gated (isabel's standing flag).
  /sim-battery A/B (block removed) + a mihara focus recording before her board number is
  trusted.
- ⚑2 **Cast-time simultaneity** — the 266.4% rider's cast-2 onset (same-cast arming via
  SLOTS dispatch) and the same-cast S2 ATK buff feeding the same-cast nuke: both
  kit-ambiguous, both landed identically by driver and blind sides; one popup read of her
  2nd-cast nuke settles both.
