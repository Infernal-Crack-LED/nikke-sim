# snow-white — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-25). Owner's short-form review: what the sim
> implements alongside the real kit, the verdict, and the lines worth a human spot-check.

**Unit:** Snow White (`snow-white`, nickname `sw`) — Iron · AR · Attacker · Burst III · 40s CD · ammo 60 ·
reloadFrames 111 · chargeFrames 0 · hitsPerShot 1 · normalMult 14.71 / coreMult 200 · critRate 15 / critDamage 150 ·
Pilgrim/Overspec.
**P0:** the **BASE** unit — a COMPLETELY DIFFERENT unit from `snow-white-heavy-arms` (SR/Water) — no heavy-arms data
cited or reused.

**Verdict:** 🟢 **GO** · faithfulness **1.0** (every kit line FAITHFUL; 0 real gotchas — the 4 judge gotchas are all
documented FIDELITY residuals, 2 med mechanism divergences for owner spot-check + 2 low inert-at-scope gaps) ·
**cross-family corroborated** — S2b `claude-fable-5`, S5/S6/S7 `claude-opus-4-8`; driver Qwen. Both blind
re-derivations independently reproduced the driver's load-bearing structure — most importantly both INDEPENDENTLY
derived the **×10 full-charge MULTIPLIER (4995%)** from "Full Charge Damage 1000% of damage", avoiding the
additive-1499.5% trap the S2b review ranked #1. NOTE: snow-white is `MODEL_ONLY` / `tuned: false` (DPS-chart FILLER
control; evidence "N4 confounded: 1.11"; board mean 0.925 COLD, range 0.89–0.99 over 4 control comps); the gauntlet
certifies STRUCTURE only and deliberately leaves `tier: MODEL_ONLY` / `tuned: false` untouched (there is no GAUNTLET
tier). **The gauntlet made NO encoding change** — the shipped override (owner-ruled 2026-07-20, footage-confirmed) is
faithful as-is; S3 appended only the gauntlet provenance marker + a residual summary to the `note`.

---

## 1. Real kit (data/characters.json — ground truth, levels 10/10/10)

The normalized `skills` prose is the SSOT the sim reads. Iron vs the Fire control boss = **no elemental advantage**
(Iron beats Electric), so her damage rides on the charge multiplier, FB major, core, and her self-buffed crit.

- **S1 "Determination"**
  - ■ Activates when normal attack hits **30** time(s). Affects the target(s): **Deals 82.8% of final ATK as additional damage.**
  - ■ Activates when normal attack hits **30** time(s). Affects self: **ATK ▲ 8.28% for 5 sec.**
- **S2 "Seven Dwarves: V&VI"**
  - ■ Affects enemies within range: **Deals 144.73% of final ATK as damage.** (NO activation clause.)
  - ■ Activates when using this skill during Full Burst. Affects self: **Critical Rate ▲ 26.1% for 10 sec.**
- **Burst "Seven Dwarves: I"**
  - ■ Affects self. Change the weapon in use: Charge Time 5 sec; **Damage 499.5% of final ATK; Full Charge Damage 1000%
    of damage**; Max Ammunition Capacity 1 round(s); Additional Effect: **Pierce**.

---

## 2. What the code does (the faithful override, line by line)

snow-white is a sustained-fire AR carry: continuous AR fire plus a per-30-hits rider + self ATK buff, an interval AoE
skill, a per-Full-Burst crit buff, and a once-per-burst **delayed full-charge cannon**. Owner-ruled encoding (kit-audit
Phase C 2026-07-20; sw.MP4 footage pass). Measured in the control comp (liter B1 / crown B2 / sw B3 / helm B3, boss Fire,
focus sw): 1743 sw shots / 6 sw burstCast / 11 fullBurstStart over 180s.

- **SW1 — S1 every-30-hits rider 82.8% (target)** `hitCount count:30 → enemy → flatDamage 82.8`. Fires **58× =
  floor(1743 shots / 30)** (hitsPerShot 1 → hits==shots); bucket 'skill', crit-on default, no core, rangeApplied false.
  **SW1** discriminates cadence (burstCast-gated → 6 ≠ 58) and magnitude (82.8, not the lvl-1 51.75).
- **SW2 — S1 every-30-hits self ATK ▲8.28%/5s** `hitCount count:30 → self → buff atkPct 8.28 (5s)`. Self-scoped
  (casterIdx==targetIdx==2), 300-frame expiry, shares the hitCount-30 cadence (58×); near-permanent uptime while firing
  (proc ~2.5s < 5s expiry). **SW2** discriminates target (all-allies → holders > 1) — rules out the permanent-passive
  shortcut the S2b review flagged.
- **SW3 — S2 144.73% "enemies within range"** `interval sec:15 → enemy → flatDamage 144.73`. **OWNER-RULED 15s internal
  cooldown** (replaces the prior invented per-swap-shot trigger); **11 procs at exact 15s multiples** (15,30,…,165 — first
  fire t=CD); bucket 'skill'. The 11 procs happen to land in FB windows by timing coincidence (FB cycle ≈15s) → fbMajor
  true, but the trigger is interval (proc TIMES are 15-multiples, independent of the FB-entry times 5.73,23.4,…). **SW3**
  discriminates trigger (fullBurstEnter → FB-entry times ≠ 15-multiples; burstCast → 6 ≠ 11). ⚑ first-fire phase + FB-scoping
  unmeasured (residual e).
- **SW4 — S2 Crit Rate ▲26.1%/10s on Full Burst** `fullBurstEnter → self → buff critRatePct 26.1 (10s)`. **OWNER-RULED
  fullBurstEnter** (replaces the prior per-swap-shot+fbGate encoding); generic critRatePct (NOT critRateNormalPct), self,
  600-frame; fires **11× == fullBurstStart count, at the FB-entry frames EXACTLY** (critFrames==fbFrames). **SW4**
  discriminates trigger (burstCast → 6 ≠ 11; inFb-gated interval cast → S2-cast frames ≠ FB-entry frames — the S2b nearest-wrong).
- **SW5 — Burst charge cannon** `burstCast → enemy → flatDamage 499.5, charge:true, chargeMultPct:1000 (→×10), core:true,
pierce:true, rangeOk:true, delaySec:5.5`. **OWNER-RULED delayed full-charge hit, NOT a weaponSwap** — she KEEPS FIRING her
  AR through the ~5s charge (footage gap #4; the swap dropped for a delaySec 5.5 charge-bucket hit). **6 instances ==
  burstCast**; bucket 'burst'; **mult.charge = 10** (full-charge coefficient **4995% = 499.5 × 10**, footage-confirmed — the
  six nuke popups sit ~3-4× above any 1499.5% additive class); fbMajorApplied + inFullBurst true (delayed landing inside FB);
  coreEligible true; rangeApplied 1/6 (rangeOk, boss-range/timing dependent). **SW5** discriminates magnitude (no-charge →
  charge 1 ≠ 10), delay (instant/undelayed → fbMajor false ≠ true), and core/range eligibility.

---

## 3. Residuals for owner spot-check (NOT faithfulness failures)

The judge graded faithfulness **1.0** with these documented residuals (all flagged in the override `note`/`caveats`):

- **(a) SW4 trigger — `fullBurstEnter` vs prose-literal inFb-gated interval cast (med).** Owner-ruled fullBurstEnter
  (2026-07-20); measured critFrames==fbFrames; **BOTH** blind roles (fable S2b + opus S6) independently read the prose-literal
  inFb-gate. **Spot-check on sw.MP4:** does the 26.1% crit buff appear at the exact FB-entry frame (⇒ fullBurstEnter, driver
  correct) or offset to the ~15s in-FB S2-cast frame (⇒ inFb-gated interval, blinds correct)? Magnitudes are unaffected; only
  trigger timing / uptime edge cases differ.
- **(b) SW5 mechanism — delayed-flatDamage vs prose-literal weaponSwap (med).** Owner-ruled from footage (AR keeps firing
  through the charge); converges on ×10 / burstCast / pierce-scoped / core / FB-by-landing; both blinds read the prose-literal
  weaponSwap. **Spot-check:** confirm from footage that her AR fire is uninterrupted during the burst charge (validates
  delayed-flatDamage / no swap-and-suppress).
- **(c) SW5 Normal-Attack-Damage fidelity gap (low).** The delayed flatDamage does NOT receive Normal Attack Damage ▲ (the
  swap-shot path's normalScale). Inert at scope — no control-comp ally grants it and snow-white doesn't self-grant. **Revisit**
  if a Normal-Attack-Damage buffer joins her comp (the cannon would be under-credited).
- **(d) SW5 pierce core+body double-hit unmodeled (low).** PIERCE_CORE_DOUBLE=false engine-wide (multipart-scope only); inert
  on the partless scope-lock boss. Measurement-gated engine primitive; revisit only with a cored/multi-part target.
- **(e) SW3 first-fire phase ⚑ (t=15 vs t=0 = ~1 proc) + FB-scoping ⚑.** Unmeasured. **Recipe:** scan sw.MP4 for 144.73%-class
  popups — appearance OUTSIDE FB windows falsifies FB-scoping; the first-popup time pins the phase.

---

## 4. Cross-family convergence

- **S2b (claude-fable-5, pre-op adversarial test-faithfulness):** CONVERGED on all 5 lines (all FAITHFUL; load-bearing set = all
  5). leakDetected null (noted the harness schema comments reference snow-white-heavy-arms but correctly identified it as a
  DIFFERENT unit by non-negotiable #1; nothing target-specific leaked). Ranked the ×10 multiplier as the #1 magnitude trap
  (driver agrees) and surfaced the SW4 inFb-gate + SW5 weaponSwap nearest-wrong readings (both owner-ruled otherwise).
- **S5 (claude-opus-4-8, blind test-writer):** intent converges (rider 82.8 hitCount-30 enemy; ATK 8.28 self; 144.73 interval
  enemy; critRatePct 26.1 generic self FB-gated; cannon 499.5 ×10 charge-bucket burstCast). Literal API mismatches (`ov.blocks`
  accessor on a slot-keyed override, `.total` vs `totalDamage`, bucket 'charge' vs 'burst', `fbGate`/`weaponSwap` models)
  classified RECON_ERROR by the judge (schema-blindness, not divergence).
- **S6 (claude-opus-4-8, blind override-writer):** INDEPENDENTLY derived the ×10 (chargeMultPct 1000) + 82.8 / 8.28 / 144.73 /
  26.1 + the pierce-scoped burstCast cannon. Diverged on the SW4 trigger (`fbGate:"inFb"` interval) and the SW5 mechanism
  (`weaponSwap`) — both prose-literal, both owner-ruled otherwise by the driver; converges on every load-bearing magnitude.
- **S7 (claude-opus-4-8, binding judge):** **GO**, faithfulness **1.0**, discriminationOk **true**, convergence **GREEN**.
  4 gotchas, all FIDELITY + documentedByDriver (the 2 med mechanism divergences (a)/(b) for owner spot-check + the 2 low
  inert-at-scope gaps (c)/(d)). No REAL-GOTCHA.
- **Same-model caveat:** S5/S6/S7 are all `claude-opus-4-8` (S2b is `fable-5`); convergence proves stability more than independent
  correctness — hence the §3 owner spot-checks. The two mechanism divergences (a)/(b) rest on the 2026-07-20 owner footage ruling
  (the independent ground truth), not the sim measurement (facts (e)/(f) measure the SHIPPED OVERRIDE, not the game).

---

## 5. Board status

`board-read` (note-only override change ⇒ unchanged before/after): **rank 20, 4 teams, mean 0.925 COLD, range 0.89–0.99,
MAD 0.075**, recordings 0.89 / 0.90 / 0.92 / 0.99. DPS-chart FILLER control (MODEL_ONLY; evidence "N4 confounded: 1.11"); the
gauntlet made no numerical change.

## 6. Artifacts

- Override: `src/skills/overrides/snow-white.json` (note += gauntlet marker + residual summary; structure unchanged).
- Driver test: `scripts/tests/units/snow-white.test.ts` (22 assertions, 22/22 GREEN; S2d `reviews/snow-white.verify.txt`).
- S2b review: `reviews/snow-white.test-review.json` · cross-family packets/results: `cross-family/snow-white/`.
- Blind: `blind/snow-white.{test.ts,test-spec.json,override.json,audit.json}`.
- Judge verdict: `results/snow-white.json`.
