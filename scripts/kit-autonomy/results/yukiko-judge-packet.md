# S7 RECONCILING-JUDGE PACKET — `yukiko` (Yukiko, MG/Attacker/Fire/Burst III, NEW unit)
Driver: Qwen Code. Blind roles: S2b test-review = claude-fable-5; S5 blind test writer = claude-opus-5; S6 blind override writer = claude-opus-5. You (kimi-code/k3) are the cross-family BINDING judge.


---

## 1. YOUR CONTRACT (role template, verbatim)

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

> Section headings use roman numerals since 2026-08-03 — the old letter labels collided with a one-letter unit slug under the packet leak-check word-boundary regex.

**I. Convergence is MECHANICAL (do this first).** Run the S5 blind tests, UNMODIFIED, against the driver's
SHIPPED override (mentally trace, or note what a run would show): **GREEN = convergence; any RED = a
divergence to classify.** A divergence the blind caught is the REAL signal; mere same-model agreement is WEAK
evidence (every agent is the same model — convergence proves stability, not correctness).

**II. Per kit line, classify** the driver's encoding against prose + formula, using S2b/S6 to attribute:

- `FAITHFUL` — encoding matches prose AND the formula SSOT agrees the routing is correct (right bucket,
  trigger timing, stacking rule, scope, duration semantics, target set).
- `DOCUMENTED-GAP` — deliberately `unmodeled` (reason in `note`), a `GAP` (missing primitive, `it.skip`), or a
  `⚑` (estimate + recipe + tier). Acceptable; the decision is recorded.
- `REAL-GOTCHA` — a divergence NOT documented. Sub-kinds, ranked: `SILENT_DROP` (line nowhere — not block,
  config, or `unmodeled`) → `ENGINE`/`FIDELITY` (encoded but the engine routes/executes it so behavior differs
  from the kit wording, or the downstream effect is modeled rather than the named mechanic) → `ENCODING`
  (wrong value/stat/trigger/target/scope/duration vs the prose).
- `RECON_ERROR` — a blind agent misread clear code/prose (the driver + formula agree); note it, not a finding.

**III. Fire-rate / "modeled≠working" check:** each FAITHFUL block must FIRE at the prose-implied cadence over
the 180s fight (the DBG side-effect check), not merely be present. A modeled line that doesn't activate is a
REAL-GOTCHA. (A block whose only observable is a consumer's reaction needs a fixture that strips the unit's
other sources of that signal — note if the driver's fixture fails to isolate.)

**IV. Discrimination check:** each load-bearing test must FAIL under its named nearest-wrong model (per the
S2d matrix / S2b). A test green under both shipped and counterfactual asserts nothing → REAL-GOTCHA.

**V. Cross-check the blind agents:** for each S5/S6 divergence from the driver, is it corroborated by the
prose + formula (a fresh find) or spurious? Undocumented + formula-confirmed = the most valuable output.

**VI. Magnitude scope:** magnitudes are owner/measurement-gated and OUT OF SCOPE — do NOT flag a magnitude as
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

## 2. MECHANICS SSOT (damage formula + game mechanics)

### 2a. docs/data/damage-calculation.md

# Damage calculation — the exact math the sim computes

Companion source-of-truth to [game-mechanics.md](game-mechanics.md): that doc says what the game
does and how we know; this one walks the sim's implementation of it, formula by formula, in the
order the engine applies them, with every term mapped to its construct in `src/engine/sim.ts`.
The goal: a human can reconstruct any damage number the sim produces — and check it against a
real popup — without reading code. Worked examples at the end use popup-verified fights, so the
numbers are checkable against reality, not just against the code.

Kept current by the `/mechanics-doc-upkeep` skill; a stop-hook nudges when engine files change
without this doc. Evidence tiers (MEASURED / DATAMINED / COMMUNITY / CALIBRATED ⚑) are defined in
[../CONVENTIONS.md](../CONVENTIONS.md).

---

## 1. The per-instance formula

Every damage instance — one bullet, one pellet volley, one skill proc, one dot tick, one burst
hit — is computed independently at the frame it lands (`dealDamage()`):

```
damage = FinalATK × (rate% / 100) × Major × Element × Charge × DamageUp × seqMult × Taken × Distributed
```

Buffs _inside_ a bucket add; buckets _multiply_. `rate%` is the instance's skill/attack
multiplier (e.g. a normal attack's `normalAttackMultiplier`, a proc's "deals X% of final ATK"
value), after any per-unit override corrections. There is no separate Projectile bucket — the
Projectile Explosion ▲ / Attachment ▲ terms compose additively inside DamageUp (§1f); `seqMult`
is the sequential-attack TRUE multiplier (§1e).

For the inverse index — **every buff, stat, gear line and boss-side term mapped to the factor it
feeds**, with live per-stat carrier counts — see
[damage-bucket-matrix.md](damage-bucket-matrix.md).

### 1a. FinalATK

```
FinalATK = max(0, effectiveAtk − bossDef)                     // bossDef = 140 at scope lock (measured; owner "always on")

effectiveAtk = staticAtk × (1 + Σ ATK ▲ % / 100)
             + Σ (caster-ATK grants, as flat values)
             + (Σ ATK-of-Max-HP % / 100) × ownMaxHp
```

- `staticAtk` — the unit's out-of-combat attack: level-table base for its class × grade/core
  multipliers + gear (`src/stats.ts`). At scope lock (sync 400, 3★ core 7, no doll, **Base 5
  gear**) this is **Attackers 118,027 / Supporters 98,367 / Defenders 78,707**. (BASIS CORRECTED
  2026-07-14: scope lock uses the base manufacture gear set, NOT OL0 — the old OL0 values
  120,143 / 100,130 / 80,118 were ~1.76% high across the board. The prior popup "exact" matches
  against the OL0 numbers are flagged for re-check at the Base 5 basis. See DECISIONS.)

- Plain **ATK ▲ %** buffs sum into one multiplier on staticAtk (they dilute against each other).
- **"ATK ▲ X% of caster's ATK"** buffs convert at application time to a flat add of the caster's
  final ATK × X — they do not dilute (this is why high-ATK buffers are strong).
- **"ATK ▲ X% of Max HP"** conversions use the unit's OWN Max HP only — own-kit HP stacks count,
  ally-granted Max HP buffs do NOT feed the conversion (MEASURED: cinderella focus video; her
  full-burst proc popups match own-HP math within 2% early and late, and would read ~28% higher
  if ally grants fed it). "Live Max HP" here and below is the single engine reader `liveMaxHp`
  (base + own-kit maxHpFlat buffs, honoring expiry/stacks/ramp).
- **"ATK ▲ X% of the skill user's final Max HP"** granted to OTHERS (maxwell-ordinary-mechanic
  S2, `atkOfCasterMaxHpPct`) converts at application time to a FLAT add of the caster's live
  Max HP × X — uniform across all targets, one snapshot per application; the caster's own-kit
  Max HP stacks feed the basis (the e3 scope above), ally-granted Max HP on the caster does not
  (owner ruling 2026-08-04: the kit line is caster-scaled; the earlier target-own resolution was
  a misread).
- **"% of Max HP" damage terms** (stackedNuke hpPct — maiden-ice-rose's burst "10% of the skill
  user's FINAL Max HP") read live Max HP at cast, same e3 scope (2026-08-04; the base-Max-HP
  read was a documented residual, kit text says "final").

### 1b. Major bucket (crit, core, Full Burst, range — one additive bracket)

```
Major = 1 + FB + Range + Crit + Core

FB    = 0.5   if Full Burst is active AND the instance is not boundary-timed (see below); else 0
Range = 0.3   if the weapon is in its effective band vs the boss's current position; RL never;
              skill/proc instances never (noRange)
Crit  = critRate × critBonus         (expected-value mode)
      | critBonus or 0, Bernoulli(critRate)      (Monte Carlo mode, cfg.seed set)
        critRate  = (base crit rate + Crit Rate ▲ % + normal-only Crit Rate ▲ %) / 100,
                    clamped 0..1   (base 15%)
                    the normal-only term (`critRateNormalPct`) joins ONLY on normal-attack
                    instances — kit lines reading "Critical Rate of normal attacks ▲x%"
                    (helm S1). Skill procs and burst damage see the unscoped term alone.
        critBonus = (critDamage − 100)/100 + Crit Damage ▲ %/100           (base +50%)
Core  = coreExposure × ACR × coreBonus    (expected-value mode)
      | coreBonus or 0, Bernoulli(coreExposure × ACR)   (Monte Carlo mode)
        coreExposure = cfg.coreHitRate (1.0 on the scope-lock boss)
        ACR = acrForHR(weapon, band, hitRatePct) — the auto-aim core-hit fraction.
        LIVE MODEL — UNIGEO uniform-in-circle (default 'all', 2026-07-22; DECISIONS 2026-07-22),
              scope-lock (small) boss profile, accuracy-circle weapons (AR/SMG/SG):
                R(hr)   = (CIRCLE_PX_K · scale_w)/2 · (1 − hr/100) px      (linear to ZERO at HR 100;
                          CIRCLE_PX_K 0.648 measured, scale_w = datamined start_accuracy_circle_scale
                          {AR 75, SMG 110, SG 250}; MEASURED at 79.3/48.2 px for SG @ HR 0/38.91)
                SG:     ACR = min(1, (r_core(band)/R(hr))²) ÷ coverage(band, R(hr))   (per landed pellet)
                AR/SMG: ACR = lensOverlap(disc R_eff = f_bloom_w·R(hr), offset δ_w(hr), core r_core)
                              ÷ disc area                                              (per hit)
                        δ_w(hr) = δ0_w · max(0, 1 − hr/120)
              Pellet/shot placement inside the circle is UNIFORM PER AREA — MEASURED directly
              (101 machine-read pellet-marker positions; the previous centered Gaussian is refuted
              at KS 0.376 vs crit 0.135). r_core diameters: near 31 px MEASURED; mid/midfar/far
              20.9/15.8/12.7 px ⚑ FIT-SELECTED (UNIGEO_CORE_PX; an owner re-trace supersedes).
              ⚑ CALIBRATED per class: δ0 = AR 15.9 / SMG 17.9 px; f_bloom = AR 0.578 / SMG 0.728
              (SMG pair is a saturated 2-cell fit — flagged, see DECISIONS 2026-07-22). Rises
              steeply with Hit Rate; AR ≥▲80 is all-core geometrically (circle inside the core).
              MG/SR/RL → flat 0.95 (no accuracy circle; MG gated by its wind-up ramp).
              Engine: acrForHR → unigeoSgCorePerLanded / unigeoSingleCoreProb (src/engine/unigeo.ts).
        REVERT / FALLBACK ARMS: UNIGEO=off restores the pre-2026-07-22 engine byte-identically —
              the δ-offset ("Rician") Gaussian cone (offsetCoreProb, frozen params in sg-geometry.ts:
              δ0 = AR 18 / SMG 16 / SG 30 px, H 120, S_FLOOR 0.10, σ-shrink {AR .009, SMG .004,
              SG .009}, K_SIGMA 2.53), which itself falls back at CONE_DELTA=0 to the measured
              CORE_BY_WEAPON_BAND table × HRCORE lift (NEVER refit; Wilson CIs in
              docs/probe-data/coreband2-*.json). The cone also remains the LIVE path for
              medium/large bossPelletProfile fights (UNIGEO coverage tables are the scope-lock
              boss silhouette only).
              PER-SHOT OVERRIDE (`coreOverride`, bypasses the band table): some hit types have their
              OWN core rate independent of aim/range — a consolidated pellet bullet (dorothy-S,
              `coreRate`). These pass `coreOverride` so `acr` is that rate, not `acrFor(weapon,
              band)`. (Rapi: Red Hood's attached-rocket EXPLOSIONS consumed this path 2026-07-16
              (`storedHit.core` 0.33) but were re-ruled core-INELIGIBLE 2026-08-04 — skill damage;
              owner footage ruling, DECISIONS.)
        coreBonus = (coreAttackMultiplier − 100)/100 + Core Damage ▲ %/100   (base +100%)
```

**Full Burst timing rule (MEASURED, twice popup-verified + JP-corroborated):** damage dealt BY a
burst skill at its cast lands _before_ Full Burst begins — it gets neither the +0.5 nor any
"when entering Full Burst" aura. Buffs granted by earlier casts in the same rotation do apply to
it. Burst-originated damage that lands _during_ the window (dot ticks, stored-hit releases,
per-shot procs) gets both. Engine: `noFb` forced for burst-cast direct damage; burst-cast blocks
resolve before full-burst-entry triggers.

**Stored-hit accumulate-then-detonate (Rapi: Red Hood rockets, 2026-07-16):** a `storedHit` effect
accrues charges that release as one consolidated hit. Rapi: Red Hood's rocket meter (`hitCount`
every 120 normal attacks, `countInFb` 60 in her Full Burst — fills 2× faster in FB) attaches a
rocket at each meter-full; rockets attached OUTSIDE Full Burst do NOT explode until FB begins, so
they ACCUMULATE and the FIRST explosion of each FB is a BATCH of everything banked (this stack
overlap is why explosions can't be visually counted). A rocket attached DURING FB explodes
INSTANTLY (`storedHit.instantInFb` → the in-FB per-frame release path). The explosion is
aim/range-independent, does NOT core (skill damage — owner footage ruling 2026-08-04 overturning the
2026-07-16 ~1/3 read), and crits at the caster's sheet rate
(`storedHit.crit` — removes the stored-hit path's default crit-OFF exemption so the release crits like
every other hit; consistency, DECISIONS 2026-07-16). The rocket ATTACH is launchWeapon delivery:
it CORES at the band-table rate, crits, and generates burst gauge like any skill hit — so the
in-FB cadence subtly shifts Full Burst timing (a second-order coupling, DECISIONS 2026-07-16).
Two 2026-08-04 owner rulings: the ▼60 in-window threshold is scoped to the 10s window of her OWN
Stage-3 cast (`countInFbStage`, not any FB window), and her Stage-3 cast self-buffs Projectile
Attachment Damage ▲421.2% for 10s (restored — the 2026-07-14 measured-inert verdict overturned;
DECISIONS ATTACHMENT REWORK).

**Flighted damage (2026-07-14):** some burst skills are projectiles with real flight time —
Rapi: Red Hood's 2808% nuke lands ~0.4 seconds AFTER her banner, inside her own window, and
snapshots everything (attack, buffs, the +50%, even Crown's flicker phase) at the LANDING
instant (MEASURED: the landed value matches the full in-window recipe at +0.02% in the
fire-weak read). Engine: `delaySec` on a flat-damage effect queues the hit for landing-time
resolution; the cast-instant no-Full-Burst rule does not apply to flighted damage. Her nuke is
also charge-gated (`requiresPulls` 120 — it fired at every banner where she had 120+ shots
banked and skipped the one banner where she did not).

**Delayed BLOCKS, distinct from flighted damage (2026-08-03):** a separate `delaySec` sits on the
BLOCK rather than on a flat-damage effect, and delays the whole block — every effect kind, buffs
included. It exists for kit lines whose activation condition is only satisfied a fixed time after
the observable event that causes it: Flora's "when either adjacent ally reaches max HP" fires 2
seconds after Burst Stage 2 entry, because her own skill 1 hands those allies a 2-second Max HP
grant there and they return to max HP when it expires (DECISIONS 2026-08-03). The block's gates and
its `everyN` counter are evaluated when the TRIGGER fires — that is the state the kit line's
activation clause reads — while targets and effect values resolve at LANDING; a landing frame past
the end of the fight never applies, and an absent or zero value is a strict no-op.

**Scope clarification (2026-07-13):** the measured rule (and the engine's forced `noFb`) governs
BURST-slot casts — the burst button's own damage, which is what the Cinderella popups measured.
A skill-slot block that happens to trigger on a burst cast resolves after the window opens and
DOES receive the +0.5 (engine ordering: `fbEndFrame` is set before skill-slot blocks run),
though it still misses same-cast self-buffs and entry auras. This distinction surfaced in the
Snow White: Heavy Arms rework below — no unit currently relies on a skill-slot cast-instant
damage lump.

**Popup math note:** an on-screen popup is a single resolved instance — non-crit body, non-crit
core, crit body, or crit core — so to compare a popup against the sim, recompute Major with the
crit/core _outcomes_ (0 or the full bonus), not the expectations. A crit popup is ×1.5 of its
non-crit sibling at base crit damage; a core popup adds the full coreBonus.

### 1c. Element bucket

```
Element = 1.1 + (Element Damage ▲ % + Superior-element Damage ▲ %)/100   with elemental advantage
        = 1.0                                                             without
```

Wheel: Fire→Wind→Iron→Electric→Water→Fire. "Superior element" damage buffs
(`elemAdvantageDamagePct` — Privaty's 130, Maiden: Ice Rose's aura, Guillotine's passives) live
HERE as part of the element multiplier, and apply only with advantage. MEASURED (2026-07-14,
test battery 5): Privaty's popup ratio between windows with and without her 130-point line read
2.8244 — the element-placement prediction to four digits ((1.1+1.3)/1.1 arithmetic); the
alternative DamageUp-additive placement predicts 1.995 and is excluded on three band pairs plus
two independent corroborating classes. Matches the decoded reference simulator.
~~They sit in DamageUp~~ SUPERSEDED (2026-07-14) — the old DamageUp placement was unsourced and
is retired (restorable via ENV.ELEMADV='damageup' for A/B comparison only).

### 1d. Charge bucket (charge shots only)

```
Charge = chargeMult/100
       + (chargeMult/100) × (doll charge % + Charge-Damage-multiplier buffs %) / 100
       + Charge Damage ▲ %/100
```

`chargeMult` is the per-unit full-charge multiplier (SR typically 250, Alice 350, cinderella 200;
weapon-swap states can override it, and a `flatDamage` hit may supply its own via `chargeMultPct`
when there is no swap to source it — Snow White `snow-white`'s cannon, dealt as a delayed
full-charge hit while her AR keeps firing rather than a weaponSwap that would halt it). Ordinary
Charge Damage ▲ buffs add flat percentage points; "multiplies base charge damage"-class effects
(Helm's burst, collection items) scale the base term. Auto play always releases at full charge
(early releases ≈ 2% of shots, unmodeled). Non-charge instances use Charge = 1.

### 1e. DamageUp bucket

```
DamageUp = 1 + ( Attack Damage ▲ %
               + Sustained Damage ▲ %      [only on sustained-flavored instances (dots)]
               + Sequential Damage ▲ %     [only on sequential-flavored instances]
               + True Damage ▲ %           [only on true-flavored instances]
               + Pierce Damage ▲ %         [only for Pierce-tagged shots: static hasPierce,
                                            a live gainPierce window (seconds) or unspent round
                                            budget (gainPierce.durationShots), or a swap-scoped
                                            weaponSwap.hasPierce shot (snow-white cannon)]
               + Projectile Explosion ▲ %  [explosion-flavored hits, plus RL NORMAL attacks — see 1f]
               + Projectile Attachment ▲ % [attachment-flavored hits — see 1f]
               ) / 100
```

The flavor gates mean a "Sustained Damage ▲" buff does nothing for a unit with no dot, etc.

**`seqMult` — the sequential-attack TRUE multiplier, its own bucket.** Kit wording "Damage
multiplier of sequential attacks is scaled by x%" (eve's Exospine Mk2, ×2) is a genuine multiplier
on a sequential-flavored instance, so it gets its own factor (`1 + sequentialMultPct/100`) rather
than diluting inside DamageUp. This is a DIFFERENT mechanic from "Sequential Attack Damage ▲x%"
(`sequentialDamagePct`, Snow White: Heavy Arms), which is an ordinary additive DamageUp member.
Both are `1` / inert for every instance that is not sequential-flavored.

### 1f. Projectile flavor routing (DamageUp addition)

Projectile Explosion ▲ % / Projectile Attachment ▲ % compose ADDITIVELY into the DamageUp
bucket (1e), flavor-scoped: an attachment hit reads ONLY Projectile Attachment ▲, an explosion
hit ONLY Projectile Explosion ▲. Applies to explosion/attachment-_flavored_ hits (Rapi: Red
Hood's projectiles, Anis: Star's stars). For plain rocket-launcher NORMAL attacks the Projectile
Explosion buff applies too (also DamageUp) — MEASURED exactly (the buff-independent
rocket/proc popup ratio test, 1.2491 = prediction to four digits). Owner popup ruling
2026-08-04: a non-crit CORE Rapi:RH attach during her B3 window hit 5,057,974 in the
control+carry recording — the additive composition reproduces it (−0.24%/+1.1% across buff
states); the prior own-multiplicative-bucket model over-credited ~×1.6 (her hot read). This
OVERTURNS the validation-era own-bucket rule. The event `projFactor` field is now a flavor
MARKER (1 = unflavored), not a factor in the damage product.

### 1g. Taken and Distributed buckets (boss-side)

```
Taken       = 1 + (Σ Damage Taken ▲ on the boss
                   + Σ Distributed-damage Taken ▲ [distributed instances only, and only
                                                   while a Damage Taken ▲ is active]) / 100
Distributed = 1 + Distributed Damage ▲ %/100     [distributed instances only]
```

Distributed damage deals the same TOTAL against one target as against many (owner-verified) —
never model a split penalty.

---

## 2. What creates damage instances

### 2a. Normal attacks

Per trigger pull, at the weapon's cadence, 60 fps frame-quantized:

- **AR 12/s · SMG 20/s · SG 1.5/s (10 pellets/trigger) · Pistol 4/s** — class defaults; the
  datamined `rate_of_fire` is per-unit and some units deviate (Jill: 150 rpm = 2.5/s, MEASURED —
  engine `charFixes.pullsPerSec`).
- **MG**: the measured wind-up ladder (35 rounds over 142 frames, then 1 round/frame = 60/s),
  with wind-DOWN on idle (grace ~0.27s, then the ladder retraces at ~2.8× climb speed; a >100%
  reload-speed buff's ~0.2s effective reload sits inside the grace = the measured "skip").
  Details: [nikke-mg-windup-model.md](nikke-mg-windup-model.md).
- **Charge weapons (SR/RL)**: charge for `chargeFrames × (1 − Σ Charge Speed %)` (SUBTRACTIVE,
  floor 1 frame, cap +100%). The sum only ever contains buffs the unit was actually allowed to
  receive: a unit listing a stat in `charFixes.statImmunities` (`liberalio`, Charge Speed) never
  has that stat placed on it by an in-battle buff in the first place — cube/Overload Charge Speed
  still counts, per the owner ruling that the immunity covers buff effects, not gear. See
  [game-mechanics.md](game-mechanics.md) §11. Then — for release-fired units — a 22-frame release latency
  (MEASURED). Autofire units skip the latency (`charFixes.noBoltRecovery`, sparse list).
  Details: [charge-weapons.md](charge-weapons.md). **Whole-magazine dump (cinderella,
  `charFixes.magDumpRof`)**: one charge feeds the whole magazine — after the first charge she
  autofires all 24 rounds at the datamined `rate_of_fire` without recharging, then reloads and
  charges once again (MEASURED 2026-07-21 by ammo-counter frame read; ≈390 pulls/180s). Charge
  Speed shortens only the once-per-mag prime charge. See [charge-weapons.md](charge-weapons.md) §2a.
- **Reload**: `round(displayed × 0.975 × (1 − Reload Speed ▲)) + 13 frames` (SUBTRACTIVE; the
  13-frame tail is what a ~100% buff leaves — corroborated by ore-game's 0.2s measurement).
  Rolling reloads exist (`reload_start_ammo` — Jill tops up while firing, zero downtime).
- Core/crit/range/FB per §1b; charge bucket per 1d.
- Firing pauses during the boss's 1-second off-screen transition windows; units whose effective
  reload is ≤1s get a free refill during them.

### 2b. Skill damage ("deals X% of final ATK as additional damage")

Function-type instances (DATAMINED rules, table in
[nikke-damage-formula.md](nikke-damage-formula.md) §3):

- CRIT at the caster's rate (default on), NEVER core, NEVER range (`noRange`), Full Burst by
  actual landing time, no charge bucket.
- launchWeapon deliveries (real projectiles: Anis: Star's stars, Rapi: Red Hood's attachments)
  DO core+crit and take the Projectile bucket.
- Full-charge-gated procs count only full-charge releases (auto ≈ every shot).
- Per-shot procs can be state-gated: by Full-Burst state (engine `fbGate`, e.g. Velvet), by
  every-Nth activation (`everyN`), by core exposure (`requiresCore`), and by weapon-swap state
  (`swapGate`, 2026-07-13): Snow White: Heavy Arms's Fully Active extra volley (+1,055.9%
  sequential per shot, critting) rides ONLY her two swapped 3.2-second full-charge shots inside
  the Full Burst window — COMMUNITY twice-confirmed placement (gamewith JP holds her Fully
  Active buffs per fully-charged shot; Prydwen's 5→15 lock-on structure), replacing an older
  cast-instant lump model that stranded the volley outside the window's buffs.
- Weapon swaps can end on USES rather than time (`maxShots`, MEASURED 2026-07-14): Snow White:
  Heavy Arms's Fully Active ends right after her second swapped shot fires — at a variable
  instant, observed +6.2 to +7.7 seconds — bounded by her burst window; a shot lost to fight
  end delivers nothing. Buffs "held per swap round" (her +528 Charge Damage and +158.4
  Sequential) are modeled with the `whileSwapped` buff gate: they count only while the swap is
  live, so they never leak onto baseline shots in the window tail. Base Snow White
  (`snow-white`) uses `maxShots: 1` — OWNER-ruled 2026-07-20: exactly one cannon shot per
  burst, then she returns to her AR for the window's remainder. A swap can also carry
  swap-scoped Pierce (`weaponSwap.hasPierce`, 2026-07-20): its shots are Pierce-tagged for
  the DamageUp Pierce term without the unit being statically Pierce.
- Internal-cooldown skills (`interval` trigger, 2026-07-20): a kit line with no printed
  activation clause that "just happens" every N seconds of battle (owner-stated mechanic;
  snow-white S2a 144.73%, N=15 /owner). Fires first at t=N (⚑ phase convention — pin from a
  popup-cadence read).
- Shield-state gates (2026-07-20, owner-ruled default-off): "when a Shield is set" lines ride
  the `shielded` event trigger (fires when an ally's `shield` effect targets the unit);
  "if a Shield is set" lines use `requiresShielded` — active only while a shield window
  (the emitter's stated duration) covers the unit (`shieldedUntilFrame`). Naga (`naga`).
- Static team-composition gates (`teamHas`) can also match SPECIFIC units (`slugs`,
  2026-07-20): noir's same-squad burst line requires `blanc` or `rouge` in the team
  (owner-confirmed the gate is real). The same-squad primitive is `teamHas.sameSquad`
  (2026-08-02): some OTHER ally shares the owner's squad per the curated map
  `src/data/squads.ts`; fails closed for unmapped owners. Blanc's (`blanc`) S2
  burst-CDR is gated on it (squad = noir+rouge; noir's `.slugs` spelling predates the
  primitive and migrates to it).

### 2c. Damage over time

Sustained-flavored function damage on a tick timer; ticks reference CURRENT buffs (no snapshot),
never core/range; **tick-crit ON by default** (`DOT_CRIT`, U13 2026-07-21 — ginmy + our footage
confirmed). **`flavor:"true"` (true-damage) dots crit too** (owner ruling 2026-07-25, in-game
confirmed; reverses the 2026-07-21 "true damage cannot crit" ruling — recorded but never implemented:
there is no `crit && !trueFlavor` guard; ada's grenade DoT crits at the caster rate). A dot's
ticks land during whatever window they land in (Full Burst rules by timing).

### 2d. Stored hits

Attach-then-detonate kits (Rapi: Red Hood): charges accumulate per shot and release at the next
Full Burst start, AFTER entry buffs apply (they detonate inside the window and keep auras —
unlike burst-cast direct damage).

---

## 3. When damage happens: the rotation

Full model in [burst-gauge.md](burst-gauge.md); the engine's state machine in one paragraph:

The gauge (10,000 energy) fills from hits — per trigger vs the boss each unit contributes its
datamined target value ([burst-gauge.md](burst-gauge.md) §2), ×2.5 if it is the camera-focused
unit with a charge weapon (focus-only, MEASURED both ways); skill hits and dot ticks contribute
the flat target value; per-unit kit quirks add on top (helm, liberalio, ein, jill — MEASURED via
the rl3 cross-validation). Generation is locked during Full Burst and during the chain. When the
gauge fills, the chain opens (consuming the gauge): **gauge-full → 30f → Burst 1 → 30f → Burst 2 →
30f → Burst 3 → 22f → Full Burst** (frame-perfect MEASURED 2026-07-21; DECISIONS). Each stage opens a
10-second window for the next (DATAMINED `burst_duration`); in-window selection is FIRST-READY (the
stage-filler whose cooldown ends soonest, tie→leftmost — owner ruling 2026-07-21); an expired window
collapses the chain back to a full refill. The Full Burst countdown starts 22f AFTER the Burst-3 cast
(so instant burst-cast attacks land before it — no +50%). After it ends, generation unlocks IMMEDIATELY
and the next chain opens the moment the refilled gauge is full — there is NO post-FB chain-open lock
(owner ruling 2026-08-04, overturning the earlier fixed ~2.5-3s `POST_FB_CHAIN_DELAY_FRAMES` block: the
observed gap was natural refill-from-zero, ~3-4s for a good team, compounded by video-offset confound;
`ROTMODEL=floor` keeps the old block as an opt-in A/B arm). Casts are
blocked while the boss is off-screen in a range transition — the one real
source of run-to-run full-burst-count variance. Everything else is cooldown arithmetic, which is
why full-burst counts are deterministic and pinned as regression asserts.

---

## 4. Monte Carlo mode

`cfg.seed` switches crit and core from expectation folding (§1b) to per-instance Bernoulli rolls,
jitters each boss range-transition time by up to ±2s, and jitters chain cast gaps — mirroring the
two real variance sources (crits, boss movement timing). Means are unchanged; the seed spread
gives the error bar a single real run should be judged against, and real runs are compared
against the seed stratum matching their observed full-burst count. Unset seed = the deterministic
expected-value path, byte-identical to the web UI's.

---

## 5. Worked examples (popup-verified anchors)

### 5a. Jill's opening magazine (run I order, electric-weak boss — all four classes measured 99.7%)

FinalATK = 137,059 (staticAtk 120,143 Attacker × her passive ATK stack at fight start).
⚠ **Pre-correction OL0 basis**: this example uses the old OL0 `staticAtk` value and no boss-DEF
subtraction. After the 2026-07-14 basis correction, scope-lock Attackers use Base 5 gear =
118,027, and the live basis subtracts the measured boss DEF 140 (~0.1% of FinalATK); the popup
match here is flagged for re-check at the corrected basis (see §1a).
rate% = 92.4 (71.09 base × her Magnum-Ammo 1.3 multiplier). Element = 1.1. Charge = 1.
DamageUp = 1.0 pre-buffs. AR in range at mid band → Range 0.3.

| popup class                          | Major           | formula result | measured popup |
| ------------------------------------ | --------------- | -------------- | -------------- |
| non-crit body                        | 1 + 0.3 = 1.3   | 181,131        | 180,633        |
| non-crit core                        | 1.3 + 1.0 = 2.3 | 320,464        | 319,582        |
| crit body                            | 1.3 + 0.5 = 1.8 | 250,796        | 250,107        |
| acid tick (192%, no core/range/crit) | 1.0             | 289,469        | 288,662        |

### 5b. Cinderella's nuke (the Full Burst boundary rule)

Instance: burst-cast damage, 1,400.6% per sequential hit, FinalATK 187,102 at cast (her own
cast-granted HP→ATK conversion included; anis-star's full-burst-ENTRY flat-ATK grant excluded —
boundary rule), DamageUp 1.209 (trina's cast-granted +20.9% applies; anis-star's entry-aura +34%
does not), Element 1.1, Major = 1.0 non-crit (no FB, no range for burst damage, no core ever):

```
187,102 × 14.006 × 1.0 × 1.1 × 1.209 = 3,485,150   →  measured 3,448,659 (98.9%)
crit: × 1.5                = 5,227,725              →  measured (other fight) ×1.5 pair exact
```

With the +50% (the rejected branch) the prediction is 34% hot — this single popup pair is what
settled the boundary rule.

### 5c. Maiden: Ice Rose gauge fill (solo vs the raid boss)

Weapon shot: target 364 × 2.5 (solo = focused charge weapon) = 910 energy = 9.1% of the gauge —
measured as the exact per-shot bar step. Her rider proc adds the flat 364 (3.64%) as a separate
visible sub-step. Full in ~8 pulls including one reload pause.

---

## 6. Known open items that bound this doc's precision

The board's standing residuals and every CALIBRATED ⚑ value are tracked in
[../open-questions.md](../open-questions.md) — headline items: the UNIGEO ⚑ set (fit-selected long-band
core diameters; the saturated SMG δ0/f_bloom pair) and the SG-override calibration debt awaiting the
re-tune pass (DECISIONS 2026-07-22), the N5 fire comp's real-12-vs-sim-10 Full Burst shortfall (U29), the ~7%
uniform damage-side deficit under the corrected rotation model, per-unit kit-generation quirks
not yet modeled (U11c), and the four kit-level outliers (ein, eunhwa-TU, quency-EQ,
guillotine-WS).


### 2b. docs/data/game-mechanics.md

# NIKKE combat mechanics — single source of truth (2026-07-13)

Every game mechanic the simulator's logic references, with where it's implemented and how we
know it. **Companion source of truth: [damage-calculation.md](damage-calculation.md)** — the
exact math the sim computes, formula by formula, with popup-verified worked examples. Detail
docs live alongside this file; per-unit modeling decisions live in `src/skills/overrides/*.json`
notes; unresolved items live in `docs/open-questions.md`; settled tradeoffs in
`../DECISIONS.md` (do not re-litigate).

**Skill resolution (2026-07-16):** the engine never parses skill description text at runtime.
Each unit's override JSON is the complete description of its kit — all three skill slots as
structured blocks, plus an `unmodeled` field listing (verbatim) every kit-text line the model
deliberately does not represent, and optional `caveats` shown as modeling warnings. The offline
kit parser (`scripts/lib/kit-parser.ts`, run by `scripts/materialize-overrides.ts` and the
kit-parse authoring skill) is an authoring aid only.

**Evidence tiers** used throughout (highest to lowest):

- **MEASURED** — frame-counted from our own recordings/tests under scope lock. Never refit.
- **DATAMINED** — decoded game tables (github.com/rcasdzxc/SD, coolguydlm123/nikkecsvlibrary)
  or the frame-accurate reference sim github.com/d34d633f/nikke-einkk.
- **COMMUNITY** — independently verified by multiple community testers (JP: note.com,
  ore-game.com, wiki3.jp; KR: namu.wiki, Arca, DC Inside, Inven; EN: nikke.gg, Prydwen).
- **CALIBRATED ⚑** — value fitted against our validated real fights; mechanism known or
  suspected but the number is ours. Every ⚑ is a standing refit candidate.

Validation basis for all calibrations: scope lock (no cube, no doll, Base 5 gear [not OL0 —
corrected 2026-07-14], 3★ core 7,
sync 400, 10/10/10, treasure on, partless boss, 100% core exposure, full auto, 180s).
Real-run repeatability is 0.5–3.5% per unit (measured by running the same water-weak
validation fight twice), so simulation-vs-real deltas under ~5% are noise.

---

## 1. Damage formula

Damage is a product of independent **buckets**; buffs _inside_ a bucket are additive,
buckets _multiply_. DATAMINED + COMMUNITY, cross-validated by our board.

```
damage = FinalATK_term × rate% × Major × Element × Charge × DamageUp × seqMult × Taken × Distributed
```

Major bucket = `1 + 0.5·FB + 0.3·range + critTerm + coreExposure·ACR·coreBonus` —
crit, core (+100% base), Full Burst (+50%), and effective range (+30%) all share ONE
additive bracket. The +50% applies by TIMING: burst-cast damage lands before the window
opens and never gets it (§8). `coreExposure` is `cfg.coreHitRate`; `ACR` is the accuracy-
derived core fraction from §7. `seqMult` is the separate sequential-attack multiplier
bucket. Full structure, per-bucket membership, and the skill-proc ("additional damage")
rules: **[nikke-damage-formula.md](nikke-damage-formula.md)**.
Engine: `dealDamage()` in `src/engine/sim.ts`.

## 2. Weapon fire cadence

Per trigger pull, 60 fps frame-quantized (COMMUNITY base rates, MEASURED refinements):

| Weapon | Cadence                                                | Notes                                 |
| ------ | ------------------------------------------------------ | ------------------------------------- |
| AR     | 12/s                                                   | 5 frames exactly                      |
| SMG    | 20/s ⚠ datamined nominal 24/s, frame-quantized to 20/s | see the frame-quantization note below |
| SG     | 1.5/s                                                  | 10 pellets/shot; 40 frames exactly    |
| MG     | 60 rounds/s cap                                        | after wind-up ladder — §3             |
| Pistol | 4/s                                                    |                                       |
| SR     | charge cycle + 22f bolt                                | §4                                    |
| RL     | charge cycle                                           | no bolt recovery                      |

**⚠ SMG CADENCE IS CONTESTED — the sim ships 24/s, but a direct measurement says 20.0/s
(2026-07-23).** The ammo counter (the shot clock) on
`docs/probes/clean-weapons/emma-claire-idollocean.MP4` with `idoll-ocean` focused reads
`076→066→056→046→036` (t=60.0–62.0, mid band) and `020→010` (t=145.0–145.5, far band) — exactly
10 rounds per 0.5 s, dead linear, in two separate range bands.
**The mechanism is this section's own "frame-quantized" premise.** 1440 rpm = 24/s = **2.5 frames per
shot**, and a census of every datamined `rate_of_fire` in the roster shows **SMG is the only weapon
that is not a whole number of frames** (AR 720→5f, AR 150→24f `jill`, MG 3600→1f,
RL 60/90/120/180/300→60/40/30/20/12f, SG 90→40f, SR 60/200→60/18f). `ceil(2.5) = 3` frames →
exactly 20.0/s. So the table's "24/s" and the "frame-quantized" claim above it are mutually
inconsistent, and the measurement resolves them in favour of 20.
**This CONFLICTS with the ore-game community figure (~24/s) cited below** — that source's other rates
carry ~2% slop (its AR ~11.79/s vs an exact 12/s), which cannot absorb a 20% gap, so the two are
genuinely at odds rather than reconcilable. Our reading is a direct integer count of an in-game
counter, which is the higher-tier instrument.
Engine: SMG frame quantization is **DEFAULT-ON** (flipped 2026-07-23, DECISIONS); `SMGRATE=24` is the
documented revert / A-B arm (`SMGRATE=<n>` pins any rate). Evidence + whole-board A/B:
`docs/probe-runs.md` § "SMG CADENCE".

Base rates: [ore-game measured rates](https://ore-game.com/nikke/post/verify-memo/)
(AR ~11.79/s, SMG ~24/s, SG ~1.50/s at 60fps) + decoded shot tables
([rcasdzxc/SD](https://github.com/rcasdzxc/SD)). The class rate is a DEFAULT — the
datamined `rate_of_fire` column is per-unit and some units deviate wildly (Jill: 150 rpm
= 2.5/s on an "AR", video-confirmed; engine `charFixes.pullsPerSec`). **CHUNKED (multi-part)
RELOADS:** some units empty the magazine and then refill it **in parts**, so the reload
takes N× as long — the datamined `reload_bullet` is `1/chunks` (`10000` = whole mag, 177
units; `3300` = 3 chunks, 14 units — 9 SGs + 5 RLs; `5000` = 2 chunks, `grave`), and
`reload_time` is the PER-CHUNK duration. This is already live: shipped `reloadFrames`
equals `reload_time × chunks × 0.6 + 21` for 190 of 192 units. Firing does NOT resume
between chunks (measured on `grave` and `noir`). `reload_start_ammo` is NOT this signal —
it is `max_ammo − 1` on all 192 rows and identifies nobody. `grave` is the one carrier
shipped un-multiplied → open-questions **U30**. Reload durations are per-unit DB values
(`reloadFrames`). Reload duration is SUBTRACTIVE like charge speed
(IMPLEMENTED 2026-07-13): actual reload = displayed × 0.975 × (1−buff) + 0.21s tail —
buffs past 100% only remove the scaled part
([ore-game reload-limit](https://ore-game.com/nikke/post/reload-limit/); engine
`reloadFramesNeeded`). Known-but-NOT-implemented refinements: post-reload attack locks
(SG 0.47s, AR/SMG/MG ~0.18s).

## 3. MG wind-up

MEASURED frame ladder: 35 rounds over 142 frames, then 1 round/frame (60/s). While not
firing (reload/stun/unhittable) the spin WINDS DOWN: a ~0.27s grace, then the ladder
retraces at ~2.8× climb speed — fully gone after ~1.1s idle (linear fit through ore-game's
two recovery measurements; its endpoints reproduce both prior rules: "no recovery below
~70% reload buff" and our measured ">100% buff = full skip", the latter because the
subtractive reload formula leaves only its 0.21s tail, inside the grace). First 18 rounds
of each wind-up don't land on core (CALIBRATED ⚑, bloom estimate). Full ladder +
derivation:
**[nikke-mg-windup-model.md](nikke-mg-windup-model.md)**. Engine: `MG_RAMP_INTERVALS`,
`MG_NO_CORE_RAMP_ROUNDS`. Corroborating community analyses:
[note.com/tt00771 MG analysis](https://note.com/tt00771/n/nce4d6818b73c),
[ore-game MG heat-up](https://ore-game.com/nikke/post/verify-mg-heatup/) (which also
documents partial wind-up recovery from reload buffs ≥ ~70% — our MEASURED skip threshold
of >100% takes precedence).

## 4. Charge weapons (SR/RL)

- **Charge Speed is SUBTRACTIVE on charge time**: `effective = base × (1 − ΣCS%)`, floored
  at 1 frame, hard-capped at +100% (DATAMINED; StatChargeTime is a negative % on time).
  It is NOT `base / (1+CS)`. A unit whose kit grants immunity to Increase/Decrease Charge
  Speed effects contributes nothing to that sum from external sources — see §11.
- **SR bolt cycle**: +22 frames after each shot (MEASURED: helm recording, 1.37s cycle =
  60f charge + 22f). Weapon-swap states and `charFixes.noBoltRecovery` units are exempt.
  Reload starts immediately after the final shot.
- **Whole-magazine dump** (`charFixes.magDumpRof`): `cinderella` charges ONCE per magazine, then
  autofires all 24 rounds at her datamined `rate_of_fire` without recharging, then reloads and
  re-charges (MEASURED 2026-07-21, ammo-counter frame read; ≈390 pulls/180s). Charge Speed
  shortens only the once-per-mag prime charge. Details: [charge-weapons.md](charge-weapons.md) §2a.
- **Auto always full-charges** (DATAMINED, einkk `NikkeFullChargeMode.always`) — but
  full-charge-GATED procs miss on ~32% of auto releases (§7).
- Full-charge multiplier is per-weapon-per-unit (SR typ. 250%, Alice 350%); ordinary Charge
  Damage ▲ buffs add flat points inside the charge bucket; `chargeDamageMultPct`-class buffs
  (Helm burst, collection items) multiply BASE charge damage.
- Excess charge speed past the +100% cap is wasted, except explicit kit conversions
  (Red Hood S1: excess × 2.4 → Charge Damage).
  Details + decoded examples (Red Wolf's 200rpm fire-rate-gated window):
  **[charge-weapons.md](charge-weapons.md)**. Engine: charge block in the per-frame loop.

## 5. Effective range & the test boss

+30% damage when the target sits in the weapon's effective band; **RL never gets it**;
the bonus lives in the Major bucket. Test-boss movement is a fixed script (MEASURED):
mid 0–33s → near 33–70 → far 70–106 → midfar 106–144 → near 144–176 → midfar 176–180,
with band eligibility near=SG, mid=SMG+AR, mfar=SR, **mid-far=SR+MG**. Each transition has a 1s
unhittable window; units whose EFFECTIVE reload is ≤1s get a free full reload during it.
The machine-gun row is MEASURED (2026-07-14, the crown solo recording): popup class ratios
read the bonus present in the far band ONLY — mid, near, and mid-far all read the no-bonus
signatures (~~the old table granted machine guns the mid-far band~~ SUPERSEDED 2026-07-14).
The same recording showed the bonus flips track the boss's physical walk, leading/lagging the
scripted boundaries by ~4–6 seconds — the real trigger is instantaneous distance crossing the
weapon's optimal ring, and the band table approximates it. Raw measurements:
**[range-data.md](range-data.md)** (user, 2026-07-13) + probe u7 battery 4 (2026-07-14). The
+30%/RL-never rule is community-verified ([nikke.gg damage formula](https://nikke.gg/damage-formula/),
[ore-game verify-memo](https://ore-game.com/nikke/post/verify-memo/)); the band timeline and
weapon-band eligibility are OUR boss-specific measurements. Engine: `BOSS_RANGE_SCRIPT`,
`RANGE_ELIGIBLE`, `UNHITTABLE_FRAMES`.

## 6. Burst gauge generation

Gauge = 10,000 energy; fill counts HITS, not damage. Per trigger pull vs the boss the
gauge gains the unit's DATAMINED `target_burst_energy_pershot` (universally exactly 2×
the non-target base — the "boss ×2" is a table column, not a rule; per-unit values in
`data/gauge-per-shot.json`, e.g. standard launcher 280, sniper 560, Trina's famous
battery 720). The CAMERA-FOCUSED unit's charge weapon generates ×(1 + 1.5×charge) = ×2.5
at full charge; unfocused charge units generate flat ×1.0 — both sides MEASURED (two solo
recordings plus a paired two-unit experiment with only the focus changed). Focus defaults
to the middle slot (owner convention; recordings with a different focus perturb the fight
they record). Skill
hits and DoT ticks generate the caster's flat target value (no charge bonus); a sequential
multi-hit skill rider credits once per sub-hit via `flatDamage.gaugeHits` while keeping its
damage aggregated. Non-damage ENEMY-debuff applications — including periodic
re-applications/refreshes — generate the caster's full per-trigger value once per application,
by default for every trigger shape except per-shot on-bullet riders and the explicitly-known
non-generating skills (owner rulings 2026-08-16: `jackal` S1 owner-confirmed; the refresh half
rests on community-expert testimony the owner ruled trusted; scope ruled generate-by-default —
see burst-gauge.md §5; engine: `applicationGauge`). Ally/self-targeted pure buffs, heals, and
shields generate nothing.
**Gauge is generated in exactly ONE window per cycle: after a Full Burst ENDS and before the
next burst chain STARTS** (owner ruling, re-confirmed 2026-08-13 — settled, do not re-measure).
Opening the chain CONSUMES the gauge, and during the chain (stages 1-3) or Full Burst NOTHING
generates it — not bullets, skill hits, DoT ticks, riders, or "Gain Burst Gauge X%" effects. No auto-play efficiency factor exists (the old 0.7 ⚑ compensated for the chain
mechanics, now modeled directly). Full model + sources + the two solo measurements:
**[burst-gauge.md](burst-gauge.md)**. Engine: `gaugePerShot`/`addGauge`/`skillGauge`.

## 7. Auto behaviors

All of §7 exists because scope-lock runs are full auto — manual play changes these numbers.
Details: **[auto-play.md](auto-play.md)**.

- **Core rate for accuracy-circle weapons (AR/SMG/SG) = UNIFORM-IN-CIRCLE geometry ("UNIGEO",
  LIVE default `'all'` 2026-07-22; DECISIONS 2026-07-22).** Shots/pellets land **uniform per area**
  inside the aim circle, whose on-screen radius is **R(hr) = (0.648 × the unit's datamined
  `start_accuracy_circle_scale` ÷ 2) · (1 − Hit Rate/100) px** — the circle shrinks LINEARLY to zero
  at Hit Rate 100 (MEASURED: two owner-traced native-resolution frames, 79.3 px at HR 0 / 48.2 px at
  HR 38.91, weapon-matched shotgun pair; cross-validated by machine circle-fits and the bloom-peak
  px calibration). A hit cores iff it falls in the boss-core disc:
  **SG** core-per-landed-pellet = (r_core(band)/R(hr))² ÷ coverage; **AR/SMG** core-per-hit =
  the lens overlap of a uniform disc of radius f_bloom·R(hr), centered δ(hr) = δ0·(1−hr/120) px off
  the core, with the core disc (⚑ CALIBRATED per class: δ0 = AR 15.9 / SMG 17.9 px, f_bloom =
  AR 0.578 / SMG 0.728 — the SMG pair is a saturated 2-cell fit, flagged). Core diameters: near
  31 px MEASURED; mid/midfar/far = 20.9/15.8/12.7 px **⚑ FIT-SELECTED** (owner re-trace supersedes).
  The uniform distribution is MEASURED directly — 101 machine-read per-pellet marker positions
  refute the previous Gaussian at KS 0.376 (crit 0.135) — and the drawn reticle remains decorative.
  Effect rises steeply with Hit Rate (the shrinking circle concentrates onto the core; AR at ▲80 is
  all-core geometrically because the circle fits inside the core). **MG/SR/RL keep the flat 0.95
  base rate** (no accuracy circle). **The prior δ-offset ("Rician") Gaussian cone survives on two
  paths only** — `UNIGEO=off` (byte-identical revert arm) and medium/large `bossPelletProfile`
  fights (the coverage tables are the scope-lock boss silhouette) — with its frozen params in
  `sg-geometry.ts`, never refit. Evidence: the owner's 728-pellet hand count (18 cells, 4 bands ×
  Hit-Rate on/off) reproduced by the engine untuned; a pre-registered replication; the marker-position
  read. Engine: `src/engine/unigeo.ts` (+ `unigeo-coverage.ts`); full record
  `docs/handoffs/2026-07-22-sg-geometry-handoff.md` + DECISIONS 2026-07-22.
- **Early charge releases are rare (~2% of shots**, user-observed ~3/fight from boss
  interruptions) — auto effectively always full-charges, and full-charge-gated proc counters
  fire on essentially every shot. Maiden:IR's former ×0.68 proc factor is RESOLVED as her
  release-latency cadence, video-measured (open-questions A12; [auto-play.md](auto-play.md) §2a).
- **Burst-chain timing** (frame-perfect MEASURED 2026-07-21, chisato.mov; DECISIONS 2026-07-21
  coherent rotation model): the chain runs **`gauge-full → 30f → B1 → 30f → B2 → 30f → B3 → 22f →
FB countdown (10s)`**. So gauge-full → FB-start ≈ 112f (~1.87s), not the old ~0.9s. Constants:
  a **30f delay before B1** (`PRE_B1_GAP_FRAMES`), **30f between stages** (`STAGE_CAST_GAP_FRAMES`,
  0.5s), and a **22f delay between the B3 cast and the FB countdown** (`FB_PRE_DELAY_FRAMES`) — that
  gap is why instant burst-cast attacks land before Full Burst begins (no +50%). After FB ends there
  is NO chain-open lock (owner ruling 2026-08-04, overturning the earlier "~2.5-3s post-FB block"
  read): gauge generation is locked during FB and unlocks immediately at FB-end, and the next chain
  opens the moment the refilled bar is full — good teams take ~3-4s of natural generation to rebuild
  from zero, which is what the old bar-anatomy reads mistook for a fixed delay (the recordings also
  start before the 3:00 clock, so video timestamps ≠ fight time). The fixed block survives only as
  the opt-in `ROTMODEL=floor` A/B arm (`POST_FB_CHAIN_DELAY_FRAMES` = 150f). **Fight start:** ~8f (`FIGHT_DELAY_FRAMES`
  0.133s) before the first bullet (bullet lands at 0.133s; the earlier 1s was a timer-framing confound —
  the 3:00 timer reads 2:59:999 at elapsed 0; there is NO multi-second opening phase — the boss is
  hittable from 3:00). The chain timing + natural gauge refill pace high-generation teams.
- **Casts are blocked while the boss is off-screen** during a range transition (~1s,
  owner-confirmed) — the only genuine source of run-to-run full-burst-count variance
  (a transition colliding with a chain). Everywhere else, **full-burst counts are
  cooldown/chain arithmetic and deterministic run-to-run** — the graded comps are pinned
  as exact asserts in `scripts/regression.ts`.
- **SG pellet landing = 0.96 × coverage(band, R(hr))** (LIVE with UNIGEO, 2026-07-22) — the fraction
  of the Hit-Rate-state aim circle covered by the boss silhouette (owner-traced, range-scaled
  px ∝ 1/distance at band distances 20.7/30.7/40.7/50.7), times a MEASURED 0.96 tracking-wander
  loss (the auto-aim circle sits slightly off the moving boss at times — owner-ruled real).
  **Landing is Hit-Rate-dependent** (the shrinking circle pulls pellets onto the body): at HR 0 ≈
  near .813 / mid .712 / midfar .657 / far .607; at ▲38.91 ≈ .960/.873/.725/.710 — matching the
  owner's 728-pellet hand count (near-OFF measured 0.780, near-ON 0.931, etc.). Landing scales SG
  shot damage AND per-pellet burst-gauge generation (`unigeoSgLanding` → the gauge feed — the
  per-LANDED-pellet gauge crediting is owner-CONFIRMED 2026-08-14: a missed pellet generates
  nothing, U40); seeded
  runs draw whole landed-pellet counts as before. The boss silhouette is non-convex (hourglass +
  wide shoulders), which is why coverage stays nearly flat with range while the core shrinks 45% —
  the old "flat per-band table" (near 0.888 / mid 0.986 / far 0.74 / midfar 0.888, HR-blind,
  counter-reconciled against the old flat-core model) sat 12–24% ABOVE the directly-counted landing
  and survives only on the `UNIGEO=off` revert path. Scope-lock boss only — medium/large
  `bossPelletProfile` fights fall through to the cone path. → DECISIONS 2026-07-22;
  `docs/probe-data/soda-tb-sg-core-hr-windows.json` (the count of record).
- Auto burst priority is **first-ready, with waiting** (owner ruling 2026-07-21,
  DECISIONS): inside a timed stage window the chain waits for the stage-filling unit
  whose cooldown ends SOONEST (tie → leftmost) rather than handing the cast to a
  lower-priority ready unit. This replaced the old strict-leftmost wait, which let the
  leftmost slot MONOPOLIZE equal-cooldown alternation (a 40-team random battery: ~1/3 of
  comps differed, all first-ready correcting a leftmost monopoly/skip; graded board
  byte-neutral). `B3_LEFTMOST=1` restores the old strict-leftmost pick. (A round-robin
  was tried earlier and rejected — bench B3s cast where real fights never pick them.)
- **Focus-sync burst gate** (`burstGate: 'syncWithFocus'`, `PreparedUnit`/`UnitState`): an
  opt-in per-unit flag — used by the DPS-chart Hyper Carry frameworks for Mast — that lets a
  unit take its burst stage only while the focus (tested) unit is off cooldown (so it bursts
  with the carry, never in a Helm-only chain) AND makes it sit out the full burst after every
  3rd of its own bursts (Mast's Hangover 10s self-stun): the gate skips it on every 4th of the
  focus unit's bursts, and Crown fills that Burst-2 slot. Not a measured value — a modeling
  switch (see [DECISIONS](../DECISIONS.md)).
- **Every-other burst gate** (`burstGate: 'everyOther'`): an opt-in per-unit flag — used by
  the DPS-chart Solo framework on the tested unit — that forbids a unit from taking the
  stage-3 cast in two consecutive Full Bursts, so it strictly alternates with the other
  Burst-3 unit. Needed because a Full-Burst-extending kit (e.g. Modernia's 15-second Full
  Burst) can bring the unit's cooldown inside the next stage window, where the
  first-ready-with-waiting rule would stall the chain and hand it consecutive casts. Not a
  measured value — a framework modeling switch; no real comp sets it.

## 8. Burst rotation rules

**What Full Burst itself does (owner ruling 2026-07-22): the +50% damage multiplier, and nothing
else.** Full Burst carries no inherent change to accuracy, aim, spread, cover behaviour or fire
rhythm — any such effect in a fight comes from a unit's kit firing on Full-Burst entry, never from
the state itself. **How to apply when reading footage:** an in-Full-Burst vs out-of-Full-Burst
comparison of a geometry quantity (pellet landing, core-hit fraction, hit rate) is NOT confounded by
the Full Burst state, so such a split may be used directly as a control for whatever kit buff is
being isolated. Only damage magnitudes need the +50% removed.

Full Burst = 10s; rotation = FB + chain + gauge refill, gated by burst cooldowns. A
Burst-1/2 cast opens the next stage for 10 seconds (DATAMINED `burst_duration`; 5s/15s/
20s variants exist — the same column encodes short-Full-Burst units); if the window
expires with no ready caster the chain collapses and the gauge must fully refill
(measured: the 3-unit battery fight's 40s rotation). Auto-burst picks the FIRST-READY
unit of the wanted stage — inside a timed stage window the filler whose cooldown ends
soonest (tie → leftmost); `B3_LEFTMOST=1` restores the old strict-leftmost pick
(DECISIONS 2026-07-21). Burst cooldowns
(20s/40s per unit; DB errors exist — Tia's real CD is 20s, fixed via
`charFixes.burstCooldownSec`; Cinderella's 40s was re-verified correct by nuke-storm
counting after a cut-in-artifact misread). Λ (all-stage) units count as NO burst type for formation
checks; Tia is a "B1+" (re-entry B1; the Tia+Anis:Star interaction is deliberately
unmodeled). `reenterStage` (Tia, Anis Everyone's Star) re-opens stage 1 mid-rotation;
`burstFirst` (Prika duet) claims the first burst of its stage; once-per-battle CD refunds
exist (Red Hood B1/B2). Burst-cast damage timing (MEASURED 2026-07-13, popup-verified on Cinderella's nuke
across two fights): burst-skill damage dealt at cast lands BEFORE Full Burst begins — it
receives neither the +50% Full Burst multiplier NOR "when entering Full Burst" auras
(one rule covers both; independently corroborated by the JP DayWrite formula article).
Buffs granted by earlier casts in the same rotation (a Burst-2's team buff) DO apply.
Burst-originated damage landing DURING the window (DoT ticks, stored hits, per-shot
procs) still gets the +50% and the entry auras. Engine ordering: burst-cast blocks
resolve before full-burst-entry triggers; stored-hit releases after. Scope note
(2026-07-13): the measured rule governs the burst button's OWN cast damage; a skill-slot
effect that merely triggers on a burst cast resolves after the window opens and does get
the +50% (though not same-cast self-buffs or entry auras) — this distinction is why Snow
White: Heavy Arms's Fully Active volley was re-modeled onto her in-window full-charge
shots (see damage-calculation.md §2b), where the community sources place it. Sources: leftmost priority
([Inven](https://m.inven.co.kr/webzine/wznews.php?site=nikke&p=2&idx=303197),
[nikke.gg](https://nikke.gg/mastering-burst-chains-the-core-combat-mechanic-every-nikke-player-needs-to-understand/)),
chain timing ([nikke-synergy](https://nikke-synergy.com/arena-guide_en)), Λ/B1+/CD rulings
(user, 2026-07-13), Red Wolf CD refunds (decoded,
[rcasdzxc/SD](https://github.com/rcasdzxc/SD)).

## 9. Skill procs, DoTs, and damage flavors

"Deals X% of final ATK as additional damage" lines are FUNCTION-type skill damage
(DATAMINED): they **crit at the caster's rate, never core, never get range, take the FB
+50% only when they land during Full Burst**, use the Element and Damage-Up buckets, and
never take charge multipliers. Weapon-based deliveries (launchWeapon: Anis:Star's stars,
Rapi:RH's projectiles) DO core+crit but still no range. DoTs are Sustained-flavored
function damage whose ticks reference CURRENT buffs (not snapshots); tick-crit is
ON by default (`DOT_CRIT`, U13 2026-07-21). **TRUE DAMAGE CAN CRIT** (owner ruling 2026-07-25,
in-game confirmed; reverses the 2026-07-21 "true damage never crits" ruling — which was recorded
but never implemented in the engine: there is no `crit && !trueFlavor` guard, `dealDamage` gates crit on
`opts.crit` alone. So `flavor:"true"` dots/flatDamage + `trueNormals` windows crit at the caster's rate
like any other hit. Sustained/True/Sequential Damage ▲ buffs gate on hit flavor.
Full rules table: **[nikke-damage-formula.md](nikke-damage-formula.md)** §3.

Some kit lines with NO printed "Activates when…" clause are **internal-cooldown skills**:
the effect just fires every N seconds of battle (OWNER-stated mechanic 2026-07-20; first
example: Snow White `snow-white`'s Skill-2 144.73% area damage, cooldown 15 s /owner).
Engine: the `interval` trigger fires every N sec, first at t=N — the first-fire phase
(t=N vs t=0) is a ⚑ convention pending a popup-cadence read.

Shield-gated kit lines ("when/if a Shield is set in front of this unit" — Naga `naga`)
follow the REAL shield machinery (owner-ruled default-off 2026-07-20): "when a Shield is
set" lines fire on the shield-application EVENT (`shielded` trigger); "if a Shield is set"
lines check the live shield-state WINDOW at their own trigger time (`requiresShielded`,
window = the emitting shield's stated duration). No shielder in the team ⇒ the lines are
inert. Same-squad gates ("with an ally from the same squad on the battlefield") are
static team-composition checks, exact at scope lock where no ally ever dies. The
primitive is `teamHas.sameSquad`: squad membership is curated in `src/data/squads.ts`
(characters.json has no squad axis) and the gate fails closed for unmapped owners.
Squad of Blanc `blanc` / Noir `noir` / Rouge `rouge` — owner-confirmed 2026-08-02
(extending the 2026-07-20 Noir ruling; the bunny/maid units are a DIFFERENT squad, a
common misread): Blanc's S2 burst-CDR is gated on it. Noir's same-squad burst line
still uses the older `teamHas.slugs:['blanc','rouge']` spelling (same extension,
migration pending). M.M.R. (Tia `tia` / Naga `naga` / Marciana `marciana`,
owner-confirmed 2026-08-02) is seeded in the map; no gate consumes it yet.

## 10. Elemental advantage

×(1.1 + Element Damage ▲ sources + Superior-element Damage ▲ sources) as its own bucket,
only with advantage; both `elementDamagePct` and `elemAdvantageDamagePct` live here. Wheel:
Fire→Wind→Iron→Electric→Water→Fire. No hidden bonus beyond the base 1.1
([nikke.gg](https://nikke.gg/damage-formula/),
[ore-game](https://ore-game.com/nikke/post/verify-memo/),
[official @NIKKE_en stacking clarification](https://x.com/NIKKE_en/status/1678710452862472193)).

## 11. Buff stacking & targeting rules

- Same buff name + same application scope: re-application REFRESHES (overwrites), never
  co-stacks; same effect from different scopes stacks (KR consensus:
  [arca.live/b/nikketgv/129255162](https://arca.live/b/nikketgv/129255162); official:
  [@NIKKE_en](https://x.com/NIKKE_en/status/1678710452862472193)). IMPLEMENTED 2026-07-13:
  the engine dedupes same (caster, skill slot, stat, value) across trigger blocks — found
  live on Crown's two S1 "Reloading Speed ▲ 44.35%" lines, which the old engine stacked to
  88.7%. (Namu confirms her kit actually targets disjoint groups — burst casters vs
  non-casters — so no unit legitimately receives both lines; the dedupe matches real kit
  structure.)
- **A unit can be IMMUNE to a stat on the receiving side.** Kit lines shaped "Gains immunity to
  Increase/Decrease `<stat>` effects" (`liberalio` skill 2, Charge Speed) are enforced where the
  buff is APPLIED, not where the stat is read: the immune stat is stripped out of the incoming
  buff for that unit only. The strip is per stat and per target — a different stat bundled in the
  same buff block still lands on her (`maxwell`'s skill 1 grants Charge Speed and ATK in one cast:
  the ATK applies, the Charge Speed does not), and every other target of that same cast is
  unaffected. Direction-blind (an increase and a decrease are both stripped) and source-blind
  among kits. **The immunity blocks IN-BATTLE BUFF EFFECTS ONLY — cube and Overload gear stats
  still apply to the holder (owner ruling 2026-08-14)**, which is why enforcing it at buff
  application is the faithful model rather than an approximation: gear stats are resolved into the
  unit at construction and never pass through that path. Encoded as the per-unit
  `charFixes.statImmunities` list (2026-08-14).
- Buff windows come in TWO kinds and they are not interchangeable. Most are **timed** (a
  seconds duration). Kit lines reading "**for N round(s)**" are **round-scoped**: they end
  after the holder fires N bullets, so the window stretches across a reload and shrinks if the
  unit is given attack-speed support. IMPLEMENTED 2026-07-23 as `durationShots` (a round = one
  bullet, `hitsPerShot` for an MG, spent right after the shot so the Nth shot still benefits).
  A round count can be genuinely inexpressible as a duration — helm's burst runs 10 rounds on a
  6-round magazine, so it necessarily spans a reload. NB a "reload speed is **fixed at** x for N
  rounds" line is a stat CLAMP, a different mechanic, still unmodeled.
- A Critical Rate buff may be scoped to **normal attacks only** ("Critical Rate of normal
  attacks ▲x%", helm S1) — it never lifts crit on skill procs or burst damage, even when the
  buff targets the whole team. Distinct from an unscoped "Critical Rate ▲x%".
- "ATK ▲ X% of caster's ATK" adds the CASTER's final ATK × X as a flat term (strong from
  high-ATK buffers); plain ATK ▲ dilutes into the (1+ATK%) sum
  ([nikke.gg damage formula](https://nikke.gg/damage-formula/)).
- Damage Taken ▲ debuffs from different sources stack; no cap found
  ([ginmy.net bracket test](https://ginmy.net/nikke_atkdamagebuff_test)).
- Max Ammunition ▼ clips the CURRENT belt when it lands (MEASURED/user); max-ammo sources
  stack additively. Increases never clip.
- Distributed damage deals the same TOTAL against 1 target as against many (user-verified).
- **Charge Speed above 100% does nothing to charge TIME** (the engine caps it at 100 when it
  computes the charge, `sim.ts`), which is why kits that push past 100 pair it with a conversion
  line: `red-hood`'s "Convert excess value over 100% of Charge Speed to Charge Damage ▲240% of the
  excess" is modeled as the `convertExcess` DERIVED-stat primitive (2026-08-11) — Charge Damage is
  recomputed from her live Charge Speed on every read, so it ramps with her stacks (1.92 at zero →
  93.36 at ten) instead of being baked to an average.
- Pierce Damage ▲ is a **Damage-Up-bucket** entry that benefits any Pierce-damage-type unit —
  static (`hasPierce`/`pierceModes`), during a timed "Gain Pierce for N sec" window
  (`gainPierce` → `pierceUntilFrame`, 2026-07-17), while a **"Gain Pierce for N round(s)" budget is
  unspent** (`gainPierce.durationShots` → `pierceShotsLeft`, 2026-08-11 — a ROUND count, spent by
  firing rather than by the clock, so it survives reloads and lulls; one round per pull,
  `hitsPerShot` per pull for a machine gun, and the granting round never spends it), OR — swap-scoped — on the shots of a burst
  weapon-swap whose "Additional Effect: Pierce" belongs to the swapped weapon only
  (`weaponSwap.hasPierce` → per-shot tag, 2026-07-20, owner-ruled; Snow White `snow-white`'s
  cannon). It **applies on the partless boss** (it is ordinary damage-up, not the double-hit
  below — do not conflate the two).
- Pierce core+body double-hits are a MULTI-PART-boss mechanic
  ([nikke.gg index](https://nikke.gg/index/); TV Tropes corroboration); on the partless
  test boss there is no doubling (OUR A/B test vs run A, 2026-07-13; engine
  `PIERCE_CORE_DOUBLE = false` switch retained).

## 12. Environment & data-source caveats

- Everything assumes 60 fps with the "Min Firing Rounds Adjustment" setting ON; MG/SMG/AR
  DPS is strongly FPS-dependent below that (COMMUNITY).
- blablalink (official) skill data LAGS balance patches — the 2026-07-02
  distributed-damage compensation (SBS +13%, Elegg reworks;
  [@NIKKE_en](https://x.com/NIKKE_en/status/2069084116591796521),
  [nikke.gg patch notes](https://nikke.gg/july-2-patch-notes/),
  [ruliweb notice](https://bbs.ruliweb.com/news/board/320108/read/2290922)) was still
  absent on 2026-07-13; post-patch values are pinned in the affected overrides. Re-verify
  after each sync. Historical DPS-affecting bug catalog:
  [nikke.gg/bug-guide](https://nikke.gg/bug-guide/) (incl. the live Ark Ranger Black DoT
  timing bug).
- Solo-raid displayed per-unit damage totals include all damage the unit dealt to all
  targets (DoTs attributed to their caster).
- **On-screen damage popups belong ONLY to the currently FOCUSED unit** (the unit whose
  third-person camera is active) — user-confirmed 2026-07-13. Popup-based analysis of a
  recording measures one unit's hits, not the team's; the top damage counter still
  aggregates everyone. Record which unit holds focus when capturing footage.
- Shooting-range (사격장) numbers do NOT transfer to solo raid (different core/distance/
  element) — never calibrate against them
  ([arca.live/b/nikketgv/79367873](https://arca.live/b/nikketgv/79367873),
  [dcinside 3902276](https://gall.dcinside.com/mgallery/board/view/?id=gov&no=3902276)).


---

## 3. GROUND TRUTH — the unit's kit prose + base stats (data/characters.json, verbatim)

```json
{
  "slug": "yukiko",
  "name": "Yukiko",
  "weapon": "MG",
  "burst": "III",
  "burstCooldownSec": 40,
  "class": "Attacker",
  "element": "Fire",
  "manufacturer": "Abnormal",
  "normalAttackMultiplier": 5.57,
  "coreAttackMultiplier": 200,
  "ammo": 300,
  "reloadFrames": 171,
  "chargeFrames": 0,
  "chargeMultiplier": 0,
  "hitsPerShot": 1,
  "burstGaugePerShot": 0.05,
  "skills": {
    "skill1": "■ Activates at the start of battle. Affects self.\nPersona - Konohana Sakuya: This effect is continuous and cannot be removed. \nFunction: Yukiko heals her allies using her Persona.\nEffect 1: Activates every 3 sec. Affects all allies. Media: Restores HP equal to 5.7% of the skill user's final max HP.\n■ Activates at the start of battle and when Full Burst ends. Affects self.\nATK ▲ 65.37% for 15 sec.\n■ Activates when 1 More takes effect. Affects all enemies.\nDeals 400.31% of final ATK as distributed damage.",
    "skill2": "■ Activates at the start of battle. Affects self.\nAttack Damage ▲ 55.31% continuously.\n■ Activates when using Burst Skill. \nScarlet Flower: This effect is continuous and cannot be removed.\nFunction: Yukiko strengthens herself.\nEffect 1: Activates every 3 sec. Affects all allies. Mediarama: Restores HP equal to 5.7% of the skill user's final max HP.\nEffect 2: Affects self. Fire Amp: Distributed Damage ▲ 90.01% continuously. This effect cannot be removed.\nEffect 3: Affects self. Scarlet Protection: Damage taken from Water Code enemies ▼ 17.95% continuously. This effect cannot be removed.\nDeactivation condition: When Full Burst ends.\n■ Activates when entering Burst Stage 3. Affects self.\nElemental Advantage Attack Damage ▲ 48.15% for 10 sec.\n■ Activates when 1 More takes effect. Affects all standard Burst 3 allies (except the skill user) in the Persona state.\nFollow Up: ATK ▲ 80.25% of the skill user's ATK for 25 sec.",
    "burst": "■ Affects all enemies.\nDeals 1258.79% of final ATK as distributed damage.\n■ Activates if a Wind Code enemy is present. Affects self.\n1 More: ATK ▲ 45.33% for 10 sec."
  },
  "baseStats": {
    "hp": 13500,
    "atk": 600,
    "def": 75,
    "core": {
      "hp": 200,
      "atk": 200,
      "def": 200
    },
    "grade": {
      "hp": 3000,
      "atk": 20,
      "def": 100,
      "ratio": 200
    },
    "critRate": 15,
    "maxLevel": 1400,
    "critDamage": 150,
    "resourceId": 871
  }
}
```

---

## 4. S2b TEST-FAITHFULNESS REVIEW (claude-fable-5, blind — written BEFORE the driver's tests were shown to it)

{
  "slug": "yukiko",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Media: Restores HP equal to 5.7%",
      "disposition": "FAITHFUL",
      "scope": "heal event, no HP pool modeled; magnitude (5.7% caster max HP) is display-only, the EVENT is the mechanic",
      "durationSemantics": "continuous for the whole fight ('continuous and cannot be removed'), repeating every 3 sec",
      "triggerIdentity": "interval sec:3 (kit says 'Activates every 3 sec' inside a battle-start continuous state); first fire at t=3 per convention",
      "targetSet": "all allies (including self)",
      "nearestWrongModel": "skipped as 'defensive, no damage' \u2014 the taxonomy-#4 trap: a heal inert alone drives teammates' on-recovery kits (crown is the fixture's B2)",
      "distinguishingAssertion": "in controlComp('yukiko'), crown's recovery-triggered buffApply events appear at ~3s cadence from battle start, BEFORE any full burst; red if the heal is dropped (crown's recovery kit stays silent outside other heal sources)",
      "inertness": "must not deal damage or grant any stat; only 'heal' events",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "ATK \u25b2 65.37% for 15 sec",
      "disposition": "FAITHFUL",
      "scope": "generic ATK (atkPct), scales her own ATK",
      "durationSemantics": "durationSec 15 \u2014 wall-clock seconds, refreshed per trigger; NOT permanent, so there are real uptime gaps between FB-end+15s and the next FB-end",
      "triggerIdentity": "TWO triggers: battleStart AND fullBurstEnd. Read literally: 'when Full Burst ends' = fullBurstEnd, never fullBurstEnter",
      "targetSet": "self",
      "nearestWrongModel": "keyed to fullBurstEnter (shifts the 15s window ~10s earlier, covering the FB window instead of the post-FB refill window) or made permanent ('continuously' bleed-over from the neighboring line)",
      "distinguishingAssertion": "buffApply {stat:'atkPct', value:65.37, target yukiko} at frame 0 AND at each fullBurstEnd frame, with expiresFrame = apply+900; ZERO applications at fullBurstStart frames; red under fullBurstEnter keying",
      "inertness": "no application mid-FB; no application on burstCast frames",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Deals 400.31% of final ATK as distributed",
      "disposition": "FAITHFUL",
      "scope": "function damage, distributed flavor; rider rules: no core, no range, crits per rider convention; burst-cast-timed damage is FB-exempt (lands pre-FB)",
      "durationSemantics": "instant hit per activation",
      "triggerIdentity": "'when 1 More takes effect' \u2014 1 More is granted ONLY by her own burst, and ONLY 'if a Wind Code enemy is present'. Faithful encoding: burstCast + bossElementGate 'Wind'. INERT vs the Fire control boss",
      "targetSet": "all enemies (one boss)",
      "nearestWrongModel": "the gate chain dropped: 400.31% fired on every yukiko burst cast regardless of boss element \u2014 a large per-rotation over-credit vs the Fire fixture",
      "distinguishingAssertion": "in controlComp (boss Fire), count of yukiko skill1-bucket flatDamage events at the 400.31% magnitude === 0 across the whole fight; red under ungated encoding (\u22651 per yukiko burst cast)",
      "inertness": "must NOT move damage vs any non-Wind boss; must not fire on helm-led rotations even vs Wind",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Attack Damage \u25b2 55.31% continuously",
      "disposition": "FAITHFUL",
      "scope": "'Attack Damage' = Damage-Up bucket (attackDamagePct), NOT ATK",
      "durationSemantics": "permanent ('continuously', battle-start, no deactivation clause)",
      "triggerIdentity": "battleStart / passive",
      "targetSet": "self",
      "nearestWrongModel": "encoded as atkPct 55.31 \u2014 wrong bucket (ATK multiplies differently than the additive Damage-Up bucket, and dilutes differently against support buffs)",
      "distinguishingAssertion": "buffApply at frame 0 with stat === 'attackDamagePct' and value 55.31, no expiry; red if stat === 'atkPct'",
      "inertness": "self-only \u2014 no buffApply targeting allies",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Mediarama: Restores HP ... 5.7%",
      "disposition": "FAITHFUL",
      "scope": "heal event to all allies, every 3 sec, only while Scarlet Flower is live",
      "durationSemantics": "window = her OWN burst cast \u2192 the following Full Burst END ('Deactivation condition: When Full Burst ends') \u2248 10.4s (22f pre-FB gap + 10s FB) \u2014 \u2691 the span as durationSec is a derived constant, not kit-literal",
      "triggerIdentity": "burstCast (self mode in her own burst-usage block: 'Activates when using Burst Skill'), NOT fullBurstEnter \u2014 diverges in this fixture because helm is a second B3",
      "targetSet": "all allies",
      "nearestWrongModel": "keyed to fullBurstEnter (fires on helm-led full bursts too) or 'continuous and cannot be removed' read as permanent, ignoring the deactivation clause",
      "distinguishingAssertion": "extra ally recovery-driven events (beyond the S1 3s baseline) occur ONLY between yukiko's burstCast frames and the next fullBurstEnd; red if they appear during helm-led FB windows or persist after FB end",
      "inertness": "no heal events from this block outside her own burst\u2192FB-end windows",
      "evidenceTier": "DATAMINED (magnitude) / CALIBRATED \u2691 (window span)",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Fire Amp: Distributed Damage \u25b2 90.01%",
      "disposition": "FAITHFUL",
      "scope": "distributedDamagePct \u2014 boosts ONLY the caster's own distributed-flavor hits (her 1258.79% burst nuke, the Wind-gated 400.31% rider); her MG normals are NOT distributed and must not read it",
      "durationSemantics": "same Scarlet Flower window: burstCast \u2192 fullBurstEnd ('continuously' within the state; 'cannot be removed' \u2260 permanent \u2014 the state itself deactivates)",
      "triggerIdentity": "burstCast, self. ORDERING is load-bearing: the amp must be applied before the same cast's 1258.79% hit resolves, or her single biggest hit ships un-amped",
      "targetSet": "self",
      "nearestWrongModel": "encoded as generic attackDamagePct (over-credits every MG normal for the window) \u2014 or applied AFTER the burst damage resolves, silently zeroing its entire real effect on the fixture",
      "distinguishingAssertion": "the damage event for the 1258.79% burst hit carries the +90.01 Damage-Up term in its mult decomposition, while yukiko shot-bucket damage events inside the same window do NOT; red under attackDamagePct encoding (normals move) and red under post-hit ordering (burst hit lacks it)",
      "inertness": "yukiko normal-attack damage per shot identical inside vs outside the Scarlet Flower window (holding other buffs fixed)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Damage taken from Water Code \u25bc 17.95%",
      "disposition": "UNMODELED",
      "scope": "defensive self damage-reduction vs Water enemies \u2014 no incoming-damage model in v1",
      "durationSemantics": "Scarlet Flower window",
      "triggerIdentity": "part of the burst-usage state block",
      "targetSet": "self",
      "nearestWrongModel": "misread as an offensive element buff vs Water enemies",
      "distinguishingAssertion": "no damage-side event of any kind attributable to this line; totals unchanged when it is absent",
      "inertness": "fully inert \u2014 must appear verbatim in unmodeled, not as a block",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Elemental Advantage Attack Damage \u25b248.15%",
      "disposition": "FAITHFUL",
      "scope": "elemAdvantageDamagePct \u2014 Element bucket, live ONLY under elemental advantage (taxonomy #8); yukiko is Fire, the control boss is Fire \u2192 INERT on the fixture, real vs Wind bosses",
      "durationSemantics": "durationSec 10",
      "triggerIdentity": "stageEnter {stage:3} \u2014 'when entering Burst Stage 3' = the chain REACHES stage 3 (fires 30f before the stage-3 cast), on EVERY rotation, including ones helm bursts. Not burstCast, not stageCast",
      "targetSet": "self",
      "nearestWrongModel": "encoded as generic attackDamagePct 48.15 (moves damage vs the non-advantaged Fire boss \u2014 the exact over-credit the elemAdvantage stat exists to prevent), or keyed to her own burstCast (missing on helm-led rotations)",
      "distinguishingAssertion": "buffApply {stat:'elemAdvantageDamagePct', value:48.15} at every stage-3 entry including helm-led rotations, AND yukiko's total damage vs the Fire boss is IDENTICAL when this value is patched to 0 via withPatchedOverride; red under attackDamagePct (totals move) and red under burstCast keying (missing applications)",
      "inertness": "zero damage movement vs any boss yukiko lacks advantage against",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Follow Up: ATK \u25b2 80.25% of skill user's",
      "disposition": "GAP",
      "scope": "casterAtkPct 80.25 \u2192 flat ATK add ((80.25/100)\u00d7yukiko staticAtk) granted to OTHER standard-B3 allies in the Persona state",
      "durationSemantics": "durationSec 25",
      "triggerIdentity": "'when 1 More takes effect' \u2192 same double gate as the S1 nuke: her own burst cast + Wind boss. Doubly inert on the fixture (Fire boss; helm is not a Persona-state unit)",
      "targetSet": "all standard Burst 3 allies EXCEPT self, restricted to units 'in the Persona state' \u2014 no Persona-state target primitive exists in the schema; the honest encoding is a teamHas.slugs gate over the Persona-collab roster or unmodeled-with-note",
      "nearestWrongModel": "targeting ALL B3 allies ungated on Persona state AND with the Wind gate dropped \u2014 helm receives a large flat-ATK grant every yukiko burst on the control fixture",
      "distinguishingAssertion": "in controlComp (boss Fire, helm B3), count of buffApply {stat:'casterAtkPct'} events from yukiko targeting helm === 0; red under the ungated reading (one per yukiko burst, value \u2248 0.8025\u00d7yukiko staticAtk)",
      "inertness": "must never buff a non-Persona B3, never fire vs a non-Wind boss, never target self",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Deals 1258.79% of final ATK, distributed",
      "disposition": "FAITHFUL",
      "scope": "burst-slot flatDamage, distributed flavor; burst-cast damage is FB-exempt (lands 22f before the FB window opens \u2014 no +50%, no FB-entry auras) and takes no range bonus per rider convention",
      "durationSemantics": "instant, once per her burst cast",
      "triggerIdentity": "burstCast",
      "targetSet": "all enemies (one boss)",
      "nearestWrongModel": "the +50% Full Burst major applied to it (fullBurstEnter timing misread), or the Fire Amp interaction dropped (see skill2 ordering)",
      "distinguishingAssertion": "exactly ONE burst-bucket damage event per yukiko burstCast with fbMajorApplied === false and rangeApplied === false; red if fbMajorApplied is true on any instance",
      "inertness": "zero instances on rotations where helm bursts instead",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "1 More: ATK \u25b2 45.33% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "generic atkPct self-buff \u2014 AND the named-status linchpin: its application is what 'when 1 More takes effect' means for the S1 nuke and the S2 Follow Up",
      "durationSemantics": "durationSec 10",
      "triggerIdentity": "burstCast + bossElementGate 'Wind' ('Activates if a Wind Code enemy is present') \u2014 INERT vs the Fire control boss, so the whole 1-More cascade is fixture-inert",
      "targetSet": "self",
      "nearestWrongModel": "the Wind gate dropped \u2014 the 45.33% ATK, the 400.31% nuke, AND (if mis-targeted) the Follow Up all fire every yukiko burst vs the Fire boss, compounding into one large correlated over-credit",
      "distinguishingAssertion": "in controlComp (boss Fire), count of buffApply {stat:'atkPct', value:45.33} === 0 for the whole fight; red under ungated encoding (one per yukiko burst cast, plus the downstream 400.31% events)",
      "inertness": "vs any non-Wind boss: this buff, the S1 400.31% rider, and the S2 Follow Up must ALL stay at zero events",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:Media heal every 3 sec (interval 3, all allies)",
    "skill1:ATK \u25b265.37% \u00d715s (battleStart + fullBurstEnd)",
    "skill1:400.31% distributed on 1 More (Wind-gated, inertness-tested)",
    "skill2:Attack Damage \u25b255.31% permanent (attackDamagePct, not atkPct)",
    "skill2:Mediarama heal (burstCast\u2192FB-end window)",
    "skill2:Fire Amp distributedDamagePct 90.01 (ordering vs burst hit)",
    "skill2:elemAdvantageDamagePct 48.15 on stageEnter 3 (inert vs Fire boss)",
    "burst:1258.79% distributed nuke (pre-FB, no +50%)",
    "burst:1 More atkPct 45.33 (bossElementGate Wind, inertness-tested)"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Persona - Konohana Sakuya: This effect is continuous and cannot be removed.",
      "Function: Yukiko heals her allies using her Persona."
    ],
    "skill2": [
      "Effect 3: Affects self. Scarlet Protection: Damage taken from Water Code enemies \u25bc 17.95% continuously. This effect cannot be removed.",
      "Follow Up: ATK \u25b2 80.25% of the skill user's ATK for 25 sec. (if no Persona-state target primitive is authored \u2014 must then carry the full trigger/target text, not a silent drop)"
    ],
    "burst": []
  },
  "notes": "Where I expect a shared-prior misread: (1) THE 1-MORE CASCADE \u2014 '1 More' is a named self-status granted only by her burst and only 'if a Wind Code enemy is present'; three separate lines key off it (S1 400.31% nuke, S2 Follow Up, the burst ATK buff). Dropping the Wind gate anywhere turns three fixture-inert lines live at once, so the tests need explicit zero-event inertness assertions vs the Fire control boss for all three, not just structural checks. (2) SCARLET FLOWER WINDOW \u2014 'Activates when using Burst Skill' + 'Deactivation condition: When Full Burst ends' is a burstCast-keyed, FB-end-bounded state; the two tempting misreads are fullBurstEnter keying (over-credits on helm-led rotations \u2014 the control fixture deliberately has a second B3) and reading 'continuous and cannot be removed' as permanent (the clause means undispellable, not unending). The ~10.4s span, if encoded as durationSec, is a derived \u2691 constant. (3) FIRE AMP ORDERING \u2014 distributedDamagePct only touches her distributed hits, and on the fixture the ONLY distributed hit inside the window is the 1258.79% nuke landing on the SAME cast frame; buff-before-damage ordering is therefore the entire observable effect of the line, and a test must assert the amp inside that hit's mult decomposition, not merely that a buffApply exists. (4) 'Elemental Advantage Attack Damage' must be elemAdvantageDamagePct (fixture-inert, Fire vs Fire) \u2014 a generic attackDamagePct encoding is the classic taxonomy-#8 over-credit and is directly detectable by a patched-to-zero A/B on totals. (5) The S1 heal must not be skipped as defensive: crown sits in the control fixture and her on-recovery kit is the tandem consumer that makes the 3s heal cadence observable. (6) Ambiguity to reconcile with the driver: 'when 1 More takes effect' could in principle include an ALLY'S 1 More (Persona-collab team mechanic); read literally against this kit alone the only in-scope source is her own burst, and no Persona teammate exists in the fixture, so I specced the self-source reading \u2014 flag it if the driver assumed team-wide. NOTE: I have no file-write access in this run; this JSON is returned inline and should be saved to scripts/kit-autonomy/reviews/yukiko.test-review.json by the orchestrator.",
  "model": "claude-fable-5"
}

---

## 5. S5 BLIND TEST (claude-opus-5, written from kit prose alone)

Result vs the DRIVER override (section 7b): **10 passed / 5 skipped / 0 failed** (vitest, deterministic expected-value sim). The 5 skips are the blind author's OWN documented gaps: Follow Up (no Persona-state target primitive), Scarlet Protection (defensive, unobservable at scope lock), heal magnitude (no HP pool), Fire-Amp-on-same-cast-nuke ordering (judged MEASUREMENT-GATED by the blind author; the driver's test pins the engine's documented block order instead), elemental-advantage damage effect (blind fixture uses a Fire boss only — no advantage; the driver's suite covers a Wind-boss run).

```typescript
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

/**
 * yukiko — MG / Fire / Attacker / Burst III. BLIND kit-spec test, written from the kit prose alone.
 *
 * FIXTURE: controlComp('yukiko', false) — liter (B1) + crown (B2) + yukiko (B3).
 *   - B1 + B2 are mandatory: a lone Burst III never casts and the fight makes ZERO Full Bursts.
 *   - The fixed second B3 (the SR/Water slot) is dropped ON PURPOSE. With two B3s the stage-3 cast
 *     alternates, so yukiko's OWN burst count — i.e. how many Scarlet Flower windows exist — stops
 *     being deterministic, and that unit's ally buffs sit inside every counterfactual delta.
 *   - crown STAYS: there is no heal/recovery event kind in the log, so yukiko's Persona heal is only
 *     observable through a teammate's on-recovery buffApply. crown is that consumer.
 *   - Boss element is Fire (harness default) and yukiko is Fire => NO elemental advantage, so the S2
 *     Elemental-Advantage buff is damage-INERT on this fixture (asserted structurally, never by damage),
 *     and no Wind Code enemy exists => the whole 1 More cluster must be gate-inert.
 *
 * OVERRIDE SHAPE: the harness packet documents two readings of a slot value (Block[] vs
 * { blocks: Block[] }), so every patch helper below handles BOTH and writes back through the same
 * shape it found. Each counterfactual also asserts it actually REMOVED something — a patch that
 * removes nothing is a vacuous test, and a zero count is itself the MISSING-line detector.
 */

const SLUG = 'yukiko';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;
const FPS = 60;

type Rec = Record<string, unknown>;

interface BuffEv {
  kind: string;
  stat?: string;
  key?: string;
  value?: number;
  casterIdx?: number | null;
  targetIdx?: number | null;
  targetSlug?: string;
  expiresFrame?: number;
}

interface DmgEv {
  kind: string;
  bucket?: string;
  inFullBurst?: boolean;
  fbMajorApplied?: boolean;
}

const asBuffs = (evs: SimEvent[]): BuffEv[] =>
  evs.filter((e) => (e as unknown as BuffEv).kind === 'buffApply') as unknown as BuffEv[];
const asDmg = (evs: SimEvent[]): DmgEv[] =>
  evs.filter((e) => (e as unknown as DmgEv).kind === 'damage') as unknown as DmgEv[];
const kindsOf = (evs: SimEvent[]): string[] =>
  evs.map((e) => (e as unknown as { kind: string }).kind);
const near = (a: number | undefined, b: number, eps = 0.05): boolean =>
  a !== undefined && a !== null && Math.abs(a - b) < eps;

// ---- shape-agnostic override patch helpers ---------------------------------------------------

function blocksOf(ov: Rec, slot: string): Rec[] {
  const s = ov[slot];
  if (Array.isArray(s)) return s as Rec[];
  if (s && typeof s === 'object' && Array.isArray((s as Rec).blocks)) {
    return (s as { blocks: Rec[] }).blocks;
  }
  return [];
}

function setBlocksOf(ov: Rec, slot: string, next: Rec[]): void {
  const s = ov[slot];
  if (Array.isArray(s)) ov[slot] = next;
  else if (s && typeof s === 'object' && Array.isArray((s as Rec).blocks)) {
    (s as { blocks: Rec[] }).blocks = next;
  }
}

function eachBlock(ov: Rec, fn: (b: Rec, slot: string) => void): void {
  for (const slot of SLOTS) for (const b of blocksOf(ov, slot)) fn(b, slot);
}

/** Remove every effect matching pred; drop blocks left with no effects. Returns removal count. */
function dropEffects(ov: Rec, pred: (e: Rec, b: Rec, slot: string) => boolean): number {
  let removed = 0;
  for (const slot of SLOTS) {
    const kept: Rec[] = [];
    for (const b of blocksOf(ov, slot)) {
      const effs = (b.effects as Rec[] | undefined) ?? [];
      const remaining = effs.filter((e) => {
        if (pred(e, b, slot)) {
          removed += 1;
          return false;
        }
        return true;
      });
      b.effects = remaining;
      if (remaining.length > 0) kept.push(b);
    }
    setBlocksOf(ov, slot, kept);
  }
  return removed;
}

function run(mutate?: (ov: Rec) => void): { res: ReturnType<typeof runComp>; events: SimEvent[] } {
  const events: SimEvent[] = [];
  const opts = controlComp(SLUG, false) as unknown as Rec;
  if (mutate) {
    opts.overrides = {
      [SLUG]: withPatchedOverride(SLUG, (ov) => {
        mutate(ov as unknown as Rec);
      }),
    };
  }
  const cfg = ((opts.cfg as Rec | undefined) ?? {}) as Rec;
  cfg.onEvent = (ev: SimEvent) => {
    events.push(ev);
  };
  opts.cfg = cfg;
  const res = runComp(opts as unknown as Parameters<typeof runComp>[0]);
  return { res, events };
}

const others = (res: ReturnType<typeof runComp>): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(totals(res))) if (k !== SLUG) out[k] = v;
  return out;
};
const teamTotal = (res: ReturnType<typeof runComp>): number =>
  Object.values(totals(res)).reduce((a, b) => a + b, 0);

// ---- hoisted runs (each is a full 180s sim; 7 total) ------------------------------------------

const removed = {
  heal: 0,
  scarletHeal: 0,
  windGates: 0,
  s2AtkDmg: 0,
  amp: 0,
  nuke: 0,
};

const base = run();

// every heal source stripped — isolates the Persona / Mediarama tandem
const healOff = run((ov) => {
  removed.heal = dropEffects(ov, (e) => e.kind === 'heal');
});

// only the burst-triggered (Scarlet Flower) heal stripped — proves it is a SECOND, separate source
const scarletHealOff = run((ov) => {
  removed.scarletHeal = dropEffects(ov, (e, b, slot) => {
    if (e.kind !== 'heal') return false;
    const trig = (b.trigger as Rec | undefined)?.kind;
    return trig === 'burstCast' || slot === 'skill2' || slot === 'burst';
  });
});

// boss-element gates removed — turns the Wind-only 1 More cluster ON so its inertness is provably a
// GATE and not a missing line
const windOff = run((ov) => {
  let n = 0;
  eachBlock(ov, (b) => {
    if (b.bossElementGate !== undefined) {
      delete b.bossElementGate;
      n += 1;
    }
  });
  removed.windGates = n;
});

const s2AtkOff = run((ov) => {
  removed.s2AtkDmg = dropEffects(
    ov,
    (e) => e.kind === 'buff' && e.stat === 'attackDamagePct' && near(e.value as number, 55.31),
  );
});

const ampOff = run((ov) => {
  removed.amp = dropEffects(
    ov,
    (e) => e.kind === 'buff' && e.stat === 'distributedDamagePct' && near(e.value as number, 90.01),
  );
});

const nukeOff = run((ov) => {
  removed.nuke = dropEffects(
    ov,
    (e) => e.kind === 'flatDamage' && near(e.atkPct as number, 1258.79, 0.5),
  );
});

const baseKinds = kindsOf(base.events);
const baseBuffs = asBuffs(base.events);
const yIdx = baseBuffs.find((b) => b.targetSlug === SLUG)?.targetIdx ?? -1;
const onYukiko = (b: BuffEv): boolean => b.targetSlug === SLUG || (yIdx >= 0 && b.targetIdx === yIdx);

describe('yukiko — blind kit spec', () => {
  it('fixture is non-vacuous: the chain casts, Full Bursts happen, yukiko deals damage', () => {
    expect(yIdx).toBeGreaterThanOrEqual(0);
    expect(baseKinds.filter((k) => k === 'burstCast').length).toBeGreaterThanOrEqual(6);
    expect(baseKinds.filter((k) => k === 'fullBurstStart').length).toBeGreaterThanOrEqual(3);
    expect(baseKinds.filter((k) => k === 'fullBurstEnd').length).toBeGreaterThanOrEqual(3);
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(totals(base.res)[SLUG]).toBeGreaterThan(0);
  });

  // S1 line 1 — Persona: continuous from battle start, Effect 1 heals ALL ALLIES every 3 sec.
  // Discriminates against: heal dropped as defensive/inert (delta 0), or modeled as a single
  // battle-start heal / a much slower interval (delta far below one apply per 3s window).
  it('S1 Persona heals all allies on a 3s cadence, driving the on-recovery teammate', () => {
    expect(removed.heal).toBeGreaterThanOrEqual(1);
    const baseApplies = baseBuffs.length;
    const noHealApplies = asBuffs(healOff.events).length;
    expect(noHealApplies).toBeLessThan(baseApplies);
    // a 3s cadence over a 180s fight is ~60 recovery events; a one-shot or a 15s+ interval cannot
    // clear this bar
    expect(baseApplies - noHealApplies).toBeGreaterThanOrEqual(10);
    // the extra ally buffs the heal unlocks must not REDUCE team output
    expect(teamTotal(base.res)).toBeGreaterThanOrEqual(teamTotal(healOff.res));
  });

  // S1 line 2 — ATK 65.37% for 15 sec, at battle start AND on every Full Burst END.
  // Discriminates against: battle-start only (count collapses to 1), fullBurstENTER keying (the
  // nearest boundary before each re-apply would be fullBurstStart), and a permanent/continuous
  // encoding (expiresFrame would not be a 15s window off frame 0).
  it('S1 grants self ATK 65.37% for 15s at battle start and again at every Full Burst END', () => {
    const idxs: number[] = [];
    base.events.forEach((e, i) => {
      const b = e as unknown as BuffEv;
      if (b.kind === 'buffApply' && near(b.value, 65.37) && onYukiko(b)) idxs.push(i);
    });
    expect(idxs.length).toBeGreaterThanOrEqual(3);

    const first = base.events[idxs[0]] as unknown as BuffEv;
    expect(first.stat).toBe('atkPct');
    // battle-start application sits at frame 0, so a 15s window expires at 900f
    expect(first.expiresFrame ?? -1).toBeGreaterThanOrEqual(15 * FPS - 20);
    expect(first.expiresFrame ?? -1).toBeLessThanOrEqual(15 * FPS + 20);

    for (const i of idxs.slice(1)) {
      let boundary = '';
      for (let j = i - 1; j >= 0; j -= 1) {
        const k = baseKinds[j];
        if (k === 'fullBurstStart' || k === 'fullBurstEnd') {
          boundary = k;
          break;
        }
      }
      expect(boundary).toBe('fullBurstEnd');
    }
  });

  // S1 line 3 — 400.31% distributed damage, and BURST line 2 — self ATK 45.33% for 10s: both keyed
  // to 1 More, which only takes effect with a Wind Code enemy present. The scope-lock boss is Fire,
  // so both must be INERT here — but authored and gated, not dropped. Deleting the element gate is
  // the non-vacuity proof: the effects must then appear.
  it('1 More cluster is Wind-gated: inert vs a Fire boss, live once the gate is removed', () => {
    expect(removed.windGates).toBeGreaterThanOrEqual(1);
    // inert on the control comp
    expect(baseBuffs.filter((b) => near(b.value, 45.33) && onYukiko(b))).toHaveLength(0);
    // gate removed: the self ATK buff fires on each of her burst casts, and the distributed rider
    // adds damage instances + total
    const lit = asBuffs(windOff.events).filter((b) => near(b.value, 45.33));
    expect(lit.length).toBeGreaterThanOrEqual(2);
    expect(lit[0].stat).toBe('atkPct');
    expect(asDmg(windOff.events).length).toBeGreaterThan(asDmg(base.events).length);
    expect(totals(windOff.res)[SLUG]).toBeGreaterThan(totals(base.res)[SLUG]);
  });

  // S2 line 1 — Attack Damage 55.31% continuously, SELF. Discriminates against: an allies-scoped
  // encoding (any non-yukiko target), and against the line being absent (removal count 0 / no delta).
  it('S2 Attack Damage 55.31% is a continuous SELF buff and moves only yukiko', () => {
    expect(removed.s2AtkDmg).toBeGreaterThanOrEqual(1);
    expect(totals(s2AtkOff.res)[SLUG]).toBeLessThan(totals(base.res)[SLUG]);
    expect(others(s2AtkOff.res)).toEqual(others(base.res));
    const leaked = baseBuffs.filter(
      (b) => b.stat === 'attackDamagePct' && near(b.value, 55.31) && !onYukiko(b),
    );
    expect(leaked).toHaveLength(0);
  });

  // S2 line 2 — Scarlet Flower: triggered by USING the Burst Skill (own cast), deactivating at Full
  // Burst end. Effect 2 is Fire Amp: Distributed Damage 90.01% on self.
  // Discriminates against: a passive/continuous encoding (one application at frame 0 with a
  // whole-fight window) and against fullBurstEnter keying, which would apply on team FBs she did not
  // cast; and the removal count catches the line being dropped entirely.
  it('S2 Scarlet Flower re-arms per own burst cast and its Fire Amp is a bounded self window', () => {
    expect(removed.amp).toBeGreaterThanOrEqual(1);
    const amp = baseBuffs.filter(
      (b) => b.stat === 'distributedDamagePct' && near(b.value, 90.01) && onYukiko(b),
    );
    expect(amp.length).toBeGreaterThanOrEqual(2);
    for (const a of amp) {
      expect(a.expiresFrame ?? Number.MAX_SAFE_INTEGER).toBeLessThanOrEqual(190 * FPS);
    }
    // self-scoped, and it can never LOWER her damage
    expect(baseBuffs.filter((b) => b.stat === 'distributedDamagePct' && !onYukiko(b))).toHaveLength(0);
    expect(totals(ampOff.res)[SLUG]).toBeLessThanOrEqual(totals(base.res)[SLUG]);
    expect(others(ampOff.res)).toEqual(others(base.res));
  });

  // S2 line 2 / Effect 1 — Mediarama: a SECOND every-3-sec ally heal that exists only while Scarlet
  // Flower is up. Discriminates against folding both heal lines into one source (removal count 0, or
  // no additional recovery events during the burst windows).
  it('S2 Scarlet Flower adds its own ally heal on top of the S1 Persona heal', () => {
    expect(removed.scarletHeal).toBeGreaterThanOrEqual(1);
    expect(asBuffs(scarletHealOff.events).length).toBeLessThan(baseBuffs.length);
  });

  // S2 line 3 — Elemental Advantage Attack Damage 48.15% for 10 sec, on ENTERING Burst Stage 3.
  // stageEnter LEADS the stage-3 cast by the 30f chain gap, so a burstCast/stageCast encoding would
  // land the apply AFTER the last cast of the chain. The discriminator is purely ordinal (no frame
  // field needed): under the faithful reading a burstCast still occurs between the apply and the
  // Full Burst that follows it; under the nearest-wrong reading none does.
  it('S2 elemental-advantage buff applies at Burst Stage 3 ENTRY, ahead of the stage-3 cast', () => {
    const idxs: number[] = [];
    base.events.forEach((e, i) => {
      const b = e as unknown as BuffEv;
      if (b.kind === 'buffApply' && b.stat === 'elemAdvantageDamagePct' && near(b.value, 48.15)) {
        idxs.push(i);
      }
    });
    expect(idxs.length).toBeGreaterThanOrEqual(2);
    expect((base.events[idxs[0]] as unknown as BuffEv).targetSlug ?? SLUG).toBe(SLUG);

    let checked = 0;
    for (const i of idxs.slice(0, 3)) {
      const nextFb = baseKinds.findIndex((k, j) => j > i && k === 'fullBurstStart');
      if (nextFb < 0) continue;
      const castBetween = baseKinds.some(
        (k, j) => j > i && j < nextFb && k === 'burstCast',
      );
      expect(castBetween).toBe(true);
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(1);
  });

  // BURST line 1 — 1258.79% of final ATK as distributed damage to all enemies. Burst-cast damage
  // lands BEFORE the Full Burst window opens, so it never takes the +50% Full Burst major.
  it('burst deals its 1258.79% distributed nuke, and it is Full-Burst exempt', () => {
    expect(removed.nuke).toBeGreaterThanOrEqual(1);
    const dropRatio = 1 - totals(nukeOff.res)[SLUG] / totals(base.res)[SLUG];
    expect(dropRatio).toBeGreaterThan(0.02);

    const burstDmg = asDmg(base.events).filter((d) =>
      String(d.bucket ?? '').toLowerCase().includes('burst'),
    );
    expect(burstDmg.length).toBeGreaterThanOrEqual(2);
    expect(burstDmg.every((d) => d.fbMajorApplied !== true)).toBe(true);
  });

  // ---- GAPS -----------------------------------------------------------------------------------

  // S2 line 4 — Follow Up: ATK 80.25% of the skill user's ATK for 25s to all standard Burst 3 allies
  // (except the user) IN THE PERSONA STATE. Two blockers: (a) it is 1-More gated, so inert vs a Fire
  // boss; (b) there is no target primitive for all-Burst-III-allies, and none at all for the Persona
  // state, so the target set cannot be expressed faithfully. Inertness is still asserted below.
  it.skip('S2 Follow Up targets Burst-III allies in the Persona state — GAP: no target primitive', () => {
    expect(true).toBe(true);
  });

  it('S2 Follow Up grants nothing on the control comp (Wind-gated, no eligible ally)', () => {
    const followUp = baseBuffs.filter(
      (b) => b.stat === 'casterAtkPct' && yIdx >= 0 && b.casterIdx === yIdx && b.targetIdx !== yIdx,
    );
    expect(followUp).toHaveLength(0);
  });

  // S2 line 2 / Effect 3 — Scarlet Protection: damage taken from Water Code enemies down 17.95%.
  // Purely defensive; the scope-lock boss deals no damage, so there is nothing to observe.
  it.skip('S2 Scarlet Protection is defensive — UNMODELED at scope lock', () => {
    expect(true).toBe(true);
  });

  // The heal MAGNITUDE (5.7% of the skill user's final Max HP, both Media and Mediarama) is not
  // representable: the heal effect carries no HP amount and no HP pool exists at scope lock.
  it.skip('heal magnitude 5.7% of final Max HP — GAP: no HP pool / heal carries no amount', () => {
    expect(true).toBe(true);
  });

  // Whether Fire Amp (Distributed Damage 90.01%) reaches yukiko's OWN burst nuke is a cast-frame
  // ordering question the kit does not settle: Scarlet Flower activates ON the same burst cast that
  // fires the 1258.79% distributed hit. MEASUREMENT-GATED — a popup read of her burst number with and
  // without the amp decides it; asserting either direction blind would pin a guess.
  it.skip('does Fire Amp amplify the same-cast burst nuke — MEASUREMENT-GATED (cast-frame ordering)', () => {
    expect(true).toBe(true);
  });

  // The elemental-advantage buff cannot be verified on the DAMAGE side here: yukiko is Fire and the
  // harness boss is Fire, so the element bucket is never advantaged and the buff contributes 0.
  // A Wind-boss fixture would be needed; the harness exposes no documented boss-element knob.
  it.skip('elemental-advantage buff damage effect — no advantage vs the Fire boss fixture', () => {
    expect(true).toBe(true);
  });
});

```

---

## 6. S6 BLIND OVERRIDE (claude-opus-5, written from kit prose alone)

### 6a. The blind override

```json
{
  "slug": "yukiko",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "interval",
        "sec": 3
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "heal"
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "battleStart"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 65.37,
          "durationSec": 15
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 65.37,
          "durationSec": 15
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "enemy"
      },
      "bossElementGate": "Wind",
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 400.31,
          "flavor": "distributed"
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 55.31
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "heal",
          "ticks": 3,
          "intervalSec": 3
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "distributedDamagePct",
          "value": 90.01,
          "durationSec": 10.4
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "stageEnter",
        "stage": 3
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "elemAdvantageDamagePct",
          "value": 48.15,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "alliesLowestAtk",
        "count": 4,
        "burst": "III",
        "excludeSelf": true
      },
      "bossElementGate": "Wind",
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 80.25,
          "durationSec": 25
        }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 1258.79,
          "flavor": "distributed"
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "self"
      },
      "bossElementGate": "Wind",
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 45.33,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "Effect 3: Affects self. Scarlet Protection: Damage taken from Water Code enemies \u25bc 17.95% continuously. This effect cannot be removed."
    ],
    "burst": []
  },
  "caveats": [
    "\u2691 1 More: the burst's 1 More clause is literally gated on a Wind Code enemy being present, and BOTH the skill1 400.31% distributed hit and the skill2 Follow Up ATK grant are keyed to '1 More takes effect'. All three carry bossElementGate:'Wind', so all three are INERT against a non-Wind boss (including the neutral scope-lock boss). If in-game 1 More actually fires unconditionally and only the ATK\u25b245.33% is Wind-gated, this under-credits her by an entire 400.31% rider plus a team ATK grant \u2014 read the highest-priority open item before trusting any damage number.",
    "\u2691 Scarlet Flower duration: the kit states an EVENT deactivation ('When Full Burst ends'), not a timer. Encoded as durationSec 10.4 on the self Distributed Damage \u25b290.01% (own Burst-III cast \u2192 22f chain gap \u2192 10s Full Burst). Any rotation where she does not complete the chain, or a Full Burst extended by an ally, makes this wrong in both directions.",
    "\u2691 Follow Up target set: the kit says 'all standard Burst 3 allies (except the skill user) in the Persona state'. The schema has no Persona-state facet, so the block targets alliesLowestAtk{count:4, burst:'III', excludeSelf:true} \u2014 the B3-except-self filter is faithful (count 4 \u2265 the population, so the ATK ranking never bites), the 'in the Persona state' clause is DROPPED and OVER-CREDITS any B3 ally that is not a Persona unit.",
    "\u2691 Heals carry no HP amount: the engine's heal effect emits recovery events only, so the 5.7%-of-final-max-HP magnitude on both Media (skill1) and Mediarama (skill2) is unmodeled. Both are also modeled as SEPARATE 3-second channels, so during her Scarlet Flower window a heal-synergy teammate (on-recovery consumers) receives roughly double the recovery events it may actually get in game.",
    "\u2691 Cadence: MG datamine fields (reloadFrames 171, rate_of_fire, hitsPerShot 1) are the known-unreliable family and are inherited unchanged from base stats \u2014 hitsPerShot 1 on an MG is itself suspicious.",
    "Scarlet Protection (Water Code damage taken \u25bc17.95%) is defensive with no consumer at scope (immortal boss, no HP pool) and is recorded in unmodeled, not as a block."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS \u2014 NOT a validated model). Every \u2691 below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Second, independent prose\u2192JSON read of yukiko (MG/Fire/Attacker/Burst III) authored BLIND from raw kit text + the schema; no override, test, probe data, board output or git history consulted. Damage surface: burst 1258.79% distributed + a 400.31% distributed rider on 1 More, both boosted by her own Fire Amp Distributed Damage \u25b290.01% while Scarlet Flower is live. Sustain surface: Attack Damage \u25b255.31% continuous, a 15s ATK \u25b265.37% re-armed at battle start and every Full Burst end, Elemental Advantage Attack Damage \u25b248.15% at Burst Stage 3 entry (Element bucket, live only with advantage), and a 25s casterAtkPct \u25b280.25% Follow Up to B3 allies. Support surface: two independent 3-second heal channels (Media continuous, Mediarama only during Scarlet Flower) that emit recovery events for on-recovery consumers. Three blocks are Wind-gated via the 1 More clause and are therefore inert on a non-Wind boss."
}
```

### 6b. Driver's short diff vs the blind override (driver = section 7b)

Four divergences, all listed for your ruling:

1. **S2 Follow Up line** — BLIND encodes it: `burstCast` + `bossElementGate:'Wind'`, target `alliesLowestAtk{count:4, burst:'III', excludeSelf:true}`, `casterAtkPct 80.25` for 25s — explicitly DROPPING the "in the Persona state" and "standard" filters (no engine primitive; blind's own flag says "Persona filter dropped"). DRIVER leaves it UNMODELED (verbatim + recipe): the engine has no Persona-state primitive and NO roster unit carries Persona state (the skill user is excluded by the kit), so the true target set is empty in every sim-able team — and the stand-in target would ACTIVELY grant the buff to any B3 ally (e.g. helm in a two-B3 fixture), which the kit does not.
2. **Scarlet Flower Mediarama cadence** — BLIND block is a single instant `heal` on the cast frame (its own flag claims "ticks 3, intervalSec 3" but the block carries neither — flag/block inconsistency). DRIVER: `delaySec 3` + `heal{ticks:3, intervalSec:3}` = activations at cast+3/+6/+9s, matching "Activates every 3 sec" inside the ~10.37s state window (first-fire phase per the engine's interval convention, t=sec not t=0).
3. **Fire Amp window** — BLIND `durationSec 10.4` (= 624 frames, 2 frames PAST Full Burst end). DRIVER `durationSec 10.37` (= 622 frames = exactly cast → Full Burst end: the engine's measured 22f B3→FB pre-delay + 10s FB window). Both are derived constants, not kit numbers; the kit gives only "Deactivation condition: When Full Burst ends".
4. **S2 Attack Damage 55.31% trigger** — BLIND `passive`; DRIVER `battleStart` (the kit reads "Activates at the start of battle … continuously"). Behaviorally identical at scope (both live from frame 0, no expiry).

Everything else converges: identical skill1 (interval-3 heal / battleStart+fullBurstEnd ATK 65.37/15s / Wind-gated 400.31 distributed), identical burst (1258.79 distributed nuke / Wind-gated 1 More ATK 45.33/10s), stageEnter-3 elemAdvantageDamagePct 48.15/10s, Fire Amp as distributedDamagePct 90.01, and the same 1 More read (own burst vs Wind). Blind leakDetected: null.

---

## 7. DRIVER'S IMPLEMENTATION (what ships if you rule GO)

### 7a. Driver spec test (scripts/tests/units/yukiko.test.ts) — 28/28 GREEN vs 7b

```typescript
// PER-UNIT KIT SPEC — `yukiko` (Yukiko, Attacker/MG/Fire, Burst III, cd 40s). NEW unit,
// no base counterpart; Persona-style kit ("1 More", "Persona state", Media/Mediarama).
// Kit-autonomy gauntlet 2026-08-19.
//
// One assertion group per KIT LINE (Y1..Y9 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) and to ISOLATE a line whose effect is otherwise masked
// by another unit's heal (crown's recovery consumer cannot attribute its firings to a source).
//
// Kit (blablalink prose, data/characters.json → characters.yukiko.skills, level-10 values):
//   S1 ■ Persona state wrapper (continuous, unremovable) — framework for the heal below     [Y1]
//      ■ every 3 sec → all allies: Media, restores 5.7% of the skill user's final Max HP    [Y1]
//      ■ battle start AND when Full Burst ends → self: ATK ▲ 65.37% for 15 sec              [Y2]
//      ■ when 1 More takes effect → all enemies: 400.31% of final ATK, distributed damage   [Y3]
//   S2 ■ battle start → self: Attack Damage ▲ 55.31% continuously                           [Y4]
//      ■ on Burst Skill use → Scarlet Flower state until Full Burst ends:
//          Effect 1: every 3 sec → all allies: Mediarama, restores 5.7% final Max HP        [Y5d]
//          Effect 2: self: Fire Amp — Distributed Damage ▲ 90.01% continuously              [Y5a-c]
//          Effect 3: self: damage taken from Water Code enemies ▼ 17.95%                    [UNMODELED]
//      ■ entering Burst Stage 3 → self: Elemental Advantage Attack Damage ▲ 48.15% 10 sec   [Y6]
//      ■ when 1 More takes effect → all standard B3 allies in Persona state (except self):
//          Follow Up: ATK ▲ 80.25% of the skill user's ATK for 25 sec                       [UNMODELED]
//   BU ■ all enemies: 1258.79% of final ATK as distributed damage                           [Y8]
//      ■ if a Wind Code enemy is present → self: 1 More: ATK ▲ 45.33% for 10 sec            [Y9]
//
// UNMODELED lines (documented, not asserted — see the override's `unmodeled`):
//   - S2 Effect 3 (Scarlet Protection, damage taken from Water Code enemies ▼ 17.95%): defensive;
//     the v1 engine models no incoming damage (nobody takes hits), so the line is offense-inert
//     and has no consumer. Kept verbatim in unmodeled.
//   - S2 Follow Up (ATK ▲ 80.25% of own ATK → "all standard Burst 3 allies in the Persona state",
//     25 sec): the engine has NO Persona-state primitive and the roster has NO Persona-state unit
//     (yukiko herself is excluded by the kit), so the target set is empty in every team the sim can
//     field today. Encoding it WITHOUT the Persona gate would wrongly grant the buff to any B3 ally
//     — actively wrong, not merely unfaithful. Recipe: when Persona-state units land, add a
//     persona-state tag + a matching target filter, then encode on the 1 More event
//     (burstCast + bossElementGate Wind) as casterAtkPct 80.25 / 25 sec.
//   - Heal MAGNITUDES (5.7% of final Max HP): no HP pool is modeled, so only the recovery EVENTS
//     are asserted (Y1/Y5d); the numbers are verbatim in unmodeled.
//
// "1 MORE" READ (the kit's own wiring): her burst's last line activates "if a Wind Code enemy is
// present" and grants "1 More" — Fire's elemental advantage over Wind is the weakness hit that
// triggers it. S1's 400.31% hit and S2's Follow Up both key to "when 1 More takes effect", so the
// 1 More event IS her burst cast against a Wind boss: modeled as burstCast + bossElementGate Wind.
//
// CAST-INSTANT SIMULTANEITY (engine block order = skill1 → skill2 → burst, sequential on the cast
// frame): the Scarlet Flower state (skill2) is granted BEFORE the burst-slot blocks resolve, so the
// Fire Amp covers her own nuke — the measured same-cast rule (U10: "Live buffs at cast DO apply").
// The S1 1 More hit (skill1) resolves BEFORE the state grant, so it does NOT take the amp; in game
// all three land on the same frame. Pinned as the documented engine order in Y3; a focus-video
// popup of the 400.31% hit vs a Wind boss would settle whether the amp should reach it.
//
// Why each assertion discriminates:
//   Y1   the heal is an event stream at HER 3s cadence — proven by exact 3s spacing of crown's
//        recovery consumer and by a burst-keyed counterfactual (once per cast) producing far fewer
//        firings. Isolated by patching helm's and crown's own heals out (precedent: helm.test.ts H8).
//   Y2   a battle-start-only counterfactual fires ONCE; shipped fires at t=0 and at every Full
//        Burst end — the set of application frames must equal {0} ∪ fullBurstEnd frames.
//   Y3   the hit exists ONLY vs the Wind boss (the gate), at the kit magnitude, once per cast;
//        removing it or ungating it are the two nearest wrong models.
//   Y4   removal moves her total; expiry must be null (continuously).
//   Y5   Fire Amp is a DISTRIBUTED-FLAVOR amp: the nuke's distributed multiplier is 1.9001 while
//        her NORMAL attacks are byte-identical with and without the amp. The unscoped
//        counterfactual (attackDamagePct) lifts the normals — the model this line must not be.
//        The state window is the kit's "until Full Burst ends" = 622 frames (cast → FB end).
//   Y6   elemAdvantageDamagePct sits in the ELEMENT bucket: removing it changes her damage vs the
//        Wind boss (advantaged) and changes NOTHING vs the Fire boss (not advantaged). An
//        attackDamagePct counterfactual moves the Fire-boss total — the placement this asserts
//        against.
//   Y8   kit magnitude, burst bucket, once per cast, distributed-flavored (×1.9001 with the amp
//        live), and NO +50% Full Burst major — the cast lands 22 frames before FB opens.
//   Y9   exists once per cast vs Wind, ABSENT vs Fire.
//
// Fixture: liter (B1) / crown (B2) / yukiko (B3) / helm (B3, alternating burst partner so the
// rotation sustains ~20s Full Burst cycles — yukiko alone on a 40s cd would stall every other
// chain), boss WIND (her 1 More + elemental-advantage lines live) with a FIRE-boss mirror run for
// the gate/placement discriminations. Crown's recovery consumer (attackDamagePct 20.99) is the
// observable for the heal lines. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const LITER = 0;
const CROWN = 1;
const YUKIKO = 2;
const HELM = 3;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(
  bossElement: 'Wind' | 'Fire',
  overrides: Record<string, any> = {}
) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['liter', 'crown', 'yukiko', 'helm'],
    bossElement,
    focusSlug: 'yukiko',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const yukikoCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'yukiko'
  );
const fbEndFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstEnd').map((e) => e.frame);
const yukikoDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'yukiko' && d.srcSlot === srcSlot);
const yukikoNormals = (evs: SimEvent[]) =>
  dmg(evs)
    .filter((d) => d.slug === 'yukiko' && d.bucket === 'normal')
    .map((d) => d.amount);
const yukikoBuff = (evs: SimEvent[], stat: string, value: number) =>
  buffs(evs).filter(
    (b) => b.casterIdx === YUKIKO && b.stat === stat && b.value === value
  );
/** Distributed multiplier, rounded past float noise (1 + 90.01/100 = 1.9001000000000001). */
const dist = (d: Damage) => Number(d.mult.distributed.toFixed(6));
/** Crown's recovery consumer firings — one recovery event source frame per distinct frame. */
const recoveryFrames = (evs: SimEvent[]): number[] =>
  [
    ...new Set(
      buffs(evs)
        .filter(
          (b) =>
            b.casterIdx === CROWN &&
            b.stat === 'attackDamagePct' &&
            b.value === 20.99
        )
        .map((b) => b.frame)
    ),
  ].sort((a, b) => a - b);

// ---- isolation / counterfactual patches -------------------------------------------------------
/** helm heals (S1 full-charge + burst lifesteal) and crown's own hitCount heal all drive crown's
 *  recovery consumer; removing them leaves yukiko's heals as the ONLY recovery sources
 *  (same isolation pattern as helm.test.ts H8). */
const helmNoHeal = withPatchedOverride('helm', (ov) => {
  const before = JSON.stringify(ov);
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    ov[slot] = ov[slot]
      .map((b: any) => ({
        ...b,
        effects: b.effects.filter((e: any) => e.kind !== 'heal'),
      }))
      .filter((b: any) => b.effects.length > 0);
  }
  if (JSON.stringify(ov) === before) {
    throw new Error('helm heal blocks missing — fixture is stale');
  }
});
const crownNoHeal = withPatchedOverride('crown', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) =>
    b.effects.every((e: any) => e.kind !== 'heal')
  );
  if (ov.skill2.length === before) {
    throw new Error('crown heal block missing — fixture is stale');
  }
});
const HEAL_ISOLATION = { helm: helmNoHeal, crown: crownNoHeal };

const stripYukiko = (mutate: (ov: any) => void) =>
  withPatchedOverride('yukiko', mutate);

/** Y1 counterfactual: S1's every-3s heal removed (state heal stays). */
const noS1Heal = stripYukiko((ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => b.trigger.kind !== 'interval');
  if (ov.skill1.length === before) {
    throw new Error('yukiko S1 interval heal missing — fixture is stale');
  }
});
/** Y5d isolation: the state's Mediarama heal effect removed (S1's Media stays). */
const noStateHeal = stripYukiko((ov) => {
  let removed = 0;
  for (const b of ov.skill2) {
    const n = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
    removed += n - b.effects.length;
  }
  ov.skill2 = ov.skill2.filter((b: any) => b.effects.length > 0);
  if (!removed) {
    throw new Error('yukiko state heal missing — fixture is stale');
  }
});
/** Both heals removed — nothing may drive crown's consumer then. */
const noHeals = stripYukiko((ov) => {
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    ov[slot] = ov[slot]
      .map((b: any) => ({
        ...b,
        effects: b.effects.filter((e: any) => e.kind !== 'heal'),
      }))
      .filter((b: any) => b.effects.length > 0);
  }
});
/** Y2 counterfactual: the Full-Burst-end re-trigger removed (battle start only). */
const noFbEndAtk = stripYukiko((ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => b.trigger.kind !== 'fullBurstEnd'
  );
  if (ov.skill1.length === before) {
    throw new Error('yukiko S1 fullBurstEnd ATK block missing — fixture is stale');
  }
});
/** Y3/Y9 counterfactual: the whole 1 More cluster removed (S1 hit + burst ATK grant). */
const noOneMore = stripYukiko((ov) => {
  const before = JSON.stringify(ov);
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    ov[slot] = ov[slot].filter((b: any) => b.bossElementGate !== 'Wind');
  }
  if (JSON.stringify(ov) === before) {
    throw new Error('yukiko Wind-gated 1 More blocks missing — fixture is stale');
  }
});
/** Y5 counterfactual: Fire Amp removed entirely. */
const noAmp = stripYukiko((ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) =>
    b.effects.every((e: any) => e.stat !== 'distributedDamagePct')
  );
  if (ov.skill2.length === before) {
    throw new Error('yukiko Fire Amp block missing — fixture is stale');
  }
});
/** Y5 counterfactual: the UNMODELED Fire Amp as an unscoped Attack Damage buff. */
const ampAsAttackDamage = stripYukiko((ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'distributedDamagePct');
  if (!e) throw new Error('yukiko Fire Amp effect missing — fixture is stale');
  e.stat = 'attackDamagePct';
});
/** Y6 counterfactual: Elemental Advantage line removed. */
const noElemAdv = stripYukiko((ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) =>
    b.effects.every((e: any) => e.stat !== 'elemAdvantageDamagePct')
  );
  if (ov.skill2.length === before) {
    throw new Error('yukiko elemAdvantage block missing — fixture is stale');
  }
});
/** Y6 counterfactual: the line misplaced into the Damage Up bucket. */
const elemAdvAsAttackDamage = stripYukiko((ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'elemAdvantageDamagePct');
  if (!e) {
    throw new Error('yukiko elemAdvantage effect missing — fixture is stale');
  }
  e.stat = 'attackDamagePct';
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const wind = run('Wind');
const fire = run('Fire');
const windNoS1Heal = run('Wind', { ...HEAL_ISOLATION, yukiko: noS1Heal });
const windNoStateHeal = run('Wind', { ...HEAL_ISOLATION, yukiko: noStateHeal });
const windNoHeals = run('Wind', { ...HEAL_ISOLATION, yukiko: noHeals });
const windHealIsolated = run('Wind', HEAL_ISOLATION);
const windNoFbEndAtk = run('Wind', { yukiko: noFbEndAtk });
const windNoOneMore = run('Wind', { yukiko: noOneMore });
const windNoAmp = run('Wind', { yukiko: noAmp });
const windAmpWrong = run('Wind', { yukiko: ampAsAttackDamage });
const fireAmpWrong = run('Fire', { yukiko: ampAsAttackDamage });
const windNoElemAdv = run('Wind', { yukiko: noElemAdv });
const windElemAdvWrong = run('Wind', { yukiko: elemAdvAsAttackDamage });
const fireNoElemAdv = run('Fire', { yukiko: noElemAdv });
const fireElemAdvWrong = run('Fire', { yukiko: elemAdvAsAttackDamage });

const casts = yukikoCasts(wind.events);

describe('yukiko — kit spec', () => {
  it('fixture sanity: she casts her burst repeatedly in the 180s fight', () => {
    expect(casts.length).toBeGreaterThanOrEqual(3);
    expect(casts.every((c) => c.stage === 3)).toBe(true);
  });

  describe('Y1 — S1 Media: recovery takes effect on all allies every 3 sec', () => {
    it('fires on a strict 3s cadence across the whole fight (S1 heal isolated)', () => {
      const frames = recoveryFrames(windNoStateHeal.events);
      expect(frames.length).toBeGreaterThanOrEqual(58);
      expect(frames[0]).toBe(3 * FPS); // interval first-fire at t=sec
      for (const f of frames) {
        expect(f % (3 * FPS)).toBe(0);
      }
    });

    it('DISCRIMINATING: a burst-keyed heal would produce far fewer firings', () => {
      // nearest wrong model: the every-3s line re-keyed to her burst cast. The shipped cadence
      // produces ~60 firings; one per cast produces ~4-5.
      const frames = recoveryFrames(windNoStateHeal.events).length;
      expect(frames).toBeGreaterThan(3 * casts.length);
    });

    it('is yukiko-heal-driven: removing BOTH her heals zeroes the recovery stream', () => {
      expect(recoveryFrames(windNoHeals.events)).toEqual([]);
    });

    it('the isolated stream comes from yukiko alone (no other recovery source leaks in)', () => {
      // with only her S1 heal live, every firing is on the 3s grid — nothing aperiodic sneaks in.
      const frames = recoveryFrames(windNoStateHeal.events);
      expect(frames.every((f) => f % (3 * FPS) === 0)).toBe(true);
    });
  });

  describe('Y2 — S1 ATK ▲ 65.37% for 15 sec at battle start and when Full Burst ends', () => {
    const applied = yukikoBuff(wind.events, 'atkPct', 65.37);

    it('applies at t=0 and at EXACTLY every Full Burst end', () => {
      const frames = new Set(applied.map((b) => b.frame));
      expect(frames.has(0)).toBe(true);
      expect([...frames].filter((f) => f !== 0).sort((a, b) => a - b)).toEqual(
        fbEndFrames(wind.events).sort((a, b) => a - b)
      );
    });

    it('lasts 15 sec and is self-held', () => {
      expect(applied.length).toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
        expect(b.targetIdx).toBe(YUKIKO);
      }
    });

    it('DISCRIMINATING: battle-start-only fires exactly once', () => {
      expect(
        yukikoBuff(windNoFbEndAtk.events, 'atkPct', 65.37).length
      ).toBe(1);
      expect(wind.totals.yukiko).not.toBe(windNoFbEndAtk.totals.yukiko);
    });
  });

  describe('Y3 — S1: when 1 More takes effect, 400.31% of final ATK distributed to all enemies', () => {
    const hits = yukikoDamage(wind.events, 'skill1');

    it('lands once per burst cast at the kit magnitude, Wind boss only', () => {
      expect(hits.length).toBe(casts.length);
      expect([...new Set(hits.map((d) => d.atkPct))]).toEqual([400.31]);
      expect([...new Set(hits.map((d) => d.bucket))]).toEqual(['skill']);
      expect(yukikoDamage(fire.events, 'skill1')).toEqual([]);
    });

    it('is distributed-flavored; slot order keeps the same-cast Fire Amp OFF it (documented)', () => {
      // The state is granted by skill2, AFTER skill1 resolves on the cast frame — the engine's
      // sequential order stands in for the in-game same-frame simultaneity (see header).
      expect([...new Set(hits.map(dist))]).toEqual([1]);
    });

    it('DISCRIMINATING: removing the 1 More cluster zeroes the hit vs Wind', () => {
      expect(yukikoDamage(windNoOneMore.events, 'skill1')).toEqual([]);
    });
  });

  describe('Y4 — S2 Attack Damage ▲ 55.31% continuously from battle start', () => {
    const applied = yukikoBuff(wind.events, 'attackDamagePct', 55.31);

    it('applies once at t=0 with NO expiry, self-held', () => {
      expect(applied.length).toBe(1);
      expect(applied[0].frame).toBe(0);
      expect(applied[0].expiresFrame).toBeNull();
      expect(applied[0].targetIdx).toBe(YUKIKO);
    });
  });

  describe('Y5 — Scarlet Flower state on Burst Skill use (until Full Burst ends)', () => {
    const amps = yukikoBuff(wind.events, 'distributedDamagePct', 90.01);

    it('Fire Amp grants 90.01% once per cast, self-held', () => {
      expect(amps.length).toBe(casts.length);
      for (const b of amps) {
        expect(b.targetIdx).toBe(YUKIKO);
      }
    });

    it('the window is cast → Full Burst end (622 frames = 22f pre-delay + 10s FB)', () => {
      for (const b of amps) {
        expect(b.expiresFrame! - b.frame).toBe(622);
      }
    });

    it('IS LOAD-BEARING: the burst nuke takes the ×1.9001 distributed multiplier', () => {
      const nukes = yukikoDamage(wind.events, 'burst');
      expect([...new Set(nukes.map(dist))]).toEqual([1.9001]);
      const nukesNoAmp = yukikoDamage(windNoAmp.events, 'burst');
      expect([...new Set(nukesNoAmp.map(dist))]).toEqual([1]);
      expect(wind.totals.yukiko).toBeGreaterThan(windNoAmp.totals.yukiko);
    });

    it('IS FLAVOR-SCOPED: her normal attacks are untouched by the amp', () => {
      expect(yukikoNormals(wind.events)).toEqual(
        yukikoNormals(windNoAmp.events)
      );
    });

    it('DISCRIMINATING: an unscoped Attack Damage buff would lift the normals too', () => {
      expect(yukikoNormals(windAmpWrong.events)).not.toEqual(
        yukikoNormals(wind.events)
      );
    });

    it('state Mediarama: three recovery firings per cast at +3/+6/+9 sec (S1 heal isolated)', () => {
      const frames = recoveryFrames(windNoS1Heal.events);
      const FIGHT_FRAMES = 180 * FPS;
      const measurable = casts.filter((c) => c.frame + 9 * FPS <= FIGHT_FRAMES);
      expect(measurable.length).toBeGreaterThan(0);
      for (const c of measurable) {
        for (const off of [3, 6, 9]) {
          expect(
            frames,
            `no state-heal firing at cast(${c.sec.toFixed(1)}s)+${off}s`
          ).toContain(c.frame + off * FPS);
        }
      }
      // and nothing else: every firing belongs to some cast window.
      const windows = measurable.flatMap((c) =>
        [3, 6, 9].map((off) => c.frame + off * FPS)
      );
      for (const f of frames) {
        expect(windows).toContain(f);
      }
    });
  });

  describe('Y6 — S2 Elemental Advantage Attack Damage ▲ 48.15% for 10 sec on Burst Stage 3 entry', () => {
    const applied = yukikoBuff(wind.events, 'elemAdvantageDamagePct', 48.15);

    it('fires on stage-3 entry — 30f ahead of each of her casts — for 10 sec', () => {
      expect(applied.length).toBeGreaterThanOrEqual(casts.length);
      for (const c of casts) {
        expect(
          applied.some(
            (b) => b.frame <= c.frame && c.frame - b.frame <= 30
          ),
          `no stageEnter-3 grant within 30f before cast at ${c.sec.toFixed(1)}s`
        ).toBe(true);
      }
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
        expect(b.targetIdx).toBe(YUKIKO);
      }
    });

    it('IS ELEMENT-BUCKET: removal moves her damage vs Wind…', () => {
      expect(wind.totals.yukiko).not.toBe(windNoElemAdv.totals.yukiko);
    });

    it('…and is exactly INERT vs a boss she is not advantaged against', () => {
      expect(fire.totals.yukiko).toBe(fireNoElemAdv.totals.yukiko);
    });

    it('DISCRIMINATING: a Damage-Up placement would move the Fire-boss total', () => {
      expect(fireElemAdvWrong.totals.yukiko).not.toBe(fire.totals.yukiko);
      expect(windElemAdvWrong.totals.yukiko).not.toBe(wind.totals.yukiko);
    });
  });

  describe('Y8 — burst Maragidyne: 1258.79% of final ATK distributed damage to all enemies', () => {
    const nukes = yukikoDamage(wind.events, 'burst');

    it('fires once per cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(casts.length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([1258.79]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('casts BEFORE the Full Burst window opens: no +50% major, FB not yet live', () => {
      expect([...new Set(nukes.map((d) => d.fbMajorApplied))]).toEqual([false]);
      expect([...new Set(nukes.map((d) => d.inFullBurst))]).toEqual([false]);
    });

    it('is crit-eligible (engine rider convention) and distributed-flavored', () => {
      expect([...new Set(nukes.map((d) => d.critEligible))]).toEqual([true]);
      // Fire Amp live on the Wind-boss run (granted same-cast, skill2 before burst)
      expect([...new Set(nukes.map(dist))]).toEqual([1.9001]);
    });
  });

  describe('Y9 — burst 1 More: ATK ▲ 45.33% for 10 sec, only if a Wind Code enemy is present', () => {
    it('grants once per cast vs Wind, self-held, 10 sec', () => {
      const applied = yukikoBuff(wind.events, 'atkPct', 45.33);
      expect(applied.length).toBe(casts.length);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
        expect(b.targetIdx).toBe(YUKIKO);
      }
    });

    it('is ABSENT vs a non-Wind boss', () => {
      expect(yukikoBuff(fire.events, 'atkPct', 45.33)).toEqual([]);
    });

    it('DISCRIMINATING: removing the 1 More cluster zeroes it vs Wind', () => {
      expect(yukikoBuff(windNoOneMore.events, 'atkPct', 45.33)).toEqual([]);
      expect(wind.totals.yukiko).not.toBe(windNoOneMore.totals.yukiko);
    });
  });
});

```

### 7b. Driver override (src/skills/overrides/yukiko.json)

```json
{
  "note": "NEW unit (no base counterpart) — Persona-style kit ('1 More', 'Persona state'). SKILL1: the every-3s Media heal is MODELED as recovery EVENTS (interval 3s, all allies) — the magnitude (5.7% of the skill user's final max HP) has no engine consumer (no HP pool), but the events are board-relevant: they drive on-recovery consumers (crown's 'when recovery takes effect' team Attack Damage). The battle-start + Full-Burst-end ATK ▲ 65.37%/15s is two blocks on the two named triggers. The 'when 1 More takes effect' 400.31% distributed hit keys to THE 1 MORE EVENT — her own burst cast against a Wind boss (burstCast + bossElementGate Wind): her burst's own '1 More' line activates 'if a Wind Code enemy is present', and Fire's elemental advantage over Wind is the weakness hit; S1/S2's 'when 1 More takes effect' clauses key to that same event. SKILL2: battle-start Attack Damage ▲ 55.31% is permanent (battleStart, no duration). The Scarlet Flower state activates on Burst Skill use and DEACTIVATES when Full Burst ends — encoded as burstCast-keyed blocks with the window derived from the engine's measured FB timing (cast → FB end = 22f pre-delay + 10s FB = 622f ≈ 10.37s): Mediarama heal (3 ticks at +3/+6/+9s, event-only), Fire Amp distributedDamagePct 90.01 (own multiplicative bucket, flavor-gated to her distributed hits), and the stage-3-entry Elemental Advantage Attack Damage ▲ 48.15%/10s sits in the ELEMENT bucket (elemAdvantageDamagePct — active only while advantaged; a Damage-Up placement is the classic over-credit and is discriminated in the spec test). BURST: the 1258.79% distributed nuke is cast-instant (no +50% Full Burst major — the cast lands 22f before FB opens), UNTAGGED for burstDesc (the jackal/trina amps are literal-only and no amp clause names her line), and takes the Fire Amp by the measured same-cast rule (U10: live buffs at cast DO apply; the skill2 state block resolves before the burst slot on the cast frame). The 1 More ATK ▲ 45.33%/10s is Wind-gated. Kit-autonomy gauntlet 2026-08-19: cross-family S2b (claude-fable-5) independent review converged FAITHFUL on all 9 load-bearing lines (leakDetected null); the two non-encodable lines (Scarlet Protection damage-taken reduction; the Follow Up grant to 'standard Burst 3 allies in the Persona state') are verbatim in unmodeled with recipes — the Follow Up has no Persona-state primitive to gate on and no roster carrier, so its target set is empty in every sim-able team today.",
  "unmodeled": {
    "skill1": [
      "Persona - Konohana Sakuya: This effect is continuous and cannot be removed. — named state container: the engine has no Persona-state primitive. The healing function it wraps IS modeled (skill1 interval block — recovery events every 3s to all allies); the state NAME / undispellable flag is display-only at scope (nothing dispels).",
      "Function: Yukiko heals her allies using her Persona. — same state wrapper; the healing function is the modeled interval block above.",
      "Media: Restores HP equal to 5.7% of the skill user's final max HP. — magnitude only: no HP pool is modeled, so the number has no engine consumer; the recovery EVENT is modeled, which is the board-relevant half (on-recovery consumers read the event, never the amount)."
    ],
    "skill2": [
      "Scarlet Flower: This effect is continuous and cannot be removed. Function: Yukiko strengthens herself. — named state container; its three effects and its cast→Full-Burst-end window ARE modeled (skill2 burstCast blocks, 622f window). 'Continuous and cannot be removed' reads UNDISPELLABLE, not unending — the kit's own deactivation condition ('When Full Burst ends') ends it.",
      "Effect 1: Mediarama: Restores HP equal to 5.7% of the skill user's final max HP. — magnitude only (no HP pool); the recovery EVENTS are modeled (3 ticks per state window, +3/+6/+9s).",
      "Effect 3: Affects self. Scarlet Protection: Damage taken from Water Code enemies ▼ 17.95% continuously. This effect cannot be removed. — defensive: the v1 engine models no incoming damage (the boss deals none), so the line is offense-inert and has no consumer.",
      "■ Activates when 1 More takes effect. Affects all standard Burst 3 allies (except the skill user) in the Persona state. Follow Up: ATK ▲ 80.25% of the skill user's ATK for 25 sec. — no Persona-state primitive exists and NO roster unit carries Persona state (the skill user is excluded by the kit's own targeting), so the target set is empty in every team the sim can field today; encoding it without the Persona gate would wrongly grant the buff to ANY Burst 3 ally. Recipe when Persona-state units land: add a persona-state tag + target filter, then encode on the 1 More event (burstCast + bossElementGate 'Wind', target = B3 allies minus self, buff casterAtkPct 80.25, durationSec 25)."
    ],
    "burst": []
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "interval",
        "sec": 3
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "heal"
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "battleStart"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 65.37,
          "durationSec": 15
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 65.37,
          "durationSec": 15
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "burstCast"
      },
      "bossElementGate": "Wind",
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 400.31,
          "flavor": "distributed"
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "battleStart"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 55.31
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast"
      },
      "delaySec": 3,
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "heal",
          "ticks": 3,
          "intervalSec": 3
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "distributedDamagePct",
          "value": 90.01,
          "durationSec": 10.37
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "stageEnter",
        "stage": 3
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "elemAdvantageDamagePct",
          "value": 48.15,
          "durationSec": 10
        }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 1258.79,
          "flavor": "distributed"
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "bossElementGate": "Wind",
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 45.33,
          "durationSec": 10
        }
      ]
    }
  ],
  "caveats": [
    "skill1/burst: the three '1 More' lines (S1 400.31% hit, burst ATK ▲ 45.33%, and the unmodeled Follow Up) all key to ONE event — her burst cast against a Wind boss (bossElementGate 'Wind'). If footage shows 1 More triggering on ANY elemental-weakness hit (not just her burst), re-key S1/S2 to that event.",
    "skill2: the Scarlet Flower window is encoded as durationSec 10.37 — DERIVED from the engine's measured Full Burst timing (cast → FB end = 22f pre-delay + 10s window = 622 frames), not from a kit number; the kit gives only the deactivation condition ('when Full Burst ends'). A Full Burst extension from another unit would not stretch this window (no 'until FB end' duration primitive).",
    "skill1/skill2/burst: cast-frame simultaneity — the engine resolves blocks skill1 → skill2 → burst on the cast frame, so the Fire Amp (skill2) DOES cover the burst nuke (matching the measured same-cast rule, U10) but NOT the S1 400.31% 1 More hit (skill1 resolves first). In game all three land simultaneously; a focus-video popup of the 400.31% hit vs a Wind boss decides whether the amp should reach it.",
    "burst: the 1258.79% nuke is UNTAGGED for burstDesc — the Burst-Skill-Damage amps (jackal/trina) are literal-only (owner ruling 2026-08-10) and no amp clause names her 'Affects all enemies' text today; a future amp carrier that literally matches would need the tag.",
    "skill1/skill2: heals are event-only — no HP amounts are modeled, so the 5.7% magnitudes are unmodeled; the recovery events drive on-recovery consumers (crown), which is the board-relevant half. The state heal carries delaySec 3 so its first activation lands 3 sec AFTER the state activates ('Activates every 3 sec' — the engine's interval first-fire phase convention, t=sec not t=0; ⚑ a focus video can pin the phase).",
    "skill2: the Mediarama window (delaySec 3 + 3 ticks at 3s) ends at cast+9s, inside the 10.37s Scarlet Flower window — a fourth tick at +12s would fall after Full Burst ends, so the kit's 'every 3 sec' inside the state produces exactly three activations per cast."
  ]
}

```
