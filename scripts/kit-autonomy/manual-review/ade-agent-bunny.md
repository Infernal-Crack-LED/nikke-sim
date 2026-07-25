# ade-agent-bunny — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-24). The owner's short-form review: what the
> sim implements alongside the real kit, the driver's executive summary, verdict, and the lines worth a human
> spot-check. EXACT SLUG: `ade-agent-bunny` (Ade: Agent Bunny) — the SR/Iron variant (aka "aab"/"bade"), NOT
> `ade` (AR/Wind).

**Unit:** Ade: Agent Bunny (`ade-agent-bunny`) — Iron · SR · Supporter · Burst II · 20s CD · ammo 6 ·
reloadFrames 141 · chargeFrames 60 · hitsPerShot 1 · normalAttackMultiplier 69.04 · chargeMultiplier 250.

**Verdict:** 🟢 **GO (cross-family corroborated)** · faithfulness **1.0** (6 FAITHFUL, 2 DOCUMENTED_GAP) ·
**0 silent drops, 0 real gotchas** · S2b claude-fable-5, S5/S6/S7 claude-opus-5 (all cross-family) converged on
every load-bearing line. The binding judge (opus) adjudicated all 22 pristine-blind-test REDs as RECON_ERROR
(test artifacts) and ruled the single encoding diff (Pierce step-gate) **in the driver's favour**.

---

## 1. Real kit (data/characters.json — ground truth, level-10 values)

- **S1 (Agent's Gaze)** ■ Activates when landing Full Charge attacks on targets within the effective range.
  Affects all allies.
  - ATK ▲ 15.2% of the skill user's ATK for 5 sec.   (caster-sourced ⇒ flat add of 15.2% of ADE's ATK)
  - ■ Activates when attacking with Full Charge. Affects self.
  - Spy Lens: Minimum Effective Range ▲ 4.44%, stacks up to 10 time(s) and lasts for 5 sec.
- **S2 (Agent's Movement)** ■ Activates when landing a Full Charge attack on a target within the effective range.
  Affects all allies.
  - Pierce Damage ▲ 18.36% for 5 sec.
  - ■ Activates only if Spy Lens is at max stacks. Affects self.
  - Gains Pierce. This effect is continuous.
  - ATK ▲ 16% continuously.
- **Burst (Cutting-Edge Agent Equipment)** ■ Affects self.
  - Minimum Effective Range ▲ 55.56% for 10 sec.
  - ■ Affects all allies.
  - Attack Damage ▲ 55.04% for 10 sec.
  - Pierce Damage ▲ 10.13% for 10 sec.

---

## 2. What the code does (override + blind re-derivations)

**skill1** — `shotFired` → `allies` → `casterAtkPct 15.2` (5s). `shotFired` is the sanctioned proxy for "landing
Full Charge within effective range": an SR always fires full charge (chargeFrames 60) and the engine force-sets
noRange, so the clause is satisfied on every shot (⚑1). `casterAtkPct` resolves to a FLAT add of 15.2% of ADE's
staticAtk (≈15159.57 in the test fixture), applied identically to all four allies — NOT target-scaled `atkPct`.
The Spy Lens Minimum-Effective-Range STAT is UNMODELED (no range StatKey; the engine's range path is binary and
takes no kit modifier), but its STACK COUNT is load-bearing and is carried by the S2 step-gate below.

**skill2** — two blocks:
- `shotFired` → `allies` → `pierceDamagePct 18.36` (5s). Same full-charge proxy. `pierceDamagePct` feeds the
  Damage-Up bucket ONLY for Pierce-tagged hits, so on a team with no other Pierce hitter this is inert on the three
  non-Pierce teammates and moves only ade herself once she gains Pierce (asserted byte-identical in the test).
- `hitCount` count 10 → `self` → `atkPct 16` (NO durationSec ⇒ continuous) + `gainPierce` (NO durationSec ⇒
  pierceUntilFrame→∞). This is the "Spy Lens at max stacks" gate: Spy Lens gains 1 stack per full-charge SR hit, so
  the 10th hit (≈ frame 955 / 15.9s incl. one reload) reaches max and the buff + Pierce tag turn on continuously.
  `gainPierce` (added 2026-07-20 specifically for this unit) is the step-gateable Pierce primitive — it replaces an
  always-on-from-t=0 top-level `hasPierce` flag, which a boolean cannot step-gate. **The override carries NO
  top-level `hasPierce`.** Pierce + the 16% ATK go live only after the 10th shot (~9% of a 180s fight is the
  pre-ramp window the old always-on encoding over-credited).

**burst** — `burstCast` → `allies` → `attackDamagePct 55.04` (10s) + `pierceDamagePct 10.13` (10s). Keyed
`burstCast` (fires only on rotations ade casts Burst II), NOT `fullBurstEnter` — the canonical burst-cast trap the
S2b reviewer named as its top shared-prior-misread candidate. The self Minimum-Effective-Range ▲55.56% line is
UNMODELED (inert range stat).

**Cross-family re-derivations:** S6 blind (opus, leakDetected:null) reproduced 3 of the 4 damage-bearing blocks
BYTE-IDENTICALLY (S1 casterAtkPct 15.2/5s/allies; S2 pierceDamagePct 18.36/5s/allies; burst 55.04 + 10.13/10s/
allies) and BOTH unmodeled lines verbatim, from prose alone. It independently derived the Spy-Lens stack-count gate
(as a `spyLens` resource pool + `resourceGate{min:10}` — encoding-equivalent to the driver's `hitCount:10`) and
independently flagged the refresh-all-vs-per-stack-expiry ambiguity as "the largest uncertainty in the override"
(corroborating ⚑2). The one place it diverged — Pierce as an unconditional top-level `hasPierce:true` — its OWN
caveat admits "over-credits her benefit from her S2/burst Pierce Damage ▲ buffs early… the ramp cannot be
expressed," on the mistaken belief no resource-gated Pierce form existed. `gainPierce` is that form; the driver is
strictly more faithful here.

---

## 3. Verdict & cross-family convergence

🟢 **GO**, faithfulness **1.0** = 6 FAITHFUL / (8 total − 2 legitimately-unmodelable). Binding judge
(claude-opus-5): 0 silent drops, 0 real gotchas, fire-rate check PASS, discrimination check PASS (every FAITHFUL
line is GREEN vs shipped AND RED vs its nearest-wrong counterfactual, including the fullBurstEnter-vs-burstCast
trap). S2b (fable) converged on all lines and its REQUIRED strengthening — both Pierce buffs provably inert on
non-Pierce teammates — was adopted (test A3/B3 INERTNESS assertions).

**The pristine blind test (S5) went 2/22/3 vs the shipped override — ALL 22 REDs adjudicated RECON_ERROR**, each a
blind-writer assumption unverifiable from the de-contaminated packet: (1) contested-B2 fixture vacuity (ade won 0
casts in liter/crown/ade/helm — the blind writer pre-anticipated this and sanctioned a rebuild); (2) `casterAtkPct`
event value is the flat-resolved ≈15159.57, not the raw 15.2 the blind test filtered for; (3) override schema is
`skill1/skill2/burst`, not the flat `blocks` the blind test read; (4) Pierce is a step-gated `gainPierce` effect,
not the top-level `hasPierce` flag the blind test asserted (this RED points the WRONG way — the driver is more
faithful); (5) harness `totals()` is a per-slug map; (6) `CompOptions.overrides` is a per-slug map. With those six
assumptions corrected and assertion INTENT unchanged (pristine preserved at `blind/ade-agent-bunny.test.ts`, adapted
copy at `blind/ade-agent-bunny.adapted.test.ts`), the blind test goes **24 passed / 3 skipped / 0 failed** vs the
shipped override — independent corroboration of the override (the 3 skips = the 2 unmodelable Min-Eff-Range GAPs +
1 conservative engine-gated Pierce skip the driver's A3/A4 already covers).

---

## 4. Lines worth a human spot-check (the ⚑ flags)

All three are UNMEASURED estimates with a measurement recipe; none is load-bearing for the GO (each <~1% total
impact on the test fixture).

- **⚑1 (MEDIUM) — shotFired full-charge proxy.** Assumes every SR trigger pull is a landed full-charge hit in
  range. Exact in-sim (SR always full-charges; noRange force-set); divergence vs a real fight is bounded by
  uncharged/out-of-range shots (expected ≤5% on a stationary partless boss). Buff uptime is refresh-dominated (5s
  vs sub-second cadence), so even a 10% miss rate moves ally uptime <1%. **Recipe:** record a partless-boss run,
  count full-charge shot popups vs total popups, compare to the sim's shotFired count; >5% deviation reopens it.
- **⚑2 (HIGH) — Spy-Lens ramp shape.** (i) 10 stacks land on the 10th full charge, and (ii) the stack set refreshes
  wholesale rather than expiring per-stack at 5s. Under refresh-all (both families' reading) the gate opens at
  ~15.9s and never closes. Under strict per-stack expiry the gate would still open at the same shot (cadence ≪ 5s)
  and survive the 2.35s reload (< 5s) — so the two readings likely coincide in practice; divergence appears only if
  shot cadence ever exceeds 5s. Both families named this the dominant open question independently. **Recipe:**
  (a) confirm 10 stacks on the 10th charge via the stack icon vs shot counter; (b) force a >5s firing gap and watch
  whether the display drops to 0 (refresh-all) or decays stepwise (per-stack).
- **⚑3 (LOW) — SR cadence tuple.** ammo 6 / reloadFrames 141 / chargeFrames 60 / hitsPerShot 1 drive the
  105-shot / 10th-shot-at-frame-955 timeline (datamine defaults). A ±10% error shifts the gate open time by ~±1.6s
  ≈ ±0.9% of the fight. **Recipe:** time 10 full charges from t0 on a recording and compare to 15.9s.

---

## 5. Residual risk

The two Min-Eff-Range lines (S1 Spy Lens 4.44%×10, burst 55.56%) are genuinely unmodelable — no range StatKey exists
— and are disclosed verbatim in `unmodeled`; the load-bearing half of the Spy Lens line (the stack COUNT) IS
modeled. ⚑1/⚑2 are estimated <1% total-damage impact on this fixture and both are measurable by the recipes above.
The override certifies STRUCTURE (faithfulness), not magnitudes — it stays tier MODEL_ONLY until a real fight
validates its numbers (a focus A/B is batched).
