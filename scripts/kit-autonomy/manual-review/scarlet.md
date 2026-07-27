# scarlet — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-25). Owner's short-form review: what the sim
> implements alongside the real kit, the verdict, and the lines worth a human spot-check.

**Unit:** Scarlet (`scarlet`) — Electric · AR · Attacker · Burst III · 40s CD · ammo 20 · reloadFrames 159 ·
chargeFrames 0 · hitsPerShot 1 · normalMult 27.08 / coreMult 200 · burstGaugePerShot 0.45 · critRate 15 /
critDamage 150 · Pilgrim. **BASE** — distinct from variant `scarlet-black-shadow` (RL/B3); never conflate.

**Verdict:** 🟢 **GO** · faithfulness **1.0** (6/6 kit lines: 3 FAITHFUL + 3 DOCUMENTED-GAP; 0 real gotchas
surviving grading — the judge's 2 gotchas are both documented ⚑ gate proxies) · **cross-family corroborated** —
S2b `claude-fable-5`, S5/S6/S7 `claude-opus-5`; driver Qwen. STRUCTURE is certified, magnitudes are datamined
(level-10 prose), not measured. Scarlet stays `tier: MODEL_ONLY` / `tuned: false` / `board: null` in kit-status
(the gauntlet certifies STRUCTURE and deliberately leaves `tier`/`tuned` untouched; there is no GAUNTLET tier).
**The gauntlet made ONE small encoding change** vs the parser baseline: it added `rampSec: 56` to the S2 Critical
Damage buff as an equal-integral proxy for the HP<60% gate step-on at ~28s (the baseline modeled it as a flat
frame-0 passive). The note/unmodeled/caveats documentation was rewritten from the HYPOTHESIS banner. Net damage
delta ≈ **−0.18%** (the ramp removes a little early-fight crit-damage over-credit).

---

## 1. Real kit (data/characters.json — ground truth, levels 10/10/10)

The normalized `skills` prose is the SSOT the sim reads. The kit is HP-threshold-driven: Scarlet wounds herself to
unlock her own crit buffs.

- **S1 (Blood for Blood)** — ■ Activates after landing **10 normal attacks** → self: **ATK ▲23.15%**, stacks up to
  **5** times, lasts **5 sec**. ■ (per proc) **Current HP ▼4.01%** (the self-drain that enables the gates below).
- **S2 (Zatoichi)** — ■ **30% chance when attacked** → deals **138.24% of final ATK** as additional damage. ■
  Activates when **HP falls below 60%** → self: **Critical Damage ▲6.61%**, continuously.
- **Burst (Scarlet Flash)** — ■ Activates when **HP falls below 50%** → self: **Critical Rate ▲19.57% for 10 sec**.
  ■ Affects all enemies: **849.15% of final ATK as Burst Skill damage**.

---

## 2. What the code does (the faithful override, line by line)

- **S1 ATK ▲23.15% (H1, FAITHFUL)** `hitCount:10 → self → buff atkPct 23.15, durationSec 5, maxStacks 5`. Generic
  self ATK (the prose scopes only the TRIGGER to normal attacks, not the buff). The engine derives the stack level
  from cadence; at the datamined cadence (~4.6 rounds/s) the 5s window bridges the 159f reload and the pool sits
  5/5 permanently (= +115.75% ATK steady state — see ⚑1). **H1** pins value 23.15, self, expiresFrame−frame == 300f,
  maxStacks 5 + observed stacks 5, procs == floor(shots/10); level-1 17.48 counterfactual — RED.
- **S1 Current HP ▼4.01% (H2, DOCUMENTED-GAP)** `unmodeled.skill1` verbatim. The engine has NO HP pool and the boss
  deals no damage, so the drain has no damage effect of its own; its only in-sim consequence is the two HP
  thresholds. NOT a silent drop: it is pinned verbatim and its derived crossing times (×0.9599/proc ⇒ HP<60% at 13
  procs ≈28s, HP<50% at 17 ≈37s, compounding reading) feed the two gate proxies below.
- **S2 30% when attacked → 138.24% (H3, DOCUMENTED-GAP)** `unmodeled.skill2` verbatim (both sentences). Sanctioned
  skip: "when this unit is hit" never fires in-sim (the v1 boss has no attack cadence). The cross-family reviewers
  pre-registered the "when attacked → when attackING" misread as the highest-magnitude trap in this kit; it did NOT
  land — **H3** also asserts `scarletDamage(base,'skill2').length === 0` (no smuggled interval channel). ⚑3 recipe:
  focus-video popup count → measured proc cadence.
- **S2 HP<60% → Crit Dmg ▲6.61% continuous (H4, DOCUMENTED-GAP)** `passive → self → buff critDamagePct 6.61,
rampSec 56`. The buff itself (stat, magnitude, self scope, permanence) is faithful; only the HP<60% ACTIVATION is
  a ⚑ proxy — the engine has no HP trigger, so `rampSec:56` is the equal-integral proxy for a step-on at ~28s (a
  linear 0→full ramp over 2T integrates to a step at T). Unscoped (the prose says "continuously", no normal-attack
  qualifier), so it correctly lifts her burst nuke's crit too. **H4** pins value 6.61, permanent (no expiry), self,
  frame-0, rampSec 56; level-1 4.13 and critRatePct-miskey counterfactuals — RED.
- **Burst HP<50% → Crit Rate ▲19.57%/10s (H5, DOCUMENTED-GAP)** `burstCast → self → buff critRatePct 19.57,
durationSec 10`, deliberately **UNGATED**: rampSec is unusable on a per-cast 10s window (its clock would ramp
  inside the window), so the buff is full-value on every cast and pre-~37s casts are an over-credit ⚑ (caveat 4).
  `burstCast` (her OWN cast), NOT `fullBurstEnter` — controlComp carries helm as co-B3, so team FBs (11) ≠ her
  casts (6). Unscoped (generic critRatePct, not critRateNormalPct), so it lifts the 849% nuke. **H5** pins value
  19.57, 10s, self, one apply per cast; level-1 12.23 and fullBurstEnter (over-fires on helm's rotations)
  counterfactuals — RED.
- **Burst 849.15% nuke (H6, FAITHFUL)** `burstCast → enemy → flatDamage atkPct 849.15`, block ordered AFTER the
  crit-rate buff (so a qualifying cast's nuke snapshots the +19.57%). Crit-eligible by default, no core (no "core
  strike" wording), FB-exempt **by timing** (the cast resolves before the FB window — fbMajorApplied=false verified
  in the shipped run; no explicit `noFb` flag needed). "Affects all enemies" collapses to the single boss (no
  phantom multi-target multiplication). **H6** pins one nuke per cast in the burst bucket, atkPct 849.15,
  fbMajorApplied false on every hit, crit-eligible; level-1 530.71 counterfactual — RED.

---

## 3. Handled forks (the judge's divergences — none is a REAL-GOTCHA)

The judge found **0 gotchas surviving grading** (the 2 it logged are both documented ⚑ gate proxies — see §4). The
one substantive cross-family disagreement was HOW to represent the two HP thresholds:

- **HP-gate modeling — resource-pool gate (fable S2b) vs rampSec/ungated proxy (opus S5 + S6, driver).** The fable
  S2b reviewer recommended modeling the gates literally via a `bloodProc` proc-count resource pool + `resourceGate`
  (step-on at proc 13/17); the driver PROTOTYPED this and it works (the engine HAS the primitive, proven on
  soda-twinkling-bunny — crit-dmg turns on at ~20s, burst crit-rate excludes the first burst). The opus S5 (blind
  test) and S6 (blind override) reviewers independently chose the always-on/ramped family — S6 used `rampSec:56`
  for S2 and ungated burst for the crit-rate. The driver adopted the opus-convergent proxy. **The judge upheld the
  choice** on two sound reasons — (1) 2/2 post-op opus reviewers converged on it, and (2) the proc-count threshold
  (13/17) is itself cadence-derived (⚑1) and ignores boss damage (real fights cross earlier), so a literal gate
  would encode false precision — while explicitly rejecting the driver's third reason ("the GO criterion needs S5
  green") as fit-to-the-grader. The choice survives on (1)+(2). The judge ranked the ungated burst gate as the #1
  owner residual (med) and noted the already-prototyped `resourceGate` is "strictly more expressive at the same
  evidence cost" for it, since unlike the S2 ramp it has a discrete footage-observable signature (does crit rate
  appear on burst #1?). Both encodings honor the SAME ⚑-derived ~28s/~37s crossing; they differ only in shape.
- **S5 blind test S1_LONG failure (HANDLED — RECON_ERROR, not a faithfulness signal).** The opus S5 blind test is
  mechanically RED on exactly ONE assertion vs the driver override: "the 5 sec window really expires between procs"
  asserts stretching the S1 ATK buff 5s→60s must raise the total. It fails because at the datamined cadence
  (~4.6 rounds/s ⇒ max inter-proc gap ~3.5s) the stack pool sits 5/5 permanently under the SSOT refresh-on-reapply
  rule, so 5s vs 60s is damage-identical. The judge classified this **RECON_ERROR**: the S1 atkPct block is
  byte-identical in the driver, the S6 blind override, and the parser baseline, so the assertion fails against
  EVERY faithful encoding of this unit — it is a blind-test non-vacuity over-specification keyed to a slower
  cadence, not a driver divergence. The other 19 S5 assertions pass; the 2 skips are the two correctly-unmodeled
  GAP lines.

---

## 4. Owner spot-check cluster (the residual — systematic-prior-prone lines)

1. **Burst HP<50% gate (judge gotcha #1, med).** The 19.57% crit-rate buff fires on EVERY cast, including the first
   (~12s, well above 50% HP) — bounded impact ~0.5–1% of her 180s total. The driver's own derivation puts the 50%
   crossing at ~37s. **Spot-check on a focus video:** does burst #1 crit at the boosted rate (orange crits at
   sheet+19.57%) or at the sheet rate? If burst #1 is un-buffed, the gate is real and the already-prototyped
   `resourceGate` at the ⚑-derived proc-17 threshold is the better landing (it has a discrete footage signature the
   proxy cannot express). Do NOT retune the drain or threshold to move the board.
2. **S2 ramp time-vs-damage integral (judge gotcha #2, low).** The `rampSec:56` equal-integral proxy holds in TIME
   but damage is concentrated in Full Burst windows (×1.5 major), not uniform in time, so the substitution is only
   approximate in delivered damage. Same resource-pool gate as #1 removes the shape approximation entirely. The
   magnitude 6.61 itself is kit-true and needs no measurement — only the crossing time does (HP bar + first
   crit-damage-tier popup from a focus video).
3. **⚑1 cadence tuple (the lever under everything).** A 20-ammo AR at 27.08% per shot is a non-standard fire-mode
   tell (~3× the usual AR per-shot value) + melee-slash flavor; the datamined pullsPerSec + reloadFrames 159 are
   unverified. The permanent 5/5 = +115.75% ATK steady state, the rampSec:56, and the burst over-credit ALL scale
   with true rounds/sec — a materially slower true cadence would let the ATK stacks lapse and stretch the gate
   crossings. **Spot-check:** read shots/sec off the ammo counter in a scarlet recording + the reload wall-clock.
4. **Compounding-vs-flat HP-drain reading.** "Current HP ▼4.01%" is read as compounding (×0.9599/proc ⇒ crossings
   at proc 13/17); a flat-of-max reading moves both crossings ~6s earlier (proc 10/13). The note states only the
   compounding branch. Footage HP bar resolves it.
5. **Same-model residual.** S5/S6/S7 are all one model family (claude-opus-5) and all converged on treating
   unobservable-HP gates as always-on/ramped; the fable S2b dissent (resource-pool gate) is the independent voice.
   The strongest sanity check is footage — when does her crit visibly turn on, and does burst #1 crit at the
   boosted rate? (items 1–4).

Magnitudes (23.15 / 6.61 / 19.57 / 849.15 / 138.24 / 4.01) are all kit-literal DATAMINED level-10 prose values; the
gate timings (~28s/~37s, rampSec 56) are ⚑-derived from the compounding self-drain. The gauntlet certified the
STRUCTURE around them, not the numbers. The gauntlet does NOT touch tuning (`tier: MODEL_ONLY` / `tuned: false`
preserved).

---

## 5. Cross-family provenance + convergence

- **S2b** (fable, pre-op adversarial): re-derived the full spec — S1 hitCount:10 atkPct 23.15/5stacks/5s FAITHFUL;
  S1 HP-drain + S2 HP<60% crit-dmg + burst HP<50% crit-rate flagged **FIX** (model the gates via a proc-count
  resource pool + resourceGate, not assumed-active); S2 30%-when-attacked MEASUREMENT-GATED (pre-flagged the
  "when attacked → when attacking" trap); burst 849.15 FAITHFUL (FB-exempt by timing, intra-block ordering trap
  named). `leakDetected: null`.
- **S5** (opus, blind test): SPEC converges fully (all lines FAITHFUL/GAP with the same fixture and the same
  shared-prior traps). The test FILE runs against the driver override at **19 passed / 1 failed / 2 skipped**; the
  1 failure is the S1_LONG RECON_ERROR (§3), the 2 skips are the two correctly-unmodeled GAP lines. `leakDetected:
null`.
- **S6** (opus, blind override): **independently reproduced the driver's encoding line-for-line** from prose alone —
  S1 hitCount:10 atkPct 23.15/5/5; S2 passive critDamagePct 6.61 **rampSec:56** (the same equal-integral derivation,
  T≈28s); burst burstCast critRatePct 19.57/10s ungated (rampSec unusable on a per-cast window); burst 849.15
  flatDamage (crit:true + noFb:true — redundant, the engine gives crit-eligible-by-default + FB-exempt-by-timing);
  unmodeled skill1 [HP drain] + skill2 [when-attacked]. ALL audit lines IMPLEMENTED. Its ⚑ flags (cadence, rampSec
  shape, ungated-burst over-credit, when-attacked) match the driver's. `leakDetected: null`.
- **S7** (opus, judge): **GO 1.0**, `discriminationOk: true` (every pin GREEN-vs-shipped + RED-under-counterfactual),
  fire-rate check passes (6 nukes = 6 casts; 11 team FBs vs 6 scarlet casts confirms burstCast keying; 111 S1 procs
  = floor(1116 shots/10)), S5 convergence RED on exactly 1 assertion classified **RECON_ERROR** (S1_LONG universal
  cadence artifact), **2 documented ⚑ gotchas** (burst gate med, S2 ramp low), full cross-family convergence on
  every magnitude/stat/scope/duration/trigger. Verdict BINDING.

## 6. Board / fit note (non-gating)

Base Scarlet is **not on the grading board** (`board: null`, `tier: MODEL_ONLY`) — only the variant
`scarlet-black-shadow` is graded (0.950 COLD). The one encoding change (+`rampSec:56` on S2) shifts Scarlet's
expected total ≈ **−0.18%** vs the parser baseline (the ramp removes a little early-fight crit-damage over-credit);
there is no board or regression-snapshot impact (the unit is ungraded and not in a pinned snapshot).
`validate-overrides scarlet` → valid; `scripts/tests/units/scarlet.test.ts` → 17/17 GREEN. Any future board
movement is fit-exposure for a separate localization thread, never a reason to revert. `tier: MODEL_ONLY` /
`tuned: false` are deliberately preserved (the gauntlet certifies STRUCTURE, not tuning; there is no GAUNTLET tier).
