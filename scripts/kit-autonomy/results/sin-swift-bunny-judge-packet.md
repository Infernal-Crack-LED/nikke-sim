# S7 RECONCILING-JUDGE PACKET — `sin-swift-bunny` (Sin: Swift Bunny, SR/Attacker/Water/Burst III)

Built 2026-10-02 by scripts/kit-autonomy/build-judge-packet.ts. Sections: 1 contract · 2 mechanics SSOT · 3 ground truth · 4 S2b review(s) · 5 S5 blind test · 6 S6 blind override · 7 driver implementation · 8 S2d matrix + driver notes.

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

## 2. MECHANICS SSOT (damage formula + game mechanics)

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
               + True Damage ▲ %           [only on true-flavored instances: flavor:"true"
                                            skill hits, and normal attacks while the unit is
                                            static hasTrueNormals, in a trueNormalsModes mode,
                                            or firing a weaponSwap.trueNormals swap — the first
                                            two also cover the unit's own swap shots]
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

## 3. GROUND TRUTH — the unit's kit prose + base stats (data/characters.json, verbatim)

```json
{
  "slug": "sin-swift-bunny",
  "name": "Sin: Swift Bunny",
  "weapon": "SR",
  "burst": "III",
  "class": "Attacker",
  "element": "Water",
  "manufacturer": "Missilis",
  "burstCooldownSec": 40,
  "ammo": 6,
  "reloadFrames": 141,
  "chargeFrames": 60,
  "chargeMultiplier": 250,
  "hitsPerShot": 1,
  "normalAttackMultiplier": 69.04,
  "coreAttackMultiplier": 200,
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 40
  }
}
```

### skill1

```text
■ Activates at the start of battle. Affects self.
ATK ▲ 15.35%. This effect is continuous.
■ Activates during Full Charge if this unit is not in the Swift Piercing state. Affects self.
Normal Attack Damage Multiplier ▲ 100% for 1 round(s).
Charge Damage ▲ 52.12% for 1 round(s).
■ Activates at the start of battle and when Full Charge is maintained for 1 or more seconds. Affects self.
Initiates a new Bunny Mode based on the current mode.
Activates if this unit is in the Bunny Mode: Stance state.
Initiates Bunny Mode: Engage. This effect is continuous and cannot be removed.
Activates if this unit is not in the Bunny Mode: Stance state.
Initiates Bunny Mode: Stance. This effect is continuous and cannot be removed.
■ Activates when this unit enters the Bunny Mode: Engage state. Affects all allies in the Bunny Mode: Stance state.
Initiates Bunny Mode: Engage. This effect is continuous and cannot be removed.
■ Activates when this unit enters the Bunny Mode: Stance state. Affects all allies in the Bunny Mode: Engage state.
Initiates Bunny Mode: Stance. This effect is continuous and cannot be removed.
```

### skill2

```text
■ Activates only if this unit is in the Bunny Mode: Engage state.
Noise Bullets
Function: Changes some attacks' damage into true damage.
Effect 1: Normal attacks deal true damage. This effect is continuous and cannot be removed.
Effect 2: Swift Piercing deals true damage. This effect is continuous and cannot be removed.
■ Activates only if this unit is in the Bunny Mode: Stance state.
Enhanced Bullets
Function: Enhances this unit's offensive capabilities.
Effect 1: Critical Rate ▲ 35.14%. This effect is continuous and cannot be removed.
Effect 2: Critical Damage ▲ 75.12%. This effect is continuous and cannot be removed.
■ Activates when using Burst Skill. Affects self.
Swift Piercing: Changes the weapon in use
Charge Time: Fixed at 0.5 sec
Damage: 73.22% of final ATK
Full Charge Damage: 300%
Duration: 5 sec
```

### burst

```text
■ Affects self.
ATK ▲ 110% for 5 sec.
■ Affects all enemies.
Deals 516.6% of final ATK as Burst Skill damage.
■ Activates if this unit is in the Bunny Mode: Stance state. Affects the same targets.
Deals 958.9% of final ATK as additional damage.
■ Activates if this unit is in the Bunny Mode: Engage state. Affects the same targets.
Deals 854.6% of final ATK as true damage.
```

## 4. S2b TEST-FAITHFULNESS REVIEW (claude-fable-5, blind — written BEFORE the driver's tests were shown to it)

```json
{
  "slug": "sin-swift-bunny",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "■ start of battle … ATK ▲ 15.35%",
      "disposition": "FAITHFUL",
      "scope": "Generic self ATK (atkPct) — no attack-type scoping in the text.",
      "durationSemantics": "'This effect is continuous' = permanent, no expiry of any kind.",
      "triggerIdentity": "battleStart (frame 0), no gate.",
      "targetSet": "Self only.",
      "nearestWrongModel": "A timed buff (durationSec) or an FB-gated uptime window instead of permanent.",
      "distinguishingAssertion": "Exactly one buffApply at frame 0 with stat 'atkPct', value 15.35, targetSlug sin-swift-bunny, no finite expiresFrame/durationShots; damage events late in the fight still reflect it.",
      "inertness": "No ally receives it; no re-applications after frame 0.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Normal Attack Damage Multiplier ▲ 100%",
      "disposition": "FAITHFUL",
      "scope": "Scales the NORMAL-ATTACK MULTIPLIER itself (normalAttackPct, 69.04 → effectively ×2) — NOT generic attackDamagePct, NOT charge bucket.",
      "durationSemantics": "'for 1 round(s)' = durationShots:1 (expires after the holder fires 1 round), NEVER durationSec:1.",
      "triggerIdentity": "fullCharge (every charged pull — SR releases exclusively at full charge in-sim), gated on NOT being in the Swift Piercing swap state (swapGate:'unswapped'). The swap's own 0.5s-charge pulls must not re-trigger it.",
      "targetSet": "Self.",
      "nearestWrongModel": "Generic attackDamagePct +100 (diluted additively in Damage Up and leaking onto charge/burst buckets), or durationSec:1 wall-clock (drains across reload/lull and can miss the next shot), or ungated so Swift Piercing shots also get it.",
      "distinguishingAssertion": "Every UNSWAPPED charged shot's normal-bucket damage reflects the doubled normal multiplier (mult consistent with 69.04×2), while damage events inside the 5s Swift Piercing window show no skill1 normalAttackPct buffApply; the Damage-Up decomposition of non-normal buckets is unmoved by this line.",
      "inertness": "Charge/burst/skill buckets' Damage-Up terms must not move; no effect during the swap window.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Charge Damage ▲ 52.12% for 1 round(s)",
      "disposition": "FAITHFUL",
      "scope": "Additive percentage points in the charge bucket (chargeDamagePct), same shot it rides.",
      "durationSemantics": "ROUND count — durationShots:1, not seconds.",
      "triggerIdentity": "Same block as the line above: fullCharge trigger + not-in-Swift-Piercing gate (swapGate:'unswapped').",
      "targetSet": "Self.",
      "nearestWrongModel": "durationSec:1, or chargeDamageMultPct (base-charge scaling) instead of additive chargeDamagePct, or active during the swap window.",
      "distinguishingAssertion": "Each unswapped charged shot carries +52.12 in the charge bucket (buffApply stat 'chargeDamagePct' value 52.12 with durationShots:1 re-emitted per pull); no such buffApply lands between her burstCast and swap expiry.",
      "inertness": "Swift Piercing's 300% full-charge shots must not read this (gate blocks the trigger while swapped).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Initiates a new Bunny Mode based on mode",
      "disposition": "FAITHFUL",
      "scope": "A self mode state machine: battle-start branch resolves to Bunny Mode: Stance (she starts modeless → 'not in Stance' → Stance). Encode as top-level modes:['stance','engage'] with 'stance' FIRST (default).",
      "durationSemantics": "Continuous, cannot be removed — mode persists until toggled.",
      "triggerIdentity": "battleStart sets Stance; the toggle trigger ('Full Charge maintained 1+ sec') is a PLAYER-CONTROLLED hold the sim's always-release charge model never produces — so the mode is a static per-run selection (mode gate), not a dynamic in-fight mechanic. The hold-toggle sentence itself goes to unmodeled.",
      "targetSet": "Self.",
      "nearestWrongModel": "Defaulting to Engage, auto-toggling on a timer/per-charge (mode flapping), or — worst — applying BOTH modes' payloads simultaneously (skill2's crit package AND true damage AND both burst riders).",
      "distinguishingAssertion": "A default run shows ONLY Stance-branch effects (critRatePct 35.14 / critDamagePct 75.12 buffApplys, 958.9% burst rider) and ZERO Engage-branch effects (no true-flavored normals, no 854.6% rider); overriding mode:'engage' flips the full set, never mixes.",
      "inertness": "The two mode payloads are mutually exclusive within one run.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Affects all allies in the Bunny Mode … state",
      "disposition": "UNMODELED",
      "scope": "Ally-side mode synchronization (both directions: her Engage entry drags Stance allies to Engage, and vice versa). Only meaningful when a teammate carries Bunny Modes; no such unit exists in the control fixture.",
      "durationSemantics": "Continuous, cannot be removed.",
      "triggerIdentity": "On her own mode entry.",
      "targetSet": "Allies currently in the opposite Bunny Mode state.",
      "nearestWrongModel": "Granting her mode buffs (skill2 crit package) to allies, or emitting any ally-targeted buffApply.",
      "distinguishingAssertion": "No buffApply from her skill1/skill2 ever targets liter/crown/helm in the control comp.",
      "inertness": "Entire line inert in any comp without another Bunny Mode carrier — zero events, zero damage delta.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Engage: Normal attacks deal true damage",
      "disposition": "FAITHFUL",
      "scope": "Damage FLAVOR change (true) on normals AND on Swift Piercing shots while in Engage — trueNormalsModes:['engage'] (the normal-fire path covers swap shots too, so no separate swap flag needed). It is NOT a damage increase by itself.",
      "durationSemantics": "Continuous while the mode holds (mode-static per run).",
      "triggerIdentity": "Passive, mode-gated to 'engage'.",
      "targetSet": "Self.",
      "nearestWrongModel": "Static hasTrueNormals (true-flavored in BOTH modes, letting ally True Damage ▲ feed Stance runs), or treating 'true damage' as a flat damage buff / defense-ignore bonus that moves solo totals.",
      "distinguishingAssertion": "Solo-kit totals are unchanged by the flavor bit itself; with a patched ally trueDamagePct buff, Engage-mode normal/swap damage rises while a Stance-mode run with the identical patch does not move.",
      "inertness": "In Stance (default) runs the flavor is absent; no bucket values change from this line alone in either mode absent a true-damage buffer.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Stance: Crit Rate ▲35.14, Crit Dmg ▲75.12",
      "disposition": "FAITHFUL",
      "scope": "GENERIC critRatePct / critDamagePct — the text says plain 'Critical Rate', no 'of normal attacks' scoping, so NOT critRateNormalPct; applies to every crit-eligible hit she makes.",
      "durationSemantics": "Continuous, cannot be removed — permanent while in Stance.",
      "triggerIdentity": "Passive, mode-gated to 'stance' (the default mode).",
      "targetSet": "Self.",
      "nearestWrongModel": "Scoping to normal attacks only (under-credits charge/burst crit), or leaving it live in Engage mode (over-credits the Engage build by ~35 crit / 75 crit-dmg).",
      "distinguishingAssertion": "Default run: permanent buffApplys stat 'critRatePct' 35.14 and 'critDamagePct' 75.12 at frame 0; her burst nukes' crit expectation reflects them. A mode:'engage' run emits neither and her crit rate drops to sheet baseline.",
      "inertness": "Never applied to allies; absent entirely in Engage runs.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Swift Piercing: Changes the weapon in use",
      "disposition": "FAITHFUL",
      "scope": "weaponSwap: damagePct 73.22, chargeTimeClamp 0.5 (text: 'Fixed at 0.5 sec'), chargeMultPct 300 ('Full Charge Damage: 300%'), durationSec 5. A REAL weapon change (73.22 ≠ her 69.04 normalAttackMultiplier), so magazine refill on entry/exit applies per the real-swap rule.",
      "durationSemantics": "Hard 5-second time bound, no maxShots.",
      "triggerIdentity": "burstCast — 'Activates when using Burst Skill' is HER OWN burst, NOT fullBurstEnter. The control fixture carries TWO B3s (carry + helm), so the two readings genuinely diverge: fullBurstEnter would open a swap window on rotations helm bursts.",
      "targetSet": "Self.",
      "nearestWrongModel": "Keying the swap to fullBurstEnter (over-credits every non-cast rotation in a dual-B3 comp), or reading 'Full Charge Damage: 300%' as an additive chargeDamagePct buff instead of the swap weapon's charge multiplier.",
      "distinguishingAssertion": "Count of swap windows == count of HER burstCast events, strictly fewer than fullBurstStart events in the dual-B3 fixture; swap-window shots land at ~0.5s-charge cadence with per-shot mult consistent with 73.22 × 300% charge, and zero swap-sourced shots occur in rotations she did not cast.",
      "inertness": "skill1's full-charge buffs must emit NO buffApply during the window (not-in-Swift-Piercing gate); outside the window her base SR cadence (chargeFrames 60) resumes.",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 110% for 5 sec",
      "disposition": "FAITHFUL",
      "scope": "Generic self atkPct 110 — covers the swap shots and both burst nukes cast in the same window.",
      "durationSemantics": "Literal seconds — durationSec:5 (matches the Swift Piercing window; this one is NOT a round count).",
      "triggerIdentity": "burstCast.",
      "targetSet": "Self only ('Affects self').",
      "nearestWrongModel": "Granting it to allies, or stretching to the 10s FB window, or encoding as rounds.",
      "distinguishingAssertion": "buffApply stat 'atkPct' value 110 on each of her casts with expiresFrame ≈ cast+5s; no ally-targeted application; swap-window shot damage reflects the raised ATK while post-expiry shots do not.",
      "inertness": "Allies' effective ATK unmoved.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Deals 516.6% … as Burst Skill damage",
      "disposition": "FAITHFUL",
      "scope": "Burst-slot flatDamage atkPct 516.6, instant on cast; 'Affects all enemies' → burstDesc:'allEnemies' tag for the Burst-Skill-AoE amp family (inert in the fixture, costless to carry).",
      "durationSemantics": "One instant hit per cast.",
      "triggerIdentity": "burstCast (unconditional branch).",
      "targetSet": "Enemy (boss).",
      "nearestWrongModel": "Applying the +50% Full Burst major and/or +30% range bonus to the nuke (burst-cast instant damage lands pre-FB and riders take no range).",
      "distinguishingAssertion": "One burst-bucket damage event per cast with mult 516.6, fbMajorApplied false and rangeApplied false, snapshotting the just-applied ATK ▲110.",
      "inertness": "Fires in BOTH modes — must not be mode-gated.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Stance: Deals 958.9% … additional damage",
      "disposition": "FAITHFUL",
      "scope": "Burst-slot flatDamage atkPct 958.9, mode-gated 'stance', same targets/timing as the 516.6 hit; plain (non-true) flavor.",
      "durationSemantics": "One instant hit per cast.",
      "triggerIdentity": "burstCast + mode:'stance' gate.",
      "targetSet": "Enemy.",
      "nearestWrongModel": "Firing in both modes (stacking with the 854.6 true hit — ~2× over-credit on the burst nuke), or gating on Engage.",
      "distinguishingAssertion": "Default (Stance) run: each cast emits exactly TWO burst nuke instances (516.6 and 958.9) and ZERO 854.6 instances; an Engage run emits 516.6 + 854.6 and zero 958.9.",
      "inertness": "Absent entirely when mode:'engage'.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Engage: Deals 854.6% … as true damage",
      "disposition": "FAITHFUL",
      "scope": "Burst-slot flatDamage atkPct 854.6 with flavor:'true', mode-gated 'engage' — true flavor makes it eligible for trueDamagePct Damage-Up feeds, nothing more.",
      "durationSemantics": "One instant hit per cast.",
      "triggerIdentity": "burstCast + mode:'engage' gate.",
      "targetSet": "Enemy.",
      "nearestWrongModel": "Treating 'true damage' as defense-ignore extra value, dropping the flavor tag, or letting it coexist with the 958.9 Stance rider in one cast.",
      "distinguishingAssertion": "mode:'engage' run: each cast emits 854.6 with true flavor; a patched ally trueDamagePct buff moves this instance in Engage and moves nothing in a Stance run.",
      "inertness": "Absent entirely in default (Stance) runs — the default-mode regression total must contain no 854.6 instances.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:ATK ▲15.35 battle-start",
    "skill1:Normal Attack Dmg Mult ▲100 (1 round, unswapped full-charge)",
    "skill1:Charge Damage ▲52.12 (1 round, unswapped full-charge)",
    "skill1:Bunny Mode machinery (modes ['stance','engage'], default stance)",
    "skill2:Engage true-normals flavor (trueNormalsModes)",
    "skill2:Stance crit package 35.14/75.12",
    "skill2:Swift Piercing weaponSwap (burstCast, 5s, 0.5s clamp, 73.22/300%)",
    "burst:self ATK ▲110 (5 sec)",
    "burst:516.6% nuke (both modes, no FB major/range)",
    "burst:958.9% Stance rider (exclusive)",
    "burst:854.6% Engage true rider (exclusive)"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Activates at the start of battle and when Full Charge is maintained for 1 or more seconds. Affects self. Initiates a new Bunny Mode based on the current mode. (the maintained-hold toggle path only — the sim's charge model always releases at full charge, so mid-fight toggling is a player choice surfaced as a static mode selection)",
      "Activates when this unit enters the Bunny Mode: Engage state. Affects all allies in the Bunny Mode: Stance state. Initiates Bunny Mode: Engage. This effect is continuous and cannot be removed.",
      "Activates when this unit enters the Bunny Mode: Stance state. Affects all allies in the Bunny Mode: Engage state. Initiates Bunny Mode: Stance. This effect is continuous and cannot be removed."
    ],
    "skill2": [],
    "burst": []
  },
  "notes": "Expected shared-prior misreads to check the driver against, in order of damage: (1) Swift Piercing keyed to fullBurstEnter instead of burstCast — the control fixture is dual-B3 (carry + helm), so the wrong key opens swap windows on helm's rotations and the readings genuinely diverge; assert window count == her casts. (2) skill1's 'for 1 round(s)' pair as durationSec:1 — must be durationShots:1. (3) 'Normal Attack Damage Multiplier ▲100%' as generic attackDamagePct — it scales the 69.04 normal multiplier (normalAttackPct) and must not dilute into the Damage-Up bucket or touch other buckets. (4) Both burst mode riders (958.9 + 854.6) firing in one cast, or skill2's two mode packages co-active — the modes are mutually exclusive per run, default STANCE (battle-start branch resolves 'not in Stance' → Stance; modes array must list stance first). (5) Pierce: the swap is NAMED 'Swift Piercing' but the kit text never prints a Pierce additional-effect — do NOT set hasPierce on the swap or the unit from the name alone (⚑ measurement-gated; true-damage flavor ≠ pierce tag). (6) Swap shot economy is kit-silent beyond the 0.5s charge clamp — pulls within the 5s window (~5-7 shots incl. fire animation) and swap ammo are ⚑ CALIBRATED; the real-weapon-change magazine refill rule applies on entry/exit since 73.22 ≠ her base 69.04. (7) skill1's full-charge buffs must be gated OFF during the swap (the swap's own 0.5s full-charge pulls would otherwise re-trigger them — assert zero skill1 buffApplys inside the window). Near-leak declaration: the EFFECT SCHEMA (not the methodology) names 'sin' as the next expected highestAllyMaxHpPct carrier; that is the base unit 'sin', a different unit from 'sin-swift-bunny', and this kit contains no Max HP duplication line — treated as non-leaking, flagged for the orchestrator. Element: Water vs the controlComp Fire boss is a clean ×1.10 (no elemental-advantage damage line in this kit).",
  "model": "claude-fable-5"
}
```

### 4b. Second S2b reviewer (claude-fable-5-1, blind — Tier-2 ×2 models)

```json
{
  "slug": "sin-swift-bunny",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "■ start of battle. self. ATK ▲ 15.35%",
      "disposition": "FAITHFUL",
      "scope": "generic ATK (unscoped) — feeds normals, charge, swap shots, burst riders alike",
      "durationSemantics": "permanent ('continuous', no duration) — passive or battleStart with no durationSec",
      "triggerIdentity": "passive / battleStart (frame 0), no gate, no mode gate (applies in BOTH Bunny Modes)",
      "targetSet": "self only",
      "nearestWrongModel": "mode-gated to one Bunny Mode, or a durationSec placed on it, or stat casterAtkPct (flat) instead of atkPct",
      "distinguishingAssertion": "exactly one buffApply {stat:'atkPct', value:15.35, targetSlug:'sin-swift-bunny', casterIdx===targetIdx} at frame 0 with no expiry (expiresFrame absent/∞, no durationShots); present identically whether the override's selected mode is stance or engage",
      "inertness": "no buffApply of this stat on any other targetSlug; value is the raw 15.35, not a flat-resolved ATK number",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "■ during Full Charge, not Swift Piercing: NA Mult ▲100% 1 rd",
      "disposition": "FAITHFUL",
      "scope": "NORMAL-ATTACK multiplier only (normalAttackPct scales the 69.04 term) — NOT attackDamagePct, NOT burst riders, NOT the swap weapon",
      "durationSemantics": "ROUNDS: durationShots:1 (hitsPerShot 1 → one pull). Never durationSec. Each charged pull re-grants, so steady state = every unswapped charged shot after the first carries it, INCLUDING the first shot after each 141f reload",
      "triggerIdentity": "fullCharge (every charged pull of the base SR; in-sim identical to shotFired while unswapped) + swapGate:'unswapped' ('if this unit is not in the Swift Piercing state'). No fbGate, no mode gate",
      "targetSet": "self",
      "nearestWrongModel": "(a) attackDamagePct 100 in the Damage-Up bucket (diluted, and leaks into burst/swap damage); (b) durationSec 1 — the 2.35s reload drops the buff so the first post-reload shot is unbuffed; (c) no swapGate — swap pulls re-grant it and swap shots get ×2 normal mult",
      "distinguishingAssertion": "For every unswapped charged damage event after the first: normal-multiplier term = 69.04×2 (mult decomposition shows the normalAttackPct factor 2.0), and the FIRST unswapped shot after each reload event also carries it (buffApply {stat:'normalAttackPct', value:100, durationShots:1}). Burst-slot damage events' mult contains no 2.0 factor from this stat. Zero buffApply of normalAttackPct occur between a sin burstCast and the end of its 5s swap window",
      "inertness": "burst riders (516.6/958.9/854.6) unchanged by this stat; swap shots (73.22 base) are NOT doubled; no attackDamagePct buffApply from skill1",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "(same ■) Charge Damage ▲ 52.12% for 1 round(s)",
      "disposition": "FAITHFUL",
      "scope": "charge bucket, additive percentage points (chargeDamagePct 52.12) — applies to the base SR's full-charge shots only (the swap is gated off)",
      "durationSemantics": "ROUNDS: durationShots:1, same block as the line above; persists across reload",
      "triggerIdentity": "same block: fullCharge + swapGate:'unswapped', self",
      "targetSet": "self",
      "nearestWrongModel": "chargeDamageMultPct (scales base charge, a different magnitude) or durationSec 1 (drops over reload) or ungated into the swap window (adds 52.12 points onto the 300% swap charge)",
      "distinguishingAssertion": "buffApply {stat:'chargeDamagePct', value:52.12, durationShots:1} paired 1:1 with each normalAttackPct:100 apply; the first post-reload unswapped shot's charge-bucket term includes +52.12; swap-window shots' charge bucket is exactly the swap's chargeMultPct with no +52.12",
      "inertness": "no chargeDamagePct buffApply during the swap window; burst riders unaffected (they are not charge-bucket hits)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "■ start of battle + Full Charge held ≥1s: new Bunny Mode",
      "disposition": "GAP",
      "scope": "self mode state machine: Stance ⇄ Engage. At battle start she is NOT in Stance → enters STANCE. Each subsequent 'Full Charge maintained for 1 or more seconds' (holding the shot at full charge, a deliberate DPS-costing input) toggles",
      "durationSemantics": "permanent until toggled ('continuous and cannot be removed')",
      "triggerIdentity": "battleStart (→ Stance) + a HOLD-AT-FULL-CHARGE timer the engine has no trigger for (charge weapons release at full charge in-sim, so the toggle never fires on its own). Faithful encoding: top-level modes:['stance','engage'] with STANCE FIRST (= default), all mode-scoped blocks carry mode:'stance' / mode:'engage'",
      "targetSet": "self",
      "nearestWrongModel": "(a) default mode = engage (the flashier true-damage mode) — kit says battle start lands in Stance with zero input; (b) no mode gating at all so BOTH S2 halves and BOTH burst riders are live at once; (c) a dynamic toggle invented on some cadence (interval) — not derivable, must be a static player choice",
      "distinguishingAssertion": "With no mode selected, the run shows critRatePct 35.14 / critDamagePct 75.12 buffApply on self, NO true-flavored normal damage events, and each sin burstCast yields exactly the 516.6 + 958.9 pair (never 854.6). Selecting 'engage' flips all three together. Blocks ungated by mode (S1 ATK, S1 full-charge pair, swap, burst ATK, 516.6) are identical in both modes",
      "inertness": "no interval/hitCount trigger ever flips mode mid-fight; no damage/buff event exists whose only source would be a toggle",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "■ enters Engage: allies in Stance → Engage",
      "disposition": "UNMODELED",
      "scope": "cross-unit Bunny Mode sync (allies carrying their own Bunny Mode state)",
      "durationSemantics": "permanent mode set on allies",
      "triggerIdentity": "self mode-entry event (no engine trigger); requires another Bunny-Mode carrier on the team",
      "targetSet": "allies in the Bunny Mode: Stance state (excludes self)",
      "nearestWrongModel": "encoding as a generic allies buff/status — there is no ally-mode primitive, and no sim-supported roster unit exposes a Bunny Mode to sync",
      "distinguishingAssertion": "no buffApply/selfStatus from skill1 targets any ally slug; totals(res)[liter]/[crown]/[helm] unchanged vs a run with sin's skill1 ally-mode lines deleted",
      "inertness": "all ally totals",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "■ enters Stance: allies in Engage → Stance",
      "disposition": "UNMODELED",
      "scope": "cross-unit Bunny Mode sync (mirror of the line above)",
      "durationSemantics": "permanent mode set on allies",
      "triggerIdentity": "self mode-entry event (incl. battle start → Stance); no engine trigger",
      "targetSet": "allies in the Bunny Mode: Engage state (excludes self)",
      "nearestWrongModel": "same as above",
      "distinguishingAssertion": "same as above — recorded verbatim in unmodeled.skill1",
      "inertness": "all ally totals",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "■ only in Engage: Noise Bullets — normals true dmg",
      "disposition": "FAITHFUL",
      "scope": "flavor change on NORMAL attacks (base SR shots) AND on Swift Piercing swap shots ('Effect 2') — no magnitude; makes ally True Damage ▲ buffs feed her, and nothing else",
      "durationSemantics": "permanent while in Engage ('continuous and cannot be removed')",
      "triggerIdentity": "mode gate only: top-level trueNormalsModes:['engage'] (the normal-fire path reads it for swap shots too, so no separate weaponSwap.trueNormals is needed). INERT in the default stance mode",
      "targetSet": "self",
      "nearestWrongModel": "(a) hasTrueNormals:true (whole-fight, both modes); (b) a trueDamagePct magnitude invented from 'true damage'; (c) flavor 'true' on burst riders in Stance; (d) a weaponSwap.trueNormals that fires in Stance too",
      "distinguishingAssertion": "Default (stance) run: zero normal/swap damage events carry flavor 'true', and a patched ally trueDamagePct buff (withPatchedOverride on a teammate) moves totals(res)['sin-swift-bunny'] by 0. Engage run: every normal AND swap damage event is true-flavored and the same patched trueDamagePct buff raises her total",
      "inertness": "no damage magnitude change from this line in either mode absent an external True Damage ▲; Stance totals byte-identical with/without this block",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ only in Stance: Crit Rate ▲35.14%, Crit Dmg ▲75.12%",
      "disposition": "FAITHFUL",
      "scope": "GENERIC crit rate / crit damage (text says 'Critical Rate', not 'of normal attacks') → critRatePct 35.14 + critDamagePct 75.12; applies to normals, swap shots, and any crit-eligible riders",
      "durationSemantics": "permanent ('continuous and cannot be removed') — passive, no durationSec/durationShots",
      "triggerIdentity": "passive, mode:'stance' (default mode). No fbGate",
      "targetSet": "self",
      "nearestWrongModel": "(a) critRateNormalPct (over-scoping to normals — under-credits swap/rider crit); (b) mode-ungated (live in Engage too, stacking with true damage); (c) a durationSec",
      "distinguishingAssertion": "Default run: buffApply {stat:'critRatePct', value:35.14} and {stat:'critDamagePct', value:75.12} on self at frame 0 with no expiry; damage events in the swap window report a crit rate that includes +35.14 points over the sheet rate. Engage run: NEITHER buffApply exists",
      "inertness": "no critRateNormalPct buffApply; allies receive nothing from skill2",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ when using Burst Skill. self. Swift Piercing: swap, 0.5s, 73.22%, 300%, 5 sec",
      "disposition": "FAITHFUL",
      "scope": "real weapon change (NOT sameWeapon — fresh magazine on entry, base SR handed back full on exit): weaponSwap {damagePct:73.22, chargeTimeClamp:0.5 ('Fixed at'), chargeMultPct:300, durationSec:5}. maxAmmo ⚑ kit-silent; pullsPerSec ⚑; no Pierce stated despite the name",
      "durationSemantics": "hard 5s time bound; no maxShots stated",
      "triggerIdentity": "burstCast (her OWN burst, 'when using Burst Skill') — NOT fullBurstEnter. controlComp seats helm as a second B3, so the two diverge in the fixture",
      "targetSet": "self",
      "nearestWrongModel": "(a) fullBurstEnter — swap opens on helm-cast rotations too; (b) chargeTimeSec 0.5 instead of chargeTimeClamp — ally charge-speed buffs would shorten it; (c) sameWeapon:true (no magazine refill → her 6-round SR magazine state bleeds into the swap); (d) hasPierce:true on the swap from the name 'Swift Piercing'",
      "distinguishingAssertion": "number of distinct swap windows == number of burstCast events with casterIdx===sin, and strictly < number of fullBurstStart events when helm casts any rotation; every swap-window damage event has mult base 73.22 with charge term 300; with a patched ally chargeSpeedPct buff the per-window swap shot count is unchanged; pierceDamagePct from a patched ally moves her total by 0",
      "inertness": "S1 full-charge pair (normalAttackPct/chargeDamagePct) never applies during the window; no pierce tag on any shot",
      "evidenceTier": "DATAMINED (magnitudes) / CALIBRATED ⚑ (swap ammo, swap cadence, no-pierce assumption)",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "■ Affects self. ATK ▲ 110% for 5 sec",
      "disposition": "FAITHFUL",
      "scope": "generic atkPct 110 (self's own ATK)",
      "durationSemantics": "5 s wall-clock (durationSec:5) — coextensive with the swap window",
      "triggerIdentity": "burstCast, self; ordered BEFORE the damage riders in the slot so the 516.6/958.9/854.6 snapshot the +110 (kit lists it first)",
      "targetSet": "self",
      "nearestWrongModel": "fullBurstEnter (fires on helm's rotations); casterAtkPct (flat); or ordered after the riders so burst damage misses the +110",
      "distinguishingAssertion": "count of buffApply {stat:'atkPct', value:110, durationSec→expiresFrame = cast+300f} == count of sin burstCast events (not fullBurstStart); the same-frame burst damage events' ATK basis = staticAtk×(1+0.1535+1.10+other live atkPct)",
      "inertness": "no buffApply of 110 on helm-only rotations; no ally receives it",
      "evidenceTier": "DATAMINED (magnitude) / CALIBRATED ⚑ (rider-sees-buff ordering is an engine convention, not kit-stated)",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "■ all enemies. 516.6% Burst Skill damage",
      "disposition": "FAITHFUL",
      "scope": "burst-slot flatDamage atkPct 516.6, burstDesc:'allEnemies', mode-UNGATED (fires in both modes); instant burst-cast → noFb (lands before FB opens), noRange, no core",
      "durationSemantics": "instant",
      "triggerIdentity": "burstCast, target enemy",
      "targetSet": "enemy (all enemies — single boss in sim)",
      "nearestWrongModel": "fbMajorApplied true (treated as in-FB skill damage, +50%); core:true; gated to one mode; or omitted burstDesc so a teammate's burstSkillAoeDamagePct cannot feed it",
      "distinguishingAssertion": "per sin burstCast exactly one burst-bucket damage event with atkPct 516.6, fbMajorApplied===false, rangeApplied===false, core rate 0; present in BOTH mode runs",
      "inertness": "no 516.6 event on helm-cast rotations; no fullBurst +50% on it",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "■ if Stance. same targets. 958.9% additional damage",
      "disposition": "FAITHFUL",
      "scope": "burst-slot flatDamage atkPct 958.9, mode:'stance', burstDesc:'allEnemies' ('affects the same targets' = all enemies), no flavor; noFb/noRange/no core like the line above",
      "durationSemantics": "instant",
      "triggerIdentity": "burstCast, target enemy, mode gate stance (the DEFAULT mode)",
      "targetSet": "enemy",
      "nearestWrongModel": "both the 958.9 and 854.6 fire on every cast (no mode gates) → 3 riders per cast; or 958.9 folded with 516.6 into one 1475.5 rider (loses the mode split and level-scaling anchors)",
      "distinguishingAssertion": "Default run: per sin burstCast exactly TWO burst-bucket damage events (516.6 and 958.9), the 958.9 non-true-flavored. Engage run: zero 958.9 events",
      "inertness": "never co-occurs with an 854.6 event on the same cast",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "■ if Engage. same targets. 854.6% true damage",
      "disposition": "FAITHFUL",
      "scope": "burst-slot flatDamage atkPct 854.6, flavor:'true', mode:'engage', burstDesc:'allEnemies'; noFb/noRange/no core",
      "durationSemantics": "instant",
      "triggerIdentity": "burstCast, target enemy, mode gate engage (NON-default — inert in the default run)",
      "targetSet": "enemy",
      "nearestWrongModel": "fires in the default (stance) run; or missing flavor 'true' so ally True Damage ▲ doesn't feed it; or trueDamagePct applied as a self buff instead of a flavor",
      "distinguishingAssertion": "Default run: zero 854.6 events. Engage run: per sin burstCast exactly two burst events (516.6 non-true + 854.6 flavor 'true'), and a patched ally trueDamagePct buff raises only the 854.6 event's Damage-Up term, never the 516.6's",
      "inertness": "absent from the default run entirely; 516.6 never true-flavored in either mode",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:atk-15.35-permanent",
    "skill1:fullcharge-unswapped-normalAttackPct-100-1round",
    "skill1:fullcharge-unswapped-chargeDamagePct-52.12-1round",
    "skill1:modes-stance-default-engage-alt",
    "skill2:engage-trueNormalsModes",
    "skill2:stance-critRatePct-35.14-critDamagePct-75.12",
    "skill2:burstCast-weaponSwap-73.22-300-clamp0.5-5s",
    "burst:atkPct-110-5s",
    "burst:flatDamage-516.6-allEnemies-both-modes",
    "burst:flatDamage-958.9-stance",
    "burst:flatDamage-854.6-true-engage"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Activates at the start of battle and when Full Charge is maintained for 1 or more seconds. Affects self. Initiates a new Bunny Mode based on the current mode. (dynamic hold-to-toggle — modeled as a static top-level `modes` choice, stance default)",
      "Activates when this unit enters the Bunny Mode: Engage state. Affects all allies in the Bunny Mode: Stance state. Initiates Bunny Mode: Engage. This effect is continuous and cannot be removed.",
      "Activates when this unit enters the Bunny Mode: Stance state. Affects all allies in the Bunny Mode: Engage state. Initiates Bunny Mode: Stance. This effect is continuous and cannot be removed."
    ],
    "skill2": [
      "This effect is continuous and cannot be removed. (no dispel in sim — scope-trivial)"
    ],
    "burst": []
  },
  "notes": "SHARED-PRIOR MISREADS I expect the driver to fall into, in priority order: (1) DEFAULT MODE — the battle-start block says 'not in Stance → Stance', so with zero player input she is in STANCE all fight (crit kit + 958.9 rider); a driver drawn to the true-damage flavor may default to Engage or model both halves at once. The default-run test must pin crit buffs present + 958.9 present + 854.6 absent + no true flavor. (2) The S1 full-charge pair is 'for 1 round(s)' → durationShots:1, NOT durationSec:1; the clean discriminator is the FIRST unswapped shot after each 141f (2.35s) reload still carrying normalAttackPct 100 / chargeDamagePct 52.12. (3) 'Normal Attack Damage Multiplier ▲100%' is normalAttackPct (scales the 69.04 term), NOT attackDamagePct — the latter dilutes and leaks into burst riders and swap shots. (4) The swap AND the 110% ATK are 'when using Burst Skill' → burstCast; controlComp seats helm as a second B3 so fullBurstEnter over-fires — assert swap windows == sin burstCast count. (5) swapGate:'unswapped' on the S1 pair is load-bearing: without it, swap pulls re-grant it and the 73.22 swap shots get doubled + 52.12 added. Residue to note, not assert: a grant from the last base shot before the cast is a live 1-round buff and may legitimately ride the FIRST swap pull in-engine (kit-plausible too; leave as a documented ⚑). (6) Mode-gated burst riders: exactly two burst-bucket events per cast in either mode, never three. ⚑ fields: swap maxAmmo + swap cadence (kit-silent; ALWAYS-⚑ #3/#1), rider crit eligibility and rider-sees-+110-ATK ordering (engine conventions), no-Pierce despite the 'Swift Piercing' name (kit text never says Pierce — do not add hasPierce/swap.hasPierce). Leak check: the redacted schema's comment 'Next expected carrier: sin' under highestAllyMaxHpPct names the BASE unit `sin`, not `sin-swift-bunny`, and this kit has no Max-HP duplication line — not a leak and must not be imported into this override. Methodology mentions of soda-twinkling-bunny / ade-agent-bunny are other units.",
  "model": "claude-fable-5-1"
}
```

## 5. S5 BLIND TEST-WRITER (claude-opus-5, blind — written from the prose alone)

### 5a. blind spec

```json
{
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "battle start, self: ATK 15.35%",
      "disposition": "FAITHFUL",
      "assertion": "buffApply stat atkPct value 15.35 exists with targetSlug === sin-swift-bunny only; zeroing it lowers her total while every teammate total stays byte-identical. RED under casterAtkPct (flat-resolved value, never 15.35) and under an allies/allies-incl-self target set."
    },
    {
      "slot": "skill1",
      "kitLine": "Normal Atk Dmg Mult 100% / 1 round",
      "disposition": "FAITHFUL",
      "assertion": "buffApply stat normalAttackPct value 100, durationShots === 1, self. RED under attackDamagePct 100 (additive Damage-Up bucket, wrong magnitude path), under normalAttackMultiplier folding, and under durationSec:1 (a seconds window, not a round budget). Widening durationShots to 10 must raise total damage, so the window is non-vacuous."
    },
    {
      "slot": "skill1",
      "kitLine": "Charge Damage 52.12% / 1 round",
      "disposition": "FAITHFUL",
      "assertion": "buffApply stat chargeDamagePct value 52.12, durationShots === 1, self. RED under chargeDamageMultPct (base-charge scaler, a different bucket) and under a seconds window."
    },
    {
      "slot": "skill1",
      "kitLine": "if NOT in Swift Piercing state",
      "disposition": "FIX",
      "assertion": "Deleting swapGate/requiresSelfStatus from the carrying skill1 blocks must raise the COUNT of normalAttackPct-100 applications (the 0.5s swap charge out-pulls the 1.0s base charge roughly 2:1). RED under an ungated block, where control and patched counts are equal."
    },
    {
      "slot": "skill1",
      "kitLine": "Activates during Full Charge",
      "disposition": "FAITHFUL",
      "assertion": "Structural: the carrying block trigger is fullCharge (shotFired accepted as the byte-identical unswapped-SR proxy) and target is self. RED under fullBurstEnter / interval / burstCast, all of which decouple the buff from her pull."
    },
    {
      "slot": "skill1",
      "kitLine": "Initiates a new Bunny Mode",
      "disposition": "GAP",
      "assertion": "it.skip. No primitive: modes[] is a static setup-time selection, and fullCharge fires at release so a 1s HOLD has no trigger. Flagged consequence: a static-mode model locks one S2 half plus one burst rider in for the whole fight and over-credits it."
    },
    {
      "slot": "skill1",
      "kitLine": "allies in opposite mode join mode",
      "disposition": "GAP",
      "assertion": "it.skip. No cross-unit mode primitive (block.mode gates the owner only) and no roster ally carries a Bunny Mode, so the line is inert at scope regardless."
    },
    {
      "slot": "skill2",
      "kitLine": "Engage: normal attacks true damage",
      "disposition": "UNMODELED (payload) / FIX (scope)",
      "assertion": "Structural: some true-normals encoding must exist (trueNormalsModes, swap trueNormals, or hasTrueNormals) AND hasTrueNormals must be FALSE, because the static flag would also true-flavor the Stance magazine. Damage payload is neutral in this fixture (no ally trueDamagePct) -> it.skip for the behavioral half."
    },
    {
      "slot": "skill2",
      "kitLine": "Stance: Crit Rate 35.14%",
      "disposition": "FAITHFUL",
      "assertion": "Exactly one authored critRatePct 35.14 effect, on a block carrying a mode/self-status gate, target self; present in the Stance-default run and ABSENT (0 applications) in the Engage-default run. RED under an ungated passive (live in both modes) and under critRateNormalPct (which would scope away her burst crit)."
    },
    {
      "slot": "skill2",
      "kitLine": "Stance: Crit Damage 75.12%",
      "disposition": "FAITHFUL",
      "assertion": "Same pair test on critDamagePct 75.12; cross-checked against the burst rider ratio so the crit buffs and the 958.9% rider must agree on WHICH run is Stance. RED if the two S2 halves and the two burst branches are gated to different modes."
    },
    {
      "slot": "skill2",
      "kitLine": "Swift Piercing: weapon change",
      "disposition": "FAITHFUL",
      "assertion": "One weaponSwap on a burstCast/self block, durationSec 5, damagePct 73.22, chargeMultPct 300, charge time 0.5s, sameWeapon falsy. RED under fullBurstEnter (over-credits helm-completed Full Bursts in this 2x-B3 fixture), under sameWeapon:true (suppresses the real weapon change magazine refill; also contradicted by 73.22 != normalAttackMultiplier 69.04), and under a seconds/round mix-up on the 5s bound."
    },
    {
      "slot": "skill2",
      "kitLine": "Charge Time fixed 0.5 / FC 300%",
      "disposition": "FAITHFUL",
      "assertion": "Monotone counterfactuals: 2x damagePct raises total (also the non-vacuity proof that the swap is entered), 0.5s -> 2.0s charge lowers total, 300% -> 600% full charge raises total. RED under a swap whose charge clamp or full-charge multiplier is dropped (patch becomes a no-op and the direction assertion fails)."
    },
    {
      "slot": "skill2",
      "kitLine": "Swift Piercing name (no Pierce line)",
      "disposition": "FAITHFUL (negative)",
      "assertion": "hasPierce falsy, pierceModes empty, no gainPierce effect, no swap hasPierce, no flatDamage pierce. RED under the nearest-wrong reading that treats the weapon NAME as an Additional Effect: Pierce line, which would switch on every ally Pierce Damage buff."
    },
    {
      "slot": "burst",
      "kitLine": "self ATK 110% for 5 sec",
      "disposition": "FAITHFUL",
      "assertion": "buffApply atkPct value exactly 110, targetSlug self, finite expiresFrame, and the application count equals the cast count derived independently as burstInstances/2. RED under casterAtkPct (flat value), under an allies target, and under a per-cast double-apply."
    },
    {
      "slot": "burst",
      "kitLine": "516.6% Burst Skill damage",
      "disposition": "FAITHFUL",
      "assertion": "Authored once at 516.6 on an UNGATED burst block, bucket burst, fbMajorApplied false (a burst cast lands before the FB window), core false, burstDesc allEnemies when tagged. It is also the per-cast minimum against which both rider ratios are measured."
    },
    {
      "slot": "burst",
      "kitLine": "Stance: +958.9% additional dmg",
      "disposition": "FAITHFUL",
      "assertion": "Per-cast ratio 958.9/516.6 = 1.8562 in the Stance run; mode-gated block. RED if the magnitude moves, if it is flavored true, or if it fires in the Engage run."
    },
    {
      "slot": "burst",
      "kitLine": "Engage: +854.6% true damage",
      "disposition": "FAITHFUL",
      "assertion": "flavor === 'true' and per-cast ratio 854.6/516.6 = 1.6543 in the Engage run. RED if the two riders are magnitude-swapped (ratios 1.8562 vs 1.6543 are 0.2 apart, far outside the 0.005 tolerance) or if the true flavor is dropped."
    },
    {
      "slot": "burst",
      "kitLine": "mode gates on both riders",
      "disposition": "FAITHFUL",
      "assertion": "Control: burst-slot instances are an exact multiple of 2 and every cast group carries ONE rider ratio. Counterfactual (mode/requiresSelfStatus/resourceGate stripped from burst blocks): instances become a multiple of 3 and each triple carries BOTH ratios, with total damage strictly higher. This is the discriminating pair for the over-credit failure of firing both branches."
    }
  ],
  "fixtures": "Single fixture, controlComp('sin-swift-bunny', true) = liter B1 / crown B2 / sin-swift-bunny B3 / helm B3 vs the Fire boss, focus on the carry, deterministic (no seed). The fixed-B3 slot is kept ON because a lone Burst III makes ZERO Full Bursts and her burst is the sole trigger of Swift Piercing plus both burst riders; helm's presence is also what makes the burstCast-vs-fullBurstEnter discrimination meaningful (a second B3 can complete a Full Burst she did not cast). 10 hoisted runs: control; Bunny-Mode-default rotated to modes[0] and to modes[1] (the mode strings are never hardcoded - they are read off the committed override and the default is rotated, so the test is blind to the names); burst mode gates stripped; S1 atkPct 15.35 zeroed; round window widened to 10; S1-b swap gate stripped; swap damagePct doubled; swap charge time slowed to 2s; swap full-charge raised to 600%. NOTE on leak hygiene: the effect-schema block names base `sin` as a future highestAllyMaxHpPct carrier - a DIFFERENT unit from sin-swift-bunny, no magnitudes, and the kit prose here has no Max HP line, so nothing about this unit leaked.",
  "gaps": [
    "it.skip S1-c Bunny Mode toggle (battle start + Full Charge maintained 1+ sec): no primitive - `modes` is a static setup-time selection so a mid-fight mode flip is inexpressible, and `fullCharge` fires at release so a 1-second hold past full charge has no trigger. The static-mode model holds one mode for the whole fight and over-credits it; real cadence is measurement-gated on footage.",
    "it.skip S1-d / S1-e ally Bunny Mode propagation: no cross-unit mode primitive (block.mode gates the owner only), and no roster ally carries a Bunny Mode, so the lines are inert at scope.",
    "it.skip S2-a Noise Bullets normal-attack true damage: payload is damage-neutral without an ally trueDamagePct buff, and the control comp (liter/crown/helm) grants none - replaced by a structural assertion that the flavor is encoded AND mode-scoped (hasTrueNormals must be false).",
    "it.skip S2-a second clause, Swift Piercing deals true damage in Engage: same neutrality, plus the flavor must be mode-scoped on the swap itself, which this fixture cannot observe either way.",
    "it.skip S2-c swap shot economy (magazine size / reload on the swapped weapon): kit-silent, an ALWAYS-FLAG field - a shot-count assertion would pin an estimate rather than the kit."
  ],
  "model": "claude-opus-5",
  "leakDetected": null
}
```

### 5b. blind test source (VERBATIM — mechanical defects preserved; see section 8 for the run against the driver's override)

```ts
/**
 * sin-swift-bunny -- SR / Water / Attacker / Burst III
 * base: cd 40s, ammo 6, reloadFrames 141, chargeFrames 60, hitsPerShot 1,
 *       normalAttackMultiplier 69.04, coreAttackMultiplier 200
 *
 * BLIND kit-spec test: written from the kit prose alone. The author did not see the driver
 * override, the driver tests, or any truth file.
 *
 * KIT LINES PINNED HERE
 *  S1-a  battle start, self: ATK +15.35%, continuous.
 *  S1-b  during Full Charge while NOT in the Swift Piercing state, self:
 *          Normal Attack Damage Multiplier +100% for 1 ROUND
 *          Charge Damage +52.12% for 1 ROUND
 *  S1-c  battle start AND Full Charge maintained for 1+ sec: TOGGLE Bunny Mode Stance <-> Engage.
 *  S1-d  on entering Engage: pull every ally in Stance into Engage (S1-e is the mirror).
 *  S2-a  Engage only: normal attacks AND Swift Piercing deal true damage, continuous.
 *  S2-b  Stance only: Critical Rate +35.14%, Critical Damage +75.12%, continuous.
 *  S2-c  when using Burst Skill, self: Swift Piercing weapon change -- charge time fixed at
 *          0.5 sec, 73.22% of final ATK, full charge 300%, duration 5 sec.
 *  B-a   self ATK +110% for 5 sec.
 *  B-b   all enemies: 516.6% of final ATK as Burst Skill damage.
 *  B-c   if Stance: +958.9% additional damage, same targets.
 *  B-d   if Engage: +854.6% as TRUE damage, same targets.
 *
 * FIXTURE  controlComp(SLUG, true) -- liter B1 / crown B2 / sin-swift-bunny B3 / helm B3 vs the
 * Fire boss. A lone Burst III makes ZERO Full Bursts, so B1+B2 are mandatory: without them she
 * never bursts and the entire Swift Piercing / burst-rider half of the kit goes untested.
 * Deterministic, no seed. 10 hoisted runs.
 *
 * WHY THESE ASSERTIONS DISCRIMINATE
 *  - The two burst riders land on the SAME cast frame as the 516.6% base, so crit expectation,
 *    element, Damage Up, range and the Full-Burst exemption are all shared and the WITHIN-cast
 *    damage ratio is exact: 958.9/516.6 = 1.8562 (Stance) or 854.6/516.6 = 1.6543 (Engage).
 *    Exactly ONE rider may fire per cast. Nearest-wrong models: both riders fire (instances per
 *    cast 2 -> 3, and the triple then carries BOTH ratios), or a rider is mis-magnituded /
 *    mis-bucketed (the ratio then matches neither constant).
 *  - for 1 round(s) is pinned on the emitted buffApply.durationShots, NOT on a seconds window;
 *    widening the window to 10 rounds must RAISE damage, which proves it is load-bearing.
 *  - The S1-b not-in-Swift-Piercing gate is proven by COUNT: the swap charges in 0.5s against the
 *    base 1.0s (chargeFrames 60), so an ungated block applies the round buffs strictly more often.
 *  - Swap parameters are pinned monotonically (2x damagePct -> more damage, 0.5s -> 2.0s charge ->
 *    less damage, 300% -> 600% full charge -> more damage). Those also prove the fixture really
 *    enters the swap, so none of the swap assertions are vacuous.
 *
 * SHAPE DEFENSIVENESS: the packet describes the override FILE two ways (slot -> Block[] versus
 * slot -> CharacterSkills carrying its own blocks[]). slotBlocks() accepts both, flags are looked
 * up at file level and at slot level, and every extraction carries a non-vacuity guard so a wrong
 * field guess fails loudly instead of silently passing on an empty list.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'sin-swift-bunny';

// within-cast damage ratio of each mode rider against the 516.6% base
const R_STANCE = 958.9 / 516.6; // 1.85618
const R_ENGAGE = 854.6 / 516.6; // 1.65428

type Ev = SimEvent & Record<string, any>;

/* ---- override-shape helpers: accept slot -> Block[] AND slot -> CharacterSkills ---- */
function slotBlocks(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return Array.isArray(s.blocks) ? s.blocks : [];
}

function allBlocks(ov: any): any[] {
  return [
    ...slotBlocks(ov, 'skill1'),
    ...slotBlocks(ov, 'skill2'),
    ...slotBlocks(ov, 'burst'),
  ];
}

function allEffects(ov: any): { slot: string; block: any; eff: any }[] {
  const out: { slot: string; block: any; eff: any }[] = [];
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    for (const block of slotBlocks(ov, slot)) {
      for (const eff of block?.effects ?? []) out.push({ slot, block, eff });
    }
  }
  return out;
}

function fileFlag(ov: any, name: string): any {
  if (ov?.[name] !== undefined) return ov[name];
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    const s = ov?.[slot];
    if (s && !Array.isArray(s) && s[name] !== undefined) return s[name];
  }
  return undefined;
}

function modeNames(ov: any): string[] {
  const declared = Array.isArray(ov?.modes)
    ? ov.modes.filter((m: any) => typeof m === 'string')
    : [];
  if (declared.length) return [...declared];
  const used = new Set<string>();
  for (const b of allBlocks(ov))
    if (typeof b?.mode === 'string') used.add(b.mode);
  return [...used].sort();
}

// modes[0] is the default; rotate it without needing to know the mode strings themselves
function setDefaultMode(ov: any, mode: string): void {
  const ordered = [mode, ...modeNames(ov).filter((m) => m !== mode)];
  ov.modes = ordered;
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    const s = ov?.[slot];
    if (s && !Array.isArray(s)) s.modes = ordered;
  }
}

/* ---- run + event helpers ---- */
interface RunOut {
  res: any;
  evs: Ev[];
  total: number;
  row: any;
}

function runWith(patch?: (ov: any) => void): RunOut {
  const evs: Ev[] = [];
  const opts: any = controlComp(SLUG, true);
  opts.onEvent = (ev: SimEvent) => evs.push(ev as Ev);
  if (patch) {
    opts.overrides = {
      ...(opts.overrides ?? {}),
      [SLUG]: withPatchedOverride(SLUG, patch),
    };
  }
  const res = runComp(opts);
  return { res, evs, total: totals(res)[SLUG], row: unitOf(res, SLUG) };
}

function amountOf(e: any): number {
  for (const k of ['amount', 'damage', 'dmg', 'value', 'total']) {
    const v = e?.[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return NaN;
}

function buffApplies(evs: Ev[], stat: string, value?: number): Ev[] {
  return evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      (value === undefined || Math.abs(Number(e.value) - value) <= 0.01)
  );
}

function damageEvents(r: RunOut): Ev[] {
  const own = Array.isArray(r.row?.events)
    ? (r.row.events as Ev[]).filter((e) => e.kind === 'damage')
    : [];
  if (own.length) return own;
  return r.evs.filter(
    (e) =>
      e.kind === 'damage' &&
      [e.slug, e.unit, e.srcSlug, e.ownerSlug, e.casterSlug].includes(SLUG)
  );
}

function burstSlotAmounts(r: RunOut): number[] {
  const out = damageEvents(r)
    .filter((e) => e.srcSlot === 'burst' || e.bucket === 'burst')
    .map(amountOf);
  expect(
    out.length,
    'no burst-slot damage instances extracted -- event shape or fixture is wrong'
  ).toBeGreaterThan(0);
  for (const v of out) expect(Number.isFinite(v) && v > 0).toBe(true);
  return out;
}

// split the chronological burst-slot instances into per-cast groups of `per`, and return each
// group ratio against its smallest member (the 516.6% base)
function perCastRatios(amounts: number[], per: number): number[][] {
  expect(
    amounts.length % per,
    'expected ' + per + ' burst-slot instances per cast, got ' + amounts.length
  ).toBe(0);
  const out: number[][] = [];
  for (let i = 0; i < amounts.length; i += per) {
    const g = amounts.slice(i, i + per).sort((a, b) => a - b);
    out.push(g.slice(1).map((v) => v / g[0]));
  }
  return out;
}

function commonRiderRatio(r: RunOut): number {
  const rs = perCastRatios(burstSlotAmounts(r), 2).map((g) => g[0]);
  for (const v of rs) expect(v).toBeCloseTo(rs[0], 3);
  return rs[0];
}

function teammateTotals(r: RunOut): Record<string, number> {
  const t: any = totals(r.res);
  const out: Record<string, number> = {};
  for (const k of Object.keys(t)) if (k !== SLUG) out[k] = t[k];
  return out;
}

/* ---- hoisted runs (each is a full 180s sim) ---- */
const committed: any = withPatchedOverride(SLUG, () => {});
const MODES = modeNames(committed);
const HAS_MODES = MODES.length >= 2;

const control = runWith();

const runA = HAS_MODES
  ? runWith((ov) => setDefaultMode(ov, MODES[0]))
  : control;
const runB = HAS_MODES
  ? runWith((ov) => setDefaultMode(ov, MODES[1]))
  : control;

const noModeGate = runWith((ov) => {
  for (const b of slotBlocks(ov, 'burst')) {
    delete b.mode;
    delete b.requiresSelfStatus;
    delete b.resourceGate;
  }
});

const zeroS1Atk = runWith((ov) => {
  for (const { eff } of allEffects(ov)) {
    if (
      eff.kind === 'buff' &&
      eff.stat === 'atkPct' &&
      Math.abs(Number(eff.value) - 15.35) <= 0.01
    ) {
      eff.value = 0;
    }
  }
});

const wideRoundWindow = runWith((ov) => {
  for (const { eff } of allEffects(ov)) {
    if (
      eff.kind === 'buff' &&
      (eff.stat === 'normalAttackPct' || eff.stat === 'chargeDamagePct')
    ) {
      eff.durationShots = 10;
      delete eff.durationSec;
    }
  }
});

const ungatedRoundBuffs = runWith((ov) => {
  for (const b of slotBlocks(ov, 'skill1')) {
    const carries = (b.effects ?? []).some(
      (e: any) =>
        e.kind === 'buff' &&
        (e.stat === 'normalAttackPct' || e.stat === 'chargeDamagePct')
    );
    if (carries) {
      delete b.swapGate;
      delete b.requiresSelfStatus;
    }
  }
});

const swapDoubleDamage = runWith((ov) => {
  for (const { eff } of allEffects(ov)) {
    if (eff.kind === 'weaponSwap') eff.damagePct = Number(eff.damagePct) * 2;
  }
});

const swapSlowCharge = runWith((ov) => {
  for (const { eff } of allEffects(ov)) {
    if (eff.kind !== 'weaponSwap') continue;
    if (eff.chargeTimeClamp !== undefined) eff.chargeTimeClamp = 2;
    if (eff.chargeTimeSec !== undefined) eff.chargeTimeSec = 2;
    if (eff.chargeTimeClamp === undefined && eff.chargeTimeSec === undefined) {
      eff.chargeTimeSec = 2;
    }
  }
});

const swapBigFullCharge = runWith((ov) => {
  for (const { eff } of allEffects(ov)) {
    if (eff.kind === 'weaponSwap') eff.chargeMultPct = 600;
  }
});

describe('sin-swift-bunny S1-a -- battle-start ATK 15.35% (self, continuous)', () => {
  it('applies atkPct 15.35 to herself and to nobody else', () => {
    const hits = buffApplies(control.evs, 'atkPct', 15.35);
    expect(hits.length).toBeGreaterThan(0);
    for (const e of hits) expect(e.targetSlug).toBe(SLUG);
    // nearest-wrong: casterAtkPct (re-emits as a FLAT ATK number, never 15.35) or an allies target
  });

  it('is load-bearing, and zeroing it leaves every teammate byte-identical (self scope)', () => {
    expect(zeroS1Atk.total).toBeLessThan(control.total);
    expect(teammateTotals(zeroS1Atk)).toEqual(teammateTotals(control));
  });
});

describe('sin-swift-bunny S1-b -- full-charge round buffs, blocked during Swift Piercing', () => {
  it('emits normalAttackPct 100 and chargeDamagePct 52.12, each for exactly 1 ROUND, to self', () => {
    const nam = buffApplies(control.evs, 'normalAttackPct', 100);
    const cdp = buffApplies(control.evs, 'chargeDamagePct', 52.12);
    expect(nam.length).toBeGreaterThan(0);
    expect(cdp.length).toBeGreaterThan(0);
    for (const e of [...nam, ...cdp]) {
      expect(e.targetSlug).toBe(SLUG);
      expect(e.durationShots).toBe(1);
    }
    // nearest-wrong: attackDamagePct / chargeDamageMultPct (wrong buckets), or a durationSec of 1
    // second instead of a one-ROUND window
  });

  it('the 1-round window is load-bearing (10 rounds raises damage)', () => {
    expect(wideRoundWindow.total).toBeGreaterThan(control.total);
  });

  it('is authored on her own full-charge pull, targeting self', () => {
    const blocks = slotBlocks(committed, 'skill1').filter((b) =>
      (b.effects ?? []).some(
        (e: any) =>
          e.kind === 'buff' &&
          (e.stat === 'normalAttackPct' || e.stat === 'chargeDamagePct')
      )
    );
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) {
      // fullCharge is the kit-shaped primitive; shotFired is byte-identical for an unswapped SR
      expect(['fullCharge', 'shotFired']).toContain(b.trigger?.kind);
      expect(b.target?.kind).toBe('self');
    }
  });

  it('does NOT fire while Swift Piercing is live (removing the gate applies it strictly more often)', () => {
    const before = buffApplies(control.evs, 'normalAttackPct', 100).length;
    const after = buffApplies(
      ungatedRoundBuffs.evs,
      'normalAttackPct',
      100
    ).length;
    expect(before).toBeGreaterThan(0);
    // the swap charges in 0.5s vs the base 1.0s, so an ungated block gets strictly more pulls
    expect(after).toBeGreaterThan(before);
  });
});

describe('sin-swift-bunny S2 -- Bunny Mode dichotomy (Enhanced Bullets vs Noise Bullets)', () => {
  it('declares exactly two mutually exclusive Bunny Modes', () => {
    expect(MODES.length).toBe(2);
  });

  it('Enhanced Bullets is mode-gated, never an unconditional passive', () => {
    const cr = allEffects(committed).filter(
      ({ eff }) =>
        eff.kind === 'buff' &&
        eff.stat === 'critRatePct' &&
        Math.abs(Number(eff.value) - 35.14) <= 0.01
    );
    const cd = allEffects(committed).filter(
      ({ eff }) =>
        eff.kind === 'buff' &&
        eff.stat === 'critDamagePct' &&
        Math.abs(Number(eff.value) - 75.12) <= 0.01
    );
    expect(cr.length).toBe(1);
    expect(cd.length).toBe(1);
    for (const { block } of [...cr, ...cd]) {
      expect(
        Boolean(block.mode || block.requiresSelfStatus || block.resourceGate)
      ).toBe(true);
      expect(block.target?.kind).toBe('self');
    }
    // nearest-wrong: an ungated passive, live in BOTH modes, which also over-credits the
    // Engage half of the kit where the kit grants no crit at all
  });

  it('exactly one mode run carries the crit buffs, and it is the run whose burst fires the 958.9% Stance rider', () => {
    const aStance = Math.abs(commonRiderRatio(runA) - R_STANCE) <= 0.005;
    const bStance = Math.abs(commonRiderRatio(runB) - R_STANCE) <= 0.005;
    expect(aStance).not.toBe(bStance);
    const stance = aStance ? runA : runB;
    const engage = aStance ? runB : runA;
    expect(commonRiderRatio(engage)).toBeCloseTo(R_ENGAGE, 2);
    for (const stat of ['critRatePct', 'critDamagePct']) {
      const v = stat === 'critRatePct' ? 35.14 : 75.12;
      const on = buffApplies(stance.evs, stat, v);
      expect(on.length).toBeGreaterThan(0);
      for (const e of on) expect(e.targetSlug).toBe(SLUG);
      expect(buffApplies(engage.evs, stat, v).length).toBe(0);
    }
  });

  it('Noise Bullets true-damage flavor is represented, and mode-scoped rather than static', () => {
    const swapTrue = allEffects(committed).some(
      ({ eff }) => eff.kind === 'weaponSwap' && eff.trueNormals === true
    );
    const modeScoped =
      (fileFlag(committed, 'trueNormalsModes') ?? []).length > 0;
    const unscoped = fileFlag(committed, 'hasTrueNormals') === true;
    expect(swapTrue || modeScoped || unscoped).toBe(true);
    // trueNormalsModes is the faithful encoding: the flavor is Engage-only, so the static
    // hasTrueNormals flag would also true-flavor the Stance magazine
    expect(unscoped).toBe(false);
  });
});

describe('sin-swift-bunny S2-c -- Swift Piercing weapon change (own burst cast, 5 sec)', () => {
  it('is a REAL weapon change keyed to her OWN burst cast, with the kit numbers', () => {
    const swaps = allEffects(committed).filter(
      ({ eff }) => eff.kind === 'weaponSwap'
    );
    expect(swaps.length).toBe(1);
    const { block, eff } = swaps[0];
    // nearest-wrong: fullBurstEnter, which would fire on ANY team Full Burst (helm is the second
    // B3 in this fixture) and hand her the swap on rotations she did not cast
    expect(block.trigger?.kind).toBe('burstCast');
    expect(block.target?.kind).toBe('self');
    expect(Number(eff.durationSec)).toBe(5);
    expect(Number(eff.damagePct)).toBeCloseTo(73.22, 2);
    expect(Number(eff.chargeMultPct)).toBeCloseTo(300, 2);
    expect(Number(eff.chargeTimeClamp ?? eff.chargeTimeSec)).toBeCloseTo(
      0.5,
      3
    );
    // Changes the weapon in use = a real swap, and 73.22 != normalAttackMultiplier 69.04, so the
    // same-weapon re-flavor reading (which would also suppress the entry/exit magazine refill)
    // is excluded
    expect(eff.sameWeapon ?? false).toBe(false);
  });

  it('the swap really runs in this fixture and scales with damagePct', () => {
    expect(swapDoubleDamage.total).toBeGreaterThan(control.total);
  });

  it('the 0.5 sec fixed charge time is modeled (slowing it to 2 sec costs damage)', () => {
    expect(swapSlowCharge.total).toBeLessThan(control.total);
  });

  it('the 300% full-charge multiplier is modeled (600% raises damage)', () => {
    expect(swapBigFullCharge.total).toBeGreaterThan(control.total);
  });

  it('grants NO Pierce -- Swift Piercing is a weapon name, not a Pierce line', () => {
    expect(fileFlag(committed, 'hasPierce') ?? false).toBe(false);
    expect(fileFlag(committed, 'pierceModes') ?? []).toEqual([]);
    for (const { eff } of allEffects(committed)) {
      expect(eff.kind).not.toBe('gainPierce');
      if (eff.kind === 'weaponSwap') expect(eff.hasPierce ?? false).toBe(false);
      if (eff.kind === 'flatDamage') expect(eff.pierce ?? false).toBe(false);
    }
  });
});

describe('sin-swift-bunny burst -- ATK 110% / 516.6% base / exactly one mode rider', () => {
  it('applies atkPct 110 to herself once per cast and to nobody else', () => {
    const hits = buffApplies(control.evs, 'atkPct', 110);
    const casts = burstSlotAmounts(control).length / 2;
    expect(casts).toBeGreaterThanOrEqual(1);
    expect(hits.length).toBe(casts);
    for (const e of hits) {
      expect(e.targetSlug).toBe(SLUG);
      expect(Number(e.expiresFrame)).toBeGreaterThan(0);
    }
    // nearest-wrong: casterAtkPct (flat-resolved value, not 110) or an allies target set
  });

  it('authors the three damage lines at kit magnitudes, true flavor only on the Engage branch', () => {
    const fl = slotBlocks(committed, 'burst').flatMap((b) =>
      (b.effects ?? [])
        .filter((e: any) => e.kind === 'flatDamage')
        .map((e: any) => ({ block: b, eff: e }))
    );
    const by = (v: number) =>
      fl.filter(({ eff }) => Math.abs(Number(eff.atkPct) - v) <= 0.01);
    expect(by(516.6).length).toBe(1);
    expect(by(958.9).length).toBe(1);
    expect(by(854.6).length).toBe(1);
    expect(by(854.6)[0].eff.flavor).toBe('true');
    expect(by(958.9)[0].eff.flavor ?? null).toBe(null);
    for (const { eff } of fl) {
      // no core-strike wording anywhere in the burst
      expect(eff.core ?? false).toBe(false);
      if (eff.burstDesc !== undefined) expect(eff.burstDesc).toBe('allEnemies');
    }
    expect(
      Boolean(by(516.6)[0].block.mode || by(516.6)[0].block.requiresSelfStatus)
    ).toBe(false);
    for (const v of [958.9, 854.6]) {
      const b = by(v)[0].block;
      expect(Boolean(b.mode || b.requiresSelfStatus)).toBe(true);
    }
  });

  it('fires exactly TWO burst-slot instances per cast: base plus one rider at the exact kit ratio', () => {
    const groups = perCastRatios(burstSlotAmounts(control), 2);
    expect(groups.length).toBeGreaterThanOrEqual(1);
    for (const [r] of groups) {
      const stance = Math.abs(r - R_STANCE) <= 0.005;
      const engage = Math.abs(r - R_ENGAGE) <= 0.005;
      expect(stance || engage).toBe(true);
    }
  });

  it('the mode gates are non-vacuous: stripping them fires BOTH riders in every cast', () => {
    const groups = perCastRatios(burstSlotAmounts(noModeGate), 3);
    for (const [low, high] of groups) {
      expect(low).toBeCloseTo(R_ENGAGE, 2);
      expect(high).toBeCloseTo(R_STANCE, 2);
    }
    expect(noModeGate.total).toBeGreaterThan(control.total);
  });

  it('burst-cast damage lands in the burst bucket and takes no Full-Burst major', () => {
    const evs = damageEvents(control).filter(
      (e) => e.srcSlot === 'burst' || e.bucket === 'burst'
    );
    expect(evs.length).toBeGreaterThan(0);
    for (const e of evs) {
      expect(e.bucket).toBe('burst');
      // a burst cast lands before the FB window opens
      expect(Boolean(e.fbMajorApplied)).toBe(false);
    }
  });
});

describe('sin-swift-bunny -- GAP lines (no engine primitive / unobservable payload)', () => {
  it.skip('S1-c: Bunny Mode TOGGLE at battle start and on a Full Charge held 1+ sec', () => {
    // No primitive. `modes` is a STATIC user selection resolved once at setup, so a mode that
    // flips mid-fight cannot be expressed; and `fullCharge` fires at RELEASE, so a 1-second HOLD
    // past full charge has no trigger at all (the sim releases exactly at full charge).
    // Consequence: a static-mode model locks one half of S2 and one burst rider in for the whole
    // fight and over-credits it. MEASUREMENT-GATED: the real toggle cadence needs footage.
  });

  it.skip('S1-d / S1-e: pulling allies into the mode she just entered', () => {
    // No cross-unit mode primitive (block.mode gates the OWNER only), and no roster ally carries
    // a Bunny Mode, so the line is inert at scope even if it could be authored.
  });

  it.skip('S2-a payload: normal attacks deal true damage while in Engage', () => {
    // The true flavor only moves damage through an ally trueDamagePct buff; the control comp
    // (liter / crown / helm) grants none, so the flag is damage-NEUTRAL here. Asserted
    // structurally instead -- see the Noise Bullets test above.
  });

  it.skip('S2-a second clause: Swift Piercing itself deals true damage while in Engage', () => {
    // Same neutrality, and the flavor additionally has to be mode-scoped ON the swap -- which is
    // unobservable in this fixture in either direction.
  });

  it.skip('S2-c shot economy: magazine size and reload behaviour of the swapped weapon', () => {
    // Kit-silent (no Max Ammunition and no reload line on Swift Piercing). ALWAYS-FLAG field 3:
    // swap shot economy is an estimate, so a count assertion here would pin a guess, not the kit.
  });
});
```

## 6. S6 BLIND OVERRIDE-WRITER (claude-opus-5, blind — kit-parse BLIND-STUDY)

### 6a. blind override

```json
{
  "slug": "sin-swift-bunny",
  "modes": ["Bunny Mode: Stance", "Bunny Mode: Engage"],
  "trueNormalsModes": ["Bunny Mode: Engage"],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 15.35
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullCharge"
      },
      "target": {
        "kind": "self"
      },
      "swapGate": "unswapped",
      "effects": [
        {
          "kind": "buff",
          "stat": "normalAttackPct",
          "value": 100,
          "durationShots": 1
        },
        {
          "kind": "buff",
          "stat": "chargeDamagePct",
          "value": 52.12,
          "durationShots": 1
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
      "mode": "Bunny Mode: Stance",
      "effects": [
        {
          "kind": "buff",
          "stat": "critRatePct",
          "value": 35.14
        },
        {
          "kind": "buff",
          "stat": "critDamagePct",
          "value": 75.12
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast",
        "stage": 3
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "weaponSwap",
          "damagePct": 73.22,
          "chargeTimeSec": 0.5,
          "chargeTimeClamp": 0.5,
          "chargeMultPct": 300,
          "maxAmmo": 10,
          "durationSec": 5
        }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast",
        "stage": 3
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 110,
          "durationSec": 5
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast",
        "stage": 3
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 516.6,
          "burstDesc": "allEnemies"
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast",
        "stage": 3
      },
      "target": {
        "kind": "enemy"
      },
      "mode": "Bunny Mode: Stance",
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 958.9,
          "burstDesc": "allEnemies"
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast",
        "stage": 3
      },
      "target": {
        "kind": "enemy"
      },
      "mode": "Bunny Mode: Engage",
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 854.6,
          "flavor": "true",
          "burstDesc": "allEnemies"
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Activates at the start of battle and when Full Charge is maintained for 1 or more seconds. Initiates a new Bunny Mode based on the current mode. (In-fight TOGGLE: only the battle-start half is modeled, as the default mode 'Bunny Mode: Stance'; no engine primitive alternates a self mode mid-fight, and selfStatus cannot be removed/flipped.)",
      "Activates when this unit enters the Bunny Mode: Engage state. Affects all allies in the Bunny Mode: Stance state. Initiates Bunny Mode: Engage. (Cross-unit mode sync; no other roster unit carries a Bunny Mode state and modes are per-unit static at setup.)",
      "Activates when this unit enters the Bunny Mode: Stance state. Affects all allies in the Bunny Mode: Engage state. Initiates Bunny Mode: Stance. (Same reason.)"
    ],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "⚑ MODE IS STATIC. The kit TOGGLES Stance↔Engage at battle start and on every Full Charge held ≥1 sec; this override freezes one mode for the whole fight (default 'Bunny Mode: Stance', which is what the battle-start branch resolves to: the unit is not yet in Stance, so it initiates Stance). Every mode-gated number — skill2 crit rate/crit damage, trueNormalsModes, the 958.9% vs 854.6% burst rider — is therefore an UPPER bound for its own mode and a ZERO for the other; real play is roughly a 50/50 alternation. Grade both modes and read the pair, never one.",
    "⚑ 'Swift Piercing' is only a NAME here. No kit line in this packet says 'Pierce' or 'Additional Effect: Pierce', so neither hasPierce nor weaponSwap.hasPierce nor a gainPierce effect is set. If footage shows pierce behaviour on the swap shots, add weaponSwap.hasPierce (swap-scoped), not the whole-fight flag.",
    "skill2 'Noise Bullets' Effect 1 (normal attacks true) and Effect 2 (Swift Piercing true) are both carried by the single top-level trueNormalsModes:['Bunny Mode: Engage'] — the normal-fire path reads swap.trueNormals || hasTrueNormals, so the mode-scoped flag already covers the swapped weapon. No swap-level trueNormals is set (it would be unconditional and would leak true damage into Stance).",
    "noFb is NOT set anywhere (default OFF, measured-only). The burst instances are burst-cast damage and are FB-exempt by engine timing; the skill1 1-round buffs take Full Burst by landing timing.",
    "The weaponSwap omits `weapon` and `pullsPerSec`: the kit states no class change and no cadence for Swift Piercing, so it inherits the base SR class/band/auto-core and base cadence. chargeTimeClamp 0.5 encodes the literal 'Fixed at 0.5 sec' (charge-speed buffs cannot beat it); chargeTimeSec 0.5 is the same value as the swap's own full-charge time."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of the raw kit prose only (no test, no driver override, no board). Structure: S1 = permanent self ATK 15.35 + a per-full-charge 1-ROUND pair (Normal Attack Damage Multiplier 100 → normalAttackPct, Charge Damage 52.12 → chargeDamagePct) gated swapGate:'unswapped' for the literal 'if this unit is not in the Swift Piercing state' clause; S2 = mode-split passive (Stance: crit rate 35.14 / crit damage 75.12; Engage: true normals via trueNormalsModes) plus the burst-cast Swift Piercing weapon swap (73.22% per shot, 0.5s fixed charge, 300% full-charge mult, 5s); burst = self ATK 110 for 5s, 516.6% to all enemies, and ONE of the two mode riders (Stance 958.9% additional / Engage 854.6% true). 'for 1 round(s)' is read as a ROUND budget (durationShots), never seconds. Biggest open risk is the frozen mode (see caveats) and the kit-silent swap magazine.",
  "hasPierce": false
}
```

### 6b. blind audit + flags

```json
{
  "audit": [
    {
      "slot": "skill1",
      "kitLine": "Activates at the start of battle. self",
      "status": "IMPLEMENTED",
      "effectOrReason": "skill1[0] trigger passive, target self (continuous → passive, not battleStart, so no duration semantics are implied)"
    },
    {
      "slot": "skill1",
      "kitLine": "ATK ▲ 15.35%. This effect is continuous.",
      "status": "IMPLEMENTED",
      "effectOrReason": "skill1[0].effects[0] buff atkPct 15.35, no durationSec (permanent self buff; scales own ATK, not casterAtkPct — the line is self-targeted)"
    },
    {
      "slot": "skill1",
      "kitLine": "Activates during Full Charge if not in",
      "status": "IMPLEMENTED",
      "effectOrReason": "skill1[1] trigger {kind:'fullCharge'} (charge-release pull, kit-faithful vs a shotFired proxy) + swapGate:'unswapped' for '…not in the Swift Piercing state'"
    },
    {
      "slot": "skill1",
      "kitLine": "Normal Attack Damage Multiplier ▲ 100%",
      "status": "IMPLEMENTED",
      "effectOrReason": "skill1[1].effects[0] buff normalAttackPct 100, durationShots 1 ('for 1 round(s)' = ROUND count, never seconds)"
    },
    {
      "slot": "skill1",
      "kitLine": "Charge Damage ▲ 52.12% for 1 round(s)",
      "status": "IMPLEMENTED",
      "effectOrReason": "skill1[1].effects[1] buff chargeDamagePct 52.12 (additive points in the charge bucket, NOT chargeDamageMultPct — no 'multiplier' wording), durationShots 1"
    },
    {
      "slot": "skill1",
      "kitLine": "start of battle … Initiates a new Bunny",
      "status": "IMPLEMENTED",
      "effectOrReason": "Battle-start half only: 'not in Bunny Mode: Stance' holds at frame 0 → initiates Stance, so modes[0]='Bunny Mode: Stance' is the declared default; all mode gates read it"
    },
    {
      "slot": "skill1",
      "kitLine": "when Full Charge is maintained for 1 sec",
      "status": "SKIPPED",
      "effectOrReason": "No TriggerDef expresses 'full charge HELD ≥1 sec', and no primitive flips a self mode mid-fight (selfStatus has no removal/toggle). The in-fight Stance↔Engage alternation is unmodeled → unmodeled.skill1[0] + ⚑ flag 1"
    },
    {
      "slot": "skill1",
      "kitLine": "if in Stance → Initiates Engage",
      "status": "SKIPPED",
      "effectOrReason": "Toggle branch — same reason as above; folded into the static `modes` declaration"
    },
    {
      "slot": "skill1",
      "kitLine": "if not in Stance → Initiates Stance",
      "status": "IMPLEMENTED",
      "effectOrReason": "Only its frame-0 evaluation is modeled, as modes[0] = 'Bunny Mode: Stance' (the default)"
    },
    {
      "slot": "skill1",
      "kitLine": "enters Engage → allies in Stance → Engage",
      "status": "SKIPPED",
      "effectOrReason": "Cross-unit mode propagation; `mode` is a per-unit static gate chosen at setup and no other unit carries a Bunny Mode state. Recorded verbatim in unmodeled.skill1"
    },
    {
      "slot": "skill1",
      "kitLine": "enters Stance → allies in Engage → Stance",
      "status": "SKIPPED",
      "effectOrReason": "Same as above; recorded verbatim in unmodeled.skill1"
    },
    {
      "slot": "skill2",
      "kitLine": "only if in Bunny Mode: Engage",
      "status": "IMPLEMENTED",
      "effectOrReason": "Expressed as the mode scope on trueNormalsModes:['Bunny Mode: Engage'] (a flag, so no block is needed)"
    },
    {
      "slot": "skill2",
      "kitLine": "Effect 1: Normal attacks deal true damage",
      "status": "IMPLEMENTED",
      "effectOrReason": "trueNormalsModes:['Bunny Mode: Engage'] — mode-scoped sibling of hasTrueNormals; makes ally True Damage ▲ feed her normals only in Engage"
    },
    {
      "slot": "skill2",
      "kitLine": "Effect 2: Swift Piercing deals true dmg",
      "status": "IMPLEMENTED",
      "effectOrReason": "Same flag: the normal-fire path reads swap.trueNormals || hasTrueNormals, so the mode flag already true-flavors the swapped weapon's shots. No swap-level trueNormals (it would ignore the Engage gate)"
    },
    {
      "slot": "skill2",
      "kitLine": "only if in Bunny Mode: Stance",
      "status": "IMPLEMENTED",
      "effectOrReason": "skill2[0] mode:'Bunny Mode: Stance' gate"
    },
    {
      "slot": "skill2",
      "kitLine": "Effect 1: Critical Rate ▲ 35.14%",
      "status": "IMPLEMENTED",
      "effectOrReason": "skill2[0].effects[0] buff critRatePct 35.14, permanent. UNSCOPED crit (the line carries no 'of normal attacks' qualifier), so critRateNormalPct is deliberately NOT used"
    },
    {
      "slot": "skill2",
      "kitLine": "Effect 2: Critical Damage ▲ 75.12%",
      "status": "IMPLEMENTED",
      "effectOrReason": "skill2[0].effects[1] buff critDamagePct 75.12, permanent"
    },
    {
      "slot": "skill2",
      "kitLine": "Activates when using Burst Skill. self",
      "status": "IMPLEMENTED",
      "effectOrReason": "skill2[1] trigger burstCast stage 3 ('when using Burst Skill' = OWN cast, not fullBurstEnter — keying it to FB entry would over-credit in multi-B3 comps)"
    },
    {
      "slot": "skill2",
      "kitLine": "Swift Piercing: Changes the weapon",
      "status": "IMPLEMENTED",
      "effectOrReason": "skill2[1].effects[0] weaponSwap — a REAL weapon change (sameWeapon NOT set: damagePct 73.22 ≠ normalAttackMultiplier 69.04), so it takes a fresh magazine on entry and returns the base weapon full"
    },
    {
      "slot": "skill2",
      "kitLine": "Charge Time: Fixed at 0.5 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "chargeTimeSec 0.5 + chargeTimeClamp 0.5 ('Fixed at' = clamp, so charge-speed buffs cannot shorten it)"
    },
    {
      "slot": "skill2",
      "kitLine": "Damage: 73.22% of final ATK",
      "status": "IMPLEMENTED",
      "effectOrReason": "weaponSwap.damagePct 73.22 (per-shot multiplier while swapped — a weapon-state modifier, i.e. damage, never skippable)"
    },
    {
      "slot": "skill2",
      "kitLine": "Full Charge Damage: 300%",
      "status": "IMPLEMENTED",
      "effectOrReason": "weaponSwap.chargeMultPct 300"
    },
    {
      "slot": "skill2",
      "kitLine": "Duration: 5 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "weaponSwap.durationSec 5 (time-bounded, no maxShots — the kit states no shot cap)"
    },
    {
      "slot": "burst",
      "kitLine": "Affects self. ATK ▲ 110% for 5 sec.",
      "status": "IMPLEMENTED",
      "effectOrReason": "burst[0] burstCast stage 3 → buff atkPct 110 durationSec 5 (matches the 5s swap window)"
    },
    {
      "slot": "burst",
      "kitLine": "516.6% of final ATK as Burst Skill dmg",
      "status": "IMPLEMENTED",
      "effectOrReason": "burst[1] flatDamage atkPct 516.6, target enemy, burstDesc 'allEnemies' (line sits under 'Affects all enemies')"
    },
    {
      "slot": "burst",
      "kitLine": "if in Stance: 958.9% additional damage",
      "status": "IMPLEMENTED",
      "effectOrReason": "burst[2] flatDamage atkPct 958.9, mode:'Bunny Mode: Stance', burstDesc 'allEnemies' ('the same targets' = the all-enemies set above). Kept as a SEPARATE instance, not folded into 516.6 — the branches are mutually exclusive and level-scale independently"
    },
    {
      "slot": "burst",
      "kitLine": "if in Engage: 854.6% as true damage",
      "status": "IMPLEMENTED",
      "effectOrReason": "burst[3] flatDamage atkPct 854.6, flavor 'true', mode:'Bunny Mode: Engage', burstDesc 'allEnemies'"
    }
  ],
  "flags": [
    {
      "field": "override.modes / every `mode` gate (skill2[0], burst[2], burst[3]) + trueNormalsModes",
      "estimate": "Static default 'Bunny Mode: Stance'; true in-fight uptime ≈ 50/50 Stance/Engage (toggles once per full charge held ≥1 sec, i.e. roughly once per charge cycle under normal fire).",
      "reasoning": "The kit alternates modes on a trigger with no engine primitive ('Full Charge maintained for 1 or more seconds') and via a mid-fight self-mode flip that `mode` (static, set at setup) and `selfStatus` (no removal) both cannot express. Stance is the correct FRAME-0 value — the battle-start branch reads 'not in Bunny Mode: Stance', which holds before any mode exists — so Stance is the honest default, but freezing it over-credits whichever mode is selected and zeroes the other's burst rider and S2 payload entirely.",
      "recipe": "Focus recording: count mode-swap VFX/banner transitions over a 60–90s fight at the unit's normal cadence to get the real duty cycle, and read whether a toggle needs a deliberate 1s hold past full charge (release-at-full-charge fire would then NEVER toggle, pinning her in Stance). Then either (a) grade both modes and weight by the measured duty cycle, or (b) propose an engine primitive (an alternating self-mode toggle on a held-charge trigger) and pin it with a vitest on buffApply of critRatePct 35.14 appearing/lapsing."
    },
    {
      "field": "override.skill2[1].effects[0].maxAmmo",
      "estimate": "10 rounds (optimistic: enough that the 5s window is cadence-bound, not reload-bound)",
      "reasoning": "KIT-SILENT swap shot economy — the ALWAYS-⚑ weapon-swap case. The swap states only charge time (0.5s fixed), per-shot damage, full-charge multiplier and duration. At a 0.5s fixed charge a 5s window admits ~10 shots; the base magazine is 6 with reloadFrames 141 (~2.35s at 60fps), so if the swap inherited ammo 6 a reload would consume nearly half the window and the shot count would drop to ~7. maxAmmo 10 encodes the optimistic no-reload reading per the prior; it is a GUESS and directly scales every swapped shot.",
      "recipe": "Count the actual Swift Piercing shots in a focus recording of one burst window (and watch for a reload animation inside it). Shots × (73.22% × 300% full-charge) is the whole swap contribution, so the count IS the calibration. Pin with a vitest counting `shot` events between burstCast and burstCast+5s."
    },
    {
      "field": "cadence tuple (base reloadFrames 141 / chargeFrames 60 / fire rate) — not authored in the override; inherited from the datamine",
      "estimate": "Use the datamined values as-is: chargeFrames 60 (1.0s full charge), reloadFrames 141 (~2.35s), ammo 6, hitsPerShot 1.",
      "reasoning": "rate_of_fire and reloadFrames are known-unreliable datamine fields, and this unit's entire S1 payload is per-full-charge (the 1-round normalAttackPct 100 / chargeDamagePct 52.12 pair re-arms once per charge), so an error in the charge/reload tuple moves total damage roughly proportionally. The mode-toggle trigger also keys off charge timing, compounding the sensitivity.",
      "recipe": "Frame-count a focus recording: full-charge release-to-release interval out of Full Burst, and reload-start to first-shot. Compare shots-per-30s against the sim's `shot` event count on controlComp."
    },
    {
      "field": "override.skill1[1] — whether the GRANTING full-charge shot receives its own 1-round buffs",
      "estimate": "Assumed YES (the triggering shot benefits), per the durationShots contract 'decremented right after the shot's blocks dispatch, so the Nth shot still benefits'.",
      "reasoning": "A `fullCharge` trigger that grants a 1-ROUND buff is self-referential: if the engine applies the buff before the pull's damage resolves, the +100% normal-attack multiplier and +52.12% charge damage land on the very shot that armed them (effectively a permanent per-charge buff out of swap); if it applies after, the buff lands on the NEXT round. The two readings differ by roughly the whole S1 contribution out-of-swap. The prose ('Activates during Full Charge … for 1 round(s)') does not resolve the ordering, and I cannot inspect the dispatch order blind.",
      "recipe": "Single-unit sim read: filter `damage` events with bucket normal/charge on the first two pulls and check whether pull #1's mult already carries the +100%/+52.12%, then confirm against footage by comparing the first unswapped full-charge popup against the second. If the engine applies post-damage, keep the block as-is (the buff is still live every round after the first) and note the one-round phase offset rather than inventing a compensating value."
    },
    {
      "field": "override.hasPierce / skill2[1].effects[0].hasPierce (NOT set)",
      "estimate": "No pierce tagging anywhere.",
      "reasoning": "The swap is NAMED 'Swift Piercing', which is suggestive, but no line in this packet says 'Pierce' or 'Additional Effect: Pierce'. Faithful > fit: inferring pierce from a skill name would silently switch on every ally Pierce Damage ▲ buff's eligibility for her swap shots.",
      "recipe": "Watch a Swift Piercing shot against a multi-part/multi-enemy boss for pierce behaviour, or check the full in-game skill description for an 'Additional Effect: Pierce' line this packet may have truncated. If confirmed, add weaponSwap.hasPierce:true (swap-scoped) — never the whole-fight hasPierce flag, since her base SR shots show no such line."
    }
  ],
  "model": "claude-opus-5",
  "leakDetected": null
}
```

### 6c. block-level diff — DRIVER vs BLIND override

### skill1: 1 identical block(s); 1 driver-only; 1 blind-only

- DRIVER ONLY: {"trigger":{"kind":"battleStart"},"target":{"kind":"self"},"effects":[{"kind":"buff","stat":"atkPct","value":15.35}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"passive"},"target":{"kind":"self"},"effects":[{"kind":"buff","stat":"atkPct","value":15.35}],"gates":{}}

### skill2: 1 identical block(s); 1 driver-only; 1 blind-only

- DRIVER ONLY: {"trigger":{"kind":"burstCast"},"target":{"kind":"self"},"effects":[{"kind":"weaponSwap","damagePct":73.22,"chargeTimeSec":0.5,"chargeTimeClamp":0.5,"chargeMultPct":300,"durationSec":5}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"burstCast","stage":3},"target":{"kind":"self"},"effects":[{"kind":"weaponSwap","damagePct":73.22,"chargeTimeSec":0.5,"chargeTimeClamp":0.5,"chargeMultPct":300,"maxAmmo":10,"durationSec":5}],"gates":{}}

### burst: 0 identical block(s); 4 driver-only; 4 blind-only

- DRIVER ONLY: {"trigger":{"kind":"burstCast"},"target":{"kind":"self"},"effects":[{"kind":"buff","stat":"atkPct","value":110,"durationSec":5}],"gates":{}}
- DRIVER ONLY: {"trigger":{"kind":"burstCast"},"target":{"kind":"enemy"},"effects":[{"kind":"flatDamage","atkPct":516.6,"burstDesc":"allEnemies"}],"gates":{}}
- DRIVER ONLY: {"trigger":{"kind":"burstCast"},"target":{"kind":"enemy"},"effects":[{"kind":"flatDamage","atkPct":958.9,"burstDesc":"allEnemies"}],"gates":{}}
- DRIVER ONLY: {"trigger":{"kind":"burstCast"},"target":{"kind":"enemy"},"effects":[{"kind":"flatDamage","atkPct":854.6,"flavor":"true","burstDesc":"allEnemies"}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"burstCast","stage":3},"target":{"kind":"self"},"effects":[{"kind":"buff","stat":"atkPct","value":110,"durationSec":5}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"burstCast","stage":3},"target":{"kind":"enemy"},"effects":[{"kind":"flatDamage","atkPct":516.6,"burstDesc":"allEnemies"}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"burstCast","stage":3},"target":{"kind":"enemy"},"effects":[{"kind":"flatDamage","atkPct":958.9,"burstDesc":"allEnemies"}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"burstCast","stage":3},"target":{"kind":"enemy"},"effects":[{"kind":"flatDamage","atkPct":854.6,"flavor":"true","burstDesc":"allEnemies"}],"gates":{}}

## 7. THE DRIVER'S IMPLEMENTATION

### 7a. src/skills/overrides/sin-swift-bunny.json

```json
{
  "note": "Sin: Swift Bunny (slug sin-swift-bunny) — SR/Attacker/Water/Missilis, Burst III cd 40s, ammo 6, charge 1s, full charge 250%. VARIANT of the base unit `sin` (AR/Electric) — a different unit and kit. Kit-autonomy gauntlet 2026-10-02. BUNNY MODE is modeled as a user-selectable kit mode: modes ['Stance','Engage'], Stance first because the kit's battle-start line puts a unit that is not in Stance INTO Stance, so a fight opens in Stance and stays there unless the player deliberately holds Full Charge for 1 second (the sim releases at full charge, so it never holds — the rapunzel-pure-grace precedent for the 'Full Charge maintained for 1 or more seconds' clause). Selecting Engage models a player who toggled once at the opening and stayed there; in-fight re-toggling is unmodeled. SKILL1 'Bunny Shift': battleStart self ATK ▲ 15.35% (continuous); 'during Full Charge if not in Swift Piercing' = fullCharge with swapGate 'unswapped' → self Normal Attack Damage Multiplier ▲ 100% (normalAttackPct) and Charge Damage ▲ 52.12%, each durationShots 1 — the repo's per-pull round convention (engine-modeling-gaps theme 21: a per-pull grant's '1 round(s)' is the NEXT round), so in steady fire every base full-charge shot carries both. SKILL2 'Bullet Switch': Noise Bullets (mode Engage) = trueNormalsModes ['Engage'], which makes her normal attacks True-flavored — the base weapon (Effect 1) and the Swift Piercing swap shots (Effect 2; the engine applies the unit's static true-normal flavor to swap shots too, so the swap needs no flag of its own); Enhanced Bullets (mode Stance) = self Critical Rate ▲ 35.14% + Critical Damage ▲ 75.12% (continuous, passive). 'Activates when using Burst Skill' = burstCast (skill2 slot) → self weaponSwap Swift Piercing: damagePct 73.22 ('Damage: 73.22% of final ATK'), chargeTimeSec 0.5 + chargeTimeClamp 0.5 ('Charge Time: Fixed at 0.5 sec'), chargeMultPct 300, durationSec 5 (one block serves both modes). BURST 'Swift Piercing': self ATK ▲ 110% for 5 sec, then all enemies 516.6% of final ATK as Burst Skill damage (burstDesc allEnemies); Stance adds 958.9% as plain additional damage, Engage adds 854.6% as true damage; both read 'Affects the same targets', which inherits the preceding block's 'Affects all enemies' clause (owner ruling 2026-08-10, scripts/census-burst-amp-scope.ts), so both carry burstDesc allEnemies like the 516.6% line.",
  "modes": ["Stance", "Engage"],
  "trueNormalsModes": ["Engage"],
  "unmodeled": {
    "skill1": [
      "■ Activates at the start of battle and when Full Charge is maintained for 1 or more seconds. Affects self. Initiates a new Bunny Mode based on the current mode. Activates if this unit is in the Bunny Mode: Stance state. Initiates Bunny Mode: Engage. This effect is continuous and cannot be removed. Activates if this unit is not in the Bunny Mode: Stance state. Initiates Bunny Mode: Stance. This effect is continuous and cannot be removed.",
      "■ Activates when this unit enters the Bunny Mode: Engage state. Affects all allies in the Bunny Mode: Stance state. Initiates Bunny Mode: Engage. This effect is continuous and cannot be removed.",
      "■ Activates when this unit enters the Bunny Mode: Stance state. Affects all allies in the Bunny Mode: Engage state. Initiates Bunny Mode: Stance. This effect is continuous and cannot be removed."
    ],
    "skill2": [
      "Noise Bullets Function: Changes some attacks' damage into true damage. — named state wrapper; its two effects ARE modeled (trueNormalsModes ['Engage'] for normals and the Swift Piercing shots).",
      "Enhanced Bullets Function: Enhances this unit's offensive capabilities. — named state wrapper; its two effects ARE modeled (Stance Critical Rate ▲ 35.14%, Critical Damage ▲ 75.12%)."
    ],
    "burst": []
  },
  "caveats": [
    "skill1 Bunny Mode TOGGLE (unmodeled as a live mechanic): the mode is a static per-fight selection (modes, Stance default). The in-game switch needs Full Charge held for 1 or more seconds, which the sim never does (it releases at full charge). Engage is the player-choice mode; the cost of the one opening hold (about 1 second of delayed fire) is not charged. Repeated toggling mid-fight is not modeled.",
    "skill1 ALLY MODE SYNC (unmodeled): entering Engage or Stance pulls every ally in the opposite Bunny Mode along with her, so on a team with Guilty: Mighty Bunny (guilty-mighty-bunny) both units are always in the SAME mode. Nothing enforces that here — select the same mode for both.",
    "skill1 'during Full Charge … for 1 round(s)' follows the per-pull round convention (theme 21): the buff is granted as a full-charge shot fires and rides her NEXT round. In steady fire every base shot is covered; at the swap boundaries the first base shot after Swift Piercing ends fires without it, and the last base shot before her cast hands it to the first Swift Piercing shot. ⚑ estimate = one boundary shot per burst cycle each way; recipe = compare the first post-Swift-Piercing base-shot popup with a steady-state base-shot popup in a focus video (equal = the buff covers the charged shot itself); tier = MEASUREMENT-GATED.",
    "skill2 Swift Piercing ammo: the kit gives the swap no magazine; the engine's real-weapon swap entry refills to her current maximum magazine and hands the base weapon back full at the 5 sec timed end. ⚑ estimate = one full magazine per Swift Piercing window; recipe = count her Swift Piercing shots and any in-window reload in a focus video; tier = MEASUREMENT-GATED."
  ],
  "skill1": [
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
          "value": 15.35
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullCharge"
      },
      "target": {
        "kind": "self"
      },
      "swapGate": "unswapped",
      "effects": [
        {
          "kind": "buff",
          "stat": "normalAttackPct",
          "value": 100,
          "durationShots": 1
        },
        {
          "kind": "buff",
          "stat": "chargeDamagePct",
          "value": 52.12,
          "durationShots": 1
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
      "mode": "Stance",
      "effects": [
        {
          "kind": "buff",
          "stat": "critRatePct",
          "value": 35.14
        },
        {
          "kind": "buff",
          "stat": "critDamagePct",
          "value": 75.12
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
          "kind": "weaponSwap",
          "damagePct": 73.22,
          "chargeTimeSec": 0.5,
          "chargeTimeClamp": 0.5,
          "chargeMultPct": 300,
          "durationSec": 5
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
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 110,
          "durationSec": 5
        }
      ]
    },
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
          "atkPct": 516.6,
          "burstDesc": "allEnemies"
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "enemy"
      },
      "mode": "Stance",
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 958.9,
          "burstDesc": "allEnemies"
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "enemy"
      },
      "mode": "Engage",
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 854.6,
          "flavor": "true",
          "burstDesc": "allEnemies"
        }
      ]
    }
  ]
}
```

### 7b. scripts/tests/units/sin-swift-bunny.test.ts

```ts
// PER-UNIT KIT SPEC — `sin-swift-bunny` (Sin: Swift Bunny, SR/Attacker/Water/Missilis, Burst III
// cd 40s, ammo 6, charge 1s). VARIANT of the base unit `sin` (AR/Electric) — a different unit and
// kit. Kit-autonomy gauntlet 2026-10-02, tier 2 (a self-mode system with mode-gated true damage,
// round-count per-shot buffs gated off a burst weapon swap, a mode-branched burst rider).
//
// One assertion group per KIT LINE, against the SHIPPED override; `withPatchedOverride` only builds
// the named nearest-wrong COUNTERFACTUALS, each of which must flip the assertion.
//
// Kit (data/characters.json → characters['sin-swift-bunny'].skills, L10):
//   S1 ■ battle start → self: ATK ▲ 15.35%, continuous                                         [S1]
//      ■ during Full Charge, not in Swift Piercing → self: Normal Attack Damage Multiplier ▲ 100%
//        for 1 round, Charge Damage ▲ 52.12% for 1 round                                      [S2]
//      ■ battle start / Full Charge held ≥1s → toggle Bunny Mode (Stance ⇄ Engage); allies in
//        the opposite mode follow                                                      [UNMODELED]
//   S2 ■ Engage — Noise Bullets: normals deal true damage (E1), Swift Piercing deals true damage
//        (E2)                                                                                 [S4]
//      ■ Stance — Enhanced Bullets: Critical Rate ▲ 35.14% (E1), Critical Damage ▲ 75.12% (E2) [S3]
//      ■ on using Burst Skill → self: Swift Piercing weapon change — charge fixed 0.5s, 73.22% of
//        final ATK, full charge 300%, 5 sec                                                   [S5]
//   BU ■ self: ATK ▲ 110% for 5 sec; all enemies: 516.6% of final ATK as Burst Skill damage;
//        Stance: + 958.9% additional damage; Engage: + 854.6% true damage                     [S6]
//
// Bunny Mode is a static user-selected kit mode (modes ['Stance','Engage'], Stance default). Why
// each assertion discriminates:
//   S1  one self grant at frame 0, no expiry, value 15.35.
//   S2  granted on every UNSWAPPED full-charge shot as a 1-round pair (theme-21 next-round
//       convention), so steady-state base shots fire at 69.04 × 2 with charge 2.5 + 0.5212; Swift
//       Piercing shots after the first of each window carry neither (the swapGate) — an ungated
//       grant lifts every Swift Piercing shot. The documented boundary residue (the first Swift
//       Piercing shot inherits the last base grant; the first base shot after the window has none)
//       is pinned so a change to it is visible.
//   S3  default = Stance: the crit pair exists from frame 0; Engage has neither.
//   S4  Engage makes her normals true — base weapon AND Swift Piercing (trueNormalsModes; the
//       engine applies the flavor to swap shots too, which is exactly Noise Bullets E2); Stance not.
//   S5  burstCast-keyed swap: shots inside cast → cast+300 are Swift Piercing at 73.22%, charged,
//       30 frames apart (0.5s fixed), charge multiplier 3.0 (300%); a 1.0s charge spaces them 60.
//   S6  ATK 110% self for 300 frames at each cast; the burst rider set is mode-branched (Stance
//       {516.6, 958.9}, Engage {516.6, 854.6}); the Engage 854.6% is true, the 516.6% is not; all
//       land before Full Burst opens (no +50% major); all three are tagged burstDesc 'allEnemies'
//       ("Affects the same targets" inherits the clause). A mode-blind encoding fires both riders.
//
// Fixture: controlComp — liter (B1) / crown (B2) / sin-swift-bunny (B3, focus) / `helm`
// (SR/Water Helm, B3), boss Fire. Deterministic; event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  controlComp,
  runComp,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'sin-swift-bunny';
const IDX = 2;
const BASE_MULT = 69.04;
const SP_MULT = 73.22;
const TRUE_BUFF = 100; // synthetic self True Damage ▲ used only to OBSERVE true flavor
const SP_FRAMES = 300;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

function run(mode?: string, override?: unknown) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG),
    modes: mode ? { [SLUG]: mode } : undefined,
    overrides: override ? { [SLUG]: override as never } : undefined,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, total: unitOf(res, SLUG).totalDamage };
}
type Run = ReturnType<typeof run>;

// ---- readers ----------------------------------------------------------------------------------
const dmg = (r: Run) =>
  r.events.filter((e): e is Damage => e.kind === 'damage' && e.slug === SLUG);
const normals = (r: Run) => dmg(r).filter((d) => d.srcSlot === 'normal');
const burstHits = (r: Run) => dmg(r).filter((d) => d.srcSlot === 'burst');
const shots = (r: Run) =>
  r.events.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const casts = (r: Run) =>
  r.events
    .filter(
      (e) => e.kind === 'burstCast' && (e as { slug: string }).slug === SLUG
    )
    .map((e) => e.frame);
const ownBuffs = (r: Run, stat: string) =>
  r.events.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' && e.casterIdx === IDX && e.stat === stat
  );
const inSp = (r: Run, frame: number) =>
  casts(r).some((c) => frame > c && frame < c + SP_FRAMES);
const spShots = (r: Run) => normals(r).filter((d) => inSp(r, d.frame));
const baseNormals = (r: Run) => normals(r).filter((d) => !inSp(r, d.frame));
/** Swift Piercing shots after each window's first (the first inherits the boundary grant). */
const spSteady = (r: Run) =>
  spShots(r).filter(
    (d) => !casts(r).some((c) => spShots(r).find((x) => x.frame > c) === d)
  );
const close = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const dmgUpAt = (xs: Damage[]) =>
  new Map(xs.map((d) => [d.frame, d.mult.dmgUp]));
const uniqAtk = (xs: Damage[]) =>
  [...new Set(xs.map((d) => +d.atkPct.toFixed(2)))].sort((a, b) => a - b);

// ---- counterfactual patches -------------------------------------------------------------------
const patch = (mutate: (ov: any) => void) => withPatchedOverride(SLUG, mutate);
const withTrueBuff = (ov: any) =>
  ov.skill1.push({
    slot: 'skill1',
    trigger: { kind: 'passive' },
    target: { kind: 'self' },
    effects: [{ kind: 'buff', stat: 'trueDamagePct', value: TRUE_BUFF }],
  });
const shotBlock = (ov: any) =>
  ov.skill1.find((b: any) => b.trigger.kind === 'fullCharge');
const swapEffect = (ov: any) =>
  ov.skill2
    .find((b: any) => b.effects.some((e: any) => e.kind === 'weaponSwap'))
    .effects.find((e: any) => e.kind === 'weaponSwap');

const ungatedShotBuff = patch((ov) => {
  delete shotBlock(ov).swapGate;
});
const modeBlind = patch((ov) => {
  for (const s of ['skill1', 'skill2', 'burst']) {
    for (const b of ov[s]) delete b.mode;
  }
});
const trueBuffed = patch(withTrueBuff);
const trueBuffedNoModeNormals = patch((ov) => {
  withTrueBuff(ov);
  delete ov.trueNormalsModes;
});
const swapOnFbEnter = patch((ov) => {
  ov.skill2.find((b: any) =>
    b.effects.some((e: any) => e.kind === 'weaponSwap')
  ).trigger = {
    kind: 'fullBurstEnter',
  };
});
const atkAfterNukes = patch((ov) => {
  const atk = ov.burst.shift();
  ov.burst.push(atk);
});
const slowSp = patch((ov) => {
  swapEffect(ov).chargeTimeSec = 1;
  swapEffect(ov).chargeTimeClamp = 1;
});

const stance = run('Stance');
const engage = run('Engage');
const byDefault = run();

describe('S1 — battle-start ATK ▲ 15.35% (self, continuous)', () => {
  it('one self grant at frame 0, no expiry', () => {
    const g = ownBuffs(stance, 'atkPct').filter((b) => b.value === 15.35);
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({
      frame: 0,
      targetSlug: SLUG,
      expiresFrame: null,
    });
  });
});

describe('S2 — during Full Charge outside Swift Piercing: Normal Attack ×2 + Charge Damage ▲ 52.12% (1 round)', () => {
  it('granted as a 1-round pair on every unswapped charged shot', () => {
    const unswappedCharged = shots(stance)
      .filter((s) => s.charged && !inSp(stance, s.frame))
      .map((s) => s.frame);
    for (const stat of ['normalAttackPct', 'chargeDamagePct']) {
      const g = ownBuffs(stance, stat);
      expect(g.map((b) => b.frame)).toEqual(unswappedCharged);
      expect(
        g.every((b) => b.durationShots === 1 && b.targetSlug === SLUG)
      ).toBe(true);
    }
    expect(ownBuffs(stance, 'normalAttackPct')[0].value).toBe(100);
    expect(ownBuffs(stance, 'chargeDamagePct')[0].value).toBe(52.12);
  });
  it('steady-state base shots fire at 69.04 × 2 with charge 2.5 + 0.5212', () => {
    const doubled = baseNormals(stance).filter((d) =>
      close(d.atkPct, BASE_MULT * 2)
    );
    expect(doubled.length).toBeGreaterThan(50);
    for (const d of doubled) expect(d.mult.charge).toBeCloseTo(2.5 + 0.5212, 6);
  });
  it('steady-state Swift Piercing shots carry neither buff', () => {
    const steady = spSteady(stance);
    expect(steady.length).toBeGreaterThan(20);
    for (const d of steady) {
      expect(d.atkPct).toBeCloseTo(SP_MULT, 6);
      expect(d.mult.charge).toBeCloseTo(3.0, 6);
    }
  });
  it('documented boundary residue (theme-21 next-round convention): first SP shot inherits, first base shot after misses', () => {
    for (const c of casts(stance)) {
      const firstSp = spShots(stance).find((d) => d.frame > c)!;
      expect(firstSp.atkPct).toBeCloseTo(SP_MULT * 2, 6);
      const firstBack = baseNormals(stance).find(
        (d) => d.frame >= c + SP_FRAMES
      );
      if (firstBack) expect(firstBack.atkPct).toBeCloseTo(BASE_MULT, 6);
    }
  });
  it('COUNTERFACTUAL: an ungated grant lifts every Swift Piercing shot', () => {
    const cf = run('Stance', ungatedShotBuff);
    expect(spSteady(cf).every((d) => close(d.atkPct, SP_MULT * 2))).toBe(true);
  });
});

describe('S3 — Bunny Mode is a kit mode, Stance by default; Enhanced Bullets in Stance', () => {
  it('the default selection behaves exactly as Stance', () => {
    expect(byDefault.total).toBe(stance.total);
  });
  it('Stance: Critical Rate ▲ 35.14% and Critical Damage ▲ 75.12% from frame 0, self', () => {
    expect(ownBuffs(stance, 'critRatePct')).toMatchObject([
      { frame: 0, value: 35.14, targetSlug: SLUG, expiresFrame: null },
    ]);
    expect(ownBuffs(stance, 'critDamagePct')).toMatchObject([
      { frame: 0, value: 75.12, targetSlug: SLUG, expiresFrame: null },
    ]);
  });
  it('Engage: neither', () => {
    expect(ownBuffs(engage, 'critRatePct')).toEqual([]);
    expect(ownBuffs(engage, 'critDamagePct')).toEqual([]);
  });
});

describe('S4 — Noise Bullets: true-flavored normals and Swift Piercing only in Engage', () => {
  const buffed = run('Engage', trueBuffed);
  const cf = dmgUpAt(normals(run('Engage', trueBuffedNoModeNormals)));
  it('Engage base-weapon shots take the True Damage ▲ buff', () => {
    const live = baseNormals(buffed);
    expect(live.length).toBeGreaterThan(50);
    for (const d of live)
      expect(d.mult.dmgUp - cf.get(d.frame)!).toBeCloseTo(TRUE_BUFF / 100, 6);
  });
  it('Engage Swift Piercing shots take it too', () => {
    const live = spShots(buffed);
    expect(live.length).toBeGreaterThan(20);
    for (const d of live)
      expect(d.mult.dmgUp - cf.get(d.frame)!).toBeCloseTo(TRUE_BUFF / 100, 6);
  });
  it('Stance shots do not', () => {
    const plain = dmgUpAt(normals(stance));
    for (const d of normals(run('Stance', trueBuffed))) {
      expect(d.mult.dmgUp).toBeCloseTo(plain.get(d.frame)!, 9);
    }
  });
});

describe('S5 — Swift Piercing on burst use: 0.5s fixed charge, 73.22%, ×3.0, 5 sec', () => {
  it('every shot inside the window is a charged Swift Piercing shot, 30 frames apart', () => {
    for (const r of [stance, engage]) {
      expect(casts(r).length).toBeGreaterThanOrEqual(5);
      for (const c of casts(r)) {
        const w = shots(r).filter(
          (s) => s.frame > c && s.frame < c + SP_FRAMES
        );
        expect(w.length).toBeGreaterThanOrEqual(6);
        expect(w.every((s) => s.charged)).toBe(true);
        // 0.5s fixed charge = 30 frames between pulls; a boss-script fire pause can stretch ONE
        // gap (the 4138 window holds a 90-frame one), so pin the minimum and the bulk, not all.
        const gaps = w.slice(1).map((s, i) => s.frame - w[i].frame);
        expect(Math.min(...gaps)).toBe(30);
        expect(gaps.filter((g) => g === 30).length).toBeGreaterThanOrEqual(
          gaps.length - 1
        );
      }
      expect(
        spShots(r).every(
          (d) => close(d.atkPct, SP_MULT) || close(d.atkPct, SP_MULT * 2)
        )
      ).toBe(true);
    }
  });
  it('base fire resumes after the window', () => {
    for (const c of casts(stance)) {
      const back = normals(stance).find((d) => d.frame >= c + SP_FRAMES);
      if (back)
        expect(
          close(back.atkPct, BASE_MULT) || close(back.atkPct, BASE_MULT * 2)
        ).toBe(true);
    }
  });
  it('COUNTERFACTUAL: a fullBurstEnter-keyed swap also fires on the rotations helm completes', () => {
    const swappedShots = (r: Run) =>
      normals(r).filter(
        (d) => close(d.atkPct, SP_MULT) || close(d.atkPct, SP_MULT * 2)
      ).length;
    expect(swappedShots(run('Stance', swapOnFbEnter))).toBeGreaterThan(
      swappedShots(stance) * 1.5
    );
  });
  it('COUNTERFACTUAL: a 1.0s charge spaces the Swift Piercing shots 60 frames', () => {
    const cf = run('Stance', slowSp);
    const c = casts(cf)[0];
    const w = shots(cf).filter((s) => s.frame > c && s.frame < c + SP_FRAMES);
    expect(w[1].frame - w[0].frame).toBe(60);
  });
});

describe('S6 — burst: ATK ▲ 110% (5 sec) + 516.6% + the mode-branched rider', () => {
  it('ATK ▲ 110% self-only at each cast, 300 frames', () => {
    const g = ownBuffs(stance, 'atkPct').filter((b) => b.value === 110);
    expect(g.map((b) => [b.frame, b.expiresFrame, b.targetSlug])).toEqual(
      casts(stance).map((c) => [c, c + 300, SLUG])
    );
  });
  it('rider set: Stance {516.6, 958.9}, Engage {516.6, 854.6}; one each per cast, pre-Full-Burst', () => {
    expect(uniqAtk(burstHits(stance))).toEqual([516.6, 958.9]);
    expect(uniqAtk(burstHits(engage))).toEqual([516.6, 854.6]);
    for (const r of [stance, engage]) {
      expect(burstHits(r)).toHaveLength(casts(r).length * 2);
      expect(
        burstHits(r).every(
          (d) => casts(r).includes(d.frame) && !d.fbMajorApplied
        )
      ).toBe(true);
    }
  });
  it('the Engage 854.6% is true damage; the 516.6% is not', () => {
    const plain = new Map(
      burstHits(engage).map((d) => [`${d.frame}:${d.atkPct}`, d.mult.dmgUp])
    );
    for (const d of burstHits(run('Engage', trueBuffed))) {
      const delta = d.mult.dmgUp - plain.get(`${d.frame}:${d.atkPct}`)!;
      expect(delta).toBeCloseTo(
        close(d.atkPct, 854.6) ? TRUE_BUFF / 100 : 0,
        6
      );
    }
  });
  it('the burst hits snapshot the ATK ▲ 110% (listed first); applied after them they miss it', () => {
    const late = new Map(
      burstHits(run('Stance', atkAfterNukes)).map((d) => [
        `${d.frame}:${d.atkPct}`,
        d.baseAtk,
      ])
    );
    for (const d of burstHits(stance))
      expect(d.baseAtk).toBeGreaterThan(
        late.get(`${d.frame}:${d.atkPct}`)! * 1.3
      );
  });
  it("all three burst hits are tagged 'allEnemies' ('Affects the same targets' inherits the clause — owner ruling 2026-08-10)", () => {
    const ov = loadOverride(SLUG) as any;
    const hits = ov.burst.flatMap((b: any) =>
      b.effects.filter((e: any) => e.kind === 'flatDamage')
    );
    expect(hits.map((e: any) => [e.atkPct, e.burstDesc]).sort()).toEqual([
      [516.6, 'allEnemies'],
      [854.6, 'allEnemies'],
      [958.9, 'allEnemies'],
    ]);
  });
  it('COUNTERFACTUAL: a mode-blind encoding fires both riders', () => {
    expect(uniqAtk(burstHits(run('Stance', modeBlind)))).toEqual([
      516.6, 854.6, 958.9,
    ]);
  });
});
```

## 8. S2d INDEPENDENT VERIFICATION MATRIX + DRIVER NOTES

### 8a. S2d matrix (scripts/kit-autonomy/reviews/sin-swift-bunny.verify.txt)

```text
S2d INDEPENDENT VERIFICATION MATRIX — sin-swift-bunny — kit-autonomy gauntlet 2026-10-02
Arm 1 (pre-S3, NO override on disk — the new unit's starting state): RED as required:
    Error: sin-swift-bunny: no override on disk — fixture is stale
          Tests  no tests
Arm 2 (shipped override): npx vitest run scripts/tests/units/sin-swift-bunny.test.ts --reporter=verbose — every COUNTERFACTUAL case runs the named nearest-wrong encoding via withPatchedOverride in the same file and asserts it diverges, so GREEN-vs-shipped and RED-vs-counterfactual are both inside the listed assertions.

 ✓ scripts/tests/units/sin-swift-bunny.test.ts > S1 — battle-start ATK ▲ 15.35% (self, continuous) > one self grant at frame 0, no expiry 2ms
 ✓ scripts/tests/units/sin-swift-bunny.test.ts > S2 — during Full Charge outside Swift Piercing: Normal Attack ×2 + Charge Damage ▲ 52.12% (1 round) > granted as a 1-round pair on every unswapped charged shot 25ms
 ✓ scripts/tests/units/sin-swift-bunny.test.ts > S2 — during Full Charge outside Swift Piercing: Normal Attack ×2 + Charge Damage ▲ 52.12% (1 round) > steady-state base shots fire at 69.04 × 2 with charge 2.5 + 0.5212 23ms
 ✓ scripts/tests/units/sin-swift-bunny.test.ts > S2 — during Full Charge outside Swift Piercing: Normal Attack ×2 + Charge Damage ▲ 52.12% (1 round) > steady-state Swift Piercing shots carry neither buff 3259ms
 ✓ scripts/tests/units/sin-swift-bunny.test.ts > S2 — during Full Charge outside Swift Piercing: Normal Attack ×2 + Charge Damage ▲ 52.12% (1 round) > documented boundary residue (theme-21 next-round convention): first SP shot inherits, first base shot after misses 122ms
 ✓ scripts/tests/units/sin-swift-bunny.test.ts > S2 — during Full Charge outside Swift Piercing: Normal Attack ×2 + Charge Damage ▲ 52.12% (1 round) > COUNTERFACTUAL: an ungated grant lifts every Swift Piercing shot 3464ms
 ✓ scripts/tests/units/sin-swift-bunny.test.ts > S3 — Bunny Mode is a kit mode, Stance by default; Enhanced Bullets in Stance > the default selection behaves exactly as Stance 0ms
 ✓ scripts/tests/units/sin-swift-bunny.test.ts > S3 — Bunny Mode is a kit mode, Stance by default; Enhanced Bullets in Stance > Stance: Critical Rate ▲ 35.14% and Critical Damage ▲ 75.12% from frame 0, self 1ms
 ✓ scripts/tests/units/sin-swift-bunny.test.ts > S3 — Bunny Mode is a kit mode, Stance by default; Enhanced Bullets in Stance > Engage: neither 1ms
 ✓ scripts/tests/units/sin-swift-bunny.test.ts > S4 — Noise Bullets: true-flavored normals and Swift Piercing only in Engage > Engage base-weapon shots take the True Damage ▲ buff 10ms
 ✓ scripts/tests/units/sin-swift-bunny.test.ts > S4 — Noise Bullets: true-flavored normals and Swift Piercing only in Engage > Engage Swift Piercing shots take it too 10ms
 ✓ scripts/tests/units/sin-swift-bunny.test.ts > S4 — Noise Bullets: true-flavored normals and Swift Piercing only in Engage > Stance shots do not 30ms
 ✓ scripts/tests/units/sin-swift-bunny.test.ts > S5 — Swift Piercing on burst use: 0.5s fixed charge, 73.22%, ×3.0, 5 sec > every shot inside the window is a charged Swift Piercing shot, 30 frames apart 25ms
 ✓ scripts/tests/units/sin-swift-bunny.test.ts > S5 — Swift Piercing on burst use: 0.5s fixed charge, 73.22%, ×3.0, 5 sec > base fire resumes after the window 1ms
 ✓ scripts/tests/units/sin-swift-bunny.test.ts > S5 — Swift Piercing on burst use: 0.5s fixed charge, 73.22%, ×3.0, 5 sec > COUNTERFACTUAL: a fullBurstEnter-keyed swap also fires on the rotations helm completes 28ms
 ✓ scripts/tests/units/sin-swift-bunny.test.ts > S5 — Swift Piercing on burst use: 0.5s fixed charge, 73.22%, ×3.0, 5 sec > COUNTERFACTUAL: a 1.0s charge spaces the Swift Piercing shots 60 frames 30ms
 ✓ scripts/tests/units/sin-swift-bunny.test.ts > S6 — burst: ATK ▲ 110% (5 sec) + 516.6% + the mode-branched rider > ATK ▲ 110% self-only at each cast, 300 frames 1ms
 ✓ scripts/tests/units/sin-swift-bunny.test.ts > S6 — burst: ATK ▲ 110% (5 sec) + 516.6% + the mode-branched rider > rider set: Stance {516.6, 958.9}, Engage {516.6, 854.6}; one each per cast, pre-Full-Burst 4ms
 ✓ scripts/tests/units/sin-swift-bunny.test.ts > S6 — burst: ATK ▲ 110% (5 sec) + 516.6% + the mode-branched rider > the Engage 854.6% is true damage; the 516.6% is not 23ms
 ✓ scripts/tests/units/sin-swift-bunny.test.ts > S6 — burst: ATK ▲ 110% (5 sec) + 516.6% + the mode-branched rider > the burst hits snapshot the ATK ▲ 110% (listed first); applied after them they miss it 22ms
 ✓ scripts/tests/units/sin-swift-bunny.test.ts > S6 — burst: ATK ▲ 110% (5 sec) + 516.6% + the mode-branched rider > COUNTERFACTUAL: a mode-blind encoding fires both riders 20ms

      Tests  21 passed (21)
```

### 8b. Driver notes (convergence run + findings the blind roles could not see)

# Driver notes — sin-swift-bunny (Sin: Swift Bunny), kit-autonomy gauntlet 2026-10-02

Driver: Claude Opus 5.5. Routing (Claude-only, owner 2026-10-02): S2b `claude-fable-5` + `claude-fable-5-1`
(tier 2), S5/S6 `claude-opus-5`, S7 `claude-fable-5-1` + `claude-fable-5`. All blind roles were dispatched
from an empty temp dir after the 2026-10-02 bridge fix (the first batch, dispatched from the repo cwd,
saw the driver's recent commit subjects and was discarded — see DECISIONS 2026-10-02).

## Tier

Tier 2: a self-mode system with mode-gated true damage, round-count per-shot buffs gated off a burst
weapon swap (`swapGate: 'unswapped'` + `durationShots: 1`), a mode-branched burst rider.

## Engine facts the blind roles could not see (verified by run)

1. **`trueNormalsModes` also flavors swap shots** (`swap.trueNormals || hasTrueNormals`), so the Engage
   Swift Piercing shots are True with ONE unflagged swap block. Pinned S4.
2. **Per-pull round convention (theme 21).** A `fullCharge`-granted `durationShots: 1` buff rides the NEXT
   round. Steady state: every base shot fires at 69.04 × 2 with charge 2.5 + 0.5212. Boundaries: the
   first Swift Piercing shot of each window inherits the last base grant (146.44 = 73.22 × 2, charge
   3.5212) and the first base shot after the window has none (69.04). Pinned S2 as documented residue;
   ⚑ caveat with a footage recipe. No same-shot primitive was built (the kit's 'during Full Charge'
   wording is the only signal and theme 21 is the settled convention).
3. **Swift Piercing cadence.** 30 frames between pulls (0.5 s fixed); one window in the control comp
   (cast 4138) holds a single 90-frame pause from the boss script. 9 shots fit a 5 s window from a
   9-round magazine (ammo buffs included). Pinned S5.
4. **Burst ordering.** The ATK ▲ 110% block precedes the damage blocks, so all burst hits snapshot it;
   reordered, their ATK basis drops > 30%. Pinned S6.

## S2c reconciliation (driver spec vs both S2b reviews)

Converged on every line: Stance default, static `modes` with the toggle + ally sync UNMODELED,
`normalAttackPct` + `chargeDamagePct` at `durationShots: 1` behind `swapGate: 'unswapped'`, generic
`critRatePct` / `critDamagePct` in Stance, `burstCast` (not `fullBurstEnter`) for the swap, 0.5 s
chargeTimeSec + clamp, 300% full charge, 5 s, no Pierce despite the name, the mode-branched burst rider.
Divergences, resolved toward the prose:

- Swift Piercing true-flavor carrier (a reviewer: mode-gated swap `trueNormals`, "the base-weapon flag does
  not cover swap shots"; driver: `trueNormalsModes`) — in this engine it does cover them, see fact 1.
- `burstDesc` on the 958.9% / 854.6% riders: the driver first left them untagged ("additional damage",
  not "Burst Skill damage"); one S2b reviewer and the blind S6 tagged them `allEnemies`. Resolved FOR the
  tag by the settled owner ruling (2026-08-10, `scripts/census-burst-amp-scope.ts`): "Affects the same
  targets" inherits the preceding block's "Affects all enemies" clause. Census `--check` clean.
  Adopted from the reviews: the burstCast-vs-fullBurstEnter discriminator (helm completes the other
  rotations), the burst-hits-snapshot-ATK pin, mutual exclusion.

## S5 convergence run (blind test vs the driver's shipped override)

The verbatim blind file (`scripts/kit-autonomy/blind/sin-swift-bunny.test.ts`, claude-opus-5, leakDetected null)
sets `onEvent` on the CompOptions top level, where `runComp` never reads it (the harness takes it under
`cfg`), so verbatim it captures no events and every event-reading assertion sees 0 — a harness
RECON error, not a model divergence. With ONLY that wiring routed through `cfg`
(`scripts/kit-autonomy/blind/sin-swift-bunny.adapted.test.ts`, one line, marked ADAPTED) it runs against the driver's
override: **20 passed / 0 failed / 5 skipped (its own declared GAPs: the mode toggle, the ally sync, both Engage true-flavor clauses, the Swift Piercing shot economy)**.
The S6 blind override (claude-opus-5, leakDetected null) is block-equivalent to the driver's; the
differences are cosmetic (passive vs battleStart for the frame-0 ATK, stage:3 on a Burst III burstCast,
mode label text) or non-binding (swap durationSec bound); it also set Swift Piercing maxAmmo 10 (kit-silent — the driver's ⚑ caveat) and tagged the burst riders allEnemies, which the driver adopted per the 2026-08-10 ruling.
