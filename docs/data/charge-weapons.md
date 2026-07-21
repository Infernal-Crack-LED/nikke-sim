# Charge weapons (SR/RL) — charge speed, cycles, and swaps

Detail doc for [game-mechanics.md](game-mechanics.md) §4. Engine: the charge block of the
per-frame loop in `src/engine/sim.ts`.

Primary sources:
- Decoded game tables: https://github.com/rcasdzxc/SD (CharacterShotTable,
  CharacterSkillTable — StatChargeTime semantics)
- Reference sim: https://github.com/d34d633f/nikke-einkk (frame-quantization +
  `NikkeFullChargeMode`, `timeDataToFrame`)
- Community verification: https://nikke.gg/overload-gear-priority/ (Alice breakpoints),
  https://lootandwaifus.com/character/alice-nikke/ ,
  https://vortexgaming.io/en/postdetail/610208 (auto-vs-manual CS overhead),
  https://ore-game.com/nikke/post/verify-charge-damage/ (charge bucket math)
- MEASURED: docs/"helm 2 6 mag rotations.mov" frame analysis (SR cycle)

## 1. Charge time formula — SUBTRACTIVE

```
effective_charge_time = base_charge_time × (1 − ΣChargeSpeed%)     [floor: 1 frame]
```

- The decoded stat is literally a negative % on charge TIME (`StatChargeTime −381` per
  Red Hood S1 stack = −3.81% time) [SD tables]. It is NOT `base/(1+CS)` — the divisive
  form underestimates fire rate badly at high CS.
- **Frame quantization** at 60fps: `frames = max(1, round(base_frames × (1 − CS)))`
  [einkk `timeDataToFrame`]. This creates the community-documented BREAKPOINTS: Alice
  (90f base) needs ~99% CS for a 1-frame charge; at 92% she does not reach it
  [nikke.gg overload guide]. Roughly 1.11% CS per frame for a 1.5s weapon, 1.67% for 1.0s.
- **Hard cap at +100%** (charge time can't go below the floor). Excess is wasted EXCEPT
  for explicit kit conversions — Red Hood S1 converts excess-over-100% to Charge Damage at
  ×2.4 (`ChargeTimeChangetoDamage 24000`) [SD tables;
  https://nikke.gg/red-hood-guide/ cites the 1:2.4 ratio].
- CS buffs are evaluated live: a buff landing mid-charge shortens the remaining charge
  (engine recomputes `needed` per frame).
- ⚠ Modeling rule (2026-07-13): CS values taken from KIT TEXT keep in-game semantics under
  this formula; hand-AVERAGED values fitted under the old divisive engine had to be
  re-expressed (cinderella ramp 80→45 — SUPERSEDED 2026-07-21, the +45 proxy was REMOVED; her
  cadence is now the whole-magazine dump, §2a; anis-star fixed-0.7s 42.86→30) to preserve their
  validated real cadences.

## 2. Fire cycle — autofire vs release-fired (user taxonomy, 2026-07-13)

Charge weapons split into two firing styles (user knowledge):
- **Autofiring** (newer mechanic; known: liberalio, anis: star, nayuta-in-burst): holding
  fire auto-releases each shot with only a BAKED frame delay between shots — no release
  latency. On auto these run at their bare cadence.
- **Release-fired** ("old style", most charge units): the shot fires on trigger RELEASE.
  On auto the AI adds a ~21-22 frame release latency after full charge — measured
  INDEPENDENTLY on two units of different classes:
  - Helm (SR): 1.37s cycle = 60f charge + **22f** (docs/"helm 2 6 mag rotations.mov") —
    historically labeled "bolt recovery" in the engine (`SR_BOLT_RECOVERY_FRAMES`).
  - Maiden:IR (RL): 81f effective cycle = 60f charge + **21f** average hold, releasing at
    156-212% displayed overcharge with jitter (docs/probes/"maiden solo neutral target
    probe.MP4"; `charFixes.chargeFrames 81`).
  The matching 21≈22f strongly suggests ONE mechanism: auto release latency on
  release-fired weapons, not an SR-specific bolt cycle.

Engine state (updated after user testing, 2026-07-13): the 22f latency applies to ALL
SR + RL by default — the autofire system is SPARSE (user-tested old-style: diesel-WS,
mint, prika, ada, velvet, laplace, a2, raven, rapunzel, noise, crust, anchor-IM, arcana,
and trina — the last measured directly at 22 frames between shots, matching the default
exactly). Exempt via `charFixes.noBoltRecovery`: neon-VE (user-tested), anis: star,
liberalio (autofire), cinderella (whole-magazine dump, §2a), SWHA (DB
cycle-inclusive), SBS (user-CONFIRMED autofire; her 150% charge cap also matches the DB
chargeMultiplier column, validating the per-unit values), plus all weapon-swap states.
Vesti: Tactical Upgrade is a custom post-charge volley (4 rockets over ~1s). The only
unit still unclassified is tia (open-questions U12); any recording's charge meter answers
it instantly (steady ~100% releases = autofire; 150%+ readings = release-fired).
- Reload begins immediately after the final shot (latency doesn't delay it); matches
  einkk's spot_first/last_delay structure (12f + 12f) within a frame.
- **Partial charge** damage interpolates linearly:
  `mult = 1 + (fullChargeMult − 1 + chargeDamageBuffs) × chargeFraction` [einkk;
  ore-game]. Moot on auto (see §4) but matters for full-charge-gated procs.

## 2a. Whole-magazine dump (cinderella) — one charge feeds the whole mag

`cinderella` (RL/Electric, "cindy") does NOT charge per rocket. She charges ONCE per magazine,
then autofires the entire 24-round magazine at her datamined `rate_of_fire` WITHOUT recharging;
on empty she reloads and charges once again. MEASURED 2026-07-21 by reading her on-screen ammo
counter frame-by-frame (`docs/probes/720-kit-audit/cindy solo neutral.MP4`):
- charge ≈ 1.0s (datamined `charge_time 100`), then 24 rockets at ≈3/s (datamined `rate_of_fire
  180` = 20f/rocket), then reload ≈2.1s (datamined `reload_time 200`), then re-charge.
- Full cycle ≈ 10.75s / 24 rockets → **≈390 pulls / 180s** (≈2.2/s sustained). The old
  per-rocket-charge model fired ≈300 (via a `chargeSpeedPct +45` proxy), which under-fired her —
  the cause of her COLD 0.937 board reading.

Modeled by the opt-in engine primitive **`charFixes.magDumpRof`** (`sim.ts`): after the first
charge completes the unit enters a "primed" state and fires one rocket every
`round(3600 / rate_of_fire)` frames while ammo remains; the reload-to-max clears "primed" so the
next magazine charges once again. Charge Speed shortens ONLY the once-per-mag prime charge, never
the dump cadence (the `rate_of_fire` is the fixed autofire rate). The flag is inert for every
other unit (regression byte-identical). Her `+45` chargeSpeedPct proxy and the old twin-rocket
`normalAttackPct +100` were both removed — see DECISIONS 2026-07-21 and her override note. The
"Charge Speed ▲100%, Removed upon reloading to max" kit text is the game's description of exactly
this autofire-after-first-charge behaviour, not a per-rocket charge-speed buff.

## 3. Charge damage bucket

`charge = chargeMult + chargeMult × Σ(chargeDamageMultPct)/100 + Σ(chargeDamagePct)/100`

- Full-charge multiplier is per-unit weapon data (SR typically 250%, Alice 350%, RL
  varies) [SD CharacterShotTable].
- Ordinary Charge Damage ▲ adds flat points (250% + 80 → ×3.3) [ore-game].
- `chargeDamageMultPct`-class buffs (Helm treasure burst, collection items) multiply BASE
  charge damage instead [our A10 validation; nikke.gg Helm notes].

## 4. Auto-play charge behavior

- **Auto ALWAYS waits for full charge** — no early or partial releases of the weapon shot
  [einkk `NikkeFullChargeMode.always`; user-observed exceptions ~3/fight from boss
  interruptions]. Release-fired weapons then fire ~21-22f after charge completes (§2);
  full-charge-gated procs fire normally (Maiden's popup reads confirmed per-pull procs at
  full value — her old ×0.68 was cadence, see [auto-play.md](auto-play.md) §2a).
- Auto carries a small CS overhead vs manual (~12% CS needed where manual needs 8% for the
  same shot count) [vortexgaming 610208]. Not separately modeled (inside
  AUTO_GEN_EFFICIENCY/board calibration).
- Manual tap-spam ("quickfire", ~0.25s interval min-charge) reaches ~2.1× the DPS of
  full-charging for pure multiplier purposes [ore-game] — irrelevant under scope lock,
  listed for completeness.

## 5. Weapon swaps ("Changes the weapon in use")

Swap states (Red Hood Red Wolf, SWHA Fully Active, Nayuta SR mode, eunhwa-TU railgun,
cindy-CW Snipe, maxwell burst) replace the unit's shot data. Two decoded findings:

- Swaps can be **fire-rate-gated, not charge-gated**: Red Wolf (skill 1470610 → weapon
  1047002) fires at `rate_of_fire 200` rpm = exactly 1 shot/18 frames (0.3s), regardless
  of charge speed; 51.46%/shot, 250% full charge, innate pierce, max_ammo 99 (no reload
  for the 10s window) [SD tables; einkk DOWN_Charge implementation]. ≈33 shots/window.
- Engine rule: swaps with an explicit cadence are **CS-immune** (their cycles were either
  decoded as fire-rate-gated or hand-measured as wall-clock cycles).
- Red Wolf's S1 conversion at the CS cap: 100.8% (swap) + 3.81%×10 stacks → excess ≈39% →
  +93% Charge Damage; modeled as +90 ⚑ (stack ramp averaged).
