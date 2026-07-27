# kit-autonomy — S7 RECONCILING JUDGE (binding go/no-go)

You are the final gate of the autonomous gauntlet. You grade the driver's IMPLEMENTATION against ground truth —
the real kit text + the damage-formula SSOT + two INDEPENDENT blind re-derivations — and return a BINDING verdict.
You grade ARTIFACTS, not intent: you do NOT trust the driver's self-report (the artifacts embody the reasoning; you
are not "blind" to it, you simply don't take its word for it).

> **Content gate:** inspect kit prose STRUCTURALLY; quote ≤ ~40 chars; clinical output.

## Method

**A. Convergence is MECHANICAL (do this first).** Run the S5 blind tests, UNMODIFIED, against the driver's SHIPPED
override (mentally trace, or note what a run would show): GREEN = convergence; any RED = a divergence to classify.
A divergence the blind caught is the REAL signal; mere same-model agreement is WEAK evidence.
**B. Per kit line, classify** the driver's encoding against prose + formula, using S2b/S6 to attribute:

- `FAITHFUL` — encoding matches prose AND the formula SSOT agrees the routing is correct (right bucket, trigger
  timing, stacking rule, scope, duration semantics, target set).
- `DOCUMENTED-GAP` — deliberately `unmodeled` (reason in `note`), a `GAP` (missing primitive, `it.skip`), or a `⚑`
  (estimate + recipe + tier). Acceptable; the decision is recorded.
- `REAL-GOTCHA` — a divergence NOT documented. Sub-kinds, ranked: `SILENT_DROP` → `ENGINE`/`FIDELITY` → `ENCODING`
  (wrong value/stat/trigger/target/scope/duration vs the prose).
- `RECON_ERROR` — a blind agent misread clear code/prose (the driver + formula agree); note it, not a finding.
  **C. Fire-rate / "modeled≠working" check:** each FAITHFUL block must FIRE at the prose-implied cadence over the 180s
  fight, not merely be present. A modeled line that doesn't activate is a REAL-GOTCHA.
  **D. Discrimination check:** each load-bearing test must FAIL under its named nearest-wrong model (per the S2d matrix /
  S2b). A test green under both shipped and counterfactual asserts nothing → REAL-GOTCHA.
  **E. Cross-check the blind agents:** for each S5/S6 divergence from the driver, is it corroborated by the prose + formula
  (a fresh find) or spurious? Undocumented + formula-confirmed = the most valuable output.
  **F. Magnitude scope:** magnitudes are owner/measurement-gated and OUT OF SCOPE — do NOT flag a magnitude as a gotcha
  unless it contradicts the prose's own number; tag each with its evidence tier.

## Also produce: `kitDescription`

A plain-English 3–6 sentence description of what the kit DOES in game terms (grounded in the real kit text). No gotcha
subkinds, no citations, no severity.

## Return ONLY this JSON

```json
{
  "slug": "<exact slug>",
  "kitDescription": "<plain-English 3-6 sentences>",
  "convergence": {
    "s5TestsVsDriverOverride": "GREEN|RED",
    "redAssertions": ["<which S5 assertions fail vs the driver's override>"]
  },
  "lineFindings": {
    "skill1": [
      {
        "kitLine": "<≤40 chars>",
        "category": "FAITHFUL|DOCUMENTED_GAP|REAL-GOTCHA|RECON_ERROR",
        "subkind": "SILENT_DROP|ENGINE|FIDELITY|ENCODING|null",
        "driverSaid": "...",
        "blindSaid": "...",
        "formulaCheck": "...",
        "fireRateOk": true,
        "explanation": "..."
      }
    ],
    "skill2": [],
    "burst": []
  },
  "gotchas": [
    {
      "subkind": "SILENT_DROP|ENGINE|FIDELITY|ENCODING",
      "slot": "...",
      "summary": "...",
      "evidence": "<real kit line + formula citation + driver vs blind>",
      "documentedByDriver": true,
      "severity": "high|med|low",
      "suggestedFix": "<faithful representation, or 'needs measurement' + recipe — NEVER a fudge>"
    }
  ],
  "discriminationOk": true,
  "faithfulnessScore": "<0..1 fraction of kit lines FAITHFUL or DOCUMENTED_GAP>",
  "verdict": "GO|NO-GO(faithfulness)|NO-GO(engine-core)",
  "verdictRationale": "<one paragraph: which gotchas are real + ranked; whether the blind re-derivations converged; what must change for GO; the same-model residual the owner should spot-check>"
}
```

Save to `scripts/kit-autonomy/results/snow-white.json`. `suggestedFix` is a faithful representation or a flagged
measurement, NEVER a number chosen to hit the board. Tight structured JSON, not an essay.

---

# JUDGE PACKET ARTIFACTS (self-contained — grade THESE; you have no tools to read anything else)

Do NOT read any other file; do NOT re-read.

**P0 DISAMBIGUATION:** `snow-white` (Snow White, **AR/Iron/Attacker/Burst III**) is the BASE unit — a DIFFERENT unit
from `snow-white-heavy-arms` (SR/Water). Every magnitude here is from characters['snow-white'] only. Approved nickname `sw`.

## 1. Ground truth — kit prose (data/characters.json → characters['snow-white'].skills, structural; level 10/10/10)

Base: AR / Iron / Attacker / Burst III, cd 40s, ammo 60, reloadFrames 111, chargeFrames 0, hitsPerShot 1,
normalAttackMultiplier 14.71, coreAttackMultiplier 200. **Iron vs Fire boss = NO elemental advantage** (Iron beats
Electric), so elem = 1.0 in the control comp.

- **S1 "Determination"**
  - ■ Activates when normal attack hits **30** time(s). Affects the target(s): **Deals 82.8% of final ATK as additional damage.**
  - ■ Activates when normal attack hits **30** time(s). Affects self: **ATK ▲ 8.28% for 5 sec.**
- **S2 "Seven Dwarves: V&VI"**
  - ■ Affects enemies within range: **Deals 144.73% of final ATK as damage.** (NO activation clause.)
  - ■ Activates when using this skill during Full Burst. Affects self: **Critical Rate ▲ 26.1% for 10 sec.**
- **Burst "Seven Dwarves: I"**
  - ■ Affects self. Change the weapon in use: Charge Time 5 sec; **Damage 499.5% of final ATK; Full Charge Damage 1000%
    of damage**; Max Ammunition Capacity 1 round(s); Additional Effect: **Pierce**.

## 2. Damage-formula SSOT (docs/data/damage-calculation.md — summary)

Damage instance `amount = baseAtk × atkPct/100 × major × elem × charge × dmgUp × seqMult × projFactor × taken ×
distributed` (the `mult` decomposition; `baseAtk` = ATK after flat boss-DEF subtraction).

- **major:** +50% FB major (×1.5) for damage LANDING inside an FB window. **Burst-CAST damage is FB-exempt** (a cast
  lands before the FB window opens). Function-damage riders (flatDamage) take the FB major by LANDING timing (default ON).
- **elem:** ×1.10 if elementally advantaged; Iron > Electric, so Iron vs a Fire boss is neutral (elem 1.0).
- **charge:** Charge = chargeMult/100. A charge weapon's base charge is 2.5 (250%); `chargeMultPct` overrides — chargeMultPct
  1000 → Charge ×10 (the cannon's full-charge coefficient 4995% = 499.5 × 10). Probe-verified `mult.charge = 10` on all 6 cannon hits.
- **dmgUp:** attackDamagePct etc., additive within bucket; **Pierce Damage ▲ feeds this bucket for pierce-tagged hits.**
- **range:** +30% range bonus; function-damage riders default no-range (engine force noRange); `rangeOk:true` opts a flatDamage in.
- **core:** coreEligible hits roll core at coreRate; riders get NO core unless the text says "core strike".
- **taken:** damageTakenPct on the boss (boss debuff). **pierce core+body double-hit is engine-wide OFF (PIERCE_CORE_DOUBLE=false).**

## 3. Verified engine facts (probe-verified by the driver in the control comp = liter B1 / crown B2 / snow-white B3 / helm B3, boss Fire, focus snow-white; 1743 sw shots / 6 sw burstCast / 11 fullBurstStart over 180s)

(a) **Boss-held debuffs emit `buffApply` with `casterIdx===null` AND `targetIdx===null`**; filter by stat+value.
(b) **S1 hitCount-30 rider:** 58 damage instances = floor(1743 shots / 30) (hitsPerShot 1 → hits==shots); bucket 'skill',
srcSlot 'skill1', atkPct 82.8, critEligible true, rangeApplied false.
(c) **S1 self ATK buff:** atkPct 8.28, casterIdx==targetIdx==2 (self), 300-frame (5s) expiry; fires on the SAME hitCount-30
cadence (58×); near-permanent uptime while firing (procs ~every 2.5s < 5s expiry).
(d) **S2 144.73% interval-15s:** 11 damage instances at EXACT multiples of 15s (15,30,…,165 — engine interval convention,
first fire t=CD); bucket 'skill', srcSlot 'skill2'. All 11 happen to land in FB windows by timing coincidence (FB cycle
≈15s) → fbMajorApplied true, BUT the trigger is interval (NOT FB-gated): proc TIMES are 15-multiples, independent of the
FB-entry times (5.73, 23.4, 39.93, …).
(e) **S2 crit fullBurstEnter:** critRatePct 26.1, casterIdx==targetIdx==2 (self), 600-frame (10s) expiry; fires 11× ==
fullBurstStart count, at the FB-entry frames EXACTLY (critFrames == fbFrames) — proves fullBurstEnter, NOT an inFb-gated
interval cast (which would fire at the 15s S2-cast times).
(f) **Burst cannon (delayed flatDamage):** 6 damage instances == burstCast count; bucket 'burst', srcSlot 'burst', atkPct 499.5,
`mult.charge = 10` (×10), fbMajorApplied true + inFullBurst true (delaySec 5.5 lands inside FB), coreEligible true,
rangeApplied true on 1/6 (rangeOk; timing-dependent vs boss range). Lands at FB-entry + ~5.5s.
(g) **FIDELITY GAP:** the delayed flatDamage does NOT receive Normal Attack Damage ▲ (the swap-shot path's normalScale) — inert
at scope (no control-comp ally grants it; snow-white doesn't self-grant).
(h) **PIERCE_CORE_DOUBLE=false engine-wide:** the pierce core+body double-hit is unmodeled (inert on the partless boss).

## 4. Driver's shipped override (src/skills/overrides/snow-white.json — block structure; validates clean: ✓ valid, dmg 205.8M / 35.3% share, bursts 5, 4 warnings = the documented caveats)

- skill1[0]: trigger `hitCount count:30` → target `enemy`; effect flatDamage **atkPct 82.8**.
- skill1[1]: trigger `hitCount count:30` → target `self`; effect buff **atkPct 8.28 durationSec 5**.
- skill2[0]: trigger `interval sec:15` → target `enemy`; effect flatDamage **atkPct 144.73**.
- skill2[1]: trigger `fullBurstEnter` → target `self`; effect buff **critRatePct 26.1 durationSec 10**.
- burst[0]: trigger `burstCast` → target `enemy`; effect flatDamage **atkPct 499.5, charge:true, chargeMultPct:1000 (→×10),
  core:true, pierce:true, rangeOk:true, delaySec:5.5**.
- unmodeled: skill1 [], skill2 [], burst [] (all empty). caveats (4): S2 15s internal-cooldown + ⚑ first-fire phase/FB-scoping
  unmeasured; burst delayed-cannon encoding (not a weaponSwap — AR keeps firing); burst Normal-Attack-Damage fidelity gap (inert
  at scope); burst pierce core+body double-hit unmodeled (PIERCE_CORE_DOUBLE=false).
- note carries `Kit-autonomy gauntlet 2026-07-25` + the full OWNER-RULED encoding history (kit-audit Phase C 2026-07-20; a
  sw.MP4 footage pass that (i) contradicted the additive full-charge reading on two axes — charge UI ramps to '1000%' = the
  full-charge MULTIPLIER, and six nuke popups at ~630 ATK-multiples reconcile with ×10 4995% × FB × core × crit but sit ~3-4×
  above any 1499.5% additive class; (ii) corroborated exactly ONE cannon shot per window at FB-entry+5.4-5.6s; (iii) PIERCE tag
  on every popup; (iv) she KEEPS FIRING her AR through the ~5s charge → swap dropped for a delaySec 5.5 charge-bucket hit).

## 5. S6 BLIND override (independent prose→JSON, claude-opus-4-8, leakDetected:null) — block structure + diff vs driver

- skill1: hitCount 30 → enemy flatDamage 82.8 **crit:true** (SAME ✓ — crit explicit vs driver default-ON, equivalent); hitCount
  30 → self buff atkPct 8.28 5s (SAME ✓).
- skill2: **interval (NO sec — blind left the cadence ⚑ kit-silent)** → enemy flatDamage 144.73 crit:true (DRIVER: interval
  sec:15 owner-ruled; converge on interval + 144.73 + enemy); **interval + fbGate:"inFb"** → self buff critRatePct 26.1 10s
  (DRIVER: fullBurstEnter — divergent trigger MECHANISM; both are generic critRatePct, self, 26.1, 10s, FB-related).
- burst: **weaponSwap damagePct 499.5, chargeTimeSec 5, chargeMultPct 1000 (→×10), maxAmmo 1, hasPierce true, durationSec 10 (⚑)**
  (DRIVER: delayed flatDamage 499.5 charge chargeMultPct 1000 core pierce rangeOk delaySec 5.5 — divergent encoding MECHANISM
  weaponSwap vs delayed-flatDamage; converge on 499.5 ×10 pierce-scoped burstCast 1-ammo; blind omits explicit core/rangeOk).
- **Blind INDEPENDENTLY derived the ×10 (chargeMultPct 1000) from "Full Charge Damage 1000% of damage" — SAME as driver ✓.**
- unmodeled: all empty (SAME). Blind caveats (5 ⚑): swap durationSec; swap shot-economy; swap weapon class; S1/S2 cadence
  (datamine-unreliable rate_of_fire/reloadFrames/skillCooldownsSec); rider crit:true/core:false.

## 6. S5 BLIND test (independent prose→test, claude-opus-4-8, leakDetected:null) — assertions + API-mismatch note for classification

Fixture: controlComp('snow-white', true) = liter B1 / crown B2 / sw B3 / helm B3; teammates inertness check.
Assertions (intent): S1 rider 82.8 non-vacuous + SW-sourced (teammates byte-identical) + hitCount-30 (halving the threshold ~doubles
its contribution); S1 ATK 8.28 self-only (targetIdx===casterIdx) + raises SW dmg; S2 144.73 non-vacuous + teammates unchanged
(cadence ⚑ skipped — "kit gives NO activation clause"); S2 crit 26.1 GENERIC (critRatePct, NOT critRateNormalPct) + self + FB-gated
(removing the gate fires strictly more); burst casts exist + charge-bucket cannon damage from SW + non-vacuous (shot count/duration
⚑ skipped; Pierce ⚑ skipped inert).
**API/SCHEMA MISMATCHES (classify as RECON_ERROR, not real divergences — the blind writer could not see the driver's schema):**

- (i) counterfactuals scan `ov.blocks[].effects[]` — the driver override is SLOT-KEYED (`skill1/skill2/burst`), NOT `blocks`, so
  the blind mutations are no-ops and the "lowers SW total" diffs would not fire as written.
- (ii) `unitOf(res,slug).total` — the harness row field is `totalDamage`.
- (iii) cannon filter `e.srcSlot === swSlot && e.bucket === 'charge'` — `swSlot` is a numeric casterIdx and the real bucket is
  'burst' (srcSlot is the string 'burst'); the filter matches nothing.
- (iv) crit `fbGate` model (`delete b.fbGate`) — the driver uses a `fullBurstEnter` trigger (no fbGate field); this is the SW4
  trigger divergence (blind: inFb-gated interval cast; driver: fullBurstEnter).
- (v) burst `weaponSwap` model (`e.kind === 'weaponSwap'`) — the driver uses a delayed flatDamage; the blind's swapOff is a no-op.
  **Intent convergence (remap the blind assertions to the driver schema):** rider 82.8 hitCount-30 enemy ✓; ATK 8.28 self ✓; 144.73
  interval enemy ✓ (cadence ⚑ honest); critRatePct 26.1 generic self FB-gated ✓ (trigger mechanism fullBurstEnter vs fbGate-interval
  — documented divergence, fact (e)); cannon 499.5 ×10 charge-bucket burstCast ✓ (encoding weaponSwap vs delayed-flatDamage —
  documented divergence, fact (f)).

## 7. S2b PRE-OP review (adversarial test-faithfulness, claude-fable-5) — CONVERGED

leakDetected: null (reviewer noted the harness schema comments reference snow-white-heavy-arms but correctly identified it as a
DIFFERENT unit by non-negotiable #1; nothing target-specific leaked into the redacted methodology).
Per-line dispositions ALL FAITHFUL, matching the driver: S1 hitCount-30 82.8 enemy rider (counts ROUNDS); S1 hitCount-30 self ATK
8.28 5s; S2 interval 144.73 enemy (cadence ⚑ from the datamined CD, first fire t=CD); S2 crit 26.1 self 10s (reviewer read it as an
inFb-gated interval cast — its nearest-wrong; driver fullBurstEnter owner-ruled); burst 499.5 ×10 charge cannon (reviewer read a
weaponSwap — prose-literal; driver delayed-flatDamage owner-ruled from footage). loadBearingSet = all 5 lines (matches driver).
Reviewer's ranked shared-prior traps (all aligned with the driver): (1) ×10 MULTIPLIER not additive 1499.5% — the largest magnitude
trap; (2) S2 crit trigger fullBurstEnter vs inFb-gate; (3) burstCast-vs-fullBurstEnter divergence is LIVE in the control comp (helm
co-B3); (4) S1 ATK buff near-100% uptime (permanent-passive shortcut risk — discriminate via cadence); (5) ⚑ fields: swap duration,
shot economy, S2 cadence; (6) pierce swap-scoped per-shot. No REAL-GOTCHA flagged.

## 8. Driver's test (scripts/tests/units/snow-white.test.ts) + S2d verification

22 assertions, one group per kit line SW1–SW5 + an inertness/whole-picture group. Fixture controlComp('snow-white') = liter B1 /
crown B2 / sw B3 / helm B3, boss Fire, focus snow-white (6 sw bursts / 11 FB / 1743 sw shots).
PINS: SW1 rider 82.8 == floor(shots/30)=58, bucket 'skill', critEligible; SW2 ATK 8.28 self-only (targetIdx==casterIdx==2), 300-frame,
shares the hitCount-30 cadence; SW3 144.73 == 11 procs at EXACT 15-multiples, bucket 'skill'; SW4 critRatePct 26.1 == fullBurstStart
count (11), self, 600-frame, critFrames==fbFrames; SW5 cannon == burstCast count (6), atkPct 499.5, bucket 'burst', mult.charge==10,
fbMajorApplied all true, coreEligible all true, rangeApplied some true.
Each FAITHFUL line is GREEN vs shipped AND RED vs its named nearest-wrong counterfactual: SW1 burstCast-gated (6≠58); SW2 all-allies
(holders>1); SW3 fullBurstEnter (FB-entry times ≠ 15-multiples) + burstCast (6≠11); SW4 burstCast (6≠11) + inFb-gated interval
(S2-cast frames ≠ FB-entry frames — the S2b nearest-wrong); SW5 no-charge (charge 1≠10) + instant/undelayed (fbMajor false≠true).
**S2d: `npx vitest run scripts/tests/units/snow-white.test.ts` → 22/22 PASS.**

## 9. Documented residuals (driver-flagged for owner spot-check — NOT faithfulness failures)

(a) **SW4 fullBurstEnter vs inFb-gated interval cast** — owner-ruled fullBurstEnter (2026-07-20); measured critFrames==fbFrames
(fact (e)); BOTH blind roles (fable S2b + opus S6) independently read the prose-literal inFb-gate.
(b) **SW5 delayed-flatDamage vs weaponSwap** — owner-ruled from footage (she keeps firing her AR through the ~5s charge); converges
on ×10 / burstCast / pierce-scoped / core / FB-by-landing; BOTH blind roles independently read the prose-literal weaponSwap.
(c) **SW5 fidelity gap** — the delayed flatDamage does NOT receive Normal Attack Damage ▲ (inert at scope — no buffer in the control
comps; a future Normal-Attack-Damage buffer would under-credit the cannon) (fact (g)).
(d) **SW5 pierce core+body double-hit unmodeled** — PIERCE_CORE_DOUBLE=false engine-wide, inert on the partless boss (fact (h)).
(e) **SW3 first-fire phase ⚑ (t=15 vs t=0 = ~1 proc) + FB-scoping ⚑** — unmeasured; recipe: scan sw.MP4 for 144.73%-class popups
(appearance outside FB windows falsifies FB-scoping; first-popup time pins the phase).

## Grade this

Converge the two blind re-derivations (S5/S6) + the S2b pre-op review against the driver's implementation, per A–F. Classify the S5
API mismatches (§6 i–v) as RECON_ERROR. Classify the two trigger/encoding divergences (SW4 fullBurstEnter vs inFb-gate; SW5 delayed-
flatDamage vs weaponSwap) — note BOTH blind roles independently derived the prose-literal reading and the driver's encoding is the
footage/owner-corrected faithful model (facts (e)/(f)), converging on every load-bearing magnitude; judge whether these are
DOCUMENTED (owner-ruled + measured) or REAL-GOTCHA. Note the documented fidelity gap (c), pierce double-hit (d), and S2 phase/FB-scoping
⚑ (e) as DOCUMENTED-GAP/⚑. Run the fire-rate check (C) using fact (b)/(d)/(e)/(f). Return the binding JSON verdict to
results/snow-white.json.
