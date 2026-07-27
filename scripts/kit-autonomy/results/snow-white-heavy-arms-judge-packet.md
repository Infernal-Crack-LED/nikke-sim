# kit-autonomy — S7 RECONCILING JUDGE (binding go/no-go)

Paste at the top of a fresh subagent, prepended with `.claude/subagent-non-negotiables.md` AND the mechanics
pack (`docs/data/damage-calculation.md` + `docs/data/game-mechanics.md`, or the `/context` pack). You are the
final gate of the autonomous gauntlet. You grade the driver's IMPLEMENTATION against ground truth — the real
kit text + the damage-formula SSOT + two INDEPENDENT blind re-derivations — and return a BINDING verdict.
You grade ARTIFACTS, not intent: you do NOT trust the driver's self-report (the artifacts embody the
reasoning; you are not "blind" to it, you simply don't take its word for it).

> **Content gate:** inspect kit prose STRUCTURALLY; quote ≤ ~40 chars; clinical output.

## You are given

1. **Ground truth:** the real kit prose (`data/characters.json → characters.<slug>.skills`) + base stats, and
   the damage-formula/mechanics SSOT (the multiplicative buckets; crit/core/FB majors; procs/DoT/flavors).
2. **Pre-op review (S2b):** the adversarial test-faithfulness reviewer's independent spec (per-line
   disposition + nearest-wrong model + distinguishing assertion + load-bearing set).
3. **Blind post-op test-writer (S5):** an independent `<slug>.test.ts` written from the prose alone (+ spec).
4. **Blind post-op override-writer (S6):** an independent `OverrideFile` written from the prose alone (+ audit + ⚑ list).
5. **The driver's implementation:** the driver's `<slug>.test.ts`, `src/skills/overrides/<slug>.json`, and any
   engine change. (Plus the S2d independent verification matrix if provided.)

## Method

**A. Convergence is MECHANICAL (do this first).** Run the S5 blind tests, UNMODIFIED, against the driver's
SHIPPED override (mentally trace, or note what a run would show): **GREEN = convergence; any RED = a
divergence to classify.** A divergence the blind caught is the REAL signal; mere same-model agreement is WEAK
evidence (every agent is the same model — convergence proves stability, not correctness).

**B. Per kit line, classify** the driver's encoding against prose + formula, using S2b/S6 to attribute:

- `FAITHFUL` — encoding matches prose AND the formula SSOT agrees the routing is correct (right bucket,
  trigger timing, stacking rule, scope, duration semantics, target set).
- `DOCUMENTED-GAP` — deliberately `unmodeled` (reason in `note`), a `GAP` (missing primitive, `it.skip`), or a
  `⚑` (estimate + recipe + tier). Acceptable; the decision is recorded.
- `REAL-GOTCHA` — a divergence NOT documented. Sub-kinds, ranked: `SILENT_DROP` (line nowhere — not block,
  config, or `unmodeled`) → `ENGINE`/`FIDELITY` (encoded but the engine routes/executes it so behavior differs
  from the kit wording, or the downstream effect is modeled rather than the named mechanic) → `ENCODING`
  (wrong value/stat/trigger/target/scope/duration vs the prose).
- `RECON_ERROR` — a blind agent misread clear code/prose (the driver + formula agree); note it, not a finding.

**C. Fire-rate / "modeled≠working" check:** each FAITHFUL block must FIRE at the prose-implied cadence over
the 180s fight (the DBG side-effect check), not merely be present. A modeled line that doesn't activate is a
REAL-GOTCHA. (A block whose only observable is a consumer's reaction needs a fixture that strips the unit's
other sources of that signal — note if the driver's fixture fails to isolate.)

**D. Discrimination check:** each load-bearing test must FAIL under its named nearest-wrong model (per the
S2d matrix / S2b). A test green under both shipped and counterfactual asserts nothing → REAL-GOTCHA.

**E. Cross-check the blind agents:** for each S5/S6 divergence from the driver, is it corroborated by the
prose + formula (a fresh find) or spurious? Undocumented + formula-confirmed = the most valuable output.

**F. Magnitude scope:** magnitudes are owner/measurement-gated and OUT OF SCOPE — do NOT flag a magnitude as
a gotcha unless it contradicts the prose's own number; tag each with its evidence tier.

## Also produce: `kitDescription`

A plain-English 3–6 sentence description of what the kit DOES in game terms (grounded in the real kit text,
not audit jargon) — for owner sanity-check. No gotcha subkinds, no citations, no severity.

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

Save to `scripts/kit-autonomy/results/<slug>.json`. `suggestedFix` is a faithful representation or a flagged
measurement, NEVER a number chosen to hit the board. Tight structured JSON, not an essay.

---

# JUDGE PACKET ARTIFACTS (self-contained — grade THESE; you have no tools to read anything else)

summary. Do NOT read any other file; do NOT re-read.

**P0 DISAMBIGUATION:** `snow-white-heavy-arms` (SR/Water/Attacker/Burst III) is a DIFFERENT unit from base
`snow-white` (AR/Iron). Every magnitude here is from characters['snow-white-heavy-arms'] only. Nickname `swha`.

## 1. Ground truth — kit prose (data/characters.json → characters['snow-white-heavy-arms'].skills, structural)

Base: SR / Water / Attacker / Burst III, cd 40s, ammo 6, reloadFrames 141, chargeFrames 72 (=1.2s),
hitsPerShot 1, normalAttackMultiplier 69.04, coreAttackMultiplier 200, chargeMultiplier 250. Water > Fire → has
elemental advantage on a Fire boss.

- **S1 (Seven Dwarves V+VI)**
  - ■ every 0.2s while charging, nearest non-Lock-On enemy: **Lock-On** (designates target; max 5; off on normal/cover).
  - ■ every 0.2s while charging, self: **Auto Fire Ready** — loads Seven Dwarves ammo (max 5) + **DEF ▲42.24% continuously**.
  - ■ every 0.2s while charging, all Lock-On enemies: **Damage Taken ▲4.2% for 4 sec**.
  - ■ on Full Charge (Auto Fire): **Effect 1** 41.9% of final ATK to ALL enemies; **Effect 2** 105.59% of final ATK to
    Lock-On targets, **attacks sequentially based on ammo loaded by Auto Fire Ready**.
  - ■ on Full Charge while Seven Dwarves Fully Active: **uses ▼1**.
  - ■ on normal attack while not in Full Burst: **removes Seven Dwarves Fully Active**.
- **S2 (Shades of White)**
  - ■ at battle start: **fixes charge time at 1.2 sec continuously**.
  - ■ during Full Charge: **Gains Pierce 5s** + **ATK ▲46.84% 5s** + **Damage to Parts ▲62.64% 5s**.
  - ■ entering Burst Stage 3: **ATK ▲73.92% for 10 sec**.
  - ■ at Full Charge only while Seven Dwarves Fully Active: **Charge Damage ▲528% for 1 round(s)** + **Sequential attack damage ▲158.4% for 1 round(s)**.
- **Burst (Seven Dwarves Fully Active)**
  - ■ self: **Attack Damage ▲84.48% for 10 sec**.
  - ■ self: **Seven Dwarves Fully Active** — Number of uses: 2; Effect 1 fixes charge time at 3.2s; Effect 2 Max Lock-On ▲10; Effect 3 Max ammo loaded ▲10; deactivates when uses reach 0.
  - ■ all destructible projectiles: **41.9% of final ATK**.

## 2. Damage-formula SSOT (docs/data/damage-calculation.md — summary)

Damage = ATK × major (×1.10 element if advantaged) × charge × damageUp-bucket (attackDamagePct etc., additive within
bucket) × taken (damageTakenPct on the boss) × distributed. **Sequential attacks have their OWN multiplicative bucket
(`seqMult`)** built from `sequentialDamagePct` (additive points into that bucket — sim.ts:1413
`(opts.sequential ? stat(u,'sequentialDamagePct',frame) : 0)`), only for hits flagged `flavor:'sequential'`.
Function-damage riders take the **+50% FB major by LANDING time** (default ON); **+30% range is OFF on riders**
(engine force noRange); **burst-cast damage is FB-exempt**; riders **crit at caster rate by default**. `chargeDamagePct`
is ADDITIVE charge-bucket points (base charge 2.5 + 5.28 = 7.78), NOT a base-multiplier.

## 3. Verified engine facts (use when classifying — probe-verified by the driver)

(a) **Boss-held debuffs emit `buffApply` with `casterIdx===null` AND `targetIdx===null`**; filter by stat+value (the buff
KEY carries the caster slot, e.g. `2:skill1:damageTakenPct:4.2`).
(b) **`chargeDamagePct 528` IS consumed** by swapped full-charge shots: swap-weapon normals carry charge mult **7.78**
(= 2.5 base + 5.28); base normals stay 2.5. Probe-verified.
(c) **`sequentialDamagePct 158.4` is encoded-but-INERT on flatDamage riders:** measured `seqMult=1` on BOTH the 527.95
baseline and the 1055.9 lump, REGARDLESS of whether `whileSwapped` is present or the `flavor:'sequential'` tag is
stripped. The engine's flatDamage path does NOT route `flavor:'sequential'` into the seqMult bucket. This is an
ENGINE-core plumbing fact (the gauntlet must NOT edit src/engine/**). The override encodes the prose faithfully; the
model is graded/validated in this state (the 158.4 is a small support-diluted contribution).
(d) **`whileSwapped:true`** confines a buff's ACTIVITY to the unit's weapon-swap window (sim.ts:1228 drops it when swap==null).
(e) **`swapGate:'swapped'`** fires a block ONLY on the unit's swapped-weapon shots; **`maxShots:N`** ends the swap right
after the Nth swapped shot (uses-based termination).

## 4. Driver's shipped override (src/skills/overrides/snow-white-heavy-arms.json — block structure; validates clean: ✓ valid, dmg 760.9M / 65.3% share, 0 warnings)

- skill1[0]: trigger `passive` → target `enemy`; effect buff **damageTakenPct 4.2** (steady-state of "4.2%/4s refreshed every 0.2s while charging" ≡ permanent on the boss).
- skill1[1]: trigger `shotFired` → target `enemy`; effects flatDamage **41.9** + flatDamage **527.95** `flavor:sequential` (= 105.59×5 baseline volley, per full charge).
- skill1[2]: trigger `shotFired`, **`swapGate:"swapped"`** → target `enemy`; effect flatDamage **1055.9** `flavor:sequential` (= 105.59×10 EXTRA over baseline, rides ONLY the 2 swapped full-charge shots inside the FB window — the 2026-07-13 volley-placement FIX, COMMUNITY twice-confirmed gamewith JP + prydwen 7→15-hit structure).
- skill2[0]: trigger `shotFired` → target `self`; effects buff **atkPct 46.84 (5s)** + buff **partsDamagePct 62.64 (5s)**.
- skill2[1]: trigger **`stageEnter` stage:3** → target `self`; effect buff **atkPct 73.92 (10s)**.
- skill2[2]: trigger `burstCast` → target `self`; effects buff **chargeDamagePct 528 (10s, whileSwapped:true)** + buff **sequentialDamagePct 158.4 (10s, whileSwapped:true)** ("for 1 round(s)" ×2 uses → 10s outer bound confined to the swap window by whileSwapped).
- burst[0]: trigger `burstCast` → target `self`; effect buff **attackDamagePct 84.48 (10s)**.
- burst[1]: trigger `burstCast` → target `self`; effect **weaponSwap damagePct 69.04, chargeTimeSec 3.2, durationSec 10, maxShots 2** (the Seven Dwarves Fully Active mode).
- unmodeled: skill1 [Lock-On targeting; DEF 42.24; ammo-loading bookkeeping; normal-attack removal]; skill2 [Pierce 5s; charge-time 1.2s fix]; burst [Fully Active Lock-On/ammo caps; 41.9% to destructible projectiles].
- note carries `Kit-autonomy gauntlet 2026-07-24` + the validated history (1.31→0.99 vs two real scope-lock T4 runs) + the 3 residuals below.

## 5. S6 BLIND override (independent prose→JSON, claude-opus-4-8, leakDetected:null) — block structure + diff vs driver

- skill1: defPct 42.24 passive self (DRIVER: UNMODELED — both inert); damageTakenPct 4.2 passive enemy (SAME ✓); flatDamage 41.9 + flatDamage 527.95 flavor sequential shotFired (SAME ✓ — blind INDEPENDENTLY derived the ×5 = 527.95 lump).
- skill2: gainPierce 5s + atkPct 46.84 5s + partsDamagePct 62.64 5s shotFired (SAME minus pierce ✓); atkPct 73.92 **burstCast** 10s (DRIVER: stageEnter:3 — divergent trigger, coincide in sole-B3); chargeDamagePct 528 **durationShots:2** + **sequentialMultPct** 158.4 **durationShots:2** burstCast (DRIVER: chargeDamagePct 528 + sequentialDamagePct 158.4, durationSec:10 + whileSwapped — divergent stat key for sequential + divergent duration representation; both buff exactly the 2 swap shots, damage-equivalent; both inert-on-riders per fact (c)).
- burst: attackDamagePct 84.48 10s (SAME ✓). **Blind did NOT model the weaponSwap / 1055.9 swap volley** — it approximated Fully Active via the S2 buffs + the ×5 lump and documented the 5→15 ammo swell + 3.2s charge as UNMODELED. **The DRIVER is MORE complete here** (models the 15-ammo swap volley as 527.95+1055.9 + the weaponSwap charge mode).
- Blind caveats (⚑): Auto Fire cadence; ×5 lump (15-hit window not separately modeled); no core/range on riders; DOUBLE-COUNT risk (base SR shot + riders — driver resolved via measurement 1.31→0.99); damageTaken boss channel; Fully-Active gate approximated; sequentialMultPct additive-vs-multiplier.

## 6. S5 BLIND test (independent prose→test, claude-opus-4-8, leakDetected:null) — assertions + API-mismatch note for classification

Fixture: controlComp('snow-white-heavy-arms', true) = liter B1 / crown B2 / swha B3 / helm B3; TEAMMATE='helm' inertness check.
Assertions (intent): atkPct 73.92 emitted + lifts her damage + self-scoped (helm unchanged); atkPct 46.84 same; attackDamagePct 84.48 same; chargeDamagePct 528 emitted + lifts damage + Fully-Active-gated (first apply AFTER first burstCast); sequentialMultPct 158.4 emitted. Skips (it.skip): S1 4.2 (lock-on-gated divergence probe), S1 41.9/105.59 (ammo-economy ⚑), Pierce, parts 62.64, DEF 42.24, charge-time clamp, Lock-On, projectiles.
**API/SCHEMA MISMATCHES (classify as RECON_ERROR, not real divergences — the blind writer could not see the driver's schema):**

- (i) counterfactuals scan `ov.blocks[].effects[]` — the driver override uses `skill1/skill2/burst` arrays, NOT `blocks`, so the blind zeroBuff is a no-op and the "lifts her damage" diffs would not fire as written (schema-accessor mismatch).
- (ii) `withPatchedOverride(slug, mutate, fn)` 3-arg — the harness is 2-arg (returns the clone); the blind's `cfX.res` would be undefined.
- (iii) `unitOf(res,slug).total` — the harness row field is `totalDamage`.
- (iv) **`sequentialMultPct` 158.4** — the driver emits `sequentialDamagePct` 158.4 (the engine's additive sequential bucket, fact (c)); the blind guessed a multiplicative stat key. This is the ONE substantive stat-key divergence to classify (both are inert-on-riders in practice per fact (c); the driver's `sequentialDamagePct` is the engine-real stat).
  **Intent convergence (remap the blind assertions to the driver schema):** atkPct 73.92 ✓, atkPct 46.84 ✓, attackDamagePct 84.48 ✓, chargeDamagePct 528 ✓ (emitted on burstCast, after first burst — Fully-Active-gated ✓), all self-scoped (helm inert ✓). The sequentialMultPct assertion maps to the driver's sequentialDamagePct 158.4 (emitted ✓, inert-on-riders per (c)).

## 7. S2b PRE-OP review (adversarial test-faithfulness, claude-fable-5) — CONVERGED

leakDetected: declared (schema comments name the "SWHA" abbreviation; the slug-filter missed the abbreviation) — reviewer
EXPLICITLY re-derived from prose arithmetic ("Number of uses: 2", "uses ▼1", "for 1 round(s)") → valid, uncontaminated.
Per-line dispositions ALL match the driver: damageTakenPct 4.2 boss debuff FAITHFUL (~100% uptime, single-instance); 41.9
per full charge FAITHFUL; 105.59×ammo sequential FAITHFUL (flavor MUST be sequential); Fully Active uses-based 2-shot mode
FAITHFUL (maxShots, NOT a 10s window — a 10s window admits a 3rd 3.2s shot at ~9.6s); ATK 46.84 near-permanent FAITHFUL;
partsDamagePct 62.64 inert FAITHFUL; ATK 73.92 stageEnter:3 FAITHFUL; 528/158.4 status-gated FAITHFUL; 84.48 burstCast
FAITHFUL; Fully Active mode (3.2s charge, 15 ammo, 2 uses) FAITHFUL; DEF 42.24 + projectiles 41.9 UNMODELED. Reviewer's
emphasis points all align with the driver encoding. No REAL-GOTCHA flagged.

## 8. Driver's test (scripts/tests/units/snow-white-heavy-arms.test.ts) + S2d verification

30 assertions, one group per kit line W4–W18 + documented-skip PINs (W2/W3/W11/W20). Fixture [liter,crown,swha] boss Fire
focus swha (sole B3; 84 shots / 5 bursts / 5 FB; burstCast frame strictly precedes fullBurstStart). PINS: W4 boss debuff
4.2 (key 2:skill1:damageTakenPct:4.2, permanent); W5 41.9 ×84 (=shots); W6 527.95 ×84; W7 1055.9 ×10 (=2/burst, all in
[burstCast,+10s] swap windows; remove weaponSwap→0; ungated→83/84 + outside windows); W12 atkPct 46.84 self 5s; W13
partsDamagePct 62.64 INERT (effect-only removal → byte-identical totals); W14 atkPct 73.92 self 10s on burstCast frames;
W15 chargeDamagePct 528 emitted + APPLIED (swap normals charge 7.78; remove→2.5); W16 sequentialDamagePct 158.4 emitted
(encoding pin; inert-on-riders residual documented); W17 attackDamagePct 84.48 self 10s burstCast (fullBurstEnter
counterfactual fires on FB-start frames, strictly after cast); W18 weaponSwap (remove→ no 1055.9 + no 7.78 normals; swha
burst-bucket damage EMPTY). Each FAITHFUL line is GREEN vs shipped AND RED vs its nearest-wrong counterfactual.
**S2d: `npx vitest run scripts/tests/units/snow-white-heavy-arms.test.ts` → 30/30 PASS.**

## 9. Three documented residuals (driver-flagged for owner spot-check — NOT faithfulness failures)

(a) **W14 stageEnter:3 vs burstCast** not behaviorally discriminable in a sole-B3 fixture (they coincide frame-wise); the
override encodes the faithful stageEnter:3 (prose: "entering Burst Stage 3").
(b) **W15/W16 trigger representation** — burstCast + whileSwapped + durationSec:10 is damage-equivalent to the literal
per-swap-full-charge `durationShots:1` reading (both buff EXACTLY the two swap shots — charge 7.78 probe-verified);
the S6 blind independently chose durationShots:2 (same equivalence class).
(c) **W16 sequentialDamagePct 158.4 inert-on-riders** — encoded faithfully per prose, but the engine flatDamage path does
not route flavor:'sequential'→seqMult (fact (c)); engine-core plumbing question, model graded/validated in this state.

## Grade this

Converge the two blind re-derivations (S5/S6) + the S2b pre-op review against the driver's implementation, per
RECONCILING-JUDGE.md A–F. Classify the S5 API mismatches (§6 i–iii) as RECON_ERROR; classify the sequentialMultPct-vs-
sequentialDamagePct stat-key divergence (§6 iv) using fact (c). Note where the DRIVER is more complete than the blind
(the weaponSwap/1055.9 swap volley, §5). Return the binding JSON verdict to results/snow-white-heavy-arms.json.
